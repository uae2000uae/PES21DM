// PES 2021 Option Studio: LIVE UPDATE, the one way data comes in from outside (the user, 2026-11-25).
// The parts are one program in one global scope, loaded in order by index.html. Nothing here runs while the file loads
// except registering the job types.
"use strict";
/* ================= Live update: the planner over the buckets =================
   "i need all commands to use all available sources in order ... make module for each bucket. make the system efficient in
   using those buckets. keep the least number of buckets."
   Every command that brings data in says WHAT it needs for WHICH teams, players or competition. It never names a source.
   The planner runs the free buckets in order and stops as soon as everything asked for is filled:
     1 data       app-bucket-data.js     squad, player details, coach, stadium, a league's teams
     2 club info  app-bucket-info.js     stadium, coach, colours the data bucket left open
     3 images     app-bucket-images.js   crest, competition logo
   What they leave open is listed in Process and Review → Ask Claude (bucket 4, app-bucket-claude.js). Claude is never
   asked from here. One job, one batch in Process and Review; each source is asked once per team in a job (freeState).
   NEEDS: squad, details (the players' details, ratings and IDs), crests, coaches, stadiums, colours, stadiumImgs, logos.
   JOBS:  live     one team {teamId | virtual, needs} or a list of players {ids, rate}
          freeArt  many teams and competitions {teamIds, compIds, opts (the needs), which}   (runFreeArt, app-live-update.js)
          compFree a competition's team list {compId} */
const LIVE_TEAM=['squad','crests','coaches','stadiums'];
const LIVE_ORDER_TEXT=DATA_ORDER_TEXT+'. Coach, stadium and colours still missing: TheSportsDB, then Wikidata. Crests and logos: '+IMG_ORDER_TEXT+'. What none of them has waits in Process and Review under Ask Claude';
/* Fill what a team still misses of these needs, bucket by bucket. x is a clone of the team.
   Returns {k: items found, got: ['crest (source)'], src: [sources], left: [needs asked for and still open]}. */
async function liveFill(x,needs,signal,st,which){const o=new Set(needs),nat=isNationalTeam(x),got=[],src=[],left=[];let k=0;st=st||freeState();
  if(o.has('coaches')&&missCoach(x)){const s=[];
    const r=await dataCoach(x,signal,st);if(r.k){k+=r.k;s.push(...r.src)}                                           // bucket 1
    if(!x.manager||!x.manager.name){const w=await infoCoach(x,signal,st);if(w){k++;s.push(w)}}                       // bucket 2
    if(s.length){src.push(...s);got.push('coach ('+[...new Set(s)].join(', ')+')')}
    if(!x.manager||!x.manager.name)left.push('coaches')}
  if(o.has('stadiums')&&!x.stadium&&!nat){
    const s=(await dataStadium(x,signal,st))||(await infoStadium(x,signal,st));                                     // bucket 1, then 2
    if(s){k++;src.push(s);got.push('stadium ('+s+')')}else left.push('stadiums')}
  if(o.has('colours')&&!nat&&artDefaultColours(x)){const s=await infoColours(x,signal,st);if(s){k++;src.push(s);got.push('colours ('+s+')')}}   // bucket 2
  if(o.has('crests')&&artNeedImg(x,which||'missing')){const s=await imgCrest(x,signal,st);                           // bucket 3
    if(s){k++;src.push(s);got.push('crest ('+s+')')}else if(missCrest(x))left.push('crests')}
  return{k,got,src,left}}
// what the free buckets left open for a team that is in the project: listed for Process and Review → Ask Claude
function liveLeft(t,left){if(!t||!S.teams[t.id])return;
  if(left.includes('crests'))askAdd({kind:'crest',teamId:t.id});
  const info=left.filter(k=>k==='coaches'||k==='stadiums');if(info.length)askAdd({kind:'manager',teamId:t.id,why:info.map(k=>k==='coaches'?'coach':'stadium').join(' and ')+' not found'})}

// ---- one team
async function runLiveTeam(j,signal){const season=j.season||S.settings.season;const base=S.teams[j.teamId]||j.virtual;if(!base)throw new Error('team no longer exists');
  const saved=!!S.teams[base.id],needs=new Set(j.needs&&j.needs.length?j.needs:LIVE_TEAM),st=freeState(),got=[];let inc=clone(base),squad=false,players=0;
  const asked=!!(j.asked&&j.parts);// asked of Claude in Process and Review (a new competition's clubs): Claude drafts what the free buckets lack
  if(needs.has('squad')){
    try{inc=await dataSquad(inc,signal);got.push(...String(inc._src||'eFootball').split(' + '));squad=true}
    catch(e){if(e.name==='AbortError')throw e;if(srcBusy(e))throw e;aiLog('  '+base.name+': no team in the free sources ('+e.message+')');
      if(asked){inc=await draftTeam(clone(base),new Set(j.parts.filter(k=>k!=='crest')),season,signal);got.push('Claude');squad=true}
      else if(saved&&(base.players||[]).length<15)askAdd({kind:'squad',teamId:base.id,why:e.message})
      else if(!saved)askAdd({kind:'newteam',teamId:'v:'+norm(base.name),name:base.name,virtual:base,why:e.message})}
    if(squad&&asked&&!got.includes('Claude')){const rest=new Set(j.parts.filter(k=>k==='manager'||k==='kits'));
      if(rest.size){const ex=await draftTeam(inc,rest,season,signal);ex.players=inc.players;ex.efId=inc.efId;inc=ex;got.push('Claude')}}}
  else if(needs.has('details')&&saved){const ids=(base.players||[]).filter(p=>playerGaps(p).some(g=>g!=='number')).map(p=>p.id);
    if(ids.length){const r=await dataPlayers(ids,signal,{});if(r.inc[base.id]){inc.players=r.inc[base.id].players;players=r.n;got.push(...r.src)}livePlayersLeft(r.left,j)}}
  ['_src','_season','_asOf','_what'].forEach(k=>delete inc[k]);
  let fill={k:0,got:[],src:[],left:[]};
  try{fill=await liveFill(inc,[...needs].filter(k=>k!=='squad'&&k!=='details'),signal,st,j.which);if(fill.k)aiLog('  '+base.name+': '+fill.got.join(', '))}
  catch(e){if(e.name==='AbortError')throw e;aiLog('  '+base.name+': '+e.message)}
  got.push(...fill.src);liveLeft(base,fill.left);
  if(fill.left.length||(!squad&&needs.has('squad')&&!asked))aiLog('  '+base.name+': what the free sources did not have is listed in Process and Review under Ask Claude');
  if(!squad&&!fill.k&&!players){aiLog('  '+base.name+': nothing new found');return}
  const by=[...new Set(got)];
  finishBatch(batchFromData({teams:{[inc.id]:inc},comps:{}},{title:(by.join(' + ')||'Live update')+': '+inc.name,source:by[0]||'free sources',removeMissing:squad,teamScope:[inc.id]}))}

// ---- a list of players
function livePlayersLeft(left,j){const by=new Map();left.forEach(x=>{(by.get(x.t.id)||by.set(x.t.id,{t:x.t,ps:[]}).get(x.t.id)).ps.push(x)});
  by.forEach(({t,ps})=>{if(!S.teams[t.id])return;askAdd({kind:'details',teamId:t.id,ids:ps.map(x=>x.p.id),gaps:Object.fromEntries(ps.map(x=>[x.p.id,x.gaps]))});
    aiLog('  '+t.name+': '+ps.length+' player'+(ps.length===1?'':'s')+' still missing details no free source has: listed in Process and Review under Ask Claude')})}
async function runLivePlayers(j,signal){const ids=(j.ids||[]).filter(id=>findPlayer(id));if(!ids.length){aiLog('  Those players are no longer in the project');return}
  const r=await dataPlayers(ids,signal,{rate:!!j.rate});
  // shirt numbers are worked out here, not looked up (a health check fix gives them on the spot, as it always did)
  if(j.autoApply){const ts=new Map(ids.map(findPlayer).filter(Boolean).map(x=>[x.t.id,x.t]));ts.forEach(t=>{if((t.players||[]).some(p=>!p.number))histLabel('Health check: numbers for '+t.name,'Health',()=>{renumber(t);saveTeam(t)})})}
  aiLog('  '+r.n+' of '+r.total+' players filled'+(r.src.length?' ('+r.src.join(', ')+')':''));
  if(r.n)finishBatch(batchFromData({teams:r.inc,comps:{}},{title:(r.src.join(' + ')||'Live update')+': '+r.n+' player'+(r.n===1?'':'s'),source:r.src[0]||'free sources',removeMissing:false,teamScope:Object.keys(r.inc)}));
  livePlayersLeft(r.left,j)}

// without the studio's server no free source can be reached: everything asked for is listed for Ask Claude
function liveNoServer(j){aiLog('  The free sources are reached through the studio\'s server (start.bat or the website). What was asked for is listed in Process and Review under Ask Claude');
  if(j.ids){const by=new Map();j.ids.map(findPlayer).filter(Boolean).forEach(({p,t})=>{const g=playerGaps(p).filter(k=>k!=='number');if(g.length)(by.get(t.id)||by.set(t.id,[]).get(t.id)).push({t,p,gaps:g})});by.forEach(L=>livePlayersLeft(L,j));return}
  const t=S.teams[j.teamId];if(!t)return;const needs=new Set(j.needs&&j.needs.length?j.needs:LIVE_TEAM);
  if(needs.has('squad')&&(t.players||[]).length<15)askAdd({kind:'squad',teamId:t.id,why:'the free sources need the studio\'s server'});
  liveLeft(t,[needs.has('crests')&&missCrest(t)&&'crests',needs.has('coaches')&&missCoach(t)&&'coaches',needs.has('stadiums')&&!t.stadium&&!isNationalTeam(t)&&'stadiums'].filter(Boolean))}

JOB_RUN.live=async(j,signal)=>{if(!efAvailable())return liveNoServer(j);return j.ids?runLivePlayers(j,signal):runLiveTeam(j,signal)};
JOB_KIND.live='Live update';

// ---- a competition's teams this season (the data bucket's league lists). j.asked: it was asked of Claude in Process and
// Review, so the clubs new to the project are built in full (free buckets first)
async function runLiveComp(c,season,signal,j={}){jobStage('free');aiLog('Looking for the teams of '+c.name+' in the free sources…');
  const r=await dataLeagueTeams(c,signal);
  if(r.why){aiLog('  '+c.name+': '+r.why+'. It is listed in Process and Review under Ask Claude');askAdd({kind:'comp',teamId:'c:'+c.id,compId:c.id,why:r.why});return}
  aiLog('  '+r.src+' lists '+r.list.length+' teams');
  const virt={},seen=new Set(),fresh=[];
  r.list.forEach(rt=>{const ex=(rt.efId&&teamsArr().find(t=>!t.sameAs&&+t.efId===rt.efId))||findClub(rt.name,c.country||r.country);
    if(!ex){const t=newTeam({name:rt.name,short:shortName(rt.name).toUpperCase().slice(0,3),country:c.country||r.country,stadium:rt.stadium||'',compId:c.id});if(rt.efId)t.efId=rt.efId;fresh.push(t);virt[t.id]=t;return}
    seen.add(ex.id);const t=clone(ex);t.compId=c.id;virt[t.id]=t});
  const notes=compUnlisted(c,seen,season);
  if(fresh.length)notes.push(fresh.length+' team'+(fresh.length===1?' is':'s are')+' new to the project and come'+(fresh.length===1?'s':'')+' in without players: '+fresh.map(t=>t.name).join(', ')+'. After applying, the health check offers Live update for each.');
  const inc=clone(c);inc.season=season;
  const b=batchFromData({comps:{[c.id]:inc},teams:virt},{title:'Live update: '+c.name+' teams ('+r.src+')',source:r.src,removeMissing:false,teamScope:[]});b.notes=[...notes,...(b.notes||[])];finishBatch(b);
  if(j.asked)queueNewClubs(fresh,season)}
JOB_RUN.compFree=async(j,signal)=>{const c=S.comps[j.compId];if(!c)throw new Error('competition no longer exists');
  if(!efAvailable()){askAdd({kind:'comp',teamId:'c:'+c.id,compId:c.id,why:'the free sources need the studio\'s server'});aiLog('  '+c.name+': listed in Process and Review under Ask Claude');return}
  return runLiveComp(c,j.season||S.settings.season,signal,j)};
JOB_KIND.compFree='Live update';
