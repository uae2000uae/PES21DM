---
name: pes21-ux
description: Makes the PES 2021 Option Studio easy to use - plain wording, a clear answer and next step on every page, quick actions reachable in one or two clicks or from quick find (Ctrl+K), nothing offered that the game can't do, pages that remember how they were left, and the studio's look (tokens, 16 px ticks, one triangle). Use it whenever you add or change a page, panel, button, dialog, message, label, tooltip, menu entry or quick-find entry in index.html or js/app-*.js, when the user says something is hard to find, confusing, too many clicks, or "not user friendly", and when reviewing a screen of the studio.
---

# Easy to use: how the studio talks and where things are

The user works through hundreds of teams per season and checks the result in the game. They should always see, at a
glance: where they are, whether it is ready, what to do next, and how to get there fast. Every screen is judged by that,
not by how much it can do.

The rule book has the binding details (sections 8, 8a, 8b, 9, and "Edit only what the game lets change"); this skill is
how to apply them while building.

## 1. Answer first, then the work

- A page or check opens with a plain answer: *Ready*, *Almost ready*, *Not ready* (the health check's pattern), or a one-line
  status ("650 teams, 12 waiting in Process and Review"). Details come after, folded.
- One primary button per view, the thing most people came to do; everything else is secondary or under *More*.
- Problems are grouped by what is wrong, each with one line on why it matters to the game, then the fix button next to it.
  Severity in the studio's words: *Must fix*, *Should fix*, *Suggestion* (suggestions hidden until asked for).
- Every list that can run a fix for many at once has **Apply all suggested actions** beside its title: one confirmation
  that lists what runs, undoable afterwards.

## 2. Words

- The user's words, not the code's: "team code", "competition", "Process and Review", "change history", "baseline", "First
  install", "Changes only". Never "record", "blob", "ref", "batch", "null", "undefined", raw IDs without a name beside them.
- Buttons are verbs that say the result: *Give numbers*, *Use flag*, *Pull squad from eFootball*, *Make room*. Not *OK*,
  *Submit*, *Process*.
- Counts, not vague words: "3 teams have no goalkeeper", "Gave numbers to 12 players".
- Before: what will happen and whether it can be undone. After: what happened, what was skipped and why.
- Errors name the thing and the next step (pes21-commands, checklist 8 and 9).
- Say what a result still needs before the game has it. An ID given to a player or room made for players is only in
  the studio until the option file is exported and imported in PES 2021; the studio says so each time, in one sentence.
- No apologies or explanations for things the game can't do: those things simply aren't offered (next section).

## 3. Offer only what works in the game

The top rule of the rule book: what doesn't work in PES 2021 is not accepted. In the interface that means:
- No button, field or choice for it, rather than a warning beside it.
- What can't be changed shows a small tag with the reason ("can't be deleted: the game always keeps this team"), with the
  check in one place (`compLockWhy`, `teamDelBtn`, `compNameLock`, `compLogoLock`).
- Fields the game fixes are disabled, not hidden, so the user sees why (a licensed team's name).
- The way that does work is offered in its place (a team changes league by taking a free code of that league).

## 4. Reachability: quick actions in one or two clicks

- **Fix where the problem is shown.** A count, a warning or a red flag is itself a link or has its fix button beside it;
  the user never has to remember which page fixes it.
- **One click from the menu to every page; at most two to any common command.** The menu (`#rail`, `data-v` links) holds
  the pages; a command used every session (Back up now, Export Option File, Fix automatically, Process and Review's Apply
  all) is on the page the user is already on, or on the Overview.
- **Quick find (Ctrl+K, or "/" outside a field; `js/app-find.js`) reaches everything by name**: pages (read from the
  menu), competitions, teams, players, and what was opened lately. When you add a page, add it to the menu and quick find
  picks it up. When you add a command people will look for by name (an export, a backup, a whole-project fix), make it
  findable there too: add it to `QF_ACTIONS` in `js/app-find.js` (name, words to match, `sub` saying where it lives, the
  page it opens with `href`/`ui` and/or the `ACT` it runs; `when` hides it where it can't work, `none` gives the message
  when there is nothing to do). They show first, as the "Commands" group, so typing "backup" or "export" runs it. Keep quick find
  read-only apart from running those actions.
- **Hand-offs keep their list.** A button that opens another page for a set of items (*Fill N missing…*) opens it set to
  exactly those items, and says before running what it will cover (rule book: "A hand-off keeps the list it was opened
  with").
- **Rows open what they name.** In lists and the health check, the team's or competition's name opens it; no separate
  *Open* buttons.
- Keyboard: Enter confirms a dialog, Esc closes it, focus goes into the first field of a dialog.

## 5. Pages that stay where they were left

- Pages remember their tab, filters, find text, open team, scroll and collapsibles (rule book 8a). A new collapsible is a
  plain `<details>`; a new page-state value goes into `UI_KEEP`. Don't write per-page memory code.
- Every collapsible is closed by default and stays as the user leaves it; no page opens one by itself.
- A page never redraws itself in a loop, and never while a file window is open (rule book 8b).
- `?safe` in the address opens the Overview with nothing restored: keep it working.

## 6. Look

- Colours, spacing and type come from the `:root` tokens in `index.html`; no hard-coded colours.
- Tick boxes and option buttons are 16 x 16 everywhere and never shrink; don't size one in a page's own style.
- One collapsing triangle everywhere, 10 x 10, the same in the menu, health check, trees and fold-outs.
- An empty image box for a PES default slot says "PES default", never "none" (`slotThumb`).

## 7. Check it like a user

After a change you can see in the browser:
1. Start the local test studio (`preview_start` `studio-test`, port 8090) and open the page.
2. Read it as someone who didn't build it: can you tell in five seconds whether it's ready and what to click? Is any word
   one the user wouldn't use?
3. Count the clicks from the Overview to the command you added, and try finding it with Ctrl+K.
4. Leave the page in some state, go elsewhere and come back: is it as you left it?
5. Narrow the window: nothing overlaps, ticks keep their size.
6. Take a screenshot to show the user.
