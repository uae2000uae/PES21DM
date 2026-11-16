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

Use Settings → Download project backup regularly. Clearing the browser's site data deletes the project.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole studio (interface, game-file engine, import and export) |
| `js/platform.js` | Standalone layer: browser storage, downloads, and Claude requests through the server |
| `js/pes-templates.js` | Built-in PES 2021 game files (Manchester United, Qatar, Sharjah team files; Premier League, FIFA World Cup competition files) used as templates |
| `vendor/jszip.min.js` | JSZip 3.10.1 (ZIP files) |
| `vendor/xlsx.full.min.js` | SheetJS 0.18.5 (Excel files) |
| `efootball.py` | Reads the eFootball database on PES Master (teams, current squads, player records) for the eFootball commands |
| `assets/efootball-teams.json` | eFootball's team list (ID, name, league) used to find a club's eFootball team |
| `logos.py` | Finds and downloads club crests and competition logos from FootyLogos |
| `cloud.py` | Google sign-in, Firestore and Cloud Storage for the online version |
| `baseline/pes21-baseline.zip` | The public baseline dataset (469 teams, 23 competitions, 311 images) |
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
| `CLAUDE_PASSPHRASE` | (empty) | If set, the Claude buttons ask visitors for this passphrase (once per browser) |
| `CLAUDE_DAILY_LIMIT` | 0 | Most Claude requests per visitor per day; 0 = no limit |

Fonts load from Google Fonts when online. Offline, the page uses system fonts.

## Season and up-to-date data

- Claude is asked about the season in Settings (*Season label*). The label moves to the new season automatically every 1 September (2026/27 runs from 1 September 2026 to 31 August 2027), and new projects start on the current season. A label you set by hand, for example to build an older season, stays until the next 1 September; when it is behind, the Overview and Claude update pages offer **Switch to …**.
- With **Claude web search** on (Settings, on by default online), Claude checks official club and league sites, Transfermarkt, Wikipedia and recent news before answering, so summer transfers and new managers are included. Web search costs $10 per 1,000 searches on your Anthropic bill, plus the tokens for what it reads; each request makes at most `CLAUDE_WEB_MAX_USES` searches.

## Game files for the USB drive (.ted / .ced)

Export to USB writes real PES 2021 files next to the images they use, so the game links them on import:
- **Team files (.ted)** for *Import Team*: name, short name, stadium, squad, numbers and ratings. The emblem (`E_…png`) and manager photo (`M_…png`) are named inside the file and sit in the same folder.
- **Competition files (.ced)** for *Import Competition*: name and emblem (`C_…png`), linked the same way.

Where each file comes from, in order:
1. A file you imported (Import files page): exported from the game with Edit → Data Management → Import/Export → Export Team / Export Competition. Best results.
2. A built-in file from `js/pes-templates.js`, when the team or competition matches it by name or in-game ID.
3. The generic template, when you enter the in-game team or competition ID (Team → Details, or the competition form). Experimental: kit colours, coach and tactics come from the template.

The public baseline already carries a game file for every team: its real PES 2021 team ID (from PES Master), or, for a club the game doesn't have, a free in-game slot it replaces (the game's fictional clubs first, then teams from leagues the project doesn't use; the team's *Replaces in-game team* field names it). Image files are renamed to serials from that ID (`E_000101.png`, `M_000101.png`). Competitions carry their game file where the ID is known (Premier League 17, FIFA World Cup 34); the rest have serial emblem names (`C_X01.png` …) until their .ced is imported. A team with no squad in the studio gets a team-info file (name starts with `I`), imported with *Apply player and squad data* off so the game keeps its own squad.

Players the game doesn't have are created as new edit players (their appearance is copied from a template player). A team with no players in the studio keeps the game's squad.

Before you download, the **connection check** reads every file back (checksum, size, name, team/competition ID) and confirms that each image a file names is in the package, in the same folder, at the size PES expects. It blocks the export on problems, for example an unticked emblem or two files for the same in-game team. **Write to USB drive** (Chrome or Edge on a computer) writes the files straight to the drive's `WEPES` folder and reads them back.

## eFootball database (current squads and ratings)

eFootball is Konami's current game, and its team, player and country IDs are the ones PES 2021 uses. The studio reads it from [PES Master](https://www.pesmaster.com) through this site's server (`efootball.py`, `/api/efootball/*`), so squads come with this season's players, ratings, skills, playing styles, shirt numbers and real game IDs, at no cost.
- **Claude update → eFootball database:** pull squads for teams without players, squads under 15, a competition or every team. *Look in the eFootball database first* (on by default) makes every Claude squad update try eFootball first; Claude then only adds what eFootball doesn't have (manager, kits), or takes over for teams eFootball doesn't include. Claude's web search is also told to check PES Master's eFootball pages first.
- **Teams → squad → Pull squad from eFootball**, and **Players → select → Refresh from eFootball** (by game ID, or by name in the team's eFootball squad).
- **Health check** warns about teams without squads, squads under 15 players, players with missing data, missing, shared or mismatched game IDs, automatically assigned in-game slots and players without a game ID, each with fix buttons (Pull from eFootball, Fill from eFootball, Claude update or fill, Give numbers, Use the file's ID, Set ID, Import its .ted).
- `assets/efootball-teams.json` lists eFootball's teams (778); *Refresh team list* re-reads PES Master's league pages (on your computer, or online when signed in). `EFOOTBALL_DAILY_LIMIT` (default 20000) caps PES Master pages per visitor per day.
- Everything goes to Review changes first. Ratings are eFootball's base (level 1) values, which use the PES 2021 scale; *Ball Winning* is the average of eFootball's *Tackling* and *Defensive Engagement*.

## Other data sources

All are read by this site's server (the browser can't fetch other sites), cached, and everything they return goes to Review changes first.

| Source | Module / routes | What it fills | Notes |
|---|---|---|---|
| eFootball on PES Master | `efootball.py`, `/api/efootball/*` | Squads, ratings, game IDs (see above); team crests (128 px), league logos, coach names with photos | Coaches without a photo are skipped: eFootball invents names for unlicensed coaches |
| Open Transfermarkt dataset ([transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets)) | `transfermarkt.py`, `/api/tm/*` | Squads for clubs eFootball doesn't have (Bundesliga, Saudi Pro League, Austria, Greece, Croatia, Serbia, Scandinavia …), coaches, stadiums | About 800 clubs; no shirt numbers or abilities, so abilities are estimated from market value and age and numbers are handed out like *Renumber* |
| TheSportsDB | `thesportsdb.py`, `/api/tsdb/*` | 512-pixel club badges and stadiums, including clubs others miss (UAE leagues, Cyprus, Kazakhstan …) | Free test key by default; `THESPORTSDB_KEY` in `.env` for your own |
| Wikidata and Wikimedia Commons | `wikidata.py`, `/api/wd/*` | Head coach, home stadium, freely licensed logos | Last resort; the query service limits requests at busy times, and a job then stops asking it |

Order of use:
- **Squads** (Claude update with *eFootball first*, *Pull squads from eFootball*, Health check fixes): eFootball, then Transfermarkt, then Claude.
- **Crests, coaches & league logos:** TheSportsDB (badge, stadium), eFootball (crest if still missing, coach with photo, league logo), then Wikidata. National teams keep their flags.
- **Coaches & stadiums (Transfermarkt):** for clubs still missing them.
- Reserve and youth sides (B, II, U21 …) are never matched to a first team, so a first team's squad can't move to its reserves.

Not built in: football-data.org needs a personal key even on its free tier and covers only the main European leagues, which eFootball and Transfermarkt already have. Kit textures (2048×2048 in the PES strip layout) come from community PS4 option files; add their PNGs on the Import files page (unzip RAR files first).

## National team flags

National teams use their country's flag as emblem, not a federation crest. The flags ship with the site in `assets/flags` (254 SVGs from [flag-icons](https://github.com/lipis/flag-icons), MIT licence, with England, Scotland, Wales and Northern Ireland), so they never depend on another website; `assets/flags/index.json` maps country names, including football names such as *Korea Republic*, *IR Iran*, *Türkiye* and *Congo DR*, to flags. Wherever the studio fetches a crest (Logos & kits, Claude updates with *Club crest*, new national teams), a national team gets its flag, rendered as a 256×256 PNG with the flag's own 4:3 shape. Health check lists national teams without their flag, with *Use flag* and *Use flags for all national teams*; results go to Review changes.

## Logos from FootyLogos

Club crests and competition logos come from [FootyLogos](https://www.footylogos.com) (latest official logos, 1500 px PNG and SVG).
- **Logos & kits → Fetch missing logos / Update all logos** looks up every team and competition. **Claude update → "Club crest (latest logo from FootyLogos)"** (on by default) adds the crest to each team update, and building a competition with Claude also fetches its logo.
- The server (`logos.py`) finds each logo by the club's FootyLogos slug (e.g. `al-ain`, `real-madrid`, `premier-league-england`), trying likely slugs from the name and, when none match, slugs Claude suggests. It then passes the file to the browser, which can't download from other sites itself. New logos always go to Review changes first.
- Crest links in update files from the claude.ai commands (FootyLogos, GitHub, Wikimedia) are fetched the same way.

## Option-file packages: the benchmark (the rule for how the studio works)

A real PES 2021 option file (for example *PES 2021 Option File 2026-2027*) is the benchmark for everything the studio writes. The studio builds its project from the option file and exports **the same file set, in the same structure, with the same names**.

**How an option file is built** (2026-27: 3,742 entries, 3.2 GB unzipped; 715 team files, 57 competition files, 2,125 images):
- `USB 1/WEPES/1 … 7/<NN. League>/Teds…/*.ted` – one team file per club (14,820 bytes), and `…/Images/<Club>/*.png` – that club's crest, kits, manager photo, stadium and sponsor images.
- `USB 1/WEPES/1/00. Competitions/*.ced` (852 bytes each) and its `Logos/`.
- `USB 2/WEPES/…` and `USB 3/WEPES/…` – add-on parts (Liga MX and others) in their own folder layout; `CREDITOS.txt`, help images and league order at the root.
- PES links images by **file name**: each .ted holds the names of its crest (offset 503), stadium (536), sponsors (569/602/635), manager photo (723) and five kits (1766 + 132·k: 1st, 2nd, GK 1st, 3rd, GK 2nd); each .ced its emblem (804). *Import Team* with "Overwrite image files of the same name" then picks up the PNGs.
- The option file uses its own team slots (Arsenal 2517, Man Utd 4077, Bayern 4938 …); the studio adopts them.

**The rule**
1. The option file is the main baseline: *Option file → Build project from package* reads every .ted/.ced, matches the project's teams (same slot and name first, then name within the same country), takes the option file's data first and keeps the project's own data only to fill gaps. Teams the option file lacks stay, under their own slots.
2. Images are never copied: the project points at the package's own PNGs (`o:<package>|<path>`), so nothing is duplicated in browser storage or the baseline.
3. **First install** writes the complete file set – every file of the package at its own path, team files of edited teams rebuilt from their originals (their image names kept), edited images written over the original file names, competition files rebuilt – plus, if ticked, the project's extra teams in the same pattern under `USB 1/WEPES/8/<NN>. <Competition>/Teds|Images/<Team>/`.
4. **Changes only** writes just the files that differ from what was last installed (team files, competition files and images), with `CHANGES.txt` listing them. Copy them over the installed folders.
5. Both are written as one ZIP streamed to disk (or straight into a folder you pick), so a 3 GB set never sits in memory. Use Chrome or Edge.

**Every team and competition has its game file.** No team or competition exists in the studio without its own stored file: a .ted (team) or .ced (competition), linked to its images by file name. Imported and option-file files are kept; the rest are generated (once for an existing project, with a snapshot first, then on every save): a team keeps its in-game ID or takes a free PES 2021 slot from `assets/pes21-teams.json` (PES Master's PES 2021 lists: fictional clubs first, then leagues the project doesn't use, never a slot already in use); a competition keeps its ID or takes a built-in file's ID by name, else a random unused competition number (the game's small range; the option file's run 1–165). Nothing has ID 0: a team without a free slot gets a random unused number in PES 2021's team range, and a player without a game ID gets a random unused edit-player ID (bit 30 set, as the game gives created players), stored on the player and written into his team file. A cup copy of a club shares its league copy's team ID and player IDs and has no file of its own. The studio also makes the images the files name: a team or competition without a crest or logo gets one drawn from its colours and short name (national teams: their flag), stored and marked generated so a real image found later replaces it; a kit without an image is drawn at export in PES 2021's kit layout (2048 px) from its colours and pattern, with the crest and sponsor, and named in the team file. Manager photos aren't generated; the game keeps its own. Image names follow the in-game ID (`E_/M_/K_<id>`, `C_<id>`). A cup copy of a club uses its league copy's file. Red flags after that are for the user to fix, ignore or leave out.

**Where packages live**: online, in the site bucket (upload with the Cloud Storage console or `gcloud storage cp`, then *Register* its path, e.g. `public/PES21 Option File 26-27.zip`, while signed in); on this computer, drop the ZIP into `data/optionfiles/` (or upload it on the page). The server reads only the ZIP's directory and single files from it (byte ranges online). Packages and a project built from one are for signed-in accounts only: setting a baseline then publishes `group/pes21-baseline.zip`, served only to signed-in accounts, instead of the public baseline.

## Saving to Google Cloud and the public baseline

- **Signed in (owner):** click *Sign in with Google* at the bottom of the left menu. Only the accounts in `ALLOWED_EMAILS` (Dockerfile) can sign in. Your project is then saved privately in Google Cloud and is the same on every device: records in Firestore (`users/<your Google id>/...`), images and files in the bucket `pes21-data-manager-studio`. The Claude buttons don't ask for the passphrase while you're signed in.
- **Not signed in (visitors):** the studio works as before and keeps the project in that browser only.
- **Public baseline:** `baseline/pes21-baseline.zip` is the dataset everyone can load (Settings → *Load baseline data*, or automatically when a project is empty). When you, signed in, set a new baseline (Compare & versions → *Set baseline* on a snapshot, *Take baseline*, or after an export), the studio publishes it as the new public baseline (stored at `gs://pes21-data-manager-studio/public/pes21-baseline.zip`; each earlier one is kept under `public/history/`). Only game data goes public: teams, players, competitions, images and team files. Your review queue, jobs and history stay private.
- Google sign-in settings: Google Auth Platform → Clients → *PES21 Studio website* (allowed origins: the run.app address and http://localhost:8080). While the app is in *Testing*, the account must also be listed under Audience → Test users.
- Locally (`python server.py`) cloud saving is off unless the server can reach Google Cloud credentials; the studio uses browser storage.

## Online (Google Cloud Run)

- Code: https://github.com/uae2000uae/PES21DM. Every push to `main` rebuilds and redeploys the site (Cloud Build trigger, project `pes21-data-manager`, region `me-central1`).
- The site is public. The Claude buttons ask for the passphrase stored as the `CLAUDE_PASSPHRASE` secret; `ANTHROPIC_API_KEY` is also a Secret Manager secret. Neither is ever in GitHub.
- Visitors' projects are kept in their own browser (IndexedDB), the same as locally. Nothing is stored on the server.
- `data/` is never served online and is not uploaded to GitHub (see `.gitignore`).
- To change the passphrase or key: Secret Manager → add a new version, then redeploy (Cloud Run → Edit & deploy new revision).
- **Request timeout:** a Claude update with web search can take several minutes per squad. Cloud Run cuts requests at 300 seconds by default, which the studio reports as *"The server stopped waiting for Claude (timeout 504)"*. Raise it to 900 seconds: Cloud Run → the service → Edit & deploy new revision → Request timeout, or `gcloud run services update <service> --region me-central1 --timeout=900`.
