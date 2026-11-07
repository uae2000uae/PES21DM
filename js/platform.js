/* PES 2021 Option Studio: standalone platform layer.
   On claude.ai the page gets window.claude from the artifact runtime. Running on its own
   (localhost or Google Cloud Run) this file provides the same interface:
   - storage: when the site owner is signed in with Google, the project is saved in Google Cloud
     (Firestore for records, Cloud Storage for images and files, through server.py), so it is the
     same on every device. Otherwise the studio keeps the project in this browser (IndexedDB).
   - downloads: normal browser downloads
   - Claude: requests go to /api/claude on server.py, which holds your API key
     (on a public site the owner can require a passphrase; it is asked once and kept in this browser,
     and the signed-in owner doesn't need it) */
(function () {
  if (window.claude && window.claude.use) return; // inside claude.ai: keep the real runtime

  function saveFile(opts) {
    var data = opts.data, name = opts.filename || 'download';
    var blob = data instanceof Blob ? data
      : new Blob([data], { type: /\.json$/i.test(name) ? 'application/json' : 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 60000);
    return Promise.resolve({ ok: true });
  }

  function err(message, code) { var e = new Error(message); if (code) e.code = code; return e; }
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  /* ---------------- Claude ---------------- */

  var PASS_KEY = 'pes21.claudePass';
  function getPass() { try { return localStorage.getItem(PASS_KEY) || ''; } catch (e) { return ''; } }
  function setPass(v) { try { if (v) localStorage.setItem(PASS_KEY, v); else localStorage.removeItem(PASS_KEY); } catch (e) { /* storage off */ } }
  var asking = null; // one passphrase prompt shared by requests running at the same time

  async function send(prompt, opts) {
    var res;
    try {
      res = await fetch('api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Studio-Pass': getPass() },
        body: JSON.stringify({ prompt: String(prompt), tier: opts.modelTier || 'default' }),
        signal: opts.signal
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      throw err(LOCAL ? 'Could not reach the local server. Start it with start.bat (or "python server.py").'
                      : 'Could not reach the server. Check your connection and try again.');
    }
    var body = {};
    try { body = await res.json(); } catch (e) { /* not JSON */ }
    return { res: res, body: body };
  }

  async function sample(prompt, opts) {
    opts = opts || {};
    var r = await send(prompt, opts);
    if (r.res.status === 401 && r.body.code === 'passphrase') {
      // the site owner protects the Claude buttons with a passphrase: ask once, remember it in this browser
      var sentPass = getPass();
      if (!asking) {
        asking = new Promise(function (resolve) {
          setTimeout(function () {
            var hadOne = !!getPass();
            var entered = window.prompt((hadOne ? 'That passphrase did not work. ' : '') +
              'The Claude features on this site need a passphrase. Enter it to continue (it is remembered in this browser):', '');
            setPass(entered ? entered.trim() : '');
            asking = null;
            resolve(!!entered);
          }, 0);
        });
      }
      var gotOne = getPass() !== sentPass && getPass() ? true : await asking;
      if (!gotOne) throw err('Claude passphrase needed. The rest of the studio works without it.');
      r = await send(prompt, opts);
      if (r.res.status === 401) { setPass(''); throw err('Wrong Claude passphrase. Try the Claude button again to re-enter it.'); }
    }
    var res = r.res, body = r.body;
    if ((res.status === 429 && !body.code) || res.status === 529) throw err(body.error || 'Claude is busy', 'rate_limited');
    if (!res.ok) throw err(body.error || ('Claude request failed (' + res.status + ')'));
    return { text: body.text || '' };
  }

  /* ---------------- Google Cloud storage ---------------- */

  async function api(method, path, body, ctype) {
    var opts = { method: method, headers: { 'X-Studio': '1' }, credentials: 'same-origin' };
    if (body !== undefined) {
      opts.headers['Content-Type'] = ctype || 'application/json';
      opts.body = ctype ? body : JSON.stringify(body);
    }
    var res;
    try { res = await fetch(path, opts); }
    catch (e) { throw err('Could not reach the server to save. Check your connection; your changes will be retried.'); }
    var out = {};
    try { out = await res.json(); } catch (e) { /* not JSON */ }
    if (res.status === 401) { showAccount(); throw err('You are signed out. Sign in with Google again (bottom of the left menu), then reload.', 'signed_out'); }
    if (!res.ok) throw err(out.error || ('Cloud request failed (' + res.status + ')'));
    return out;
  }

  // the same shape as the claude.ai database: db.doc(path).collection(name).get() / .doc(id).set(obj) / .delete()
  var cloudDb = {
    doc: function () {
      return {
        collection: function (col) {
          return {
            get: async function () {
              var r = await api('GET', 'api/db/' + col);
              return { docs: (r.docs || []).map(function (d) { return { data: function () { return d; } }; }) };
            },
            doc: function (id) {
              var p = 'api/db/' + col + '/' + encodeURIComponent(id);
              return {
                set: function (obj) { return api('PUT', p, obj); },
                delete: function () { return api('DELETE', p); }
              };
            }
          };
        }
      };
    }
  };

  var cloudAssets = {
    upload: async function (blob, o) {
      var type = (o && o.type) || blob.type || 'application/octet-stream';
      var r = await api('POST', 'api/blob', blob, type);
      return { id: r.id, url: r.url };
    },
    delete: function (id) { return api('DELETE', 'api/blob/' + id); }
  };

  var ME = { cloud: false, signedIn: false };
  var meReady = fetch('api/me', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (m) { ME = m || ME; })
    .catch(function () { /* old server or offline: browser storage */ });

  /* ---------------- account box (left menu) ---------------- */

  var GSI = null;
  function loadGsi() {
    if (GSI) return GSI;
    GSI = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { resolve(window.google); };
      s.onerror = function () { GSI = null; reject(err('Could not load Google sign-in. Check your connection.')); };
      document.head.appendChild(s);
    });
    return GSI;
  }

  async function onCredential(resp) {
    var box = document.getElementById('st-account');
    try {
      if (box) box.querySelector('.acct-msg').textContent = 'Signing in…';
      await api('POST', 'api/login', { credential: resp.credential });
      location.reload();
    } catch (e) {
      if (box) box.querySelector('.acct-msg').textContent = e.message;
    }
  }

  async function showSignIn(box) {
    box.innerHTML = '<div class="small muted acct-msg">Sign in to save your project to Google Cloud and open it on any device.</div><div class="acct-btn" style="margin-top:6px"></div>';
    try {
      var g = await loadGsi();
      g.accounts.id.initialize({ client_id: ME.clientId, callback: onCredential, auto_select: true, cancel_on_tap_outside: true });
      g.accounts.id.renderButton(box.querySelector('.acct-btn'), { theme: 'filled_black', size: 'medium', text: 'signin_with', shape: 'pill' });
    } catch (e) { box.querySelector('.acct-msg').textContent = e.message; }
  }

  function showAccount() {
    var box = document.getElementById('st-account');
    if (!box || !ME.cloud) return;
    box.style.marginTop = '8px';
    if (ME.signedIn) {
      box.innerHTML = '<div class="small muted" style="overflow-wrap:anywhere">' + ME.email.replace(/[<>&"]/g, '') +
        '</div><button class="sm" type="button" style="margin-top:4px">Sign out</button>';
      box.querySelector('button').onclick = async function () {
        try { await api('POST', 'api/logout'); } catch (e) { /* ignore */ }
        try { if (window.google) window.google.accounts.id.disableAutoSelect(); } catch (e) { /* ignore */ }
        location.reload();
      };
    } else {
      showSignIn(box);
    }
  }

  meReady.then(function () {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showAccount);
    else showAccount();
  });

  /* ---------------- interface for the studio ---------------- */

  var caps = {
    downloads: { save: saveFile },
    sample: sample
  };

  window.claude = {
    standalone: true,
    storageName: 'Google Cloud',
    clearClaudePassphrase: function () { setPass(''); },
    use: async function (name) {
      if (name === 'db' || name === 'user' || name === 'assets') {
        await meReady;
        if (!(ME.cloud && ME.signedIn)) return null; // not signed in: the studio uses this browser's storage
        if (name === 'db') return cloudDb;
        if (name === 'assets') return cloudAssets;
        return { id: function () { return Promise.resolve(ME.sub); } };
      }
      return Object.prototype.hasOwnProperty.call(caps, name) ? caps[name] : null;
    }
  };
})();
