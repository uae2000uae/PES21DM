// PES 2021 Option Studio, part 12 of 14: Game files and images for every team and competition; stadiums, sponsors, managers; player look-ups.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= Every team and competition has its game file =================
   The rule: no team or competition exists without its own stored file, a .ted or a .ced, linked to its images by file
   name (as in an option file). Files the project has (imported, from the option file) are kept; the rest are generated:
   - a team keeps its in-game ID; one without takes a free PES 2021 slot (assets/pes21-teams.json, from PES Master):
     fictional teams first, then leagues the project doesn't use, then leagues it uses in part; never a slot the project,
     its team files or the option file already uses. A cup copy of a team (sameAs) uses its league copy's file.
   - a competition keeps its in-game ID, or takes the one of a built-in file of the same name; otherwise its file has
     ID 0, which the connection check reports for the user to set.
   Image names follow the in-game ID (E_/M_/K_<id>, C_<id>) and are stored with the file, so every export links the same names.
   Generated once for existing data (a snapshot first), then on every save of a team or competition without one. */
// the numbers the game uses: competition IDs are small (the option file's run from 1 to 165), team IDs follow PES 2021's
// own list. RULE (rule book, "Never a made-up ID"): the studio never makes an ID up. A team, competition or player without a real
// one stays without one (no code / no game ID) until it is given one the game has; nothing without one is written.
const KNOWN_COMP_IDS=[1,2,5,7,8,17,19,23,25,26,27,28,31,34,43,44,46,50,51,52,53,54,55,59,68,79,80,83,84,85,86,87,88,90,91,92,95,97,122,123,124,125,126,127,128,129,130,131,132,137,142,164,165];
const COMP_ID_MAX=199,EDIT_LO=0x40080000,EDIT_HI=0x40080000+0x6ffff;

function usedCompIds(){const s=new Set(KNOWN_COMP_IDS);builtinComps().forEach(x=>s.add(+x.compId));compsArr().forEach(c=>{if(+c.gameId)s.add(+c.gameId);if(c.ced&&+c.ced.compId)s.add(+c.ced.compId)});return s}
let PES21_TEAMS=null;
// The list comes from PES Master, not from the game, and holds three leagues the console game does not have: Import Team
// refused a file on a J1 League, a J2 League and an Other Teams (Africa) code (PS5, 2026-11-22, tests 62 to 64: "I don't have
// those competitions in the game"). Their codes are not codes of the game, so they are dropped here and never offered.
const PES21_NOT_IN_GAME=new Set(['j1-league','j2-league','other-teams-africa']);
async function pes21Teams(){if(!PES21_TEAMS){try{const r=await fetch('assets/pes21-teams.json?v=2026-11-23',{cache:'force-cache'});PES21_TEAMS=r.ok?((await r.json()).teams||[]).filter(t=>!PES21_NOT_IN_GAME.has(t.league)):[]}catch(e){PES21_TEAMS=[]}}return PES21_TEAMS}
// once (2026-11-22): player IDs the studio made up earlier (0x40080000–0x400EFFFF, not linked to a game record) are cleared, and
// a competition file made under a made-up number loses it, so each shows as having none until it is given a real one
{const _eb=extBoot;extBoot=async function(){await _eb();if(S._loadFailed||S.settings.noMadeUpIds)return;let np=0,nc=0;
  teamsArr().forEach(t=>{let ch=false;(t.players||[]).forEach(p=>{if(+p.gameId>=EDIT_LO&&+p.gameId<=EDIT_HI&&!(p.ted&&+p.ted.pid===+p.gameId)){p.gameId='';ch=true;np++}});if(ch)saveTeam(t)});
  compsArr().forEach(c=>{if(c.ced&&c.ced.randomId&&c.ced.generated&&!c.codeSet){delete c.ced;c.gameId='';saveComp(c);nc++}});
  S.settings.noMadeUpIds=1;saveSettings();if(np||nc)console.log('Made-up IDs cleared: '+np+' players, '+nc+' competitions')}}
function usedTeamSlots(){const s=new Set();teamsArr().forEach(t=>{if(+t.gameId)s.add(+t.gameId)});Object.values(S.teds||{}).forEach(x=>{if(+x.tedTeamId)s.add(+x.tedTeamId)});return s}
const FICTIONAL_LEAGUES=['pas-league','peu-league','pla-league'];
async function freeTeamSlot(t,used){const L=await pes21Teams();const nat=isNationalTeam(t);
  const usedLeagues=new Set(L.filter(x=>used.has(x.id)).map(x=>x.league));
  const rank=x=>FICTIONAL_LEAGUES.includes(x.league)?0:usedLeagues.has(x.league)?2:x.league==='classic-teams'?3:1;
  return L.filter(x=>!used.has(x.id)&&x.league.startsWith('national-teams')===nat).sort((a,b)=>rank(a)-rank(b)||a.id-b.id)[0]||null}
// the names a team's file gives its images, from its in-game ID
function teamFileNames(t,id){const tag=String(id).padStart(6,'0');
  return{emblem:t.emblem?'E_'+tag+'.png':'',manager:t.managerPhoto?'M_'+tag+'.png':'',
    kits:OF_KIT_SLOT.map(sl=>{const k=(t.kits||[]).find(z=>z.slot===sl);return k&&k.img?'K_'+tag+'_'+(SLOTCODE[sl]||sl)+'.png':''})}}
async function genTeamFile(t,used){
  let id=+t.gameId||0,replaces='';
  if(!id){const sl=await freeTeamSlot(t,used);if(sl){id=sl.id;replaces=sl.name}
    else return{err:'no free team code of the game is left: give it one on Game codes (Make room frees some); a made-up number is never used'}}
  if(!id)return{err:'no free team number left'};
  used.add(id);
  const L=builtinTeams();const own=L.find(x=>x.teamId===id);const g=own||L.find(x=>x.teamId===(isNationalTeam(t)?1026:GENERIC_TEAM_ID))||L[0];
  if(!g)return{err:'the built-in team templates are not loaded'};
  const scheme=biScheme(g);const src={kind:own?'builtin':'generic',teamId:id,scheme,key:'bi:'+g.teamId};
  const names=teamFileNames(t,id);const m=await teamPlayersFor(t,src,g.b64);
  const o=await TED.build(Object.assign({},t,{players:m.players}),{b64:g.b64,teamId:id,scheme},
    {emblemFile:names.emblem||undefined,managerFile:names.manager||undefined,kitFiles:names.kits,stadiumFile:isNationalTeam(t)?undefined:names.stadium,sponsorFiles:names.sponsors,teamId:own?0:id,generic:!own,baseRec:m.baseRec,emptySquad:!own&&!m.players.length});
  const P=TED.parse(o.bytes);const rec=await tedSaveTemplate(t.id,P,TED.b64(o.bytes),String(id).padStart(6,'0')+'.ted');
  Object.assign(rec,{generated:true,replaces,names,emblemFile:names.emblem});Store.put('teds',rec);
  if(+t.gameId!==id)t.gameId=id;return{id,replaces}}
async function genCompFile(c,usedC){const L=builtinComps();let id=+c.gameId||(c.ced&&+c.ced.compId)||0;let random=false;
  if(!id){const b=compFileInfo(c);if(b&&b.kind==='builtin')id=b.compId}
  if(!id)throw new Error('no slot yet: a competition gets one when it is added (a vacancy or one it replaces) or on Game codes, never a made-up number');if(usedC)usedC.add(id);
  const g=(id&&L.find(x=>x.compId===id))||L.find(x=>c.worldCup?x.international:!x.international)||L[0];if(!g)throw new Error('the built-in competition templates are not loaded');
  const tag=String(id).padStart(4,'0');const logo=c.emblem?'C_'+tag+'.png':'';
  const keepOwn=c.ced&&c.ced.b64&&!c.ced.generated;const raw=TED.unb64(keepOwn?c.ced.b64:g.b64);const d=GF.decrypt(raw);cedSetCode(d,id);TED.writeStr(d,CED.NAME,CED.NAMELEN,String(c.name||'').slice(0,60));TED.writeStr(d,CED.EMB,TED.IMGLEN,logo);
  const bytes=await TED.encrypt(d,raw);
  c.ced=Object.assign(keepOwn?c.ced:{},{b64:TED.b64(bytes),compId:id,file:keepOwn?c.ced.file:'C_'+tag+'.ced',emblemFile:keepOwn?c.ced.emblemFile:logo,generated:!keepOwn,randomId:random,at:Date.now()});delete c.ced.noSlot;c.gameId=String(id);return c.ced}
const needsTeamFile=t=>!t.sameAs&&!t.noCode&&!S.teds[t.id];
// players and teams without an ID (a cup copy takes its league copy's)
const needsIds=t=>!t.noCode&&(!+t.gameId||(t.players||[]).some(p=>!+p.gameId));
// A cup copy links to its league club by id (sameAsId); sameAs is only the club's name for display. Older copies are linked by
// name once, then by id, so renaming the league club never breaks the link (docs/DATABASE_RULES.md, 2).
function leagueCopy(t){if(!t.sameAs)return null;const x=S.teams[t.sameAsId];
  if(x&&!x.sameAs&&x.id!==t.id){if(t.sameAs!==x.name)t.sameAs=x.name;return x}
  const y=teamsArr().find(x=>!x.sameAs&&x.id!==t.id&&norm(x.name)===norm(t.sameAs))||null;if(y)t.sameAsId=y.id;return y}
{const _eb=extBoot;extBoot=async function(){await _eb();if(S._loadFailed)return;teamsArr().forEach(t=>{if(t.sameAs&&!S.teams[t.sameAsId]&&leagueCopy(t))saveTeam(t)})}}
function assignIds(){const usedP=new Set();teamsArr().forEach(t=>(t.players||[]).forEach(p=>{if(+p.gameId)usedP.add(+p.gameId);if(p.ted&&+p.ted.pid)usedP.add(+p.ted.pid)}));let nt=0,np=0;
  for(const t of teamsArr()){if(!needsIds(t))continue;let ch=false;const lc=leagueCopy(t);
    // a new club waiting for its league and code (fileTeamId: only a suggestion) gets it from teamPlaceAsk, never here
    if(!+t.gameId&&!t.fileTeamId){const id=lc&&+lc.gameId||(S.teds[t.id]&&+S.teds[t.id].tedTeamId);if(id){t.gameId=id;ch=true;nt++}}
    for(const p of t.players||[]){if(+p.gameId)continue;
      const twin=lc&&(lc.players||[]).find(q=>validGameId(q.gameId)&&samePlayer(q.name,p.name));
      // only an ID the game has: his own record, or his league copy's; otherwise he stays without one (Allocate free IDs)
      const id=p.ted&&+p.ted.pid?+p.ted.pid:twin?+twin.gameId:0;if(!id)continue;p.gameId=id;usedP.add(id);ch=true;np++}
    if(ch)saveTeam(t)}
  return{nt,np}}
// a league folder of the option file without a competition file is one of the game's own competitions (or a pool such as
// Others European): it gets no file, ID or logo of the studio's making (docs/DATABASE_RULES.md, 5)
const ofGameComp=c=>!!(c&&(c.legendsGroup||((c.gameLeague||(c.of&&c.of.folder))&&!(c.of&&c.of.ced)&&!c.ced&&!c.codeSet)));// the legends group: no file either
// What the game lets a competition change (the user, 2026-11-22): a competition whose name and logo both can't change has no
// Edit button; when only one can't, the edit window disables that one, with the reason. The World Cup's title and logo change
// only with the international search; the game's own competitions with no competition file keep the game's name and logo
// (nothing is written for them) until they get a slot on Game codes.
// The game's own competitions: the studio writes no file for them (DATABASE_RULES §5.7), so a change would never reach the game.
// Whether a file could change one is not settled: test 24 was refused, but with a guessed code and slot (GAME_TESTS 13c).
const OWN_COMP_WHY=what=>`One of the game's own competitions: the option file has no competition file for it and the studio writes none, so the game keeps its own ${what}. Whether a file could change it is not tested yet (Game tests 13c; test 24 was refused, with a guessed slot).`;
const LEGENDS_WHY='A group the studio keeps for the game\'s own sides THE LEGENDS and THE ICONS, like the World Cup: not a competition of the game, so it has no file, code or logo.';
const compNameLock=c=>!c?'':c.legendsGroup?LEGENDS_WHY:c.worldCup?'The World Cup keeps the last edition\'s title until a newer edition is published; only the international search changes it.':ofGameComp(c)?OWN_COMP_WHY('name'):'';
const compLogoLock=c=>!c?'':c.legendsGroup?LEGENDS_WHY:c.worldCup?'The World Cup keeps the last edition\'s logo until a newer edition is published; only the international search changes it.':ofGameComp(c)?OWN_COMP_WHY('logo'):'';
const compEditLocked=c=>!!(compNameLock(c)&&compLogoLock(c));
// a competition with no ID at all waits for a slot (never a made-up number): no file is made for it until then
const needsCompFile=c=>!ofGameComp(c)&&!c.noCode&&(!(c.ced&&c.ced.b64&&+c.ced.compId)||!+c.gameId)&&!!(+c.gameId||(c.ced&&+c.ced.compId)||(()=>{const b=compFileInfo(c);return b&&b.kind==='builtin'&&+b.compId})());
let GF_RUN=null,GF_AGAIN=false,GF_FAIL=[];
async function ensureGameFiles({snapshot=false,quiet=true}={}){
  if(GF_RUN){GF_AGAIN=true;return GF_RUN}
  GF_RUN=(async()=>{const ts=teamsArr().filter(needsTeamFile),cs=compsArr().filter(needsCompFile);if(!ts.length&&!cs.length&&!teamsArr().some(needsIds))return{t:0,c:0,fail:[]};
    if(snapshot)await takeSnapshot('Before generating game files',true);
    const used=usedTeamSlots();let nt=0,nc=0;const fail=[];
    for(const t of ts){try{const r=await genTeamFile(t,used);if(r.err)fail.push(t.name+': '+r.err);else{nt++;saveTeam(t)}}catch(e){fail.push(t.name+': '+e.message)}}
    const usedC=usedCompIds();for(const c of cs){try{await genCompFile(c,usedC);nc++;saveComp(c)}catch(e){fail.push(c.name+': '+e.message)}}
    const ids=assignIds();
    GF_FAIL=fail;if(!quiet&&(nt||nc||ids.np||ids.nt))toast(`Game files for ${nt} team${nt===1?'':'s'} and ${nc} competition${nc===1?'':'s'}, IDs for ${ids.np} player${ids.np===1?'':'s'}${snapshot?' (a snapshot was saved first)':''}${fail.length?'; '+fail.length+' could not be made':''}`,fail.length?'err':'ok');
    return{t:nt,c:nc,p:ids.np,fail}})();
  try{return await GF_RUN}finally{GF_RUN=null;if(GF_AGAIN){GF_AGAIN=false;setTimeout(()=>ensureGameFiles(),400)}}}
// every save of a team or competition without a file makes one (after a short pause, so a batch is handled together)
let GF_TIMER=null;const gfSoon=()=>{clearTimeout(GF_TIMER);GF_TIMER=setTimeout(()=>ensureGameFiles().then(()=>{if(['export','optionfile','health'].includes(S.ui.view))rerender()}),800)};
{const _on=window.__onSaveTeam;window.__onSaveTeam=t=>{if(_on)_on(t);if(needsTeamFile(t)||needsIds(t))gfSoon()}}
window.__onSaveComp=c=>{if(needsCompFile(c))gfSoon()};
// a team or competition renamed or given new images keeps its file in step: the names inside it follow the in-game ID
// (the export rewrites the file from the studio data, so only the stored names need updating here)
{const _on=window.__onSaveTeam;window.__onSaveTeam=t=>{_on(t);const r=S.teds[t.id];if(r&&r.generated&&+r.tedTeamId){const n=teamFileNames(t,r.tedTeamId);if(JSON.stringify(n)!==JSON.stringify(r.names||{})){r.names=n;r.emblemFile=n.emblem;Store.put('teds',r)}}}}
window.__beforeSaveComp=c=>{if(c.ced&&c.ced.generated&&+c.ced.compId){c.ced.emblemFile=c.emblem?'C_'+String(+c.ced.compId).padStart(4,'0')+'.png':''}};
// the existing project: generated once at start, with a snapshot first
{const _eb=extBoot;extBoot=async function(){await _eb();try{logoJobsPrune()}catch(e){console.error(e)}if(S._loadFailed||!teamsArr().length&&!compsArr().length)return;
  const n=teamsArr().filter(needsTeamFile).length+compsArr().filter(needsCompFile).length+teamsArr().filter(needsIds).length;if(n)setTimeout(()=>ensureGameFiles({snapshot:true,quiet:false}).then(()=>rerender()),1200)}}
// a project loaded from a transfer or baseline gets its files too
{const _x=xferImport;xferImport=async(...a)=>{const r=await _x(...a);if(r)setTimeout(()=>ensureGameFiles({snapshot:false,quiet:false}).then(()=>rerender()),600);return r}}
/* ================= The studio makes every image the game files need =================
   - Crests and competition logos: a team or competition without one gets one drawn from its colours and short name
     (national teams: their flag), stored and marked "generated", so any real image found later replaces it.
   - Kit textures: drawn when files are exported, in PES 2021's kit layout (2048 px, measured on option-file kits), from the
     kit's colours and pattern with the crest on the chest and the sponsor across it; a real kit image always wins.
     They are rendered from the stored kit data rather than stored, so the project stays small.
   Manager photos aren't generated: the game keeps its own. */
const isGenImg=id=>!!(id&&S.images[id]&&S.images[id].generated);
const hasRealImg=id=>!!(id&&S.images[id]&&!S.images[id].generated);
// regions of a PES 2021 kit texture, in pixels of the 2048 × 2048 sheet
const KIT_UV={back:[700,48,646,870],front:[700,1018,646,932],yoke:[519,694,1007,514],sleeveL:[490,730,290,450],sleeveR:[1300,730,260,450],longL:[10,132,680,515],longR:[1357,132,689,515],
  hem:[670,1860,710,90],captain:[0,0,490,110],
  socksL:[10,636,361,519],socksR:[1675,636,365,519],shortsL:[0,1161,647,789],shortsR:[1405,1161,641,789],collar:[670,1950,700,40]};
const KIT_IMG_CACHE=new Map();
async function kitCrest(t){const id=t&&t.emblem;if(!id||!S.images[id])return null;if(KIT_IMG_CACHE.has(id))return KIT_IMG_CACHE.get(id);
  let img=null;try{const b=await Store.getBlob(S.images[id].ref);if(b){const u=URL.createObjectURL(b);img=await loadImage(u);URL.revokeObjectURL(u)}}catch(e){}KIT_IMG_CACHE.set(id,img);return img}
async function kitTextureBlob(t,k,size=2048){const c=await kitTextureCanvas(t,k);
  if(size===2048)return canvasBlob(c);
  const c2=document.createElement('canvas');c2.width=c2.height=size;c2.getContext('2d').drawImage(c,0,0,size,size);return canvasBlob(c2)}
async function kitTextureCanvas(t,k){
  const c=document.createElement('canvas');c.width=c.height=2048;const x=c.getContext('2d');const d=k.design||{};
  const o={shirt:hexOr(k.shirt,'#1f4fd1'),second:hexOr(k.second,'#ffffff'),pattern:d.pattern||'plain',n:d.n||5};
  const trim=hexOr(d.trim||(k.second&&k.second.toLowerCase()!==o.shirt.toLowerCase()?k.second:k.shorts),'#ffffff');
  const shorts=hexOr(k.shorts,'#ffffff'),socks=hexOr(k.socks||k.shorts,'#ffffff');
  const R=(r,col)=>{const [X,Y,W,H]=KIT_UV[r];x.fillStyle=col;x.fillRect(X,Y,W,H)};
  x.fillStyle=o.shirt;x.fillRect(0,0,2048,2048);
  ['back','front'].forEach(r=>{const [X,Y,W,H]=KIT_UV[r];fillPattern(x,o,X,Y,W,H)});
  const sl=o.pattern==='sleeves'?o.second:o.shirt;R('longL',sl);R('longR',sl);x.fillStyle=sl;x.fillRect(490,730,210,450);x.fillRect(1346,730,214,450);
  // cuffs at the outer end of each sleeve, collar strip, shorts with a waistband, socks with a top band
  x.fillStyle=trim;x.fillRect(10,132,36,515);x.fillRect(2010,132,36,515);x.fillRect(490,730,30,450);x.fillRect(1530,730,30,450);R('hem',o.shirt);
  x.strokeStyle=trim;x.lineWidth=24;x.beginPath();x.ellipse(1010,980,92,74,0,0,7);x.stroke();x.fillStyle='#16181d';x.beginPath();x.ellipse(1010,980,80,62,0,0,7);x.fill();
  R('shortsL',shorts);R('shortsR',shorts);x.fillStyle=trim;x.fillRect(625,1161,22,789);x.fillRect(1405,1161,22,789);
  R('socksL',socks);R('socksR',socks);x.fillStyle=trim;x.fillRect(10,636,361,40);x.fillRect(1675,636,365,40);
  // crest on the left chest, sponsor across the chest
  const em=await kitCrest(t);if(em){const s=110;x.drawImage(em,1145-s/2,1140-s/2,s,s)}
  if(k.sponsor){x.fillStyle=hexOr(d.sponsorColor||k.numberColor,o.shirt.toLowerCase()==='#ffffff'?'#111111':'#ffffff');x.textAlign='center';x.textBaseline='middle';
    let fs=96;x.font=`800 ${fs}px "Barlow Condensed", "Arial Narrow", sans-serif`;const s=String(k.sponsor).toUpperCase();while(x.measureText(s).width>420&&fs>30){fs-=4;x.font=`800 ${fs}px "Barlow Condensed", "Arial Narrow", sans-serif`}
    // an outline in the opposite tone keeps it readable on stripes, hoops and any second colour
    const lum=h=>{const v=parseInt(String(x.fillStyle).slice(1),16);return((v>>16&255)*299+(v>>8&255)*587+(v&255)*114)/1000};const dark=lum()<128;
    x.lineJoin='round';x.lineWidth=10;x.strokeStyle=dark?'#ffffff':'#111111';x.strokeText(s,1023,1298);x.fillText(s,1023,1298)}
  return c}
// crest / logo drawn from colours and initials
const initials=n=>String(n||'').split(/\s+/).filter(w=>w&&!/^(fc|cf|sc|ac|afc|club|the|de|of)$/i.test(w)).map(w=>w[0]).join('').toUpperCase().slice(0,3)||'FC';
async function drawCrestBlob(o,size){const c=document.createElement('canvas');c.width=c.height=size;drawEmblem(c.getContext('2d'),o,size);return canvasBlob(c)}
async function genCrest(t){if(isNationalTeam(t)){try{const r=await flagAttach(t);if(r)return 'flag'}catch(e){}}
  const o=defEmblem(t);o.text=(t.short||initials(t.name)).toUpperCase().slice(0,4);const s=S.settings.sizes.emblem||256;
  const rec=await addImageFromBlob(await drawCrestBlob(o,s),'emblem',t.name+' crest (generated)');rec.generated=true;Store.put('images',rec);t.emblem=rec.id;return 'generated'}
async function genCompLogo(c){const o=defEmblem(null);Object.assign(o,{shape:'round',div:c.worldCup?'halves':'hoops',c1:'#0b2a5b',c2:'#16407f',c3:'#f0c24b',ring:'#0b111b',text:(c.short||initials(c.name)).toUpperCase().slice(0,4),stripes:3});
  const s=S.settings.sizes.comp||256;const rec=await addImageFromBlob(await drawCrestBlob(o,s),'comp',c.name+' logo (generated)');rec.generated=true;Store.put('images',rec);c.emblem=rec.id}
// a team file of the option file that names no crest means the game shows its own: nothing is drawn for it, national teams
// included (no flag unless you choose one with "Use flag"); the same for a competition file that names no logo
const ofGameCrest=t=>!!(t&&t.of&&t.of.names&&!t.of.names.emblem);
// RULE: one test for "missing" everywhere (the Missing emblems tab and its count, the free sources, Claude): a slot the option
// file leaves to the game (PES default) is not missing, and nothing is fetched or drawn for it unless the user asks for all.
const pesOwnLogo=c=>!!(c&&(ofGameComp(c)||(c.of&&c.of.ced&&c.of.names&&!c.of.names.emblem)));
const missCrest=t=>!hasRealImg(t.emblem)&&!ofGameCrest(t);const missLogo=c=>!c.legendsGroup&&!hasRealImg(c.emblem)&&!pesOwnLogo(c);// the legends group has no logo, on purpose
// which crests and logos a fill covers: 'missing' = no image of its own; 'notfl' = missing, or not from FootyLogos yet;
// 'all' = every one. A slot the option file leaves to the game (PES default) is covered only by 'all'.
const pesOwnEmblem=x=>Array.isArray(x.players)?ofGameCrest(x):pesOwnLogo(x);
const logoWanted=(x,which)=>which==='all'||(which==='notfl'?(hasRealImg(x.emblem)?!flFromFL(x.emblem):!pesOwnEmblem(x)):(Array.isArray(x.players)?missCrest(x):missLogo(x)));
// what a logo job was asked for (older jobs say it only in their label)
const logoJobWhich=j=>j.which||(/replace all/.test(j.label||'')?'all':/not from FootyLogos/.test(j.label||'')?'notfl':/^missing |missing only/.test(j.label||'')?'missing':'');
// A queued logo job keeps the list it was given. Before it runs (and when the studio opens) the list is checked again, so a
// job queued before a team got its image, or before PES defaults stopped counting as missing, no longer does the whole list.
function logoJobTrim(j){const w=logoJobWhich(j);if(!w||w==='all')return 0;const t0=(j.teamIds||[]).length,c0=(j.compIds||[]).length;
  j.teamIds=(j.teamIds||[]).filter(id=>S.teams[id]&&logoWanted(S.teams[id],w));j.compIds=(j.compIds||[]).filter(id=>S.comps[id]&&logoWanted(S.comps[id],w));return t0+c0-j.teamIds.length-j.compIds.length}
function logoJobsPrune(){let n=0,gone=0;jobsArr().filter(j=>j.type==='logos'&&(j.status==='queued'||j.status==='error')).forEach(j=>{const k=logoJobTrim(j);if(!k)return;n+=k;
    if(!j.teamIds.length&&!j.compIds.length){delete S.jobs[j.id];Store.del('jobs',j.id);gone++}else Store.put('jobs',j)});return{n,gone}}
const ofGameSlot=(t,key)=>!!(t&&t.of&&t.of.names&&!t.of.names[key]);
const ofGameKit=(t,i)=>!!(t&&t.of&&t.of.names&&!(t.of.names.kits||[])[i]);
const missKits=t=>OF_KIT_SLOT.some((s,i)=>{const k=(t.kits||[]).find(z=>z.slot===s);return !(k&&hasRealImg(k.img))&&!ofGameKit(t,i)});
const missCoach=t=>!(t.manager&&t.manager.name)||(!hasRealImg(t.managerPhoto)&&!ofGameSlot(t,'manager'));
const needsCrest=t=>!t.sameAs&&!t.emblem&&!ofGameCrest(t);
const needsLogo=c=>!c.emblem&&!ofGameComp(c)&&!(c.of&&c.of.ced&&c.of.names&&!c.of.names.emblem);
// projects built before this rule: take back the crests, logos, competition files and IDs the studio drew or made for them
{const _eb=extBoot;extBoot=async function(){await _eb();if(S._loadFailed)return;let n=0;
  teamsArr().forEach(t=>{const i=S.images[t.emblem];if(ofGameCrest(t)&&i&&i.generated){t.emblem='';saveTeam(t);delete S.images[i.id];Store.del('images',i.id);Store.delBlob(i.ref);n++}});
  compsArr().forEach(c=>{if(!ofGameComp(c))return;let ch=false;const i=S.images[c.emblem];if(i&&i.generated){c.emblem='';delete S.images[i.id];Store.del('images',i.id);Store.delBlob(i.ref);ch=true}
    if(c.ced&&c.ced.generated){c.ced=null;c.gameId='';ch=true}if(ch){saveComp(c);n++}});
  // flags the studio put on option-file national teams whose file names no crest (once: a flag chosen later stays)
  if(!S.settings.ofFlagsBack1){teamsArr().forEach(t=>{const i=S.images[t.emblem];if(ofGameCrest(t)&&i&&/ flag$/.test(i.name)){t.emblem='';saveTeam(t);n++}});S.settings.ofFlagsBack1=true;saveSettings()}
  // second flags drawn by two image runs at once: a flag no team or competition uses
  const used=new Set([...teamsArr().map(t=>t.emblem),...compsArr().map(c=>c.emblem)]);
  Object.values(S.images).forEach(i=>{if(i.kind==='emblem'&&/ flag$/.test(i.name)&&!used.has(i.id)){delete S.images[i.id];Store.del('images',i.id);Store.delBlob(i.ref);n++}});
  if(n)console.info('Option-file teams and competitions: '+n+' drawn crests, logos, made-up files or unused flags taken back')}}
async function ensureImages(){let n=0;for(const t of teamsArr().filter(needsCrest)){try{await genCrest(t);saveTeam(t);n++}catch(e){console.warn('crest',t.name,e)}}
  for(const c of compsArr().filter(needsLogo)){try{await genCompLogo(c);saveComp(c);n++}catch(e){console.warn('logo',c.name,e)}}return n}
// a real game file wins its ID: a team or competition holding the same ID only because the studio generated it gives it up
// and gets a new one in the next step
function releaseClashingIds(){let n=0;const by=new Map();teamsArr().forEach(t=>{if(!t.sameAs&&+t.gameId)(by.get(+t.gameId)||by.set(+t.gameId,[]).get(+t.gameId)).push(t)});
  by.forEach(ts=>{if(ts.length<2)return;const real=ts.filter(t=>!(S.teds[t.id]&&S.teds[t.id].generated));const gen=ts.filter(t=>S.teds[t.id]&&S.teds[t.id].generated);
    (real.length?gen:gen.slice(1)).forEach(t=>{const r=S.teds[t.id];delete S.teds[t.id];Store.del('teds',t.id);if(r&&r.ref)Store.delBlob(r.ref);t.gameId='';saveTeam(t);n++})});
  const byC=new Map();compsArr().forEach(c=>{if(+c.gameId)(byC.get(+c.gameId)||byC.set(+c.gameId,[]).get(+c.gameId)).push(c)});
  byC.forEach(cs=>{if(cs.length<2)return;const real=cs.filter(c=>c.ced&&!c.ced.generated);const gen=cs.filter(c=>!(c.ced&&!c.ced.generated));
    (real.length?gen:gen.slice(1)).forEach(c=>{c.ced=null;c.gameId='';saveComp(c);n++})});return n}
// anything applied from Import or Review is checked straight away (new files, clashing IDs)
{const _ab=applyBatch;applyBatch=b=>{const r=_ab(b);gfSoon();return r}}
// runs with the game files: before them, so the files name the images
// one image run at a time: two at once drew a second flag or crest for the same team
{const _e=ensureGameFiles;let IMG_RUN=null;ensureGameFiles=async(o={})=>{try{releaseClashingIds()}catch(e){console.warn(e)}
  if(!IMG_RUN)IMG_RUN=ensureImages().catch(e=>console.warn(e)).finally(()=>{IMG_RUN=null});await IMG_RUN;return _e(o)}}
{const _on=window.__onSaveTeam;window.__onSaveTeam=t=>{_on(t);if(needsCrest(t))gfSoon()}}
{const _on=window.__onSaveComp;window.__onSaveComp=c=>{_on(c);if(needsLogo(c))gfSoon()}}
// the kits a team's file names: every kit slot it has (a kit without an image is drawn at export)
teamFileNames=(t,id)=>{const tag=String(id).padStart(6,'0');
  return{emblem:t.emblem?'E_'+tag+'.png':'',manager:t.managerPhoto?'M_'+tag+'.png':'',
    kits:OF_KIT_SLOT.map(sl=>{const k=(t.kits||[]).find(z=>z.slot===sl);return k?'K_'+tag+'_'+(SLOTCODE[sl]||sl)+'.png':''})}};
/* ================= Stadiums, sponsors & press room, managers, extras =================
   The option file's other assets, kept like crests and kits: on the team record, named in the team file, read by Import,
   written by every export, and drawn by the studio when a team has none.
   - Stadium image: the team file's stadium field (1024 × 512).
   - Sponsor boards: the team file's three sponsor fields (256 × 128). Option files use them for sponsor boards
     (AtlasSp1.png) and press-room backdrops (ChelseaPress1Pesuni.png); a league can share one set (Sky1-4.png).
     A competition keeps its shared set too, which can be given to all its teams.
   - Manager photo: the team file's manager field; a team without one gets a drawn placeholder at export.
   - Extras: files an option file carries for people, not the game (credits, help images, league-order sheets),
     kept at their path and written with Partial Export. */
IMG_KINDS.stadium={label:'Stadium image',game:'Stadium',sq:false};
IMG_KINDS.sponsor={label:'Sponsor / press-room board',game:'Sponsor board',sq:false};
{const _k=kindSize;kindSize=kind=>kind==='stadium'?[1024,512]:kind==='sponsor'?[256,128]:_k(kind)}
TEAM_PATHS.push('stadiumImg','sponsorImgs');LABEL.stadiumImg='Stadium image';LABEL.sponsorImgs='Sponsor boards';
{const _sv=sheetVal;sheetVal=(k,v)=>k==='stadiumImg'?(v?imgName(v)||'image':'—'):k==='sponsorImgs'?((Array.isArray(v)?v:[]).map(x=>x?imgName(x)||'image':'—').join(' · ')||'—'):_sv(k,v)}
{const _u=usage;usage=()=>{const u=_u();const add=(id,lbl)=>{if(id)(u[id]=u[id]||[]).push(lbl)};teamsArr().forEach(t=>{add(t.stadiumImg,t.name+' stadium');(t.sponsorImgs||[]).forEach((id,i)=>add(id,t.name+' board '+(i+1)))});compsArr().forEach(c=>(c.sponsorImgs||[]).forEach((id,i)=>add(id,c.name+' board '+(i+1))));return u}}
const spOf=t=>{const a=Array.isArray(t.sponsorImgs)?t.sponsorImgs.slice(0,3):[];while(a.length<3)a.push('');return a};
// picking an image for a slot
{const _a=assignImage;assignImage=(target,imgId,viaForm)=>{const [type,a,b]=target.split(':');
  if(type==='stadium'){const t=S.teams[a];if(t){t.stadiumImg=imgId;saveTeam(t)}return null}
  if(type==='sponsor'){const t=S.teams[a];if(t){const s=spOf(t);s[+b]=imgId;t.sponsorImgs=s;saveTeam(t)}return null}
  if(type==='csponsor'){const c=S.comps[a];if(c){const s=(c.sponsorImgs||[]).slice();s[+b]=imgId;c.sponsorImgs=s;saveComp(c)}return null}
  return _a(target,imgId,viaForm)}}
{const _h=targetHasImage;targetHasImage=target=>{const [k,a,b]=target.split(':');const t=S.teams[a];
  if(k==='stadium')return !!(t&&hasRealImg(t.stadiumImg));if(k==='sponsor')return !!(t&&hasRealImg(spOf(t)[+b]));return _h(target)}}
{const _t=impTargets;impTargets=kind=>kind==='stadium'?teamsArr().map(t=>['stadium:'+t.id,t.name+' stadium']):kind==='sponsor'?teamsArr().flatMap(t=>[0,1,2].map(i=>['sponsor:'+t.id+':'+i,t.name+' sponsor '+(i+1)])):_t(kind)}
IMG_ROLE.stadium='Stadium image';IMG_ROLE.sponsor='Sponsor board';impPlace.stadium='Stadium image';impPlace.sponsor='Sponsor board';
// team files: their sponsor names, and the studio writes stadium and sponsor names into the files it builds
{const _p=TED.parse;TED.parse=raw=>{const r=_p(raw);try{const d=TED.decrypt(raw);r.team.sponsorFiles=[OF_IMG.sp1,OF_IMG.sp2,OF_IMG.sp3].map(o=>TED.readStr(d,o,TED.IMGLEN));r.team.stadiumFile=TED.readStr(d,OF_IMG.stadium,TED.IMGLEN)}catch(e){}return r}}
{const _b=TED.build;TED.build=async(team,tpl,opts={})=>{const o=await _b(team,tpl,opts);if(opts.stadiumFile===undefined&&!opts.sponsorFiles)return o;
  const raw=o.bytes;const d=TED.decrypt(raw);if(opts.stadiumFile!==undefined)TED.writeStr(d,OF_IMG.stadium,TED.IMGLEN,opts.stadiumFile||'');
  (opts.sponsorFiles||[]).forEach((n,i)=>{if(n!==undefined&&i<3)TED.writeStr(d,[OF_IMG.sp1,OF_IMG.sp2,OF_IMG.sp3][i],TED.IMGLEN,n||'')});o.bytes=await TED.encrypt(d,raw);return o}}
// the names a generated team file gives every image (each is written at export, drawn when the team has none)
{const _n=teamFileNames;teamFileNames=(t,id)=>{const n=_n(t,id);const tag=String(id).padStart(6,'0');
  return Object.assign(n,{manager:'M_'+tag+'.png',stadium:'S_'+tag+'.png',sponsors:[1,2,3].map(i=>'P'+i+'_'+tag+'.png')})}}
// Import: images named in a team file go to its stadium and sponsor slots; a board several teams share goes to each
{const _l=tedLinkImages;tedLinkImages=()=>{_l();const st=impState();
  (st.teds||[]).forEach(x=>{const t=x.target&&x.target!=='new'?S.teams[x.target]:null;const T=x.parsed.team;
    const link=(file,kind,target,has,label)=>{const f=String(file||'').toLowerCase();if(!f)return;let im=impNamed(file,x.path);if(!im)return;
      if(im.target&&im.target!==target&&t){const key=target;if(st.images.some(i=>i.cloneOf===im.id&&i.target===key))return;
        im=Object.assign({},im,{id:uid(),cloneOf:im.id,target:key});st.images.push(im)}
      im.kind=kind;im.byFile=true;if(t){im.target=target;im.on=!has}else{im.target='';im.note='used by '+label}};
    link(T.stadiumFile,'stadium',t?'stadium:'+t.id:'',t&&hasRealImg(t.stadiumImg),T.name+' (stadium)');
    (T.sponsorFiles||[]).forEach((f,i)=>link(f,'sponsor',t?'sponsor:'+t.id+':'+i:'',t&&hasRealImg(spOf(t)[i]),T.name+' (sponsor '+(i+1)+')'))})}}
// a new team from a team file keeps its stadium and sponsor images too
{const _s=impTedStep;impTedStep=async ctx=>{await _s(ctx);const st=ctx.st;
  for(const x of (st.teds||[]).filter(x=>x.on&&x.target==='new')){const incT=Object.values(ctx.inc).find(i=>!S.teams[i.id]&&+i.gameId===+x.parsed.team.teamId);if(!incT)continue;const T=x.parsed.team;
    const find=f=>f&&impNamed(f,x.path);
    const sd=find(T.stadiumFile);if(sd&&!incT.stadiumImg){try{incT.stadiumImg=(await addImageFromBlob(sd.blob,'stadium',sd.name)).id}catch(e){}}
    const sp=spOf(incT);for(let i=0;i<3;i++){const im=find((T.sponsorFiles||[])[i]);if(im&&!sp[i]){try{sp[i]=(await addImageFromBlob(im.blob,'sponsor',im.name)).id}catch(e){}}}incT.sponsorImgs=sp}}}
// ---- drawing what a team has no image for ----
const teamCol=t=>[hexOr((t.colors||[])[0],'#1f4fd1'),hexOr((t.colors||[])[1],'#ffffff')];
async function drawStadiumBlob(t){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');const [c1,c2]=teamCol(t);
  const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#0b1a33');g.addColorStop(.55,c1);g.addColorStop(1,'#0b111b');x.fillStyle=g;x.fillRect(0,0,1024,512);
  x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.moveTo(0,300);x.quadraticCurveTo(512,170,1024,300);x.lineTo(1024,380);x.lineTo(0,380);x.closePath();x.fill();
  x.fillStyle='#2f7d32';x.beginPath();x.moveTo(120,512);x.lineTo(300,360);x.lineTo(724,360);x.lineTo(904,512);x.closePath();x.fill();
  x.strokeStyle='rgba(255,255,255,.7)';x.lineWidth=3;x.beginPath();x.moveTo(512,360);x.lineTo(512,512);x.stroke();x.beginPath();x.ellipse(512,440,70,26,0,0,Math.PI*2);x.stroke();
  for(let i=0;i<4;i++){const lx=150+i*240;x.fillStyle='#e6edf7';x.fillRect(lx,40,6,170);x.fillStyle='rgba(255,255,220,.9)';x.fillRect(lx-24,30,54,18)}
  const em=await kitCrest(t);if(em)x.drawImage(em,40,380,110,110);
  x.fillStyle=c2;x.textAlign='center';x.textBaseline='middle';const name=String(t.stadium||t.name).toUpperCase();let fs=64;x.font=`800 ${fs}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  while(x.measureText(name).width>900&&fs>24){fs-=4;x.font=`800 ${fs}px "Barlow Condensed", "Arial Narrow", sans-serif`}x.lineWidth=8;x.strokeStyle='rgba(0,0,0,.6)';x.strokeText(name,512,250);x.fillText(name,512,250);return canvasBlob(c)}
async function drawSponsorBlob(t,i){const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');const [c1,c2]=teamCol(t);
  const bg=[c1,c2,'#111111'][i]||c1,fg=i===1?c1:(bg.toLowerCase()==='#ffffff'?'#111111':'#ffffff');x.fillStyle=bg;x.fillRect(0,0,256,128);
  const k=(t.kits||[]).find(z=>z.sponsor);const text=String(i===2||!k?(t.short||initials(t.name)):k.sponsor).toUpperCase();
  const em=await kitCrest(t);let tx=128;if(em&&i!==1){x.drawImage(em,12,24,80,80);tx=170}
  x.fillStyle=fg;x.textAlign='center';x.textBaseline='middle';let fs=46;x.font=`800 ${fs}px "Barlow Condensed", "Arial Narrow", sans-serif`;const maxW=em&&i!==1?150:230;
  while(x.measureText(text).width>maxW&&fs>14){fs-=2;x.font=`800 ${fs}px "Barlow Condensed", "Arial Narrow", sans-serif`}x.fillText(text,tx,66);return canvasBlob(c)}
async function drawManagerBlob(t){const s=S.settings.sizes.manager||256;const c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d');const [c1,c2]=teamCol(t);
  const g=x.createLinearGradient(0,0,0,s);g.addColorStop(0,c1);g.addColorStop(1,'#0b111b');x.fillStyle=g;x.fillRect(0,0,s,s);
  x.fillStyle='rgba(230,237,247,.85)';x.beginPath();x.arc(s/2,s*.38,s*.17,0,Math.PI*2);x.fill();x.beginPath();x.ellipse(s/2,s*.98,s*.36,s*.34,0,Math.PI,0);x.fill();
  x.fillStyle=c2;x.fillRect(s*.44,s*.62,s*.12,s*.26);return canvasBlob(c)}
// ---- exports ----
{const _h=ofHash;ofHash=t=>{const h=_h(t);const extra=[t.stadiumImg||'',...spOf(t)].filter(Boolean);return extra.length?String(fnv(h+'|'+extra.join(','))):h}}
// ---- free source: stadium photos from TheSportsDB ----
async function artStadiumImg(x,signal,st){if(hasRealImg(x.stadiumImg))return null;const t=await artTsdb(x,signal,st);if(!t||!t.stadiumImg)return null;
  x.stadiumImg=(await artImg('api/tsdb/image?url='+enc(t.stadiumImg),'stadium',x.name+' stadium (TheSportsDB)',signal)).id;return 'TheSportsDB'}
{const _r=runFreeArt;runFreeArt=async(j,signal)=>{const o=new Set(j.opts||[]);if(!o.has('stadiumImgs'))return _r(j,signal);
  const rest=Object.assign({},j,{opts:[...o].filter(k=>k!=='stadiumImgs')});const inc={};let n=0;const st={c:{},wdBusy:false};
  for(const id of j.teamIds||[]){if(signal.aborted)break;const t=S.teams[id];if(!t||isNationalTeam(t))continue;const x=clone(t);try{const s=await artStadiumImg(x,signal,st);if(s){inc[x.id]=x;n++;aiLog('  '+t.name+': stadium photo ('+s+')')}}catch(e){if(e.name==='AbortError')throw e}}
  aiLog('  '+n+' stadium photo'+(n===1?'':'s')+' found');if(n)finishBatch(batchFromData({teams:inc,comps:{}},{title:'Stadium photos'+(j.label?': '+j.label:''),source:'TheSportsDB',removeMissing:false,teamScope:Object.keys(inc)}));
  if(rest.opts.length)return _r(rest,signal)}}
/* ---- the pages: Stadiums, Sponsors & press room, Managers, Extras (same structure as the Live Update tabs) ---- */
const asTeams=key=>{const sc=S.ui['as_'+key]||'';const c=S.comps[sc];return(sc==='__none'?teamsArr().filter(inNoComp):c?compMembers(c):teamsArr()).filter(t=>!t.sameAs)};
const asFilter=(key,label)=>`<div class="row" style="gap:10px;margin-bottom:10px"><label class="f" style="min-width:240px;margin:0">Teams<select data-ch="asScope" data-k="${key}">${artScopeOpts(S.ui['as_'+key])}</select></label>
  <label class="c" style="margin-top:18px"><input type="checkbox" data-ch="asMiss" data-k="${key}" ${S.ui['am_'+key]?'checked':''}> ${label}</label></div>`;
CH.asScope=el=>{S.ui['as_'+el.dataset.k]=el.value;rerender()};CH.asMiss=el=>{S.ui['am_'+el.dataset.k]=el.checked;rerender()};
const asKpi=(n,l,h)=>`<div class="kpi"><span>${l}</span><b>${n}</b><small>${esc(h)}</small></div>`;
const asImg=(id,drawn,own)=>id&&S.images[id]?imgThumb(id):own?pesOwnTag():`<span class="tag t-mov" title="Drawn by the studio when files are exported">${drawn||'drawn'}</span>`;
const asPick=(kind,target,label='Choose…')=>`<button class="sm" data-act="pickImage" data-kind="${kind}" data-target="${target}">${label}</button>`;
ACT.asPreview=async el=>{const t=S.teams[el.dataset.id];if(!t)return;const k=el.dataset.kind;
  const b=k==='stadium'?await drawStadiumBlob(t):k==='manager'?await drawManagerBlob(t):await drawSponsorBlob(t,+el.dataset.i||0);const u=URL.createObjectURL(b);
  modal(`<div class="mhead"><h2>Drawn for ${esc(t.name)}</h2></div><p class="small muted">What the studio writes when ${esc(t.name)} has no ${k==='stadium'?'stadium image':k==='manager'?'manager photo':'sponsor board'} of its own. Choose an image to replace it.</p>
   <div style="text-align:center;background:var(--panel2);padding:12px;border-radius:8px"><img src="${u}" alt="" style="max-width:100%;${k==='manager'?'width:256px':''}"></div><div class="row end" style="margin-top:12px"><button data-act="close">Close</button></div>`)};
ACT.asClear=el=>{const t=S.teams[el.dataset.id];if(!t)return;const k=el.dataset.kind;if(k==='stadium')t.stadiumImg='';else if(k==='manager')t.managerPhoto='';else{const s=spOf(t);s[+el.dataset.i]='';t.sponsorImgs=s}saveTeam(t);rerender()};
ACT.asRun=el=>{if(!efAvailable()){toast('The free databases are reached through the site\'s server: open the studio from start.bat or the website.','err');return}
  const key=el.dataset.k,opts=el.dataset.opts.split(',');const ts=asTeams(key);if(!ts.length){toast('No teams there','err');return}
  const jobs=chunk(ts,25).map((g,i,a)=>({type:'freeArt',teamIds:g.map(t=>t.id),compIds:[],opts,which:'missing',label:el.dataset.label+(a.length>1?' '+(i+1)+'/'+a.length:'')}));queueAdd(jobs);toast('Queued '+ts.length+' teams. Results go to Process and Review.','ok')};
const asFree=(key,title,purpose,opts,label,list)=>`<div class="card" style="margin-bottom:16px"><h3>${title} ${srcTag(false)}</h3>${aiPurpose(purpose)}
  <ul class="srcs">${list.map(([b,s])=>`<li>${srcTag(false)} <span><b>${b}</b> · ${esc(s)}</span></li>`).join('')}</ul>
  <div class="row"><button class="primary" data-act="asRun" data-k="${key}" data-opts="${opts}" data-label="${esc(label)}" ${efAvailable()?'':'disabled'}>Run for the teams below</button><span class="small muted">Only empty ones are filled; results go to Process and Review.</span></div></div>`;

VIEWS.stadiums=()=>{const ts=asTeams('st'),miss=!!S.ui.am_st;const rows=ts.filter(t=>!miss||!hasRealImg(t.stadiumImg)||!t.stadium);const real=ts.filter(t=>hasRealImg(t.stadiumImg)).length;
  return `<h1>Stadiums</h1><p class="sub">Each team's stadium name and the stadium image its team file names (1024 × 512). A team without an image gets one drawn from its colours and stadium name when files are exported.</p>
  <div class="kpis" style="margin-bottom:16px">${asKpi(ts.length,'Teams','in the selection')}${asKpi(ts.filter(t=>t.stadium).length,'Stadium names','')}${asKpi(real,'Stadium images','their own')}${asKpi(ts.filter(t=>!hasRealImg(t.stadiumImg)&&ofOwnSlot(t,'stadium')).length,'PES default','the game shows its own')}${asKpi(ts.filter(t=>!hasRealImg(t.stadiumImg)&&!ofOwnSlot(t,'stadium')).length,'Drawn at export','no image of their own')}</div>
  ${asFree('st','From the free databases','Fill stadium names and stadium photos the teams don\'t have yet.','stadiums,stadiumImgs','Stadiums',[['Names','TheSportsDB, then Transfermarkt, Wikidata'],['Photos','TheSportsDB']])}
  <h2>Teams</h2>${aiPurpose('Pick an image for a team, or see what the studio would draw.')}${asFilter('st','Only teams missing a name or image')}
  ${rows.length?`<div class="tw"><table><thead><tr><th>Image</th><th>Team</th><th>Stadium</th><th></th></tr></thead><tbody>${rows.slice(0,400).map(t=>`<tr><td style="width:120px">${asImg(t.stadiumImg,'',ofOwnSlot(t,'stadium'))}</td><td><b>${esc(t.name)}</b><div class="small muted">${esc(compName(t.compId))}</div></td><td>${t.stadium?esc(t.stadium):'<span class="muted">—</span>'}</td>
   <td class="acts">${asPick('stadium','stadium:'+t.id)}<button class="sm ghost" data-act="asPreview" data-kind="stadium" data-id="${t.id}">Preview drawn</button>${hasRealImg(t.stadiumImg)?`<button class="sm ghost danger" data-act="asClear" data-kind="stadium" data-id="${t.id}">Clear</button>`:''}<button class="sm ghost" data-act="openTeamInfo" data-id="${t.id}">Team</button></td></tr>`).join('')}</tbody></table></div>${rows.length>400?`<p class="small muted">Showing 400 of ${rows.length}; narrow the selection.</p>`:''}`:'<div class="card"><p class="small muted">Nothing to show.</p></div>'}`};

VIEWS.sponsors=()=>{const ts=asTeams('sp'),miss=!!S.ui.am_sp;const rows=ts.filter(t=>!miss||spOf(t).some(x=>!hasRealImg(x)));const filled=ts.filter(t=>spOf(t).every(hasRealImg)).length;
  const cs=compsArr();const cc=S.comps[S.ui.spComp]||cs[0];const set=cc?(cc.sponsorImgs||[]):[];
  return `<h1>Sponsors &amp; press room</h1><p class="sub">The three sponsor boards each team file names (256 × 128). PES 2021 shows them on sponsor boards and as the press-room backdrop, so option files use the same three slots for both. A slot without an image gets a board drawn from the team's colours, crest and kit sponsor when files are exported.</p>
  <div class="kpis" style="margin-bottom:16px">${asKpi(ts.length,'Teams','in the selection')}${asKpi(filled,'All three boards','their own')}${asKpi(ts.length-filled,'Some drawn at export','')}</div>
  <div class="card" style="margin-bottom:16px"><h3>A competition's shared set</h3>${aiPurpose('Keep one set of boards for a whole league, as option files do (Sky Bet boards for every Championship team), and give it to its teams.')}
   ${cc?`<div class="row" style="gap:10px;align-items:flex-end"><label class="f" style="min-width:240px;margin:0">Competition<select data-ch="spComp">${opts(cs.map(c=>[c.id,c.name]),cc.id)}</select></label>
    ${[0,1,2,3].map(i=>`<div style="text-align:center">${set[i]&&S.images[set[i]]?imgThumb(set[i]):'<span class="small muted">empty</span>'}<div>${asPick('sponsor','csponsor:'+cc.id+':'+i,'Board '+(i+1))}</div></div>`).join('')}</div>
    <div class="row" style="margin-top:10px"><button class="primary" data-act="spGive" data-id="${cc.id}" ${set.filter(Boolean).length?'':'disabled'}>Give to its teams' empty slots</button><button data-act="spGive" data-id="${cc.id}" data-all="1" ${set.filter(Boolean).length?'':'disabled'}>Replace all its teams' boards</button></div>`:'<p class="small muted">No competitions yet.</p>'}</div>
  <h2>Teams</h2>${aiPurpose('Each team\'s three boards: pick an image for a slot, or see what the studio would draw.')}${asFilter('sp','Only teams with an empty slot')}
  ${rows.length?`<div class="tw"><table><thead><tr><th>Team</th><th>Board 1</th><th>Board 2</th><th>Board 3</th></tr></thead><tbody>${rows.slice(0,300).map(t=>{const s=spOf(t);return `<tr><td><b>${esc(t.name)}</b><div class="small muted">${esc(compName(t.compId))}</div></td>${[0,1,2].map(i=>`<td>${asImg(s[i],'',ofOwnSlot(t,'sp'+(i+1)))}<div class="row" style="gap:4px;margin-top:4px">${asPick('sponsor','sponsor:'+t.id+':'+i,'Choose')}<button class="sm ghost" data-act="asPreview" data-kind="sponsor" data-i="${i}" data-id="${t.id}">Drawn</button>${hasRealImg(s[i])?`<button class="sm xbtn" data-act="asClear" data-kind="sponsor" data-i="${i}" data-id="${t.id}" aria-label="Clear board ${i+1}">×</button>`:''}</div></td>`).join('')}</tr>`}).join('')}</tbody></table></div>${rows.length>300?`<p class="small muted">Showing 300 of ${rows.length}; narrow the selection.</p>`:''}`:'<div class="card"><p class="small muted">Nothing to show.</p></div>'}`};
CH.spComp=el=>{S.ui.spComp=el.value;rerender()};
ACT.spGive=async el=>{const c=S.comps[el.dataset.id];if(!c)return;const set=(c.sponsorImgs||[]).filter(Boolean).slice(0,3);const all=!!el.dataset.all;const ts=compMembers(c).filter(t=>!t.sameAs);
  if(all&&!await ask('Replace all boards?',`Every team in <b>${esc(c.name)}</b> (${ts.length}) gets this set in its three slots, replacing their own boards.`,'Replace',true))return;
  let n=0;ts.forEach(t=>{const s=spOf(t);let ch=false;for(let i=0;i<3;i++){const v=set[i%set.length];if(all||!hasRealImg(s[i])){if(s[i]!==v){s[i]=v;ch=true}}}if(ch){t.sponsorImgs=s;saveTeam(t);n++}});toast(n+' team'+(n===1?'':'s')+' updated','ok');rerender()};

VIEWS.managers=()=>{const ts=asTeams('mg'),miss=!!S.ui.am_mg;const rows=ts.filter(t=>!miss||!(t.manager&&t.manager.name)||!hasRealImg(t.managerPhoto));const ph=ts.filter(t=>hasRealImg(t.managerPhoto)).length;
  return `<h1>Managers</h1><p class="sub">Each team's manager and the photo its team file names. A team without a photo gets a neutral placeholder in its colours when files are exported, never an invented face.</p>
  <div class="kpis" style="margin-bottom:16px">${asKpi(ts.length,'Teams','in the selection')}${asKpi(ts.filter(t=>t.manager&&t.manager.name).length,'With a manager','name known')}${asKpi(ph,'With a photo','their own')}${asKpi(ts.filter(t=>!hasRealImg(t.managerPhoto)&&ofOwnSlot(t,'manager')).length,'PES default','the game shows its own')}${asKpi(ts.filter(t=>!hasRealImg(t.managerPhoto)&&!ofOwnSlot(t,'manager')).length,'Placeholder at export','no photo of their own')}</div>
  ${asFree('mg','From the free databases','Fill managers\' names and photos the teams don\'t have yet.','coaches','Managers',[['Name and photo','eFootball (real photos only)'],['Name','then Transfermarkt, Wikidata']])}
  <h2>Teams</h2>${aiPurpose('Pick a photo for a manager, or open the team to change the name.')}${asFilter('mg','Only teams missing a name or photo')}
  ${rows.length?`<div class="tw"><table><thead><tr><th>Photo</th><th>Team</th><th>Manager</th><th></th></tr></thead><tbody>${rows.slice(0,400).map(t=>{const m=t.manager||{};return `<tr><td style="width:64px">${asImg(t.managerPhoto,'placeholder',ofOwnSlot(t,'manager'))}</td><td><b>${esc(t.name)}</b><div class="small muted">${esc(compName(t.compId))}</div></td>
   <td>${m.name?esc(m.name):'<span class="muted">—</span>'}<div class="small muted">${esc([m.nat,m.age&&'age '+m.age].filter(Boolean).join(' · '))}</div></td>
   <td class="acts">${asPick('manager','manager:'+t.id)}<button class="sm ghost" data-act="asPreview" data-kind="manager" data-id="${t.id}">Preview placeholder</button>${hasRealImg(t.managerPhoto)?`<button class="sm ghost danger" data-act="asClear" data-kind="manager" data-id="${t.id}">Clear</button>`:''}<button class="sm ghost" data-act="openTeamInfo" data-id="${t.id}">Team</button></td></tr>`}).join('')}</tbody></table></div>${rows.length>400?`<p class="small muted">Showing 400 of ${rows.length}; narrow the selection.</p>`:''}`:'<div class="card"><p class="small muted">Nothing to show.</p></div>'}`};

// ---- Extras: files for people that travel with the package ----
const extrasArr=()=>Object.values(S.images).filter(i=>i.kind==='extra').sort((a,b)=>String(a.path).localeCompare(String(b.path)));
async function addExtra(blob,path){const p=String(path||'').replace(/^\/+/,'');const old=extrasArr().find(x=>x.path===p);const ref=await Store.putBlob(blob,blob.type||'application/octet-stream');
  const rec={id:old?old.id:uid(),kind:'extra',name:p.split('/').pop(),path:p,ref,size:blob.size,type:blob.type||'',createdAt:Date.now()};if(old&&old.ref&&old.ref!==ref)Store.delBlob(old.ref);saveImage(rec);return rec}
VIEWS.extras=()=>{const xs=extrasArr();const on=S.settings.exportExtras!==false;
  return `<h1>Extras</h1><p class="sub">Files an option file carries for people rather than the game: credits, help images, league-order sheets. They're kept at their path and written with Partial Export.</p>
  <div class="card" style="margin-bottom:16px"><h3>Add files</h3>${aiPurpose('Upload files or a whole folder; each keeps its path inside the package.')}
   <div class="row"><label class="chip on" style="cursor:pointer;padding:7px 14px"><input type="file" id="ex-files" multiple style="display:none">Choose files</label><label class="chip" style="cursor:pointer;padding:7px 14px"><input type="file" id="ex-dir" webkitdirectory multiple style="display:none">Choose a folder</label>
    <span class="spacer"></span><label class="c"><input type="checkbox" data-act="exOn" ${on?'checked':''}> Write them with Partial Export</label></div>
   <p class="small muted" style="margin:8px 0 0">Import / Export → Import files also recognises them (credits, help images, league-order sheets) and keeps them here.</p></div>
  <h2>Files <span class="muted small">${xs.length}</span></h2>${aiPurpose('Every extra file and the path it\'s written at.')}
  ${xs.length?`<div class="tw"><table><thead><tr><th>Path</th><th class="num">Size</th><th></th></tr></thead><tbody>${xs.map(x=>`<tr><td class="small" style="overflow-wrap:anywhere">${esc(x.path)}</td><td class="num small">${kb(x.size||0)}</td><td class="acts"><button class="sm ghost danger" data-act="exDel" data-id="${x.id}">Remove</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="card"><p class="small muted">No extra files yet.</p></div>'}`};
ACT.exOn=el=>{S.settings.exportExtras=el.checked;saveSettings()};
ACT.exDel=async el=>{const x=S.images[el.dataset.id];if(!x)return;if(!await ask('Remove '+x.name+'?','It is no longer written with exports.','Remove',true))return;delete S.images[x.id];Store.del('images',x.id);if(x.ref)Store.delBlob(x.ref);rerender()};
document.addEventListener('change',async e=>{if(e.target&&(e.target.id==='ex-files'||e.target.id==='ex-dir')){const fs=[...(e.target.files||[])];e.target.value='';if(!fs.length)return;
  await miniBusy('Adding '+fs.length+' file'+(fs.length===1?'':'s')+'…',async()=>{let i=0;for(const f of fs){busyCount(i++,fs.length);await addExtra(f,f.webkitRelativePath||f.name)}});toast('Added '+fs.length+' file'+(fs.length===1?'':'s'),'ok');rerender()}});
// Partial Export carries them at their path
{const _b=ACT.buildPkg;ACT.buildPkg=async el=>{await _b(el);const b=S.ui.build;if(!b||S.settings.exportExtras===false)return;
  for(const x of extrasArr()){try{const blob=await Store.getBlob(x.ref);if(blob)b.files.push({path:'_Read me/'+x.path,data:blob,size:blob.size,include:true,kind:'doc'})}catch(e){}}rerender()}}
// Import: files for people go to Extras (credits, help images, league-order sheets, text notes)
const isExtraPath=p=>/(^|\/)(orden de ligas|im[aá]genes de ayuda|imagenes de ayuda|help|ayuda|credits?|creditos)(\/|\.|$)/i.test(p)||/^([^/]+\/)?[^/]+\.(txt|pdf|md)$/i.test(p)&&!/\.(csv|tsv)$/i.test(p);
{const _in=impIntake;impIntake=async(blob,path)=>{if(/thumbs\.db$|desktop\.ini$/i.test(path))throw new Error('a Windows system file, not part of the game data');
  if(isExtraPath(path)&&!/\.(ted|ced|csv|tsv|xlsx?|json|zip)$/i.test(path)){const st=impState();(st.extras=st.extras||[]).push({id:uid(),path:impPkgPath(path),blob,on:true});return}
  return _in(blob,path)}}

// Import: extra files appear in the list, are installed with the rest and skipped when the same file is already kept
{const _r=impRoles;impRoles=()=>{const rows=_r();const st=impState();(st.extras||[]).forEach(x=>{const have=extrasArr().find(e=>e.path===x.path&&e.size===x.blob.size);
  rows.push({file:x.path,role:x.why?'Not matched':'Extra file (for people)',on:x.on&&!have,to:'Extras',where:'Kept at its path; written with Partial Export'+(x.why?' ('+x.why+')':''),status:have?'already in your system':''})});return rows}}
{const _c=ACT.impCheck;ACT.impCheck=async()=>{await _c();const P=S.ui.impPlan;const st=impState();if(!P)return;
  (st.extras||[]).forEach(x=>{if(extrasArr().some(e=>e.path===x.path&&e.size===x.blob.size))return;P.deferred.push({fn:()=>addExtra(x.blob,x.path),label:(x.why?'Not matched: ':'Extra file ')+x.path+' is kept with the project as an extra file',meta:{},on:x.on!==false})});
  // an image no game file or name points to is kept the same way, never dropped
  impLooseImages().forEach(i=>{const p=impPkgPath(i.path);if(extrasArr().some(e=>e.path===p&&e.size===i.blob.size))return;P.deferred.push({fn:()=>addExtra(i.blob,p),label:'Not matched: image '+p+' is kept with the project as an extra file',meta:{},on:true})});rerender()}}
const impLooseImages=()=>impState().images.filter(i=>i.on&&!i.target&&!(i.note&&/^used by /.test(i.note)));

/* ================= Import: files are linked by the names inside the game files ================= */
// The game accepts any file name for any file type. A team file (.ted) names its crest, five kits, manager photo, stadium image and
// three sponsor boards; a competition file (.ced) names its logo. Import follows those names. A file's own name and folder never
// decide what it is when a game file names it; they only pick the nearest copy when two files share a name.
const impBase=n=>String(n||'').split('/').pop().trim().toLowerCase();
const impStem=n=>impBase(n).replace(/\.(png|jpe?g|webp|gif|bmp|dds)$/i,'');
function impNamed(file,from,list){const f=impBase(file);if(!f)return null;const a=(list||impState().images||[]).filter(i=>!i.cloneOf);
  let hits=a.filter(i=>impBase(i.name)===f);if(!hits.length){const s=impStem(file);hits=a.filter(i=>impStem(i.name)===s)}
  if(hits.length<2)return hits[0]||null;const fr=String(from||'');let best=hits[0],bl=-1;
  hits.forEach(i=>{const p=String(i.path||'');let k=0;while(k<p.length&&k<fr.length&&p[k]===fr[k])k++;if(k>bl){bl=k;best=i}});return best}
// the names the game files already in the system give their images (option-file names, kept team files, and the names exports write)
let IMP_NAMES=null;
async function impStoredNames(){const idx=new Map();
  const add=(n,kind,target,owner)=>{const k=impBase(n);if(!k)return;const a=idx.get(k)||[];if(!a.some(z=>z.target===target))a.push({kind,target,owner});idx.set(k,a)};
  const addTeam=(t,N)=>{if(!N)return;add(N.emblem,'emblem','emblem:'+t.id,t.id);add(N.manager,'manager','manager:'+t.id,t.id);add(N.stadium,'stadium','stadium:'+t.id,t.id);
    (N.sponsors||[N.sp1,N.sp2,N.sp3]).forEach((n,i)=>add(n,'sponsor','sponsor:'+t.id+':'+i,t.id));(N.kits||[]).forEach((n,k)=>OF_KIT_SLOT[k]&&add(n,'kit','kit:'+t.id+':'+OF_KIT_SLOT[k],t.id))};
  for(const t of teamsArr()){addTeam(t,t.of&&t.of.names);const r=S.teds[t.id];
    if(r){if(!r.names&&r.ref){try{const n=ofNames(TED.decrypt(TED.unb64(await tedTemplateBytes(r))));r.names={emblem:n.emblem,manager:n.manager,stadium:n.stadium,sponsors:[n.sp1,n.sp2,n.sp3],kits:n.kits};Store.put('teds',r)}catch(e){}}
      addTeam(t,r.names||{emblem:r.emblemFile})}
    let base='';try{base=teamTag(t)||compCode(t.compId)+'_'+(pesName(t.short||shortName(t.name))||'T').toUpperCase().slice(0,6)}catch(e){}
    [teamTag(t),base].filter(Boolean).forEach(b=>addTeam(t,{emblem:'E_'+b+'.png',manager:'M_'+b+'.png',stadium:'S_'+b+'.png',sponsors:[1,2,3].map(i=>'P'+i+'_'+b+'.png'),kits:OF_KIT_SLOT.map(sl=>'K_'+b+'_'+(SLOTCODE[sl]||'X')+'.png')}))}
  for(const c of compsArr()){if(c.of&&c.of.names)add(c.of.names.emblem,'comp','comp:'+c.id,c.id);if(c.ced)add(c.ced.emblemFile,'comp','comp:'+c.id,c.id);
    const tg=compTag(c)||compCode(c.id);add('C_'+tg+'.png','comp','comp:'+c.id,c.id)}
  IMP_NAMES=idx;return idx}
// a team file read on import keeps every name it gives, so later images find their team without decrypting it again
{const _s=tedSaveTemplate;tedSaveTemplate=async(id,P,b64,file)=>{const r=await _s(id,P,b64,file);const T=P.team||{};
  r.names={emblem:T.emblemFile||'',manager:T.managerFile||'',stadium:T.stadiumFile||'',sponsors:(T.sponsorFiles||[]).slice(0,3),kits:(T.kitFiles||[]).slice(0,5)};Store.put('teds',r);IMP_NAMES=null;return r}}
{const _r=impReadFiles;impReadFiles=async files=>{try{await impStoredNames()}catch(e){console.error(e)}return _r(files)}}
{const _l=tedLinkImages;tedLinkImages=()=>{const st=impState();
  // 1. a file a game file names is game data, even in a folder that looks like help or credits
  const wanted=[];(st.teds||[]).forEach(x=>{const T=x.parsed.team;[T.emblemFile,T.managerFile,T.stadiumFile,...(T.sponsorFiles||[]),...(T.kitFiles||[])].forEach(f=>f&&wanted.push([f,x.path]))});
  (st.ceds||[]).forEach(x=>x.parsed.emblemFile&&wanted.push([x.parsed.emblemFile,x.path]));
  wanted.forEach(([f,from])=>{if(impNamed(f,from))return;const ex=(st.extras||[]).filter(e=>/\.(png|jpe?g|webp|gif|bmp)$/i.test(e.path)).map(e=>({id:e.id,path:e.path,name:e.path.split('/').pop(),blob:e.blob}));
    const e=impNamed(f,from,ex);if(!e)return;st.extras=st.extras.filter(z=>z.id!==e.id);st.images.push({id:uid(),blob:e.blob,path:e.path,name:e.name,w:0,h:0,url:URL.createObjectURL(e.blob),on:true})});
  st.images.forEach(i=>{if(!i.cloneOf){i.byFile=false;i.bySystem=''}});
  _l();
  // 2. an image no imported game file names: a game file already in the system may name it
  const idx=IMP_NAMES||new Map();const anyGame=(st.teds||[]).length+(st.ceds||[]).length>0;
  st.images.slice().forEach(i=>{if(i.byFile||i.cloneOf)return;const hits=(idx.get(impBase(i.name))||idx.get(impStem(i.name)+'.png')||[]).filter(h=>S.teams[h.owner]||S.comps[h.owner]);
    if(hits.length&&(hits.length===1||hits.every(h=>h.kind==='sponsor'))){
      hits.forEach((h,n)=>{const im=n?Object.assign({},i,{id:uid(),cloneOf:i.id}):i;im.kind=h.kind;im.target=h.target;im.byFile=true;
        const o=S.teams[h.owner]||S.comps[h.owner];im.bySystem=(o?o.name+'\'s':'its')+(S.comps[h.owner]?' competition':' team')+' file in your system';im.on=!targetHasImage(h.target);if(n)st.images.push(im)});return}
    // 3. nothing names it: the game would not use it, so when game files came with it, it is left out (it can still be ticked)
    if(anyGame&&i.on!==false&&!i.userOn){i.on=false;i.note='no team or competition file names it'}})}}
// what the person ticks or chooses for an image stays as they set it
{const _o=ACT.impImgOn;ACT.impImgOn=el=>{const it=impState().images.find(x=>x.id===el.dataset.id);if(it)it.userOn=true;return _o(el)}}
{const _t=CH.impImgTarget;CH.impImgTarget=el=>{const it=impState().images.find(x=>x.id===el.dataset.id);if(it)it.userOn=true;return _t(el)}}

/* ================= A player plays for his club and his national team ================= */
// PES 2021 has every player in one club and in his national team at the same time, under the same player ID (national squads
// call up club players). The studio keeps two records, one per team, each with its own studio id and the same game ID.
// Nothing moves a player between a club and a national team. Two clubs can't share a player: the health check asks where he stays.
function natSplit(){const clubIds=new Set();teamsArr().forEach(t=>{if(!isNationalTeam(t))(t.players||[]).forEach(p=>clubIds.add(p.id))});let n=0,teams=0;
  teamsArr().forEach(t=>{if(!isNationalTeam(t))return;let ch=false;const own=new Set();
    (t.players||[]).forEach(p=>{if(clubIds.has(p.id)||own.has(p.id)){p.id=uid();ch=true;n++}own.add(p.id)});if(ch){saveTeam(t);teams++}});
  if(n){console.info('National teams: '+n+' players given their own record in '+teams+' teams');toast(n+' national-team player'+(n===1?'':'s')+' now have a record of their own, separate from their team','ok')}
  try{if(Object.keys(S.teams).length)ensureWorldCup()}catch(e){}return n}
{const _e=extBoot;extBoot=async()=>{try{await flagIndex()}catch(e){}await _e();if(!S._loadFailed){try{natSplit()}catch(e){console.error(e)}}}}
// "Apply all suggested actions" on a group: the first fix of each row that is safe to run for many teams at once (opening a team,
// setting an ID by hand or dropping a file stay one by one). One confirmation, one entry in the change history, one message.
const HC_BULK=new Set(['dedupeTeam','fixNumbers','fixShort','fixNames','useFileId','unlinkTed','efTeam','claudeTeam','efFill','claudeFill','efIds','efImg','flagOne','rateTeam','pfLink']);
const hcBulkList=items=>{const seen=new Set();const out=[];items.forEach(i=>{const a=hcActs(i).find(x=>HC_BULK.has(x.a));if(a&&!seen.has(a.a+'|'+a.id)){seen.add(a.a+'|'+a.id);out.push(a)}});return out};
ACT.hcBulk=async el=>{const items=(S.ui.hcGroups||{})[el.dataset.hk]||[];const list=hcBulkList(items);if(!list.length)return;
  const by=new Map();list.forEach(a=>{const l=a.a==='pcGive'?'Give a free player code':a.a==='pfLink'?'Link the player to the record he has at his team':a.a==='fixShort'?'Fix the short name':a.a==='fixNames'?'Shorten names':a.label||a.a;by.set(l,(by.get(l)||0)+1)});
  const queued=list.some(a=>!['pcGive','pfLink','dedupeTeam','fixNumbers','fixShort','fixNames','useFileId','unlinkTed'].includes(a.a));
  if(!await ask('Apply all suggested actions?',`<ul style="margin:0 0 8px;padding-left:18px">${[...by].map(([l,n])=>`<li><b>${esc(l)}</b> for ${hcPl(n,/player/.test(l)?'player':'team')}</li>`).join('')}</ul>${queued?'Look-ups are queued and their results wait in Process and Review. ':''}Changes made here can be undone from the change history.`,'Apply '+list.length))return;
  const t0=toast;let n=0;toast=()=>{};RR_HOLD++;
  try{await histLabelAsync('Health check: '+list.length+' suggested actions','Health',async()=>{
      const ef=list.filter(a=>a.a==='efTeam').map(a=>S.teams[a.id]).filter(Boolean);if(ef.length){efQueueTeams(ef,'health check');n+=ef.length}
      const fl=list.filter(a=>a.a==='flagOne').map(a=>S.teams[a.id]).filter(Boolean);if(fl.length){queueFlags(fl);n+=fl.length}
      {const pc=list.filter(a=>a.a==='pcGive').map(a=>a.id);if(pc.length)n+=pcGiveMany(pc)}
      for(const a of list){if(a.a==='efTeam'||a.a==='flagOne'||a.a==='pcGive')continue;const t=S.teams[a.id];
        try{if(a.a==='dedupeTeam'){if(t){dedupeApply(t,dedupePlan(t));n++}}
          else if(a.a==='fixNumbers'){if(t){renumber(t);saveTeam(t);n++}}
          else if(a.a==='fixShort'){if(t){t.short=short3(t);saveTeam(t);n++}}
          else if(a.a==='fixNames'){if(t){fixNamesTeam(t);n++}}
          else{await ACT[a.a]({dataset:{id:a.id}});n++}}catch(e){console.error(e)}}})}
  finally{toast=t0;RR_HOLD--;RR_PEND=false}
  toast(hcPl(n,'action')+' started'+(queued?'; look-ups are queued and their results wait in Process and Review':''),'ok');rerender()};
/* ================= Same player in two clubs: find the club he plays for ================= */
// One queued job looks up every player at once and ends with exactly one suggestion per player:
//   keep him at one of his clubs, move him to the club he plays for (when that club is in the studio), move him to the last club of
//   his career that is in the studio, or remove him from his clubs when nothing is known.
// eFootball is asked by game ID (40 players per request), then the Transfermarkt dataset by name and age (one request for all);
// whoever they can't place at a club in the studio goes to Claude, 15 players per request, with the clubs of his career newest first.
// For a season other than the current one only Claude is asked. Nothing changes until a suggestion is applied (national teams are
// never touched); suggestions are kept per season in this browser. Progress shows in the bar like every other queued job.
const DP_CLAUDE_BATCH=15;
const dpClubs=a=>a.filter(x=>!isNationalTeam(x.t));
const dpGroups=()=>findDuplicatePlayers().filter(a=>dpClubs(a).length>1);
const dpGid=a=>a.map(x=>validGameId(x.p.gameId)?+x.p.gameId:x.p.ted&&validGameId(x.p.ted.pid)?+x.p.ted.pid:0).find(Boolean)||0;
const dpKey=a=>norm(a[0].p.name)+'|'+(dpGid(a)||a[0].p.age||'');
const DP_ANS=answerStore('pes21.dpFind2.','dpCache');function dpStore(season){return DP_ANS.get(season)}function dpSave(season){DP_ANS.save(season)}
const dpNow=season=>String(season||S.settings.season)>=currentSeason();
const dpJob=()=>jobsArr().find(j=>j.type==='dupClubs'&&(j.status==='queued'||j.status==='running'));
// a club a platform names, among the player's clubs: by the platform's own link for the team, else by name
function dpMatch(name,cl,id,kind){const by=id?cl.filter(x=>kind==='ef'?+x.t.efId===+id:String(x.t.tmId||'')===String(id)):[];if(by.length===1)return by[0].t;if(by.length>1)cl=by;// two teams carrying the same link: the name decides
  let best=null,bs=0;cl.forEach(x=>{const sc=Math.max(strictName(name,x.t.name),nameScore(name,x.t.name)>=0.9?0.9:0);if(sc>bs){bs=sc;best=x.t}});return bs>=0.85?best:null}
// any club in the studio (not a national team): by the platform's link when exactly one club has it, else by name
function dpSystemClub(name,id,kind){const ok=t=>t&&!isNationalTeam(t)&&!t.sameAs;
  if(id){const by=teamsArr().filter(t=>ok(t)&&(kind==='ef'?+t.efId===+id:String(t.tmId||'')===String(id)));if(by.length===1)return by[0]}
  if(!name)return null;const t=findClub(name);if(ok(t)&&(strictName(name,t.name)>=0.85||norm(t.name)===norm(name)))return t;return null}
// one suggestion from a club name: keep (one of his clubs), move (another club in the studio) or nothing
function dpFromClub(a,name,id,kind,src,note){const cl=dpClubs(a);const k=dpMatch(name,cl,id,kind);if(k)return{action:'keep',teamId:k.id,src,note};
  const m=dpSystemClub(name,id,kind);if(m)return{action:'move',teamId:m.id,src,note};return null}
// an answer that names no club: nothing known, or a player who has none now (a free agent, retired). Never a team to move him to
const noClub=s=>/^(unknown|none|n\/a|)$|^(a )?free agent|^without a club|^unattached|^retired|^no club|^released/i.test(String(s||'').trim());
// Claude's own knowledge fell short for a list of players (then the web is searched, rule "Sources in order"): no club for one
// of them, or a low confidence
const PLAYERS_UNSURE=r=>(r&&Array.isArray(r.players)?r.players:[]).some(x=>/^(unknown|none|n\/a|)$/i.test(String(x.club||'').trim())||x.confidence==='low')?'did not place every player':(r&&Array.isArray(r.players)&&r.players.length?'':'had nothing');
async function runDupClubs(j,signal){const season=j.season||S.settings.season,st=dpStore(season),keys=new Set(j.keys||[]);
  const groups=dpGroups().filter(a=>keys.has(dpKey(a)));if(!groups.length){aiLog('  Nothing left to look up');return}
  const platforms=dpNow(season)&&efAvailable();const result=new Map();const hint=new Map();const down=[];// sources that could not be reached, with why
  const gids=platforms?[...new Set(groups.map(dpGid).filter(Boolean))]:[];const efChunks=Math.ceil(gids.length/40);
  progSetTotal(efChunks+(platforms?1:0)+Math.ceil(groups.length/DP_CLAUDE_BATCH));
  if(platforms){
    // 1. eFootball, 40 players per request
    let idx=null;try{idx=await efIndex(signal)}catch(e){if(e.name==='AbortError')throw e}
    const ef=await efPlayersByIds(gids,signal,{soft:true,down,step:progStep});if(signal.aborted)return;
    groups.forEach(a=>{const r=ef.get(dpGid(a));if(!r||!+r.team)return;const nm=efTeamName(idx,r.team);
      const s=dpFromClub(a,nm,r.team,'ef','eFootball','eFootball lists him at '+(nm||'team '+r.team));if(s)result.set(dpKey(a),s);else if(nm)hint.set(dpKey(a),'eFootball lists him at '+nm)});
    // 2. Transfermarkt, every name in one request
    const rest=groups.filter(a=>!result.has(dpKey(a)));
    if(rest.length){aiLog('Transfermarkt: '+rest.length+' players…');
      try{const tm=await tmPlayersByNames(rest.map(a=>a[0].p.name),signal);
        rest.forEach(a=>{const hits=tmByClub(tmAgeFits(tm.get(a[0].p.name),[...new Set(a.map(x=>+x.p.age).filter(Boolean))]));
          if(hits.length!==1)return;const x=hits[0];const s=dpFromClub(a,x.club.name,x.club.id,'tm','Transfermarkt','Transfermarkt lists him at '+x.club.name);
          if(s)result.set(dpKey(a),s);else hint.set(dpKey(a),[hint.get(dpKey(a)),'Transfermarkt lists him at '+x.club.name].filter(Boolean).join('; '))})}
      catch(e){if(e.name==='AbortError')throw e;down.push(['Transfermarkt',e.message]);aiLog('  Could not connect to Transfermarkt: '+e.message)}}
    progStep();aiLog('  Platforms placed '+result.size+' of '+groups.length)}
  groups.forEach(a=>{const k=dpKey(a);if(result.has(k))st[k]=Object.assign(result.get(k),{at:Date.now()})});dpSave(season);
  // 3. Claude, for everyone left, in batches: the club he plays for and the clubs before it, newest first
  const left=groups.filter(a=>!result.has(dpKey(a)));progSetTotal(efChunks+(platforms?1:0)+Math.ceil(left.length/DP_CLAUDE_BATCH));
  for(let i=0;i<left.length;i+=DP_CLAUDE_BATCH){if(signal.aborted)return;const chunk=left.slice(i,i+DP_CLAUDE_BATCH);
    aiLog('Claude: players '+(i+1)+'–'+(i+chunk.length)+' of '+left.length+' for '+season+'…');
    const list=chunk.map((a,n)=>{const p=a[0].p;return{key:'p'+n,name:p.name,age:p.age||undefined,nationality:p.nat||undefined,position:p.pos||undefined,listedAt:dpClubs(a).map(x=>x.t.name),known:hint.get(dpKey(a))||undefined}});
    let res={};try{res=await aiJSON(`Football data check for season ${season}. Each player below is listed at more than one club ("listedAt"); "known" is what a player database says, when it says anything.
For each player give the club he is registered with in season ${season} (after the summer transfer window; a player on loan counts for the club he is on loan at), which may be a club not in "listedAt", and his previous clubs, newest first.
Players: ${JSON.stringify(list)}
Reply with JSON only: {"players":[{"key":"p0","club":"<club name, or unknown>","previous":["<club before it>","<the one before>"],"confidence":"high|medium|low","note":"<one short sentence, e.g. left X for Y in July 2024>"}]}
Do not guess: when you cannot tell where a player is registered this season, give "club":"unknown" for him.`,signal,{escalate:PLAYERS_UNSURE})}
    catch(e){if(e.name==='AbortError')throw e;claudeDown(e,down,st,chunk.map(dpKey));dpSave(season);continue}
    const by=new Map((Array.isArray(res.players)?res.players:[]).map(r=>[r.key,r]));
    chunk.forEach((a,n)=>{const r=by.get('p'+n)||{};const conf=r.confidence&&r.confidence!=='high'?' ('+r.confidence+' confidence)':'';const why=r.note?'Claude: '+r.note+conf:'Claude'+conf;
      const club=noClub(r.club)?'':String(r.club);let s=club?dpFromClub(a,club,0,'','Claude',why):null;
      if(!s){for(const c of (Array.isArray(r.previous)?r.previous:[])){const x=dpFromClub(a,String(c||''),0,'','Claude',why);if(x){s=Object.assign(x,{last:true,note:why+' · '+String(c)+' is his last team in the studio'});break}}}
      if(!s)s={action:'remove',src:'Claude',note:club||(r.previous||[]).length?why+' · none of his teams are in the studio':'Nothing is known about him'+(conf?' ·'+conf:'')};
      st[dpKey(a)]=Object.assign(s,{at:Date.now()})});dpSave(season)}
  // the last line is what the task reports on Process and Review. "Searched and found nothing" and "could not connect" are
  // different answers: the first names the sources that were searched, the second the source that could not be reached and why.
  const v=groups.map(a=>st[dpKey(a)]).filter(Boolean),got=v.filter(r=>r.action&&!r.err),unasked=v.filter(r=>r.down).length,none=groups.length-got.length-unasked;
  const searched=[platforms&&!down.some(d=>d[0]==='eFootball')?'eFootball':'',platforms&&!down.some(d=>d[0]==='Transfermarkt')?'Transfermarkt':'',left.length&&!down.some(d=>d[0]==='Claude')?'Claude':''].filter(Boolean);
  aiLog('  '+[searched.length?'Searched '+searched.join(', ')+' for '+groups.length+' player'+(groups.length===1?'':'s'):'',
    got.length?'suggestions for '+got.length+' are in Health check ('+['keep','move','remove'].map(x=>got.filter(r=>r.action===x).length+' '+x).join(', ')+')':searched.length?'no team found for any of them':'',
    none>0&&got.length?none+' had no team in any source':''].filter(Boolean).join(': ').replace(/: (\d+ had)/,'; $1')
    +down.map(([n,w])=>'. COULD NOT CONNECT to '+n+(n==='Claude'&&unasked?', so '+unasked+' player'+(unasked===1?' was':'s were')+' not looked up there':'')+': '+w).join(''));
  if(S.ui.view==='health')rerender()}
JOB_KIND.dupClubs='Players in two teams';
const DP_AGE_DRIFT=Math.max(2,new Date().getFullYear()-2020+1);// how much older than his age in the game file (PES 2021: 2020) a player can be by now
JOB_RUN.dupClubs=async(j,signal)=>{await runDupClubs(j,signal)};
function dpQueue(keys){if(!keys.length){toast('Every player already has a suggestion','ok');return}if(dpJob()){toast('A search is already queued; follow it in the progress bar','err');return}
  queueAdd([{type:'dupClubs',keys,season:S.settings.season,label:'Right team for '+hcPl(keys.length,'player')+' in two teams ('+S.settings.season+')'}]);
  toast('Queued: '+hcPl(keys.length,'player')+'. Follow it in the progress bar.','ok')}
const dpByKey=k=>dpGroups().find(a=>dpKey(a)===k);
ACT.dpFindOne=el=>{delete dpStore()[el.dataset.k];dpSave();dpQueue([el.dataset.k])};
ACT.dpFindAll=()=>{const st=dpStore();dpQueue(dpGroups().map(dpKey).filter(k=>!st[k]||st[k].err||!st[k].action))};
// a suggestion that still fits the squads as they are now
function dpSug(a){const r=dpStore()[dpKey(a)];if(!r||!r.action)return null;if(r.action==='remove')return r;const t=S.teams[r.teamId];if(!t||isNationalTeam(t))return null;
  if(r.action==='keep'&&!dpClubs(a).some(x=>x.t.id===t.id))return null;return r}
const dpLabel=(a,r)=>r.action==='keep'?'Keep at '+(S.teams[r.teamId].short||S.teams[r.teamId].name):r.action==='move'?'Move to '+S.teams[r.teamId].name:'Remove from his teams';
// apply one suggestion: keep him at one club, move him to another (the most complete entry goes, once), or take him out of every club
function dpApplyOne(a,r){const cl=dpClubs(a);
  if(r.action==='keep'){cl.forEach(x=>{if(x.t.id!==r.teamId){x.t.players=x.t.players.filter(p=>p.id!==x.p.id);saveTeam(x.t)}});return}
  const best=cl.slice().sort((x,y)=>playerScore(y.p)-playerScore(x.p)||ovr(y.p)-ovr(x.p))[0];
  cl.forEach(x=>{x.t.players=x.t.players.filter(p=>p.id!==x.p.id);saveTeam(x.t)});
  if(r.action==='move'){const t=S.teams[r.teamId];const gid=dpGid(a);
    if(!(t.players||[]).some(p=>(gid&&(+p.gameId===gid||(p.ted&&+p.ted.pid===gid)))||norm(p.name)===norm(best.p.name))){const p=clone(best.p);
      if(p.number&&(t.players||[]).some(q=>+q.number===+p.number))p.number='';t.players=[...(t.players||[]),p];saveTeam(t)}}}
ACT.dpApply=el=>{const a=dpByKey(el.dataset.k);const r=a&&dpSug(a);if(!r)return;const name=a[0].p.name,label=dpLabel(a,r);
  histLabel(name+': '+label,'Health',()=>dpApplyOne(a,r));toast(name+': '+label.toLowerCase(),'ok');rerender()};
ACT.dpApplyAll=async()=>{const list=dpGroups().map(a=>[a,dpSug(a)]).filter(([,r])=>r);if(!list.length)return;const c=x=>list.filter(([,r])=>r.action===x).length;
  if(!await ask('Apply all suggested actions?',`<ul style="margin:0 0 8px;padding-left:18px">${[['keep','stay at one of their teams and leave the others'],['move','move to the team they play for, or their last team in the studio'],['remove','are taken out of their teams (nothing is known about them)']].filter(([x])=>c(x)).map(([x,t])=>`<li><b>${c(x)}</b> player${c(x)===1?'':'s'} ${t}</li>`).join('')}</ul>National teams are not touched. You can undo this from the change history.`,'Apply '+list.length))return;
  histLabel('Health check: players in two teams','Health',()=>list.forEach(([a,r])=>dpApplyOne(a,r)));toast('Applied '+list.length,'ok');rerender()};
// every player in two clubs stays at the club with the smallest squad and leaves the others; squads are counted as they are
// when his turn comes, so one big squad gives players to several small ones (tie: the club where he is rated higher)
const dpSmallest=a=>dpClubs(a).slice().sort((x,y)=>(x.t.players||[]).length-(y.t.players||[]).length||ovr(y.p)-ovr(x.p))[0];
ACT.dpSmallAll=async()=>{const L=dpGroups();if(!L.length)return;
  const prev=L.slice(0,10).map(a=>{const k=dpSmallest(a);return`<li><b>${esc(a[0].p.name)}</b>: kept at ${esc(k.t.name)} (${(k.t.players||[]).length} players), leaves ${dpClubs(a).filter(x=>x!==k).map(x=>esc(x.t.name)+' ('+(x.t.players||[]).length+')').join(', ')}</li>`}).join('');
  if(!await ask('Keep '+L.length+' players at the smaller team?',`Each of the <b>${L.length}</b> player${L.length===1?'':'s'} in two teams stays at the team with the fewest players and leaves the others. Teams are counted as each player's turn comes, so the numbers even out as it goes.<ul class="small">${prev}${L.length>10?`<li>… and ${L.length-10} more</li>`:''}</ul>National teams are not touched. A snapshot is taken first, and you can undo it from the change history.`,'Keep '+L.length))return;
  await takeSnapshot('Before keeping '+L.length+' players in two teams at the smaller team',true);let n=0;
  histLabel('Health check: '+L.length+' players in two teams kept at the smaller team','Health',()=>L.forEach(a=>{if(dpClubs(a).filter(x=>(x.t.players||[]).includes(x.p)).length<2)return;const k=dpSmallest(a);dpApplyOne(a,{action:'keep',teamId:k.t.id});n++}));
  toast(n+' player'+(n===1?'':'s')+' kept at the smaller team','ok');rerender()};
// the buttons beside the section title
function dpHeadBtns(dp){if(!dp.length)return'';const st=dpStore(),job=dpJob();const sug=dp.filter(dpSug).length,todo=dp.filter(a=>!dpSug(a)).length;
  return (job?`<span class="small muted" role="status">${job.status==='running'?'Searching':'Queued'}… progress is in the bar</span>`:todo?`<button class="sm${sug?'':' primary'}" data-act="dpFindAll" title="eFootball and Transfermarkt first, then Claude, in one queued job">Search for the right team (${todo})</button>`:'')+
    (sug&&!job?`<button class="sm primary" data-act="dpApplyAll">Apply all suggested actions (${sug})</button>`:'')+
    (job?'':`<button class="sm" data-act="dpSmallAll" title="Each player stays at the team with the fewest players and leaves the others">Keep all at the smaller team (${dp.length})</button>`)}
/* ================= A player with an ID no game file has: find his team (rule book "A player with an ID no game file has") =================
   He is never offered another player's ID. One queued job looks up the team he plays for: eFootball by his ID, the Transfermarkt
   dataset by name and age, then Claude for whoever is left. The answer is kept per player and season in this browser; nothing in
   the project changes until it is applied in his row:
     the game has him at that team and nobody uses the record  → Link his record
     someone is already on that record                         → Replace that player, or Remove this one (a choice, never bulk)
     the game has no record of him there                       → by hand: Move to a team, or Remove him
   "With an ID" means a real one (pcHasId): the studio's placeholder for a created player counts as no ID. */
const pfKey=()=>'pes21.pfFind.'+S.settings.season;
const PF_ANS=answerStore('pes21.pfFind.','pfCache');function pfStore(){return PF_ANS.get()}function pfSave(){PF_ANS.save()}
// what a stored answer means for the squads and game files as they are now
// the team of the project a source's club name means: the team listing him first ("Esporte Clube Vitória" is VITÓRIA), then any club
const pfSameClub=(club,name)=>{if(nameScore(club,name)>=0.6)return true;const C=norm(club).split(' '),N=norm(name).split(' ').filter(w=>w.length>2);return N.length>0&&N.every(w=>C.includes(w))};
const pfTeam=(t,r)=>S.teams[r.teamId]||(!isNationalTeam(t)&&pfSameClub(r.club,t.name)?t:null)||(m=>m&&!isNationalTeam(m)&&!m.sameAs?m:null)(matchTeam(r.club));
function pfSug(t,p,r){const own=pcOwnRec(p),ok=!!(r&&!r.err&&r.club);if(!own&&!ok)return null;const T=ok?pfTeam(t,r):null,where=T?T.name:ok?r.club:'';
  const at=T&&+T.gameId?g=>g.files.some(f=>f.team===+T.gameId):g=>g.files.some(f=>f.club&&strictName(r.club,f.club)>=0.85);
  // his own record first (the game has him under his ID, usually at the team he left: no look-up is needed for that); else a
  // player of his name at the team the look-up found
  const L=own?[own]:[];if(!own)pcGame().forEach(g=>{if(at(g)&&samePlayer(g.name,p.name))L.push(g)});
  if(!L.length)return{kind:'none',where,why:T?'No game file of '+T.name+' has a player of his name':r.club+' is not in the studio, and no game file of it has him'};
  const g=L.find(x=>x.pos===p.pos)||L[0],h=pcHeld().get(g.pid);
  // a national team shares the record its player has at his club: that is one man, not someone else on the record
  if(h&&(!h.p||h.p.id!==p.id)&&isNationalTeam(h.t)===isNationalTeam(t))return h.p?{kind:'held',g,h,where,plays:T&&T.id===t.id?'here':T&&T.id===h.t.id?'there':''}:{kind:'none',where,why:'The record he has at '+where+' (ID '+g.pid+') is in use by '+h.t.name};
  return{kind:'link',g,where}}
const pfJob=()=>jobsArr().find(j=>j.type==='plTeam'&&(j.status==='queued'||j.status==='running'));
async function runPlTeam(j,signal){const season=j.season||S.settings.season,st=pfStore();const items=(j.keys||[]).map(pcFind).filter(Boolean);
  if(!items.length){aiLog('  Nothing left to look up');return}
  const platforms=dpNow(season)&&efAvailable(),got=new Set(),hint=new Map(),down=[];
  const put=(x,club,id,kind,src,note)=>{const T=dpSystemClub(club,id,kind);st[x.p.id]={club,teamId:T?T.id:'',src,note,at:Date.now()};got.add(x.p.id)};
  const gids=platforms?[...new Set(items.map(x=>validGameId(x.p.gameId)?+x.p.gameId:0).filter(Boolean))]:[];
  progSetTotal(Math.ceil(gids.length/40)+(platforms?1:0)+Math.ceil(items.length/DP_CLAUDE_BATCH));
  if(platforms){
    // 1. eFootball, by his ID (only when the name there is his: an option file's own IDs mean nothing to eFootball)
    if(gids.length){let idx=null;try{idx=await efIndex(signal)}catch(e){if(e.name==='AbortError')throw e}
      const ef=await efPlayersByIds(gids,signal,{soft:true,down,step:progStep});if(signal.aborted)return;
      items.forEach(x=>{const r=ef.get(+x.p.gameId);if(!r||!+r.team||(r.name&&!samePerson(r.name,x.p.name)))return;const nm=efTeamName(idx,r.team);if(nm)put(x,nm,r.team,'ef','eFootball','eFootball lists him at '+nm)})}
    // 2. Transfermarkt, every name in one request: one club left after age (and nationality, when it narrows) decides
    const rest=items.filter(x=>!got.has(x.p.id));
    if(rest.length){aiLog('Transfermarkt: '+rest.length+' players…');
      try{const tm=await tmPlayersByNames(rest.map(x=>x.p.name),signal);
        rest.forEach(x=>{let fit=tmAgeFits(tm.get(x.p.name),+x.p.age?[+x.p.age]:[]);
          const nat=fit.filter(c=>x.p.nat&&c.nat&&norm(c.nat)===norm(x.p.nat));if(nat.length)fit=nat;const hits=tmByClub(fit);
          if(hits.length===1)put(x,hits[0].club.name,hits[0].club.id,'tm','Transfermarkt','Transfermarkt lists him ('+hits[0].name+') at '+hits[0].club.name);
          else if(hits.length>1)hint.set(x.p.id,'Transfermarkt has '+hits.length+' players of this name: '+hits.slice(0,4).map(c=>c.name+' at '+c.club.name).join('; '))})}
      catch(e){if(e.name==='AbortError')throw e;down.push(['Transfermarkt',e.message]);aiLog('  Could not connect to Transfermarkt: '+e.message)}}
    progStep();aiLog('  Free sources placed '+got.size+' of '+items.length);pfSave()}
  // 3. Claude, for everyone left
  const left=items.filter(x=>!got.has(x.p.id));
  for(let i=0;i<left.length;i+=DP_CLAUDE_BATCH){if(signal.aborted)return;const chunk=left.slice(i,i+DP_CLAUDE_BATCH);
    aiLog('Claude: players '+(i+1)+'–'+(i+chunk.length)+' of '+left.length+' for '+season+'…');
    const list=chunk.map((x,n)=>({key:'p'+n,name:x.p.name,age:x.p.age||undefined,nationality:x.p.nat||undefined,position:x.p.pos||undefined,height:x.p.height||undefined,listedAt:x.t.name,listedIn:compName(x.t.compId)||undefined,known:hint.get(x.p.id)||undefined}));
    let res={};try{res=await aiJSON(`Football data check for season ${season}. Each player below is listed in the squad of "listedAt" in an eFootball PES 2021 option file. Names are often abbreviated the way the game shows them ("R. LÓPEZ"); ages are as the option file has them and may be a few years old; "known" is what a player database says, when it says anything.
For each player work out who he is, and give the club he is registered with in season ${season} (after the summer transfer window; a player on loan counts for the club he is on loan at). That may well be "listedAt" itself.
Players: ${JSON.stringify(list)}
Reply with JSON only: {"players":[{"key":"p0","name":"<his full name>","club":"<club name, or unknown>","confidence":"high|medium|low","note":"<one short sentence, e.g. joined X from Y in July 2025>"}]}
Do not guess: when you cannot identify a player with confidence, give "club":"unknown" for him.`,signal,{escalate:PLAYERS_UNSURE})}
    catch(e){if(e.name==='AbortError')throw e;claudeDown(e,down,st,chunk.map(x=>x.p.id));pfSave();continue}
    const by=new Map((Array.isArray(res.players)?res.players:[]).map(r=>[r.key,r]));
    chunk.forEach((x,n)=>{const r=by.get('p'+n)||{};const conf=r.confidence&&r.confidence!=='high'?' ('+r.confidence+' confidence)':'';const club=noClub(r.club)?'':String(r.club).trim();
      if(!club){st[x.p.id]={err:true,src:'Claude',note:(String(r.club||'').trim()&&!/^(unknown|none|n\/a)$/i.test(String(r.club).trim())?'Claude: he has no club now ('+String(r.club).trim()+')':'The free sources and Claude could not tell which team he plays for')+(r.note?' ('+r.note+')':''),at:Date.now()};return}
      put(x,club,0,'','Claude','Claude: '+(r.name&&norm(r.name)!==norm(x.p.name)?r.name+', ':'')+'at '+club+(r.note?'. '+r.note:'')+conf)});pfSave()}
  pfSave();const v=items.map(x=>st[x.p.id]).filter(Boolean),ok=v.filter(r=>r.club).length;
  aiLog('  '+ok+' of '+items.length+' player'+(items.length===1?'':'s')+' placed at a team: the answers are in Health check, Players the game has in another team\'s file'+down.map(([n,w])=>'. COULD NOT CONNECT to '+n+': '+w).join(''));
  if(S.ui.view==='health')rerender()}
JOB_KIND.plTeam='Team of players no game file has';
JOB_RUN.plTeam=async(j,signal)=>{await runPlTeam(j,signal)};
function pfQueue(keys){if(!keys.length){toast('Every player already has an answer','ok');return}if(pfJob()){toast('A search is already queued; follow it in the progress bar','err');return}
  queueAdd([{type:'plTeam',keys,season:S.settings.season,label:'Team of '+hcPl(keys.length,'player')+' no game file has ('+S.settings.season+')'}]);
  toast('Queued: '+hcPl(keys.length,'player')+'. Follow it in the progress bar.','ok')}
ACT.pfFind=el=>{const x=pcFind(el.dataset.id);if(!x)return;delete pfStore()[x.p.id];pfSave();pfQueue([el.dataset.id])};
ACT.pfFindAll=()=>{const st=pfStore(),P=pcReady()?pcPlan():new Map();pfQueue(pcNeedy().filter(x=>pcHasId(x.p)&&!pcMay(x.p,P.get(x.p.id))&&(!st[x.p.id]||st[x.p.id].down)).map(x=>x.t.id+'|'+x.p.id))};
const pfNow=id=>{const x=pcFind(id);if(!x)return null;return Object.assign({s:pcReady()?pfSug(x.t,x.p,pfStore()[x.p.id]):null},x)};
// the squads changed: their "no game file has" lists are worked out again
const pfTouch=(...ts)=>{ts.forEach(t=>{NOFILE.delete(t.id);saveTeam(t)});PCV++};
ACT.pfLink=el=>{const o=pfNow(el.dataset.id);if(!o||!o.s||o.s.kind!=='link'){toast('That record is not free any more: look him up again','err');return}const g=o.s.g;
  histLabel(o.p.name+': his game record (ID '+g.pid+') now used at '+o.t.name,'Health',()=>{pcGive(o.t,o.p,{g,why:'found'});pcFlush()});
  toast(o.p.name+' is at '+o.t.name+' with his game record (ID '+g.pid+')','ok');rerender()};
ACT.pfReplace=async el=>{const o=pfNow(el.dataset.id);if(!o||!o.s||o.s.kind!=='held'){toast('That has changed: look him up again','err');return}const{g,h}=o.s;
  // the same man listed twice: the other entry goes. A different player on his record: that player keeps his place and loses the ID
  const same=samePerson(h.p.name,o.p.name);
  if(!await ask(same?'Move '+o.p.name+' to '+o.t.name+'?':'Replace '+h.p.name+'?',same?`<b>${esc(h.p.name)}</b> leaves <b>${esc(h.t.name)}</b>, and <b>${esc(o.p.name)}</b> stays at <b>${esc(o.t.name)}</b> with his game record (ID ${g.pid}) and the details he has here. You can undo it from the change history.`
    :`<b>${esc(o.p.name)}</b> of ${esc(o.t.name)} takes back his own game record (ID ${g.pid}). <b>${esc(h.p.name)}</b> keeps his place at <b>${esc(h.t.name)}</b> but loses that ID, and is then listed as a player who needs one. You can undo it from the change history.`,same?'Move':'Replace',!same))return;
  histLabel(same?o.p.name+' moved from '+h.t.name+' to '+o.t.name:o.p.name+' replaces '+h.p.name+' on game ID '+g.pid,'Health',()=>{if(same)h.t.players=(h.t.players||[]).filter(q=>q.id!==h.p.id);else if(h.p.codeSet)pcLose(h.t,h.p);else codeOff(h.t,h.p);pcGive(o.t,o.p,{g,why:'found'});pcFlush();pfTouch(...new Set([h.t,o.t]))});
  toast(same?o.p.name+' moved from '+h.t.name+' to '+o.t.name:o.p.name+' replaces '+h.p.name+' on game ID '+g.pid,'ok');rerender()};
ACT.pfRemove=async el=>{const x=pcFind(el.dataset.id);if(!x)return;
  if(!await ask('Remove player',`Remove <b>${esc(x.p.name)}</b> from <b>${esc(x.t.name)}</b>? You can undo it from the change history.`,'Remove',true))return;
  histLabel(x.p.name+' removed from '+x.t.name,'Health',()=>{x.t.players=(x.t.players||[]).filter(q=>q.id!==x.p.id);pfTouch(x.t)});delete pfStore()[x.p.id];pfSave();toast(x.p.name+' removed from '+x.t.name,'ok');rerender()};
// by hand: move him to another team of the project
ACT.pfMove=el=>{const x=pcFind(el.dataset.id);if(!x)return;S.ui.pfMove=el.dataset.id;const r=pfStore()[x.p.id];
  const L=teamsArr().filter(t=>!t.sameAs&&t.id!==x.t.id&&isNationalTeam(t)===isNationalTeam(x.t)).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  modal(`<div class="mhead"><h2>Move ${esc(x.p.name)} to a team</h2></div><p>He leaves <b>${esc(x.t.name)}</b> and joins the team you pick, with his details and his ID. If the game has no record of him there either, he is listed again under his new team.</p>
   <label class="small muted" for="pf-move-to">Team</label><select id="pf-move-to" style="width:100%;margin:4px 0 14px">${L.map(t=>`<option value="${t.id}" ${r&&r.club&&(pfTeam(x.t,r)||{}).id===t.id?'selected':''}>${esc(t.name)}${compName(t.compId)?' · '+esc(compName(t.compId)):''} (${(t.players||[]).length})</option>`).join('')}</select>
   <div class="row end"><button data-act="close">Cancel</button><button class="primary" data-act="pfMoveGo">Move</button></div>`)};
ACT.pfMoveGo=()=>{const x=pcFind(S.ui.pfMove),sel=$('#pf-move-to'),T=sel&&S.teams[sel.value];if(!x||!T)return;
  if((T.players||[]).length>=40){toast(T.name+' already has 40 players, the most the game allows','err');return}closeModal();
  histLabel(x.p.name+' moved from '+x.t.name+' to '+T.name,'Health',()=>{const p=x.p;x.t.players=(x.t.players||[]).filter(q=>q.id!==p.id);if(p.number&&(T.players||[]).some(q=>+q.number===+p.number))p.number='';T.players=[...(T.players||[]),p];pfTouch(x.t,T)});
  toast(x.p.name+' moved to '+T.name,'ok');rerender()};
function dpSectionHTML(dp){if(!dp.length)return '<p class="why">No player is in two teams. National teams don\'t count: their players also play for teams.</p>';
  const st=dpStore(),all=findDuplicatePlayers(),season=esc(S.settings.season),job=dpJob(),wait=new Set(job?job.keys||[]:[]);
  const how=dpNow()?(efAvailable()?'eFootball and Transfermarkt first, then Claude for the rest':'Claude'):'Claude, because eFootball and Transfermarkt only know the current season';
  const head=`<p class="why">A player can be in one team only (he can also be in his national team). In the game the club whose file is read last takes him, and the other club loses him: its squad is a player short. <b>Search for the right team</b> looks up where each player plays in <b>${season}</b> (${how}) and suggests one action: keep him at one of his teams, move him to the team he plays for or to his last team in the studio, or remove him when nothing is known. Nothing changes until you apply it.</p>`;
  const rows=dp.slice(0,300).map(a=>{const k=dpKey(a),i=all.indexOf(a),cl=dpClubs(a),r=st[k],sg=dpSug(a),busy=wait.has(k);
    const tag=sg?(sg.action==='keep'?`<span class="sev ok">Keep at ${esc(S.teams[sg.teamId].name)}</span>`:sg.action==='move'?`<span class="sev warn">Move to ${esc(S.teams[sg.teamId].name)}</span>`:'<span class="sev err">Remove from his teams</span>'):'';
    const found=busy&&!sg?'<span class="small muted">Searching…</span>':sg?`${tag}<div class="small muted">${esc(sg.note||'')}</div>`:r?`<span class="small muted">${esc(r.note||'No suggestion')}</span>`:'<span class="small muted">Not searched yet</span>';
    const btns=(sg?`<button class="sm primary" data-act="dpApply" data-k="${esc(k)}">${esc(dpLabel(a,sg))}</button>`:'')+cl.filter(x=>!(sg&&sg.action==='keep'&&x.t.id===sg.teamId)).map(x=>`<button class="sm" data-act="keepAt" data-k="${esc(k)}" data-t="${x.t.id}" title="Keep ${esc(a[0].p.name)} at ${esc(x.t.name)}">Keep at ${esc(x.t.short||x.t.name)}</button>`).join('')+(job?'':`<button class="sm" data-act="dpFindOne" data-k="${esc(k)}" title="Search again for ${season}">${r?'Search again':'Search'}</button>`);
    return hcRow('note',esc(a[0].p.name),(dpGid(a)?'Same game ID':'Same name &amp; age')+' · '+cl.map(x=>esc(x.t.name)+' (OVR '+ovr(x.p)+')').join(', ')+'<br>'+found,btns,{tip:a[0].p.name})}).join('');
  return head+`<div class="hc-rows">${rows}</div>`}
