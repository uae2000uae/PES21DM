# Working on this repository

- Commit and push straight to `main`. Don't create feature branches or pull requests for this project.
- Every push to `main` rebuilds and redeploys the site (Cloud Build → Cloud Run), so run the checks before pushing:
  `python3 -m py_compile server.py efootball.py logos.py cloud.py transfermarkt.py thesportsdb.py wikidata.py optionfile.py names.py ghlogos.py`, and a syntax check of the script in `index.html`.
- The option file is the benchmark (README, "Option-file packages"): exports must reproduce its file set, folder for folder and name for name. First install = the complete set; Changes only = just the files that differ from the last install. Never copy package images into browser storage or baselines; refer to them (`o:<package>|<path>`).
- The game accepts any file name for any file type. Files are tied together only by the names inside team (.ted) and competition (.ced) files. Never decide what a file is from its own name or folder when a game file names it; name and folder guesses are a fallback for loose images only.
- Once an option file is loaded, it is what the game has: answer "which team/competition is this in the game" from it (`inGameTeam` / `inGameComp`), never from PES's default teams.
- The full rule book is the `pes21-rules` skill (`.claude/skills/pes21-rules/SKILL.md`). Read it before changing the app, and add to it whenever the user states a new general rule.
- Never commit option files or anything in `data/` (they are gitignored; packages live in the bucket or `data/optionfiles/`).
