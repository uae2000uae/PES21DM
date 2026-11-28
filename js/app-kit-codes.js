// PES 2021 Option Studio: the settings a kit maker writes on a kit sheet, read on their own after every install.
// The parts are one program in one global scope, loaded in order by index.html.
"use strict";
/* ================= Kit sheets: the game's colour setup and collar, read from every kit image =================
   The user, 2026-11-28: "automatically use and update the color code code in each image when available into the kit color
   setup in the settings for each kit during installation."

   A kit sheet carries the kit's settings for the game's Edit mode as printed text: the collar type, and colours on the
   game's 0 to 63 scale. Kit Man Cal's lettering ("JERSEY: (R) n, (G) n, (B) n") is read by kitCodes (app-images.js). Other
   makers write "COLLAR 6 (PC)" and "41/02/09" beside a swatch, or "56/56/56 - shirt": those are read here with the free
   text reader Tesseract (vendor/tesseract, loaded only when a sheet needs it; nothing leaves the browser).

   Never guessed: the strip is read three times, each prepared differently, and a number is kept only when two readings
   agree. Colours with a label (shirt, jersey, shorts) go to that part. Colours without one are kept in the order written,
   and the first two are taken as shirt and shorts (codes.order says so, and the kit card says so too), but only when no
   reading saw a colour the others did not: otherwise they are listed and not placed (codes.unsure).

   When: on its own, as a job (kitCodes), for every kit whose image has not been read yet (k.codesFor is the image the
   codes were read from). So a kit is read after any install that gives it an image (Add to Option file, Import Option
   File, Live update, the kit store, an upload), and again when its image changes. Numbers typed by hand on the kit card
   (k.codesBy 'hand') are never replaced. Reading saves the kit only: no history entry, nothing in a game file
   (docs/GAME_TESTS.md 33: where a team file holds them is not known). */
const KC_CHUNK=60;let KC_W=null,KC_OFF='',KC_T=0;
async function kcWorker(){if(KC_W)return KC_W;
  if(!window.Tesseract)await new Promise((res,rej)=>{const s=document.createElement('script');s.src='vendor/tesseract/tesseract.min.js';s.onload=res;s.onerror=()=>rej(new Error('the text reader could not be loaded'));document.head.appendChild(s)});
  const u=p=>new URL('vendor/tesseract/'+p,location.href).href;
  const w=await window.Tesseract.createWorker('eng',1,{workerPath:u('worker.min.js'),corePath:u('tesseract-core-simd-lstm.wasm.js'),langPath:u('').replace(/\/$/,''),workerBlobURL:false,gzip:true});
  await w.setParameters({tessedit_pageseg_mode:'6'});return KC_W=w}
async function kcWorkerEnd(){const w=KC_W;KC_W=null;if(w)try{await w.terminate()}catch(e){}}
// the part of the sheet the makers write on (bottom, left and middle), enlarged; grey = stretched to full contrast
function kcStrip(cv,scale,grey){const sw=1300,sh=208,c=document.createElement('canvas');c.width=Math.round(sw*scale);c.height=Math.round(sh*scale);const x=c.getContext('2d',{willReadFrequently:true});
  x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(cv,0,1840,sw,sh,0,0,c.width,c.height);
  if(grey){const d=x.getImageData(0,0,c.width,c.height),a=d.data,n=a.length/4,H=new Uint32Array(256),L=new Uint8Array(n);for(let i=0;i<n;i++){const v=(a[i*4]*299+a[i*4+1]*587+a[i*4+2]*114)/1000|0;L[i]=v;H[v]++}
    let lo=0,hi=255,s=0;for(let v=0;v<256;v++){s+=H[v];if(s>=n*.01){lo=v;break}}s=0;for(let v=255;v>=0;v--){s+=H[v];if(s>=n*.01){hi=v;break}}const k=255/Math.max(1,hi-lo);
    for(let i=0;i<n;i++){const v=Math.max(0,Math.min(255,(L[i]-lo)*k));a[i*4]=a[i*4+1]=a[i*4+2]=v;a[i*4+3]=255}x.putImageData(d,0,0)}
  return c}
// what one reading says: the collar number and where the word stands, and every "n/n/n" with its label and its place
function kcParse(data,scale){const txt=String(data&&data.text||''),W=(data&&data.words)||[],o={collar:null,cx:null,tri:[]};
  const c=txt.match(/C[O0]LLAR[^\dA-Za-z\n]{0,4}(\d{1,3})\b/i);if(c&&+c[1]>=1){o.collar=+c[1];const w=W.find(w=>/^C[O0]LLAR/i.test(w.text||''));if(w&&w.bbox)o.cx=w.bbox.x0/scale}
  const re=/(?<!\d)(\d{1,2})\/(\d{1,2})\/(\d{1,2})(?!\d)(?:[ \t]*-[ \t]*(shirt|jersey|shorts?))?/gi;let m;const used=new Set();
  while((m=re.exec(txt))){const v=[+m[1],+m[2],+m[3]];if(!v.every(n=>n<=63))continue;const raw=m[1]+'/'+m[2]+'/'+m[3],w=W.find(w=>!used.has(w)&&String(w.text||'').includes(raw));if(w)used.add(w);
    o.tri.push({v,x:w&&w.bbox?(w.bbox.x0+Math.max(0,String(w.text).indexOf(raw))*(w.bbox.x1-w.bbox.x0)/Math.max(1,String(w.text).length))/scale:null,lab:m[4]?(/^short/i.test(m[4])?'shorts':'jersey'):''})}return o}
// three readings of the strip; kept: what two of them agree on. Returns {jersey, shorts, collar, colours, order|unsure} or null
async function kcText(cv){const w=await kcWorker();const read=async(scale,grey)=>kcParse((await w.recognize(kcStrip(cv,scale,grey))).data,scale);
  const A=await read(2,true);if(A.collar==null&&!A.tri.length)return null;const R=[A,await read(2,false),await read(3,true)];
  const cc={};R.forEach(r=>{if(r.collar!=null)cc[r.collar]=(cc[r.collar]||0)+1});const collar=+(Object.keys(cc).find(k=>cc[k]>=2)||0)||null;
  const key=t=>t.v.join('/'),n={},lab={};R.forEach(r=>new Set(r.tri.map(key)).forEach(k=>n[k]=(n[k]||0)+1));R.forEach(r=>r.tri.forEach(t=>{if(t.lab&&!lab[key(t)])lab[key(t)]=t.lab}));
  const from=R.map(r=>({r,T:r.tri.filter(t=>n[key(t)]>=2)})).sort((a,b)=>b.T.length-a.T.length)[0],best=from.T;const o={jersey:null,shorts:null,collar,colours:best.map(t=>t.v)};
  best.forEach(t=>{const l=t.lab||lab[key(t)];if(l&&!o[l])o[l]=t.v});
  /* colours without a label are placed by their order (first the shirt, then the shorts) only when the list is surely whole:
     no reading saw a colour the others did not, and the first one stands where the makers start their list, just right of
     the start of the word COLLAR (a first colour that was missed would shift every place). Otherwise they are only listed. */
  if(!o.jersey&&!o.shorts&&o.colours.length){const cx=from.r.cx,x=best[0].x;
    if(R.every(r=>r.tri.length<=best.length)&&cx!=null&&x!=null&&x>=cx-10&&x<=cx+110){o.jersey=o.colours[0];if(o.colours[1])o.shorts=o.colours[1];o.order=true}else o.unsure=true}
  if(!o.colours.length)delete o.colours;return o.jersey||o.shorts||o.collar||o.colours?o:null}
// a sheet's codes: Kit Man Cal's lettering first; the text reader for what that leaves open
async function kcCodes(cv){const a=kitCodes(cv);if(a&&a.jersey&&a.shorts&&a.collar)return a;if(KC_OFF)return a;
  let b=null;try{b=await kcText(cv)}catch(e){KC_OFF=(e&&e.message)||'the text reader failed';console.warn('kit codes',e);return a}
  if(!a)return b;if(!b)return a;const o={jersey:a.jersey||b.jersey,shorts:a.shorts||b.shorts,collar:a.collar||b.collar};if(b.colours)o.colours=b.colours;if(b.order&&!a.jersey&&!a.shorts)o.order=true;if(b.unsure&&!o.jersey&&!o.shorts)o.unsure=true;return o}
// the codes of a stored image (null: none written on it; undefined: the image could not be opened)
async function kcRead(imgId){const rec=S.images[imgId];if(!rec)return undefined;const b=await Store.getBlob(rec.ref);if(!b)return undefined;let bm;try{bm=await createImageBitmap(b)}catch(e){return undefined}
  const c=document.createElement('canvas');c.width=c.height=2048;c.getContext('2d',{willReadFrequently:true}).drawImage(bm,0,0,2048,2048);if(bm.close)bm.close();return kcCodes(c)}
const kcPending=()=>{const out=[];Object.values(S.teams).forEach(t=>(t.kits||[]).forEach((k,i)=>{if(k&&k.img&&S.images[k.img]&&k.codesFor!==k.img)out.push([t.id,i])}));return out};
const kcJob=()=>jobsArr().find(j=>j.type==='kitCodes'&&(j.status==='queued'||j.status==='running'));
// saved without a history entry: what is read is the image's own text, not an edit
const kcSave=t=>{S.teams[t.id]=t;Store.put('teams',t)};
function kcSoon(ms){clearTimeout(KC_T);KC_T=setTimeout(()=>{try{if(KC_OFF||kcJob())return;const n=kcPending().length;if(!n)return;
  queueAdd([{type:'kitCodes',label:'Kit settings written on the kit sheets ('+n+' to read)'}])}catch(e){console.warn('kit codes',e)}},ms==null?4000:ms)}
JOB_RUN.kitCodes=async(j,signal)=>{const P=kcPending();if(!P.length){aiLog('  No kit sheet left to read');return}const part=P.slice(0,KC_CHUNK);progSetTotal(part.length);
  const seen=new Map(),touched=new Map();let got=0,bad=0;aiLog('Reading the settings written on '+part.length+' kit sheet'+(part.length===1?'':'s')+(P.length>part.length?' ('+P.length+' to read in all)':'')+'…');
  try{for(const [tid,i] of part){if(signal&&signal.aborted)break;const t=S.teams[tid],k=t&&t.kits&&t.kits[i];if(!k||!k.img){progStep();continue}const img=k.img;
      if(!seen.has(img)){let cd;try{cd=await kcRead(img)}catch(e){cd=undefined}seen.set(img,cd)}const cd=seen.get(img);
      if(S.teams[tid]===t&&k.img===img){if(cd===undefined)bad++;else if(cd)got++;
        if(k.codesBy!=='hand'){if(cd)k.codes=cd;else delete k.codes}k.codesFor=img;touched.set(tid,t)}
      progStep()}}
  finally{touched.forEach(kcSave)}
  aiLog('  '+got+' of '+part.length+' carry settings'+(bad?'; '+bad+' image'+(bad===1?'':'s')+' could not be opened':'')+(KC_OFF?'. The text reader is not available ('+KC_OFF+'): only Kit Man Cal lettering was read':''));
  if(signal&&signal.aborted)return;if(kcPending().length)kcSoon(300);else{kcWorkerEnd();if(S.ui.view==='teams'||S.ui.view==='studio')rerender()}};
{const _on=window.__onSaveTeam;window.__onSaveTeam=t=>{if(_on)_on(t);if(t&&(t.kits||[]).some(k=>k&&k.img&&k.codesFor!==k.img))kcSoon()}}
setTimeout(()=>{try{kcSoon(6000)}catch(e){}},4000);

// ---- the kit card (Teams → a team → Kits): the colour setup in the game, filled from the sheet, open to typing
function kitSetupHTML(t,k,i){const c=k.codes||{},has=!!(c.jersey||c.shorts||c.collar||c.colours);const rest=c.colours?(c.order?c.colours.slice(2):c.unsure?c.colours:[]):[];
  const n=(f,j,v)=>`<input type="number" min="0" max="${f==='collar'?999:63}" step="1" data-ch="kcEdit" data-i="${i}" data-f="${f}" data-j="${j}" value="${v==null?'':v}" style="width:58px" aria-label="${f==='collar'?'Collar number':(f==='jersey'?'Shirt ':'Shorts ')+'RGB'[j]}">`;
  const sw=a=>`<span style="display:inline-block;width:14px;height:14px;border-radius:3px;border:1px solid var(--line);vertical-align:-3px;background:${a?kitCodeHex(a):'transparent'}"></span>`;
  const rgb=(f,lbl)=>{const a=c[f];return `<div class="row" style="gap:6px;align-items:center;flex-wrap:nowrap">${sw(a)}<span style="width:52px">${lbl}</span>${[0,1,2].map(j=>n(f,j,a?a[j]:null)).join('')}</div>`};
  const src=k.codesBy==='hand'?'Typed by you; the sheet is not read over them.':has?(c.unsure?'Read from the kit sheet. Its colours carry no label and not all of them could be read for sure, so they are listed here and not placed.':c.order?'Read from the kit sheet: it does not say which colour is which, so the first is taken as the shirt and the second as the shorts.':'Read from the kit sheet.')
    :!k.img?'A kit with a sheet is read on its own.':k.codesFor===k.img?'Nothing is written on this kit sheet.':'The sheet is waiting to be read.';
  return `<div class="small" style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px"><b>Colour setup in the game</b> <span class="muted">(Edit mode: red, green, blue, each 0 to 63)</span>
    <div class="grid" style="gap:6px;margin:6px 0">${rgb('jersey','Shirt')}${rgb('shorts','Shorts')}<div class="row" style="gap:6px;align-items:center;flex-wrap:nowrap"><span style="width:14px"></span><span style="width:52px">Collar</span>${n('collar',0,c.collar)}</div></div>
    <span class="muted">${src}</span>${rest.length?` <span class="muted">${c.unsure?'Written':'Also written'}: ${rest.map(a=>sw(a)+' '+a.join('/')).join(', ')}.</span>`:''}
    ${k.img&&(k.codesBy==='hand'||k.codesFor===k.img)?` <button class="sm ghost" data-act="kcAgain" data-i="${i}">Read the sheet again</button>`:''}</div>`}
CH.kcEdit=el=>{const t=S.teams[S.ui.teamId],k=t&&t.kits&&t.kits[+el.dataset.i];if(!k)return;const f=el.dataset.f,c=k.codes=Object.assign({jersey:null,shorts:null,collar:null},k.codes||{});
  const raw=String(el.value).trim(),v=raw===''?null:Math.max(0,Math.min(f==='collar'?999:63,Math.round(+raw)||0));
  if(f==='collar')c.collar=v||null;else{const a=(c[f]||[0,0,0]).slice();a[+el.dataset.j]=v==null?0:v;c[f]=v==null&&a.every(x=>!x)?null:a}
  delete c.order;delete c.unsure;if(!c.jersey&&!c.shorts&&!c.collar&&!c.colours){delete k.codes;delete k.codesBy}else k.codesBy='hand';saveTeam(t);S.ui.keepScroll=true;rerender()};
ACT.kcAgain=el=>{const t=S.teams[S.ui.teamId],k=t&&t.kits&&t.kits[+el.dataset.i];if(!k||!k.img)return;delete k.codesBy;delete k.codesFor;KC_OFF='';kcSave(t);kcSoon(0);toast('Reading the kit sheet: the numbers appear here when it is done','ok');rerender()};
