/* The betting markets on a race page, a race card or a country page (build/markets.py draws them; this file repaints them).
   Each block was drawn from the prices when the page was built. assets/markets.json is pushed to the live site every hour,
   so this reads it once and writes this hour's chances into every block, and says how old they are. A file over 48 hours
   old means the hourly push has stopped: the blocks are taken off the page rather than show old prices as news. */
(function () {
  'use strict';
  var D = document, W = window;
  var els = D.querySelectorAll('[data-mkt],[data-mkl],[data-mkw]');
  if (!els.length || !W.fetch) return;
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
    each('[data-mkw]', function (el) {
      var w = d.w && d.w[el.getAttribute('data-mkw')];
      if (!w) { el.hidden = true; return; }
      var by = {};
      w.o.forEach(function (o) { by[o[0]] = o[1]; });
      each('[data-mk-o]', function (li) {
        var p = by[li.getAttribute('data-mk-o')];
        if (p == null) return;
        li.querySelector('[data-mk="p"]').textContent = p + '%';
        li.querySelector('[data-mk-w="p"]').style.width = p + '%';
      }, el);
    });
  }).catch(function () {});
})();
