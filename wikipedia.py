"""Current squads from English Wikipedia club articles, with birth dates and heights from Wikidata.

eFootball and the open Transfermarkt dataset cover fixed lists of leagues, so a club that has just come up into a pro
league is in neither (or only with last season's players). Almost every professional club has a Wikipedia article whose
"Players" / "Current squad" section is kept up to date with {{Fs player|no=|nat=|pos=|name=}} entries: shirt number,
nationality (FIFA code), position (GK/DF/MF/FW) and name. Players linked to their own article are looked up on Wikidata
for birth date and height in one query. Loanees out ("Out on loan"), youth, reserve and former players are left out.
"""
import json
import re
import threading
import time
import unicodedata
import urllib.parse
import urllib.request

import names
import wikidata

API = "https://en.wikipedia.org/w/api.php"
UA = wikidata.UA  # Wikimedia wants a User-Agent with a contact, or it throttles
_sem = threading.BoundedSemaphore(3)
_lock = threading.Lock()
_cache = {}
TTL = 6 * 3600

STOP = {"fc", "cf", "afc", "sc", "ac", "club", "de", "cd", "ca", "fk", "sk", "sv", "the", "calcio", "football", "futbol", "futebol",
        "clube", "sport", "sports", "saudi", "f", "c", "s", "a", "k", "csc", "saudi arabia"}
SQUAD_TPL = re.compile(r"^(fs|fs2|football squad|football squad2) ?player$")
# headings whose players are not in the first-team squad
NOT_SQUAD = re.compile(r"loan|reserve|youth|academy|u-?\s?\d\d|under-?\s?\d\d|\bb team|second team|women|former|notable|retired|"
                       r"history|record|captain|award|staff|international|hall of fame|development|ii\b", re.I)

# FIFA trigrams as Wikipedia's squad lists write them -> country names as the studio stores them
_RAW = ("AFG Afghanistan|ALB Albania|ALG Algeria|AND Andorra|ANG Angola|ATG Antigua and Barbuda|ARG Argentina|ARM Armenia|"
        "ARU Aruba|AUS Australia|AUT Austria|AZE Azerbaijan|BAH Bahamas|BHR Bahrain|BAN Bangladesh|BRB Barbados|BLR Belarus|"
        "BEL Belgium|BLZ Belize|BEN Benin|BER Bermuda|BHU Bhutan|BOL Bolivia|BIH Bosnia and Herzegovina|BOT Botswana|BRA Brazil|"
        "BRU Brunei|BUL Bulgaria|BFA Burkina Faso|BDI Burundi|CAM Cambodia|CMR Cameroon|CAN Canada|CPV Cape Verde|"
        "CAY Cayman Islands|CTA Central African Republic|CHA Chad|CHI Chile|CHN China|COL Colombia|COM Comoros|CGO Congo|"
        "COD DR Congo|CRC Costa Rica|CIV Ivory Coast|CRO Croatia|CUB Cuba|CUW Curacao|CYP Cyprus|CZE Czech Republic|DEN Denmark|"
        "DJI Djibouti|DMA Dominica|DOM Dominican Republic|ECU Ecuador|EGY Egypt|SLV El Salvador|ENG England|"
        "EQG Equatorial Guinea|ERI Eritrea|EST Estonia|SWZ Eswatini|ETH Ethiopia|FRO Faroe Islands|FIJ Fiji|FIN Finland|"
        "FRA France|GAB Gabon|GAM Gambia|GEO Georgia|GER Germany|GHA Ghana|GIB Gibraltar|GRE Greece|GRN Grenada|GUM Guam|"
        "GUA Guatemala|GUI Guinea|GNB Guinea-Bissau|GUY Guyana|HAI Haiti|HON Honduras|HKG Hong Kong|HUN Hungary|ISL Iceland|"
        "IND India|IDN Indonesia|IRN Iran|IRQ Iraq|IRL Republic of Ireland|ISR Israel|ITA Italy|JAM Jamaica|JPN Japan|JOR Jordan|"
        "KAZ Kazakhstan|KEN Kenya|KOR South Korea|PRK North Korea|KVX Kosovo|KOS Kosovo|KUW Kuwait|KGZ Kyrgyzstan|LAO Laos|"
        "LVA Latvia|LBN Lebanon|LES Lesotho|LBR Liberia|LBY Libya|LIE Liechtenstein|LTU Lithuania|LUX Luxembourg|MAC Macau|"
        "MAD Madagascar|MWI Malawi|MAS Malaysia|MDV Maldives|MLI Mali|MLT Malta|MTN Mauritania|MRI Mauritius|MEX Mexico|"
        "MDA Moldova|MNG Mongolia|MNE Montenegro|MAR Morocco|MOZ Mozambique|MYA Myanmar|NAM Namibia|NEP Nepal|NED Netherlands|"
        "NCL New Caledonia|NZL New Zealand|NCA Nicaragua|NIG Niger|NGA Nigeria|MKD North Macedonia|NIR Northern Ireland|"
        "NOR Norway|OMA Oman|PAK Pakistan|PLE Palestine|PAN Panama|PNG Papua New Guinea|PAR Paraguay|PER Peru|PHI Philippines|"
        "POL Poland|POR Portugal|PUR Puerto Rico|QAT Qatar|ROU Romania|RUS Russia|RWA Rwanda|SKN Saint Kitts and Nevis|"
        "LCA Saint Lucia|VIN Saint Vincent and the Grenadines|SAM Samoa|SMR San Marino|STP Sao Tome and Principe|"
        "KSA Saudi Arabia|SCO Scotland|SEN Senegal|SRB Serbia|SEY Seychelles|SLE Sierra Leone|SGP Singapore|SIN Singapore|"
        "SVK Slovakia|SVN Slovenia|SOL Solomon Islands|SOM Somalia|RSA South Africa|SSD South Sudan|ESP Spain|SRI Sri Lanka|"
        "SDN Sudan|SUR Suriname|SWE Sweden|SUI Switzerland|SYR Syria|TAH Tahiti|TPE Chinese Taipei|TJK Tajikistan|TAN Tanzania|"
        "THA Thailand|TLS Timor-Leste|TOG Togo|TGA Tonga|TRI Trinidad and Tobago|TUN Tunisia|TUR Turkey|TKM Turkmenistan|"
        "UGA Uganda|UKR Ukraine|UAE United Arab Emirates|USA United States|URU Uruguay|UZB Uzbekistan|VAN Vanuatu|"
        "VEN Venezuela|VIE Vietnam|WAL Wales|YEM Yemen|ZAM Zambia|ZIM Zimbabwe|GLP Guadeloupe|MTQ Martinique|GUF French Guiana|"
        "REU Reunion|MYT Mayotte")
FIFA = {p[:3]: p[4:] for p in _RAW.split("|")}
# codes Wikipedia's flag templates use where FIFA's differ
FIFA.update({"NGR": "Nigeria", "SER": "Serbia", "LIT": "Lithuania", "DRC": "DR Congo", "ZAI": "DR Congo", "SLO": "Slovenia",
             "ROM": "Romania", "CUR": "Curacao", "BUR": "Burkina Faso", "IVC": "Ivory Coast", "KSV": "Kosovo", "MNT": "Montenegro",
             "UK": "England", "GBR": "England", "HOL": "Netherlands"})
POS = {"GK": "GK", "DF": "CB", "MF": "CMF", "FW": "CF"}


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def _words(s):
    s = re.sub(r"\(.*?\)", " ", str(s or ""))  # "Al-Najma SC (Saudi Arabia)": the brackets only tell clubs apart
    return [w for w in norm(s).split() if w not in STOP and len(w) > 1]


def _api(**q):
    q.update(format="json", formatversion="2")
    url = API + "?" + urllib.parse.urlencode(q)
    with _lock:
        hit = _cache.get(url)
        if hit and hit[0] > time.time():
            return hit[1]
    with _sem:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=40) as r:
            data = json.loads(r.read().decode("utf-8"))
    with _lock:
        _cache[url] = (time.time() + TTL, data)
    return data


def _templates(text):
    """Every top-level {{template}} in wikitext with its start offset: [(start, name, [params])]. Brace-aware, so
    {{Fs player|...|other={{small|on loan from [[X]]}}}} stays one template."""
    out, i, n = [], 0, len(text)
    while True:
        i = text.find("{{", i)
        if i < 0:
            return out
        depth, j = 0, i
        while j < n - 1:
            two = text[j:j + 2]
            if two == "{{":
                depth += 1
                j += 2
            elif two == "}}":
                depth -= 1
                j += 2
                if depth == 0:
                    break
            else:
                j += 1
        body = text[i + 2:j - 2]
        parts, cur, d = [], "", 0
        k = 0
        while k < len(body):  # split on | outside nested {{ }} and [[ ]]
            two = body[k:k + 2]
            if two in ("{{", "[["):
                d += 1
                cur += two
                k += 2
                continue
            if two in ("}}", "]]"):
                d -= 1
                cur += two
                k += 2
                continue
            if body[k] == "|" and d == 0:
                parts.append(cur)
                cur = ""
            else:
                cur += body[k]
            k += 1
        parts.append(cur)
        out.append((i, parts[0].strip().lower().replace("_", " "), parts[1:]))
        i = j


def _plain(s):
    """Wikitext to text: [[Target|Shown]] -> Shown, refs, comments, templates and markup removed."""
    s = re.sub(r"<ref[^>]*/>|<ref[^>]*>.*?</ref>|<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"<[^>]+>|'{2,}", "", s)
    return re.sub(r"\s+", " ", s).strip()


def _link(s):
    m = re.search(r"\[\[([^|\]#]+)", s)
    return m.group(1).strip() if m else ""


def parse_squad(text):
    """Players of the first-team squad in a club article: [{no, nat, pos, name, article, onLoanFrom}], and the
    "As of ..." date the list gives."""
    heads = [(m.start(), m.group(2).strip()) for m in re.finditer(r"^(={2,6})\s*(.+?)\s*\1\s*$", text, re.M)]
    def heading_at(pos):
        h = ""
        for at, name in heads:
            if at > pos:
                break
            h = name
        return h
    players, seen, first = [], set(), None
    for at, name, params in _templates(text):
        if not SQUAD_TPL.match(name):
            continue
        if NOT_SQUAD.search(heading_at(at)):
            continue
        kv = {}
        for p in params:
            if "=" in p:
                k, v = p.split("=", 1)
                kv[k.strip().lower()] = v.strip()
        raw = kv.get("name", "")
        nm = _plain(raw)
        if not nm or norm(nm) in seen:
            continue
        seen.add(norm(nm))
        first = at if first is None else first
        nat = kv.get("nat", "").strip()
        no = re.sub(r"\D", "", kv.get("no", ""))
        other = kv.get("other", "")
        loan = re.search(r"on loan from\s*(.+)", _plain(other), re.I)
        players.append({"no": int(no) if no else None, "nat": FIFA.get(nat.upper(), nat if len(nat) > 3 else ""),
                        "pos": POS.get(kv.get("pos", "").strip().upper(), ""), "name": nm, "article": _link(raw),
                        "onLoanFrom": loan.group(1).strip() if loan else ""})
    # the "As of ..." line sits just above the list; elsewhere in the article the phrase dates other things
    m = re.search(r"[Aa]s of\s*:?\s*('{0,3})\s*([0-9]{1,2}\s+\w+\s+[0-9]{4}|\w+\s+[0-9]{1,2},?\s+[0-9]{4}|\w+\s+[0-9]{4})", text[max(0, (first or 0) - 1500):first or 0]) if first is not None else None
    return players, (m.group(2) if m else "")


COUNTRIES = {wikidata._country(c) for c in FIFA.values()}


def _country_of(text):
    """Countries the article files the club under ("Football clubs in Saudi Arabia"); regions and towns
    ("Football clubs in Staffordshire") are left out, so they never rule a club out."""
    out = set()
    for c in re.findall(r"\[\[Category:(?:Association )?[Ff]ootball clubs in ([^|\]]+)", text):
        c = wikidata._country(re.sub(r"^the\s+", "", c.strip(), flags=re.I))
        if c in COUNTRIES:
            out.add(c)
    return out


def find(name, country=""):
    """The club's English Wikipedia article that lists a squad: {title, url, score} or None. Country, when given,
    picks between clubs of the same name (Al-Najma in Bahrain and in Saudi Arabia)."""
    want = _words(name)
    if not want:
        return None
    cn = wikidata._country(country) if country else ""
    titles = []
    for q in dict.fromkeys([name + " football club", name + " " + country + " football", name]):
        try:
            for r in _api(action="query", list="search", srsearch=q.strip(), srlimit=8)["query"]["search"]:
                if r["title"] not in titles:
                    titles.append(r["title"])
        except Exception:
            continue
    cands = []
    for t in titles[:12]:
        if re.search(r"\b(19|20)\d\d[–-]", t) or re.search(r"women|ladies|\bW\.?F\.?C\b|\bLFC\b|reserves|academy|under-?\d\d|\bu\d\d\b|list of|disambiguation", t, re.I):
            continue
        if wikidata.reserve_mark(t) != wikidata.reserve_mark(name):
            continue
        if re.search(r"\s[BC]$", t.strip()) and not re.search(r"\s[BC]$", str(name).strip()):
            continue  # "Real Madrid C", "Barcelona B": reserve sides
        # "United FC (Dubai)" answers both "United FC" and "United FC Dubai"
        sc = max(names.score(want, _words(t)), names.score(want, _words(t.replace("(", " ").replace(")", " "))))
        if sc < names.STRONG:
            continue
        try:
            text = _api(action="parse", page=t, prop="wikitext", redirects=1)["parse"]["wikitext"]
        except Exception:
            continue
        if not re.search(r"\{\{\s*infobox football club", text, re.I):
            continue
        cs = _country_of(text)
        if cn and cs and cn not in cs:
            continue  # a club of the same name in another country
        ps, _ = parse_squad(text)
        cands.append((sc, bool(cn and cn in cs), len(ps), t))
    cands = [c for c in cands if c[2] >= 11] or []
    if not cands:
        return None
    cands.sort(key=lambda c: (-c[0], not c[1], -c[2]))
    top = cands[0]
    if not top[1] and any(c[0] == top[0] and c[3] != top[3] for c in cands[1:]):
        return None  # two clubs fit equally and no country to choose: take neither
    return {"title": top[3], "url": "https://en.wikipedia.org/wiki/" + urllib.parse.quote(top[3].replace(" ", "_")), "score": round(top[0], 2)}


def _qids(titles):
    """Wikidata item of each linked article, through redirects; red links (no article) get none."""
    out = {}
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        try:
            q = _api(action="query", titles="|".join(chunk), redirects=1, prop="pageprops", ppprop="wikibase_item")["query"]
        except Exception:
            continue
        back = {}
        for r in q.get("normalized", []) + q.get("redirects", []):
            back[r["to"]] = back.get(r["from"], r["from"])
        for pg in q.get("pages", []):
            qid = (pg.get("pageprops") or {}).get("wikibase_item")
            if qid:
                out[back.get(pg["title"], pg["title"])] = qid
    return out


def _enrich(players):
    """Birth date and height from Wikidata for players linked to their own article (one query per 60)."""
    qids = _qids(list(dict.fromkeys(p["article"] for p in players if p["article"])))
    info = {}
    ids = list(dict.fromkeys(qids.values()))
    for i in range(0, len(ids), 60):
        q = """SELECT ?p ?born ?h WHERE { VALUES ?p { %s }
  OPTIONAL { ?p wdt:P569 ?born } OPTIONAL { ?p p:P2048/psn:P2048/wikibase:quantityAmount ?h } }""" % " ".join("wd:" + x for x in ids[i:i + 60])
        try:
            rows = wikidata._query(q)
        except Exception:
            break  # Wikidata busy or down: the squad still comes back, without the extras
        for b in rows:
            d = info.setdefault(b["p"]["value"].rsplit("/", 1)[-1], {})
            if "born" in b and "born" not in d:
                d["born"] = b["born"]["value"][:10]
            if "h" in b and "height" not in d:
                try:
                    cm = round(float(b["h"]["value"]) * 100)
                    if 140 <= cm <= 215:
                        d["height"] = cm
                except ValueError:
                    pass
    for p in players:
        d = info.get(qids.get(p["article"], ""), {})
        p["born"] = d.get("born", "")
        p["height"] = d.get("height", "")
    return players


def squad(name, country="", title=""):
    """{club: {title, url, asOf}, players: [...]} for a club, or LookupError when Wikipedia has no squad for it."""
    hit = {"title": title, "url": "https://en.wikipedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"))} if title else find(name, country)
    if not hit:
        raise LookupError("no English Wikipedia article with a current squad for %s" % name)
    text = _api(action="parse", page=hit["title"], prop="wikitext", redirects=1)["parse"]["wikitext"]
    ps, as_of = parse_squad(text)
    if len(ps) < 11:
        raise LookupError("the Wikipedia article %s lists no current squad" % hit["title"])
    return {"club": {"title": hit["title"], "url": hit["url"], "asOf": as_of}, "players": _enrich(ps)}


# ---------- logos: the image at the top of the club's or competition's article ----------
INFOBOX = {"club": r"\{\{\s*infobox football club",
           "comp": r"\{\{\s*infobox (football league|football tournament|football competition|sports league|association football competition)"}


def logo(name, kind="club", country=""):
    """The crest or logo the English Wikipedia article shows at its top: {title, url, image, width, height}, or LookupError.
    Wikipedia keeps the logos Commons can't (non-free ones), so it finds many that Wikidata/Commons don't. A club's
    article must have a football club infobox, a competition's a league or tournament one; a club of the same name in
    another country is skipped, and two equal candidates with no country to choose between give none."""
    kind = kind if kind in INFOBOX else "club"
    want = _words(name)
    if not want:
        raise LookupError("no name")
    cn = wikidata._country(country) if country else ""
    titles = []
    qs = [name + " football club", name + " " + country + " football", name] if kind == "club" else [name + " football", name]
    for q in dict.fromkeys(qs):
        try:
            for r in _api(action="query", list="search", srsearch=q.strip(), srlimit=8)["query"]["search"]:
                if r["title"] not in titles:
                    titles.append(r["title"])
        except Exception:
            continue
    cands = []
    for t in titles[:12]:
        if re.search(r"women|ladies|\bW\.?F\.?C\b|reserves|academy|under-?\d\d|\bu-?\d\d\b|list of|disambiguation|season|history of", t, re.I):
            continue
        if kind == "club" and (re.search(r"\b(19|20)\d\d[–-]", t) or wikidata.reserve_mark(t) != wikidata.reserve_mark(name)):
            continue
        sc = max(names.score(want, _words(t)), names.score(want, _words(t.replace("(", " ").replace(")", " "))))
        if sc < names.STRONG:
            continue
        try:
            text = _api(action="parse", page=t, prop="wikitext", redirects=1)["parse"]["wikitext"]
        except Exception:
            continue
        if not re.search(INFOBOX[kind], text, re.I):
            continue
        cs = _country_of(text) if kind == "club" else set()
        if cn and cs and cn not in cs:
            continue
        # a bracketed qualifier the name doesn't have ("Persija Jakarta (IPL)", a breakaway club) ranks after the plain title
        extra = "(" in t and "(" not in str(name)
        cands.append((sc, bool(cn and cn in cs), t, extra))
    if not cands:
        raise LookupError("no English Wikipedia article for %s" % name)
    cands.sort(key=lambda c: (-c[0], not c[1], c[3]))
    top = cands[0]
    if not top[1] and any(c[0] == top[0] and c[2] != top[2] and c[3] == top[3] for c in cands[1:]):
        raise LookupError("two Wikipedia articles fit %s equally" % name)
    # the page image, free or not (non-free logos are the usual case); a 512-pixel rendering, SVG logos rasterised
    pg = _api(action="query", prop="pageimages", piprop="thumbnail|original", pithumbsize=512, pilicense="any",
              titles=top[2], redirects=1)["query"]["pages"][0]
    im = pg.get("thumbnail") or pg.get("original")
    if not im or not im.get("source"):
        raise LookupError("the Wikipedia article %s shows no logo" % top[2])
    host = urllib.parse.urlparse(im["source"]).hostname or ""
    if host not in ("upload.wikimedia.org", "thumb.wikimedia.org"):
        raise LookupError("unexpected image host")
    return {"title": top[2], "url": "https://en.wikipedia.org/wiki/" + urllib.parse.quote(top[2].replace(" ", "_")),
            "image": im["source"], "width": im.get("width"), "height": im.get("height"), "score": round(top[0], 2)}
