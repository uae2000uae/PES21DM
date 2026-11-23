"""Option-file packages: a whole PES 2021 option file (folders of team files, competition files and images) kept as
the ZIP it came in, and read file by file.

An option file is the benchmark for what the studio produces (see "Option-file packages" in the README): the studio
builds its project from the package's team (.ted) and competition (.ced) files and points its images at the package's
own PNGs, and its exports reproduce the package's file set, folder for folder and name for name.

Packages are large (the 2026-27 file is 2.2 GB zipped, 3.2 GB unzipped), so they are never loaded whole: the server
reads the ZIP's directory once and then single files out of it, from Cloud Storage (byte ranges) online or from disk
locally (data/optionfiles/).

Online there are two kinds: the site's packages (managed by the owner accounts, registry optionfiles/registry.json) and
each other signed-in account's own packages, kept apart under users/<their id>/optionfiles/ with their own registry.
`scope` is that account's id, or None for the site's packages; a package is only ever found in its own scope.
"""
import hashlib
import io
import json
import os
import re
import threading
import time
import zipfile
from pathlib import Path

import cloud

ROOT = Path(__file__).resolve().parent
# On this computer the packages sit in data/optionfiles/; OPTIONFILES_DIR (environment or .env) names another folder, so a
# multi-GB option file can stay on its own drive instead of being copied into the project folder.
LOCAL_DIR = Path(os.environ.get("OPTIONFILES_DIR") or ROOT / "data" / "optionfiles")
REGISTRY = "optionfiles/registry.json"  # in the bucket
_lock = threading.Lock()
_zips = {}  # package id -> (ZipFile, manifest)
GAME_EXT = (".ted", ".ced")
CTYPE = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "txt": "text/plain; charset=utf-8",
         "ted": "application/octet-stream", "ced": "application/octet-stream"}


def online():
    return cloud.configured()


# ---------- reading a ZIP that lives in Cloud Storage, a few MB at a time ----------

class RangeFile(io.RawIOBase):
    """A read-only, seekable view of a Cloud Storage object, fetched in 2 MB blocks (a few kept in memory)."""
    BLOCK = 2 * 1024 * 1024

    def __init__(self, name, size):
        self.name_, self.size, self.pos, self.blocks = name, size, 0, {}

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos

    def _block(self, i):
        b = self.blocks.get(i)
        if b is None:
            start = i * self.BLOCK
            b = cloud.read_range(self.name_, start, min(self.size, start + self.BLOCK) - 1)
            if len(self.blocks) > 8:
                self.blocks.pop(next(iter(self.blocks)))
            self.blocks[i] = b
        return b

    def read(self, n=-1):
        if n is None or n < 0:
            n = self.size - self.pos
        n = max(0, min(n, self.size - self.pos))
        out = bytearray()
        while n > 0:
            i, o = divmod(self.pos, self.BLOCK)
            if n > 4 * self.BLOCK and o == 0:  # a large file: one request for the whole run
                end = min(self.size, self.pos + n) - 1
                chunk = cloud.read_range(self.name_, self.pos, end)
            else:
                chunk = self._block(i)[o:o + n]
            if not chunk:
                break
            out += chunk
            self.pos += len(chunk)
            n -= len(chunk)
        return bytes(out)

    def readinto(self, b):
        d = self.read(len(b))
        b[:len(d)] = d
        return len(d)


# ---------- registry ----------

def _prefix(scope):
    if scope is None:
        return "optionfiles/"
    if not re.match(r"^[0-9A-Za-z_-]{1,64}$", str(scope)):
        raise ValueError("Bad account id.")
    return "users/%s/optionfiles/" % scope


def _regname(scope):
    return REGISTRY if scope is None else _prefix(scope) + "registry.json"


def _registry(scope=None):
    if online():
        data = cloud.get_object(_regname(scope))
        return json.loads(data.decode("utf-8")) if data else {"packages": []}
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    reg = {"packages": []}
    f = LOCAL_DIR / "registry.json"
    if f.exists():
        reg = json.loads(f.read_text(encoding="utf-8"))
    known = {p.get("file") for p in reg["packages"]}
    for z in sorted(LOCAL_DIR.glob("*.zip")):  # a ZIP dropped into data/optionfiles/ registers itself
        if z.name not in known:
            reg["packages"].append({"id": _pid(z.name, z.stat().st_size), "name": z.stem, "file": z.name, "size": z.stat().st_size, "at": int(time.time())})
            _save(reg)
    return reg


def _save(reg, scope=None):
    data = json.dumps(reg, ensure_ascii=False, indent=1).encode("utf-8")
    if online():
        cloud.put_object(_regname(scope), data, "application/json")
    else:
        (LOCAL_DIR / "registry.json").write_bytes(data)


def _pid(name, size):
    return hashlib.sha1(("%s|%s" % (name, size)).encode("utf-8")).hexdigest()[:12]


def baseline():
    """The site's baseline: the option file every visitor and account starts from. The one the owner chose, else the
    newest site package (None when the site has none)."""
    reg = _registry(None)
    pk = reg["packages"]
    chosen = [p for p in pk if p["id"] == reg.get("baseline")]
    # an option file imported into a project and kept for its rebuilds (kind "source") is never the site's baseline
    full = [p for p in pk if p.get("kind") != "source"]
    best = chosen[0] if chosen else (max(full, key=lambda p: p.get("at") or 0) if full else None)
    return {k: best.get(k) for k in ("id", "name", "size", "files", "at")} if best else None


def set_baseline(pid):
    """The owner makes one of the site's packages the baseline for everyone."""
    reg = _registry(None)
    if not any(p["id"] == pid for p in reg["packages"]):
        raise LookupError("unknown option-file package")
    reg["baseline"] = pid
    _save(reg, None)
    return baseline()


def packages(scope=None):
    """The site's packages (read-only for everyone; the baseline marked) and, for an account, its own uploads."""
    base = (baseline() or {}).get("id")
    keys = ("id", "name", "size", "files", "at", "kind")
    out = [dict({k: p.get(k) for k in keys}, site=True, baseline=p["id"] == base) for p in _registry(None)["packages"]]
    if scope is not None:
        out += [{k: p.get(k) for k in keys} for p in _registry(scope)["packages"]]
    return out


def register_object(obj, name="", scope=None, kind=""):
    """Online: register a ZIP already uploaded to the bucket (Cloud Storage console or gcloud). An account's own package
    must lie in that account's folder."""
    obj = str(obj or "").strip()
    if obj.startswith("gs://"):
        obj = obj.split("/", 3)[3] if obj.count("/") >= 3 else ""
    if not obj or ".." in obj or not obj.lower().endswith(".zip"):
        raise ValueError("Give the path of a .zip in the site's bucket, e.g. public/My Option File.zip")
    if scope is not None and not obj.startswith(_prefix(scope)):
        raise ValueError("That file isn't in your own storage.")
    meta = cloud.object_meta(obj)
    if not meta:
        raise LookupError("no such file in the bucket: " + obj)
    size = int(meta.get("size") or 0)
    reg = _registry(scope)
    pid = _pid(obj, size)
    reg["packages"] = [p for p in reg["packages"] if p["id"] != pid]
    entry = {"id": pid, "name": name or Path(obj).stem, "object": obj, "size": size, "at": int(time.time())}
    if kind == "source":
        entry["kind"] = "source"
    reg["packages"].append(entry)
    _open(entry)  # reads the ZIP's directory now, so a broken file is refused at once
    entry["files"] = len(_zips[pid][1])
    _save(reg, scope)
    return entry


_UP_OK = re.compile(r"^[a-f0-9]{32}$")


def upload_part(up, n, total, data, name, scope=None, kind=""):
    """Online: a package arrives in parts below Cloud Run's 32 MiB request limit. Each part is stored in the bucket; the
    last one joins them (in stages, 32 at a time), registers the ZIP as a package and removes the parts."""
    if not _UP_OK.match(up or "") or not (0 <= n < total <= 4000):
        raise ValueError("Bad upload part.")
    if not data:
        raise ValueError("Empty upload part.")
    if n == 0 and data[:4] != b"PK\x03\x04":
        raise ValueError("This is not a ZIP file.")
    base = _prefix(scope)
    part = lambda i: base + "upload/%s/%05d" % (up, i)
    cloud.put_object(part(n), data)
    if n < total - 1:
        return {"done": False, "part": n}
    names = [part(i) for i in range(total)]
    for x in names:
        if not cloud.object_meta(x):
            raise ValueError("A part of the upload is missing. Upload the file again.")
    safe = re.sub(r"[^\w .()-]+", "_", Path(str(name or "option-file")).stem)[:80].strip() or "option-file"
    dest = base + "%s.zip" % safe
    made = []
    try:
        made = cloud.compose_many(names, dest, "application/zip", base + "upload/%s/join" % up)
    finally:
        for x in names + made:
            cloud.delete_object(x)
    return {"done": True, "package": register_object(dest, safe, scope, kind)}


def save_upload(name, stream, length, kind=""):
    """On this computer: store an uploaded ZIP in data/optionfiles/ (read straight from the request, never all in memory)."""
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^\w .()-]+", "_", Path(str(name or "option-file")).stem)[:80] or "option-file"
    dest = LOCAL_DIR / (safe + ".zip")
    left = length
    with open(dest, "wb") as f:
        while left > 0:
            chunk = stream.read(min(8 * 1024 * 1024, left))
            if not chunk:
                break
            f.write(chunk)
            left -= len(chunk)
    if not zipfile.is_zipfile(dest):
        dest.unlink()
        raise ValueError("that is not a ZIP file")
    if kind == "source":  # kept for a project's rebuilds: marked so it is never the site's baseline
        reg = _registry(None)
        for e in reg["packages"]:
            if e.get("file") == dest.name:
                e["kind"] = "source"
        _save(reg)
    return [p for p in packages() if p["name"] == safe][-1:] or packages()[-1:]


# ---------- reading packages ----------

def _entry(pid, scope=None):
    """An account's own package, else one of the site's (the site's are open to everyone, read-only)."""
    for reg in ([_registry(scope)] if scope is not None else []) + [_registry(None)]:
        for p in reg["packages"]:
            if p["id"] == pid:
                return p
    raise LookupError("unknown option-file package")


def _open(entry):
    with _lock:
        hit = _zips.get(entry["id"])
        if hit:
            return hit
    if entry.get("object"):
        src = io.BufferedReader(RangeFile(entry["object"], int(entry["size"])), buffer_size=1024 * 1024)
    else:
        src = open(LOCAL_DIR / entry["file"], "rb")
    z = zipfile.ZipFile(src)
    manifest = []
    for i in z.infolist():
        if i.is_dir():
            continue
        ext = i.filename.rsplit(".", 1)[-1].lower() if "." in i.filename.rsplit("/", 1)[-1] else ""
        manifest.append({"path": i.filename, "size": i.file_size, "crc": "%08x" % i.CRC, "ext": ext})
    with _lock:
        _zips[entry["id"]] = (z, manifest, threading.Lock())
    return _zips[entry["id"]]


def manifest(pid, scope=None):
    z, m, _ = _open(_entry(pid, scope))
    return m


def read(pid, path, scope=None):
    z, m, lk = _open(_entry(pid, scope))
    with lk:  # one ZipFile, one reader at a time
        try:
            return z.read(path)
        except KeyError:
            raise LookupError("no such file in the package: " + path)


def game_files(pid, scope=None):
    """Every team and competition file of the package: {path: bytes} (about 11 MB for 770 files)."""
    z, m, lk = _open(_entry(pid, scope))
    out = {}
    with lk:
        for e in m:
            if e["path"].lower().endswith(GAME_EXT):
                out[e["path"]] = z.read(e["path"])
    return out


def ctype(path):
    return CTYPE.get(path.rsplit(".", 1)[-1].lower(), "application/octet-stream")
