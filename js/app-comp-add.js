// PES 2021 Option Studio: adding a competition, the one way (the user, 2026-11-22).
// The parts are one program in one global scope, loaded in order by index.html; this file wraps what earlier files defined and
// calls Game codes' allocation (app-boot.js) only when a button is pressed.
"use strict";
/* ================= Adding a competition: four steps =================
   1 Find it: Live Update → Competitions (the Add a competition card, or the Search international competitions card).
   2 A job collects everything (its teams, their squads, the logo) and sends it to Process and Review.
   3 Applying a new competition asks, in a popup, which place it takes in the game: a vacancy (a usable slot of its kind no
     competition holds) or the slot of a competition it replaces (one that may give its slot up). Nothing else is offered:
     the game has a fixed set of slots, and a competition without one isn't in the game (rule book, top rule).
   4 Applied by the database rules: the slot's code goes to it with the Game codes allocation (codeAssign: code and slot go
     together, its competition file is made from a template at export), a league slot brings the game league it stands for
     (c.gameLeague), and the replaced competition is kept out of the game or deleted, as on Game codes (codeLoseAsk, codeRetire).
   Every other way in (the Competitions page's Add competition, an imported .ced sent to "New competition", a spreadsheet or
   package) reaches the project through the same Apply, so it asks the same question. */

const caKind=c=>isCupComp(c)?'cup':'league';
// a slot's kind: the game's league slots are the ones that stand for a game league (LEAGUE_OF_CODE); every other usable slot is
// a cup's. A league goes on a league slot and a cup on a cup slot: whether a slot's format follows its file is not tested (13d).
const slotKind=code=>LEAGUE_OF_CODE[+code]?'league':'cup';
// the places a new competition can take: vacancies of its kind, and competitions of its kind that can give their slot up (in
// the game on a usable slot, not one of the game's own, not the World Cup, holding no team the game fixes)
function compAddPlaces(c){const kind=caKind(c);
  const vac=codeFreeAll('comp').filter(e=>slotOf(e.id)&&slotKind(e.id)===kind).map(e=>({code:+e.id,from:e.from||codeOptName('comp',e.id)||''}));
  const rep=compsArr().filter(x=>x.id!==c.id&&!x.parked&&compPlaced(x)&&!ofGameComp(x)&&!compLockWhy(x)&&slotKind(x.gameId)===kind&&caKind(x)===kind)
    .sort((a,b)=>a.name.localeCompare(b.name)).map(x=>({code:+x.gameId,comp:x}));
  return{kind,vac,rep}}
// the popup: resolves {code, rep} for a place, 'skip' to leave this competition out, false to stop the whole apply
function compAddAsk(c){const P=compAddPlaces(c);const any=P.vac.length||P.rep.length;const own=+(c.ced&&c.ced.compId)||0;
  // the place suggested and selected (the same rule as a team's code, codeSuggest): the slot its own file names when that can be
  // taken, else the vacancy a competition of the same name gave up; with nothing to go by, nothing is selected
  const can=code=>P.vac.some(x=>x.code===code)||P.rep.some(x=>x.code===code);const byName=P.vac.find(x=>x.from&&(norm(x.from)===norm(c.name)||nameScore(x.from,c.name)>=0.85));
  const want=own&&can(own)?own:byName?byName.code:0,wantWhy=want?(want===own?'the place its own file names':'the slot '+byName.from+' gave up'):'';
  const vo=x=>`<option value="v|${x.code}" ${x.code===want?'selected':''}>Slot ${slotOf(x.code)} · code ${x.code}${x.from?' · was '+esc(x.from):''}</option>`;
  const ro=x=>`<option value="r|${x.code}|${x.comp.id}" ${x.code===want?'selected':''}>${esc(x.comp.name)} · slot ${slotOf(x.code)}${compMembers(x.comp).length?' · '+compMembers(x.comp).length+' teams':''}</option>`;
  return new Promise(res=>{S.ui.askRes=res;modal(`<div class="mhead"><h2>Where does ${esc(c.name)} go in the game?</h2></div>
    <p class="small">PES 2021 has a fixed set of competition slots, and a competition is in the game only on one of them. A new ${P.kind} takes a ${P.kind} slot: a <b>vacancy</b> no competition holds now, or the slot of a competition it <b>replaces</b>.${P.kind==='league'?' Its clubs join it in the game by taking codes of that league (their page → Change competition).':''}</p>
    ${want?`<p class="small" style="margin:0 0 6px">Suggested and selected: <b>slot ${slotOf(want)||want}</b>, ${esc(wantWhy)}.</p>`:''}
    ${any?`<select id="ca-pick" size="${Math.min(12,P.vac.length+P.rep.length+2)}" style="width:100%" aria-label="Place in the game">${P.vac.length?`<optgroup label="Fill a vacancy (${P.vac.length})">${P.vac.map(vo).join('')}</optgroup>`:''}${P.rep.length?`<optgroup label="Replace a competition (${P.rep.length})">${P.rep.map(ro).join('')}</optgroup>`:''}</select>
      <p class="small muted" style="margin:6px 0 0">A replaced competition loses its slot: you choose next whether it and its teams are kept out of the game or deleted. Competitions the game keeps (its own, the World Cup, those with licensed teams) can't be replaced and aren't listed.</p>`
     :`<div class="warnbox small">No ${P.kind} slot is free, and no ${P.kind} can give its slot up, so ${esc(c.name)} can't be added to the game now. Free a slot first: delete a ${P.kind} you don't want, or free its slot on Game codes.</div>`}
    <div class="row end" style="margin-top:12px"><button data-act="askNo">Stop</button><button data-act="caSkip">Leave it out</button>${any?'<button class="primary" data-act="caOk">Use this place</button>':''}</div>`)})}
ACT.caOk=el=>{const v=($('#ca-pick')||{}).value;if(!v){toast('Choose a place first','err');return}
  const [m,code,id]=v.split('|');askAnswer(el,{code:+code,rep:m==='r'?S.comps[id]||null:null})};
ACT.caSkip=el=>askAnswer(el,'skip');
// the new competitions a set of batches would add: ticked, and not in the project already (by id or name, as applyBatch matches)
const caNew=bs=>bs.flatMap(b=>(b.items||[]).filter(it=>it.accept&&it.kind==='comp'&&it.op==='add'&&it.obj&&!it.obj.worldCup&&!S.comps[it.obj.id]&&!compsArr().some(x=>norm(x.name)===norm(it.obj.name))));
// step 3 for every new competition, before anything is applied: null stops the apply; a competition left out is unticked
async function compAddGate(bs){const L=caNew(bs);if(!L.length)return[];await fixedReady();try{await pes21Teams()}catch(e){}const out=[];
  for(const it of L){const ch=await compAddAsk(it.obj);if(!ch)return null;if(ch==='skip'){it.accept=false;continue}
    let how='';if(ch.rep){how=await codeLoseAsk([ch.rep],it.obj,ch.code);if(!how)return null}out.push({id:it.obj.id,code:ch.code,rep:ch.rep,how})}
  return out}
// step 4, once the batch has added the competition
function compAddFinish(list){(list||[]).forEach(({id,code,rep,how})=>{const c=S.comps[id];if(!c)return;const key=LEAGUE_OF_CODE[+code]||'';const held=rep&&S.comps[rep.id]?[S.comps[rep.id]]:[];
  if(key)histLabel(c.name+' stands for '+csLeagueName(key),'Edit',()=>{held.forEach(h=>{if(h.gameLeague===key){delete h.gameLeague;saveComp(h)}});c.gameLeague=key;c.type='League';saveComp(c)});
  codeAssign('comp',c,+code);if(held.length&&how)codeRetire(held,how);
  toast(c.name+' is in the game on slot '+slotOf(code)+(held.length?', in place of '+held[0].name:''),'ok')})}
/* ================= New clubs: a league, then one of its free codes (the user, 2026-11-23) =================
   "adding new team to existing league must give the user the choice to select the league then carefully select the right
   code for those teams." A club is in a league in the game only by its code (Change competition), so a new club takes no code
   when it is added: the code its file or source carries is only a suggestion. Right after the apply, when the codes a replaced
   competition gave up are free, one popup lists every new club with a league (those with a free code, a new competition among
   them) and a free code of that league: the suggested one when it is free there, else the next one no other club in the popup
   has. Codes come from the Game codes allocation (leagueFreeCodes: a licensed team's code is never offered), and the club then
   takes over the players at that code (pcTeamTake), as a move does. A club left without a code waits in the Health check. */
const tpNew=bs=>bs.flatMap(b=>(b.items||[]).filter(it=>it.accept&&it.kind==='team'&&it.op==='add'&&it.obj&&!it.obj.sameAs&&!it.obj.national&&!isCountryTeamName(it.obj.name)&&!isNationalComp(S.comps[it.obj.compId])
  &&!S.teams[it.obj.id]&&!Object.values(S.teams).some(x=>norm(x.name)===norm(it.obj.name)&&!it.notSame&&(isNationalTeam(x)||clubVerdict(it.obj.name,it.obj.country,x)!=='no'))));
// before the apply: the code a new club carries becomes its suggestion, so it never holds a code it wasn't given here
function teamAddPrep(bs){return tpNew(bs).map(it=>{const o=it.obj;const hint=+o.fileTeamId||+o.gameId||0;o.gameId='';if(hint)o.fileTeamId=hint;return{id:o.id,hint}})}
const tpLeagues=()=>{const keys=new Set();codeFreeAll('team').forEach(e=>{const k=slotLeagueOf(e.id);if(k&&!isNatKey(k))keys.add(k)});
  return [...keys].map(key=>{const c=compsArr().find(x=>x.gameLeague===key);return{key,name:c?c.name:(LEAGUE_NAME[key]||csLeagueName(key)),n:leagueFreeCodes(key).length}}).filter(g=>g.n).sort((a,b)=>a.name.localeCompare(b.name))};
// a free code of the row's league no other row has: the suggestion first
function tpPick(R,r){const F=leagueFreeCodes(r.key).map(x=>x.id);const taken=new Set(R.rows.filter(x=>x!==r&&x.key&&x.code).map(x=>x.code));
  return F.includes(r.hint)&&!taken.has(r.hint)?r.hint:(F.find(id=>!taken.has(id))||0)}
function tpHTML(){const R=S.ui.tp;const L=tpLeagues();
  const row=r=>{const t=S.teams[r.id];const F=r.key?leagueFreeCodes(r.key):[];const taken=new Set(R.rows.filter(x=>x!==r&&x.key&&x.code).map(x=>x.code));
    return `<div class="rev-item"><b>${esc(t.name)}</b>${r.hint?` <span class="small muted">· its file or source says code ${r.hint}${slotLeagueOf(r.hint)?' ('+esc(csLeagueName(slotLeagueOf(r.hint)))+')':''}</span>`:''}
     <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px"><select data-ch="tpLeague" data-id="${r.id}" aria-label="League for ${esc(t.name)}"><option value="">No code for now</option>${L.map(g=>`<option value="${esc(g.key)}" ${g.key===r.key?'selected':''}>${esc(g.name)} · ${g.n} free</option>`).join('')}</select>
     ${r.sug&&r.key===r.sug?`<span class="small muted">Suggested and selected: ${esc(csLeagueName(r.sug))}, ${esc(r.why)}</span>`:''}
     ${r.key?`<select data-ch="tpCode" data-id="${r.id}" aria-label="Code for ${esc(t.name)}">${F.map(x=>`<option value="${x.id}" ${x.id===r.code?'selected':''} ${taken.has(x.id)?'disabled':''}>Code ${x.id}${x.from?' · was '+esc(x.from):''}${x.id===r.hint?' · its own':''}${x.may?' · the game may keep the old name':''}</option>`).join('')}</select>`:'<span class="small muted">waits in the Health check</span>'}</div></div>`};
  return `<div class="mhead"><h2>Where do the new clubs go in the game?</h2></div>
   <p class="small" style="margin-top:0">A club is in a league in the game only by its code. Choose each new club's league, then one of that league's free codes. Only leagues with a free code are listed; a licensed team's code is never offered, since the game would keep that team's name there. Each club then takes over the players at its code.</p>
   <div style="display:grid;gap:8px;max-height:440px;overflow:auto">${R.rows.map(row).join('')}</div>
   <div class="row end" style="margin-top:12px"><button data-act="tpLater">Leave them without codes</button><button class="primary" data-act="tpOk">Give these codes</button></div>`}
CH.tpLeague=el=>{const R=S.ui.tp;const r=R&&R.rows.find(x=>x.id===el.dataset.id);if(!r)return;r.key=el.value;r.code=r.key?tpPick(R,r):0;modal(tpHTML())};
CH.tpCode=el=>{const R=S.ui.tp;const r=R&&R.rows.find(x=>x.id===el.dataset.id);if(!r)return;r.code=+el.value;modal(tpHTML())};
ACT.tpLater=()=>{const r=S.ui.askRes;S.ui.askRes=null;closeModal();r&&r(null)};
ACT.tpOk=el=>{const R=S.ui.tp;const codes=R.rows.filter(r=>r.key&&r.code).map(r=>r.code);if(new Set(codes).size!==codes.length){toast('Two clubs have the same code: give each its own','err');return}
  askAnswer(el,R.rows)};
// after the apply (and the new competitions' places): ask, then give the codes
async function teamPlaceAsk(list,newComps){const rows=(list||[]).filter(x=>S.teams[x.id]&&!(+S.teams[x.id].gameId&&!S.teams[x.id].noCode));/* a club the apply already placed is not asked about */if(!rows.length)return;await fixedReady();try{await pes21Teams()}catch(e){}
  const R=S.ui.tp={rows:rows.map(x=>({id:x.id,hint:x.hint,key:'',code:0}))};
  // first suggestion: the league it is filed under, else the one new competition this apply placed, else its own code's league
  const one=(newComps||[]).map(g=>S.comps[g.id]&&S.comps[g.id].gameLeague).filter(Boolean);
  for(const r of R.rows){const t=S.teams[r.id];const own=S.comps[t.compId]&&S.comps[t.compId].gameLeague;const hk=slotLeagueOf(r.hint);
    for(const [k,w] of [[own,'the league it came with'],[one.length===1?one[0]:'','the competition this apply added'],[hk,'the league of the code its file or source says']])if(k&&leagueFreeCodes(k).length){r.key=k;r.sug=k;r.why=w;break}
    r.code=r.key?tpPick(R,r):0;if(!r.code){r.key='';r.sug='';r.why=''}}
  const res=await new Promise(res=>{S.ui.askRes=res;modal(tpHTML())});S.ui.tp=null;
  if(!res){toast(rows.length+' new club'+(rows.length===1?' has':'s have')+' no code yet: give '+(rows.length===1?'it one':'them codes')+' from the Health check or the team page (Change competition)','');return}
  let n=0;for(const r of res){if(!r.key||!r.code)continue;const t=S.teams[r.id];if(!t||!leagueFreeCodes(r.key).some(x=>x.id===r.code))continue;
    histLabel(t.name+' joins '+csLeagueName(r.key)+' on code '+r.code,'Edit',()=>{const c=slotComp(r.key,S.settings.ofPkg&&S.settings.ofPkg.id);t.compId=c.id;delete t.fileTeamId;codeAssign('team',t,r.code)});await pcTeamTake(t);n++}
  const left=rows.length-n;toast(n+' new club'+(n===1?'':'s')+' placed with '+(n===1?'its':'their')+' code'+(left?'; '+left+' without a code wait in the Health check':''),'ok')}

// Process and Review's Apply, Apply all, and Import / Export's Install go through the gate, after their own confirmation
{const _a=ACT.revApply;ACT.revApply=async el=>{const b=S.pending[el.dataset.b];if(!b)return;if(!await caSameGate([b])){rerender();return}const g=await compAddGate([b]);if(g===null){rerender();return}const tp=teamAddPrep([b]);saveBatch(b);
  await _a(el);compAddFinish(g);await teamPlaceAsk(tp,g);rerender()}}
ACT.revApplyAll=async()=>{const bs=Object.values(S.pending).sort((a,b)=>a.createdAt-b.createdAt);const n=bs.reduce((a,b)=>a+b.items.filter(i=>i.accept).length,0);
  if(!await ask('Apply all batches',`Apply the ticked changes in all ${bs.length} batches (${n} changes)? One snapshot is saved first so you can restore it.`,'Apply all'))return;
  if(!await caSameGate(bs)){rerender();return}const g=await compAddGate(bs);if(g===null){rerender();return}const tp=teamAddPrep(bs);bs.forEach(saveBatch);
  await takeSnapshot('Before applying '+bs.length+' batches',true);let t=0,sk=0,fx=0;bs.forEach(b=>{const r=applyBatch(b);t+=r.n;sk+=r.skipped;fx+=r.fixed||0});
  compAddFinish(g);toast('Applied '+(t-sk)+' changes'+(sk?' ('+sk+' skipped'+(fx?', '+fx+' of them left out because the game keeps its own there':'')+')':''),'ok');await teamPlaceAsk(tp,g);rerender()};
ACT.impInstall=async()=>{const P=S.ui.impPlan;if(!P)return;const n=impPlanCount(P);if(!n)return;
  if(!await ask('Install '+n+' change'+(n===1?'':'s')+'?','They go into your project now. A snapshot is saved first, so you can go back from Compare &amp; versions.','Install'))return;
  if(!await caSameGate(P.batches)){rerender();return}const g=await compAddGate(P.batches);if(g===null){rerender();return}const tp=teamAddPrep(P.batches);
  await takeSnapshot('Before import',true);let t=0,sk=0,fx=0;for(const b of P.batches){const r=applyBatch(b);t+=r.n;sk+=r.skipped;fx+=r.fixed||0}
  let k=0;for(const d of P.deferred)if(d.on){try{await d.fn();k++}catch(e){toast(d.label+': '+e.message,'err')}}
  compAddFinish(g);const keepSrc=impSourceCapture();impDropImages(P.images);S.ui.impPlan=null;ACT.impClear();toast('Installed '+(t-sk+k)+' change'+(t-sk+k===1?'':'s')+(sk?' ('+sk+' skipped: '+(fx?fx+' left out because the game keeps its own there, the rest ':'')+'already there)':''),'ok');await teamPlaceAsk(tp,g);await impKeepSource(keepSrc);rerender()};// step 1 is on Live Update: the Competitions page's Add competition opens it at A new competition's name (there is no hand-made competition any more)
ACT.addComp=()=>{S.ui.aiTab='comps';S.ui.aiPrefill=null;location.hash='ai';setTimeout(()=>{const i=$('#ai-comp');if(i){i.scrollIntoView({block:'center'});i.focus()}},120)};
// Step 1's "Will provide my own file" (the user, 2026-11-22): step 2 is then the Competitions page's Updates card commands for
// this one competition, the web-search command (a Claude chat with web search returns a .json update file) and Import update
// files, instead of Claude drafting it here. Installing the file brings step 3, as every other way in does.
CH.aiCompOwn=el=>{S.ui.aiCompOwn=el.checked;const b=$('#ai-run-comp');if(b)b.textContent=el.checked?'Get the commands for my file':'Draft new competition'};
{const _r=ACT.aiRunComp;ACT.aiRunComp=el=>{if(!($('#ai-cown')||{}).checked)return _r(el);
  const name=($('#ai-comp')||{}).value.trim(),country=($('#ai-ccountry')||{}).value.trim();if(!name){toast('Type the competition\'s name','err');$('#ai-comp').focus();return}
  const have=compsArr().find(c=>norm(c.name)===norm(name));if(have){toast(have.name+' is already in your project','err');return}
  const t=COMP_TEMPLATES.find(x=>norm(x[0])===norm(name));S.ui.caOwn={name,country:country||(t?t[1]:''),type:t?t[2]:(/cup|copa|coupe|pokal|champions|trophy|shield|super/i.test(name)?'Cup':'League')};
  modal(`<div class="mhead"><h2>Your own file for ${esc(name)}</h2></div>
    <p class="small">Step 2, with your own file: get the web-search command, paste it into a Claude chat with web search, and import the <b>.json</b> file it returns, or any update file you have for it. An exported <b>WEPES</b> folder, zipped, works too: its team (.ted) and competition (.ced) files are read with the images they name, and wait on Import until you install them. Nothing changes until you apply or install it.</p>
    <ol class="small" style="padding-left:18px"><li><b>Get web-search command</b>: the competition, its clubs, their players and the images to look for.</li><li><b>Import update files</b>: your file (.json), or a zipped WEPES folder.</li><li>When you install it, the studio asks where ${esc(name)} goes in the game: a vacancy or a competition it replaces (step 3).</li></ol>
    <div class="row end" style="margin-top:12px"><button data-act="close">Close</button><button data-act="importPkg">Import update files</button>${S.settings.aiWeb!=='off'?'<button class="primary" data-act="caOwnCmd">Get web-search command</button>':''}</div>`)}}
ACT.caOwnCmd=()=>{const l=S.ui.caOwn;if(!l)return;closeModal();showParts('teams',l.name,starterParts('teams',[l]))};

/* ================= Same club? Names are checked with the country (the user, 2026-11-22) =================
   Clubs in different countries share names (Al Ahli Saudi and Shabab Al Ahli Dubai, Al Ain in the UAE and in Saudi Arabia), so
   a name alone never makes two clubs one. A club's country: its Country field, a country word in its name, or the country of
   the national league it is filed under (lgKey); the game's team list and team files carry none. Two names are the same club
   when they are equal, or equal once "Al", "FC", "SC", "Club" and country words are left out (clubCore), and then:
   both countries known and equal → the same club (updated in place, keeping its code); known and different → a different
   club; one known and the other not → asked in Process and Review, with each one's country and league shown. */
const CA_COUNTRY_WORD={saudi:'saudi arabia',ksa:'saudi arabia',dubai:'united arab emirates',uae:'united arab emirates',qatar:'qatar',qatari:'qatar',kuwait:'kuwait',kuwaiti:'kuwait',bahrain:'bahrain',oman:'oman',omani:'oman',iraq:'iraq',iran:'iran',jordan:'jordan',egypt:'egypt'};
const caCountry=s=>{const n=norm(s||'');if(!n)return'';if(CA_COUNTRY_WORD[n])return CA_COUNTRY_WORD[n];if(/^(uae|u a e|emirates|united arab emirates)$/.test(n))return 'united arab emirates';if(/^(ksa|saudi arabia|saudi)$/.test(n))return 'saudi arabia';return n};
const caNameCountry=name=>{const w=norm(name||'').split(/[\s-]+/).find(x=>CA_COUNTRY_WORD[x]);return w?CA_COUNTRY_WORD[w]:''};
// firm: from the club itself (its Country field or a country word in its name); the league it is filed under only suggests one
const clubCountryFirm=t=>!!t&&!!(t.country||caNameCountry(t.name));
function clubCountry(t){if(!t)return'';if(t.country)return caCountry(t.country);const w=caNameCountry(t.name);if(w)return w;
  const c=S.comps[t.compId];if(c&&isLeagueComp(c)&&!/^other/i.test(c.name)){const k=typeof lgKey==='function'?lgKey(c):null;if(k&&k[0])return caCountry(k[0])}return''}
// a reserve or youth side (Real Sociedad B, Jong Ajax, U23) is a team of its own: its marker stays part of the name
const caReserve=n=>/(^|[\s-])(b|ii|u\d{2}|reserves?|youth|juniors?|jong)($|[\s-])/i.test(String(n||''))?'~reserve':'';
const caCore=n=>{const c=clubCore(n).filter(w=>!CA_COUNTRY_WORD[w]);const r=caReserve(n);return r?[...c,r]:c};
// 'yes', 'no' or 'maybe' for an incoming club (name, country) against a club of the project
function clubVerdict(name,country,t,coreIn){const same=norm(name)===norm(t.name);if(!same){const A=coreIn||caCore(name),B=caCore(t.name);if(!A.length||A.length!==B.length||!A.every(w=>B.includes(w)))return 'no'}
  const ci=caCountry(country)||caNameCountry(name),ct=clubCountry(t);if(ci&&ct)return ci===ct?'yes':clubCountryFirm(t)?'no':'maybe';if(!ci)return 'yes';return 'maybe'}
function clubMatch(name,country){const coreIn=caCore(name);const nn=norm(name);const league=t=>!isCupComp(S.comps[t.compId]);const yes=[],maybe=[];
  teamsArr().forEach(t=>{if(t.sameAs||isNationalTeam(t))return;const v=clubVerdict(name,country,t,coreIn);if(v==='yes')yes.push(t);else if(v==='maybe')maybe.push(t)});
  // the club of exactly that name first, then one in a league
  const pick=L=>L.find(t=>norm(t.name)===nn&&league(t))||L.find(t=>norm(t.name)===nn)||L.find(league)||L[0];
  return yes.length?{v:'yes',t:pick(yes)}:maybe.length?{v:'maybe',t:pick(maybe)}:{v:'no',t:null}}
findClub=(name,country)=>{const r=clubMatch(name,country);return r.v==='yes'?r.t:null};
// every batch: a new club the check confirms becomes an update of that club; one it can't confirm is asked about
{const _b=batchFromData;batchFromData=(inc,o)=>{const ask=[];
  // t._asNew (Add to Option file, Install as new): no namesake is looked for, here or when the batch is shown or applied
  Object.values(inc.teams||{}).forEach(t=>{if(t&&t._asNew&&!S.teams[t.id]){t._noNameMatch=true;return}if(!t||S.teams[t.id]||isCountryTeamName(t.name))return;const r=clubMatch(t.name,t.country);
    if(r.v==='yes'&&r.t){if(norm(r.t.name)!==norm(t.name)){t.name=r.t.name;t.short=r.t.short||t.short}if(o&&Array.isArray(o.teamScope)&&o.teamScope.includes(t.id))o.teamScope.push(r.t.id);t.id=r.t.id;return}
    if(Object.values(S.teams).some(x=>norm(x.name)===norm(t.name)))t._noNameMatch=true;if(r.v==='maybe'){t._noNameMatch=true;ask.push([t.id,r.t.id])}});
  const b=_b(inc,o);ask.forEach(([nid,tid])=>{const it=b.items.find(i=>i.kind==='team'&&i.op==='add'&&i.obj&&i.obj.id===nid);if(it)it.maybe=tid});
  b.items.forEach(i=>{if(!i.obj)return;if(i.obj._asNew){delete i.obj._asNew;if(i.kind==='team'&&i.op==='add'){i.notSame=true;i.sameChecked=true}}delete i.obj._noNameMatch});Object.values(inc.teams||{}).forEach(t=>{delete t._noNameMatch;delete t._asNew});return b}}
// the question, on the new club's row: both clubs with their country and league, so the answer is clear
const caLeagueOf=id=>{if(S.comps[id])return S.comps[id].name;for(const b of Object.values(S.pending))for(const i of b.items)if(i.kind==='comp'&&i.op==='add'&&i.obj&&i.obj.id===id)return i.obj.name+' (new, in Process and Review)';return 'no competition'};
// a batch made before this check (or before the club was in the project) is checked when it is shown: a namesake is asked about
{const _ih=itemHTML;itemHTML=(b,it,i)=>{if(it.kind==='team'&&it.op==='add'&&it.obj&&it.maybe===undefined&&!it.sameChecked){it.sameChecked=true;const r=clubMatch(it.obj.name,it.obj.country);if(r.t&&r.v!=='no'&&!S.teams[it.obj.id])it.maybe=r.t.id;setTimeout(()=>saveBatch(b),0)}
  const h=_ih(b,it,i);const ex=it.maybe&&S.teams[it.maybe];if(!ex||it.kind!=='team'||it.op!=='add')return h;const o=it.obj;
  return h}}
// the question: both clubs with country, league and code; when the project's club is licensed (it can't move), what each
// answer means in the game. pop: the popup version that Apply opens (Yes / No / Stop)
function caSameBox(b,it,i,pop){const ex=S.teams[it.maybe],o=it.obj;const fx=typeof teamFixed==='function'&&teamFixed(ex);
  const shared=(()=>{const n=new Set((o.players||[]).map(p=>norm(p.name)));return(ex.players||[]).filter(p=>n.has(norm(p.name))).length})();
  return `<div class="warnbox small" style="margin-top:6px"><b>Same club?</b> A club of this name is already in your project, and their countries can't be compared.
    <div class="grid g2" style="gap:6px;margin:6px 0"><div><b>${esc(o.name)}</b> <span class="muted">(from this update)</span><br>${esc(o.country||'country not known')} · ${esc(caLeagueOf(o.compId))}</div>
    <div><b>${esc(ex.name)}</b> <span class="muted">(in your project)</span><br>${esc(ex.country||(clubCountry(ex)?clubCountry(ex).replace(/\b[a-z]/g,m=>m.toUpperCase()):'country not known'))} · ${esc(compName(ex.compId)||'no competition')}${+ex.gameId&&!ex.noCode?' · code '+ex.gameId:''}</div></div>
    ${fx?`<p style="margin:4px 0"><b>${esc(ex.name)} is a licensed team:</b> the game keeps it at code ${ex.gameId}, in ${esc(compName(ex.compId)||'its league')}, under its own name, and it can't move. <b>Yes</b>: this update goes to ${esc(ex.name)}, which stays where it is in the game, so ${esc(caLeagueOf(o.compId))} won't have it. <b>No</b>: ${esc(caLeagueOf(o.compId))} gets a club of its own${shared?`; ${shared} player${shared===1?' is':'s are'} in both squads, and a player plays for one club only in the game, so take ${shared===1?'him':'them'} out of one squad`:''}.</p>`:''}
    <div class="row">${pop?`<button data-act="askNo">Stop</button><button data-act="caSameNo">No, a new club</button><button class="primary" data-act="caSameYes">Yes, the same club: update ${esc(ex.name)}</button>`
      :`<button class="sm primary" data-act="revSame" data-b="${b.id}" data-i="${i}">Yes, the same club: update ${esc(ex.name)}</button><button class="sm" data-act="revNotSame" data-b="${b.id}" data-i="${i}">No, a new club</button>`}</div></div>`}
// the question also stands at the top of its batch, since the groups below start folded
{const _bh=batchHTML;batchHTML=b=>{const h=_bh(b);const q=b.items.map((it,i)=>[it,i]).filter(([it])=>it.kind==='team'&&it.op==='add'&&it.maybe&&S.teams[it.maybe]);if(!q.length)return h;const k=h.indexOf('<details');const box=q.map(([it,i])=>caSameBox(b,it,i)).join('');return k<0?h.replace(/<\/div>\s*$/,box+'</div>'):h.slice(0,k)+box+h.slice(k)}}
// Yes: the new club's changes become an update of the project's club (and its country is recorded)
function caSameYes(b,k){const it=b.items[k];const ex=it&&S.teams[it.maybe];if(!ex)return;
  const o=clone(it.obj);o.id=ex.id;o.name=ex.name;o.short=ex.short||o.short;if(!ex.country&&it.obj.country){ex.country=it.obj.country;saveTeam(ex)}
  const nb=batchFromData({teams:{[ex.id]:o},comps:{}},{title:b.title,source:b.source,removeMissing:true,teamScope:[ex.id]});
  b.items.splice(k,1,...nb.items);if(nb.notes&&nb.notes.length)b.notes=[...(b.notes||[]),...nb.notes];if(S.pending[b.id])saveBatch(b)}
ACT.revSame=el=>{const b=S.pending[el.dataset.b];const k=+el.dataset.i;const it=b&&b.items[k];const ex=it&&S.teams[it.maybe];if(!ex)return;caSameYes(b,k);toast(it.obj.name+' is '+ex.name+': its changes now update '+ex.name+', and its country is recorded','ok');rerender()};
ACT.revNotSame=el=>{const b=S.pending[el.dataset.b];const it=b&&b.items[+el.dataset.i];if(!it)return;delete it.maybe;it.notSame=true;saveBatch(b);rerender()};
// Apply never goes past an unanswered "Same club?" (the user, 2026-11-22: "the system didn't stop me from importing same name
// teams"): each one is asked in a popup first; Stop applies nothing
ACT.caSameYes=el=>askAnswer(el,'yes');ACT.caSameNo=el=>askAnswer(el,'no');
async function caSameGate(bs){await fixedReady();for(const b of bs){for(let k=0;k<b.items.length;k++){const it=b.items[k];if(!(it.accept&&it.kind==='team'&&it.op==='add'&&it.maybe&&S.teams[it.maybe]))continue;
  const r=await new Promise(res=>{S.ui.askRes=res;modal(`<div class="mhead"><h2>Same club?</h2></div>${caSameBox(b,it,k,true)}`)});
  if(r==='yes')caSameYes(b,k);else if(r==='no'){delete it.maybe;it.notSame=true;if(S.pending[b.id])saveBatch(b)}else return false}}return true}/* ================= Process and Review → an update file for another copy (the user, 2026-11-22) =================
   "Export as update file" writes what waits in Process and Review (ticked items only) as the update-file format Import update
   files reads: one ZIP with update.json (mode "full": competitions, and each club as it would be after applying, with its
   squad, country, stadium, manager, colours, kit colours and its competition by name) and the images it carries
   (<competition code> <name>/<team code> <name>/images/emblems/<club>.png and <competition>/Logo/<competition>.png). Names, never this copy's ids, link everything, so the
   other copy (the website) matches its own clubs and competitions, asks "Same club?" where the country can't settle it, and
   asks a new competition's place when it is applied, as here. Kit textures and manager photos are not part of the format. */
// own: the clubs the update is about (a club that only loses players is left out: the other copy works its transfers out itself)
function revProjected(){const T={},C={},own=new Set();const tget=id=>T[id]||(S.teams[id]?(T[id]=clone(S.teams[id])):null);const cget=id=>C[id]||(S.comps[id]?(C[id]=clone(S.comps[id])):null);
  Object.values(S.pending).sort((a,b)=>a.createdAt-b.createdAt).forEach(b=>b.items.forEach(it=>{if(!it.accept)return;if(it.kind!=='comp')own.add(it.op==='add'&&it.kind==='team'?it.obj.id:it.teamId);const F=(it.fields||[]).filter(f=>f.accept);
    if(it.kind==='comp'&&it.op==='add'){if(!compsArr().some(x=>norm(x.name)===norm(it.obj.name)))C[it.obj.id]=clone(it.obj)}
    else if(it.kind==='comp'&&it.op==='update'){const c=cget(it.compId);if(c)F.forEach(f=>setP(c,f.k,clone(f.to)))}
    else if(it.kind==='team'&&it.op==='add')T[it.obj.id]=clone(it.obj);
    else if(it.kind==='team'&&it.op==='update'){const t=tget(it.teamId);if(t)F.forEach(f=>setP(t,f.k,clone(f.to)))}
    else if(it.kind==='player'){const t=tget(it.teamId);if(!t)return;t.players=t.players||[];
      if(it.op==='add')t.players.push(clone(it.obj));
      else if(it.op==='remove')t.players=t.players.filter(p=>p.id!==it.playerId);
      else if(it.op==='update'){const p=t.players.find(x=>x.id===it.playerId);if(p)F.forEach(f=>setP(p,f.k,clone(f.to)))}
      else if(it.op==='move'){const fr=tget(it.fromTeam);const p0=fr&&(fr.players||[]).find(x=>x.id===it.playerId);if(!p0)return;const p=clone(p0);F.forEach(f=>setP(p,f.k,clone(f.to)));
        if(!(isNationalTeam(S.teams[it.fromTeam])!==isNationalTeam(S.teams[it.teamId])))fr.players=fr.players.filter(x=>x.id!==it.playerId);t.players.push(p)}}}));
  Object.keys(T).forEach(id=>{if(!own.has(id))delete T[id]});return{T,C}}
const RX_P=['name','shirtName','nat','foot','style','pos','number','age','height','weight','wfUsage','wfAcc','form','injury','skills','comStyles','playables','attrs'];
async function revUpdateZip(){const {T,C}=revProjected();const cName=id=>(C[id]||S.comps[id]||{}).name||'';const z=new JSZip();const notes=[];
  const comps={};Object.values(C).forEach(c=>{comps[c.name]={name:c.name,short:c.short||'',country:c.country||'',type:c.type||'League',season:c.season||S.settings.season}});
  const teams={};Object.values(T).forEach(t=>{teams[t.name]={name:t.name,short:t.short||'',country:t.country||'',stadium:t.stadium||'',formation:t.formation||'',playstyle:t.playstyle||'',
    manager:t.manager?{name:t.manager.name||'',nat:t.manager.nat||'',age:t.manager.age||''}:undefined,compId:cName(t.compId)||undefined,colors:t.colors,
    kits:(t.kits||[]).map(k=>({slot:k.slot,shirt:k.shirt,second:k.second,shorts:k.shorts,socks:k.socks,numberColor:k.numberColor,collar:k.collar,sponsor:k.sponsor})),
    players:(t.players||[]).map(p=>{const o={};RX_P.forEach(k=>{if(p[k]!==undefined&&p[k]!=='')o[k]=clone(p[k])});return o})}});
  Object.values(S.pending).forEach(b=>(b.notes||[]).forEach(n=>notes.push(n)));
  // the export folders (app-core.js): <competition code> <name>/Logo/ and <competition>/<team code> <name>/images/emblems/; the file
  // names stay the club's and competition's names, which is what Import update files matches them by, whatever the folder
  let imgs=0;const put=async(id,dir,name)=>{const im=S.images[id];if(!im)return;try{const blob=isOfRef(im.ref)?await (await fetch(ofUrl(im.ref))).blob():await Store.getBlob(im.ref);if(!blob)return;
    const ext=/jpe?g/.test(blob.type)?'jpg':/webp/.test(blob.type)?'webp':/svg/.test(blob.type)?'svg':'png';z.file(dir+name.replace(/[\\/:*?"<>|]/g,'_')+'.'+ext,blob);imgs++}catch(e){}};
  const compOfT=t=>C[t.compId]||teamCompOf(t);
  for(const t of Object.values(T))await put(t.emblem,compFolder(compOfT(t))+'/'+teamFolder(t)+'/images/'+IMG_FOLDER.emblem+'/',t.name);for(const c of Object.values(C))await put(c.emblem,compFolder(c)+'/Logo/',c.name);
  const data={app:'pes21-option-studio',kind:'update-file',mode:'full',season:S.settings.season,exportedAt:Date.now(),comps,teams,notes:notes.slice(0,60)};
  z.file('update.json',JSON.stringify(data,null,1));return{z,nT:Object.keys(teams).length,nC:Object.keys(comps).length,imgs}}
ACT.revExport=async()=>{if(!Object.keys(S.pending).length){toast('Nothing is waiting in Process and Review','err');return}if(typeof JSZip==='undefined'){toast('The ZIP library did not load','err');return}
  let r;try{await miniBusy('Building the update file…',async()=>{r=await revUpdateZip()})}catch(e){toast('Could not build it: '+e.message,'err');return}
  if(!await ask('Export as update file?',`<b>${r.nT}</b> club${r.nT===1?'':'s'}, <b>${r.nC}</b> new competition${r.nC===1?'':'s'} and <b>${r.imgs}</b> image${r.imgs===1?'':'s'}, as they would be after applying what is ticked here. On the other copy (the website): Process and Review or Import / Export → <b>Import update files</b>, then apply it there. Kit textures and manager photos are not carried.`,LOCAL_SAVE?'Save on this computer':'Download'))return;
  const name='PES21_update_'+new Date().toISOString().slice(0,16).replace(/[T:]/g,'-')+'.zip';const blob=await r.z.generateAsync({type:'blob',compression:'DEFLATE'});
  try{if(LOCAL_SAVE){const H={'X-Studio':'1'};const b=await fetch('api/local/export/begin',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},H),body:JSON.stringify({name:'update-file'})});const bo=await b.json().catch(()=>({}));if(!b.ok)throw new Error(bo.error||b.status);
      const w=await fetch('api/local/export/file?name='+encodeURIComponent(bo.name)+'&path='+encodeURIComponent(name),{method:'POST',headers:H,body:new Uint8Array(await blob.arrayBuffer())});if(!w.ok)throw new Error('write '+w.status);toast('Saved '+name+' in '+bo.dir,'ok')}
    else{const dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;if(!dl)throw new Error('downloads aren\'t available here');await dl.save({filename:name,data:blob});toast('Downloaded '+name,'ok')}}
  catch(e){toast('Not saved: '+(e.message||e),'err')}};
{const _r=VIEWS.review;VIEWS.review=()=>{const h=_r();if(!Object.keys(S.pending).length||!/data-tab="changes"[^>]*|class="on" data-act="revTab" data-tab="changes"/.test(h)||!/aria-selected="true" class="on" data-act="revTab" data-tab="changes"/.test(h))return h;return h.replace(/(<span class="spacer"><\/span>)/,'$1<button data-act="revExport" title="What waits here, as an update file another copy (the website) imports with Import update files">Export as update file</button>')}}
/* ----- Health check → Team details → Similarly named teams (Suggestion; the user, 2026-11-22) -----
   Two clubs of the project whose names are the same once "Al", "FC", "SC", "Club" and country words are left out: one club twice
   (Arsenal and Arsenal FC), or two clubs of different countries (Al Ain of the UAE and of Saudi Arabia). Listed with each one's
   country, league and code, and how their countries compare; a pair from two known, different countries is not listed.
   "Different clubs" hides a pair for good (settings.simNameOk). Cup copies are not teams of their own and are left out. */
const simKey=(a,b)=>[a.id,b.id].sort().join('|');
function simNamePairs(){const ok=S.settings.simNameOk||{};const T=teamsArr().filter(t=>!t.sameAs&&!t.noCode&&!isNationalTeam(t));const by=new Map();
  T.forEach(t=>{const k=caCore(t.name).slice().sort().join(' ');if(!k)return;(by.get(k)||by.set(k,[]).get(k)).push(t)});const out=[];
  by.forEach(L=>{for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],b=L[j];if(ok[simKey(a,b)])continue;const ca=clubCountry(a),cb=clubCountry(b);
    if(ca&&cb&&ca!==cb&&clubCountryFirm(a)&&clubCountryFirm(b))continue;out.push({a,b,same:!!(ca&&cb&&ca===cb),country:ca||cb})}});
  return out.sort((x,y)=>(y.same-x.same)||x.a.name.localeCompare(y.a.name))}
function simNameHTML(L){if(!L.length)return '<p class="why">No two teams have similar names, apart from pairs you marked as different clubs or pairs from two different countries.</p>';
  const det=t=>`${esc(t.country||(clubCountry(t)?clubCountry(t).replace(/\b[a-z]/g,m=>m.toUpperCase()):'country not known'))} · ${esc(compName(t.compId)||'no competition')}${+t.gameId?' · code '+t.gameId:''} · ${(t.players||[]).length} players`;
  return `<p class="why">Names that are the same once "Al", "FC", "SC", "Club" and country words are left out: one club twice, or two clubs of different countries (the UAE and Saudi Arabia share several names). Give each its country on its page (Team info → Country) and a pair from two countries settles itself; mark a pair "Different clubs" to hide it. One club twice: keep one, move the players it needs (Health check → Same player in two teams), then delete the other.</p>
   <div class="hc-rows">${L.map(x=>hcRow('info',`<button type="button" class="hc-link" data-act="openTeam" data-id="${x.a.id}" title="Open ${esc(x.a.name)}">${esc(x.a.name)}</button> <span class="small muted">and</span> <button type="button" class="hc-link" data-act="openTeam" data-id="${x.b.id}" title="Open ${esc(x.b.name)}">${esc(x.b.name)}</button> ${x.same?'<span class="tag t-mov">same country</span>':'<span class="tag t-upd">country not known</span>'}`,`${esc(x.a.name)}: ${det(x.a)}<br>${esc(x.b.name)}: ${det(x.b)}`,
     `<span style="display:grid;gap:4px;justify-items:end"><span><button class="sm ghost" data-act="simDiff" data-k="${simKey(x.a,x.b)}">Different clubs</button></span>${simCopyBtns(x.a,x.b)}</span>`)).join('')}</div>`}// "Copy onto the other" (the user, 2026-11-22): one club written on top of the other under the other's own IDs, the newer onto the
// older recommended. Not for a pair that holds the same code (one file), nor onto a cup copy.
const simNewer=(a,b)=>(+b.updatedAt||0)>(+a.updatedAt||0)?b:a;
// one command (the user, 2026-11-22): "Use latest for both", the more recently changed club copied onto the other
function simCopyBtns(a,b){if(+a.gameId&&+a.gameId===+b.gameId)return '';const nw=simNewer(a,b),old=nw===a?b:a;const d=t=>t.updatedAt?' (changed '+fmtDate(t.updatedAt)+')':'';
  return `<span><button class="sm primary" data-act="simCopy" data-from="${nw.id}" data-to="${old.id}" title="${esc(nw.name+d(nw)+' is the latest: its squad, details and images are written onto '+old.name+d(old)+', under '+old.name+'\'s own IDs')}">Use latest for both</button></span>`}ACT.simCopy=async el=>{const from=S.teams[el.dataset.from],to=S.teams[el.dataset.to];if(!from||!to)return;
  const imgs=t=>[t.emblem,t.managerPhoto,t.stadiumImg,...(t.sponsorImgs||[]),...(t.kits||[]).map(k=>k.img)].filter(Boolean);
  if(!await ask('Copy '+from.name+' onto '+to.name+'?',`<b>${esc(to.name)}</b> keeps its name, code${+to.gameId?' ('+to.gameId+')':''} and competition, and takes from <b>${esc(from.name)}</b>: its ${(from.players||[]).length} players, manager, stadium, formation, colours, kits, crest and other images.<br><br>The players get <b>${esc(to.name)}'s own game IDs</b> (the records its code has), never ${esc(from.name)}'s, so the two clubs share no player in the game; any left without one are listed for an available ID. ${esc(to.name)}'s old images are <b>deleted</b> (unless something else uses them): at export the new images go in under its code's own image names. A snapshot is taken first; images uploaded to the studio don't come back with an undo.`,'Copy',true))return;
  await fixedReady();if(!pcReady())await pcLoadAll();
  const sn=await takeSnapshot('Before copying '+from.name+' onto '+to.name,true);sn.auto=false;Store.put('snaps',sn);const old=imgs(to);
  histLabel(from.name+' copied onto '+to.name+' (its own IDs)','Health',()=>{
    // a man the old squad has keeps his own record at this code (the same man, so never another player's ID); the rest take
    // the free records the code has (pcTeamTake below)
    const oldBy=new Map((to.players||[]).map(p=>[norm(p.name),p]));
    to.players=(from.players||[]).map(p=>{const q=clone(p);const o=oldBy.get(norm(p.name));delete q.codeSet;delete q.codeWas;delete q.codeOff;
      if(o){oldBy.delete(norm(p.name));q.id=o.id;q.ted=o.ted?clone(o.ted):null;q.gameId=o.gameId||'';['codeSet','codeWas'].forEach(k=>{if(o[k]!==undefined)q[k]=clone(o[k])})}else{q.id=uid();q.ted=null;q.gameId=''}return q});
    ['manager','stadium','formation','playstyle','colors','emblem','managerPhoto','stadiumImg','sponsorImgs','kits'].forEach(k=>{if(from[k]!==undefined)to[k]=clone(from[k])});
    if(!to.country&&from.country)to.country=from.country;saveTeam(to)});
  PCV++;const pn=await pcTeamTake(to);const now=new Set(imgs(to));impDropImages(old.filter(id=>!now.has(id)));
  toast(from.name+' is copied onto '+to.name+pn,'ok');rerender()};
ACT.simDiff=el=>{(S.settings.simNameOk||(S.settings.simNameOk={}))[el.dataset.k]=true;saveSettings();toast('Marked as different clubs','ok');rerender()};
/* ================= An imported option file is kept, so every rebuild reads it again (DATABASE_RULES 5a, 5) =================
   The user, 2026-11-23: rebuilds take in the option files imported since. Team and competition files installed through Import
   files, with the images they name, are kept as a package like the base option file (settings.ofSources, in order), with each
   file's name and own code. Before a rebuild the codes their teams and competitions hold now are noted (a new club placed on
   another code, one left without a code), so the rebuild puts them back where they are. */
function impSourceCapture(){const st=impState();const teds=(st.teds||[]).filter(x=>x.on),ceds=(st.ceds||[]).filter(x=>x.on);if(!teds.length&&!ceds.length)return null;
  const names=new Set();teds.forEach(x=>{try{const n=ofNames(TED.decrypt(TED.unb64(x.b64)));[n.emblem,n.manager,n.stadium,n.sp1,n.sp2,n.sp3,...n.kits].forEach(v=>v&&names.add(String(v).toLowerCase()))}catch(e){}});
  ceds.forEach(x=>{if(x.parsed.emblemFile)names.add(x.parsed.emblemFile.toLowerCase())});
  const top=String((teds[0]||ceds[0]).path||'').split('/')[0].replace(/\.zip$/i,'')||'Imported files';
  return{label:top+' '+new Date().toISOString().slice(0,10),teds:teds.map(x=>({name:x.name,b64:x.b64,code:x.parsed.team.teamId})),ceds:ceds.map(x=>({name:x.name,b64:x.b64,code:x.parsed.compId})),
    imgs:st.images.filter(i=>names.has(String(i.name).toLowerCase())&&i.blob).map(i=>({name:i.name,blob:i.blob}))}}
async function impKeepSource(cap){if(!cap||typeof JSZip==='undefined'||!ofAvailable())return;
  try{const z=new JSZip();const seen=new Set();const add=(name,data)=>{const k=name.toLowerCase();if(seen.has(k))return;seen.add(k);z.file(name,data)};
    cap.teds.forEach(x=>add(x.name,TED.unb64(x.b64)));cap.ceds.forEach(x=>add(x.name,TED.unb64(x.b64)));cap.imgs.forEach(x=>add(x.name,x.blob));
    const blob=await z.generateAsync({type:'blob',compression:'STORE'});const name=pesFold(cap.label).replace(/\s+/g,'_')+'.zip';
    const e=await ofUploadPackage(new File([blob],name,{type:'application/zip'}),'source');if(!e||!e.id)throw new Error('the server did not say where it kept it');
    const files={},cfiles={};cap.teds.forEach(x=>files[x.name]=x.code);cap.ceds.forEach(x=>cfiles[x.name]=x.code);
    S.settings.ofSources=(S.settings.ofSources||[]).filter(x=>x.id!==e.id).concat({id:e.id,name:cap.label,at:Date.now(),files,cfiles,codes:{},ccodes:{}});saveSettings();OF_RD.r=null;OF_RD.key='';
    toast(cap.label+' is kept with the option file: a rebuild reads it again','ok')}
  catch(err){toast('The imported files are in the project, but could not be kept for rebuilds: '+err.message,'err')}}
// the codes the teams and competitions of each imported option file hold now (-1: left without a code, not read on rebuild)
function ofSourceCodes(){(S.settings.ofSources||[]).forEach(src=>{const codes={},ccodes={};
    Object.entries(src.files||{}).forEach(([name,fc])=>{const t=teamsArr().find(t=>!t.sameAs&&S.teds[t.id]&&S.teds[t.id].file===name&&+S.teds[t.id].tedTeamId===+fc);if(t){const c=t.noCode||!+t.gameId?-1:+t.gameId;if(c!==+fc)codes[fc]=c}});
    Object.entries(src.cfiles||{}).forEach(([name,fc])=>{const c=compsArr().find(c=>c.ced&&c.ced.file===name&&+c.ced.compId===+fc);if(c){const k=c.noCode||!+c.gameId?-1:+c.gameId;if(k!==+fc)ccodes[fc]=k}});
    src.codes=codes;src.ccodes=ccodes});saveSettings()}
/* ================= Import / Export: a discard deletes the imported files, with a warning (the user, 2026-11-25) =================
   "during imports, any discard must delete imported files with a warning" — "in import export page only". The Import tab's
   discards: Clear list, Dismiss on the "Read N files" summary, and Discard (Close when the files change nothing) after Process files. Each says what is deleted and
   asks first: the files read for this import (held in the browser until installed) and the images the check added to the
   project, those nothing in it uses (impDropImages). Nothing installed is touched. The studio's own clear after an install
   isn't a discard: it asks nothing. */
const impHeld=()=>{const st=S.ui.imp;const P=S.ui.impPlan;const n=st?(st.teds||[]).length+(st.ceds||[]).length+st.images.length+st.tables.length+(st.extras||[]).length+(st.updates||[]).length+st.studio.length+(st.packages||[]).length+(st.transfers||[]).length:0;
  const used=usage();const imgs=P?(P.images||[]).filter(id=>S.images[id]&&!used[id]):[];return{n,imgs}};
const impClearWarn=H=>`<div class="warnbox small" style="margin-top:10px"><b>The imported files are deleted.</b> ${H.n?`<b>${H.n}</b> file${H.n===1?'':'s'} read for this import ${H.n===1?'is':'are'} dropped`:''}${H.n&&H.imgs.length?', and ':''}${H.imgs.length?`<b>${H.imgs.length}</b> image${H.imgs.length===1?'':'s'} the check added ${H.imgs.length===1?'is':'are'} deleted from the project`:''}. This can't be undone: to use them again, add the files again.</div>`;
// asked only when you press the button (a button passes itself; the studio's own calls pass nothing)
const impAsked=async(el,title,what)=>{const H=impHeld();if(!(el&&el.nodeType===1)||(!H.n&&!H.imgs.length))return true;
  return ask(title,what+impClearWarn(H),'Delete the files',true)};
{const _c=ACT.impClear;ACT.impClear=async el=>{if(!await impAsked(el,'Clear the imported files?','Nothing is installed, and nothing in your project changes.'))return;
  if(S.ui.impPlan)impDropImages(S.ui.impPlan.images);S.ui.impPlan=null;_c(el)}}
{const _d=ACT.impPlanDrop;ACT.impPlanDrop=async el=>{if(!await impAsked(el,'Discard this import?','Nothing is installed, and nothing in your project changes.'))return;
  _d(el);if(el&&el.nodeType===1)ACT.impClear()}}
{const _r=ACT.impToReview;ACT.impToReview=async el=>{const cap=impSourceCapture();await _r(el);await impKeepSource(cap)}}

/* ================= A team update: the new players take the removed players' IDs (the user, 2026-11-25) =================
   "fix how process and review works so that every team update replaces the removed players with the new ones and if more
   IDs needed, push the rest to players missing IDs." The game only overwrites players it has, so a new player is in the game
   only on an ID the game knows. When an apply (Process and Review's Apply and Apply all, Import's Install) changes who is in
   a squad, the players it removed leave their records at the team's code free, and the team's players with no game ID take
   them over at once (pcTeamTake: his own record or one of his name first, then a free one at the code, same position first).
   New players beyond the IDs freed stay without one: Health check → Game IDs → Players with no game ID lists them. */
const SQ_CHANGED=new Set();
{const _ab=applyBatch;applyBatch=b=>{const ids=new Set((b.items||[]).flatMap(i=>[i.teamId,i.fromTeam,i.kind==='team'&&i.obj&&i.obj.id]).filter(Boolean));const was=new Map([...ids].map(id=>[id,S.teams[id]?(S.teams[id].players||[]).map(p=>p.id).join():null]));
  const r=_ab(b);ids.forEach(id=>{const t=S.teams[id];if(t&&was.get(id)!==null&&(t.players||[]).map(p=>p.id).join()!==was.get(id))SQ_CHANGED.add(id)});return r}}
async function sqTakeAfter(){const ids=[...SQ_CHANGED];SQ_CHANGED.clear();if(!ids.length||!S.settings.ofPkg)return;
  // a broken team file whose squad was just changed is written again by the export: its broken places are gone with the old squad
  try{const codes=new Set(ids.map(id=>S.teams[id]).filter(t=>t&&!t.sameAs&&!t.noCode).map(t=>+t.gameId).filter(Boolean));const o=S.settings.sqFix||(S.settings.sqFix={});let k=0;ofBadSquads().forEach(x=>{if(sqFixable(x)&&codes.has(x.code)&&!o[x.code]){o[x.code]=1;k++}});if(k){saveSettings();if(S.ui.tocSt){delete S.ui.tocSt.full;delete S.ui.tocSt.changes}}}catch(e){console.error(e)}let took=0,left=0,teams=0;
  for(const id of ids){const t=S.teams[id];if(!t||t.sameAs||t.noCode||!+t.gameId)continue;const m=/; (\d+) of its players took over[^(]*(?:\((\d+) still)?/.exec(await pcTeamTake(t)||'');if(m){teams++;took+=+m[1];left+=+(m[2]||0)}}
  if(took||left)toast((took?took+' new player'+(took===1?'':'s')+' took the game IDs of players who left'+(teams>1?' ('+teams+' teams)':''):'No free game ID for the new players')+(left?'. '+left+' still '+(left===1?'has':'have')+' no game ID: Health check → Players with no game ID':''),left?'':'ok')}
['revApply','revApplyAll','impInstall'].forEach(k=>{const _f=ACT[k];ACT[k]=async el=>{SQ_CHANGED.clear();await _f(el);try{await sqTakeAfter()}catch(e){console.error(e)}rerender()}});
