// PES 2021 Option Studio, part 9 of 14: Free sources: eFootball, Transfermarkt, Wikipedia, the team pull; squad health checks; flags.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ---- Free sources: the look-ups every job shares (one place per question) ---- */
// eFootball player records by game ID, 40 a request. Returns Map(id → record). opts.soft: a failed request is logged, kept in
// opts.down and the rest go on; without it the error is the caller's. opts.step runs after each request.
async function efPlayersByIds(gids,signal,opts={}){const out=new Map();let bad='';
  for(let i=0;i<gids.length;i+=40){if(signal.aborted)break;aiLog('eFootball: players '+(i+1)+'–'+Math.min(gids.length,i+40)+' of '+gids.length+'…');
    try{((await efApi('players?ids='+gids.slice(i,i+40).join(','),signal)).players||[]).forEach(r=>{if(r&&!r.error)out.set(+r.id,r)})}
    catch(e){if(e.name==='AbortError'||!opts.soft)throw e;bad=e.message;aiLog('  Could not connect to eFootball: '+e.message)}if(opts.step)opts.step()}
  if(bad&&opts.down)opts.down.push(['eFootball',bad]);return out}
// Transfermarkt players by name, 40 names a request. Returns Map(name → the players of that name)
async function tmPlayersByNames(names,signal){const tm=new Map();names=[...new Set(names)];
  for(let i=0;i<names.length;i+=40){const r=await tmApi('players?names='+encodeURIComponent(names.slice(i,i+40).join('|')),signal);Object.entries(r.players||{}).forEach(([n,l])=>tm.set(n,l))}return tm}
// of those, the ones with a club whose age fits one of the ages the studio has for him (no age known: all of them)
const tmAgeFits=(list,ages)=>(list||[]).filter(x=>x.club&&(!ages.length||ages.some(g=>{const t=tmAge(x.born);return !t||(t-g>=-1&&t-g<=DP_AGE_DRIFT)})));
const tmByClub=fit=>[...new Map(fit.map(x=>[x.club.id,x])).values()];
// an eFootball team's name as the index shows it
const efTeamName=(idx,id)=>{const h=idx&&(idx.teams||[]).find(t=>t.id===+id);return h?(h.shown||h.name):''};
// answers a search keeps in this browser, per season: {key, get(), save()}
function answerStore(prefix,cache){const key=season=>prefix+(season||S.settings.season);
  const get=season=>{const k=key(season),c=S.ui[cache]||(S.ui[cache]={});if(!c[k]){let o={};try{o=JSON.parse(localStorage.getItem(k)||'{}')}catch(e){}c[k]=o}return c[k]};
  return{key,get,save:season=>{try{localStorage.setItem(key(season),JSON.stringify(get(season)))}catch(e){}}}}
// Claude could not be reached for a batch: say so once, and mark every item of the batch as not looked up
function claudeDown(e,down,st,keys){if(!down.some(d=>d[0]==='Claude'))down.push(['Claude',e.message]);aiLog('  Could not connect to Claude: '+e.message);
  keys.forEach(k=>{st[k]={err:true,down:true,note:'Not looked up: could not connect to Claude ('+e.message+')',at:Date.now()}})}
async function srcApi(path,signal,what){let r;try{r=await fetch('api/'+path,{signal,cache:'no-store'})}catch(e){if(e.name==='AbortError')throw e;throw new Error('could not reach the server')}
  const o=await r.json().catch(()=>({}));if(!r.ok)throw new Error(o.error||(what+' look-up failed ('+r.status+')'));return o}
/* ================= eFootball database (PES Master), through this site's server =================
   eFootball is Konami's current game: its teams are this season's, and its team, player and country IDs are the ones PES 2021
   uses, so a pulled player carries his real game ID. The server reads PES Master's pages (/api/efootball/*); results go to Process and Review. */
const efAvailable=()=>!!(window.claude&&window.claude.standalone);
// a regular player's ID fits the game's 4-byte field; special eFootball cards (Epic, Highlight ...) have much longer IDs and are
// extra versions of a regular player, so they never become squad members
// the game's player ID field is 4 bytes, unsigned: up to 4,294,967,295 (option files use IDs from 2,147,483,648 up for their own
// edit players). Special eFootball cards have 11 to 14 digits, far beyond that.
const EF_MAX_ID=0xFFFFFFFF;const validGameId=v=>+v>0&&+v<=EF_MAX_ID;
const efOn=()=>efAvailable()&&S.settings.efFirst!==false;
function efApi(path,signal){return srcApi('efootball/'+path,signal,'eFootball')}
let EF_INDEX=null;
async function efIndex(signal){if(!EF_INDEX)EF_INDEX=await efApi('teams',signal);return EF_INDEX}
// the eFootball team for a studio team: the one it was pulled from before, the same game ID with a matching name, or a name search
// Same rule as the server's names.py: one club, or one name the start of the other with a word that names a club on its own.
// The looser word-overlap rule took "United FC" for Manchester United and "Al-Shabab" for Shabab Al-Ahli.
const NAME_GENERIC=new Set(['united','city','town','county','athletic','atletico','athletico','al','el','ahli','rovers','wanderers','inter','internacional','olympic','olympique','dynamo','dinamo','racing','union','deportivo','deportes','esporte','sport','sporting','real','royal','new','st','saint','san','santa','young','boys','stars','star','national','nacional','academy']);
function strictName(a,b){const A=coreTokens(a),B=coreTokens(b);if(!A.length||!B.length)return 0;
  if(A.join(' ')===B.join(' ')||(A.length===B.length&&A.every(w=>B.includes(w))))return 1;
  const [s,l]=A.length<=B.length?[A,B]:[B,A];if(s.every((w,i)=>l[i]===w)&&s.some(w=>!NAME_GENERIC.has(w)))return 0.85;return 0}
// only the club's own name counts: its in-game slot can be another club's (a club PES lacks takes over a slot it doesn't use)
const efNameOk=(h,t)=>reserveMark(h.name)===reserveMark(t.name)&&Math.max(strictName(h.name,t.name),strictName(h.shown,t.name))>=0.85;
async function efTeamFor(t,signal){const nat=isNationalTeam(t);const idx=await efIndex(signal);
  if(+t.efId){const h=idx.teams.find(x=>x.id===+t.efId);if(h&&efNameOk(h,t))return h;if(h)aiLog('  '+t.name+': its eFootball link points to '+h.name+', another team; looking it up by name')}
  // the game's own team at a code is eFootball's team of that ID whatever each side calls it (UNIÓN is "Unión Santa Fe"): a
  // shared word is enough there, where the strict name rule is for a search across every club
  if(+t.gameId){const h=idx.teams.find(x=>x.id===+t.gameId&&x.league.startsWith('national-teams')===nat);
    if(h&&(efNameOk(h,t)||(typeof gameOwnTeam==='function'&&gameOwnTeam(t)&&reserveMark(h.name)===reserveMark(t.name)&&(samePerson(h.name,t.name)||samePerson(h.shown||'',t.name)))))return h}
  const r=await efApi('teams?q='+encodeURIComponent(t.name)+'&national='+(nat?1:0),signal);
  const ok=(r.teams||[]).filter(x=>x.score>=0.85&&reserveMark(x.name)===reserveMark(t.name));const best=ok[0];if(!best)return null;
  // two different clubs fit equally well (no exact name): taking either could hand this club the other's squad
  const rival=ok.find(x=>x.id!==best.id&&norm(x.name)!==norm(best.name)&&x.score>=best.score);
  if(best.score<1&&rival){aiLog('  '+t.name+': '+best.name+' and '+rival.name+' both fit in eFootball; skipped');return null}
  return best}
// reserve and youth sides ('b', 'ii', 'u21' ...) never match a first team, or the first team's squad would move to them
const reserveMark=s=>{const m=norm(s).match(/\b(b|ii|iii|u ?\d\d|reserves?|youth|juniors?|juvenil)\b/);return m?m[1].replace(' ',''):''};
const EF_ATTR={offAw:'offensive_awareness',ballCtl:'ball_control',drib:'dribbling',tight:'tight_possession',lowPass:'low_pass',loftPass:'lofted_pass',finish:'finishing',heading:'heading',
  placeKick:'set_piece_taking',curl:'curl',speed:'speed',accel:'acceleration',kickPow:'kicking_power',jump:'jumping',contact:'physical_contact',balance:'balance',stamina:'stamina',
  defAw:'defensive_awareness',aggr:'aggression',gkAw:'gk_awareness',gkCatch:'gk_catching',gkClear:'gk_parrying',gkReflex:'gk_reflexes',gkReach:'gk_reach'};
const EF_POSKEY=['gk','cb','lb','rb','dm','cm','lm','rm','am','lw','rw','ss','cf'];
const EF_STYLE={'Attacking Full-back':'Offensive Full-back','Deep-lying Forward':'Hole Player','Deep-Lying Forward':'Hole Player','Basic':'None'};
const EF_SKILL={chop_turn:'Cross Over Turn',scissors_feint:'Scissors Feint',double_touch:'Double Touch',flip_flap:'Flip Flap',marseille_turn:'Marseille Turn',sombrero:'Sombrero',cut_behind_and_turn:'Cut Behind & Turn',
  scotch_move:'Scotch Move',sole_control:'Step On Skill Control',heading:'Heading',long_range_curler:'Long Range Drive',chip_shot_control:'Chip Shot Control',long_range_shooting:'Long Range Shooting',
  knuckle_shot:'Knuckle Shot',dipping_shot:'Dipping Shot',rising_shot:'Rising Shot',acrobatic_finishing:'Acrobatic Finishing',heel_trick:'Heel Trick',first_time_shot:'First-time Shot',one_touch_pass:'One-touch Pass',
  through_passing:'Through Passing',weighted_pass:'Weighted Pass',pinpoint_crossing:'Pinpoint Crossing',outside_curler:'Outside Curler',rabona:'Rabona',no_look_pass:'No Look Pass',low_lofted_pass:'Low Lofted Pass',
  gk_low_punt:'GK Low Punt',gk_high_punt:'GK High Punt',long_throw:'Long Throw',gk_long_throw:'GK Long Throw',penalty_specialist:'Penalty Specialist',gk_penalty_saver:'GK Penalty Saver',gamesmanship:'Gamesmanship',
  man_marking:'Man Marking',track_back:'Track Back',interception:'Interception',acrobatic_clearance:'Acrobatic Clear',captaincy:'Captaincy',super_sub:'Super-sub',fighting_spirit:'Fighting Spirit'};
const EF_COM={trickster:'Trickster',mazing_run:'Mazing Run',speeding_bullet:'Speeding Bullet',incisive_run:'Incisive Run',long_ball_expert:'Long Ball Expert',early_crosser:'Early Cross',long_ranger:'Long Ranger'};
// an eFootball player record as a studio player (abilities 1:1; Ball Winning = Tackling and Defensive Engagement averaged)
function efPlayer(d,national){const pos=POS[d.position]||'CMF';const attrs={};Object.entries(EF_ATTR).forEach(([k,v])=>attrs[k]=+d[v]||40);
  attrs.ballWin=Math.round(((+d.tackling||40)+(+d.defensive_engagement||40))/2);
  const playables={};EF_POSKEY.forEach((k,i)=>{const v=+d['pos_'+k]||0;if(v&&POS[i]!==pos)playables[POS[i]]=v>=2?'A':'B'});
  const st=EF_STYLE[d.attacking_playing_style]||d.attacking_playing_style||'None';const num=national?d.nsquadnumber:d.squadnumber;
  return normPlayer(Object.assign(newPlayer({name:d.name,pos}),{name:d.name||'',number:num||'',age:d.age||'',nat:d.nat_name||'',height:d.height||'',weight:d.weight||'',foot:d.foot===1?'L':'R',
    style:STYLES.includes(st)?st:'None',wfUsage:(+d.weak_foot_usage||0)+1,wfAcc:(+d.weak_foot_acc||0)+1,form:({0:3,1:5,2:7})[d.form]||4,injury:(+d.injury_resistance||0)+1,
    skills:Object.entries(EF_SKILL).filter(([k])=>d['s_'+k]).map(([,n])=>n),comStyles:Object.entries(EF_COM).filter(([k])=>d[k]).map(([,n])=>n),playables,attrs,
    src:'efootball',gameId:d.id,countryId:d.country||''}))}
// is the eFootball record at a player's game ID his? Only by name: the option file's IDs and the free IDs given in the studio are
// not eFootball's, so the number can be another man's there (Callum Styles' eFootball ID is M. BROWNE's in the 2026-27 file)
const efNameHis=(efName,name)=>!!efName&&!!name&&(samePlayer(efName,name)||samePerson(efName,name));
// update an existing studio player from his eFootball record, keeping his studio ID, team-file link and shirt name
function efMerge(p,d,national){const f=efPlayer(d,national);return normPlayer(Object.assign(clone(p),f,{id:p.id,ted:p.ted,shirtName:p.shirtName||f.shirtName,number:f.number||p.number}))}
// the whole squad of one team, as an incoming team for Process and Review
async function efDraftTeam(base,signal){
  const ef=await efTeamFor(base,signal);if(!ef)throw new Error('not in the eFootball database');
  aiLog('eFootball: '+base.name+(norm(ef.name)!==norm(base.name)?' → '+ef.name:'')+' (team '+ef.id+')…');
  const d=await efApi('squad?team='+ef.id+'&players=1',signal);if(!(d.squad||[]).filter(p=>validGameId(p.id)).length)throw new Error(ef.name+' has no regular team in eFootball (only special cards)');
  const inc=clone(base);inc.efId=ef.id;const nat=isNationalTeam(base);const old=inc.players||[];const used=new Set();const out=[];
  const seenIds=new Set();
  for(const r of d.players){if(r.error||!validGameId(r.id)||seenIds.has(+r.id))continue;seenIds.add(+r.id);
    // by ID only when the name there is his, when the ID was given in the studio (a free ID: another man's number in eFootball)
    const ex=old.find(p=>!used.has(p.id)&&+p.gameId===+r.id&&(!p.codeSet||efNameHis(r.name,p.name)))||old.find(p=>!used.has(p.id)&&(!+p.gameId||isEditId(p.gameId)||p.codeSet)&&samePlayer(p.name,r.name));
    if(ex){used.add(ex.id);const q=efMerge(ex,r,nat);if(ex.codeSet&&+ex.gameId&&+ex.gameId!==+r.id)q.gameId=ex.gameId;out.push(q)}else out.push(efPlayer(r,nat))}
  const bad=d.players.filter(r=>r.error).length;if(bad)aiLog('  '+bad+' player page'+(bad>1?'s':'')+' could not be read');
  inc.players=out;aiLog('  '+out.length+' players ('+(out.length-used.size)+' new, '+used.size+' updated'+(old.length>used.size?', '+(old.length-used.size)+' left the team':'')+')');return inc}
const efQueueTeams=(ts,label)=>{if(!ts.length){toast('No teams to update','err');return}
  queueAdd(ts.map(t=>({type:'live',teamId:t.id,needs:LIVE_TEAM.slice(),label:'Live update: '+t.name})));toast('Live update queued for '+ts.length+' team'+(ts.length>1?'s':'')+(label?' ('+label+')':'')+'. Results go to Process and Review.','ok')};
ACT.efTeam=el=>efQueueTeams([S.teams[el.dataset.id]].filter(Boolean));
ACT.efSel=()=>{if(!efAvailable()){toast('The free sources are reached through the site\'s server.','err');return}const ids=[...S.ui.sel];if(!ids.length)return;
  const ch=[];for(let i=0;i<ids.length;i+=120)ch.push(ids.slice(i,i+120));queueAdd(ch.map((c,i)=>({type:'freePlayers',ids:c,label:'Free sources: players '+(i*120+1)+'–'+(i*120+c.length)})));toast('Queued '+ids.length+' players','ok')};

/* ---- eFootball images: crests, coaches and league logos ---- */
// Crests are 128 px (shown at 256), so they only fill an empty emblem; coaches count only with a real photo, since eFootball
// gives unlicensed teams made-up coaches without one. National teams keep their flags.
async function efImage(path,signal){const r=await fetch('api/efootball/image?path='+encodeURIComponent(path),{signal});if(!r.ok)throw new Error('image '+r.status);return r.blob()}
// a competition's eFootball league: the one most of its clubs play in
async function efLeagueFor(c,signal){const idx=await efIndex(signal);const byId=new Map(idx.teams.map(t=>[t.id,t]));const cnt={};
  teamsArr().filter(t=>t.compId===c.id&&+t.efId).forEach(t=>{const e=byId.get(+t.efId);if(e&&e.leagueId!=null)cnt[e.leagueId]=(cnt[e.leagueId]||0)+1});
  const best=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];return best?+best[0]:null}
ACT.efImg=el=>{const t=S.teams[el.dataset.id];if(!t)return hcGone();if(!efAvailable()){toast('The free sources are reached through the site\'s server: open the studio from start.bat or the website.','err');return}queueAdd([{type:'efImages',teamIds:[t.id],compIds:[],label:'Free sources: '+t.name}]);toast('Queued the crest of '+t.name+'. The result goes to Process and Review.','ok')};

/* ---- Transfermarkt open data (github.com/dcaribou/transfermarkt-datasets): clubs eFootball doesn't have, coaches, stadiums ---- */
// No shirt numbers or detailed abilities there: abilities are estimated from market value and age (as for spreadsheet imports)
// and numbers handed out like Health check's Renumber.
function tmApi(path,signal){return srcApi('tm/'+path,signal,'Transfermarkt')}
async function tmClubFor(t,signal){if(isNationalTeam(t))return null;if(t.tmId)return{id:String(t.tmId)};
  const r=await tmApi('search?q='+encodeURIComponent(t.name),signal);const ok=(r.clubs||[]).filter(x=>x.score>=0.85);const best=ok[0];if(!best)return null;
  const rival=ok.find(x=>String(x.id)!==String(best.id)&&x.score>=best.score);if(best.score<1&&rival){aiLog('  '+t.name+': '+best.name+' and '+rival.name+' both fit in Transfermarkt; skipped');return null}return best}
const TM_POS={'Goalkeeper':'GK','Centre-Back':'CB','Left-Back':'LB','Right-Back':'RB','Defensive Midfield':'DMF','Central Midfield':'CMF','Attacking Midfield':'AMF',
  'Left Midfield':'LMF','Right Midfield':'RMF','Left Winger':'LWF','Right Winger':'RWF','Second Striker':'SS','Centre-Forward':'CF'};
const tmAge=born=>{const d=new Date(born);if(isNaN(d))return'';const n=new Date();let a=n.getFullYear()-d.getFullYear();if(n<new Date(n.getFullYear(),d.getMonth(),d.getDate()))a--;return a>0?a:''};
function tmPlayer(r){const pos=TM_POS[r.subPosition]||({Goalkeeper:'GK',Defender:'CB',Midfield:'CMF',Attack:'CF'})[r.position]||'CMF';const age=tmAge(r.born);
  const p=newPlayer({name:r.name,pos});Object.assign(p,{age,nat:r.nat||'',height:+r.height||'',foot:/left/i.test(r.foot||'')?'L':'R',src:'transfermarkt',tmId:r.id});
  const target=valueToOvr(+r.value,age);if(target)p.attrs=attrsFromOvr(p.name,pos,target);return normPlayer(p)}
async function tmDraftTeam(base,signal){const c=await tmClubFor(base,signal);if(!c)throw new Error('not in the Transfermarkt dataset');
  const d=await tmApi('squad?club='+c.id,signal);if(!(d.players||[]).length)throw new Error(d.club.name+' has no current players in the Transfermarkt dataset');
  aiLog('Transfermarkt: '+base.name+(norm(d.club.name)!==norm(base.name)?' → '+d.club.name:'')+' ('+d.club.league+', '+d.club.season+'/'+String(+d.club.season+1).slice(2)+')…');
  const inc=clone(base);inc.tmId=d.club.id;inc._src='Transfermarkt';inc._season=+d.club.season||0;const old=inc.players||[];const used=new Set();const out=[];
  for(const r of d.players){const ex=old.find(p=>!used.has(p.id)&&(p.tmId===r.id||samePlayer(p.name,r.name)));
    if(ex){used.add(ex.id);const f=tmPlayer(r);const p=clone(ex);['age','nat','height'].forEach(k=>{if(!p[k])p[k]=f[k]});p.tmId=r.id;if(unrated(p))p.attrs=f.attrs;out.push(normPlayer(p))}else out.push(tmPlayer(r))}
  inc.players=out;inc.manager=inc.manager||{name:'',nat:'',age:''};if(!inc.manager.name&&d.coach)inc.manager.name=d.coach;if(!inc.stadium&&d.stadium)inc.stadium=d.stadium;renumber(inc);
  aiLog('  '+out.length+' players ('+(out.length-used.size)+' new; abilities estimated from market value and age)');return inc}
// Wikipedia: the club article's current squad (number, nationality, position, name; birth date and height from Wikidata for
// players with an article). It covers the clubs eFootball and the Transfermarkt dataset don't, above all clubs just promoted
// into a pro league, and it is kept up to date during the season.
function wpApi(path,signal){return srcApi('wp/'+path,signal,'Wikipedia')}
const teamCountry=t=>t.country||((S.comps[t.compId]||{}).country)||'';
function wpPlayer(r){const pos=POS.includes(r.pos)?r.pos:'CMF';const p=newPlayer({name:r.name,pos});
  Object.assign(p,{age:r.born?tmAge(r.born):'',nat:r.nat||'',height:+r.height||'',number:+r.no||'',src:'wikipedia'});return normPlayer(p)}
async function wpDraftTeam(base,signal){if(isNationalTeam(base))throw new Error('national teams come from FIFA');
  const d=await wpApi('squad?name='+encodeURIComponent(base.name)+'&country='+encodeURIComponent(teamCountry(base))+(base.wpTitle?'&title='+encodeURIComponent(base.wpTitle):''),signal);
  aiLog('Wikipedia: '+base.name+(norm(d.club.title)!==norm(base.name)?' → '+d.club.title:'')+(d.club.asOf?' (team as of '+d.club.asOf+')':'')+'…');
  const inc=clone(base);inc.wpTitle=d.club.title;inc._src='Wikipedia';inc._asOf=d.club.asOf||'';const old=inc.players||[];const used=new Set();const out=[];
  for(const r of d.players){const ex=old.find(p=>!used.has(p.id)&&samePlayer(p.name,r.name));const f=wpPlayer(r);
    if(ex){used.add(ex.id);const p=clone(ex);['age','nat','height'].forEach(k=>{if(!p[k])p[k]=f[k]});if(!p.number&&f.number)p.number=f.number;out.push(normPlayer(p))}else out.push(f)}
  inc.players=out;renumber(inc);
  const det=out.filter(p=>p.age).length;aiLog('  '+out.length+' players ('+(out.length-used.size)+' new; '+det+' with birth date from Wikidata)');return inc}
const seasonYear=()=>+(String(S.settings.season||'').match(/\d{4}/)||[new Date().getFullYear()])[0];
/* ---- Live update: one button for a team and for a competition (the user, 2026-11-25) ----
   Free sources only, through the buckets in order (app-buckets.js). Nothing here asks Claude: what the free sources don't have,
   and what only Claude can do (kits, formation and playstyle), is listed in Process and Review under Ask Claude. Nothing
   changes until the results are accepted in Process and Review. */
const LIVE_TIP='Live update: the free sources in order (FIFA for World Cup national teams, eFootball, Transfermarkt, Wikipedia, EA SPORTS FC; then TheSportsDB and Wikidata; crests from the image sources). Results go to Process and Review. Claude is asked only from there';
ACT.teamLive=el=>{const t=S.teams[el.dataset.id];if(!t){toast('That team is no longer in the project','err');return}
  queueAdd([{type:'live',teamId:t.id,needs:LIVE_TEAM.slice(),season:S.settings.season,label:'Live update: '+t.name}]);askTeamParts(t,['kits','manager']);
  toast('Live update queued for '+t.name+'. Results go to Process and Review.','ok')};
ACT.compLive=async el=>{const c=S.comps[el.dataset.id];if(!c){toast('That competition is no longer in the project','err');return}
  const season=S.settings.season,ts=compMembers(c).filter(t=>!t.sameAs),logo=!c.emblem&&!c.worldCup&&!pesOwnLogo(c);
  const jobs=[...(c.worldCup?[]:[{type:'compFree',compId:c.id,season,label:'Live update: '+c.name+' teams'}]),
    ...ts.map(t=>({type:'live',teamId:t.id,needs:LIVE_TEAM.slice(),season,label:'Live update: '+t.name+' ('+c.name+')'})),
    ...(logo?[{type:'freeArt',teamIds:[],compIds:[c.id],opts:['logos'],which:'missing',title:'Live update',label:c.name+': logo'}]:[])];
  if(!jobs.length){toast('Nothing to update in '+c.name,'ok');return}
  if(!await ask('Live update for '+c.name+'?',`${c.worldCup?'':'Its team list for '+esc(season)+', '}<b>${ts.length}</b> team${ts.length===1?'':'s'} (players, ratings, crests, coaches and stadiums)${logo?' and the competition logo':''}, from the free sources in order: ${esc(LIVE_ORDER_TEXT)}.<br><br>Claude is not asked. Nothing changes until you accept the results in <b>Process and Review</b>.`,'Live update'))return;
  queueAdd(jobs);toast('Live update queued for '+c.name+': '+(c.worldCup?'':'its team list and ')+ts.length+' team'+(ts.length===1?'':'s')+'. Results go to Process and Review.','ok')};
ACT.efFirst=el=>{S.settings.efFirst=el.checked;saveSettings()};
ACT.efRefreshIndex=async()=>{try{await miniBusy('Reading the eFootball league pages…',async()=>{EF_INDEX=await efApi('teams?refresh=1')});toast('eFootball team list: '+EF_INDEX.teams.length+' teams','ok')}catch(e){toast(e.message,'err')}};


/* ================= Health check: squads, player data and game IDs ================= */
// Each issue can carry several fixes; the eFootball ones appear when the studio runs from its server.
// duplicates in one squad. Returns {copies: entries to drop, names, badIds: IDs too long for the game, sameName: names shared by different players}
function squadDuplicates(ps){const keyOf=p=>validGameId(p.gameId)?'id:'+(+p.gameId):p.ted&&+p.ted.pid?'id:'+(+p.ted.pid):'n:'+norm(p.name)+'|'+(p.age||'')+'|'+p.pos;
  const by=new Map();ps.forEach(p=>(by.get(keyOf(p))||by.set(keyOf(p),[]).get(keyOf(p))).push(p));
  // entries without a usable ID that share a name with an entry that has one are the same person (special-card copies)
  const named=new Map();ps.forEach(p=>{const n=norm(p.name);(named.get(n)||named.set(n,[]).get(n)).push(p)});
  const drop=new Set();by.forEach(a=>a.slice(1).forEach(p=>drop.add(p)));
  named.forEach(a=>{if(a.length<2)return;const bad=a.filter(p=>+p.gameId&&!validGameId(p.gameId));if(bad.length)(a.some(p=>validGameId(p.gameId))?bad:bad.slice(1)).forEach(p=>drop.add(p))});
  const sameName=[...named.entries()].filter(([,a])=>{const ids=new Set(a.filter(p=>!drop.has(p)&&validGameId(p.gameId)).map(p=>+p.gameId));return ids.size>1}).map(([,a])=>a[0].name);
  return{copies:drop.size,names:[...new Set([...drop].map(p=>p.name))],badIds:ps.filter(p=>+p.gameId&&!validGameId(p.gameId)).length,sameName,drop}}
const playerScore=p=>(p.ted&&p.ted.pid?8:0)+(validGameId(p.gameId)?4:0)+['age','height','weight','nat','number'].filter(k=>p[k]).length-(unrated(p)?3:0);
function playerGaps(p){const g=[];if(!p.age)g.push('age');if(!p.height)g.push('height');if(!p.weight)g.push('weight');if(!p.nat&&!+p.countryId&&!(p.ted&&+p.ted.pid))g.push('nationality');/* a player with a game record has his nationality there */if(!p.number)g.push('number');if(unrated(p))g.push('ratings');return g}
{const _hi=healthIssues;healthIssues=()=>{
  const iss=_hi().filter(i=>!(i.cat==='Squad size'&&/ has only /.test(i.msg)));// team size is reported below with its fixes
  iss.forEach(i=>{if(i.cat==='Shirt numbers'&&i.sev==='warn'&&/#\d/.test(i.msg))i.sev='err'});// a number may be worn once per team
  const add=(sev,cat,msg,acts)=>iss.push({sev,cat,msg,acts:acts.filter(Boolean)});const ef=efAvailable();
  const squadFix=t=>[{a:'efTeam',id:t.id,label:'Live update'},{a:'openTeam',id:t.id,label:'Open'}];
  // a squad with no goalkeeper is a squad to look up, like one that is too small: free sources first, then Claude
  iss.forEach(i=>{if(i.cat==='Goalkeepers'&&i.act&&S.teams[i.act.id]){i.acts=squadFix(S.teams[i.act.id]).filter(Boolean);delete i.act}});
  const byGid=new Map();const TID=typeof tidPlan==='function'?tidPlan():new Map();
  teamsArr().forEach(t=>{const ps=t.players||[];
    if(t.sameAs)return;// a cup copy: its team file is written once, on its league team
    // squads
    if(!ps.length)add('warn','Squads',`${t.name} has no players`,squadFix(t));
    else if(ps.length<15)add('warn','Squads',`${t.name} has only ${ps.length} players (fewer than 15)`,squadFix(t));
    // player data
    // ratings are their own sub-group (Missing ratings, the user 2026-11-22): this row counts the other details only
    const gaps={};let n=0;ps.forEach(p=>{const g=playerGaps(p).filter(k=>k!=='ratings');if(g.length)n++;g.forEach(k=>gaps[k]=(gaps[k]||0)+1)});
    if(n)add('warn','Player data',`${t.name}: ${n} player${n>1?'s':''} missing ${Object.entries(gaps).map(([k,c])=>c+' '+k).join(', ')}`,
      [{a:'efFill',id:t.id,label:'Live update'},gaps.number&&{a:'fixNumbers',id:t.id,label:'Give numbers'},{a:'randomFill',id:t.id,label:'Random fill'},{a:'openTeam',id:t.id,label:'Open'}]);
    // team IDs
    const tpl=S.teds[t.id];
    // a team whose competition is known is offered one of that competition's free IDs straight away (tidPlan)
    if(!+t.gameId&&!teamFileInfo(t)){const u=TID.get(t.id),lk=typeof teamLeagueKey==='function'?teamLeagueKey(t):'';
      add('warn','Game IDs',`${t.name} has no in-game team ID, so no team file can be written${u?'. '+compName(t.compId)+' has a free ID for it: '+u.code:lk&&TID.ready?'. '+compName(t.compId)+' has no free ID left':''}`,
        [u&&{a:'tidUse',id:t.id,label:'Use available competition ID ('+u.code+')'},{a:'hcCodes',id:t.id,label:'Pick an ID'},{a:'openImport',id:t.id,label:'Import its .ted'}])}
    if(+t.gameId)(byGid.get(+t.gameId)||byGid.set(+t.gameId,[]).get(+t.gameId)).push(t);
    if(tpl&&tpl.generated&&tpl.replaces)add('info','Game IDs',`${t.name} replaces the in-game team ${tpl.replaces} (ID ${tpl.tedTeamId}), assigned automatically because PES 2021 doesn't have it`,[{a:'hcCodes',id:t.id,label:'Game codes'}]);
    // duplicate players: the same game player twice, or the same person twice without IDs; same name but different IDs is only a check
    const D=squadDuplicates(ps);
    if(D.copies)add('err','Duplicate players',`${t.name}: ${D.copies} duplicate entr${D.copies>1?'ies':'y'} (${D.names.slice(0,4).join(', ')}${D.names.length>4?'…':''}); a team must list each player once`,
      [{a:'dedupeTeam',id:t.id,label:'Remove duplicates'},{a:'openTeam',id:t.id,label:'Open'}]);
    const inGame=teamHasGameId(t);// a team with no game ID: its players' game IDs are not checked until it has one
    if(inGame&&D.sameName.length)add('warn','Duplicate players',`${t.name}: ${D.sameName.map(n=>'two players named '+n).join('; ')} with different game IDs; check they are different people`,[{a:'openTeam',id:t.id,label:'Open'}]);
    const mis=ps.filter(p=>p.ted&&+p.ted.pid&&+p.gameId&&+p.ted.pid!==+p.gameId);
    // which of the two is his is told by name (mislinkKind), and the buttons follow: Use the team-file ID, Use the game ID,
    // Allocate a free ID, each for the players it is right for. Until the team files are read, the row only opens the team.
    if(inGame&&mis.length){const head=`${t.name}: ${mis.length} player${mis.length>1?'s have':' has'} a game ID different than in ${mis.length>1?'their':'his'} team-file`,nm=L=>L.slice(0,4).map(p=>p.name).join(', ')+(L.length>4?' and '+(L.length-4)+' more':'');
      if(!pcReady()){if(S.settings.ofPkg&&nfOn())pcLoadAll();add('warn','Game IDs',`${head} (${nm(mis)}). ${S.settings.ofPkg?'Reading the team files to tell which of the two is his':'An option file is needed to tell which of the two is his'}`,[{a:'openTeam',id:t.id,label:'Open'}])}
      else{const K={own:[],given:[],id:[],none:[]};mis.forEach(p=>K[mislinkKind(p)].push(p));
        // an allocated entry still carries the name of the player it was: said in the row, so the other name is no surprise
        const over=L=>L.slice(0,4).map(p=>{const e=pcGame().get(+p.ted.pid);return p.name+(e&&e.name?' (written over '+e.name+')':'')}).join(', ')+(L.length>4?' and '+(L.length-4)+' more':'');const fl=K.own.length+K.given.length,n=(c,one,many)=>c>1?many+' ('+c+')':one;
        add('warn','Game IDs',head+'. '+[K.own.length&&'The team-file entry is his own, so the ID shown is the wrong one: '+nm(K.own),K.given.length&&'The team-file entry is the free ID he was allocated, so the ID shown is the wrong one: '+over(K.given),K.id.length&&'The game has him under the ID shown, not under the team-file entry: '+nm(K.id),K.none.length&&'Neither is his: '+nm(K.none)].filter(Boolean).join('. '),
          [fl&&{a:'mislinkFile',id:t.id,label:n(fl,'Use the team-file ID','Use the team-file IDs')},K.id.length&&{a:'unlinkTed',id:t.id,label:n(K.id.length,'Use the game ID','Use the game IDs')},K.none.length&&{a:'mislinkNew',id:t.id,label:n(K.none.length,'Allocate a free ID','Allocate free IDs')},{a:'openTeam',id:t.id,label:'Open'}])}}
    const noId=ps.filter(p=>!+p.gameId&&!(p.ted&&+p.ted.pid)).length;
    if(inGame&&noId)add('info','Game IDs',`${t.name}: ${noId} player${noId>1?'s have':' has'} no game ID; team files leave ${noId>1?'them':'him'} out until ${noId>1?'they have':'he has'} one`,[{a:'efIds',id:t.id,label:'Live update'},{a:'openTeam',id:t.id,label:'Open'}]);
  });
  byGid.forEach((ts,g)=>{if(ts.length>1)add('err','Game IDs',`${ts.map(t=>t.name).join(' and ')} share in-game team ID ${g}; their team files would overwrite the same game team`,ts.map(t=>({a:'openTeamInfo',id:t.id,label:'Open '+(t.short||t.name)})))});
  const rank={err:0,warn:1,info:2};return iss.map((x,i)=>[x,i]).sort((a,b)=>rank[a[0].sev]-rank[b[0].sev]||a[1]-b[1]).map(x=>x[0])}}
const healthTeam=el=>S.teams[el.dataset.id];
const hcGone=()=>toast('That team is no longer in the project','err');
// the health check's player fixes: Live update for the team's players who miss something (details, ratings, a game ID)
ACT.efFill=el=>{const t=healthTeam(el);if(!t)return hcGone();const ids=(t.players||[]).filter(p=>playerGaps(p).length).map(p=>p.id);if(!ids.length){toast('Nothing is missing in '+t.name,'ok');return}
  queueAdd([{type:'live',ids,needs:['details'],label:'Live update: '+t.name}]);toast('Live update queued for '+ids.length+' player'+(ids.length===1?'':'s')+' of '+t.name+'. Results go to Process and Review.','ok')};
ACT.efIds=el=>{const t=healthTeam(el);if(!t)return hcGone();const ids=(t.players||[]).filter(p=>!+p.gameId&&!(p.ted&&+p.ted.pid)).map(p=>p.id);if(!ids.length){toast('Every player of '+t.name+' has a game ID','ok');return}
  queueAdd([{type:'live',ids,needs:['details'],label:'Live update: IDs for '+t.name}]);toast('Live update queued for '+ids.length+' player'+(ids.length===1?'':'s')+' of '+t.name+'. Results go to Process and Review.','ok')};
// Random fill: the last resort for missing player details, worked out in code with no look-up. Only empty fields are filled,
// with realistic made-up values: age around 26, height and weight by position, nationality mostly the club's country or one
// already in the squad (a national team's own country), shirt numbers by position, ratings at the squad's level shaped by position.
const rfN=(m,sd)=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return m+sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
const rfI=(m,sd,lo,hi)=>clamp(Math.round(rfN(m,sd)),lo,hi);
const RF_H={GK:189,CB:186,LB:178,RB:178,DMF:181,CMF:179,LMF:176,RMF:176,AMF:176,LWF:175,RWF:175,SS:178,CF:184};
const RF_NUM={GK:[1,12,13,23,25,31],CB:[4,5,3,15,6,24],LB:[3,2,23,26],RB:[2,22,27],DMF:[6,16,18],CMF:[8,14,16,18],LMF:[11,7,17],RMF:[7,17,11],AMF:[10,20,21],LWF:[11,7,19],RWF:[7,17,21],SS:[10,9,19],CF:[9,19,20,29]};
function rfLevel(t){const r=(t.players||[]).filter(p=>!unrated(p)).map(ovr).sort((a,b)=>a-b);return r.length?r[Math.floor(r.length/2)]:66}
function rfNat(t){if(isNationalTeam(t))return t.country||t.name||'';const pool=(t.players||[]).map(p=>p.nat).filter(Boolean);
  if(t.country&&(!pool.length||Math.random()<0.6))return t.country;return pool.length?pool[Math.floor(Math.random()*pool.length)]:''}
function rfRatings(p,L){const key=W[p.pos]||W.CMF,gk=p.pos==='GK',grp=POS_GROUP(p.pos);
  ATTR_KEYS.forEach(k=>{const g=GROUPS_OF(k);let v;
    if(key[k])v=rfN(L+1,3);
    else if(gk)v=g==='gk'?rfN(L,3):k==='kickPow'||k==='jump'||k==='contact'?rfN(L-12,5):rfN(47,5);
    else if(g==='gk')v=rfN(42,2);
    else if(g==='def')v=grp==='ATT'?rfN(L-26,6):grp==='MID'?rfN(L-12,7):rfN(L-4,4);
    else if(g==='att')v=grp==='DEF'?rfN(L-14,7):rfN(L-6,6);
    else v=rfN(L-4,6);
    p.attrs[k]=clamp(Math.round(v),40,99)});
  for(let i=0;i<3;i++){const d=L-ovr(p);if(!d)break;Object.keys(key).forEach(k=>p.attrs[k]=clamp(p.attrs[k]+d,40,99))}}
// what: 'details' (age, height, weight, nationality, number), 'ratings', or both when not given
const rfGaps=(p,what)=>playerGaps(p).filter(g=>what==='details'?g!=='ratings':what==='ratings'?g==='ratings':true);
function randomFillTeam(t,what){const ps=(t.players||[]).filter(p=>rfGaps(p,what).length);const L=rfLevel(t);let n=0;
  const used=new Set((t.players||[]).map(p=>+p.number).filter(Boolean));
  ps.forEach(p=>{const g=rfGaps(p,what);
    if(g.includes('age'))p.age=rfI(26,4,17,p.pos==='GK'?38:36);
    if(g.includes('height'))p.height=rfI(RF_H[p.pos]||180,5,160,205);
    if(g.includes('weight'))p.weight=clamp(Math.round(clamp(rfN(23,0.9),21,25)*Math.pow((+p.height||RF_H[p.pos]||180)/100,2)),55,100);
    if(g.includes('nationality')){const c=rfNat(t);if(c)p.nat=c}
    if(g.includes('number')){let x=(RF_NUM[p.pos]||[]).find(v=>!used.has(v));if(!x){x=1;while(used.has(x)&&x<99)x++}used.add(x);p.number=x}
    if(g.includes('ratings'))rfRatings(p,clamp(Math.round(rfN(L,4)),45,92));
    normPlayer(p);n++});
  if(n)saveTeam(t);return n}
ACT.randomFill=async el=>{const t=healthTeam(el);if(!t)return;const ps=(t.players||[]).filter(p=>rfGaps(p,'details').length);if(!ps.length){toast('Nothing missing in '+t.name,'ok');return}
  if(!await ask('Random fill '+t.name+'?',`<b>${ps.length}</b> player${ps.length===1?'':'s'} get made-up but realistic values for only what ${ps.length===1?'he lacks':'they lack'}: age, height and weight by position, a nationality from the team's country or players, and shirt numbers. Ratings are under Missing ratings. Nothing a player already has changes.<br><br>This is a last resort: the values are invented, not looked up. Try <b>Pull from free sources</b> or <b>Claude fill</b> first. You can undo it from the change history.`,'Random fill'))return;
  const n=histLabel('Random fill in '+t.name,'Health',()=>randomFillTeam(t,'details'));toast(t.name+': '+n+' player'+(n===1?'':'s')+' filled with random values','ok');rerender()};
ACT.randomFillAll=async el=>{const items=(S.ui.hcGroups||{})[el.dataset.hk]||[];
  const ts=[...new Set(items.filter(i=>i.cat==='Player data').map(i=>i.s.id))].map(id=>S.teams[id]).filter(t=>t&&(t.players||[]).some(p=>rfGaps(p,'details').length));if(!ts.length){toast('No team here has details missing','ok');return}
  const np=ts.reduce((s,t)=>s+t.players.filter(p=>rfGaps(p,'details').length).length,0);
  if(!await ask('Random fill '+hcPl(ts.length,'team')+'?',`<b>${np}</b> player${np===1?'':'s'} in <b>${hcPl(ts.length,'team')}</b> get made-up but realistic values for only what they lack: age, height and weight by position, a nationality from the team's country or players, and shirt numbers. Ratings are under Missing ratings. Nothing a player already has changes.<br><br>This is a last resort: the values are invented, not looked up. Try <b>Pull from free sources</b> or <b>Claude fill</b> first. You can undo it from the change history in one step.`,'Random fill all '+np+' player'+(np===1?'':'s')))return;
  await takeSnapshot('Before random fill in '+hcPl(ts.length,'team'),true);
  let n=0;histLabel('Random fill in '+hcPl(ts.length,'team'),'Health',()=>ts.forEach(t=>n+=randomFillTeam(t,'details')));toast(n+' player'+(n===1?'':'s')+' in '+hcPl(ts.length,'team')+' filled with random values','ok');rerender()};
// Missing ratings → Random fill: ratings only, at the team's level (a last resort, as above)
ACT.randomRate=async el=>{const t=healthTeam(el);if(!t)return;const ps=(t.players||[]).filter(p=>rfGaps(p,'ratings').length);if(!ps.length){toast('Every player of '+t.name+' is rated','ok');return}
  if(!await ask('Random ratings for '+t.name+'?',`<b>${ps.length}</b> unrated player${ps.length===1?'':'s'} get made-up ratings at the team's level (about ${rfLevel(t)}), by position. Nothing else changes.<br><br>This is a last resort: the ratings are invented, not looked up. Try <b>Pull from free sources</b> or <b>Queue Claude ratings</b> first. You can undo it from the change history.`,'Random fill'))return;
  const n=histLabel('Random ratings in '+t.name,'Health',()=>randomFillTeam(t,'ratings'));toast(t.name+': '+n+' player'+(n===1?'':'s')+' given random ratings','ok');rerender()};
// Use the game ID: the link to another record is dropped only where the game has him under his game ID (pcOwnRec: a number
// only a source gave him is not a game ID; rule book, "Has an ID"). The others keep their link and are named.
ACT.unlinkTed=el=>{const t=healthTeam(el);if(!t)return hcGone();if(!pcReady()){toast(pcNoFileWhy()||'Still reading the team files: try again in a moment','err');return}const mis=(t.players||[]).filter(p=>p.ted&&+p.ted.pid&&+p.gameId&&+p.ted.pid!==+p.gameId);
  const ok=mis.filter(p=>mislinkKind(p)==='id'),left=mis.length-ok.length;
  if(!ok.length){toast(mis.length?t.name+': the game has none of these players under his game ID, so nothing changed. Open the team to check them.':'Nothing to change in '+t.name,mis.length?'err':'ok');return}
  histLabel('Use the game ID: '+t.name,'Health',()=>{ok.forEach(p=>{p.ted=null});saveTeam(t)});PCV++;
  toast(t.name+': '+ok.length+' player'+(ok.length===1?' now follows his':'s now follow their')+' game ID'+(left?'; '+left+' kept '+(left===1?'his':'their')+' link (the game has no such player under that ID)':''),'ok');rerender()};
function dedupePlan(t){const ps=t.players||[];
  // keep the most complete entry of each player: linked to a team file, then a valid game ID, then filled-in details
  const groups=new Map();const keyOf=p=>validGameId(p.gameId)?'id:'+(+p.gameId):p.ted&&+p.ted.pid?'id:'+(+p.ted.pid):'n:'+norm(p.name)+'|'+(p.age||'')+'|'+p.pos;
  ps.forEach(p=>{const k=keyOf(p);(groups.get(k)||groups.set(k,[]).get(k)).push(p)});
  // copies with an ID that doesn't fit join the regular entry of the same name, if there is one
  const byName=new Map();[...groups.keys()].forEach(k=>{const a=groups.get(k);const n=norm(a[0].name);if(k.startsWith('id:'))byName.set(n,k)});
  [...groups.keys()].forEach(k=>{const a=groups.get(k);if(!k.startsWith('id:')&&a.some(p=>+p.gameId&&!validGameId(p.gameId))){const n=norm(a[0].name);const to=byName.get(n);if(to){groups.get(to).push(...a);groups.delete(k)}}});
  const keep=[...groups.values()].map(a=>a.slice().sort((x,y)=>playerScore(y)-playerScore(x)||ovr(x)-ovr(y))[0]);
  // the entries kept whose ID doesn't fit the game: cleared when the plan is applied (the team-file record's ID, or a new edit ID later)
  const clear=keep.filter(p=>+p.gameId&&!validGameId(p.gameId));
  const kept=new Set(keep);return{ps,keep,n:ps.length-keep.length,clear,gone:ps.filter(p=>!kept.has(p))}}
function dedupeApply(t,P){P.clear.forEach(p=>{p.gameId=p.ted&&validGameId(p.ted.pid)?+p.ted.pid:''});const order=new Map(P.ps.map((p,i)=>[p.id,i]));
  t.players=P.keep.slice().sort((a,b)=>order.get(a.id)-order.get(b.id));saveTeam(t)}
ACT.dedupeTeam=async el=>{const t=healthTeam(el);if(!t)return;const P=dedupePlan(t);const{ps,keep,n,clear,gone}=P;
  if(!n&&!clear.length){toast('No duplicates in '+t.name,'ok');return}
  const names=clear.slice(0,4).map(p=>esc(p.name)).join(', ')+(clear.length>4?'…':'');
  const txt=[n?`<b>${n}</b> duplicate entr${n===1?'y is':'ies are'} removed: ${esc(t.name)} goes from <b>${ps.length}</b> to <b>${keep.length}</b> players, each kept once as his most complete entry. Removed: ${gone.slice(0,12).map(p=>esc(p.name)).join(', ')}${gone.length>12?' and '+(gone.length-12)+' more':''}.`:'',
    clear.length?`<b>${clear.length}</b> player${clear.length===1?' keeps his':'s keep their'} place but lose${clear.length===1?'s':''} a game ID too long for the game (${names}). ${clear.length===1?'He is':'They are'} then listed under Players with no game ID, to take a free ID the game has.`:'',
    n&&keep.length<15?'That leaves fewer than 15 players: the team then shows under Too few players, with the fixes that complete it.':'','You can undo this from the change history.'].filter(Boolean).join('<br><br>');
  if(!await ask(n?'Remove duplicates from '+t.name+'?':'Fix game IDs in '+t.name+'?',txt,n?'Remove '+n:'Fix '+clear.length+' ID'+(clear.length===1?'':'s')))return;
  histLabel((n?'Remove duplicates in ':'Fix game IDs in ')+t.name,'Health',()=>dedupeApply(t,P));
  toast(t.name+': '+[n?n+' duplicate'+(n===1?'':'s')+' removed':'',clear.length?clear.length+' ID'+(clear.length===1?'':'s')+' fixed':''].filter(Boolean).join(', '),'ok');rerender()};
ACT.efHealthFill=()=>{if(!efAvailable())return;const ids=[];teamsArr().forEach(t=>(t.players||[]).forEach(p=>{if(playerGaps(p).length||(!+p.gameId&&!(p.ted&&+p.ted.pid)))ids.push(p.id)}));
  if(!ids.length){toast('Every player has his data and a game ID','ok');return}const ch=[];for(let i=0;i<ids.length;i+=120)ch.push(ids.slice(i,i+120));
  queueAdd(ch.map((c,i)=>({type:'freePlayers',ids:c,label:'Free sources: players '+(i*120+1)+'–'+(i*120+c.length)})));toast('Queued '+ids.length+' players','ok')};

/* ================= Newer public baseline notice ================= */
// The site's baseline option file can differ from the one this project was built from (a newer option file, or none built
// yet). Overview says so, with the way to take it: build from it (its data first, the project fills gaps, snapshot first).
async function blInfoLoad(){if(S.ui.blInfo!==undefined&&S.ui.blInfo!==null)return;S.ui.blInfo=false;
  const b=await siteBaseline();S.ui.blInfo=b||false;if(b&&(location.hash.replace('#','')===''||location.hash==='#overview'))rerender()}
function blNoticeHTML(){if(!(window.claude&&window.claude.standalone))return'';const i=S.ui.blInfo;if(i===undefined||i===null){setTimeout(blInfoLoad,0);return''}
  const pk=S.settings.ofPkg;if(!i||!teamsArr().length||(pk&&pk.id===i.id)||S.settings.blDismissed===i.id)return'';
  return `<div class="card hl" style="margin-bottom:16px"><h3>The site's option file</h3><p class="small">This site is built on <b>${esc(i.name)}</b>${i.at?' ('+esc(new Date(i.at*1000).toLocaleDateString())+')':''}. Your project ${pk?'was built from <b>'+esc(pk.name)+'</b>':'isn\'t built from an option file yet'}.</p>
   <div class="row"><button class="primary" data-act="loadBaseline">Build from it</button><button class="ghost sm" data-act="blDismiss">Not now</button></div>
   <p class="small muted" style="margin:8px 0 0">Its data comes first; teams and data it doesn't have stay. A snapshot of your project is saved first (Compare &amp; versions).</p></div>`}
ACT.blDismiss=()=>{S.settings.blDismissed=(S.ui.blInfo&&S.ui.blInfo.id)||'';saveSettings();rerender()};
{const _ov=VIEWS.overview;VIEWS.overview=()=>{const h=_ov();const i=h.indexOf('</p>');const n=blNoticeHTML();return i<0?n+h:h.slice(0,i+4)+n+h.slice(i+4)}}
/* ================= National teams wear their country's flag ================= */
// Flags ship with the site (assets/flags, from flag-icons, MIT), so they never depend on another website. Wherever the studio
// fetches a crest (Logos & kits, Live Updates with "Club crest", new national teams), a national team gets its flag instead.
let FLAG_INDEX=null;
async function flagIndex(){if(!FLAG_INDEX){const r=await fetch('assets/flags/index.json',{cache:'force-cache'});if(!r.ok)throw new Error('flags are not available on this site');FLAG_INDEX=(await r.json()).names||{}}return FLAG_INDEX}
async function flagCode(name){const I=await flagIndex();const n=norm(name);if(I[n])return I[n];
  const k=Object.keys(I).find(x=>nameScore(x,name)===1);return k?I[k]:null}
const isFlagImage=id=>{const i=S.images[id];return !!(i&&/ flag$/i.test(i.name||''))};
async function flagAttach(obj,signal){const code=await flagCode(obj.name);if(!code){aiLog('  No flag found for '+obj.name);return null}
  const r=await fetch('assets/flags/'+code+'.svg',{signal});if(!r.ok){aiLog('  Flag for '+obj.name+' is missing ('+code+')');return null}
  const rec=await addImageFromBlob(new Blob([await r.text()],{type:'image/svg+xml'}),'emblem',obj.name+' flag');obj.emblem=rec.id;aiLog('  Flag for '+obj.name+' ('+code.toUpperCase()+')');return 'flag:'+code}
{const _fa=flAttach;flAttach=async(obj,kind,signal,hints)=>{
  const t=obj&&(S.teams[obj.id]||obj);
  if(kind==='emblem'&&t&&isNationalTeam(t)){try{const r=await flagAttach(obj,signal);if(r)return r}catch(e){if(e.name==='AbortError')throw e;aiLog('  Flag for '+obj.name+' failed: '+e.message)}}
  return _fa(obj,kind,signal,hints)}}
const nationalTeams=()=>teamsArr().filter(t=>isNationalTeam(t)&&!t.sameAs);
const queueFlags=ts=>{if(!ts.length){toast('Every national team already has its flag','ok');return}
  queueAdd([{type:'logos',teamIds:ts.map(t=>t.id),compIds:[],useClaude:false,label:'Flags: '+(ts.length===1?ts[0].name:ts.length+' national teams')}]);toast('Queued '+ts.length+' flag'+(ts.length>1?'s':'')+'. They go to Process and Review.','ok')};
ACT.flagOne=el=>queueFlags([S.teams[el.dataset.id]].filter(Boolean));
{const _hi2=healthIssues;healthIssues=()=>{const iss=_hi2();
  if(efAvailable())iss.forEach(i=>{if(i.cat==='Images'&&i.act&&i.act.a==='openTeamImg'&&/has no emblem$/.test(i.msg)){i.acts=[{a:'efImg',id:i.act.id,label:'Live update'},i.act]}});
  // the option file's own choice (the game's crest, or a crest its file names) isn't a gap
  nationalTeams().forEach(t=>{const own=t.of&&(ofGameCrest(t)||(S.images[t.emblem]&&isOfRef(S.images[t.emblem].ref)));if(!isFlagImage(t.emblem)&&!own)iss.push({sev:'info',cat:'Images',msg:`${t.name} ${t.emblem?'uses a crest':'has no emblem'}; national teams use their country's flag`,acts:[{a:'flagOne',id:t.id,label:'Use flag'}]})});
  return iss}}
