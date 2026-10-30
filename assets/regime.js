/* The Regime Board (build/regime.py writes the page and the data; this file makes it move). Shared by libertypolitics.com
   and iranuncensored.com, English and Persian: every word comes from the page's own data (#rg-data, "w").

   What it does:
     THE TIMELINE   a slider from 1 January 2020 to today; every face falls on the day it fell, successors appear only once
                    the chair is theirs, the count follows; Replay runs it from June 2025, stopping a beat on each day of falls.
     THREE VIEWS    the board by branch (as printed), by faction (one column per camp), and day by day (every fall in order).
     FILTERS        everyone / still in place / taken out / unknown, and a name search (English or Persian).
     THE SHEET      a tap on any face: who they are, what happened, who filled the chair, their camp and why, sources.
     WHO GOES NEXT  three picks among the people still standing, locked in with the day; scored against the register when
                    the page is next opened. Kept in localStorage and in the address (?next=a,b,c&at=YYYY-MM-DD). Nothing is
                    sent anywhere: the share panel (share.js) sends only the address.
   No dialog() calls, no animation that hides content; prefers-reduced-motion jumps instead of playing. */
(function () {
  'use strict';
  var D = document, W = window;
  var root = D.getElementById('regime'), blob = D.getElementById('rg-data');
  if (!root || !blob) return;
  var X;
  try { X = JSON.parse(blob.textContent); } catch (err) { return; }
  var w = X.w, FA = X.lang === 'fa', P = X.p, BY = {};
  var RTL = (D.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl';
  P.forEach(function (p) { BY[p.id] = p; });
  var $ = function (id) { return D.getElementById(id); };
  var REDUCE = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GONE = { killed: 1, died: 1 }, STAND = { alive: 1, wounded: 1, unknown: 1 };
  var DIG = '۰۱۲۳۴۵۶۷۸۹';
  function num(n) { var s = String(n); return FA ? s.replace(/[0-9]/g, function (d) { return DIG[+d]; }) : s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, text) { var n = D.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  var store = { get: function (k) { try { return JSON.parse(W.localStorage.getItem(k)); } catch (e) { return null; } },
                set: function (k, v) { try { W.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

  /* ---------------------------------------------------------------- dates */
  var DAY = 86400000;
  function ms(iso) { var a = iso.split('-'); return Date.UTC(+a[0], (+a[1] || 7) - 1, +a[2] || 15); }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  var EN_M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var FA_M = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  function jalali(gy, gm, gd) {
    var g = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], gy2 = gm > 2 ? gy + 1 : gy;
    var days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g[gm - 1];
    var jy = -1595 + 33 * Math.floor(days / 12053); days %= 12053; jy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    var jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
    return [jy, jm, jd];
  }
  function say(isoDay) {
    var a = isoDay.split('-').map(Number);
    if (FA) { var j = jalali(a[0], a[1], a[2] || 15); return num(j[2] + ' ' + FA_M[j[1] - 1] + ' ' + j[0]); }
    return (a[2] ? a[2] + ' ' : '') + EN_M[a[1] - 1] + ' ' + a[0];
  }

  /* ---------------------------------------------------------------- tiles (the printed ones, and the ones the views draw) */
  var tiles = [].slice.call(root.querySelectorAll('.rg-t'));
  function face(p) {
    var f = el('span', 'rg-face');
    if (p.c && X.camps[p.c]) f.style.setProperty('--c', X.camps[p.c].c);
    if (p.img) { var i = el('img'); i.src = X.root + 'assets/regime/' + p.img; i.alt = ''; i.loading = 'lazy'; i.width = 200; i.height = 250; f.appendChild(i); }
    else { var s = el('span', 'rg-ini', initials(p.en)); s.setAttribute('aria-hidden', 'true'); f.appendChild(s); }
    if (GONE[p.s]) { var x = el('i', 'rg-x' + (p.s === 'died' ? ' rg-x-d' : '')); x.setAttribute('aria-hidden', 'true'); f.appendChild(x); }
    else if (p.s === 'unknown' || p.s === 'wounded') { var q = el('i', 'rg-q' + (p.s === 'wounded' ? ' rg-q-w' : ''), p.s === 'wounded' ? '+' : '?'); q.setAttribute('aria-hidden', 'true'); f.appendChild(q); }
    return f;
  }
  function initials(n) { var b = String(n || '').split(/[\s-]+/).filter(function (x) { return /^[A-Za-z]/.test(x); }); return (b.length > 1 ? b[0][0] + b[b.length - 1][0] : (b[0] || '?').slice(0, 2)).toUpperCase(); }
  function stLine(p) { var s = w['st_' + (p.s || 'alive')] || ''; return (p.dd && p.s !== 'alive' && p.s !== 'unknown') ? s + ' · ' + p.dd : s; }
  function tile(p) {
    var b = el('button', 'rg-t is-' + (p.s || 'alive')); b.type = 'button';
    b.setAttribute('data-id', p.id); b.setAttribute('data-st', p.s || 'alive'); b.setAttribute('data-d', p.d || '');
    b.setAttribute('data-camp', p.c || ''); b.setAttribute('data-camp2', p.c2 || ''); if (p.rep) b.setAttribute('data-rep', p.rep);
    b.appendChild(face(p)); b.appendChild(el('b', 'rg-n', p.n)); b.appendChild(el('span', 'rg-r', p.r || '')); b.appendChild(el('span', 'rg-s', stLine(p)));
    return b;
  }

  /* ---------------------------------------------------------------- filters and search */
  var view = 'board', filt = 'all', q = '', campOn = '';
  function matches(p) {
    if (filt === 'standing' && !(p.s === 'alive' || p.s === 'wounded')) return false;
    if (filt === 'fallen' && !GONE[p.s]) return false;
    if (filt === 'unknown' && p.s !== 'unknown') return false;
    if (q) {
      var hay = (p.en + ' ' + (p.fa || '') + ' ' + (p.r || '') + ' ' + (X.units[p.u] || '')).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }
  function applyFilter() {
    var shown = 0;
    [].forEach.call(root.querySelectorAll('.rg-board .rg-t, .rg-alt .rg-t'), function (t) {
      var p = BY[t.getAttribute('data-id')]; var ok = p && matches(p);
      t.hidden = !ok; if (ok && !t.closest('[hidden]')) shown++;
      t.classList.toggle('is-dim', !!campOn && t.getAttribute('data-camp') !== campOn && t.getAttribute('data-camp2') !== campOn);
    });
    [].forEach.call(root.querySelectorAll('.rg-b, .rg-col, .rg-dayg'), function (s) { s.hidden = !s.querySelector('.rg-t:not([hidden])'); });
    $('rg-none').hidden = shown > 0;
  }
  [].forEach.call(root.querySelectorAll('.rg-f'), function (b) {
    b.addEventListener('click', function () {
      filt = b.getAttribute('data-f');
      [].forEach.call(root.querySelectorAll('.rg-f'), function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      applyFilter();
    });
  });
  $('rg-q').addEventListener('input', function () { q = this.value.trim().toLowerCase(); applyFilter(); });

  /* ---------------------------------------------------------------- views */
  function drawCamps() {
    var alt = $('rg-alt'); alt.textContent = '';
    var g = el('div', 'rg-cols');
    Object.keys(X.camps).forEach(function (k) {
      var ppl = P.filter(function (p) { return p.c === k || p.c2 === k; });
      if (!ppl.length) return;
      ppl.sort(function (a, b) { return (STAND[a.s] ? 0 : 1) - (STAND[b.s] ? 0 : 1) || (a.d || '').localeCompare(b.d || ''); });
      var col = el('section', 'rg-col'); col.style.setProperty('--c', X.camps[k].c);
      var h = el('div', 'rg-colh'); h.appendChild(el('h3', null, X.camps[k].n));
      var down = ppl.filter(function (p) { return GONE[p.s]; }).length;
      h.appendChild(el('span', 'rg-bc num', num(down) + ' / ' + num(ppl.length)));
      col.appendChild(h); col.appendChild(el('p', 'rg-colw', X.camps[k].w));
      var gr = el('div', 'rg-g'); ppl.forEach(function (p) { gr.appendChild(tile(p)); }); col.appendChild(gr);
      g.appendChild(col);
    });
    alt.appendChild(g);
  }
  function drawDays() {
    var alt = $('rg-alt'); alt.textContent = '';
    var fallen = P.filter(function (p) { return GONE[p.s] && p.d; }).sort(function (a, b) { return b.d.localeCompare(a.d); });
    var groups = {}, order = [];
    fallen.forEach(function (p) { if (!groups[p.d]) { groups[p.d] = []; order.push(p.d); } groups[p.d].push(p); });
    var list = el('div', 'rg-days');
    order.forEach(function (d) {
      var sec = el('section', 'rg-dayg'), h = el('div', 'rg-dayh');
      h.appendChild(el('b', 'num', say(d)));
      var op = opOn(d); if (op) h.appendChild(el('span', 'rg-op', op.n));
      h.appendChild(el('span', 'rg-bc num', num(groups[d].length) + ' ' + w.people));
      sec.appendChild(h);
      var gr = el('div', 'rg-g'); groups[d].forEach(function (p) { gr.appendChild(tile(p)); }); sec.appendChild(gr);
      list.appendChild(sec);
    });
    alt.appendChild(list);
  }
  function opOn(d) {
    for (var i = 0; i < X.ops.length; i++) {
      var o = X.ops[i]; if (!o.start) continue;
      if (d >= o.start && d <= (o.end || o.start)) return { n: (FA && o.name_fa) || o.name };
    }
    return null;
  }
  function setView(v) {
    view = v;
    [].forEach.call(root.querySelectorAll('.rg-v'), function (b) { var on = b.getAttribute('data-v') === v; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    $('rg-board').hidden = v !== 'board';
    $('rg-alt').hidden = v === 'board';
    $('rg-campkey').hidden = v === 'days';
    if (v === 'camps') drawCamps(); else if (v === 'days') drawDays();
    applyTime(cur, true); applyFilter(); markPicks();
    try { var u = new URL(W.location.href); if (v === 'board') u.searchParams.delete('view'); else u.searchParams.set('view', v); W.history.replaceState(null, '', u); } catch (e) { }
  }
  [].forEach.call(root.querySelectorAll('.rg-v'), function (b) { b.addEventListener('click', function () { setView(b.getAttribute('data-v')); }); });

  /* the camp key: one chip per camp, a tap lights its people on whichever view is open */
  (function () {
    var key = $('rg-campkey');
    Object.keys(X.camps).forEach(function (k) {
      if (!P.some(function (p) { return p.c === k || p.c2 === k; })) return;
      var b = el('button', 'rg-ck'); b.type = 'button'; b.setAttribute('data-c', k); b.style.setProperty('--c', X.camps[k].c);
      b.appendChild(el('i')); b.appendChild(el('span', null, X.camps[k].n)); b.title = X.camps[k].w;
      b.addEventListener('click', function () {
        campOn = campOn === k ? '' : k;
        [].forEach.call(key.querySelectorAll('.rg-ck'), function (x) { x.classList.toggle('is-on', x.getAttribute('data-c') === campOn); x.setAttribute('aria-pressed', x.getAttribute('data-c') === campOn ? 'true' : 'false'); });
        applyFilter();
      });
      key.appendChild(b);
    });
    key.hidden = false;
  })();

  /* ---------------------------------------------------------------- the timeline */
  var T0 = ms('2020-01-01'), T1 = ms(X.today), SPAN = Math.round((T1 - T0) / DAY);
  var range = $('rg-range'); range.max = SPAN; range.value = SPAN;
  var cur = X.today;
  var dates = {};
  P.forEach(function (p) { if (GONE[p.s] && p.d && p.d.length === 10) (dates[p.d] = dates[p.d] || []).push(p); });
  var dayList = Object.keys(dates).sort();
  (function ticks() {
    var t = $('rg-ticks');
    dayList.forEach(function (d) {
      if (d < '2020-01-01') return;      // a fall before the timeline starts: the face is simply down from the first day
      var i = el('i', dates[d].some(function (p) { return p.s === 'killed'; }) ? 'rg-tick' : 'rg-tick is-d');
      var pos = (ms(d) - T0) / (T1 - T0) * 100;
      i.style[RTL ? 'right' : 'left'] = pos + '%';
      i.style.height = Math.min(26, 8 + dates[d].length * 3) + 'px';
      t.appendChild(i);
    });
    X.ops.forEach(function (o) {
      if (!o.start) return;
      var a = (ms(o.start) - T0) / (T1 - T0) * 100, b = (ms(o.end || o.start) - T0) / (T1 - T0) * 100;
      var s = el('i', 'rg-opband'); s.style[RTL ? 'right' : 'left'] = a + '%'; s.style.width = Math.max(.6, b - a) + '%'; s.title = (FA && o.name_fa) || o.name; t.appendChild(s);
    });
  })();
  function applyTime(d, quiet) {
    cur = d;
    var atEnd = d >= X.today, k = 0, a = 0, u = 0;
    [].forEach.call(root.querySelectorAll('.rg-t, .rg-cl'), function (t) {
      var p = BY[t.getAttribute('data-id')]; if (!p) return;
      var down = GONE[p.s] && p.d && p.d <= d;
      var pre = false;
      if (!atEnd && p.rp && BY[p.rp]) { var r = BY[p.rp]; pre = !(GONE[r.s] && r.d && r.d <= d) && GONE[r.s]; }
      t.classList.toggle('is-down', !!down);
      t.classList.toggle('is-up', !atEnd && !down && !pre);
      t.classList.toggle('is-pre', pre);
      if (atEnd) { t.classList.remove('is-up'); }
    });
    P.forEach(function (p) {
      var down = GONE[p.s] && p.d && p.d <= d;
      if (down && p.s === 'killed') k++;
      else if (!down && !atEnd) { var pre = p.rp && BY[p.rp] && GONE[BY[p.rp].s] && !(BY[p.rp].d && BY[p.rp].d <= d); if (!pre) a++; }
    });
    if (atEnd) { P.forEach(function (p) { if (p.s === 'alive' || p.s === 'wounded') a++; else if (p.s === 'unknown') u++; }); }
    $('rg-ck').textContent = num(k); $('rg-ca').textContent = num(a); $('rg-cu').textContent = num(atEnd ? u : 0);
    $('rg-date').textContent = atEnd ? w.today + ' · ' + say(d) : say(d);
    var since = P.filter(function (p) { return p.s === 'killed' && p.d && p.d <= d; }).length;
    $('rg-dn').textContent = num(since) + ' ' + w.n_killed + ' ' + w.by_date;
    root.classList.toggle('is-past', !atEnd);
    if (!quiet) event(d);
  }
  function event(d) {
    var last = null;
    for (var i = dayList.length - 1; i >= 0; i--) { if (dayList[i] <= d) { last = dayList[i]; break; } }
    var ev = $('rg-ev'); ev.textContent = '';
    if (!last) return;
    var ppl = dates[last].filter(function (p) { return p.s === 'killed'; });
    if (!ppl.length) ppl = dates[last];
    var b = el('b', 'num', say(last) + ': '); ev.appendChild(b);
    var names = ppl.slice(0, 3).map(function (p) { return p.n; }).join(FA ? '، ' : ', ');
    ev.appendChild(D.createTextNode(names + (ppl.length > 3 ? (FA ? ' و ' + num(ppl.length - 3) + ' نفر دیگه' : ' and ' + (ppl.length - 3) + ' more') : '')));
    var op = opOn(last); if (op) ev.appendChild(el('span', 'rg-op', op.n));
  }
  range.addEventListener('input', function () { stop(); applyTime(iso(T0 + range.value * DAY)); });
  var timer = null;
  function stop() { if (timer) { clearTimeout(timer); timer = null; } $('rg-play-t').textContent = w.replay; $('rg-play').classList.remove('is-on'); }
  $('rg-play').addEventListener('click', function () {
    if (timer) { stop(); return; }
    if (REDUCE) { range.value = SPAN; applyTime(X.today); return; }
    var startDay = Math.round((ms('2025-06-01') - T0) / DAY), v = +range.value >= SPAN - 1 ? startDay : +range.value;
    $('rg-play-t').textContent = w.pause; $('rg-play').classList.add('is-on');
    (function step() {
      if (v > SPAN) { stop(); range.value = SPAN; applyTime(X.today); return; }
      range.value = v; var d = iso(T0 + v * DAY); applyTime(d);
      var hit = dates[d] && dates[d].length;
      v += 2;
      timer = setTimeout(step, hit ? 900 : 22);
    })();
  });

  /* ---------------------------------------------------------------- the sheet */
  var sheet = $('rg-sheet'), inner = $('rg-sh-in'), opener = null;
  function link(u) { var a = el('a', null, u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]); a.href = u; a.target = '_blank'; a.rel = 'noopener'; return a; }
  function open(id, from) {
    var p = BY[id]; if (!p) return;
    opener = from || D.activeElement;
    inner.textContent = '';
    var top = el('div', 'rg-sh-top');
    var x = el('button', 'rg-sh-x'); x.type = 'button'; x.setAttribute('aria-label', w.close); x.textContent = '×'; x.addEventListener('click', close);
    top.appendChild(face(p));
    var t = el('div', 'rg-sh-t');
    var h = el('h2', null, p.n); h.id = 'rg-sh-n'; t.appendChild(h);
    if (FA && p.en) t.appendChild(el('p', 'rg-sh-alt', p.en)); else if (!FA && p.fa) { var f = el('p', 'rg-sh-alt', p.fa); f.lang = 'fa'; f.dir = 'rtl'; t.appendChild(f); }
    t.appendChild(el('p', 'rg-sh-r', p.r || ''));
    var st = el('p', 'rg-pill is-' + (p.s || 'alive'), stLine(p)); t.appendChild(st);
    top.appendChild(t); top.appendChild(x); inner.appendChild(top);
    if (p.sn) inner.appendChild(el('p', 'rg-sh-sn', p.sn));
    var facts = el('dl', 'rg-sh-f');
    function fact(k, v) { if (!v) return; facts.appendChild(el('dt', null, k)); facts.appendChild(el('dd', null, v)); }
    if (GONE[p.s] || p.s === 'wounded') { fact(w.by, p.by); fact(w.op, p.op); fact(w.where, p.pl); }
    fact(w.sanct, p.sa);
    if (facts.childNodes.length) inner.appendChild(facts);
    // the chair: who sat before, who sat after
    var before = p.rep && BY[p.rep], after = P.filter(function (o) { return o.rep === p.id; });
    if (before || after.length) {
      var ch = el('div', 'rg-sh-ch');
      if (before) ch.appendChild(chip(w.replaces, before));
      after.forEach(function (o) { ch.appendChild(chip(w.replaced, o)); });
      inner.appendChild(ch);
    }
    if (p.c && X.camps[p.c]) {
      var cb = el('div', 'rg-sh-c'); cb.style.setProperty('--c', X.camps[p.c].c);
      var ct = el('p', 'rg-sh-ct'); ct.appendChild(el('span', 'rg-sh-k', w.camp)); ct.appendChild(el('b', null, X.camps[p.c].n + (p.c2 && X.camps[p.c2] ? ' · ' + X.camps[p.c2].n : '')));
      if (p.cs && X.sure[p.cs]) ct.appendChild(el('span', 'rg-sure', X.sure[p.cs]));
      cb.appendChild(ct);
      if (p.cw) cb.appendChild(el('p', null, p.cw));
      cb.appendChild(el('p', 'rg-dim', X.camps[p.c].w));
      inner.appendChild(cb);
    }
    if (p.b) { inner.appendChild(el('h3', null, w.bio)); inner.appendChild(el('p', null, p.b)); }
    if (p.past && p.past.length) { inner.appendChild(el('h3', null, w.past)); var ul = el('ul', 'rg-sh-past'); p.past.forEach(function (x) { ul.appendChild(el('li', null, x)); }); inner.appendChild(ul); }
    if (STAND[p.s] && p.s !== 'unknown' || p.s === 'unknown') {
      var pk = el('button', 'btn ' + (picks.indexOf(p.id) >= 0 ? 'btn-line' : 'btn-key') + ' rg-sh-pick'); pk.type = 'button';
      pk.textContent = picks.indexOf(p.id) >= 0 ? w.unpick : '◎ ' + w.pick;
      pk.addEventListener('click', function () { togglePick(p.id); close(); var n = $('rg-next'); if (n && picks.length) n.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' }); });
      if (!locked || picks.indexOf(p.id) < 0) inner.appendChild(pk);
    }
    if (p.src && p.src.length) { var s = el('p', 'rg-sh-src'); s.appendChild(el('span', 'rg-sh-k', w.sources)); p.src.slice(0, 8).forEach(function (u) { s.appendChild(link(u)); }); inner.appendChild(s); }
    if (p.cr) inner.appendChild(el('p', 'rg-sh-cr', '📷 ' + p.cr));
    sheet.hidden = false; D.documentElement.classList.add('rg-lock');
    try { x.focus({ preventScroll: true }); } catch (e) { x.focus(); }
    try { var u = new URL(W.location.href); u.searchParams.set('p', id); W.history.replaceState(null, '', u); } catch (e) { }
  }
  function chip(label, o) {
    var b = el('button', 'rg-sh-cp is-' + o.s); b.type = 'button';
    b.appendChild(face(o)); var s = el('span'); s.appendChild(el('small', null, label)); s.appendChild(el('b', null, o.n)); s.appendChild(el('small', null, stLine(o))); b.appendChild(s);
    b.addEventListener('click', function () { open(o.id, opener); });
    return b;
  }
  function close() {
    sheet.hidden = true; D.documentElement.classList.remove('rg-lock');
    try { var u = new URL(W.location.href); u.searchParams.delete('p'); W.history.replaceState(null, '', u); } catch (e) { }
    if (opener && opener.focus) try { opener.focus({ preventScroll: true }); } catch (e) { }
  }
  sheet.addEventListener('click', function (ev) { if (ev.target === sheet) close(); });
  D.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !sheet.hidden) close(); });
  root.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('.rg-t, .rg-cl, .rg-slot[data-id], .rg-tp[data-id]');
    if (!t || !root.contains(t) || sheet.contains(t)) return;
    open(t.getAttribute('data-id'), t);
  });

  /* ---------------------------------------------------------------- who goes next */
  var MAX = 3, KEY = 'rg-next-' + X.lang;
  var saved = store.get(KEY) || {};
  var picks = (saved.picks || []).filter(function (i) { return BY[i]; }).slice(0, MAX), locked = saved.at || null;
  function save() { store.set(KEY, { picks: picks, at: locked }); }
  function togglePick(id) {
    var i = picks.indexOf(id);
    if (locked) { locked = null; }
    if (i >= 0) picks.splice(i, 1);
    else { if (picks.length >= MAX) picks.shift(); picks.push(id); }
    save(); drawPicks();
  }
  function hits(list, at) { return list.filter(function (i) { var p = BY[i]; return p && p.s === 'killed' && p.d && at && p.d >= at; }); }
  function shareUrl() {
    var u; try { u = new URL(root.getAttribute('data-canon') || W.location.href); } catch (e) { return ''; }
    u.hash = ''; u.search = ''; if (picks.length) u.searchParams.set('next', picks.join(',')); if (locked) u.searchParams.set('at', locked);
    return u.toString() + '#rg-next';
  }
  function slot(p, i, lockedDay) {
    var s = el('button', 'rg-slot' + (p ? ' is-full is-' + p.s : '')); s.type = 'button';
    if (!p) { s.appendChild(el('span', 'rg-slot-n', num(i + 1))); s.appendChild(el('span', 'rg-slot-e', w.slot)); s.addEventListener('click', function () { $('rg-board').scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth' }); }); return s; }
    s.setAttribute('data-id', p.id);
    s.appendChild(face(p)); var t = el('span', 'rg-slot-t'); t.appendChild(el('b', null, p.n)); t.appendChild(el('small', null, p.r || ''));
    var hit = lockedDay && p.s === 'killed' && p.d >= lockedDay;
    t.appendChild(el('small', 'rg-slot-s' + (hit ? ' is-hit' : ''), hit ? '✓ ' + w.score + ' · ' + p.dd : stLine(p)));
    s.appendChild(t);
    return s;
  }
  function drawPicks() {
    var box = $('rg-slots'); box.textContent = '';
    for (var i = 0; i < MAX; i++) box.appendChild(slot(BY[picks[i]], i, locked));
    $('rg-lock').disabled = !picks.length || !!locked;
    $('rg-lock').textContent = locked ? w.locked + ' ' + say(locked) : w.lock;
    $('rg-share').setAttribute('data-url', shareUrl());
    $('rg-share').hidden = !picks.length;
    $('rg-clear').hidden = !picks.length;
    var sc = $('rg-score'), h = hits(picks, locked);
    sc.hidden = !locked; sc.textContent = locked ? '🎯 ' + w.score + ': ' + num(h.length) + ' / ' + num(picks.length) + ' · ' + num(h.length * 100) + ' ' + w.pts : '';
    markPicks(); tray();
  }
  function markPicks() {
    [].forEach.call(root.querySelectorAll('.rg-t'), function (t) { t.classList.toggle('is-picked', picks.indexOf(t.getAttribute('data-id')) >= 0); });
  }
  $('rg-lock').addEventListener('click', function () { if (!picks.length) return; locked = X.today; save(); drawPicks(); });
  $('rg-clear').addEventListener('click', function () { picks = []; locked = null; save(); drawPicks(); });
  function tray() {
    var tr = $('rg-tray'); tr.textContent = '';
    if (!picks.length) { tr.hidden = true; return; }
    var a = el('a', 'rg-tray-in'); a.href = '#rg-next';
    picks.forEach(function (i) { var f = face(BY[i]); f.classList.add('rg-tp'); a.appendChild(f); });
    a.appendChild(el('span', null, w.next_h + ' ' + num(picks.length) + '/' + num(MAX)));
    tr.appendChild(a); tr.hidden = false;
  }
  if ('IntersectionObserver' in W) {      // the tray hides while the game itself is on screen
    new IntersectionObserver(function (es) { es.forEach(function (x) { root.classList.toggle('rg-next-on', x.isIntersecting); }); }).observe($('rg-next'));
  }
  /* a friend's picks arrive in the address */
  (function theirs() {
    var u; try { u = new URL(W.location.href); } catch (e) { return; }
    var list = (u.searchParams.get('next') || '').split(',').filter(function (i) { return BY[i]; }).slice(0, MAX);
    if (!list.length) return;
    var at = /^\d{4}-\d\d-\d\d$/.test(u.searchParams.get('at') || '') ? u.searchParams.get('at') : null;
    var same = list.join(',') === picks.join(',');
    if (same) return;
    var box = $('rg-their'); box.appendChild(el('h3', null, w.their + (at ? ' · ' + w.locked + ' ' + say(at) : '')));
    var row = el('div', 'rg-slots'); list.forEach(function (i, k) { row.appendChild(slot(BY[i], k, at)); }); box.appendChild(row);
    if (at) { var h = hits(list, at); box.appendChild(el('p', 'rg-score', '🎯 ' + w.score + ': ' + num(h.length) + ' / ' + num(list.length))); }
    var mine = el('p', 'rg-dim', w.mine_too); box.appendChild(mine);
    box.hidden = false;
  })();

  /* ---------------------------------------------------------------- start */
  $('rg-time').hidden = false; $('rg-bar').hidden = false; $('rg-next').hidden = false;
  drawPicks();
  applyTime(X.today, true); event(X.today);
  (function fromAddress() {
    var u; try { u = new URL(W.location.href); } catch (e) { return; }
    var v = u.searchParams.get('view'); if (v === 'camps' || v === 'days') setView(v);
    var p = u.searchParams.get('p'); if (p && BY[p]) open(p);
  })();
})();
