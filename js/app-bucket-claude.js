// PES 2021 Option Studio: the CLAUDE bucket, the Ask Claude table and the router of every job (the user, 2026-11-25).
// The parts are one program in one global scope, loaded in order by index.html; this file wraps queueAdd, aiText and extBoot.
"use strict";
/* ================= Bucket 4 of 4: Claude, only when asked =================
   "no automatic claude triggers. make 'ask claude' appear only in Process and review once a job is not completed from free
   sources." Three parts:

   1 THE TABLE (Process and Review → Ask Claude). One row per thing waiting for an answer the free buckets did not give:
       squad     a team's players no free source has                     Ask Claude → a team job (Claude only)
       details   players' details and ratings still missing              Ask Claude → details and ratings jobs
       comp      a competition's teams the free lists don't have         Ask Claude → a team-list job
       manager   coach, stadium, formation and playstyle                 Ask Claude → a team job (manager part)
       lookup    a look-up the free sources couldn't settle              Ask Claude → the same look-up, with Claude
     and what has no free source at all, which is put here directly ("bypass the free sources"):
       kits      a team's kit colours and sponsors                       Ask Claude → a kits job
       newteam   a team that is not in the project and no free source has  Ask Claude → a team draft
       newcomp   a competition that is not in the project                Ask Claude → a competition draft
       intl      this season's international competitions                Ask Claude → the international search
     and images, which never go to Claude ("remove claude from this flow"):
       crest     a team crest no image source has                        Create and edit → the studio draws one and
       logo      a competition logo no image source has                    opens it (emblem maker / the competition)
     Kept in this browser (localStorage 'pes21.freeMiss', as the list it grew from): it is not part of the project.

   2 THE ROUTER (queueAdd). Every job passes here before it is queued. A job that was not asked for in the table is turned
     into Live update jobs for the free buckets (app-buckets.js), and what only Claude can do becomes a row of the table.
     Old job types saved in a queue are routed the same way when the studio opens.

   3 THE GUARD (aiText). Claude answers only inside a job that carries asked:true, which only the table sets, or from a
     button that is itself a question to Claude and runs no job (Claude: suggest colours). Anything else is refused. */

// ---- 1. the table
const ASK=(()=>{try{return JSON.parse(localStorage.getItem('pes21.freeMiss')||'{}')}catch(e){return{}}})();
const askSave=()=>{try{localStorage.setItem('pes21.freeMiss',JSON.stringify(ASK))}catch(e){}};
let ASK_NEW=0;// rows added since the last message, so one command says it once
function askAdd(m){const k=m.kind+'|'+m.teamId,o=ASK[k];if(!o)ASK_NEW++;
  if(o&&m.ids)m.ids=[...new Set([...(o.ids||[]),...m.ids])];if(o&&m.keys)m.keys=[...new Set([...(o.keys||[]),...m.keys])];if(o&&m.gaps)m.gaps=Object.assign({},o.gaps,m.gaps);
  ASK[k]=Object.assign({},o,m,{at:Date.now()});askSave();if(typeof navBadges==='function')navBadges()}
const askGaps=(m,p)=>playerGaps(p).filter(g=>g!=='number'&&(!m.gaps||!m.gaps[p.id]||m.gaps[p.id].includes(g)));
const ASK_IMG=new Set(['crest','logo']);
// the rows still true now (the team exists and still misses it); the others are dropped
function askLive(){const out=[];let ch=false;const drop=k=>{delete ASK[k];ch=true};
  for(const [k,m] of Object.entries(ASK)){
    if(m.kind==='comp'||m.kind==='logo'){const c=S.comps[m.compId];if(!c||(m.kind==='comp'&&!emptyComps().includes(c))||(m.kind==='logo'&&!missLogo(c))){drop(k);continue}out.push({k,m,t:{id:c.id,name:c.name},ps:[],comp:c});continue}
    if(m.kind==='newcomp'){if(compsArr().some(c=>norm(c.name)===norm(m.name))){drop(k);continue}out.push({k,m,t:{id:'',name:m.name},ps:[]});continue}
    if(m.kind==='newteam'){if(!m.virtual||teamsArr().some(t=>norm(t.name)===norm(m.name))){drop(k);continue}out.push({k,m,t:{id:'',name:m.name},ps:[]});continue}
    if(m.kind==='intl'){out.push({k,m,t:{id:'',name:'International competitions'},ps:[]});continue}
    if(m.kind==='lookup'){if(!(m.ids||m.keys||[]).length){drop(k);continue}out.push({k,m,t:{id:'',name:m.name||'Look-up'},ps:[]});continue}
    const t=S.teams[m.teamId];if(!t){drop(k);continue}
    if(m.kind==='details'){const ps=(t.players||[]).filter(p=>(m.ids||[]).includes(p.id)&&askGaps(m,p).length);if(!ps.length){drop(k);continue}out.push({k,m,t,ps});continue}
    if(m.kind==='crest'&&!missCrest(t)){drop(k);continue}
    if(m.kind==='kits'&&!missKits(t)){drop(k);continue}
    if(m.kind==='manager'&&!missCoach(t)&&(t.stadium||isNationalTeam(t))&&t.formation){drop(k);continue}
    out.push({k,m,t,ps:[]})}
  if(ch)askSave();return out.sort((a,b)=>b.m.at-a.m.at)}
// the Claude jobs a row becomes; every one carries asked:true (the guard lets only those through)
function askJobs(x){const season=S.settings.season,t=x.t,m=x.m;const A=j=>Object.assign(j,{asked:true,season});
  switch(m.kind){
    case 'comp':return[A({type:'compCheck',compId:m.compId,label:'Teams: '+t.name})];
    case 'squad':return[A({type:'team',teamId:t.id,parts:['roster','transfers','newStats','bio'],claudeOnly:true,label:'Claude: players for '+t.name})];
    case 'manager':return[A({type:'team',teamId:t.id,parts:['manager'],claudeOnly:true,label:'Claude: manager and stadium of '+t.name})];
    case 'kits':return[A({type:'kits',teamId:t.id,label:'Kits: '+t.name})];
    case 'newteam':return[A({type:'team',virtual:m.virtual,parts:['roster','newStats','bio','styles','manager','kits'],claudeOnly:true,label:m.name+' (new team)'})];
    case 'newcomp':return[A({type:'comp',name:m.name,country:m.country||'',squads:m.squads!==false,stats:m.stats!==false,label:m.name})];
    case 'intl':return[A({type:'intl',full:m.full!==false,label:'International competitions ('+season+')'})];
    case 'lookup':return[A(Object.assign({type:m.job,label:m.name||'Look-up'},m.ids?{ids:m.ids}:{},m.keys?{keys:m.keys}:{}))];
    case 'details':{const jobs=[];const dg=x.ps.filter(p=>detailGaps(p).length).map(p=>p.id);if(dg.length)jobs.push(A({type:'details',ids:dg,label:t.name}));
      const un=x.ps.filter(unrated).map(p=>p.id);if(un.length)jobs.push(A({type:'ratings',ids:un,label:'Claude: ratings for '+t.name}));return jobs}
    default:return[]}}
const askWhat=x=>{const m=x.m,w=m.why?' ('+esc(m.why)+')':'';
  switch(m.kind){
    case 'comp':return'Its teams this season'+w;case 'squad':return'Its players'+w;case 'manager':return'Coach, stadium, formation and playstyle'+w;
    case 'kits':return'Kit colours and sponsors: no free source has them';case 'newteam':return'A new team: no free source has it'+w;case 'newcomp':return'A new competition: its teams'+(m.squads!==false?', and every team drafted':'')+'. No free source builds one';
    case 'intl':return'This season\'s competitions for national teams, with the teams taking part. No free source lists them';
    case 'lookup':return esc(m.what||'A look-up the free sources could not settle')+' ('+(m.ids||m.keys||[]).length+')';
    case 'crest':return'No image source has its crest';case 'logo':return'No image source has its logo';
    default:{const g={};x.ps.forEach(p=>askGaps(m,p).forEach(k=>g[k]=(g[k]||0)+1));return hcPl(x.ps.length,'player')+' still missing '+esc(Object.entries(g).map(([k,c])=>c+' '+k).join(', '))}}};
function askHTML(){const L=askLive();if(!L.length)return'';const C=L.filter(x=>!ASK_IMG.has(x.m.kind)),all=C.flatMap(askJobs);
  const btn=x=>ASK_IMG.has(x.m.kind)?`<button class="sm" data-act="askCreate" data-k="${esc(x.k)}" title="The studio draws a ${x.m.kind==='crest'?'crest from the team\'s short name and colours and opens it in the emblem maker':'logo from the competition\'s short name and opens the competition'} for you to change. Claude is not asked.">Create and edit</button>`
    :`<button class="sm" data-act="askClaude" data-k="${esc(x.k)}">Ask Claude</button>`;
  return `<div class="card" id="ask-claude" style="margin-bottom:16px"><div class="row"><div><h2 style="margin:0">Ask Claude</h2><p class="small muted" style="margin:4px 0 0">What the free sources did not have, and what only Claude can do. Nothing here is sent until you press a button; Claude's answers come back to this page to review${C.length?': '+estLine(all):''}. A crest or logo no source has is never asked of Claude: <b>Create and edit</b> draws one for you to change.</p></div><span class="spacer"></span>
    <button class="sm ghost" data-act="askDropAll">Dismiss all</button>${C.length?`<button class="sm primary" data-act="askClaudeAll">Ask Claude for all ${C.length}</button>`:''}</div>
    <div class="tw" style="max-height:340px;margin-top:8px"><table><thead><tr><th scope="col">For</th><th scope="col">What is asked</th><th scope="col">Since</th><th scope="col"></th></tr></thead><tbody>${L.map(x=>`<tr><td><b>${esc(x.t.name)}</b></td><td class="small">${askWhat(x)}</td><td class="small muted">${esc(new Date(x.m.at).toLocaleString([],{dateStyle:'short',timeStyle:'short'}))}</td>
      <td style="white-space:nowrap">${btn(x)} <button class="sm ghost" data-act="askDrop" data-k="${esc(x.k)}" aria-label="Dismiss ${esc(x.t.name)}">Dismiss</button></td></tr>`).join('')}</tbody></table></div></div>`}
function askSend(L){const jobs=L.flatMap(askJobs);L.forEach(x=>delete ASK[x.k]);askSave();
  if(jobs.length){queueAdd(jobs);toast('Queued '+hcPl(jobs.length,'Claude job')+'. The answers come to Process and Review.','ok')}else rerender()}
ACT.askClaude=el=>askSend(askLive().filter(x=>x.k===el.dataset.k&&!ASK_IMG.has(x.m.kind)));
ACT.askClaudeAll=async()=>{const L=askLive().filter(x=>!ASK_IMG.has(x.m.kind));if(!L.length){toast('Nothing here is for Claude','ok');return}
  if(!await ask('Ask Claude?',`Claude is asked for ${hcPl(L.length,'row')}: ${estLine(L.flatMap(askJobs))}. The answers come to Process and Review for you to accept.`,'Ask Claude'))return;askSend(L)};
ACT.askDrop=el=>{delete ASK[el.dataset.k];askSave();rerender()};
ACT.askDropAll=async()=>{const n=Object.keys(ASK).length;if(!n)return;if(!await ask('Dismiss all?',`${hcPl(n,'row')} ${n===1?'is':'are'} taken off the list. Nothing in your project changes; a later Live update lists again what is still missing.`,'Dismiss all',true))return;
  Object.keys(ASK).forEach(k=>delete ASK[k]);askSave();rerender()};
// Create and edit: the studio draws the image (no source, no Claude), saves it on the team or competition, and opens it to change
ACT.askCreate=async el=>{const x=askLive().find(y=>y.k===el.dataset.k);if(!x){toast('That row is no longer on the list','err');rerender();return}
  try{if(x.m.kind==='crest'){const t=S.teams[x.t.id];await histLabelAsync('Crest made for '+t.name,'Edit',async()=>{await genCrest(t);saveTeam(t)});delete ASK[x.k];askSave();
      toast(t.name+' has a crest made by the studio. Change it here, then Save.','ok');ACT.emblemFor({dataset:{team:t.id}})}
    else{const c=S.comps[x.comp.id];await histLabelAsync('Logo made for '+c.name,'Edit',async()=>{await genCompLogo(c);saveComp(c)});delete ASK[x.k];askSave();
      toast(c.name+' has a logo made by the studio. Choose another image here if you want.','ok');rerender();ACT.editComp({dataset:{id:c.id}})}}
  catch(e){toast('Could not make the image: '+(e.message||e),'err')}};

// ---- 2. the router
// what only Claude can do for a team, as rows of the table (only what the team still lacks)
function askTeamParts(t,parts){if(!t||!S.teams[t.id])return;const p=new Set(parts||[]);
  if(p.has('kits')&&missKits(t))askAdd({kind:'kits',teamId:t.id});
  if(p.has('manager')&&!t.formation)askAdd({kind:'manager',teamId:t.id,why:'formation and playstyle'})}
const SQUAD_PARTS=['roster','transfers'],PLAYER_PARTS=['newStats','refreshStats','bio','styles'];
const jPick=(j,...ks)=>{const o={};ks.forEach(k=>{if(j[k]!==undefined)o[k]=j[k]});return o};
/* One job as it was asked for → the jobs that are queued. A job carrying asked:true (from the table) goes through as it
   is; a job queued by a job that was asked (the clubs of a competition Claude listed) inherits it. */
function liveRoute(j){if(j.asked)return[j];const inherit=!!(typeof CUR_JOB!=='undefined'&&CUR_JOB&&CUR_JOB.asked);const keep=jPick(j,'season','autoApply');
  switch(j.type){
    case 'team':{const p=new Set(j.parts||[]),t=S.teams[j.teamId];
      const needs=[SQUAD_PARTS.some(k=>p.has(k))||!t?'squad':PLAYER_PARTS.some(k=>p.has(k))?'details':'','crests','coaches','stadiums'].filter(Boolean);
      if(inherit)return[Object.assign({type:'live',needs,asked:true},keep,jPick(j,'teamId','virtual','parts','label'))];
      askTeamParts(t,j.parts);
      return[Object.assign({type:'live',needs,label:'Live update: '+((t||j.virtual||{}).name||'team')},keep,jPick(j,'teamId','virtual'))]}
    case 'free':case 'ef':case 'compPull':case 'fifaTeam':return[Object.assign({type:'live',needs:LIVE_TEAM.slice(),label:'Live update: '+((S.teams[j.teamId]||{}).name||'team')},keep,jPick(j,'teamId'))];
    case 'freePlayers':case 'efPlayers':case 'fcPlayers':case 'details':return[Object.assign({type:'live',ids:j.ids||[],needs:['details'],label:j.label||'Live update: players'},keep)];
    case 'ratings':return[Object.assign({type:'live',ids:j.ids||[],needs:['details'],rate:true,label:j.label||'Live update: ratings'},keep)];
    case 'kits':{const t=S.teams[j.teamId];if(t)askAdd({kind:'kits',teamId:t.id});return[]}
    case 'compCheck':return[Object.assign({type:'compFree',label:j.label||'Live update: teams'},keep,jPick(j,'compId'))];
    case 'compFree':{const o=Object.assign({},j);delete o.claude;return[o]}
    case 'comp':{if(j.compId&&S.comps[j.compId])return[Object.assign({type:'compFree',compId:j.compId,label:'Live update: '+S.comps[j.compId].name+' teams'},keep)];
      if(j.name)askAdd({kind:'newcomp',teamId:'n:'+norm(j.name),name:j.name,country:j.country||'',squads:j.squads,stats:j.stats});return[]}
    case 'intl':askAdd({kind:'intl',teamId:'intl',full:j.full});return[];
    case 'logos':return[Object.assign({type:'freeArt',teamIds:j.teamIds||[],compIds:j.compIds||[],opts:['crests','logos'],which:/^Flags/.test(j.label||'')?'all':(j.which||'missing'),title:/^Flags/.test(j.label||'')?'Flags':'Live update: crests and logos',label:j.label||''},keep)];
    case 'efImages':return[Object.assign({type:'freeArt',teamIds:j.teamIds||[],compIds:j.compIds||[],opts:['crests','coaches','stadiums','logos'],which:j.which||'missing',title:'Live update: crests, coaches and logos',label:j.label||''},keep)];
    case 'tmInfo':return[Object.assign({type:'freeArt',teamIds:j.teamIds||[],compIds:[],opts:['coaches','stadiums'],which:'missing',title:'Live update: coaches and stadiums',label:j.label||''},keep)];
    default:return[j]}}
{const _q=queueAdd;queueAdd=(list,o)=>{const n0=ASK_NEW;const out=(list||[]).flatMap(liveRoute);
    const added=ASK_NEW-n0;if(added)setTimeout(()=>toast(hcPl(added,'thing')+' only Claude can do '+(added===1?'is':'are')+' waiting in Process and Review under Ask Claude. Nothing is sent until you ask there.',''),0);
    if(!out.length){if(typeof rerender==='function')rerender();return}return _q(out,o)}}
// jobs saved in a queue before this router: routed the same way when the studio opens, so none of them reaches Claude unasked
{const _b=extBoot;extBoot=async()=>{await _b();if(S._loadFailed)return;
  try{const old=jobsArr().filter(j=>j.status==='queued'&&!j.asked&&j.type!=='live'&&j.type!=='freeArt');const move=[];
    old.forEach(j=>{const r=liveRoute(Object.assign({},j));if(r.length===1&&r[0]===undefined)return;if(r.length===1&&r[0].type===j.type)return;delete S.jobs[j.id];Store.del('jobs',j.id);move.push(...r.map(x=>{const y=Object.assign({},x);delete y.id;delete y.status;delete y.attempts;delete y.seq;delete y.createdAt;return y}))});
    if(move.length)queueAdd(move,{run:false})}catch(e){console.error(e)}}}

// ---- 3. the guard
const CLAUDE_REFUSED='Claude is only asked from Process and Review (Ask Claude). This job was not asked for there, so Claude was not called.';
let CLAUDE_DIRECT=0;// >0 while a button that is itself a question to Claude runs (no job)
{const _a=aiText;aiText=async function(prompt,signal,opts){const j=typeof CUR_JOB!=='undefined'?CUR_JOB:null;
  if(j?!j.asked:!CLAUDE_DIRECT)throw new Error(CLAUDE_REFUSED);return _a.call(this,prompt,signal,opts)}}
// buttons that are a question to Claude, pressed by you, with no job behind them
['aiKit'].forEach(k=>{const f=ACT[k];if(!f)return;ACT[k]=async(...a)=>{CLAUDE_DIRECT++;try{return await f(...a)}finally{CLAUDE_DIRECT--}}});
// the Claude-only job types: listed so a job of one of them that is not asked never starts (belt and braces with the router)
const CLAUDE_TYPES=new Set(['team','ratings','details','kits','compCheck','comp','intl']);
{const _r=runJob;runJob=async(j,signal)=>{if(CLAUDE_TYPES.has(j.type)&&!j.asked){const r=liveRoute(Object.assign({},j));
      aiLog('  This job would have asked Claude without being asked for in Process and Review: it is run from the free sources instead');
      if(r.length)queueAdd(r.map(x=>{const y=Object.assign({},x);delete y.id;delete y.status;delete y.attempts;delete y.seq;delete y.createdAt;return y}),{run:false});return}
    return _r(j,signal)}}
