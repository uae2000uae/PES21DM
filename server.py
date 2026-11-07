"""PES 2021 Option Studio - local web server.

Serves this folder as the website root and forwards the studio's Claude requests
to the Anthropic API, so your API key stays on the server and never reaches the browser.

Run:  python server.py            (then open http://localhost:8080)
Needs only the Python standard library (Python 3.9+).

Settings come from environment variables or a .env file next to this script:
  ANTHROPIC_API_KEY   your key from https://console.anthropic.com (needed for Claude features)
  PORT                port to listen on (default 8080; Cloud Run sets this itself)
  HOST                address to bind (default 127.0.0.1, i.e. this computer only)
  CLAUDE_MODEL_COMPLEX / CLAUDE_MODEL_DEFAULT / CLAUDE_MODEL_QUICK   models per effort setting
  CLAUDE_MAX_TOKENS   longest reply in tokens (default 16000)
  CLAUDE_PASSPHRASE   if set, the Claude buttons only work for visitors who enter this passphrase
                      (set it whenever the site is public, so strangers can't spend your API credit)
  CLAUDE_DAILY_LIMIT  most Claude requests per visitor address per day (default 0 = no limit)
"""
import hmac
import json
import threading
import time
import mimetypes
import os
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load_env_file(path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file(ROOT / ".env")

API_URL = "https://api.anthropic.com/v1/messages"
MODELS = {
    "complex": os.environ.get("CLAUDE_MODEL_COMPLEX", "claude-opus-5-5"),
    "default": os.environ.get("CLAUDE_MODEL_DEFAULT", "claude-sonnet-5-5"),
    "quick": os.environ.get("CLAUDE_MODEL_QUICK", "claude-haiku-5-5"),
}
MAX_TOKENS = int(os.environ.get("CLAUDE_MAX_TOKENS", "16000"))
MAX_BODY = 2 * 1024 * 1024  # largest request the browser may send
PASSPHRASE = os.environ.get("CLAUDE_PASSPHRASE", "").strip()
DAILY_LIMIT = int(os.environ.get("CLAUDE_DAILY_LIMIT", "0") or 0)
HOSTED = bool(os.environ.get("K_SERVICE"))  # Cloud Run sets K_SERVICE

_usage = {}  # visitor address -> (day, count)
_usage_lock = threading.Lock()
_fails = {}  # visitor address -> (day, wrong passphrase count)


def _today():
    return time.strftime("%Y-%m-%d", time.gmtime())


def _bump(table, who, limit):
    """Count one more for this visitor today; False once the limit is passed."""
    day = _today()
    with _usage_lock:
        d, n = table.get(who, (day, 0))
        if d != day:
            n = 0
        if limit and n >= limit:
            return False
        table[who] = (day, n + 1)
        if len(table) > 50000:
            table.clear()
        return True

# only website files are served; the server's own files and secrets are not
PUBLIC_DIRS = {"vendor", "js", "assets"}
PUBLIC_FILES = {"index.html", "favicon.ico"}

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("image/svg+xml", ".svg")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s  %s\n" % (self.log_date_time_string(), fmt % args))

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        if self.path.split("?")[0] in ("/", "/index.html"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _client(self):
        # behind Cloud Run the visitor's address is the first X-Forwarded-For entry
        fwd = self.headers.get("X-Forwarded-For", "") if HOSTED else ""
        return fwd.split(",")[0].strip() or self.client_address[0]

    def _allowed(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        if path in ("/", ""):
            return True
        parts = [p for p in path.split("/") if p]
        if any(p.startswith(".") or p == ".." for p in parts):
            return False
        if len(parts) == 1:
            return parts[0] in PUBLIC_FILES
        if parts[0] == "data":
            # the data folder (project transfer files) is only served on this computer, never when hosted
            return not HOSTED and os.environ.get("HOST", "127.0.0.1") in ("127.0.0.1", "localhost")
        return parts[0] in PUBLIC_DIRS

    def do_GET(self):
        if self.path.split("?")[0] == "/api/health":
            return self._json(200, {"ok": True, "claude": bool(os.environ.get("ANTHROPIC_API_KEY")), "passphrase": bool(PASSPHRASE)})
        if not self._allowed():
            return self.send_error(404)
        return super().do_GET()

    def do_HEAD(self):
        if not self._allowed():
            return self.send_error(404)
        return super().do_HEAD()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/claude":
            return self.send_error(404)
        key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not key:
            return self._json(503, {"error": "Claude isn't set up on this site yet." if HOSTED else "No Anthropic API key yet. Put ANTHROPIC_API_KEY=... in the .env file and restart the server."})
        who = self._client()
        if PASSPHRASE:
            given = self.headers.get("X-Studio-Pass", "")
            if not hmac.compare_digest(given.encode("utf-8"), PASSPHRASE.encode("utf-8")):
                if given and not _bump(_fails, who, 20):
                    return self._json(429, {"error": "Too many wrong passphrases today. Try again tomorrow.", "code": "locked"})
                return self._json(401, {"error": "Wrong or missing Claude passphrase." if given else "Claude passphrase needed.", "code": "passphrase"})
        if DAILY_LIMIT and not _bump(_usage, who, DAILY_LIMIT):
            return self._json(429, {"error": "Daily Claude limit reached for this visitor. Try again tomorrow.", "code": "daily_limit"})
        try:
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0 or length > MAX_BODY:
                return self._json(413, {"error": "Request too large"})
            req = json.loads(self.rfile.read(length).decode("utf-8"))
            prompt = str(req.get("prompt", ""))
            tier = req.get("tier") if req.get("tier") in MODELS else "default"
        except Exception:
            return self._json(400, {"error": "Bad request"})
        if not prompt.strip():
            return self._json(400, {"error": "Empty prompt"})

        payload = json.dumps({
            "model": MODELS[tier],
            "max_tokens": MAX_TOKENS,
            "messages": [{"role": "user", "content": prompt}],
        }).encode("utf-8")
        upstream = urllib.request.Request(API_URL, data=payload, method="POST", headers={
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        })
        try:
            with urllib.request.urlopen(upstream, timeout=600) as r:
                data = json.loads(r.read().decode("utf-8"))
            text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
            return self._json(200, {"text": text, "model": data.get("model"), "stop_reason": data.get("stop_reason")})
        except urllib.error.HTTPError as e:
            try:
                msg = json.loads(e.read().decode("utf-8")).get("error", {}).get("message", "")
            except Exception:
                msg = ""
            status = e.code if e.code in (400, 401, 403, 404, 413, 429, 529) else 502
            return self._json(status, {"error": "Anthropic API error %s%s" % (e.code, ": " + msg if msg else "")})
        except Exception as e:
            return self._json(502, {"error": "Could not reach the Anthropic API: %s" % e})

    def _json(self, status, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


def main():
    host = os.environ.get("HOST", "0.0.0.0" if HOSTED else "127.0.0.1")
    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer((host, port), Handler)
    shown = "localhost" if host in ("127.0.0.1", "0.0.0.0") else host
    print("PES 2021 Option Studio running at http://%s:%d" % (shown, port))
    print("Claude features: %s" % ("on" if os.environ.get("ANTHROPIC_API_KEY") else "off (add ANTHROPIC_API_KEY to .env)"))
    print("Claude passphrase: %s" % ("required" if PASSPHRASE else "not set"))
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
