"""Clubs, national teams and competitions on Wikidata (query.wikidata.org) and their logos on Wikimedia Commons.

Used for what eFootball and the Transfermarkt dataset leave open: a club's head coach and home stadium, and a logo when
Commons has one (only freely licensed logos are there, so many clubs have none). Everything goes through the query
service, which also runs the name search (the main Wikidata API rate-limits unregistered tools).
"""
import json
import re
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

SPARQL = "https://query.wikidata.org/sparql"
UA = "PES21-Option-Studio/1.0 (personal football data tool)"
_sem = threading.BoundedSemaphore(2)  # the query service asks for few parallel requests
_lock = threading.Lock()
_cache = {}

TYPES = {  # instance-of classes per kind
    "club": "wd:Q476028 wd:Q103229495",
    "national": "wd:Q6979593 wd:Q1194951",
    "comp": "wd:Q15991303 wd:Q1478437 wd:Q623109 wd:Q500834",
}


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def reserve_mark(s):
    """'b', 'ii', 'u21' ... for reserve and youth sides, '' for a first team: the two must never be matched to each other."""
    m = re.search(r"\b(b|ii|iii|u ?\d\d|reserves?|youth|juniors?|juvenil)\b", norm(s))
    return m.group(1).replace(" ", "") if m else ""


class Busy(Exception):
    """The query service is limiting requests (it does so during outages): callers stop asking for a while."""


_busy_until = [0.0]
STOP = {"fc", "cf", "afc", "sc", "ac", "club", "de", "cd", "fk", "sk", "sv", "the", "football", "futbol", "futebol", "clube", "calcio", "national", "team", "men", "s"}


def _query(q):
    if time.time() < _busy_until[0]:
        raise Busy("Wikidata is limiting requests right now; try again in a few minutes")
    url = SPARQL + "?" + urllib.parse.urlencode({"query": q, "format": "json"})
    with _sem:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))["results"]["bindings"]
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = int(e.headers.get("Retry-After") or 60) if str(e.headers.get("Retry-After") or "").isdigit() else 60
                _busy_until[0] = time.time() + max(30, wait)
                raise Busy("Wikidata is limiting requests right now; try again in a few minutes")
            raise


def find(name, kind="club"):
    """Best match for a name: {id, label, logo, coach, stadium, score} or None. Cached for a day."""
    kind = kind if kind in TYPES else "club"
    key = "find:%s:%s" % (kind, norm(name))
    with _lock:
        hit = _cache.get(key)
        if hit and hit[0] > time.time():
            return hit[1]
    term = re.sub(r'["\\\\]', " ", str(name))[:120]
    q = """SELECT ?item ?itemLabel ?logo ?coachLabel ?venueLabel WHERE {
  SERVICE wikibase:mwapi { bd:serviceParam wikibase:api "EntitySearch"; wikibase:endpoint "www.wikidata.org"; mwapi:search "%s"; mwapi:language "en". ?item wikibase:apiOutputItem mwapi:item. }
  ?item wdt:P31 ?type . VALUES ?type { %s }
  OPTIONAL { ?item wdt:P154 ?logo } OPTIONAL { ?item wdt:P286 ?coach } OPTIONAL { ?item wdt:P115 ?venue }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 10""" % (term, TYPES[kind])
    best = None
    want = {w for w in norm(name).split() if w not in STOP}
    for b in _query(q):
        v = {k: x["value"] for k, x in b.items()}
        label = v.get("itemLabel", "")
        if reserve_mark(label) != reserve_mark(name):
            continue
        have = {w for w in norm(label).split() if w not in STOP}
        score = 1.0 if have == want else len(have & want) / max(1, len(have | want))
        score += 0.05 * bool(v.get("logo")) + 0.03 * bool(v.get("coachLabel"))  # prefer the item with data when names tie
        if not best or score > best["score"]:
            best = {"id": v["item"].rsplit("/", 1)[-1], "label": label, "score": round(score, 2),
                    "logo": v.get("logo", "").rsplit("/", 1)[-1] and urllib.parse.unquote(v.get("logo", "").rsplit("/", 1)[-1]) or "",
                    "coach": "" if re.fullmatch(r"Q\d+", v.get("coachLabel", "")) else v.get("coachLabel", ""),
                    "stadium": "" if re.fullmatch(r"Q\d+", v.get("venueLabel", "")) else v.get("venueLabel", "")}
    if best and best["score"] < 0.5:
        best = None
    with _lock:
        _cache[key] = (time.time() + 24 * 3600, best)
    return best


def logo(file_name, width=512):
    """A Commons file rendered as PNG (SVG logos are rasterised by Commons)."""
    f = str(file_name or "").replace(" ", "_")
    if not f or "/" in f or len(f) > 240:
        raise LookupError("no logo")
    url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(f) + "?width=%d" % int(width)
    with _sem:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=40) as r:
            host = urllib.parse.urlparse(r.geturl()).hostname or ""
            if host not in ("upload.wikimedia.org", "commons.wikimedia.org"):
                raise PermissionError("unexpected host")
            data = r.read(5_000_000)
            ctype = (r.headers.get("Content-Type") or "image/png").split(";")[0]
    if not ctype.startswith("image/"):
        raise LookupError("not an image")
    return data, ctype
