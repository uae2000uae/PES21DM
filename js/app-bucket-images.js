// PES 2021 Option Studio: the IMAGES bucket (the user, 2026-11-25).
// The parts are one program in one global scope, loaded in order by index.html. Nothing here runs while the file loads.
"use strict";
/* ================= Bucket 3 of 4: images =================
   Team crests, competition logos and kits. ONE ORDER, here and nowhere else: IMG_ORDER below (kits: KIT_ORDER). To change the order, move a name in
   that list; nothing else needs touching.
   eFootball is last because its crests are 128 px against FootyLogos' 1500 px: the first source that has the image wins,
   so a small one in front would stop the search (the user's list had it first; say the word and it moves).
   A national team's crest is its country's flag, from the set shipped with the site: no outside source.
   The coach's photo comes with the coach from eFootball (data bucket); a stadium photo from TheSportsDB (imgStadium).
   NEVER CLAUDE: Claude cannot return an image, and it is no longer asked for names to look up or to draw a crest. A crest
   no source has is listed in Process and Review → Ask Claude with "Create and edit" (the studio draws one and opens it in
   the emblem maker). */
const IMG_ORDER=['FootyLogos','TheSportsDB','Wikimedia Commons','Wikipedia','football-logos','eFootball'];
const IMG_ORDER_TEXT='FootyLogos, then TheSportsDB, Wikimedia Commons, Wikipedia, football-logos (GitHub) and eFootball; national teams get their flag';
// each step sets x.emblem and returns true when it found the image
const IMG_CREST={
  'FootyLogos':async(x,signal,st)=>{if(!flAvailable())return false;const f=await flFind(x.name,'emblem',x.country,[],signal);if(!f.found)return false;
    x.emblem=(await addImageFromBlob(await flDownload(f,signal),'emblem',x.name+' crest (FootyLogos)')).id;return true},
  'TheSportsDB':async(x,signal,st)=>{const t=await artTsdb(x,signal,st);if(!t||!t.badge)return false;
    x.emblem=(await artImg('api/tsdb/image?url='+enc(t.badge),'emblem',x.name+' crest (TheSportsDB)',signal)).id;return true},
  'Wikimedia Commons':async(x,signal,st)=>{const it=await artWd(x,'club',signal,st);if(!it||!it.logo)return false;
    x.emblem=(await artImg('api/wd/logo?file='+enc(it.logo),'emblem',x.name+' crest (Wikimedia)',signal)).id;return true},
  'Wikipedia':async(x,signal,st)=>{const id=await wpLogoId(x,'emblem',signal);if(!id)return false;x.emblem=id;return true},
  'football-logos':async(x,signal,st)=>{const r=await fetch('api/gh/find?name='+enc(x.name),{signal});const o=await r.json().catch(()=>({}));if(!o.crest)return false;
    x.emblem=(await artImg('api/image?url='+enc(o.crest.url),'emblem',x.name+' crest (football-logos)',signal)).id;return true},
  'eFootball':async(x,signal,st)=>{const i=await artEf(x,signal,st);if(!i||!i.crest)return false;x.efId=i.efId;
    x.emblem=(await addImageFromBlob(await efImage(i.crest,signal),'emblem',x.name+' crest (eFootball)')).id;return true}};
const IMG_LOGO={
  'FootyLogos':async(c,signal,st)=>{if(!flAvailable())return false;const f=await flFind(c.name,'comp',c.country,[],signal);if(!f.found)return false;
    c.emblem=(await addImageFromBlob(await flDownload(f,signal),'comp',c.name+' logo (FootyLogos)')).id;return true},
  'TheSportsDB':async(c,signal,st)=>{const clubs=compMembers(S.comps[c.id]||c).slice(0,5).map(t=>t.name).join('|');
    const r=await fetch('api/tsdb/league?name='+enc(c.name)+'&country='+enc(c.country||'')+'&clubs='+enc(clubs)+'&cup='+(isCupComp(c)?1:0),{signal});const o=await r.json().catch(()=>({}));
    const L=o.league;const u=L&&(L.badge||L.logo);if(!u)return false;c.emblem=(await artImg('api/tsdb/image?url='+enc(u),'comp',c.name+' logo (TheSportsDB)',signal)).id;return true},
  'Wikimedia Commons':async(c,signal,st)=>{const it=await artWd(c,'comp',signal,st);if(!it||!it.logo)return false;
    c.emblem=(await artImg('api/wd/logo?file='+enc(it.logo),'comp',c.name+' logo (Wikimedia)',signal)).id;return true},
  'Wikipedia':async(c,signal,st)=>{const id=await wpLogoId(c,'comp',signal);if(!id)return false;c.emblem=id;return true},
  // football-logos has clubs only: skipped for a competition
  'eFootball':async(c,signal,st)=>{const lid=await efLeagueFor(c,signal);if(lid==null)return false;
    c.emblem=(await addImageFromBlob(await efImage('/efootball-2022/graphics/leaguelogos/emb_'+String(lid).padStart(4,'0')+'.png',signal),'comp',c.name+' logo (eFootball)')).id;return true}};
// the first source of IMG_ORDER that has it; a source that fails is passed over, never fatal. Returns the source's name or null
async function imgFirst(steps,x,signal,st){for(const name of IMG_ORDER){const fn=steps[name];if(!fn)continue;
    try{if(await fn(x,signal,st))return name}catch(e){if(e.name==='AbortError')throw e}}return null}
async function imgCrest(x,signal,st){if(isNationalTeam(x)){try{return (await flagAttach(x,signal))?'flag':null}catch(e){if(e.name==='AbortError')throw e;return null}}
  return imgFirst(IMG_CREST,x,signal,st)}
const imgLogo=(c,signal,st)=>imgFirst(IMG_LOGO,c,signal,st);
/* ---- kits (the user, 2026-11-28: "use this google drive in my free sources to search for kits. add it to the search bucket")
   Kit sheets in the PES layout (2048 px) from Kit Man Cal's free kit store, a public Google Drive folder read by the
   studio's server (kitdrive.py): the project's season first, a slot it doesn't have yet from the season before.
   Only a slot with a kit missing is filled (missKits: no image of its own, and not left to the game); all=true takes
   every slot the store has. Each step fills x.kits and returns how many slots it filled. */
const KIT_ORDER=['Kit Man Cal'];
const KIT_ORDER_TEXT="Kit Man Cal's free kit store (Google Drive)";
const kitSlotsOpen=(x,all)=>OF_KIT_SLOT.filter((s,i)=>{if(all)return true;const k=(x.kits||[]).find(z=>z.slot===s);return !(k&&hasRealImg(k.img))&&!ofGameKit(x,i)});
const IMG_KITS={
  'Kit Man Cal':async(x,slots,signal,st)=>{const r=await fetch('api/kd/find?name='+enc(x.name)+'&country='+enc(x.country||'')+'&nat='+(isNationalTeam(x)?1:0)+'&season='+enc(S.settings.season||''),{signal});
    const o=await r.json().catch(()=>({}));if(!r.ok)throw new Error(o.error||'kit store '+r.status);const K=o.team&&o.team.kits;if(!K)return 0;let n=0;
    for(const s of slots){const f=K[s];if(!f)continue;
      const q=await fetch('api/kd/image?id='+enc(f.id),{signal});if(!q.ok)throw new Error('kit image '+q.status);const b=await q.blob(),im=await addImageFromBlob(b,'kit',x.name+' '+s+' kit (Kit Man Cal '+(f.season||o.team.season)+')');
      // the settings the maker wrote on the sheet for the game (kitCodes): kept with the kit
      let cd=null;try{const bm=await createImageBitmap(b),c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;c.getContext('2d',{willReadFrequently:true}).drawImage(bm,0,0);cd=kitCodes(c)}catch(e){}
      x.kits=x.kits||[];let k=x.kits.find(z=>z.slot===s);if(!k){k=newKit(s);x.kits.push(k)}k.img=im.id;if(cd)k.codes=cd;n++}
    return n}};
// every source of KIT_ORDER, each for the slots still open. Returns {n: slots filled, src: [sources that gave one]}
async function imgKits(x,signal,st,all){const src=[];let n=0;let open=kitSlotsOpen(x,all);
  for(const name of KIT_ORDER){if(!open.length)break;const fn=IMG_KITS[name];if(!fn)continue;
    try{const k=await fn(x,open,signal,st);if(k){n+=k;src.push(name);open=all?[]:kitSlotsOpen(x,false)}}catch(e){if(e.name==='AbortError')throw e;aiLog('  '+x.name+': '+name+': '+(e.message||e))}}
  return{n,src}}
