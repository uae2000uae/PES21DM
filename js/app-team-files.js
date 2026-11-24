// PES 2021 Option Studio, part 5 of 14: PES 2021 team files (.ted), history and undo, rating calibration, export with team files.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= PES 2021 .ted team files (read & write) =================
   Format and masking follow the open-source work of srafols (pes2021-utilities, MIT) and
   gabriel-valenga (gv-pes-ted-editor, MIT), both derived from TEditor. 14820-byte files only. */
const TED={SIZE:14820,PSTART:2328,PLEN:312,MAXP:40,TEAM:80,ASSIGN:756,TACT:1040,
 FIELDS:[["playerId","n",0,4,0,""],["callnameId","n",4,4,0,""],["playerName","s",54,61,0,""],["clubShirtName","s",115,61,0,""],["ntShirtName","s",176,61,0,""],["countryId1","n",8,2,0,""],["height","n",10,1,0,""],["weight","n",11,1,0,""],["age","b",32,7,6,""],["isFromLiveUpdate","b",44,28,1,"j"],["strongerFoot","b",44,29,1,"l4"],["strongerHand","b",44,30,1,"l4"],["isPlayerNameChanged","b",28,31,1,"j"],["unsafe_isDifferenceFromDefault","b",44,22,1,"j"],["registeredPosition","b",32,13,4,"eB"],["positionGk","b",40,13,2,"dt"],["positionCb","b",40,15,2,"dt"],["positionLb","b",40,17,2,"dt"],["positionRb","b",40,19,2,"dt"],["positionDmf","b",40,21,2,"dt"],["positionCmf","b",40,23,2,"dt"],["positionLmf","b",40,25,2,"dt"],["positionRmf","b",40,27,2,"dt"],["positionAmf","b",40,29,2,"dt"],["positionRwf","b",44,0,2,"dt"],["positionLwf","b",44,20,2,"dt"],["positionSs","b",44,2,2,"dt"],["positionCf","b",44,4,2,"dt"],["attackingProwess","b",12,16,7,""],["ballControl","b",12,23,7,""],["weakFootUsage","b",12,30,2,"P1"],["tightPossession","b",16,0,7,""],["lowPass","b",16,7,7,""],["loftedPass","b",16,14,7,""],["finishing","b",16,21,7,""],["placeKicking","b",20,0,7,""],["curl","b",20,7,7,""],["speed","b",20,14,7,""],["acceleration","b",20,21,7,""],["jump","b",24,0,7,""],["physicalContact","b",24,7,7,""],["balance","b",24,14,7,""],["stamina","b",24,21,7,""],["ballWinning","b",28,0,7,""],["aggression","b",28,7,7,""],["gkAwareness","b",28,14,7,""],["gkCatching","b",28,21,7,""],["form","b",28,28,3,"P1"],["gkReach","b",32,0,7,""],["defensiveProwess","b",36,0,7,""],["gkClearing","b",36,7,7,""],["headingAbility","b",36,14,7,""],["dribbling","b",40,0,7,""],["injuryResistance","b",40,7,2,"P1"],["attitude","b",40,9,2,"P1"],["gkReflexes","b",44,6,7,""],["kickingPower","b",44,13,7,""],["weakFootAccuracy","b",36,30,2,"P1"],["scissorsFeint","b",48,6,1,"j"],["doubleTouch","b",48,7,1,"j"],["flipFlap","b",48,8,1,"j"],["marseilleTurn","b",48,9,1,"j"],["sombrero","b",48,10,1,"j"],["crossOverTurn","b",48,11,1,"j"],["cutBehindAndTurn","b",48,12,1,"j"],["scotchMove","b",48,13,1,"j"],["stepOnSkillControl","b",48,14,1,"j"],["headingSkill","b",48,15,1,"j"],["longRangeDrive","b",48,16,1,"j"],["chipShotControl","b",48,17,1,"j"],["longRangeShooting","b",48,18,1,"j"],["knuckleShot","b",48,19,1,"j"],["dippingShot","b",48,20,1,"j"],["risingShot","b",48,21,1,"j"],["acrobaticFinishing","b",48,22,1,"j"],["heelTrick","b",48,23,1,"j"],["firstTimeShot","b",48,24,1,"j"],["oneTouchPass","b",48,25,1,"j"],["throughPassing","b",48,26,1,"j"],["weightedPass","b",48,27,1,"j"],["pinpointCrossing","b",48,28,1,"j"],["outsideCurler","b",48,29,1,"j"],["rabona","b",48,30,1,"j"],["noLookPass","b",48,31,1,"j"],["lowLoftedPass","b",52,0,1,"j"],["gkLowPunt","b",52,1,1,"j"],["gkHighPunt","b",52,2,1,"j"],["longThrow","b",52,3,1,"j"],["gkLongThrow","b",52,4,1,"j"],["penaltySpecialist","b",52,5,1,"j"],["gkPenaltySaver","b",52,6,1,"j"],["gamesmanship","b",52,7,1,"j"],["manMarking","b",52,8,1,"j"],["trackBack","b",52,9,1,"j"],["interception","b",52,10,1,"j"],["acrobaticClear","b",52,11,1,"j"],["captaincy","b",52,12,1,"j"],["superSub","b",52,13,1,"j"],["fightingSpirit","b",52,14,1,"j"],["playingStyle","b",32,18,5,"nB"],["trickster","b",44,31,1,"j"],["mazingRun","b",48,0,1,"j"],["speedingBullet","b",48,1,1,"j"],["incisiveRun","b",48,2,1,"j"],["longBallExpert","b",48,3,1,"j"],["earlyCross","b",48,4,1,"j"],["longRanger","b",48,5,1,"j"],["reputation","b",32,28,3,"P1"],["dribHunch","b",36,21,3,"P1"],["dribArmMove","b",16,28,4,"P1"],["runHunch","b",36,24,3,"P1"],["runArmMove","b",20,28,4,"P1"],["dribMotion","b",40,11,2,"P1"],["ckMotion","b",24,28,4,"P1"],["fkMotion","b",32,23,5,"P1"],["pkMotion","b",36,27,3,"P1"],["playerAppearance","r",240,72,0,""]],
 STYLE:[null,'Goal Poacher','Dummy Runner','Fox in the Box','Target Man','Creative Playmaker','Prolific Winger','Roaming Flank','Cross Specialist','Classic No. 10','Hole Player','Box-to-Box','The Destroyer','Orchestrator','Anchor Man','Offensive Full-back','Full-back Finisher','Defensive Full-back','Build Up','Extra Frontman','Offensive Goalkeeper','Defensive Goalkeeper'],
 POS:['GK','CB','LB','RB','DMF','CMF','LMF','RMF','AMF','LWF','RWF','SS','CF'],
 ATTR:{attackingProwess:'offAw',ballControl:'ballCtl',dribbling:'drib',tightPossession:'tight',lowPass:'lowPass',loftedPass:'loftPass',finishing:'finish',headingAbility:'heading',
  placeKicking:'placeKick',curl:'curl',speed:'speed',acceleration:'accel',kickingPower:'kickPow',jump:'jump',physicalContact:'contact',balance:'balance',stamina:'stamina',
  defensiveProwess:'defAw',ballWinning:'ballWin',aggression:'aggr',gkAwareness:'gkAw',gkCatching:'gkCatch',gkClearing:'gkClear',gkReflexes:'gkReflex',gkReach:'gkReach'},
 SKILL:{scissorsFeint:'Scissors Feint',doubleTouch:'Double Touch',flipFlap:'Flip Flap',marseilleTurn:'Marseille Turn',sombrero:'Sombrero',crossOverTurn:'Cross Over Turn',
  cutBehindAndTurn:'Cut Behind & Turn',scotchMove:'Scotch Move',stepOnSkillControl:'Step On Skill Control',headingSkill:'Heading',longRangeDrive:'Long Range Drive',
  chipShotControl:'Chip Shot Control',longRangeShooting:'Long Range Shooting',knuckleShot:'Knuckle Shot',dippingShot:'Dipping Shot',risingShot:'Rising Shot',
  acrobaticFinishing:'Acrobatic Finishing',heelTrick:'Heel Trick',firstTimeShot:'First-time Shot',oneTouchPass:'One-touch Pass',throughPassing:'Through Passing',
  weightedPass:'Weighted Pass',pinpointCrossing:'Pinpoint Crossing',outsideCurler:'Outside Curler',rabona:'Rabona',noLookPass:'No Look Pass',lowLoftedPass:'Low Lofted Pass',
  gkLowPunt:'GK Low Punt',gkHighPunt:'GK High Punt',longThrow:'Long Throw',gkLongThrow:'GK Long Throw',penaltySpecialist:'Penalty Specialist',gkPenaltySaver:'GK Penalty Saver',
  gamesmanship:'Gamesmanship',manMarking:'Man Marking',trackBack:'Track Back',interception:'Interception',acrobaticClear:'Acrobatic Clear',captaincy:'Captaincy',
  superSub:'Super-sub',fightingSpirit:'Fighting Spirit'},
 COM:{trickster:'Trickster',mazingRun:'Mazing Run',speedingBullet:'Speeding Bullet',incisiveRun:'Incisive Run',longBallExpert:'Long Ball Expert',earlyCross:'Early Cross',longRanger:'Long Ranger'},
 PPOS:{positionGk:'GK',positionCb:'CB',positionLb:'LB',positionRb:'RB',positionDmf:'DMF',positionCmf:'CMF',positionLmf:'LMF',positionRmf:'RMF',positionAmf:'AMF',positionRwf:'RWF',positionLwf:'LWF',positionSs:'SS',positionCf:'CF'}};
TED.F={};TED.FIELDS.forEach(f=>TED.F[f[0]]=f);
TED.readBits=(d,o,b,n)=>{let v=0;const fb=o+(b>>3),f0=b&7;for(let i=0;i<n;i++){const bi=fb+((f0+i)>>3),bt=(f0+i)&7;v|=((d[bi]>>bt)&1)<<i}return v>>>0};
TED.writeBits=(d,o,b,n,v)=>{v=Math.max(0,Math.min((1<<n)-1,Math.round(v)||0));const fb=o+(b>>3),f0=b&7;for(let i=0;i<n;i++){const bi=fb+((f0+i)>>3),bt=(f0+i)&7;if((v>>i)&1)d[bi]|=(1<<bt);else d[bi]&=~(1<<bt)}};
TED.readStr=(d,o,n)=>{let e=o;while(e<o+n&&d[e])e++;return new TextDecoder('utf-8',{fatal:false}).decode(d.subarray(o,e)).trim()};
TED.writeStr=(d,o,n,s)=>{let b=new TextEncoder().encode(String(s||''));while(b.length>n-1){s=String(s).slice(0,-1);b=new TextEncoder().encode(s)}d.fill(0,o,o+n);d.set(b,o)};
TED.readNum=(d,o,n)=>{let v=0;for(let i=n-1;i>=0;i--)v=v*256+d[o+i];return v};
TED.writeNum=(d,o,n,v)=>{v=Math.max(0,Math.round(v)||0);for(let i=0;i<n;i++){d[o+i]=v&255;v=Math.floor(v/256)}};
TED.isTed=u8=>u8&&u8.length===TED.SIZE;
TED.decrypt=raw=>{if(!TED.isTed(raw))throw new Error('not a PES 2021 team file (expected 14820 bytes, got '+(raw?raw.length:0)+')');
  const key=new Uint8Array(32);key.set(raw.subarray(69,80),0);key.set(raw.subarray(48,69),11);
  const dec=new Uint8Array(raw.length);dec.set(raw.subarray(0,48),0);for(let i=80;i<raw.length;i++)dec[i]=raw[i]^key[(i-80)%32];return dec};
TED.encrypt=async(dec,raw)=>{const dg=new Uint8Array(await crypto.subtle.digest('SHA-256',dec.slice(80)));
  const key=new Uint8Array(32);key.set(dg.subarray(21,32),0);key.set(dg.subarray(0,21),11);
  const out=new Uint8Array(raw);out.set(dg,48);for(let i=80;i<dec.length;i++)out[i]=dec[i]^key[(i-80)%32];return out};
TED.get=(rec,f)=>{const [k,t,o,a,n]=f;if(t==='b')return TED.readBits(rec,o,a,n);if(t==='s')return TED.readStr(rec,o,a);if(t==='n')return TED.readNum(rec,o,a);return null};
TED.set=(rec,f,v)=>{const [k,t,o,a,n]=f;if(t==='b')TED.writeBits(rec,o,a,n,v);else if(t==='s')TED.writeStr(rec,o,a,v);else if(t==='n')TED.writeNum(rec,o,a,v)};
TED.b64=u8=>{let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s)};
TED.unb64=s=>{const b=atob(s);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
// Position proficiency: one community spec stores 0=none,1=C,2=B,3=A, TEditor shows 0=C,1=B,2=A.
// Each file is checked: the registered position's own slot holds the highest value, so it tells us which one applies.
TED.posScheme=players=>{let three=0,two=0;players.forEach(p=>{const v=p._posRaw[p.pos];if(v===3)three++;else if(v===2)two++});return three>=two?'srafols':'teditor'};
TED.lvl=(v,sch)=>sch==='srafols'?['','C','B','A'][v]||'':['C','B','A','A'][v]||'';
TED.raw=(l,sch)=>sch==='srafols'?({'':0,C:1,B:2,A:3}[l]||0):({'':0,C:0,B:1,A:2}[l]||0);
TED.parse=raw=>{
  const d=TED.decrypt(raw);const T=TED.TEAM;
  const team={teamId:TED.readNum(d,T,4),coachId:TED.readNum(d,T+4,4),name:TED.readStr(d,T+104,70),short:TED.readStr(d,T+174,4),stadium:TED.readStr(d,T+178,120),
    emblemFile:TED.readStr(d,T+423,32),stadiumFile:TED.readStr(d,T+456,32)};
  const A=TED.ASSIGN;const ids=[],nums={};for(let i=0;i<40;i++){const id=TED.readNum(d,A+4+i*4,4);ids.push(id);if(id)nums[id]=TED.readNum(d,A+164+i*2,2)}
  team.formation=[...d.subarray(TED.TACT+4,TED.TACT+15)].map(v=>TED.POS[v]||'');
  const players=[];
  for(let i=0;i<TED.MAXP;i++){const o=TED.PSTART+i*TED.PLEN;const rec=d.subarray(o,o+TED.PLEN);const pid=TED.readNum(rec,0,4);if(!pid)continue;
    const g=k=>TED.get(rec,TED.F[k]);const p={slot:i,pid,name:g('playerName'),shirtName:g('clubShirtName'),height:g('height'),weight:g('weight'),age:g('age'),
      foot:g('strongerFoot')?'L':'R',pos:TED.POS[g('registeredPosition')]||'CMF',country:g('countryId1'),attrs:{},skills:[],comStyles:[],
      wfUsage:g('weakFootUsage')+1,wfAcc:g('weakFootAccuracy')+1,form:g('form')+1,injury:g('injuryResistance')+1,style:TED.STYLE[g('playingStyle')]||'None',number:nums[pid]||'',_posRaw:{},rec:TED.b64(rec)};
    Object.entries(TED.ATTR).forEach(([k,a])=>p.attrs[a]=g(k));
    Object.entries(TED.SKILL).forEach(([k,s])=>{if(g(k))p.skills.push(s)});Object.entries(TED.COM).forEach(([k,s])=>{if(g(k))p.comStyles.push(s)});
    Object.entries(TED.PPOS).forEach(([k,pos])=>p._posRaw[pos]=g(k));players.push(p)}
  const sch=TED.posScheme(players);
  players.forEach(p=>{p.playables={};Object.entries(p._posRaw).forEach(([pos,v])=>{const l=TED.lvl(v,sch);if(pos!==p.pos&&l&&(sch==='srafols'||v>0))p.playables[pos]=l});delete p._posRaw});
  // the squad order table (40 bytes at ASSIGN+768, see TED.build): the places the game's squad list shows, in its order
  const order=[...d.subarray(A+768,A+808)].filter(v=>v<40);
  return{team,players,scheme:sch,assignIds:ids,order};
};
// Write a studio team into its template file. Players keep their game IDs; a player moved from another imported team brings his record along.
TED.build=async(team,tpl,opts={})=>{
  const raw=TED.unb64(tpl.b64);const d=TED.decrypt(raw);const T=TED.TEAM,A=TED.ASSIGN;const warn=[];const sch=tpl.scheme||'srafols';
  if(opts.teamInfo!==false){TED.writeStr(d,T+104,70,team.name);if(team.short)TED.writeStr(d,T+174,4,String(team.short).toUpperCase().slice(0,3));if(team.stadium)TED.writeStr(d,T+178,120,team.stadium)}
  if(opts.emblemFile)TED.writeStr(d,T+423,32,opts.emblemFile);
  const keep=[],incoming=[];(team.players||[]).forEach(p=>{if(!p.ted||!p.ted.pid||!p.ted.rec){warn.push(p.name+': not in any imported team file, add him in-game');return}(p.ted.team===tpl.teamId?keep:incoming).push(p)});
  const slots=new Array(40).fill(null);const used=new Set();
  keep.forEach(p=>{const s=p.ted.slot;if(s>=0&&s<40&&!slots[s]){slots[s]=p;used.add(s)}else incoming.push(p)});
  incoming.forEach(p=>{const s=slots.findIndex(x=>!x);if(s<0){warn.push(p.name+': team is full (40)');return}slots[s]=p});
  // no gaps: the squad fills places 1, 2, 3 … in order (records, squad list and numbers together). The first 18 places are the
  // matchday squad (11 starters, 7 substitutes); a gap there makes the game refuse the file ("This data includes players who
  // cannot be imported"): 2026-11-19 PS5 test, the 3 of 8 clubs whose dropped players left gaps failed, the 5 without gaps imported
  {const on=slots.filter(Boolean);slots.fill(null);on.forEach((p,i)=>{slots[i]=p})}
  for(let i=0;i<40;i++){const o=TED.PSTART+i*TED.PLEN;const p=slots[i];
    if(!p){d.fill(0,o,o+TED.PLEN);TED.writeNum(d,A+4+i*4,4,0);TED.writeNum(d,A+164+i*2,2,0);continue}
    const rec=TED.unb64(p.ted.rec);const s=(k,v)=>TED.set(rec,TED.F[k],v);
    if(opts.players!==false){const nameChanged=TED.get(rec,TED.F.playerName)!==p.name;
      s('playerName',p.name);s('clubShirtName',p.shirtName||String(p.name).split(' ').pop().toUpperCase());if(nameChanged)s('isPlayerNameChanged',1);
      if(p.height)s('height',p.height);if(p.weight)s('weight',p.weight);if(p.age)s('age',p.age);s('strongerFoot',p.foot==='L'?1:0);
      s('registeredPosition',Math.max(0,TED.POS.indexOf(p.pos)));
      Object.entries(TED.ATTR).forEach(([k,a])=>s(k,p.attrs[a]));
      s('weakFootUsage',p.wfUsage-1);s('weakFootAccuracy',p.wfAcc-1);s('form',p.form-1);s('injuryResistance',p.injury-1);
      s('playingStyle',Math.max(0,TED.STYLE.indexOf(p.style==='None'?null:p.style)));
      Object.entries(TED.SKILL).forEach(([k,n])=>s(k,p.skills.includes(n)?1:0));Object.entries(TED.COM).forEach(([k,n])=>s(k,p.comStyles.includes(n)?1:0));
      Object.entries(TED.PPOS).forEach(([k,pos])=>s(k,TED.raw(pos===p.pos?'A':(p.playables[pos]||''),sch)))}
    d.set(rec,o);TED.writeNum(d,A+4+i*4,4,p.ted.pid);if(p.number)TED.writeNum(d,A+164+i*2,2,p.number)}
  return{bytes:await TED.encrypt(d,raw),warn};
};

/* ================= v2: history & undo ================= */
// Every saved change to a team is compared with the last saved copy, so edits from any page are recorded and can be undone.
S.teds=S.teds||{};S.jobs=S.jobs||{};S.history=S.history||{};S._saved={};
const HIST={ctx:null,buf:[],timer:null};
function histLabel(label,src,fn){const prev=HIST.ctx;HIST.ctx={label,src};try{return fn()}finally{HIST.ctx=prev}}
async function histLabelAsync(label,src,fn){const prev=HIST.ctx;HIST.ctx={label,src};try{return await fn()}finally{HIST.ctx=prev}}
function histDiffTeam(a,b){const out=[];if(!a){out.push({k:'tadd',tid:b.id,name:b.name});return out}
  diffObj(a,b,TEAM_PATHS).forEach(f=>out.push({k:'tf',tid:b.id,name:b.name,f:f.k,from:f.from,to:f.to}));
  const ma=new Map((a.players||[]).map(p=>[p.id,p])),mb=new Map((b.players||[]).map(p=>[p.id,p]));
  mb.forEach((p,id)=>{const q=ma.get(id);if(!q){out.push({k:'padd',tid:b.id,pid:id,name:p.name,team:b.name});return}
    const fs=diffObj(q,p,PLAYER_PATHS);fs.forEach(f=>out.push({k:'pf',tid:b.id,pid:id,name:p.name,f:f.k,from:f.from,to:f.to}));
    if(fs.some(f=>f.k.startsWith('attrs.')||f.k==='pos'||f.k==='ovrOverride')){const o1=ovr(q),o2=ovr(p);if(o1!==o2)out.push({k:'ovr',tid:b.id,pid:id,name:p.name,from:o1,to:o2})}});
  ma.forEach((q,id)=>{if(!mb.has(id))out.push({k:'prem',tid:b.id,pid:id,name:q.name,team:b.name,obj:clone(q)})});
  return out}
function histRecord(t){const before=S._saved[t.id];const es=histDiffTeam(before,t);S._saved[t.id]=clone(t);if(!es.length)return;
  const ctx=HIST.ctx||{label:'Edit',src:'Edit'};HIST.buf.push(...es.map(e=>Object.assign(e,{_l:ctx.label,_s:ctx.src})));
  clearTimeout(HIST.timer);HIST.timer=setTimeout(histFlush,900)}
function histFlush(){if(!HIST.buf.length)return;const groups={};HIST.buf.forEach(e=>{const k=e._l;(groups[k]=groups[k]||[]).push(e)});HIST.buf=[];
  Object.entries(groups).forEach(([label,es])=>{for(let i=0;i<es.length;i+=400){const part=es.slice(i,i+400).map(e=>{const x=Object.assign({},e);delete x._l;delete x._s;return x});
    const a={id:uid(),label:label+(i?' (cont.)':''),src:es[0]._s,at:Date.now(),entries:part};if(JSON.stringify(a).length>240000)a.entries=a.entries.filter(e=>e.k!=='prem').concat(a.entries.filter(e=>e.k==='prem').map(e=>Object.assign({},e,{obj:null})));
    S.history[a.id]=a;Store.put('history',a)}});
  const all=Object.values(S.history).sort((a,b)=>b.at-a.at);all.slice(300).forEach(a=>{delete S.history[a.id];Store.del('history',a.id)})}
window.__onSaveTeam=t=>{try{histRecord(t)}catch(e){console.warn('history',e)}};
function histDeleteTeam(t,links){S._saved[t.id]=null;const ctx=HIST.ctx||{label:'Delete team',src:'Edit'};HIST.buf.push(Object.assign({k:'tdel',tid:t.id,name:t.name,obj:clone(t),_l:ctx.label,_s:ctx.src},links||{}));clearTimeout(HIST.timer);HIST.timer=setTimeout(histFlush,900)}
function undoEntries(entries,label){
  return histLabel('Undo: '+label,'Undo',()=>{const touched=new Set();let n=0,miss=0;
    entries.slice().reverse().forEach(e=>{const t=S.teams[e.tid];
      if(e.k==='tf'&&t){if(canon(getP(t,e.f))===canon(e.to)){setP(t,e.f,clone(e.from));touched.add(t.id);n++}else miss++}
      else if(e.k==='pf'&&t){const p=t.players.find(x=>x.id===e.pid);if(p&&canon(getP(p,e.f))===canon(e.to)){setP(p,e.f,clone(e.from));normPlayer(p);touched.add(t.id);n++}else miss++}
      else if(e.k==='padd'&&t){const before=t.players.length;t.players=t.players.filter(x=>x.id!==e.pid);if(t.players.length<before){touched.add(t.id);n++}else miss++}
      else if(e.k==='prem'&&t&&e.obj){if(!findPlayer(e.pid)){t.players.push(clone(e.obj));touched.add(t.id);n++}else miss++}
      else if(e.k==='tdel'&&e.obj&&!S.teams[e.tid]){// the team comes back with its team file and its cups
        if(e.ted&&!S.teds[e.tid]){S.teds[e.tid]=clone(e.ted);Store.put('teds',S.teds[e.tid])}saveTeam(clone(e.obj));
        (e.cups||[]).forEach(cid=>{const c=S.comps[cid];if(c&&!(c.teams||[]).includes(e.tid)){c.teams=[...(c.teams||[]),e.tid];saveComp(c)}});n++}
      else if(e.k==='tadd'&&t&&!(t.players||[]).length){delete S.teams[t.id];Store.del('teams',t.id);n++}});
    touched.forEach(id=>saveTeam(S.teams[id]));return{n,miss}})}
ACT.undoAction=async el=>{const a=S.history[el.dataset.id];if(!a)return;if(!await ask('Undo change',`Undo <b>${esc(a.label)}</b> (${a.entries.length} changes)? Values edited since then are left alone.`,'Undo'))return;
  const r=undoEntries(a.entries,a.label);toast('Undid '+r.n+' change'+(r.n===1?'':'s')+(r.miss?' · '+r.miss+' skipped (changed again since)':''),'ok');rerender()};
ACT.undoEntry=el=>{const a=S.history[el.dataset.id];const e=a&&a.entries[+el.dataset.i];if(!e)return;const r=undoEntries([e],a.label);toast(r.n?'Undone':'That value has changed since, so it was left alone',r.n?'ok':'');closeModal();rerender()};
function historyHTML(limit=25){const all=Object.values(S.history).sort((a,b)=>b.at-a.at).slice(0,limit);
  if(!all.length)return'<p class="muted small">Changes appear here as you edit, import or apply batches.</p>';
  return `<div class="tw" style="max-height:360px"><table><thead><tr><th>When</th><th>Change</th><th>Source</th><th class="num">Items</th><th></th></tr></thead><tbody>${all.map(a=>{const kinds={};a.entries.forEach(e=>kinds[e.k]=(kinds[e.k]||0)+1);
    const summ=[kinds.padd&&kinds.padd+' added',kinds.prem&&kinds.prem+' removed',kinds.pf&&kinds.pf+' player fields',kinds.tf&&kinds.tf+' team fields',kinds.tadd&&kinds.tadd+' new teams',kinds.tdel&&kinds.tdel+' deleted teams'].filter(Boolean).join(' · ');
    return `<tr><td class="small">${fmtDate(a.at)}</td><td><b>${esc(a.label)}</b><div class="small muted">${esc(summ)}</div></td><td class="small">${esc(a.src||'')}</td><td class="num">${a.entries.length}</td><td><button class="sm" data-act="undoAction" data-id="${a.id}">Undo</button></td></tr>`}).join('')}</tbody></table></div>`}
function playerHistory(pid){const out=[];Object.values(S.history).forEach(a=>a.entries.forEach((e,i)=>{if(e.pid===pid)out.push({a,e,i})}));return out.sort((x,y)=>x.a.at-y.a.at)}
function sparkline(vals){if(vals.length<2)return'';const w=180,h=36,mn=Math.min(...vals)-1,mx=Math.max(...vals)+1;const pts=vals.map((v,i)=>[(i/(vals.length-1))*w,h-((v-mn)/(mx-mn))*h]);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-label="Overall over time"><polyline fill="none" stroke="var(--accent)" stroke-width="2" points="${pts.map(p=>p.map(x=>x.toFixed(1)).join(',')).join(' ')}"/><circle cx="${pts[pts.length-1][0]}" cy="${pts[pts.length-1][1]}" r="3" fill="var(--gold)"/></svg>`}
const _openPlayerModalOrig=openPlayerModal;
openPlayerModal=function(){_openPlayerModalOrig();const p=S.ui.edit&&S.ui.edit.p;if(!p||S.ui.edit.isNew)return;const h=playerHistory(p.id);
  const ov=h.filter(x=>x.e.k==='ovr');const vals=ov.length?[ov[0].e.from,...ov.map(x=>x.e.to)]:[];const box=$('#pe');if(!box)return;
  const div=document.createElement('div');div.innerHTML=`<h3 style="margin-top:16px">History</h3>${p.ted?`<p class="small muted">Linked to game player ID ${esc(p.ted.pid)}${p.src==='ted'?' · ratings from a PES team file':''}</p>`:''}
   ${h.length?`<div class="row" style="align-items:center">${sparkline(vals)}<span class="small muted">${vals.length>1?'Overall '+vals[0]+' → '+vals[vals.length-1]:''}</span></div>
   <div class="tw" style="max-height:200px"><table><tbody>${h.slice(-40).reverse().filter(x=>x.e.k!=='ovr').map(x=>`<tr><td class="small">${fmtDate(x.a.at)}</td><td class="small">${esc(x.a.label)}</td><td class="small">${x.e.k==='pf'?esc(LABEL[x.e.f]||x.e.f)+': '+esc(sheetVal(x.e.f,x.e.from))+' → <b>'+esc(sheetVal(x.e.f,x.e.to))+'</b>':x.e.k==='padd'?'Joined '+esc(x.e.team):x.e.k==='prem'?'Left '+esc(x.e.team):''}</td><td>${x.e.k==='pf'?`<button class="sm ghost" data-act="undoEntry" data-id="${x.a.id}" data-i="${x.i}">Undo</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<p class="small muted">No recorded changes yet.</p>'}`;
  box.appendChild(div)};

/* ================= v2: PES team files (.ted) in the project ================= */
// A template per team keeps the original game file so edits can be written back into it.
async function tedSaveTemplate(teamId,parsed,b64,file){const ref=await Store.putBlob(new Blob([b64],{type:'text/plain'}),'text/plain');
  const old=S.teds[teamId];const t={id:teamId,tedTeamId:parsed.team.teamId,file,ref,scheme:parsed.scheme,origName:parsed.team.name,emblemFile:parsed.team.emblemFile,at:Date.now(),
    pids:parsed.players.map(p=>p.pid)};S.teds[teamId]=t;Store.put('teds',t);if(old&&old.ref&&old.ref!==ref)Store.delBlob(old.ref);return t}
const TED_CACHE=new Map();
async function tedTemplateBytes(t){if(TED_CACHE.has(t.ref))return TED_CACHE.get(t.ref);const b=await Store.getBlob(t.ref);if(!b)throw new Error('template missing');const s=(await b.text()).trim();TED_CACHE.set(t.ref,s);return s}
function tedTemplateFor(tedTeamId){return Object.values(S.teds).find(t=>t.tedTeamId===tedTeamId)}
async function tedRecordFor(pid,tedTeamId){const t=tedTemplateFor(tedTeamId);if(!t)return null;const raw=TED.unb64(await tedTemplateBytes(t));const d=TED.decrypt(raw);
  for(let i=0;i<TED.MAXP;i++){const o=TED.PSTART+i*TED.PLEN;if(TED.readNum(d,o,4)===pid)return{rec:TED.b64(d.subarray(o,o+TED.PLEN)),slot:i}}return null}
function tedPlayerToStudio(tp,teamTedId){const p=newPlayer({name:tp.name,pos:tp.pos});Object.assign(p,{shirtName:tp.shirtName,height:tp.height||'',weight:tp.weight||'',age:tp.age||'',foot:tp.foot,
  number:tp.number||'',wfUsage:tp.wfUsage,wfAcc:tp.wfAcc,form:tp.form,injury:tp.injury,style:tp.style,skills:tp.skills.slice(),comStyles:tp.comStyles.slice(),playables:Object.assign({},tp.playables),
  attrs:Object.assign({},tp.attrs),src:'ted',ted:{pid:tp.pid,team:teamTedId,slot:tp.slot}});return normPlayer(p)}
// called from the import page while building a review batch
async function impTedStep(ctx){const {st,o,replace,inc,getInc,stats}=ctx;const teds=(st.teds||[]).filter(x=>x.on);if(!teds.length)return;
  const pidIndex=new Map();Object.values(S.teams).forEach(t=>{if(isNationalTeam(t))return;(t.players||[]).forEach(p=>{if(p.ted&&p.ted.pid)pidIndex.set(p.ted.pid,{p,t})})});
  for(const x of teds){const P=x.parsed;let tm=x.target&&x.target!=='new'?S.teams[x.target]:null;let incT;const natImp=tm?isNationalTeam(tm):(isCountryTeamName(P.team.name)||isNationalComp(S.comps[x.compId]));
    // a new team's code is chosen when it is installed (league, then one of its free codes: teamPlaceAsk); the file's own ID is only the first suggestion
    if(!tm){incT=newTeam({name:P.team.name,short:(P.team.short||shortName(P.team.name)).toUpperCase().slice(0,3),stadium:P.team.stadium,compId:x.compId||'',gameSlot:P.team.name,gameId:'',fileTeamId:P.team.teamId,players:[]});inc[incT.id]=incT;stats.newTeams=(stats.newTeams||0)+1}
    else{incT=inc[tm.id]||getInc(tm);const f=(k,v)=>{if(v==null||v==='')return;const cur=getP(incT,k);if(replace||cur==null||cur==='')setP(incT,k,v)};
      f('stadium',P.team.stadium);f('short',(P.team.short||'').toUpperCase().slice(0,3));const genFile=!!(S.teds[tm.id]&&S.teds[tm.id].generated);if(!incT.gameSlot||genFile)incT.gameSlot=P.team.name;if(!+incT.gameId||genFile)incT.gameId=P.team.teamId;if(replace)incT.name=P.team.name||incT.name}
    if(P.team.coach&&(replace||!(incT.manager&&incT.manager.name)))setP(incT,'manager.name',P.team.coach);
    {const id=incT.id,nm=incT.name;await impDo(()=>tedSaveTemplate(id,P,x.b64,x.name),x.name+' becomes the game file of '+nm+(tm?' (team ID '+P.team.teamId+')':' (a new club: its league and code are chosen after you install; the file says '+P.team.teamId+')'),{team:id})}stats.tedTeams=(stats.tedTeams||0)+1;
    const src=tm||null;
    for(const tp of P.players){let p=incT.players.find(q=>q.ted&&q.ted.pid===tp.pid)||incT.players.find(q=>samePlayer(q.name,tp.name));let isNew=false;
      if(!p){const ex=src&&((src.players||[]).find(q=>q.ted&&q.ted.pid===tp.pid)||(src.players||[]).find(q=>samePlayer(q.name,tp.name)));
        const elsewhere=!ex&&!natImp&&pidIndex.get(tp.pid);
        if(ex)p=clone(ex);else if(elsewhere){if(!o.tedFull){stats.tedElsewhere=(stats.tedElsewhere||0)+1;continue}p=clone(elsewhere.p)}
        else{if(!o.addPlayers&&src)continue;p=tedPlayerToStudio(tp,P.team.teamId);isNew=true}
        incT.players.push(p)}
      if(!isNew){const force=replace;const fv=(k,v)=>{if(v==null||v===''||v===0)return;if(force||p[k]===''||p[k]==null)p[k]=v};
        fv('shirtName',tp.shirtName);fv('number',tp.number);fv('age',tp.age);fv('height',tp.height);fv('weight',tp.weight);
        if(force||unrated(p)){Object.assign(p.attrs,tp.attrs);Object.assign(p,{pos:tp.pos,foot:tp.foot,wfUsage:tp.wfUsage,wfAcc:tp.wfAcc,form:tp.form,injury:tp.injury,style:tp.style,skills:tp.skills.slice(),comStyles:tp.comStyles.slice(),playables:Object.assign({},tp.playables),src:'ted'})}
        p.ted={pid:tp.pid,team:P.team.teamId,slot:tp.slot};if(!+p.gameId||isEditId(p.gameId))p.gameId=tp.pid;normPlayer(p);stats.players++}
      else stats.newPlayers++}
    if(o.tedFull&&src){const keep=new Set(P.players.map(q=>q.pid));(src.players||[]).forEach(q=>{if(q.ted&&q.ted.team===P.team.teamId&&!keep.has(q.ted.pid))stats.tedLeft=(stats.tedLeft||0)+1})}
    // the emblem named inside the file, when that PNG came with the pack
    const em=P.team.emblemFile&&impNamed(P.team.emblemFile,x.path);
    if(em&&(replace||!incT.emblem)){try{const rec=await addImageFromBlob(em.blob,'emblem',em.name);incT.emblem=rec.id;em.on=false;stats.images++}catch(e){}}
    const mp=P.team.managerFile&&impNamed(P.team.managerFile,x.path);
    if(mp&&mp.on!==false&&(replace||!incT.managerPhoto)){try{const rec=await addImageFromBlob(mp.blob,'manager',mp.name);incT.managerPhoto=rec.id;mp.on=false;stats.images++}catch(e){}}
    // a new team's kits named in its file come with it (an existing team's are matched to its kit slots on the list)
    if(!tm)for(let k=0;k<(P.team.kitFiles||[]).length;k++){const kf=P.team.kitFiles[k];const im=kf&&impNamed(kf,x.path);const slot=OF_KIT_SLOT[k];if(!im||!slot)continue;
      try{const rec=await addImageFromBlob(im.blob,'kit',im.name);let kt=(incT.kits||[]).find(z=>z.slot===slot);if(!kt){kt=newKit(slot);(incT.kits=incT.kits||[]).push(kt)}kt.img=rec.id;im.on=false;stats.images++}catch(e){}}
    await null}
}
// images named inside the imported game files go to that team or competition
function tedLinkImages(){const st=impState();
  const link=(file,kind,owner,slot,label,from)=>{const im=impNamed(file,from);if(!im)return;im.kind=kind;im.byFile=true;
    if(owner){im.target=kind+':'+owner.id;im.on=!hasRealImg(owner[slot])}else{im.target='';im.note='used by '+label}};
  (st.teds||[]).forEach(x=>{const t=x.target&&x.target!=='new'?S.teams[x.target]:null;link(x.parsed.team.emblemFile,'emblem',t,'emblem',x.parsed.team.name,x.path);link(x.parsed.team.managerFile,'manager',t,'managerPhoto',x.parsed.team.name+' (manager)',x.path)});
  (st.ceds||[]).forEach(x=>{const c=x.target&&x.target!=='new'?S.comps[x.target]:null;link(x.parsed.emblemFile,'comp',c,'emblem',x.parsed.name,x.path)})}

/* ================= v2: rating calibration ================= */
// Least-squares line per ability, fitted on players found both in an EA FC sheet and in real PES 2021 team files.
function fitLine(xs,ys){const n=xs.length;if(n<8)return null;const mx=xs.reduce((a,b)=>a+b,0)/n,my=ys.reduce((a,b)=>a+b,0)/n;let sxy=0,sxx=0;
  for(let i=0;i<n;i++){sxy+=(xs[i]-mx)*(ys[i]-my);sxx+=(xs[i]-mx)**2}if(!sxx)return null;const a=sxy/sxx;const b=my-a*mx;
  let se=0;for(let i=0;i<n;i++)se+=(ys[i]-(a*xs[i]+b))**2;return{a:+a.toFixed(4),b:+b.toFixed(3),n,rmse:+Math.sqrt(se/n).toFixed(2)}}
function calibrateFrom(tbl){
  const truth=[];Object.values(S.teams).forEach(t=>(t.players||[]).forEach(p=>{if(p.src==='ted')truth.push({p,t})}));
  if(!truth.length)return{error:'Import some PES team files (.ted) first: their ratings are the reference.'};
  const byName=new Map();truth.forEach(x=>{const k=norm(x.p.name);byName.set(k,byName.has(k)?null:x)});
  const pairs=[];const ea=tbl.fmt==='EA FC';
  tbl.rows.forEach(r=>{const g=k=>tbl.map[k]>=0?String(r[tbl.map[k]]??'').trim():'';const nm=g('name');if(!nm)return;let hit=byName.get(norm(nm));
    if(!hit){hit=truth.find(x=>samePlayer(x.p.name,nm))||null}if(!hit)return;pairs.push({r,p:hit.p})});
  if(pairs.length<8)return{error:'Only '+pairs.length+' players matched your PES data; at least 8 are needed.'};
  const out={attrs:{},n:pairs.length,at:Date.now(),source:tbl.name};
  Object.entries(tbl.map.attrs||{}).forEach(([k,a])=>{const xs=[],ys=[];pairs.forEach(({r,p})=>{const vals=a.cols.map(i=>cellNum(r[i])).filter(v=>v!=null);if(!vals.length)return;
    xs.push(vals.reduce((x,y)=>x+y,0)/vals.length);ys.push(p.attrs[k])});const f=fitLine(xs,ys);if(f&&f.a>0.2&&f.a<2)out.attrs[k]=f});
  if(tbl.map.ovr>=0){const xs=[],ys=[];pairs.forEach(({r,p})=>{const v=cellNum(r[tbl.map.ovr]);if(v){xs.push(v);ys.push(ovr(p))}});const f=fitLine(xs,ys);if(f)out.ovr=f}
  if(tbl.map.value>=0){const xs=[],ys=[];pairs.forEach(({r,p})=>{const v=cellNum(r[tbl.map.value]);if(v>1000){xs.push(Math.log10(v));ys.push(ovr(p))}});const f=fitLine(xs,ys);if(f)out.value=f}
  out.fmt=tbl.fmt;return out}
const _ovrFromEAOrig=ovrFromEA,_valueToOvrOrig=valueToOvr;
function calibAttr(k,v){const c=S.settings.calib&&S.settings.calib.attrs&&S.settings.calib.attrs[k];return c?clamp(Math.round(c.a*v+c.b),40,99):eaToPes(v)}
ovrFromEA=v=>{const c=S.settings.calib&&S.settings.calib.ovr;return c?clamp(Math.round(c.a*v+c.b),40,99):_ovrFromEAOrig(v)};
valueToOvr=(v,age)=>{const c=S.settings.calib&&S.settings.calib.value;if(c&&+v>1000){let o=c.a*Math.log10(+v)+c.b;if(age>28)o+=(age-28)*0.6;return clamp(Math.round(o),48,92)}return _valueToOvrOrig(v,age)};
ACT.impCalib=async el=>{const t=impState().tables.find(x=>x.id===el.dataset.t);const r=calibrateFrom(t);if(r.error){toast(r.error,'err');return}
  const ks=Object.keys(r.attrs).length;const avg=ks?(Object.values(r.attrs).reduce((a,b)=>a+b.rmse,0)/ks).toFixed(1):'–';
  if(!await ask('Use this calibration?',`Matched <b>${r.n}</b> players between <b>${esc(t.name)}</b> and your PES team files. Fitted ${ks} abilities (average error ±${avg})${r.ovr?', overall':''}${r.value?', market value':''}. New imports will convert with these lines.`,'Use it'))return;
  S.settings.calib=r;saveSettings();impRefreshStats();toast('Calibration saved','ok');rerender()};
ACT.calibReset=()=>{S.settings.calib=null;saveSettings();toast('Back to the default conversion','ok');rerender()};

/* ================= v2: saved import presets ================= */
const tblSig=headers=>headers.map(h=>norm(h)).join('|');
function presetApply(t){const p=(S.settings.importPresets||{})[tblSig(t.headers)];if(!p)return;
  Object.assign(t.map,p.map,{attrs:p.map.attrs||t.map.attrs});t.kind=p.kind||t.kind;t.on=t.kind!=='unknown';t.preset=p.savedAt}
function presetSave(t){const all=S.settings.importPresets||(S.settings.importPresets={});all[tblSig(t.headers)]={map:clone(t.map),kind:t.kind,name:t.name,savedAt:Date.now()};
  const ks=Object.keys(all);if(ks.length>40)ks.sort((a,b)=>all[a].savedAt-all[b].savedAt).slice(0,ks.length-40).forEach(k=>delete all[k])}
ACT.presetForget=el=>{const t=impState().tables.find(x=>x.id===el.dataset.t);delete (S.settings.importPresets||{})[tblSig(t.headers)];saveSettings();const d=detectMap(t.headers);Object.assign(t,{map:d.map,kind:d.kind,preset:null});t.stats=null;rerender()};

/* ================= v2: .ted files on the Import page ================= */
function tedGuessTarget(P){// a generated file's ID is the studio's choice: it only identifies a team when the names agree too
  const byId=Object.values(S.teds).find(t=>t.tedTeamId===P.team.teamId&&(!t.generated||(S.teams[t.id]&&strictName(S.teams[t.id].name,P.team.name)>=0.85)));if(byId&&S.teams[byId.id])return byId.id;const m=matchTeam(P.team.name);return m?m.id:'new'}
async function impAddTed(blob,path){const st=impState();st.teds=st.teds||[];const u8=new Uint8Array(await blob.arrayBuffer());
  if(u8.length===14760)throw new Error('this is a PES 2020 team file; only PES 2021 files (14,820 bytes) are supported');
  if(GF.type(u8)!=='ted'||!(await GF.verify(u8)).hashOK)throw new Error('the file is damaged or not a team file (checksum does not match)');
  const P=TED.parse(u8);if(!P.team.name&&!P.players.length)throw new Error('empty team file');
  st.teds.push({id:uid(),name:path.split('/').pop(),path,parsed:P,b64:TED.b64(u8),target:tedGuessTarget(P),on:true})}
function impTedSection(){const st=impState();const teds=st.teds||[];if(!teds.length)return'';const o=st.opts;
  const nNew=teds.filter(x=>x.on&&x.target==='new').length,nPl=teds.reduce((a,x)=>a+x.parsed.players.length,0);
  const avg=x=>{const ps=x.parsed.players.map(p=>ovr(normPlayer(Object.assign(newPlayer({pos:p.pos}),{attrs:Object.assign({},p.attrs),pos:p.pos})))).sort((a,b)=>b-a).slice(0,11);return ps.length?Math.round(ps.reduce((a,b)=>a+b,0)/ps.length):''};
  return `<h2>PES team files <span class="muted small">${teds.length} teams · ${nPl} players with real PES 2021 ratings</span></h2>
  <div class="card"><div class="row" style="gap:18px;margin-bottom:10px">
   <label class="c small"><input type="checkbox" data-act="impOpt" data-k="tedFull" ${o.tedFull?'checked':''}> Treat each file as the full team (players found in another of your teams move here)</label>
   <label class="f" style="flex-direction:row;align-items:center;gap:8px">New teams go to<select data-ch="impTedComp"><option value="">Unassigned</option>${opts(compsArr().map(c=>[c.id,c.name]),st.tedComp||'')}</select></label>
   <span class="small muted">${nNew} will be created as new teams</span><span class="spacer"></span><button class="sm" data-act="impTedAll" data-v="1">Tick all</button><button class="sm" data-act="impTedAll" data-v="0">Untick all</button></div>
  <div class="tw" style="max-height:420px"><table><thead><tr><th></th><th>File</th><th>Team in file</th><th class="num">Players</th><th class="num">Best XI</th><th>Goes to</th></tr></thead><tbody>
  ${teds.slice(0,800).map(x=>`<tr><td><input type="checkbox" data-act="impTedOn" data-id="${x.id}" ${x.on?'checked':''} aria-label="Use ${esc(x.name)}"></td><td class="small">${esc(x.path.length>48?'…'+x.path.slice(-46):x.path)}</td>
   <td><b>${esc(x.parsed.team.name)}</b> <span class="muted small">${esc(x.parsed.team.short)} · game ID ${x.parsed.team.teamId}</span></td><td class="num">${x.parsed.players.length}</td><td class="num">${statHTML(avg(x))}</td>
   <td><select data-ch="impTedTarget" data-id="${x.id}" style="max-width:260px" aria-label="Target team"><option value="new" ${x.target==='new'?'selected':''}>New team</option>${opts(teamsArr().map(t=>[t.id,t.name]),x.target)}</select></td></tr>`).join('')}</tbody></table></div>
  <p class="small muted" style="margin:8px 0 0">Each file is kept as a template, so your edits are written back into real team files for Import Team, with the emblem and manager photo it names linked by file name.</p></div>`}
ACT.impTedOn=el=>{const x=impState().teds.find(t=>t.id===el.dataset.id);x.on=!x.on;setTimeout(rerender,0)};
ACT.impTedAll=el=>{impState().teds.forEach(x=>x.on=el.dataset.v==='1');rerender()};
CH.impTedTarget=el=>{const x=impState().teds.find(t=>t.id===el.dataset.id);x.target=el.value;rerender()};
CH.impTedComp=el=>{impState().tedComp=el.value;impState().teds.forEach(x=>x.compId=el.value)};

/* ================= v2: export with team files, batches and an image plan ================= */
const SLOTCODE={'1st':'H','2nd':'A','3rd':'T','GK 1st':'GKH','GK 2nd':'GKA'};
function compCode(id){const c=S.comps[id];if(!c)return'XX';const s=(c.short||c.name.split(/\s+/).map(w=>w[0]).join('')).toUpperCase().replace(/[^A-Z0-9]/g,'');return (s||'XX').slice(0,4)}
const pad2=n=>String(n).padStart(2,'0');
function ensureExp(){const E=S.ui.exp;if(E.batch==null)E.batch=25;if(!E.layout)E.layout='prefix';if(!E.sheetMode)E.sheetMode='auto';if(E.parts.ted==null)E.parts.ted=true;if(E.parts.ced==null)E.parts.ced=true;if(E.parts.newPlayers==null)E.parts.newPlayers=false;return E}
CH.expBatch=el=>{ensureExp().batch=+el.value};CH.expLayout=el=>{ensureExp().layout=el.value};CH.expSheet=el=>{ensureExp().sheetMode=el.value};
const TPL_RECS=new Map();
async function tplRecs(tpl){if(TPL_RECS.has(tpl.ref))return TPL_RECS.get(tpl.ref);const raw=TED.unb64(await tedTemplateBytes(tpl));const d=TED.decrypt(raw);const m=new Map();
  for(let i=0;i<TED.MAXP;i++){const o=TED.PSTART+i*TED.PLEN;const pid=TED.readNum(d,o,4);if(pid)m.set(pid,{rec:TED.b64(d.subarray(o,o+TED.PLEN)),slot:i})}TPL_RECS.set(tpl.ref,m);return m}
ACT.buildPkg=async el=>{
  el.disabled=true;el.textContent='Building…';
  try{await miniBusy('Building the USB package…',async()=>{
    await pes21Teams().catch(()=>{});let {teams,comps}=exportScope();
    // a team or competition that lost its code (Game codes) is not exported: its code's new holder is, and two files for one
    // team or competition slot would leave it to whichever the game imports last
    const lostCode=[...teams.filter(t=>t.noCode),...comps.filter(c=>c.noCode)].map(x=>x.name);teams=teams.filter(t=>!t.noCode);comps=comps.filter(c=>!c.noCode);const E=ensureExp();const P=E.parts;const size=Math.max(1,+E.batch||25);const stages=E.layout==='stages';
    const order=teams.slice().sort((a,b)=>compName(a.compId).localeCompare(compName(b.compId))||a.name.localeCompare(b.name));
    const batchOf=new Map();order.forEach((t,i)=>batchOf.set(t.id,Math.floor(i/size)+1));const nb=Math.max(1,Math.ceil(order.length/size));
    const root=b=>stages?`STAGE${b}/WEPES/`:'WEPES/';
    // folders: competition, then team, then images/<type>/ (compFolder, teamFolder in app-core.js); only folders that get a file
    const compDirOf=(c,b)=>root(b)+compFolder(c)+'/';const teamDirOf=(t,b)=>compDirOf(teamDirComp(t),b)+teamFolder(t)+'/';const IMG_DIR=IMG_FOLDER;
    const files=[],used=new Set(),where=[],imgMap={},tedInfo=[],cedInfo=[],warn=[];
    const N={noGame:[],noSlotGame:[],ofSkip:[],noSlotC:[],noTed:[],generic:[],created:[],unlinked:[],noCed:[],genericC:[],noEmb:[],keepSquad:[],sameAs:[],realIds:[],dups:[],dupNums:[]};
    // PES keeps imported images by file name, so names are unique across the whole package, plain ASCII and short
    const uniq=base=>{const ext=(base.match(/\.[a-z]+$/i)||[''])[0];const stem=(pesName(base.slice(0,base.length-ext.length))||'X').slice(0,PES_NAME_MAX-ext.length);
      let b=stem+ext,n=2;while(used.has(b.toLowerCase())){const sf='_'+n;b=stem.slice(0,PES_NAME_MAX-ext.length-sf.length)+sf+ext;n++}used.add(b.toLowerCase());return b};
    const addImg=async(id,dir,base,what,kind,resize)=>{if(!id||!S.images[id])return null;const key=id+'|'+dir;if(imgMap[key]){where.push({file:imgMap[key],what,kind});return imgMap[key].split('/').pop()}
      try{const b=await imgBlobFor(id,resize);if(!b)return null;const nm=uniq(base);const p=dir+nm;imgMap[key]=p;files.push({path:p,data:b,size:b.size,include:true,kind:'image',ikind:kind,dims:await pngDims(b)});where.push({file:p,what,kind});return nm}catch(e){warn.push('Skipped '+imgName(id)+': '+e.message);return null}};
    const pkgName=(o,kind,k)=>{const n=o&&o.of&&o.of.names&&!codeMoved(o)?(kind==='kit'?(o.of.names.kits||[])[k]:kind==='sponsor'?o.of.names['sp'+(k+1)]:o.of.names[kind]):'';if(n)return n;const y=codeImgName(o,kind==='sponsor'?'sp'+(k+1):kind,k);return y?y.name:''};
    // an image the game already has from the option file: its own picture under its own name (never a path: DATABASE_RULES 5a)
    const pkgOriginal=(o,kind,k,id)=>{const im=S.images[id];if(codeMoved(o)||!im||!isOfRef(im.ref))return false;const keep=pkgName(o,kind,k);return !!keep&&String(im.ofName||'').toLowerCase()===keep.toLowerCase()};
    const addImgKeep=async(o,kind,k,id,dir,base,what,ikind,resize)=>{const keep=pkgName(o,kind,k);if(!id||!S.images[id])return null;if(!keep)return addImg(id,dir,typeof base==='function'?base():base,what,ikind,resize);
      if(pkgOriginal(o,kind,k,id)&&!P.ofAll){N.ofSkip.push(o.name+': '+keep);used.add(keep.toLowerCase());return keep}
      if(files.some(f=>f.path===dir+keep))return keep;
      try{const b=await imgBlobFor(id,resize);if(!b)return null;used.add(keep.toLowerCase());const pth=dir+keep;files.push({path:pth,data:b,size:b.size,include:true,kind:'image',ikind,dims:await pngDims(b)});where.push({file:pth,what:what+' (option-file name)',kind:ikind});return keep}
      catch(e){warn.push('Skipped '+imgName(id)+': '+e.message);return null}};
    const addDrawn=async(make,dir,base,what,ikind)=>{try{const b=await make();const nm=uniq(base);files.push({path:dir+nm,data:b,size:b.size,include:true,kind:'image',ikind,dims:await pngDims(b)});where.push({file:dir+nm,what,kind:ikind});return nm}catch(e){warn.push(what+' not drawn: '+e.message);return null}};
    const addGenKit=async(t,k,dir,base,keep)=>{try{const b=await kitTextureBlob(t,k,S.settings.kitExport==='1024'?1024:2048);const nm=keep?(used.add(keep.toLowerCase()),keep):uniq(ofNewCode('K','drawn:'+t.id+':'+k.slot));
      files.push({path:dir+nm,data:b,size:b.size,include:true,kind:'image',ikind:'kit',dims:await pngDims(b)});where.push({file:dir+nm,what:`Kit → ${t.name} ${k.slot} (drawn from its colours)`,kind:'kit'});return nm}
      catch(e){warn.push(t.name+' '+k.slot+' kit not drawn: '+e.message);return null}};
    const readBack=async(bytes,kind)=>{const v=await GF.verify(bytes);const out={type:v.type,hashOK:v.hashOK,sizeOK:v.sizeOK};const d=v.dec;
      if(kind==='ted'){out.name=TED.readStr(d,TED.TEAM+104,70);out.teamId=TED.readNum(d,TED.TEAM,4);out.emblem=TED.readStr(d,TED.IMG.emblem,TED.IMGLEN);out.manager=TED.readStr(d,TED.IMG.manager,TED.IMGLEN)}
      else{out.name=TED.readStr(d,CED.NAME,CED.NAMELEN);out.compId=TED.readNum(d,CED.ID,4);out.emblem=TED.readStr(d,CED.EMB,TED.IMGLEN)}return out};
    for(const c of comps){const cc=compCode(c.id),ctag=compTag(c)||cc;let emb=null;
      if(P.ced){const s0=compFileInfo(c);const why=s0&&cedProblem(s0.b64,s0.kind==='generic'?s0.compId:0);if(why){N.noSlotGame.push(c.name+': '+why);continue}}
      const cdir=compDirOf(c,1);if(P.comp)emb=await addImgKeep(c,'emblem',0,c.emblem,cdir+'Logo/',()=>ofImgCode(c.emblem,'comp'),`Competition emblem → ${inGameComp(c)||c.name}`,'comp');
      if(!P.ced)continue;const src=compFileInfo(c);if(!src){N.noCed.push(c.name);continue}if(src.kind==='own'&&!+src.compId)N.noSlotC.push(c.name);if(src.kind==='generic')N.genericC.push(c.name);
      try{const bytes=await CED.build(src.b64,{compId:src.kind==='generic'?src.compId:0,name:c.name,emblemFile:emb||(src.kind==='generic'?'':null)});const nm=uniq(`${+c.gameId||+src.compId||ctag}.ced`);// by its code only (DATABASE_RULES 5b)
        files.push({path:cdir+nm,data:new Blob([bytes]),size:bytes.length,include:true,kind:'ced',meta:{name:c.name,gameId:src.compId,source:src.kind,expect:{name:c.name,emblem:emb||''},verify:await readBack(bytes,'ced')}});
        cedInfo.push({comp:c.name,file:nm,source:src.kind})}catch(e){warn.push(c.name+': competition file not written ('+e.message+')')}}
    for(const t of order){const b=batchOf.get(t.id),dir=teamDirOf(t,b),idir=k=>dir+'images/'+IMG_DIR[k]+'/',cc=compCode(t.compId),tag=teamTag(t),sh=(pesName(t.short||shortName(t.name))||'T').toUpperCase().slice(0,6),base=tag||cc+'_'+sh;let emb=null,mgr=null;const kitN=[];
      if(P.emblem)emb=await addImgKeep(t,'emblem',0,t.emblem,idir('emblem'),()=>ofImgCode(t.emblem,'emblem'),`Team emblem → ${t.name}`,'emblem');
      if(P.kit)for(const k of t.kits||[]){const ki=OF_KIT_SLOT.indexOf(k.slot);const nm=!k.img&&!(t.of&&t.of.names&&(t.of.names.kits||[])[ki])?await addGenKit(t,k,idir('kit'),base,ki>=0?pkgName(t,'kit',ki):''):await addImgKeep(t,'kit',ki,k.img,idir('kit'),()=>ofImgCode(k.img,'kit'),`Kit → ${t.name} ${k.slot}`+(P.ted&&ki>=0?' (named in its team file)':' (Strip → Paste Image)'),'kit',S.settings.kitExport==='1024'?1024:0);if(nm&&ki>=0)kitN[ki]=nm}
      if(P.manager)mgr=S.images[t.managerPhoto]?await addImgKeep(t,'manager',0,t.managerPhoto,idir('manager'),()=>ofImgCode(t.managerPhoto,'manager'),`Manager photo → ${t.manager&&t.manager.name||t.name}`,'manager'):null;
      let stN,spN;if(P.stadium!==false&&!isNationalTeam(t)){stN=S.images[t.stadiumImg]?await addImgKeep(t,'stadium',0,t.stadiumImg,idir('stadium'),()=>ofImgCode(t.stadiumImg,'stadium'),`Stadium → ${t.name}`,'stadium'):(t.of&&t.of.names&&t.of.names.stadium)?undefined:''}
      if(P.sponsor!==false){spN=[];const s=spOf(t);for(let i=0;i<3;i++){const keep=t.of&&t.of.names&&t.of.names['sp'+(i+1)];spN[i]=S.images[s[i]]?await addImgKeep(t,'sponsor',i,s[i],idir('sponsor'),()=>ofImgCode(s[i],'sponsor'),`Sponsor board ${i+1} → ${t.name}`,'sponsor'):keep?undefined:''}}
      {const D=squadDuplicates(t.players||[]);if(D.copies||D.badIds)N.dups.push(t.name+': '+(D.copies?D.copies+' duplicate'+(D.copies>1?'s':''):'')+(D.copies&&D.badIds?', ':'')+(D.badIds?D.badIds+' IDs too long':''));
       const c={};(t.players||[]).forEach(p=>{if(p.number)c[p.number]=(c[p.number]||0)+1});const dn=Object.keys(c).filter(n=>c[n]>1);if(dn.length)N.dupNums.push(t.name+': #'+dn.join(', #'))}
      if(!P.ted)continue;if(+t.gameId&&!codePlaced('team',t))N.noGame.push(t.name+' (code '+t.gameId+')');const src=teamFileInfo(t);if(!src){if(t.sameAs)N.sameAs.push(t.name+' → '+t.sameAs);else N.noTed.push(t.name);continue}
      try{const b64=await src.load();const m=await teamPlayersFor(t,src,b64);if(src.kind==='generic')N.generic.push(t.name);if(!emb)N.noEmb.push(t.name);
        const out=await TED.build(Object.assign({},t,{players:m.players}),{b64,teamId:src.teamId,scheme:src.scheme},
          {emblemFile:emb||undefined,managerFile:mgr||undefined,kitFiles:kitN.length?kitN:undefined,stadiumFile:stN||undefined,sponsorFiles:spN,teamId:src.kind==='generic'?src.teamId:0,generic:src.kind==='generic',baseRec:P.newPlayers?m.baseRec:null,realIds:!!P.realIds,keepSquad:!m.players.length&&src.kind!=='generic',emptySquad:!m.players.length&&src.kind==='generic'});
        const info=!m.players.length;if(info)N.keepSquad.push(t.name);// team-info file: the game keeps its own players
        out.created.forEach(n=>N.created.push(t.name+': '+n));if(P.realIds)m.players.forEach(p=>{if(!p.ted&&+p.gameId)N.realIds.push(t.name+': '+p.name+' (ID '+p.gameId+')')});if(!P.newPlayers)out.warn.forEach(w=>N.unlinked.push(t.name+': '+w));else out.warn.forEach(w=>warn.push(t.name+': '+w));
        const nm=uniq(`${+src.teamId||+t.gameId||tag||sh}.ted`);// by its code only (DATABASE_RULES 5b); team-info files are named in the README
        files.push({path:dir+nm,data:new Blob([out.bytes]),size:out.bytes.length,include:true,kind:'ted',meta:{name:t.name,gameId:src.teamId,source:src.kind,expect:{name:t.name,emblem:emb||'',manager:mgr||''},verify:await readBack(out.bytes,'ted')},info});
        tedInfo.push({team:t.name,file:nm,batch:b,warn:out.warn,source:src.kind,created:out.created,info})}
      catch(e){warn.push(t.name+': team file not written ('+e.message+')')}}
    const notes=[];const nn=(lvl,list,msg)=>{if(list.length)notes.push({lvl,msg:msg(list.length),list})};
    nn('info',lostCode,n=>`${n} team${n>1?'s or competitions':' or competition'} that lost ${n>1?'their codes':'its code'} on Game codes ${n>1?'are':'is'} left out: ${n>1?'their codes go':'its code goes'} to the new holder`);
    nn('err',N.noGame,n=>`${n} team${n>1?'s have codes':' has a code'} the game doesn't have: the game skips ${n>1?'their files':'its file'} on import (2026-11-19 test). Give ${n>1?'them':'it'} a game team's code on Game codes (Allocate a slot)`);
    nn('err',N.noSlotGame,n=>`${n} competition file${n>1?'s are':' is'} left out, with ${n>1?'their logos':'its logo'}: the game finds a competition by its slot, and a code it doesn't have would land on another competition`);
    {const F=(S.settings.imgSpace||{}).free||{};const cnt={};files.forEach(f=>{if(f.kind==='image'&&f.ikind)cnt[f.ikind]=(cnt[f.ikind]||0)+1});
     nn('err',SPACE_KINDS.filter(([k])=>cnt[k]&&F[k]!==''&&F[k]!=null&&cnt[k]>+F[k]).map(([k,l])=>`${l}: ${cnt[k]} in the package, ${F[k]} free in the game`),n=>`More new images than the game has room for (image space, Import / Export → Export Option File): a new image only goes in by overwriting one of the same name, so the rest won't import. Export the complete option file instead (Import / Export → Export Option File → First install), delete every imported image in Edit on your PS, then import it all; or leave out what the game's own images can do`);
     nn('info',SPACE_KINDS.filter(([k])=>cnt[k]).map(([k,l])=>`${l}: ${cnt[k]}`),n=>`Images in this package by type: each new one takes a space in the game's store of its type (an image of a name already in the game is overwritten in place)`)}
    nn('err',N.noTed,n=>`${n} team${n>1?'s have':' has'} no game file: it couldn't be generated (no free PES 2021 team slot or no template). Set ${n>1?'their':'its'} in-game team ID, import ${n>1?'their':'its'} .ted, or leave ${n>1?'them':'it'} out`);
    nn('info',N.ofSkip,n=>`${n} image${n>1?'s are':' is'} already in your installed option file and left out; the team and competition files still name ${n>1?'them':'it'} by ${n>1?'their':'its'} option-file name`);
    nn('warn',N.generic,n=>`${n} team file${n>1?'s are':' is'} built on the generic template: kit colours, coach and tactics come from the template (try one team first)`);
    nn('info',N.created,n=>`${n} player${n>1?'s are':' is'} written under IDs no game file has (appearance and nationality copied from a template player). The game never creates players from a team file: if it doesn't have ${n>1?'these IDs':'this ID'}, it refuses the whole team ("This data includes players who cannot be imported")`);
    nn('warn',N.unlinked,n=>`${n} player${n>1?'s are':' is'} left out of the team files: no game file has ${n>1?'them':'him'}, and the game never creates a player from a team file (a team that lists one is refused). Make ${n>1?'them':'him'} in Edit first, or use an existing or unregistered player`);
    nn('warn',N.realIds,n=>`${n} player${n>1?'s are':' is'} written under ${n>1?'their':'his'} real game ID: importing with "Apply player and squad data" replaces ${n>1?'those':'that'} game player${n>1?'s\'':'\'s'} data, and the file's animations and appearance fields come from a template player (experimental)`);
    nn('err',N.dups,n=>`${n} team${n>1?'s list':' lists'} the same player more than once; a team file must list each player once (Health check → Remove duplicates)`);
    nn('err',N.dupNums,n=>`${n} team${n>1?'s have':' has'} the same shirt number twice (Health check → Renumber)`);
    nn('info',N.sameAs,n=>`${n} team${n>1?'s are second copies':' is a second copy'} of a team (in a cup); that team's file is written once, on its league copy`);
    nn('info',N.keepSquad,n=>`${n} team${n>1?'s have':' has'} no players in the studio, so ${n>1?'their files are':'its file is a'} team-info file${n>1?'s':''} (${N.keepSquad.slice(0,8).join(', ')}${n>8?'…':''}): import ${n>1?'them':'it'} with "Apply player and squad data" OFF so the game keeps its own players`);
    nn('info',N.noEmb,n=>`${n} team file${n>1?'s keep their':' keeps its'} current in-game emblem (no emblem image in the project)`);
    nn('err',N.noCed,n=>`${n} competition${n>1?'s have':' has'} no game file: it couldn't be generated. Import ${n>1?'their':'its'} .ced, or leave ${n>1?'them':'it'} out`);
    nn('err',N.noSlotC,n=>`${n} competition file${n>1?'s have':' has'} no competition ID yet; open the studio again so ${n>1?'they get':'it gets'} one`);
    nn('warn',N.genericC,n=>`${n} competition file${n>1?'s are':' is'} built on the generic template (try it first)`);
    const base=dataFor('baseline');const d=base?diffData(base,currentData()):null;
    const mode=E.sheetMode==='auto'?(d?'changes':'full'):E.sheetMode;
    const batches=[];for(let b=1;b<=nb;b++)batches.push({n:b,teams:order.filter(t=>batchOf.get(t.id)===b).map(t=>t.name),teds:tedInfo.filter(x=>x.batch===b).map(x=>x.file)});
    if(P.sheet){const html=buildSheet(teams,comps,where,mode==='changes'?d:null,{tedInfo,cedInfo,batches,stages,mode});files.push({path:'_Read me/PES21_Update_Sheet.html',data:html,size:html.length,include:true,kind:'doc'})}
    if(P.csv){const pc=playersCSV(teams),tc=teamsCSV(teams),cc=compsCSV(comps);files.push({path:'_Read me/data/players.csv',data:pc,size:pc.length,include:true,kind:'csv'},{path:'_Read me/data/teams.csv',data:tc,size:tc.length,include:true,kind:'csv'},{path:'_Read me/data/competitions.csv',data:cc,size:cc.length,include:true,kind:'csv'})}
    const rd=readme(teams,comps,{tedInfo,cedInfo,batches,stages});files.push({path:'_Read me/README.txt',data:rd,size:rd.length,include:true,kind:'doc'});
    S.ui.build={files,teams:teams.length,at:Date.now(),notes,warnings:exportWarnings(teams,comps,P).concat(warn,teams.flatMap(t=>{const c={};(t.players||[]).forEach(p=>{if(p.number)c[p.number]=(c[p.number]||0)+1});const d=Object.keys(c).filter(n=>c[n]>1);return d.length?[t.name+': shirt number '+d.join(', ')+' is used twice (fix it on the Health check page)']:[]}),teams.filter(t=>(t.players||[]).length>40).map(t=>t.name+' has more than 40 players; the game keeps 40')),batches,tedInfo,cedInfo,stages,usbStage:1};
  });rerender()}catch(e){toast('Build failed: '+e.message,'err')}finally{el.disabled=false;el.textContent='Build package'}
};
function imagePlanHTML(files){const on=files.filter(f=>f.include&&f.kind==='image');const by={emblem:[],comp:[],kit:[],manager:[]};on.forEach(f=>(by[f.ikind]||(by[f.ikind]=[])).push(f));
  const row=(k,l,game)=>{const fs=by[k]||[];const sz=fs.reduce((a,f)=>a+f.size,0);return `<tr><td>${l}</td><td class="small muted">${game}</td><td class="num">${fs.length}</td><td class="num">${kb(sz)}</td></tr>`};
  const kits=(by.kit||[]).length,ce=(by.comp||[]).length;
  return `<details style="margin-top:10px" open><summary style="cursor:pointer;font-weight:700">Image plan</summary><div class="grid g2" style="margin-top:8px"><table><thead><tr><th>Type</th><th>Import Images menu</th><th class="num">Files</th><th class="num">Size</th></tr></thead><tbody>
   ${row('emblem','Team emblems','Team Emblem')}${row('comp','Competition emblems','Competition Emblem')}${row('kit','Kit textures',S.settings.kitExport==='1024'?'Strip (S)':'Strip (L)')}${row('manager','Manager photos','Manager')}</tbody></table>
   <div class="small"><b>Before importing</b><label class="c" style="margin-top:6px"><input type="checkbox"> Save your current edit data (or export your teams) as a backup</label>
    <label class="c"><input type="checkbox"> If you're replacing an older option file: Edit → Data Management → <b>Delete Images</b> (Strip L/S, Team Emblems, Competition Emblems)</label>
    <label class="c"><input type="checkbox"> Install all official Data Packs before importing</label>
    ${kits>300||ce>50?`<div class="warnbox" style="margin-top:6px">Large image set: older PES versions capped strips at about 340 and competition emblems at about 50. PES 2021 limits by total size instead; if it reports no space, import in stages or switch kits to Strip (S).</div>`:''}</div></div></details>`}
function buildView(){const b=S.ui.build;const on=b.files.filter(f=>f.include);const total=on.reduce((a,f)=>a+f.size,0);const imgs=on.filter(f=>f.kind==='image').length,teds=on.filter(f=>f.kind==='ted').length,ceds=on.filter(f=>f.kind==='ced').length;
  const blocked=pkgBlocked();const usb=!!window.showDirectoryPicker;
  return `<h2>Package contents</h2><div class="card hl"><div class="row"><div><b>${on.length} of ${b.files.length} files</b> · ${kb(total)} · ${imgs} images · ${teds} team files · ${ceds} competition files · ${b.batches.length} batch${b.batches.length===1?'':'es'}</div><span class="spacer"></span>
   <button class="sm" data-act="bfAll" data-v="1">Tick all</button><button class="sm" data-act="bfAll" data-v="0">Untick images</button>
   ${b.stages&&b.batches.length>1?`<select data-ch="usbStage" aria-label="Batch to write">${opts(b.batches.map(x=>[x.n,'Batch '+x.n]),b.usbStage||1)}</select>`:''}
   <button class="gold" data-act="writeUsb" ${on.length&&!blocked&&usb?'':'disabled'} title="${usb?'Write straight to a USB drive':'Needs Chrome or Edge on a computer'}">Write to USB drive</button>
   <button class="${usb?'':'gold'}" data-act="downloadPkg" ${on.length&&!blocked?'':'disabled'}>Download ZIP</button></div>
   ${checkHTML(b)}
   ${b.warnings.length?`<details class="warnbox" style="margin-top:10px"><summary style="cursor:pointer">${b.warnings.length} note${b.warnings.length===1?'':'s'} before you import</summary>${b.warnings.slice(0,200).map(esc).join('<br>')}</details>`:''}
   ${b.batches.length>1?`<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">Import order</summary><ol class="small">${b.batches.map(x=>`<li>Batch ${x.n}${b.stages?' (folder STAGE'+x.n+')':''}: ${x.teams.length} teams${x.teds.length?' · '+x.teds.length+' team files':''} <span class="muted">${esc(x.teams.slice(0,8).join(', '))}${x.teams.length>8?'…':''}</span></li>`).join('')}</ol></details>`:''}
   ${imagePlanHTML(b.files)}
   <div class="tw" style="margin-top:10px;max-height:340px"><table><thead><tr><th></th><th>File</th><th>Type</th><th class="num">Size</th></tr></thead><tbody>
   ${b.files.slice(0,1500).map((f,i)=>`<tr><td><input type="checkbox" data-act="bfOne" data-i="${i}" ${f.include?'checked':''} aria-label="Include ${esc(f.path)}"></td><td>${f.kind==='image'?`<img class="thumb" style="width:26px;height:26px;vertical-align:middle" src="${esc(f.url||(f.url=URL.createObjectURL(f.data)))}" alt=""> `:''}${esc(f.path)}</td><td class="small muted">${f.kind==='ted'?'team file':f.kind==='ced'?'competition file':f.kind}${f.meta&&f.meta.source!=='own'?' ('+esc(f.meta.source)+')':''}</td><td class="num small">${kb(f.size)}</td></tr>`).join('')}</tbody></table></div>
   <p class="small muted" style="margin:10px 0 0">${usb?'<b>Write to USB drive</b>: pick the drive itself (for example E:); the files go to its WEPES folder. Or download the ZIP and ':'Unzip and '}copy ${b.stages?'one STAGE folder\'s WEPES at a time':'the <b>WEPES</b> folder'} to the root of the drive (exFAT or FAT32). The README and Update Sheet list the steps in order.</p></div>`}
function readme(teams,comps,x={}){const ti=x.tedInfo||[];const bs=x.batches||[];return `PES 2021 OPTION STUDIO PACKAGE
Season: ${S.settings.season}
Created: ${new Date().toString()}
Teams: ${teams.length}   Competitions: ${comps.length}   Team files: ${ti.length}   Batches: ${bs.length}

BEFORE YOU START
- Install all official PES 2021 Data Packs.
- Save your current edit data as a backup.
- Replacing an older option file? Edit > Data Management > Delete Images first.
- Format a USB drive as exFAT (or FAT32).

IMPORT ORDER (PS5 / PS4)
${x.stages?'1. Copy STAGE1/WEPES to the ROOT of the USB (USB:/WEPES). After finishing a stage, replace it with the next STAGE folder\'s WEPES.':'1. Copy the WEPES folder to the ROOT of the USB (USB:/WEPES).'}
2. Settings > Edit > Import/Export > Import Team${ti.length?'':' (only if you also have team files)'}.
   Press Square to select files batch by batch (they start 01_, 02_ ...).
   Detailed Settings: tick "Overwrite image files of the same name" and "Apply player and squad data".
${ti.some(t=>t.info)?`   Then import the team-info files (they start I01_, I02_ ...) in a second pass with
   "Apply player and squad data" UNTICKED: they change name, short name, stadium and emblem and keep the game's players.
`:''}
   Each team file names its emblem (E_) and manager photo (M_); they sit next to it, so the game links them on import.
   Team files are EXPERIMENTAL: try one team first and check it in Edit mode.
${(x.cedInfo||[]).length?`   Then Import Competition: the C_*.ced files (${x.cedInfo.length}). Each names its emblem (C_*.png) next to it.
`:''}3. Import/Export > Import Images: Strip (K_), plus any Team Emblem (E_), Competition Emblem (C_) or Manager (M_)
   image that did not come in with a team or competition file. Names already match, so importing again is safe.
   Names are serials from the in-game ID: team 101 uses E_000101.png, M_000101.png and ..._000101.ted;
   competition 17 uses C_0017.png and C_0017.ced (C_X01 … for competitions without a known ID).
4. Open PES21_Update_Sheet.html on your phone and work through it: it follows the in-game Edit menus.
5. Save your edit data in-game.
${bs.length>1?'\nBATCHES\n'+bs.map(b=>`Batch ${b.n}: ${b.teams.join(', ')}`).join('\n')+'\n':''}
OTHER FILES
data/players.csv, teams.csv, competitions.csv  - spreadsheets of the exported data
`}
function buildSheet(teams,comps,where,d,x={}){
  const css=`body{font:15px/1.45 system-ui,sans-serif;margin:0;background:#f4f6fa;color:#111}main{max-width:1000px;margin:auto;padding:20px}h1{font-size:26px;margin:0 0 4px}h2{margin:28px 0 8px;font-size:21px;border-bottom:3px solid #2e9bff;padding-bottom:4px}h3{margin:16px 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#445}
  table{border-collapse:collapse;width:100%;background:#fff;font-variant-numeric:tabular-nums;font-size:14px}td,th{border:1px solid #d9dee8;padding:4px 6px;text-align:left}th{background:#eef2f8;font-size:12px;text-transform:uppercase}
  .sw{display:inline-block;width:14px;height:14px;border:1px solid #888;border-radius:3px;vertical-align:-2px}.box{background:#fff;border:1px solid #d9dee8;border-radius:8px;padding:12px;margin:8px 0}.chg{color:#0a7d4f}.neg{color:#c0293b}.tag{font-size:11px;font-weight:700;background:#e5f0ff;color:#1356a8;border-radius:4px;padding:1px 6px}
  label{display:flex;gap:8px;align-items:flex-start;padding:3px 0}input[type=checkbox]{width:20px;height:20px;flex:none;margin-top:1px}.muted{color:#667}.toc a{margin-right:10px}
  .bar{position:sticky;top:0;background:#111c2b;color:#fff;padding:10px 20px;display:flex;gap:12px;align-items:center;z-index:2}.bar button{font:inherit;padding:6px 12px;border-radius:6px;border:0;cursor:pointer}
  body.hide-done label.done{display:none}@media print{.bar{display:none}h2{break-before:page}label.done{display:flex!important}}`;
  const ti=x.tedInfo||[];const tedTeams=new Set(ti.map(t=>t.team));const menu=s=>`<span class="muted">${s}</span>`;
  const chk=(txt)=>`<label><input type="checkbox"> <span>${txt}</span></label>`;
  const tdiff=t=>{if(!d)return null;const pl=d.players.filter(z=>(z.tA&&z.tA.id===t.id)||(z.tB&&z.tB.id===t.id));const tf=d.teams.find(z=>z.id===t.id);return{pl,tf}};
  const teamBlock=t=>{const m=t.manager||{};const viaTed=tedTeams.has(t.name);const ch=tdiff(t);const ps=(t.players||[]).slice().sort((a,b)=>POS.indexOf(a.pos)-POS.indexOf(b.pos)||ovr(b)-ovr(a));
    if(ch&&!ch.pl.length&&!ch.tf&&!where.some(w=>w.what.includes(t.name)))return '';
    const imgs=where.filter(w=>w.what.includes(t.name));
    let body=`<h3>1 · Team info ${menu('Edit → Teams → '+esc(inGameTeam(t)||t.name))}</h3>`;
    if(viaTed)body+=`<p class="muted">Name, players, numbers and ratings come from the team file. Check them, then continue with strips and images.</p>`;
    else if(ch&&ch.tf&&ch.tf.fields)body+=ch.tf.fields.filter(f=>!['kits','emblem','managerPhoto','notes'].includes(f.k)).map(f=>chk(`${esc(LABEL[f.k]||f.k)}: ${esc(sheetVal(f.k,f.from))} → <b>${esc(sheetVal(f.k,f.to))}</b>`)).join('')||'<p class="muted">No changes.</p>';
    else body+=`<table><tr><th>Name</th><td><b>${esc(t.name)}</b> (${esc(t.short)})</td><th>Stadium</th><td>${esc(t.stadium)}</td></tr><tr><th>Manager</th><td>${esc(m.name)} ${m.nat?'('+esc(m.nat)+')':''}</td><th>Formation</th><td>${esc(t.formation)} · ${esc(t.playstyle)}</td></tr></table>`;
    body+=`<h3>2 · Emblem &amp; strips ${menu('Edit → Teams → Emblem / Strip')}</h3>`+(imgs.map(w=>chk(`<code>${esc(w.file.split('/').pop())}</code> → ${esc(w.what)}`)).join('')||'<p class="muted">No images for this team.</p>');
    body+=`<table><tr><th>Kit</th><th>Shirt</th><th>2nd</th><th>Shorts</th><th>Socks</th><th>Numbers</th><th>Collar</th><th>Sponsor</th></tr>${(t.kits||[]).map(k=>`<tr><td>${esc(k.slot)}</td>${['shirt','second','shorts','socks','numberColor'].map(c=>`<td><span class="sw" style="background:${esc(hexOr(k[c],'#fff'))}"></span> ${esc(k[c])}</td>`).join('')}<td>${esc(k.collar)}</td><td>${esc(k.sponsor)}</td></tr>`).join('')}</table>`;
    if(!viaTed){body+=`<h3>3 · Players ${menu('Edit → Players / Teams → Team')}</h3>`;
      if(ch){body+=ch.pl.map(z=>z.type==='added'&&z.tB.id===t.id?chk(`<span class="chg">Add</span> <b>${esc(z.p.name)}</b> (${esc(z.p.pos)}, OVR ${ovr(z.p)}, no. ${esc(z.p.number)})`):z.type==='removed'?chk(`<span class="neg">Remove</span> <b>${esc(z.p.name)}</b>`):z.type==='moved'?chk(`${z.tB.id===t.id?'<span class="chg">Sign</span>':'<span class="neg">Transfer out</span>'} <b>${esc(z.p.name)}</b> ${esc(z.tA.name)} → ${esc(z.tB.name)}`):z.tB&&z.tB.id===t.id?chk(`<b>${esc(z.p.name)}</b>: ${z.fields.filter(f=>!['ted','src'].includes(f.k)).map(f=>`${esc(LABEL[f.k]||f.k)} ${esc(sheetVal(f.k,f.from))}→<b>${esc(sheetVal(f.k,f.to))}</b>`).join(', ')}`):'').join('')||'<p class="muted">No player changes.</p>'}
      else body+=`<table><tr><th>✓</th><th>#</th><th>Name</th><th>Pos</th><th>Age</th><th>OVR</th><th>Key ratings</th></tr>${ps.map(p=>`<tr><td><input type="checkbox"></td><td>${esc(p.number)}</td><td><b>${esc(p.name)}</b><br><span class="muted">${esc(p.shirtName)}</span></td><td>${esc(p.pos)}</td><td>${esc(p.age)}</td><td><b>${ovr(p)}</b></td><td style="font-size:12px">${ATTRS.filter(a=>p.pos==='GK'?a[2]==='gk':a[2]!=='gk').map(a=>`${a[1].replace('Awareness','Aw.').replace('Physical ','')} ${p.attrs[a[0]]}`).join(' · ')} · WF ${p.wfUsage}/${p.wfAcc} · Form ${p.form} · Inj ${p.injury}${p.skills.length?' · '+esc(p.skills.join(', ')):''}</td></tr>`).join('')}</table>`}
    return `<section id="t-${t.id}"><h2>${esc(t.name)} <span class="muted" style="font-size:14px">${esc(compName(t.compId))}${viaTed?' · <span class="tag">team file</span>':''}</span></h2>${body}</section>`};
  const byComp={};teams.forEach(t=>{const k=compName(t.compId);(byComp[k]=byComp[k]||[]).push(t)});
  const teamHTML=Object.keys(byComp).sort().map(k=>{const inner=byComp[k].sort((a,b)=>a.name.localeCompare(b.name)).map(teamBlock).join('');return inner?`<h2 style="background:#111c2b;color:#fff;padding:8px 12px;border:0">${esc(k)}</h2>${inner}`:''}).join('');
  const typeOrder=[['emblem','Team Emblem'],['comp','Competition Emblem'],['kit','Strip'],['manager','Manager']];
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PES 2021 Update Sheet ${esc(S.settings.season)}</title><style>${css}</style></head><body>
  <div class="bar"><b>PES 2021 Update Sheet</b><span id="cnt"></span><span style="flex:1"></span><button onclick="document.body.classList.toggle('hide-done')">Hide done</button><button onclick="window.print()">Print / PDF</button></div><main>
  <p class="muted">Season ${esc(S.settings.season)} · ${teams.length} teams · ${comps.length} competitions · ${x.mode==='changes'?'changes since your baseline':'full data'} · made ${esc(new Date().toLocaleString())}. Ticks are kept on this device.</p>
  <h2>0 · Before you start</h2>${chk('Save your current edit data as a backup')}${chk('Replacing an older option file? Edit → Data Management → Delete Images')}${chk('All official Data Packs are installed')}
  ${ti.length?`<h2>1 · Import Team ${menu('Edit → Import/Export → Import Team')}</h2><p>Select files with Square, then <b>Detailed Settings</b>: tick <b>Overwrite image files of the same name</b> and <b>Apply player and squad data</b>. Team files are experimental: do one team first and check it.</p>
    ${(x.batches||[]).filter(b=>b.teds.length).map(b=>chk(`Batch ${b.n}${x.stages?' (STAGE'+b.n+')':''}: ${b.teds.map(f=>'<code>'+esc(f)+'</code>').join(' ')}`)).join('')}`:''}
  <h2>${ti.length?2:1} · Import Images ${menu('Edit → Import/Export → Import Images')}</h2>${typeOrder.map(([k,l])=>{const ws=where.filter(w=>w.kind===k);if(!ws.length)return'';const files=[...new Set(ws.map(w=>w.file.split('/').pop()))];return chk(`<b>${l}</b>: ${files.length} file${files.length>1?'s':''} (${esc(files[0])}${files.length>1?' … '+esc(files[files.length-1]):''})`)}).join('')||'<p class="muted">No images.</p>'}
  ${comps.length?`<h2>${ti.length?3:2} · Competitions ${menu('Edit → Competitions')}</h2><table><tr><th>✓</th><th>In-game slot</th><th>New name</th><th>Emblem</th><th>Teams</th></tr>${comps.map(c=>`<tr><td><input type="checkbox"></td><td>${esc(inGameComp(c)||'—')}</td><td><b>${esc(c.name)}</b> (${esc(c.short)})</td><td>${esc(((where.find(w=>w.kind==='comp'&&w.what.includes(inGameComp(c)||c.name))||{}).file||'').split('/').pop())}</td><td class="muted" style="font-size:12px">${esc((c.type==='Cup'&&(c.teams||[]).length?(c.teams||[]).map(id=>S.teams[id]&&S.teams[id].name).filter(Boolean):teamsArr().filter(t=>t.compId===c.id).map(t=>t.name)).join(', '))}</td></tr>`).join('')}</table>`:''}
  <h2>${ti.length?4:3} · Teams</h2><p class="toc">${teams.map(t=>`<a href="#t-${t.id}">${esc(t.short||t.name)}</a>`).join('')}</p>${teamHTML||'<p class="muted">No team changes.</p>'}
  </main><script>try{const K='pes21sheet:'+document.title;const st=JSON.parse(localStorage.getItem(K)||'{}');const cs=[...document.querySelectorAll('input[type=checkbox]')];const upd=()=>{document.getElementById('cnt').textContent=cs.filter(c=>c.checked).length+' of '+cs.length+' done'};
   cs.forEach((c,i)=>{c.checked=!!st[i];const l=c.closest('label');if(l)l.classList.toggle('done',c.checked);c.addEventListener('change',()=>{st[i]=c.checked;if(l)l.classList.toggle('done',c.checked);localStorage.setItem(K,JSON.stringify(st));upd()})});upd()}catch(e){}<\/script></body></html>`;
}
