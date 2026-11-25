"""Is the studio's database whole? Checks a project backup or transfer ZIP against docs/DATABASE_RULES.md.

Usage:
  python -I check_backup.py <project-backup.zip|project-transfer.zip> [--before <older backup.zip>] [--json out.json]

The ZIP is what Settings -> Backup on this computer (project-backup.zip, in LOCAL_BACKUP_DIR) or Pack whole project
(project-transfer.zip) writes: project.json with every collection, plus the stored files (blobs/). Option-file images and
team files are o:<package>|<path> references and are not in the ZIP; that is correct (never copy package images).

--before  an older backup of the same project: also lists what changed between the two (teams, players, competitions,
          images, codes), to see what a command really did, or that it did nothing it shouldn't have.

Exit code 0 when nothing breaks a rule, 1 when something does, 2 when the file can't be read.
Read-only: it never changes the backup.
"""
import sys, json, zipfile, argparse, collections, re

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

EDIT_LO, EDIT_HI = 0x40080000, 0x400EFFFF  # IDs the studio made up before 2026-11-22: read as no ID


def load(path):
    z = zipfile.ZipFile(path)
    P = json.loads(z.read("project.json"))
    names = set(z.namelist())
    return P, names


def blen(s):
    return len(str(s or "").encode("utf-8"))


class Report:
    LABEL = {"must": "Breaks a rule", "should": "Worth fixing", "note": "Good to know"}

    def __init__(self):
        self.items = collections.OrderedDict()

    def add(self, level, problem, why, where):
        self.items.setdefault((level, problem), {"why": why, "where": []})["where"].append(where)

    def count(self, level):
        return sum(len(v["where"]) for (lv, _), v in self.items.items() if lv == level)


def check(P, names):
    R = Report()
    C = P.get("collections", {})
    files = P.get("files", {})
    teams = {t["id"]: t for t in C.get("teams", [])}
    comps = {c["id"]: c for c in C.get("comps", [])}
    images = {i["id"]: i for i in C.get("images", [])}
    teds = {t["id"]: t for t in C.get("teds", [])}
    settings = (C.get("settings") or [{}])[0]
    snaps = {s["id"]: s for s in C.get("snaps", [])}
    tname = lambda t: "%s (%s)" % (t.get("name"), t.get("gameId") or "no code")

    def stored(ref):
        """a stored file is in the ZIP; a package file is a reference and is fine"""
        if not ref:
            return False
        if str(ref).startswith("o:"):
            return True
        f = files.get(ref)
        return bool(f and f.get("file") in names)

    # ---- teams
    by_code = collections.defaultdict(list)
    for t in teams.values():
        copy = bool(t.get("sameAsId"))
        if copy and t["sameAsId"] not in teams:
            R.add("must", "Cup copy points at a team that is gone",
                  "A cup copy links to its league club by id (sameAsId); the club must exist.", tname(t))
        if not copy and t["id"] not in teds:
            R.add("must", "Team without its team file",
                  "Every team has exactly one game file (Link rule 2).", tname(t))
        gid = t.get("gameId")
        if gid == 0:
            R.add("must", "Team with code 0", "No ID is 0: a team has a code of the game or no code.", tname(t))
        if gid and not copy and not t.get("noCode"):
            by_code[gid].append(t)
        if t.get("compId") and t["compId"] not in comps:
            R.add("must", "Team filed under a competition that is gone",
                  "Deleting a competition unassigns or deletes its teams (DATABASE_RULES 7.1).", tname(t))
        if blen(t.get("name")) > 70:
            R.add("must", "Team name longer than 70 bytes", "The team file's name field is 70 bytes.", tname(t))
        sh = t.get("short") or ""
        if sh and not re.fullmatch(r"[A-Z0-9]{1,3}", sh):
            R.add("should", "Short name not up to 3 capitals", "PES shows 3 capital letters.", "%s: %r" % (tname(t), sh))
        # image links
        links = [("crest", t.get("emblem")), ("manager photo", t.get("managerPhoto")), ("stadium", t.get("stadiumImg"))]
        links += [("sponsor board %d" % (i + 1), x) for i, x in enumerate(t.get("sponsorImgs") or [])]
        links += [("kit " + str(k.get("slot")), k.get("img")) for k in (t.get("kits") or [])]
        for field, iid in links:
            if iid and iid not in images:
                R.add("must", "Link to an image that is gone",
                      "Deleting an image clears every field that points at it (unlinkImages).", "%s: %s" % (tname(t), field))
        # squad
        ps = t.get("players") or []
        if len(ps) > 40:
            R.add("must", "Squad over 40 players", "A team file holds 40.", "%s: %d" % (tname(t), len(ps)))
        nums = [p.get("number") for p in ps if p.get("number") not in (None, "")]
        nonum = [p.get("name") for p in ps if p.get("number") in (None, "")]
        if nonum and not copy:
            R.add("should", "Players without a shirt number",
                  "The export hands out numbers, but the user can't see them first. Health check, Give numbers.",
                  "%s: %s" % (tname(t), ", ".join(map(str, nonum[:5]))))
        dup = sorted(n for n, c in collections.Counter(nums).items() if c > 1)
        bad = sorted(set(n for n in nums if not (isinstance(n, int) and 1 <= n <= 99)))
        if dup or bad:
            R.add("must", "Shirt numbers repeated or outside 1-99", "Each number 1-99 once per squad.",
                  "%s: %s" % (tname(t), ", ".join(filter(None, [dup and "twice %s" % dup, bad and "out of range %s" % bad]))))
        gids = [p.get("gameId") for p in ps if p.get("gameId")]
        gdup = sorted(g for g, c in collections.Counter(gids).items() if c > 1)
        if gdup:
            R.add("must", "One player game ID twice in a squad", "One entry per player ID.", "%s: %s" % (tname(t), gdup))
        pidc = collections.Counter(p.get("id") for p in ps)
        if any(c > 1 for c in pidc.values()):
            R.add("must", "Two players with one studio id in a squad", "Studio ids are unique.", tname(t))
        for p in ps:
            g = p.get("gameId")
            if g == 0:
                R.add("must", "Player with game ID 0", "No ID is 0; a player without one has no game ID.",
                      "%s, %s" % (p.get("name"), tname(t)))
            elif isinstance(g, int) and EDIT_LO <= g <= EDIT_HI and not p.get("codeSet"):
                R.add("should", "Player on a made-up ID",
                      "IDs in 0x40080000-0x400EFFFF were made up by the studio before 2026-11-22 and count as no ID "
                      "(rule book, Never a made-up ID). Health check, Allocate free IDs.", "%s, %s" % (p.get("name"), tname(t)))
            elif isinstance(g, int) and g > 0xFFFFFFFF:
                R.add("must", "Player ID longer than 4 bytes", "The game holds 1 to 4,294,967,295.", "%s, %s" % (p.get("name"), tname(t)))
            if blen(p.get("name")) > 60:
                R.add("should", "Player name longer than 60 bytes", "The file's field is 60 bytes; it is cut.", p.get("name"))
            if len(str(p.get("shirtName") or "")) > 16:
                R.add("should", "Shirt name longer than 16 letters", "PES shows 16.", "%s, %s" % (p.get("name"), tname(t)))
        if ps and not copy and len(ps) < 15:
            R.add("note", "Squad under 15", "15 or more make a playable squad.", "%s: %d" % (tname(t), len(ps)))
    for code, ts in by_code.items():
        if len(ts) > 1:
            R.add("must", "Two teams on one team code",
                  "One file per code: the game keeps only the last one imported (DATABASE_RULES 3).",
                  "%s: %s" % (code, ", ".join(t.get("name") for t in ts)))

    # ---- team files
    for tid, f in teds.items():
        if tid not in teams:
            R.add("should", "Team file of a team that is gone",
                  "Deleting a team deletes its team file (dropTeam).", "%s (%s)" % (f.get("origName") or f.get("file"), tid))
        if not stored(f.get("ref")):
            R.add("must", "Team file's bytes are missing", "The record points at a stored file that is not in the backup.",
                  "%s (%s)" % (f.get("origName") or f.get("file"), f.get("ref")))

    # ---- competitions
    wc = [c for c in comps.values() if c.get("worldCup")]
    if len(wc) != 1:
        R.add("must", "Not exactly one World Cup",
              "There is always one World Cup holding every national team (Link rule 5).",
              "%d found: %s" % (len(wc), ", ".join(c.get("name") for c in wc) or "none"))
    cby = collections.defaultdict(list)
    for c in comps.values():
        if c.get("gameId") == 0:
            R.add("must", "Competition with code 0", "No ID is 0.", c.get("name"))
        if c.get("gameId") and not c.get("noCode"):
            cby[c["gameId"]].append(c)
        gone = [x for x in (c.get("teams") or []) if x not in teams]
        if gone:
            R.add("must", "Cup lists teams that are gone",
                  "Deleting a team removes it from every c.teams list (dropTeam).", "%s: %d" % (c.get("name"), len(gone)))
        for field, iid in [("logo", c.get("emblem"))] + [("board", x) for x in c.get("sponsorImgs") or []]:
            if iid and iid not in images:
                R.add("must", "Link to an image that is gone", "unlinkImages clears every field.", "%s: %s" % (c.get("name"), field))
        if blen(c.get("name")) > 60:
            R.add("should", "Competition name longer than 60 bytes", "The .ced name field is 61 bytes with its end mark.", c.get("name"))
    for code, cs in cby.items():
        if len(cs) > 1:
            R.add("must", "Two competitions on one competition code", "One competition per code (DATABASE_RULES 5a).",
                  "%s: %s" % (code, ", ".join(c.get("name") for c in cs)))

    # ---- images
    used = set()
    for t in teams.values():
        used.update(x for x in [t.get("emblem"), t.get("managerPhoto"), t.get("stadiumImg")] + list(t.get("sponsorImgs") or [])
                    + [k.get("img") for k in t.get("kits") or []] if x)
    for c in comps.values():
        used.update(x for x in [c.get("emblem")] + list(c.get("sponsorImgs") or []) if x)
    copied = 0
    for i in images.values():
        if not stored(i.get("ref")):
            R.add("must", "Image's bytes are missing", "The record points at a stored file that is not in the backup.",
                  "%s (%s)" % (i.get("name") or i["id"], i.get("ref")))
        if i.get("ofName") and not str(i.get("ref", "")).startswith("o:"):
            copied += 1
        if i["id"] not in used and i.get("kind") not in ("extra",):
            R.add("note", "Image no team or competition uses",
                  "Kept in the library; the export leaves it out unless a file names it.", i.get("name") or i["id"])
    if copied:
        R.add("should", "Option-file images copied into storage",
              "Package images are referred to (o:<package>|<path>), never copied (DATABASE_RULES 4.2).", "%d images" % copied)

    # ---- settings
    b = settings.get("baseline")
    if b and b not in snaps:
        R.add("should", "Baseline snapshot not in the backup",
              "Changes only compares with it; restore would lose the comparison.", str(b))
    for kind in ("team", "comp"):
        book = (settings.get("codeBook") or {}).get(kind) or {}
        held = set(by_code) if kind == "team" else set(cby)
        both = sorted(int(k) for k in book if str(k).isdigit() and int(k) in held and not (book[k] or {}).get("taken"))
        if both:
            R.add("note", "Code in the code book is held again",
                  "Normal once a free code is given out; only a problem if two records end up on it.",
                  "%s codes: %s" % (kind, both[:15]))

    counts = {"teams": len(teams), "competitions": len(comps), "players": sum(len(t.get("players") or []) for t in teams.values()),
              "images": len(images), "team files": len(teds), "waiting in Process and Review": len(C.get("pending", [])),
              "queued jobs": len(C.get("jobs", [])), "history entries": len(C.get("history", []))}
    return R, counts


def summary(P):
    C = P.get("collections", {})
    teams = {t["id"]: t for t in C.get("teams", [])}
    return {
        "teams": {t["id"]: (t.get("name"), t.get("gameId"), t.get("compId"), len(t.get("players") or []),
                            json.dumps(t, sort_keys=True)) for t in teams.values()},
        "comps": {c["id"]: (c.get("name"), c.get("gameId"), json.dumps(c, sort_keys=True)) for c in C.get("comps", [])},
        "images": {i["id"]: i.get("ref") for i in C.get("images", [])},
        "players": {(t["id"], p["id"]): (p.get("name"), json.dumps(p, sort_keys=True)) for t in teams.values() for p in t.get("players") or []},
    }


def diff(old, new):
    a, b = summary(old), summary(new)
    out = []
    for k, label in (("teams", "Teams"), ("comps", "Competitions")):
        x, y = a[k], b[k]
        add = [y[i][0] for i in y if i not in x]
        rem = [x[i][0] for i in x if i not in y]
        ch = [y[i][0] for i in y if i in x and x[i][-1] != y[i][-1]]
        code = ["%s: %s -> %s" % (y[i][0], x[i][1], y[i][1]) for i in y if i in x and x[i][1] != y[i][1]]
        out.append("%s: %d added, %d removed, %d changed" % (label, len(add), len(rem), len(ch)))
        out += ["  + %s" % n for n in add[:15]] + ["  - %s" % n for n in rem[:15]] + ["  code %s" % c for c in code[:15]]
    x, y = a["players"], b["players"]
    out.append("Players: %d added, %d removed, %d changed" % (
        len(set(y) - set(x)), len(set(x) - set(y)), sum(1 for k in set(x) & set(y) if x[k][1] != y[k][1])))
    x, y = a["images"], b["images"]
    out.append("Images: %d added, %d removed, %d relinked" % (
        len(set(y) - set(x)), len(set(x) - set(y)), sum(1 for k in set(x) & set(y) if x[k] != y[k])))
    # everything else the backup holds, record by record
    ca, cb = old.get("collections", {}), new.get("collections", {})
    for k, label in (("teds", "Team files"), ("snaps", "Snapshots"), ("history", "Change history"),
                     ("pending", "Process and Review"), ("jobs", "Jobs")):
        x = {r.get("id"): json.dumps(r, sort_keys=True) for r in ca.get(k, [])}
        y = {r.get("id"): json.dumps(r, sort_keys=True) for r in cb.get(k, [])}
        out.append("%s: %d added, %d removed, %d changed" % (
            label, len(set(y) - set(x)), len(set(x) - set(y)), sum(1 for i in set(x) & set(y) if x[i] != y[i])))
    sa, sb = (ca.get("settings") or [{}])[0], (cb.get("settings") or [{}])[0]
    keys = sorted(k for k in set(sa) | set(sb) if json.dumps(sa.get(k), sort_keys=True) != json.dumps(sb.get(k), sort_keys=True))
    out.append("Settings: " + ("changed: " + ", ".join(keys) if keys else "no change"))
    return out


def main():
    ap = argparse.ArgumentParser(description="Is the studio's database whole?")
    ap.add_argument("backup")
    ap.add_argument("--before")
    ap.add_argument("--json")
    ap.add_argument("--max", type=int, default=12)
    o = ap.parse_args()
    try:
        P, names = load(o.backup)
        old = load(o.before)[0] if o.before else None
    except Exception as e:
        print("Can't read it:", e)
        sys.exit(2)
    R, counts = check(P, names)
    must, should = R.count("must"), R.count("should")
    rules = sum(1 for (lv, _) in R.items if lv == "must")
    verdict = ("BROKEN: %d rule%s broken, in %d place%s" % (rules, "" if rules == 1 else "s", must, "" if must == 1 else "s")) if must else (
        "SOUND, %d thing%s worth fixing" % (should, "" if should == 1 else "s") if should else "SOUND: every link holds")
    print("=" * 78 + "\n" + verdict + "\n" + "=" * 78)
    print(", ".join("%d %s" % (v, k) for k, v in counts.items()))
    for level in ("must", "should", "note"):
        rows = [(k[1], v) for k, v in R.items.items() if k[0] == level]
        if rows:
            print("\n## %s" % Report.LABEL[level])
        for problem, v in rows:
            print("\n- %s (%d)\n  Why: %s" % (problem, len(v["where"]), v["why"]))
            for w in v["where"][:o.max]:
                print("    %s" % w)
            if len(v["where"]) > o.max:
                print("    ... and %d more" % (len(v["where"]) - o.max))
    if old:
        print("\n## Changed since %s" % o.before)
        for line in diff(old, P):
            print(line)
    if o.json:
        json.dump({"verdict": verdict, "counts": counts, "findings": [
            {"level": k[0], "problem": k[1], "why": v["why"], "where": v["where"]} for k, v in R.items.items()]},
            open(o.json, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sys.exit(1 if must else 0)


if __name__ == "__main__":
    main()
