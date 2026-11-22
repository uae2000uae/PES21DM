// PES 2021 Option Studio, part 2 of 14: Pages: Overview, Competitions, Teams, Players, the image library, emblem maker and kit designer.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= View: Overview ================= */
VIEWS.overview=()=>{
  const nT=Object.keys(S.teams).length,nC=Object.keys(S.comps).length,nP=allPlayers().length,nI=Object.keys(S.images).length;
  const nR=Object.values(S.pending).reduce((a,b)=>a+(b.items||[]).length,0);
  const base=dataFor('baseline');let nD='–';if(base){nD=diffCount(diffData(base,currentData()))}
  const empty=!nT&&!nC;
  const snaps=Object.values(S.snaps).sort((a,b)=>b.createdAt-a.createdAt).slice(0,5);
  return `<h1>Your PES 2021 update</h1>
  <p class="sub">Edit teams, ratings, competitions, emblems and kits here, review every change before it lands, then export a USB package for <b>Edit → Import/Export</b> on your PS5. Season label: <b>${esc(S.settings.season)}</b>.</p>
  ${seasonNote()}
  <div class="grid g4">
    <div class="tile"><div class="n">${nC}</div><div class="l">Competitions${(()=>{const f=typeof ofFileCounts==='function'&&ofFileCounts();return f?`<div class="small muted" title="${f.own} are the game's own competitions: no competition file is written for them">${f.ced} competition file${f.ced===1?'':'s'}</div>`:''})()}</div></div>
    <div class="tile"><div class="n">${nT}</div><div class="l">Teams${(()=>{const f=typeof ofFileCounts==='function'&&ofFileCounts();return f?`<div class="small muted" title="${f.two} team${f.two===1?' has':'s have'} a second team file for the same slot; ${f.noSecond?'only the first is written':'both are written'}">${f.ted} team file${f.ted===1?'':'s'}</div>`:''})()}</div></div>
    <div class="tile"><div class="n">${nP}</div><div class="l">Players</div></div>
    <div class="tile"><div class="n">${nI}</div><div class="l">Logos &amp; kits</div></div>
    <div class="tile ${nR?'warn':''}"><div class="n">${nR}</div><div class="l">Waiting for review</div></div>
    <div class="tile"><div class="n">${nD}</div><div class="l">Changes since baseline</div></div>
  </div>
  ${empty?`<h2>Start your project</h2><div class="grid g3">
    <div class="card"><h3>From Claude</h3><p class="small">Build a full league (teams, players, ratings) from Claude's football knowledge. Everything lands in Process and Review first.</p><button class="primary" data-act="go" data-to="ai">Open Live Update</button></div>
    <div class="card"><h3>From a spreadsheet</h3><p class="small">Import a players CSV (any column order; names like "Finishing" or "Speed" are recognised).</p><button data-act="importCSV">Import CSV</button></div>
    <div class="card"><h3>By hand</h3><p class="small">Add a competition, then teams and players one by one.</p><button data-act="addComp">Add competition</button></div>
    <div class="card"><h3>From a backup</h3><p class="small">Restore a project backup (.json) or a package (.zip) exported from this studio.</p><button data-act="importPkg">Open backup or package</button></div>
  </div>`:''}
  <h2>Getting it onto your PS5</h2>
  <div class="steps">
    <div class="step"><b>Export</b> a package here and unzip it. Copy the <b>WEPES</b> folder to the root of a USB drive formatted exFAT or FAT32.</div>
    <div class="step">In PES 2021: <b>Settings → Edit → Data Management → Import/Export → Import Images</b>. Import team emblems, competition emblems, strips and manager photos.</div>
    <div class="step">Open the <b>Update Sheet</b> from the package on your phone. Apply names, players and ratings in <b>Edit → Teams / Players</b>, and paste each imported image where the sheet says.</div>
    <div class="step"><b>Save</b> the edit data in-game, then mark this export as your new baseline so the next update only shows what changed.</div>
  </div>
  <h2>Baseline &amp; versions</h2>
  <div class="grid g2">
    <div class="card"><h3>Baseline</h3>${S.settings.baseline&&S.snaps[S.settings.baseline]?`<p>Comparing against <b>${esc(S.snaps[S.settings.baseline].name)}</b> from ${fmtDate(S.snaps[S.settings.baseline].createdAt)}.</p>`:`<p class="small">No baseline yet. Take one when your data matches what's in the game, so later changes show up as differences.</p>`}
      <div class="row"><button class="primary" data-act="snapBaseline">Snapshot now &amp; set as baseline</button><button data-act="go" data-to="compare">Compare</button></div></div>
    <div class="card"><h3>Recent snapshots</h3>${snaps.length?`<table><tbody>${snaps.map(s=>`<tr><td>${esc(s.name)}${S.settings.baseline===s.id?' <span class="tag t-upd">baseline</span>':''}</td><td class="muted small">${fmtDate(s.createdAt)}</td></tr>`).join('')}</tbody></table>`:'<p class="muted small">None yet.</p>'}</div>
  </div>`;
};
ACT.snapBaseline=async()=>{const sn=await takeSnapshot('Baseline '+new Date().toLocaleDateString());S.settings.baseline=sn.id;saveSettings();rerender()};

/* ================= View: Competitions ================= */
VIEWS.competitions=()=>{
  const comps=compsArr();const counts={};teamsArr().forEach(t=>counts[t.compId]=(counts[t.compId]||0)+1);comps.forEach(c=>counts[c.id]=compMembers(c).length);
  return `<div class="row"><div><h1>Competitions</h1><p class="sub">Leagues and cups with their names and emblem. <b>In the game as</b> is the competition's name in the option file you installed, the one to open in Edit mode.</p></div><div class="spacer"></div><button data-act="intlSearch">Search international competitions</button><button data-act="go" data-to="compteams">Add or remove teams</button><button class="primary" data-act="addComp">Add competition</button></div>
  ${updateBar('comps')}
  ${comps.length?`<div class="grid g3">${comps.map(c=>`<div class="card"><div class="row" style="align-items:flex-start">${slotThumb(c,'emblem',c.emblem,'lg')}<div style="flex:1;min-width:0"><div style="font:700 20px/1.1 var(--font-display)">${esc(c.name)}</div><div class="muted small">${esc(c.country||'—')} · ${esc(c.type)} · ${esc(c.season||'')}</div><div class="small">In the game as: ${esc(inGameComp(c)||(S.settings.ofPkg?'new competition':'not set'))}</div>${counts[c.id]?`<div class="small">${counts[c.id]} team${counts[c.id]===1?'':'s'}</div>`:''}<div class="small" style="margin-top:4px">${placeTag('comp',c)}</div>${!S.images[c.emblem]&&ofOwnSlot(c,'emblem')?'<div class="small" style="margin-top:4px">'+pesOwnTag('PES default logo')+'</div>':''}${c.worldCup?'<div class="small muted">Always kept, with every national team</div>':''}</div></div>
    <div class="row" style="margin-top:10px"><button class="sm" data-act="editComp" data-id="${c.id}">Edit</button><button class="sm" data-act="openCompTeams" data-id="${c.id}">Teams</button><button class="sm" data-act="aiFillComp" data-id="${c.id}">Claude: fill teams</button>${efAvailable()?`<button class="sm" data-act="compPull" data-id="${c.id}" title="Players, crests, coaches and stadiums from the free sources, in order: FIFA for World Cup teams, eFootball, Transfermarkt, EA SPORTS FC, TheSportsDB, Wikidata. Goes to Process and Review">Pull from free sources</button>`:''}<span class="spacer"></span>${compDelBtn(c)}</div></div>`).join('')}</div>`
  :`<div class="card"><p>No competitions yet. Add one, or let Claude build a whole league from the <a href="#ai">Live Update</a> page.</p></div>`}
  ${counts['']||Object.keys(counts).some(k=>k&&!S.comps[k])?`<p class="muted small" style="margin-top:12px">${teamsArr().filter(t=>!S.comps[t.compId]).length} teams aren't assigned to a competition.</p>`:''}`;
};
function compForm(c){
  return `<div class="mhead"><h2>${S.comps[c.id]?'Edit competition':'Add competition'}</h2></div>
  ${S.comps[c.id]?'':`<label class="f">Start from a template<select data-ch="compTpl"><option value="">Choose…</option>${COMP_TEMPLATES.map((t,i)=>`<option value="${i}">${esc(t[0])} (${esc(t[1])})</option>`).join('')}</select></label><div style="height:10px"></div>`}
  <div class="form" id="cf">
    <label class="f">Name<input data-k="name" type="text" value="${esc(c.name)}"></label>
    <label class="f">Short name<input data-k="short" type="text" maxlength="12" value="${esc(c.short)}"></label>
    ${S.settings.ofPkg?`<label class="f">In the game as<input type="text" readonly value="${esc(inGameComp(c))}" placeholder="not in the option file: a new competition"></label>`
      :`<label class="f">In-game competition<input data-k="gameSlot" type="text" value="${esc(c.gameSlot)}" placeholder="the competition's name in your game"></label>`}
    <label class="f">In-game competition ID<input data-k="gameId" type="number" min="1" value="${esc(c.gameId||'')}" placeholder="filled from its competition file"></label>
    <label class="f">Country / region<input data-k="country" type="text" value="${esc(c.country)}"></label>
    <label class="f">Type<select data-k="type">${opts(['League','Cup'],c.type)}</select></label>
    <label class="f">Season<input data-k="season" type="text" value="${esc(c.season)}"></label>
  </div>
  ${gameFileNote(compFileInfo(c),'competition')}
  <h3 style="margin-top:14px">Emblem</h3>
  <div class="row">${slotThumb(c,'emblem',c.emblem,'lg')}<button data-act="pickImage" data-kind="comp" data-target="comp:${c.id}">Choose or upload</button>${c.emblem?`<button class="ghost" data-act="clearCompEmblem" data-id="${c.id}">Remove</button>`:''}</div>
  <div class="row end" style="margin-top:16px"><button data-act="close">Cancel</button><button class="primary" data-act="saveCompForm" data-id="${c.id}">Save</button></div>`;
}
ACT.addComp=()=>{S.ui.draftComp=newComp();modal(compForm(S.ui.draftComp))};
ACT.editComp=el=>{S.ui.draftComp=clone(S.comps[el.dataset.id]);modal(compForm(S.ui.draftComp))};
CH.compTpl=el=>{const t=COMP_TEMPLATES[+el.value];if(!t)return;const f=$('#cf');f.querySelector('[data-k=name]').value=t[0];f.querySelector('[data-k=country]').value=t[1];f.querySelector('[data-k=type]').value=t[2];f.querySelector('[data-k=short]').value=t[0].split(' ').map(w=>w[0]).join('').slice(0,4).toUpperCase()};
function readCompForm(){const c=S.ui.draftComp;$$('#cf [data-k]').forEach(i=>c[i.dataset.k]=i.value.trim());return c}
ACT.saveCompForm=()=>{const c=readCompForm();if(!c.name){toast('Give the competition a name','err');return}saveComp(c);closeModal();rerender()};
ACT.clearCompEmblem=()=>{readCompForm();S.ui.draftComp.emblem='';modal(compForm(S.ui.draftComp))};
// Deleting a competition asks what happens to what is filed under it: only the competition (its teams stay, unassigned), or the
// competition with its teams, their players and images. Either way the codes go to the code book first, so the slot, the team
// codes, their image names and the players' codes are free codes on Game codes (rule book, "Free codes").
ACT.delComp=async el=>{const c=S.comps[el.dataset.id];if(!c)return;if(c.worldCup){toast('The World Cup is always kept: it holds every national team in the project.','err');return}
  const T=teamsArr().filter(t=>t.compId===c.id),nP=T.reduce((n,t)=>n+(t.players||[]).length,0);
  const im=new Set();[c,...T].forEach(o=>[o.emblem,o.managerPhoto,o.stadiumImg,...(o.sponsorImgs||[]),...(o.kits||[]).map(k=>k.img)].forEach(x=>{if(x&&S.images[x])im.add(x)}));
  const pl=(n,w)=>n+' '+w+(n===1?'':'s');
  const how=await new Promise(res=>{S.ui.askRes=res;modal(`<div class="mhead"><h2>Delete ${esc(c.name)}</h2></div>
    <p>${T.length?`<b>${esc(c.name)}</b> has ${pl(T.length,'team')} with ${pl(nP,'player')} and ${pl(im.size,'image')}. Delete them along with it?`:`No teams are filed under <b>${esc(c.name)}</b>, so only the competition${im.size?' and its logo are':' is'} deleted.`}</p>
    ${T.length?`<p class="small muted">Teams: ${esc(T.slice(0,30).map(t=>t.name).join(', '))}${T.length>30?' and '+(T.length-30)+' more':''}</p>
    <ul class="small"><li><b>Delete everything</b>: the competition, its teams, their players and their images are deleted from the studio.</li>
    <li><b>Competition only</b>: the competition is deleted; its teams stay with their players and images, in no competition.</li></ul>`:''}
    <p class="small">What is deleted leaves its place in the game free: the competition's slot, the team codes, their image file names and the players' codes become free codes (Game codes → Free codes, and Players) that you can give to others. A snapshot is taken first, so you can restore it.</p>
    <div class="row end"><button data-act="askNo">Cancel</button>${T.length?'<button data-act="codeLoseKeep">Competition only</button>':''}<button class="danger" data-act="codeLoseDel">${T.length?'Delete everything':'Delete'}</button></div>`)});
  if(!how)return;await takeSnapshot('Before deleting '+c.name,true);
  if(+c.gameId)codeRecord('comp',c,true);
  if(how==='del')codeRetire([c],'del');
  else histLabel('Delete competition '+c.name,'Edit',()=>{delete S.comps[c.id];Store.del('comps',c.id);T.forEach(t=>{t.compId='';saveTeam(t)});if(c.emblem)impDropImages([c.emblem]);
    toast(c.name+' deleted'+(T.length?'; its '+pl(T.length,'team')+' stay, in no competition':'')+(+c.gameId?'; its slot is free':''),'ok')});
  rerender()};
ACT.openCompTeams=el=>{S.ui.teamComp=el.dataset.id;S.ui.teamId=null;location.hash='teams'};
ACT.aiFillComp=el=>{const c=S.comps[el.dataset.id];S.ui.aiPrefill={compName:c.name,country:c.country,compId:c.id};location.hash='ai'};

/* ----- competition membership: a league holds each club through team.compId; a cup also lists league clubs in comp.teams ----- */
// a competition's name in a list, with its number of teams only when it has some (a cup's entrants are set by the game
// unless its list is filled in the studio, so 0 means "not listed", not "no teams")
// The game keeps imported images by file name and has little free space (rule book, "Images"): a new image goes in only by
// overwriting a file of the same name. When a club or competition takes over a code (Game codes), its images take the names
// the game already has for that code: those of the option-file club or competition that held it (kept in the studio after it
// lost the code: its original code is its team file's, S.teds[id].tedTeamId, or its competition file's compId).
function codeOrigTeam(code,self){code=+code;if(!code)return null;return teamsArr().find(o=>o!==self&&!o.sameAs&&o.of&&o.of.names&&S.teds[o.id]&&!S.teds[o.id].generated&&+S.teds[o.id].tedTeamId===code)||null}
function codeOrigComp(code,self){code=+code;if(!code)return null;return compsArr().find(o=>o!==self&&o.of&&o.of.ced&&o.of.names&&o.ced&&!o.ced.generated&&+o.ced.compId===code)||null}
// the name (and package path) the game has for a kind of image at this record's code: kind emblem/manager/stadium, sp1-3, kit
// The holder may since have been deleted: then the names come from the code book (settings.codeBook, written when a code is freed).
function codeImgName(o,kind,k){if(!o)return null;
  // an image name given to this file's image on Game codes -> Images comes first
  {const ov=o.id&&(S.settings.imgCodes||{})[imgSlotKey(o,kind,k)];if(ov&&ov.name&&ov.path)return{name:ov.name,path:ov.path,from:ov.from||''}}
  if(!+o.gameId)return null;const isT=Array.isArray(o.players);const Y=isT?codeOrigTeam(o.gameId,o):codeOrigComp(o.gameId,o);let N,P,from;
  if(Y){N=Y.of.names||{};P=Y.of.paths||{};from=Y.name}else{const e=((S.settings.codeBook||{})[isT?'team':'comp']||{})[+o.gameId];if(!e||!e.names||e.fromId===o.id)return null;N=e.names;P=e.paths||{};from=e.from}
  const nm=kind==='kit'?(N.kits||[])[k]:/^sp\d$/.test(kind)?N[kind]:N[kind];const pt=kind==='kit'?(P.kits||[])[k]:/^sp\d$/.test(kind)?(P.sponsors||[])[+kind[2]-1]:P[kind];
  return nm&&pt?{name:nm,path:pt,from}:null}
// the code its own game file was made for (team file's team ID, competition file's code), 0 when it has none
const codeFileId=o=>Array.isArray(o.players)?(S.teds[o.id]&&!S.teds[o.id].generated&&+S.teds[o.id].tedTeamId)||0:(o.ced&&!o.ced.generated&&+o.ced.compId)||0;
// an option-file club or competition given another code than its own file's: it is exported like a new one, its images under
// the names the game has for its new code (rule book, "Free codes"), and its old file is left out
const codeMoved=o=>!!(o&&o.codeSet&&!o.noCode&&+o.gameId&&o.of&&o.of.names&&codeFileId(o)&&codeFileId(o)!==+o.gameId);
const compOptLabel=c=>{const n=compMembers(c).length;return c.name+(n?' ('+n+')':'')};
function compMembers(c){const ids=new Set(c.teams||[]);return teamsArr().filter(t=>t.compId===c.id||(isCupComp(c)&&ids.has(t.id)))}
function teamCups(t){return compsArr().filter(c=>c.id!==t.compId&&isCupComp(c)&&(c.teams||[]).includes(t.id))}
// adding to a league moves the club there; adding to a cup only lists it as a participant and keeps its league
function compAddTeam(c,t){if(isCupComp(c)){if(t.compId===c.id||(c.teams||[]).includes(t.id))return;c.teams=[...(c.teams||[]),t.id];saveComp(c)}else if(t.compId!==c.id){t.compId=c.id;saveTeam(t)}}
function compRemoveTeam(c,t){if(c.worldCup&&isNationalTeam(t))return; // every national team stays in the World Cup
  if((c.teams||[]).includes(t.id)){c.teams=c.teams.filter(x=>x!==t.id);saveComp(c)}if(t.compId===c.id){t.compId='';saveTeam(t)}}

/* ----- page: add and remove teams in a competition ----- */
// the teams the "Add teams" list offers: not yet in the competition, narrowed by the page's filter and search
function ctOthers(c){const st=S.ui.ct,q=norm(st.q),inSet=new Set(compMembers(c).map(t=>t.id));
  return teamsArr().filter(t=>!inSet.has(t.id)&&(!st.from||(st.from==='__none'?!S.comps[t.compId]:t.compId===st.from))&&(!q||norm(t.name).includes(q)||norm(t.short).includes(q)))}
VIEWS.compteams=()=>{const comps=compsArr();const st=S.ui.ct||(S.ui.ct={comp:'',q:'',from:''});if(!S.comps[st.comp])st.comp=comps[0]?comps[0].id:'';const c=S.comps[st.comp];
  const head=`<div class="row"><div><h1>Teams in competitions</h1><p class="sub">Add teams to a competition or take them out. A team has one league, so adding it to a league moves it from its old one. A cup lists league teams as participants and leaves their league as it is.</p></div><span class="spacer"></span><button data-act="go" data-to="competitions">Back to competitions</button></div>`;
  if(!c)return head+`<div class="card"><p>No competitions yet. <a href="#competitions">Add one</a> first.</p></div>`;
  const cup=isCupComp(c);const members=compMembers(c);const others=ctOthers(c);
  const where=t=>S.comps[t.compId]?esc(compName(t.compId)):'<span class="muted">Unassigned</span>';
  const row=(t,btn)=>`<div class="li" style="cursor:default">${slotThumb(t,'emblem',t.emblem)}<div style="min-width:0;flex:1"><div class="nm">${esc(t.name)}</div><div class="meta">${where(t)} · ${(t.players||[]).length} players</div></div>${btn}</div>`;
  return head+`<div class="row" style="margin-bottom:12px"><label class="f" style="flex-direction:row;align-items:center;gap:8px;margin:0">Competition<select data-ch="ctComp">${opts(comps.map(x=>[x.id,x.name+' · '+(isCupComp(x)?'cup':'league')]),c.id)}</select></label></div>
  <div class="grid g2">
   <div class="card"><div class="row"><h3 style="margin:0">In ${esc(c.name)} <span class="muted small">(${members.length})</span></h3><span class="spacer"></span>${efAvailable()&&members.length?`<button class="sm" data-act="compPull" data-id="${c.id}" title="Players, crests, coaches and stadiums from the free sources, in order: FIFA for World Cup teams, eFootball, Transfermarkt, EA SPORTS FC, TheSportsDB, Wikidata. Goes to Process and Review">Pull from free sources</button>`:''}</div>
    <p class="small muted">${cup?'Removing a team takes it out of this cup only; its league stays.':'Removing a team leaves it without a league.'}</p>
    ${c.worldCup?'<p class="small muted">The World Cup always includes every national team in the project, so they can\'t be removed here.</p>':''}
    <div class="list" style="max-height:560px;overflow:auto">${members.map(t=>row(t,c.worldCup&&isNationalTeam(t)?'<span class="small muted">always in</span>':`<button class="sm ghost danger" data-act="ctRemove" data-id="${t.id}">Remove</button>`)).join('')||'<p class="muted small" style="padding:8px">No teams yet.</p>'}</div></div>
   <div class="card"><div class="row"><h3 style="margin:0">Add teams</h3><span class="spacer"></span>${others.length>1?`<button class="sm" data-act="ctAddAll">Add all ${others.length} shown</button>`:''}</div>
    <div class="grid" style="gap:8px;margin:10px 0"><select data-ch="ctFrom" aria-label="Show teams from"><option value="">Teams from all competitions</option>${opts(comps.filter(x=>x.id!==c.id).map(x=>[x.id,x.name]),st.from)}<option value="__none" ${st.from==='__none'?'selected':''}>Unassigned teams</option></select>
     <input type="search" placeholder="Search teams" value="${esc(st.q)}" data-in="ctQ" aria-label="Search teams"></div>
    ${cup?'':'<p class="small muted">A team already in another league moves to this one.</p>'}
    <div class="list" style="max-height:480px;overflow:auto">${others.slice(0,300).map(t=>row(t,`<button class="sm" data-act="ctAdd" data-id="${t.id}">Add</button>`)).join('')||'<p class="muted small" style="padding:8px">No teams match.</p>'}</div>
    ${others.length>300?`<p class="small muted">Showing 300 of ${others.length}. Search to narrow the list.</p>`:''}</div>
  </div>`};
CH.ctComp=el=>{S.ui.ct.comp=el.value;rerender()};
CH.ctFrom=el=>{S.ui.ct.from=el.value;rerender()};
IN.ctQ=el=>{S.ui.ct.q=el.value;clearTimeout(S.ui.ctq);S.ui.ctq=setTimeout(()=>{rerender();const i=$('[data-in=ctQ]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)};
ACT.ctAdd=el=>{const c=S.comps[S.ui.ct.comp],t=S.teams[el.dataset.id];if(!c||!t)return;const from=!isCupComp(c)&&S.comps[t.compId]?compName(t.compId):'';
  compAddTeam(c,t);toast(t.name+' added to '+c.name+(from?' (moved from '+from+')':''),'ok');rerender()};
ACT.ctRemove=el=>{const c=S.comps[S.ui.ct.comp],t=S.teams[el.dataset.id];if(!c||!t)return;compRemoveTeam(c,t);toast(t.name+' removed from '+c.name,'ok');rerender()};
ACT.ctAddAll=async()=>{const c=S.comps[S.ui.ct.comp];if(!c)return;const list=ctOthers(c);
  const moving=isCupComp(c)?0:list.filter(t=>S.comps[t.compId]).length;
  if(!await ask('Add '+list.length+' teams',`Add ${list.length} teams to <b>${esc(c.name)}</b>?${moving?` ${moving} of them move here from their current league.`:''}`,'Add'))return;
  list.forEach(t=>compAddTeam(c,t));toast(list.length+' teams added to '+c.name,'ok');rerender()};

/* ----- a team's competitions, from the team page ----- */
function teamCompBar(t){const lg=S.comps[t.compId];const cups=teamCups(t);
  return `<div class="row small" style="margin-bottom:12px;padding:8px 12px;border-radius:8px;background:var(--panel2);gap:8px;flex-wrap:wrap">
   <span>Competition: ${lg?`<b>${esc(lg.name)}</b>`:'<b style="color:var(--warn)">not assigned</b>'}</span>${cups.length?`<span class="muted">· Cups: ${cups.map(c=>esc(c.name)).join(', ')}</span>`:''}
   <span class="spacer"></span><button class="sm" data-act="teamComp" data-id="${t.id}">${lg?'Change competition…':'Assign to a competition…'}</button></div>`}
ACT.teamComp=el=>{const t=S.teams[el.dataset.id];if(!t)return;
  const leagues=compsArr().filter(c=>!isCupComp(c)||c.id===t.compId);const cups=compsArr().filter(c=>isCupComp(c)&&c.id!==t.compId);
  modal(`<div class="mhead"><h2>Competitions for ${esc(t.name)}</h2></div>
  <label class="f">League<select id="tc-league"><option value="">Unassigned</option>${opts(leagues.map(c=>[c.id,c.name]),t.compId)}</select></label>${csMoveNote(t)}
  ${cups.length?`<h3 style="margin-top:14px">Cups</h3><p class="small muted">Tick the cups this team plays in. Its league stays the same.</p><div class="grid" style="gap:6px">${cups.map(c=>`<label class="c"><input type="checkbox" class="tc-cup" value="${c.id}" ${(c.teams||[]).includes(t.id)?'checked':''}> ${esc(c.name)}</label>`).join('')}</div>`:''}
  <div class="row end" style="margin-top:16px"><button data-act="close">Cancel</button><button class="primary" data-act="teamCompSave" data-id="${t.id}">Save</button></div>`)};
ACT.teamCompSave=el=>{const t=S.teams[el.dataset.id];if(!t)return;const lg=$('#tc-league').value;if(t.compId!==lg){t.compId=lg;saveTeam(t)}
  $$('.tc-cup').forEach(cb=>{const c=S.comps[cb.value];if(!c)return;const isIn=(c.teams||[]).includes(t.id);if(cb.checked&&!isIn)compAddTeam(c,t);else if(!cb.checked&&isIn)compRemoveTeam(c,t)});
  closeModal();toast('Competitions saved for '+t.name,'ok');rerender()};

/* ================= View: Teams ================= */
VIEWS.teams=()=>{
  const q=norm(S.ui.teamQ);let list=teamsArr();
  if(S.ui.teamComp==='__none')list=list.filter(t=>!S.comps[t.compId]);else if(S.ui.teamComp)list=list.filter(t=>t.compId===S.ui.teamComp);
  if(q)list=list.filter(t=>norm(t.name).includes(q)||norm(t.short).includes(q));
  const t=S.teams[S.ui.teamId];
  return `<div class="row"><h1>Teams</h1><span class="spacer"></span><button class="primary" data-act="addTeam">Add team</button></div>
  ${updateBar('teams')}
  <div class="split" style="margin-top:12px">
    <div class="card" style="padding:10px">
      <div class="grid" style="gap:8px;margin-bottom:8px">
        <select data-ch="teamComp" aria-label="Competition filter"><option value="">All competitions</option>${opts(compsArr().map(c=>[c.id,c.name]),S.ui.teamComp)}<option value="__none" ${S.ui.teamComp==='__none'?'selected':''}>Unassigned</option></select>
        <input type="search" placeholder="Search teams" value="${esc(S.ui.teamQ)}" data-in="teamQ" aria-label="Search teams">
      </div>
      <div class="list">${list.map(x=>`<div class="li ${x.id===S.ui.teamId?'on':''}" data-act="selTeam" data-id="${x.id}">${slotThumb(x,'emblem',x.emblem)}<div style="min-width:0"><div class="nm">${esc(x.name)}</div><div class="meta">${esc(x.short)} · ${(x.players||[]).length} players · ${esc(compName(x.compId))}</div><div style="margin-top:3px">${placeTag('team',x)}</div></div></div>`).join('')||'<p class="muted small" style="padding:8px">No teams here yet.</p>'}</div>
    </div>
    <div>${t?teamDetail(t):`<div class="card"><p>Pick a team on the left, or add one. A team holds its details, kits, emblem, manager and players.</p></div>`}</div>
  </div>`;
};
IN.teamQ=el=>{S.ui.teamQ=el.value;clearTimeout(S.ui.tq);S.ui.tq=setTimeout(()=>{rerender();const i=$('[data-in=teamQ]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)};
CH.teamComp=el=>{S.ui.teamComp=el.value;rerender()};
ACT.selTeam=el=>{S.ui.teamId=el.dataset.id;rerender()};
ACT.addTeam=async()=>{const name=await inputDialog('Add team','Team name');if(!name)return;const t=newTeam({name:name.trim(),short:shortName(name),compId:S.comps[S.ui.teamComp]?S.ui.teamComp:''});saveTeam(t);S.ui.teamId=t.id;S.ui.teamTab='info';rerender()};
function teamDetail(t){
  const tabs=[['squad','Players ('+(t.players||[]).length+')'],['info','Team info'],['kits','Kits'],['images','Emblem & manager photo']];
  return `<div class="card">${teamCompBar(t)}<div class="row" style="align-items:center">${slotThumb(t,'emblem',t.emblem,'lg')}<div><div style="font:700 28px/1 var(--font-display)">${esc(t.name)}</div><div class="muted">${esc(t.short)} · ${esc(t.formation)} · ${esc(t.manager&&t.manager.name||'no manager')}</div>
    <div class="row" style="margin-top:6px">${(t.colors||[]).map(c=>`<span class="sw" style="background:${esc(hexOr(c,'#000'))}"></span>`).join('')}</div></div><span class="spacer"></span>
    <button data-act="aiTeam" data-id="${t.id}">Claude: update this team</button>${teamDelBtn(t)}</div>
    <div class="tabs">${tabs.map(([k,l])=>`<button class="${S.ui.teamTab===k?'on':''}" data-act="teamTab" data-tab="${k}">${l}</button>`).join('')}</div>
    ${S.ui.teamTab==='squad'?squadTab(t):S.ui.teamTab==='info'?infoTab(t):S.ui.teamTab==='kits'?kitsTab(t):imagesTab(t)}</div>`;
}
ACT.teamTab=el=>{S.ui.teamTab=el.dataset.tab;rerender()};
ACT.delTeam=async el=>{const t=S.teams[el.dataset.id];if(!await ask('Delete team',`Delete <b>${esc(t.name)}</b> and its ${(t.players||[]).length} players? A snapshot is taken first so you can restore it.`,'Delete',true))return;
  await takeSnapshot('Before deleting '+t.name,true);if(+t.gameId&&!t.sameAs)codeRecord('team',t,true);dropTeam(t);S.ui.teamId=null;rerender()};
// Deleting a team removes every link to it (docs/DATABASE_RULES.md, 7.1): its place in cup lists and its team-file record.
// The team file's blob stays, so undo and snapshots bring the team back with its real file.
function dropTeam(t){const cups=[];compsArr().forEach(c=>{if((c.teams||[]).includes(t.id)){c.teams=c.teams.filter(x=>x!==t.id);cups.push(c.id);saveComp(c)}});
  histDeleteTeam(t,{ted:S.teds[t.id]?clone(S.teds[t.id]):null,cups});if(S.teds[t.id]){delete S.teds[t.id];Store.del('teds',t.id)}
  delete S.teams[t.id];Store.del('teams',t.id)}
ACT.aiTeam=el=>{S.ui.aiPrefill={teamId:el.dataset.id};location.hash='ai'};
function squadTab(t){
  const order={GK:0,CB:1,LB:2,RB:3,DMF:4,CMF:5,LMF:6,RMF:7,AMF:8,LWF:9,RWF:10,SS:11,CF:12};
  const ps=(t.players||[]).slice().sort((a,b)=>order[a.pos]-order[b.pos]||ovr(b)-ovr(a));
  const avg=ps.length?Math.round(ps.slice().sort((a,b)=>ovr(b)-ovr(a)).slice(0,11).reduce((s,p)=>s+ovr(p),0)/Math.min(11,ps.length)):0;
  return `<div class="row" style="margin-bottom:10px"><button class="primary sm" data-act="addPlayer" data-team="${t.id}">Add player</button>${efAvailable()?`<button class="sm" data-act="efTeam" data-id="${t.id}" title="Players, crests, coaches and stadiums from the free sources, in order: FIFA for World Cup teams, eFootball, Transfermarkt, EA SPORTS FC, TheSportsDB, Wikidata. Goes to Process and Review">Pull from free sources</button>`:''}<span class="muted small">Best XI average: ${statHTML(avg||'')}</span><span class="spacer"></span><span class="muted small">Click a player to edit ratings</span></div>
  <div class="tw"><table><thead><tr><th>#</th><th>Name</th><th>Pos</th><th class="num">Age</th><th>Nat.</th><th class="num">OVR</th><th class="num">SPD</th><th class="num">FIN</th><th class="num">PAS</th><th class="num">DRI</th><th class="num">DEF</th><th class="num">PHY</th><th></th></tr></thead><tbody>
  ${ps.map(p=>`<tr class="click" data-act="editPlayer" data-id="${p.id}"><td>${esc(p.number)}</td><td><b>${esc(p.name||'(unnamed)')}</b></td><td>${posHTML(p.pos)}</td><td class="num">${esc(p.age)}</td><td>${esc(p.nat)}</td><td class="num">${statHTML(ovr(p))}</td>
  ${p.pos==='GK'?`<td class="num" colspan="6"><span class="muted small">GK: Reflexes ${esc(p.attrs.gkReflex)} · Reach ${esc(p.attrs.gkReach)} · Awareness ${esc(p.attrs.gkAw)}</span></td>`:['speed','finish','lowPass','drib','defAw','contact'].map(k=>`<td class="num">${statHTML(p.attrs[k])}</td>`).join('')}
  <td><button class="sm ghost" data-act="delPlayer" data-team="${t.id}" data-id="${p.id}" aria-label="Remove ${esc(p.name)}">Remove</button></td></tr>`).join('')||'<tr><td colspan="13" class="muted">No players yet.</td></tr>'}
  </tbody></table></div>`;
}
function infoTab(t){
  const m=t.manager||{};
  return `<div class="form" id="tf">
    <label class="f">Team name<input data-k="name" type="text" value="${esc(t.name)}"></label>
    <label class="f">Short name (3)<input data-k="short" type="text" maxlength="3" value="${esc(t.short)}" title="3 capital letters or digits, shown on the scoreboard in the game"></label>
    <label class="f">Country<input data-k="country" type="text" value="${esc(t.country)}"></label>
    <label class="f">Competition<select data-k="compId"><option value="">Unassigned</option>${opts(compsArr().map(c=>[c.id,c.name]),t.compId)}</select></label>
    <label class="f">Stadium<input data-k="stadium" type="text" value="${esc(t.stadium)}"></label>
    ${S.settings.ofPkg?`<label class="f">In the game as<input type="text" readonly value="${esc(inGameTeam(t))}" placeholder="not in the option file: a new team"></label>`
      :`<label class="f">Replaces in-game team<input data-k="gameSlot" type="text" value="${esc(t.gameSlot||'')}" placeholder="the team's name in your game"></label>`}
    <label class="f">In-game team ID<input type="number" value="${esc(t.gameId||'')}" placeholder="none yet" disabled title="A team's ID is its code: it is set on Game codes, never typed here"><span class="small muted">Set on <a href="#codes">Game codes</a>.</span></label>
    <label class="f">Formation<select data-k="formation">${opts(FORMATIONS,t.formation)}</select></label>
    <label class="f">Team playstyle<select data-k="playstyle">${opts(PLAYSTYLES,t.playstyle)}</select></label>
    <label class="f">Manager<input data-k="manager.name" type="text" value="${esc(m.name)}"></label>
    <label class="f">Manager nationality<input data-k="manager.nat" type="text" value="${esc(m.nat)}"></label>
    <label class="f">Manager age<input data-k="manager.age" type="number" min="25" max="90" value="${esc(m.age)}"></label>
    <label class="f">Colour 1<input data-k="colors.0" type="color" value="${esc(hexOr(t.colors&&t.colors[0],'#1f4fd1'))}"></label>
    <label class="f">Colour 2<input data-k="colors.1" type="color" value="${esc(hexOr(t.colors&&t.colors[1],'#ffffff'))}"></label>
  </div>
  <label class="f" style="margin-top:12px">Notes<textarea data-k="notes" placeholder="Anything to remember for this team">${esc(t.notes)}</textarea></label>
  ${gameFileNote(teamFileInfo(t),'team')}
  <div class="row end" style="margin-top:12px"><span class="muted small">Changes save automatically.</span></div>`;
}
document.addEventListener('change',e=>{const el=e.target;if(!el.closest||!el.closest('#tf')||!el.dataset.k)return;const t=S.teams[S.ui.teamId];if(!t)return;
  let v=el.value;const k=el.dataset.k;if(k.startsWith('colors.')){t.colors=t.colors||['#000000','#ffffff'];t.colors[+k.split('.')[1]]=v}else{if(NUMERIC.has(k))v=v===''?'':+v;if(k==='short'){v=shortClean(v).slice(0,3);el.value=v}setP(t,k,v)}
  saveTeam(t);if(['name','compId','short'].includes(k))rerender()});
function kitsTab(t){const own=OF_KIT_SLOT.filter((s,i)=>{const k=(t.kits||[]).find(z=>z.slot===s);return !(k&&S.images[k.img])&&ofOwnSlot(t,'kit:'+i)});
  return `${own.length?`<p class="small" style="margin:0 0 8px">${pesOwnTag()} The option file names no kit texture for ${esc(own.join(', '))}, so PES 2021 shows the game's own kit${own.length>1?'s':''} there. Add a kit and choose a texture to replace one.</p>`:''}<p class="small muted">Kit textures import as <b>Strip</b> images (PNG, up to 2048×2048). Colours, collar and sponsor are noted on the Update Sheet so you can match the in-game kit settings.</p>
  <div class="grid g2">${(t.kits||[]).map((k,i)=>`<div class="card"><div class="row"><h3 style="margin:0">${esc(k.slot)}</h3><span class="spacer"></span><button class="sm ghost danger" data-act="delKit" data-i="${i}">Remove</button></div>
    <div class="row" style="margin:10px 0">${slotThumb(t,'kit:'+OF_KIT_SLOT.indexOf(k.slot),k.img,'lg')}<div class="grid" style="gap:6px"><button class="sm" data-act="pickImage" data-kind="kit" data-target="kit:${t.id}:${i}">Texture: choose or upload</button>${k.img?`<button class="sm ghost" data-act="clearKitImg" data-i="${i}">Remove texture</button>`:''}<button class="sm" data-act="openKitDesigner" data-team="${t.id}" data-i="${i}">Open in kit designer</button></div></div>${!S.images[k.img]&&ofOwnSlot(t,'kit:'+OF_KIT_SLOT.indexOf(k.slot))?pesOwnNote('kit texture'):''}
    <div class="form kitf" data-i="${i}">
      <label class="f">Slot<select data-k="slot">${opts(KIT_SLOTS,k.slot)}</select></label>
      <label class="f">Shirt<input type="color" data-k="shirt" value="${esc(hexOr(k.shirt,'#ffffff'))}"></label>
      <label class="f">Shirt 2nd<input type="color" data-k="second" value="${esc(hexOr(k.second,'#ffffff'))}"></label>
      <label class="f">Shorts<input type="color" data-k="shorts" value="${esc(hexOr(k.shorts,'#ffffff'))}"></label>
      <label class="f">Socks<input type="color" data-k="socks" value="${esc(hexOr(k.socks,'#ffffff'))}"></label>
      <label class="f">Numbers<input type="color" data-k="numberColor" value="${esc(hexOr(k.numberColor,'#111111'))}"></label>
      <label class="f">Collar<select data-k="collar">${opts(COLLARS,k.collar)}</select></label>
      <label class="f">Sponsor<input type="text" data-k="sponsor" value="${esc(k.sponsor)}"></label>
    </div></div>`).join('')}</div>
  <div class="row" style="margin-top:12px"><button data-act="addKit">Add kit</button></div>`;
}
document.addEventListener('change',e=>{const el=e.target;const f=el.closest&&el.closest('.kitf');if(!f||!el.dataset.k)return;const t=S.teams[S.ui.teamId];const k=t&&t.kits[+f.dataset.i];if(!k)return;k[el.dataset.k]=el.value;saveTeam(t)});
ACT.addKit=()=>{const t=S.teams[S.ui.teamId];const used=t.kits.map(k=>k.slot);t.kits.push(newKit(KIT_SLOTS.find(s=>!used.includes(s))||'3rd'));saveTeam(t);rerender()};
ACT.delKit=el=>{const t=S.teams[S.ui.teamId];t.kits.splice(+el.dataset.i,1);saveTeam(t);rerender()};
ACT.clearKitImg=el=>{const t=S.teams[S.ui.teamId];t.kits[+el.dataset.i].img='';saveTeam(t);rerender()};
function imagesTab(t){
  return `<div class="grid g2">
   <div class="card"><h3>Team emblem</h3><div class="row">${slotThumb(t,'emblem',t.emblem,'lg')}<div class="grid" style="gap:6px">
     <button class="sm" data-act="pickImage" data-kind="emblem" data-target="emblem:${t.id}">Choose or upload</button>
     <button class="sm" data-act="emblemFor" data-team="${t.id}">Design in emblem maker</button>
     <button class="sm" data-act="aiCrest" data-team="${t.id}">Claude: design an original crest</button>
     ${t.emblem?`<button class="sm ghost" data-act="clearTeamImg" data-k="emblem">Remove</button>`:''}</div></div>
     ${!S.images[t.emblem]&&ofOwnSlot(t,'emblem')?pesOwnNote('crest'):''}<p class="small muted">Imports as <b>Team Emblem</b>, ${S.settings.sizes.emblem}×${S.settings.sizes.emblem} PNG with transparency.</p></div>
   <div class="card"><h3>Manager photo</h3><div class="row">${slotThumb(t,'manager',t.managerPhoto,'lg')}<div class="grid" style="gap:6px">
     <button class="sm" data-act="pickImage" data-kind="manager" data-target="manager:${t.id}">Choose or upload</button>${t.managerPhoto?`<button class="sm ghost" data-act="clearTeamImg" data-k="managerPhoto">Remove</button>`:''}</div></div>
     ${!S.images[t.managerPhoto]&&ofOwnSlot(t,'manager')?pesOwnNote('manager photo'):''}<p class="small muted">Use a photo you have the rights to; it's cropped square to ${S.settings.sizes.manager}×${S.settings.sizes.manager}.</p></div></div>`;
}
ACT.clearTeamImg=el=>{const t=S.teams[S.ui.teamId];t[el.dataset.k]='';saveTeam(t);rerender()};

/* ================= Player editor ================= */
ACT.addPlayer=el=>{const t=S.teams[el.dataset.team];const p=newPlayer({name:''});S.ui.edit={teamId:t.id,p,isNew:true};openPlayerModal()};
ACT.editPlayer=el=>{const f=findPlayer(el.dataset.id);if(!f)return;S.ui.edit={teamId:f.t.id,p:clone(f.p),isNew:false};openPlayerModal()};
ACT.delPlayer=async(el,e)=>{e.stopPropagation();const t=S.teams[el.dataset.team];const p=t.players.find(x=>x.id===el.dataset.id);if(!await ask('Remove player',`Remove <b>${esc(p.name)}</b> from ${esc(t.name)}?`,'Remove',true))return;t.players=t.players.filter(x=>x.id!==p.id);saveTeam(t);rerender()};
function openPlayerModal(){
  const {p,teamId,isNew}=S.ui.edit;const base=dataFor('baseline');let bp=null;
  if(base)Object.values(base.teams||{}).forEach(t=>(t.players||[]).forEach(x=>{if(x.id===p.id)bp=x}));
  const delta=(k)=>{if(!bp)return'';const d=(+p.attrs[k])-(+bp.attrs[k]);return d?`<span class="${d>0?'up':'down'} small" title="vs baseline">${d>0?'+':''}${d}</span>`:''};
  const grp=g=>ATTRS.filter(a=>a[2]===g).map(([k,l])=>`<div class="attr"><span>${l} ${delta(k)}</span><input type="range" min="40" max="99" value="${p.attrs[k]}" data-in="attrRange" data-k="${k}" aria-label="${l}"><input type="number" min="40" max="99" value="${p.attrs[k]}" data-in="attrNum" data-k="${k}" aria-label="${l} value"></div>`).join('');
  modal(`<div class="mhead"><h2>${isNew?'New player':esc(p.name)}</h2><span class="stat ${statCls(ovr(p))}" id="pe-ovr" style="font-size:20px">${ovr(p)}</span><span class="muted small">OVR (estimate)</span><span class="spacer"></span>
    <select id="pe-team" aria-label="Team">${opts(teamsArr().map(t=>[t.id,t.name]),teamId)}</select></div>
  <div id="pe">
  <div class="form">
    <label class="f">Name<input data-p="name" type="text" value="${esc(p.name)}"></label>
    <label class="f">Shirt name<input data-p="shirtName" type="text" value="${esc(p.shirtName)}"></label>
    <label class="f">Kit no.<input data-p="number" type="number" min="1" max="99" value="${esc(p.number)}"></label>
    <label class="f">Position<select data-p="pos" data-in="peOvr">${opts(POS,p.pos)}</select></label>
    <label class="f">Age<input data-p="age" type="number" min="15" max="50" value="${esc(p.age)}"></label>
    <label class="f">Nationality<input data-p="nat" type="text" value="${esc(p.nat)}"></label>
    <label class="f">Height cm<input data-p="height" type="number" min="150" max="210" value="${esc(p.height)}"></label>
    <label class="f">Weight kg<input data-p="weight" type="number" min="50" max="110" value="${esc(p.weight)}"></label>
    <label class="f">Foot<select data-p="foot">${opts([['R','Right'],['L','Left']],p.foot)}</select></label>
    <label class="f">Playing style<select data-p="style">${opts(STYLES,p.style)}</select></label>
    <label class="f">Weak foot usage<select data-p="wfUsage">${opts([1,2,3,4],p.wfUsage)}</select></label>
    <label class="f">Weak foot accuracy<select data-p="wfAcc">${opts([1,2,3,4],p.wfAcc)}</select></label>
    <label class="f">Form (1–8)<select data-p="form">${opts([1,2,3,4,5,6,7,8],p.form)}</select></label>
    <label class="f">Injury resistance<select data-p="injury">${opts([1,2,3],p.injury)}</select></label>
    <label class="f">Overall override<input data-p="ovrOverride" type="number" min="40" max="99" value="${esc(p.ovrOverride)}" placeholder="auto" data-in="peOvr"></label>
  </div>
  <div class="grid g2" style="margin-top:16px">${Object.keys(GROUPS).map(g=>`<div><h3>${GROUPS[g]}</h3><div class="grid" style="gap:4px">${grp(g)}</div></div>`).join('')}</div>
  <h3 style="margin-top:16px">Playable positions</h3>
  <div class="posgrid">${POS.map(x=>`<label>${x}<select data-pl="${x}" ${x===p.pos?'disabled':''}>${opts([['','–'],['C','C'],['B','B'],['A','A']],x===p.pos?'A':(p.playables[x]||''))}</select></label>`).join('')}</div>
  <h3 style="margin-top:16px">Player skills</h3><div>${SKILLS.map(s=>`<label class="chip ${p.skills.includes(s)?'on':''}"><input type="checkbox" data-sk="${esc(s)}" ${p.skills.includes(s)?'checked':''}>${esc(s)}</label>`).join('')}</div>
  <h3 style="margin-top:12px">COM playing styles</h3><div>${COM.map(s=>`<label class="chip ${p.comStyles.includes(s)?'on':''}"><input type="checkbox" data-cs="${esc(s)}" ${p.comStyles.includes(s)?'checked':''}>${esc(s)}</label>`).join('')}</div>
  </div>
  <div class="row end" style="margin-top:16px">${isNew?'':'<button data-act="aiOnePlayer">Claude: refresh this player</button>'}<button data-act="peCopy" title="Copy this player's abilities, playing style, weak foot, form, playable positions, skills and COM styles">Copy abilities</button><button data-act="pePaste" ${S.ui.peClip?'':'disabled'} title="${S.ui.peClip?'Put the abilities copied from '+esc(S.ui.peClip.from)+' on this player. Nothing is saved until you press Save player.':'Copy the abilities of another player first'}">Paste abilities${S.ui.peClip?' ('+esc(S.ui.peClip.from)+')':''}</button><span class="spacer"></span>${isNew||((S.teams[teamId]||{}).players||[]).length<2?'':'<button data-act="peStep" data-d="-1" title="Save this player if you changed him, then open the player before him in the squad">‹ Save &amp; previous</button><button data-act="peStep" data-d="1" title="Save this player if you changed him, then open the next player in the squad">Save &amp; next ›</button>'}<button data-act="close">Cancel</button><button class="primary" data-act="savePlayer">Save player</button></div>`,true);
}
function readPlayerForm(){
  const p=S.ui.edit.p;$$('#pe [data-p]').forEach(i=>{let v=i.value;if(NUMERIC.has(i.dataset.p)||['wfUsage','wfAcc','form','injury'].includes(i.dataset.p))v=v===''?'':+v;p[i.dataset.p]=v});
  $$('#pe [data-in=attrNum]').forEach(i=>p.attrs[i.dataset.k]=+i.value);
  p.playables={};$$('#pe [data-pl]').forEach(s=>{if(s.value&&!s.disabled)p.playables[s.dataset.pl]=s.value});
  p.skills=$$('#pe [data-sk]').filter(c=>c.checked).map(c=>c.dataset.sk);p.comStyles=$$('#pe [data-cs]').filter(c=>c.checked).map(c=>c.dataset.cs);
  return normPlayer(p);
}
IN.attrRange=el=>{const n=el.parentNode.querySelector('[data-in=attrNum]');n.value=el.value;IN.peOvr()};
IN.attrNum=el=>{const r=el.parentNode.querySelector('[data-in=attrRange]');r.value=el.value;IN.peOvr()};
IN.peOvr=()=>{const p=clone(S.ui.edit.p);$$('#pe [data-in=attrNum]').forEach(i=>p.attrs[i.dataset.k]=+i.value);p.pos=$('#pe [data-p=pos]').value;const o=$('#pe [data-p=ovrOverride]').value;p.ovrOverride=o;const v=ovr(p);const b=$('#pe-ovr');b.textContent=v;b.className='stat '+statCls(v)};
document.addEventListener('change',e=>{const el=e.target;if(el.dataset&&(el.dataset.sk||el.dataset.cs))el.parentNode.classList.toggle('on',el.checked);if(el.closest&&el.closest('#pe')&&el.dataset.p==='pos')IN.peOvr()});
// Save & previous / Save & next: work down a squad without closing the editor. The player is saved only when something in the
// form differs from what is stored; a player moved to another team in the form is saved the usual way and the editor closes.
ACT.peStep=el=>{const {teamId,isNew}=S.ui.edit;if(isNew)return;if($('#pe-team').value!==teamId){ACT.savePlayer();return}
  const p=readPlayerForm();if(!p.name){toast('Enter the player name','err');return}const t=S.teams[teamId];if(!t)return;const i=t.players.findIndex(x=>x.id===p.id);if(i<0)return;
  const changed=JSON.stringify(normPlayer(clone(t.players[i])))!==JSON.stringify(p);if(changed){t.players[i]=p;saveTeam(t);rerender()}
  const n=t.players[(i+(+el.dataset.d||1)+t.players.length)%t.players.length];S.ui.edit={teamId,p:clone(n),isNew:false};openPlayerModal();if(changed)toast('Saved '+p.name,'ok')};
// Copy / paste abilities between players: everything that makes a player play the way he does (abilities, playing style, weak
// foot, form, injury resistance, playable positions, skills, COM styles), never who he is (name, number, position, age, body,
// game ID). Paste fills the open form only; Save player writes it, like any other edit. The copy lasts until the page is closed.
const PE_CLIP_FIELDS=['style','wfUsage','wfAcc','form','injury'];
ACT.peCopy=()=>{const p=clone(readPlayerForm());S.ui.peClip={from:p.name||'a player',attrs:clone(p.attrs),playables:clone(p.playables||{}),skills:[...(p.skills||[])],comStyles:[...(p.comStyles||[])]};
  PE_CLIP_FIELDS.forEach(k=>S.ui.peClip[k]=p[k]);openPlayerModal();toast('Copied the abilities of '+S.ui.peClip.from+'. Open another player and press Paste abilities.','ok')};
ACT.pePaste=()=>{const c=S.ui.peClip;if(!c)return;const p=readPlayerForm();Object.assign(p.attrs,clone(c.attrs));PE_CLIP_FIELDS.forEach(k=>{if(c[k]!==undefined&&c[k]!=='')p[k]=c[k]});
  p.playables=clone(c.playables);delete p.playables[p.pos];p.skills=[...c.skills];p.comStyles=[...c.comStyles];p.ovrOverride='';S.ui.edit.p=normPlayer(p);openPlayerModal();
  toast('Pasted the abilities of '+c.from+'. Press Save player to keep them.','ok')};
ACT.savePlayer=()=>{
  const p=readPlayerForm();if(!p.name){toast('Enter the player name','err');return}
  const newTeamId=$('#pe-team').value;const {teamId,isNew}=S.ui.edit;
  if(!isNew&&newTeamId!==teamId){const old=S.teams[teamId];old.players=old.players.filter(x=>x.id!==p.id);saveTeam(old)}
  const t=S.teams[newTeamId];const i=t.players.findIndex(x=>x.id===p.id);if(i>=0)t.players[i]=p;else t.players.push(p);saveTeam(t);closeModal();rerender();toast('Saved '+p.name,'ok')};

/* ================= View: Players ================= */
function filteredPlayers(){const f=S.ui.pf;const q=norm(f.q);let rows=allPlayers();
  if(f.team)rows=rows.filter(r=>r.t.id===f.team);if(f.pos)rows=rows.filter(r=>POS_GROUP(r.p.pos)===f.pos||r.p.pos===f.pos);
  if(q)rows=rows.filter(r=>norm(r.p.name).includes(q)||norm(r.p.nat).includes(q));if(f.min)rows=rows.filter(r=>ovr(r.p)>=+f.min);return rows}
VIEWS.players=()=>{
  const f=S.ui.pf;let rows=filteredPlayers();
  const key=f.sort,dir=f.dir;const val=r=>key==='ovr'?ovr(r.p):key==='team'?r.t.name:ATTR_KEYS.includes(key)?r.p.attrs[key]:r.p[key];
  rows.sort((a,b)=>{const x=val(a),y=val(b);return (typeof x==='number'&&typeof y==='number'?x-y:String(x??'').localeCompare(String(y??'')))*dir});
  const shown=rows.slice(0,f.limit);const sel=S.ui.sel;
  const cols=[['name','Name'],['team','Team'],['pos','Pos'],['age','Age'],['ovr','OVR'],['speed','SPD'],['accel','ACC'],['finish','FIN'],['lowPass','PAS'],['drib','DRI'],['ballCtl','BC'],['defAw','DEF'],['contact','PHY'],['stamina','STA']];
  const th=([k,l])=>`<th class="s ${['name','team','pos'].includes(k)?'':'num'}" data-act="pSort" data-k="${k}">${l}${f.sort===k?(f.dir>0?' ▲':' ▼'):''}</th>`;
  return `<h1>Players</h1><p class="sub">Every player across your teams. Sort by any rating, select players for bulk actions, click a row to edit.</p>
  ${updateBar('players')}
  <div class="row" style="margin-bottom:10px">
    <input type="search" placeholder="Name or nationality" value="${esc(f.q)}" data-in="pfQ" aria-label="Search players">
    <select data-ch="pfTeam" aria-label="Team"><option value="">All teams</option>${opts(teamsArr().map(t=>[t.id,t.name]),f.team)}</select>
    <select data-ch="pfPos" aria-label="Position"><option value="">All positions</option>${opts([['GK','Goalkeepers'],['DEF','Defenders'],['MID','Midfielders'],['ATT','Attackers'],...POS.filter(p=>p!=='GK')],f.pos)}</select>
    <select data-ch="pfMin" aria-label="Minimum overall"><option value="">Any OVR</option>${opts([[90,'90+'],[85,'85+'],[80,'80+'],[75,'75+'],[70,'70+']],f.min)}</select>
    <span class="muted small">${rows.length} players</span>
  </div>
  <div class="row" style="margin-bottom:10px"><span class="small"><b>${sel.size}</b> selected</span>${sel.size&&efAvailable()?'<button class="sm" data-act="efSel" title="Details, ratings and game IDs from eFootball, then EA SPORTS FC; goes to Process and Review">Pull from free sources</button>':''}
    <button class="sm" data-act="selAll" ${rows.length?'':'disabled'}>Select all ${rows.length}</button><button class="sm ghost" data-act="selNone" ${sel.size?'':'disabled'}>Clear</button>
    <button class="sm" data-act="bulkAdjust" ${sel.size?'':'disabled'}>Adjust ratings…</button><button class="sm" data-act="bulkMove" ${sel.size?'':'disabled'}>Move to team…</button>
    <button class="sm" data-act="bulkAI" ${sel.size?'':'disabled'}>Claude: refresh ratings</button><button class="sm" data-act="h2hSel" ${sel.size===2?'':'disabled'}>Head-to-head</button><button class="sm danger" data-act="bulkDel" ${sel.size?'':'disabled'}>Remove</button></div>
  <div class="tw"><table><thead><tr><th></th>${cols.map(th).join('')}</tr></thead><tbody>
  ${shown.map(({p,t})=>`<tr class="click" data-act="editPlayer" data-id="${p.id}"><td><input type="checkbox" data-act="selP" data-id="${p.id}" ${sel.has(p.id)?'checked':''} aria-label="Select ${esc(p.name)}"></td><td><b>${esc(p.name)}</b></td><td class="small">${esc(t.short||t.name)}</td><td>${posHTML(p.pos)}</td><td class="num">${esc(p.age)}</td><td class="num">${statHTML(ovr(p))}</td>${['speed','accel','finish','lowPass','drib','ballCtl','defAw','contact','stamina'].map(k=>`<td class="num">${statHTML(p.attrs[k])}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="15" class="muted">No players match.</td></tr>`}
  </tbody></table></div>
  ${rows.length>shown.length?`<div class="row" style="margin-top:10px"><button data-act="pMore">Show ${Math.min(150,rows.length-shown.length)} more</button></div>`:''}`;
};
IN.pfQ=el=>{S.ui.pf.q=el.value;clearTimeout(S.ui.pq);S.ui.pq=setTimeout(()=>{rerender();const i=$('[data-in=pfQ]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)};
CH.pfTeam=el=>{S.ui.pf.team=el.value;rerender()};CH.pfPos=el=>{S.ui.pf.pos=el.value;rerender()};CH.pfMin=el=>{S.ui.pf.min=el.value;rerender()};
ACT.pSort=el=>{const k=el.dataset.k;if(S.ui.pf.sort===k)S.ui.pf.dir*=-1;else{S.ui.pf.sort=k;S.ui.pf.dir=['name','team','pos'].includes(k)?1:-1}rerender()};
ACT.pMore=()=>{S.ui.pf.limit+=150;rerender()};
ACT.selP=(el,e)=>{e.stopPropagation();const id=el.dataset.id;el.checked=!S.ui.sel.has(id);if(el.checked)S.ui.sel.add(id);else S.ui.sel.delete(id);setTimeout(rerender,0)};
ACT.selAll=()=>{const f=S.ui.pf;const q=norm(f.q);allPlayers().filter(r=>(!f.team||r.t.id===f.team)&&(!f.pos||POS_GROUP(r.p.pos)===f.pos||r.p.pos===f.pos)&&(!q||norm(r.p.name).includes(q)||norm(r.p.nat).includes(q))&&(!f.min||ovr(r.p)>=+f.min)).forEach(r=>S.ui.sel.add(r.p.id));rerender()};
ACT.selNone=()=>{S.ui.sel.clear();rerender()};
ACT.bulkAdjust=()=>{modal(`<div class="mhead"><h2>Adjust ratings</h2></div><p class="small">Applies to ${S.ui.sel.size} players. Values stay between 40 and 99. A snapshot is taken first.</p>
  <div class="form"><label class="f">Ratings<select id="ba-g"><option value="all">All outfield + GK ratings</option>${Object.entries(GROUPS).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}${ATTRS.map(a=>`<option value="a:${a[0]}">${a[1]}</option>`).join('')}</select></label>
  <label class="f">Change by<input id="ba-n" type="number" value="1" min="-20" max="20"></label></div>
  <div class="row end" style="margin-top:14px"><button data-act="close">Cancel</button><button class="primary" data-act="bulkAdjustGo">Apply</button></div>`)};
ACT.bulkAdjustGo=async()=>{const g=$('#ba-g').value,n=+$('#ba-n').value||0;closeModal();await takeSnapshot('Before bulk adjust',true);
  const keys=g==='all'?ATTR_KEYS:g.startsWith('a:')?[g.slice(2)]:ATTRS.filter(a=>a[2]===g).map(a=>a[0]);const touched=new Set();
  S.ui.sel.forEach(id=>{const f=findPlayer(id);if(!f)return;keys.forEach(k=>f.p.attrs[k]=clamp(f.p.attrs[k]+n,40,99));touched.add(f.t)});touched.forEach(saveTeam);toast('Adjusted '+S.ui.sel.size+' players','ok');rerender()};
ACT.bulkMove=()=>{modal(`<div class="mhead"><h2>Move ${S.ui.sel.size} players</h2></div><label class="f">To team<select id="bm-t">${opts(teamsArr().map(t=>[t.id,t.name]))}</select></label><div class="row end" style="margin-top:14px"><button data-act="close">Cancel</button><button class="primary" data-act="bulkMoveGo">Move</button></div>`)};
ACT.bulkMoveGo=()=>{const to=S.teams[$('#bm-t').value];closeModal();const touched=new Set([to]);S.ui.sel.forEach(id=>{const f=findPlayer(id);if(!f||f.t.id===to.id)return;f.t.players=f.t.players.filter(x=>x.id!==id);to.players.push(f.p);touched.add(f.t)});touched.forEach(saveTeam);toast('Moved to '+to.name,'ok');rerender()};
ACT.bulkDel=async()=>{if(!await ask('Remove players',`Remove ${S.ui.sel.size} players? A snapshot is taken first.`,'Remove',true))return;await takeSnapshot('Before removing players',true);const touched=new Set();S.ui.sel.forEach(id=>{const f=findPlayer(id);if(!f)return;f.t.players=f.t.players.filter(x=>x.id!==id);touched.add(f.t)});touched.forEach(saveTeam);S.ui.sel.clear();rerender()};
ACT.bulkAI=()=>{S.ui.aiPrefill={players:[...S.ui.sel]};location.hash='ai'};
ACT.h2hSel=()=>{const [a,b]=[...S.ui.sel];S.ui.h2h={a,b,bVer:'current'};location.hash='compare'};

/* ================= Image library & tools ================= */
function loadImage(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('Could not read that image'));i.src=src})}
function canvasBlob(c){return new Promise(r=>c.toBlob(r,'image/png'))}
async function fitToCanvas(img,w,h,mode='contain',bg=null){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');if(bg){x.fillStyle=bg;x.fillRect(0,0,w,h)}
  const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;const s=mode==='cover'?Math.max(w/iw,h/ih):mode==='stretch'?null:Math.min(w/iw,h/ih);
  x.imageSmoothingQuality='high';if(s===null)x.drawImage(img,0,0,w,h);else{const dw=iw*s,dh=ih*s;x.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh)}return c}
function kindSize(kind){const s=S.settings.sizes;return kind==='emblem'?[s.emblem,s.emblem]:kind==='comp'?[s.comp,s.comp]:kind==='kit'?[s.kit,s.kit]:kind==='manager'?[s.manager,s.manager]:null}
async function addImageFromBlob(blob,kind,name,{mode}={}){
  const url=URL.createObjectURL(blob);let img;try{img=await loadImage(url)}finally{}
  const size=kindSize(kind);let out=blob,w=img.naturalWidth,h=img.naturalHeight;
  if(kind==='kit'&&w===h&&w>=64&&w<=2048){const c=await fitToCanvas(img,w,h,'stretch');out=await canvasBlob(c)}
  else if(size){const sq=kind==='manager'?'cover':kind==='kit'?'stretch':'contain';const c=await fitToCanvas(img,size[0],size[1],mode||sq);out=await canvasBlob(c);w=size[0];h=size[1]}
  else if(blob.type!=='image/png'){const c=await fitToCanvas(img,w,h,'stretch');out=await canvasBlob(c)}
  URL.revokeObjectURL(url);
  const ref=await Store.putBlob(out,'image/png');const rec={id:uid(),kind,name:(name||'image').replace(/\.[a-z0-9]+$/i,'').slice(0,60),ref,w,h,size:out.size,createdAt:Date.now()};saveImage(rec);return rec;
}
function assignImage(target,imgId,viaForm){
  const [type,a,b]=target.split(':');
  if(type==='comp'){if(viaForm&&S.ui.draftComp&&S.ui.draftComp.id===a){S.ui.draftComp.emblem=imgId;return'compform'}const c=S.comps[a];if(c){c.emblem=imgId;saveComp(c)}}
  else if(type==='emblem'||type==='manager'){const t=S.teams[a];if(t){t[type==='emblem'?'emblem':'managerPhoto']=imgId;saveTeam(t)}}
  else if(type==='kit'){const t=S.teams[a];if(t&&t.kits[+b]){t.kits[+b].img=imgId;saveTeam(t)}}
  return null;
}
ACT.pickImage=el=>{
  const kind=el.dataset.kind,target=el.dataset.target;if(target.startsWith('comp:'))readCompForm();
  S.ui.pick={kind,target,back:target.startsWith('comp:')?clone(S.ui.draftComp):null};
  const imgs=Object.values(S.images).filter(i=>i.kind===kind).sort((a,b)=>b.createdAt-a.createdAt);
  const sz=kindSize(kind);
  modal(`<div class="mhead"><h2>${esc(IMG_KINDS[kind].label)}</h2></div>
  <div class="card" style="margin-bottom:12px"><label class="f">Upload a new image (PNG, JPG, WebP or SVG)<input type="file" id="pick-file" accept="image/*"></label>
  <p class="small muted" style="margin:6px 0 0">${sz?`It's resized to ${sz[0]}×${sz[1]} PNG ${kind==='kit'?'(kit textures should already use the PES 2021 strip layout)':'with transparent padding'}.`:''}</p></div>
  <h3>Or choose from your library</h3><div class="grid g4">${imgs.map(i=>`<button class="card" style="text-align:left" data-act="pickExisting" data-id="${i.id}"><div class="row">${thumb(i.ref)}<span class="small">${esc(i.name)}<br><span class="muted">${i.w}×${i.h}</span></span></div></button>`).join('')||'<p class="muted small">Nothing here yet.</p>'}</div>
  <div class="row end" style="margin-top:14px"><button data-act="pickCancel">Cancel</button></div>`,true);
  $('#pick-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const rec=await addImageFromBlob(f,kind,f.name);finishPick(rec.id)}catch(err){toast(err.message||'Upload failed','err')}});
};
function finishPick(id){const p=S.ui.pick;S.ui.pick=null;if(p.back)S.ui.draftComp=p.back;const r=assignImage(p.target,id,!!p.back);if(r==='compform')modal(compForm(S.ui.draftComp));else{closeModal();rerender()}}
ACT.pickExisting=el=>finishPick(el.dataset.id);
ACT.pickCancel=()=>{const p=S.ui.pick;S.ui.pick=null;if(p&&p.back){S.ui.draftComp=p.back;modal(compForm(S.ui.draftComp))}else closeModal()};

VIEWS.studio=()=>{
  const nMissing=teamsArr().filter(missCrest).length+compsArr().filter(missLogo).length;
  const tabs=[['library','Image library'],['missing','Missing emblems'+(nMissing?' ('+nMissing+')':'')],['emblem','Emblem maker'],['kit','Kit designer']];
  return `<h1>Logos &amp; kits</h1><p class="sub">Every image is stored as a PNG at the size PES 2021 imports. Assign emblems, competition logos, kit textures and manager photos to your teams, or design new ones here.</p>
  ${artPointerHTML()}
  <div class="tabs">${tabs.map(([k,l])=>`<button class="${S.ui.studioTab===k?'on':''}" data-act="studioTab" data-tab="${k}">${l}</button>`).join('')}</div>
  ${S.ui.studioTab==='library'?libraryTab():S.ui.studioTab==='missing'?missingTab():S.ui.studioTab==='emblem'?emblemTab():kitTab()}`;
};
ACT.studioTab=el=>{S.ui.studioTab=el.dataset.tab;rerender()};
function usage(){const u={};const add=(id,s)=>{if(id)(u[id]=u[id]||[]).push(s)};
  teamsArr().forEach(t=>{add(t.emblem,t.name+' emblem');add(t.managerPhoto,t.name+' manager');(t.kits||[]).forEach(k=>add(k.img,t.name+' '+k.slot))});compsArr().forEach(c=>add(c.emblem,c.name));return u}
function libraryTab(){
  const u=usage();const k=S.ui.libKind;const imgs=Object.values(S.images).filter(i=>i.kind!=='extra'&&(!k||i.kind===k)).sort((a,b)=>b.createdAt-a.createdAt);
  return `<div class="row" style="margin-bottom:12px"><select data-ch="libKind" aria-label="Image type"><option value="">All types</option>${opts(Object.entries(IMG_KINDS).map(([k,v])=>[k,v.label]),k)}</select>
   <span class="spacer"></span><label class="f" style="flex-direction:row;align-items:center;gap:8px">Upload as<select id="up-kind">${opts(Object.entries(IMG_KINDS).filter(([k])=>k!=='kitref').map(([k,v])=>[k,v.label]),k||'emblem')}</select></label>
   <label class="btn" style="display:inline-block"><input type="file" id="lib-up" accept="image/*" multiple style="display:none"><span class="chip on" style="cursor:pointer;padding:6px 12px">Upload images</span></label></div>
  <div class="infobox small" style="margin-bottom:12px">Drop several files at once. Team emblems and competition emblems keep their proportions inside a transparent square; manager photos are cropped to a square; kit textures are scaled to the strip size.</div>
  <div class="grid g3">${imgs.map(i=>{const sz=kindSize(i.kind);const bad=sz&&(i.w!==sz[0]||i.h!==sz[1]);return `<div class="card"><div class="row" style="align-items:flex-start">${thumb(i.ref,'lg')}<div style="min-width:0;flex:1">
    <div style="font-weight:600;word-break:break-word">${esc(i.name)}</div><div class="small muted">${esc(IMG_KINDS[i.kind]?IMG_KINDS[i.kind].label:i.kind)} · ${i.w}×${i.h} · ${kb(i.size||0)}</div>
    ${bad?`<div class="small" style="color:var(--warn)">Size differs from your ${sz[0]}×${sz[1]} setting</div>`:''}
    <div class="small">${u[i.id]?'Used by '+esc(u[i.id].join(', ')):'<span class="muted">Not assigned</span>'}</div></div></div>
    <div class="row" style="margin-top:8px"><button class="sm" data-act="renameImg" data-id="${i.id}">Rename</button>${bad?`<button class="sm" data-act="resizeImg" data-id="${i.id}">Fix size</button>`:''}<button class="sm" data-act="assignImg" data-id="${i.id}">Assign…</button><span class="spacer"></span><button class="sm ghost danger" data-act="delImg" data-id="${i.id}">Delete</button></div></div>`}).join('')||'<p class="muted">No images yet.</p>'}</div>`;
}
CH.libKind=el=>{S.ui.libKind=el.value;rerender()};
document.addEventListener('change',async e=>{if(e.target.id!=='lib-up')return;const kind=$('#up-kind').value;const files=[...e.target.files];let n=0;
  for(const f of files){try{await addImageFromBlob(f,kind,f.name);n++}catch(err){toast(f.name+': '+err.message,'err')}}toast('Added '+n+' image'+(n===1?'':'s'),'ok');rerender()});
ACT.renameImg=async el=>{const i=S.images[el.dataset.id];const v=await inputDialog('Rename image','Name',i.name);if(v){i.name=v.trim().slice(0,60);saveImage(i);rerender()}};
ACT.resizeImg=async el=>{const i=S.images[el.dataset.id];const b=await Store.getBlob(i.ref);const img=await loadImage(URL.createObjectURL(b));const [w,h]=kindSize(i.kind);const c=await fitToCanvas(img,w,h,i.kind==='manager'?'cover':i.kind==='kit'?'stretch':'contain');const out=await canvasBlob(c);
  const old=i.ref;i.ref=await Store.putBlob(out,'image/png');i.w=w;i.h=h;i.size=out.size;saveImage(i);Store.delBlob(old);rerender()};
ACT.delImg=async el=>{const i=S.images[el.dataset.id];const u=usage()[i.id];if(!await ask('Delete image',`Delete <b>${esc(i.name)}</b>?${u?' It is used by '+esc(u.join(', '))+'.':''} Snapshots that reference it will show it as missing.`,'Delete',true))return;
  unlinkImages(new Set([i.id]));delete S.images[i.id];Store.del('images',i.id);Store.delBlob(i.ref);rerender()};
ACT.assignImg=el=>{const i=S.images[el.dataset.id];let targets=[];
  if(i.kind==='comp')targets=compsArr().map(c=>['comp:'+c.id,c.name]);
  else if(i.kind==='emblem')targets=teamsArr().map(t=>['emblem:'+t.id,t.name]);
  else if(i.kind==='manager')targets=teamsArr().map(t=>['manager:'+t.id,t.name+' manager']);
  else if(i.kind==='kit')targets=teamsArr().flatMap(t=>(t.kits||[]).map((k,j)=>['kit:'+t.id+':'+j,t.name+' – '+k.slot]));
  if(!targets.length){toast('Nothing to assign this image type to yet','err');return}
  modal(`<div class="mhead"><h2>Assign ${esc(i.name)}</h2></div><label class="f">Use as<select id="as-t">${opts(targets)}</select></label><div class="row end" style="margin-top:14px"><button data-act="close">Cancel</button><button class="primary" data-act="assignGo" data-id="${i.id}">Assign</button></div>`)};
ACT.assignGo=el=>{assignImage($('#as-t').value,el.dataset.id);closeModal();rerender();toast('Assigned','ok')};

/* ----- Emblem maker ----- */
function defEmblem(t){const c=t&&t.colors||['#1f4fd1','#ffffff'];return{teamId:t?t.id:'',shape:'shield',div:'stripes',c1:hexOr(c[0],'#1f4fd1'),c2:hexOr(c[1],'#ffffff'),c3:'#f0c24b',ring:'#0b111b',text:t?t.short:'FCS',year:'',stars:0,stripes:5}}
ACT.emblemFor=el=>{S.ui.emblem=defEmblem(S.teams[el.dataset.team]);S.ui.studioTab='emblem';location.hash='studio';rerender()};
function emblemTab(){
  const o=S.ui.emblem=S.ui.emblem||defEmblem(S.teams[S.ui.teamId]);
  after.push(drawEmblemPreview);
  return `<div class="grid g2"><div class="card"><div class="form" id="emf">
    <label class="f">For team<select data-e="teamId"><option value="">No team</option>${opts(teamsArr().map(t=>[t.id,t.name]),o.teamId)}</select></label>
    <label class="f">Shape<select data-e="shape">${opts([['shield','Shield'],['round','Roundel'],['classic','Classic badge'],['diamond','Diamond'],['modern','Modern crest']],o.shape)}</select></label>
    <label class="f">Pattern<select data-e="div">${opts([['plain','Plain'],['stripes','Stripes'],['hoops','Hoops'],['halves','Halves'],['quarters','Quarters'],['sash','Sash'],['chevron','Chevron']],o.div)}</select></label>
    <label class="f">Stripes<input type="number" data-e="stripes" min="2" max="11" value="${o.stripes}"></label>
    <label class="f">Main colour<input type="color" data-e="c1" value="${o.c1}"></label>
    <label class="f">Second colour<input type="color" data-e="c2" value="${o.c2}"></label>
    <label class="f">Accent<input type="color" data-e="c3" value="${o.c3}"></label>
    <label class="f">Outline<input type="color" data-e="ring" value="${o.ring}"></label>
    <label class="f">Initials<input type="text" data-e="text" maxlength="4" value="${esc(o.text)}"></label>
    <label class="f">Founded year<input type="text" data-e="year" maxlength="4" value="${esc(o.year)}"></label>
    <label class="f">Stars<input type="number" data-e="stars" min="0" max="5" value="${o.stars}"></label></div>
    <div class="row" style="margin-top:14px"><button class="primary" data-act="saveEmblem">Save to library${o.teamId?' &amp; set as team emblem':''}</button><button data-act="aiCrest" data-team="${esc(o.teamId)}">Claude: design an original crest</button></div></div>
    <div class="canvas-wrap"><canvas id="em-c" width="256" height="256" style="width:256px"></canvas></div></div>`;
}
document.addEventListener('input',e=>{const el=e.target;if(!el.closest||!el.closest('#emf')||!el.dataset.e)return;const o=S.ui.emblem;const k=el.dataset.e;o[k]=['stars','stripes'].includes(k)?+el.value:el.value;
  if(k==='teamId'&&S.teams[el.value]){Object.assign(o,defEmblem(S.teams[el.value]));rerender();return}drawEmblemPreview()});
function emblemPath(x,shape,s){const p=new Path2D();const c=s/2;
  if(shape==='round'){p.arc(c,c,s*0.46,0,Math.PI*2)}
  else if(shape==='diamond'){p.moveTo(c,s*.04);p.lineTo(s*.94,c);p.lineTo(c,s*.96);p.lineTo(s*.06,c);p.closePath()}
  else if(shape==='classic'){p.moveTo(s*.12,s*.08);p.lineTo(s*.88,s*.08);p.lineTo(s*.88,s*.5);p.bezierCurveTo(s*.88,s*.78,s*.62,s*.9,c,s*.97);p.bezierCurveTo(s*.38,s*.9,s*.12,s*.78,s*.12,s*.5);p.closePath()}
  else if(shape==='modern'){p.moveTo(s*.16,s*.06);p.lineTo(s*.84,s*.06);p.quadraticCurveTo(s*.92,s*.06,s*.92,s*.16);p.lineTo(s*.92,s*.62);p.quadraticCurveTo(s*.9,s*.84,c,s*.96);p.quadraticCurveTo(s*.1,s*.84,s*.08,s*.62);p.lineTo(s*.08,s*.16);p.quadraticCurveTo(s*.08,s*.06,s*.16,s*.06);p.closePath()}
  else{p.moveTo(c,s*.04);p.quadraticCurveTo(s*.72,s*.12,s*.92,s*.1);p.lineTo(s*.9,s*.52);p.quadraticCurveTo(s*.86,s*.8,c,s*.97);p.quadraticCurveTo(s*.14,s*.8,s*.1,s*.52);p.lineTo(s*.08,s*.1);p.quadraticCurveTo(s*.28,s*.12,c,s*.04);p.closePath()}
  return p}
function drawEmblem(x,o,s){
  x.clearRect(0,0,s,s);const path=emblemPath(x,o.shape,s);
  x.save();x.clip(path);x.fillStyle=o.c1;x.fillRect(0,0,s,s);x.fillStyle=o.c2;
  const n=clamp(o.stripes||5,2,11);
  if(o.div==='stripes'){const w=s/(n*2-1);for(let i=1;i<n*2-1;i+=2)x.fillRect(i*w,0,w,s)}
  else if(o.div==='hoops'){const h=s/(n*2-1);for(let i=1;i<n*2-1;i+=2)x.fillRect(0,i*h,s,h)}
  else if(o.div==='halves')x.fillRect(s/2,0,s/2,s);
  else if(o.div==='quarters'){x.fillRect(s/2,0,s/2,s/2);x.fillRect(0,s/2,s/2,s/2)}
  else if(o.div==='sash'){x.beginPath();x.moveTo(0,s*.15);x.lineTo(s*.2,0);x.lineTo(s,s*.8);x.lineTo(s*.8,s);x.closePath();x.fill()}
  else if(o.div==='chevron'){x.beginPath();x.moveTo(0,s*.35);x.lineTo(s/2,s*.62);x.lineTo(s,s*.35);x.lineTo(s,s*.5);x.lineTo(s/2,s*.77);x.lineTo(0,s*.5);x.closePath();x.fill()}
  // centre panel for text
  if(o.text){x.fillStyle=o.ring;x.globalAlpha=.85;const r=s*.22;x.beginPath();x.arc(s/2,s*.5,r,0,Math.PI*2);x.fill();x.globalAlpha=1;
    x.strokeStyle=o.c3;x.lineWidth=s*.018;x.stroke();
    x.fillStyle=o.c3;x.textAlign='center';x.textBaseline='middle';const len=o.text.length;x.font=`800 ${s*(len>3?.13:len>2?.16:.2)}px "Barlow Condensed", "Arial Narrow", sans-serif`;x.fillText(o.text.toUpperCase(),s/2,s*.505)}
  x.restore();
  x.lineWidth=s*.035;x.strokeStyle=o.ring;x.stroke(path);x.lineWidth=s*.012;x.strokeStyle=o.c3;x.save();x.translate(s*.035,s*.035);x.scale(.93,.93);x.stroke(emblemPath(x,o.shape,s));x.restore();
  if(o.year){x.fillStyle=o.c3;x.font=`700 ${s*.075}px "Barlow Condensed", sans-serif`;x.textAlign='center';x.fillText(o.year,s/2,s*.8)}
  for(let i=0;i<(o.stars||0);i++){const cx=s/2+(i-(o.stars-1)/2)*s*.08,cy=s*(o.shape==='round'?.18:.15);star(x,cx,cy,s*.03,o.c3)}
}
function star(x,cx,cy,r,col){x.beginPath();for(let i=0;i<10;i++){const a=Math.PI/5*i-Math.PI/2,rr=i%2?r*.45:r;x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}x.closePath();x.fillStyle=col;x.fill()}
function drawEmblemPreview(){const c=$('#em-c');if(!c)return;drawEmblem(c.getContext('2d'),S.ui.emblem,256)}
ACT.saveEmblem=async()=>{const o=S.ui.emblem;const s=S.settings.sizes.emblem;const c=document.createElement('canvas');c.width=c.height=s;drawEmblem(c.getContext('2d'),o,s);const b=await canvasBlob(c);
  const ref=await Store.putBlob(b,'image/png');const t=S.teams[o.teamId];const rec={id:uid(),kind:'emblem',name:(t?t.name:o.text)+' emblem',ref,w:s,h:s,size:b.size,createdAt:Date.now()};saveImage(rec);
  if(t){t.emblem=rec.id;saveTeam(t)}toast('Emblem saved'+(t?' and set for '+t.name:''),'ok');rerender()};

/* ----- Kit designer ----- */
function defKit(t,i){const k=t&&t.kits&&t.kits[i]||newKit('1st');const d=k.design||{};return{teamId:t?t.id:'',i:i||0,pattern:d.pattern||'plain',shirt:hexOr(k.shirt,'#1f4fd1'),second:hexOr(k.second,'#ffffff'),trim:d.trim||hexOr(k.shorts,'#ffffff'),shorts:hexOr(k.shorts,'#ffffff'),socks:hexOr(k.socks,'#ffffff'),numberColor:hexOr(k.numberColor,'#ffffff'),sponsor:k.sponsor||'',sponsorColor:d.sponsorColor||'#ffffff',number:d.number||'10',shirtName:d.shirtName||'PLAYER',collar:k.collar||'Crew neck',n:d.n||5,img:k.img||'',fromTex:!k.design&&!!k.img}}
// a kit from an option file is a texture with no colours of its own: its two main colours become the shirt and pattern colours
async function kitTexColours(o){const im=o&&o.fromTex&&S.images[o.img];if(!im)return;o.fromTex=false;
  try{const img=await loadImage(Store.url(im.ref));const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.drawImage(img,0,0,64,64);
    const d=x.getImageData(0,0,64,64).data;const h=new Map();
    for(let i=0;i<d.length;i+=4){if(d[i+3]<200)continue;const k=(d[i]>>5)<<6|(d[i+1]>>5)<<3|(d[i+2]>>5);const e=h.get(k)||{n:0,r:0,g:0,b:0};e.n++;e.r+=d[i];e.g+=d[i+1];e.b+=d[i+2];h.set(k,e)}
    const top=[...h.values()].sort((a,b)=>b.n-a.n);if(!top.length||S.ui.kit!==o)return;
    const rgb=e=>[e.r/e.n,e.g/e.n,e.b/e.n],hex=e=>'#'+rgb(e).map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
    const far=(a,b)=>{const A=rgb(a),B=rgb(b);return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2])>70};
    o.shirt=hex(top[0]);const sec=top.find(e=>far(e,top[0]));if(sec){o.second=hex(sec);o.trim=hex(sec)}o.sampled=true;if(S.ui.view==='studio')rerender()}catch(e){}}
ACT.openKitDesigner=el=>{S.ui.kit=defKit(S.teams[el.dataset.team],+el.dataset.i);S.ui.studioTab='kit';location.hash='studio';rerender();kitTexColours(S.ui.kit)};
function kitTab(){
  const o=S.ui.kit=S.ui.kit||defKit(S.teams[S.ui.teamId],0);const t=S.teams[o.teamId];
  after.push(drawKitPreview);after.push(kaPaint);if(o.fromTex)setTimeout(()=>kitTexColours(o),0);
  const tex=o.img&&S.images[o.img]?`<div class="card" style="margin-bottom:12px"><div class="row" style="align-items:center;gap:12px">${imgThumb(o.img,'lg')}<div class="small"><b>${t?esc(t.name)+' · '+esc((t.kits[o.i]||{}).slot||''):'This kit'}: its texture</b><br>This is what the game shows. ${o.sampled?'The colours below are taken from it; adjust them, then apply.':'The preview below is drawn from colours only.'} To change the texture itself, use <b>Texture: choose or upload</b> on the team's Kits tab.</div></div></div>`:'';
  return `<div class="infobox small" style="margin-bottom:12px">The designer gives you a front/back preview and the exact colours to set in PES's kit editor. For a full texture in the PES 2021 strip layout, build it in <a href="https://www.pesmaster.com/kit-creator/" target="_blank" rel="noopener">PES Master Kit Creator</a> (2048×2048), then upload it to the kit slot here so it ships in your USB package.</div>
  <div class="grid g2"><div class="card"><div class="form" id="kdf">
    <label class="f">Team<select data-kd="teamId"><option value="">No team</option>${opts(teamsArr().map(x=>[x.id,x.name]),o.teamId)}</select></label>
    <label class="f">Kit<select data-kd="i">${t?opts((t.kits||[]).map((k,i)=>[i,k.slot]),o.i):'<option value="0">1st</option>'}</select></label>
    <label class="f">Pattern<select data-kd="pattern">${opts([['plain','Plain'],['stripes','Stripes'],['pinstripes','Pinstripes'],['hoops','Hoops'],['halves','Halves'],['sash','Sash'],['chevron','Chevron'],['fade','Fade'],['quarters','Quarters']],o.pattern)}</select></label>
    <label class="f">Stripes<input type="number" data-kd="n" min="3" max="15" value="${o.n}"></label>
    <label class="f">Shirt<input type="color" data-kd="shirt" value="${o.shirt}"></label>
    <label class="f">Pattern colour<input type="color" data-kd="second" value="${o.second}"></label>
    <label class="f">Collar &amp; cuffs<input type="color" data-kd="trim" value="${o.trim}"></label>
    <label class="f">Shorts<input type="color" data-kd="shorts" value="${o.shorts}"></label>
    <label class="f">Socks<input type="color" data-kd="socks" value="${o.socks}"></label>
    <label class="f">Numbers &amp; name<input type="color" data-kd="numberColor" value="${o.numberColor}"></label>
    <label class="f">Collar<select data-kd="collar">${opts(COLLARS,o.collar)}</select></label>
    <label class="f">Sponsor text<input type="text" data-kd="sponsor" value="${esc(o.sponsor)}"></label>
    <label class="f">Sponsor colour<input type="color" data-kd="sponsorColor" value="${o.sponsorColor}"></label>
    <label class="f">Preview number<input type="text" data-kd="number" maxlength="2" value="${esc(o.number)}"></label>
    <label class="f">Preview name<input type="text" data-kd="shirtName" maxlength="14" value="${esc(o.shirtName)}"></label></div>
    <div class="row" style="margin-top:14px"><button class="primary" data-act="applyKit" ${t?'':'disabled'}>Apply colours to ${t?esc(t.name)+' '+esc((t.kits[o.i]||{}).slot||''):'team kit'}</button><button data-act="saveKitPreview">Save preview image</button><button data-act="aiKit" ${t?'':'disabled'}>Claude: suggest colours</button></div></div>
    <div><div class="canvas-wrap" style="background:radial-gradient(ellipse at 50% 35%,var(--panel2),var(--panel))"><canvas id="kit-3d" width="560" height="700" tabindex="0" role="img" aria-label="3D player wearing the kit. Drag, or use the left and right arrow keys, to turn him around." style="touch-action:pan-y;cursor:grab;width:min(100%,400px)"></canvas></div>
     <p class="small muted" style="margin:6px 0 12px">Drag with the mouse or a finger to turn the player around. The left and right arrow keys work too.</p>
     ${(()=>{const k=kaKit(o),has=!!(k&&k.img&&S.images[k.img]),mode=KA.key===kaKey(o)&&KA.mode?KA.mode:(has?'image':'colours');
      return `<div class="card" style="margin-bottom:12px"><div class="row"><h3 style="margin:0">Artwork</h3><span class="spacer"></span><label class="c small"><input type="checkbox" data-act="kaGuides" ${KA.guides?'checked':''}> Show the areas</label></div>
      <p class="small muted" style="margin:6px 0 8px">This is the kit's image, as the game uses it. The player above wears it, and changes show on him as you make them. The game adds the name and numbers itself; they are shown on the player only.</p>
      ${has?`<div class="row small" style="gap:14px;margin-bottom:8px"><label class="c"><input type="radio" name="ka-mode" data-act="kaMode" data-v="image" ${mode==='image'?'checked':''}> The kit's saved image</label><label class="c"><input type="radio" name="ka-mode" data-act="kaMode" data-v="colours" ${mode==='colours'?'checked':''}> Start again from the colours</label></div>`:'<p class="small" style="margin:0 0 8px">This kit has no image yet: the artwork is drawn from the colours on the left.</p>'}
      <div class="canvas-wrap"><canvas id="kit-art" width="1024" height="1024" role="img" aria-label="The kit image, with the elements you added" style="width:min(100%,520px);touch-action:none;cursor:move"></canvas></div>
      <div class="row" style="margin-top:10px"><label class="chip on" style="cursor:pointer;padding:7px 14px"><input type="file" id="ka-file" accept="image/*" multiple style="display:none">Add an image…</label><button class="sm" data-act="kaCrest" ${t?'':'disabled'}>Add the team crest</button></div>
      <div id="ka-panel">${kaPanelHTML()}</div>
      <div class="row" style="margin-top:12px"><button class="primary" data-act="kaSave" ${t&&k?'':'disabled'}>Save and replace</button><button data-act="kaExport">Export PNG</button><span class="small muted">Nothing is saved until you press Save and replace.</span></div></div>`})()}
     <div class="canvas-wrap"><canvas id="kit-c" width="900" height="560"></canvas></div></div></div>`;
}
document.addEventListener('input',e=>{const el=e.target;if(!el.closest||!el.closest('#kdf')||!el.dataset.kd)return;const o=S.ui.kit;const k=el.dataset.kd;
  if(k==='teamId'){S.ui.kit=defKit(S.teams[el.value],0);rerender();kitTexColours(S.ui.kit);return}if(k==='i'){S.ui.kit=defKit(S.teams[o.teamId],+el.value);rerender();kitTexColours(S.ui.kit);return}
  o[k]=k==='n'?+el.value:el.value;drawKitPreview()});
function shirtPath(cx,y,s){const p=new Path2D();p.moveTo(cx-38*s,y);p.quadraticCurveTo(cx,y+24*s,cx+38*s,y);p.lineTo(cx+96*s,y+14*s);p.lineTo(cx+146*s,y+78*s);p.lineTo(cx+112*s,y+106*s);p.lineTo(cx+90*s,y+82*s);p.lineTo(cx+90*s,y+262*s);
  p.quadraticCurveTo(cx,y+272*s,cx-90*s,y+262*s);p.lineTo(cx-90*s,y+82*s);p.lineTo(cx-112*s,y+106*s);p.lineTo(cx-146*s,y+78*s);p.lineTo(cx-96*s,y+14*s);p.closePath();return p}
function fillPattern(x,o,X,Y,Wd,H){
  x.fillStyle=o.shirt;x.fillRect(X,Y,Wd,H);x.fillStyle=o.second;const n=clamp(o.n||5,3,15);
  if(o.pattern==='stripes'){const w=Wd/(n*2-1);for(let i=1;i<n*2-1;i+=2)x.fillRect(X+i*w,Y,w,H)}
  else if(o.pattern==='pinstripes'){for(let i=0;i<n*3;i++)x.fillRect(X+(i+.5)*Wd/(n*3),Y,2,H)}
  else if(o.pattern==='hoops'){const h=H/(n*2-1);for(let i=1;i<n*2-1;i+=2)x.fillRect(X,Y+i*h,Wd,h)}
  else if(o.pattern==='halves')x.fillRect(X+Wd/2,Y,Wd/2,H);
  else if(o.pattern==='quarters'){x.fillRect(X+Wd/2,Y,Wd/2,H*.4);x.fillRect(X,Y+H*.4,Wd/2,H*.6)}
  else if(o.pattern==='sash'){x.beginPath();x.moveTo(X+Wd*.15,Y);x.lineTo(X+Wd*.45,Y);x.lineTo(X+Wd*.85,Y+H);x.lineTo(X+Wd*.55,Y+H);x.closePath();x.fill()}
  else if(o.pattern==='chevron'){x.beginPath();x.moveTo(X,Y+H*.18);x.lineTo(X+Wd/2,Y+H*.42);x.lineTo(X+Wd,Y+H*.18);x.lineTo(X+Wd,Y+H*.3);x.lineTo(X+Wd/2,Y+H*.54);x.lineTo(X,Y+H*.3);x.closePath();x.fill()}
  else if(o.pattern==='fade'){const g=x.createLinearGradient(0,Y,0,Y+H);g.addColorStop(0,o.shirt);g.addColorStop(1,o.second);x.fillStyle=g;x.fillRect(X,Y,Wd,H)}
}
function drawKit(x,o,emblemImg){
  const Wc=900,Hc=560;x.clearRect(0,0,Wc,Hc);
  [[225,'FRONT'],[675,'BACK']].forEach(([cx,label],side)=>{
    const y=40,s=1;const p=shirtPath(cx,y,s);x.save();x.clip(p);fillPattern(x,o,cx-150,y,300,280);
    x.fillStyle=o.trim;x.beginPath();x.moveTo(cx+146,y+78);x.lineTo(cx+112,y+106);x.lineTo(cx+104,y+98);x.lineTo(cx+138,y+70);x.closePath();x.fill();
    x.beginPath();x.moveTo(cx-146,y+78);x.lineTo(cx-112,y+106);x.lineTo(cx-104,y+98);x.lineTo(cx-138,y+70);x.closePath();x.fill();x.restore();
    x.lineWidth=2;x.strokeStyle='rgba(0,0,0,.45)';x.stroke(p);
    // collar
    x.lineWidth=8;x.strokeStyle=o.trim;x.beginPath();
    if(o.collar==='V-neck'&&side===0){x.moveTo(cx-38,y);x.lineTo(cx,y+38);x.lineTo(cx+38,y)}else{x.moveTo(cx-38,y);x.quadraticCurveTo(cx,y+(side?10:24),cx+38,y)}x.stroke();
    if(o.collar==='Polo collar'&&side===0){x.fillStyle=o.trim;x.beginPath();x.moveTo(cx-40,y-2);x.lineTo(cx-6,y+22);x.lineTo(cx-30,y+30);x.closePath();x.fill();x.beginPath();x.moveTo(cx+40,y-2);x.lineTo(cx+6,y+22);x.lineTo(cx+30,y+30);x.closePath();x.fill()}
    x.textAlign='center';x.textBaseline='middle';
    if(side===0){
      if(o.sponsor){x.fillStyle=o.sponsorColor;let fs=40;x.font=`800 ${fs}px "Barlow Condensed", sans-serif`;while(x.measureText(o.sponsor.toUpperCase()).width>150&&fs>14){fs-=2;x.font=`800 ${fs}px "Barlow Condensed", sans-serif`}x.fillText(o.sponsor.toUpperCase(),cx,y+150)}
      if(emblemImg)x.drawImage(emblemImg,cx-72,y+62,36,36);else{x.fillStyle=o.trim;x.beginPath();x.arc(cx-54,y+80,14,0,Math.PI*2);x.fill()}
      x.fillStyle=o.numberColor;x.font='700 26px "Barlow Condensed", sans-serif';x.fillText(o.number,cx+54,y+82);
    }else{
      x.fillStyle=o.numberColor;x.font='700 22px "Barlow Condensed", sans-serif';x.fillText(String(o.shirtName||'').toUpperCase(),cx,y+70);
      x.font='800 110px "Barlow Condensed", sans-serif';x.fillText(o.number,cx,y+160);
    }
    // shorts
    const sy=330;x.fillStyle=o.shorts;x.beginPath();x.moveTo(cx-86,sy);x.lineTo(cx+86,sy);x.lineTo(cx+98,sy+110);x.lineTo(cx+8,sy+110);x.lineTo(cx,sy+56);x.lineTo(cx-8,sy+110);x.lineTo(cx-98,sy+110);x.closePath();x.fill();x.strokeStyle='rgba(0,0,0,.4)';x.lineWidth=2;x.stroke();
    x.fillStyle=o.trim;x.fillRect(cx-86,sy,172,8);
    if(side===0){x.fillStyle=o.numberColor;x.font='700 18px "Barlow Condensed", sans-serif';x.fillText(o.number,cx-60,sy+80)}
    // socks
    [cx-50,cx+50].forEach(sx=>{x.fillStyle=o.socks;x.fillRect(sx-16,sy+124,32,74);x.fillStyle=o.trim;x.fillRect(sx-16,sy+124,32,8);x.strokeStyle='rgba(0,0,0,.4)';x.strokeRect(sx-16,sy+124,32,74)});
    x.fillStyle='rgba(230,237,247,.6)';x.font='600 13px Barlow, sans-serif';x.fillText(label,cx,Hc-14);
  });
}
/* ----- Kit designer: a 3D player wearing the kit, turned with the mouse, a finger or the arrow keys -----
   The player is the realistic one below (kpLoad). While he loads, his place shows a loading sign; if he can't be loaded
   (no WebGL, or his files don't arrive) it says so. The old hand-drawn figure is gone (the user, 2026-11-20). */
const K3={yaw:-.55,pitch:.08,o:null,em:null,drag:null,spin:0};
// the loading sign on the placeholder canvas: a turning ring and a line of text, redrawn until the player is ready
function k3Loading(){const c=$('#kit-3d');if(!c)return;const x=c.getContext('2d'),W=c.width,H=c.height,cs=getComputedStyle(document.documentElement);
  const ink=(cs.getPropertyValue('--muted')||'#9aa7b8').trim(),acc=(cs.getPropertyValue('--accent')||'#4da3ff').trim(),bad=KP.st==='failed';
  x.clearRect(0,0,W,H);x.textAlign='center';x.textBaseline='middle';
  if(bad){c.setAttribute('aria-label','The 3D player could not be loaded');x.fillStyle=ink;x.font='600 24px Barlow, sans-serif';x.fillText('The 3D player couldn\'t be loaded',W/2,H/2-16);
    x.font='18px Barlow, sans-serif';x.fillText('Reload the page to try again. The kit image on the right is unaffected.',W/2,H/2+20);return}
  c.setAttribute('aria-label','Loading the 3D player');const t=performance.now()/1000,r=34,cy=H/2-30;
  x.lineWidth=6;x.lineCap='round';x.strokeStyle=ink;x.globalAlpha=.25;x.beginPath();x.arc(W/2,cy,r,0,Math.PI*2);x.stroke();
  x.globalAlpha=1;x.strokeStyle=acc;x.beginPath();x.arc(W/2,cy,r,t*4,t*4+Math.PI*.6);x.stroke();
  x.fillStyle=ink;x.font='600 24px Barlow, sans-serif';x.fillText('Loading the player…',W/2,cy+r+44);
  cancelAnimationFrame(K3.spin);if(KP.st==='loading')K3.spin=requestAnimationFrame(k3Loading)}
function k3Draw(o,em){K3.o=o;K3.em=em;if(!KP.st)kpLoad();try{if(kpAttach()){if(KA.flat&&KA.key===kaKey(o)){kpTextureArt(KA.flat,o);kpRender()}}else k3Loading()}catch(e){console.error(e)}}
const k3Turn=()=>{if(KP.st==='ready'&&KP.cv.isConnected)kpRender()};const k3Cv=()=>$('#kit-3d-gl')||$('#kit-3d');
/* ----- the realistic player: "Sports_Male_02" of the Microsoft Rocketbox avatar library (MIT, assets/player), drawn with
   three.js (vendor/three, loaded only when the Kit designer opens). His shirt, shorts and socks are repainted on his body
   texture from the designer. Until he has loaded his place shows a loading sign (k3Loading). ----- */
const KP={st:'',T:null,r:null,scene:null,cam:null,root:null,cv:null,tex:null,base:null,x:null};
let KP_NUM=[222,138,26];/* the shorts number on his body texture: across, down, size (mid front of the right thigh) */const KP_ARMS=.72;let KP_FOLDS=2.2;// strength of the cloth folds// how far the arms come down from the model's A-pose (radians)
async function kpLoad(){if(KP.st)return;KP.st='loading';
  try{const T=KP.T=await import('../vendor/three/three.module.js');const {FBXLoader}=await import('../vendor/three/FBXLoader.js');
    const cv=KP.cv=document.createElement('canvas');cv.id='kit-3d-gl';cv.tabIndex=0;cv.setAttribute('role','img');
    cv.setAttribute('aria-label','3D player wearing the kit. Drag, or use the left and right arrow keys, to turn him around.');cv.style.cssText='touch-action:pan-y;cursor:grab;width:min(100%,400px);height:auto;aspect-ratio:4/5;display:block';
    const r=KP.r=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true});r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(560,700,false);r.outputColorSpace=T.SRGBColorSpace;
    const scene=KP.scene=new T.Scene();const cam=KP.cam=new T.PerspectiveCamera(26,560/700,.1,50);
    scene.add(new T.HemisphereLight(0xffffff,0x80858f,1.8));const key=new T.DirectionalLight(0xffffff,2);key.position.set(2.4,2.6,3);scene.add(key);
    const rim=new T.DirectionalLight(0xffffff,.7);rim.position.set(-2.2,1.6,-2.4);scene.add(rim);
    // the model names .tga textures that aren't shipped: its two textures are set here instead
    const man=new T.LoadingManager();man.setURLModifier(u=>/\.(tga|png|jpe?g|bmp|dds)$/i.test(u)?'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==':u);
    const [fbx,base,head,folds]=await Promise.all([new FBXLoader(man).loadAsync('assets/player/player.fbx'),loadImage('assets/player/body.jpg'),new T.TextureLoader().loadAsync('assets/player/head.jpg'),new T.TextureLoader().loadAsync('assets/player/body_n.jpg?v=2').catch(()=>null)]);
    KP.base=base;head.colorSpace=T.SRGBColorSpace;
    const c=document.createElement('canvas');c.width=c.height=1024;KP.x=c.getContext('2d');KP.tex=new T.CanvasTexture(c);KP.tex.colorSpace=T.SRGBColorSpace;KP.tex.anisotropy=r.capabilities.getMaxAnisotropy();head.anisotropy=KP.tex.anisotropy;
    fbx.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=false;kpLoose(o);const ms=[].concat(o.material).map(m=>/head/i.test(m.name)?new T.MeshStandardMaterial({map:head,roughness:.7,metalness:0}):new T.MeshStandardMaterial({map:KP.tex,normalMap:folds,normalScale:new T.Vector2(KP_FOLDS,KP_FOLDS),roughness:.82,metalness:0}));o.material=Array.isArray(o.material)?ms:ms[0]});
    // arms down from the A-pose, then stand him on the ground, 1.83 tall, centred
    const bone=n=>{let b=null;fbx.traverse(o=>{if(o.isBone&&o.name===n)b=o});return b};
    fbx.updateMatrixWorld(true);[['Bip01_L_UpperArm',1],['Bip01_R_UpperArm',-1]].forEach(([n,s])=>{const b=bone(n);if(!b)return;const pq=b.parent.getWorldQuaternion(new T.Quaternion()),wq=b.getWorldQuaternion(new T.Quaternion());
      b.quaternion.copy(pq.invert().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-s*KP_ARMS)).multiply(wq))});
    fbx.updateMatrixWorld(true);const box=new T.Box3();fbx.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld))}});
    const k=1.83/(box.max.y-box.min.y);fbx.scale.setScalar(k);fbx.position.set(-(box.min.x+box.max.x)/2*k,-box.min.y*k,-(box.min.z+box.max.z)/2*k);
    const root=KP.root=new T.Group();root.add(fbx);
    const sh=new T.Mesh(new T.CircleGeometry(.5,40),new T.MeshBasicMaterial({color:0,transparent:true,opacity:.28,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.y=.002;root.add(sh);scene.add(root);
    KP.st='ready';if(K3.o)k3Draw(K3.o,K3.em)}
  catch(e){console.error('3D player:',e);KP.st='failed';k3Loading()}}
// The shirt is worn like the library's long-shirted footballer (Sports_Male_03), as the user asked on 2026-11-19: it falls
// straight from the chest and hangs well down over the shorts. This model's own shirt stops at the waistband, so its body
// (found by its place in the body texture; the mesh stands along Z, in centimetres) is drawn out longer and a little looser.
let KP_HEM_IN=.8;let KP_LOOSE=[140,96,3.2,2.6,15];// from this height, to the hem height: centimetres out at the sides, out at front and back, and down
function kpLoose(mesh){const g=mesh.geometry,P=g.attributes.position,U=g.attributes.uv;if(!P||!U)return;const mats=[].concat(mesh.material);const [top,hem,side,fb,drop]=KP_LOOSE;const N=g.attributes.normal;
  if(!g.userData.pos0){g.userData.pos0=P.array.slice();g.userData.nrm0=N?N.array.slice():null}const A=g.userData.pos0,B=g.userData.nrm0;
  (g.groups.length?g.groups:[{start:0,count:P.count,materialIndex:0}]).forEach(gr=>{if(/head/i.test((mats[gr.materialIndex]||{}).name||''))return;
    for(let i=gr.start;i<gr.start+gr.count;i++){const u=U.getX(i)*1024,v=(1-U.getY(i))*1024;const x=A[i*3],y=A[i*3+1],z=A[i*3+2];P.setXYZ(i,x,y,z);
      // the part of the shorts the shirt now covers is drawn in a little, so it never shows through the shirt
      if(v<214&&(u<296||u>729)){const lo=hem-(drop||0)+2;if(z>lo){const w=Math.min(1,(z-lo)/5),yy=y+2,r=Math.hypot(x,yy)||1,d=Math.min(2.2,r*.2)*w;P.setXYZ(i,x-x/r*d,y-yy/r*d,z)}continue}
      if(u<338||u>692||v<60||v>882||z>=top||z<hem-8||(Math.abs(x)>23&&z>118))continue;const t=Math.min(1,(top-z)/(top-hem)),k=t*t*(3-2*t);const yy=y+2,r=Math.hypot(x,yy)||1;
      // looser through the body, then the last part comes back in so the hem lies close to the shorts
      const e=Math.max(0,Math.min(1,(t-.55)/.45)),f=k*(1-KP_HEM_IN*e*e*(3-2*e));P.setXYZ(i,x+x/r*side*f,y+yy/r*fb*f,z-(drop||0)*k);
      // the outside of the shirt keeps facing outwards right down to the hem: the model's smooth shading turned its last
      // rows down towards the lip under the hem, which drew the hem as if it curled in under the waistband
      if(B&&v>112&&v<822&&z<hem+14&&B[i*3+2]<0){const w=Math.min(1,(hem+14-z)/8);let nx=B[i*3],ny=B[i*3+1],nz=B[i*3+2]*(1-w);const l=Math.hypot(nx,ny,nz)||1;N.setXYZ(i,nx/l,ny/l,nz/l)}}});
  P.needsUpdate=true;if(N)N.needsUpdate=true}
/* ----- Kit designer artwork: the kit's image itself (PES 2021 kit layout, 2048 px), edited in place -----
   The artwork starts from the kit's saved image, or is drawn from the designer's colours when the kit has none (or when the
   user chooses to). Imported elements (a sponsor logo, a maker's mark, any image) are layers on top: moved, resized and
   turned on the sheet, and shown on the 3D player as they change. "Save and replace" flattens the artwork into a new kit
   image for the kit; "Export" downloads it. Nothing is stored until then. */
const KA={key:'',mode:'',base:null,imgId:null,flat:null,layers:[],sel:null,guides:true,drag:null,job:0};
const kaKey=o=>o.teamId+':'+o.i;
const kaKit=o=>{const t=S.teams[o.teamId];return t&&t.kits&&t.kits[o.i]||null};
const kaLayer=()=>KA.layers.find(l=>l.id===KA.sel)||null;
async function kaEnsure(o){const job=++KA.job;const key=kaKey(o),k=kaKit(o),has=!!(k&&k.img&&S.images[k.img]);
  if(KA.key!==key){KA.key=key;KA.layers=[];KA.sel=null;KA.mode=has?'image':'colours';KA.base=null;KA.imgId=null}
  if(KA.mode==='image'&&!has)KA.mode='colours';
  try{
    if(KA.mode==='image'){if(!KA.base||KA.imgId!==k.img){const b=await Store.getBlob(S.images[k.img].ref);if(job!==KA.job)return;if(!b)throw new Error('the kit image could not be read');
        const u=URL.createObjectURL(b);let im;try{im=await loadImage(u)}finally{URL.revokeObjectURL(u)}if(job!==KA.job)return;
        const c=document.createElement('canvas');c.width=c.height=2048;c.getContext('2d').drawImage(im,0,0,2048,2048);KA.base=c;KA.imgId=k.img}}
    else{const c=await kitTextureCanvas(S.teams[o.teamId],{shirt:o.shirt,second:o.second,shorts:o.shorts,socks:o.socks,sponsor:o.sponsor,numberColor:o.numberColor,design:{pattern:o.pattern,n:o.n,trim:o.trim,sponsorColor:o.sponsorColor}});if(job!==KA.job)return;KA.base=c;KA.imgId=null}
  }catch(e){if(job!==KA.job)return;console.error(e);if(KA.mode==='image'){KA.mode='colours';toast('The kit image could not be opened: '+e.message+'. Showing the colours instead.','err');return kaEnsure(o)}}
  kaCompose()}
// base + layers -> the flat artwork, then the sheet and the 3D player are redrawn
function kaCompose(){if(!KA.base)return;const c=KA.flat||(KA.flat=document.createElement('canvas'));if(c.width!==2048)c.width=c.height=2048;const x=c.getContext('2d');
  x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.clearRect(0,0,2048,2048);x.drawImage(KA.base,0,0,2048,2048);x.imageSmoothingQuality='high';
  KA.layers.forEach(L=>{x.save();x.translate(L.x,L.y);x.rotate(L.rot*Math.PI/180);x.globalAlpha=L.alpha;x.drawImage(L.img,-L.w/2,-L.h/2,L.w,L.h);x.restore()});
  kaPaint();if(K3.o)k3Draw(K3.o,K3.em)}
const KA_AREAS=[['back','Back'],['front','Front'],['sleeveL','Short sleeve'],['sleeveR','Short sleeve'],['longL','Long sleeve'],['longR','Long sleeve'],['socksL','Sock'],['socksR','Sock'],['shortsL','Shorts, left'],['shortsR','Shorts, right'],['hem','Bottom of the shirt'],['captain','Captain']];
function kaPaint(){const c=$('#kit-art');if(!c||!KA.flat)return;const x=c.getContext('2d'),s=c.width/2048;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,c.width,c.height);x.drawImage(KA.flat,0,0,c.width,c.height);
  if(KA.guides){x.lineWidth=1.5;x.font='600 13px Barlow, sans-serif';x.textBaseline='top';KA_AREAS.forEach(([r,l])=>{const [X,Y,W,H]=KIT_UV[r];x.strokeStyle='rgba(0,0,0,.55)';x.setLineDash([6,4]);x.strokeRect(X*s+.5,Y*s+.5,W*s,H*s);x.strokeStyle='rgba(255,255,255,.8)';x.lineDashOffset=5;x.strokeRect(X*s+.5,Y*s+.5,W*s,H*s);x.lineDashOffset=0;x.setLineDash([]);
      const tw=x.measureText(l).width;x.fillStyle='rgba(0,0,0,.6)';x.fillRect(X*s+4,Y*s+4,tw+8,18);x.fillStyle='#fff';x.fillText(l,X*s+8,Y*s+6)})}
  const L=kaLayer();if(L){x.save();x.translate(L.x*s,L.y*s);x.rotate(L.rot*Math.PI/180);x.strokeStyle='#3ea6ff';x.lineWidth=2;x.strokeRect(-L.w*s/2,-L.h*s/2,L.w*s,L.h*s);x.fillStyle='#3ea6ff';x.fillRect(L.w*s/2-7,L.h*s/2-7,14,14);x.restore()}}
// the selected element's controls (drawn without redrawing the page, so the canvases stay)
function kaPanelHTML(){const L=kaLayer();if(!KA.layers.length)return '<p class="small muted" style="margin:8px 0 0">No added elements yet. Add a sponsor logo, a maker\'s mark or any image, then drag it into place on the sheet.</p>';
  return `<div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">${KA.layers.map(l=>`<button type="button" class="chip ${l.id===KA.sel?'on':''}" data-act="kaSel" data-id="${l.id}">${esc(l.name)}</button>`).join('')}</div>
  ${L?`<div class="grid g2" style="gap:8px;margin-top:8px"><label class="f">Size<input type="range" min="20" max="1400" value="${Math.round(L.w)}" data-in="kaL" data-k="w" aria-label="Size of ${esc(L.name)}"></label>
    <label class="f">Turn<input type="range" min="-180" max="180" value="${L.rot}" data-in="kaL" data-k="rot" aria-label="Turn ${esc(L.name)}"></label>
    <label class="f">See-through<input type="range" min="10" max="100" value="${Math.round(L.alpha*100)}" data-in="kaL" data-k="alpha" aria-label="Opacity of ${esc(L.name)}"></label>
    <div class="row" style="align-items:end;gap:6px"><button class="sm" data-act="kaPut" data-to="front">Centre on front</button><button class="sm" data-act="kaPut" data-to="back">On back</button><button class="sm ghost" data-act="kaTop">Bring to top</button><button class="sm ghost danger" data-act="kaDel">Remove</button></div></div>`
    :'<p class="small muted" style="margin:8px 0 0">Tap an element on the sheet, or its name above, to move, resize or turn it.</p>'}`}
function kaPanel(){const p=$('#ka-panel');if(p)p.innerHTML=kaPanelHTML()}
function kaAdd(img,name,at){const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;const w=Math.min(300,iw)||200;const [X,Y,W,H]=KIT_UV[at||'front'];
  const L={id:uid(),img,name:String(name||'image').replace(/\.[a-z0-9]+$/i,'').slice(0,24),x:X+W/2,y:Y+H*.3,w,h:w*ih/iw,rot:0,alpha:1,ar:ih/iw};KA.layers.push(L);KA.sel=L.id;kaCompose();kaPanel()}
document.addEventListener('change',async e=>{if(!e.target||e.target.id!=='ka-file')return;const fs=[...e.target.files];e.target.value='';
  for(const f of fs){try{const u=URL.createObjectURL(f);const im=await loadImage(u);kaAdd(im,f.name)}catch(err){toast(f.name+' could not be read as an image','err')}}});
ACT.kaCrest=async()=>{const o=S.ui.kit,t=o&&S.teams[o.teamId];const em=t&&await kitCrest(t);if(!em){toast('This team has no crest image yet','err');return}kaAdd(em,'Crest')};
ACT.kaSel=el=>{KA.sel=el.dataset.id;kaPaint();kaPanel()};
ACT.kaDel=()=>{KA.layers=KA.layers.filter(l=>l.id!==KA.sel);KA.sel=null;kaCompose();kaPanel()};
ACT.kaTop=()=>{const L=kaLayer();if(!L)return;KA.layers=KA.layers.filter(l=>l!==L).concat(L);kaCompose();kaPanel()};
ACT.kaPut=el=>{const L=kaLayer();if(!L)return;const [X,Y,W,H]=KIT_UV[el.dataset.to];L.x=X+W/2;L.y=el.dataset.to==='back'?Y+H*.55:Y+H*.3;L.rot=el.dataset.to==='back'?180:0;kaCompose();kaPanel()};
ACT.kaGuides=el=>{KA.guides=el.checked;kaPaint()};
ACT.kaMode=el=>{KA.mode=el.dataset.v;KA.base=null;KA.imgId=null;if(S.ui.kit)kaEnsure(S.ui.kit)};
IN.kaL=el=>{const L=kaLayer();if(!L)return;const k=el.dataset.k,v=+el.value;if(k==='w'){L.w=v;L.h=v*L.ar}else if(k==='rot')L.rot=v;else L.alpha=v/100;kaCompose()};
// dragging on the sheet: an element moves; its corner handle resizes it
const kaPt=(c,e)=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)/r.width*2048,(e.clientY-r.top)/r.height*2048]};
const kaLocal=(L,p)=>{const a=-L.rot*Math.PI/180,dx=p[0]-L.x,dy=p[1]-L.y;return[dx*Math.cos(a)-dy*Math.sin(a),dx*Math.sin(a)+dy*Math.cos(a)]};
document.addEventListener('pointerdown',e=>{const c=e.target.closest&&e.target.closest('#kit-art');if(!c)return;const p=kaPt(c,e);const sel=kaLayer();let hit=null,mode='move';
  if(sel){const q=kaLocal(sel,p);if(Math.abs(q[0]-sel.w/2)<36&&Math.abs(q[1]-sel.h/2)<36){hit=sel;mode='size'}}
  if(!hit)for(let i=KA.layers.length-1;i>=0;i--){const L=KA.layers[i],q=kaLocal(L,p);if(Math.abs(q[0])<=L.w/2+10&&Math.abs(q[1])<=L.h/2+10){hit=L;break}}
  const was=KA.sel;KA.sel=hit?hit.id:null;if(hit){KA.drag={id:hit.id,mode,p,x:hit.x,y:hit.y,w:hit.w,d:Math.hypot(p[0]-hit.x,p[1]-hit.y)||1,pid:e.pointerId};try{c.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()}
  kaPaint();if(was!==KA.sel)kaPanel()});
document.addEventListener('pointermove',e=>{const d=KA.drag;if(!d||e.pointerId!==d.pid)return;const c=$('#kit-art'),L=KA.layers.find(l=>l.id===d.id);if(!c||!L)return;const p=kaPt(c,e);
  if(d.mode==='move'){L.x=clamp(d.x+p[0]-d.p[0],0,2048);L.y=clamp(d.y+p[1]-d.p[1],0,2048)}else{L.w=clamp(d.w*Math.hypot(p[0]-L.x,p[1]-L.y)/d.d,20,1800);L.h=L.w*L.ar}kaCompose()});
['pointerup','pointercancel'].forEach(n=>document.addEventListener(n,()=>{if(!KA.drag)return;const sz=KA.drag.mode==='size';KA.drag=null;if(sz)kaPanel()}));
async function kaBlob(){const k=K3.o&&kaKit(K3.o);const im=k&&k.img&&S.images[k.img];const size=clamp(KA.mode==='image'&&im&&im.w===im.h&&im.w?im.w:(S.settings.sizes.kit||2048),64,2048);
  if(size===2048)return canvasBlob(KA.flat);const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(KA.flat,0,0,size,size);return canvasBlob(c)}
const kaName=o=>{const t=S.teams[o.teamId],k=kaKit(o);return (t?t.name+' ':'')+(k?k.slot:'kit')};
ACT.kaSave=async()=>{const o=S.ui.kit,t=o&&S.teams[o.teamId],k=o&&kaKit(o);if(!t||!k||!KA.flat){toast('Pick a team and a kit first','err');return}
  if(!await ask('Save and replace the kit image?',`<b>${esc(kaName(o))}</b> will use this artwork${KA.layers.length?', with its '+KA.layers.length+' added element'+(KA.layers.length===1?'':'s')+' made part of the image':''}. ${k.img&&S.images[k.img]?'The image it has now stays in the image library, so you can put it back.':''}`,'Save and replace'))return;
  try{await miniBusy('Saving the kit image…',async()=>{const b=await kaBlob();const rec=await addImageFromBlob(b,'kit',kaName(o));assignImage('kit:'+t.id+':'+o.i,rec.id);
      const c=document.createElement('canvas');c.width=c.height=2048;c.getContext('2d').drawImage(KA.flat,0,0);KA.base=c;KA.imgId=rec.id;KA.mode='image';KA.layers=[];KA.sel=null;o.img=rec.id});toast('Saved: '+kaName(o)+' now uses this image','ok');rerender()}
  catch(e){toast('Not saved: '+e.message,'err')}};
ACT.kaExport=async()=>{const o=S.ui.kit;if(!o||!KA.flat)return;try{const b=await kaBlob();const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=kaName(o).replace(/[^\w .-]+/g,'_')+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}catch(e){toast('Export failed: '+e.message,'err')}};
// the artwork on the realistic player: each area of the PES sheet goes to its place on his body texture.
// The PES 2021 kit sheet (2048 px), as the user set out on 2026-11-20 from a real kit:
//  - middle column: the back above the neck opening (upside down, its hem at the top) and the front below it;
//  - the band left and right of the neck opening: the shoulders, running out and down into the SHORT sleeves;
//  - the bar under the front: the colour of the bottom (inside) of the shirt;
//  - top left and right: the LONG sleeves, worn over the short ones in cold-weather games (not on this player);
//  - top left corner strip: the captain's armband (not shown on this player);
//  - the sides: socks;
//  - bottom corners: the left and the right leg of the shorts, each lying on its side: the waistband runs down the edge
//    nearest the middle of the sheet, the hem down the outer edge, and the seam across the middle is the side seam, so a
//    logo drawn beside it is turned a quarter on the sheet and stands upright at the player's side.
function kpTextureArt(art,o){const x=KP.x;if(!x)return;const F='"Barlow Condensed", sans-serif';x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.imageSmoothingQuality='high';x.drawImage(KP.base,0,0,1024,1024);
  const U=KIT_UV;const put=(r,dx,dy,dw,dh)=>{const [X,Y,W,H]=U[r];x.drawImage(art,X,Y,W,H,dx,dy,dw,dh)};
  // shorts: across the sheet is down the leg (waistband at the inner edge), down the sheet is round the leg
  {const sy=1178,sh=704,sw=612;
    x.save();x.beginPath();x.rect(0,0,294,212);x.clip();{const sx=18;x.transform(0,-212/sw,294/sh,0,-294*sy/sh,212*(sx+sw)/sw);x.drawImage(art,0,0)}x.restore();
    x.save();x.beginPath();x.rect(731,0,293,212);x.clip();{const sx=1418;x.transform(0,212/sw,-293/sh,0,731+293+293*sy/sh,-212*sx/sw);x.drawImage(art,0,0)}x.restore()}
  put('socksL',0,322,272,266);put('socksR',752,322,272,266);
  // shirt. The neck opening on the sheet (rows 910-1050) goes to the player's collar (rows 454-534), so what is printed
  // just above or below the opening stays clear of it.
  x.drawImage(art,700,48,646,862,338,112,356,342);x.drawImage(art,700,910,646,140,338,454,356,80);x.drawImage(art,700,1050,646,800,338,534,356,288);
  put('hem',338,822,356,58);put('hem',338,64,356,48);
  // short sleeves: the band beside the neck opening, kept in proportion round the arm; its edge rows fill the rest
  [[1,0,490,520,272,239],[-1,1024,1010,550,511,241]].forEach(([s,ox,sx,sw,dx,dw])=>{const X=v=>ox+s*v;x.save();x.beginPath();[[272,286],[352,296],[408,326],[440,440],[468,494],[432,560],[392,612],[342,654],[272,654]].forEach((p,i)=>i?x.lineTo(X(p[0]),p[1]):x.moveTo(X(p[0]),p[1]));x.closePath();x.clip();
    x.drawImage(art,sx,730,sw,10,dx,286,dw,106);x.drawImage(art,sx,1170,sw,10,dx,596,dw,58);x.drawImage(art,sx,730,sw,450,dx,390,dw,208);x.restore()});
  // the game adds the name and numbers itself; they are shown here as it would: on the back, and on the shorts
  x.save();x.translate(694,454);x.rotate(Math.PI);x.scale(356/512,342/512);x.textAlign='center';x.textBaseline='middle';x.fillStyle=o.numberColor;const nm=String(o.shirtName||'').toUpperCase();
  let fs=56;x.font=`700 ${fs}px ${F}`;while(x.measureText(nm).width>300&&fs>12){fs-=2;x.font=`700 ${fs}px ${F}`}x.fillText(nm,256,96);x.font=`800 210px ${F}`;x.fillText(o.number,256,246);x.restore();
  x.textAlign='center';x.textBaseline='middle';x.fillStyle=o.numberColor;x.font=`700 ${KP_NUM[2]}px ${F}`;x.fillText(o.number,KP_NUM[0],KP_NUM[1]);
  // the inside of the hem in shadow, the hem seam, the shorts in the shirt's shadow
  x.fillStyle='rgba(0,0,0,.35)';x.fillRect(330,822,372,58);x.fillRect(330,64,372,48);x.fillStyle='rgba(0,0,0,.22)';x.fillRect(330,816,372,6);x.fillRect(330,112,372,6);
  [[0,294],[731,293]].forEach(([X,w])=>{const g=x.createLinearGradient(0,0,0,50);g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(.5,'rgba(0,0,0,.18)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(X,0,w,50)});
  // the inside of the collar
  x.fillStyle='rgba(10,12,16,.82)';x.beginPath();x.ellipse(511,494,30,20,0,0,7);x.fill();
  KP.tex.needsUpdate=true}
function kpRender(){if(KP.st!=='ready')return;KP.root.rotation.y=K3.yaw;const d=4.75,p=K3.pitch;KP.cam.position.set(0,.93+d*Math.sin(p),d*Math.cos(p));KP.cam.lookAt(0,.93,0);KP.r.render(KP.scene,KP.cam)}
// the realistic player takes the simple one's place in the page once he is ready
function kpAttach(){if(KP.st!=='ready')return false;const old=$('#kit-3d');if(old&&old!==KP.cv&&old.parentNode)old.parentNode.replaceChild(KP.cv,old);return !!KP.cv.isConnected}
document.addEventListener('pointerdown',e=>{const c=e.target.closest&&e.target.closest('#kit-3d,#kit-3d-gl');if(!c)return;K3.drag={x:e.clientX,y:e.clientY,id:e.pointerId};c.style.cursor='grabbing';try{c.setPointerCapture(e.pointerId)}catch(_){}});
document.addEventListener('pointermove',e=>{const d=K3.drag;if(!d||e.pointerId!==d.id)return;K3.yaw+=(e.clientX-d.x)*.012;K3.pitch=clamp(K3.pitch+(e.clientY-d.y)*.006,-.15,.5);d.x=e.clientX;d.y=e.clientY;k3Turn()});
['pointerup','pointercancel'].forEach(n=>document.addEventListener(n,()=>{if(!K3.drag)return;K3.drag=null;const c=k3Cv();if(c)c.style.cursor='grab'}));
document.addEventListener('keydown',e=>{if(!e.target||!/^kit-3d(-gl)?$/.test(e.target.id||''))return;const d={ArrowLeft:-.2,ArrowRight:.2}[e.key];if(!d)return;e.preventDefault();K3.yaw+=d;k3Turn()});
async function drawKitPreview(){const c=$('#kit-c');if(!c)return;const o=S.ui.kit;const t=S.teams[o.teamId];let em=null;
  if(t&&t.emblem&&S.images[t.emblem]){try{em=await loadImage(Store.url(S.images[t.emblem].ref))}catch(e){}}drawKit(c.getContext('2d'),o,em);k3Draw(o,em);kaEnsure(o)}
ACT.applyKit=()=>{const o=S.ui.kit;const t=S.teams[o.teamId];if(!t)return;const k=t.kits[o.i];if(!k)return;
  Object.assign(k,{shirt:o.shirt,second:o.second,shorts:o.shorts,socks:o.socks,numberColor:o.numberColor,collar:o.collar,sponsor:o.sponsor,design:{pattern:o.pattern,trim:o.trim,sponsorColor:o.sponsorColor,number:o.number,shirtName:o.shirtName,n:o.n}});saveTeam(t);toast('Kit colours saved to '+t.name+' '+k.slot,'ok')};
ACT.saveKitPreview=async()=>{const c=$('#kit-c');const b=await canvasBlob(c);const o=S.ui.kit;const t=S.teams[o.teamId];const ref=await Store.putBlob(b,'image/png');
  saveImage({id:uid(),kind:'kitref',name:(t?t.name+' '+((t.kits[o.i]||{}).slot||''):'Kit')+' preview',ref,w:c.width,h:c.height,size:b.size,createdAt:Date.now()});toast('Preview saved to the library','ok')};
