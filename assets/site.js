/* Liberty Score. Every page works with this file missing: lists are printed in full by the build,
   and this only narrows them. Nothing is hidden first and revealed later. */
(function () {
  'use strict';
  var root = document.documentElement.getAttribute('data-root') || './';
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---- the front page's question of the day ----
     The front page asks a political question, and a new one each day (data/front-questions.json; Armin,
     6 October 2026: "asking political questions for people to answer would be the best"). The build prints
     the question of the day it was built; this shows today's, picked by the date alone, so every reader
     sees the same question on the same day and the page changes without a publish. It is set in the three
     places that ask it (the question near the top, the end of the record, the label over the box) before
     anything else reads them. The discussion is also named after the question, so a post sent today still
     says what it was answering after the question has moved on. */
  /* Since 14 October 2026 (evening) the front page's FIRST ask is the front question (build/members.py) and the question of
     the day is the question of its DISCUSSION only: the list rides on the band at the end of the record (#band), not on a
     question near the top (#nudge), which the front page no longer has. Either one may carry it. */
  (function () {
    var nd = document.getElementById('nudge'), src = document.querySelector('[data-asks]'), list = [];
    try { list = JSON.parse((src && src.getAttribute('data-asks')) || '[]'); } catch (x) { list = []; }
    if (!list.length) return;
    var q = list[Math.floor(Date.now() / 86400000) % list.length];
    if (typeof q !== 'string' || !q) return;
    var b = nd && nd.querySelector('.nudge-q b'), h = document.querySelector('#band h2');
    if (b) b.textContent = q;
    if (h) h.textContent = q;
    /* The box and the discussion's name are no longer set from this list (15 October 2026): All discussions starts a
       reader on people waiting for an answer (community.js drawJump), not on a question nobody there is talking about. */
  })();

  /* ---- the invitation to the daily call: a reader can put it away for this visit ---- */
  var calls = document.getElementById('calls'), callsX = document.getElementById('calls-x');
  if (calls && callsX) {
    try { if (sessionStorage.getItem('lp-calls') === 'off') calls.className += ' off'; } catch (x) {}
    callsX.addEventListener('click', function () { calls.className += ' off'; try { sessionStorage.setItem('lp-calls', 'off'); } catch (x) {} });
  }
  /* THE BUBBLE NEVER STEPS ASIDE (14 October 2026, evening). Armin: it "is good. I just don't like that I have to scroll
     down to see it ... It should be there all the time." From that morning it had stepped aside while the front page's
     three ways in (or the Missions page's next mission) were on screen, so a visitor arriving on the front page did not see
     it until they scrolled. The three ways in are gone, and so is the stepping aside: the bubble is on screen from the
     first pixel, on every page, until the reader's own cross puts it away for the visit. */

  /* ---- a link that opens the sign-in (the account mission, data-open-acct) ----
     The Sign in button in the header (#acct) is what community.js turns into the sign-in panel. Any link marked
     data-open-acct hands its tap to it; with scripts off, or a build with no accounts, it is a plain link to the page that
     explains accounts. */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[data-open-acct]') : null, acct = document.getElementById('acct');
    if (!a || !acct || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault(); acct.click();
  });

  /* ---- matching, shared by the home search and the scorecard search ----
     Each word typed must be the two-letter code of the member's state, or the START of a word in the
     member's name or state. Whole-string matching failed on "susan collins" (her listed name carries a
     middle initial), and substring matching made "ny" find Cornyn and "house" find Whitehouse. */
  function words(s) { return norm(s).split(/[^a-z0-9]+/).filter(Boolean); }
  function matches(q, toks, code) {
    return q.every(function (w) { return w === code || toks.some(function (t) { return t.indexOf(w) === 0; }); });
  }

  /* ---- home: find a member by name or state ---- */
  var find = document.getElementById('find');
  if (find) {
    var hits = document.getElementById('hits'), idx = null, loading = false, sp = document.getElementById('statepick');
    function load(cb) {
      if (idx) return cb();
      if (loading) return; loading = true;
      fetch(root + 'data/index.json').then(function (r) { return r.json(); }).then(function (d) {
        d.forEach(function (m) { m.t = words(m.n + ' ' + (m.f || '') + ' ' + m.s); m.code = m.a.toLowerCase(); });
        idx = d; cb();
      }).catch(function () { loading = false; });
    }
    function stateFor(q) {
      if (!sp || !q) return '';
      var opts = sp.options, i;
      for (i = 0; i < opts.length; i++) if (opts[i].value && (opts[i].value === q || norm(opts[i].text) === q)) return opts[i].value;
      return '';
    }
    function show() {
      var raw = norm(find.value.trim()), q = words(raw);
      hits.textContent = '';
      if (raw.length < 2 || !idx) return;
      var all = idx.filter(function (m) { return matches(q, m.t, m.code); }), st = stateFor(raw);
      /* How to vote (build/vote.py): a state typed here offers its guide as a line of its own, beside its ballot, not as one row among forty. */
      var guide = st ? idx.filter(function (m) { return m.k === 'guide' && m.code === st; })[0] : null;
      if (st) all = all.filter(function (m) { return m.k !== 'guide'; });
      if (st) all.sort(function (a, b) { return (b.code === st) - (a.code === st); });
      var out = all.slice(0, 12);
      if (!all.length) { hits.appendChild(el('li', 'none', 'No member of Congress or candidate matches that. Try a last name or a state.')); return; }
      if (st) {
        var sl = el('li'), sa = el('a', 'allhits', 'See who is on the ballot in ' + sp.querySelector('option[value="' + st + '"]').text);
        sa.href = root + 'states/' + st + '/#ballot'; sl.appendChild(sa); hits.appendChild(sl);
        if (guide) { var gl = el('li'), ga = el('a', 'allhits', guide.n); ga.href = root + guide.h; gl.appendChild(ga); hits.appendChild(gl); }
      }
      out.forEach(function (m) {
        var li = el('li'), a = el('a');
        a.href = root + (m.h || 'scorecard/' + m.u + '/');
        var g = el('span', 'g g-sm g-' + (m.g ? m.g[0].toLowerCase() : 'n'), m.g || (m.h ? '–' : '?'));
        var who = el('span', 'who');
        who.appendChild(el('strong', null, m.n)); who.appendChild(el('span', 'dim', m.k === 'guide' ? ' ' + m.c : ' ' + m.p + ' · ' + m.s + ' · ' + m.c));
        if (m.i) { var im = el('img', 'face ' + m.p); im.src = root + m.i; im.alt = ''; im.width = 40; im.height = 40; a.appendChild(im); }
        a.appendChild(who); if (m.k !== 'guide') a.appendChild(g);      /* a guide is not a person: it carries no grade and no dash */
        li.appendChild(a); hits.appendChild(li);
      });
      if (all.length > out.length) {
        var ml = el('li'), ma = el('a', 'allhits', 'See all ' + all.length + ' on the scorecard');
        ma.href = root + 'scorecard/?q=' + encodeURIComponent(find.value.trim()); ml.appendChild(ma); hits.appendChild(ml);
      }
    }
    function shut() { hits.textContent = ''; }
    find.addEventListener('focus', function () { load(show); });
    find.addEventListener('input', function () { load(show); });
    find.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
    document.addEventListener('click', function (e) { if (!find.form.contains(e.target)) shut(); });
    find.form.addEventListener('focusout', function () { setTimeout(function () { if (!find.form.contains(document.activeElement)) shut(); }, 150); });
    find.form.addEventListener('submit', function (e) {
      var st = stateFor(norm(find.value.trim())), first = hits.querySelector('a');
      if (st) { e.preventDefault(); location.href = root + 'states/' + st + '/'; }
      else if (first) { e.preventDefault(); location.href = first.href; }
    });
    if (sp) sp.addEventListener('change', function () { if (sp.value) location.href = root + 'states/' + sp.value + '/'; });
  }

  /* ---- scorecard list: search, filters, sort ---- */
  var list = document.getElementById('all');
  if (list) {
    var q = document.getElementById('q'), fc = document.getElementById('f-chamber'), fp = document.getElementById('f-party'),
      fs = document.getElementById('f-state'), so = document.getElementById('f-sort'), fb0 = document.getElementById('f-ballot'), fg = document.getElementById('f-grade'),
      count = document.getElementById('count'), items = Array.prototype.slice.call(list.children),
      clist = document.getElementById('cands'), ccount = document.getElementById('ccount'), hint = document.getElementById('racehint'),
      citems = clist ? Array.prototype.slice.call(clist.children) : [], hint0 = hint ? hint.innerHTML : '';
    items.forEach(function (li, i) { li._i = i; li._t = li.dataset.k.split(' '); });
    citems.forEach(function (li) { li._t = li.dataset.k.split(' '); });
    /* The state a reader is looking at: the State filter, or a search that is a state's name or code. */
    function stateNow() {
      if (fs.value) return fs.value;
      var raw = norm(q.value.trim()), o = fs.options, i;
      for (i = 0; i < o.length; i++) if (o[i].value && raw && (o[i].value === raw || norm(o[i].text) === raw)) return o[i].value;
      return '';
    }
    function pass(li, qq) {
      var d = li.dataset;
      return (!qq.length || matches(qq, li._t, d.s)) && (!fc.value || d.c === fc.value) && (!fp.value || d.p === fp.value) &&
        (!fs.value || d.s === fs.value) && (!fg.value || d.g === fg.value) && (!fb0.value || d.b === fb0.value);
    }
    var params = new URLSearchParams(location.search);
    if (params.get('q')) q.value = params.get('q');
    function apply() {
      var qq = words(q.value), n = 0;
      items.forEach(function (li) { var ok = pass(li, qq); li.hidden = !ok; if (ok) n++; });
      var cn = 0;
      citems.forEach(function (li) { var ok = pass(li, qq); li.hidden = !ok; if (ok) cn++; });
      count.textContent = n === items.length ? 'Showing all ' + n + ' members.' :
        n ? 'Showing ' + n + ' of ' + items.length + ' members.' : 'No member matches. Clear the search, or set the filters back to all.';
      if (cn && n !== items.length) {
        count.appendChild(document.createTextNode(' And '));
        var jump = el('a', null, cn + (cn === 1 ? ' candidate who is' : ' candidates who are') + ' not in Congress');
        jump.href = '#cands-h'; count.appendChild(jump); count.appendChild(document.createTextNode(', further down.'));
      }
      if (ccount) ccount.textContent = cn === citems.length ? 'Showing all ' + cn + ' candidates.' :
        cn ? 'Showing ' + cn + ' of ' + citems.length + ' candidates.' : 'No candidate matches.';
      if (hint) {
        var st = stateNow();
        if (st) {
          var name = fs.querySelector('option[value="' + st + '"]').text;
          hint.textContent = 'Voting in ' + name + '? ';
          var go = el('a', null, 'See every race in ' + name + ' on November 3, with the candidates side by side');
          go.href = root + 'states/' + st + '/#ballot'; hint.appendChild(go);
        } else hint.innerHTML = hint0;
      }
    }
    function sort() {
      var v = so.value;
      items.sort(function (a, b) {
        var x = a.dataset, y = b.dataset;
        if (v === 'best') return a._i - b._i;
        if (v === 'worst') return (x.v === '-1') - (y.v === '-1') || (+x.v) - (+y.v) || b._i - a._i;
        if (v === 'state') return x.t.localeCompare(y.t) || x.n.localeCompare(y.n);
        return x.n.localeCompare(y.n);
      });
      items.forEach(function (li) { list.appendChild(li); });
    }
    [q, fc, fp, fs, fg, fb0].forEach(function (c) { c.addEventListener('input', apply); c.addEventListener('change', apply); });
    so.addEventListener('change', function () { sort(); apply(); });
    apply();
  }

  /* ---- a state picker that opens that state's page ---- */
  // The row of Elections pages (render.py elections_strip): on a phone it slides inside itself, so the page you are on is
  // brought into view, never left past the edge.
  Array.prototype.forEach.call(document.querySelectorAll('.estrip-l a[aria-current]'), function (a) {
    var row = a.parentNode;
    if (row.scrollWidth > row.clientWidth) row.scrollLeft = Math.max(0, a.offsetLeft - row.offsetLeft - (row.clientWidth - a.offsetWidth) / 2);
  });
  Array.prototype.forEach.call(document.querySelectorAll('select[data-go]'), function (sel) {
    sel.addEventListener('change', function () {
      if (sel.value) location.href = root + sel.getAttribute('data-go') + sel.value + '/' + (sel.getAttribute('data-hash') || '');
    });
  });

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
      vc.textContent = n === rows.length ? rows.length + (rows.length === 1 ? ' vote or bill' : ' votes and bills') + ' on the record.' :
        n ? n + ' of ' + rows.length + ' shown.' : 'Nothing matches both choices. Tap a chip again to clear it.';
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

  /* ---- days until the election, counted from the reader's own date ---- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-until]'), function (s) {
    var p = s.getAttribute('data-until').split('-'), now = new Date();
    var days = Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    if (days > 1) s.textContent = ' That is ' + days + ' days from today.';
    else if (days === 1) s.textContent = ' That is tomorrow.';
    else if (days === 0) s.textContent = ' That is today.';
    else if (s.getAttribute('data-after')) s.textContent = s.getAttribute('data-after');      /* the day has passed: say so, never leave a vote that was held reading as one to come */
  });

  /* The country switch was a select here until 15 October 2026. It is a row of plain links on Elections and
     Scorecard now (build/world.py, bar), so it needs no script. */

  /* The box a reader writes in, the switch between a page's record and its discussion, the player a shared
     video opens in and the Share button are in discussion.js since 5 October 2026: iranuncensored.com runs
     the same code, and one copy cannot drift from the other. */

  /* ---- copy the link ---- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) {
    b.addEventListener('click', function () {
      var url = b.getAttribute('data-copy'), old = b.textContent;
      function done(ok) { b.textContent = ok ? 'Link copied' : 'Could not copy. Copy the address from the address bar.'; setTimeout(function () { b.textContent = old; }, 2200); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      else done(false);
    });
  });

  /* ---- More, in the menu (13 October 2026). It is a native <details>, so it opens with this file missing.
     Here it only closes again: on a tap anywhere else, and on Escape. ---- */
  /* The strip of links under the bar scrolls sideways on a phone. The link of the page a reader is on is brought into
     view when it would be out of sight, so the strip always says where they are. Only the strip moves, never the page. */
  var strip = document.querySelector('.subnav-s'), here = strip && strip.querySelector('a[aria-current]');
  if (here) { var hx = here.offsetLeft - strip.offsetLeft; if (hx + here.offsetWidth > strip.clientWidth - 28) strip.scrollLeft = Math.max(0, hx - 24); }
  var mores = document.querySelectorAll('details.nav-more');
  if (mores.length) {
    var shut = function (but) { Array.prototype.forEach.call(mores, function (d) { if (d !== but && d.open) d.open = false; }); };
    document.addEventListener('click', function (ev) { shut(ev.target.closest ? ev.target.closest('details.nav-more') : null); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') shut(null); });
  }
})();
