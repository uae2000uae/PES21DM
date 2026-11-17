"""FIFA (the football body): national-team squads from FIFA's public data service (api.fifa.com), the one fifa.com uses.

For the newest FIFA World Cup it lists every qualified team and its official squad: names, shirt numbers, positions, height,
weight and birth dates. The studio uses it for national teams. Read at most once every six hours.

The browser can't fetch other sites, so the studio asks this server (/api/fifa/* in server.py).
"""
import json
import threading
import time
import urllib.parse
import urllib.request

BASE = "https://api.fifa.com/api/v3"
UA = "Mozilla/5.0 (compatible; PES21-Option-Studio)"
WORLD_CUP = 17  # FIFA's competition number for the men's World Cup
_lock = threading.Lock()
_cache = {}  # key -> (expires, value)


def _get(path, **q):
    q.setdefault("language", "en")
    url = BASE + path + "?" + urllib.parse.urlencode(q)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def _cached(key, ttl, fn):
    with _lock:
        hit = _cache.get(key)
        if hit and hit[0] > time.time():
            return hit[1]
    val = fn()
    with _lock:
        _cache[key] = (time.time() + ttl, val)
    return val


def _desc(v):
    return ((v or [{}])[0] or {}).get("Description") or ""


def world_cup():
    """The newest men's World Cup: its season, name and teams [{id, name, code}]."""
    def load():
        seasons = (_get("/seasons", idCompetition=WORLD_CUP, count=10).get("Results") or [])
        seasons.sort(key=lambda s: s.get("StartDate") or "", reverse=True)
        if not seasons:
            raise LookupError("FIFA lists no World Cup")
        s = seasons[0]
        teams = _get("/competitions/teams/%s" % s["IdSeason"], count=100).get("Results") or []
        return {"season": s["IdSeason"], "name": _desc(s.get("Name")), "start": s.get("StartDate") or "",
                "teams": [{"id": t.get("IdTeam"), "name": _desc(t.get("Name")), "code": t.get("IdCountry") or ""} for t in teams]}
    return _cached("wc", 6 * 3600, load)


POS = {0: "GK", 1: "DF", 2: "MF", 3: "FW"}


def squad(team_id):
    """A team's World Cup squad: [{id, name, short, number, line, side, height, weight, born, foot}]."""
    wc = world_cup()
    team_id = str(int(team_id))

    def load():
        d = _get("/teams/%s/squad" % team_id, idCompetition=WORLD_CUP, idSeason=wc["season"])
        out = []
        for p in d.get("Players") or []:
            out.append({"id": p.get("IdPlayer"), "name": _desc(p.get("PlayerName")), "short": _desc(p.get("ShortName")),
                        "number": p.get("JerseyNum"), "line": POS.get(p.get("RealPosition", p.get("Position"))),
                        "side": p.get("RealPositionSide"), "height": p.get("Height"), "weight": p.get("Weight"),
                        "born": (p.get("BirthDate") or "")[:10], "foot": p.get("PreferredFoot")})
        return {"team": team_id, "name": _desc(d.get("TeamName")), "code": d.get("IdCountry") or "", "competition": wc["name"], "players": out}
    return _cached("squad:" + team_id, 6 * 3600, load)
