// PES 2021 Option Studio, part 6 of 14: Health check and its layout, pool leagues, cup participants.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= v2: health checks & cleanup ================= */
// a competition for national teams: the World Cup, those the international search made, or one named like it
// ("euro" alone also matched the Europa League, and "national" the English National League, so the words are exact)
const isNationalComp=c=>!!c&&(!!c.worldCup||!!c.intl||(/national teams?|nations|world cup|\beuros?\b|european championship|copa am[eé]rica|africa cup|afcon|asian cup|gold cup/i.test(c.name)&&!/club world/i.test(c.name)));
const CUP_RE=/(play-?offs?|\bschaal\b|\bpiala\b|ascenso|\bcup\b|\bcopa\b|pokal|coupe|beker|ta[cç]a\b|\bkupa|shield|super ?cup|supercopa|supercoppa|superta[cç]a|champions league|champions cup|europa league|conference league|libertadores|sudamericana|club world|nations league|asian cup|africa cup|world cup|troph|des champions|community shield|legend)/i;
const isCupComp=c=>!!c&&!c.gameLeague&&(c.type==='Cup'||/(champions league|champions cup|europa league|conference league|libertadores|sudamericana|club world)/i.test(c.name));
function findCupDuplicates(){const out=[];const leagueTeams=teamsArr().filter(t=>{const c=S.comps[t.compId];return !isCupComp(c)});
  teamsArr().forEach(t=>{const c=S.comps[t.compId];if(!isCupComp(c)||isNationalComp(c))return;let best=null,bs=0;
    leagueTeams.forEach(l=>{if(l.id===t.id)return;const sc=nameScore(t.name,l.name);if(sc>bs){bs=sc;best=l}});if(best&&bs>=0.8)out.push({cup:t,league:best,score:bs,comp:c})});return out}
function healthIssues(){const issues=[];const add=(sev,cat,msg,act)=>issues.push({sev,cat,msg,act});
  teamsArr().forEach(t=>{const ps=t.players||[];const c=S.comps[t.compId];const nat=isNationalComp(c);
    if(ps.length>40)add('err','Squad size',`${t.name} has ${ps.length} players; the game allows 40`,{a:'openTeam',id:t.id});
    else if(ps.length&&ps.length<18)add('warn','Squad size',`${t.name} has only ${ps.length} players`,{a:'openTeam',id:t.id});
    if(ps.length&&!ps.some(p=>p.pos==='GK'))add('err','Goalkeepers',`${t.name} has no goalkeeper`,{a:'openTeam',id:t.id});
    const nums={};ps.forEach(p=>{if(p.number)(nums[p.number]=nums[p.number]||[]).push(p.name)});const dup=Object.entries(nums).filter(([n,a])=>a.length>1);
    if(dup.length)add('warn','Shirt numbers',`${t.name}: ${dup.map(([n,a])=>'#'+n+' '+a.join(' & ')).join('; ')}`,{a:'fixNumbers',id:t.id,label:'Renumber'});
    const noNum=ps.filter(p=>!p.number).length;if(noNum)add('info','Shirt numbers',`${t.name}: ${noNum} players without a number`,{a:'fixNumbers',id:t.id,label:'Give numbers'});
    const longN=ps.filter(nameTooLong);if(longN.length)issues.push({sev:'warn',cat:'Names',msg:`${t.name}: ${longN.length} name${longN.length===1?'':'s'} too long for the game (${longN.slice(0,3).map(p=>{const s=shortenNames(p);return esc0(s.from)+' → '+esc0(s.to)}).join(', ')}${longN.length>3?', …':''})`,acts:[{a:'fixNames',id:t.id,label:'Shorten names'},{a:'openTeam',id:t.id,label:'Open'}]});
    if(!t.emblem&&!ofGameCrest(t))add('info','Images',`${t.name} has no emblem`,{a:'openTeamImg',id:t.id});// the game's own crest isn't a gap
    if(!SHORT_OK.test(t.short||''))issues.push({sev:'warn',cat:'Team info',msg:`${t.name}: short name ${t.short?'"'+t.short+'"':'is empty and'} should be 3 letters`,acts:[{a:'fixShort',id:t.id,label:'Use '+short3(t)},{a:'openTeamInfo',id:t.id,label:'Edit'}]});
    const un=ps.filter(unrated).length;if(un)add('info','Ratings',`${t.name}: ${un} unrated players`,{a:'efFill',id:t.id,label:'Live update'});
    if(inNoComp(t)&&!clubNoLeague(t))add('info','Competitions',`${t.name} isn't in a competition`,{a:'openTeamInfo',id:t.id})});
  // two different players on one game ID: the game keeps the one in the part it imports last
  try{sharedIds().forEach(({id,a})=>{const last=a[a.length-1],tie=a.length>1&&gameOrder(a[a.length-2].t)===gameOrder(last.t)&&!samePerson(a[a.length-2].p.name,last.p.name);
    const people=[];a.slice().reverse().forEach(x=>{if(!people.some(y=>samePerson(y.p.name,x.p.name)))people.push(x)});
    issues.push({sev:'warn',cat:'Shared game IDs',msg:`${a.map(x=>esc0(x.p.name)+' ('+x.t.name+')').join(' and ')} are on one game ID, ${id}, but ${people.length===2?'are two different players':'are '+people.length+' different players'}. The game has one player there: ${tie?'their team files are in the same part, so which one it ends with depends on the order it imports them':'it ends with '+esc0(last.p.name)+', whose team file it imports last'}`,
    acts:people.map(x=>({a:'sharedKeep',id:x.t.id+'|'+x.p.id,label:'Keep it with '+x.p.name}))})})}catch(e){}
  // players no game file has: the same finding as the export notes, one row per player with the code he can take (Game codes → Players)
  try{const np=S.settings.ofNewPlayers;const F=noFileFind();if(F.bad.length){const have=pcReady(),ready=!F.scan&&have;if(!have&&nfOn())pcLoadAll();const P=ready?pcPlan():new Map();
    F.bad.forEach(([t,L])=>{const by=new Map((t.players||[]).map(p=>[p.id,p]));L.forEach(x=>{const p=by.get(x.id);if(!p)return;const s=P.get(p.id),id=t.id+'|'+p.id;const hasId=pcHasId(p);// with a real ID: "no game file has him"; with none, or only the studio's placeholder: "has no game ID"
      const head=`${t.name}: ${esc0(p.name)}${p.pos?' ('+p.pos+')':''}: ${hasId?(o=>'the game has him under ID '+o.pid+(o.files[0]&&o.files[0].club?', in '+o.files[0].club+'\'s file':'')+', not in this team\'s')(pcOwnRec(p)):'has no game ID'}, so ${np?'the game refuses the team file that lists him':'the export leaves him out'}`;
      // a player WITH an ID is never offered another player's ID (the user, 2026-11-21): his team is looked up, and the record he
      // has there is linked; only his own record or his club record (a national team) is suggested straight away
      // The game has him in another team's file (the user, 2026-11-21). The team listing him is known, so the row offers at once:
      // Move to this team (the transfer: he leaves the original team and keeps his record), Keep in the original team (he leaves
      // this one), Find his current team (the look-up; its answer only decides which of the two comes first, or adds a third team).
      if(hasId&&!pcMay(p,s)){const r=pfStore()[p.id],g=ready?pfSug(t,p,r):null,own=pcOwnRec(p);const orig=g&&g.h?g.h.t.name:own&&own.files[0]?own.files[0].club:'his original team';
        const note=(r?'. '+esc0(r.note||''):'')+(g&&g.kind==='held'&&!samePerson(g.h.p.name,p.name)?'. '+esc0(g.h.p.name)+' of '+g.h.t.name+' is on his record now':g&&g.kind==='none'?'. '+esc0(g.why):'');
        const T=r&&r.club&&!r.err?pfTeam(t,r):null,third=T&&T.id!==t.id&&!(g&&g.h&&g.h.t.id===T.id)&&norm(T.name)!==norm(orig)?[{a:'pfMove',id,label:'Move to '+T.name}]:[];
        // his record is in his country's file (or his club's, for a national team's row): club and country share one ID in the game
        // (1,264 IDs of the 2026-27 file are in both a national team's file and a club's), so he is kept in both on that ID
        const natRec=(h=>!!h&&isNationalTeam(h.t)!==isNationalTeam(t))(own&&pcHeld().get(own.pid));
        const move=!g||g.kind==='none'?null:g.kind==='link'?{a:'pfLink',id,label:natRec?'Keep in both teams':'Move to this team'}:{a:'pfReplace',id,label:samePerson(g.h.p.name,p.name)?'Move to this team':'Replace '+g.h.p.name+(g.h.t.id!==t.id?' ('+(g.h.t.short||g.h.t.name)+')':'')};
        const keep={a:'pfRemove',id,label:natRec?'Remove from this team':'Keep in '+orig},// a national team is not "the original team" of a club player
find={a:'pfFind',id,label:r?'Look up again':'Find his current team'};
        const there=third.length||(g&&g.plays==='there')||(T&&norm(T.name)===norm(orig));// the look-up says he does not play here
        issues.push({sev:np?'err':'warn',cat:'Not in the game',msg:head+note,acts:[...third,...(move?(there?[keep,move]:[move,keep]):[keep]),find]});return}
      issues.push({sev:np?'err':'warn',cat:'Not in the game',msg:`${head}${s?'. Suggested: '+esc0(pcWhyNote(s,t)):ready?'. No free player code is left for him: delete a team or competition you don\'t want to make room (Make room)':''}`,
        acts:[...(s?[{a:'pcGive',id,label:pcWhy(s)}]:ready?[{a:'pcRoomOpen',id,label:'Make room'}]:[]),{a:'pcOpen',id,label:'Game codes'}]})})})}}catch(e){}
  // a team filed under one league on a code of another: the game lists a team by its code, so it plays in the code's league
  try{if(S.settings.ofPkg&&PES21_TEAMS)teamsArr().forEach(t=>{if(t.sameAs||t.noCode||!+t.gameId)return;const k=teamLeagueKey(t),l=slotLeagueOf(t.gameId);if(!k||!l||k===l)return;
    issues.push({sev:'warn',cat:'Game IDs',msg:`${t.name}: is filed under ${compName(t.compId)}, but its code, ${t.gameId}, is a code of ${csLeagueName(l)} in the game, so the game lists the team there`,acts:[{a:'hcCodes',id:t.id,label:'Game codes'},{a:'openTeam',id:t.id,label:'Open'}]})})}catch(e){}
  // a team on a code whose name the game fixes, under another name: it is expected to play under the game's name (nameFixed)
  try{if(S.settings.ofPkg){if(!PES21_TEAMS){if(!S.ui.pesTeamsLoading){S.ui.pesTeamsLoading=true;pes21Teams().then(()=>{S.ui.pesTeamsLoading=false;if(S.ui.view==='health')rerender()})}}
    else if(pcReady())teamsArr().forEach(t=>{if(t.sameAs||t.noCode||!+t.gameId||!nameFixed(t.gameId))return;const pn=pesTeamName(t.gameId);if(!pn||norm(pn)===norm(t.name)||nameScore(pn,t.name)>=0.6||samePerson(pn,t.name))return;// the same club under a longer or shorter name (S.C. Braga, SPORTING BRAGA) is not another name
      const sure=nameFixed(t.gameId)===2;
      issues.push({sev:'info',cat:'Game name',msg:`${t.name}: its code, ${t.gameId}, is ${esc0(pn)}'s in the game, ${sure?'and the game fixes that team\'s name. Expect this team to play with its own players under the name '+esc0(pn):'and the game may fix that team\'s name. It may play with its own players under the name '+esc0(pn)+': check it in the game'}`,acts:[{a:'hcCodes',id:t.id,label:'Game codes'},{a:'openTeam',id:t.id,label:'Open'}]})})}}catch(e){}
  return issues}
function findDuplicatePlayers(){const by=new Map();teamsArr().forEach(t=>{if(isNationalTeam(t)||t.sameAs||t.noCode)return;(t.players||[]).forEach(p=>{const k=p.ted&&p.ted.pid?'id:'+p.ted.pid:'n:'+norm(p.name)+'|'+(p.age||'');(by.get(k)||by.set(k,[]).get(k)).push({p,t})})});
  return [...by.values()].filter(a=>a.length>1&&new Set(a.map(x=>x.t.id)).size>1&&!idShared(a))}
// Two players on one game ID are one player only when their names share a word (initials aside): "K. GHANNAM" and "Khalid
// Al-Ghannam" are one man; "M. SAMUELSEN" and "MARC GUIU" are two, put on one record by the option file (2026-11-21).
// spellings differ ("Abdullah Alkhaibari", "A. Al-Khaibari"): a word of 4 letters or more of one name found in the other, run together, is enough
const samePerson=(a,b)=>{const A=norm(a).split(' ').filter(w=>w.length>1),B=norm(b).split(' ').filter(w=>w.length>1),jA=A.join(''),jB=B.join('');
  return A.some(w=>B.includes(w)||(w.length>=4&&jB.includes(w)))||B.some(w=>w.length>=4&&jA.includes(w))};
const idShared=a=>!!(a[0].p.ted&&a[0].p.ted.pid)&&a.some(x=>!samePerson(a[0].p.name,x.p.name));
// the game imports the option file's parts in order (WEPES/1 … 7), so on a shared game ID it ends with the player of the last part
// the order the game reads team files ticked together in: file-name order, the last one winning (tested; DATABASE_RULES 5a)
const _GORD={n:-1,m:null};const gameOrder=t=>{const T=teamsArr();if(_GORD.n!==T.length||!_GORD.m){const fs=[...new Set(T.map(x=>(S.teds[x.id]||{}).file).filter(Boolean))].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));_GORD.m=new Map(fs.map((f,i)=>[f,i]));_GORD.n=T.length}const f=t&&(S.teds[t.id]||{}).file;return f&&_GORD.m.has(f)?_GORD.m.get(f):1e6+1};
function sharedIds(){const by=new Map();teamsArr().forEach(t=>{if(t.sameAs||t.noCode)return;(t.players||[]).forEach(p=>{const id=p.ted&&+p.ted.pid;if(!id)return;(by.get(id)||by.set(id,[]).get(id)).push({p,t})})});
  return [...by.entries()].filter(([,a])=>a.length>1&&idShared(a)).map(([id,a])=>({id,a:a.slice().sort((x,y)=>gameOrder(x.t)-gameOrder(y.t))}))}
// take the game ID off a player: he keeps his place in the squad and goes to "Players no game file has" for a code of his own
function codeOff(t,p){if(!p.codeWas)p.codeWas={gameId:p.gameId||'',ted:p.ted?clone(p.ted):null};p.ted=null;p.gameId='';delete p.codeSet;p.codeOff=true;NOFILE.delete(t.id);PCV++;saveTeam(t)}
// the players the ID is taken off: everyone who is not the keeper (his own club or country copy keeps it too)
const sharedOthers=(S2,keep)=>S2.a.filter(o=>!samePerson(o.p.name,keep.p.name));
// take the ID off the others and give each a free player ID straight away; with none left, Make room opens
const sharedNeed=()=>sharedIds().reduce((n,S2)=>n+sharedOthers(S2,S2.a[S2.a.length-1]).length,0);
async function sharedApply(list,label){const others=list.flatMap(x=>x.others);if(!others.length)return;
  // nothing is taken off anyone unless every one of them can have a free ID: otherwise they would be left with none
  for(let i=0;i<3&&nfTeams().some(t=>!noFileOf(t));i++)await noFileScan(true);await pcLoadAll();
  {const free=pcFreeCount();if(free!==null&&free<others.length){toast((free?'Only '+free+' free ID'+(free===1?' is':'s are'):'No free ID is')+' left for '+others.length+' player'+(others.length===1?'':'s')+'. Nothing was changed: make room first.','err');ACT.pcRoomOpen();return}}
  await takeSnapshot('Before '+label,true);histLabel(label,'Health',()=>others.forEach(o=>codeOff(o.t,o.p)));
  const r=await histLabelAsync('New player IDs: '+label,'Health',()=>codesFor(o=>others.some(x=>x.p.id===o.p.id)));
  toast(`${list.length===1?'Game ID '+list[0].id+' stays with '+list[0].keep.p.name+'. ':''}${r.n} player${r.n===1?'':'s'} now ${r.n===1?'has':'have'} a player ID of ${r.n===1?'his':'their'} own${r.left?'; '+r.left+' still need one: no free ID is left':''}`,r.left?'':'ok');
  rerender();if(r.left)ACT.pcRoomOpen()}
ACT.sharedKeep=async el=>{const x=pcFind(el.dataset.id);if(!x)return;const id=+(x.p.ted&&x.p.ted.pid);const S2=sharedIds().find(s=>s.id===id);if(!S2)return;
  await sharedApply([{id,keep:x,others:sharedOthers(S2,x)}],'Game ID '+id+' kept with '+x.p.name)};
// all of them: each ID stays with the player the game ends with (the team file it imports last), the others get new IDs
ACT.sharedAll=async()=>{const L=sharedIds().map(S2=>{const keep=S2.a[S2.a.length-1];return{id:S2.id,keep,others:sharedOthers(S2,keep)}}).filter(x=>x.others.length);if(!L.length){toast('No game ID is shared by different players','ok');return}const n=L.reduce((a,x)=>a+x.others.length,0);
  if(!await ask('New player IDs for '+n+' players?',`On each of <b>${L.length}</b> shared game ID${L.length===1?'':'s'} the ID stays with the player the game has there now (the one whose team file it imports last), and the other <b>${n}</b> player${n===1?'':'s'} each take an available player ID of ${n===1?'his':'their'} own:<ul class="small">${L.slice(0,12).map(x=>`<li>${x.id}: kept by <b>${esc(x.keep.p.name)}</b> (${esc(x.keep.t.name)}); new ID for ${x.others.map(o=>esc(o.p.name)+' ('+esc(o.t.name)+')').join(', ')}</li>`).join('')}${L.length>12?`<li>… and ${L.length-12} more</li>`:''}</ul>If no ID is left for some, Make room opens. A snapshot is taken first.`,'Give '+n+' new IDs'))return;
  await sharedApply(L,L.length+' shared game IDs: new player IDs for '+n+' players')};
// Health check page. The plain answer first (is it ready for the game?), one button for the safe fixes, then the issues in sections
// that open and close, grouped by problem or by team, each with why it matters and its fix first. Suggestions stay out of the way.
const HC_SEV={err:'Must fix',warn:'Should fix',info:'Suggestion',note:'Information'};
const HC_SQ=['Squad size','The game allows up to 40 players. A playable team needs 15 or more.'];
const HC_CAT={'Duplicate players':['Players listed twice','A team can list each player only once. Most copies come from older eFootball pulls that included special cards, whose IDs don\'t fit the game.'],
  'Game IDs':['Game IDs','Every team, competition and player needs an ID the game knows, so its file replaces the right one.'],
  'Shirt numbers':['Shirt numbers','Each number can be worn by one player per team.'],
  'Squads':HC_SQ,'Squad size':HC_SQ,
  'Goalkeepers':['Goalkeepers','Every team needs at least one goalkeeper. One is enough for the game. The fix looks the team up: the free sources first, then Claude for what they don\'t have; the result waits in Process and Review.'],
  'Player data':['Missing player details','Players without age, height, nationality or ratings get default values in the game. "Random fill" is the last resort: made-up but realistic values for only what is missing.'],
  'Names':['Names too long','The game cuts names over 60 bytes and shirt names over 16 letters. "Shorten names" shortens them the usual way: F. AL-BURAIKAN, L. NICOLAS, C. TAYLOR.'],
  'Images':['Crests and flags','A team without a crest shows a blank badge in the menus.'],
  'Team info':['Team details','Short names are always 3 letters in the game.'],
  'Ratings':['Unrated players','Unrated players play with default ratings.'],
  'Competitions':['Teams outside a competition',''],
  'Shared game IDs':['Different players on one game ID','The option file put two different players on one game ID. The game has one player per ID, so whichever team file it imports last decides who he is, at both teams. Keep the ID with one of them; the other keeps his place in the team and needs a code of his own (Players no game file has).'],
  'Not in the game':['Players no game file has','A team file can only list players the game already has: the game never creates a player from a team file, and refuses a team that lists one it doesn\'t have. So the export leaves these players out. The fix gives each one the code of a player the game has that no team uses any more (one you deleted or replaced): he is written over that player, keeping that player\'s look. Game codes → Players shows every code and lets you choose.']};
const hcCat=c=>HC_CAT[c]||[c,''];
const hcActs=i=>i.acts||(i.act?[i.act]:[]);
const hcPl=(n,w,ws)=>n+' '+(n===1?w:(ws||w+'s'));
function hcSubject(i){const a=hcActs(i)[0];const id=a&&String(a.id||'').split('|')[0];if(S.teams[id])return{id,name:S.teams[id].name,sub:compName(S.teams[id].compId)};if(S.comps[id])return{id,name:S.comps[id].name,sub:'Competition'};return{id:'',name:'General',sub:''}}
function hcMsg(i,sj){let m=i.msg;const n=sj.name;if(n&&m.startsWith(n+': '))m=m.slice(n.length+2);else if(n&&m.startsWith(n+' ')&&!/^and /.test(m.slice(n.length+1)))m=m.slice(n.length+1);return m.charAt(0).toUpperCase()+m.slice(1)}
// team id → 'running' / 'queued' for the fixes in progress, built once per redraw: hundreds of queued fixes and rows must not
// each scan every job and every player
let HC_FIXMAP=null;
function hcFixMap(){if(HC_FIXMAP)return HC_FIXMAP;const m=HC_FIXMAP=new Map();queueMicrotask(()=>{HC_FIXMAP=null});
  const js=jobsArr().filter(j=>j.autoApply&&(j.status==='queued'||j.status==='running'));if(!js.length)return m;
  const pt=new Map();Object.values(S.teams).forEach(t=>(t.players||[]).forEach(p=>{if(!pt.has(p.id))pt.set(p.id,t.id)}));
  js.forEach(j=>{[j.teamId,...(j.teamIds||[]),...(j.ids||[]).map(id=>pt.get(id))].forEach(id=>{if(id&&m.get(id)!=='running')m.set(id,j.status)})});return m}
const hcFixing=id=>id?hcFixMap().get(id)||null:null;
const hcLastHTML=id=>{const fx=hcFixing(id);if(fx)return `<div class="small" style="color:var(--accent)">${fx==='running'?'Being fixed now…':'Fix queued: it runs in turn'}</div>`;const L=typeof HC_LAST!=='undefined'&&id&&HC_LAST[id];return L&&L.text?`<div class="small muted">Last fix, ${esc(new Date(L.at).toLocaleString([],{dateStyle:'short',timeStyle:'short'}))}: ${esc(L.text)}</div>`:''};
const hcBtns=i=>hcActs(i).map((a,k)=>`<button class="sm${k===0&&a.label&&a.label!=='Open'?' primary':''}" data-act="${a.a}" data-id="${a.id}">${esc(a.label||'Open')}</button>`).join('');
// the fixes that are safe to run on every squad at once: duplicate entries and shirt numbers
function hcAutoPlan(iss){const dd=new Set(),nb=new Set();iss.forEach(i=>{if(i.sev==='info'||i.sev==='note')return;hcActs(i).forEach(a=>{if(a.a==='dedupeTeam')dd.add(a.id);if(a.a==='fixNumbers')nb.add(a.id)})});
  const D=[...dd].filter(id=>S.teams[id]),Nb=[...nb].filter(id=>S.teams[id]);return{dd:D,nb:Nb,total:new Set([...D,...Nb]).size}}
/* ----- Health check layout (rule book "Health check layout", 2026-11-21) -----
   Every problem has a key, a level and a fixed place: group → sub-group. Levels: Must fix, Should fix, Suggestion, Information.
   Only teams and competitions in the game (with a code) are checked; what has no code is listed under "Files not in the game". */
const HC_IS=(cat,re)=>i=>i.cat===cat&&(!re||re.test(i.msg));
const HC_PROBLEMS=[// [key, level (null: not shown), test]
  ['big','err',HC_IS('Squad size',/allows 40/)],['none','err',HC_IS('Squads',/has no players/)],['few','warn',HC_IS('Squads')],['gk','err',HC_IS('Goalkeepers')],
  ['numdup','err',HC_IS('Shirt numbers',/#\d/)],['',null,HC_IS('Shirt numbers')],// a missing number is listed once, under Missing details
  ['dupent','err',HC_IS('Duplicate players',/duplicate entr/)],
  ['',null,HC_IS('Duplicate players',/too long for the game \(special/)],// eFootball pulls and option-file imports no longer take such IDs
  ['sameteam','info',HC_IS('Duplicate players',/two players named/)],['samename','info',HC_IS('Duplicate players')],
  ['shareteam','err',HC_IS('Game IDs',/share in-game team ID/)],['wrongleague','warn',HC_IS('Game IDs',/is a code of /)],
  ['',null,HC_IS('Game IDs',/its team file is for game team/)],// the team ID is set on Game codes only, so it can't differ
  ['noteamid','err',HC_IS('Game IDs',/no in-game team ID/)],['',null,HC_IS('Game IDs',/has no code: it went/)],
  ['mislink','warn',HC_IS('Game IDs',/linked to a different game record/)],['replaces','note',HC_IS('Game IDs',/replaces the in-game team/)],
  ['noplid','err',HC_IS('Game IDs',/no game ID; team files add/)],
  ['',null,HC_IS('Game IDs',/is a cup copy of/)],['',null,HC_IS('Game IDs',/has no competition file/)],
  ['noplid','err',HC_IS('Not in the game',/: has no game ID, so /)],['notingame','err',HC_IS('Not in the game',/the game refuses/)],['leftout','warn',HC_IS('Not in the game')],['sharedid','warn',HC_IS('Shared game IDs')],
  ['gaps','warn',HC_IS('Player data')],['longname','warn',HC_IS('Names')],['unrated','warn',HC_IS('Ratings')],
  ['short','warn',HC_IS('Team info')],['fixedname','info',HC_IS('Game name')],['nocomp','info',HC_IS('Competitions')],
  ['nocrest','warn',HC_IS('Images',/has no emblem$/)],['flag','info',HC_IS('Images')]];
// [group, why it matters, [[sub-group, [problem keys and x: sections]]]]
const HC_LAYOUT=[
  ['Team size','The game allows up to 40 players in a team. A playable team needs 15 or more, and at least one goalkeeper.',[['Too many players',['big']],['Too few players',['none','few']],['Goalkeeper',['gk']]]],
  ['Game IDs','Every team and player needs an ID the game knows, so its file replaces the right one.',[['Teams',['shareteam','noteamid','wrongleague','replaces']],['Players',['noplid','mislink','sharedid']],['Same name',['sameteam','samename']]]],
  ['Player details','Problems in the players\' own details.',[['Players the game has in another team\'s file',['notingame','leftout']],['Missing ratings',['unrated']],['Missing details',['gaps']],['Names',['longname']],['Shirt numbers',['numdup']],['Duplicates',['dupent','x:dp']]]],
  ['Team details','Problems in the teams\' own details.',[['Short name',['short']],['Name in the game',['fixedname']],['Competition',['nocomp']],['League',['x:nolg']],['Copies of league teams',['x:cups','x:pool']],['Similarly named teams',['x:simname']]]],
  ['Crests and flags','A team without a crest shows a blank badge in the menus.',[['Crests',['nocrest']],['Flags',['flag']]]],
  ['Competition details','Problems with the competitions themselves.',[['Leagues with no teams',['x:comps']],['Cups with no teams',['x:cupsEmpty']]]],
  ['Teams, competitions and their files','Why the number of teams and competitions is not the number of team and competition files in an export.',[['Competitions with no competition file',['x:owncomps']]]],
  ['International teams','National players and the teams they play for. In the game a player has one ID, shared by his team and his country.',[['National players in no team',['x:natfree']],['Added to a team from a national team',['x:natadd']]]],
  ['Option files','Files and pictures of your option files: one file per team code, one picture per image name, squads the game can show whole, and images a file names that no option file has.',[['Squads that will show "---"',['x:badsq','x:maydash']],['Two files for one team code',['x:twofiles']],['Two pictures for one image name',['x:twopics']],['Images the option file doesn\'t have',['x:miss']]]],
  ['Files not in the game','Teams and competitions kept in the studio without a code. They are not checked and not exported until they get a code on Game codes.',[['Without a code',['x:nocode']]]],
  ['Other','',[['Other',['other']]]]];
// why each problem matters, shown above its rows
const PF_WHY='He is never given another player\'s ID. "Move to this team" is the transfer: he leaves the original team and keeps his game record here. "Keep in …" is the opposite: he leaves this team and stays where the game has him. "Find his current team" looks it up, in the free sources first and then with Claude, when you are not sure; the answer puts the right choice first.';
const HC_WHY={gk:'One goalkeeper is enough for the game. The fix looks the team up: the free sources first, then Claude for what they don\'t have; the result waits in Process and Review.',
  none:'The fix looks the team up: the free sources first, then Claude; the result waits in Process and Review.',
  numdup:'Each number can be worn by one player per team.',
  dupent:'A team can list each player only once.',
  samename:'Two players of one team with the same name and different game IDs: one player twice, or two different players.',
  noteamid:'A team that never had an ID: no team file can be written for it. Pick one of the available IDs on Game codes.',
  replaces:'A team PES 2021 doesn\'t have was given another team\'s place automatically.',
  wrongleague:'The league a team plays in is its team code and nothing else: every code of the game belongs to one league for good (tested in the game on 22 November 2026, in every league). These teams are filed under one league in the studio but sit on a code of another, so the game lists them in the other league. Give each a free code of its own league on Game codes, where only that league\'s codes are offered; if none is free, a team of that league has to give its code up first. Or file the team under the league its code belongs to.',
  notingame:'The game has a player under each of these IDs, but not for this team: the record is in another team\'s file or another player is on it. The game refuses a team file that lists a player it can\'t write. '+PF_WHY,
  leftout:'The game has a player under each of these IDs, but not for this team: the record is in another team\'s file or another player is on it. So the export leaves these players out of their team file. '+PF_WHY,
  noplid:'Players with no game ID: new players, and players whose only number comes from a source (eFootball) or was made up by the studio, which the game doesn\'t know. A team file can only list players the game already has, so the fix gives each one the ID of a player the game has that no team uses any more. With no ID left, Make room opens.',
  nocomp:'A team that is in no competition and is not meant to be in a league.',
  sharedid:'The option file put two different players on one game ID. The game has one player per ID, so whichever team file it imports last decides who he is, at both teams. Keep the ID with one of them; the others take an available ID of their own at once.',
  gaps:'Players without age, height, weight or nationality get default values in the game. "Random fill" is the last resort: made-up but realistic values for only what is missing.',
  unrated:'Unrated players play with default ratings.',
  longname:'The game cuts names over 60 bytes and shirt names over 16 letters. "Shorten names" shortens them the usual way: F. AL-BURAIKAN, L. NICOLAS, C. TAYLOR.',
  short:'Short names are always 3 letters in the game.',
  fixedname:'The game fixes the name of its licensed teams: such a team shows the game\'s own name whatever its team file says, with the players the file gives it (tested in the game, 22 November 2026). These teams sit on such a code under another name, so the game is expected to show the old name. To have the new name show, give the team the code of a team the game does not fix (Game codes marks the fixed ones). A team is taken as fixed when the option file keeps the game\'s own crest for it, and as "may be fixed" when nearly every team of its league in the game is such a team.'};
// teams and competitions kept without a code
const hcNoCode=()=>({teams:teamsArr().filter(t=>!t.sameAs&&t.noCode).sort((a,b)=>String(a.name).localeCompare(String(b.name))),comps:compsArr().filter(c=>c.noCode).sort((a,b)=>String(a.name).localeCompare(String(b.name)))});
function hcNoCodeHTML(Z){const row=(kind,name,sub,tab,id)=>hcRow('note',esc(name),esc(kind+' · '+sub),`<button class="sm" data-act="hcCodes" data-tab="${tab}" data-id="${id}">Game codes</button>`,{tip:name});
  if(!Z.teams.length&&!Z.comps.length)return '<p class="why">Everything in the studio has a code.</p>';
  return `<div class="hc-rows">${Z.comps.map(c=>row('Competition',c.name,hcPl(teamsArr().filter(t=>t.compId===c.id).length,'team'),'comp',c.id)).join('')}${Z.teams.map(t=>row('Team',t.name,(compName(t.compId)||'No competition')+' · '+hcPl((t.players||[]).length,'player'),'team',t.id)).join('')}</div>`}
ACT.hcCodes=el=>{S.ui.codeTab=el.dataset.tab||'team';location.hash='codes'};
/* ----- Option files: one file per code, one picture per name (docs/DATABASE_RULES.md 5a; the user, 2026-11-23) -----
   The option files are read as files and their links. Where two files hold one team code, the last by file name is used until you
   pick another here (it is then read again from that file); where one image name has two pictures, the first found is used until
   you pick another (every image of that name then shows the one you picked). */
const ofReadNow=()=>{if(OF_RD.r)return OF_RD.r;if(!S.ui.ofRdLoading&&S.settings.ofPkg){S.ui.ofRdLoading=true;ofRead().then(()=>{if(S.ui.view==='health')rerender()}).catch(()=>{}).finally(()=>{S.ui.ofRdLoading=false})}return null};
const ofTwoFiles=()=>{const R=ofReadNow();return R?ofCodeClashes(R):[]};
const ofTwoPics=()=>{const R=ofReadNow();return R?ofImgClashes(R):[]};
// Team files whose squad the game can't show whole (the user, 2026-11-24: "---" rows, and the game glitches when one is picked).
// In the file used for each code: a squad place whose player has no record in the file, a filled place the squad order table
// leaves out (drawn as "---", see TED.build), and players with no name. The export writes the first two kinds again from the
// studio's players (places with no record dropped, the order table rebuilt: ofPlan, ofBadCodes); names need filling in.
function ofBadSquads(R){R=R||ofReadNow();if(!R)return[];const out=[];
  for(const [code,L] of R.T){const f=ofPickOf(L,'ofPick'),P=f.P,ids=P.assignIds||[],rec=new Set(P.players.map(p=>p.pid)),ord=new Set(P.order||[]);
    const filled=ids.map((x,i)=>x?i:-1).filter(i=>i>=0);
    const noRec=filled.filter(i=>!rec.has(ids[i])).map(i=>ids[i]),notOrd=P.order?filled.filter(i=>rec.has(ids[i])&&!ord.has(i)):[];
    // a player with no name in the option file is a problem only while the project's team still has him without a name: once
    // he is named there, or gone from the squad (Live Update brings the real squad, with its own IDs), the export writes the
    // team again from the project's players (ofHash covers them) and he isn't in it nameless. The option file itself never
    // changes, so it alone can't say (the user, 2026-11-25: Chiangrai United updated online with Live Update, still listed)
    const hasNm=s=>!!String(s||'').replace(/[-–—_.\s]/g,'');const t=sqTeam(code);
    const still=p=>!t||(t.players||[]).some(q=>(+q.gameId===+p.pid||(q.ted&&+q.ted.pid===+p.pid))&&!hasNm(q.name));
    const noName=P.players.filter(p=>!hasNm(p.name)&&still(p));
    if(noRec.length||notOrd.length||noName.length)out.push({code,f,noRec,notOrd,noName})}
  return out.sort((a,b)=>String(a.f.P.team.name).localeCompare(String(b.f.P.team.name)))}
// the codes the export writes again rather than copy: a place with no player, or a place the squad list leaves out, once the user
// has chosen to repair the squad (settings.sqFix by code).
// REPAIR THE SQUAD (the user, 2026-11-25: "the empty places are actually players in the game but do not show on the team list.
// removing the line was a last resort"). A place whose player has no record in the file is, in order:
//   have  his ID is already a player of this squad (the place is a second line for him): the rebuilt file lists him once
//   fill  the game has his record in his club's file (or, for a club, in his country's): he is added to the squad from that
//         record, club and country sharing one ID (DATABASE_RULES 6.7d, the other way round)
//   held  only another team of the same kind holds him (two clubs can't share a player): not added
//   made  an ID the option file's maker created: docs/GAME_TESTS.md 25 decides
//   look  no team file holds him: looked up by his ID in eFootball, the answer waits in Process and Review; until a file has
//         his record his place is left out (the last resort)
const sqTeam=code=>teamsArr().find(y=>!y.sameAs&&+y.gameId===code)||null;
function sqPlanNow(x){const t=sqTeam(x.code),o={x,t,have:[],fill:[],held:[],made:[],look:[]};if(!t||!pcReady())return o;
  const G=pcGame(),N=natGameIds(),nat=isNationalTeam(t);
  x.noRec.forEach(id=>{if((t.players||[]).some(p=>+p.gameId===id||(p.ted&&+p.ted.pid===id))){o.have.push(id);return}
    if(isEditId(id)){o.made.push(id);return}
    const g=G.get(id),fs=g?g.files.filter(f=>f.team!==x.code):[];const f=fs.find(f=>N.has(f.team)!==nat);
    if(f)o.fill.push({id,f,name:g.name});else if(fs.length)o.held.push({id,f:fs[0],name:g.name});else o.look.push(id)});
  return o}
// one player added from the record another team's file has of him; the squad's own player keeps his number when it is free
async function sqFill(t,e){const P=TED.parse(TED.unb64(await tedTemplateBytes({ref:e.f.ref})));const tp=P.players.find(q=>q.pid===e.id);if(!tp||(t.players||[]).length>=40)return null;
  const src=sqTeam(e.f.team),own=src&&(src.players||[]).find(q=>(q.ted&&+q.ted.pid===e.id)||+q.gameId===e.id);
  const base=own?clone(own):tedPlayerToStudio(tp,e.f.team);const used=new Set((t.players||[]).map(q=>+q.number)),n=+base.number;
  ['codeOff','codeSet','codeWas'].forEach(k=>delete base[k]);
  const q=normPlayer(Object.assign(base,{id:uid(),gameId:e.id,ted:{pid:e.id,team:e.f.team,slot:tp.slot},number:n>=1&&n<=99&&!used.has(n)?n:''}));
  t.players=(t.players||[]).concat([q]);return q}
// the players no file holds: who they are in eFootball, as additions waiting in Process and Review (asked once per ID)
async function sqLookUp(plans){const seen=S.settings.sqLooked||(S.settings.sqLooked={});const want=new Map();
  plans.forEach(pl=>pl.look.forEach(id=>{if(!seen[id]&&pl.t)want.set(id,pl.t.id)}));if(!want.size)return{asked:0,found:0};
  let ef;try{ef=await efPlayersByIds([...want.keys()],new AbortController().signal,{soft:true})}catch(e){return{asked:want.size,found:0,err:e.message||String(e)}}
  const inc={};let found=0;
  want.forEach((tid,id)=>{const r=ef.get(id);seen[id]=r?1:2;if(!r)return;const T=inc[tid]||(inc[tid]=clone(S.teams[tid]));if(T.players.length>=40)return;
    const q=normPlayer(Object.assign(efPlayer(r,isNationalTeam(T)),{id:uid(),gameId:id}));const used=new Set(T.players.map(z=>+z.number));if(used.has(+q.number))q.number='';T.players.push(q);found++});
  saveSettings();
  if(found)finishBatch(batchFromData({teams:inc,comps:{}},{title:'Repair the squad: '+hcPl(found,'player')+' found in eFootball by ID',source:'eFootball',removeMissing:false,teamScope:Object.keys(inc)}));
  return{asked:want.size,found}}
async function sqRepair(codes){if(!pcReady()){toast('Reading the team files…','');await pcLoadAll()}
  const mk=()=>ofBadSquads().filter(x=>sqFixable(x)&&codes.includes(x.code)).map(sqPlanNow);let plans=mk();
  if(!plans.length){toast('No team file here needs a repair','ok');return}
  const cnt=k=>plans.reduce((s,pl)=>s+pl[k].length,0);const nf=cnt('fill'),nl=plans.reduce((s,pl)=>s+pl.look.filter(id=>!(S.settings.sqLooked||{})[id]).length,0);
  const dup=plans.reduce((s,pl)=>s+pl.have.length+pl.x.notOrd.length,0),rest=cnt('held')+cnt('made');
  const li=[];plans.forEach(pl=>pl.fill.forEach(e=>li.push(`<li><b>${esc(e.name)}</b> joins ${esc(pl.t.name)} from ${esc(e.f.club||('code '+e.f.team))}'s file</li>`)));
  const msg=[nf?`${hcPl(nf,'player')} the game has ${nf===1?'is':'are'} added to the squad from the record ${nf===1?'his':'their'} other team's file holds:<ul style="margin:6px 0;padding-left:18px">${li.slice(0,10).join('')}${li.length>10?'<li>and '+(li.length-10)+' more</li>':''}</ul>`:'',
    dup?`${hcPl(dup,'squad line')} the game can't draw ${dup===1?'is':'are'} put right: a player listed twice is listed once, and the squad list is rebuilt so it shows every player.`:'',
    nl?` ${hcPl(nl,'player')} no team file holds ${nl===1?'is':'are'} looked up in eFootball by ID; what is found waits in Process and Review, and until a file has ${nl===1?'his':'their'} record the place is left out.`:'',
    rest?` ${hcPl(rest,'place')} can't be filled (held by another club, or on an ID the option file's maker created) and ${rest===1?'is':'are'} left out.`:'',
    ` The next export writes ${plans.length===1?'this team file':'these '+plans.length+' team files'} again, in First install and Changes only. A snapshot is taken first, and the added players can be undone from the change history.`].join('');
  if(!await ask(plans.length===1?'Repair '+plans[0].x.f.P.team.name+'\'s squad?':'Repair '+plans.length+' squads?',msg,'Repair'))return;
  await takeSnapshot('Before repairing squads',true);
  plans=mk();let added=0;const failed=[];// worked out again on the data as it is now, so nobody is added twice
  await histLabelAsync('Repair the squad'+(plans.length===1?': '+plans[0].x.f.P.team.name:' ('+plans.length+' teams)'),'Health',async()=>{
    for(const pl of plans){if(!pl.fill.length)continue;let n=0;
      for(const e of pl.fill){try{if(await sqFill(pl.t,e))n++;else failed.push(e.name)}catch(err){console.error(err);failed.push(e.name)}}
      if(n){saveTeam(pl.t);added+=n}}});
  sqFixSet(plans.map(pl=>pl.x.code),true);
  const lk=nl?await sqLookUp(plans):{asked:0,found:0};
  toast([`${hcPl(plans.length,'squad')} repaired`,added?`${hcPl(added,'player')} added from ${added===1?'his':'their'} other team's file`:'',
    lk.asked?(lk.err?'eFootball could not be reached: '+lk.err:`${lk.found} of ${hcPl(lk.asked,'player')} found in eFootball (Process and Review)`):'',
    failed.length?'not added: '+failed.join(', '):''].filter(Boolean).join('; ')+'. The next export writes the file again.',failed.length||lk.err?'err':'ok');rerender()}
const sqFixable=x=>x.noRec.length||x.notOrd.length;
const ofBadCodes=R=>{const ok=S.settings.sqFix||{};return new Set(ofBadSquads(R).filter(x=>sqFixable(x)&&ok[x.code]).map(x=>x.code))};
function ofBadHTML(L){if(!L.length)return S.ui.ofRdLoading?'<p class="why">Reading the option files…</p>':'<p class="why">Every team file\'s squad can be shown whole.</p>';
  const ok=S.settings.sqFix||{};
  return `<p class="why">These team files are broken: the game can't show every squad place, it draws an empty "---" row, and picking it can make the game glitch. <b>Repair the squad</b> puts each place right and has the export write the file again, in First install and Changes only: a player the game has in his club's or his country's file is added to the squad from that record; a player listed twice is listed once; the squad list is rebuilt so it shows every player. A player no team file holds is looked up in eFootball by his ID (the answer waits in Process and Review), and only his place is left out until a file has his record. Where a place can only be left out, or players have no name, <b>Live Update</b> brings in the team's real squad instead (free sources first, then Claude; the result goes to Process and Review): when you apply it, the new players take the game IDs of the players who left.</p>
   <div class="hc-rows">${L.map(x=>{const t=teamsArr().find(y=>!y.sameAs&&+y.gameId===x.code);const p=[];const on=!!ok[x.code];
     let rest=0;if(x.noRec.length){const pl=sqPlanNow(x),lk=S.settings.sqLooked||{};rest=pl.look.length+pl.made.length+pl.held.length;
       if(!pcReady()||!pl.t)p.push(hcPl(x.noRec.length,'place')+' with no player record (ID '+x.noRec.join(', ')+')');
       else{pl.fill.forEach(e=>p.push(e.name+' ('+e.id+') is in the game, in '+(e.f.club||'code '+e.f.team)+"'s file, but not in this file: he can be added"));
         {const mine=id=>(pl.t.players||[]).find(q=>+q.gameId===id||(q.ted&&+q.ted.pid===id)),from=q=>q&&q.ted&&+q.ted.team&&+q.ted.team!==x.code?(sqTeam(+q.ted.team)||{}).name||'code '+q.ted.team:'';
          pl.have.filter(id=>from(mine(id))).forEach(id=>{const q=mine(id);p.push(q.name+' ('+id+') added from '+from(q)+"'s file")});
          const dup=pl.have.filter(id=>!from(mine(id)));if(dup.length)p.push(hcPl(dup.length,'place')+' whose player is already in the squad (ID '+dup.join(', ')+')')}
         pl.held.forEach(e=>p.push(e.name+' ('+e.id+') plays for '+(e.f.club||'code '+e.f.team)+': two clubs can\'t share a player'));
         if(pl.made.length)p.push(hcPl(pl.made.length,'place')+' on an ID the option file\'s maker created (ID '+pl.made.join(', ')+')');
         pl.look.forEach(id=>p.push('ID '+id+' is in no team file'+(lk[id]===1?': found in eFootball, see Process and Review':lk[id]===2?': not in eFootball either':'')))}}
     if(x.notOrd.length)p.push(hcPl(x.notOrd.length,'place')+' the squad list leaves out');
     if(x.noName.length)p.push(hcPl(x.noName.length,'player')+' with no name');
     if(sqFixable(x)&&on)p.push('repaired: the next export writes it again');
     const b=(sqFixable(x)?(on?`<button class="sm" data-act="sqFixUndo" data-code="${x.code}" title="The export copies the option file's file again, as it is">Keep the file as it is</button>`:`<button class="sm primary" data-act="sqFix" data-code="${x.code}" title="Adds the players the game has from their other team's file, lists a player once, and rebuilds the squad list. Asks first.">Repair the squad</button>`):'')
       +((rest||x.noName.length)&&t?`<button class="sm${sqFixable(x)?'':' primary'}" data-act="teamLive" data-id="${t.id}" title="Replaces the squad with ${esc(t.name)}'s real one: free sources first, then Claude. Asks first. When you apply the result, the new players take the game IDs of the players who left and the export writes the file again.">Live update</button>`:'')
       +(t?`<button class="sm" data-act="openTeam" data-id="${t.id}">Open</button>`:'');
     return hcRow(sqFixable(x)&&on&&!x.noName.length?'note':'warn',t?esc(t.name):esc(x.f.P.team.name),'Code '+x.code+' · '+esc(x.f.file)+' · '+esc(p.join(' · ')),b,t?{subject:t.id,tip:t.name}:{})}).join('')}</div>`}
const sqFixHead=L=>{const ok=S.settings.sqFix||{},n=L.filter(x=>sqFixable(x)&&!ok[x.code]).length;return n?`<button class="sm primary" data-act="sqFixAll" title="Adds the players the game has from their other team's file, lists a player once, and rebuilds the squad lists. Asks first.">Repair the squads (${n})</button>`:''};
const sqFixSet=(codes,on)=>{const o=S.settings.sqFix||(S.settings.sqFix={});codes.forEach(c=>{if(on)o[c]=1;else delete o[c]});saveSettings();if(S.ui.tocSt){delete S.ui.tocSt.full;delete S.ui.tocSt.changes}rerender()};
ACT.sqFix=async el=>sqRepair([+el.dataset.code]);
// Live Update on a broken team file (the user, 2026-11-25: "isn't there another way to fix the rest?"): for places Repair
// can only leave out, and for players with no name, the team's real squad is brought in (ACT.teamLive). Applying it gives
// the new players the IDs of those who left and marks the file to be written again (sqTakeAfter).
ACT.sqFixUndo=el=>{sqFixSet([+el.dataset.code],false);toast('Code '+el.dataset.code+' goes out as the option file has it, unless its squad has changed. Players added by the repair stay: undo them from the change history.','ok')};
ACT.sqFixAll=async()=>{const ok=S.settings.sqFix||{};return sqRepair(ofBadSquads().filter(x=>sqFixable(x)&&!ok[x.code]).map(x=>x.code))};
// Squads that may show "---": players on an ID the option file's maker created (bit 30 or 31 set). Some of them show in the game
// (Zechiël, Beelen and Watanabe at Feyenoord, 2026-11-24 photos), some don't (Nico González and Khusanov at Man City, Rafa Marín
// at Villarreal), so the game test decides (docs/GAME_TESTS.md 25); until then they are listed, with no fix.
function mayDash(){return teamsArr().filter(t=>!t.sameAs&&!t.noCode&&!isNationalTeam(t)).map(t=>({t,ps:(t.players||[]).filter(p=>{const id=+(p.ted&&p.ted.pid)||+p.gameId;return id&&isEditId(id)&&pcRealId(id)})})).filter(x=>x.ps.length).sort((a,b)=>b.ps.length-a.ps.length||String(a.t.name).localeCompare(String(b.t.name)))}
function mayDashHTML(L){if(!L.length)return '<p class="why">No player is on an ID the option file\'s maker created.</p>';
  return `<p class="why">These players are on IDs the option file's maker created (1073741824 and up), not IDs from the game. Some of them show in the game by name and some show as "---" (Man City's Nico González and Khusanov, Villarreal's Rafa Marín). Which ones work is not known yet: game test 25 decides, and the fix follows from it. Nothing to do here until then.</p>
   <div class="hc-rows">${L.map(x=>hcRow('note',esc(x.t.name),esc(hcPl(x.ps.length,'player')+': '+x.ps.map(p=>p.name).join(', ')),`<button class="sm" data-act="openTeam" data-id="${x.t.id}">Open</button>`,{subject:x.t.id,tip:x.t.name})).join('')}</div>`}function ofFileCounts(){if(!S.settings.ofPkg)return null;const T=teamsArr().filter(t=>!t.sameAs),C=compsArr();const hasCed=c=>!!(c.of||(c.ced&&c.ced.b64&&!c.noCode));
  return{teams:T.length,ted:T.filter(t=>t.of||S.teds[t.id]).length,comps:C.length,ced:C.filter(hasCed).length,own:C.filter(c=>!hasCed(c)&&typeof ofGameComp==='function'&&ofGameComp(c)).length}}
const FILE_COLS='grid-template-columns:minmax(160px,1.1fr) minmax(200px,1.6fr) auto';
function ofTwoHTML(L){if(!L.length)return S.ui.ofRdLoading?'<p class="why">Reading the option files…</p>':'<p class="why">Every team code has one team file.</p>';
  return `<p class="why">These team codes have more than one team file in your option files. The last by file name is used (the game reads files ticked together in file-name order, the last one winning) unless you pick another: the team at that code is then read again from the file you pick, and exports write it.</p>
   <div class="hc-rows">${L.map(x=>{const t=teamsArr().find(y=>!y.sameAs&&+y.gameId===x.code);const sel=`<select id="ofpick-${x.code}" aria-label="File for code ${x.code}">${x.files.map(f=>`<option value="${esc(f.src+'|'+f.file)}" ${f===x.use?'selected':''}>${esc(f.file)} · ${esc(f.P.team.name)} · ${f.P.players.length} players${f.srcName&&f.src!==(S.settings.ofPkg||{}).id?' · '+esc(f.srcName):''}</option>`).join('')}</select>`;
     return hcRow('note',t?esc(t.name):'Code '+x.code,'Code '+x.code+' · used: <b>'+esc(x.use.file)+'</b><div style="margin-top:4px">'+sel+'</div>',`<button class="sm" data-act="ofPickTeam" data-code="${x.code}">Use this file</button>`,t?{subject:t.id,tip:t.name}:{})}).join('')}</div>`}
function ofPicsHTML(L){if(!L.length)return S.ui.ofRdLoading?'<p class="why">Reading the option files…</p>':'<p class="why">Every image name has one picture.</p>';
  return `<p class="why">These image names stand for more than one picture in your option files. The game keeps one image per name, so every team or competition file naming it shows the same picture. The first found is used unless you pick another.</p>
   <div class="hc-rows">${L.map(x=>hcRow('note',esc(x.name),`<div class="row" style="gap:10px;flex-wrap:wrap">${x.pics.map((p,i)=>`<label class="c" style="align-items:center"><input type="radio" name="ofimg-${esc(x.name)}" value="${esc(p.ref)}" ${p===x.use?'checked':''}> <img class="thumb" src="${esc(ofUrl(p.ref))}" alt="" loading="lazy"> <span class="small muted">${kb(p.size)}</span></label>`).join('')}</div>`,`<button class="sm" data-act="ofPickImg" data-name="${esc(x.name)}">Use the ticked picture</button>`)).join('')}</div>`}
ACT.ofPickTeam=async el=>{const code=+el.dataset.code;const sel=$('#ofpick-'+code);const v=sel&&sel.value;const R=OF_RD.r;if(!R||!v)return;const f=(R.T.get(code)||[]).find(x=>x.src+'|'+x.file===v);if(!f)return;
  const t=teamsArr().find(x=>!x.sameAs&&+x.gameId===code);
  if(!await ask('Use '+f.file+' for code '+code+'?',`The team at code ${code}${t?' (<b>'+esc(t.name)+'</b>)':''} is read again from <b>${esc(f.file)}</b>: its name, players and the images that file names. Changes you made to this team are replaced. A snapshot is taken first.`,'Use this file'))return;
  if(t)await takeSnapshot('Before reading code '+code+' from '+f.file,true);
  (S.settings.ofPick||(S.settings.ofPick={}))[code]=v;saveSettings();
  if(t){const img=ofImgMaker(R);histLabel('Code '+code+' read from '+f.file,'Edit',()=>{ofTeamFromFile(t,f,img,code);t.players.forEach(normPlayer);saveTeam(t)})}
  if(S.ui.tocSt){delete S.ui.tocSt.full;delete S.ui.tocSt.changes}toast('Code '+code+' now uses '+f.file,'ok');rerender()};
ACT.ofPickImg=el=>{const name=el.dataset.name;const R=OF_RD.r;if(!R)return;const L=R.I.get(name.toLowerCase())||[];const r=document.querySelector(`input[name="ofimg-${CSS.escape(name)}"]:checked`);const want=r&&L.find(x=>x.ref===r.value);if(!want)return;
  (S.settings.ofImgPick||(S.settings.ofImgPick={}))[name.toLowerCase()]=want.ref;saveSettings();const refs=new Set(L.map(x=>x.ref));let n=0;
  histLabel('Image name '+name+': picture picked','Edit',()=>Object.values(S.images).forEach(i=>{if(refs.has(i.ref)&&i.ref!==want.ref){i.ref=want.ref;i.size=want.size;saveImage(i);n++}}));
  toast(name+': '+(n?n+' image'+(n===1?'':'s')+' now show':'it shows')+' the picture you picked','ok');rerender()};function ofOwnCompsHTML(L){const f=ofFileCounts();if(!L.length)return '<p class="why">Every competition has a competition file.</p>';
  return `<p class="why">The project has <b>${f.comps}</b> competitions and writes <b>${f.ced}</b> competition files: these ${L.length} are the game's own competitions, which the option file has no file for. Their teams are written; the competitions themselves stay as the game has them.</p>
   <div class="hc-rows">${L.map(c=>hcRow('note',esc(c.name),esc([c.type||'',c.country].filter(Boolean).join(' · ')),compEditLocked(c)?'':`<button class="sm" data-act="editComp" data-id="${c.id}">Open</button>`,{tip:c.name})).join('')}</div>`}
/* ----- International teams (Information; rule book "International teams") -----
   free:  players of a national team whose ID no team (club) of the project uses: the game has them in their country only
   added: players of a team whose ID the game has only in a national team's file: added to the team in the studio, and written
          from the record they share with their country (natShareRec) */
let _NATL={k:'',v:null};
function natLists(){const k=Store.rev+'|'+PCV+'|'+pcReady()+'|'+Object.keys(S.teams).length;if(_NATL.k===k&&_NATL.T===S.teams)return _NATL.v;
  const idOf=p=>+(p.ted&&p.ted.pid)||(pcRealId(p.gameId)?+p.gameId:0),nat=[],by=new Map(),free=[],added=[];
  teamsArr().forEach(t=>{if(t.sameAs||t.noCode)return;if(isNationalTeam(t)){nat.push(t);return}(t.players||[]).forEach(p=>{const id=idOf(p);if(id)(by.get(id)||by.set(id,[]).get(id)).push({t,p,id})})});
  nat.forEach(t=>(t.players||[]).forEach(p=>{const id=idOf(p);if(id&&!by.has(id))free.push({t,p,id})}));
  if(pcReady())by.forEach((L,id)=>L.forEach(x=>{const g=natOnlyRec(x.p,id);if(g)added.push(Object.assign({from:g.files[0].club},x))}));
  const srt=(a,b)=>String(a.t.name).localeCompare(String(b.t.name))||String(a.p.name).localeCompare(String(b.p.name));
  const v={free:free.sort(srt),added:added.sort(srt)};_NATL={k,T:S.teams,v};return v}
const NAT_COLS='grid-template-columns:minmax(150px,1.2fr) minmax(130px,1fr) 110px auto';
function natFreeHTML(L){if(!L.length)return '<p class="why">Every national player with an ID is also in a team.</p>';const lim=150;
  return `<p class="why">These players are in a national team, and no team of the project has a player on their ID: the game has them in their country only. <b>Add to a team</b> puts a copy of the player in the team you pick, on the same ID, and leaves him in his national team.</p>
   <div class="hc-rows">${L.slice(0,lim).map(x=>hcRow('note',`<button type="button" class="hc-link" data-act="tocPlayer" data-id="${x.p.id}" title="Open ${esc(x.p.name)}">${esc(x.p.name)}</button>`+(x.p.pos?' <span class="small muted">'+esc(x.p.pos)+'</span>':''),esc(x.t.name)+' · ID '+x.id,`<button class="sm" data-act="natAdd" data-id="${x.t.id}|${x.p.id}">Add to a team</button>`,{tip:x.p.name})).join('')}</div>
   ${L.length>lim?`<p class="why">… and ${L.length-lim} more. Type a player or country in "Find a team or problem" to narrow the list.</p>`:''}`}
function natAddHTML(L){if(!pcReady())return '<p class="why">Reading the game\'s team files…</p>';if(!L.length)return '<p class="why">No team has a player the game knows only from a national team.</p>';
  return `<p class="why">These players are in a team, but the game has their ID only in a national team's file: they were added to the team in the studio. The export writes them into the team's file from the record they share with their country.</p>
   <div class="hc-rows">${L.map(x=>hcRow('note',esc(x.p.name)+(x.p.pos?' <span class="small muted">'+esc(x.p.pos)+'</span>':''),esc(x.t.name)+' · from '+esc(x.from)+' · ID '+x.id,`<button class="sm" data-act="openTeam" data-id="${x.t.id}">Open</button><button class="sm" data-act="pfRemove" data-id="${x.t.id}|${x.p.id}">Remove from the team</button>`,{tip:x.p.name})).join('')}</div>`}
// a national player joins a team as well: a copy on the same ID, linked to the record in his country's file
ACT.natAdd=el=>{const x=pcFind(el.dataset.id);if(!x)return;S.ui.natAdd=el.dataset.id;
  const L=teamsArr().filter(t=>!t.sameAs&&!t.noCode&&!isNationalTeam(t)).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  modal(`<div class="mhead"><h2>Add ${esc(x.p.name)} to a team</h2></div><p>A copy of him joins the team you pick, on the same game ID, with the details he has in <b>${esc(x.t.name)}</b>. He stays in his national team.</p>
   <label class="small muted" for="nat-add-to">Team</label><select id="nat-add-to" style="width:100%;margin:4px 0 14px">${L.map(t=>`<option value="${t.id}">${esc(t.name)}${compName(t.compId)?' · '+esc(compName(t.compId)):''} (${(t.players||[]).length})</option>`).join('')}</select>
   <div class="row end"><button data-act="close">Cancel</button><button class="primary" data-act="natAddGo">Add</button></div>`)};
ACT.natAddGo=()=>{const x=pcFind(S.ui.natAdd),sel=$('#nat-add-to'),T=sel&&S.teams[sel.value];if(!x||!T)return;const id=+(x.p.ted&&x.p.ted.pid)||+x.p.gameId;
  if((T.players||[]).length>=40){toast(T.name+' already has 40 players, the most the game allows','err');return}
  if((T.players||[]).some(q=>+(q.ted&&q.ted.pid)===id||+q.gameId===id)){toast(T.name+' already has a player on that ID','err');return}closeModal();
  histLabel(x.p.name+' of '+x.t.name+' added to '+T.name,'Health',()=>{const p=clone(x.p);p.id=uid();p.gameId=id;p.ted={pid:id,team:(x.p.ted&&+x.p.ted.team)||+x.t.gameId||0,slot:-1};delete p.codeSet;delete p.codeWas;
    if(p.number&&(T.players||[]).some(q=>+q.number===+p.number))p.number='';T.players=[...(T.players||[]),p];NOFILE.delete(T.id);PCV++;saveTeam(T)});
  toast(x.p.name+' added to '+T.name+'; he stays in '+x.t.name,'ok');rerender()};
// cups in the game that no team plays in
const emptyCups=()=>{const used=new Set(teamsArr().map(t=>t.compId));return compsArr().filter(c=>isCupComp(c)&&!c.noCode&&!c.worldCup&&!used.has(c.id)&&!(c.teams||[]).some(id=>S.teams[id])).sort((a,b)=>String(a.name).localeCompare(String(b.name)))};
const emptyCupsHTML=L=>L.length?`<p class="why">Cups in the game with no teams. A cup is filled from the leagues' teams in the game itself, so this is only for your information.</p><div class="hc-rows">${L.map(c=>hcRow('note',esc(c.name),esc([c.type||'Cup',c.country].filter(Boolean).join(' · ')),compEditLocked(c)?'':`<button class="sm" data-act="editComp" data-id="${c.id}">Open</button>`,{tip:c.name})).join('')}</div>`:'<p class="why">Every cup has teams.</p>';
VIEWS.health=()=>{const f=S.ui.hf=Object.assign({sev:'needs',q:''},S.ui.hf||{});if(!['needs','err','warn','info','note','all'].includes(f.sev))f.sev='needs';
  const open=S.ui.hfOpen||(S.ui.hfOpen={}),more=S.ui.hfMore||(S.ui.hfMore={});
  const iss=healthIssues(),cups=findCupDuplicates().filter(x=>!twinDone(x.cup,x.league)),dpAll=findDuplicatePlayers(),dp=dpAll.filter(a=>a.filter(x=>!isNationalTeam(x.t)).length>1);
  const auto=hcAutoPlan(iss);const q=norm(f.q);
  const vis=sv=>f.sev==='all'||(f.sev==='needs'?(sv==='err'||sv==='warn'):sv===f.sev);
  // the sections that are lists of their own, each with one level
  const cupHTML=cups.length?`<p class="why">In PES, cups use the league teams. These teams are copies under a cup. <b>Update from …</b> gives a cup's team that has a code of its own the league team's details, kits, crest and players, each player with an ID of his own. <b>Merge</b> removes the copy instead: the league team is kept, takes over anything it is missing, and is listed as a participant of the cup. A snapshot is saved first.</p>
   <div class="row" style="margin:0 14px 6px"><label class="c small"><input type="checkbox" data-act="mgAll" ${S.ui.mgOff&&S.ui.mgOff.size?'':'checked'}> Tick all for Merge</label></div><div class="hc-rows">
   ${cups.map(x=>hcRow('info',esc(x.cup.name)+' <span class="small muted">in '+esc(x.comp.name)+'</span>','A copy of <b>'+esc(x.league.name)+'</b> ('+esc(compName(x.league.compId))+') · players '+(x.cup.players||[]).length+' → '+(x.league.players||[]).length,cupOwnCode(x.cup)?`<button class="sm primary" data-act="twinUpdate" data-id="${x.cup.id}">Update from ${esc(x.league.short||x.league.name)}</button>`:'',{lead:`<input type="checkbox" data-act="mgOne" data-id="${x.cup.id}" ${S.ui.mgOff&&S.ui.mgOff.has(x.cup.id)?'':'checked'} aria-label="Merge ${esc(x.cup.name)}">`,tip:x.cup.name})).join('')}</div>
   <div class="row" style="padding:12px 14px"><button data-act="mergeDups">Merge ${hcPl(cups.length-(S.ui.mgOff?S.ui.mgOff.size:0),'team')} instead</button></div>`:'<p class="why">No cup copies found.</p>';
  const cupUp=cups.filter(x=>cupOwnCode(x.cup)).length;const tw=poolTwins();const nl=noLeagueTeams().filter(t=>!t.noCode),ec=emptyComps().filter(c=>!c.noCode),eCups=emptyCups();const MS=S.settings.ofPkg?msList():[];const Z=hcNoCode();
  const X={'x:dp':{t:'Same player in two teams',lv:'warn',n:dp.length,html:dpSectionHTML(dp),btns:dpHeadBtns(dp)},
    'x:nolg':{t:'Teams without a league',lv:'warn',n:nl.length,html:noLeagueHTML(nl),btns:(()=>{const st=nlStore(),todo=nl.filter(t=>!st[t.id]||st[t.id].down).length,put=nl.filter(t=>nlSug(t)).length;
      return (todo?`<button class="sm primary" data-act="nlFindAll" title="Looks up the league of every team here: the free sources first, then Claude. Nothing changes until you put a team in the league found.">Find their leagues (${todo})</button>`:'')+(put?`<button class="sm primary" data-act="nlPutAll">Put ${put} in the league found</button>`:'')})()},
    'x:cups':{t:'Cup copies',lv:'info',n:cups.length,html:cupHTML,btns:cupUp?`<button class="sm primary" data-act="twinAll" data-kind="cup">Update all ${cupUp} from their league teams</button>`:''},
    'x:pool':{t:'Pool teams with a league namesake',lv:'note',n:tw.length,html:poolTwinsHTML(tw)||'<p class="why">No pool team has a namesake in an added league.</p>',btns:tw.length?`<button class="sm primary" data-act="twinAll">Update all ${tw.length} from their league teams</button>`:''},
    'x:comps':{t:'Leagues with no teams',lv:'warn',n:ec.length,html:emptyCompsHTML(),btns:ec.length?`<button class="sm primary" data-act="ecFindAll" title="Looks up the teams of every league with no teams, free sources first. Results go to Process and Review.">Apply all suggested actions (${ec.length})</button>`:''},
    'x:cupsEmpty':{t:'Cups with no teams',lv:'note',n:eCups.length,html:emptyCupsHTML(eCups)},
    'x:miss':{t:'Images the option file doesn\'t have',lv:'note',n:MS.length,html:msHTML(MS),btns:msHeadBtns(MS),off:!S.settings.ofPkg},
    'x:nocode':{t:'Without a code',lv:'note',n:Z.teams.length+Z.comps.length,html:hcNoCodeHTML(Z)}};
  {const L=typeof simNamePairs==='function'?simNamePairs():[];X['x:simname']={t:'Similarly named teams',lv:'info',n:L.length,html:typeof simNameHTML==='function'?simNameHTML(L):''}}
  if(S.settings.ofPkg){const two=ofTwoFiles(),pics=ofTwoPics(),own=compsArr().filter(c=>!(c.of||(c.ced&&c.ced.b64&&!c.noCode))&&ofGameComp(c)).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    const bad=ofBadSquads(),md=mayDash();X['x:badsq']={t:'Broken team files',lv:'warn',n:bad.filter(x=>x.noName.length||!(S.settings.sqFix||{})[x.code]).length,html:ofBadHTML(bad),btns:sqFixHead(bad)};X['x:maydash']={t:'Players on IDs the option file created',lv:'note',n:md.length,html:mayDashHTML(md)};
    X['x:twofiles']={t:'Two files for one team code',lv:'note',n:two.length,html:ofTwoHTML(two)};
    X['x:twopics']={t:'Two pictures for one image name',lv:'note',n:pics.length,html:ofPicsHTML(pics)};
    X['x:owncomps']={t:'Competitions with no competition file',lv:'note',n:own.length,html:ofOwnCompsHTML(own)}}
  {const NL=natLists(),hit=L=>q?L.filter(x=>norm(x.p.name).includes(q)||norm(x.t.name).includes(q)):L,A=hit(NL.free),B=hit(NL.added);
    X['x:natfree']={t:'National players in no team',lv:'note',n:A.length,html:natFreeHTML(A),qhit:!!q&&A.length>0};
    X['x:natadd']={t:'Added to a team from a national team',lv:'note',n:B.length,html:natAddHTML(B),qhit:!!q&&B.length>0}}
  const N={err:0,warn:0,info:0,note:0};iss.forEach(i=>N[i.sev]++);Object.values(X).forEach(x=>{if(!x.off)N[x.lv]+=x.n});
  // 1. the answer
  const st=N.err?'err':N.warn?'warn':'ok';
  const big=N.err?`${hcPl(N.err,'problem')} must be fixed before you export`:N.warn?'Your files will work, but some things should be fixed':'Everything checks out. Ready for the game.';
  const small=[N.err&&N.warn?hcPl(N.warn,'more thing')+' should be fixed':'',N.info?hcPl(N.info,'suggestion'):'',N.note?N.note+' for your information':''].filter(Boolean).join(' · ');
  const fixN=jobsArr().filter(j=>j.autoApply&&(j.status==='queued'||j.status==='running')).length;
  const fixing=fixN?`<div class="card" role="status" style="margin-bottom:10px;border-color:var(--accent)"><b>${hcPl(fixN,'fix','fixes')} in progress.</b> <span class="small muted">Each result goes to <a href="#review">Process and Review</a>; an issue clears once you apply its result there. Closing or reloading the page is fine: the fixes carry on when you open the studio again.</span>${S.ui.ai.running?'':' <button class="sm primary" data-act="qResume">Continue now</button>'}</div>`:'';
  const status=fixing+`<div class="card hc-status ${st==='err'?'bad':st==='warn'?'warn':'good'}" role="status"><span class="sev ${st}">${st==='err'?'Not ready':st==='warn'?'Almost ready':'Ready'}</span>
    <div class="txt"><div class="big">${big}</div>${small?`<div class="small muted">${small}</div>`:''}</div>
    ${auto.total?`<button class="primary" data-act="hcAutoFix" title="Removes duplicate entries and gives clean shirt numbers. You can undo it from the change history.">Fix ${hcPl(auto.total,'team')} automatically</button>`:''}</div>`;
  // 2. the levels
  const tile=(k,n,l)=>`<button class="hc-tile${f.sev===k?' on':''}" data-act="hcSev" data-sev="${k}" aria-pressed="${f.sev===k}"><div class="n" style="color:${k==='err'?'var(--bad)':k==='warn'?'var(--warn)':k==='info'?'var(--info)':k==='note'?'var(--muted)':'var(--text)'}">${n}</div><div class="l">${l}</div></button>`;
  const tiles=`<div class="hc-tiles">${tile('err',N.err,'Must fix')}${tile('warn',N.warn,'Should fix')}${tile('info',N.info,'Suggestions')}${tile('note',N.note,'Information')}${tile('all',N.err+N.warn+N.info+N.note,'Everything')}</div>`;
  const shown=f.sev==='needs'?'Showing what to fix.':`Showing ${f.sev==='all'?'everything':f.sev==='note'?'information':HC_SEV[f.sev].toLowerCase()+' items'}. <button class="sm" data-act="hcSev" data-sev="needs">Back to what to fix</button>`;
  const bar=`<div class="row" style="margin-bottom:10px"><input type="search" placeholder="Find a team or problem" value="${esc(f.q)}" data-in="hcQ" aria-label="Find a team or problem" style="min-width:240px">
    <span class="spacer"></span><span class="small muted">${shown}</span></div>`;
  // 3. groups → sub-groups → rows
  let list=iss.map(i=>Object.assign({},i,{s:hcSubject(i)})).filter(i=>vis(i.sev));
  if(q)list=list.filter(i=>norm(i.s.name).includes(q)||norm(i.msg).includes(q));
  const chips=c=>['err','warn','info','note'].map(sv=>c[sv]?`<span class="sev ${sv}" title="${HC_SEV[sv]}">${c[sv]}</span>`:'').join('');
  const subHTML=(g,[title,keys])=>{const a=list.filter(i=>keys.includes(i.k));const parts=keys.filter(k=>X[k]).map(k=>X[k]).filter(x=>!x.off&&vis(x.lv)&&(x.n>0||f.sev==='all')&&(!q||x.qhit||norm(x.t).includes(q)||norm(g).includes(q)));
    if(!a.length&&!parts.length)return null;const hk='s:'+g+'|'+title;const c={err:0,warn:0,info:0,note:0};a.forEach(i=>c[i.sev]++);parts.forEach(x=>c[x.lv]+=x.n);
    const isOpen=open[hk]!==undefined?open[hk]:(c.err>0||!!q);const lim=more[hk]?a.length:40;(S.ui.hcGroups||(S.ui.hcGroups={}))[hk]=a;const nb=hcBulkList(a).length;
    const rfT=new Set(a.filter(i=>i.k==='gaps').map(i=>i.s.id).filter(id=>S.teams[id])).size;// Random fill for every team in the sub-group: the last resort
    const pcN=a.filter(i=>hcActs(i).some(x=>x.a==='pcGive')).length;const pcNone=!pcN&&a.some(i=>(i.k==='notingame'||i.k==='leftout'||i.k==='noplid')&&hcActs(i).some(x=>x.a==='pcRoomOpen'));const shN=a.filter(i=>i.k==='sharedid').length;const pfN=a.filter(i=>hcActs(i).some(x=>x.a==='pfFind'&&x.label!=='Look up again')).length;
    // the shared-ID fix gives each other player a free ID the game has: with fewer free IDs than players, it says so and offers Make room
    const shNeed=shN?sharedNeed():0,shFree=shN?pcFreeCount():null,shShort=shN&&shFree!==null&&shFree<shNeed;
    const hb=(shN?(shShort?`<button class="sm primary" data-act="pcRoomOpen" title="${shNeed} player${shNeed===1?'':'s'} on shared game IDs each need a free ID of ${shNeed===1?'his':'their'} own, and the game has ${shFree} free. Delete teams or competitions you don't want to free more.">${shFree?'Only '+shFree+' free ID'+(shFree===1?'':'s')+' for '+shNeed+' players':'No free IDs left for '+shNeed+' players'}: make room</button>`
      :`<button class="sm primary" data-act="sharedAll" title="Each game ID stays with the player the game has there now; every other player takes a free ID the game has (${shFree===null?'being counted':shFree+' free'})">New player IDs for all (${shNeed} player${shNeed===1?'':'s'})</button>`):'')
      +(pfN?`<button class="sm primary" data-act="pfFindAll" title="Looks up the team each of these players plays for: the free sources first, then Claude. Nothing changes until you apply an answer in his row.">Find their teams (${pfN})</button>`:'')
      +(pcN?`<button class="sm primary" data-act="pcAllocAll" title="Gives every player without an ID a free ID the game has, each the one suggested in his row">Allocate free IDs (${pcN})</button>`:pcNone?`<button class="sm primary" data-act="pcRoomOpen" title="No free ID is left: delete teams or competitions you don't want to free some">No free IDs left: make room</button>`:'')
      +(nb?`<button class="sm primary" data-act="hcBulk" data-hk="${esc(hk)}" title="Runs the first fix of every row in this sub-group">Apply all suggested actions (${nb})</button>`:'')
      +(rfT?`<button class="sm" data-act="randomFillAll" data-hk="${esc(hk)}" title="Last resort: made-up but realistic values for only what is missing">Random fill all (${hcPl(rfT,'team')})</button>`:'')+parts.map(x=>x.btns||'').join('');
    const whys=[...new Set(a.map(i=>i.k))].map(k=>HC_WHY[k]).filter(Boolean).map(w=>`<p class="why">${esc(w)}</p>`).join('');
    const rows=a.slice(0,lim).map(i=>hcRow(i.sev,esc(i.s.name),esc(hcMsg(i,i.s))+hcLastHTML(i.s.id),hcBtns(i),{tip:i.s.name,subject:i.s.id})).join('');
    const multi=parts.length+(a.length?1:0)>1;
    const body=whys+(a.length?`<div class="hc-rows">${rows}${a.length>lim?hcMoreRow(a.length-lim,`<button class="sm" data-act="hcMore" data-hk="${esc(hk)}">Show all ${a.length}</button>`):''}</div>`:'')
      +parts.map(x=>(multi||x.t!==title?`<div class="hc-part"><span class="sev ${x.lv}" title="${HC_SEV[x.lv]}"><span class="sr">${HC_SEV[x.lv]}</span></span> <b>${esc(x.t)}</b> <span class="small muted">${x.n||'none'}</span></div>`:'')+x.html).join('');
    return{c,html:`<details class="hc-sub" data-hk="${esc(hk)}" ${isOpen?'open':''}><summary><span class="t">${esc(title)}</span>${hb?`<span class="hc-hacts">${hb}</span>`:''}<span class="hc-count">${chips(c)||'<span class="small muted">none</span>'}</span></summary>${body}</details>`}};
  const grpHTML=([g,why,subs])=>{const S2=subs.map(sb=>subHTML(g,sb)).filter(Boolean);if(!S2.length)return '';const c={err:0,warn:0,info:0,note:0};S2.forEach(x=>Object.keys(c).forEach(k=>c[k]+=x.c[k]));
    const hk='g:'+g,isOpen=open[hk]!==undefined?open[hk]:true;
    return `<details class="hc-grp" data-hk="${esc(hk)}" ${isOpen?'open':''}><summary><span class="t">${esc(g)}</span><span class="hc-count">${chips(c)||'<span class="small muted">none</span>'}</span></summary>${why?`<p class="why">${esc(why)}</p>`:''}${S2.map(x=>x.html).join('')}</details>`};
  const body=HC_LAYOUT.map(grpHTML).join('')||`<div class="card"><p class="small" style="margin:0">${q?'Nothing matches “'+esc(f.q)+'”.':f.sev==='needs'?'Nothing to fix.'+(N.info||N.note?' There '+(N.info+N.note===1?'is ':'are ')+(N.info?hcPl(N.info,'suggestion'):'')+(N.info&&N.note?' and ':'')+(N.note?N.note+' for your information':'')+'.':''):'Nothing here.'}</p></div>`;
  // 4. more checks: the tools
  const tool=(act,label,txt)=>`<div class="hc-tool"><p class="small">${txt}</p><button class="sm" data-act="${act}">${label}</button></div>`;
  // one tool only: every other one repeated a group's own button (Fix automatically, Apply all suggested actions)
  const toolsHTML=`<div style="padding:4px 14px 10px">${efAvailable()?tool('fifaAll','Live update','For every national team of yours in the newest World Cup: FIFA\'s official team, with new players rated from EA SPORTS FC. Results go to Process and Review.'):'<p class="small muted">The World Cup pull needs the studio\'s server (start.bat or the website).</p>'}</div>`;
  const tOpen=open['x:tools']!==undefined?open['x:tools']:false;
  return `<h1>Health check</h1><p class="sub">Checks the teams and competitions in the game for anything the game will reject or that's easy to miss, and fixes most of it in one click.</p>
  ${status}${tiles}${bar}${body}
  <h2>More checks</h2><details class="hc-grp" data-hk="x:tools" ${tOpen?'open':''}><summary><span class="t">Tools for every team</span></summary>${toolsHTML}</details>`};
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.classList&&(d.classList.contains('hc-grp')||d.classList.contains('hc-sub'))&&d.dataset.hk){(S.ui.hfOpen||(S.ui.hfOpen={}))[d.dataset.hk]=d.open}},true);
ACT.hcSev=el=>{const f=S.ui.hf;f.sev=f.sev===el.dataset.sev&&el.dataset.sev!=='needs'?'needs':el.dataset.sev;rerender()};
ACT.hcMore=el=>{(S.ui.hfMore||(S.ui.hfMore={}))[el.dataset.hk]=true;rerender()};
IN.hcQ=el=>{S.ui.hf.q=el.value;clearTimeout(S.ui.hcq);S.ui.hcq=setTimeout(()=>{rerender();const i=$('[data-in=hcQ]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)};
ACT.hcAutoFix=async()=>{const P=hcAutoPlan(healthIssues());if(!P.total){toast('Nothing here can be fixed automatically','ok');return}const plans=P.dd.map(id=>Object.assign({t:S.teams[id]},dedupePlan(S.teams[id])));const rm=plans.reduce((n,x)=>n+x.n,0);
  const li=[plans.length?`<li>Remove <b>${rm}</b> duplicate entr${rm===1?'y':'ies'} from <b>${plans.length}</b> team${plans.length===1?'':'s'}. Each player is kept once, as his most complete entry, and IDs too long for the game are cleared.</li>`:'',
    P.nb.length?`<li>Give clean shirt numbers in <b>${P.nb.length}</b> team${P.nb.length===1?'':'s'}. Numbers that are already unique stay.</li>`:''].join('');
  if(!await ask('Fix automatically?',`<ul style="margin:0 0 8px;padding-left:18px">${li}</ul>You can undo this from the change history.`,'Fix now'))return;
  await takeSnapshot('Before the health check\'s automatic fixes',true);
  histLabel('Health check: automatic fixes','Health',()=>{P.dd.forEach(id=>{const t=S.teams[id];if(t)dedupeApply(t,dedupePlan(t))});
    P.nb.forEach(id=>{const t=S.teams[id];if(t){renumber(t);saveTeam(t)}})});
  toast('Fixed '+hcPl(P.total,'team'),'ok');rerender()};
// Which team or competition the game shows for this one, so you know what to open in Edit mode. The option file the project is
// built from is the one installed in the game, so its file at the same game ID is the answer. PES's own default teams never come
// into it: with an option file in use, a hand-typed "replaces" name is ignored.
function inGameTeam(t){if(!t)return'';const r=S.teds[t.id];if(t.of&&r&&!r.generated&&r.origName)return r.origName;
  if(!S.settings.ofPkg)return t.gameSlot||'';const id=+t.gameId;if(!id)return'';
  const o=teamsArr().find(x=>x.of&&+x.gameId===id&&S.teds[x.id]&&!S.teds[x.id].generated&&S.teds[x.id].origName);return o?S.teds[o.id].origName:''}
const CED_NAME=new WeakMap();
function inGameComp(c){if(!c)return'';const d=c.ced;if(d&&!d.generated&&d.b64){if(!d.origName&&!CED_NAME.has(d)){let n='';try{n=CED.parse(TED.unb64(d.b64)).name||''}catch(e){}CED_NAME.set(d,n)}
    const n=d.origName||CED_NAME.get(d);if(n)return n}
  return S.settings.ofPkg?'':(c.gameSlot||'')}
// ---- Competition Structure: who plays in which league in the game ----
// RULE (rule book, "Leagues in the game"): competition files hold no teams and a team file keeps its club's own team slot, which
// PES 2021 places in a league. Which clubs play in a league is set by hand in the game: Edit → Competition Structure (option
// files ship "league order" pictures for it). The studio's leagues are the season's line-up; this guide lists, league by league,
// the clubs to move in there, where each one sits in the game now (the league of its team slot, from PES Master's PES 2021 list).
const CS_NAME={'english-league':'English League','english-2nd-division':'English 2nd Division','spanish-league':'Spanish League','spanish-2nd-division':'Spanish 2nd Division','peu-league':'PEU League (fictional)','pla-league':'PLA League (fictional)','pas-league':'PAS League (fictional)','other-european-teams':'Other European teams','other-teams-latin-america':'Other Latin American teams','other-teams-asia':'Other Asian teams'};
const csLeagueName=k=>CS_NAME[k]||String(k||'').split('-').map(w=>w?w[0].toUpperCase()+w.slice(1):w).join(' ');
const csSlotLeague=t=>{const L=PES21_TEAMS;if(!L||!t||!+t.gameId)return '';const x=L.find(y=>y.id===+t.gameId);return x?x.league:''};
// a league's own place in the game: the league most of its clubs' slots are in
function csHome(c,ts){const n={};ts.forEach(t=>{const k=csSlotLeague(t);if(k)n[k]=(n[k]||0)+1});const top=Object.entries(n).sort((a,b)=>b[1]-a[1])[0];return top?top[0]:''}
function csPlan(){if(!PES21_TEAMS){pes21Teams().then(()=>{if(/^#(health|optionfile|teams)/.test(location.hash))rerender()});return null}
  // national teams play in no league (Competition Structure is for clubs)
  const leagues=compsArr().filter(c=>!isCupComp(c)&&!c.worldCup).map(c=>({c,ts:teamsArr().filter(t=>t.compId===c.id&&!t.sameAs&&!isNationalTeam(t))})).filter(r=>r.ts.length);
  leagues.forEach(r=>{r.home=csHome(r.c,r.ts);r.moves=r.ts.filter(t=>{const k=csSlotLeague(t);return k&&r.home&&k!==r.home}).map(t=>({t,from:csSlotLeague(t)}))});
  const homeOf=new Map(leagues.filter(r=>r.home).map(r=>[r.home,r]));leagues.forEach(r=>r.moves.forEach(m=>{m.fromComp=homeOf.get(m.from)||null}));
  return{leagues,total:leagues.reduce((a,r)=>a+r.moves.length,0)}}
function csMoveNote(t){const P=csPlan();if(!P)return '';const r=P.leagues.find(r=>r.moves.some(m=>m.t.id===t.id));if(!r)return '';const m=r.moves.find(m=>m.t.id===t.id);
  return `<p class="small" style="margin:6px 0 0"><span class="tag t-mov">Competition Structure</span> In the game ${esc(t.name)} sits in ${esc(m.fromComp?m.fromComp.c.name:csLeagueName(m.from))}. Move it to ${esc(r.c.name)} in Edit → Competition Structure; no game file can do it.</p>`}
function slotGuideHTML(){const P=csPlan();if(!P)return '<p class="small muted">Reading PES 2021\'s league list…</p>';
  return `<details ${P.total?'open':''}><summary style="cursor:pointer;font-weight:700">Competition Structure in the game${P.total?` <span class="tag t-mov">${P.total} move${P.total===1?'':'s'}</span>`:''}</summary>
    <p class="small" style="margin:6px 0">Which teams play in a league is set in the game, not by any file: <b>Edit → Competition Structure</b>. Importing the team files leaves each team in the league of its own team slot. Make these moves after importing, league by league (the option file's league-order pictures show the same). Swap a team in with the team moving out to keep each league's size.</p>
    <div class="grid g2" style="margin-top:8px">${P.leagues.map(({c,ts,home,moves})=>{const cg=inGameComp(c);const out=P.leagues.flatMap(r=>r.moves.filter(m=>m.fromComp&&m.fromComp.c.id===c.id).map(m=>({t:m.t,to:r.c})));
      return `<div class="card" style="padding:10px"><b>${esc(c.name)}</b>${cg&&norm(cg)!==norm(c.name)?` <span class="muted small">(in-game: ${esc(cg)})</span>`:''}${home?` <span class="muted small">· ${esc(csLeagueName(home))} in PES 2021</span>`:''}
        ${moves.length?`<div class="small" style="margin-top:4px"><b>Move in (${moves.length}):</b> ${moves.map(m=>`${esc(m.t.name)} <span class="muted">from ${esc(m.fromComp?m.fromComp.c.name:csLeagueName(m.from))}</span>`).join(' · ')}</div>`:''}
        ${out.length?`<div class="small" style="margin-top:2px"><b>Move out (${out.length}):</b> ${out.map(o=>`${esc(o.t.name)} <span class="muted">to ${esc(o.to.name)}</span>`).join(' · ')}</div>`:''}
        <div class="small muted" style="margin-top:4px">${ts.length} teams: ${ts.map(t=>esc(t.name)).join(' · ')}</div></div>`}).join('')}</div></details>`}
function csText(){const P=csPlan();if(!P||!P.total)return '';return `
COMPETITION STRUCTURE (Edit > Competition Structure in PES 2021)
Which teams play in a league is set in the game, not by any file. After importing, move these teams:
${P.leagues.filter(r=>r.moves.length).map(r=>`${r.c.name}: move in ${r.moves.map(m=>m.t.name+' (from '+(m.fromComp?m.fromComp.c.name:csLeagueName(m.from))+')').join(', ')}`).join('\n')}
`}
ACT.openTeam=el=>{S.ui.teamId=el.dataset.id;S.ui.teamTab='squad';location.hash='teams'};
ACT.openTeamImg=el=>{S.ui.teamId=el.dataset.id;S.ui.teamTab='images';location.hash='teams'};
ACT.openTeamInfo=el=>{S.ui.teamId=el.dataset.id;S.ui.teamTab='info';location.hash='teams'};
function renumber(t){const used=new Set();const pref={GK:[1,12,13,99],CB:[4,5,3,15,6],LB:[3,2,23],RB:[2,22],DMF:[6,16,18],CMF:[8,14,16],LMF:[11,7],RMF:[7,17],AMF:[10,20],LWF:[11,7,19],RWF:[7,17,21],SS:[10,9],CF:[9,19,20]};
  const ps=(t.players||[]).slice().sort((a,b)=>ovr(b)-ovr(a));const keep=new Set();ps.forEach(p=>{if(p.number&&!used.has(+p.number)){used.add(+p.number);keep.add(p.id)}});
  ps.forEach(p=>{if(keep.has(p.id))return;let n=(pref[p.pos]||[]).find(x=>!used.has(x));if(!n){n=1;while(used.has(n)&&n<99)n++}used.add(n);p.number=n})}
// Names the game cuts: a name over 60 bytes, a shirt name over 16 letters. Shortened the way a kit man would:
//   FIRAS AL-BURAIKAN → F. AL-BURAIKAN (first name to its initial; AL-, EL-, ABU-, BEN-… stay with the surname)
//   LUIGI SAN NICOLAS → L. NICOLAS (initial and the last word only)
//   C. BLACKETT-TAYLOR → C. TAYLOR (a double-barrelled surname that still doesn't fit keeps its last part)
//   R. GHOOCHANNEJHAD → R. GHOOCHANN (a single word still too long is cut where a syllable ends: after a consonant, before a
//   vowel, never inside CH/SH/TH/GH/JH/KH/PH)
const SHIRT_MAX=16,NAME_MAX=60,NAME_ARTICLE=/^(AL|EL|AD|AS|AN|AR|AT|AZ|ABU|ABD|ABDUL|BEN|BIN|IBN|BEL|BOU|OULD)$/i;
const nameBytes=s=>new TextEncoder().encode(String(s||'')).length;
const nameTooLong=p=>nameBytes(p.name)>NAME_MAX||String(p.shirtName||'').length>SHIRT_MAX;
const esc0=s=>String(s).replace(/[<>&]/g,'');
const isVowel=c=>!!c&&/[aeiouy]/i.test(c.normalize('NFD')[0]);
const isLetterC=c=>!!c&&/\p{L}/u.test(c);
function cutWord(w,max){if(w.length<=max)return w;
  for(let i=max;i>=3;i--){const last=w[i-1],prev=w[i-2],next=w[i];
    if(isLetterC(last)&&!isVowel(last)&&isVowel(next)&&!(/h/i.test(last)&&isLetterC(prev)&&!isVowel(prev)))return w.slice(0,i)}
  return w.slice(0,max)}
function shortShirt(s,max=SHIRT_MAX){s=String(s||'').trim().replace(/\s+/g,' ');if(s.length<=max)return s;
  const ws=s.split(' ');let last=ws[ws.length-1];const ini=ws.length>1?(ws[0].replace(/\.$/,'').charAt(0)+'.'):'';
  const fit=l=>(ini?ini+' ':'')+l;if(fit(last).length<=max)return fit(last);
  if(last.includes('-')){const parts=last.split('-');last=NAME_ARTICLE.test(parts[0])&&parts.length>1?parts.slice(1).join('-'):parts[parts.length-1];
    if(fit(last).length<=max)return fit(last);if(last.includes('-')){last=last.split('-').pop();if(fit(last).length<=max)return fit(last)}}
  return fit(cutWord(last,max-(ini?ini.length+1:0)))}
// a name over 60 bytes keeps its first and last words, then is cut by whole characters
function shortFull(n){n=String(n||'').trim().replace(/\s+/g,' ');if(nameBytes(n)<=NAME_MAX)return n;const ws=n.split(' ');
  let s=ws.length>2?ws[0]+' '+ws[ws.length-1]:n;while(nameBytes(s)>NAME_MAX)s=Array.from(s).slice(0,-1).join('').trimEnd();return s}
// {from, to, name, shirtName}: what the fix would set (only the parts that are too long change)
function shortenNames(p){const name=nameBytes(p.name)>NAME_MAX?shortFull(p.name):p.name;const sh=String(p.shirtName||'');const shirtName=sh.length>SHIRT_MAX?shortShirt(sh):sh;
  return{from:sh.length>SHIRT_MAX?sh:p.name,to:sh.length>SHIRT_MAX?shirtName:name,name,shirtName}}
function fixNamesTeam(t){const ch=[];(t.players||[]).filter(nameTooLong).forEach(p=>{const s=shortenNames(p);if(s.name!==p.name||s.shirtName!==(p.shirtName||'')){ch.push(s.from+' → '+s.to);p.name=s.name;if(p.shirtName)p.shirtName=s.shirtName}});if(ch.length)saveTeam(t);return ch}
ACT.fixNames=el=>{const t=S.teams[el.dataset.id];if(!t)return;let ch=[];histLabel('Shorten names: '+t.name,'Health',()=>{ch=fixNamesTeam(t)});
  toast(t.name+': '+(ch.length?ch.slice(0,4).join(', ')+(ch.length>4?' and '+(ch.length-4)+' more':''):'nothing to shorten'),'ok');rerender()};
ACT.fixShort=el=>{const t=S.teams[el.dataset.id];if(!t)return;const v=short3(t);histLabel('Short name '+t.name,'Health',()=>{t.short=v;saveTeam(t)});toast(t.name+': short name '+v,'ok');rerender()};
ACT.fixNumbers=el=>{const t=S.teams[el.dataset.id];if(!t){toast('That team is no longer in the project','err');return}histLabel('Renumber '+t.name,'Health',()=>{renumber(t);saveTeam(t)});toast('Numbers fixed for '+t.name,'ok');rerender()};
// the player is found by his key, not by his place in a list: the list is built anew on every draw, so a place in it
// pointed at nothing and the button did nothing
ACT.keepAt=el=>{const a=dpByKey(el.dataset.k);const keep=S.teams[el.dataset.t];if(!a||!keep||isNationalTeam(keep)){toast('That player is no longer listed in two teams','err');rerender();return}histLabel('Resolve duplicate '+a[0].p.name,'Health',()=>a.forEach(x=>{if(x.t.id!==el.dataset.t&&!isNationalTeam(x.t)){x.t.players=x.t.players.filter(p=>p.id!==x.p.id);saveTeam(x.t)}}));toast('Kept at '+S.teams[el.dataset.t].name,'ok');rerender()};
ACT.mgAll=()=>{const off=S.ui.mgOff||(S.ui.mgOff=new Set());if(off.size)off.clear();else findCupDuplicates().forEach(x=>off.add(x.cup.id));setTimeout(rerender,0)};
ACT.mgOne=el=>{const off=S.ui.mgOff||(S.ui.mgOff=new Set());if(off.has(el.dataset.id))off.delete(el.dataset.id);else off.add(el.dataset.id);setTimeout(rerender,0)};
/* ----- Pool leagues: AFC Champions League and the game's "other teams" pools (rule book "Pool leagues") -----
   Their teams are their own teams at their own slots, and having a team that also plays in a domestic league is the norm.
   Such a pair is not a cup copy: the pool team is updated from its league team (details, kits, crest and team), and each
   copied player gets a code of his own (in PES 2021 a player is in one team only), taken from the pool team's own players
   first. */
const POOL_LEAGUES=new Set(['afc-champions-league','other-teams-asia','other-european-teams','other-teams-latin-america']);
const isPoolComp=c=>!!c&&POOL_LEAGUES.has(c.gameLeague);
const CLUB_STOP=new Set(['al','el','saudi','dubai','fc','sc','cf','sfc','afc','fk','sk','ac','cd','club','sports','sport','football','calcio','the']);
const clubCore=n=>coreTokens(n).map(w=>w.replace(/^al(?=[a-z]{4,})/,'')).filter(w=>w.length>1&&!CLUB_STOP.has(w));
function clubTwin(a,b){const A=clubCore(a),B=clubCore(b);if(!A.length||!B.length)return false;const sa=new Set(A),sb=new Set(B);return sa.size===sb.size&&A.every(w=>sb.has(w))}
// pool clubs with a namesake in a domestic league the game does not have (one added to the option file, e.g. a Saudi league):
// the game's own leagues and pools are PES's own distinct clubs (Guaraní of Paraguay and Guarani of Brazil, PSG and Paris FC).
// The names must match word for word, "Al", "FC" and a country word aside: [{pool, league}]
function poolTwins(){const out=[];const clubs=teamsArr().filter(t=>!t.sameAs&&!isNationalTeam(t)&&!t.noCode);const leagueClubs=clubs.filter(t=>{const c=S.comps[t.compId];return c&&isLeagueComp(c)&&!isPoolComp(c)&&!c.gameLeague});
  clubs.filter(t=>isPoolComp(S.comps[t.compId])).forEach(t=>{const m=leagueClubs.filter(l=>clubTwin(t.name,l.name)&&(!t.country||!l.country||norm(t.country)===norm(l.country)));if(m.length===1&&!twinDone(t,m[0]))out.push({pool:t,league:m[0]})});return out}
function poolTwinsHTML(L){if(!L.length)return '';
  return `<p class="why"><b>Teams of a pool league that also play in a league.</b> AFC Champions League and the game's "other teams" pools hold teams that also play in their country's league; each is a team of its own at its own slot. <b>Update from …</b> copies the league team's details, kits, crest and team onto the pool team. In PES 2021 a player is in one team only, so each copied player takes a code of his own: the pool team's own players' codes first, then free ones. A snapshot is taken first.</p>
   <div class="hc-rows">
   ${L.map(x=>hcRow('note',esc(x.pool.name)+' <span class="small muted">'+esc(compName(x.pool.compId))+'</span>','Also plays as <b>'+esc(x.league.name)+'</b> ('+esc(compName(x.league.compId))+') · players '+(x.pool.players||[]).length+' → '+(x.league.players||[]).length,`<button class="sm primary" data-act="twinUpdate" data-id="${x.pool.id}">Update from ${esc(x.league.short||x.league.name)}</button>`,{tip:x.pool.name})).join('')}</div>`}
// a team updated from its league team is offered again only when the league team has changed since
const twinSig=L=>{try{return String(ofHash(L))}catch(e){return ''}};const twinDone=(P,L)=>P.twinOf===L.id&&!!P.twinSig&&P.twinSig===twinSig(L);
// a cup's team with a code of its own (not a copy that shares its league team's file)
const cupOwnCode=t=>!!t&&!t.sameAs&&!t.noCode&&!!+t.gameId;
const cupTwins=()=>findCupDuplicates().filter(x=>cupOwnCode(x.cup)&&!twinDone(x.cup,x.league)).map(x=>({pool:x.cup,league:x.league}));
const TWIN_FIELDS=['name','short','country','stadium','stadiumImg','emblem','managerPhoto','sponsorImgs','formation','playstyle','colors'];
function twinCopy(x){const P=x.pool,L=x.league;TWIN_FIELDS.forEach(k=>{if(L[k]!==undefined&&L[k]!==''&&!(Array.isArray(L[k])&&!L[k].length))P[k]=clone(L[k])});
  if(L.manager)P.manager=clone(L.manager);if((L.kits||[]).length)P.kits=clone(L.kits);
  // the squad: new records of the same players, without the league club's codes; never linked back by name to a code another club holds
  P.players=(L.players||[]).map(p=>{const q=clone(p);q.id=uid();q.ted=null;q.gameId='';delete q.codeSet;delete q.codeWas;q.codeOff=true;return q});
  P.twinOf=L.id;P.twinAt=Date.now();P.twinSig=twinSig(L);NOFILE.delete(P.id);PCV++;saveTeam(P)}
// each copied player gets a code: the pool club's own players' codes first (the planner looks at the code's own team first), then free ones
async function twinCodes(ts){return codesFor(o=>ts.some(t=>t.id===o.t.id))}
// give the players without a code that keep() picks each a free code (rule book "Player codes"): {n given, left without}
async function codesFor(keep){for(let i=0;i<3&&nfTeams().some(t=>!noFileOf(t));i++)await noFileScan(true);await pcLoadAll();_PCP.k='';
  const need=pcNeedy().filter(keep);const P=pcPlanMake(need,false);let n=0;need.forEach(o=>{const s=P.get(o.p.id);if(s){pcGive(o.t,o.p,s);n++}});pcFlush();return{n,left:need.length-n}}
ACT.twinUpdate=async el=>{const x=[...poolTwins(),...cupTwins()].find(x=>x.pool.id===el.dataset.id);if(!x)return;
  if(!await ask('Update '+x.pool.name+'?',`<b>${esc(x.pool.name)}</b> (${esc(compName(x.pool.compId))}) takes the details, kits, crest and team of <b>${esc(x.league.name)}</b> (${esc(compName(x.league.compId))}): ${(x.league.players||[]).length} players in place of its ${(x.pool.players||[]).length}. Each copied player takes a code of his own. A snapshot is taken first.`,'Update'))return;
  await takeSnapshot('Before updating '+x.pool.name+' from '+x.league.name,true);histLabel(x.pool.name+' updated from '+x.league.name,'Health',()=>twinCopy(x));const r=await histLabelAsync('Player codes for '+x.pool.name,'Health',()=>twinCodes([x.pool]));
  toast(`${x.pool.name} updated from ${x.league.name}: ${r.n} players have a code${r.left?', '+r.left+' still need one: no free code is left':''}`,r.left?'':'ok');rerender();if(r.left)ACT.pcRoomOpen()};
ACT.twinAll=async el=>{const L=el&&el.dataset.kind==='cup'?cupTwins():poolTwins();if(!L.length)return;if(!await ask('Update '+L.length+' teams?',`${L.length} pool team${L.length===1?'':'s'} take the details, kits, crest and team of ${L.length===1?'its':'their'} league team${L.length===1?'':'s'}, and every copied player takes a code of his own. A snapshot is taken first.`,'Update '+L.length))return;
  await takeSnapshot('Before updating '+L.length+' pool teams from their league teams',true);histLabel(L.length+' pool teams updated from their league teams','Health',()=>L.forEach(twinCopy));const r=await histLabelAsync('Player codes for '+L.length+' pool teams','Health',()=>twinCodes(L.map(x=>x.pool)));
  toast(`${L.length} teams updated: ${r.n} players have a code${r.left?', '+r.left+' still need one: no free code is left':''}`,r.left?'':'ok');rerender();if(r.left)ACT.pcRoomOpen()};
ACT.mergeDups=async()=>{const off=S.ui.mgOff||new Set();const list=findCupDuplicates().filter(x=>!off.has(x.cup.id));if(!list.length)return;
  if(!await ask('Merge cup copies',`Merge ${list.length} cup copies into their league clubs?`,'Merge'))return;await takeSnapshot('Before merging cup copies',true);
  let moved=0,full=0; // players only the copy has join the league team, up to the game's 40-player team limit
  histLabel('Merge cup copies','Health',()=>list.forEach(({cup,league,comp})=>{
    league.players=league.players||[];const have=new Set(league.players.map(p=>norm(p.name)));
    (cup.players||[]).forEach(p=>{const n=norm(p.name);if(have.has(n))return;if(league.players.length>=40){full++;return}league.players.push(p);have.add(n);moved++});
    ['emblem','managerPhoto','stadium','stadiumImg','gameSlot','notes'].forEach(k=>{if(!league[k]&&cup[k])league[k]=cup[k]});if(!spOf(league).some(Boolean)&&spOf(cup).some(Boolean))league.sponsorImgs=spOf(cup);if(!(league.manager&&league.manager.name)&&cup.manager&&cup.manager.name)league.manager=cup.manager;
    (league.kits||[]).forEach(k=>{const ck=(cup.kits||[]).find(x=>x.slot===k.slot);if(ck&&!k.img&&ck.img)k.img=ck.img});
    if(S.teds[cup.id]&&!S.teds[league.id]){const t=Object.assign({},S.teds[cup.id],{id:league.id});S.teds[league.id]=t;Store.put('teds',t);delete S.teds[cup.id];Store.del('teds',cup.id)}
    comp.type='Cup';comp.teams=[...new Set([...(comp.teams||[]),league.id])];saveComp(comp);
    dropTeam(cup);saveTeam(league)}));
  S.ui.mgOff=null;toast('Merged '+list.length+(list.length===1?' team':' teams')+(moved?', '+moved+' players moved over':'')+(full?'. '+full+' players did not fit (40-player limit); restore the snapshot to get them back':''),full?'err':'ok');rerender()};

/* ----- cup participants on the competition form ----- */
const _compFormOrig=compForm;
compForm=function(c){const html=_compFormOrig(c);if(c.type!=='Cup')return html+`<p class="small muted" style="margin-top:8px">Set the type to Cup to list participating teams.</p>`;
  const ids=c.teams||[];const part=`<h3 style="margin-top:14px">Participants (${ids.length})</h3><div>${ids.map(id=>S.teams[id]?`<span class="chip">${esc(S.teams[id].name)} <button class="sm xbtn" data-act="cpRemove" data-id="${id}" aria-label="Remove ${esc(S.teams[id].name)}">×</button></span>`:'').join('')||'<span class="muted small">None yet.</span>'}</div>
   <div class="row" style="margin-top:6px"><select id="cp-add" aria-label="Add team"><option value="">Add a team…</option>${opts(teamsArr().filter(t=>!ids.includes(t.id)&&!isCupComp(S.comps[t.compId])).map(t=>[t.id,t.name+' · '+compName(t.compId)]))}</select><button class="sm" data-act="cpAdd">Add</button></div>`;
  return html.replace('<div class="row end" style="margin-top:16px">',part+'<div class="row end" style="margin-top:16px">')};
ACT.cpAdd=()=>{const v=$('#cp-add').value;if(!v)return;readCompForm();const c=S.ui.draftComp;c.teams=[...new Set([...(c.teams||[]),v])];modal(compForm(c))};
ACT.cpRemove=el=>{readCompForm();const c=S.ui.draftComp;c.teams=(c.teams||[]).filter(x=>x!==el.dataset.id);modal(compForm(c))};
