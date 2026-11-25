---
name: pes21-modules
description: Where code belongs in the PES 2021 Option Studio and how its modules stay separate - the js/app-*.js parts loaded in order into one global scope, platform.js, pes-templates.js, server.py and its Python source modules (efootball, transfermarkt, wikipedia, fcratings, fifa, logos, thesportsdb, wikidata, optionfile, cloud), and check.py. Use it before adding a function, page, command, job type, data source, server route or new file; when a file grows too big or mixes concerns; when the user asks to split, separate, reorganize or clean up modules; and when a script fails to load, a name is "already declared", or code runs before what it needs exists.
---

# Separate modules: where code goes

The studio is one program split into parts. The split only helps if each part keeps to its job: then a change to the
export touches the export's file, a bug in a data source stays in that source, and two sessions can work on two parts
without colliding. Mixing concerns back together is how a fix in one place breaks another.

## How the browser side works (the constraints)

- `index.html` loads `vendor/*`, `js/platform.js`, `js/pes-templates.js`, then the `js/app-*.js` parts **in order**, with
  `js/app-boot.js` last. They share **one global scope**: there are no imports.
- Code that runs **while a file loads** (`const x = f()`, a wrapper block, an `ACT.x = ACT.x || …` that reads the old one)
  can only use its own file and earlier ones. Code called later (actions, page renders) can use everything.
- A later part may **wrap** an earlier function (`{const _p = TED.parse; TED.parse = raw => {…_p(raw)…}}`). Wrapping is
  part of the program: moving a file changes what wraps what.
- A top-level `const`, `let` or `class` declared in two files stops the second file loading. `check.py` catches it.
- Nothing draws before every file has loaded (`APP_READY`, set by boot). The server sends these files `no-cache`.

## The map

| File | Holds | Put here |
|---|---|---|
| `js/platform.js` | Browser storage, downloads, Claude requests through the server | Only platform plumbing; no studio rules |
| `js/pes-templates.js` | Built-in game files used as templates | Data only |
| `app-core.js` | Constants, utilities, storage, state, model, router, snapshots, the click dispatcher, `ask`, `toast`, page memory | Shared helpers every part needs; nothing page-specific |
| `app-pages.js` | Overview, Competitions, Teams, Players, image library, emblem maker, kit designer | Those pages' rendering and their own actions |
| `app-claude.js` | Claude requests, progress, Process and Review, Compare | Anything that asks Claude or builds a review batch |
| `app-export-import.js` | Project, spreadsheet and image-pack import/export; per-tab updates | Non-option-file transfer formats |
| `app-team-files.js` | `.ted` format (`TED`), history and undo, rating calibration, export with team files | Team-file reading/writing, the change history |
| `app-health.js` | Health check and its layout, pool leagues, cup participants | Health checks (the issues); fixes that look things up go to `app-sources-fixes.js` |
| `app-jobs.js` | The job queue (`queueAdd`, `JOB_RUN`, `runJob`), mass editing, project move and local backup | New job types register here (`JOB_RUN.type = …`) |
| `app-game-files.js` | FootyLogos, missing emblems, World Cup, `GF`/`CED`, player codes, name-fixed teams | Game file formats and code rules |
| `app-free-sources.js` | eFootball, Transfermarkt, Wikipedia, team pulls, squad checks, flags | Talking to free sources (through the server) |
| `app-option-file.js` | Option-file packages, the export plan (`ofPlan`), writing the export | Everything about First install / Changes only |
| `app-live-update.js` | Live Update, the source buckets (Logos & kits), Import / Export pages | Those pages |
| `app-images.js` | Game files and images for every team and competition; stadiums, sponsors, managers | Image naming and generation |
| `app-sources-fixes.js` | EA SPORTS FC and FIFA, shared look-up helpers, the fixes the health check queues | Health-check fixes that use sources |
| `app-settings.js` | The Settings page, by who may change what | Settings only |
| `app-find.js` | Quick find (Ctrl+K) | Read-only search and its command list |
| `app-comp-add.js` | Adding a competition, the one way | That flow |
| `app-boot.js` | Overview trees, PES default images, Game codes, the boot sequence | Boot and Game codes; **keep it last** |

Each file's first line says what it holds; keep that line true when you change what a file holds (the rule book's
section 1 also counts the parts: update the count there and in the README "Files" table when you add one).

The server side: `server.py` serves the page and the `/api/*` routes and holds no studio rules; each outside source is its
own module (`efootball.py`, `transfermarkt.py`, `wikipedia.py`, `wikidata.py`, `fcratings.py`, `fifa.py`, `logos.py`,
`ghlogos.py`, `thesportsdb.py`), option-file packages are `optionfile.py`, Google Cloud is `cloud.py`. A new source is a new
module with its own cache and limits, and a thin route in `server.py` under `/api/<short name>/…`.

## Placing new code

1. Find the file whose first line covers it. If two could, put it with the data it changes, not the page that shows it.
2. Look for an existing helper before writing one (search the name and the field across `js/app-*.js`); a second
   version of the same logic is how rules drift apart.
3. A rule lives in one function, used everywhere (`compLockWhy`, `codeLeagueOk`, `logoWanted` are the pattern); pages call
   it, they don't re-implement it.
4. If the code must run at load time and needs something from a later file, either move it into a function called later
   (from boot or an action) or move it to the later file. Don't reorder files to fix one call.
5. A part over about 900 lines, or one whose first line needs "and" three times, is a candidate to split. Split by
   concern, keep the load order rule, add the new file to `index.html` before `app-boot.js`, give it the standard first
   two lines, and update the rule book section 1 and the README table.

## Splitting or moving code safely

- Move whole functions, unchanged, in one commit; change behaviour in another. A move commit that also edits logic can't
  be reviewed.
- After moving, search for every caller that runs at load time and check it still comes after the definition.
- Run `python check.py` (it compiles every Python file, syntax-checks every script with Node, checks `index.html` loads
  exactly the `js/app-*.js` on disk with `app-boot.js` last, and that no top-level name is declared in two files).
- Load the studio (`studio-test`, port 8090) and read the console: a load-order mistake shows as a `ReferenceError` at
  start-up, not in `check.py`. Open every page once.
