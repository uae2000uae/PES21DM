// PES 2021 Option Studio, part 3 of 14: Claude requests, progress, Process and Review, Compare.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= Claude (sample capability) ================= */
let SAMPLE=null;
async function getSample(){if(SAMPLE)return SAMPLE;const C=window.claude;if(!C||!C.use)return null;SAMPLE=await C.use('sample');return SAMPLE}
// RULE (rule book, "Sources in order"): free sources first, then Claude's own knowledge, then Claude web search. Claude searches
// the web only when its own knowledge fell short (opts.web) and web search is switched on; when it is off it is never attempted.
const webAllowed=()=>!!(window.claude&&window.claude.standalone)&&S.settings.aiWeb!=='off';
async function aiText(prompt,signal,opts={}){
  const s=await getSample();if(!s)throw new Error('Claude isn\'t available. Start the site with start.bat (or server.py) and add your Anthropic API key to the .env file.');
  for(let attempt=0;attempt<3;attempt++){
    const web=!!opts.web&&webAllowed()&&!/^Design an ORIGINAL/.test(prompt);if(typeof jobStage==='function')jobStage(web?'web':'claude');
    const squadAsk=/first-team squad/.test(prompt);
    const p2=web&&squadAsk?prompt+`\n\nBefore answering, find the club's current squad page on the web: its English Wikipedia article (section "Players" or "Current squad"), its Transfermarkt squad page ("kader"), or the club's or league's own site. Open the page with web_fetch and read the WHOLE list: search results show only the start of a page, which is why squads read from them stop after the goalkeepers and defenders. A club that has just been promoted is listed on these pages like any other. Then reply in exactly the format asked above, with no other text.`
      :web?prompt+`\n\nBefore answering, search the web for the latest information for season ${S.settings.season}. Look first in the eFootball database on PES Master (www.pesmaster.com, eFootball team and player pages: current squads, positions and ratings on the same scale as PES 2021), then official club and league sites, Transfermarkt, Wikipedia and recent news. Prefer the newest reliable source; your own knowledge may be out of date. Then reply in exactly the format asked above, with no other text.`:prompt;
    try{const r=await s(p2,{modelTier:S.settings.aiTier||'complex',signal,cache:false,web});if(!S.ui.ai.noStep)progStep();return r.text}
    catch(e){if(e&&e.code==='rate_limited'&&attempt<2){aiLog('Claude is busy, waiting 20 seconds…');await sleep(20000);continue}
      if(e&&e.code==='not_granted')throw new Error('Permission to ask Claude was not granted.');throw new Error(e&&e.message||'Claude request failed')}
  }
}
async function aiJSON1(prompt,signal,opts={}){
  const t=await aiText(prompt,signal,opts);try{return parseLoose(t)}catch(e){
    aiLog('Reply was not clean JSON ('+e.message+'), asking again. It began: '+String(t||'').trim().slice(0,300));const t2=await aiText(prompt+'\n\nYour previous reply could not be parsed. Reply with valid JSON only, no comments, no trailing commas.',signal,opts);
    try{return parseLoose(t2)}catch(e2){throw new Error('Claude\'s reply could not be read as JSON twice ('+e2.message+'). It began: '+String(t2||'').trim().slice(0,300))}}
}
// a reply with nothing in it: every list empty
const thinReply=r=>{if(Array.isArray(r))return r.length?'':'had nothing';const a=r&&typeof r==='object'?Object.values(r).filter(Array.isArray):[];return a.length&&a.every(x=>!x.length)?'had nothing':''};
// Claude's own knowledge first; when that falls short (opts.escalate says why, else an empty reply) and web search is on, the web
async function aiJSON(prompt,signal,opts={}){const r=await aiJSON1(prompt,signal,opts);
  if(opts.web||!webAllowed())return r;const why=(opts.escalate||thinReply)(r);if(!why)return r;
  aiLog('  Claude\'s own knowledge '+why+': searching the web…');return aiJSON1(prompt,signal,Object.assign({},opts,{web:true}))}
let AI_TRACE=null; // log lines of the task now running, saved with it if it fails
function aiLog(msg){S.ui.ai.log.push(new Date().toLocaleTimeString()+'  '+msg);if(AI_TRACE&&AI_TRACE.length<200)AI_TRACE.push(new Date().toLocaleTimeString()+'  '+String(msg).trim());const el=$('#ai-log');if(el){el.textContent=S.ui.ai.log.join('\n');el.scrollTop=el.scrollHeight}S.ui.ai.label=msg.trim();progRender()}
const ATTR_SPEC=ATTRS.map(a=>`"${a[0]}" (${a[1]})`).join(', ');
const squadPages=t=>[t.wpTitle?'https://en.wikipedia.org/wiki/'+encodeURIComponent(String(t.wpTitle).replace(/ /g,'_')):'',t.tmId?'https://www.transfermarkt.com/x/kader/verein/'+t.tmId:''].filter(Boolean);
function rosterPrompt(team,season,compName){const pages=squadPages(team);
  return `You are a football data editor preparing an option-file update for eFootball PES 2021 on PlayStation.
Team: "${team.name}"${team.country?' ('+team.country+')':''}${compName?', competition: '+compName:''}. Target season: ${season}.
${pages.length?'Pages known to list this club\'s squad: '+pages.join(' , ')+'\n':''}Using your most up-to-date knowledge, give the current first-team squad (normally 23 to 32 players) and club details.
Reply with JSON only, in exactly this shape:
{"team":{"name":"official club name","short":"3-letter code","country":"","stadium":"","manager":{"name":"","nat":"","age":0},"formation":"one of ${FORMATIONS.join(', ')}","playstyle":"one of ${PLAYSTYLES.join(', ')}","colors":["#rrggbb","#rrggbb"],
"kits":[{"slot":"1st","shirt":"#rrggbb","second":"#rrggbb","shorts":"#rrggbb","socks":"#rrggbb","sponsor":"main shirt sponsor"},{"slot":"2nd",...},{"slot":"GK 1st",...}]},
"players":[{"name":"Full name","shirtName":"NAME ON SHIRT","number":10,"pos":"CF","age":25,"nat":"Country","height":180,"weight":75,"foot":"R"}],
"knowledgeNote":"one short sentence saying how current your squad knowledge is"}
"pos" must be one of: ${POS.join(', ')}. "foot" is "R" or "L".
List the WHOLE squad: goalkeepers, defenders, midfielders and forwards. Squad pages (Transfermarkt, club sites, Wikipedia) list goalkeepers and defenders first and search results are often cut off partway; if what you read stops before the midfielders and forwards, read the rest of the page or another source before answering. Do not invent players; if unsure about a recent transfer, follow the most recent information you have.
If the ${season} squad isn't published or you can't confirm it, give the most recent squad you can verify (for example the end of the previous season, with confirmed transfers applied) and set "squadSeason" to the season it reflects. Reply with "players": [] only if the club no longer has a first team; never invent players or list a partial squad.
Add "squadSeason":"YYYY/YY" next to "knowledgeNote".`;
}
function statsPrompt(list,season){
  return `Rate these footballers for eFootball PES 2021 so the ratings match their current real-world level for season ${season}.
Use the PES 2021 scale: abilities 40-99. Typical overalls: world-class 88-94, elite starters 82-87, solid top-flight starters 75-81, squad players 68-74, youth 55-67. Goalkeepers keep outfield-only skills low; outfield players have GK abilities around 40.
Players:
${JSON.stringify(list)}
Reply with a JSON array only, one object per player, in this shape:
[{"key":"p1","attrs":{${ATTR_KEYS.map(k=>`"${k}":70`).join(',')}},"wfUsage":2,"wfAcc":2,"form":5,"injury":2,"style":"playing style","skills":["..."],"comStyles":["..."],"playables":{"SS":"B"}}]
Ability keys: ${ATTR_SPEC}.
wfUsage and wfAcc are 1-4, form 1-8, injury 1-3. "style" must be one of: ${STYLES.join(', ')}.
"skills" only from: ${SKILLS.join(', ')}. "comStyles" only from: ${COM.join(', ')}. "playables" maps other positions (${POS.join(', ')}) to "A","B" or "C".`;
}
function compPrompt(name,country,season){
  return `List the clubs taking part in "${name}"${country?' ('+country+')':''} for season ${season}, for an eFootball PES 2021 option-file update.
Reply with JSON only: {"competition":{"name":"official name","short":"short name","country":"","type":"League or Cup"},"teams":[{"name":"official club name","short":"3-letter code","country":"","stadium":"","league":"the club's domestic league this season"}],"knowledgeNote":"one short sentence on how current this list is"}`;
}
function crestPrompt(team){
  return `Design an ORIGINAL football club crest as an SVG for a club called "${team.name}" (short "${team.short||''}"), main colours ${(team.colors||[]).join(' and ')}.
It must not copy, trace or resemble any real club's crest, logo or trademark: invent a fresh design (shield or roundel, simple geometric motifs, initials).
Rules: viewBox="0 0 256 256", transparent background, only basic shapes (path, circle, rect, polygon, text), fill and stroke attributes, no <style>, no scripts, no images, no external references.
Reply with the SVG only.`;
}
// the season label decides which season Claude is asked about: offer to move on when it is behind today's season
function seasonNote(){const cur=currentSeason();const have=String(S.settings.season||'');if(!/^\d{4}\/\d{2}$/.test(have)||have>=cur)return'';
  return `<div class="warnbox" style="margin-bottom:16px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span>Your season label is <b>${esc(have)}</b>, so Live Updates are for that season. The current season is <b>${cur}</b>.</span><button class="sm primary" data-act="seasonNow" data-season="${cur}">Switch to ${cur}</button></div>`}
ACT.seasonNow=el=>{S.settings.season=el.dataset.season;saveSettings();toast('Season set to '+S.settings.season+'. New Live Updates are for this season.','ok');rerender()};
// VIEWS.ai: the tabbed Live Update page is defined near the end of the script ("Live Update: one page in five tabs")
function aiParts(){return new Set($$('.ai-part').filter(c=>c.checked).map(c=>c.value))}
/* ----- progress tracking: a stack of frames, so nested work (league → team → rating batches) adds up to one bar ----- */
function startAI(total=1){Object.assign(S.ui.ai,{running:true,ctrl:new AbortController(),stack:[{total:Math.max(1,total),done:0}],t0:Date.now(),label:'Starting…',last:null});
  clearInterval(S.ui.ai.tick);S.ui.ai.tick=setInterval(progRender,1000);rerender();return S.ui.ai.ctrl.signal}
function progPush(total){const st=S.ui.ai.stack;if(st&&S.ui.ai.running)st.push({total:Math.max(1,total),done:0})}
function progSetTotal(total){const st=S.ui.ai.stack;if(st&&st.length>1){const f=st[st.length-1];f.total=Math.max(1,total,f.done)}progRender()}
function progStep(){const st=S.ui.ai.stack;if(st&&st.length){const f=st[st.length-1];f.done=Math.min(f.total,f.done+1)}progRender()}
function progPop(){const st=S.ui.ai.stack;if(st&&st.length>1){st.pop();const f=st[st.length-1];f.done=Math.min(f.total,f.done+1)}progRender()}
function progPct(){const st=S.ui.ai.stack||[];let v=0;for(let i=st.length-1;i>=0;i--){v=Math.min(1,(st[i].done+v)/st[i].total)}return v}
function fmtDur(ms){const s=Math.round(ms/1000);return s<60?s+' s':Math.floor(s/60)+' min'+(s%60&&s<600?' '+(s%60)+' s':'')}
function progInfo(){const a=S.ui.ai;
  if(a.running){const p=progPct();const el=Date.now()-a.t0;const eta=p>0.04?fmtDur(el*(1-p)/p)+' left':'estimating…';return{cls:'',pct:Math.round(p*100),w:p*100,label:a.label||'Working…',right:eta}}
  if(a.busy&&a.busyN&&a.busyN.total>0){const n=a.busyN,p=Math.min(1,n.done/n.total);const el=Date.now()-n.t0;
    return{cls:'',pct:Math.round(p*100),w:p*100,label:a.busy,right:p>0.03&&el>1500?fmtDur(el*(1-p)/p)+' left':'estimating…'}}
  if(a.busy)return{cls:'indet',pct:null,w:35,label:a.busy,right:a.claudeBusy?'waiting for Claude':'working…'};
  if(a.last)return a.last;return null}
function progHTML(){const i=progInfo();if(!i)return'';return `<div class="aiprog ${i.cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" ${i.pct!=null?`aria-valuenow="${i.pct}"`:''}><div class="bar"><i style="width:${i.w}%"></i></div><div class="aiprog-t"><span>${i.pct!=null?`<b>${i.pct}%</b> · `:''}${esc(i.label)}</span><span>${esc(i.right)}</span></div></div>`}
function progRender(){const i=progInfo();runDot();
  $$('.aiprog-slot').forEach(sl=>{sl.innerHTML=progHTML()});
  const r=$('#rail-prog');if(r)r.innerHTML=(S.ui.ai.running||S.ui.ai.busy)?progHTML()+(S.ui.ai.running?'<div class="row" style="gap:6px"><button class="sm danger" data-act="aiCancel">Stop</button><a class="small" href="#review">Process and Review</a></div>':''):'';}
async function miniBusy(label,fn){S.ui.ai.busy=label;S.ui.ai.busyN=null;progRender();try{return await fn()}finally{S.ui.ai.busy=null;S.ui.ai.busyN=null;progRender()}}
// progress of a whole file list in the bottom-left bar: done and total over every file (or byte) of the operation, not per file
function busyCount(done,total,label){const a=S.ui.ai;if(!a.busyN||done===0)a.busyN={t0:Date.now(),done:0,total};
  a.busyN.done=Math.max(a.busyN.done,done);a.busyN.total=Math.max(total,a.busyN.done);if(label)a.busy=label;progRender()}
function endAI(){const a=S.ui.ai;const p=progPct();const stopped=a.ctrl&&a.ctrl.signal.aborted;clearInterval(a.tick);
  a.last={cls:stopped?'stopped':'done',pct:stopped?Math.round(p*100):100,w:stopped?p*100:100,label:stopped?'Stopped':a.failedN?'Finished · '+a.failedN+' failed: details in Process and Review':'Finished · results are in Process and Review',right:fmtDur(Date.now()-a.t0)};a.stack=null;
  S.ui.ai.running=false;S.ui.aiPrefill=null;if(['ai','competitions','teams','players','studio'].includes(S.ui.view))rerender();navBadges()}
ACT.aiCancel=()=>{if(S.ui.ai.ctrl)S.ui.ai.ctrl.abort();aiLog('Stopping after the current request…')};
function cleanHexes(o){['shirt','second','shorts','socks'].forEach(k=>{if(o[k]&&!isHex(o[k]))delete o[k]});return o}
async function draftTeam(base,parts,season,signal,label){
  // base: existing team (or virtual new team). Returns incoming team object.
  const comp=S.comps[base.compId];aiLog('Asking Claude for '+base.name+' team…');
  // Claude's own knowledge first; an empty or cut-off squad goes to web search (when it is on)
  const short=x=>{if(!parts.has('roster'))return'';const ps=squadList(x&&x.players);return !ps.length?'found no players':squadGap(ps)?'stops at '+squadGap(ps):''};
  let r=await aiJSON(rosterPrompt(base,season,comp&&comp.name),signal,{escalate:short});let partial='';
  // Claude often stops partway down a squad page (goalkeepers and defenders come first): ask it to carry on from the players it
  // already listed until every line is there. A club we have exists, so an empty reply is asked for again with a search hint.
  if(parts.has('roster')){let ps=squadList(r.players);
    if(!ps.length){aiLog('  No players returned'+(r.knowledgeNote?' (Claude: '+r.knowledgeNote+')':'')+', asking again…');
      const note=r.knowledgeNote;r=await aiJSON(rosterPrompt(base,season,comp&&comp.name)+`\n\nYour previous reply had no players${note?' ("'+note+'")':''}. "${base.name}" is a real club${comp?' in '+comp.name:''}${base.country?' ('+base.country+')':''}${webAllowed()?': search its official site, Transfermarkt, Wikipedia and the league site for the current squad and list it.':': list its current squad.'}`,signal,{web:true});ps=squadList(r.players)}
    for(let k=0;k<4&&ps.length&&squadGap(ps);k++){aiLog('  Team stops at '+squadGap(ps)+', asking Claude to continue…');
      const more=await aiJSON(continuePrompt(base,season,comp&&comp.name,ps),signal,{web:true});
      const have=new Set(ps.map(p=>norm(p.name)));const add=squadList(Array.isArray(more)?more:more.players).filter(p=>!have.has(norm(p.name)));
      aiLog('  +'+add.length+' more players'+(add.length?': '+add.map(p=>p.name+' ('+p.pos+')').join(', '):''));if(!add.length)break;ps=ps.concat(add)}
    if(!ps.length)throw new Error('Claude found no players for '+base.name+(r.knowledgeNote?'. Claude said: '+r.knowledgeNote:''));
    r.players=ps;partial=squadGap(ps);
    if(partial)aiLog('  Still incomplete ('+partial+'): the players found are added or updated, nobody is removed')}
  if(r.knowledgeNote)aiLog('  Note: '+r.knowledgeNote);if(r.squadSeason&&r.squadSeason!==season)aiLog('  Team is from '+r.squadSeason+' (no confirmed '+season+' team found)');
  const inc=clone(base);const ti=r.team||{};
  if(!S.teams[base.id]){inc.name=ti.name||inc.name;inc.short=(ti.short||shortName(inc.name)).toUpperCase().slice(0,3);inc.country=ti.country||inc.country}
  if(parts.has('manager')){if(ti.manager)inc.manager={name:ti.manager.name||'',nat:ti.manager.nat||'',age:+ti.manager.age||''};if(FORMATIONS.includes(ti.formation))inc.formation=ti.formation;if(PLAYSTYLES.includes(ti.playstyle))inc.playstyle=ti.playstyle}
  if(parts.has('kits')){if(ti.stadium)inc.stadium=ti.stadium;if(Array.isArray(ti.colors)&&ti.colors.every(isHex))inc.colors=ti.colors.slice(0,2);
    if(Array.isArray(ti.kits))ti.kits.forEach(k=>{if(!KIT_SLOTS.includes(k.slot))return;cleanHexes(k);let ex=inc.kits.find(x=>x.slot===k.slot);if(!ex){ex=newKit(k.slot);inc.kits.push(ex)}Object.assign(ex,{shirt:k.shirt||ex.shirt,second:k.second||ex.second,shorts:k.shorts||ex.shorts,socks:k.socks||ex.socks,sponsor:k.sponsor||ex.sponsor})})}
  const roster=Array.isArray(r.players)?r.players.filter(p=>p&&p.name):[];
  aiLog('  '+roster.length+' players returned');
  const byName=new Map();(inc.players||[]).forEach(p=>byName.set(norm(p.name),p));
  const lastName=new Map();(inc.players||[]).forEach(p=>{const ln=norm(p.name).split(' ').pop();if(!lastName.has(ln))lastName.set(ln,p);else lastName.set(ln,null)});
  // transfers come only from other clubs: a national team takes none, and no club takes players from a national team
  const others=new Map();if(parts.has('transfers')&&!isNationalTeam(base))Object.values(S.teams).forEach(t=>{if(t.id!==base.id&&!isNationalTeam(t))(t.players||[]).forEach(p=>others.set(norm(p.name),p))});
  const out=[];const matched=new Set();const needStats=[];
  for(const rp of roster){
    const n=norm(rp.name);let ex=byName.get(n)||(lastName.get(n.split(' ').pop())||null);
    if(ex&&matched.has(ex.id))ex=null;
    let p;
    if(ex){p=clone(ex);matched.add(ex.id)}
    else if(others.has(n)){p=clone(others.get(n));aiLog('  Transfer found: '+p.name)}
    else{if(!parts.has('roster'))continue;p=newPlayer({name:rp.name,pos:rp.pos});p._new=true}
    if(parts.has('bio')||p._new){Object.assign(p,{shirtName:rp.shirtName||p.shirtName,number:rp.number??p.number,age:rp.age||p.age,nat:rp.nat||p.nat,height:rp.height||p.height,weight:rp.weight||p.weight,foot:rp.foot||p.foot})}
    if((parts.has('styles')||p._new)&&POS.includes(rp.pos))p.pos=rp.pos;
    if((p._new&&parts.has('newStats'))||(!p._new&&parts.has('refreshStats')))needStats.push(p);
    out.push(p);
  }
  progSetTotal(1+Math.ceil(needStats.length/6));
  if(parts.has('roster'))inc.players=out;else{const map=new Map(out.map(p=>[p.id,p]));inc.players=(inc.players||[]).map(p=>map.get(p.id)||p)}
  for(let i=0;i<needStats.length;i+=6){
    if(signal.aborted)throw new DOMException('Stopped','AbortError');
    const chunk=needStats.slice(i,i+6);aiLog('  Ratings '+(i+1)+'–'+(i+chunk.length)+' of '+needStats.length+'…');
    const list=chunk.map((p,j)=>({key:'p'+j,name:p.name,pos:p.pos,age:p.age,nat:p.nat,team:inc.name}));
    try{const res=await aiJSON(statsPrompt(list,season),signal);applyStats(chunk,res,p=>parts.has('styles')||p._new)}catch(e){if(e.name==='AbortError')throw e;aiLog('  Could not rate this group: '+e.message)}
  }
  inc.players.forEach(p=>{delete p._new;normPlayer(p)});
  if(partial)inc._partial=inc.name+': Claude\'s player list is incomplete ('+partial+'), so no player was marked for removal. Check the team or run the Live Update again.';
  return inc;
}
const LINE_NAME={GK:'goalkeepers',DEF:'defenders',MID:'midfielders',ATT:'forwards'};
const squadList=x=>(Array.isArray(x)?x:[]).filter(p=>p&&p.name);
// '' when a squad has 16+ players and every line; otherwise what is missing ("11 players, no midfielders, forwards")
function squadGap(ps){if(!ps.length)return'no players';const g=new Set(ps.map(p=>POS_GROUP(p.pos)));const miss=['GK','DEF','MID','ATT'].filter(k=>!g.has(k));
  return ps.length<16||miss.length?ps.length+' players'+(miss.length?', no '+miss.map(k=>LINE_NAME[k]).join(', '):''):''}
function continuePrompt(team,season,compName,have){
  return `You are completing the ${season} first-team squad of "${team.name}"${team.country?' ('+team.country+')':''}${compName?', competition: '+compName:''} for an eFootball PES 2021 option file.
These players are already listed: ${have.map(p=>p.name+' ('+p.pos+')').join(', ')}.
That list stopped partway: squad pages list goalkeepers and defenders first and are often cut off. List the REST of the squad, every remaining player, especially midfielders and forwards. Read the rest of the squad page or another source if you need to. Do not repeat anyone above and do not invent players.
Reply with JSON only: {"players":[{"name":"Full name","shirtName":"NAME ON SHIRT","number":10,"pos":"CF","age":25,"nat":"Country","height":180,"weight":75,"foot":"R"}]}
"pos" must be one of: ${POS.join(', ')}. "foot" is "R" or "L".`;
}
function applyStats(chunk,res,wantStyles){ // wantStyles(player): also take style, skills and playable positions
  (Array.isArray(res)?res:[]).forEach(r=>{const j=+(String(r.key||'').replace(/\D/g,''));const p=chunk[j];if(!p||!r.attrs)return;
    ATTR_KEYS.forEach(k=>{if(isFinite(+r.attrs[k]))p.attrs[k]=+r.attrs[k]});
    ['wfUsage','wfAcc','form','injury'].forEach(k=>{if(isFinite(+r[k]))p[k]=+r[k]});
    if(wantStyles(p)){if(r.style)p.style=r.style;if(Array.isArray(r.skills))p.skills=r.skills;if(Array.isArray(r.comStyles))p.comStyles=r.comStyles;if(r.playables&&typeof r.playables==='object')p.playables=r.playables}});
}
ACT.aiRunTeam=async()=>{
  const parts=aiParts();const season=$('#ai-season').value.trim()||S.settings.season;const tid=$('#ai-team').value;const nn=$('#ai-newteam').value.trim();
  let base;if(nn){base=newTeam({name:nn,short:shortName(nn),compId:$('#ai-newcomp').value});parts.add('roster');parts.add('newStats');parts.add('manager');parts.add('kits');parts.add('bio')}else if(S.teams[tid])base=S.teams[tid];else{toast('Choose a team or type a new team name','err');return}
  const signal=startAI();S.ui.ai.failedN=0;AI_TRACE=[];aiLog('▶ Claude: '+base.name);
  try{const inc=await draftTeam(base,parts,season,signal);const b=batchFromData({teams:{[inc.id]:inc},comps:{}},{title:'Claude: '+inc.name+' ('+season+')',source:'Claude',removeMissing:parts.has('roster'),teamScope:[inc.id]});
    finishBatch(b)}catch(e){if(e.name==='AbortError')aiLog('Stopped.');else{aiLog('Error: '+e.message);S.ui.ai.failedN=1;
      queueAdd([{type:'team',...(S.teams[base.id]?{teamId:base.id}:{virtual:base}),parts:[...parts],season,label:base.name,status:'error',attempts:1,error:e.message,detail:AI_TRACE.join('\n'),failedAt:Date.now()}],{run:false})}}
  finally{AI_TRACE=null;endAI()}
};
ACT.aiRunAllTeams=async()=>{
  const parts=aiParts();const season=$('#ai-season').value.trim()||S.settings.season;const cid=$('#ai-allcomp').value;
  const list=teamsArr().filter(t=>!cid||t.compId===cid);if(!list.length)return;
  if(!await ask('Run for '+list.length+' teams',`Claude will draft updates for ${list.length} teams, one review batch per team. With ratings this can take a while; you can stop at any time.`,'Start'))return;
  const signal=startAI(list.length);
  try{for(const t of list){if(signal.aborted)break;try{const inc=await draftTeam(t,parts,season,signal);finishBatch(batchFromData({teams:{[inc.id]:inc},comps:{}},{title:'Claude: '+inc.name+' ('+season+')',source:'Claude',removeMissing:parts.has('roster'),teamScope:[inc.id]}))}catch(e){if(e.name==='AbortError')throw e;aiLog(t.name+': '+e.message)}}}
  catch(e){aiLog('Stopped.')}finally{endAI()}
};
ACT.aiRunComp=async()=>{
  const name=$('#ai-comp').value.trim();if(!name){toast('Type the competition name','err');return}
  const country=$('#ai-ccountry').value.trim(),season=$('#ai-cseason').value.trim()||S.settings.season,squads=$('#ai-csquads').checked,stats=$('#ai-cstats').checked;
  const signal=startAI();
  try{await buildCompAI(name,country,season,squads,stats,signal);aiLog('Done. Open Process and Review to pick what to apply.')}catch(e){aiLog(e.name==='AbortError'?'Stopped.':'Error: '+e.message)}finally{endAI()}
};
async function buildCompAI(name,country,season,squads,stats,signal){
  {
    aiLog('Asking Claude for the teams in '+name+'…');const r=await aiJSON(compPrompt(name,country,season),signal);if(r.knowledgeNote)aiLog('  Note: '+r.knowledgeNote);
    const rc=r.competition||{};let comp=Object.values(S.comps).find(c=>norm(c.name)===norm(rc.name||name)||norm(c.name)===norm(name));
    const incComp=comp?clone(comp):newComp({name:rc.name||name,short:rc.short||'',country:rc.country||country,type:rc.type==='Cup'?'Cup':'League',season});
    if(comp){incComp.season=season}
    const teams=(Array.isArray(r.teams)?r.teams:[]).filter(t=>t&&t.name);aiLog('  '+teams.length+' clubs');if(squads)progSetTotal(1+teams.length);
    const virt={};teams.forEach(rt=>{let ex=Object.values(S.teams).find(t=>norm(t.name)===norm(rt.name));
      const t=ex?clone(ex):newTeam({name:rt.name,short:(rt.short||shortName(rt.name)).toUpperCase().slice(0,3),country:rt.country||country,stadium:rt.stadium||''});t.compId=incComp.id;virt[t.id]=t});
    // competition batch: comp + team memberships (squads come per team)
    const compBatch=batchFromData({comps:{[incComp.id]:incComp},teams:squads?{}:virt},{title:'Claude: '+incComp.name+' teams ('+season+')',source:'Claude',removeMissing:false,teamScope:[]});
    finishBatch(compBatch);
    if(squads){const parts=new Set(['roster','transfers','newStats','bio','styles','manager','kits']);if(!stats){parts.delete('newStats')}
      for(const t of Object.values(virt)){if(signal.aborted)break;try{const inc=await draftTeam(t,parts,season,signal);finishBatch(batchFromData({teams:{[inc.id]:inc},comps:{}},{title:'Claude: '+inc.name+' ('+season+')',source:'Claude',removeMissing:true,teamScope:[inc.id]}))}catch(e){if(e.name==='AbortError')throw e;aiLog(t.name+': '+e.message)}}}
  }
}
ACT.aiRunPlayers=async()=>{
  const ids=(S.ui.aiPrefill&&S.ui.aiPrefill.players)||[];const season=$('#ai-season').value.trim()||S.settings.season;const signal=startAI();
  try{await runPlayerRatings(ids,season,signal)}catch(e){aiLog(e.name==='AbortError'?'Stopped.':'Error: '+e.message)}finally{endAI()}
};
async function runPlayerRatings(ids,season,signal){
  {const found=ids.map(findPlayer).filter(Boolean);const byTeam={};found.forEach(({p,t})=>{(byTeam[t.id]=byTeam[t.id]||clone(t))});
    const inc={};Object.values(byTeam).forEach(t=>inc[t.id]=t);const targets=found.map(({p,t})=>inc[t.id].players.find(x=>x.id===p.id));progSetTotal(Math.ceil(targets.length/6));
    for(let i=0;i<targets.length;i+=6){if(signal.aborted)break;const chunk=targets.slice(i,i+6);aiLog('Ratings '+(i+1)+'–'+(i+chunk.length)+' of '+targets.length+'…');
      const res=await aiJSON(statsPrompt(chunk.map((p,j)=>({key:'p'+j,name:p.name,pos:p.pos,age:p.age,nat:p.nat,team:Object.values(inc).find(t=>t.players.includes(p)).name})),season),signal);applyStats(chunk,res,()=>true);chunk.forEach(normPlayer)}
    finishBatch(batchFromData({teams:inc,comps:{}},{title:'Claude: ratings for '+targets.length+' players',source:'Claude',removeMissing:false,teamScope:Object.keys(inc)}));S.ui.sel.clear();
  }
}
// Missing details (age, height, weight, nationality) for named players: Claude is asked about exactly these players, for exactly
// the fields they lack, and only empty fields are filled. Nothing a player already has is changed (asking for the whole squad
// matched players by name and rewrote their other details, while the players with gaps were often not in Claude's list).
const DETAIL_FIELD={age:'age',height:'height',weight:'weight',nationality:'nat'};
const detailGaps=p=>playerGaps(p).filter(g=>DETAIL_FIELD[g]);
const DETAIL_OK={age:v=>Number.isInteger(+v)&&+v>=14&&+v<=50,height:v=>+v>=145&&+v<=215,weight:v=>+v>=45&&+v<=120,nat:v=>typeof v==='string'&&v.trim().length>1};
function detailsPrompt(list,season){
  return `Fill in missing personal details of these footballers for an eFootball PES 2021 option file (season ${season}).
Each entry gives the player's name, club, position and what is already known; "missing" lists the only fields to find.
Players:
${JSON.stringify(list)}
Reply with a JSON array only, one object per player, with "key" and only his missing fields:
[{"key":"p0","age":25,"nat":"Country","height":180,"weight":75}]
"age" is his age in years now, "height" in cm, "weight" in kg, "nat" the country he plays for (or was born in if uncapped), in English.
Use the club, position and shirt name to find the right player. Do not guess: if you cannot identify a player with confidence, reply {"key":"p0","unknown":true} for him.`;
}
async function runPlayerDetails(ids,season,signal,label){
  const found=ids.map(findPlayer).filter(x=>x&&detailGaps(x.p).length);if(!found.length){aiLog('  Nobody is missing details any more');return}
  const inc={};found.forEach(({t})=>{if(!inc[t.id])inc[t.id]=clone(t)});
  const targets=found.map(({p,t})=>({p:inc[t.id].players.find(x=>x.id===p.id),t:inc[t.id]}));progSetTotal(Math.ceil(targets.length/10));
  let filled=0;const unknown=[];
  for(let i=0;i<targets.length;i+=10){if(signal.aborted)throw new DOMException('Stopped','AbortError');const chunk=targets.slice(i,i+10);
    aiLog('Details '+(i+1)+'–'+(i+chunk.length)+' of '+targets.length+'…');
    const list=chunk.map(({p,t},j)=>{const o={key:'p'+j,name:p.name,shirtName:p.shirtName||undefined,club:t.name,clubCountry:t.country||undefined,competition:compName(t.compId)||undefined,pos:p.pos,number:p.number||undefined};
      ['age','height','weight','nat','foot'].forEach(k=>{if(p[k])o[k]=p[k]});o.missing=detailGaps(p).map(g=>DETAIL_FIELD[g]);return o});
    const res=await aiJSON(detailsPrompt(list,season),signal);
    (Array.isArray(res)?res:[]).forEach(r=>{const x=chunk[+(String(r&&r.key||'').replace(/\D/g,''))];if(!x)return;const p=x.p;
      if(r.unknown){unknown.push(p.name);return}
      detailGaps(p).forEach(g=>{const k=DETAIL_FIELD[g],v=r[k];if(v==null||!DETAIL_OK[k](v))return;p[k]=k==='nat'?String(v).trim():Math.round(+v);filled++})})}
  aiLog('  '+filled+' missing detail'+(filled===1?'':'s')+' found'+(unknown.length?'; Claude could not identify '+unknown.join(', '):''));
  const b=batchFromData({teams:inc,comps:{}},{title:'Claude: missing details'+(label?' for '+label:''),source:'Claude',removeMissing:false,teamScope:Object.keys(inc)});
  if(unknown.length)b.notes=[...(b.notes||[]),'Claude could not identify: '+unknown.join(', ')+'. Fill these by hand on the player form.'];
  finishBatch(b)}
ACT.aiOnePlayer=async()=>{const p=readPlayerForm();const t=S.teams[S.ui.edit.teamId];closeModal();S.ui.aiPrefill={players:[p.id]};S.ui.ai.log=[];location.hash='ai';
  setTimeout(()=>{const b=$('[data-act=aiRunPlayers]');if(b)b.click()},50)};
ACT.aiKit=async()=>{const o=S.ui.kit;const t=S.teams[o.teamId];if(!t)return;const slot=(t.kits[o.i]||{}).slot||'1st';
  try{const r=await miniBusy('Kit colours for '+t.name+' '+slot,()=>aiJSON(`For eFootball PES 2021, give the ${S.settings.season} "${slot}" kit of ${t.name} as JSON only: {"pattern":"plain|stripes|pinstripes|hoops|halves|sash|chevron|fade|quarters","shirt":"#rrggbb","second":"#rrggbb","trim":"#rrggbb","shorts":"#rrggbb","socks":"#rrggbb","numberColor":"#rrggbb","sponsor":"main sponsor text","sponsorColor":"#rrggbb","collar":"one of ${COLLARS.join(', ')}"}. Use the most recent kit you know.`));
    ['shirt','second','trim','shorts','socks','numberColor','sponsorColor'].forEach(k=>{if(isHex(r[k]))o[k]=r[k]});if(r.pattern)o.pattern=r.pattern;if(r.sponsor)o.sponsor=r.sponsor;if(COLLARS.includes(r.collar))o.collar=r.collar;rerender();toast('Suggestion loaded. Apply it if it looks right.','ok')}
  catch(e){toast('Claude could not suggest colours: '+e.message,'err')}};

function withProg(fn){return async function(...a){progPush(1);try{return await fn.apply(this,a)}finally{progPop()}}}
draftTeam=withProg(draftTeam);runPlayerRatings=withProg(runPlayerRatings);buildCompAI=withProg(buildCompAI);
/* ================= Review queue ================= */
function batchFromData(inc,{title,source,removeMissing,teamScope,allowWc}){
  // a footballer has one record at his club and a separate one in his national team, so players are matched across
  // clubs only: a national team's squad matches its own players and nobody else's, and clubs never match national players
  const items=[];const clubs=Object.values(S.teams).filter(t=>!isNationalTeam(t));const allIds=new Set();Object.values(S.teams).forEach(t=>(t.players||[]).forEach(p=>allIds.add(p.id)));
  const gIdx=new Map();clubs.forEach(t=>(t.players||[]).forEach(p=>gIdx.set(p.id,{p,t})));
  const gName=new Map();clubs.forEach(t=>(t.players||[]).forEach(p=>{const n=norm(p.name);gName.set(n,gName.has(n)?null:{p,t})}));
  Object.values(inc.comps||{}).forEach(c=>{const ex=S.comps[c.id]||Object.values(S.comps).find(x=>norm(x.name)===norm(c.name));
    if(!ex)items.push({id:uid(),kind:'comp',op:'add',name:c.name,obj:c,accept:true});
    // the World Cup keeps its title and logo until the international search finds a newer edition (allowWc)
    else{const f=diffObj(ex,c,COMP_PATHS).filter(x=>allowWc||!ex.worldCup||!WC_KEEP.includes(x.k)).map(x=>Object.assign(x,{accept:true}));if(f.length)items.push({id:uid(),kind:'comp',op:'update',compId:ex.id,name:ex.name,fields:f,accept:true})}});
  const kept=[],leagueNo=[];
  // a squad a source could only partly read (t._partial says what is missing) adds and updates players but removes none
  const partialOf=new Map();Object.values(inc.teams||{}).forEach(t=>{if(t._partial){partialOf.set(t,t._partial);delete t._partial}});
  Object.values(inc.teams||{}).forEach(t=>{
    // t._noNameMatch: the country check (app-comp-add.js) could not confirm a namesake, so the name alone decides nothing
    const ex=S.teams[t.id]||(t._noNameMatch?null:Object.values(S.teams).find(x=>norm(x.name)===norm(t.name)));
    // General rule: a squad source (Claude, update file, backup) that has no players for a club doesn't show that club
    // this season (relegated, left the competition, or unknown). PES takes any number of teams per competition, so older
    // clubs stay playable: the club and its players are left exactly as they are, never emptied.
    const squadSource=removeMissing&&(!teamScope||teamScope.includes(t.id)||(ex&&teamScope.includes(ex.id)));
    if(ex&&squadSource&&!(t.players||[]).length&&(ex.players||[]).length){kept.push(ex.name);return}
    if(!ex){const copy=clone(t);copy.players.forEach(normPlayer);items.push({id:uid(),kind:'team',op:'add',name:t.name,obj:copy,accept:true});return}
    // top rule: a league change is accepted only where the game agrees, a cup, or the league the team's code is in. Any other
    // is left out and named in the notes: in the game a team changes league only by taking a free code of it (Change competition)
    const f=diffObj(ex,t,TEAM_PATHS.filter(k=>k!=='players')).filter(x=>{if(x.k!=='compId')return true;const to=S.comps[x.to]||(inc.comps||{})[x.to];if(to&&isCupComp(to)){if(!isLeagueComp(S.comps[ex.compId]))return true;leagueNo.push(ex.name+' → '+to.name);return false}
      if(to&&to.gameLeague&&typeof teamGameLeague==='function'&&teamGameLeague(ex)===to.gameLeague)return true;leagueNo.push(ex.name+(to?' → '+to.name:''));return false}).map(x=>Object.assign(x,{accept:true}));
    if(f.length)items.push({id:uid(),kind:'team',op:'update',teamId:ex.id,name:ex.name,fields:f,accept:true});
    const seen=new Set();
    (t.players||[]).forEach(p0=>{const p=normPlayer(clone(p0));
      const national=isNationalTeam(ex);let cur=national?null:gIdx.get(p.id);
      if(!cur){const inTeam=(ex.players||[]).find(x=>x.id===p.id)||(ex.players||[]).find(x=>norm(x.name)===norm(p.name));if(inTeam)cur={p:inTeam,t:ex};else if(!national){const g=gName.get(norm(p.name));if(g)cur=g}}
      if(!cur){if(allIds.has(p.id))p.id=uid(); // a new record of its own, never sharing another team's player id
        items.push({id:uid(),kind:'player',op:'add',teamId:ex.id,name:p.name,obj:p,accept:true});return}
      seen.add(cur.p.id);const target=Object.assign(clone(p),{id:cur.p.id});
      const f=diffObj(cur.p,target,PLAYER_PATHS).map(x=>Object.assign(x,{accept:true}));
      if(cur.t.id!==ex.id&&isNationalTeam(cur.t)!==national){items.push({id:uid(),kind:'player',op:'add',teamId:ex.id,name:p.name,obj:Object.assign(clone(p),{id:uid()}),accept:true});return}
      if(cur.t.id!==ex.id)items.push({id:uid(),kind:'player',op:'move',playerId:cur.p.id,fromTeam:cur.t.id,teamId:ex.id,name:cur.p.name,fields:f,accept:true});
      else if(f.length)items.push({id:uid(),kind:'player',op:'update',playerId:cur.p.id,teamId:ex.id,name:cur.p.name,fields:f,accept:true});
    });
    if(squadSource&&!partialOf.has(t))(ex.players||[]).forEach(p=>{if(!seen.has(p.id))items.push({id:uid(),kind:'player',op:'remove',playerId:p.id,teamId:ex.id,name:p.name,accept:true})});
  });
  const notes=[...partialOf.values()];if(leagueNo.length)notes.push(leagueNo.length+' team'+(leagueNo.length===1?'':'s')+' the source puts in another league '+(leagueNo.length===1?'stays':'stay')+' where '+(leagueNo.length===1?'it is':'they are')+': in the game a team changes league only by taking a free code of that league (its page → Change competition → Move). '+leagueNo.slice(0,20).join(', ')+(leagueNo.length>20?' (and '+(leagueNo.length-20)+' more)':''));
  return{id:uid(),title,source,createdAt:Date.now(),items,kept,notes};
}
function finishBatch(b){if(b.kept&&b.kept.length){aiLog('  Not in the season data, kept as is: '+b.kept.join(', '));b.notes=[...(b.notes||[]),b.kept.length+' team'+(b.kept.length===1?'':'s')+' not in this season\'s data kept as they are: '+b.kept.join(', ')]}delete b.kept;
  if(!b.items.length){aiLog&&aiLog('  No differences from your current data.');toast(b.title+': nothing new'+(b.notes&&b.notes.length?'. '+b.notes.join(' '):''),'');return}
  // keep each batch under the cloud document limit by splitting
  const chunks=[];let cur={...b,items:[]};
  b.items.forEach(it=>{cur.items.push(it);if(JSON.stringify(cur).length>200000){cur.items.pop();chunks.push(cur);cur={...b,id:uid(),title:b.title+' (cont.)',items:[it]}}});chunks.push(cur);
  chunks.forEach(saveBatch);aiLog('  → '+b.items.length+' changes sent to Process and Review');toast(b.title+': '+b.items.length+' changes to review','ok')}
const OPLBL={add:['t-add','New'],remove:['t-rem','Remove'],update:['t-upd','Update'],move:['t-mov','Transfer']};
/* Process and Review has three tabs (the user, 2026-11-25), each with its count:
     Free sources        the jobs running or waiting in the queue (Live update)
     Additional actions  the Ask Claude table: what the free sources left open, and what only Claude can do
     Changes             the batches waiting to be applied, counted in changes
   Coming from another page it opens on the first tab that has something (Changes, then Additional actions, then Free
   sources), or on the tab the command that sent you asked for (S.ui.revWant); a reload keeps the tab you were on. */
const REV_TABS=[['free','Free sources','in the queue'],['more','Additional actions','in the queue'],['changes','Changes','waiting to apply']];
function revCounts(){const bs=Object.values(S.pending);return{free:jobsArr().filter(j=>j.status==='queued'||j.status==='running').length,more:typeof askLive==='function'?askLive().length:0,changes:bs.reduce((n,b)=>n+(b.items||[]).length,0)}}
ACT.revTab=el=>{S.ui.revTab=el.dataset.tab;rerender()};
ACT.revGoMore=()=>{S.ui.revWant='more';if(location.hash==='#review'){S.ui.revTab='more';rerender()}else location.hash='review'};
window.addEventListener('hashchange',e=>{if(location.hash!=='#review'||/#review$/.test(e.oldURL||''))return;const w=S.ui.revWant||'';S.ui.revWant='';if(S.ui.revTab!==w){S.ui.revTab=w;if(S.ui.view==='review')rerender()}});
VIEWS.review=()=>{
  const bs=Object.values(S.pending).sort((a,b)=>a.createdAt-b.createdAt);const C=revCounts();
  const tab=REV_TABS.some(t=>t[0]===S.ui.revTab)?S.ui.revTab:C.changes?'changes':C.more?'more':C.free?'free':'changes';
  const tabs=`<div class="tabs" role="tablist" aria-label="Process and Review">${REV_TABS.map(([k,l,w])=>`<button role="tab" aria-selected="${tab===k}" class="${tab===k?'on':''}" data-act="revTab" data-tab="${k}" title="${C[k]} ${w}">${l} <span class="badge" style="${C[k]?'':'opacity:.45'}">${C[k]}</span></button>`).join('')}</div>`;
  const head=`<div class="row"><div><h1>Process and Review</h1><p class="sub">Everything that comes in waits here: the free sources' queue, what is left for you to ask for, and the changes to apply. Nothing changes your project until you apply it; a snapshot is saved before each apply.</p></div><span class="spacer"></span>${tab==='changes'&&bs.length>1?`<button class="danger" data-act="revDiscardAll">Discard all</button><button class="primary" data-act="revApplyAll">Apply all ${bs.length} batches</button>`:''}</div>`;
  const body=tab==='free'?(reviewQueueHTML()||'<div class="card"><p>Nothing is running or waiting. Start a <a href="#ai">Live update</a> from a team, a competition or the Health check.</p></div>')
    :tab==='more'?((typeof askHTML==='function'&&askHTML())||'<div class="card"><p>Nothing is waiting for you to ask. What the free sources don\'t have, and what only Claude can do (kits, a new competition), is listed here after a Live update.</p></div>')
    :bs.length?bs.map(batchHTML).join(''):C.free?'<div class="card"><p>Nothing to apply yet. The changes from each task appear here as soon as it finishes.</p></div>':'<div class="card"><p>Nothing waiting. Run a <a href="#ai">Live update</a>, import a CSV, or open a package on the <a href="#optionfile">Import / Export</a> page.</p></div>';
  return head+reviewProgHTML()+tabs+body;
};
function batchHTML(b){
  const n=b.items.length,on=b.items.filter(i=>i.accept).length;const groups={};
  b.items.forEach((it,i)=>{const g=it.kind==='comp'?'Competitions':(S.teams[it.teamId]?S.teams[it.teamId].name:it.op==='add'&&it.kind==='team'?'New teams':'Other');(groups[g]=groups[g]||[]).push([it,i])});
  const counts={};b.items.forEach(i=>counts[i.op]=(counts[i.op]||0)+1);
  return `<div class="card" style="margin-bottom:16px"><div class="row"><div><div style="font:700 20px var(--font-display)">${esc(b.title)}</div><div class="small muted">${esc(b.source)} · ${fmtDate(b.createdAt)} · ${Object.entries(counts).map(([k,v])=>`${v} ${OPLBL[k][1].toLowerCase()}`).join(' · ')}</div></div><span class="spacer"></span>
   <button class="sm" data-act="revAll" data-b="${b.id}" data-v="1">Tick all</button><button class="sm" data-act="revAll" data-b="${b.id}" data-v="0">Untick all</button>
   <button class="sm danger" data-act="revDiscard" data-b="${b.id}">Discard</button><button class="primary" data-act="revApply" data-b="${b.id}" ${on?'':'disabled'}>Apply ${on} of ${n}</button></div>
   ${b.notes&&b.notes.length?`<div class="infobox small" style="margin-top:10px"><b>Notes:</b><br>${b.notes.map(linkify).join('<br>')}</div>`:''}
   ${Object.entries(groups).map(([g,list])=>`<details ${revIsOpen(b.id,g)?'open':''} data-rk="${esc(b.id+'|'+g)}" style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">${esc(g)} <span class="muted small">(${list.length})</span></summary><div class="grid" style="gap:8px;margin-top:8px">${list.slice(0,revCap(b.id,g)).map(([it,i])=>itemHTML(b,it,i)).join('')}${revMoreBtn(b,g,list.length)}</div></details>`).join('')}</div>`;
}
function itemHTML(b,it,i){
  const [cls,lbl]=OPLBL[it.op];let body='';
  if(it.op==='add'&&it.kind==='player'){const p=it.obj;body=`<span class="small">${posHTML(p.pos)} ${esc(p.age)} yrs · ${esc(p.nat)} · OVR ${statHTML(ovr(p))}</span>`}
  else if(it.op==='add'&&it.kind==='team'){const t=it.obj;body=`<div class="small">${(t.players||[]).length} players · ${esc(compName(t.compId))} · ${esc(t.manager&&t.manager.name||'')}</div>`+((t.players||[]).length?`<div class="small muted" style="margin-top:4px">${t.players.slice(0,40).map(p=>esc(p.name)+' '+ovr(p)).join(' · ')}</div>`:'')}
  else if(it.op==='add'&&it.kind==='comp'){body=`<span class="small">${esc(it.obj.country)} · ${esc(it.obj.type)}</span>`}
  else if(it.op==='remove'){const f=findPlayer(it.playerId);body=f?`<span class="small">${posHTML(f.p.pos)} OVR ${statHTML(ovr(f.p))} · not in the new team</span>`:''}
  if(it.op==='move'){const fr=S.teams[it.fromTeam],to=S.teams[it.teamId];body=fr&&to&&isNationalTeam(fr)!==isNationalTeam(to)?`<span class="small">Stays at ${esc(fr.name)}; a copy joins ${esc(to.name)}</span>`:`<span class="small">${esc(fr?fr.name:'?')} → ${esc(to?to.name:'?')}</span>`}
  const fields=(it.fields||[]).map((f,fi)=>{const num=NUMERIC.has(f.k);const scalar=typeof f.to!=='object'||f.to===null;const d=num&&isFinite(+f.from)&&isFinite(+f.to)&&f.from!==''?(+f.to)-(+f.from):null;
    return `<div class="fld"><input type="checkbox" data-act="revField" data-b="${b.id}" data-i="${i}" data-f="${fi}" ${f.accept?'checked':''} aria-label="Apply ${esc(LABEL[f.k]||f.k)}"><span class="muted">${esc(LABEL[f.k]||f.k)}</span><span>${f.k.startsWith('attrs.')?statHTML(f.from):fmtVal(f.k,f.from)}</span><span class="muted">→</span>
    <span class="row" style="gap:6px;flex-wrap:nowrap">${scalar&&!['compId','emblem','managerPhoto'].includes(f.k)?`<input type="${num?'number':'text'}" value="${esc(f.to??'')}" data-ch="revVal" data-b="${b.id}" data-i="${i}" data-f="${fi}" style="max-width:${num?'70px':'220px'}">`:fmtVal(f.k,f.to)}${d?`<span class="${d>0?'up':'down'} small">${d>0?'+':''}${d}</span>`:''}</span></div>`}).join('');
  return `<div class="rev-item ${it.accept?'':'off'}"><div class="row"><input type="checkbox" data-act="revItem" data-b="${b.id}" data-i="${i}" ${it.accept?'checked':''} aria-label="Apply this change"><span class="tag ${cls}">${lbl}</span><b>${esc(it.name)}</b>${body}
   ${it.fields&&it.fields.length?`<span class="spacer"></span><span class="small muted">${it.fields.filter(f=>f.accept).length}/${it.fields.length} fields</span>`:''}</div>${fields?`<div style="margin-top:6px">${fields}</div>`:''}</div>`;
}
ACT.revItem=el=>{const b=S.pending[el.dataset.b];const it=b.items[+el.dataset.i];it.accept=!it.accept;saveBatch(b);rerender()};
ACT.revField=el=>{const b=S.pending[el.dataset.b];const f=b.items[+el.dataset.i].fields[+el.dataset.f];f.accept=!f.accept;saveBatch(b);rerender()};
ACT.revAll=el=>{const b=S.pending[el.dataset.b];const v=el.dataset.v==='1';b.items.forEach(i=>{i.accept=v;(i.fields||[]).forEach(f=>f.accept=v)});saveBatch(b);rerender()};
CH.revVal=el=>{const b=S.pending[el.dataset.b];const f=b.items[+el.dataset.i].fields[+el.dataset.f];if(f.k==='gameId'||f.k==='gameSlot'){toast('A code is never typed: it is given on Game codes','err');rerender();return}f.to=NUMERIC.has(f.k)?(el.value===''?'':+el.value):el.value;f.accept=true;saveBatch(b)};
ACT.revDiscard=async el=>{const b=S.pending[el.dataset.b];if(!await ask('Discard batch',`Discard <b>${esc(b.title)}</b>? Nothing in it will be applied.`,'Discard',true))return;delete S.pending[b.id];Store.del('pending',b.id);rerender()};
ACT.revApply=async el=>{const b=S.pending[el.dataset.b];await takeSnapshot('Before: '+b.title,true);const r=applyBatch(b);
  toast('Applied '+(r.n-r.skipped)+' change'+(r.n-r.skipped===1?'':'s')+(r.skipped-r.fixed?' ('+(r.skipped-r.fixed)+' already applied or no longer valid, skipped)':'')+(r.fixed?'. '+r.fixed+' left out: the game keeps its own there (Game codes, What can change)':''),'ok');rerender()};
ACT.revApplyAll=async()=>{const bs=Object.values(S.pending).sort((a,b)=>a.createdAt-b.createdAt);const n=bs.reduce((a,b)=>a+b.items.filter(i=>i.accept).length,0);
  if(!await ask('Apply all batches',`Apply the ticked changes in all ${bs.length} batches (${n} changes)? One snapshot is saved first so you can restore it.`,'Apply all'))return;
  await takeSnapshot('Before applying '+bs.length+' batches',true);let t=0,sk=0,fx=0;bs.forEach(b=>{const r=applyBatch(b);t+=r.n;sk+=r.skipped;fx+=r.fixed||0});
  toast('Applied '+(t-sk)+' changes'+(sk?' ('+sk+' skipped'+(fx?', '+fx+' of them left out because the game keeps its own there':'')+')':''),'ok');rerender()};
ACT.revDiscardAll=async()=>{const bs=Object.values(S.pending);if(!await ask('Discard all',`Discard all ${bs.length} batches? Nothing in them will be applied.`,'Discard all',true))return;bs.forEach(b=>{delete S.pending[b.id];Store.del('pending',b.id)});rerender()};
// Every import, Live Update and Claude update is applied here, so this is where they ask the relay (gameRule, app-boot.js; the
// user, 2026-11-25): a change the game would not take (a ✕ in What can change, for the game's own team at a code or for the
// competition) is left out and counted in `fixed`; the rest of the batch goes in.
const RULE_FIELD_T={name:'tnames',emblem:'temblems'},RULE_FIELD_C={name:'name',short:'name',emblem:'logo'};
// RULES kept at apply (audit of 2026-11-25; data-safety guarantees 1, 2 and 8, DATABASE_RULES 4.6):
//  - a code never moves here: a gameId/gameSlot change on a team or competition that has one is left out (codes move on Game
//    codes, codeAssign); an empty one may be filled. A code is never typed in the review either (CH.revVal).
//  - a player another waiting batch transfers is not removed by this one, whatever order the batches are applied in.
//  - a new club is the same as one of that name only when their countries don't say otherwise and you didn't answer No.
//  - links stay whole: a cup's team list keeps only teams that exist, a team's competition must exist.
//  - filling an existing team or competition asks the relay too (teamRuleLock / compRuleLock).
//  - one history entry per batch; teams changed are saved even if an item fails, and a failed batch stays waiting.
function applyBatch(b){return histLabel('Applied: '+(b.title||'batch'),'Review',()=>applyBatchRun(b))}
function applyBatchRun(b){const touched=new Set(),touchedC=new Set();let n=0,skipped=0,fixed=0,err=null;
  const movedElsewhere=pid=>Object.values(S.pending).some(o=>o!==b&&(o.items||[]).some(i=>i.accept&&i.kind==='player'&&i.op==='move'&&i.playerId===pid));
  const sameClub=(it,x)=>norm(x.name)===norm(it.obj.name)&&!it.notSame&&(typeof clubVerdict!=='function'||isNationalTeam(x)||clubVerdict(it.obj.name,it.obj.country,x)!=='no');
  const CODE_F=new Set(['gameId','gameSlot']);
  try{
  const tl=(t,w)=>typeof teamRuleLock==='function'&&t?teamRuleLock(t,w):'',cl=(c,w)=>typeof compRuleLock==='function'&&c?compRuleLock(c,w):'';
  for(const it of b.items){if(!it.accept)continue;n++;
    let fieldsOn=(it.fields||[]).filter(f=>f.accept);
    {const before=fieldsOn.length;
      if(it.kind==='comp'&&it.op==='update'){const c=S.comps[it.compId];fieldsOn=fieldsOn.filter(f=>!(RULE_FIELD_C[f.k]&&cl(c,RULE_FIELD_C[f.k]))&&!(c&&CODE_F.has(f.k)&&c[f.k]))}
      else if(it.kind==='team'&&it.op==='update'){const t=S.teams[it.teamId];fieldsOn=fieldsOn.filter(f=>!(RULE_FIELD_T[f.k]&&tl(t,RULE_FIELD_T[f.k]))&&!(t&&CODE_F.has(f.k)&&t[f.k]))}
      else if(it.kind==='player'){const t=S.teams[it.teamId],from=it.op==='move'?S.teams[it.fromTeam]:null;
        const stop=it.op==='update'?tl(t,'players'):(tl(t,'players')||tl(t,'nplayers')||(from&&from!==t?(tl(from,'players')||tl(from,'nplayers')):''));
        if(stop){fixed++;continue}}
      if(before&&!fieldsOn.length&&(it.kind==='comp'||it.kind==='team')&&it.op==='update'){fixed++;continue}}
    if(it.kind==='comp'&&it.op==='add'){const exc=S.comps[it.obj.id]||Object.values(S.comps).find(x=>norm(x.name)===norm(it.obj.name));
      if(exc){let ch=false;['short','country','emblem','season','gameSlot'].forEach(k=>{if(k==='emblem'&&cl(exc,'logo'))return;if(it.obj[k]&&!exc[k]){exc[k]=it.obj[k];ch=true}});if(ch)saveComp(exc);else skipped++;continue}saveComp(clone(it.obj));touchedC.add(it.obj.id)}
    else if(it.kind==='comp'&&it.op==='update'){const c=S.comps[it.compId];if(c){fieldsOn.forEach(f=>setP(c,f.k,clone(f.to)));saveComp(c);touchedC.add(c.id)}else skipped++}
    else if(it.kind==='team'&&it.op==='add'){const ex=S.teams[it.obj.id]||Object.values(S.teams).find(x=>sameClub(it,x));
      // the same new club can arrive in two files: the second one fills in what the first left empty
      if(ex){let ch=false;const o=it.obj;['short','country','compId','stadium','emblem','managerPhoto','formation','playstyle','notes','gameSlot'].forEach(k=>{if(k==='emblem'&&tl(ex,'temblems'))return;if(o[k]&&!ex[k]){ex[k]=o[k];ch=true}});
        if(o.manager&&o.manager.name&&!(ex.manager&&ex.manager.name)){ex.manager=clone(o.manager);ch=true}if(Array.isArray(o.colors)&&o.colors.length&&!(ex.colors&&ex.colors.length)){ex.colors=clone(o.colors);ch=true}
        (o.kits||[]).forEach(k=>{const x=(ex.kits||[]).find(y=>y.slot===k.slot);if(!x){(ex.kits=ex.kits||[]).push(clone(k));ch=true}else if(k.img&&!x.img){x.img=k.img;ch=true}});
        if((o.players||[]).length&&!(ex.players||[]).length&&!tl(ex,'players')&&!tl(ex,'nplayers')){ex.players=o.players.map(p=>normPlayer(clone(p)));ch=true}
        if(ch)touched.add(ex.id);else skipped++;continue}const t=clone(it.obj);S.teams[t.id]=t;Store.rev++;touched.add(t.id)}
    else if(it.kind==='team'&&it.op==='update'){const t=S.teams[it.teamId];if(t){fieldsOn.forEach(f=>setP(t,f.k,clone(f.to)));touched.add(t.id)}else skipped++}
    else if(it.kind==='player'){const t=S.teams[it.teamId];if(!t){skipped++;continue}
      if(it.op==='add'){if(t.players.some(p=>norm(p.name)===norm(it.obj.name))){skipped++;continue}t.players.push(normPlayer(clone(it.obj)));touched.add(t.id)}
      else if(it.op==='remove'){if(!t.players.some(p=>p.id===it.playerId)||movedElsewhere(it.playerId)){skipped++;continue}t.players=t.players.filter(p=>p.id!==it.playerId);touched.add(t.id)}
      else if(it.op==='update'){const p=t.players.find(x=>x.id===it.playerId);if(p){fieldsOn.forEach(f=>setP(p,f.k,clone(f.to)));normPlayer(p);touched.add(t.id)}else skipped++}
      else if(it.op==='move'){const from=S.teams[it.fromTeam];const f0=from&&from.players.find(x=>x.id===it.playerId);if(!f0){const here=t.players.find(x=>x.id===it.playerId);if(here){fieldsOn.forEach(f=>setP(here,f.k,clone(f.to)));normPlayer(here);touched.add(t.id)}else skipped++;continue}if(f0&&isNationalTeam(from)!==isNationalTeam(t)){if(t.players.some(x=>norm(x.name)===norm(f0.name))){skipped++;continue}const c=Object.assign(clone(f0),{id:uid()});fieldsOn.forEach(f=>setP(c,f.k,clone(f.to)));normPlayer(c);t.players.push(c);touched.add(t.id);continue}
        if(f0){from.players=from.players.filter(x=>x.id!==it.playerId);fieldsOn.forEach(f=>setP(f0,f.k,clone(f.to)));normPlayer(f0);t.players.push(f0);touched.add(from.id);touched.add(t.id)}}}
  }}catch(e){err=e;console.error(e)}
  finally{
    // links stay whole: a team's competition exists, a cup's list holds only teams that exist
    touched.forEach(id=>{const t=S.teams[id];if(t&&t.compId&&!S.comps[t.compId])t.compId=''});
    touchedC.forEach(id=>{const c=S.comps[id];if(c&&Array.isArray(c.teams)){const k=c.teams.filter(x=>S.teams[x]);if(k.length!==c.teams.length){c.teams=k;saveComp(c)}}});
    touched.forEach(id=>S.teams[id]&&saveTeam(S.teams[id]))}
  if(err){toast('"'+(b.title||'A batch')+'" stopped part-way: '+(err.message||err)+'. What it had changed is saved, and it stays in Process and Review to apply again.','err');return{n,skipped:skipped+fixed,fixed,err}}
  delete S.pending[b.id];Store.del('pending',b.id);ensureWorldCup();return{n,skipped:skipped+fixed,fixed}}

/* ================= Compare & versions ================= */
VIEWS.compare=()=>{
  const snaps=Object.values(S.snaps).sort((a,b)=>b.createdAt-a.createdAt);
  const srcOpts=[['baseline','Baseline'+(S.settings.baseline&&S.snaps[S.settings.baseline]?' ('+S.snaps[S.settings.baseline].name+')':' (not set)')],['current','Current data'],...snaps.map(s=>[s.id,s.name+' · '+fmtDate(s.createdAt)])];
  const A=dataFor(S.ui.cmpA),B=dataFor(S.ui.cmpB);
  let res='';
  if(A===null||B===null)res='<div class="card"><p>Choose two versions. Take a snapshot first if you have none.</p></div>';
  else if(A===undefined||B===undefined)res='<p class="muted">Loading snapshot…</p>';
  else res=diffView(diffData(A,B),A,B);
  return `<h1>Compare &amp; versions</h1><p class="sub">Snapshots freeze your whole project. Compare any two (or a snapshot against your current data), restore an older one, and pick which version counts as the in-game baseline.</p>
  <div class="grid g2"><div class="card"><h3>Compare</h3><div class="form"><label class="f">Old (A)<select data-ch="cmpA">${opts(srcOpts,S.ui.cmpA)}</select></label><label class="f">New (B)<select data-ch="cmpB">${opts(srcOpts,S.ui.cmpB)}</select></label></div>
    <div class="row" style="margin-top:10px"><select data-ch="cmpTeam" aria-label="Team filter"><option value="">All teams</option>${opts(teamsArr().map(t=>[t.id,t.name]),S.ui.cmpTeam)}</select><input type="search" placeholder="Player name" value="${esc(S.ui.cmpQ)}" data-in="cmpQ" aria-label="Filter by player">
    ${Object.entries({comps:'Competitions',teams:'Teams',players:'Players'}).map(([k,l])=>`<label class="c small"><input type="checkbox" data-act="cmpKind" data-k="${k}" ${S.ui.cmpKinds[k]?'checked':''}>${l}</label>`).join('')}</div></div>
   <div class="card"><h3>Snapshots</h3><div class="row" style="margin-bottom:8px"><button class="primary sm" data-act="snapNew">Take snapshot</button></div>
    <div style="max-height:220px;overflow:auto"><table><tbody>${snaps.map(s=>`<tr><td>${esc(s.name)}${S.settings.baseline===s.id?' <span class="tag t-upd">baseline</span>':''}<div class="small muted">${s.uploading?'<span style="color:var(--warn)">saving…</span> · ':s.failed?'<span style="color:var(--bad)">not saved</span> · ':''}${fmtDate(s.createdAt)} · ${s.counts?s.counts.teams+' teams, '+s.counts.players+' players':''}</div></td>
    <td style="text-align:right;white-space:nowrap"><button class="sm" data-act="snapBase" data-id="${s.id}">Set baseline</button><button class="sm" data-act="snapRestore" data-id="${s.id}">Restore</button><button class="sm ghost danger" data-act="snapDel" data-id="${s.id}">Delete</button></td></tr>`).join('')||'<tr><td class="muted">No snapshots yet.</td></tr>'}</tbody></table></div></div></div>
  <h2>Differences</h2>${res}
  <h2>Head-to-head</h2>${h2hView()}`;
};
CH.cmpA=el=>{S.ui.cmpA=el.value;rerender()};CH.cmpB=el=>{S.ui.cmpB=el.value;rerender()};CH.cmpTeam=el=>{S.ui.cmpTeam=el.value;rerender()};
IN.cmpQ=el=>{S.ui.cmpQ=el.value;clearTimeout(S.ui.cq);S.ui.cq=setTimeout(()=>{rerender();const i=$('[data-in=cmpQ]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},300)};
ACT.cmpKind=el=>{S.ui.cmpKinds[el.dataset.k]=!S.ui.cmpKinds[el.dataset.k];rerender()};
function diffView(d,A,B){
  const tf=S.ui.cmpTeam,q=norm(S.ui.cmpQ);const k=S.ui.cmpKinds;
  let pl=d.players;if(tf)pl=pl.filter(x=>(x.tA&&x.tA.id===tf)||(x.tB&&x.tB.id===tf));if(q)pl=pl.filter(x=>norm(x.p.name).includes(q));
  let tm=d.teams;if(tf)tm=tm.filter(x=>x.id===tf);
  const cnt=t=>pl.filter(x=>x.type===t).length;
  const fchips=fs=>fs.map(f=>{const num=NUMERIC.has(f.k)&&isFinite(+f.from)&&isFinite(+f.to)&&f.from!==''&&f.to!=='';const dd=num?(+f.to)-(+f.from):0;
    return `<span class="chip">${esc(LABEL[f.k]||f.k)}: ${num?`${esc(f.from)} → <b>${esc(f.to)}</b> <span class="${dd>0?'up':'down'}">${dd>0?'+':''}${dd}</span>`:`${fmtVal(f.k,f.from,A)} → ${fmtVal(f.k,f.to,B)}`}</span>`}).join('');
  const sum=`<div class="grid g4" style="margin-bottom:12px"><div class="tile"><div class="n">${d.comps.length}</div><div class="l">Competition changes</div></div><div class="tile"><div class="n">${tm.length}</div><div class="l">Team changes</div></div>
   <div class="tile"><div class="n up">${cnt('added')}</div><div class="l">Players added</div></div><div class="tile"><div class="n down">${cnt('removed')}</div><div class="l">Players removed</div></div><div class="tile"><div class="n" style="color:var(--gold)">${cnt('moved')}</div><div class="l">Transfers</div></div><div class="tile"><div class="n">${cnt('changed')}</div><div class="l">Players changed</div></div></div>`;
  if(!d.comps.length&&!tm.length&&!pl.length)return sum+'<div class="card"><p>No differences between these two versions.</p></div>';
  return sum+(k.comps&&d.comps.length?`<h3>Competitions</h3><div class="grid" style="gap:6px;margin-bottom:14px">${d.comps.map(x=>`<div class="rev-item"><span class="tag ${x.type==='added'?'t-add':x.type==='removed'?'t-rem':'t-upd'}">${x.type}</span> <b>${esc(x.obj.name)}</b> ${x.fields?fchips(x.fields):''}</div>`).join('')}</div>`:'')
   +(k.teams&&tm.length?`<h3>Teams</h3><div class="grid" style="gap:6px;margin-bottom:14px">${tm.map(x=>`<div class="rev-item"><span class="tag ${x.type==='added'?'t-add':x.type==='removed'?'t-rem':'t-upd'}">${x.type}</span> <b>${esc(x.obj.name)}</b> ${x.fields?fchips(x.fields):''}</div>`).join('')}</div>`:'')
   +(k.players&&pl.length?`<h3>Players</h3><div class="tw"><table><thead><tr><th>Change</th><th>Player</th><th>Team</th><th class="num">OVR</th><th>Details</th></tr></thead><tbody>${pl.slice(0,400).map(x=>{const [c,l]=x.type==='added'?['t-add','added']:x.type==='removed'?['t-rem','removed']:x.type==='moved'?['t-mov','transfer']:['t-upd','changed'];
     return `<tr><td><span class="tag ${c}">${l}</span></td><td><b>${esc(x.p.name)}</b></td><td class="small">${x.type==='moved'?esc(x.tA.name)+' → '+esc(x.tB.name):esc((x.tB||x.tA).name)}</td>
     <td class="num">${x.pA?`${ovr(x.pA)} → `:''}${statHTML(ovr(x.p))}${x.dOvr?` <span class="${x.dOvr>0?'up':'down'} small">${x.dOvr>0?'+':''}${x.dOvr}</span>`:''}</td><td>${x.fields?fchips(x.fields):''}</td></tr>`}).join('')}</tbody></table></div>${pl.length>400?'<p class="muted small">Showing the first 400; filter by team or name to see more.</p>':''}`:'');
}
ACT.snapNew=async()=>{const n=await inputDialog('Take snapshot','Name','Snapshot '+new Date().toLocaleDateString());if(n===false||n==null)return;await takeSnapshot(n.trim()||undefined);rerender()};
ACT.snapBase=el=>{S.settings.baseline=el.dataset.id;saveSettings();toast('Baseline set','ok');rerender()};
ACT.snapDel=async el=>{const s=S.snaps[el.dataset.id];if(!await ask('Delete snapshot',`Delete <b>${esc(s.name)}</b>?`,'Delete',true))return;delete S.snaps[s.id];Store.del('snaps',s.id);Store.delBlob(s.ref);if(S.settings.baseline===s.id){S.settings.baseline=null;saveSettings()}rerender()};
ACT.snapRestore=async el=>{const s=S.snaps[el.dataset.id];if(!await ask('Restore snapshot',`Replace all teams and competitions with <b>${esc(s.name)}</b>? Your current data is snapshotted first.`,'Restore',true))return;
  const d=await loadSnap(s.id);await takeSnapshot('Before restoring '+s.name,true);
  // images and team files come back with the teams that use them (docs/DATABASE_RULES.md, 4.4); a link to an image whose file is gone is cleared
  const back=Object.values(d.images||{}).filter(i=>!S.images[i.id]);
  for(const grp of chunk(back,6))await Promise.all(grp.map(async i=>{let b=null;try{b=isOfRef(i.ref)||await Store.getBlob(i.ref)}catch(e){}
    if(b){S.images[i.id]=clone(i);Store.put('images',S.images[i.id])}}));
  Object.keys(S.teams).forEach(id=>{if(!d.teams[id])Store.del('teams',id)});Object.keys(S.comps).forEach(id=>{if(!d.comps[id])Store.del('comps',id)});
  if(d.teds){Object.keys(S.teds).forEach(id=>{if(!d.teds[id]){delete S.teds[id];Store.del('teds',id)}});Object.values(d.teds).forEach(x=>{if(canon(S.teds[x.id])!==canon(x)){S.teds[x.id]=clone(x);Store.put('teds',S.teds[x.id])}})}
  else Object.keys(S.teds).forEach(id=>{if(!d.teams[id]){delete S.teds[id];Store.del('teds',id)}});// an older snapshot has no team files: keep the current ones of the teams it has
  S.teams={};S.comps={};Object.values(d.teams).forEach(t=>saveTeam(clone(t)));Object.values(d.comps).forEach(c=>saveComp(clone(c)));
  const dead=new Set(),chk=id=>{if(id&&!S.images[id])dead.add(id)};
  teamsArr().forEach(t=>[t.emblem,t.managerPhoto,t.stadiumImg,...(t.sponsorImgs||[]),...(t.kits||[]).map(k=>k.img)].forEach(chk));compsArr().forEach(c=>[c.emblem,...(c.sponsorImgs||[])].forEach(chk));
  if(dead.size)unlinkImages(dead);
  toast('Restored '+s.name+(dead.size?` · ${dead.size} image link${dead.size===1?'':'s'} cleared (file no longer stored)`:''),'ok');rerender()};
function h2hView(){
  const h=S.ui.h2h;const all=allPlayers();const a=findPlayer(h.a);let b=null,bLabel='';
  if(h.bVer==='baseline'&&a){const base=dataFor('baseline');if(base)Object.values(base.teams).forEach(t=>(t.players||[]).forEach(x=>{if(x.id===a.p.id)b={p:x,t}}));bLabel='baseline version'}
  else b=findPlayer(h.b);
  const sel=(k,v)=>`<select data-ch="h2h" data-k="${k}"><option value="">Choose player…</option>${opts(all.map(({p,t})=>[p.id,p.name+' · '+(t.short||t.name)]),v)}</select>`;
  let body='';
  if(a&&b){body=`<div class="card"><div class="h2h" style="margin-bottom:10px"><span class="stat ${statCls(ovr(a.p))}">${ovr(a.p)}</span><b>${esc(a.p.name)} <span class="muted small">${esc(a.t.name)}</span></b><span class="muted small" style="text-align:center">OVR</span><b style="text-align:right">${esc(b.p.name)} <span class="muted small">${esc(bLabel||b.t.name)}</span></b><span class="stat ${statCls(ovr(b.p))}">${ovr(b.p)}</span></div>
   ${ATTRS.filter(x=>x[2]!=='gk'||a.p.pos==='GK'||b.p.pos==='GK').map(([k,l])=>{const x=a.p.attrs[k],y=b.p.attrs[k];return `<div class="h2h"><span class="num ${x>y?'up':''}" style="text-align:right">${x}</span><div class="l"><i style="width:${(x-40)/59*100}%"></i></div><span class="small muted" style="text-align:center">${l}</span><div class="r"><i style="width:${(y-40)/59*100}%"></i></div><span class="${y>x?'up':''}">${y}</span></div>`}).join('')}</div>`}
  return `<div class="row" style="margin-bottom:10px">${sel('a',h.a)}<span class="muted">vs</span><select data-ch="h2h" data-k="bVer"><option value="current" ${h.bVer==='current'?'selected':''}>another player</option><option value="baseline" ${h.bVer==='baseline'?'selected':''}>same player at baseline</option></select>${h.bVer==='current'?sel('b',h.b):''}</div>${body||'<p class="muted small">Pick two players, or one player against their baseline version.</p>'}`;
}
CH.h2h=el=>{S.ui.h2h[el.dataset.k]=el.value;rerender()};
