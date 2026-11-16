# Working on this repository

- Commit and push straight to `main`. Don't create feature branches or pull requests for this project.
- Every push to `main` rebuilds and redeploys the site (Cloud Build → Cloud Run), so run the checks before pushing:
  `python3 -m py_compile server.py efootball.py logos.py cloud.py`, and a syntax check of the script in `index.html`.
