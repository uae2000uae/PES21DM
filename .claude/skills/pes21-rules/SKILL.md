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

## The top rule: what doesn't work in the game is not accepted in the app

**The app never accepts a change that does nothing, or the wrong thing, in PES 2021.** No button, field or choice is offered
for it; it is not explained away with a note or a warning. When a test shows the game ignores or refuses something, the app
stops offering it everywhere, and offers the way that does work instead. When a test hasn't settled it, it goes to
`docs/GAME_TESTS.md` and the app follows the answer. This rule comes before every other rule in this book. *Why:* 2026-11-22,
the user: "don't fix the wording, whatever doesn't work in the game must not be accepted in the app. make this the top rule."

Examples already in the app: a team changes league only by taking a free code of that league (*Change competition*, the
Competitions → *Add or remove teams* page, the team's info tab, Health check → *Teams without a league*; never by filing it
under another competition, which the game ignores, tests 17 to 57). A Live Update, Claude or import batch never moves a team
either: its "Competition" change goes to Process and Review only when it is the league of the team's code (or a cup, for a
team in no league); any other is left out and named in the batch's notes (`batchFromData`, `leagueNo`); a licensed team's name can't be edited (tests 58 to 60);
a team or competition the game always keeps can't be deleted; a competition is "in the game" only with a usable slot
(tests 21 to 23). *Where:* `teamMoveWhy`, `teamMoveTargets`, `teamMoveTo`, `teamFileUnder`, `leagueFreeCodes` (app-boot.js),
`ACT.teamComp`, `ctLeagueOthers` (app-pages.js), `nlPlace` (app-sources-fixes.js).

### Never a made-up ID

**THE LOCK ON NEW IDs** (2026-11-25, the user: "make sure the app never offers or creates new IDs till we test this
thoroughly"). Until `docs/GAME_TESTS.md` 25 has been run in the game and its result is written here, the studio **never
offers and never writes a player under an ID no game file already holds**: not an ID a source gave him (eFootball's),
not an edit ID, not a number of its own. A team file lists only players a game file holds, his own record or a free one
he was given (*Allocate free IDs*); anyone else is left out and named in the notes. The options that could do
otherwise are not shown and are ignored if a saved setting has them on: *Also write players no game file has* (Export
Option File and Partial Export) and *Use their real game ID*. The switch is `NEW_IDS_TESTED` in
`js/app-game-files.js` (false); it is set to true only when test 25 has passed and this rule says which IDs work. No
new feature may add another way round it. *Evidence so far (2026-11-26):* a downloaded league imported on top of the
option file brought 81 players on created IDs the option file had no record for, and all showed by name
(`docs/GAME_TESTS.md` 25). That is another maker's file, not the studio's test: the lock stays until the five points
listed there are tested. Where the text below speaks of writing a player under his real game ID, read
it as locked.

**The studio never gives anything an ID it made up**, a team code, a competition code or slot, or a player's game ID
(2026-11-22, the user: "the system must never give a made up ID for anything"). An ID comes from the game: the option
file's files, PES 2021's team and slot lists, the code book (codes freed by a team, competition or player that left), or
one you choose on Game codes. A record without one **stays without one** ("no code", "no game ID") and is not written to
a game file until it gets a real one: a player through *Allocate free IDs* (his own record, then his code's, then his
league's, then any free one, `pcPlanMake`), a team through a free code (Game codes, *Change competition*), a
competition through the add-competition flow or Game codes. When none is free the studio says so and offers *Make room*;
it never falls back to a number of its own. IDs the studio made up before this rule (players in 0x40080000–0x400EFFFF
with no game record) were cleared once on 2026-11-22 (22 in the test project) and are read as no ID (`pcRealId`). A
number a source gives (eFootball's player ID) is not made up, but is not known to be the game's either (`docs/GAME_TESTS.md`
5a): it is written only with *Use their real game ID* ticked. *Where:* `assignIds`, `genTeamFile`, `genCompFile`,
`needsCompFile` (app-images.js), `TED.build` (app-game-files.js); `newPid` and `randomFree` are gone.

### Player IDs and Make room need an option file, at both ends

**Giving a player an ID, and making room for players, work only with an option file, and the app says so whenever it
matters** (2026-11-25, the user: "make room for players or assigning new ID for players will not work without importing an
option file. make that known whenever its needed"). Two things, both said in the app:
1. **In the studio:** a player's ID is the ID of a record in a team file. A project with no option file (and no imported
   team file) has no ID to give and nothing to free, so every command that gives an ID or makes room stops with "This needs
   an option file… import yours first (Import / Export → Import Option File)" instead of doing nothing.
2. **In the game:** an ID given in the studio, or room made by deleting a team or competition, is only in the studio until
   the option file is exported and imported in PES 2021. Every such command says so after it changed something, Make room
   says it at the top of its window, and the note when new players take free IDs by themselves says it too.
Any new command that gives player IDs or frees them goes through the same check and note. *Where:* `pcNoFileWhy`,
`PC_GAME_NOTE`, `pcIdSig` and the wrapper around `ACT.pcGive`, `pcAllocAll`, `pcGiveAll`, `pcFileApply`, `pcRowApply`,
`pcRoomOpen`, `roomAlloc` (app-boot.js); `autoFreeIds`.

---

## 1. Working on the repo

- **Commit and push straight to `main`.** No branches or pull requests. Every push redeploys the site (Cloud Build → Cloud Run),
  so run the checks first: `python check.py` (every Python file compiles, every `js/app-*.js` passes Node's syntax check,
  `index.html` loads them all with `js/app-boot.js` last).
- **The studio's code is `js/app-*.js`, one program** (`app-comp-add.js`, adding a competition, came on 2026-11-22; `app-admin.js`, the admin's reference pages, on 2026-11-25). `index.html` holds the page and loads them in order; they
  share one global scope, and a later file may wrap what an earlier one defined, so the order is part of the program. Code
  that runs while a file loads (a `const x=f()`, a wrapper block) can use only its own file and earlier ones; anything
  called later can use everything. Nothing is drawn before every file has loaded (`APP_READY`, set by boot). The server
  sends these files with `no-cache`, so a new version never runs with an old part. *Why:* 2026-11-22, the user chose to
  split the one script into modules.
- **The data side has its own rules: `docs/DATABASE_RULES.md`** (what is stored, how competitions, teams, players, managers,
  stadiums, sponsors and images link, IDs, saving, building, exporting and deleting). Deleting a record removes every link
  to it (`dropTeam`, `unlinkImages`); a cup copy links to its league club by id (`sameAsId`).
- **Never commit option files or anything in `data/`.** Packages live in the bucket or `data/optionfiles/`.
- **Style comes from the design-system tokens** (CSS variables), not hard-coded colours. *Where:* the `:root` tokens in `index.html`.
- **The logo** (the user's design, 2026-11-21): three stacked option-file folders, light blue at the back to the app's
  blue at the front, with rounded corners; on the front folder the back of a white shirt in real proportions (gold collar,
  cuffs and nape crest, number 10). The wordmark is "PES2021" drawn as wide heavy shapes ("PES" in the text colour,
  "2021" in the accent blue) and a blue pill reading "Option Studio". The number and letters are paths, not text, so
  they look the same everywhere. *Where:* the top bar (`.tb-logo`, `.tb-word`, `.tb-pill`) and `assets/favicon.svg`.
- **Tick boxes and option buttons are one size everywhere, 16 × 16, and never shrink** when the window is narrow. Don't size
  one in a page's own style. *Why:* 2026-11-20, the user: some tick marks shrank in a tight window. *Where:* the
  `input[type=checkbox],input[type=radio]` rule in `index.html`.

## 2. The option file is the benchmark

- **The option file the project is built from is what is installed in the game.** Once it is loaded, every question about "what
  the game has" is answered from it: which team sits at a game ID, its name, its files and images. PES's own default teams and
  slot names are never referenced. A hand-typed "replaces" name is ignored while an option file is in use.
  *Why:* 2026-11-17, the health check asked for "which default PES team" 377 teams replace, although every one came from the
  loaded option file. *Where:* `inGameTeam(t)` and `inGameComp(c)` in `index.html` (option-file `.ted` `origName` at the team's
  game ID, the `.ced`'s own name); used by the health check's "Teams in the game", the team and competition forms, the
  league arrangement guide and the Update Sheet. Teams the option file lacks are new clubs with their own team files, not a problem.
- **Every export uses one folder layout** (the user, 2026-11-23: "not only partial export, everywhere in the system"). Inside
  `WEPES/` there is a folder per competition, `<competition code> <name>/`, holding its competition file and `Logo/`. Inside that,
  there is a folder per team, `<team code> <name>/`, holding its team file(s) and `images/` with `emblems/`, `kits/`, `manager/`,
  `stadium/` and `sponsors/`.
  - A team is written once, under its league; a national team goes under the World Cup.
  - Files for people go in `_Read me/`, beside `WEPES/`: notes, the Update Sheet, data, `CHANGES.txt` and extras.
  - **No empty folder is ever made**: a folder exists only when a file goes in it.
  - File names never change, because the game links files by the names inside team and competition files.
  - Export Option File writes every team and competition by its code in this layout too (no parts: with one file per
    code, import order decides nothing).
  - Partial Export keeps its stages (`STAGE<n>/WEPES/…`).
  - The update file holds `update.json`, with `<competition>/<team>/images/emblems/` and `<competition>/Logo/` beside it.
  - *Where:* `compFolder`, `teamFolder`, `teamCompOf` and `IMG_FOLDER` (app-core.js); `ofPlan`; `ACT.buildPkg`;
    `revUpdateZip`.
- **An option file is files and their links, never folders** (the user, 2026-11-23: "Option File export must not track
  installs by the option file's own paths, only using code. Baseline option file must not include folders in the first
  place. The system only reads files and their links").
  - Only team files and competition files are read, with the images they name, found by name anywhere in the option file.
    Folders, parts and USB folders are never looked at. A file no game file names is not read.
  - **One team per team code, one competition per competition code.** When one option file has two files for a code, the
    last by file name is used (the game reads files ticked together in file-name order, the last one winning). Health check
    → *Two files for one team code* lists them, and your pick is read at once and on every rebuild (`settings.ofPick`).
  - **One picture per image name.** When one option file has two pictures for a name, the first found is used. Health check
    → *Two pictures for one image name* lists them (`settings.ofImgPick`).
  - **Installs are tracked by code and image name only** (`settings.ofInstalled`: teams and competitions by code, images by
    name).
  - Nothing reads meaning from where a file sits; `o:<package>|<where>` only fetches its bytes.
  - *Where:* `ofRead`, `ofPickOf`, `ofImgOf`, `ofBuild`, `ofPlan`, `ofApplyInstall`; docs/DATABASE_RULES.md 5a.
- **Files and images are named by code** (the user, 2026-11-23).
  - Every export writes `<team code>.ted` and `<competition code>.ced`, in the competition and team folders.
  - A new image is named by type and number: `E` crest, `K` kit, `M` manager, `S` stadium, `P` board, `C` logo, then 4
    digits from 0000. It takes the next free number, kept once given.
  - *Make a coded copy* turns an option file into one with no folders, named this way: images numbered in the order of the
    original files, and the team and competition files naming the new names. That copy becomes the baseline.
  - In PES the coded names are all new, so delete the imported images before installing it.
  - The game's own leagues have no known competition code (no file names one), so their folders carry the name only: never
    a made-up code.
  - *Where:* `ofCodedCopy`, `ofNewCode`, `ofImgCode`, `ofPlan`, `ACT.buildPkg`; docs/DATABASE_RULES.md 5b.- **Option files imported since are read again on every rebuild** (the user, 2026-11-23: "redesign the system so in
  rebuilds imported option files as well").
  - Team and competition files installed through Import files (or sent to Process and Review), with the images they name,
    are kept as a package marked `source`, which is never the site's baseline (`settings.ofSources`, in order).
  - Before a rebuild, the codes their teams and competitions hold now are noted (`ofSourceCodes`).
  - A rebuild reads the base option file, then each source in order. A later file for a code replaces an earlier one, and a
    later picture replaces an earlier one of the same name, as importing it into the game does. A team left without a code
    isn't read.
  - Anything else changed in the studio is not kept by a rebuild, and the start-over warning says so.
  - *Where:* `impSourceCapture`, `impKeepSource`, `ofSourceCodes`, `startFresh`, `finishFresh`, `optionfile.py`
    (`kind: "source"`).
- **Exports reproduce the option file's files, name for name, as one USB folder** (in the layout above). *First install*
  writes every team and competition by its code, with the images their files name. *Changes only* writes what differs from
  what the game has, code by code and image name by image name, with `CHANGES.txt` in `_Read me/`, which also lists the codes
  no longer exported. A team or competition you didn't edit goes out byte for byte; deleted ones are left out. *Why:*
  2026-11-18, the user: "this must be one export, either in full or only changes". *Where:* `ofPlan`, `ofChangesText`.
- **Images no game file names are not read** (2026-11-23, replaces the "images named by no file" list and its *Allocate*
  fix): the option file is files and their links, so an image nothing names is not part of it.
- **A code is part of what was installed.** *Changes only* writes a team or competition again when its code changed since the
  last confirmed install, not only when its data did: a new club or league confirmed once with a code the game refused, then
  given a game code on Game codes, must go out again. *Why:* 2026-11-19, the user's changes export held 510 option-file team
  files and none of the added teams or competitions. *Where:* `ofSig`, `ofCSig` (data, code and image names), `ofCompHash`
  (a slot set on Game codes), in `ofPlan`.
- **The export options sit together above both export boxes and apply to both.** *Also write new files created by you* (the
  project's teams and competitions the option file doesn't have) and *Also write players no game file has* are one "Options" card; neither box has an option of its own. Changing one works both First install and Changes
  only out again (plan, size estimates, file-set status). *Why:* 2026-11-20, the user: the first sat inside the First
  install box although it also decides what Changes only writes. *Where:* `VIEWS.optionfile`, `ofOptSet`.
- **An export that can't be saved says so, and on this computer there is always a way to save.** When the studio runs from
  this computer, both export boxes have *Save on this computer*: the studio's own server writes the files as a folder
  (`LOCAL_EXPORT_DIR` in `.env`, else `data/exports/`; a new folder each time, never over an earlier export). It is the way
  to save where the browser can't open a save dialog (the browser pane inside the Claude app). It does not exist on the
  website. A save dialog that was closed or could not open ends with "Nothing was saved…", never silently. Reading a
  package file and writing a file are each tried again (7 tries over a minute) when the connection drops, and the local
  server queues 128 connections, not Python's default 5, which had stopped a 526-file export at file 383. *Why:*
  2026-11-20, the user could not save an export from the local test app. *Where:* `ofWrite` (`how==='local'`),
  `LOCAL_SAVE`, `ofFetchRetry`, `server.py` (`_local_api`, `request_queue_size`).
- **The export never leaves a team or competition out silently.** Its notes name every added team or competition that is not
  written and why: the *Also write new files created by you* option is off, it is unchanged since the
  confirmed install, it has no competition file, or it has no slot. *Why:* 2026-11-19, the user imported a changes export
  with none of the added teams or competitions and nothing said so. *Where:* `skip` in `ofPlan`.
- **The baseline moves only when the user confirms PES imported the export**, through two warnings; writing an export never
  records the install by itself, and the previous option file stays the baseline until then. *Why:* 2026-11-18, the user.
  *Where:* `ofSetPending`, `ACT.ofConfirm`, `ofApplyInstall`, `ofPendingHTML`.
- **Changes only can be exported again and again until the import is confirmed**, and each export holds every change since the
  confirmed baseline (it replaces the one waiting before it). **Confirming rebases the whole project** on that export: the
  install marks of every team and competition it wrote (a First install: all of them) *and* the project's baseline snapshot,
  which is the project as it was exported. With no edits since, Changes only, Summary and Partial Export's "changed since the
  baseline" then show nothing; edits made after the export stay changes, and the confirmation says how many. A Partial Export
  never moves the baseline of a project built from an option file. *Why:* 2026-11-22, the user. *Where:* `ofSetPending`
  (`p.snap`), `ofMarks`, `ACT.ofConfirm`, `ofDropSnap`, `ACT.downloadPkg`.
- **Game codes: every competition and team sits at a code** (competition ID, team ID). The *Game codes* page (menu), tabs
  Competitions and Teams, is one table: **Code · In PES · In Option File · Your Update · [Apply]**.
  - *In PES*: what PES 2021 has at that code (team codes: PES Master's list, with the league). *In Option File*: what the installed option
    file's own team or competition file puts there, read from the baseline (`settings.baseline`), never the session, so a club or
    competition deleted or moved in the studio still shows; the baseline's codes count as in the game (2026-11-19, the user;
    `codeOptBase`, `placeSets`). *Your Update*: who holds the code in the studio now.
  - *Your Update* is a list: the holder now, *— Free —*, and every competition or team **without a place in the game** (no
    code, or a code the game doesn't have). Choosing another shows that row's **Apply**; applying gives it the code (`codeSet`,
    written into its file at export: team ID at 80 and in the squad block, competition ID at 80; a league folder given a code gets
    a competition file) and the one that held it loses it (`noCode`: not exported, never given a made-up code), so it shows in
    every list until it gets another. *— Free —* takes the code from its holder. A snapshot is taken first; undo from history.
  - **A competition that loses its slot asks: keep or delete.** Applying another competition (or *— Free —*) on a slot its
    holder had asks what happens to the old competition and its league clubs. *Keep them*: the competition, its clubs, their
    players and images stay in the studio with no code (`noCode`, `parked`: kept out of the game), are left out of every export
    and of the health check, and can be given codes again. *Delete them*: the competition, its clubs (and their cup copies),
    players and images are deleted (a snapshot first). The World Cup can only be kept. *Why:* 2026-11-19, the user.
    *Where:* `codeLoseAsk`, `codeRetire`, `ACT.codeRowApply`.
  - **Deleting a competition on the Competitions page asks the same question**: *Delete everything* (the competition, its
    teams, their players and images) or *Competition only* (its teams stay, in no competition), or Cancel. A snapshot is
    taken first. **Whatever is deleted leaves its place free**: the competition's slot, the team codes and their image
    names go into the code book (also when one team is deleted on the Teams page), and the deleted teams' file paths stay
    there so their players' codes stay readable as free player codes after the baseline moves (`pcFileList`). The World Cup
    can't be deleted. *Why:* 2026-11-19, the user. *Where:* `ACT.delComp`, `codeRetire`, `ACT.delTeam`, `codeRecord`.
  - **Free codes keep their image names.** Only a code the game has can be free: a made-up code (no place in the game) that
    a record gives up is just dropped (2026-11-19, the user). Whenever a record loses a code the game has, the code and the image file names the game has
    there (its own file's, or those it had taken over) go into the code book (`settings.codeBook`, `codeRecord`), so they
    outlive the record, kept or deleted. A code no record holds is a *free code*: the *Free codes* tab lists them (code, PES
    team, freed from, image names) with *Give it to*; the Teams and Competitions tabs tag them "free code", and *Allocate a
    slot* lists them first. A club or competition given a free code writes **all** its images under those names at those paths
    at export (`codeImgName`, falling back to the code book); an option-file club given another code than its own file's is
    exported like a new club under the new code's names (`codeMoved`), so two clubs never write the same image name; its old
    code becomes a free code.
  - **Only the code and the image names are reused, never the old file.** The file of a team or competition that lost or
    moved its code is left out of the export: ignored when kept out of the game, removed with the record when deleted. It is
    never listed to delete (the game can't delete a team or competition file; it keeps it until a file with that code
    overwrites it). The code's new holder writes its own file under a new name, with the code inside and the code's image
    names. The code book keeps the old holder's file paths (`files`). *Why:* 2026-11-19, the user. *Where:* `codeRecord`,
    `ofPlan` (`codeGone`). *Why:* 2026-11-19, the user; a later redesign will name images in a logical sequence instead of by
    team. *Where:* `codeBook`, `codeAvail`, `codeFreeHTML`, `codeMoved`, `ofPlan`, `pkgName`.
  - A find box, and on Teams a competition filter (codes whose club, now or in the option file, plays in that competition); the
    line above the table names what has no place in the game.
  - **The app shows only the number that matters, never the word "Code" in the trees:** a team's code, a competition's slot
    (the game places a competition file by its slot; the files still carry code and slot as a matching pair). Trees (Project
    structure, Option file contents): "2517" for a club, "41" for a competition (opens it), "game code" for a league folder with
    no competition file, "none" without one; with "no place in the game" and *Allocate a slot* when the game doesn't have it. A
    cup copy shows its league club's code. The lists' tags read "In the game · 41" for a competition. Game codes → Competitions
    lists **Slot** (sorted by slot; codes are in the tooltips), Teams lists **Code**. *Why:* 2026-11-19, the user: "keep them as
    a matching pair but only show in the app the number that matters". *Where:* `slotOf`, `shownNo`, `tocTeamId`,
    `tocCompId`, `placeTag`, `VIEWS.codes`.
  - Competitions and Teams lists tag each one "In the game · code" (a code the game knows, or one set here) or "No place in the
    game" with *Allocate a slot*, which opens Game codes (*Give a code…*).
  - File names don't carry the code: `32_Bundesliga.ced` holds competition 50 (PES 2021's fictional PEU League renamed),
    `50_FIFAWorldCup.ced` holds 34.
  - **Database diagram:** `docs/DATABASE_RULES.md` §2 shows `GAME_CODE` (built by the page, not stored), `PES2021_TEAM_LIST`
    and the `codeSet` / `noCode` fields; keep it in step with this page.
  *Why:* 2026-11-18, the user. *Where:* `VIEWS.codes`, `codeRows`, `codeUncoded`, `ACT.codeRowApply`, `codeAssign`, `placeTag`,
  `ofPlan` (`teamId`/`compId`, `noCode`).
- **The game's team groups** (the user, from the game, 2026-11-23).
  - **28 groups with allocated teams, leagues and cups.** 26 are usable as leagues. Two are usable as cup competitions: the
    AFC Champions League group and the international cup group.
  - **3 pools:** Other Teams (Europe), Other Teams (Latin America), Other Teams (Asia). They hold teams but are not
    competitions.
  - **Classic Teams** is a pool with two teams (THE LEGENDS, THE ICONS). There is no group or league called legends teams.
  - Konami League and Konami Cup are not counted. Their files, exported from the game (2026-11-24): KONAMI Cup is code 47,
    slot 37; KONAMI League is code 99, slot 86; neither names a logo. Both are in the studio's slot list (`COMP_SLOT`,
    `KNOWN_COMP_IDS`, the user, 2026-11-24: "Yes, add them"), so Game codes → Competitions shows them as free slots 37 and
    86 that a competition can be given.
  - **Every other cup has no teams of its own:** it takes the league teams, filtered by region. A cup's team list in the
    studio is never written to any file, and no team can be added to such a cup by a file.
  - The 26 leagues in the studio's code list: Premier League, Championship, LaLiga, LaLiga 2, Serie A, Serie B, Ligue 1,
    Ligue 2, Eredivisie, Liga NOS, Jupiler Pro League, 3F Superliga, Scottish Premiership, Swiss League, Russian Premier
    League, Süper Lig, Brasileirão Série A, Série B, Liga Argentina, Campeonato Chile, Liga BetPlay, CFA Super League,
    Thai League, and the three fictional PES leagues the option file renames (PEU: Bundesliga, PLA: MLS, PAS: BRI Super
    League).
  - The international cup group is not in the studio's code list yet: its name and teams are to be read from the game.
  - **Only 9 cups can be picked in the game** (the user, 2026-11-23). Every other cup is built into the game and runs by
    itself when certain leagues are played. **The studio leaves cup files as they are:** it doesn't add, remove or replace
    them on its own, and doesn't flag the built-in ones.
  - **The option file's cup files don't make cups; they retitle the game's own** (read from the 2026-27 option file,
    2026-11-24). Sydbank Pokalen (code 142, slot 129) and Thailand Champions Cup (code 165, slot 141, the game's last
    slot) are on slots the game already has, like all 54 of its competition files: the game's Danish cup and Thai super
    cup, given a title and a logo. A cup file is 852 bytes and holds no team list. Besides code (80), slot (104), title
    (114) and logo (804), only fixed fields differ between files, all copied from the game's own file for that slot:
    - 106 (2 bytes): **not fixed by the game.** In the option file it runs 0 to 57 (UEFA Champions League 0 … Thailand
      Champions Cup 57), but the same competitions exported from the game on 2026-11-24 carry other numbers (UEFA Champions
      League 47, FIFA Club World Cup 24 where the option file has 4) and KONAMI Cup and KONAMI League have 0xFFFF. So it is
      a number the file's maker set, not the game's order; leave it as the file has it.
    - 110 (2 bytes): the kind: 0x0180 for domestic cups and super cups, 0x1041 to 0x1182 for leagues, 0x0100 for UEFA's
      club cups, 0x0184 for national-team cups.
    - 108 (2 bytes): **not a country** (checked 2026-11-24 against the country numbers of all 637 team files): England's
      cups and the Championship have 711, Denmark's cup 721, the French cups 801 and 803, while team countries are below
      256 (ENGLAND 204, DENMARK 203, THAILAND 36). Read as one byte it still doesn't match (England's 199 is BULGARIA's).
      It is shared by unrelated competitions (140: Copa del Rey, KNVB Beker, Croky Cup, Swiss Cup, MLS, BRI Super League;
      22: World Cup, LaLiga Hypermotion, Piala Indonesia), so it is more likely a presentation setting (ball, stadium or
      broadcast style); not known.
    - 112 (2 bytes): not known (national-team cups 0x02e0 to 0x03e0, club competitions 0x0060 to 0x01e2).
    So the cup runs by itself with the teams of the league on its region (3F Superliga for 142, the Thai League for 165).
    **A competition file carries no country and no league.** The game knows a competition only by its slot (with its code),
    and which country, league and teams go with that slot is the game's own data. The file's name means nothing: the user's
    exports `Zirrat.ced` and `Ztuff.ced` are Turkey's cups only because they hold slots 120 and 121 (checked 2026-11-24:
    their byte 108, 203, is also the Africa Cup of Nations' and the Colombian cups').
    Which league is not in the file: game test 27.
  - **The three Other Teams pools don't show up as leagues in the game, and the studio shows them as pools:** a Pools filter on
    Competitions, a Pools section in the trees, "Pool" on their cards. Their clubs are in a pool, never "without a league".
    *Where:* `OTHER_POOL_KEYS`, `isOtherPool`, `compKindLabel` (app-core.js).
  - **The FIFA World Cup goes on the international cup.** The option file's FIFA World Cup file is code 34 (slot 27), the
    code of the game's own World Cup sample (`WordCup.ced`). So it is most likely the international cup's place, renamed by
    the file: a competition's title and emblem change by its file (tested). To be confirmed in the game: question 23.
  - **Not yet done in the studio:** the AFC Champions League group is filed as a league.
  - *Where:* `assets/pes21-teams.json` (groups by code), `slotComp`, `isCupComp`; docs/GAME_TESTS.md "Already answered".
- **A team file holds the team's country: byte +14 of the team block** (team block at 80, so byte 94 of the decrypted
  file; 2 bytes, values below 256 so far). Found 2026-11-23 by comparing all 650 team files of the 2026-27 option file.
  - The country numbers are the game's: each national team's file carries its own (ENGLAND 204, SPAIN 236, ITALY 215,
    FRANCE 208, NETHERLANDS 224, IRELAND 214). 102 national teams name 102 numbers. A few numbers have no national team in
    the option file: 32 (most PAS league clubs: probably Indonesia), 9, 10, 21 and 38.
  - Real leagues agree with their country (Premier League and Championship 204, LaLiga and LaLiga 2 236, Serie A and B 215,
    and so on).
  - **The three fictional PES leagues don't.** Their clubs kept the countries of the PES teams whose codes they took:
    - Bundesliga (PEU) clubs show Italy, Greece, Turkey or Spain.
    - MLS (PLA) clubs show Peru, Bolivia, Brazil, Chile, Ecuador, Colombia, Paraguay, Uruguay or Venezuela.
    - BRI Super League (PAS) clubs show Iran, Japan, the UAE, Uzbekistan, Saudi Arabia and others.
    - AD CEUTA (LaLiga 2) shows Denmark.
    - A club that takes such a code, like the Saudi clubs on MLS codes, takes that country too: the studio doesn't write
      this byte (`TED.build` keeps the template's).
  - The pools and the AFC group hold clubs of many countries, each with its own (Other Teams (Europe): Italy 10, France 5,
    England 4…).
  - What the byte does in the game (the region a club is drawn from for cups, the flag shown) is game test 24.
  - *Where:* `TED.TEAM`; docs/GAME_TESTS.md question 24.
- **THE LEGENDS (2703) and THE ICONS (2704) are the teams of the game's Classic Teams pool; the studio keeps no competition
  for it** (the user, 2026-11-23: "make the system ignore the icons and the legends from teams who are not in a
  competition"; 2026-11-24: "the group (pool) is called Classic teams, hosting the icons and the legends … drop the group
  and keep the teams").
  - The teams stay, in no competition (`compId` empty). They are found by code, never by name.
  - They are never listed, counted or offered as teams in no competition or without a league; the trees, Team Files and
    the export lists show them under *Classic Teams*.
  - Exports put them in `WEPES/Classic Teams/<code> <name>/` (`teamDirComp`, `CLASSIC_POOL`).
  - The group the studio made for them on 2026-11-23 is removed from a project when the World Cup is checked
    (`ensureLegends`), and so is "Legends Teams", a competition made from nothing but the option file's folder
    "30. Legends Teams" (no file, code or league: `folderOnlyComp`); the teams leave it first. Game codes → *What can change* shows the pool as its own row, from the two teams.
  - *Where:* `GAME_NO_LEAGUE`, `gameNoLeague`, `inNoComp`, `teamDirComp` (app-core.js); `ensureLegends`
    (app-game-files.js); `codeRulesHTML` (app-boot.js).
- **A deleted team's players are free IDs, with or without a baseline snapshot** (fixed 2026-11-23: the user deleted teams and
  no free IDs showed up). Every team file of the option files counts as being in the game, read by code (`pcFileList` from
  `ofRead`). That includes teams deleted in the studio, teams that lost or changed their code, and a code's second file. So
  their players count as players the game has, and those no team now holds are free player codes. Before, a deleted team's
  file counted only through the baseline snapshot or the code book's paths, which the code-only model no longer keeps.
  Game codes → Free codes opens on the first part that has free codes (Teams, Players…), not on an empty Competitions part.- **An export never hangs, and a folder export can continue** (the user, 2026-11-23: the online download stopped at 89% and
  69% and never moved again).
  - Each file is read with a time limit (`OF_STALL_S`, 90 s). A read that stalls (no answer, or the bytes stop) is retried up
    to 7 times, and the progress bar says which file it is waiting for. Only when every try fails does the export stop,
    naming the file and the reason. A file the server says is missing (404) stops at once.
  - **Write to a folder continues where it stopped:** run it again into the same folder, and every file already there at its
    full size is kept, not read again. The size is the file's own: for a file the studio builds (a rebuilt team file, a
    resized kit, an image of yours), the bytes already made, never the option file's size. Before 2026-11-23 those were
    compared with the wrong size and written again every time. Choosing the `WEPES` folder itself works too. The progress
    says how many files were already there. Tested with a stand-in folder: stopped after 25 of 50 files, the next run wrote
    the other 25, and a third wrote none.
  - A ZIP can't be added to once it stops, so the stop message points to Write to a folder.
  - *Where:* `ofFetchBytes`, `ofContents` (its `skip` set), `ofWrite` (folder), `ACT.ofGo`.- **Fixed codes can't be changed on Game codes** (the user, 2026-11-23, from the game tests).
  - **The relay decides what is fixed** (the user, 2026-11-24: "make a relay to automatically tag them based on the What
    can change rules … also apply this automatically on editing competitions, teams, players and their assets (aka PES
    Default) based on the relay"). `gameRule(o, what)` (app-boot.js) answers for a competition or a team from the *What
    can change* table (`CR_GROUPS`): `logo`, `name`, `teams`, `nteams`, `tnames`, `temblems`, `players`, `nplayers` →
    can change, cannot, not tested, kept by the studio, does not apply. Everything below asks it, so a mark changed in the
    table changes them all; never add a lock or a tag that reads something else.
    - A competition answers from its own row. A team answers from the row of **its place in the game, its code's league**,
      never the competition the studio files it under.
    - **Only ✕ locks.** The hourglass (not tested) locks nothing.
    - **One answer per league of the game** (`nameFixedMap`, `leagueNamesFixed`): a league is fixed when at least half of
      its codes that have an option-file team file keep the game's own crest; then **every** code of that league is fixed,
      with or without a file. The Thai League has no file and is fixed by test 61. There is no "name may be fixed" any
      more: this replaces the levels 2 and 1 described under "The studio marks those codes" and "Edit only what the game
      lets change" below (`nameFixed` now answers 2 or 0). Changed by this on 2026-11-24 in the 2026-27 option file: 16 codes with no file became fixed (Monaco,
      Marseille, PSG, Lyon, Montpellier; Juventus, Lazio, Fiorentina, Roma, Atalanta, Napoli; América Mineiro; four AFC
      codes), 20 "may be" became fixed (Inter, AC Milan, Brescia, CD Nacional, Cúcuta Deportivo, 15 Thai League codes),
      18 "may be" in the two big pools became not fixed.
    - **A test on one team decides its league, before the file sign** (the user, 2026-11-25: "why is this team or any
      team in its league marked fixed? If one team can change, the whole league's teams will"). `LEAGUE_NAMES_TESTED`:
      the Colombian league is **not fixed** (Cúcuta Deportivo's place showed the option file's ATLÉTICO HUILA on 22
      November), although Santa Fe kept its name in test 30 and JUNIOR was still in the game after being deleted; the Thai
      League is fixed (test 61). Add a league there whenever a test shows one of its teams changing or keeping its name
      against the file sign.
    - **The game's own team at a code** (`gameOwnTeam`: the team the option file's own file for that code holds, or one
      under the game's name) is what gets locked (`teamFixed`, `teamRuleLock`): name, delete, move, another code. A club of
      the project put on a fixed code (Kalba on Monaco's 112, Ajman on Buriram United's 1493) is not that team: it stays
      free to rename, move or delete, and its team page says which name the game will show. On Game codes its row is
      like any fixed code's: **Fixed by PES**, no picker (2026-11-28, the user); it leaves the code from its team page
      (a move to another league).
    - **Editing:** competition name and logo (`compNameLock`, `compLogoLock` via `compRuleLock`); team name (`infoTab`);
      players: no add, edit or remove where *Players* is ✕, no add or remove where *Number of players* is ✕
      (`ACT.addPlayer`, `editPlayer`, `delPlayer`, `savePlayer`); crest: not chosen or designed where *Team emblems* is ✕,
      and the slot shows **PES default** (`ofOwnSlot`).
    - **Imports, Live Update and Claude updates** (2026-11-25, the user: "do them"): all are applied by `applyBatch`
      (Process and Review's Apply, Apply all, Install). A change the relay forbids (a team's name or crest, a
      competition's name, short name or logo, a player added, removed, moved or edited) is left out and counted; the
      toast says how many, and the rest of the batch goes in. Fixes made straight from the health check, and reading or
      rebuilding from an option file, do not pass through it.
    - **The export** (2026-11-25): `ruleView(o)` gives a team or competition as the game will have it, and both exports
      (`ofPlan`, the Team Files export) write that: the option file's name where the name is ✕, no crest or logo image
      and no image name where that is ✕ (the slot is left to the game), and with Players ✕ the option file's own team file
      copied as it is (else a team-info file that keeps the game's squad). With no ✕ that applies it returns the object
      itself, so the export of everything else is unchanged (checked: no team or competition differs with today's marks).
    - **A competition slot is fixed by its own row** (2026-11-25): the World Cup's, and any competition whose *Which
      teams* is ✕ (`codeFixedWhy`). Whether a competition can be deleted is still `compLockWhy` (it holds one of the game's
      fixed teams).
    - The tag on Game codes reads **Fixed by PES** (2026-11-28, the user; was "fixed"), once per row, in *Your Update*;
      the *In PES* column carries no tag.
  - **A fixed league carries the tag too** (2026-11-28, the user: "I don't see a tag beside the leagues that are
    fixed. check the relay"). `compFixedWhy(c)` is the relay's answer for a competition (`gameRule(c,'teams')` ✕, or the
    World Cup), with or without a slot. The fixed leagues are the game's own (Serie A, Ligue 1: no competition file,
    no slot), so no table listed them: Game codes → Competitions now lists the game's own leagues under the slots
    (slot "—", no picker), each **Fixed by PES** or "its teams can be replaced" (Liga BetPlay); they count in the
    Fixed by PES filter. The same tag (`compFixedTag`) is beside the competition on What can change and on the
    Competitions page (`placeTag`). The Competitions table waits for the team files like the Teams table.
  - **Fixed team codes:** a code the game keeps under its own name (a licensed team: `nameFixed` 2, tests 58 to 60; JUNIOR,
    22 November). It stays with its team: never freed, never given to another team, and its team never takes another code.
    That's 438 codes in the 2026-27 option file, the national teams included.
  - **Fixed competition slots:** a slot held by a competition that can't lose it (the World Cup; a competition holding a
    licensed team).
  - Their Game Codes rows show the holder with a **Fixed by PES** tag and the reason, with no picker and no Apply,
    whoever holds the code (the game's own team, a club of the project, or no one). No picker offers them, and the
    Apply actions refuse them.
  - **A fixed code is never a free code** (2026-11-28, the user): `codeFreeAll` leaves it out, so it is not listed on
    Free codes, not counted in "N free" or in the tab's count, and not offered to a team with no code, also when its
    holder was deleted (Monaco's 112, PSG's 114 and six more were listed as free).
  - **The table filters** (2026-11-28): *Which codes* is Free / Fixed by PES / All, with the count of each, on Teams
    (opens on Free) and Competitions (opens on All). The competition filter lists only competitions that have teams and
    keeps the codes of that competition's league in the game (`codeInComp`: a team's league is its code; the World
    Cup's are the national teams' codes) plus the codes its teams hold, so free and fixed codes of the league show too.
    Free codes → Teams has the same filter and offers a code only to teams of its league (`codeLeagueOk`), and the
    tab's count is the sum of its four tables, free player codes included.
  - Until the option file's team files are read no code is known to be fixed, so the team tables wait
    (`codeFixWaitHTML`): a fixed code never shows as free, with a picker, for a moment.
  - *Where:* `codeFixedWhy`, `FIXED_TAG`, `codeInComp`, `codeFreeAll` (app-boot.js); `codeKindHTML`, `codeFreeHTML`, `ACT.codeGive`, `ACT.codeRowApply`,
    `ACT.codeFileApply`, `ACT.codeApply2`.- **A game league takes its teams by their codes, whatever the studio files them under** (the user, tested 2026-11-23:
  "the fixed league will read the team file code regardless what league you put it in in the system"). AMÉRICA DE CALI
  (1257) and JUNIOR (2285) are in Liga BetPlay in the game although PES Master's list of team codes has neither. **The game
  is the authority on which league a code belongs to; the list in `assets/pes21-teams.json` only mirrors it.** A code the
  game shows in a league that the list misses is added to the list with where it came from (`"from"`, the test). After
  that, the only option-file codes the list has no league for are THE LEGENDS (2703) and THE ICONS (2704), which have none.
  *Where:* `assets/pes21-teams.json`, `slotLeagueOf`; docs/GAME_TESTS.md question 22.
- **Competitions come from game files; a club is in its team slot's league. The option file's folders decide nothing.**
  A competition is a competition file (.ced), or one of the game's own leagues (no file: `gameLeague`, the PES 2021 league
  key). An option-file club is placed in the league of its team slot in the game (`assets/pes21-teams.json`, PES Master), the
  way the game itself places it; a competition file stands for a game league by its code (`LEAGUE_OF_CODE`), and a game league
  without one gets a competition named after it (`LEAGUE_NAME`). National teams join the World Cup; a club whose slot PES 2021
  doesn't list (The Legends, The Icons …) gets none. Folders are still where the export writes a team's files. A project built
  while folders decided was moved once, with a snapshot (`settings.slotLeagues`): clubs the folders placed went to their slot's
  league, clubs you had moved yourself stayed, and folder-only competitions left empty were removed. *Why:* 2026-11-21, the
  user: "make the system ignore the folders completely", choosing the team slot over the folders' season line-up (Coventry
  City is in the Championship, where its slot is). Three leagues the folders had split in two were merged, and cups and
  play-offs read as leagues were marked as cups (`CUP_RE`: play-offs, Schaal, Piala, Ascenso). *Where:* `slotLeagueOf`,
  `slotComp`, `LEAGUE_OF_CODE`, `LEAGUE_NAME`, the build (`ofBuild`) and the one-time move after `extBoot`.
- **Leagues in the game are arranged by hand: Edit → Competition Structure.** Competition files hold no team lists, and a team
  file keeps its club's own team slot, which PES 2021 places in a league; importing never moves a club between leagues. Any
  club can be moved to any league in the studio, and the studio lists the moves to make in the game, league by league
  ("Competition Structure in the game" on Import / Export → Summary and in the health check, on the team's competitions
  dialog, and in CHANGES.txt). Since clubs start in their slot's league, the list holds only the moves you make. *Why:*
  2026-11-18, the user. *Where:* `csPlan`, `slotGuideHTML`, `csMoveNote`, `csText`.
- **Never copy package images** into browser storage or baselines; refer to them as `o:<package>|<path>`. *Where:* `ofRef`, `ofBuild`.
- **Building from an option file starts over with a clean slate.** The site's baseline and a user's own upload alike: the
  whole project is deleted first (teams, competitions, images, snapshots, review queue, history, stored files and the
  `pes21.*` lookup caches; online through `POST /api/wipe`, which keeps the account's own uploaded option files), the page
  reloads empty, and the option file is the only source. Nothing of the old project is kept or merged; `ofBuild` refuses
  a project that still has teams. The user is warned first when there is anything to lose. *Why:* 2026-11-18, the user
  ruled out merging with cached data. *Where:* `startFresh`, `wipeProject`, `finishFresh`, `cloud.wipe_project`.

## 3. Game files, names and IDs

- **Any file name works for any file type.** Files are tied together only by the names inside team (`.ted`) and competition
  (`.ced`) files. Never decide what a file is from its own name or folder when a game file names it; name and folder guesses are
  a fallback for loose images only. *Where:* the importer (`Import links files by the names inside the game files`).
- **Every team and competition has its own game file** (imported, option-file or generated). Real files always win over
  generated ones: re-importing a real file replaces the generated one and its IDs.
- **Nothing has ID 0.** A team without a free slot gets a random unused number in PES 2021's team range; a competition a random
  unused competition number; a player without a game ID a random unused edit-player ID (bit 30 set).
- **A cup copy of a club shares its league copy's team ID, player IDs and file**; it has no file of its own.
- **Pool leagues are leagues, not cups** (2026-11-21). AFC Champions League and the game's "other teams" pools
  (`afc-champions-league`, `other-teams-asia`, `other-european-teams`, `other-teams-latin-america`) are leagues of their own;
  every club in them is its own team at its own slot, and having clubs that also play in a domestic league is the norm. A
  competition with a `gameLeague` is never a cup (`isCupComp`). When a pool club has a namesake in a league the game does not
  have (one added to the option file, e.g. a Saudi league), the health check (More checks → "Cup copies of league clubs")
  offers **Update from …**: the pool club takes the league club's details, kits, crest and squad, and each copied player takes
  a code of his own (a player is in one club only), the pool club's own codes first, then free ones. Names must match word for
  word ("Al", "FC"-type suffixes and a country word aside); clubs of the game's own leagues are PES's own distinct clubs
  (Guaraní/Guarani, PSG/Paris FC, Manchester United/City) and are never paired (`poolTwins`).
- **Add to Option file has three ways to apply, and no more** (the user, 2026-11-26): *Only add what is missing* (the default: nothing you have changes), *Replace what I have* (values from the files overwrite yours, for everything set to Update), and *Install as new* (every team file becomes a new team with all its players; no team or player of the same name is looked for, when the changes are worked out, shown or applied: `_asNew` → `notSame`). Install as new changes nothing you have; a player who is also in another team is added again on the same game ID and the Health check lists him under shared game IDs. "Fill missing values" is gone (a saved `fill` reads as `add`).
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
  is free, a random unused number in the team range, which has **no place in the game** (below). *Where:* `freeTeamSlot`, `usedTeamSlots`.
- **Competition IDs** are small: the option file uses 1–165. A new one without a game competition's code gets a random unused
  number up to 199 (`COMP_ID_MAX`), which has no place in the game and isn't exported (below).
- **The game only overwrites; it never adds a team or a competition.** Import Team and Import Competition put a file on a
  team or competition the game already has. A team file with a code the game doesn't have is refused: "This data cannot be
  imported. Either the team to import data to does not exist, or editing the team is prohibited" (PS5 test 6, team 9101 with
  18 existing players and no gaps). A new club or league
  therefore always takes the code of one the game has (Game codes → Allocate a slot), and that team or competition is replaced.
  Both exports say so for every team whose code isn't a game team's (`codePlaced`), and leave out every competition file whose
  code isn't a game competition's. *Why:* 2026-11-19, the user's PS5 test: 8 teams with codes 9101–9108 and their players
  never appeared, and the competition with code 188 landed on the Premier League.
- **A competition file's slot index goes with its code.** The game finds a competition by the 2-byte slot index at 104, not by
  the code at 80; each code has its own slot (Premier League 17 → 9, World Cup 34 → 27, Bundesliga 50 → 39; slots 1–141, all
  held). Writing a code always writes its slot (`cedSetCode`), and no competition file is written whose code and slot don't
  belong together, or whose code the game doesn't have (`cedProblem`, in `CED.build` and both exports): a file with a
  template's slot would overwrite that template's competition. The slots come from the site option file's competition files
  (`COMP_SLOT`), the built-in files and any other option file's own files (`compSlots`). Team files have no such index: a team
  is found by its code alone. *Why:* 2026-11-19, a new league built on the built-in Premier League file (slot 9) replaced the
  Premier League's logo in the game. *Where:* `CED.SLOT`, `COMP_SLOT`, `compSlots`, `cedSetCode`, `cedProblemD`.
  - **A file the studio made is made again when its code changes** (`needsCompFile`, 2026-11-24). ADNOC Pro League's file
    was made on 2026-11-20, before made-up codes were banned: code 194, which the game doesn't have, so `cedSetCode` found no
    slot for it and the built-in template's slot 9 (the Premier League's) stayed. Game codes later gave the league code 55
    (PIALA INDONESIA's place, slot 44). The export already wrote 55 and slot 44, but the stored file kept 194 and slot 9.
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
  characters. Team file: name 70 bytes (team block +104), short name 3 capital letters (+174), stadium 120 (+178, file offset 258), coach 46 (file offset 677).
  Competition file: ID at 80, name 61 bytes (60 + terminator) at 114.
- **Image names inside game files are 33-byte fields** (32 characters + terminator). Exports write plain ASCII names of at most
  31 characters, extension included (`pesName`, `PES_NAME_MAX`). Offsets: crest 503, stadium 536, sponsor boards 569/602/635,
  manager 723, kits 1766 + 132·k (1st, 2nd, GK 1st, 3rd, GK 2nd); competition emblem 804. Image names follow the ID:
  `E_/M_/K_<team id>`, `C_<comp id>`.

### Squads
- **At most 40 players per team** (40 slots of 312 bytes from 2328). Over 40 is a must-fix; the export drops the rest.
- **A playable squad needs 15 or more**, with at least one goalkeeper (none is a must-fix). One goalkeeper is acceptable in the game: the health check never asks for a second.
- **Shirt numbers 1–99, each once per squad** (2 bytes in the squad block); a repeated number is a must-fix.
- **A squad has no gaps.** Players fill places 1, 2, 3 … of the squad list (4-byte IDs from 760), with their records (2328 +
  312·place) and numbers (920 + 2·place) in the same order. Places 1–18 are the matchday squad (11 starters, 7 substitutes): a
  gap there makes Import Team refuse the file with "This data includes players who cannot be imported". The writer closes the
  gaps a dropped player leaves (`TED.build`). *Why:* 2026-11-19, the user's PS5 tests: of 8 rewritten clubs, the 3 whose dropped
  players left gaps in places 1–18 failed and the 5 without gaps imported; the same 3 clubs' option-file files, without gaps,
  imported; rebuilt with the gaps closed (test 5), all 3 imported.
- **Import Team only changes players the game has; it never creates one.** A team file that lists a player ID the game
  doesn't have is refused with the same message ("This data includes players who cannot be imported"). New players are made
  in the game first (Edit), then written by their IDs. *Why:* 2026-11-19, PS5 tests 2 and 6: test 6's file was the one that
  imported in test 5 plus one new edit-ID player, and it was refused. **Both exports leave out every player no game file has**
  and list them in their notes ("left out, no game file has him"); the squad closes up around them. Only with *Also write
  players no game file has* ticked (off by default: `settings.ofNewPlayers` on Import / Export → Export Option File, `E.parts.newPlayers` in
  Partial Export) are they written under their edit IDs, for IDs the game already has, such as unregistered players.
- **(Replaced 2026-11-23: one file per team code, see "An option file is files and their links".)** Before, a team slot's second file got the same squad as its first. The 2026-27 option file has two files for 29 team slots, 9
  with different squads (some for a different club at the same slot: Sheriff / Le Mans at 4240, Jobazavar / Charlotte at 4040,
  Schalke 04 twice, Inter Miami twice, Republic of Korea twice). Both are written with the team's data, so a player whose
  record is only in the first file is written into the second from the first file's record, never left out. *Why:*
  2026-11-19, the user's export notes still listed 7 clubs with players left out after every player had a code: all 7 were
  second files. *Where:* `teamPlayersFor` (a record missing from the file being written comes from the team's other file).
- **The export notes, the health check and Game codes give the same answer about players no game file has.** They are worked
  out with the export's own `teamPlayersFor` for every squad (a player can carry a game record link whose record no file holds,
  so the link alone proves nothing; only a club exactly as its option-file file has it is skipped: `nfSame`), in the background
  and only while Health check or Game codes is open. The health check lists them one row per player ("Players no game file
  has": Should fix, or Must fix with *Also write players no game file has* ticked, since the game then refuses the team).
  *Why:* 2026-11-19, the user's Changes only export listed 41 clubs with players left out while the health check and Game codes
  showed nothing. *Where:* `noFileScan`, `noFileOf`, `noFileFind`, `healthIssues` ("Not in the game").
- **Player codes: a player no game file has takes over the code of a player the game has that no squad uses any more.** A
  player's code is his game ID. Giving a code only sets his link to that record (`p.ted`, `p.gameId`, `p.codeSet`; the old
  values in `p.codeWas`): the export then writes him like any player a file has, over that player (name, age, height,
  position, ratings, nationality; the look stays the replaced player's until edited in the game). The export itself is not
  changed, except that a given code's record is also found once its club is gone from the studio (`settings.codeBook.player`,
  read by `recFromAnyFile`).
  - **The codes are read from the team files themselves**: the studio's and the baseline option file's, so clubs deleted
    since still count (`pcFileList`, `pcLoadAll`, `pcGame`). A team slot's second file (`t.of.copies`) is read too: the
    game imported both files, so the players only it lists are in the game (33 in the 2026-27 file: 16,775 player IDs in
    all 679 files, 16,742 in one file per team; the user, 2026-11-19). A code is **held** by the player the export writes under it
    (`pcHeld`; a squad not checked yet holds every ID its players carry, so a held code is never given away) and **free**
    otherwise. Clubs kept out of the game (`noCode`) hold nothing.
  - **Game codes → Players**, the same two tables as Teams: *Game Codes* (Code · In Option File · Your Update · Apply; free
    codes by default, *All player codes* on request) and *Players with no Codes* (Player · Team · Status · Give him a code ·
    Apply, with *Give the suggested code to all*). *Free codes* has a Players table too. *— Free —* takes a code from its
    holder; choosing a player with no code gives it to him and the old holder loses it.
  - **The suggested code** (`pcPlanMake`), in this order: his own ID when a file has it and no one uses it; for a national
    team, the record he has at his club; a free player of the same name; a free player of the team the game has at his club's
    code, same position first, then same line; then a free player of a club no longer in the game; then any free player.
    The free players of the team's own game league come after its code's and before a club no longer in the game: a
    preference only, since a player moves between clubs freely in the game (tests 1 to 5 and 11).
  - **New players take free IDs by themselves** (2026-11-22, the user: "the system must automatically use ID from free ID
    already existing in the system"). After any change that adds players (Process and Review, an import, a player added
    by hand, Live Update), every player with no game record is given a free ID by the order above, one undo step, with a
    toast; whoever is left (no free ID) shows in the health check, where *Allocate free codes* and *Make room* are. A
    player who has an ID is never given another player's; never a made-up ID. *Where:* `autoFreeIds`, `autoFreeIdsSoon`
    (app-boot.js, after `ensureGameFiles` and on any team save with a player lacking a record).
  - **A team that takes a code takes over its players**: on every Game codes command that gives a team a code, the team's
    players with no code take over the free players the game has at that code (`pcTeamTake`, the first four steps above only).
  - **A team update gives the new players the removed players' IDs** (2026-11-25, the user: "every team update replaces the
    removed players with the new ones and if more IDs needed, push the rest to players missing IDs"). After every apply that
    changes who is in a squad (Process and Review's Apply and Apply all, Import's Install), the team's players with no game
    ID take over the records the removed players left free at its code (`pcTeamTake` again), and a message says how many.
    New players beyond the IDs freed stay without one and are listed under *Players with no game ID*. It needs an option
    file loaded (no option file, no game records). *Where:* `SQ_CHANGED`, `sqTakeAfter` (`js/app-comp-add.js`).
  - **What an apply never does** (audit of 2026-11-25, the user: "make sure every database update in process and review
    follows the rules"; `applyBatch`, `js/app-claude.js`):
    - *It never moves a code.* A `gameId`/`gameSlot` change on a team or competition that already has one is left out and
      counted with what the game keeps; an empty one may be filled. A code is never typed in the review either. Codes move
      on Game codes (`codeAssign`).
    - *It never loses a transferred player.* A player another waiting batch transfers is not removed by this batch,
      whatever order the batches are applied in.
    - *It never merges two clubs on the name alone.* A new club is the project's club of that name only when their
      countries don't say otherwise (`clubVerdict`) and you didn't answer No to "Same club?" (`it.notSame`).
    - *It never leaves a dead link.* A cup's team list keeps only teams that exist; a team whose competition doesn't exist
      is left without one (it shows under Teams without a league).
    - *Filling an existing team or competition asks the relay too* (`teamRuleLock`, `compRuleLock`): a crest, logo or
      squad the game keeps is not filled in.
    - *One history entry per batch* ("Applied: <title>"). Teams changed are saved even if an item fails, and a batch that
      failed stays waiting, with a message naming it.
  - **Live Update is the other fix for a broken team file** (2026-11-25, the user: "isn't there another way to fix the
    rest?"). A Broken team files row with a place Repair can only leave out (an ID no team file holds, an ID the option
    file's maker created, a player another club holds) or with players who have no name also has **Live Update**: the
    team's Live Update (`ACT.teamLive`, it asks with the estimate), which brings its real squad. Applying it gives the new
    players the IDs of those who left (rule above) and marks the file to be written again by the export
    (`settings.sqFix`), so the row reads repaired. One button and one name: it was *Find the real squad* and, for a day,
    *Update the squad*. *Where:* `ofBadHTML` (`js/app-health.js`), `sqTakeAfter`.
  - **Allocate free codes (N)** in the group's header gives every player without an ID his suggested free code at
    once (a player who has an ID is left out: see "never offered another player's ID" below) (one confirmation, a snapshot first, one undo step). **When no free code is left**, the header says so and
    **Make room** opens as a popup window, on whatever page needs it (a *Make room* button on Overview and Game codes
    whenever an option file is in use (2026-11-22, the user), a player's row, the group header,
    after allocating, after updating a pool club, after giving shared-ID players new IDs; `ACT.pcRoomOpen`); it is never a section of the page. It lists the
    teams and competitions to delete, ranked by how
    many codes each would free (the codes only its squads use): classic sides (Legends, Icons) and teams in no league
    first. Each delete asks first; the freed codes are then allocated again. The players' own clubs, national teams and
    the World Cup are never offered. *Why:* 2026-11-21, the user: auto allocate them to available numbers, and if none
    are left, ask to delete unwanted teams or competitions. *Where:* `ACT.pcAllocAll`, `pcRoomData`, `pcRoomHTML`,
    `ACT.pcRoomOpen`.
  - **Health check**: for a player with **no ID**, each row's suggested action is that code ("Take over …", "Relink his own
    record", "Use his club record"), with *Game codes* opening Players with no Codes for that club; *Apply all suggested
    actions* gives them all from one plan, so no code is given twice.
  - **A player with an ID no game file has is never offered another player's ID** (2026-11-21, the user: "you cannot suggest
    giving him a new ID. it has to be to find his team from free sources or claude, or manually allocate him"). Only his own
    record or, for a national team, the record he has at his club is suggested straight away (`pcMay`); *Allocate free IDs*
    skips him. His row's fix is **Find his team** (job `plTeam`, `runPlTeam`: eFootball by his ID, the Transfermarkt dataset
    by name, age and nationality, then Claude with web search when unsure; *Find their teams (N)* does the group). The
    answer is kept per player and season in the browser (`pfStore`) and changes nothing by itself. What the row then offers
    (`pfSug`):
    - the game has a player of his name at that team and nobody uses the record: **Link his record at …** (the only one of
      these in *Apply all suggested actions*);
    - someone is already on that record: **Replace …** or **Remove him**, the user's choice, never in bulk. Replace removes
      the other entry when it is the same man; a different player keeps his place and loses the ID;
    - the game has no record of him there, the team is not in the studio, or nobody could place him: by hand only.
    Every such row has **Move to a team** (he leaves his team and joins the one picked, with his details and ID) and, when
    nothing can be linked, **Remove him**. There is no "Pick an ID" in this group (the user, 2026-11-21); Game codes itself
    still lets any code be given by hand.
  - **"Has an ID" means an ID a game file holds a player under** (2026-11-21, the user, after a Live Update of West
    Bromwich Albion: its 25 new players, pulled from eFootball with eFootball's own IDs, were listed as "players with an
    ID"; "I expect that they show in No ID since they are new"). A number only a source gave him is not a game ID: he is
    listed under *Players with no game ID* and takes a free ID. *Players the game has in another team's file* is left for a
    player whose ID the game does know, but whose record is in another team's file or in use by another player: that is
    why its fix is "find his team". The player under that ID must be him by name (`samePerson`): eFootball's numbers and
    the option file's can meet by chance (Callum Styles' eFootball ID is M. BROWNE's in the 2026-27 file). The typical
    case is a transfer: the game has him under his ID in his old team's file, and that team's squad still lists him. The
    row then offers **Take him from …** (his old team's entry is removed and he keeps his record at the new team) and
    **Remove him**; the team "Find his team" names decides which comes first. *Where:* `pcOwnRec`, `pcHasId`, used by `healthIssues`, `pcMay`, `ACT.pcAllocAll`.
  - **The row's commands, with no look-up needed** (2026-11-21, the user): the team listing him is known, so the row offers
    at once **Move to this team** (the transfer: his entry at the original team is removed and he keeps his game record
    here; a record nobody uses, or one a national team shares, is simply linked), **Keep in <original team>** (he is
    removed from this team) and **Find his current team** (the look-up). The look-up's answer changes no data: it puts
    *Keep in …* first when he does not play here, and adds **Move to <team>** when it names a third team of the studio.
    When the record is in his country's file, the first button reads **Keep in both teams** (and the second *Remove from
    this team*): club and country share one ID in the game, they are not copies with IDs of their own. Checked on the
    2026-27 file, 2026-11-21: 1,264 player IDs are in both a national team's file and a club's (S. COLEMAN 40283: IRELAND +
    EVERTON FC); 1,174 are in a national team's file only, because the club's file doesn't hold them. Never give the
    club entry a new ID for this: that makes two players of one man.
    **For now such a player is not in this group at all** (2026-11-21, the user: "don't include in this group the players
    that match the same national team players, unless it's a different person"): a team's player whose ID the game has
    only in a national team's file, under his name (`samePerson`), is written by the export from that record
    (`natShareRec` in `teamPlayersFor`), so he is no longer "left out". He is listed under *International teams* instead.
    Whether the game accepts this is question 1 of `docs/GAME_TESTS.md`; a copy on a new ID is to be tried later.
  - **International teams** (Information group, 2026-11-21, the user): *National players in no team* lists the players of
    a national team whose ID no team of the project uses, each with **Add to a team** (a copy on the same ID joins the
    team picked; he stays in his national team); *Added to a team from a national team* lists the team players whose ID
    the game has only in a national team's file (Open, Remove from the team). *Where:* `natLists`, `natFreeHTML`,
    `natAddHTML`, `ACT.natAdd`, `X['x:natfree']`, `X['x:natadd']`.
    "The team is not known" cannot happen here: every row is a player in some team's squad. A different player sitting on
    his record gets *Replace …* instead of *Move to this team*. This replaces the earlier "look up first" order above.
  - **Every row's suggested action runs in Apply all, for any team** (2026-11-28, later the same day, the user: "there is
    no apply suggested actions to all or find their teams"; this widens the rule below, which was for added teams only):
    *Move to this team* / *Keep in both teams* when nothing says he plays elsewhere, *Keep in <original team>* when a
    look-up says he plays there. Not in the group run: two different players on one ID (*Keep it with …*), *Move to <a
    third team>*, and a row with nothing to go by. When every player has an answer, the header offers **Find their teams
    again (N)** (`ACT.pfFindAgain`) in place of *Find their teams*. The confirmation of *Apply all suggested actions*
    stays open while it runs, its Apply button showing the progress (`ask(…, hold)`, `askDone`).
  - **For a team added to the project, Move to this team is the suggested action and Apply all runs it** (2026-11-28, the
    user: "when a new team addition created Players the game has in another team's file, make move to this team the
    suggested action included in the apply for all automatically"). A team the option file has no team file of its own
    for (`pfNewTeam`) carries the new squad, so its players the game has elsewhere moved here: their row's *Move to this
    team* is marked (`bulk`) and *Apply all suggested actions* moves each without asking again (one confirmation for
    all, a snapshot, one history entry). Never in the group run: *Replace …* (a different player on his record), *Keep
    in both teams*, a row whose look-up says he plays elsewhere, and teams the option file has (their rows stay one by
    one). The moves of one run are all worked out before any is made, and made together at the end (fixed 2026-11-28:
    worked out one by one, each move reset who holds which record for its two teams and the next player of the team
    was refused, "11 actions started. 21 failed"). *Where:* `healthIssues`, `hcBulkList`, `ACT.hcBulk`.
  - **Different players on one game ID have their own sub-heading and their own commands** (2026-11-28, the user:
    "different players with same ID must have its own sub heading in this section with a different set of commands. we
    offer them new IDs or free IDs. i should already have that in the health check elsewhere"). Game IDs → *Different
    players on one game ID* (`sharedid`, moved out of *Players*) lists every such pair once, with **Keep it with …** for
    each player and **Allocate free IDs** in the header. `sharedIds` now also takes the game's own player under
    the ID (the record carries his name, `pcOwnRec`) who is not linked to it because the other uses it in the studio
    (Fabio Depaoli and Luca Caldirola on 111175): the row says whose ID it is, he comes first, *Allocate free IDs*
    keeps it with him (`sharedKeeper`), and keeping it links him to the record. Such a pair is no longer a row of
    *Players the game has in another team's file* (the entry below stays as the fallback for a holder the game files
    are not read for yet).
  - **A different player on his record is "two different players on one game ID", and the ID stays with the player the
    game has under it** (2026-11-28, the user, on Anthony Lopes of Angers SCO and Marcos Lavín of Académico de Viseu FC,
    both on 40990: "make sure this is right", "change the wording to mean that those are two different players on the
    same ID when it means that", "make sure this is not a duplicated health check"). The row says so, naming both players
    and the ID. Its first fix is **Keep it with <the game's player>** (was *Replace …*): the record carries his name, so
    the ID is his; the other player keeps his place and takes a free player ID at once (a snapshot first; with none
    left, Make room opens). The second is *Remove from this team*, never *Keep in <the other player's team>*: that team
    is not his. It is never part of *Apply all*. The pair is listed once: when both are linked to the record and so are
    a row under *Different players on one game ID*, this row is left out. The sub-group *Players the game has in another
    team's file* is under **Game IDs** (moved from Player details). *Where:* `healthIssues`, `ACT.pfReplace`, `HC_LAYOUT`.
  - **A working button shows it is working, and a long run shows its progress in the button** (2026-11-28, the user: "add
    a waiting circle to the button when applying anything … better yet, make apply button show the progress in its
    color"). Every async command's button has the waiting circle (`is-busy`, `markBusy`). A command over many items
    calls `await actProg(done,total)`: the done part of the button keeps its colour, the rest is dimmed, and the screen
    gets to draw. *Apply all suggested actions* does. *Where:* `actProg`, `progPaint` (app-core.js), `.has-prog`.
  - **A source's record at a player's game ID is his only when the name on it is his** (2026-11-28, the user: a Live update
    for missing ratings "brings information for totally different players including changing the player name"). A game ID
    is the option file's, or a free one given in the studio (*Allocate free IDs*, `pcGive`): in eFootball the
    same number can be another man's. Live update for players (`dataPlayers`) takes the eFootball record at his ID only
    when its name is his (`efNameHis`: `samePlayer` or `samePerson`); otherwise nothing is taken from that record, he is
    looked up by name in his team's eFootball squad, and he keeps his own game ID. A team's squad pull (`efDraftTeam`)
    does the same for a player whose ID was given in the studio (`codeSet`). The club look-up for *Same player in two
    clubs* reads the record by ID only under the same name check. Never rename a player from a record found by number alone.
  - **The studio's placeholder ID is not an ID** (2026-11-21). A created player's made-up ID (`newPid`, 0x40080000–0x400EFFFF)
    counts as no game ID everywhere the two groups are told apart (`pcRealId`, `pcHasId`): such a player is listed under
    *Players with no game ID* and takes a free ID like any other. *Why:* three players taken off a shared game ID carried
    only a placeholder and were listed as "players with an ID", which the user rightly asked about: the studio already shows
    them at their team, so what they lack is a game ID. *Where:* the "find his team" block in `index.html` (`ACT.pfFind`, `pfLink`, `pfReplace`, `pfRemove`,
    `pfMove`), `healthIssues` ("Not in the game").
  *Why:* 2026-11-19, the user: "I should be able to replace players I deleted with those players. I thought this happens
  automatically when I allocate a team on an existing code"; build it in the Game codes team-reallocation command, with a
  Players tab like Teams and Images and a recommended action per player in the health check. *Where:* the "Player codes"
  block in `index.html` (`pcGive`, `pcLose`, `pcGiveMany`), `codePlHTML`, `ACT.pcGive`, `ACT.pcGiveAll`, `ACT.pcRowApply`,
  `ACT.pcFileApply`, `ACT.pcOpen`.
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
- **A player's appearance is shown, never written, until a game test says otherwise** (the user, 2026-11-26: "try to make sense
  of this according to the game. add it to the player edit as experimental"). The 72 bytes at 240 of his record are the game's
  appearance entry: player ID, edited parts (bits 0-3 of +4: face, hair, body, kit), boots ID (+4 bits 4-17), gloves ID
  (+4 bits 18-31), a "look taken from" player ID (+8), sleeves / socks / shirt tail (+0x14 bits 6-7, 10-11, 14), 14 body
  shapes (nibbles +0x0C to +0x12, 7 = neutral), skin colour (+0x2D, 1-6), hair and facial-hair colour (6-bit RGB at +0x35
  and +0x3D), facial-hair type, hair length, eye colour. The player editor's *Appearance* (experimental) shows them;
  `TED.build` copies the entry as it is. *Why:* the layout is community reverse engineering, checked against the option
  file but not in the game (docs/GAME_TESTS.md 31). *Where:* `TED.look`, `TED.LOOK_BODY`, `peLookFill`.
- **A team's supporter banners are shown on its info tab, read only**: four texts of 15 letters (16-byte fields at 439, 455,
  471, 487), read from the team's own file (`TED.banners`, `tfBannersFill`). A generic template's banners are another
  club's and are cleared when it is written (`TED.build`, `generic`). 118 of the 679 team files have none.

### Images
- PNG, in the same folder as the game file that names them. Sizes: crest 256 × 256, competition logo 256 × 256, manager photo
  256 × 256, kit 2048 × 2048, stadium 1024 × 512, sponsor boards 256 × 128 (`S.settings.sizes`, `kindSize`). A bigger stadium picture adds nothing: the game shows it in one place, small (the user, 2026-11-26; a downloaded league's stadium pictures ran from 529 × 292 to 1800 × 1033 and looked no better).
- **Game codes page: four tabs, the same tables in each.** Competitions and Teams each have *Game Codes* (only what the game
  has: preset slots and team codes) and *Files with no Codes* (every competition or team with none). Images has *Deleted/ignored
  images (free codes)* and *Images with no code*. *Free codes* has Competitions, Teams and Images. A code is free when no file
  holds it, whether freed on the page or never used, and every free row carries the *free code* tag. An image name is an
  image's code: free names come from codes freed on the page and from option-file images deleted or ignored in the health
  check (`settings.ofOrphan`). Apply renames an image with no code to the chosen free name: kept in `settings.imgCodes`,
  returned first by `codeImgName` so the export writes the image under it, and shown as the image's name in the library. A
  code given to a team takes its image names back from any image holding one alone. *Why:* the user, 2026-11-19.
- **An empty image box for a PES default slot says "PES default", never "none" (the logo shows it in its box, with no second tag on the competition card; 2026-11-22, the user).** The team list and header, the crest,
  manager photo and kit boxes, and the competition logos use `slotThumb(o, key, id)`, which shows the tag when the slot
  has no image and `ofOwnSlot` says the option file leaves it to the game. *Why:* 2026-11-22, the user.
- **A PES default slot is never "missing".** One test everywhere (`missCrest`, `missLogo`, `missCoach`): the Missing emblems tab,
  its count, the free sources and Claude's "fill what's missing" all leave out slots the option file leaves to the game. *Why:*
  2026-11-19, the user: Claude took the whole list, PES defaults included, and the tab said 90 where 6 were missing.
  Every way of asking for logos uses `logoWanted(x, which)` (missing / notfl / all); only *all* covers a PES default. A queued
  logo job keeps the list it was given, so it is trimmed again when the studio opens and when it runs (`logoJobTrim`): a job
  queued earlier never does the whole old list.
  - **A hand-off keeps the list it was opened with.** *Fill N missing…* on Missing emblems opens Live Update → Logos & kits
    set to exactly that list: only missing emblems, of the kind and competition shown; coaches and stadiums unticked, and a
    *Replace all* left over from an earlier run reset (it is a one-off, and asks first). *Run* shows what it will cover
    before it runs (per item, and how many PES defaults *Replace all* adds). *Why:* 2026-11-19, the user: a few missing
    images became the whole list, PES defaults included, once on Live Update. *Where:* `goArt`, `artRunTargets`,
    `artRunCount`.
  - **Kits with Claude covers only teams with a kit missing** (`missKits`: a kit slot with no image of its own that the team
    file doesn't leave to the game); *All teams* re-checks every kit, PES defaults included, only when chosen. The card shows
    the count first. *Why:* 2026-11-19, it queued all 651 teams of the 2026-27 file when 14 had a kit missing.
    *Where:* `kitTargets`, `kitCount`, `ACT.artKits`.
  - The manager photo's PES-default test reads the team file's names like the crest's (`ofGameSlot`), not only for the
    loaded package; the free-source image pull (`efImages`) uses `missCrest` / `missLogo` too.
- **PES default images (how a team file says "use the game's own").** Measured on all 679 team files of the 2026-27 option file
  (2026-11-18):
  - **Crest:** the emblem number at team block +8 (bytes 88–89) is 0xFFFF when the file names no crest (478 files) and a small
    number when it names one (201 files). The name alone isn't enough: a crest written into a default slot also sets that number.
  - **Stadium:** the number at team block +12 (bytes 92–93) is 0xFFFF with no stadium image named (631 files), a small number
    with one (48 files).
  - **Kits:** each kit has a 20-byte kit header just before its name (1746 + 132·k); a default kit is all zeros there. A kit
    written into a default slot gets the header of a working kit of the same family (outfield or goalkeeper) in that file, else
    of a built-in team file.
  - **Manager photo and sponsor boards:** no marker; the name is all.
  - The studio writes these with every rebuilt team file (`TED.build` wrapper in "PES default images"): a slot left to the game
    stays so, a slot given an image is switched off the default.
  - This matches PES 2021's edit data, where 0xFFFF in a team's emblem field means "default emblem"
    ([Rigged Wiki](https://implyingrigged.info/wiki/Pro_Evolution_Soccer_2021/Edit_file)).
- **Not every name has a file, and not every file has a name.** In the 2026-27 file, 144 names in team files point to images it
  doesn't include (left over from earlier versions: the game keeps imported images by name, so they show only for someone who
  still has them), and 590 images are named by no team or competition file (alternate kits, press-room boards, stadium and
  manager images for teams whose file names none). The health check offers the related file for a missing name (same club
  folder, same kind and kit slot, closest name: *Relink*) and a free slot for an unnamed image (*Allocate*), and a default slot
  counts as free. *Where:* `msList`, `orList`, `orPlan`.
- **An option-file image put in a slot keeps its own file name and place.** When *Fix: link it* or *Relink* gives a team an
  image the option file already has, the team file names that image as it is; no copy under a new name (`<TEAM>_stadium.png`)
  is exported. A changes export carries the image along at its own path, since a First install may have left an unnamed
  image out. Only a name that can't be used gets a new one in the team's folder: not plain ASCII of 32 characters or fewer,
  or shared by another image of the option file (the game keeps images by name and would take whichever it imported last).
  Names given the old way are switched to the image's own at the next export. *Why:* 2026-11-19, on a fresh build
  "321 images allocated" made the changes export write hundreds of images under new names; with this, 266 keep their own
  name and 6 get a new one. *Where:* `slot` in `ofPlan` (`useOwn`, `imgBase`).
- **A dead image name can be removed from its team file.** Health check → *Images the team files name but the option file
  doesn't include*: *Remove reference* per row and *Remove all references (N)* blank the name in the team file (and in the
  team's second file), and mark the slot as the game's own the way the option file does (crest number 0xFFFF, a blank kit
  header), so it shows the game's image. Nothing else of the team changes; the old name is kept in `t.of.cleared`, which
  counts as a change to the team, so the file is written at the next export. *Relink* stays the suggested action where a
  related file exists. *Why:* 2026-11-19, the user asked for a command to take those references off the files (125 names
  in 49 team files of the 2026-27 file: 108 sponsor boards, 17 kits). *Where:* `msRemove`, `ACT.msRemove`,
  `ACT.msRemoveAll`, `clearImgs` in `TED.build`, `ofHash`.
- **The Overview trees are built from the project's data, never from folders** (2026-11-21, the user: "remove any
  reference to folders from the trees in Overview. it must build the structure using data in the system"). *Option file
  contents* and *Changes to export* are laid out as Leagues and Cups → competition (its file and images) → its teams →
  each team's file (opening to its players) and the images that file names; then teams in no competition, files of deleted
  teams and competitions, images no file names, other files. A file is shown as what it is ("Crest", "Kit 1", "Team file")
  with its own file name; no folder name or path is shown, also not in *Project structure*. A file's owner comes from the
  game files (`tocIndex`); the Edited / Added / Removed tags and filters are unchanged. *Where:* `tocGroups`,
  `tocBodyHTML`, `tocCompHTML`, `tocTeamHTML`, `tocRow`.
- **Teams are not team files, and the studio says so** (2026-11-21, the user: "the file i exported has 678 ted files, why
  does the system say 649?"). The Overview tiles show the file counts under the team and competition counts ("649 teams ·
  678 team files"), and the health check has an Information group *Teams, competitions and their files*: *Teams with two
  team files* (a slot's second file, written with the same data), *Files of deleted teams and competitions* (not
  exported), *Competitions with no competition file* (the game's own). *Don't include images named by no file* is about
  images only. *Where:* `ofFileCounts`, `ofTwoFiles`, `ofGoneFiles`.
- **Don't write a team's second team file** (export option, off unless ticked; 2026-11-21, the user: "i didn't choose to
  export files that are not needed anymore"). Ticked: a slot's second file is left out like a deleted team's file, with the
  images only it names, and a Changes only export lists it as a file to delete; the team's players whose record is only
  in the second file are written into the first from that record. Off: both files are written with the team's data, as
  the option file has them (the benchmark). Whether the game needs the second file is `docs/GAME_TESTS.md` question 4.
  *Where:* `S.settings.ofNoSecond`, `ofPlan` (`noSecond`), `ACT.ofNoSecond`.
- **Game results on codes, 2026-11-22** (the user, tests 17 to 24 of `docs/GAME_TEST_RUN_2026-11-22.md`):
  - **A team's league is its team code.** No file carries it: a competition file has no team list, a team file no
    competition. A team code accepted another club's whole squad in the same group, in another league, on an MLS code
    and on a national team's code, and the team stayed listed where the code belongs. "Move a team to another league"
    can only mean taking a code of that league.
  - **A league's codes stay the league's, also after a team is deleted, and a team is only offered the codes of its own
    league** (2026-11-22, the user: "those codes have to be linked even after deletion. make that a database rule. and
    when allocating a team to a new league, the system only offer those codes"). The league of a code is the game's
    (`slotLeagueOf`); the league of a team is the game league its competition stands for (`teamLeagueKey`,
    `c.gameLeague`). Game codes offers a team filed under a league only that league's free codes, offers a code only to
    teams of its league, and refuses an Apply across leagues with the reason (`codeLeagueOk`, `codeLeagueStop`). A
    league cannot grow: with every code held, the row says so and a team has to give its code up first (the BRI SUPER
    LEAGUE's 20 codes are all held, which is why teams "added" to it never reached the game). **Filing a team under another
    league is not accepted** (top rule, 2026-11-22): a team is filed only under the league of its code, and joins another
    league only by a move to a free code of it (`teamMoveTo`): the team takes the code with the Game codes allocation
    (`codeAssign`, its old code to the code book, `pcTeamTake`) and is filed under that league's competition, which comes back
    if it was deleted (`slotComp`). Offered only for a team that can leave its code (not licensed, national or a cup copy)
    and only to leagues with a free code that isn't a licensed team's (`leagueFreeCodes`). Taking a team out of a league is
    not offered either (it stays there in the game); *Move…* is. A team filed elsewhere before this rule is still listed
    by the health check (*Game IDs → Teams*, Should fix). Details: `docs/DATABASE_RULES.md` §3 "A team code belongs to one league".
  - **The game's team list is PES Master's minus three leagues**: the console game has no J1 League, J2 League or Other
    Teams (Africa); Import Team refused a file on a code of each (tests 62 to 64; the user: "i don't have those
    competitions in the game"). `pes21Teams` drops them (`PES21_NOT_IN_GAME`), so their codes are never shown or
    offered. Never add a league to the game's list from PES Master without a file accepted in the game.
  - **Every league and group accepts another club's squad on one of its codes** (35 tried, national teams and the Thai
    League included; tests 17 to 20, 25 to 57 and 61), and the team always stays in its own league. One file did not change the players
    (Vitória Guimarães, Liga NOS, test 37): unexplained.
  - **A licensed team keeps the game's name whatever its file says; an unlicensed team takes the file's name.** Tests 58
    to 60: Brøndby (3F Superliga) kept its name even with a new name and a crest of its own in the file; ACF Fiorentina
    (Other European Teams) took the new name even with the crest set back to the game's own. In the option file,
    COMO 1907 on Brescia's code still shows as Brescia. The user's rule (2026-11-24) is that it goes by competition: if one
    team of a competition changes name, every other one will (the earlier note that Cúcuta Deportivo's place in the
    Colombian league shows ATLÉTICO HUILA while Santa Fe's kept its name is the one case seen against it). The
    crest setting is not the cause: the option file's makers simply left the game's own crest (0xFFFF) on the teams
    they could not rename, which makes "file uses the game's own crest" a good sign that a team is licensed (36 of 36
    tested). **A club put on a licensed team's code plays with its own squad under the old team's name**: the studio
    must say so wherever a code is offered or taken.
  - **The studio marks those codes** (2026-11-22, the user: "Yes, add it"). `nameFixed(code)` answers 2, 1 or 0 from
    the option file's own team files (read by `pcLoadFile`, which records `ownCrest`): **2 "name fixed by the game"**
    when the file for the code keeps the game's own crest and at least half the teams of its league in the game do;
    **1 "name may be fixed"** when the two signs disagree (a crest of its own in a league where four in five keep the
    game's: COMO 1907 on Brescia's code; or the game's crest in a league of made-up teams: CHARLOTTE on Jobazavar's
    code); 0 otherwise. Checked against the game: the 11 teams that took a new name are 0, the 28 that kept theirs are
    2. Shown as a tag in Game codes → Teams (the *In PES* column and the "give it a code" list), and as a Suggestion in
    the health check (*Team details → Name in the game*) for a team that sits on such a code under another name (the
    same club under a longer or shorter name is not listed). Wording: "is expected to" for 2, "may" for 1; it is a
    sign read from the option file, never the game's word. *Where:* `nameFixedMap`, `nameFixedTag`, `pesTeamName`,
    `healthIssues` ("Game name"), `HC_WHY.fixedname`.
  - **A team the game fixes is never deleted, nor a competition that holds one** (2026-11-22, the user: "files of name
    fixed competition must not be deleted also"). The game always has such a team under its own name, so deleting it
    in the studio only leaves its file out of the export and the game plays on with the squad it last had: JUNIOR,
    deleted in the studio, was still in the game with its 29 players, and six West Bromwich Albion players sit on IDs
    "freed" by that delete. *Delete* refuses with the reason for a level-2 team (`teamFixed`) and for a competition
    with one; *Make room* does not offer them. **A competition that can't be deleted has no Delete button at all**
    (its card, the Competitions list and Make room show a "can't be deleted" tag with the reason instead; the World
    Cup too): one check, `compLockWhy` / `compDelBtn`, used everywhere (2026-11-22, the user). The same for a team the
    game fixes: its team page shows the tag instead of *Delete team* (`teamDelBtn`). Changing the squad stays possible. A team deleted before this rule is
    flagged under *Files of deleted teams and competitions* ("the game still has this team"). Open: whether the export
    should write such a file again, which needs the players whose IDs were taken over removed from it first.
    *Where:* `teamFixed`, the `ACT.delTeam` / `ACT.delComp` wrappers, `pcRoomData`, `ofGoneFiles`.
  - **A team whose players are all taken is left with 11** (test 54: both teams that lost the squad). Which 11 is not
    known.
  - **Taking players another team has gives that team the taker's former players** (the game swaps the squads): seen
    once, described by the user; tests 53 and 54 check it.
  - **A competition file must carry the competition's own code and slot together.** A file whose code and slot belong
    to two different competitions is accepted and changes nothing. A code the game doesn't have falls back to the slot
    (19 November). So `cedSetCode` writing both from one table is right; never write one without the other.
  - **Only fixed competitions and those with a usable slot are in the game** (2026-11-22, the user: "files with no usable
    slots even if they have an ID are not in the game"). In the game: one of the game's own competitions (no file,
    `ofGameComp`), or a code in the game's slot table (`compSlots`) whose file carries that code and its own slot (or a
    slot allocated on Game codes, before its file is made). Everything else, a file with an ID included, is "No place in
    the game" on its card, under *Files with no Codes*, and not a row of the Game Codes table, which lists only usable
    codes. A code set on Game codes no longer counts by itself. *Where:* `compPlaced`, `compPairOk`, `codePlaced`,
    `placeSets`, `codeRows`.
  - **A competition is added one way, in four steps** (2026-11-22, the user; `js/app-comp-add.js`): (1) find it on Live
    Update → Competitions (the *Add a competition* card, new competitions only since 2026-11-25 (updating one is *Update
    competitions*), or the Search international competitions card, whose
    competitions go to Process and Review as new competitions and are applied through this module's step 3,
    `compAddGate`; the search of the studio's fixed list of known leagues, which only ever found what the studio
    already lists, was removed on 2026-11-25, the user); (2) a job collects its
    teams, squads and logo into Process and Review; (3) applying it opens a popup: **fill a vacancy** (a free usable slot
    of its kind) or **replace a competition** (one in the game on a usable slot that may give it up: not one of the
    game's own, not the World Cup, holding no licensed team), else leave it out or stop; a league takes only a league
    slot (`LEAGUE_OF_CODE`) and a cup only a cup slot, since whether a slot's format follows its file is untested (13d);
    (4) the slot's code goes to it with `codeAssign` (its file is made from a template at export, code and slot
    together), a league slot brings its game league (`c.gameLeague`, taken from the replaced one), and the replaced
    competition is kept out of the game or deleted (`codeLoseAsk`, `codeRetire`). The Competitions page's *Add
    competition* opens step 1; there is no hand-made competition. An imported .ced sent to "New competition", a
    spreadsheet or a package reaches the project through the same Apply (Process and Review's Apply and Apply all,
    Import / Export's Install), so it asks the same question. Step 1 has a tick box, **Will provide my own file**:
    step 2 is then the Competitions page's Updates card commands for that one competition (the web-search command for
    a Claude chat with web search, which returns a .json update file, and *Import update files*) instead of Claude
    drafting it; installing the file brings step 3. *Import update files* also takes **an exported WEPES folder,
    zipped** (2026-11-25, the user), or loose .ted/.ced files: a ZIP that holds team or competition files sends them,
    with every image in it, to Import files (`impReadFiles`), where they are read as the game reads them (by the names
    inside the files) and wait until installed, which brings step 3; an update.json in the same ZIP is still read as an
    update file and keeps the images it claims. Online (2026-11-25, the user: "files will be uploaded to the platform from there"): a ZIP over
    400 MB is never opened in the browser (its file list, read from the end of the file, says whether it is a project
    transfer); it goes to Import files as a package, uploaded in parts to the account's own storage. A guest is told to
    sign in, since Import files is for signed-in accounts. Images a discard deletes are deleted from the account's storage
    too (`Store.delBlob` → `DELETE api/blob/<id>`). *Where:* `compAddPlaces`, `compAddAsk`, `compAddGate`,
    `compAddFinish`, `ACT.addComp`, `ACT.aiRunComp` wrapper, `ACT.caOwnCmd`, `importUpdateFiles`.
  - **Update competitions brings one competition fully up to date** (2026-11-25, the user: "make it fully update the
    selected competition, add option to update logos and team emblems too. make sure it triggers available commands"):
    Live Update → Competitions, first card (it was *Every team in a competition*). One competition, the parts ticked, one
    button; each part is one of the studio's own jobs, chosen by what is reachable when it is pressed: the team list
    (`compFree`, free sources then Claude, new clubs built in full; `compCheck` without the server), every team (`team`
    jobs, free sources then Claude; `compPull` without Claude), kits (in the team jobs, or `kits` jobs), the competition
    logo and team emblems (`freeArt`, the free logo chain, only missing ones or all again; without the server the team
    jobs' crest part). What can't run is named in the confirmation. The World Cup keeps its team list and logo. Results
    wait in Process and Review. *Where:* `cuCardHTML`, `cuTargets`, `ACT.cuRun` (`js/app-live-update.js`).
  - **A replacing league's players take the IDs the replaced league freed** (2026-11-22, the user: "the new players must use
    the freed ID of the same replaced league"). When a club takes a code (a move, Game codes), its players with no game
    record take that code's free records; when its own code runs out, the free records of the other codes of the same
    game league come next, before any free ID elsewhere (`pcPlanMake`, tier `league`, also in *Allocate free IDs*). The
    hand-over never skips silently: if the background squad check hasn't reached the club, its players with no record
    are worked out on the spot (`pcTeamTake`). The Saudi league on MLS's codes: 408 players took MLS's freed records,
    none shared with another club.
  - **A club name is matched with its country** (2026-11-22, the user: "UAE has teams with similar names"). Two names
    are the same club when they are equal, or equal once "Al", "FC", "SC", "Club" and country words ("Saudi", "Dubai")
    are left out; then both countries known and equal → the same club (updated in place, keeping its code); known and
    different → a different club; one side unknown → **asked in Process and Review**, at the top of the batch, with each
    club's country and league ("Same club?": *Yes* turns the new club into an update of the project's club and records
    its country; *No* keeps it new). A club's country: its Country field, a country word in its name, else its national
    league's country (`lgKey`); the game's team list, its team files and the eFootball index carry none for the clubs that
    need it. Batches made before the check are checked when shown. **Apply never goes past an unanswered question**
    (2026-11-22, the user: "the system didn't stop me"): Apply, Apply all and Install ask each one in a popup first
    (Yes / No / Stop). When the project's club is licensed, the question says what each answer means in the game: Yes
    keeps the update on that club, which can't move, so the new league won't have it; No gives the new league its own
    club, and players in both squads must come out of one (a player plays for one club only). A country from the club
    itself (Country field, a country word in its name) is firm; one from the league it is filed under only confirms a
    match, never rules one out (FC Barcelona sat in a competition named Bundesliga). A reserve or youth side (B, II,
    U23, Reserves, Youth, Jong) keeps that marker in its name, so it never matches its first team. The candidate asked
    about is the club of exactly that name first. **Health check → Team details → Similarly named teams** (Suggestion,
    2026-11-22, the user) lists the project's own pairs the same way, with each club's country, league and code;
    *Different clubs* hides a pair (`settings.simNameOk`). Under it, **Use latest for both** (2026-11-22, the user; one
    command, no choice of direction): the more recently changed club (`updatedAt`) is copied onto the other: the target keeps its name, code and competition
    and takes the other's squad, manager, stadium, formation, colours, kits, crest and images. Its players use the
    target code's own records, never the source's: a man its old squad has keeps his own record there, the rest take the
    code's free records (`pcTeamTake`). Its old images are deleted unless something else uses them (`impDropImages`);
    at export the new images go in under its code's image names. Not offered for a pair on one code. For a club that is
    in a league and in the AFC Champions League group (two codes, two teams in the game), it keeps the two in step;
    whether the AFC cup plays with that entry is `docs/GAME_TESTS.md` question 20. *Where:* `simCopyBtns`,
    `ACT.simCopy`, `simNewer`. *Where (matching):* `clubVerdict`,
    `clubMatch`, `findClub`, the `batchFromData` wrapper, `caSameBox`, `caSameYes`, `caSameGate`, `ACT.revSame`,
    `simNamePairs`, `simNameHTML`, `ACT.simDiff` (app-comp-add.js), `X['x:simname']` (app-health.js). `lgKey` reads country-named leagues first
    (Brasileirão Série A was read as Italy, the Russian Premier League as England, until 2026-11-22).
  - **What Process and Review holds can be carried to another copy** (2026-11-22, the user: "a file to import whatever the
    system collected in my online platform"). *Export as update file* writes the ticked items as the update-file format
    (ZIP: `update.json`, mode "full", plus `images/emblems/<club>.png` and `images/competitions/<competition>.png`): new
    competitions, and each club the update is about as it would be after applying (squad, country, stadium, manager,
    colours, kit colours, its competition by name). Names link everything, never this copy's ids; a club that only loses
    players is left out (the other copy works the transfers out from the squads). The other copy imports it with *Import
    update files*, so its own country check and slot popup apply. Kit textures and manager photos are not carried. On the
    local copy it is saved through the studio's server (`final-exports`), on the website downloaded. *Where:*
    `revProjected`, `revUpdateZip`, `ACT.revExport` (app-comp-add.js).
  - A file aimed at one of the game's own competitions (no file in the option file) was refused ("…either competition
    data doesn't exist or editing is prohibited"), but its code and slot were a guess, so this is not settled.
- **Game results, test run of 2026-11-22** (the user; `docs/GAME_TEST_RUN_2026-11-22.md`):
  - **Squads of 17, 15 and 11 are accepted and playable** (one goalkeeper). There is no floor at 18; the "no gaps in
    places 1–18" rule is about gaps, not size. The health check's "too few" (under 15) is advice, not a game limit.
  - **Files ticked together are read in file-name order and the last one wins** (two files for one team: the later name
    won).
  - **A club whose file lists a player takes him from his old club**; he is never in two clubs. **A player dropped from
    his club's file stays in the game** with his data, in no team.
  - **Moving a player between clubs works**: the five moved to West Bromwich Albion show by name (the user's photo of the
    squad list).
  - **Every filled squad place must be in the team file's squad order table** (40 bytes at `ASSIGN+768`: the squad's
    places in the order the game's squad list shows them, padded with 0xFF). The game draws a place only if the table
    lists it; one it leaves out is an empty "---" row with the player's data intact. 460 of the option file's team files
    list all 40 places, 185 list only the places their squad had, so a squad that grew showed its new places empty (West
    Bromwich Albion 21 → 26; test 14 proved it is the place: the empty rows followed the last five places of the file,
    not the players). `TED.build` writes the table again: a player still in the squad keeps his turn (by ID), a turn
    whose player left goes to whoever sits in that place, every other filled place follows, and a file that listed all
    40 keeps doing so. Confirmed in the game the same day: all 26 showed at West Bromwich Albion (test 15) and the added
    31st player at Coquimbo Unido (test 16). *Why it took two days:* the empty rows were first read as "the moved players", then as "IDs taken
    over from JUNIOR". Never assume which players a "placeholder" report means: ask for the names or a photo, and compare
    the file's bytes with the option file's before theorising about the game.
  - **Squads the game can't show whole are a health-check problem, and the export repairs them** (2026-11-24, the user:
    "---" rows "must show in health check"; the game glitches when one is picked). In the option file's own files (the one
    used per code): a squad place whose player has no record in the file (Italy 119151, Germany 113281, Poland, Belgium,
    PSIM Yogyakarta 5 places), a filled place the order table leaves out, and players with no name (Chiangrai United 70931,
    14 named "-"). Health check → Option files → *Squads that will show "---"* → *Broken team files* (Should fix,
    `ofBadSquads`). The fix is offered, never automatic, and **it fills a place before it drops one** (the user,
    2026-11-25: "the empty places are actually players in the game but do not show on the team list. removing the line was
    a last resort"). **Repair the squad** (per team, or all; asks first with the names, snapshot, one history entry):
    a player the game has in his club's file is added to the squad from that record, club and country sharing one ID
    (Bellanova to Italy from Atalanta's file, Henrichs to Germany, Piątek to Poland); a second line for a player already in
    the squad is listed once; a player no team file holds is looked up in eFootball by his ID, waits in Process and Review,
    and only his place is left out; an ID the option file's maker created, or one only another club holds, is not filled.
    It sets `settings.sqFix[code]`, and from then on every export (First install and Changes only) writes that file again
    with `TED.build` instead of copying it (`ofBadCodes` in `ofPlan`, marked `|rebuilt` so a confirmed install doesn't write
    it again). Not yet seen in the game: `docs/GAME_TESTS.md` 30. *Where:* `sqPlanNow`, `sqFill`, `sqLookUp`, `sqRepair`
    (app-health.js). *Keep the file as it
    is* undoes it. Players with no name get **Live Update** (the team job: free sources first, then Claude, results to
    Process and Review). A nameless player counts only while the project's team still has him (same ID) without a name: once
    he is named there or gone from the squad (Live Update brings the real squad, with its own IDs), the export writes the
    team again from the project's players. The option file itself never changes, so it alone can't say (2026-11-25, the
    user: Chiangrai United updated online with Live Update, still listed; `ofBadSquads`).
  - **Players on IDs the option file's maker created are listed, not fixed** (2026-11-24). The same section's *Players on IDs
    the option file created* (Information, `mayDash`) lists every club's players on a bit-30 or bit-31 ID. Some show in the
    game (Zechiël, Beelen, Watanabe at Feyenoord), some show as "---" (Nico González and Khusanov at Man City, Rafa Marín at
    Villarreal), so `docs/GAME_TESTS.md` 25 decides the fix. All 946 such places come from the original option file.
  - **A folder never puts a team in a league** (2026-11-24): the option file keeps Bournemouth, Brentford, Coventry, Hull,
    Ipswich, Nottingham Forest and Sunderland in its "03. Premier League" folder, but their codes are English 2nd Division
    codes, so the game and the studio have them in that league only (the option file calls it Sky Bet Championship, code
    79). Deleting that competition takes them out of every export with it.
  - **Game codes opens on *What can change*** (2026-11-24, the user): every competition of the project, in four groups
    (the user, 2026-11-24): *Usable leagues* (with a competition file, MLS among them), *Default leagues* (the game's own),
    *Pools* (the three Other Teams pools and Classic Teams) and *Cups* (the World Cup first). Marks go by kind
    (`crKind`), with a mark per column (logo, name, which teams, number of teams, team names, team emblems, players, number
    of players): tested yes, no, not tested yet (hourglass), kept by the studio, does not apply
    (`CR_GROUPS`, `codeRulesHTML`). When a game test answers a question, change the marks there and say which test.
    Each competition shows its **slot** left of its title, sorted by slot within its group; the code is in the tooltip
    (2026-11-24, the user).
    - **A tick or a cross rests on a test up to test 64 only** (tests 61 to 64 of 22 November stand: the user, "keep those
      and apply their results"; a team on a J1, J2 or Other Teams (Africa) code is left out of a row's marks and named
      under its title) (the user, 2026-11-24: "I don't trust the tests I did … after
      t60. So don't trust them … undo the test results generated today. I'll have to test them again"). Withdrawn and shown
      as the hourglass: team emblems (tests 81 to 85), everything about Classic Teams (86, 87), the game's own leagues'
      title and logo (13c), and what was never tested (number of teams; cups' teams). Never fill a mark from a result
      recorded on 24 November until the user has run that test again.
    - *Team names* is worked out per competition (`crTeamNames`): ✕ when at least half its teams are licensed
      (`nameFixed` 2), ✓ otherwise, hourglass until the option file's team files are read. The game goes by team, so a
      competition with both kinds says how many under its title (`crNote`).
    - A competition whose teams sit on other leagues' codes (one the studio made: ADNOC Pro League) says under its title
      where its teams play in the game (`crNote`, by `slotLeagueOf`).
    - A row's teams are the competition's members (`compMembers`), so the World Cup counts its national teams. A
      competition made from nothing but an option-file folder whose teams are all in the World Cup ("National Teams") gets
      no row (`crDouble`): it is the World Cup's teams over again.
  - **Team names change for a whole competition or for none of it** (2026-11-24, the user: "if one team changes name in a
    competition, every other team will"). There is no "depends on the team" inside one competition.
  - **Which teams follows the team names, per competition** (2026-11-24, the user: "some of the leagues with names that
    cannot change also refuse to change their teams"). Where names are fixed, a club put on a team's code only brings its
    players: the team keeps the game's name and crest, so it is not replaced (Cobresal, test 18; AGF and Brøndby, 58 and
    59; national teams, 20 and 49 to 52). Where names change, another club takes the place (tests 17, 19, 25 to 57).
    *What can change* works both columns out together (`crTeamNames`, `crWhichTeams`).
  - **The results recorded on 24 November (tests 81 to 87: crests, Classic Teams) are withdrawn** (the user, 2026-11-24);
    `docs/GAME_TESTS.md` 26, 28 and 29 are open again.
  - **The same player in two clubs is Should fix, not Information** (2026-11-24, the user: "why didn't I see that in health
    check?"): the club whose file the game reads last takes him and the other loses him. The option file has 30 such pairs
    (N. Jackson at Chelsea and Bayern, K. Imeri at Young Boys and Servette …).
- **Game results, 2026-11-22** (the user): a competition's title and emblem change with no trouble, so any league or
  cup can be given another title and emblem. Teams put in place of MLS teams were all rejected; the cause is open
  (`docs/GAME_TESTS.md` question 11: the team's code, or player IDs the game doesn't have).
- **Edit only what the game lets change** (2026-11-22, the user). A competition whose name *and* logo can't change has no
  Edit button anywhere (cards, Competitions list, health check, Missing logos), and Edit reached another way is refused
  with the reason. When only one can't change, Edit stays and the edit window disables that field (name and short name,
  or the logo buttons) with the reason. Can't change: the World Cup (only the international search changes it) and the
  game's own competitions with no competition file (`ofGameComp`, until they get a slot): the studio writes no file for
  them (`docs/DATABASE_RULES.md` §5.7), so nothing reaches the game. Whether the game would take a file for one is not tested (`docs/GAME_TESTS.md` 13c: test 24 was refused, with a
  guessed code and slot; the answer recorded on 24 November is withdrawn). The reason says so, and Game codes → *What can
  change* marks their Logo and Name with the hourglass. **A team the game fixes keeps the
  game's name** (tests 58 to 60), so its team page disables *Team name* with the reason; its squad stays editable
  (tests 25 to 57 changed players in licensed leagues). Its short name, crest and kits stay editable: not tested. Only
  level 2 (`teamFixed`) is locked; "name may be fixed" (level 1) stays editable. *Where:* `compNameLock`,
  `compLogoLock`, `compEditLocked`, `compForm`, `ACT.editComp`, `infoTab`.
- **Game results, 2026-11-21** (the user, export `WEPES_full_2026-11-21_1754`): a player the game has only in a national
  team's file, added to a club on the same ID, shows in both teams (Molumby 118411: *Keep in both teams* and
  `natShareRec` are right). Five players moved to a club with *Move to this team* showed as empty placeholders although
  the exported files are right; the cause is open (`docs/GAME_TESTS.md` question 10). Until it is answered, do not treat
  *Move to this team* as proven.
- **Teams without a league have a search** (2026-11-21, the user): *Find its league* per team and *Find their leagues (N)*
  for the group look the team up (job `nlFind`, `runNlFind`: the Transfermarkt dataset by name, then Claude choosing from
  the project's own leagues, with web search when unsure). The answer is kept per team and season in the browser
  (`nlStore`) and only suggests: the row then shows **Put in <league>**, and the group *Put N in the league found* (one
  confirmation). A league the project doesn't have is named in the row and nothing is suggested. The league picker stays.
- **Teams without a league can be deleted, and a game ID they hold is kept** (2026-11-28, the user: "offer to delete those
  teams, and keep their game ID if they hold one"). Each row has *Delete* and the group *Delete them (N)…*: asked first
  (the list, the players, which game IDs are kept), a snapshot, then the team goes with its players, cup copies and links,
  as on its own page. A game ID the team holds goes into the code book first, so it stays a free code of its league (Game
  codes → Free codes) for another team to take. A team the game always has under its own name is never deleted (a "can't
  be deleted" tag; the group leaves it out and says so). Nothing is deleted unless the user presses Delete: the rule in
  section 5 (never remove a club a season leaves out) stands. *Where:* `ACT.nlDel`, `ACT.nlDelAll`, `nlDrop`.
- **In a team file's player list, a player on a taken-over ID is Added, not Edited** (2026-11-21, the user: "why is added
  players not listed as added in the trees?"). A player who took over another player's ID (`codeSet`) and is not that man
  by name is tagged *Added*, and the player he is written over is listed as *Removed* ("ID taken over by …"). *Edited* is
  for the same man on his ID, or a player renamed by hand. The tag compares with the team's own option-file record, so a
  player transferred in from another team is *Added* here too. *Where:* `tocPlayers`.
- **Every page and tree marks a default slot "PES default"** (team images and kits, competitions, stadiums, sponsors, managers,
  Project structure, Option file contents) instead of "none" or "drawn". *Where:* `ofOwnSlot`, `pesOwnTag`, `pesOwnNote`.

## 5. Teams, competitions and seasons

- **Never empty or remove a club a season leaves out.** A team absent from a season's data (relegated, left its competition,
  unknown to the source) is kept exactly as it is, with its players and memberships. PES has no team limit.
  *Why:* 2026-11-15. *Where:* `batchFromData` (zero-player source skips the club, logs "kept as is"), `compUnlisted`.
  Removals apply only when a source does list that club's squad.
- **A team with no game ID is offered a suggested code, already selected** (2026-11-28, the user: "when offering to assign
  a game ID for a team, suggest (auto select) the league that they came with"). Where the team came from says which
  league's code it gets, in order: the code it had and lost (the code book), the code of its own team file, a code it
  still carries that the game does not have. That exact code when it is free, else the first free code of the same
  league, else the first free code of the league it is filed under. It is selected in Game codes → Teams → Files with no
  Codes and in the *A code for …* popup, with the reason, and Apply is ready; nothing changes until it is pressed. A team
  filed under a league is still offered only that league's codes (the rule above). The two popups of an apply follow
  the same rule and say what they suggest (the user: "creating a competition also has a popup that offers to allocate
  IDs, as well as the new competition update in process and review changes tab. are they covered"): *Where does <the
  competition> go in the game?* selects the slot its own file names, else the vacancy a competition of the same name
  gave up; *Where do the new clubs go in the game?* selects for each club the league it came with (filed under), else
  the one competition this apply added, else the league of the code its file or source says, and that code when it is
  free there. *Where:* `codeCame`, `codeSuggest`, `compAddAsk`, `teamPlaceAsk`, `tpPick`.
- **A competition update reports the teams that left and suggests taking their game IDs off** (2026-11-28, the user:
  "when updating a competition, report and suggest taking team IDs off the removed teams. add this to process and review
  changes page"). A league has a fixed set of team codes in the game, so a team that left still holds one a team that
  joined needs. The batch's notes name the teams that hold a game ID, with the code, and each gets a row under Changes,
  **Take ID off**, unticked: the rule above stands, so an update never takes a club out of the game on its own. Applied,
  the team is kept in the studio with its players, out of the game and of every export (`noCode`, `parked`), and its
  code is a free code of its league (`codeRecord`); it can be given a code again on Game codes. Leagues only; never a
  cup copy, a team with no ID, or a team the game always has under its own name. *Where:* `compUnlisted`, `compOffAdd`,
  `applyBatchRun` (`op: 'codeoff'`), `itemHTML`.
- **Clubs a competition update lists that the project lacks are built in full** (squad, ratings, kits, crest). *Where:* `queueNewClubs`.
- **Cups never change a club's league.** A cup only adds participants (`comp.teams`); in PES cups use the league clubs, so cup
  copies of league clubs are merged into the league club (health check "Cup copies").
- **An import reads the teams and data first, then links the images to them** (the user, 2026-11-23). Images named inside a
  team or competition file in the same import go to that team or competition, including a new one: its crest, manager photo
  and kits come with it. Files are read in any order and linked once everything is read, so an image is never "Not matched"
  only because its team is new. *Where:* `impTedStep` (a new team's kits), `tedLinkImages`.
- **Add to Option file is one page in three steps, with no tables of its own** (2026-11-26, the user: the Import files
  tab "is a miss ... rebuild it in a very confined and user friendly way (so many tables now)"; the tab's title is his).
  *1 Add files*: files, folders or ZIPs of any format the studio reads; one line says what was read. *2 What goes
  where*: one short list of folding sections. *3 Check and import*: every change in a folding tree with ticks
  (`impChangesHTML`), worked out by **Check the changes** and installed by **Import N changes**. The page is
  `js/app-import.js` (`ixPageHTML`); the reading, matching and installing are the engine that was there. The old page
  (built by patching one function's output in three other places, with the "What each file is for" table and two
  sub-tabs) is gone; its code is in `D:\PES21-local-test\archive\2026-11-26-before-import-rebuild`.
  - **A competition from a file is added or it updates the same competition, nothing else** (`ixCompSame`: the same
    competition is one of that name, never one that only holds the file's code). **Add** goes through the competition
    creation module for every new competition in turn (`compAddGate`): the place question offers only free places and
    competitions that can be replaced, and **opens on the competition whose code the file is for** (the user,
    2026-11-26: "auto select the competition that the file intended to replace by default, but keep the choices").
    A cup's file is a cup, so it is offered cup places (`impCedStep` sets the type from the code's slot).
  - **A team from a file is an update or an add.** The row offers *Update <the team it matched>*, *Add as a new team*,
    and *Update another team…* for a wrong match. A new team gets its league and code right after the import
    (`teamPlaceAsk`).
  - **Images the files name need nothing**; only images no file names are listed, in a closed section.
  - A choice changed after the changes were checked clears them, to be checked again (`ixChanged`).
- **On Import / Export, a discard deletes the imported files, after a warning** (2026-11-25, the user: "during imports, any
  discard must delete imported files with a warning", "in import export page only"). The Import tab's discards are **Clear** (beside the line that says what was read) and, after the changes are checked, **Discard** (**Close**
  when the files change nothing). The "Read N files" card and its Dismiss went with the old page (2026-11-26). Each first says what goes and asks
  ("Delete the files"): the files read for the import (held in the browser until installed) and the images the check added
  to the project that nothing uses. Discard deletes the read files too, not only the checked changes. Nothing installed is
  touched; the studio's own clear after an install asks nothing. Process and Review's Discard is not covered by this rule.
  *Where:* `impHeld`, `impAsked`, the `ACT.impClear` and `ACT.impPlanDrop` wrappers (`js/app-comp-add.js`).
- **Images are listed in three folding groups:** not matched, matched to your teams and competitions, and for new teams.
  - An image a game file names keeps the type that file gives it, and is never guessed over.
  - An image nothing points to starts at **Select type…**: never guessed as a kit from its size alone.
  - Its "Goes to" list opens once a type is chosen. Until then it is kept as an extra file, never "skipped".
  - Images for new teams show the team they come with, with no dropdown that would do nothing.
  *Where:* `impImagesHTML`, `impGuessImage`.
- **"Replace existing values too" ticks every file**, the ones already in your system included. *Where:* `impTickAll`.
- **A new competition goes through the adding-competition process, however it arrives** (Live Update, an imported .ced, an
  update file, a spreadsheet). It asks for a vacancy or a competition to replace before anything is applied. *Where:*
  `compAddGate` in every apply.
- **A new club chooses its league, then one of that league's free codes** (the user, 2026-11-23: "give the user the choice to
  select the league then carefully select the right code"). A new club takes no code when it is added. The code its file or
  source carries is only a suggestion, and no background step gives it that ID either (`assignIds` skips a club with a `fileTeamId`: that is how the Saudi clubs once took codes other teams held). Right after the apply, when a replaced competition's codes are free, one popup lists
  every new club with:
  - a league: only leagues with a free code, the new competition included;
  - a free code of that league: the suggestion when it is free there, else the next code no other club in the popup has.
  A licensed team's code is never offered, and no two clubs get the same code. The club is filed under that league and takes
  over the players at its code. A club left without a code waits in the Health check. *Where:* `teamAddPrep`, `teamPlaceAsk`.
- **The season turns over on 1 September** (2026/27 = 1 Sep 2026 – 31 Aug 2027). A hand-set label stays until the next 1 September.

## 6. National teams and the World Cup

- **There is always exactly one World Cup with every national team.** It keeps the last edition's title and logo until a newer
  edition's name and logo are published; only the international search may change them. It can't be deleted and national teams
  can't be removed from it. *Why:* 2026-11-15. *Where:* `ensureWorldCup()`, `allowWc`.
- **A footballer has separate records at his club and in his national team.** Matching never crosses that line, and a player
  stays at his club when he joins his national team. National teams get no "Keep at" suggestion in the health check.
- **National teams use their country's flag as emblem.** Except a national team from the option file: it keeps the option file's choice (the game's own crest when its file names none) unless you pick "Use flag".

## 7. Players

- **Each player is listed once per squad**; one shirt number per player per squad. Special eFootball cards are dropped from squads.
- **Two different players on one game ID are not one player in two clubs.** The option file sometimes puts two players on
  one record (M. Samuelsen at AAB and Marc Guiu at Chelsea, both 109047; 28 such IDs in the 2026-27 file). Players on one
  ID are the same man only when their names share a word (initials aside, spellings run together: "Abdullah Alkhaibari"
  and "A. Al-Khaibari"); otherwise the health check lists them under *Different players on one game ID* (never under
  *Same player in two clubs*, whose "Keep at" would delete the other man), saying which one the game ends with (the
  player in the part it imports last, WEPES/1 … 7; same part: not known). *Keep it with …* takes the ID off the others:
  they keep their place in the squad (`p.codeOff`, never linked back by name) and **each takes an available player ID at
  once** (the player-code planner; `codesFor`); his own club or national-team copy keeps it. **Allocate free IDs**
  in the group header does every shared ID in one step: the ID stays with the player the game has there now, every other
  player gets an available ID (one confirmation, a snapshot first). Anyone left without an ID opens *Make room*. *Why:* 2026-11-21, the user. *Where:* `samePerson`, `idShared`, `sharedIds`,
  `codeOff`, `ACT.sharedKeep`, `findDuplicatePlayers`.
- **The same player in two clubs** is resolved by looking up his club for the current season (one queued job, in batches) and
  suggesting that club. **Keep all at the smaller squad** (section header) is the quick alternative: each player stays
  at the club with the fewest players (counted as his turn comes; tie: the club where he is rated higher) and leaves the
  others; national teams are untouched, one confirmation, a snapshot first, one undo step (`ACT.dpSmallAll`).
  *Why:* 2026-11-21, the user.

## 8. Images

- **Keep the game's own images; every image you import takes space.** The game keeps each type of image in a store of its
  own: the seven types of Edit → Data Management → Import/Export → Import Images, which takes JPEG or PNG of 64 × 64 to
  2048 × 2048: **Strip (L)** (2048 × 2048), **Strip (S)** (1024 × 1024), **Team Emblems** (256 × 256), **Competition
  Emblems** (256 × 256), **Manager Photo** (256 × 256), **Stadium Image** (1024 × 512), **Sponsor Logo Image** (256 × 128).
  You choose the type when importing; kits can go to either Strip store. The space table names its rows the same way (the kit
  row follows the export's kit size: full size Strip (L), 1024 Strip (S)). Strip (L) holds only about 70, so kits are
  imported as Strip (S). Its own images take no space; the
  option file's and every imported image do, and once a store is full the game refuses the rest. In Edit you can delete only
  imported images, never the game's own, so deleting every imported image and importing again always fits what fitted before.
  An image whose name is already in the game is overwritten in place and takes no space; a new name takes one. So: never
  replace a game image with a made-up one, and when a club takes over a slot, reuse names already in the game where possible.
  The stores are measured in file size, not count: the game's "approximately N left" is an estimate, it may take one or two
  more or fewer, and large files fill a store sooner. Kits are kept in two stores, Strip (L) and Strip (S). *Why:* 2026-11-19,
  the user's PS5 test with the 2026-27 option file installed: Strip (L) 70 imported and full, Strip (S) 715 and full, emblems
  full in one store (20) and 10 left in another (50), manager photos 169 and full, stadium images about 11 in all, sponsor
  boards with plenty of room; the user had to delete imported emblems to fit the test's crests.
- **A new or updated image goes in only under a file name the game already has.** The game keeps imported images by name, and
  its stores are nearly full, so an image under a new name usually fails to import; one under a name the game has overwrites
  that image in place. So: an updated image of an option-file club or competition keeps its file name and path; a club or
  competition that takes over a code (Game codes) writes its images under the names the game has for that code, the old
  holder's (kept in the studio after it lost the code: `codeOrigTeam`, `codeOrigComp`, `codeImgName`), at the old holder's
  paths, and its team or competition file names them; a slot the old holder left to the game's own image gets a new name only
  when the team has an image for it, and that counts as a new image. Paths written again are not listed as removed. Both
  exports follow this (`ofPlan`, `pkgName` in Partial Export). **When the new images don't fit** the free space (the image space
  table, or Partial Export's note), the user exports the complete option file (First install), deletes every imported image in
  Edit on the PS (the game's own stay), and imports it all. *Why:* 2026-11-19, the user: "updated images can only replace
  files with the same name in the game, otherwise the import will fail".
- **Image space is counted.** Room for a type = the images of that type imported in the game + the free spaces the game shows.
  *Imported in the game* is what the game says; left empty, it is the option file's images of that type and the new ones
  confirmed since. A store can hold fewer than the option file has: stadium images, about 11 in all (2026-11-19), against
  119 in the 2026-27 option file. The export cards on Import / Export → Export Option File has an *Image space in the game* table: per type, the
  option file's images, *Imported in the game*, *Free in the game* (both entered from what the game says), room in all, what this export adds and what it
  only overwrites, and "fits" or "N too many". *First install* compares its whole set with the room (after deleting every
  imported image in Edit); *Changes only* compares its new names with the free spaces. Confirming an export takes what it
  added off the free spaces, adds it to an entered imported count, and records its new names as in the game
  (`settings.imgSpace`: `imp`, `free`, `inst`; `spaceBase`). Partial Export
  counts its images by type and warns when one is over. *Where:* `SPACE_KINDS`, `ofSpace`, `imgSpaceRows`, `ofSpaceHTML`,
  `IN.imgFree`, `ofApplyInstall`.
- **The studio draws crests, logos and kits only.** A team or competition without a crest or logo gets one drawn from its
  colours and short name (national teams: the flag), and kits are drawn at export in the 2048 px layout; generated images are
  marked so a real one found later replaces them. **No placeholder manager photo, stadium or sponsor board is drawn or
  exported:** the slot is left empty, so the game shows its own image and no space is used. *Why:* 2026-11-19, sponsor boards
  are the scarcest store (see above).
- **Never invent a face:** a manager without a photo keeps the game's own.
- **An image name the option file leaves empty means the game's own image.** A team file that names no crest shows the game's
  built-in crest (478 of the 2026-27 file's 679 team files), so the studio draws nothing for it, never exports one, and the health
  check and Missing emblems don't list it. This includes national teams: no flag unless you choose one ("Use flag"); the health
  check doesn't suggest a flag for a national team that keeps the option file's own crest. Likewise a game league with no competition file
  (`gameLeague`) is one of the game's own competitions: no file, ID or logo is made for it. *Why:* 2026-11-18, a fresh build from the option file
  showed 3,534 "changes" the user never made: drawn crests and made-up competition files. *Where:* `ofGameCrest`, `ofGameComp`,
  `needsCrest`, `needsLogo`, `needsCompFile`.
- **A fresh build has no changes**, on every counter: Changes since baseline, Changes to export and the export's Changes only. The
  automatic steps after a build run before the baseline snapshot (`finishFresh`), one image run at a time. A second file for a
  team slot is the option file's own layout: it is kept, never shown as removed, and rewritten with the team's data when the team
  changes (`t.of.copies`). *Why:* 2026-11-18, the user found 34 "Removed" files in a project they hadn't touched.
  Starting over while signed in also clears the browser's own copy, so signing in can't carry an old project back.

## 8c. Project backup on this computer

- **When the studio runs from this computer, the whole project is also kept on disk.** A browser's own storage is not a
  safe only home: the Claude app's browser pane empties it between sessions. The backup is one ZIP (teams, players,
  competitions, team files, images that aren't the option file's, settings, the review queue, history and the baseline
  snapshot; option-file images stay references), written about 3 minutes after anything changes and on request
  (Settings → *Backup on this computer*), the one before kept beside it. An empty project is offered the backup before
  anything else. Folder: `LOCAL_BACKUP_DIR` in `.env`, else `data/backup/`. It does not exist on the website, where
  signed-in projects are saved to the cloud.
- *Why:* 2026-11-20, the user's whole local test project was lost overnight; it was rebuilt from the baseline and a
  Changes only export. *Where:* `localBackup`, `localRestore`, `bkSig`, `xferAutoOffer`, `server.py` (`_local_api`:
  `/api/local/backup`).

## 8b. A page never redraws itself in a loop

- **A background step redraws the page only when it changed something, and never from inside its own promise chain**
  (`setTimeout(rerender,0)`), and **a page asks for a background step only when that step has work to do.** A page that
  asks for a step every time it is drawn, with a step that redraws the page every time it finishes, never ends and locks
  the browser. *Why:* 2026-11-20: after any squad change on the Health check (Remove duplicates, Take over…) the page
  froze: it asked to read the player codes again while the squad was being re-checked, the read had nothing to read and
  redrew the page, which asked again, without ever letting the re-check finish. *Where:* `pcLoadAll` (returns at once when
  ready; redraws only if it read something), `noFileScan`, `healthIssues`.
- **A safety net stops any such loop:** more than 12 redraws asked for by the app in 8 seconds with no click or key holds
  redrawing for 10 seconds, says so, and records what asked (`pes21ui.loop`). *Where:* `rerender`, `RR_GUARD`.
- **The page is not redrawn while a file window is open, and no choice of files is lost.** A redraw replaces the
  `<input type=file>` the window belongs to, and the chosen files go nowhere. Redraws wait until the window closes, at most 10
  minutes. If an input was replaced anyway, its files are handed back to the page. *Why:* 2026-11-23: two ZIPs chosen at once
  in Import files did nothing online, while one at a time worked. *Where:* "file windows" in `app-boot.js`.
- **Nothing fails silently.** An empty choice, a read that stops, or any error with no message of its own gets a note
  ("Something went wrong: …"). One entry in a ZIP never stops the rest of the ZIP: before, one `.html` page stopped the
  rest and was blamed on the whole ZIP. *Where:* `impIntake` (ZIP loop), the Import files listener, "something went
  wrong" in `app-boot.js`.
- **Files that match nothing are added, never skipped** (the user, 2026-11-23). Any file the studio doesn't read goes through
  the check and Process and Review with the rest, marked "Not matched". Unless it is unticked, it is kept as an extra file at
  its path inside the package and written with Partial Export. That covers `.html`, `.cpk`, RAR, stray JSON, and an image no
  game file or name points to. Only Windows system files (Thumbs.db, desktop.ini) and files that can't be read at all are
  left out, each with a note. *Where:* `impUnmatched`, `impLooseImages`, the extras step of `ACT.impCheck`.
- **`?safe` in the address opens the Overview with nothing restored**, the way back in when a remembered page won't draw.
- **A generated team file is a shell, not a game file.** Its player records are made up: none counts as "the game has
  him", in the export or in the checks. *Where:* `teamPlayersFor` (`src.generated`), `recFromAnyFile`.

## 8a. Pages remember how they were left

- **Every page comes back as you left it** (this browser only), also after closing the studio: its tab, filters, find text and
  the team that was open; where it was scrolled to, the page and the scrolling boxes inside it; and its collapsible items.
- **Every collapsible item is closed by default** and stays as you leave it. No page opens one by itself, whatever it holds
  (a group with must-fix issues included).
- **This is one shared layer, not per-page code.** A new page gets it without doing anything: a new collapsible is a plain
  `<details>`; a new page-state value (a tab, a filter) is added to `UI_KEEP`. Only small plain values are kept, never
  plans, files or selections.
- *Why:* 2026-11-20, the user: "keep the last status and scroll location of the pages in all the pages of the app, and make
  all collapsible items collapsed by default and saved how the user left them". *Where:* the "pages remember" block after
  `render` in `index.html` (`UI_KEEP`, `uiRestore`, `uiSaveSoon`, `detApply`, `detKey`, `scRestore`, `scNote`), stored
  under `pes21ui.state`, `pes21ui.open` and `pes21ui.scroll`.

## 9. Health check

- **The plain answer first** (ready / almost ready / not ready), one button for the safe fixes, then the problems in a fixed
  layout, each with why it matters.
- **Every health check row looks the same** (2026-11-22, the user): the level's coloured dot (its name only on hover and for
  screen readers, never written in the row), the title, the explanation under it in smaller grey text, the buttons on the
  right; a tick box or thumbnail, where a section has one, comes before the dot. Every section draws its rows with the one
  helper, `hcRow` (app-core.js), and its "N more" row with `hcMoreRow`; no section has its own columns or a table. **No
  "Open" button** (2026-11-23, the user): the title opens its subject (team page, competition, player); `hcRow` takes any
  "Open…" button out of the actions and puts its action on the title, or uses `o.subject`. Where there is nothing to
  open (a deleted team's file, one of the game's own competitions), the title is plain text.
- **Health check layout** (2026-11-21, the user, from the health check editor; a further round is planned). Problems are
  shown by problem only (no "By team" view), in fixed groups → sub-groups, never sorted by count: *Team size* (too many, too
  few, goalkeeper) · *Game IDs* (teams; players; same name) · *Player details* (players no game file has; missing details;
  names: too long is not a missing detail, so it has its own sub-group (2026-11-21, the user);
  shirt numbers; duplicates, with "Same player in two teams") · *Team details* (short name; name in the game; competition; league; copies of
  league teams: cup copies and pool teams) · *Crests and flags* · *Competition details* (leagues with no teams; cups with
  no teams) · *Teams, competitions and their files* (Information) · *International teams* (national players in no team; added to a team from a national team: Information) ·
  *Images* (named by no file; named but missing) ·
  *Files not in the game*. "More checks" holds only *Tools for every team*. Levels are **Must fix, Should fix, Suggestion,
  Information**; each problem has one level, set in `HC_PROBLEMS` (rows) or on its section (`X` in `VIEWS.health`); the
  layout is `HC_LAYOUT`. Information never makes the project "not ready".
  - **Only what is in the game is checked.** A team or competition kept without a code (`noCode`) gets no rows; it is listed
    under *Files not in the game* (Information) with a jump to Game codes. A team that never had an ID is Must fix ("Pick an
    ID" on Game codes).
  - **A team's ID is never typed**: Team details shows it read-only; it changes only on Game codes. So "team file is for a
    different game team" cannot happen and is not checked. Also not checked: "competition with no competition file" (the
    export writes one) and "game ID too long" (pulls and option-file imports no longer take such IDs).
  - **Problems are never combined** (2026-11-21, the user: "I selected not to combine any"). Each problem keeps its own
    key, level and rows, also when two look alike: "players with no game ID" (Must fix) beside "players no game file has"
    (option on: Must fix; option off: Should fix); "team is in no competition" (Suggestion) beside "teams without a league"
    (Should fix); "leagues with no teams" (Should fix) beside "cups with no teams" (Information); the two "same name,
    different game IDs" checks each have a key. Suggest a merge to the user; never do it unasked.
  - **A player without an ID and a player whose ID no game file has are two problems, and no player is in both.** With an
    option file in use, each player no game file has gets one row: without an ID it goes under *Players with no game ID*,
    with one under *Players the game has in another team's file*; both rows offer the free ID to take. The per-team "N players
    have no game ID" row shows only when no option file is in use.
  - **The page must redraw fast** (2026-11-21, the user: commands froze the page for seconds). Lists that are costly to work
    out are kept until what they depend on changes: `teamsArr()` is sorted once per change (`Store.rev`, raised by every
    `Store.put`/`del`; raise it when writing `S.teams[...]` directly), and the image list (`orList`) is kept while `orSig()`
    (teams and competitions without their players, marks, ignore list) is the same. Never call a costly list more than
    once a redraw without such a cache.
  - **A missing shirt number is listed once**, under *Missing details*; *Shirt numbers* holds only repeated numbers.
  - **Cup copies**: a cup's team with a code of its own is *updated from its league team* like a pool team (`twinCopy`,
    each player an ID of his own); merging into the league team is the second choice and the only one for a copy that shares
    its league team's file. A team already updated is offered again only when its league team has changed (`twinSig`).
  - **The app says "team"** (2026-11-21, the user: "apply team for all the app"), never "club" or "squad", in every
    title, row, button, dialog, toast and log line. Where "squad" meant the list of players, say "players" (the team page's
    *Players* tab, "the game keeps its own players"). Left as they are: names (FIFA Club World Cup, Club Brugge), the
    game's own menu text ("Apply player and squad data"), file names and column headers of outside sources (`clubs.csv`,
    "club id"), the prompts sent to Claude, and code names.
- **One suggested action per row, and "Apply all suggested actions" on every group.**
- **Look-ups and Claude updates only suggest; coded fixes apply on the spot.** A fix that queues a task to find information
  (Claude update, Claude ratings, eFootball, Transfermarkt, flags, crests, logos) never changes the data itself: its results wait
  in Process and Review to be checked and applied, wherever it was started from, the health check included. Fixes the studio works
  out by itself (shirt numbers, duplicate entries, game IDs, short names) are applied at once and can be undone from the change
  history. *Why:* 2026-11-17, a health-check Claude update applied its squad without Review. *Where:* the health check's
  `finishBatch` wrapper (`CUR_JOB.autoApply`), `queueRun`.
- **A fix for missing details fills only what is missing.** Claude is asked about exactly the players with gaps, named with their
  club, position and what is already known, for only the fields they lack (age, height, weight, nationality). Only empty fields
  are filled; nothing a player already has changes, and players Claude can't identify are named in Review. Never use a
  whole-squad update to fill gaps. *Why:* 2026-11-17, the squad-wide fill left the gaps empty and rewrote other details.
  *Where:* `runPlayerDetails`, `detailsPrompt`, job type `details`.
- **Random fill is the last resort for missing player details.** "Random fill" (after the look-ups, before Open, never the
  row's suggested action, so "Apply all" doesn't run it) fills only the empty fields of the players with gaps, in code with no
  look-up and after a confirmation: age around 26 (17–36, goalkeepers to 38), height by position (160–205 cm), weight from height
  (55–100 kg), nationality from the club's country or one already in the squad (a national team: its own country), a free shirt
  number by position, and ratings at the squad's median level shaped by position (40–99, the overall matching the level).
  Applied at once and undoable from the change history. The group's header also has "Random fill all (N teams)", next to
  "Apply all suggested actions": every team in the group at once, one confirmation, one undo step. *Why:* 2026-11-19, the user
  asked for a coded last resort, then for it for all at the top. **Ratings are their own sub-group** (2026-11-22, the user:
  "separate players Missing ratings from players missing other details"): Player details → *Missing ratings* lists the
  unrated players, *Missing details* the rest (age, height, weight, nationality, number), and each row counts only its own
  kind. Each has its own Random fill: the details one fills no ratings, the ratings one (*Missing ratings* rows) fills ratings
  only. *Where:* `randomFillTeam(t, what)`, `rfGaps`, `rfRatings`, `ACT.randomFill`, `ACT.randomFillAll`, `ACT.randomRate`,
  `HC_LAYOUT`.
- **Leagues with no teams: the clubs come from the free sources first.** *Find its clubs* (and "Apply all") looks the league
  up in eFootball, then the Transfermarkt dataset; Claude is not asked. A league they don't have, and a cup or play-off,
  goes to "Not found in the free sources" in Process and Review, with *Ask Claude*. The sources know a league by its country
  and tier, not its name (names carry sponsors: "Sky Bet Championship" is England tier 2, eFootball's
  "english-2nd-division"); `lgKey` works that out from the name, else from the competition's country. Clubs already in the
  project are moved into the league; clubs new to the project come in without a squad (the health check then offers *Pull
  from free sources* for each), never built by Claude from this fix. Everything waits in Review. *Why:* 2026-11-20, the
  user: it should follow the same process and search the free sources first. *Where:* `runCompFree`, `lgKey`, `LG_NAME`,
  `EF_LG`, `compFreeMiss`, job type `compFree`, `transfermarkt.league` (`/api/tm/league`).
- **A squad with no goalkeeper gets the same fixes as a squad that is too small**: *Pull from free sources* (the suggested
  action, also in "Apply all"), then *Live Update*, then *Open*. The look-up only suggests: its result waits in Process and
  Review, and a free-source miss never goes on to Claude by itself. *Why:* 2026-11-19, the user: the row only had *Open*.
  *Where:* the `healthIssues` wrapper (`squadFix`).
- **Short names are exactly 3 capital letters or digits.** The health check offers a fix per team (the code cleaned up, or one made
  from the name: ARS, RMA, PSG) and in "Apply all"; the code stays editable on the team's Info tab, and exports write what is
  there. *Why:* 2026-11-17, the user asked for an auto fix that can still be changed by hand. *Where:* `SHORT_OK`, `short3`,
  `ACT.fixShort`, `healthIssues`, the `short` field of `infoTab`.
- **Where each health check command gets its answers** (record, 2026-11-24, checked against the code). The diagram is in the app: Settings → Admin reference → *Health check:
  where each command gets its answers* (`HC_FLOW`, `js/app-admin.js`; every box explains itself on hover or focus). It
  was drawn from the FigJam board https://www.figma.com/board/NrNcYufo4lcxq2jUMGb8Mf and both were corrected on 2026-11-25.
  Keep this list, `HC_FLOW` and the board in step when a command's route changes.
  - *Script only, no outside source* (applied at once, undo from the change history): Renumber / Fix
    automatically, Shorten names, the 3-letter short name, Remove duplicates / Keep one / Different players, New player IDs /
    Allocate free IDs (these read the option file's team files, nothing else), Use the game ID / pick a
    file or picture, Repair the squad, Random fill, Update from league team / Merge cups, and applying a look-up's answer (Move / Keep /
    Replace / Put in league).
  - *Pull from free sources, a team* (also the World Cup pull): FIFA for a World Cup national team, else
    eFootball, else Transfermarkt, else Wikipedia; EA SPORTS FC fills missing details and ratings. A team none has is listed
    on Process and Review; Claude is asked only when the user clicks *Ask Claude*.
  - *Pull from free sources, player details and IDs*: eFootball, then EA SPORTS FC; what is still missing is listed on Process
    and Review for *Ask Claude*.
  - *Live Update*: the same free squad pull, then Claude for the manager and kits, or for the whole team
    when no free source has it.
  - *Crests* (Pull from free sources on a crest row): FootyLogos, TheSportsDB, Wikimedia Commons, Wikipedia, football-logos,
    eFootball; the same pull fills coach (eFootball, Transfermarkt, Wikidata) and stadium (TheSportsDB, Transfermarkt,
    Wikidata). *Use flag*: the flags shipped with the site (`assets/flags`, flag-icons), no outside source. Images never go to Claude.
  - *Find his current team / Search for the right team*: eFootball by game ID, then Transfermarkt by name, then Claude.
    *Find their leagues*: Transfermarkt by team name, then Claude. Their answers are shown in the Health check row, not
    Process and Review; nothing changes until the user applies one.
  - *Queue Claude ratings / Claude fill*: Claude directly.
  - Every Claude step answers from its own knowledge first and searches the web (web search and web fetch) only when the
    reply is empty, cut off or unsure, the studio runs through the site's server and web search is not off. Every answer
    except the row look-ups waits in Process and Review. *Apply all suggested actions* runs each row's first fix, so it
    takes that fix's route.
  *Where:* `ACT.*` in app-health.js, app-free-sources.js, app-sources-fixes.js, app-images.js; `freeSquad`, `runFreeTeam`,
  `freeFillTeam`, `runLogoJob`, `runPlTeam`, `runDupClubs`, `runNlFind`, `aiJSON`, `webAllowed`.
- **Don't flag what isn't a problem.** New clubs outside the option file, teams a season leaves out and national teams' club
  links are expected states, not issues.
- **Players of a team with no game ID are left out of the game ID checks** (2026-11-28, the user: "players in a team that
  is not given a game ID must be ignored from the health checks, but included when their team get an ID or they're moved
  to an in-the-game team"). The team is not in the game, so its players' IDs mean nothing yet: no rows for *no game ID*,
  *the game has him in another team's file*, *linked to a different game record*, *shared game IDs* or *two players named
  … with different game IDs*, and they are not counted by the *Allocate free IDs* commands. The team's own
  row ("has no in-game team ID") stays. Every check goes by the team that lists the player, so he is checked again as
  soon as the team gets an ID or he is moved to a team that has one. A team has a game ID when it holds one, or when its
  own or built-in team file gives it one (`teamHasGameId`). *Where:* `nfTeams`, `sharedIds`, `mislinkOf`, `healthIssues`.
- **One name: Allocate free IDs. "New ID" only for an ID the studio makes up** (2026-11-28, the user: "use the same title
  for the command: Allocate free IDs. only use New IDs when the studio makes up IDs"). Every command that gives a player
  an ID the game already has is *Allocate free IDs* (header), *Allocate free IDs (N)* or *Allocate a free ID* (row), in
  buttons, questions, messages and history entries: the shared-ID fix, the fix for a player linked to a different game
  record, and players with no ID. They were *New player IDs for all*, *New IDs (N)* and *New ID* before. "New ID" is
  kept for an ID no game file holds, which the studio does not offer until game test 25 is run (`NEW_IDS_TESTED`).
- **The health check says "team-file entry", never "game record"** (2026-11-28, the user: "what is a game record?", then
  "reword game record in the other sections the same way"). A player's entry in a team file of the option file is
  called his *team-file entry* (or *entry*) in every row, explanation, button, question, message and history entry of the
  health check: "keeps his team-file entry here", "Use his own team-file entry", "That team-file entry is not free any
  more". He is *tied to* an entry, not "linked to a record". The code and its comments still say record.
- **One sub-heading, one Allocate free IDs button** (2026-11-28, the user: "why two different buttons?"). Game IDs →
  *Players* held two kinds of rows, each with its own header command, and under one name they read as a duplicate. It is
  split into *Players with no game ID* and *Players' ID different than in their team-file* (the user's name for it,
  after asking "what is a game record?": the studio's term is not used in headings, rows or questions there; the rows
  read "N players have a game ID different than in their team-file", and the sub-heading explains the two things that
  should agree, the game ID shown and the team-file entry he is written over, `HC_WHY.mislink`), so a sub-heading never
  shows the same command twice. *Where:* `HC_LAYOUT`.
- **A player whose ID differs from his team-file is checked by name, and the row offers the fix that fits** (2026-11-28,
  the user: "does the system check if this is the same player?", "add the name check and the new button"). The names on
  the game's entries tell which of the two is his (`mislinkKind`): the team-file entry is his own, or the free ID he
  was allocated (`codeSet`) → **Use the team-file ID** (new: his game ID becomes the entry's; also run by *Apply all
  suggested actions*); the game has him under the ID shown → **Use the game ID** (the tie is dropped); neither →
  **Allocate a free ID**. A player on an allocated entry is named with the player that entry was ("Mohamed Kanno
  (written over M. AL-JUWAYR)"), so the other name on the entry is no surprise. The row names the players of each kind, each button counts only its own players, and the
  header's *Allocate free IDs* counts only "neither". On the project of that day all 5 such players were tied to the
  right entry with a wrong ID shown, so the two old buttons were wrong for every one of them. Until the team files are
  read the row only opens the team. *Where:* `mislinkKind`, `ACT.mislinkFile`, `ACT.unlinkTed`, `mislinkNone`.
- **The page says when it is still loading data** (2026-11-28, the user: "indicate in the top bar that the page is still
  loading data. also in the health check page besides the search text box"). After it opens, the studio goes on reading
  the project, the option file, its team files and the check of every squad against them; until then the health check
  and Game codes show fewer rows and counts than they will. A circle and a few words show it (the user: "too much text", then
  "use the loading circle to show progress instead of the numbers. change the word depending on what's loading"): the
  words say what is being read (*Loading your project*, *Loading team files*, *Checking squads*, *Loading the option
  file*), the circle fills as the count goes up and turns when there is nothing to count, and the numbers are in the
  tooltip. It is in the top bar and beside the health check's search box, and goes away when it is
  done. Any element marked `data-load` shows it. *Where:* `loadingWhat`, `loadPaint` (app-boot.js), `.loadnote`.
- **Every popup: after the answer, the button waits and Cancel is off** (2026-11-28, the user: "make apply button in every
  popup window show the waiting icon when applying, and disable the cancel button"). A confirmation stays open while the
  command that asked is still working: its button shows the waiting circle (and the progress, where the command reports
  it), Cancel is disabled, and Escape and a click outside do nothing. It closes when the command ends, or as soon as the
  command opens another dialog; a command that ends at once closes it at once. A popup's own working button (Move, Allocate
  …) disables that popup's Cancel and Close the same way. Popups with answers of their own wait the same way (the user, the
  same day: "make the custom two-answer popups wait the same way"): Keep them / Delete them, Competition only / Delete
  everything, Yes the same club / No a new club, a place picked, a typed value. Every answer goes through one function,
  `askAnswer(el, value)`, which disables every other button of the popup while the command works; a way out (Cancel,
  Later, Stop) closes at once. *Where:* `askAnswer`, `ACT.askYes`, `askDone`, `ACT_RUN`, `markBusy`, `modal`.
- **One wording for every header command that gives players IDs** (2026-11-28, the user: "Different players on one game
  ID offers New player IDs for all (3 players) while there is none. keep it consistent in other places too, same
  wording"). *Allocate free IDs* (shared IDs and linked to a different record) and *Allocate free IDs* all read
  `<command> (N): K free`; with too few, `…: K free, make room` or `…: none free, make room` (no "players" and no "only" in the button, the user, the same day), and the
  button opens Make room; while the team files are read, `…: counting free IDs`. K is one number everywhere, the game's
  player IDs no player of a team in the game holds (`pcFreeCount`): the free IDs are one pool, and each command states
  the pool. The take-off command uses the same shape, `Take their IDs off (N): frees K`. *Where:* `idBtn`.
- **Players holding game IDs in a team with no game ID are a Should fix, with Take their IDs off** (2026-11-28, the user:
  "search for players with IDs their team has no IDs. and offer to free them. give it should fix status"). Game IDs →
  *Players with an ID in a team that has none* lists each such team with its players whose ID is one the game has (a
  record in the option file's team files; a number only a source gave him holds nothing and is not listed). They still
  hold those IDs in the studio (`pcHeld`), so no other player can take them. **Take their IDs off (N): frees K** per team (named for what it does, the user: "change the wording of the command
  then"; first *Free their IDs*; when it frees none, *Give the team an ID* is the first fix) and **Take
  the IDs off all N players: frees K** in the header: asked first, a snapshot, then the ID is taken off each player (`codeOff` fields: he keeps
  his place and details and is never linked back by name); it is a free ID again only when no player of a team in the game uses it. *Give the team an ID* (Game
  codes) is the other way out. Teams kept out of the game (no code, parked) are not listed: their players' IDs are free
  already. **Every such player is listed, and the row, the question and the result say how many IDs really become
  free**: an ID that a player of a team in the game uses too stays taken (the same day 930 IDs were "freed" and none
  became available; on that project 925 were used by players of teams in the game, 667 of them the same man at his
  option-file club, who is not shown as a duplicate because the copy here is not linked to the record). **The row also
  says who uses the IDs** (the user: "i don't see this in health check!", on the IDs that are on a different player):
  how many are used by the same player at a team in the game, and which are on a different player there, by name
  ("Nicola Ravaglia's 44794 is on Adrian Kappenberger (Brøndby GB)"). This is the only place those pairs show while
  the team has no game ID, since its players are left out of the other game ID checks. Needs the option file's team
  files read. *Where:* `orphIds`, `ACT.orphFree`, `ACT.orphFreeAll`, `orphApply`.

## 10. Live Update, Claude, data sources and the cloud

- **THE BUCKETS: every command that brings data in is "Live update", through four buckets, and Claude only when asked**
  (2026-11-25, the user: "i need all commands to use all available sources in order ... make module for each bucket ...
  keep the least number of buckets"; "no automatic claude triggers"). **This rule wins over any older rule below that
  says otherwise** (*Sources in order*, *One free-source pull*, *Where each health check command gets its answers*: read
  their orders and button names as history).
  - *One module per bucket, and the order of sources is in that module only:*
    1. **Data** (`js/app-bucket-data.js`, `DATA_ORDER`): FIFA only for a national team in the newest World Cup; then
       eFootball, Transfermarkt, Wikipedia; EA SPORTS FC **last**, for details and ratings still open. Squads
       (`dataSquad`), players' details, ratings and IDs (`dataPlayers`; Wikipedia is skipped, it has none), coach and
       stadium (`dataCoach`, `dataStadium`), a league's teams (`dataLeagueTeams`).
    2. **Club info** (`js/app-bucket-info.js`, `INFO_ORDER`): TheSportsDB, then Wikidata, for the stadium, coach and
       colours the data bucket left open.
    3. **Images** (`js/app-bucket-images.js`, `IMG_ORDER`): FootyLogos, TheSportsDB, Wikimedia Commons, Wikipedia,
       football-logos (GitHub), eFootball; a national team gets its flag from the site's own set. eFootball is last
       because its crests are 128 px and the first source that has the image wins (the user's list had it first; move
       the name in `IMG_ORDER` to change it). **Images never go to Claude**: no name guesses, no designed crests.
       **Kits are in this bucket too** (`KIT_ORDER`, `imgKits`; 2026-11-28, the user: "use this google drive in my
       free sources to search for kits. add it to the search bucket"): Kit Man Cal's free kit store, a public Google
       Drive folder of kit sheets in the PES layout (2048 px), read by the server (`kitdrive.py`, `/api/kd/find`,
       `/api/kd/image`). Its folders are season → domestic or international → league → `<team>_<type>_<variant>_<kind>.png`
       (type 1 home, 2 away, 3 alternate, 4 goalkeeper). The slots take 1st = home, 2nd = away, 3rd = alternate, GK 1st
       and GK 2nd = the first two goalkeeper kits, each the lowest variant. The project's season is asked first; a slot
       it doesn't have yet comes from the season before, and the image's name says which season. A club is matched by
       name with its country (the league folder's), a national team only in the international folders. Only a slot
       with a kit missing is filled (`missKits`: a PES default slot is never missing); *All teams (replace every kit
       the store has)* on Live Update → Logos & kits is the one command that replaces, and asks first. A new kit source
       is a name in `KIT_ORDER` and a step in `IMG_KITS`.
    4. **Claude** (`js/app-bucket-claude.js`): only from the **Ask Claude** table in Process and Review.
  - *The planner* (`js/app-buckets.js`): a command says what it needs (squad, details, crests, coaches, stadiums, colours,
    logos, kits) for which teams, players or competition, and never names a source. `liveFill` runs the buckets in order and
    stops when everything asked for is filled; each source is asked once per team in a job. Job types: `live` (one
    team, or a list of players), `freeArt` (many teams and competitions), `compFree` (a competition's teams).
  - *The router* (`liveRoute`, a wrapper of `queueAdd`): every job passes it before it is queued. A job not asked for in
    the table becomes Live update jobs; what only Claude can do becomes a row of the table. Old job types saved in a
    queue (`team`, `free`, `ef`, `compPull`, `freePlayers`, `efPlayers`, `fcPlayers`, `ratings`, `details`, `kits`,
    `compCheck`, `comp`, `intl`, `logos`, `efImages`, `tmInfo`, `fifaTeam`) are routed the same way when the studio opens.
  - *The guard* (a wrapper of `aiText`): Claude answers only inside a job that carries `asked:true`, which only the
    table sets, or from a button that is itself a question to Claude and runs no job (*Claude: suggest colours*). A job
    queued by an asked job inherits it (the clubs of a competition Claude listed).
  - *The Ask Claude table* (Process and Review; `askHTML`, kept in this browser like the list it replaced): what the
    free buckets left open (a team's players, players' details, a competition's teams, coach and stadium, a look-up),
    kits the kit store has no image for: Claude then gives kit colours and sponsors, never an image),
    and what has no free source and is put there directly: formation and playstyle, a new competition, a new
    team no source has, the international competitions. A crest or logo no source has gets **Create and edit**
    instead: the studio draws one and opens it (`ACT.askCreate`, `genCrest`, `genCompLogo`).
  - *Process and Review has three tabs, each with its count* (2026-11-25, the user): **Free sources** (jobs running or
    waiting in the queue), **Additional actions** (the rows of the Ask Claude table) and **Changes** (the changes
    waiting to be applied). Coming from another page it opens on the first that has something (Changes, then Additional
    actions, then Free sources) or on the tab the command asked for (`S.ui.revWant`, `ACT.revGoMore`); a reload keeps
    the tab. Apply all, Discard all and Export as update file are on Changes only. *Where:* `VIEWS.review`,
    `REV_TABS`, `revCounts` (`js/app-claude.js`).
  - *Two queues, side by side, each on its own tab* (2026-11-28, the user: "separate the Additional actions progress
    table from Free sources. make additional actions required after free sources created them moved directly to the
    other tab, and make both tabs able to work simultaneously"). A job is in one of two lanes by how it came in: **Free
    sources** (not asked of Claude) or **Additional actions** (`asked:true`). Each lane runs its own jobs one after
    another and the two run at the same time (`laneRun`, `LANES`). Each tab shows only its own progress bar, Stop or
    Resume, counts, Retry failed, Remove all queued and task list (`laneProgHTML`, `reviewQueueHTML(lane)`); a tab whose
    lane is running has a flashing blue dot. What a free-source job leaves open goes to the Ask Claude table, which is
    on Additional actions only, and the jobs asked from it are listed there too, never under Free sources. The overall
    bar stays on Changes and in the rail. Because two jobs run at once and a call cannot tell which job it belongs to:
    Claude answers only a call carrying the signal of the lane's asked job (`claudeJob`); a job that queues more jobs
    says whether they inherit asked (`routeAs`); `CUR_JOB` is set only while exactly one job runs, so with two nothing
    is auto-applied and a source dot goes to the job of its kind; a failed job's Details can hold lines of the other.
  - *The queues survive a refresh and carry on* (2026-11-28, the user: "make the queues in Live update get saved not to
    be removed when refreshing the page"). Tasks are saved with the project, but a save is written half a second after
    a change (longer online), so a copy of both queues is also kept in this browser, written at once whenever a task is
    added, finishes, fails or is removed (`queueKeep`, localStorage `pes21.queue`, tagged with the account). When the
    studio opens, tasks in the copy that the project lacks are put back, a task the copy knows as finished is not run
    again, and a task that was running waits again (`queueRestore`). Each queue then carries on by itself. A queue you
    stopped with Stop stays stopped across the refresh until Resume (`QPAUSED`, `queuePause`), and says so.
  - *The coloured dots, reviewed* (2026-11-28, the user). Source dots on a task: green free sources, yellow Claude's
    own knowledge, red Claude web search; flashing is the source in use, dim the source a waiting task starts with.
    Fixed: every waiting Live update job showed yellow, because the list of free job types predated Live update; the
    first source now comes from how the job came in (not asked → green, always). Each tab's progress card has the legend
    for its dots. Kept as they are: the flashing blue dot (a task is running; now also on the tab that is running) and
    the storage dot at the bottom of the rail (green saved, orange saving, red not saved).
  - *One button name:* **Live update**, on every button that used to say Pull from free sources, Claude fill, Queue
    Claude ratings, Live Update, Run, Quick check with Claude or Claude: refresh this player.
  - *Archived:* the code this replaced (`freeSquad`, `runFreeTeam`, `freeFillTeam`, the `art*` chains, `runLogoJob`,
    `claudeCrest`, `runCompFree`, the free-miss list, and the commands no button reached) is not in the repo any more.
    It is in git before this change and, on the user's PC, in `D:\PES21-local-test\archive\2026-11-25-before-buckets`
    (the whole files, and `removed-code-1/2/3.js`). The admin's commands table lists the removed commands as Archived.

- **The update page and the update process are called "Live Update"** (2026-11-21, the user), never "Claude update": the
  menu, the page title, links to the page, the health check's button that updates a team, and messages about where progress
  shows. An update tries the free sources first and often never asks Claude (a West Bromwich Albion update was answered by
  eFootball alone), so the old name misled. Keep "Claude" only for what Claude itself does: *Update with Claude…*, *Claude
  fill*, Claude ratings, the Claude key, passphrase and costs.

- **Sources in order: free sources, then Claude's own knowledge, then Claude web search.** Every look-up tries them in that
  order and moves on only for what the step before didn't have. Costs and the Stats tab are for admins only.
  *Why:* 2026-11-17. *Where:* `freeSquad` / `runFreeTeam` (free), `aiJSON` (`opts.escalate`, `thinReply`: knowledge first, then
  web), `draftTeam` (an empty or cut-off squad escalates to web search).
- **A club that exists has a squad somewhere: Wikipedia is the free source of last resort.** eFootball and the Transfermarkt
  dataset cover fixed lists of leagues, so a club just promoted into a pro league is missing from both or shows last season.
  The club's English Wikipedia article lists its current squad (number, nationality, position, name; birth date and height
  from Wikidata through each player's article). Transfermarkt data from before this season gives way to Wikipedia's list,
  unless that list is dated before the season too. Same-name clubs are told apart by country; women's, reserve (B/C) and
  youth sides never match. Claude squad requests get the pages already matched and a web fetch tool, and are told to open the
  squad page and read the whole list, because search results show only the start of a page.
  *Why:* 2026-11-19, a newly promoted club's squad was easy to find online but no source found it. *Where:* `wikipedia.py`
  (`/api/wp/squad`), `wpDraftTeam`, `efDraftTeam` chain, `squadPages` in `rosterPrompt`, `web_fetch` in `server.py`.
- **The admin has a table of the commands and the health check diagram** (2026-11-25, the user: "a full table of all the
  commands, when or why they're offered, what they do, where they're placed, mark if not placed, rules audit result,
  remark for me to note"). Settings → *Admin reference*, admins only, two folding cards: the diagram (`HC_FLOW`) and the
  commands table, which lists every command of the studio (344 on 2026-11-25): those of the Health check, Process and
  Review and Import's install and discards with their audit result (`CMD_ROWS`), the rest listed from the code and
  marked *Not audited* (`CMD_MORE`), and the commands no button reaches at the end. Each row has the audit's result
  (OK, Fixed, Open, Not audited) and a note of the admin's own
  (`settings.cmdNotes`). A command added, renamed, moved or removed changes its row and its box; the page itself marks a
  row whose command is gone from the code. *Where:* `js/app-admin.js`.
- **No health check button repeats another** (audit of 2026-11-25, the user: "remove any buttons that are redundant along
  with their function"). Removed with their commands: More checks' *Number every team*, *Use flags*, *Pull missing teams*
  and *Fill player details* (each repeated a group's *Fix automatically* or *Apply all suggested actions*; only the World
  Cup pull from FIFA stays there), the second *Merge* in Cup copies' header, the pulls on the Duplicate entries row (its
  fix is *Remove duplicates*; a squad left too small has its own row), the ratings half of *Claude fill* (ratings are
  their own row), `codeOpen` (now `hcCodes`), and commands no row could reach (`useFileId`, `dropTeamFile`, `fcFill`,
  `fcRate`, `fifaTeam`, and the rows the page always dropped).
- **The shared-ID fix never leaves a player without an ID** (2026-11-25, the user: "no mention of no room, this must be
  tested"). *Allocate free IDs* and *Keep it with …* give each other player a free ID the game already has, so they
  count the free IDs first (`pcFreeCount`, `sharedNeed`): with fewer free IDs than players the header button says so
  and opens Make room ("No free IDs left for N players: make room"), and `sharedApply` changes nothing. A brand-new ID
  the game never had is not offered: whether the game takes one is game test 25, not run yet.
- **A player linked to a different game record than his game ID can take a new ID** (2026-11-28, the user: "offer to give a
  new ID for each and for all"). Beside *Use the game ID*, each team's row has *Allocate a free ID* / *Allocate free IDs (N)* and the group header
  *Allocate free IDs (N players)*: asked first (each player with his game ID and the record he is linked to), a
  snapshot, then he lets go of both and takes a free player ID the game has, keeping his place and details (`codeOff`,
  `codesFor`, as the shared-ID fix). It never leaves a player without an ID: with fewer free IDs than players nothing
  changes and Make room opens. *Use the game ID* stays the first fix (and what *Apply all suggested actions* runs).
  *Where:* `ACT.mislinkNew`, `ACT.mislinkNewAll`, `mislinkApply`, `mislinkOf`.
- **Every health check command follows the command rules** (same audit; `.claude/skills/pes21-commands`): a command over
  many teams takes a snapshot first (*Fix automatically*, *Apply all suggested actions*, *Random fill all*, *Put N in the
  league found*, *Repair the squad*); *Fix automatically* works its plan out again after the question; *Remove
  duplicates* removes exactly what the row reports (name, age and position for players without an ID) and names them;
  *Use the game ID* drops a link only where the game has the player under that ID; the health check's *Live Update* is
  the team's Live Update and asks with the estimate; a job already queued or running for a team is never queued twice
  (`queueAdd`); every way out ends in a message; *Apply all* names the items that failed; the shared-ID fixes need an
  option file like every command that gives an ID.
- **One free-source pull: "Pull from free sources".** Every command that pulls data from eFootball or any other free database is
  this one pull, under this one name, everywhere in the app. A team: the squad from FIFA (national teams in the newest World Cup),
  else eFootball, else Transfermarkt, else Wikipedia; EA SPORTS FC fills the details and ratings that source left out; then the crest,
  coach and stadium from the buckets (next rule), in one Review batch. Players:
  eFootball, then EA SPORTS FC; what neither has goes to "Not found in the free sources". Never add a pull from one source on its
  own; add the source to the shared pull instead. *Where:* `runFreeTeam` (job types `free`, and old `ef` / `compPull` / `fifaTeam`
  jobs), the `efPlayers` wrapper (job types `freePlayers`, old `efPlayers` / `fcPlayers`).
- **A team and a competition have one update button: "Live Update"** (2026-11-22, the user: "Claude: fill teams" and
  "Claude: update this team" are gone). It is the free sources first, then Claude for what they don't have, never two
  buttons for the two. A team: a team job (`AI_PARTS_ON`), which takes players, ratings, crest, coach and stadium from the
  free sources and asks Claude for the manager, kits and anything missing (everything when no free source has the team).
  A competition: its team list (`compFree` with `claude`, else Claude's `compCheck`; new clubs built in full), every
  team's job, and its logo. It asks first, with the Claude estimate. Without Claude it is the free-source pull alone.
  *Where:* `ACT.teamLive`, `ACT.compLive`, `runCompFree(…, j)`, `LIVE_TIP`.
- **The buckets: one ordered list of free sources per need, and every job asks the bucket, never a source.** Squad: FIFA
  (World Cup national teams) → eFootball → Transfermarkt → Wikipedia, then EA SPORTS FC for missing details and ratings
  (`freeSquad`). Crest: FootyLogos → TheSportsDB → Wikimedia Commons → Wikipedia → football-logos → eFootball; a national team takes its
  flag. Competition logo: FootyLogos → TheSportsDB → Wikimedia → Wikipedia → eFootball (`artLogo`). Wikipedia (added 2026-11-24, the user: "add Wikipedia as well") is the logo at the top of the English article (`wikipedia.logo`, `/api/wp/logo`, `wpLogoId`), non-free logos included; the Missing logos job tries it after FootyLogos and Claude's names, before a designed crest. Coach: eFootball (name and photo) →
  Transfermarkt → Wikidata. Stadium: TheSportsDB → Transfermarkt → Wikidata. Colours: TheSportsDB. A player's club: eFootball
  by ID → Transfermarkt by name and age (`efPlayersByIds`, `tmPlayersByNames`). A team's league: Transfermarkt. Only then
  Claude. Team needs go through `freeFillTeam(team, needs)`: it looks up only what the team still misses, asks each source
  once per team, and keeps the link (`efId`, `tmId`) of a source it used. A new source is added to its bucket, so every job
  gets it at once; a job that asks one source by itself is a bug. The words the app shows for each order come from the same
  place (`ART_OPTS`, `FREE_SQUAD_ORDER`, `freeOrder`). Old job types `efImages` and `tmInfo` run the buckets too.
  *Why:* 2026-11-22, the user: combine the look-ups into buckets of process and include every needed free source in them
  every time, with one place for every action. Before, four jobs each had their own crest order and two left sources out.
- **Quick find (Ctrl+K, or "/" outside a field; the Find button in the top bar)** jumps to any page, competition, team or
  player. Every word typed must start a word of the name, in any order, accents ignored. It only reads the project and opens
  a result with the action the pages themselves use (`openCompTeams`, `openTeam`, `editPlayer`), so it adds no second way of
  opening anything. With the box empty it lists what was opened from it lately (kept in this browser, `pes21.qfRecent`;
  things since deleted drop out). *Where:* `js/app-find.js`.
- **Copy abilities / Paste abilities (player editor)** carry what makes a player play the way he does (abilities, playing
  style, weak foot, form, injury resistance, playable positions, skills, COM styles) and never who he is (name, number,
  position, age, height, weight, foot, game ID). Paste fills the open form only: nothing is stored until *Save player*. The
  copy lasts until the page is closed. *Where:* `ACT.peCopy`, `ACT.pePaste` in `js/app-pages.js`.
- **Save & previous / Save & next (player editor)** move through the squad without closing the editor. The player is
  saved only when the form differs from what is stored, so stepping through a squad to look changes nothing. A player
  moved to another team in the form is saved the usual way and the editor closes. *Where:* `ACT.peStep`.
- **How Claude is asked (`/api/claude` in `server.py`).** Every request carries a system line with today's date and one
  rule: for a time the model cannot fully know, give the latest it knows with a lower confidence (medium: not confirmed
  for that time; low: doubtful), and "unknown" only for a person, club or competition it cannot identify. The studio then
  searches the web for the answers marked low or unknown (`PLAYERS_UNSURE`, used by both player look-ups: *Players in two
  teams* and *Find his current team*). An answer that names no club (free agent, retired, released; `noClub`) is never a
  team to move a player to. A request a safety filter declines by mistake is answered by another model in the same call
  (`fallbacks`, Opus and Sonnet tiers; `CLAUDE_FALLBACKS=0` turns it off). *Why:* live tests on 2026-11-22: without the
  date the models answered a 2026/27 question from older knowledge at medium confidence; with it and the web step, a June
  2026 transfer was found that no model could know, and a web answer of "Free agent" had been read as a club name.
- **Settings: who may change what.** Three kinds of user: *admin* (an owner account of the site, or whoever runs the studio
  on their own computer), *member* (signed in, not an owner) and *visitor* (not signed in). Everyone has: personal
  preferences, the settings of their own project (season, free sources first, image sizes, rating conversion), one way to save a copy of
  it or move it, *Pack whole project* (a download, which needs a sign-in online; the lighter .json backup button was
  removed on 2026-11-22 because Pack covers it), and starting their own project from scratch. Admin only: what spends the
  site's money or is shared by every user: Claude's effort and web search (in Settings and on Live Update), the site's
  status, the backup folder on the computer, the eFootball team list, the site's option-file packages, Live Update → Stats.
  A member or visitor sees those as "Set by the site's admin", with the values they get. Hiding a control is never the only
  guard: the page refuses the change for a non-admin, and on the website the server gives a non-owner's Claude requests the
  tier and web setting the site sets (`CLAUDE_MEMBER_TIER`, `CLAUDE_MEMBER_WEB`), whatever the request asks for.
  *Why:* 2026-11-22, the user: restructure Settings into what only the admin reaches and what any user reaches, and build
  it. *Where:* `js/app-settings.js`, `aiAdmin` / `setAdmin`, `/api/claude` and `/api/health` in `server.py`.
- **Personal preferences are not part of the project.** The page the studio opens on, text size, compact tables,
  animations and the "/" key are kept per browser under `pes21ui.prefs` (never a `pes21.` key, which starting over
  clears), so they survive starting from scratch and are never packed, exported or shared. *Where:* `prefs`, `prefsApply`.
- **Starting from scratch shows its risk first.** Every way of deleting the project to start over (empty, from the site's
  option file, from your own) goes through one dialog (`askRisk`): what will be deleted in numbers (teams, players,
  competitions, images, snapshots, waiting batches), what else goes (history, queue, confirmed exports), what stays, how
  to keep a copy and when the last backup was, and a box that must be ticked before the red button works. The buttons
  sit in a red "Danger zone" at the bottom of Settings. *Why:* 2026-11-22, the user: make the start-from-scratch button
  show its risk.
- **One place for every job.** A job type that is one function is registered in `JOB_RUN` and run from `runJob`; only what
  changes how other types run (free sources before Claude, the current-job bookkeeping) wraps `runJob`. Shared pieces have
  one home: `srcApi` (every free-source request), `answerStore` (answers a search keeps per season), `claudeDown`.
- **Which source supersedes which: one source gives the squad, the rest only fill blanks.**
  - *Squad:* the first source in the order FIFA (national teams in the newest World Cup) → eFootball → Transfermarkt →
    Wikipedia that has the team supplies the whole squad; later sources are not asked. The one hand-over: Transfermarkt data
    from before this season gives way to Wikipedia, except when Wikipedia's list has fewer than 15 players or is dated before
    1 July of the season year. When Wikipedia wins it keeps Transfermarkt's club ID, and its coach and stadium where
    Wikipedia has none. Claude is never part of this chain: a team no free source has goes to "Not found in the free
    sources", where the user can ask Claude.
  - *Players already in the studio:* a squad source matched to an existing player fills only his empty fields (age,
    nationality, height, shirt number); what is there stays.
  - *Details and ratings:* EA SPORTS FC fills height, weight, age and nationality only where empty, and writes ratings, foot,
    weak foot and extra positions only for an unrated player (always, only in an explicit rate job). It never overwrites.
  - *Team information:* the first source with a value wins, later ones fill only what is still empty, in the buckets' order
    (rule above). Coach and stadium: the squad source's own, then the bucket.
  - Everything goes to Process and Review as one batch per team; no source writes straight into the data.
  *Why:* 2026-11-19, the user asked which free source supersedes which. *Where:* `freeSquad`, the `efDraftTeam` chain,
  `wpDraftTeam`, `fcApply`, `runFreeTeam`.
- **The prompts the studio writes for another assistant ask for what the game needs.** A squads prompt carries the squad rules
  (`SQUAD_RULES`: numbers 1-99 once each, at least 2 goalkeepers, name and shirt-name lengths, a unique 3-letter code, the
  squad after the last transfer window) and says ratings are on one world scale, not a scale inside each league
  (`RATING_RULES`). A competition prompt lists the clubs the project already has from that country, so their spellings are
  used. A crest's example file name is a real club name, never a placeholder phrase. *Why:* 2026-11-20, the user asked for
  the ADNOC Pro League prompt to be checked before running it: it gave no club spellings, no squad rules, a top-league
  rating scale, and "images/emblems/every club in ADNOC Pro League.png" as its example. *Where:* `SQUAD_RULES`,
  `RATING_RULES`, `assetBlock`, `starterParts`.
- **A dot per source on every task**, at the far right of its row: green for free sources, yellow for Claude's own knowledge,
  red for Claude web search, one dot for each source the task used (a waiting task shows the one it starts with, dimmed).
  The dot of the source in use flashes, and only while the task is running; finished sources, waiting and finished tasks and
  the sources legend keep steady dots. *Why:* 2026-11-17, the user: "flashing only when running".
  *Where:* `jobStage`, `jobDots`, the `jobRowHTML` wrapper; free-source API calls are counted in the `fetch` wrapper.
- **With Claude web search off, it is never suggested or attempted.** No web search call (`webAllowed()`), no web-search command
  buttons, no text promising a web search.
- **A free-source fix never moves on to Claude by itself.** When a fix that says eFootball (or another free source) can't find a
  squad or a player's details, nothing is sent to Claude. Process and Review lists what the free sources didn't have, under "Not
  found in the free sources", with "Ask Claude" per team and for all (with the request estimate), and "Dismiss". Claude's
  answers then wait in Review like any other. *Why:* 2026-11-17, a health-check eFootball fix went on to Claude without the user
  accepting it. *Where:* the health-check `runJob` wrapper (`ef` / `efPlayers` jobs), `FREE_MISS`, `freeMissHTML`, `freeMissJobs`
  (`claudeOnly` jobs skip the eFootball first step).
- **Claude finishes a squad it started.** A club we have exists, so an empty squad is asked for again (with a search hint and web
  search, when web search is on). A
  squad under 16 players or missing a line (GK, DEF, MID, ATT) is continued: Claude gets the players it already listed and adds
  the rest, up to 4 times. If it is still incomplete, its players are added or updated but nobody is removed, and Review says
  why. *Where:* `draftTeam`, `squadGap`, `continuePrompt`, `t._partial` in `batchFromData`.
- **Every task that finishes says what it found; nothing ends silently.** A finished task keeps its result (`j.result`) and
  Process and Review lists it under *Finished*: how many changes it left to review, or, when it left none, why, in the
  task's own last words (so each task's last log line must be its summary). A task that left nothing to review also shows a
  message when it ends, unless it already showed one. *Why:* 2026-11-20, the user: "Same player in two clubs" searched and
  finished with no result and no word (locally Claude had no key, so every look-up had failed); "anything that goes in the
  process and review page must give a feedback". *Where:* `jobResult` (called by `queueRun`), `jobRowHTML`,
  `reviewQueueHTML`, the summary line at the end of `runDupClubs`.
- **"Could not connect" is never reported as "nothing found".** A task's result names the sources it searched and what
  they had; a source that could not be reached (no Claude key, the server or a site not answering) is named separately as
  COULD NOT CONNECT, with the reason and how many items were not looked up there. *Why:* 2026-11-20, the user: the
  same-player search came back with "nothing found" in two seconds when Claude had no key. *Where:* `down` in
  `runDupClubs` and `runCompFree`. The same search also missed real answers for two reasons, both fixed: dotted initials
  split into single letters ("S.S. Lazio" did not match "SS LAZIO": `coreTokens`), and Transfermarkt players were rejected
  for being older than their age in the game file, which is the game's 2020 age (`DP_AGE_DRIFT`).
- **A failed task shows its details in Review**: the error, a Details log of every step of that task, and its own Retry
  button. A run that ends with failures says how many in the progress bar. *Where:* `queueRun`, `AI_TRACE`, `jobRowHTML`.
- **Cloud saving sends a few requests at a time**, with one message and a clear finish.
- **The site's baseline is the option file the owner uploaded, the same for every visitor and account.** The site's packages are
  read by everyone (no sign-in needed to read them); only owners register them and choose the baseline (`/api/of/baseline`,
  `optionfile.baseline`). An empty project asks how to start: the site's option file (`buildFromSiteBaseline`, works without signing
  in) or your own (needs sign-in); it is never loaded without asking. Overview says when a project was built from another option
  file. There is no published project baseline: setting a snapshot as baseline only marks it in that project. *Why:* 2026-11-18,
  the user: "the option file I uploaded in my account using the system should be the baseline for all users". Every other
  signed-in account can still upload its own option file into `users/<their id>/optionfiles/` (`optionfile.py` `scope`), seen by no
  one else. Any Google account may sign in when `OPEN_SIGNIN=1`, but a non-owner only saves their own project; owner features are
  checked on the server (`_owner()`), never only hidden in the menus. On the website without signing in, everything works except
  importing and exporting (`GUEST_VIEWS` / `GUEST_ACTS`); signing in carries the browser's project into the cloud project
  (`carryBrowserProject`). Menus hidden from members are listed in `OWNER_VIEWS` (empty for now: the user opened Settings to everyone on 2026-11-18, until further change).
- **Import and export live on one page, Import / Export (`#optionfile`), in five tabs in the order the work goes, titled without numbers** (`IO_TABS`):
  Import Option File (the package and building the project from it), Import files, Summary (what you changed and what the
  export will do, before you export: the changes since the baseline by team, the files *Changes only* would write added up by
  kind and by league folder, the export's notes, and *Competition Structure in the game*; nothing on it changes anything;
  `ioSummaryHTML`; the user, 2026-11-20), Export Option File (First install / Changes
  only, the confirmation that PES imported it, and the layout rule), Partial Export (chosen teams and competitions). Partial Export
  starts with nothing selected and has filters (search, competition, all / changed since the baseline / not in the option file /
  selected only) that narrow the list, never the selection; *Select all* ticks every team and competition whatever the filters show. The old `#import` and `#export` addresses
  open their tabs. *Why:* 2026-11-19, the user asked to move the Option file page and Export to USB into one import/export page; the same day: tabs without numbers, renamed, and Partial Export with filters and nothing selected by default.
- **The PES 2021 kit sheet (`KIT_UV`, 2048 px), as the user set out from a real kit on 2026-11-20.** Middle column: the back
  above the neck opening (upside down, hem at the top) and the front below it. The band left and right of the neck opening is
  the shoulders running out and down into the *short* sleeves. The bar under the front is the colour of the bottom of the
  shirt. The top left and right areas are the *long* sleeves, worn over the short ones in cold-weather games. The strip in
  the top left corner is the captain's armband (not shown on the 3D player: the user had it removed). Socks sit at the
  sides. The bottom corners are the left and right leg of the shorts, each lying on its side: waistband down the edge nearest
  the middle of the sheet, hem down the outer edge, side seam across the middle, so a logo beside the seam is drawn turned a
  quarter and stands upright at the player's side. `kpTextureArt` places each area on the 3D
  player this way, and `kitTextureCanvas` draws a kit from colours in the same layout. **The shirt on the 3D player is drawn from the
  sheet itself, point for point** (2026-11-28, the user, from a Kit Man Cal sheet: "use this to perfect the 3d model"): every
  point of the model's shirt has its own place on the sheet (`kpKitUV`, `KP_PAT`: the side seams, the hems, the armpits, the
  shoulder line and the bottom of the collar of the model matched to the sheet's; a sleeve wraps the whole arm and takes
  the body's place on the sheet where they meet), so chest logos, the sponsor, shoulder stripes and a sleeve sponsor sit
  where the game shows them. Copying areas of the sheet onto the model's own texture had them about 4 cm too high. Shorts
  and socks are still copied area by area. **The collar is the strip at the bottom of the sheet** (the user, 2026-11-28: "the collar line
  color and type is drawn in to bottom of image"; it replaces "the bar under the front is the colour of the bottom of the
  shirt" above): the band under the front, x 676 to 1372, y 1891 to 1958 (`KIT_UV.collar`), holds the collar's colour and
  pattern. On the player it is laid round the neck opening as a band of one width (`kpCollar`), and a kit drawn from colours
  fills it with the trim colour. **The neck opening cuts the design and does not move it** (the user: "the collar cut
  should not deform the shape around it"): the shirt has one scale across everywhere (`KP_PAT.sx`), and nothing is stretched round the neck
  or the shoulders (the user, 2026-11-28: "too much stretching sidewise to the front and back of the shirt in the top part
  which makes the sponsor logo bigger"; a stretch round the neck, tried the same day, widened the chest logos and the
  name on the back and was removed). The scale is the one that makes a sponsor as wide on the player as on the real
  shirt: about three quarters of the chest. **The design is straight on the front and on the back, with no stretching** (the user, the same day:
  "straighten the tshirt design from top to bottom in the back and front. no stretching"; it replaces a strip beside
  the armholes with a scale of its own, tried for "the top part of the front and back red color must not stretch towards
  the arms"): one scale across everywhere, out to the edges of the sheet's panels, and one scale down the front and one
  down the back (`KP_PAT.sx`, `KP_PAT.max`, `KP_PAT.rows`). Only the strip over the top of the shoulders, between the two
  edges of the neck opening, has its own. The collar is drawn in round the neck by moving the shirt only (`KP_TIGHT`):
  **the body and the head never change shape** (the user: "do not change the body shape including the head"). **The back and the front go by the player's height** (the front from the bottom of the collar to the hem: the user, "Yes, level front") (the user, the same day: "make the back side design straight as
  well"): the rows of the model's own texture are not level on the back (4 cm lower in the middle than at the sides at
  armpit height), so each point of the back takes the sheet's row for its height, evenly from the hem to the back of the
  neck (`kpKitUV`, `KP_PAT.backTop`). A sheet of straight squares is the test: its lines must come out level. **A raglan seam is shown as the sheet draws it** (the user, the same day, after a straight line and then a
  bowed one were tried: "make the green line follow the dotted red line in the grid"): nothing on the sheet is redrawn
  for the player. The hems are the sheet's own (front fabric ends at row 1890, back starts at 48),
  the bottom edge is level and hangs straight (`KP_HEM_LEVEL`, `KP_HEM_IN`). Checked against photos of the real shirt: the raglan sleeves and the shoulder stripes reach the collar.
- **The codes in the bottom corners of a kit sheet are the kit's settings in the game, and the studio reads them** (the user,
  2026-11-28: "understand and use the codes written in the bottom corners"). Bottom left "JERSEY: (R) n, (G) n, (B) n" and
  bottom right "SHORTS: ..." are the game's shirt and shorts colours, each 0 to 63 (Chelsea's blue home kit 10, 19, 43;
  a white kit 53, 53, 53); bottom middle "COLLAR: n" is the game's collar type. `kitCodes` (app-images.js) reads them from
  a 2048 px sheet by comparing each digit with the makers' lettering (`KIT_DIGITS`); a number it is not sure of is left
  out, never guessed. They are kept with the kit (`k.codes`) when a kit comes from the kit store, and the Kit designer
  shows them under the artwork with *Keep with this kit*. They are not written into a team file: where a team file holds a
  kit's colours and collar is not known (`docs/GAME_TESTS.md` 33), so until then they are the values to set by hand in
  the game's Edit mode.
- **Every kit's image is read for its settings on its own, and they fill the kit's colour setup** (the user, 2026-11-28:
  "automatically use and update the color code code in each image when available into the kit color setup in the settings
  for each kit during installation"). A kit whose image has not been read (`k.codesFor` is not `k.img`) is read by the
  `kitCodes` job (js/app-kit-codes.js), queued on its own after any save that gives a kit an image (Add to Option file,
  Import Option File, Live update, the kit store, an upload) and at start, 60 sheets a job so other jobs get their turn;
  a new image is read again and replaces what the old one gave, and an image with nothing written clears it. Kit Man Cal's
  lettering is read by `kitCodes`; other makers' text ("COLLAR 6 (PC)", "41/02/09" beside a swatch, "56/56/56 - shirt") by
  the free text reader Tesseract (vendor/tesseract, loaded only when needed, nothing leaves the browser; never Claude).
  **Never guessed:** the strip is read three times and a number is kept only when two readings agree. Colours with a label
  go to that part; colours without one are placed by order (first shirt, then shorts, `codes.order`) only when the list is
  surely whole (no reading saw a colour the others did not, and the first stands at the start of the list), otherwise they
  are listed and not placed (`codes.unsure`). The kit card (Teams, a team, Kits) shows them under **Colour setup in the
  game** (shirt and shorts R G B 0 to 63, collar number), open to typing; numbers typed by hand (`k.codesBy` 'hand') are
  never replaced until *Read the sheet again*. Reading is saved without a history entry. These are the game's Edit mode
  settings and are separate from the kit's Shirt and Shorts colours in the studio (a green shirt can carry 56, 56, 56).
- **The Kit designer works on the kit's own image** (`KA`, `kaEnsure`): opening a kit shows its saved image (PES kit layout,
  `KIT_UV`) on the 3D player and on the artwork sheet; a kit without one is drawn from the colours. Imported elements are
  layers on the sheet, shown on the player as they change. Nothing is stored until *Save and replace* (a new kit image is
  made and assigned; the old one stays in the library) or *Export PNG*. The name and numbers (back, shorts) are the game's:
  they are drawn on the player only, never into the image. *Why:* the user, 2026-11-19.
