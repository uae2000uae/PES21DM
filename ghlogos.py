"""Club crests from the football-logos collection on GitHub (github.com/luukhopman/football-logos).

Current-season PNG crests (139 x 181) for the clubs of the top 25 European leagues, one file per club under
logos/<Country - League>/<Club>.png. Small, so the studio tries it after FootyLogos, TheSportsDB and Wikimedia
Commons and before eFootball's 128-pixel crests. The file list is read once a day through the GitHub API; the
images come from raw.githubusercontent.com through the studio's image proxy (logos.proxy).
"""
import json
import re
import threading
import time
import unicodedata
import urllib.parse
import urllib.request

import names

TREE = "https://api.github.com/repos/luukhopman/football-logos/git/trees/HEAD?recursive=1"
RAW = "https://raw.githubusercontent.com/luukhopman/football-logos/HEAD/"
UA = "PES2021-Option-Studio/1.0 (+https://github.com/uae2000uae/PES21DM)"
STOP = {"fc", "cf", "afc", "sc", "ac", "as", "club", "de", "cd", "fk", "sk", "sv", "the", "football", "futbol", "futebol",
        "clube", "calcio", "1", "ss", "ssc", "us", "rc", "rcd", "ud", "sd", "vfl", "vfb", "tsg", "ogc", "osc", "bk", "if", "ff"}
_lock = threading.Lock()
_index = {"at": 0, "items": []}


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower().replace("ø", "o").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def reserve_mark(s):
    m = re.search(r"\b(b|ii|iii|u ?\d\d|reserves?|youth|juniors?|juvenil)\b", norm(s))
    return m.group(1).replace(" ", "") if m else ""


def _words(s):
    return [w for w in norm(s).split() if w not in STOP and not re.fullmatch(r"(18|19|20)\d\d", w)]


def index():
    """[(club, league, path)] for the current season's crests, cached for a day."""
    with _lock:
        if _index["items"] and _index["at"] > time.time() - 24 * 3600:
            return _index["items"]
    req = urllib.request.Request(TREE, headers={"User-Agent": UA, "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        tree = json.loads(r.read().decode("utf-8")).get("tree") or []
    items = []
    for x in tree:
        p = x.get("path") or ""
        m = re.match(r"^logos/([^/]+)/([^/]+)\.png$", p)
        if x.get("type") == "blob" and m:
            items.append((m.group(2), m.group(1), p))
    with _lock:
        _index.update(at=time.time(), items=items)
    return items


def find(name):
    """The crest for a club name: {name, league, url, score} or None (also None when two different clubs fit equally)."""
    want = _words(name)
    if not want:
        return None
    scored = []
    for club, league, path in index():
        if reserve_mark(club) != reserve_mark(name):
            continue
        sc = names.score(want, _words(club))
        if sc >= names.STRONG:
            scored.append((sc, club, league, path))
    if not scored:
        return None
    scored.sort(key=lambda x: -x[0])
    top = scored[0]
    if top[0] < 1 and any(s[0] == top[0] and norm(s[1]) != norm(top[1]) for s in scored[1:]):
        return None
    return {"name": top[1], "league": top[2], "url": RAW + urllib.parse.quote(top[3]), "score": round(top[0], 2)}
