"""EA SPORTS FC player ratings (the game that was called FIFA), from EA's public ratings site (www.ea.com/games/ea-sports-fc/ratings).

The site reads one public list, about 18,000 current players: overall rating, every stat, height, weight, foot, weak foot, birth
date, nationality, club and positions. It is read in pages of 100 at most once a day and kept in memory, slimmed to what the studio
uses. The studio converts the stats to the PES 2021 scale (see "EA FC" in index.html).

The browser can't fetch other sites, so the studio asks this server (/api/fc/* in server.py).
"""
import json
import threading
import time
import unicodedata
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE = "https://drop-api.ea.com/rating/ea-sports-fc"
UA = "Mozilla/5.0 (compatible; PES21-Option-Studio)"
TTL = 24 * 3600
PAGE = 100
_lock = threading.Lock()
_data = {"at": 0, "players": None, "full": None, "common": None, "last": None}

STATS = ["acceleration", "sprintSpeed", "positioning", "finishing", "shotPower", "longShots", "volleys", "penalties", "vision",
         "crossing", "freeKickAccuracy", "shortPassing", "longPassing", "curve", "agility", "balance", "reactions", "ballControl",
         "dribbling", "composure", "interceptions", "headingAccuracy", "defensiveAwareness", "standingTackle", "slidingTackle",
         "jumping", "stamina", "strength", "aggression", "gkDiving", "gkHandling", "gkKicking", "gkPositioning", "gkReflexes"]


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower().replace("ß", "ss").replace("ø", "o").replace("ł", "l")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def _get(offset, limit=PAGE):
    url = "%s?locale=en&limit=%d&offset=%d" % (BASE, limit, offset)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    for i in range(3):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            if i == 2:
                raise
            time.sleep(1 + i * 2)


def _slim(p):
    st = p.get("stats") or {}
    first, last, common = p.get("firstName") or "", p.get("lastName") or "", p.get("commonName") or ""
    born = ""
    m = re.match(r"(\d+)/(\d+)/(\d{4})", p.get("birthdate") or "")
    if m:
        born = "%s-%02d-%02d" % (m.group(3), int(m.group(1)), int(m.group(2)))
    return {
        "id": p.get("id"), "name": common or (first + " " + last).strip(), "first": first, "last": last, "born": born,
        "height": p.get("height"), "weight": p.get("weight"), "foot": "L" if p.get("preferredFoot") == 2 else "R",
        "weakFoot": p.get("weakFootAbility"), "skillMoves": p.get("skillMoves"), "ovr": p.get("overallRating"),
        "pos": ((p.get("position") or {}).get("shortLabel") or ""),
        "alt": [a.get("shortLabel") for a in (p.get("alternatePositions") or []) if a.get("shortLabel")],
        "nat": ((p.get("nationality") or {}).get("label") or ""), "team": ((p.get("team") or {}).get("label") or ""),
        "league": p.get("leagueName") or "",
        "stats": {k: (st.get(k) or {}).get("value") for k in STATS if isinstance(st.get(k), dict)},
    }


def load():
    """Every player, read at most once a day (about 180 pages, four at a time)."""
    with _lock:
        if _data["players"] is not None and time.time() - _data["at"] < TTL:
            return _data
        first = _get(0)
        total = int(first.get("totalItems") or 0)
        items = list(first.get("items") or [])
        with ThreadPoolExecutor(4) as ex:
            for page in ex.map(lambda o: _get(o).get("items") or [], range(PAGE, total, PAGE)):
                items.extend(page)
        players = [_slim(p) for p in items if ((p.get("gender") or {}).get("id", 0) == 0)]  # men's football
        full, common, last = {}, {}, {}
        for i, p in enumerate(players):
            full.setdefault(norm(p["first"] + " " + p["last"]), []).append(i)
            if p["name"]:
                common.setdefault(norm(p["name"]), []).append(i)
            if p["last"]:
                last.setdefault(norm(p["last"]), []).append(i)
        _data.update(at=time.time(), players=players, full=full, common=common, last=last)
        return _data


def find(name, limit=8):
    """Players this name can be: full or common name, then "L. Martínez" (initial and last name), then a last name alone."""
    d = load()
    n = norm(name)
    if not n:
        return []
    idx = list(dict.fromkeys(d["full"].get(n, []) + d["common"].get(n, [])))
    parts = n.split()
    if not idx and len(parts) >= 2:
        ini, rest = parts[0], " ".join(parts[1:])
        cand = d["last"].get(rest, [])
        if len(ini) == 1:
            idx = [i for i in cand if norm(d["players"][i]["first"]).startswith(ini)]
        if not idx:  # "Vinícius Júnior" style: the last words are the last name
            idx = [i for i in cand if norm(d["players"][i]["first"]).split()[:1] == [ini]]
    if not idx and len(parts) == 1:
        idx = d["last"].get(n, [])
    if not idx and len(parts) >= 2:  # every word of the name in the full name, in order ("Vinicius Junior")
        def inorder(full):
            w = full.split()
            k = 0
            for x in w:
                if k < len(parts) and x == parts[k]:
                    k += 1
            return k == len(parts)
        idx = [i for k, lst in d["full"].items() if inorder(k) for i in lst]
    return [d["players"][i] for i in idx[:limit]]


def find_many(names):
    return {n: find(n) for n in names}
