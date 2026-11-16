"""Club crests, stadiums and colours from TheSportsDB (www.thesportsdb.com).

Its free test key (123) answers team searches, which is all the studio needs; THESPORTSDB_KEY in .env can hold a
personal key instead. TheSportsDB covers clubs the other sources miss (the UAE leagues, for example), and its badges
are larger than eFootball's 128-pixel crests.
"""
import json
import os
import re
import threading
import time
import unicodedata
import urllib.parse
import urllib.request

import names

KEY = os.environ.get("THESPORTSDB_KEY", "").strip() or "123"
API = "https://www.thesportsdb.com/api/v1/json/%s/" % urllib.parse.quote(KEY)
UA = "PES21-Option-Studio/1.0"
_sem = threading.BoundedSemaphore(2)
_lock = threading.Lock()
_cache = {}
STOP = {"fc", "cf", "afc", "sc", "ac", "club", "de", "cd", "fk", "sk", "sv", "the", "football", "futbol", "futebol", "clube", "calcio", "saudi"}


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def reserve_mark(s):
    """'b', 'ii', 'u21' ... for reserve and youth sides, '' for a first team: the two must never be matched to each other."""
    m = re.search(r"\b(b|ii|iii|u ?\d\d|reserves?|youth|juniors?|juvenil)\b", norm(s))
    return m.group(1).replace(" ", "") if m else ""


def _core(s):
    return {w for w in norm(s).split() if w not in STOP}


def _get(path):
    with _sem:
        req = urllib.request.Request(API + path, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8") or "{}")


def find(name):
    """Best soccer team for a name: {id, name, league, badge, jersey, stadium, colours, score} or None. Cached for a day."""
    key = norm(name)
    with _lock:
        hit = _cache.get(key)
        if hit and hit[0] > time.time():
            return hit[1]
    want = _core(name)
    best = None
    tries = [name] + ([" ".join(w for w in norm(name).split() if w not in STOP)] if want else [])
    for q in dict.fromkeys(t for t in tries if t):
        for t in (_get("searchteams.php?t=" + urllib.parse.quote(q)).get("teams") or []):
            if (t.get("strSport") or "Soccer") != "Soccer" or reserve_mark(t.get("strTeam")) != reserve_mark(name):
                continue
            words = lambda s: [w for w in norm(s).split() if w not in STOP]
            sc = max([names.score(words(name), words(t.get("strTeam")))] +
                     [names.score(words(name), words(a)) for a in str(t.get("strTeamAlternate") or "").split(",") if a.strip()])
            if not best or sc > best["score"]:
                best = {"id": t.get("idTeam"), "name": t.get("strTeam"), "league": t.get("strLeague") or "", "badge": t.get("strBadge") or "",
                        "jersey": t.get("strEquipment") or "", "stadium": t.get("strStadium") or "",
                        "colours": [c for c in (t.get("strColour1"), t.get("strColour2")) if c], "score": round(sc, 2)}
        if best and best["score"] >= 1:
            break
    if best and best["score"] < names.STRONG:
        best = None
    with _lock:
        _cache[key] = (time.time() + 24 * 3600, best)
    return best


def image(url):
    """A TheSportsDB image (badge or jersey); only its own image host is allowed."""
    u = urllib.parse.urlparse(str(url or ""))
    if u.scheme != "https" or u.hostname not in ("r2.thesportsdb.com", "www.thesportsdb.com") or not re.search(r"\.(png|jpe?g|webp)$", u.path, re.I):
        raise PermissionError("not a TheSportsDB image")
    with _sem:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read(5_000_000)
            ctype = (r.headers.get("Content-Type") or "image/png").split(";")[0]
    return data, ctype
