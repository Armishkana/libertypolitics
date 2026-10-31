/* The Regime Board (build/regime.py writes the page and the data; this file makes it move). Shared by libertypolitics.com
   and iranuncensored.com, English and Persian: every word comes from the page's own data (#rg-data, "w").

   What it does:
     THE WHOLE CHART  the first view (30 Oct 2026). The Supreme Leader on top, every branch a column under him, like the
                    original image (@HekasrehCrisis), drawn at its real size and scaled with one CSS transform inside a
                    window (#rg-vp): pinch and one-finger drag on a phone, wheel or trackpad toward the pointer and drag on
                    a computer, double-tap or double-click to zoom in on a spot, + / - / Fit, and Full screen for the live
                    show (the Fullscreen API, else a window-filling fallback). Armin: "there needs to be a way for us to be
                    able to look at the whole thing, the entire regime, and zoom in on some parts ... especially on mobile."
                    A tap on a face opens it; a face too small to hit surely is zoomed to first; a move of more than 6px is a
                    drag, never a tap. The layout (how many faces wide each branch is) is chosen for the window's shape so
                    the whole chart fits as large as it can. ?z=<zoom over fit>,<x>,<y> keeps where you were.
     THE TIMELINE   a slider from the first day to today; every face falls on the day it fell, successors appear only once
                    the chair is theirs, the count follows; Replay runs it from June 2025, stopping a beat on each day of falls.
     FOUR VIEWS     the whole chart, the board by branch (as printed), by faction (one column per camp), day by day.
     FILTERS        everyone / still in place / taken out / unknown, and a name search (English or Persian). On the chart a
                    face that does not match goes faint, and the search flies to what it found.
     THE SHEET      a tap on any face: who they are, what happened, who filled the chair, their camp and why, sources.
     A PICTURE      registered with build/shareimg.js (window.LPShotQ, id 'regime'): every face in chart order, the fallen grey
                    with a red line, at the day and filter the reader is looking at. The button shows only once LPShot exists.
   The "who goes next" game was taken out on 30 Oct 2026 (Armin: "It's not adding anything ... take that out"); an old link
   carrying ?next= or ?at= simply opens the board.
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
  // every class switch goes through here: the state is forced to true or false, and a class is written only when it changes.
  // classList.toggle(c, undefined) FLIPS the class, which made 24 faces blink on every step of the timeline (31 Oct 2026).
  function tog(n, c, on) { on = !!on; if (n.classList.contains(c) !== on) { if (on) n.classList.add(c); else n.classList.remove(c); } return on; }
  function el(tag, cls, text) { var n = D.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

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
  function sayShort(isoDay) {      // under a face on the chart: 28 Feb 2026, or ۹ اسفند ۱۴۰۴
    var a = isoDay.split('-').map(Number);
    if (FA || !a[1]) return say(isoDay);
    return (a[2] ? a[2] + ' ' : '') + EN_M[a[1] - 1].slice(0, 3) + ' ' + a[0];
  }

  /* ---------------------------------------------------------------- tiles (the printed ones, and the ones the views draw) */
  function face(p) {
    var f = el('span', 'rg-face');
    if (p.c && X.camps[p.c]) f.style.setProperty('--c', X.camps[p.c].c);
    if (p.img) { var i = el('img'); i.src = X.root + 'assets/regime/' + p.img; i.alt = ''; i.loading = 'lazy'; i.decoding = 'async'; i.width = 200; i.height = 250; i.draggable = false; f.appendChild(i); }
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

  /* ---------------------------------------------------------------- the whole chart: built from the printed board's order */
  var zw = $('rg-zw'), vp = $('rg-vp'), chart = $('rg-chart');
  var COLS = [], TOP = [], ORDER = [];
  function cell(p, big) {
    var c = el('div', 'rg-cp is-' + (p.s || 'alive') + (big ? ' is-top' : ''));
    c.setAttribute('data-id', p.id); c.setAttribute('data-camp', p.c || ''); c.setAttribute('data-camp2', p.c2 || '');
    c.appendChild(face(p)); c.appendChild(el('b', null, p.n));
    c.appendChild(el('span', 'rg-cps', GONE[p.s] && p.d ? sayShort(p.d) : p.s === 'unknown' ? (w.st_unknown || '') : (p.r || '')));
    c.title = p.n + (p.r ? ' · ' + p.r : '');
    return c;
  }
  (function buildChart() {
    if (!chart) return;
    [].forEach.call(root.querySelectorAll('#rg-board .rg-b'), function (b) {
      var ids = [].map.call(b.querySelectorAll('.rg-t'), function (t) { return t.getAttribute('data-id'); }).filter(function (i) { return BY[i]; });
      var h = b.querySelector('h3');
      COLS.push({ k: b.getAttribute('data-b'), n: h ? h.textContent : '', ids: ids });
    });
    // the top of the chart: the first chair of the Leader's board and everyone who took that chair after
    if (COLS.length && COLS[0].k === 'leader' && COLS[0].ids.length) {
      var t = COLS[0].ids[0]; TOP.push(t);
      for (var guard = 0; guard < 6; guard++) {
        var nx = P.filter(function (p) { return p.rp === t && TOP.indexOf(p.id) < 0; })[0];
        if (!nx) break;
        TOP.push(nx.id); t = nx.id;
      }
      COLS[0].ids = COLS[0].ids.filter(function (i) { return TOP.indexOf(i) < 0; });
    }
    COLS = COLS.filter(function (c) { return c.ids.length; });
    var head = el('div', 'rg-c-head');
    var h1 = root.querySelector('.rg-head h1');
    head.appendChild(el('p', 'rg-c-h1', h1 ? h1.textContent : ''));
    var sub = el('p', 'rg-c-sub'); sub.id = 'rg-ctl'; head.appendChild(sub);
    chart.appendChild(head);
    if (TOP.length) {
      var tb = el('div', 'rg-c-top'); tb.appendChild(el('p', 'rg-c-topl', w.z_top));
      var chn = el('div', 'rg-c-chain');
      TOP.forEach(function (id, i) {
        if (i) { var a = el('i', 'rg-arrow'); a.setAttribute('aria-hidden', 'true'); chn.appendChild(a); }
        chn.appendChild(cell(BY[id], true));
      });
      tb.appendChild(chn); chart.appendChild(tb);
      ORDER = TOP.slice();
    }
    var row = el('div', 'rg-c-cols');
    COLS.forEach(function (col) {
      var groups = [], at = {};
      col.ids.forEach(function (id) { var u = BY[id].u || ''; if (!(u in at)) { at[u] = groups.length; groups.push({ u: u, ids: [] }); } groups[at[u]].ids.push(id); });
      col.groups = groups;
      var sec = el('section', 'rg-cc'); sec.setAttribute('data-b', col.k);
      var h = el('div', 'rg-cch'), k = col.ids.filter(function (i) { return BY[i].s === 'killed'; }).length;
      h.appendChild(el('h3', null, col.n));
      var c = el('span', 'rg-cchc num'); c.appendChild(el('b', null, num(k))); c.appendChild(D.createTextNode(' / ' + num(col.ids.length))); h.appendChild(c);
      var bp = el('span', 'rg-bp'); bp.setAttribute('aria-hidden', 'true'); bp.style.setProperty('--p', Math.round(100 * k / col.ids.length) + '%'); h.appendChild(bp);
      sec.appendChild(h);
      groups.forEach(function (g) {
        var gw = el('div', 'rg-cg');
        if (groups.length > 1) gw.appendChild(el('p', 'rg-cgl', X.units[g.u] || ''));
        var gg = el('div', 'rg-cgg'); g.ids.forEach(function (id) { gg.appendChild(cell(BY[id])); ORDER.push(id); }); gw.appendChild(gg);
        sec.appendChild(gw);
      });
      col.el = sec; row.appendChild(sec);
    });
    chart.appendChild(row);
  })();

  /* ---------------------------------------------------------------- filters and search */
  var view = 'chart', filt = 'all', q = '', campOn = '';
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
  function inCamp(n) { return !campOn || n.getAttribute('data-camp') === campOn || n.getAttribute('data-camp2') === campOn; }
  var hint = zw && zw.querySelector('.rg-zhint'), hintText = hint ? hint.textContent : '';
  function applyFilter() {
    var shown = 0;
    [].forEach.call(root.querySelectorAll('.rg-board .rg-t, .rg-alt .rg-t'), function (t) {
      var p = BY[t.getAttribute('data-id')]; var ok = p && matches(p);
      t.hidden = !ok; if (ok && !t.closest('[hidden]')) shown++;
      tog(t, 'is-dim', !inCamp(t));
    });
    [].forEach.call(root.querySelectorAll('.rg-b, .rg-col, .rg-dayg'), function (s) { s.hidden = !s.querySelector('.rg-t:not([hidden])'); });
    var hits = 0;
    [].forEach.call(chart ? chart.querySelectorAll('.rg-cp') : [], function (c) {      // the chart keeps its shape: a face that does not match goes faint
      var p = BY[c.getAttribute('data-id')], ok = p && matches(p) && inCamp(c);
      tog(c, 'is-dim', !ok); tog(c, 'is-hit', !!q && ok);
      if (ok) hits++;
    });
    if (view === 'chart') shown = hits;
    $('rg-none').hidden = shown > 0;
    if (hint) { hint.textContent = q ? w.found.replace('{n}', num(hits)) : hintText; tog(hint, 'is-q', !!q); }
    tog(root, 'rg-filtering', filt !== 'all' || !!q || !!campOn);
  }
  [].forEach.call(root.querySelectorAll('.rg-f'), function (b) {
    b.addEventListener('click', function () {
      filt = b.getAttribute('data-f');
      [].forEach.call(root.querySelectorAll('.rg-f'), function (x) { tog(x, 'is-on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      applyFilter();
    });
  });
  var flyT = null;
  $('rg-q').addEventListener('input', function () {
    q = this.value.trim().toLowerCase(); applyFilter();
    clearTimeout(flyT); if (q && view === 'chart') flyT = setTimeout(flyToHits, 350);
  });

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
  var foldLay = function () { };
  function setView(v) {
    view = v;
    [].forEach.call(root.querySelectorAll('.rg-v'), function (b) { var on = b.getAttribute('data-v') === v; tog(b, 'is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    $('rg-board').hidden = v !== 'board';
    $('rg-alt').hidden = v !== 'camps' && v !== 'days';
    if (zw) zw.hidden = v !== 'chart';
    tog(root, 'rg-on-chart', v === 'chart');      // the chart is a window of its own: the filter bar stops following the page over it
    $('rg-campkey').hidden = v === 'days';
    if (v === 'camps') drawCamps(); else if (v === 'days') drawDays();
    applyTime(cur, true); applyFilter();
    if (v === 'board') foldLay();
    if (v === 'chart') { if (!Z.ready) { plan(); fit(false); } else clampPaint(); }
    try { var u = new URL(W.location.href); if (v === 'chart') u.searchParams.delete('view'); else u.searchParams.set('view', v); W.history.replaceState(null, '', u); } catch (e) { }
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
        [].forEach.call(key.querySelectorAll('.rg-ck'), function (x) { tog(x, 'is-on', x.getAttribute('data-c') === campOn); x.setAttribute('aria-pressed', x.getAttribute('data-c') === campOn ? 'true' : 'false'); });
        applyFilter();
      });
      key.appendChild(b);
    });
    key.hidden = false;
  })();

  /* ---------------------------------------------------------------- pan and zoom (the whole chart) */
  // Z: s = scale, x/y = where the chart's top-left corner sits in the window, cw/ch = the chart's real size.
  var Z = { s: 1, x: 0, y: 0, cw: 1, ch: 1, fit: 1, min: .1, max: 3, atFit: true, ready: false };
  var CELL_W = 112, CELL_H = 134, GAP = 6, PAD = 16, COLGAP = 24, STACK = 30, GLAB = 34, TOPH = 330, CPAD = 44;
  function rowsOf(col, c) { var r = 0; col.groups.forEach(function (g) { r += Math.ceil(g.ids.length / c); }); return r; }
  function boxH(col, c) { return (c === 1 ? 150 : 96) + rowsOf(col, c) * (CELL_H + GAP) + (col.groups.length > 1 ? col.groups.length * GLAB : 0); }
  function boxW(c) { return c * CELL_W + (c - 1) * GAP + PAD * 2 + 4; }
  function plan() {      // how many faces wide each branch is, and which short branches stack under the one before: the layout that lets the whole chart sit largest in this window
    if (!vp || !COLS.length) return;
    var vw = vp.clientWidth || 360, vh = vp.clientHeight || 400, best = null;
    for (var R = 2; R <= 70; R++) {
      var cs = [], hs = [], Hmax = 0;
      COLS.forEach(function (col) { var c = 1; while (c < 12 && rowsOf(col, c) > R) c++; cs.push(c); hs.push(boxH(col, c)); Hmax = Math.max(Hmax, boxH(col, c)); });
      var slots = [], s = null;
      COLS.forEach(function (col, i) {      // in the chart's own order: a branch sits under the one before it when both fit the tallest column
        if (s && s.h + STACK + hs[i] <= Hmax) { s.items.push(i); s.h += STACK + hs[i]; s.w = Math.max(s.w, boxW(cs[i])); }
        else { s = { items: [i], h: hs[i], w: boxW(cs[i]) }; slots.push(s); }
      });
      var Wd = CPAD * 2 + (slots.length - 1) * COLGAP;
      slots.forEach(function (x) { Wd += x.w; });
      var sc = Math.min(vw / Wd, vh / (Hmax + TOPH + CPAD * 2));
      if (!best || sc > best.sc + 1e-6) best = { sc: sc, cs: cs, slots: slots };
    }
    var row = chart.querySelector('.rg-c-cols'); row.textContent = '';
    best.slots.forEach(function (x) {
      var sl = el('div', 'rg-cs');
      x.items.forEach(function (i) { COLS[i].el.style.setProperty('--n', best.cs[i]); sl.appendChild(COLS[i].el); });
      row.appendChild(sl);
    });
    measure();
  }
  function measure() { Z.cw = chart.offsetWidth || 1; Z.ch = chart.offsetHeight || 1; }
  function bounds() {
    var vw = vp.clientWidth, vh = vp.clientHeight;
    Z.fit = Math.min(vw / Z.cw, vh / Z.ch) * .97;
    Z.min = Z.fit * .9;
    Z.max = Math.max(Z.fit * 1.5, 3);      // a face is drawn 64px at scale 1 from a 200px picture: 3 is as sharp as it gets
  }
  var raf = 0;
  function paint() { raf = 0; chart.style.transform = 'translate(' + Z.x.toFixed(2) + 'px,' + Z.y.toFixed(2) + 'px) scale(' + Z.s.toFixed(5) + ')'; }
  function later() { if (!raf) raf = (W.requestAnimationFrame || setTimeout)(paint); }
  function clamp() {      // the chart can be moved, never lost: what is smaller than the window stays inside it, what is larger keeps an edge in view
    var vw = vp.clientWidth, vh = vp.clientHeight, M = 48;
    Z.s = Math.max(Z.min, Math.min(Z.max, Z.s));
    var sw = Z.cw * Z.s, sh = Z.ch * Z.s;
    Z.x = sw <= vw ? Math.max(0, Math.min(vw - sw, Z.x)) : Math.max(vw - sw - M, Math.min(M, Z.x));
    Z.y = sh <= vh ? Math.max(0, Math.min(vh - sh, Z.y)) : Math.max(vh - sh - M, Math.min(M, Z.y));
  }
  function clampPaint() { bounds(); clamp(); paint(); }
  function fitPose() { var vw = vp.clientWidth, vh = vp.clientHeight; return { s: Z.fit, x: (vw - Z.cw * Z.fit) / 2, y: (vh - Z.ch * Z.fit) / 2 }; }
  function fit(anim) { bounds(); var f = fitPose(); Z.atFit = true; Z.ready = true; go(f.s, f.x, f.y, anim, true); }
  var moveT = null;
  function moving(on) {      // the chart is a layer only while it moves, so the faces are drawn sharp again once it stops
    clearTimeout(moveT);
    if (on) { chart.style.willChange = 'transform'; tog(vp, 'is-moving', true); }
    else moveT = setTimeout(function () { chart.style.willChange = ''; tog(vp, 'is-moving', false); }, 180);
  }
  var anim = null, animEnd = null;
  function stopAnim() { if (anim) { (W.cancelAnimationFrame || clearTimeout)(anim); anim = null; } clearTimeout(animEnd); }
  function go(s, x, y, animate, keepFit) {
    stopAnim();
    var s0 = Z.s, x0 = Z.x, y0 = Z.y;
    function done() { stopAnim(); Z.s = s; Z.x = x; Z.y = y; if (!keepFit) Z.atFit = false; clamp(); paint(); moving(false); saveZ(); }
    if (!animate || REDUCE) { done(); return; }
    var now = function () { return W.performance && performance.now ? performance.now() : Date.now(); };
    var t0 = now(), T = 300; moving(true);
    animEnd = setTimeout(done, T + 120);      // a page the browser stops drawing (a tab in the background) still arrives where it was going
    (function frame() {
      var k = Math.min(1, (now() - t0) / T), e = 1 - Math.pow(1 - k, 3);
      if (k >= 1) { done(); return; }
      Z.s = s0 * Math.pow(s / s0, e); Z.x = x0 + (x - x0) * e; Z.y = y0 + (y - y0) * e;
      paint();
      anim = (W.requestAnimationFrame || setTimeout)(frame);
    })();
  }
  function zoomBy(f, px, py, animate) {      // f times larger, the point (px, py) of the window staying where it is
    bounds();
    var s = Math.max(Z.min, Math.min(Z.max, Z.s * f)), k = s / Z.s;
    go(s, px - (px - Z.x) * k, py - (py - Z.y) * k, animate);
  }
  function local(ev) { var r = vp.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
  function centre() { return { x: vp.clientWidth / 2, y: vp.clientHeight / 2 }; }
  function flyTo(nodes) {      // zoom so the faces found sit in the middle, large enough to read
    if (!nodes.length) return;
    var r = vp.getBoundingClientRect(), a = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 };
    nodes.forEach(function (n) {
      var b = n.getBoundingClientRect();
      a.l = Math.min(a.l, (b.left - r.left - Z.x) / Z.s); a.t = Math.min(a.t, (b.top - r.top - Z.y) / Z.s);
      a.r = Math.max(a.r, (b.right - r.left - Z.x) / Z.s); a.b = Math.max(a.b, (b.bottom - r.top - Z.y) / Z.s);
    });
    bounds();
    var vw = vp.clientWidth, vh = vp.clientHeight, bw = a.r - a.l + 160, bh = a.b - a.t + 160;
    var s = Math.max(Z.fit, Math.min(Math.min(1.2, Z.max), vw / bw, vh / bh));
    go(s, vw / 2 - (a.l + a.r) / 2 * s, vh / 2 - (a.t + a.b) / 2 * s, true);
  }
  function flyToHits() { if (view === 'chart' && q) flyTo([].slice.call(chart.querySelectorAll('.rg-cp.is-hit'))); }

  /* ?z=<zoom over fit>,<x>,<y> (the middle of the window, as a share of the chart): kept only when it is not the whole board */
  var zT = null;
  function saveZ() {
    clearTimeout(zT);
    zT = setTimeout(function () {
      try {
        var u = new URL(W.location.href);
        if (Z.atFit || view !== 'chart') u.searchParams.delete('z');
        else u.searchParams.set('z', (Z.s / Z.fit).toFixed(2) + ',' + ((vp.clientWidth / 2 - Z.x) / Z.s / Z.cw).toFixed(3) + ',' + ((vp.clientHeight / 2 - Z.y) / Z.s / Z.ch).toFixed(3));
        W.history.replaceState(null, '', u);
      } catch (e) { }
    }, 400);
  }
  function loadZ() {
    var m; try { m = (new URL(W.location.href).searchParams.get('z') || '').split(','); } catch (e) { return; }
    if (m.length !== 3 || m.some(function (v) { return !isFinite(+v) || v === ''; })) return;
    bounds();
    var s = Math.max(Z.min, Math.min(Z.max, Z.fit * +m[0]));
    go(s, vp.clientWidth / 2 - +m[1] * Z.cw * s, vp.clientHeight / 2 - +m[2] * Z.ch * s, false);
  }

  /* the hands: one finger or the mouse drags, two fingers pinch, a still tap opens a face, two quick taps zoom in */
  var PT = {}, G = null, lastTap = { t: 0, x: 0, y: 0 };
  function pts() { return Object.keys(PT).map(function (k) { return PT[k]; }); }
  function startPan(p) { G.mode = 'pan'; G.sx = p.x; G.sy = p.y; G.x0 = Z.x; G.y0 = Z.y; }
  function startPinch() {
    var a = pts(); G.mode = 'pinch'; G.multi = true; G.moved = true;
    G.d0 = Math.max(1, Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y)); G.s0 = Z.s;
    G.mx = (a[0].x + a[1].x) / 2; G.my = (a[0].y + a[1].y) / 2; G.x0 = Z.x; G.y0 = Z.y;
  }
  if (vp) {
    vp.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      try { vp.setPointerCapture(ev.pointerId); } catch (e) { }
      var p = local(ev); PT[ev.pointerId] = p;
      stopAnim(); bounds(); moving(true); tog(zw, 'rg-used', true);
      var n = pts().length;
      if (n === 1) { G = { moved: false, multi: false, cx: ev.clientX, cy: ev.clientY }; startPan(p); }
      else if (n === 2 && G) startPinch();
    });
    vp.addEventListener('pointermove', function (ev) {
      if (!PT[ev.pointerId] || !G) return;
      var p = local(ev); PT[ev.pointerId] = p;
      if (G.mode === 'pinch' && pts().length >= 2) {
        var a = pts(), d = Math.max(1, Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y));
        var mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2;
        var s = Math.max(Z.min, Math.min(Z.max, G.s0 * d / G.d0)), k = s / G.s0;
        Z.s = s; Z.x = mx - (G.mx - G.x0) * k; Z.y = my - (G.my - G.y0) * k;
      } else if (G.mode === 'pan') {
        var dx = p.x - G.sx, dy = p.y - G.sy;
        if (!G.moved && Math.hypot(dx, dy) > 6) G.moved = true;
        if (!G.moved) return;
        Z.x = G.x0 + dx; Z.y = G.y0 + dy;
      }
      Z.atFit = false; clamp(); later();
    });
    function up(ev) {
      if (!PT[ev.pointerId]) return;
      delete PT[ev.pointerId];
      var left = pts();
      if (left.length === 1 && G) { startPan(left[0]); return; }      // one finger lifted from a pinch: the other drags on
      if (left.length) return;
      var g = G; G = null; moving(false);
      if (g && !g.moved && !g.multi && ev.type === 'pointerup') tap(ev);
      else saveZ();
    }
    vp.addEventListener('pointerup', up);
    vp.addEventListener('pointercancel', up);
    vp.addEventListener('lostpointercapture', function (ev) { if (PT[ev.pointerId]) up(ev); });
    vp.addEventListener('wheel', function (ev) {
      var k = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? vp.clientHeight : 1, dy = ev.deltaY * k, dx = ev.deltaX * k;
      bounds();
      if (!ev.ctrlKey && Math.abs(dx) > Math.abs(dy) * 1.2) {      // a trackpad's sideways swipe moves the chart
        ev.preventDefault(); stopAnim(); Z.x -= dx; Z.atFit = false; clamp(); later(); moving(true); moving(false); saveZ(); return;
      }
      if (!ev.ctrlKey && dy > 0 && Z.s <= Z.min * 1.001) return;      // already the whole board: the page scrolls on
      ev.preventDefault(); stopAnim(); moving(true);
      var p = local(ev), f = Math.exp(-dy * (ev.ctrlKey ? .01 : .0022)), s = Math.max(Z.min, Math.min(Z.max, Z.s * f)), r = s / Z.s;
      Z.x = p.x - (p.x - Z.x) * r; Z.y = p.y - (p.y - Z.y) * r; Z.s = s; Z.atFit = false;
      clamp(); later(); moving(false); saveZ();
    }, { passive: false });
    vp.addEventListener('keydown', function (ev) {      // the keyboard: arrows move, + and - zoom, 0 fits
      var c = centre(), step = 80, k = ev.key;
      if (k === '+' || k === '=') zoomBy(1.5, c.x, c.y, true);
      else if (k === '-' || k === '_') zoomBy(1 / 1.5, c.x, c.y, true);
      else if (k === '0') fit(true);
      else if (/^Arrow/.test(k)) { bounds(); go(Z.s, Z.x + (k === 'ArrowLeft' ? step : k === 'ArrowRight' ? -step : 0), Z.y + (k === 'ArrowUp' ? step : k === 'ArrowDown' ? -step : 0), true); }
      else return;
      ev.preventDefault();
    });
  }
  function tap(ev) {
    var p = local(ev), now = Date.now();
    var hit = D.elementFromPoint(ev.clientX, ev.clientY), c = hit && hit.closest ? hit.closest('.rg-cp') : null;
    if (c && vp.contains(c)) {
      lastTap.t = 0;
      var f = c.querySelector('.rg-face').getBoundingClientRect();
      if (f.width >= (ev.pointerType === 'mouse' ? 14 : 28)) { open(c.getAttribute('data-id'), vp); return; }      // a mouse is precise, a finger is not
      bounds(); zoomBy(Math.max(2.2, .8 / Z.s), p.x, p.y, true);      // too small to be sure which face: bring it close first
      return;
    }
    if (now - lastTap.t < 340 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 32) { lastTap.t = 0; zoomBy(2, p.x, p.y, true); return; }
    lastTap = { t: now, x: p.x, y: p.y };
  }
  function btn(id, f) { var b = $(id); if (b) b.addEventListener('click', f); }
  btn('rg-zin', function () { var c = centre(); zoomBy(1.6, c.x, c.y, true); });
  btn('rg-zout', function () { var c = centre(); zoomBy(1 / 1.6, c.x, c.y, true); });
  btn('rg-zfit', function () { fit(true); });

  /* full screen, for the live show: the browser's own, else the window filled with the chart */
  function fsEl() { return D.fullscreenElement || D.webkitFullscreenElement || null; }
  function isFull() { return !!zw && (fsEl() === zw || zw.classList.contains('rg-full')); }
  function cssFull(on) { tog(zw, 'rg-full', on); afterFull(); }
  function setFull(on) {
    if (on) {
      var req = zw.requestFullscreen || zw.webkitRequestFullscreen;
      if (req) {
        try { var pr = req.call(zw); if (pr && pr.then) pr.then(null, function () { cssFull(true); }); return; } catch (e) { }
      }
      cssFull(true);
    } else {
      if (fsEl()) { try { (D.exitFullscreen || D.webkitExitFullscreen).call(D); } catch (e) { } }
      if (zw.classList.contains('rg-full')) cssFull(false);
    }
  }
  function afterFull() {
    var on = isFull();
    tog(zw, 'is-full', on);
    tog(D.documentElement, 'rg-lock', zw.classList.contains('rg-full') || !sheet.hidden);
    var b = $('rg-zfull'), t = $('rg-zfull-t');
    if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (t) t.textContent = on ? w.z_exit : w.z_full;
    if (on && sheet.parentNode !== zw) zw.appendChild(sheet);      // the person's story opens over the chart, inside full screen
    if (!on && sheet.parentNode !== root) root.appendChild(sheet);
    setTimeout(function () { plan(); fit(false); }, 60);
  }
  btn('rg-zfull', function () { setFull(!isFull()); });
  D.addEventListener('fullscreenchange', afterFull);
  D.addEventListener('webkitfullscreenchange', afterFull);

  /* ---------------------------------------------------------------- the timeline */
  var T0 = ms(X.t0 || '2020-01-01'), T1 = ms(X.today), SPAN = Math.round((T1 - T0) / DAY);
  var range = $('rg-range'); range.max = SPAN; range.value = SPAN;
  var zrange = $('rg-zrange'); if (zrange) { zrange.max = SPAN; zrange.value = SPAN; }
  var cur = X.today;
  var dates = {};
  P.forEach(function (p) { if (GONE[p.s] && p.d && p.d.length === 10) (dates[p.d] = dates[p.d] || []).push(p); });
  var dayList = Object.keys(dates).sort();
  (function ticks() {
    var t = $('rg-ticks');
    dayList.forEach(function (d) {
      if (d < (X.t0 || '2020-01-01')) return;      // a fall before the timeline starts: the face is simply down from the first day
      var i = el('i', dates[d].some(function (p) { return p.s === 'killed'; }) ? 'rg-tick' : 'rg-tick is-d');
      var pos = (ms(d) - T0) / (T1 - T0) * 100;
      i.style[RTL ? 'right' : 'left'] = pos + '%';
      i.style.height = Math.min(26, 8 + dates[d].length * 3) + 'px';
      t.appendChild(i);
    });
    X.ops.forEach(function (o) {
      if (!o.start) return;
      var a = Math.max(0, (ms(o.start) - T0) / (T1 - T0) * 100), b = (ms(o.end || o.start) - T0) / (T1 - T0) * 100;
      if (b < 0) return;
      var s = el('i', 'rg-opband'); s.style[RTL ? 'right' : 'left'] = a + '%'; s.style.width = Math.max(.6, b - a) + '%'; s.title = (FA && o.name_fa) || o.name; t.appendChild(s);
    });
  })();
  /* the wars: a name under each burst of falls, and a button per war that jumps the timeline to it */
  var WARS = X.wars || [];
  function pos(d) { return Math.max(0, Math.min(100, (ms(d) - T0) / (T1 - T0) * 100)); }
  function warOn(d) { for (var i = 0; i < WARS.length; i++) { var g = WARS[i]; if (g.a && d >= g.a && d <= g.b) return g; } return null; }
  (function warLabels() {
    var box = $('rg-wl'); if (!box) return;
    WARS.forEach(function (g) {
      if (!g.a || !g.k) return;
      var c = (pos(g.a) + pos(g.b)) / 2, l = el('span', 'rg-wlab', g.s + ' · ' + num(g.k));
      l.style[RTL ? 'right' : 'left'] = c + '%';
      tog(l, 'is-start', c < 18); tog(l, 'is-end', c > 82);
      box.appendChild(l);
    });
  })();
  function warRows() {      // two names that would touch: the later one drops to a second line (measured once the timeline is on screen)
    var box = $('rg-wl'); if (!box) return;
    var ls = [].slice.call(box.children), two = false;
    ls.forEach(function (l) { l.classList.remove('is-row2'); });
    for (var i = 1; i < ls.length; i++) {
      var p = ls[i - 1].getBoundingClientRect(), q2 = ls[i].getBoundingClientRect();
      if (!ls[i - 1].classList.contains('is-row2') && q2.left < p.right + 6 && p.left < q2.right + 6) { ls[i].classList.add('is-row2'); two = true; }
    }
    tog(box, 'is-two', two);
  }
  var warBtns = [];
  (function warChips() {
    var box = $('rg-wars'); if (!box) return;
    WARS.forEach(function (g) {
      var b = el('button', 'rg-war'); b.type = 'button';
      b.appendChild(el('b', null, g.n));
      b.appendChild(el('span', null, g.k ? w.killed_n.replace('{k}', num(g.k)) : w.none_killed));
      b.addEventListener('click', function () {
        stop();
        var to = g.a ? (g.b > X.today ? X.today : g.b) : (X.t0 || X.today);
        range.value = Math.round((ms(to) - T0) / DAY); applyTime(to);
      });
      warBtns.push({ b: b, g: g }); box.appendChild(b);
    });
  })();
  function tally(d) {      // at day d: taken out, still in the chair, fate unknown
    var atEnd = d >= X.today, k = 0, a = 0, u = 0;
    P.forEach(function (p) {
      var down = GONE[p.s] && p.d && p.d <= d;
      if (down && p.s === 'killed') k++;
      else if (!down && !atEnd) { var pre = p.rp && BY[p.rp] && GONE[BY[p.rp].s] && !(BY[p.rp].d && BY[p.rp].d <= d); if (!pre) a++; }
    });
    if (atEnd) { P.forEach(function (p) { if (p.s === 'alive' || p.s === 'wounded') a++; else if (p.s === 'unknown') u++; }); }
    return { k: k, a: a, u: atEnd ? u : 0, end: atEnd };
  }
  function applyTime(d, quiet) {
    cur = d;
    var atEnd = d >= X.today;
    [].forEach.call(root.querySelectorAll('.rg-t, .rg-cl, .rg-cp'), function (t) {
      var p = BY[t.getAttribute('data-id')]; if (!p) return;
      var down = GONE[p.s] && p.d && p.d <= d;
      var pre = false;
      if (!atEnd && p.rp && BY[p.rp]) { var r = BY[p.rp]; pre = !!GONE[r.s] && !(r.d && r.d <= d); }
      tog(t, 'is-down', !!down);
      tog(t, 'is-up', !atEnd && !down && !pre);
      tog(t, 'is-pre', pre);
    });
    var c = tally(d);
    $('rg-ck').textContent = num(c.k); $('rg-ca').textContent = num(c.a); $('rg-cu').textContent = num(c.u);
    var said = atEnd ? w.today + ' · ' + say(d) : say(d);
    $('rg-date').textContent = said;
    $('rg-dn').textContent = num(c.k) + ' ' + w.n_killed + ' ' + w.by_date;
    var zd = $('rg-zdate'), zk = $('rg-zk'), ctl = $('rg-ctl');
    if (zd) zd.textContent = said;
    if (zk) zk.textContent = num(c.k) + ' ' + w.n_killed;
    if (ctl) ctl.textContent = num(c.k) + ' ' + w.n_killed + ' · ' + said;
    if (zrange && +zrange.value !== +range.value) zrange.value = range.value;
    var wr = atEnd ? null : warOn(d), wn = $('rg-warnow');
    if (wn) { wn.hidden = !wr; wn.textContent = wr ? wr.n : ''; }
    warBtns.forEach(function (x) { var g = x.g, on = !atEnd && (g.a ? (d >= g.a && d <= g.b) : d <= g.b); tog(x.b, 'is-on', on); x.b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    tog(root, 'is-past', !atEnd);
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
  if (zrange) zrange.addEventListener('input', function () { stop(); range.value = zrange.value; applyTime(iso(T0 + zrange.value * DAY)); });
  var timer = null;
  function playing(on) { $('rg-play-t').textContent = on ? w.pause : w.replay; tog($('rg-play'), 'is-on', on); var z = $('rg-zplay'); if (z) { tog(z, 'is-on', on); z.setAttribute('aria-label', on ? w.pause : w.replay); } }
  function stop() { if (timer) { clearTimeout(timer); timer = null; } playing(false); }
  $('rg-play').addEventListener('click', function () {
    if (timer) { stop(); return; }
    if (REDUCE) { range.value = SPAN; applyTime(X.today); return; }
    var startDay = Math.round((ms('2025-06-01') - T0) / DAY), v = +range.value >= SPAN - 1 ? startDay : +range.value;
    playing(true);
    (function step() {
      if (v > SPAN) { stop(); range.value = SPAN; applyTime(X.today); return; }
      range.value = v; var d = iso(T0 + v * DAY); applyTime(d);
      var hit = dates[d] && dates[d].length;
      v += 2;
      timer = setTimeout(step, hit ? 900 : 22);
    })();
  });
  btn('rg-zplay', function () { $('rg-play').click(); });

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
    if (p.src && p.src.length) { var s = el('p', 'rg-sh-src'); s.appendChild(el('span', 'rg-sh-k', w.sources)); p.src.slice(0, 8).forEach(function (u) { s.appendChild(link(u)); }); inner.appendChild(s); }
    if (p.cr) inner.appendChild(el('p', 'rg-sh-cr', '📷 ' + p.cr));
    if (isFull() && sheet.parentNode !== zw) zw.appendChild(sheet);
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
    sheet.hidden = true; tog(D.documentElement, 'rg-lock', !!zw && zw.classList.contains('rg-full'));
    try { var u = new URL(W.location.href); u.searchParams.delete('p'); W.history.replaceState(null, '', u); } catch (e) { }
    if (opener && opener.focus) try { opener.focus({ preventScroll: true }); } catch (e) { }
  }
  sheet.addEventListener('click', function (ev) { if (ev.target === sheet) close(); });
  D.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (!sheet.hidden) close();
    else if (zw && zw.classList.contains('rg-full')) setFull(false);
  });
  root.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('.rg-t, .rg-cl');
    if (!t || !root.contains(t) || sheet.contains(t)) return;
    open(t.getAttribute('data-id'), t);
  });

  /* ---------------------------------------------------------------- a picture to post (build/shareimg.js) */
  function shown() {      // the faces the reader is looking at, in the chart's order
    var on = filt !== 'all' || !!q || !!campOn;
    return (ORDER.length ? ORDER : P.map(function (p) { return p.id; })).filter(function (id) {
      var p = BY[id]; if (!p) return false;
      return !on || (matches(p) && (!campOn || p.c === campOn || p.c2 === campOn));
    });
  }
  (W.LPShotQ = W.LPShotQ || []).push({
    id: 'regime',
    kicker: w.shot_kick,
    title: function () { var c = tally(cur); return (c.end ? w.shot_title : w.shot_title_at.replace('{d}', say(cur))).replace('{k}', num(c.k)); },
    sub: function () { return w.shot_sub.replace('{a}', num(tally(cur).a)); },
    text: function () { return w.share_text; },
    cta: w.shot_cta,
    url: function () { return W.location.href; },
    draw: function (ctx, box, kit) {
      var ids = shown(), N = ids.length; if (!N) return;
      var best = { cell: 0, cols: 1, rows: 1 };
      for (var c = 1; c <= N; c++) { var r = Math.ceil(N / c), s = Math.min(box.w / c, box.h / r); if (s > best.cell) best = { cell: s, cols: c, rows: r }; }
      var cell = best.cell, rad = cell * .44, ox = box.x + (box.w - best.cols * cell) / 2, oy = box.y + (box.h - best.rows * cell) / 2;
      var red = (kit.c && kit.c.red) || '#E5484D';
      return Promise.all(ids.map(function (id) { var p = BY[id]; return p.img && kit.img ? kit.img(X.root + 'assets/regime/' + p.img) : Promise.resolve(null); })).then(function (imgs) {
        ids.forEach(function (id, i) {
          var p = BY[id], img = imgs[i], col = i % best.cols, row = Math.floor(i / best.cols);
          if (RTL) col = best.cols - 1 - col;
          var cx = ox + col * cell + cell / 2, cy = oy + row * cell + cell / 2;
          var down = !!(GONE[p.s] && p.d && p.d <= cur);
          var pre = !!(cur < X.today && p.rp && BY[p.rp] && GONE[BY[p.rp].s] && !(BY[p.rp].d && BY[p.rp].d <= cur));
          ctx.save();
          if (pre) ctx.globalAlpha = .25;
          ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.closePath(); ctx.save(); ctx.clip();
          if (img && img.naturalWidth) {
            var iw = img.naturalWidth, ih = img.naturalHeight, side = Math.min(iw, ih);
            ctx.drawImage(img, (iw - side) / 2, (ih - side) * .22, side, side, cx - rad, cy - rad, rad * 2, rad * 2);
          } else {
            ctx.fillStyle = (kit.c && kit.c.panel) || '#222'; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
            ctx.fillStyle = (kit.c && kit.c.dim) || '#999'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = kit.font ? kit.font(Math.round(rad * .7), 800) : '800 ' + Math.round(rad * .7) + 'px sans-serif';
            ctx.fillText(initials(p.en), cx, cy);
          }
          if (down) {      // grey, a shade darker, the way the board draws a fall
            ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
            ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
          }
          ctx.restore();
          ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
          ctx.lineWidth = Math.max(1.5, rad * .07); ctx.strokeStyle = down ? red : ((p.c && X.camps[p.c] && X.camps[p.c].c) || (kit.c && kit.c.line) || '#444'); ctx.stroke();
          if (down) {
            ctx.beginPath(); ctx.moveTo(cx - rad * .74, cy + rad * .74); ctx.lineTo(cx + rad * .74, cy - rad * .74);
            ctx.lineWidth = Math.max(2.5, rad * .15); ctx.lineCap = 'round'; ctx.strokeStyle = red; ctx.stroke();
          }
          ctx.restore();
        });
      });
    }
  });
  // the button shows once the picture maker is there (share.js may load it after this file); it stays hidden if it never comes
  function shotReady() { var b = $('rg-shot'), ok = !!(W.LPShot && typeof W.LPShot.open === 'function'); if (b && ok) b.hidden = false; return ok; }
  btn('rg-shot', function () { if (W.LPShot && typeof W.LPShot.open === 'function') W.LPShot.open('regime', $('rg-shot')); });
  (function wait(n) { if (!shotReady() && n < 40) setTimeout(function () { wait(n + 1); }, 500); })(0);

  /* ---------------------------------------------------------------- start */
  $('rg-time').hidden = false; $('rg-bar').hidden = false;
  warRows();
  (function fold() {      // each branch shows its first two rows; the button says what the rest holds
    var bs = [].slice.call(root.querySelectorAll('.rg-board .rg-b'));
    function lay() {
      if ($('rg-board').hidden) return;      // measured only when the branches are on screen (setView calls it again)
      bs.forEach(function (b) {
        var g = b.querySelector('.rg-g'), ts = [].slice.call(g.children);
        var cols = (W.getComputedStyle(g).gridTemplateColumns || '').split(' ').filter(Boolean).length || 3, n = cols * 2;
        var over = ts.slice(n), btn2 = b.querySelector('.rg-more');
        ts.forEach(function (t, i) { tog(t, 'is-over', i >= n); });
        if (!over.length) { if (btn2) btn2.remove(); b.classList.remove('is-folded'); return; }
        if (!btn2) {
          btn2 = el('button', 'btn btn-line rg-more'); btn2.type = 'button';
          var bb = btn2;
          bb.addEventListener('click', function () { var f = b.classList.toggle('is-folded'); bb.textContent = f ? bb.getAttribute('data-more') : w.less; bb.setAttribute('aria-expanded', f ? 'false' : 'true'); if (f) b.scrollIntoView({ block: 'nearest' }); });
          b.appendChild(btn2); b.classList.add('is-folded');
        }
        var k = ts.filter(function (t) { var p = BY[t.getAttribute('data-id')]; return p && GONE[p.s]; }).length;
        btn2.setAttribute('data-more', w.more.replace('{n}', num(ts.length)).replace('{k}', num(k)));
        btn2.textContent = b.classList.contains('is-folded') ? btn2.getAttribute('data-more') : w.less;
        btn2.setAttribute('aria-expanded', b.classList.contains('is-folded') ? 'false' : 'true');
      });
    }
    foldLay = lay;
    var cl = [].slice.call(root.querySelectorAll('.rg-chairs > ul > li'));
    if (cl.length > 4) {      // the chains: the first four, then the rest on a tap
      cl.forEach(function (li, i) { tog(li, 'is-over', i >= 4); });
      var ch = $('rg-chairs'); ch.classList.add('is-folded');
      var cb = el('button', 'btn btn-line rg-more', w.more.replace('{n}', num(cl.length)).replace(/[,،][^,،]*$/, '')); cb.type = 'button'; cb.setAttribute('aria-expanded', 'false');
      var cm = cb.textContent;
      cb.addEventListener('click', function () { var f = ch.classList.toggle('is-folded'); cb.textContent = f ? cm : w.less; cb.setAttribute('aria-expanded', f ? 'false' : 'true'); });
      ch.appendChild(cb);
    }
  })();
  var start = 'chart';
  try { var v0 = new URL(W.location.href).searchParams.get('view'); if (v0 === 'board' || v0 === 'camps' || v0 === 'days') start = v0; } catch (e) { }
  setView(start);
  if (start === 'chart') loadZ();
  applyTime(X.today, true); event(X.today);
  // the words of the chart are measured once the page's fonts are in: if the chart is still the whole board, it fits again
  function refit() { if (view === 'chart' && Z.atFit) { plan(); fit(false); } else if (view === 'chart') { measure(); clampPaint(); } }
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(refit, function () { });
  W.addEventListener('load', refit);
  var rz = null;
  W.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { warRows(); foldLay(); if (view === 'chart' && vp.clientWidth) { if (Z.atFit) { plan(); fit(false); } else clampPaint(); } }, 180); });
  (function fromAddress() {
    var p; try { p = new URL(W.location.href).searchParams.get('p'); } catch (e) { return; }
    if (p && BY[p]) open(p);
  })();
})();
