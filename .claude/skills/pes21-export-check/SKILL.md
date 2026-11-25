---
name: pes21-export-check
description: Checks that what the PES 2021 Option Studio writes will import into the game - an export ZIP or folder, a First install or Changes only set, a game-test package, or an option file the user uploads - by reading every .ted/.ced the way PES does (by content and by the image names inside them) with a bundled script, and comparing with the baseline by team code, competition code and image name. Use it whenever an export, the USB file set, team or competition files, image links, squad tables or "will the game take this" come up; after changing any export, team-file, competition-file or image-naming code; before the user copies files to the USB drive or runs a game test; and when the user says an import failed, a team shows "---" rows, a crest is missing in the game, or asks to compare a new option file with the old one.
---

# Will the game import it? (PES 2021 export check)

The option file is the benchmark (README, "Option-file packages"): whatever the studio writes must import into PES 2021
exactly as the user meant, with every team, competition and picture linked. The game links files only by the names inside
team (.ted) and competition (.ced) files, and refuses or silently mangles anything outside its limits. This skill checks an
output the same way the game reads it, so problems are found on the computer, not on the console after a 20-minute import.

The detailed rules live in two places; this skill does not repeat them:
- `.claude/skills/pes21-rules/SKILL.md` section 4 (game limits and formats) and the top rule.
- `docs/DATABASE_RULES.md` sections 5a, 5b and 6 (what is read, names by code, the export layout).

## Run the check

```bash
python -I .claude/skills/pes21-export-check/scripts/check_export.py <export.zip|folder> [--baseline <zip|folder>] [--json out.json]
```

- Always pass `--baseline` with the option file or the last confirmed export the game has (on this computer the baseline is
  in `D:\PES21-local-test\optionfiles\`; the coded one is `WEPES coded.zip`). Without it the script cannot know which images
  and team codes the game already has, so it reports those as notes instead of problems.
- It reads a 2 GB option file in about two seconds (it only opens team files, competition files and PNG headers).
- Exit code 0 = nothing must be fixed, 1 = something must, 2 = the input couldn't be read.
- It reads the game's team codes from `assets/pes21-teams.json` and the competition code/slot pairs from `COMP_SLOT` in
  `js/app-game-files.js`, so it stays in step with the studio. If it says a list wasn't found, pass `--repo <studio folder>`.

## What it checks, and what each level means

| Level | Means | Examples |
|---|---|---|
| **Must fix** | The game refuses the file, or shows something wrong | damaged header or checksum; two files for one team or competition code; a team code the game doesn't have; a competition code with the wrong slot; a filled squad place missing from the order table ("---" rows); a gap in places 1-18; shirt numbers out of 1-99 or repeated; one player ID twice; no goalkeeper |
| **Should fix** | It imports, but changes what the user sees in the game, or wastes image space | a player ID that belongs to a team outside the export, given to a different player (that team loses him on import); an image a file names that neither the package nor the baseline has; two different pictures under one name; an image no file names; not a PNG; empty folders; a squad under 15; a place with no player record |
| **Good to know** | A studio convention, or something only a baseline settles | file not named `<code>.ted` / `<code>.ced`; image not named `E/K/M/S/P/C` + 4 digits; image at another size than the studio writes |

The script never decides what a file is from its name or folder: a file is a team file because it is 14,820 bytes with
header type 0x18, and an image is a crest because a team file names it at the crest offset. Keep it that way if you
change the script (CLAUDE.md: never decide what a file is from its own name or folder).

## How to report the result to the user

The user wants a plain answer first, then what to do. Lead with the verdict line the script prints (READY; IMPORTS, BUT
LOOK FIRST; NOT READY). **Never open with "ready" when there is anything under Should fix**: say first what the import
will do that the user may not expect (which teams lose players and how many they are left with, how many new image names
need free space in the game), and only then that the files themselves import. An import the game accepts can still leave
Blackburn with 11 players. Then for each Must fix group: what is wrong, which teams, and the fix in the studio (the page and button),
not byte offsets. Mention Should fix groups briefly; mention notes only if asked or if they explain something the user saw.

Where a problem comes from the option file itself (it is also in the baseline when you run the baseline on its own), say
so: the studio didn't cause it, but an export copies it to the game unchanged unless the team is fixed. Run the script on
the baseline alone to tell the two apart.

Map findings to studio fixes:
- Two files for one code: Health check, *Two files for one team code*, pick the file to use.
- Team code the game doesn't have: Game codes, give the team a free code of its league.
- Competition code/slot: Game codes; the file must be rebuilt through `CED.build` (`cedSetCode` writes the pair).
- Order table, gaps, numbers, duplicate IDs, no goalkeeper: open the team, or Health check, *Squads that will show "---"*,
  *Give numbers*, *Fix automatically*; `TED.build` rewrites the order table on every build.
- Missing image: tick it in the export, or clear the name in Health check (*Images the team files name but the option
  file doesn't include*).
- Player ID given to a different player: if the losing team is being given up, say so and move on; otherwise the new
  players need other free IDs (Health check → *Allocate free IDs*, Game codes → Players), or the losing team's own file
  goes into the same export.
- New image names: the script prints how many per type. Each needs a free space in the game's image store for that type
  (rule book section 8, image space); point the user to the *Image space in the game* table on the export card, and say
  so plainly when the last counted free space is smaller than the number.

The script can't see what only the game shows: whether a new player on another player's ID keeps that player's face,
or whether a kit shows in a slot the option file left to the game. Where a finding touches an open question in
`docs/GAME_TESTS.md`, name the question, and suggest importing one team first.

## When you changed export or game-file code

1. Run `python check.py`.
2. Make a real export from the local test studio (`studio-test`, port 8090, *Save on this computer*; exports land in
   `D:\PES21-local-test\exports`) of both kinds: *First install* and *Changes only*.
3. Run the check on each with `--baseline`. A First install of an untouched project must show no team, competition or
   image as changed (rule book: "an untouched project exports the option file exactly").
4. Run it on the baseline alone too and compare: your export must not add a Must fix that the baseline doesn't have.
5. Only then tell the user it's ready for the USB drive, and remind them that the baseline moves only when they press
   *PES imported it: make it the baseline* after the game import.

If something the script calls fine fails in the game, or the other way round, that is a question for
`docs/GAME_TESTS.md` (see the pes21-game-test skill) and the script should follow the answer.

## Comparing a new option file with the old one

`check_export.py new.zip --baseline old.zip` lists, by team code and competition code, what is new and changed, and
images by name, along with the new file's own problems. For deeper per-player diffs the user's own `snapshot.py` / `compare.py` are in `D:\PES21-local-test\baseline-compare\`.
