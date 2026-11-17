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
import io
import zipfile
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
import efootball  # noqa: E402  (squads and player records from the eFootball database on PES Master)
import fcratings  # noqa: E402  (EA SPORTS FC player ratings, the game once called FIFA)
import fifa  # noqa: E402  (FIFA: national-team squads for the World Cup)
import optionfile  # noqa: E402  (option-file packages: the benchmark file sets, read file by file)
import thesportsdb  # noqa: E402  (club crests and stadiums from TheSportsDB)
import wikidata  # noqa: E402  (coaches, stadiums and free logos from Wikidata / Wikimedia Commons)
import transfermarkt  # noqa: E402  (squads for clubs eFootball doesn't have, from the open Transfermarkt dataset)
import logos  # noqa: E402  (club crests and competition logos from FootyLogos)
import ghlogos  # noqa: E402  (current-season crests for the top European leagues, from the football-logos collection on GitHub)

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
_ef_use = {}  # visitor address -> (day, eFootball pages fetched)
EF_DAILY = int(os.environ.get("EFOOTBALL_DAILY_LIMIT", "20000") or 0)  # PES Master pages per visitor per day; 0 = no limit


_bl_cache = {"t": 0, "val": None}
_bl_lock = threading.Lock()


def _baseline_info(data, source):
    """exportedAt and label of a baseline ZIP, read from the start of its project.json."""
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z, z.open("project.json") as f:
            head = f.read(4000).decode("utf-8", "replace")
        at = re.search(r'"exportedAt":\s*(\d+)', head)
        label = re.search(r'"label":\s*"((?:[^"\\]|\\.)*)"', head)
        return {"exportedAt": int(at.group(1)) if at else 0, "label": json.loads('"%s"' % label.group(1)) if label else "", "source": source}
    except Exception:
        return {"exportedAt": 0, "label": "", "source": source}


def newest_baseline():
    """(bytes, info) of the newest public baseline: the one published from the studio (Cloud Storage) or the copy in
    the repository, whichever was exported later. Cached for a minute."""
    with _bl_lock:
        if _bl_cache["val"] and time.time() - _bl_cache["t"] < 60:
            return _bl_cache["val"]
    best = None
    path = ROOT / "baseline" / "pes21-baseline.zip"
    if path.exists():
        repo = path.read_bytes()
        best = (repo, _baseline_info(repo, "repository"))
    if cloud.configured():
        res = cloud.get_public_baseline()
        if res:
            pub = (res[0], _baseline_info(res[0], "published"))
            if not best or pub[1]["exportedAt"] >= best[1]["exportedAt"]:
                best = pub
    with _bl_lock:
        _bl_cache.update(t=time.time(), val=best)
    return best


_grp_cache = {"t": 0, "val": None}


def baseline_for(user):
    """The baseline this visitor gets: signed-in accounts also see the group baseline (a project built on an option-file
    package, which only they can open), when it is the newest."""
    best = newest_baseline()
    if not (user and cloud.configured()):
        return best
    with _bl_lock:
        grp = _grp_cache["val"] if time.time() - _grp_cache["t"] < 60 else None
    if grp is None:
        res = cloud.get_public_baseline(cloud.GROUP_BASELINE)
        grp = (res[0], _baseline_info(res[0], "group")) if res else False
        with _bl_lock:
            _grp_cache.update(t=time.time(), val=grp)
    if grp and (not best or grp[1]["exportedAt"] >= best[1]["exportedAt"]):
        return grp
    return best


def _today():
    return time.strftime("%Y-%m-%d", time.gmtime())


def _bump(table, who, limit, cost=1):
    """Count `cost` more for this visitor today; False once the limit is passed."""
    day = _today()
    with _usage_lock:
        d, n = table.get(who, (day, 0))
        if d != day:
            n = 0
        if limit and n >= limit:
            return False
        table[who] = (day, n + cost)
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
        # check the decoded path, the one the file handler opens (so %2e%2e can't slip past as "..")
        parts = [p for p in urllib.parse.unquote(path).split("/") if p]
        if any(p.startswith(".") or "\\" in p or "\x00" in p for p in parts):
            return False
        if len(parts) == 1:
            return parts[0] in PUBLIC_FILES
        if parts[0] == "data":
            # the data folder (project transfer files) is only served on this computer, never when hosted
            return not HOSTED and os.environ.get("HOST", "127.0.0.1") in ("127.0.0.1", "localhost")
        return parts[0] in PUBLIC_DIRS

    def _user(self):
        return cloud.session_user(self.headers.get("Cookie", ""))

    def _owner(self):
        """The signed-in owner (an ALLOWED_EMAILS account), or None. Other signed-in accounts only save their own project."""
        user = self._user()
        return user if user and user.get("owner") else None

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
                                        "signedIn": bool(user), "email": user["email"] if user else "", "sub": user["sub"] if user else "",
                                        "owner": bool(user and user.get("owner")),
                                        # admins: the site's owner accounts online, or whoever runs the studio on their own computer
                                        "admin": bool(user and user.get("owner")) or not HOSTED}) or True
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
            if path.startswith("/api/efootball/"):
                return self._ef_api(path, method) or True
            if path.startswith("/api/tm/"):
                return self._tm_api(path, method) or True
            if path.startswith("/api/fc/") or path.startswith("/api/fifa/"):
                return self._fifa_api(path, method) or True
            if path.startswith("/api/wd/"):
                return self._wd_api(path, method) or True
            if path == "/api/gh/find" and method == "GET":
                qq = urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
                try:
                    return self._json(200, {"crest": ghlogos.find((qq.get("name") or [""])[0][:200])}) or True
                except Exception as e:
                    return self._json(502, {"error": "Could not read the football-logos list: %s" % e}) or True
            if path.startswith("/api/tsdb/"):
                return self._tsdb_api(path, method) or True
            if path.startswith("/api/of/"):
                return self._of_api(path, method) or True
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
                if not user.get("owner"):
                    return self._json(403, {"error": "Only the site's owner can publish a baseline."}) or True
                q = urllib.parse.parse_qs(self.path.partition("?")[2])
                target = cloud.GROUP_BASELINE if (q.get("target") or [""])[0] == "group" else cloud.PUBLIC_BASELINE
                if "up" in q:  # one part of a baseline too large for a single request
                    try:
                        n, total = int(q["part"][0]), int(q["of"][0])
                    except (KeyError, ValueError):
                        return self._json(400, {"error": "Bad upload part."}) or True
                    done = cloud.publish_baseline_part(q["up"][0], n, total, self._body(cloud.MAX_BLOB), target)
                    if done:
                        _bl_cache["val"] = None
                        _grp_cache["val"] = None
                    return self._json(200, {"ok": True, "done": done}) or True
                cloud.publish_baseline(self._body(cloud.MAX_BLOB), target)
                _bl_cache["val"] = None  # the next request serves the new one
                _grp_cache["val"] = None
                return self._json(200, {"ok": True, "done": True}) or True
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

    def _of_api(self, path, method):
        """Option-file packages. Online: owner accounts work with the site's packages, every other signed-in account only
        with its own (uploaded into users/<id>/optionfiles/, never seen by anyone else). Locally: this computer's.
        GET  /api/of/packages | /api/of/manifest?pkg= | /api/of/gamefiles?pkg= | /api/of/file?pkg=&path=
        POST /api/of/register {object, name} (online: a ZIP already in the bucket) | /api/of/upload?name= (this computer)"""
        user = self._user()
        if HOSTED and not user:
            return self._json(401, {"error": "Sign in with Google (bottom of the left menu) to upload and open option files.", "code": "signed_out"})
        scope = None if (not HOSTED or user.get("owner")) else user["sub"]  # None: the site's packages
        q = urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
        arg = lambda k: (q.get(k) or [""])[0][:1000]
        try:
            if method == "GET" and path == "/api/of/packages":
                return self._json(200, {"packages": optionfile.packages(scope), "online": optionfile.online()})
            if method == "GET" and path == "/api/of/manifest":
                return self._json(200, {"files": optionfile.manifest(arg("pkg"), scope)})
            if method == "GET" and path == "/api/of/gamefiles":
                import base64
                return self._json(200, {"files": {k: base64.b64encode(v).decode("ascii") for k, v in optionfile.game_files(arg("pkg"), scope).items()}})
            if method == "GET" and path == "/api/of/file":
                data = optionfile.read(arg("pkg"), arg("path"), scope)
                self.send_response(200)
                self.send_header("Content-Type", optionfile.ctype(arg("path")))
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "private, max-age=86400")
                self.end_headers()
                self.wfile.write(data)
                return True
            if method == "POST" and path == "/api/of/register":
                if not self._from_page():
                    return self._json(403, {"error": "Forbidden"})
                if not optionfile.online():
                    return self._json(400, {"error": "On this computer, upload the ZIP or put it in data/optionfiles/."})
                if scope is not None:  # only owners register files already in the bucket
                    return self._json(403, {"error": "Upload your option file instead."})
                req = json.loads(self._body(65536) or b"{}")
                return self._json(200, {"package": optionfile.register_object(req.get("object"), req.get("name", ""))})
            if method == "POST" and path == "/api/of/upload-part":
                if not self._from_page():
                    return self._json(403, {"error": "Forbidden"})
                if not optionfile.online():
                    return self._json(400, {"error": "On this computer the ZIP is uploaded in one go."})
                data = self._body(cloud.MAX_BLOB)
                return self._json(200, optionfile.upload_part(arg("up"), int(arg("part") or -1), int(arg("of") or 0), data, arg("name"), scope))
            if method == "POST" and path == "/api/of/upload":
                if not self._from_page():
                    return self._json(403, {"error": "Forbidden"})
                if optionfile.online():
                    return self._json(400, {"error": "Online, upload the ZIP to the site's Cloud Storage bucket, then register it by its path."})
                length = int(self.headers.get("Content-Length") or 0)
                return self._json(200, {"packages": optionfile.save_upload(arg("name"), self.rfile, length)})
            return self._json(404, {"error": "Not found"})
        except LookupError as e:
            return self._json(404, {"error": str(e)})
        except (ValueError, zipfile.BadZipFile) as e:
            return self._json(400, {"error": str(e)})
        except Exception as e:
            return self._json(502, {"error": "Could not read the option file: %s" % e})

    def _tsdb_api(self, path, method):
        """TheSportsDB: /api/tsdb/find?name=, /api/tsdb/image?url="""
        if method != "GET":
            return self._json(405, {"error": "Not allowed"})
        q = urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
        arg = lambda k: (q.get(k) or [""])[0][:400]
        try:
            if path == "/api/tsdb/league":
                clubs = [c for c in (q.get("clubs") or [""])[0][:1200].split("|") if c.strip()][:5]
                return self._json(200, {"league": thesportsdb.league(arg("name"), arg("country"), clubs, arg("cup") == "1")})
            if path == "/api/tsdb/find":
                return self._json(200, {"team": thesportsdb.find(arg("name"))})
            if path == "/api/tsdb/image":
                data, ctype = thesportsdb.image(arg("url"))
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "public, max-age=86400")
                self.end_headers()
                self.wfile.write(data)
                return True
            return self._json(404, {"error": "Not found"})
        except PermissionError as e:
            return self._json(403, {"error": str(e)})
        except Exception as e:
            return self._json(502, {"error": "Could not reach TheSportsDB: %s" % e})

    def _wd_api(self, path, method):
        """Wikidata: /api/wd/find?name=&kind=club|national|comp, /api/wd/logo?file= (PNG from Wikimedia Commons)"""
        if method != "GET":
            return self._json(405, {"error": "Not allowed"})
        q = urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
        arg = lambda k: (q.get(k) or [""])[0][:250]
        try:
            if path == "/api/wd/find":
                return self._json(200, {"item": wikidata.find(arg("name"), arg("kind"), arg("country"))})
            if path == "/api/wd/logo":
                data, ctype = wikidata.logo(arg("file"))
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "public, max-age=86400")
                self.end_headers()
                self.wfile.write(data)
                return True
            return self._json(404, {"error": "Not found"})
        except wikidata.Busy as e:
            return self._json(429, {"error": str(e), "code": "busy"})
        except (LookupError, PermissionError) as e:
            return self._json(404, {"error": "Wikidata: %s" % e})
        except Exception as e:
            return self._json(502, {"error": "Could not reach Wikidata: %s" % e})

    def _tm_api(self, path, method):
        """Open Transfermarkt dataset: /api/tm/search?q=, /api/tm/squad?club=ID, /api/tm/player?name=, /api/tm/players?names=a|b (the club a player is at now)"""
        if method != "GET":
            return self._json(405, {"error": "Not allowed"})
        q = urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
        arg = lambda k: (q.get(k) or [""])[0][:200]
        try:
            if path == "/api/tm/search":
                return self._json(200, {"clubs": transfermarkt.search(arg("q"))})
            if path == "/api/tm/squad":
                return self._json(200, transfermarkt.squad(arg("club")))
            if path == "/api/tm/player":
                return self._json(200, {"players": transfermarkt.find_player(arg("name"))})
            if path == "/api/tm/players":  # many at once: names=a|b|c (up to 40)
                names = [n for n in (q.get("names") or [""])[0][:4000].split("|") if n.strip()][:40]
                return self._json(200, {"players": {n: transfermarkt.find_player(n) for n in names}})
            return self._json(404, {"error": "Not found"})
        except LookupError as e:
            return self._json(404, {"error": "Transfermarkt data: %s" % e})
        except Exception as e:
            return self._json(502, {"error": "Could not read the Transfermarkt dataset: %s" % e})

    def _fifa_api(self, path, method):
        """EA SPORTS FC ratings: /api/fc/players?names=a|b (up to 60). FIFA: /api/fifa/worldcup, /api/fifa/squad?team=ID"""
        if method != "GET":
            return self._json(405, {"error": "Not allowed"})
        q = urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
        arg = lambda k, n=200: (q.get(k) or [""])[0][:n]
        try:
            if path == "/api/fc/players":
                names = [n for n in arg("names", 6000).split("|") if n.strip()][:60]
                return self._json(200, {"players": fcratings.find_many(names)})
            if path == "/api/fifa/worldcup":
                return self._json(200, fifa.world_cup())
            if path == "/api/fifa/squad":
                return self._json(200, fifa.squad(arg("team")))
            return self._json(404, {"error": "Not found"})
        except LookupError as e:
            return self._json(404, {"error": str(e)})
        except Exception as e:
            src = "EA SPORTS FC ratings" if path.startswith("/api/fc/") else "FIFA"
            return self._json(502, {"error": "Could not read %s: %s" % (src, e)})

    def _ef_api(self, path, method):
        """eFootball database (PES Master): /api/efootball/teams?q=, /squad?team=ID[&players=1], /players?ids=1,2,3"""
        if method != "GET":
            return self._json(405, {"error": "Not allowed"})
        q = urllib.parse.parse_qs(self.path.split("?", 1)[1] if "?" in self.path else "")
        arg = lambda k: (q.get(k) or [""])[0][:400]
        cost = 1
        if path == "/api/efootball/squad" and arg("players"):
            cost = 30
        elif path == "/api/efootball/players":
            cost = max(1, len(arg("ids").split(",")))
        if not _bump(_ef_use, self._client(), EF_DAILY, cost):
            return self._json(429, {"error": "Daily limit for eFootball look-ups reached. Try again tomorrow.", "code": "daily_limit"})
        try:
            if path == "/api/efootball/teams":
                nat = {"1": True, "0": False}.get(arg("national"))
                if arg("refresh") == "1" and (self._owner() or not HOSTED):  # rebuilding reads ~60 pages: owner or local only
                    efootball.index(refresh=True)
                if arg("q"):
                    return self._json(200, {"teams": efootball.search(arg("q"), nat)})
                return self._json(200, efootball.index())
            if path == "/api/efootball/squad":
                tid = int(arg("team"))
                return self._json(200, efootball.team_full(tid) if arg("players") else {"team": tid, "squad": efootball.squad(tid)})
            if path == "/api/efootball/players":
                ids = [int(x) for x in arg("ids").split(",") if x.strip().isdigit()][:40]
                return self._json(200, {"players": efootball.players(ids)})
            if path == "/api/efootball/team":
                return self._json(200, efootball.team_info(int(arg("team"))))
            if path == "/api/efootball/image":
                data = efootball.image(arg("path"))
                self.send_response(200)
                self.send_header("Content-Type", "image/webp" if data[:4] == b"RIFF" else "image/png")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "public, max-age=86400")
                self.end_headers()
                self.wfile.write(data)
                return True
            return self._json(404, {"error": "Not found"})
        except (ValueError, TypeError):
            return self._json(400, {"error": "Bad request"})
        except PermissionError as e:
            return self._json(403, {"error": str(e)})
        except LookupError as e:
            return self._json(404, {"error": "eFootball database: %s" % e})
        except Exception as e:
            return self._json(502, {"error": "Could not reach the eFootball database (PES Master): %s" % e})

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
        if self.path.split("?")[0] == "/api/baseline/info":
            best = baseline_for(self._owner())
            return self._json(200, best[1] if best else {"exportedAt": 0, "label": "", "source": ""})
        if self._api("GET"):
            return
        if self.path.split("?")[0] == "/baseline/pes21-baseline.zip" and cloud.configured():
            res = baseline_for(self._owner())  # the published baseline or the repository copy (or, signed in, the group one), whichever is newer
            if res:
                data = res[0]
                # no Content-Length: Cloud Run then streams the file, and its 32 MiB response limit doesn't apply
                self.send_response(200)
                self.send_header("Content-Type", "application/zip")
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                for i in range(0, len(data), 1048576):
                    self.wfile.write(data[i:i + 1048576])
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
        if not self._from_page():  # another site must not be able to spend the API credit
            return self._json(403, {"error": "Forbidden"})
        key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if not key:
            return self._json(503, {"error": "Claude isn't set up on this site yet." if HOSTED else "No Anthropic API key yet. Put ANTHROPIC_API_KEY=... in the .env file and restart the server."})
        who = self._client()
        if PASSPHRASE and not self._owner():  # the signed-in owner doesn't need the passphrase
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
            # the newer web search filters results before Claude reads them (faster, fewer tokens); Haiku keeps the basic tool
            tool = "web_search_20250305" if "haiku" in MODELS[tier] else "web_search_20260209"
            body["tools"] = [{"type": tool, "name": "web_search", "max_uses": WEB_MAX_USES}]
        headers = {"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
        try:
            searches, done = 0, []
            usage = {"input": 0, "output": 0, "cache_read": 0, "cache_write": 0}  # summed over every round, for the cost shown in the studio
            for _ in range(4):  # a long search turn can pause; send it back to let Claude finish
                upstream = urllib.request.Request(API_URL, data=json.dumps(body).encode("utf-8"), method="POST", headers=headers)
                with urllib.request.urlopen(upstream, timeout=600) as r:
                    data = json.loads(r.read().decode("utf-8"))
                u = data.get("usage") or {}
                searches += (u.get("server_tool_use") or {}).get("web_search_requests", 0) or 0
                usage["input"] += u.get("input_tokens") or 0
                usage["output"] += u.get("output_tokens") or 0
                usage["cache_read"] += u.get("cache_read_input_tokens") or 0
                usage["cache_write"] += u.get("cache_creation_input_tokens") or 0
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
            stop = data.get("stop_reason")
            # say why an answer is unusable instead of passing on a partial reply that fails as "not clean JSON"
            if stop == "refusal":
                why = ((data.get("stop_details") or {}).get("explanation") or "").strip()
                return self._json(422, {"error": "Claude declined this request" + (": " + why if why else "."), "code": "refusal", "searches": searches, "usage": usage, "model": data.get("model")})
            if stop == "max_tokens":
                return self._json(422, {"error": "Claude's reply was cut off at %d tokens (CLAUDE_MAX_TOKENS). Raise it or ask for fewer players at a time." % MAX_TOKENS, "code": "max_tokens", "searches": searches, "usage": usage, "model": data.get("model")})
            if stop == "pause_turn":
                return self._json(422, {"error": "Claude was still searching the web after 4 rounds. Try again, or lower the scope of the request.", "code": "pause_turn", "searches": searches, "usage": usage, "model": data.get("model")})
            return self._json(200, {"text": text, "model": data.get("model"), "stop_reason": data.get("stop_reason"), "searches": searches, "usage": usage})
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
