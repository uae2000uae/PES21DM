---
name: pes21-release
description: Finishing a change to the PES 2021 Option Studio and shipping it - the checks (check.py, the export and backup checks), testing in the local studio on port 8090, which docs to update (rule book, DATABASE_RULES, GAME_TESTS, README), what never to commit, the commit message style, and when to push to main (every push redeploys the live site on Cloud Run; during a testing round pushes wait for the user). Use it at the end of any change to this repo, before any commit or push, when the user says "commit", "push", "deploy", "ship it", "is it ready", or asks why the live site doesn't show a change.
---

# Finishing and shipping a change

Every push to `main` rebuilds and redeploys the public site (Cloud Build → Cloud Run). There is no staging copy online, so
what is pushed is what visitors and the user's own cloud project get within minutes. The steps below are the whole
gate.

## 1. Check

1. `python check.py` must say *all checks passed*. It compiles every Python file, syntax-checks every studio script with
   Node, checks `index.html` loads exactly the `js/app-*.js` on disk with `app-boot.js` last, and that no top-level name is
   declared in two scripts.
2. If you changed export, team-file, competition-file or image-naming code: run the pes21-export-check script on a real
   export of both kinds, with `--baseline`.
3. If you changed code that saves, imports, updates or deletes data: run the pes21-data-safety backup check before and
   after the command, with `--before`.

## 2. Test in the local studio

- `preview_start` with `studio-test` (port 8090, its own browser storage). If the project there is empty, restore it from
  Settings → Backup on this computer before anything else. `studio-final` (8093) is the clean final-test project and the
  only one with a Claude key.
- Click through what you changed on real data, read the console, take a screenshot of the result for the user.
- If a page won't draw, `http://localhost:8090/?safe#overview`.
- After stopping a preview server, wait about 20 seconds before starting it again, or the pane moves it to another port
  (another, empty project).
- Say plainly what you tested and what you couldn't (for example Claude look-ups on 8090, or anything only the game shows).

## 3. Keep the docs in step (same commit as the code)

| You changed | Update |
|---|---|
| A behaviour the user decided, or a new general rule | `.claude/skills/pes21-rules/SKILL.md` (rule, **Why** with the date, **Where**) |
| Storage, links, IDs, import, export, delete | `docs/DATABASE_RULES.md` |
| Something that rests on an untested assumption about the game | `docs/GAME_TESTS.md` (a new question; see pes21-game-test) |
| A setting, a file, a data source, how to run it | `README.md` |
| A module added, split or renamed | rule book section 1, README "Files" table (see pes21-modules) |
| How one of these skills should work | the skill itself |

## 4. Commit

- Straight to `main`, no branches or pull requests (CLAUDE.md).
- Never commit option files, anything in `data/`, `.env`, or the user's backups. Check `git status` before adding; add
  files by name rather than `git add -A` when the tree holds the user's own unfinished edits.
- Message style (see `git log`): one plain sentence on what the studio now does, in the user's words, naming the page or
  rule. For example "Export Option File: two sub-tabs, First install and Changes only". Then the attribution lines the
  session asks for.
- If the working tree already had the user's uncommitted changes when you started, don't fold them into your commit
  without asking.

## 5. Push (or hold)

- **During a testing round, commit locally and don't push** until the user says testing is finished; then ask whether to
  push. Outside a testing round, push after the checks pass, unless the user said to hold.
- Before pushing, say what will go live in one line. After pushing, the build takes a few minutes; the live site shows the
  change once Cloud Run serves the new revision.
- A Claude update with web search can run past Cloud Run's request timeout; if users see "The server stopped waiting for
  Claude (timeout 504)", the fix is the service's timeout (README, "Online"), not the code.
