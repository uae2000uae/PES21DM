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

import names

SPARQL = "https://query.wikidata.org/sparql"
# Wikimedia throttles clients whose User-Agent has no contact (HTTP 429, Retry-After ~1000 s), so Wikidata never answered;
# this is the same agent logos.py sends to Wikimedia Commons
UA = "PES2021-Option-Studio/1.0 (+https://github.com/uae2000uae/PES21DM)"
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


def side_mark(s):
    """Women's sides and academies share a club's name on Wikidata: never matched to the first team."""
    n = norm(s)
    women = re.search(r"\b(women|womens|ladies|femenin[oa]|feminin[oe]?|frauen|dames|w f c|wfc)\b", n)
    academy = re.search(r"\bacademy\b", n)
    return reserve_mark(s) + ("w" if women else "") + ("a" if academy else "")


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


# Wikidata gives English clubs the United Kingdom as country, and so on
COUNTRY_ALIAS = {"uae": "united arab emirates", "england": "united kingdom", "scotland": "united kingdom", "wales": "united kingdom",
                 "northern ireland": "united kingdom", "usa": "united states", "us": "united states", "united states of america": "united states",
                 "korea republic": "south korea", "republic of korea": "south korea", "ksa": "saudi arabia", "holland": "netherlands",
                 "czech republic": "czechia", "turkiye": "turkey", "ir iran": "iran", "china pr": "people s republic of china",
                 "china": "people s republic of china"}


def _country(s):
    n = norm(s)
    return COUNTRY_ALIAS.get(n, n)


def _words(s):
    # single letters dropped, so "Arsenal F.C." reads as "arsenal"
    return [w for w in norm(s).split() if w not in STOP and len(w) > 1]


def find(name, kind="club", country=""):
    """Best match for a name: {id, label, logo, coach, stadium, score} or None. Cached for a day.
    Many clubs share a name (Arsenal, Al-Shabab ...): the country, when given, picks between them, and a tie it can't
    break gives None rather than another club's coach, stadium and logo."""
    kind = kind if kind in TYPES else "club"
    key = "find:%s:%s:%s" % (kind, norm(name), norm(country))
    with _lock:
        hit = _cache.get(key)
        if hit and hit[0] > time.time():
            return hit[1]
    term = re.sub(r'["\\]', " ", str(name))[:120]
    q = """SELECT ?item ?itemLabel ?logo ?coachLabel ?venueLabel ?countryLabel WHERE {
  SERVICE wikibase:mwapi { bd:serviceParam wikibase:api "EntitySearch"; wikibase:endpoint "www.wikidata.org"; mwapi:search "%s"; mwapi:language "en". ?item wikibase:apiOutputItem mwapi:item. }
  ?item wdt:P31 ?type . VALUES ?type { %s }
  OPTIONAL { ?item wdt:P154 ?logo } OPTIONAL { ?item wdt:P286 ?coach } OPTIONAL { ?item wdt:P115 ?venue } OPTIONAL { ?item wdt:P17 ?country }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 40""" % (term, TYPES[kind])
    want = _words(name)
    cn = _country(country)
    items = {}
    for b in _query(q):
        v = {k: x["value"] for k, x in b.items()}
        label = v.get("itemLabel", "")
        if side_mark(label) != side_mark(name):
            continue
        qid = v["item"].rsplit("/", 1)[-1]
        it = items.setdefault(qid, {"id": qid, "label": label, "logo": "", "coach": "", "stadium": "", "countries": set()})
        logo_file = v.get("logo", "").rsplit("/", 1)[-1]
        if logo_file and not it["logo"]:
            it["logo"] = urllib.parse.unquote(logo_file)
        coach, venue = v.get("coachLabel", ""), v.get("venueLabel", "")
        if coach and not re.fullmatch(r"Q\d+", coach) and not it["coach"]:
            it["coach"] = coach
        if venue and not re.fullmatch(r"Q\d+", venue) and not it["stadium"]:
            it["stadium"] = venue
        if v.get("countryLabel") and not re.fullmatch(r"Q\d+", v["countryLabel"]):
            it["countries"].add(_country(v["countryLabel"]))
    cands = []
    for it in items.values():
        sc = names.score(want, _words(it["label"]))
        if sc < names.STRONG:
            continue
        sure = bool(cn and it["countries"])
        if sure and cn not in it["countries"]:
            continue  # a club of the same name in another country
        cands.append((sc, sure, it))
    best = None
    if cands:
        data = lambda it: bool(it["logo"]) + bool(it["coach"]) + bool(it["stadium"])
        cands.sort(key=lambda c: (-c[0], not c[1], -data(c[2]), int(c[2]["id"][1:] or 0)))
        top = cands[0]
        # equally good items in the country asked for are the same club entered twice (take the fuller one); without a
        # country to confirm them they may be different clubs: take neither
        if top[1] or not any(c[0] == top[0] for c in cands[1:]):
            it = top[2]
            best = {k: it[k] for k in ("id", "label", "logo", "coach", "stadium")}
            best["score"] = round(top[0], 2)
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
