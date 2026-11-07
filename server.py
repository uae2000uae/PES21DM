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
  Cloud saving with Google sign-in: GOOGLE_CLIENT_ID, ALLOWED_EMAILS, GCS_BUCKET (see cloud.py)
"""
import gzip
import hmac
import json
import threading
import time
import mimetypes
import re
import os
import sys
import urllib.error
import urllib.parse
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

import cloud  # noqa: E402  (reads its settings from the environment loaded above)
import logos  # noqa: E402  (club crests and competition logos from FootyLogos)

API_URL = "https://api.anthropic.com/v1/messages"
MODELS = {
    "complex": os.environ.get("CLAUDE_MODEL_COMPLEX", "claude-opus-5-5"),
    "default": os.environ.get("CLAUDE_MODEL_DEFAULT", "claude-sonnet-5-5"),
    "quick": os.environ.get("CLAUDE_MODEL_QUICK", "claude-haiku-5-5"),
}
MAX_TOKENS = int(os.environ.get("CLAUDE_MAX_TOKENS", "16000"))
MAX_BODY = 2 * 1024 * 1024  # largest request the browser may send
# web search for Claude requests that ask for it ($10 per 1,000 searches plus tokens, on your Anthropic bill)
WEB_MAX_USES = int(os.environ.get("CLAUDE_WEB_MAX_USES", "5") or 0)
PASSPHRASE = os.environ.get("CLAUDE_PASSPHRASE", "").strip()
DAILY_LIMIT = int(os.environ.get("CLAUDE_DAILY_LIMIT", "0") or 0)
HOSTED = bool(os.environ.get("K_SERVICE"))  # Cloud Run sets K_SERVICE

_usage = {}  # visitor address -> (day, count)
_usage_lock = threading.Lock()
_fails = {}  # visitor address -> (day, wrong passphrase count)
_logo_use = {}  # visitor address -> (day, logo lookups)


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
PUBLIC_DIRS = {"vendor", "js", "assets", "baseline"}
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

    def _user(self):
        return cloud.session_user(self.headers.get("Cookie", ""))

    def _need_user(self):
        user = self._user()
        if not user:
            self._json(401, {"error": "Signed out. Sign in with Google again to save to the cloud.", "code": "signed_out"})
        return user

    def _body(self, limit):
        length = int(self.headers.get("Content-Length") or 0)
        if length < 0 or length > limit:
            raise cloud.CloudError(413, "Request too large")
        return self.rfile.read(length) if length else b""

    def _from_page(self):
        # requests that change data must come from the studio's own script, not from another site
        return self.headers.get("X-Studio") == "1"

    def _api(self, method):
        """Sign-in and cloud storage routes. Returns True when the request was handled."""
        path = self.path.split("?", 1)[0]
        if not (path.startswith("/api/") or path.startswith("/_blob/")):
            return False
        secure = HOSTED
        try:
            if path == "/api/me" and method == "GET":
                user = self._user()
                return self._json(200, {"cloud": cloud.configured(), "clientId": cloud.CLIENT_ID if cloud.configured() else "",
                                        "signedIn": bool(user), "email": user["email"] if user else "", "sub": user["sub"] if user else ""}) or True
            if path == "/api/login" and method == "POST":
                if not self._from_page():
                    return self._json(403, {"error": "Forbidden"}) or True
                req = json.loads(self._body(8192).decode("utf-8") or "{}")
                user = cloud.verify_google_token(str(req.get("credential", "")))
                return self._json(200, {"ok": True, "email": user["email"]}, cookie=cloud.make_cookie(user, secure)) or True
            if path == "/api/logout" and method == "POST":
                return self._json(200, {"ok": True}, cookie=cloud.clear_cookie(secure)) or True
            if path.startswith("/api/logo/") or path == "/api/image":
                return self._logo_api(path, method) or True
            m = re.match(r"^/api/db/([a-z]+)(?:/([^/]+))?$", path)
            if m:
                col, rid = m.group(1), urllib.parse.unquote(m.group(2)) if m.group(2) else None
                if col not in cloud.COLLECTIONS:
                    return self._json(404, {"error": "Unknown collection"}) or True
                if method != "GET" and not self._from_page():
                    return self._json(403, {"error": "Forbidden"}) or True
                user = self._need_user()
                if not user:
                    return True
                if method == "GET" and not rid:
                    return self._json(200, {"docs": cloud.list_docs(user, col)}) or True
                if method == "PUT" and rid:
                    obj = json.loads(self._body(cloud.MAX_DOC + 4096).decode("utf-8"))
                    cloud.put_doc(user, col, rid, obj)
                    return self._json(200, {"ok": True}) or True
                if method == "DELETE" and rid:
                    cloud.delete_doc(user, col, rid)
                    return self._json(200, {"ok": True}) or True
                return self._json(405, {"error": "Not allowed"}) or True
            if path == "/api/baseline" and method == "POST":
                # the signed-in owner publishes a new public baseline (when they set a baseline in the studio)
                if not self._from_page():
                    return self._json(403, {"error": "Forbidden"}) or True
                user = self._need_user()
                if not user:
                    return True
                cloud.publish_baseline(self._body(cloud.MAX_BLOB))
                return self._json(200, {"ok": True}) or True
            if path == "/api/blob" and method == "POST":
                if not self._from_page():
                    return self._json(403, {"error": "Forbidden"}) or True
                user = self._need_user()
                if not user:
                    return True
                ctype = (self.headers.get("Content-Type") or "application/octet-stream").split(";")[0].strip()
                bid = cloud.upload_blob(user, self._body(cloud.MAX_BLOB), ctype)
                return self._json(200, {"id": bid, "url": "/_blob/" + bid}) or True
            m = re.match(r"^/api/blob/([a-f0-9]{32})$", path)
            if m and method == "DELETE":
                if not self._from_page():
                    return self._json(403, {"error": "Forbidden"}) or True
                user = self._need_user()
                if not user:
                    return True
                cloud.delete_blob(user, m.group(1))
                return self._json(200, {"ok": True}) or True
            m = re.match(r"^/_blob/([a-f0-9]{32})$", path)
            if m and method == "GET":
                user = self._user()
                if not user:
                    self.send_error(401)
                    return True
                data, ctype = cloud.get_blob(user, m.group(1))
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "private, max-age=31536000, immutable")
                self.end_headers()
                self.wfile.write(data)
                return True
        except cloud.CloudError as e:
            return self._json(e.status, {"error": str(e)}) or True
        except (ValueError, UnicodeDecodeError):
            return self._json(400, {"error": "Bad request"}) or True
        return False

    def _logo_api(self, path, method):
        if method != "GET":
            return self._json(405, {"error": "Not allowed"})
        if not _bump(_logo_use, self._client(), 6000):
            return self._json(429, {"error": "Too many logo requests today. Try again tomorrow.", "code": "daily_limit"})
        q = urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
        arg = lambda k: (q.get(k) or [""])[0][:300]
        try:
            if path == "/api/logo/find":
                hints = [h for h in arg("hints").split(",") if h.strip()][:5]
                return self._json(200, logos.find(arg("name"), "comp" if arg("kind") == "comp" else "club", arg("country"), hints))
            if path == "/api/logo/file":
                data, ctype = logos.logo_file(arg("slug"), "svg" if arg("fmt") == "svg" else "png")
            elif path == "/api/image":
                data, ctype = logos.proxy(arg("url") if len(arg("url")) < 300 else (q.get("url") or [""])[0][:2000])
            else:
                return self._json(404, {"error": "Not found"})
        except PermissionError as e:
            return self._json(403, {"error": str(e)})
        except urllib.error.HTTPError as e:
            return self._json(404 if e.code in (403, 404, 410) else 502, {"error": "Image not found (%s)" % e.code})
        except Exception as e:
            return self._json(502, {"error": "Could not get the image: %s" % e})
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "public, max-age=86400")
        # an SVG opened straight from this site must not be able to run anything
        self.send_header("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox")
        self.end_headers()
        self.wfile.write(data)
        return True

    def do_PUT(self):
        if not self._api("PUT"):
            self.send_error(404)

    def do_DELETE(self):
        if not self._api("DELETE"):
            self.send_error(404)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/health":
            return self._json(200, {"ok": True, "claude": bool(os.environ.get("ANTHROPIC_API_KEY")), "passphrase": bool(PASSPHRASE), "cloud": cloud.configured()})
        if self._api("GET"):
            return
        if self.path.split("?")[0] == "/baseline/pes21-baseline.zip" and cloud.configured():
            res = cloud.get_public_baseline()  # the latest published baseline, else the repository copy below
            if res:
                data = res[0]
                self.send_response(200)
                self.send_header("Content-Type", "application/zip")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                self.wfile.write(data)
                return
        if not self._allowed():
            return self.send_error(404)
        return super().do_GET()

    def do_HEAD(self):
        if not self._allowed():
            return self.send_error(404)
        return super().do_HEAD()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/claude":
            if not self._api("POST"):
                self.send_error(404)
            return
        key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not key:
            return self._json(503, {"error": "Claude isn't set up on this site yet." if HOSTED else "No Anthropic API key yet. Put ANTHROPIC_API_KEY=... in the .env file and restart the server."})
        who = self._client()
        if PASSPHRASE and not self._user():  # the signed-in owner doesn't need the passphrase
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
            web = bool(req.get("web")) and WEB_MAX_USES > 0
        except Exception:
            return self._json(400, {"error": "Bad request"})
        if not prompt.strip():
            return self._json(400, {"error": "Empty prompt"})

        body = {"model": MODELS[tier], "max_tokens": MAX_TOKENS, "messages": [{"role": "user", "content": prompt}]}
        if web:
            body["tools"] = [{"type": "web_search_20250305", "name": "web_search", "max_uses": WEB_MAX_USES}]
        headers = {"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        try:
            searches, done = 0, []
            for _ in range(4):  # a long search turn can pause; send it back to let Claude finish
                upstream = urllib.request.Request(API_URL, data=json.dumps(body).encode("utf-8"), method="POST", headers=headers)
                with urllib.request.urlopen(upstream, timeout=600) as r:
                    data = json.loads(r.read().decode("utf-8"))
                searches += ((data.get("usage") or {}).get("server_tool_use") or {}).get("web_search_requests", 0) or 0
                done += data.get("content", [])
                if data.get("stop_reason") != "pause_turn":
                    break
                body["messages"] = [body["messages"][0], {"role": "assistant", "content": done}]
            blocks = done
            # the answer is the text after the last search result (earlier text is Claude saying what it will search)
            last = max([i for i, b in enumerate(blocks) if b.get("type") == "web_search_tool_result"] or [-1])
            text = "".join(b.get("text", "") for b in blocks[last + 1:] if b.get("type") == "text")
            if not text.strip():
                text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
            return self._json(200, {"text": text, "model": data.get("model"), "stop_reason": data.get("stop_reason"), "searches": searches})
        except urllib.error.HTTPError as e:
            try:
                msg = json.loads(e.read().decode("utf-8")).get("error", {}).get("message", "")
            except Exception:
                msg = ""
            status = e.code if e.code in (400, 401, 403, 404, 413, 429, 529) else 502
            return self._json(status, {"error": "Anthropic API error %s%s" % (e.code, ": " + msg if msg else "")})
        except Exception as e:
            return self._json(502, {"error": "Could not reach the Anthropic API: %s" % e})

    def _json(self, status, obj, cookie=None):
        body = json.dumps(obj, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        zipped = len(body) > 2048 and "gzip" in (self.headers.get("Accept-Encoding") or "")
        if zipped:
            body = gzip.compress(body, 5)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        if zipped:
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Vary", "Accept-Encoding")
        if cookie:
            self.send_header("Set-Cookie", cookie)
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
    print("Cloud saving: %s" % ("on (" + ", ".join(sorted(cloud.ALLOWED)) + ")" if cloud.configured() else "off (projects stay in the browser)"))
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
