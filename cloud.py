"""PES 2021 Option Studio - Google sign-in and Google Cloud storage.

Used by server.py. Standard library only.

When it is set up (on Cloud Run, see README), a signed-in owner's project is kept in
  - Firestore: one document per record, at users/<google-user-id>/<collection>/<record-id>
  - Cloud Storage: images, team files and snapshots, at gs://<bucket>/users/<google-user-id>/<file-id>
so the same project opens on any device. Visitors who don't sign in keep using browser storage.

Settings (environment variables):
  GOOGLE_CLIENT_ID   OAuth web client ID used by the "Sign in with Google" button
  ALLOWED_EMAILS     comma-separated Google accounts that may save to the cloud (others are refused)
  GCS_BUCKET         Cloud Storage bucket for images and files
  FIRESTORE_DATABASE Firestore database id (default "(default)")
  GOOGLE_CLOUD_PROJECT  project id (read from Cloud Run's metadata server when not set)
  SESSION_SECRET     key that signs the sign-in cookie (derived from the other secrets when not set)
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
ALLOWED = {e.strip().lower() for e in os.environ.get("ALLOWED_EMAILS", "").split(",") if e.strip()}
BUCKET = os.environ.get("GCS_BUCKET", "").strip()
DATABASE = os.environ.get("FIRESTORE_DATABASE", "(default)").strip() or "(default)"
COLLECTIONS = {"teams", "comps", "images", "snaps", "pending", "settings", "teds", "jobs", "history"}
SESSION_DAYS = 30
COOKIE = "pes21_session"
MAX_DOC = 1_000_000       # Firestore's limit is about 1 MiB per document
MAX_BLOB = 30 * 1024 * 1024  # Cloud Run accepts requests up to 32 MiB

METADATA = "http://metadata.google.internal/computeMetadata/v1/"
FIRESTORE = "https://firestore.googleapis.com/v1/"
GCS = "https://storage.googleapis.com/storage/v1/b/"
GCS_UPLOAD = "https://storage.googleapis.com/upload/storage/v1/b/"


class CloudError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def configured():
    return bool(CLIENT_ID and ALLOWED and BUCKET)


# ---------------- session cookie ----------------

def _secret():
    s = os.environ.get("SESSION_SECRET", "").strip()
    if not s:
        seed = os.environ.get("ANTHROPIC_API_KEY", "") + "|" + os.environ.get("CLAUDE_PASSPHRASE", "")
        s = seed if seed.strip("|") else _RANDOM
    return hashlib.sha256(("pes21-session|" + s).encode("utf-8")).digest()


_RANDOM = secrets.token_hex(32)


def _b64(b):
    return base64.urlsafe_b64encode(b).decode("ascii").rstrip("=")


def _unb64(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def make_cookie(user, secure):
    body = _b64(json.dumps({"sub": user["sub"], "email": user["email"], "exp": int(time.time()) + SESSION_DAYS * 86400}).encode("utf-8"))
    sig = _b64(hmac.new(_secret(), body.encode("ascii"), hashlib.sha256).digest())
    attrs = "Path=/; HttpOnly; SameSite=Lax; Max-Age=%d" % (SESSION_DAYS * 86400)
    return "%s=%s.%s; %s%s" % (COOKIE, body, sig, attrs, "; Secure" if secure else "")


def clear_cookie(secure):
    return "%s=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0%s" % (COOKIE, "; Secure" if secure else "")


def session_user(cookie_header):
    """The signed-in user from the request's cookie, or None."""
    if not cookie_header:
        return None
    for part in cookie_header.split(";"):
        k, _, v = part.strip().partition("=")
        if k != COOKIE or "." not in v:
            continue
        body, sig = v.rsplit(".", 1)
        good = _b64(hmac.new(_secret(), body.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, good):
            return None
        try:
            data = json.loads(_unb64(body))
        except Exception:
            return None
        if data.get("exp", 0) < time.time() or data.get("email", "").lower() not in ALLOWED:
            return None
        return {"sub": str(data["sub"]), "email": data["email"]}
    return None


def verify_google_token(credential):
    """Check a Google sign-in token with Google and return the user it belongs to."""
    if not configured():
        raise CloudError(503, "Cloud saving isn't set up on this site.")
    if not credential or len(credential) > 4096:
        raise CloudError(400, "Missing sign-in token")
    url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + urllib.parse.quote(credential)
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            info = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError:
        raise CloudError(401, "Google did not accept this sign-in. Try again.")
    except Exception as e:
        raise CloudError(502, "Could not reach Google to check the sign-in: %s" % e)
    if info.get("aud") != CLIENT_ID or info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise CloudError(401, "This sign-in was not made for this site.")
    if str(info.get("email_verified")).lower() != "true":
        raise CloudError(401, "This Google account's email address isn't verified.")
    email = info.get("email", "").lower()
    if email not in ALLOWED:
        raise CloudError(403, "%s isn't allowed to save to this site's cloud. You can still use the studio; your work stays in this browser." % email)
    return {"sub": str(info["sub"]), "email": email}


# ---------------- Google Cloud access ----------------

_tok = {"value": None, "exp": 0, "project": os.environ.get("GOOGLE_CLOUD_PROJECT", "").strip()}
_tok_lock = threading.Lock()


def _metadata(path):
    req = urllib.request.Request(METADATA + path, headers={"Metadata-Flavor": "Google"})
    with urllib.request.urlopen(req, timeout=5) as r:
        return r.read().decode("utf-8")


def _token():
    with _tok_lock:
        if _tok["value"] and _tok["exp"] > time.time() + 60:
            return _tok["value"]
        try:
            data = json.loads(_metadata("instance/service-accounts/default/token"))
            if not _tok["project"]:
                _tok["project"] = _metadata("project/project-id").strip()
        except Exception as e:
            raise CloudError(503, "Google Cloud credentials are not available here (%s)." % e)
        _tok["value"] = data["access_token"]
        _tok["exp"] = time.time() + int(data.get("expires_in", 300))
        return _tok["value"]


def _call(method, url, body=None, ctype="application/json", raw=False):
    headers = {"Authorization": "Bearer " + _token()}
    if body is not None:
        headers["Content-Type"] = ctype
        if not isinstance(body, (bytes, bytearray)):
            body = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
                if raw:
                    return data, r.headers.get("Content-Type", "application/octet-stream")
                return json.loads(data.decode("utf-8")) if data else {}
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code in (429, 500, 502, 503) and attempt < 2:
                time.sleep(0.5 * (attempt + 1))
                continue
            try:
                msg = json.loads(e.read().decode("utf-8")).get("error", {}).get("message", "")
            except Exception:
                msg = ""
            raise CloudError(502, "Google Cloud error %s%s" % (e.code, ": " + msg if msg else ""))
        except CloudError:
            raise
        except Exception as e:
            if attempt < 2:
                time.sleep(0.5 * (attempt + 1))
                continue
            raise CloudError(502, "Could not reach Google Cloud: %s" % e)


# ---------------- records (Firestore) ----------------

_ID_OK = re.compile(r"^[A-Za-z0-9_\-]{1,300}$")


def _doc_id(rid):
    rid = str(rid)
    if _ID_OK.match(rid) and not rid.startswith("__"):
        return rid
    return "h_" + hashlib.sha1(rid.encode("utf-8")).hexdigest()


def _col_url(user, col):
    if col not in COLLECTIONS:
        raise CloudError(404, "Unknown collection")
    _token()
    return "%sprojects/%s/databases/%s/documents/users/%s/%s" % (
        FIRESTORE, _tok["project"], urllib.parse.quote(DATABASE, safe="()"), user["sub"], col)


def list_docs(user, col):
    base = _col_url(user, col)
    out, page = [], ""
    while True:
        url = base + "?pageSize=300&mask.fieldPaths=json" + ("&pageToken=" + urllib.parse.quote(page) if page else "")
        data = _call("GET", url) or {}
        for d in data.get("documents", []):
            try:
                out.append(json.loads(d["fields"]["json"]["stringValue"]))
            except Exception:
                pass
        page = data.get("nextPageToken", "")
        if not page:
            return out


def put_doc(user, col, rid, obj):
    s = json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
    if len(s.encode("utf-8")) > MAX_DOC:
        raise CloudError(413, "This record is too large to save to the cloud.")
    body = {"fields": {"json": {"stringValue": s}, "updatedAt": {"integerValue": str(int(time.time() * 1000))}}}
    _call("PATCH", _col_url(user, col) + "/" + _doc_id(rid), body)


def delete_doc(user, col, rid):
    _call("DELETE", _col_url(user, col) + "/" + _doc_id(rid))


# ---------------- files (Cloud Storage) ----------------

_BLOB_OK = re.compile(r"^[a-f0-9]{32}$")


def _object(user, bid):
    if not _BLOB_OK.match(bid or ""):
        raise CloudError(404, "Unknown file")
    return "users/%s/%s" % (user["sub"], bid)


def upload_blob(user, data, ctype):
    if not data:
        raise CloudError(400, "Empty file")
    if len(data) > MAX_BLOB:
        raise CloudError(413, "This file is too large to save to the cloud.")
    bid = secrets.token_hex(16)
    url = GCS_UPLOAD + urllib.parse.quote(BUCKET) + "/o?uploadType=media&name=" + urllib.parse.quote(_object(user, bid), safe="")
    _call("POST", url, data, ctype=ctype or "application/octet-stream")
    return bid


def get_blob(user, bid):
    url = GCS + urllib.parse.quote(BUCKET) + "/o/" + urllib.parse.quote(_object(user, bid), safe="") + "?alt=media"
    res = _call("GET", url, raw=True)
    if res is None:
        raise CloudError(404, "File not found")
    return res


def delete_blob(user, bid):
    _call("DELETE", GCS + urllib.parse.quote(BUCKET) + "/o/" + urllib.parse.quote(_object(user, bid), safe=""))


# ---------------- public baseline (Cloud Storage) ----------------
# The public baseline is the dataset every visitor can load. The site serves the latest one the owner
# published (gs://<bucket>/public/pes21-baseline.zip); before the first publish it serves the copy in
# the repository (baseline/pes21-baseline.zip). Each publish keeps the previous one under public/history/.

PUBLIC_BASELINE = "public/pes21-baseline.zip"


def _obj_url(name, media=False):
    return GCS + urllib.parse.quote(BUCKET) + "/o/" + urllib.parse.quote(name, safe="") + ("?alt=media" if media else "")


def get_public_baseline():
    """(bytes, content type) of the published baseline, or None when nothing has been published."""
    if not BUCKET:
        return None
    try:
        return _call("GET", _obj_url(PUBLIC_BASELINE, media=True), raw=True)
    except CloudError:
        return None


def publish_baseline(data):
    if len(data) > MAX_BLOB:
        raise CloudError(413, "The baseline is too large to publish (%d MB)." % (len(data) // 1048576))
    import io
    import zipfile
    try:
        z = zipfile.ZipFile(io.BytesIO(data))
        head = z.read("project.json")[:400].decode("utf-8", "replace")
    except Exception:
        raise CloudError(400, "This is not a project ZIP.")
    if '"kind":"full-transfer"' not in head.replace(" ", ""):
        raise CloudError(400, "This is not a project ZIP.")
    old = _call("GET", _obj_url(PUBLIC_BASELINE), None)  # metadata of the current one, if any
    if old:
        stamp = time.strftime("%Y%m%d-%H%M%S", time.gmtime())
        dest = "public/history/pes21-baseline-%s.zip" % stamp
        _call("POST", _obj_url(PUBLIC_BASELINE) + "/copyTo/b/" + urllib.parse.quote(BUCKET) + "/o/" + urllib.parse.quote(dest, safe=""), {})
    url = GCS_UPLOAD + urllib.parse.quote(BUCKET) + "/o?uploadType=media&name=" + urllib.parse.quote(PUBLIC_BASELINE, safe="")
    _call("POST", url, data, ctype="application/zip")
