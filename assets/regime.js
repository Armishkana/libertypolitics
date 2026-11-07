/* The Regime Board (build/regime.py writes the page and the data; this file makes it move). Shared by libertypolitics.com
   and iranuncensored.com, English and Persian: every word comes from the page's own data (#rg-data, "w").

   ONE BOARD YOU WALK (1 Nov 2026). Armin: "the difference between the whole chart option and the factions option is not
   very clear ... merge those two together ... make it significantly easier to maneuver". Structure is the layout and
   faction is a lens: the reader walks the regime the way it is built (the whole regime, a branch, a chair) and the
   "Colour by faction" switch paints every face by its camp wherever they are. regime.py prints every level (so the page
   reads without scripts); this file shows one level at a time and moves everything with the timeline.

     LEVELS       #rg-l0 (the Supreme Leader's chair, the most emptied chairs, a tile per branch) and one .rg-br per branch.
                  A tile, a breadcrumb or "Back" moves between them (history.pushState, ?b=<branch>).
     THE BAR      sticky over the board: "Find anyone" (a list of matches as you type; a choice walks to that person,
                  lights their face and opens their card), who to show (everyone / taken out / still in place / unknown,
                  each with its number on the day), and Colour by faction (the camp chips, a tap lights one camp, and a
                  bar of each camp's share of the chairs still standing and of those taken out).
     ROSTERS      a big body's every member behind one button (regime.py roster_html): a search box and camp chips here.
     PROVINCES    the map: a tap (or the list under it) opens that province: its corps commander and Friday prayer
                  leader, its members of the Assembly of Experts and of Parliament (?pv=<province>).
     THE TIMELINE docked at the foot of the stage: a slider from the first day to today, Replay and a button per war;
                  every face falls on its day, every count, damage meter and province moves with it.
     THE CARD     a tap on any face: a sheet from the bottom on a phone, a panel at the side on a computer. Their fate,
                  their seats, their camp and why, the chair's line of holders, sources, Share this person; Previous and
                  Next (and a swipe) walk the people of the same part. ?p=<id> opens it. Each card opened is ticked
                  (localStorage, "dossiers opened"); the page works the same without it.
     DAY BY DAY   the fourth tab: every fall, war by war and day by day (?v=days).
     EVERYONE     the first tab and the first view since 3 Nov 2026 (Armin: "'Key figures only' must NOT be the default"):
                  the whole regime as one chart to pinch, wheel-zoom and drag, with a size picker (Top 10 ... All); section
                  "EVERYONE" below. ?n=<size> keeps a size; no ?v is this view.
     KEY PLAYERS  the third tab, "Top officials only" (2 Nov 2026, Armin: "a version of this for people to be able to only track
                  and see the most important people"): the 20 of data/regime-key.json as cards, the biggest names taken
                  out under them, and the reader's own WATCHLIST above them (a star on a card or in any person's sheet;
                  localStorage 'rg-watch', the page works the same without it). A key player carries data-key everywhere
                  (a gold star on the face). ?v=key opens it, ?v=board the board, ?b= a branch.
     NO PHOTO     the figure of their post (regime.py AV_SPRITE, av_kind: cleric, seyyed cleric, uniform, woman, civilian),
                  never a grey circle.
     A PICTURE    registered with build/shareimg.js (window.LPShotQ, id 'regime'): the faces the reader is looking at.
   No dialog() calls, no animation that hides content; prefers-reduced-motion jumps instead of playing. The data carries
   a schema number (regime.py SCHEMA): a script that does not know it leaves the printed board alone. */
(function () {
  'use strict';
  var D = document, W = window;
  var root = D.getElementById('regime'), blob = D.getElementById('rg-data');
  if (!root || !blob) return;
  var X;
  try { X = JSON.parse(blob.textContent); } catch (err) { return; }
  if (!X || X.schema !== 2) return;
  var w = X.w, FA = X.lang === 'fa', P = X.p, BY = {};
  var RTL = (D.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl';
  P.forEach(function (p) { BY[p.id] = p; if (!p.n) p.n = p.en; });      // an English page sends the name once (en)
  var $ = function (id) { return D.getElementById(id); };
  var REDUCE = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GONE = { killed: 1, died: 1 };
  var DIG = '۰۱۲۳۴۵۶۷۸۹';
  function num(n) { var s = String(n); return FA ? s.replace(/[0-9]/g, function (d) { return DIG[+d]; }) : s; }
  // every class switch goes through here: the state is forced to true or false, and a class is written only when it changes.
  // classList.toggle(c, undefined) FLIPS the class, which made 24 faces blink on every step of the timeline (31 Oct 2026).
  function tog(n, c, on) { on = !!on; if (n.classList.contains(c) !== on) { if (on) n.classList.add(c); else n.classList.remove(c); } return on; }
  function el(tag, cls, text) { var n = D.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function each(sel, f, from) { [].forEach.call((from || root).querySelectorAll(sel), f); }
  function sget(k) { try { return W.localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { W.localStorage.setItem(k, v); } catch (e) { } }
  function url() { try { return new URL(W.location.href); } catch (e) { return null; } }
  /* USE OF THE BOARD (4 Nov 2026, the brief: "usage is measured"): counts only, through window.lpTrack, which build/harden.py
     writes beside the Google tag on the live address alone (a copy opened on the PC sends nothing). rg_tab (which view),
     rg_card (a card opened), rg_fullscreen, rg_branch (which chip), rg_quiz_start, rg_quiz_end (the score), rg_find (a
     search result picked: NEVER the words, a reader inside Iran must never have what they typed sent anywhere), rg_fix (the
     "something wrong here?" link). Read weekly by projects/hub/site-analytics.py (boardEvents); what the recheck does with
     them: LIVING.md, "The Regime Board roster recheck". */
  function track(e, p) { try { if (W.gtag && W.lpTrack) { p = p || {}; p.board_lang = FA ? 'fa' : 'en'; W.lpTrack(e, p); } } catch (x) { } }
  function setUrl(u, push, state) { try { if (push) W.history.pushState(state || null, '', u); else W.history.replaceState(state || W.history.state, '', u); } catch (e) { } }

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
    if (FA) { var j = jalali(a[0], a[1] || 7, a[2] || 15); return num((a[2] ? j[2] + ' ' : '') + FA_M[j[1] - 1] + ' ' + j[0]); }
    return (a[2] ? a[2] + ' ' : '') + EN_M[(a[1] || 1) - 1] + ' ' + a[0];
  }
  function sayShort(isoDay) {
    var a = isoDay.split('-').map(Number);
    if (FA || !a[1]) return say(isoDay);
    return (a[2] ? a[2] + ' ' : '') + EN_M[a[1] - 1].slice(0, 3) + ' ' + a[0];
  }
  function sayMonth(isoDay) {
    var a = isoDay.split('-').map(Number);
    if (FA) { var j = jalali(a[0], a[1], a[2] || 15); return num(FA_M[j[1] - 1] + ' ' + j[0]); }
    return EN_M[a[1] - 1] + ' ' + a[0];
  }

  /* ---------------------------------------------------------------- one face (the twin of regime.py face()) */
  function initials(n) { var b = String(n || '').split(/[\s-]+/).filter(function (x) { return /^[A-Za-z\u0600-\u06FF]/.test(x) && !/^(سید|سیده)$/.test(x); }); var t = b.length > 1 ? [b[0][0], b[b.length - 1][0]] : ((b[0] || '?').slice(0, 2)).split(''); return t.join(/[؀-ۿ]/.test(t.join('')) ? ' ' : '').toUpperCase(); }      // Persian initials apart by a thin space: joined they can spell a word (ر + ا = «را»)
  var SVGNS = 'http://www.w3.org/2000/svg';
  function face(p, later) {      // later: the chart sets the picture only once the face is on screen and big enough to see
    var f = el('span', 'rg-face');
    if (p.c && X.camps[p.c]) f.style.setProperty('--cc', X.camps[p.c].c);
    // later: a chart face. 4 Nov 2026 (Armin: "When I zoom in and out some pictures disappear"): its picture is the small copy
    // (assets/regime/t/, regime.py thumb()), set by lod() for every face on screen at EVERY zoom, never by the browser's own
    // lazy loading (which decides from scrolling, and the chart moves by a transform, not a scroll); a small copy that fails
    // falls back to the full picture, and that failing to the figure of their post, so a face is never left empty.
    if (p.img) {
      var i = el('img'), full = X.root + 'assets/regime/' + p.img;
      if (later) { i.setAttribute('data-src', X.root + 'assets/regime/t/' + p.img); i.onerror = function () { if (i.src !== full && i.src.indexOf('/t/') >= 0) i.src = full; else { i.onerror = null; var q = Object.assign({}, p); delete q.img; q.av = q.av || 'ci'; var g = face(q); f.replaceChild(g.firstChild, i); } }; }
      else { i.src = full; i.loading = 'lazy'; }
      i.alt = ''; i.decoding = 'async'; i.width = 200; i.height = 250; i.draggable = false; f.appendChild(i);
    }
    else {
      var av = p.av || 'ci', s = el('span', 'rg-ini rg-av'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('data-av', av);
      var sv = D.createElementNS(SVGNS, 'svg'); sv.setAttribute('focusable', 'false');
      var us = D.createElementNS(SVGNS, 'use'); us.setAttribute('href', '#rg-av-' + av); sv.appendChild(us); s.appendChild(sv);
      s.appendChild(el('b', null, initials(FA && p.fa ? p.fa : p.en)));
      f.appendChild(s);
    }
    if (GONE[p.s]) { var x = el('i', 'rg-x' + (p.s === 'died' ? ' rg-x-d' : '')); x.setAttribute('aria-hidden', 'true'); f.appendChild(x); }
    else if (p.s === 'unknown' || p.s === 'wounded') { var q = el('i', 'rg-q' + (p.s === 'wounded' ? ' rg-q-w' : ''), p.s === 'wounded' ? '+' : '?'); q.setAttribute('aria-hidden', 'true'); f.appendChild(q); }
    return f;
  }
  function stLine(p) { var s = w['st_' + (p.s || 'alive')] || ''; return (p.dd && p.s !== 'alive' && p.s !== 'unknown') ? s + ' · ' + p.dd : s; }
  function stSpan(p) {      // the fate line three ways (regime.py st3): CSS shows the one the timeline's day calls for
    var s = el('span', 'rg-s');
    s.appendChild(el('i', 'rg-s-now', stLine(p)));
    if (GONE[p.s]) s.appendChild(el('i', 'rg-s-was', w.st_alive));
    if (p.rp) s.appendChild(el('i', 'rg-s-pre', w.not_yet));
    return s;
  }
  function mark(n, p) { n.classList.add('is-' + (p.s || 'alive')); n.setAttribute('data-id', p.id); n.setAttribute('data-camp', p.c || ''); n.setAttribute('data-camp2', p.c2 || ''); if (p.k) n.setAttribute('data-key', p.k); return n; }
  function row(p, sub) {      // one compact row (a roster, a province, the search, the days): face, name, a line, the fate
    var b = mark(el('button', 'rg-rw'), p); b.type = 'button';
    b.appendChild(face(p));
    var t = el('span', 'rg-rwt'); t.appendChild(el('b', null, p.n)); t.appendChild(el('span', 'rg-rws', sub != null ? sub : (p.st || p.r || ''))); b.appendChild(t);
    if (p.c && X.camps[p.c]) { var d = el('i', 'rg-dot'); d.style.setProperty('--cc', X.camps[p.c].c); d.setAttribute('aria-hidden', 'true'); b.appendChild(d); }
    b.appendChild(stSpan(p));
    return b;
  }

  /* ---------------------------------------------------------------- where a person stands on a day */
  var cur = X.today;
  // k taken out by that day, g died by that day, a in the chair, u fate unknown (today only), pre: the chair not yet theirs,
  // x out of the chair some other way (removed, arrested). The counts, the filters, the meters and the picture all read it.
  function stAt(p, d) {
    if (GONE[p.s] && p.d && p.d <= d) return p.s === 'killed' ? 'k' : 'g';
    if (d >= X.today) return (p.s === 'alive' || p.s === 'wounded') ? 'a' : p.s === 'unknown' ? 'u' : GONE[p.s] ? 'g' : 'x';
    var r = p.rp && BY[p.rp];
    if (r && GONE[r.s] && !(r.d && r.d <= d)) return 'pre';
    return 'a';
  }
  function tally(d) { var t = { k: 0, a: 0, u: 0, all: 0 }; P.forEach(function (p) { var s = stAt(p, d); if (s in t) t[s]++; if (s !== 'pre') t.all++; }); return t; }

  /* ---------------------------------------------------------------- the stage */
  var stage = $('rg-zw'), board = $('rg-board'), daysEl = $('rg-days'), crumb = $('rg-crumb'), cr = $('rg-cr'), keyEl = $('rg-keyv');
  var NKEY = P.filter(function (p) { return p.k; }).length;
  var NODES = [];      // everything on the page that stands for one person (data-id): the timeline, the filters and the lens move them
  function collect() { NODES = [].slice.call(root.querySelectorAll('[data-id]')); }
  var BOARD = X.boards;      // unit -> branch
  var LEVEL = '', PV = '', TAB = 'chart';
  function branchOf(p) { return BOARD[p.u] || ''; }

  /* ---------------------------------------------------------------- walking the levels */
  function crumbs() {
    cr.textContent = '';
    function step(label, go, here) {
      var li = el('li');
      if (here) { var s = el('span', 'rg-cr-here', label); s.setAttribute('aria-current', 'page'); li.appendChild(s); }
      else { var b = el('button', 'rg-cr-b', label); b.type = 'button'; b.addEventListener('click', go); li.appendChild(b); }
      cr.appendChild(li);
    }
    step(w.top, function () { walk(''); }, !LEVEL);
    if (LEVEL) step(X.bn[LEVEL] || '', function () { pvPick(''); }, !(LEVEL === 'provinces' && PV));
    if (LEVEL === 'provinces' && PV && X.pvs[PV]) step(X.pvs[PV][0], null, true);
    cr.hidden = !LEVEL;      // on the whole regime the heading says where you are; the trail is for the way back
  }
  function walk(b, o) {      // b: '' for the whole regime, else a branch key
    o = o || {};
    if (b && !root.querySelector('.rg-br[data-b="' + b + '"]')) b = '';
    var changed = b !== LEVEL;
    LEVEL = b;
    tog($('rg-l0'), 'is-on', !b);
    each('.rg-br', function (x) { tog(x, 'is-on', x.getAttribute('data-b') === b); }, board);
    if (b === 'provinces' && o.pv !== undefined) pvPick(o.pv, { quiet: true });
    else if (b !== 'provinces') PV = '';
    crumbs();
    if (!o.pop) {
      var u = url();
      if (u) {
        if (b) u.searchParams.set('b', b); else u.searchParams.delete('b');
        if (b !== 'provinces') u.searchParams.delete('pv');
        u.searchParams.delete('view');
        setUrl(u, changed && !o.replace, { rgb: b });
      }
    }
    applyFilter();
    if (changed && o.scroll !== false) toStage();
  }
  // the whole regime's tiles, the "most emptied" strip, a link to the provinces: a tap walks in (no page load, Back comes back)
  board.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-b]');
    if (!t || !board.contains(t)) return;
    if (t.classList.contains('rg-tile') || t.classList.contains('rg-topv')) { ev.preventDefault(); walk(t.getAttribute('data-b')); return; }
    if (t.classList.contains('rg-mo')) { ev.preventDefault(); reveal(t.getAttribute('data-chair'), false); return; }
    if (t.classList.contains('rg-pvsee')) { ev.preventDefault(); openRoster(t.getAttribute('data-b'), t.getAttribute('href').split('-').slice(3).join('-')); return; }
  });
  W.addEventListener('popstate', function (ev) {
    var u = url(); if (!u) return;
    if (!(ev.state && ev.state.rgp)) shut();
    else if (BY[ev.state.rgp] && openId !== ev.state.rgp) open(ev.state.rgp, null, true, true);
    var b = u.searchParams.get('b') || '';
    walk(b, { pop: true, pv: u.searchParams.get('pv') || '', scroll: true });
    var vv = u.searchParams.get('v'), want = vv === 'days' ? 'days' : (vv === 'key' && keyEl) ? 'key' : (vv === 'board' || b) ? 'board' : 'chart';
    if (TAB !== want) setTab(want, true);
  });
  // the stage's top, under the site's own sticky bars, measured (each site pads its scrolling differently)
  function toStage() {
    var r = stage.getBoundingClientRect(), top = parseFloat(stage.style.getPropertyValue('--rg-top')) || 0;
    if (r.top >= top - 2 && r.top < (W.innerHeight || 700) * .35) return;
    var y = (W.pageYOffset || 0) + r.top - top - 4;
    try { W.scrollTo({ top: y, behavior: REDUCE ? 'auto' : 'smooth' }); } catch (e) { W.scrollTo(0, y); }
  }
  function into(n) {      // a face to the middle of the screen
    try { n.scrollIntoView({ block: 'center', behavior: REDUCE ? 'auto' : 'smooth' }); } catch (e) { n.scrollIntoView(); }
  }
  var hitT = null;
  function flash(id) {
    clearTimeout(hitT);
    each('.is-hit', function (n) { n.classList.remove('is-hit'); });
    each('[data-id="' + id + '"]', function (n) { n.classList.add('is-hit'); }, board);
    hitT = setTimeout(function () { each('.is-hit', function (n) { n.classList.remove('is-hit'); }); }, 2600);
  }
  // walk to a person (the search, the "most emptied" strip): their branch, their province or roster opened, their face lit
  function reveal(id, andOpen) {
    var p = BY[id]; if (!p) return;
    if (TAB === 'chart') {      // on the chart the search flies to the face instead of changing the view
      if (filt !== 'all' && stAt(p, cur) !== FST[filt]) setFilter('all');
      if (campOn) setCamp('');
      orgGo(id); if (andOpen !== false) open(id, null);
      return;
    }
    if (TAB !== 'board') setTab('board');
    var b = branchOf(p);
    walk(b, { pv: b === 'provinces' ? (p.pv || '') : undefined, scroll: false });
    var art = root.querySelector('.rg-br[data-b="' + b + '"]') || board;
    var n = art.querySelector('.rg-cm[data-id="' + id + '"], .rg-pp[data-id="' + id + '"]');
    if (!n) {      // an ordinary member: in the roster, under their province
      n = art.querySelector('.rg-rw[data-id="' + id + '"]');
      if (n) { var rs = n.closest('.rg-roster'); if (rs) { rs.open = true; rosterReset(rs); } var g = n.closest('.rg-rg'); if (g) g.open = true; }
    }
    if (filt !== 'all' && stAt(p, cur) !== FST[filt]) setFilter('all');
    if (campOn) setCamp('');
    if (n) { flash(id); setTimeout(function () { into(n); }, 30); }
    else toStage();
    if (andOpen !== false) open(id, n || null);
  }

  /* ---------------------------------------------------------------- who to show */
  var filt = 'all', campOn = '';
  var FST = { fallen: 'k', standing: 'a', unknown: 'u' };
  function inCamp(p) { return !campOn || p.c === campOn || p.c2 === campOn; }
  function applyFilter() {
    var on = filt !== 'all';
    NODES.forEach(function (n) {
      var p = BY[n.getAttribute('data-id')]; if (!p) return;
      tog(n, 'is-dim', on && stAt(p, cur) !== FST[filt]);
      tog(n, 'is-fade', !!campOn && !inCamp(p));
    });
    var art = LEVEL ? root.querySelector('.rg-br.is-on') : null, shown = 1;
    each('.rg-ch', function (c) { c.hidden = on && !c.querySelector('[data-id]:not(.is-dim)'); }, board);
    each('.rg-sub', function (s) { s.hidden = !s.querySelector('.rg-ch:not([hidden])'); }, board);
    each('.rg-roster', rosterApply, board);
    if (art) shown = art.querySelector('.rg-ch:not([hidden]), .rg-rw:not([hidden]), .rg-pv, .rg-topv') ? 1 : 0;
    $('rg-none').hidden = TAB !== 'board' || !!shown;
    tog(root, 'rg-filtering', on || !!campOn);
  }
  function setFilter(f) {
    filt = f;
    each('.rg-f', function (x) { var on = x.getAttribute('data-f') === f; tog(x, 'is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    each('.rg-cn', function (x) { var on = x.getAttribute('data-f') === f; tog(x, 'is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    applyFilter();
  }
  each('.rg-f', function (b) { b.addEventListener('click', function () { setFilter(b.getAttribute('data-f')); }); });
  // the three big counts are the same filters: a tap lights them and brings the board up to where they can be seen
  each('.rg-cn', function (b) { b.addEventListener('click', function () { var f = b.getAttribute('data-f'); setFilter(filt === f ? 'all' : f); toStage(); }); });

  /* ---------------------------------------------------------------- colour by faction */
  var lensBtn = $('rg-lens'), campW = $('rg-campw'), campKey = $('rg-campkey'), cbar = $('rg-cbar');
  var CAMPK = Object.keys(X.camps).filter(function (k) { return P.some(function (p) { return p.c === k || p.c2 === k; }); });
  var chipN = {};
  CAMPK.forEach(function (k) {
    var b = el('button', 'rg-ck'); b.type = 'button'; b.setAttribute('data-c', k); b.setAttribute('aria-pressed', 'false'); b.style.setProperty('--cc', X.camps[k].c);
    b.appendChild(el('i')); b.appendChild(el('span', null, X.camps[k].n)); chipN[k] = el('b', 'num'); b.appendChild(chipN[k]);
    b.title = X.camps[k].w;
    b.addEventListener('click', function () { setCamp(campOn === k ? '' : k); });
    campKey.appendChild(b);
  });
  var campLine = el('p', 'rg-cw'); campW.insertBefore(campLine, cbar);
  function setCamp(k) {
    campOn = k;
    each('.rg-ck', function (x) { var on = x.getAttribute('data-c') === k; tog(x, 'is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); }, campKey);
    campLine.textContent = k ? X.camps[k].w : w.lens_hint;
    tog(campW, 'has-c', !!k);
    applyFilter();
  }
  function setLens(on) {
    tog(root, 'is-lens', on);
    lensBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    campW.hidden = !on;
    if (!on && campOn) setCamp('');
    sset('rg-lens', on ? '1' : '0');
  }
  lensBtn.addEventListener('click', function () { setLens(!root.classList.contains('is-lens')); });
  setCamp('');
  function campBar(d) {      // each camp's share of the chairs still standing, and of those taken out, on the day
    var a = {}, k = {}, ta = 0, tk = 0;
    P.forEach(function (p) {
      var c = p.c && X.camps[p.c] ? p.c : ''; if (!c) return;
      var s = stAt(p, d);
      if (s === 'a') { a[c] = (a[c] || 0) + 1; ta++; } else if (s === 'k') { k[c] = (k[c] || 0) + 1; tk++; }
    });
    cbar.textContent = '';
    [[w.cbar_a, a, ta], [w.cbar_k, k, tk]].forEach(function (r) {
      var line = el('div', 'rg-cb'); line.appendChild(el('span', 'rg-cbl', r[0] + ' · ' + num(r[2])));
      var bar = el('span', 'rg-cbb');
      CAMPK.forEach(function (c) { if (!r[1][c]) return; var i = el('i'); i.style.width = (100 * r[1][c] / Math.max(1, r[2])) + '%'; i.style.background = X.camps[c].c; i.title = X.camps[c].n + ': ' + num(r[1][c]); bar.appendChild(i); });
      line.appendChild(bar); cbar.appendChild(line);
    });
    CAMPK.forEach(function (c) { var n = 0; P.forEach(function (p) { if ((p.c === c || p.c2 === c) && stAt(p, d) !== 'pre') n++; }); chipN[c].textContent = num(n); });
  }

  /* ---------------------------------------------------------------- find anyone */
  var qIn = $('rg-q'), ql = $('rg-ql'), qHits = [], qAt = -1;
  function fold(v) { v = String(v || ''); try { v = v.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { } return v.toLowerCase().replace(/[ً-ٟ‌]/g, '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک'); }
  var HAY = {};
  P.forEach(function (p) {
    HAY[p.id] = { n: fold(p.en + ' ' + (p.fa || '') + ' ' + (p.n || '')), r: fold((p.r || '') + ' ' + (p.st || '') + ' ' + (X.units[p.u] || '') + ' ' + (p.pv && X.pvs[p.pv] ? X.pvs[p.pv].join(' ') + ' ' + p.pv.replace(/-/g, ' ') : '') + ' ' + (p.al || []).map(function (a) { return a[1]; }).join(' ')) };
  });
  function search(q) {
    q = fold(q).trim(); if (!q) return [];
    var out = [];
    P.forEach(function (p) {
      var h = HAY[p.id], i = h.n.indexOf(q), s = -1;
      if (i === 0) s = 0; else if (i > 0 && /\s/.test(h.n[i - 1])) s = 1; else if (i > 0) s = 2; else if (h.r.indexOf(q) >= 0) s = 3;
      if (s >= 0) out.push([s + (p.t === 'm' ? .5 : 0), p]);
    });
    out.sort(function (a, b) { return a[0] - b[0] || (GONE[b[1].s] ? 1 : 0) - (GONE[a[1].s] ? 1 : 0); });
    return out.slice(0, 8).map(function (x) { return x[1]; });
  }
  function qShow() {
    var v = qIn.value; qHits = search(v); qAt = -1; ql.textContent = '';
    if (!v.trim()) { ql.hidden = true; qIn.setAttribute('aria-expanded', 'false'); return; }
    if (!qHits.length) { var e = el('li', 'rg-qn', w.find_none); e.setAttribute('role', 'presentation'); ql.appendChild(e); }
    qHits.forEach(function (p, i) {
      var li = el('li', 'rg-qo'); li.setAttribute('role', 'option'); li.id = 'rg-qo-' + i; li.setAttribute('aria-selected', 'false');
      var b = row(p, (p.r || '') + (X.bn[branchOf(p)] ? ' · ' + X.bn[branchOf(p)] : ''));
      b.removeAttribute('data-id'); b.setAttribute('data-q', p.id); b.tabIndex = -1;
      b.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
      b.addEventListener('click', function () { qPick(p.id); });
      li.appendChild(b); ql.appendChild(li);
    });
    ql.hidden = false; qIn.setAttribute('aria-expanded', 'true');
  }
  function qMove(k) {
    if (!qHits.length) return;
    qAt = (qAt + k + qHits.length) % qHits.length;
    each('.rg-qo', function (li, i) { li.setAttribute('aria-selected', i === qAt ? 'true' : 'false'); tog(li, 'is-at', i === qAt); }, ql);
    qIn.setAttribute('aria-activedescendant', 'rg-qo-' + qAt);
  }
  function qClose() { ql.hidden = true; qIn.setAttribute('aria-expanded', 'false'); qIn.removeAttribute('aria-activedescendant'); }
  function qPick(id) { qIn.value = ''; qClose(); qIn.blur(); track('rg_find', {}); reveal(id); }
  qIn.addEventListener('input', qShow);
  qIn.addEventListener('focus', function () { if (qIn.value.trim()) qShow(); });
  qIn.addEventListener('blur', function () { setTimeout(qClose, 150); });
  qIn.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); qMove(1); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); qMove(-1); }
    else if (ev.key === 'Enter') { ev.preventDefault(); var p = qHits[qAt < 0 ? 0 : qAt]; if (p) qPick(p.id); }
    else if (ev.key === 'Escape') { qIn.value = ''; qClose(); }
  });

  /* ---------------------------------------------------------------- the rosters of the big bodies */
  function rosterTools(rs) {
    var box = rs.querySelector('.rg-rs-tools'); if (!box || box.getAttribute('data-on')) return;
    box.setAttribute('data-on', '1'); box.hidden = false;
    var inp = el('input', 'rg-find rg-rs-q'); inp.type = 'search'; inp.placeholder = w.roster_q; inp.setAttribute('aria-label', w.roster_q); inp.dir = 'auto'; inp.autocomplete = 'off';
    box.appendChild(inp);
    var ids = [].map.call(rs.querySelectorAll('.rg-rw'), function (r) { return BY[r.getAttribute('data-id')]; }).filter(Boolean);
    var cs = el('div', 'rg-camps rg-rs-c scroll');
    CAMPK.forEach(function (k) {
      var n = ids.filter(function (p) { return p.c === k || p.c2 === k; }).length; if (!n) return;
      var b = el('button', 'rg-ck'); b.type = 'button'; b.setAttribute('data-c', k); b.setAttribute('aria-pressed', 'false'); b.style.setProperty('--cc', X.camps[k].c);
      b.appendChild(el('i')); b.appendChild(el('span', null, X.camps[k].n)); b.appendChild(el('b', 'num', num(n)));
      b.addEventListener('click', function () {
        var on = rs.getAttribute('data-c') === k ? '' : k; rs.setAttribute('data-c', on);
        each('.rg-ck', function (x) { var y = x.getAttribute('data-c') === on; tog(x, 'is-on', y); x.setAttribute('aria-pressed', y ? 'true' : 'false'); }, cs);
        rosterApply(rs);
      });
      cs.appendChild(b);
    });
    if (cs.childNodes.length) box.appendChild(cs);
    inp.addEventListener('input', function () { rosterApply(rs); });
  }
  function rosterReset(rs) {
    var i = rs.querySelector('.rg-rs-q'); if (i) i.value = '';
    rs.setAttribute('data-c', '');
    each('.rg-ck', function (x) { tog(x, 'is-on', false); x.setAttribute('aria-pressed', 'false'); }, rs);
    rosterApply(rs);
  }
  function rosterApply(rs) {
    var i = rs.querySelector('.rg-rs-q'), q = i ? fold(i.value).trim() : '', c = rs.getAttribute('data-c') || '', on = filt !== 'all', any = 0;
    each('.rg-rw', function (r) {
      var p = BY[r.getAttribute('data-id')]; if (!p) return;
      var ok = (!q || (HAY[p.id].n + ' ' + HAY[p.id].r).indexOf(q) >= 0) && (!c || p.c === c || p.c2 === c) && !(on && stAt(p, cur) !== FST[filt]);
      r.parentNode.hidden = !ok; r.hidden = !ok; if (ok) any++;
    }, rs);
    each('.rg-rg', function (g) {
      var n = g.querySelectorAll('.rg-rw:not([hidden])').length, b = g.querySelector('summary b');
      g.hidden = !n; if (b) b.textContent = num(n);
      if (q || c || on) g.open = n > 0 && (q || c || n <= 12) ? true : g.open;
    }, rs);
    var none = rs.querySelector('.rg-rs-none'); if (none) none.hidden = !!any;
  }
  each('.rg-roster', function (rs) { rs.addEventListener('toggle', function () { if (rs.open) rosterTools(rs); }); }, board);
  function openRoster(b, pv) {
    walk(b, { scroll: false });
    var rs = root.querySelector('#rg-rs-' + b); if (!rs) return;
    rs.open = true; rosterTools(rs); rosterReset(rs);
    var g = pv && root.querySelector('#rg-rs-' + b + '-' + pv);
    if (g) g.open = true;
    setTimeout(function () { into(g || rs); }, 30);
  }

  /* ---------------------------------------------------------------- the provinces */
  var pvArt = root.querySelector('.rg-br[data-b="provinces"]');
  var PVFALL = {};      // province -> the falls tied to it: [date, was its corps commander]
  P.forEach(function (p) { if (p.pv && p.s === 'killed' && p.d) (PVFALL[p.pv] = PVFALL[p.pv] || []).push([p.d, p.u === 'irgc-prov']); });
  function pvLevel(k, d) { var n = 0, c = false; (PVFALL[k] || []).forEach(function (f) { if (f[0] <= d) { n++; if (f[1]) c = true; } }); return c ? 'k' : String(Math.min(3, n)); }
  function pvFill(a) {      // its members of the Assembly of Experts and of Parliament, drawn the first time the province opens
    each('.rg-pvx', function (x) {
      if (x.getAttribute('data-on')) return; x.setAttribute('data-on', '1');
      var ul = el('ul', 'rg-rows'); ul.setAttribute('data-seq', '1');
      (x.getAttribute('data-ids') || '').split(' ').forEach(function (id) { var p = BY[id]; if (!p) return; var li = el('li'); li.appendChild(row(p)); ul.appendChild(li); });
      x.insertBefore(ul, x.querySelector('.rg-pvsee'));
    }, a);
    collect(); applyTime(cur, true); applyFilter(); paintSeen();
  }
  function pvPick(k, o) {
    o = o || {};
    if (!pvArt) return;
    if (k && !X.pvs[k]) k = '';
    PV = k;
    each('.rg-pv', function (a) { var on = a.getAttribute('data-pv') === k; tog(a, 'is-on', on); if (on) pvFill(a); }, pvArt);
    each('.rg-pvp', function (p) { tog(p, 'is-sel', p.getAttribute('data-pv') === k); }, pvArt);
    each('.rg-pvb', function (b) { var on = b.getAttribute('data-pv') === k; tog(b, 'is-on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }, pvArt);
    tog(pvArt, 'has-pv', !!k);
    if (LEVEL === 'provinces') crumbs();
    if (!o.quiet) {
      var u = url(); if (u) { if (k) u.searchParams.set('pv', k); else u.searchParams.delete('pv'); setUrl(u, false); }
      var a = k && pvArt.querySelector('.rg-pv.is-on');
      if (a && o.scroll !== false) { var r = a.getBoundingClientRect(); if (r.top > (W.innerHeight || 700) * .7 || r.top < 0) into(a.querySelector('.rg-pvh') || a); }
    }
  }
  if (pvArt) {
    pvArt.addEventListener('click', function (ev) {
      var t = ev.target.closest && ev.target.closest('.rg-pvp, .rg-pvb');
      if (!t) return;
      ev.preventDefault(); pvPick(PV === t.getAttribute('data-pv') && t.classList.contains('rg-pvp') ? '' : t.getAttribute('data-pv'));
    });
  }

  /* ---------------------------------------------------------------- the timeline, docked at the foot of the stage */
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
  // the damage meters: a tile's and a branch's "9 of 15 taken out", read again on every day of the timeline
  var METERS = [];
  each('[data-mt]', function (m) {
    var host = m.closest('[data-b]'), b = host && host.getAttribute('data-b');
    if (b && X.bids[b]) METERS.push({ bar: m.querySelector('.rg-mtb i'), t: m.querySelector('.rg-mtt'), ids: X.bids[b] });
  });
  function meters(d) {
    METERS.forEach(function (m) {
      var k = 0; m.ids.forEach(function (i) { var p = BY[i]; if (p && p.s === 'killed' && p.d && p.d <= d) k++; });
      if (m.bar) m.bar.style.width = Math.round(100 * k / Math.max(1, m.ids.length)) + '%';
      if (m.t) m.t.textContent = w.meter.replace('{k}', num(k)).replace('{n}', num(m.ids.length));
    });
  }
  function shareBar(c) {      // the bar under the three numbers: how much of the board is gone on the day (regime.py share_bar)
    var bar = root.querySelector('.rg-share'), l = $('rg-share-l');
    if (!bar) return;
    var tot = Math.max(1, c.k + c.a + c.u), pk = Math.round(100 * c.k / tot), pu = Math.round(100 * c.u / tot);
    bar.style.setProperty('--k', pk + '%'); bar.style.setProperty('--u', pu + '%');
    var b = l && l.querySelector('b'); if (b) b.textContent = num(pk) + (FA ? '٪' : '%');
  }
  function applyTime(d, quiet) {
    cur = d;
    var atEnd = d >= X.today;
    NODES.forEach(function (t) {
      var p = BY[t.getAttribute('data-id')]; if (!p) return;
      var s = stAt(p, d);
      tog(t, 'is-down', s === 'k' || s === 'g');
      tog(t, 'is-up', !atEnd && s === 'a');
      tog(t, 'is-pre', s === 'pre');
    });
    var c = tally(d);
    $('rg-ck').textContent = num(c.k); $('rg-ca').textContent = num(c.a); $('rg-cu').textContent = num(c.u);
    shareBar(c);
    each('.rg-f [data-n]', function (b) { var k = b.getAttribute('data-n'); b.textContent = num(k === 'all' ? c.all : c[FST[k]]); });
    $('rg-date').textContent = atEnd ? w.today + ' · ' + say(d) : say(d);
    var wr = atEnd ? null : warOn(d), wn = $('rg-warnow');
    if (wn) { wn.hidden = !wr; wn.textContent = wr ? wr.n : ''; }
    warBtns.forEach(function (x) { var g = x.g, on = !atEnd && (g.a ? (d >= g.a && d <= g.b) : d <= g.b); tog(x.b, 'is-on', on); x.b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (warBtns.today) tog(warBtns.today, 'is-on', atEnd);
    tog(root, 'is-past', !atEnd);
    meters(d);
    if (ORGBUILT) orgLeft(d);
    if (pvArt) each('.rg-pvp', function (p) { var v = pvLevel(p.getAttribute('data-pv'), d); if (p.getAttribute('data-lv') !== v) p.setAttribute('data-lv', v); }, pvArt);
    if (root.classList.contains('is-lens')) campBar(d); else campDirty = true;
    if (daysBuilt) each('.rg-dd', function (g) { tog(g, 'is-future', g.getAttribute('data-d') > d); }, daysEl);
    if (filt !== 'all') applyFilter();      // who counts as taken out or in place depends on the day
    if (!quiet) event(d);
  }
  var campDirty = true;
  lensBtn.addEventListener('click', function () { if (campDirty) { campBar(cur); campDirty = false; } });
  function event(d) {      // in the dock: the last day of falls on or before the day the timeline is on
    var last = null;
    for (var i = dayList.length - 1; i >= 0; i--) { if (dayList[i] <= d) { last = dayList[i]; break; } }
    var ev = $('rg-ev'); ev.textContent = '';
    if (!last || d >= X.today) return;
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

  /* ---------------------------------------------------------------- day by day */
  var daysBuilt = false;
  function buildDays() {
    if (daysBuilt) return; daysBuilt = true;
    var fallen = P.filter(function (p) { return GONE[p.s] && p.d; }).sort(function (a, b) { return a.d.localeCompare(b.d) || a.n.localeCompare(b.n); });
    var box = null, key = null;
    fallen.forEach(function (p) {
      var g = warOf(p.d), k = g ? g.id : 'gap-' + p.d.slice(0, 7);
      if (k !== key) {
        key = k; box = el('div', 'rg-dw');
        var h = el('h3', 'rg-dwh', g ? g.n : sayMonth(p.d)); if (g && g.k) h.appendChild(el('span', 'num', w.killed_n.replace('{k}', num(g.k))));
        box.appendChild(h); box._day = null; daysEl.appendChild(box);
      }
      if (box._day !== p.d) {
        box._day = p.d;
        var dd = el('div', 'rg-dd'); dd.setAttribute('data-d', p.d);
        var dh = el('p', 'rg-ddh'); dh.appendChild(el('b', 'num', say(p.d))); var o = opOn(p.d); if (o) dh.appendChild(el('span', 'rg-op', o.n)); dd.appendChild(dh);
        box._ul = el('ul', 'rg-rows rg-ddl'); box._ul.setAttribute('data-seq', '1'); dd.appendChild(box._ul); box.appendChild(dd);
      }
      var li = el('li'); li.appendChild(row(p, (p.r || '') + (X.bn[branchOf(p)] ? ' · ' + X.bn[branchOf(p)] : ''))); box._ul.appendChild(li);
    });
    collect(); applyTime(cur, true); applyFilter(); paintSeen();
  }
  var tabs = $('rg-tabs');
  function setTab(v, quiet) {
    TAB = v === 'days' ? 'days' : (v === 'key' && keyEl) ? 'key' : v === 'board' ? 'board' : (v === 'quiz' && quizEl) ? 'quiz' : 'chart';
    if (TAB !== 'chart' && FS) fsToggle();
    if (quizEl) { quizEl.hidden = TAB !== 'quiz'; if (TAB === 'quiz') quizStart(false); }
    each('.rg-tab', function (b) { var on = b.getAttribute('data-v') === TAB; tog(b, 'is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); }, tabs);
    if (TAB === 'days') buildDays();
    board.hidden = TAB !== 'board'; crumb.hidden = TAB !== 'board'; daysEl.hidden = TAB !== 'days';
    if (keyEl) keyEl.hidden = TAB !== 'key';
    orgEl.hidden = TAB !== 'chart';
    if (TAB === 'chart') orgShow();
    tog(root, 'rg-on-key', TAB === 'key');
    applyFilter();
    if (!quiet) {
      track('rg_tab', { v: TAB });
      var u = url();
      if (u) {
        if (TAB === 'chart') u.searchParams.delete('v'); else u.searchParams.set('v', TAB);
        u.searchParams.delete('view'); setUrl(u, false);
      }
    }
  }
  each('.rg-tab', function (b) { b.addEventListener('click', function () { setTab(b.getAttribute('data-v')); }); }, tabs);

  /* ---------------------------------------------------------------- dossiers opened (this reader's own, in this browser) */
  var SEEN = {};
  try { (JSON.parse(sget('rg-seen') || '[]') || []).forEach(function (i) { if (BY[i]) SEEN[i] = 1; }); } catch (e) { }
  var seenEl = $('rg-seen');
  function paintSeen() {
    var k = Object.keys(SEEN).length;
    seenEl.textContent = w.seen_n.replace('{k}', num(k)).replace('{n}', num(P.length));
    seenEl.hidden = !k;
    NODES.forEach(function (n) { tog(n, 'is-seen', !!SEEN[n.getAttribute('data-id')]); });
  }
  function see(id) { if (SEEN[id]) return; SEEN[id] = 1; sset('rg-seen', JSON.stringify(Object.keys(SEEN))); paintSeen(); }

  /* ---------------------------------------------------------------- the card */
  var sheet = $('rg-sheet'), inner = $('rg-sh-in'), opener = null, SEQ = [], openId = null;
  var WIDE = W.matchMedia ? W.matchMedia('(min-width: 1100px)') : { matches: false };
  function link(u) { var a = el('a', null, u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]); a.href = u; a.target = '_blank'; a.rel = 'noopener'; return a; }
  function chairOf(p) { for (var i = 0; i < X.chairs.length; i++) if (X.chairs[i].indexOf(p.id) >= 0) return X.chairs[i].map(function (j) { return BY[j]; }).filter(Boolean); return [p]; }
  function seqFrom(from, id) {      // Previous and Next walk the people of the part the card was opened from
    var box = from && from.closest ? from.closest('[data-seq]') : null, ids = [];
    if (box) [].forEach.call(box.querySelectorAll('[data-id]'), function (n) { var i = n.getAttribute('data-id'); if (ids.indexOf(i) < 0 && !n.closest('[hidden]')) ids.push(i); });
    if (ids.indexOf(id) < 0) { var p = BY[id], b = p && branchOf(p); ids = (b && X.bids[b] ? X.bids[b] : []).filter(function (i) { return BY[i] && BY[i].t !== 'm'; }); if (ids.indexOf(id) < 0) ids = [id]; }
    return ids;
  }
  function chip(label, o) {
    var b = mark(el('button', 'rg-sh-cp'), o); b.type = 'button';
    b.appendChild(face(o)); var s = el('span'); if (label) s.appendChild(el('small', null, label)); s.appendChild(el('b', null, o.n)); s.appendChild(el('small', null, stLine(o))); b.appendChild(s);
    b.addEventListener('click', function () { if (BY[o.id]) open(o.id, null, true); });
    return b;
  }
  function open(id, from, keepSeq, popped) {
    var p = BY[id]; if (!p) return;
    var was = !sheet.hidden;
    if (!keepSeq) { opener = from || D.activeElement; SEQ = seqFrom(from, id); }
    else if (SEQ.indexOf(id) < 0) SEQ = [id];
    openId = id;
    inner.textContent = '';
    var nav = el('div', 'rg-sh-nav'), at = SEQ.indexOf(id);
    function navBtn(k, label, cls) {
      var b = el('button', 'rg-sh-nb ' + cls); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label;
      b.disabled = SEQ.length < 2; b.addEventListener('click', function () { step(k); }); return b;
    }
    nav.appendChild(navBtn(-1, w.prev, 'is-prev'));
    nav.appendChild(el('span', 'rg-sh-at num', SEQ.length > 1 ? w.n_of.replace('{i}', num(at + 1)).replace('{n}', num(SEQ.length)) : ''));
    nav.appendChild(navBtn(1, w.next, 'is-next'));
    var x = el('button', 'rg-sh-x'); x.type = 'button'; x.setAttribute('aria-label', w.close); x.title = w.close; x.textContent = '×'; x.addEventListener('click', close);
    nav.appendChild(x);
    inner.appendChild(nav);
    var top = mark(el('div', 'rg-sh-top'), p);
    top.appendChild(face(p));
    var t = el('div', 'rg-sh-t');
    var h = el('h2', null, p.n); h.id = 'rg-sh-n'; t.appendChild(h);
    if (FA && p.en) { var a1 = el('p', 'rg-sh-alt', p.en); a1.lang = 'en'; a1.dir = 'ltr'; t.appendChild(a1); }
    else if (!FA && p.fa) { var f = el('p', 'rg-sh-alt', p.fa); f.lang = 'fa'; f.dir = 'rtl'; t.appendChild(f); }
    t.appendChild(el('p', 'rg-pill is-' + (p.s || 'alive'), stLine(p)));
    if (p.k) { var kp = el('p', 'rg-sh-key'); var ks = el('i', 'rg-kstar'); ks.setAttribute('aria-hidden', 'true'); kp.appendChild(ks); kp.appendChild(D.createTextNode(w.key_rank.replace('{k}', num(p.k)).replace('{n}', num(NKEY)))); t.appendChild(kp); }
    top.appendChild(t); inner.appendChild(top);
    if (p.kw) inner.appendChild(el('p', 'rg-sh-kw', p.kw));
    if (p.sn) inner.appendChild(el('p', 'rg-sh-sn', p.sn));
    var facts = el('dl', 'rg-sh-f');
    function fact(k, v) { if (!v) return; facts.appendChild(el('dt', null, k)); facts.appendChild(el('dd', null, v)); }
    if (GONE[p.s] || p.s === 'wounded') { fact(w.by, p.by); fact(w.op, p.op); fact(w.where, p.pl); }
    fact(w.sanct, p.sa);
    if (facts.childNodes.length) inner.appendChild(facts);
    // the seats: the role that places them, and every other body they sit on
    var seats = el('ul', 'rg-sh-seats');
    var s0 = el('li'); s0.appendChild(el('b', null, p.r || '')); var u0 = [X.units[p.u], p.st, p.pv && X.pvs[p.pv] ? X.pvs[p.pv][0] : ''].filter(function (v, i, a) { return v && a.indexOf(v) === i; }).join(' · ');
    if (u0) s0.appendChild(el('span', null, u0)); seats.appendChild(s0);
    inner.appendChild(seats);
    if (p.al && p.al.length) {      // one person, many seats: every other body they sit on
      inner.appendChild(el('h3', null, w.seats_h));
      var also = el('ul', 'rg-sh-seats');
      p.al.forEach(function (a) { var li = el('li', 'is-also'); li.appendChild(el('b', null, a[1] || '')); li.appendChild(el('span', null, X.units[a[0]] || '')); also.appendChild(li); });
      inner.appendChild(also);
    }
    if (p.c && X.camps[p.c]) {
      var cb = el('div', 'rg-sh-c'); cb.style.setProperty('--cc', X.camps[p.c].c);
      var ct = el('p', 'rg-sh-ct'); ct.appendChild(el('span', 'rg-sh-k', w.camp)); ct.appendChild(el('b', null, X.camps[p.c].n + (p.c2 && X.camps[p.c2] ? ' · ' + X.camps[p.c2].n : '')));
      if (p.cs && X.sure[p.cs]) ct.appendChild(el('span', 'rg-sure', X.sure[p.cs]));
      cb.appendChild(ct);
      if (p.cw) cb.appendChild(el('p', null, p.cw));
      cb.appendChild(el('p', 'rg-dim', X.camps[p.c].w));
      inner.appendChild(cb);
    }
    var line = chairOf(p);
    if (line.length > 1) {      // the chair: everyone who sat in it, an arrow between each, this person lit
      inner.appendChild(el('h3', null, w.chair_h));
      var lr = el('div', 'rg-sh-line scroll');
      line.forEach(function (o, i) {
        if (i) { var ar = el('i', 'rg-arrow'); ar.setAttribute('aria-hidden', 'true'); lr.appendChild(ar); }
        var c = chip(null, o); if (o === p) { c.classList.add('is-me'); c.setAttribute('aria-current', 'true'); } lr.appendChild(c);
      });
      inner.appendChild(lr);
    } else {      // a link that is not the same post (the person took over from someone in another chair)
      var before = p.rep && BY[p.rep], after = P.filter(function (o) { return o.rep === p.id; });
      if (before || after.length) {
        var ch = el('div', 'rg-sh-ch');
        if (before) ch.appendChild(chip(w.replaces, before));
        after.forEach(function (o) { ch.appendChild(chip(w.replaced, o)); });
        inner.appendChild(ch);
      }
    }
    if (p.b) { inner.appendChild(el('h3', null, w.bio)); inner.appendChild(el('p', null, p.b)); }
    if (p.past && p.past.length) { inner.appendChild(el('h3', null, w.past)); var ul = el('ul', 'rg-sh-past'); p.past.forEach(function (v) { ul.appendChild(el('li', null, v)); }); inner.appendChild(ul); }
    if (p.src && p.src.length) { var s = el('p', 'rg-sh-src'); s.appendChild(el('span', 'rg-sh-k', w.sources)); p.src.slice(0, 8).forEach(function (i) { var u = (X.src || [])[i]; if (u) s.appendChild(link(u)); }); inner.appendChild(s); }
    if (p.ao) inner.appendChild(el('p', 'rg-sh-ao' + (p.au ? ' is-un' : ''), (p.au ? w.as_of_un : w.as_of).replace('{d}', p.ao)));
    if (p.cr) inner.appendChild(el('p', 'rg-sh-cr', '📷 ' + p.cr));
    if (D.documentElement.classList.contains('modes-on')) {      // a correction goes to the page's discussion, which the recheck reads (LIVING.md)
      var fx = el('a', 'rg-sh-fix', w.fix_this); fx.href = '#discussion';
      fx.addEventListener('click', function () { track('rg_fix', { unit: p.u || '' }); shut(); });
      inner.appendChild(fx);
    }
    var sh = el('button', 'btn btn-line rg-sh-share', w.share_p); sh.type = 'button';
    var canon = root.getAttribute('data-canon') || (W.location.origin + W.location.pathname);
    sh.setAttribute('data-share', ''); sh.setAttribute('data-url', canon + '?p=' + encodeURIComponent(p.id));
    sh.setAttribute('data-title', p.n + (p.r ? ' · ' + p.r : '')); sh.setAttribute('data-text', stLine(p) + ' · ' + w.tabs);
    var acts = el('div', 'rg-sh-acts');
    var wb = el('button', 'btn btn-line rg-sh-watch rg-wb'); wb.type = 'button'; wb.setAttribute('data-w', p.id); wbPaint(wb, p.id);
    acts.appendChild(wb); acts.appendChild(sh); inner.appendChild(acts);
    personCalls(p);      // Make your call, Liberty Politics only: the betting markets that name this person (below)
    sheet.hidden = false;
    side();
    inner.scrollTop = 0;
    try { x.focus({ preventScroll: true }); } catch (e) { x.focus(); }
    // a card is a step in the history: a phone's Back closes it and leaves the reader where they were
    var u = url(); if (u) { u.searchParams.set('p', id); setUrl(u, !was && !popped, { rgb: LEVEL, rgp: id }); }
    collect(); applyTime(cur, true); applyFilter();
    see(id); if (!was) track('rg_card', { view: TAB, key: p.k ? 1 : 0 });
  }
  function step(k) { if (SEQ.length < 2) return; var i = SEQ.indexOf(openId); open(SEQ[(i + k + SEQ.length) % SEQ.length], null, true); }
  function side() {      // a sheet from the bottom on a phone (the page held still), a panel at the side on a computer (the board stays live)
    var wide = !!WIDE.matches;
    tog(sheet, 'is-side', wide);
    sheet.setAttribute('aria-modal', wide ? 'false' : 'true');
    tog(D.documentElement, 'rg-lock', !sheet.hidden && !wide);
  }
  if (WIDE.addEventListener) WIDE.addEventListener('change', function () { if (!sheet.hidden) side(); });
  // Make your call (build/calls.js, ../CALLS.md): on Liberty Politics only (calls.js is never on an Iran Uncensored page,
  // so W.LPCalls is the switch), the sheet of a person a betting market names carries that market, to call it right there.
  // One mount, moved into each sheet as it opens; it stays hidden for a person no market names.
  var callsEl = null, callsFor = null, callsWait = false;
  function ascii(v) { v = String(v || ''); try { v = v.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { } return v.toLowerCase().replace(/[^a-z]+/g, ' ').trim(); }
  function personCalls(p) {
    var L = W.LPCalls;
    callsFor = p;
    if (!L && !callsWait) {      // a sheet opened from the address (?p=) can open before calls.js has run: try again once the page has loaded
      callsWait = true;
      W.addEventListener('load', function () { if (W.LPCalls && !sheet.hidden && callsFor) personCalls(callsFor); });
    }
    if (!L || FA || !p.en) return;
    var me = ' ' + ascii(p.en) + ' ';
    if (me.trim().split(' ').length < 2) return;
    if (!callsEl) { callsEl = el('div', 'lpc rg-sh-calls'); callsEl.setAttribute('data-lpc-tool', 'regime'); callsEl.setAttribute('data-lpc-n', '2'); }
    callsEl.setAttribute('data-lpc-h', 'Your call on ' + p.en);
    inner.appendChild(callsEl);
    L.mount(callsEl, { n: 2, filter: function (m) {
      var t = m.tools || [];
      if (t.indexOf('regime') < 0 && t.indexOf('intel') < 0) return false;
      return [m.q].concat(m.o.map(function (o) { return o[0]; })).some(function (x) { return (' ' + ascii(x) + ' ').indexOf(me) >= 0; });
    } });
  }
  function close() {
    if (W.history.state && W.history.state.rgp) { W.history.back(); return; }      // popstate below shuts it
    shut();
  }
  function shut() {
    if (sheet.hidden) return;
    sheet.hidden = true; openId = null; tog(D.documentElement, 'rg-lock', false);
    var u = url(); if (u) { u.searchParams.delete('p'); setUrl(u, false); }
    if (opener && opener.focus && D.body.contains(opener)) try { opener.focus({ preventScroll: true }); } catch (e) { }
  }
  sheet.addEventListener('click', function (ev) { if (ev.target === sheet) close(); });
  D.addEventListener('keydown', function (ev) {
    if (sheet.hidden) return;
    if (ev.key === 'Escape') close();
    else if ((ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') && !/INPUT|TEXTAREA|SELECT/.test((D.activeElement || {}).tagName || '')) {
      var k = ev.key === 'ArrowRight' ? 1 : -1; step(RTL ? -k : k);
    }
  });
  (function swipe() {      // a sideways swipe on the card: the next or the previous person
    var sx = 0, sy = 0, on = false;
    inner.addEventListener('pointerdown', function (ev) { if (ev.pointerType === 'mouse') return; on = true; sx = ev.clientX; sy = ev.clientY; });
    inner.addEventListener('pointerup', function (ev) {
      if (!on) return; on = false;
      var dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (Math.abs(dx) > 70 && Math.abs(dy) < 45) { var k = dx < 0 ? 1 : -1; step(RTL ? -k : k); }
    });
    inner.addEventListener('pointercancel', function () { on = false; });
  })();
  // any face anywhere on the board (a chair, a predecessor, a roster row, a province, the days) opens its card
  root.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('button[data-id]');
    if (!t || !root.contains(t) || sheet.contains(t)) return;
    open(t.getAttribute('data-id'), t);
  });

  /* ---------------------------------------------------------------- the reader's own watchlist (this browser only) */
  var WATCH = [];
  try { WATCH = (JSON.parse(sget('rg-watch') || '[]') || []).filter(function (i, j, a) { return BY[i] && a.indexOf(i) === j; }); } catch (e) { WATCH = []; }
  var wl = $('rg-wl'), wll = $('rg-wll'), wls = $('rg-wl-s');
  function watched(id) { return WATCH.indexOf(id) >= 0; }
  function wbPaint(b, id) {
    var on = watched(id), p = BY[id], lab = (on ? w.watch_rm : w.watch_add).replace('{n}', p ? p.n : '');
    tog(b, 'is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', lab); b.title = lab;
    if (b.classList.contains('rg-sh-watch')) b.textContent = on ? w.watch_on : w.watch_btn;
  }
  function paintWatch() {
    each('.rg-wb[data-w]', function (b) { b.hidden = false; wbPaint(b, b.getAttribute('data-w')); });
    if (!wl) return;
    wll.textContent = '';
    WATCH.forEach(function (id) {
      var p = BY[id]; if (!p) return;
      var li = el('li', 'rg-wli'); li.appendChild(row(p, p.r));
      var x = el('button', 'rg-wb'); x.type = 'button'; x.setAttribute('data-w', id); wbPaint(x, id); li.appendChild(x);
      wll.appendChild(li);
    });
    wl.hidden = false;
    tog(wl, 'is-empty', !WATCH.length);
    wls.textContent = WATCH.length ? w.watch_n.replace('{n}', num(WATCH.length)) : w.watch_tip;
    collect(); applyTime(cur, true); applyFilter(); paintSeen();
  }
  function setWatch(id, on) {
    var i = WATCH.indexOf(id);
    if (on && i < 0) WATCH.push(id); else if (!on && i >= 0) WATCH.splice(i, 1); else return;
    sset('rg-watch', JSON.stringify(WATCH));
    paintWatch();
  }
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.rg-wb[data-w]');
    if (!b || !root.contains(b)) return;
    ev.preventDefault();
    var id = b.getAttribute('data-w');
    setWatch(id, !watched(id));
    if (D.activeElement !== b && D.body.contains(b)) try { b.focus({ preventScroll: true }); } catch (e) { }
  });
  if (keyEl) {
    var kall = keyEl.querySelector('.rg-kall');
    if (kall) { kall.hidden = false; kall.addEventListener('click', function () { setTab('board'); walk(''); toStage(); }); }
  }

  /* ---------------------------------------------------------------- a picture to post (build/shareimg.js) */
  function shown() {      // the faces the reader is looking at: this level's, or the falls of Day by day, as the filters leave them
    var box = TAB === 'days' ? daysEl : TAB === 'key' ? keyEl : LEVEL ? root.querySelector('.rg-br.is-on') : $('rg-l0'), ids = [];
    if (box) [].forEach.call(box.querySelectorAll('[data-id]'), function (n) {
      var i = n.getAttribute('data-id'); if (ids.indexOf(i) >= 0 || n.closest('[hidden]') || n.classList.contains('is-dim') || n.classList.contains('is-fade')) return;
      if (n.closest('.rg-roster') && !n.closest('.rg-roster').open) return;
      ids.push(i);
    });
    return ids.slice(0, 180);
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
      var red = (kit.c && kit.c.red) || '#E5484D', lens = root.classList.contains('is-lens');
      return Promise.all(ids.map(function (id) { var p = BY[id]; return p.img && kit.img ? kit.img(X.root + 'assets/regime/' + p.img) : Promise.resolve(null); })).then(function (imgs) {
        ids.forEach(function (id, i) {
          var p = BY[id], img = imgs[i], col = i % best.cols, row_ = Math.floor(i / best.cols);
          if (RTL) col = best.cols - 1 - col;
          var cx = ox + col * cell + cell / 2, cy = oy + row_ * cell + cell / 2;
          var st = stAt(p, cur), down = st === 'k' || st === 'g', pre = st === 'pre';
          ctx.save();
          if (pre) ctx.globalAlpha = .25;
          ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.closePath(); ctx.save(); ctx.clip();
          if (img && img.naturalWidth) {
            var iw = img.naturalWidth, ih = img.naturalHeight, side_ = Math.min(iw, ih);
            ctx.drawImage(img, (iw - side_) / 2, (ih - side_) * .22, side_, side_, cx - rad, cy - rad, rad * 2, rad * 2);
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
          ctx.lineWidth = Math.max(1.5, rad * .07); ctx.strokeStyle = down ? red : ((lens && p.c && X.camps[p.c] && X.camps[p.c].c) || (kit.c && kit.c.line) || '#444'); ctx.stroke();
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
  var shotB = $('rg-shot'); if (shotB) shotB.addEventListener('click', function () { if (W.LPShot && typeof W.LPShot.open === 'function') W.LPShot.open('regime', shotB); });
  (function wait(n) { if (!shotReady() && n < 40) setTimeout(function () { wait(n + 1); }, 500); })(0);


  /* ---------------------------------------------------------------- EVERYONE: the whole regime as one chart to zoom
     3 Nov 2026, Armin: "Default = EVERYONE: one zoomable, pannable org chart (pinch and wheel zoom, drag to pan, smooth on
     phone) with a size picker". The boxes come from regime.py org() (ORG): the Office of the Supreme Leader on top, the
     armed forces, the state, then the clerics, the money, the media and the bomb; inside each branch its parts, each part's
     people in power order. One plane of ordinary buttons moved by one CSS transform: a gesture only rewrites that
     transform (one frame each), the pictures load only for faces on screen once they are big enough to see, and far out
     the names fold away so 700 faces stay a light mosaic of who is in place (pale) and who was taken out (red). */
  var orgEl = $('rg-org'), ov = $('rg-ov'), op = $('rg-op'), szEl = $('rg-sz');
  var SIZES = X.sizes || [P.length], SIZE = SIZES[SIZES.length - 1], ORGBUILT = false, POS = [], LEFTS = [];
  var Z = { s: 1, x: 0, y: 0, fit: 1, w: 1, h: 1 };
  // THE BRANCH CHIPS (4 Nov 2026): draw only one group of branches (regime.py GROUPS), the Supreme Leader's office on top; ?g=
  var GRP = 'all', grpEl = $('rg-grp');
  function grpFrom(u) { var g = u ? u.searchParams.get('g') : ''; return g && X.groups && X.groups[g] ? g : 'all'; }
  function grpPaint() { if (grpEl) each('.rg-gb', function (b) { var on = b.getAttribute('data-g') === GRP; tog(b, 'is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }, grpEl); }
  if (grpEl) each('.rg-gb', function (b) { b.addEventListener('click', function () {
    var g = b.getAttribute('data-g'); if (g === GRP) return;
    GRP = g; grpPaint(); orgDraw(false); fit(true); track('rg_branch', { g: g });
    var u = url(); if (u) { if (g === 'all') u.searchParams.delete('g'); else u.searchParams.set('g', g); setUrl(u, false); }
  }); }, grpEl);
  function sizeFrom(u) { var n = u ? parseInt(u.searchParams.get('n'), 10) : 0; return SIZES.indexOf(n) >= 0 ? n : SIZES[SIZES.length - 1]; }
  function inSize(p) { return !p.w || p.w <= SIZE; }
  function sizeButtons() {
    szEl.textContent = '';
    SIZES.forEach(function (n, i) {
      var all = i === SIZES.length - 1, b = el('button', 'rg-szb' + (n === SIZE ? ' is-on' : ''), (all ? w.sz_all : w.sz_top).replace('{n}', num(n)));
      b.type = 'button'; b.setAttribute('aria-pressed', n === SIZE ? 'true' : 'false');
      b.addEventListener('click', function () { if (n !== SIZE) { SIZE = n; orgDraw(true); var u = url(); if (u) { if (all) u.searchParams.delete('n'); else u.searchParams.set('n', n); setUrl(u, false); } } });
      szEl.appendChild(b);
    });
    var note = $('rg-onote'); if (note) note.textContent = (SIZE === SIZES[SIZES.length - 1] ? w.all_note : w.sz_note).replace('{n}', num(SIZE));
  }
  function onode(p, seat) {
    var b = mark(el('button', 'rg-on' + (p.k === 1 ? ' is-sl' : '') + (seat ? ' is-al' : '')), p); b.type = 'button';
    b.appendChild(face(p, true));
    var t = el('span', 'rg-ont'); t.appendChild(el('b', null, p.n));
    t.appendChild(el('span', 'rg-onr', seat || (p.r || '').replace(/\s*\([^)]*\)/g, '').split(/;/)[0]));
    b.appendChild(t);
    return b;
  }
  function orgDraw(refit) {
    op.textContent = ''; POS = []; LEFTS = [];
    var count = 0;
    (X.org || []).forEach(function (band) {
      var bd = el('div', 'rg-oband is-' + band.k);
      if (band.n) bd.appendChild(el('p', 'rg-obl', band.n));
      var row_ = el('div', 'rg-obr'); bd.appendChild(row_);
      band.br.forEach(function (br) {
        if (GRP !== 'all' && br.b !== 'leader' && (X.groups[GRP] || []).indexOf(br.b) < 0) return;
        var box = el('section', 'rg-obx'); box.setAttribute('data-b', br.b);
        var ids = [];
        br.parts.forEach(function (pt) {
          var ppl = pt.ids.map(function (i) { return BY[i]; }).filter(function (p) { return p && inSize(p); });
          var al = (pt.al || []).filter(function (a) { return BY[a[0]] && inSize(BY[a[0]]); });
          if (!ppl.length && !al.length) return;
          var part = el('div', 'rg-opt'), n = ppl.length + al.length;
          if (br.parts.length > 1 || X.units[pt.u] !== br.n) part.appendChild(el('h4', 'rg-oph', X.units[pt.u] || ''));
          var grid = el('div', 'rg-og'); grid.setAttribute('data-seq', '1');
          grid.style.setProperty('--cols', Math.max(1, Math.min(n, Math.ceil(Math.sqrt(n * .5)))));
          ppl.forEach(function (p) { grid.appendChild(onode(p)); ids.push(p.id); count++; });
          al.forEach(function (a) { grid.appendChild(onode(BY[a[0]], a[1] || w.also_seat)); });
          part.appendChild(grid); box.appendChild(part);
        });
        if (!box.childNodes.length) return;
        var h = el('header', 'rg-obh'), ht = el('span', 'rg-obt'); ht.appendChild(el('b', null, br.n));
        var lf = el('span', 'rg-olf'); ht.appendChild(lf); h.appendChild(ht); box.insertBefore(h, box.firstChild);
        LEFTS.push({ t: lf, ids: ids });
        row_.appendChild(box);
      });
      if (row_.childNodes.length) op.appendChild(bd);
    });
    // the plane's width: wide enough that the boxes make a shape near the screen's, never a ribbon
    var vw = ov.clientWidth || 360, vh = ov.clientHeight || 500;
    var area = count * 130 * 66 * 2.3, want = Math.sqrt(area * Math.max(.75, Math.min(1.8, vw / vh)));
    op.style.width = Math.round(Math.max(vw >= 700 ? 1500 : 980, Math.min(3400, want))) + 'px';      // a few people: the branches side by side, not a column
    sizeButtons();
    collect(); applyTime(cur, true); applyFilter(); paintSeen();
    orgLeft(cur);
    measure();
    if (refit !== false) startView();
    lod(true);
  }
  function measure() {      // every face's box in the plane's own units, once per drawing (the plane moves, its insides do not)
    var r0 = op.getBoundingClientRect(), s = Z.s || 1;
    Z.w = op.offsetWidth; Z.h = op.offsetHeight;
    POS = [].map.call(op.querySelectorAll('.rg-on'), function (n) { var r = n.getBoundingClientRect(); return { n: n, x: (r.left - r0.left) / s, y: (r.top - r0.top) / s, w: r.width / s, h: r.height / s }; });
  }
  function orgLeft(d) {      // "12 of 15 left" on every branch box, on the timeline's day
    LEFTS.forEach(function (o) {
      var a = 0, n = 0; o.ids.forEach(function (i) { var st = stAt(BY[i], d); if (st === 'pre') return; n++; if (st === 'a') a++; });
      o.t.textContent = w.left_n.replace('{a}', num(a)).replace('{n}', num(n));
      tog(o.t, 'is-low', n > 0 && a / n < .75);
    });
  }
  // ---- moving the plane
  var raf = 0;
  function paint() { raf = 0; op.style.transform = 'translate3d(' + Z.x.toFixed(1) + 'px,' + Z.y.toFixed(1) + 'px,0) scale(' + Z.s.toFixed(4) + ')'; }
  function ask() { if (!raf) raf = W.requestAnimationFrame(paint); }
  function clampZ() {
    var vw = ov.clientWidth, vh = ov.clientHeight, pw = Z.w * Z.s, ph = Z.h * Z.s, m = 48;
    Z.x = pw <= vw ? (vw - pw) / 2 : Math.min(m, Math.max(vw - pw - m, Z.x));
    Z.y = ph <= vh ? Math.min(Math.max(Z.y, 0), vh - ph) : Math.min(m, Math.max(vh - ph - m, Z.y));
  }
  function zoomAt(s, cx, cy) {      // to scale s, keeping the plane's point under (cx, cy) where it is
    s = Math.max(Z.fit * .8, Math.min(2.6, s));
    var px = (cx - Z.x) / Z.s, py = (cy - Z.y) / Z.s;
    Z.s = s; Z.x = cx - px * s; Z.y = cy - py * s; clampZ(); ask(); settle();
  }
  function fit(anim) {
    var vw = ov.clientWidth || 360, vh = ov.clientHeight || 500;
    var all = Math.min(vw / Z.w, vh / Z.h);
    Z.fit = Math.min(1, all > .22 ? all : vw / Z.w);
    to(Z.fit, (vw - Z.w * Z.fit) / 2, 8, anim);
  }
  function startView() {      // the whole chart when it can be read; on a phone, its top (the Office and the armed forces) at a size to read, the rest a drag or a pinch away
    fit(false);
    var vw = ov.clientWidth || 360, s = Math.min(.9, vw / Z.w);      // as wide as the window, read from the top down
    if (s < .24) s = .34;
    cancelAnimationFrame(tw); Z.s = s; Z.x = vw / 2 - Z.w / 2 * s; Z.y = 8; clampZ(); paint(); settle();
  }
  var tw = 0;
  function to(s, x, y, anim) {      // a short glide to a view (none with reduced motion)
    cancelAnimationFrame(tw);
    var a = { s: Z.s, x: Z.x, y: Z.y }, t0 = 0, dur = anim && !REDUCE ? 320 : 0;
    function f(t) {
      if (!t0) t0 = t;
      var k = dur ? Math.min(1, (t - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
      Z.s = a.s + (s - a.s) * e; Z.x = a.x + (x - a.x) * e; Z.y = a.y + (y - a.y) * e;
      if (k >= 1) clampZ();
      paint();
      if (k < 1) tw = W.requestAnimationFrame(f); else settle();
    }
    tw = W.requestAnimationFrame(f);
  }
  var setT = 0, LOD = '';
  function settle() { tog(op, 'is-moving', true); clearTimeout(setT); setT = setTimeout(function () { tog(op, 'is-moving', false); lod(); }, 160); }
  function lod(force) {      // far: faces as tiles; near: names, then pictures, only for what is on screen
    var s = Z.s, k = s < .3 ? 'far' : s < .55 ? 'mid' : 'near';
    if (k !== LOD || force) { tog(ov, 'z-far', k === 'far'); tog(ov, 'z-mid', k === 'mid'); LOD = k; }
    var zi = Math.max(1, Math.min(2.6, .45 / s)).toFixed(1);      // on the titles alone: a variable on the window would restyle every face
    if (zi !== Z.zi || force) { Z.zi = zi; each('.rg-obh, .rg-obl', function (t) { t.style.setProperty('--zi', zi); }, op); }
    // 4 Nov 2026: this returned below 45% zoom, so a face first seen zoomed out had no picture, and CSS hid every face below
    // 30%: zooming out "made pictures disappear". Now every face on screen gets its picture at every zoom (a small copy).
    if (!POS.length || !POS[0].w || op.offsetWidth !== Z.w || op.offsetHeight !== Z.h) measure();
    var vw = ov.clientWidth, vh = ov.clientHeight, x0 = -Z.x / s - 80, y0 = -Z.y / s - 80, x1 = x0 + vw / s + 160, y1 = y0 + vh / s + 160;
    POS.forEach(function (q) {
      if (q.done || q.x > x1 || q.x + q.w < x0 || q.y > y1 || q.y + q.h < y0) return;
      var i = q.n.querySelector('img[data-src]'); if (i) { i.src = i.getAttribute('data-src'); i.removeAttribute('data-src'); }
      q.done = true;
    });
  }
  // ---- the hands: one finger or the mouse drags, two fingers pinch, the wheel zooms where it points
  var PT = {}, moved = false, g = null;
  function rel(ev) { var r = ov.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; }
  function startG() {
    var ks = Object.keys(PT);
    if (ks.length === 1) { var a = PT[ks[0]]; g = { one: true, ax: a.x, ay: a.y, x: Z.x, y: Z.y }; }
    else if (ks.length >= 2) { var p1 = PT[ks[0]], p2 = PT[ks[1]]; g = { one: false, d: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1, mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2, s: Z.s, x: Z.x, y: Z.y }; }
    else g = null;
  }
  ov.addEventListener('pointerdown', function (ev) {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    if (ev.target.closest && ev.target.closest('.rg-oz')) { moved = false; return; }      // a pinch makes no click to clear "moved": a button pressed after one must not be swallowed (4 Nov 2026)
    cancelAnimationFrame(tw);
    PT[ev.pointerId] = rel(ev); if (Object.keys(PT).length === 1) moved = false;
    startG(); tog(ov, 'is-grab', true);
    var hint = $('rg-ohint'); if (hint) hint.hidden = true;
  });
  ov.addEventListener('pointermove', function (ev) {
    if (!PT[ev.pointerId] || !g) return;
    PT[ev.pointerId] = rel(ev);
    var ks = Object.keys(PT);
    if (g.one && ks.length === 1) {
      var a = PT[ks[0]], dx = a.x - g.ax, dy = a.y - g.ay;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 7) return;
      if (!moved) { moved = true; try { ov.setPointerCapture(ev.pointerId); } catch (e) { } }
      Z.x = g.x + dx; Z.y = g.y + dy;
    } else if (!g.one && ks.length >= 2) {
      moved = true;
      var p1 = PT[ks[0]], p2 = PT[ks[1]], d = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1, mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      var s = Math.max(Z.fit * .8, Math.min(2.6, g.s * d / g.d)), px = (g.mx - g.x) / g.s, py = (g.my - g.y) / g.s;
      Z.s = s; Z.x = mx - px * s; Z.y = my - py * s;
    } else return;
    clampZ(); ask(); settle();
  });
  function up(ev) { if (!PT[ev.pointerId]) return; delete PT[ev.pointerId]; startG(); if (!Object.keys(PT).length) tog(ov, 'is-grab', false); }
  ov.addEventListener('pointerup', up); ov.addEventListener('pointercancel', up); ov.addEventListener('lostpointercapture', up);
  ov.addEventListener('click', function (ev) {
    if (moved && !(ev.target.closest && ev.target.closest('.rg-oz'))) { ev.stopPropagation(); ev.preventDefault(); moved = false; return; }      // a drag is not a tap
    var t = ev.target.closest && ev.target.closest('.rg-on');      // a face too small to hit surely: the tap zooms in on it, a second tap opens it
    if (!t) return;
    var r = t.getBoundingClientRect();
    if (r.height >= 40) return;
    ev.stopPropagation(); ev.preventDefault();
    var o = ov.getBoundingClientRect(), cx = r.left + r.width / 2 - o.left, cy = r.top + r.height / 2 - o.top;
    var s = Math.min(2.6, Math.max(Z.s * 2, 48 / (r.height / Z.s))), px = (cx - Z.x) / Z.s, py = (cy - Z.y) / Z.s;
    to(s, ov.clientWidth / 2 - px * s, ov.clientHeight / 2 - py * s, true);
  }, true);
  // 5 Nov 2026, a reader on a Windows 11 laptop: scrolling down the board showed "only coloured lines". A touchpad's
  // two-finger scroll is a wheel event, and every wheel zoomed: the chart shrank to colour tiles and the page stopped
  // scrolling. Now a touchpad scroll moves the chart, a pinch (ctrl + wheel) and a mouse wheel still zoom, and once the
  // chart cannot move or zoom further that way the page scrolls on, unless the chart is full screen.
  function byPad(ev, dy) {
    if (ev.deltaMode || ev.ctrlKey) return false;
    if (ev.deltaX) return true;
    var w = Math.abs(ev.wheelDeltaY || 0);
    if (w && w !== Math.abs(dy)) return w % 120 !== 0;      // a real event: one mouse notch is 120
    return Math.abs(dy) < 50 || dy % 1 !== 0;               // nothing to read: small or fractional steps are a touchpad
  }
  ov.addEventListener('wheel', function (ev) {
    var dy = ev.deltaY * (ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? 400 : 1), q = rel(ev), x0 = Z.x, y0 = Z.y, s0 = Z.s;
    if (byPad(ev, dy)) {
      Z.x -= ev.deltaX; Z.y -= dy; clampZ();
      if (Z.x === x0 && Z.y === y0 && !FS) return;          // at the chart's edge: the page has it
      ev.preventDefault(); ask(); settle(); return;
    }
    if (!ev.ctrlKey && Math.abs(ev.deltaX) > Math.abs(dy)) { ev.preventDefault(); Z.x -= ev.deltaX; clampZ(); ask(); settle(); return; }
    zoomAt(Z.s * Math.exp(-dy * (ev.ctrlKey ? .01 : .0018)), q.x, q.y);
    if (Z.s === s0 && !ev.ctrlKey) {                        // at the zoom limit a mouse wheel moves the chart first (a reader, 7 Nov 2026: with All picked the wheel scrolled the page and only one row showed)
      Z.y -= dy; clampZ();
      if (Z.y === y0 && !FS) return;                        // chart at its edge too: the page scrolls on
      ask(); settle();
    }
    ev.preventDefault();
  }, { passive: false });
  ov.addEventListener('dblclick', function (ev) { if (ev.target.closest && ev.target.closest('.rg-on, .rg-oz')) return; var q = rel(ev); zoomAt(Z.s * 1.8, q.x, q.y); });
  ov.addEventListener('keydown', function (ev) {
    var k = ev.key, m = 80;
    if (k === '+' || k === '=') zoomAt(Z.s * 1.25, ov.clientWidth / 2, ov.clientHeight / 2);
    else if (k === '-' || k === '_') zoomAt(Z.s / 1.25, ov.clientWidth / 2, ov.clientHeight / 2);
    else if (k === '0') fit(true);
    else if (/^Arrow/.test(k) && ev.target === ov) { Z.x += k === 'ArrowLeft' ? m : k === 'ArrowRight' ? -m : 0; Z.y += k === 'ArrowUp' ? m : k === 'ArrowDown' ? -m : 0; clampZ(); ask(); settle(); }
    else return;
    ev.preventDefault();
  });
  each('.rg-zb', function (b) { b.addEventListener('click', function () {
    var z = b.getAttribute('data-z'), cx = ov.clientWidth / 2, cy = ov.clientHeight / 2;
    if (z === 'fs') { fsToggle(); return; }
    if (z === 'fit') fit(true); else { var s = Math.max(Z.fit * .8, Math.min(2.6, Z.s * (z === 'in' ? 1.6 : 1 / 1.6))), px = (cx - Z.x) / Z.s, py = (cy - Z.y) / Z.s; to(s, cx - px * s, cy - py * s, true); }
  }); }, orgEl);
  function orgShow() {
    if (!ORGBUILT) { ORGBUILT = true; SIZE = sizeFrom(url()); GRP = grpFrom(url()); grpPaint(); orgDraw(true); }
    else { measure(); clampZ(); paint(); lod(true); }
  }
  function orgGo(id) {      // the search: to that face, big enough to read, lit, its card open
    var p = BY[id]; if (!p) return;
    if (!inSize(p) || (GRP !== 'all' && !op.querySelector('.rg-on[data-id="' + id + '"]'))) { SIZE = SIZES[SIZES.length - 1]; GRP = 'all'; grpPaint(); orgDraw(false); }
    var q = null; POS.forEach(function (o) { if (!q && o.n.getAttribute('data-id') === id && !o.n.classList.contains('is-al')) q = o; });
    if (!q) return;
    var s = Math.max(Z.s, 1.1), vw = ov.clientWidth, vh = ov.clientHeight;
    to(s, vw / 2 - (q.x + q.w / 2) * s, vh / 2 - (q.y + q.h / 2) * s, true);
    toStage(); flash(id);
  }
  var orz = 0;
  W.addEventListener('resize', function () { clearTimeout(orz); orz = setTimeout(function () { if (ORGBUILT && !orgEl.hidden) { var f = Z.s <= Z.fit * 1.01; measure(); if (f) fit(false); else { clampZ(); paint(); } lod(true); } }, 200); });

  /* ---------------------------------------------------------------- FULL SCREEN (4 Nov 2026)
     Armin: "There is no way to make the zoomable chart fullscreen, and there should be." The button in the zoom stack puts
     the chart part (#rg-org: the size picker, the branch chips, the legend, the chart) over the whole screen. Where the
     browser has the Fullscreen API for an element it is used (Esc is the browser's); where it has not (an iPhone's Safari)
     the same class fills the window with fixed positioning, the page under it held still, and Esc or the button leave.
     The card moves inside while it lasts, so a tap on a face still opens it. The view keeps its centre across the change. */
  var FS = false, fsB = $('rg-fsb'), sheetHome = null;
  function fsEl() { return D.fullscreenElement || D.webkitFullscreenElement || null; }
  function fsSet(on) {
    if (on === FS) return;
    var cx = ov.clientWidth / 2, cy = ov.clientHeight / 2, px = (cx - Z.x) / Z.s, py = (cy - Z.y) / Z.s;
    FS = on;
    tog(orgEl, 'is-fs', on); tog(D.documentElement, 'rg-fs-lock', on);
    if (on) { sheetHome = sheet.parentNode; orgEl.appendChild(sheet); }
    else if (sheetHome && sheet.parentNode !== sheetHome) sheetHome.appendChild(sheet);
    if (fsB) { fsB.setAttribute('aria-pressed', on ? 'true' : 'false'); var l = fsB.getAttribute(on ? 'data-off' : 'data-on'); fsB.setAttribute('aria-label', l); fsB.title = l; }
    var again = function () { Z.x = ov.clientWidth / 2 - px * Z.s; Z.y = ov.clientHeight / 2 - py * Z.s; clampZ(); paint(); lod(true); };
    again(); W.requestAnimationFrame(function () { W.requestAnimationFrame(again); }); setTimeout(again, 350);
    try { ov.focus({ preventScroll: true }); } catch (e) { }
  }
  function fsToggle() {
    if (!FS) {
      fsSet(true); track('rg_fullscreen', {});
      var r = orgEl.requestFullscreen || orgEl.webkitRequestFullscreen;
      if (r) { try { var pr = r.call(orgEl); if (pr && pr.catch) pr.catch(function () { }); } catch (e) { } }      // refused: the class alone fills the window
    } else if (fsEl()) { var x = D.exitFullscreen || D.webkitExitFullscreen; try { var q = x.call(D); if (q && q.catch) q.catch(function () { fsSet(false); }); } catch (e) { fsSet(false); } }
    else fsSet(false);
  }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (t) { D.addEventListener(t, function () { if (FS && !fsEl()) fsSet(false); }); });
  W.addEventListener('keydown', function (ev) {      // capture: an open card takes Esc first (its own handler), the next Esc leaves
    if (ev.key !== 'Escape' || !FS || !sheet.hidden) return;
    ev.preventDefault(); fsToggle();      // the browser's own full screen usually eats Esc itself; when the page gets it, it leaves either kind
  }, true);

  /* ---------------------------------------------------------------- THE POWER QUIZ (4 Nov 2026)
     The brief: "game-like elements where they help understanding (e.g. a 'who really holds power' quiz)". Ten rounds, three
     kinds, every answer read from this page's own data, so the quiz is exactly as right as the board: WHO HAS MORE POWER (two
     key players, data/regime-key.json order, and the one line of what the stronger one's chair decides), WHO SITS IN THIS
     CHAIR TODAY (a chair emptied in the war: the holder today among the ones taken out of it), WHICH ONE WAS TAKEN OUT (one
     killed, two still in place). The reader's best score stays in this browser (rg-quiz-best); the page works without it. */
  var quizEl = $('rg-quiz'), qzB = $('rg-qz-b'), QZ = null;
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function postOf(p) { return String(p.r || '').replace(/\s*[(（][^)）]*[)）]/g, '').split(/[;؛]/)[0].trim(); }
  function quizRounds() {
    var key = P.filter(function (p) { return p.k && !GONE[p.s]; }).sort(function (a, b) { return a.k - b.k; });
    var R = [], used = {};
    // who has more power: pairs at least three places apart, so the answer is a fact of the order and not a coin toss
    shuffle(key.slice()).forEach(function (a) {
      if (R.length >= 4) return;
      var b = shuffle(key.filter(function (o) { return Math.abs(o.k - a.k) >= 3 && !used[o.id] && o.id !== a.id; }))[0];
      if (!b || used[a.id]) return; used[a.id] = used[b.id] = 1;
      R.push({ t: 'more', q: w.qz_more, opts: shuffle([a, b]), ok: a.k < b.k ? a.id : b.id });
    });
    // who sits in this chair today
    shuffle((X.chairs || []).map(function (c) { return c.map(function (i) { return BY[i]; }).filter(Boolean); }).filter(function (c) {
      var now = c[c.length - 1]; return c.length >= 3 && !GONE[now.s] && now.s !== 'removed' && now.s !== 'arrested' && c.slice(0, -1).some(function (o) { return GONE[o.s]; });
    })).slice(0, 3).forEach(function (c) {
      var now = c[c.length - 1], before = shuffle(c.slice(0, -1)).slice(0, 2);
      R.push({ t: 'chair', q: w.qz_chair.replace('{post}', postOf(now)), opts: shuffle([now].concat(before)), ok: now.id });
    });
    // which one has been taken out
    var down = shuffle(P.filter(function (p) { return p.s === 'killed' && p.img && p.t !== 'm' && p.d >= '2025-06'; })), up = shuffle(P.filter(function (p) { return (p.s === 'alive') && p.img && p.t !== 'm' && p.u !== 'former'; }));
    for (var i = 0; R.length < 10 && i < down.length && up.length >= 2 * (i + 1); i++) R.push({ t: 'out', q: w.qz_out, opts: shuffle([down[i], up[2 * i], up[2 * i + 1]]), ok: down[i].id });
    return shuffle(R).slice(0, 10);
  }
  function qzFace(p) { var f = face(p); f.classList.add('rg-qz-f'); return f; }
  function quizStart(again) {
    if (!qzB || (QZ && !again)) return;
    QZ = { r: quizRounds(), i: 0, s: 0 }; track('rg_quiz_start', { again: again ? 1 : 0 });
    quizShow();
  }
  function quizShow() {
    qzB.textContent = '';
    var n = QZ.r.length;
    if (QZ.i >= n) {      // the end: the score, the best so far, share it, play again
      var best = Math.max(QZ.s, +(sget('rg-quiz-best') || 0) || 0); sset('rg-quiz-best', String(best)); if (!QZ.sent) { QZ.sent = 1; track('rg_quiz_end', { score: QZ.s, of: n }); }
      qzB.appendChild(el('p', 'rg-qz-score num', w.qz_score.replace('{s}', num(QZ.s)).replace('{n}', num(n))));
      qzB.appendChild(el('p', 'rg-qz-end', w.qz_end.replace('{s}', num(QZ.s)).replace('{n}', num(n))));
      qzB.appendChild(el('p', 'rg-dim', w.qz_best.replace('{s}', num(best)).replace('{n}', num(n))));
      var a = el('div', 'rg-qz-acts');
      var sh = el('button', 'btn btn-line', w.share); sh.type = 'button'; sh.setAttribute('data-share', '');
      var canon = root.getAttribute('data-canon') || (W.location.origin + W.location.pathname);
      sh.setAttribute('data-url', canon + '?v=quiz'); sh.setAttribute('data-title', w.qz_h); sh.setAttribute('data-text', w.qz_share.replace('{s}', num(QZ.s)).replace('{n}', num(n)));
      var ag = el('button', 'btn btn-key', w.qz_again); ag.type = 'button'; ag.addEventListener('click', function () { quizStart(true); });
      a.appendChild(ag); a.appendChild(sh); qzB.appendChild(a);
      return;
    }
    var R = QZ.r[QZ.i];
    var hd = el('div', 'rg-qz-top'); hd.appendChild(el('span', 'rg-qz-n num', num(QZ.i + 1) + ' / ' + num(n))); if (QZ.i) hd.appendChild(el('span', 'rg-qz-s num', w.qz_score.replace('{s}', num(QZ.s)).replace('{n}', num(QZ.i))));
    var bar = el('span', 'rg-qz-bar'); bar.style.setProperty('--q', (100 * QZ.i / n).toFixed(1) + '%'); hd.appendChild(bar);
    qzB.appendChild(hd);
    qzB.appendChild(el('h3', 'rg-qz-q', R.q));
    var row_ = el('div', 'rg-qz-o' + (R.opts.length > 2 ? ' is-3' : ''));
    var note = el('div', 'rg-qz-note');
    R.opts.forEach(function (p) {
      var b = el('button', 'rg-qz-c'); b.type = 'button'; b.setAttribute('data-qid', p.id);
      b.appendChild(qzFace(p)); b.appendChild(el('b', null, p.n)); var sub = el('span', null, R.t === 'chair' ? (GONE[p.s] ? stLine(p) : '') : postOf(p)); if (R.t === 'chair' && GONE[p.s]) sub.className = 'rg-qz-after'; b.appendChild(sub);      // the fate is shown only once answered: it would give the answer away
      b.addEventListener('click', function () {
        if (row_.classList.contains('is-done')) return;
        tog(row_, 'is-done', true);
        var right = p.id === R.ok; if (right) QZ.s++;
        each('.rg-qz-c', function (o) { var id = o.getAttribute('data-qid'); tog(o, 'is-ok', id === R.ok); tog(o, 'is-no', id === p.id && !right); o.setAttribute('aria-disabled', 'true'); }, row_);
        var okP = BY[R.ok];
        note.appendChild(el('p', 'rg-qz-v ' + (right ? 'is-ok' : 'is-no'), right ? w.qz_right : w.qz_wrong));
        var why = R.t === 'more' ? (w.qz_rank.replace('{n}', num(okP.k)) + (okP.kw ? ' · ' + okP.kw : ''))
          : R.t === 'chair' ? okP.n + ': ' + (okP.r || '') : okP.n + ': ' + stLine(okP) + (okP.sn ? '. ' + okP.sn : '');
        note.appendChild(el('p', 'rg-qz-why', why));
        var src = okP.src && okP.src.length && (X.src || [])[okP.src[0]];
        var ac = el('div', 'rg-qz-acts');
        var op_ = el('button', 'btn btn-line', w.qz_open); op_.type = 'button'; op_.addEventListener('click', function () { open(okP.id, op_); }); ac.appendChild(op_);
        if (src) ac.appendChild(link(src));
        var nx = el('button', 'btn btn-key rg-qz-next', w.qz_next); nx.type = 'button'; nx.addEventListener('click', function () { QZ.i++; quizShow(); try { qzB.querySelector('.rg-qz-c').focus({ preventScroll: true }); } catch (e) { } });
        ac.appendChild(nx); note.appendChild(ac);
        try { nx.focus({ preventScroll: true }); } catch (e) { }
      });
      row_.appendChild(b);
    });
    qzB.appendChild(row_); qzB.appendChild(note);
  }

  /* ---------------------------------------------------------------- start */
  // the bar sticks under the site's own sticky header and the timeline clears any bar fixed at the bottom (the live-show
  // pill): both measured, never assumed, so it fits the same on both sites
  function chrome() {
    var top = 0, bot = 0, pl = 0, pr = 0, vh = W.innerHeight || 700, vw = D.documentElement.clientWidth || W.innerWidth || 360;
    [].forEach.call(D.body.children, function (n) {
      if (n === stage || n.contains(stage) || n === sheet) return;
      var s = W.getComputedStyle(n); if (s.position !== 'sticky' && s.position !== 'fixed') return;
      var r = n.getBoundingClientRect(); if (!r.height || r.height > vh / 3 || s.display === 'none' || s.visibility === 'hidden') return;
      if (s.position === 'sticky') { if (s.top !== 'auto') top = Math.max(top, (parseFloat(s.top) || 0) + r.height); }
      else if (r.top < vh / 2) top = Math.max(top, r.bottom);
      else if (r.width < vw * .5 && r.left > vw / 2) pr = Math.max(pr, vw - r.left);      // a small pill in a bottom corner: the timeline steps aside
      else if (r.width < vw * .5 && r.right < vw / 2) pl = Math.max(pl, r.right);
      else bot = Math.max(bot, vh - r.top);      // a bar across the bottom: the timeline sits above it
    });
    var z = stage.getBoundingClientRect(), cut = function (v, edge) { return Math.max(0, Math.round(v - edge)); };
    stage.style.setProperty('--rg-top', Math.round(top) + 'px');
    stage.style.setProperty('--rg-bot', Math.round(bot) + 'px');
    stage.style.setProperty('--rg-pr', cut(pr, vw - z.right) + 'px');
    stage.style.setProperty('--rg-pl', cut(pl, z.left) + 'px');
  }
  chrome();
  tog(stage, 'is-js', true); tog(root, 'rg-js', true);
  $('rg-time').hidden = false; $('rg-bar').hidden = false; crumb.hidden = false; tabs.hidden = false;
  collect();
  var u0 = url(), b0 = u0 && u0.searchParams.get('b') || '', v0 = u0 && (u0.searchParams.get('v') || u0.searchParams.get('view')) || '';
  if (v0 === 'camps' || sget('rg-lens') === '1') setLens(true);      // ?view=camps was the factions view until 1 Nov 2026: it is the lens now
  applyTime(X.today, true); event(X.today);
  walk(b0, { replace: true, scroll: false, pv: u0 && u0.searchParams.get('pv') || '' });
  setTab(v0 === 'days' ? 'days' : (v0 === 'key' && keyEl) ? 'key' : v0 === 'quiz' ? 'quiz' : (v0 === 'board' || b0) ? 'board' : 'chart', true);
  paintWatch();
  paintSeen();
  W.addEventListener('load', chrome);
  var rz = null;
  W.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(chrome, 180); });
  (function fromAddress() {
    var p = u0 && u0.searchParams.get('p');
    if (p && BY[p]) open(p);
  })();
})();
