"""Will PES 2021 import this? Checks an export (ZIP or folder) the way the game reads it, before it goes on the USB drive.

Usage:
  python -I check_export.py <export.zip|folder> [--baseline <zip|folder>] [--repo <studio folder>] [--json out.json]

What it reads: only team files (.ted) and competition files (.ced), found by their content (size and header type, never by
file name or folder), and the images those files name, found by file name anywhere in the package, ignoring case. That is
how the game links files (rule book, "Any name works for any file"; DATABASE_RULES 5a).

--baseline   the option file or last confirmed export the game already has. Needed for a "Changes only" export: an image
             a team file names but the package doesn't carry is fine when the game already has it. Also lists what changed,
             by team code, competition code and image name.
--repo       the studio folder (default: found by walking up from this script). Used to read the game's team codes
             (assets/pes21-teams.json) and the competition code/slot pairs (COMP_SLOT in js/app-game-files.js), so the
             check never keeps its own copy of them.

Exit code 0 when nothing must be fixed, 1 when something must, 2 when the input can't be read.
"""
import sys, os, re, io, json, zipfile, hashlib, struct, argparse, collections, unicodedata

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

TED_SIZE, CED_SIZE = 14820, 852
T, A, PSTART, PLEN = 80, 756, 2328, 312
IMGLEN = 33
NAME_MAX = 31  # longest image name an export writes, extension included (PES_NAME_MAX)
# where a team file names its images (decrypted body offsets), and the size the game expects for each kind
# levels: "must" = the game refuses the file or shows the wrong thing; "should" = it imports but looks wrong or wastes
# space; "note" = a studio convention, or something only a baseline can settle
TED_IMG = [("crest", 503), ("stadium", 536), ("sponsor board 1", 569), ("sponsor board 2", 602), ("sponsor board 3", 635),
           ("manager photo", 723)] + [("kit " + k, 1766 + 132 * i) for i, k in enumerate(["1st", "2nd", "GK 1st", "3rd", "GK 2nd"])]
CED_EMB = 804
SIZE_OF = {"crest": (256, 256), "competition logo": (256, 256), "manager photo": (256, 256), "stadium": (1024, 512),
           "sponsor board": (256, 128), "kit": (2048, 2048)}
POS = ["GK", "CB", "LB", "RB", "DMF", "CMF", "LMF", "RMF", "AMF", "LWF", "RWF", "SS", "CF"]


def kind_of(field):
    for k in SIZE_OF:
        if field.startswith(k):
            return k
    return field


# ---------------------------------------------------------------- reading the package
class Package:
    """A ZIP or a folder, read as a flat list of files (path -> lazy bytes)."""

    def __init__(self, src):
        self.src = src
        self.is_dir = os.path.isdir(src)
        self.paths, self.dirs, self._zip = [], set(), None
        if self.is_dir:
            for root, ds, fs in os.walk(src):
                rel = os.path.relpath(root, src).replace("\\", "/")
                if rel != ".":
                    self.dirs.add(rel)
                for f in fs:
                    self.paths.append(os.path.relpath(os.path.join(root, f), src).replace("\\", "/"))
        else:
            self._zip = zipfile.ZipFile(src)
            for i in self._zip.infolist():
                if i.is_dir():
                    self.dirs.add(i.filename.rstrip("/"))
                else:
                    self.paths.append(i.filename)
                    d = os.path.dirname(i.filename)
                    while d:
                        self.dirs.add(d)
                        d = os.path.dirname(d)
        self.paths.sort()

    def size(self, p):
        return os.path.getsize(os.path.join(self.src, p)) if self.is_dir else self._zip.getinfo(p).file_size

    def head(self, p, n):
        if self.is_dir:
            with open(os.path.join(self.src, p), "rb") as f:
                return f.read(n)
        with self._zip.open(p) as f:
            return f.read(n)

    def read(self, p):
        if self.is_dir:
            with open(os.path.join(self.src, p), "rb") as f:
                return f.read()
        return self._zip.read(p)

    def fingerprint(self, p):
        """Cheap identity of a file's bytes: the ZIP's CRC and size, or a hash for a folder."""
        if self.is_dir:
            return hashlib.sha1(self.read(p)).hexdigest()
        i = self._zip.getinfo(p)
        return "%08x-%d" % (i.CRC, i.file_size)

    def empty_dirs(self):
        used = set()
        for p in self.paths:
            d = os.path.dirname(p)
            while d:
                used.add(d)
                d = os.path.dirname(d)
        return sorted(self.dirs - used)


def decrypt(raw):
    key = raw[69:80] + raw[48:69]
    d = bytearray(raw)
    for i in range(80, len(raw)):
        d[i] = raw[i] ^ key[(i - 80) % 32]
    return d


num = lambda d, o, n: int.from_bytes(d[o:o + n], "little")


def text(d, o, n):
    return bytes(d[o:o + n]).split(b"\0")[0].decode("utf-8", "replace").strip()


def bits(d, o, b, n):
    v, fb, f0 = 0, o + (b >> 3), b & 7
    for i in range(n):
        bi, bt = fb + ((f0 + i) >> 3), (f0 + i) & 7
        v |= ((d[bi] >> bt) & 1) << i
    return v


def game_type(head):
    return {24: "ted", 25: "ced"}.get(head[0]) if len(head) > 80 else None


def png_size(head):
    if head[:8] != b"\x89PNG\r\n\x1a\n" or head[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", head[16:24])


# ---------------------------------------------------------------- the studio's own lists (never copied here)
def find_repo(start):
    d = os.path.abspath(start)
    while True:
        if os.path.exists(os.path.join(d, "check.py")) and os.path.isdir(os.path.join(d, "js")):
            return d
        up = os.path.dirname(d)
        if up == d:
            return None
        d = up


def load_repo_lists(repo):
    codes, slots = None, None
    if not repo:
        return codes, slots
    try:
        data = json.load(open(os.path.join(repo, "assets", "pes21-teams.json"), encoding="utf-8"))
        codes = {t["id"]: t for t in data.get("teams", [])}
    except Exception:
        pass
    try:
        src = open(os.path.join(repo, "js", "app-game-files.js"), encoding="utf-8").read()
        m = re.search(r"const COMP_SLOT=\{(.*?)\};", src, re.S)
        if m:
            body = re.sub(r"//[^\n]*", "", m.group(1))
            slots = {int(a): int(b) for a, b in re.findall(r"(\d+)\s*:\s*(\d+)", body)}
    except Exception:
        pass
    return codes, slots


# ---------------------------------------------------------------- findings
class Report:
    LEVELS = ("must", "should", "note")
    LABEL = {"must": "Must fix", "should": "Should fix", "note": "Good to know"}

    def __init__(self):
        self.items = collections.OrderedDict()  # (level, problem) -> {"why":..., "where": [...]}

    def add(self, level, problem, why, where):
        k = (level, problem)
        if k not in self.items:
            self.items[k] = {"why": why, "where": []}
        self.items[k]["where"].append(where)

    def count(self, level):
        return sum(len(v["where"]) for (lv, _), v in self.items.items() if lv == level)


def check(pkg, base, codes, slots):
    R = Report()
    info = {"team_files": 0, "comp_files": 0, "images": 0, "players": 0, "mode": "first install", "new_images": {}}
    by_name = collections.defaultdict(list)  # lower-case base name -> paths
    for p in pkg.paths:
        by_name[os.path.basename(p).lower()].append(p)
    if any(os.path.basename(p).lower() == "changes.txt" for p in pkg.paths):
        info["mode"] = "changes only"

    base_names, base_fp, base_codes, base_idx = None, None, set(), None
    if base:
        base_names = set(os.path.basename(p).lower() for p in base.paths)
        base_idx = index_game(base)
        base_codes = set(base_idx[0])
        base_fp = base_idx[2]

    teams, comps = collections.defaultdict(list), collections.defaultdict(list)
    named = {}  # image base name (lower) -> list of (kind, who)
    game_files = set()
    for p in pkg.paths:
        size = pkg.size(p)
        if size not in (TED_SIZE, CED_SIZE):
            continue
        raw = pkg.read(p)
        kind = game_type(raw)
        if not kind:
            continue
        game_files.add(p)
        d = decrypt(raw)
        if num(raw, 8, 4) != len(raw) - 80 or hashlib.sha256(bytes(d[80:])).digest() != bytes(raw[48:80]):
            R.add("must", "Game file damaged (size or checksum wrong)",
                  "The game checks the header; a file patched after it was written, or cut short, is refused. "
                  "Write game files only through TED.build / TED.encrypt / CED.build.", p)
            continue
        if kind == "ted" and size == TED_SIZE:
            info["team_files"] += 1
            check_team(R, p, d, teams, named, codes, info, base_codes)
        elif kind == "ced" and size == CED_SIZE:
            info["comp_files"] += 1
            check_comp(R, p, d, comps, named, slots)
        else:
            R.add("must", "Game file of the wrong size",
                  "A team file is exactly 14,820 bytes and a competition file 852.", p)

    for code, ps in teams.items():
        if len(ps) > 1:
            R.add("must", "Two team files for one team code",
                  "The game reads files ticked together in file-name order and the last one wins; an export carries one "
                  "file per code (DATABASE_RULES 5a.2).", "code %d: %s" % (code, ", ".join(ps)))
    for code, ps in comps.items():
        if len(ps) > 1:
            R.add("must", "Two competition files for one competition code",
                  "One competition file per code.", "code %d: %s" % (code, ", ".join(ps)))

    # images: every name a game file gives, found by name anywhere in the package
    used_paths = set()
    for name, refs in sorted(named.items()):
        hits = by_name.get(name) or by_name.get(name + ".png") or []
        who = "; ".join(sorted(set("%s (%s)" % (w, k) for k, w in refs)))
        if not hits:
            if base_names is not None and (name in base_names or name + ".png" in base_names):
                continue  # the game already has it
            if base_names is None:
                R.add("note", "Image named but not in this package",
                      "Fine when the game already has an image of that name (Changes only, or the game's own pictures); "
                      "run again with --baseline to know.", "%s, named by %s" % (name, who))
            else:
                R.add("should", "Image named but missing",
                      "Neither this package nor the baseline has it, so the game shows a blank or its own picture there. "
                      "Tick the image, or clear the name in the health check.", "%s, named by %s" % (name, who))
            continue
        used_paths.update(hits)
        kinds = set(kind_of(k) for k, _ in refs)
        if base_names is not None and name not in base_names and name + ".png" not in base_names:
            for k in kinds:
                info["new_images"][k] = info["new_images"].get(k, 0) + 1
        if len(kinds) > 1:
            R.add("should", "One image used as two kinds",
                  "One file can't be the right size for both.", "%s: %s" % (name, ", ".join(sorted(kinds))))
        fps = set(pkg.fingerprint(h) for h in hits)
        if len(fps) > 1:
            R.add("should", "Two different pictures with one image name",
                  "The game keeps one image per name, so one of them is lost.", "%s: %s" % (name, ", ".join(hits)))
        h = hits[0]
        info["images"] += 1
        wh = png_size(pkg.head(h, 33))
        if not wh:
            R.add("should", "Image is not a PNG",
                  "The studio writes PNG only. Some option files carry JPGs; whether the game shows them is not tested.", h)
            continue
        for k in kinds:
            want = SIZE_OF.get(k)
            if want and tuple(wh) != want and not (base_fp and base_fp.get(os.path.basename(h).lower()) == pkg.fingerprint(h)):
                R.add("note", "Image not at the size the studio writes",
                      "Option files carry other sizes and the game shows them; the studio writes these sizes (rule book, "
                      "Images). Unchanged baseline images are not listed.",
                      "%s is %dx%d, %s wants %dx%d" % (h, wh[0], wh[1], k, want[0], want[1]))
        base_name = os.path.basename(h)
        if len(base_name) > NAME_MAX or not re.fullmatch(r"[\x20-\x7e]+", base_name):
            R.add("note", "Image name longer than 31 characters or not plain ASCII",
                  "The game's name field holds 32 bytes; studio exports write plain ASCII of 31 or fewer (pesName).", h)
        elif not re.fullmatch(r"[EKMSPC]\d{4}\.png", base_name, re.I):
            R.add("note", "Image not named by type letter and number",
                  "Exports name images E/K/M/S/P/C + 4 digits (DATABASE_RULES 5b). Fine for the game, not the studio's layout.",
                  h)

    for p in pkg.paths:
        low = p.lower()
        if p in game_files or p in used_paths:
            continue
        if low.endswith(".png"):
            R.add("should", "Image no game file names",
                  "The game never shows it, and it takes a place in the image store. Exports leave these out by default.", p)
        elif os.path.basename(low) == "changes.txt" or "/_read me/" in "/" + low or low.startswith("_read me/"):
            continue
        elif low.endswith((".ted", ".ced")):
            R.add("must", "File named like a game file but not one",
                  "Wrong size or header: the game refuses it.", p)
        else:
            R.add("note", "File for people, not the game",
                  "Exports put these under _Read me/ (DATABASE_RULES 6.1a).", p)

    for d in pkg.empty_dirs():
        R.add("should", "Empty folder", "Exports make only folders that get a file (CLAUDE.md).", d + "/")

    diff = None
    if base:
        pkg_idx = index_game(pkg)
        diff = compare(base_idx, pkg_idx)
        taken_players(R, base_idx[0], pkg_idx[0], codes)
    return R, info, diff


def check_team(R, p, d, teams, named, codes, info, base_codes):
    code = num(d, T, 4)
    name = text(d, T + 104, 70)
    who = "%s %s" % (code, name)
    teams[code].append(p)
    if code == 0:
        R.add("must", "Team file with code 0", "No ID is 0; the game has no team there.", p)
    elif codes is not None and code not in codes and code not in base_codes:
        R.add("must" if base_codes else "should", "Team code the game doesn't have",
              "The game only overwrites teams it has; Import Team refuses this file (\"the team to import data to does "
              "not exist\"). Give the team a free code on Game codes. (The code list leaves out a few game teams, "
              "such as THE ICONS 2704 and THE LEGENDS 2703; --baseline settles it.)", "%s (%s)" % (who, p))
    if num(d, A, 4) != code:
        R.add("must", "Team code differs between the team block and the squad block",
              "Both hold the team ID (bytes 80 and 756); TED.build writes both.", "%s: squad block says %d" % (who, num(d, A, 4)))
    fn = os.path.basename(p)
    if not re.fullmatch(r"%d\.ted" % code, fn, re.I):
        R.add("note", "Team file not named <team code>.ted",
              "The game takes any name; studio exports use the code (DATABASE_RULES 5b).", "%s is %s" % (who, fn))
    short = text(d, T + 174, 4)
    if short and not re.fullmatch(r"[A-Z0-9]{3}", short):
        lv = "note" if re.fullmatch(r"[A-Z0-9]{1,3}", short) else "should"
        R.add(lv, "Short name not 3 capitals",
              "The studio writes 3 capital letters; option files have some 2-letter ones (GS, CC) that the game shows.",
              "%s: %r" % (who, short))
    for field, off in TED_IMG:
        n = text(d, off, IMGLEN)
        if n:
            named.setdefault(n.lower(), []).append((field, who))

    places = [num(d, A + 4 + i * 4, 4) for i in range(40)]
    numbers = [num(d, A + 164 + i * 2, 2) for i in range(40)]
    order = list(d[A + 768:A + 808])
    filled = [i for i, x in enumerate(places) if x]
    info["players"] += len(filled)
    if not filled:
        return  # a team-info file: the game keeps its own squad
    gaps = [i + 1 for i in range(max(filled) + 1) if not places[i]]
    if [g for g in gaps if g <= 18]:
        R.add("must", "Gap in the first 18 squad places",
              "A gap in places 1-18 makes the game refuse the file (DATABASE_RULES 6.7c).", "%s: empty places %s" % (who, gaps))
    elif gaps:
        R.add("should", "Gap in the squad places", "Places are filled from 1 with no gaps.", "%s: empty places %s" % (who, gaps))
    listed = [v for v in order if v < 40]
    miss = [i + 1 for i in filled if i not in listed]
    if miss:
        R.add("must", "Player not in the squad order table",
              "The game draws only the places the order table lists and shows the rest as empty \"---\" rows "
              "(DATABASE_RULES 6.7c).", "%s: places %s" % (who, miss))
    if len(listed) != len(set(listed)):
        R.add("should", "Squad order table lists a place twice",
              "TED.build writes each place once; rebuild the team file.", who)
    nums = [numbers[i] for i in filled]
    bad = sorted(set(n for n in nums if not 1 <= n <= 99))
    dup = sorted(n for n, c in collections.Counter(nums).items() if c > 1 and 1 <= n <= 99)
    if bad or dup:
        R.add("must", "Shirt numbers outside 1-99 or used twice",
              "Each number 1-99 once per squad (rule book, Squads). Not tested in the game: the 2026-27 option file's own "
              "national teams carry repeated numbers and are installed.", "%s: %s" % (who, ", ".join(filter(None, [
                  bad and "out of range %s" % bad, dup and "twice %s" % dup]))))
    pid_dup = sorted(x for x, c in collections.Counter(places[i] for i in filled).items() if c > 1)
    if pid_dup:
        R.add("must", "One player ID twice in a squad", "One entry per player ID.", "%s: %s" % (who, pid_dup))
    gk, norec = 0, []
    for i in filled:
        r = d[PSTART + i * PLEN:PSTART + (i + 1) * PLEN]
        if num(r, 0, 4) != places[i]:
            norec.append(i + 1)
            continue
        if bits(r, 32, 13, 4) == 0:
            gk += 1
        if not text(r, 54, 61):
            R.add("should", "Player with no name", "He shows with an empty name.", "%s: place %d" % (who, i + 1))
    if norec:
        R.add("should", "Squad place with no player record in this file",
              "He shows only if the game has his record in another file; else the row is \"---\".",
              "%s: places %s" % (who, norec))
    if len(filled) < 15:
        R.add("should", "Squad under 15 players", "15 or more make a playable squad.", "%s: %d" % (who, len(filled)))
    if not gk and not norec:
        R.add("must", "No goalkeeper", "A squad needs at least one GK.", who)


def check_comp(R, p, d, comps, named, slots):
    code, slot, name = num(d, 80, 4), num(d, 104, 2), text(d, 114, 61)
    who = "%s %s" % (code, name)
    comps[code].append(p)
    if code == 0:
        R.add("must", "Competition file with code 0", "No ID is 0.", p)
    elif slots is not None:
        if code not in slots:
            R.add("must", "Competition code the game doesn't have",
                  "The game finds a competition by its slot; a code with no slot is no place in the game (tests 21-23).",
                  "%s (%s)" % (who, p))
        elif slots[code] != slot:
            R.add("must", "Competition code and slot don't belong together",
                  "The game goes by the slot at byte 104: this file lands on another competition (cedSetCode).",
                  "%s has slot %d, its own is %d" % (who, slot, slots[code]))
    if not re.fullmatch(r"%d\.ced" % code, os.path.basename(p), re.I):
        R.add("note", "Competition file not named <competition code>.ced",
              "The game takes any name; studio exports use the code (DATABASE_RULES 5b).", "%s is %s" % (who, os.path.basename(p)))
    n = text(d, CED_EMB, IMGLEN)
    if n:
        named.setdefault(n.lower(), []).append(("competition logo", who))


# ---------------------------------------------------------------- players taken from teams outside the export
def same_player(a, b):
    """Do two names look like one footballer? ("Cristiano Ronaldo" / "C. RONALDO"): a shared word of 3+ letters."""
    def words(x):
        x = unicodedata.normalize("NFD", str(x or "")).encode("ascii", "ignore").decode().upper()
        return set(w for w in re.findall(r"[A-Z0-9]+", x) if len(w) >= 3)
    return bool(words(a) & words(b))


def taken_players(R, base_teams, exp_teams, codes):
    """The game moves a player to the club whose file lists him. A player ID this export adds to a team, which the
    baseline holds in a team this export doesn't rewrite, is taken from that team when the export is imported."""
    nat = lambda c: bool(codes and str((codes.get(c) or {}).get("league", "")).startswith("national"))
    owner = collections.defaultdict(list)
    for c, v in base_teams.items():
        if c not in exp_teams:
            for pid, nm in v[3].items():
                owner[pid].append((c, v[0], nm))
    lost = collections.defaultdict(list)
    for c, v in exp_teams.items():
        old = base_teams[c][3] if c in base_teams else {}
        for pid, nm in v[3].items():
            if pid in old:
                continue
            for oc, ot, on in owner.get(pid, []):
                same = same_player(nm, on)
                if same and nat(oc) != nat(c):
                    continue  # club and country share one ID: both keep him
                lost[(oc, ot)].append((same, nm, on, v[0]))
    for (oc, ot), rows in sorted(lost.items(), key=lambda kv: -len(kv[1])):
        left = len(base_teams[oc][3]) - len(rows)
        other = [r for r in rows if not r[0]]
        moved = [r for r in rows if r[0]]
        if other:
            eg = other[0]
            R.add("should", "Player ID of a team outside this export given to a different player",
                  "The game moves a player to the club whose file lists his ID, and overwrites his name and ratings: the "
                  "team that had him loses him although its own file isn't in this export. Fine only if that team is being "
                  "given up; otherwise give these players other free IDs (Health check, Game codes) or export that team too.",
                  "%d %s loses %d (%d left): e.g. %s becomes %s at %s" % (oc, ot, len(rows), left, eg[2], eg[1], eg[3]))
        if moved:
            eg = moved[0]
            R.add("note", "Player moved from a team outside this export",
                  "Looks like the same player (a transfer): his old team loses him on import, as it should.",
                  "%d %s: %d, e.g. %s to %s" % (oc, ot, len(moved), eg[2], eg[3]))


# ---------------------------------------------------------------- what changed against the baseline
def index_game(pkg):
    teams, comps, imgs = {}, {}, {}
    for p in pkg.paths:
        s = pkg.size(p)
        if s in (TED_SIZE, CED_SIZE):
            raw = pkg.read(p)
            k = game_type(raw)
            if k == "ted" and s == TED_SIZE:
                d = decrypt(raw)
                squad = {}
                for i in range(40):
                    pid = num(d, A + 4 + i * 4, 4)
                    if pid:
                        squad[pid] = text(d, PSTART + i * PLEN + 54, 61)
                teams[num(d, T, 4)] = (text(d, T + 104, 70), hashlib.sha1(raw).hexdigest(), p, squad)
            elif k == "ced" and s == CED_SIZE:
                d = decrypt(raw)
                comps[num(d, 80, 4)] = (text(d, 114, 61), hashlib.sha1(raw).hexdigest(), p)
        elif p.lower().endswith(".png"):
            imgs[os.path.basename(p).lower()] = pkg.fingerprint(p)
    return teams, comps, imgs


def compare(a, b):
    out = {}
    for label, x, y in (("teams", a[0], b[0]), ("competitions", a[1], b[1])):
        out[label] = {
            "new": ["%d %s" % (c, y[c][0]) for c in sorted(set(y) - set(x))],
            "changed": ["%d %s" % (c, y[c][0]) for c in sorted(set(x) & set(y)) if x[c][1] != y[c][1]],
            "not in this export": len(set(x) - set(y)),
        }
    ia, ib = a[2], b[2]
    out["images"] = {"new": sorted(set(ib) - set(ia)), "changed": sorted(k for k in set(ia) & set(ib) if ia[k] != ib[k])}
    return out


# ---------------------------------------------------------------- output
def main():
    ap = argparse.ArgumentParser(description="Will PES 2021 import this export?")
    ap.add_argument("package")
    ap.add_argument("--baseline")
    ap.add_argument("--repo")
    ap.add_argument("--json")
    ap.add_argument("--max", type=int, default=12, help="rows shown per problem (default 12)")
    o = ap.parse_args()
    try:
        pkg = Package(o.package)
        base = Package(o.baseline) if o.baseline else None
    except Exception as e:
        print("Can't read it:", e)
        sys.exit(2)
    repo = o.repo or find_repo(os.path.dirname(os.path.abspath(__file__)))
    codes, slots = load_repo_lists(repo)
    R, info, diff = check(pkg, base, codes, slots)

    must, should = R.count("must"), R.count("should")
    verdict = "NOT READY: %d must-fix problem%s" % (must, "" if must == 1 else "s") if must else (
        "IMPORTS, BUT LOOK FIRST: the game takes the files; %d thing%s change what you see in the game" % (
            should, "" if should == 1 else "s") if should else "READY for PES 2021 import")
    print("=" * 78)
    print(verdict)
    print("=" * 78)
    print("%s (%s): %d team files, %d competition files, %d images named, %d squad places" % (
        os.path.basename(o.package.rstrip("/\\")), info["mode"], info["team_files"], info["comp_files"], info["images"],
        info["players"]))
    if info["new_images"]:
        print("New image names: %s. Each takes a free space in the game's image store for its type; check the free "
              "spaces (Export Option File card, or Import Images in the game) before importing." % ", ".join(
                  "%d %s" % (n, k) for k, n in sorted(info["new_images"].items())))
    if codes is None:
        print("(the game's team-code list was not found: codes not checked; pass --repo)")
    if slots is None:
        print("(the competition slot table was not found: competition slots not checked; pass --repo)")
    for level in Report.LEVELS:
        rows = [(k[1], v) for k, v in R.items.items() if k[0] == level]
        if not rows:
            continue
        print("\n## %s" % Report.LABEL[level])
        for problem, v in rows:
            print("\n- %s (%d)\n  Why: %s" % (problem, len(v["where"]), v["why"]))
            for w in v["where"][:o.max]:
                print("    %s" % w)
            if len(v["where"]) > o.max:
                print("    ... and %d more" % (len(v["where"]) - o.max))
    if diff:
        print("\n## Against the baseline")
        for k in ("teams", "competitions"):
            x = diff[k]
            print("- %s: %d new, %d changed, %d of the baseline's not in this export" % (
                k, len(x["new"]), len(x["changed"]), x["not in this export"]))
            for r in (x["new"][:o.max]):
                print("    + %s" % r)
            for r in (x["changed"][:o.max]):
                print("    ~ %s" % r)
        print("- images: %d new names, %d changed pictures" % (len(diff["images"]["new"]), len(diff["images"]["changed"])))
    if o.json:
        json.dump({"verdict": verdict, "info": info, "diff": diff,
                   "findings": [{"level": k[0], "problem": k[1], "why": v["why"], "where": v["where"]}
                                for k, v in R.items.items()]}, open(o.json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sys.exit(1 if must else 0)


if __name__ == "__main__":
    main()
