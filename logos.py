"""PES 2021 Option Studio - club crests and competition logos from FootyLogos (https://www.footylogos.com).

Used by server.py. Standard library only. The browser can't download images from other sites itself
(they don't allow it), so the server finds the logo and passes the file on.

FootyLogos names every club and competition with a slug, e.g. "al-ain", "real-madrid",
"premier-league-england". The logo files are at
  https://assets.footylogos.com/logos/<slug>/<slug>-logo-footylogos.svg       (all, scalable)
  https://assets.footylogos.com/logos/<slug>/<slug>-logo-footylogos.png       (1500 x 1500 PNG)
find() tries likely slugs for a name (plus any guesses Claude supplied) and returns the first that exists.
"""
import re
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

UA = "PES2021-Option-Studio/1.0 (+https://github.com/uae2000uae/PES21DM)"
ASSET = "https://assets.footylogos.com/logos/{0}/{0}-logo-footylogos.svg"
PNGS = ("https://assets.footylogos.com/logos/{0}/{0}-logo-footylogos.png",       # 1500 x 1500
        "https://www.footylogos.com/downloads/logo/{0}-logo-footylogos.png")
PAGE = "https://www.footylogos.com/logos/{0}"
MAX_FILE = 8 * 1024 * 1024
SLUG_OK = re.compile(r"^[a-z0-9][a-z0-9-]{0,99}$")

# other public crest sources the studio's Claude prompts mention; the image proxy only fetches from these
PROXY_HOSTS = {"assets.footylogos.com", "www.footylogos.com", "footylogos.com",
               "raw.githubusercontent.com", "upload.wikimedia.org", "fclogo.top", "www.fclogo.top"}

AFFIX = {"fc", "cf", "afc", "sc", "ac", "as", "club", "cd", "ud", "sd", "rc", "rcd", "ssc", "sv", "fk", "sk", "nk",
         "bk", "cfc", "ca", "se", "ec", "csd", "sfc", "cp", "fsc", "sporting", "football", "futbol", "calcio", "saudi"}

_cache = {}  # slug -> exists (True/False), with time
_lock = threading.Lock()


def slugify(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode("ascii").lower()
    s = s.replace("&", " and ")
    s = re.sub(r"['’.]", "", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def candidates(name, kind="club", country="", hints=()):
    out = []

    def add(x):
        x = slugify(x)
        if x and SLUG_OK.match(x) and x not in out:
            out.append(x)

    for h in hints or ():
        h = str(h).strip()
        m = re.search(r"footylogos\.com/(?:logos|competition)/([a-z0-9-]+)", h)
        add(m.group(1) if m else h)
    base = slugify(name)
    add(base)
    words = [w for w in base.split("-") if w]
    core = [w for w in words if w not in AFFIX]
    if core and core != words:
        add("-".join(core))
    if core and kind != "comp":
        add("fc-" + "-".join(core))
        add("-".join(core) + "-fc")
    c = slugify(country)
    if c:
        add(base + "-" + c)
        if core:
            add("-".join(core) + "-" + c)
    if kind == "comp" and c:
        add(c + "-" + base)
    return out[:10]


def _get(url, limit=MAX_FILE, method="GET"):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": UA, "Accept": "image/*,*/*;q=0.5"})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = r.read(limit + 1) if method == "GET" else b""
        if len(data) > limit:
            raise ValueError("file too large")
        return data, (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()


def exists(slug):
    with _lock:
        hit = _cache.get(slug)
        if hit and hit[1] > time.time() - 6 * 3600:
            return hit[0]
    ok = False
    try:
        data, ctype = _get(ASSET.format(slug), limit=MAX_FILE)
        ok = b"<svg" in data[:4000].lower() or "svg" in ctype
    except urllib.error.HTTPError as e:
        ok = False if e.code in (403, 404, 410) else None
    except Exception:
        ok = None  # network trouble: don't remember it
    if ok is not None:
        with _lock:
            if len(_cache) > 20000:
                _cache.clear()
            _cache[slug] = (ok, time.time())
    return bool(ok)


def find(name, kind="club", country="", hints=()):
    tried = []
    for slug in candidates(name, kind, country, hints):
        tried.append(slug)
        if exists(slug):
            return {"found": True, "slug": slug, "page": PAGE.format(slug),
                    "file": "/api/logo/file?slug=%s&fmt=png" % slug, "tried": tried}
    return {"found": False, "tried": tried}


def logo_file(slug, fmt="png"):
    """(bytes, content type) of a FootyLogos logo. PNG falls back to the SVG when there is no PNG download."""
    if not SLUG_OK.match(slug or ""):
        raise ValueError("bad slug")
    if fmt == "png":
        for pattern in PNGS:
            try:
                data, ctype = _get(pattern.format(slug))
                if data[:8] == b"\x89PNG\r\n\x1a\n":
                    return data, "image/png"
            except Exception:
                pass
    data, _ = _get(ASSET.format(slug))
    if b"<svg" not in data[:4000].lower():
        raise ValueError("not an image")
    return data, "image/svg+xml"


def proxy(url):
    """Fetch an image from one of PROXY_HOSTS (for crest links Claude or a file supplied)."""
    u = urllib.parse.urlparse(url)
    if u.scheme != "https" or (u.hostname or "").lower() not in PROXY_HOSTS:
        raise PermissionError("Images can only be fetched from FootyLogos, GitHub and Wikimedia.")
    m = re.match(r"^/(?:logos|competition)/([a-z0-9-]+)/?$", u.path or "")
    if (u.hostname or "").endswith("footylogos.com") and m and u.hostname != "assets.footylogos.com":
        return logo_file(m.group(1), "png")  # a FootyLogos page link: take its logo file
    data, ctype = _get(url)
    if not (ctype.startswith("image/") or data[:8] == b"\x89PNG\r\n\x1a\n" or b"<svg" in data[:4000].lower()):
        raise ValueError("not an image")
    if not ctype.startswith("image/"):
        ctype = "image/png" if data[:4] == b"\x89PNG" else "image/svg+xml"
    return data, ctype
