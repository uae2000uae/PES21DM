// PES 2021 Option Studio, part 14 of 14: Overview trees, PES default images, Game codes, and the boot sequence (keep this file last).
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= Boot ================= */
/* ---- Overview → "Option file contents" and "Changes to export": the option file as a collapsing tree, linked to the studio ---- */
// Laid out by the project's data (leagues, cups, teams), never by the option file's folders. A team opens to its team file (which
// opens to its players) and the images that file names; a competition to its file, images and teams. Clicking an ID opens that page.
// Tags come from a dry export plan (nothing is built): "Option file contents" compares with the option file itself (First install),
// "Changes to export" lists only what Changes only would write, compared with the baseline, plus the files it would remove.
const TOC_ST={edited:['Edited','t-upd'],added:['Added','t-add'],removed:['Removed','t-rem']};
const tocTag=s=>s&&TOC_ST[s]?`<span class="tag ${TOC_ST[s][1]} toc-tag">${TOC_ST[s][0]}</span>`:'';
function tocIndex(pkg){const tByTed=new Map(),tByCopy=new Map(),cByCed=new Map(),cByFolder=new Map(),imgUse=new Map(),newDirs=[];
  const use=(path,label,kind,id)=>{if(path)(imgUse.get(path)||imgUse.set(path,[]).get(path)).push({label,kind,id})};
  teamsArr().forEach(t=>{if(t.ofNew){tByTed.set(t.ofNew.ted,t);newDirs.push([t.ofNew.dir,t])}if(!t.of||t.of.pkg!==pkg)return;tByTed.set(t.of.ted,t);(t.of.copies||[]).forEach(p=>tByCopy.set(p,t));const P=t.of.paths||{};
    use(P.emblem,'crest','team',t.id);use(P.manager,'manager photo','team',t.id);use(P.stadium,'stadium','team',t.id);
    (P.sponsors||[]).forEach((p,i)=>use(p,'board '+(i+1),'team',t.id));(P.kits||[]).forEach((p,k)=>use(p,'kit '+OF_KIT_SLOT[k],'team',t.id))});
  compsArr().forEach(c=>{if(c.ofCed)cByCed.set(c.ofCed,c);if(!c.of)return;if(c.of.ced)cByCed.set(c.of.ced,c);if(c.of.folder)cByFolder.set(c.of.folder,c);if(c.of.paths&&c.of.paths.emblem)use(c.of.paths.emblem,'emblem','comp',c.id)});
  // the images a second file for a slot names belong to the same team (read from the option file's own team files once loaded)
  const gf=OF_GF.get(pkg),man=OF_MAN.get(pkg);if(gf&&man){const near=ofNearFn(man);teamsArr().forEach(t=>{if(!t.of||t.of.pkg!==pkg)return;(t.of.copies||[]).forEach(cp=>{const b=gf[cp];if(!b)return;
    try{const n=ofNames(TED.decrypt(TED.unb64(b)));[['crest',n.emblem],['stadium',n.stadium],['board 1',n.sp1],['board 2',n.sp2],['board 3',n.sp3],['manager photo',n.manager],...n.kits.map((k,i)=>['kit '+OF_KIT_SLOT[i],k])]
      .forEach(([l,nm])=>{const ip=nm&&near(nm,cp);if(ip&&!(imgUse.get(ip)||[]).some(x=>x.id===t.id))use(ip,l+' (second file)','team',t.id)})}catch(e){}})})}
  return{tByTed,tByCopy,cByCed,cByFolder,imgUse,newDirs}}
// The number that matters, as the app shows it (files always carry a competition's code and slot as a matching pair): a team's
// code, a competition's slot (the game places a competition file by its slot, 2 bytes at 104). Just the number, no word "Code";
// "game code" for the game's own league folders, "none" without one. Read cached, so a long list reads the slots once.
const _SLOTC={t:0,m:null};function slotOf(code){const now=Date.now();if(!_SLOTC.m||now-_SLOTC.t>3000){_SLOTC.m=compSlots();_SLOTC.t=now}return _SLOTC.m[+code]||0}
const shownNo=(kind,id)=>!+id?0:kind==='team'?+id:slotOf(id);
const tocTeamId=t=>{if(t.sameAs){const l=leagueCopy(t);return l?tocTeamId(l):''}const id=+t.gameId;const ok=typeof codePlaced==='function'?codePlaced('team',t):true;
  return `<button class="tocid" data-act="tocTeam" data-id="${t.id}" title="Open ${esc(t.name)}${id?' (team code '+id+')':''}">${id||'none'}</button>${ok?'':` <span class="tag t-mov">no place in the game</span> <button class="sm ghost" data-act="codeAlloc" data-kind="team" data-x="${t.id}">Allocate a slot</button>`}`};
const tocCompId=c=>{const id=c.noCode?0:(+c.gameId||(c.ced&&+c.ced.compId)||0);if(ofGameComp(c))return `<button class="tocid" data-act="tocComp" data-id="${c.id}" title="Open ${esc(c.name)}: one of the game's own competitions; its code and slot are in no file">game code</button>`;
  const ok=typeof codePlaced==='function'?codePlaced('comp',Object.assign({},c,{gameId:id})):true;
  const sl=shownNo('comp',id);return `<button class="tocid" data-act="tocComp" data-id="${c.id}" title="Open ${esc(c.name)}${sl?' (slot '+sl+', code '+id+')':id?' (code '+id+': no slot in the game)':''}">${sl||'none'}</button>${ok?'':` <span class="tag t-mov">no place in the game</span> <button class="sm ghost" data-act="codeAlloc" data-kind="comp" data-x="${c.id}">Allocate a slot</button>`}`};
const tocExt=p=>(p.split('/').pop().match(/\.([a-z0-9]+)$/i)||['',''])[1].toLowerCase();
// the export plan's view of every file: edited (rebuilt or overwritten), added (a new path) or removed (left out), without building anything
async function tocStatus(mode){const p=await ofPlan(mode,{dry:true});const man=OF_MAN.get(p.pkg)||[];const inMan=new Set(man.map(e=>e.path));
  const installed=path=>teamsArr().some(t=>t.ofInst&&t.ofNew&&(path===t.ofNew.ted||path.startsWith(t.ofNew.dir)))||compsArr().some(c=>c.ofInst&&c.ofCed===path);
  const st=new Map();p.files.forEach(f=>{if(f.path==='CHANGES.txt'||(f.src==='pkg'&&f.why!=='back'))return;
    st.set(f.path,f.why==='back'?'added':inMan.has(f.path)||(mode==='changes'&&installed(f.path))?'edited':'added')});
  (mode==='full'?p.removed:p.removedNow).forEach(x=>st.set(x,'removed'));return{st,at:Date.now(),pkg:p.pkg,notes:p.notes}}
// The tree is built from the project's own data, never from the option file's folders (the user, 2026-11-21): leagues and cups →
// their teams → each one's game file and the images that file names. A file belongs to the team or competition whose game file
// names it (tocIndex); what no team or competition accounts for is listed at the end. No folder is shown anywhere: a file is
// named by what it is ("Crest", "Kit 1", "Team file") with its own file name beside it.
const tocShow=(s,F)=>!F.size||F.has(s);
const tocBase=p=>p.split('/').pop();
const tocCap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function tocGroups(files,ix,st){const T=new Map(),C=new Map(),gone=[],loose=[],other=[];
  const tn=t=>T.get(t.id)||T.set(t.id,{t,files:[]}).get(t.id),cn=c=>C.get(c.id)||C.set(c.id,{c,files:[]}).get(c.id);
  const own=teamsArr().filter(t=>t.of&&t.of.imgDir);
  files.forEach(e=>{
    if(e.ext==='ted'){const t=ix.tByTed.get(e.path),c2=t?null:ix.tByCopy.get(e.path);if(t)tn(t).files.push({e,label:'Team file',main:true});else if(c2)tn(c2).files.push({e,label:'Second team file for its slot, written with the same data'});else gone.push({e,label:'Team file of a team deleted in the studio'});return}
    if(e.ext==='ced'){const c=ix.cByCed.get(e.path);if(c)cn(c).files.push({e,label:'Competition file',main:true});else gone.push({e,label:'Competition file of a competition deleted in the studio'});return}
    if(/^(png|jpe?g)$/.test(e.ext)){const u=(ix.imgUse.get(e.path)||[]).filter(x=>(x.kind==='team'?S.teams:S.comps)[x.id]);
      if(u.length){u.forEach(x=>(x.kind==='team'?tn(S.teams[x.id]):cn(S.comps[x.id])).files.push({e,label:tocCap(x.label)}));return}
      // an image no game file names: one the studio wrote for an added team, or a changed image kept with a team's own images
      const nd=ix.newDirs.find(([d])=>e.path.startsWith(d)),t=nd?nd[1]:(st&&st.get(e.path)?own.find(t=>e.path.startsWith(t.of.imgDir)):null);
      if(t){tn(t).files.push({e,label:'Image'});return}loose.push({e,label:'Image'});return}
    other.push({e,label:'File'})});
  return{T,C,gone,loose,other}}
const tocStat=(L,st)=>{const s={edited:0,added:0,removed:0,all:0},seen=new Set();L.forEach(x=>{if(seen.has(x.e.path))return;seen.add(x.e.path);s.all++;const k=st&&st.get(x.e.path);if(k)s[k]++});return s};
const tocMatch=(s,F)=>!F.size||[...F].some(k=>s[k]>0);
const tocMarks=s=>Object.keys(TOC_ST).filter(k=>s[k]).map(k=>`<span class="tag ${TOC_ST[k][1]} toc-tag">${s[k]} ${TOC_ST[k][0].toLowerCase()}</span>`).join('');
const tocIc=e=>e.ext==='ted'?'TED':e.ext==='ced'?'CED':/^(png|jpe?g)$/.test(e.ext)?'IMG':esc((e.ext||'file').toUpperCase().slice(0,4));
const tocFiles=n=>n+' file'+(n===1?'':'s');
function tocRow(x,st,F,t){const s=st&&st.get(x.e.path);if(!tocShow(s,F))return'';const nm=`<span class="muted small">${esc(tocBase(x.e.path))}</span>`;
  if(t&&x.main)return `<details class="toc-f" data-toc-team="${t.id}"><summary><span class="toc-ic">TED</span>Team file ${nm} <span class="muted">${(t.players||[]).length} players</span>${tocTag(s)}${(()=>{const o=ofOwnList(t);return o.length?` <span class="muted small" title="${esc(PES_OWN_TIP)}">PES default: ${esc(o.join(', '))}</span>`:''})()}</summary><div class="toc-pl"></div></details>`;
  return `<div class="toc-f"><span class="toc-ic">${tocIc(x.e)}</span>${esc(x.label)} ${nm}${tocTag(s)}</div>`}
const tocOrder=x=>x.main?0:x.e.ext==='ted'?1:/^(Crest|Emblem)/.test(x.label)?2:/^Kit/.test(x.label)?3:/^Board/.test(x.label)?4:5;
const tocRows=(L,st,F,t)=>L.slice().sort((a,b)=>tocOrder(a)-tocOrder(b)||a.label.localeCompare(b.label,undefined,{numeric:true})||tocBase(a.e.path).localeCompare(tocBase(b.e.path),undefined,{numeric:true})).map(x=>tocRow(x,st,F,t)).join('');
const tocNode=(head,s,F,body,open)=>`<details class="toc-d" ${open||F.size?'open':''}><summary>${head} <span class="muted small">${tocFiles(s.all)}</span>${tocMarks(s)}</summary><div class="toc-in">${body}</div></details>`;
function tocTeamHTML(n,st,F){const s=tocStat(n.files,st);return tocMatch(s,F)?tocNode(`<b>${esc(n.t.name)}</b> ${tocTeamId(n.t)}`,s,F,tocRows(n.files,st,F,n.t)):''}
function tocCompHTML(c,own,teams,st,F){const s=tocStat(own.concat(teams.flatMap(n=>n.files)),st);if(!s.all||!tocMatch(s,F))return'';
  return tocNode(`<b>${esc(c.name)}</b> ${tocCompId(c)}${teams.length?` <span class="muted small">${teams.length} team${teams.length===1?'':'s'} ·</span>`:''}`,s,F,tocRows(own,st,F)+teams.map(n=>tocTeamHTML(n,st,F)).join(''))}
function tocSec(title,L,st,F,body,open){const s=tocStat(L,st);return s.all&&tocMatch(s,F)?tocNode(`<b>${esc(title)}</b>`,s,F,body,open):''}
function tocBodyHTML(files,ix,st,F){const G=tocGroups(files,ix,st),home=new Map(),noComp=[];
  [...G.T.values()].sort((a,b)=>String(a.t.name).localeCompare(String(b.t.name))).forEach(n=>{const c=S.comps[n.t.compId]||compsArr().find(c=>(c.teams||[]).includes(n.t.id));if(c)(home.get(c.id)||home.set(c.id,[]).get(c.id)).push(n);else noComp.push(n)});
  const comps=compsArr().slice().sort((a,b)=>String(a.name).localeCompare(String(b.name))),cup=c=>isCupComp(c)||c.worldCup;
  const part=(title,L)=>{const all=[];const h=L.map(c=>{const own=(G.C.get(c.id)||{files:[]}).files,ts=home.get(c.id)||[];all.push(...own,...ts.flatMap(n=>n.files));return tocCompHTML(c,own,ts,st,F)}).join('');return tocSec(title,all,st,F,h,true)};
  return part('Leagues',comps.filter(c=>!cup(c)))+part('Cups',comps.filter(cup))
    +tocSec('Teams in no competition',noComp.flatMap(n=>n.files),st,F,noComp.map(n=>tocTeamHTML(n,st,F)).join(''))
    +tocSec('Files of teams and competitions deleted in the studio',G.gone,st,F,tocRows(G.gone,st,F))
    +tocSec('Images no team or competition file names',G.loose,st,F,tocRows(G.loose,st,F))
    +tocSec('Other files',G.other,st,F,tocRows(G.other,st,F))}
function tocHTML(mode){const pk=S.settings.ofPkg;if(!pk)return `<div class="card"><p>No option file yet. Build the project from one on the <a href="#optionfile">Import / Export</a> page (Import Option File tab), and its contents show here.</p></div>`;
  const man=OF_MAN.get(pk.id);if(!man){if(!S.ui.tocLoading){S.ui.tocLoading=true;ofManifest(pk.id).then(()=>{S.ui.tocLoading=false;rerender()}).catch(e=>{S.ui.tocLoading=false;S.ui.tocErr=e.message;rerender()})}
    return S.ui.tocErr?`<div class="warnbox">Couldn't read the option file: ${esc(S.ui.tocErr)}</div>`:'<p class="muted">Reading the option file…</p>'}
  const T=S.ui.tocSt||(S.ui.tocSt={});const R=T[mode];
  if(!R||R.pkg!==pk.id){if(!T['busy_'+mode]){T['busy_'+mode]=true;tocStatus(mode).then(r=>{T[mode]=r}).catch(e=>{T[mode]={err:e.message,pkg:pk.id,st:new Map(),at:Date.now()}}).finally(()=>{T['busy_'+mode]=false;rerender()})}
    return '<p class="muted">Checking what the export would write…</p>'}
  const sc=ofScope(man);const st=R.st;const F=S.ui.tocFilter||(S.ui.tocFilter=new Set());const ix=tocIndex(pk.id);
  const inMan=man.filter(e=>sc.inScope(e.path)&&e.path&&!e.path.endsWith('/'));const known=new Set(inMan.map(e=>e.path));
  const extra=[...st.keys()].filter(p=>!known.has(p)).map(p=>({path:p,ext:tocExt(p)}));
  const files=mode==='full'?inMan.concat(extra):inMan.filter(e=>st.has(e.path)).concat(extra);
  const root={n:{ted:0,ced:0,img:0,all:files.length}};files.forEach(e=>{const k=e.ext==='ted'?'ted':e.ext==='ced'?'ced':/^(png|jpe?g)$/.test(e.ext)?'img':null;if(k)root.n[k]++});
  const cnt=k=>[...st.values()].filter(v=>v===k).length;const total=st.size;
  const chip=(k,l,n)=>`<button class="sm ${k?(F.has(k)?'primary':''):(F.size?'':'primary')}" data-act="tocFilter" data-k="${k}">${l} (${n})</button>`;
  const head=mode==='full'
    ?`<p class="sub" style="margin-top:0">Every file of <b>${esc(pk.name)}</b>${sc.others.length?' (its main part only)':''}: ${root.n.ted} team files, ${root.n.ced} competition files, ${root.n.img} images, tagged against the option file itself (what <b>First install</b> would write). It is laid out by the project\'s own leagues, cups and teams. Click an ID to open it; open a team file to see its players.</p>`
    :`<p class="sub" style="margin-top:0">What <b>Changes only</b> would write now, compared with ${S.settings.ofInstalled?'the export of '+fmtDate(S.settings.ofInstalled.at)+' you confirmed as imported':'the option file (no export confirmed yet)'}: ${total?total+' files':'nothing'}. Removed files are the ones CHANGES.txt tells you to delete from your installed copy.${S.settings.ofPending?' An export of '+fmtDate(S.settings.ofPending.at)+' is waiting for your confirmation, so these may already be in it.':''}</p>`;
  return `${head}<div class="row" style="margin-bottom:8px;flex-wrap:wrap">${chip('','All',mode==='full'?root.n.all:total)}${chip('edited','Edited',cnt('edited'))}${chip('added','Added',cnt('added'))}${chip('removed','Removed',cnt('removed'))}
      <span class="spacer"></span><button class="sm" data-act="tocAll" data-open="1">Expand all</button><button class="sm" data-act="tocAll" data-open="">Collapse all</button><button class="sm" data-act="tocRefresh" title="Checked ${esc(new Date(R.at).toLocaleTimeString())}">Check again</button></div>
    ${R.err?`<div class="warnbox">${esc(R.err)}</div>`:''}${S.settings.ofExtra===false?'<p class="small muted">Teams the option file lacks aren\'t exported (Import / Export → Export Option File → "Also write the project\'s teams…" is off), so they aren\'t listed.</p>':''}
    <div class="card toc" data-toc-mode="${mode}">${!files.length?'<p class="muted">Nothing to export.</p>':tocBodyHTML(files,ix,st,F)}</div>`}
// a team's players compared with its option-file record: added (not in the file), edited (any detail differs), removed (in the file,
// not in the studio squad). Drawn when the team file is opened, so the tree stays light with hundreds of teams.
const TOC_PF=['name','shirtName','number','pos','age','height','weight','foot','style','wfUsage','wfAcc','form','injury','skills','comStyles','playables','attrs'];
async function tocPlayers(t){const F=S.ui.tocFilter||new Set();let pkgPl=null;
  if(t.of&&t.of.pkg===(S.settings.ofPkg||{}).id){try{const gf=await ofGameFiles(t.of.pkg);const b=gf[t.of.ted];if(b){const P=TED.parse(TED.unb64(b));pkgPl=P.players.map(tp=>tedPlayerToStudio(tp,P.team.teamId))}}catch(e){}}
  const row=(p,s,link)=>tocShow(s,F)?`<div class="toc-p"><span class="muted">${esc(String(p.number||'–'))}</span> ${esc(p.name)} <span class="muted">${esc(p.pos||'')}</span> ${link}${tocTag(s)}</div>`:'';
  const used=new Set();const out=(t.players||[]).slice().sort((a,b)=>(+a.number||99)-(+b.number||99)).map(p=>{let s=null;
    // a player who took over another player's ID (Game codes, "Take over …") is not that player edited: he is added, and the
    // player he is written over shows as removed. Only the same man on that ID, or a player renamed by hand, is "edited".
    if(pkgPl){const pid=p.ted&&+p.ted.pid||+p.gameId;const q=pkgPl.find(q=>!used.has(q)&&+q.ted.pid===pid&&!(p.codeSet&&!samePerson(q.name,p.name)))||pkgPl.find(q=>!used.has(q)&&norm(q.name)===norm(p.name));
      if(!q)s='added';else{used.add(q);if(TOC_PF.some(k=>canon(p[k]??'')!==canon(q[k]??'')))s='edited'}}else if(!t.of)s='added';
    return row(p,s,`<button class="tocid" data-act="tocPlayer" data-id="${p.id}" title="Open ${esc(p.name)}">Player ${esc(String(+p.gameId||(p.ted&&p.ted.pid)||'–'))}</button>`)});
  (pkgPl||[]).filter(q=>!used.has(q)).forEach(q=>{const f=allPlayers().find(x=>+x.gameId===+q.ted.pid);const took=f&&!samePerson(f.name,q.name);// someone else is written over him now
    out.push(row(q,'removed',f?`<button class="tocid" data-act="tocPlayer" data-id="${f.id}" title="${took?'His ID now belongs to '+esc(f.name):'Now at another team'}">Player ${esc(String(q.ted.pid))}</button>${took?` <span class="muted small">ID taken over by ${esc(f.name)}</span>`:''}`:`<span class="muted small">Player ${esc(String(q.ted.pid))}</span>`))});
  return out.join('')||'<div class="muted small">'+(F.size?'No players with this tag.':'No players in the studio: the game keeps its own players.')+'</div>'}
document.addEventListener('toggle',async e=>{const d=e.target;if(!d||!d.dataset||!d.dataset.tocTeam||!d.open)return;const box=d.querySelector('.toc-pl');if(!box||box.dataset.done)return;const t=S.teams[d.dataset.tocTeam];if(!t)return;
  box.dataset.done='1';box.innerHTML='<div class="muted small">…</div>';box.innerHTML=await tocPlayers(t)},true);
ACT.tocTeam=el=>{S.ui.teamComp='';ACT.openTeam(el)};
ACT.tocComp=el=>{const id=el.dataset.id;location.hash='competitions';setTimeout(()=>ACT.editComp({dataset:{id}}),60)};
ACT.tocPlayer=el=>{const f=findPlayer(el.dataset.id);if(!f)return;S.ui.teamId=f.t.id;S.ui.teamTab='squad';location.hash='teams';setTimeout(()=>ACT.editPlayer({dataset:{id:el.dataset.id}}),60)};
ACT.tocAll=el=>{document.querySelectorAll('.toc details.toc-d').forEach(d=>d.open=!!el.dataset.open)};
ACT.tocFilter=el=>{const F=S.ui.tocFilter||(S.ui.tocFilter=new Set());const k=el.dataset.k;if(!k)F.clear();else if(F.has(k))F.delete(k);else F.add(k);rerender()};
ACT.tocRefresh=()=>{const T=S.ui.tocSt||{};delete T.full;delete T.changes;rerender()};
// opening a tab checks again, so the tags follow the latest edits
ACT.ovTab=el=>{S.ui.ovTab=el.dataset.tab;if(el.dataset.tab!=='summary'&&S.ui.tocSt)delete S.ui.tocSt[el.dataset.tab==='toc'?'full':'changes'];rerender()};
{const _ov=VIEWS.overview;VIEWS.overview=()=>{const tab=S.ui.ovTab||'summary';const tabs=[['summary','Summary'],['tree','Project structure'],['toc','Option file contents'],['tocChanges','Changes to export']];
  const bar=`<div class="row" style="align-items:flex-end;gap:8px"><div class="tabs" role="tablist" aria-label="Overview sections" style="flex:1;min-width:0">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" class="${tab===k?'on':''}" data-act="ovTab" data-tab="${k}">${l}</button>`).join('')}</div>${roomBtn()}</div>`;
  if(tab==='summary'){const h=_ov();const i=h.indexOf('</h1>');return i<0?bar+h:h.slice(0,i+5)+bar+h.slice(i+5)}
  return `<h1>Your PES 2021 update</h1>${bar}${tab==='tree'?treeHTML():tocHTML(tab==='toc'?'full':'changes')}`}}
/* ---- website visitors who aren't signed in: everything works except importing and exporting ---- */
const isGuest=()=>!!(window.claude&&window.claude.isGuest&&window.claude.isGuest());
const GUEST_VIEWS=['import','export','optionfile'];
const GUEST_ACTS=['buildPkg','downloadPkg','writeUsb','xferExport','xferImport','importPkg','importCSV','impGo','impInstall','impToReview','impPkg','impTransfer','ofRegister','ofBuild','ofPlan','ofGo','ofConfirm'];
const GUEST_MSG='Sign in with Google (bottom of the left menu) to import or export. Everything you did before signing in carries over.';
GUEST_VIEWS.forEach(v=>{const o=VIEWS[v];if(!o)return;VIEWS[v]=(...a)=>isGuest()?`<h1>${v==='export'?'Partial Export':v==='import'?'Import':'Import / Export'}</h1><div class="card"><h3>Sign in to import or export</h3><p class="small">${esc(GUEST_MSG)}</p><p class="small muted">Without signing in you can still edit everything; your project is kept in this browser.</p></div>`:o(...a)});
GUEST_ACTS.forEach(n=>{const o=ACT[n];if(!o)return;ACT[n]=(...a)=>{if(isGuest()){toast(GUEST_MSG,'err');return}return o(...a)}});
document.addEventListener('drop',e=>{if(isGuest()&&impTabOpen()){e.preventDefault();e.stopImmediatePropagation();toast(GUEST_MSG,'err')}},true);
window.addEventListener('studio-me',()=>{if(isGuest()&&GUEST_VIEWS.includes(S.ui.view)&&$('#main'))rerender()});
/* ---- Overview → "Project structure": the project as the game sees it, competition by competition ---- */
// Competitions (leagues, then cups) → each one's logo and clubs → each club's images (crest, kits, sponsor boards), players,
// manager (photo) and stadium (image). Then the same records by stadium and by sponsor, and what nothing links to.
// Club details are drawn when a club is opened; images open in a viewer; IDs open the club, competition or player.
const trImg=(id,label)=>{const i=S.images[id];if(!i)return '';return `<div class="toc-f"><span class="toc-ic">IMG</span><button class="tocimg" data-act="viewImg" data-id="${esc(i.id)}" title="View ${esc(i.name)}">${esc(label)}</button> <span class="muted small">${esc(i.name)}${i.w?' · '+i.w+'×'+i.h:''}${i.generated?' · drawn by the studio':''}</span></div>`};
const trSec=(title,count,body,open)=>`<details class="toc-d" ${open?'open':''}><summary><b>${esc(title)}</b>${count!=null?` <span class="muted small">${count}</span>`:''}</summary><div class="toc-in">${body||'<div class="muted small">None</div>'}</div></details>`;
const trTeamRow=t=>`<details class="toc-f" data-tree-team="${t.id}"><summary><b>${esc(t.name)}</b> ${tocTeamId(t)} <span class="muted small">${(t.players||[]).length} players</span></summary><div class="tree-body"></div></details>`;
const trOwn=(label,own)=>`<div class="toc-f"><span class="toc-ic">IMG</span>${esc(label)} ${own?pesOwnTag():'<span class="muted small">none</span>'}</div>`;
function trTeamBody(t){const kitRows=OF_KIT_SLOT.map((s,i)=>{const k=(t.kits||[]).find(z=>z.slot===s);return k&&S.images[k.img]?trImg(k.img,'Kit '+s):ofOwnSlot(t,'kit:'+i)||(k&&!k.img)?trOwn('Kit '+s,ofOwnSlot(t,'kit:'+i)):''}).filter(Boolean);
  const sp=spOf(t),boardRows=[0,1,2].map(i=>S.images[sp[i]]?trImg(sp[i],'Board '+(i+1)):trOwn('Board '+(i+1),ofOwnSlot(t,'sp'+(i+1))));
  const imgs=[t.emblem&&S.images[t.emblem]?trImg(t.emblem,isFlagImage(t.emblem)?'Flag':'Crest'):trOwn('Crest',ofOwnSlot(t,'emblem')),
    trSec('Kits',(t.kits||[]).filter(k=>S.images[k.img]).length+' of '+OF_KIT_SLOT.length,kitRows.join('')),
    trSec('Sponsor boards',sp.filter(id=>S.images[id]).length+' of 3',boardRows.join(''))].join('');
  const ps=(t.players||[]).slice().sort((a,b)=>(+a.number||99)-(+b.number||99)).map(p=>`<div class="toc-p"><span class="muted">${esc(String(p.number||'–'))}</span> ${esc(p.name)} <span class="muted">${esc(p.pos||'')}</span> <button class="tocid" data-act="tocPlayer" data-id="${p.id}">Player ${esc(String(+p.gameId||(p.ted&&p.ted.pid)||'–'))}</button></div>`).join('');
  const m=t.manager||{};const st=t.stadium||'';
  return trSec('Images',null,imgs,true)+trSec('Players',(t.players||[]).length,ps)
    +trSec('Manager',m.name||'no name',(m.name?`<div class="toc-f">${esc(m.name)}${m.nat?' <span class="muted small">'+esc(m.nat)+'</span>':''}</div>`:'')+(S.images[t.managerPhoto]?trImg(t.managerPhoto,'Photo'):ofOwnSlot(t,'manager')?trOwn('Photo',true):'<div class="toc-f muted small">No photo (a neutral placeholder is exported)</div>'))
    +trSec('Stadium',st||'no name',(st?`<div class="toc-f">${esc(st)}</div>`:'')+(S.images[t.stadiumImg]?trImg(t.stadiumImg,'Stadium image'):ofOwnSlot(t,'stadium')?trOwn('Stadium image',true):'<div class="toc-f muted small">No stadium image</div>'))}
function trCompHTML(c){const ts=compMembers(c).filter(t=>!t.sameAs).sort((a,b)=>a.name.localeCompare(b.name));const boards=(c.sponsorImgs||[]).filter(id=>S.images[id]);
  const imgs=(S.images[c.emblem]?trImg(c.emblem,'Logo'):trOwn('Logo',ofOwnSlot(c,'emblem')))+boards.map((id,i)=>trImg(id,'Board '+(i+1))).join('');
  return `<details class="toc-d"><summary><b>${esc(c.name)}</b> ${tocCompId(c)} ${ts.length?`<span class="muted small">${ts.length} team${ts.length===1?'':'s'}</span>`:''}</summary><div class="toc-in">${trSec('Images',null,imgs)}${ts.length?trSec('Teams',ts.length,ts.map(trTeamRow).join('')):''}</div></details>`}
function treeHTML(){const comps=compsArr().slice().sort((a,b)=>a.name.localeCompare(b.name));const leagues=comps.filter(c=>!isCupComp(c)&&!c.worldCup),cups=comps.filter(c=>isCupComp(c)||c.worldCup);const teams=teamsArr().filter(t=>!t.sameAs);
  // stadiums: one per name (clubs sharing a ground share it), with every stadium image its clubs use
  const stad=new Map();teams.forEach(t=>{const k=norm(t.stadium||'');if(!k&&!S.images[t.stadiumImg])return;const g=stad.get(k)||stad.set(k,{name:t.stadium||'Unnamed stadium',teams:[],imgs:new Set()}).get(k);g.teams.push(t);if(S.images[t.stadiumImg])g.imgs.add(t.stadiumImg)});
  const stadHTML=[...stad.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(g=>`<details class="toc-d"><summary><b>${esc(g.name)}</b> <span class="muted small">${g.teams.length} team${g.teams.length===1?'':'s'}</span></summary><div class="toc-in">${trSec('Image',g.imgs.size,[...g.imgs].map(id=>trImg(id,'Stadium image')).join(''),true)}${trSec('Teams',g.teams.length,g.teams.map(t=>`<div class="toc-f">${esc(t.name)} ${tocTeamId(t)}</div>`).join(''),true)}</div></details>`).join('');
  // sponsors: one per sponsor-board image (an option file shares a set across a league), and one per shirt-sponsor name
  const brd=new Map();const addB=(id,who)=>{if(!S.images[id])return;(brd.get(id)||brd.set(id,[]).get(id)).push(who)};teams.forEach(t=>spOf(t).forEach(id=>addB(id,tocTeamId(t)+' '+esc(t.name))));compsArr().forEach(c=>(c.sponsorImgs||[]).forEach(id=>addB(id,tocCompId(c)+' '+esc(c.name))));
  const brdHTML=[...brd.entries()].sort((a,b)=>S.images[a[0]].name.localeCompare(S.images[b[0]].name)).map(([id,who])=>`<details class="toc-d"><summary><b>${esc(S.images[id].name)}</b> <span class="muted small">board on ${who.length} team${who.length===1?'':'s'}</span></summary><div class="toc-in">${trSec('Image',1,trImg(id,'Sponsor board'),true)}${trSec('Teams',who.length,[...new Set(who)].map(w=>`<div class="toc-f">${w}</div>`).join(''),true)}</div></details>`).join('');
  const shirt=new Map();teams.forEach(t=>(t.kits||[]).forEach(k=>{const n=String(k.sponsor||'').trim();if(n)(shirt.get(norm(n))||shirt.set(norm(n),{name:n,teams:new Set()}).get(norm(n))).teams.add(t)}));
  const shirtHTML=[...shirt.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(g=>`<details class="toc-d"><summary><b>${esc(g.name)}</b> <span class="muted small">on the shirts of ${g.teams.size} team${g.teams.size===1?'':'s'}</span></summary><div class="toc-in">${[...g.teams].map(t=>`<div class="toc-f">${esc(t.name)} ${tocTeamId(t)}</div>`).join('')}</div></details>`).join('');
  // unlinked: what no club or competition points at
  const used=new Set();teamsArr().forEach(t=>{[t.emblem,t.managerPhoto,t.stadiumImg,...spOf(t),...(t.kits||[]).map(k=>k.img)].forEach(x=>x&&used.add(x))});compsArr().forEach(c=>[c.emblem,...(c.sponsorImgs||[])].forEach(x=>x&&used.add(x)));
  const loose=Object.values(S.images).filter(i=>!used.has(i.id)&&i.kind!=='extra').sort((a,b)=>a.name.localeCompare(b.name));
  const noComp=teams.filter(t=>!S.comps[t.compId]&&!compsArr().some(c=>(c.teams||[]).includes(t.id)));const emptyC=comps.filter(c=>!compMembers(c).length&&!c.of);// an option-file cup's teams are chosen by the game
  const orphanTeds=Object.values(S.teds||{}).filter(x=>!S.teams[x.id]);const extras=Object.values(S.images).filter(i=>i.kind==='extra');
  return `<p class="sub" style="margin-top:0">The project the way the game puts it together: competitions and their teams, each team with its images, players, manager and stadium; then the same records by stadium and by sponsor, and whatever nothing links to. Click an image to view it, or an ID to open it.</p>
    <div class="row" style="margin-bottom:8px"><span class="spacer"></span><button class="sm" data-act="tocAll" data-open="1">Expand all</button><button class="sm" data-act="tocAll" data-open="">Collapse all</button></div>
    <div class="card toc">
    ${trSec('Competitions',comps.length+' ('+leagues.length+' leagues, '+cups.length+' cups)',trSec('Leagues',leagues.length,leagues.map(trCompHTML).join(''))+trSec('Cups',cups.length,cups.map(trCompHTML).join('')),true)}
    ${trSec('Stadiums',stad.size,stadHTML)}
    ${trSec('Sponsors',brd.size+' boards, '+shirt.size+' shirt sponsors',trSec('Sponsor boards',brd.size,brdHTML)+trSec('Shirt sponsors',shirt.size,shirtHTML))}
    ${trSec('Unlinked',loose.length+noComp.length+emptyC.length+orphanTeds.length+' items',
      trSec('Images no team or competition uses',loose.length,loose.map(i=>trImg(i.id,i.kind)).join(''))
      +trSec('Teams in no competition',noComp.length,noComp.map(trTeamRow).join(''))
      +trSec('Competitions with no teams',emptyC.length,emptyC.map(c=>`<div class="toc-f">${esc(c.name)} ${tocCompId(c)}</div>`).join(''))
      +trSec('Team files whose team was deleted',orphanTeds.length,orphanTeds.map(x=>`<div class="toc-f"><span class="toc-ic">TED</span>${esc(x.file||x.id)} <span class="muted small">${esc(x.origName||'')}</span></div>`).join(''))
      +trSec('Extra files (credits, help images)',extras.length,extras.map(i=>trImg(i.id,i.kind==='extra'?'Extra file':i.name)).join(''))
      +(()=>{const D=teamsArr().flatMap(msDangling);return trSec('Images the team files name but the option file doesn\'t include',D.length,D.map(m=>`<div class="toc-f">${esc(m.t.name)} ${tocTeamId(m.t)} <span class="muted small">${esc(msSlotLabel(m))}: “${esc(m.name)}”</span></div>`).join(''))})()
      +(()=>{if(!S.settings.ofPkg)return'';const L=orList();if(!L){setTimeout(()=>{if(S.ui.orph&&location.hash==='#overview')rerender()},4000);return trSec('Images in the option file that no team or competition file names','…','<div class="muted small">Reading the option file…</div>')}
        return trSec('Images in the option file that no team or competition file names',L.all.length,L.all.slice(0,600).map(p=>`<div class="toc-f"><span class="toc-ic">IMG</span><button class="tocimg" data-act="orView" data-path="${esc(p)}">${esc(p.split('/').pop())}</button></div>`).join('')+(L.all.length>600?`<div class="muted small">and ${L.all.length-600} more (Health check → Images left out of the export)</div>`:''))})())}
    </div>`}
document.addEventListener('toggle',e=>{const d=e.target;if(!d||!d.dataset||!d.dataset.treeTeam||!d.open)return;const box=d.querySelector('.tree-body');if(!box||box.dataset.done)return;const t=S.teams[d.dataset.treeTeam];if(!t)return;box.dataset.done='1';box.innerHTML=trTeamBody(t)},true);
// the image viewer: the image at full size on a checked background, what it is and who uses it
ACT.viewImg=el=>{const i=S.images[el.dataset.id];if(!i)return;const u=Store.url(i.ref);const by=(usage()[i.id]||[]);
  modal(`<div class="mhead"><h2>${esc(i.name)}</h2></div><div class="imgview">${u?`<img src="${esc(u)}" alt="${esc(i.name)}">`:'<p class="muted">This image isn\'t loaded in this browser.</p>'}</div>
    <p class="small muted" style="margin:8px 0 0">${esc(i.kind||'image')}${i.w?' · '+i.w+' × '+i.h+' px':''}${i.size?' · '+kb(i.size):''}${i.generated?' · drawn by the studio':''}${isOfRef(i.ref)?' · from the option file: '+esc(ofParse(i.ref).path):''}</p>
    ${by.length?`<p class="small" style="margin:4px 0 0">Used by: ${esc(by.join(', '))}</p>`:''}<div class="row end" style="margin-top:12px"><button data-act="close">Close</button></div>`,true)};
/* ================= PES default images: slots the option file leaves to the game ================= */
// RULE (rule book, "PES default images"): a team file that names no image in a slot leaves it to the game, which shows its own
// default (the licensed crest, kit, stadium). The team file says so: crest number 0xFFFF at team block +8 and stadium number
// 0xFFFF at +12 (a real number when a name is given), and an all-zero 20-byte kit header before each kit name. Pages and trees
// mark these slots "PES default"; nothing is drawn or written for them unless an image is chosen, and then the export switches
// the slot off the default as well (below).
const PES_OWN_TIP='The option file names no image here, so PES 2021 shows its own default image. Nothing is written for it unless you choose an image.';
function ofOwnSlot(o,key){const pk=S.settings.ofPkg;if(!o||!pk)return false;
  if(Array.isArray(o.players)){if(!o.of||o.of.pkg!==pk.id)return false;const n=o.of.names||{};const v=/^kit:/.test(key)?(n.kits||[])[+key.slice(4)]:n[key];return !v}
  return key==='emblem'&&(ofGameComp(o)||!!(o.of&&o.of.ced&&o.of.names&&!o.of.names.emblem))}
const pesOwnTag=label=>`<span class="tag t-upd" title="${esc(PES_OWN_TIP)}">${esc(label||'PES default')}</span>`;
const pesOwnNote=what=>`<p class="small" style="margin:6px 0 0">${pesOwnTag()} The option file names no ${esc(what)} here, so PES 2021 shows its own. Choose an image to replace it.</p>`;
// the slots of a team that use the game's default, for the trees
function ofOwnList(t){const out=[];if(!t||!t.of)return out;const has=id=>!!S.images[id];
  if(!has(t.emblem)&&ofOwnSlot(t,'emblem'))out.push('crest');OF_KIT_SLOT.forEach((s,i)=>{const k=(t.kits||[]).find(z=>z.slot===s);if(!(k&&has(k.img))&&ofOwnSlot(t,'kit:'+i))out.push('kit '+s)});
  if(!has(t.managerPhoto)&&ofOwnSlot(t,'manager'))out.push('manager photo');if(!isNationalTeam(t)&&!has(t.stadiumImg)&&ofOwnSlot(t,'stadium'))out.push('stadium');
  const sp=spOf(t);[0,1,2].forEach(i=>{if(!has(sp[i])&&ofOwnSlot(t,'sp'+(i+1)))out.push('board '+(i+1))});return out}
// When a name goes into a slot the file left to the game, the slot is switched off the default too: the crest and stadium numbers
// become 0 (named files carry small numbers; the game sets its own on import), and an empty kit header takes the header of a
// working kit of the same family in the same file (else of a built-in team file).
let _KIT_TPL;const kitTpl=()=>{if(_KIT_TPL!==undefined)return _KIT_TPL;_KIT_TPL=null;
  for(const b of builtinTeams()){try{const d=TED.decrypt(TED.unb64(b.b64));if([0,1,2].every(k=>d.subarray(1746+132*k,1766+132*k).some(x=>x))){_KIT_TPL=d;break}}catch(e){}}return _KIT_TPL};
{const _b=TED.build;TED.build=async(team,tpl,opts={})=>{const o=await _b(team,tpl,opts);const raw=o.bytes;const d=TED.decrypt(raw);let ch=false;
  const named=off=>!!TED.readStr(d,off,TED.IMGLEN);const H=20,hdr=k=>1766+132*k-H,blank=(x,k)=>x.subarray(hdr(k),hdr(k)+H).every(v=>!v);
  if(named(OF_IMG.emblem)&&TED.readNum(d,TED.TEAM+8,2)===0xFFFF){TED.writeNum(d,TED.TEAM+8,2,0);ch=true}
  if(named(OF_IMG.stadium)&&TED.readNum(d,TED.TEAM+12,2)===0xFFFF){TED.writeNum(d,TED.TEAM+12,2,0);ch=true}
  for(let k=0;k<5;k++){if(!named(1766+132*k)||!blank(d,k))continue;const fam=(k===2||k===4)?[2,4]:[0,1,3];
    let from=d,src=[...fam,0,1,2,3,4].find(j=>j!==k&&named(1766+132*j)&&!blank(d,j));
    if(src==null){const t=kitTpl();if(t){from=t;src=[k,...fam,0,1,2,3,4].find(j=>!blank(t,j))}}
    if(src!=null){d.set(from.subarray(hdr(src),hdr(src)+H),hdr(k));ch=true}}
  if(ch)o.bytes=await TED.encrypt(d,raw);return o}}

/* ---- names a team file gives that the option file has no image for ---- */
// RULE (rule book, "PES default images"): 144 names in the 2026-27 file point to images it doesn't include (left over from an
// earlier version: the game keeps imported images by name, so they still show for someone who installed it). The health check
// looks for the related file among the option file's images no file names: same club folder (else league), same kind and
// kit slot, closest name. "Relink" puts it in the slot (written under the team's own name at export, replacing the dead name).
const MS_KIND={emblem:'crest',manager:'manager photo',stadium:'stadium',sp1:'sponsor board',sp2:'sponsor board',sp3:'sponsor board'};
function msDangling(t){const out=[];if(!t||!t.of)return out;const n=t.of.names||{},p=t.of.paths||{};
  ['emblem','manager','stadium'].forEach(k=>{if(n[k]&&!p[k])out.push({t,key:k,kind:k,name:n[k]})});
  [0,1,2].forEach(i=>{const k='sp'+(i+1);if(n[k]&&!(p.sponsors||[])[i])out.push({t,key:k,kind:'sponsor',slot:i,name:n[k]})});
  (n.kits||[]).forEach((nm,i)=>{if(nm&&!(p.kits||[])[i])out.push({t,key:'kit:'+i,kind:'kit',slot:OF_KIT_SLOT[i],name:nm})});return out}
// the kind a file name says, stricter than orKind: a name with no kind word says nothing
const MS_RE={kit:/(home|away|third|fourth|goalkeeper|gk\d?|kit|uniform|strip|1st|2nd|3rd|casa|visita)/i,sponsor:/(press|sponsor|board|sala|^sp_|^p\d_)/i,manager:/(manager|coach|trainer|man(pesuni)?$|^m_)/i,stadium:/(stadium|estadio|stadion|sta(pesuni)?$|^s_)/i,emblem:/(logo|log(pesuni)?$|crest|badge|escudo|emblem|^e_)/i};
const msKindOf=p=>{const f=orBase(p).toLowerCase();const hits=Object.keys(MS_RE).filter(k=>MS_RE[k].test(f));return hits.length===1?hits[0]:''};
// how alike two file names are (letter pairs shared, 0..1), ignoring case, extension and the makers' tags
const msNorm=x=>orBase(x).toLowerCase().replace(/(pesuni|jackliee|_?\d{2}-\d{2})/g,'').replace(/[^a-z0-9]+/g,'');
function msDice(a,b){a=msNorm(a);b=msNorm(b);if(!a||!b)return 0;if(a===b)return 1;const bg=s=>{const m=new Map();for(let i=0;i<s.length-1;i++){const g=s.slice(i,i+2);m.set(g,(m.get(g)||0)+1)}return m};
  const A=bg(a),B=bg(b);let n=0;A.forEach((c,g)=>{n+=Math.min(c,B.get(g)||0)});return 2*n/Math.max(1,a.length+b.length-2)}
function msList(){const pk=S.settings.ofPkg;if(!pk)return[];const L=orList();const used=new Set();
  const refs=new Set();Object.values(S.images).forEach(i=>{if(i.ref)refs.add(i.ref)});
  const pool=(L&&L.all||[]).filter(p=>!refs.has(ofRef(pk.id,p)));
  const rows=[];teamsArr().forEach(t=>{if(!t.of||t.of.pkg!==pk.id||t.sameAs)return;msDangling(t).forEach(m=>{
    const have=m.kind==='kit'?((t.kits||[]).find(z=>z.slot===m.slot)||{}).img:m.kind==='sponsor'?spOf(t)[m.slot]:m.kind==='emblem'?t.emblem:m.kind==='manager'?t.managerPhoto:t.stadiumImg;
    if(S.images[have])return;// already given an image
    const club=t.of.imgDir||ofDir(t.of.ted),lg=ofLeague(t.of.ted).folder+'/';
    // the related file: in the club's folder (else its league's), clearly the same kind (and kit slot), with a closely matching name
    // a file outside the club's folder counts only when its name or folder names the club (never another club's file)
    const tt=orToks(t.name).map(x=>x.toLowerCase()).filter(x=>x.length>=4&&!/^(club|futbol|football|calcio|sporting|united|city|real|athletic|deportivo)$/.test(x));
    const ofClub=c=>{const f=c.toLowerCase();return tt.some(x=>f.includes(x))||(t.short&&new RegExp('(^|[^a-z])'+t.short.toLowerCase()+'([^a-z]|$)').test(orBase(c).toLowerCase()))};
    let best=null,bs=0;for(const c of pool){if(used.has(c))continue;const inClub=c.startsWith(club);if(!inClub&&!(c.startsWith(lg)&&ofClub(c)))continue;
      if(msKindOf(c)!==m.kind)continue;if(m.kind==='kit'&&orKitSlot(c)!==m.slot)continue;
      const sc=msDice(c,m.name)+(inClub?0.05:0);if(sc>bs){bs=sc;best=c}}
    if(best&&bs>=0.7){used.add(best);rows.push(Object.assign(m,{cand:best,score:bs}))}else rows.push(m)})});return rows}
const msSlotLabel=m=>m.kind==='kit'?'kit '+m.slot:m.kind==='sponsor'?'sponsor board '+(m.slot+1):MS_KIND[m.key]||m.kind;
function msApply(m){const t=clone(S.teams[m.t.id]);if(!t||!m.cand)return false;const nm=t.name+' '+msSlotLabel(m);
  if(m.kind==='emblem')t.emblem=orImg(m.cand,'emblem',nm);else if(m.kind==='manager')t.managerPhoto=orImg(m.cand,'manager',nm);else if(m.kind==='stadium')t.stadiumImg=orImg(m.cand,'stadium',nm);
  else if(m.kind==='sponsor'){const a=spOf(t);a[m.slot]=orImg(m.cand,'sponsor',nm);t.sponsorImgs=a}
  else{t.kits=t.kits||[];let k=t.kits.find(z=>z.slot===m.slot);if(!k){k=newKit(m.slot);t.kits.push(k)}k.img=orImg(m.cand,'kit',nm)}saveTeam(t);return true}
function msHTML(M){const pk=S.settings.ofPkg;if(!orList())return '<p class="why">Reading the option file…</p>';
  const head=`<p class="why">Names a team file gives that the option file has no image for (left over from an earlier version: the game keeps imported images by name, so they show only for someone who still has them). <b>Relink</b> puts the related file the option file does include (same team folder, same kind and kit slot, closest name) in that slot; the export writes it under the team's own name, replacing the dead name. <b>Remove reference</b> blanks the dead name in the team file, so the slot shows the game's own image.</p>`;
  if(!M.length)return head+'<p class="why">None left.</p>';
  return head+`<div class="hc-rows">${M.slice(0,S.ui.msMore?M.length:60).map((m,i)=>`<div class="hc-row" style="grid-template-columns:48px minmax(160px,1.2fr) minmax(160px,1.4fr) auto">${m.cand?`<button class="orth" data-act="orView" data-path="${esc(m.cand)}"><img src="${esc(ofUrl(ofRef(pk.id,m.cand)))}" alt="" loading="lazy"></button>`:'<span></span>'}
    <span class="who"><b>${esc(m.t.name)}</b><div class="small muted">${esc(msSlotLabel(m))}: “${esc(m.name)}”</div></span>
    <span class="small">${m.cand?'Related file: <b>'+esc(m.cand.split('/').pop())+'</b><div class="small muted" style="word-break:break-all">'+esc(ofDir(m.cand))+'</div>':'<span class="sev warn">Note</span> No related file in the option file. In the game this slot shows only what was imported earlier under that name.'}</span>
    <span class="acts">${m.cand?`<button class="sm primary" data-act="msRelink" data-i="${i}">Relink</button>`:''}<button class="sm${m.cand?'':' primary'}" data-act="msRemove" data-i="${i}" title="Blanks this name in the team file, so the slot shows the game's own image">Remove reference</button><button class="sm" data-act="openTeamImg" data-id="${m.t.id}">Open team</button></span></div>`).join('')}${M.length>60&&!S.ui.msMore?`<div class="hc-row"><span></span><span></span><span class="muted small">${M.length-60} more</span><span class="acts"><button class="sm" data-act="msMore">Show all ${M.length}</button></span></div>`:''}</div>`}
const msHeadBtns=M=>{const n=M.filter(m=>m.cand).length;return (n?`<button class="sm primary" data-act="msRelinkAll">Apply all suggested actions (${n})</button>`:'')+(M.length?`<button class="sm" data-act="msRemoveAll" title="Blanks every one of these names in its team file, so the slot shows the game's own image">Remove all references (${M.length})</button>`:'')};
// Remove the reference: the dead name is blanked in the team file (written at the next export, in the team's second file too),
// so the slot is the game's own image. Nothing else of the team changes; the old name is kept on the team (t.of.cleared).
function msRemove(m){const t=clone(S.teams[m.t.id]);if(!t||!t.of||!t.of.names)return false;const n=t.of.names,k=/^kit:(\d)$/.exec(m.key);
  if(k){if(!(n.kits||[])[+k[1]])return false;n.kits[+k[1]]=''}else{if(!n[m.key])return false;n[m.key]=''}
  (t.of.cleared||(t.of.cleared={}))[m.key]=m.name;saveTeam(t);return true}
ACT.msRemove=el=>{const m=msList()[+el.dataset.i];if(!m)return;histLabel('Health check: image reference removed','Health',()=>msRemove(m));toast(m.t.name+': the '+msSlotLabel(m)+' name “'+m.name+'” is removed; the slot shows the game\'s own image','ok');orDone()};
ACT.msRemoveAll=async()=>{const M=msList();if(!M.length)return;const c=M.filter(m=>m.cand).length,nt=new Set(M.map(m=>m.t.id)).size;
  if(!await ask('Remove the references?',`<b>${M.length}</b> image name${M.length===1?'':'s'} in <b>${nt}</b> team file${nt===1?'':'s'} point${M.length===1?'s':''} to ${M.length===1?'an image':'images'} the option file doesn't include. Each name is blanked in its team file, so the slot shows the game's own image. Nothing else changes, and the ${nt===1?'team is':'teams are'} written at the next export.${c?`<br><br><b>${c}</b> of them ${c===1?'has':'have'} a related file in the option file: press <b>Apply all suggested actions</b> first if you want ${c===1?'it':'those'} relinked instead of removed.`:''}<br><br>A snapshot is taken first, and you can undo it from the change history.`,'Remove '+M.length,true))return;
  await takeSnapshot('Before removing '+M.length+' image references',true);let n=0;histLabel('Health check: '+M.length+' image references removed','Health',()=>{M.forEach(m=>{if(msRemove(m))n++})});toast(n+' reference'+(n===1?'':'s')+' removed','ok');orDone()};
ACT.msMore=()=>{S.ui.msMore=true;rerender()};
ACT.msRelink=el=>{const m=msList()[+el.dataset.i];if(!m||!m.cand)return;histLabel('Health check: image relinked','Health',()=>msApply(m));toast(m.t.name+': '+msSlotLabel(m)+' relinked to '+m.cand.split('/').pop(),'ok');orDone()};
ACT.msRelinkAll=async()=>{const M=msList().filter(m=>m.cand);if(!M.length)return;
  if(!await ask('Relink the images?',`<b>${M.length}</b> slot${M.length===1?'':'s'} whose team file names an image the option file doesn't include get the related file it does include. You can undo it from the change history.`,'Relink '+M.length))return;
  let n=0;histLabel('Health check: '+M.length+' images relinked','Health',()=>{M.forEach(m=>{if(msApply(m))n++})});toast(n+' relinked','ok');orDone()};
/* ================= Game codes: the option file's competition and team codes, and who holds each ================= */
// RULE (rule book, "Game codes"): every competition and team in PES 2021 sits at a code (competition ID, team ID); the option file
// fills codes with its competition and team files. This page lists the codes (PES 2021's team list from PES Master, the option
// file's own files, and every code a studio record holds) and lets you give a code to any competition or club: it gets that code
// (its file is written with it at export) and the one that held it loses it ("no code": not exported until it gets one).
// "In Option File" reads the baseline (the option file as installed, settings.baseline), not the session: what the game has at
// each code even after a club or competition is deleted or moved in the studio. No baseline yet: the session's own files.
let _OPTB={k:'',v:null};
function codeOptBase(){const id=S.settings.baseline,d=id?dataFor('baseline'):null;const src=d||{teds:S.teds,comps:S.comps};const k=(d?id:'cur|'+Object.keys(S.teds||{}).length+'|'+compsArr().length);
  if(_OPTB.k===k)return _OPTB.v;const T=new Map(),C=new Map();
  Object.values(src.teds||{}).forEach(r=>{if(r&&!r.generated&&+r.tedTeamId&&r.origName&&!T.has(+r.tedTeamId))T.set(+r.tedTeamId,r.origName)});
  Object.values(src.comps||{}).forEach(c=>{const x=c&&c.ced;if(!x||x.generated||!+x.compId||C.has(+x.compId))return;C.set(+x.compId,inGameComp(c)||x.origName||'')});
  const v={T,C,loading:!!id&&d===undefined};if(!v.loading)_OPTB={k,v};return v}
const codeOptName=(kind,id)=>(kind==='team'?codeOptBase().T:codeOptBase().C).get(+id)||'';
function codeRows(kind){const ids=new Set();
  const B=codeOptBase();
  if(kind==='team'){(PES21_TEAMS||[]).forEach(x=>ids.add(+x.id));Object.values(S.teds||{}).forEach(r=>{if(+r.tedTeamId)ids.add(+r.tedTeamId)});teamsArr().forEach(t=>{if(+t.gameId)ids.add(+t.gameId)});B.T.forEach((n,i)=>ids.add(i))}
  else{KNOWN_COMP_IDS.forEach(i=>ids.add(i));compsArr().forEach(c=>{if(+c.gameId)ids.add(+c.gameId);if(c.ced&&+c.ced.compId)ids.add(+c.ced.compId)});B.C.forEach((n,i)=>ids.add(i))}
  const pes=new Map((PES21_TEAMS||[]).map(x=>[+x.id,x]));
  const rows=[...ids].filter(Boolean).sort((a,b)=>a-b).map(id=>{const held=(kind==='team'?teamsArr().filter(t=>!t.sameAs):compsArr()).filter(x=>+x.gameId===id);const p=pes.get(id);
    return{id,held,opt:codeOptName(kind,id),pes:p?p.name:'',league:p?p.league:''}});
  // not allocated: a club or competition with no code at all (the game's own league folders excepted: they are in the game)
  const none=(kind==='team'?teamsArr().filter(t=>!t.sameAs):compsArr().filter(c=>!ofGameComp(c))).filter(x=>!+x.gameId).sort((a,b)=>a.name.localeCompare(b.name)).map(x=>({id:null,held:[x],opt:'',pes:'',league:'',none:true}));
  return none.concat(rows)}
const codePlaced=(kind,x)=>{const P=placeOf(),id=+x.gameId;return !!(id&&!x.noCode&&(x.codeSet||(kind==='team'?P.T:P.C).has(id)))};
const codeHolder=(kind,x)=>`<button class="tocid" data-act="${kind==='team'?'tocTeam':'tocComp'}" data-id="${x.id}">${esc(x.name)}</button>${x.codeSet&&+x.gameId?' <span class="tag t-upd" title="Code set on this page">set</span>':''}${codePlaced(kind,x)?'':' <span class="tag t-mov" title="'+(+x.gameId?'A code the game does not have: it would come in as a new one':'No code')+'">no place in the game</span>'}`;
// the table: Code · In PES · In Option File · Your Update · [Apply]. "Your Update" shows who holds the code in the studio now, and a
// list of every competition or team without a code (or with one the game doesn't have) to give it to; choosing another shows Apply.
/* ----- A team's league is its code (rule book "A team's league is its team code"; database rules §3) -----
   Every team code of the game belongs to one league or group of the game, for good: the 20 codes of the PAS League are the BRI
   SUPER LEAGUE's 20 places whoever sits on them, also after a team is deleted and its code is free. So a team filed under a
   league is only ever offered that league's own codes, and a code is only ever offered to teams of its league (or to teams
   filed under no league). The league of a code is the game's own list (slotLeagueOf); the league of a team is the game league
   its competition stands for (c.gameLeague). */
const teamLeagueKey=t=>{const c=t&&S.comps[t.compId];return c&&isLeagueComp(c)&&c.gameLeague?c.gameLeague:''};
const codeLeagueOk=(t,code)=>{const k=teamLeagueKey(t),l=slotLeagueOf(code);return !k||!l||k===l};
const codeUncoded=kind=>(kind==='team'?teamsArr().filter(t=>!t.sameAs):compsArr().filter(c=>!ofGameComp(c))).filter(x=>!+x.gameId||!codePlaced(kind,x)).sort((a,b)=>(!!a.parked-!!b.parked)||a.name.localeCompare(b.name));
/* ----- Game codes page: Competitions · Teams · Images · Free codes, each in the same two or three tables -----
   Competitions, Teams and Images each have "Game Codes" (only the codes the game has: its preset slots, team codes and image
   names) and "Files with no Codes" (every competition, team or image file that has none). Free codes has Competitions, Teams
   and Images: the codes no file holds, ready to give to a file without one. A code is free when no file holds it, whether it
   was freed on this page or never used. */
const codeSubOf=tab=>((S.ui.codeSub||(S.ui.codeSub={}))[tab])||(tab==='free'?'comp':'codes');
const codePreset=(kind,id)=>{const P=placeOf();return (kind==='team'?P.T:P.C).has(+id)};
// every preset code no file holds: those freed on this page (with the image names the game has there) and those never used
function codeFreeAll(kind){const av=new Map(codeAvail(kind).map(e=>[e.id,e]));const out=[];
  codeRows(kind).forEach(r=>{if(r.none||r.held.length||!codePreset(kind,r.id))return;out.push(Object.assign({pes:kind==='team'?r.pes:'',opt:r.opt,league:r.league},av.get(r.id)||{id:r.id,from:'',names:null,unused:true}))});
  av.forEach((e,id)=>{if(!out.some(x=>x.id===id))out.push(e)});return out.sort((a,b)=>a.id-b.id)}
const codeNo=(kind,id)=>kind==='comp'?'slot '+(slotOf(id)||id):'code '+id;
/* image names are the game's codes for images: it keeps every imported image by its file name */
const IMG_SLOTS_T=[['emblem',0],['manager',0],['stadium',0],['sp1',0],['sp2',0],['sp3',0],['kit',0],['kit',1],['kit',2],['kit',3],['kit',4]],IMG_SLOTS_C=[['emblem',0]];
const imgIsT=o=>Array.isArray(o.players);
const imgSlotKey=(o,kind,k)=>(imgIsT(o)?'T':'C')+':'+o.id+':'+kind+':'+(k||0);
const imgSlotLabel=(o,kind,k)=>!imgIsT(o)?'Logo':kind==='kit'?'Kit '+(OF_KIT_SLOT[k]||k+1):({emblem:'Crest',manager:'Manager photo',stadium:'Stadium',sp1:'Board 1',sp2:'Board 2',sp3:'Board 3'})[kind];
const imgSlotCls=(o,kind)=>kind==='kit'?'kit':/^sp\d$/.test(kind)?'sponsor':kind==='emblem'?(imgIsT(o)?'emblem':'comp'):kind;
const IMG_CLS_LBL={emblem:'Team crest',comp:'Competition logo',kit:'Kit',manager:'Manager photo',stadium:'Stadium',sponsor:'Sponsor board'};
function imgSlotImage(o,kind,k){if(!imgIsT(o))return o.emblem||'';if(kind==='emblem')return o.emblem||'';if(kind==='manager')return o.managerPhoto||'';if(kind==='stadium')return o.stadiumImg||'';
  if(kind==='kit'){const z=(o.kits||[]).find(z=>z.slot===OF_KIT_SLOT[k]);return z?z.img||'':''}return spOf(o)[+kind[2]-1]||''}
function imgSlotSet(o,kind,k,id){if(!imgIsT(o)){o.emblem=id;saveComp(o);return}
  if(kind==='emblem')o.emblem=id;else if(kind==='manager')o.managerPhoto=id;else if(kind==='stadium')o.stadiumImg=id;
  else if(kind==='kit'){o.kits=o.kits||[];let z=o.kits.find(z=>z.slot===OF_KIT_SLOT[k]);if(!z){z=newKit(OF_KIT_SLOT[k]);o.kits.push(z)}z.img=id}
  else{const s=spOf(o).slice();s[+kind[2]-1]=id;o.sponsorImgs=s}saveTeam(o)}
const imgNameIn=(N,P,kind,k)=>{N=N||{};P=P||{};const nm=kind==='kit'?(N.kits||[])[k]:N[kind];const pt=kind==='kit'?(P.kits||[])[k]:/^sp\d$/.test(kind)?(P.sponsors||[])[+kind[2]-1]:P[kind];return nm?{name:nm,path:pt||''}:null};
// the game name a file's image is written under: its own file's, one given on this page, or the one its code brings; null = none
function imgSlotName(o,kind,k){const ov=(S.settings.imgCodes||{})[imgSlotKey(o,kind,k)];if(ov&&ov.name)return Object.assign({set:true},ov);
  if(o.of&&o.of.names&&!codeMoved(o)&&!o.noCode){const n=imgNameIn(o.of.names,o.of.paths,kind,k);if(n)return n}return codeImgName(o,kind,k)}
function imgCodeData(){const rows=new Map();const add=(n,cls,label,opt)=>{if(!n||!n.name)return;const key=n.name.toLowerCase();if(!rows.has(key))rows.set(key,{key,name:n.name,path:n.path,cls,label,opt,holder:null})};
  const T=teamsArr().filter(t=>!t.sameAs),C=compsArr();
  T.forEach(t=>{if(t.of&&t.of.names)IMG_SLOTS_T.forEach(([kind,k])=>add(imgNameIn(t.of.names,t.of.paths,kind,k),imgSlotCls(t,kind),imgSlotLabel(t,kind,k),t.name))});
  C.forEach(c=>{if(c.of&&c.of.names)add(imgNameIn(c.of.names,c.of.paths,'emblem',0),'comp','Logo',c.name)});
  // names of codes whose holder was deleted: kept in the code book
  [['team',IMG_SLOTS_T],['comp',IMG_SLOTS_C]].forEach(([kd,SL])=>Object.values(codeBook(kd)).forEach(e=>{if(!e.names)return;const fake=kd==='team'?{players:[]}:{};SL.forEach(([kind,k])=>add(imgNameIn(e.names,e.paths,kind,k),imgSlotCls(fake,kind),imgSlotLabel(fake,kind,k),e.from||''))}));
  // images of the option file that no file names, deleted or ignored in the health check: the game still has their names
  {const pk=S.settings.ofPkg,st=S.settings.ofOrphan||{};if(pk)Object.keys(st).forEach(key=>{if(!key.startsWith(pk.id+'|'))return;const path=key.slice(pk.id.length+1);let kd='';try{kd=orKind(path)||''}catch(e){}
    add({name:path.split('/').pop(),path},IMG_CLS_LBL[kd]?kd:kd==='logo'?'comp':'emblem',st[key]==='del'?'deleted from the export':'ignored',path.split('/').slice(-2,-1)[0]||'')})}
  const un=[];const live=o=>!o.parked&&!o.noCode;
  const scan=(o,SL)=>SL.forEach(([kind,k])=>{const n=live(o)?imgSlotName(o,kind,k):null;const img=imgSlotImage(o,kind,k);const has=!!(img&&S.images[img]);
    if(n&&rows.has(n.name.toLowerCase())){const r=rows.get(n.name.toLowerCase());if(!r.holder)r.holder={o,kind,k,img:has?img:'',set:!!n.set}}
    else if(has&&!n)un.push({key:imgSlotKey(o,kind,k),o,kind,k,img,cls:imgSlotCls(o,kind),label:imgSlotLabel(o,kind,k)})});
  T.forEach(t=>scan(t,IMG_SLOTS_T));C.forEach(c=>{if(!ofGameComp(c))scan(c,IMG_SLOTS_C)});
  const all=[...rows.values()].sort((a,b)=>a.name.localeCompare(b.name));return{rows:all,un,free:all.filter(r=>!r.holder&&r.path),given:all.filter(r=>r.holder&&r.holder.set)}}
// the count in the Free codes tab is slow to work out (over a second on a full option file), so it is kept for 3 seconds
let _CFN={at:0,n:0};const codeTabsHTML=tab=>{if(Date.now()-_CFN.at>3000)_CFN={n:codeFreeAll('comp').length+codeFreeAll('team').length+imgCodeData().free.length,at:Date.now()};const nF=_CFN.n;
  return `<div class="tabs" role="tablist" aria-label="Game codes">${[['comp','Competitions'],['team','Teams'],['pl','Players'],['img','Images'],['free','Free codes ('+nF+')']].map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" class="${tab===k?'on':''}" data-act="codeTab" data-tab="${k}">${l}</button>`).join('')}</div>`};
const codeSubsHTML=(tab,list)=>`<div class="row" role="tablist" aria-label="Tables" style="gap:6px;margin:-6px 0 12px">${list.map(([k,l])=>`<button type="button" role="tab" aria-selected="${codeSubOf(tab)===k}" class="chip ${codeSubOf(tab)===k?'on':''}" data-act="codeSub" data-tab="${tab}" data-sub="${k}">${l}</button>`).join('')}</div>`;
const codeIntro={pl:'Every player in the game sits at a code, his player ID. The game only changes players it has: a team file can\'t add one, so a player with no code is left out of the export. Give him the code of a player the game has that no team uses any more (one you deleted or replaced): he is written over that player and keeps that player\'s look until you edit it in the game.',comp:'Every competition in PES 2021 sits at a slot; the game places a competition file by its slot, and its code goes with it.',team:'Every team in PES 2021 sits at a code, its team ID.',img:'The game keeps every imported image by its file name, so an image name is the code of an image: a new image goes in without taking space only under a name the game already has. Deleted and ignored images leave their names free; Apply renames an image with no code to the name you choose.',
  free:'Codes no file holds: freed on this page (kept out of the game, or deleted) or never used. Give one to a file without a code; a freed code also brings the image names the game has there, so the new images overwrite those and take no space.'};
const codeFind=(tab,ph)=>`<input type="search" data-in="codeQ" placeholder="${ph}" value="${esc((S.ui.codeF||{}).q||'')}" style="min-width:220px">`;
const codeCompSel=()=>`<select data-ch="codeComp" aria-label="Competition filter"><option value="">All competitions</option>${opts(compsArr().slice().sort((a,b)=>a.name.localeCompare(b.name)).map(c=>[c.id,c.name]),(S.ui.codeF||{}).comp||'')}</select>`;
const codeMoreHTML=(n,lim)=>n>lim?`<div class="row" style="margin-top:8px"><span class="small muted">Showing ${lim} of ${n}</span><button class="sm" data-act="codeMore">Show all</button></div>`:'';
const codeApplyTd=(act,attrs)=>`<td><button class="sm primary code-apply" data-act="${act}" ${attrs} hidden>Apply</button></td>`;
const codeTable=(heads,body,empty,w0)=>body.length?`<div class="tw"><table class="codes"><thead><tr>${heads.map((h,i)=>`<th${i===0?' style="width:'+(w0||90)+'px"':i===heads.length-1?' style="width:90px"':''}>${h}</th>`).join('')}</tr></thead><tbody>${body.join('')}</tbody></table></div>`:`<p class="muted small">${empty}</p>`;
const codeInPes=(kind,id,pes,league)=>kind==='team'?(pes?esc(pes)+(nameFixed(id)?' '+nameFixedTag(id):'')+`<div class="small muted">${esc(csLeagueName(league))}</div>`:'<span class="muted">—</span>'):(KNOWN_COMP_IDS.includes(id)?'<span class="small muted">a competition of the game</span>':'<span class="muted">—</span>');
const FREE_TAG=t=>`<span class="tag t-add" title="${esc(t)}">free code</span>`;
// --- Competitions / Teams ---
function codeKindHTML(tab,q){if(tab==='team'&&S.settings.ofPkg&&!pcReady())pcLoadAll();// the "name fixed by the game" marks come from the team files
  const sub=codeSubOf(tab),lim=S.ui.codeAll?1e9:200;const un=codeUncoded(tab);const noun=tab==='team'?'team':'competition';
  const subs=codeSubsHTML(tab,[['codes','Game Codes'],['files','Files with no Codes ('+un.length+')']]);
  if(tab==='team'&&!PES21_TEAMS)return subs+'<p class="muted">Reading PES 2021\'s team list…</p>';
  if(sub==='files'){const free=codeFreeAll(tab);const fcF=tab==='team'?S.comps[(S.ui.codeF||{}).comp]:null;const inF=fcF?new Set(compMembers(fcF).map(t=>t.id)):null;
    const shown=un.filter(x=>(!q||norm(x.name+' '+(tab==='team'?compName(x.compId):'')).includes(q))&&(!inF||inF.has(x.id)));
    // a team filed under a league is offered that league's own codes only (codeLeagueOk): a team's league in the game is its code
    const foFor=x=>{const key=tab==='team'?teamLeagueKey(x):'';const L=key?free.filter(e=>slotLeagueOf(e.id)===key):free;
      if(!L.length)return{html:`<option value="" selected>${key?'No free code in '+esc(csLeagueName(key)):'No available codes'}</option>`,n:0,key};
      return{html:`<option value="" selected>— No code —</option>${L.map(e=>`<option value="${e.id}">${tab==='comp'?'Slot '+(slotOf(e.id)||'—'):e.id}${e.pes||e.opt?' · '+esc(e.pes||e.opt):''}${e.from?' (freed from '+esc(e.from)+')':''}${tab==='team'&&nameFixed(e.id)?(nameFixed(e.id)===2?' · name fixed by the game':' · name may be fixed'):''}</option>`).join('')}`,n:L.length,key}};
    return subs+`<div class="row" style="margin-bottom:8px;gap:10px;flex-wrap:wrap">${codeFind(tab,'Find a '+noun)}${tab==='team'?codeCompSel():''}<span class="small muted">${un.length} ${noun}${un.length===1?'':'s'} with no code · ${free.length} free ${tab==='comp'?'slots':'codes'} to give</span></div>`
     +codeTable([tab==='team'?'Team':'Competition',tab==='team'?'Competition':'Type','Status','Give it a code',''],shown.slice(0,lim).map(x=>{const fo=foFor(x);return `<tr data-x="${x.id}"><td colspan="1"><button class="tocid" data-act="${tab==='team'?'tocTeam':'tocComp'}" data-id="${x.id}">${esc(x.name)}</button></td>
       <td class="small muted">${tab==='team'?esc(compName(x.compId)||'—'):(isCupComp(x)?'Cup':'League')}</td>
       <td class="small">${x.parked?'kept out of the game':+x.gameId?'code '+x.gameId+' is not one the game has':x.noCode?'lost its code':'no code yet'}</td>
       <td><select class="code-sel" data-cur="" aria-label="A code for ${esc(x.name)}" ${fo.n?'':'disabled'}>${fo.html}</select>${fo.key?`<div class="small muted">${fo.n?'Only the codes of '+esc(csLeagueName(fo.key))+' are offered: the league a team plays in is its code':'Every code of this league is held: free one by giving its team another league or code, or file this team under another league'}</div>`:''}</td>${codeApplyTd('codeFileApply',`data-kind="${tab}" data-x="${x.id}"`)}</tr>`}),`Every ${noun} has a code.`)+codeMoreHTML(shown.length,lim)}
  const rows=codeRows(tab).filter(r=>!r.none&&codePreset(tab,r.id));const avail=new Map(codeAvail(tab).map(e=>[e.id,e]));
  // Teams: the competition filter keeps the codes whose club, now or in the option file, plays in that competition
  const fc=tab==='team'?S.comps[(S.ui.codeF||{}).comp]:null;const inC=fc?new Set(compMembers(fc).map(t=>t.id)):null;
  const origAt=new Map();if(fc)Object.values(S.teds||{}).forEach(x=>{if(!x.generated&&+x.tedTeamId&&S.teams[x.id])(origAt.get(+x.tedTeamId)||origAt.set(+x.tedTeamId,[]).get(+x.tedTeamId)).push(x.id)});
  if(tab==='comp')rows.sort((a,b)=>(slotOf(a.id)||999)-(slotOf(b.id)||999)||a.id-b.id);
  const onlyFree=tab==='team'&&((S.ui.codeF||{}).show||'free')==='free';
  const shown=rows.filter(r=>(!onlyFree||!r.held.length)&&(!q||norm([tab==='comp'?slotOf(r.id):r.id,r.opt,r.pes,...r.held.map(x=>x.name)].join(' ')).includes(q))&&(!inC||r.held.some(x=>inC.has(x.id))||(origAt.get(r.id)||[]).some(id=>inC.has(id))));
  const optsFor=r=>{const cur=r.held[0];const list=[...(cur?[cur]:[]),...un.filter(x=>(!cur||x.id!==cur.id)&&(tab!=='team'||codeLeagueOk(x,r.id)))];// only teams of the code's own league
    return `<option value="" ${cur?'':'selected'}>— Free —</option>${list.map(x=>`<option value="${x.id}" ${cur&&x.id===cur.id?'selected':''}>${esc(x.name)}${x===cur?'':x.parked?' (kept out of the game)':tab==='comp'?' (no slot in the game)':+x.gameId?' (code '+x.gameId+', no place in the game)':' (no code)'}</option>`).join('')}`};
  return subs+`<div class="row" style="margin-bottom:8px;gap:10px;flex-wrap:wrap">${codeFind(tab,'Find a '+(tab==='comp'?'slot':'code')+' or name')}${tab==='team'?`<select data-ch="codeShow" aria-label="Which codes">${opts([['free','Free codes'],['all','All team codes']],onlyFree?'free':'all')}</select>${codeCompSel()}`:''}
    <span class="small muted">${rows.length} ${tab==='comp'?'slots':'codes'} the game has · ${rows.filter(r=>!r.held.length).length} free</span></div>`
   +codeTable(tab==='comp'?['Slot','In Option File','Your Update','']:['Code','In PES','In Option File','Your Update',''],shown.slice(0,lim).map(r=>{const e=avail.get(r.id);return `<tr data-code="${r.id}"><td><b>${tab==='comp'?(slotOf(r.id)||'—'):r.id}</b></td>
      ${tab==='comp'?'':`<td>${codeInPes(tab,r.id,r.pes,r.league)}</td>`}<td>${r.opt?esc(r.opt):'<span class="muted">—</span>'}</td>
      <td><select class="code-sel" data-kind="${tab}" data-code="${r.id}" data-cur="${r.held[0]?r.held[0].id:''}" aria-label="Who gets ${codeNo(tab,r.id)}">${optsFor(r)}</select>${r.held.length>1?` <span class="sev err" title="${esc(r.held.map(x=>x.name).join(', '))}">held twice</span>`:''}${r.held[0]&&r.held[0].codeSet?' <span class="tag t-upd" title="Set on this page">set</span>':''}${r.held.length?'':' '+FREE_TAG(e?'Freed from '+(e.from||'')+': '+codeNameList(e).length+' image names the game has':'No file holds it')}</td>
      ${codeApplyTd('codeRowApply',`data-kind="${tab}" data-code="${r.id}"`)}</tr>`}),onlyFree?'No free codes'+(fc?' in this competition':'')+'. Choose "All team codes" to see every code.':'No codes match.')+codeMoreHTML(shown.length,lim)}
// --- Images ---
// Deleted/ignored images (free codes): names the game has that no file writes to now. Apply renames the chosen image with no
// code to that name: it is written under it at export, over what the game has there.
function codeImgFreeTable(D,q,cls,lim){const list=D.given.concat(D.free).filter(r=>(!cls||r.cls===cls)&&(!q||norm(r.name+' '+r.opt+' '+(r.holder?r.holder.o.name:'')).includes(q)));
  return codeTable(['Code','Kind','Deleted/ignored from','Give it to',''],list.slice(0,lim).map(r=>{const h=r.holder,un=D.un.filter(u=>u.cls===r.cls).slice(0,150);
    return `<tr data-name="${esc(r.key)}"><td style="overflow-wrap:anywhere"><b>${esc(r.name)}</b></td><td class="small muted">${esc(IMG_CLS_LBL[r.cls]||'')}</td>
     <td>${r.opt?esc(r.opt)+`<div class="small muted">${esc(r.label)}</div>`:`<span class="small muted">${esc(r.label||'—')}</span>`}</td>
     <td>${h?`<div style="margin-bottom:4px">${imgCell(h.img)}<div class="small muted">${esc(h.o.name)} · ${esc(imgSlotLabel(h.o,h.kind,h.k))}</div></div>`:''}<select class="code-sel" data-cur="${h?'cur':''}" aria-label="Which image is renamed to ${esc(r.name)}">${h?'<option value="cur" selected>Keep this image</option><option value="">— Free —</option>':'<option value="" selected>— Free —</option>'}${un.map(u=>`<option value="${esc(u.key)}">${esc(u.o.name)} · ${esc(u.label)} (no code)</option>`).join('')}</select>${h?' <span class="tag t-upd" title="Renamed on this page">renamed</span>':' '+FREE_TAG('No file writes to this image name')}</td>
     ${codeApplyTd('imgCodeApply',`data-name="${esc(r.key)}"`)}</tr>`}),'No free image names yet: they come from codes freed on this page and from images deleted or ignored in the health check.',190)+codeMoreHTML(list.length,lim)}
const imgCell=id=>id&&S.images[id]?`<span class="row" style="gap:6px;flex-wrap:nowrap">${imgThumb(id)}<span class="small">${esc(S.images[id].name||'')}</span></span>`:'<span class="muted small">no image</span>';
const imgClsSel=()=>`<select data-ch="codeImgCls" aria-label="Kind of image"><option value="">All kinds</option>${opts(Object.entries(IMG_CLS_LBL),(S.ui.codeF||{}).cls||'')}</select>`;
function codeImgHTML(q){const sub=codeSubOf('img'),lim=S.ui.codeAll?1e9:200;const D=imgCodeData();const cls=(S.ui.codeF||{}).cls||'';
  const subs=codeSubsHTML('img',[['codes','Deleted/ignored images (free codes) ('+D.free.length+')'],['files','Images with no code ('+D.un.length+')']]);
  if(sub==='files'){const shown=D.un.filter(u=>(!cls||u.cls===cls)&&(!q||norm(u.o.name+' '+u.label+' '+(S.images[u.img].name||'')).includes(q)));
    return subs+`<div class="row" style="margin-bottom:8px;gap:10px;flex-wrap:wrap">${codeFind('img','Find a team or image')}${imgClsSel()}<span class="small muted">${D.un.length} image${D.un.length===1?'':'s'} with no name in the game · ${D.free.length} free image names to give</span></div>`
     +codeTable(['Image','Where it is used','Status','Rename it to',''],shown.slice(0,lim).map(u=>{const fr=D.free.filter(r=>r.cls===u.cls);return `<tr data-key="${esc(u.key)}"><td>${imgCell(u.img)}</td>
       <td><button class="tocid" data-act="${imgIsT(u.o)?'tocTeam':'tocComp'}" data-id="${u.o.id}">${esc(u.o.name)}</button><div class="small muted">${esc(u.label)}</div></td>
       <td class="small">${u.o.noCode||u.o.parked?'its '+(imgIsT(u.o)?'team':'competition')+' has no code':'goes in under a new name, which takes image space'}</td>
       <td><select class="code-sel" data-cur="" aria-label="An image name for ${esc(u.o.name)} ${esc(u.label)}"><option value="" selected>— No code —</option>${fr.slice(0,300).map(r=>`<option value="${esc(r.key)}">${esc(r.name)}${r.opt?' (was '+esc(r.opt)+')':''}</option>`).join('')}</select></td>${codeApplyTd('imgFileApply',`data-key="${esc(u.key)}"`)}</tr>`}),'Every image goes in under a name the game has.',190)+codeMoreHTML(shown.length,lim)}
  return subs+`<div class="row" style="margin-bottom:8px;gap:10px;flex-wrap:wrap">${codeFind('img','Find an image name')}${imgClsSel()}<span class="small muted">${D.free.length} free image names${D.given.length?' · '+D.given.length+' given on this page':''} · ${D.un.length} image${D.un.length===1?'':'s'} with no code</span></div>`+codeImgFreeTable(D,q,cls,lim)}
// --- Free codes ---
function codeFreeHTML(q){const sub=codeSubOf('free'),lim=S.ui.codeAll?1e9:200;const D=imgCodeData();const F={comp:codeFreeAll('comp'),team:PES21_TEAMS?codeFreeAll('team'):[]};
  const nP=pcFreeCount();const subs=codeSubsHTML('free',[['comp','Competitions ('+F.comp.length+')'],['team','Teams ('+F.team.length+')'],['pl','Players'+(nP==null?'':' ('+nP+')')],['img','Images ('+D.free.length+')']]);
  if(sub==='pl')return subs+codePlHTML(q,'free');
  if(sub==='img'){const cls=(S.ui.codeF||{}).cls||'';
    return subs+`<div class="row" style="margin-bottom:8px;gap:10px;flex-wrap:wrap">${codeFind('free','Find an image name')}${imgClsSel()}<span class="small muted">${D.free.length} free image names · ${D.un.length} image${D.un.length===1?'':'s'} with no code</span></div>`
     +codeImgFreeTable(D,q,cls,lim)}
  const kind=sub==='team'?'team':'comp';if(kind==='team'&&!PES21_TEAMS)return subs+'<p class="muted">Reading PES 2021\'s team list…</p>';const un=codeUncoded(kind);
  const shown=F[kind].filter(e=>!q||norm([kind==='comp'?slotOf(e.id):e.id,e.pes,codeOptName(kind,e.id),e.from].join(' ')).includes(q));
  return subs+`<div class="row" style="margin-bottom:8px;gap:10px;flex-wrap:wrap">${codeFind('free','Find a '+(kind==='comp'?'slot':'code')+' or name')}<span class="small muted">${F[kind].length} free ${kind==='comp'?'slots':'codes'} · ${un.length} ${kind==='team'?'team':'competition'}${un.length===1?'':'s'} with no code</span></div>`
   +codeTable(kind==='comp'?['Slot','In Option File','Freed from','Give it to','']:['Code','In PES','In Option File','Freed from','Give it to',''],shown.slice(0,lim).map(e=>{const rec=e.fromId?(kind==='team'?S.teams:S.comps)[e.fromId]:null;const opt=codeOptName(kind,e.id);
     const optTd=`<td>${opt?esc(opt):'<span class="muted">—</span>'}</td>`;
     return `<tr data-code="${e.id}"><td><b>${kind==='comp'?(slotOf(e.id)||'—'):e.id}</b></td>${kind==='team'?`<td>${codeInPes(kind,e.id,e.pes,e.league)}</td>`:''}${optTd}
      <td>${rec?`<button class="tocid" data-act="${kind==='team'?'tocTeam':'tocComp'}" data-id="${rec.id}">${esc(rec.name)}</button> <span class="small muted">${rec.parked?'kept out of the game':'no code'}</span>`:e.from?`${esc(e.from)} <span class="small muted">${e.deleted?'deleted':'gone'}</span>`:'<span class="small muted">never used</span>'}</td>
      <td><select class="code-sel" data-kind="${kind}" data-code="${e.id}" data-cur="" aria-label="Who gets ${codeNo(kind,e.id)}"><option value="" selected>— Free —</option>${un.map(x=>`<option value="${x.id}">${esc(x.name)}${x.parked?' (kept out of the game)':''}</option>`).join('')}</select></td>
      ${codeApplyTd('codeRowApply',`data-kind="${kind}" data-code="${e.id}"`)}</tr>`}),'No free '+(kind==='comp'?'slots':'codes')+'.')+codeMoreHTML(shown.length,lim)}
VIEWS.codes=()=>{const tab=['comp','team','pl','img','free'].includes(S.ui.codeTab)?S.ui.codeTab:'comp',q=norm((S.ui.codeF||{}).q||'');
  if(!PES21_TEAMS){pes21Teams().then(()=>{if(location.hash==='#codes')rerender()})}
  return `<h1>Game codes</h1><p class="sub">${codeIntro[tab]} <b>Game Codes</b> lists what the game has, with who holds each in <b>Your Update</b>; <b>Files with no Codes</b> lists your files that have none. Choose another and press <b>Apply</b>.</p><div class="row end" style="margin:-4px 0 10px">${roomBtn()}</div>${codeTabsHTML(tab)}${tab==='team'?codeNoFileHTML():''}${tab==='free'?codeFreeHTML(q):tab==='img'?codeImgHTML(q):tab==='pl'?codePlHTML(q,'pl'):codeKindHTML(tab,q)}`};
// Teams: clubs whose squads list players no game file has (the same finding as the health check and the export notes)
function codeNoFileHTML(){let F;try{F=noFileFind()}catch(e){return ''}const bad=F.bad;
  if(!bad.length)return F.scan?'<p class="small muted">Checking the teams against the game files…</p>':'';const n=bad.reduce((a,b)=>a+b[1].length,0);
  return `<div class="card" style="margin-bottom:12px"><b>${n} player${n===1?'':'s'} in ${bad.length} team${bad.length===1?'':'s'} that no game file has.</b> <span class="small">A team file can't add a player to the game, so the export leaves them out. Give them the codes of players the game has that no team uses any more: <a href="#" data-act="pcOpen" data-id="">Players → Players with no Codes</a>.${F.scan?' Still checking…':''}</span><details class="small" style="margin-top:6px"><summary>By team</summary>${bad.map(([t,L])=>`<div><a href="#" data-act="pcOpen" data-id="${esc(t.id+'|'+L[0].id)}">${esc(t.name)}</a> (${L.length}): <span class="muted">${L.map(x=>esc(x.name)).join(', ')}</span></div>`).join('')}</details></div>`}
// --- Players: the same two tables as Teams. Game Codes: every player code the game has, with who holds it in Your Update.
// Players with no Codes: every player no game file has, with the free code suggested for him.
const pcWaitHTML=()=>`<p class="muted" role="status">Reading the players the game has from the team files… <span id="pc-prog">${PC.run&&PC.of?PC.n+' of '+PC.of+' team files':''}</span></p>`;
function pcState(){const F=noFileFind();const ok=pcReady();if(!ok)pcLoadAll();return ok&&!F.scan}
// free player codes, or null while the files are still being read (never starts the reading)
function pcFreeCount(){if(!pcReady()||nfTeams().some(t=>!noFileOf(t)))return null;const H=pcHeld();let n=0;pcGame().forEach(g=>{if(!H.has(g.pid))n++});return n}
const pcLbl=g=>`${g.pid} · ${g.name}${g.pos?' ('+g.pos+')':''} · ${g.files[0].club}`;
const pcKey=g=>g.k||(g.k=(g.files[0].club+'|'+g.name).toLowerCase());
function codePlHTML(q,mode){const ready=pcState();const need=ready?pcNeedy():[];
  const subs=mode==='free'?'':codeSubsHTML('pl',[['codes','Game Codes'],['files','Players with no Codes'+(ready?' ('+need.length+')':'')]]);
  if(!ready)return subs+pcWaitHTML();
  const sub=mode==='free'?'codes':codeSubOf('pl'),lim=S.ui.codeAll?1e9:200;const G=pcGame(),H=pcHeld(),P=pcPlan();
  const fc=S.comps[(S.ui.codeF||{}).comp];const inC=fc?new Set(compMembers(fc).map(t=>t.id)):null;const codeC=inC?new Set(teamsArr().filter(t=>inC.has(t.id)&&+t.gameId).map(t=>+t.gameId)):null;
  const free=[],freeBy=new Map();G.forEach(g=>{if(H.has(g.pid))return;free.push(g);g.files.forEach(f=>(freeBy.get(f.team)||freeBy.set(f.team,[]).get(f.team)).push(g))});
  if(sub==='files'){const shown=need.filter(({t,p})=>(!q||norm(p.name+' '+t.name).includes(q))&&(!inC||inC.has(t.id)));const sug=shown.filter(x=>P.has(x.p.id));S.ui.pcShown=sug.map(x=>x.t.id+'|'+x.p.id);
    return subs+`<div class="row" style="margin-bottom:8px;gap:10px;flex-wrap:wrap">${codeFind('pl','Find a player or team')}${codeCompSel()}<span class="small muted">${need.length} player${need.length===1?'':'s'} with no code · ${free.length} free player codes to give</span>${sug.length?`<button class="sm primary" data-act="pcGiveAll" title="Each player takes the code suggested in his row">Give the suggested code to ${sug.length===need.length?'all '+sug.length:'the '+sug.length+' shown'}</button>`:''}</div>`
     +codeTable(['Player','Team','Status','Give him a code',''],shown.slice(0,lim).map(({t,p})=>{const s=P.get(p.id),x=esc(t.id+'|'+p.id),ln=pcLine(p.pos);const own=(freeBy.get(+t.gameId)||[]).filter(g=>!s||g.pid!==s.g.pid);
        const oth=[];for(const g of free){if(oth.length>=60)break;if((s&&g.pid===s.g.pid)||g.files.some(f=>f.team===+t.gameId))continue;if(pcLine(g.pos)===ln)oth.push(g)}
        const og=(l,L)=>L.length?`<optgroup label="${l}">${L.map(g=>`<option value="${g.pid}">${esc(pcLbl(g))}</option>`).join('')}</optgroup>`:'';
        return `<tr data-x="${x}"><td><b>${esc(p.name)}</b><div class="small muted">${esc(p.pos||'')}</div></td>
         <td><button class="tocid" data-act="tocTeam" data-id="${t.id}">${esc(t.name)}</button></td>
         <td class="small">${p.ted&&+p.ted.pid?'his record ('+p.ted.pid+') is in no game file':'no game file has him'}</td>
         <td><select class="code-sel" data-cur="" aria-label="A code for ${esc(p.name)}"><option value="" selected>— No code —</option>${s?`<option value="${s.g.pid}">Suggested: ${esc(pcLbl(s.g))}</option>`:''}${og('Free at this team\'s code',own)}${og('Other free players',oth)}</select>${s?`<div class="small muted">Suggested: ${esc(pcWhyNote(s,t))}</div>`:'<div class="small muted">No free code is left for him</div>'}</td>${codeApplyTd('pcFileApply',`data-x="${x}"`)}</tr>`}),'Every player is one the game has.',200)+codeMoreHTML(shown.length,lim)}
  const onlyFree=mode==='free'||((S.ui.codeF||{}).show||'free')==='free';const needBy=new Map();need.forEach(x=>(needBy.get(+x.t.gameId)||needBy.set(+x.t.gameId,[]).get(+x.t.gameId)).push(x));
  const rows=(onlyFree?free:[...G.values()]).filter(g=>{const h=H.get(g.pid);return (!q||norm(g.pid+' '+g.name+' '+g.files.map(f=>f.club).join(' ')+(h&&h.p?' '+h.p.name+' '+h.t.name:'')).includes(q))&&(!inC||g.files.some(f=>codeC.has(f.team))||!!(h&&inC.has(h.t.id)))})
    .sort((a,b)=>{const x=pcKey(a),y=pcKey(b);return x<y?-1:x>y?1:0});
  const optsFor=g=>{const L=[];g.files.forEach(f=>(needBy.get(f.team)||[]).forEach(x=>{if(!L.includes(x))L.push(x)}));for(const x of need){if(L.length>=150)break;if(!L.includes(x))L.push(x)}
    return L.map(x=>`<option value="${esc(x.t.id+'|'+x.p.id)}">${esc(x.p.name)}${x.p.pos?' ('+esc(x.p.pos)+')':''} · ${esc(x.t.name)} (no code)</option>`).join('')};
  return subs+`<div class="row" style="margin-bottom:8px;gap:10px;flex-wrap:wrap">${codeFind(mode,'Find a code, player or team')}${mode==='free'?'':`<select data-ch="codeShow" aria-label="Which codes">${opts([['free','Free codes'],['all','All player codes']],onlyFree?'free':'all')}</select>`}${codeCompSel()}
    <span class="small muted">${G.size} player codes the game has · ${free.length} free · ${need.length} player${need.length===1?'':'s'} with no code</span></div>`
   +codeTable(['Code','In Option File','Your Update',''],rows.slice(0,lim).map(g=>{const h=H.get(g.pid);return `<tr data-pid="${g.pid}"><td><b>${g.pid}</b></td>
      <td>${esc(g.name)}<div class="small muted">${esc([g.pos,...new Set(g.files.map(f=>f.club))].filter(Boolean).join(' · '))}</div></td>
      <td><select class="code-sel" data-cur="${h?'cur':''}" aria-label="Who gets player code ${g.pid}">${h?`<option value="cur" selected>${esc(h.p?h.p.name:'a player')} · ${esc(h.t.name)}</option>`:''}<option value="" ${h?'':'selected'}>— Free —</option>${optsFor(g)}</select>${h&&h.p&&h.p.codeSet?' <span class="tag t-upd" title="Given on this page: he is written over '+esc(g.name)+'">set</span>':''}${h?'':' '+FREE_TAG('No team uses this player')}</td>
      ${codeApplyTd('pcRowApply',`data-pid="${g.pid}"`)}</tr>`}),onlyFree?'No free player codes'+(fc?' in this competition':'')+'.':'No codes match.',110)+codeMoreHTML(rows.length,lim)}
ACT.pcOpen=el=>{const x=pcFind(el.dataset.id);S.ui.codeTab='pl';(S.ui.codeSub||(S.ui.codeSub={})).pl='files';const f=S.ui.codeF||(S.ui.codeF={});f.q=x?x.t.name:'';f.comp='';S.ui.codeAll=false;if(location.hash==='#codes')rerender();else location.hash='codes'};
ACT.pcGive=el=>{const x=pcFind(el.dataset.id);const s=x&&pcPlan().get(x.p.id);if(!s){toast('No free player code for him now','err');return}
  histLabel('Player code '+s.g.pid+' to '+x.p.name,'Edit',()=>{pcGive(x.t,x.p,s);pcFlush()});toast(`${x.p.name} takes ${s.why==='own'||s.why==='club'?'':'over '+s.g.name+'\'s '}code ${s.g.pid}`,'ok');rerender()};
/* ----- Players without a code: allocate the free codes, and when none is left, make room (rule book "Player codes") -----
   Every player the game has sits in one or more team files. A code is free when no team of the project uses it. When the
   free codes run out, the only way to get more is to delete teams or competitions you don't want: their players' codes then
   become free (the game keeps those players; their records are taken over). The list ranks what would free the most. */
ACT.pcAllocAll=async()=>{const P=pcPlan();const need=pcNeedy().filter(x=>!pcHasId(x.p)||pcMay(x.p,P.get(x.p.id)));// a player with an ID takes no other player's ID here
  const ids=need.filter(x=>P.has(x.p.id)).map(x=>x.t.id+'|'+x.p.id);const left=need.length-ids.length;
  if(!need.length){toast('Only players who already have an ID are left: find their teams on the health check, or pick an ID for each by hand','err');return}
  if(!ids.length){toast('No free player code is left: delete teams or competitions you don\'t want to make room','err');ACT.pcRoomOpen();return}
  const teams=new Set(need.filter(x=>P.has(x.p.id)).map(x=>x.t.id)).size;
  if(!await ask('Allocate free codes?',`<b>${ids.length}</b> player${ids.length===1?'':'s'} in <b>${teams}</b> team${teams===1?'':'s'} each take the code of a player the game has that no team uses (the one suggested in his row). At the next export each is written over that player and keeps that player's look until you edit it in the game.${left?`<br><br><b>${left}</b> player${left===1?' still has':'s still have'} no code afterwards: there are no more free codes. <b>Make room</b> then opens, with the teams and competitions you could delete to free more.`:''}<br><br>A snapshot is taken first, and you can undo it from the change history.`,'Allocate '+ids.length))return;
  await takeSnapshot('Before allocating '+ids.length+' player codes',true);let k=0;histLabel('Health check: '+ids.length+' player codes allocated','Health',()=>{k=pcGiveMany(ids)});
  toast(k+' player'+(k===1?'':'s')+' now '+(k===1?'has':'have')+' a code'+(left?'; '+left+' still have none: no free code is left':''),left?'':'ok');rerender();if(left)ACT.pcRoomOpen()};
// Make room is a popup, on whatever page needs it: the health check, Game codes, allocation, pool clubs, shared game IDs
ACT.pcRoomOpen=async()=>{if(!pcReady()||noFileFind().scan){modal(`<div class="mhead"><h2>Make room</h2></div><p class="muted">Checking which codes are free…</p>`,true);
    if(!pcReady())await pcLoadAll();for(let i=0;i<3&&noFileFind().scan;i++)await noFileScan(true)}
  await fixedReady();// which teams and competitions the game fixes: they are never offered
  const R=pcRoomData(),need=pcReady()?pcNeedy().length:0;
  modal(`<div class="mhead"><h2>Make room for players without a code</h2></div>
    ${R?pcRoomHTML(R,true):`<p>${need?`Every player without a code can take a free one now.`:'Every player has a code. There is nothing to make room for.'}</p>`}
    <div class="row end" style="margin-top:12px"><button data-act="roomClose">Close</button>${need?`<button class="primary" data-act="roomAlloc">Allocate free codes</button>`:''}</div>`,true)};
ACT.roomClose=()=>{closeModal();rerender()};
// Make room on the Overview and Game codes pages too (the user, 2026-11-22), with an option file in use
const roomBtn=()=>S.settings.ofPkg?`<button class="sm" data-act="pcRoomOpen" title="Which teams and competitions you could delete to free player codes for the players who have none">Make room</button>`:'';
ACT.roomAlloc=async()=>{closeModal();await ACT.pcAllocAll()};
// a delete asks in the same popup window; afterwards (or on Cancel) Make room comes back with the new numbers
ACT.roomDelTeam=async el=>{await ACT.delTeam(el);PCV++;_PCP.k='';ACT.pcRoomOpen()};
ACT.roomDelComp=async el=>{await ACT.delComp(el);PCV++;_PCP.k='';ACT.pcRoomOpen()};
ACT.roomOpenTeam=el=>{closeModal();ACT.openTeam(el)};
// what each team or competition would free if deleted: the codes only its squads use
function pcRoomData(){if(!pcReady()||noFileFind().scan)return null;const need=pcNeedy();if(!need.length)return null;const P=pcPlan();const left=need.length-need.filter(x=>P.has(x.p.id)).length;if(!left)return null;
  const G=pcGame();const by=new Map();const ts=teamsArr().filter(t=>!t.sameAs&&!t.noCode);
  ts.forEach(t=>{const c=NOFILE.get(t.id);const pids=c&&c.k===nfKey(t)?c.used.map(u=>u[0]):(t.players||[]).map(p=>p.ted&&+p.ted.pid).filter(Boolean);new Set(pids).forEach(pid=>{if(!G.has(pid))return;(by.get(pid)||by.set(pid,new Set()).get(pid)).add(t.id)})});
  const frees=t=>{let n=0;by.forEach((set,pid)=>{if(set.size===1&&set.has(t.id))n++});return n};
  const needT=new Set(need.map(x=>x.t.id));const legend=t=>/legend|icon|classic|all.?star|veteran/i.test(t.name+' '+compName(t.compId));
  const teams=ts.filter(t=>!needT.has(t.id)&&!isNationalTeam(t)&&!teamFixed(t)).map(t=>({t,n:frees(t),why:legend(t)?'classic side':!isLeagueComp(S.comps[t.compId])?'in no league':''})).filter(x=>x.n>0)
    .sort((a,b)=>(!!b.why-!!a.why)||b.n-a.n);
  const comps=compsArr().filter(c=>!c.noCode&&!compLockWhy(c)).map(c=>{const cl=ts.filter(t=>t.compId===c.id&&!isNationalTeam(t));return{c,cl,n:cl.reduce((a,t)=>a+frees(t),0),blocked:cl.some(t=>needT.has(t.id))}}).filter(x=>x.n>0&&!x.blocked).sort((a,b)=>b.n-a.n);
  return{left,teams,comps}}
function pcRoomHTML(R,pop){const row=(cells,acts)=>`<tr>${cells.map(c=>`<td>${c}</td>`).join('')}<td style="text-align:right;white-space:nowrap">${acts}</td></tr>`;
  return `<p class="why"><b>${R.left}</b> player${R.left===1?' has':'s have'} no code, and every player the game has is in one of your teams. Deleting a team or competition you don't want frees the codes only its teams use: the game keeps those players, and your players take them over. Each delete asks first and takes a snapshot. Then press <b>Allocate free codes</b>.</p>
   <div style="padding:${pop?'0':'0 14px 12px'};display:grid;gap:14px">
   <div><b class="small">Teams</b><div class="tw" style="max-height:320px;margin-top:6px"><table><thead><tr><th>Team</th><th>Competition</th><th class="num">Frees</th><th></th></tr></thead><tbody>
   ${R.teams.slice(0,60).map(x=>row([`${esc(x.t.name)}${x.why?` <span class="tag t-upd">${x.why}</span>`:''}`,`<span class="small muted">${esc(compName(x.t.compId)||'—')}</span>`,`<b>${x.n}</b>`],`<button class="sm" data-act="${pop?'roomOpenTeam':'openTeam'}" data-id="${x.t.id}">Open</button><button class="sm danger" data-act="${pop?'roomDelTeam':'delTeam'}" data-id="${x.t.id}">Delete</button>`)).join('')||'<tr><td colspan="4" class="muted small">No team would free a code.</td></tr>'}</tbody></table></div></div>
   <div><b class="small">Competitions</b> <span class="small muted">(with their teams)</span><div class="tw" style="max-height:320px;margin-top:6px"><table><thead><tr><th>Competition</th><th class="num">Teams</th><th class="num">Frees</th><th></th></tr></thead><tbody>
   ${R.comps.slice(0,40).map(x=>row([esc(x.c.name),String(x.cl.length),`<b>${x.n}</b>`],compDelBtn(x.c,pop?'roomDelComp':'delComp','sm danger','Delete…'))).join('')||'<tr><td colspan="4" class="muted small">No competition would free a code.</td></tr>'}</tbody></table></div></div></div>`}
ACT.pcGiveAll=async()=>{const ids=S.ui.pcShown||[];const P=pcPlan();const n=ids.filter(id=>{const x=pcFind(id);return x&&P.has(x.p.id)}).length;if(!n)return;
  if(!await ask('Give the suggested codes?',`<b>${n}</b> player${n===1?'':'s'} each take the code of a player the game has that no team uses any more. At the next export they are written over those players; each keeps the replaced player's look until you edit it in the game. You can undo this from the change history.`,'Give '+n))return;
  await takeSnapshot('Before giving '+n+' player codes',true);let k=0;histLabel('Game codes: '+n+' player codes given','Edit',()=>{k=pcGiveMany(ids)});toast(k+' player'+(k===1?'':'s')+' now '+(k===1?'has':'have')+' a code the game has','ok');rerender()};
ACT.pcFileApply=el=>{const x=pcFind(el.dataset.x);const s=el.closest('tr').querySelector('.code-sel');const g=s&&pcGame().get(+s.value);if(!x||!g)return;if(pcHeld().has(g.pid)){toast('That code is held now','err');rerender();return}
  histLabel('Player code '+g.pid+' to '+x.p.name,'Edit',()=>{pcGive(x.t,x.p,{g,why:'free'});pcFlush()});toast(`${x.p.name} takes over ${g.name}'s code (${g.pid})`,'ok');rerender()};
ACT.pcRowApply=el=>{const pid=+el.dataset.pid,g=pcGame().get(pid);const s=el.closest('tr').querySelector('.code-sel');if(!g||!s||s.value==='cur')return;const h=pcHeld().get(pid);const x=s.value?pcFind(s.value):null;if(s.value&&!x)return;
  histLabel('Player code '+pid+(x?' to '+x.p.name:' freed'),'Edit',()=>{if(h&&h.p)pcLose(h.t,h.p);if(x)pcGive(x.t,x.p,{g,why:'free'});pcFlush()});
  toast(x?`${x.p.name} takes over ${g.name}'s code (${pid})${h&&h.p?'; '+h.p.name+' lost it':''}`:`Player code ${pid} is free${h&&h.p?'; '+h.p.name+' lost it':''}`,'ok');rerender()};
ACT.codeSub=el=>{(S.ui.codeSub||(S.ui.codeSub={}))[el.dataset.tab]=el.dataset.sub;S.ui.codeAll=false;rerender()};
CH.codeShow=el=>{(S.ui.codeF||(S.ui.codeF={})).show=el.value;S.ui.codeAll=false;rerender()};
CH.codeImgCls=el=>{(S.ui.codeF||(S.ui.codeF={})).cls=el.value;S.ui.codeAll=false;rerender()};
// Files with no Codes: a competition or team takes the free code chosen in its row
ACT.codeFileApply=async el=>{const kind=el.dataset.kind,x=(kind==='team'?S.teams:S.comps)[el.dataset.x];const s=el.closest('tr').querySelector('.code-sel');if(!x||!s||!s.value)return;const id=+s.value;
  if(kind==='team'&&codeLeagueStop(x,id))return;
  await takeSnapshot('Before giving code '+id+' to '+x.name,true);const info=codeTakeNote(kind,id);const lost=codeAssign(kind,x,id);const pn=kind==='team'?await pcTeamTake(x):'';toast(`${x.name} now has ${codeNo(kind,id)}${lost.length?'; '+lost.join(', ')+' lost it':''}${info}${pn}`,'ok');rerender()};
// Images. A free image name goes to an image without one (its file is then written under that name). A name a file already
// holds takes the chosen image into that file's place: the image that was there stays in the library.
const imgCodeSet=(u,r)=>{(S.settings.imgCodes||(S.settings.imgCodes={}))[u.key]={name:r.name,path:r.path,from:r.opt||'',was:(S.images[u.img]||{}).name||''};saveSettings();
  const im=S.images[u.img];if(im){im.name=r.name.replace(/\.[a-z0-9]+$/i,'');saveImage(im)}};
ACT.imgCodeApply=async el=>{const D=imgCodeData();const r=D.rows.find(x=>x.key===el.dataset.name);const s=el.closest('tr').querySelector('.code-sel');if(!r||!s)return;const v=s.value;
  if(v===''){if(r.holder&&r.holder.set){const k=imgSlotKey(r.holder.o,r.holder.kind,r.holder.k),ov=S.settings.imgCodes[k],im=S.images[r.holder.img];if(im&&ov&&ov.was){im.name=ov.was;saveImage(im)}delete S.settings.imgCodes[k];saveSettings();toast(r.name+' is free again; the image has its old name back','ok')}rerender();return}
  const u=D.un.find(x=>x.key===v);if(!u)return;
  if(r.holder){const h=r.holder;await takeSnapshot('Before changing the image at '+r.name,true);histLabel('Game codes: '+r.name+' takes the image of '+u.o.name,'Edit',()=>imgSlotSet(h.o,h.kind,h.k,u.img));toast(`${r.name} now takes the ${u.label.toLowerCase()} image of ${u.o.name}`,'ok')}
  else{imgCodeSet(u,r);toast(`${u.o.name}'s ${u.label.toLowerCase()} is renamed to ${r.name}: it goes in over what the game has there`,'ok')}rerender()};
ACT.imgFileApply=el=>{const D=imgCodeData();const u=D.un.find(x=>x.key===el.dataset.key);const s=el.closest('tr').querySelector('.code-sel');const r=s&&D.free.find(x=>x.key===s.value);if(!u||!r)return;
  imgCodeSet(u,r);toast(`${u.o.name}'s ${u.label.toLowerCase()} is renamed to ${r.name}: it goes in over what the game has there`,'ok');rerender()};
// choosing another in Your Update shows that row's Apply (no redraw, so other choices in progress stay)
document.addEventListener('change',e=>{const s=e.target;if(!s||!s.classList||!s.classList.contains('code-sel'))return;const b=s.closest('tr').querySelector('.code-apply');if(b)b.hidden=s.value===s.dataset.cur});
ACT.codeRowApply=async el=>{const kind=el.dataset.kind,id=+el.dataset.code;const s=el.closest('tr').querySelector('.code-sel');if(!s)return;const v=s.value;
  if(kind==='team'&&v&&codeLeagueStop(S.teams[v],id))return;
  const L=kind==='team'?S.teams:S.comps;const held=(kind==='team'?teamsArr().filter(t=>!t.sameAs):compsArr()).filter(x=>+x.gameId===id&&x.id!==v);
  // a competition that loses its slot: keep it and its clubs out of the game, or delete them (rule book, "Free codes")
  let how='';if(kind==='comp'&&held.length){how=await codeLoseAsk(held,v?L[v]:null,id);if(!how)return}
  await takeSnapshot('Before changing code '+id,true);const info=codeTakeNote(kind,id);
  if(!v){histLabel('Game codes: code '+id+' freed','Edit',()=>held.forEach(o=>{codeRecord(kind,o);o.gameId='';o.noCode=true;o.codeSet=true;kind==='team'?saveTeam(o):saveComp(o)}));
    toast((kind==='comp'?'Slot '+(slotOf(id)||id):'Code '+id)+' is free'+(held.length?'; '+held.map(x=>x.name).join(', ')+' lost it':''),'ok')}
  else{const x=L[v];if(!x)return;const lost=codeAssign(kind,x,id);const pn=kind==='team'?await pcTeamTake(x):'';toast(`${x.name} now has ${kind==='comp'?'slot '+(slotOf(id)||id):'code '+id}${lost.length?'; '+lost.join(', ')+' lost it':''}${info}${pn}`,'ok')}
  if(how)codeRetire(held,how);
  rerender()};
// A place in the game: a code the game knows (PES 2021's team list, the option file's own team and competition files, the game's
// known competition codes) or one you set on Game codes. The rest get "No place in the game" and "Allocate a slot", which opens
// Game codes with the picker for it.
function placeSets(){const T=new Set((PES21_TEAMS||[]).map(x=>+x.id));Object.values(S.teds||{}).forEach(r=>{if(!r.generated&&+r.tedTeamId)T.add(+r.tedTeamId)});
  const C=new Set(KNOWN_COMP_IDS);compsArr().forEach(c=>{if(c.ced&&!c.ced.generated&&+c.ced.compId)C.add(+c.ced.compId)});
  // the installed option file's codes are in the game, even once their club or competition is deleted in the studio
  const B=codeOptBase();B.T.forEach((n,i)=>T.add(i));B.C.forEach((n,i)=>C.add(i));return{T,C}}
let _PLACE={k:'',v:null};const placeOf=()=>{codeOptBase();const k=Object.keys(S.teds||{}).length+'|'+compsArr().length+'|'+(PES21_TEAMS?PES21_TEAMS.length:0)+'|'+_OPTB.k;if(_PLACE.k!==k)_PLACE={k,v:placeSets()};return _PLACE.v};
function placeTag(kind,x){if(!x)return'';if(kind==='team'&&!PES21_TEAMS){pes21Teams().then(()=>{if(/^#(teams|competitions)/.test(location.hash||'#'))rerender()})}
  if(kind==='team'&&x.sameAs)return '<span class="small muted">cup copy: uses its league club\'s code</span>';
  if(kind==='comp'&&ofGameComp(x))return '<span class="tag t-add" title="One of the game\'s own competitions (the option file names it by its folder; its code isn\'t in any file)">In the game</span>';
  const id=+x.gameId;const ok=codePlaced(kind,x);
  const no=shownNo(kind,id)||id;return ok?`<span class="tag t-add" title="${kind==='team'?'Team code '+id:'Slot '+no+' (code '+id+')'}: it has a place in the game${x.codeSet?' (set on Game codes)':''}">In the game · ${no}</span>`
    :`<span class="tag t-mov" title="${x.noCode?'Its code went to another on Game codes':id?'Code '+id+' is not one the game has: the game would add it as a new '+(kind==='team'?'team':'competition'):'No code yet'}">No place in the game</span> <button class="sm" data-act="codeAlloc" data-kind="${kind}" data-x="${x.id}">Allocate a slot</button>`}
ACT.codeAlloc=el=>{const kind=el.dataset.kind,x=el.dataset.x;S.ui.codeTab=kind;location.hash='codes';setTimeout(()=>ACT.codeGive({dataset:{kind,x}}),80)};
ACT.codeOpen=el=>{S.ui.codeTab='team';location.hash='codes'};
ACT.codeTab=el=>{S.ui.codeTab=el.dataset.tab;S.ui.codeAll=false;rerender()};
CH.codeComp=el=>{(S.ui.codeF||(S.ui.codeF={})).comp=el.value;S.ui.codeAll=false;rerender()};
ACT.codeMore=()=>{S.ui.codeAll=true;rerender()};
IN.codeQ=el=>{(S.ui.codeF||(S.ui.codeF={})).q=el.value;clearTimeout(S.ui.codeT);S.ui.codeT=setTimeout(()=>{rerender();const i=$('[data-in=codeQ]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)};

// a club or competition without a code: choose a code for it (a free one, or any)
ACT.codeGive=el=>{const kind=el.dataset.kind,x=(kind==='team'?S.teams:S.comps)[el.dataset.x];if(!x)return;const lk=kind==='team'?teamLeagueKey(x):'';const rows=codeRows(kind).filter(r=>!r.none&&(kind!=='team'||codeLeagueOk(x,r.id)));
  modal(`<div class="mhead"><h2>A code for ${esc(x.name)}</h2></div><p class="small">Free codes first. A code another one holds moves to ${esc(x.name)}, and that one loses it.${lk?' Only the codes of '+esc(csLeagueName(lk))+' are listed: the league a team plays in is its code.':''}</p>
    <select id="code-pick2" size="12" style="width:100%">${(()=>{const av=new Map(codeAvail(kind).map(e=>[e.id,e]));return rows.sort((a,b)=>(av.has(b.id)-av.has(a.id))||(a.held.length-b.held.length)||a.id-b.id).map(r=>{const e=av.get(r.id);return `<option value="${r.id}">${kind==='comp'?'Slot '+(slotOf(r.id)||'—'):r.id} · ${esc(r.opt||r.pes||'')}${e?' (free code: from '+esc(e.from)+(codeNameList(e).length?', '+codeNameList(e).length+' image names':'')+')':r.held.length?' (held by '+esc(r.held.map(h=>h.name).join(', '))+')':' (free)'}</option>`}).join('')})()}</select>
    <div class="row end" style="margin-top:12px"><button data-act="close">Cancel</button><button class="primary" data-act="codeApply2" data-kind="${kind}" data-x="${x.id}">Give this code</button></div>`)};
// a team never takes a code of another league than the one it is filed under (codeLeagueOk): refused before anything changes
const codeLeagueStop=(t,id)=>{if(!t||codeLeagueOk(t,id))return false;const pn=pesTeamName(id);
  toast(`Code ${id}${pn?' ('+pn+')':''} belongs to ${csLeagueName(slotLeagueOf(id))} in the game, and ${t.name} is filed under ${compName(t.compId)}. A team's league is its code: give it a code of its own league, or file it under ${csLeagueName(slotLeagueOf(id))} first.`,'err');return true};
function codeAssign(kind,x,id){const L=kind==='team'?teamsArr().filter(t=>!t.sameAs):compsArr();const lost=[];
  histLabel('Game codes: code '+id+' to '+x.name,'Edit',()=>{L.forEach(o=>{if(o.id!==x.id&&+o.gameId===id){codeRecord(kind,o);o.gameId='';o.noCode=true;o.codeSet=true;lost.push(o.name);kind==='team'?saveTeam(o):saveComp(o)}});
    if(+x.gameId&&+x.gameId!==id)codeRecord(kind,x);
    // the code brings its image names to its new holder: an image given one of them on its own gives it back
    {const e=codeBook(kind)[id],M=S.settings.imgCodes;if(e&&M){const ns=new Set(codeNameList(e).map(n=>String(n).toLowerCase()));Object.keys(M).forEach(k=>{if(ns.has(String(M[k].name).toLowerCase()))delete M[k]});saveSettings()}}
    x.gameId=kind==='team'?id:String(id);x.codeSet=true;delete x.noCode;delete x.parked;kind==='team'?saveTeam(x):saveComp(x)});return lost}
ACT.codeApply2=async el=>{const kind=el.dataset.kind,x=(kind==='team'?S.teams:S.comps)[el.dataset.x],s=$('#code-pick2');if(!x||!s||!s.value){toast('Choose a code first','err');return}closeModal();
  await takeSnapshot('Before giving code '+s.value+' to '+x.name,true);const info=codeTakeNote(kind,+s.value);const lost=codeAssign(kind,x,+s.value);const pn=kind==='team'?await pcTeamTake(x):'';toast(`${x.name} now has code ${s.value}${lost.length?'; '+lost.join(', ')+' lost it':''}${info}${pn}`,'ok');rerender()};
/* ----- Free codes (rule book, "Free codes"): codes whose holder lost them, and the image names the game has there ----- */
// settings.codeBook[kind][code] = {from, fromId, names, paths, at, deleted}: written when a code is freed or taken, so the names
// outlive the record (kept out of the game, or deleted). A code is free while no record holds it.
const codeBook=kind=>{const b=S.settings.codeBook||(S.settings.codeBook={team:{},comp:{}});return b[kind]||(b[kind]={})};
// the image names (and package paths) the game has at o's code now: its own file's, or those it took over
function codeNamesOf(o,kind){const id=+o.gameId;if(!id)return null;if(o.of&&o.of.names&&codeFileId(o)===id)return{names:clone(o.of.names),paths:clone(o.of.paths||{})};
  const names={kits:[]},paths={kits:[],sponsors:[]};let any=false;
  (kind==='team'?['emblem','manager','stadium','sp1','sp2','sp3']:['emblem']).forEach(k=>{const y=codeImgName(o,k,0);if(!y)return;any=true;names[k]=y.name;if(/^sp/.test(k))paths.sponsors[+k[2]-1]=y.path;else paths[k]=y.path});
  if(kind==='team')for(let k=0;k<5;k++){const y=codeImgName(o,'kit',k);if(y){any=true;names.kits[k]=y.name;paths.kits[k]=y.path}}
  return any?{names,paths}:null}
// only a code the game has is freed: a made-up code (no place in the game) is simply dropped
function codeRecord(kind,o,deleted){const id=+o.gameId;if(!id||!codePlaced(kind,o))return;const B=codeBook(kind),prev=B[id],n=codeNamesOf(o,kind);
  const own=o.of&&codeFileId(o)===id?(kind==='team'?[o.of.ted,...(o.of.copies||[])]:[o.of.ced]).filter(Boolean):[];
  B[id]={from:o.name,fromId:o.id,names:n?n.names:prev?prev.names:null,paths:n?n.paths:prev?prev.paths:null,files:own.length?own:(prev&&prev.files)||null,at:Date.now(),deleted:!!deleted};saveSettings()}
const codeNameList=e=>{const N=(e&&e.names)||{};return [N.emblem,N.manager,N.stadium,N.sp1,N.sp2,N.sp3,...(N.kits||[])].filter(Boolean)};
// free codes: in the code book and held by no one; also codes lost before the book existed (the record still names them)
function codeAvail(kind){const L=kind==='team'?teamsArr().filter(t=>!t.sameAs):compsArr();const held=new Set(L.filter(x=>+x.gameId&&!x.noCode).map(x=>+x.gameId));const m=new Map();
  const P=placeOf(),inGame=id=>(kind==='team'?P.T:P.C).has(+id);
  Object.entries(codeBook(kind)).forEach(([id,e])=>{if(+id&&!held.has(+id))m.set(+id,Object.assign({id:+id},e))});
  L.filter(x=>x.noCode).forEach(x=>{const id=codeFileId(x);if(id&&!held.has(id)&&!m.has(id)&&inGame(id))m.set(id,{id,from:x.name,fromId:x.id,names:x.of&&x.of.names||null,paths:x.of&&x.of.paths||null})});
  return [...m.values()].sort((a,b)=>a.id-b.id)}
const codeTakeNote=(kind,id)=>{const e=codeAvail(kind).find(e=>e.id===+id);const n=e?codeNameList(e).length:0;return n?`; its images go in under ${e.from}'s ${n} image name${n===1?'':'s'}`:''};
// Keep or delete a competition that loses its slot, with its league clubs
function codeLoseAsk(held,to,id){const cl=held.flatMap(c=>teamsArr().filter(t=>t.compId===c.id&&!t.sameAs));const wc=held.some(c=>c.worldCup);const nm=esc(held.map(c=>c.name).join(', '));
  return new Promise(res=>{S.ui.askRes=res;modal(`<div class="mhead"><h2>${nm} loses slot ${slotOf(id)||id}</h2></div>
    <p>${to?esc(to.name)+' takes the slot. ':''}What happens to <b>${nm}</b> and its ${cl.length} team${cl.length===1?'':'s'}?</p>
    <p class="small muted">${cl.length?'Teams: '+esc(cl.map(t=>t.name).join(', ')):'No teams are filed under it in the studio, so only the competition is kept or deleted.'}</p>
    <ul class="small"><li><b>Keep them</b>: the competition, its teams, their players and images stay in the studio with no place in the game, and are left out of every export. You can give them codes again later.</li>
    <li><b>Delete them</b>: the competition, its teams, their players and images are deleted from the studio (a snapshot is taken first).</li></ul>
    <p class="small">Either way their codes and image file names become free codes (Game codes → Free codes) for teams and competitions without a code: one given a free code writes its images under those names, so they overwrite what the game has and take no new space.</p>
    <div class="row end"><button data-act="askNo">Cancel</button><button data-act="codeLoseKeep">Keep them</button>${wc?'':'<button class="danger" data-act="codeLoseDel">Delete them</button>'}</div>`)})}
ACT.codeLoseKeep=()=>{const r=S.ui.askRes;S.ui.askRes=null;closeModal();r&&r('keep')};
ACT.codeLoseDel=()=>{const r=S.ui.askRes;S.ui.askRes=null;closeModal();r&&r('del')};
// the competitions (already without a code) and their league clubs go out of the game: kept with no code, or deleted. Their codes
// and image names go into the code book first.
function codeRetire(comps,how){const del=how==='del';let nT=0;
  histLabel('Game codes: '+comps.map(c=>c.name).join(', ')+(del?' deleted':' kept out of the game'),'Edit',()=>{const imgs=new Set();const addImgs=o=>{[o.emblem,o.managerPhoto,o.stadiumImg,...(o.sponsorImgs||[]),...(o.kits||[]).map(k=>k.img)].forEach(x=>x&&imgs.add(x))};
    comps.forEach(c=>{if(del&&c.worldCup)return;const teams=teamsArr().filter(t=>t.compId===c.id&&!t.sameAs);
      teams.forEach(t=>{if(+t.gameId)codeRecord('team',t,del);nT++;
        if(del){teamsArr().filter(x=>x.sameAs&&leagueCopy(x)===t).forEach(x=>{addImgs(x);dropTeam(x)});addImgs(t);dropTeam(t)}
        else{t.gameId='';t.noCode=true;t.codeSet=true;t.parked=true;saveTeam(t)}});
      if(del){teamsArr().filter(x=>x.compId===c.id).forEach(x=>{addImgs(x);dropTeam(x)});Object.values(codeBook('comp')).forEach(e=>{if(e.fromId===c.id)e.deleted=true});addImgs(c);delete S.comps[c.id];Store.del('comps',c.id)}
      else{c.parked=true;saveComp(c)}});
    if(del){saveSettings();impDropImages([...imgs])}});
  toast(comps.map(c=>c.name).join(', ')+' and '+nT+' team'+(nT===1?'':'s')+(del?' deleted':' kept out of the game')+'; their codes are free','ok')}
// what is kept out of the game is not a problem: the health check leaves it alone (rule book, "Don't flag what isn't a problem")
{const _hi=healthIssues;healthIssues=()=>_hi().filter(i=>!(i.acts||(i.act?[i.act]:[])).some(a=>a&&a.id&&((S.teams[a.id]&&S.teams[a.id].parked)||(S.comps[a.id]&&S.comps[a.id].parked))))}
// Health check layout: only what is in the game is checked (a team or competition without a code is listed under "Files not in
// the game"); every row gets its problem key and the level set for that problem (HC_PROBLEMS). Problems are
// never combined: each keeps its own key, level and rows (user, 2026-11-21).
{const _hi=healthIssues;healthIssues=()=>{const of=!!S.settings.ofPkg;const out=[];
  _hi().forEach(i=>{const a=hcActs(i)[0];const id=a&&String(a.id||'').split('|')[0];const t=S.teams[id],c=S.comps[id];if((t&&t.noCode)||(c&&c.noCode))return;
    const P=HC_PROBLEMS.find(p=>p[2](i));if(P){if(!P[1]||(of&&P[0]==='noplid'&&i.cat==='Game IDs'))return;/* with an option file, players without an ID are listed one by one instead */i.k=P[0];i.sev=P[1]}else i.k='other';out.push(i)});
  const rank={err:0,warn:1,info:2,note:3};return out.map((x,n)=>[x,n]).sort((a,b)=>rank[a[0].sev]-rank[b[0].sev]||a[1]-b[1]).map(x=>x[0])}}
// a code set here changes the export: the hash notices it, so the file is rebuilt with the new code
{const _h=ofHash;ofHash=t=>{const h=_h(t);return t&&t.codeSet?String(fnv(h+'|code'+(t.gameId||'none'))):h}}
{const _h=ofCompHash;ofCompHash=c=>{const h=_h(c);return c&&c.codeSet?String(fnv(h+'|code'+(c.gameId||'none'))):h}}
(async function boot(){APP_READY=true;
  const mode=await Store.init();status();
  try{
    const [teams,comps,images,snaps,pending,settings,teds,jobs,history]=await Promise.all(['teams','comps','images','snaps','pending','settings','teds','jobs','history'].map(c=>Store.list(c).catch(e=>{S._loadFailed=true;console.warn('load '+c,e);return []})));teds.forEach(x=>S.teds[x.id]=x);jobs.forEach(x=>S.jobs[x.id]=x);history.forEach(x=>S.history[x.id]=x);
    teams.forEach(t=>{t.players=(t.players||[]).map(p=>normPlayer(Object.assign(newPlayer(),p,{attrs:Object.assign(newPlayer({pos:p.pos}).attrs,p.attrs||{})})));S.teams[t.id]=t;Store.rev++});
    comps.forEach(c=>S.comps[c.id]=c);images.forEach(i=>S.images[i.id]=i);snaps.forEach(s=>S.snaps[s.id]=s);pending.forEach(b=>S.pending[b.id]=b);
    const st=settings.find(x=>x.id==='main');if(st)S.settings=Object.assign(clone(DEFAULT_SETTINGS),st,{sizes:Object.assign(clone(DEFAULT_SETTINGS.sizes),st.sizes||{})});
    if(!S._loadFailed){rollSeason();if(Object.keys(S.teams).length)ensureWorldCup()} // an empty project gets it with the baseline load // only with the saved settings loaded, so a failed load never overwrites them
    if(mode==='local')await Promise.all(images.map(i=>Store.preload(i.ref)));
    await extBoot();
  }catch(e){toast('Could not load your project: '+e.message,'err')}
  if(mode==='memory')toast('Storage is unavailable in this view. Pack the project (Settings → Copy and move) before closing.','err');
  status();uiRestore();route();scRestore();
  // a page left open over 1 September switches when you come back to it
  if(!S._loadFailed)document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S.settings.seasonSeen&&S.settings.seasonSeen!==currentSeason()){rollSeason();rerender()}});
})();
