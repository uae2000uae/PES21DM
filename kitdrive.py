"""Kit textures from Kit Man Cal's free kit store, a public Google Drive folder.

PES-layout kit sheets (PNG, 2048 x 2048), one folder per season:
  <season, e.g. 2026-27>/domestic/<country>_<tier>_<n>_<league>/<team>_<type>_<variant>_<kind>.png
  <season>/international/<continent>/<country>_<type>_<variant>_<kind>.png
type 1 home, 2 away, 3 alternate (third), 4 goalkeeper; variant 0, 1, 2... are versions of the same kit.
The studio's kit slots take: 1st = home, 2nd = away, 3rd = alternate, GK 1st and GK 2nd = the first two goalkeeper
kits, each the lowest variant.

The folder is read through Drive's public folder page (no key, no sign-in), one season at a time, kept for a day.
A file is fetched by its Drive ID and must be a PNG.
"""
import os
import re
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import names
from ghlogos import _words, norm, reserve_mark

ROOT_ID = os.environ.get("KIT_DRIVE_FOLDER") or "1-CFRC_zh1THhf9D94k0IoUozfrcl32_l"
LIST = "https://drive.google.com/embeddedfolderview?id=%s"
FILE = "https://drive.google.com/uc?export=download&id=%s"
UA = "Mozilla/5.0 (PES2021-Option-Studio)"
ID_OK = re.compile(r"^[A-Za-z0-9_-]{20,80}$")
ENTRY = re.compile(r'id="entry-([A-Za-z0-9_-]+)".*?<a href="([^"]+)".*?flip-entry-title">([^<]*)<', re.S)
KIT = re.compile(r"^(.+?)_([1-4])_(\d+)_[a-z0-9_]+\.png$")
SEASON = re.compile(r"^(\d{4})-(\d{2})$")
MAX_BYTES = 12 * 1024 * 1024
# the folder's country words -> the names a team's Country field may use
COUNTRY = {"usa": "united states", "us": "united states", "saudi": "saudi arabia", "uae": "united arab emirates",
           "korea": "south korea", "turkiye": "turkey", "holland": "netherlands", "czechia": "czech republic"}
_lock = threading.Lock()
_seasons = {"at": 0, "items": {}}   # season -> folder id
_index = {}                         # season -> {"at": time, "teams": [...]}


def _get(url, limit=4 * 1024 * 1024):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        data = r.read(limit + 1)
        if len(data) > limit:
            raise ValueError("too large")
        return data, (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()


def _list(folder):
    """[(id, name, is folder)] of a public Drive folder."""
    html = _get(LIST % folder)[0].decode("utf-8", "replace")
    out = []
    for fid, href, title in ENTRY.findall(html):
        name = title.replace("&amp;", "&").replace("&#39;", "'").strip()
        out.append((fid, name, "/folders/" in href))
    return out


def seasons():
    """{season: folder id}, e.g. {"2026-27": "..."}."""
    with _lock:
        if _seasons["items"] and _seasons["at"] > time.time() - 24 * 3600:
            return _seasons["items"]
    items = {n: i for i, n, d in _list(ROOT_ID) if d and SEASON.match(n)}
    if not items:
        raise LookupError("the kit store lists no season")
    with _lock:
        _seasons.update(at=time.time(), items=items)
    return items


def _country(s):
    s = norm(s)
    return COUNTRY.get(s, s)


def _season_index(season):
    """Every team of a season: {key, words, league, country ('' unknown), nat, kits {(type, variant): (id, file)}}."""
    with _lock:
        c = _index.get(season)
        if c and c["at"] > time.time() - 24 * 3600:
            return c["teams"]
    sid = seasons().get(season)
    if not sid:
        raise LookupError("no such season")
    leaves = []  # (folder id, folder name, national)
    for fid, name, d in _list(sid):
        if not d:
            continue
        nat = norm(name) == "international"
        for lid, lname, ld in _list(fid):
            if ld and not re.match(r"^\d", lname):  # 00_competitions: not teams
                leaves.append((lid, lname, nat))
    with ThreadPoolExecutor(max_workers=6) as ex:
        lists = list(ex.map(lambda x: _safe_list(x[0]), leaves))
    teams = {}
    for (lid, lname, nat), files in zip(leaves, lists):
        m = re.match(r"^([a-z_]+?)_\d+_\d+_", lname)
        country = "" if nat or not m or m.group(1) == "world" else _country(m.group(1).replace("_", " "))
        for fid, fname, d in files:
            k = KIT.match(fname.lower())
            if d or not k:
                continue
            t = teams.setdefault((lname, k.group(1)), {"key": k.group(1), "words": _words(k.group(1).replace("_", " ")),
                                                      "league": lname, "country": country, "nat": nat, "kits": {}})
            t["kits"][(int(k.group(2)), int(k.group(3)))] = (fid, fname)
    out = list(teams.values())
    if not out:
        raise LookupError("the kit store lists no kits for %s" % season)
    with _lock:
        _index[season] = {"at": time.time(), "teams": out}
    return out


def _safe_list(folder):
    try:
        return _list(folder)
    except Exception:
        return []


def _slots(kits):
    """The studio's five kit slots from a team's files."""
    out = {}
    for typ, slot in ((1, "1st"), (2, "2nd"), (3, "3rd")):
        v = sorted(x for x in kits if x[0] == typ)
        if v:
            out[slot] = {"id": kits[v[0]][0], "file": kits[v[0]][1]}
    gk = sorted(x for x in kits if x[0] == 4)
    for x, slot in zip(gk, ("GK 1st", "GK 2nd")):
        out[slot] = {"id": kits[x][0], "file": kits[x][1]}
    return out


def _season_key(s):
    """'2026/27', '2026-2027', '2026' -> '2026-27'."""
    m = re.search(r"(\d{4})(?:\D+(\d{2,4}))?", str(s or ""))
    if not m:
        return ""
    y = int(m.group(1))
    return "%d-%02d" % (y, int(m.group(2)[-2:]) if m.group(2) else (y + 1) % 100)


def _match(teams, name, country, nat):
    want = _words(name)
    if not want:
        return None
    wc = _country(country)
    scored = []
    for t in teams:
        if t["nat"] != nat or reserve_mark(t["key"].replace("_", " ")) != reserve_mark(name):
            continue
        sc = names.score(want, t["words"])
        if sc < names.STRONG:
            continue
        same = None  # unknown
        if not nat and wc and t["country"]:
            a, b = wc.split(), t["country"].split()
            same = a[:len(b)] == b or b[:len(a)] == a
        if same is False:
            continue  # a club of that name in another country
        scored.append((sc, 1 if same else 0, t))
    if not scored:
        return None
    scored.sort(key=lambda x: (-x[0], -x[1]))
    top = scored[0]
    if any(s[0] == top[0] and s[1] == top[1] and s[2]["key"] != top[2]["key"] for s in scored[1:]) and top[0] < 1:
        return None  # two different clubs fit equally
    return top[2]


def find(name, country="", nat=False, season=""):
    """The kits of a team: {team, league, season, kits: {slot: {id, file, season}}} or None. The season asked for
    first; a slot it doesn't have yet comes from the season before (the store's new season fills up over the year)."""
    have = sorted(seasons(), reverse=True)
    want = _season_key(season)
    order = [s for s in have if s <= want] if want and any(s <= want for s in have) else have
    out = None
    for s in order[:2]:
        t = _match(_season_index(s), name, country, bool(nat))
        if not t:
            continue
        if not out:
            out = {"team": t["key"].replace("_", " "), "league": t["league"], "season": s, "kits": {}}
        for slot, k in _slots(t["kits"]).items():
            out["kits"].setdefault(slot, dict(k, season=s))
    return out if out and out["kits"] else None


def image(fid):
    """(bytes, content type) of one kit file. Only a PNG is passed on."""
    if not ID_OK.match(fid or ""):
        raise ValueError("bad id")
    data, _ = _get(FILE % urllib.parse.quote(fid), MAX_BYTES)
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a kit image")
    return data, "image/png"
