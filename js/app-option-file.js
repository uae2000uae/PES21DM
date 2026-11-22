// PES 2021 Option Studio, part 10 of 14: Option-file packages: the benchmark, the export plan, writing the export.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= Option-file packages: the benchmark ================= */
// RULE (README "Option-file packages"): an option file as it is published, e.g. the 2026-27 file (USB 1/WEPES/1..7/<NN. League>/Teds +
// Images/<CLUB>/…, 00. Competitions, USB 2, USB 3, extras), is the model for what the studio produces. The project is built from
// the package's own team (.ted) and competition (.ced) files, images point at the package's own PNGs, and an export reproduces the
// package's file set: same folders, same names, same files. "First install" writes every file (unedited ones byte for byte);
// "Changes only" writes just what changed since the last install, at the same paths. Nothing is renamed or regrouped.
// The package stays where it is (Cloud Storage online, data/optionfiles on this computer); the server reads single files from it.
const ofRef=(pkg,path)=>'o:'+pkg+'|'+path;
const ofParse=ref=>{const s=String(ref).slice(2),i=s.indexOf('|');return{pkg:s.slice(0,i),path:s.slice(i+1)}};
const ofUrl=ref=>{const r=ofParse(ref);return 'api/of/file?pkg='+encodeURIComponent(r.pkg)+'&path='+encodeURIComponent(r.path)};
const isOfRef=ref=>typeof ref==='string'&&ref.startsWith('o:');
// storage: package files are read from the server, never copied into the browser, a snapshot or a baseline
{const _url=Store.url.bind(Store),_get=Store.getBlob.bind(Store),_del=Store.delBlob.bind(Store),_pre=Store.preload.bind(Store);
  Store.url=ref=>isOfRef(ref)?ofUrl(ref):_url(ref);
  Store.getBlob=async ref=>{if(isOfRef(ref)){const r=await fetch(ofUrl(ref),{credentials:'same-origin'});if(!r.ok)throw new Error('Option-file file missing ('+r.status+')');return r.blob()}return _get(ref)};
  Store.delBlob=async ref=>{if(!isOfRef(ref))return _del(ref)};Store.preload=async ref=>{if(!isOfRef(ref))return _pre(ref)}}
{const _tb=tedTemplateBytes;tedTemplateBytes=async t=>{if(isOfRef(t.ref)){if(TED_CACHE.has(t.ref))return TED_CACHE.get(t.ref);
  const s=TED.b64(new Uint8Array(await (await Store.getBlob(t.ref)).arrayBuffer()));TED_CACHE.set(t.ref,s);return s}return _tb(t)}}
const ofAvailable=()=>!!(window.claude&&window.claude.standalone);
async function ofIsOnline(){const st=S.ui.of||(S.ui.of={});if(st.online===undefined){try{const o=await ofApi('packages');st.list=o.packages;st.online=!!o.online}catch(e){st.online=false}}return !!st.online}
async function ofUploadPackage(f){
  if(!await ofIsOnline()){busyCount(0,1,'Uploading '+f.name+' ('+kb(f.size)+')…');await ofApi('upload?name='+encodeURIComponent(f.name),{method:'POST',headers:{'X-Studio':'1','Content-Type':'application/zip'},body:f});busyCount(1,1);return}
  const PART=24*1048576,total=Math.max(1,Math.ceil(f.size/PART));const up=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');let res=null;
  for(let n=0;n<total;n++){busyCount(n*PART,f.size,n===total-1?'Joining the parts and reading the package…':'Uploading '+f.name+': part '+(n+1)+' of '+total+' ('+kb(Math.min(f.size,(n+1)*PART))+' of '+kb(f.size)+')');
    for(let tries=0;;tries++){try{res=await ofApi('upload-part?'+new URLSearchParams({up,part:n,of:total,name:f.name}),{method:'POST',headers:{'X-Studio':'1','Content-Type':'application/octet-stream'},body:f.slice(n*PART,(n+1)*PART)});break}
      catch(e){if(tries>=2)throw new Error('part '+(n+1)+' of '+total+' failed after 3 tries: '+e.message);await sleep(2000*(tries+1))}}}
  busyCount(f.size,f.size);return res}
async function ofApi(path,opts={}){let r;try{r=await fetch('api/of/'+path,Object.assign({credentials:'same-origin',cache:'no-store'},opts))}catch(e){if(e.name==='AbortError')throw e;throw new Error('could not reach the server')}
  const o=await r.json().catch(()=>({}));if(!r.ok)throw new Error(o.error||('option-file request failed ('+r.status+')'));return o}
const OF_MAN=new Map();async function ofManifest(pkg){if(!OF_MAN.has(pkg))OF_MAN.set(pkg,(await ofApi('manifest?pkg='+encodeURIComponent(pkg))).files);return OF_MAN.get(pkg)}
// the image names a team file holds (see TED.IMG): crest, stadium picture, three sponsor boards, manager photo and five kits
const OF_IMG={emblem:503,stadium:536,sp1:569,sp2:602,sp3:635,manager:723};const OF_KIT=[1766,1898,2030,2162,2294];const OF_KIT_SLOT=['1st','2nd','GK 1st','3rd','GK 2nd'];
function ofNames(dec){const o={};Object.entries(OF_IMG).forEach(([k,off])=>o[k]=TED.readStr(dec,off,33));o.kits=OF_KIT.map(off=>TED.readStr(dec,off,33));return o}
const ofDir=p=>p.slice(0,p.lastIndexOf('/')+1);
// the league a file belongs to: its "NN. League" folder (USB 1), else its USB
function ofLeague(path){const seg=path.split('/');for(let i=seg.length-2;i>=0;i--){const m=seg[i].match(/^(\d\d)\.\s*(.+)$/);if(m&&!/^00$/.test(m[1]))return{folder:seg.slice(0,i+1).join('/'),name:m[2].trim()}}return{folder:seg.slice(0,2).join('/'),name:seg[0]}}
/* ----- Competitions come from game files, clubs from their team slot (rule book "Competitions come from game files") -----
   The option file's folders decide nothing: a competition is a competition file, or one of the game's own leagues; a team is in
   the league of its team slot in the game, the way the game itself places it. LEAGUE_OF_CODE: the game league each competition
   code of the 2026-27 option file stands for (worked out from it on 2026-11-21); LEAGUE_NAME: names for the game's own leagues. */
const LEAGUE_OF_CODE={17:'english-league',79:'english-2nd-division',19:'spanish-league',80:'spanish-2nd-division',50:'peu-league',51:'pla-league',52:'pas-league'};
const LEAGUE_NAME={'eredivisie':'Eredivisie','liga-nos':'Liga NOS','jupiler-pro-league':'Jupiler Pro League','3f-superliga':'3F Superliga','ladbrokes-premiership':'Scottish Premiership','raiffeisen-super-league':'Swiss League','russian-premier-liga':'Russian Premier League','spor-toto-super-lig':'Süper Lig','serie-a-tim':'Serie A','serie-bkt':'Serie B','ligue-1-conforama':'Ligue 1','dominos-ligue-2':'Ligue 2','campeonato-brasileiro-serie-a':'Brasileirão Série A','campeonato-brasileiro-serie-b':'Brasileirão Série B','superliga-quilmes-clasica':'Liga Argentina','campeonato-afp-planvital':'Campeonato Chile','colombian-league':'Liga BetPlay','chinese-super-league':'CFA Super League','afc-champions-league':'AFC Champions League','other-european-teams':'Other Teams (Europe)','other-teams-latin-america':'Other Teams (Latin America)','other-teams-asia':'Other Teams (Asia)'};
// the names these three had before 2026-11-22 (they were not the game's own): a project still on one takes the game's name when it opens
const LEAGUE_OLD_NAME={'other-european-teams':'Others European','other-teams-latin-america':'Others America','other-teams-asia':'Other Asian teams'};
{const _eb=extBoot;extBoot=async function(){await _eb();if(S._loadFailed)return;compsArr().forEach(c=>{if(c.gameLeague&&LEAGUE_OLD_NAME[c.gameLeague]===c.name){c.name=LEAGUE_NAME[c.gameLeague];saveComp(c)}})}}
const slotLeagueOf=id=>{const L=PES21_TEAMS;if(!L||!+id)return '';const x=L.find(y=>y.id===+id);return x?x.league:''};
// the competition of a game league: the one marked with it, else the competition file whose code stands for it, else a new one
function slotComp(key,pkg){let c=compsArr().find(c=>c.gameLeague===key)||compsArr().find(c=>LEAGUE_OF_CODE[+(c.ced&&c.ced.compId||c.gameId)]===key&&!c.noCode);
  if(!c){const name=LEAGUE_NAME[key]||csLeagueName(key);c=newComp({name,type:'League'});c.name=name;if(pkg)c.of={pkg}}
  if(c.gameLeague!==key||c.type!=='League'){c.gameLeague=key;c.type='League';saveComp(c)}return c}
// a project built when folders decided: once, every club the folders placed goes to its team slot's league; a club you moved
// yourself (it is not in its folder's competition) stays. The folder-only competitions left empty go. A snapshot first.
{const _eb=extBoot;extBoot=async function(){await _eb();if(S._loadFailed||S.settings.slotLeagues)return;
  const clubs=teamsArr().filter(t=>t.of&&t.of.league&&!t.sameAs&&!t.parked&&!t.noCode&&!isNationalTeam(t));if(!clubs.length){S.settings.slotLeagues=1;saveSettings();return}
  try{await pes21Teams()}catch(e){return}if(!PES21_TEAMS)return;
  const folderOf=new Map();compsArr().forEach(c=>{if(c.of&&c.of.folder)folderOf.set(c.of.folder,c.id)});
  const placed=clubs.filter(t=>t.compId&&folderOf.get(t.of.league)===t.compId&&slotLeagueOf(t.gameId));
  // each game league goes to the competition most of its clubs are in now (a competition file wins a tie)
  const votes=new Map();placed.forEach(t=>{const k=slotLeagueOf(t.gameId);const m=votes.get(k)||votes.set(k,new Map()).get(k);m.set(t.compId,(m.get(t.compId)||0)+1)});
  await takeSnapshot('Before placing teams by their team slots',true);let moved=0,gone=0;
  histLabel('Teams placed in their team slot\'s league (folders no longer decide)','Edit',()=>{
    [...votes.entries()].sort((a,b)=>Math.max(...b[1].values())-Math.max(...a[1].values())).forEach(([k,m])=>{const best=[...m.entries()].sort((a,b)=>b[1]-a[1]||(!!(S.comps[b[0]]||{}).ced-!!(S.comps[a[0]]||{}).ced))[0];const c=S.comps[best[0]];if(c&&!c.gameLeague&&!compsArr().some(x=>x.gameLeague===k)){c.gameLeague=k;c.type='League';saveComp(c)}});
    placed.forEach(t=>{const c=slotComp(slotLeagueOf(t.gameId),t.of.pkg);if(c&&t.compId!==c.id){t.compId=c.id;saveTeam(t);moved++}});
    compsArr().forEach(c=>{if(c.of&&c.of.folder&&!c.ced&&!c.codeSet&&!c.worldCup&&!c.gameLeague&&!teamsArr().some(t=>t.compId===c.id)&&!(c.teams||[]).length){delete S.comps[c.id];Store.del('comps',c.id);gone++}})});
  S.settings.slotLeagues=1;saveSettings();toast('Teams are now in the league of their team slot in the game: '+moved+' moved'+(gone?', '+gone+' folder-only competitions removed':'')+'. You can undo it from the change history.','ok');rerender()}}
// export-relevant state of a team: an unchanged hash means the package's own file is written, byte for byte
function ofHash(t){const p=(t.players||[]).map(p=>[p.name,p.shirtName,p.number,p.pos,p.age,p.height,p.weight,p.foot,p.style,p.wfUsage,p.wfAcc,p.form,p.injury,p.skills,p.comStyles,p.playables,p.attrs,p.ted&&p.ted.pid]);
  const x=ofExtraImgs(t);// a stadium or sponsor board that isn't the package's own counts only when there is one (a fresh build keeps its hash)
  return String(fnv(JSON.stringify([t.name,t.short,t.stadium,t.manager&&t.manager.name,p,t.emblem,t.managerPhoto,(t.kits||[]).map(k=>[k.slot,k.img]),...(x.length?[x]:[]),...(t.of&&t.of.cleared&&Object.keys(t.of.cleared).length?[Object.keys(t.of.cleared).sort()]:[])])))}
function ofExtraImgs(t){if(!t.of)return[];const P=t.of.paths||{};const own=(id,p)=>{if(!id)return true;const i=S.images[id];return !!(i&&isOfRef(i.ref)&&ofParse(i.ref).path===p)};
  const a=[];if(!own(t.stadiumImg||'',P.stadium||''))a.push(['st',t.stadiumImg]);spOf(t).forEach((id,i)=>{if(!own(id,(P.sponsors||[])[i]||''))a.push(['sp'+i,id])});return a}
const ofImgState=t=>({emblem:t.emblem||'',manager:t.managerPhoto||'',kits:OF_KIT_SLOT.map(s=>((t.kits||[]).find(k=>k.slot===s)||{}).img||'')});

/* ---- build the project from a package, into an empty project only (startFresh clears it first): nothing is merged ---- */
async function ofBuild(pkg,label){
  if(teamsArr().length)throw new Error('a build starts from an empty project; start over from the option file instead');
  aiLog('Option file: reading '+label+'…');const man=await ofManifest(pkg);const gf=(await ofApi('gamefiles?pkg='+encodeURIComponent(pkg))).files;
  const size=new Map(man.map(e=>[e.path,e.size]));const byName=new Map();
  man.forEach(e=>{if(!/^(png|jpe?g)$/.test(e.ext))return;const k=e.path.split('/').pop().toLowerCase();(byName.get(k)||byName.set(k,[]).get(k)).push(e.path)});
  const near=(name,from)=>{const a=byName.get(String(name||'').toLowerCase());if(!a)return null;let best=a[0],bl=-1;a.forEach(p=>{let i=0;while(i<p.length&&p[i]===from[i])i++;if(i>bl){bl=i;best=p}});return best};
  const imgIds=new Map();const img=(path,kind,name)=>{if(!path)return'';if(imgIds.has(path))return imgIds.get(path);
    const ex=Object.values(S.images).find(i=>i.ref===ofRef(pkg,path));if(ex){imgIds.set(path,ex.id);return ex.id}
    const sz=kindSize(kind)||[256,256];const rec={id:uid(),kind,name:(name||path.split('/').pop()).replace(/\.[a-z0-9]+$/i,'').slice(0,60),ref:ofRef(pkg,path),w:kind==='kit'?2048:sz[0],h:kind==='kit'?2048:sz[1],size:size.get(path)||0,createdAt:Date.now(),of:path};
    saveImage(rec);imgIds.set(path,rec.id);return rec.id};
  // team files: only the option file's main USB part (add-on parts reuse its team slots and competition IDs and are not exported);
  // one team per game ID, from the file of the last part that has it (the parts are imported in order, so the later one counts)
  const teds=[],ceds=[];const sc=ofScope(man);const idx=new Map(man.map((e,i)=>[e.path,i]));OF_GF.set(pkg,gf);
  Object.keys(gf).filter(sc.inScope).sort((a,b)=>ofPart(a)-ofPart(b)||(idx.get(a)||0)-(idx.get(b)||0)).forEach(path=>{const raw=TED.unb64(gf[path]);
    if(/\.ted$/i.test(path)){try{const P=TED.parse(raw);TED_CACHE.set(ofRef(pkg,path),gf[path]);teds.push({path,P,names:ofNames(TED.decrypt(raw))})}catch(e){aiLog('  '+path+': '+e.message)}}
    else{try{ceds.push({path,b64:gf[path],C:CED.parse(raw)})}catch(e){aiLog('  '+path+': '+e.message)}}});
  const byId=new Map();teds.forEach(x=>{const k=x.P.team.teamId;const g=byId.get(k);if(!g)byId.set(k,{main:x,copies:[]});else{g.copies.push(g.main);g.main=x}});
  aiLog('  '+teds.length+' team files ('+byId.size+' teams), '+ceds.length+' competition files, '+man.length+' files in all'+(sc.others.length?'; left out: '+sc.others.join(', ')+' (add-ons that reuse '+sc.main+'\'s team slots)':''));
  // match package teams to project teams: same game ID with a matching name, else the same name
  // two passes: first every package team whose game ID and name both match, then names for the rest; a project team whose own
  // game ID is in the package is never matched by name to another team (two clubs called "Arsenal" stay two clubs)
  const used=new Set();const pkgIdSet=new Set(teds.map(x=>x.P.team.teamId));const isNat=x=>/national/i.test(ofLeague(x.path).name);
  const pass1=new Map();teds.forEach(x=>{if(pass1.has(x.P.team.teamId))return;const nm=x.P.team.name;
    const t=teamsArr().find(t=>!used.has(t.id)&&!t.sameAs&&isNationalTeam(t)===isNat(x)&&+t.gameId===x.P.team.teamId&&[t.name,t.gameSlot].some(n=>n&&nameScore(n,nm)>=0.6));
    if(t){used.add(t.id);pass1.set(x.P.team.teamId,t)}});
  // option files move clubs between game slots (Arsenal 2517, Manchester United 4077 …), so names decide, within the folder's country
  const matchOf=x=>{const P=x.P,nm=P.team.name;if(pass1.has(P.team.teamId))return pass1.get(P.team.teamId);const fc=ofCountry(ofLeague(x.path).name);
    const cands=teamsArr().filter(t=>{if(used.has(t.id)||t.sameAs||isNationalTeam(t)!==isNat(x)||reserveMark(t.name)!==reserveMark(nm))return false;
      const tc=norm((S.comps[t.compId]||{}).country||t.country||'');return !fc||!tc||tc===fc||['international','europe','asia afc','asia','south america'].includes(tc)});
    const t=cands.find(t=>nameScore(t.name,nm)===1||nameScore(t.gameSlot||'',nm)===1)||cands.find(t=>nameScore(t.name,nm)>=0.85);if(t)used.add(t.id);return t||null};
  const leagueTeams=new Map();let matched=0,added=0;const touched=[];
  for(const [teamId,{main,copies}] of byId){const P=main.P;const ex=matchOf(main);const lg=ofLeague(main.path);
    const x=ex?clone(ex):newTeam({name:P.team.name,players:[],kits:[]});if(ex)matched++;else added++;
    x.name=P.team.name||x.name;x.short=(P.team.short||x.short||shortName(x.name)).toUpperCase().slice(0,3);if(P.team.stadium)x.stadium=P.team.stadium;
    x.manager=x.manager||{name:'',nat:'',age:''};if(P.team.coach)x.manager.name=P.team.coach;x.gameId=teamId;
    x.players=P.players.map(tp=>{const p=tedPlayerToStudio(tp,teamId);if(validGameId(tp.pid))p.gameId=tp.pid;return p});
    const n=main.names;const at=main.path;
    const e=near(n.emblem,at);if(e)x.emblem=img(e,'emblem',x.name+' crest');
    const m=near(n.manager,at);if(m)x.managerPhoto=img(m,'manager',x.manager.name||x.name+' manager');
    x.kits=x.kits||[];n.kits.forEach((nm,k)=>{if(!nm)return;const p=near(nm,at);if(!p)return;const slot=OF_KIT_SLOT[k];let kit=x.kits.find(z=>z.slot===slot);if(!kit){kit=newKit(slot);x.kits.push(kit)}kit.img=img(p,'kit',x.name+' '+slot)});
    const sd=near(n.stadium,at);if(sd)x.stadiumImg=img(sd,'stadium',x.name+' stadium');const sps=[n.sp1,n.sp2,n.sp3].map(nm=>nm&&near(nm,at)||'');x.sponsorImgs=sps.map((q,i)=>q?img(q,'sponsor',x.name+' board '+(i+1)):'');
    const paths={emblem:e||'',manager:m||'',stadium:sd||'',sponsors:sps,kits:n.kits.map(nm=>nm&&near(nm,at)||'')};
    x.of={pkg,ted:main.path,copies:copies.map(c=>c.path),league:lg.folder,names:n,paths,imgDir:ofDir(paths.kits.find(Boolean)||e||at)};
    if(x.sameAs){delete x.sameAs;delete x.sameAsId}
    S.teds[x.id]={id:x.id,tedTeamId:teamId,file:main.path.split('/').pop(),ref:ofRef(pkg,main.path),scheme:main.P.scheme,origName:P.team.name,emblemFile:n.emblem,ofPath:main.path,at:Date.now()};Store.put('teds',S.teds[x.id]);
    (leagueTeams.get(lg.folder)||leagueTeams.set(lg.folder,{name:lg.name,teams:[]}).get(lg.folder)).teams.push(x);touched.push(x)}
  // competition files: matched to a competition by name, or added (cups, supercups …)
  // one competition file per competition: the same file first, then the same name, then a close one; a competition that already
  // took a file in this build never takes a second (FIFA World Cup and FIFA Club World Cup stay two competitions)
  let cedN=0;const cedTaken=new Set();const free=c=>!cedTaken.has(c.id);const isWc=n=>/world cup/i.test(n)&&!/club/i.test(n);
  for(const {path,b64,C} of ceds){let c=compsArr().find(c=>free(c)&&c.of&&c.of.ced===path)||compsArr().find(c=>free(c)&&c.worldCup&&isWc(C.name))||compsArr().find(c=>free(c)&&nameScore(c.name,C.name)===1)||compsArr().find(c=>free(c)&&!c.worldCup&&!(isWc(C.name)!==isWc(c.name))&&nameScore(c.name,C.name)>=0.85);
    if(!c){c=newComp({name:C.name,type:CUP_RE.test(C.name)?'Cup':'League'})}
    c.ced={b64,compId:C.compId,file:path.split('/').pop(),emblemFile:C.emblemFile,origName:C.name,at:Date.now()};c.gameId=String(C.compId);
    const lp=near(C.emblemFile,path);if(lp)c.emblem=img(lp,'comp',C.name+' logo');c.of=Object.assign({},c.of||{},{pkg,ced:path,names:{emblem:C.emblemFile},paths:{emblem:lp||''}});c.of.hash=ofCompHash(c);saveComp(c);cedTaken.add(c.id);cedN++}
  // clubs: in the league of their team slot in the game (rule book "Competitions come from game files"). National teams join
  // the World Cup; a club already in a competition of the project (a rebuild) keeps it; a club whose slot PES 2021 doesn't list
  // stays without one. Folders decide nothing.
  await pes21Teams().catch(()=>{});const wc=compsArr().find(c=>c.worldCup);
  touched.forEach(x=>{const key=slotLeagueOf(+x.gameId);
    if(/^national-teams/.test(key)){if(wc&&!(wc.teams||[]).includes(x.id)){wc.teams=(wc.teams||[]).concat(x.id);saveComp(wc)}return}
    if(x.compId&&S.comps[x.compId])return;const c=key?slotComp(key,pkg):null;if(c)x.compId=c.id});
  // teams outside the package keep their data; a game ID the package now uses is freed (their file would overwrite a package team)
  const pkgIds=new Set(byId.keys());let freed=0;teamsArr().forEach(t=>{if(used.has(t.id)||touched.some(x=>x.id===t.id))return;if(+t.gameId&&pkgIds.has(+t.gameId)){const o=clone(t);o.gameId='';if(S.teds[t.id]&&S.teds[t.id].generated){delete S.teds[t.id];Store.del('teds',t.id)}saveTeam(o);freed++}});
  touched.forEach(x=>{x.players.forEach(normPlayer);x.of.hash=ofHash(x);x.of.img0=ofImgState(x);saveTeam(x)});
  S.settings.ofPkg={id:pkg,name:label,builtAt:Date.now()};saveSettings();
  aiLog('  '+matched+' teams updated from the package, '+added+' added, '+cedN+' competition files'+(freed?', '+freed+' outside teams lost a game ID the package uses':''));
  return{matched,added,ceds:cedN,freed,teams:byId.size}}
// the country a league folder stands for ('' for mixed folders: others, AFC, legends, national teams)
function ofCountry(league){const l=norm(league);const M=[['premier league|skybet|championship|efl','england'],['bundesliga','germany'],['laliga|la liga|hypermotion','spain'],['serie a|serie b','italy'],
  ['ligue 1|ligue 2','france'],['eredivisie','netherlands'],['liga nos|liga portugal','portugal'],['jupiler|pro league','belgium'],['3f superliga|superliga dk','denmark'],['russian|tinkoff','russia'],['swiss','switzerland'],
  ['scottish','scotland'],['brasileir','brazil'],['argentin','argentina'],['chile','chile'],['betplay|colombia','colombia'],['cfa|chinese','china'],['mls','usa'],['super lig|s per lig','turkiye'],['indonesia','indonesia'],['bbva mx|liga mx','mexico']];
  for(const [re,c] of M)if(new RegExp('\\b('+re+')').test(l))return c;return''}
function ofCompHash(c){return String(fnv(JSON.stringify([c.name,c.emblem,...(c.codeSet&&+c.gameId?[+c.gameId]:[])])))}// a slot set on Game codes is a change; untouched, the hash is as built
// the installed state of a team the option file lacks: its data and its code (a code given later must be written)
const ofNewSig=t=>ofHash(t)+'|'+(+t.gameId||0);

/* ---- the export plan: one USB folder with the option file's file set, edited files rebuilt, new ones added in its own folders ---- */
// The game imports every file of one kind from the USB in one go (team files, then competition files, then images) and links
// them by the names inside the game files; folders don't matter to it. So the export is one USB folder: the option file's main
// part (the one with most team files, "USB 1"), with its own folders. Other USB parts are add-ons that reuse its team slots and
// competition IDs (Liga MX, Liga 1 …) and are left out. Files outside every USB part (credits, help images, league order,
// CHANGES.txt) stay at the top, next to it. (docs/DATABASE_RULES.md, 6)
function ofScope(man){const tops=new Map();man.forEach(e=>{const s=e.path.split('/');const w=s.indexOf('WEPES');if(w<0)return;const top=s.slice(0,w).join('/');tops.set(top,(tops.get(top)||0)+(e.ext==='ted'?1:0))});
  const mainTop=([...tops.entries()].sort((a,b)=>b[1]-a[1])[0]||[''])[0];const others=[...tops.keys()].filter(k=>k!==mainTop&&k);const pre=mainTop?mainTop+'/':'';
  const inScope=p=>{const s=p.split('/');const w=s.indexOf('WEPES');if(w>=0)return s.slice(0,w).join('/')===mainTop;return !others.some(o=>p.startsWith(o+'/'))};
  return{pre,wepes:pre+'WEPES/',main:mainTop,others,inScope}}
// import order inside the USB folder: the numbered parts (1 … 7) in order, so a later part's file for a team slot is the one that counts
const ofPart=p=>{const s=p.split('/');const n=parseInt(s[s.indexOf('WEPES')+1],10);return isNaN(n)?1e6:n};
const OF_GF=new Map();async function ofGameFiles(pkg){if(!OF_GF.has(pkg))OF_GF.set(pkg,(await ofApi('gamefiles?pkg='+encodeURIComponent(pkg))).files);return OF_GF.get(pkg)}
// a name inside a game file → the package image it means: the copy nearest the game file
function ofNearFn(man){const byName=new Map();man.forEach(e=>{if(!/^(png|jpe?g)$/.test(e.ext))return;const k=e.path.split('/').pop().toLowerCase();(byName.get(k)||byName.set(k,[]).get(k)).push(e.path)});
  return(name,from)=>{const a=byName.get(String(name||'').toLowerCase());if(!a)return null;let best=a[0],bl=-1;a.forEach(p=>{let i=0;while(i<p.length&&p[i]===from[i])i++;if(i>bl){bl=i;best=p}});return best}}
// the folder of a competition in the export: the option file's own league folder, else one given once and kept, numbered after the
// option file's last league folder, in its last part. Kept in settings so adding or deleting a competition never moves a team.
function ofLeagueDir(c,sc,man,pkg){if(c&&c.of&&c.of.pkg===pkg&&c.of.folder&&sc.inScope(c.of.folder+'/x'))return c.of.folder;
  const map=S.settings.ofFolders||(S.settings.ofFolders={});const key=c?c.id:'__none';if(map[key])return map[key];
  let nn=0,last=1;man.forEach(e=>{const s=e.path.split('/');const w=s.indexOf('WEPES');if(w<0)return;const pt=parseInt(s[w+1],10);if(!isNaN(pt))last=Math.max(last,pt);const m=(s[w+2]||'').match(/^(\d+)\./);if(m)nn=Math.max(nn,+m[1])});
  Object.values(map).forEach(f=>{const m=f.split('/').pop().match(/^(\d+)\./);if(m)nn=Math.max(nn,+m[1])});
  map[key]=sc.wepes+last+'/'+String(nn+1).padStart(2,'0')+'. '+(String(c?c.name:'Other Teams').replace(/[\\/:*?"<>|]+/g,' ').trim()||'Other Teams');saveSettings();return map[key]}
// a league folder's own subfolders for team files and club images (Teds/, Ted/, Teds ger1/ …, Images/)
function ofSubDirs(folder,man){const pre=folder+'/';let ted='Teds/',img='Images/';
  const t=man.find(e=>e.ext==='ted'&&e.path.startsWith(pre));if(t)ted=ofDir(t.path).slice(pre.length);
  const i=man.find(e=>/^(png|jpe?g)$/.test(e.ext)&&e.path.startsWith(pre)&&e.path.slice(pre.length).split('/').length>=3);if(i)img=i.path.slice(pre.length).split('/')[0]+'/';return{ted,img}}
// opt.dry: list what would be written without building any file (for the Overview's contents tree)
async function ofPlan(mode,opt={}){const dry=!!opt.dry,EMPTY=new Blob([]),mk=async f=>dry?EMPTY:await f();const pk=S.settings.ofPkg;if(!pk)throw new Error('no option-file package in this project');const pkg=pk.id;
  await ensureGameFiles();await pes21Teams().catch(()=>{});// every team and competition has its game file before anything is written (docs/DATABASE_RULES.md, 2)
  const all=await ofManifest(pkg);const sc=ofScope(all);const man=all.filter(e=>sc.inScope(e.path));const inMan=new Map(man.map(e=>[e.path,e]));
  const out=new Map(),add=[],notes=[],changedTeams=[],compMarks=[];if(mode==='full')man.forEach(e=>out.set(e.path,{src:'pkg',size:e.size}));
  // a dry plan builds nothing, so a file it would write counts the size of the package file at that path (an estimate)
  const put=(path,data,why,kind)=>{if(!out.has(path)&&!inMan.has(path))add.push(path);out.set(path,{data,size:data.size||data.length||(dry&&inMan.has(path)?+inMan.get(path).size||0:0),why,kind})};
  const imgOut=async(id,path,resize,kind)=>{if(dry){put(path,EMPTY,'image',kind);return}const b=await imgBlobFor(id,resize);if(!b)throw new Error('image missing');put(path,b,'image',kind)};
  const fresh=n=>(pesName(n)||'img')+'.png';const kitPx=S.settings.kitExport==='1024'?1024:0;
  // what each package game file names, so the images of a file that goes, go with it
  const gf=await ofGameFiles(pkg);const near=ofNearFn(man);const named=new Map();const pkKind=new Map();const nameOf=(img,by)=>{if(img)(named.get(img)||named.set(img,new Set()).get(img)).add(by)};
  for(const e of man){const b=gf[e.path];if(!b)continue;try{if(e.ext==='ted'){const n=ofNames(TED.decrypt(TED.unb64(b)));[[n.emblem,'emblem'],[n.stadium,'stadium'],[n.sp1,'sponsor'],[n.sp2,'sponsor'],[n.sp3,'sponsor'],[n.manager,'manager'],...(n.kits||[]).map(x=>[x,'kit'])].forEach(([x,k])=>{if(!x)return;const p=near(x,e.path);nameOf(p,e.path);if(p)pkKind.set(p,k)})}
    else if(e.ext==='ced'){const C=CED.parse(TED.unb64(b));if(C.emblemFile){const p=near(C.emblemFile,e.path);nameOf(p,e.path);if(p)pkKind.set(p,'comp')}}}catch(_){}}
  // every file of the option file stays: a second file for the same team slot (another part's) is kept and, when the team
  // changes, written with the same data, so the game gets the same team whichever it imports last. Only the files of teams or
  // competitions deleted in the studio are left out, with the images only they name.
  // "Don't write a team's second team file" (off unless ticked; the user, 2026-11-21): the second file of a slot is left out
  // like a deleted team's file, with the images only it names, and a Changes only export lists it as a file to delete. The
  // team's players whose record is only in the second file are written into the first from that record (teamPlayersFor).
  const noSecond=!!S.settings.ofNoSecond;
  const keep=new Set();teamsArr().forEach(t=>{if(t.of&&t.of.pkg===pkg&&!t.sameAs&&t.of.ted&&!t.noCode&&!codeMoved(t)){keep.add(t.of.ted);if(!noSecond)(t.of.copies||[]).forEach(p=>keep.add(p))}});compsArr().forEach(c=>{if(c.of&&c.of.ced&&!c.noCode&&!codeMoved(c))keep.add(c.of.ced)});
  const gone=new Set(man.filter(e=>(e.ext==='ted'||e.ext==='ced')&&!keep.has(e.path)).map(e=>e.path));named.forEach((by,img)=>{if([...by].every(p=>gone.has(p)))gone.add(img)});
  gone.forEach(p=>out.delete(p));
  // a file left out at the last install that is back (a team restored) is written again
  const instGone=new Set((S.settings.ofInstalled&&S.settings.ofInstalled.removed)||[]);if(mode==='changes')instGone.forEach(p=>{if(!gone.has(p)&&inMan.has(p)&&!out.has(p))out.set(p,{src:'pkg',size:inMan.get(p).size,why:'back'})});
  // how many images of the option file carry each file name (the game keeps images by name, so only a name used once is safe to name)
  const imgBase=new Map();man.forEach(e=>{if(/\.(png|jpe?g|dds|bmp)$/i.test(e.path)){const b=e.path.split('/').pop().toLowerCase();imgBase.set(b,(imgBase.get(b)||0)+1)}});
  let legacy8=false;// earlier exports put new teams in an extra part, WEPES/8
  const skip={off:[],inst:[],offC:[],instC:[],noFile:[],noSlot:[]};// what is left out without a file of its own to blame: said in the notes, never silently
  for(const t of teamsArr()){if(t.sameAs)continue;const h=ofHash(t);
    if(t.noCode){notes.push(t.name+': no code (Game codes), so it isn\'t exported');continue}
    if(t.of&&t.of.pkg===pkg&&!codeMoved(t)){if(!sc.inScope(t.of.ted)){notes.push(t.name+': its team file is in '+t.of.ted.split('/')[0]+', which isn\'t exported');continue}
      const i0=mode==='full'?t.of.img0:(t.of.imgInst||t.of.img0);const base=mode==='full'?t.of.hash:(t.of.inst||t.of.hash);if(h===base)continue;changedTeams.push(t);const cur=ofImgState(t);
      const names=clone(t.of.names||{});names.kits=names.kits||[];const paths=clone(t.of.paths||{});paths.kits=paths.kits||[];paths.sponsors=paths.sponsors||[];let namesChanged=false;
      // images: an edited one replaces the package file of the same name (the team file keeps pointing at it); a new one gets a name
      // in the team's folder, kept on the team so every later export writes the same name
      const slot=async(curId,oldId,oldPath,key,kind,k)=>{if(!curId||curId===oldId)return;const img=S.images[curId];
        // already named by its own option-file path. When no file of the option file named that image, the installed copy may
        // not have it (a First install leaves unnamed images out), so a changes export carries it along with the team file.
        if(isOfRef(img&&img.ref)&&ofParse(img.ref).path===oldPath){if(mode==='changes'&&inMan.has(oldPath)&&!named.has(oldPath)&&!out.has(oldPath))out.set(oldPath,{src:'pkg',size:+inMan.get(oldPath).size||0,why:'back',kind});return}
        // An image of the option file itself put in a slot (Health check: Fix: link it, Relink) keeps its own file name and place:
        // the team file names the image the option file already has, and no copy under a new name is made. Only when its name
        // can't be used (not plain ASCII of 32 characters or fewer, or shared by another image of the option file, where the
        // game would take whichever it imported last) does it get a name in the team's folder like any new image.
        const own=img&&isOfRef(img.ref)&&ofParse(img.ref).pkg===pkg?ofParse(img.ref).path:'',ownNm=own?own.split('/').pop():'';
        const useOwn=!!own&&inMan.has(own)&&/^[\x20-\x7e]{1,32}$/.test(ownNm)&&imgBase.get(ownNm.toLowerCase())===1&&(!oldPath||!inMan.has(oldPath));
        if(oldPath&&!useOwn){await imgOut(curId,oldPath,kind==='kit'?kitPx:0,kind);return}
        const nm=useOwn?ownNm:fresh(t.name+'_'+(k!=null?OF_KIT_SLOT[k]:key));const full=useOwn?own:t.of.imgDir+nm;
        if(useOwn){if(!out.has(full))out.set(full,{src:'pkg',size:+inMan.get(full).size||0,why:'back',kind})}else await imgOut(curId,full,kind==='kit'?kitPx:0,kind);
        if(k!=null){names.kits[k]=nm;paths.kits[k]=full}else if(/^sp\d$/.test(key)){names[key]=nm;paths.sponsors[+key[2]-1]=full}else{names[key]=nm;paths[key]=full}namesChanged=true};
      await slot(cur.emblem,i0.emblem,paths.emblem,'emblem','emblem');await slot(cur.manager,i0.manager,paths.manager,'manager','manager');
      for(let k=0;k<5;k++)await slot(cur.kits[k],i0.kits[k],paths.kits[k],'kit','kit',k);
      await slot(t.stadiumImg||'',null,(paths.stadium||''),'stadium','stadium');for(let i=0;i<3;i++)await slot(spOf(t)[i]||'',null,(paths.sponsors[i]||''),'sp'+(i+1),'sponsor');
      if(namesChanged){t.of.names=names;t.of.paths=paths;saveTeam(t)}
      // the team file: rebuilt only when something in it changed
      const fileHash=String(fnv(JSON.stringify([h,names])));const fileBase=mode==='full'?t.of.fileHash0:(t.of.fileInst||t.of.fileHash0);
      if(!t.of.fileHash0)t.of.fileHash0=String(fnv(JSON.stringify([t.of.hash,t.of.names])));
      if(fileHash!==(fileBase||t.of.fileHash0)||namesChanged)for(const path of [t.of.ted,...(S.settings.ofNoSecond?[]:(t.of.copies||[]).filter(p=>sc.inScope(p)))]){if(dry)put(path,EMPTY,'team file');else{const ref=ofRef(pkg,path);const b64=await tedTemplateBytes({ref});
        const P=TED.parse(TED.unb64(b64));const src={kind:'own',teamId:P.team.teamId,scheme:P.scheme,key:ref};const m=await teamPlayersFor(t,src,b64);
        const o=await TED.build(Object.assign({},t,{players:m.players}),{b64,teamId:P.team.teamId,scheme:P.scheme},{emblemFile:names.emblem||undefined,managerFile:names.manager||undefined,kitFiles:names.kits,stadiumFile:names.stadium===undefined?undefined:names.stadium,sponsorFiles:[names.sp1,names.sp2,names.sp3],clearImgs:Object.keys(t.of.cleared||{}),baseRec:S.settings.ofNewPlayers?m.baseRec:null,keepSquad:!m.players.length,teamId:t.codeSet&&+t.gameId?+t.gameId:0});
        put(path,new Blob([o.bytes]),'team file');if(o.warn.length)notes.push(t.name+': '+o.warn.slice(0,3).join('; ')+(o.warn.length>3?' (and '+(o.warn.length-3)+' more)':''))}}}
    else{// a team the package doesn't have: in its league's own folder (Teds/ and Images/<Team>/), at paths kept on the team
      if(S.settings.ofExtra===false){skip.off.push(t.name);continue}if(t.ofInst&&!t.ofNew)legacy8=true;if(mode==='changes'&&t.ofInst===ofNewSig(t)&&t.ofNew){skip.inst.push(t.name);continue}const src=teamFileInfo(t);
      if(!src){notes.push(t.name+': no team file, so nothing is written for it (import its .ted or give it a game ID)');continue}changedTeams.push(t);
      if(+t.gameId&&!codePlaced('team',t))notes.push(t.name+': code '+t.gameId+' is not a team the game has, so the game skips its file on import. Give it a game team\'s code on Game codes');
      const c=S.comps[t.compId]||(isNationalTeam(t)?compsArr().find(x=>x.worldCup):null);const tag=teamTag(t)||pesName(t.short||t.name);
      if(!t.ofNew||(!t.ofInst&&!t.ofNew.ted.startsWith(ofLeagueDir(c,sc,man,pkg)+'/'))){const lg=ofLeagueDir(c,sc,man,pkg);const sd=ofSubDirs(lg,man);
        t.ofNew={ted:lg+'/'+sd.ted+tag+'.ted',dir:lg+'/'+sd.img+(pesName(t.name)||tag)+'/'};saveTeam(t)}
      const dir=t.ofNew.dir;const names={emblem:'',manager:'',kits:[]};
      // each image under the name the game already has for this code (the old holder's: it overwrites, no space needed), else new
      const at=(key,k,def)=>{const y=codeImgName(t,key,k);return y?{name:y.name,path:y.path}:{name:def,path:dir+def}};
      if(t.emblem){const a=at('emblem',0,'E_'+tag+'.png');names.emblem=a.name;await imgOut(t.emblem,a.path,0,'emblem')}
      // manager photo, stadium and sponsor boards only when the team has one: an empty slot shows the game's own image and takes
      // no image space (the game's stores are nearly full: 2026-11-19, 14 sponsor boards and 4 emblems free)
      if(S.images[t.managerPhoto]){const a=at('manager',0,'M_'+tag+'.png');names.manager=a.name;await imgOut(t.managerPhoto,a.path,0,'manager')}
      if(!isNationalTeam(t)){names.stadium='';if(S.images[t.stadiumImg]){const a=at('stadium',0,'S_'+tag+'.png');names.stadium=a.name;await imgOut(t.stadiumImg,a.path,0,'stadium')}}
      names.sponsors=[];for(let i=0;i<3;i++){names.sponsors[i]='';const id=spOf(t)[i];if(S.images[id]){const a=at('sp'+(i+1),0,'P'+(i+1)+'_'+tag+'.png');names.sponsors[i]=a.name;await imgOut(id,a.path,0,'sponsor')}}
      for(const k of t.kits||[]){const i=OF_KIT_SLOT.indexOf(k.slot);if(i<0)continue;const a=at('kit',i,'K_'+tag+'_'+(SLOTCODE[k.slot]||i)+'.png');names.kits[i]=a.name;if(k.img)await imgOut(k.img,a.path,kitPx,'kit');else put(a.path,await mk(()=>kitTextureBlob(t,k,kitPx||2048)),'kit drawn from its colours','kit')}
      // a team with no squad in the studio still gets its file: a team-info file, so the game keeps its own squad
      if(dry){put(t.ofNew.ted,EMPTY,(t.players||[]).length?'team file':'team-info file (players kept in the game)');continue}
      const b64=await src.load();const m=(t.players||[]).length?await teamPlayersFor(t,src,b64):{players:[],baseRec:null};
      const o=await TED.build(Object.assign({},t,{players:m.players}),{b64,teamId:src.teamId,scheme:src.scheme},{emblemFile:names.emblem||undefined,managerFile:names.manager||undefined,kitFiles:names.kits,stadiumFile:names.stadium,sponsorFiles:names.sponsors,teamId:t.codeSet&&+t.gameId?+t.gameId:src.kind==='generic'?src.teamId:0,generic:src.kind==='generic',baseRec:S.settings.ofNewPlayers?m.baseRec:null,keepSquad:!m.players.length});if(o.warn.length)notes.push(t.name+': '+o.warn.slice(0,3).join('; ')+(o.warn.length>3?' (and '+(o.warn.length-3)+' more)':''));
      put(t.ofNew.ted,new Blob([o.bytes]),m.players.length?'team file':'team-info file (players kept in the game)')}}
  // competitions: a renamed competition or a new logo rewrites its competition file and logo at the same paths
  for(const c of compsArr()){if(!(c.of&&c.of.ced&&c.ced&&c.ced.b64)||c.noCode||codeMoved(c))continue;if(!sc.inScope(c.of.ced)){notes.push(c.name+': its competition file is in '+c.of.ced.split('/')[0]+', which isn\'t exported');continue}
    const h=ofCompHash(c);const base=mode==='full'?c.of.hash:(c.of.inst||c.of.hash);if(h===base)continue;
    {const why=cedProblem(c.ced.b64,c.codeSet?+c.gameId:0);if(why){notes.push(c.name+': competition file not written: '+why);continue}}
    let logo=c.of.names.emblem;const img=S.images[c.emblem];if(c.emblem&&!(isOfRef(img&&img.ref)&&ofParse(img.ref).path===c.of.paths.emblem)){const path=c.of.paths.emblem||ofDir(c.of.ced)+'Logos/'+fresh(c.name);if(!c.of.paths.emblem)logo=path.split('/').pop();await imgOut(c.emblem,path,0,'comp')}
    put(c.of.ced,dry?EMPTY:new Blob([await CED.build(c.ced.b64,{name:c.name,emblemFile:logo,compId:c.codeSet?+c.gameId:0})]),'competition file');compMarks.push({id:c.id,inst:h})}
  // competitions the package doesn't have: in the option file's own competitions folder, numbered after its last file, at a path kept on the competition
  if(S.settings.ofExtra!==false){const cnt=new Map();man.filter(e=>e.ext==='ced').forEach(e=>cnt.set(ofDir(e.path),(cnt.get(ofDir(e.path))||0)+1));
    const cedDir=([...cnt.entries()].sort((a,b)=>b[1]-a[1])[0]||[sc.wepes+'1/00. Competitions/'])[0];
    const lcnt=new Map();named.forEach((by,img)=>{if([...by].some(p=>/\.ced$/i.test(p)))lcnt.set(ofDir(img),(lcnt.get(ofDir(img))||0)+1)});const logoDir=([...lcnt.entries()].sort((a,b)=>b[1]-a[1])[0]||[cedDir+'Logos/'])[0];
    // only competitions made in the studio: a league folder of the option file without a competition file is one of the game's own
    // competitions (or a pool such as Others European), and a file with a made-up ID would not be it
    for(const c of compsArr()){if((c.of&&c.of.ced&&!codeMoved(c))||ofGameComp(c))continue;if(c.noCode){if(!c.parked)skip.noSlot.push(c.name);continue}if(!(c.ced&&c.ced.b64)){skip.noFile.push(c.name);continue}
      const sig=String(fnv(JSON.stringify([c.name,c.emblem,c.ced.compId,c.ced.emblemFile,c.codeSet?+c.gameId:0])));if(mode==='changes'&&c.ofInst===sig){skip.instC.push(c.name);continue}
      {const why=cedProblem(c.ced.b64,c.codeSet?+c.gameId:0);if(why){notes.push(c.name+': competition file not written: '+why);continue}}
      if(!c.ofCed){let nn=0;man.filter(e=>e.ext==='ced').concat(compsArr().filter(x=>x.ofCed).map(x=>({path:x.ofCed}))).forEach(e=>{const m=e.path.split('/').pop().match(/^(\d+)_/);if(m)nn=Math.max(nn,+m[1])});
        c.ofCed=cedDir+String(nn+1).padStart(2,'0')+'_'+(pesName(c.name)||'Competition')+'.ced';saveComp(c)}
      const yl=codeImgName(c,'emblem',0);const logo=yl?yl.name:(c.ced.emblemFile||'');if(c.emblem&&logo){try{await imgOut(c.emblem,yl?yl.path:logoDir+logo,0,'comp')}catch(e){notes.push(c.name+': logo not written ('+e.message+')')}}
      put(c.ofCed,dry?EMPTY:new Blob([await CED.build(c.ced.b64,{name:c.name,emblemFile:logo,compId:c.codeSet?+c.gameId:0})]),'competition file');compMarks.push({id:c.id,sig})}}
  // "Don't include images named by no file" (on unless switched off): a package image that no team or competition file names, in
  // the package or as the studio writes it, is left out. Images the studio writes are named by the files it writes with them.
  // opt.orphans lists them whatever the setting (Health check); an image the user deleted there is always left out
  const orphans=[];const orDel=S.settings.ofOrphan||{};const dropAll=opt.orphans||S.settings.ofNoOrphans!==false;{const isImg=p=>/\.(png|jpe?g|dds|bmp)$/i.test(p);const used=new Set(named.keys());
    teamsArr().forEach(t=>{const P=t.of&&t.of.pkg===pkg&&t.of.paths;if(!P)return;[P.emblem,P.manager,P.stadium,...(P.sponsors||[]),...(P.kits||[])].forEach(x=>x&&used.add(x))});
    compsArr().forEach(c=>{const x=c.of&&c.of.paths&&c.of.paths.emblem;if(x)used.add(x)});
    [...out.entries()].forEach(([path,v])=>{if(v.src==='pkg'&&isImg(path)&&!used.has(path)&&(dropAll||orDel[pkg+'|'+path]==='del')){out.delete(path);orphans.push(path)}})}
  const files=[...out.entries()].map(([path,v])=>Object.assign({path},v));
  const order=new Map(man.map((e,i)=>[e.path,i]));files.sort((a,b)=>(order.has(a.path)?order.get(a.path):1e9)-(order.has(b.path)?order.get(b.path):1e9)||a.path.localeCompare(b.path));
  const codeGone=new Set();teamsArr().forEach(t=>{if(t.of&&t.of.pkg===pkg&&(t.noCode||codeMoved(t))){codeGone.add(t.of.ted);(t.of.copies||[]).forEach(p=>codeGone.add(p))}});
  compsArr().forEach(c=>{if(c.of&&c.of.ced&&(c.noCode||codeMoved(c)))codeGone.add(c.of.ced)});['team','comp'].forEach(k=>Object.values((S.settings.codeBook||{})[k]||{}).forEach(e=>(e.files||[]).forEach(p=>codeGone.add(p))));
  const removed=[...gone].filter(p=>!out.has(p)&&!codeGone.has(p)).sort();const removedNow=mode==='changes'?removed.filter(p=>!instGone.has(p)):removed;
  if(S.settings.ofExtra===false)compsArr().forEach(c=>{if(!((c.of&&c.of.ced&&!codeMoved(c))||ofGameComp(c)||c.parked))skip.offC.push(c.name)});
  {const say=(L,one,many,why)=>{if(L.length)notes.unshift((L.length===1?one:L.length+' '+many)+' '+why+': '+L.slice(0,12).join(', ')+(L.length>12?' (and '+(L.length-12)+' more)':''))};
   say(skip.noFile,'1 competition you added has','competitions you added have','no competition file, so nothing is written for '+(skip.noFile.length===1?'it':'them')+' (give '+(skip.noFile.length===1?'it':'them')+' a slot on Game codes → Competitions)');
   say(skip.noSlot,'1 competition has','competitions have','no slot (Game codes), so '+(skip.noSlot.length===1?'it isn\'t':'they aren\'t')+' exported');
   say(skip.instC,'1 competition you added is','competitions you added are','not in this export: unchanged since the install you confirmed (First install writes everything)');
   say(skip.inst,'1 team you added is','teams you added are','not in this export: unchanged since the install you confirmed (First install writes everything)');
   say(skip.off.concat(skip.offC),'1 team or competition the option file doesn\'t have is','teams and competitions the option file doesn\'t have are','NOT exported, because "Also write the project\'s teams the package doesn\'t have" is unticked on this page')}
  if(legacy8)notes.unshift('Earlier exports put the teams the option file lacks in an extra part, '+sc.wepes+'8. They now go into their league\'s own folder: delete '+sc.wepes+'8 from your installed copy.');
  if(mode==='changes'&&(files.length||removedNow.length)){const txt=ofChangesText(changedTeams,files,legacy8?removedNow.concat(sc.wepes+'8 (the whole folder)'):removedNow,sc);files.push({path:'CHANGES.txt',data:new Blob([txt]),size:txt.length,why:'list'})}
  // layout check: a full install holds every package file it keeps at its own path
  const orphanSet=new Set(orphans);const missing=mode==='full'?man.filter(e=>!out.has(e.path)&&!gone.has(e.path)&&!orphanSet.has(e.path)).map(e=>e.path):[];
  const space=ofSpace(mode,man,files,gone,pkKind,inMan);
  return{mode,pkg,files,added:add,missing,removed,removedNow,orphans:orphans.sort(),dry,space,scope:{main:sc.main||'(top folder)',others:sc.others},compMarks,replaced:files.filter(f=>f.data&&order.has(f.path)).length,teams:changedTeams,notes,size:files.reduce((a,f)=>a+(f.size||0),0)}}
// Image space in the game (2026-11-19): the game keeps each image type in a store of its own, and the game's own images don't
// count. Room for a type = the option file's images of it + the free spaces the game shows once it is installed (entered on the
// Option file page). An image whose name is already in the game is overwritten in place and needs no space; a new name needs one.
// named as the game's Import Images screen names them (Edit → Data Management → Import/Export); kits go to Strip (L) or
// Strip (S), whichever you pick when importing: the row follows the export's kit size (full size: L, 1024: S)
const SPACE_KINDS=[['emblem','Team Emblems'],['comp','Competition Emblems'],['kit','Strip (L)'],['manager','Manager Photo'],['stadium','Stadium Image'],['sponsor','Sponsor Logo Image']];
Object.defineProperty(SPACE_KINDS[2],1,{get:()=>S.settings.kitExport==='1024'?'Strip (S)':'Strip (L)'});
const isImgPath=p=>/\.(png|jpe?g|dds|bmp)$/i.test(p);
function ofImgKind(path,pkKind,f){if(f&&f.kind)return f.kind;if(pkKind&&pkKind.get(path))return pkKind.get(path);const k=orKind(path);return k==='logo'?'comp':k}
function ofSpace(mode,man,files,gone,pkKind,inMan){const K={};SPACE_KINDS.forEach(([k])=>K[k]={pkg:0,add:0,over:0,gone:0,newImgs:{}});
  const inst=(S.settings.imgSpace&&S.settings.imgSpace.inst)||{};
  man.forEach(e=>{if(!isImgPath(e.path))return;const k=ofImgKind(e.path,pkKind);if(K[k])K[k].pkg++});
  files.forEach(f=>{if(!isImgPath(f.path))return;const k=ofImgKind(f.path,pkKind,f);if(!K[k])return;
    if(mode!=='full'&&(inMan.has(f.path)||inst[f.path]))K[k].over++;else{K[k].add++;if(!inMan.has(f.path))K[k].newImgs[f.path]=k}});
  [...gone].forEach(p=>{if(!isImgPath(p))return;const k=ofImgKind(p,pkKind);if(K[k])K[k].gone++});return K}
// imported in the game: what the game says (Edit shows how many of a type are imported), else the option file's images and the
// new ones confirmed since. A store can hold fewer than the option file has (stadium images: about 11 in all), so the game's own
// count wins when entered.
const spNum=v=>v!==''&&v!=null&&isFinite(+v);
function spaceBase(k,pkg){const S2=S.settings.imgSpace||{};const I=S2.imp||{};if(spNum(I[k]))return +I[k];let n=0;Object.values(S2.inst||{}).forEach(x=>{if(x===k)n++});return pkg+n}
function imgSpaceRows(sp,full){const S2=S.settings.imgSpace||{};const F=S2.free||{},I=S2.imp||{};
  return SPACE_KINDS.map(([k,l])=>{const r=sp[k];const f=F[k];const known=spNum(f);const base=spaceBase(k,r.pkg);const cap=known?base+(+f):null;const room=full?cap:(known?+f:null);const over=room!=null&&r.add>room;
    return{k,l,r,known,f:known?+f:'',imp:spNum(I[k])?+I[k]:'',base,cap,room,over}})}
function ofSpaceHTML(p){if(!p.space)return'';const full=p.mode==='full';const rows=imgSpaceRows(p.space,full);
  return `<div class="card" style="margin-top:12px"><b>Image space in the game</b><p class="small muted" style="margin:6px 0 8px">The game keeps each type of image in a store of its own. Its own images don't take space; the option file's images and every image you import do, and once a store is full the game refuses the rest. An image whose name is already in the game is overwritten in place and takes no space. Enter what the game says for each type: how many are imported and about how many more it accepts (left empty, imported = the option file's images and the new ones confirmed since). Room = imported + free; a store can hold fewer than the option file has (Stadium Image: about 11 in all). Kits go to Strip (L) or Strip (S), as you choose on import: Strip (L) holds only about 70, so import kits as Strip (S) (kit texture size 1024 under Partial Export makes them small too); the kit row follows that setting. The game counts space by file size, so its number is approximate: it may take one or two more or fewer, and big files fill a store sooner. Confirming an export takes what it added off them. Keep the game's own images wherever they will do: every one you replace costs a space.${full?' <b>First install:</b> room = imported + free, after deleting every imported image in Edit first.':''}</p>
  <div class="tw"><table><thead><tr><th>Type</th><th>In the option file</th><th>Imported in the game</th><th>Free in the game</th><th>Room in all</th><th>This export adds</th><th></th></tr></thead><tbody>
  ${rows.map(x=>`<tr><td>${x.l}</td><td>${x.r.pkg}</td><td><input type="number" min="0" step="1" style="width:80px" data-in="imgFree" data-f="imp" data-k="${x.k}" value="${x.imp}" placeholder="${x.base}" aria-label="${x.l} imported in the game"></td><td><input type="number" min="0" step="1" style="width:80px" data-in="imgFree" data-k="${x.k}" value="${x.f}" placeholder="?" aria-label="Free ${x.l} in the game"></td><td>${x.cap==null?'<span class="muted">—</span>':x.cap}</td>
    <td>${x.r.add}${x.r.over?` <span class="small muted">(+ ${x.r.over} overwritten)</span>`:''}</td><td>${x.room==null?(x.r.add?'<span class="small muted">enter the free spaces</span>':''):x.over?`<b style="color:var(--bad)">${x.r.add-x.room} too many</b>`:'<span style="color:var(--good,#30a46c)">fits</span>'}</td></tr>`).join('')}</tbody></table></div>
  ${rows.some(x=>x.over)?(full?`<p class="small warnbox" style="margin:8px 0 0"><b>Even a complete install doesn't fit.</b> Leave images out where the game's own will do (they cost no space): the game refuses every image over its room.</p>`
    :`<p class="small warnbox" style="margin:8px 0 0"><b>Too many new images for the game's free space.</b> A new image only goes in by overwriting one of the same name, so these won't import. Export the <b>complete option file</b> (First install) instead, delete every imported image in Edit on your PS (the game's own stay), then import it all.</p>`):''}</div>`}
IN.imgFree=el=>{const s=S.settings.imgSpace||(S.settings.imgSpace={free:{},inst:{}});const key=el.dataset.f==='imp'?'imp':'free';s[key]=s[key]||{};s[key][el.dataset.k]=el.value===''?'':Math.max(0,Math.round(+el.value)||0);s.at=Date.now();saveSettings()};
document.addEventListener('change',e=>{if(e.target&&e.target.dataset&&e.target.dataset.in==='imgFree')rerender()});
function ofChangesText(teams,files,removed,sc){return `PES 2021 OPTION FILE: CHANGES ONLY
Package: ${(S.settings.ofPkg||{}).name||''}
Created: ${new Date().toString()}
Copy the ${sc.main||'WEPES'} folder over the one you installed (same names, same places), then in PES 2021:
Edit > Data Management > Import/Export > Import Team (tick "Overwrite image files of the same name" and "Apply player and squad data"),
then Import Competition and the images.
${removed.length?`
Delete these files from your installed copy (${removed.length}). They are no longer part of the option file:
a team or competition deleted in the studio, or a second file for the same team slot. The game keeps what was last
imported into a slot, so its team stays in the game until another team is imported there.
${removed.join('\n')}
`:''}
${csText()}
Teams changed (${teams.length}): ${teams.map(t=>t.name).join(', ')}

Files (${files.length}):
${files.map(f=>f.path).join('\n')}
`}
// What an export writes, kept until you confirm PES imported it: then it becomes the installed state, so the next "Changes only"
// starts from it. Never applied by itself (docs/DATABASE_RULES.md, 6).
// A First install writes every file, so every team and competition of the package is marked, not only the changed ones: one
// whose earlier confirmed install differs from the package original is installed as it is now too.
function ofMarks(plan){const full=plan.mode==='full';const ids=new Set(plan.teams.map(t=>t.id));
  const all=full?plan.teams.concat(teamsArr().filter(t=>!ids.has(t.id)&&!t.sameAs&&t.of&&t.of.pkg===plan.pkg)):plan.teams;
  const cm=plan.compMarks||[];const cids=new Set(cm.map(m=>m.id));
  const comps=full?cm.concat(compsArr().filter(c=>!cids.has(c.id)&&c.of&&c.of.ced&&!c.noCode&&!codeMoved(c)).map(c=>({id:c.id,inst:ofCompHash(c)}))):cm;
  return{teams:all.map(t=>{const x=S.teams[t.id];if(!x)return null;if(x.of&&x.of.pkg===plan.pkg){const inst=ofHash(x);return{id:x.id,inst,img:ofImgState(x),file:String(fnv(JSON.stringify([inst,x.of.names])))}}return{id:x.id,ofInst:ofNewSig(x)}}).filter(Boolean),
  comps}}
function ofApplyInstall(p,marks){(marks.teams||[]).forEach(m=>{const x=S.teams[m.id];if(!x)return;if(m.ofInst!=null)x.ofInst=m.ofInst;else if(x.of){x.of.inst=m.inst;x.of.imgInst=m.img;x.of.fileInst=m.file}saveTeam(x)});
  (marks.comps||[]).forEach(m=>{const c=S.comps[m.id];if(!c)return;if(m.sig!=null)c.ofInst=m.sig;else if(c.of)c.of.inst=m.inst;saveComp(c)});
  if(p.space){const s=S.settings.imgSpace||(S.settings.imgSpace={free:{},inst:{}});s.free=s.free||{};s.imp=s.imp||{};
    Object.entries(p.space).forEach(([k,v])=>{const f=s.free[k];const base=spaceBase(k,v.pkg);
      if(spNum(f)){const room=base+(+f);s.free[k]=p.mode==='full'?Math.max(0,room-v.add):Math.max(0,+f-v.add)}
      if(spNum(s.imp[k]))s.imp[k]=p.mode==='full'?v.add:+s.imp[k]+v.add});
    s.inst=Object.assign(p.mode==='full'?{}:(s.inst||{}),p.newImgs||{})}
  S.settings.ofInstalled={at:p.at,mode:p.mode,files:p.files,removed:p.removed||[]};S.settings.ofPending=null;S.ui.ofEst=null;saveSettings()}
// Each export replaces the one waiting before it, and every Changes only export compares with the confirmed baseline, so it
// can be written again as often as you like and always holds every change since then. The project as it was exported is kept
// as a snapshot (p.snap): confirming makes it the project's baseline too, so the whole project is rebased on what PES has.
async function ofSetPending(plan){const marks=ofMarks(plan);const json=JSON.stringify(marks);const old=S.settings.ofPending;
  const ref=await Store.putBlob(new Blob([json],{type:'text/plain'}),'text/plain');if(old&&old.ref)Store.delBlob(old.ref);if(old)ofDropSnap(old.snap);
  const sn=await takeSnapshot('Exported for PES: '+(plan.mode==='full'?'first install':'changes')+' of '+fmtDate(Date.now()),true);sn.auto=false;Store.put('snaps',sn);
  const space={},newImgs={};Object.entries(plan.space||{}).forEach(([k,v])=>{space[k]={add:v.add,pkg:v.pkg};Object.assign(newImgs,v.newImgs||{})});
  S.settings.ofPending={at:Date.now(),mode:plan.mode,files:plan.files.length,teams:plan.teams.length,removed:plan.removed,ref,space,newImgs,snap:sn.id};saveSettings()}
// the snapshot of an export that is replaced or forgotten goes (never the baseline's)
function ofDropSnap(id){const s=id&&S.snaps[id];if(!s||id===S.settings.baseline)return;delete S.snaps[id];delete S.snapData[id];Store.del('snaps',id);if(s.ref)Store.delBlob(s.ref)}

/* ---- writing: a ZIP streamed to disk (no size limit) or the folders themselves ---- */
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u8,c=0xFFFFFFFF){for(let i=0;i<u8.length;i++)c=CRC_T[(c^u8[i])&255]^(c>>>8);return c}
// stored (uncompressed) entries, UTF-8 names, ZIP64 records when the archive passes 4 GB
function zipWriter(write){let off=0;const cd=[];const enc=new TextEncoder();
  const u16=(v)=>[v&255,(v>>>8)&255],u32=(v)=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255],u64=(v)=>{const lo=v%4294967296,hi=Math.floor(v/4294967296);return[...u32(lo),...u32(hi)]};
  const now=new Date(),dt=((now.getFullYear()-1980)<<9|(now.getMonth()+1)<<5|now.getDate()),tm=(now.getHours()<<11|now.getMinutes()<<5|(now.getSeconds()>>1));
  return{async add(path,u8){const name=enc.encode(path);const crc=(crc32(u8)^0xFFFFFFFF)>>>0;const big=off>=0xFFFFFFFF;
      const hdr=new Uint8Array([0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(tm),...u16(dt),...u32(crc),...u32(u8.length),...u32(u8.length),...u16(name.length),...u16(0)]);
      await write(hdr);await write(name);await write(u8);cd.push({name,crc,size:u8.length,off});off+=hdr.length+name.length+u8.length},
    async end(){const start=off;let cdSize=0;
      for(const e of cd){const z64=e.off>=0xFFFFFFFF;const extra=z64?[1,0,...u16(8),...u64(e.off)]:[];
        const h=new Uint8Array([0x50,0x4b,1,2,...u16(z64?45:20),...u16(z64?45:20),...u16(0x0800),...u16(0),...u16(tm),...u16(dt),...u32(e.crc),...u32(e.size),...u32(e.size),...u16(e.name.length),...u16(extra.length),...u16(0),...u16(0),...u16(0),...u32(0),...u32(z64?0xFFFFFFFF:e.off)]);
        await write(h);await write(e.name);if(extra.length)await write(new Uint8Array(extra));cdSize+=h.length+e.name.length+extra.length}
      const z64=start>=0xFFFFFFFF||cd.length>=0xFFFF;
      if(z64){const eocd64=new Uint8Array([0x50,0x4b,6,6,...u64(44),...u16(45),...u16(45),...u32(0),...u32(0),...u64(cd.length),...u64(cd.length),...u64(cdSize),...u64(start)]);
        await write(eocd64);await write(new Uint8Array([0x50,0x4b,6,7,...u32(0),...u64(start+cdSize),...u32(1)]))}
      await write(new Uint8Array([0x50,0x4b,5,6,...u16(0),...u16(0),...u16(Math.min(cd.length,0xFFFF)),...u16(Math.min(cd.length,0xFFFF)),...u32(Math.min(cdSize,0xFFFFFFFF)),...u32(z64?0xFFFFFFFF:start),...u16(0)]))}}}
// file contents in plan order, fetched a few ahead
// a request that fails because the connection dropped, timed out or the server was busy is tried again (after 1, 2, 4, 8, 15
// and 30 seconds) before the export gives up: one dropped connection must not stop a 500-file export
async function ofFetchRetry(make,what){const waits=[1,2,4,8,15,30];for(let i=0;;i++){let r=null,err=null;try{r=await make()}catch(e){if(e&&e.name==='AbortError')throw e;err=e}
    if(r&&(r.ok||(r.status<500&&r.status!==429)))return r;if(i>=waits.length)throw new Error(what+': '+(err?'could not connect to the server ('+(err.message||err)+')':'the server answered '+r.status)+', after '+(waits.length+1)+' tries');
    await sleep(waits[i]*1000)}}
async function* ofContents(plan,signal){const pkg=plan.pkg;const get=f=>f.data?f.data.arrayBuffer().then(b=>new Uint8Array(b)):ofFetchRetry(()=>fetch(ofUrl(ofRef(pkg,f.path)),{credentials:'same-origin',signal}),'Reading '+f.path).then(r=>{if(!r.ok)throw new Error(f.path+': '+r.status);return r.arrayBuffer()}).then(b=>new Uint8Array(b));
  const q=[];let i=0;const fill=()=>{while(q.length<4&&i<plan.files.length){const f=plan.files[i++];q.push({f,p:get(f)})}};fill();
  while(q.length){const {f,p}=q.shift();const u8=await p;fill();yield{f,u8}}}
// Saving on this computer: when the studio runs from this computer its server can write the export itself, as a folder. It is
// the way to save where the browser can't open a save dialog (an embedded browser). LOCAL_SAVE is null on the website.
let LOCAL_SAVE=null;fetch('api/local/info').then(r=>r.ok?r.json():null).then(o=>{if(o&&o.export){LOCAL_SAVE=o;if(location.hash==='#optionfile')rerender()}}).catch(()=>{});
async function ofWrite(plan,how){let done=0,bytes=0;const t0=Date.now();S.ui.ai.busyN=null;
  const all=+plan.size||plan.files.reduce((a,f)=>a+(+f.size||0),0);
  const tick=f=>{done++;const lbl='Writing '+done+' of '+plan.files.length+' files ('+kb(bytes)+(all?' of '+kb(all):'')+')';all?busyCount(bytes,all,lbl):busyCount(done,plan.files.length,lbl)};
  if(how==='local'){const want=(pesName((S.settings.ofPkg||{}).name)||'option-file')+(plan.mode==='full'?'_full_':'_changes_')+new Date().toISOString().slice(0,16).replace('T','_').replace(':','');
    const H={'X-Studio':'1'};const b=await fetch('api/local/export/begin',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},H),body:JSON.stringify({name:want})});const bo=await b.json().catch(()=>({}));if(!b.ok)throw new Error(bo.error||'the local server refused ('+b.status+')');
    for await(const {f,u8} of ofContents(plan)){const r=await ofFetchRetry(()=>fetch('api/local/export/file?name='+encodeURIComponent(bo.name)+'&path='+encodeURIComponent(f.path),{method:'POST',headers:H,body:u8}),'Writing '+f.path);
      if(!r.ok){const o=await r.json().catch(()=>({}));throw new Error(f.path+': '+(o.error||r.status))}bytes+=u8.length;tick(f)}
    S.ui.ai.busy=null;S.ui.ai.busyN=null;progRender();S.ui.ofSaved={dir:bo.dir,n:plan.files.length,at:Date.now(),mode:plan.mode};toast(plan.files.length+' files written to '+bo.dir+' ('+kb(bytes)+', '+Math.round((Date.now()-t0)/1000)+' s)','ok');return true}
  if(how==='zip'){const name=(pesName((S.settings.ofPkg||{}).name)||'option-file')+(plan.mode==='full'?'_full':'_changes_'+new Date().toISOString().slice(0,10))+'.zip';
    if(window.showSaveFilePicker){let h;try{h=await window.showSaveFilePicker({suggestedName:name,types:[{description:'ZIP',accept:{'application/zip':['.zip']}}]})}catch(e){if(e.name==='AbortError')return false;throw e}
      const w=await h.createWritable();const z=zipWriter(async u8=>{await w.write(u8)});
      try{for await(const {f,u8} of ofContents(plan)){await z.add(f.path,u8);bytes+=u8.length;tick(f)}await z.end();await w.close()}catch(e){try{await w.abort()}catch(_){}throw e}}
    else{if(plan.size>400*1048576)throw new Error('This browser can only build ZIPs up to about 400 MB in memory. Use Chrome or Edge on a computer, or "Write to a folder".');
      const z=new JSZip();for await(const {f,u8} of ofContents(plan)){z.file(f.path,u8,{compression:'STORE'});bytes+=u8.length;tick(f)}
      const dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;await dl.save({filename:name,data:await z.generateAsync({type:'blob'})})}}
  else{if(!window.showDirectoryPicker)throw new Error('This browser can\'t write folders. Use Chrome or Edge on a computer, or save a ZIP.');let dir;
    try{dir=await window.showDirectoryPicker({id:'pes21of',mode:'readwrite'})}catch(e){if(e.name==='AbortError')return false;throw e}
    for await(const {f,u8} of ofContents(plan)){const parts=f.path.split('/');let d=dir;for(const s of parts.slice(0,-1))d=await d.getDirectoryHandle(s,{create:true});
      const w=await (await d.getFileHandle(parts[parts.length-1],{create:true})).createWritable();await w.write(u8);await w.close();bytes+=u8.length;tick(f)}}
  S.ui.ai.busy=null;S.ui.ai.busyN=null;progRender();toast(plan.files.length+' files written ('+kb(bytes)+', '+Math.round((Date.now()-t0)/1000)+' s)','ok');return true}

/* ---- the Option file page ---- */
VIEWS.optionfile=()=>{const pk=S.settings.ofPkg;const st=S.ui.of||(S.ui.of={});if(!st.loaded&&ofAvailable()){st.loaded=true;ofApi('packages').then(o=>{st.list=o.packages;st.online=o.online;rerender()}).catch(e=>{st.err=e.message;rerender()})}
  const list=st.list||[];const plan=st.plan;
  return `<h1>Option file</h1><p class="sub">A published option file is the model for this studio: the project is built from its own team and competition files and images, and exports give back the same file set, folder for folder and name for name. <b>First install</b> writes every file; after that, <b>Changes only</b> writes just what you changed, at the same paths.</p>
  ${ofAvailable()?'':'<div class="warnbox">Option files are handled by the site\'s server: open the studio from start.bat or the website.</div>'}${st.err?`<div class="warnbox">${esc(st.err)}</div>`:''}
  <div class="grid g2"><div class="card"><h3>1 · Package</h3>${list.length?`<table><tbody>${list.map(p=>`<tr><td><b>${esc(p.name)}</b><div class="small muted">${kb(p.size||0)}${p.files?' · '+p.files+' files':''}</div></td><td>${pk&&pk.id===p.id?'<span class="tag t-add">in use</span>':''}${p.baseline?' <span class="tag t-upd">site baseline</span>':''}${p.site&&!p.baseline&&!isGuest()&&!isMember()?' <button class="sm ghost" data-act="ofSetBase" data-id="'+esc(p.id)+'">Make it the site baseline</button>':''}</td><td style="text-align:right"><button class="sm ${pk&&pk.id===p.id?'':'primary'}" data-act="ofBuild" data-id="${esc(p.id)}" data-name="${esc(p.name)}">${pk&&pk.id===p.id?'Rebuild from it':'Build the project from it'}</button></td></tr>`).join('')}</tbody></table>`:'<p class="small muted">No package yet.</p>'}
    ${`<div class="warnbox" style="margin-top:10px">${OF_IMPORT_FIRST}</div><div class="row" style="margin-top:10px"><label class="chip on" style="cursor:pointer;padding:7px 14px"><input type="file" id="of-file" accept=".zip" style="display:none">Upload an option file (.zip)</label></div><p class="small muted">${st.online?(isMember()?'It goes into your own private storage (only you can see or use it), sent in parts so even a 3 GB option file uploads; keep the page open until it says it\'s added.':'It is sent in parts and joined in the site\'s storage, so even a 3 GB option file uploads; keep the page open until it says it\'s added.'):'Or put the ZIP in this folder\'s <code>data/optionfiles</code>; it shows up here.'}</p>`}${st.online&&!isMember()?`<label class="f" style="margin-top:10px">Or add a package already in the site's Cloud Storage bucket<input id="of-obj" type="text" placeholder="public/PES21 Option File 26-27.zip"></label><div class="row" style="margin-top:6px"><button class="sm" data-act="ofRegister">Add package</button></div><p class="small muted">Upload the ZIP in the Cloud Storage console (bucket of this site), then add it here by its path. Only owner accounts open the site's packages; everyone else sees only their own uploads.</p>`
      :''}</div>
   <div class="card"><h3>2 · Build the project</h3><p class="small">The package comes first: its teams (names, players, real game player IDs and ratings), kits, crests, manager photos and competition files replace the project's; teams and data it doesn't have stay as they are. A snapshot is saved first.</p>
    ${pk?`<p class="small">In use: <b>${esc(pk.name)}</b>, built ${fmtDate(pk.builtAt)}. ${teamsArr().filter(t=>t.of).length} teams and ${compsArr().filter(c=>c.of&&c.of.ced).length} competition files come from it.</p>`:'<p class="small muted">Not built yet.</p>'}</div></div>
  ${pk?`<h2>3 · Export</h2>${ofPendingHTML()}
   <div class="card" style="margin-bottom:12px"><h3 style="margin-top:0">Options <span class="small muted" style="font-weight:400">for both exports below: First install and Changes only</span></h3>
   <label class="c small" style="margin-bottom:10px"><input type="checkbox" data-act="ofExtra" ${S.settings.ofExtra===false?'':'checked'}> <span>Also write the project's teams and competitions the option file doesn't have <span class="muted">(${(()=>{const nt=teamsArr().filter(t=>!t.of&&!t.sameAs).length,nc=compsArr().filter(c=>!c.of&&c.ced&&c.ced.b64).length;return nt+' team'+(nt===1?'':'s')+', '+nc+' competition'+(nc===1?'':'s')})()}; each in its league's own folder. Off: they are left out, and the notes say so)</span></span></label>
   <label class="c small" style="margin-bottom:10px"><input type="checkbox" data-act="ofNoOrphans" ${S.settings.ofNoOrphans===false?'':'checked'}> <span>Don't include images named by no file <span class="muted">(images of the option file that no team or competition file names; the game never shows them)</span></span></label>
   <label class="c small" style="margin-bottom:10px"><input type="checkbox" data-act="ofNoSecond" ${S.settings.ofNoSecond?'checked':''}> <span>Don't write a team's second team file <span class="muted">(${(()=>{const n=typeof ofTwoFiles==='function'?ofTwoFiles().length:0;return n+' team'+(n===1?' has':'s have')})()} two team files for the same slot in the option file. Off: both are written with the team's data, as the option file has them. Ticked: only the first is written, and a Changes only export lists the second as a file to delete from your installed copy. Whether the game needs the second file is not tested yet: Health check → Teams with two team files)</span></span></label>
   <label class="c small"><input type="checkbox" data-act="ofNewPlayers" ${S.settings.ofNewPlayers?'checked':''}> <span>Also write players no game file has <span class="muted">(off: they are left out and listed in the notes. The game never creates a player from a team file and refuses a team that lists one it doesn't have; tick only for IDs the game already has, such as unregistered players)</span></span></label></div>
   <div class="grid g2">
   <div class="card"><h3>First install: the complete file set</h3><p class="small">Every file of the package's main USB folder at its own path (${(()=>{const m=OF_MAN.get(pk.id);if(!m)return 'all';const sc=ofScope(m);return m.filter(e=>sc.inScope(e.path)).length})()} files); files of teams you edited are rebuilt from their originals, teams or competitions you deleted and second files for one team slot are left out, and new teams go into their league's own folder. One USB folder: copy it to your drive as before.</p>
    ${ofSizeHTML('full')}<div class="row"><button data-act="ofPlan" data-mode="full">Check the file set</button><button class="gold" data-act="ofGo" data-mode="full" data-how="zip">Save as ZIP</button><button data-act="ofGo" data-mode="full" data-how="dir">Write to a folder</button>${LOCAL_SAVE?`<button data-act="ofGo" data-mode="full" data-how="local" title="The studio's own server writes the files into ${esc(LOCAL_SAVE.dir)}. Use it where the browser can't open a save dialog.">Save on this computer</button>`:''}</div>${LOCAL_SAVE&&S.ui.ofSaved&&S.ui.ofSaved.mode==='full'?`<p class="small" style="margin:8px 0 0">Last saved on this computer: <b>${S.ui.ofSaved.n} files</b> in <code style="word-break:break-all">${esc(S.ui.ofSaved.dir)}</code> (${fmtDate(S.ui.ofSaved.at)}).</p>`:''}</div>
   <div class="card"><h3>Changes only</h3><p class="small">Only the files that changed since the baseline${S.settings.ofInstalled?` (the export of ${fmtDate(S.settings.ofInstalled.at)} you confirmed)`:' (none confirmed yet: compared with the option file)'}, at the same paths, plus CHANGES.txt, which also lists files to delete from your installed copy. Copy them over the installed folder.</p>
    ${ofSizeHTML('changes')}<div class="row"><button data-act="ofPlan" data-mode="changes">Check the changes</button><button class="gold" data-act="ofGo" data-mode="changes" data-how="zip">Save as ZIP</button><button data-act="ofGo" data-mode="changes" data-how="dir">Write to a folder</button>${LOCAL_SAVE?`<button data-act="ofGo" data-mode="changes" data-how="local" title="The studio's own server writes the files into ${esc(LOCAL_SAVE.dir)}. Use it where the browser can't open a save dialog.">Save on this computer</button>`:''}</div>${LOCAL_SAVE&&S.ui.ofSaved&&S.ui.ofSaved.mode==='changes'?`<p class="small" style="margin:8px 0 0">Last saved on this computer: <b>${S.ui.ofSaved.n} files</b> in <code style="word-break:break-all">${esc(S.ui.ofSaved.dir)}</code> (${fmtDate(S.ui.ofSaved.at)}).</p>`:''}</div></div>
  ${plan?ofPlanHTML(plan):''}`:''}
  <h2>The rule</h2><div class="card small"><p>The option file's layout is the benchmark: <code>USB 1/WEPES/&lt;part&gt;/&lt;NN. League&gt;/Teds/*.ted</code> and <code>…/Images/&lt;CLUB&gt;/*.png</code>, <code>00. Competitions/*.ced</code> and <code>Logos</code>, and the extras at the top. Exports are one USB folder, the option file's main part, with its folders and names; add-on parts (<code>USB 2</code>, <code>USB 3</code>) reuse its team slots and competition IDs and are left out. Unedited files are copied byte for byte; an edited image replaces the file of the same name, so team files keep pointing at it. A file goes only when its team or competition was deleted, or when a later part has a file for the same team slot. The game imports all files of a kind at once (team files, then competition files, then images) and links them by the names inside them: Import Team with "Overwrite image files of the same name" and "Apply player and squad data", then Import Competition.</p></div>`};
function ofPlanHTML(p){const reps=p.files.filter(f=>f.data);const gone=(p.mode==='full'?p.removed:p.removedNow)||[];return `<div class="card hl" style="margin-top:12px"><div class="row"><b>${p.mode==='full'?'First install':'Changes only'}: ${p.files.length} files · ${kb(p.size)}</b><span class="spacer"></span><span class="small">${p.teams.length} teams changed · ${p.replaced} package files rebuilt · ${p.added.length} new files</span></div>
  <p class="small" style="margin:8px 0 0">One USB folder: <b>${esc(p.scope.main)}</b>${p.scope.others.length?' · left out: '+esc(p.scope.others.join(', '))+' (add-ons that reuse its team slots and competition IDs)':''}.</p>
  ${gone.length?`<details style="margin-top:8px"><summary class="small" style="cursor:pointer">${gone.length} package files left out${p.mode==='changes'?' (CHANGES.txt says to delete them from your installed copy)':''}: deleted teams or competitions, and second files for one team slot</summary><div class="small muted" style="max-height:220px;overflow:auto">${gone.slice(0,400).map(esc).join('<br>')}</div></details>`:''}
  ${p.orphans&&p.orphans.length?`<details style="margin-top:8px"><summary class="small" style="cursor:pointer">${p.orphans.length} images named by no file left out ("Don't include images named by no file" is on)</summary><div class="small muted" style="max-height:220px;overflow:auto">${p.orphans.slice(0,400).map(esc).join('<br>')}</div></details>`:''}
  ${p.mode==='full'?`<p class="small" style="margin:8px 0 0">${p.missing.length?`<b style="color:var(--bad)">${p.missing.length} package files missing</b>`:'<b style="color:var(--good,#30a46c)">Layout check passed:</b> every package file is in place, at its own path.'}${p.added.length?' New files: '+esc(p.added.slice(0,6).join(', '))+(p.added.length>6?'…':''):''}</p>`:''}
  ${reps.length?`<details style="margin-top:8px"><summary class="small" style="cursor:pointer">Rebuilt or new files (${reps.length})</summary><div class="small muted" style="max-height:220px;overflow:auto">${reps.slice(0,400).map(f=>esc(f.path)+' <i>('+esc(f.why)+')</i>').join('<br>')}</div></details>`:''}
  ${p.notes.length?`<details class="warnbox" style="margin-top:8px"><summary>${p.notes.length} notes</summary>${p.notes.slice(0,100).map(esc).join('<br>')}</details>`:''}</div>${ofSpaceHTML(p)}`}
ACT.ofRegister=async()=>{const v=($('#of-obj')||{}).value||'';try{await miniBusy('Reading the package…',async()=>{const o=await ofApi('register',{method:'POST',headers:{'Content-Type':'application/json','X-Studio':'1'},body:JSON.stringify({object:v.trim()})});toast('Package added: '+o.package.name+' ('+o.package.files+' files)','ok')});S.ui.of={};rerender()}catch(e){toast(e.message,'err')}};
// shown wherever a user uploads their own option file: import it into the game first, then export changes only
const OF_IMPORT_FIRST=`<b>Important:</b> before you start editing your option file, make sure it is already imported into the game, to save time downloading. You will still be able to export the whole option file from this app when you finish editing, but it is better to export <b>changes only</b> while the rest of the files are already in the game.`;
document.addEventListener('change',async e=>{if(e.target&&e.target.id==='of-file'&&e.target.files[0]){const f=e.target.files[0];
  if(!await ask('Upload '+f.name+'?',OF_IMPORT_FIRST,'Upload')){e.target.value='';return}
  try{e.target.value='';await miniBusy('Uploading '+f.name+' ('+kb(f.size)+')…',async()=>{await ofUploadPackage(f)});toast('Package added','ok');S.ui.of={};rerender()}catch(err){toast(err.message,'err')}}});
ACT.ofBuild=async el=>{const id=el.dataset.id,name=el.dataset.name;const pend=S.settings.ofPending;
  if(pend&&!await ask('An export is waiting for your confirmation',`The export of <b>${fmtDate(pend.at)}</b> hasn't been confirmed as imported in PES. Building from a package starts over and deletes the project's teams with the package's own data, so the changes in that export would be lost from the project. Confirm or forget it first, unless you mean to start again.`,'Build anyway',true))return;
  await startFresh(id,name)};
ACT.ofPlan=async el=>{try{await miniBusy('Checking the file set…',async()=>{S.ui.of.plan=await ofPlan(el.dataset.mode);ofEstSet(S.ui.of.plan)});rerender()}catch(e){toast(e.message,'err')}};
ACT.ofGo=async el=>{const mode=el.dataset.mode,how=el.dataset.how;let plan;try{await miniBusy('Preparing the files…',async()=>{plan=await ofPlan(mode)})}catch(e){toast(e.message,'err');return}
  S.ui.of.plan=plan;ofEstSet(plan);rerender();if(!plan.files.length){toast('Nothing changed since the last install','ok');return}if(plan.missing.length){toast(plan.missing.length+' package files are missing; not written','err');return}
  const pend=S.settings.ofPending;
  if(!await ask(mode==='full'?'Write the complete file set?':'Write the changes?',`<b>${plan.files.length}</b> files, <b>${kb(plan.size)}</b>${plan.teams.length?', with '+plan.teams.length+' changed teams':''}, in one <b>${esc(plan.scope.main)}</b> folder.${plan.orphans.length?' '+plan.orphans.length+' images named by no file are left out.':''}<br><br>The current baseline stays until you confirm, on this page, that PES imported this export.${pend?' This export replaces the one of '+fmtDate(pend.at)+', which you haven\'t confirmed.':''}`,how==='zip'?'Save ZIP':how==='local'?'Save on this computer':'Choose folder'))return;
  try{const ok=await ofWrite(plan,how);if(ok){await ofSetPending(plan);toast('Import it in PES, then confirm it here, on Export Option File','ok');rerender()}
    else toast('Nothing was saved: the save dialog was closed, or it can\'t open in this browser.'+(LOCAL_SAVE?' Use "Save on this computer" instead.':' Try Chrome or Edge.'),'err')}catch(e){S.ui.ai.busy=null;S.ui.ai.busyN=null;progRender();toast('Writing stopped: '+e.message,'err')}};
ACT.ofSetBase=async el=>{if(!await ask('Make it the site baseline?','Every visitor and account then starts from this option file, and projects built from another one are told a different option file is the baseline.','Make it the baseline'))return;
  try{await ofApi('baseline',{method:'POST',headers:{'Content-Type':'application/json','X-Studio':'1'},body:JSON.stringify({pkg:el.dataset.id})});S.ui.of={};S.ui.blInfo=null;toast('Site baseline set','ok')}catch(e){toast(e.message,'err')}rerender()};
// the export options apply to both exports: changing one drops the checked plan, both boxes' size estimates and the file-set
// status, so First install and Changes only are both worked out again with it
const ofOptSet=(k,v)=>{S.settings[k]=v;saveSettings();if(S.ui.of)S.ui.of.plan=null;S.ui.ofEst=null;if(S.ui.tocSt){delete S.ui.tocSt.full;delete S.ui.tocSt.changes}setTimeout(rerender,0)};
ACT.ofExtra=el=>ofOptSet('ofExtra',el.checked);
ACT.ofNewPlayers=el=>ofOptSet('ofNewPlayers',el.checked);
ACT.ofNoOrphans=el=>ofOptSet('ofNoOrphans',el.checked);
ACT.ofNoSecond=el=>ofOptSet('ofNoSecond',el.checked);
// the export's file size on each card, from a dry plan (nothing is built; a rebuilt file counts as its package original) until a
// real check or export gives the exact size. Worked out again each time the page is opened or an export option changes.
function ofSizeHTML(mode){const pk=S.settings.ofPkg;if(!pk)return'';const E=S.ui.ofEst||(S.ui.ofEst={});const r=E[mode];
  if(!r||r.pkg!==pk.id){if(!E['busy_'+mode]){E['busy_'+mode]=true;ofPlan(mode,{dry:true}).then(p=>{E[mode]={pkg:p.pkg,n:p.files.length,size:p.size,orph:p.orphans.length,exact:false}}).catch(e=>{E[mode]={pkg:pk.id,err:e.message}}).finally(()=>{E['busy_'+mode]=false;if(location.hash==='#optionfile')rerender()})}
    return '<p class="small muted" style="margin:0 0 8px">Export size: working it out…</p>'}
  if(r.err)return `<p class="small muted" style="margin:0 0 8px">Export size: couldn't work it out (${esc(r.err)})</p>`;
  return `<p class="small" style="margin:0 0 8px">Export size: <b>${r.exact?'':'about '}${kb(r.size)}</b> · ${r.n} files${r.orph?` <span class="muted">(${r.orph} images named by no file left out)</span>`:''}</p>`}
const ofEstSet=p=>{const E=S.ui.ofEst||(S.ui.ofEst={});E[p.mode]={pkg:p.pkg,n:p.files.length,size:p.size,orph:(p.orphans||[]).length,exact:true}};
window.addEventListener('hashchange',()=>{if(location.hash==='#optionfile')S.ui.ofEst=null});
// the baseline moves to an export only when you say PES imported it, after two warnings; until then the previous one stays
ACT.ofConfirm=async()=>{const p=S.settings.ofPending;if(!p)return;
  if(!await ask('Did PES import this export?',`Confirm only when PES 2021 has imported the export of <b>${fmtDate(p.at)}</b> (${p.files} files) without errors: Import Team for the team files, Import Competition for the competition files, and the images. Check a few teams in Edit first.<br><br>Until you confirm, the previous ${S.settings.ofInstalled?'export':'option file'} stays the baseline and <b>Changes only</b> still compares with it.`,'Yes, PES imported it'))return;
  // edits made after this export aren't in it: they stay changes (the next Changes only writes them)
  let later=0;const snap=p.snap&&S.snaps[p.snap]?await loadSnap(p.snap).catch(()=>null):null;if(snap)later=diffCount(diffData(snap,currentData()));
  if(!await ask('Make this export the new baseline?',`The whole project is rebased on this export: <b>Changes only</b> compares with it${p.removed&&p.removed.length?', and the '+p.removed.length+' files it left out count as removed from your installed copy':''}, and the changes since the baseline (Summary, Partial Export) start again from it. ${later?`<b>${later} edit${later===1?'':'s'} made after this export ${later===1?'isn\'t':'aren\'t'} in it</b> and stay${later===1?'s':''} a change for the next export.`:'With no edits since, <b>Changes only</b> then has nothing to export.'}<br><br><b>Keep your copy of the previous option file</b>, and the files you just imported, until you are sure everything works in the game. The game can't undo an import.`,'Make it the baseline',true))return;
  try{const b=await Store.getBlob(p.ref);if(!b)throw new Error('the record of what this export wrote is missing');const marks=JSON.parse(await b.text());
    await takeSnapshot('Before making the export of '+fmtDate(p.at)+' the baseline',true);ofApplyInstall(p,marks);Store.delBlob(p.ref);
    // the project's baseline: the project as it was exported (or as it is now, for an export recorded before snapshots were kept)
    if(!snap)ofDropSnap(p.snap);const sn=snap?S.snaps[p.snap]:await takeSnapshot('Baseline: export of '+fmtDate(p.at)+' imported in PES',true);sn.auto=false;sn.name='Baseline: export of '+fmtDate(p.at)+' imported in PES';Store.put('snaps',sn);
    S.settings.baseline=sn.id;S.settings.baselineAt=p.at;S.ui.blInfo=null;saveSettings();if(S.ui.tocSt){delete S.ui.tocSt.full;delete S.ui.tocSt.changes}if(S.ui.of)S.ui.of.plan=null;
    toast('The export of '+fmtDate(p.at)+' is the new baseline'+(later?'; '+later+' later edit'+(later===1?' stays a change':'s stay changes'):''),'ok')}
  catch(e){toast('Not confirmed: '+e.message,'err')}rerender()};
ACT.ofDiscard=async()=>{const p=S.settings.ofPending;if(!p)return;
  if(!await ask('Forget this export?',`For an export that didn't import correctly or that you won't use. The previous ${S.settings.ofInstalled?'export':'option file'} stays the baseline, and the next export includes the same changes again.`,'Forget it',true))return;
  if(p.ref)Store.delBlob(p.ref);ofDropSnap(p.snap);S.settings.ofPending=null;saveSettings();rerender()};
function ofPendingHTML(){const p=S.settings.ofPending,i=S.settings.ofInstalled;
  const base=i?`the export of ${fmtDate(i.at)}`:'the option file itself';
  if(!p)return `<p class="small muted">Baseline: ${base}${i?', confirmed as imported in PES':''}. <b>Changes only</b> compares with it.</p>`;
  return `<div class="warnbox" style="margin-bottom:12px"><b>Waiting for your confirmation.</b> The ${p.mode==='full'?'first install':'changes'} exported ${fmtDate(p.at)} (${p.files} files${p.teams?', '+p.teams+' teams':''}) isn't the baseline yet: ${base} still is. Import it in PES 2021, check it, then confirm: the whole project is then rebased on it. Until you do, you can export <b>Changes only</b> again as often as you like; each export has every change since ${base} and replaces this one. Don't delete the previous option file or your installed copy before that.
    <div class="row" style="margin-top:8px"><button class="sm primary" data-act="ofConfirm">PES imported it: make it the baseline</button><button class="sm" data-act="ofDiscard">It didn't import: forget it</button></div></div>`}
