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
  team slots and competition IDs. Every file of the option file stays; two files for one team slot both get the team's data. New teams and competitions go into the option file's own folders;
  deleted ones are left out. *Why:* 2026-11-18, the user: "this must be one export, either in full or only changes"; the game
  imports all files of a kind at once and links them by the names inside them. *Where:* `ofScope`, `ofPlan`, `ofLeagueDir`,
  docs/DATABASE_RULES.md 5–6.
- **"Don't include images named by no file" is ticked by default** on the export: option-file images that no team or
  competition file names are left out (not listed as deletions, not counted missing); unticked, the export is the option
  file's set exactly. Each export card shows the export's file size. *Why:* 2026-11-18, the user. *Where:* `ofPlan`
  (`orphans`), `settings.ofNoOrphans`, `ofSizeHTML`.
- **Health check lists the images left out** ("Images left out of the export", under More checks), each with a thumbnail,
  a viewer and a jump to its team or competition. *Allocate* gives an image to its team or competition by its folder or file
  name (a fallback: no game file names it) and only into a **free** slot of its kind (crest, manager photo, stadium, one of 3
  boards, kits 1st/2nd/3rd or GK 1st/GK 2nd, a competition's one logo); a filled slot is never replaced. With no free slot, no
  owner or no kind, it says why and asks **Delete** (left out of every export, even with the option off) or **Ignore** (kept,
  hidden). *Why:* 2026-11-18, the user. *Where:* `orPlan`, `orApply`, `orList`, `settings.ofOrphan`.
  - **The fix is "Fix: link it"** (per row, and *Apply all suggested actions*): it names the image in its slot of the team or
    competition file. A slot showing the PES default image counts as free and is switched to the image (crest and stadium
    numbers, kit header: "PES default images").
  - **Whose image:** the club folder it sits in decides first (`Images/<Club>/`, its `Kits` and `Sala de Prensa` subfolders),
    matched within its league either way (PSV ↔ PSV Eindhoven, NICE ↔ OGC Nice); then a club named in the file name; only
    then a team whose own images sit in that folder. A folder named after a club the project doesn't have leaves the image
    unowned (Hajduk Split, Heidenheim: the 2026-27 file has images but no team file for them).
  - **Which kind:** the makers' conventions: Home/Away/Third(3th)/GK kits (Home2, Away2, Fourth are variants that only take a
    free slot of their family), `…STApesuni`/`…STpesuni` stadium, `…MANpesuni`/`… Man` manager, `…LOGpesuni` crest,
    `…Press1`/`Sala de Prensa` boards.
  - **You can say what images are:** tick rows and press *Manager photos*, *Stadium images*, *Kits*, *Crests* or *Sponsor
    boards*. A marked manager photo or stadium image is matched by the manager's or stadium's name in its file name first
    (Julian Calero.png → Burgos, managed by J. Calero), else by its folder. *Why:* 2026-11-18, the user. *Where:*
    `settings.ofOrKind`, `orMarked`, `ACT.orMark`, `orOwner`. On the 2026-27 file the fix links 276 of the 590 images at once.
- **The baseline moves only when the user confirms PES imported the export**, through two warnings; writing an export never
  records the install by itself, and the previous option file stays the baseline until then. *Why:* 2026-11-18, the user.
  *Where:* `ofSetPending`, `ACT.ofConfirm`, `ofApplyInstall`, `ofPendingHTML`.
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
- **Leagues in the game are arranged by hand: Edit → Competition Structure.** Competition files hold no team lists, and a team
  file keeps its club's own team slot, which PES 2021 places in a league; importing never moves a club between leagues. The option
  file's league folders are the season's line-up (in 2026-27, 7 Premier League clubs sit in English 2nd Division slots and 7
  Championship clubs in English League slots), and option files ship league-order pictures for the moves. So any club can be
  moved to any league in the studio, and the studio lists the moves to make in the game, league by league ("Competition
  Structure in the game" on Import / Export → Export Option File and in the health check, on the team's competitions dialog, and in CHANGES.txt).
  *Why:* 2026-11-18: the user first chose to block league moves of option-file clubs, then, once we found the game's Competition
  Structure, to allow them with a guide. *Where:* `csPlan`, `slotGuideHTML`, `csMoveNote`, `csText`; PES 2021 slot leagues from
  `assets/pes21-teams.json` (PES Master).
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
- **Game codes page: four tabs, the same tables in each.** Competitions and Teams each have *Game Codes* (only what the game
  has: preset slots and team codes) and *Files with no Codes* (every competition or team with none). Images has *Deleted/ignored
  images (free codes)* and *Images with no code*. *Free codes* has Competitions, Teams and Images. A code is free when no file
  holds it, whether freed on the page or never used, and every free row carries the *free code* tag. An image name is an
  image's code: free names come from codes freed on the page and from option-file images deleted or ignored in the health
  check (`settings.ofOrphan`). Apply renames an image with no code to the chosen free name: kept in `settings.imgCodes`,
  returned first by `codeImgName` so the export writes the image under it, and shown as the image's name in the library. A
  code given to a team takes its image names back from any image holding one alone. *Why:* the user, 2026-11-19.
- **A PES default slot is never "missing".** One test everywhere (`missCrest`, `missLogo`, `missCoach`): the Missing emblems tab,
  its count, the free sources and Claude's "fill what's missing" all leave out slots the option file leaves to the game. *Why:*
  2026-11-19, the user: Claude took the whole list, PES defaults included, and the tab said 90 where 6 were missing.
  Every way of asking for logos uses `logoWanted(x, which)` (missing / notfl / all); only *all* covers a PES default. A queued
  logo job keeps the list it was given, so it is trimmed again when the studio opens and when it runs (`logoJobTrim`): a job
  queued earlier never does the whole old list.
  - **A hand-off keeps the list it was opened with.** *Fill N missing…* on Missing emblems opens Claude update → Logos & kits
    set to exactly that list: only missing emblems, of the kind and competition shown; coaches and stadiums unticked, and a
    *Replace all* left over from an earlier run reset (it is a one-off, and asks first). *Run* shows what it will cover
    before it runs (per item, and how many PES defaults *Replace all* adds). *Why:* 2026-11-19, the user: a few missing
    images became the whole list, PES defaults included, once on Claude update. *Where:* `goArt`, `artRunTargets`,
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
- **Every page and tree marks a default slot "PES default"** (team images and kits, competitions, stadiums, sponsors, managers,
  Project structure, Option file contents) instead of "none" or "drawn". *Where:* `ofOwnSlot`, `pesOwnTag`, `pesOwnNote`.

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
- **National teams use their country's flag as emblem.** Except a national team from the option file: it keeps the option file's choice (the game's own crest when its file names none) unless you pick "Use flag".

## 7. Players

- **Each player is listed once per squad**; one shirt number per player per squad. Special eFootball cards are dropped from squads.
- **The same player in two clubs** is resolved by looking up his club for the current season (one queued job, in batches) and
  suggesting that club.

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
  check doesn't suggest a flag for a national team that keeps the option file's own crest. Likewise a league folder with no competition file
  is one of the game's own competitions: no file, ID or logo is made for it. *Why:* 2026-11-18, a fresh build from the option file
  showed 3,534 "changes" the user never made: drawn crests and made-up competition files. *Where:* `ofGameCrest`, `ofGameComp`,
  `needsCrest`, `needsLogo`, `needsCompFile`.
- **A fresh build has no changes**, on every counter: Changes since baseline, Changes to export and the export's Changes only. The
  automatic steps after a build run before the baseline snapshot (`finishFresh`), one image run at a time. A second file for a
  team slot is the option file's own layout: it is kept, never shown as removed, and rewritten with the team's data when the team
  changes (`t.of.copies`). *Why:* 2026-11-18, the user found 34 "Removed" files in a project they hadn't touched.
  Starting over while signed in also clears the browser's own copy, so signing in can't carry an old project back.

## 9. Health check

- **The plain answer first** (ready / almost ready / not ready), one button for the safe fixes, then issues grouped by problem
  or by team, each with why it matters.
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
  asked for a coded last resort, then for it for all at the top. *Where:* `randomFillTeam`, `rfRatings`, `ACT.randomFill`,
  `ACT.randomFillAll`.
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
- **A club that exists has a squad somewhere: Wikipedia is the free source of last resort.** eFootball and the Transfermarkt
  dataset cover fixed lists of leagues, so a club just promoted into a pro league is missing from both or shows last season.
  The club's English Wikipedia article lists its current squad (number, nationality, position, name; birth date and height
  from Wikidata through each player's article). Transfermarkt data from before this season gives way to Wikipedia's list,
  unless that list is dated before the season too. Same-name clubs are told apart by country; women's, reserve (B/C) and
  youth sides never match. Claude squad requests get the pages already matched and a web fetch tool, and are told to open the
  squad page and read the whole list, because search results show only the start of a page.
  *Why:* 2026-11-19, a newly promoted club's squad was easy to find online but no source found it. *Where:* `wikipedia.py`
  (`/api/wp/squad`), `wpDraftTeam`, `efDraftTeam` chain, `squadPages` in `rosterPrompt`, `web_fetch` in `server.py`.
- **One free-source pull: "Pull from free sources".** Every command that pulls data from eFootball or any other free database is
  this one pull, under this one name, everywhere in the app. A team: the squad from FIFA (national teams in the newest World Cup),
  else eFootball, else Transfermarkt, else Wikipedia; EA SPORTS FC fills the details and ratings that source left out; then the crest
  (TheSportsDB, eFootball), coach and stadium (Transfermarkt) and whatever is still open (Wikidata), in one Review batch. Players:
  eFootball, then EA SPORTS FC; what neither has goes to "Not found in the free sources". Never add a pull from one source on its
  own; add the source to the shared pull instead. *Where:* `runFreeTeam` (job types `free`, and old `ef` / `compPull` / `fifaTeam`
  jobs), the `efPlayers` wrapper (job types `freePlayers`, old `efPlayers` / `fcPlayers`).
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
  - *Team information:* the first source with a value wins, later ones fill only what is still empty. Crest: TheSportsDB →
    eFootball (when there is no squad) → Wikidata. Coach and stadium: the squad source → Transfermarkt → Wikidata.
  - Everything goes to Process and Review as one batch per team; no source writes straight into the data.
  *Why:* 2026-11-19, the user asked which free source supersedes which. *Where:* `freeSquad`, the `efDraftTeam` chain,
  `wpDraftTeam`, `fcApply`, `runFreeTeam`.
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
- **Import and export live on one page, Import / Export (`#optionfile`), in four tabs in the order the work goes, titled without numbers** (`IO_TABS`):
  Import Option File (the package and building the project from it), Import files, Export Option File (First install / Changes
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
  player this way, and `kitTextureCanvas` draws a kit from colours in the same layout.
- **The Kit designer works on the kit's own image** (`KA`, `kaEnsure`): opening a kit shows its saved image (PES kit layout,
  `KIT_UV`) on the 3D player and on the artwork sheet; a kit without one is drawn from the colours. Imported elements are
  layers on the sheet, shown on the player as they change. Nothing is stored until *Save and replace* (a new kit image is
  made and assigned; the old one stays in the library) or *Export PNG*. The name and numbers (back, shorts) are the game's:
  they are drawn on the player only, never into the image. *Why:* the user, 2026-11-19.
