"""Squads from the open Transfermarkt dataset (github.com/dcaribou/transfermarkt-datasets, refreshed regularly).

It covers about 800 clubs in 65 competitions, including leagues eFootball doesn't have (Bundesliga, Saudi Pro League,
Austria, Greece, Croatia, Serbia, Norway, Sweden ...): name, position, birth date, foot, height, nationality and market
value per player, plus each club's coach and stadium. There are no shirt numbers or detailed abilities; the studio
estimates abilities from market value and age, as it does for spreadsheet imports.
"""
import csv
import gzip
import io
import re
import threading
import time
import unicodedata
import urllib.request

import names

BASE = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/"
UA = "Mozilla/5.0 (compatible; PES21-Option-Studio)"
_lock = threading.Lock()
_data = {"at": 0, "clubs": None, "players": None, "comps": None}
TTL = 24 * 3600

# names that don't match on their own: studio name (normalised) -> Transfermarkt club ID
ALIASES = {"fc bayern munchen": "27", "bayern munchen": "27", "sk slavia praha": "62", "slavia praha": "62", "fk crvena zvezda": "159",
           "crvena zvezda": "159", "olympiacos fc": "683", "olympiacos": "683", "olympiakos piraeus": "683", "al akhdoud": "71665"}
NOT = {"real sociedad b"}  # reserve teams must not take the first team's squad

STOP = {"fc", "cf", "afc", "sc", "ac", "club", "de", "cd", "ca", "fk", "sk", "sv", "the", "calcio", "football", "futbol", "futebol",
        "clube", "do", "da", "di", "la", "le", "del", "y", "e", "1", "sport", "sports", "sporting", "vfl", "vfb", "tsg", "bv", "fsv",
        "gnk", "pfc", "ff", "tc", "as", "fussballclub", "fotballklubben", "sportsklubben", "fotbollforening", "sportklub", "saudi"}


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower().replace("ß", "ss").replace("ø", "o")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def reserve_mark(s):
    """'b', 'ii', 'u21' ... for reserve and youth sides, '' for a first team: the two must never be matched to each other."""
    m = re.search(r"\b(b|ii|iii|u ?\d\d|reserves?|youth|juniors?|juvenil)\b", norm(s))
    return m.group(1).replace(" ", "") if m else ""


def _words(s):
    return [w for w in norm(s).split() if w not in STOP and not re.fullmatch(r"(18|19|20)\d\d", w)]


def _core(s):
    return set(_words(s))


def _csv(name):
    req = urllib.request.Request(BASE + name + ".csv.gz", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        raw = r.read()
    return list(csv.DictReader(io.TextIOWrapper(gzip.GzipFile(fileobj=io.BytesIO(raw)), encoding="utf-8")))


def load():
    """The dataset, downloaded at most once a day (about 4.5 MB)."""
    with _lock:
        if _data["clubs"] is not None and time.time() - _data["at"] < TTL:
            return _data
        clubs = {c["club_id"]: c for c in _csv("clubs")}
        comps = {c["competition_id"]: c for c in _csv("competitions")}
        by_club = {}
        for p in _csv("players"):
            c = clubs.get(p.get("current_club_id"))
            if c and p.get("last_season") and p["last_season"] >= (c.get("last_season") or "0"):  # still at the club
                by_club.setdefault(c["club_id"], []).append(p)
        _data.update(at=time.time(), clubs=clubs, players=by_club, comps=comps)
        return _data


def search(q, limit=6):
    d = load()
    n = norm(q)
    if n in NOT:
        return []
    if n in ALIASES and ALIASES[n] in d["clubs"]:
        c = d["clubs"][ALIASES[n]]
        return [_club(c, d, 1.0)]
    qc = _words(q)
    out = []
    for c in d["clubs"].values():
        cc = _words(c["name"])
        if not cc or not qc:
            continue
        sc = names.score(qc, cc)
        if sc >= 0.5 and d["players"].get(c["club_id"]) and reserve_mark(c["name"]) == reserve_mark(q):
            out.append(_club(c, d, sc))
    out.sort(key=lambda x: -x["score"])
    return out[:limit]


def _club(c, d, score):
    comp = d["comps"].get(c.get("domestic_competition_id")) or {}
    return {"id": c["club_id"], "name": c["name"], "league": comp.get("name", ""), "country": comp.get("country_name", ""),
            "season": c.get("last_season"), "players": len(d["players"].get(c["club_id"], [])), "score": round(score, 2)}


def squad(club_id):
    """A club's current players, with its coach and stadium."""
    d = load()
    c = d["clubs"].get(str(club_id))
    if not c:
        raise LookupError("club not in the Transfermarkt dataset")
    ps = []
    for p in d["players"].get(c["club_id"], []):
        ps.append({"id": p["player_id"], "name": p["name"], "position": p["position"], "subPosition": p["sub_position"],
                   "born": p["date_of_birth"][:10], "foot": p["foot"], "height": p["height_in_cm"], "nat": p["country_of_citizenship"],
                   "value": p["market_value_in_eur"], "season": p["last_season"]})
    return {"club": _club(c, d, 1.0), "coach": c.get("coach_name") or "", "stadium": c.get("stadium_name") or "", "players": ps}
