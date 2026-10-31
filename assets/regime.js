/* The Regime Board (build/regime.py writes the page and the data; this file makes it move). Shared by libertypolitics.com
   and iranuncensored.com, English and Persian: every word comes from the page's own data (#rg-data, "w").

   ONE STAGE (31 Oct 2026). Armin: "When I'm playing with the timeline, it's all the way at the top, and I can't even see
   what's happening to the board ... I click on the filter IRGC or technocrats. It's all the way at the top ... when I
   switch from whole chart to branch to faction to day by day, this whole zoom-in and zoom-out option disappears." So the
   board is one window the height of the screen (#rg-zw, .rg-stage): the views and the filters on its top edge, the board
   in the middle, the timeline docked on its bottom edge. Every control sits on the same screen as what it changes.

     FOUR VIEWS     the whole chart (the Supreme Leader on top, every branch a column under him, like the original image
                    by @HekasrehCrisis), the factions (one column per camp), day by day (one column per war, a row per
                    day) and a plain list by branch (the server-drawn board: readable on a phone, buttons for the keyboard
                    and screen readers). The first three are drawn at real size and scaled with one CSS transform inside
                    the window: pinch and drag on a phone, wheel or trackpad and drag on a computer, double-tap to zoom in,
                    + / - / Fit / Full screen. In the list, + and - make the faces bigger or smaller. Zoom never goes away.
                    ?view=camps|days|board, ?z=<zoom over fit>,<x>,<y> and ?p=<id> open a view, a zoom or a person.
     THE TIMELINE   docked under the board: a slider from the first day to today and a button per war; every face falls on
                    its day, successors appear only once the chair is theirs, the counts on the filters follow the day.
     FILTERS        everyone / taken out / still in place / unknown (each with its number at that day), the camps, and a
                    name search. On a chart a face that does not match goes faint and a search flies to what it found; in
                    the list it is hidden. The three big counts at the top are the same filters.
     THE SHEET      a tap on any face: who they are, what happened, everyone who has sat in that chair (the "empty chairs"
                    that were a section of their own until 31 Oct 2026), their camp and why, sources.
     A PICTURE      registered with build/shareimg.js (window.LPShotQ, id 'regime'): every face in chart order, the fallen grey
                    with a red line, at the day and filter the reader is looking at. The button shows only once LPShot exists.
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
  var GONE = { killed: 1, died: 1 };
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
  function sayMonth(isoDay) {
    var a = isoDay.split('-').map(Number);
    if (FA) { var j = jalali(a[0], a[1], a[2] || 15); return num(FA_M[j[1] - 1] + ' ' + j[0]); }
    return EN_M[a[1] - 1] + ' ' + a[0];
  }

  /* ---------------------------------------------------------------- one face, and where a person stands on a day */
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
  var cur = X.today;
  // k taken out by that day, g died by that day, a in the chair, u fate unknown (today only), pre: the chair not yet theirs,
  // x out of the chair some other way (removed, arrested). The counts, the filters and the picture all read this one answer.
  function stAt(p, d) {
    if (GONE[p.s] && p.d && p.d <= d) return p.s === 'killed' ? 'k' : 'g';
    if (d >= X.today) return (p.s === 'alive' || p.s === 'wounded') ? 'a' : p.s === 'unknown' ? 'u' : GONE[p.s] ? 'g' : 'x';
    var r = p.rp && BY[p.rp];
    if (r && GONE[r.s] && !(r.d && r.d <= d)) return 'pre';
    return 'a';
  }
  function tally(d) { var t = { k: 0, a: 0, u: 0, all: 0 }; P.forEach(function (p) { var s = stAt(p, d); if (s in t) t[s]++; if (s !== 'pre') t.all++; }); return t; }

  /* ---------------------------------------------------------------- the stage */
  var zw = $('rg-zw'), vp = $('rg-vp'), chart = $('rg-chart'), list = $('rg-list'), zfl = zw.querySelector('.rg-zfl');
  var hint = zw.querySelector('.rg-zhint'), hintText = hint ? hint.textContent : '';
  var CELLS = [];      // every face drawn on any of the zooming views, attached or not
  var BOARDS = [];     // the branches, in the printed board's order: { k, n, ids }
  [].forEach.call(root.querySelectorAll('#rg-board .rg-b'), function (b) {
    var ids = [].map.call(b.querySelectorAll('.rg-t'), function (t) { return t.getAttribute('data-id'); }).filter(function (i) { return BY[i]; });
    var h = b.querySelector('h3');
    BOARDS.push({ k: b.getAttribute('data-b'), n: h ? h.textContent : '', ids: ids });
  });
  var BNAME = {}, BKEY = {};
  BOARDS.forEach(function (b) { BNAME[b.k] = b.n; b.ids.forEach(function (i) { BKEY[i] = b.k; }); });
  var ORDER = [];      // every person in the chart's order (the picture uses it)

  function cell(p, big, sub) {
    var c = el('div', 'rg-cp is-' + (p.s || 'alive') + (big ? ' is-top' : ''));
    c.setAttribute('data-id', p.id); c.setAttribute('data-camp', p.c || ''); c.setAttribute('data-camp2', p.c2 || '');
    c.appendChild(face(p)); c.appendChild(el('b', null, p.n));
    c.appendChild(el('span', 'rg-cps', sub === 'role' ? (p.r || '') : GONE[p.s] && p.d ? sayShort(p.d) : p.s === 'unknown' ? (w.st_unknown || '') : (p.r || '')));
    c.title = p.n + (p.r ? ' · ' + p.r : '');
    CELLS.push(c);
    return c;
  }
  function column(col, sub) {      // one box of faces: a branch, a camp or a war, cut into labelled groups
    var sec = el('section', 'rg-cc'); sec.setAttribute('data-b', col.k);
    if (col.c) { sec.style.setProperty('--c', col.c); sec.classList.add('is-camp'); }
    var h = el('div', 'rg-cch'), k = col.ids.filter(function (i) { return BY[i].s === 'killed'; }).length;
    h.appendChild(el('h3', null, col.n));
    var c = el('span', 'rg-cchc num'); c.appendChild(el('b', null, num(k))); c.appendChild(D.createTextNode(' / ' + num(col.ids.length))); h.appendChild(c);
    var bp = el('span', 'rg-bp'); bp.setAttribute('aria-hidden', 'true'); bp.style.setProperty('--p', Math.round(100 * k / col.ids.length) + '%'); h.appendChild(bp);
    if (col.w) h.appendChild(el('p', 'rg-ccw', col.w));
    sec.appendChild(h);
    col.groups.forEach(function (g) {
      var gw = el('div', 'rg-cg');
      if (col.groups.length > 1 || col.label1) gw.appendChild(el('p', 'rg-cgl', g.n));
      var gg = el('div', 'rg-cgg'); g.ids.forEach(function (id) { gg.appendChild(cell(BY[id], false, sub)); }); gw.appendChild(gg);
      sec.appendChild(gw);
    });
    col.el = sec;
    return sec;
  }
  function groupBy(ids, keyOf, nameOf) { var gs = [], at = {}; ids.forEach(function (id) { var u = keyOf(id); if (!(u in at)) { at[u] = gs.length; gs.push({ u: u, n: nameOf(u), ids: [] }); } gs[at[u]].ids.push(id); }); return gs; }
  function head(title) {
    var h = el('div', 'rg-c-head');
    h.appendChild(el('p', 'rg-c-h1', title));
    h.appendChild(el('p', 'rg-c-sub'));
    return h;
  }

  /* the three zooming views, each built the first time it is opened: { el, cols, toph } */
  var LAY = {};
  var BUILD = {
    chart: function () {      // the Supreme Leader's chair on top, every branch a box under him
      var lay = el('div', 'rg-lay'), top = [];
      var cols = BOARDS.map(function (b) { return { k: b.k, n: b.n, ids: b.ids.slice() }; });
      if (cols.length && cols[0].k === 'leader' && cols[0].ids.length) {
        var t = cols[0].ids[0]; top.push(t);
        for (var guard = 0; guard < 6; guard++) {
          var nx = P.filter(function (p) { return p.rp === t && top.indexOf(p.id) < 0; })[0];
          if (!nx) break;
          top.push(nx.id); t = nx.id;
        }
        cols[0].ids = cols[0].ids.filter(function (i) { return top.indexOf(i) < 0; });
      }
      cols = cols.filter(function (c) { return c.ids.length; });
      var h1 = root.querySelector('.rg-head h1');
      lay.appendChild(head(h1 ? h1.textContent : ''));
      if (top.length) {
        var tb = el('div', 'rg-c-top'); tb.appendChild(el('p', 'rg-c-topl', w.z_top));
        var chn = el('div', 'rg-c-chain');
        top.forEach(function (id, i) {
          if (i) { var a = el('i', 'rg-arrow'); a.setAttribute('aria-hidden', 'true'); chn.appendChild(a); }
          chn.appendChild(cell(BY[id], true));
        });
        tb.appendChild(chn); lay.appendChild(tb);
      }
      ORDER = top.slice();
      var row = el('div', 'rg-c-cols');
      cols.forEach(function (col) {
        col.groups = groupBy(col.ids, function (id) { return BY[id].u || ''; }, function (u) { return X.units[u] || ''; });
        row.appendChild(column(col)); col.ids.forEach(function (i) { ORDER.push(i); });
      });
      lay.appendChild(row);
      return { el: lay, cols: cols, toph: top.length ? 330 : 150, topped: !!top.length };
    },
    camps: function () {      // one box per camp, its people by branch
      var lay = el('div', 'rg-lay'), cols = [];
      lay.appendChild(head(w.v_camps));
      var keys = Object.keys(X.camps).concat(['']);
      keys.forEach(function (k) {
        var ids = ORDER.filter(function (i) { var p = BY[i]; return k ? (p.c === k || p.c2 === k) : !p.c; });
        if (!ids.length) return;
        var col = { k: k || 'none', n: k ? X.camps[k].n : w.no_camp, w: k ? X.camps[k].w : '', c: k ? X.camps[k].c : '', ids: ids, minC: 2, hx: 64 };
        col.groups = groupBy(ids, function (i) { return BKEY[i] || ''; }, function (b) { return BNAME[b] || ''; });
        cols.push(col);
      });
      var row = el('div', 'rg-c-cols is-flat');
      cols.forEach(function (c) { row.appendChild(column(c)); });
      lay.appendChild(row);
      return { el: lay, cols: cols, toph: 150 };
    },
    days: function () {      // one box per war (or the days between), a row per day of falls, oldest first
      var lay = el('div', 'rg-lay'), cols = [], byKey = {};
      lay.appendChild(head(w.v_days));
      var fallen = P.filter(function (p) { return GONE[p.s] && p.d; }).sort(function (a, b) { return a.d.localeCompare(b.d) || ORDER.indexOf(a.id) - ORDER.indexOf(b.id); });
      var last = null;
      fallen.forEach(function (p) {
        var g = warOf(p.d), key = g ? g.id || g.n : 'gap';
        if (!last || last.key !== key) {      // the days between two wars make a box of their own, named by their months
          last = byKey[key + cols.length] = { key: key, k: key, n: g ? g.n : '', war: g, ids: [], minC: 2, label1: true };
          cols.push(last);
        }
        last.ids.push(p.id);
      });
      cols.forEach(function (c) {
        if (!c.war) { var a = BY[c.ids[0]].d, b = BY[c.ids[c.ids.length - 1]].d; c.n = sayMonth(a) === sayMonth(b) ? sayMonth(a) : sayMonth(a) + ' ' + w.to + ' ' + sayMonth(b); }
        c.groups = groupBy(c.ids, function (i) { return BY[i].d; }, function (d) { var o = opOn(d); return say(d) + (o ? ' · ' + o.n : ''); });
      });
      var row = el('div', 'rg-c-cols is-flat');
      cols.forEach(function (c) { row.appendChild(column(c, 'role')); });
      lay.appendChild(row);
      return { el: lay, cols: cols, toph: 150 };
    }
  };
  function layout(v) { if (!LAY[v]) { if (!LAY.chart) LAY.chart = BUILD.chart(); if (!LAY[v]) LAY[v] = BUILD[v](); applyTime(cur, true); applyFilter(); } return LAY[v]; }

  /* ---------------------------------------------------------------- filters and search */
  var view = 'chart', filt = 'all', q = '', campOn = '';
  var FST = { fallen: 'k', standing: 'a', unknown: 'u' };
  function matches(p) {
    if (filt !== 'all' && stAt(p, cur) !== FST[filt]) return false;
    if (q) {
      var hay = (p.en + ' ' + (p.fa || '') + ' ' + (p.r || '') + ' ' + (X.units[p.u] || '')).toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }
  function inCamp(n) { return !campOn || n.getAttribute('data-camp') === campOn || n.getAttribute('data-camp2') === campOn; }
  var hits = 0;
  function applyFilter() {
    var shown = 0;
    [].forEach.call(list.querySelectorAll('.rg-t'), function (t) {
      var p = BY[t.getAttribute('data-id')]; var ok = !!p && matches(p) && inCamp(t);
      t.hidden = !ok; if (ok) shown++;
    });
    [].forEach.call(list.querySelectorAll('.rg-b'), function (s) { s.hidden = !s.querySelector('.rg-t:not([hidden])'); });
    hits = 0;
    var lay = LAY[view];
    CELLS.forEach(function (c) {      // a chart keeps its shape: a face that does not match goes faint
      var p = BY[c.getAttribute('data-id')], ok = !!p && matches(p) && inCamp(c);
      tog(c, 'is-dim', !ok); tog(c, 'is-hit', !!q && ok);
      if (ok && lay && lay.el.contains(c)) hits++;
    });
    if (view !== 'board') shown = hits;
    $('rg-none').hidden = shown > 0;
    if (hint) { hint.textContent = q ? w.found.replace('{n}', num(shown)) : hintText; tog(hint, 'is-q', !!q); }
    tog(root, 'rg-filtering', filt !== 'all' || !!q || !!campOn);
  }
  function setFilter(f) {
    filt = f;
    [].forEach.call(root.querySelectorAll('.rg-f'), function (x) { var on = x.getAttribute('data-f') === f; tog(x, 'is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    [].forEach.call(root.querySelectorAll('.rg-cn'), function (x) { var on = x.getAttribute('data-f') === f; tog(x, 'is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    applyFilter(); list.scrollTop = 0;
  }
  [].forEach.call(root.querySelectorAll('.rg-f'), function (b) { b.addEventListener('click', function () { setFilter(b.getAttribute('data-f')); }); });
  // the three big counts are the same filters: a tap lights them and brings the board up to where they can be seen
  [].forEach.call(root.querySelectorAll('.rg-cn'), function (b) {
    b.addEventListener('click', function () { var f = b.getAttribute('data-f'); setFilter(filt === f ? 'all' : f); toStage(); });
  });
  function toStage() {
    var r = zw.getBoundingClientRect(), top = parseFloat(zw.style.getPropertyValue('--rg-top')) || 0;
    var y = (W.pageYOffset || 0) + r.top - top - 6;      // measured, not scrollIntoView: each site pads its own scrolling differently
    if (Math.abs(r.top - top - 6) > 4) { try { W.scrollTo({ top: y, behavior: REDUCE ? 'auto' : 'smooth' }); } catch (e) { W.scrollTo(0, y); } }
  }
  var flyT = null;
  $('rg-q').addEventListener('input', function () {
    q = this.value.trim().toLowerCase(); applyFilter(); list.scrollTop = 0;
    clearTimeout(flyT); if (q && view !== 'board') flyT = setTimeout(flyToHits, 350);
  });

  /* the camp key: one chip per camp, a tap lights its people on whichever view is open */
  (function () {
    var key = $('rg-campkey');
    Object.keys(X.camps).forEach(function (k) {
      if (!P.some(function (p) { return p.c === k || p.c2 === k; })) return;
      var b = el('button', 'rg-ck'); b.type = 'button'; b.setAttribute('data-c', k); b.setAttribute('aria-pressed', 'false'); b.style.setProperty('--c', X.camps[k].c);
      b.appendChild(el('i')); b.appendChild(el('span', null, X.camps[k].n)); b.title = X.camps[k].w;
      b.addEventListener('click', function () {
        campOn = campOn === k ? '' : k;
        [].forEach.call(key.querySelectorAll('.rg-ck'), function (x) { var on = x.getAttribute('data-c') === campOn; tog(x, 'is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        applyFilter(); list.scrollTop = 0;
        if (campOn && view === 'camps') { var col = LAY.camps.cols.filter(function (c) { return c.k === k; })[0]; if (col) flyTo([col.el]); }
      });
      key.appendChild(b);
    });
  })();

  /* ---------------------------------------------------------------- views */
  var POSE = {};      // where each zooming view was left: { s, x, y, atFit, vw, vh }
  function setView(v) {
    if (LAY[view] && view !== 'board') POSE[view] = { s: Z.s, x: Z.x, y: Z.y, atFit: Z.atFit, vw: vp.clientWidth, vh: vp.clientHeight };
    view = v;
    [].forEach.call(root.querySelectorAll('.rg-v'), function (b) { var on = b.getAttribute('data-v') === v; tog(b, 'is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    var zoomy = v !== 'board';
    vp.hidden = !zoomy; list.hidden = zoomy;
    tog(zw, 'is-list', !zoomy);
    if (zoomy) {
      var lay = layout(v);
      if (chart.firstChild !== lay.el) { chart.textContent = ''; chart.appendChild(lay.el); }
      chart.setAttribute('data-v', v);
      applyFilter();
      plan();
      var ps = POSE[v];
      if (ps && !ps.atFit && ps.vw === vp.clientWidth && ps.vh === vp.clientHeight) { bounds(); Z.s = ps.s; Z.x = ps.x; Z.y = ps.y; Z.atFit = false; Z.ready = true; clamp(); paint(); }
      else fit(false);
      if (q) flyToHits();
    } else applyFilter();
    try { var u = new URL(W.location.href); if (v === 'chart') u.searchParams.delete('view'); else u.searchParams.set('view', v); if (v === 'board') u.searchParams.delete('z'); W.history.replaceState(null, '', u); } catch (e) { }
  }
  [].forEach.call(root.querySelectorAll('.rg-v'), function (b) { b.addEventListener('click', function () { if (b.getAttribute('data-v') !== view) setView(b.getAttribute('data-v')); }); });

  /* ---------------------------------------------------------------- pan and zoom */
  // Z: s = scale, x/y = where the drawing's top-left corner sits in the window, cw/ch = the drawing's real size.
  var Z = { s: 1, x: 0, y: 0, cw: 1, ch: 1, fit: 1, min: .1, max: 3, atFit: true, ready: false };
  var CELL_W = 112, CELL_H = 134, GAP = 6, PAD = 16, COLGAP = 24, STACK = 30, GLAB = 34, CPAD = 44;
  function rowsOf(col, c) { var r = 0; col.groups.forEach(function (g) { r += Math.ceil(g.ids.length / c); }); return r; }
  function boxH(col, c) { return (c === 1 ? 150 : 96) + (col.hx || 0) + rowsOf(col, c) * (CELL_H + GAP) + ((col.groups.length > 1 || col.label1) ? col.groups.length * GLAB : 0); }
  function boxW(c) { return c * CELL_W + (c - 1) * GAP + PAD * 2 + 4; }
  function plan() {      // how many faces wide each box is, and which short boxes stack under the one before: the layout that lets the whole drawing sit largest in this window
    var lay = LAY[view]; if (!vp || !lay || !lay.cols.length) return;
    var COLS = lay.cols, vw = vp.clientWidth || 360, vh = vp.clientHeight || 400, best = null;
    for (var R = 2; R <= 70; R++) {
      var cs = [], hs = [], Hmax = 0;
      COLS.forEach(function (col) { var c = Math.min(col.minC || 1, col.ids.length); while (c < 12 && rowsOf(col, c) > R) c++; cs.push(c); hs.push(boxH(col, c)); Hmax = Math.max(Hmax, boxH(col, c)); });
      var slots = [], s = null;
      COLS.forEach(function (col, i) {      // in the drawing's own order: a box sits under the one before it when both fit the tallest column
        if (s && s.h + STACK + hs[i] <= Hmax) { s.items.push(i); s.h += STACK + hs[i]; s.w = Math.max(s.w, boxW(cs[i])); }
        else { s = { items: [i], h: hs[i], w: boxW(cs[i]) }; slots.push(s); }
      });
      var Wd = CPAD * 2 + (slots.length - 1) * COLGAP;
      slots.forEach(function (x) { Wd += x.w; });
      var sc = Math.min(vw / Wd, vh / (Hmax + lay.toph + CPAD * 2));
      if (!best || sc > best.sc + 1e-6) best = { sc: sc, cs: cs, slots: slots };
    }
    var row = lay.el.querySelector('.rg-c-cols'); row.textContent = '';
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
  function clamp() {      // the drawing can be moved, never lost: what is smaller than the window stays inside it, what is larger keeps an edge in view
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
  function moving(on) {      // the drawing is a layer only while it moves, so the faces are drawn sharp again once it stops
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
    if (!nodes.length || view === 'board') return;
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
  function flyToHits() { if (view !== 'board' && q && LAY[view]) flyTo([].slice.call(LAY[view].el.querySelectorAll('.rg-cp.is-hit'))); }

  /* ?z=<zoom over fit>,<x>,<y> (the middle of the window, as a share of the drawing): kept only when it is not the whole board */
  var zT = null;
  function saveZ() {
    clearTimeout(zT);
    zT = setTimeout(function () {
      try {
        var u = new URL(W.location.href);
        if (Z.atFit || view === 'board') u.searchParams.delete('z');
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
  function used() { tog(zw, 'rg-used', true); }      // the hint has done its job once the reader has moved the board
  vp.addEventListener('pointerdown', function (ev) {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    try { vp.setPointerCapture(ev.pointerId); } catch (e) { }
    var p = local(ev); PT[ev.pointerId] = p;
    stopAnim(); bounds(); moving(true); used();
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
    if (!ev.ctrlKey && Math.abs(dx) > Math.abs(dy) * 1.2) {      // a trackpad's sideways swipe moves the drawing
      ev.preventDefault(); stopAnim(); Z.x -= dx; Z.atFit = false; clamp(); later(); moving(true); moving(false); saveZ(); return;
    }
    if (!ev.ctrlKey && dy > 0 && Z.s <= Z.min * 1.001) return;      // already the whole board: the page scrolls on
    ev.preventDefault(); stopAnim(); moving(true); used();
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
  /* the list zooms too: + and - make every face bigger or smaller, Fit puts it back */
  var LZ = 1, LZMAX = 3;
  function listZoom(z) { LZ = Math.max(0, Math.min(LZMAX, z)); list.setAttribute('data-z', LZ); }
  function btn(id, f) { var b = $(id); if (b) b.addEventListener('click', f); }
  btn('rg-zin', function () { if (view === 'board') { listZoom(LZ + 1); return; } used(); var c = centre(); zoomBy(1.6, c.x, c.y, true); });
  btn('rg-zout', function () { if (view === 'board') { listZoom(LZ - 1); return; } used(); var c = centre(); zoomBy(1 / 1.6, c.x, c.y, true); });
  btn('rg-zfit', function () { if (view === 'board') { listZoom(1); list.scrollTop = 0; return; } fit(true); });

  /* full screen, for the live show: the whole stage (views, filters, board, timeline), the browser's own or the window filled */
  function fsEl() { return D.fullscreenElement || D.webkitFullscreenElement || null; }
  function isFull() { return fsEl() === zw || zw.classList.contains('rg-full'); }
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
    var b = $('rg-zfull');
    if (b) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', on ? w.z_exit : w.z_full); b.title = on ? w.z_exit : w.z_full; }
    if (on && sheet.parentNode !== zw) zw.appendChild(sheet);      // the person's story opens over the board, inside full screen
    if (!on && sheet.parentNode !== root) root.appendChild(sheet);
    setTimeout(refit, 60);
  }
  btn('rg-zfull', function () { setFull(!isFull()); });
  D.addEventListener('fullscreenchange', afterFull);
  D.addEventListener('webkitfullscreenchange', afterFull);

  /* ---------------------------------------------------------------- the timeline, docked under the board */
  var T0 = ms(X.t0 || '2020-01-01'), T1 = ms(X.today), SPAN = Math.round((T1 - T0) / DAY);
  var range = $('rg-range'); range.max = SPAN; range.value = SPAN;
  var dates = {};
  P.forEach(function (p) { if (GONE[p.s] && p.d && p.d.length === 10) (dates[p.d] = dates[p.d] || []).push(p); });
  var dayList = Object.keys(dates).sort();
  var WARS = X.wars || [];
  function warOn(d) { for (var i = 0; i < WARS.length; i++) { var g = WARS[i]; if (g.a && d >= g.a && d <= g.b) return g; } return null; }
  function warOf(d) { var g = warOn(d); if (g) return g; for (var i = 0; i < WARS.length; i++) if (!WARS[i].a && d <= WARS[i].b) return WARS[i]; return null; }
  function opOn(d) {
    for (var i = 0; i < X.ops.length; i++) {
      var o = X.ops[i]; if (!o.start) continue;
      if (d >= o.start && d <= (o.end || o.start)) return { n: (FA && o.name_fa) || o.name };
    }
    return null;
  }
  (function ticks() {
    var t = $('rg-ticks');
    dayList.forEach(function (d) {
      if (d < (X.t0 || '2020-01-01')) return;      // a fall before the timeline starts: the face is simply down from the first day
      var i = el('i', dates[d].some(function (p) { return p.s === 'killed'; }) ? 'rg-tick' : 'rg-tick is-d');
      i.style[RTL ? 'right' : 'left'] = ((ms(d) - T0) / (T1 - T0) * 100) + '%';
      i.style.height = Math.min(22, 6 + dates[d].length * 3) + 'px';
      t.appendChild(i);
    });
    X.ops.forEach(function (o) {
      if (!o.start) return;
      var a = Math.max(0, (ms(o.start) - T0) / (T1 - T0) * 100), b = (ms(o.end || o.start) - T0) / (T1 - T0) * 100;
      if (b < 0) return;
      var s = el('i', 'rg-opband'); s.style[RTL ? 'right' : 'left'] = a + '%'; s.style.width = Math.max(.6, b - a) + '%'; s.title = (FA && o.name_fa) || o.name; t.appendChild(s);
    });
  })();
  var warBtns = [];
  (function warChips() {      // a button per war: a tap jumps the timeline to its last day
    var box = $('rg-wars'); if (!box) return;
    WARS.forEach(function (g) {
      var b = el('button', 'rg-war'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('b', null, g.s || g.n));
      b.appendChild(el('span', null, g.k ? w.killed_n.replace('{k}', num(g.k)) : w.none_killed));
      b.title = g.n;
      b.addEventListener('click', function () {
        stop();
        var to = g.a ? (g.b > X.today ? X.today : g.b) : (X.t0 || X.today);
        range.value = Math.round((ms(to) - T0) / DAY); applyTime(to);
      });
      warBtns.push({ b: b, g: g }); box.appendChild(b);
    });
    var t = el('button', 'rg-war is-today'); t.type = 'button'; t.appendChild(el('b', null, w.today)); t.appendChild(el('span', null, sayShort(X.today)));
    t.addEventListener('click', function () { stop(); range.value = SPAN; applyTime(X.today); });
    box.appendChild(t); warBtns.today = t;
  })();
  function applyTime(d, quiet) {
    cur = d;
    var atEnd = d >= X.today;
    var nodes = [].slice.call(list.querySelectorAll('.rg-t')).concat(CELLS);
    nodes.forEach(function (t) {
      var p = BY[t.getAttribute('data-id')]; if (!p) return;
      var s = stAt(p, d), down = s === 'k' || s === 'g';
      tog(t, 'is-down', down);
      tog(t, 'is-up', !atEnd && s === 'a');
      tog(t, 'is-pre', s === 'pre');
    });
    var c = tally(d);
    $('rg-ck').textContent = num(c.k); $('rg-ca').textContent = num(c.a); $('rg-cu').textContent = num(c.u);
    [].forEach.call(root.querySelectorAll('.rg-f [data-n]'), function (b) { var k = b.getAttribute('data-n'); b.textContent = num(k === 'all' ? c.all : c[FST[k]]); });
    var said = atEnd ? w.today + ' · ' + say(d) : say(d);
    $('rg-date').textContent = said;
    Object.keys(LAY).forEach(function (v) { var x = LAY[v].el.querySelector('.rg-c-sub'); if (x) x.textContent = num(c.k) + ' ' + w.n_killed + ' · ' + said; });
    var wr = atEnd ? null : warOn(d), wn = $('rg-warnow');
    if (wn) { wn.hidden = !wr; wn.textContent = wr ? wr.n : ''; }
    warBtns.forEach(function (x) { var g = x.g, on = !atEnd && (g.a ? (d >= g.a && d <= g.b) : d <= g.b); tog(x.b, 'is-on', on); x.b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (warBtns.today) tog(warBtns.today, 'is-on', atEnd);
    tog(root, 'is-past', !atEnd);
    if (filt !== 'all') applyFilter();      // who counts as taken out or in place depends on the day
    if (!quiet) event(d);
  }
  function event(d) {      // over the board: the last day of falls on or before the day the timeline is on
    var last = null;
    for (var i = dayList.length - 1; i >= 0; i--) { if (dayList[i] <= d) { last = dayList[i]; break; } }
    var ev = $('rg-ev'); ev.textContent = '';
    if (!last) return;
    var ppl = dates[last].filter(function (p) { return p.s === 'killed'; });
    if (!ppl.length) ppl = dates[last];
    ev.appendChild(el('b', 'num', say(last) + ': '));
    var names = ppl.slice(0, 3).map(function (p) { return p.n; }).join(FA ? '، ' : ', ');
    ev.appendChild(D.createTextNode(names + (ppl.length > 3 ? (FA ? ' و ' + num(ppl.length - 3) + ' نفر دیگه' : ' and ' + (ppl.length - 3) + ' more') : '')));
    var op = opOn(last); if (op) ev.appendChild(el('span', 'rg-op', op.n));
  }
  range.addEventListener('input', function () { stop(); applyTime(iso(T0 + range.value * DAY)); });
  var timer = null;
  function playing(on) { $('rg-play-t').textContent = on ? w.pause : w.replay; tog($('rg-play'), 'is-on', on); }
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

  /* ---------------------------------------------------------------- the sheet */
  var sheet = $('rg-sheet'), inner = $('rg-sh-in'), opener = null;
  function link(u) { var a = el('a', null, u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]); a.href = u; a.target = '_blank'; a.rel = 'noopener'; return a; }
  function chairLine(p) {      // everyone who has sat in this person's chair, first to last (the same post, rp)
    var first = p, seen = {}; seen[p.id] = 1;
    while (first.rp && BY[first.rp] && !seen[first.rp]) { first = BY[first.rp]; seen[first.id] = 1; }
    var line = [first], at = first, guard = 0;
    while (guard++ < 12) {
      var nx = P.filter(function (o) { return o.rp === at.id && line.indexOf(o) < 0; }).sort(function (a, b) { return (a.d || '9').localeCompare(b.d || '9'); })[0];
      if (!nx) break;
      line.push(nx); at = nx;
    }
    if (line.indexOf(p) < 0) line = [p];
    return line;
  }
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
    t.appendChild(el('p', 'rg-pill is-' + (p.s || 'alive'), stLine(p)));
    top.appendChild(t); top.appendChild(x); inner.appendChild(top);
    if (p.sn) inner.appendChild(el('p', 'rg-sh-sn', p.sn));
    var facts = el('dl', 'rg-sh-f');
    function fact(k, v) { if (!v) return; facts.appendChild(el('dt', null, k)); facts.appendChild(el('dd', null, v)); }
    if (GONE[p.s] || p.s === 'wounded') { fact(w.by, p.by); fact(w.op, p.op); fact(w.where, p.pl); }
    fact(w.sanct, p.sa);
    if (facts.childNodes.length) inner.appendChild(facts);
    var line = chairLine(p);
    if (line.length > 1) {      // the chair: everyone who sat in it, an arrow between each, this person lit
      inner.appendChild(el('h3', null, w.chair_h));
      var row = el('div', 'rg-sh-line scroll');
      line.forEach(function (o, i) {
        if (i) { var a = el('i', 'rg-arrow'); a.setAttribute('aria-hidden', 'true'); row.appendChild(a); }
        var c = chip(null, o); if (o === p) { c.classList.add('is-me'); c.setAttribute('aria-current', 'true'); } row.appendChild(c);
      });
      inner.appendChild(row);
    } else {      // a link that is not the same post (the person took over from someone in another chair)
      var before = p.rep && BY[p.rep], after = P.filter(function (o) { return o.rep === p.id; });
      if (before || after.length) {
        var ch = el('div', 'rg-sh-ch');
        if (before) ch.appendChild(chip(w.replaces, before));
        after.forEach(function (o) { ch.appendChild(chip(w.replaced, o)); });
        inner.appendChild(ch);
      }
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
    personCalls(p);      // Make your call, Liberty Politics only: the betting markets that name this person (below)
    if (isFull() && sheet.parentNode !== zw) zw.appendChild(sheet);
    sheet.hidden = false; D.documentElement.classList.add('rg-lock');
    inner.scrollTop = 0;
    try { x.focus({ preventScroll: true }); } catch (e) { x.focus(); }
    try { var u = new URL(W.location.href); u.searchParams.set('p', id); W.history.replaceState(null, '', u); } catch (e) { }
  }
  // Make your call (build/calls.js, ../CALLS.md): on Liberty Politics only (calls.js is never on an Iran Uncensored page,
  // so W.LPCalls is the switch), the sheet of a person a betting market names carries that market, to call it right there.
  // One mount, moved into each sheet as it opens; it stays hidden for a person no market names.
  var callsEl = null, callsFor = null, callsWait = false;
  function fold(v) { v = String(v || ''); try { v = v.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { } return v.toLowerCase().replace(/[^a-z]+/g, ' ').trim(); }
  function personCalls(p) {
    var L = W.LPCalls;
    callsFor = p;
    if (!L && !callsWait) {      // a sheet opened from the address (?p=) can open before calls.js has run: try again once the page has loaded
      callsWait = true;
      W.addEventListener('load', function () { if (W.LPCalls && !sheet.hidden && callsFor) personCalls(callsFor); });
    }
    if (!L || FA || !p.en) return;
    var me = ' ' + fold(p.en) + ' ';
    if (me.trim().split(' ').length < 2) return;
    if (!callsEl) { callsEl = el('div', 'lpc rg-sh-calls'); callsEl.setAttribute('data-lpc-tool', 'regime'); callsEl.setAttribute('data-lpc-n', '2'); }
    callsEl.setAttribute('data-lpc-h', 'Your call on ' + p.en);
    inner.appendChild(callsEl);
    L.mount(callsEl, { n: 2, filter: function (m) {
      var t = m.tools || [];
      if (t.indexOf('regime') < 0 && t.indexOf('intel') < 0) return false;
      return [m.q].concat(m.o.map(function (o) { return o[0]; })).some(function (x) { return (' ' + fold(x) + ' ').indexOf(me) >= 0; });
    } });
  }
  function chip(label, o) {
    var b = el('button', 'rg-sh-cp is-' + o.s); b.type = 'button';
    b.appendChild(face(o)); var s = el('span'); if (label) s.appendChild(el('small', null, label)); s.appendChild(el('b', null, o.n)); s.appendChild(el('small', null, stLine(o))); b.appendChild(s);
    b.addEventListener('click', function () { if (BY[o.id]) open(o.id, opener); });
    return b;
  }
  function close() {
    sheet.hidden = true; tog(D.documentElement, 'rg-lock', zw.classList.contains('rg-full'));
    try { var u = new URL(W.location.href); u.searchParams.delete('p'); W.history.replaceState(null, '', u); } catch (e) { }
    if (opener && opener.focus) try { opener.focus({ preventScroll: true }); } catch (e) { }
  }
  sheet.addEventListener('click', function (ev) { if (ev.target === sheet) close(); });
  D.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (!sheet.hidden) close();
    else if (zw.classList.contains('rg-full')) setFull(false);
  });
  list.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('.rg-t');
    if (t && list.contains(t)) open(t.getAttribute('data-id'), t);
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
    title: function () { var c = tally(cur), end = cur >= X.today; return (end ? w.shot_title : w.shot_title_at.replace('{d}', say(cur))).replace('{k}', num(c.k)); },
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
          var st = stAt(p, cur), down = st === 'k' || st === 'g', pre = st === 'pre';
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
  // the stage is the height of the screen under the site's own sticky bars, and its timeline clears any bar fixed at the
  // bottom (the live-show pill): both measured, never assumed, so it fits the same on both sites
  function chrome() {
    var top = 0, bot = 0, pl = 0, pr = 0, vh = W.innerHeight || 700, vw = D.documentElement.clientWidth || W.innerWidth || 360;
    [].forEach.call(D.body.children, function (n) {
      if (n === zw || n.contains(zw) || n === sheet) return;
      var s = W.getComputedStyle(n); if (s.position !== 'sticky' && s.position !== 'fixed') return;
      var r = n.getBoundingClientRect(); if (!r.height || r.height > vh / 3 || s.display === 'none' || s.visibility === 'hidden') return;
      if (s.position === 'sticky') { if (s.top !== 'auto') top = Math.max(top, (parseFloat(s.top) || 0) + r.height); }
      else if (r.top < vh / 2) top = Math.max(top, r.bottom);
      else if (r.width < vw * .5 && r.left > vw / 2) pr = Math.max(pr, vw - r.left);      // a small pill in a bottom corner: the timeline steps aside
      else if (r.width < vw * .5 && r.right < vw / 2) pl = Math.max(pl, r.right);
      else bot = Math.max(bot, vh - r.top);      // a bar across the bottom: the timeline sits above it
    });
    var z = zw.getBoundingClientRect(), cut = function (v, edge) { return Math.max(0, Math.round(v - edge)); };
    zw.style.setProperty('--rg-top', Math.round(top) + 'px');
    zw.style.setProperty('--rg-bot', Math.round(bot) + 'px');
    zw.style.setProperty('--rg-pr', cut(pr, vw - z.right) + 'px');
    zw.style.setProperty('--rg-pl', cut(pl, z.left) + 'px');
  }
  chrome();
  tog(zw, 'is-js', true);
  $('rg-time').hidden = false; $('rg-bar').hidden = false; zfl.hidden = false; if (hint) hint.hidden = false;
  listZoom(1);
  var start = 'chart';
  try { var v0 = new URL(W.location.href).searchParams.get('view'); if (v0 === 'board' || v0 === 'camps' || v0 === 'days') start = v0; } catch (e) { }
  applyTime(X.today, true); event(X.today);
  setView(start);
  if (start !== 'board') loadZ();
  // the words of the board are measured once the page's fonts are in: if a drawing is still the whole board, it fits again
  function refit() { if (view === 'board' || !vp.clientWidth) return; if (Z.atFit) { plan(); fit(false); } else { measure(); clampPaint(); } }
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(refit, function () { });
  W.addEventListener('load', function () { chrome(); refit(); });
  var rz = null;
  W.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { chrome(); POSE = {}; refit(); }, 180); });
  (function fromAddress() {
    var p; try { p = new URL(W.location.href).searchParams.get('p'); } catch (e) { return; }
    if (p && BY[p]) open(p);
  })();
})();
