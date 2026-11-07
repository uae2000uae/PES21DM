/* PES 2021 Option Studio: standalone platform layer.
   On claude.ai the page gets window.claude from the artifact runtime. Running on its own
   (localhost or Google Cloud Run) this file provides the same interface:
   - storage: none here, so the studio keeps your project in this browser (IndexedDB)
   - downloads: normal browser downloads
   - Claude: requests go to /api/claude on server.py, which holds your API key
     (on a public site the owner can require a passphrase; it is asked once and kept in this browser) */
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

  var PASS_KEY = 'pes21.claudePass';
  function getPass() { try { return localStorage.getItem(PASS_KEY) || ''; } catch (e) { return ''; } }
  function setPass(v) { try { if (v) localStorage.setItem(PASS_KEY, v); else localStorage.removeItem(PASS_KEY); } catch (e) { /* storage off */ } }
  var asking = null; // one passphrase prompt shared by requests running at the same time
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

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

  var caps = {
    downloads: { save: saveFile },
    sample: sample,
    db: null,      // no cloud database: the studio falls back to IndexedDB in this browser
    user: null,
    assets: null
  };

  window.claude = {
    standalone: true,
    clearClaudePassphrase: function () { setPass(''); },
    use: function (name) { return Promise.resolve(Object.prototype.hasOwnProperty.call(caps, name) ? caps[name] : null); }
  };
})();
