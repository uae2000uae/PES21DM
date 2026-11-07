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
| `vendor/jszip.min.js` | JSZip 3.10.1 (ZIP files) |
| `vendor/xlsx.full.min.js` | SheetJS 0.18.5 (Excel files) |
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
| `CLAUDE_PASSPHRASE` | (empty) | If set, the Claude buttons ask visitors for this passphrase (once per browser) |
| `CLAUDE_DAILY_LIMIT` | 0 | Most Claude requests per visitor per day; 0 = no limit |

Fonts load from Google Fonts when online. Offline, the page uses system fonts.

## Online (Google Cloud Run)

- Code: https://github.com/uae2000uae/PES21DM. Every push to `main` rebuilds and redeploys the site (Cloud Build trigger, project `pes21-data-manager`, region `me-central1`).
- The site is public. The Claude buttons ask for the passphrase stored as the `CLAUDE_PASSPHRASE` secret; `ANTHROPIC_API_KEY` is also a Secret Manager secret. Neither is ever in GitHub.
- Visitors' projects are kept in their own browser (IndexedDB), the same as locally. Nothing is stored on the server.
- `data/` is never served online and is not uploaded to GitHub (see `.gitignore`).
- To change the passphrase or key: Secret Manager → add a new version, then redeploy (Cloud Run → Edit & deploy new revision).
