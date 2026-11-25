---
name: pes21-commands
description: How every command of the PES 2021 Option Studio must behave so it never fails, never half-finishes and never surprises - any button, menu item, health check fix, "Apply all", import or export step, Live Update or Claude run, or queued job (ACT.*, JOB_RUN, queueAdd, batchFromData/finishBatch, ask, takeSnapshot, histLabel). Use it whenever you add, change or debug a command or job in js/app-*.js, when the user says a button does nothing, hangs, runs twice, loses its work after a reload, or gives a vague error, and when a command needs a confirmation, progress, undo or a result message.
---

# Commands that never fail the user

A command is anything the user starts: a button, a fix in the health check, an *Apply all*, an import, an export, a
look-up. The user runs them on hundreds of teams at once and checks the result in the game later, so a command that
silently does nothing, does half, or does something else is worse than one that refuses. The studio already has the
plumbing for this; a new command uses it instead of rolling its own.

## The plumbing (use it, don't rebuild it)

| Need | Use | Where |
|---|---|---|
| A clickable command | `ACT.name = async (el, e) => {…}` and `data-act="name"` (plus `data-id`, etc.) on the element; `CH`/`IN` for change and input | dispatcher in `js/app-core.js` |
| Busy state, no double run, error message | already done by the dispatcher for async actions: busy class, repeat clicks ignored, one working action at a time, a thrown error becomes "Something went wrong: …" | `js/app-core.js` (`BUSY`, `EXCL`) |
| Ask first | `await ask(title, html, okLabel, danger)` → true/false; `askRisk` for settings with consequences | `js/app-core.js`, `js/app-settings.js` |
| Undo point before a big change | `await takeSnapshot(name, quiet)` | `js/app-core.js` |
| A named entry in the change history | `histLabel(label, src, fn)` / `await histLabelAsync(label, src, fn)` around the edits | `js/app-team-files.js` |
| A look-up's results | `finishBatch(batchFromData(data, {title, source, removeMissing:false, teamScope}))` → Process and Review | `js/app-claude.js` |
| Long or many-team work | `queueAdd([{type, …}])` and `JOB_RUN.type = async (job, signal) => …`; survives reloads, retries when busy, shows progress | `js/app-jobs.js` |
| Telling the user | `toast(message, 'ok' | 'err' | '')` | `js/app-core.js` |
| Redraw | `rerender()` (never in a loop: rule book 8b) | `js/app-core.js` |

## Every command, the checklist

1. **It exists only if it works in the game.** If PES 2021 ignores or refuses the result, there is no button for it at
   all (rule book, top rule). What can't be done shows a tag with the reason instead (`compLockWhy`, `teamDelBtn`).
2. **Say what will happen before it happens**, when it deletes, replaces, moves codes, touches many teams, or can't be
   undone: one `ask` that names the things and counts them ("Delete 3 teams and their 84 players? A snapshot is taken
   first."). A safe, undoable single edit needs no question.
3. **Snapshot first** for build, restore, merge, delete, *Apply all* and anything over many teams. Record edits under a
   history label in the user's words, so the change history reads like what they clicked.
4. **Compute, then write.** Work out the whole result (the plan, the list, the new codes) before the first save, so a
   failure halfway leaves nothing half-done. Write all records of one step together.
5. **Safe to run twice.** A second click, a job resumed after a reload, or *Apply all* after some were applied by hand must
   not add a second copy, a second code holder or a second player. Check the current state, not a flag from before.
6. **Look-ups go to Process and Review**; only coded fixes apply on the spot (`pes21-data-safety`, guarantee 6).
7. **Long work is a job.** Anything that fetches from a source, calls Claude or loops over many teams goes through
   `queueAdd` / `JOB_RUN`, shows progress, can be cancelled or paused, and picks up again after a reload. A job keeps the
   list it was given and re-checks each item when it runs (`logoJobTrim` is the pattern), so it never redoes the whole
   project because a list grew.
8. **Nothing fails silently.** Every way out ends in a message: what was done, with counts ("Gave numbers to 12 players
   in 3 teams"), what was skipped and why ("2 teams kept: the source has no squad for them"), or what went wrong and what
   to do next. An empty selection says so instead of doing nothing. One bad item never stops the rest; it is named at the
   end.
9. **Errors are the user's language.** Not "TypeError" or "404": what failed, which team, and the next step
   ("eFootball didn't answer for Al Ain. Try again later, or use Transfermarkt.").
10. **It is reachable.** A command the user needs often is one click from where they look at the problem, and on quick find
    (see the pes21-ux skill).

## A small example

```js
// Health check: give missing shirt numbers to every listed team, in one undoable step
ACT.hcNumbersAll = async el => {
  const list = hcTeamsMissingNumbers();                       // compute first
  if (!list.length) { toast('Every player already has a number', ''); return }
  const n = list.reduce((s, x) => s + x.missing, 0);
  if (!await ask('Give shirt numbers', `${n} players in ${list.length} teams get the lowest free number. You can undo it from the change history.`, 'Give numbers')) return;
  await histLabelAsync('Give shirt numbers (' + list.length + ' teams)', 'Health check', async () => {
    for (const x of list) { giveNumbers(x.team); await saveTeam(x.team) }   // idempotent: only empty numbers are filled
  });
  toast(`Gave numbers to ${n} players in ${list.length} teams`, 'ok'); rerender();
};
```

The names `hcTeamsMissingNumbers`, `giveNumbers` and `saveTeam` stand for whatever the real helpers are; find them
before writing (search `js/app-*.js`), and reuse rather than add a second version.

## Proving a command works

Syntax passing is not proof. Before saying a command is done:
1. `python check.py`.
2. Start the local test studio (`preview_start` with `studio-test`, port 8090; if the project is empty, restore the backup
   from Settings → Backup on this computer). Click the command in the browser pane on real data.
3. Check the result on the page (`read_page`), the console (`read_console_messages`, no errors), and the message it showed.
4. Click it again: nothing new may happen. Reload mid-job: it must carry on.
5. For data commands, run the backup check before and after (pes21-data-safety); for export commands, run the export check
   (pes21-export-check).
6. Undo it from the change history and check the data is back.

Report what you saw at each step; if a step couldn't be run (no Claude key on 8090, for example), say so.
