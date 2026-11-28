# PES 2021 Option Studio

Manage, update and export eFootball PES 2021 option-file data (teams, players, competitions, crests, kits) for PS4/PS5 via USB.

This folder is the website root. It runs on your computer now and is laid out so it can later go to Google Cloud.

## Run it on this computer

1. Install Python 3.9 or newer (python.org) if you don't have it.
2. Double-click **start.bat**. It creates `.env` from `.env.example` the first time, starts the server and opens http://localhost:8080.
3. For the Claude buttons (quick checks, ratings, crest designs), open `.env`, paste your Anthropic API key after `ANTHROPIC_API_KEY=`, and run start.bat again.

Or from a terminal: `python server.py`.

## Where your data lives

When it runs here, the studio keeps your project in this browser (IndexedDB), on this computer. It is not the same storage as the claude.ai version.

To bring your claude.ai project over (current data only; snapshots stay behind):
1. In the claude.ai version: Settings → **Pack whole project (.zip)**. It saves `project-transfer.zip`.
2. Put that file in this folder's `data` folder.
3. Start the local studio. With an empty project it offers to load the file. You can also use Settings → **Load a packed project…** at any time.

Use Settings → Copy and move → Pack whole project regularly. Clearing the browser's site data deletes the project.

## Files

| Path | What it is |
|---|---|
| `index.html` | The page: styles, layout, and the list of script files it loads |
| `js/app-*.js` | The studio itself, in 14 parts loaded in order (core, pages, Claude, import/export, team files, health check, jobs, game files, free sources, option file, Live Update, images, fixes, boot). Each file's first line says what it holds |
| `check.py` | The checks to run before a push: `python check.py` |
| `js/platform.js` | Standalone layer: browser storage, downloads, and Claude requests through the server |
| `js/pes-templates.js` | Built-in PES 2021 game files (Manchester United, Qatar, Sharjah team files; Premier League, FIFA World Cup competition files) used as templates |
| `vendor/jszip.min.js` | JSZip 3.10.1 (ZIP files) |
| `vendor/xlsx.full.min.js` | SheetJS 0.18.5 (Excel files) |
| `efootball.py` | Reads the eFootball database on PES Master (teams, current squads, player records) for the eFootball commands |
| `assets/efootball-teams.json` | eFootball's team list (ID, name, league) used to find a club's eFootball team |
| `logos.py` | Finds and downloads club crests and competition logos from FootyLogos |
| `cloud.py` | Google sign-in, Firestore and Cloud Storage for the online version |
| `server.py` | Local web server; forwards Claude requests to the Anthropic API so your key stays out of the browser |
| `Dockerfile`, `.dockerignore` | How Google Cloud Run builds the site (secrets and `data/` are left out) |
| `.env.example` | Settings template. Your real `.env` holds the API key; keep it private |
| `start.bat` | One-click start on Windows |
| `data/` | Drop `project-transfer.zip` here to load a project. Served only on this computer; empty it before publishing |

The server only serves `index.html`, `js/`, `vendor/`, `assets/` and (on this computer only) `data/`, so `.env` and `server.py` can't be downloaded from the site.

## Settings (`.env`)

| Name | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | (empty) | Needed for the Claude features |
| `PORT` | 8080 | Port to listen on |
| `HOST` | 127.0.0.1 | 127.0.0.1 = this computer only; 0.0.0.0 = other devices on your network |
| `CLAUDE_MODEL_COMPLEX` / `_DEFAULT` / `_QUICK` | Opus / Sonnet / Haiku 5.5 | Model used for each "Claude effort" setting |
| `CLAUDE_MAX_TOKENS` | 16000 | Longest reply |
| `CLAUDE_WEB_MAX_USES` | 5 | Most web searches Claude may run per request (0 turns web search off). Settings → *Claude web search* switches it per project |
| `CLAUDE_WEB_FETCH_USES` | 3 | Most whole pages Claude may open per request with web search on (a club's Wikipedia or Transfermarkt squad page; search results alone show only the start of a page). 0 turns it off |
| `CLAUDE_PASSPHRASE` | (empty) | If set, the Claude buttons ask visitors for this passphrase (once per browser) |
| `CLAUDE_DAILY_LIMIT` | 0 | Most Claude requests per visitor per day; 0 = no limit |
| `CLAUDE_MEMBER_TIER` | default | The Claude effort members and visitors of the website get: `complex`, `default` or `quick`. Only an owner account chooses its own (Settings → Admin) |
| `CLAUDE_MEMBER_WEB` | 1 | 0 = no Claude web search for members and visitors |
| `CLAUDE_FALLBACKS` | 1 | 0 = a request a safety filter declines is not passed to another model |

Fonts load from Google Fonts when online. Offline, the page uses system fonts.

## Season and up-to-date data

- Claude is asked about the season in Settings (*Season label*). The label moves to the new season automatically every 1 September (2026/27 runs from 1 September 2026 to 31 August 2027), and new projects start on the current season. A label you set by hand, for example to build an older season, stays until the next 1 September; when it is behind, the Overview and Live Update pages offer **Switch to …**.
- With **Claude web search** on (Settings, on by default online), Claude checks official club and league sites, Transfermarkt, Wikipedia and recent news before answering, so summer transfers and new managers are included. Web search costs $10 per 1,000 searches on your Anthropic bill, plus the tokens for what it reads; each request makes at most `CLAUDE_WEB_MAX_USES` searches.

## Game files for the USB drive (.ted / .ced)

Partial Export writes real PES 2021 files next to the images they use, so the game links them on import:
- **Team files (.ted)** for *Import Team*: name, short name, stadium, squad, numbers and ratings. The emblem (`E_…png`) and manager photo (`M_…png`) are named inside the file and sit in the same folder.
- **Competition files (.ced)** for *Import Competition*: name and emblem (`C_…png`), linked the same way.

Where each file comes from, in order:
1. A file you imported (Import files page): exported from the game with Edit → Data Management → Import/Export → Export Team / Export Competition. Best results.
2. A built-in file from `js/pes-templates.js`, when the team or competition matches it by name or in-game ID.
3. The generic template, when you enter the in-game team or competition ID (Team → Details, or the competition form). Experimental: kit colours, coach and tactics come from the template.

Every team carries a game file: its real PES 2021 team ID (from PES Master), or, for a club the game doesn't have, a free in-game slot it replaces (the game's fictional clubs first, then teams from leagues the project doesn't use; the team's *Replaces in-game team* field names it). Image files are renamed to serials from that ID (`E_000101.png`, `M_000101.png`). Competitions carry their game file where the ID is known (Premier League 17, FIFA World Cup 34); the rest have serial emblem names (`C_X01.png` …) until their .ced is imported. A team with no squad in the studio gets a team-info file (name starts with `I`), imported with *Apply player and squad data* off so the game keeps its own squad.

Players the game doesn't have are created as new edit players (their appearance is copied from a template player). A team with no players in the studio keeps the game's squad.

Before you download, the **connection check** reads every file back (checksum, size, name, team/competition ID) and confirms that each image a file names is in the package, in the same folder, at the size PES expects. It blocks the export on problems, for example an unticked emblem or two files for the same in-game team. **Write to USB drive** (Chrome or Edge on a computer) writes the files straight to the drive's `WEPES` folder and reads them back.

## eFootball database (current squads and ratings)

eFootball is Konami's current game, and its team, player and country IDs are the ones PES 2021 uses. The studio reads it from [PES Master](https://www.pesmaster.com) through this site's server (`efootball.py`, `/api/efootball/*`), so squads come with this season's players, ratings, skills, playing styles, shirt numbers and real game IDs, at no cost.
- **Live Update → eFootball database:** pull squads for teams without players, squads under 15, a competition or every team. *Look in the eFootball database first* (on by default) makes every Claude squad update try eFootball first; Claude then only adds what eFootball doesn't have (manager, kits), or takes over for teams eFootball doesn't include. Claude's web search is also told to check PES Master's eFootball pages first.
- **Teams → squad → Pull squad from eFootball**, and **Players → select → Refresh from eFootball** (by game ID, or by name in the team's eFootball squad).
- **Health check** warns about teams without squads, squads under 15 players, players with missing data, missing, shared or mismatched game IDs, automatically assigned in-game slots and players without a game ID, each with fix buttons (Pull from eFootball, Fill from eFootball, Live Update or Claude fill, Give numbers, Use the file's ID, Set ID, Import its .ted).
  - The page opens with a plain answer (*Not ready*, *Almost ready* or *Ready*) and one **Fix automatically** button for the safe fixes (duplicate entries and shirt numbers, undoable from the change history).
  - Issues are rated *Must fix*, *Should fix* or *Suggestion*, grouped **by problem** (each with a line on why it matters) or **by team**, and can be searched. Suggestions stay hidden until asked for.
  - Teams without a league (clubs whose competition is missing or only a cup; national teams, cup copies and parked teams aren't listed): each has *Put in league…*, Open and Delete (also *Delete them (N)* for the group; a game ID a deleted team holds is kept as a free code).
  - Leagues with no teams (cups are left out; each suggested *Find its clubs*, a Claude club check whose result waits in Process and Review, with Edit and Delete beside it; the World Cup is never offered for deletion), cup copies, players in two clubs, tools for every team and the in-game slot guide sit under **More checks**.
  - Every group with fixes that can run for many teams at once has **Apply all suggested actions** beside its title: one confirmation lists what runs, look-ups are queued, and the changes can be undone. Opening a team, setting an ID by hand or dropping a file stay one by one.
  - A fix started from the health check that looks something up (eFootball, Transfermarkt, Wikipedia, Claude, flags, crests) puts its results in Process and Review, like any other look-up; fixes the studio works out itself (shirt numbers, duplicates, game IDs, short names, long names) apply at once as one undoable entry in the change history. When eFootball and Transfermarkt don't have a squad, the fix goes on with a Claude update; details eFootball can't fill go to Claude (details only: the squad is never replaced by a details fix) and missing shirt numbers are given. Under each issue, **Last fix** says what the last fix for that team did (changes applied from eFootball or Claude, players eFootball doesn't have, failures), so a problem that stays says why. A player linked to a game record isn't missing his nationality: the game keeps it in his record. Two players with one name and different game IDs get one suggestion, *Different players* (marked as checked) or *Same player: keep one* (same position, ages a year apart or less; Konami's ID is kept), with both buttons there. Issues being fixed show *Being fixed now* or *Fix queued*, and a banner counts the fixes in progress. Fixes started from the health check carry on by themselves after a reload or when the studio is opened again. The Claude details fill asks without a web search, so it takes seconds per team.
- `assets/efootball-teams.json` lists eFootball's teams (778); *Refresh team list* re-reads PES Master's league pages (on your computer, or online when signed in). `EFOOTBALL_DAILY_LIMIT` (default 20000) caps PES Master pages per visitor per day.
- Everything goes to Process and Review first. Ratings are eFootball's base (level 1) values, which use the PES 2021 scale; *Ball Winning* is the average of eFootball's *Tackling* and *Defensive Engagement*.

## Other data sources

All are read by this site's server (the browser can't fetch other sites), cached, and everything they return goes to Process and Review first.

| Source | Module / routes | What it fills | Notes |
|---|---|---|---|
| eFootball on PES Master | `efootball.py`, `/api/efootball/*` | Squads, ratings, game IDs (see above); team crests (128 px), league logos, coach names with photos | Coaches without a photo are skipped: eFootball invents names for unlicensed coaches |
| Open Transfermarkt dataset ([transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets)) | `transfermarkt.py`, `/api/tm/*` | Squads for clubs eFootball doesn't have (Bundesliga, Saudi Pro League, Austria, Greece, Croatia, Serbia, Scandinavia …), coaches, stadiums | About 800 clubs; no shirt numbers or abilities, so abilities are estimated from market value and age and numbers are handed out like *Renumber* |
| EA SPORTS FC ratings (the game once called FIFA; EA's public ratings at ea.com) | `fcratings.py`, `/api/fc/players?names=` | Ratings for unrated players (EA's stats ability by ability, one for one with PES's floor of 40: tested on 50 players, the PES overall lands within a point of EA's), plus missing height, weight, age, nationality, foot, weak foot and playable positions | About 16,000 current men's players, read in pages once a day (about 25 seconds on first use). A player is matched by name, then age (a year either way), nationality and club; younger squad players EA leaves out stay for Claude |
| FIFA ([api.fifa.com](https://api.fifa.com), the data behind fifa.com) | `fifa.py`, `/api/fifa/worldcup`, `/api/fifa/squad?team=` | Official squads of the national teams in the newest World Cup: names, shirt numbers, lines, height, weight, age | A player already in a club brings his club record; a new one is rated from EA SPORTS FC. Players already in the studio keep their names and are matched by name, else last name and age. FIFA gives the line (goalkeeper, defender, midfielder, forward), not the exact position |
| TheSportsDB | `thesportsdb.py`, `/api/tsdb/*` | 512-pixel club badges and stadiums, including clubs others miss (UAE leagues, Cyprus, Kazakhstan …) | Free test key by default; `THESPORTSDB_KEY` in `.env` for your own |
| English Wikipedia (club articles) | `wikipedia.py`, `/api/wp/squad?name=&country=` | Current squads for clubs the others miss, above all clubs just promoted into a pro league: shirt number, nationality, line, name; birth date and height from Wikidata for players with an article | The article's *Players* / *Current squad* list; loanees out, youth, reserve and former players are left out. Same-name clubs are told apart by country. Lines only (GK, DF, MF, FW), and no ratings: EA SPORTS FC then fills what it has |
| Wikidata and Wikimedia Commons | `wikidata.py`, `/api/wd/*` | Head coach, home stadium, freely licensed logos | Last resort; the query service limits requests at busy times, and a job then stops asking it |
| Wikipedia (logos) | `wikipedia.py`, `/api/wp/logo` | The crest or logo at the top of the club's or competition's English article, non-free ones included | After Wikimedia Commons |

Order of use:
- **Squads** (*Pull from free sources*, Health check fixes): eFootball, then Transfermarkt, then Wikipedia, then Claude. Transfermarkt data from before the current season gives way to Wikipedia's list unless that is older too. Claude gets the squad pages already matched and opens them in full. A national team in the newest World Cup asks FIFA first (Health check: *Squad from FIFA*; Tools for every team: *World Cup squads from FIFA*).
- **Ratings and player details** (Health check): eFootball, then EA SPORTS FC, both by themselves when a fix runs (EA SPORTS FC also has its own buttons, *Fill from EA SPORTS FC* and *Ratings from EA SPORTS FC*). Only players neither has are listed on Process and Review, where Claude can be asked for them.
- **Kits:** kit sheets in the PES layout from Kit Man Cal's free kit store on Google Drive (`kitdrive.py`): the project's season first, then the season before. Only kits that are missing are filled; a team the store doesn't have is listed under Ask Claude for kit colours.
- **Crests:** FootyLogos, then TheSportsDB, Wikimedia Commons, Wikipedia, football-logos, eFootball. National teams take their flags. **Competition logos:** FootyLogos, TheSportsDB, Wikimedia Commons, Wikipedia, eFootball.
- **Coaches:** eFootball (name and photo), then Transfermarkt, Wikidata. **Stadiums:** TheSportsDB, then Transfermarkt, Wikidata. Every command that needs one of these uses the same list.
- Reserve and youth sides (B, II, U21 …) are never matched to a first team, so a first team's squad can't move to its reserves.

Not built in: football-data.org needs a personal key even on its free tier and covers only the main European leagues, which eFootball and Transfermarkt already have. Kit textures (2048×2048 in the PES strip layout) come from community PS4 option files; add their PNGs on the Import files page (unzip RAR files first).

## National team flags

National teams use their country's flag as emblem, not a federation crest. The flags ship with the site in `assets/flags` (254 SVGs from [flag-icons](https://github.com/lipis/flag-icons), MIT licence, with England, Scotland, Wales and Northern Ireland), so they never depend on another website; `assets/flags/index.json` maps country names, including football names such as *Korea Republic*, *IR Iran*, *Türkiye* and *Congo DR*, to flags. Wherever the studio fetches a crest (Logos & kits, Live Updates with *Club crest*, new national teams), a national team gets its flag, rendered as a 256×256 PNG with the flag's own 4:3 shape. Health check lists national teams without their flag, with *Use flag* and *Use flags for all national teams*; results go to Process and Review.

**A player plays for his club and for his national team.** That isn't a duplicate. PES 2021 has every player in one club and his national team at once, under the same player ID. The studio keeps one record per team: each has its own studio id and both keep the same game ID.
- Nothing moves a player between a club and a national team: not updates, team-file imports, the health check, or older queued changes (these now add a copy and leave the club as it is).
- A national team is a team in a national competition (the World Cup and others), a team named after a country (`assets/flags/index.json`), a team wearing a flag, or a team whose squad is mostly of the country it is named after. The health check never offers "Keep at" for a national team.
- Only two clubs can't share a player. **Search for the right team** (beside the section title) looks up where each player plays in the selected season, all in one queued job with its progress in the bar: eFootball first (by game ID, 40 players per request), then the Transfermarkt dataset (by name and age, all names in one request), then Claude for whoever is left, 15 players per request, with the clubs of his career newest first. Claude is the only source for a season other than the current one. Each player gets exactly one suggestion: keep him at one of his clubs, move him to the club he plays for when it is in the studio, else to his last club that is, or remove him from his clubs when nothing is known. Nothing changes until you press the suggestion's button or **Apply all suggested actions**; suggestions are kept per season in the browser.

## Logos from FootyLogos

Club crests and competition logos come from [FootyLogos](https://www.footylogos.com) (latest official logos, 1500 px PNG and SVG).
- **Logos & kits → Fetch missing logos / Update all logos** looks up every team and competition. **Live Update → "Club crest (latest logo from FootyLogos)"** (on by default) adds the crest to each team update, and building a competition with Claude also fetches its logo.
- The server (`logos.py`) finds each logo by the club's FootyLogos slug (e.g. `al-ain`, `real-madrid`, `premier-league-england`), trying likely slugs from the name and, when none match, slugs Claude suggests. It then passes the file to the browser, which can't download from other sites itself. New logos always go to Process and Review first.
- Crest links in update files from the claude.ai commands (FootyLogos, GitHub, Wikimedia) are fetched the same way.

## Option-file packages: the benchmark (the rule for how the studio works)

A real PES 2021 option file (for example *PES 2021 Option File 2026-2027*) is the benchmark for everything the studio writes. The studio builds its project from the option file and exports **the same file set, in the same structure, with the same names**.

**How an option file is built** (2026-27: 3,742 entries, 3.2 GB unzipped; 715 team files, 57 competition files, 2,125 images):
- `USB 1/WEPES/1 … 7/<NN. League>/Teds…/*.ted` – one team file per club (14,820 bytes), and `…/Images/<Club>/*.png` – that club's crest, kits, manager photo, stadium and sponsor images.
- `USB 1/WEPES/1/00. Competitions/*.ced` (852 bytes each) and its `Logos/`.
- `USB 2/WEPES/…` and `USB 3/WEPES/…` – add-on parts (Liga MX and others) in their own folder layout; `CREDITOS.txt`, help images and league order at the root.
- PES links images by **file name**: each .ted holds the names of its crest (offset 503), stadium (536), sponsors (569/602/635), manager photo (723) and five kits (1766 + 132·k: 1st, 2nd, GK 1st, 3rd, GK 2nd); each .ced its emblem (804). *Import Team* with "Overwrite image files of the same name" then picks up the PNGs.
- **Any name works for any file.** The game doesn't care what a file is called or which folder it sits in. What makes a PNG a crest, kit, manager photo, stadium image or sponsor board is the name a team or competition file gives it. The studio follows the same rule:
  - **Import** places each image where a game file names it, wherever it sits in the pack. When two files share a name, the copy nearest the team file is used. A name given without `.png` still matches. A named file in a help or credits folder is still game data.
  - Images with no team file in the same import are linked through the game files already in the system: option-file names, stored team files, and the names exports write.
  - An image no game file names is left unticked when game files come with it, since the game wouldn't use it. Only loose images on their own are guessed from their names and folders.
  - **Exports** may give files any name, as long as every team and competition file names its own images.
- The option file uses its own team slots (Arsenal 2517, Man Utd 4077, Bayern 4938 …); the studio adopts them.

**The rule**
1. The option file is the main baseline: *Import / Export → Import Option File → Build the project from it* reads every .ted/.ced, matches the project's teams (same slot and name first, then name within the same country), takes the option file's data first and keeps the project's own data only to fill gaps. Teams the option file lacks stay, under their own slots.
2. Images are never copied: the project points at the package's own PNGs (`o:<package>|<path>`), so nothing is duplicated in browser storage or the baseline.
3. **First install** writes the complete file set as **one USB folder**: the option file's main part (`USB 1`) with its own file names, laid out by competition and team in each numbered part, and its extras (credits, help images, league order) at the top. Add-on parts (`USB 2` Liga MX, `USB 3` Liga 1 Peru) reuse its team slots and competition IDs, so the game can hold only one of them; they are left out. Team files of edited teams are rebuilt from their originals (their image names kept), edited images are written over the original file names, competition files are rebuilt. Every file of the option file stays: where it has two team files for one slot (an earlier part's and a later part's), the team is built from the later one and both files are rewritten with the same data when it changes, so the game gets the same team whichever it imports last (it imports all files of a kind at once and links them by the names inside them). Teams and competitions deleted in the studio are left out, with the images only their files name. If ticked, the project's extra teams go into their league's own folder (`Teds…/`, `Images/<Team>/`), or one new league folder per competition, numbered after the option file's last one; new competition files go into its competitions folder. These paths are kept, so adding or deleting a competition never moves a team.
4. **Changes only** writes just the files that differ from the baseline, with `CHANGES.txt` listing them and the files to delete from your installed copy. Copy them over the installed folder.
   - **The baseline moves only when you confirm.** After an export, import it in PES 2021 and check it; then press *PES imported it: make it the baseline* on Import / Export → Export Option File (two warnings). Until then the option file, or the last export you confirmed, stays the baseline. Keep your copy of the previous option file until you are sure.
   - **Leagues are arranged in the game, by hand: Edit → Competition Structure.** Competition files hold no team lists and team files keep each club's own slot, so importing never moves a club between leagues. Move clubs freely in the studio; Import / Export → Export Option File (*Competition Structure in the game*) and CHANGES.txt list the moves to make in the game, league by league.
5. Both are written as one ZIP streamed to disk (or straight into a folder you pick), so a 3 GB set never sits in memory. Use Chrome or Edge.

**Every team and competition has its game file.** No team or competition exists in the studio without its own stored file: a .ted (team) or .ced (competition), linked to its images by file name. Imported and option-file files are kept; the rest are generated (once for an existing project, with a snapshot first, then on every save): a team keeps its in-game ID or takes a free PES 2021 slot from `assets/pes21-teams.json` (PES Master's PES 2021 lists: fictional clubs first, then leagues the project doesn't use, never a slot already in use); a competition keeps its ID or takes a built-in file's ID by name, else a random unused competition number (the game's small range; the option file's run 1–165). Nothing has ID 0: a team without a free slot gets a random unused number in PES 2021's team range, and a player without a game ID gets a random unused edit-player ID (bit 30 set, as the game gives created players), stored on the player and written into his team file. A cup copy of a club shares its league copy's team ID and player IDs and has no file of its own. The studio also makes the images the files name: a team or competition without a crest or logo gets one drawn from its colours and short name (national teams: their flag), stored and marked generated so a real image found later replaces it; a kit without an image is drawn at export in PES 2021's kit layout (2048 px) from its colours and pattern, with the crest and sponsor, and named in the team file. A team file also names a **stadium image** (1024 × 512) and three **sponsor boards** (256 × 128; option files use them for sponsor boards and press-room backdrops, and a league can share one set). The studio keeps them on the team (pages: Stadiums, Sponsors & press room, Managers), reads them on Import by the names in each team file, takes them along when building from an option file, and writes them with every export; a team without its own gets a stadium image and boards drawn from its colours, crest and kit sponsor, and a neutral manager placeholder (never an invented face). Files for people rather than the game (credits, help images, league-order sheets) are kept on the Extras page at their path and written with Partial Export. Image names follow the in-game ID (`E_/M_/K_<id>`, `C_<id>`). A cup copy of a club uses its league copy's file. Red flags after that are for the user to fix, ignore or leave out.

**Where packages live**: online, in the site bucket (upload with the Cloud Storage console or `gcloud storage cp`, then *Register* its path, e.g. `public/PES21 Option File 26-27.zip`, while signed in); on this computer, drop the ZIP into `data/optionfiles/` (or upload it on the page). The server reads only the ZIP's directory and single files from it (byte ranges online). Every other signed-in account can upload its own option file: it goes to `users/<their id>/optionfiles/` with its own registry, and only that account sees it. The site's packages are open to everyone (read-only): one of them is **the site's baseline**, the option file every visitor and account starts from (the one marked *site baseline* on Import / Export → Export Option File; an owner can make another one the baseline).

## Saving to Google Cloud and the site's baseline

- **Signed in (owner):** click *Sign in with Google* at the bottom of the left menu. The accounts in `ALLOWED_EMAILS` (Dockerfile) are owners. With `OPEN_SIGNIN=1` (Dockerfile) any other verified Google account can sign in too, as a member: their own project is saved to the cloud like yours, but owner features stay locked on the server (Claude without the passphrase, option-file packages, publishing baselines, admin stats, eFootball refresh). Set `OPEN_SIGNIN=0` to refuse everyone but the owners again. Visitors who don't sign in can use everything except importing and exporting (Import, Partial Export, Option file, backups, project transfer); when they sign in, the project they built in the browser carries into their cloud project (if the cloud project already has teams, they're asked first and a snapshot is taken). Your project is then saved privately in Google Cloud and is the same on every device: records in Firestore (`users/<your Google id>/...`), images and files in the bucket `pes21-data-manager-studio`. The Claude buttons don't ask for the passphrase while you're signed in.
- **Not signed in (visitors):** the studio works as before and keeps the project in that browser only.
- **The site's baseline** is the option file you uploaded (`gs://pes21-data-manager-studio/optionfiles/`), the same for everyone. An empty project offers to start from it (no sign-in needed), Settings → *Build from the site's option file* builds from it again, and Overview says when a project was built from another option file. Setting a baseline in Compare & versions only marks a snapshot in your own project; nothing is published.
- Google sign-in settings: Google Auth Platform → Clients → *PES21 Studio website* (allowed origins: the run.app address and http://localhost:8080). While the app is in *Testing*, the account must also be listed under Audience → Test users.
- Locally (`python server.py`) cloud saving is off unless the server can reach Google Cloud credentials; the studio uses browser storage.

## Online (Google Cloud Run)

- Code: https://github.com/uae2000uae/PES21DM. Every push to `main` rebuilds and redeploys the site (Cloud Build trigger, project `pes21-data-manager`, region `me-central1`).
- The site is public. The Claude buttons ask for the passphrase stored as the `CLAUDE_PASSPHRASE` secret; `ANTHROPIC_API_KEY` is also a Secret Manager secret. Neither is ever in GitHub.
- Visitors' projects are kept in their own browser (IndexedDB), the same as locally. Nothing is stored on the server.
- `data/` is never served online and is not uploaded to GitHub (see `.gitignore`).
- To change the passphrase or key: Secret Manager → add a new version, then redeploy (Cloud Run → Edit & deploy new revision).
- **Request timeout:** a Claude update with web search can take several minutes per squad. Cloud Run cuts requests at 300 seconds by default, which the studio reports as *"The server stopped waiting for Claude (timeout 504)"*. Raise it to 900 seconds: Cloud Run → the service → Edit & deploy new revision → Request timeout, or `gcloud run services update <service> --region me-central1 --timeout=900`.

## Third-party files

- `assets/player/`: the Kit designer's 3D player, *Sports_Male_02* from the [Microsoft Rocketbox avatar library](https://github.com/microsoft/Microsoft-Rocketbox) (MIT, Copyright (c) 2020 Microsoft); textures resized, kit areas repainted in the app.
- `vendor/three/`: [three.js](https://threejs.org) 0.187 and its FBX loader (MIT), loaded only when the Kit designer opens.
- `vendor/tesseract/`: [Tesseract.js](https://github.com/naptha/tesseract.js) 5.1.1, its core and the English data (Apache 2.0), loaded only when a kit sheet's printed settings are read (collar and colour setup); it runs in the browser.
