---
name: pes21-rules
description: The PES 2021 Option Studio rule book - the standing rules (invariants) every change to this app must keep, from the option file as the benchmark to the PES 2021 game database limits (IDs, file formats, name lengths, squad size, rating ranges), seasons, the World Cup, imports, exports and the health check. Read it before changing index.html, server.py or any importer, exporter, health check or Claude-update code in this repo, before answering how the studio should behave, and whenever the user states a new general rule ("make this a rule", "from now on the app should…") so it gets added here.
---

# PES 2021 Option Studio: rule book

These are the standing rules of the app, collected from the user's decisions. A change that breaks one is a bug, even if it
looks sensible on its own. When code and a rule disagree, the rule wins: fix the code, and look for other places with the same
mistake (search for the field or function involved, not just the line you were sent to).

## Adding a rule

When the user states something as a general rule, or corrects the app in a way that should hold everywhere:
1. Add it under the right heading below, in the same shape: the rule in one or two plain sentences, then **Why** (the user's
   reason, with the date) and **Where** (the functions or places that enforce it, so the next person can check them).
2. Change the code so it holds everywhere, not only where it was noticed.
3. Commit the rule book with the change. Keep rules short; if one replaces an older rule, edit the old one instead of adding a
   contradiction.

---

## 1. Working on the repo

- **Commit and push straight to `main`.** No branches or pull requests. Every push redeploys the site (Cloud Build → Cloud Run),
  so run the checks first: `python -m py_compile server.py efootball.py logos.py cloud.py transfermarkt.py thesportsdb.py wikidata.py optionfile.py names.py ghlogos.py`
  and a syntax check of the inline script in `index.html`.
- **The data side has its own rules: `docs/DATABASE_RULES.md`** (what is stored, how competitions, teams, players, managers,
  stadiums, sponsors and images link, IDs, saving, building, exporting and deleting). Deleting a record removes every link
  to it (`dropTeam`, `unlinkImages`); a cup copy links to its league club by id (`sameAsId`).
- **Never commit option files or anything in `data/`.** Packages live in the bucket or `data/optionfiles/`.
- **Style comes from the design-system tokens** (CSS variables), not hard-coded colours. *Where:* the `:root` tokens in `index.html`.

## 2. The option file is the benchmark

- **The option file the project is built from is what is installed in the game.** Once it is loaded, every question about "what
  the game has" is answered from it: which team sits at a game ID, its name, its files and images. PES's own default teams and
  slot names are never referenced. A hand-typed "replaces" name is ignored while an option file is in use.
  *Why:* 2026-11-17, the health check asked for "which default PES team" 377 teams replace, although every one came from the
  loaded option file. *Where:* `inGameTeam(t)` and `inGameComp(c)` in `index.html` (option-file `.ted` `origName` at the team's
  game ID, the `.ced`'s own name); used by the health check's "Teams in the game", the team and competition forms, the
  league arrangement guide and the Update Sheet. Teams the option file lacks are new clubs with their own team files, not a problem.
- **Exports reproduce the option file's file set, folder for folder and name for name, as one USB folder.** *First install*
  writes the complete set; *Changes only* writes just the files that differ from the baseline, with `CHANGES.txt` (which also
  lists files to delete from the installed copy). Only the main USB part is exported: other USB parts are add-ons that reuse its
  team slots and competition IDs. One team file per team slot. New teams and competitions go into the option file's own folders;
  deleted ones are left out. *Why:* 2026-11-18, the user: "this must be one export, either in full or only changes"; the game
  imports all files of a kind at once and links them by the names inside them. *Where:* `ofScope`, `ofPlan`, `ofLeagueDir`,
  docs/DATABASE_RULES.md 5–6.
- **The baseline moves only when the user confirms PES imported the export**, through two warnings; writing an export never
  records the install by itself, and the previous option file stays the baseline until then. *Why:* 2026-11-18, the user.
  *Where:* `ofSetPending`, `ACT.ofConfirm`, `ofApplyInstall`, `ofPendingHTML`.
- **A club from the option file keeps its league** (its team slot puts it there; competition files hold no team lists). It can
  join any cup. *Why:* 2026-11-18, the user chose to block league moves of option-file clubs. *Where:* `lockedLeague`, `saveTeam`.
- **Never copy package images** into browser storage or baselines; refer to them as `o:<package>|<path>`. *Where:* `ofRef`, `ofBuild`.
- **Building from an option file:** its data comes first; the project's own data only fills gaps. Teams it lacks stay, under
  their own slots; a game ID the package now uses is freed from the outside team. *Where:* `ofBuild`.

## 3. Game files, names and IDs

- **Any file name works for any file type.** Files are tied together only by the names inside team (`.ted`) and competition
  (`.ced`) files. Never decide what a file is from its own name or folder when a game file names it; name and folder guesses are
  a fallback for loose images only. *Where:* the importer (`Import links files by the names inside the game files`).
- **Every team and competition has its own game file** (imported, option-file or generated). Real files always win over
  generated ones: re-importing a real file replaces the generated one and its IDs.
- **Nothing has ID 0.** A team without a free slot gets a random unused number in PES 2021's team range; a competition a random
  unused competition number; a player without a game ID a random unused edit-player ID (bit 30 set).
- **A cup copy of a club shares its league copy's team ID, player IDs and file**; it has no file of its own.
- **Import defaults to "Only add what's missing"** and says what happened to every file added; changes go to Review first.

## 4. The PES 2021 game database: limits and formats

These are the game's own limits. Data that breaks them is cut, rejected or misread by the game, so the studio clamps or
flags it before export instead of writing it as is. *Where:* `TED`, `CED`, `GF` (file formats), `normPlayer` (player values),
`healthIssues` (what the health check flags), `genTeamFile` / `genCompFile` (IDs), the connection check on export.

### IDs
- **Team IDs** (4 bytes, team-file offset 80, repeated in the squad block at 756). Real clubs keep PES 2021's own ID; an option
  file's own slots are adopted (Arsenal 2517, Man Utd 4077, Bayern 4938 …). A team without one takes a **free slot**: never one
  the option file or another team uses; national teams only national slots; fictional leagues first (`pas-league`, `peu-league`,
  `pla-league`), then leagues the project doesn't use, classic teams last (`assets/pes21-teams.json`, from PES Master). If none
  is free, a random unused number in the team range. *Where:* `freeTeamSlot`, `usedTeamSlots`.
- **Competition IDs** are small: the option file uses 1–165; a new one gets a random unused number up to 199 (`COMP_ID_MAX`),
  avoiding `KNOWN_COMP_IDS`.
- **Player IDs** (4 bytes, unsigned: 1 to 4,294,967,295, `validGameId`). Players the game has keep their real ID. Players created
  in a file are **edit players**: bit 30 or bit 31 set (0x40000000 and up; option files use 2,147,483,648 and up for their own), as
  the game gives them (`isEditId`). The studio makes them in 0x40080000–0x400EFFFF from the team and player, so every export gives
  the same player the same ID (`newPid`, `EDIT_LO`/`EDIT_HI`). Only IDs beyond 4 bytes (special eFootball cards, 11–14 digits) are
  too long for the game and cleared. An ID above 2,147,483,647 is not a special card: never clear it.
- **No ID 0, and no ID twice:** one team file per team ID (two files for one team block the export), one entry per player ID in a
  squad. A cup copy uses its league club's IDs.

### Files
- **Team file (.ted): exactly 14,820 bytes. Competition file (.ced): exactly 852 bytes.** Both have an 80-byte header (type
  0x18 team / 0x19 competition, body size at byte 8, SHA-256 of the body at 48–79) and a body masked with that hash. Always write
  them through `TED.build` / `TED.encrypt` / `CED.build` so the hash matches; never patch bytes after encrypting.
- **Text is UTF-8, zero-terminated, cut to fit its field in bytes** (accented letters take two). `TED.writeStr` trims whole
  characters. Team file: name 70 bytes (team block +104), short name 3 capital letters (+174), stadium 120 (+178), coach 46 (677).
  Competition file: ID at 80, name 61 bytes (60 + terminator) at 114.
- **Image names inside game files are 33-byte fields** (32 characters + terminator). Exports write plain ASCII names of at most
  31 characters, extension included (`pesName`, `PES_NAME_MAX`). Offsets: crest 503, stadium 536, sponsor boards 569/602/635,
  manager 723, kits 1766 + 132·k (1st, 2nd, GK 1st, 3rd, GK 2nd); competition emblem 804. Image names follow the ID:
  `E_/M_/K_<team id>`, `C_<comp id>`.

### Squads
- **At most 40 players per team** (40 slots of 312 bytes from 2328). Over 40 is a must-fix; the export drops the rest.
- **A playable squad needs 15 or more**, with at least one goalkeeper (none is a must-fix). One goalkeeper is acceptable in the game: the health check never asks for a second.
- **Shirt numbers 1–99, each once per squad** (2 bytes in the squad block); a repeated number is a must-fix.
- A team with no squad in the studio gets a **team-info file**, imported with *Apply player and squad data* off so the game keeps
  its own squad.

### Players
- **Name: at most 60 bytes** (61-byte field). **Shirt name: at most 16 letters** shown; it defaults to the last name in capitals.
  A changed name sets the file's "name changed" flag.
- **Too-long names are shortened the usual way** (health check "Shorten names", applied on the spot, also in "Apply all"):
  first name to its initial and the last word only (LUIGI SAN NICOLAS → L. NICOLAS); an Arabic article stays with the surname
  (FIRAS AL-BURAIKAN → F. AL-BURAIKAN); a double-barrelled surname that still doesn't fit keeps its last part
  (C. BLACKETT-TAYLOR → C. TAYLOR); a single word still too long is cut where a syllable ends, after a consonant and before a
  vowel, never inside CH/SH/TH/GH/JH/KH/PH (R. GHOOCHANNEJHAD → R. GHOOCHANN). A name over 60 bytes keeps its first and last
  words. Only the part that is too long changes. *Why:* 2026-11-17, examples given by the user. *Where:* `shortShirt`,
  `cutWord`, `shortFull`, `ACT.fixNames`.
- **Ratings 40–99** (7-bit fields; the overall override too). Weak-foot usage and accuracy 1–4, form 1–8, injury resistance 1–3,
  foot L or R.
- **Age** (6 bits; the editor allows 15–50), **height** in cm (1 byte; source data outside 140–215 is ignored), **weight** in kg
  (1 byte; outside 41–129 ignored). Empty stays empty rather than 0.
- **13 positions** (GK CB LB RB DMF CMF LMF RMF AMF LWF RWF SS CF); the registered position is always A, other playable positions
  A/B/C. Files store proficiency in two schemes (0–3 or 0–2), detected per file from the registered position (`TED.posScheme`):
  never assume one.
- **Only the game's own lists:** playing styles (21), skills (41) and COM styles (7) from `TED.STYLE` / `TED.SKILL` / `TED.COM`;
  anything else is dropped (`normPlayer`).

### Images
- PNG, in the same folder as the game file that names them. Sizes: crest 256 × 256, competition logo 256 × 256, manager photo
  256 × 256, kit 2048 × 2048, stadium 1024 × 512, sponsor boards 256 × 128 (`S.settings.sizes`, `kindSize`).

## 5. Teams, competitions and seasons

- **Never empty or remove a club a season leaves out.** A team absent from a season's data (relegated, left its competition,
  unknown to the source) is kept exactly as it is, with its players and memberships. PES has no team limit.
  *Why:* 2026-11-15. *Where:* `batchFromData` (zero-player source skips the club, logs "kept as is"), `compUnlisted`.
  Removals apply only when a source does list that club's squad.
- **Clubs a competition update lists that the project lacks are built in full** (squad, ratings, kits, crest). *Where:* `queueNewClubs`.
- **Cups never change a club's league.** A cup only adds participants (`comp.teams`); in PES cups use the league clubs, so cup
  copies of league clubs are merged into the league club (health check "Cup copies").
- **The season turns over on 1 September** (2026/27 = 1 Sep 2026 – 31 Aug 2027). A hand-set label stays until the next 1 September.

## 6. National teams and the World Cup

- **There is always exactly one World Cup with every national team.** It keeps the last edition's title and logo until a newer
  edition's name and logo are published; only the international search may change them. It can't be deleted and national teams
  can't be removed from it. *Why:* 2026-11-15. *Where:* `ensureWorldCup()`, `allowWc`.
- **A footballer has separate records at his club and in his national team.** Matching never crosses that line, and a player
  stays at his club when he joins his national team. National teams get no "Keep at" suggestion in the health check.
- **National teams use their country's flag as emblem.**

## 7. Players

- **Each player is listed once per squad**; one shirt number per player per squad. Special eFootball cards are dropped from squads.
- **The same player in two clubs** is resolved by looking up his club for the current season (one queued job, in batches) and
  suggesting that club.

## 8. Images

- **The studio makes every image the game files name** when none exists: crests and logos drawn from colours and short name
  (national teams: the flag), kits drawn at export in the 2048 px layout, stadium and sponsor boards from the team's colours.
  Generated images are marked so a real one found later replaces them.
- **Never invent a face:** a manager without a photo gets a neutral placeholder.

## 9. Health check

- **The plain answer first** (ready / almost ready / not ready), one button for the safe fixes, then issues grouped by problem
  or by team, each with why it matters.
- **One suggested action per row, and "Apply all suggested actions" on every group.**
- **Look-ups and Claude updates only suggest; coded fixes apply on the spot.** A fix that queues a task to find information
  (Claude update, Claude ratings, eFootball, Transfermarkt, flags, crests, logos) never changes the data itself: its results wait
  in Review changes to be checked and applied, wherever it was started from, the health check included. Fixes the studio works
  out by itself (shirt numbers, duplicate entries, game IDs, short names) are applied at once and can be undone from the change
  history. *Why:* 2026-11-17, a health-check Claude update applied its squad without Review. *Where:* the health check's
  `finishBatch` wrapper (`CUR_JOB.autoApply`), `queueRun`.
- **A fix for missing details fills only what is missing.** Claude is asked about exactly the players with gaps, named with their
  club, position and what is already known, for only the fields they lack (age, height, weight, nationality). Only empty fields
  are filled; nothing a player already has changes, and players Claude can't identify are named in Review. Never use a
  whole-squad update to fill gaps. *Why:* 2026-11-17, the squad-wide fill left the gaps empty and rewrote other details.
  *Where:* `runPlayerDetails`, `detailsPrompt`, job type `details`.
- **Short names are exactly 3 capital letters or digits.** The health check offers a fix per team (the code cleaned up, or one made
  from the name: ARS, RMA, PSG) and in "Apply all"; the code stays editable on the team's Info tab, and exports write what is
  there. *Why:* 2026-11-17, the user asked for an auto fix that can still be changed by hand. *Where:* `SHORT_OK`, `short3`,
  `ACT.fixShort`, `healthIssues`, the `short` field of `infoTab`.
- **Don't flag what isn't a problem.** New clubs outside the option file, teams a season leaves out and national teams' club
  links are expected states, not issues.

## 10. Claude updates, data sources and the cloud

- **Sources in order: free sources, then Claude's own knowledge, then Claude web search.** Every look-up tries them in that
  order and moves on only for what the step before didn't have. Costs and the Stats tab are for admins only.
  *Why:* 2026-11-17. *Where:* `freeSquad` / `runFreeTeam` (free), `aiJSON` (`opts.escalate`, `thinReply`: knowledge first, then
  web), `draftTeam` (an empty or cut-off squad escalates to web search).
- **One free-source pull: "Pull from free sources".** Every command that pulls data from eFootball or any other free database is
  this one pull, under this one name, everywhere in the app. A team: the squad from FIFA (national teams in the newest World Cup),
  else eFootball, else Transfermarkt; EA SPORTS FC fills the details and ratings that source left out; then the crest
  (TheSportsDB, eFootball), coach and stadium (Transfermarkt) and whatever is still open (Wikidata), in one Review batch. Players:
  eFootball, then EA SPORTS FC; what neither has goes to "Not found in the free sources". Never add a pull from one source on its
  own; add the source to the shared pull instead. *Where:* `runFreeTeam` (job types `free`, and old `ef` / `compPull` / `fifaTeam`
  jobs), the `efPlayers` wrapper (job types `freePlayers`, old `efPlayers` / `fcPlayers`).
- **A dot per source on every task**, at the far right of its row: green for free sources, yellow for Claude's own knowledge,
  red for Claude web search, one dot for each source the task used (a waiting task shows the one it starts with, dimmed).
  The dot of the source in use flashes, and only while the task is running; finished sources, waiting and finished tasks and
  the sources legend keep steady dots. *Why:* 2026-11-17, the user: "flashing only when running".
  *Where:* `jobStage`, `jobDots`, the `jobRowHTML` wrapper; free-source API calls are counted in the `fetch` wrapper.
- **With Claude web search off, it is never suggested or attempted.** No web search call (`webAllowed()`), no web-search command
  buttons, no text promising a web search.
- **A free-source fix never moves on to Claude by itself.** When a fix that says eFootball (or another free source) can't find a
  squad or a player's details, nothing is sent to Claude. Review changes lists what the free sources didn't have, under "Not
  found in the free sources", with "Ask Claude" per team and for all (with the request estimate), and "Dismiss". Claude's
  answers then wait in Review like any other. *Why:* 2026-11-17, a health-check eFootball fix went on to Claude without the user
  accepting it. *Where:* the health-check `runJob` wrapper (`ef` / `efPlayers` jobs), `FREE_MISS`, `freeMissHTML`, `freeMissJobs`
  (`claudeOnly` jobs skip the eFootball first step).
- **Claude finishes a squad it started.** A club we have exists, so an empty squad is asked for again (with a search hint and web
  search, when web search is on). A
  squad under 16 players or missing a line (GK, DEF, MID, ATT) is continued: Claude gets the players it already listed and adds
  the rest, up to 4 times. If it is still incomplete, its players are added or updated but nobody is removed, and Review says
  why. *Where:* `draftTeam`, `squadGap`, `continuePrompt`, `t._partial` in `batchFromData`.
- **A failed task shows its details in Review**: the error, a Details log of every step of that task, and its own Retry
  button. A run that ends with failures says how many in the progress bar. *Where:* `queueRun`, `AI_TRACE`, `jobRowHTML`.
- **Cloud saving sends a few requests at a time**, with one message and a clear finish.
- **Only game data goes into the public baseline** (teams, players, competitions, images, team files); the review queue, jobs and
  history stay private. Packages and projects built from them are for owner accounts (`ALLOWED_EMAILS`) only. Any Google account may sign in when `OPEN_SIGNIN=1`, but a non-owner only saves their own project; owner features are checked on the server (`_owner()`), never only hidden in the menus. Menus hidden from members are listed in `OWNER_VIEWS` (index.html; today only Settings, though members may later get some needed settings).
