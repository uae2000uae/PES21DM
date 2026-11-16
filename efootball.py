"""eFootball data from PES Master (www.pesmaster.com): the team list, current squads and player records.

eFootball is Konami's current game. Its team and player IDs are the ones PES 2021 uses (Manchester United is 100,
David de Gea 40571), its country codes match too, and its abilities map almost one to one onto PES 2021. PES Master
publishes every player page with the full record embedded as JSON (`const player = {...};`), which is what we read.

The browser can't fetch other sites, so the studio asks this server (see /api/efootball/* in server.py).
"""
import gzip
import json
import re
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE = "https://www.pesmaster.com"
UA = "Mozilla/5.0 (compatible; PES21-Option-Studio)"
INDEX_FILE = Path(__file__).resolve().parent / "assets" / "efootball-teams.json"
_sem = threading.BoundedSemaphore(4)  # at most four requests to PES Master at a time, from the whole server
_lock = threading.Lock()
_cache = {}  # key -> (expires, value)
_index = None

# what we keep from a player record
PLAYER_KEYS = ["id", "country", "name", "age", "height", "weight", "foot", "position", "squadnumber", "nsquadnumber", "team", "nteam",
               "nat_name", "attacking_playing_style", "weak_foot_usage", "weak_foot_acc", "form", "injury_resistance", "ovr",
               "offensive_awareness", "ball_control", "dribbling", "tight_possession", "low_pass", "lofted_pass", "finishing", "heading",
               "set_piece_taking", "curl", "speed", "acceleration", "kicking_power", "jumping", "physical_contact", "balance", "stamina",
               "defensive_awareness", "tackling", "defensive_engagement", "aggression", "gk_awareness", "gk_catching", "gk_parrying",
               "gk_reflexes", "gk_reach", "trickster", "mazing_run", "speeding_bullet", "incisive_run", "long_ball_expert", "early_crosser",
               "long_ranger"]
_EXTRA = re.compile(r"^(s_|pos_)")
# A regular player's ID fits the game's 4-byte field (PES 2021 and eFootball share them, e.g. 40571). Special event cards
# (Epic, Highlight, Player of the Week ...) have long IDs like 52873731815607 and are versions of a regular player, not
# squad members: an unlicensed shell team such as "München RW" lists only those cards, dozens per real player.
MAX_PLAYER_ID = 2 ** 31 - 1


def _get(path, tries=3):
    url = path if path.startswith("http") else BASE + path
    last = None
    for i in range(tries):
        try:
            with _sem:
                req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Encoding": "gzip"})
                with urllib.request.urlopen(req, timeout=40) as r:
                    data = r.read()
                    if r.headers.get("Content-Encoding") == "gzip":
                        data = gzip.decompress(data)
                    return data.decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise LookupError("not found on PES Master")
            last = e
        except Exception as e:  # network hiccup: wait a little and try again
            last = e
        time.sleep(1.5 * (i + 1))
    raise last


def _cached(key, ttl, fn):
    now = time.time()
    with _lock:
        hit = _cache.get(key)
        if hit and hit[0] > now:
            return hit[1]
    val = fn()
    with _lock:
        if len(_cache) > 20000:
            _cache.clear()
        _cache[key] = (now + ttl, val)
    return val


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower().replace("ø", "o").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


STOP = {"fc", "cf", "afc", "sc", "ac", "club", "de", "cd", "ca", "fk", "sk", "sv", "the", "calcio", "football", "futbol", "futebol",
        "clube", "do", "da", "di", "la", "le", "del", "y", "e", "1", "real", "sporting", "sport"}


def _core(s):
    return [w for w in norm(s).split() if w not in STOP]


# ---------- team list ----------

def build_index():
    """Read every league page (about 60) and list its teams. Slow; the result ships in assets/efootball-teams.json."""
    home = _get("/efootball-2022/")
    leagues = sorted(set(re.findall(r'href="(/[^"/]+/efootball-2022/league/\d+/)"', home)))
    teams = {}
    for lg in leagues:
        try:
            page = _get(lg)
        except Exception:
            continue
        key = lg.split("/")[1]
        for m in re.finditer(r'<div class="team-block" data-name="([^"]*)"[^>]*>\s*<a href="/([^/]+)/efootball-2022/team/(\d+)/">.*?'
                             r'<span class="team-block-name">([^<]*)</span>', page, re.S):
            tid = int(m.group(3))
            if tid not in teams:
                teams[tid] = {"id": tid, "name": _unesc(m.group(1)), "shown": _unesc(m.group(4)), "slug": m.group(2), "league": key}
    return {"at": int(time.time()), "teams": sorted(teams.values(), key=lambda t: t["id"])}


def _unesc(s):
    import html
    return html.unescape(s).strip()


def index(refresh=False):
    global _index
    if refresh:
        data = build_index()
        try:
            INDEX_FILE.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        except OSError:
            pass  # read-only on Cloud Run: keep it in memory
        _index = data
    if _index is None:
        try:
            _index = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
        except Exception:
            _index = build_index()
    return _index


def search(q, national=None, limit=8):
    """Best-matching eFootball teams for a club or nation name."""
    qc = set(_core(q))
    if not qc:
        return []
    out = []
    for t in index()["teams"]:
        nat = t["league"].startswith("national-teams")
        if national is not None and nat != national:
            continue
        best = 0
        for nm in (t["name"], t["shown"]):
            tc = set(_core(nm))
            if not tc:
                continue
            if tc == qc:
                sc = 1.0
            elif tc <= qc or qc <= tc:
                sc = 0.85
            else:
                sc = 0.6 * len(tc & qc) / len(tc | qc)
            best = max(best, sc)
        if best >= 0.5:
            out.append(dict(t, score=round(best, 2)))
    out.sort(key=lambda t: -t["score"])
    return out[:limit]


# ---------- squads and players ----------

def squad(team_id):
    """The team's current squad: [{id, name, pos, ovr}], regular players only (special cards are left out). Cached for six hours."""
    team_id = int(team_id)

    def load():
        page = _get("/team/efootball-2022/team/%d/" % team_id)
        a = page.find("eFootball Players</h2>")
        if a < 0:
            return []
        b = page.find("eFootball Lineup</h2>", a)
        sec = page[a:b if b > 0 else len(page)]
        res, seen = [], set()
        for fig in re.split(r'<figure class="player-card', sec)[1:]:
            pid = re.search(r'/[^/"]+/efootball-2022/player/(\d+)/', fig)
            nm = re.search(r'player-card-name">([^<]*)<', fig)
            if not (pid and nm) or pid.group(1) in seen or int(pid.group(1)) > MAX_PLAYER_ID:
                continue
            seen.add(pid.group(1))
            ovr = re.search(r'player-card-ovr">\s*(\d+)', fig)
            pos = re.search(r'player-card-position"><abbr[^>]*>([^<]*)<', fig)
            res.append({"id": int(pid.group(1)), "name": _unesc(nm.group(1)), "pos": pos.group(1) if pos else "", "ovr": int(ovr.group(1)) if ovr else None})
        return res
    return _cached("squad:%d" % team_id, 6 * 3600, load)


def player(pid):
    """One player's record (bio, abilities, skills, styles, positions). Cached for a day."""
    pid = int(pid)

    def load():
        page = _get("/player/efootball-2022/player/%d/" % pid)
        m = re.search(r"const player = (\{.*?\});\s*\n", page)
        if not m:
            raise LookupError("no player data on the page")
        d = json.loads(m.group(1))
        out = {k: d.get(k) for k in PLAYER_KEYS}
        out.update({k: v for k, v in d.items() if _EXTRA.match(k) and v})
        return out
    return _cached("player:%d" % pid, 24 * 3600, load)


def players(ids):
    """Several player records, fetched four at a time. Unknown IDs come back as {"id": .., "error": ..}."""
    def one(i):
        try:
            return player(i)
        except Exception as e:
            return {"id": int(i), "error": str(e)}
    with ThreadPoolExecutor(4) as ex:
        return list(ex.map(one, ids))


def team_full(team_id):
    """Squad plus every player's record: what the studio needs to build or refresh a team."""
    sq = squad(team_id)
    return {"team": int(team_id), "squad": sq, "players": players([p["id"] for p in sq])}
