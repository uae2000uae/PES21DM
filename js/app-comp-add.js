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
// Step 1's "Will provide my own file" (the user, 2026-11-22): step 2 is then the Competitions page's Updates card commands for
// this one competition, the web-search command (a Claude chat with web search returns a .json update file) and Import update
// files, instead of Claude drafting it here. Installing the file brings step 3, as every other way in does.
CH.aiCompOwn=el=>{S.ui.aiCompOwn=el.checked;const b=$('#ai-run-comp');if(b&&S.ui.aiCompMode==='new')b.textContent=el.checked?'Get the commands for my file':'Draft new competition'};
{const _r=ACT.aiRunComp;ACT.aiRunComp=el=>{const mode=($('input[name=ai-cmode]:checked')||{}).value||'existing';if(mode!=='new'||!($('#ai-cown')||{}).checked)return _r(el);
  const name=($('#ai-comp')||{}).value.trim(),country=($('#ai-ccountry')||{}).value.trim();if(!name){toast('Type the competition\'s name','err');$('#ai-comp').focus();return}
  const have=compsArr().find(c=>norm(c.name)===norm(name));if(have){toast(have.name+' is already in your project','err');return}
  const t=COMP_TEMPLATES.find(x=>norm(x[0])===norm(name));S.ui.caOwn={name,country:country||(t?t[1]:''),type:t?t[2]:(/cup|copa|coupe|pokal|champions|trophy|shield|super/i.test(name)?'Cup':'League')};
  modal(`<div class="mhead"><h2>Your own file for ${esc(name)}</h2></div>
    <p class="small">Step 2, with your own file: get the web-search command, paste it into a Claude chat with web search, and import the <b>.json</b> file it returns (or any update file you have for it). Everything in the file goes to Process and Review first.</p>
    <ol class="small" style="padding-left:18px"><li><b>Get web-search command</b>: the competition, its clubs, their players and the images to look for.</li><li><b>Import update files</b>: your file.</li><li>When you install it, the studio asks where ${esc(name)} goes in the game: a vacancy or a competition it replaces (step 3).</li></ol>
    <div class="row end" style="margin-top:12px"><button data-act="close">Close</button><button data-act="importPkg">Import update files</button>${S.settings.aiWeb!=='off'?'<button class="primary" data-act="caOwnCmd">Get web-search command</button>':''}</div>`)}}
ACT.caOwnCmd=()=>{const l=S.ui.caOwn;if(!l)return;closeModal();showParts('teams',l.name,starterParts('teams',[l]))};{const _m=CH.aiCompMode;CH.aiCompMode=el=>{_m(el);const o=$('#ai-cown');if(o&&el.value==='new'&&o.checked){const b=$('#ai-run-comp');if(b)b.textContent='Get the commands for my file'}}}

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
function clubCountry(t){if(!t)return'';if(t.country)return caCountry(t.country);const w=caNameCountry(t.name);if(w)return w;
  const c=S.comps[t.compId];if(c&&isLeagueComp(c)&&!/^other/i.test(c.name)){const k=typeof lgKey==='function'?lgKey(c):null;if(k&&k[0])return caCountry(k[0])}return''}
const caCore=n=>clubCore(n).filter(w=>!CA_COUNTRY_WORD[w]);
// 'yes', 'no' or 'maybe' for an incoming club (name, country) against a club of the project
function clubVerdict(name,country,t,coreIn){const same=norm(name)===norm(t.name);if(!same){const A=coreIn||caCore(name),B=caCore(t.name);if(!A.length||A.length!==B.length||!A.every(w=>B.includes(w)))return 'no'}
  const ci=caCountry(country)||caNameCountry(name),ct=clubCountry(t);if(ci&&ct)return ci===ct?'yes':'no';if(!ci)return 'yes';return 'maybe'}
function clubMatch(name,country){const coreIn=caCore(name);const league=t=>!isCupComp(S.comps[t.compId]);const yes=[],maybe=[];
  teamsArr().forEach(t=>{if(t.sameAs||isNationalTeam(t))return;const v=clubVerdict(name,country,t,coreIn);if(v==='yes')yes.push(t);else if(v==='maybe')maybe.push(t)});
  return yes.length?{v:'yes',t:yes.find(league)||yes[0]}:maybe.length?{v:'maybe',t:maybe.find(league)||maybe[0]}:{v:'no',t:null}}
findClub=(name,country)=>{const r=clubMatch(name,country);return r.v==='yes'?r.t:null};
// every batch: a new club the check confirms becomes an update of that club; one it can't confirm is asked about
{const _b=batchFromData;batchFromData=(inc,o)=>{const ask=[];
  Object.values(inc.teams||{}).forEach(t=>{if(!t||S.teams[t.id]||isCountryTeamName(t.name))return;const r=clubMatch(t.name,t.country);
    if(r.v==='yes'&&r.t){if(norm(r.t.name)!==norm(t.name)){t.name=r.t.name;t.short=r.t.short||t.short}if(o&&Array.isArray(o.teamScope)&&o.teamScope.includes(t.id))o.teamScope.push(r.t.id);t.id=r.t.id;return}
    if(Object.values(S.teams).some(x=>norm(x.name)===norm(t.name)))t._noNameMatch=true;if(r.v==='maybe'){t._noNameMatch=true;ask.push([t.id,r.t.id])}});
  const b=_b(inc,o);ask.forEach(([nid,tid])=>{const it=b.items.find(i=>i.kind==='team'&&i.op==='add'&&i.obj&&i.obj.id===nid);if(it)it.maybe=tid});
  b.items.forEach(i=>{if(i.obj)delete i.obj._noNameMatch});Object.values(inc.teams||{}).forEach(t=>delete t._noNameMatch);return b}}
// the question, on the new club's row: both clubs with their country and league, so the answer is clear
const caLeagueOf=id=>{if(S.comps[id])return S.comps[id].name;for(const b of Object.values(S.pending))for(const i of b.items)if(i.kind==='comp'&&i.op==='add'&&i.obj&&i.obj.id===id)return i.obj.name+' (new, in Process and Review)';return 'no competition'};
// a batch made before this check (or before the club was in the project) is checked when it is shown: a namesake is asked about
{const _ih=itemHTML;itemHTML=(b,it,i)=>{if(it.kind==='team'&&it.op==='add'&&it.obj&&it.maybe===undefined&&!it.sameChecked){it.sameChecked=true;const r=clubMatch(it.obj.name,it.obj.country);if(r.t&&r.v!=='no'&&!S.teams[it.obj.id])it.maybe=r.t.id;setTimeout(()=>saveBatch(b),0)}
  const h=_ih(b,it,i);const ex=it.maybe&&S.teams[it.maybe];if(!ex||it.kind!=='team'||it.op!=='add')return h;const o=it.obj;
  return h}}
function caSameBox(b,it,i){const ex=S.teams[it.maybe],o=it.obj;
  return `<div class="warnbox small" style="margin-top:6px"><b>Same club?</b> A club of this name is already in your project, and their countries can't be compared.
    <div class="grid g2" style="gap:6px;margin:6px 0"><div><b>${esc(o.name)}</b> <span class="muted">(from this update)</span><br>${esc(o.country||'country not known')} · ${esc(caLeagueOf(o.compId))}</div>
    <div><b>${esc(ex.name)}</b> <span class="muted">(in your project)</span><br>${esc(ex.country||(clubCountry(ex)?clubCountry(ex).replace(/\b[a-z]/g,m=>m.toUpperCase()):'country not known'))} · ${esc(compName(ex.compId)||'no competition')}${+ex.gameId&&!ex.noCode?' · code '+ex.gameId:''}</div></div>
    <div class="row"><button class="sm primary" data-act="revSame" data-b="${b.id}" data-i="${i}">Yes, the same club: update ${esc(ex.name)}</button><button class="sm" data-act="revNotSame" data-b="${b.id}" data-i="${i}">No, a new club</button></div></div>`;
}
// the question also stands at the top of its batch, since the groups below start folded
{const _bh=batchHTML;batchHTML=b=>{const h=_bh(b);const q=b.items.map((it,i)=>[it,i]).filter(([it])=>it.kind==='team'&&it.op==='add'&&it.maybe&&S.teams[it.maybe]);if(!q.length)return h;const k=h.indexOf('<details');const box=q.map(([it,i])=>caSameBox(b,it,i)).join('');return k<0?h.replace(/<\/div>\s*$/,box+'</div>'):h.slice(0,k)+box+h.slice(k)}}
ACT.revSame=el=>{const b=S.pending[el.dataset.b];const k=+el.dataset.i;const it=b&&b.items[k];const ex=it&&S.teams[it.maybe];if(!ex)return;
  const o=clone(it.obj);o.id=ex.id;o.name=ex.name;o.short=ex.short||o.short;if(!ex.country&&it.obj.country){ex.country=it.obj.country;saveTeam(ex)}
  const nb=batchFromData({teams:{[ex.id]:o},comps:{}},{title:b.title,source:b.source,removeMissing:true,teamScope:[ex.id]});
  b.items.splice(k,1,...nb.items);if(nb.notes&&nb.notes.length)b.notes=[...(b.notes||[]),...nb.notes];saveBatch(b);toast(it.obj.name+' is '+ex.name+': its changes now update '+ex.name+', and its country is recorded','ok');rerender()};
ACT.revNotSame=el=>{const b=S.pending[el.dataset.b];const it=b&&b.items[+el.dataset.i];if(!it)return;delete it.maybe;saveBatch(b);rerender()};