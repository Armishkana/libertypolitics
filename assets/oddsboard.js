/* THE ODDS BOARD, this hour (build/oddsboard.py draws it; its header says what it is and why).
   This file only puts this hour's prices from assets/calls.json (pushed hourly) on what the build drew: a tile's number and
   its move, a ladder's points, labels and curve. It never redraws, adds or removes a market, and it hides nothing: with
   scripts off, or with the file missing, the build's numbers stay with their date. */
(function () {
  'use strict';
  var D = document;
  var boards = [].slice.call(D.querySelectorAll('.ob[data-calls]'));
  if (!boards.length || !window.fetch) return;
  function pct(p) { var x = p * 100; return x > 0 && x < 1 ? '<1%' : x > 99 && x < 100 ? '>99%' : Math.round(x) + '%'; }
  function signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); }
  function price(m, o) { var x = (m.o || []).filter(function (q) { return q[0] === o; })[0]; return x && typeof x[1] === 'number' ? x[1] : null; }
  function apply(j, ob) {
    var by = {};
    (j.m || []).forEach(function (m) { if (m && m.id && m.st === 'open') by[m.id] = m; });
    var hit = 0;
    [].forEach.call(ob.querySelectorAll('.ob-t a[data-mid]'), function (a) {
      var m = by[a.getAttribute('data-mid')], p = m && price(m, a.getAttribute('data-o'));
      if (p == null) return;
      a.querySelector('.ob-p').textContent = pct(p); hit++;
      var mv = a.querySelector('.ob-mv'), base = parseFloat(a.getAttribute('data-base'));
      if (mv && !isNaN(base)) {
        var n = Math.round((p - base) * 100);
        mv.textContent = (n ? signed(n) + ' pts ' : 'no change ') + a.getAttribute('data-span');
        mv.className = 'ob-mv is-' + (n > 0 ? 'up' : n < 0 ? 'dn' : 'eq');
      }
    });
    [].forEach.call(ob.querySelectorAll('.ob-ld'), function (f) {
      var H = +f.getAttribute('data-h'), T = +f.getAttribute('data-t'), B = +f.getAttribute('data-b'), pts = [];
      [].forEach.call(f.querySelectorAll('.ob-pt'), function (a) {
        var c = a.querySelector('circle'), m = by[a.getAttribute('data-mid')], p = m && price(m, 'Yes');
        if (p != null) {
          var y = T + (H - T - B) * (1 - p);
          c.setAttribute('cy', y.toFixed(1));
          var v = a.querySelector('.ob-pv'); v.setAttribute('y', (y - 12).toFixed(1)); v.textContent = pct(p); hit++;
        }
        pts.push([+c.getAttribute('cx'), +c.getAttribute('cy')]);
      });
      if (pts.length < 2) return;
      var d = 'M' + pts.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' L');
      var ln = f.querySelector('.ob-ln'), ar = f.querySelector('.ob-ar');
      if (ln) ln.setAttribute('d', d);
      if (ar) ar.setAttribute('d', d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (H - B) + ' L' + pts[0][0].toFixed(1) + ' ' + (H - B) + ' Z');
    });
    if (hit) {
      var at = ob.querySelector('.ob-at');
      if (at && j.at && j.at > (at.getAttribute('data-at') || '')) { at.textContent = 'this hour'; at.setAttribute('data-at', j.at); }
      ob.classList.add('is-live');
    }
  }
  var url = boards[0].getAttribute('data-calls');
  fetch(url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !Array.isArray(j.m)) return;
    boards.forEach(function (ob) { try { apply(j, ob); } catch (x) { } });
  }).catch(function () { });
})();
