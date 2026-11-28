// PES 2021 Option Studio, part 7 of 14: The job queue (JOB_RUN, runJob), mass editing, settings, moving and backing up the project.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= v2: Claude job queue (survives reloads, retries when busy) ================= */
function jobsArr(){return Object.values(S.jobs).sort((a,b)=>a.createdAt-b.createdAt||a.seq-b.seq)}
let JOBSEQ=0;
// A job for one team that is already queued or running is not queued again (pes21-commands 5: a second click must not add a
// second copy). Jobs without a team (lists of players, images, whole competitions) are told apart by their own commands.
function queueAdd(list,{run=true}={}){{const live=Object.values(S.jobs||{}).filter(x=>x.status==='queued'||x.status==='running');const key=x=>x.type+'|'+x.teamId+'|'+(x.needs||[]).join();const seen=new Set(live.filter(x=>x.teamId).map(key));
    const all=list.length;list=list.filter(j=>{if(!j.teamId)return true;const k=key(j);if(seen.has(k))return false;seen.add(k);return true});
    if(!list.length){if(all)setTimeout(()=>toast(all===1?'That is already queued: follow it in the progress bar':'Those '+all+' are already queued: follow them in the progress bar',''),0);return}}
  list.forEach(j=>{const job=Object.assign({id:uid(),status:'queued',attempts:0,createdAt:Date.now(),seq:JOBSEQ++},j);S.jobs[job.id]=job;Store.put('jobs',job)});
  progSyncRoot();if(run){const ls=new Set(list.map(laneOf));ls.forEach(l=>{QPAUSED[l]=false});setTimeout(queueRun,50)}queueKeep();rerender()}
function progAddRoot(n){const st=S.ui.ai.stack;if(st&&st.length)st[0].total+=n;progRender()}
// the whole bar while the queue runs: the tasks done since it started, of those and every task still waiting or running
function progSyncRoot(){const st=S.ui.ai.stack;if(!st||!st.length||!S.ui.ai.queue)return;st[0].total=Math.max(1,st[0].done+Object.values(S.jobs).filter(j=>j.status==='queued'||j.status==='running').length);progRender()}
/* ================= TWO QUEUES, SIDE BY SIDE (the user, 2026-11-28) =================
   "separate the Additional actions progress table from Free sources. make additional actions required after free sources created
   them moved directly to the other tab, and make both tabs able to work simultaneously."
   A job is in one of two lanes, by how it came in:
     free   every job that was not asked of Claude: Live update and the look-ups that use the free sources
     more   every job that carries asked:true: what you asked for under Additional actions (the Ask Claude table)
   Each lane runs its own jobs one after another, with its own Stop, and the two lanes run at the same time. Each has its own
   progress and its own list on its own tab of Process and Review. What a free-source job leaves open goes to the Ask Claude
   table (askAdd), which is on the Additional actions tab only.
   What two jobs at once means for the rest of the code, which has no way to tell which job a call belongs to:
     - Claude answers only a call that carries the signal of the lane's asked job (the guard, app-bucket-claude.js), so a
       free-source job can never reach Claude because an asked job happens to be running.
     - a job that queues more jobs says itself whether they inherit asked (routeAs), instead of the router guessing.
     - CUR_JOB, "the job running now", is set only while exactly one job runs. With two, nothing is applied automatically
       (auto-apply waits for review) and a source dot goes to the job of its kind (jobStage).
     - log lines go to the trace of every running job, so a failed job's Details can hold lines of the other. */
const laneOf=j=>j&&j.asked?'more':'free';const LANE_NAME={free:'Free sources',more:'Additional actions'};
const LANES={free:{run:false,ctrl:null,cur:null,done:0,failed:0,t0:0},more:{run:false,ctrl:null,cur:null,done:0,failed:0,t0:0}};
const laneJobs=l=>jobsArr().filter(j=>laneOf(j)===l);
const RUN_JOBS=new Set(),JOB_TRACE=new Map();
// jobs queued from inside a job: whether they inherit asked is said by the caller (null: the router decides from CUR_JOB)
let ROUTE_ASKED=null;function routeAs(asked,fn){const p=ROUTE_ASKED;ROUTE_ASKED=!!asked;try{return fn()}finally{ROUTE_ASKED=p}}
function jobSave(j){S.jobs[j.id]=j;Store.put('jobs',j);if(j.status==='done'||j.status==='error')queueKeep();else queueKeepSoon()}
/* ================= THE QUEUES SURVIVE A REFRESH (the user, 2026-11-28) =================
   "make the queues in Live update get saved not to be removed when refreshing the page."
   Tasks were saved with the project already, but a save is written half a second after a change (longer online, where each
   record is a request), so a task queued or finished just before a refresh could be missing or stale afterwards; and nothing
   started the queues again, so what was left sat there until Resume was pressed.
   1. A copy of both queues is kept in this browser, written at once whenever a task is added, finishes, fails or is removed
      (localStorage 'pes21.queue': every task not yet done, the last finished ones with what they found, and which queue you
      stopped). It carries the account it belongs to, so it is never loaded into another account's project.
   2. When the studio opens, tasks in that copy that the project does not have are put back, a task the copy knows as finished
      is not run again, and a task that was running when the page went away waits again.
   3. Each queue then carries on by itself, unless you stopped it: a queue stopped with Stop stays stopped until Resume. */
const QKEEP='pes21.queue';let QWHO='',QPAUSED={free:false,more:false},_qkT=0;
function queueKeep(){clearTimeout(_qkT);_qkT=0;if(!QWHO)return;// not before the studio has opened: an empty list must never replace the copy
  try{const all=jobsArr(),done=all.filter(j=>j.status==='done').sort((a,b)=>(b.doneAt||0)-(a.doneAt||0)).slice(0,80);
    localStorage.setItem(QKEEP,JSON.stringify({who:QWHO,at:Date.now(),paused:QPAUSED,jobs:[...all.filter(j=>j.status!=='done').slice(0,3000),...done].map(j=>{const o=Object.assign({},j);delete o._notes;delete o._rec;return o})}))}catch(e){}}
function queueKeepSoon(){if(!_qkT)_qkT=setTimeout(queueKeep,150)}
window.addEventListener('pagehide',()=>{if(_qkT)queueKeep()});
async function queueRestore(){try{const u=window.claude&&window.claude.use?await window.claude.use('user'):null;QWHO=(Store.mode||'')+'|'+(u?await u.id():'')}catch(e){QWHO=(Store.mode||'')+'|'}
  let back=0;try{const K=JSON.parse(localStorage.getItem(QKEEP)||'null');if(K&&K.who===QWHO&&Array.isArray(K.jobs)&&!S._loadFailed){QPAUSED=Object.assign({free:false,more:false},K.paused||{});
      K.jobs.forEach(m=>{if(!m||!m.id)return;const s=S.jobs[m.id];
        if(!s){if(m.status==='done')return;if(m.status==='running')m.status='queued';S.jobs[m.id]=m;Store.put('jobs',m);back++}
        else if(m.status==='done'&&s.status!=='done'){S.jobs[m.id]=m;Store.put('jobs',m)}})}}catch(e){console.warn('queue copy',e)}
  queueKeep();return back}
// THE PLACE FOR EVERY JOB: a job type that is one function is registered here (JOB_RUN.type = (job, signal) => …) and run from
// here. Only what changes how other types run (free sources before Claude, the current-job bookkeeping) still wraps runJob.
const JOB_RUN={};
async function runJob(j,signal){const run=JOB_RUN[j.type];if(run)return run(j,signal);const season=j.season||S.settings.season;
  if(j.type==='team'){const base=S.teams[j.teamId]||j.virtual;if(!base)throw new Error('team no longer exists');const parts=new Set(j.parts||[]);
    const inc=await draftTeam(base,parts,season,signal);if(parts.has('crest'))await flAttach(inc,'emblem',signal);finishBatch(batchFromData({teams:{[inc.id]:inc},comps:{}},{title:'Claude: '+inc.name+' ('+season+')',source:'Claude',removeMissing:parts.has('roster'),teamScope:[inc.id]}));return}
  if(j.type==='ratings'){await runPlayerRatings(j.ids||[],season,signal);return}
  if(j.type==='details'){await runPlayerDetails(j.ids||[],season,signal,j.label);return}
  if(j.type==='kits'){const t=S.teams[j.teamId];if(t)await runKitCheck(t,season,signal);return}
  if(j.type==='compCheck'){const c=S.comps[j.compId];if(c)await runCompCheck(c,season,signal);return}
  if(j.type==='comp'){await buildCompAIQueued(j,signal);return}
  if(j.type==='intl'){await runIntlSearch(j,signal);return}
  throw new Error('unknown job')}
// a competition job fetches the clubs, then queues one job per club so long builds can resume club by club
async function buildCompAIQueued(j,signal){aiLog('Asking Claude for the teams in '+j.name+'…');const r=await aiJSON(compPrompt(j.name,j.country,j.season),signal);if(r.knowledgeNote)aiLog('  Note: '+r.knowledgeNote);
  const rc=r.competition||{};let comp=Object.values(S.comps).find(c=>norm(c.name)===norm(rc.name||j.name)||norm(c.name)===norm(j.name));
  const incComp=comp?clone(comp):newComp({id:j.compId||uid(),name:rc.name||j.name,short:rc.short||'',country:rc.country||j.country,type:rc.type==='Cup'?'Cup':'League',season:j.season});if(comp)incComp.season=j.season;
  const teams=(Array.isArray(r.teams)?r.teams:[]).filter(t=>t&&t.name);aiLog('  '+teams.length+' teams');const virt={};
  const cup=isCupComp(incComp);
  teams.forEach(rt=>{const ex=findClub(rt.name,rt.country||j.country);const t=ex?clone(ex):newTeam({name:rt.name,short:(rt.short||shortName(rt.name)).toUpperCase().slice(0,3),country:rt.country||j.country,stadium:rt.stadium||''});
    if(!cup)t.compId=incComp.id;else if(!ex)t.compId=leagueOf(rt);virt[t.id]=t});
  const notes=comp?compUnlisted(comp,new Set(Object.keys(virt)),j.season):[];
  const known=Object.values(virt).filter(t=>S.teams[t.id]),fresh=Object.values(virt).filter(t=>!S.teams[t.id]);
  if(cup)incComp.teams=cupParticipants(incComp,Object.keys(virt));
  await flAttach(incComp,'comp',signal);const b=batchFromData({comps:{[incComp.id]:incComp},teams:j.squads||cup?{}:Object.fromEntries(known.map(t=>[t.id,t]))},{title:'Claude: '+incComp.name+' teams ('+j.season+')',source:'Claude',removeMissing:false,teamScope:[]});b.notes=[...notes,...(b.notes||[])];compOffAdd(b,notes);finishBatch(b);
  if(j.squads&&known.length){const parts=['roster','transfers','bio','styles','manager','kits','crest'];if(j.stats!==false)parts.push('newStats');
    routeAs(j.asked,()=>queueAdd(known.map(t=>({type:'team',teamId:t.id,parts,season:j.season,label:t.name})),{run:false}));aiLog('  Queued '+known.length+' teams')}
  routeAs(j.asked,()=>queueNewClubs(fresh,j.season))}
// start every lane that has something waiting and is not running (one lane can be given)
function queueRun(only){['free','more'].forEach(l=>{if((!only||only===l)&&!LANES[l].run&&laneJobs(l).some(j=>j.status==='queued'))laneRun(l)})}
async function laneRun(l){const L=LANES[l];if(L.run)return;
  if(S.ui.ai.running&&!S.ui.ai.queue)return;// another long task holds the progress bar (not the queue): Resume starts the lane after it
  Object.assign(L,{run:true,ctrl:new AbortController(),cur:null,done:0,failed:0,t0:Date.now()});const signal=L.ctrl.signal;
  if(!S.ui.ai.running){S.ui.ai.log=S.ui.ai.log||[];startAI(1);S.ui.ai.queue=true;S.ui.ai.failedN=0}
  progSyncRoot();const G=S.ui.ai.ctrl,stopAll=()=>L.ctrl.abort();G.signal.addEventListener('abort',stopAll);
  try{while(!signal.aborted){const mine=laneJobs(l),j=mine.find(x=>x.status==='queued'&&(!x.notBefore||x.notBefore<=Date.now()));
      if(!j){const later=mine.find(x=>x.status==='queued');if(!later)break;await sleep(Math.min(20000,Math.max(500,later.notBefore-Date.now())));continue}
      j.status='running';j.startedAt=Date.now();delete j.result;L.cur=j;const tr=[];JOB_TRACE.set(j,tr);jobSave(j);aiLog('▶ '+(j.label||j.type));progPush(1,j);const rv0=new Set(Object.keys(S.pending||{})),ts0=TOAST_N;
      try{await runJob(j,signal);j.status='done';j.doneAt=Date.now();j.error='';jobResult(j,rv0,ts0);jobSave(j)}
      catch(e){if(e.name==='AbortError'||signal.aborted){j.status='queued';jobSave(j);break}
        j.attempts=(j.attempts||0)+1;const busy=/busy|rate|unavailable|timeout|network/i.test(e.message||'');
        if(busy&&j.attempts<4){j.status='queued';j.notBefore=Date.now()+15000*j.attempts;aiLog('  Busy, will retry ('+j.attempts+'/3): '+e.message)}
        else{j.status='error';j.error=e.message;j.failedAt=Date.now();aiLog('  Failed: '+e.message);j.detail=tr.join('\n');S.ui.ai.failedN=(S.ui.ai.failedN||0)+1;L.failed++}jobSave(j)}
      finally{JOB_TRACE.delete(j);L.cur=null;L.done++;progPop(j);progSyncRoot()}}}
  finally{G.signal.removeEventListener('abort',stopAll);L.run=false;L.cur=null;
    if(!LANES.free.run&&!LANES.more.run){S.ui.ai.queue=false;endAI()}else reviewLive()}}
// What a finished task found, kept on the task and shown on Process and Review: nothing finishes silently. A task that left
// changes to review says how many; one that left none says why, in its own last words (the last line it logged), and shows
// a message unless it already showed one.
let TOAST_N=0;{const _t=toast;toast=function(m,t){TOAST_N++;return _t(m,t)}}
function jobResult(j,rv0,ts0){const nb=Object.values(S.pending||{}).filter(b=>!rv0.has(b.id));
  if(nb.length){const n=nb.reduce((a,b)=>a+((b.items||[]).length||0),0);j.result=n+' change'+(n===1?'':'s')+' to review below';j.resultKind='review';return}
  const said=(JOB_TRACE.get(j)||AI_TRACE||[]).map(l=>String(l).replace(/^\S+(\s\S+)?\s{2}/,'').trim()).filter(l=>l&&!/^▶/.test(l));
  j.result=(said[said.length-1]||'Finished: nothing to change').replace(/^[\s→·-]+/,'');j.resultKind='none';
  if(TOAST_N===ts0)toast((j.label||JOB_KIND[j.type]||j.type)+': '+j.result,'')}
function queueHTML(){const js=jobsArr();if(!js.length)return'';const c=s=>js.filter(j=>j.status===s).length;const run=S.ui.ai.running;
  return `<h2>Job queue <span class="muted small">${c('queued')} waiting · ${c('running')} running · ${c('done')} done · ${c('error')} failed</span></h2>
  <div class="card"><div class="row" style="margin-bottom:8px">${run?'<button class="danger sm" data-act="aiCancel">Pause</button>':c('queued')?'<button class="primary sm" data-act="qResume">Resume queue</button>':''}
   <button class="sm" data-act="qRetry" ${c('error')?'':'disabled'}>Retry failed</button><button class="sm" data-act="qClear" ${c('done')?'':'disabled'}>Clear finished</button><button class="sm danger" data-act="qClearAll" ${c('queued')+c('error')?'':'disabled'}>Remove all queued (${c('queued')+c('error')})</button></div>
   <div class="tw" style="max-height:300px"><table><tbody>${js.slice(-300).reverse().map(jobRowHTML).join('')}</tbody></table></div></div>`}
const JOB_KIND={team:'Team',ratings:'Ratings',details:'Details',ef:'Free sources',efPlayers:'Free sources',efImages:'Free sources',tmInfo:'Free sources',free:'Free sources',compFree:'Free sources',freePlayers:'Free sources',kits:'Kits',compCheck:'Teams',comp:'Competition',logos:'Logos',intl:'International',compPull:'Free sources'};
function jobRowHTML(j){return `<tr><td><span class="tag ${j.status==='done'?'t-add':j.status==='error'?'t-rem':j.status==='running'?'t-mov':'t-upd'}">${j.status}</span></td><td>${esc(j.label||j.type)}</td><td class="small muted">${esc(JOB_KIND[j.type]||j.type)}${j.attempts?' · '+j.attempts+' retries':''}</td><td class="small"><span style="color:var(--bad)">${esc(j.error||'')}</span>${j.status==='done'&&j.result?`<span class="${j.resultKind==='review'?'':'muted'}">${esc(j.result)}</span>`:''}${j.status==='error'&&j.detail?`<details style="margin-top:4px"><summary style="cursor:pointer">Details</summary><pre class="small" style="white-space:pre-wrap;max-height:260px;overflow:auto;margin:6px 0 0">${esc(j.detail)}</pre></details>`:''}</td><td style="white-space:nowrap">${j.status==='error'?`<button class="sm" data-act="qRetryOne" data-id="${j.id}">Retry</button>`:''}${j.status!=='running'?`<button class="sm xbtn" data-act="qDel" title="Remove from the queue" data-id="${j.id}" aria-label="Remove">×</button>`:''}</td></tr>`}
// Process and Review page: what Claude or an update is doing now, and the tasks still to run (running first, then waiting, then failed)
// Process and Review: the progress line with its counts sits above the tabs, on every tab (the user, 2026-11-25); the lists
// of jobs are the Free sources tab
function reviewProgHTML(){const all=jobsArr(),c=s=>all.filter(j=>j.status===s).length,a=S.ui.ai;
  if(!a.running&&!a.busy&&!all.some(j=>j.status!=='done'))return'';
  return `<div class="card" style="margin-bottom:12px"><div class="row" style="flex-wrap:nowrap"><div class="aiprog-slot" style="flex:1">${progHTML()}</div>${a.running?'<button class="sm danger" data-act="aiCancel">Stop</button>':c('queued')?'<button class="sm primary" data-act="qResume">Resume queue</button>':''}<a class="small" href="#ai">Log</a></div>
   <div class="row small muted" style="margin:8px 0 0">${a.running?'Working: the changes from each task appear under Changes as soon as it finishes.':'Not running.'}<span class="spacer"></span>${c('running')} running · ${c('queued')} waiting · ${c('done')} done · ${c('error')} failed${c('error')?' <button class="sm" data-act="qRetry">Retry failed</button>':''}${c('queued')+c('error')?` <button class="sm danger" data-act="qClearAll" title="Removes every task that hasn't run yet, and the failed ones">Remove all queued (${c('queued')+c('error')})</button>`:''}</div></div>`}
// one tab's own progress: its bar, what it is doing, Stop or Resume, its counts, and what the dots on its rows mean
function laneProgHTML(l){const L=LANES[l],all=laneJobs(l),c=s=>all.filter(j=>j.status===s).length;if(!L.run&&!all.some(j=>j.status!=='done'))return'';
  const left=c('queued')+c('running'),tot=L.done+left,pct=L.run&&tot?Math.round(100*L.done/tot):0,cur=L.cur?(L.cur.label||JOB_KIND[L.cur.type]||L.cur.type):'';
  const legend=(l==='free'?['free']:['free','claude',...(webAllowed()?['web']:[])]).map(k=>`<span class="sdot ${SRC_DOT[k][0]}" role="img" aria-label="${SRC_DOT[k][1]}"></span>${SRC_DOT[k][1]}`).join(' &nbsp; ');
  return `<div class="card" style="margin-bottom:12px"><div class="row" style="flex-wrap:nowrap"><div style="flex:1">${L.run?`<div class="aiprog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${LANE_NAME[l]}"><div class="bar"><i style="width:${pct}%"></i></div><div class="aiprog-t"><span><b>${pct}%</b> · ${esc(cur||'Starting…')}</span><span>${L.done} of ${tot} tasks · ${fmtDur(Date.now()-L.t0)}</span></div></div>`:`<span class="small muted">${LANE_NAME[l]}: not running.</span>`}</div>
    ${L.run?`<button class="sm danger" data-act="aiCancel" data-lane="${l}" title="Stops this tab's tasks after the current request. The other tab goes on.">Stop</button>`:c('queued')?`<button class="sm primary" data-act="qResume" data-lane="${l}">Resume</button>`:''}<a class="small" href="#ai">Log</a></div>
   <div class="row small muted" style="margin:8px 0 0"><span title="One dot per source a task used, in order. Flashing: in use now. Dim: the source a waiting task starts with.">${legend}</span><span class="spacer"></span>${c('running')} running · ${c('queued')} waiting · ${c('done')} done · ${c('error')} failed${c('error')?` <button class="sm" data-act="qRetry" data-lane="${l}">Retry failed</button>`:''}${c('queued')+c('error')?` <button class="sm danger" data-act="qClearAll" data-lane="${l}" title="Removes every task of this tab that hasn't run yet, and its failed ones">Remove all queued (${c('queued')+c('error')})</button>`:''}</div></div>`}
function reviewQueueHTML(lane){const all=lane?laneJobs(lane):jobsArr();
  const left=all.filter(j=>j.status!=='done').sort((x,y)=>({running:0,queued:1,error:2}[x.status]??3)-({running:0,queued:1,error:2}[y.status]??3));
  const done=all.filter(j=>j.status==='done'&&j.result).sort((x,y)=>(y.doneAt||0)-(x.doneAt||0));
  if(!left.length&&!done.length)return'';
  return `<div class="card" style="margin-bottom:16px">
   ${left.length?`<div class="tw" style="max-height:340px"><table><tbody>${left.slice(0,200).map(jobRowHTML).join('')}</tbody></table></div>${left.length>200?`<p class="small muted">and ${left.length-200} more on the <a href="#ai">Live Update page</a></p>`:''}`:'<p class="small muted" style="margin:0">Nothing is running or waiting.</p>'}
   ${done.length?`<div class="row small" style="margin:10px 0 4px"><b>Finished (${done.length})</b><span class="muted">what each task found</span><span class="spacer"></span><button class="sm" data-act="qClear"${lane?` data-lane="${lane}"`:''}>Clear finished</button></div><div class="tw" style="max-height:260px"><table><tbody>${done.slice(0,60).map(jobRowHTML).join('')}</tbody></table></div>`:''}</div>`}
// redraw the review page when a task starts, finishes or fails, or a draft arrives; wait while a value is being typed
let _rvT=0;function reviewLive(){if(S.ui.view!=='review')return;clearTimeout(_rvT);_rvT=setTimeout(()=>{if(S.ui.view!=='review')return;const f=document.activeElement;
  if(f&&f.closest&&f.closest('#main')&&/^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName)&&f.type!=='checkbox'){f.addEventListener('blur',reviewLive,{once:true});return}rerender()},250)}
{const _j=jobSave;jobSave=function(j){_j(j);reviewLive()}}
{const _f=finishBatch;finishBatch=function(b){const r=_f(b);reviewLive();return r}}
{const _s=startAI;startAI=function(...x){const r=_s(...x);reviewLive();return r}}
{const _e=endAI;endAI=function(...x){const r=_e(...x);reviewLive();return r}}
{const _m=miniBusy;miniBusy=async function(l,fn){const p=_m(l,fn);reviewLive();try{return await p}finally{reviewLive()}}}
// each of these works on one tab's tasks when its button says which (data-lane), else on all
const qLane=el=>{const l=el&&el.dataset&&el.dataset.lane;return l&&LANES[l]?laneJobs(l):jobsArr()};
ACT.qResume=el=>{const l=el&&el.dataset&&el.dataset.lane||'';(l?[l]:['free','more']).forEach(x=>{QPAUSED[x]=false});queueKeep();queueRun(l)};
// Stop was pressed (one queue or all): it stays stopped across a refresh until Resume
function queuePause(l){(l?[l]:['free','more']).forEach(x=>{QPAUSED[x]=true});queueKeep()}
ACT.qRetry=el=>{qLane(el).filter(j=>j.status==='error').forEach(j=>{j.status='queued';j.attempts=0;j.error='';j.detail='';jobSave(j)});QPAUSED={free:false,more:false};queueKeep();queueRun();rerender()};
ACT.qRetryOne=el=>{const j=S.jobs[el.dataset.id];if(!j)return;Object.assign(j,{status:'queued',attempts:0,error:'',detail:''});jobSave(j);queueRun();rerender()};
ACT.qClear=el=>{qLane(el).filter(j=>j.status==='done').forEach(j=>{delete S.jobs[j.id];Store.del('jobs',j.id)});queueKeep();rerender()};
ACT.qClearAll=async el=>{const L=qLane(el).filter(j=>j.status==='queued'||j.status==='error');if(!L.length)return;
  if(!await ask('Remove all queued tasks?',`Removes <b>${L.length}</b> task${L.length===1?'':'s'} that ${L.length===1?'hasn\'t':'haven\'t'} run yet, failed ones included. A task that is running now finishes, and what it finds still comes here. Nothing already waiting in Process and Review is touched.`,'Remove all',true))return;
  L.forEach(j=>{delete S.jobs[j.id];Store.del('jobs',j.id)});queueKeep();toast(L.length+' queued task'+(L.length===1?'':'s')+' removed','ok');rerender()};
ACT.qDel=el=>{delete S.jobs[el.dataset.id];Store.del('jobs',el.dataset.id);queueKeep();rerender()};
// existing buttons now feed the queue
ACT.aiRunTeam=()=>{const parts=[...aiParts()];const season=$('#ai-season').value.trim()||S.settings.season;const tid=$('#ai-team').value;const nn=$('#ai-newteam').value.trim();
  if(nn){const v=newTeam({name:nn,short:shortName(nn),compId:$('#ai-newcomp').value});queueAdd([{type:'team',virtual:v,parts:[...new Set([...parts,'roster','newStats','manager','kits','bio'])],season,label:nn}]);return}
  if(!S.teams[tid]){toast('Choose a team or type a new team name','err');return}queueAdd([{type:'team',teamId:tid,parts,season,label:S.teams[tid].name}])};
ACT.aiRunAllTeams=async()=>{const parts=[...aiParts()];const season=$('#ai-season').value.trim()||S.settings.season;const cid=$('#ai-allcomp').value;const list=teamsArr().filter(t=>!cid||t.compId===cid);if(!list.length)return;
  if(!await ask('Queue '+list.length+' teams',`Each team becomes a job in the queue. The queue keeps going while you work, picks up after a reload, and retries when Claude is busy.`,'Queue them'))return;
  queueAdd(list.map(t=>({type:'team',teamId:t.id,parts,season,label:t.name})))};
ACT.aiRunComp=()=>{const name=$('#ai-comp').value.trim();if(!name){toast('Type the competition name','err');return}
  queueAdd([{type:'comp',name,country:$('#ai-ccountry').value.trim(),season:$('#ai-cseason').value.trim()||S.settings.season,squads:$('#ai-csquads').checked,stats:$('#ai-cstats').checked,label:name}])};
ACT.aiRunPlayers=()=>{const ids=(S.ui.aiPrefill&&S.ui.aiPrefill.players)||[];const season=($('#ai-season')||{}).value||S.settings.season;
  const chunks=[];for(let i=0;i<ids.length;i+=60)chunks.push(ids.slice(i,i+60));queueAdd(chunks.map((c,i)=>({type:'ratings',ids:c,season,label:'Ratings '+(i*60+1)+'–'+(i*60+c.length)})));S.ui.aiPrefill=null};
ACT.updClaude=async el=>{const sc=el.dataset.scope;const U=updScope(sc);if(!U.n){starterPicker(sc,'quick');return}const season=S.settings.season;
  if(!await ask('Quick check: '+UPD[sc],`Queue Claude checks for <b>${esc(U.label)}</b> (season ${esc(season)}) from its own knowledge. It can't browse the web, so very recent moves may be missing. Results go to Process and Review.`,'Queue'))return;
  const parts=['roster','transfers','newStats','bio','manager','kits'];
  if(sc==='comps')queueAdd(U.comps.map(c=>({type:'compCheck',compId:c.id,season,label:'Teams: '+c.name})));
  else if(sc==='teams')queueAdd(U.teams.map(t=>({type:'team',teamId:t.id,parts,season,label:t.name})));
  else if(sc==='players'){const ch=[];for(let i=0;i<U.ids.length;i+=60)ch.push(U.ids.slice(i,i+60));queueAdd(ch.map((c,i)=>({type:'ratings',ids:c,season,label:'Ratings '+(i*60+1)+'–'+(i*60+c.length)})))}
  else queueAdd(U.teams.map(t=>({type:'kits',teamId:t.id,season,label:'Kits: '+t.name})))};
ACT.starterGo=async()=>{const {sc,how}=S.ui.starter;const leagues=starterLeagues();if(!leagues.length){toast('Pick at least one league','err');return}
  const stats=$('#st-stats')?$('#st-stats').checked:true;closeModal();if(how==='cmd'){showCommand(sc,leagues.map(l=>l.name).join(', '),starterCommand(sc,leagues));return}
  const squads=sc==='teams'||sc==='players';queueAdd(leagues.map(l=>({type:'comp',name:l.name,country:l.country,season:S.settings.season,squads,stats,label:l.name})))};

/* ================= v2: spreadsheet-style mass editing ================= */
const GRID_GROUPS={basics:{label:'Basics',cols:[['name','Name','t',170],['shirtName','Shirt name','t',110],['number','No.','n',50],['pos','Pos','pos',70],['age','Age','n',50],['height','Ht','n',50],['weight','Wt','n',50],['foot','Foot','foot',72],['nat','Nationality','t',110],['style','Playing style','style',150]]},
  att:{label:'Attacking',cols:ATTRS.filter(a=>a[2]==='att').map(a=>[a[0],a[1].replace('Offensive Awareness','Off. Aw.').replace('Tight Possession','Tight Poss.').replace('Place Kicking','Place Kick'),'a',62])},
  phy:{label:'Physical',cols:ATTRS.filter(a=>a[2]==='phy').map(a=>[a[0],a[1].replace('Physical Contact','Phys. Contact').replace('Kicking Power','Kick Power'),'a',62])},
  def:{label:'Defending & GK',cols:ATTRS.filter(a=>a[2]==='def'||a[2]==='gk').map(a=>[a[0],a[1].replace('Defensive Awareness','Def. Aw.').replace('GK ',''),'a',62])},
  extra:{label:'Weak foot & form',cols:[['wfUsage','WF use','n14',60],['wfAcc','WF acc','n14',60],['form','Form','n18',55],['injury','Inj. res.','n13',60],['ovrOverride','OVR override','n',80]]}};
const GRID_ROW=32;
function gridState(){return S.ui.grid||(S.ui.grid={on:false,group:'basics',buf:new Map(),top:0})}
function gridCols(){return GRID_GROUPS[gridState().group].cols}
function gridRows(){const f=S.ui.pf;let rows=filteredPlayers();const key=f.sort,dir=f.dir;const val=r=>key==='ovr'?ovr(r.p):key==='team'?r.t.name:ATTR_KEYS.includes(key)?r.p.attrs[key]:r.p[key];
  rows.sort((a,b)=>{const x=val(a),y=val(b);return (typeof x==='number'&&typeof y==='number'?x-y:String(x??'').localeCompare(String(y??'')))*dir});return rows}
function gridGet(p,k){const b=gridState().buf.get(p.id);if(b&&k in b)return b[k];return ATTR_KEYS.includes(k)?p.attrs[k]:p[k]}
function gridCoerce(type,v){v=String(v==null?'':v).trim();
  if(type==='a'){const n=Math.round(+v);return isFinite(n)&&v!==''?clamp(n,40,99):null}
  if(type==='n'){if(v==='')return '';const n=Math.round(+v);return isFinite(n)?n:null}
  if(/^n\d\d$/.test(type)){const lo=+type[1],hi=+type[2];const n=Math.round(+v);return isFinite(n)?clamp(n,lo,hi):null}
  if(type==='pos'){const u=v.toUpperCase();return POS.includes(u)?u:null}
  if(type==='foot'){return /^l/i.test(v)?'L':/^r/i.test(v)?'R':null}
  if(type==='style'){const m=STYLES.find(s=>norm(s)===norm(v));return m||null}
  return v}
function gridSet(p,k,type,raw){const v=gridCoerce(type,raw);if(v===null)return false;const g=gridState();const cur=ATTR_KEYS.includes(k)?p.attrs[k]:p[k];
  const b=g.buf.get(p.id)||{};if(String(v)===String(cur??'')){delete b[k];if(Object.keys(b).length)g.buf.set(p.id,b);else g.buf.delete(p.id)}else{b[k]=v;g.buf.set(p.id,b)}return true}
function gridCell(p,c,ri,ci){const [k,,type]=c;const v=gridGet(p,k);const b=gridState().buf.get(p.id);const ch=b&&k in b;
  if(type==='pos'||type==='foot'||type==='style'){const list=type==='pos'?POS:type==='foot'?[['R','Right'],['L','Left']]:STYLES;
    return `<td class="gc${ch?' gch':''}"><select data-g="${ri}:${ci}" aria-label="${esc(c[1])} for ${esc(p.name)}">${opts(list,v)}</select></td>`}
  return `<td class="gc${ch?' gch':''}"><input data-g="${ri}:${ci}" value="${esc(v??'')}" ${type!=='t'?'inputmode="numeric"':''} aria-label="${esc(c[1])} for ${esc(p.name)}"></td>`}
function gridBody(rows,from,to){const cols=gridCols();let h=`<tr class="gsp" style="height:${from*GRID_ROW}px"><td colspan="${cols.length+3}"></td></tr>`;
  for(let i=from;i<to;i++){const {p,t}=rows[i];const o=ovr(Object.assign({},p,{attrs:Object.assign({},p.attrs,...(ATTR_KEYS.map(k=>{const b=gridState().buf.get(p.id);return b&&k in b?{[k]:b[k]}:{}}))),pos:gridGet(p,'pos'),ovrOverride:gridGet(p,'ovrOverride')}));
    h+=`<tr style="height:${GRID_ROW}px"><td><input type="checkbox" data-act="selP" data-id="${p.id}" ${S.ui.sel.has(p.id)?'checked':''} aria-label="Select ${esc(p.name)}"></td><td class="small gsticky" title="${esc(t.name)}">${esc((t.short||t.name)+' · '+p.name)}</td><td class="num">${statHTML(o)}</td>${cols.map((c,ci)=>gridCell(p,c,i,ci)).join('')}</tr>`}
  h+=`<tr class="gsp" style="height:${(rows.length-to)*GRID_ROW}px"><td colspan="${cols.length+3}"></td></tr>`;return h}
function gridWindow(rows){const g=gridState();const vh=560;const from=Math.max(0,Math.floor(g.top/GRID_ROW)-10);const to=Math.min(rows.length,from+Math.ceil(vh/GRID_ROW)+20);return[from,to]}
function gridHTML(){const g=gridState();const rows=gridRows();S.ui.gridRows=rows;const cols=gridCols();const [from,to]=gridWindow(rows);const n=g.buf.size;
  return `<div class="row" style="margin-bottom:8px"><div class="seg" role="group" aria-label="Column group">${Object.entries(GRID_GROUPS).map(([k,v])=>`<button class="sm ${g.group===k?'on':''}" data-act="gridGroup" data-k="${k}">${v.label}</button>`).join('')}</div>
   <span class="spacer"></span><span class="small"><b>${n}</b> players edited</span><button class="sm" data-act="gridFill" ${S.ui.sel.size>1?'':'disabled'} title="Copy the focused cell to every selected player">Fill to selected</button>
   <button class="sm ghost" data-act="gridDiscard" ${n?'':'disabled'}>Discard</button><button class="primary sm" data-act="gridSave" ${n?'':'disabled'}>Save ${n} players</button></div>
  <p class="small muted" style="margin:0 0 8px">Type to edit. <b>Enter</b> moves down, <b>Tab</b> moves right. Paste a block of cells copied from Excel or Google Sheets and it fills from the cell you're in. Changed cells are highlighted until you save.</p>
  <div class="tw grid-wrap" id="gridwrap" style="max-height:560px"><table class="gtable"><thead><tr><th style="width:34px"></th><th class="gsticky">Player</th><th class="num" style="width:52px">OVR</th>${cols.map(c=>`<th style="width:${c[3]+8}px">${esc(c[1])}</th>`).join('')}</tr></thead><tbody id="gridbody">${gridBody(rows,from,to)}</tbody></table></div>`}
function gridRefresh(focus){const rows=S.ui.gridRows||gridRows();const [from,to]=gridWindow(rows);const tb=$('#gridbody');if(!tb)return;const g=gridState();
  if(g.rf===from&&g.rt===to&&!focus)return;g.rf=from;g.rt=to;tb.innerHTML=gridBody(rows,from,to);
  if(focus){const el=$(`[data-g="${focus}"]`);if(el){el.focus();if(el.select)el.select()}}
  const sv=$('[data-act=gridSave]');if(sv){sv.textContent='Save '+g.buf.size+' players';sv.disabled=!g.buf.size;$('[data-act=gridDiscard]').disabled=!g.buf.size}}
function gridFocus(ri,ci){const rows=S.ui.gridRows;if(!rows||ri<0||ri>=rows.length)return;const cols=gridCols();ci=clamp(ci,0,cols.length-1);const w=$('#gridwrap');if(!w)return;
  const y=ri*GRID_ROW;if(y<w.scrollTop+GRID_ROW||y>w.scrollTop+w.clientHeight-2*GRID_ROW){w.scrollTop=Math.max(0,y-w.clientHeight/2);gridState().top=w.scrollTop;gridState().rf=-1}gridRefresh(ri+':'+ci)}
function gridCommit(el){const [ri,ci]=el.dataset.g.split(':').map(Number);const r=S.ui.gridRows[ri];const c=gridCols()[ci];if(!r||!c)return;
  if(!gridSet(r.p,c[0],c[2],el.value)){el.classList.add('gbad');toast(c[1]+': "'+el.value+'" isn\'t valid','err');return}el.classList.remove('gbad');el.parentNode.classList.toggle('gch',!!(gridState().buf.get(r.p.id)&&c[0] in gridState().buf.get(r.p.id)))}
document.addEventListener('change',e=>{const el=e.target;if(el.dataset&&el.dataset.g){gridCommit(el);const g=gridState();g.rf=-1;const f=el.dataset.g;gridRefresh(el.tagName==='SELECT'?f:null)}},true);
document.addEventListener('keydown',e=>{const el=e.target;if(!el.dataset||!el.dataset.g)return;const [ri,ci]=el.dataset.g.split(':').map(Number);
  if(e.key==='Enter'){e.preventDefault();gridCommit(el);gridState().rf=-1;gridFocus(ri+(e.shiftKey?-1:1),ci)}
  else if(e.key==='ArrowDown'&&el.tagName==='INPUT'){e.preventDefault();gridCommit(el);gridState().rf=-1;gridFocus(ri+1,ci)}
  else if(e.key==='ArrowUp'&&el.tagName==='INPUT'){e.preventDefault();gridCommit(el);gridState().rf=-1;gridFocus(ri-1,ci)}
  else if(e.key==='Escape'){const r=S.ui.gridRows[ri];const c=gridCols()[ci];el.value=gridGet(r.p,c[0])??''}});
document.addEventListener('focusin',e=>{const el=e.target;if(el.dataset&&el.dataset.g)gridState().focus=el.dataset.g});
document.addEventListener('paste',e=>{const el=e.target;if(!el.dataset||!el.dataset.g)return;const txt=(e.clipboardData||window.clipboardData).getData('text');if(!/[\t\n]/.test(txt.trim()))return;e.preventDefault();
  const [ri,ci]=el.dataset.g.split(':').map(Number);const lines=txt.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(l=>l.split('\t'));const cols=gridCols();const rows=S.ui.gridRows;let ok=0,bad=0;
  lines.forEach((cells,dy)=>{const r=rows[ri+dy];if(!r)return;cells.forEach((v,dx)=>{const c=cols[ci+dx];if(!c)return;if(gridSet(r.p,c[0],c[2],v))ok++;else bad++})});
  gridState().rf=-1;gridRefresh(el.dataset.g);toast(`Pasted ${ok} cells`+(bad?`, skipped ${bad} invalid`:'')+(ri+lines.length>rows.length?' (ran out of rows)':''),bad?'':'ok')});
document.addEventListener('scroll',e=>{if(e.target.id!=='gridwrap')return;gridState().top=e.target.scrollTop;cancelAnimationFrame(gridState().raf);gridState().raf=requestAnimationFrame(()=>gridRefresh())},true);
ACT.gridToggle=()=>{const g=gridState();if(g.on&&g.buf.size){ask('Leave grid','You have unsaved edits for '+g.buf.size+' players. Discard them?','Discard',true).then(y=>{if(y){g.buf.clear();g.on=false;rerender()}});return}g.on=!g.on;g.top=0;g.rf=-1;rerender()};
ACT.gridGroup=el=>{const g=gridState();g.group=el.dataset.k;g.rf=-1;rerender()};
ACT.gridDiscard=()=>{gridState().buf.clear();gridState().rf=-1;rerender()};
ACT.gridFill=()=>{const g=gridState();if(!g.focus){toast('Click a cell first','err');return}const [ri,ci]=g.focus.split(':').map(Number);const src=S.ui.gridRows[ri];const c=gridCols()[ci];
  const el=$(`[data-g="${g.focus}"]`);const v=el?el.value:gridGet(src.p,c[0]);let n=0;S.ui.gridRows.forEach(r=>{if(S.ui.sel.has(r.p.id)&&gridSet(r.p,c[0],c[2],v))n++});g.rf=-1;gridRefresh();toast(c[1]+' set for '+n+' players','ok')};
ACT.gridSave=async()=>{const g=gridState();if(!g.buf.size)return;const n=g.buf.size;await takeSnapshot('Before grid edit ('+n+' players)',true);
  histLabel('Grid edit: '+n+' players','Players grid',()=>{const touched=new Set();allPlayers().forEach(({p,t})=>{const b=g.buf.get(p.id);if(!b)return;
    Object.entries(b).forEach(([k,v])=>{if(ATTR_KEYS.includes(k))p.attrs[k]=v;else p[k]=v});normPlayer(p);touched.add(t)});touched.forEach(saveTeam)});
  g.buf.clear();g.rf=-1;toast('Saved '+n+' players','ok');rerender()};
const _playersView=VIEWS.players;
VIEWS.players=()=>{const g=gridState();let html=_playersView();
  const tog=`<button class="sm ${g.on?'primary':''}" data-act="gridToggle">${g.on?'Back to list':'Edit as grid'}</button>`;
  html=html.replace('<span class="muted small">',tog+' <span class="muted small">');
  if(!g.on)return virtPlayersList(html);
  const i=html.indexOf('<div class="tw">');return i<0?html:html.slice(0,i)+gridHTML()};
// big lists: the plain list keeps "show more", but a larger first page is fine now that rows are cheap
function virtPlayersList(html){return html}

/* ================= v2: review paging ================= */
const REV_CAP=60;
// review groups start collapsed; the ones you open stay open while you tick and edit (each change redraws the page)
function revIsOpen(bid,g){return !!(S.ui.revOpen&&S.ui.revOpen.has(bid+'|'+g))}
document.addEventListener('toggle',e=>{const d=e.target;if(!d.dataset||!d.dataset.rk)return;const s=S.ui.revOpen||(S.ui.revOpen=new Set());if(d.open)s.add(d.dataset.rk);else s.delete(d.dataset.rk)},true);
function revCap(bid,g){const m=S.ui.revMore||(S.ui.revMore={});return m[bid+'|'+g]||REV_CAP}
ACT.revMore=el=>{const m=S.ui.revMore||(S.ui.revMore={});const k=el.dataset.k;m[k]=(m[k]||REV_CAP)+200;rerender()};
function revMoreBtn(b,g,len){const c=revCap(b.id,g);return len>c?`<div class="row"><button class="sm" data-act="revMore" data-k="${esc(b.id+'|'+g)}">Show ${Math.min(200,len-c)} more of ${len-c} hidden</button><span class="small muted">Hidden items keep their tick and are applied too.</span></div>`:''}

/* ================= v2: boot glue ================= */
async function extBoot(){const back=await queueRestore();Object.values(S.jobs).forEach(j=>{if(j.status==='running'){j.status='queued';jobSave(j)}});
  S._saved={};Object.values(S.teams).forEach(t=>S._saved[t.id]=clone(t));
  // the queues carry on after a refresh; one you stopped stays stopped and says so
  if(!S._loadFailed)setTimeout(()=>{const n=l=>laneJobs(l).filter(j=>j.status==='queued').length,go=['free','more'].filter(l=>n(l)&&!QPAUSED[l]),held=['free','more'].filter(l=>n(l)&&QPAUSED[l]);
    if(go.length){toast('Carrying on after the refresh: '+go.map(l=>n(l)+' in '+LANE_NAME[l]).join(', ')+'. Stop pauses a queue.','ok');go.forEach(l=>queueRun(l))}
    if(held.length)toast(held.map(l=>n(l)+' task'+(n(l)===1?'':'s')+' in '+LANE_NAME[l]).join(' and ')+' paused: you stopped '+(held.length===1?'that queue':'them')+'. Resume in Process and Review.','')},1800)}

/* ================= v3: web-search commands in parts, compact files, crests ================= */
// compact player rows keep the files about a third of the size of one object per player
const PCOLS=['name','shirtName','number','pos','age','nat','height','weight','foot',...ATTR_KEYS,'wfUsage','wfAcc','form','injury','style','skills','comStyles','playables'];
const PCOLS_TXT=`"playerCols":${JSON.stringify(PCOLS)}`;
const PART_SIZE={teams:6,players:50,comps:3,kits:15};
function expandCompact(data){if(!data||!data.teams)return data;const cols=Array.isArray(data.playerCols)&&data.playerCols.length?data.playerCols:PCOLS;
  Object.values(data.teams).forEach(t=>{if(!t||!Array.isArray(t.rows))return;
    t.players=t.rows.filter(Array.isArray).map(r=>{const p={attrs:{}};cols.forEach((c,i)=>{let v=r[i];if(v===undefined||v===null||v==='')return;
      if(ATTR_KEYS.includes(c)){p.attrs[c]=v;return}
      if(c==='skills'||c==='comStyles'){p[c]=Array.isArray(v)?v:String(v).split(/[|;]/).map(s=>s.trim()).filter(Boolean);return}
      if(c==='playables'){if(typeof v==='object')p.playables=v;else{const o={};String(v).split(/[|;,\s]+/).forEach(s=>{const [a,b]=s.split(':');if(a&&b)o[a.toUpperCase()]=b.toUpperCase()});p.playables=o}return}
      p[c]=v});return p});delete t.rows});
  return data}
const ASSET_SRC=`Crest sources, in this order: (1) FootyLogos, https://www.footylogos.com (latest official logos): every club has a slug such as "al-ain" or "real-madrid"; club page https://www.footylogos.com/logos/<slug>, 1500 px PNG https://assets.footylogos.com/logos/<slug>/<slug>-logo-footylogos.png, SVG https://assets.footylogos.com/logos/<slug>/<slug>-logo-footylogos.svg; competition logos use the same PNG and SVG patterns with slugs such as "premier-league-england". (2) github.com/luukhopman/football-logos (raw.githubusercontent.com/luukhopman/football-logos/master/logos/<Country - League>/<Club>.png), (3) Wikimedia Commons (upload.wikimedia.org PNG renders of the club's crest file). Only use crests from these public sources; never photos of people.`;
function assetBlock(clubNames,compNames){if(!clubNames.length&&!compNames.length)return'';
  return `\n\nCRESTS (images): ${clubNames.length?`club crests for: ${clubNames.join(', ')}.`:''} ${compNames.length?`Competition logos for: ${compNames.join(', ')}.`:''}
${ASSET_SRC}
- If you can run code and download files: save each crest as a PNG (at least 256 px) named exactly like the club (the same spelling as its "name" in the JSON), e.g. images/emblems/${clubNames.find(n=>!/^every club in /.test(n))||'Al Ain'}.png${compNames.length?`, and competition logos as images/competitions/${compNames[0]}.png`:''}. Put the JSON file and the images folder in one ZIP and send me the ZIP.
- If you cannot download, add direct image links to the JSON instead: "assets":{"emblems":{"<club name>":"https://…png"}${compNames.length?',"compEmblems":{"<competition name>":"https://…png"}':''}}. Links must point straight at an image file, not a web page.`}
function partFooter(file,mode,extra,partNo,parts,rule){const d=new Date().toISOString().slice(0,10);const nm=`${file}-${d}${parts>1?'-part'+partNo:''}`;
  return `\n\nOUTPUT: one file named ${nm}.json (inside ${nm}.zip if you include crest images). Send it as a file, not pasted in chat. Valid JSON, top level:
{"app":"pes21-option-studio","version":2,"mode":"${mode}","season":"${S.settings.season}",${extra},"notes":["anything you could not confirm, one item per line"]}
Keys like "c1", "t1" are any unique ids you choose. Leave out what you could not confirm rather than guessing. Write the file with code if you can.${rule||''}
SIZE: keep the file compact (no indentation, no spaces). If it would still be too big for one reply, split it into several files of at most 6 clubs each (…-a.json, …-b.json …), send the first, and wait until I say "continue" for the next. Never drop players to make it fit.
After the file, list the sources you used.${parts>1?`\n\nThis is part ${partNo} of ${parts}; I will send the other parts separately.`:''}`}
const ROWS_HELP=`Players go in "rows": one array per player, values in the order of "playerCols" (attrs are the ${ATTR_KEYS.length} rating columns). Use "" for unknown values. skills and comStyles are text separated by "|"; playables is text like "SS:A|LWF:B".`;
const ROW_EXAMPLE=`["Full Name","SHIRTNAME",10,"CF",25,"Brazil",180,75,"R",${ATTR_KEYS.map(()=>70).join(',')},2,2,5,2,"Goal Poacher","Heading|First-time Shot","","SS:B"]`;
function chunk(a,n){const out=[];for(let i=0;i<a.length;i+=n)out.push(a.slice(i,i+n));return out}
function commandParts(sc){const U=updScope(sc);const parts=[];
  if(sc==='comps'){const ch=chunk(U.comps,PART_SIZE.comps);ch.forEach((cs,i)=>{
    const list=cs.map(c=>`- ${c.name}${c.country?' ('+c.country+')':''}, ${c.type}. My clubs now: ${teamsArr().filter(t=>t.compId===c.id).map(t=>t.name).join(', ')||'none yet'}`).join('\n');
    const clubs=teamsArr().filter(t=>cs.some(c=>c.id===t.compId)&&!t.emblem&&!ofGameCrest(t)).map(t=>t.name);const comps=cs.filter(c=>!c.emblem&&!pesOwnLogo(c)).map(c=>c.name);
    parts.push({label:cs.map(c=>c.name).join(', '),text:cmdHeader('line-ups of these competitions')+`SCOPE: ${list}\n\nFor each competition find every club taking part this season (including promoted and newly qualified clubs), the competition's current official name and short name, and each club's 3-letter code, country and current stadium.`
      +assetBlock(clubs.length?clubs.concat(['and any club that is new to my list']):['every club that is new to my list'],comps)
      +partFooter('pes21-competitions','partial',`"comps":{"c1":{"name":"","short":"","country":"","type":"League or Cup","season":""}},"teams":{"t1":{"name":"","short":"ABC","country":"","stadium":"","compId":"c1"}}`,i+1,ch.length,`\nList EVERY club under "teams" with "compId" pointing to its competition. Put relegated or eliminated clubs from my list in "notes".`)})});return parts}
  if(sc==='teams'){const ts=U.teams.slice().sort((a,b)=>compName(a.compId).localeCompare(compName(b.compId)));const ch=chunk(ts,PART_SIZE.teams);ch.forEach((g,i)=>{
    const list=g.map(t=>`- ${t.name}${S.comps[t.compId]?' ('+S.comps[t.compId].name+')':''}. Manager: ${t.manager&&t.manager.name||'?'}. My squad: ${(t.players||[]).map(p=>p.name+' ('+p.pos+')').join(', ')||'empty'}`).join('\n');
    parts.push({label:g.map(t=>t.name).join(', '),text:cmdHeader('squads, transfers and managers for these teams')+`SCOPE:\n${list}\n\nFor each team find the current first-team squad (normally 23-32 players): arrivals and departures since my list, shirt numbers, positions, ages, nationality, height (cm), weight (kg) and stronger foot. Also the current manager (name, nationality, age), usual formation (one of ${FORMATIONS.join(', ')}), team playstyle (one of ${PLAYSTYLES.join(', ')}) and stadium.\nFor players who are NEW to my data, also estimate PES 2021 ratings from their current level. For players already in my list leave the rating columns as "".\n${SQUAD_RULES}\n${RATING_RULES}\n${ROWS_HELP}`
      +assetBlock(g.filter(t=>!t.emblem&&!ofGameCrest(t)).map(t=>t.name),[])
      +partFooter('pes21-squads','squads',`${PCOLS_TXT},"teams":{"t1":{"name":"","stadium":"","formation":"4-3-3","playstyle":"","manager":{"name":"","nat":"","age":0},"rows":[${ROW_EXAMPLE}]}}`,i+1,ch.length,`\nIMPORTANT: each team's "rows" must be the FULL current squad, because players I have that are missing will be treated as departures. Use my exact spellings for players who are still there.`)})});return parts}
  if(sc==='players'){const found=U.ids.map(findPlayer).filter(Boolean);const ch=chunk(found,PART_SIZE.players);ch.forEach((g,i)=>{const byT={};g.forEach(({p,t})=>(byT[t.name]=byT[t.name]||[]).push(`${p.name} (${p.pos}, age ${p.age||'?'}, now OVR ${ovr(p)})`));
    const list=Object.entries(byT).map(([t,ps])=>`- ${t}: ${ps.join('; ')}`).join('\n');
    parts.push({label:g.length+' players: '+Object.keys(byT).slice(0,4).join(', ')+(Object.keys(byT).length>4?'…':''),text:cmdHeader('form and level of these players')+`SCOPE:\n${list}\n\nFor each player, check their current real-world level (this season's performances, minutes, caps, recent ratings in current football games or stats sites) and convert it into PES 2021 ratings. Note any player who has moved club (put him under the new club's name).\n${RATING_RULES}\n${ROWS_HELP}`
      +partFooter('pes21-ratings','partial',`${PCOLS_TXT},"teams":{"t1":{"name":"team name exactly as listed","rows":[${ROW_EXAMPLE}]}}`,i+1,ch.length,`\nInclude only the players I listed.`)})});return parts}
  const ch=chunk(U.teams,PART_SIZE.kits);ch.forEach((g,i)=>{const list=g.map(t=>`- ${t.name}: kits ${(t.kits||[]).map(k=>k.slot).join(', ')||'none'}; emblem ${t.emblem?'yes':'MISSING'}`).join('\n');
    const comps=[...new Set(g.map(t=>S.comps[t.compId]).filter(c=>c&&!c.emblem&&!pesOwnLogo(c)).map(c=>c.name))];
    parts.push({label:g.map(t=>t.name).slice(0,5).join(', ')+(g.length>5?' +'+(g.length-5):''),text:cmdHeader('kits and crests of these teams')+`SCOPE:\n${list}\n\nFor each team find this season's kits (1st, 2nd, 3rd and goalkeeper kits where they exist): main shirt colour, second or pattern colour, shorts, socks, number colour, collar style (one of ${COLLARS.join(', ')}) and main shirt sponsor. Also the two main club colours.`
      +assetBlock(g.filter(t=>!t.emblem&&!ofGameCrest(t)).map(t=>t.name),comps)
      +partFooter('pes21-kits','partial',`"teams":{"t1":{"name":"","colors":["#rrggbb","#rrggbb"],"kits":[{"slot":"1st","shirt":"#rrggbb","second":"#rrggbb","shorts":"#rrggbb","socks":"#rrggbb","numberColor":"#rrggbb","collar":"","sponsor":""}]}}`,i+1,ch.length,`\nColours must be 6-digit hex codes. Slots: ${KIT_SLOTS.join(', ')}.`)})});return parts}
function starterParts(sc,leagues){const per=sc==='teams'||sc==='players'?1:3;const ch=chunk(leagues,per);const compJSON=`"comps":{"c1":{"name":"official name","short":"","country":"","type":"League or Cup","season":"${S.settings.season}"}}`;
  return ch.map((ls,i)=>{const list=ls.map((l,j)=>`- c${j+1}: ${l.name}${l.country?' ('+l.country+')':''}, ${l.type}`).join('\n');const names=ls.map(l=>l.name);
    const crest=assetBlock(['every club in '+names.join(' and ')],names);
    // clubs the project already has from these competitions' countries: their spellings are the ones to use
    const cs=new Set(ls.map(l=>norm(l.country)).filter(Boolean));const mine=cs.size?teamsArr().filter(t=>!t.sameAs&&!isNationalTeam(t)&&(cs.has(norm(t.country))||cs.has(norm((S.comps[t.compId]||{}).country)))).map(t=>t.name).sort():[];
    const mineTxt=mine.length?`\n\nCLUBS I ALREADY HAVE from ${ls.length>1?'these countries':'this country'} (${mine.length}): ${mine.slice(0,80).join(', ')}.\nFor a club in this list that takes part, use my spelling as its "name". Clubs not in the list are new to my data: give their usual English names.`:'';
    if(sc==='comps')return{label:names.join(', '),text:cmdHeader('club line-ups of these competitions')+`COMPETITIONS:\n${list}\n\nFor each competition give its current official name and short name, and EVERY club taking part this season with its 3-letter code, country and current stadium.`+crest
      +partFooter('pes21-competitions','partial',compJSON+`,"teams":{"t1":{"name":"","short":"ABC","country":"","stadium":"","compId":"c1"}}`,i+1,ch.length,`\nEach club's "compId" must point to its competition key (c1, c2 …).`)};
    if(sc==='kits')return{label:names.join(', '),text:cmdHeader('clubs, crests and kits of these competitions')+`COMPETITIONS:\n${list}\n\nFor each competition list EVERY club taking part this season (3-letter code, country, stadium, two main club colours) and this season's kits: 1st, 2nd, 3rd and goalkeeper kits where they exist, with shirt colour, second/pattern colour, shorts, socks, number colour, collar style (one of ${COLLARS.join(', ')}) and main shirt sponsor.`+crest
      +partFooter('pes21-kits','partial',compJSON+`,"teams":{"t1":{"name":"","short":"ABC","country":"","stadium":"","compId":"c1","colors":["#rrggbb","#rrggbb"],"kits":[{"slot":"1st","shirt":"#rrggbb","second":"#rrggbb","shorts":"#rrggbb","socks":"#rrggbb","numberColor":"#rrggbb","collar":"","sponsor":""}]}}`,i+1,ch.length,`\nColours must be 6-digit hex codes. Slots: ${KIT_SLOTS.join(', ')}.`)};
    return{label:names.join(', '),text:cmdHeader('clubs, squads and player levels of this competition')+`COMPETITION:\n${list}\n\nList EVERY club taking part this season (3-letter code, country, stadium, manager with nationality and age, usual formation from ${FORMATIONS.join(', ')}, team playstyle from ${PLAYSTYLES.join(', ')}) and its full current first-team squad (23-32 players) with shirt number, position, age, nationality, height (cm), weight (kg), stronger foot, and PES 2021 ratings estimated from each player's current real-world level.${mineTxt}\n${SQUAD_RULES}\n${RATING_RULES}\n${ROWS_HELP}`+crest
      +partFooter('pes21-squads','squads',compJSON+`,${PCOLS_TXT},"teams":{"t1":{"name":"","short":"ABC","country":"","stadium":"","compId":"c1","formation":"4-3-3","playstyle":"","manager":{"name":"","nat":"","age":0},"rows":[${ROW_EXAMPLE}]}}`,i+1,ch.length)}})}
// keep the old single-command builders for anything else that calls them
buildCommand=sc=>commandParts(sc).map(p=>p.text).join('\n\n=====\n\n');
starterCommand=(sc,leagues)=>starterParts(sc,leagues).map(p=>p.text).join('\n\n=====\n\n');
ACT.updCmd=el=>{const sc=el.dataset.scope;const U=updScope(sc);if(!U.n){starterPicker(sc,'cmd');return}showParts(sc,U.label,commandParts(sc))};
const _starterGo=ACT.starterGo;
ACT.starterGo=async el=>{const st=S.ui.starter||{};if(st.how!=='cmd')return _starterGo(el);const leagues=starterLeagues();if(!leagues.length){toast('Pick at least one league','err');return}
  closeModal();showParts(st.sc,leagues.map(l=>l.name).join(', '),starterParts(st.sc,leagues))};
function showParts(sc,label,parts){S.ui.cmd={sc,label,parts,i:0,copied:new Set()};cmdModal()}
function cmdModal(){const c=S.ui.cmd;const p=c.parts[c.i];S.ui.cmdText=p.text;
  modal(`<div class="mhead"><h2>Web-search command · ${esc(UPD[c.sc])}</h2></div>
  <p class="small">Scope: <b>${esc(c.label)}</b>. ${c.parts.length>1?`Split into <b>${c.parts.length} parts</b> so each reply stays small enough. Paste each part in its own Claude chat (or one after the other).`:''}</p>
  <ol class="small" style="margin:0 0 10px;padding-left:18px"><li>Copy a part and paste it into a Claude chat with web search on. Code execution lets Claude also download the crests.</li><li>Claude sends back a <b>.zip</b> (data + crests) or a <b>.json</b> file. Download it.</li><li>Click <b>Import update files</b> and pick all the files at once. Changes and crests land in Process and Review.</li></ol>
  ${c.parts.length>1?`<div class="row" style="flex-wrap:wrap;gap:6px;margin-bottom:8px">${c.parts.map((x,i)=>`<button class="sm ${i===c.i?'primary':''}" data-act="cmdPart" data-i="${i}" title="${esc(x.label)}">${c.copied.has(i)?'✓ ':''}Part ${i+1}</button>`).join('')}</div><p class="small muted" style="margin:0 0 6px">Part ${c.i+1}: ${esc(p.label)}</p>`:''}
  <textarea id="cmd-text" readonly style="min-height:280px;font:12.5px/1.45 ui-monospace,Menlo,monospace">${esc(p.text)}</textarea>
  <div class="row end" style="margin-top:12px"><button data-act="close">Close</button><button data-act="importPkg">Import update files</button>${c.parts.length>1&&c.i<c.parts.length-1?'<button data-act="cmdCopyNext">Copy & go to next part</button>':''}<button class="primary" data-act="cmdCopy">Copy ${c.parts.length>1?'part '+(c.i+1):'command'}</button></div>`,true)}
ACT.cmdPart=el=>{S.ui.cmd.i=+el.dataset.i;cmdModal()};
async function cmdCopyCur(){const c=S.ui.cmd;try{await navigator.clipboard.writeText(c.parts[c.i].text);c.copied.add(c.i);toast((c.parts.length>1?'Part '+(c.i+1):'Command')+' copied','ok');return true}catch(e){const t=$('#cmd-text');t.focus();t.select();toast('Press Ctrl/Cmd+C to copy the selected text');return false}}
ACT.cmdCopy=async()=>{if(await cmdCopyCur())cmdModal()};
ACT.cmdCopyNext=async()=>{await cmdCopyCur();S.ui.cmd.i=Math.min(S.ui.cmd.parts.length-1,S.ui.cmd.i+1);cmdModal()};

/* ----- importing several update files at once, with crests from ZIPs or links ----- */
function filesPicker(accept){return new Promise(res=>{const i=document.createElement('input');i.type='file';i.multiple=true;i.accept=accept;i.style.display='none';document.body.appendChild(i);i.addEventListener('change',()=>pickerDone(i,res,[...i.files]));watchPicker(i,res);i.click()})}
const IMG_EXT=/\.(png|jpe?g|webp|gif|svg|bmp)$/i;
ACT.importPkg=async()=>{const fs=await filesPicker('.zip,.json,.ted,.ced,application/json,application/zip');if(!fs||!fs.length)return;closeModal();await importUpdateFiles(fs)};
// An exported WEPES ZIP (the studio's own export, an option file's files, or any ZIP of .ted/.ced files) is read too (the user,
// 2026-11-25: "make importing a competition import an exported wepes zipped folder as well"). Its game files go, with every
// image in the ZIP, to Import files (impReadFiles), which reads them as the game does: by the names inside the team and
// competition files, never by file or folder names. Installing them there asks where a new competition goes (step 3), like
// every other way in. An update.json in the same ZIP is still read here, and keeps the images it claims.
async function importUpdateFiles(files){let n=0,leftImgs=[];const errs=[],game=[];
  await miniBusy('Reading '+files.length+' file'+(files.length===1?'':'s')+'…',async()=>{let fi=0;busyCount(0,files.length);
    for(const f of files){busyCount(fi,files.length,'Reading file '+(++fi)+' of '+files.length+': '+f.name);try{
      if(/\.(ted|ced)$/i.test(f.name)){game.push({f,path:f.name});continue}
      // a ZIP the size of an option file is never opened in the browser: Import files takes it as a package, uploaded to
      // the account's own storage in parts (online) and read there by the server
      if(/\.zip$/i.test(f.name)&&f.size>400*1048576){game.push({f,path:f.name});continue}
      if(/\.zip$/i.test(f.name)){if(typeof JSZip==='undefined')throw new Error('ZIP library not loaded');const z=await JSZip.loadAsync(f);
        if(z.file('data/project-backup.json')){await importStudioFile(f,z);n++;continue}
        const ents=Object.values(z.files).filter(e=>!e.dir&&!e.name.includes('__MACOSX')&&!e.name.split('/').pop().startsWith('.'));
        const gents=ents.filter(e=>/\.(ted|ced)$/i.test(e.name));
        const jsons=ents.filter(e=>/\.json$/i.test(e.name));const imgs=[];for(const e of ents.filter(e=>IMG_EXT.test(e.name)))imgs.push({path:e.name,blob:new Blob([await e.async('arraybuffer')],{type:/\.svg$/i.test(e.name)?'image/svg+xml':'image/'+(e.name.split('.').pop().toLowerCase().replace('jpg','jpeg'))})});
        let rest=imgs;
        if(jsons.length){rest=[];for(let k=0;k<jsons.length;k++){const d=JSON.parse(await jsons[k].async('string'));const r=await importUpdateData(d,f.name+(jsons.length>1?' › '+jsons[k].name.split('/').pop():''),k===0?imgs:[]);rest.push(...r.left);n++}}
        if(gents.length){for(const e of gents)game.push({f:new Blob([await e.async('arraybuffer')]),path:f.name+'/'+e.name});rest.forEach(it=>game.push({f:it.blob,path:f.name+'/'+it.path}));continue}
        if(!jsons.length&&!imgs.length)throw new Error('no update file (.json), team file (.ted) or competition file (.ced) in it');
        leftImgs.push(...rest)}
      else{const d=JSON.parse(await f.text());if(d&&d.app==='pes21-option-studio'&&!d.mode){await importStudioFile(f,null,d);n++;continue}const r=await importUpdateData(d,f.name,[]);leftImgs.push(...r.left);n++}
    }catch(e){errs.push(f.name+': '+(e.message||e))}}busyCount(files.length,files.length)});
  if(game.length){leftImgs.forEach(it=>game.push({f:it.blob,path:it.path}));leftImgs=[]}
  if(leftImgs.length){for(const it of leftImgs){try{await impAddImage(it.blob,it.path,(it.path.split('.').pop()||'png').toLowerCase())}catch(e){}}impRefreshStats();
    toast(leftImgs.length+' images didn\'t belong to a team in the file. They are on Import / Export → Import files to match by hand.','');}
  if(errs.length)toast('Could not read: '+errs.join('; '),'err');
  // online, Import files is for signed-in accounts only (GUEST_VIEWS): a guest is told to sign in, and nothing is read
  if(game.length&&isGuest()){toast(GUEST_MSG+' Team and competition files and large ZIPs are read on Import files.','err');if(n)location.hash='review';return}
  if(game.length){ACT.openImport();await impReadFiles(game);
    if(n)toast('The update files are in Process and Review; the team and competition files are on Import: tick what you want and install it.','ok');return}
  if(n)location.hash='review';else if(leftImgs.length)location.hash='import'}
async function fetchImage(url){const ctl=new AbortController();const tm=setTimeout(()=>ctl.abort(),20000);
  const ok=b=>{if(!/^image\//.test(b.type)&&!/\.(png|jpe?g|webp|svg)(\?|$)/i.test(url))throw new Error('not an image');return b};
  try{if(!/footylogos\.com/i.test(url)){try{const r=await fetch(url,{mode:'cors',signal:ctl.signal});if(r.ok)return await flFix(ok(await r.blob()))}catch(e){if(!(window.claude&&window.claude.standalone))throw e}}
    if(!(window.claude&&window.claude.standalone))throw new Error('blocked by the site');
    const r=await fetch('api/image?url='+encodeURIComponent(url),{signal:ctl.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await flFix(await r.blob())}
  finally{clearTimeout(tm)}}
const nkey=s=>norm(String(s||'').replace(/\.[a-z0-9]{2,4}$/i,''));
async function importUpdateData(data,fname,imgs){expandCompact(data);if(!data||(!data.teams&&!data.comps))throw new Error('not an update file');if(!data.mode)data.mode='partial';
  data.notes=Array.isArray(data.notes)?data.notes:[];const clubNames=new Map(),compNames=new Map();
  Object.values(data.teams||{}).forEach(t=>t&&t.name&&clubNames.set(nkey(t.name),t.name));Object.values(data.comps||{}).forEach(c=>c&&c.name&&compNames.set(nkey(c.name),c.name));
  const em={},cem={},left=[];
  const pickClub=base=>{const k=nkey(base);if(clubNames.has(k))return{name:clubNames.get(k)};let best=null,bs=0;clubNames.forEach(n=>{const s=nameScore(base,n);if(s>bs){bs=s;best=n}});if(best&&bs>=0.85)return{name:best};
    const t=matchTeam(base);return t?{team:t}:null};
  const pickComp=base=>{const k=nkey(base);if(compNames.has(k))return{name:compNames.get(k)};const c=matchComp(base);return c?{comp:c}:null};
  const addEm=async(blob,base,isComp)=>{const hit=isComp?pickComp(base):pickClub(base);if(!hit)return false;const nm=hit.name||(hit.team||hit.comp).name;
    const rec=await addImageFromBlob(blob,isComp?'comp':'emblem',nm+(isComp?' logo':' crest')+' (update file)');(isComp?cem:em)[nkey(nm)]={id:rec.id,obj:hit.team||hit.comp||null};return true};
  for(const it of imgs){const low=it.path.toLowerCase();if(/(kit|strip|manager|coach)/.test(low)){left.push(it);continue}
    const base=it.path.split('/').pop();const isComp=/(competition|league|cup|tournament)s?\//.test(low);
    try{if(!await addEm(it.blob,base,isComp)&&!(isComp?false:await addEm(it.blob,base,true)))left.push(it)}catch(e){left.push(it)}}
  // links instead of files: try to fetch them; list the ones the browser can't reach
  const links=[...Object.entries((data.assets||{}).emblems||{}).map(([n,u])=>[n,u,false]),...Object.entries((data.assets||{}).compEmblems||{}).map(([n,u])=>[n,u,true])].filter(([n,u])=>/^https?:\/\//.test(String(u)));
  const failed=[];for(const grp of chunk(links,4))await Promise.all(grp.map(async([n,u,isComp])=>{const nm=(data.teams&&data.teams[n]&&data.teams[n].name)||(data.comps&&data.comps[n]&&data.comps[n].name)||n;
    if((isComp?cem:em)[nkey(nm)])return;try{const b=await fetchImage(u);if(!await addEm(b,nm,isComp))failed.push([nm,u])}catch(e){failed.push([nm,u])}}));
  if(failed.length){data.notes.push(`${failed.length} crest links couldn't be downloaded by the browser. Open each link, save the image, and drop the images on Import / Export → Import files:`);failed.forEach(([n,u])=>data.notes.push(n+': '+u))}
  data.__em=em;data.__cem=cem;await importStudioFile({name:fname},null,data);return{left}}
// attach crests to the clubs and competitions in the update, or to clubs already in the project
const _mergeIncoming=mergeIncoming;
mergeIncoming=function(data){const m=_mergeIncoming(data);const em=data.__em||{},cem=data.__cem||{};
  Object.values(m.teams).forEach(t=>{const e=em[nkey(t.name)];if(e){t.emblem=e.id;e.used=true}});
  Object.values(m.comps).forEach(c=>{const e=cem[nkey(c.name)];if(e){c.emblem=e.id;e.used=true}});
  Object.values(em).forEach(e=>{if(!e.used&&e.obj&&S.teams[e.obj.id]){const t=clone(S.teams[e.obj.id]);t.emblem=e.id;m.teams[t.id]=t}});
  Object.values(cem).forEach(e=>{if(!e.used&&e.obj&&S.comps[e.obj.id]){const c=clone(S.comps[e.obj.id]);c.emblem=e.id;m.comps[c.id]=c}});
  return m};
// links in review notes are clickable
function linkify(s){return esc(s).replace(/https?:\/\/[^\s<]+/g,u=>`<a href="${u}" target="_blank" rel="noopener">${u.length>70?u.slice(0,67)+'…':u}</a>`)}
// files dropped on Import files: update files there go through the same path
{const _intake=impIntake;impIntake=async function(blob,path){const name=path.split('/').pop();
  if(/\.json$/i.test(name)){const d=JSON.parse(await blob.text());if(d&&d.mode&&(d.teams||d.comps)){await importUpdateData(d,name,[]);return}}
  return _intake(blob,path)}}
// images added before their club existed get matched again when the Import page opens

/* ================= Settings ================= */
// the Settings page itself is js/app-settings.js; these save its project fields
document.addEventListener('change',e=>{const el=e.target;if(el.closest&&el.closest('#sf')&&el.dataset.s){S.settings[el.dataset.s]=el.value;saveSettings();toast('Saved','ok')}
  if(el.closest&&el.closest('#sz')&&el.dataset.z){S.settings.sizes[el.dataset.z]=clamp(+el.value||256,64,2048);saveSettings();toast('Saved','ok')}});

/* ================= v4: move the whole project between copies (claude.ai ⇄ local / cloud) ================= */
// snapshots are left out on purpose: only the current data, images, team-file templates, review queue, jobs and history move
const XFER_COLS=['teams','comps','images','settings','pending','teds','jobs','history'];
const XFER_FILE='project-transfer.zip';
function xferDocs(){const d={teams:Object.values(S.teams),comps:Object.values(S.comps),images:Object.values(S.images),pending:Object.values(S.pending),
  teds:Object.values(S.teds||{}),jobs:Object.values(S.jobs||{}).filter(j=>j.status!=='done'),history:Object.values(S.history||{})};
  const st=Object.assign({},clone(S.settings),{id:'main'});delete st.baseline;d.settings=[st];return d}
ACT.xferExport=async()=>{if(typeof JSZip==='undefined'){toast('ZIP library not loaded','err');return}
  try{if(typeof histFlush==='function')await histFlush()}catch(e){}
  const docs=xferDocs();const refs=[...new Set([...docs.images.map(i=>i.ref),...docs.teds.map(t=>t.ref)].filter(Boolean))];
  const z=new JSZip();const files={};let miss=0;const signal=startAI(refs.length+1);S.ui.ai.label='Collecting images…';
  try{let done=0;for(const grp of chunk(refs,6)){if(signal.aborted)throw new Error('Stopped');await Promise.all(grp.map(async ref=>{try{const b=await Store.getBlob(ref);if(!b){miss++;return}
        const ext=/svg/.test(b.type)?'svg':/jpe?g/.test(b.type)?'jpg':/webp/.test(b.type)?'webp':/png/.test(b.type)?'png':'bin';const name='blobs/'+ref.replace(/[^a-z0-9]/gi,'_')+'.'+ext;
        z.file(name,b);files[ref]={file:name,type:b.type||'application/octet-stream'}}catch(e){miss++}}));done+=grp.length;S.ui.ai.label='Collecting files '+done+' of '+refs.length;progStep()}
    z.file('project.json',JSON.stringify({app:'pes21-option-studio',kind:'full-transfer',version:1,exportedAt:Date.now(),season:S.settings.season,counts:{teams:docs.teams.length,players:allPlayers().length,images:docs.images.length},collections:docs,files}));
    S.ui.ai.label='Packing the ZIP…';const blob=await z.generateAsync({type:'blob',compression:'STORE'});progStep();
    const dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;if(!dl)throw new Error('downloads aren\'t available here; open the studio from start.bat or the website');
    await dl.save({filename:XFER_FILE,data:blob});toast(`Project packed: ${docs.teams.length} teams, ${docs.images.length} images${miss?`, ${miss} files missing`:''} (${kb(blob.size)})`,'ok')}
  catch(e){toast('Could not pack the project: '+e.message,'err')}finally{endAI()}};
async function xferImport(blob,{confirm=true}={}){const z=await JSZip.loadAsync(blob);const pj=z.file('project.json');if(!pj)throw new Error('This ZIP is not a project transfer');
  const P=JSON.parse(await pj.async('string'));if(P.kind!=='full-transfer')throw new Error('This ZIP is not a project transfer');const C=P.collections||{};
  const have=teamsArr().length;
  if(confirm&&!await ask('Load whole project',`Load <b>${(C.teams||[]).length} teams</b>, ${(C.images||[]).length} images and the review queue from this file?${have?` This <b>replaces</b> your ${have} current teams (a snapshot is taken first).`:''}`,'Load project',!!have))return false;
  if(have)await takeSnapshot('Before loading a project transfer',true);
  await miniBusy('Loading the project…',async()=>{
    const map={};const ents=Object.entries(P.files||{});let i=0;
    // one bar for the whole load: every file, then every record saved (current records cleared + incoming ones written)
    const recs=XFER_COLS.reduce((a,col)=>a+(col==='settings'?0:Object.keys(S[col]||{}).length)+(C[col]||[]).length,0);const total=ents.length+recs;busyCount(0,total,'Loading files 0 of '+ents.length);
    for(const grp of chunk(ents,8)){await Promise.all(grp.map(async([ref,f])=>{const zf=z.file(f.file);if(!zf)return;const b=new Blob([await zf.async('arraybuffer')],{type:f.type});map[ref]=await Store.putBlob(b,/^image\//.test(f.type)?f.type:'text/plain')}));i+=grp.length;busyCount(i,total,'Loading files '+i+' of '+ents.length)}
    const fixRef=o=>{if(o&&o.ref&&map[o.ref])o.ref=map[o.ref];return o};
    // clear what is there, then write the incoming documents with their original ids
    for(const col of XFER_COLS){const cur=col==='settings'?[]:Object.keys(S[col]||{});cur.forEach(id=>Store.del(col,id));if(col!=='settings')S[col]={}}
    (C.images||[]).forEach(d=>{fixRef(d);S.images[d.id]=d;Store.put('images',d)});(C.teds||[]).forEach(d=>{fixRef(d);S.teds[d.id]=d;Store.put('teds',d)});
    (C.teams||[]).forEach(d=>{S.teams[d.id]=d;Store.put('teams',d)});(C.comps||[]).forEach(d=>{S.comps[d.id]=d;Store.put('comps',d)});
    (C.pending||[]).forEach(d=>{S.pending[d.id]=d;Store.put('pending',d)});(C.jobs||[]).forEach(d=>{if(d.status==='running')d.status='queued';S.jobs[d.id]=d;Store.put('jobs',d)});
    (C.history||[]).forEach(d=>{S.history[d.id]=d;Store.put('history',d)});
    const st=(C.settings||[])[0];if(st){const keepBase=S.settings.baseline&&S.snaps[S.settings.baseline]?S.settings.baseline:null;S.settings=Object.assign(clone(DEFAULT_SETTINGS),st,{sizes:Object.assign(clone(DEFAULT_SETTINGS.sizes),st.sizes||{}),baseline:keepBase});saveSettings()}
    S._saved={};Object.values(S.teams).forEach(t=>S._saved[t.id]=clone(t));
    // wait for every record to be stored (up to 15 minutes), showing how many are left
    for(let k=0;k<9000&&Store.pending()>0;k++){const left=Store.pending();busyCount(ents.length+Math.max(0,recs-left),total,(Store.mode==='cloud'?'Saving to the cloud… ':'Saving… ')+left+' left');await sleep(100)}});
  ensureWorldCup();const left=Store.pending();
  toast(left?`Loaded ${(C.teams||[]).length} teams and ${(C.images||[]).length} images. Still saving ${left} change${left===1?'':'s'} in the background: keep this page open until the left menu says "All changes saved".`
            :`Loaded ${(C.teams||[]).length} teams and ${(C.images||[]).length} images. Project saved${Store.mode==='cloud'?' to the cloud':''}: all changes stored.`,left?'err':'ok');
  location.hash='overview';rerender();return true}
ACT.xferImport=async()=>{const f=await filePicker('.zip,application/zip');if(!f)return;try{await xferImport(f)}catch(e){toast('Could not load: '+e.message,'err')}};
// a transfer ZIP dropped anywhere the studio reads files goes to the loader
// a large ZIP is never opened whole in the browser: its file list (at the end of the file) says whether it holds project.json
const zipTailHas=async(f,name)=>{try{const t=new Uint8Array(await f.slice(Math.max(0,f.size-8*1048576)).arrayBuffer());const n=new TextEncoder().encode(name);
  outer:for(let i=0;i<=t.length-n.length;i++){for(let k=0;k<n.length;k++)if(t[i+k]!==n[k])continue outer;return true}return false}catch(e){return false}};
{const _iuf=importUpdateFiles;importUpdateFiles=async function(files){const rest=[];for(const f of files){if(/\.zip$/i.test(f.name)&&(f.size<=400*1048576||await zipTailHas(f,'project.json'))){try{const z=await JSZip.loadAsync(f);const pj=z.file('project.json');
        if(pj&&/"kind":"full-transfer"/.test((await pj.async('string')).slice(0,200))){await xferImport(f);continue}}catch(e){}}rest.push(f)}if(rest.length)return _iuf(rest)}}
// The site's baseline is an option file (docs/DATABASE_RULES.md, 5): the one the owner uploaded and chose, the same for every
// visitor and account. An empty project is built from it; building again later takes a newer one. Its build becomes the
// project's baseline snapshot, so "changes since baseline" starts from it.
async function siteBaseline(){try{const r=await fetch('api/baseline/info',{cache:'no-store',credentials:'same-origin'});if(!r.ok)return null;return (await r.json()).package||null}catch(e){return null}}
async function buildFromSiteBaseline(){const b=await siteBaseline();if(!b){toast('This site has no baseline option file yet','err');return false}
  return startFresh(b.id,b.name,b)}
// Building from an option file (the site's baseline or the user's own upload) starts over with a clean slate: the whole project
// is deleted first (records, snapshots, review queue, history, stored files, lookup caches), the page reloads empty, and the
// option file is the only source. Nothing of the old project is kept or merged in.
const FRESH_KEY='pes21-fresh-build';
async function wipeProject(){
  Store.timers.forEach(t=>clearTimeout(t));Store.timers.clear();Store.latest.clear();Store.again.clear();Store.retries.clear();
  for(let k=0;k<300&&Store.inflight.size;k++)await sleep(100);
  if(Store.mode==='cloud'){const r=await fetch('api/wipe',{method:'POST',headers:{'X-Studio':'1'},credentials:'same-origin'});const o=await r.json().catch(()=>({}));if(!r.ok)throw new Error(o.error||('error '+r.status));
    // the copy kept in this browser from before signing in goes too: signing in again would carry it back into the cloud project
    sessionStorage.removeItem(CARRY_KEY);try{await new Promise((res,rej)=>{const q=indexedDB.open('pes21-option-studio',1);q.onupgradeneeded=()=>{q.result.createObjectStore('docs');q.result.createObjectStore('blobs')};
      q.onsuccess=()=>{const db=q.result;const t=db.transaction(['docs','blobs'],'readwrite');t.objectStore('docs').clear();t.objectStore('blobs').clear();t.oncomplete=()=>{db.close();res()};t.onerror=()=>{db.close();rej(t.error)}};q.onerror=()=>rej(q.error)})}catch(e){console.warn('browser copy',e)}}
  else if(Store.mode==='local'){await Store._tx('docs','readwrite',s=>s.clear());await Store._tx('blobs','readwrite',s=>s.clear())}
  else{Store.mem.clear();Store.memBlobs.clear()}
  Object.keys(localStorage).filter(k=>k.startsWith('pes21.')).forEach(k=>localStorage.removeItem(k))}
async function startFresh(pkg,label,base){
  const n=teamsArr().length+compsArr().length+Object.keys(S.snaps).length+Object.keys(S.pending).length+Object.keys(S.images).length;const nSrc=(S.settings.ofSources||[]).filter(x=>x&&x.id!==pkg).length;
  if(n&&!await askRisk('Start over from '+label+'?','Building from an option file starts from a <b>clean slate</b>: the whole current project is deleted first.'+(nSrc?' It is then built from <b>'+esc(label)+'</b> and the <b>'+nSrc+'</b> option file'+(nSrc===1?'':'s')+' imported since, read again in order; anything else you changed is not kept.':' Nothing of it is kept or merged.'),'Delete and start over'))return false;
  // the option files imported since and your picks (Health check) come along: a rebuild reads them all again (DATABASE_RULES 5a).
  // Noted before the project is cleared: the codes their teams hold now, so the rebuild puts them back where they are.
  if(typeof ofSourceCodes==='function')ofSourceCodes();
  const keep={sources:clone(S.settings.ofSources||[]).filter(x=>x&&x.id&&x.id!==pkg),ofPick:clone(S.settings.ofPick||{}),ofCPick:clone(S.settings.ofCPick||{}),ofImgPick:clone(S.settings.ofImgPick||{})};
  try{await miniBusy('Clearing the project…',wipeProject)}catch(e){toast('Could not clear the project: '+e.message,'err');return false}
  sessionStorage.setItem(FRESH_KEY,JSON.stringify({pkg,label,base:!!base,at:base&&base.at||0,keep}));sessionStorage.setItem('xferAsked','1');location.reload();return true}
// after the reload: the project is empty, so the option file is all there is
async function finishFresh(){const raw=sessionStorage.getItem(FRESH_KEY);if(!raw)return false;sessionStorage.removeItem(FRESH_KEY);
  let F;try{F=JSON.parse(raw)}catch(e){return false}
  startAI();try{const K=F.keep||{};['ofPick','ofCPick','ofImgPick'].forEach(k=>{if(K[k])S.settings[k]=K[k]});const r=await ofBuild(F.pkg,F.label,K.sources||[]);OF_MAN.delete(F.pkg);ensureWorldCup();
    await ensureGameFiles();// the automatic steps after a build (game files, IDs, national flags) belong to the baseline, not to your changes
    if(F.base){const sn=await takeSnapshot('Baseline: '+F.label,true);S.settings.baseline=sn.id;S.settings.baselineAt=(+F.at||0)*1000||Date.now();S.ui.blInfo=null;saveSettings()}
    toast(`Started over from ${F.label}${(K.sources||[]).length?' and '+K.sources.length+' option file'+(K.sources.length===1?'':'s')+' imported since':''}: ${r.added} teams, ${r.ceds} competition files`,'ok')}
  catch(e){aiLog('Error: '+e.message);toast('Could not build from '+F.label+': '+e.message,'err')}finally{endAI();rerender()}return true}
async function fetchZip(url){try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)return null;const b=await r.blob();return b.size<100?null:b}catch(e){return null}}
// signing in on the website continues where the visitor left off: the project kept in this browser before signing in
// is carried into the cloud project (straight away when the cloud project is empty, after asking when it isn't)
const CARRY_KEY='pes21-carry';
async function carryBrowserProject(){if(!sessionStorage.getItem(CARRY_KEY))return false;sessionStorage.removeItem(CARRY_KEY);
  if(Store.mode!=='cloud'||typeof JSZip==='undefined')return false;
  let idb;try{idb=await new Promise((res,rej)=>{const r=indexedDB.open('pes21-option-studio',1);r.onupgradeneeded=()=>{r.result.createObjectStore('docs');r.result.createObjectStore('blobs')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}catch(e){return false}
  const tx=(st,fn)=>new Promise((res,rej)=>{const t=idb.transaction(st,'readonly');const r=fn(t.objectStore(st));t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error)});
  try{const C={};for(const col of XFER_COLS)C[col]=(await tx('docs',s=>s.getAll(IDBKeyRange.bound(col+'/',col+'/￿'))))||[];
    C.jobs=C.jobs.filter(j=>j.status!=='done');C.settings=C.settings.filter(x=>x.id==='main').map(x=>{const st=clone(x);delete st.baseline;return st});
    if(!C.teams.length)return false;
    const have=teamsArr().length;
    if(have&&!await ask('Continue where you left off?',`Before signing in you worked on <b>${C.teams.length} teams</b> in this browser. Your cloud project already has ${have} teams. Load this browser's work into your cloud project? It <b>replaces</b> the cloud project (a snapshot is taken first). Cancel keeps the cloud project; this browser's copy stays here.`,"Use this browser’s work",true))return true;
    const z=new JSZip();const files={};const refs=[...new Set([...C.images.map(i=>i.ref),...C.teds.map(t=>t.ref)].filter(r=>r&&r.startsWith('l:')))];
    for(const ref of refs){const b=await tx('blobs',s=>s.get(ref.slice(2)));if(!b)continue;const name='blobs/'+ref.replace(/[^a-z0-9]/gi,'_');z.file(name,b);files[ref]={file:name,type:b.type||'application/octet-stream'}}
    z.file('project.json',JSON.stringify({app:'pes21-option-studio',kind:'full-transfer',version:1,exportedAt:Date.now(),collections:C,files}));
    sessionStorage.setItem('xferAsked','1');
    await xferImport(await z.generateAsync({type:'blob',compression:'STORE'}),{confirm:false});return true}
  catch(e){toast('Could not carry over the work from before you signed in: '+e.message,'err');return true}
  finally{idb.close()}}
/* ----- The project is backed up to disk when the studio runs on this computer (rule book "Project backup") -----
   A browser's own storage is not a safe only home for a project: an embedded browser's is emptied between sessions, and the
   whole test project was lost that way on 2026-11-20. So the local server keeps a copy: the whole project (teams, players,
   competitions, team files, images that aren't the option file's, settings, the review queue, history and the baseline
   snapshot) as one ZIP, written a few minutes after anything changes and on request, and offered back when the studio opens
   empty. Option-file images are not copied: they are still referred to (o:<package>|<path>). */
let BK={at:0,sig:'',busy:false,err:'',size:0};
const bkSig=()=>{let m=0;teamsArr().forEach(t=>{if(t.updatedAt>m)m=t.updatedAt});return teamsArr().length+'|'+m+'|'+compsArr().length+'|'+Object.keys(S.pending).length+'|'+Object.keys(S.images).length+'|'+JSON.stringify(S.settings).length};
async function localBackup(quiet){if(!LOCAL_SAVE||BK.busy||typeof JSZip==='undefined')return false;if(!teamsArr().length)return false;BK.busy=true;BK.err='';const sig=bkSig();
  try{try{if(typeof histFlush==='function')await histFlush()}catch(e){}
    const docs=xferDocs();const st=docs.settings[0];const bid=S.settings.baseline;const snap=bid&&S.snaps[bid]?clone(S.snaps[bid]):null;if(snap){st.baseline=bid;docs.snaps=[snap]}
    const refs=[...new Set([...docs.images.map(i=>i.ref),...docs.teds.map(t=>t.ref),snap&&snap.ref].filter(r=>r&&!isOfRef(r)))];const z=new JSZip();const files={};let miss=0;
    for(const grp of chunk(refs,6))await Promise.all(grp.map(async ref=>{try{const b=await Store.getBlob(ref);if(!b){miss++;return}const name='blobs/'+ref.replace(/[^a-z0-9]/gi,'_');z.file(name,b);files[ref]={file:name,type:b.type||'application/octet-stream'}}catch(e){miss++}}));
    if(snap&&!files[snap.ref]&&S.snapData[bid]){const name='blobs/baseline_snapshot';z.file(name,JSON.stringify(S.snapData[bid]));snap.ref='inline:baseline';files[snap.ref]={file:name,type:'text/plain'}}
    z.file('project.json',JSON.stringify({app:'pes21-option-studio',kind:'full-transfer',version:1,exportedAt:Date.now(),season:S.settings.season,counts:{teams:docs.teams.length,players:allPlayers().length,images:docs.images.length},collections:docs,files}));
    const blob=await z.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:1}});
    const r=await ofFetchRetry(()=>fetch('api/local/backup',{method:'POST',headers:{'X-Studio':'1'},body:blob}),'Saving the backup');const o=await r.json().catch(()=>({}));if(!r.ok)throw new Error(o.error||'the local server answered '+r.status);
    BK.at=o.at||Date.now();BK.size=o.size||blob.size;BK.sig=sig;if(LOCAL_SAVE)LOCAL_SAVE.backup={at:BK.at,size:BK.size};if(!quiet)toast('Project backed up on this computer ('+kb(BK.size)+')'+(miss?'; '+miss+' files could not be read':''),'ok');return true}
  catch(e){BK.err=e.message||String(e);if(!quiet)toast('The backup could not be saved: '+BK.err,'err');else console.warn('backup',e);return false}finally{BK.busy=false;if(S.ui.view==='settings')rerender()}}
// a backup follows the work: checked every minute, written when something changed and the last one is 3 minutes old
setInterval(()=>{if(!LOCAL_SAVE||BK.busy||S.ui.ai.running||S.ui.ai.busy||!teamsArr().length)return;if(!BK.sig){BK.sig=LOCAL_SAVE.backup?'':'none'}if(bkSig()===BK.sig)return;if(Date.now()-BK.at<180000)return;localBackup(true)},60000);
// loading it back: the project, then the baseline snapshot it was compared with
async function localRestore(blob,opts){const z=await JSZip.loadAsync(blob);const P=JSON.parse(await z.file('project.json').async('string'));const ok=await xferImport(blob,opts);if(!ok)return false;
  const sn=((P.collections||{}).snaps||[])[0];const bid=((P.collections.settings||[])[0]||{}).baseline;
  if(sn&&bid){try{const f=(P.files||{})[sn.ref];const zf=f&&z.file(f.file);if(zf){const json=await zf.async('string');sn.ref=await Store.putBlob(new Blob([json],{type:'text/plain'}),'text/plain');delete sn.uploading;delete sn.failed;S.snaps[sn.id]=sn;S.snapData[sn.id]=JSON.parse(json);Store.put('snaps',sn);S.settings.baseline=bid;saveSettings()}}catch(e){console.warn('baseline snapshot not restored',e)}}
  BK.sig=bkSig();BK.at=Date.now();rerender();return true}
ACT.backupLocal=()=>localBackup(false);
ACT.restoreLocal=async()=>{const b=await fetchZip('api/local/backup');if(!b){toast('There is no backup on this computer yet','err');return}try{await localRestore(b)}catch(e){toast('The backup could not be loaded: '+e.message,'err')}};
async function xferAutoOffer(){if(S._loadFailed){toast('Part of your project could not be loaded. Reload the page before making changes.','err');return}
  if(await finishFresh())return;
  if(await carryBrowserProject())return;
  if(!(window.claude&&window.claude.standalone)||teamsArr().length||sessionStorage.getItem('xferAsked'))return;
  try{const bk=await fetchZip('api/local/backup');if(bk){sessionStorage.setItem('xferAsked','1');if(await localRestore(bk))return}
    const local=await fetchZip('data/'+XFER_FILE);if(local){sessionStorage.setItem('xferAsked','1');await xferImport(local);return}
    firstRunChoice()}catch(e){console.warn(e)}}
// first run (an empty project): the user picks how to start, their own option file or the system baseline
async function firstRunChoice(){
  const base=await siteBaseline();const hasBase=!!base;
  if(teamsArr().length)return;
  const guest=isGuest();
  modal(`<div class="mhead"><h2>How do you want to start?</h2></div>
   <p class="small">Your project is empty. Pick where it starts from; you can change your mind later (Import / Export → Import Option File, or Settings → Baseline data).</p>
   <div class="grid g2" style="margin-top:12px">
    <div class="card"><h3>Upload your own option file</h3><p class="small">Your PES 2021 option file (.zip). The project is built from its own team and competition files and images, and exports give back the same file set for your USB drive. ${guest?'<b>Needs a Google sign-in</b> (bottom of the left menu); this choice comes back once you are signed in.':isMember()?'It stays in your own private storage: only you can see or use it.':''}</p>
     <button class="primary" data-act="firstOf">${guest?'Sign in to upload':'Upload my option file'}</button></div>
    <div class="card"><h3>Start from the site's option file</h3><p class="small">${hasBase?'<b>'+esc(base.name)+'</b>, the option file this site is built on: its competitions, teams, players, logos and kits.':'The option file this site is built on.'} ${guest?'Works without signing in; when you sign in later, your work carries over.':'It builds your own project; your changes never touch the site\'s copy.'}</p>
     <button ${hasBase?'':'disabled'} data-act="firstBase">${hasBase?'Start from it':'No option file on this site yet'}</button></div>
   </div>
   <div class="row end" style="margin-top:12px"><button class="ghost sm" data-act="firstLater">Decide later</button></div>`,true)}
ACT.firstOf=()=>{closeModal();if(isGuest()){const b=$('#st-account');if(b){b.scrollIntoView({block:'center'});b.style.outline='2px solid var(--gold)';setTimeout(()=>b.style.outline='',4000)}toast('Sign in with Google at the bottom of the left menu, then upload your option file.','ok');return}
  sessionStorage.setItem('xferAsked','1');S.ui.ofTab='of';location.hash='optionfile';setTimeout(()=>{const i=$('#of-file');if(i)i.click()},400)};
ACT.firstBase=async()=>{closeModal();sessionStorage.setItem('xferAsked','1');await buildFromSiteBaseline()};
ACT.firstLater=()=>{closeModal();sessionStorage.setItem('xferAsked','1')};
ACT.loadBaseline=async()=>{const b=await siteBaseline();if(!b){toast('This site has no baseline option file yet','err');return}
  await startFresh(b.id,b.name,b)};
{const _eb=extBoot;extBoot=async function(){await _eb();setTimeout(xferAutoOffer,600)}}


/* ----- v2 glue ----- */

{const _cmp=VIEWS.compare;VIEWS.compare=()=>_cmp()+historyHTML()}
{const _nb=navBadges;navBadges=function(){_nb();const b=$('#nb-health');if(!b)return;// the same number as the page's Must fix tile: only what blocks an export (cup copies are a tidy-up, listed under More checks)
  let n=0;try{n=healthIssues().filter(i=>i.sev==='err').length}catch(e){}b.hidden=!n;b.textContent=n;b.title=n+' problem'+(n===1?'':'s')+' must be fixed before you export'}}
