// PES 2021 Option Studio: the DATA bucket (the user, 2026-11-25).
// The parts are one program in one global scope, loaded in order by index.html. Nothing here runs while the file loads.
"use strict";
/* ================= Bucket 1 of 4: data =================
   Squads, player details, ratings and game IDs, the coach's name, the stadium's name, a league's team list.
   ONE ORDER, here and nowhere else:
     FIFA            only for a national team, and only when it is in the newest World Cup
     eFootball       squads with game IDs; players by ID or by name; the coach; a league's teams
     Transfermarkt   squads by club; a player's age, height, nationality and foot; coach and stadium; a top league's teams
     Wikipedia       a club's current squad (no player details: it is skipped for those)
     EA SPORTS FC    last: details and ratings the others left open
   A source that cannot supply what is asked is not asked. Each source is asked once per team in a job (freeState). What this
   bucket leaves open goes to the club-info bucket (app-bucket-info.js), and what every free bucket leaves open is listed
   in Process and Review → Ask Claude (app-bucket-claude.js). Claude is never asked from here. */
const DATA_ORDER=['eFootball','Transfermarkt','Wikipedia','EA SPORTS FC'];
const DATA_ORDER_TEXT='FIFA for a national team in the World Cup, then eFootball, Transfermarkt, Wikipedia, and EA SPORTS FC last for the details and ratings still open';
// errors that mean "try again later", not "this source doesn't have it": the queue retries the job
const srcBusy=e=>/busy|rate|limit|unavailable|timeout|network|could not reach/i.test((e&&e.message)||'');

/* ---- a team's squad ----
   Returns a clone of the team with its players, the links the sources gave (efId, tmId, wpTitle) and _src, the sources
   that answered joined by " + ". Throws when no source has the team (the message names each source and why). */
async function dataSquad(base,signal){let inc=null;const why=[];
  // FIFA: a national team in the newest World Cup
  if(isNationalTeam(base)&&fcAvailable()){
    try{if(await fifaTeamFor(base,signal)){inc=await fifaDraftTeam(base,signal);delete inc._what}}
    catch(e){if(e.name==='AbortError')throw e;why.push('FIFA: '+e.message);aiLog('  FIFA: '+e.message)}}
  // eFootball
  if(!inc){try{inc=await efDraftTeam(base,signal)}
    catch(e){if(e.name==='AbortError')throw e;why.push('eFootball: '+e.message);aiLog('  eFootball: '+e.message+'; trying Transfermarkt')}}
  // Transfermarkt, then Wikipedia. Transfermarkt's data set lags: when its club data is from before this season, Wikipedia's
  // current squad is taken instead whenever it has one that is newer and complete (rule book, "Which source supersedes which")
  if(!inc){let tm=null;
    try{tm=await tmDraftTeam(base,signal)}
    catch(e){if(e.name==='AbortError')throw e;why.push('Transfermarkt: '+e.message);aiLog('  Transfermarkt: '+e.message+'; trying Wikipedia')}
    const stale=tm&&tm._season&&tm._season<seasonYear();
    if(tm&&!stale)inc=tm;
    else{if(stale)aiLog('  Transfermarkt\'s data for '+base.name+' is from '+tm._season+'/'+String(tm._season+1).slice(2)+'; checking Wikipedia for the '+S.settings.season+' team');
      try{const wp=await wpDraftTeam(base,signal);const asOf=Date.parse(wp._asOf||'');delete wp._asOf;
        if(tm&&isFinite(asOf)&&asOf<new Date(seasonYear(),6,1).getTime()){aiLog("  Wikipedia's list is from "+new Date(asOf).toLocaleDateString()+', no newer: Transfermarkt kept');inc=tm}
        else if(tm&&wp.players.length<15)inc=tm;
        else{if(tm){wp.tmId=tm.tmId;wp.manager=wp.manager&&wp.manager.name?wp.manager:tm.manager;wp.stadium=wp.stadium||tm.stadium}inc=wp}}
      catch(e){if(e.name==='AbortError')throw e;why.push('Wikipedia: '+e.message);if(tm)inc=tm}}}
  if(!inc)throw new Error(why.join('; ')||'no free source has this team');
  const src=inc._src||'eFootball';delete inc._season;
  // EA SPORTS FC, last: the details and ratings the squad source left open
  if(fcAvailable()){const need=(inc.players||[]).filter(p=>playerGaps(p).some(g=>g!=='number'));
    if(need.length){try{const hit=await fcLookup(need.map(p=>({p,t:inc})),signal);
        if(hit.size){inc.players=inc.players.map(p=>{const r=hit.get(p.id);return r?fcApply(p,r):p});
          aiLog('  EA SPORTS FC: '+hit.size+' of '+need.length+' incomplete player'+(need.length===1?'':'s')+' filled');inc._src=src+' + EA SPORTS FC';return inc}}
      catch(e){if(e.name==='AbortError')throw e;aiLog('  EA SPORTS FC: '+e.message)}}}
  inc._src=src;return inc}

/* ---- players already in squads: details, ratings and game IDs ----
   ids: player ids. opts.rate: also refresh the ratings of players who have some (EA SPORTS FC).
   Returns {inc: the teams as the sources leave them (clones, by team id), n: players changed, src: [sources that answered],
   left: [{t, p, gaps}] what no source had}. Nothing is saved here: the caller sends one batch to Process and Review. */
async function dataPlayers(ids,signal,opts={}){const found=ids.map(findPlayer).filter(Boolean);const inc={},src=new Set();let n=0;
  found.forEach(({t})=>{inc[t.id]=inc[t.id]||clone(t)});
  const cur=(tid,pid)=>inc[tid].players.find(x=>x.id===pid);
  const put=(tid,pid,q)=>{const T=inc[tid],k=T.players.findIndex(x=>x.id===pid);if(k>=0){T.players[k]=q;return true}return false};
  const changed=new Set();
  // 1. eFootball: by his game ID, else by his name in the team's eFootball squad
  try{const want=new Map(),byTeam={};
    for(const {p,t} of found){if(+p.gameId&&!isEditId(p.gameId))want.set(+p.gameId,{pid:p.id,tid:t.id});else(byTeam[t.id]=byTeam[t.id]||[]).push(p)}
    for(const [tid,ps] of Object.entries(byTeam)){if(signal.aborted)break;let ef=null;
      try{ef=await efTeamFor(S.teams[tid],signal)}catch(e){if(e.name==='AbortError')throw e}
      if(!ef){aiLog('  '+S.teams[tid].name+': not in the eFootball database');continue}
      const sq=(await efApi('squad?team='+ef.id,signal)).squad||[];
      ps.forEach(p=>{const h=sq.find(x=>samePlayer(x.name,p.name));if(h)want.set(h.id,{pid:p.id,tid})})}
    if(want.size){let k=0;(await efPlayersByIds([...want.keys()],signal)).forEach(r=>{const w=want.get(+r.id);if(!w)return;
        const p=cur(w.tid,w.pid);if(p&&put(w.tid,w.pid,efMerge(p,r,isNationalTeam(inc[w.tid])))){k++;changed.add(w.pid)}});
      if(k){src.add('eFootball');aiLog('  eFootball: '+k+' of '+found.length+' players')}}}
  catch(e){if(e.name==='AbortError')throw e;if(srcBusy(e))throw e;aiLog('  eFootball: '+e.message)}
  const open=()=>found.map(({p,t})=>({t,p:cur(t.id,p.id)||p})).filter(x=>playerGaps(x.p).some(g=>g!=='number'));
  // 2. Transfermarkt: age, height, nationality and foot, for a player it has at this club (exactly one match)
  {const need=open().filter(x=>!isNationalTeam(x.t)&&['age','height','nationality'].some(g=>playerGaps(x.p).includes(g)));
    if(need.length&&!signal.aborted){try{const tm=await tmPlayersByNames(need.map(x=>x.p.name),signal);let k=0;
        need.forEach(({t,p})=>{const fit=tmAgeFits(tm.get(p.name),+p.age?[+p.age]:[]).filter(x=>(t.tmId&&x.club.id===t.tmId)||(x.club.name&&(strictName(x.club.name,t.name)>=0.85||nameScore(x.club.name,t.name)>=0.9)));
          if(fit.length!==1)return;const r=fit[0],q=clone(p);let ch=false;
          if(!q.age&&r.born){const a=tmAge(r.born);if(a){q.age=a;ch=true}}
          if(!q.height&&+r.height){q.height=+r.height;ch=true}
          if(!q.nat&&!+q.countryId&&!(q.ted&&+q.ted.pid)&&r.nat){q.nat=r.nat;ch=true}
          if(ch&&put(t.id,p.id,normPlayer(q))){k++;changed.add(p.id)}});
        if(k){src.add('Transfermarkt');aiLog('  Transfermarkt: '+k+' of '+need.length+' players')}}
      catch(e){if(e.name==='AbortError')throw e;aiLog('  Transfermarkt: '+e.message)}}}
  // 3. Wikipedia has no player details: skipped.
  // 4. EA SPORTS FC, last: what is still open, and the ratings when a refresh was asked for
  if(fcAvailable()&&!signal.aborted){const need=opts.rate?found.map(({p,t})=>({t,p:cur(t.id,p.id)||p})):open();
    if(need.length){try{const hit=await fcLookup(need,signal);let k=0;
        need.forEach(({t,p})=>{const r=hit.get(p.id);if(r&&put(t.id,p.id,fcApply(p,r,{rate:!!opts.rate}))){k++;changed.add(p.id)}});
        if(k){src.add('EA SPORTS FC');aiLog('  EA SPORTS FC: '+k+' of '+need.length+' players')}}
      catch(e){if(e.name==='AbortError')throw e;aiLog('  EA SPORTS FC: '+e.message)}}}
  n=changed.size;
  const left=open().map(x=>({t:x.t,p:x.p,gaps:playerGaps(x.p).filter(g=>g!=='number')}));
  // only teams something changed in go to the batch
  Object.keys(inc).forEach(tid=>{if(!inc[tid].players.some(p=>changed.has(p.id)))delete inc[tid]});
  return{inc,n,src:[...src],left,total:found.length}}

/* ---- the coach's name and photo, the stadium's name: what the data sources know of a club ----
   x is a clone of the team; only what it still misses is filled. Returns the sources that answered. */
async function dataCoach(x,signal,st){x.manager=x.manager||{name:'',nat:'',age:''};const src=[];let k=0;
  const i=await artEf(x,signal,st);const c=i&&i.coach;if(i&&i.efId&&!x.efId)x.efId=i.efId;
  if(c&&c.photo){if(!x.manager.name){x.manager.name=c.name;k++;src.push('eFootball')}
    if(!x.managerPhoto&&norm(x.manager.name)===norm(c.name)){
      try{x.managerPhoto=(await addImageFromBlob(await efImage(c.photo,signal),'manager',c.name+' (eFootball)')).id;k++;src.push('eFootball')}catch(e){if(e.name==='AbortError')throw e}}}
  if(!x.manager.name&&!isNationalTeam(x)){const d=await artTm(x,signal,st);if(d&&d.coach){x.manager.name=d.coach;k++;src.push('Transfermarkt')}}
  return{k,src}}
async function dataStadium(x,signal,st){if(isNationalTeam(x))return null;const d=await artTm(x,signal,st);if(d&&d.stadium){x.stadium=d.stadium;return'Transfermarkt'}return null}

/* ---- a league's teams this season: eFootball's league list, then Transfermarkt's top league of the country ----
   Returns {src, list:[{name, efId?, stadium?}]}, or {why} when neither lists it. */
async function dataLeagueTeams(c,signal){const k=lgKey(c);if(!k)return{why:'the free sources don\'t list this competition'};
  let src='',list=[];const down=[];
  try{const idx=await efIndex(signal);const lg=new Map();idx.teams.forEach(t=>{(lg.get(t.league)||lg.set(t.league,[]).get(t.league)).push(t)});
    for(const [slug,ts] of lg){const e=efLgKey(slug);if(e&&e[0]===k[0]&&e[1]===k[1]){list=ts.map(t=>({name:t.shown||t.name,efId:+t.id}));src='eFootball';break}}}
  catch(e){if(signal&&signal.aborted)throw e;down.push('eFootball ('+(e.message||e)+')');aiLog('  Could not connect to eFootball: '+(e.message||e))}
  if(!list.length&&k[1]===1){
    try{const r=await fetch('api/tm/league?country='+encodeURIComponent(k[0]),{signal});
      if(r.ok){const o=await r.json();list=(o.clubs||[]).map(x=>({name:x.name,stadium:x.stadium||''}));if(list.length)src='Transfermarkt, season '+o.season}
      else if(r.status!==404)down.push('Transfermarkt (error '+r.status+')')}
    catch(e){if(signal&&signal.aborted)throw e;down.push('Transfermarkt ('+(e.message||e)+')');aiLog('  Could not connect to Transfermarkt: '+(e.message||e))}}
  if(list.length<4)return{why:down.length?'COULD NOT CONNECT to '+down.join(' and ')+', so the league was not looked up there':'the free sources have no team list for '+k[0]+(k[1]===2?', second tier':'')};
  return{src,list,country:k[0]}}
