// PES 2021 Option Studio, part 8 of 14: FootyLogos, missing emblems, World Cup, game files (.ted/.ced), player codes, name-fixed teams.
// The parts are one program in one global scope, loaded in order by index.html; a later part may wrap what an earlier one defined.
"use strict";
/* ================= FootyLogos: latest club crests and competition logos ================= */
// The site's server finds each logo on https://www.footylogos.com (by the club's slug, e.g. "al-ain") and passes
// the file on; when a name doesn't match, Claude suggests the slug. Results go to Process and Review like every update.
const FL_SITE='https://www.footylogos.com';
async function flFix(b){if(!/svg/.test(b.type))return b; // draw SVGs at 1024 px so the PNG made from them is sharp
  let t=await b.text();const m=t.match(/<svg\b[^>]*>/i);if(!m)return b;let tag=m[0];
  const vb=tag.match(/viewBox=["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  let w=vb?+vb[1]:+((tag.match(/\swidth=["']([\d.]+)/i)||[])[1]||1),h=vb?+vb[2]:+((tag.match(/\sheight=["']([\d.]+)/i)||[])[1]||1);
  const k=1024/Math.max(w,h,1);let nt=tag.replace(/\s(width|height)=["'][^"']*["']/gi,'').replace(/<svg\b/i,`<svg width="${Math.round(w*k)}" height="${Math.round(h*k)}"`);
  if(!vb&&w>1&&h>1)nt=nt.replace(/<svg\b/i,`<svg viewBox="0 0 ${w} ${h}"`);if(!/xmlns=/.test(nt))nt=nt.replace(/<svg\b/i,'<svg xmlns="http://www.w3.org/2000/svg"');
  return new Blob([t.replace(tag,nt)],{type:'image/svg+xml'})}
function flAvailable(){return !!(window.claude&&window.claude.standalone)}
async function flFind(name,kind,country,hints,signal){const q=new URLSearchParams({name:name||'',kind:kind==='comp'?'comp':'club',country:country||'',hints:(hints||[]).join(',')});
  const r=await fetch('api/logo/find?'+q,{signal});const o=await r.json().catch(()=>({}));if(!r.ok)throw new Error(o.error||('logo search failed ('+r.status+')'));return o}
async function flDownload(found,signal){const r=await fetch(found.file,{signal});if(!r.ok)throw new Error('download failed ('+r.status+')');return flFix(await r.blob())}
// find, download and attach the logo to a team or competition object (not saved here: the caller puts it in a review batch)
async function flAttach(obj,kind,signal,hints){if(!flAvailable()||!obj||!obj.name)return null;
  try{const f=await flFind(obj.name,kind,obj.country,hints,signal);if(!f.found){aiLog('  No FootyLogos logo found for '+obj.name);return null}
    const b=await flDownload(f,signal);const rec=await addImageFromBlob(b,kind,obj.name+(kind==='comp'?' logo':' crest')+' (FootyLogos)');obj.emblem=rec.id;
    aiLog('  Logo for '+obj.name+': '+f.page);return f.slug}
  catch(e){if(e.name==='AbortError')throw e;aiLog('  Logo for '+obj.name+' failed: '+e.message);return null}}
// The crest or logo at the top of the club's or competition's English Wikipedia article (wikipedia.logo on the server):
// Wikipedia keeps the non-free logos Commons doesn't. Returns the new image's id, or '' when Wikipedia has none.
async function wpLogoId(o,kind,signal){const k=kind==='comp'?'comp':'club';
  const r=await fetch('api/wp/logo?name='+encodeURIComponent(o.name)+'&kind='+k+(o.country?'&country='+encodeURIComponent(o.country):''),{signal});if(!r.ok)return'';
  const w=await r.json().catch(()=>null);if(!w||!w.image)return'';const im=await fetch('api/image?url='+encodeURIComponent(w.image),{signal});if(!im.ok)return'';
  let b=await im.blob();if(/svg/.test(b.type)&&typeof flFix==='function')b=await flFix(b);
  return (await addImageFromBlob(b,kind==='comp'?'comp':'emblem',o.name+(kind==='comp'?' logo':' crest')+' (Wikipedia)')).id}

/* ---- Logos & kits → Missing emblems: every club and competition without an emblem, and Claude to fill them ---- */
function emblemsInReview(){const s=new Set();Object.values(S.pending).forEach(b=>(b.items||[]).forEach(it=>{if((it.fields||[]).some(f=>f.k==='emblem'&&f.to))s.add(it.teamId||it.compId)}));return s}
function emblemsQueued(){const s=new Set();jobsArr().filter(j=>(j.type==='logos'||j.type==='freeArt')&&(j.status==='queued'||j.status==='running')).forEach(j=>[...(j.teamIds||[]),...(j.compIds||[])].forEach(id=>s.add(id)));return s}
function missingEmblems(){const f=S.ui.mf||(S.ui.mf={kind:'',comp:''});
  const ts=f.kind==='comps'?[]:teamsArr().filter(t=>missCrest(t)&&(!f.comp||t.compId===f.comp||(f.comp==='none'&&inNoComp(t))));
  const cs=f.kind==='clubs'?[]:compsArr().filter(c=>missLogo(c)&&(!f.comp||c.id===f.comp));
  return{f,ts,cs}}
function missingTab(){const {f,ts,cs}=missingEmblems();const rev=emblemsInReview(),q=emblemsQueued();const n=ts.length+cs.length;
  const state=id=>rev.has(id)?' <a class="tag t-upd" href="#review">waiting in Process and Review</a>':q.has(id)?' <span class="tag t-mov">queued</span>':'';
  const row=(o,kind)=>`<tr><td>${thumb('')}</td><td><b>${esc(o.name)}</b>${state(o.id)}</td><td class="small muted">${kind==='comp'?'Competition logo':esc(compName(o.compId))}</td><td class="small muted">${esc(o.country||'')}</td>
   <td style="text-align:right;white-space:nowrap">${kind==='comp'?(compLogoLock(o)?`<span class="small muted" title="${esc(compLogoLock(o))}">logo can't change</span>`:`<button class="sm" data-act="editComp" data-id="${esc(o.id)}">Choose image…</button>`):`<button class="sm" data-act="pickImage" data-kind="emblem" data-target="emblem:${esc(o.id)}">Choose image…</button> <button class="sm" data-act="emblemFor" data-team="${esc(o.id)}">Design</button>`}</td></tr>`;
  return `<div class="row" style="margin-bottom:12px">
   <select data-ch="mfKind" aria-label="Show">${opts([['','Teams and competitions'],['clubs','Team crests'],['comps','Competition logos']],f.kind)}</select>
   <select data-ch="mfComp" aria-label="Competition">${opts([['','All competitions'],...compsArr().map(c=>[c.id,c.name]),['none','Teams without a competition']],f.comp)}</select>
   <span class="spacer"></span><button class="primary" data-act="goArt" data-comp="${f.comp==='none'?'__none':esc(f.comp)}" data-kind="${esc(f.kind)}" ${n?'':'disabled'}>Fill ${n} missing…</button></div>
  <p class="small muted">${ts.length} team${ts.length===1?'':'s'} and ${cs.length} competition${cs.length===1?'':'s'} below have no emblem. Pick an image for one, or let Claude fill them all; new emblems wait in <a href="#review">Process and Review</a> first.</p>
  ${n?`<div class="tw" style="max-height:560px"><table><thead><tr><th></th><th>Name</th><th>Competition</th><th>Country</th><th></th></tr></thead><tbody>${cs.map(c=>row(c,'comp')).join('')}${ts.map(t=>row(t,'emblem')).join('')}</tbody></table></div>`
     :'<div class="card"><p class="small">Everything shown here has an emblem.</p></div>'}`}
CH.mfKind=el=>{S.ui.mf.kind=el.value;rerender()};
CH.mfComp=el=>{S.ui.mf.comp=el.value;rerender()};

/* ---- options dialog: choose exactly what the logo tool does ---- */
const flFromFL=id=>{const im=id&&S.images[id];return !!(im&&/\(FootyLogos\)/.test(im.name||''))};

/* ================= World Cup and international competitions ================= */
// The project always has one World Cup holding every national team in it, whatever Claude returns. It keeps the last
// edition's title and logo (FIFA World Cup 2026) until the international search finds a newer edition published online.
const WC_DEFAULT={name:'FIFA World Cup 2026',short:'World Cup'};
const WC_KEEP=['name','short','emblem','type']; // what only a newer edition may change
const edYear=s=>+((String(s||'').match(/\b(19|20)\d{2}\b/)||[])[0]||0);
function worldCup(){const cs=compsArr();return cs.find(c=>c.worldCup)||cs.find(c=>/world cup/i.test(c.name)&&!/club/i.test(c.name))||null}
// a national team: its home competition is a national one (the World Cup), or it plays in one
function isNationalTeam(t){if(!t)return false;return !!t.national||isNationalComp(S.comps[t.compId])||compsArr().some(c=>isNationalComp(c)&&(c.teams||[]).includes(t.id))||isCountryTeamName(t.name)||(typeof isFlagImage==='function'&&isFlagImage(t.emblem))||isSquadOfCountry(t)}
// most of the squad shares one nationality and the team is named after it ("USA" squad of Americans, "Korea Republic" of Koreans)
function isSquadOfCountry(t){const P=t.players||[];if(P.length<11)return false;const c=new Map();P.forEach(p=>{const n=norm(p.nat);if(n)c.set(n,(c.get(n)||0)+1)});
  let top='',k=0;c.forEach((v,n)=>{if(v>k){k=v;top=n}});if(!top||k<P.length*.8)return false;const tn=norm(t.name);return tn===top||tn.includes(top)||top.includes(tn)||tn.split(' ')[0]===top.split(' ')[0]}
// a team called after a country ("Spain", "Korea Republic", "England national team"); the country list ships with the flags
function isCountryTeamName(n){const I=typeof FLAG_INDEX!=='undefined'&&FLAG_INDEX;if(!I||!n)return false;return !!I[norm(String(n).replace(/\s+(national (football )?team|nt)$/i,''))]}
function ensureWorldCup(){let wc=worldCup(),ch=false;
  if(!wc){const legacy=compsArr().find(c=>/^national teams?$/i.test(c.name));
    toast((legacy?'"'+legacy.name+'" is now the ':'Added the ')+WC_DEFAULT.name+'. It always holds every national team in the project.','ok');
    wc=legacy||newComp({name:WC_DEFAULT.name,type:'Cup',country:'International'});wc.name=WC_DEFAULT.name;wc.short=WC_DEFAULT.short;ch=true}
  if(!wc.worldCup||wc.type!=='Cup'){wc.worldCup=true;wc.type='Cup';ch=true}
  if(!wc.country){wc.country='International';ch=true}
  const ids=new Set(wc.teams||[]);teamsArr().forEach(t=>{if(t.compId!==wc.id&&!ids.has(t.id)&&isNationalTeam(t)){ids.add(t.id);ch=true}});
  if(ch){wc.teams=[...ids];saveComp(wc)}
  wcLogo(wc);ensureLegends();return wc}
// THE ICONS and THE LEGENDS are teams of the game's Classic Teams pool (GAME_NO_LEAGUE in app-core.js). The studio no longer
// makes a competition for that pool (the user, 2026-11-24: "drop the group and keep the teams"): a project that still has the
// group made on 2026-11-23 loses it here; the teams stay, in no competition, shown and exported under Classic Teams. So does a
// competition made from nothing but an option-file folder that holds them ("30. Legends Teams": a folder never makes a
// competition or puts a team in one, rule book 5a): they leave it, and it goes once no team is left in it.
const folderOnlyComp=c=>!!c&&!c.worldCup&&!c.ced&&!(c.of&&c.of.ced)&&!c.gameLeague&&!c.codeSet&&!+c.gameId;
function ensureLegends(){const gone=new Set(compsArr().filter(c=>c.legendsGroup).map(c=>c.id));
  teamsArr().filter(gameNoLeague).forEach(t=>{const c=S.comps[t.compId];if(c&&(c.legendsGroup||folderOnlyComp(c))){gone.add(c.id);t.compId='';saveTeam(t)}});
  gone.forEach(id=>{const c=S.comps[id];if(!c||teamsArr().some(t=>t.compId===id))return;if(!c.legendsGroup&&(c.teams||[]).some(x=>S.teams[x]&&!gameNoLeague(S.teams[x])))return;delete S.comps[id];Store.del('comps',id)})}
// a World Cup without a logo fetches its edition's logo from FootyLogos once (to Process and Review)
function wcLogo(wc){if(wc.emblem||!flAvailable()||wc.logoAsked===wc.name)return;
  if(jobsArr().some(j=>j.type==='logos'&&(j.compIds||[]).includes(wc.id)&&j.status!=='done'))return;
  wc.logoAsked=wc.name;saveComp(wc);queueAdd([{type:'logos',compIds:[wc.id],teamIds:[],useClaude:false,label:wc.name+' logo'}])}
// a national team the source names: one already in the project (FIFA name, or the same core name), else any team called that
function findNation(name){const n=norm(name);const nat=teamsArr().filter(isNationalTeam);
  return nat.find(t=>norm(t.name)===n)||nat.find(t=>nameScore(t.name,name)===1)||teamsArr().find(t=>norm(t.name)===n)||null}
// the same international competition in another edition ("UEFA EURO 2024" = "UEFA Euro 2028")
function findIntlComp(name){return compsArr().find(c=>!c.worldCup&&isNationalComp(c)&&(norm(c.name)===norm(name)||nameScore(c.name,name)===1))||null}
function intlPrompt(season){
  return `List the international football competitions for national teams around season ${season}: the FIFA World Cup, the continental championships (UEFA EURO, Copa América, CONCACAF Gold Cup, Africa Cup of Nations, AFC Asian Cup, OFC Nations Cup) and the nations leagues (UEFA Nations League, CONCACAF Nations League).
For each, give the most recent edition that has been played, is being played or is about to be played, with its official name including the year, and the national teams taking part (for an edition still in qualifying, the teams qualified so far).
Also say which FIFA World Cup is the newest one whose official name and logo have been published.
Use national team names as FIFA lists them (e.g. "IR Iran", "Korea Republic", "Côte d'Ivoire", "United States").
Reply with JSON only: {"worldCup":{"name":"official name, e.g. FIFA World Cup 2026","logoPublished":true},"competitions":[{"name":"official name with year","short":"short name","region":"e.g. Europe","teams":["national team name"]}],"knowledgeNote":"one short sentence on how current this is"}`}
// Search international competitions is its own card on Live Update → Competitions
// (the user, 2026-11-25); this opens it there. New competitions it finds go to Process and Review and are applied through
// the competition creation module (app-comp-add.js: the slot popup, compAddGate), like every other new competition.
ACT.intlSearch=()=>{S.ui.aiTab='comps';if(location.hash!=='#ai')location.hash='ai';else rerender();setTimeout(()=>{const f=$('#intl-full');if(f)f.scrollIntoView({behavior:'smooth',block:'center'})},150)};
ACT.intlGo=()=>{const el=$('#intl-full');const full=el?el.checked:true;if(!$('#modal').hidden)closeModal();ensureWorldCup();
  queueAdd([{type:'intl',season:S.settings.season,full,label:'International competitions ('+S.settings.season+')'}]);
  toast('Searching international competitions. Progress shows on Live Update; results go to Process and Review.','ok')};
async function runIntlSearch(j,signal){const season=j.season||S.settings.season;
  aiLog('Asking Claude for the international competitions ('+season+')…');const r=await aiJSON(intlPrompt(season),signal);if(r.knowledgeNote)aiLog('  Note: '+r.knowledgeNote);
  const wc=ensureWorldCup();const nations=new Map(); // one entry per national team named, existing or new
  const nationFor=name=>{const k=norm(name);if(!k)return null;if(nations.has(k))return nations.get(k);
    let t=findNation(name);if(!t){t=newTeam({name:String(name).trim(),short:shortName(name),country:String(name).trim(),compId:wc.id});t._new=true}nations.set(k,t);return t};
  // the World Cup: a newer published edition takes over the title, and the logo once FootyLogos has it; otherwise both stay
  const w=r.worldCup||{};const incWc=clone(wc);
  if(w.name&&w.logoPublished!==false&&edYear(w.name)>edYear(wc.name)){incWc.name=String(w.name).trim();aiLog('  Newer World Cup published: '+incWc.name);
    if(!await flAttach(incWc,'comp',signal,['fifa-world-cup-'+edYear(w.name)]))aiLog('  Its logo isn\'t on FootyLogos yet, so the '+wc.name+' logo stays')}
  const list=(Array.isArray(r.competitions)?r.competitions:[]).filter(c=>c&&c.name);const wcAdd=[];
  for(const rc of list){if(signal&&signal.aborted)throw new DOMException('Stopped','AbortError');
    const ts=(Array.isArray(rc.teams)?rc.teams:[]).map(nationFor).filter(Boolean);
    if(/world cup/i.test(rc.name)&&!/club/i.test(rc.name)){ts.forEach(t=>{if(t.compId!==wc.id)wcAdd.push(t.id)});continue}
    const ex=findIntlComp(rc.name);const inc=ex?clone(ex):newComp({name:String(rc.name).trim(),short:rc.short||'',country:rc.region||'International',type:'Cup',season});
    inc.intl=true;inc.type='Cup';inc.season=season;
    if(ex&&edYear(rc.name)>edYear(ex.name)){inc.name=String(rc.name).trim();aiLog('  New edition: '+ex.name+' → '+inc.name)}
    if(!ex||inc.name!==ex.name)await flAttach(inc,'comp',signal); // a new edition's logo when FootyLogos has it; otherwise the old one stays
    inc.teams=cupParticipants(ex||inc,ts.map(t=>t.id));
    const b=batchFromData({comps:{[inc.id]:inc},teams:{}},{title:'International: '+inc.name,source:'Claude',removeMissing:false,teamScope:[]});
    b.notes=ex?compUnlisted(ex,new Set(ts.map(t=>t.id)),season):[];finishBatch(b)}
  incWc.teams=cupParticipants(wc,wcAdd);
  finishBatch(batchFromData({comps:{[wc.id]:incWc},teams:{}},{title:'World Cup: '+incWc.name,source:'Claude',removeMissing:false,teamScope:[],allowWc:true}));
  const fresh=[...nations.values()].filter(t=>t._new);fresh.forEach(t=>delete t._new);
  if(fresh.length&&j.full)queueNewClubs(fresh,season,{national:true});
  else if(fresh.length)finishBatch(batchFromData({teams:Object.fromEntries(fresh.map(t=>[t.id,t])),comps:{}},{title:'New national teams ('+fresh.length+')',source:'Claude',removeMissing:false,teamScope:[]}));
  aiLog('  '+list.length+' international competitions checked'+(fresh.length?', '+fresh.length+' new national team'+(fresh.length===1?'':'s'):''))}

/* ================= v3: game files (.ted/.ced), image links and the connection check =================
   Team (.ted) and competition (.ced) files share one wrapper: an 80-byte header (type 0x18 team / 0x19 competition, body size,
   SHA-256 of the body at bytes 48–79) and a body masked with that hash. Both name their images: a team file its emblem (byte 503)
   and manager photo (byte 723), a competition file its emblem (byte 804). On Import Team / Import Competition the game takes a
   PNG of exactly that name from the same folder, so each file and its images are written side by side under matching names. */
const GF={
  type:u8=>u8&&u8.length>80?({24:'ted',25:'ced'})[u8[0]]||null:null,
  decrypt(raw){const key=new Uint8Array(32);key.set(raw.subarray(69,80),0);key.set(raw.subarray(48,69),11);
    const dec=new Uint8Array(raw.length);dec.set(raw.subarray(0,48),0);for(let i=80;i<raw.length;i++)dec[i]=raw[i]^key[(i-80)%32];return dec},
  async verify(raw){const d=GF.decrypt(raw);const dg=new Uint8Array(await crypto.subtle.digest('SHA-256',d.slice(80)));
    return{type:GF.type(raw),size:raw.length,sizeOK:TED.readNum(raw,8,4)===raw.length-80,hashOK:dg.every((b,i)=>b===raw[48+i]),dec:d}}};
TED.IMG={emblem:503,manager:723};TED.IMGLEN=33;// 33-byte file-name fields (32 characters and a terminator)
const PES_NAME_MAX=31;// longest image file name the export writes, extension included
const pesName=s=>String(s||'').normalize('NFD').replace(/[^\x20-\x7e]/g,'').replace(/[^A-Za-z0-9_.-]+/g,'_').replace(/^[_.]+|_+$/g,'');
{const _parse=TED.parse;TED.parse=raw=>{const r=_parse(raw);const d=TED.decrypt(raw);r.team.emblemFile=TED.readStr(d,TED.IMG.emblem,TED.IMGLEN);
  r.team.managerFile=TED.readStr(d,TED.IMG.manager,TED.IMGLEN);r.team.coach=TED.readStr(d,677,46);return r}}
const CED={SIZE:852,ID:80,NAME:114,NAMELEN:61,EMB:804,
  parse(raw){if(!raw||raw.length!==CED.SIZE)throw new Error('not a PES 2021 competition file (expected 852 bytes, got '+(raw?raw.length:0)+')');
    if(GF.type(raw)!=='ced')throw new Error('not a competition file');const d=GF.decrypt(raw);
    return{compId:TED.readNum(d,CED.ID,4),name:TED.readStr(d,CED.NAME,CED.NAMELEN),emblemFile:TED.readStr(d,CED.EMB,TED.IMGLEN)}},
  async build(b64,o={}){const raw=TED.unb64(b64);const d=GF.decrypt(raw);if(o.compId)cedSetCode(d,o.compId);{const why=cedProblemD(d);if(why)throw new Error(why)}
    if(o.name)TED.writeStr(d,CED.NAME,CED.NAMELEN,o.name);if(o.emblemFile!=null)TED.writeStr(d,CED.EMB,TED.IMGLEN,o.emblemFile);return TED.encrypt(d,raw)}};
// The game finds a competition by its slot index (2 bytes at 104), not by the code at 80, and each code has its own slot. A file
// that keeps a template's slot index lands on that template's competition: 2026-11-19, a new league built on the Premier League
// template (slot 9) took the Premier League's logo in the game. The game has no free slots (1 to 141, all held), so a new
// competition takes a game competition's code, and with it that competition's slot (Game codes).
CED.SLOT=104;
const COMP_SLOT={1:1,2:2,5:3,7:4,8:5,17:9,19:11,23:15,25:17,26:18,27:19,28:20,31:24,34:27,43:34,44:35,46:36,50:39,51:40,52:41,53:42,54:43,55:44,59:49,68:56,79:66,80:67,83:70,84:71,85:72,86:73,87:74,88:75,90:77,91:78,92:79,95:82,97:84,122:112,123:115,124:118,125:120,126:123,127:126,128:113,129:116,130:121,131:124,132:127,137:138,142:129,164:140,165:141,
  // KONAMI Cup and KONAMI League, from files the user exported from the game itself (2026-11-24): the option file has none
  47:37,99:86};
// the table above (read from the site option file's competition files), the built-in files, and any other option file's own files
function compSlots(){const m=Object.assign({},COMP_SLOT);const read=b64=>{try{const d=GF.decrypt(TED.unb64(b64));const id=TED.readNum(d,CED.ID,4),sl=TED.readNum(d,CED.SLOT,2);if(id&&sl&&!m[id])m[id]=sl}catch(e){}};
  ((window.PES_TEMPLATES||{}).comps||[]).forEach(g=>read(g.b64));compsArr().forEach(c=>{if(c.ced&&c.ced.b64&&!c.ced.generated&&c.of&&c.of.ced)read(c.ced.b64)});return m}
function cedSetCode(d,id){TED.writeNum(d,CED.ID,4,+id);const sl=compSlots()[+id];if(sl)TED.writeNum(d,CED.SLOT,2,sl)}
// why a competition file must not be written ('' when it may): its code isn't a game competition's, or its slot is another's
function cedProblemD(d){const id=TED.readNum(d,CED.ID,4),sl=TED.readNum(d,CED.SLOT,2);const m=compSlots();const want=m[id];
  const holder=Object.keys(m).find(k=>m[k]===sl);const hn=holder?((compsArr().find(c=>+c.gameId===+holder)||{}).name||'code '+holder):'';
  if(!want)return `code ${id} is not a competition the game has${hn?`, so the game would put the file on ${hn} (slot ${sl})`:''}. Give it a game competition's code on Game codes`;
  if(want!==sl)return `its slot index (${sl}) is ${hn||'another competition'}'s, not code ${id}'s (${want})`;return ''}
function cedProblem(b64,compId){try{const d=GF.decrypt(TED.unb64(b64));if(compId)cedSetCode(d,compId);return cedProblemD(d)}catch(e){return e.message}}

/* ----- players created in a team file get edit-mode IDs (bit 30 set, as the game does), from a block far above the ones it hands out,
   derived from the studio player so every export gives the same player the same ID ----- */
const fnv=s=>{let h=0x811c9dc5;for(const ch of String(s)){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0}return h>>>0};
// edit players (created in a file, not from the game's own list) carry IDs with bit 30 set, as the game gives them
const isEditId=v=>+v>=0x40000000&&+v<=0xFFFFFFFF;
/* THE LOCK ON NEW IDs (the user, 2026-11-25: "make sure the app never offers or creates new IDs till we test this thoroughly").
   A team file the studio writes lists only players a game file already holds (his own record, or a free one he was given:
   Allocate free IDs). It never writes a player under an ID no game file holds: not an ID a source gave him, not an edit ID,
   not a number of its own. Whether the game takes such a player is docs/GAME_TESTS.md 25, not run yet. While this is false the
   options that did it are not shown and are ignored if a saved setting has them on (Export Option File's "Also write players
   no game file has", Partial Export's same option and "Use their real game ID"). Set it to true only when test 25 has passed
   in the game and the rule book says which IDs work. */
const NEW_IDS_TESTED=false;// bit 30 or bit 31 set: an edit player, never one of Konami's
// (the block 0x40080000–0x400EFFFF once held IDs the studio made up for created players; it makes none any more, and an ID in
// it is read as no ID: pcRealId)
// every player game ID in the project (stored IDs and team-file links), recomputed at most once a second during an export
let _usedPid={at:0,set:null};function usedPlayerIds(){if(_usedPid.set&&Date.now()-_usedPid.at<1000)return _usedPid.set;const u=new Set();
  teamsArr().forEach(t=>(t.players||[]).forEach(p=>{if(+p.gameId)u.add(+p.gameId);if(p.ted&&+p.ted.pid)u.add(+p.ted.pid)}));_usedPid={at:Date.now(),set:u};return u}

// Write a studio team into a team file. Players keep their game IDs; a player from another known file brings his record along;
// with baseRec, players no file knows are created from that record. generic: the template belongs to another club, so its
// banners, sponsor boards and manager photo are cleared and the team ID is replaced.
TED.build=async(team,tpl,opts={})=>{
  const raw=TED.unb64(tpl.b64);const d=TED.decrypt(raw);const T=TED.TEAM,A=TED.ASSIGN;const warn=[],created=[];const sch=tpl.scheme||'srafols';
  if(opts.teamId){TED.writeNum(d,T,4,opts.teamId);TED.writeNum(d,A,4,opts.teamId)}
  if(opts.generic){d.fill(0,439,503);d.fill(0,569,668);d.fill(0,TED.IMG.manager,TED.IMG.manager+TED.IMGLEN)}
  if(opts.teamInfo!==false){TED.writeStr(d,T+104,70,team.name);if(team.short)TED.writeStr(d,T+174,4,String(team.short).toUpperCase().slice(0,3));if(team.stadium)TED.writeStr(d,T+178,120,team.stadium)}
  if(opts.emblemFile)TED.writeStr(d,TED.IMG.emblem,TED.IMGLEN,opts.emblemFile);
  if(opts.managerFile)TED.writeStr(d,TED.IMG.manager,TED.IMGLEN,opts.managerFile);
  if(opts.kitFiles)opts.kitFiles.forEach((n,k)=>{if(n&&k<5)TED.writeStr(d,1766+132*k,TED.IMGLEN,n)});// kit textures: home, away, GK, third, spare
  // references removed in the health check ("Images the team files name but the option file doesn't include"): the name is
  // blanked and the slot is marked as the game's own, the way the option file marks one (crest and stadium number 0xFFFF, a
  // blank kit header)
  (opts.clearImgs||[]).forEach(k=>{const m=/^kit:(\d)$/.exec(k);
    if(m){const o=1766+132*+m[1];d.fill(0,o,o+TED.IMGLEN);d.fill(0,o-20,o)}
    else if(k==='emblem'){d.fill(0,TED.IMG.emblem,TED.IMG.emblem+TED.IMGLEN);TED.writeNum(d,T+8,2,0xFFFF)}
    else if(k==='manager')d.fill(0,TED.IMG.manager,TED.IMG.manager+TED.IMGLEN);
    else if(k==='stadium')TED.writeNum(d,T+12,2,0xFFFF)});// the stadium and sponsor names themselves are blanked by their own writer
  if(opts.emptySquad)for(let i=0;i<40;i++){const o=TED.PSTART+i*TED.PLEN;d.fill(0,o,o+TED.PLEN);TED.writeNum(d,A+4+i*4,4,0);TED.writeNum(d,A+164+i*2,2,0)}
  if(opts.keepSquad||opts.emptySquad)return{bytes:await TED.encrypt(d,raw),warn,created};// no team in the studio: a team-info file, imported with player and squad data off
  const teamId=opts.teamId||tpl.teamId;const keep=[],incoming=[],pids=new Set();
  (team.players||[]).forEach(p=>{
    if(p.ted&&p.ted.pid&&p.ted.rec){if(pids.has(p.ted.pid)){warn.push(p.name+': same game player listed twice, kept once');return}pids.add(p.ted.pid);(p.ted.team===tpl.teamId&&!opts.generic?keep:incoming).push(p);return}
    if(!NEW_IDS_TESTED||!opts.baseRec){warn.push(p.name+': left out, no game file has him. The studio writes no player under an ID the game does not already hold: give him a free ID the game has (Health check → Allocate free IDs)');return}
    // a player with a known game ID (Konami's ID, the same in PES 2021 and eFootball) can be written under it, which updates that
    // game player in place; otherwise he is created as a new edit player
    // RULE (rule book, "Never a made-up ID"): only an ID that is not the studio's making: an edit player's own ID, or with realIds a
    // known game ID. No computed or bumped number: a player without one is left out, as one no game file has
    const own=+p.gameId&&pcRealId(p.gameId)&&!pids.has(+p.gameId)&&(isEditId(p.gameId)||opts.realIds&&validGameId(p.gameId))?+p.gameId:0;
    if(!own){warn.push(p.name+': left out, he has no game ID (the studio never makes one up: give him a free ID the game has, Health check → Allocate free IDs)');return}
    const pid=own;pids.add(pid);
    const rec=TED.unb64(opts.baseRec);TED.writeNum(rec,0,4,pid);TED.writeNum(rec,4,4,0);
    if(+p.countryId)TED.set(rec,TED.F.countryId1,+p.countryId);// nationality, by the game's country code
    incoming.push(Object.assign({},p,{ted:{pid,team:teamId,slot:-1,rec:TED.b64(rec)}}));created.push(p.name)});
  // The squad order table (40 bytes at ASSIGN+768): the places of the squad in the order the game's squad list shows
  // them (the photo of 22 November matches it place for place). The game shows a place only if this table lists it: a place the table leaves out is drawn as
  // an empty "---" row, with the player's data intact. 460 of the option file's team files list all 40 places; 185 list only
  // the places their squad had and pad with 0xFF, so a squad that grew showed its new places empty (PS5, 2026-11-22: West
  // Bromwich Albion, 21 → 26, the last five places empty whoever sat there). So the table is written again below: each
  // player keeps his turn in the order (found by his ID), and every place not listed yet follows.
  const ORD=A+768,tplOrd=[...d.subarray(ORD,ORD+40)],tplAll=tplOrd.every(v=>v<40),tplPid=tplOrd.filter(v=>v<40).map(v=>TED.readNum(d,A+4+v*4,4));
  const slots=new Array(40).fill(null);
  keep.forEach(p=>{const s=p.ted.slot;if(s>=0&&s<40&&!slots[s])slots[s]=p;else incoming.push(p)});
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
      if(p.codeSet&&+p.countryId)s('countryId1',+p.countryId);// a player who took over another's code (Game codes) brings his nationality
      s('registeredPosition',Math.max(0,TED.POS.indexOf(p.pos)));
      Object.entries(TED.ATTR).forEach(([k,a])=>s(k,p.attrs[a]));
      s('weakFootUsage',p.wfUsage-1);s('weakFootAccuracy',p.wfAcc-1);s('form',p.form-1);s('injuryResistance',p.injury-1);
      s('playingStyle',Math.max(0,TED.STYLE.indexOf(p.style==='None'?null:p.style)));
      Object.entries(TED.SKILL).forEach(([k,n])=>s(k,p.skills.includes(n)?1:0));Object.entries(TED.COM).forEach(([k,n])=>s(k,p.comStyles.includes(n)?1:0));
      Object.entries(TED.PPOS).forEach(([k,pos])=>s(k,TED.raw(pos===p.pos?'A':(p.playables[pos]||''),sch)))}
    d.set(rec,o);TED.writeNum(d,A+4+i*4,4,p.ted.pid);TED.writeNum(d,A+164+i*2,2,+p.number||0)}
  {const place=new Map(),n=slots.filter(Boolean).length,ord=[];slots.forEach((p,i)=>{if(p)place.set(+p.ted.pid,i)});
    // a player still in the squad keeps his turn; where the player of a turn has left, whoever now sits in that place takes
    // it, so the list keeps its shape (the new goalkeeper in the old one's place stays where the goalkeeper was)
    tplOrd.filter(v=>v<40).forEach((v,k)=>{const pid=tplPid[k];let i=pid?place.get(pid):undefined;if(i===undefined&&v<n)i=v;if(i!==undefined&&!ord.includes(i))ord.push(i)});
    for(let i=0;i<n;i++)if(!ord.includes(i))ord.push(i);
    if(tplAll)for(let i=n;i<40;i++)ord.push(i);// a file that listed all 40 places keeps doing so
    for(let i=0;i<40;i++)d[ORD+i]=i<ord.length?ord[i]:0xFF}
  return{bytes:await TED.encrypt(d,raw),warn,created};
};

/* ----- which file a team or competition is written from ----- */
// serial file names, made from the in-game ID: team 100 -> E_000100.png, M_000100.png, 01_EPL_000100.ted; competition 17 -> C_0017.png, C_0017.ced.
// A competition without a known ID keeps the serial stored in fileTag (X01, X02 …).
const teamTag=t=>t.fileTag||(+t.gameId?String(+t.gameId).padStart(6,'0'):'');
const compTag=c=>c.fileTag||(+c.gameId?String(+c.gameId).padStart(4,'0'):'');
const builtinTeams=()=>((window.PES_TEMPLATES||{}).teams)||[];
const builtinComps=()=>((window.PES_TEMPLATES||{}).comps)||[];
const GENERIC_TEAM_ID=71212;// the fullest sample team (40 created players) is the base for teams without a file
const BI_SCHEME=new Map();
function biScheme(x){if(!BI_SCHEME.has(x.teamId))BI_SCHEME.set(x.teamId,TED.parse(TED.unb64(x.b64)).scheme);return BI_SCHEME.get(x.teamId)}
function biTeamFor(t){const gid=+t.gameId||0;const L=builtinTeams();if(gid)return L.find(x=>x.teamId===gid)||null;
  const nat=isNationalTeam(t);return L.find(x=>!!x.national===nat&&[t.name,t.gameSlot].some(n=>n&&nameScore(x.name,n)===1))||null}
// sync: says where the file comes from; load() fetches the bytes (base64)
function teamFileInfo(t){
  if(t.sameAs)return null;// a cup copy of a team is written once, as its league copy: never a file of its own
  const own=S.teds[t.id];if(own)return{kind:'own',generated:!!own.generated,label:(own.generated?'generated team file':'imported team file')+(own.file?' '+own.file:''),teamId:own.tedTeamId,scheme:own.scheme,key:own.ref,load:()=>tedTemplateBytes(own)};
  const b=biTeamFor(t);if(b)return{kind:'builtin',label:'built-in file '+b.file,teamId:b.teamId,scheme:biScheme(b),key:'bi:'+b.teamId,load:async()=>b.b64};
  const g=builtinTeams().find(x=>x.teamId===GENERIC_TEAM_ID)||builtinTeams()[0];const gid=+t.gameId||0;
  if(gid&&g)return{kind:'generic',label:'generic template ('+g.file+') with game ID '+gid,teamId:gid,scheme:biScheme(g),key:'bi:'+g.teamId,load:async()=>g.b64};
  return null}
function compFileInfo(c){
  if(c.ced&&c.ced.b64)return{kind:'own',label:'imported competition file'+(c.ced.file?' '+c.ced.file:''),compId:c.ced.compId,b64:c.ced.b64};
  const gid=+c.gameId||0;const L=builtinComps();
  const b=gid?L.find(x=>x.compId===gid):L.find(x=>x.international?!!c.worldCup:!c.worldCup&&(!c.country||!x.country||norm(c.country)===norm(x.country))&&[c.name,c.gameSlot].some(n=>n&&nameScore(x.name,n)===1));
  if(b)return{kind:'builtin',label:'built-in file '+b.file,compId:b.compId,b64:b.b64};
  if(gid&&L.length){const g=L.find(x=>!x.international)||L[0];return{kind:'generic',label:'generic template ('+g.file+') with game ID '+gid,compId:gid,b64:g.b64}}
  return null}

// player records per file, cached
const GF_RECS=new Map();
function recsOf(key,b64){if(GF_RECS.has(key))return GF_RECS.get(key);const d=TED.decrypt(TED.unb64(b64));const byPid=new Map(),list=[];
  for(let i=0;i<TED.MAXP;i++){const o=TED.PSTART+i*TED.PLEN;const pid=TED.readNum(d,o,4);if(!pid)continue;const rec=d.subarray(o,o+TED.PLEN);
    const x={pid,slot:i,rec:TED.b64(rec),name:TED.readStr(rec,54,61)};byPid.set(pid,x);list.push(x)}
  const r={byPid,list};GF_RECS.set(key,r);return r}
async function pcBookRec(pid,skipRef){const e=((S.settings.codeBook||{}).player||{})[pid];if(!e||!e.ref||e.ref===skipRef)return null;try{return recsOf(e.ref,await tedTemplateBytes({ref:e.ref})).byPid.get(pid)||null}catch(x){return null}}
// Only a real game file counts: a team file the studio generated for a club without one holds made-up players under
// made-up IDs. The game has none of them, and refuses a team file that lists one.
async function recFromAnyFile(pid,teamId){const o=Object.values(S.teds).find(t=>t.tedTeamId===teamId&&!t.generated)||null;if(o){const r=recsOf(o.ref,await tedTemplateBytes(o)).byPid.get(pid);if(r)return r}
  // a player code given on Game codes: the file his record is in, kept in the code book (its club may be gone from the studio)
  {const r=await pcBookRec(pid,o&&o.ref);if(r)return r}
  if(o)return null;
  const b=builtinTeams().find(x=>x.teamId===teamId);return b?recsOf('bi:'+b.teamId,b.b64).byPid.get(pid)||null:null}
// National players and their clubs (rule book "International teams"). In the game a player has one ID, shared by his club and his
// country. A club player whose ID the game has ONLY in a national team's file (his club's file never held him: he was added to
// the club in the studio) is the same man when the names agree, so the club's file is written with that record.
let _NATG={r:-1,T:null,v:null};
function natGameIds(){if(_NATG.r===Store.rev&&_NATG.T===S.teams)return _NATG.v;const v=new Set(teamsArr().filter(t=>!t.sameAs&&+t.gameId&&isNationalTeam(t)).map(t=>+t.gameId));_NATG={r:Store.rev,T:S.teams,v};return v}
// the game record of this ID, when every file that holds it is a national team's and the name on it is his
function natOnlyRec(p,id){if(!id)return null;const g=pcGame().get(id);if(!g||!g.files.length||!samePerson(g.name,p.name))return null;const N=natGameIds();return g.files.every(f=>N.has(f.team))?g:null}
async function natShareRec(t,p){const id=typeof pcRealId==='function'&&pcRealId(p.gameId)?+p.gameId:0;if(!id||p.codeOff||isNationalTeam(t))return null;
  try{if(!pcReady())await pcLoadAll();const g=natOnlyRec(p,id);if(!g)return null;const f=g.files[0];const r=recsOf(f.ref,await tedTemplateBytes({ref:f.ref})).byPid.get(id);return r?{r,team:f.team}:null}catch(e){return null}}
// each studio player gets the game record he will be written from: his own, one matched by name in this team's file, or none (created)
async function teamPlayersFor(t,src,b64){const real=recsOf(src.key,b64);
  // a generated file is only a shell to write into: its player records are not players the game has, so none is "his record"
  const own=src.generated?{byPid:new Map(),list:[]}:real;const used=new Set();const st={kept:0,moved:0,named:0,none:0};const players=[];
  for(const p of t.players||[]){const q=clone(p);q.ted=null;if(p.codeOff&&!(p.ted&&+p.ted.pid)){st.none++;players.push(q);continue}
    if(p.ted&&p.ted.pid&&!used.has(p.ted.pid)){let home=src.kind!=='generic'&&p.ted.team===src.teamId;let r=home?own.byPid.get(p.ted.pid):await recFromAnyFile(p.ted.pid,p.ted.team);
      // his record isn't in the file being written: this is the team slot's second file (the option file has two files for 29
      // slots, 9 with different squads), or his code was given from it (Game codes → Players). Both files get the team's
      // squad, so the record comes from the team's other file.
      if(home&&!r){r=await recFromAnyFile(p.ted.pid,p.ted.team)||(p.codeSet?await pcBookRec(p.ted.pid,src.key):null);home=false}
      if(r){q.ted={pid:p.ted.pid,team:home?src.teamId:p.ted.team,rec:r.rec,slot:home?r.slot:-1};used.add(r.pid);home?st.kept++:st.moved++}}
    if(!q.ted&&src.kind!=='generic'){const r=own.list.find(x=>!used.has(x.pid)&&samePlayer(x.name,p.name));if(r){q.ted={pid:r.pid,team:src.teamId,rec:r.rec,slot:r.slot};used.add(r.pid);st.named++}}
    // a club player the game has only in his country's file: club and country share one ID, so he is written from that record
    if(!q.ted){const n=await natShareRec(t,p);if(n&&!used.has(n.r.pid)){q.ted={pid:n.r.pid,team:n.team,rec:n.r.rec,slot:-1};used.add(n.r.pid);st.moved++}}
    if(!q.ted)st.none++;players.push(q)}
  const g=builtinTeams().find(x=>x.teamId===GENERIC_TEAM_ID);
  return{players,stats:st,baseRec:(real.list[0]||(g?recsOf('bi:'+g.teamId,g.b64).list[0]:null)||{}).rec||null}}

// The players no game file has, for the health check and Game codes: the same answer as the export notes, worked out with the
// export's own teamPlayersFor. Display only: nothing here is used by an export. Only clubs with a player that has no game
// record are read (one team file each), in the background, only while Health check or Game codes is open, and again only
// when the squad changes.
const NOFILE=new Map();let NOFILE_RUN=null;let PCV=0;// PCV: counts every change to what is known about player codes
const nfOn=()=>/^#(health|codes)/.test(location.hash||'');
// a generated team file is rewritten under a new reference whenever its team is saved, so it counts as "generated", not by its reference
const nfKey=t=>{const r=S.teds[t.id]||{};return (t.players||[]).map(p=>(p.id||'')+':'+((p.ted&&p.ted.pid)||'')+':'+((p.ted&&p.ted.team)||'')+':'+p.name).join(',')+'|'+(r.generated?'generated':r.ref||'')+'|'+(t.gameId||'')};
// RULE (the user, 2026-11-28): the players of a team that has not been given a game ID are left out of the health check's game ID
// checks (no game ID, the game has him in another team's file, linked to a different record, shared IDs, same name with different
// IDs). The team is not in the game, so its players' IDs mean nothing yet; the team's own row ("has no in-game team ID") stays.
// They are checked again as soon as the team gets an ID, or the player is moved to a team that has one: every check goes by the
// team that lists him. A team has a game ID when it holds one, or when its own or built-in team file gives it one.
const teamHasGameId=t=>!!t&&!t.noCode&&(+t.gameId>0||(!t.sameAs&&!!teamFileInfo(t)));
const nfTeams=()=>teamsArr().filter(t=>!t.sameAs&&teamHasGameId(t)&&(t.players||[]).length);
// a club exactly as its option-file file has it lists only that file's players: nothing to read
const nfSame=t=>{try{return !!(t.of&&t.of.hash&&!t.codeSet&&ofHash(t)===t.of.hash&&(t.players||[]).every(p=>p.ted&&+p.ted.pid))}catch(e){return false}};
// null until the background check has done this team; then its players no game file has, as [{id,name}]
function noFileOf(t){const c=NOFILE.get(t.id);return c&&c.k===nfKey(t)?c.list:null}
// force: run to the end whatever page is open (a team taking a code needs the answer now)
function noFileScan(force){if(NOFILE_RUN)return NOFILE_RUN;if(!force&&!nfOn())return null;let changed=false;const todo=nfTeams().filter(t=>!noFileOf(t));
  const one=async t=>{const k=nfKey(t);const list=[],used=[];
    if(nfSame(t))t.players.forEach(p=>used.push([+p.ted.pid,p.id]));
    else{try{const src=teamFileInfo(t);if(src){const m=await teamPlayersFor(t,src,await src.load());m.players.forEach(q=>{if(q.ted)used.push([+q.ted.pid,q.id]);else list.push({id:q.id,name:q.name})})}}catch(e){}await new Promise(r=>setTimeout(r,0))}
    // only a different answer counts as a change: checking a squad again with the same result must not redraw the page
    const was=NOFILE.get(t.id),sig=x=>x?x.list.map(y=>y.id).join(',')+'|'+x.used.map(u=>u.join(':')).join(','):null;const now={k,list,used};NOFILE.set(t.id,now);if(sig(was)!==sig(now)){PCV++;changed=true}};
  const work=async()=>{while(todo.length&&(force||nfOn()))await one(todo.shift())};
  NOFILE_RUN=Promise.all([work(),work(),work(),work()]).catch(()=>{}).finally(()=>{NOFILE_RUN=null;if(changed&&nfOn())setTimeout(rerender,0)});return NOFILE_RUN}
// {bad:[[team,[{id,name}…]]…], scan:true while some club is still to be checked}; starts the check when one is
function noFileFind(){const bad=[];let scan=false;nfTeams().forEach(t=>{const L=noFileOf(t);if(!L)scan=true;else if(L.length)bad.push([t,L])});if(scan)noFileScan();return{bad,scan}}

/* ----- Player codes (Game codes → Players; rule book "Player codes") -----
   A player's code is his game ID. The game has a player only when a game file has a record under his ID, and a team file can
   only list players the game has. So a player no game file has is given the code of one the game has that no team uses any
   more: his record is then written over that player's (name, age, height, position, ratings; the look stays), and the game
   takes him. Giving a code only sets the player's link to that record (p.ted, p.gameId): the export then writes him like any
   other player a file has. The codes are read from the team files themselves (the option file's, also of teams deleted since). */
const PC={files:new Map(),run:null,all:false,n:0,of:0};
function pcFileList(){const m=new Map();const add=r=>{if(r&&!r.generated&&+r.tedTeamId&&r.ref&&!m.has(r.ref))m.set(r.ref,{ref:r.ref,team:+r.tedTeamId,club:r.origName||(S.teams[r.id]||{}).name||''})};
  // Every team file of the option files is in the game (the game imported them all), so the players they list exist, whatever
  // happened to their team in the studio since: a team deleted, one that lost or changed its code, a code's second file. Read from
  // the option files by code (DATABASE_RULES 5a), so it needs no baseline snapshot: a deleted team's players are free IDs.
  const copies=()=>{const R=OF_RD.r;if(!R)return;R.T.forEach(L=>{const use=ofPickOf(L,'ofPick');L.forEach(x=>{if(!m.has(x.ref))m.set(x.ref,{ref:x.ref,team:x.code,club:x.P.team.name,copy:x!==use})})})};
  Object.values(S.teds||{}).forEach(add);const d=S.settings.baseline?S.snapData[S.settings.baseline]:null;if(d)Object.values(d.teds||{}).forEach(add);
  copies();
  return [...m.values()]}
async function pcLoadFile(f){if(PC.files.has(f.ref))return PC.files.get(f.ref);const recs=[];let ownCrest=false;
  try{const had=TED_CACHE.has(f.ref);const d=TED.decrypt(TED.unb64(await tedTemplateBytes({ref:f.ref})));if(!had)TED_CACHE.delete(f.ref);
    ownCrest=TED.readNum(d,TED.TEAM+8,2)===0xFFFF&&!TED.readStr(d,TED.IMG.emblem,TED.IMGLEN);// the option file leaves the game's own crest here
    for(let i=0;i<TED.MAXP;i++){const o=TED.PSTART+i*TED.PLEN;const pid=TED.readNum(d,o,4);if(!pid)continue;const rec=d.subarray(o,o+TED.PLEN);
      recs.push({pid,name:TED.readStr(rec,54,61),pos:TED.POS[TED.get(rec,TED.F.registeredPosition)]||''})}}catch(e){}
  const v=Object.assign({recs,ownCrest},f);PC.files.set(f.ref,v);PCV++;return v}
/* ----- Teams whose name the game fixes (rule book "A licensed team keeps the game's name", PS5 tests of 2026-11-22) -----
   A licensed team shows the game's own name whatever its team file says: Brøndby kept its name with a new name and a crest of
   its own in the file, and Brescia's code still shows Brescia although the option file calls it COMO 1907. An unlicensed team
   takes the file's name. The game doesn't say which teams are licensed, but the option file does: its makers left the game's
   own crest (crest number 0xFFFF, no crest image name) on the teams they could not rename. In 36 teams tested, every one whose
   file keeps the game's own crest kept its name, and every one with a crest of its own took the new name. So a code is
   "name fixed" when the option file's own file for it keeps the game's own crest. It is a sign, not the game's word: the
   wording says "is expected to". Known only once the team files are read (pcLoadAll). */
// Two signs, so two answers. 2: the option file's own file for the code keeps the game's own crest. 1: it doesn't, but four in
// five of the teams of its league in the game do, so the league is a licensed one and the option file's makers gave this team a
// crest anyway (COMO 1907 on Brescia's code, Serie B: the game still shows Brescia). 1 can be wrong (Cúcuta Deportivo's code in
// the Colombian league does show the option file's ATLÉTICO HUILA), so it is worded "may".
let _NF={v:-1,p:null,m:null,own:null,lg:null};
// One answer per league of the game (the user, 2026-11-24: "if one team changes name in a competition, every other team will";
// "make a relay to automatically tag them based on the What can change rules"). The sign is still the option file's own team
// files: a file that keeps the game's own crest is a licensed team's. A league is fixed when at least half of its codes that
// have a file carry that sign; then every code of the league is fixed, with or without a file (Monaco, Marseille and PSG in
// Ligue 1 have none and were unmarked; Inter and AC Milan in Serie A, Brescia, Cúcuta Deportivo were "may be"). The Thai League
// has no team file at all: Buriram United (1493) took another squad and kept its name (test 61), so the league is fixed.
// What a test showed for one team of a league decides the league, before the file sign (the user, 2026-11-25: "why is this team
// or any team in its league marked fixed? If one team can change, the whole league's teams will"). Colombian league: Cúcuta
// Deportivo's place showed the option file's ATLÉTICO HUILA (22 November), so no code of the league is fixed, although Santa Fe
// kept its name in test 30. Thai League: no team file at all; Buriram United (1493) kept its name with another squad (test 61).
const LEAGUE_NAMES_TESTED={'colombian-league':false,'thai-league':true};
function nameFixedMap(){if(_NF.v===PCV&&_NF.p===PES21_TEAMS)return _NF.m;const own=new Map();pcFileList().forEach(f=>{const x=PC.files.get(f.ref);if(x&&+f.team)own.set(+f.team,own.get(+f.team)||!!x.ownCrest)});
  const m=new Map(),lg=new Map();
  if(PES21_TEAMS){const by=new Map();PES21_TEAMS.forEach(t=>{const g=by.get(t.league)||by.set(t.league,{n:0,k:0}).get(t.league);if(own.has(+t.id)){g.n++;if(own.get(+t.id))g.k++}});
    by.forEach((g,key)=>lg.set(key,key in LEAGUE_NAMES_TESTED?LEAGUE_NAMES_TESTED[key]:g.n>0&&g.k*2>=g.n));PES21_TEAMS.forEach(t=>{if(lg.get(t.league))m.set(+t.id,2)})}
  else own.forEach((v,code)=>{if(v)m.set(code,2)});// until the game's team list is read: the file sign alone
  _NF={v:PCV,p:PES21_TEAMS,m,own,lg};return m}
const nameFixed=code=>+code>0?nameFixedMap().get(+code)||0:0;
// a league of the game whose teams keep the game's names (What can change: Team names and Which teams)
const leagueNamesFixed=key=>{nameFixedMap();return !!(_NF.lg&&_NF.lg.get(key))};
const NAME_FIXED_TIP='The game shows its own name for this team, whatever the team file says: its league is a licensed one (most of its teams keep the game\'s own crest in the option file), and the teams of a league all behave alike. Tested in the game on 22 November 2026: licensed teams kept their names, with their new players. Game codes, What can change, has its league.';
const NAME_MAYBE_TIP=NAME_FIXED_TIP;
const nameFixedTag=code=>nameFixed(code)===2?`<span class="tag t-mov" title="${esc(NAME_FIXED_TIP)}">name fixed</span>`:'';
const pesTeamName=code=>{const e=(PES21_TEAMS||[]).find(t=>+t.id===+code);return e?e.name:''};
// A team the game fixes is always in the game, under its own name: deleting it in the studio only leaves its file out, and the
// game goes on showing the team with whatever squad it last had (JUNIOR, deleted in the studio, was still in the game with its
// 29 players on 22 November 2026). So such a team, and a competition that holds one, can't be deleted (the user, 2026-11-22:
// "files of name fixed competition must not be deleted"). Its squad can still be changed, and it can be kept out of the export
// on purpose from Game codes. Make room never offers them either.
// The team the game has at a code: the one the option file's own file for that code holds, or one under the game's name. A club
// of the project put on a fixed code (Kalba on Monaco's) is not that team: the game will show it as Monaco, but in the studio it
// stays free to rename, move, delete or take another code.
const gameOwnTeam=t=>{if(!t||!+t.gameId||t.noCode)return false;const r=(S.teds||{})[t.id];if(r&&!r.generated&&+r.tedTeamId===+t.gameId)return true;const pn=pesTeamName(t.gameId);return !!pn&&(norm(pn)===norm(t.name)||nameScore(pn,t.name)>=0.6)};
const teamFixed=t=>!!t&&!t.sameAs&&!t.noCode&&nameFixed(t.gameId)===2&&gameOwnTeam(t);
const fixedReady=async()=>{if(S.settings.ofPkg){try{if(!pcReady())await pcLoadAll();await pes21Teams()}catch(e){}}};
{const _dt=ACT.delTeam;ACT.delTeam=async el=>{const t=S.teams[el.dataset.id];await fixedReady();
  if(teamFixed(t)){const pn=pesTeamName(t.gameId);toast(`${t.name} can't be deleted: the game always has this team${pn&&norm(pn)!==norm(t.name)?' ('+pn+')':''} under its own name. Change its players instead; deleting it here would only leave its file out of the export.`,'err');return}
  return _dt(el)};
 const _dc=ACT.delComp;ACT.delComp=async el=>{const c=S.comps[el.dataset.id];if(c){await fixedReady();const fx=compFixedTeams(c);
  if(fx.length){toast(`${c.name} can't be deleted: ${fx.length} of its teams are teams the game always has under its own names (${fx.slice(0,4).map(t=>t.name).join(', ')}${fx.length>4?', …':''}). Change their players instead.`,'err');return}}
  return _dc(el)}}
// A competition that can't be deleted (the World Cup, or one holding a team the game fixes) is never offered a Delete button,
// on its card, in the Competitions list or in Make room (the user, 2026-11-22). With an option file in use the answer needs its
// game files read (pcLoadAll); until then the button waits, so it never shows and then refuses.
const compFixedTeams=c=>teamsArr().filter(t=>t.compId===c.id&&teamFixed(t));
const compLockWhy=c=>{if(!c)return'';if(c.worldCup)return 'The World Cup is always kept: it holds every national team in the project.';  const fx=compFixedTeams(c);return fx.length?`${fx.length} of its teams ${fx.length===1?'is a team':'are teams'} the game always has under ${fx.length===1?'its own name':'their own names'} (${fx.slice(0,4).map(t=>t.name).join(', ')}${fx.length>4?', …':''}). Deleting the competition would only leave their files out; change their players instead.`:''};
let _fixLoad=null,_fixTried=false;// tried once: if the files can't be read, the button shows and the delete itself checks again
function compDelBtn(c,act='delComp',cls='sm danger',label='Delete'){if(!c)return'';
  if(!c.worldCup&&S.settings.ofPkg&&!pcReady()&&!_fixTried){if(!_fixLoad)_fixLoad=fixedReady().finally(()=>{_fixLoad=null;_fixTried=true;rerender()});return '<span class="small muted">checking…</span>'}
  const why=compLockWhy(c);return why?`<span class="tag t-upd" title="${esc(why)}">can't be deleted</span>`:`<button class="${cls}" data-act="${act}" data-id="${c.id}">${label}</button>`}
// the same for a team the game fixes (its team page)
function teamDelBtn(t,act='delTeam',cls='danger',label='Delete team'){if(!t)return'';
  if(S.settings.ofPkg&&!pcReady()&&!_fixTried){if(!_fixLoad)_fixLoad=fixedReady().finally(()=>{_fixLoad=null;_fixTried=true;rerender()});return '<span class="small muted">checking…</span>'}
  if(teamFixed(t)){const pn=pesTeamName(t.gameId);return `<span class="tag t-upd" title="${esc(`The game always has this team${pn&&norm(pn)!==norm(t.name)?' ('+pn+')':''} under its own name: deleting it here would only leave its file out of the export. Change its players instead.`)}">can't be deleted</span>`}
  return `<button class="${cls}" data-act="${act}" data-id="${t.id}">${label}</button>`}
const pcReady=()=>PC.all&&pcFileList().every(f=>PC.files.has(f.ref));
function pcLoadAll(){if(PC.run)return PC.run;if(pcReady())return Promise.resolve();let did=false;
  PC.run=(async()=>{try{if(S.settings.baseline&&!S.snapData[S.settings.baseline]){await loadSnap(S.settings.baseline);did=true}}catch(e){}
    try{if(S.settings.ofPkg&&!OF_RD.r){await ofRead();did=true}}catch(e){}// every option-file team file counts (pcFileList)
    const L=pcFileList().filter(f=>!PC.files.has(f.ref));PC.of=L.length;PC.n=0;let i=0;if(L.length||!PC.all)did=true;if(did)PCV++;
    const work=async()=>{while(i<L.length){await pcLoadFile(L[i++]);PC.n++;const e=document.getElementById('pc-prog');if(e)e.textContent=PC.n+' of '+PC.of+' team files'}};
    await Promise.all([work(),work(),work(),work(),work(),work()]);PC.all=true})().catch(()=>{}).finally(()=>{PC.run=null;if(did&&nfOn())setTimeout(rerender,0)});return PC.run}
// every player code the game has: pid -> {pid,name,pos,files:[{team,club,ref}]} (a player is in his club's file and his country's)
let _PCG={v:-1,g:null};
function pcGame(){if(_PCG.v===PCV)return _PCG.g;const g=new Map();
  pcFileList().forEach(f=>{const x=PC.files.get(f.ref);if(!x)return;x.recs.forEach(r=>{let e=g.get(r.pid);if(!e){e={pid:r.pid,name:r.name,pos:r.pos,files:[]};g.set(r.pid,e)}e.files.push(f)})});_PCG={v:PCV,g};return g}
// who holds each code in the studio now: pid -> {t,p}. A checked squad holds the codes the export writes it with; a squad not
// checked yet holds every ID its players carry (never too few: a held code is never given away)
let _PCH={v:-1,at:0,h:null};
function pcHeld(){if(_PCH.v===PCV&&Date.now()-_PCH.at<400)return _PCH.h;const h=new Map();
  teamsArr().filter(t=>!t.sameAs&&!t.noCode).sort((a,b)=>isNationalTeam(a)-isNationalTeam(b)).forEach(t=>{const c=NOFILE.get(t.id);
    if(c&&c.k===nfKey(t)){const by=new Map((t.players||[]).map(p=>[p.id,p]));c.used.forEach(([pid,id])=>{if(!h.has(pid))h.set(pid,{t,p:by.get(id)})})}
    else(t.players||[]).forEach(p=>[p.ted&&+p.ted.pid,validGameId(p.gameId)?+p.gameId:0].forEach(pid=>{if(pid&&!h.has(pid))h.set(pid,{t,p})}))});
  _PCH={v:PCV,at:Date.now(),h};return h}
// the players with no code: [{t,p}]
function pcNeedy(){const out=[];noFileFind().bad.forEach(([t,L])=>{const by=new Map((t.players||[]).map(p=>[p.id,p]));L.forEach(x=>{const p=by.get(x.id);if(p)out.push({t,p})})});return out}
const pcLine=pos=>pos==='GK'?'G':['CB','LB','RB'].includes(pos)?'D':['DMF','CMF','LMF','RMF','AMF'].includes(pos)?'M':'A';
// The code each player with none should take: playerId -> {g, why}. In order: his own ID when a file has it and no one uses
// it (own); a national-team player shares his club record (club); a free player of the same name (name); a free player of
// the team the game has at his club's code, same position first (team); then, unless ownOnly, a free player of a club no
// longer in the game (gone), then any free player (free).
function pcPlanMake(need,ownOnly){const G=pcGame(),H=pcHeld(),taken=new Set(),out=new Map();if(!G.size||!need.length)return out;
  const free=pid=>G.has(pid)&&!H.has(pid)&&!taken.has(pid);const live=new Set(teamsArr().filter(t=>!t.sameAs&&!t.noCode&&+t.gameId).map(t=>+t.gameId));
  // byLeague: the free records of every code of a game league, so a club whose own code has run out takes the IDs its league freed
  // (a league that replaced another, the Saudi league on MLS's codes: the new players use MLS's freed IDs; the user, 2026-11-22)
  const byTeam=new Map(),byName=new Map(),byLeague=new Map(),rest=[],gone=[];
  G.forEach(g=>{if(H.has(g.pid))return;g.files.forEach(f=>{(byTeam.get(f.team)||byTeam.set(f.team,[]).get(f.team)).push(g);const lk=typeof slotLeagueOf==='function'?slotLeagueOf(f.team):'';if(lk)(byLeague.get(lk)||byLeague.set(lk,[]).get(lk)).push(g)});const k=norm(g.name);if(k&&!byName.has(k))byName.set(k,g);rest.push(g);if(!g.files.some(f=>live.has(f.team)))gone.push(g)});
  let clubBy=null;const clubName=()=>{if(clubBy)return clubBy;clubBy=new Map();H.forEach((x,pid)=>{if(x.p&&!isNationalTeam(x.t)&&G.has(pid)){const k=norm(x.p.name);if(k&&!clubBy.has(k))clubBy.set(k,pid)}});return clubBy};
  const pick=(L,p)=>{const ln=pcLine(p.pos);let b=null,c=null;for(const g of L){if(!free(g.pid))continue;if(g.pos===p.pos)return g;if(!b&&pcLine(g.pos)===ln)b=g;if(!c)c=g}return b||c};
  const inSquad=new Map();const squad=t=>{let s=inSquad.get(t.id);if(!s){const c=NOFILE.get(t.id);s=new Set(c?c.used.map(u=>u[0]):[]);inSquad.set(t.id,s)}return s};
  need.forEach(({t,p})=>{let g=null,why='';const own=byTeam.get(+t.gameId)||[];
    for(const id of [p.ted&&+p.ted.pid,validGameId(p.gameId)?+p.gameId:0])if(!g&&id&&free(id)){g=G.get(id);why='own'}
    if(!g&&isNationalTeam(t)){const pid=clubName().get(norm(p.name));if(pid&&!squad(t).has(pid)){g=G.get(pid);why='club';squad(t).add(pid)}}
    if(!g){const x=own.find(o=>free(o.pid)&&samePlayer(o.name,p.name))||byName.get(norm(p.name));if(x&&free(x.pid)){g=x;why='name'}}
    if(!g){g=pick(own,p);if(g)why='team'}
    if(!g&&!isNationalTeam(t)){const lk=typeof slotLeagueOf==='function'?slotLeagueOf(+t.gameId):'';if(lk&&!/^national-teams-/.test(lk)){g=pick(byLeague.get(lk)||[],p);if(g)why='league'}}
    if(!g&&!ownOnly){g=pick(gone,p);if(g)why='gone'}
    if(!g&&!ownOnly){g=pick(rest,p);if(g)why='free'}
    if(g){if(why!=='club')taken.add(g.pid);out.set(p.id,{g,why})}});
  return out}
let _PCP={k:'',m:null};
function pcPlan(){const need=pcNeedy();const k=PCV+'|'+need.length+'|'+(need[0]?need[0].p.id:'')+'|'+teamsArr().length+'|'+compsArr().length;if(_PCP.k!==k)_PCP={k,m:pcPlanMake(need,false)};return _PCP.m}
const pcFileOf=(g,t)=>g.files.find(f=>f.team===+t.gameId)||g.files[0];
// A player who has an ID is never given another player's ID (the user, 2026-11-21): only his own record, or the record he has
// at his club (a national team's player), is suggested. Anything else comes from looking his team up (pfSug) or from a choice by hand.
// An ID the studio made up for a created player (newPid, 0x40080000–0x400EFFFF) is a placeholder, not a game ID: a player who has
// only that (one taken off a shared game ID, for example) is a player with no game ID.
const pcRealId=v=>+v>0&&!(+v>=EDIT_LO&&+v<=EDIT_HI);
// "Has an ID" means an ID the game knows: one a game file holds a player under (the user, 2026-11-21). A number that only a source
// gave him (eFootball's ID for a player the option file doesn't have: every new player of a pulled or Live-Updated squad) is
// not a game ID, so he is a player with no game ID and takes a free one.
// The player under that ID must be him: eFootball's numbers and the option file's can meet by chance (Callum Styles' eFootball
// ID is M. BROWNE's in the 2026-27 file).
const pcOwnRec=p=>{const G=pcGame();for(const v of [p.ted&&p.ted.pid,p.gameId]){const g=pcRealId(v)&&G.get(+v);if(g&&samePerson(g.name,p.name))return g}return null};
const pcHasId=p=>!!pcOwnRec(p);
const pcMay=(p,s)=>!!s&&(!pcHasId(p)||s.why==='own'||s.why==='club');
const pcWhy=s=>s.why==='own'?'Relink his own record':s.why==='club'?'Use his team record':'Take over '+s.g.name;
const pcWhyNote=(s,t)=>s.why==='own'?'his own record, in '+pcFileOf(s.g,t).club+'\'s file':s.why==='club'?'the record he has at his team':s.why==='name'?'a free player of the same name ('+pcFileOf(s.g,t).club+')':s.why==='team'?'a free player the game has at this team\'s code':s.why==='league'?'a free player of this team\'s league ('+pcFileOf(s.g,t).club+', freed when it left)':s.why==='gone'?'a free player of a team no longer in the game ('+pcFileOf(s.g,t).club+')':'a free player ('+pcFileOf(s.g,t).club+')';
// give / take a code. Only the link changes; pcFlush saves the squads touched
const PC_DIRTY=new Set();
function pcGive(t,p,s){const g=s.g,f=pcFileOf(g,t);delete p.codeOff;if(!p.codeWas)p.codeWas={gameId:p.gameId||'',ted:p.ted?clone(p.ted):null};
  p.ted={pid:g.pid,team:f.team,slot:-1};p.gameId=g.pid;p.codeSet=true;
  codeBook('player')[g.pid]={ref:f.ref,team:f.team,name:g.name,club:f.club};// where his record is, also once that team is gone from the studio
  const c=NOFILE.get(t.id);if(c){c.list=c.list.filter(x=>x.id!==p.id);c.used.push([g.pid,p.id]);c.k=nfKey(t)}PCV++;PC_DIRTY.add(t.id)}
function pcLose(t,p){const w=p.codeWas;if(p.codeSet&&w){p.ted=w.ted||null;p.gameId=w.gameId||'';delete p.codeWas}else{p.codeWas={gameId:p.gameId||'',ted:p.ted?clone(p.ted):null};p.ted=null}
  delete p.codeSet;NOFILE.delete(t.id);PCV++;PC_DIRTY.add(t.id)}
function pcFlush(){PC_DIRTY.forEach(id=>{if(S.teams[id])saveTeam(S.teams[id])});PC_DIRTY.clear();saveSettings()}
const pcFind=id=>{const [ti,pi]=String(id||'').split('|');const t=S.teams[ti],p=t&&(t.players||[]).find(x=>x.id===pi);return p?{t,p}:null};
// the suggested code for each of these players ("team|player" ids), all from one plan so no code is given twice
function pcGiveMany(ids){const P=pcPlan();let n=0;ids.forEach(id=>{const x=pcFind(id);const s=x&&P.get(x.p.id);if(s){pcGive(x.t,x.p,s);n++}});pcFlush();return n}
// a team that takes a code: its players with none take over the free players the game has at that code
async function pcTeamTake(x){try{if(!x||!(x.players||[]).length||!+x.gameId)return '';
    for(let i=0;i<3&&nfTeams().some(t=>!noFileOf(t));i++)await noFileScan(true);
    try{if(S.settings.baseline)await loadSnap(S.settings.baseline)}catch(e){}PCV++;
    for(const f of pcFileList().filter(f=>f.team===+x.gameId))await pcLoadFile(f);
    // the background check may not have reached this team yet: then its players no game file has are worked out here
    const G0=pcGame();const L=noFileOf(x)||(x.players||[]).filter(p=>{const id=+(p.ted&&p.ted.pid)||+p.gameId||0;return !id||!G0.has(id)}).map(p=>({id:p.id,name:p.name}));if(!L.length)return '';const by=new Map(x.players.map(p=>[p.id,p]));const need=L.map(o=>({t:x,p:by.get(o.id)})).filter(o=>o.p);
    const P=pcPlanMake(need,true);let n=0;histLabel('Game codes: '+x.name+' takes over the players at code '+x.gameId,'Edit',()=>{need.forEach(o=>{const s=P.get(o.p.id);if(s){pcGive(x,o.p,s);n++}});pcFlush()});
    const r=need.length-n;return `; ${n} of its players took over players the game has there${r?' ('+r+' still have no code: Game codes → Players)':''}`}catch(e){console.error(e);return ''}}

/* ----- images ----- */
async function pngDims(blob){try{const u=new Uint8Array(await blob.slice(0,24).arrayBuffer());if(u[1]!==0x50||u[2]!==0x4e||u[3]!==0x47)return null;
  const be=o=>((u[o]<<24)|(u[o+1]<<16)|(u[o+2]<<8)|u[o+3])>>>0;return{w:be(16),h:be(20)}}catch(e){return null}}

/* ----- the connection check: run on the built package, again whenever a file is ticked or unticked ----- */
function pkgCheck(b){const items=[];const add=(lvl,msg,list)=>items.push({lvl,msg,list:list||[]});
  const on=b.files.filter(f=>f.include);const byDirName=new Map();on.forEach(f=>byDirName.set(f.path.toLowerCase(),f));
  const dirOf=p=>p.slice(0,p.lastIndexOf('/')+1);const sz=S.settings.sizes;
  // the game files themselves
  const games=on.filter(f=>f.kind==='ted'||f.kind==='ced');const dmg=[],badName=[],lost=[],wrongRef=[],oddSize=[];let linked=0;
  games.forEach(f=>{const m=f.meta,v=m.verify||{};const what=(f.kind==='ted'?'':'competition ')+m.name;
    if(!v.hashOK||!v.sizeOK||v.type!==f.kind)dmg.push(what+' ('+f.path+')');
    if(norm(v.name)!==norm(m.expect.name))badName.push(what+': file says "'+v.name+'"');
    [['emblem','emblem'],['manager','manager photo']].forEach(([k,l])=>{const want=m.expect[k];if(want==null)return;
      if(want&&v[k]!==want){wrongRef.push(what+': '+l+' field holds "'+v[k]+'", expected "'+want+'"');return}
      const ref=v[k];if(!ref){return}
      const img=byDirName.get((dirOf(f.path)+ref).toLowerCase());
      if(!img){if(want)lost.push(what+': '+l+' '+ref+' is not in '+dirOf(f.path)+' (unticked?)');return}
      linked++;const exp=k==='emblem'?(f.kind==='ced'?sz.comp:sz.emblem):sz.manager;if(img.dims&&(img.dims.w!==exp||img.dims.h!==exp))oddSize.push(ref+' is '+img.dims.w+'×'+img.dims.h+' (PES expects '+exp+'×'+exp+')')})});
  if(dmg.length)add('err',dmg.length+' game file'+(dmg.length>1?'s fail':' fails')+' the checksum or size test and would be rejected by PES',dmg);
  if(badName.length)add('err','Name written into the file does not read back',badName);
  if(wrongRef.length)add('err','Image name inside the file does not match the exported image',wrongRef);
  if(lost.length)add('err','Image a game file points to is missing from its folder',lost);
  const dup=(kind,label)=>{const g=new Map();games.filter(f=>f.kind===kind).forEach(f=>{const k=f.meta.gameId;g.set(k,(g.get(k)||[]).concat(f.meta.name))});
    const bad=[...g].filter(([,v])=>v.length>1).map(([k,v])=>'Game ID '+k+': '+v.join(', '));if(bad.length)add('err','Two '+label+' files overwrite the same in-game '+label,bad)};
  dup('ted','team');dup('ced','competition');
  if(oddSize.length)add('warn','Image size differs from what PES expects (it may be rejected or stretched)',oddSize);
  // file names
  const longN=on.filter(f=>f.path.startsWith('WEPES/')||/^STAGE\d+\/WEPES\//.test(f.path)).map(f=>f.path.split('/').pop()).filter(n=>n.length>PES_NAME_MAX+4||/[^\x20-\x7e]/.test(n));
  if(longN.length)add('err','File names PES may not show (too long or not plain ASCII)',longN);
  const nameCount=new Map();on.filter(f=>f.kind==='image').forEach(f=>{const n=f.path.split('/').pop().toLowerCase();nameCount.set(n,(nameCount.get(n)||0)+1)});
  const twins=[...nameCount].filter(([,c])=>c>1).map(([n])=>n);if(twins.length)add('err','Two images share a name; PES keeps images by name, so one would replace the other',twins);
  // what the build noted
  (b.notes||[]).forEach(n=>add(n.lvl,n.msg,n.list));
  const nT=games.filter(f=>f.kind==='ted').length,nC=games.filter(f=>f.kind==='ced').length;
  if(games.length&&!dmg.length&&!badName.length&&!wrongRef.length&&!lost.length)add('ok',`${nT} team file${nT===1?'':'s'} and ${nC} competition file${nC===1?'':'s'} read back correctly: checksum, size, name${linked?', and '+linked+' image link'+(linked===1?'':'s')+' found next to them':''}`);
  const errors=items.filter(i=>i.lvl==='err').length,warns=items.filter(i=>i.lvl==='warn').length;
  const rank={err:0,warn:1,info:2,ok:3};items.sort((a,b)=>rank[a.lvl]-rank[b.lvl]);return{items,errors,warns}}
function checkHTML(b){const c=pkgCheck(b);const icon={err:'✖',warn:'!',info:'i',ok:'✓'},col={err:'var(--bad,#e5484d)',warn:'var(--warn)',info:'var(--muted)',ok:'var(--good,#30a46c)'};
  return `<div class="card" style="margin-top:10px;border-color:${c.errors?col.err:c.warns?col.warn:col.ok}"><div class="row"><h3 style="margin:0">Connection check</h3>
   <span class="small">${c.errors?`<b style="color:${col.err}">${c.errors} problem${c.errors>1?'s':''} to fix</b>`:'<b style="color:'+col.ok+'">Ready for PES</b>'}${c.warns?` · ${c.warns} warning${c.warns>1?'s':''}`:''}</span></div>
   ${c.items.map(i=>`<details style="margin-top:6px" ${i.lvl==='err'?'open':''}><summary style="cursor:${i.list.length?'pointer':'default'}"><b style="color:${col[i.lvl]};display:inline-block;width:16px">${icon[i.lvl]}</b> ${esc(i.msg)}${i.list.length?` <span class="muted small">(${i.list.length})</span>`:''}</summary>
    ${i.list.length?`<div class="small muted" style="margin:4px 0 0 22px;max-height:180px;overflow:auto">${i.list.slice(0,300).map(esc).join('<br>')}${i.list.length>300?'<br>…':''}</div>`:''}</details>`).join('')}
   ${c.errors?`<label class="c small" style="margin-top:10px"><input type="checkbox" data-act="bfForce" ${b.force?'checked':''}> Export anyway (the files with problems may not import or may lose their images)</label>`:''}</div>`}
ACT.bfForce=()=>{S.ui.build.force=!S.ui.build.force;setTimeout(rerender,0)};
const pkgBlocked=()=>{const b=S.ui.build;return !b||(pkgCheck(b).errors>0&&!b.force)};
{const _dl=ACT.downloadPkg;ACT.downloadPkg=async el=>{if(pkgBlocked()){toast('Fix the problems in the connection check first, or tick "Export anyway".','err');return}return _dl(el)}}

/* ----- write straight to the USB drive (Chrome / Edge on a computer) ----- */
CH.usbStage=el=>{S.ui.build.usbStage=+el.value};
ACT.writeUsb=async el=>{const b=S.ui.build;if(!b)return;if(pkgBlocked()){toast('Fix the problems in the connection check first, or tick "Export anyway".','err');return}
  if(!window.showDirectoryPicker){toast('This browser can\'t write to a drive. Use Chrome or Edge on a computer, or download the ZIP.','err');return}
  let dir;try{dir=await window.showDirectoryPicker({id:'pes21usb',mode:'readwrite'})}catch(e){if(e&&e.name!=='AbortError')toast('Could not open the drive: '+e.message,'err');return}
  const stage=b.stages?(+b.usbStage||1):0;const inW=/^wepes$/i.test(dir.name);
  const pick=b.files.filter(f=>f.include).map(f=>{let p=f.path;
    if(b.stages){const m=p.match(/^STAGE(\d+)\/(WEPES\/.*)$/);if(m){if(+m[1]!==stage)return null;p=m[2]}}
    if(inW){if(!p.startsWith('WEPES/'))return null;p=p.slice(6)}return{f,p}}).filter(Boolean);
  const nW=pick.filter(x=>inW||x.p.startsWith('WEPES/')).length;
  if(!await ask('Write to '+dir.name+'?',`<b>${pick.length}</b> files go to <b>${esc(dir.name)}</b>${inW?'':' (game files and images in its <b>WEPES</b> folder, '+nW+' files)'}${stage?', batch '+stage:''}. Files with the same names are replaced; nothing else on the drive changes.${inW?'':'<br><span class="small muted">Pick the drive itself (for example E:) so the game finds USB:/WEPES.</span>'}`,'Write files'))return;
  el.disabled=true;let n=0;const bad=[];
  const sz=f=>f.data instanceof Blob?f.data.size:(f.data&&(f.data.byteLength||f.data.length))||0;const all=pick.reduce((a,x)=>a+sz(x.f),0);let wrote=0,k=0;
  try{await miniBusy('Writing to the drive…',async()=>{busyCount(0,all||pick.length);for(const {f,p} of pick){const parts=p.split('/');let d=dir;for(const s of parts.slice(0,-1))d=await d.getDirectoryHandle(s,{create:true});
    const blob=f.data instanceof Blob?f.data:new Blob([f.data]);const fh=await d.getFileHandle(parts[parts.length-1],{create:true});const w=await fh.createWritable();await w.write(blob);await w.close();
    const back=await fh.getFile();if(back.size!==blob.size)bad.push(p);else n++;wrote+=blob.size;k++;busyCount(all?wrote:k,all||pick.length,'Writing '+k+' of '+pick.length+' files to the drive'+(all?' ('+kb(wrote)+' of '+kb(all)+')':''))}})}
  catch(e){toast('Writing stopped: '+e.message,'err')}finally{el.disabled=false}
  if(bad.length)toast(bad.length+' file'+(bad.length>1?'s':'')+' did not write fully: '+bad.slice(0,3).join(', '),'err');
  else if(n){S.settings.exports=(S.settings.exports||[]).concat([{at:Date.now(),teams:b.teams,files:n,usb:true}]).slice(-20);saveSettings();
    toast(n+' files written and read back from '+dir.name+'. Eject the drive safely before unplugging it.','ok')}};

/* ----- competition files on the Import page ----- */
async function impAddCed(blob,path){const st=impState();st.ceds=st.ceds||[];const u8=new Uint8Array(await blob.arrayBuffer());const P=CED.parse(u8);
  if(!(await GF.verify(u8)).hashOK)throw new Error('the file is damaged (checksum does not match)');
  st.ceds.push({id:uid(),name:path.split('/').pop(),path,parsed:P,b64:TED.b64(u8),target:cedGuessTarget(P),on:true})}
function cedGuessTarget(P){const c=Object.values(S.comps).find(c=>(c.ced&&c.ced.compId===P.compId)||+c.gameId===P.compId)||matchComp(P.name)||(/world cup/i.test(P.name)?Object.values(S.comps).find(c=>c.worldCup):null);return c?c.id:'new'}
async function impCedStep({st,replace,incC,stats}){
  for(const x of (st.ceds||[]).filter(x=>x.on)){const P=x.parsed;const tpl={b64:x.b64,compId:P.compId,file:x.name,emblemFile:P.emblemFile,at:Date.now()};
    let c=x.target&&x.target!=='new'?S.comps[x.target]:null,fresh=null;
    if(c){const cc=c;await impDo(()=>{const wasGen=!cc.ced||!!cc.ced.generated;cc.ced=tpl;if(!+cc.gameId||wasGen)cc.gameId=String(P.compId);saveComp(cc)},x.name+' becomes the game file of '+c.name+' (competition ID '+P.compId+')',{comp:c.id})}// installed with the rest
    else{fresh=newComp({name:P.name,gameSlot:P.name,gameId:String(P.compId),ced:tpl,type:typeof slotKind==='function'&&slotKind(P.compId)==='cup'?'Cup':'League'});incC[fresh.id]=fresh}// a cup's file is a cup: its place is asked among cup places
    const em=P.emblemFile&&(st.images||[]).find(i=>i.name.toLowerCase()===P.emblemFile.toLowerCase());const cur=fresh||incC[c.id]||c;
    if(em&&(replace||!cur.emblem)){try{const rec=await addImageFromBlob(em.blob,'comp',em.name);if(fresh)fresh.emblem=rec.id;else incC[c.id]=Object.assign(incC[c.id]||clone(c),{emblem:rec.id});em.on=false;stats.images++}catch(e){}}
    stats.cedComps=(stats.cedComps||0)+1}}

/* ----- the team / competition pages say which file each one is written from ----- */
function gameFileNote(info,what){if(!info)return`<div class="warnbox small" style="margin-top:10px">No game file for this ${what}. Exports carry its images and the Update Sheet only. To write a ${what==='team'?'.ted':'.ced'} for it, import the file the game exports (Edit → Data Management → Import/Export → Export ${what==='team'?'Team':'Competition'}), or enter its in-game ID above to use the generic template.</div>`;
  return `<div class="infobox small" style="margin-top:10px">Game file: <b>${esc(info.label)}</b>${info.kind==='generic'?' <span class="tag t-mov">experimental</span>: kit colours, coach and tactics come from the template; check them in Edit after importing.':info.kind==='builtin'?'. Players are matched to it by name.':''}</div>`}
