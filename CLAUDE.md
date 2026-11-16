# Working on this repository

- Commit and push straight to `main`. Don't create feature branches or pull requests for this project.
- Every push to `main` rebuilds and redeploys the site (Cloud Build → Cloud Run), so run the checks before pushing:
  `python3 -m py_compile server.py efootball.py logos.py cloud.py transfermarkt.py thesportsdb.py wikidata.py optionfile.py names.py ghlogos.py`, and a syntax check of the script in `index.html`.
- The option file is the benchmark (README, "Option-file packages"): exports must reproduce its file set, folder for folder and name for name. First install = the complete set; Changes only = just the files that differ from the last install. Never copy package images into browser storage or baselines; refer to them (`o:<package>|<path>`).
- Never commit option files or anything in `data/` (they are gitignored; packages live in the bucket or `data/optionfiles/`).
