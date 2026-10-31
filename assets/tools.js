/* Tools (tools/): the page's own discussion is the list of ideas for the next tool. THE ONE HOME of the plan is
   ../TOOLS.md; the page is build/tools.py, its look build/tools.css (prefix tk-). The same file on both sites.

   What this file does, and nothing else:
   1. dresses each idea row that the shared community.js draws (window.LPTalkRows): the name as a title, "I want this"
      on the like, "Talk about it" on the reply, the register's extras (markets, what you'd do, the call, the size) copied
      from the idea's own card, and "Suggested by <name>" on a reader's idea. The vote, the reply, the report, the
      sign-in panel and its reason line are community.js's own; nothing is sent from here.
   2. hides an idea's printed card once its live row is on the list (the printed cards are the list without scripts,
      without the database, and for an idea not yet posted).
   3. puts this hour's odds on a market the site tracks every hour (assets/calls.json on Liberty Politics), matched by id
      or address; otherwise the register's numbers and their date stay.
   4. turns the box under Suggest a tool into a suggestion: a name (the post's subject) and what it would do (tag idea). */
(function () {
  'use strict';
  var D = document, data;
  try { data = JSON.parse(D.getElementById('tk-data').textContent); } catch (x) { return; }
  var W = data.w || {}, FA = data.lang === 'fa', byPost = {};
  (data.ideas || []).forEach(function (i) { if (i.post) byPost[i.post] = i; });
  /* One of my ideas is its post id from the register, or, until the page is rebuilt with that id, a post by the site's own
     account whose subject is the idea's name in either language. */
  function ideaOf(p) {
    if (byPost[p.id]) return byPost[p.id];
    if (!data.host || p.uid !== data.host) return null;
    return (data.ideas || []).filter(function (i) { return (i.names || [i.name]).indexOf(p.subject) >= 0; })[0] || null;
  }
  var FAD = '۰۱۲۳۴۵۶۷۸۹';
  function dig(n) { var s = String(n); return FA ? s.replace(/[0-9]/g, function (d) { return FAD[d]; }).replace('.', '٫') : s; }
  function fill(s, v) { return String(s || '').replace(/\{(\w+)\}/g, function (m, k) { return k in v ? v[k] : m; }); }
  function el(tag, cls, text) { var x = D.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }
  function pct(c) { var p = c * 100, s = p >= 10 || Math.abs(p - Math.round(p)) < 0.05 ? String(Math.round(p)) : p.toFixed(1); return FA ? dig(s) + '٪' : s + '%'; }
  function money(v) {
    if (FA) return dig(v >= 1e9 ? (v / 1e9).toFixed(2) + ' میلیارد' : v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + ' میلیون' : Math.round(v / 1e3) + ' هزار') + ' دلار';
    return v >= 1e9 ? '$' + (v / 1e9).toFixed(2) + 'B' : v >= 1e6 ? '$' + (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : '$' + Math.round(v / 1e3) + 'K';
  }
  var pageName = (D.getElementById('talk') || { getAttribute: function () { return ''; } }).getAttribute('data-name') || '';

  /* ---- 3. this hour's odds ---- */
  var live = null;
  function liven(scope) {
    if (!live) return;
    Array.prototype.forEach.call((scope || D).querySelectorAll('.tk-mk'), function (li) {
      var m = live[li.getAttribute('data-mid')] || live['u:' + li.getAttribute('data-u')];
      if (!m || !Array.isArray(m.o)) return;
      var hit = false;
      Array.prototype.forEach.call(li.querySelectorAll('.tk-mp'), function (b) {
        var want = b.getAttribute('data-l'), o = m.o.filter(function (x) { return x[0] === want; })[0];
        if (o && typeof o[1] === 'number') { b.textContent = pct(o[1]); hit = true; }
      });
      if (!hit) return;
      var v = li.querySelector('.tk-mvn'), now = li.querySelector('.tk-now');
      if (v && typeof m.v === 'number' && m.src === 'p') v.textContent = fill(v.getAttribute('data-f') || '{m}', { m: money(m.v) });
      if (now) now.hidden = false;
    });
  }
  if (data.calls && window.fetch) {
    fetch(data.calls, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !Array.isArray(j.m)) return;
      live = {};
      j.m.forEach(function (m) { if (m && m.id) { live[m.id] = m; if (m.u) live['u:' + m.u] = m; } });
      liven();
    }).catch(function () { });
  }

  /* ---- 1 and 2. the rows of the live list ---- */
  function dress(li, p, n) {
    if (p.parent || !D.getElementById('tk-data')) return;
    var idea = ideaOf(p);
    if (!idea && p.tag !== 'idea') return;
    li.classList.add('tk-row');
    var head = li.querySelector('.said-head'), about = li.querySelector('.said-about'), q = li.querySelector('blockquote');
    if (about) about.remove();
    var kind = li.querySelector('.tag.kind'); if (kind) kind.remove();
    var name = idea ? idea.name : (p.subject && p.subject !== pageName ? p.subject : String(p.text || '').slice(0, 60));
    var h = el('h3', 'tk-name', name);
    if (head && head.nextSibling) li.insertBefore(h, head.nextSibling); else li.prepend(h);
    if (idea) {
      li.classList.add('tk-mine');
      /* The site's own idea reads in this page's language: the register holds both, the post holds one. */
      if (q) { q.textContent = idea.pitch; q.setAttribute('dir', FA ? 'rtl' : 'ltr'); }
      var tr = li.querySelector('p.tr'); if (tr) tr.remove();
      var card = D.querySelector('.tk-card[data-idea="' + idea.id + '"]');
      var x = card && card.querySelector('.tk-x');
      if (x) { var c = x.cloneNode(true); var bar = li.querySelector('.said-bar'); if (bar) li.insertBefore(c, bar); else li.append(c); liven(c); }
      if (card) card.hidden = true;
    } else {
      h.after(el('p', 'tk-by', fill(W.by, { name: p.name || '' })));
    }
    var up = li.querySelector('.vt-up');
    if (up) {
      var s = up.querySelector('span'); if (s) s.textContent = W.want;
      var k = p.ups || 0, on = up.getAttribute('aria-pressed') === 'true';
      up.setAttribute('aria-label', on ? fill(W.a_on, { n: dig(k) }) : k === 1 ? W.a_want1 : fill(W.a_want, { n: dig(k) }));
    }
    var rb = li.querySelector('.reply-b');
    if (rb && rb.getAttribute('aria-expanded') !== 'true') rb.textContent = W.talk + (n ? ' (' + dig(n) + ')' : '');
    var best = li.querySelector('.tag.best'); if (best) best.textContent = W.best;
    hideCards();
  }
  (window.LPTalkRows = window.LPTalkRows || []).push(dress);
  /* Every printed card whose idea is on the live list is hidden; the list of printed cards goes when it is empty. */
  function hideCards() {
    var ol = D.getElementById('tk-ideas');
    if (!ol) return;
    var left = Array.prototype.some.call(ol.children, function (c) { return !c.hidden; });
    ol.hidden = !left;
  }

  /* ---- 4. Suggest a tool ---- */
  function suggest() {
    var B = window.LPBox, form = D.getElementById('fbform'), row = D.getElementById('tk-namerow'), input = D.getElementById('tk-name'), ctx = D.getElementById('fbctx');
    if (!B || !form || !row || !input || !ctx || !D.getElementById('tk-data')) return;
    var K = B.K && B.K.idea;
    if (K) { K.lab = W.msg_l; K.ph = W.msg_ph; K.done = W.done; K.short = W.short; }
    var idea = form.querySelector('input[type=radio][value=idea]');
    function asIdea() { if (idea && !idea.checked) { idea.checked = true; B.shape(); } }
    asIdea(); B.shape();
    var lab = D.getElementById('fbmsglab');
    if (lab && lab.parentNode === form) form.insertBefore(row, lab); else form.prepend(row);
    row.hidden = false;
    var go = form.querySelector('button[type=submit]'); if (go) go.textContent = W.send;
    function put() { var v = input.value.replace(/[\[\]]/g, '').trim().slice(0, 60); ctx.value = v ? v + ' [tool]' : ''; }
    /* A draft kept on this device comes back with its name in it (community.js put it back as "About: ..."). */
    var m = /^(.*) \[tool\]$/.exec(ctx.value || '');
    if (m) { B.subject('', '', ''); input.value = m[1]; put(); }
    input.addEventListener('input', put);
    D.getElementById('suggest').addEventListener('submit', function (ev) {
      asIdea(); put();
      if (!input.value.trim()) { ev.preventDefault(); ev.stopPropagation(); B.say(W.no_name, true); input.focus(); }
    }, true);
    D.addEventListener('lp:posted', function () { input.value = ''; put(); });
  }
  /* After discussion.js (window.LPBox) and community.js have run: both load after this file, and both run before DOMContentLoaded. */
  if (D.readyState === 'complete') suggest(); else D.addEventListener('DOMContentLoaded', suggest);
  hideCards();
})();
