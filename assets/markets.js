/* The betting markets on a race page, a race card, a country page and inside the tools (build/markets.py draws them; this
   file repaints them). Three jobs:
   1. THE AFFILIATE DOOR, browser side: LPAff.link(url) -> {href, rel}, the twin of build/affiliate.py link(). Every market
      link a script draws (Call the Midterms, the coalition calculator, the Intel Room's Forces tab) goes through it. With
      no window.LP_AFF (no code yet) every link is plain, rel="noopener". On Iran Uncensored it is always plain: its
      readers may be inside Iran, where these platforms are blocked. LPAff.note(urls) is the one disclosure line, '' unless
      a link is tagged. Tested with a fake code by build/affiliate.py --test.
   2. THE ODDS SWITCH (Armin, 30 October 2026: "integrated ... but also in a way that could be ignored for people who don't
      like it ... Maybe it should just be there"). On by default. Any [data-mk-sw] button turns every market number on the
      site off or on, remembered in this browser (localStorage lp-odds); off is the class mk-off on <html>, set before the
      blocks paint by the one-line script printed with each switch, so a reader who turned them off never sees them flash.
      Off leaves one quiet line with the switch where each block was. Tools hear it as the event lp:odds.
   3. THIS HOUR'S PRICES. assets/markets.json is pushed to the live site every hour; each block was drawn when the page was
      built, so this reads the file once, writes the chances in, says how old they are, and hands the file to the tools as
      the event lp:markets. A file over 48 hours old means the hourly push has stopped: the blocks are taken off the page
      rather than show old prices as news. */
(function () {
  'use strict';
  var D = document, W = window;

  // ---------------------------------------------------------------- 1. the affiliate door
  var AFF = W.LP_AFF || null;
  var IU = /(^|\.)iranuncensored\.com$/i.test(String((W.location && W.location.hostname) || ''));
  function escA(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hostOf(u) { var m = /^https?:\/\/([^\/?#:]+)/i.exec(String(u || '')); return m ? m[1].toLowerCase() : ''; }
  function which(u) {
    if (!AFF || !AFF.h || IU) return null;
    var h = hostOf(u);
    for (var k in AFF.h) if (Object.prototype.hasOwnProperty.call(AFF.h, k) && (h === k || h.slice(-(k.length + 1)) === '.' + k)) return k;
    return null;
  }
  function link(u) {
    u = String(u || '');
    var k = which(u);
    if (!k) return { href: u, rel: 'noopener' };
    var pc = AFF.h[k], hi = u.indexOf('#'), hash = hi >= 0 ? u.slice(hi) : '', base = hi >= 0 ? u.slice(0, hi) : u;
    var qi = base.indexOf('?'), path = qi >= 0 ? base.slice(0, qi) : base, q = qi >= 0 ? base.slice(qi + 1) : '';
    var parts = q ? q.split('&').filter(function (x) { return x && decodeURIComponent(x.split('=')[0]) !== pc[0]; }) : [];
    parts.push(encodeURIComponent(pc[0]) + '=' + encodeURIComponent(pc[1]));
    return { href: path + '?' + parts.join('&') + hash, rel: 'sponsored noopener' };
  }
  function note(urls) {
    var names = [];
    (urls || []).forEach(function (u) { var k = which(u); if (k && names.indexOf(AFF.n[k]) < 0) names.push(AFF.n[k]); });
    return names.length ? String(AFF.say || '').replace('{names}', names.join(' and ')) : '';
  }
  function a(u, text, cls) { var l = link(u); return '<a' + (cls ? ' class="' + cls + '"' : '') + ' href="' + escA(l.href) + '" target="_blank" rel="' + l.rel + '">' + text + '</a>'; }
  function isOn() { return !D.documentElement.classList.contains('mk-off'); }
  W.LPAff = { link: link, note: note, a: a, on: isOn };

  // ---------------------------------------------------------------- 2. the odds switch
  function paintSwitches() {
    var on = isOn();
    [].forEach.call(D.querySelectorAll('[data-mk-sw]'), function (b) { b.setAttribute('aria-checked', on ? 'true' : 'false'); });
  }
  function setOn(on) {
    D.documentElement.classList.toggle('mk-off', !on);      // a boolean, never undefined: toggle(c, undefined) FLIPS
    try { if (on) W.localStorage.removeItem('lp-odds'); else W.localStorage.setItem('lp-odds', 'off'); } catch (err) {}
    paintSwitches();
    try { D.dispatchEvent(new CustomEvent('lp:odds', { detail: { on: on } })); } catch (err) {}
  }
  try { if (W.localStorage.getItem('lp-odds') === 'off') D.documentElement.classList.add('mk-off'); } catch (err) {}
  paintSwitches();
  D.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest('[data-mk-sw]');
    if (b) setOn(!isOn());
  });

  // ---------------------------------------------------------------- 3. this hour's prices
  var els = D.querySelectorAll('[data-mkt],[data-mkl],[data-mkw],[data-mkp],[data-mkx]');
  if (!W.fetch) return;
  var me = D.currentScript, root = (me && me.getAttribute('data-root')) || '../../';
  function each(sel, fn, inEl) { [].forEach.call((inEl || D).querySelectorAll(sel), fn); }
  function ago(t) {
    var m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 2) return 'prices this minute';
    if (m < 60) return 'prices ' + m + ' min ago';
    var h = Math.round(m / 60);
    return 'prices ' + h + ' hour' + (h === 1 ? '' : 's') + ' ago';
  }
  function hideAll() { [].forEach.call(els, function (el) { el.hidden = true; }); }
  if (!els.length && !D.querySelector('[data-mk-sw]')) return;
  W.fetch(root + 'assets/markets.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.at) return;
    var t = Date.parse(d.at);
    if (!(t > 0) || Date.now() - t > 48 * 3600 * 1000) { hideAll(); return; }
    each('.mk-t', function (el) { el.textContent = ago(t); el.setAttribute('data-mk-at', d.at); });
    each('[data-mkt]', function (el) {
      var m = d.r && d.r[el.getAttribute('data-mkt')];
      if (!m) { el.hidden = true; return; }
      each('[data-mk="L"]', function (b) { b.textContent = m[0] + '%'; }, el);
      each('[data-mk="R"]', function (b) { b.textContent = m[1] + '%'; }, el);
      each('[data-mk-w="L"]', function (i) { i.style.width = m[0] + '%'; }, el);
      each('[data-mk-w="R"]', function (i) { i.style.width = m[1] + '%'; }, el);
    });
    each('[data-mkl]', function (el) {
      var m = d.r && d.r[el.getAttribute('data-mkl')], b = el.querySelector('b');
      if (!m || !b) { el.hidden = true; return; }
      var L = m[0] >= m[1];
      b.textContent = el.getAttribute(L ? 'data-ln' : 'data-rn') + ' ' + (L ? m[0] : m[1]) + '%';
      b.className = 'is-' + (L ? el.getAttribute('data-lp') : 'R');
    });
    // a country's question (a block of its own, or the strip inside the coalition calculator)
    each('[data-mkw]', function (el) {
      var w = d.w && d.w[el.getAttribute('data-mkw')];
      if (!w) { el.hidden = true; return; }
      var by = {};
      w.o.forEach(function (o) { by[o[0]] = o[1]; });
      each('[data-mk-o]', function (li) {
        var p = by[li.getAttribute('data-mk-o')];
        if (p == null) return;
        var n = li.querySelector('[data-mk="p"]'), i = li.querySelector('[data-mk-w="p"]');
        if (n) n.textContent = p + '%';
        if (i) i.style.width = p + '%';
      }, el);
    });
    // a leader's chance on a party row of the coalition calculator: data-mkp="<country>" data-mk-o="<the market's name>"
    each('[data-mkp]', function (el) {
      var w = d.w && d.w[el.getAttribute('data-mkp')], p = null;
      (w ? w.o : []).forEach(function (o) { if (o[0] === el.getAttribute('data-mk-o')) p = o[1]; });
      if (p == null) { el.hidden = true; return; }
      var b = el.querySelector('b'); if (b) b.textContent = p + '%';
    });
    // one more question about a country (Netanyahu out by ..., a majority for PP and Vox): data-mkx="<country>:<n>"
    each('[data-mkx]', function (el) {
      var k = el.getAttribute('data-mkx').split(':'), w = d.w && d.w[k[0]], x = w && w.x && w.x[+k[1]];
      if (!x) { el.hidden = true; return; }
      var b = el.querySelector('b'); if (b) b.textContent = x.p + '%';
    });
    try { D.dispatchEvent(new CustomEvent('lp:markets', { detail: d })); } catch (err) {}
    W.LPAff.doc = d;
  }).catch(function () {});
})();
