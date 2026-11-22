# Working on this repository

- Commit and push straight to `main`. Don't create feature branches or pull requests for this project.
- Every push to `main` rebuilds and redeploys the site (Cloud Build → Cloud Run), so run the checks before pushing:
  `python check.py` (compiles every Python file, checks the syntax of every `js/app-*.js` with Node, and that `index.html` loads them all).
- The studio's code is `js/app-*.js`, loaded in order by `index.html` as one program in one global scope. Code that runs while a file loads can only use what its own file or an earlier one defines; `js/app-boot.js` stays last.
- The option file is the benchmark (README, "Option-file packages"): exports must reproduce its file set, folder for folder and name for name. First install = the complete set; Changes only = just the files that differ from the last install. Never copy package images into browser storage or baselines; refer to them (`o:<package>|<path>`).
- The game accepts any file name for any file type. Files are tied together only by the names inside team (.ted) and competition (.ced) files. Never decide what a file is from its own name or folder when a game file names it; name and folder guesses are a fallback for loose images only.
- Once an option file is loaded, it is what the game has: answer "which team/competition is this in the game" from it (`inGameTeam` / `inGameComp`), never from PES's default teams.
- The full rule book is the `pes21-rules` skill (`.claude/skills/pes21-rules/SKILL.md`). Read it before changing the app, and add to it whenever the user states a new general rule.
- How data is stored and linked (competitions, teams, players, managers, stadiums, sponsors, images) is in `docs/DATABASE_RULES.md`. Read it before changing storage, import, export, update or delete code, and keep it in step with the code.
- Questions about the game's behaviour that only a test in PES 2021 can answer are in `docs/GAME_TESTS.md`, with the steps and a Result line each. Add a question there whenever a rule rests on an assumption about the game, and move the answer into the rule book once tested.
- Never commit option files or anything in `data/` (they are gitignored; packages live in the bucket or `data/optionfiles/`).
