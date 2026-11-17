---
name: pes21-rules
description: The PES 2021 Option Studio rule book - the standing rules (invariants) every change to this app must keep, from the option file as the benchmark to game IDs, seasons, the World Cup, imports, exports and the health check. Read it before changing index.html, server.py or any importer, exporter, health check or Claude-update code in this repo, before answering how the studio should behave, and whenever the user states a new general rule ("make this a rule", "from now on the app should…") so it gets added here.
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
- **Exports reproduce the option file's file set, folder for folder and name for name.** *First install* writes the complete set;
  *Changes only* writes just the files that differ from the last install, with `CHANGES.txt`. *Where:* `ofPlan`, README "Option-file packages".
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

## 4. Teams, competitions and seasons

- **Never empty or remove a club a season leaves out.** A team absent from a season's data (relegated, left its competition,
  unknown to the source) is kept exactly as it is, with its players and memberships. PES has no team limit.
  *Why:* 2026-11-15. *Where:* `batchFromData` (zero-player source skips the club, logs "kept as is"), `compUnlisted`.
  Removals apply only when a source does list that club's squad.
- **Clubs a competition update lists that the project lacks are built in full** (squad, ratings, kits, crest). *Where:* `queueNewClubs`.
- **Cups never change a club's league.** A cup only adds participants (`comp.teams`); in PES cups use the league clubs, so cup
  copies of league clubs are merged into the league club (health check "Cup copies").
- **The season turns over on 1 September** (2026/27 = 1 Sep 2026 – 31 Aug 2027). A hand-set label stays until the next 1 September.

## 5. National teams and the World Cup

- **There is always exactly one World Cup with every national team.** It keeps the last edition's title and logo until a newer
  edition's name and logo are published; only the international search may change them. It can't be deleted and national teams
  can't be removed from it. *Why:* 2026-11-15. *Where:* `ensureWorldCup()`, `allowWc`.
- **A footballer has separate records at his club and in his national team.** Matching never crosses that line, and a player
  stays at his club when he joins his national team. National teams get no "Keep at" suggestion in the health check.
- **National teams use their country's flag as emblem.**

## 6. Players

- **Each player is listed once per squad**; one shirt number per player per squad. Special eFootball cards are dropped from squads.
- **The same player in two clubs** is resolved by looking up his club for the current season (one queued job, in batches) and
  suggesting that club.

## 7. Images

- **The studio makes every image the game files name** when none exists: crests and logos drawn from colours and short name
  (national teams: the flag), kits drawn at export in the 2048 px layout, stadium and sponsor boards from the team's colours.
  Generated images are marked so a real one found later replaces them.
- **Never invent a face:** a manager without a photo gets a neutral placeholder.

## 8. Health check

- **The plain answer first** (ready / almost ready / not ready), one button for the safe fixes, then issues grouped by problem
  or by team, each with why it matters.
- **One suggested action per row, and "Apply all suggested actions" on every group.**
- **Don't flag what isn't a problem.** New clubs outside the option file, teams a season leaves out and national teams' club
  links are expected states, not issues.

## 9. Claude updates, data sources and the cloud

- **Free sources first, Claude second.** Free databases are offered before paid Claude lookups; costs and the Stats tab are for
  admins only.
- **Cloud saving sends a few requests at a time**, with one message and a clear finish.
- **Only game data goes into the public baseline** (teams, players, competitions, images, team files); the review queue, jobs and
  history stay private. Packages and projects built from them are for signed-in accounts only.
