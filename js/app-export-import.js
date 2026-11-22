// PES 2021 Option Studio, part 4 of 14: Export and import of projects, spreadsheets and image packs; per-tab updates.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= Export ================= */
// Partial Export: nothing is selected to start with. e.it holds the ticked teams, e.ic the ticked competitions (their .ced);
// the filters (search, competition, show) only narrow the list, never the selection.
function scopeState(){const e=S.ui.exp;if(!e.it){e.it=new Set();e.ic=new Set()}if(!e.f)e.f={q:'',comp:'',show:'all'};
  const ck=t=>S.comps[t.compId]?t.compId:'__none';
  e.comps={has:id=>e.ic.has(id)&&!!S.comps[id]};e.teams={has:id=>e.it.has(id)&&!!S.teams[id]};e.ck=ck;return e}
// VIEWS.export: defined near the end of the script ("Partial Export")
function exportScope(){const e=scopeState();return{teams:teamsArr().filter(t=>e.it.has(t.id)),comps:compsArr().filter(c=>e.ic.has(c.id))}}
// the competitions and teams the list shows under the filters
function expVisible(){const e=scopeState(),f=e.f;const q=norm(f.q||'');
  const base=f.show==='changed'?dataFor('baseline'):null;const changed=base?changedTeamIds(diffData(base,currentData())):null;
  const narrowed=!!q||f.show!=='all';
  return [...compsArr().map(c=>[c.id,c.name]),['__none','Unassigned teams']].filter(([id])=>!f.comp||f.comp===id).map(([id,name])=>{
    const all=teamsArr().filter(t=>e.ck(t)===id);const cm=!!q&&norm(name).includes(q);
    const ts=all.filter(t=>(!q||cm||norm(t.name).includes(q))&&(f.show!=='changed'||(changed&&changed.has(t.id)))&&(f.show!=='selected'||e.it.has(t.id))&&(f.show!=='new'||!t.of));
    const show=ts.length>0||(f.show==='selected'&&e.ic.has(id))||(!narrowed&&id!=='__none'&&!!S.comps[id])||(!!q&&cm&&id!=='__none'&&f.show==='all');
    return{id,name,all,ts,show}}).filter(g=>g.show)}
ACT.expAll=el=>{const e=scopeState();if(el.dataset.v==='all'){teamsArr().forEach(t=>e.it.add(t.id));compsArr().forEach(c=>e.ic.add(c.id))}else if(el.dataset.v==='1')expVisible().forEach(g=>g.ts.forEach(t=>e.it.add(t.id)));else{e.it.clear();e.ic.clear()}rerender()};
// a competition's box: its competition file and the teams it shows
ACT.expComp=el=>{const e=scopeState();const id=el.dataset.id;const g=expVisible().find(x=>x.id===id);const ts=g?g.ts:[];
  const on=id==='__none'?!(ts.length&&ts.every(t=>e.it.has(t.id))):!e.ic.has(id);
  if(id!=='__none'){if(on)e.ic.add(id);else e.ic.delete(id)}ts.forEach(t=>on?e.it.add(t.id):e.it.delete(t.id));setTimeout(rerender,0)};
ACT.expTeam=el=>{const e=scopeState();const id=el.dataset.id;if(e.it.has(id))e.it.delete(id);else e.it.add(id);setTimeout(rerender,0)};
IN.expQ=el=>{scopeState().f.q=el.value;clearTimeout(S.ui.eq);S.ui.eq=setTimeout(()=>{rerender();const i=$('[data-in=expQ]');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},250)};
CH.expF=el=>{scopeState().f[el.dataset.k]=el.value;rerender()};
ACT.expPart=el=>{const P=S.ui.exp.parts;const k=el.dataset.k;P[k]=(k==='stadium'||k==='sponsor')?P[k]===false:!P[k];setTimeout(rerender,0)};
CH.kitExport=el=>{S.settings.kitExport=el.value;saveSettings()};
async function imgBlobFor(id,resize){const i=S.images[id];if(!i)return null;let b=await Store.getBlob(i.ref);if(!b)return null;
  if(resize&&(i.w!==resize||i.h!==resize)){const u=URL.createObjectURL(b);const img=await loadImage(u);URL.revokeObjectURL(u);b=await canvasBlob(await fitToCanvas(img,resize,resize,'stretch'))}return b}
ACT.buildPkg=async el=>{
  el.disabled=true;el.textContent='Building…';
  try{
    const {teams,comps}=exportScope();const P=S.ui.exp.parts;const files=[];const used=new Set();const where=[];// where: image file -> instruction
    const uniq=p=>{let x=p,n=2;while(used.has(x.toLowerCase())){x=p.replace(/\.png$/,'_'+n+'.png');n++}used.add(x.toLowerCase());return x};
    const imgMap={};// imageId -> path
    const addImg=async(id,path,what,resize)=>{if(!id||!S.images[id])return;if(imgMap[id]){where.push({file:imgMap[id],what});return}
      try{const b=await imgBlobFor(id,resize);if(!b)return;const p=uniq(path);imgMap[id]=p;files.push({path:p,data:b,size:b.size,include:true,kind:'image'});where.push({file:p,what})}catch(e){toast('Skipped '+imgName(id)+': '+e.message,'err')}};
    for(const c of comps)if(P.comp)await addImg(c.emblem,`WEPES/C_${fileSafe(c.short||c.name).toUpperCase()}.png`,`Competition emblem → ${inGameComp(c)||c.name}`);
    for(const t of teams){const sh=fileSafe(t.short||shortName(t.name)).toUpperCase();
      if(P.emblem)await addImg(t.emblem,`WEPES/E_${sh}_${fileSafe(t.name).slice(0,18)}.png`,`Team emblem → ${t.name}`);
      if(P.kit)for(const k of t.kits||[])await addImg(k.img,`WEPES/K_${sh}_${fileSafe(k.slot)}.png`,`Strip → ${t.name} ${k.slot} (Paste Image)`,S.settings.kitExport==='1024'?1024:0);
      if(P.manager)await addImg(t.managerPhoto,`WEPES/M_${sh}.png`,`Manager photo → ${t.manager&&t.manager.name||t.name}`)}
    const base=dataFor('baseline');const d=base?diffData(base,currentData()):null;
    if(P.sheet){const html=buildSheet(teams,comps,where,d);files.push({path:'PES21_Update_Sheet.html',data:html,size:html.length,include:true,kind:'doc'})}
    if(P.csv){const pc=playersCSV(teams),tc=teamsCSV(teams),cc=compsCSV(comps);files.push({path:'data/players.csv',data:pc,size:pc.length,include:true,kind:'csv'},{path:'data/teams.csv',data:tc,size:tc.length,include:true,kind:'csv'},{path:'data/competitions.csv',data:cc,size:cc.length,include:true,kind:'csv'})}
    const rd=readme(teams,comps);files.push({path:'README.txt',data:rd,size:rd.length,include:true,kind:'doc'});
    S.ui.build={files,teams:teams.length,at:Date.now(),warnings:exportWarnings(teams,comps,P)};rerender();
  }catch(e){toast('Build failed: '+e.message,'err');el.disabled=false;el.textContent='Build package'}
};
function exportWarnings(teams,comps,P){const w=[];
  if(P.emblem){const n=teams.filter(t=>!t.emblem).length;if(n)w.push(n+' team'+(n>1?'s have':' has')+' no emblem')}
  if(P.comp){const n=comps.filter(c=>!c.emblem).length;if(n)w.push(n+' competition'+(n>1?'s have':' has')+' no emblem')}
  if(P.kit){const n=teams.filter(t=>!(t.kits||[]).some(k=>k.img)).length;if(n)w.push(n+' team'+(n>1?'s have':' has')+' no kit textures (colours are still on the sheet)')}
  const big=teams.filter(t=>(t.players||[]).length>40).length;if(big)w.push(big+' team'+(big>1?'s exceed':' exceeds')+' 40 players');
  return w}
function buildView(){const b=S.ui.build;const on=b.files.filter(f=>f.include);const total=on.reduce((a,f)=>a+f.size,0);const imgs=on.filter(f=>f.kind==='image').length;
  return `<h2>Package contents</h2><div class="card hl"><div class="row"><div><b>${on.length} of ${b.files.length} files</b> · ${kb(total)} · ${imgs} images in WEPES</div><span class="spacer"></span>
   <button class="sm" data-act="bfAll" data-v="1">Tick all</button><button class="sm" data-act="bfAll" data-v="0">Untick images</button><button class="gold" data-act="downloadPkg" ${on.length?'':'disabled'}>Download ZIP</button></div>
   ${b.warnings.length?`<div class="warnbox" style="margin-top:10px">${b.warnings.map(esc).join('<br>')}</div>`:''}
   <div class="tw" style="margin-top:10px;max-height:340px"><table><thead><tr><th></th><th>File</th><th>Type</th><th class="num">Size</th></tr></thead><tbody>
   ${b.files.map((f,i)=>`<tr><td><input type="checkbox" data-act="bfOne" data-i="${i}" ${f.include?'checked':''} aria-label="Include ${esc(f.path)}"></td><td>${f.kind==='image'?`<img class="thumb" style="width:26px;height:26px;vertical-align:middle" src="${esc(f.url||(f.url=URL.createObjectURL(f.data)))}" alt=""> `:''}${esc(f.path)}</td><td class="small muted">${f.kind}</td><td class="num small">${kb(f.size)}</td></tr>`).join('')}</tbody></table></div>
   <p class="small muted" style="margin:10px 0 0">Unzip, then copy the <b>WEPES</b> folder to the root of your USB drive. In PES 2021: Edit → Data Management → Import/Export → Import Images.</p></div>`}
ACT.bfOne=el=>{const f=S.ui.build.files[+el.dataset.i];f.include=!f.include;setTimeout(rerender,0)};
ACT.bfAll=el=>{S.ui.build.files.forEach(f=>{if(el.dataset.v==='1')f.include=true;else if(f.kind==='image')f.include=false});rerender()};
ACT.downloadPkg=async el=>{
  if(typeof JSZip==='undefined'){toast('The ZIP library did not load. Check your connection and reload.','err');return}
  const dl=window.claude&&window.claude.use?await window.claude.use('downloads'):null;if(!dl){toast('Downloads aren\'t available here. Open the studio from start.bat or the website.','err');return}
  el.disabled=true;el.textContent='Zipping…';
  try{const z=new JSZip();S.ui.build.files.filter(f=>f.include).forEach(f=>z.file(f.path,f.data,{compression:f.kind==='image'?'STORE':'DEFLATE'}));
    const blob=await z.generateAsync({type:'blob',compression:'DEFLATE'});const name='PES21_Update_'+new Date().toISOString().slice(0,10)+'.zip';
    await dl.save({filename:name,data:blob});S.settings.exports=(S.settings.exports||[]).concat([{at:Date.now(),teams:S.ui.build.teams,files:S.ui.build.files.filter(f=>f.include).length}]).slice(-20);saveSettings();
    const go=await ask('Package saved','Once you have imported and applied it in PES 2021, snapshot your data as the new baseline so the next export only flags new changes. Do it now?','Set new baseline');
    if(go){const sn=await takeSnapshot('Exported '+new Date().toLocaleDateString());S.settings.baseline=sn.id;saveSettings()}rerender();
  }catch(e){if(e&&e.code==='declined')toast('Download cancelled');else toast('Download failed: '+(e.message||e.code),'err')}finally{el.disabled=false;el.textContent='Download ZIP'}
};
function playersCSV(teams){const head=['team','name','shirtName','number','pos','age','nat','height','weight','foot','ovr','style','wfUsage','wfAcc','form','injury','skills','comStyles','playables',...ATTRS.map(a=>a[1])];
  const rows=[head];teams.forEach(t=>(t.players||[]).forEach(p=>rows.push([t.name,p.name,p.shirtName,p.number,p.pos,p.age,p.nat,p.height,p.weight,p.foot,ovr(p),p.style,p.wfUsage,p.wfAcc,p.form,p.injury,p.skills.join('|'),p.comStyles.join('|'),Object.entries(p.playables).map(([k,v])=>k+':'+v).join('|'),...ATTR_KEYS.map(k=>p.attrs[k])])));
  return '﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')}
function teamsCSV(teams){const rows=[['name','short','country','competition','stadium','manager','managerNat','managerAge','formation','playstyle','colour1','colour2','emblem','kits']];
  teams.forEach(t=>rows.push([t.name,t.short,t.country,compName(t.compId),t.stadium,t.manager&&t.manager.name,t.manager&&t.manager.nat,t.manager&&t.manager.age,t.formation,t.playstyle,t.colors&&t.colors[0],t.colors&&t.colors[1],imgName(t.emblem),(t.kits||[]).map(k=>`${k.slot}:${k.shirt}/${k.shorts}/${k.socks}${k.sponsor?' '+k.sponsor:''}`).join(' | ')]));return '﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')}
function compsCSV(comps){const rows=[['name','short','gameSlot','country','type','season','emblem']];comps.forEach(c=>rows.push([c.name,c.short,c.gameSlot,c.country,c.type,c.season,imgName(c.emblem)]));return '﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')}
function readme(teams,comps){return `PES 2021 OPTION STUDIO PACKAGE
Season: ${S.settings.season}
Created: ${new Date().toString()}
Teams: ${teams.length}   Competitions: ${comps.length}

HOW TO IMPORT ON PS5 / PS4
1. Format a USB drive as exFAT (or FAT32).
2. Copy the WEPES folder from this package to the ROOT of the drive (USB:/WEPES/...).
3. Start PES 2021 > Settings > Edit > Data Management > Import/Export > Import Images.
4. Pick the image type (Team Emblem, Competition Emblem, Strip, Manager), select your USB, tick the files, import.
   File names start with: E_ team emblem, C_ competition emblem, K_ kit/strip, M_ manager photo.
5. Open PES21_Update_Sheet.html on your phone or computer. It lists, team by team,
   which image goes where and every name, player and rating change to enter in Edit mode.
6. Save your edit data in-game when finished.

OTHER FILES
data/players.csv, teams.csv, competitions.csv  - spreadsheets of the exported data
`}
function buildSheet(teams,comps,where,d){
  const css=`body{font:15px/1.45 system-ui,sans-serif;margin:0;background:#f4f6fa;color:#111}main{max-width:1000px;margin:auto;padding:20px}h1{font-size:26px;margin:0 0 4px}h2{margin:28px 0 8px;font-size:21px;border-bottom:3px solid #2e9bff;padding-bottom:4px}h3{margin:16px 0 6px;font-size:15px;text-transform:uppercase;letter-spacing:.05em;color:#445}
  table{border-collapse:collapse;width:100%;background:#fff;font-variant-numeric:tabular-nums;font-size:14px}td,th{border:1px solid #d9dee8;padding:4px 6px;text-align:left}th{background:#eef2f8;font-size:12px;text-transform:uppercase}
  .sw{display:inline-block;width:14px;height:14px;border:1px solid #888;border-radius:3px;vertical-align:-2px}.box{background:#fff;border:1px solid #d9dee8;border-radius:8px;padding:12px;margin:8px 0}.chg{color:#0a7d4f}.neg{color:#c0293b}
  label{display:flex;gap:8px;align-items:flex-start;padding:3px 0}input[type=checkbox]{width:18px;height:18px;flex:none;margin-top:2px}.muted{color:#667}.toc a{margin-right:10px}@media print{h2{break-before:page}}`;
  const tdiff=t=>{if(!d)return'';const pl=d.players.filter(x=>(x.tA&&x.tA.id===t.id)||(x.tB&&x.tB.id===t.id));const tf=d.teams.find(x=>x.id===t.id);if(!pl.length&&!tf)return'<p class="muted">No changes since baseline.</p>';
    return `<div class="box">${tf&&tf.fields?tf.fields.map(f=>`<label><input type="checkbox"> ${esc(LABEL[f.k]||f.k)}: ${esc(sheetVal(f.k,f.from))} → <b>${esc(sheetVal(f.k,f.to))}</b></label>`).join(''):tf&&tf.type==='added'?'<label><input type="checkbox"> New team: create or overwrite a team slot with this one</label>':''}
    ${pl.map(x=>x.type==='added'&&x.tB.id===t.id?`<label><input type="checkbox"> <span class="chg">Add</span> <b>${esc(x.p.name)}</b> (${esc(x.p.pos)}, OVR ${ovr(x.p)})</label>`:x.type==='removed'?`<label><input type="checkbox"> <span class="neg">Remove</span> <b>${esc(x.p.name)}</b></label>`:x.type==='moved'?`<label><input type="checkbox"> ${x.tB.id===t.id?'<span class="chg">Sign</span>':'<span class="neg">Transfer out</span>'} <b>${esc(x.p.name)}</b> ${esc(x.tA.name)} → ${esc(x.tB.name)}</label>`:
      x.tB&&x.tB.id===t.id?`<label><input type="checkbox"> <b>${esc(x.p.name)}</b>: ${x.fields.map(f=>`${esc(LABEL[f.k]||f.k)} ${esc(sheetVal(f.k,f.from))}→<b>${esc(sheetVal(f.k,f.to))}</b>`).join(', ')}</label>`:'').join('')}</div>`};
  const tw=t=>where.filter(w=>w.what.includes(t.name));
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PES 2021 Update Sheet ${esc(S.settings.season)}</title><style>${css}</style></head><body><main>
  <h1>PES 2021 Update Sheet</h1><p class="muted">Season ${esc(S.settings.season)} · ${teams.length} teams · ${comps.length} competitions · made ${esc(new Date().toLocaleString())}${d?' · changes shown against your baseline':''}. Tick items as you enter them; ticks are kept on this device.</p>
  <h2>1. Import images</h2><div class="box"><p>USB root → <b>WEPES</b>. In PES 2021: <b>Settings → Edit → Data Management → Import/Export → Import Images</b>. Choose the type, select the files, import. Then assign each one:</p>
  ${where.map(w=>`<label><input type="checkbox"> <code>${esc(w.file.replace('WEPES/',''))}</code> → ${esc(w.what)}</label>`).join('')||'<p class="muted">No images in this package.</p>'}
  <p class="muted">Emblems: Edit → Teams / Competitions → Emblem. Kits: Edit → Teams → Strip → choose kit → Paste Image, then set the colours and collar listed below.</p></div>
  ${comps.length?`<h2>2. Competitions</h2><table><tr><th>✓</th><th>In-game slot</th><th>New name</th><th>Short</th><th>Emblem file</th></tr>${comps.map(c=>`<tr><td><input type="checkbox"></td><td>${esc(inGameComp(c)||'—')}</td><td><b>${esc(c.name)}</b></td><td>${esc(c.short)}</td><td>${esc((where.find(w=>w.what.includes(inGameComp(c)||c.name))||{}).file||'')}</td></tr>`).join('')}</table>`:''}
  <h2>3. Teams</h2><p class="toc">${teams.map(t=>`<a href="#t-${t.id}">${esc(t.name)}</a>`).join('')}</p>
  ${teams.map(t=>{const m=t.manager||{};const ps=(t.players||[]).slice().sort((a,b)=>POS.indexOf(a.pos)-POS.indexOf(b.pos)||ovr(b)-ovr(a));return `<section id="t-${t.id}"><h2>${esc(t.name)} <span class="muted" style="font-size:15px">${esc(t.short)} · ${esc(compName(t.compId))}</span></h2>
   <table><tr><th>Manager</th><td>${esc(m.name)} ${m.nat?'('+esc(m.nat)+')':''} ${m.age?esc(m.age)+' yrs':''}</td><th>Formation</th><td>${esc(t.formation)} · ${esc(t.playstyle)}</td></tr><tr><th>Stadium</th><td>${esc(t.stadium)}</td><th>Colours</th><td>${(t.colors||[]).map(c=>`<span class="sw" style="background:${esc(hexOr(c,'#000'))}"></span> ${esc(c)}`).join(' ')}</td></tr></table>
   <h3>Changes to make</h3>${d?tdiff(t):'<p class="muted">No baseline set: use the full team below.</p>'}
   <h3>Images</h3>${tw(t).map(w=>`<label><input type="checkbox"> <code>${esc(w.file.replace('WEPES/',''))}</code> → ${esc(w.what)}</label>`).join('')||'<p class="muted">None</p>'}
   <h3>Kits</h3><table><tr><th>Slot</th><th>Shirt</th><th>2nd</th><th>Shorts</th><th>Socks</th><th>Numbers</th><th>Collar</th><th>Sponsor</th><th>Texture</th></tr>${(t.kits||[]).map(k=>`<tr><td>${esc(k.slot)}</td>${['shirt','second','shorts','socks','numberColor'].map(c=>`<td><span class="sw" style="background:${esc(hexOr(k[c],'#fff'))}"></span> ${esc(k[c])}</td>`).join('')}<td>${esc(k.collar)}</td><td>${esc(k.sponsor)}</td><td>${esc((where.find(w=>w.what===`Strip → ${t.name} ${k.slot} (Paste Image)`)||{}).file||'—').replace('WEPES/','')}</td></tr>`).join('')}</table>
   <h3>Players (${ps.length})</h3><table><tr><th>✓</th><th>#</th><th>Name</th><th>Shirt</th><th>Pos</th><th>Age</th><th>Nat.</th><th>Ht/Wt</th><th>Foot</th><th>OVR</th><th>Style</th><th>Key ratings</th></tr>
   ${ps.map(p=>`<tr><td><input type="checkbox"></td><td>${esc(p.number)}</td><td><b>${esc(p.name)}</b></td><td>${esc(p.shirtName)}</td><td>${esc(p.pos)}</td><td>${esc(p.age)}</td><td>${esc(p.nat)}</td><td>${esc(p.height)}/${esc(p.weight)}</td><td>${esc(p.foot)}</td><td><b>${ovr(p)}</b></td><td>${esc(p.style)}</td>
   <td style="font-size:12px">${ATTRS.filter(a=>p.pos==='GK'?a[2]==='gk':a[2]!=='gk').map(a=>`${a[1].replace('Awareness','Aw.').replace('Physical ','')} ${p.attrs[a[0]]}`).join(' · ')} · WF ${p.wfUsage}/${p.wfAcc} · Form ${p.form} · Inj ${p.injury}${p.skills.length?' · Skills: '+esc(p.skills.join(', ')):''}${Object.keys(p.playables).length?' · Also: '+esc(Object.entries(p.playables).map(([k,v])=>k+' '+v).join(', ')):''}</td></tr>`).join('')}</table></section>`}).join('')}
  </main><script>try{const K='pes21sheet:'+document.title;const st=JSON.parse(localStorage.getItem(K)||'{}');document.querySelectorAll('input[type=checkbox]').forEach((c,i)=>{c.checked=!!st[i];c.addEventListener('change',()=>{st[i]=c.checked;localStorage.setItem(K,JSON.stringify(st))})})}catch(e){}<\/script></body></html>`;
}
function sheetVal(k,v){if(v==null||v==='')return'—';if(k==='compId')return compName(v);if(k==='emblem'||k==='managerPhoto')return imgName(v)||'image';if(k==='kits'&&Array.isArray(v))return v.map(x=>x.slot+' '+x.shirt+'/'+x.shorts).join(', ');if(k==='playables'&&typeof v==='object')return Object.entries(v).map(([a,b])=>a+':'+b).join(' ')||'—';if(Array.isArray(v))return v.join(', ');if(typeof v==='object')return JSON.stringify(v);return String(v)}

/* ================= Import ================= */
// resolves with null when the file window is closed without a choice, so the button doesn't stay busy
function pickerDone(i,res,val){if(i._done)return;i._done=true;res(val);i.remove()}
function watchPicker(i,res){i.addEventListener('cancel',()=>pickerDone(i,res,null));const f=()=>{window.removeEventListener('focus',f);setTimeout(()=>{if(!i.files||!i.files.length)pickerDone(i,res,null)},1500)};setTimeout(()=>window.addEventListener('focus',f),300)}
function filePicker(accept){return new Promise(res=>{const i=document.createElement('input');i.type='file';i.accept=accept;i.style.display='none';document.body.appendChild(i);i.addEventListener('change',()=>pickerDone(i,res,i.files[0]||null));watchPicker(i,res);i.click()})}
ACT.importPkg=async()=>{const f=await filePicker('.zip,.json,application/json,application/zip');if(!f)return;await importStudioFile(f)};
async function importStudioFile(f,preZip,preData){
  try{let data=preData,zip=preZip||null;
    if(data){}else if(zip||/\.zip$/i.test(f.name)){if(typeof JSZip==='undefined')throw new Error('ZIP library not loaded');zip=zip||await JSZip.loadAsync(f);const jf=zip.file('data/project-backup.json');if(!jf)throw new Error('This ZIP has no data/project-backup.json. Only packages made by this studio can be reopened.');data=JSON.parse(await jf.async('string'))}
    else data=JSON.parse(await f.text());
    if(!data.teams&&!data.comps)throw new Error('Not a studio backup');
    // bring images across: map old image ids to new library entries
    const idMap={};const imgs=data.images||{};
    for(const [oid,meta] of Object.entries(imgs)){if(S.images[oid]){idMap[oid]=oid;continue}
      if(zip&&meta.file&&zip.file(meta.file)){const b=await zip.file(meta.file).async('blob');const rec=await addImageFromBlob(new Blob([b],{type:'image/png'}),meta.kind,meta.name);idMap[oid]=rec.id}}
    const fix=o=>{['emblem','managerPhoto'].forEach(k=>{if(o[k])o[k]=idMap[o[k]]||(S.images[o[k]]?o[k]:'')});(o.kits||[]).forEach(k=>{if(k.img)k.img=idMap[k.img]||(S.images[k.img]?k.img:'')})};
    Object.values(data.teams||{}).forEach(fix);Object.values(data.comps||{}).forEach(fix);
    let b;
    if(data.mode){const m=mergeIncoming(data);const modeLbl={squads:'squads',partial:'update',full:'full update'}[data.mode]||data.mode;
      b=batchFromData({teams:m.teams,comps:m.comps},{title:'Web '+modeLbl+': '+f.name,source:'Update file',removeMissing:data.mode==='squads'||data.mode==='full',teamScope:m.withPlayers});
      if(Array.isArray(data.notes)&&data.notes.length)b.title+=' · '+data.notes.length+' notes';b.notes=Array.isArray(data.notes)?data.notes.slice(0,40).map(String):[];}
    else b=batchFromData({teams:data.teams||{},comps:data.comps||{}},{title:'From '+f.name,source:zip?'Package':'Backup',removeMissing:true,teamScope:Object.keys(data.teams||{})});
    if(!b.items.length){toast(b.kept&&b.kept.length?'Nothing to change. '+b.kept.length+' team'+(b.kept.length===1?'':'s')+' with no players in the file kept as they are: '+b.kept.join(', '):'That file matches your current data','ok');return}finishBatch(b);if(!IMP_CAPTURE)location.hash='review';
  }catch(e){toast('Could not open file: '+e.message,'err')}}
const CSV_ALIAS={name:['name','player','player name','full name'],team:['team','club'],shirtName:['shirtname','shirt name','short name'],number:['number','no','kit number','shirt number'],pos:['pos','position','registered position'],age:['age'],nat:['nat','nationality','country'],height:['height'],weight:['weight'],foot:['foot','strong foot','stronger foot'],style:['style','playing style'],wfUsage:['wfusage','weak foot usage'],wfAcc:['wfacc','weak foot accuracy'],form:['form','condition'],injury:['injury','injury resistance'],skills:['skills','player skills'],comStyles:['comstyles','com styles','com playing styles'],playables:['playables','playable positions'],ovrOverride:['ovr','overall','overall rating','rating']};
ATTRS.forEach(([k,l])=>CSV_ALIAS['attrs.'+k]=[norm(k),norm(l)]);
CSV_ALIAS['attrs.offAw'].push('attacking prowess','offensive awareness');CSV_ALIAS['attrs.defAw'].push('defensive prowess');CSV_ALIAS['attrs.contact'].push('physical contact','body control');
ACT.importCSV=async()=>{const f=await filePicker('.csv,text/csv');if(!f)return;
  try{const rows=csvParse((await f.text()).replace(/^﻿/,''));if(rows.length<2)throw new Error('The file has no data rows');
    const head=rows[0].map(h=>norm(h));const col={};Object.entries(CSV_ALIAS).forEach(([k,al])=>{const i=head.findIndex(h=>al.includes(h));if(i>=0)col[k]=i});
    if(col.name==null||col.team==null)throw new Error('Columns "name" and "team" are required');
    const inc={};const keep=!!(await ask('Overall column',`Use the file's overall column as a manual override? Choose <b>No</b> to let the studio estimate overall from the ratings.`,'Yes, keep it'));
    rows.slice(1).forEach(r=>{const tn=(r[col.team]||'').trim();const pn=(r[col.name]||'').trim();if(!tn||!pn)return;
      const ex=Object.values(S.teams).find(t=>norm(t.name)===norm(tn)||norm(t.short)===norm(tn));const key=ex?ex.id:'new:'+norm(tn);
      if(!inc[key])inc[key]=ex?clone(ex):newTeam({id:key,name:tn,short:shortName(tn),players:[]});if(!ex&&!inc[key].id.startsWith('new:'))inc[key].id=key;
      const t=inc[key];if(!t._csv){t._csv=true;if(ex)t.players=[]}
      const exP=ex&&(ex.players||[]).find(p=>norm(p.name)===norm(pn));const p=exP?clone(exP):newPlayer({name:pn});
      Object.entries(col).forEach(([k,i])=>{if(k==='team')return;let v=(r[i]??'').trim();if(v==='')return;if(k==='ovrOverride'&&!keep)return;
        if(k==='skills'||k==='comStyles')v=v.split(/[|;]/).map(s=>s.trim());else if(k==='playables'){const o={};v.split(/[|;\s]+/).forEach(s=>{const [a,b]=s.split(':');if(a&&b)o[a.toUpperCase()]=b.toUpperCase()});v=o}
        else if(NUMERIC.has(k))v=+v.replace(',','.');setP(p,k,v)});
      t.players.push(normPlayer(p))});
    Object.values(inc).forEach(t=>{delete t._csv;if(t.id.startsWith('new:'))t.id=uid()});
    const teams={};Object.values(inc).forEach(t=>teams[t.id]=t);
    const b=batchFromData({teams,comps:{}},{title:'CSV: '+f.name,source:'CSV',removeMissing:false,teamScope:[]});finishBatch(b);if(!IMP_CAPTURE)location.hash='review';
  }catch(e){toast('CSV import failed: '+e.message,'err')}};

/* ================= Per-tab updates ================= */
const UPD={comps:'Competitions',teams:'Teams',players:'Players',kits:'Logos & kits'};
function updScope(sc){
  if(sc==='comps'){const cs=compsArr();return{n:cs.length,label:cs.length+' competition'+(cs.length===1?'':'s'),comps:cs}}
  if(sc==='teams'||sc==='kits'){let ts=teamsArr();const cf=sc==='teams'?S.ui.teamComp:'';if(cf==='__none')ts=ts.filter(t=>!S.comps[t.compId]);else if(cf)ts=ts.filter(t=>t.compId===cf);
    return{n:ts.length,label:ts.length+' team'+(ts.length===1?'':'s')+(cf?' in '+(cf==='__none'?'Unassigned':compName(cf)):''),teams:ts}}
  const ids=S.ui.sel.size?[...S.ui.sel]:filteredPlayers().slice(0,300).map(r=>r.p.id);
  return{n:ids.length,label:ids.length+(S.ui.sel.size?' selected':' listed')+' player'+(ids.length===1?'':'s'),ids};
}
function updateBar(sc){
  const U=updScope(sc);const run=S.ui.ai.running;const last=S.ui.ai.log.length?S.ui.ai.log[S.ui.ai.log.length-1].replace(/^\S+ \S*\s+/,''):'';
  const what={comps:'teams in each competition (promotions, relegations, new names)',teams:'teams, transfers, managers and kit colours',players:'ratings matched to current form',kits:'kit colours, sponsors and missing emblems'}[sc];
  return `<div class="card" style="margin:0 0 16px;display:grid;gap:8px"><div class="row"><b style="font:700 17px var(--font-display);letter-spacing:.03em">UPDATES</b><span class="small muted">${U.n?`Look for new ${what} · scope: <b>${esc(U.label)}</b>`:`Nothing here yet. Pick the leagues you want and download them from scratch.`}</span></div>
  <div class="row">${S.settings.aiWeb!=='off'?`<button class="primary sm" data-act="updCmd" data-scope="${sc}">${U.n?'Get web-search command':'Download data: web-search command'}</button>`:''}
  <button class="sm" data-act="updClaude" data-scope="${sc}" ${run?'disabled':''}>${U.n?'Quick check with Claude':'Download data: quick build with Claude'}</button>
  <button class="sm" data-act="importPkg">Import update files</button>
  </div>${run||S.ui.ai.last&&S.ui.ai.lastScope===sc?`<div class="row" style="flex-wrap:nowrap"><div class="aiprog-slot" style="flex:1">${progHTML()}</div>${run?'<button class="sm danger" data-act="aiCancel">Stop</button><a class="small" href="#ai">Log</a>':'<a class="small" href="#review">Process and Review</a>'}</div>`:''}</div>`;
}
ACT.updClaude=async el=>{
  const sc=el.dataset.scope;const U=updScope(sc);if(!U.n){starterPicker(sc,'quick');return}const season=S.settings.season;
  const est={comps:U.n,teams:U.n*3,players:Math.ceil(U.n/6),kits:U.n}[sc];
  if(!await ask('Quick check: '+UPD[sc],`Claude will check <b>${esc(U.label)}</b> for season ${esc(season)} from its own football knowledge (about ${est} requests). It can't browse the web, so very recent moves may be missing; use the web-search command for the latest data. Results go to Process and Review.`,'Start'))return;
  S.ui.ai.log=[];S.ui.ai.lastScope=sc;const signal=startAI(sc==='players'?1:U.n);
  try{
    if(sc==='comps'){for(const c of U.comps){if(signal.aborted)break;try{await runCompCheck(c,season,signal)}catch(e){if(e.name==='AbortError')throw e;aiLog(c.name+': '+e.message)}}}
    else if(sc==='teams'){const parts=new Set(['roster','transfers','newStats','bio','manager','kits']);
      for(const t of U.teams){if(signal.aborted)break;try{const inc=await draftTeam(t,parts,season,signal);finishBatch(batchFromData({teams:{[inc.id]:inc},comps:{}},{title:'Claude: '+inc.name+' ('+season+')',source:'Claude',removeMissing:true,teamScope:[inc.id]}))}catch(e){if(e.name==='AbortError')throw e;aiLog(t.name+': '+e.message)}}}
    else if(sc==='players')await runPlayerRatings(U.ids,season,signal);
    else if(sc==='kits'){for(const t of U.teams){if(signal.aborted)break;try{await runKitCheck(t,season,signal)}catch(e){if(e.name==='AbortError')throw e;aiLog(t.name+': '+e.message)}}
      const miss=U.teams.filter(t=>!t.emblem);if(miss.length)aiLog(miss.length+' teams have no emblem: '+miss.map(t=>t.name).join(', ')+'. Upload one, or use "Claude: design an original crest" on the team.')}
    aiLog('Done. Open Process and Review to choose what to apply.');
  }catch(e){aiLog(e.name==='AbortError'?'Stopped.':'Error: '+e.message)}finally{endAI()}
};
async function runCompCheck_(c,season,signal){
  aiLog('Checking teams in '+c.name+'…');const r=await aiJSON(compPrompt(c.name,c.country,season),signal);if(r.knowledgeNote)aiLog('  Note: '+r.knowledgeNote);
  const virt={};const seen=new Set();
  const fresh=[];const cup=isCupComp(c);
  (Array.isArray(r.teams)?r.teams:[]).filter(t=>t&&t.name).forEach(rt=>{const ex=findClub(rt.name);
    if(!ex){fresh.push(newTeam({name:rt.name,short:(rt.short||shortName(rt.name)).toUpperCase().slice(0,3),country:rt.country||c.country,stadium:rt.stadium||'',compId:cup?leagueOf(rt):c.id}));return}
    seen.add(ex.id);if(cup)return;const t=clone(ex);t.compId=c.id;virt[t.id]=t});
  const notes=compUnlisted(c,seen,season);
  const inc=clone(c);inc.season=season;if(cup)inc.teams=cupParticipants(c,[...seen,...fresh.map(t=>t.id)]);if(r.competition&&r.competition.name&&norm(r.competition.name)!==norm(c.name))aiLog('  Claude calls it "'+r.competition.name+'" now; rename it on the Competitions page if you agree.');
  const b=batchFromData({comps:{[c.id]:inc},teams:virt},{title:'Claude: '+c.name+' teams ('+season+')',source:'Claude',removeMissing:false,teamScope:[]});b.notes=notes;finishBatch(b);
  queueNewClubs(fresh,season);
}
/* ----- A league's clubs from the free sources (Health check: Leagues with no teams) -----
   A league is known to the free sources by its country and tier, not by its name (names carry sponsors and change every
   season): eFootball lists the teams of about 35 leagues, the Transfermarkt dataset the top league of about 30 countries.
   lgKey works the country and tier out from the competition's name, else from its country. */
const LG_NAME=[[/play ?offs?|ascenso|supercup|super cup|schaal|shield|trophy|piala|cup|copa|coupe|coppa|pokal|taca/,null],
  [/championship|english 2nd|efl/,'England',2],[/premier league|english league|barclays/,'England',1],
  [/laliga (hypermotion|smartbank|2)|la liga 2|segunda|spanish 2nd/,'Spain',2],[/la ?liga|primera division|spanish league/,'Spain',1],
  [/serie b|italian 2nd/,'Italy',2],[/serie a|lega italia|italian league/,'Italy',1],[/2\.? ?bundesliga/,'Germany',2],[/bundesliga/,'Germany',1],
  [/ligue 2/,'France',2],[/ligue 1/,'France',1],[/eredivisie/,'Netherlands',1],[/liga portugal|liga nos|primeira liga/,'Portugal',1],
  [/super lig/,'Turkey',1],[/scottish|spfl/,'Scotland',1],[/jupiler|belgian/,'Belgium',1],[/3f superliga|danish/,'Denmark',1],[/swiss|raiffeisen/,'Switzerland',1],
  [/brasileirao b|brazilian 2nd/,'Brazil',2],[/brasileirao|brazilian league/,'Brazil',1],[/argentin|liga profesional/,'Argentina',1],[/betplay|colombia/,'Colombia',1],[/chile/,'Chile',1],
  [/usl|american league 2/,'United States',2],[/\bmls\b|major league soccer|american league/,'United States',1],[/\bj2\b/,'Japan',2],[/\bj1\b|j league/,'Japan',1],[/k league|korean/,'South Korea',1],
  [/saudi|roshn/,'Saudi Arabia',1],[/adnoc|uae|arabian gulf league/,'UAE',1],[/\bbri\b|indonesia|liga 1/,'Indonesia',1],[/malaysia/,'Malaysia',1],[/thai/,'Thailand',1],[/botola|morocc/,'Morocco',1],
  [/russia|tinkoff/,'Russia',1],[/eliteserien|norweg/,'Norway',1],[/allsvenskan|swed/,'Sweden',1],[/ekstraklasa|polish/,'Poland',1],[/liga mx|mexic/,'Mexico',1],[/a league|austral/,'Australia',1]];
const LG_COUNTRY={'united arab emirates':'UAE','usa':'United States','us':'United States','korea republic':'South Korea','republic of korea':'South Korea','holland':'Netherlands'};
function lgKey(c){const n=norm(c.name).replace(/-/g,' ');for(const [re,country,tier] of LG_NAME){if(re.test(n))return country?[country,tier]:null}
  const co=String(c.country||'').trim();if(!co)return null;return [LG_COUNTRY[co.toLowerCase()]||co,/(^| )(2|ii|b|second|2nd)( |$)/.test(n)?2:1]}
// eFootball names its leagues generically ("english-2nd-division") or by this season's sponsor ("ligue-2-bkt")
const EF_LG=[[/^english-league/,'England',1],[/^english-2nd/,'England',2],[/^spanish-league/,'Spain',1],[/^spanish-2nd/,'Spain',2],[/lega-italia|^italian-league/,'Italy',1],[/^italian-2nd/,'Italy',2],
  [/ligue-1/,'France',1],[/ligue-2/,'France',2],[/eredivisie/,'Netherlands',1],[/liga-portugal/,'Portugal',1],[/super-lig$/,'Turkey',1],[/scottish/,'Scotland',1],[/^belgian/,'Belgium',1],[/^danish/,'Denmark',1],[/^swiss/,'Switzerland',1],
  [/brazilian-2nd/,'Brazil',2],[/brasileirao/,'Brazil',1],[/^argentine/,'Argentina',1],[/^colombian/,'Colombia',1],[/^chilean/,'Chile',1],[/^american-league-2/,'United States',2],[/^american-league$/,'United States',1],
  [/j2-league/,'Japan',2],[/j1-league/,'Japan',1],[/^korean/,'South Korea',1],[/sealion|^thai/,'Thailand',1],[/malaysia/,'Malaysia',1],[/^moroccan/,'Morocco',1]];
const efLgKey=slug=>{const e=EF_LG.find(x=>x[0].test(slug));return e?[e[1],e[2]]:null};
function compFreeMiss(c,why){aiLog('  '+c.name+': '+why+'. It is listed under "Not found in the free sources" in Process and Review, where you can ask Claude.');freeMissAdd({kind:'comp',teamId:'c:'+c.id,compId:c.id,why})}
async function runCompFree(c,season,signal){jobStage('free');aiLog('Looking for the teams of '+c.name+' in the free sources…');const k=lgKey(c);
  if(!k){compFreeMiss(c,'the free sources don\'t list this competition');return}
  let src='',list=[];const down=[];
  try{const idx=await efIndex(signal);const lg=new Map();idx.teams.forEach(t=>{(lg.get(t.league)||lg.set(t.league,[]).get(t.league)).push(t)});
    for(const [slug,ts] of lg){const e=efLgKey(slug);if(e&&e[0]===k[0]&&e[1]===k[1]){list=ts.map(t=>({name:t.shown||t.name,efId:+t.id}));src='eFootball';break}}}catch(e){if(signal&&signal.aborted)throw e;down.push('eFootball ('+(e.message||e)+')');aiLog('  Could not connect to eFootball: '+(e.message||e))}
  if(!list.length&&k[1]===1){try{const r=await fetch('api/tm/league?country='+encodeURIComponent(k[0]),{signal});if(r.ok){const o=await r.json();list=(o.clubs||[]).map(x=>({name:x.name,stadium:x.stadium||''}));if(list.length)src='Transfermarkt, season '+o.season}else if(r.status!==404)down.push('Transfermarkt (error '+r.status+')')}
    catch(e){if(signal&&signal.aborted)throw e;down.push('Transfermarkt ('+(e.message||e)+')');aiLog('  Could not connect to Transfermarkt: '+(e.message||e))}}
  if(list.length<4){compFreeMiss(c,down.length?'COULD NOT CONNECT to '+down.join(' and ')+', so the league was not looked up there':'the free sources have no team list for '+k[0]+(k[1]===2?', second tier':''));return}
  aiLog('  '+src+' lists '+list.length+' teams');
  const virt={},seen=new Set(),fresh=[];
  list.forEach(rt=>{const ex=(rt.efId&&teamsArr().find(t=>!t.sameAs&&+t.efId===rt.efId))||findClub(rt.name);
    if(!ex){const t=newTeam({name:rt.name,short:shortName(rt.name).toUpperCase().slice(0,3),country:c.country||k[0],stadium:rt.stadium||'',compId:c.id});if(rt.efId)t.efId=rt.efId;fresh.push(t);virt[t.id]=t;return}
    seen.add(ex.id);const t=clone(ex);t.compId=c.id;virt[t.id]=t});
  const notes=compUnlisted(c,seen,season);
  if(fresh.length)notes.push(fresh.length+' team'+(fresh.length===1?' is':'s are')+' new to the project and come'+(fresh.length===1?'s':'')+' in without players: '+fresh.map(t=>t.name).join(', ')+'. After applying, the health check offers Pull from free sources for each.');
  const inc=clone(c);inc.season=season;
  const b=batchFromData({comps:{[c.id]:inc},teams:virt},{title:'Free sources: '+c.name+' teams ('+src+')',source:src,removeMissing:false,teamScope:[]});b.notes=notes;finishBatch(b)}
// a club a source names, matched to the project: same name, else the same core name ("Arsenal FC" = "Arsenal",
// "FC Barcelona" = "Futbol Club Barcelona"); a league club wins over a cup copy of it
function findClub(name){const n=norm(name);const ts=Object.values(S.teams);const league=t=>!isCupComp(S.comps[t.compId]);
  const exact=ts.filter(t=>norm(t.name)===n);if(exact.length)return exact.find(league)||exact[0];
  const core=ts.filter(t=>nameScore(t.name,name)===1);return core.find(league)||core[0]||null}
// a cup never changes a club's league: the clubs it lists join its participants, and none are dropped (see compUnlisted)
function cupParticipants(c,ids){return[...new Set([...(c.teams||[]),...ids])]}
// the league a new cup club plays in, when Claude names one the project has; otherwise the club starts unassigned
function leagueOf(rt){const n=norm(rt.league||'');if(!n)return'';const c=compsArr().find(x=>!isCupComp(x)&&(norm(x.name)===n||nameScore(x.name,rt.league)===1));return c?c.id:''}
// clubs a competition update lists that aren't in the project yet: each becomes a full team job (squad, ratings,
// player details and styles, manager, kits and crest), so the club arrives complete in Process and Review
// (a national team skips "transfers": its players also play for clubs and must stay there)
function queueNewClubs(fresh,season,{national}={}){if(!fresh.length)return;const parts=['roster',...(national?[]:['transfers']),'newStats','bio','styles','manager','kits','crest'];
  queueAdd(fresh.map(t=>({type:'team',virtual:t,parts,season,label:t.name+' (new team)'})),{run:false});
  aiLog('  New to the project, building in full (players, ratings, kits, crest): '+fresh.map(t=>t.name).join(', '))}
// clubs already in a competition that the season's club list leaves out (relegated, renamed or unknown): they are
// recognised and named in the log and the review batch, and kept exactly as they are; PES has no limit on teams per competition
function compUnlisted(c,listedIds,season){const gone=compMembers(c).filter(t=>!listedIds.has(t.id));if(!gone.length)return[];
  const names=gone.map(t=>t.name).join(', ');aiLog('  Not listed in '+c.name+' for '+season+', kept as they are: '+names);
  return[gone.length+' team'+(gone.length===1?'':'s')+' in '+c.name+' not listed for '+season+', kept as they are (PES has no team limit): '+names]}
const runCompCheck=withProg(runCompCheck_),runKitCheck=withProg(runKitCheck_);
async function runKitCheck_(t,season,signal){
  aiLog('Checking kits for '+t.name+'…');
  const r=await aiJSON(`For eFootball PES 2021, give the ${season} kits of ${t.name}${t.country?' ('+t.country+')':''}. Reply with JSON only: {"stadium":"","colors":["#rrggbb","#rrggbb"],"kits":[{"slot":"1st","shirt":"#rrggbb","second":"#rrggbb","shorts":"#rrggbb","socks":"#rrggbb","numberColor":"#rrggbb","collar":"one of ${COLLARS.join(', ')}","sponsor":"main shirt sponsor"}],"knowledgeNote":"how current this is"}. Slots: ${KIT_SLOTS.join(', ')}. Use the most recent kits you know.`,signal);
  if(r.knowledgeNote)aiLog('  Note: '+r.knowledgeNote);
  const inc=clone(t);if(r.stadium)inc.stadium=r.stadium;if(Array.isArray(r.colors)&&r.colors.length>=2&&r.colors.every(isHex))inc.colors=r.colors.slice(0,2);
  (Array.isArray(r.kits)?r.kits:[]).forEach(k=>{if(!KIT_SLOTS.includes(k.slot))return;let ex=inc.kits.find(x=>x.slot===k.slot);if(!ex){ex=newKit(k.slot);inc.kits.push(ex)}
    ['shirt','second','shorts','socks','numberColor'].forEach(c=>{if(isHex(k[c]))ex[c]=k[c]});if(COLLARS.includes(k.collar))ex.collar=k.collar;if(k.sponsor)ex.sponsor=k.sponsor});
  finishBatch(batchFromData({teams:{[inc.id]:inc},comps:{}},{title:'Claude: '+t.name+' kits ('+season+')',source:'Claude',removeMissing:false,teamScope:[]}));
}
/* ----- web-search commands (paste into a Claude chat with web search) ----- */
const ATTR_JSON='"attrs":{'+ATTR_KEYS.map(k=>`"${k}":70`).join(',')+'}';
const RATING_RULES=`PES 2021 rating rules: abilities 40-99 using these keys: ${ATTRS.map(a=>a[0]+' = '+a[1]).join('; ')}. Typical overall: world-class 88-94, elite starters 82-87, solid top-flight starters 75-81, squad players 68-74, youth 55-67. This is one scale for world football, not a scale inside each league: in a league outside Europe's top five, most starters are 62-73, squad players 55-65, and only its few real stars reach 75 or more. Goalkeepers get real GK abilities and low outfield ones. Outfield players keep GK abilities near 40. "wfUsage" and "wfAcc" 1-4, "form" 1-8, "injury" 1-3. "pos" one of ${POS.join(', ')}. "style" one of: ${STYLES.join(', ')}. "skills" only from: ${SKILLS.join(', ')}. "comStyles" only from: ${COM.join(', ')}. "playables" maps extra positions to "A", "B" or "C".`;
// what the game needs of every squad a prompt asks for (rule book, 4: squads, players)
const SQUAD_RULES=`Squad rules (the game rejects a squad that breaks them): the squad as registered after the last transfer window, a player on loan listed at the club he plays for now; shirt numbers 1-99, each used once in a squad; at least 2 goalkeepers; "name" as he is commonly known, 40 characters at most; "shirtName" in capitals, 16 letters at most; a club's "short" code is exactly 3 capital letters and differs from every other club's. Each player appears in one club only.`;
function cmdHeader(what){const d=new Date().toISOString().slice(0,10);return `I play eFootball PES 2021 on PS5 and keep my data in "PES 2021 Option Studio". Please search the web for the latest ${what} (today is ${d}, season ${S.settings.season}). Prefer official club and league sites, then reliable outlets such as Transfermarkt, ESPN or BBC Sport. Use the names exactly as I list them so the file matches my data; give a new name in the "name" field only when a club or competition has officially been renamed.\n\n`}
function cmdFooter(file,mode,extra){return `\n\nOUTPUT: create a JSON file named ${file}-${new Date().toISOString().slice(0,10)}.json and send it to me as a file (not pasted in chat). It must be valid JSON with this top level:\n{"app":"pes21-option-studio","version":1,"mode":"${mode}","season":"${S.settings.season}",${extra},"notes":["anything you could not confirm, one item per line"]}\nKeys like "c1", "t1" are any unique ids you choose. Leave out fields you could not confirm rather than guessing. After the file, list the sources you used.`}
function buildCommand(sc){
  const U=updScope(sc);
  if(sc==='comps'){
    const list=U.comps.map(c=>`- ${c.name}${c.country?' ('+c.country+')':''}, ${c.type}. My clubs now: ${teamsArr().filter(t=>t.compId===c.id).map(t=>t.name).join(', ')||'none yet'}`).join('\n');
    return cmdHeader('line-ups of these competitions')+`SCOPE: ${U.label}\n${list}\n\nFor each competition find every club taking part this season (including promoted clubs and newly qualified clubs for cups), the competition's current official name and short name, and each club's 3-letter code, country and current stadium.`
      +cmdFooter('pes21-competitions','partial',`"comps":{"c1":{"name":"","short":"","country":"","type":"League or Cup","season":""}},"teams":{"t1":{"name":"","short":"ABC","country":"","stadium":"","compId":"c1"}}`)+`\nList EVERY club in each competition under "teams", each with "compId" pointing to its competition. Put relegated or eliminated clubs from my list in "notes".`;
  }
  if(sc==='teams'){
    const list=U.teams.map(t=>`- ${t.name}${S.comps[t.compId]?' ('+S.comps[t.compId].name+')':''}. Manager: ${t.manager&&t.manager.name||'?'}. My squad: ${(t.players||[]).map(p=>p.name+' ('+p.pos+')').join(', ')||'empty'}`).join('\n');
    return cmdHeader('squads, transfers and managers for these teams')+`SCOPE: ${U.label}\n${list}\n\nFor each team find the current first-team squad (normally 23-32 players): arrivals and departures since my list, shirt numbers, positions, ages, nationality, height (cm), weight (kg) and stronger foot. Also the current manager (name, nationality, age), usual formation (one of ${FORMATIONS.join(', ')}), team playstyle (one of ${PLAYSTYLES.join(', ')}) and stadium.\nFor players who are NEW to my data, also estimate PES 2021 ratings from their current level. Players already in my list need no ratings.\n${RATING_RULES}`
      +cmdFooter('pes21-squads','squads',`"teams":{"t1":{"name":"","stadium":"","formation":"4-3-3","playstyle":"","manager":{"name":"","nat":"","age":0},"players":[{"name":"","shirtName":"","number":10,"pos":"CF","age":25,"nat":"","height":180,"weight":75,"foot":"R",${ATTR_JSON},"wfUsage":2,"wfAcc":2,"form":5,"injury":2,"style":"","skills":[],"comStyles":[],"playables":{}}]}}`)+`\nIMPORTANT: each team's "players" must be the FULL current squad, because players I have that are missing from it will be treated as departures. Use the exact player spellings from my list for players who are still there.`;
  }
  if(sc==='players'){
    const byT={};U.ids.map(findPlayer).filter(Boolean).forEach(({p,t})=>(byT[t.name]=byT[t.name]||[]).push(`${p.name} (${p.pos}, age ${p.age||'?'}, now OVR ${ovr(p)})`));
    const list=Object.entries(byT).map(([t,ps])=>`- ${t}: ${ps.join('; ')}`).join('\n');
    return cmdHeader('form and level of these players')+`SCOPE: ${U.label}\n${list}\n\nFor each player, check their current real-world level (this season's performances, minutes, international caps, recent ratings in current football games or stats sites) and convert it into PES 2021 ratings. Also note any player who has moved club (put the new club as the team).\n${RATING_RULES}`
      +cmdFooter('pes21-ratings','partial',`"teams":{"t1":{"name":"team name exactly as listed","players":[{"name":"","pos":"CF","age":25,${ATTR_JSON},"wfUsage":2,"wfAcc":2,"form":5,"injury":2,"style":"","skills":[],"comStyles":[],"playables":{}}]}}`)+`\nInclude only the players I listed.`;
  }
  const list=U.teams.map(t=>`- ${t.name}: kits ${(t.kits||[]).map(k=>k.slot).join(', ')||'none'}; emblem ${t.emblem?'yes':'MISSING'}`).join('\n');
  return cmdHeader('kits of these teams')+`SCOPE: ${U.label}\n${list}\n\nFor each team find this season's kits (1st, 2nd, 3rd and goalkeeper kits where they exist): main shirt colour, second colour or pattern colour, shorts, socks, number colour, collar style (one of ${COLLARS.join(', ')}) and main shirt sponsor. Also the two main club colours. For teams marked emblem MISSING, add a note with the link to the official club page where the current crest is shown.`
    +cmdFooter('pes21-kits','partial',`"teams":{"t1":{"name":"","colors":["#rrggbb","#rrggbb"],"kits":[{"slot":"1st","shirt":"#rrggbb","second":"#rrggbb","shorts":"#rrggbb","socks":"#rrggbb","numberColor":"#rrggbb","collar":"","sponsor":""}]}}`)+`\nColours must be 6-digit hex codes. Slots must be one of: ${KIT_SLOTS.join(', ')}.`;
}
ACT.updCmd=el=>{const sc=el.dataset.scope;const U=updScope(sc);if(!U.n){starterPicker(sc,'cmd');return}showCommand(sc,U.label,buildCommand(sc))};
function showCommand(sc,label,txt){const U={label};S.ui.cmdText=txt;
  modal(`<div class="mhead"><h2>Web-search command · ${esc(UPD[sc])}</h2></div>
  <p class="small">Scope: <b>${esc(U.label)}</b>${sc==='teams'?' (change it with the competition filter)':sc==='players'?' (select players or filter the list to change it)':''}. ${txt.length>30000?'<span style="color:var(--warn)">This command is long; consider a smaller scope.</span>':''}</p>
  <ol class="small" style="margin:0 0 10px;padding-left:18px"><li>Copy the command and paste it into a Claude chat with web search on.</li><li>Claude searches the web and sends back a <b>.json</b> update file. Download it.</li><li>Click <b>Import update files</b> on this page. Every change lands in Process and Review for you to tick or edit.</li></ol>
  <textarea id="cmd-text" readonly style="min-height:300px;font:12.5px/1.45 ui-monospace,Menlo,monospace">${esc(txt)}</textarea>
  <div class="row end" style="margin-top:12px"><button data-act="close">Close</button><button data-act="importPkg">Import update files</button><button class="primary" data-act="copyCmd">Copy command</button></div>`,true)}
/* ----- starting from an empty project ----- */
function starterPicker(sc,how){
  S.ui.starter={sc,how};const big=sc==='teams'||sc==='players';
  modal(`<div class="mhead"><h2>Which leagues do you want?</h2></div>
  <p class="small">Your project has no ${sc==='comps'?'competitions':sc==='players'?'players':'teams'} yet, so pick where to start. ${how==='cmd'?'You get a web-search command for a Claude chat; it returns a file you import here.':'Claude drafts them from its own knowledge (no web), and the results go to Process and Review.'}
  ${big?' Full teams with ratings are large: start with one or two leagues and add more later.':''}</p>
  <div class="grid g3" style="gap:4px 12px;margin:10px 0">${COMP_TEMPLATES.map((t,i)=>`<label class="c small"><input type="checkbox" class="st-l" value="${i}"> ${esc(t[0])} <span class="muted">${esc(t[1])}</span></label>`).join('')}</div>
  <label class="f">Other leagues (one per line, e.g. "Qatar Stars League, Qatar")<textarea id="st-other" style="min-height:60px"></textarea></label>
  ${how==='quick'&&big?'<label class="c small" style="margin-top:8px"><input type="checkbox" id="st-stats" checked> Include player ratings (slower)</label>':''}
  <div class="row end" style="margin-top:14px"><button data-act="close">Cancel</button><button class="primary" data-act="starterGo">${how==='cmd'?'Build command':'Start download'}</button></div>`,true)}
function starterLeagues(){const l=$$('.st-l').filter(c=>c.checked).map(c=>{const t=COMP_TEMPLATES[+c.value];return{name:t[0],country:t[1],type:t[2]}});
  ($('#st-other').value||'').split('\n').map(x=>x.trim()).filter(Boolean).forEach(x=>{const [n,c]=x.split(',').map(y=>y.trim());l.push({name:n,country:c||'',type:/cup|champions|league elite|europa/i.test(n)?'Cup':'League'})});return l}
ACT.starterGo=async()=>{
  const {sc,how}=S.ui.starter;const leagues=starterLeagues();if(!leagues.length){toast('Pick at least one league','err');return}
  const stats=$('#st-stats')?$('#st-stats').checked:true;closeModal();const season=S.settings.season;
  if(how==='cmd'){showCommand(sc,leagues.map(l=>l.name).join(', '),starterCommand(sc,leagues));return}
  S.ui.ai.log=[];S.ui.ai.lastScope=sc;const signal=startAI(leagues.length);const squads=sc==='teams'||sc==='players';
  try{for(const l of leagues){if(signal.aborted)break;try{await buildCompAI(l.name,l.country,season,squads,stats,signal)}catch(e){if(e.name==='AbortError')throw e;aiLog(l.name+': '+e.message)}}
    if(sc==='kits'){aiLog('Teams are in Process and Review. Apply them, then run "Quick check with Claude" here again to fetch their kits.')}
    aiLog('Done. Open Process and Review to choose what to apply.')}
  catch(e){aiLog(e.name==='AbortError'?'Stopped.':'Error: '+e.message)}finally{endAI()}
};
function starterCommand(sc,leagues){
  const list=leagues.map((l,i)=>`- c${i+1}: ${l.name}${l.country?' ('+l.country+')':''}, ${l.type}`).join('\n');
  const compJSON=`"comps":{"c1":{"name":"official name","short":"","country":"","type":"League or Cup","season":"${S.settings.season}"}}`;
  if(sc==='comps')return cmdHeader('club line-ups of these competitions')+`COMPETITIONS:\n${list}\n\nFor each competition give its current official name and short name, and EVERY club taking part this season with its 3-letter code, country and current stadium.`
    +cmdFooter('pes21-competitions','partial',compJSON+`,"teams":{"t1":{"name":"","short":"ABC","country":"","stadium":"","compId":"c1"}}`)+`\nEach club's "compId" must point to its competition key (c1, c2 …).`;
  if(sc==='kits')return cmdHeader('clubs and kits of these competitions')+`COMPETITIONS:\n${list}\n\nFor each competition list EVERY club taking part this season (3-letter code, country, stadium, two main club colours) and this season's kits: 1st, 2nd, 3rd and goalkeeper kits where they exist, with shirt colour, second/pattern colour, shorts, socks, number colour, collar style (one of ${COLLARS.join(', ')}) and main shirt sponsor. In "notes", give the link to each club's official crest page.`
    +cmdFooter('pes21-kits','partial',compJSON+`,"teams":{"t1":{"name":"","short":"ABC","country":"","stadium":"","compId":"c1","colors":["#rrggbb","#rrggbb"],"kits":[{"slot":"1st","shirt":"#rrggbb","second":"#rrggbb","shorts":"#rrggbb","socks":"#rrggbb","numberColor":"#rrggbb","collar":"","sponsor":""}]}}`)+`\nColours must be 6-digit hex codes. Slots: ${KIT_SLOTS.join(', ')}.`;
  return cmdHeader('clubs, squads and player levels of these competitions')+`COMPETITIONS:\n${list}\n\nFor each competition list EVERY club taking part this season (3-letter code, country, stadium, manager with nationality and age, usual formation from ${FORMATIONS.join(', ')}, team playstyle from ${PLAYSTYLES.join(', ')}) and its full current first-team squad (23-32 players) with shirt number, position, age, nationality, height (cm), weight (kg), stronger foot, and PES 2021 ratings estimated from each player's current real-world level.\n${RATING_RULES}\nThis is a big file: build it with code if needed, and work league by league. If it gets too large, finish the first competition and tell me to ask for the rest.`
    +cmdFooter('pes21-squads','squads',compJSON+`,"teams":{"t1":{"name":"","short":"ABC","country":"","stadium":"","compId":"c1","formation":"4-3-3","playstyle":"","manager":{"name":"","nat":"","age":0},"players":[{"name":"","shirtName":"","number":10,"pos":"CF","age":25,"nat":"","height":180,"weight":75,"foot":"R",${ATTR_JSON},"wfUsage":2,"wfAcc":2,"form":5,"injury":2,"style":"","skills":[],"comStyles":[],"playables":{}}]}}`);
}
ACT.copyCmd=async()=>{try{await navigator.clipboard.writeText(S.ui.cmdText);toast('Command copied','ok')}catch(e){const t=$('#cmd-text');t.focus();t.select();toast('Press Ctrl/Cmd+C to copy the selected text')}};
function mergeIncoming(data){
  const has=v=>v!==undefined&&v!==null&&v!=='';const compMap={};const comps={};
  Object.entries(data.comps||{}).forEach(([k,c])=>{if(!c||!c.name&&!S.comps[c.id||k])return;const ex=S.comps[c.id||k]||Object.values(S.comps).find(x=>norm(x.name)===norm(c.name));
    const m=ex?clone(ex):newComp({id:uid()});COMP_PATHS.forEach(f=>{if(f!=='emblem'&&f!=='teams'&&has(c[f]))m[f]=String(c[f])});if(!['League','Cup'].includes(m.type))m.type='League';compMap[k]=m.id;if(c.id)compMap[c.id]=m.id;comps[m.id]=m});
  const findComp=id=>compMap[id]||(S.comps[id]?id:(Object.values(S.comps).find(x=>norm(x.name)===norm(id))||{}).id||'');
  const teams={};const withPlayers=[];
  const gName=new Map();Object.values(S.teams).filter(t=>!isNationalTeam(t)).forEach(t=>(t.players||[]).forEach(p=>{const n=norm(p.name);gName.set(n,gName.has(n)?null:p)})); // team players only (see batchFromData)
  Object.entries(data.teams||{}).forEach(([k,t])=>{if(!t||!t.name&&!S.teams[t.id||k])return;
    const ex=S.teams[t.id||k]||Object.values(S.teams).find(x=>norm(x.name)===norm(t.name));
    const m=ex?clone(ex):newTeam({id:uid(),name:t.name,short:shortName(t.name),players:[]});
    ['name','country','stadium','formation','playstyle','notes'].forEach(f=>{if(has(t[f]))m[f]=String(t[f])});
    if(has(t.short))m.short=String(t.short).toUpperCase().slice(0,3);if(!FORMATIONS.includes(m.formation))m.formation='4-3-3';if(!PLAYSTYLES.includes(m.playstyle))m.playstyle='Possession Game';
    if(t.manager&&typeof t.manager==='object'){m.manager=m.manager||{};['name','nat'].forEach(f=>{if(has(t.manager[f]))m.manager[f]=String(t.manager[f])});if(isFinite(+t.manager.age)&&+t.manager.age>0)m.manager.age=+t.manager.age}
    if(has(t.compId))m.compId=findComp(t.compId);
    if(Array.isArray(t.colors)&&t.colors.length>=2&&t.colors.slice(0,2).every(isHex))m.colors=t.colors.slice(0,2);
    if(Array.isArray(t.kits))t.kits.forEach(kk=>{if(!kk||!KIT_SLOTS.includes(kk.slot))return;let x=m.kits.find(y=>y.slot===kk.slot);if(!x){x=newKit(kk.slot);m.kits.push(x)}
      ['shirt','second','shorts','socks','numberColor'].forEach(c=>{if(isHex(kk[c]))x[c]=kk[c]});if(COLLARS.includes(kk.collar))x.collar=kk.collar;if(has(kk.sponsor))x.sponsor=String(kk.sponsor);if(kk.img)x.img=kk.img});
    if(Array.isArray(t.players)){withPlayers.push(m.id);
      const nat=ex?isNationalTeam(ex):isNationalComp(S.comps[m.compId]);
      m.players=t.players.filter(ip=>ip&&ip.name).map(ip=>{const n=norm(ip.name);const base=(ex&&(ex.players||[]).find(p=>norm(p.name)===n))||(nat?null:gName.get(n))||null;
        const p=base?clone(base):newPlayer({name:ip.name,pos:ip.pos});
        ['name','shirtName','nat','foot','style'].forEach(f=>{if(has(ip[f]))p[f]=String(ip[f])});if(POS.includes(ip.pos))p.pos=ip.pos;
        ['number','age','height','weight','wfUsage','wfAcc','form','injury'].forEach(f=>{if(has(ip[f])&&isFinite(+ip[f]))p[f]=+ip[f]});
        if(ip.attrs&&typeof ip.attrs==='object')ATTR_KEYS.forEach(a=>{if(has(ip.attrs[a])&&isFinite(+ip.attrs[a]))p.attrs[a]=+ip.attrs[a]});
        ['skills','comStyles'].forEach(f=>{if(Array.isArray(ip[f]))p[f]=ip[f].map(String)});if(ip.playables&&typeof ip.playables==='object')p.playables=ip.playables;
        return normPlayer(p)});}
    else m.players=[];
    teams[m.id]=m});
  return{teams,comps,withPlayers};
}

/* ================= Import downloaded files (spreadsheets, logo/kit packs, ZIPs, folders) ================= */
const IMP_STOP=new Set(['association','associazione','sportiva','sportivo','sports','gmbh','kgaa','ev','spa','sa','ltd','plc','fc','cf','sc','ac','afc','club','clube','football','futbol','futebol','calcio','de','da','do','del','the','sk','fk','sv','cd','sd','ud','rc','rcd','ss','ssc','us','as','ca','kv','krc','vv','bk','if','ff','jk','sad','tsg','vfl','vfb','logo','emblem','badge','crest','png','svg','team','official','kit','kits','home','away','third','gk','goalkeeper','strip','shirt','jersey','uniform','1st','2nd','3rd','first','second','manager','coach','photo']);
function coreTokens(s){return norm(String(s||'').replace(/\.[a-z0-9]{2,4}$/i,'').replace(/(^|[^A-Za-z])((?:[A-Za-z]\.){2,})/g,(m,a,b)=>a+b.replace(/\./g,'')+' ')).split(' ').filter(w=>w&&!IMP_STOP.has(w)&&!/^\d{2,}$/.test(w))}
function nameScore(a,b){const A=coreTokens(a),B=coreTokens(b);if(!A.length||!B.length)return 0;if(A.join(' ')===B.join(' '))return 1;
  const sb=new Set(B);let hit=0;new Set(A).forEach(w=>{if(sb.has(w))hit++});const j=hit/new Set([...A,...B]).size;
  // one name fully inside the other ("Roma" in "AS Roma Associazione Sportiva") counts as a good match when it has a distinctive word
  const small=new Set(A.length<=B.length?A:B),big=new Set(A.length<=B.length?B:A);const contained=small.size>=2&&[...small].every(w=>big.has(w));
  return contained?Math.max(j,0.58):j}
let IMP_TCACHE=new Map();
function matchTeam(name,hintComp){if(!name)return null;const key=norm(name)+'|'+(hintComp||'');if(IMP_TCACHE.has(key))return IMP_TCACHE.get(key);
  let best=null,bs=0;for(const t of Object.values(S.teams)){let sc=nameScore(name,t.name);if(sc<0.6)continue;
    const c=S.comps[t.compId];if(hintComp&&c&&nameScore(hintComp,c.name)>=0.5)sc+=0.3;else if(c&&c.type==='League')sc+=0.05;if((t.players||[]).length)sc+=0.02;
    if(sc>bs){bs=sc;best=t}}
  IMP_TCACHE.set(key,best);return best}
function matchComp(name){let best=null,bs=0;Object.values(S.comps).forEach(c=>{const sc=Math.max(nameScore(name,c.name),nameScore(name,c.gameSlot||''));if(sc>=0.6&&sc>bs){bs=sc;best=c}});return best}
const IMP_FIELDS={
 name:['long name','full name','player name','name','player','known as','short name'],
 team:['club name','current club name','team','club','squad','team name','current club'],
 clubId:['current club id'], comp:['league name','league','competition','current club domestic competition id'],
 pos:['sub position','player positions','registered position','best position','position','positions','pos'],
 age:['age'],dob:['date of birth','dob','birth date','birthday','born'],
 nat:['nationality name','nationality','nation','country of citizenship','citizenship','country'],
 height:['height in cm','height cm','height'],weight:['weight kg','weight in kg','weight'],
 foot:['preferred foot','foot','strong foot','stronger foot'],number:['club jersey number','jersey number','shirt number','kit number','number','no'],
 shirtName:['shirt name','shirtname'],ovr:['overall','ovr','overall rating','rating'],value:['market value in eur','market value','value eur','value'],
 wf:['weak foot','weakfoot','weak foot accuracy','wfacc','wf'],season:['last season','fifa version','season']};
const IMP_FIELD_LABEL={name:'Player name',team:'Team',clubId:'Team id',comp:'League',pos:'Position',age:'Age',dob:'Date of birth',nat:'Nationality',height:'Height',weight:'Weight',foot:'Foot',number:'Shirt number',shirtName:'Shirt name',ovr:'Overall',value:'Market value',wf:'Weak foot',season:'Season / version'};
// PES-style direct columns, then EA FC (sofifa / EA site) columns averaged where PES merges two stats
const EA_SRC={offAw:[['positioning','attacking positioning','att position']],ballCtl:[['ball control','skill ball control']],drib:[['dribbling','skill dribbling']],
 tight:[['agility','movement agility'],['dribbling','skill dribbling']],lowPass:[['short passing','attacking short passing']],loftPass:[['long passing','skill long passing']],
 finish:[['finishing','attacking finishing']],heading:[['heading accuracy','attacking heading accuracy']],placeKick:[['free kick accuracy','skill fk accuracy','fk accuracy']],
 curl:[['curve','skill curve']],speed:[['sprint speed','movement sprint speed']],accel:[['acceleration','movement acceleration']],kickPow:[['shot power','power shot power']],
 jump:[['jumping','power jumping']],contact:[['strength','power strength']],balance:[['balance','movement balance']],stamina:[['stamina','power stamina']],
 defAw:[['interceptions','mentality interceptions'],['def awareness','defensive awareness','defending marking awareness','marking awareness','marking']],
 ballWin:[['standing tackle','defending standing tackle'],['sliding tackle','defending sliding tackle']],aggr:[['aggression','mentality aggression']],
 gkAw:[['gk positioning','goalkeeping positioning']],gkCatch:[['gk handling','goalkeeping handling']],gkClear:[['gk kicking','goalkeeping kicking'],['gk handling','goalkeeping handling']],
 gkReflex:[['gk reflexes','goalkeeping reflexes']],gkReach:[['gk diving','goalkeeping diving']]};
const EA_POS={GK:'GK',CB:'CB',LB:'LB',LWB:'LB',RB:'RB',RWB:'RB',CDM:'DMF',CM:'CMF',LM:'LMF',RM:'RMF',CAM:'AMF',LW:'LWF',RW:'RWF',CF:'SS',ST:'CF',
 GOALKEEPER:'GK','CENTRE BACK':'CB','CENTER BACK':'CB','LEFT BACK':'LB','RIGHT BACK':'RB','DEFENSIVE MIDFIELD':'DMF','CENTRAL MIDFIELD':'CMF','LEFT MIDFIELD':'LMF','RIGHT MIDFIELD':'RMF',
 'ATTACKING MIDFIELD':'AMF','LEFT WINGER':'LWF','RIGHT WINGER':'RWF','SECOND STRIKER':'SS','CENTRE FORWARD':'CF','CENTER FORWARD':'CF',DEFENDER:'CB',MIDFIELDER:'CMF',FORWARD:'CF',ATTACKER:'CF',
 ATTACK:'CF',MIDFIELD:'CMF',DEFENCE:'CB',DEFENSE:'CB',DF:'CB',MF:'CMF',FW:'CF',ST:'CF',DM:'DMF',AM:'AMF',
 POR:'GK',DFC:'CB',LI:'LB',LD:'RB',MCD:'DMF',MC:'CMF',MI:'LMF',MD:'RMF',MCO:'AMF',EI:'LWF',ED:'RWF',DC:'CF'};
function toPos(v){if(!v)return null;const s=String(v).toUpperCase().replace(/[-_]/g,' ').split(/[,/|]/)[0].trim();return POS.includes(s)?s:EA_POS[s]||null}
function detectMap(headers){
  const H=headers.map(h=>norm(h));const find=al=>{for(const a of al){const i=H.indexOf(a);if(i>=0)return i}return -1};
  const map={};Object.entries(IMP_FIELDS).forEach(([k,al])=>map[k]=find(al));
  const isEA=H.some(h=>['sprint speed','movement sprint speed','shot power','power shot power'].includes(h));
  const attrs={};ATTRS.forEach(([k,l])=>{const d=find([norm(k),norm(l)].concat(k==='offAw'?['attacking prowess']:k==='defAw'?['defensive prowess']:k==='contact'?['body control']:[]));
    if(!isEA&&d>=0)attrs[k]={type:'pes',cols:[d]};else{const cols=EA_SRC[k].map(g=>find(g)).filter(i=>i>=0);if(cols.length)attrs[k]={type:'ea',cols}}});
  map.attrs=attrs;
  if(map.name>=0&&H[map.name]==='short name'){const ln=find(['long name']);if(ln>=0)map.name=ln}
  const fmt=isEA?'EA FC':H.includes('market value in eur')||H.includes('sub position')||H.includes('club code')?'Transfermarkt':Object.values(attrs).some(a=>a.type==='pes')?'PES':'Generic';
  let kind='unknown';
  if(H.includes('club id')&&H.includes('name')&&(H.includes('stadium name')||H.includes('coach name')||H.includes('domestic competition id')))kind='clubs';
  else if(H.includes('competition id')&&H.includes('name')&&map.pos<0)kind='comps';
  else if(map.name>=0&&(map.team>=0||map.clubId>=0||map.pos>=0||Object.keys(attrs).length>5))kind='players';
  return{map,fmt,kind};
}
let eaToPes=v=>clamp(Math.round(0.8*v+18),40,99);
let ovrFromEA=v=>clamp(Math.round(0.85*v+14),40,99);
function valueToOvr(v,age){v=+v;if(!v||v<1000)return null;let o=57+9.5*Math.log10(v/1e5);if(age>28)o+=(age-28)*0.6;return clamp(Math.round(o),48,90)}
function cellNum(v){if(v==null)return null;const m=String(v).replace(',','.').match(/-?\d+(\.\d+)?/);return m?+m[0]:null}
function readRec(tbl,row){
  const m=tbl.map;const g=k=>m[k]>=0?String(row[m[k]]??'').trim():'';const rec={};
  rec.name=g('name');rec.team=g('team');rec.clubId=g('clubId');rec.comp=g('comp');rec.pos=toPos(g('pos'));
  rec.nat=g('nat')||null;rec.shirtName=g('shirtName')||null;
  let age=cellNum(g('age'));const dob=g('dob');if(!age&&dob){const d=new Date(dob);if(!isNaN(d)){age=Math.floor((Date.now()-d)/31557600000)}}rec.age=age&&age>12&&age<50?Math.round(age):null;
  const h=cellNum(g('height'));rec.height=h?(h<3?Math.round(h*100):Math.round(h)):null;if(rec.height&&(rec.height<140||rec.height>215))rec.height=null;
  const w=cellNum(g('weight'));rec.weight=w&&w>40&&w<130?Math.round(w):null;
  const f=g('foot').toLowerCase();rec.foot=f.startsWith('l')?'L':f.startsWith('r')?'R':f.startsWith('b')?'R':null;
  const n=cellNum(g('number'));rec.number=n&&n>=1&&n<=99?Math.round(n):null;
  const ea=tbl.fmt==='EA FC';const o=cellNum(g('ovr'));rec.ovr=o?(ea?ovrFromEA(o):clamp(Math.round(o),40,99)):null;
  rec.value=cellNum(g('value'));
  const wf=cellNum(g('wf'));if(wf){const v=ea||wf===5?[0,1,1,2,3,4][Math.round(wf)]:clamp(Math.round(wf),1,4);rec.wf=v||null}
  const at={};let c=0;Object.entries(m.attrs||{}).forEach(([k,a])=>{const vals=a.cols.map(i=>cellNum(row[i])).filter(v=>v!=null);if(!vals.length)return;let v=vals.reduce((x,y)=>x+y,0)/vals.length;
    at[k]=a.type==='ea'?calibAttr(k,v):clamp(Math.round(v),40,99);c++});
  rec.attrs=c>=8?at:null;return rec;
}
// estimated ratings from one overall (same shapes as the bulk league builder)
const IMP_PROF=(()=>{const O=a=>Object.fromEntries(ATTR_KEYS.slice(0,20).map((k,i)=>[k,a[i]]));return{
 CF:O([3,0,-3,-3,-6,-10,4,0,-10,-8,-2,-2,2,0,2,-4,-6,-30,-30,-15]),WING:O([0,2,4,1,-3,-5,-3,-15,-8,-2,4,5,-3,-12,-12,3,-2,-28,-28,-18]),
 MIDW:O([-3,1,2,0,0,0,-8,-14,-6,-2,2,2,-4,-10,-8,1,3,-14,-14,-10]),AMF:O([1,3,2,3,3,-1,-2,-15,-3,0,-4,-1,-2,-15,-12,2,-4,-25,-25,-15]),
 CMF:O([-5,1,-3,1,3,2,-10,-10,-8,-6,-6,-6,-3,-8,-4,-3,3,-6,-6,-5]),DMF:O([-14,-4,-8,-4,1,0,-18,-6,-12,-12,-8,-8,-4,-2,2,-6,3,2,2,0]),
 CB:O([-30,-15,-18,-15,-8,-10,-30,1,-20,-20,-8,-10,-6,2,2,-12,-6,2,2,0]),FB:O([-15,-6,-6,-8,-3,-3,-25,-10,-15,-8,2,1,-6,-8,-6,-5,3,-1,-1,-4])}})();
const IMP_PROF_OF={CF:'CF',SS:'AMF',LWF:'WING',RWF:'WING',LMF:'MIDW',RMF:'MIDW',AMF:'AMF',CMF:'CMF',DMF:'DMF',CB:'CB',LB:'FB',RB:'FB'};
function hashN(s,amp){let h=0;for(const ch of s)h=(h*31+ch.charCodeAt(0))|0;return (Math.abs(h)%(2*amp+1))-amp}
function attrsFromOvr(name,pos,target){
  const a={};const gk=pos==='GK';const outKeys=ATTR_KEYS.slice(0,20),gkKeys=ATTR_KEYS.slice(20);
  if(gk){outKeys.forEach(k=>a[k]=clamp(target-28+hashN(name+k,4),40,99));a.kickPow=clamp(target-8,40,99);a.jump=clamp(target-6,40,99);
    const off={gkAw:1,gkCatch:-2,gkClear:-4,gkReflex:1,gkReach:0};gkKeys.forEach(k=>a[k]=clamp(target+off[k]+hashN(name+k,2),40,99))}
  else{const pr=IMP_PROF[IMP_PROF_OF[pos]||'CMF'];outKeys.forEach(k=>a[k]=clamp(target+pr[k]+hashN(name+k,3),40,99));gkKeys.forEach(k=>a[k]=clamp(42+hashN(name+k,2),40,99))}
  const adj=gk?gkKeys:outKeys;for(let i=0;i<6;i++){const d=target-ovr({pos,attrs:a,ovrOverride:''});if(Math.abs(d)<0.5)break;adj.forEach(k=>a[k]=clamp(a[k]+Math.round(d),40,99))}
  return a}
function samePlayer(a,b){const A=norm(a),B=norm(b);if(A===B)return true;const x=A.split(' '),y=B.split(' ');if(x.length<2||y.length<2)return false;
  return x[x.length-1]===y[y.length-1]&&x[0][0]===y[0][0]&&(x[0].length===1||y[0].length===1)}
function unrated(p){const ks=p.pos==='GK'?ATTR_KEYS.slice(20):ATTR_KEYS.slice(0,20);const v=ks.map(k=>p.attrs[k]);return v.every(x=>x===v[0])}

/* ----- state, file intake ----- */
function impState(){return S.ui.imp=S.ui.imp||{tables:[],images:[],studio:[],opts:{mode:'add',addPlayers:true,addTeams:true,latest:true,estimate:true},busy:false,skipped:[]}}
async function impAddFiles(list){const files=[...list].map(f=>({f,path:f._path||f.webkitRelativePath||f.name}));return impReadFiles(files)}
// counts per kind, so the result says what the files turned out to be
const impKinds=st=>({extras:(st.extras||[]).length,teamFiles:(st.teds||[]).length,compFiles:(st.ceds||[]).length,images:st.images.length,sheets:st.tables.length,updates:(st.updates||[]).length,backups:st.studio.length,packages:(st.packages||[]).length,transfers:(st.transfers||[]).length});
async function impReadFiles(files){const st=impState();if(st.busy){toast('Still reading the previous files…','');return}
  S.ui.ofTab='import';const before=impKinds(st),sk0=st.skipped.length;st.busy=true;st.prog={i:0,total:files.length,name:''};S.ui.impLast=null;rerender();
  let n=0;try{await miniBusy('Reading files…',async()=>{busyCount(0,files.length,'Reading files…');
    for(const {f,path} of files){st.prog={i:n+1,total:files.length,name:path};busyCount(n,files.length,'Reading file '+(n+1)+' of '+files.length+': '+path.split('/').pop());const el=$('#imp-prog');if(el)el.innerHTML=impProgHTML();
      try{await impIntake(f,path)}catch(e){st.skipped.push(path+': '+(e.message||e))}n++}
    busyCount(files.length,files.length)})}
  finally{st.busy=false;st.prog=null;IMP_TCACHE=new Map();try{tedLinkImages()}catch(e){console.error(e)}impRefreshStats();
    const after=impKinds(st);const got={};Object.keys(after).forEach(k=>{const d=after[k]-before[k];if(d>0)got[k]=d});
    const already=impMarkAlready();S.ui.impLast={at:Date.now(),total:files.length,got,already,skipped:st.skipped.slice(sk0)};
    toast(Object.keys(got).length?'Read '+files.length+' file'+(files.length===1?'':'s')+'. See what they are below.':'None of those files could be used: see why on the Import tab.',Object.keys(got).length?'ok':'err');rerender();
    const c=$('#imp-last');if(c)c.scrollIntoView({behavior:'smooth',block:'start'})}}
async function impIntake(blob,path){
  const st=impState();const name=path.split('/').pop();const ext=(name.match(/\.([a-z0-9]+)$/i)||[,''])[1].toLowerCase();
  if(name.startsWith('.')||path.includes('__MACOSX'))return;
  if(['png','jpg','jpeg','webp','gif','svg','bmp'].includes(ext))return impAddImage(blob,path,ext);
  if(ext==='zip'){if(typeof JSZip==='undefined')throw new Error('ZIP library not loaded');const z=await JSZip.loadAsync(blob);
    if(z.file('data/project-backup.json')){st.studio.push({name,zip:z});return}
    const entries=Object.values(z.files).filter(e=>!e.dir);for(const e of entries){const b=await e.async('blob');await impIntake(b,path+'/'+e.name)}return}
  if(ext==='json'){const d=JSON.parse(await blob.text());if(d&&(d.teams||d.comps)){st.studio.push({name,data:d});return}throw new Error('not a studio file')}
  if(ext==='csv'||ext==='txt'||ext==='tsv'){let text=(await blob.text()).replace(/^﻿/,'');if(ext==='tsv')text=text.replace(/\t/g,',');return impAddTable(name,csvParse(text))}
  if(ext==='xlsx'||ext==='xls'||ext==='ods'){if(typeof XLSX==='undefined')throw new Error('Spreadsheet library not loaded');const wb=XLSX.read(await blob.arrayBuffer(),{type:'array'});
    wb.SheetNames.forEach(sn=>{const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:false,defval:''});if(rows.length>1)impAddTable(name+(wb.SheetNames.length>1?' › '+sn:''),rows)});return}
  if(ext==='ted')return impAddTed(blob,path);
  if(ext==='ced')return impAddCed(blob,path);
  if(['bin','cpk','rar','7z'].includes(ext))throw new Error('this format can\'t be read in a browser (game data or RAR archive). Unzip RARs first and add the PNG/CSV files inside.');
  throw new Error('unsupported file type');
}
function impAddTable(name,rows){
  const st=impState();const headers=rows[0].map(h=>String(h||'').trim());let body=rows.slice(1).filter(r=>r.some(x=>String(x).trim()!==''));
  const d=detectMap(headers);
  // keep only the newest game version / latest season rows when the file holds several
  const vi=headers.map(h=>norm(h)).indexOf('fifa version');if(vi>=0){const mx=Math.max(...body.map(r=>+r[vi]||0));body=body.filter(r=>(+r[vi]||0)===mx);const ui=headers.map(h=>norm(h)).indexOf('fifa update');if(ui>=0){const mu=Math.max(...body.map(r=>+r[ui]||0));body=body.filter(r=>(+r[ui]||0)===mu)}}
  st.tables.push({id:uid(),name,headers,rows:body,map:d.map,fmt:d.fmt,kind:d.kind,on:d.kind!=='unknown'});try{presetApply(st.tables[st.tables.length-1])}catch(e){console.error(e)}
}
async function impAddImage(blob,path,ext){
  const st=impState();let w=0,h=0;
  try{const u=URL.createObjectURL(blob);const img=await loadImage(u);w=img.naturalWidth;h=img.naturalHeight;URL.revokeObjectURL(u)}catch(e){throw new Error('could not read image')}
  const it={id:uid(),blob:ext==='svg'?new Blob([blob],{type:'image/svg+xml'}):blob,path,name:path.split('/').pop(),w,h,url:URL.createObjectURL(blob),on:true};
  impGuessImage(it);st.images.push(it);
}
function impGuessImage(it){
  {const low=it.path.toLowerCase(),b=low.split('/').pop();if(/(stadium|estadio|^est_)/.test(b)||/(sponsor|patroc|press|prensa)/.test(low)){const segs=it.path.split('/');let t=null;for(const sg of segs.slice(0,-1).reverse()){t=matchTeam(sg);if(t)break}if(!t)t=matchTeam(b.replace(/(stadium|estadio|press\w*|sp\d|sponsor)/g,' '));
    if(/(stadium|estadio|^est_)/.test(b)){it.kind='stadium';it.target=t?'stadium:'+t.id:'';return}const n=(b.match(/(?:sp|press\w*?|r)\s*([123])\b|([123])\.(?:png|jpe?g)$/i)||[]);const i=Math.max(0,Math.min(2,(+(n[1]||n[2])||1)-1));it.kind='sponsor';it.target=t?'sponsor:'+t.id+':'+i:'';return}}
  const segs=it.path.split('/');const base=segs.pop();const folder=segs.join(' ');const low=(it.path).toLowerCase();
  const isKit=/(kit|strip|jersey|shirt|uniform|home|away|third)/.test(low)||(it.w===it.h&&it.w>=1024);
  const isMgr=/(manager|coach)/.test(low);
  const folderComp=segs.length?matchComp(segs[segs.length-1].replace(/^[^-]*-\s*/,''))||matchComp(segs[segs.length-1]):null;
  const t=matchTeam(base,folderComp?folderComp.name:segs[segs.length-1]);const c=matchComp(base);
  if(c&&(!t||nameScore(base,c.name)>=nameScore(base,t.name))&&!isKit){it.kind='comp';it.target='comp:'+c.id;return}
  if(!t){it.kind=isKit?'kit':'emblem';it.target='';return}
  if(isKit){const gk=/(gk|goalkeeper|keeper)/.test(low);const two=/(away|2nd|second|\b2\b)/.test(low),three=/(third|3rd|\b3\b)/.test(low);
    it.kind='kit';it.target='kit:'+t.id+':'+(gk?(two?'GK 2nd':'GK 1st'):three?'3rd':two?'2nd':'1st');return}
  it.kind=isMgr?'manager':'emblem';it.target=(isMgr?'manager:':'emblem:')+t.id;
}
function impTargets(kind){
  if(kind==='comp')return compsArr().map(c=>['comp:'+c.id,c.name]);
  if(kind==='kit')return teamsArr().flatMap(t=>KIT_SLOTS.map(s=>['kit:'+t.id+':'+s,t.name+' – '+s]));
  if(kind==='manager')return teamsArr().map(t=>['manager:'+t.id,t.name+' manager']);
  return teamsArr().map(t=>['emblem:'+t.id,t.name]);
}
function targetHasImage(target){const [k,a,b]=target.split(':');if(k==='comp')return !!(S.comps[a]&&hasRealImg(S.comps[a].emblem));const t=S.teams[a];if(!t)return false;
  if(k==='emblem')return hasRealImg(t.emblem);if(k==='manager')return !!t.managerPhoto;const kt=(t.kits||[]).find(x=>x.slot===b);return !!(kt&&kt.img)}

/* ----- matching & preview stats ----- */
function impClubsIndex(){const st=impState();const idx={};st.tables.filter(t=>t.on&&t.kind==='clubs').forEach(t=>{const H=t.headers.map(h=>norm(h));const ci=H.indexOf('club id'),ni=H.indexOf('name'),di=H.indexOf('domestic competition id');
  t.rows.forEach(r=>{idx[String(r[ci]).trim()]={name:r[ni],comp:di>=0?r[di]:''}})});return idx}
function impRecs(tbl){const st=impState();const clubs=impClubsIndex();let rows=tbl.rows;
  const si=tbl.map.season;if(st.opts.latest&&si>=0&&tbl.fmt==='Transfermarkt'){let mx=0;rows.forEach(r=>{const v=+r[si]||0;if(v>mx)mx=v});rows=rows.filter(r=>(+r[si]||0)===mx)}
  const recs=rows.map(r=>readRec(tbl,r)).filter(r=>r.name);
  recs.forEach(r=>{if(!r.team&&r.clubId&&clubs[r.clubId]){r.team=clubs[r.clubId].name;r.comp=r.comp||clubs[r.clubId].comp}});return recs}
function impRefreshStats(){const st=impState();st.tables.forEach(t=>{t.stats=null});}
function impTableStats(t){if(t.stats)return t.stats;const st=impState();
  if(t.kind!=='players'){const H=t.headers.map(h=>norm(h));const ni=H.indexOf('name');let m=0;if(t.kind==='clubs')t.rows.forEach(r=>{if(matchTeam(r[ni]))m++});else if(t.kind==='comps')t.rows.forEach(r=>{if(matchComp(r[ni]))m++});
    return t.stats={rows:t.rows.length,matched:m}}
  const recs=impRecs(t);const teamNames=new Set(),matchedT=new Set();let ex=0,nw=0,rated=0;
  recs.forEach(r=>{if(r.team)teamNames.add(r.team);const tm=matchTeam(r.team,r.comp);if(!tm)return;matchedT.add(tm.id);
    const p=(tm.players||[]).find(x=>samePlayer(x.name,r.name));if(p)ex++;else nw++;if(r.attrs||r.ovr||r.value)rated++});
  return t.stats={rows:recs.length,teams:teamNames.size,matchedTeams:matchedT.size,existing:ex,fresh:nw,rated,attrs:Object.keys(t.map.attrs||{}).length};
}

/* ----- view ----- */
VIEWS.import=()=>{
  const st=impState();const o=st.opts;
  const tables=st.tables,imgs=st.images;const matched=imgs.filter(i=>i.target),unmatched=imgs.length-matched.length;
  const willFill=matched.filter(i=>i.on&&(o.mode==='replace'||!targetHasImage(i.target))).length;
  return `<h1>Import files</h1><p class="sub">Add files you downloaded: player and team spreadsheets, logo or kit image packs, ZIPs or whole folders. The studio matches them to your teams and players and <b>fills in what's missing</b>; nothing changes until you apply it in Process and Review.</p>
  <div class="grid g2"><div class="card hl" id="imp-drop" style="border-style:dashed;text-align:center;padding:26px">
    <div style="font:700 20px var(--font-display)">Drop files or folders here</div><p class="small muted">CSV, Excel (.xlsx), JSON, PNG/JPG/SVG/WebP images, ZIP archives</p>
    <div class="row" style="justify-content:center"><label class="chip on" style="cursor:pointer;padding:7px 14px"><input type="file" id="imp-files" multiple style="display:none" accept=".csv,.tsv,.txt,.xlsx,.xls,.ods,.json,.zip,.ted,.ced,image/*">Choose files</label>
    <label class="chip" style="cursor:pointer;padding:7px 14px"><input type="file" id="imp-dir" webkitdirectory multiple style="display:none">Choose a folder</label></div>
    ${st.busy?'<p class="small" style="color:var(--warn)">Reading files…</p>':''}${st.skipped.length?`<details class="small" style="margin-top:8px;text-align:left"><summary>${st.skipped.length} file(s) skipped</summary>${st.skipped.slice(-30).map(esc).join('<br>')}</details>`:''}</div>
   <div class="card"><h3>Where to download</h3><div class="grid small" style="gap:8px">
    <div><b>Players, ages, heights, feet, teams, managers, stadiums</b>: <a href="https://www.kaggle.com/datasets/davidcariboo/player-scores" target="_blank" rel="noopener">Transfermarkt dataset (Kaggle)</a>. Add <code>players.csv</code> and <code>clubs.csv</code> together. Market values give rough ratings.</div>
    <div><b>Detailed ratings</b>: EA FC player databases on Kaggle, e.g. <a href="https://www.kaggle.com/datasets/nyagami/ea-sports-fc-25-database-ratings-and-stats" target="_blank" rel="noopener">FC 25</a> or <a href="https://www.kaggle.com/datasets/stefanoleone992/ea-sports-fc-24-complete-player-dataset" target="_blank" rel="noopener">FC 24</a>. Stats are converted to the PES 2021 scale.</div>
    <div><b>Team logos</b>: <a href="https://github.com/luukhopman/football-logos" target="_blank" rel="noopener">football-logos on GitHub</a> (top 25 European leagues; Code → Download ZIP) or <a href="https://fclogo.top" target="_blank" rel="noopener">fclogo.top</a>. Name files after the team.</div>
    <div><b>Kits</b>: PS4 option-file packs that contain PNG strips, or make them in <a href="https://www.pesmaster.com/kit-creator/" target="_blank" rel="noopener">PES Master Kit Creator</a>. Include home/away/third/gk in file names.</div>
    <div class="muted">PES 2021 team (.ted) and competition (.ced) files are read here, with the PNGs they name. Option files made of .bin data can't be read; use the PNGs inside them.</div></div></div></div>
  ${tables.length||imgs.length||st.studio.length||(st.teds||[]).length||(st.ceds||[]).length?`
  <h2>How to apply</h2><div class="card"><div class="row" style="gap:18px">
    <label class="c"><input type="radio" name="imp-mode" data-act="impMode" data-v="add" ${o.mode==='add'?'checked':''}> <b>Only add what's missing</b> <span class="muted small">(recommended: new teams, competitions and players, empty values and image slots; nothing you have changes)</span></label>
    <label class="c"><input type="radio" name="imp-mode" data-act="impMode" data-v="fill" ${o.mode==='fill'?'checked':''}> Fill missing values <span class="muted small">(also lets files update teams: transfers and departures)</span></label>
    <label class="c"><input type="radio" name="imp-mode" data-act="impMode" data-v="replace" ${o.mode==='replace'?'checked':''}> Replace existing values too</label></div>
    <div class="row" style="gap:18px;margin-top:10px">
    <label class="c small"><input type="checkbox" data-act="impOpt" data-k="addPlayers" ${o.addPlayers?'checked':''}> Add players missing from my teams</label>
    <label class="c small"><input type="checkbox" data-act="impOpt" data-k="addTeams" ${o.addTeams?'checked':''}> Also create teams that aren't in my project</label>
    <label class="c small"><input type="checkbox" data-act="impOpt" data-k="latest" ${o.latest?'checked':''}> Transfermarkt: only players active in the latest season</label>
    <label class="c small"><input type="checkbox" data-act="impOpt" data-k="estimate" ${o.estimate?'checked':''}> Estimate ratings from overall or market value when detailed stats are missing</label></div>
    <div class="row" style="margin-top:14px"><button class="primary" data-act="impGo" ${st.busy?'disabled':''}>Send to Process and Review</button><button class="ghost" data-act="impClear">Clear list</button></div></div>`:''}
  ${st.studio.length?`<h2>Studio backups &amp; packages</h2><div class="card">${st.studio.map((x,i)=>`<div class="row"><b>${esc(x.name)}</b><span class="spacer"></span><button class="sm" data-act="impStudio" data-i="${i}">Compare &amp; send to Process and Review</button></div>`).join('')}</div>`:''}
  ${impTedSection()}
  ${impCedSection()}
  ${tables.length?`<h2>Spreadsheets</h2><div class="grid" style="gap:12px">${tables.map(impTableCard).join('')}</div>`:''}
  ${imgs.length?`<h2>Images <span class="muted small">${matched.length} matched · ${unmatched} not matched · ${willFill} will fill a slot</span></h2>
   <div class="row" style="margin-bottom:8px"><button class="sm" data-act="impImgAll" data-v="1">Tick all matched</button><button class="sm" data-act="impImgAll" data-v="0">Untick all</button><button class="sm" data-act="impRematch">Match again</button></div>
   <div class="tw" style="max-height:520px"><table><thead><tr><th></th><th>Image</th><th>File</th><th>Type</th><th>Goes to</th><th>Status</th></tr></thead><tbody>
   ${imgs.slice().sort((a,b)=>(b.target?1:0)-(a.target?1:0)).slice(0,600).map(it=>{const has=it.target&&targetHasImage(it.target);return `<tr><td><input type="checkbox" data-act="impImgOn" data-id="${it.id}" ${it.on&&it.target?'checked':''} ${it.target?'':'disabled'} aria-label="Use ${esc(it.name)}"></td>
   <td><img class="thumb" src="${esc(it.url)}" alt=""></td><td class="small">${esc(it.path.length>60?'…'+it.path.slice(-58):it.path)}<br><span class="muted">${it.w}×${it.h}</span></td>
   <td><select data-ch="impImgKind" data-id="${it.id}" aria-label="Image type">${opts([['emblem','Team emblem'],['comp','Competition emblem'],['kit','Kit texture'],['manager','Manager photo'],['stadium','Stadium image'],['sponsor','Sponsor / press-room board']],it.kind)}</select></td>
   <td><select data-ch="impImgTarget" data-id="${it.id}" aria-label="Target" style="max-width:260px"><option value="">Not matched</option>${opts(impTargets(it.kind),it.target)}</select></td>
   <td class="small">${!it.target?'<span class="muted">skipped</span>':has?(o.mode==='replace'?'<span style="color:var(--warn)">replaces</span>':'<span class="muted">slot already filled</span>'):'<span class="up">fills empty slot</span>'}</td></tr>`}).join('')}</tbody></table></div>`:''}`;
};
function impTableCard(t){const s=impTableStats(t);const kindLbl={players:'Players',clubs:'Teams',comps:'Competitions',unknown:'Not recognised'}[t.kind];
  const sel=k=>`<label class="f">${IMP_FIELD_LABEL[k]}<select data-ch="impMap" data-t="${t.id}" data-k="${k}"><option value="-1">—</option>${t.headers.map((h,i)=>`<option value="${i}" ${t.map[k]===i?'selected':''}>${esc(h)}</option>`).join('')}</select></label>`;
  return `<div class="card ${t.on?'':'off'}" style="${t.on?'':'opacity:.6'}"><div class="row"><input type="checkbox" data-act="impTblOn" data-t="${t.id}" ${t.on?'checked':''} aria-label="Use this sheet"><b>${esc(t.name)}</b>
   <span class="tag t-upd">${kindLbl}</span><span class="tag t-mov">${esc(t.fmt)}</span><span class="small muted">${s.rows} rows</span><span class="spacer"></span>
   ${t.kind==='players'&&t.fmt==='EA FC'?`<button class="sm" data-act="impCalib" data-t="${t.id}" title="Learn the rating conversion from players that came from your team files">Calibrate</button>`:''}${t.preset?`<span class="tag t-add" title="Column choices from last time">saved mapping</span><button class="sm ghost" data-act="presetForget" data-t="${t.id}">Forget</button>`:''}<select data-ch="impKind" data-t="${t.id}" aria-label="Sheet type">${opts([['players','Players'],['clubs','Teams'],['comps','Competitions'],['unknown','Ignore']],t.kind)}</select></div>
   ${t.kind==='players'?`<div class="small" style="margin-top:8px">Matches <b>${s.matchedTeams}</b> of your teams (${s.teams} teams in the file) · <b>${s.existing}</b> of your players found · <b>${s.fresh}</b> players new to your teams · ratings: ${s.attrs>=8?`<b>${s.attrs}/25</b> stats mapped`:s.rated?(t.map.ovr>=0?'overall only (estimated stats)':'market value only (rough estimate)'):'none'}</div>`
   :t.kind!=='unknown'?`<div class="small" style="margin-top:8px"><b>${s.matched}</b> of ${s.rows} rows match your ${t.kind==='clubs'?'teams':'competitions'}</div>`:'<div class="small muted" style="margin-top:8px">Pick a sheet type above if this holds players, teams or competitions.</div>'}
   ${t.kind==='players'?`<details style="margin-top:8px"><summary class="small" style="cursor:pointer">Column mapping</summary><div class="form" style="margin-top:8px">${['name','team','pos','age','dob','nat','height','weight','foot','number','ovr','value','wf'].map(sel).join('')}</div>
    <p class="small muted">Ratings: ${Object.entries(t.map.attrs||{}).map(([k,a])=>`${LABEL['attrs.'+k]} ← ${a.cols.map(i=>esc(t.headers[i])).join(' + ')}`).join(' · ')||'no rating columns found'}</p></details>`:''}</div>`}

/* ----- events ----- */
document.addEventListener('change',e=>{if(e.target.id==='imp-files'||e.target.id==='imp-dir'){const fs=[...(e.target.files||[])];e.target.value='';// so choosing the same files again is read again
  if(fs.length)impAddFiles(fs)}});
const impTabOpen=()=>S.ui.view==='import'||S.ui.view==='optionfile';// both Option file tabs take dropped files (they open Import)
document.addEventListener('dragover',e=>{if(impTabOpen()){e.preventDefault()}});
document.addEventListener('drop',async e=>{if(!impTabOpen())return;e.preventDefault();const dt=e.dataTransfer;if(!dt)return;
  const items=[...(dt.items||[])].map(i=>i.webkitGetAsEntry&&i.webkitGetAsEntry()).filter(Boolean);
  if(items.length){const out=[];const walk=async(en,pre)=>{if(en.isFile){const f=await new Promise((r,j)=>en.file(r,j));out.push(Object.assign(f,{_path:pre+f.name}))}else if(en.isDirectory){const rd=en.createReader();let batch;do{batch=await new Promise((r,j)=>rd.readEntries(r,j));for(const c of batch)await walk(c,pre+en.name+'/')}while(batch.length)}};
    for(const en of items)await walk(en,'');await impReadFiles(out.map(f=>({f,path:f._path})))}
  else if(dt.files&&dt.files.length)impAddFiles(dt.files)});
ACT.impMode=el=>{impState().opts.mode=el.dataset.v;try{impMarkAlready()}catch(e){}S.ui.impPlan=null;setTimeout(rerender,0)};
ACT.impOpt=el=>{const o=impState().opts;o[el.dataset.k]=!o[el.dataset.k];impRefreshStats();setTimeout(rerender,0)};
ACT.impTblOn=el=>{const t=impState().tables.find(x=>x.id===el.dataset.t);t.on=!t.on;impRefreshStats();setTimeout(rerender,0)};
CH.impKind=el=>{const t=impState().tables.find(x=>x.id===el.dataset.t);t.kind=el.value;t.on=el.value!=='unknown';t.stats=null;rerender()};
CH.impMap=el=>{const t=impState().tables.find(x=>x.id===el.dataset.t);t.map[el.dataset.k]=+el.value;t.stats=null;rerender()};
ACT.impImgOn=el=>{const it=impState().images.find(x=>x.id===el.dataset.id);it.on=!it.on;setTimeout(rerender,0)};
CH.impImgKind=el=>{const it=impState().images.find(x=>x.id===el.dataset.id);it.kind=el.value;const t=it.target.split(':')[1];
  it.target=t&&S.teams[t]&&el.value!=='comp'?(el.value==='kit'?'kit:'+t+':1st':el.value+':'+t):'';rerender()};
CH.impImgTarget=el=>{const it=impState().images.find(x=>x.id===el.dataset.id);it.target=el.value;it.on=!!el.value;rerender()};
ACT.impImgAll=el=>{impState().images.forEach(i=>i.on=el.dataset.v==='1'&&!!i.target);rerender()};
ACT.impRematch=()=>{IMP_TCACHE=new Map();impState().images.forEach(impGuessImage);impRefreshStats();rerender()};
ACT.impClear=()=>{const st=impState();st.images.forEach(i=>URL.revokeObjectURL(i.url));S.ui.imp=null;rerender()};
ACT.impStudio=async el=>{const x=impState().studio[+el.dataset.i];await importStudioFile({name:x.name},x.zip,x.data)};

/* ----- build the review batch ----- */
ACT.impGo=async()=>{const st=impState();try{st.tables.filter(t=>t.on&&t.kind!=='unknown').forEach(t=>{try{presetSave(t)}catch(e){}});await miniBusy('Matching imported data…',async()=>{await sleep(30);await impBuild()})}catch(e){toast('Import failed: '+e.message,'err')}};
async function impBuild(){
  const st=impState();const o=st.opts;const replace=o.mode==='replace';IMP_TCACHE=new Map();
  const inc={},incC={},stats={teams:0,players:0,newPlayers:0,images:0,unmatched:0};
  const getInc=t=>inc[t.id]||(inc[t.id]=Object.assign(clone(t),{players:[]}));
  const virt={};// new teams created from files
  const teamFor=(name,comp)=>{let t=matchTeam(name,comp);if(t)return t;if(!o.addTeams||!name)return null;const k=norm(name);
    if(!virt[k]){const c=comp?matchComp(comp):null;virt[k]=newTeam({name:String(name).trim(),short:shortName(name),compId:c?c.id:'',kits:[newKit('1st'),newKit('2nd'),newKit('GK 1st','#1c1c1c','#1c1c1c')]});IMP_TCACHE.set(norm(name)+'|'+(comp||''),virt[k]);inc[virt[k].id]=virt[k]}
    return virt[k]};
  const fill=(obj,path,v)=>{if(v==null||v==='')return false;const cur=getP(obj,path);if(!replace&&cur!=null&&cur!==''&&!(Array.isArray(cur)&&!cur.length))return false;if(canon(cur)===canon(v))return false;setP(obj,path,v);return true};
  await impTedStep({st,o,replace,inc,getInc,stats});
  await impCedStep({st,o,replace,incC,stats});
  // competitions & clubs sheets
  st.tables.filter(t=>t.on&&t.kind==='comps').forEach(t=>{const H=t.headers.map(h=>norm(h));const ni=H.indexOf('name'),ci=H.indexOf('country name');
    t.rows.forEach(r=>{const c=matchComp(r[ni]);if(c){const x=incC[c.id]||clone(c);if(fill(x,'country',ci>=0?r[ci]:''))incC[c.id]=x}})});
  st.tables.filter(t=>t.on&&t.kind==='clubs').forEach(t=>{const H=t.headers.map(h=>norm(h));const ni=H.indexOf('name'),si=H.indexOf('stadium name'),ki=H.indexOf('coach name'),di=H.indexOf('domestic competition id');
    t.rows.forEach(r=>{const tm=teamFor(r[ni],di>=0?r[di]:'');if(!tm)return;const x=inc[tm.id]||getInc(tm);let ch=false;
      if(si>=0)ch=fill(x,'stadium',r[si])||ch;if(ki>=0)ch=fill(x,'manager.name',r[ki])||ch;if(ch)stats.teams++})});
  // players sheets
  for(const t of st.tables.filter(t=>t.on&&t.kind==='players')){
    const recs=impRecs(t);
    for(const r of recs){const tm=teamFor(r.team,r.comp);if(!tm){stats.unmatched++;continue}
      const x=inc[tm.id]||getInc(tm);const src=S.teams[tm.id];
      let p=x.players.find(q=>samePlayer(q.name,r.name));let isNew=false;
      if(!p){const exP=src&&(src.players||[]).find(q=>samePlayer(q.name,r.name));if(exP)p=clone(exP);else{if(!o.addPlayers&&src)continue;p=newPlayer({name:r.name,pos:r.pos||'CMF'});isNew=true}x.players.push(p)}
      const force=replace||isNew;const before=canon(p);
      const f=(k,v)=>{if(v==null||v==='')return;if(force||p[k]===''||p[k]==null)p[k]=v};
      f('shirtName',r.shirtName);f('number',r.number);f('age',r.age);f('nat',r.nat);f('height',r.height);f('weight',r.weight);if(r.foot&&(force||unrated(p)))p.foot=r.foot;
      if(r.pos&&(force))p.pos=r.pos;
      const canRate=force||unrated(p);
      if(canRate&&r.attrs){Object.assign(p.attrs,r.attrs);if(r.wf){p.wfAcc=r.wf;p.wfUsage=r.wf}}
      else if(canRate&&o.estimate){const target=r.ovr||valueToOvr(r.value,r.age||p.age);if(target)p.attrs=attrsFromOvr(p.name,p.pos,target)}
      normPlayer(p);if(isNew)stats.newPlayers++;else if(canon(p)!==before)stats.players++;
      await null;
    }
  }
  // images: upload the ones that will fill a slot, then assign
  const imgs=st.images.filter(i=>i.on&&i.target&&(replace||!targetHasImage(i.target)));
  for(const it of imgs){const [k,a,b]=it.target.split(':');let rec;
    try{rec=await addImageFromBlob(it.blob,k==='comp'?'comp':k==='kit'?'kit':k==='manager'?'manager':k==='stadium'?'stadium':k==='sponsor'?'sponsor':'emblem',it.name)}catch(e){st.skipped.push(it.name+': '+e.message);continue}
    stats.images++;
    if(k==='comp'){const c=S.comps[a];if(!c)continue;const x=incC[a]||clone(c);x.emblem=rec.id;incC[a]=x;continue}
    const tm=S.teams[a]||Object.values(virt).find(v=>v.id===a);if(!tm)continue;const x=inc[tm.id]||getInc(tm);
    if(k==='emblem')x.emblem=rec.id;else if(k==='manager')x.managerPhoto=rec.id;else if(k==='stadium')x.stadiumImg=rec.id;else if(k==='sponsor'){const sp=spOf(x);sp[+b]=rec.id;x.sponsorImgs=sp}else{let kt=x.kits.find(z=>z.slot===b);if(!kt){kt=newKit(b);x.kits.push(kt)}kt.img=rec.id}}
  // drop untouched team copies so they don't show as empty updates
  Object.keys(inc).forEach(id=>{const x=inc[id];const src=S.teams[id];if(src&&!x.players.length&&!diffObj(src,x,TEAM_PATHS).length)delete inc[id]});
  const names=[...(st.teds||[]).filter(t=>t.on!==false).map(t=>t.name||t.file||'team file'),...st.tables.filter(t=>t.on).map(t=>t.name),...(imgs.length?[imgs.length+' images']:[])].join(', ');
  const b=batchFromData({teams:inc,comps:incC},{title:'Import: '+(names.length>80?names.slice(0,78)+'…':names),source:'Files',removeMissing:false,teamScope:[]});
  b.notes=[`${stats.players} existing players filled, ${stats.newPlayers} players added, ${stats.images} images uploaded${stats.unmatched?`, ${stats.unmatched} rows skipped because their team isn't in your project`:''}.`,
    o.mode==='fill'?'Fill mode: only empty fields, unrated players and empty image slots were touched.':'Replace mode: values from the files overwrite existing ones.'];
  if(!b.items.length){toast('Nothing to fill: your data already has these values','ok');return}
  finishBatch(b);if(!IMP_CAPTURE)location.hash='review';
}
