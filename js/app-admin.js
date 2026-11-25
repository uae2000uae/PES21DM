// PES 2021 Option Studio: the admin's reference pages (Settings → Admin; the user, 2026-11-25).
// The parts are one program in one global scope, loaded in order by index.html; this file wraps VIEWS.settings.
"use strict";
/* ================= Settings → Admin: the command table and the health check diagram =================
   "give me a full table of all the commands, when or why they're offered, and what they do, where they're placed in the
   app, mark if not placed, rules audit result. remark for me to note on them. add this to admin tab in settings. i already
   created a health check figma diagram in earlier session, add it too. make hovering on the boxes show explanation."
   Two folding cards in the Admin section, for admins only:
   1 How each health check command gets its answers: the FigJam board (figma.com/board/NrNcYufo4lcxq2jUMGb8Mf) drawn in the
     page, corrected to the code of 2026-11-25. Every box explains itself on hover or focus.
   2 The commands of the Health check and of Process and Review (the audit of 2026-11-25), and the commands no button
     reaches. Each row: when it is offered, what it does, where it is, the audit's result, and a note of yours
     (settings.cmdNotes, saved with the project's settings).
   KEEP IN STEP: a command added, renamed, moved or removed changes its row here and its box in the diagram (rule book,
   "Where each health check command gets its answers"). A row whose command is gone from the code is marked by the page. */

// ---- 1. the diagram: lanes of boxes and arrows. flB(kind,text,tip): kind cmd (a button you press), src (a source asked),
// ask (a decision), end (where it ends), store (Process and Review); flA(label): an arrow
const flB=(kind,text,tip)=>({kind,text,tip}),flA=label=>({arrow:label||''});
const FLOW_PR='Nothing changes yet. The answer waits in Process and Review, where you tick what you want and apply it.';
const FLOW_CLAUDE=[flB('src','Claude, own knowledge','Claude answers from what it knows first. This is the step that costs money; the health check\'s Live Update shows the estimate before it starts.'),flA(),
  flB('ask','Reply empty, cut off or unsure, and web search on?','Web search is used only when the first answer falls short, the studio runs through the site\'s server, and web search is not switched off (Settings → Admin → Claude).'),flA('yes'),
  flB('src','Claude web search and web fetch','Claude searches the web and reads the pages it finds: the eFootball database, official team and league sites, Transfermarkt, Wikipedia.'),flA('then, or no'),
  flB('store','Process and Review',FLOW_PR)];
const HC_FLOW=[
 {t:'Script only, in the studio',why:'No outside source is asked. The change is made at once and can be undone from the change history; the ones over many teams take a snapshot first.',rows:[[
   flB('cmd','Fix automatically · Renumber','Removes duplicate entries and gives clean shirt numbers. Fix automatically does it for every team that has such a row, after one question and a snapshot.'),
   flB('cmd','Shorten names · 3-letter short name','Shortens player names too long for the game, and sets a team\'s short name to 3 capital letters or digits.'),
   flB('cmd','Remove duplicates · Keep one · Different players','A player listed twice in a squad is kept once, as his most complete entry. Removes exactly what the row reports and names them first.'),
   flB('cmd','New player IDs · Allocate free IDs','Reads the option file\'s team files only: each player without a game ID takes a free record the game has (his own, one of his name, then one at his team\'s code). Needs an option file.'),
   flB('cmd','Use the game ID · Use this file · Use the ticked picture','Use the game ID drops a link to another record, only where the game has him under his game ID. The other two pick which file or picture is used when an option file holds two.'),
   flB('cmd','Random fill','The last resort: made-up but realistic values for only what a player lacks. Never looked up.'),
   flB('cmd','Update from league team · Merge','Cup copies and pool teams take the squad of their league team, or are merged into it.'),
   flB('cmd','Repair the squad','Broken team files: adds a player the game has from his other team\'s file, lists a player once, rebuilds the squad list. The export then writes the file again.'),
   flB('cmd','Move · Keep · Replace · Put in league','Applies the answer a look-up showed in the row (see "Look-ups answered in the row" below).')],
  [flA('each'),flB('end','Saved at once, undo from the change history','One entry in the change history per command. A snapshot is taken first by the commands that touch many teams.')]]},
 {t:'Pull from free sources: a team\'s squad',why:'Each source is asked only when the one before it doesn\'t have the team. Claude is never asked unless you click Ask Claude.',rows:[[
   flB('cmd','Pull from free sources · World Cup pull','On rows for no players, too few players, no goalkeeper; and More checks → Pull from free sources for the World Cup\'s national teams.'),flA(),
   flB('src','FIFA','Only for a national team in the newest World Cup: FIFA\'s official squad.'),flA('not found'),
   flB('src','eFootball','The eFootball database on PES Master: squads with game IDs.'),flA('not found'),
   flB('src','Transfermarkt','The Transfermarkt data set: squads by club name. Data from before the current season gives way to Wikipedia.'),flA('not found'),
   flB('src','Wikipedia','The club\'s current squad from its English article.'),flA('found in any'),
   flB('src','EA SPORTS FC fills details and ratings','Fills age, height, nationality and ratings the squad source left open.'),flA(),
   flB('store','Process and Review',FLOW_PR)],
  [flA('no source has the team'),flB('end','Listed on Process and Review','The team is named there as not found.'),flA('you click Ask Claude'),flB('src','Claude','Only on your click. Then as "Claude directly" below.')]]},
 {t:'Pull from free sources: player details and game IDs',why:'For players already in a squad who miss details, ratings or (without an option file) a game ID.',rows:[[
   flB('cmd','Pull from free sources','On Missing details and Missing ratings rows.'),flA(),
   flB('src','eFootball','Details, ratings and the game ID by the player\'s name and team.'),flA('gaps left'),
   flB('src','EA SPORTS FC','Details and ratings for what eFootball didn\'t have.'),flA('found'),
   flB('store','Process and Review',FLOW_PR)],
  [flA('still missing'),flB('end','Listed on Process and Review','What neither source had is listed there, with Ask Claude.')]]},
 {t:'Live Update',why:'The one command that updates a whole team. From the health check it asks first, with the Claude estimate.',rows:[[
   flB('cmd','Live Update','On squad rows (no players, too few, no goalkeeper) and on Broken team files rows that Repair can only leave a place out of, or whose players have no name.'),flA(),
   flB('src','The same free squad pull','FIFA, eFootball, Transfermarkt, Wikipedia, then EA SPORTS FC, as in the squad pull above.'),flA('then'),
   flB('src','Claude: manager and kits, or the whole team','Claude fills the manager and the kits, or drafts the whole team when no free source has it.'),flA(),
   flB('store','Process and Review',FLOW_PR)],
  [flA('when you apply it'),flB('end','New players take the game IDs of the players who left','After every apply that changes a squad, the team\'s players with no game ID take over the records the removed players left free at its code. The rest are listed under Players with no game ID.')]]},
 {t:'Claude directly',why:'No free source is asked first.',rows:[[
   flB('cmd','Queue Claude ratings · Claude fill','Queue Claude ratings on Missing ratings rows; Claude fill on Missing details rows (details only).'),flA(),...FLOW_CLAUDE]]},
 {t:'Images, never Claude',why:'Crests, logos and flags are looked up, never drawn or guessed by Claude here.',rows:[[
   flB('cmd','Pull from free sources (crest row)','On a team with no crest.'),flA(),
   flB('src','FootyLogos','1500 px crests.'),flA('not found'),flB('src','TheSportsDB','512 px.'),flA('not found'),flB('src','Wikimedia Commons','Free files.'),flA('not found'),
   flB('src','Wikipedia','The logo at the top of the club\'s English article.'),flA('not found'),flB('src','football-logos (GitHub)','Top European leagues.'),flA('not found'),flB('src','eFootball','128 px, the last resort.'),flA('found in any'),
   flB('store','Process and Review',FLOW_PR+' The same pull fills a missing coach (eFootball, Transfermarkt, Wikidata) and stadium (TheSportsDB, Transfermarkt, Wikidata).')],
  [flB('cmd','Use flag','On a national team without its flag.'),flA(),flB('src','The flags shipped with the site','254 country flags (flag-icons) in the site\'s own assets: no outside source is asked.'),flA(),flB('store','Process and Review',FLOW_PR)]]},
 {t:'Look-ups answered in the row',why:'The answer is shown in the Health check row itself, not in Process and Review. Nothing changes until you press the row\'s button.',rows:[[
   flB('cmd','Find his current team · Search for the right team','On a player the game has in another team\'s file, and on the same player in two teams.'),flA(),
   flB('src','eFootball by game ID','Where the player is now, by his ID.'),flA('not placed'),
   flB('src','Transfermarkt by name','By name and age.'),flA('not placed'),
   flB('src','Claude, web search if unsure','Asked last.'),flA(),
   flB('end','Answer shown in the row','You then press Move, Keep or Replace, which is script only.')],
  [flB('cmd','Find their leagues · Find its teams','On Teams without a league, and on Leagues with no teams.'),flA(),
   flB('src','Transfermarkt by team name','The league the club plays in.'),flA('not found'),
   flB('src','Claude, web search if unsure','Asked last.'),flA(),
   flB('end','Answer shown in the row','You then press Put in the league found.')],
  [flB('cmd','Repair the squad: a player no team file holds','Part of Repair the squad, for a squad place whose ID is in no team file.'),flA(),
   flB('src','eFootball by game ID','Who the player with that ID is.'),flA('found'),flB('store','Process and Review',FLOW_PR+' Until a file has his record, his place is left out.')]]}];
const flowBox=x=>x.arrow!==undefined?`<span class="flow-a" aria-hidden="true">${x.arrow?`<i>${esc(x.arrow)}</i>`:''}→</span>`
  :`<span class="flow-b ${x.kind}" tabindex="0" data-tip="${esc(x.tip||'')}"><span class="flow-k">${{cmd:'button',src:'source',ask:'check',end:'result',store:'result'}[x.kind]}</span>${esc(x.text)}</span>`;
const hcFlowHTML=()=>`<p class="small">How each Health check command gets its answers: the buttons on the left, the sources it asks in order, and where the answer ends. Point at a box, or tab to it, to read what it does.</p>
  <div class="flow-key small muted"><span class="flow-b cmd">a button</span><span class="flow-b src">a source asked</span><span class="flow-b ask">a check</span><span class="flow-b end">where it ends</span><span class="flow-b store">Process and Review</span></div>
  ${HC_FLOW.map(L=>`<section class="flow-lane"><h4>${esc(L.t)}</h4><p class="small muted">${esc(L.why)}</p>${L.rows.map(r=>`<div class="flow-row">${r.map(flowBox).join('')}</div>`).join('')}</section>`).join('')}
  <p class="small muted">Drawn from the FigJam board <a href="https://www.figma.com/board/NrNcYufo4lcxq2jUMGb8Mf" target="_blank" rel="noopener">Health check: where answers come from</a> and corrected on 25 November 2026: the removed buttons are gone, Live Update has one name, flags come from the site's own set, football-logos is in the crest chain, and Repair the squad and the ID hand-over after an apply are added. The board itself still shows the older version.</p>`;

// ---- 2. the commands. [group, button label, command name(s), when or why it is offered, what it does, where, audit]
// audit: 'ok' (checked, nothing to change), 'fixed: …' (changed in the audit of 2026-11-25), 'open: …' (known, not changed)
const CMD_ROWS=[
 ['Health check: page','Fix N teams automatically','hcAutoFix','A team has duplicate entries or repeated shirt numbers.','Removes the duplicates and renumbers, in every such team, after one question.','Health check → status card','fixed: takes a snapshot first; works its plan out again after the question; says so when there is nothing to fix'],
 ['Health check: page','Apply all suggested actions','hcBulk','A sub-group has rows whose first fix can run for many teams.','Runs each row\'s first fix: script fixes at once, look-ups queued.','Health check → each sub-group header','fixed: snapshot first; names the items that failed; dead ID branch removed'],
 ['Health check: page','Must fix / Should fix / Information / Everything','hcSev','Always.','Filters the page by level.','Health check → tiles and filter bar','ok'],
 ['Health check: page','Show all N','hcMore','A sub-group has more than 40 rows.','Shows the rest.','Health check → sub-group','ok'],
 ['Health check: page','Continue now','qResume','Health check fixes are queued but the queue is paused.','Resumes the queue.','Health check → Fixes in progress card','ok'],
 ['Squads','Pull from free sources','efTeam','A team has no players, fewer than 15, or no goalkeeper.','Queues the free squad pull for the team.','Health check → Squads rows','fixed: a second click no longer queues a second copy'],
 ['Squads','Live Update','claudeTeam, teamLive','Same rows; and Broken team files rows.','The team\'s Live Update: free sources first, then Claude.','Health check → Squads rows, Broken team files rows; team page; Competitions','fixed: asks first with the Claude estimate; one name (was also Find the real squad, Update the squad)'],
 ['Squads','Remove duplicates','dedupeTeam','A player is listed twice in a squad.','Keeps each player once, as his most complete entry.','Health check → Duplicate entries row','fixed: removes exactly what the row reports and names them; the two pull buttons on this row were removed as redundant'],
 ['Squads','Same player: keep one / Different players','dupKeepOne, dupDiff','Two players of one name have different game IDs.','Merges the two entries, or marks the pair as checked.','Health check → Same name rows','ok'],
 ['Squads','Renumber / Give numbers','fixNumbers','A shirt number is worn twice, or players have none.','Gives every player of the team a unique number; unique ones stay.','Health check → Shirt numbers and Missing details rows','fixed: no error when the team is gone'],
 ['Squads','Shorten names','fixNames','A player name is too long for the game.','Shortens the names.','Health check → Names rows','ok'],
 ['Squads','Use XXX','fixShort','A team\'s short name is not 3 letters or digits.','Sets the short name.','Health check → Team info rows','ok'],
 ['Player data','Pull from free sources','efFill','Players miss details or ratings.','Queues eFootball, then EA SPORTS FC, for those players.','Health check → Missing details and Missing ratings rows','fixed: says so when nothing is missing; clearer result'],
 ['Player data','Claude fill','claudeFill','Players miss details.','Queues a Claude details job.','Health check → Missing details row','fixed: details only (it also queued ratings, which have their own row)'],
 ['Player data','Queue Claude ratings','rateTeam','Players are unrated.','Queues a Claude ratings job.','Health check → Missing ratings row','fixed: no job with 0 players; no error when the team is gone'],
 ['Player data','Random fill / Random fill all','randomFill, randomRate, randomFillAll','Details or ratings are missing: the last resort.','Made-up but realistic values for only what is missing.','Health check → Missing details, Missing ratings; sub-group header','fixed: Random fill all takes a snapshot first and says so when the group is empty'],
 ['Game IDs: teams','Pick an ID / Game codes','hcCodes','A team has no code, a code of another league, a fixed name, or replaces an in-game team.','Opens Game codes on the right tab.','Health check → Game IDs → Teams rows; Files not in the game','fixed: one command (codeOpen removed); "Change" no longer opens a field that can\'t be typed in'],
 ['Game IDs: teams','Import its .ted','openImport','A team has no code and no team file.','Opens Import / Export → Import files.','Health check → team with no ID','ok'],
 ['Game IDs: players','Take over… (give a free ID)','pcGive','A player has no game ID and a free record suits him.','Gives him that record\'s ID.','Health check → Players with no game ID rows; Game codes → Players','ok'],
 ['Game IDs: players','Allocate free IDs (N)','pcAllocAll','Players have no game ID.','Gives each his suggested free ID.','Health check → Players header; Game codes → Players','ok'],
 ['Game IDs: players','Make room / No free IDs left: make room','pcRoomOpen','No free ID is left.','Opens Make room: what to delete to free IDs.','Health check → Players rows and header; Game codes','ok'],
 ['Game IDs: players','Game codes','pcOpen','On a player with no ID.','Opens Game codes → Players, filtered to the team.','Health check → Players with no game ID rows','ok'],
 ['Game IDs: players','Use the game ID','unlinkTed','A player is linked to a different record than his game ID.','Drops the link, so he follows his game ID.','Health check → linked to a different record','fixed: only where the game has him under that ID; history entry; needs the team files read'],
 ['Game IDs: players','Pull from free sources (IDs)','efIds','No option file is loaded and players have no game ID.','Queues eFootball for their IDs.','Health check → no game ID row (no option file only)','fixed: says so when nothing is missing'],
 ['Game IDs: players','Keep it with X / New player IDs for all','sharedKeep, sharedAll','Different players share one game ID.','One keeps the ID; the others each take a free one.','Health check → Shared game IDs rows and header','fixed: needs an option file, like every command that gives an ID; says so when there is nothing to do'],
 ['Game IDs: players','Move to X / Move to this team / Replace… / Keep in X','pfMove, pfLink, pfReplace, pfRemove','The game has a player in another team\'s file.','Transfers, links, replaces or removes him.','Health check → Player in another team\'s file rows','ok'],
 ['Game IDs: players','Find his current team / Find their teams','pfFind, pfFindAll','Same rows.','Looks his team up: eFootball by ID, Transfermarkt, then Claude. The answer shows in the row.','Health check → same rows and header','ok'],
 ['Same player in two teams','(suggestion) / Keep at X / Search','dpApply, keepAt, dpFindOne','One player is in two clubs.','Applies the suggestion, keeps him at one club, or looks his club up.','Health check → Same player in two teams rows','fixed: dead fallback removed from Keep at'],
 ['Same player in two teams','Search for the right team / Apply all suggested actions / Keep all at the smaller team','dpFindAll, dpApplyAll, dpSmallAll','Same section, for all rows.','The same, for every row.','Health check → Same player in two teams header','open: Keep all at the smaller team exits without a message when the list is empty'],
 ['Teams and leagues','Find their leagues / Find its league','nlFindAll, nlFind','A team is in no league.','Looks the league up: Transfermarkt, then Claude. The answer shows in the row.','Health check → Teams without a league','ok'],
 ['Teams and leagues','Put in X / Put N in the league found','nlPut, nlPutAll, nlMove','A league was found.','Files the team under that league.','Health check → Teams without a league rows and header','fixed: Put N takes a snapshot first'],
 ['Teams and leagues','Apply all suggested actions / Find its teams','ecFindAll, ecFind','A league has no teams.','Looks up the league\'s teams, free sources first.','Health check → Leagues with no teams','ok'],
 ['Teams and leagues','Edit / Open / Delete (competition)','editComp, delComp','A league or cup has no teams.','Opens the competition editor, or deletes it after asking.','Health check → Leagues and Cups with no teams','ok'],
 ['Teams and leagues','Update from X / Update all N','twinUpdate, twinAll','A cup copy or pool team has a league namesake.','Takes the league team\'s squad and details.','Health check → Cup copies, Pool teams','ok'],
 ['Teams and leagues','Merge N teams instead','mergeDups, mgAll, mgOne','Cup copies exist.','Merges the ticked cup copies into their league teams.','Health check → Cup copies (beside the ticks)','fixed: the second Merge button in the header was removed'],
 ['Teams and leagues','Different clubs / Copy onto…','simDiff, simCopy','Two teams have similar names.','Hides the pair, or copies the newer one onto the other.','Health check → Similarly named teams','ok'],
 ['Teams and leagues','Add to a team / Remove from the team','natAdd, natAddGo, pfRemove','A national-team player is in no club, or was added from a national team.','Copies him to a club on the same ID, or removes him.','Health check → National players rows','ok'],
 ['Images','Pull from free sources (crest)','efImg','A team has no crest.','Queues the crest, coach and stadium pull.','Health check → No crest rows','fixed: says what happened, and why not when the server is unreachable'],
 ['Images','Use flag','flagOne','A national team has no flag.','Queues its country\'s flag from the site\'s own set.','Health check → Flags rows','ok'],
 ['Images','Relink / Remove reference / Apply all / Remove all','msRelink, msRemove, msRelinkAll, msRemoveAll, msMore, orView','A file names an image the option file doesn\'t have.','Points the name at an image that exists, or blanks it.','Health check → Images the option file doesn\'t have','open: not part of the audit'],
 ['Option files','Repair the squad / Repair the squads (N)','sqFix, sqFixAll','A team file has places the game can\'t show ("---").','Adds a player from his other team\'s file, lists a player once, rebuilds the squad list; the export writes the file again.','Health check → Broken team files rows and header','fixed: the snapshot it promises is always taken'],
 ['Option files','Keep the file as it is','sqFixUndo','A broken file was marked repaired.','Undoes the mark: the export copies the file as it is.','Health check → Broken team files rows','open: a snapshot restore does not undo the mark; this button does'],
 ['Option files','Use this file / Use the ticked picture','ofPickTeam, ofPickImg','An option file has two files for one code, or two pictures of one name.','Chooses which one is used.','Health check → Two files, Two pictures','fixed: Use this file takes its snapshot before the first change'],
 ['More checks','Pull from free sources (World Cup)','fifaAll','You have national teams in the newest World Cup.','Queues FIFA\'s official squads for them.','Health check → More checks → Tools for every team','ok'],
 ['Process and Review','Apply N of N','revApply','A batch waits.','Applies the ticked changes of one batch, after a snapshot.','Process and Review → each batch','fixed: codes never move; a transferred player is never lost; same-name clubs; dead links; one history entry; a failed batch stays'],
 ['Process and Review','Apply all','revApplyAll','Several batches wait.','Applies every batch, oldest first, after one snapshot.','Process and Review → top','fixed: as Apply; the message says what the game keeps'],
 ['Process and Review','Discard / Discard all','revDiscard, revDiscardAll','A batch waits.','Drops the batch; nothing is applied.','Process and Review','open: files an import kept for rebuilds stay after a discard here'],
 ['Process and Review','Tick, untick, edit a value','revItem, revField, revAll, revVal','A batch is open.','Chooses what is applied; a value can be corrected.','Process and Review → batch rows','fixed: a code can no longer be typed'],
 ['Process and Review','Same club? Yes / No','revSame, revNotSame, caSameYes, caSameNo','A new club may be one you have.','Yes updates your club; No keeps it new.','Process and Review → new club rows; asked at apply','fixed: No is now kept at apply even for an exact same name'],
 ['Process and Review','Export as update file','revExport','Batches wait.','Writes the ticked changes as an update file for another copy.','Process and Review → top','open: not part of the audit'],
 ['Process and Review','(after an apply) new players take freed IDs','—','An apply changed who is in a squad.','The team\'s players with no game ID take the records the removed players left free.','Automatic, after Apply, Apply all and Import\'s Install','open: tested with a stand-in only; not yet run on real game records'],
 ['Import / Export','Install N changes','impInstall','Files were processed on Import.','Applies the changes, after a snapshot.','Import / Export → Import files → Changes to apply','fixed: as Apply'],
 ['Import / Export','Clear list / Dismiss / Discard','impClear, impLastHide, impPlanDrop','Files are on the Import tab.','Deletes the imported files, after a warning.','Import / Export → Import files','ok (added 25 Nov)'],
 ['Not placed','(no button)','efComp','—','Queued squads from the free sources for the teams chosen in the old free-databases card.','Not placed: the card\'s Run button does this now','open: safe to delete'],
 ['Not placed','(no button)','efImages','—','Queued crests, coaches and logos for the same choice. The job type of the same name is still used.','Not placed: the card\'s Run button does this now','open: safe to delete (keep the job type)'],
 ['Not placed','(no button)','tmInfo','—','Queued coaches and stadiums from Transfermarkt. The job type of the same name is still used.','Not placed: the card\'s Run button does this now','open: safe to delete (keep the job type)'],
 ['Not placed','(no button)','aiFillComp','—','Opened Live Update with a competition filled in.','Not placed: Competitions now uses Live Update on each card','open: safe to delete'],
 ['Not placed','(no button)','aiTeam','—','Opened Live Update with a team filled in.','Not placed: the team page now uses Live Update directly','open: safe to delete'],
 ['Not placed','(no button)','mfAsk','—','Asked Claude for the FootyLogos names of missing emblems.','Not placed: Logos & kits → Missing emblems uses its own buttons','open: check before deleting']];
const cmdNotes=()=>S.settings.cmdNotes||(S.settings.cmdNotes={});
const cmdKey=r=>r[0]+'|'+r[2]+'|'+r[1];
const cmdActs=r=>r[2]==='—'?[]:r[2].split(',').map(x=>x.trim());
const cmdMissing=r=>cmdActs(r).filter(a=>!ACT[a]&&!CH[a]);
function cmdRowsShown(){const q=norm(S.ui.cmdQ||''),f=S.ui.cmdF||'all';const N=cmdNotes();
  return CMD_ROWS.filter(r=>(f==='all'||(f==='np'&&r[0]==='Not placed')||(f==='fixed'&&/^fixed/.test(r[6]))||(f==='open'&&/^open/.test(r[6]))||(f==='note'&&N[cmdKey(r)]))&&(!q||norm(r.slice(0,6).join(' ')+' '+(N[cmdKey(r)]||'')).includes(q)))}
const cmdAudit=a=>/^fixed/.test(a)?`<span class="cmd-a fixed">Fixed</span> ${esc(a.replace(/^fixed:\s*/,''))}`:/^open/.test(a)?`<span class="cmd-a open">Open</span> ${esc(a.replace(/^open:\s*/,''))}`:`<span class="cmd-a ok">OK</span>${esc(a.replace(/^ok/,''))}`;
function cmdBodyHTML(){const L=cmdRowsShown(),N=cmdNotes();if(!L.length)return '<tr><td colspan="7" class="muted">No command matches.</td></tr>';let g='';
  return L.map(r=>{const k=cmdKey(r),miss=cmdMissing(r),np=r[0]==='Not placed';const head=r[0]!==g?`<tr class="cmd-g"><th colspan="7" scope="colgroup">${esc(g=r[0])}</th></tr>`:'';
    return head+`<tr class="${np?'cmd-np':''}"><td><b>${esc(r[1])}</b></td><td><code>${esc(r[2])}</code>${miss.length?`<div class="cmd-a open" title="No command of this name is in the code now: the row is out of date">gone from the code: ${esc(miss.join(', '))}</div>`:''}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td><td>${np?'<span class="cmd-a open">Not placed</span> '+esc(r[5].replace(/^Not placed:\s*/,'')):esc(r[5])}</td><td>${cmdAudit(r[6])}</td>
     <td><textarea class="cmd-note" rows="2" data-ch="cmdNote" data-k="${esc(k)}" aria-label="Your note on ${esc(r[1])}" placeholder="Your note">${esc(N[k]||'')}</textarea></td></tr>`}).join('')}
const cmdCount=()=>{const n=cmdRowsShown().length;return n===CMD_ROWS.length?CMD_ROWS.length+' rows':n+' of '+CMD_ROWS.length+' rows'};
const cmdTableHTML=()=>{const f=S.ui.cmdF||'all';const N=cmdNotes();const cnt={all:CMD_ROWS.length,np:CMD_ROWS.filter(r=>r[0]==='Not placed').length,fixed:CMD_ROWS.filter(r=>/^fixed/.test(r[6])).length,open:CMD_ROWS.filter(r=>/^open/.test(r[6])).length,note:CMD_ROWS.filter(r=>N[cmdKey(r)]).length};
  return `<p class="small">The commands of the Health check, Process and Review and Import's install and discards, as audited on 25 November 2026, and the commands no button reaches. Your notes are saved with the project's settings as you leave each box.</p>
  <div class="row" style="gap:6px;margin-bottom:10px"><label class="f" style="flex:1;min-width:200px;margin:0">Find a command<input type="search" data-in="cmdQ" value="${esc(S.ui.cmdQ||'')}" placeholder="e.g. duplicates, snapshot, Live Update"></label>
   <div role="group" aria-label="Show" class="row" style="gap:6px">${[['all','All'],['fixed','Fixed in the audit'],['open','Open'],['np','Not placed'],['note','With my note']].map(([k,l])=>`<button type="button" class="chip ${f===k?'on':''}" aria-pressed="${f===k}" data-act="cmdF" data-k="${k}">${l} <span class="muted small">${cnt[k]}</span></button>`).join('')}</div></div>
  <p class="small muted" id="cmd-count" style="margin:0 0 6px">${cmdCount()}</p>
  <div class="tw cmd-tw"><table class="cmd-t"><thead><tr><th scope="col">Button</th><th scope="col">Command</th><th scope="col">When or why it is offered</th><th scope="col">What it does</th><th scope="col">Where</th><th scope="col">Rules audit</th><th scope="col">Your note</th></tr></thead><tbody id="cmd-body">${cmdBodyHTML()}</tbody></table></div>
  <p class="small muted" style="margin:8px 0 0"><b>Fixed</b>: changed in the audit to follow the rules. <b>Open</b>: known and left as it is; the text says why. <b>OK</b>: checked, nothing to change. A row marked "gone from the code" names a command that no longer exists.</p>`};
CH.cmdNote=el=>{const N=cmdNotes(),v=el.value.trim();if(v)N[el.dataset.k]=v.slice(0,2000);else delete N[el.dataset.k];saveSettings();toast('Note saved','ok')};
IN.cmdQ=el=>{S.ui.cmdQ=el.value;const b=$('#cmd-body');if(b)b.innerHTML=cmdBodyHTML();const c=$('#cmd-count');if(c)c.textContent=cmdCount()};
ACT.cmdF=el=>{S.ui.cmdF=el.dataset.k;S.ui.keepScroll=true;rerender()};
// the two cards, folded until opened; the page remembers which is open
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.classList&&d.classList.contains('adm-ref')&&d.dataset.k)(S.ui.admOpen||(S.ui.admOpen={}))[d.dataset.k]=d.open},true);
function adminRefHTML(){const o=S.ui.admOpen||{};const card=(k,title,sub,body)=>`<details class="card adm-ref" data-k="${k}" ${o[k]?'open':''}><summary><h3 style="display:inline;margin:0">${title}</h3> <span class="small muted">${sub}</span></summary><div style="margin-top:12px">${o[k]?body():''}</div></details>`;
  return `<h2>Admin reference <span class="badge" title="Only an admin sees these">admin only</span></h2><p class="sub" style="margin-top:-4px">How the Health check's commands work, and what the rules audit found. Nothing here changes your project.</p>
   <div class="grid" style="gap:12px">${card('flow','Health check: where each command gets its answers','diagram, '+HC_FLOW.length+' routes',hcFlowHTML)}${card('cmds','Commands, where they are, and the rules audit',CMD_ROWS.length+' rows, with your notes',cmdTableHTML)}</div>`}
// a card's body is drawn when it is opened (the table is long)
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.classList&&d.classList.contains('adm-ref')&&d.open){const b=d.querySelector('summary+div');if(b&&!b.firstElementChild)b.innerHTML=d.dataset.k==='flow'?hcFlowHTML():cmdTableHTML()}},true);
{const _s=VIEWS.settings;VIEWS.settings=(...a)=>{const h=_s(...a);if(!setAdmin())return h;const at=h.indexOf('<h2>Danger zone</h2>');return at<0?h+adminRefHTML():h.slice(0,at)+adminRefHTML()+h.slice(at)}}
