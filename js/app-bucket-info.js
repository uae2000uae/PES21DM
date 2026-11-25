// PES 2021 Option Studio: the CLUB INFO bucket (the user, 2026-11-25: "make a bucket for that").
// The parts are one program in one global scope, loaded in order by index.html. Nothing here runs while the file loads.
"use strict";
/* ================= Bucket 2 of 4: club info =================
   A club's stadium name, its coach's name and its two colours, for what the data bucket left open.
   ONE ORDER, here and nowhere else:
     TheSportsDB   stadium, colours
     Wikidata      stadium, coach
   The data bucket is asked first (app-bucket-data.js: the coach from eFootball then Transfermarkt, the stadium from
   Transfermarkt); this bucket only fills what is still empty. Each source is asked once per team in a job (st, freeState),
   and a Wikidata that says it is busy is left alone for the rest of the job. Never Claude. */
const INFO_ORDER=['TheSportsDB','Wikidata'];
async function infoStadium(x,signal,st){if(isNationalTeam(x))return null;
  const t=await artTsdb(x,signal,st);if(t&&t.stadium){x.stadium=t.stadium;return'TheSportsDB'}
  const it=await artWd(x,'club',signal,st);if(it&&it.stadium){x.stadium=it.stadium;return'Wikidata'}return null}
async function infoCoach(x,signal,st){x.manager=x.manager||{name:'',nat:'',age:''};
  const it=await artWd(x,isNationalTeam(x)?'national':'club',signal,st);if(it&&it.coach){x.manager.name=it.coach;return'Wikidata'}return null}
async function infoColours(x,signal,st){if(isNationalTeam(x))return null;
  const t=await artTsdb(x,signal,st);const cs=((t&&t.colours)||[]).map(v=>String(v).trim()).filter(v=>/^#[0-9a-f]{6}$/i.test(v));
  if(cs.length<2)return null;x.colors=cs.slice(0,2);return'TheSportsDB'}
