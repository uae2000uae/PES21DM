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
// kind 'source': an option file imported into the project and kept for its rebuilds (never the site's baseline)
async function ofUploadPackage(f,kind){const K=kind?'&kind='+encodeURIComponent(kind):'';
  if(!await ofIsOnline()){busyCount(0,1,'Uploading '+f.name+' ('+kb(f.size)+')…');const o=await ofApi('upload?name='+encodeURIComponent(f.name)+K,{method:'POST',headers:{'X-Studio':'1','Content-Type':'application/zip'},body:f});busyCount(1,1);return (o.packages||[])[0]||null}
  const PART=24*1048576,total=Math.max(1,Math.ceil(f.size/PART));const up=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');let res=null;
  for(let n=0;n<total;n++){busyCount(n*PART,f.size,n===total-1?'Joining the parts and reading the package…':'Uploading '+f.name+': part '+(n+1)+' of '+total+' ('+kb(Math.min(f.size,(n+1)*PART))+' of '+kb(f.size)+')');
    for(let tries=0;;tries++){try{res=await ofApi('upload-part?'+new URLSearchParams(Object.assign({up,part:n,of:total,name:f.name},kind?{kind}:{})),{method:'POST',headers:{'X-Studio':'1','Content-Type':'application/octet-stream'},body:f.slice(n*PART,(n+1)*PART)});break}
      catch(e){if(tries>=2)throw new Error('part '+(n+1)+' of '+total+' failed after 3 tries: '+e.message);await sleep(2000*(tries+1))}}}
  busyCount(f.size,f.size);return res&&res.package||null}
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
/* ================= Option files are files and their links (docs/DATABASE_RULES.md 5a; the user, 2026-11-23) =================
   "Option File export must not track installs by the option file's own paths, only using code. Baseline option file must not
   include folders in the first place. The system only reads files and their links."
   Read: team files (.ted) and competition files (.ced) with the images they name, an image found by its name anywhere in the
   option file. Folders, parts and USB folders are never looked at; a file no game file names is not read. One team per team
   code and one competition per competition code (the last in file-name order, unless you picked another in the Health check);
   one picture per image name (the first found, unless you picked another). Installs are tracked by code and image name. */
// export-relevant state of a team: what its file would hold
function ofHash(t){const p=(t.players||[]).map(p=>[p.name,p.shirtName,p.number,p.pos,p.age,p.height,p.weight,p.foot,p.style,p.wfUsage,p.wfAcc,p.form,p.injury,p.skills,p.comStyles,p.playables,p.attrs,p.ted&&p.ted.pid]);
  return String(fnv(JSON.stringify([t.name,t.short,t.stadium,t.manager&&t.manager.name,p,t.emblem,t.managerPhoto,(t.kits||[]).map(k=>[k.slot,k.img]),t.stadiumImg||'',spOf(t),...(t.of&&t.of.cleared&&Object.keys(t.of.cleared).length?[Object.keys(t.of.cleared).sort()]:[])])))}
const ofImgState=t=>({emblem:t.emblem||'',manager:t.managerPhoto||'',kits:OF_KIT_SLOT.map(s=>((t.kits||[]).find(k=>k.slot===s)||{}).img||'')});
function ofCompHash(c){return String(fnv(JSON.stringify([c.name,c.emblem,...(c.codeSet&&+c.gameId?[+c.gameId]:[])])))}
const ofBase=p=>String(p||'').split('/').pop();
const ofIsImg=p=>/\.(png|jpe?g)$/i.test(p);
const OF_GF=new Map();async function ofGameFiles(pkg){if(!OF_GF.has(pkg))OF_GF.set(pkg,(await ofApi('gamefiles?pkg='+encodeURIComponent(pkg))).files);return OF_GF.get(pkg)}
// the option files the project is built from, in order: the base first, then each one imported since (settings.ofSources), with
// the codes its new clubs were given when it was installed
function ofSources(){const pk=S.settings.ofPkg;const L=(S.settings.ofSources||[]).filter(x=>x&&x.id&&(!pk||x.id!==pk.id));return pk?[{id:pk.id,name:pk.name,codes:{},ccodes:{}}].concat(L):L}
// every source's team files by code, competition files by code and images by name (lower case). Nothing about where they sit.
const OF_RD={key:'',r:null};
async function ofRead(only){const srcs=only||ofSources();const key=srcs.map(s=>s.id+':'+JSON.stringify(s.codes||{})+JSON.stringify(s.ccodes||{})).join('|');if(!only&&OF_RD.r&&OF_RD.key===key)return OF_RD.r;
  const T=new Map(),C=new Map(),I=new Map();
  for(const src of srcs){const man=await ofManifest(src.id);const gf=await ofGameFiles(src.id);const codes=src.codes||{},ccodes=src.ccodes||{};
    man.forEach(e=>{if(!ofIsImg(e.path))return;const nm=ofBase(e.path);const k=nm.toLowerCase();(I.get(k)||I.set(k,[]).get(k)).push({name:nm,ref:ofRef(src.id,e.path),size:+e.size||0,src:src.id})});
    Object.keys(gf).sort((a,b)=>ofBase(a).toLowerCase().localeCompare(ofBase(b).toLowerCase())).forEach(path=>{const b64=gf[path],file=ofBase(path),ref=ofRef(src.id,path);
      try{const raw=TED.unb64(b64);
        if(/\.ted$/i.test(path)){const P=TED.parse(raw);const code=+codes[P.team.teamId]||P.team.teamId;if(code<0)return;(T.get(code)||T.set(code,[]).get(code)).push({src:src.id,srcName:src.name,file,ref,b64,P,names:ofNames(TED.decrypt(raw)),code,fileCode:P.team.teamId})}
        else if(/\.ced$/i.test(path)){const X=CED.parse(raw);const code=+ccodes[X.compId]||X.compId;if(code<0)return;(C.get(code)||C.set(code,[]).get(code)).push({src:src.id,srcName:src.name,file,ref,b64,C:X,code,fileCode:X.compId})}}
      catch(err){aiLog('  '+file+': '+err.message)}})}
  if(only)return{T,C,I};OF_RD.key=key;OF_RD.r={T,C,I};return OF_RD.r}
// the file used for a code: the one picked in the Health check, else the last (sources in order, within one by file name)
const ofPickOf=(L,key)=>{const want=(S.settings[key]||{})[L[0].code];return L.find(x=>want&&x.src+'|'+x.file===want)||L[L.length-1]};
// the picture used for an image name: the one picked in the Health check, else the latest option file's (an option file imported
// later replaces the pictures of the same name, as importing it into the game does), the first found in it
const ofImgOf=(R,name)=>{const L=R.I.get(String(name||'').toLowerCase());if(!L)return null;const want=(S.settings.ofImgPick||{})[L[0].name.toLowerCase()];const last=L[L.length-1].src;return L.find(x=>x.ref===want)||L.find(x=>x.src===last)};
// Health check: a code with more than one file, or an image name with more than one picture (different sizes), in the same option
// file (a later option file's file or picture simply replaces an earlier one's)
const ofCodeClashes=R=>[...R.T].map(([code,L])=>{const last=L[L.length-1].src;const same=L.filter(x=>x.src===last);return same.length>1?{code,files:same,use:ofPickOf(L,'ofPick')}:null}).filter(Boolean);
const ofImgClashes=R=>[...R.I].map(([k,L])=>{const last=L[L.length-1].src;const same=L.filter(x=>x.src===last);return new Set(same.map(x=>x.size)).size>1?{name:same[0].name,pics:same,use:ofImgOf(R,k)}:null}).filter(Boolean);

// image records for the pictures a file names: one record per picture, made once (an existing one is reused)
function ofImgMaker(R){const ids=new Map();Object.values(S.images).forEach(i=>{if(isOfRef(i.ref))ids.set(i.ref,i.id)});
  return(name,kind,label)=>{const x=name&&ofImgOf(R,name);if(!x)return'';if(ids.has(x.ref))return ids.get(x.ref);
    const sz=kindSize(kind)||[256,256];const rec={id:uid(),kind,name:(label||x.name).replace(/\.[a-z0-9]+$/i,'').slice(0,60),ref:x.ref,w:kind==='kit'?2048:sz[0],h:kind==='kit'?2048:sz[1],size:x.size,createdAt:Date.now(),ofName:x.name};
    saveImage(rec);ids.set(x.ref,rec.id);return rec.id}}
// a team as its file has it: name, short name, stadium, coach, players with their game IDs, and the images the file names
function ofTeamFromFile(x,f,img,code){const P=f.P;x.name=P.team.name||x.name;x.short=(P.team.short||shortName(x.name)).toUpperCase().slice(0,3);if(P.team.stadium)x.stadium=P.team.stadium;
  x.manager=Object.assign(x.manager||{name:'',nat:'',age:''},{name:P.team.coach||''});x.gameId=code;if(code!==f.fileCode)x.codeSet=true;
  x.players=P.players.map(tp=>{const p=tedPlayerToStudio(tp,code);if(validGameId(tp.pid))p.gameId=tp.pid;return p});
  const n=f.names;x.emblem=img(n.emblem,'emblem',x.name+' crest');x.managerPhoto=img(n.manager,'manager',x.manager.name||x.name+' manager');x.kits=[];
  n.kits.forEach((nm,k)=>{const id=img(nm,'kit',x.name+' '+OF_KIT_SLOT[k]);if(!id)return;const kit=newKit(OF_KIT_SLOT[k]);kit.img=id;x.kits.push(kit)});
  x.stadiumImg=img(n.stadium,'stadium',x.name+' stadium');x.sponsorImgs=[n.sp1,n.sp2,n.sp3].map((nm,i)=>img(nm,'sponsor',x.name+' board '+(i+1)));
  x.of=Object.assign({},x.of&&x.of.hash?{hash:x.of.hash,img0:x.of.img0}:{},{src:f.src,file:f.file,names:n,code});
  S.teds[x.id]={id:x.id,tedTeamId:f.fileCode,file:f.file,ref:f.ref,scheme:P.scheme,origName:P.team.name,emblemFile:n.emblem,at:Date.now()};Store.put('teds',S.teds[x.id]);TED_CACHE.set(f.ref,f.b64)}
/* ---- build the project from the option file and every option file imported since, into an empty project ---- */
async function ofBuild(pkg,label,extra){
  if(teamsArr().length)throw new Error('a build starts from an empty project; start over from the option file instead');
  S.settings.ofPkg={id:pkg,name:label,builtAt:Date.now()};S.settings.ofSources=(extra||[]).filter(x=>x&&x.id&&x.id!==pkg);saveSettings();OF_RD.r=null;
  const srcs=ofSources();aiLog('Option file: reading '+srcs.map(s=>s.name).join(', ')+'…');await pes21Teams().catch(()=>{});
  const R=await ofRead();
  const img=ofImgMaker(R);const touched=[];const base={teams:{},comps:{}};
  for(const [code,L] of R.T){const f=ofPickOf(L,'ofPick');const x=newTeam({name:f.P.team.name,players:[],kits:[]});ofTeamFromFile(x,f,img,code);base.teams[code]=x.name;touched.push(x)}
  let cedN=0;
  for(const [code,L] of R.C){const f=ofPickOf(L,'ofCPick');const X=f.C;const c=newComp({name:X.name,type:CUP_RE.test(X.name)?'Cup':'League'});
    c.ced={b64:f.b64,compId:f.fileCode,file:f.file,emblemFile:X.emblemFile,origName:X.name,at:Date.now()};c.gameId=String(code);if(code!==f.fileCode)c.codeSet=true;
    c.emblem=img(X.emblemFile,'comp',X.name+' logo');c.of={src:f.src,file:f.file,ref:f.ref,names:{emblem:X.emblemFile},code};c.of.hash=ofCompHash(c);saveComp(c);base.comps[code]=c.name;cedN++}
  // clubs: in the league of their team code in the game; national teams join the World Cup (rule book "Competitions come from
  // game files")
  const wc=compsArr().find(c=>c.worldCup);
  touched.forEach(x=>{const key=slotLeagueOf(+x.gameId);
    if(/^national-teams/.test(key)){if(wc&&!(wc.teams||[]).includes(x.id)){wc.teams=(wc.teams||[]).concat(x.id);saveComp(wc)}return}
    const c=key?slotComp(key,pkg):null;if(c)x.compId=c.id});
  touched.forEach(x=>{x.players.forEach(normPlayer);x.of.hash=ofHash(x);x.of.img0=ofImgState(x);saveTeam(x)});
  S.settings.ofBase=base;S.settings.ofInstalled=null;saveSettings();
  const clashes=ofCodeClashes(R).length,pics=ofImgClashes(R).length;
  aiLog('  '+touched.length+' teams, '+cedN+' competition files, from '+srcs.length+' option file'+(srcs.length===1?'':'s')+(clashes?'; '+clashes+' team codes have two files (Health check)':'')+(pics?'; '+pics+' image names have two pictures (Health check)':''));
  return{matched:0,added:touched.length,ceds:cedN,freed:0,teams:touched.length}}

/* ================= Names by code (docs/DATABASE_RULES.md 5b; the user, 2026-11-23) =================
   "Change competitions ced files to their IDs only and change all ted files to their IDs only. Change all images names to
   codes. Use letters for type and a proper length serial number starting from 0, line the code with the original ted and ced
   files." A team file is <team code>.ted and a competition file <competition code>.ced. An image is a letter for its type and
   a 4-digit number from 0000: E crest, K kit, M manager photo, S stadium, P sponsor board, C competition logo. The coded copy
   numbers them in the order of the original files (team files by code, then each one's crest, kits, manager, stadium and
   boards; competition files by code). A picture several files name keeps one code. New images take the next free number of
   their type, never one the game may still have. */
const IMG_LETTER={emblem:'E',kit:'K',manager:'M',stadium:'S',sponsor:'P',comp:'C'};
const CODE_DIGITS=4;
const codeName=(letter,n,ext)=>letter+String(n).padStart(CODE_DIGITS,'0')+'.'+(ext||'png');
// the next free number of a type: past every coded name the project, its option files, the code book and earlier exports know
function ofNewCode(letter,key){const K=S.settings.newCodes||(S.settings.newCodes={});if(K[key])return K[key];const re=new RegExp('^'+letter+'(\\d+)\\.','i');let max=-1;
  const see=n=>{const m=re.exec(String(n||''));if(m)max=Math.max(max,+m[1])};
  Object.values(S.images).forEach(i=>see(i.ofName));Object.values(K).forEach(see);
  teamsArr().concat(compsArr()).forEach(o=>{const n=o.of&&o.of.names;if(n)[n.emblem,n.manager,n.stadium,n.sp1,n.sp2,n.sp3,...(n.kits||[])].forEach(see)});
  ['team','comp'].forEach(k=>Object.values(codeBook(k)).forEach(e=>codeNameList(e).forEach(see)));Object.values(S.settings.imgCodes||{}).forEach(v=>see(v&&v.name));
  K[key]=codeName(letter,max+1);saveSettings();return K[key]}
const ofImgCode=(id,kind)=>ofNewCode(IMG_LETTER[kind]||'X','img:'+id);

/* ---- the coded copy of an option file: a new package, made on this computer, that becomes the baseline ---- */
async function ofCodedCopy(pkg,label){const R=await ofRead([{id:pkg,name:label}]);
  const serial={},codeOf=new Map(),count={};const files={},copy=[];let blanked=0,dups=0,teams=0,comps=0;
  // a picture's code, given the first time a file names it
  const nameFor=(name,kind)=>{const x=name&&ofImgOf(R,name);if(!x)return'';if(codeOf.has(x.ref))return codeOf.get(x.ref);const L=IMG_LETTER[kind];const n=serial[L]=(serial[L]==null?-1:serial[L])+1;
    const ext=(x.name.match(/\.([a-z0-9]+)$/i)||[,'png'])[1].toLowerCase();const nm=codeName(L,n,ext);codeOf.set(x.ref,nm);count[L]=(count[L]||0)+1;return nm};
  for(const code of [...R.T.keys()].sort((a,b)=>a-b)){const L=R.T.get(code);if(L.length>1)dups++;const f=ofPickOf(L,'ofPick');const raw=TED.unb64(f.b64);const d=TED.decrypt(raw);const n=f.names;const T0=TED.TEAM;
    const slot=(off,name,kind,mark)=>{if(!name)return;const nm=nameFor(name,kind);if(nm)TED.writeStr(d,off,TED.IMGLEN,nm);else{d.fill(0,off,off+TED.IMGLEN);if(mark)mark();blanked++}};
    slot(OF_IMG.emblem,n.emblem,'emblem',()=>TED.writeNum(d,T0+8,2,0xFFFF));
    (n.kits||[]).forEach((nm,k)=>slot(OF_KIT[k],nm,'kit',()=>{const o=OF_KIT[k];d.fill(0,o-20,o)}));
    slot(OF_IMG.manager,n.manager,'manager');slot(OF_IMG.stadium,n.stadium,'stadium',()=>TED.writeNum(d,T0+12,2,0xFFFF));
    ['sp1','sp2','sp3'].forEach(k=>slot(OF_IMG[k],n[k],'sponsor'));
    files['WEPES/'+code+'.ted']=TED.b64(await TED.encrypt(d,raw));teams++}
  for(const code of [...R.C.keys()].sort((a,b)=>a-b)){const f=ofPickOf(R.C.get(code),'ofCPick');const raw=TED.unb64(f.b64);const d=GF.decrypt(raw);
    const logo=nameFor(f.C.emblemFile,'comp');if(!logo&&f.C.emblemFile)blanked++;TED.writeStr(d,CED.EMB,TED.IMGLEN,logo||'');files['WEPES/'+code+'.ced']=TED.b64(await TED.encrypt(d,raw));comps++}
  codeOf.forEach((nm,ref)=>copy.push([ofParse(ref).path,'WEPES/'+nm]));
  const name=pesFold(label+' coded');const o=await ofApi('derive',{method:'POST',headers:{'Content-Type':'application/json','X-Studio':'1'},body:JSON.stringify({pkg,name,files,copy})});
  const e=(o.packages||[])[0];if(!e)throw new Error('the server did not say where it kept the copy');
  return{pkg:e,teams,comps,images:codeOf.size,count,blanked,dups}}
ACT.ofCode=async el=>{const id=el.dataset.id,name=el.dataset.name;
  if(!await ask('Make a coded copy of '+name+'?',`A new option file is made from <b>${esc(name)}</b>, with no folders:<ul class="small"><li>every team file is named by its team code (<code>2473.ted</code>) and every competition file by its code (<code>51.ced</code>); where a code has two team files, the one in use is kept (the last by file name, or your pick in the Health check)</li><li>every image is named by its type and a number from 0000 (E crest, K kit, M manager, S stadium, P sponsor board, C competition logo), numbered in the order of the files, and the team and competition files name the new names</li><li>a name a file gives that the option file has no picture for is blanked: the game shows its own there</li></ul>It becomes this site's baseline, and you can start over from it. <b>In PES 2021 every image then has a new name:</b> delete the imported images in Edit before installing it, or the game's image space fills up.`,'Make the coded copy'))return;
  let r;try{await miniBusy('Making the coded copy of '+name+'…',async()=>{r=await ofCodedCopy(id,name)})}catch(e){toast('The coded copy could not be made: '+e.message,'err');return}
  try{await ofApi('baseline',{method:'POST',headers:{'Content-Type':'application/json','X-Studio':'1'},body:JSON.stringify({pkg:r.pkg.id})})}catch(e){}
  S.ui.of={};aiLog('Coded copy of '+name+': '+r.teams+' team files, '+r.comps+' competition files, '+r.images+' images ('+Object.entries(r.count).map(([k,n])=>k+' '+n).join(', ')+'); '+r.blanked+' names with no picture blanked; '+r.dups+' codes had two team files (one kept)');
  toast('Coded copy made: '+r.teams+' team files, '+r.comps+' competition files, '+r.images+' images. It is the site baseline now: start over from it to use it.','ok');rerender()};

/* ---- the export plan: every team and competition by its code, laid out by competition and team (app-core.js) ---- */
// A team's state as exported: its data, its code and the image names its file gives. A confirmed install keeps one per code.
const ofSig=(t,names)=>String(fnv(JSON.stringify([ofHash(t),+t.gameId,names])));
const ofCSig=(c,logo)=>String(fnv(JSON.stringify([ofCompHash(c),+c.gameId,logo])));
// what the game has, by code and image name: the confirmed install, else the option file as it was built
function ofInstalledState(){const I=S.settings.ofInstalled;return I&&I.teams&&!Array.isArray(I.teams)?I:null}
async function ofPlan(mode,opt={}){const dry=!!opt.dry,EMPTY=new Blob([]);const pk=S.settings.ofPkg;if(!pk)throw new Error('no option file in this project');
  await ensureGameFiles();await pes21Teams().catch(()=>{});
  // team files whose squad the game can't show whole are written again, never copied (Health check → Squads the game can't show whole)
  const BAD=await ofRead().then(R=>ofBadCodes(R)).catch(()=>new Set());
  const full=mode==='full',inst=ofInstalledState(),kitPx=S.settings.kitExport==='1024'?1024:0,W='WEPES/';
  const files=[],notes=[],changed=[],marks={teams:{},comps:{},images:{},names:{}},seen=new Set(),imgBy=new Map();
  const skip={off:[],noFile:[],noCode:[]};
  const put=(path,f)=>{const k=path.toLowerCase();if(seen.has(k))return;seen.add(k);files.push(Object.assign({path,out:path},f))};
  // an image: written when it differs from what the game has under that name (always, for a first install)
  const unchangedImg=(id,nm)=>{const im=S.images[id];if(!im)return true;const k=nm.toLowerCase();
    if(inst)return (inst.images||{})[k]===im.ref;return isOfRef(im.ref)&&String(im.ofName||'').toLowerCase()===k};
  const known=k=>inst?!!(inst.images||{})[k]:Object.values(S.images).some(i=>String(i.ofName||'').toLowerCase()===k);
  const imgOut=async(id,dir,nm,kind,O)=>{const im=S.images[id];if(!im||!nm)return;const k=nm.toLowerCase();marks.images[k]=im.ref;const owner=O.owner;
    const prev=imgBy.get(k);if(prev&&prev!==id&&S.images[prev]&&S.images[prev].ref!==im.ref)notes.push('Two pictures go out under the image name '+nm+' ('+owner+' and another): the game keeps one of them. Give one of them its own name (Game codes → Images)');imgBy.set(k,id);
    if(!full&&unchangedImg(id,nm))return;const resize=kind==='kit'?kitPx:0;
    const st=unchangedImg(id,nm)?'':known(k)?'edited':'added';
    if(isOfRef(im.ref)&&!resize)put(dir+nm,Object.assign({ref:im.ref,size:+im.size||0,why:'image',kind,st},O));
    else put(dir+nm,Object.assign({data:dry?EMPTY:await imgBlobFor(id,resize),size:+im.size||0,why:'image',kind,st},O))};
  for(const t0 of teamsArr()){if(t0.sameAs)continue;const t=typeof ruleView==='function'?ruleView(t0):t0;// as the game will have it (the relay)
    if(t.noCode||!+t.gameId){if(!t.parked&&(t.players||[]).length&&!t.ruleKeepSquad)skip.noCode.push(t.name);continue}
    if(!t.of&&S.settings.ofExtra===false){skip.off.push(t.name);continue}
    const src=teamFileInfo(t);if(!src){skip.noFile.push(t.name);continue}
    const code=+t.gameId;if(!codePlaced('team',t))notes.push(t.name+': code '+code+' is not a team the game has, so the game skips its file on import. Give it a game team\'s code on Game codes');
    const dir=W+compFolder(teamDirComp(t))+'/'+teamFolder(t)+'/',idir=k=>dir+'images/'+IMG_FOLDER[k]+'/';const tag=teamTag(t)||pesName(t.short||t.name);
    // the image names its file gives: its option file's, else the names the game has for this code, else new ones
    const own=(key,k)=>t.of&&t.of.names&&!codeMoved(t)?(key==='kit'?(t.of.names.kits||[])[k]:t.of.names[key])||'':'';
    const nameFor=(key,k,def)=>own(key,k)||((codeImgName(t,key,k)||{}).name)||def();// a new name only when none is known (by code: 5b)
    const names={kits:[]};const nat=isNationalTeam(t);
    if(t.emblem){names.emblem=nameFor('emblem',0,()=>ofImgCode(t.emblem,'emblem'));await imgOut(t.emblem,idir('emblem'),names.emblem,'emblem',{owner:t.name,team:t.id})}
    if(S.images[t.managerPhoto]){names.manager=nameFor('manager',0,()=>ofImgCode(t.managerPhoto,'manager'));await imgOut(t.managerPhoto,idir('manager'),names.manager,'manager',{owner:t.name,team:t.id})}
    if(!nat&&S.images[t.stadiumImg]){names.stadium=nameFor('stadium',0,()=>ofImgCode(t.stadiumImg,'stadium'));await imgOut(t.stadiumImg,idir('stadium'),names.stadium,'stadium',{owner:t.name,team:t.id})}
    for(let i=0;i<3;i++){const id=spOf(t)[i];if(S.images[id]){const key='sp'+(i+1);names[key]=nameFor(key,0,()=>ofImgCode(id,'sponsor'));await imgOut(id,idir('sponsor'),names[key],'sponsor',{owner:t.name,team:t.id})}}
    for(const k of t.kits||[]){const i=OF_KIT_SLOT.indexOf(k.slot);if(i<0)continue;
      if(k.img){names.kits[i]=nameFor('kit',i,()=>ofImgCode(k.img,'kit'));await imgOut(k.img,idir('kit'),names.kits[i],'kit',{owner:t.name,team:t.id})}
      else if(!own('kit',i)){names.kits[i]=nameFor('kit',i,()=>ofNewCode('K','drawn:'+t.id+':'+k.slot));names.drawn=(names.drawn||[]).concat(i)}}
    // the team file: written when its state differs from what the game has for this code
    // a broken file is marked apart, so it goes out once (Changes only too) and not again once that install is confirmed
    const sig0=ofSig(t,names),sig=BAD.has(code)?sig0+'|rebuilt':sig0;marks.teams[code]=sig;marks.names['t'+code]=t.name;
    const was=inst?(inst.teams||{})[code]:(t.of&&t.of.hash===ofHash(t)&&!codeMoved(t)&&+t.of.code===code?sig0:'');
    if(!full&&was===sig)continue;changed.push(t);const tst=full?(!t.of?'added':was===sig?'':'edited'):((inst?(inst.teams||{})[code]:t.of)?'edited':'added');
    for(const i of names.drawn||[]){const k=(t.kits||[]).find(z=>z.slot===OF_KIT_SLOT[i]);put(idir('kit')+names.kits[i],{data:dry?EMPTY:await kitTextureBlob(t,k,kitPx||2048),why:'kit drawn from its colours',kind:'kit',owner:t.name,team:t.id,st:tst||'edited'})}
    const file=code+'.ted';// by its code only (5b)
    const same=t.of&&t.of.hash===ofHash(t)&&!codeMoved(t)&&S.teds[t.id]&&isOfRef(S.teds[t.id].ref)&&+t.of.code===code&&+S.teds[t.id].tedTeamId===code&&!(names.drawn||[]).length&&!BAD.has(code)
      ||!!(t.ruleKeepSquad&&S.teds[t.id]&&isOfRef(S.teds[t.id].ref)&&+S.teds[t.id].tedTeamId===code);// Players ✕: the option file's own file, as it is
    if(BAD.has(code))notes.push(t.name+': its team file is written again, so the game can show its whole squad (repaired on the health check: a player listed once, the squad list rebuilt, a place no file has a record for left out)');
    if(same){put(dir+file,{ref:S.teds[t.id].ref,size:14820,why:'team file',kind:'ted',owner:t.name,team:t.id,code,st:tst});continue}
    if(dry){put(dir+file,{data:EMPTY,size:14820,why:(t.players||[]).length?'team file':'team-info file (players kept in the game)',kind:'ted',owner:t.name,team:t.id,code,st:tst});continue}
    const b64=await src.load();const m=(t.players||[]).length?await teamPlayersFor(t,src,b64):{players:[],baseRec:null};
    const o=await TED.build(Object.assign({},t,{players:m.players}),{b64,teamId:src.teamId,scheme:src.scheme},{emblemFile:names.emblem||undefined,managerFile:names.manager||undefined,kitFiles:names.kits,
      stadiumFile:nat?undefined:(names.stadium===undefined?(t.of?undefined:''):names.stadium),sponsorFiles:[names.sp1,names.sp2,names.sp3].map(x=>x===undefined?(t.of?undefined:''):x),clearImgs:Object.keys((t.of&&t.of.cleared)||{}),
      teamId:+src.teamId!==code?code:(src.kind==='generic'?src.teamId:0),generic:src.kind==='generic',baseRec:S.settings.ofNewPlayers?m.baseRec:null,keepSquad:!m.players.length});
    if(o.warn.length)notes.push(t.name+': '+o.warn.slice(0,3).join('; ')+(o.warn.length>3?' (and '+(o.warn.length-3)+' more)':''));
    put(dir+file,{data:new Blob([o.bytes]),size:o.bytes.length,why:m.players.length?'team file':'team-info file (players kept in the game)',kind:'ted',owner:t.name,team:t.id,code,st:tst})}
  for(const c0 of compsArr()){const c=typeof ruleView==='function'?ruleView(c0):c0;if(ofGameComp(c))continue;if(c.noCode){if(!c.parked)skip.noCode.push(c.name);continue}if(!c.of&&S.settings.ofExtra===false){skip.off.push(c.name);continue}
    const src=compFileInfo(c);if(!src){skip.noFile.push(c.name);continue}const code=+c.gameId||+src.compId;
    {const why=cedProblem(src.b64,+src.compId!==code?code:0);if(why){notes.push(c.name+': competition file not written: '+why);continue}}
    const dir=W+compFolder(c)+'/';const logo=c.emblem?((c.of&&c.of.names&&c.of.names.emblem&&!codeMoved(c)?c.of.names.emblem:'')||((codeImgName(c,'emblem',0)||{}).name)||ofImgCode(c.emblem,'comp')):'';
    if(c.emblem)await imgOut(c.emblem,dir+'Logo/',logo,'comp',{owner:c.name,comp:c.id});
    const sig=ofCSig(c,logo);marks.comps[code]=sig;marks.names['c'+code]=c.name;
    const was=inst?(inst.comps||{})[code]:(c.of&&c.of.hash===ofCompHash(c)&&!codeMoved(c)&&+c.of.code===code?sig:'');if(!full&&was===sig)continue;const cst=full?(!c.of?'added':was===sig?'':'edited'):((inst?(inst.comps||{})[code]:c.of)?'edited':'added');
    const file=code+'.ced';// by its code only (5b)
    if(c.of&&c.of.ref&&c.of.hash===ofCompHash(c)&&!codeMoved(c)&&+c.of.code===code){put(dir+file,{ref:c.of.ref,size:852,why:'competition file',kind:'ced',owner:c.name,comp:c.id,code,st:cst});continue}
    put(dir+file,{data:dry?EMPTY:new Blob([await CED.build(src.b64,{name:c.name,emblemFile:logo,compId:+src.compId!==code?code:(src.kind==='generic'?src.compId:0)})]),size:852,why:'competition file',kind:'ced',owner:c.name,comp:c.id,code,st:cst})}
  // what the game has that this export no longer writes: by code, listed in CHANGES.txt (a First install simply leaves it out)
  const had=inst||{teams:Object.fromEntries(Object.keys((S.settings.ofBase||{}).teams||{}).map(k=>[k,1])),comps:Object.fromEntries(Object.keys((S.settings.ofBase||{}).comps||{}).map(k=>[k,1])),names:{}};
  const nm=(p,k)=>(inst&&(inst.names||{})[p+k])||((S.settings.ofBase||{})[p==='t'?'teams':'comps']||{})[k]||'';
  const removed=[...Object.keys(had.teams||{}).filter(k=>!marks.teams[k]).map(k=>'Team code '+k+(nm('t',k)?' ('+nm('t',k)+')':'')),...Object.keys(had.comps||{}).filter(k=>!marks.comps[k]).map(k=>'Competition code '+k+(nm('c',k)?' ('+nm('c',k)+')':''))];
  {const say=(L,why)=>{if(L.length)notes.unshift(L.length+' '+why+': '+L.slice(0,12).join(', ')+(L.length>12?' (and '+(L.length-12)+' more)':''))};
   say(skip.noFile,'teams or competitions have no game file, so nothing is written for them (import their file, or give them a code on Game codes)');
   say(skip.noCode,'teams or competitions have no code (Game codes), so they aren\'t exported');
   say(skip.off,'teams or competitions the option file doesn\'t have are NOT exported, because "Also write the project\'s teams the option file doesn\'t have" is unticked on this page')}
  if(!full&&(files.length||removed.length)){const txt=ofChangesText(changed,files,removed);files.push({path:'_Read me/CHANGES.txt',out:'_Read me/CHANGES.txt',data:new Blob([txt]),size:txt.length,why:'list'})}
  const space=ofSpace(mode,files,inst);
  return{mode,pkg:pk.id,files,removed,removedNow:removed,teams:changed,notes,marks,space,dry,added:[],missing:[],orphans:[],replaced:files.filter(f=>f.data&&f.kind==='ted').length,scope:{main:'WEPES',others:[]},compMarks:[],size:files.reduce((a,f)=>a+(+f.size||0),0)}}
// Image space in the game: each type has a store of its own, the game's own images take no space, and an image whose name the
// game already has (the option file's, or one installed since) is overwritten in place
function ofSpace(mode,files,inst){const K={};SPACE_KINDS.forEach(([k])=>K[k]={pkg:0,add:0,over:0,gone:0,newImgs:{}});
  const seen=new Set();Object.values(S.images).forEach(i=>{const k=String(i.ofName||'').toLowerCase();if(k&&K[i.kind]&&!seen.has(k)){seen.add(k);K[i.kind].pkg++}});
  const has=k=>inst?!!(inst.images||{})[k]:seen.has(k);
  files.forEach(f=>{if(!f.kind||!K[f.kind]||!ofIsImg(f.path))return;const k=ofBase(f.path).toLowerCase();if(mode!=='full'&&has(k))K[f.kind].over++;else{K[f.kind].add++;if(!seen.has(k))K[f.kind].newImgs[k]=f.kind}});return K}
// the country a league name stands for ('' for mixed ones)
function ofCountry(league){const l=norm(league);const M=[['premier league|skybet|championship|efl','england'],['bundesliga','germany'],['laliga|la liga|hypermotion','spain'],['serie a|serie b','italy'],
  ['ligue 1|ligue 2','france'],['eredivisie','netherlands'],['liga nos|liga portugal','portugal'],['jupiler|pro league','belgium'],['3f superliga|superliga dk','denmark'],['russian|tinkoff','russia'],['swiss','switzerland'],
  ['scottish','scotland'],['brasileir','brazil'],['argentin','argentina'],['chile','chile'],['betplay|colombia','colombia'],['cfa|chinese','china'],['mls','usa'],['super lig|s per lig','turkiye'],['indonesia','indonesia'],['bbva mx|liga mx','mexico']];
  for(const [re,c] of M)if(new RegExp('\\b('+re+')').test(l))return c;return''}
// Image space in the game (2026-11-19): the game keeps each image type in a store of its own, and the game's own images don't
// count. Room for a type = the option file's images of it + the free spaces the game shows once it is installed (entered on the
// Option file page). An image whose name is already in the game is overwritten in place and needs no space; a new name needs one.
// named as the game's Import Images screen names them (Edit → Data Management → Import/Export); kits go to Strip (L) or
// Strip (S), whichever you pick when importing: the row follows the export's kit size (full size: L, 1024: S)
const SPACE_KINDS=[['emblem','Team Emblems'],['comp','Competition Emblems'],['kit','Strip (L)'],['manager','Manager Photo'],['stadium','Stadium Image'],['sponsor','Sponsor Logo Image']];
Object.defineProperty(SPACE_KINDS[2],1,{get:()=>S.settings.kitExport==='1024'?'Strip (S)':'Strip (L)'});
const isImgPath=p=>/\.(png|jpe?g|dds|bmp)$/i.test(p);
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
function ofChangesText(teams,files,removed){return `PES 2021 OPTION FILE: CHANGES ONLY
Option file: ${(S.settings.ofPkg||{}).name||''}${ofSources().length>1?' (with '+ofSources().slice(1).map(s=>s.name).join(', ')+')':''}
Created: ${new Date().toString()}
Copy the WEPES folder to the USB, then in PES 2021:
Edit > Data Management > Import/Export > Import Team (tick "Overwrite image files of the same name" and "Apply player and squad data"),
then Import Competition and the images. The game links files only by the names inside them; the folders are for you.
${removed.length?`
No longer exported (${removed.length}): a team or competition deleted in the studio, or one that lost its code.
The game keeps what was last imported at a code, so it stays in the game until another file is imported there.
${removed.join('\n')}
`:''}
${csText()}
Teams changed (${teams.length}): ${teams.map(t=>t.name).join(', ')}

Files (${files.length}):
${files.map(f=>f.out||f.path).join('\n')}
`}
// What an export writes, kept until you confirm PES imported it: then it becomes what the game has, by code and image name
// (docs/DATABASE_RULES.md 5a, 7), so the next Changes only starts from it. Never applied by itself.
function ofMarks(plan){return plan.marks||{teams:{},comps:{},images:{},names:{}}}
function ofApplyInstall(p,marks){
  if(!marks||Array.isArray(marks.teams)){toast('That export was made before installs were tracked by code: export again and confirm that one','err');return}
  if(p.space){const s=S.settings.imgSpace||(S.settings.imgSpace={free:{},inst:{}});s.free=s.free||{};s.imp=s.imp||{};
    Object.entries(p.space).forEach(([k,v])=>{const f=s.free[k];const base=spaceBase(k,v.pkg);
      if(spNum(f)){const room=base+(+f);s.free[k]=p.mode==='full'?Math.max(0,room-v.add):Math.max(0,+f-v.add)}
      if(spNum(s.imp[k]))s.imp[k]=p.mode==='full'?v.add:+s.imp[k]+v.add});
    s.inst=Object.assign(p.mode==='full'?{}:(s.inst||{}),p.newImgs||{})}
  S.settings.ofInstalled={at:p.at,mode:p.mode,files:p.files,teams:marks.teams||{},comps:marks.comps||{},images:marks.images||{},names:marks.names||{}};S.settings.ofPending=null;S.ui.ofEst=null;saveSettings()}// Each export replaces the one waiting before it, and every Changes only export compares with the confirmed baseline, so it
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
// A file of the option file, fetched with a time limit (the user, 2026-11-23: the online download stopped at 89% and 69% and
// never moved again). A read that stalls (no answer, or the bytes stop coming) is given up after OF_STALL_S seconds and tried
// again, with the progress saying so; only when every try fails does the export stop, with the file and the reason.
const OF_STALL_S=90;
async function ofFetchBytes(url,what,signal){const waits=[1,2,4,8,15,30];let last='';
  for(let i=0;;i++){const ac=new AbortController();const stop=()=>ac.abort();if(signal)signal.addEventListener('abort',stop,{once:true});let timedOut=false;const t=setTimeout(()=>{timedOut=true;ac.abort()},OF_STALL_S*1000);
    try{const r=await fetch(url,{credentials:'same-origin',signal:ac.signal,cache:'no-store'});if(!r.ok&&r.status<500&&r.status!==429)throw Object.assign(new Error(what+': the server answered '+r.status),{fatal:true});
      if(!r.ok)throw new Error('the server answered '+r.status);const b=new Uint8Array(await r.arrayBuffer());clearTimeout(t);return b}
    catch(e){clearTimeout(t);if(e&&e.fatal)throw e;if(signal&&signal.aborted)throw e;last=timedOut?'no answer for '+OF_STALL_S+' seconds':(e&&e.message)||String(e)}
    finally{if(signal)signal.removeEventListener('abort',stop)}
    if(i>=waits.length)throw new Error(what+': '+last+', after '+(waits.length+1)+' tries');
    if(S.ui.ai){S.ui.ai.busy='Waiting for '+what.replace(/^Reading /,'')+': '+last+'. Trying again ('+(i+2)+' of '+(waits.length+1)+')…';progRender()}await sleep(waits[i]*1000)}}
async function* ofContents(plan,signal,skip){const pkg=plan.pkg;const get=f=>f.data?f.data.arrayBuffer().then(b=>new Uint8Array(b)):ofFetchBytes(ofUrl(f.ref||ofRef(pkg,f.path)),'Reading '+(f.out||f.path).split('/').pop(),signal);
  const q=[];let i=0;const fill=()=>{while(q.length<4&&i<plan.files.length){const f=plan.files[i++];q.push({f,p:skip&&skip.has(f)?Promise.resolve(null):get(f)})}};fill();
  while(q.length){const {f,p}=q.shift();const u8=await p;fill();yield{f,u8}}}
// Saving on this computer: when the studio runs from this computer its server can write the export itself, as a folder. It is
// the way to save where the browser can't open a save dialog (an embedded browser). LOCAL_SAVE is null on the website.
let LOCAL_SAVE=null;fetch('api/local/info').then(r=>r.ok?r.json():null).then(o=>{if(o&&o.export){LOCAL_SAVE=o;if(location.hash==='#optionfile')rerender()}}).catch(()=>{});
async function ofWrite(plan,how){let done=0,bytes=0;const t0=Date.now();S.ui.ai.busyN=null;
  const all=+plan.size||plan.files.reduce((a,f)=>a+(+f.size||0),0);
  const tick=f=>{done++;const lbl='Writing '+done+' of '+plan.files.length+' files ('+kb(bytes)+(all?' of '+kb(all):'')+')';all?busyCount(bytes,all,lbl):busyCount(done,plan.files.length,lbl)};
  if(how==='local'){const want=(pesName((S.settings.ofPkg||{}).name)||'option-file')+(plan.mode==='full'?'_full_':'_changes_')+new Date().toISOString().slice(0,16).replace('T','_').replace(':','');
    const H={'X-Studio':'1'};const b=await fetch('api/local/export/begin',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},H),body:JSON.stringify({name:want})});const bo=await b.json().catch(()=>({}));if(!b.ok)throw new Error(bo.error||'the local server refused ('+b.status+')');
    for await(const {f,u8} of ofContents(plan)){const r=await ofFetchRetry(()=>fetch('api/local/export/file?name='+encodeURIComponent(bo.name)+'&path='+encodeURIComponent(f.out||f.path),{method:'POST',headers:H,body:u8}),'Writing '+(f.out||f.path));
      if(!r.ok){const o=await r.json().catch(()=>({}));throw new Error(f.path+': '+(o.error||r.status))}bytes+=u8.length;tick(f)}
    S.ui.ai.busy=null;S.ui.ai.busyN=null;progRender();S.ui.ofSaved={dir:bo.dir,n:plan.files.length,at:Date.now(),mode:plan.mode};toast(plan.files.length+' files written to '+bo.dir+' ('+kb(bytes)+', '+Math.round((Date.now()-t0)/1000)+' s)','ok');return true}
  if(how==='zip'){const name=(pesName((S.settings.ofPkg||{}).name)||'option-file')+(plan.mode==='full'?'_full':'_changes_'+new Date().toISOString().slice(0,10))+'.zip';
    if(window.showSaveFilePicker){let h;try{h=await window.showSaveFilePicker({suggestedName:name,types:[{description:'ZIP',accept:{'application/zip':['.zip']}}]})}catch(e){if(e.name==='AbortError')return false;throw e}
      const w=await h.createWritable();const z=zipWriter(async u8=>{await w.write(u8)});
      try{for await(const {f,u8} of ofContents(plan)){await z.add(f.out||f.path,u8);bytes+=u8.length;tick(f)}await z.end();await w.close()}catch(e){try{await w.abort()}catch(_){}throw e}}
    else{if(plan.size>400*1048576)throw new Error('This browser can only build ZIPs up to about 400 MB in memory. Use Chrome or Edge on a computer, or "Write to a folder".');
      const z=new JSZip();for await(const {f,u8} of ofContents(plan)){z.file(f.out||f.path,u8,{compression:'STORE'});bytes+=u8.length;tick(f)}
      const dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;await dl.save({filename:name,data:await z.generateAsync({type:'blob'})})}}
  else{if(!window.showDirectoryPicker)throw new Error('This browser can\'t write folders. Use Chrome or Edge on a computer, or save a ZIP.');let dir;
    try{dir=await window.showDirectoryPicker({id:'pes21of',mode:'readwrite'})}catch(e){if(e.name==='AbortError')return false;throw e}
    // a folder written before (an export that stopped): every file already there in full is kept, the rest is written. The size
    // a file will have is its own (a file the studio builds, a resized kit, an image of yours: the bytes already made), else the
    // option file's. Choosing the WEPES folder itself works too: the paths inside it are used.
    const inW=/^wepes$/i.test(dir.name);const rel=f=>{const o=f.out||f.path;return inW&&/^WEPES\//i.test(o)?o.slice(6):o};
    const want=f=>f.data&&typeof f.data.size==='number'?f.data.size:+f.size||0;
    const have=new Set();busyCount(0,plan.files.length,'Looking for files already written in '+dir.name+'…');let k=0;
    for(const f of plan.files){k++;if(k%50===0)busyCount(k,plan.files.length,'Looking for files already written in '+dir.name+'…');const n=want(f);if(!(n>0))continue;
      try{const parts=rel(f).split('/');let d=dir;for(const s of parts.slice(0,-1))d=await d.getDirectoryHandle(s);const x=await (await d.getFileHandle(parts[parts.length-1])).getFile();if(x.size===n)have.add(f)}catch(e){}}
    busyCount(0,plan.files.length,have.size?have.size+' of '+plan.files.length+' files are already in '+dir.name+': writing the rest…':'Writing '+plan.files.length+' files…');
    for await(const {f,u8} of ofContents(plan,null,have)){if(!u8){bytes+=want(f);tick(f);continue}const parts=rel(f).split('/');let d=dir;for(const s of parts.slice(0,-1))d=await d.getDirectoryHandle(s,{create:true});
      const w=await (await d.getFileHandle(parts[parts.length-1],{create:true})).createWritable();await w.write(u8);await w.close();bytes+=u8.length;tick(f)}
    if(have.size)toast(have.size+' file'+(have.size===1?' was':'s were')+' already in '+dir.name+' and kept: the export continued where it stopped','ok')}
  S.ui.ai.busy=null;S.ui.ai.busyN=null;progRender();toast(plan.files.length+' files written ('+kb(bytes)+', '+Math.round((Date.now()-t0)/1000)+' s)','ok');return true}

/* ---- the Option file page ---- */
VIEWS.optionfile=()=>{const pk=S.settings.ofPkg;const st=S.ui.of||(S.ui.of={});if(!st.loaded&&ofAvailable()){st.loaded=true;ofApi('packages').then(o=>{st.list=o.packages;st.online=o.online;rerender()}).catch(e=>{st.err=e.message;rerender()})}
  const list=st.list||[];const plan=st.plan;
  return `<h1>Option file</h1><p class="sub">A published option file is the model for this studio. The project is built from its team and competition files and the images they name, by code and by name: folders are never read. Exports give back the same files under the same names, laid out by competition and team. <b>First install</b> writes every file; after that, <b>Changes only</b> writes just what differs from what the game has, team code by team code.</p>
  ${ofAvailable()?'':'<div class="warnbox">Option files are handled by the site\'s server: open the studio from start.bat or the website.</div>'}${st.err?`<div class="warnbox">${esc(st.err)}</div>`:''}
  <div class="grid g2"><div class="card"><h3>1 · Package</h3>${list.length?`<table><tbody>${list.map(p=>`<tr><td><b>${esc(p.name)}</b><div class="small muted">${kb(p.size||0)}${p.files?' · '+p.files+' files':''}${p.kind==='source'?' · imported into a project and kept for its rebuilds':''}</div></td><td>${pk&&pk.id===p.id?'<span class="tag t-add">in use</span>':''}${p.baseline?' <span class="tag t-upd">site baseline</span>':''}${p.site&&!p.baseline&&!isGuest()&&!isMember()?' <button class="sm ghost" data-act="ofSetBase" data-id="'+esc(p.id)+'">Make it the site baseline</button>':''}</td><td style="text-align:right">${!st.online&&p.kind!=='source'&&!/ coded$/.test(p.name)?`<button class="sm ghost" data-act="ofCode" data-id="${esc(p.id)}" data-name="${esc(p.name)}" title="A copy with no folders: files named by code, images by type and number">Make a coded copy</button>`:''}<button class="sm ${pk&&pk.id===p.id?'':'primary'}" data-act="ofBuild" data-id="${esc(p.id)}" data-name="${esc(p.name)}">${pk&&pk.id===p.id?'Rebuild from it':'Build the project from it'}</button></td></tr>`).join('')}</tbody></table>`:'<p class="small muted">No package yet.</p>'}
    ${`<div class="warnbox" style="margin-top:10px">${OF_IMPORT_FIRST}</div><div class="row" style="margin-top:10px"><label class="chip on" style="cursor:pointer;padding:7px 14px"><input type="file" id="of-file" accept=".zip" style="display:none">Upload an option file (.zip)</label></div><p class="small muted">${st.online?(isMember()?'It goes into your own private storage (only you can see or use it), sent in parts so even a 3 GB option file uploads; keep the page open until it says it\'s added.':'It is sent in parts and joined in the site\'s storage, so even a 3 GB option file uploads; keep the page open until it says it\'s added.'):'Or put the ZIP in this folder\'s <code>data/optionfiles</code>; it shows up here.'}</p>`}${st.online&&!isMember()?`<label class="f" style="margin-top:10px">Or add a package already in the site's Cloud Storage bucket<input id="of-obj" type="text" placeholder="public/PES21 Option File 26-27.zip"></label><div class="row" style="margin-top:6px"><button class="sm" data-act="ofRegister">Add package</button></div><p class="small muted">Upload the ZIP in the Cloud Storage console (bucket of this site), then add it here by its path. Only owner accounts open the site's packages; everyone else sees only their own uploads.</p>`
      :''}</div>
   <div class="card"><h3>2 · Build the project</h3><p class="small">The package comes first: its teams (names, players, real game player IDs and ratings), kits, crests, manager photos and competition files replace the project's; teams and data it doesn't have stay as they are. A snapshot is saved first.</p>
    ${pk?`<p class="small">In use: <b>${esc(pk.name)}</b>, built ${fmtDate(pk.builtAt)}${ofSources().length>1?`, with the option file${ofSources().length>2?'s':''} imported since: <b>${ofSources().slice(1).map(x=>esc(x.name)).join('</b>, <b>')}</b>`:''}. ${teamsArr().filter(t=>t.of).length} teams and ${compsArr().filter(c=>c.of).length} competition files come from ${ofSources().length>1?'them':'it'}. <b>Rebuild from it</b> reads them all again, in that order.</p>`:'<p class="small muted">Not built yet.</p>'}</div></div>
  ${pk?`<h2>3 · Export</h2>${ofPendingHTML()}
   <div class="card" style="margin-bottom:12px"><h3 style="margin-top:0">Options <span class="small muted" style="font-weight:400">for both exports: First install and Changes only</span></h3>
   <label class="c small" style="margin-bottom:10px"><input type="checkbox" data-act="ofExtra" ${S.settings.ofExtra===false?'':'checked'}> <span>Also write new files created by you: the project's teams and competitions the option file doesn't have <span class="muted">(${(()=>{const nt=teamsArr().filter(t=>!t.of&&!t.sameAs).length,nc=compsArr().filter(c=>!c.of&&c.ced&&c.ced.b64).length;return nt+' team'+(nt===1?'':'s')+', '+nc+' competition'+(nc===1?'':'s')})()}. Off: they are left out, and the notes say so)</span></span></label>
   <label class="c small"><input type="checkbox" data-act="ofNewPlayers" ${S.settings.ofNewPlayers?'checked':''}> <span>Also write players no game file has <span class="muted">(off: they are left out and listed in the notes. The game never creates a player from a team file and refuses a team that lists one it doesn't have; tick only for IDs the game already has, such as unregistered players)</span></span></label></div>
   ${(()=>{// the two exports on sub-tabs of their own (the user, 2026-11-23): First install, then Changes only
     const sub=S.ui.ofExpSub==='changes'?'changes':'full';
     const bar=`<div class="tabs" role="tablist" aria-label="Export" style="margin:4px 0 12px">${[['full','First install'],['changes','Changes only']].map(([k,l])=>`<button role="tab" aria-selected="${sub===k}" class="${sub===k?'on':''}" data-act="ofExpSub" data-sub="${k}">${l}</button>`).join('')}</div>`;
     return bar+(sub==='full'?`<div class="card"><h3>First install: the complete file set</h3><p class="small">Every team and competition by its code, with the images their files name: files you didn't edit go out byte for byte, edited ones are rebuilt, deleted ones are left out. Laid out by competition and team (<code>WEPES/&lt;code&gt; &lt;competition&gt;/&lt;code&gt; &lt;team&gt;/</code>); the game links files only by the names inside them.</p>
    ${ofSizeHTML('full')}<div class="row"><button data-act="ofPlan" data-mode="full">Check the file set</button><button class="gold" data-act="ofGo" data-mode="full" data-how="zip">Save as ZIP</button><button data-act="ofGo" data-mode="full" data-how="dir">Write to a folder</button>${LOCAL_SAVE?`<button data-act="ofGo" data-mode="full" data-how="local" title="The studio's own server writes the files into ${esc(LOCAL_SAVE.dir)}. Use it where the browser can't open a save dialog.">Save on this computer</button>`:''}</div>${LOCAL_SAVE&&S.ui.ofSaved&&S.ui.ofSaved.mode==='full'?`<p class="small" style="margin:8px 0 0">Last saved on this computer: <b>${S.ui.ofSaved.n} files</b> in <code style="word-break:break-all">${esc(S.ui.ofSaved.dir)}</code> (${fmtDate(S.ui.ofSaved.at)}).</p>`:''}</div>`:`<div class="card"><h3>Changes only</h3><p class="small">Only the files that changed since the baseline${S.settings.ofInstalled?` (the export of ${fmtDate(S.settings.ofInstalled.at)} you confirmed)`:' (none confirmed yet: compared with the option file)'}, team code by team code and image name by image name, plus CHANGES.txt (in _Read me), which also lists the codes no longer exported.</p>
    ${ofSizeHTML('changes')}<div class="row"><button data-act="ofPlan" data-mode="changes">Check the changes</button><button class="gold" data-act="ofGo" data-mode="changes" data-how="zip">Save as ZIP</button><button data-act="ofGo" data-mode="changes" data-how="dir">Write to a folder</button>${LOCAL_SAVE?`<button data-act="ofGo" data-mode="changes" data-how="local" title="The studio's own server writes the files into ${esc(LOCAL_SAVE.dir)}. Use it where the browser can't open a save dialog.">Save on this computer</button>`:''}</div>${LOCAL_SAVE&&S.ui.ofSaved&&S.ui.ofSaved.mode==='changes'?`<p class="small" style="margin:8px 0 0">Last saved on this computer: <b>${S.ui.ofSaved.n} files</b> in <code style="word-break:break-all">${esc(S.ui.ofSaved.dir)}</code> (${fmtDate(S.ui.ofSaved.at)}).</p>`:''}</div>`)+(plan&&plan.mode===sub?ofPlanHTML(plan):'')})()}`:''}
  <h2>The rule</h2><div class="card small"><p>The studio reads an option file as files and their links: team files and competition files, and the images they name, found by name. One team per team code and one competition per competition code (where an option file has two files for one code, the last by file name, or the one you pick in the Health check); one picture per image name. Option files imported since are read again on every rebuild, in order, a later one's file for a code replacing an earlier one's. Installs are remembered by code and image name. The game imports all files of a kind at once and links them by the names inside them: Import Team with "Overwrite image files of the same name" and "Apply player and squad data", then Import Competition and the images.</p></div>`};
function ofPlanHTML(p){const reps=p.files.filter(f=>f.data);const gone=p.removed||[];const nT=p.files.filter(f=>f.kind==='ted').length,nC=p.files.filter(f=>f.kind==='ced').length,nI=p.files.filter(f=>ofIsImg(f.path)).length;
  return `<div class="card hl" style="margin-top:12px"><div class="row"><b>${p.mode==='full'?'First install':'Changes only'}: ${p.files.length} files · ${kb(p.size)}</b><span class="spacer"></span><span class="small">${nT} team files · ${nC} competition files · ${nI} images · ${p.teams.length} teams changed</span></div>
  <p class="small" style="margin:8px 0 0">Laid out by competition and team in one <b>WEPES</b> folder; notes and CHANGES.txt in <b>_Read me</b>.</p>
  ${gone.length?`<details style="margin-top:8px"><summary class="small" style="cursor:pointer">${gone.length} code${gone.length===1?'':'s'} the game has that this export no longer writes${p.mode==='changes'?' (listed in CHANGES.txt)':''}</summary><div class="small muted" style="max-height:220px;overflow:auto">${gone.slice(0,400).map(esc).join('<br>')}</div></details>`:''}
  ${reps.length?`<details style="margin-top:8px"><summary class="small" style="cursor:pointer">Rebuilt or new files (${reps.length})</summary><div class="small muted" style="max-height:220px;overflow:auto">${reps.slice(0,400).map(f=>esc(f.out||f.path)+' <i>('+esc(f.why)+')</i>').join('<br>')}</div></details>`:''}
  ${p.notes.length?`<details class="warnbox" style="margin-top:8px"><summary>${p.notes.length} notes</summary>${p.notes.slice(0,100).map(esc).join('<br>')}</details>`:''}</div>${ofSpaceHTML(p)}`}ACT.ofRegister=async()=>{const v=($('#of-obj')||{}).value||'';try{await miniBusy('Reading the package…',async()=>{const o=await ofApi('register',{method:'POST',headers:{'Content-Type':'application/json','X-Studio':'1'},body:JSON.stringify({object:v.trim()})});toast('Package added: '+o.package.name+' ('+o.package.files+' files)','ok')});S.ui.of={};rerender()}catch(e){toast(e.message,'err')}};
// shown wherever a user uploads their own option file: import it into the game first, then export changes only
const OF_IMPORT_FIRST=`<b>Important:</b> before you start editing your option file, make sure it is already imported into the game, to save time downloading. You will still be able to export the whole option file from this app when you finish editing, but it is better to export <b>changes only</b> while the rest of the files are already in the game.`;
document.addEventListener('change',async e=>{if(e.target&&e.target.id==='of-file'&&e.target.files[0]){const f=e.target.files[0];
  if(!await ask('Upload '+f.name+'?',OF_IMPORT_FIRST,'Upload')){e.target.value='';return}
  try{e.target.value='';await miniBusy('Uploading '+f.name+' ('+kb(f.size)+')…',async()=>{await ofUploadPackage(f)});toast('Package added','ok');S.ui.of={};rerender()}catch(err){toast(err.message,'err')}}});
ACT.ofBuild=async el=>{const id=el.dataset.id,name=el.dataset.name;const pend=S.settings.ofPending;
  if(pend&&!await ask('An export is waiting for your confirmation',`The export of <b>${fmtDate(pend.at)}</b> hasn't been confirmed as imported in PES. Building from a package starts over and deletes the project's teams with the package's own data, so the changes in that export would be lost from the project. Confirm or forget it first, unless you mean to start again.`,'Build anyway',true))return;
  await startFresh(id,name)};
ACT.ofExpSub=el=>{S.ui.ofExpSub=el.dataset.sub;rerender()};
ACT.ofPlan=async el=>{try{await miniBusy('Checking the file set…',async()=>{S.ui.of.plan=await ofPlan(el.dataset.mode);ofEstSet(S.ui.of.plan)});rerender()}catch(e){toast(e.message,'err')}};
ACT.ofGo=async el=>{const mode=el.dataset.mode,how=el.dataset.how;let plan;try{await miniBusy('Preparing the files…',async()=>{plan=await ofPlan(mode)})}catch(e){toast(e.message,'err');return}
  S.ui.of.plan=plan;ofEstSet(plan);rerender();if(!plan.files.length){toast('Nothing changed since the last install','ok');return}if(plan.missing.length){toast(plan.missing.length+' package files are missing; not written','err');return}
  const pend=S.settings.ofPending;
  if(!await ask(mode==='full'?'Write the complete file set?':'Write the changes?',`<b>${plan.files.length}</b> files, <b>${kb(plan.size)}</b>${plan.teams.length?', with '+plan.teams.length+' changed teams':''}, in one <b>WEPES</b> folder, laid out by competition and team.<br><br>The current baseline stays until you confirm, on this page, that PES imported this export.${pend?' This export replaces the one of '+fmtDate(pend.at)+', which you haven\'t confirmed.':''}`,how==='zip'?'Save ZIP':how==='local'?'Save on this computer':'Choose folder'))return;
  try{const ok=await ofWrite(plan,how);if(ok){await ofSetPending(plan);toast('Import it in PES, then confirm it here, on Export Option File','ok');rerender()}
    else toast('Nothing was saved: the save dialog was closed, or it can\'t open in this browser.'+(LOCAL_SAVE?' Use "Save on this computer" instead.':' Try Chrome or Edge.'),'err')}catch(e){S.ui.ai.busy=null;S.ui.ai.busyN=null;progRender();toast('Writing stopped: '+e.message+(how==='dir'?'. Press Write to a folder again and choose the same folder: the files already written are kept and it continues.':' Write to a folder can continue where an export stopped: choose it and the same folder each time.'),'err')}};
ACT.ofSetBase=async el=>{if(!await ask('Make it the site baseline?','Every visitor and account then starts from this option file, and projects built from another one are told a different option file is the baseline.','Make it the baseline'))return;
  try{await ofApi('baseline',{method:'POST',headers:{'Content-Type':'application/json','X-Studio':'1'},body:JSON.stringify({pkg:el.dataset.id})});S.ui.of={};S.ui.blInfo=null;toast('Site baseline set','ok')}catch(e){toast(e.message,'err')}rerender()};
// the export options apply to both exports: changing one drops the checked plan, both boxes' size estimates and the file-set
// status, so First install and Changes only are both worked out again with it
const ofOptSet=(k,v)=>{S.settings[k]=v;saveSettings();if(S.ui.of)S.ui.of.plan=null;S.ui.ofEst=null;if(S.ui.tocSt){delete S.ui.tocSt.full;delete S.ui.tocSt.changes}setTimeout(rerender,0)};
ACT.ofExtra=el=>ofOptSet('ofExtra',el.checked);
ACT.ofNewPlayers=el=>ofOptSet('ofNewPlayers',el.checked);
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
