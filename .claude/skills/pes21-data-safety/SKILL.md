---
name: pes21-data-safety
description: Keeps the PES 2021 Option Studio's database unbreakable - teams, competitions, players, team files, images, codes and the code book, snapshots, history, Process and Review, the local backup and the cloud copy. Use it before writing or changing any code that saves, imports, builds from an option file, updates (Live Update, Claude, free sources), merges, moves, renumbers, deletes or restores records, or touches settings.codeBook, ofInstalled or the baseline; when the user reports lost, duplicated or wrongly linked data; and to verify a project with the bundled backup check, before and after a risky command.
---

# Keeping the studio's database whole

The user's project is months of hand-checked squads, codes and images. Losing or crossing a link (a team on another
team's code, a kit pointing at a deleted image, a player in two squads under one ID) ends up in the game, where it is
slow to find and slow to fix. So every change to data code is held to the same few guarantees, and verified on a real
backup, not assumed.

Read `docs/DATABASE_RULES.md` before changing storage, import, export, update or delete code (CLAUDE.md asks for it), and
keep it in step with what you change. This skill is the working checklist; that file is the reference.

## The guarantees

1. **One record per thing, linked by studio id.** Teams, competitions, images, team files and settings are records of
   their own; players, the manager, stadium and kits live inside the team. Links use ids (`compId`, `sameAsId`,
   `c.teams`, image ids), never names. A save writes only the records it touched.
2. **Every team and competition has exactly one game file**, and every code at most one holder. A code moves only through
   `codeAssign` (Game codes): the old holder gets `noCode`, the code book records what the game has there.
3. **Nothing ever gets a made-up ID** (rule book, top). No ID 0. A record without a real code stays without one and is left
   out of game files until it gets one.
4. **Deleting removes every link.** `dropTeam` (team file, cup lists, history), `unlinkImages` (every image field of every
   team and competition), codes to the code book. Package files are never deleted, only the reference.
5. **Package images are referred to, never copied** (`o:<package>|<path>`). Only images the user adds or the studio draws
   are stored (`l:` browser, `a:` cloud), and drawn ones are marked `generated` so a real one replaces them.
6. **Look-ups never write directly.** Free sources, Live Update and Claude results go to Process and Review
   (`batchFromData` → `finishBatch`); only coded fixes (numbers, duplicates, IDs, short names) apply on the spot.
7. **Updates only add or change what the source covers.** A team a season's data leaves out is kept exactly as it is.
   A missing-details fill writes only empty fields. A club and its national team keep separate records with one game ID,
   and nothing moves a player across that line.
8. **Everything can be undone.** Big operations (build, restore, merge, delete, apply all) call `takeSnapshot` first;
   edits are recorded in the change history (`histLabel` / `histLabelAsync` give the entry its name; `undoEntries`
   reverses it).
9. **The baseline moves only when the user confirms** the game imported an export (`ofApplyInstall`). Nothing else touches
   `settings.ofInstalled` or `settings.baseline`.
10. **On this computer the whole project is also on disk** (`localBackup`, about 3 minutes after a change). The browser's
    storage can vanish between sessions; the backup is the safety net, and an empty project is offered it first.

11. **A team file is written only through `TED.build`** (then `TED.encrypt`), on every path that creates, edits, imports or
    exports a team. It keeps the squad's three tables in step (player IDs, shirt numbers, squad order) with the 40 player
    records: places filled from 1 with no gaps (places 1-18 are the matchday squad; a gap there makes the game refuse the
    file), and every filled place listed in the squad order table, or the game shows it as an empty "---" row
    (DATABASE_RULES 6.7c; confirmed in the game 22 November 2026, West Bromwich Albion 21 → 26). Never copy a squad table
    from an old file, patch bytes after building, or write a team file another way.

## Before you change data code

Answer these for the change, in your head or in the reply:
- Which records does it write, and does it save only those?
- Which links point at what it changes or deletes, and does it update or clear every one? Search for the field name
  across `js/app-*.js`, not just the function you were sent to (rule book: look for the same mistake elsewhere).
- Can it run twice (double click, a job resumed after a reload) without making a second copy or a second code holder?
- Does a crash halfway leave the project consistent? Prefer computing the whole result first, then writing it; take the
  snapshot before the first write.
- Is it undoable, and does the undo entry say what it did in the user's words?
- If it reads a source: does the result go to Process and Review, and does a team the source leaves out stay untouched?
- Does it give anything an ID? It must come from the game, the option file, the code book or the user's choice.

## Verify on a real backup (the check script)

```bash
python -I .claude/skills/pes21-data-safety/scripts/check_backup.py <project-backup.zip> [--before <older backup.zip>]
```

It checks every link and limit the rules above define (team files, codes, image links and stored bytes, squads, numbers,
IDs, the one World Cup, cup lists, the baseline snapshot) and, with `--before`, lists what changed between two backups:
teams, competitions, players, images, team files, snapshots, history, the review queue, jobs and settings, with code
moves named. It only reads. Its headline counts rules and places ("1 rule broken, in 3 places"); report it that way.

Where the backups are on this computer: `D:\PES21-local-test\backup\project-backup.zip` (studio-test, port 8090) with the
one before it beside it (`project-backup.previous.zip`); the final-test project's in `D:\PES21-local-test\final-backup\`.

To prove a data change is safe:
1. In the local test studio, Settings → Backup on this computer → *Back up now*, and copy that ZIP aside (before).
2. Run the command you changed, on real data.
3. *Back up now* again (after), and run the check on *after* with `--before`.
4. The verdict must not get worse, and the change list must show only what the command was meant to change. Anything else
   it touched is a bug, even if it looks harmless.

A finding the script reports for a project the user hasn't touched usually comes from the option file (the duplicate
shirt numbers in some national teams of the 2026-27 file, for example). Say so, and point to the health check fix; don't
"repair" it silently in code.

## When data is already broken

- Don't write anything until you know what happened. Ask for (or take) a backup first.
- Find the cause in code, fix it there, then fix the data with the studio's own tools (health check fixes, restore a
  snapshot, Game codes), so the fix is undoable and visible. One-off scripts that edit the backup are a last resort and
  need the user's yes.
- Add the cause to `docs/DATABASE_RULES.md` under "Fixes made against these rules" with the date.

## Related

- Commands that change data follow the pes21-commands skill (confirm, snapshot, history, review, jobs).
- Exports are checked with the pes21-export-check skill.
- The rule book (`pes21-rules`) wins over this skill when they disagree; then fix this skill.
