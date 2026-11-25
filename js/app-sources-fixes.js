// PES 2021 Option Studio, part 13 of 14: EA SPORTS FC and FIFA, shared look-up helpers, the fixes the health check queues.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= Sources: EA SPORTS FC ratings and FIFA ================= */
// EA SPORTS FC (the game once called FIFA): about 16,000 current players from EA's public ratings, read by the server
// (fcratings.py). A player is matched by name, then age, nationality and club. It fills missing height, weight, age, nationality
// and foot, and rates unrated players: EA's stats converted to the PES 2021 scale (40-99) ability by ability.
// FIFA: the newest World Cup's official squads (fifa.py). A national team in that World Cup can take its squad from FIFA:
// names, shirt numbers, lines, height, weight and age; a player already in a club brings his club record, a new one is rated
// from EA SPORTS FC. Like every look-up, both send their results to Process and Review.
const fcAvailable=()=>efAvailable();
const fcApi=(p,s)=>srcApi('fc/'+p,s,'EA SPORTS FC');const fifaApi=(p,s)=>srcApi('fifa/'+p,s,'FIFA');
const FC_POS={GK:'GK',CB:'CB',LB:'LB',LWB:'LB',RB:'RB',RWB:'RB',CDM:'DMF',CM:'CMF',LM:'LMF',RM:'RMF',CAM:'AMF',LW:'LWF',RW:'RWF',CF:'SS',ST:'CF'};
// EA's 1-99 stats on the PES 2021 scale: one for one, with PES's floor of 40 (tested on 50 players: the PES overall lands within
// a point of EA's, on average 0.2 below)
const fcScale=v=>v==null||isNaN(+v)?null:Math.max(40,Math.min(99,Math.round(+v)));
function fcAttrs(st){const g=k=>st[k],avg=(...k)=>{const v=k.map(g).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  const m={offAw:g('positioning'),ballCtl:g('ballControl'),drib:g('dribbling'),tight:avg('agility','ballControl'),lowPass:g('shortPassing'),loftPass:g('longPassing'),
    finish:g('finishing'),heading:g('headingAccuracy'),placeKick:g('freeKickAccuracy'),curl:g('curve'),speed:g('sprintSpeed'),accel:g('acceleration'),kickPow:g('shotPower'),
    jump:g('jumping'),contact:g('strength'),balance:g('balance'),stamina:g('stamina'),defAw:g('defensiveAwareness'),ballWin:avg('standingTackle','slidingTackle','interceptions'),
    aggr:g('aggression'),gkAw:g('gkPositioning'),gkCatch:g('gkHandling'),gkClear:avg('gkDiving','gkKicking'),gkReflex:g('gkReflexes'),gkReach:g('gkDiving')};
  const out={};Object.entries(m).forEach(([k,v])=>{const x=fcScale(v);if(x!=null)out[k]=x});return out}
// the EA player this studio player is: same age (a year either way), then the same nationality, then the same club
function fcPick(p,team,cands){let c=(cands||[]).slice();const age=+p.age;
  if(age)c=c.filter(x=>{const a=tmAge(x.born);return !a||Math.abs(a-age)<=1});
  if(c.length>1&&p.nat){const n=c.filter(x=>norm(x.nat)===norm(p.nat));if(n.length)c=n}
  if(c.length>1&&team){const n=c.filter(x=>x.team&&(strictName(x.team,team.name)>=0.85||nameScore(x.team,team.name)>=0.9));if(n.length)c=n}
  if(c.length>1&&p.pos){const n=c.filter(x=>FC_POS[x.pos]===p.pos);if(n.length===1)c=n}
  return c.length===1?c[0]:null}
// what an EA record gives a player: details he lacks, and ratings when he is unrated (or always, with rate)
function fcApply(p,r,{rate=false}={}){const q=clone(p);
  if(!q.height&&r.height)q.height=+r.height;if(!q.weight&&r.weight)q.weight=+r.weight;if(!q.age&&r.born)q.age=tmAge(r.born)||q.age;
  if(!q.nat&&!+q.countryId&&!(q.ted&&+q.ted.pid)&&r.nat)q.nat=r.nat;
  if(rate||unrated(q)){Object.assign(q.attrs,fcAttrs(r.stats||{}));q.foot=r.foot||q.foot;
    if(r.weakFoot){const w=Math.max(1,Math.min(4,+r.weakFoot-1));q.wfAcc=w;q.wfUsage=w}
    const pl=Object.assign({},q.playables||{});(r.alt||[]).forEach(a=>{const P=FC_POS[a];if(P&&P!==q.pos)pl[P]='A'});q.playables=pl;q.src=q.src||'easfc'}
  return normPlayer(q)}
// look players up by name, 60 a request; returns the EA record of each player matched
async function fcLookup(list,signal){const out=new Map();const names=[...new Set(list.map(x=>x.p.name))];
  for(let i=0;i<names.length;i+=60){if(signal&&signal.aborted)break;aiLog('EA SPORTS FC: players '+(i+1)+'–'+Math.min(names.length,i+60)+' of '+names.length+'…');
    const r=(await fcApi('players?names='+encodeURIComponent(names.slice(i,i+60).join('|')),signal)).players||{};
    list.forEach(x=>{if(!out.has(x.p.id)&&r[x.p.name]){const m=fcPick(x.p,x.t,r[x.p.name]);if(m)out.set(x.p.id,m)}});progStep()}
  return out}
// fill and rate players from EA SPORTS FC; the changes go to Process and Review. Returns the EA record of each player it found (by player id).
async function runFcPlayers(ids,signal,{rate=false}={}){const found=ids.map(findPlayer).filter(Boolean);if(!found.length)return new Set();
  progSetTotal(Math.ceil(new Set(found.map(x=>x.p.name)).size/60)||1);const hit=await fcLookup(found,signal);const inc={};let n=0;
  found.forEach(({p,t})=>{const r=hit.get(p.id);if(!r)return;const T=inc[t.id]||(inc[t.id]=clone(t));const k=T.players.findIndex(x=>x.id===p.id);if(k>=0){T.players[k]=fcApply(T.players[k],r,{rate});n++}});
  aiLog('  EA SPORTS FC: '+n+' of '+found.length+' players found');
  if(n)finishBatch(batchFromData({teams:inc,comps:{}},{title:'EA SPORTS FC: '+n+' player'+(n===1?'':'s'),source:'EA SPORTS FC',removeMissing:false,teamScope:Object.keys(inc)}));
  return hit}
// FIFA: the studio's national team in the newest World Cup
const FIFA_ALIAS={'south korea':'korea republic','korea':'korea republic','north korea':'korea dpr','iran':'ir iran','ivory coast':'cote d ivoire','united states':'usa','united states of america':'usa',
  'turkey':'turkiye','czech republic':'czechia','cape verde':'cabo verde','dr congo':'congo dr','democratic republic of the congo':'congo dr','china':'china pr','curacao':'curacao'};
let FIFA_WC=null;async function fifaWorldCup(signal){if(!FIFA_WC)FIFA_WC=await fifaApi('worldcup',signal);return FIFA_WC}
async function fifaTeamFor(t,signal){const wc=await fifaWorldCup(signal);const n=norm(String(t.name).replace(/\s+(national (football )?team|nt)$/i,''));const want=FIFA_ALIAS[n]||n;
  return (wc.teams||[]).find(x=>norm(x.name)===want||norm(x.name)===n)||(wc.teams||[]).find(x=>strictName(x.name,t.name)>=0.85)||null}
const fifaName=s=>String(s||'').split(' ').map(w=>w===w.toUpperCase()&&w.length>1?w.charAt(0)+w.slice(1).toLowerCase():w).join(' ').replace(/(^|[\s-])([a-zà-ÿ])/g,(m,a,b)=>a+b.toUpperCase());
const FIFA_LINE={GK:'GK',DF:'CB',MF:'CMF',FW:'CF'};
async function fifaDraftTeam(t,signal){const ft=await fifaTeamFor(t,signal);if(!ft)throw new Error(t.name+' is not in '+((FIFA_WC&&FIFA_WC.name)||'the World Cup')+' on FIFA');
  aiLog('FIFA: '+ft.name+' team…');const sq=await fifaApi('squad?team='+ft.id,signal);progStep();
  const inc=clone(t);const old=(inc.players||[]).slice();const used=new Set();const clubs=teamsArr().filter(x=>!isNationalTeam(x)&&x.id!==t.id);const fresh=[];
  const same=(a,b)=>samePlayer(a,b)||norm(a)===norm(b);
  inc.players=(sq.players||[]).map(r=>{const name=fifaName(r.name),age=r.born?tmAge(r.born):'';
    // the same player under another name ("Nico González" for Nicolás, "José Manuel López" for Flaco): one last name, one age
    const lastW=s=>norm(s).split(' ').pop();let p=old.find(x=>!used.has(x.id)&&same(x.name,name));const isNew=!p;
    if(!p){const c=old.filter(x=>!used.has(x.id)&&lastW(x.name)===lastW(name)&&(!age||!x.age||Math.abs(+x.age-age)<=1));if(c.length===1)p=c[0]}
    if(!p){let club=null;for(const c of clubs){club=(c.players||[]).find(x=>same(x.name,name)&&(!age||!x.age||Math.abs(+x.age-age)<=1));if(club)break}
      p=club?Object.assign(clone(club),{id:uid()}):newPlayer({name,pos:FIFA_LINE[r.line]||'CMF'});if(!club)fresh.push(p)}
    else p=clone(p);used.add(p.id);
    Object.assign(p,{name:isNew&&!old.includes(p)?name:p.name,shirtName:p.shirtName||fifaName(r.short||'').toUpperCase(),number:r.number||p.number,nat:p.nat||sq.name||t.name,height:+r.height||p.height,weight:+r.weight||p.weight,age:age||p.age});
    if(!p.pos||(FIFA_LINE[r.line]&&POS_GROUP(p.pos)!==POS_GROUP(FIFA_LINE[r.line])))p.pos=FIFA_LINE[r.line]||p.pos;return normPlayer(p)});
  // players new to the studio: rated from EA SPORTS FC, which also gives their exact position
  if(fresh.length){try{const hit=await fcLookup(fresh.map(p=>({p,t:inc})),signal);inc.players=inc.players.map(p=>{const r=hit.get(p.id);if(!r)return p;const q=fcApply(p,r,{rate:true});if(FC_POS[r.pos])q.pos=FC_POS[r.pos];return q});
    aiLog('  '+hit.size+' of '+fresh.length+' new players rated from EA SPORTS FC'+(fresh.length>hit.size?'; the others stay unrated (Health check rates them)':''))}catch(e){if(e.name==='AbortError')throw e;aiLog('  EA SPORTS FC: '+e.message)}}
  inc._src='FIFA';inc._what=(sq.competition||'World Cup')+' team';return inc}
async function runFifaTeam(t,signal){const inc=await fifaDraftTeam(t,signal);const what=inc._what;delete inc._src;delete inc._what;
  finishBatch(batchFromData({teams:{[inc.id]:inc},comps:{}},{title:'FIFA: '+inc.name+' ('+what+')',source:'FIFA',removeMissing:true,teamScope:[inc.id]}))}
JOB_KIND.fcPlayers='Free sources';JOB_KIND.fifaTeam='Free sources';
JOB_RUN.fifaTeam=async(j,signal)=>{const t=S.teams[j.teamId];if(!t)throw new Error('team no longer exists');await runFifaTeam(t,signal)};
{const _run=runJob;runJob=async(j,signal)=>{
  // a health-check squad fix for a national team asks FIFA first; ratings and details ask EA SPORTS FC before Claude
  if(j.autoApply&&j.type==='ratings'&&fcAvailable()){let got=new Set();try{got=await runFcPlayers(j.ids||[],signal,{rate:true})}catch(e){if(e.name==='AbortError')throw e;aiLog('  EA SPORTS FC: '+e.message)}
    const rest=(j.ids||[]).filter(id=>!got.has(id));if(!rest.length)return;return _run(Object.assign({},j,{ids:rest}),signal)}
  return _run(j,signal)}}
const fcQueue=(t,ids,rate,what)=>{if(!fcAvailable()){toast('The free sources are reached through the site\'s server: open the studio from start.bat or the website.','err');return}
  if(!ids.length){toast('Nothing to look up in '+t.name,'');return}queueAdd([{type:'freePlayers',ids,label:'Free sources: '+t.name}]);toast('Queued '+ids.length+' player'+(ids.length===1?'':'s')+'. Results go to Process and Review.','ok')};
ACT.fifaAll=async()=>{if(!fcAvailable()){toast('The free sources are reached through the site\'s server: open the studio from start.bat or the website.','err');return}
  let wc;try{wc=await miniBusy('Reading the World Cup teams from FIFA…',()=>fifaWorldCup())}catch(e){toast(e.message,'err');return}
  const ts=[];for(const t of nationalTeams()){if(await fifaTeamFor(t))ts.push(t)}
  if(!ts.length){toast('None of your national teams is in '+wc.name,'');return}
  queueAdd(ts.map(t=>({type:'free',teamId:t.id,label:'Free sources: '+t.name})));toast('Queued '+ts.length+' of '+wc.teams.length+' '+wc.name+' teams. Results go to Process and Review.','ok')};
// the health check offers the one free-source pull for ratings too (eFootball, then EA SPORTS FC); FIFA is part of the squad pull
{const _hi=healthIssues;healthIssues=()=>{const iss=_hi();if(!fcAvailable())return iss;
  iss.forEach(i=>{const acts=i.acts||(i.act?[i.act]:[]);const a0=acts[0];if(!a0)return;const t=S.teams[String(a0.id||'').split('|')[0]];if(!t)return;
    if(i.cat==='Ratings'&&!acts.some(a=>a.a==='efFill')){i.acts=[{a:'efFill',id:t.id,label:'Pull from free sources'},...acts]}});return iss}}
/* ================= Health check: fixes it queues ================= */
// Rule: a fix that is a queued look-up or Claude update (eFootball, Transfermarkt, Claude, flags, crests) only suggests: its
// results wait in Process and Review like any other, to be checked and applied there. Only coded fixes the studio works out itself
// (shirt numbers, duplicates, game IDs) are applied on the spot. These jobs are marked autoApply so the health check can follow
// them and list what the free sources didn't have on Process and Review (Claude only when asked there); the name is kept so jobs saved earlier still run.
let HC_AUTO=false,CUR_JOB=null;
{const _q=queueAdd;queueAdd=(list,o)=>_q(HC_AUTO?list.map(j=>Object.assign({autoApply:true},j)):list,o)}
// While fixes run, the health check is redrawn at most every few seconds (longer on big projects: never more than a tenth of
// the time), not after every job: one redraw of a 600-team project takes over half a second, and with a fix finishing every
// second the page would never answer. It is redrawn at once when the queue stops.
let HC_RR_T=0,HC_RR_AT=0,HC_RR_MS=0;
function hcLive(){if(S.ui.view!=='health'||HC_RR_T)return;const wait=Math.max(0,HC_RR_AT+Math.max(3000,HC_RR_MS*10)-Date.now());
  HC_RR_T=setTimeout(()=>{HC_RR_T=0;if(S.ui.view!=='health')return;const f=document.activeElement;
    if(f&&f.closest&&f.closest('#main')&&/^(INPUT|TEXTAREA|SELECT)$/.test(f.tagName)&&f.type!=='checkbox'){f.addEventListener('blur',hcLive,{once:true});return}
    const t0=performance.now();rerender();HC_RR_MS=performance.now()-t0;HC_RR_AT=Date.now()},wait)}
{const _e=endAI;endAI=function(...x){const r=_e(...x);if(S.ui.view==='health'){clearTimeout(HC_RR_T);HC_RR_T=0;rerender()}return r}}
// What the free sources couldn't find when a health check fix ran (a squad, or player details and ratings). Nothing goes to
// Claude by itself: Process and Review lists these with "Ask Claude", and Claude's answers come back to Process and Review as drafts.
const FREE_MISS=(()=>{try{return JSON.parse(localStorage.getItem('pes21.freeMiss')||'{}')}catch(e){return{}}})();
const freeMissSave=()=>{try{localStorage.setItem('pes21.freeMiss',JSON.stringify(FREE_MISS))}catch(e){}};
function freeMissAdd(m){const k=m.kind+'|'+m.teamId,o=FREE_MISS[k];if(o&&m.ids)m.ids=[...new Set([...(o.ids||[]),...m.ids])];if(o&&m.gaps)m.gaps=Object.assign({},o.gaps,m.gaps);FREE_MISS[k]=Object.assign({},o,m,{at:Date.now()});freeMissSave()}
const freeMissGaps=(m,p)=>playerGaps(p).filter(g=>g!=='number'&&(!m.gaps||!m.gaps[p.id]||m.gaps[p.id].includes(g)));
// the entries still true now: the team exists and, for details, players still miss something
function freeMissLive(){const out=[];let ch=false;
  for(const [k,m] of Object.entries(FREE_MISS)){
    if(m.kind==='comp'){const c=S.comps[m.compId];if(!c||!emptyComps().includes(c)){delete FREE_MISS[k];ch=true;continue}out.push({k,m,t:{id:c.id,name:c.name},ps:[],comp:c});continue}
    const t=S.teams[m.teamId];if(!t){delete FREE_MISS[k];ch=true;continue}
    if(m.kind==='details'){const ps=(t.players||[]).filter(p=>(m.ids||[]).includes(p.id)&&freeMissGaps(m,p).length);if(!ps.length){delete FREE_MISS[k];ch=true;continue}out.push({k,m,t,ps})}
    else out.push({k,m,t,ps:[]})}
  if(ch)freeMissSave();return out.sort((a,b)=>b.m.at-a.m.at)}
function freeMissJobs(x){const season=S.settings.season,t=x.t;
  if(x.m.kind==='comp')return[{type:'compCheck',compId:x.m.compId,season,label:'Teams: '+t.name}];
  if(x.m.kind==='squad')return[{type:'team',teamId:t.id,parts:['roster','transfers','newStats','bio'],season,claudeOnly:true,label:'Claude: players for '+t.name}];
  const jobs=[];const dg=x.ps.filter(p=>detailGaps(p).length).map(p=>p.id);if(dg.length)jobs.push({type:'details',ids:dg,season,label:t.name});
  const un=x.ps.filter(unrated).map(p=>p.id);if(un.length)jobs.push({type:'ratings',ids:un,season,label:'Claude: ratings for '+t.name});return jobs}
function freeMissHTML(){const L=freeMissLive();if(!L.length)return'';const all=L.flatMap(freeMissJobs);
  const what=x=>{if(x.m.kind==='comp')return'Its teams were not found'+(x.m.why?' ('+esc(x.m.why)+')':'');if(x.m.kind==='squad')return'Players not found'+(x.m.why?' ('+esc(x.m.why)+')':'');const g={};x.ps.forEach(p=>freeMissGaps(x.m,p).forEach(k=>g[k]=(g[k]||0)+1));
    return hcPl(x.ps.length,'player')+' still missing '+esc(Object.entries(g).map(([k,c])=>c+' '+k).join(', '))};
  return `<div class="card" style="margin-bottom:16px"><div class="row"><div><h2 style="margin:0">Not found in the free sources</h2><p class="small muted" style="margin:4px 0 0">eFootball and the other free sources didn't have these. Claude is only asked if you choose to, and its answers come back here to review: ${estLine(all)}.</p></div><span class="spacer"></span>
    <button class="sm ghost" data-act="freeMissDropAll">Dismiss all</button><button class="sm primary" data-act="freeMissClaudeAll">Ask Claude for all ${L.length}</button></div>
    <div class="tw" style="max-height:300px;margin-top:8px"><table><tbody>${L.map(x=>`<tr><td><b>${esc(x.t.name)}</b></td><td class="small">${what(x)}</td><td class="small muted">${esc(new Date(x.m.at).toLocaleString([],{dateStyle:'short',timeStyle:'short'}))}</td>
      <td style="white-space:nowrap"><button class="sm" data-act="freeMissClaude" data-k="${esc(x.k)}">Ask Claude</button> <button class="sm ghost" data-act="freeMissDrop" data-k="${esc(x.k)}" aria-label="Dismiss ${esc(x.t.name)}">Dismiss</button></td></tr>`).join('')}</tbody></table></div></div>`}
function freeMissAsk(L){const jobs=L.flatMap(freeMissJobs);L.forEach(x=>delete FREE_MISS[x.k]);freeMissSave();if(jobs.length){queueAdd(jobs);toast('Queued '+hcPl(jobs.length,'Claude job')+'. The answers come to Process and Review.','ok')}else rerender()}
ACT.freeMissClaude=el=>freeMissAsk(freeMissLive().filter(x=>x.k===el.dataset.k));
ACT.freeMissClaudeAll=async()=>{const L=freeMissLive();if(!L.length)return;if(!await ask('Ask Claude?',`Claude is asked for what the free sources didn't have, for ${hcPl(L.length,'team')}: ${estLine(L.flatMap(freeMissJobs))}. The answers come to Process and Review for you to accept.`,'Ask Claude'))return;freeMissAsk(L)};
ACT.freeMissDrop=el=>{delete FREE_MISS[el.dataset.k];freeMissSave();rerender()};
ACT.freeMissDropAll=()=>{Object.keys(FREE_MISS).forEach(k=>delete FREE_MISS[k]);freeMissSave();rerender()};
const HC_LAST=(()=>{try{return JSON.parse(localStorage.getItem('pes21.hcLast')||'{}')}catch(e){return{}}})();
const hcLastSave=()=>{try{localStorage.setItem('pes21.hcLast',JSON.stringify(HC_LAST))}catch(e){}};
const hcJobTeams=j=>[...new Set([j.teamId,...(j.teamIds||[]),...(j.ids||[]).map(id=>{const f=findPlayer(id);return f&&f.t.id})].filter(Boolean))];
{const _l=aiLog;aiLog=msg=>{const j=CUR_JOB;if(j&&j.autoApply&&/not in|Failed|Claude|refreshed|applied|Review|limit|error|could not/i.test(msg))(j._notes=j._notes||[]).push(String(msg).trim());return _l(msg)}}
{const _r=runJob;runJob=async(j,signal)=>{const prev=CUR_JOB;CUR_JOB=j;if(j.autoApply)j._notes=[];
  const record=err=>{if(!j.autoApply)return;const notes=(j._notes||[]).filter(n=>!/^eFootball: players|asking Claude|^Asking Claude|players refreshed$/i.test(n)).map(n=>n.replace(/^→\s*/,''));const miss=notes.filter(n=>/: not in .*eFootball (?:squad|team)$/.test(n)).length;
    const keep=notes.filter(n=>!/: not in .*eFootball (?:squad|team)$/.test(n));if(miss)keep.unshift(miss+' player'+(miss===1?' is':'s are')+' not in eFootball');if(err)keep.push('Failed: '+err);
    hcJobTeams(j).forEach(id=>{HC_LAST[id]={at:Date.now(),text:keep.slice(-4).join(' · ')}});hcLastSave()};
  try{
    // a squad the free sources (eFootball, Transfermarkt) don't have: never handed to Claude on its own. It is listed on Process and Review
    // changes, where Claude can be asked for it with a click
    if(j.autoApply&&j.type==='ef'){try{return await _r(j,signal)}catch(e){if(e.name==='AbortError'||signal.aborted)throw e;
      if(/busy|rate|unavailable|timeout|network/i.test(e.message||''))throw e;const t=S.teams[j.teamId];if(!t)throw e;
      freeMissAdd({kind:'squad',teamId:t.id,why:e.message});aiLog('  '+e.message+'. Not found in the free sources: Claude can be asked from Process and Review');return}}
    // every player pull (old 'fcPlayers' jobs too) is the free-source pull: eFootball, then EA SPORTS FC, then the list for Claude
    if(j.type==='efPlayers'||j.type==='freePlayers'||j.type==='fcPlayers'){const r=await _r(Object.assign({},j,{type:'efPlayers'}),signal);if(signal.aborted)return r;
      // what eFootball couldn't fill: EA SPORTS FC is asked next; shirt numbers are given here; what neither has is listed on Process and Review,
      // where Claude can be asked for them
      // judged on eFootball's answer, since its changes wait in Process and Review and are not in the squad yet
      const got=r&&typeof r==='object'?r:{};const left=(j.ids||[]).map(findPlayer).filter(Boolean).map(({p,t})=>{const T=got[t.id];return{p:(T&&(T.players||[]).find(x=>x.id===p.id))||p,t}}).filter(x=>playerGaps(x.p).length);const teams=[...new Map(left.map(x=>[x.t.id,x.t])).values()];
      // EA SPORTS FC next, for every player eFootball left incomplete, in one look-up: its details and ratings go to Process and Review too
      let fc=new Map();const ask=left.filter(x=>playerGaps(x.p).some(g=>g!=='number')).map(x=>x.p.id);
      if(ask.length&&typeof fcAvailable==='function'&&fcAvailable()){try{fc=await runFcPlayers(ask,signal)}catch(e){if(e.name==='AbortError')throw e;aiLog('  EA SPORTS FC: '+e.message)}}
      const after=p=>{const r=fc.get(p.id);return r?fcApply(p,r):p};// the player as eFootball and EA SPORTS FC together leave him
      for(const t of teams){const ps=left.filter(x=>x.t.id===t.id).map(x=>x.p);
        if(j.autoApply&&ps.some(p=>!p.number)){histLabel('Health check: numbers for '+t.name,'Health',()=>{renumber(t);saveTeam(t)})}
        const rest=ps.filter(p=>playerGaps(after(p)).some(g=>g!=='number'));
        if(rest.length){freeMissAdd({kind:'details',teamId:t.id,ids:rest.map(p=>p.id),gaps:Object.fromEntries(rest.map(p=>[p.id,playerGaps(after(p)).filter(g=>g!=='number')]))});
          aiLog('  '+t.name+': '+rest.length+' player'+(rest.length===1?'':'s')+' still missing details eFootball and EA SPORTS FC do not have; Claude can be asked from Process and Review')}}
      return r}
    return await _r(j,signal)}
  catch(e){if(e.name!=='AbortError'&&!signal.aborted){record(e.message);j._rec=true}throw e}
  finally{if(j.autoApply&&!signal.aborted&&!(j._rec))record('');CUR_JOB=prev;hcLive()}}}
{const _f=finishBatch;finishBatch=b=>{const j=CUR_JOB;if(!j||!j.autoApply||!b||!b.items||!b.items.length)return _f(b);
  b.title='Health check: '+b.title;const r=_f(b);const n=b.items.length;
  aiLog('  → '+n+' change'+(n===1?'':'s')+' waiting in Process and Review');hcLive();return r}}
{const _b=extBoot;extBoot=async()=>{await _b();const n=jobsArr().filter(j=>j.autoApply&&j.status==='queued').length;
  if(n&&!S._loadFailed)setTimeout(()=>{if(!S.ui.ai.running){toast('Continuing '+hcPl(n,'health check fix','health check fixes'),'ok');queueRun()}},2500)}}
['efTeam','claudeTeam','efFill','claudeFill','efIds','efImg','flagOne','rateTeam','efHealthFill','hcBulk'].forEach(n=>{const o=ACT[n];if(!o)return;
  ACT[n]=async el=>{const hc=S.ui.view==='health',prev=HC_AUTO;if(hc)HC_AUTO=true;try{return await o(el)}finally{HC_AUTO=prev}}});// back to what it was: Apply all runs these inside its own loop
/* ================= One-time repair: game IDs the health check wrongly cleared ================= */
// Until 17 Nov 2026 the health check took IDs above 2,147,483,647 for special eFootball cards and cleared them ("Fix game IDs",
// "Remove duplicates", health check bulk fixes). They are real 4-byte IDs from the option file. Put back every one the change
// history shows was cleared, where the player now has no ID or an ID the studio handed out since. Runs once per project.
{const _b=extBoot;extBoot=async()=>{await _b();if(S._loadFailed||S.settings.idRepair1)return;let n=0;const touched=new Set();
  const ents=Object.values(S.history||{}).sort((a,b)=>a.at-b.at).flatMap(h=>/Fix game IDs|Remove duplicates|Health check/.test(h.label||'')?(h.entries||[]):[]);
  histLabel('Restore game IDs the health check cleared','Health',()=>{ents.forEach(e=>{if(e.k!=='pf'||e.f!=='gameId'||e.to!==''||!(+e.from>2**31-1&&+e.from<=0xFFFFFFFF))return;
    const t=S.teams[e.tid];const p=t&&(t.players||[]).find(x=>x.id===e.pid);if(!p||+p.gameId===+e.from)return;
    if(+p.gameId&&!(+p.gameId>=EDIT_LO&&+p.gameId<=EDIT_HI))return;if((t.players||[]).some(x=>x!==p&&+x.gameId===+e.from))return;
    p.gameId=+e.from;touched.add(t);n++});touched.forEach(t=>saveTeam(t))});
  S.settings.idRepair1=true;saveSettings();if(n)toast(n+' game ID'+(n===1?'':'s')+' the health check had cleared by mistake '+(n===1?'is':'are')+' back','ok')}}
/* ================= Health check: two players with the same name ================= */
// Two entries with one name and different game IDs are usually two people (Lautaro and Lisandro Martínez); sometimes one person
// twice (a studio-made copy beside his Konami record). Each pair gets one suggestion: the same position and ages a year apart or
// less mean the same player (keep his most complete entry, Konami's ID first), anything else means two players (mark them as
// checked, kept on the team as namesOk). Both buttons are always there.
function dupSamePerson(ps){const pos=new Set(ps.map(p=>p.pos));const ages=ps.map(p=>+p.age).filter(Boolean);return pos.size===1&&(!ages.length||Math.max(...ages)-Math.min(...ages)<=1)}
{const _hi=healthIssues;healthIssues=()=>{const iss=_hi().filter(i=>!(i.cat==='Duplicate players'&&/two players named/.test(i.msg)));
  teamsArr().forEach(t=>{if(t.sameAs)return;const ok=new Set(t.namesOk||[]);
    squadDuplicates(t.players||[]).sameName.forEach(n=>{const k=norm(n);if(ok.has(k))return;const ps=(t.players||[]).filter(p=>norm(p.name)===k);const same=dupSamePerson(ps);
      const keep={a:'dupKeepOne',id:t.id+'|'+k,label:'Same player: keep one'},diff={a:'dupDiff',id:t.id+'|'+k,label:'Different players'};
      iss.push({sev:'warn',cat:'Duplicate players',msg:`${t.name}: ${ps.length} players named ${n} with different game IDs (${ps.map(p=>p.pos+(p.age?' '+p.age:'')).join(', ')}); ${same?'looks like one player twice':'look like different players'}`,acts:same?[keep,diff,{a:'openTeam',id:t.id,label:'Open'}]:[diff,keep,{a:'openTeam',id:t.id,label:'Open'}]})})});
  const rank={err:0,warn:1,info:2};return iss.map((x,i)=>[x,i]).sort((a,b)=>rank[a[0].sev]-rank[b[0].sev]||a[1]-b[1]).map(x=>x[0])}}
const dupArg=el=>{const [tid,k]=String(el.dataset.id||'').split('|');return{t:S.teams[tid],k}};
ACT.dupDiff=el=>{const {t,k}=dupArg(el);if(!t)return;t.namesOk=[...new Set([...(t.namesOk||[]),k])];saveTeam(t);toast(t.name+': marked as different players','ok');rerender()};
ACT.dupKeepOne=el=>{const {t,k}=dupArg(el);if(!t)return;const ps=(t.players||[]).filter(p=>norm(p.name)===k);if(ps.length<2)return;
  const best=ps.slice().sort((a,b)=>(isEditId(a.gameId)?1:0)-(isEditId(b.gameId)?1:0)||playerScore(b)-playerScore(a)||ovr(b)-ovr(a))[0];
  histLabel('Keep one '+best.name+' in '+t.name,'Health',()=>{t.players=t.players.filter(p=>p===best||norm(p.name)!==k);saveTeam(t)});toast(t.name+': kept one '+best.name,'ok');rerender()};
HC_BULK.add('dupDiff');HC_BULK.add('dupKeepOne');
/* ================= Health check: leagues with no teams ================= */
// A league no team belongs to exports an empty competition. Cups are left out: they are filled from other leagues' clubs. Each one is suggested a
// club check (Claude lists its clubs for the season; the result waits in Process and Review); it can also be edited or deleted.
// The World Cup is never offered for deletion: it is always kept.
function emptyComps(){const used=new Set(teamsArr().map(t=>t.compId));
  return compsArr().filter(c=>!isCupComp(c)&&!c.noCode&&!used.has(c.id)&&!(c.teams||[]).some(id=>S.teams[id])).sort((a,b)=>String(a.name).localeCompare(String(b.name)))}
function emptyCompsHTML(){const L=emptyComps();if(!L.length)return '<p class="why">Every league has teams.</p>';
  return `<p class="why">These leagues have no teams, so they would be empty in the game. <b>Find its teams</b> ${efAvailable()?'looks the league\'s teams up in the free sources (eFootball, then Transfermarkt); a league they don\'t have is listed under "Not found in the free sources" in Process and Review, where you can ask Claude':'asks Claude for the teams of the season ('+esc(S.settings.season)+')'}. The result waits in Process and Review. A league you no longer want can be deleted; no team is touched.</p>
   <div class="hc-rows">${L.map(c=>hcRow('warn',esc(c.name),esc([c.type||'League',c.country].filter(Boolean).join(' · '))+(c.worldCup?' · Always kept':+c.gameId?' · In-game ID '+esc(c.gameId):''),
     `<button class="sm primary" data-act="ecFind" data-id="${c.id}">Find its teams</button>${compEditLocked(c)?'':`<button class="sm" data-act="editComp" data-id="${c.id}">Edit</button>`}${compDelBtn(c,'delComp','sm')}`,{tip:c.name})).join('')}</div>`}
const ecJob=c=>efAvailable()?{type:'compFree',compId:c.id,season:S.settings.season,label:'Teams: '+c.name}:{type:'compCheck',compId:c.id,season:S.settings.season,label:'Teams: '+c.name};
ACT.ecFind=el=>{const c=S.comps[el.dataset.id];if(!c)return;queueAdd([ecJob(c)]);toast('Queued a team check for '+c.name+'. Results go to Process and Review.','ok')};
ACT.ecFindAll=async()=>{const L=emptyComps();if(!L.length)return;
  if(!await ask('Find the teams?',efAvailable()?`The free sources (eFootball, then Transfermarkt) are asked for the teams of <b>${L.length}</b> league${L.length===1?'':'s'} with no teams. Claude is not asked: what they don't have is listed in Process and Review, where you can ask Claude. The results wait in Process and Review.`:`Claude is asked for the teams of <b>${L.length}</b> league${L.length===1?'':'s'} with no teams, one request each, for season <b>${esc(S.settings.season)}</b>. The results wait in Process and Review.`,'Find teams'))return;
  queueAdd(L.map(ecJob));toast('Queued '+L.length+' team check'+(L.length===1?'':'s')+'. Results go to Process and Review.','ok')};
/* ================= Health check: teams without a league ================= */
// A club whose competition is missing, or is only a cup, plays in no league. National teams play in no league and cup copies use
// their league club, so neither is listed; parked teams are set aside. "Put in league…" moves the club into the league chosen; a cup
// it was in keeps it as a participant (cups never change a club's league). Nothing is deleted: a club is kept even when no league has it.
const isLeagueComp=c=>!!c&&!isCupComp(c)&&!isNationalComp(c);
function clubNoLeague(t){return !!t&&!t.sameAs&&!t.parked&&!isLeagueComp(S.comps[t.compId])&&!isOtherPool(S.comps[t.compId])&&!isNationalTeam(t)&&!gameNoLeague(t)}
const noLeagueTeams=()=>teamsArr().filter(clubNoLeague).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
function noLeagueHTML(L){if(!L.length)return '<p class="why">Every team is in a league.</p>';
  const lg=compsArr().filter(isLeagueComp).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  const cups=t=>compsArr().filter(c=>isCupComp(c)&&(c.id===t.compId||(c.teams||[]).includes(t.id))).map(c=>c.name);
  const st=nlStore();
  return `<p class="why">These teams are in no league, so no league lists them in the game. <b>Find its league</b> looks the team up, in the free sources first and then with Claude, and suggests the league of the project it plays in; nothing changes until you press <b>Put in …</b>. Or pick the league yourself, or open the team. Nothing is deleted.</p>
   <div class="hc-rows">${L.map(t=>{const cs=cups(t),r=st[t.id],c=nlSug(t);return hcRow('warn',esc(t.name),esc(cs.length?'Only in '+cs.join(', '):S.comps[t.compId]?'Only in '+S.comps[t.compId].name:'No competition')+(r&&r.note?`<br>${esc(r.note)}${r.league&&!c?' (not a league of this project)':''}`:''),
     `<select data-ch="nlMove" data-id="${t.id}" aria-label="Put ${esc(t.name)} in a league"${lg.length?'':' disabled'}>${opts([['',lg.length?'Put in league…':'No leagues yet'],...lg.map(c=>[c.id,compOptLabel(c)])],'')}</select>${c?`<button class="sm primary" data-act="nlPut" data-id="${t.id}">Put in ${esc(c.name)}</button>`:''}<button class="sm${c||r?'':' primary'}" data-act="nlFind" data-id="${t.id}">${r?'Look up again':'Find its league'}</button><button class="sm" data-act="openTeamInfo" data-id="${t.id}">Open</button>`,{tip:t.name})}).join('')}</div>`}
// filing a team under a league does not move it in the game: its code decides. Say so when the code is another league's.
const nlCodeHint=t=>+t.gameId&&!t.noCode&&!codeLeagueOk(t,t.gameId)?'. In the game it is still in '+csLeagueName(slotLeagueOf(t.gameId))+': its code, '+t.gameId+', belongs there. Give it a code of its new league on Game codes':'';
function nlPutIn(t,c){const was=S.comps[t.compId];if(isCupComp(was)&&!(was.teams||[]).includes(t.id)){was.teams=[...(was.teams||[]),t.id];saveComp(was)}t.compId=c.id;saveTeam(t)}
// Putting a team in a league is accepted only where the game has it: the league of its code (just filed), else a move to a free
// code of that league (teamFileUnder, asked first). A league with no free code, or a team that can't move, is refused with why.
const nlCanFile=(t,c)=>!!(t&&c&&c.gameLeague&&teamGameLeague(t)===c.gameLeague);
async function nlPlace(t,c){if(nlCanFile(t,c)){histLabel('Put '+t.name+' in '+c.name,'Health',()=>nlPutIn(t,c));toast(t.name+' is now in '+c.name,'ok');return true}
  const was=S.comps[t.compId];await fixedReady();if(!await teamFileUnder(t,c))return false;
  if(isCupComp(was)&&!(was.teams||[]).includes(t.id)){was.teams=[...(was.teams||[]),t.id];saveComp(was)}return true}
CH.nlMove=async el=>{const t=S.teams[el.dataset.id],c=S.comps[el.value];if(!t||!isLeagueComp(c))return;await nlPlace(t,c);rerender()};
/* ----- Teams without a league: find its league (same pattern as "Find his current team") -----
   One queued job: the Transfermarkt dataset by team name (it knows each country's top league), then Claude for whoever is left,
   choosing from the project's own leagues. The answer is kept per team and season in this browser and only suggests. */
const nlKey=()=>'pes21.nlFind.'+S.settings.season;
const NL_ANS=answerStore('pes21.nlFind.','nlCache');function nlStore(){return NL_ANS.get()}function nlSave(){NL_ANS.save()}
const nlLeagues=()=>compsArr().filter(c=>isLeagueComp(c)&&!c.noCode);
// the league of the project a stored answer means, as long as it is still a league
const nlSug=t=>{const r=nlStore()[t.id];const c=r&&S.comps[r.compId];return isLeagueComp(c)?c:null};
// a source's league (name and country) among the project's leagues: by name, the country deciding between namesakes; else the
// country's only league
function nlMatch(league,country){const L=nlLeagues(),cn=norm(country||'');const inC=cn?L.filter(c=>norm(c.country||'')===cn):[];let best=null,bs=0;
  (inC.length?inC:L).forEach(c=>{const sc=Math.max(nameScore(league,c.name),nameScore((country||'')+' '+league,c.name));if(sc>bs){bs=sc;best=c}});
  if(best&&bs>=(inC.length?0.5:0.85))return best;return inC.length===1?inC[0]:null}
const nlJob=()=>jobsArr().find(j=>j.type==='nlFind'&&(j.status==='queued'||j.status==='running'));
async function runNlFind(j,signal){const st=nlStore(),teams=(j.ids||[]).map(id=>S.teams[id]).filter(clubNoLeague);if(!teams.length){aiLog('  Nothing left to look up');return}
  const got=new Set(),hint=new Map(),down=[];progSetTotal(1+Math.ceil(teams.length/20));
  // 1. Transfermarkt: the team by name; its league there, matched to a league of the project
  aiLog('Transfermarkt: '+teams.length+' team'+(teams.length===1?'':'s')+'…');
  for(const t of teams){if(signal.aborted)return;
    try{const r=await tmApi('search?q='+encodeURIComponent(t.name),signal);const hit=(r.clubs||[]).filter(x=>x.score>=0.85&&(!t.country||!x.country||norm(x.country)===norm(t.country)));
      if(hit.length!==1)continue;const x=hit[0],lg=String(x.league||'').replace(/-/g,' '),c=nlMatch(lg,x.country);
      if(c){st[t.id]={league:c.name,compId:c.id,src:'Transfermarkt',note:'Transfermarkt: '+x.name+' plays in '+x.country+'\'s '+lg+(x.season?' ('+x.season+')':''),at:Date.now()};got.add(t.id)}
      else hint.set(t.id,'Transfermarkt: '+x.name+', '+lg+', '+x.country)}
    catch(e){if(e.name==='AbortError')throw e;if(!down.length)aiLog('  Could not connect to Transfermarkt: '+e.message);down.push(['Transfermarkt',e.message]);break}}
  progStep();nlSave();aiLog('  Transfermarkt placed '+got.size+' of '+teams.length);
  // 2. Claude, 20 teams a request, choosing from the project's leagues
  const left=teams.filter(t=>!got.has(t.id)),names=nlLeagues().map(c=>c.name+(c.country?' ('+c.country+')':''));
  for(let i=0;i<left.length;i+=20){if(signal.aborted)return;const chunk=left.slice(i,i+20);aiLog('Claude: teams '+(i+1)+'–'+(i+chunk.length)+' of '+left.length+'…');
    const list=chunk.map((t,n)=>({key:'t'+n,name:t.name,country:t.country||undefined,stadium:t.stadium||undefined,manager:(t.manager||{}).name||undefined,nowIn:(S.comps[t.compId]||{}).name||undefined,known:hint.get(t.id)||undefined}));
    let res={};try{res=await aiJSON(`Football data check for season ${j.season||S.settings.season}. Each team below is a club in an eFootball PES 2021 option file that is listed in no league; names may be short forms.
For each team give the domestic league it plays in this season. "leagues" lists the leagues this project has: when the team's league is one of them, give that entry exactly as written in "inProject"; otherwise give "inProject":"".
leagues: ${JSON.stringify(names)}
Teams: ${JSON.stringify(list)}
Reply with JSON only: {"teams":[{"key":"t0","club":"<the club's full name>","league":"<its real league this season, or unknown>","country":"<country>","inProject":"<an entry of leagues, or empty>","confidence":"high|medium|low"}]}
Do not guess: when you cannot identify a team with confidence, give "league":"unknown".`,signal,{escalate:r=>(r&&Array.isArray(r.teams)?r.teams:[]).some(x=>/^(unknown|)$/i.test(String(x.league||'').trim())||x.confidence==='low')?'did not place every team':(r&&Array.isArray(r.teams)&&r.teams.length?'':'had nothing')})}
    catch(e){if(e.name==='AbortError')throw e;claudeDown(e,down,st,chunk.map(t=>t.id));nlSave();continue}
    const by=new Map((Array.isArray(res.teams)?res.teams:[]).map(r=>[r.key,r]));
    chunk.forEach((t,n)=>{const r=by.get('t'+n)||{},lg=/^(unknown|none|n\/a|)$/i.test(String(r.league||'').trim())?'':String(r.league).trim();
      if(!lg){st[t.id]={err:true,src:'Claude',note:'The free sources and Claude could not tell which league it plays in',at:Date.now()};return}
      const pick=String(r.inProject||'').trim(),c=(pick&&nlLeagues().find(c=>c.name+(c.country?' ('+c.country+')':'')===pick||norm(c.name)===norm(pick)))||nlMatch(lg,r.country);
      const conf=r.confidence&&r.confidence!=='high'?' ('+r.confidence+' confidence)':'';
      st[t.id]={league:lg,country:r.country||'',compId:c?c.id:'',src:'Claude',note:'Claude: '+(r.club&&norm(r.club)!==norm(t.name)?r.club+', ':'')+lg+(r.country?', '+r.country:'')+conf,at:Date.now()}});nlSave();progStep()}
  nlSave();const ok=teams.filter(t=>nlSug(t)).length;
  aiLog('  A league of the project was found for '+ok+' of '+teams.length+' team'+(teams.length===1?'':'s')+': the suggestions are in Health check, Teams without a league'+down.map(([n,w])=>'. COULD NOT CONNECT to '+n+': '+w).join(''));
  if(S.ui.view==='health')rerender()}
JOB_KIND.nlFind='League of teams without one';
JOB_RUN.nlFind=async(j,signal)=>{await runNlFind(j,signal)};
function nlQueue(ids){if(!ids.length){toast('Every team already has an answer','ok');return}if(nlJob()){toast('A search is already queued; follow it in the progress bar','err');return}
  queueAdd([{type:'nlFind',ids,season:S.settings.season,label:'League of '+hcPl(ids.length,'team')+' without one'}]);toast('Queued: '+hcPl(ids.length,'team')+'. Follow it in the progress bar.','ok')}
ACT.nlFind=el=>{delete nlStore()[el.dataset.id];nlSave();nlQueue([el.dataset.id])};
ACT.nlFindAll=()=>{const st=nlStore();nlQueue(noLeagueTeams().filter(t=>!t.noCode&&(!st[t.id]||st[t.id].down)).map(t=>t.id))};
ACT.nlPut=async el=>{const t=S.teams[el.dataset.id],c=t&&nlSug(t);if(!c)return;await nlPlace(t,c);rerender()};
// all at once only where it is just filing (the team's code is in that league); a move is one team at a time, asked first
ACT.nlPutAll=async()=>{const A=noLeagueTeams().filter(t=>!t.noCode).map(t=>[t,nlSug(t)]).filter(x=>x[1]);const L=A.filter(([t,c])=>nlCanFile(t,c));if(!L.length){toast(A.length?'Each of these needs a move to a free code of its league: use Put in … on each team':'Nothing to put in a league','err');return}
  if(!await ask('Put '+hcPl(L.length,'team')+' in the league found?',`<ul class="small">${L.slice(0,15).map(([t,c])=>`<li><b>${esc(t.name)}</b> → ${esc(c.name)}</li>`).join('')}${L.length>15?`<li>… and ${L.length-15} more</li>`:''}</ul>A cup a team was in keeps it as a participant. You can undo this from the change history.`,'Put '+L.length))return;
  await takeSnapshot('Before putting '+hcPl(L.length,'team')+' in the league found',true);
  histLabel('Health check: '+hcPl(L.length,'team')+' put in the league found','Health',()=>L.forEach(([t,c])=>nlPutIn(t,c)));toast(hcPl(L.length,'team')+' put in a league','ok');rerender()};
/* ================= Health check → Images left out of the export ================= */
// RULE (rule book, "Images named by no file"): option-file images that no team or competition file names. "Allocate" gives each
// one to its team or competition when its folder or file name tells (the fallback for loose images: no game file names them), into
// a FREE slot of its kind only; a slot that already has an image is never replaced. With no free slot, no owner found or no kind
// to tell, the row says so and asks: Delete (always left out of the export, even with the option off) or Ignore (kept as the
// option file has it, hidden here). An allocated image is written under the team's own image name at export, so its team file
// names it.
const OR_KIND=[['kit',/(^k_|kit|uniform|jersey)/i],['emblem',/(^e_|emblem|crest|badge|escudo|wappen)/i],['manager',/(^m_|manager|coach|trainer)/i],['stadium',/(^s_|stadium|estadio|stadion)/i],['sponsor',/(^p\d_|sponsor|board|advert)/i]];
const OR_LABEL={kit:'kit',emblem:'crest',manager:'manager photo',stadium:'stadium',sponsor:'sponsor board',logo:'logo'};
const orBase=p=>p.split('/').pop().replace(/\.[a-z0-9]+$/i,'');
const orToks=p=>orBase(p).replace(/^(k|e|m|s|p\d)_/i,'').split(/[_\-.\s]+/).filter(Boolean);
// The kind an image is, from its file name and folder: the option file makers' own conventions first (Kits/ and Sala de Prensa/
// folders; Home/Away/Third/GK kits; …STApesuni stadium, …MANpesuni manager, …LOGpesuni crest, …Press1 board).
// a kind you marked (Health check: select images → "These are manager photos" / "These are stadium images") wins over any guess
const orMarked=path=>{const pk=S.settings.ofPkg;return pk&&(S.settings.ofOrKind||{})[pk.id+'|'+path]||''};
function orKind(path){const mk=orMarked(path);if(mk)return mk;const f=orBase(path).toLowerCase(),dirs=ofDir(path).toLowerCase(),near=dirs.split('/').slice(-3).join('/');
  if(/\/logos?\//.test(dirs))return 'logo';
  if(/(press|prensa|sponsor|board|^sp_|^p\d_)/.test(f)||/(prensa|press)/.test(near))return 'sponsor';
  if(/(sta?pesuni$|stadium|estadio|stadion|^s_)/.test(f))return 'stadium';
  if(/(manpesuni$|manager|coach|trainer|^m_|[a-z ]man$|\bman\b)/.test(f))return 'manager';
  if(/(logpesuni$|logo|crest|badge|escudo|emblem|wappen|^e_)/.test(f))return 'emblem';
  if(/(home|away|third|thitd|thirrd|3th|fourth|4th|gk|goalkeeper|keeper|casa|visita|1st|2nd|3rd|_p\d|kit|uniform|jersey|^k_)/.test(f)||/\/kits?\//.test(dirs))return 'kit';
  return ''}
// the kit slot a file name means: GK 1st / GK 2nd for a goalkeeper kit, else 1st (home), 2nd (away) or 3rd (third)
function orKitSlot(path){const f=orBase(path).toLowerCase();
  if(/(gk|goalkeeper|keeper|portero)/.test(f))return /(gk ?2|2nd|away|second|[ _]2$)/.test(f)?'GK 2nd':'GK 1st';
  if(/(third|thitd|thirrd|3rd|3th|tercer|[ _]3$)/.test(f))return '3rd';
  if(/(away|visit|2nd|second|[ _]2$|_p2)/.test(f))return '2nd';return '1st'}
// a second home or away kit, a fourth kit: a variant the team file has no slot of its own for
const orKitAlt=path=>/(home ?2|away ?2|fourth|4th|v2$|alt)/i.test(orBase(path));
const OR_NOISE=/^(1st|2nd|3rd|gk\d?|kit|home|away|third|crest|emblem|badge|logo|manager|coach|stadium|board|sponsor|goalkeeper|\d+|[a-c])$/i;
// whose image it is: the team whose own images sit in the same folder, else the club a folder above it is named after (within the
// same league folder first), else the game ID or name in the file name; a logo in a Logos folder belongs to a competition
const OR_GENERIC=/^(images?|imagenes|imágenes|kits?|teds?|logos?|sala de prensa|press|prensa|escudos|emblemas|estadios|sponsor|\d+|wepes)$/i;
function orOwner(path,kind){const pkg=(S.settings.ofPkg||{}).id,dir=ofDir(path),T=teamsArr().filter(t=>!t.sameAs);const toks=orToks(path);
  const name=toks.filter(x=>!OR_NOISE.test(x)).join(' ');
  const byName=(L,n)=>n?L.find(x=>nameScore(x.name,n)===1||(x.short&&x.short.toLowerCase()===n.toLowerCase())||(x.gameSlot&&nameScore(x.gameSlot,n)===1))||L.find(x=>nameScore(x.name,n)>=0.85):null;
  if(kind==='logo'&&/\/logos?\//i.test(path)){const c=byName(compsArr(),name);return c?{type:'comp',x:c}:null}
  const ofDirs=t=>{const P=(t.of&&t.of.paths)||{};return [P.emblem,P.manager,P.stadium,...(P.sponsors||[]),...(P.kits||[])].filter(Boolean).map(ofDir).concat(t.of&&t.of.imgDir?[t.of.imgDir]:[])};
  // the club folder's name decides first (another team's file can name an image kept in this club's folder), within its league;
  // a folder whose words all appear in exactly one club's name counts too (Heidenheim, Werder bremen, St. Pauli)
  const lg=T.filter(x=>x.of&&x.of.league&&path.startsWith(x.of.league+'/'));const W=x=>norm(x).split(/\s+/).filter(w=>w.length>=3);
  // words match either way (PSV ↔ PSV Eindhoven, NICE ↔ OGC Nice), and only when exactly one club of the league fits
  const within=(L,f)=>{const fw=W(f);if(!fw.length)return null;const fit=(a,b)=>a.every(w=>b.some(y=>y===w||y.startsWith(w)||w.startsWith(y)));
    const hit=L.filter(x=>{const tw=W(x.name+' '+(x.gameSlot||''));return tw.length&&(fit(fw,tw)||fit(W(x.name),fw))});return hit.length===1?hit[0]:null};
  let t=null,clubFolder=false;const seg=dir.split('/').filter(Boolean);
  // a manager photo or stadium image: the club whose manager or stadium the file name names (Julian Calero.png → the club Julián
  // Calero manages; Eleda Stadion → the club that plays there), within the league first, then anywhere; only one club may fit
  if(kind==='manager'||kind==='stadium'){const fl=norm(orBase(path).replace(/(pesuni|jackliee|stapesuni|manpesuni)$/i,'').replace(/[_\-.]+/g,' '));const fw=fl.split(/\s+/).filter(w=>w.length>=3&&!/^(stadium|stadion|estadio|manager|coach|man|sta)$/.test(w));
    const of=x=>kind==='manager'?((x.manager&&x.manager.name)||''):(x.stadium||'');
    const fits=x=>{const n=norm(of(x));if(!n||!fw.length)return false;const nw=n.split(/\s+/).filter(w=>w.length>=3);return nameScore(of(x),fl)>=0.85||(fw.every(w=>nw.some(y=>y.startsWith(w)||w.startsWith(y)))&&nw.filter(w=>fw.some(y=>y.startsWith(w)||w.startsWith(y))).length>=Math.min(2,nw.length))};
    const one=L=>{const h=L.filter(fits);return h.length===1?h[0]:null};t=one(lg)||one(T)}
  for(let i=seg.length-1;i>=0&&!t;i--){const f=seg[i].replace(/[_\-.]+/g,' ').replace(/\b(kits?|images?|logo|press room|official partners)\b/ig,'').trim();if(!f||OR_GENERIC.test(f)||/^\d\d\. /.test(seg[i]))continue;
    t=byName(lg,f)||within(lg,f)||byName(T,f);if(!t&&!/(kits|real|eropa|europe|asia|afri|amerika|america|press|partner)/i.test(seg[i])&&i===seg.length-1)clubFolder=true}
  // a club named in the file name itself (HondurasAwayPesuni → Honduras), when exactly one club of the league fits
  if(!t){const fl=orBase(path).toLowerCase();const hit=lg.filter(x=>W(x.name).some(w=>w.length>=5&&fl.includes(w)));if(hit.length===1)t=hit[0]}
  // a folder named after a club the project doesn't have leaves the image unowned; otherwise the team whose own images sit here
  if(!t&&!clubFolder)t=T.find(t=>t.of&&t.of.pkg===pkg&&ofDirs(t).includes(dir))||T.find(t=>t.ofNew&&t.ofNew.dir===dir);
  if(!t){const num=toks.find(x=>/^\d{3,}$/.test(x));if(num)t=T.find(t=>+t.gameId===+num)}
  if(!t)t=byName(T,name);if(t)return{type:'team',x:t};
  if(!kind||kind==='logo'||kind==='emblem'){const c=byName(compsArr(),name);if(c)return{type:'comp',x:c}}return null}
// the plan for one image: where it goes, or why it can't
function orPlan(path){const kind0=orKind(path);const o=orOwner(path,kind0);if(!o)return{path,kind:kind0,note:'No team or competition matches its name or folder.'};
  if(o.type==='comp'){const c=o.x;if(!(c.ced&&c.ced.b64)&&!(c.of&&c.of.ced))return{path,kind:'logo',o,note:esc0(c.name)+' has no competition file to name a logo.'};
    if(S.images[c.emblem])return{path,kind:'logo',o,note:'No free slot: '+esc0(c.name)+'\'s competition file already names a logo.'};return{path,kind:'logo',o,ok:true}}
  const t=o.x,kind=kind0==='logo'?'emblem':kind0;if(!kind)return{path,kind:'',o,note:'Its name doesn\'t say which kind of image it is (crest, kit, manager photo, stadium or board).'};
  const nm=esc0(t.name);
  if(kind==='emblem')return S.images[t.emblem]?{path,kind,o,note:'No free slot: '+nm+'\'s team file already names a crest.'}:{path,kind,o,ok:true};
  if(kind==='manager')return S.images[t.managerPhoto]?{path,kind,o,note:'No free slot: '+nm+' already has a manager photo.'}:{path,kind,o,ok:true};
  if(kind==='stadium'){if(isNationalTeam(t))return{path,kind,o,note:nm+' is a national team: its team file has no stadium slot.'};return S.images[t.stadiumImg]?{path,kind,o,note:'No free slot: '+nm+' already has a stadium image.'}:{path,kind,o,ok:true}}
  if(kind==='sponsor'){const i=spOf(t).findIndex(id=>!S.images[id]);return i<0?{path,kind,o,note:'No free slot: all 3 sponsor boards of '+nm+' are taken.'}:{path,kind,o,ok:true,slot:i}}
  const want=orKitSlot(path),fam=/^GK/.test(want)?['GK 1st','GK 2nd']:['1st','2nd','3rd'];const has=s=>{const k=(t.kits||[]).find(k=>k.slot===s);return !!(k&&S.images[k.img])};
  // its own slot first (a slot the game fills with its default kit counts as free); a variant kit only takes a free slot of its family
  if(orKitAlt(path)&&has(want)){const free=fam.filter(s=>!has(s));if(!free.length)return{path,kind,o,note:'A variant kit (second home or away, fourth): '+nm+'\'s team file has no free '+(fam.length===2?'goalkeeper':'outfield')+' kit slot for it.'}}
  const slot=[want,...fam.filter(s=>s!==want)].find(s=>!has(s));
  return slot?{path,kind,o,ok:true,slot}:{path,kind,o,note:'No free kit slot: '+nm+'\'s team file has all its '+(fam.length===2?'goalkeeper':'outfield')+' kits ('+fam.join(', ')+').'}}
const orWhere=p=>!p.o?'':p.o.type==='team'?`${OR_LABEL[p.kind]||'image'}${p.kind==='kit'&&p.slot?' '+p.slot:p.kind==='sponsor'&&p.slot!=null?' '+(p.slot+1):''} of <b>${esc(p.o.x.name)}</b>`:`logo of <b>${esc(p.o.x.name)}</b>`;
// Every image name a game file holds, by file name in lower case (the game finds an image by its name, in any folder): every team
// and competition file of the option file, whether or not its team or competition is exported, and the studio's own team and
// competition files, including those of teams and competitions kept without a code. The export still leaves out the images of
// what has no code (its file isn't written); this only keeps them off the health check's list.
async function orNamedBases(pkg){const out=new Set();const add=x=>{if(x)out.add(String(x).split(/[\\/]/).pop().toLowerCase())};
  const tedNames=b=>{try{const n=ofNames(TED.decrypt(TED.unb64(b)));[n.emblem,n.stadium,n.sp1,n.sp2,n.sp3,n.manager,...(n.kits||[])].forEach(add)}catch(e){}};
  const gf=OF_GF.get(pkg)||await ofGameFiles(pkg);Object.entries(gf||{}).forEach(([p,b])=>{if(/\.ted$/i.test(p))tedNames(b);else if(/\.ced$/i.test(p)){try{add(CED.parse(TED.unb64(b)).emblemFile)}catch(e){}}});
  Object.values(S.teds||{}).forEach(x=>{add(x.emblemFile);if(x.b64)tedNames(x.b64)});
  teamsArr().forEach(t=>{const n=t.of&&t.of.names;if(n)[n.emblem,n.stadium,n.sp1,n.sp2,n.sp3,n.manager,...(n.kits||[])].forEach(add)});
  compsArr().forEach(c=>{if(c.ced){add(c.ced.emblemFile);if(c.ced.b64){try{add(CED.parse(TED.unb64(c.ced.b64)).emblemFile)}catch(e){}}}});return out}
// the option file's images no file names, from a dry export plan (worked out once per build of the project)
// everything the image list depends on, as one string: the teams and competitions without their players, the marks and the
// ignore list. A change to players only (an ID, a number, a transfer) leaves it the same, so the list is not worked out again.
function orSig(){const m=orSig.m;if(m&&m.rev===Store.rev&&m.T===S.teams&&m.C===S.comps&&m.I===S.images)return m.v;
  const v=JSON.stringify([Object.values(S.teams).map(t=>{const {players,updatedAt,...r}=t;return r}),Object.values(S.comps).map(c=>{const {updatedAt,ced,...r}=c;return[r,!!(ced&&ced.b64),ced&&ced.emblemFile]}),S.settings.ofOrphan,S.settings.ofOrKind,Object.keys(S.images).length]);
  orSig.m={rev:Store.rev,T:S.teams,C:S.comps,I:S.images,v};return v}
function orList(){const pk=S.settings.ofPkg;if(!pk)return null;const k=pk.id+'|'+pk.builtAt;const R=S.ui.orph;
  if(!R||R.k!==k){if(!S.ui.orphBusy){S.ui.orphBusy=true;ofPlan('full',{dry:true,orphans:true}).then(async p=>{S.ui.orph={k,list:p.orphans,named:await orNamedBases(pk.id)}}).catch(e=>{S.ui.orph={k,list:[],err:e.message}}).finally(()=>{S.ui.orphBusy=false;if(location.hash==='#health'||location.hash==='#overview')rerender()})}return null}
  // kept until something it depends on changes (orSig): working out where each image could go takes about a second for a few hundred images
  const sig=orSig();const M=orList.m;if(M&&M.R===R&&M.sig===sig)return M.v;
  const st=S.settings.ofOrphan||{};const refs=new Set();const add=id=>{const i=id&&S.images[id];if(i&&i.ref)refs.add(i.ref)};
  // linked to any team or competition of the studio (with a code or not), or named by any game file (orNamedBases): never listed
  const P2=t=>{const P=(t.of&&t.of.paths)||{};return[P.emblem,P.manager,P.stadium,...(P.sponsors||[]),...(P.kits||[])]};const paths=new Set();
  teamsArr().forEach(t=>{add(t.emblem);add(t.managerPhoto);add(t.stadiumImg);spOf(t).forEach(add);(t.kits||[]).forEach(k=>add(k.img));P2(t).forEach(x=>x&&paths.add(x))});compsArr().forEach(c=>{add(c.emblem);const x=c.of&&c.of.paths&&c.of.paths.emblem;if(x)paths.add(x)});
  const nb=R.named||new Set(),named=p=>nb.has(p.split('/').pop().toLowerCase());
  const shown=R.list.filter(p=>!refs.has(ofRef(pk.id,p))&&!paths.has(p)&&!named(p));
  const v={err:R.err,all:shown,list:shown.filter(p=>!st[pk.id+'|'+p]).map(orPlan)};orList.m={R,sig,v};return v}
function orphHTML(L){const pk=S.settings.ofPkg;if(!pk)return '<p class="why">No option file in use.</p>';if(!L)return '<p class="why">Reading the option file…</p>';
  const head=`<p class="why">Images of the option file that no team or competition file names: the game never shows them, and ${S.settings.ofNoOrphans===false?'they are exported as they are ("Don\'t include images named by no file" is off on Import / Export → Export Option File)':'the export leaves them out ("Don\'t include images named by no file")'}. <b>Fix: link it</b> names the image in its team or competition file, found by the team folder it sits in and the option file makers' naming (Kits and Sala de Prensa folders, Home/Away/Third/GK, …STA stadium, …MAN manager, …LOG crest, …Press boards), in a free slot of its kind: a slot showing the PES default image counts as free and is switched to the image; an image already named in a slot is never replaced. With no free slot, choose <b>Delete</b> (always left out of the export) or <b>Ignore</b> (kept as the option file has it, hidden here).</p>`;
  if(L.err)return head+`<div class="warnbox" style="margin:0 14px 12px">${esc(L.err)}</div>`;if(!L.list.length)return head+'<p class="why">None left.</p>';
  const lim=S.ui.orMore?L.list.length:60;
  const row=p=>{const u=ofUrl(ofRef(pk.id,p.path)),e=esc(p.path);
    const open=p.o?(p.o.type==='team'?`<button class="sm" data-act="openTeamImg" data-id="${p.o.x.id}">Open team</button>`:`<button class="sm" data-act="tocComp" data-id="${p.o.x.id}">Open competition</button>`):'';
    return hcRow('note',esc(p.path.split('/').pop()),`<span style="word-break:break-all">${esc(ofDir(p.path))}</span><br>${p.ok?'Goes to the '+orWhere(p):'<b>Note:</b> '+p.note}`,
      `${p.ok?`<button class="sm primary" data-act="orAlloc" data-path="${e}" title="Names this image in its slot of the team or competition file (a slot showing the PES default image is switched to it)">Fix: link it</button>`:''}<button class="sm" data-act="orView" data-path="${e}">View</button>${open}${p.ok?'':`<button class="sm" data-act="orSet" data-v="del" data-path="${e}">Delete</button><button class="sm" data-act="orSet" data-v="ign" data-path="${e}">Ignore</button>`}`,
      {lead:`<input type="checkbox" class="orsel" value="${e}" aria-label="Select ${esc(p.path.split('/').pop())}" ${(S.ui.orSel||new Set()).has(p.path)?'checked':''}><button class="orth" data-act="orView" data-path="${e}" title="View ${e}"><img src="${esc(u)}" alt="" loading="lazy"></button>`,tip:p.path})};
  const marks=Object.keys(S.settings.ofOrKind||{}).filter(k=>k.startsWith(pk.id+'|')).length;
  const tools=`<div class="row" style="margin:0 14px 10px;gap:6px;flex-wrap:wrap"><span class="small"><b>Selected images are…</b></span>
    <button class="sm" data-act="orMark" data-k="manager" title="Finds the team whose manager the file name names, else by folder">Manager photos</button><button class="sm" data-act="orMark" data-k="stadium" title="Finds the team whose stadium the file name names, else by folder">Stadium images</button>
    <button class="sm" data-act="orMark" data-k="kit">Kits</button><button class="sm" data-act="orMark" data-k="emblem">Crests</button><button class="sm" data-act="orMark" data-k="sponsor">Sponsor boards</button>
    <span class="spacer"></span><button class="sm ghost" data-act="orSelAll">Select all shown</button><button class="sm ghost" data-act="orSelNone">Select none</button>${marks?`<button class="sm ghost" data-act="orUnmark">Forget my ${marks} mark${marks===1?'':'s'}</button>`:''}</div>`;
  return head+tools+`<div class="hc-rows">${L.list.slice(0,lim).map(row).join('')}${L.list.length>lim?hcMoreRow(L.list.length-lim,`<button class="sm" data-act="orMore">Show all ${L.list.length}</button>`):''}</div>`}
function orHeadBtns(L){if(!L||!L.list.length)return'';const ok=L.list.filter(p=>p.ok).length,no=L.list.length-ok;
  return (ok?`<button class="sm primary" data-act="orAllocAll" title="Gives every image whose team or competition is known to its free slot">Apply all suggested actions (${ok})</button>`:'')+(no?`<button class="sm" data-act="orAskRest">Delete or ignore the rest (${no})</button>`:'')}
// the image record for a package image: the existing one, or a reference to the package file (never a copy in the browser)
function orImg(path,kind,name){const pk=S.settings.ofPkg;const ref=ofRef(pk.id,path);const ex=Object.values(S.images).find(i=>i.ref===ref);if(ex)return ex.id;
  const sz=kindSize(kind)||[256,256];const m=(OF_MAN.get(pk.id)||[]).find(e=>e.path===path);
  const rec={id:uid(),kind,name:String(name||orBase(path)).slice(0,60),ref,w:kind==='kit'?2048:sz[0],h:kind==='kit'?2048:sz[1],size:m?+m.size||0:0,createdAt:Date.now(),of:path};saveImage(rec);return rec.id}
function orApply(p){if(!p||!p.ok)return false;const x=p.o.x;
  if(p.o.type==='comp'){const c=clone(S.comps[x.id]);c.emblem=orImg(p.path,'comp',c.name+' logo');saveComp(c);return true}
  const t=clone(S.teams[x.id]);if(!t)return false;
  if(p.kind==='emblem')t.emblem=orImg(p.path,'emblem',t.name+' crest');
  else if(p.kind==='manager')t.managerPhoto=orImg(p.path,'manager',t.name+' manager');
  else if(p.kind==='stadium')t.stadiumImg=orImg(p.path,'stadium',t.name+' stadium');
  else if(p.kind==='sponsor'){const a=spOf(t);a[p.slot]=orImg(p.path,'sponsor',t.name+' board '+(p.slot+1));t.sponsorImgs=a}
  else if(p.kind==='kit'){t.kits=t.kits||[];let k=t.kits.find(z=>z.slot===p.slot);if(!k){k=newKit(p.slot);t.kits.push(k)}k.img=orImg(p.path,'kit',t.name+' '+p.slot)}else return false;
  saveTeam(t);return true}
const orFind=path=>{const L=orList();return L&&L.list.find(p=>p.path===path)};
const orDone=()=>{if(S.ui.tocSt){delete S.ui.tocSt.full;delete S.ui.tocSt.changes}S.ui.ofEst=null;rerender()};
// selecting rows, and telling the studio what the selected images are; their rows then show where each goes, ready to fix
document.addEventListener('change',e=>{const el=e.target;if(!el||!el.classList||!el.classList.contains('orsel'))return;const S2=S.ui.orSel||(S.ui.orSel=new Set());el.checked?S2.add(el.value):S2.delete(el.value)});
ACT.orSelAll=()=>{const S2=S.ui.orSel||(S.ui.orSel=new Set());document.querySelectorAll('.orsel').forEach(c=>{c.checked=true;S2.add(c.value)})};
ACT.orSelNone=()=>{S.ui.orSel=new Set();document.querySelectorAll('.orsel').forEach(c=>c.checked=false)};
ACT.orMark=el=>{const sel=[...(S.ui.orSel||[])];if(!sel.length){toast('Tick the images first (the box at the start of each row)','err');return}const pk=S.settings.ofPkg;const m=S.settings.ofOrKind||(S.settings.ofOrKind={});
  sel.forEach(p=>m[pk.id+'|'+p]=el.dataset.k);saveSettings();S.ui.orSel=new Set();const L=orList();const ok=L?L.list.filter(p=>sel.includes(p.path)&&p.ok).length:0;
  toast(`${sel.length} marked as ${OR_LABEL[el.dataset.k]||el.dataset.k}${el.dataset.k==='sponsor'||el.dataset.k==='kit'?'s':el.dataset.k==='manager'?'s':el.dataset.k==='stadium'?'s':'s'}: ${ok} found ${ok===1?'its':'their'} team. Press Fix on a row, or Apply all.`,'ok');rerender()};
ACT.orUnmark=()=>{const pk=S.settings.ofPkg;const m=S.settings.ofOrKind||{};Object.keys(m).forEach(k=>{if(k.startsWith(pk.id+'|'))delete m[k]});saveSettings();rerender()};
ACT.orAlloc=el=>{const p=orFind(el.dataset.path)||orPlan(el.dataset.path);if(!p.ok){toast(p.note.replace(/<[^>]+>/g,''),'err');return}
  histLabel('Health check: image allocated','Health',()=>orApply(p));closeModal();toast(p.path.split('/').pop()+' is now the '+orWhere(p).replace(/<[^>]+>/g,''),'ok');orDone()};
ACT.orAllocAll=async()=>{const L=orList();if(!L)return;const ok=L.list.filter(p=>p.ok);if(!ok.length)return;
  if(!await ask('Allocate the images?',`<b>${ok.length}</b> image${ok.length===1?'':'s'} go to the free slot of their team or competition, found by folder or file name. No image already in a slot is replaced. You can undo it from the change history.`,'Allocate '+ok.length))return;
  // one at a time against the state as it changes, so two images never take the same free slot
  let n=0;histLabel('Health check: '+ok.length+' images allocated','Health',()=>{ok.forEach(p=>{const q=orPlan(p.path);if(q.ok&&orApply(q))n++})});
  toast(n+' image'+(n===1?'':'s')+' allocated','ok');orDone();const rest=(orList()||{list:[]}).list.filter(p=>!p.ok);if(rest.length)orAskRest(rest)};
ACT.orAskRest=()=>{const L=orList();if(L)orAskRest(L.list.filter(p=>!p.ok))};
function orAskRest(rest){if(!rest.length)return;S.ui.orRest=rest.map(p=>p.path);
  modal(`<div class="mhead"><h2>${rest.length} image${rest.length===1?'':'s'} can't be allocated</h2></div><p class="small">Most have no free slot of their kind in their team or competition file. <b>Delete</b> leaves them out of every export; <b>Ignore</b> keeps them as the option file has them and hides them here.</p>
    <div class="small" style="max-height:260px;overflow:auto;margin:8px 0">${rest.slice(0,300).map(p=>`<div style="margin:3px 0"><b>${esc(p.path.split('/').pop())}</b> <span class="muted">${p.note}</span></div>`).join('')}${rest.length>300?`<div class="muted">and ${rest.length-300} more</div>`:''}</div>
    <div class="row end"><button data-act="close">Decide later</button><button data-act="orRest" data-v="ign">Ignore them</button><button class="danger" data-act="orRest" data-v="del">Delete them</button></div>`)}
const orMark=(paths,v)=>{const pk=S.settings.ofPkg;const st=S.settings.ofOrphan||(S.settings.ofOrphan={});paths.forEach(p=>{st[pk.id+'|'+p]=v});saveSettings()};
ACT.orRest=el=>{const L=S.ui.orRest||[];orMark(L,el.dataset.v);closeModal();toast(L.length+' image'+(L.length===1?'':'s')+(el.dataset.v==='del'?' deleted from the export':' ignored'),'ok');orDone()};
ACT.orSet=el=>{orMark([el.dataset.path],el.dataset.v);closeModal();toast(el.dataset.path.split('/').pop()+(el.dataset.v==='del'?' is left out of every export':' is ignored'),'ok');orDone()};
ACT.orOpen=el=>{closeModal();ACT.openTeamImg(el)};
ACT.orMore=()=>{S.ui.orMore=true;rerender()};
// the image at full size, where it would go (or why it can't), and a jump to its team or competition
ACT.orView=el=>{const pk=S.settings.ofPkg;if(!pk)return;const path=el.dataset.path;const p=orFind(path)||orPlan(path);const e=esc(path);const m=(OF_MAN.get(pk.id)||[]).find(x=>x.path===path);
  const open=p.o?(p.o.type==='team'?`<button data-act="orOpen" data-id="${p.o.x.id}">Open ${esc(p.o.x.name)}</button>`:`<button data-act="tocComp" data-id="${p.o.x.id}">Open ${esc(p.o.x.name)}</button>`):'';
  modal(`<div class="mhead"><h2>${esc(path.split('/').pop())}</h2></div><div class="imgview"><img src="${esc(ofUrl(ofRef(pk.id,path)))}" alt="${e}"></div>
    <p class="small muted" style="margin:8px 0 0">From the option file: ${e}${m&&m.size?' · '+kb(+m.size):''}. Named by no team or competition file.</p>
    <p class="small" style="margin:4px 0 0">${p.ok?'Allocate makes it the '+orWhere(p)+'.':'<span class="sev warn">Note</span> '+p.note}</p>
    <div class="row end" style="margin-top:12px"><button data-act="close">Close</button>${open}${p.ok?`<button class="primary" data-act="orAlloc" data-path="${e}">Allocate</button>`:`<button data-act="orSet" data-v="ign" data-path="${e}">Ignore</button><button class="danger" data-act="orSet" data-v="del" data-path="${e}">Delete</button>`}</div>`,true)};
/* ================= Sources in order: a dot per source on every task ================= */
// RULE (rule book, "Sources in order"): free sources first (green), then Claude's own knowledge (yellow), then Claude web search
// (red, only when it is switched on). Each task records the sources it actually used, in that order, and shows one dot per source at
// the far right of its row; a task still waiting shows the source it starts with.
const SRC_DOT={free:['free','Free sources'],claude:['claude','Claude\'s own knowledge'],web:['web','Claude web search']};
const SRC_ORDER=['free','claude','web'];
function jobStage(k){const j=CUR_JOB;if(!j||!SRC_DOT[k])return;const st=j.stages||(j.stages=[]);if(st.includes(k))return;st.push(k);st.sort((a,b)=>SRC_ORDER.indexOf(a)-SRC_ORDER.indexOf(b));jobSave(j)}
// a call to a free source's API marks the task green
{const _f=window.fetch.bind(window);window.fetch=(u,...a)=>{const url=typeof u==='string'?u:(u&&u.url)||'';
  if(/^\/?api\/(efootball|fc|fifa|tm|wp|tsdb|wd|gh|logo|image)\b/.test(url))jobStage('free');return _f(u,...a)}}
const FREE_JOBS=new Set(['free','freePlayers','ef','efPlayers','efImages','tmInfo','compPull','fcPlayers','fifaTeam','freeArt','logos']);
function jobPlan(j){if(FREE_JOBS.has(j.type))return['free'];if(j.type==='team'&&efOn()&&!j.claudeOnly)return['free','claude'];return['claude']}
function jobDots(j){const st=(j.stages&&j.stages.length?j.stages:j.status==='queued'?jobPlan(j).slice(0,1):[]).filter(k=>k!=='web'||webAllowed());
  // the source in use flashes, and only while the task runs; a queued task's first source is dimmed; finished tasks keep steady dots
  const run=j.status==='running',wait=j.status==='queued';
  return st.map((k,i)=>{const live=run&&i===st.length-1,lab=SRC_DOT[k][1]+(live?', in use':'');
    return `<span class="sdot ${SRC_DOT[k][0]}${live?' live':wait?' wait':''}" role="img" aria-label="${lab}" title="${lab}"></span>`}).join('')}
// with web search switched off, nothing offers or starts a web search
{const _c=ACT.updCmd;ACT.updCmd=el=>{if(S.settings.aiWeb==='off'){toast('Web search is off (Claude settings), so no web-search command is made.','err');return}return _c(el)}}
{const _jr=jobRowHTML;jobRowHTML=j=>_jr(j).replace(/<\/tr>\s*$/,`<td class="srcdots" style="text-align:right;white-space:nowrap;width:1%">${jobDots(j)}</td></tr>`)}
