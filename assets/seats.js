/* Unopposed (unopposed/): the map, the county search, the county card, the state card, the share picture.
   Its data is written by build/seats.py into assets/seats/: us.json (every county's counts by kind of seat),
   map.json (the county and state shapes) and <st>.json (every contest of every county in one state, loaded when
   a county of that state is opened). Counting rules live in seats.py; this file never recounts a contest, it only
   adds up what seats.py wrote. Looks: build/seats.css.
   A county is opened by tapping it, by the search, or by the address: #c=<FIPS> (a county), #s=<ST> (a state).
   The search also takes a 5-digit ZIP code: assets/seats/zip/<first two digits>.json (build/seats_zip.py, from the Census
   Bureau's ZIP-to-county file) is loaded and looked up here, so nothing typed leaves the page.
   THE RUN GUIDE (6 November 2026): a seat with no race opens, in place, how to get on the ballot for it in its state
   (assets/seats/run.json, build/seats_run.py: our steps, the state's own pages and words, free training, finders) and
   one door to act: our Gatherings tool, ../gatherings/?new=1&kind=candidate&from=unopposed&ref=&title=&place= (the
   contract with gatherings/; never another organisation's events). */
(function () {
  'use strict';
  var D = document, W = window;
  var root = D.getElementById('ss');
  if (!root) return;
  var API = root.getAttribute('data-api');
  var svg = root.querySelector('.ss-svg'), gC = root.querySelector('.ss-c'), gS = root.querySelector('.ss-s'), ring = root.querySelector('.ss-ring');
  var tip = root.querySelector('.ss-tip'), card = root.querySelector('#ss-card'), lobby = root.querySelector('.ss-lobby');
  var crumb = root.querySelector('.ss-crumb'), crumbSt = root.querySelector('.ss-crumb-st');
  var input = root.querySelector('.ss-find input'), hits = root.querySelector('#ss-hits');
  var US = null, MAP = null, DET = {}, kind = '', sel = null, selSt = null, onlyNo = false, zipCtx = null, cardRows = [];
  var paths = {}, FULL = [-10, 0, 985, 615], view = FULL.slice();
  var RAMP = ['#2A2723', '#4A3F23', '#705B21', '#9E7C1F', '#CB9F22', '#F4C430'];
  var NONE = '#1B1B1A';
  var fmt = function (n) { return Number(n).toLocaleString('en-US'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var NS = 'http://www.w3.org/2000/svg';

  /* ---- counting (adds up what seats.py wrote; t = {level: [seats, contested, unopposed, empty, retention]}) ---- */
  function kindsFor(st, k) {
    var s = US.states[st] || {};
    if (!s.scope) return null;
    var full = s.scope === 'all' || s.scope === 'most';
    if (k) return (full || US.complete.indexOf(k) >= 0) ? [k] : null;
    return full ? 'all' : null;
  }
  function sum(t, ks) {
    var o = { S: 0, C: 0, U: 0, E: 0, R: 0 };
    if (!t || !ks) return o;
    for (var lv in t) {
      if (ks !== 'all' && ks.indexOf(lv) < 0) continue;
      var v = t[lv];
      o.S += v[0] - v[4]; o.C += v[1]; o.U += v[2]; o.E += v[3]; o.R += v[4];
    }
    o.no = o.U + o.E;
    o.sh = o.S ? o.no / o.S : 0;
    return o;
  }
  function countyKinds(f, k) {
    var c = US.counties[f], s = US.states[c[1]] || {};
    if (!s.scope || !c[2]) return null;
    if (c[3]) return k ? [k] : 'all';      // counted in full
    return (k && US.complete.indexOf(k) >= 0) ? [k] : null;      // only what the state itself reports
  }
  function countyNums(f, k) {
    var c = US.counties[f];
    if (!c) return null;
    var ks = countyKinds(f, k === undefined ? kind : k);
    if (!ks || !c[2]) return null;
    return sum(c[2], ks);
  }
  function colour(o) {
    if (!o) return 'url(#ss-hatch)';
    if (!o.S) return NONE;
    var i = Math.min(5, Math.floor(o.sh * 6 - 1e-9));
    return RAMP[Math.max(0, i)];
  }
  function pct(x) { return Math.round(x * 100) + '%'; }
  function placeName(f) {
    var c = US.counties[f];
    if (!c) return '';
    var n = c[0], st = c[1];
    var word = st === 'LA' ? ' Parish' : (st === 'AK' ? '' : ((/ city$/i.test(n) || / County$/i.test(n)) ? '' : ' County'));
    return n + word;
  }
  function kindName(k) { return k ? US.long[k] : 'seats'; }

  /* ---- the map ---- */
  function draw() {
    var frag = D.createDocumentFragment();
    Object.keys(MAP.counties).forEach(function (f) {
      var p = D.createElementNS(NS, 'path');
      p.setAttribute('d', MAP.counties[f][1]);
      p.setAttribute('data-f', f);
      paths[f] = p;
      frag.appendChild(p);
    });
    gC.appendChild(frag);
    var s = D.createDocumentFragment();
    Object.keys(MAP.states).forEach(function (st) {
      var p = D.createElementNS(NS, 'path');
      p.setAttribute('d', MAP.states[st].d);
      p.setAttribute('data-st', st);
      s.appendChild(p);
    });
    gS.appendChild(s);
    var l = root.querySelector('.ss-loading');
    if (l) l.remove();
    paint();
  }
  function paint() {
    for (var f in paths) paths[f].setAttribute('fill', colour(countyNums(f)));
    lead();
    root.classList.toggle('ss-k', !!kind);
  }
  function setView(b, now) {
    var from = view.slice(), to = b, t0 = performance.now(), dur = now || W.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 520;
    if (!dur || D.hidden) {      // a hidden tab draws no frames: jump straight there
      view = to.slice();
      svg.setAttribute('viewBox', view.join(' '));
      root.style.setProperty('--ss-z', (FULL[2] / view[2]).toFixed(3));
      return;
    }
    function step(t) {
      var k = dur ? Math.min(1, (t - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 4);
      view = from.map(function (v, i) { return v + (to[i] - v) * e; });
      svg.setAttribute('viewBox', view.join(' '));
      root.style.setProperty('--ss-z', (FULL[2] / view[2]).toFixed(3));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function stateBox(st) {
    var b = MAP.states[st].box, w = b[2] - b[0], h = b[3] - b[1], pad = Math.max(w, h) * 0.08;
    var x = b[0] - pad, y = b[1] - pad; w += pad * 2; h += pad * 2;
    var ar = FULL[2] / FULL[3];      // keep the map's shape, so the state is centred
    if (w / h > ar) { var nh = w / ar; y -= (nh - h) / 2; h = nh; } else { var nw = h * ar; x -= (nw - w) / 2; w = nw; }
    return [x, y, w, h];
  }
  function zoomTo(st) {
    if (selSt === st) return;
    selSt = st;
    root.classList.add('ss-zoomed');
    gS.querySelectorAll('path').forEach(function (p) { p.classList.toggle('on', p.getAttribute('data-st') === st); });
    crumb.hidden = false;
    crumbSt.textContent = MAP.states[st].n;
    setView(stateBox(st));
  }
  function zoomOut() {
    selSt = null; sel = null;
    root.classList.remove('ss-zoomed');
    gS.querySelectorAll('path.on').forEach(function (p) { p.classList.remove('on'); });
    crumb.hidden = true;
    ring.removeAttribute('d');
    card.hidden = true; lobby.hidden = false;
    setView(FULL);
    hash('');
  }
  function hash(h) {
    try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); } catch (e) { /* a sandboxed frame */ }
  }

  /* ---- the tooltip (a mouse only; a finger opens the card) ---- */
  var fine = W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function tipFor(f) {
    var o = countyNums(f), c = US.counties[f];
    var line = !o ? 'Not counted yet for ' + kindName(kind).toLowerCase()
      : !o.S ? 'No ' + kindName(kind).toLowerCase() + ' on this ballot'
        : '<b>' + fmt(o.no) + '</b> of ' + fmt(o.S) + ' seats had no race <b>' + pct(o.sh) + '</b>';
    return '<strong>' + esc(placeName(f)) + ', ' + esc(c[1]) + '</strong><span>' + line + '</span>';
  }
  if (fine) {
    gC.addEventListener('mousemove', function (ev) {
      var f = ev.target.getAttribute && ev.target.getAttribute('data-f');
      if (!f) { tip.hidden = true; return; }
      tip.innerHTML = tipFor(f);
      tip.hidden = false;
      var r = root.querySelector('.ss-map').getBoundingClientRect();
      var x = ev.clientX - r.left, y = ev.clientY - r.top;
      tip.style.transform = 'translate(' + Math.min(x + 14, r.width - tip.offsetWidth - 4) + 'px,' + Math.max(0, y - tip.offsetHeight - 12) + 'px)';
    });
    gC.addEventListener('mouseleave', function () { tip.hidden = true; });
  }
  gC.addEventListener('click', function (ev) {
    var f = ev.target.getAttribute && ev.target.getAttribute('data-f');
    if (f) openCounty(f);
  });
  gC.addEventListener('keydown', function (ev) {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.getAttribute('data-f')) { ev.preventDefault(); openCounty(ev.target.getAttribute('data-f')); }
  });
  root.querySelector('.ss-back').addEventListener('click', zoomOut);

  /* ---- the kinds ---- */
  root.querySelectorAll('.ss-kinds button').forEach(function (b) {
    b.addEventListener('click', function () {
      kind = b.getAttribute('data-lv');
      if (kind === 'all') kind = '';      // All seats (a named word, so the tour can name the button)
      root.querySelectorAll('.ss-kinds button').forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
      paint();
      if (sel) renderCounty(sel); else if (selSt && !card.hidden) renderState(selSt);
    });
  });

  /* ---- the leaderboard (beside the map until a county is opened) ---- */
  function lead() {
    var ol = root.querySelector('.ss-lead');
    if (!ol) return;
    var floor = kind ? 6 : 15, rows = [];
    for (var f in US.counties) {
      var o = countyNums(f);
      if (o && o.S >= floor) rows.push([f, o]);
    }
    rows.sort(function (a, b) { return b[1].sh - a[1].sh || b[1].no - a[1].no; });
    ol.innerHTML = rows.slice(0, 8).map(function (r) {
      return '<li><button type="button" data-f="' + r[0] + '"><span class="ss-ln">' + esc(placeName(r[0])) + '<small>' + esc(US.states[US.counties[r[0]][1]].n) + '</small></span>'
        + '<span class="ss-lp num"><b>' + pct(r[1].sh) + '</b><small>' + fmt(r[1].no) + ' of ' + fmt(r[1].S) + '</small></span></button></li>';
    }).join('') || '<li class="dim">No county has ' + floor + ' or more of these seats counted yet.</li>';
    var h = lobby.querySelector('h2');
    if (h) h.textContent = kind ? 'Where nobody ran: ' + US.levels[kind].toLowerCase() : 'Where nobody ran';
  }
  lobby.addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-f]');
    if (b) openCounty(b.getAttribute('data-f'));
  });

  /* ---- a state's contests, loaded once ---- */
  function detail(st) {
    if (DET[st]) return DET[st];
    DET[st] = fetch(API + st.toLowerCase() + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    DET[st].catch(function () { delete DET[st]; });
    return DET[st];
  }

  /* ---- the county card ---- */
  function openCounty(f, z) {
    var c = US.counties[f];
    if (!c) return;
    zipCtx = z && z.rows && z.rows.length > 1 ? z : null;      // a ZIP that crosses county lines: the card names the others
    sel = f;
    zoomTo(c[1]);
    ring.setAttribute('d', MAP.counties[f][1]);
    lobby.hidden = true; card.hidden = false;
    card.innerHTML = '<p class="ss-wait">Opening ' + esc(placeName(f)) + '&hellip;</p>';
    hash('c=' + f);
    renderCounty(f);
    if (W.matchMedia('(max-width: 899px)').matches) {
      setTimeout(function () { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
    }
  }
  function status(row) {
    var s = row[2], c = row[3], ret = row[4];
    if (ret) return ['r', 'Yes or no on keeping ' + esc(c.join(', ') || 'the judge')];
    if (c.length > s) return ['c', c.length + ' ran for ' + (s > 1 ? s + ' seats' : 'the seat') + ': <span class="ss-nm">' + esc(c.join(', ')) + '</span>'];
    if (!c.length) return ['e', s > 1 ? 'Empty: nobody ran for ' + s + ' seats' : 'Empty: nobody ran'];
    var who = esc(c.join(', '));
    if (c.length < s) return ['e', who + ' ran alone, and ' + (s - c.length) + ' of ' + s + ' seats were left empty'];
    return ['u', who + (c.length > 1 ? ' ran for ' + s + ' seats, no one else did' : ' ran alone')];
  }
  function chairs(rows, cap) {
    var out = [], n = 0;
    rows.forEach(function (r) {
      var s = r[2], c = r[3].length;
      for (var i = 0; i < s; i++) {
        var k = r[4] ? 'r' : (c > s ? 'c' : (i < c ? 'u' : 'e'));
        out.push(k);
      }
    });
    var order = { u: 0, e: 1, c: 2, r: 3 };
    out.sort(function (a, b) { return order[a] - order[b]; });
    n = out.length;
    var shown = out.slice(0, cap || 160);
    return '<div class="ss-chairs" role="img" aria-label="' + n + ' seats, one square each">' + shown.map(function (k) { return '<i class="ch-' + k + '"></i>'; }).join('')
      + (n > shown.length ? '<span class="num">+' + fmt(n - shown.length) + '</span>' : '') + '</div>';
  }
  function csv(rows, place) {
    var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; };
    var lines = [['Office', 'Kind', 'Seats', 'People on the ballot', 'Race', 'Names'].map(q).join(',')];
    rows.forEach(function (r) {
      var st = status(r)[0];
      lines.push([r[0], US.long[r[1]] || r[1], r[2], r[4] ? '' : r[3].length, { c: 'Contested', u: 'No race', e: 'Empty seat', r: 'Retention vote' }[st], r[3].join('; ')].map(q).join(','));
    });
    lines.push(q('Counted by libertypolitics.com/unopposed/ from the official results of the November 3, 2026 election, ' + place));
    return 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + lines.join('\r\n'));
  }
  function renderCounty(f) {
    var c = US.counties[f], st = c[1], S = US.states[st] || {};
    var place = placeName(f) + ', ' + S.n;
    if (!S.scope) {
      card.innerHTML = head(place, f) + zipNote(f) + '<p class="ss-none-say">' + esc(S.n) + ' is not counted yet. Its official results are being read; this county opens here when they are in.</p>' + foot(S, place, st, f);
      return;
    }
    detail(st).then(function (d) {
      if (sel !== f) return;
      var all = d.counties[f] || [];
      var ks = countyKinds(f, kind), part = false;
      if (!ks && !kind && US.counties[f][2]) { ks = US.complete; part = true; }
      var rows = all.filter(function (r) { return !ks ? false : ks === 'all' || ks.indexOf(r[1]) >= 0; });
      var o = part ? sum(US.counties[f][2], ks) : countyNums(f);
      var gap = d.gaps && d.gaps[f];
      var top;
      if (!ks) top = '<p class="ss-none-say">Here I have counted only the offices the state itself reports, so ' + esc(kindName(kind).toLowerCase()) + ' here are not counted yet. Pick <b>Congress</b>, <b>Legislature</b> or <b>Statewide</b> to see what is.</p>';
      else if (!o || !o.S) top = '<p class="ss-none-say">No ' + esc(kindName(kind).toLowerCase()) + ' were on this ballot.</p>';
      else top = (part ? '<p class="ss-part">Here I have counted the offices the state itself reports: Congress, the legislature and statewide seats.</p>' : '')
        + '<p class="ss-say"><b class="num">' + fmt(o.no) + '</b> of <b class="num">' + fmt(o.S) + '</b> ' + (kind ? esc(US.long[kind].toLowerCase()) : (part ? 'of those seats' : 'seats')) + ' on the ballot here had no race.'
        + (o.E ? ' <span class="ss-empt">' + fmt(o.E) + (o.E === 1 ? ' was left empty' : ' were left empty') + ': nobody filed.</span>' : '') + '</p>' + chairs(rows)
        + '<p class="ss-chk dim"><span><i class="ch-u"></i>One name</span><span><i class="ch-e"></i>Empty</span><span><i class="ch-c"></i>A race</span>' + (o.R ? '<span><i class="ch-r"></i>Keep the judge?</span>' : '') + '</p>';
      var groups = {};
      rows.forEach(function (r) { (groups[r[1]] = groups[r[1]] || []).push(r); });
      cardRows = [];
      var open = 0;
      var list = Object.keys(groups).sort(function (a, b) { return US.order.indexOf(a) - US.order.indexOf(b); }).map(function (lv) {
        var g = groups[lv], no = 0, n = 0;
        g.forEach(function (r) { if (!r[4]) { n += r[2]; if (r[3].length <= r[2]) no += r[2]; } });
        var same = lv === 'statewide' || lv === 'federal';
        return '<details class="ss-g"' + (same && !kind ? '' : ' open') + '><summary><b>' + esc(US.long[lv] || lv) + '</b><span class="num">' + (n ? fmt(no) + ' of ' + fmt(n) + ' no race' : '') + '</span></summary><ul>'
          + g.map(function (r) {
            var s = status(r), o = '<span class="ss-o">' + esc(r[0]) + (r[2] > 1 ? ' <small class="num">' + r[2] + ' seats</small>' : '') + '</span><span class="ss-w">' + s[1] + '</span>';
            if (s[0] !== 'u' && s[0] !== 'e') return '<li class="ss-r ss-s' + s[0] + '">' + o + '</li>';
            open++;
            cardRows.push(r);
            return '<li class="ss-r ss-s' + s[0] + ' ss-rx"><button type="button" class="ss-ob" aria-expanded="false" data-i="' + (cardRows.length - 1) + '">' + o + '<i class="ss-oc" aria-hidden="true"></i></button><div class="ss-ra" hidden></div></li>';
          }).join('') + '</ul></details>';
      }).join('');
      var miss = S.scope !== 'all' && S.missing ? '<p class="ss-miss"><b>Not counted here:</b> ' + esc(S.missing) + '</p>' : '';
      if (S.note) miss += '<p class="ss-miss">' + esc(S.note) + '</p>';
      card.innerHTML = head(place, f) + zipNote(f) + top + (gap ? '<p class="ss-miss">' + esc(gap) + '</p>' : '') + miss
        + (rows.length ? '<div class="ss-only"><label><input type="checkbox"' + (onlyNo ? ' checked' : '') + '> Only the seats with no race</label>'
          + '<a class="ss-dl" download="' + esc((placeName(f) + ' ' + st).replace(/\s+/g, '-').toLowerCase()) + '-seats-2026.csv" href="' + csv(rows, place) + '">Download the list</a></div>' : '')
        + (open ? '<p class="ss-tap">Tap a seat with no race to run for it.</p>' : '')
        + '<div class="ss-list' + (onlyNo ? ' ss-onlyno' : '') + '">' + list + '</div>' + foot(S, place, st, f);
      var cb = card.querySelector('.ss-only input');
      if (cb) cb.addEventListener('change', function () { onlyNo = cb.checked; card.querySelector('.ss-list').classList.toggle('ss-onlyno', onlyNo); });
    }).catch(function () {
      if (sel === f) card.innerHTML = head(place, f) + '<p class="ss-none-say">This county\'s list did not load. Check your connection and tap the county again.</p>';
    });
  }
  function head(place, f) {
    return '<header class="ss-ch"><h2>' + esc(place) + '</h2><button type="button" class="ss-x" aria-label="Close">'
      + '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>';
  }
  function foot(S, place, st, f) {
    var url = location.origin + location.pathname + location.hash;
    var run = st ? '<button type="button" class="ss-run" data-run="' + esc(st) + '" data-rf="' + esc(f || '') + '" aria-expanded="false"><b>Run for one of these seats</b><span>How to get on the ballot in ' + esc(S.n) + ', step by step</span></button><div class="ss-guide" hidden></div>' : '';
    var src = (S.src || []).map(function (s) { return '<a href="' + esc(s.url) + '" rel="noopener" target="_blank">' + esc(s.name) + '</a>'; }).join(', ');
    return run + '<div class="ss-act"><button type="button" class="ss-btn" data-share data-url="' + esc(url) + '" data-title="' + esc('Unopposed: ' + place) + '">Share</button>'
      + '<button type="button" class="ss-btn" data-shot="unopposed">Make a picture</button></div>'
      + (src ? '<p class="ss-from dim">From ' + src + '.</p>' : '');
  }
  card.addEventListener('click', function (ev) {
    var z = ev.target.closest('button[data-zf]');
    if (z) { openCounty(z.getAttribute('data-zf'), zipCtx); return; }
    var ob = ev.target.closest('.ss-ob');
    if (ob) { seatActions(ob); return; }
    var rs = ev.target.closest('.ss-rs');
    if (rs) { var r = cardRows[+rs.getAttribute('data-i')]; if (r && sel) openGuide(US.counties[sel][1], { f: sel, r: r }, rs); return; }
    var rb = ev.target.closest('.ss-run');
    if (rb) { toggleGuide(rb); return; }
    var gx = ev.target.closest('.ss-gx');
    if (gx) { var gd = gx.closest('.ss-guide'); closeGuide(gd); return; }
    if (ev.target.closest('.ss-x')) { card.hidden = true; lobby.hidden = false; sel = null; ring.removeAttribute('d'); hash(selSt ? 's=' + selSt : ''); }
  });

  /* ---- a ZIP that crosses county lines: the card names the other counties ---- */
  function zipNote(f) {
    if (!zipCtx || !zipCtx.rows.some(function (x) { return x[0] === f; })) return '';
    var others = zipCtx.rows.filter(function (x) { return x[0] !== f && US.counties[x[0]]; });
    if (!others.length) return '';
    return '<div class="ss-zipn"><p>ZIP <b class="num">' + esc(zipCtx.zip) + '</b> also reaches:</p>' + others.map(function (x) {
      return '<button type="button" class="ss-zb" data-zf="' + x[0] + '">' + esc(placeName(x[0]) + ', ' + US.counties[x[0]][1]) + '</button>';
    }).join('') + '</div>';
  }

  /* ---- the run guide: one seat, or the whole state; opened in place, never a page away ---- */
  var RUN = null;
  function runData() {
    if (!RUN) {
      RUN = fetch(API + 'run.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
      RUN.catch(function () { RUN = null; });
    }
    return RUN;
  }
  function slug(s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }
  function gatherUrl(st, seat) {
    var S = US.states[st] || {}, f = seat && seat.f, place = f ? placeName(f) + ', ' + st : (S.n || st);
    var ref = seat && seat.r ? f + '-' + slug(seat.r[0]) : (f || st);
    var title = seat && seat.r ? 'Back a candidate for ' + seat.r[0] + ', ' + placeName(f) : 'Back a candidate in ' + place;
    return root.getAttribute('data-root') + 'gatherings/?new=1&kind=candidate&from=unopposed&ref=' + encodeURIComponent(ref)
      + '&title=' + encodeURIComponent(title) + '&place=' + encodeURIComponent(place);
  }
  function seatActions(ob) {
    var li = ob.closest('li'), box = li.querySelector('.ss-ra'), on = ob.getAttribute('aria-expanded') !== 'true';
    card.querySelectorAll('.ss-ob[aria-expanded="true"]').forEach(function (b) { if (b !== ob) { b.setAttribute('aria-expanded', 'false'); b.closest('li').querySelector('.ss-ra').hidden = true; } });
    ob.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (!on) { box.hidden = true; return; }
    var i = ob.getAttribute('data-i'), r = cardRows[+i], st = US.counties[sel][1];
    box.innerHTML = '<button type="button" class="ss-rs" data-i="' + i + '">How to run for this seat</button>'
      + '<a class="ss-rg" href="' + esc(gatherUrl(st, { f: sel, r: r })) + '">Gather people for it</a>';
    box.hidden = false;
  }
  function toggleGuide(rb) {
    var gd = rb.nextElementSibling;
    if (rb.getAttribute('aria-expanded') === 'true') { closeGuide(gd); return; }
    var f = rb.getAttribute('data-rf');
    openGuide(rb.getAttribute('data-run'), f ? { f: f } : null);
  }
  function closeGuide(gd) {
    if (!gd) return;
    gd.hidden = true; gd.innerHTML = '';
    var rb = gd.previousElementSibling;
    if (rb) { rb.setAttribute('aria-expanded', 'false'); rb.hidden = false; }
  }
  function dateWords(d) {
    var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(d || '');
    return m ? (+m[3]) + ' ' + ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+m[2] - 1] + ' ' + m[1] : d;
  }
  function openGuide(st, seat, from) {
    var gd = card.querySelector('.ss-guide'), rb = card.querySelector('.ss-run');
    if (!gd) return;
    gd.hidden = false;
    if (rb) { rb.setAttribute('aria-expanded', 'true'); rb.hidden = true; }
    gd.innerHTML = '<p class="ss-wait">Opening the guide&hellip;</p>';
    var at = sel;
    runData().then(function (G) {
      if (sel !== at) return;
      gd.innerHTML = guideHtml(G, st, seat);
      gd.scrollIntoView({ behavior: W.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }).catch(function () {
      if (sel === at) gd.innerHTML = '<p class="ss-none-say">The guide did not load. Check your connection and try again.</p><button type="button" class="ss-btn ss-gx">Close</button>';
    });
  }
  function guideHtml(G, st, seat) {
    var D = G.states[st] || {}, S = US.states[st] || {}, n = S.n || st, today = new Date().toISOString().slice(0, 10);
    var pick = function (k) { return k === 'guide' ? (D.guide || D.file) : D[k]; };
    var link = function (x) { return x ? ' <a href="' + esc(x.url) + '" rel="noopener" target="_blank">' + esc(x.name) + '</a>' : ''; };
    var gather = '<a class="ss-gath" href="' + esc(gatherUrl(st, seat)) + '"><b>' + (seat && seat.r ? 'Start a gathering for this seat' : 'Start a gathering') + '</b><span>On our Gatherings page: set a time and a place, and the people near you who want this seat filled can come.</span></a>';
    var h = '<div class="ss-gd" role="region" aria-label="How to run for office in ' + esc(n) + '">'
      + '<header class="ss-gh"><h3>' + (seat && seat.r ? 'Run for ' + esc(seat.r[0]) : 'Run for office in ' + esc(n)) + '</h3><button type="button" class="ss-x ss-gx" aria-label="Close the guide">'
      + '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>'
      + (seat && seat.r ? '<p class="ss-gl">' + (seat.r[3].length ? 'Nobody ran against ' + esc(seat.r[3].join(', ')) + ' here.' : 'Nobody ran for this seat at all.') + ' Next time, the second name on the ballot could be yours.</p>' : '');
    if (D.opened !== 'pc') h += '<p class="ss-miss">' + esc(n) + '\'s election site turns away the computer I check pages with, so I give its official ' + (D.opened === 'root' ? 'office' : 'pages') + ' without restating its rules. Read them there.</p>';
    var last = '';      // a page the step above already links is not linked again
    h += '<ol class="ss-steps">' + G.steps.map(function (s) {
      var to = s.go === 'gather' ? null : pick(s.go), x = to && to.url !== last ? link(to) : '';
      if (to) last = to.url;
      return '<li><b>' + esc(s.h) + '</b><p>' + esc(s.p) + '</p>' + (x ? x.slice(1).replace('<a ', '<a class="ss-go" ') : '') + (s.go === 'gather' ? gather : '') + '</li>';
    }).join('') + '</ol>';
    var facts = (D.facts || []).filter(function (x) { return !x.until || x.until >= today; });
    if (facts.length) h += '<div class="ss-own"><h4>In ' + esc(n) + '\'s own words</h4>' + facts.map(function (x) {
      var src = [D.file, D.guide].filter(function (y) { return y && y.url === x.url; })[0];
      return '<figure>' + (x.say ? '<p class="ss-say2">' + esc(x.say) + '</p>' : '') + '<blockquote>&ldquo;' + esc(x.q) + '&rdquo;</blockquote><p class="ss-fc">From <a href="' + esc(x.url) + '" rel="noopener" target="_blank">' + esc(x.name || (src ? src.name : n + ' official page')) + '</a>, read on ' + esc(dateWords(x.on)) + '.</p></figure>';
    }).join('') + '</div>';
    var item = function (t) {
      var u = t.url.charAt(0) === '@' ? D[t.url.slice(1)] : null, url = u ? u.url : t.url.replace('@ST', st);
      if (t.url.charAt(0) === '@' && !u) return '';
      var nm = u && (t.url === '@league' || t.url === '@counties') ? u.name : t.name.replace('your state', n).replace('in your state', 'in ' + n);
      return '<li><a class="ss-tl" href="' + esc(url) + '" rel="noopener" target="_blank">' + esc(nm) + '</a><span>' + esc(t.what) + '</span></li>';
    };
    h += '<h4>Learn it free</h4><ul class="ss-tr">' + G.training.map(item).join('') + '</ul>'
      + '<h4>Find your people</h4><ul class="ss-tr">' + G.finders.map(item).join('') + '</ul>'
      + '<p class="ss-from dim">Every link here was checked on ' + esc(dateWords(D.on)) + '. A state\'s own page always wins over this guide.</p></div>';
    return h;
  }

  /* ---- the state card (from the table, or #s=ST) ---- */
  function renderState(st) {
    var S = US.states[st];
    sel = null;
    ring.removeAttribute('d');
    zoomTo(st);
    lobby.hidden = true; card.hidden = false;
    hash('s=' + st);
    if (!S.scope) { card.innerHTML = head(S.n) + '<p class="ss-none-say">' + esc(S.n) + ' is not counted yet.</p>'; return; }
    var ks = kindsFor(st, kind), part = false;
    if (!ks && !kind) { ks = US.complete; part = true; }
    var o = sum(S.t, ks);
    var cs = Object.keys(US.counties).filter(function (f) { return US.counties[f][1] === st; }).map(function (f) { return [f, countyNums(f)]; })
      .filter(function (x) { return x[1] && x[1].S; }).sort(function (a, b) { return b[1].sh - a[1].sh || b[1].no - a[1].no; });
    var lv = US.order.filter(function (k) { return S.t[k] && (ks === 'all' || (ks && ks.indexOf(k) >= 0)); }).map(function (k) {
      var x = sum(S.t, [k]);
      return x.S ? '<li><span>' + esc(US.long[k]) + '</span><b class="num">' + pct(x.sh) + '</b><small class="num">' + fmt(x.no) + ' of ' + fmt(x.S) + '</small></li>' : '';
    }).join('');
    card.innerHTML = head(S.n) + (part ? '<p class="ss-part">In ' + esc(S.n) + ' I have counted the offices the state itself reports: Congress, the legislature and statewide seats.</p>' : '') + (o.S ? '<p class="ss-say"><b class="num">' + fmt(o.no) + '</b> of <b class="num">' + fmt(o.S) + '</b> ' + (kind ? esc(US.long[kind].toLowerCase()) : 'seats') + ' in ' + esc(S.n) + ' had no race (' + pct(o.sh) + ').</p>' : '<p class="ss-none-say">Nothing of this kind is counted in ' + esc(S.n) + '.</p>')
      + (S.scope !== 'all' && S.missing ? '<p class="ss-miss"><b>Not counted here:</b> ' + esc(S.missing) + '</p>' : '')
      + (S.note ? '<p class="ss-miss">' + esc(S.note) + '</p>' : '')
      + (lv ? '<ul class="ss-lv">' + lv + '</ul>' : '')
      + (cs.length ? '<h3>Its counties, most seats with no race first</h3><ol class="ss-lead">' + cs.slice(0, 12).map(function (r) {
        return '<li><button type="button" data-f="' + r[0] + '"><span class="ss-ln">' + esc(placeName(r[0])) + '</span><span class="ss-lp num"><b>' + pct(r[1].sh) + '</b><small>' + fmt(r[1].no) + ' of ' + fmt(r[1].S) + '</small></span></button></li>';
      }).join('') + '</ol>' : '') + foot(S, S.n, st);
  }
  card.addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-f]');
    if (b) openCounty(b.getAttribute('data-f'));
  });
  root.querySelectorAll('.ss-t a[href^="#s="]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      renderState(a.getAttribute('href').slice(3));
      root.querySelector('.ss-stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---- the search ---- */
  var IDX = [], hi = -1;
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\bsaint\b/g, 'st').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function index() {
    for (var f in US.counties) {
      var c = US.counties[f], n = placeName(f), S = US.states[c[1]];
      IDX.push({ f: f, label: n + ', ' + c[1], sub: S.n, k: norm(n + ' ' + S.n + ' ' + c[1]), first: norm(n) });
    }
    for (var st in US.states) IDX.push({ s: st, label: US.states[st].n, sub: 'The whole state', k: norm(US.states[st].n + ' ' + st), first: norm(US.states[st].n) });
  }
  function find(q) {
    q = norm(q);
    if (!q) return [];
    var words = q.split(' ');
    return IDX.filter(function (x) { return words.every(function (w) { return (' ' + x.k).indexOf(' ' + w) >= 0; }); })
      .sort(function (a, b) { return (b.first.indexOf(q) === 0) - (a.first.indexOf(q) === 0) || (!!a.f) - (!!b.f) || a.label.localeCompare(b.label); }).slice(0, 8);
  }
  function showHits(list, top) {
    hi = list.length ? 0 : -1;
    hits.innerHTML = (top ? '<li class="ss-hith" role="presentation">' + esc(top) + '</li>' : '') + list.map(function (x, i) {
      return '<li role="option" id="ss-h' + i + '" aria-selected="' + (i === 0) + '" data-f="' + (x.f || '') + '" data-s="' + (x.s || '') + '"' + (x.zip ? ' data-zip="' + x.zip + '"' : '') + '><b>' + esc(x.label) + '</b><small>' + esc(x.sub) + '</small></li>';
    }).join('') || (input.value.trim() ? '<li class="ss-nohit">No county by that name. Try the first few letters, or a ZIP code.</li>' : '');
    hits.hidden = !hits.innerHTML;
    input.setAttribute('aria-expanded', hits.hidden ? 'false' : 'true');
  }
  function showMsg(t) {
    hi = -1;
    hits.innerHTML = '<li class="ss-nohit">' + esc(t) + '</li>';
    hits.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }
  var ZIPS = {}, zipAt = '';
  function zipShard(z) {
    var k = z.slice(0, 2);
    if (!ZIPS[k]) {
      ZIPS[k] = fetch(API + 'zip/' + k + '.json').then(function (r) { if (r.status === 404) return {}; if (!r.ok) throw new Error(r.status); return r.json(); });
      ZIPS[k].catch(function () { delete ZIPS[k]; });
    }
    return ZIPS[k];
  }
  function zipFind(v) {
    zipAt = v;
    if (v.length < 5) { showMsg('Keep typing: a ZIP code has 5 digits.'); return; }
    zipShard(v).then(function (sh) {
      if (zipAt !== v || input.value.trim() !== v) return;
      var rows = (sh[v] || []).filter(function (r) { return US.counties[r[0]]; });
      if (!rows.length) { showMsg('ZIP ' + v + ' is not on the Census Bureau\'s map of ZIP areas (a ZIP for P.O. boxes only has none). Type your county instead.'); return; }
      showHits(rows.map(function (r) {
        return { f: r[0], zip: v, label: placeName(r[0]) + ', ' + US.counties[r[0]][1], sub: rows.length < 2 ? 'ZIP ' + v : (r[1] >= 50 ? 'Most of ' + v : 'Part of ' + v) };
      }), rows.length > 1 ? 'ZIP ' + v + ' crosses ' + rows.length + ' counties. Pick yours:' : '');
      ZIPROWS[v] = rows;
    }).catch(function () { if (zipAt === v) showMsg('The ZIP codes did not load. Check your connection, or type your county.'); });
  }
  var ZIPROWS = {};
  function pick(li) {
    if (!li) return;
    var f = li.getAttribute('data-f'), s = li.getAttribute('data-s'), z = li.getAttribute('data-zip');
    hits.hidden = true; input.setAttribute('aria-expanded', 'false');
    input.value = li.querySelector('b') ? li.querySelector('b').textContent : input.value;
    if (f) openCounty(f, z ? { zip: z, rows: ZIPROWS[z] || [] } : null); else if (s) renderState(s);
    input.blur();
  }
  input.addEventListener('input', function () {
    var v = input.value.trim();
    if (/^\d{1,5}$/.test(v)) { zipFind(v); return; }
    zipAt = '';
    showHits(find(input.value));
  });
  input.addEventListener('keydown', function (ev) {
    var li = hits.querySelectorAll('li[role=option]');
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (!li.length) return;
      hi = (hi + (ev.key === 'ArrowDown' ? 1 : -1) + li.length) % li.length;
      li.forEach(function (x, i) { x.setAttribute('aria-selected', i === hi); });
      input.setAttribute('aria-activedescendant', 'ss-h' + hi);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      pick(li[hi >= 0 ? hi : 0]);
    } else if (ev.key === 'Escape') { hits.hidden = true; }
  });
  hits.addEventListener('mousedown', function (ev) { ev.preventDefault(); pick(ev.target.closest('li[role=option]')); });
  input.addEventListener('blur', function () { setTimeout(function () { hits.hidden = true; input.setAttribute('aria-expanded', 'false'); }, 120); });

  /* ---- the picture to post (build/shareimg.js) ---- */
  function shotText() {
    if (sel) {
      var o = countyNums(sel);
      if (o && o.S) return 'In ' + placeName(sel) + ', ' + US.counties[sel][1] + ', ' + fmt(o.no) + ' of ' + fmt(o.S) + ' ' + (kind ? US.long[kind].toLowerCase() : 'seats') + ' on the ballot had no race.';
    }
    var n = sum(US.nat, 'all');
    return pct(n.sh) + ' of the seats on the November 3 ballot had no race. Only one name, or none.';
  }
  (W.LPShotQ = W.LPShotQ || []).push({
    id: 'unopposed', el: '#ss', kicker: 'UNOPPOSED',
    title: function () { return shotText(); },
    sub: function () { return sel ? 'Every seat on the ballot, from the official results' : fmt(sum(US.nat, 'all').S) + ' seats counted from official results'; },
    text: function () { return shotText(); },
    cta: 'Find every seat in your county',
    url: function () { return location.href; },
    draw: function (ctx, box, kit) {
      var o = sel ? countyNums(sel) : sum(US.nat, 'all');
      if (!o || !o.S) return;
      var n = Math.min(o.S, sel ? 200 : 100), unit = sel ? 1 : o.S / 100;
      var cols = Math.ceil(Math.sqrt(n * box.w / box.h)), rows = Math.ceil(n / cols);
      var g = Math.min(box.w / cols, box.h / rows), s = g * 0.78;
      var x0 = box.x + (box.w - cols * g) / 2, y0 = box.y + (box.h - rows * g) / 2;
      var no = Math.round(o.no / unit), em = Math.round(o.E / unit);
      for (var i = 0; i < n; i++) {
        var x = x0 + (i % cols) * g, y = y0 + Math.floor(i / cols) * g;
        kit.round(ctx, x, y, s, s, s * 0.18);
        if (i < no - em) { ctx.fillStyle = kit.c.field; ctx.fill(); }
        else if (i < no) { ctx.strokeStyle = kit.c.red; ctx.lineWidth = Math.max(2, s * 0.08); ctx.setLineDash([s * 0.18, s * 0.12]); ctx.stroke(); ctx.setLineDash([]); }
        else { ctx.strokeStyle = kit.c.dim; ctx.lineWidth = Math.max(2, s * 0.06); ctx.stroke(); }
      }
    }
  });

  /* ---- start ---- */
  Promise.all([fetch(API + 'us.json').then(function (r) { return r.json(); }), fetch(API + 'map.json').then(function (r) { return r.json(); })]).then(function (got) {
    US = got[0]; MAP = got[1];
    US.order = Object.keys(US.levels);
    draw();
    index();
    var m = /^#(c|s)=([0-9A-Z]+)$/.exec(location.hash);
    if (m && m[1] === 'c' && US.counties[m[2]]) openCounty(m[2]);
    else if (m && m[1] === 's' && US.states[m[2]]) renderState(m[2]);
  }).catch(function () {
    var l = root.querySelector('.ss-loading');
    if (l) l.textContent = 'The map did not load. The table below lists every state.';
  });
})();
