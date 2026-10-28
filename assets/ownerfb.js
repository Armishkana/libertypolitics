/* ownerfb.js - the owner's feedback box on every page of libertypolitics.com and iranuncensored.com.
   One home for how it works: the header of ownerfb.py (same folder). Never restate it.

   For every visitor but one this file does nothing: no request, no element, no stored value. It waits for the
   discussion script (community.js) to say who is signed in, and only when that account is the owner's, with its
   email confirmed, does it ask the site's database for the box. The database itself refuses the box to anyone
   else (firestore.rules, "ownerfb"), so this check is a courtesy that saves a request, never the lock.

   The box is the dashboards' own feedback box (projects/hub/feedback-armin.html), the same file, unchanged in what
   it does. It is not shipped with the site: it is kept in the database and read only by the owner's account, so
   nothing in it is ever served to a reader. This file hands it two things the dashboards get from their own
   runtime: a place to save notes (window.claude.use("db")) and a place to keep files (use("assets")). */
(function () {
  'use strict';
  var W = window, d = document;
  var me = d.currentScript;
  var BOARD = (me && me.getAttribute('data-board')) || '';
  if (!/^(lpsite|iusite)$/.test(BOARD) || W.__ownerFbk) return;
  W.__ownerFbk = { state: 'waiting' };
  // The same SHA-256 of the owner's email that community.js holds (OWNER_HASH). ownerfb.py fails its build if they differ.
  var OWNER_HASH = 'e810e7aabce15ef8fccbd2e2fcad55309815f35c24e5d95859774d664ffeca24';
  var INBOX = 'ownerinbox', FILES = 'ownerfiles', PART = 500000, MAX_PARTS = 40;
  var CACHE = 'ownerFbkCode::' + BOARD;
  var mounted = false, checking = false, M = null;

  function say(s) { try { W.__ownerFbk.state = s; } catch (e) { } }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join(''); }
  function isOwner(u) {
    if (!u || !u.email || !u.emailVerified || !(W.crypto && W.crypto.subtle && W.TextEncoder)) return Promise.resolve(false);
    return W.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(u.email).trim().toLowerCase()))
      .then(function (b) { return hex(b) === OWNER_HASH; }, function () { return false; });
  }
  function rid() { var a = new Uint8Array(16); W.crypto.getRandomValues(a); return hex(a); }

  // ---- what the box saves its notes in: window.claude.use("db"), over this site's database ----------------------
  // The box asks for exactly three things (build-feedback.ps1, block 5b2): doc("inbox/<id>").set(body),
  // doc("inbox/<id>").delete(), and collection("inbox").limit(n).get(). Its "inbox" is this site's ownerinbox.
  function dbDoor(F, db) {
    function col(c) { if (c !== 'inbox') throw new Error('only the inbox'); return INBOX; }
    return {
      doc: function (path) {
        var p = String(path || '').split('/'), ref = F.doc(db, col(p[0]), p[1]);
        return {
          set: function (body) { return F.setDoc(ref, body); },
          delete: function () { return F.deleteDoc(ref); },
          get: function () { return F.getDoc(ref).then(function (s) { return { id: s.id, exists: s.exists(), data: function () { return s.data(); } }; }); }
        };
      },
      collection: function (c) {
        var cn = col(c);
        return {
          limit: function (n) {
            return {
              get: function () {
                return F.getDocs(F.query(F.collection(db, cn), F.limit(Math.min(300, n || 300)))).then(function (s) {
                  return { docs: s.docs.map(function (x) { return { id: x.id, data: function () { return x.data(); } }; }) };
                });
              }
            };
          }
        };
      }
    };
  }

  // ---- what the box keeps files in: use("assets"), over this site's database ------------------------------------
  // A file is ownerfiles/<32 hex> (name, type, size, how many pieces) and its bytes in ownerfiles/<id>/parts/<n>,
  // half a megabyte a piece: the way the brand pages already send pictures (firestore.rules, brandpages sent/).
  function assetsDoor(F, db) {
    return {
      upload: function (blob, opts) {
        var type = (opts && opts.type) || blob.type || 'application/octet-stream';
        var name = String((blob && blob.name) || 'file').slice(0, 120);
        if (!blob || !blob.size) return Promise.reject({ code: 'invalid_request' });
        var parts = Math.ceil(blob.size / PART);
        if (parts > MAX_PARTS) return Promise.reject({ code: 'too_large' });
        var id = rid();
        return blob.arrayBuffer().then(function (buf) {
          var u = new Uint8Array(buf);
          return F.setDoc(F.doc(db, FILES, id), { name: name, type: String(type).slice(0, 100), bytes: u.length, parts: parts, at: F.serverTimestamp() })
            .then(function () {
              var k = 0;
              function next() {
                if (k >= parts) return { id: id };
                var n = k++;
                return F.setDoc(F.doc(db, FILES, id, 'parts', String(n)), { b: F.Bytes.fromUint8Array(u.subarray(n * PART, Math.min(u.length, (n + 1) * PART))) }).then(next);
              }
              return next();
            });
        }).then(function (r) {
          try { blobs[id] = URL.createObjectURL(new Blob([blob], { type: type })); } catch (e) { }
          return r;
        }, function (e) { throw { code: (e && e.code === 'permission-denied') ? 'invalid_request' : 'failed' }; });
      }
    };
  }

  // ---- showing a file: the box asks W.__fbkBlobUrl(id) where the dashboards use /_blob/<id> --------------------
  // The first answer is a one-pixel stand-in carrying the id; the real picture replaces it as soon as its pieces
  // are read. A file read once stays for the life of the page.
  var blobs = {}, loading = {}, F0 = null, DB0 = null;
  var PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  function standIn(id) { return PIXEL + '#fbkfile-' + id; }
  function swap(id) {
    var url = blobs[id], s = standIn(id);
    var els = d.querySelectorAll('[src="' + s + '"],[href="' + s + '"]');
    for (var i = 0; i < els.length; i++) {
      if (els[i].getAttribute('src') === s) els[i].setAttribute('src', url);
      if (els[i].getAttribute('href') === s) els[i].setAttribute('href', url);
    }
  }
  function loadFile(id) {
    if (loading[id] || !F0) return; loading[id] = 1;
    var F = F0, db = DB0;
    F.getDoc(F.doc(db, FILES, id)).then(function (m) {
      if (!m.exists()) throw new Error('no file');
      var meta = m.data();
      return F.getDocs(F.query(F.collection(db, FILES, id, 'parts'), F.limit(MAX_PARTS))).then(function (s) {
        var ps = s.docs.slice().sort(function (a, b) { return Number(a.id) - Number(b.id); });
        if (ps.length !== meta.parts) throw new Error('pieces missing');
        var chunks = ps.map(function (p) { return p.data().b.toUint8Array(); });
        var type = String(meta.type || ''), blob = new Blob(chunks, { type: type || 'application/octet-stream' });
        // A type the box could not store as itself went in "wrapped" (build-feedback.ps1, fbkAttUpload): unwrap it to show it.
        if (type === 'application/json') {
          return blob.text().then(function (t) {
            try { var j = JSON.parse(t); if (j && j.wrapped && j.b64) { var bin = atob(j.b64), a = new Uint8Array(bin.length); for (var k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k); return new Blob([a], { type: j.type || 'application/octet-stream' }); } } catch (e) { }
            return blob;
          });
        }
        return blob;
      });
    }).then(function (blob) { blobs[id] = URL.createObjectURL(blob); swap(id); }, function () { loading[id] = 0; });
  }
  W.__fbkBlobUrl = function (id) {
    id = String(id || '');
    if (blobs[id]) return blobs[id];
    W.setTimeout(function () { loadFile(id); }, 0);
    return standIn(id);
  };

  // ---- the box itself -------------------------------------------------------------------------------------------
  function code(F, db, meta) {
    var cached = null;
    try { cached = JSON.parse(W.localStorage.getItem(CACHE) || 'null'); } catch (e) { cached = null; }
    if (cached && cached.sha === meta.sha && cached.js) return Promise.resolve(cached);
    return F.getDocs(F.query(F.collection(db, 'ownerfb', 'code', 'parts'), F.limit(60))).then(function (s) {
      var ps = s.docs.slice().sort(function (a, b) { return Number(a.id) - Number(b.id); });
      if (ps.length !== meta.parts) throw new Error('the box is only partly there');
      var all = JSON.parse(ps.map(function (p) { return p.data().t; }).join(''));
      all.sha = meta.sha;
      try { W.localStorage.setItem(CACHE, JSON.stringify(all)); } catch (e) { try { W.localStorage.removeItem(CACHE); } catch (e2) { } }
      return all;
    });
  }
  // THE PARTS OF THE PAGE. The box puts a button after every headed block it finds in the page's main area. A long
  // article on these sites is one block holding many headings, so each headed part is marked for it (data-fbk-title on
  // the last element of that part), and the article as a whole is marked "<its title> (all of it)". Only attributes
  // are added; nothing on the page moves.
  function main() { return d.getElementById('main') || d.querySelector('main'); }
  function prep(root) {
    var norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 80); };
    var heads = root.querySelectorAll('h2,h3'), parents = [], i;
    for (i = 0; i < heads.length; i++) if (parents.indexOf(heads[i].parentElement) < 0) parents.push(heads[i].parentElement);
    parents.forEach(function (p) {
      var kids = Array.prototype.slice.call(p.children);
      var top = kids.some(function (k) { return k.tagName === 'H2'; }) ? 'H2' : 'H3';
      var tops = kids.filter(function (k) { return k.tagName === top; });
      if (tops.length < 2) return;
      tops.forEach(function (h, n) {
        var next = tops[n + 1], last = h, k = h.nextElementSibling;
        while (k && k !== next) { last = k; k = k.nextElementSibling; }
        if (!last.hasAttribute('data-fbk-title')) last.setAttribute('data-fbk-title', norm(h.textContent));
      });
      // The box titles a block by a heading up to two levels down, so the article's own wrapper would take the first
      // part's name and repeat it: it is named for the whole article instead.
      var a = (p.parentElement && p.parentElement !== root && root.contains(p.parentElement)) ? p.parentElement : p;
      if (a !== p && !a.hasAttribute('data-fbk-title')) {
        var h1 = a.querySelector('h1');
        a.setAttribute('data-fbk-title', norm(h1 ? h1.textContent : d.title) + ' (all of it)');
      }
    });
  }
  function jsonTag(id, text) { var s = d.createElement('script'); s.type = 'application/json'; s.id = id; s.textContent = text || ''; return s; }
  function mount(F, db, meta, box) {
    if (mounted) return; mounted = true;
    W.__BOARD = BOARD;
    if (meta.emoji) W.__BOARDEMOJI = meta.emoji;
    var root = main();
    if (root) { try { prep(root); } catch (e) { } W.__fbkRoot = function () { return root; }; }
    F0 = F; DB0 = db;
    var db1 = dbDoor(F, db), as1 = assetsDoor(F, db);
    // Only the box's two doors. Nothing else on these pages looks for window.claude.
    W.claude = { use: function (what) { return Promise.resolve(what === 'db' ? db1 : what === 'assets' ? as1 : null); } };
    var st = d.createElement('style'); st.textContent = box.css; d.head.appendChild(st);
    var host = d.createElement('div'); host.id = 'ownerFbkHost'; host.setAttribute('dir', 'ltr');
    host.appendChild(jsonTag('fbkHandled', meta.handled || '{"pages":{}}'));
    host.appendChild(jsonTag('fbkReceived', meta.received || '[]'));
    host.appendChild(jsonTag('fbkWatermark', meta.watermark || '{}'));
    var t = d.createElement('template'); t.innerHTML = box.html;
    host.appendChild(t.content);
    d.body.appendChild(host);
    var sk = d.createElement('style'); sk.textContent = box.skin || ''; d.head.appendChild(sk);
    var sc = d.createElement('script'); sc.textContent = box.js; d.body.appendChild(sc);
    say(d.getElementById('fbkBar') ? 'on' : 'failed');
    try { screens(); } catch (e) { }
  }

  // ---- THE SHOW SCREEN, AND ANY OTHER FULL-SCREEN LAYER THAT MARKS ITSELF ---------------------------------------
  // One home for why and how: the header of ownerfb.py, "THE SHOW SCREEN". A layer that carries data-fbk-screen puts the
  // rest of the page away (intel.css hides every child of the body but itself), the box with it. While one is drawn:
  // the box is kept on screen, the html element carries data-fbk-viewon (the box's own contract for a view: its row sits
  // on the layer's bottom bar, data-fbk-foot), one Feedback button goes in the layer's tools bar (data-fbk-door), and
  // every note written there is labelled with the layer's name and what was on it when he opened the box (data-fbk-at).
  var SCREEN_CSS =
    // kept on screen: ids outrank the room's "every child of the body but the show" rule
    'html body>#ownerFbkHost,html body>#fbkViewA{display:block!important}' +
    '@media print{html body>#ownerFbkHost,html body>#fbkViewA{display:none!important}}' +
    // the row gets its own strip above the layer's bottom bar, so it never covers the item or the rundown
    'html[data-fbk-viewon] [data-fbk-screen] [data-fbk-foot]{margin-top:var(--fbk-row,50px)}' +
    'html[data-fbk-viewon] [data-fbk-screen][data-fbk-footless]{padding-bottom:var(--fbk-row,50px);box-sizing:border-box}' +
    'html[data-fbk-viewon]:fullscreen [data-fbk-screen][data-fbk-footless]{padding-bottom:0}' +
    // full screen is what an audience sees: the row steps aside, his Feedback button in the top bar still opens the box
    'html[data-fbk-viewon]:fullscreen #fbkBar:not(.trayopen){display:none!important}' +
    'html[data-fbk-viewon]:fullscreen [data-fbk-screen] [data-fbk-foot]{margin-top:0}' +
    // MEASURED at 360: one more button pushed the screen's tools bar 7px past the edge. On a phone the row's own
    // "Note on this view" is the door; the top button comes back only in full screen, where the row steps aside.
    '@media (max-width:900px){html:not(:fullscreen) .fbk-sdoor{display:none!important}}' +
    '.fbk-sdoor svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}';
  var PEN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg>';
  var scrStyled = false, scrOwned = false, scrSnap = '', scrObs = null, rowObs = null;
  function plainLine(s, n) { return String(s || '').replace(/[\r\n\t]+/g, ' ').replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, n); }
  function screenEl() {
    var s = d.querySelectorAll('[data-fbk-screen]');
    for (var i = 0; i < s.length; i++) if (s[i].isConnected && s[i].getClientRects().length) return s[i];
    return null;
  }
  function screenCtx() {
    var s = screenEl(); if (!s) return '';
    var name = plainLine(s.getAttribute('data-fbk-screen'), 40) || 'screen', at = plainLine(s.getAttribute('data-fbk-at'), 260);
    return 'THE ' + name.toUpperCase() + (at ? ', on ' + at : '');
  }
  // ownerfb.py makes the box ask these two for a view note's label (what Claude reads) and its line on his screen.
  W.__fbkViewLabel = function () { return screenEl() ? (scrSnap || screenCtx()) : ''; };
  W.__fbkViewShow = function () { var s = screenEl(); return s ? 'the ' + (plainLine(s.getAttribute('data-fbk-screen'), 40) || 'screen') : ''; };
  // What was on the screen when he opened the box, not when he finished typing (he may have moved on by then). Taken on the
  // press itself: this listens on the window, ahead of the box's own listener on the document.
  W.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-fbk-view],#fbkBarAdd,#fbkDrNew') : null;
    if (t && screenEl()) scrSnap = screenCtx();
  }, true);
  function rowHeight() {
    var b = d.getElementById('fbkBar'), H = d.documentElement;
    if (!b || b.classList.contains('trayopen')) return;
    var h = Math.round(b.offsetHeight || 0);
    if (h > 0 && h < 140) { var v = h + 'px'; if (H.style.getPropertyValue('--fbk-row') !== v) H.style.setProperty('--fbk-row', v); }
  }
  function screens() {
    if (!mounted) return;
    var s = screenEl(), H = d.documentElement, was = scrOwned;
    if (!scrObs && W.MutationObserver) {
      scrObs = new MutationObserver(function () { try { screens(); } catch (e) { } });
      scrObs.observe(d.body, { childList: true });
      scrObs.observe(H, { attributes: true, attributeFilter: ['class'] });
      // MEASURED: the box re-reads the bottom bar only when the bar's inner box changes, and a resize or full screen
      // changes its padding instead, so the row stayed where the old bar had been and covered 24px of the item.
      var later = 0, again = function () { W.clearTimeout(later); later = W.setTimeout(function () { if (scrOwned && typeof W.__fbkViewStep === 'function') { try { W.__fbkViewStep(); } catch (e) { } } rowHeight(); }, 120); };
      W.addEventListener('resize', again);
      d.addEventListener('fullscreenchange', again);
    }
    if (s) {
      if (!scrStyled) { scrStyled = true; var st = d.createElement('style'); st.id = 'ownerFbkScreen'; st.textContent = SCREEN_CSS; d.head.appendChild(st); }
      // the view's own contract: an empty selector means no single card, so the row's button writes about the screen
      if (!H.hasAttribute('data-fbk-viewon')) { H.setAttribute('data-fbk-viewon', ''); scrOwned = true; }
      var door = s.querySelector('[data-fbk-door]');
      if (door && !door.querySelector('.fbk-sdoor')) {
        var b = d.createElement('button');
        b.type = 'button'; b.className = 'fbk-sdoor'; b.setAttribute('data-fbk-view', '');
        b.title = 'A note for Claude about this screen. Only you see this button.';
        b.innerHTML = PEN + '<span>Feedback</span>';
        var last = door.lastElementChild;
        door.insertBefore(b, last && last.tagName === 'A' ? last : null);          // before the screen's own call to action, which stays last
      }
      if (!rowObs && W.ResizeObserver) { var bar = d.getElementById('fbkBar'); if (bar) { rowObs = new ResizeObserver(rowHeight); rowObs.observe(bar); } }
      rowHeight();
      // A layer can put its own bottom bar away (the show screen read as a page): the row then sits on the bottom edge,
      // and the layer keeps that strip free instead. The layer's own class changes say when; nothing here names a mode.
      if (!s.__fbkWatched && W.MutationObserver) { s.__fbkWatched = 1; scrObs.observe(s, { attributes: true, attributeFilter: ['class'] }); }
      var ft = s.querySelector('[data-fbk-foot]'), footless = !(ft && ft.getClientRects().length);
      if (footless !== s.hasAttribute('data-fbk-footless')) {
        if (footless) s.setAttribute('data-fbk-footless', ''); else s.removeAttribute('data-fbk-footless');
        if (scrOwned && was === scrOwned && typeof W.__fbkViewStep === 'function') { try { W.__fbkViewStep(); } catch (e) { } }
      }
    } else if (scrOwned) {
      H.removeAttribute('data-fbk-viewon'); scrOwned = false;
    }
    if (was !== scrOwned && typeof W.__fbkViewStep === 'function') { try { W.__fbkViewStep(); } catch (e) { } }
  }
  function check() {
    if (mounted || checking || !M) return;
    var u = null; try { u = M.user(); } catch (e) { u = null; }
    if (!u) return;
    checking = true;
    isOwner(u).then(function (yes) {
      if (!yes) { checking = false; say('not the owner'); return; }
      say('loading');
      return M.fb().then(function (x) {
        var F = x.F, db = x.db;
        return F.getDoc(F.doc(db, 'ownerfb', 'meta')).then(function (m) {
          if (!m.exists()) { say('no box yet'); return; }
          var meta = m.data();
          return code(F, db, meta).then(function (box) { mount(F, db, meta, box); });
        });
      });
    }).then(function () { checking = false; }, function (e) { checking = false; say('failed: ' + ((e && (e.code || e.message)) || e)); });
  }
  function signedOut() {
    var u = null; try { u = M.user(); } catch (e) { }
    // He signed out with the box open: the page reloads, so nothing of his stays drawn on it.
    if (mounted && !u) { W.location.reload(); }
  }
  (function wait(n) {
    if (W.LP && W.LP.members && typeof W.LP.members.user === 'function') {
      M = W.LP.members;
      M.sub(function () { signedOut(); check(); });
      check();
      return;
    }
    if (n < 200) W.setTimeout(function () { wait(n + 1); }, 150);
  })(0);
})();
