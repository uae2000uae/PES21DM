// PES 2021 Option Studio: Import files, the page (the user, 2026-11-26).
// The parts are one program in one global scope, loaded in order by index.html; this file replaces impPageHTML and VIEWS.import.
"use strict";
/* ================= Import / Export → Import files: one page, three steps =================
   "import files tab ... is a miss. understand it then destroy it and rebuild it in a very confined and user friendly way (so
   many tables now). make sure multiple competitions can be imported and each follow the competition addition or replacement
   process. only provide what's available to be replaced or filled. importing teams is either update or add. it should be
   able to import files with applicable formats and folders too."

   The reading, matching and installing are the engine that was there (impReadFiles, impBuild, ACT.impCheck, ACT.impInstall:
   js/app-export-import.js, app-team-files.js, app-game-files.js, app-live-update.js, app-comp-add.js). This file is only what
   you see, and it is one column:
     1 Add files      files, folders or ZIPs of any format the studio reads; one line says what was read
     2 What goes where  one short list, no tables:
          competitions  each is ADD (its place in the game is asked when you import: a vacancy, or a competition it
                        replaces; compAddGate asks for every new competition in turn) or UPDATE the same competition
                        of your project. Nothing else is offered.
          teams         each is UPDATE a team you have or ADD as a new team. A new team is given its league and code
                        right after the import (teamPlaceAsk).
          images        the ones the team and competition files name go with them and need nothing; only an image no file
                        names asks what it is
          the rest      spreadsheets, update files, backups, whole packages: one line each, opened only when needed
     3 Check and import  every change in one folding list, with ticks; Import saves a snapshot first
   Nothing changes in the project before Import. */

// ---- what a competition file can be: the same competition of the project (update), or a new one (add)
function ixCompSame(P){return matchComp(P.name)||(/world cup/i.test(P.name)&&!/club/i.test(P.name)?compsArr().find(c=>c.worldCup):null)||null}
const ixCompHolder=P=>compsArr().find(c=>!c.noCode&&(+c.gameId===+P.compId||(c.ced&&+c.ced.compId===+P.compId)))||null;
// once per file: the first choice. The same competition → update; otherwise add (never "update" a competition of another
// name just because it holds the code: taking its place is the replacement the import asks about)
function ixSettle(st){let ch=false;if(st.opts.mode==='fill')st.opts.mode='add';const asNew=st.opts.mode==='new';
  (st.ceds||[]).forEach(x=>{if(x.ix)return;x.ix=true;const same=ixCompSame(x.parsed);const t=same?same.id:'new';if(x.target!==t){x.target=t;ch=true}});
  (st.teds||[]).forEach(x=>{if(x.ix)return;x.ix=true;x.guess=x.target&&x.target!=='new'&&S.teams[x.target]?x.target:'';if(asNew&&x.target!=='new'){x.wasTarget=x.target;x.target='new';x.on=true;ch=true}});
  st.images.forEach(i=>{if(!i.target&&!i.userSet&&!i.byFile)impGuessImage(i)});
  if(ch){try{tedLinkImages();impMarkAlready()}catch(e){console.error(e)}}}
CH.ixCed=el=>{const x=(impState().ceds||[]).find(t=>t.id===el.dataset.id);if(!x)return;x.target=el.value;x.on=true;try{impMarkAlready()}catch(e){}ixChanged()};
CH.ixTed=el=>{const x=(impState().teds||[]).find(t=>t.id===el.dataset.id);if(!x)return;if(el.value==='__pick'){x.pick=true;rerender();return}x.target=el.value;x.on=true;try{impMarkAlready()}catch(e){}ixChanged()};
// Install as new (the user, 2026-11-26: "add an option to install as new ignoring duplicate teams and players"): every team
// file is set to Add as a new team; leaving the option gives each file its earlier choice back
{const _m=ACT.impMode;ACT.impMode=el=>{const st=impState();const was=st.opts.mode,to=el.dataset.v;
  if(to==='new'&&was!=='new')(st.teds||[]).forEach(x=>{if(x.target!=='new'){x.wasTarget=x.target;x.target='new'}x.on=true});
  if(was==='new'&&to!=='new')(st.teds||[]).forEach(x=>{if(x.wasTarget&&S.teams[x.wasTarget]&&x.target==='new')x.target=x.wasTarget;delete x.wasTarget});
  _m(el);ixChanged()}}
ACT.ixOn=el=>{const st=impState();const x=[...(st.ceds||[]),...(st.teds||[]),...(st.updates||[])].find(t=>t.id===el.dataset.id);if(!x)return;x.on=!x.on;ixChanged()};
ACT.ixTedAll=el=>{(impState().teds||[]).forEach(x=>x.on=el.dataset.v==='1');ixChanged()};
ACT.ixMore=()=>{S.ui.ixMore=true;S.ui.keepScroll=true;rerender()};
// a choice changed after the changes were worked out: they are worked out again when you press the button
function ixChanged(){if(S.ui.impPlan){impDropImages(S.ui.impPlan.images);S.ui.impPlan=null}try{tedLinkImages()}catch(e){}S.ui.keepScroll=true;setTimeout(rerender,0)}
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.classList&&d.classList.contains('ix-sec')&&d.dataset.k)(S.ui.ixOpen||(S.ui.ixOpen={}))[d.dataset.k]=d.open},true);

const ixPl=(n,one,many)=>n+' '+(n===1?one:(many||one+'s'));
function ixSec(k,title,sub,body,open){const o=S.ui.ixOpen||{};const isOpen=o[k]!==undefined?o[k]:!!open;
  return `<details class="ix-sec" data-k="${k}" data-mk="ix:${k}" ${isOpen?'open':''}><summary><b>${title}</b> <span class="small muted">${sub}</span></summary><div class="ix-body">${body}</div></details>`}
function ixCompsHTML(st){const L=st.ceds||[];if(!L.length)return'';
  const rows=L.map(x=>{const P=x.parsed,same=ixCompSame(P),holder=ixCompHolder(P),other=holder&&(!same||holder.id!==same.id)?holder:null;
    const logo=P.emblemFile&&impNamed(P.emblemFile,x.path);
    return `<div class="ix-row"><input type="checkbox" data-act="ixOn" data-id="${x.id}" ${x.on?'checked':''} aria-label="Import ${esc(P.name)}">
      <div class="ix-what"><b>${esc(P.name)}</b><div class="small muted">code ${P.compId}${logo?' · with its logo':P.emblemFile?' · its logo '+esc(P.emblemFile)+' is not in these files':''}${x.already?' · already your competition\'s file':''}${other&&x.target==='new'?' · that code is '+esc(other.name)+'\'s now: you can give it that place, or another, when you import':''}</div></div>
      <select data-ch="ixCed" data-id="${x.id}" aria-label="What to do with ${esc(P.name)}"><option value="new" ${x.target==='new'?'selected':''}>Add to the game</option>${same?`<option value="${same.id}" ${x.target===same.id?'selected':''}>Update ${esc(same.name)}</option>`:''}</select></div>`}).join('');
  const nNew=L.filter(x=>x.on&&x.target==='new').length,nUp=L.filter(x=>x.on&&x.target!=='new').length;
  const nAl=L.filter(x=>x.already&&!x.on).length;
  return ixSec('comps','Competitions',`${L.length} · ${nNew} to add, ${nUp} to update${nAl?', '+nAl+' already in your project':''}`,rows+(nNew?`<p class="small muted" style="margin:8px 0 0">For each competition you add, the import asks where it goes in the game: a free place, or the place of a competition it replaces. Only places that can be taken are offered.</p>`:''),true)}
function ixTeamsHTML(st){const L=st.teds||[];if(!L.length)return'';const lim=S.ui.ixMore?L.length:40;
  const all=()=>opts(teamsArr().filter(t=>!t.sameAs).map(t=>[t.id,t.name]));
  const rows=L.slice(0,lim).map(x=>{const P=x.parsed,g=x.guess&&S.teams[x.guess]?S.teams[x.guess]:null,cur=x.target!=='new'&&S.teams[x.target]?S.teams[x.target]:null;
    const sel=x.pick||(cur&&(!g||cur.id!==g.id))
      ?`<select data-ch="ixTed" data-id="${x.id}" aria-label="What to do with ${esc(P.team.name)}"><option value="new" ${x.target==='new'?'selected':''}>Add as a new team</option><optgroup label="Update a team you have">${opts(teamsArr().filter(t=>!t.sameAs).map(t=>[t.id,t.name]),x.target)}</optgroup></select>`
      :`<select data-ch="ixTed" data-id="${x.id}" aria-label="What to do with ${esc(P.team.name)}">${g?`<option value="${g.id}" ${x.target===g.id?'selected':''}>Update ${esc(g.name)}</option>`:''}<option value="new" ${x.target==='new'?'selected':''}>Add as a new team</option><option value="__pick">Update another team…</option></select>`;
    return `<div class="ix-row"><input type="checkbox" data-act="ixOn" data-id="${x.id}" ${x.on?'checked':''} aria-label="Import ${esc(P.team.name)}">
      <div class="ix-what"><b>${esc(P.team.name)}</b><div class="small muted">${ixPl(P.players.length,'player')} · code ${P.team.teamId}${x.already?' · already this team\'s file':''}</div></div>${sel}</div>`}).join('');
  const on=L.filter(x=>x.on),nNew=on.filter(x=>x.target==='new').length,nUp=on.length-nNew;
  const head=`<div class="row small" style="gap:14px;margin:0 0 6px">${nNew?`<label class="f" style="flex-direction:row;align-items:center;gap:6px;margin:0">New teams are filed under<select data-ch="impTedComp"><option value="">No competition yet</option>${opts(compsArr().map(c=>[c.id,c.name]),st.tedComp||'')}</select></label>`:''}<span class="spacer"></span><button class="sm ghost" data-act="ixTedAll" data-v="1">Tick all</button><button class="sm ghost" data-act="ixTedAll" data-v="0">Untick all</button></div>`;
  const nAl=L.filter(x=>x.already&&!x.on).length;
  return ixSec('teams','Teams',`${L.length} · ${nUp} to update, ${nNew} to add${nAl?', '+nAl+' already in your project':''}`,head+rows+(L.length>lim?`<div class="row" style="margin-top:6px"><button class="sm" data-act="ixMore">Show all ${L.length}</button></div>`:'')
    +(nNew?`<p class="small muted" style="margin:8px 0 0">A new team is in the game only on a code: right after the import you choose its league and one of that league's free codes.</p>`:''),L.length<=12)}
function ixImagesHTML(st){const I=st.images;if(!I.length)return'';const linked=I.filter(i=>i.byFile).length,matched=I.filter(i=>!i.byFile&&i.target).length,loose=I.length-linked-matched;
  const sub=[linked?linked+' named by the team and competition files':'',matched?matched+' matched by name':'',loose?loose+' need a type':''].filter(Boolean).join(' · ');
  return ixSec('images','Images',`${I.length} · ${sub}`,(linked?`<p class="small" style="margin:0 0 8px">The ${linked===1?'image a file names goes':linked+' images the files name go'} with ${linked===1?'its':'their'} team or competition: nothing to choose.</p>`:'')+(matched+loose?impImagesHTML(st):''),false)}
function ixRestHTML(st){const out=[];
  if(st.tables.length)out.push(ixSec('sheets','Spreadsheets',ixPl(st.tables.length,'sheet')+' · '+st.tables.filter(t=>t.on&&t.kind!=='unknown').length+' used',`<div class="grid" style="gap:12px">${st.tables.map(impTableCard).join('')}</div>`,false));
  if((st.updates||[]).length)out.push(ixSec('updates','Update files',ixPl(st.updates.length,'file'),st.updates.map(x=>`<div class="ix-row"><input type="checkbox" data-act="ixOn" data-id="${x.id}" ${x.on?'checked':''} aria-label="Use ${esc(x.name)}"><div class="ix-what"><b>${esc(x.name)}</b></div></div>`).join(''),false));
  if(st.studio.length)out.push(ixSec('backups','Studio backups',ixPl(st.studio.length,'file'),st.studio.map(x=>`<div class="ix-row"><div class="ix-what"><b>${esc(x.name)}</b><div class="small muted">compared with your project when you check the changes</div></div></div>`).join(''),false));
  if((st.packages||[]).length)out.push(ixSec('pkgs','Whole option files',ixPl(st.packages.length,'package'),st.packages.map(x=>`<div class="ix-row"><div class="ix-what"><b>${esc(x.name)}</b><div class="small muted">${kb(x.size)}${x.teds?' · '+x.teds+' team files':''}: too big to read file by file. It is added as a package and the project is built from it on Import Option File.</div></div><button class="sm primary" data-act="impPkg" data-id="${x.id}">Add as package</button></div>`).join(''),true));
  if((st.transfers||[]).length)out.push(ixSec('xfer','Whole projects',ixPl(st.transfers.length,'file'),st.transfers.map(x=>`<div class="ix-row"><div class="ix-what"><b>${esc(x.name)}</b><div class="small muted">${x.teams} teams, ${x.images} images: a packed project, loaded whole</div></div><button class="sm primary" data-act="impTransfer" data-id="${x.id}">Load project…</button></div>`).join(''),true));
  if((st.extras||[]).length)out.push(ixSec('extras','Other files',ixPl(st.extras.length,'file')+' kept as extra files',`<p class="small" style="margin:0">Files the game does not read (${esc([...new Set(st.extras.map(x=>(String(x.path).split('.').pop()||'').toLowerCase()))].slice(0,6).join(', '))}). They are kept with the project and written with Partial Export; untick them under Check and import if you don't want them.</p>`,false));
  return out.join('')}
function ixOptionsHTML(st){const o=st.opts;const any=st.tables.length||st.images.some(i=>!i.byFile)||(st.teds||[]).length;if(!any)return'';
  const r=(v,t,sub)=>`<label class="c"><input type="radio" name="imp-mode" data-act="impMode" data-v="${v}" ${o.mode===v?'checked':''}> <span><b>${t}</b> <span class="muted small">${sub}</span></span></label>`;
  return ixSec('opts','Options',o.mode==='new'?'install as new':o.mode==='replace'?'replace what you have':'only add what is missing',
   `<div class="grid" style="gap:6px">${r('add','Only add what is missing','(new teams, competitions and players, empty values and empty image places; nothing you have changes)')}
    ${r('replace','Replace what I have','(values from the files overwrite yours, for everything set to Update)')}
    ${r('new','Install as new','(every team file becomes a new team with all its players, even when you have a team or player of the same name; nothing you have changes)')}</div>
    ${o.mode==='new'?`<p class="small muted" style="margin:8px 0 0">Duplicates are not looked for: a team of the same name is added beside yours, and a player who is in another of your teams is added again on the same game ID (Health check lists these under shared game IDs). You can still set a single team to Update under Teams.</p>`:''}
    <div class="grid" style="gap:6px;margin-top:10px">${(st.teds||[]).length&&o.mode!=='new'?`<label class="c small"><input type="checkbox" data-act="impOpt" data-k="tedFull" ${o.tedFull?'checked':''}> A team file is the whole team (a player found in another of my teams moves here)</label>`:''}
    ${st.tables.length?`<label class="c small"><input type="checkbox" data-act="impOpt" data-k="addPlayers" ${o.addPlayers?'checked':''}> Spreadsheets: add players missing from my teams</label>
    <label class="c small"><input type="checkbox" data-act="impOpt" data-k="addTeams" ${o.addTeams?'checked':''}> Spreadsheets: also add teams that aren't in my project</label>
    <label class="c small"><input type="checkbox" data-act="impOpt" data-k="latest" ${o.latest?'checked':''}> Transfermarkt: only players active in the latest season</label>
    <label class="c small"><input type="checkbox" data-act="impOpt" data-k="estimate" ${o.estimate?'checked':''}> Estimate ratings from an overall or market value when detailed ratings are missing</label>`:''}</div>`,false)}
// step 1: the drop zone and one line on what was read
function ixAddHTML(st){const L=S.ui.impLast;const K=impKinds(st);const got=Object.entries(K).filter(([,n])=>n>0).map(([k,n])=>n+' '+IMP_KIND_LBL[k][n===1?0:1]);
  const sk=st.skipped||[];
  return `<div class="card ix-drop" id="imp-drop">
    <div class="row" style="gap:10px"><div style="flex:1;min-width:200px"><b>Drop files or folders here</b><div class="small muted">Team and competition files (.ted, .ced), images, spreadsheets (CSV, Excel), update files (.json), studio backups, ZIPs, or a whole folder such as WEPES.</div></div>
     <label class="chip on" style="cursor:pointer;padding:7px 14px"><input type="file" id="imp-files" multiple style="display:none" accept=".csv,.tsv,.txt,.xlsx,.xls,.ods,.json,.zip,.ted,.ced,image/*">Choose files</label>
     <label class="chip" style="cursor:pointer;padding:7px 14px"><input type="file" id="imp-dir" webkitdirectory multiple style="display:none">Choose a folder</label></div>
    ${st.busy?`<div id="imp-prog" style="margin-top:10px" role="status" aria-live="polite">${impProgHTML()}</div>`
      :got.length?`<p class="small" style="margin:10px 0 0" role="status"><b>Read:</b> ${esc(got.join(', '))}.${L&&L.already?' '+L.already+' already in your project, left unticked.':''} <button class="sm ghost" data-act="impClear" style="margin-left:6px">Clear</button></p>`
      :L&&!Object.keys(L.got).length?`<p class="small" style="margin:10px 0 0;color:var(--bad)" role="status">None of those ${ixPl(L.total,'file')} could be used. The studio reads team and competition files, images, spreadsheets, update files, studio backups and ZIPs of these.</p>`:''}
    ${sk.length?`<details class="small" style="margin-top:8px"><summary>${ixPl(sk.length,'file')} could not be read</summary>${sk.slice(-40).map(esc).join('<br>')}</details>`:''}
    <details class="small" style="margin-top:8px"><summary>Where to get files</summary><div class="grid" style="gap:6px;margin-top:6px">
     <div><b>Players and teams</b>: the <a href="https://www.kaggle.com/datasets/davidcariboo/player-scores" target="_blank" rel="noopener">Transfermarkt data set (Kaggle)</a>: add <code>players.csv</code> and <code>clubs.csv</code> together.</div>
     <div><b>Detailed ratings</b>: EA FC player databases on Kaggle, <a href="https://www.kaggle.com/datasets/nyagami/ea-sports-fc-25-database-ratings-and-stats" target="_blank" rel="noopener">FC 25</a> or <a href="https://www.kaggle.com/datasets/stefanoleone992/ea-sports-fc-24-complete-player-dataset" target="_blank" rel="noopener">FC 24</a>.</div>
     <div><b>Team logos</b>: <a href="https://github.com/luukhopman/football-logos" target="_blank" rel="noopener">football-logos on GitHub</a>. Name files after the team.</div>
     <div><b>Leagues other people made</b>: a downloaded league's folder or ZIP is read as it is; the game's own data (.bin) can't be read.</div></div></details></div>`}
function ixPageHTML(){const st=impState();ixSettle(st);const has=impCount()>0;const P=S.ui.impPlan;
  const only=has&&!(st.teds||[]).length&&!(st.ceds||[]).length&&!st.tables.length&&!st.images.length&&!(st.updates||[]).length&&!st.studio.length&&!(st.extras||[]).length;// only whole packages or projects: nothing to check
  const where=has?ixCompsHTML(st)+ixTeamsHTML(st)+ixImagesHTML(st)+ixRestHTML(st)+ixOptionsHTML(st):'';
  return `<div class="ix">
   <h2 class="ix-step"><span>1</span> Add files</h2>${ixAddHTML(st)}
   ${has?`<h2 class="ix-step"><span>2</span> What goes where</h2><div class="card ix-list">${where}</div>`:''}
   ${has&&!only?`<h2 class="ix-step" id="imp-plan"><span>3</span> Check and import</h2>${P?impChangesHTML()
     :`<div class="card"><p class="small" style="margin:0 0 10px">Nothing has changed yet. <b>Check the changes</b> lists everything these files would add or change; you tick what you want and import it.</p>
       <div class="row"><button class="primary" data-act="impCheck" ${st.busy?'disabled':''}>Check the changes</button></div></div>`}`:''}</div>`}
// the page, wherever it is shown (Import / Export → Import files, and the old #import address)
function impPageHTML(){return ixPageHTML()}
VIEWS.import=()=>`<h1>Import files</h1>${ixPageHTML()}`;
