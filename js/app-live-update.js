// PES 2021 Option Studio, part 11 of 14: Live Update, the source buckets (Logos & kits), Import / Export pages.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= Live Update: one page in five tabs, by the size of the work =================
   General (status, settings, sources) · Competitions · Teams · Players · Stats (progress, cost, queue, log).
   Each tab keeps the free sources (eFootball, Transfermarkt, TheSportsDB, Wikidata) apart from Claude, which costs money. */
const AI_TABS=[['general','General'],['comps','Competitions'],['teams','Teams'],['players','Players'],['logos','Logos & kits'],['stats','Stats']];
const srcTag=paid=>paid?'<span class="sdot paid" role="img" aria-label="Uses Claude" title="Uses Claude"></span>':'<span class="sdot free" role="img" aria-label="Free" title="Free data sources"></span>';
const aiPlayers=()=>allPlayers().map(x=>x.p);
// Stats (progress details, cost, queue, log) and dollar amounts are for admins: signed-in site accounts, or a local studio
const aiAdmin=()=>!!(window.claude&&window.claude.isAdmin&&window.claude.isAdmin());
const aiTabs=()=>AI_TABS.filter(([k])=>k!=='stats'||aiAdmin());
window.addEventListener('studio-me',()=>{if(S.ui.view==='ai')rerender()});
VIEWS.ai=()=>{const pre=S.ui.aiPrefill||{};
  // a shortcut from another page (a team's Claude button, a competition, selected players) opens the matching tab once
  if(S.ui.aiPrefill&&S.ui.aiPreSeen!==S.ui.aiPrefill){S.ui.aiPreSeen=S.ui.aiPrefill;S.ui.aiTab=pre.teamId||pre.newTeam?'teams':pre.compName?'comps':pre.players&&pre.players.length?'players':S.ui.aiTab}
  const tabs=aiTabs();const tab=tabs.some(([k])=>k===S.ui.aiTab)?S.ui.aiTab:'general';S.ui.aiTab=tab;const a=S.ui.ai;const adm=aiAdmin();
  return `<h1>Live Update</h1>
  <p class="sub">Draft teams, ratings, competitions and kits from the free football databases first, and from Claude where they have nothing. Nothing changes your data directly: results go to <a href="#review">Process and Review</a>.</p>
  <p class="small muted" style="margin:-4px 0 0">${srcTag(false)} free sources &nbsp; ${srcTag(true)} uses Claude</p>
  <div class="tabs" role="tablist" aria-label="Live Update sections">${tabs.map(([k,l])=>`<button role="tab" id="ait-${k}" aria-selected="${tab===k}" aria-controls="aip" tabindex="${tab===k?0:-1}" class="${tab===k?'on':''}" data-act="aiTab" data-tab="${k}">${l}${k==='stats'?` <span class="rdot" id="ai-stats-dot" ${a.running?'':'hidden'} title="Working"></span>`:''}</button>`).join('')}</div>
  ${tab!=='stats'&&(a.running||a.busy)?`<div class="card" style="margin-bottom:14px"><div class="row" style="flex-wrap:nowrap"><div class="aiprog-slot" style="flex:1">${progHTML()}</div>${adm?'<button class="sm" data-act="aiTab" data-tab="stats">Open Stats</button>':a.running?'<button class="sm danger" data-act="aiCancel">Stop</button>':''}</div></div>`:''}
  <div id="aip" role="tabpanel" aria-labelledby="ait-${tab}">${AI_TAB_HTML[tab](pre)}</div>`};
ACT.aiTab=el=>{if(!aiTabs().some(([k])=>k===el.dataset.tab))return;S.ui.aiTab=el.dataset.tab;if(location.hash!=='#ai')location.hash='ai';else rerender();const b=$('#ait-'+S.ui.aiTab);if(b)b.focus()};
// arrow keys move between the tabs (WAI-ARIA tabs pattern)
document.addEventListener('keydown',e=>{const t=e.target;if(!t||!t.getAttribute||t.getAttribute('role')!=='tab'||!t.closest('[aria-label="Live Update sections"]'))return;
  const T=aiTabs();const i=T.findIndex(([k])=>'ait-'+k===t.id);let n=null;if(e.key==='ArrowRight')n=(i+1)%T.length;else if(e.key==='ArrowLeft')n=(i-1+T.length)%T.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=T.length-1;
  if(n==null)return;e.preventDefault();S.ui.aiTab=T[n][0];rerender();const b=$('#ait-'+S.ui.aiTab);if(b)b.focus()});

/* ---- cost: Claude's real usage per request (reported by the server), and an estimate for what is waiting ---- */
// $ per million tokens (input, output); web search $0.01 each. The model named in each reply picks the price.
const AI_PRICE={opus:[4,20],sonnet:[2,10],haiku:[0.1,0.5],fable:[8,40],mythos:[8,40]};const AI_TIER_PRICE={complex:'opus',default:'sonnet',quick:'haiku'};const AI_SEARCH_USD=0.01;
const aiPriceOf=model=>{const m=String(model||'').toLowerCase();const k=Object.keys(AI_PRICE).find(k=>m.includes(k))||AI_TIER_PRICE[S.settings.aiTier||'complex'];return AI_PRICE[k]};
function aiUsd(u,model,searches){const s=(searches||0)*AI_SEARCH_USD;if(!u)return s;const [pi,po]=aiPriceOf(model);
  return((u.input||0)*pi+(u.output||0)*po+(u.cache_read||0)*pi*0.1+(u.cache_write||0)*pi*1.25)/1e6+s}
const aiSpend=()=>S.settings.aiSpend||(S.settings.aiSpend={usd:0,requests:0,input:0,output:0,searches:0,months:{},since:Date.now()});
const aiSession=()=>S.ui.ai.cost||(S.ui.ai.cost={usd:0,requests:0,input:0,output:0,searches:0});
function costRecord(r){if(!r||!(r.usage||r.searches))return;const usd=aiUsd(r.usage,r.model,r.searches);const u=r.usage||{};
  [aiSpend(),aiSession()].forEach(o=>{o.usd+=usd;o.requests++;o.input+=(u.input||0)+(u.cache_read||0)+(u.cache_write||0);o.output+=u.output||0;o.searches+=r.searches||0});
  const ym=new Date().toISOString().slice(0,7);const sp=aiSpend();sp.months[ym]=(sp.months[ym]||0)+usd;saveSettings();
  const j=jobsArr().find(x=>x.status==='running');if(j){j.cost=(j.cost||0)+usd;j.requests=(j.requests||0)+1;jobSave(j)}
  costLive()}
// every Claude request goes through getSample: wrap it once so answers and billed failures are both counted
{const _gs=getSample;let W=null;getSample=async()=>{const s=await _gs();if(!s)return s;if(W&&W.base===s)return W.fn;
  const fn=async(p,o)=>{try{const r=await s(p,o);costRecord(r);return r}catch(e){if(e&&e.usage)costRecord(e);throw e}};W={base:s,fn};return fn}}
// Claude requests a job will make: squads from the free sources cost nothing; ratings are one request per 6 players
function jobRequests(j){const size=t=>Math.max(1,((t&&t.players)||[]).length||25);
  switch(j.type){
    case 'team':{const t=S.teams[j.teamId]||j.virtual;const p=new Set(j.parts||[]);let n=0;
      const ef=efOn()&&['roster','newStats','refreshStats','bio','styles','transfers'].some(k=>p.has(k));
      if(ef){if(p.has('manager')||p.has('kits'))n++}
      else{if(['roster','transfers','bio','styles','manager','kits'].some(k=>p.has(k)))n++;if(p.has('newStats')||p.has('refreshStats'))n+=Math.ceil(size(t)/6)}
      return n}
    case 'ratings':return Math.ceil((j.ids||[]).length/6);
    case 'comp':return 1+(j.squads?18*(efOn()?1:1+(j.stats!==false?5:0)):0);
    case 'compCheck':case 'kits':return 1;
    case 'intl':return j.full?6:3;
    case 'logos':return(j.useClaude===false?0:Math.ceil(((j.teamIds||[]).length+(j.compIds||[]).length)/25))+(j.design?(j.teamIds||[]).length:0);
    default:return 0}}
// average cost of one request: what this project has really paid, or a first guess from the model and the web search setting
function aiAvgUsd(){const sp=aiSpend();if(sp.requests>=5)return{usd:sp.usd/sp.requests,learned:true};
  const [pi,po]=AI_PRICE[AI_TIER_PRICE[S.settings.aiTier||'complex']];const web=!!(window.claude&&window.claude.standalone)&&S.settings.aiWeb!=='off';
  return{usd:((web?30000:2500)*pi+3000*po)/1e6+(web?3*AI_SEARCH_USD:0),learned:false}}
function aiEstimate(jobs){const n=jobs.reduce((a,j)=>a+jobRequests(j),0);const avg=aiAvgUsd();return{requests:n,usd:n*avg.usd,learned:avg.learned}}
const money=v=>v>0&&v<0.01?'<$0.01':'$'+(v||0).toFixed(v>=100?0:2);
const estRange=e=>money(e.usd*0.6)+'–'+money(e.usd*1.6);
const estLine=jobs=>{const e=aiEstimate(jobs);const n=Math.ceil(e.requests);return n?`about <b>${n}</b> Claude request${n===1?'':'s'}`+(aiAdmin()?`, roughly <b>${estRange(e)}</b>`:''):'no Claude requests: <b>free</b>'};
const estAsk=e=>`about <b>${Math.ceil(e.requests)}</b> Claude requests`+(aiAdmin()?`, roughly <b>${estRange(e)}</b>`:'');
function costHTML(){const sp=aiSpend(),se=aiSession(),wait=jobsArr().filter(j=>j.status==='queued'||j.status==='running');const e=aiEstimate(wait);const avg=aiAvgUsd();
  const ym=new Date().toISOString().slice(0,7);const tok=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?Math.round(n/1e3)+'k':String(n);
  const tier={complex:'Thorough (Opus)',default:'Balanced (Sonnet)',quick:'Fast (Haiku)'}[S.settings.aiTier||'complex'];
  return `<div class="kpis">
    <div class="kpi"><span>Waiting jobs (estimate)</span><b>${e.requests?money(e.usd):'$0'}</b><small>${e.requests?'≈ '+Math.ceil(e.requests)+' Claude requests ('+estRange(e)+')':wait.length?'free sources only':'nothing waiting'}</small></div>
    <div class="kpi"><span>This session</span><b>${money(se.usd)}</b><small>${se.requests} requests · ${tok(se.input)} in / ${tok(se.output)} out · ${se.searches} searches</small></div>
    <div class="kpi"><span>This month</span><b>${money(sp.months[ym]||0)}</b><small>${esc(new Date().toLocaleString(undefined,{month:'long',year:'numeric'}))}</small></div>
    <div class="kpi"><span>All time</span><b>${money(sp.usd)}</b><small>${sp.requests} requests since ${esc(new Date(sp.since||Date.now()).toLocaleDateString())}</small></div></div>
   <p class="small muted" style="margin:10px 0 0">One request costs about <b>${money(avg.usd)}</b> ${avg.learned?'(your average so far)':'(a first guess until a few requests have run)'} with <b>${esc(tier)}</b> and web search <b>${S.settings.aiWeb==='off'?'off':'on'}</b>; change both on the General tab. These totals count what this project sent; your Anthropic console has the bill.</p>`}
function costLive(){const el=$('#ai-cost');if(el)el.innerHTML=costHTML()}
ACT.aiCostReset=async()=>{if(!await ask('Reset the cost counters?','The session, month and all-time totals go back to $0. Your Anthropic bill is not affected.','Reset'))return;
  S.settings.aiSpend={usd:0,requests:0,input:0,output:0,searches:0,months:{},since:Date.now()};S.ui.ai.cost=null;saveSettings();rerender()};

/* ---- the five tabs ---- */
const aiPurpose=t=>`<p class="purpose">${t}</p>`;
const AI_TAB_HTML={
 general(){const ts=teamsArr().filter(t=>!t.sameAs);const ps=aiPlayers();const empty=ts.filter(t=>!(t.players||[]).length).length,short=ts.filter(t=>(t.players||[]).length&&(t.players||[]).length<15).length;
  const unr=ps.filter(unrated).length;const rev=Object.values(S.pending).reduce((a,b)=>a+(b.items||[]).length,0);const wait=jobsArr().filter(j=>j.status==='queued').length;
  const web=window.claude&&window.claude.standalone;
  const kpi=(n,l,tab,hint)=>tab==='stats'&&!aiAdmin()?`<div class="kpi"><span>${l}</span><b>${n}</b><small>${esc(n?'Running in the background':'Queue is empty')}</small></div>`
    :`<button class="kpi kbtn" ${tab?`data-act="aiTab" data-tab="${tab}"`:'data-act="go" data-to="review"'}><span>${l}</span><b>${n}</b><small>${esc(hint)}</small></button>`;
  return `${seasonNote()}
   <h2 style="margin-top:0">At a glance</h2>${aiPurpose('What your project holds and what is waiting; click a box to go to its tab.')}<div class="kpis">
    ${kpi(compsArr().length,'Competitions','comps','Build or refresh leagues and cups')}
    ${kpi(ts.length,'Teams','teams',empty+' without players, '+short+' under 15')}
    ${kpi(ps.length,'Players','players',unr+' without ratings')}
    ${kpi(wait,'Jobs waiting','stats',wait?'Progress and queue':'Queue is empty')}
    ${kpi(rev,'To review','','Changes waiting in Process and Review')}</div>
   <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>Claude settings</h3>${aiPurpose('Choose how thoroughly Claude works and whether it checks the web for the latest news.')}
     ${aiAdmin()?`<div class="form"><label class="f">Effort<select data-ais="aiTier">${opts([['complex','Thorough: Opus, best ratings'],['default','Balanced: Sonnet'],['quick','Fast: Haiku, rougher ratings']],S.settings.aiTier||'complex')}</select></label>
     ${web?`<label class="f">Web search<select data-ais="aiWeb">${opts([['on','On: when Claude\'s own knowledge falls short'],['off','Off: Claude\'s own knowledge only']],S.settings.aiWeb||'on')}</select></label>`:''}</div>`
     :`<p class="small">Set by the site's admin for every member and visitor${siteInfo().memberTier?': <b>'+esc(TIER_LABEL[siteInfo().memberTier]||siteInfo().memberTier)+'</b>, web search <b>'+(siteInfo().memberWeb?'on':'off')+'</b>':''}.</p>`}
     <p class="small muted" style="margin:10px 0 0">Season <b>${esc(S.settings.season)}</b> (set in <a href="#settings">Settings</a>; it rolls over on 1 September). ${web&&S.settings.aiWeb!=='off'?'Claude answers from its own knowledge first, and searches the web (the eFootball database on PES Master, official team and league sites, Transfermarkt, Wikipedia) only when that falls short.':'Claude\'s knowledge stops at its training date, so very recent transfers or manager changes can be missing; check those teams before applying.'}</p></div>
    <div class="card"><h3>Where data comes from</h3>${aiPurpose('Which source fills which data, and whether the free databases are tried before Claude.')}
     ${efAvailable()?`<label class="c"><input type="checkbox" data-act="efFirst" ${S.settings.efFirst!==false?'checked':''}> <span>Look in the free databases first; Claude only fills what they don't have</span></label>`:''}
     <ul class="srcs">
      ${[['Players of a team',FREE_SQUAD_ORDER],...ART_OPTS.map(o=>[o[1],o[2]]),['The club a player is at','eFootball by his game ID, then Transfermarkt by name and age'],['The league of a team','Transfermarkt']].map(([what,order])=>`<li>${srcTag(false)} <span><b>${what}</b>: ${esc(order)}</span></li>`).join('')}
      <li>${srcTag(true)} <span><b>Claude</b>: only what the lists above leave open, plus kits and whole new competitions</span></li></ul>
     ${efAvailable()?'<button class="sm ghost" data-act="efRefreshIndex" title="Re-read the eFootball league pages">Refresh eFootball team list</button>':'<p class="small muted">The free databases are reached through the site\'s server: open the studio from start.bat or the website.</p>'}</div>
   </div>`},
 comps(pre){const running=S.ui.ai.running;const ef=efAvailable();
  if(pre.compId&&S.comps[pre.compId]&&S.ui.aiCompPre!==pre){S.ui.aiCompPre=pre;S.ui.aiCompMode='existing';S.ui.aiCompSel=pre.compId}
  const mode=S.ui.aiCompMode||'existing';const sel=S.comps[S.ui.aiCompSel]?S.ui.aiCompSel:'';
  const rows=compsArr().map(c=>{const m=compMembers(c).filter(t=>!t.sameAs);const no=m.filter(t=>!(t.players||[]).length).length;
    return `<tr><td style="width:40px">${slotThumb(c,'emblem',c.emblem)}</td><td><b>${esc(c.name)}</b><div class="small muted">${esc(c.country||'—')} · ${esc(c.type)}</div></td><td>${m.length}</td><td>${no?`<span style="color:var(--warn)">${no}</span>`:'0'}</td>
     <td class="acts">${ef?`<button class="sm" data-act="compPull" data-id="${c.id}" title="Players, crests, coaches and stadiums from the free sources, in order: FIFA for World Cup teams, eFootball, Transfermarkt, EA SPORTS FC, TheSportsDB, Wikidata. Goes to Process and Review">Pull from free sources</button>`:''}<button class="sm" data-act="aiCompCheck" data-id="${c.id}" title="Ask Claude which teams play in it this season">Check teams</button><button class="sm ghost" data-act="aiCompPick" data-id="${c.id}" title="Choose it in Update or add a competition">Update with Claude…</button></td></tr>`}).join('');
  return `<div class="card" style="margin-bottom:16px"><h3>Every team in a competition ${srcTag(false)}</h3>${aiPurpose('Fill or check all of a competition\'s teams at once.')}
    <p class="small">${ef?'<b>Pull from free sources</b> fills players, crests, coaches and stadiums for all of a competition\'s teams from the free sources. <b>Check teams</b> asks Claude who plays in it this season.':'Pulling from the free databases needs the studio\'s server (start.bat or the website).'}</p>
    ${rows?`<div class="tw"><table><thead><tr><th></th><th>Competition</th><th>Teams</th><th>No players</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="muted small">No competitions yet. Add one below.</p>'}
    <div class="row" style="margin-top:10px"><button class="sm" data-act="go" data-to="compteams">Add or remove teams</button><button class="sm ghost" data-act="go" data-to="competitions">Open Competitions</button></div></div>
   <div class="card ${pre.compName?'hl':''}" id="ai-comp-card" style="margin-bottom:16px"><h3>Update or add a competition ${srcTag(true)}</h3>${aiPurpose('Let Claude list a competition\'s teams for the season, for one of yours or a new one, and optionally draft every team.')}
    <div class="grid g2" style="align-items:start"><div role="radiogroup" aria-label="Which competition" class="modes">
     <label class="c"><input type="radio" name="ai-cmode" value="existing" data-ch="aiCompMode" ${mode==='existing'?'checked':''}> <b>A competition in my project</b></label>
     <fieldset id="ai-cmode-existing" class="pair" ${mode==='existing'?'':'disabled'}><legend class="sr">A competition in my project</legend><div class="form">
      <label class="f">Competition<select id="ai-csel">${opts([['',compsArr().length?'Choose a competition… ('+compsArr().length+')':'No competitions yet'],...compsArr().map(c=>[c.id,compOptLabel(c)])],sel)}</select></label></div></fieldset>
     <label class="c"><input type="radio" name="ai-cmode" value="new" data-ch="aiCompMode" ${mode==='new'?'checked':''}> <b>A new competition</b></label>
     <fieldset id="ai-cmode-new" class="pair" ${mode==='new'?'':'disabled'}><legend class="sr">A new competition</legend><div class="form">
      <label class="f">Competition name<input id="ai-comp" type="text" value="${esc(mode==='new'&&pre.compName&&!pre.compId?pre.compName:'')}" placeholder="e.g. ADNOC Pro League"></label>
      <label class="f">Country / region<input id="ai-ccountry" type="text" value="${esc(mode==='new'&&!pre.compId?pre.country||'':'')}"></label>
      <label class="c"><input type="checkbox" id="ai-cown" data-ch="aiCompOwn" ${S.ui.aiCompOwn?'checked':''}> <span>Will provide my own file <span class="muted small">(a web-search command and Import update files instead of Claude drafting it)</span></span></label></div></fieldset></div>
     <div><p class="small" style="margin:0">Season <b>${esc(S.settings.season)}</b> <span class="muted">(from <a href="#settings">Settings</a>)</span></p>
      <h3 style="margin-top:12px">Also</h3><div class="grid" style="gap:6px"><label class="c"><input type="checkbox" id="ai-csquads" checked> Draft every team's players${efOn()?' (free sources first)':''}</label><label class="c"><input type="checkbox" id="ai-cstats" checked> Include player ratings</label></div></div></div>
    <div class="row" style="margin-top:12px"><button class="primary" id="ai-run-comp" data-act="aiRunComp" ${running?'disabled':''}>${mode==='new'?'Draft new competition':'Update this competition'}</button></div></div>
   <div class="card"><h3>Search for competitions</h3>${aiPurpose('Find a league to add, see whether you already have it, and look up this season\'s international competitions.')}
    <div class="row" style="align-items:flex-end;gap:10px"><label class="f" style="flex:1;margin:0">League or country<input id="ai-csearch" type="search" data-in="aiCompQ" value="${esc(S.ui.aiCompQ||'')}" placeholder="e.g. Saudi, LaLiga, Brazil"></label>
     <button data-act="intlSearch">${srcTag(true)} Search international competitions</button></div>
    <div id="ai-csresults" style="margin-top:10px">${aiCompSearchHTML()}</div></div>`},
 teams(pre){const running=S.ui.ai.running;const ef=efAvailable();const mode=pre.newTeam?'new':S.ui.aiTeamMode||'existing';
  const seasonTxt=`<p class="small" style="margin:12px 0 0">Season <b>${esc(S.settings.season)}</b> <span class="muted">(from <a href="#settings">Settings</a>)</span></p>`;
  const boxes=cls=>`<div class="grid" style="gap:6px">${AI_PARTS.map(([k,l])=>`<label class="c"><input type="checkbox" class="${cls}" value="${k}" ${AI_PARTS_ON.has(k)?'checked':''}> ${l}</label>`).join('')}</div>`;
  const newComp=S.comps[S.ui.aiTeamComp]?S.ui.aiTeamComp:'';
  return `<div class="card" style="margin-bottom:16px"><h3>From the free databases ${srcTag(false)}</h3>${aiPurpose('Pull players, coaches and stadiums from the free sources; crests and logos are on the Logos & kits tab.')}
    ${ef?`<label class="f" style="max-width:360px">Teams<select id="ef-scope"><option value="empty">Teams without players</option><option value="short">Teams under 15 players</option><option value="all">All teams</option>${opts(compsArr().map(c=>[c.id,c.name]))}</select></label>
     <fieldset class="freeopts"><legend class="sr">What to fill</legend>${EF_FREE_OPTS.map(([k,l,h])=>`<label class="c"><input type="checkbox" class="ef-opt" value="${k}" data-ch="efOptCh" ${efFreeOpts().has(k)?'checked':''}> <span><b>${l}</b> <span class="muted">· ${esc(h)}</span></span></label>`).join('')}</fieldset>
     <div class="row" style="margin-top:10px"><button class="primary" id="ef-run" data-act="efFreeRun" ${efFreeOpts().size?'':'disabled'}>Pull from free sources</button></div>
    <p class="small muted" style="margin:10px 0 0">One job per team; each takes a few seconds. Results go to Process and Review.</p>`:'<p class="small muted">Available when the studio runs from its own server (start.bat or the website).</p>'}</div>
   <div class="grid g2">
   <div class="card ${pre.teamId||pre.newTeam?'hl':''}"><h3>Update one team ${srcTag(true)}</h3>${aiPurpose('Refresh one of your teams, or draft a team that isn\'t in your project yet.')}
    <div role="radiogroup" aria-label="Which team" class="modes">
     <label class="c"><input type="radio" name="ai-mode" value="existing" data-ch="aiTeamMode" ${mode==='existing'?'checked':''}> <b>A team in my project</b></label>
     <fieldset id="ai-mode-existing" class="pair" ${mode==='existing'?'':'disabled'}><legend class="sr">A team in my project</legend><div class="form">
      <label class="f">Competition<select id="ai-tcomp" data-ch="aiTeamComp">${aiTeamCompOpts(pre.teamId)}</select></label>
      <label class="f">Team<select id="ai-team">${aiTeamOpts(pre.teamId)}</select></label></div></fieldset>
     <label class="c"><input type="radio" name="ai-mode" value="new" data-ch="aiTeamMode" ${mode==='new'?'checked':''}> <b>A new team</b></label>
     <fieldset id="ai-mode-new" class="pair" ${mode==='new'?'':'disabled'}><legend class="sr">A new team</legend><div class="form">
      <label class="f">Team name<input id="ai-newteam" type="text" placeholder="e.g. Al Ain FC"></label>
      <label class="f">Its competition<select id="ai-newcomp"><option value="">Unassigned</option>${opts(compsArr().map(c=>[c.id,c.name]),newComp)}</select></label></div>
      <p class="small muted" style="margin:6px 0 0">A new team always gets its players, ratings, bio, manager and kits.</p></fieldset></div>
    ${seasonTxt}
    <h3 style="margin-top:12px">What to update</h3>${boxes('ai-part')}
    <p class="small muted" style="margin:10px 0 0">${efOn()?'Players, bio and ratings come from the free sources when they have the team; Claude adds manager and kits.':'Every part is drafted by Claude.'}</p>
    <div class="row" style="margin-top:12px"><button class="primary" id="ai-run-team" data-act="aiRunTeam" ${running?'disabled':''}>${mode==='new'?'Draft new team':'Update this team'}</button></div></div>
   <div class="card"><h3>Update all teams in a competition ${srcTag(true)}</h3>${aiPurpose('Queue the same update for every team in a competition, one job per team.')}
    <div class="form"><label class="f">Competition<select id="ai-allcomp" data-ch="aiBatchEst">${opts([['','All teams ('+teamsArr().length+')'],...compsArr().map(c=>[c.id,compOptLabel(c)])],S.ui.aiBatchComp||'')}</select></label></div>
    ${seasonTxt}
    <h3 style="margin-top:12px">What to update</h3>${boxes('ai-bpart')}
    <div class="row" style="margin-top:12px"><button class="primary" data-act="aiRunAllTeams" ${running||!teamsArr().length?'disabled':''}>Queue all teams</button></div></div>
   </div>`},
 players(pre){const running=S.ui.ai.running;const ps=aiPlayers();const sel=pre.players||[];const unr=ps.filter(unrated);const ef=efAvailable();
  const gaps=ps.filter(p=>playerGaps(p).length||(!+p.gameId&&!(p.ted&&+p.ted.pid))).length;
  return `<div class="grid g2">
   <div class="card ${sel.length?'hl':''}"><h3>Ratings with Claude ${srcTag(true)}</h3>${aiPurpose('Give ratings to players the databases don\'t have, or refresh the ratings of players you choose.')}
    ${sel.length?`<p class="small"><b>${sel.length}</b> players selected on the Players page.</p><button class="primary" data-act="aiRunPlayers" ${running?'disabled':''}>Refresh their ratings</button><hr>`:'<p class="small muted">Select players on the <a href="#players">Players</a> page to refresh just their ratings.</p>'}
    <div class="form"><label class="f">Players without ratings in<select id="ai-unr-scope">${opts([['','All competitions'],...compsArr().map(c=>[c.id,c.name])])}</select></label></div>
    <p class="small muted">${unr.length} player${unr.length===1?' has':'s have'} no ratings.</p>
    <button data-act="aiUnrated" ${running||!unr.length?'disabled':''}>Rate players without ratings</button></div>
   <div class="card"><h3>From eFootball ${srcTag(false)}</h3>${aiPurpose('Complete missing player details and game IDs from the eFootball database.')}
    ${ef?`<p class="small"><b>${gaps}</b> players miss age, height, nationality, number, ratings or a game ID.</p><button class="primary" data-act="efHealthFill" ${gaps?'':'disabled'}>Pull from free sources</button>
    <p class="small muted" style="margin:10px 0 0">Matches each player by game ID, or by name in his team at eFootball. Players eFootball doesn't have are left for Claude.</p>`:'<p class="small muted">Available when the studio runs from its own server.</p>'}
    <div class="row" style="margin-top:10px"><button class="sm ghost" data-act="go" data-to="health">Open Health check</button><button class="sm ghost" data-act="go" data-to="players">Open Players</button></div></div></div>`},
 stats(){if(!aiAdmin())return AI_TAB_HTML.general();const a=S.ui.ai;const js=jobsArr();const c=s=>js.filter(j=>j.status===s).length;
  const q=queueHTML().replace('</h2>','</h2>'+aiPurpose('Every job waiting, running, done or failed, with what it cost or is expected to cost.'));
  return `<h2 style="margin-top:0">Progress</h2>${aiPurpose('What is running now, how far it has got and how long is left.')}
   <div class="card"><div class="row" style="flex-wrap:nowrap"><div class="aiprog-slot" style="flex:1">${progHTML()}</div>${a.running?'<button class="danger" data-act="aiCancel">Stop</button>':c('queued')?'<button class="primary" data-act="qResume">Resume queue</button>':''}</div>
    <p class="small muted" style="margin:8px 0 0">${a.running?'Working… you can keep editing on other pages; the blue dot on Stats and on Process and Review shows it.':c('queued')?c('queued')+' jobs are waiting.':'Idle. Start work from the other tabs.'}</p></div>
   <div class="row" style="margin-top:20px"><h2 style="margin:0">Cost</h2><span class="spacer"></span><button class="sm ghost" data-act="aiCostReset">Reset counters</button></div>${aiPurpose('What Claude has cost so far, and what the waiting jobs are expected to cost.')}
   <div id="ai-cost">${costHTML()}</div>
   <h2>Cost guide</h2>${aiPurpose('What each kind of work costs, so you can plan bigger runs.')}${costGuideHTML()}
   ${q}
   <h2>Log</h2>${aiPurpose('Step-by-step notes from the jobs, newest at the bottom.')}<div class="log" id="ai-log">${esc(a.log.join('\n')||'Results and notes appear here.')}</div>`}
};
// prices, request counts per kind of job, and what typical runs on this project would cost
function costGuideHTML(){const avg=aiAvgUsd();const tier=S.settings.aiTier||'complex';const [pi,po]=AI_PRICE[AI_TIER_PRICE[tier]];
  const ps=aiPlayers();const unr=ps.filter(unrated).map(p=>p.id);const ts=teamsArr().filter(t=>!t.sameAs);const noSquad=ts.filter(t=>!(t.players||[]).length);
  const row=(what,jobs,note)=>{const e=aiEstimate(jobs);const n=Math.ceil(e.requests);return `<tr><td>${what}</td><td>${n?n+' request'+(n===1?'':'s'):'none'}</td><td style="text-align:right;white-space:nowrap">${n?estRange(e):'free'}</td><td class="small muted">${note||''}</td></tr>`};
  const avgTeam=ts.find(t=>(t.players||[]).length)||{players:Array(25)};
  return `<div class="grid g2">
   <div class="card"><h3>Prices</h3>${aiPurpose('What Anthropic charges for each effort setting.')}
    <table><tbody>
     <tr${tier==='complex'?' class="on"':''}><td>Thorough (Opus)</td><td>$4 in / $20 out</td><td class="small muted">per million tokens</td></tr>
     <tr${tier==='default'?' class="on"':''}><td>Balanced (Sonnet)</td><td>$2 in / $10 out</td><td class="small muted">about half of Opus</td></tr>
     <tr${tier==='quick'?' class="on"':''}><td>Fast (Haiku)</td><td>$0.10 in / $0.50 out</td><td class="small muted">cheapest, rougher ratings</td></tr>
     <tr><td>Web search</td><td>about $0.01</td><td class="small muted">per search; a request with web search usually makes a few</td></tr>
     <tr><td>Free databases</td><td>$0</td><td class="small muted">eFootball, Transfermarkt, TheSportsDB, Wikidata</td></tr></tbody></table>
    <p class="small muted" style="margin:10px 0 0">One Claude request costs about <b>${money(avg.usd)}</b> now (${avg.learned?'your average so far':'a first guess until a few requests have run'}). Current setting: ${esc({complex:'Thorough',default:'Balanced',quick:'Fast'}[tier])}, web search ${S.settings.aiWeb==='off'?'off':'on'}.</p></div>
   <div class="card"><h3>Typical work on this project</h3>${aiPurpose('Expected requests and cost for common jobs, with your current settings.')}
    <table><thead><tr><th>Job</th><th>Claude</th><th style="text-align:right">Cost</th><th></th></tr></thead><tbody>
     ${row('One team: default update',[{type:'team',teamId:'',virtual:avgTeam,parts:[...AI_PARTS_ON]}],efOn()?'players from the free sources when they have the team':'')}
     ${row('One team: ratings refreshed',[{type:'ratings',ids:Array((avgTeam.players||[]).length||25).fill(0)}],'one request per 6 players')}
     ${row('A new team',[{type:'team',virtual:{players:[]},parts:['roster','newStats','manager','kits','bio']}])}
     ${row('A whole league with players',[{type:'comp',squads:true,stats:true}],'about 18 teams')}
     ${row('Check a competition\'s teams',[{type:'compCheck'}])}
     ${row('Kits for one team',[{type:'kits'}])}
     ${row(`Rate the ${unr.length} players without ratings`,[{type:'ratings',ids:unr}],'one request per 6 players')}
     ${row(`Players for the ${noSquad.length} teams without players`,noSquad.map(t=>({type:'team',teamId:t.id,parts:['roster','newStats','bio']})),efOn()?'free when eFootball has them':'')}
     ${row('Pull from free sources: players, crests, coaches, stadiums',[{type:'compPull'}],'free sources')}</tbody></table>
    <p class="small muted" style="margin:10px 0 0">Ranges run from 0.6× to 1.6× the average request. Batch runs show their own estimate before they start.</p></div></div>`}
// Competitions tab: update one of yours or draft a new one (same pattern as Teams & squads), and search known leagues
CH.aiCompMode=el=>{const m=el.value;S.ui.aiCompMode=m;const ex=$('#ai-cmode-existing'),nw=$('#ai-cmode-new');if(ex)ex.disabled=m!=='existing';if(nw)nw.disabled=m!=='new';
  const b=$('#ai-run-comp');if(b)b.textContent=m==='new'?'Draft new competition':'Update this competition';const f=m==='new'?$('#ai-comp'):$('#ai-csel');if(f)f.focus()};
function aiCompSetMode(m){const r=document.querySelector(`input[name=ai-cmode][value=${m}]`);if(r){r.checked=true;CH.aiCompMode(r)}const card=$('#ai-comp-card');if(card)card.scrollIntoView({behavior:'smooth',block:'start'})}
ACT.aiCompPick=el=>{const c=S.comps[el.dataset.id];if(!c)return;S.ui.aiCompSel=c.id;aiCompSetMode('existing');const s=$('#ai-csel');if(s){s.value=c.id;s.focus()}};
ACT.aiRunComp=()=>{const mode=($('input[name=ai-cmode]:checked')||{}).value||'existing';const season=S.settings.season;const squads=$('#ai-csquads').checked,stats=$('#ai-cstats').checked;
  if(mode==='existing'){const c=S.comps[$('#ai-csel').value];if(!c){toast('Choose a competition','err');$('#ai-csel').focus();return}S.ui.aiCompSel=c.id;
    queueAdd([{type:'comp',name:c.name,country:c.country||'',compId:c.id,season,squads,stats,label:c.name}]);toast('Queued '+c.name+'. Results go to Process and Review.','ok');return}
  const name=$('#ai-comp').value.trim();if(!name){toast('Type the competition\'s name','err');$('#ai-comp').focus();return}
  const have=matchComp(name);if(have&&norm(have.name)===norm(name)){toast(have.name+' is already in your project: updating it instead','');S.ui.aiCompSel=have.id;aiCompSetMode('existing');$('#ai-csel').value=have.id;return}
  queueAdd([{type:'comp',name,country:$('#ai-ccountry').value.trim(),season,squads,stats,label:name}]);toast('Queued '+name+'. Results go to Process and Review.','ok')};
// known leagues (the same list as Competitions' templates), marked when the project already has them
function aiCompSearchHTML(){const q=norm(S.ui.aiCompQ||'');if(!q)return'<p class="small muted" style="margin:0">Type part of a league\'s name or a country.</p>';
  const hits=COMP_TEMPLATES.map((t,i)=>({t,i})).filter(({t})=>norm(t[0]).includes(q)||norm(t[1]).includes(q)).slice(0,12);
  const exact=COMP_TEMPLATES.some(t=>norm(t[0])===q)||compsArr().some(c=>norm(c.name)===q);
  const row=({t,i})=>{const have=compsArr().find(c=>norm(c.name)===norm(t[0])||nameScore(c.name,t[0])===1);
    return `<tr><td><b>${esc(t[0])}</b><div class="small muted">${esc(t[1])} · ${esc(t[2])}</div></td><td>${have?`<span class="small" style="color:var(--good)">In your project</span>`:'<span class="small muted">Not in your project</span>'}</td>
     <td class="acts">${have?`<button class="sm" data-act="aiCompPick" data-id="${have.id}">Select</button>`:`<button class="sm" data-act="aiCompUse" data-i="${i}">Use</button>`}</td></tr>`};
  return (hits.length?`<div class="tw"><table><tbody>${hits.map(row).join('')}</tbody></table></div>`:'<p class="small muted" style="margin:0">No known league matches.</p>')+
    (!exact?`<div class="row" style="margin-top:8px"><button class="sm ghost" data-act="aiCompUseQ">Use “${esc(S.ui.aiCompQ.trim())}” as a new competition</button></div>`:'')}
IN.aiCompQ=el=>{S.ui.aiCompQ=el.value;const r=$('#ai-csresults');if(r)r.innerHTML=aiCompSearchHTML()};
ACT.aiCompUse=el=>{const t=COMP_TEMPLATES[+el.dataset.i];if(!t)return;aiCompSetMode('new');$('#ai-comp').value=t[0];$('#ai-ccountry').value=t[1];$('#ai-comp').focus()};
ACT.aiCompUseQ=()=>{const q=(S.ui.aiCompQ||'').trim();if(!q)return;aiCompSetMode('new');$('#ai-comp').value=q;$('#ai-ccountry').value='';$('#ai-ccountry').focus()};
// Teams & squads → From the free databases: choose what to fill, then run it for the chosen teams
const EF_FREE_OPTS=[['squads','Players','FIFA for World Cup national teams, eFootball, then Transfermarkt; EA SPORTS FC fills missing details and ratings'],['tm','Coaches & stadiums','Transfermarkt, for teams that miss them']];
const efFreeOpts=()=>S.ui.efOpts||(S.ui.efOpts=new Set(['squads','tm']));
CH.efOptCh=()=>{S.ui.efOpts=new Set($$('.ef-opt').filter(c=>c.checked).map(c=>c.value));const b=$('#ef-run');if(b)b.disabled=!S.ui.efOpts.size};
ACT.efFreeRun=async()=>{if(!efAvailable()){toast('The free databases are reached through the site\'s server: open the studio from start.bat or the website.','err');return}
  const opts=efFreeOpts();if(!opts.size)return;const v=($('#ef-scope')||{}).value||'empty';const c=S.comps[v];
  const ts=teamsArr().filter(t=>!t.sameAs&&(v==='all'||(v==='empty'?!(t.players||[]).length:v==='short'?(t.players||[]).length<15:c?compMembers(c).includes(t):false)));
  const scopeLbl=v==='empty'?'teams without players':v==='short'?'teams under 15':v==='all'?'all teams':c?c.name:'';
  const jobs=[];const done=[];
  if(opts.has('squads')&&ts.length){jobs.push(...ts.map(t=>({type:'free',teamId:t.id,label:'Free sources: '+t.name})));done.push(ts.length+' team'+(ts.length===1?'':'s'))}
  if(opts.has('images')){const it=ts.filter(t=>(missCrest(t)&&!isNationalTeam(t))||missCoach(t));
    const cs=(c?[c]:compsArr()).filter(x=>missLogo(x)&&!x.worldCup);const ch=[];for(let i=0;i<it.length;i+=40)ch.push(it.slice(i,i+40).map(t=>t.id));
    ch.forEach((g,i)=>jobs.push({type:'efImages',teamIds:g,compIds:i===0?cs.map(x=>x.id):[],label:'Free sources: crests, coaches & logos '+(i+1)+'/'+ch.length}));
    if(!ch.length&&cs.length)jobs.push({type:'efImages',teamIds:[],compIds:cs.map(x=>x.id),label:'Free sources: league logos'});
    if(it.length||cs.length)done.push(it.length+' crest/coach look-up'+(it.length===1?'':'s')+(cs.length?', '+cs.length+' league logo'+(cs.length===1?'':'s'):''))}
  if(opts.has('tm')){const tt=ts.filter(t=>!isNationalTeam(t)&&(!(t.manager&&t.manager.name)||!t.stadium));for(let i=0;i<tt.length;i+=60)jobs.push({type:'tmInfo',teamIds:tt.slice(i,i+60).map(t=>t.id),label:'Free sources: coaches & stadiums '+(Math.floor(i/60)+1)});
    if(tt.length)done.push(tt.length+' coach/stadium look-up'+(tt.length===1?'':'s'))}
  if(!jobs.length){toast(ts.length?'Nothing missing for '+scopeLbl:'No teams in '+scopeLbl,'ok');return}
  queueAdd(jobs);toast('Queued '+done.join(', ')+' for '+scopeLbl+'. Results go to Process and Review.','ok')};
// Teams & squads: pick a competition first, then one of its teams (league clubs and cup participants)
function aiTeamCompOpts(teamId){const t=S.teams[teamId];if(t)S.ui.aiTeamComp=t.compId||'__none';const v=S.ui.aiTeamComp||'';
  const none=teamsArr().some(x=>!S.comps[x.compId]);
  return opts([['','All competitions'],...compsArr().map(c=>[c.id,compOptLabel(c)]),...(none?[['__none','Not in a competition']]:[])],v)}
function aiTeamList(){const v=S.ui.aiTeamComp||'';const c=S.comps[v];
  const ts=v==='__none'?teamsArr().filter(inNoComp):c?compMembers(c):teamsArr();return ts.slice().sort((a,b)=>a.name.localeCompare(b.name))}
function aiTeamOpts(sel){const ts=aiTeamList();return opts([['',ts.length?'Choose a team… ('+ts.length+')':'No teams in this competition'],...ts.map(t=>[t.id,t.name])],sel||'')}
CH.aiTeamComp=el=>{S.ui.aiTeamComp=el.value;const t=$('#ai-team');if(!t)return;const keep=t.value;t.innerHTML=aiTeamOpts(aiTeamList().some(x=>x.id===keep)?keep:'');
  t.focus()};
ACT.aiCompCheck=el=>{const c=S.comps[el.dataset.id];if(!c)return;queueAdd([{type:'compCheck',compId:c.id,season:S.settings.season,label:'Teams: '+c.name}]);toast('Queued a team check for '+c.name,'ok')};
ACT.aiUnrated=async()=>{const cid=($('#ai-unr-scope')||{}).value||'';const inC=cid&&S.comps[cid]?new Set(compMembers(S.comps[cid]).map(t=>t.id)):null;const ids=[];
  teamsArr().forEach(t=>{if(inC&&!inC.has(t.id))return;(t.players||[]).forEach(p=>{if(unrated(p))ids.push(p.id)})});
  if(!ids.length){toast('Every player there has ratings','ok');return}const jobs=[];for(let i=0;i<ids.length;i+=60)jobs.push({type:'ratings',ids:ids.slice(i,i+60),season:S.settings.season,label:'Ratings '+(i+1)+'–'+Math.min(i+60,ids.length)+' of '+ids.length});
  const e=aiEstimate(jobs);if(!await ask('Rate '+ids.length+' players?',`That is ${estAsk(e)}. Results go to Process and Review.`,'Queue them'))return;
  queueAdd(jobs);if(aiAdmin())S.ui.aiTab='stats';rerender()};
// settings changed on the General tab
document.addEventListener('change',e=>{const el=e.target;if(el&&el.dataset&&el.dataset.ais){if(!aiAdmin()){toast('Only the site\'s admin can change this','err');rerender();return}S.settings[el.dataset.ais]=el.value;saveSettings();toast('Saved','ok');rerender()}});
// Teams & squads: one team (in the project, or a new one) and a whole competition, each with its own "What to update"
const AI_PARTS=[['roster','Player changes (new arrivals and departures)'],['transfers','Detect transfers between my teams'],['newStats','Ratings for new players'],['refreshStats','Refresh ratings of existing players'],['bio','Age, height, weight, nationality, number'],['styles','Positions, playing style, skills'],['manager','Manager, formation, playstyle'],['kits','Kit colours, sponsors, stadium, team colours'],['crest','Team crest (latest logo from FootyLogos)']];
const AI_PARTS_ON=new Set(['roster','transfers','newStats','bio','manager','kits','crest']);
const checkedParts=cls=>$$('.'+cls).filter(c=>c.checked).map(c=>c.value);
CH.aiTeamMode=el=>{const m=el.value;S.ui.aiTeamMode=m;const ex=$('#ai-mode-existing'),nw=$('#ai-mode-new');if(ex)ex.disabled=m!=='existing';if(nw)nw.disabled=m!=='new';
  const b=$('#ai-run-team');if(b)b.textContent=m==='new'?'Draft new team':'Update this team';const f=m==='new'?$('#ai-newteam'):$('#ai-tcomp');if(f)f.focus()};
const aiBatchList=()=>{const cid=($('#ai-allcomp')||{}).value||S.ui.aiBatchComp||'';const c=S.comps[cid];return(c?compMembers(c):teamsArr()).filter(t=>!t.sameAs)};
function aiBatchEstText(){const list=aiBatchList();const parts=$$('.ai-bpart').length?checkedParts('ai-bpart'):[...AI_PARTS_ON];
  return list.length?`${list.length} team${list.length===1?'':'s'}: ${estLine(list.map(t=>({type:'team',teamId:t.id,parts})))}.`:'No teams in this competition.'}
CH.aiBatchEst=el=>{if(el.id==='ai-allcomp')S.ui.aiBatchComp=el.value;const p=$('#ai-batch-est');if(p)p.innerHTML=aiBatchEstText()};
ACT.aiRunTeam=()=>{const parts=checkedParts('ai-part');const season=S.settings.season;const mode=($('input[name=ai-mode]:checked')||{}).value||'existing';
  if(mode==='new'){const nn=$('#ai-newteam').value.trim();if(!nn){toast('Type the new team\'s name','err');$('#ai-newteam').focus();return}
    const v=newTeam({name:nn,short:shortName(nn),compId:$('#ai-newcomp').value});queueAdd([{type:'team',virtual:v,parts:[...new Set([...parts,'roster','newStats','manager','kits','bio'])],season,label:nn}]);toast('Queued '+nn+'. Results go to Process and Review.','ok');return}
  const tid=$('#ai-team').value;if(!S.teams[tid]){toast('Choose a team','err');$('#ai-team').focus();return}
  if(!parts.length){toast('Tick at least one thing to update','err');return}
  queueAdd([{type:'team',teamId:tid,parts,season,label:S.teams[tid].name}]);toast('Queued '+S.teams[tid].name+'. Results go to Process and Review.','ok')};
ACT.aiRunAllTeams=async()=>{const parts=checkedParts('ai-bpart');const list=aiBatchList();if(!list.length){toast('No teams in this competition','err');return}
  if(!parts.length){toast('Tick at least one thing to update','err');return}const c=S.comps[($('#ai-allcomp')||{}).value];
  const e=aiEstimate(list.map(t=>({type:'team',teamId:t.id,parts})));
  if(!await ask('Queue '+list.length+' teams'+(c?' in '+c.name:''),`Each team becomes a job in the queue, which keeps going while you work, picks up after a reload and retries when Claude is busy. Season ${esc(S.settings.season)}.<br><br>Estimated: ${estAsk(e)}${efOn()?' (teams from the free sources cost nothing; teams they miss cost more)':''}.`,'Queue them'))return;
  queueAdd(list.map(t=>({type:'team',teamId:t.id,parts,season:S.settings.season,label:t.name})))};
// each job row shows what it cost, or what it is expected to cost
{const _row=jobRowHTML;jobRowHTML=j=>{const h=_row(j);if(!aiAdmin())return h;const n=jobRequests(j);
  const cost=j.cost?money(j.cost):n&&(j.status==='queued'||j.status==='running')?'≈ '+money(n*aiAvgUsd().usd):!n?'free':'';
  return h.replace(/<\/tr>$/,`<td class="small muted" style="text-align:right;white-space:nowrap">${cost}</td></tr>`)}}
/* ================= Live Update → Logos & kits =================
   Free sources first, each item trying them in order of image quality and stopping at the first that has it:
   team crests: FootyLogos (1500 px) → TheSportsDB (512 px) → Wikimedia Commons → football-logos on GitHub (139 × 181) → eFootball (128 px);
   national teams take their flag. Competition logos: FootyLogos → TheSportsDB (by name, or through its teams) → Wikimedia → eFootball.
   Coaches: eFootball (name and photo) → Transfermarkt → Wikidata. Stadiums: TheSportsDB → Transfermarkt → Wikidata.
   Claude helps only with what they miss (FootyLogos names, designed crests) and with kits. */
const ART_OPTS=[['crests','Team crests','FootyLogos, then TheSportsDB, Wikimedia Commons, football-logos (GitHub), eFootball; national teams get their flag'],
  ['logos','Competition logos','FootyLogos, then TheSportsDB, Wikimedia Commons, eFootball'],
  ['coaches','Coaches','eFootball (name and photo), then Transfermarkt, Wikidata'],
  ['stadiums','Stadiums','TheSportsDB, then Transfermarkt, Wikidata'],
  ['colours','Team colours','TheSportsDB, for teams still on the default colours']];
const artOpts=()=>S.ui.artOpts||(S.ui.artOpts=new Set(['crests','logos','coaches','stadiums']));
const artScopeOpts=v=>opts([['','All competitions'],...compsArr().map(c=>[c.id,compOptLabel(c)]),...(teamsArr().some(inNoComp)?[['__none','Teams without a competition']]:[])],v||'');
function artTargets(scope){const c=S.comps[scope];
  const ts=(scope==='__none'?teamsArr().filter(inNoComp):c?compMembers(c):teamsArr()).filter(t=>!t.sameAs);
  const cs=scope==='__none'?[]:c?[c]:compsArr();return{ts,cs}}
const artNeedImg=(x,which)=>logoWanted(x,which);
const DEFAULT_COLOURS=['#1f4fd1','#ffffff'];
const artDefaultColours=t=>!(t.colors||[]).length||(t.colors||[]).join('|').toLowerCase()===DEFAULT_COLOURS.join('|');
const enc=encodeURIComponent;
async function artImg(url,kind,label,signal){const r=await fetch(url,{signal});if(!r.ok)throw new Error('image '+r.status);let b=await r.blob();if(/svg/.test(b.type))b=await flFix(b);return addImageFromBlob(b,kind,label)}
// look-ups shared by the steps for one team, so each source is asked once
async function artTsdb(x,signal,st){const k='t:'+x.id;if(!(k in st.c)){const r=await fetch('api/tsdb/find?name='+enc(x.name),{signal});const o=await r.json().catch(()=>({}));st.c[k]=r.ok?o.team||null:null}return st.c[k]}
async function artWd(x,kind,signal,st){const k='w:'+kind+':'+x.id;if(k in st.c)return st.c[k];if(st.wdBusy)return null;
  const r=await fetch('api/wd/find?name='+enc(x.name)+'&kind='+kind+(kind!=='national'&&x.country?'&country='+enc(x.country):''),{signal});const o=await r.json().catch(()=>({}));
  if(r.status===429){st.wdBusy=true;aiLog('  Wikidata: '+(o.error||'busy')+'; skipping it for the rest of this job');return null}return st.c[k]=r.ok?o.item||null:null}
async function artEf(x,signal,st){const k='e:'+x.id;if(!(k in st.c)){let info=null;try{const ef=await efTeamFor(x,signal);if(ef){info=await efApi('team?team='+ef.id,signal);info.efId=ef.id}}catch(e){if(e.name==='AbortError')throw e}st.c[k]=info}return st.c[k]}
async function artTm(x,signal,st){const k='m:'+x.id;if(!(k in st.c)){let d=null;try{const c=await tmClubFor(x,signal);if(c)d=await tmApi('squad?club='+c.id,signal)}catch(e){if(e.name==='AbortError')throw e}st.c[k]=d}
  const d=st.c[k];if(d&&d.club&&d.club.id&&!x.tmId)x.tmId=d.club.id;return d}
async function artFirst(steps){for(const [src,fn] of steps){try{if(await fn())return src}catch(e){if(e.name==='AbortError')throw e}}return null}
const artCrest=(x,signal,st)=>isNationalTeam(x)?artFirst([['flag',async()=>!!(await flagAttach(x,signal))]]):artFirst([
  ['FootyLogos',async()=>{if(!flAvailable())return false;const f=await flFind(x.name,'emblem',x.country,[],signal);if(!f.found)return false;x.emblem=(await addImageFromBlob(await flDownload(f,signal),'emblem',x.name+' crest (FootyLogos)')).id;return true}],
  ['TheSportsDB',async()=>{const t=await artTsdb(x,signal,st);if(!t||!t.badge)return false;x.emblem=(await artImg('api/tsdb/image?url='+enc(t.badge),'emblem',x.name+' crest (TheSportsDB)',signal)).id;return true}],
  ['Wikimedia',async()=>{const it=await artWd(x,'club',signal,st);if(!it||!it.logo)return false;x.emblem=(await artImg('api/wd/logo?file='+enc(it.logo),'emblem',x.name+' crest (Wikimedia)',signal)).id;return true}],
  ['football-logos',async()=>{const r=await fetch('api/gh/find?name='+enc(x.name),{signal});const o=await r.json().catch(()=>({}));if(!o.crest)return false;x.emblem=(await artImg('api/image?url='+enc(o.crest.url),'emblem',x.name+' crest (football-logos)',signal)).id;return true}],
  ['eFootball',async()=>{const i=await artEf(x,signal,st);if(!i||!i.crest)return false;x.efId=i.efId;x.emblem=(await addImageFromBlob(await efImage(i.crest,signal),'emblem',x.name+' crest (eFootball)')).id;return true}]]);
const artLogo=(c,signal,st)=>artFirst([
  ['FootyLogos',async()=>{if(!flAvailable())return false;const f=await flFind(c.name,'comp',c.country,[],signal);if(!f.found)return false;c.emblem=(await addImageFromBlob(await flDownload(f,signal),'comp',c.name+' logo (FootyLogos)')).id;return true}],
  ['TheSportsDB',async()=>{const clubs=compMembers(S.comps[c.id]||c).slice(0,5).map(t=>t.name).join('|');
    const r=await fetch('api/tsdb/league?name='+enc(c.name)+'&country='+enc(c.country||'')+'&clubs='+enc(clubs)+'&cup='+(isCupComp(c)?1:0),{signal});const o=await r.json().catch(()=>({}));
    const L=o.league;const u=L&&(L.badge||L.logo);if(!u)return false;c.emblem=(await artImg('api/tsdb/image?url='+enc(u),'comp',c.name+' logo (TheSportsDB)',signal)).id;return true}],
  ['Wikimedia',async()=>{const it=await artWd(c,'comp',signal,st);if(!it||!it.logo)return false;c.emblem=(await artImg('api/wd/logo?file='+enc(it.logo),'comp',c.name+' logo (Wikimedia)',signal)).id;return true}],
  ['eFootball',async()=>{const lid=await efLeagueFor(c,signal);if(lid==null)return false;c.emblem=(await addImageFromBlob(await efImage('/efootball-2022/graphics/leaguelogos/emb_'+String(lid).padStart(4,'0')+'.png',signal),'comp',c.name+' logo (eFootball)')).id;return true}]]);
async function artCoach(x,signal,st){x.manager=x.manager||{name:'',nat:'',age:''};let k=0;const src=[];
  const i=await artEf(x,signal,st);const c=i&&i.coach;if(i&&i.efId&&!x.efId)x.efId=i.efId;
  if(c&&c.photo){if(!x.manager.name){x.manager.name=c.name;k++;src.push('eFootball')}
    if(!x.managerPhoto&&norm(x.manager.name)===norm(c.name)){try{x.managerPhoto=(await addImageFromBlob(await efImage(c.photo,signal),'manager',c.name+' (eFootball)')).id;k++;src.push('eFootball')}catch(e){if(e.name==='AbortError')throw e}}}
  if(!x.manager.name&&!isNationalTeam(x)){const d=await artTm(x,signal,st);if(d&&d.coach){x.manager.name=d.coach;k++;src.push('Transfermarkt')}}
  if(!x.manager.name){const it=await artWd(x,isNationalTeam(x)?'national':'club',signal,st);if(it&&it.coach){x.manager.name=it.coach;k++;src.push('Wikidata')}}
  return{k,src}}
async function artStadium(x,signal,st){const t=await artTsdb(x,signal,st);if(t&&t.stadium){x.stadium=t.stadium;return'TheSportsDB'}
  const d=await artTm(x,signal,st);if(d&&d.stadium){x.stadium=d.stadium;return'Transfermarkt'}
  const it=await artWd(x,'club',signal,st);if(it&&it.stadium){x.stadium=it.stadium;return'Wikidata'}return null}
async function artColours(x,signal,st){const t=await artTsdb(x,signal,st);const cs=((t&&t.colours)||[]).map(v=>String(v).trim()).filter(v=>/^#[0-9a-f]{6}$/i.test(v));
  if(cs.length<2)return null;x.colors=cs.slice(0,2);return'TheSportsDB'}
/* THE BUCKETS. What a team can get from the free sources, by need; each need has one ordered list of sources (ART_OPTS above
   says the order in words, FREE_SQUAD_ORDER the squad's). Every job that needs one of these calls freeFillTeam / artLogo /
   freeSquad: no job asks a source on its own, so no source is ever left out and the order is the same everywhere.
   x is a clone of the team; only what it still misses is looked up. Returns {k: items found, got: ['crest (source)'], src: [sources]}. */
const FREE_SQUAD_ORDER='FIFA for a World Cup national team, then eFootball, Transfermarkt, Wikipedia; EA SPORTS FC fills missing details and ratings';
const freeOrder=need=>need==='squad'?FREE_SQUAD_ORDER:(ART_OPTS.find(o=>o[0]===need)||[])[2]||'';
const freeState=()=>({c:{},wdBusy:false});// one per job: each source is asked once per team, and a busy Wikidata is left alone
async function freeFillTeam(x,needs,signal,st,which){const o=new Set(needs),nat=isNationalTeam(x),got=[],src=[];let k=0;st=st||freeState();
  if(o.has('crests')&&artNeedImg(x,which||'missing')){const s=await artCrest(x,signal,st);if(s){k++;src.push(s);got.push('crest ('+s+')')}}
  if(o.has('coaches')&&missCoach(x)){const r=await artCoach(x,signal,st);if(r.k){k+=r.k;src.push(...r.src);got.push('coach ('+[...new Set(r.src)].join(', ')+')')}}
  if(o.has('stadiums')&&!x.stadium&&!nat){const s=await artStadium(x,signal,st);if(s){k++;src.push(s);got.push('stadium ('+s+')')}}
  if(o.has('colours')&&!nat&&artDefaultColours(x)){const s=await artColours(x,signal,st);if(s){k++;src.push(s);got.push('colours ('+s+')')}}
  return{k,got,src}}
async function runFreeArt(j,signal){const o=new Set(j.opts||[]);const which=j.which||'missing';const inc={},incC={};const st=freeState();let n=0;const by={};
  const note=s=>{if(s)by[s]=(by[s]||0)+1};
  for(const id of j.teamIds||[]){if(signal.aborted)break;const t=S.teams[id];if(!t)continue;const x=clone(t);
    try{const r=await freeFillTeam(x,[...o],signal,st,which);if(r.k){inc[x.id]=x;n+=r.k;r.src.forEach(note);aiLog('  '+t.name+': '+r.got.join(', '))}}
    catch(e){if(e.name==='AbortError')throw e;aiLog('  '+t.name+': '+e.message)}}
  for(const id of j.compIds||[]){if(signal.aborted)break;const c=S.comps[id];if(!c||c.worldCup||!o.has('logos')||!artNeedImg(c,which))continue;const x=clone(c);
    try{const s=await artLogo(x,signal,st);if(s){incC[c.id]=x;n++;note(s);aiLog('  '+c.name+': logo ('+s+')')}else aiLog('  '+c.name+': no logo found')}
    catch(e){if(e.name==='AbortError')throw e;aiLog('  '+c.name+': '+e.message)}}
  const srcs=Object.entries(by).sort((a,b)=>b[1]-a[1]);aiLog('  '+n+' item'+(n===1?'':'s')+' found'+(srcs.length?': '+srcs.map(([s,c])=>s+' '+c).join(', '):''));
  if(n)finishBatch(batchFromData({teams:inc,comps:incC},{title:(j.title||'Logos & kits')+(j.label?': '+j.label:''),source:srcs.map(x=>x[0]).join(', ')||'free databases',removeMissing:false,teamScope:Object.keys(inc)}))}
JOB_RUN.freeArt=async(j,signal)=>{await runFreeArt(j,signal)};
JOB_KIND.freeArt='Logos & kits';
CH.artScope=el=>{S.ui.artScope=el.value;artRunCountShow()};CH.artWhich=el=>{S.ui.artWhich=el.value;artRunCountShow()};
CH.artOptCh=()=>{S.ui.artOpts=new Set($$('.art-opt').filter(c=>c.checked).map(c=>c.value));const b=$('#art-run');if(b)b.disabled=!S.ui.artOpts.size;artRunCountShow()};
// RULE (rule book, "A PES default slot is never missing"): what Run covers, per item, with the same tests as the Missing
// emblems tab; a PES default crest or logo is covered only by "Replace all". The counts are shown under the options.
function artRunTargets(){const o=artOpts();const scope=S.ui.artScope||'';const which=S.ui.artWhich||'missing';const {ts,cs}=artTargets(scope);
  const by={crests:ts.filter(t=>o.has('crests')&&artNeedImg(t,which)),coaches:ts.filter(t=>o.has('coaches')&&missCoach(t)),
    stadiums:ts.filter(t=>o.has('stadiums')&&!t.stadium&&!isNationalTeam(t)),colours:ts.filter(t=>o.has('colours')&&!isNationalTeam(t)&&artDefaultColours(t))};
  const tn=ts.filter(t=>Object.values(by).some(l=>l.includes(t)));const cn=o.has('logos')?cs.filter(c=>!c.worldCup&&artNeedImg(c,which)):[];
  const pes=which==='all'?[...by.crests.filter(pesOwnEmblem),...cn.filter(pesOwnEmblem)].length:0;return{o,scope,which,by,tn,cn,pes}}
const artRunCount=()=>{const {o,by,cn,tn,pes}=artRunTargets();if(!o.size)return'Tick at least one item.';
  const parts=[['crests','team crest','team crests'],['coaches','coach','coaches'],['stadiums','stadium','stadiums'],['colours','team colours','team colours']].filter(([k])=>o.has(k)).map(([k,one,many])=>by[k].length+' '+(by[k].length===1?one:many));
  if(o.has('logos'))parts.push(cn.length+' competition logo'+(cn.length===1?'':'s'));
  return 'Run covers '+tn.length+' team'+(tn.length===1?'':'s')+': '+parts.join(', ')+'.'+(pes?' '+pes+' PES default'+(pes===1?' is':'s are')+' included (slots where the game shows its own) because of "Replace all".':' PES defaults are left out.')};
const artRunCountShow=()=>{const p=$('#art-count');if(p)p.textContent=artRunCount()};
ACT.artRun=async()=>{if(!efAvailable()){toast('The free databases are reached through the site\'s server: open the studio from start.bat or the website.','err');return}
  const {o,scope,which,tn,cn,pes}=artRunTargets();if(!o.size)return;
  if(!tn.length&&!cn.length){toast('Nothing to fill there','ok');return}
  if(which==='all'&&!await ask('Replace all crests and logos?',esc(artRunCount())+'<br><br>Every crest and logo in the selection is looked up again, PES defaults included.','Replace all',true))return;
  const where=S.comps[scope]?S.comps[scope].name:scope==='__none'?'teams without a competition':'all competitions';const jobs=[];
  const groups=chunk(tn,25);if(!groups.length)groups.push([]);
  groups.forEach((g,i)=>jobs.push({type:'freeArt',teamIds:g.map(t=>t.id),compIds:i===0?cn.map(c=>c.id):[],opts:[...o],which,label:where+(groups.length>1?' '+(i+1)+'/'+groups.length:'')}));
  queueAdd(jobs);if(which==='all')S.ui.artWhich='missing';toast('Queued '+tn.length+' team'+(tn.length===1?'':'s')+(cn.length?' and '+cn.length+' competition logo'+(cn.length===1?'':'s'):'')+' ('+where+'). Results go to Process and Review.','ok')};
// Claude: FootyLogos names for what the databases missed, and designed crests
function artClaudeTargets(){const scope=($('#artc-scope')||{}).value??(S.ui.artcScope||'');const {ts,cs}=artTargets(scope);const skip=new Set([...emblemsInReview(),...emblemsQueued()]);
  return{scope,ts:ts.filter(t=>missCrest(t)&&!isNationalTeam(t)&&!skip.has(t.id)),cs:cs.filter(c=>missLogo(c)&&!c.worldCup&&!skip.has(c.id))}}
const artClaudeCount=()=>{const {ts,cs}=artClaudeTargets();return `${ts.length} team${ts.length===1?'':'s'} and ${cs.length} competition${cs.length===1?'':'s'} have no crest or logo yet.`};
CH.artcScope=el=>{S.ui.artcScope=el.value;const p=$('#artc-count');if(p)p.textContent=artClaudeCount()};
ACT.artClaude=async()=>{logoJobsPrune();const {ts,cs}=artClaudeTargets();if(!ts.length&&!cs.length){toast('Every crest and logo there is filled or already waiting in Process and Review','ok');return}
  const design=!!($('#artc-design')||{}).checked;const jobs=[];
  if(cs.length)jobs.push({type:'logos',compIds:cs.map(c=>c.id),teamIds:[],useClaude:true,which:'missing',label:'missing competition logos'});
  chunk(ts,25).forEach((g,i)=>jobs.push({type:'logos',teamIds:g.map(t=>t.id),compIds:[],useClaude:true,design,which:'missing',label:'missing crests '+(i*25+1)+'–'+(i*25+g.length)+' of '+ts.length}));
  const e=aiEstimate(jobs);
  if(!await ask('Find '+(ts.length+cs.length)+' missing logos?',`Claude matches the FootyLogos names of ${ts.length} team${ts.length===1?'':'s'} and ${cs.length} competition${cs.length===1?'':'s'}${design?', and designs an original crest for teams still without one':''}. Only the emblem changes; each new one waits in Process and Review.<br><br>Estimated: ${estAsk(e)}.`,'Queue them'))return;
  queueAdd(jobs)};
// Claude: this season's kits for a competition's teams
// RULE (rule book, "A PES default slot is never missing"): Kits with Claude covers the teams with a kit missing (a slot with no
// image that the team file doesn't leave to the game); "All teams" re-checks every team's kits, PES defaults included.
const kitTargets=()=>{const scope=($('#kit-scope')||{}).value??(S.ui.kitScope||'');const all=(($('#kit-which')||{}).value||S.ui.kitWhich||'missing')==='all';
  const ts=artTargets(scope).ts;return{scope,all,ts:all?ts:ts.filter(missKits),of:ts.length}};
const kitCount=()=>{const {all,ts,of}=kitTargets();return all?ts.length+' team'+(ts.length===1?'':'s')+' (every team there, PES default kits included).':ts.length+' of '+of+' team'+(of===1?'':'s')+' have a kit missing. Kits the option file leaves to the game (PES default) are left out.'};
CH.kitScope=el=>{S.ui.kitScope=el.value;const p=$('#kit-count');if(p)p.textContent=kitCount()};CH.kitWhich=el=>{S.ui.kitWhich=el.value;const p=$('#kit-count');if(p)p.textContent=kitCount()};
ACT.artKits=async()=>{const {scope,ts}=kitTargets();S.ui.kitScope=scope;if(!ts.length){toast('No team there has a kit missing','ok');return}
  const jobs=ts.map(t=>({type:'kits',teamId:t.id,season:S.settings.season,label:'Kits: '+t.name}));const e=aiEstimate(jobs);
  if(!await ask('Check kits for '+ts.length+' team'+(ts.length===1?'':'s')+'?',`Claude checks kit colours, sponsors, stadium and team colours for season ${esc(S.settings.season)}. Results go to Process and Review.<br><br>Estimated: ${estAsk(e)}.`,'Queue them'))return;
  queueAdd(jobs)};
ACT.artGo=el=>{S.ui.studioTab=el.dataset.tab;location.hash='studio'};
AI_TAB_HTML.logos=()=>{const ef=efAvailable();const which=S.ui.artWhich||'missing';
  return `<div class="card" style="margin-bottom:16px"><h3>From the free databases ${srcTag(false)}</h3>${aiPurpose('Fill crests, competition logos, coaches, stadiums and colours, trying each source in order of image quality.')}
    ${ef?`<div class="grid g2" style="gap:10px;max-width:760px"><label class="f">Teams and competitions<select id="art-scope" data-ch="artScope">${artScopeOpts(S.ui.artScope)}</select></label>
     <label class="f">Crests and logos<select id="art-which" data-ch="artWhich">${opts([['missing','Only missing ones'],['notfl','Missing, or not from FootyLogos yet'],['all','Replace all with the latest']],which)}</select></label></div>
    <fieldset class="freeopts"><legend class="sr">What to fill</legend>${ART_OPTS.map(([k,l,h])=>`<label class="c"><input type="checkbox" class="art-opt" value="${k}" data-ch="artOptCh" ${artOpts().has(k)?'checked':''}> <span><b>${l}</b> <span class="muted">· ${esc(h)}</span></span></label>`).join('')}</fieldset>
    <div class="row" style="margin-top:10px"><button class="primary" id="art-run" data-act="artRun" ${artOpts().size?'':'disabled'}>Run</button></div>
    <p class="small" id="art-count" style="margin:10px 0 0">${esc(artRunCount())}</p>
    <p class="small muted" style="margin:6px 0 0">Each item stops at the first source that has it. Results go to Process and Review.</p>`:'<p class="small muted">Available when the studio runs from its own server (start.bat or the website).</p>'}</div>
   <div class="grid g2">
    <div class="card"><h3>Logos with Claude ${srcTag(true)}</h3>${aiPurpose('For crests and logos the free databases couldn\'t find: Claude matches FootyLogos names, and can design an original crest.')}
     <div class="form"><label class="f">Teams and competitions<select id="artc-scope" data-ch="artcScope">${artScopeOpts(S.ui.artcScope)}</select></label></div>
     <label class="c" style="margin-top:10px"><input type="checkbox" id="artc-design"> If none is found, design an original placeholder crest in the team's colours</label>
     <p class="small muted" id="artc-count" style="margin:10px 0 0">${artClaudeCount()}</p>
     <div class="row" style="margin-top:12px"><button class="primary" data-act="artClaude" ${S.ui.ai.running?'disabled':''}>Find missing logos</button></div></div>
    <div class="card"><h3>Kits with Claude ${srcTag(true)}</h3>${aiPurpose('Check this season\'s kit colours, sponsors, stadium and team colours for a group of teams.')}
     <div class="form"><label class="f">Teams<select id="kit-scope" data-ch="kitScope">${artScopeOpts(S.ui.kitScope)}</select></label>
      <label class="f">Which<select id="kit-which" data-ch="kitWhich">${opts([['missing','Only teams with a kit missing'],['all','All teams (check every kit)']],S.ui.kitWhich||'missing')}</select></label></div>
     <p class="small muted" id="kit-count" style="margin:10px 0 0">${kitCount()}</p>
     <p class="small" style="margin:12px 0 0">Season <b>${esc(S.settings.season)}</b> <span class="muted">(from <a href="#settings">Settings</a>)</span></p>
     <div class="row" style="margin-top:12px"><button class="primary" data-act="artKits" ${S.ui.ai.running?'disabled':''}>Check kits</button>${S.settings.aiWeb!=='off'?'<button data-act="updCmd" data-scope="kits" title="A command for an assistant that can search the web; import its file with Import update files">Get web-search command</button>':''}<button class="ghost" data-act="importPkg">Import update files</button></div></div></div>
   <div class="card" style="margin-top:16px"><h3>Make your own</h3>${aiPurpose('Pick images from your library, design an emblem or paint a kit on the Logos & kits page.')}
    <div class="row"><button class="sm" data-act="artGo" data-tab="missing">Missing emblems</button><button class="sm" data-act="artGo" data-tab="emblem">Emblem maker</button><button class="sm" data-act="artGo" data-tab="kit">Kit designer</button><button class="sm ghost" data-act="artGo" data-tab="library">Image library</button></div></div>`};
// the Logos & kits page points here for updates
ACT.goArt=el=>{S.ui.aiTab='logos';if(el&&el.dataset&&el.dataset.comp!==undefined){S.ui.artScope=el.dataset.comp;S.ui.artcScope=el.dataset.comp;
    const k=el.dataset.kind||'';S.ui.artWhich='missing';S.ui.artOpts=new Set(k==='clubs'?['crests']:k==='comps'?['logos']:['crests','logos'])}location.hash='ai'};
function artPointerHTML(){return `<div class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
  <div class="small">Crests, competition logos, coaches, stadiums and kits are updated from <b>Live Update → Logos &amp; kits</b>: the free databases first (FootyLogos, TheSportsDB, Wikimedia, football-logos, eFootball), then Claude.</div>
  <button class="sm primary" data-act="goArt">Open Logos &amp; kits updates</button></div></div>`}
/* ================= Import / Export → Import files =================
   Files are added, recognised by their format (what each one is for), placed with the right IDs, and every change
   is shown before anything is installed. Nothing in the project changes until Install (or Send to Process and Review). */
let IMP_CAPTURE=null,IMP_DEFER=null,IMP_IMGS=null;
// images stored while changes are checked: kept only if an installed change uses them
{const _a=addImageFromBlob;addImageFromBlob=async(...a)=>{const r=await _a(...a);if(IMP_IMGS&&r&&r.id)IMP_IMGS.push(r.id);return r}}
function impDropImages(ids){const used=usage();(ids||[]).forEach(id=>{const i=S.images[id];if(!i||used[id])return;delete S.images[id];Store.del('images',id);if(i.ref)Store.delBlob(i.ref)})}
// while a check runs, finished change sets are kept here instead of going to Process and Review
{const _fb=finishBatch;finishBatch=b=>{if(IMP_CAPTURE){if(b&&b.items&&b.items.length)IMP_CAPTURE.push(b);return}return _fb(b)};finishBatch._send=_fb}
// steps that would change the project straight away (a team or competition file becoming its game file) wait for Install
function impDo(fn,label,meta){if(IMP_DEFER){IMP_DEFER.push({fn,label,meta:meta||{},on:true});return Promise.resolve()}return Promise.resolve(fn())}
// the five kit textures a team file names (1st, 2nd, GK 1st, 3rd, GK 2nd), so their PNGs go to the right kit slots
{const _p=TED.parse;TED.parse=raw=>{const r=_p(raw);try{const d=TED.decrypt(raw);r.team.kitFiles=OF_KIT.map(o=>TED.readStr(d,o,TED.IMGLEN))}catch(e){}return r}}
{const _l=tedLinkImages;tedLinkImages=()=>{_l();const st=impState();
  (st.teds||[]).forEach(x=>{const t=x.target&&x.target!=='new'?S.teams[x.target]:null;(x.parsed.team.kitFiles||[]).forEach((f,k)=>{const n=String(f||'').toLowerCase();if(!n)return;
    const im=impNamed(f,x.path);if(!im)return;im.kind='kit';im.byFile=true;const slot=OF_KIT_SLOT[k];
    if(t){im.target='kit:'+t.id+':'+slot;const kt=(t.kits||[]).find(z=>z.slot===slot);im.on=!(kt&&hasRealImg(kt.img))}else{im.target='';im.note='used by '+x.parsed.team.name+' (kit)'}})});
}}
// formats that are handled as a whole rather than unpacked: a project transfer, or a complete option-file package
{const _in=impIntake;impIntake=async(blob,path)=>{const name=path.split('/').pop();const st=impState();
  if(/\.zip$/i.test(name)){
    if(blob.size>400*1048576){(st.packages=st.packages||[]).push({id:uid(),name,blob,size:blob.size,teds:null});return}
    if(typeof JSZip!=='undefined'){const z=await JSZip.loadAsync(blob);const files=Object.keys(z.files);
      const pj=z.file('project.json');if(pj){try{const P=JSON.parse(await pj.async('string'));if(P.kind==='full-transfer'){(st.transfers=st.transfers||[]).push({id:uid(),name,blob,teams:((P.collections||{}).teams||[]).length,images:((P.collections||{}).images||[]).length});return}}catch(e){}}
      const teds=files.filter(f=>/(^|\/)WEPES\/.+\.ted$/i.test(f)).length;if(teds>=20){(st.packages=st.packages||[]).push({id:uid(),name,blob,size:blob.size,teds,files:files.length});return}}}
  // update files wait for the check like everything else
  if(/\.json$/i.test(name)){let d=null;try{d=JSON.parse(await blob.text())}catch(e){}
    if(d&&d.mode&&(d.teams||d.comps)){(st.updates=st.updates||[]).push({id:uid(),name,data:d,on:true});return}}
  return _in(blob,path)}}
// the update-file shortcut used to send a dropped update file straight to Process and Review; it now joins the list
// (handled above, before the older wrapper sees it)

/* ---- what each file is for ---- */
const IMG_ROLE={emblem:'Team crest',comp:'Competition logo',kit:'Kit texture',manager:'Manager photo'};
function impTargetLabel(target){if(!target)return'';const [k,a,b]=target.split(':');
  if(k==='comp'){const c=S.comps[a];return c?c.name+(+c.gameId?' · competition ID '+c.gameId:''):'?'}
  const t=S.teams[a];if(!t)return'?';return t.name+(k==='kit'?' · '+b+' kit':k==='manager'?' · manager':'')+(+t.gameId?' · team ID '+t.gameId:'')}
const impPlace={emblem:'Team crest',comp:'Competition logo',kit:'Kit slot',manager:'Manager photo'};
function impRoles(){const st=impState();const rows=[];const o=st.opts;
  (st.packages||[]).forEach(x=>rows.push({file:x.name,role:'Option file package',to:x.teds?x.teds+' team files, '+x.files+' files':kb(x.size),where:'A package on the Import Option File tab: the project can be built from it and exports reproduce its file set',
    act:`<button class="sm" data-act="impPkg" data-id="${x.id}">Add as package</button>`}));
  (st.transfers||[]).forEach(x=>rows.push({file:x.name,role:'Project transfer',to:x.teams+' teams, '+x.images+' images',where:'Replaces the whole project (a snapshot is saved first)',act:`<button class="sm" data-act="impTransfer" data-id="${x.id}">Load project…</button>`}));
  (st.teds||[]).forEach(x=>{const P=x.parsed;const t=x.target&&x.target!=='new'?S.teams[x.target]:null;
    rows.push({file:x.name,role:'Team file (.ted)',on:x.on,status:x.already?'already in your system':'',to:(t?t.name:'New team: '+(P.team.name||'?'))+' · team ID '+P.team.teamId+' · '+P.players.length+' players with game IDs',
      where:'The team\'s game file and players; exported as its .ted'+(P.team.emblemFile?', naming '+P.team.emblemFile:'')}) });
  (st.ceds||[]).forEach(x=>{const P=x.parsed;const c=x.target&&x.target!=='new'?S.comps[x.target]:null;
    rows.push({file:x.name,role:'Competition file (.ced)',on:x.on,status:x.already?'already in your system':'',to:(c?c.name:'New competition: '+(P.name||'?'))+' · competition ID '+P.compId,where:'The competition\'s game file; exported as its .ced'+(P.emblemFile?', with logo '+P.emblemFile:'')})});
  st.tables.forEach(t=>{const s=impTableStats(t);const kind={players:'Players',clubs:'Teams',comps:'Competitions',unknown:'Not recognised'}[t.kind];
    rows.push({file:t.name,role:'Spreadsheet: '+kind+(t.fmt?' ('+t.fmt+')':''),on:t.on&&t.kind!=='unknown',to:t.kind==='players'?s.matchedTeams+' of your teams · '+s.existing+' players found, '+s.fresh+' new':s.rows+' rows',
      where:t.kind==='players'?'Players: names, ages, numbers, ratings':t.kind==='clubs'?'Teams: stadiums, coaches':t.kind==='comps'?'Competitions: countries':'Ignored'})});
  (st.updates||[]).forEach(x=>rows.push({file:x.name,role:'Update file (JSON)',on:x.on,to:Object.keys(x.data.teams||{}).length+' teams, '+Object.keys(x.data.comps||{}).length+' competitions',where:'Teams, players and competitions it lists ('+esc(x.data.mode)+')'}));
  st.studio.forEach(x=>rows.push({file:x.name,role:'Studio backup or package',to:'Teams and competitions in it',where:'Compared with your project when you process the files'}));
  st.images.forEach(i=>{const has=i.target&&targetHasImage(i.target);
    rows.push({file:i.path,role:i.target||(i.note&&/^used by /.test(i.note))?IMG_ROLE[i.kind]||'Image':'Not matched',on:i.on,img:i.url,to:i.target?impTargetLabel(i.target):'<span class="muted">'+(i.note&&/^used by /.test(i.note)?'With the new team '+esc(i.note.slice(8)):'Not matched'+(i.note?' ('+esc(i.note)+')':''))+'</span>',raw:true,
      how:i.bySystem?'named in '+i.bySystem:i.byFile?'named in its game file':i.target?'guessed from its file name: no game file names it':'',where:i.target?(impPlace[i.kind]||'')+' · exported as '+i.name:'',
      status:!i.target?(i.note&&/^used by /.test(i.note)?'goes with the new team':'kept as an extra file at its path; written with Partial Export'):i.already?'already in your system':has?(o.mode==='replace'?'replaces':'slot already filled'):'fills an empty slot'})});
  return rows}
function impRolesHTML(){const rows=impRoles();if(!rows.length)return'';const by={};rows.forEach(r=>by[r.role]=(by[r.role]||0)+1);
  return `<h2>2 · What each file is for</h2>${aiPurpose('Each file is recognised by its format and sent to its place: the team, competition or player it belongs to, with its game ID.')}
   <div class="row" style="gap:6px;margin-bottom:8px">${Object.entries(by).map(([r,n])=>`<span class="tag t-upd">${esc(r)} · ${n}</span>`).join('')}</div>
   <div class="tw" style="max-height:420px"><table><thead><tr><th></th><th>File</th><th>Recognised as</th><th>Goes to</th><th>Ends up as</th><th></th></tr></thead><tbody>
   ${rows.slice(0,800).map(r=>`<tr${r.on===false?' style="opacity:.55"':''}><td style="width:40px">${r.img?`<img class="thumb" src="${esc(r.img)}" alt="">`:''}</td><td class="small" style="max-width:260px;overflow-wrap:anywhere">${esc(r.file.length>70?'…'+r.file.slice(-68):r.file)}</td>
    <td class="small"><b>${esc(r.role)}</b>${r.how?`<div class="muted">${esc(r.how)}</div>`:''}</td><td class="small">${r.raw?r.to:esc(r.to)}</td><td class="small">${esc(r.where||'')}${r.status?`<div class="${r.status==='fills an empty slot'?'up':r.status==='replaces'?'':'muted'}"${r.status==='replaces'?' style="color:var(--warn)"':''}>${esc(r.status)}</div>`:''}</td><td style="text-align:right">${r.act||''}</td></tr>`).join('')}</tbody></table></div>
   ${rows.length>800?`<p class="small muted">Showing 800 of ${rows.length} files.</p>`:''}`}

/* ---- check the changes, then install ---- */
const impEmptyV=v=>v==null||v===''||v===0||(Array.isArray(v)&&!v.length)||(typeof v==='object'&&!Array.isArray(v)&&!Object.keys(v).length);
const IMP_RATING_KEYS=new Set(['pos','foot','style','skills','comStyles','playables','wfUsage','wfAcc','form','injury']);
function impAddOnly(P){
  P.deferred=P.deferred.filter(d=>{const m=d.meta||{};if(m.team){const r=S.teds[m.team];return !r||!!r.generated}if(m.comp){const c=S.comps[m.comp];return !(c&&c.ced&&!c.ced.generated)}return true});
  P.batches.forEach(b=>{b.items=b.items.filter(it=>{if(it.op==='remove'||it.op==='move')return false;if(it.op==='add')return true;
    const team=it.teamId&&S.teams[it.teamId];const genFile=!!(team&&S.teds[team.id]&&S.teds[team.id].generated);const comp=it.compId&&S.comps[it.compId];
    const pl=it.kind==='player'&&team?(team.players||[]).find(x=>x.id===it.playerId):null;const unr=!!(pl&&unrated(pl));
    it.fields=(it.fields||[]).filter(f=>{
      if(f.k==='kits'){const from=Array.isArray(f.from)?f.from:[],to=Array.isArray(f.to)?f.to:[];
        const merged=from.map(k=>{const t=to.find(z=>z.slot===k.slot);return t&&t.img&&!hasRealImg(k.img)?Object.assign(clone(k),{img:t.img}):k}).concat(to.filter(t=>!from.some(k=>k.slot===t.slot)));
        f.to=merged;return canon(merged)!==canon(from)}
      if(f.k==='emblem'||f.k==='managerPhoto'||f.k==='stadiumImg')return !hasRealImg(f.from);
      if(f.k==='sponsorImgs'){const from=Array.isArray(f.from)?f.from:[],to=Array.isArray(f.to)?f.to:[];const m=[0,1,2].map(i=>hasRealImg(from[i])?from[i]:(to[i]||from[i]||''));f.to=m;return canon(m)!==canon(from)}
      if(it.kind==='team'&&(f.k==='gameId'||f.k==='gameSlot'))return impEmptyV(f.from)||genFile;
      if(it.kind==='comp'&&f.k==='gameId')return impEmptyV(f.from)||!!(comp&&(!comp.ced||comp.ced.generated));
      if(it.kind==='player'&&f.k==='gameId')return impEmptyV(f.from)||isEditId(f.from);
      if(it.kind==='player'&&unr&&(f.k.startsWith('attrs.')||IMP_RATING_KEYS.has(f.k)))return true;
      return impEmptyV(f.from)});
    return it.fields.length>0})});
  P.batches=P.batches.filter(b=>b.items.length)}
ACT.impCheck=async()=>{const st=impState();if(st.busy)return;if(S.ui.impPlan)impDropImages(S.ui.impPlan.images);IMP_CAPTURE=[];IMP_DEFER=[];IMP_IMGS=[];
  try{st.tables.filter(t=>t.on&&t.kind!=='unknown').forEach(t=>{try{presetSave(t)}catch(e){}});
    await miniBusy('Working out the changes…',async()=>{await sleep(30);
      if((st.teds||[]).some(x=>x.on)||(st.ceds||[]).some(x=>x.on)||st.tables.some(t=>t.on)||st.images.some(i=>i.on&&i.target))await impBuild();
      for(const x of (st.updates||[]).filter(x=>x.on))await importUpdateData(clone(x.data),x.name,[]);
      for(const x of st.studio)await importStudioFile({name:x.name},x.zip,x.data)})}
  catch(e){toast('Could not work out the changes: '+e.message,'err')}
  finally{S.ui.impPlan={batches:IMP_CAPTURE||[],deferred:IMP_DEFER||[],images:IMP_IMGS||[],at:Date.now()};IMP_CAPTURE=null;IMP_DEFER=null;IMP_IMGS=null;
    if(st.opts.mode==='add')try{impAddOnly(S.ui.impPlan)}catch(e){console.error(e)}S.ui.impTab='changes';rerender();const el=$('#imp-plan');if(el)el.scrollIntoView({behavior:'smooth',block:'start'})}};
const impPlanCount=P=>P.batches.reduce((a,b)=>a+b.items.filter(i=>i.accept).length,0)+P.deferred.filter(d=>d.on).length;
function impFieldHTML(f){
  if(f.k==='kits'){const by=v=>Object.fromEntries((Array.isArray(v)?v:[]).map(k=>[k.slot,k]));const a=by(f.from),b=by(f.to);const img=k=>k&&k.img?((S.images[k.img]||{}).name||'image'):'—';
    return [...new Set([...Object.keys(a),...Object.keys(b)])].filter(sl=>canon(a[sl])!==canon(b[sl])).map(sl=>{const x=a[sl],y=b[sl];const chImg=img(x)!==img(y);
      return `<div class="small"><span class="muted">${esc(sl)} kit:</span> ${chImg?`${esc(img(x))} → <b>${esc(img(y))}</b>`:esc(sheetVal('kits',[x]))+' → <b>'+esc(sheetVal('kits',[y]))+'</b>'}${!x?' <span class="tag t-add">new slot</span>':''}</div>`}).join('')}
  if(f.k==='ted'){const id=v=>v&&v.pid?'player '+v.pid+(v.team?' of team '+v.team:''):'—';return `<div class="small"><span class="muted">Game record:</span> ${esc(id(f.from))} → <b>${esc(id(f.to))}</b></div>`}
  return `<div class="small"><span class="muted">${esc(LABEL[f.k]||f.k)}:</span> ${esc(sheetVal(f.k,f.from))} → <b>${esc(sheetVal(f.k,f.to))}</b></div>`}
function impItemHTML(it,bi,ii){const lbl=OPLBL[it.op]||['t-upd',it.op];const kind=it.kind==='comp'?'Competition':it.kind==='team'?'Team':'Player';
  const team=it.teamId&&S.teams[it.teamId]?S.teams[it.teamId].name:'';const name=it.name||(it.obj&&it.obj.name)||'';
  const fs=(it.fields||[]).slice().sort((a,b)=>(b.k==='ted'||b.k==='gameId')-(a.k==='ted'||a.k==='gameId'));const fields=fs.slice(0,8).map(impFieldHTML).join('')+((it.fields||[]).length>8?`<div class="small muted">and ${(it.fields||[]).length-8} more</div>`:'');
  const add=it.op==='add'&&it.obj?`<div class="small muted">${it.kind==='player'?esc([it.obj.pos,it.obj.age&&'age '+it.obj.age,(+it.obj.gameId||(it.obj.ted&&it.obj.ted.pid))&&'game ID '+(+it.obj.gameId||it.obj.ted.pid)].filter(Boolean).join(' · ')):it.kind==='team'?esc([(it.obj.players||[]).length+' players',+it.obj.gameId&&'team ID '+it.obj.gameId,S.comps[it.obj.compId]&&S.comps[it.obj.compId].name].filter(Boolean).join(' · ')):''}</div>`:'';
  return `<div class="rev-item ${it.accept?'':'off'}" style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" data-act="impItem" data-b="${bi}" data-i="${ii}" ${it.accept?'checked':''} aria-label="Install this change" style="margin-top:3px">
   <div style="flex:1;min-width:0"><div><span class="tag ${lbl[0]}">${lbl[1]}</span> <span class="small muted">${kind}</span> <b>${esc(name)}</b>${team&&it.kind==='player'?` <span class="small muted">· ${esc(team)}</span>`:''}</div>${fields}${add}</div></div>`}
function impPlanHTML(){const P=S.ui.impPlan;if(!P)return'';const n=impPlanCount(P);const all=P.batches.flatMap(b=>b.items);
  const c=(k,op)=>all.filter(i=>i.kind===k&&(!op||i.op===op)).length;
  const sum=[c('team','add')&&c('team','add')+' new teams',c('team','update')&&c('team','update')+' teams updated',c('player','add')&&c('player','add')+' players added',c('player','update')&&c('player','update')+' players updated',c('player','move')&&c('player','move')+' transfers',c('comp')&&c('comp')+' competitions',P.deferred.length&&P.deferred.length+' game files'].filter(Boolean).join(' · ');
  return `<div class="card hl" id="imp-plan" style="margin-bottom:16px"><div class="row"><h3 style="margin:0">What's going to change</h3><span class="spacer"></span><button class="sm ghost" data-act="impPlanAll" data-v="1">Tick all</button><button class="sm ghost" data-act="impPlanAll" data-v="0">Untick all</button></div>
   ${aiPurpose('Every change these files make, before anything is installed. Untick what you don\'t want.')}
   ${n||all.length||P.deferred.length?`<p class="small"><b>${sum||'No changes'}</b></p>
   <div style="display:grid;gap:8px;max-height:520px;overflow:auto">
    ${P.deferred.map((d,di)=>`<div class="rev-item ${d.on?'':'off'}" style="display:flex;gap:10px"><input type="checkbox" data-act="impDef" data-i="${di}" ${d.on?'checked':''} aria-label="Install this file"><div><span class="tag t-add">Game file</span> <b>${esc(d.label)}</b></div></div>`).join('')}
    ${P.batches.map((b,bi)=>b.items.slice(0,400).map((it,ii)=>impItemHTML(it,bi,ii)).join('')+(b.items.length>400?`<p class="small muted">and ${b.items.length-400} more in “${esc(b.title)}”</p>`:'')).join('')}</div>
   ${P.batches.some(b=>(b.notes||[]).length)?`<details class="small" style="margin-top:8px"><summary>Notes</summary>${P.batches.flatMap(b=>b.notes||[]).slice(0,40).map(esc).join('<br>')}</details>`:''}
   <div class="row" style="margin-top:12px"><button class="primary" data-act="impInstall" ${n?'':'disabled'}>Install ${n} change${n===1?'':'s'}</button><button data-act="impToReview" ${n?'':'disabled'}>Send to Process and Review instead</button><button class="ghost" data-act="impPlanDrop">Discard</button></div>
   <p class="small muted" style="margin:8px 0 0">Install saves a snapshot first (Compare &amp; versions), so you can go back. New images are kept only if a change you install uses them.</p>`
   :'<p class="small">These files don\'t change anything: your project already has their data.</p><div class="row"><button class="ghost" data-act="impPlanDrop">Close</button></div>'}</div>`}
/* ----- Import files → Changes to apply: the changes as a tree (the user, 2026-11-23: "make two tabs in Import Files tab: Import,
   and Changes to apply. changes table must have a collapsible tree instead of boxes") -----
   Files kept with the project (game files, extra files) · Competitions · then competition → team → the team's own changes and
   its players. Every line has its tick; a group's tick takes all its lines. What is open stays open when the page redraws. */
const IMP_OPEN=new Map();
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.impk)IMP_OPEN.set(d.dataset.impk,d.open)},true);
const impOpen=(k,def)=>IMP_OPEN.has(k)?IMP_OPEN.get(k):def;
function impChangesHTML(){const P=S.ui.impPlan;
  if(!P)return `<div class="card"><p class="small" style="margin-top:0">Nothing to apply yet. Add files on the <b>Import</b> tab, then press <b>Process files</b>: every change they make is listed here before anything is installed.</p><button data-act="impTab" data-tab="import">Go to Import</button></div>`;
  const n=impPlanCount(P);const X=[];P.batches.forEach((b,bi)=>b.items.forEach((it,ii)=>X.push({it,k:'i'+bi+':'+ii})));
  const D=P.deferred.map((d,di)=>({d,k:'d'+di}));
  if(!X.length&&!D.length)return `<div class="card"><p class="small" style="margin-top:0">These files don't change anything: your project already has their data.</p><div class="row"><button data-act="impPlanDrop">Close</button></div></div>`;
  const on=x=>x.it?!!x.it.accept:!!x.d.on;
  const tick=(list,label)=>{const a=list.filter(on).length;return `<input type="checkbox" data-act="impGrp" data-k="${list.map(x=>x.k).join(',')}" ${a===list.length?'checked':''} ${a&&a<list.length?'data-mixed="1"':''} aria-label="${esc(label)}">`};
  const node=(key,label,list,inner,def)=>`<details data-impk="${esc(key)}" ${impOpen(key,def)?'open':''}><summary>${tick(list,label)} ${label} <span class="muted small">${list.filter(on).length} of ${list.length}</span></summary><div class="toc-in">${inner}</div></details>`;
  const leafD=x=>`<div class="toc-f"><label class="c"><input type="checkbox" data-act="impDef" data-i="${x.k.slice(1)}" ${x.d.on?'checked':''}> ${esc(x.d.label)}</label></div>`;
  const leafI=x=>{const it=x.it;const [bi,ii]=x.k.slice(1).split(':');const lbl=OPLBL[it.op]||['t-upd',it.op];const name=it.name||(it.obj&&it.obj.name)||'';const fs=it.fields||[];
    const add=it.op==='add'&&it.obj?(it.kind==='player'?[it.obj.pos,it.obj.age&&'age '+it.obj.age,(+it.obj.gameId||(it.obj.ted&&it.obj.ted.pid))&&'game ID '+(+it.obj.gameId||it.obj.ted.pid)]:it.kind==='team'?[(it.obj.players||[]).length+' players',+it.obj.gameId&&'team ID '+it.obj.gameId,!+it.obj.gameId&&'its league and code are chosen after you install']:[]).filter(Boolean).join(' · '):'';
    const kind=it.kind==='comp'?'Competition':it.kind==='team'?'Team':'Player';
    return `<div class="toc-f" style="display:flex;gap:6px;align-items:flex-start"><input type="checkbox" data-act="impItem" data-b="${bi}" data-i="${ii}" ${it.accept?'checked':''} aria-label="Install this change" style="margin-top:3px">
     <div style="min-width:0"><span class="tag ${lbl[0]}">${lbl[1]}</span> <span class="small muted">${kind}</span> <b>${esc(name)}</b>${add?` <span class="small muted">· ${esc(add)}</span>`:''}
     ${fs.length?`<details data-impk="${x.k}" ${impOpen(x.k,false)?'open':''}><summary class="small muted">${fs.length} value${fs.length===1?'':'s'}</summary><div class="toc-in">${fs.map(impFieldHTML).join('')}</div></details>`:''}</div></div>`};
  // teams, by competition
  const teamOf=x=>x.it.kind==='team'?(x.it.op==='add'?x.it.obj.id:x.it.teamId):x.it.teamId;
  const T=new Map();X.filter(x=>x.it.kind!=='comp').forEach(x=>{const id=teamOf(x)||'?';(T.get(id)||T.set(id,[]).get(id)).push(x)});
  const newObj=id=>{const a=X.find(x=>x.it.kind==='team'&&x.it.op==='add'&&x.it.obj&&x.it.obj.id===id);return a&&a.it.obj};
  const tName=id=>S.teams[id]?S.teams[id].name:(newObj(id)||{}).name||'Players with no team';
  const cName=id=>{const t=S.teams[id]||newObj(id);const c=t&&(S.comps[t.compId]||X.map(x=>x.it).find(i=>i.kind==='comp'&&i.obj&&i.obj.id===t.compId&&i.obj));return c?c.name:(t&&!S.teams[id]?'New teams (their league is chosen after you install)':'No competition')};
  const C=new Map();[...T.keys()].forEach(id=>{const c=cName(id);(C.get(c)||C.set(c,[]).get(c)).push(id)});
  const compNodes=[...C.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([c,ids])=>{const all=ids.flatMap(id=>T.get(id));
    const teams=ids.sort((a,b)=>tName(a).localeCompare(tName(b))).map(id=>{const L=T.get(id);const own=L.filter(x=>x.it.kind==='team'),pl=L.filter(x=>x.it.kind==='player');
      return node('t:'+id,'<b>'+esc(tName(id))+'</b>',L,own.map(leafI).join('')+(pl.length?node('p:'+id,'Players',pl,pl.map(leafI).join(''),pl.length<=12):''),false)}).join('');
    return node('c:'+c,'<b>'+esc(c)+'</b>',all,teams,C.size<=3)}).join('');
  const gf=D.filter(x=>/becomes the game file/.test(x.d.label)),kf=D.filter(x=>!/becomes the game file/.test(x.d.label)),cs=X.filter(x=>x.it.kind==='comp');
  const all=[...D,...X];
  return `<div class="card" id="imp-plan" style="margin-bottom:16px"><div class="row"><h3 style="margin:0">Changes to apply</h3><span class="spacer"></span><button class="sm ghost" data-act="impPlanAll" data-v="1">Tick all</button><button class="sm ghost" data-act="impPlanAll" data-v="0">Untick all</button></div>
   ${aiPurpose('Every change the files make, before anything is installed. Open a competition or team to see its changes; untick what you don\'t want.')}
   <div class="toc tree" style="max-height:560px;overflow:auto;margin-top:8px">
    ${gf.length?node('g:files','<b>Game files</b>',gf,gf.map(leafD).join(''),false):''}
    ${cs.length?node('g:comps','<b>Competitions</b>',cs,cs.map(leafI).join(''),true):''}
    ${compNodes}
    ${kf.length?node('g:kept','<b>Files kept with the project</b>',kf,kf.map(leafD).join(''),false):''}</div>
   ${P.batches.some(b=>(b.notes||[]).length)?`<details class="small" style="margin-top:8px"><summary>Notes</summary>${P.batches.flatMap(b=>b.notes||[]).slice(0,40).map(esc).join('<br>')}</details>`:''}
   <div class="row" style="margin-top:12px"><button class="primary" data-act="impInstall" ${n?'':'disabled'}>Install ${n} change${n===1?'':'s'}</button><button data-act="impToReview" ${n?'':'disabled'}>Send to Process and Review instead</button><button class="ghost" data-act="impPlanDrop">Discard</button></div>
   <p class="small muted" style="margin:8px 0 0">${all.filter(on).length} of ${all.length} ticked. Install saves a snapshot first (Compare &amp; versions), so you can go back. New images are kept only if a change you install uses them.</p></div>`}
ACT.impGrp=el=>{const P=S.ui.impPlan;if(!P)return;const v=el.checked;el.dataset.k.split(',').forEach(k=>{if(k[0]==='d'){const d=P.deferred[+k.slice(1)];if(d)d.on=v}else{const [bi,ii]=k.slice(1).split(':');const it=P.batches[+bi]&&P.batches[+bi].items[+ii];if(it){it.accept=v;(it.fields||[]).forEach(f=>f.accept=v)}}});S.ui.keepScroll=true;rerender()};
ACT.impTab=el=>{S.ui.impTab=el.dataset.tab;rerender()};
// a group whose lines are partly ticked shows the half-ticked box
{const _r=rerender;rerender=function(){_r.apply(this,arguments);document.querySelectorAll('input[data-act=impGrp][data-mixed]').forEach(i=>i.indeterminate=true)}}
ACT.impItem=el=>{const it=S.ui.impPlan.batches[+el.dataset.b].items[+el.dataset.i];it.accept=el.checked;(it.fields||[]).forEach(f=>f.accept=el.checked);S.ui.keepScroll=true;rerender()};
ACT.impDef=el=>{S.ui.impPlan.deferred[+el.dataset.i].on=el.checked;S.ui.keepScroll=true;rerender()};
ACT.impPlanAll=el=>{const v=el.dataset.v==='1';const P=S.ui.impPlan;P.batches.forEach(b=>b.items.forEach(i=>{i.accept=v;(i.fields||[]).forEach(f=>f.accept=v)}));P.deferred.forEach(d=>d.on=v);S.ui.keepScroll=true;rerender()};
ACT.impPlanDrop=()=>{if(S.ui.impPlan)impDropImages(S.ui.impPlan.images);S.ui.impPlan=null;S.ui.impTab='import';rerender()};
ACT.impInstall=async()=>{const P=S.ui.impPlan;if(!P)return;const n=impPlanCount(P);if(!n)return;
  if(!await ask('Install '+n+' change'+(n===1?'':'s')+'?','They go into your project now. A snapshot is saved first, so you can go back from Compare &amp; versions.','Install'))return;
  await takeSnapshot('Before import',true);let t=0,sk=0;for(const b of P.batches){const r=applyBatch(b);t+=r.n;sk+=r.skipped}
  let g=0;for(const d of P.deferred)if(d.on){try{await d.fn();g++}catch(e){toast(d.label+': '+e.message,'err')}}
  impDropImages(P.images);S.ui.impPlan=null;ACT.impClear();toast('Installed '+(t-sk+g)+' change'+(t-sk+g===1?'':'s')+(sk?' ('+sk+' skipped: already there)':''),'ok');rerender()};
ACT.impToReview=async()=>{const P=S.ui.impPlan;if(!P)return;for(const d of P.deferred)if(d.on){try{await d.fn()}catch(e){}}
  P.batches.forEach(b=>{b.items=b.items.filter(i=>i.accept);if(b.items.length)finishBatch._send(b)});S.ui.impPlan=null;location.hash='review'};
ACT.impPkg=async el=>{const st=impState();const x=(st.packages||[]).find(p=>p.id===el.dataset.id);if(!x)return;
  if(!ofAvailable()){toast('Packages are handled by the site\'s server: open the studio from start.bat or the website.','err');return}
  try{await miniBusy('Adding '+x.name+' ('+kb(x.size)+')…',async()=>{await ofUploadPackage(new File([x.blob],x.name))});
    st.packages=st.packages.filter(p=>p!==x);S.ui.of={};S.ui.ofTab='of';toast(x.name+' added as a package. Build the project from it on the Import Option File tab.','ok');rerender()}
  catch(e){toast('Adding the package failed: '+e.message,'err')}};
ACT.impTransfer=async el=>{const st=impState();const x=(st.transfers||[]).find(p=>p.id===el.dataset.id);if(!x)return;
  try{if(await xferImport(x.blob)){st.transfers=st.transfers.filter(p=>p!==x)}}catch(e){toast('Could not load the project: '+e.message,'err')}};
// counts for the tab badge
const impCount=()=>{const st=S.ui.imp;if(!st)return 0;return st.tables.length+st.images.length+st.studio.length+(st.teds||[]).length+(st.ceds||[]).length+(st.updates||[]).length+(st.packages||[]).length+(st.transfers||[]).length+(st.extras||[]).length};

/* ---- the Option file page: two tabs, Option file and Import ---- */
const IMP_KIND_LBL={extras:['extra file','extra files'],teamFiles:['team file','team files'],compFiles:['competition file','competition files'],images:['image','images'],sheets:['spreadsheet','spreadsheets'],updates:['update file','update files'],backups:['studio backup','studio backups'],packages:['option-file package','option-file packages'],transfers:['project transfer','project transfers']};
function impProgHTML(){const p=(impState().prog)||{i:0,total:0,name:''};const pct=p.total?Math.round((p.i-1)/p.total*100):0;
  return `<div class="row" style="justify-content:space-between"><b>Reading file ${p.i} of ${p.total}</b><span class="small muted">${pct}%</span></div><div class="bar" style="height:6px;background:var(--panel2);border-radius:3px;margin:8px 0"><i style="display:block;height:100%;width:${pct}%;background:var(--accent);border-radius:3px"></i></div><div class="small muted" style="overflow-wrap:anywhere">${esc(p.name)}</div>`}
// a team or competition file that is already this team's or competition's real game file, or an image for a slot that
// already holds a real image: nothing to add
function impGuessComps(){const st=impState();(st.teds||[]).forEach(x=>{if(x.target!=='new'||x.compId)return;
    const segs=String(x.path||'').split('/').slice(0,-1).reverse();for(const sg of segs){const nm=sg.replace(/^\d+\s*[.\-_]\s*/,'').replace(/^(teds?|images?).*$/i,'');const flat=v=>norm(v).replace(/ /g,'');const c=matchComp(nm)||(nm&&compsArr().find(k=>flat(k.name)===flat(nm)));if(c){x.compId=c.id;break}}})}
function impMarkAlready(){const st=impState();try{impGuessComps()}catch(e){}if(st.opts.mode==='replace'){impTickAll(st);return 0}let n=0;
  (st.teds||[]).forEach(x=>{const r=x.target&&x.target!=='new'&&S.teds[x.target];const was=x.already;x.already=!!(r&&!r.generated&&+r.tedTeamId===+x.parsed.team.teamId);if(x.already){x.on=false;n++}else if(was)x.on=true});
  (st.ceds||[]).forEach(x=>{const c=x.target&&x.target!=='new'&&S.comps[x.target];const was=x.already;x.already=!!(c&&c.ced&&!c.ced.generated&&+c.ced.compId===+x.parsed.compId);if(x.already){x.on=false;n++}else if(was)x.on=true});
  st.images.forEach(i=>{const was=i.already;i.already=!!(i.target&&targetHasImage(i.target));if(i.already){i.on=false;n++}else if(was)i.on=true});return n}
// "Replace existing values too" takes every file, the ones already in your system included (the user, 2026-11-23)
function impTickAll(st){(st.teds||[]).forEach(x=>{x.already=false;x.on=true});(st.ceds||[]).forEach(x=>{x.already=false;x.on=true});
  st.images.forEach(i=>{i.already=false;i.on=true});st.tables.forEach(t=>{if(t.kind!=='unknown')t.on=true});(st.updates||[]).forEach(x=>x.on=true);(st.extras||[]).forEach(x=>x.on=true)}
function impLastHTML(){const st=impState();
  if(st.busy)return `<div class="card hl" id="imp-prog" style="margin-bottom:16px" role="status" aria-live="polite">${impProgHTML()}</div>`;
  const L=S.ui.impLast;if(!L)return'';const kinds=Object.entries(L.got);const ok=kinds.length>0;
  const next=st.packages&&st.packages.length&&kinds.length===1&&L.got.packages?'Next: press <b>Add as package</b> next to it below, then build the project from it on the Import Option File tab.'
    :(st.transfers||[]).length&&L.got.transfers?'Next: press <b>Load project…</b> next to it below.'
    :'Next: check <b>2 · What each file is for</b> below (fix a target if one is wrong), then press <b>Process files</b>. Nothing changes until you install.';
  return `<div class="card ${ok?'hl':''}" id="imp-last" style="margin-bottom:16px;${ok?'':'border-color:var(--bad,#e5484d)'}" role="status" aria-live="polite">
   <div class="row"><h3 style="margin:0">${ok?'✓ Read '+L.total+' file'+(L.total===1?'':'s'):'Nothing could be used from '+L.total+' file'+(L.total===1?'':'s')}</h3><span class="spacer"></span><button class="sm ghost" data-act="impLastHide" aria-label="Dismiss">Dismiss</button></div>
   ${ok?`<div class="row" style="gap:6px;margin:8px 0">${kinds.map(([k,n])=>`<span class="tag t-upd">${n} ${IMP_KIND_LBL[k][n===1?0:1]}</span>`).join('')}${L.already?`<span class="tag t-add" title="The same game file, or an image for a slot that already has a real image">${L.already} already in your system, left out</span>`:''}</div>`:''}
   ${L.skipped.length?`<div class="warnbox small" style="margin:8px 0"><b>${L.skipped.length} file${L.skipped.length===1?'':'s'} skipped:</b><br>${L.skipped.slice(0,20).map(esc).join('<br>')}${L.skipped.length>20?'<br>…':''}</div>`:''}
   <p class="small" style="margin:8px 0 0">${ok?next:'Supported: team (.ted) and competition (.ced) files, PNG/JPG/SVG/WebP images, CSV/Excel spreadsheets, update files (.json), studio backups and ZIPs of any of these.'}</p>
   ${ok&&!(L.got.packages&&kinds.length===1)&&!(L.got.transfers&&kinds.length===1)?`<div class="row" style="margin-top:10px"><button class="primary" data-act="impCheck">Process files</button><button class="ghost" data-act="impScrollRoles">See what each file is for</button></div>`:''}</div>`}
ACT.impLastHide=()=>{S.ui.impLast=null;rerender()};
ACT.impScrollRoles=()=>{const h=[...document.querySelectorAll('#main h2')].find(x=>/What each file is for/.test(x.textContent));if(h)h.scrollIntoView({behavior:'smooth',block:'start'})};
function impPageHTML(){let h=VIEWS.import();
  h=h.replace(/^\s*<h1>Import files<\/h1><p class="sub">[\s\S]*?<\/p>/,'');
  h=h.replace('<div class="grid g2"><div class="card hl" id="imp-drop"',`<h2 style="margin-top:0">1 · Add files</h2>${aiPurpose('Drop what you downloaded: team and competition files, images, spreadsheets, update files, ZIPs or whole folders.')}<div class="grid g2"><div class="card hl" id="imp-drop"`);
  h=h.replace('<h2>How to apply</h2>',impRolesHTML()+'<h2>3 · How to apply</h2>'+aiPurpose('Choose whether files only fill gaps or also replace what you have, then process the files.'));
  h=h.replace(/<button class="primary" data-act="impGo"[^>]*>Send to Process and Review<\/button>/,`<button class="primary" data-act="impCheck" ${impState().busy?'disabled':''}>Process files</button>`);
  h=h.replace(/<button class="sm" data-act="impStudio" data-i="\d+">Compare &amp; send to Process and Review<\/button>/g,'<span class="small muted">included when you process the files</span>');
  const hasAny=impCount();if(hasAny&&!/What each file is for/.test(h))h+=impRolesHTML();
  if(hasAny&&!/data-act="impCheck"/.test(h))h+=`<div class="row" style="margin-top:14px"><button class="primary" data-act="impCheck">Process files</button><button class="ghost" data-act="impClear">Clear list</button></div>`;
  const P=S.ui.impPlan,tab=S.ui.impTab==='changes'?'changes':'import';
  const sub=`<div class="tabs" role="tablist" aria-label="Import files" style="margin-bottom:12px">${[['import','Import'],['changes','Changes to apply']].map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" class="${tab===k?'on':''}" data-act="impTab" data-tab="${k}">${l}${k==='changes'&&P?' <span class="badge">'+impPlanCount(P)+'</span>':''}</button>`).join('')}</div>`;
  return sub+(tab==='changes'?impChangesHTML():impLastHTML()+h)}
/* ---- Import / Export: one page in five tabs ----
   Summary · Export Option File (First install / Changes only, at the option file's own paths) · Partial Export (an add-on
   package for Import Team / Competition / Images) · Import Option File (the package and building the project from it) · Import files. */
const IO_TABS=[['sum','Summary'],['ofexp','Export Option File'],['usb','Partial Export'],['of','Import Option File'],['import','Import files']];
/* ----- Import / Export → Summary: what you changed and what the export will do, before you export -----
   In one place: the changes since the baseline (teams, players, competitions), the files Changes only would write (the
   Overview's "Changes to export" tree, added up by kind and by league), the export's notes, and the moves to make in the
   game's Competition Structure. Nothing here changes anything. */
function ioSummaryHTML(){const pk=S.settings.ofPkg;
  if(!pk)return `<div class="card"><h3>No option file in use yet</h3><p class="small">The summary compares your project with the option file it was built from. Upload it and build the project on <b>Import Option File</b> first.</p><div class="row"><button class="primary" data-act="ofTab" data-tab="of">Open Import Option File</button></div></div>`;
  const pl=(n,w,ws)=>n+' '+(n===1?w:(ws||w+'s')),tile=(n,l,warn)=>`<div class="tile${warn?' warn':''}"><div class="n">${n}</div><div class="l">${l}</div></div>`;
  // 1. the data: against the baseline
  const base=dataFor('baseline');let data='';
  if(base===undefined)data='<p class="muted small" role="status">Reading the baseline…</p>';
  else if(!base)data='<p class="muted small">There is no baseline to compare with yet.</p>';
  else{const d=diffData(base,currentData()),c=(L,t)=>L.filter(x=>x.type===t).length,ch=changedTeamIds(d);
    const per=new Map();const bump=(t,k)=>{if(!t)return;const o=per.get(t.id)||per.set(t.id,{t,added:0,removed:0,moved:0,changed:0,info:0}).get(t.id);o[k]++};
    d.players.forEach(x=>{if(x.type==='added')bump(x.tB,'added');else if(x.type==='removed')bump(x.tA,'removed');else if(x.type==='moved'){bump(x.tB,'added');bump(x.tA,'removed')}else bump(x.tB,'changed')});
    d.teams.forEach(x=>{if(x.type==='changed')bump(S.teams[x.id]||x.obj,'info')});
    const top=[...per.values()].filter(o=>S.teams[o.t.id]).sort((a,b)=>(b.added+b.removed+b.changed)-(a.added+a.removed+a.changed)||a.t.name.localeCompare(b.t.name));
    const taken=allPlayers().filter(p=>p.codeSet).length;
    data=`<div class="grid g4">${tile(ch.size,'Teams with changes')}${tile(c(d.players,'added'),'Players added')}${tile(c(d.players,'removed'),'Players removed')}${tile(c(d.players,'moved'),'Players moved team')}${tile(c(d.players,'changed'),'Players edited')}${tile(c(d.teams,'added')+' / '+c(d.teams,'removed'),'Teams added / deleted')}${tile(c(d.comps,'added')+' / '+c(d.comps,'removed'),'Competitions added / deleted')}${tile(c(d.comps,'changed'),'Competitions edited')}</div>
     ${taken?`<p class="small" style="margin:10px 0 0">${pl(taken,'player')} took over the code of a player the game has (Game codes → Players): ${taken===1?'he is':'they are'} written over ${taken===1?'that player':'those players'} and keep${taken===1?'s':''} the replaced look until edited in the game.</p>`:''}
     ${top.length?`<details style="margin-top:10px"><summary class="small" style="cursor:pointer"><b>By team</b> (${top.length})</summary><div class="tw" style="max-height:340px;margin-top:6px"><table><thead><tr><th>Team</th><th class="num">Players added</th><th class="num">Removed</th><th class="num">Edited</th><th>Team details</th></tr></thead><tbody>
       ${top.slice(0,400).map(o=>`<tr><td><button class="tocid" data-act="tocTeam" data-id="${o.t.id}">${esc(o.t.name)}</button></td><td class="num">${o.added||''}</td><td class="num">${o.removed||''}</td><td class="num">${o.changed||''}</td><td class="small muted">${o.info?'edited':''}</td></tr>`).join('')}</tbody></table></div></details>`:'<p class="small muted" style="margin:10px 0 0">No team, player or competition differs from the baseline.</p>'}`}
  // 2. the files: what Changes only would write now (the same check as Overview → Changes to export)
  const T=S.ui.tocSt||(S.ui.tocSt={});const R=T.changes;let files='';
  if(!R||R.pkg!==pk.id){if(!T.busy_changes){T.busy_changes=true;tocStatus('changes').then(r=>{T.changes=r}).catch(e=>{T.changes={err:e.message,pkg:pk.id,files:[],removed:[],at:Date.now()}}).finally(()=>{T.busy_changes=false;rerender()})}files='<p class="muted small" role="status">Checking what the export would write…</p>'}
  else{const K=['ted','ced','img'],KL={ted:'Team files',ced:'Competition files',img:'Images'};const kind=f=>f.kind==='ted'||f.kind==='ced'?f.kind:'img';
    const zero=()=>({edited:0,added:0,removed:0});const tot={};K.forEach(k=>tot[k]=zero());const lg=new Map();
    R.files.forEach(f=>{const k=kind(f),v=f.st||'edited';tot[k][v]++;const t=f.team&&S.teams[f.team];const c=t?teamCompOf(t):f.comp?S.comps[f.comp]:null;const name=c?c.name:'No competition';const o=lg.get(name)||lg.set(name,{name,ted:zero(),ced:zero(),img:zero(),n:0}).get(name);o[k][v]++;o.n++});
    tot.ted.removed+=R.removed.filter(x=>/^Team/.test(x)).length;tot.ced.removed+=R.removed.filter(x=>/^Competition/.test(x)).length;
    const cell=o=>['edited','added','removed'].filter(x=>o[x]).map(x=>`<span class="tag ${TOC_ST[x][1]} toc-tag">${o[x]} ${TOC_ST[x][0].toLowerCase()}</span>`).join(' ')||'<span class="muted">–</span>';
    const L=[...lg.values()].sort((a,b)=>b.n-a.n||a.name.localeCompare(b.name,undefined,{numeric:true}));const sum=k=>tot[k].edited+tot[k].added+tot[k].removed;const n=R.files.length+R.removed.length;
    files=`${R.err?`<div class="warnbox">${esc(R.err)}</div>`:''}<p class="small" style="margin:0 0 8px">Compared with ${ofInstalledState()?'the export of '+fmtDate(S.settings.ofInstalled.at)+' you confirmed as imported':'the option file as built (no export confirmed yet)'}: <b>${n?pl(R.files.length,'file')+(R.removed.length?' and '+pl(R.removed.length,'code')+' no longer exported':''):'nothing to export'}</b>. <span class="muted">Checked ${esc(new Date(R.at).toLocaleTimeString())}.</span></p>
     ${n?`<div class="tw"><table><thead><tr><th>Kind</th><th>Files</th><th class="num">In all</th></tr></thead><tbody>${K.filter(k=>sum(k)).map(k=>`<tr><td>${KL[k]}</td><td>${cell(tot[k])}</td><td class="num">${sum(k)}</td></tr>`).join('')}</tbody></table></div>
     <details style="margin-top:10px"><summary class="small" style="cursor:pointer"><b>By competition</b> (${L.length})</summary><div class="tw" style="max-height:340px;margin-top:6px"><table><thead><tr><th>Competition</th><th>Team files</th><th>Competition files</th><th>Images</th><th class="num">Files</th></tr></thead><tbody>
       ${L.map(o=>`<tr><td>${esc(o.name)}</td><td>${cell(o.ted)}</td><td>${cell(o.ced)}</td><td>${cell(o.img)}</td><td class="num">${o.n}</td></tr>`).join('')}</tbody></table></div></details>`:''}
     ${(R.notes||[]).length?`<details class="warnbox" style="margin-top:10px"><summary style="cursor:pointer"><b>${pl(R.notes.length,'note')} from the export</b></summary><div class="small" style="margin-top:6px">${R.notes.slice(0,100).map(esc).join('<br>')}</div></details>`:'<p class="small muted" style="margin:10px 0 0">The export has no notes: nothing is left out or needs attention.</p>'}`}
  return `<p class="small muted">What you changed and what the export will do, before you export. Nothing on this tab changes anything.</p>${ofPendingHTML()}
   <div class="card" style="margin-bottom:12px"><h3 style="margin-top:0">Changes since the baseline</h3>${data}</div>
   <div class="card" style="margin-bottom:12px"><div class="row"><h3 style="margin:0">Files a Changes only export would write</h3><span class="spacer"></span><button class="sm" data-act="tocRefresh">Check again</button><button class="sm" data-act="ioSumTree" title="Overview → Changes to export: every file, folder by folder">Open the full tree</button><button class="sm primary" data-act="ofTab" data-tab="ofexp">Go to Export Option File</button></div><div style="margin-top:10px">${files}</div></div>
   <div class="card">${slotGuideHTML()}</div>`}
ACT.ioSumTree=()=>{S.ui.ovTab='tocChanges';if(S.ui.tocSt)delete S.ui.tocSt.changes;location.hash='overview'};
{const _of=VIEWS.optionfile;VIEWS.optionfile=()=>{const tab=IO_TABS.some(t=>t[0]===S.ui.ofTab)?S.ui.ofTab:'of';const n=impCount();const pend=S.settings.ofPending;
  const badge=k=>k==='import'&&n?' <span class="badge">'+n+'</span>':k==='ofexp'&&pend?' <span class="badge" title="An export is waiting for your confirmation">1</span>':'';
  const tabs=`<div class="tabs" role="tablist" aria-label="Import and export">${IO_TABS.map(([k,l],i)=>`<button role="tab" aria-selected="${tab===k}" class="${tab===k?'on':''}" data-act="ofTab" data-tab="${k}">${l}${badge(k)}</button>`).join('')}</div>`;
  const head=`<h1>Import / Export</h1><p class="sub">Start from your option file, bring in files, then export the option file back or only the teams you pick.</p>${tabs}`;
  const intro=h=>h.replace(/^\s*<h1>[^<]*<\/h1>\s*<p class="sub">/,'<p class="small muted">');
  if(tab==='import')return head+`<p class="small muted">Each file is recognised by its format, placed with the right team, competition or player and its game ID, and every change is shown before you install it.</p>${impPageHTML()}`;
  if(tab==='usb')return head+intro(VIEWS.export());
  if(tab==='sum')return head+ioSummaryHTML();
  const full=intro(_of());const M='<h2>3 · Export</h2>';const i1=full.indexOf(M),i2=full.indexOf('<h2>The rule</h2>');
  const rule=i2<0?'':full.slice(i2);
  if(tab==='ofexp'){
    if(i1<0)return head+`<div class="card"><h3>No option file in use yet</h3><p class="small">This tab writes your option file back at its own folders and file names. Upload it and build the project from it on <b>Import Option File</b> first. To export chosen teams without an option file, use <b>Partial Export</b>.</p>
      <div class="row"><button class="primary" data-act="ofTab" data-tab="of">Open Import Option File</button><button data-act="ofTab" data-tab="usb">Open Partial Export</button></div></div>`+rule;
    return head+`<p class="small muted">Your option file back, name for name, laid out by competition and team: <b>First install</b> writes every file; after that, <b>Changes only</b> writes just what differs from what the game has.</p>`+full.slice(i1+M.length,i2<0?undefined:i2)+rule}
  // Import Option File: the package and building the project from it (export and the layout rule are on Export Option File)
  const src=i1>=0?full.slice(0,i1):i2>=0?full.slice(0,i2):full;
  return head+src.replace(/^\s*<p class="small muted">[\s\S]*?<\/p>/,'<p class="small muted">Upload your option file, then build the project from it: its teams, players, kits, crests, manager photos and competition files become the project\'s, and the exports give back the same files.</p>')}}
ACT.ofTab=el=>{S.ui.ofTab=el.dataset.tab;if(el.dataset.tab==='sum'&&S.ui.tocSt)delete S.ui.tocSt.changes;if(location.hash!=='#optionfile'){location.hash='optionfile';return}rerender();const m=$('#main');if(m&&m.scrollTo)m.scrollTo(0,0)};
// the old Import files and Partial Export addresses open their tabs
{const _r=route;route=()=>{const h=location.hash;if(h==='#import'||h==='#export'){S.ui.ofTab=h==='#import'?'import':'usb';history.replaceState(null,'','#optionfile')}return _r()}}
ACT.openImport=()=>{S.ui.ofTab='import';if(location.hash==='#optionfile')rerender();else location.hash='optionfile'};
/* ================= Partial Export: one page, in the order you decide things =================
   1 What to export (teams and competitions) · 2 What goes in (game files, images, extras) · 3 Folders and batches · Build.
   A project built from an option file is pointed to Import / Export → Export Option File → First install / Changes only, which reproduce the
   option file at its own paths; here, the option file's names are kept and the images it already has are left out. */
VIEWS.export=()=>{
  const e=scopeState();const E=ensureExp();const P=E.parts;const sz=S.settings.sizes;const pk=S.settings.ofPkg;
  const base=dataFor('baseline');const changed=base?changedTeamIds(diffData(base,currentData())):null;
  const groups=[...compsArr().map(c=>[c.id,c.name,teamsArr().filter(t=>t.compId===c.id)]),['__none','Unassigned teams',teamsArr().filter(inNoComp)],['__game','Classic Teams',teamsArr().filter(gameNoLeague)]].filter(g=>g[2].length||S.comps[g[0]]);
  const scope=exportScope();const inf=scope.teams.map(teamFileInfo);const vis=expVisible();const nVis=vis.reduce((a,g)=>a+g.ts.length,0);
  const nT=inf.filter(Boolean).length,nG=inf.filter(x=>x&&x.kind==='generic').length,nC=scope.comps.filter(compFileInfo).length;
  const nPl=scope.teams.reduce((a,t)=>a+(t.players||[]).length,0);const nOf=scope.teams.filter(t=>t.of).length;
  const chk=(k,label,dis,extra='')=>`<label class="c"><input type="checkbox" data-act="expPart" data-k="${k}" ${P[k]?'checked':''} ${dis?'disabled':''}> <span>${label}</span></label>${extra}`;
  const sub=(k,label,dis)=>`<label class="c" style="margin-left:24px"><input type="checkbox" data-act="expPart" data-k="${k}" ${P[k]?'checked':''} ${dis?'disabled':''}> <span>${label}</span></label>`;
  const exp=tag=>` <span class="tag t-mov">${tag}</span>`;
  return `<h1>Partial Export</h1><p class="sub">Export only the teams and competitions you pick, as a package for PES 2021's <b>Import Team</b>, <b>Import Competition</b> and <b>Import Images</b>, with an Update Sheet for anything the game files can't carry. You see every file before you download it or write it to a drive.</p>
  ${pk?`<div class="infobox small" style="margin-bottom:16px">Your project is built from <b>${esc(pk.name)}</b>. To install the whole option file, or everything you changed, at its own folders and file names, use <b>Export Option File</b>. A partial export keeps the option file's file names, so an edited image replaces the original, and leaves out images the option file already has. <button class="sm" data-act="ofTab" data-tab="ofexp">Open Export Option File</button></div>`:''}
  <div class="grid g2">
   <div class="card"><h3>1 · What to export</h3>${aiPurpose('Nothing is selected to start with: narrow the list with the filters, then tick the competitions and teams that go into the package.')}
    <div class="row" style="margin-bottom:8px;gap:8px;flex-wrap:wrap"><input type="search" data-in="expQ" value="${esc(e.f.q)}" placeholder="Search teams or competitions" aria-label="Search teams or competitions" style="flex:1;min-width:180px">
     <select data-ch="expF" data-k="comp" aria-label="Competition">${opts([['','All competitions'],...compsArr().map(c=>[c.id,c.name]),...(teamsArr().some(inNoComp)?[['__none','Unassigned teams']]:[])],e.f.comp)}</select>
     <select data-ch="expF" data-k="show" aria-label="Which teams">${opts([['all','All teams'],...(base?[['changed',`Changed since the baseline (${changed.size})`]]:[]),...(pk?[['new','Not in the option file']]:[]),['selected','Selected only']],e.f.show)}</select></div>
    <div class="row" style="margin-bottom:8px"><button class="sm" data-act="expAll" data-v="all" ${teamsArr().length||compsArr().length?'':'disabled'} title="Every team and competition, whatever the filters show">Select all</button><button class="sm" data-act="expAll" data-v="1" ${nVis?'':'disabled'}>Select the ${nVis} team${nVis===1?'':'s'} shown</button><button class="sm ghost" data-act="expAll" data-v="0" ${scope.teams.length||scope.comps.length?'':'disabled'}>Clear selection</button>
     <span class="small muted">Ticking a competition adds its competition file and the teams it shows.</span></div>
    <div class="tree" style="max-height:440px;overflow:auto">${vis.map(g=>{const nOn=g.all.filter(t=>e.it.has(t.id)).length;const on=g.id.startsWith('__')?g.ts.length&&g.ts.every(t=>e.it.has(t.id)):e.ic.has(g.id);
      return `<details ${vis.length<4||e.f.q||e.f.show!=='all'?'open':''}><summary><input type="checkbox" data-act="expComp" data-id="${g.id}" ${on?'checked':''} aria-label="Include ${esc(g.name)}"> <b>${esc(g.name)}</b> <span class="muted small">${nOn}/${g.all.length} teams${!g.id.startsWith('__')&&e.ic.has(g.id)?' · competition file':''}</span></summary>
     <div class="teams">${g.ts.map(t=>`<label class="c small"><input type="checkbox" data-act="expTeam" data-id="${t.id}" ${e.it.has(t.id)?'checked':''}> ${esc(t.name)}${changed&&changed.has(t.id)?' <span class="tag t-upd">changed</span>':''}</label>`).join('')}</div></details>`}).join('')||`<p class="muted">${teamsArr().length?'No teams match these filters.':'No teams yet.'}</p>`}</div>
    <div class="infobox small" style="margin-top:10px">${scope.teams.length||scope.comps.length?`Selected: <b>${scope.teams.length}</b> teams · <b>${scope.comps.length}</b> competitions · <b>${nPl}</b> players${nOf?` · ${nOf} from the option file`:''}`:'<b>Nothing selected yet.</b> Tick the competitions or teams to export.'}</div></div>
   <div class="card"><h3>2 · What goes in</h3>${aiPurpose('Choose the files: game files carry names, players and ratings; images carry crests, logos, kits and photos.')}
    <div class="expgrp"><b>Game files</b>
     ${chk('ted',`Team files (.ted) for <b>Import Team</b>: names, players, numbers, ratings, skills, with the crest, kits and manager photo named inside${exp('experimental')} <span class="muted small">${nT} of ${scope.teams.length} teams${nG?', '+nG+' on the generic template':''}</span>`,!nT)}
     ${sub('newPlayers','Also write players no game file has, under IDs the game already has (an unregistered player\'s, for example). Off: they are left out. The game never creates a player from a team file, and it refuses the whole team if one isn\'t in the game',!(nT&&P.ted))}
     ${sub('realIds','Use their real game ID when known, so the existing game player is updated instead of copied'+exp('experimental'),!(nT&&P.ted&&P.newPlayers))}
     ${chk('ced',`Competition files (.ced) for <b>Import Competition</b>: name and logo${exp('experimental')} <span class="muted small">${nC} of ${scope.comps.length} competitions</span>`,!nC)}
     <p class="small muted" style="margin:2px 0 0">A team or competition has a game file when it came from an option file, when you imported its .ted/.ced, or when it has an in-game ID (generic template).</p></div>
    <div class="expgrp"><b>Images</b>
     ${chk('emblem',`Team crests <span class="muted small">(${sz.emblem}×${sz.emblem})</span>`)}
     ${chk('comp','Competition logos')}
     ${chk('kit','Kit textures','',`<label class="f" style="margin:4px 0 4px 24px;max-width:380px"><span class="sr">Kit texture size</span><select data-ch="kitExport" aria-label="Kit texture size" ${P.kit?'':'disabled'}>${opts([['keep','Full size (Strip L, up to 2048)'],['1024','Smaller: 1024 (Strip S)']],S.settings.kitExport)}</select></label>`)}
     ${chk('manager','Manager photos <span class="muted small">(a placeholder for teams without one)</span>')}
     <label class="c"><input type="checkbox" data-act="expPart" data-k="stadium" ${P.stadium!==false?'checked':''}> <span>Stadium images <span class="muted small">(drawn for teams without one)</span></span></label>
     <label class="c"><input type="checkbox" data-act="expPart" data-k="sponsor" ${P.sponsor!==false?'checked':''}> <span>Sponsor &amp; press-room boards <span class="muted small">(drawn for empty slots)</span></span></label>
     ${pk?sub('ofAll','Also include images your option file already has (normally left out)',false):''}</div>
    <div class="expgrp"><b>Extras</b>
     ${chk('sheet','Update Sheet: a readable checklist for names, players, ratings and kits','',`<label class="f" style="margin:4px 0 4px 24px;max-width:380px"><span class="sr">Update Sheet contents</span><select data-ch="expSheet" aria-label="Update Sheet contents" ${P.sheet?'':'disabled'}>${opts([['auto','Changes since the baseline (everything if none)'],['changes','Changes only'],['full','Everything']],E.sheetMode)}</select></label>`)}
     ${chk('csv','CSV files: players, teams, competitions')}</div></div></div>
  <div class="card" style="margin-top:16px"><h3>3 · Folders and batches</h3>${aiPurpose('How the package is laid out on the drive, and how many teams you import at a time.')}
   <div class="grid g2" style="gap:10px;max-width:760px"><label class="f">Teams per batch<select data-ch="expBatch">${opts([[10,'10'],[20,'20'],[25,'25 (recommended)'],[40,'40'],[9999,'All in one']],E.batch)}</select></label>
    <label class="f">Folder layout<select data-ch="expLayout">${opts([['prefix','One WEPES folder, files numbered by batch'],['stages','STAGE1, STAGE2 … each with its own WEPES']],E.layout)}</select></label></div>
   <p class="small muted" style="margin:10px 0 0">${nOf?'Images of teams and competitions from the option file keep their option-file names. ':''}Other images get a short ASCII name from the in-game ID (E_000101.png, M_000101.png, K_000101_H.png), at most ${PES_NAME_MAX} characters, unique in the package and in the same folder as the game file that names them. Importing about 25 teams at a time avoids the errors option-file makers report with very large batches.</p>
   <div class="row" style="margin-top:12px"><button class="primary" data-act="buildPkg" ${scope.teams.length||scope.comps.length?'':'disabled'}>Build package</button><span class="small muted">Nothing is downloaded until you choose to.</span></div></div>
  ${S.ui.build?buildView():''}
  <div style="margin-top:16px">
   <div class="card"><h3>Past exports</h3>${aiPurpose('The packages built here, newest first.')}${(S.settings.exports||[]).slice(-5).reverse().map(x=>`<div class="small">${fmtDate(x.at)} · ${x.teams} teams · ${x.files} files</div>`).join('')||'<p class="small muted">None yet.</p>'}</div></div>`};
// a Claude request in progress: the busy bar says "waiting for Claude" only then; other work just says "working…"
{const _gs=getSample;let W=null;getSample=async()=>{const s=await _gs();if(!s)return s;if(W&&W.base===s)return W.fn;
  const fn=async(p,o)=>{S.ui.ai.claudeBusy=(S.ui.ai.claudeBusy||0)+1;progRender();try{return await s(p,o)}finally{S.ui.ai.claudeBusy--;progRender()}};W={base:s,fn};return fn}}
