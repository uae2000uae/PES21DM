// PES 2021 Option Studio, part 1 of 14: Constants, utilities, storage, state, model, router, snapshots.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= Constants: PES 2021 data model ================= */
const ATTRS=[
 ['offAw','Offensive Awareness','att'],['ballCtl','Ball Control','att'],['drib','Dribbling','att'],['tight','Tight Possession','att'],
 ['lowPass','Low Pass','att'],['loftPass','Lofted Pass','att'],['finish','Finishing','att'],['heading','Heading','att'],
 ['placeKick','Place Kicking','att'],['curl','Curl','att'],
 ['speed','Speed','phy'],['accel','Acceleration','phy'],['kickPow','Kicking Power','phy'],['jump','Jump','phy'],
 ['contact','Physical Contact','phy'],['balance','Balance','phy'],['stamina','Stamina','phy'],
 ['defAw','Defensive Awareness','def'],['ballWin','Ball Winning','def'],['aggr','Aggression','def'],
 ['gkAw','GK Awareness','gk'],['gkCatch','GK Catching','gk'],['gkClear','GK Clearing','gk'],['gkReflex','GK Reflexes','gk'],['gkReach','GK Reach','gk']];
const ATTR_KEYS=ATTRS.map(a=>a[0]);
const GROUPS={att:'Attacking',phy:'Physical',def:'Defending',gk:'Goalkeeping'};
const POS=['GK','CB','LB','RB','DMF','CMF','LMF','RMF','AMF','LWF','RWF','SS','CF'];
const POS_GROUP=p=>p==='GK'?'GK':['CB','LB','RB'].includes(p)?'DEF':['DMF','CMF','LMF','RMF','AMF'].includes(p)?'MID':'ATT';
const STYLES=['None','Goal Poacher','Dummy Runner','Fox in the Box','Prolific Winger','Classic No. 10','Hole Player','Box-to-Box','Anchor Man','The Destroyer','Extra Frontman','Offensive Full-back','Defensive Full-back','Target Man','Creative Playmaker','Build Up','Offensive Goalkeeper','Defensive Goalkeeper','Roaming Flank','Cross Specialist','Orchestrator','Full-back Finisher'];
const SKILLS=['Scissors Feint','Double Touch','Flip Flap','Marseille Turn','Sombrero','Cross Over Turn','Cut Behind & Turn','Scotch Move','Step On Skill Control','Heading','Long Range Drive','Chip Shot Control','Long Range Shooting','Knuckle Shot','Dipping Shot','Rising Shot','Acrobatic Finishing','Heel Trick','First-time Shot','One-touch Pass','Through Passing','Weighted Pass','Pinpoint Crossing','Outside Curler','Rabona','No Look Pass','Low Lofted Pass','GK Low Punt','GK High Punt','Long Throw','GK Long Throw','Penalty Specialist','GK Penalty Saver','Gamesmanship','Man Marking','Track Back','Interception','Acrobatic Clear','Captaincy','Super-sub','Fighting Spirit'];
const COM=['Trickster','Mazing Run','Speeding Bullet','Incisive Run','Long Ball Expert','Early Cross','Long Ranger'];
const PLAYSTYLES=['Possession Game','Quick Counter','Long Ball Counter','Out Wide','Long Ball'];
const FORMATIONS=['4-3-3','4-2-3-1','4-4-2','4-1-2-3','4-3-2-1','4-1-4-1','4-4-1-1','4-2-2-2','4-3-1-2','3-4-3','3-5-2','3-4-2-1','3-4-1-2','5-3-2','5-4-1'];
const KIT_SLOTS=['1st','2nd','3rd','GK 1st','GK 2nd'];
const COLLARS=['Crew neck','V-neck','Polo collar','Henley','Grandad','Wrap-over'];
const IMG_KINDS={
  emblem:{label:'Team emblem',game:'Team Emblem',sq:true},
  comp:{label:'Competition emblem',game:'Competition Emblem',sq:true},
  kit:{label:'Kit texture',game:'Strip',sq:true},
  manager:{label:'Manager photo',game:'Manager photo',sq:true},
  sponsor:{label:'Sponsor / logo art',game:'Reference only',sq:false},
  kitref:{label:'Kit preview',game:'Reference only',sq:false}};
const COMP_TEMPLATES=[
 ['Premier League','England','League'],['EFL Championship','England','League'],['LaLiga','Spain','League'],['LaLiga Hypermotion','Spain','League'],
 ['Serie A','Italy','League'],['Serie B','Italy','League'],['Bundesliga','Germany','League'],['Ligue 1','France','League'],['Ligue 2','France','League'],
 ['Eredivisie','Netherlands','League'],['Liga Portugal','Portugal','League'],['Süper Lig','Türkiye','League'],['Scottish Premiership','Scotland','League'],
 ['Belgian Pro League','Belgium','League'],['Brasileirão Série A','Brazil','League'],['Liga Profesional','Argentina','League'],['Saudi Pro League','Saudi Arabia','League'],
 ['ADNOC Pro League','UAE','League'],['Major League Soccer','USA','League'],['UEFA Champions League','Europe','Cup'],['UEFA Europa League','Europe','Cup'],
 ['AFC Champions League Elite','Asia','Cup'],['National teams','International','Cup']];
const W={ // position weights used for the estimated overall
 GK:{gkAw:3,gkReflex:3,gkCatch:2,gkReach:2,gkClear:1,jump:.5},
 CB:{defAw:3,ballWin:3,heading:2,contact:2,jump:1.5,aggr:1,speed:1,stamina:.5},
 LB:{defAw:2,ballWin:2,speed:2,accel:1.5,stamina:2,lowPass:1,loftPass:1,drib:.5},
 RB:{defAw:2,ballWin:2,speed:2,accel:1.5,stamina:2,lowPass:1,loftPass:1,drib:.5},
 DMF:{defAw:3,ballWin:3,lowPass:2,loftPass:1,aggr:1,contact:1.5,stamina:1.5,ballCtl:1},
 CMF:{lowPass:3,loftPass:2,ballCtl:2,stamina:1.5,defAw:1,ballWin:1,offAw:1,tight:1},
 LMF:{speed:1.5,accel:1.5,drib:2,ballCtl:1.5,lowPass:1.5,loftPass:1.5,stamina:1.5,offAw:1},
 RMF:{speed:1.5,accel:1.5,drib:2,ballCtl:1.5,lowPass:1.5,loftPass:1.5,stamina:1.5,offAw:1},
 AMF:{lowPass:2.5,ballCtl:2,drib:2,offAw:2,tight:1.5,finish:1,loftPass:1,balance:1},
 LWF:{drib:2.5,speed:2,accel:2,ballCtl:2,offAw:1.5,finish:1.5,tight:1,balance:1,lowPass:1},
 RWF:{drib:2.5,speed:2,accel:2,ballCtl:2,offAw:1.5,finish:1.5,tight:1,balance:1,lowPass:1},
 SS:{offAw:2,ballCtl:2,drib:2,finish:2,lowPass:1.5,speed:1,accel:1.5,tight:1,balance:1},
 CF:{finish:3,offAw:3,ballCtl:2,drib:1.5,heading:1,kickPow:1,speed:1,accel:1,contact:1,balance:.5,lowPass:.5}};
const PLAYER_PATHS=['name','shirtName','number','gameId','ted','countryId','pos','age','nat','height','weight','foot','style','wfUsage','wfAcc','form','injury','skills','comStyles','playables',...ATTR_KEYS.map(k=>'attrs.'+k),'ovrOverride'];
const TEAM_PATHS=['name','short','country','compId','stadium','manager.name','manager.nat','manager.age','formation','playstyle','colors','emblem','managerPhoto','kits','notes','gameSlot','gameId','efId','tmId','wpTitle'];
const COMP_PATHS=['name','short','gameSlot','gameId','country','type','season','emblem','teams']; // teams: a cup's participating league teams
const NUMERIC=new Set(['gameId','number','age','height','weight','wfUsage','wfAcc','form','injury','manager.age','ovrOverride',...ATTR_KEYS.map(k=>'attrs.'+k)]);
const LABEL={gameSlot:'Replaces in-game team',gameId:'In-game ID',efId:'eFootball team',tmId:'Transfermarkt team',wpTitle:'Wikipedia article',countryId:'Country code',ted:'Game record',src:'Source',name:'Name',shirtName:'Shirt name',number:'Kit no.',pos:'Position',age:'Age',nat:'Nationality',height:'Height (cm)',weight:'Weight (kg)',foot:'Foot',
 style:'Playing style',wfUsage:'Weak foot usage',wfAcc:'Weak foot accuracy',form:'Form',injury:'Injury resistance',skills:'Player skills',comStyles:'COM styles',
 playables:'Playable positions',ovrOverride:'Overall (manual)',short:'Short name',country:'Country',compId:'Competition',stadium:'Stadium','manager.name':'Manager',
 'manager.nat':'Manager nationality','manager.age':'Manager age',formation:'Formation',playstyle:'Team playstyle',colors:'Team colours',emblem:'Emblem',
 managerPhoto:'Manager photo',kits:'Kits',notes:'Notes',gameSlot:'In-game slot',type:'Type',season:'Season',teams:'Participants'};
ATTRS.forEach(([k,l])=>LABEL['attrs.'+k]=l);

/* ================= Utilities ================= */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const uid=()=>Date.now().toString(36).slice(-6)+Math.random().toString(36).slice(2,8);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clone=o=>o==null?o:JSON.parse(JSON.stringify(o));
const getP=(o,p)=>p.split('.').reduce((a,k)=>a==null?undefined:a[k],o);
const setP=(o,p,v)=>{const ks=p.split('.');let a=o;ks.slice(0,-1).forEach(k=>{if(a[k]==null||typeof a[k]!=='object')a[k]={};a=a[k]});a[ks[ks.length-1]]=v};
const fmtDate=t=>t?new Date(t).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'';
const fileSafe=s=>norm(s).replace(/ /g,'_').slice(0,30)||'x';
const isHex=s=>/^#[0-9a-f]{6}$/i.test(String(s||''));
const hexOr=(s,d)=>isHex(s)?s:d;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const kb=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
function sortKeys(v){if(Array.isArray(v))return v.map(sortKeys);if(v&&typeof v==='object'){const o={};Object.keys(v).sort().forEach(k=>o[k]=sortKeys(v[k]));return o}return v}
function canon(v){if(v==null||v==='')return'';if(typeof v==='object'){if(Array.isArray(v)&&!v.length)return'';if(!Array.isArray(v)&&!Object.keys(v).length)return'';return JSON.stringify(sortKeys(v))}return String(v)}
function statCls(v){v=+v;return v>=90?'s90':v>=80?'s80':v>=70?'s70':v>=60?'s60':'s0'}
const statHTML=v=>v==null||v===''?'<span class="muted">–</span>':`<span class="stat ${statCls(v)}">${esc(v)}</span>`;
const posHTML=p=>`<span class="pos p${POS_GROUP(p)}">${esc(p||'?')}</span>`;
function parseLoose(t){
  t=String(t||'').trim();
  const fence=t.match(/```(?:json|svg|xml)?\s*([\s\S]*?)```/i); if(fence)t=fence[1].trim();
  const i=t.search(/[\[{]/); if(i<0)throw new Error('No JSON found in the reply');
  const open=t[i],close=open==='{'?'}':']';const j=t.lastIndexOf(close);
  return JSON.parse(t.slice(i,j+1));
}
function csvParse(text){
  const rows=[];let row=[],f='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;else if(c===','||c===';'&&!text.slice(0,200).includes(',')){row.push(f);f=''}
    else if(c==='\n'){row.push(f);rows.push(row);row=[];f=''}else if(c!=='\r')f+=c}
  if(f!==''||row.length){row.push(f);rows.push(row)}
  return rows.filter(r=>r.some(x=>x.trim()!==''));
}
const csvCell=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};

/* ================= Storage: cloud (db + assets) with local IndexedDB fallback ================= */
const Store={
  mode:'memory',proj:null,assets:null,idb:null,urls:new Map(),mem:new Map(),memBlobs:new Map(),
  timers:new Map(),latest:new Map(),inflight:new Set(),again:new Set(),retries:new Map(),
  // cloud requests run a few at a time: a whole project (1,000+ records) sent at once overwhelms the browser and the server
  slots:6,waiting:[],failToastAt:0,
  async _slot(fn){if(this.slots>0)this.slots--;else await new Promise(r=>this.waiting.push(r));
    try{return await fn()}finally{const next=this.waiting.shift();if(next)next();else this.slots++}},
  async init(){
    const C=window.claude;
    if(C&&C.use){
      try{
        const [db,user,assets]=await Promise.all([C.use('db'),C.use('user'),C.use('assets')]);
        const id=user&&user.id?await user.id():null;
        if(db&&id&&assets){this.proj=db.doc('data/users/'+id+'/pes2021');this.assets=assets;this.mode='cloud';return this.mode}
      }catch(e){console.warn('cloud storage unavailable',e)}
    }
    try{this.idb=await new Promise((res,rej)=>{const r=indexedDB.open('pes21-option-studio',1);r.onupgradeneeded=()=>{r.result.createObjectStore('docs');r.result.createObjectStore('blobs')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});this.mode='local'}
    catch(e){this.mode='memory'}
    return this.mode;
  },
  _tx(store,mode,fn){return new Promise((res,rej)=>{const tx=this.idb.transaction(store,mode);const r=fn(tx.objectStore(store));tx.oncomplete=()=>res(r&&r.result);tx.onerror=()=>rej(tx.error)})},
  async list(col){
    if(this.mode==='cloud'){const snap=await withTimeout(this.proj.collection(col).get(),15000);return snap.docs.map(d=>clone(d.data()))}
    if(this.mode==='local')return (await this._tx('docs','readonly',s=>s.getAll(IDBKeyRange.bound(col+'/',col+'/￿'))))||[];
    return [...this.mem.entries()].filter(([k])=>k.startsWith(col+'/')).map(([,v])=>clone(v));
  },
  rev:0,// goes up with every change to the project: lists worked out from it are kept until it moves
  put(col,obj){this.rev++;const key=col+'/'+obj.id;this.latest.set(key,clone(obj));clearTimeout(this.timers.get(key));this.timers.set(key,setTimeout(()=>this._flush(key,col,obj.id),500));status()},
  async _flush(key,col,id){
    this.timers.delete(key);
    if(this.inflight.has(key)){this.again.add(key);return}
    const obj=this.latest.get(key);if(!obj){status();return}
    this.inflight.add(key);status();
    try{
      if(this.mode==='cloud'){const s=JSON.stringify(obj);if(s.length>250000)throw new Error('This record is too large to save to the cloud ('+kb(s.length)+'). Split the team or remove notes.');await this._slot(()=>this.proj.collection(col).doc(id).set(obj))}
      else if(this.mode==='local')await this._tx('docs','readwrite',s=>s.put(obj,key));
      else this.mem.set(key,obj);
      if(this.latest.get(key)===obj)this.latest.delete(key);this.retries.delete(key);
    }catch(e){
      // a failed save stays pending (so the status and the leave-page warning are true) and is tried again, more slowly each time
      const n=(this.retries.get(key)||0)+1;this.retries.set(key,n);
      // one message at a time, not one per record: they are all retried automatically
      if(e&&e.code==='signed_out')toast(e.message,'err');
      else if(Date.now()-this.failToastAt>30000){this.failToastAt=Date.now();toast('Saving is slow or the connection dropped ('+(e.message||e.code||e)+'). '+this.retries.size+' change'+(this.retries.size===1?' is':'s are')+' retried automatically; keep this page open until the left menu says "All changes saved".','err')}
      if(!this.again.has(key)&&!this.timers.has(key))this.timers.set(key,setTimeout(()=>this._flush(key,col,id),Math.min(60000,2000*2**n)));
    }
    finally{this.inflight.delete(key);if(this.again.delete(key))this._flush(key,col,id);status()}
  },
  async del(col,id){this.rev++;const key=col+'/'+id;clearTimeout(this.timers.get(key));this.timers.delete(key);this.latest.delete(key);this.retries.delete(key);
    try{if(this.mode==='cloud')await this._slot(()=>this.proj.collection(col).doc(id).delete());else if(this.mode==='local')await this._tx('docs','readwrite',s=>s.delete(key));else this.mem.delete(key)}
    catch(e){toast('Could not delete: '+(e.message||e.code),'err')}},
  pending(){return this.timers.size+this.inflight.size+Object.values(S.snaps||{}).filter(s=>s.uploading).length},
  async putBlob(blob,type){
    if(this.mode==='cloud'){const r=await this._slot(()=>this.assets.upload(blob,{type:type||blob.type||'image/png'}));const ref='a:'+r.id;this.urls.set(ref,r.url);return ref}
    const id=uid();const ref='l:'+id;
    if(this.mode==='local')await this._tx('blobs','readwrite',s=>s.put(blob,id));else this.memBlobs.set(id,blob);
    this.urls.set(ref,URL.createObjectURL(blob));return ref;
  },
  url(ref){if(!ref)return'';if(this.urls.has(ref))return this.urls.get(ref);if(ref.startsWith('a:')){const u='/_blob/'+ref.slice(2);this.urls.set(ref,u);return u}return''},
  async preload(ref){if(!ref||this.urls.has(ref)||!ref.startsWith('l:'))return;const b=await this.getBlob(ref);if(b)this.urls.set(ref,URL.createObjectURL(b))},
  async getBlob(ref){
    if(!ref)return null;
    if(ref.startsWith('a:')){const r=await fetch('/_blob/'+ref.slice(2));if(!r.ok)throw new Error('Image file missing ('+r.status+')');return await r.blob()}
    const id=ref.slice(2);if(this.mode==='local')return await this._tx('blobs','readonly',s=>s.get(id));return this.memBlobs.get(id)||null;
  },
  async delBlob(ref){try{if(!ref)return;if(ref.startsWith('a:'))await this.assets.delete(ref.slice(2));else if(this.mode==='local')await this._tx('blobs','readwrite',s=>s.delete(ref.slice(2)));this.urls.delete(ref)}catch(e){console.warn(e)}}
};
function withTimeout(p,ms){return Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('Storage did not answer in time')),ms))])}
function status(){
  const m=$('#st-mode'),s=$('#st-save');if(!m)return;
  const label={cloud:'Saved to '+((window.claude&&window.claude.storageName)||'your Claude account'),local:'Saved in this browser',memory:'Not saved: export backups'}[Store.mode];
  const p=Store.pending();
  m.innerHTML=`<span class="dot ${Store.mode==='memory'?'err':p?'busy':'ok'}"></span><span class="lbl">${label}</span>`;m.title=label+(p?' · saving '+p:'');
  s.textContent=p?'Saving '+p+' change'+(p>1?'s':'')+'…':'All changes saved';
}
window.addEventListener('beforeunload',e=>{if(Store.pending()){e.preventDefault();e.returnValue=''}});

/* ================= State ================= */
// a new season starts every 1 September: 2026/27 runs from 1 Sep 2026 to 31 Aug 2027
function currentSeason(d=new Date()){const y=d.getMonth()>=8?d.getFullYear():d.getFullYear()-1;return y+'/'+String(y+1).slice(2)}
// the season label follows that calendar: on the first load from 1 September it moves to the new season (an older project
// catches up the same way); a label set by hand stays until the next 1 September, because seasonSeen remembers the switch
function rollSeason(){const cur=currentSeason();if(S.settings.seasonSeen===cur)return;const old=String(S.settings.season||'');S.settings.seasonSeen=cur;
  if(!/^\d{4}\/\d{2}$/.test(old)||old<cur){S.settings.season=cur;toast('Season label set to '+cur+'. It moves to the new season every 1 September.','ok')}
  saveSettings()}
const DEFAULT_SETTINGS={id:'main',season:currentSeason(),baseline:null,sizes:{emblem:256,comp:256,kit:2048,manager:256},kitExport:'keep',exports:[],aiTier:'complex',aiWeb:'on'};
const S={teams:{},comps:{},images:{},snaps:{},pending:{},settings:clone(DEFAULT_SETTINGS),snapData:{},
  ui:{view:'overview',teamId:null,teamTab:'squad',teamComp:'',teamQ:'',pf:{q:'',team:'',pos:'',min:'',sort:'ovr',dir:-1,limit:150},sel:new Set(),
      studioTab:'library',libKind:'',cmpA:'baseline',cmpB:'current',cmpTeam:'',cmpQ:'',cmpKinds:{comps:true,teams:true,players:true},h2h:{a:'',b:'',bVer:'current'},
      exp:{only:false,comps:null,teams:null,parts:{emblem:true,comp:true,kit:true,manager:true,sheet:true,csv:true}},build:null,ai:{running:false,log:[]},emblem:null,kit:null}};
const saveTeam=t=>{t.updatedAt=Date.now();S.teams[t.id]=t;Store.put('teams',t);if(window.__onSaveTeam)window.__onSaveTeam(t)};
const saveComp=c=>{c.updatedAt=Date.now();if(window.__beforeSaveComp)window.__beforeSaveComp(c);S.comps[c.id]=c;Store.put('comps',c);if(window.__onSaveComp)window.__onSaveComp(c)};
const saveImage=i=>{S.images[i.id]=i;Store.put('images',i)};
const saveSettings=()=>Store.put('settings',S.settings);
const saveBatch=b=>{S.pending[b.id]=b;Store.put('pending',b);navBadges()};
// sorted once per change to the project (Store.rev), not on every call: the health check asks for it hundreds of times a redraw
const teamsArr=()=>{const M=teamsArr.m;if(M&&M.rev===Store.rev&&M.T===S.teams)return M.v.slice();const v=Object.values(S.teams).sort((a,b)=>(a.name||'').localeCompare(b.name||''));teamsArr.m={rev:Store.rev,T:S.teams,v};return v.slice()};
const compsArr=()=>Object.values(S.comps).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
const allPlayers=()=>teamsArr().flatMap(t=>(t.players||[]).map(p=>({p,t})));
function findPlayer(pid){for(const t of Object.values(S.teams)){const p=(t.players||[]).find(x=>x.id===pid);if(p)return{p,t}}return null}

/* ================= Model ================= */
function newPlayer(o={}){
  const pos=POS.includes(o.pos)?o.pos:'CMF';const attrs={};
  ATTR_KEYS.forEach(k=>attrs[k]=GROUPS_OF(k)==='gk'?(pos==='GK'?65:40):(pos==='GK'?45:60));
  const p={id:uid(),name:'',shirtName:'',number:'',pos,age:'',nat:'',height:'',weight:'',foot:'R',style:'None',wfUsage:2,wfAcc:2,form:4,injury:2,skills:[],comStyles:[],playables:{},attrs,ovrOverride:''};
  return normPlayer(Object.assign(p,o,{attrs:Object.assign(attrs,o.attrs||{})}));
}
function GROUPS_OF(k){return(ATTRS.find(a=>a[0]===k)||[])[2]}
function normPlayer(p){
  if(Array.isArray(p.skills))p.skills=[...new Set(p.skills.map(x=>({'Chop Turn':'Cross Over Turn','Sole Control':'Step On Skill Control'})[x]||x))];
  if(!POS.includes(p.pos))p.pos='CMF';
  ATTR_KEYS.forEach(k=>{let v=Math.round(+p.attrs[k]);p.attrs[k]=isFinite(v)?clamp(v,40,99):50});
  p.wfUsage=clamp(Math.round(+p.wfUsage||2),1,4);p.wfAcc=clamp(Math.round(+p.wfAcc||2),1,4);p.form=clamp(Math.round(+p.form||4),1,8);p.injury=clamp(Math.round(+p.injury||2),1,3);
  p.foot=String(p.foot||'R').toUpperCase().startsWith('L')?'L':'R';
  ['age','height','weight'].forEach(k=>{const v=Math.round(+p[k]);p[k]=isFinite(v)&&v>0?v:''});
  p.number=p.number===''||p.number==null?'':clamp(Math.round(+p.number)||1,1,99);
  p.skills=[...new Set((p.skills||[]).filter(s=>SKILLS.includes(s)))].sort();
  p.comStyles=[...new Set((p.comStyles||[]).filter(s=>COM.includes(s)))].sort();
  if(!STYLES.includes(p.style))p.style='None';
  const pl={};Object.entries(p.playables||{}).forEach(([k,v])=>{if(POS.includes(k)&&k!==p.pos&&['A','B','C'].includes(v))pl[k]=v});p.playables=pl;
  if(!p.shirtName&&p.name)p.shirtName=p.name.split(' ').slice(-1)[0].toUpperCase();
  p.ovrOverride=p.ovrOverride===''||p.ovrOverride==null?'':clamp(Math.round(+p.ovrOverride)||60,40,99);
  return p;
}
function ovr(p){if(!p)return 0;if(p.ovrOverride!==''&&p.ovrOverride!=null)return +p.ovrOverride;const w=W[p.pos]||W.CMF;let s=0,n=0;for(const k in w){s+=w[k]*(+p.attrs[k]||0);n+=w[k]}return Math.round(s/n)}
function newTeam(o={}){return Object.assign({id:uid(),name:'New team',short:'',country:'',compId:'',stadium:'',manager:{name:'',nat:'',age:''},formation:'4-3-3',playstyle:'Possession Game',colors:['#1f4fd1','#ffffff'],emblem:'',managerPhoto:'',kits:[newKit('1st','#1f4fd1','#ffffff'),newKit('2nd','#ffffff','#1f4fd1'),newKit('GK 1st','#1c1c1c','#1c1c1c')],players:[],notes:''},o)}
function newKit(slot,shirt='#ffffff',shorts='#ffffff',socks){return{slot,img:'',shirt,shorts,socks:socks||shorts,second:'#ffffff',numberColor:shirt.toLowerCase()==='#ffffff'?'#111111':'#ffffff',collar:'Crew neck',sponsor:'',design:null}}
function newComp(o={}){return Object.assign({id:uid(),name:'New competition',short:'',gameSlot:'',country:'',type:'League',season:S.settings.season,emblem:''},o)}
/* ----- Export folders (the user, 2026-11-23: everywhere in the system) -----
   Every export lays its files out the same way: a folder per competition, "<competition code> <name>", holding its competition
   file and Logo/, and in it a folder per team, "<team code> <name>", holding its team file and images/<type>/ (emblems, kits,
   manager, stadium, sponsors). The game links files only by the names inside team and competition files, so folders are for
   people; file names never change. Only folders that get a file are made: an export never writes an empty folder. */
const pesFold=x=>String(x||'').replace(/[\\/:*?"<>|\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim().replace(/[. ]+$/,'')||'Unnamed';
const compFolder=c=>c?pesFold(((+c.gameId||+(c.ced&&c.ced.compId))?(+c.gameId||+c.ced.compId)+' ':'')+c.name):'No competition';
const teamFolder=t=>pesFold((+t.gameId&&!t.noCode?t.gameId+' ':'')+t.name);
// a team's folder sits in its league's (a national team's: the World Cup's); written once, never under a cup as well
const teamCompOf=t=>(t&&S.comps[t.compId])||(t&&typeof isNationalTeam==='function'&&isNationalTeam(t)?compsArr().find(x=>x.worldCup):null)||(gameNoLeague(t)?compsArr().find(x=>x.legendsGroup):null)||null;
const IMG_FOLDER={emblem:'emblems',kit:'kits',manager:'manager',stadium:'stadium',sponsor:'sponsors'};
// Teams the game itself keeps in no league: its own legends sides, THE LEGENDS (2703) and THE ICONS (2704), by code, never by
// name (the user, 2026-11-23: "make the system ignore the icons and the legends from teams who are not in a competition").
// They are never listed, counted or offered as teams in no competition; they are shown on their own.
const GAME_NO_LEAGUE=new Set([2703,2704]);
const gameNoLeague=t=>!!t&&!t.noCode&&GAME_NO_LEAGUE.has(+t.gameId);
// a team in no competition, the game's own no-league teams left out
const inNoComp=t=>!!t&&!S.comps[t.compId]&&!gameNoLeague(t);
// a team's short name in the game: exactly 3 capital letters or digits (team file +174)
const SHORT_OK=/^[A-Z0-9]{3}$/;
const shortClean=s=>norm(s).toUpperCase().replace(/ /g,'');
// the fix the health check offers: the current code when it cleans up to 3 characters, otherwise one made from the name
// (Arsenal ARS, Real Madrid RMA, Paris Saint-Germain PSG)
function short3(t){const c=shortClean(t.short);if(c.length===3)return c;
  const w=norm(t.name).toUpperCase().split(' ').filter(x=>x&&!['FC','CF','AFC','SC','AC','THE','DE','CLUB','CD','SD','RC','UD','SL'].includes(x));
  const s=!w.length?shortClean(t.name):w.length>2?w.map(x=>x[0]).join(''):w.length===2?w[0][0]+w[1].slice(0,2):w[0];
  return (s.slice(0,3)||'TEA').padEnd(3,'X')}
function shortName(n){const w=norm(n).toUpperCase().split(' ').filter(x=>!['FC','CF','AFC','SC','AC','THE','DE','CLUB','CD','SD','RC','UD','SL'].includes(x));if(!w.length)return'TEA';return(w.length>1?w.map(x=>x[0]).join('').slice(0,3):w[0].slice(0,3)).padEnd(3,'X')}
function imgName(id){const i=S.images[id];return i?i.name:''}
function compName(id){return S.comps[id]?S.comps[id].name:id?'(missing competition)':'Unassigned'}

/* ----- diffs ----- */
function fmtVal(path,v,ctx){
  if(path==='ted')return v&&v.pid?'game ID '+esc(v.pid):'<span class="muted">—</span>';
  if(v==null||v==='')return'<span class="muted">—</span>';
  if(path==='compId')return esc((ctx&&ctx.comps&&ctx.comps[v]?ctx.comps[v].name:compName(v)));
  if(path==='emblem'||path==='managerPhoto'){const i=S.images[v];return i?`<img class="thumb" style="width:28px;height:28px;vertical-align:middle" src="${esc(Store.url(i.ref))}" alt=""> ${esc(i.name)}`:'image'}
  if(path==='colors'&&Array.isArray(v))return v.map(c=>`<span class="sw" style="background:${esc(hexOr(c,'#000000'))}"></span>`).join(' ');
  if(path==='kits'&&Array.isArray(v))return v.map(k=>`${esc(k.slot)} <span class="sw" style="background:${esc(hexOr(k.shirt,'#000'))}"></span><span class="sw" style="background:${esc(hexOr(k.shorts,'#000'))}"></span>${k.img?' +texture':''}`).join(' · ');
  if(path==='teams'&&Array.isArray(v)){const known=v.filter(id=>S.teams[id]).map(id=>S.teams[id].name),n=v.length-known.length;
    return esc(known.join(', ')+(n?(known.length?' + ':'')+n+' new team'+(n===1?'':'s')+' (in their own batches)':'')||'—')}
  if(path==='playables'&&typeof v==='object')return esc(Object.entries(v).map(([k,x])=>k+':'+x).join(' ')||'—');
  if(Array.isArray(v))return esc(v.join(', ')||'—');
  if(typeof v==='object')return esc(JSON.stringify(v));
  return esc(v);
}
function diffObj(a,b,paths){const out=[];paths.forEach(k=>{const x=getP(a,k),y=getP(b,k);if(canon(x)!==canon(y))out.push({k,from:clone(x),to:clone(y)})});return out}
function diffData(A,B){
  const res={comps:[],teams:[],players:[]};
  const ca=A.comps||{},cb=B.comps||{},ta=A.teams||{},tb=B.teams||{};
  new Set([...Object.keys(ca),...Object.keys(cb)]).forEach(id=>{const a=ca[id],b=cb[id];
    if(!a)res.comps.push({type:'added',id,obj:b});else if(!b)res.comps.push({type:'removed',id,obj:a});
    else{const f=diffObj(a,b,COMP_PATHS);if(f.length)res.comps.push({type:'changed',id,obj:b,fields:f})}});
  new Set([...Object.keys(ta),...Object.keys(tb)]).forEach(id=>{const a=ta[id],b=tb[id];
    if(!a)res.teams.push({type:'added',id,obj:b});else if(!b)res.teams.push({type:'removed',id,obj:a});
    else{const f=diffObj(a,b,TEAM_PATHS);if(f.length)res.teams.push({type:'changed',id,obj:b,fields:f})}});
  const ia=new Map(),ib=new Map();
  Object.values(ta).forEach(t=>(t.players||[]).forEach(p=>ia.set(p.id,{p,t})));
  Object.values(tb).forEach(t=>(t.players||[]).forEach(p=>ib.set(p.id,{p,t})));
  new Set([...ia.keys(),...ib.keys()]).forEach(id=>{const a=ia.get(id),b=ib.get(id);
    if(!a)res.players.push({type:'added',id,p:b.p,tB:b.t});
    else if(!b)res.players.push({type:'removed',id,p:a.p,tA:a.t});
    else{const f=diffObj(a.p,b.p,PLAYER_PATHS);const moved=a.t.id!==b.t.id;
      if(f.length||moved)res.players.push({type:moved?'moved':'changed',id,p:b.p,pA:a.p,tA:a.t,tB:b.t,fields:f,dOvr:ovr(b.p)-ovr(a.p)})}});
  return res;
}
function currentData(){return{teams:S.teams,comps:S.comps,images:S.images}}
function diffCount(d){return d.comps.length+d.teams.length+d.players.length}
function changedTeamIds(d){const s=new Set();d.teams.forEach(x=>s.add(x.id));d.players.forEach(x=>{if(x.tA)s.add(x.tA.id);if(x.tB)s.add(x.tB.id)});return s}

/* ================= UI helpers ================= */
function toast(msg,type){const el=document.createElement('div');el.className='toast '+(type||'');el.textContent=msg;$('#toast').appendChild(el);const box=$('#toast');while(box.children.length>3)box.firstChild.remove();setTimeout(()=>el.remove(),type==='err'?7000:3800)}
function modal(html,wide){const m=$('#modal');m.innerHTML=`<div class="mbox ${wide?'wide':''}" role="dialog" aria-modal="true">${html}</div>`;m.hidden=false;const f=m.querySelector('input,select,textarea,button');if(f)f.focus()}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML='';if(S.ui.onClose){const f=S.ui.onClose;S.ui.onClose=null;f()}}
function ask(title,msg,ok='Confirm',danger=false){return new Promise(res=>{S.ui.askRes=res;modal(`<div class="mhead"><h2>${esc(title)}</h2></div><p>${msg}</p><div class="row end"><button data-act="askNo">Cancel</button><button class="${danger?'danger':'primary'}" data-act="askYes">${esc(ok)}</button></div>`)})}
function inputDialog(title,label,value=''){return new Promise(res=>{S.ui.askRes=res;modal(`<div class="mhead"><h2>${esc(title)}</h2></div><label class="f">${esc(label)}<input id="dlg-in" type="text" value="${esc(value)}"></label><div class="row end" style="margin-top:14px"><button data-act="askNo">Cancel</button><button class="primary" data-act="askInput">OK</button></div>`)})}
function opts(list,sel,labelFn){return list.map(v=>{const val=Array.isArray(v)?v[0]:v,l=Array.isArray(v)?v[1]:labelFn?labelFn(v):v;return`<option value="${esc(val)}" ${String(val)===String(sel)?'selected':''}>${esc(l)}</option>`}).join('')}
function thumb(ref,cls=''){const u=Store.url(ref);return u?`<img class="thumb ${cls}" src="${esc(u)}" alt="">`:`<span class="thumb empty ${cls}">none</span>`}
function imgThumb(id,cls=''){const i=S.images[id];return thumb(i&&i.ref,cls)}
// a health check row (rule book "Health check layout"): the level's dot, the title, the explanation under it, the buttons on the
// right. title and msg are HTML (escape what goes in); o.lead: a tick box or thumbnail before the dot; o.tip: the title's tooltip.
// No "Open" button (the user, 2026-11-23): the title opens its subject. An "Open…" button in acts is taken out and its action put
// on the title; o.subject (a team or competition id) opens that when there is none.
const HC_OPEN_RE=/<button[^>]*data-act="(?:openTeam|openTeamInfo|openTeamImg|editComp|tocComp|tocTeam)"[^>]*>\s*Open[^<]*<\/button>/g;
function hcRow(lv,title,msg,acts,o={}){const L=(typeof HC_SEV!=='undefined'&&HC_SEV[lv])||'';let link=null;
  acts=String(acts||'').replace(HC_OPEN_RE,m=>{if(!link)link=(m.match(/data-[a-z-]+="[^"]*"/g)||[]).join(' ');return ''});
  if(!link&&o.subject){const id=o.subject;if(S.teams[id])link=`data-act="openTeam" data-id="${id}"`;else if(S.comps[id]&&!(typeof compEditLocked==='function'&&compEditLocked(S.comps[id])))link=`data-act="editComp" data-id="${id}"`}
  const t=link?`<button type="button" class="hc-link" ${link} title="Open ${esc(o.tip||'')}">${title}</button>`:title;
  return `<div class="hc-row hc-issue${o.lead?' hc-lead':''}">${o.lead?`<span class="hc-pre">${o.lead}</span>`:''}${lv?`<span class="sev ${lv}" title="${L}"><span class="sr">${L}</span></span>`:'<span></span>'}<span class="hc-main"><span class="who"${o.tip&&!link?` title="${esc(o.tip)}"`:''}>${t}</span>${msg?`<span class="hc-msg">${msg}</span>`:''}</span><span class="acts">${acts}</span></div>`}
const hcMoreRow=(n,btn)=>`<div class="hc-row hc-issue"><span></span><span class="hc-main"><span class="hc-msg">${n} more</span></span><span class="acts">${btn}</span></div>`;
// a team's or competition's image box: with no image in the slot, a slot the option file leaves to the game (ofOwnSlot,
// app-boot.js) shows the "PES default" tag instead of "none". key: emblem, manager, stadium, sp1-3, kit:<0-4>
function slotThumb(o,key,id,cls=''){if(id&&S.images[id])return imgThumb(id,cls);
  if(typeof ofOwnSlot==='function'&&ofOwnSlot(o,key))return `<span class="thumb empty own ${cls}" title="${esc(PES_OWN_TIP)}"><span class="tag t-upd">PES default</span></span>`;
  return imgThumb(id,cls)}
function navBadges(){const n=Object.values(S.pending).reduce((a,b)=>a+(b.items||[]).length,0);const el=$('#nb-review');if(el){el.textContent=n;el.hidden=!n}runDot()}
// a flashing blue dot beside Process and Review while a task (queue job) is running
function runDot(){const run=!!(S.ui.ai&&S.ui.ai.running||Object.values(S.jobs||{}).some(j=>j.status==='running'));const d=$('#nb-run');if(d)d.hidden=!run;
  // the narrow top bar's menu button pulses blue while any progress runs (a task, a queue job or a busy step)
  const mb=$('.tb-menu');if(mb)mb.classList.toggle('running',run||!!(S.ui.ai&&S.ui.ai.busy));
  const st=$('#ai-stats-dot');if(st)st.hidden=!(S.ui.ai&&S.ui.ai.running)}

const ACT={},CH={},IN={};
// every action: async ones show a busy state at once, run once at a time, and ignore repeat clicks until done
const BUSY=new Set(),EXCL=new Map();const nextPaint=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));
const actKey=el=>el.dataset.act+'|'+Object.entries(el.dataset).filter(([k])=>k!=='act').map(([k,v])=>k+'='+v).join('&');
function markBusy(){$$('[data-act]').forEach(el=>{const on=BUSY.has(actKey(el));el.classList.toggle('is-busy',on);if(on){el.setAttribute('aria-busy','true')}else el.removeAttribute('aria-busy')});document.body.classList.toggle('working',BUSY.size>0)}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el||el.disabled)return;const f=ACT[el.dataset.act];if(!f)return;e.preventDefault();
  const key=actKey(el);if(BUSY.has(key))return;
  // while one action is working, other working actions wait their turn (dialogs, Stop and Pause still respond)
  const free=el.closest('#modal')||/^(aiCancel|close|askYes|askNo|askInput|qDel)$/.test(el.dataset.act);
  if(!free&&[...EXCL.values()].some(t=>Date.now()-t<60000)&&(f.constructor&&f.constructor.name==='AsyncFunction')){toast('Still working on the last step…','');return}
  if(f.constructor&&f.constructor.name==='AsyncFunction'){BUSY.add(key);if(!free)EXCL.set(key,Date.now());markBusy();
    (async()=>{try{await nextPaint();await f(el,e)}catch(err){console.error(err);toast('Something went wrong: '+(err.message||err),'err')}finally{BUSY.delete(key);EXCL.delete(key);markBusy()}})();return}
  let r;try{r=f(el,e)}catch(err){console.error(err);toast('Something went wrong: '+(err.message||err),'err');return}
  if(r&&typeof r.then==='function'){BUSY.add(key);markBusy();Promise.resolve(r).catch(err=>{console.error(err);toast('Something went wrong: '+(err.message||err),'err')}).finally(()=>{BUSY.delete(key);markBusy()})}});
document.addEventListener('change',e=>{const el=e.target.closest('[data-ch]');if(el&&CH[el.dataset.ch])CH[el.dataset.ch](el,e)});
document.addEventListener('input',e=>{const el=e.target.closest('[data-in]');if(el&&IN[el.dataset.in])IN[el.dataset.in](el,e)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='dlg-in'){e.preventDefault();ACT.askInput();return}if(e.key==='Escape'&&!$('#modal').hidden){if(S.ui.askRes){const r=S.ui.askRes;S.ui.askRes=null;r(false)}closeModal()}});
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal'){if(S.ui.askRes){const r=S.ui.askRes;S.ui.askRes=null;r(false)}closeModal()}});
ACT.askYes=()=>{const r=S.ui.askRes;S.ui.askRes=null;closeModal();r&&r(true)};
ACT.askNo=()=>{const r=S.ui.askRes;S.ui.askRes=null;closeModal();r&&r(false)};
ACT.askInput=()=>{const v=$('#dlg-in').value;const r=S.ui.askRes;S.ui.askRes=null;closeModal();r&&r(v)};
ACT.close=()=>closeModal();
ACT.go=el=>{location.hash=el.dataset.to};

/* ================= Router ================= */
const VIEWS={};let after=[];
// pages a signed-in non-owner (OPEN_SIGNIN member) doesn't get; the server checks owner features on its own
const OWNER_VIEWS=[];// none for now: Settings is open to everyone until the user decides otherwise
const isMember=()=>!!(window.claude&&window.claude.isMember&&window.claude.isMember());
function memberNav(){const m=isMember();OWNER_VIEWS.forEach(v=>{const a=document.querySelector(`#rail a[data-v="${v}"]`);if(a)a.hidden=m})}
window.addEventListener('studio-me',()=>{memberNav();if(isMember()&&OWNER_VIEWS.includes(location.hash.slice(1)))location.hash='overview'});
// narrow screens: the menu is a drawer opened from the top bar, and the save status and account box sit in the top bar
const RAIL_MQ=window.matchMedia('(max-width:860px)');
ACT.railToggle=()=>{const b=$('.tb-menu');
  if(RAIL_MQ.matches){const o=document.body.classList.toggle('rail-open');if(b)b.setAttribute('aria-expanded',String(o));return}
  const c=document.body.classList.toggle('rail-closed');try{localStorage.setItem('pes21ui.railClosed',c?'1':'0')}catch(e){}if(b)b.setAttribute('aria-expanded',String(!c))};
try{if(localStorage.getItem('pes21ui.railClosed')==='1')document.body.classList.add('rail-closed')}catch(e){}
ACT.railClose=()=>{if(!document.body.classList.contains('rail-open'))return;document.body.classList.remove('rail-open');const b=$('.tb-menu');if(b)b.setAttribute('aria-expanded','false')};
window.addEventListener('hashchange',()=>ACT.railClose());
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('rail-open'))ACT.railClose()});
{const right=$('#tb-right'),mode=$('#st-mode'),acc=$('#st-account');if(right&&mode&&acc){right.append(mode,acc);if(window.claude&&window.claude.refreshAccount)window.claude.refreshAccount()}
  RAIL_MQ.addEventListener('change',()=>ACT.railClose())}
// the left menu's groups remember whether they are open (this browser only)
{const g=document.getElementById('rail-of');if(g){try{if(localStorage.getItem('pes21ui.railOf')==='0')g.open=false}catch(e){}
  g.addEventListener('toggle',()=>{try{localStorage.setItem('pes21ui.railOf',g.open?'1':'0')}catch(e){}})}}
function route(){memberNav();const v=location.hash.slice(1)||'overview';S.ui.view=VIEWS[v]&&!(isMember()&&OWNER_VIEWS.includes(v))?v:'overview';render()}
// nothing is drawn until every script file has loaded and the project is read (boot sets APP_READY)
let APP_READY=false;
function render(){if(!APP_READY)return;
  $$('#rail a').forEach(a=>a.classList.toggle('on',a.dataset.v===S.ui.view));
  $$('#rail details.rail-group').forEach(g=>g.classList.toggle('has-on',!!g.querySelector('a.on')));
  after=[];const main=$('#main');const st=main.scrollTop;
  const SB='.list,.tw,.tree,.log,[style*="overflow:auto"],[style*="overflow-y:auto"]';
  const inner=S.ui.keepScroll?[...main.querySelectorAll(SB)].map(n=>n.id==='gridwrap'?0:n.scrollTop):[];
  main.innerHTML=VIEWS[S.ui.view]();if(typeof BUSY!=='undefined'&&BUSY.size)markBusy();
  after.forEach(f=>{try{f()}catch(e){console.error(e)}});progRender();detApply(main);uiSaveSoon();
  if(S.ui.keepScroll){main.scrollTop=st;if(inner.some(Boolean))main.querySelectorAll(SB).forEach((n,i)=>{if(inner[i]&&n.id!=='gridwrap')n.scrollTop=inner[i]});S.ui.keepScroll=false}
  navBadges();
}
// RR_HOLD > 0 while a bulk action runs: the page is redrawn once at the end instead of after every step
let RR_HOLD=0,RR_PEND=false;
// A page that keeps redrawing itself with nobody touching it locks the browser: each redraw of a big page takes a second or
// more, and a background step that asks for another redraw every time it finishes never lets the page breathe. So redraws
// asked for by the app itself are counted: more than 12 in 8 seconds with no click or key in between and they are held for 10
// seconds, with a message, and what asked for them is kept (pes21ui.loop) so the cause can be found.
const RR_GUARD={t:[],hold:0,told:0};['pointerdown','keydown','wheel','touchstart'].forEach(ev=>document.addEventListener(ev,()=>{RR_GUARD.t.length=0},{capture:true,passive:true}));
function rerender(){if(RR_HOLD){RR_PEND=true;return}const now=Date.now(),G=RR_GUARD;if(now<G.hold)return;G.t=G.t.filter(x=>now-x<8000);G.t.push(now);
  if(G.t.length>12){G.hold=now+10000;G.t.length=0;let who='';try{who=String(new Error().stack||'').split(String.fromCharCode(10)).slice(2,7).map(x=>x.trim()).join(' < ')}catch(e){}
    try{localStorage.setItem('pes21ui.loop',JSON.stringify({at:new Date().toISOString(),view:S.ui.view,who}))}catch(e){}console.warn('redraw loop stopped on',S.ui.view,who);
    if(now-G.told>30000){G.told=now;toast('This page kept redrawing itself, so redrawing is paused for 10 seconds. If it looks out of date, click anything to refresh it.','err')}return}
  S.ui.keepScroll=true;render()}
window.addEventListener('hashchange',()=>{S.ui.keepScroll=false;route();scRestore()});
/* ----- The pages remember how they were left (this browser only; rule book "Pages remember") -----
   Three things are kept and put back, on every page, with nothing for a page to do itself:
   1. its state: the tab, filters, find text and the team that was open (UI_KEEP: the page-state keys of S.ui);
   2. where it was scrolled to, the page and the scrolling boxes inside it;
   3. its collapsible items: all closed until you open one, then as you left them. */
const UIMEM={get(k,d){try{const v=localStorage.getItem('pes21ui.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('pes21ui.'+k,JSON.stringify(v))}catch(e){}}};
const UI_KEEP=['teamId','teamTab','teamComp','teamQ','pf','studioTab','libKind','cmpA','cmpB','cmpTeam','cmpQ','cmpKinds','h2h','codeF','codeTab','codeSub','aiTab','ofTab','hf','mf','ovTab','tq','pq','eq','cq','ctq','spComp',
  'aiTeamComp','aiCompSel','aiCompQ','aiCompMode','aiTeamMode','aiBatchComp','artWhich','kitWhich','kitScope','artScope','artcScope'];
// only small plain values are kept (text, numbers, yes/no, and plain lists or groups of them)
function uiSmall(v,d){if(v==null||typeof v==='boolean'||typeof v==='number')return v;if(typeof v==='string')return v.length<=200?v:undefined;if(d>3||typeof v!=='object')return undefined;
  if(Array.isArray(v)){if(v.length>40)return undefined;const a=v.map(x=>uiSmall(x,d+1));return a.some(x=>x===undefined)?undefined:a}
  if(Object.getPrototypeOf(v)!==Object.prototype)return undefined;const ks=Object.keys(v);if(ks.length>60)return undefined;const o={};for(const k of ks){const x=uiSmall(v[k],d+1);if(x!==undefined)o[k]=x}return o}
let _uiT=0;function uiSaveSoon(){clearTimeout(_uiT);_uiT=setTimeout(()=>{const o={view:S.ui.view};UI_KEEP.forEach(k=>{const x=uiSmall(S.ui[k],0);if(x!==undefined&&x!==null)o[k]=x});UIMEM.set('state',o)},300)}
// once, when the studio opens: the state as it was left; a team or competition that is gone since is dropped
// ?safe in the address opens the Overview with nothing restored: the way back in if a remembered page won't draw
function uiRestore(){if(/[?&]safe/.test(location.search)){if(!location.hash)history.replaceState(null,'',location.pathname+location.search+'#overview');return}const o=UIMEM.get('state',null);if(!o||typeof o!=='object')return;
  UI_KEEP.forEach(k=>{if(!(k in o))return;const cur=S.ui[k],v=o[k];if(cur&&typeof cur==='object'&&!Array.isArray(cur)&&v&&typeof v==='object'&&!Array.isArray(v))Object.assign(cur,v);else S.ui[k]=v});
  if(S.ui.teamId&&!S.teams[S.ui.teamId])S.ui.teamId=null;['teamComp','aiTeamComp','spComp','aiBatchComp'].forEach(k=>{if(S.ui[k]&&!S.comps[S.ui[k]])S.ui[k]=''});
  if(S.ui.cmpTeam&&!S.teams[S.ui.cmpTeam])S.ui.cmpTeam='';if(S.ui.codeF&&S.ui.codeF.comp&&!S.comps[S.ui.codeF.comp])S.ui.codeF.comp='';if(S.ui.pf&&S.ui.pf.team&&!S.teams[S.ui.pf.team])S.ui.pf.team='';
  if(!location.hash&&o.view&&VIEWS[o.view])history.replaceState(null,'','#'+o.view)}
// --- collapsible items: closed unless you opened them. Each is known by its page and its own id or heading (numbers left
// out, since counts change), under the collapsible it sits in, with its place among its like-named neighbours.
let DET=UIMEM.get('open',{});let _detT=0;const detSave=()=>{clearTimeout(_detT);_detT=setTimeout(()=>UIMEM.set('open',DET),300)};
function detKey(d,seen){const ds=d.dataset;if(ds.mk)return ds.mk;const up=d.parentElement&&d.parentElement.closest('details');const base=up&&up.dataset.mk?up.dataset.mk+'>':S.ui.view+'|';
  const own=ds.hk||ds.rk||ds.tocTeam||ds.treeTeam||d.id||(()=>{const h=d.querySelector(':scope>summary');return (h?h.textContent:'').replace(/\d+/g,'#').replace(/\s+/g,' ').trim().slice(0,60)})();
  let k=base+own;const n=(seen.get(k)||0)+1;seen.set(k,n);if(n>1)k+='~'+n;ds.mk=k;return k}
function detApply(root){if(!root||!root.querySelectorAll)return;const seen=new Map();root.querySelectorAll('details').forEach(d=>{if(d.dataset.mk)return;const want=!!DET[detKey(d,seen)];if(d.open!==want)d.open=want})}
document.addEventListener('toggle',e=>{const d=e.target;if(!d||d.tagName!=='DETAILS'||!d.dataset.mk||!d.closest('#main'))return;if(d.open){if(!DET[d.dataset.mk]){DET[d.dataset.mk]=1;detSave()}}else if(DET[d.dataset.mk]){delete DET[d.dataset.mk];detSave()}},true);
// parts of a page filled in later (a team's players in a tree, a list that arrives) get the same treatment
{const m=document.getElementById('main');if(m&&window.MutationObserver)new MutationObserver(L=>{for(const x of L)for(const n of x.addedNodes){if(n.nodeType!==1)continue;if(n.tagName==='DETAILS'&&!n.dataset.mk)detApply(n.parentElement);else if(n.querySelector&&n.querySelector('details:not([data-mk])'))detApply(n)}}).observe(m,{childList:true,subtree:true})}
// --- scroll position, per page (and per team on the Teams page)
const SCB='.list,.tw,.tree,.log,[style*="overflow:auto"],[style*="overflow-y:auto"]';
const scKey=()=>S.ui.view+(S.ui.view==='teams'&&S.ui.teamId?'|'+S.ui.teamId:'');
let SCROLL=UIMEM.get('scroll',{}),_scT=0,_scHold=0,_scUser=false;
function scNote(){if(Date.now()<_scHold&&!_scUser)return;clearTimeout(_scT);_scT=setTimeout(()=>{const m=$('#main');if(!m)return;const inner=[...m.querySelectorAll(SCB)].slice(0,12).map(n=>n.id==='gridwrap'?0:Math.round(n.scrollTop));
  const v={m:Math.round(m.scrollTop)};if(inner.some(Boolean))v.i=inner;if(v.m||v.i)SCROLL[scKey()]=v;else delete SCROLL[scKey()];const ks=Object.keys(SCROLL);if(ks.length>300)ks.slice(0,ks.length-300).forEach(k=>delete SCROLL[k]);UIMEM.set('scroll',SCROLL)},200)}
document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.closest&&t.closest('#main'))scNote()},true);
['wheel','touchmove','keydown','mousedown'].forEach(ev=>document.addEventListener(ev,()=>{_scUser=true},{capture:true,passive:true}));
// put a page back where it was; tried again shortly after, since lists that load a moment later make the page longer
function scRestore(){const k=scKey(),s=SCROLL[k],m=$('#main');if(!m)return;_scUser=false;_scHold=Date.now()+2000;if(!s){m.scrollTop=0;return}
  const go=()=>{if(scKey()!==k||_scUser)return;m.scrollTop=s.m||0;if(s.i){const B=m.querySelectorAll(SCB);s.i.forEach((v,i)=>{if(v&&B[i]&&B[i].id!=='gridwrap')B[i].scrollTop=v})}};go();[120,500,1400].forEach(ms=>setTimeout(go,ms))}

// Every field that names an image (docs/DATABASE_RULES.md, 7.1). unlinkImages clears the ones whose id is in the set,
// so a deleted image never stays linked as crest, kit, manager photo, stadium image, sponsor board or competition emblem.
function unlinkImages(gone){const sp=a=>{const b=(Array.isArray(a)?a:[]).map(x=>gone.has(x)?'':x);return canon(b)!==canon(a||[])?b:null};
  teamsArr().forEach(t=>{let ch=false;['emblem','managerPhoto','stadiumImg'].forEach(k=>{if(t[k]&&gone.has(t[k])){t[k]='';ch=true}});
    (t.kits||[]).forEach(k=>{if(k.img&&gone.has(k.img)){k.img='';ch=true}});const s=sp(t.sponsorImgs);if(s){t.sponsorImgs=s;ch=true}if(ch)saveTeam(t)});
  compsArr().forEach(c=>{let ch=false;if(c.emblem&&gone.has(c.emblem)){c.emblem='';ch=true}const s=sp(c.sponsorImgs);if(s){c.sponsorImgs=s;ch=true}if(ch)saveComp(c)})}
/* ================= Snapshots ================= */
async function takeSnapshot(name,quiet){
  const data={teams:S.teams,comps:S.comps,images:S.images,teds:S.teds,settings:{season:S.settings.season}};
  const json=JSON.stringify(data);
  const sn={id:uid(),name:name||'Snapshot '+fmtDate(Date.now()),createdAt:Date.now(),ref:null,uploading:true,auto:!!quiet,counts:{comps:Object.keys(S.comps).length,teams:Object.keys(S.teams).length,players:allPlayers().length},size:json.length};
  S.snaps[sn.id]=sn;S.snapData[sn.id]=JSON.parse(json);Store.put('snaps',sn);snapUpload(sn,json);snapPrune();
  if(!quiet)toast('Snapshot saved: '+sn.name,'ok');return sn;
}
// snapshot files upload in the background, one at a time, so the button that asked for one isn't held up
let SNAPQ=Promise.resolve();
function snapUpload(sn,json){SNAPQ=SNAPQ.then(async()=>{try{const ref=await withTimeout(Store.putBlob(new Blob([json],{type:'text/plain'}),'text/plain'),180000);
    if(!S.snaps[sn.id]){Store.delBlob(ref);return}sn.ref=ref;delete sn.uploading;Store.put('snaps',sn)}
  catch(e){sn.uploading=false;sn.failed=true;Store.put('snaps',sn);toast('Snapshot "'+sn.name+'" is kept only until you close this page: '+(e.message||e),'err')}finally{status()}})}
function snapPrune(){const auto=Object.values(S.snaps).filter(s=>s.auto&&s.id!==S.settings.baseline).sort((a,b)=>b.createdAt-a.createdAt);
  auto.slice(20).forEach(s=>{if(s.uploading)return;delete S.snaps[s.id];delete S.snapData[s.id];Store.del('snaps',s.id);if(s.ref)Store.delBlob(s.ref)})}
async function loadSnap(id){
  if(S.snapData[id])return S.snapData[id];const sn=S.snaps[id];if(!sn)return null;if(!sn.ref)throw new Error(sn.uploading?'This snapshot was still saving when the page closed and is incomplete':'This snapshot could not be saved');
  const b=await Store.getBlob(sn.ref);if(!b)throw new Error('Snapshot data missing');
  const d=JSON.parse(await b.text());S.snapData[id]=d;return d;
}
function dataFor(key){ // 'current' | 'baseline' | snapId -> data or null (loads async and rerenders)
  if(key==='current')return currentData();
  const id=key==='baseline'?S.settings.baseline:key;if(!id||!S.snaps[id])return null;
  if(S.snapData[id])return S.snapData[id];
  if(!S.ui['loading_'+id]){S.ui['loading_'+id]=true;loadSnap(id).then(()=>rerender()).catch(e=>toast(e.message,'err'))}
  return undefined;
}
