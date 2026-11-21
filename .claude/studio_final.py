"""Starts the studio for the final local test (launch entry "studio-final", port 8093).

Its own backup and export folders, and the Claude key the live site uses: read from Secret Manager into this process
only when the server starts, never written to disk (the project folder is synced to OneDrive)."""
import os
import runpy
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))  # server.py imports its sibling modules
os.environ["LOCAL_BACKUP_DIR"] = r"D:/PES21-local-test/final-backup"
os.environ["LOCAL_EXPORT_DIR"] = r"D:/PES21-local-test/final-exports"

if not os.environ.get("ANTHROPIC_API_KEY"):
    try:
        r = subprocess.run(
            "gcloud secrets versions access latest --secret=claude-api-001 --project=pes21-data-manager",
            shell=True, capture_output=True, text=True, timeout=60)
        key = r.stdout.strip()
        if r.returncode == 0 and key:
            os.environ["ANTHROPIC_API_KEY"] = key
            print("Claude key: read from Secret Manager (kept in memory only)")
        else:
            print("Claude key: could not be read from Secret Manager (%s)" % (r.stderr.strip().splitlines() or ["no output"])[-1])
    except Exception as e:  # no gcloud, no network: the studio still starts, with the free sources only
        print("Claude key: could not be read from Secret Manager (%s)" % e)

runpy.run_path(str(ROOT / "server.py"), run_name="__main__")
