/* Liberty Score. Every page works with this file missing: lists are printed in full by the build,
   and this only narrows them. Nothing is hidden first and revealed later. */
(function () {
  'use strict';
  var root = document.documentElement.getAttribute('data-root') || './';
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---- home: find a member by name or state ---- */
  var find = document.getElementById('find');
  if (find) {
    var hits = document.getElementById('hits'), idx = null, loading = false;
    function load(cb) {
      if (idx) return cb();
      if (loading) return; loading = true;
      fetch(root + 'data/index.json').then(function (r) { return r.json(); }).then(function (d) { idx = d; cb(); })
        .catch(function () { loading = false; });
    }
    function show() {
      var q = norm(find.value.trim());
      hits.textContent = '';
      if (q.length < 2 || !idx) return;
      var out = idx.filter(function (m) { return norm(m.n + ' ' + m.s + ' ' + m.a).indexOf(q) >= 0; }).slice(0, 12);
      if (!out.length) { var li = el('li', 'none', 'No member of Congress matches that. Try a last name or a state.'); hits.appendChild(li); return; }
      out.forEach(function (m) {
        var li = el('li'), a = el('a');
        a.href = root + 'scorecard/' + m.u + '/';
        var g = el('span', 'g g-sm g-' + (m.g ? m.g[0].toLowerCase() : 'n'), m.g || '?');
        var who = el('span', 'who');
        var st = el('strong', null, m.n);
        who.appendChild(st); who.appendChild(el('span', 'dim', ' ' + m.p + ' · ' + m.s + ' · ' + m.c));
        a.appendChild(g); a.appendChild(who); li.appendChild(a); hits.appendChild(li);
      });
    }
    find.addEventListener('focus', function () { load(show); });
    find.addEventListener('input', function () { load(show); });
    find.form.addEventListener('submit', function (e) {
      var first = hits.querySelector('a');
      if (first) { e.preventDefault(); location.href = first.href; }
    });
    var sp = document.getElementById('statepick');
    if (sp) sp.addEventListener('change', function () { if (sp.value) location.href = root + 'states/' + sp.value + '/'; });
  }

  /* ---- scorecard list: search, filters, sort ---- */
  var list = document.getElementById('all');
  if (list) {
    var q = document.getElementById('q'), fc = document.getElementById('f-chamber'), fp = document.getElementById('f-party'),
      fs = document.getElementById('f-state'), so = document.getElementById('f-sort'), fb = document.getElementById('f-ballot'),
      count = document.getElementById('count'), items = Array.prototype.slice.call(list.children);
    var params = new URLSearchParams(location.search);
    if (params.get('q')) q.value = params.get('q');
    function apply() {
      var qq = norm(q.value.trim()), n = 0;
      items.forEach(function (li) {
        var d = li.dataset, ok = (!qq || d.k.indexOf(qq) >= 0) && (!fc.value || d.c === fc.value) && (!fp.value || d.p === fp.value) &&
          (!fs.value || d.s === fs.value) && (!fb.checked || d.b === '1');
        li.hidden = !ok; if (ok) n++;
      });
      count.textContent = n === items.length ? 'Showing all ' + n + ' members.' : 'Showing ' + n + ' of ' + items.length + ' members.';
    }
    function sort() {
      var v = so.value;
      items.sort(function (a, b) {
        var x = a.dataset, y = b.dataset;
        if (v === 'best') return (+y.v) - (+x.v) || x.n.localeCompare(y.n);
        if (v === 'worst') return (x.v === '-1') - (y.v === '-1') || (+x.v) - (+y.v) || x.n.localeCompare(y.n);
        if (v === 'state') return x.s.localeCompare(y.s) || x.n.localeCompare(y.n);
        return x.n.localeCompare(y.n);
      });
      items.forEach(function (li) { list.appendChild(li); });
    }
    [q, fc, fp, fs, fb].forEach(function (c) { c.addEventListener('input', apply); c.addEventListener('change', apply); });
    so.addEventListener('change', function () { sort(); apply(); });
    apply();
  }

  /* ---- member page: narrow the vote list ---- */
  var votes = document.getElementById('votes');
  if (votes) {
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip')), rows = Array.prototype.slice.call(votes.children),
      vc = document.getElementById('vcount'), cur = { m: '', o: '' };
    function vapply() {
      var n = 0;
      rows.forEach(function (li) {
        var ok = (!cur.m || li.dataset.m === cur.m) && (!cur.o || li.dataset.o === cur.o);
        li.hidden = !ok; if (ok) n++;
      });
      vc.textContent = n === rows.length ? rows.length + ' actions on the record.' : n + ' of ' + rows.length + ' actions shown.';
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var kind = c.dataset.kind, val = c.dataset.val;
        cur[kind] = (cur[kind] === val) ? '' : val;
        chips.forEach(function (o) { if (o.dataset.kind === kind) o.setAttribute('aria-pressed', String(o.dataset.val === cur[kind])); });
        vapply();
      });
    });
    vapply();
  }

  /* ---- copy the link ---- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) {
    b.addEventListener('click', function () {
      var url = b.getAttribute('data-copy'), old = b.textContent;
      function done(ok) { b.textContent = ok ? 'Link copied' : 'Copy failed, press and hold the address bar'; setTimeout(function () { b.textContent = old; }, 2200); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      else done(false);
    });
  });
})();
