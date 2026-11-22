// PES 2021 Option Studio: adding a competition, the one way (the user, 2026-11-22).
// The parts are one program in one global scope, loaded in order by index.html; this file wraps what earlier files defined and
// calls Game codes' allocation (app-boot.js) only when a button is pressed.
"use strict";
/* ================= Adding a competition: four steps =================
   1 Find it: Live Update → Competitions (search the known leagues, a new name, or Search international competitions).
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
function compAddAsk(c){const P=compAddPlaces(c);const any=P.vac.length||P.rep.length;const want=+(c.ced&&c.ced.compId)||0;
  const vo=x=>`<option value="v|${x.code}" ${x.code===want?'selected':''}>Slot ${slotOf(x.code)} · code ${x.code}${x.from?' · was '+esc(x.from):''}</option>`;
  const ro=x=>`<option value="r|${x.code}|${x.comp.id}">${esc(x.comp.name)} · slot ${slotOf(x.code)}${compMembers(x.comp).length?' · '+compMembers(x.comp).length+' teams':''}</option>`;
  return new Promise(res=>{S.ui.askRes=res;modal(`<div class="mhead"><h2>Where does ${esc(c.name)} go in the game?</h2></div>
    <p class="small">PES 2021 has a fixed set of competition slots, and a competition is in the game only on one of them. A new ${P.kind} takes a ${P.kind} slot: a <b>vacancy</b> no competition holds now, or the slot of a competition it <b>replaces</b>.${P.kind==='league'?' Its clubs join it in the game by taking codes of that league (their page → Change competition).':''}</p>
    ${any?`<select id="ca-pick" size="${Math.min(12,P.vac.length+P.rep.length+2)}" style="width:100%" aria-label="Place in the game">${P.vac.length?`<optgroup label="Fill a vacancy (${P.vac.length})">${P.vac.map(vo).join('')}</optgroup>`:''}${P.rep.length?`<optgroup label="Replace a competition (${P.rep.length})">${P.rep.map(ro).join('')}</optgroup>`:''}</select>
      <p class="small muted" style="margin:6px 0 0">A replaced competition loses its slot: you choose next whether it and its teams are kept out of the game or deleted. Competitions the game keeps (its own, the World Cup, those with licensed teams) can't be replaced and aren't listed.</p>`
     :`<div class="warnbox small">No ${P.kind} slot is free, and no ${P.kind} can give its slot up, so ${esc(c.name)} can't be added to the game now. Free a slot first: delete a ${P.kind} you don't want, or free its slot on Game codes.</div>`}
    <div class="row end" style="margin-top:12px"><button data-act="askNo">Stop</button><button data-act="caSkip">Leave it out</button>${any?'<button class="primary" data-act="caOk">Use this place</button>':''}</div>`)})}
ACT.caOk=()=>{const v=($('#ca-pick')||{}).value;if(!v){toast('Choose a place first','err');return}const r=S.ui.askRes;S.ui.askRes=null;closeModal();
  const [m,code,id]=v.split('|');r&&r({code:+code,rep:m==='r'?S.comps[id]||null:null})};
ACT.caSkip=()=>{const r=S.ui.askRes;S.ui.askRes=null;closeModal();r&&r('skip')};
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
// Process and Review's Apply, Apply all, and Import / Export's Install go through the gate, after their own confirmation
{const _a=ACT.revApply;ACT.revApply=async el=>{const b=S.pending[el.dataset.b];if(!b)return;const g=await compAddGate([b]);if(g===null){rerender();return}saveBatch(b);
  await _a(el);compAddFinish(g);rerender()}}
ACT.revApplyAll=async()=>{const bs=Object.values(S.pending).sort((a,b)=>a.createdAt-b.createdAt);const n=bs.reduce((a,b)=>a+b.items.filter(i=>i.accept).length,0);
  if(!await ask('Apply all batches',`Apply the ticked changes in all ${bs.length} batches (${n} changes)? One snapshot is saved first so you can restore it.`,'Apply all'))return;
  const g=await compAddGate(bs);if(g===null){rerender();return}bs.forEach(saveBatch);
  await takeSnapshot('Before applying '+bs.length+' batches',true);let t=0,sk=0;bs.forEach(b=>{const r=applyBatch(b);t+=r.n;sk+=r.skipped});
  compAddFinish(g);toast('Applied '+(t-sk)+' changes'+(sk?' ('+sk+' skipped)':''),'ok');rerender()};
ACT.impInstall=async()=>{const P=S.ui.impPlan;if(!P)return;const n=impPlanCount(P);if(!n)return;
  if(!await ask('Install '+n+' change'+(n===1?'':'s')+'?','They go into your project now. A snapshot is saved first, so you can go back from Compare &amp; versions.','Install'))return;
  const g=await compAddGate(P.batches);if(g===null){rerender();return}
  await takeSnapshot('Before import',true);let t=0,sk=0;for(const b of P.batches){const r=applyBatch(b);t+=r.n;sk+=r.skipped}
  let k=0;for(const d of P.deferred)if(d.on){try{await d.fn();k++}catch(e){toast(d.label+': '+e.message,'err')}}
  compAddFinish(g);impDropImages(P.images);S.ui.impPlan=null;ACT.impClear();toast('Installed '+(t-sk+k)+' change'+(t-sk+k===1?'':'s')+(sk?' ('+sk+' skipped: already there)':''),'ok');rerender()};// step 1 is on Live Update: the Competitions page's Add competition opens it (there is no hand-made competition any more)
ACT.addComp=()=>{S.ui.aiTab='comps';S.ui.aiCompMode='new';S.ui.aiPrefill=null;location.hash='ai';setTimeout(()=>{const i=$('#ai-csearch');if(i){i.scrollIntoView({block:'center'});i.focus()}},120)};
