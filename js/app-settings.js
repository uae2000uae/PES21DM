// PES 2021 Option Studio: the Settings page, by who may change what. Loaded after the other parts and before js/app-boot.js.
// RULE (rule book, "Settings: who may change what"):
//   Everyone (visitor, member, admin): personal preferences (this browser), the settings of their own project, a copy of it to keep or
//     move, and starting their own project from scratch.
//   Admin only (the site's owner accounts online; whoever runs the studio on their own computer): what spends the site's
//     money or touches what every user shares: Claude's effort and web search, the site's status, the backup folder on the
//     computer, the eFootball team list, the site's option-file packages.
// The server enforces the admin part (server.py: a member's Claude requests use the tier the site sets); hiding a control is
// never the only guard.
"use strict";

/* ---- personal preferences: per person and browser, not part of the project, so starting from scratch keeps them ---- */
const PREFS_KEY='pes21ui.prefs',LAST_VIEW_KEY='pes21ui.lastView';// not "pes21.": wipeProject clears every pes21.* key
const PREF_DEF={start:'overview',text:'normal',dense:false,motion:true,slashFind:true};
const PREF_TEXT={normal:1,large:1.1,larger:1.2};
function prefs(){if(!prefs.v){let o={};try{o=JSON.parse(localStorage.getItem(PREFS_KEY)||'{}')||{}}catch(e){}prefs.v=Object.assign({},PREF_DEF,o)}return prefs.v}
function prefsSave(){try{localStorage.setItem(PREFS_KEY,JSON.stringify(prefs()))}catch(e){}prefsApply()}
function prefsApply(){const p=prefs(),b=document.body;b.classList.toggle('dense',!!p.dense);b.classList.toggle('nomotion',!p.motion);b.style.zoom=PREF_TEXT[p.text]&&PREF_TEXT[p.text]!==1?String(PREF_TEXT[p.text]):''}
prefsApply();
window.addEventListener('hashchange',()=>{try{const v=location.hash.slice(1);if(VIEWS[v])localStorage.setItem(LAST_VIEW_KEY,v)}catch(e){}});
// the page the studio opens on, when the address names none
{const _eb=extBoot;extBoot=async function(){await _eb();if(location.hash)return;const want=prefs().start;let v=want;if(want==='last'){try{v=localStorage.getItem(LAST_VIEW_KEY)||''}catch(e){v=''}}
  if(v&&v!=='overview'&&VIEWS[v])history.replaceState(null,'','#'+v)}}

/* ---- who is using the studio ---- */
const setAdmin=()=>!!(window.claude&&window.claude.isAdmin&&window.claude.isAdmin());
const setOnline=()=>isGuest()||isMember()||Store.mode==='cloud';
const setRole=()=>setAdmin()?(setOnline()?['Admin','You are signed in with an owner account of this site: every setting is open to you.']:['Admin','This is the studio on your own computer: every setting is open to you.'])
  :isMember()?['Member','You are signed in. Your project and preferences are yours to change; what the site shares with every user is set by its admin.']
  :['Visitor','You are not signed in. Your project is kept in this browser; sign in with Google (bottom of the left menu) to import, export and keep it in your account.'];
let SITE_INFO=null;// /api/health: is Claude set up, which models, what members get
function siteInfo(){if(SITE_INFO===null){SITE_INFO={};fetch('api/health',{cache:'no-store'}).then(r=>r.ok?r.json():{}).then(o=>{SITE_INFO=o||{};if(S.ui.view==='settings')rerender()}).catch(()=>{})}return SITE_INFO}
const TIER_LABEL={complex:'Thorough (best ratings)',default:'Balanced',quick:'Fast'};

/* ---- the page ---- */
const setCard=(title,body,cls,id)=>`<div class="card ${cls||''}"${id?` id="${id}"`:''}><h3>${title}</h3>${body}</div>`;
const setCheck=(k,on,label,hint)=>`<label class="c" style="display:flex;gap:8px;align-items:flex-start;margin:6px 0"><input type="checkbox" data-pref="${k}" ${on?'checked':''}> <span>${label}${hint?`<br><span class="small muted">${hint}</span>`:''}</span></label>`;
function setProjectCounts(){const ps=teamsArr().reduce((n,t)=>n+(t.players||[]).length,0);
  return[[teamsArr().length,'team'],[ps,'player'],[compsArr().length,'competition'],[Object.keys(S.images).length,'image'],[Object.keys(S.snaps).length,'snapshot'],[Object.keys(S.pending).length,'batch waiting in Process and Review','batches waiting in Process and Review']]}
const setCountsText=()=>setProjectCounts().filter(c=>c[0]).map(([n,one,many])=>'<b>'+n.toLocaleString()+'</b> '+(n===1?one:many||one+'s')).join(', ');
VIEWS.settings=()=>{const s=S.settings,p=prefs(),adm=setAdmin(),[role,roleText]=setRole(),info=siteInfo(),c=s.calib,standalone=!!(window.claude&&window.claude.standalone);
  const mine=`<h2>Your preferences</h2><p class="sub" style="margin-top:-4px">How the studio looks and behaves for you in this browser. They are not part of the project, so they stay when you start from scratch.</p>
   <div class="grid g2">
    ${setCard('Opening and reading',`<div class="form">
      <label class="f">The studio opens on<select data-pref="start">${opts([['overview','Overview'],['last','The page I was on last'],['teams','Teams'],['players','Players'],['health','Health check'],['ai','Live Update'],['optionfile','Import / Export']],p.start)}</select></label>
      <label class="f">Text size<select data-pref="text">${opts([['normal','Normal'],['large','Large'],['larger','Larger']],p.text)}</select></label></div>`)}
    ${setCard('Tables, motion and keys',setCheck('dense',p.dense,'Compact tables','More rows on the screen: less space above and below each row.')
      +setCheck('motion',p.motion,'Animations','Off: pages and dialogs change at once, without movement.')
      +setCheck('slashFind',p.slashFind,'The "/" key opens Find','Ctrl+K and the Find button always open it.'))}
   </div>`;
  const project=`<h2>This project</h2><p class="sub" style="margin-top:-4px">Settings of your own project. They travel with it when you pack or back it up.</p>
   <div class="grid g2">
    ${setCard('Season',`<div class="form" id="sf"><label class="f">Season label<input data-s="season" type="text" value="${esc(s.season)}"></label></div>
      <p class="small muted">Used in every look-up ("the squad for ${esc(s.season)}") and in export names.</p>`)}
    ${setCard('Import image sizes (px)',`<div class="form" id="sz">${['emblem','comp','kit','manager'].map(k=>`<label class="f">${IMG_KINDS[k].label}<input data-z="${k}" type="number" min="64" max="2048" value="${s.sizes[k]}"></label>`).join('')}</div>
      <p class="small muted">PES 2021 accepts PNGs from 64 to 2048 px. Kit textures use 2048×2048 (Strip L); emblems are usually square at 256. New uploads use these sizes; "Fix size" in the library converts older ones.</p>`)}
    ${setCard('Rating conversion',`<p class="small">${c?`Calibrated from ${c.n} of your players on ${fmtDate(c.at)}. EA-style ratings are converted with lines fitted to your game data.`:'Using the default EA → PES conversion. Import a team file and an EA ratings sheet, then press <b>Calibrate</b> on the sheet to fit the conversion to your game.'}</p>${c?'<button class="sm" data-act="calibReset">Go back to the default</button>':''}`)}
    ${setCard('Where it is kept',`<p class="small">${Store.mode==='cloud'?'Your project is stored privately in '+((window.claude&&window.claude.storageName)?'your '+window.claude.storageName+' storage (signed in with Google)':'your Claude account')+', so it is the same on any device where you open this page. Only you can open it.':Store.mode==='local'?'Your project is stored in this browser only. Save a copy now and then (Copy and move, below): a browser can empty its storage without warning.':'Storage is unavailable here: pack the project before leaving (Copy and move, below).'}</p>`)}
   </div>`;
  const backup=`<h2>Copy and move</h2>${isGuest()?'<p class="small muted" style="margin-top:-4px">A packed project is a download, which needs a Google sign-in (bottom of the left menu).</p>':''}
   <div class="grid g2">
    ${setCard('Save a copy of the project',`<p class="small">Pack the whole project (teams, players, competitions, images, team files, review queue and history; snapshots are left out) into one <code>${XFER_FILE}</code>, and load it in another copy of the studio.${standalone&&LOCAL_SAVE?` A <code>${XFER_FILE}</code> saved in the <code>data</code> folder is offered automatically when the project is empty.`:''}</p>
      <div class="row"><button class="primary" data-act="xferExport">Pack whole project (.zip)</button><button data-act="xferImport">Load a packed project…</button></div>`)}
   </div>`;
  const tierOpts=opts(Object.entries(TIER_LABEL).map(([k,l])=>[k,l+(info.models&&info.models[k]?' · '+info.models[k]:'')]),s.aiTier||'complex');
  const admin=adm?`<h2>Admin <span class="badge" title="Only an admin sees and can change these">admin only</span></h2><p class="sub" style="margin-top:-4px">What spends the site's money or is shared by every user. Members and visitors do not see this part.</p>
   <div class="grid g2">
    ${setCard('Claude',`<div class="form"><label class="f">Claude effort<select data-sa="aiTier">${tierOpts}</select></label>
       ${standalone?`<label class="f">Claude web search<select data-sa="aiWeb">${opts([['on','On: when Claude\'s own knowledge falls short'],['off','Off: Claude\'s own knowledge only']],s.aiWeb||'on')}</select></label>`:''}</div>
      <p class="small muted">Thorough costs the most for each request, Fast the least. A web search adds to the cost of a request and can take half a minute. Spending so far is on <a href="#ai" data-act="aiTab" data-tab="stats">Live Update → Stats</a>.</p>`)}
    ${standalone?setCard('This site',`<table class="small"><tbody>
       <tr><td>Claude</td><td>${info.claude===undefined?'…':info.claude?'<b>On</b> (the key is on the server)':'<b>Off</b>: no API key on the server'}</td></tr>
       <tr><td>Claude passphrase</td><td>${info.passphrase===undefined?'…':info.passphrase?'Required for members and visitors':'Not set: anyone on the site can use Claude'}</td></tr>
       <tr><td>Accounts and cloud storage</td><td>${info.cloud===undefined?'…':info.cloud?'On':'Off: projects stay in each browser'}</td></tr>
       <tr><td>Members and visitors get</td><td>${info.memberTier?esc(TIER_LABEL[info.memberTier]||info.memberTier)+(info.models&&info.models[info.memberTier]?' ('+esc(info.models[info.memberTier])+')':'')+', web search '+(info.memberWeb?'on':'off'):'…'}</td></tr></tbody></table>
      <p class="small muted">These are set where the site runs (the server's environment: <code>CLAUDE_PASSPHRASE</code>, <code>CLAUDE_MEMBER_TIER</code>, <code>CLAUDE_MEMBER_WEB</code>, <code>ALLOWED_EMAILS</code>), not from this page.</p>
      <div class="row">${typeof efAvailable==='function'&&efAvailable()?'<button class="sm" data-act="efRefreshIndex" title="Re-read the eFootball league pages">Refresh eFootball team list</button>':''}<button class="sm" data-act="setGoPackages">Option-file packages…</button></div>`):''}
    ${LOCAL_SAVE?setCard('Backup on this computer',`<p class="small">This browser's own storage can be emptied without warning, so the whole project is also kept on this computer: written a few minutes after anything changes, and offered back when the studio opens with an empty project. Folder: <code style="word-break:break-all">${esc(LOCAL_SAVE.backupDir||'')}</code></p>
      <p class="small">${BK.busy?'Saving a backup now…':LOCAL_SAVE.backup?'Last backup: <b>'+fmtDate(LOCAL_SAVE.backup.at)+'</b> ('+kb(LOCAL_SAVE.backup.size)+')'+(bkSig()!==BK.sig&&BK.sig?' · changes since then are saved within a few minutes':''):'No backup yet.'}${BK.err?' <span style="color:var(--bad)">The last try failed: '+esc(BK.err)+'</span>':''}</p>
      <div class="row"><button class="primary" data-act="backupLocal">Back up now</button><button data-act="restoreLocal" ${LOCAL_SAVE.backup?'':'disabled'}>Restore the backup…</button></div>`,'','st-backup'):''}
   </div>`
   :`<h2>Set by the site's admin</h2><div class="card"><p class="small">These are the same for every member and visitor, and only the site's admin can change them:</p>
     <ul class="small"><li><b>Claude</b>: ${info.claude===false?'not set up on this site.':'how thorough it is'+(info.memberTier?' (<b>'+esc(TIER_LABEL[info.memberTier]||info.memberTier)+'</b>)':'')+' and whether it searches the web'+(info.memberTier?' (<b>'+(info.memberWeb?'on':'off')+'</b>)':'')+'.'+(info.passphrase?' Claude buttons ask for the site\'s passphrase once.':'')}</li>
     <li><b>The site's option file</b>, the one a new project can start from, and the site's option-file packages.</li>
     <li><b>What Claude has cost</b> (Live Update → Stats) and the eFootball team list.</li></ul>
     <p class="small muted">Everything else on this page, and everything in your project, is yours to change.</p></div>`;
  const n=setCountsText();
  const danger=`<h2>Danger zone</h2><div class="card dangerzone"><h3>Start from scratch</h3>
    <p class="small"><b>This deletes your whole project and cannot be undone.</b> ${n?'It now holds '+n+'. All of it goes, with its history.':'Your project is empty now.'} Your preferences above stay.${isGuest()?'':' Pack the project first if you may want it back (Copy and move, above).'}</p>
    <div class="row"><button class="danger solid" data-act="startEmpty">Delete the project and start empty…</button>${standalone?'<button class="danger" data-act="loadBaseline">Delete it and build from the site\'s option file…</button>':''}</div>
    <p class="small muted">Each button asks you to confirm first. To start from your own option file instead, use Import / Export → Import Option File.</p></div>`;
  return `<h1>Settings</h1><p class="sub"><span class="chip on">${role}</span> ${roleText}</p>${mine}${project}${backup}${admin}${danger}`};
window.addEventListener('studio-me',()=>{if(S.ui.view==='settings'&&$('#main'))rerender()});
document.addEventListener('change',e=>{const el=e.target;if(!el||!el.dataset)return;
  if(el.dataset.pref){const k=el.dataset.pref;prefs()[k]=el.type==='checkbox'?el.checked:el.value;prefsSave();toast('Saved for you in this browser','ok');return}
  // admin settings: refused for anyone else even if the control is put back by hand (the server enforces its side too)
  if(el.dataset.sa){if(!setAdmin()){toast('Only the site\'s admin can change this','err');rerender();return}S.settings[el.dataset.sa]=el.value;saveSettings();toast('Saved','ok')}});
ACT.setGoPackages=()=>{S.ui.ofTab='of';location.hash='optionfile'};

/* ---- starting from scratch: the risk is shown before anything is deleted ---- */
// One dialog for every way of starting over (empty, the site's option file, your own option file): what will be deleted, in
// numbers, whether a copy exists, and a box to tick before the red button works.
function askRisk(title,what,okLabel){const n=setCountsText(),bk=LOCAL_SAVE&&LOCAL_SAVE.backup?'The last backup on this computer is from <b>'+fmtDate(LOCAL_SAVE.backup.at)+'</b>.':'';
  return new Promise(res=>{S.ui.askRes=res;modal(`<div class="mhead"><h2>${esc(title)}</h2></div>
   <div class="warnbox risk"><b>This cannot be undone.</b> ${what}</div>
   <p style="margin:12px 0 6px"><b>What will be deleted</b></p>
   <ul class="small" style="margin-top:0"><li>${n||'Nothing: the project is empty'}</li><li>The history of changes, the job queue, and the answers searches kept in this browser</li><li>Every export you confirmed as installed: the next export is a first install again</li></ul>
   <p class="small"><b>What stays:</b> your preferences, your account, and files you already downloaded or put on a USB drive.</p>
   <p class="small">${isGuest()?'You are not signed in, so the project cannot be packed first: once deleted it is gone.':'To keep a copy, cancel and use <b>Settings → Copy and move → Pack whole project</b> first. '+bk}</p>
   <label class="c" style="display:flex;gap:8px;margin:12px 0"><input type="checkbox" id="risk-ok"> <span>I understand that my whole project will be deleted and cannot be brought back.</span></label>
   <div class="row end"><button data-act="askNo">Cancel</button><button class="danger solid" id="risk-go" data-act="askYes" disabled>${esc(okLabel)}</button></div>`)})}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='risk-ok'){const b=$('#risk-go');if(b)b.disabled=!e.target.checked}});
ACT.startEmpty=async()=>{if(!await askRisk('Delete the project and start empty?','The whole project is deleted and the studio opens empty, asking how you want to start.','Delete my project'))return;
  try{await miniBusy('Clearing the project…',wipeProject)}catch(e){toast('Could not clear the project: '+e.message,'err');return}
  sessionStorage.removeItem('xferAsked');location.hash='overview';location.reload()};
