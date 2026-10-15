/* The Intel Room (intel/). Everything the page does: the map (drag, pinch, scroll and the buttons zoom it), the gold
   circles (one per place, merged when they would touch), the timeline (two handles, four presets, play), the topics, the
   place, the kind, top picks, the list, the spotlight (one item, big, with arrows to the next), the ask box, and the
   stream mode. Data: data/intel.json via build/intel_data.py. Words: build/intel.py. Nothing is sent anywhere. */
(function () {
  'use strict';
  var root = document.getElementById('ir');
  if (!root || !window.fetch) return;
  var $ = function (id) { return document.getElementById(id); };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var FIRST = '2023-10';          // the timeline runs from the month of 7 October; anything older is one bar, "Earlier"
  var PAGE_N = 40;
  var MAXK = 600;          // deep enough that Gaza City, Khan Younis and Rafah come apart
  // The map's own country names for the places' countries, where the two differ.
  var TOPO = { 'Gaza': 'Palestine', 'West Bank': 'Palestine', 'United States': 'United States of America' };
  var KINDS = [['', 'All'], ['video', 'Videos'], ['post', 'Posts'], ['article', 'Articles'], ['doc', 'Documents and data']];

  var D, items, P, topics, buckets = [], S = { q: '', tp: [], place: '', kind: '', top: false, from: 0, to: 0, sort: 'new', nowhere: false };
  var shown = [], limit = PAGE_N, spotAt = -1, world = null, hiLoaded = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtDate(d) {
    if (!d) return 'No date';
    var p = d.split('-');
    if (p.length === 3) return (+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + p[0];
    if (p.length === 2) return MON[+p[1] - 1] + ' ' + p[0];
    return p[0];
  }
  function monthOf(d) { return d.length >= 7 ? d.slice(0, 7) : d.slice(0, 4) + '-06'; }
  function placeName(k) { return (P[k] || ['No single place'])[0]; }
  function ytId(u) { var m = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/.exec(u); return m ? m[1] : ''; }
  function kindOf(it) { return it.k === 'document' || it.k === 'data' ? 'doc' : it.k; }

  /* ------------------------------------------------------------ the projection (the same as build time) */
  var W = 2000, SC = W / (2 * Math.PI * 0.8707);
  function proj(lon, lat) {
    var l = lon * Math.PI / 180, p = lat * Math.PI / 180, p2 = p * p, p4 = p2 * p2;
    var x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * p2 * (0.003971 - 0.001529 * p2)));
    var y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
    return [x * SC + W / 2, -y * SC];
  }

  /* ------------------------------------------------------------ filtering */
  function bucketOf(it) {
    if (!it.d) return -1;
    var m = monthOf(it.d);
    if (m < FIRST) return 0;
    var i = buckets.indexOf(m);
    return i < 0 ? buckets.length - 1 : i;
  }
  function fullRange() { return S.from === 0 && S.to === buckets.length - 1; }
  function inPlace(it) {
    if (S.nowhere) return it.p === 'global';
    if (!S.place) return true;
    var keys = [it.p].concat(it.a || []);
    if (S.place.indexOf('c:') === 0) {
      var c = S.place.slice(2);
      return keys.some(function (k) { return P[k] && P[k][1] === c; });
    }
    var want = S.place.split(',');
    return keys.some(function (k) { return want.indexOf(k) >= 0; });
  }
  function words(it) {
    if (!it._w) it._w = (it.t + ' ' + (it.n || '') + ' ' + (it.o || '') + ' ' + (it.h || '') + ' ' + it.src + ' ' + placeName(it.p) + ' ' + (P[it.p] ? P[it.p][1] : '') + ' ' +
      it.tp.map(function (i) { return topics[i]; }).join(' ')).toLowerCase();
    return it._w;
  }
  function pass(it, skip) {
    if (skip !== 'tp' && S.tp.length && !S.tp.some(function (t) { return it.tp.indexOf(t) >= 0; })) return false;
    if (skip !== 'kind' && S.kind && kindOf(it) !== S.kind) return false;
    if (S.top && !it.q) return false;
    if (skip !== 'place' && !inPlace(it)) return false;
    if (skip !== 'time' && !fullRange()) { var b = bucketOf(it); if (b < S.from || b > S.to) return false; }
    if (S.q) {
      var w = words(it), terms = S.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (w.indexOf(terms[i]) < 0) return false;
    }
    return true;
  }
  function sortList(a) {
    var by = function (x, y) { return (y.d || '').localeCompare(x.d || ''); };
    if (S.sort === 'old') by = function (x, y) { return (x.d || '9999').localeCompare(y.d || '9999'); };
    if (S.sort === 'top') { var nb = by; by = function (x, y) { return ((y.q || 0) - (x.q || 0)) || nb(x, y); }; }
    return a.sort(function (x, y) { return ((x.x || 0) - (y.x || 0)) || by(x, y); });      // an unlabelled post goes last, whatever the order
  }

  /* ------------------------------------------------------------ everything that redraws */
  function render(keepSpot) {
    shown = sortList(items.filter(function (it) { return pass(it); }));
    limit = PAGE_N;
    drawList();
    drawPins();
    drawCountries();
    drawBars();
    drawChips();
    drawState();
    writeUrl();
    if (!keepSpot && $('ir-spot').open) closeSpot();
  }

  function card(it, i) {
    var y = ytId(it.u), th;
    if (y) th = '<span class="ir-th yt" style="background-image:url(https://i.ytimg.com/vi/' + y + '/mqdefault.jpg)"></span>';
    else th = '<span class="ir-th">' + esc(it.src === 'Telegram' ? 'TG' : it.src === 'Document' ? 'DOC' : it.src === 'Facebook' ? 'FB' : it.src === 'Instagram' ? 'IG' : it.src.length > 9 ? 'WEB' : it.src) + '</span>';
    var meta = '<span>' + esc(fmtDate(it.d)) + '</span> · ' + esc(placeName(it.p)) + ' · ' + esc(it.h || it.src) +
      (it.q ? ' · <span class="q">&#9733; Top pick</span>' : '') + (it.g ? ' · <span class="gr">Graphic</span>' : '');
    return '<li class="ir-card' + (i === spotAt ? ' on' : '') + '"><button type="button" data-i="' + i + '">' + th +
      '<span><span class="ir-c-t">' + esc(it.t) + '</span><span class="ir-c-m">' + meta + '</span></span></button></li>';
  }
  function drawList() {
    var ol = $('ir-items');
    if (!shown.length) {
      ol.innerHTML = '<li class="ir-empty">Nothing in the bank matches all of that.<br><button type="button" data-clear>Clear every filter</button></li>';
    } else {
      ol.innerHTML = shown.slice(0, limit).map(card).join('');
    }
    $('ir-more').hidden = shown.length <= limit;
    $('ir-more').textContent = 'Show ' + Math.min(PAGE_N, shown.length - limit) + ' more of ' + (shown.length - limit);
    var n = shown.length;
    $('ir-count').innerHTML = '<b class="num">' + n + '</b> ' + (n === 1 ? 'item' : 'items') + (n === items.length ? ' in the bank' : ' match');
  }

  /* ------------------------------------------------------------ the map */
  var map = $('ir-map'), box = $('ir-mapbox'), gLand, gPins, T = { k: 1, x: 0, y: 0 }, base = { s: 1, ox: 0, oy: 0 }, paths = {};
  function fit() {
    var cw = box.clientWidth, ch = box.clientHeight;
    // The world is wider than most boxes; on a phone the box is near square, so the world starts zoomed on the
    // Middle East and Europe instead of a thin strip.
    var s = Math.min(cw / W, ch / world.h);
    base.s = s; base.ox = (cw - W * s) / 2; base.oy = (ch - world.h * s) / 2;
  }
  function scr(X, Y) { var s = base.s * T.k; return [base.ox * 1 + 0 + (X * s) + T.x, base.oy + (Y - world.top) * s + T.y]; }
  function setT(k, x, y) {
    var cw = box.clientWidth, ch = box.clientHeight;
    k = Math.max(1, Math.min(MAXK, k));
    var s = base.s * k, mw = W * s, mh = world.h * s;
    // keep some of the world on screen: the map cannot be thrown away
    var minX = Math.min(0, cw - mw - base.ox * 2) - cw * 0.25, maxX = Math.max(0, -base.ox * 2 + cw - mw) + cw * 0.25;
    x = Math.max(cw - base.ox - mw - cw * 0.3, Math.min(-base.ox + cw * 0.3, x));
    y = Math.max(ch - base.oy - mh - ch * 0.3, Math.min(-base.oy + ch * 0.3, y));
    void minX; void maxX;
    T.k = k; T.x = x; T.y = y;
    gLand.setAttribute('transform', 'translate(' + (base.ox + T.x) + ' ' + (base.oy + T.y) + ') scale(' + s + ') translate(0 ' + (-world.top) + ')');
    if (k >= 2.5 && !hiLoaded) loadHi();
    drawPins();
  }
  function zoomAt(f, px, py) {
    var k = Math.max(1, Math.min(MAXK, T.k * f)); f = k / T.k;
    var gx = px - base.ox, gy = py - base.oy;
    setT(k, gx - (gx - T.x) * f, gy - (gy - T.y) * f);
  }
  var anim = 0;
  function flyTo(k, cx, cy) {          // cx, cy: the world point (projected) to bring to the middle
    var cw = box.clientWidth, ch = box.clientHeight, s1 = base.s * k;
    var x1 = cw / 2 - base.ox - cx * s1, y1 = ch / 2 - base.oy - (cy - world.top) * s1;
    var k0 = T.k, x0 = T.x, y0 = T.y, t0 = performance.now(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650;
    cancelAnimationFrame(anim);
    (function step(now) {
      var t = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - t, 3);
      // zoom in log space so the move feels even
      var k_ = Math.exp(Math.log(k0) + (Math.log(k) - Math.log(k0)) * e);
      var s0 = base.s * k0, sk = base.s * k_;
      // interpolate the world point under the centre
      var c0x = (cw / 2 - base.ox - x0) / s0, c0y = (ch / 2 - base.oy - y0) / s0 + world.top;
      var mx = c0x + (cx - c0x) * e, my = c0y + (cy - c0y) * e;
      setT(k_, cw / 2 - base.ox - mx * sk, ch / 2 - base.oy - (my - world.top) * sk);
      if (t < 1) anim = requestAnimationFrame(step);
      else landed = 1;
    })(t0);
    // A tab in the background gets no animation frames: the move must still land where it was going.
    var landed = 0, my = anim;
    setTimeout(function () { if (!landed && anim === my) { cancelAnimationFrame(anim); var sk = base.s * k; setT(k, cw / 2 - base.ox - cx * sk, ch / 2 - base.oy - (cy - world.top) * sk); } }, dur + 120);
  }
  function drawWorld(geo) {
    world = geo;
    gLand.innerHTML = '';
    paths = {};
    geo.c.forEach(function (c) {
      var p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', c.d); p.setAttribute('class', 'c');
      gLand.appendChild(p);
      (paths[c.n] = paths[c.n] || []).push(p);
    });
    drawCountries();
  }
  function loadHi() {
    hiLoaded = true;
    fetch(root.getAttribute('data-geo-hi')).then(function (r) { return r.json(); }).then(function (g) {
      var top = world.top, h = world.h;
      drawWorld(g); world.top = top; world.h = h;          // same projection, same frame: only the detail changes
      setT(T.k, T.x, T.y);
    }).catch(function () { hiLoaded = false; });
  }
  function drawCountries() {
    if (!world) return;
    var on = {}, sel = {};
    shown.forEach(function (it) { [it.p].concat(it.a || []).forEach(function (k) { if (P[k] && P[k][1]) on[TOPO[P[k][1]] || P[k][1]] = 1; }); });
    if (S.place.indexOf('c:') === 0) sel[TOPO[S.place.slice(2)] || S.place.slice(2)] = 1;
    Object.keys(paths).forEach(function (n) { paths[n].forEach(function (p) { p.setAttribute('class', 'c' + (sel[n] ? ' sel' : on[n] ? ' on' : '')); }); });
  }

  // One circle per place; places whose circles would overlap at this zoom become one circle.
  var pinData = [];
  function pinR(n) { return Math.min(30, 9 + 3.2 * Math.sqrt(n)); }
  function drawPins() {
    if (!world || !gPins) return;
    var counts = {}, all = {};
    items.forEach(function (it) { if (pass(it, 'place')) [it.p].concat(it.a || []).forEach(function (k) { if (k !== 'global' && P[k] && P[k][2] != null) counts[k] = (counts[k] || 0) + 1; }); });
    var nw = items.filter(function (it) { return it.p === 'global' && pass(it, 'place'); }).length;
    var b = $('ir-nowhere'); b.hidden = !nw && !S.nowhere; b.textContent = 'No single place (' + nw + ')'; b.setAttribute('aria-pressed', S.nowhere ? 'true' : 'false');
    var sel = S.place && S.place.indexOf('c:') !== 0 ? S.place.split(',') : [];
    var pts = Object.keys(counts).map(function (k) { var q = proj(P[k][3], P[k][2]), s = scr(q[0], q[1]); return { keys: [k], n: counts[k], x: s[0], y: s[1], wx: q[0], wy: q[1] }; });
    pts.sort(function (a, b) { return b.n - a.n; });
    var merged = [];
    pts.forEach(function (p) {
      for (var i = 0; i < merged.length; i++) {
        var m = merged[i], dx = m.x - p.x, dy = m.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < pinR(m.n) + pinR(p.n) - 4) { m.keys = m.keys.concat(p.keys); m.n += p.n; return; }
      }
      merged.push({ keys: p.keys.slice(), n: p.n, x: p.x, y: p.y, wx: p.wx, wy: p.wy });
    });
    pinData = merged;
    var cw = box.clientWidth, ch = box.clientHeight, html = '';
    merged.forEach(function (m, i) {
      if (m.x < -40 || m.y < -40 || m.x > cw + 40 || m.y > ch + 40) return;
      var r = pinR(m.n), isSel = sel.length && m.keys.some(function (k) { return sel.indexOf(k) >= 0; }), dim = sel.length && !isSel;
      var name = m.keys.length === 1 ? placeName(m.keys[0]) : m.keys.length + ' places';
      html += '<g class="ir-pin' + (isSel ? ' sel' : dim ? ' dim' : '') + '" data-p="' + i + '" tabindex="0" role="button" aria-label="' + esc(name + ', ' + m.n + (m.n === 1 ? ' item' : ' items')) + '" transform="translate(' + m.x.toFixed(1) + ' ' + m.y.toFixed(1) + ')">' +
        (m.pulse ? '<circle class="pulse" r="10"/>' : '') +
        '<circle class="halo" r="' + (r + 6).toFixed(1) + '"/><circle class="core" r="' + r.toFixed(1) + '"/><text>' + m.n + '</text></g>';
    });
    gPins.innerHTML = html;
  }
  function pinAt(el) { var g = el && el.closest && el.closest('.ir-pin'); return g ? pinData[+g.getAttribute('data-p')] : null; }
  // Which circle a tap landed on, from the circles' own positions (a captured pointer's target is the map itself).
  function pinHit(cx, cy) {
    var r = box.getBoundingClientRect(), x = cx - r.left, y = cy - r.top, best = null, bd = 1e9;
    pinData.forEach(function (m) { var d = Math.hypot(m.x - x, m.y - y); if (d <= pinR(m.n) + 6 && d < bd) { bd = d; best = m; } });
    return best;
  }
  function openPin(m) {
    if (!m) return;
    if (m.keys.length > 1) {          // several places under one circle: go closer, so they come apart
      var xs = m.keys.map(function (k) { return proj(P[k][3], P[k][2]); });
      var minx = Math.min.apply(null, xs.map(function (q) { return q[0]; })), maxx = Math.max.apply(null, xs.map(function (q) { return q[0]; }));
      var miny = Math.min.apply(null, xs.map(function (q) { return q[1]; })), maxy = Math.max.apply(null, xs.map(function (q) { return q[1]; }));
      var span = Math.max(maxx - minx, (maxy - miny) * 1.6, 0.4);
      var k = Math.min(MAXK, Math.max(T.k * 2, box.clientWidth * 0.55 / (span * base.s)));
      flyTo(k, (minx + maxx) / 2, (miny + maxy) / 2);
      return;
    }
    S.place = S.place === m.keys[0] ? '' : m.keys[0];
    S.nowhere = false;
    $('ir-place').value = S.place;
    render();
    say(S.place ? 'Showing ' + shown.length + ' from ' + placeName(S.place) + '. Tap the circle again to show every place.' : '');
  }

  // Drag, pinch, scroll, double tap.
  var ptrs = {}, last = null, moved = 0, pinch = null;
  function onDown(ev) {
    if (ev.button > 0) return;
    ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    try { map.setPointerCapture(ev.pointerId); } catch (e) { /* a pointer the browser no longer tracks: dragging still works without it */ }
    var ids = Object.keys(ptrs);
    if (ids.length === 1) { last = { x: ev.clientX, y: ev.clientY }; moved = 0; map.classList.add('drag'); }
    if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: T.k };
    }
  }
  function onMove(ev) {
    var r = box.getBoundingClientRect();
    if (!ptrs[ev.pointerId]) { hover(ev, r); return; }
    ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var ids = Object.keys(ptrs);
    if (ids.length === 2 && pinch) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(pinch.k * d / pinch.d / T.k, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      moved = 99;
      return;
    }
    if (last) {
      var dx = ev.clientX - last.x, dy = ev.clientY - last.y;
      moved += Math.abs(dx) + Math.abs(dy);
      last = { x: ev.clientX, y: ev.clientY };
      if (moved > 4) setT(T.k, T.x + dx, T.y + dy);
    }
  }
  var lastTap = 0;
  function onUp(ev) {
    var was = ptrs[ev.pointerId];
    delete ptrs[ev.pointerId];
    if (Object.keys(ptrs).length < 2) pinch = null;
    if (!Object.keys(ptrs).length) {
      map.classList.remove('drag'); last = null;
      if (was && moved <= 4) {
        var m = pinHit(ev.clientX, ev.clientY);
        if (m) openPin(m);
        else {
          var now = Date.now(), r = box.getBoundingClientRect();
          if (now - lastTap < 320) zoomAt(2, ev.clientX - r.left, ev.clientY - r.top);
          lastTap = now;
        }
      }
    }
  }
  function hover(ev, r) {
    var tip = $('ir-tip'), m = pinAt(ev.target);
    if (!m) { tip.hidden = true; return; }
    var names = m.keys.map(placeName);
    tip.innerHTML = esc(names.length > 3 ? names.slice(0, 3).join(', ') + ' and ' + (names.length - 3) + ' more' : names.join(', ')) + '<small>' + m.n + (m.n === 1 ? ' item. ' : ' items. ') + (m.keys.length > 1 ? 'Tap to go closer.' : 'Tap to show them.') + '</small>';
    tip.style.left = m.x + 'px'; tip.style.top = (m.y - pinR(m.n)) + 'px'; tip.hidden = false;
  }

  /* ------------------------------------------------------------ the timeline */
  function makeBuckets() {
    var now = new Date(), end = now.getUTCFullYear() + '-' + ('0' + (now.getUTCMonth() + 1)).slice(-2);
    items.forEach(function (it) { if (it.d && monthOf(it.d) > end) end = monthOf(it.d); });
    buckets = ['earlier'];
    var y = +FIRST.slice(0, 4), m = +FIRST.slice(5);
    for (;;) { var k = y + '-' + ('0' + m).slice(-2); buckets.push(k); if (k >= end) break; m++; if (m > 12) { m = 1; y++; } }
    S.from = 0; S.to = buckets.length - 1;
    ['ir-from', 'ir-to'].forEach(function (id) { $(id).max = buckets.length - 1; });
    $('ir-from').value = 0; $('ir-to').value = buckets.length - 1;
  }
  function bLabel(i) { if (i === 0) return 'Earlier'; var k = buckets[i]; return MON[+k.slice(5) - 1] + ' ' + k.slice(0, 4); }
  function drawBars() {
    var svg = $('ir-bars'), n = buckets.length, c = new Array(n).fill(0);
    items.forEach(function (it) { if (pass(it, 'time')) { var b = bucketOf(it); if (b >= 0) c[b]++; } });
    var max = Math.max.apply(null, c.concat([1])), w = 1000 / n, h = 50, out = '';
    for (var i = 0; i < n; i++) {
      var bh = c[i] ? Math.max(2, (c[i] / max) * h) : 0;
      out += '<rect' + (i >= S.from && i <= S.to ? ' class="in"' : '') + ' x="' + (i * w + w * 0.14).toFixed(1) + '" y="' + (h - bh).toFixed(1) + '" width="' + (w * 0.72).toFixed(1) + '" height="' + bh.toFixed(1) + '"/>';
    }
    svg.setAttribute('viewBox', '0 0 1000 ' + h);
    svg.innerHTML = out;
    var und = items.filter(function (it) { return !it.d && pass(it, 'time'); }).length;
    $('ir-range').textContent = fullRange() ? 'All time' : (S.from === S.to ? bLabel(S.from) : bLabel(S.from) + ' to ' + bLabel(S.to));
    // Each label sits under its own bar: Earlier, the month of 7 October, then each new year.
    var lab = '<span style="left:' + (50 / n).toFixed(2) + '%">Earlier</span><span style="left:' + (150 / n).toFixed(2) + '%">Oct 2023</span>';
    for (var bi = 2; bi < n; bi++) if (buckets[bi].slice(5) === '01') lab += '<span style="left:' + ((bi + 0.5) * 100 / n).toFixed(2) + '%">' + buckets[bi].slice(0, 4) + '</span>';
    $('ir-axis').innerHTML = lab;
    $('ir-range').title = fullRange() ? (und ? und + ' items have no date and show only with All time' : '') : 'Items with no date are left out when a time is picked';
    [].forEach.call($('ir-pre').querySelectorAll('button'), function (bt) { bt.setAttribute('aria-pressed', bt.getAttribute('data-pre') === preNow() ? 'true' : 'false'); });
  }
  function preNow() {
    var n = buckets.length - 1;
    if (fullRange()) return 'all';
    if (S.from === 1 && S.to === n) return 'oct7';
    if (S.to === n && S.from === Math.max(1, n - 11)) return 'year';
    if (S.to === n && S.from === n) return 'month';
    return '';
  }
  function setRange(a, b) { S.from = Math.max(0, Math.min(a, b)); S.to = Math.min(buckets.length - 1, Math.max(a, b)); $('ir-from').value = S.from; $('ir-to').value = S.to; render(); }
  var playing = 0;
  function play() {
    var bt = $('ir-play');
    if (playing) { clearInterval(playing); playing = 0; bt.classList.remove('on'); bt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'; bt.setAttribute('aria-label', 'Play the timeline'); return; }
    bt.classList.add('on'); bt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>'; bt.setAttribute('aria-label', 'Pause');
    var end = buckets.length - 1, i = 1;
    setRange(1, 1);
    playing = setInterval(function () {
      i++;
      if (i > end) { play(); return; }
      setRange(1, i);
    }, 700);
  }

  /* ------------------------------------------------------------ chips, place, kind, state */
  function drawChips() {
    var c = new Array(topics.length).fill(0);
    items.forEach(function (it) { if (pass(it, 'tp')) it.tp.forEach(function (t) { c[t]++; }); });
    var order = topics.map(function (t, i) { return i; }).filter(function (i) { return c[i] || S.tp.indexOf(i) >= 0; });
    order.sort(function (a, b) { return (S.tp.indexOf(b) >= 0) - (S.tp.indexOf(a) >= 0) || c[b] - c[a]; });
    $('ir-topics').innerHTML = '<button class="ir-chip" type="button" data-t="" aria-pressed="' + (S.tp.length ? 'false' : 'true') + '">Every topic</button>' +
      order.map(function (i) { return '<button class="ir-chip" type="button" data-t="' + i + '" aria-pressed="' + (S.tp.indexOf(i) >= 0) + '">' + esc(topics[i]) + ' <i>' + c[i] + '</i></button>'; }).join('');
    [].forEach.call($('ir-kind').querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-k') === S.kind ? 'true' : 'false'); });
    $('ir-top').setAttribute('aria-pressed', S.top ? 'true' : 'false');
    $('ir-sort').value = S.sort;
  }
  function fillPlaces() {
    var byC = {}, n = {};
    items.forEach(function (it) { [it.p].concat(it.a || []).forEach(function (k) { if (k === 'global' || !P[k]) return; n[k] = (n[k] || 0) + 1; var c = P[k][1]; (byC[c] = byC[c] || {})[k] = 1; }); });
    var cs = Object.keys(byC).map(function (c) { var t = 0; items.forEach(function (it) { if ([it.p].concat(it.a || []).some(function (k) { return P[k] && P[k][1] === c; })) t++; }); return [c, t]; });
    cs.sort(function (a, b) { return b[1] - a[1]; });
    var html = '<option value="">Every place</option>';
    cs.forEach(function (ct) {
      var ks = Object.keys(byC[ct[0]]);
      if (ks.length === 1 && P[ks[0]][0] === ct[0]) { html += '<option value="' + ks[0] + '">' + esc(ct[0]) + ' (' + ct[1] + ')</option>'; return; }
      html += '<optgroup label="' + esc(ct[0]) + '"><option value="c:' + esc(ct[0]) + '">All of ' + esc(ct[0]) + ' (' + ct[1] + ')</option>' +
        ks.sort(function (a, b) { return n[b] - n[a]; }).map(function (k) { return '<option value="' + k + '">' + esc(P[k][0]) + ' (' + n[k] + ')</option>'; }).join('') + '</optgroup>';
    });
    html += '<option value="global">No single place</option>';
    $('ir-place').innerHTML = html;
  }
  function drawState() {
    $('ir-place').value = S.nowhere ? 'global' : S.place;
    if ($('ir-place').value !== (S.nowhere ? 'global' : S.place)) $('ir-place').value = '';
  }
  function say(t, clear) {
    var el = $('ir-said');
    el.innerHTML = t ? esc(t) + (clear ? ' <button type="button" data-clear>Clear</button>' : '') : '';
  }
  function clearAll() {
    S.q = ''; S.tp = []; S.place = ''; S.kind = ''; S.top = false; S.nowhere = false; S.sort = 'new'; S.from = 0; S.to = buckets.length - 1;
    $('ir-q').value = ''; $('ir-from').value = 0; $('ir-to').value = S.to;
    say('');
    render();
  }

  /* ------------------------------------------------------------ the address keeps the view, so a view can be sent */
  function writeUrl() {
    if (!history.replaceState) return;
    var q = [];
    if (S.q) q.push('q=' + encodeURIComponent(S.q));
    if (S.tp.length) q.push('topic=' + S.tp.join('.'));
    if (S.nowhere) q.push('place=global'); else if (S.place) q.push('place=' + encodeURIComponent(S.place));
    if (S.kind) q.push('kind=' + S.kind);
    if (S.top) q.push('top=1');
    if (!fullRange()) q.push('from=' + buckets[S.from] + '&to=' + buckets[S.to]);
    if (S.sort !== 'new') q.push('sort=' + S.sort);
    history.replaceState(null, '', location.pathname + (q.length ? '?' + q.join('&') : '') + location.hash);
  }
  function readUrl() {
    var u = new URLSearchParams(location.search);
    S.q = (u.get('q') || '').slice(0, 120);
    S.tp = (u.get('topic') || '').split('.').filter(function (x) { return x !== '' && topics[+x]; }).map(Number);
    var p = u.get('place') || '';
    if (p === 'global') S.nowhere = true; else if (p.indexOf('c:') === 0 || p.split(',').every(function (k) { return P[k]; })) S.place = p;
    if (['video', 'post', 'article', 'doc'].indexOf(u.get('kind')) >= 0) S.kind = u.get('kind');
    S.top = u.get('top') === '1';
    if (['old', 'top'].indexOf(u.get('sort')) >= 0) S.sort = u.get('sort');
    var f = buckets.indexOf(u.get('from')), t = buckets.indexOf(u.get('to'));
    if (f >= 0 && t >= 0) { S.from = Math.min(f, t); S.to = Math.max(f, t); $('ir-from').value = S.from; $('ir-to').value = S.to; }
    $('ir-q').value = S.q;
  }

  /* ------------------------------------------------------------ ask: plain words in, filters out, one sentence back */
  var PLACE_WORDS = [
    [/\b(north(ern)? gaza|jabalia|beit hanoun|beit lahia)\b/, 'north-gaza'], [/\bgaza city\b|\bshifa\b/, 'gaza-city'], [/\bkhan ?y[ou]+nis\b/, 'khan-younis'], [/\brafah\b/, 'rafah'],
    [/\bnova\b|\bre'?im\b|\bfestival\b/, 'nova'], [/\bkibbutz|be'?eri|kfar aza|nir oz|sderot|envelope\b/, 'oct7-envelope'],
    [/\bgaza(n|ns)?\b/, 'c:Gaza'], [/\bwest bank|judea|samaria\b/, 'c:West Bank'], [/\bjenin\b/, 'jenin'], [/\bramallah|palestinian authority|\bpa\b|abbas\b/, 'ramallah'],
    [/\bjerusalem\b/, 'jerusalem'], [/\btel aviv\b/, 'tel-aviv'], [/\bisrael(i|is)?\b/, 'c:Israel'],
    [/\blebanon|beirut|hezbollah\b/, 'c:Lebanon'], [/\bsyria|damascus\b/, 'c:Syria'], [/\bsweida|druze\b/, 'sweida'], [/\bdoha|qatar(i)?\b/, 'c:Qatar'], [/\biran(ian)?|tehran|irgc\b/, 'c:Iran'],
    [/\byemen|houthi/, 'c:Yemen'], [/\begypt|cairo\b/, 'c:Egypt'], [/\bjordan\b/, 'c:Jordan'], [/\bsaudi\b/, 'c:Saudi Arabia'], [/\bturkey|erdogan\b/, 'c:Turkey'],
    [/\b(uk|britain|british|england|london|bbc)\b/, 'c:United Kingdom'], [/\bireland|irish|dublin\b/, 'c:Ireland'], [/\bfrance|french|paris\b/, 'c:France'], [/\bgerman(y)?|berlin\b/, 'c:Germany'],
    [/\bhague|icj|icc\b/, 'the-hague'], [/\bgeneva|human rights council|\bwho\b/, 'geneva'], [/\bun headquarters|general assembly|security council\b/, 'un-ny'],
    [/\bcampus(es)?|universit(y|ies)|college|columbia|harvard\b/, 'us-campus'], [/\bnew york|nyc\b/, 'new-york'], [/\bwashington|congress|white house\b/, 'washington'],
    [/\b(us|usa|america(n)?|united states)\b/, 'c:United States'], [/\bcanada|toronto\b/, 'c:Canada'], [/\baustralia|sydney\b/, 'c:Australia'], [/\bsouth africa\b/, 'c:South Africa']];
  var TOPIC_WORDS = [
    [/\bhamas\b|\bterror(ist|ists)?\b|tunnel|human shield|hostage/, 'Hamas'], [/\bgenocid/, 'The genocide claim'], [/\bfamine|starv|hunger|aid\b|ghf\b/, 'The famine claim'],
    [/\bmedia|press|bbc|cnn|nyt|new york times|reporter|journalis[mt]\b|news\b/, 'Media bias'], [/\bun\b|unrwa|ngo|amnesty|elite|united nations/, 'UN, NGOs and elites'],
    [/own words|horse'?s mouth|admit|confess|they say/, 'In their own words'], [/blood libel|debunk|myth|lie(s)?\b/, 'Blood libels debunked'], [/propaganda|bot(s)?\b|influence|al ?jazeera/, 'Propaganda networks'],
    [/pallywood|staged|fake|actor|crisis actor|doll/, 'Staged footage'], [/\bstats?\b|statistic|numbers|data\b|chart|figures|casualt/, 'Data and numbers'], [/histor|1948|1967|nakba|mandate/, 'History'],
    [/islamis|jihad|radical islam|sharia|caliphate/, 'Radical Islam'], [/child (soldier|fighter)|children (fight|soldier)|kids with guns/, 'Child fighters'], [/journalist/, 'Journalists'],
    [/double standard|hypocris/, 'Double standards'], [/\bqatar/, 'Qatar'], [/\biran/, 'Iran'], [/campus|academi|professor|universit/, 'Campuses'], [/far.right|nazi|fascis/, 'Far-right extremism'],
    [/jewish voice|anti.?zionist jew|neturei/, 'Anti-Israel Jewish voices'], [/in context|out of context|quote/, 'Israeli quotes in context'], [/israel and the us|us aid|us.israel|american aid/, 'Israel and the US']];
  var STOP = /\b(happened|happen|happening|going|at|say|said|says|told|tell|show|me|give|find|get|all|any|the|a|an|of|about|on|for|in|from|with|that|which|what|is|are|was|were|i|want|need|please|some|can|you|to|and|or|by|it|this|these|those|evidence|proof|proves|prove|items?|things?|stuff|posts?|anything|everything|related|showing|where|who|how|did|do|does|uses?|using|used|has|have|had|they|their|them)\b/g;
  function ask(text) {
    var raw = String(text || '').trim().slice(0, 200);
    if (!raw) { clearAll(); return; }
    var t = ' ' + raw.toLowerCase().replace(/[“”"’]/g, "'") + ' ', said = [];
    var ns = { q: '', tp: [], place: '', kind: '', top: false, nowhere: false, sort: 'new', from: 0, to: buckets.length - 1 };
    var eat = function (rx) { t = t.replace(rx, ' '); };
    // time
    var n = buckets.length - 1, m;
    if (/since (the )?(october 7|oct\.? 7|7 oct(ober)?|the massacre|the war)/.test(t)) { ns.from = 1; eat(/since (the )?(october 7(th)?|oct\.? 7|7 oct(ober)?|the massacre|the war)/); said.push('since 7 October'); }
    else if (/(past|last) (30 days|month)|this month|recent(ly)?|latest|newest/.test(t)) { ns.from = n; eat(/(past|last) (30 days|month)|this month|recent(ly)?|latest|newest/); said.push('from the past month'); }
    else if (/(past|last) (12 months|year)|this year/.test(t)) { ns.from = Math.max(1, n - 11); eat(/(past|last) (12 months|year)|this year/); said.push('from the past year'); }
    else if ((m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (20\d\d)\b/.exec(t))) {
      var k = m[2] + '-' + ('0' + (MON.map(function (x) { return x.toLowerCase(); }).indexOf(m[1]) + 1)).slice(-2), bi = buckets.indexOf(k);
      if (bi > 0) { ns.from = ns.to = bi; said.push('from ' + bLabel(bi)); } eat(m[0]);
    } else if ((m = /\b(?:since|after) (20\d\d)\b/.exec(t))) {
      var a = buckets.indexOf(m[1] + '-01'); ns.from = a > 0 ? a : 1; eat(m[0]); said.push('since ' + m[1]);
    } else if ((m = /\b(?:in |during )?(20\d\d)\b/.exec(t))) {
      var y = m[1], f = -1, l = -1;
      buckets.forEach(function (b, i) { if (b.slice(0, 4) === y) { if (f < 0) f = i; l = i; } });
      if (+y < 2023) { f = l = 0; }
      if (f >= 0) { ns.from = f; ns.to = l; said.push(+y < 2023 ? 'from before October 2023' : 'from ' + y); }
      eat(m[0]);
    }
    // kind and quality
    if (/\b(videos?|clips?|footage|watch|interviews?)\b/.test(t)) { ns.kind = 'video'; eat(/\b(videos?|clips?|footage|watch|interviews?)\b/g); }
    else if (/\barticles?|reports?|stor(y|ies)\b/.test(t)) { ns.kind = 'article'; eat(/\barticles?|reports?|stor(y|ies)\b/g); }
    else if (/\bdocuments?|pdfs?|papers?\b/.test(t)) { ns.kind = 'doc'; eat(/\bdocuments?|pdfs?|papers?\b/g); }
    if (/\b(best|strongest|top|indisputable|killer|most convincing|undeniable|hardest hitting)\b/.test(t)) { ns.sort = 'top'; eat(/\b(best|strongest|top|indisputable|killer|most convincing|undeniable|hardest hitting)\b/g); }
    // places
    for (var i = 0; i < PLACE_WORDS.length; i++) {
      if (PLACE_WORDS[i][0].test(t)) {
        var v = PLACE_WORDS[i][1];
        if (v.indexOf('c:') === 0 || P[v]) { ns.place = v; }
        break;
      }
    }
    // topics: the word stays in the search too when it is a thing (hospital), not a topic name
    TOPIC_WORDS.forEach(function (tw) { var ix = topics.indexOf(tw[1]); if (ix >= 0 && tw[0].test(t) && ns.tp.indexOf(ix) < 0 && ns.tp.length < 2) ns.tp.push(ix); });
    // a topic the place already says (Qatar, Iran) is not asked twice
    if (ns.place === 'us-campus') ns.tp = ns.tp.filter(function (ix) { return topics[ix] !== 'Campuses'; });
    ns.tp = ns.tp.filter(function (ix) { return !(ns.place && (topics[ix] === 'Qatar' || topics[ix] === 'Iran') && ns.place.toLowerCase().indexOf(topics[ix].toLowerCase()) >= 0); });
    // what is left is searched for, word by word, after the words that only steer were taken out
    PLACE_WORDS.forEach(function (pw) { if (pw[1] === ns.place) eat(new RegExp(pw[0].source, 'g')); });
    TOPIC_WORDS.forEach(function (tw) { if (ns.tp.indexOf(topics.indexOf(tw[1])) >= 0) eat(new RegExp('\\b(' + tw[1].toLowerCase().replace(/[^a-z ]/g, '') + ')\\b', 'g')); });
    var rest = t.replace(STOP, ' ').replace(/[^a-z0-9֐-ۿ' -]/g, ' ').replace(/\s+/g, ' ').trim();
    // the words that named a topic or a place already filter; a word like "hospital" keeps searching
    var steer = /^(there|here|no|not|isnt|wasnt|arent|any|very|really|just|lies|lie|lying|liar|liars|myth|myths|debunked|debunk|best|top|strongest|hamas|genocide|genocidal|famine|starvation|starving|media|un|ngos?|propaganda|pallywood|staged|fake|data|stats|statistics|numbers|history|historical|campus|campuses|journalists?|gaza|gazans?|israel|israeli|israelis|iran|iranian|qatar|qatari|lebanon|syria|uk|us|usa|america|american|britain|british|jihad|islamist|radical|islam|claim|claims|terror|terrorists?)$/;
    ns.q = rest.split(' ').filter(function (w) { return w.length > 2 && !steer.test(w); }).slice(0, 4).join(' ');
    S.q = ns.q; S.tp = ns.tp; S.place = ns.place; S.kind = ns.kind; S.top = false; S.nowhere = false; S.sort = ns.sort; S.from = ns.from; S.to = ns.to;
    $('ir-from').value = S.from; $('ir-to').value = S.to;
    render();
    // Nothing found: widen one step at a time, and say what was let go, so a reader is never left at an empty list.
    var count = function () { return items.filter(function (it) { return pass(it); }).length; }, let_go = [];
    if (!count() && S.q) {
      var ws = S.q.split(' '), best = '', bn = 0, all = S.q;
      ws.forEach(function (w) { S.q = w; var c = count(); if (c > bn) { bn = c; best = w; } });
      S.q = best;
      let_go.push('"' + (best ? all.replace(best, '').trim() : all) + '"');
    }
    // A word that is searched for already says what it is about: when the topic it suggested hides most of what the word
    // finds ("Al Jazeera", "hostages"), the word alone wins.
    if (S.q && S.tp.length) { var withT = count(), keep = S.tp; S.tp = []; if (count() <= withT * 2) S.tp = keep; }
    if (!count() && S.kind) { let_go.push({ video: 'videos only', article: 'articles only', doc: 'documents only', post: 'posts only' }[S.kind]); S.kind = ''; }
    if (!count() && S.tp.length > 1) S.tp = S.tp.slice(0, 1);
    if (!count() && !fullRange()) { let_go.push('the time'); said = []; S.from = 0; S.to = buckets.length - 1; $('ir-from').value = 0; $('ir-to').value = S.to; }
    if (!count() && S.tp.length) { let_go.push('the topic'); S.tp = []; }
    render();
    var kindW = { video: 'videos', article: 'articles', doc: 'documents', post: 'posts' }[S.kind] || (shown.length === 1 ? 'item' : 'items');
    var parts = [shown.length + ' ' + kindW];
    if (S.tp.length) parts.push('on ' + S.tp.map(function (x) { var w = topics[x]; return /^(Hamas|UN|Qatar|Iran|Israel|Anti-Israel)\b/.test(w) ? w : w.charAt(0).toLowerCase() + w.slice(1); }).join(' or '));
    if (S.q) parts.push('that mention "' + S.q + '"');
    if (S.place) parts.push('in ' + (S.place.indexOf('c:') === 0 ? S.place.slice(2) : placeName(S.place)));
    parts = parts.concat(said);
    var line = parts.join(' ') + '.';
    if (S.sort === 'top') line += ' Top picks first.';
    if (let_go.length) line = 'Nothing matched all of it, so I let go of ' + let_go.join(' and ') + '. ' + line;
    if (!shown.length || (let_go.length && shown.length === items.length)) line = 'Nothing in the bank matches that yet. Try a place, a topic or a year, like: videos from Gaza in 2024.';
    say(line, true);
    if (S.place && shown.length) focusPlace(S.place);
    $('ir-items').scrollTop = 0;
  }
  function focusPlace(v) {
    var ks = v.indexOf('c:') === 0 ? Object.keys(P).filter(function (k) { return P[k][1] === v.slice(2) && P[k][2] != null; }) : v.split(',');
    ks = ks.filter(function (k) { return P[k] && P[k][2] != null; });
    if (!ks.length) return;
    var q = ks.map(function (k) { return proj(P[k][3], P[k][2]); });
    var minx = Math.min.apply(null, q.map(function (a) { return a[0]; })), maxx = Math.max.apply(null, q.map(function (a) { return a[0]; }));
    var miny = Math.min.apply(null, q.map(function (a) { return a[1]; })), maxy = Math.max.apply(null, q.map(function (a) { return a[1]; }));
    var span = Math.max(maxx - minx, (maxy - miny) * 1.6, 2);
    flyTo(Math.min(40, Math.max(2, box.clientWidth * 0.5 / (span * base.s))), (minx + maxx) / 2, (miny + maxy) / 2);
  }

  /* ------------------------------------------------------------ the spotlight */
  function openSpot(i) {
    var it = shown[i]; if (!it) return;
    spotAt = i;
    var y = ytId(it.u), dlg = $('ir-spot');
    var srcName = it.src === 'Document' ? 'the document' : it.src.indexOf('.') > 0 ? it.src : it.src;
    var chips = (it.q ? '<span class="q">&#9733; Top pick</span>' : '') + (it.g ? '<span class="gr">Graphic footage</span>' : '') +
      it.tp.map(function (t) { return '<span>' + esc(topics[t]) + '</span>'; }).join('');
    var when = it.d ? fmtDate(it.d) + (it.ds === 'said' ? ' (the date it shows)' : '') : 'No date on it';
    dlg.innerHTML = '<div class="ir-s-in">' +
      '<div class="ir-s-top"><span>' + (i + 1) + ' of ' + shown.length + '</span><button class="ir-s-x" type="button" data-x aria-label="Close">&times;</button></div>' +
      '<h2 id="ir-spot-t">' + esc(it.t) + '</h2>' +
      '<p class="ir-s-m"><b>' + esc(when) + '</b> · ' + esc([placeName(it.p)].concat((it.a || []).map(placeName)).join(', ')) + ' · ' + esc(it.h ? it.h + ' on ' + it.src : it.src) + '</p>' +
      (chips ? '<div class="ir-s-c">' + chips + '</div>' : '') +
      (y ? '<div class="ir-s-v" style="background-image:url(https://i.ytimg.com/vi/' + y + '/hqdefault.jpg)"><button type="button" data-play="' + y + '" aria-label="Play it here"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button></div>' : '') +
      (it.n ? '<p class="ir-s-n">' + esc(it.n) + '</p>' : '') +
      (it.o ? '<p class="ir-s-o">In the bank: ' + esc(it.o) + '</p>' : '') +
      '<div class="ir-s-a"><a class="ir-s-open" href="' + esc(it.u) + '" target="_blank" rel="noopener">Open on ' + esc(srcName) + '</a>' +
      (it.p !== 'global' ? '<button class="ir-s-b" type="button" data-map>Show on the map</button>' : '') +
      '<div class="ir-s-nav"><button type="button" data-step="-1" aria-label="Previous"' + (i ? '' : ' disabled') + '>&larr;</button><button type="button" data-step="1" aria-label="Next"' + (i < shown.length - 1 ? '' : ' disabled') + '>&rarr;</button></div></div>' +
      '</div>';
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    [].forEach.call($('ir-items').querySelectorAll('.ir-card'), function (li) { li.classList.toggle('on', li.firstChild && +li.firstChild.getAttribute('data-i') === i); });
  }
  function closeSpot() { var d = $('ir-spot'); spotAt = -1; if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); } d.innerHTML = ''; }
  function pulseAt(k) {
    var q = proj(P[k][3], P[k][2]);
    flyTo(Math.max(T.k, 6), q[0], q[1]);
    setTimeout(function () { pinData.forEach(function (m) { if (m.keys.indexOf(k) >= 0) m.pulse = 1; }); drawPinsKeep(); }, 700);
  }
  function drawPinsKeep() {          // redraw the circles without re-merging, so a pulse survives
    var html = gPins.innerHTML; void html;
    var g = gPins.querySelectorAll('.ir-pin');
    [].forEach.call(g, function (el) { var m = pinData[+el.getAttribute('data-p')]; if (m && m.pulse) { var c = document.createElementNS(SVGNS, 'circle'); c.setAttribute('class', 'pulse'); c.setAttribute('r', '10'); el.insertBefore(c, el.firstChild); m.pulse = 0; } });
  }

  /* ------------------------------------------------------------ stream mode */
  function stream(on) {
    var h = document.documentElement;
    if (on === undefined) on = !h.classList.contains('ir-show');
    h.classList.toggle('ir-show', on);
    $('ir-stream').querySelector('span').textContent = on ? 'Leave stream view' : 'Show on stream';
    if (on && h.requestFullscreen && !document.fullscreenElement) h.requestFullscreen().catch(function () {});
    if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    setTimeout(function () { fit(); setT(T.k, T.x, T.y); }, 80);
  }

  /* ------------------------------------------------------------ wiring */
  function wire() {
    $('ir-ask').addEventListener('submit', function (ev) { ev.preventDefault(); ask($('ir-q').value); $('ir-q').blur(); });
    $('ir-q').addEventListener('search', function () { if (!$('ir-q').value) clearAll(); });
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      var mic = $('ir-mic'), rec = null; mic.hidden = false;
      mic.addEventListener('click', function () {
        if (rec) { rec.stop(); return; }
        try { rec = new SR(); } catch (e) { mic.hidden = true; return; }
        rec.lang = document.documentElement.lang || 'en'; rec.interimResults = true; rec.maxAlternatives = 1;
        mic.classList.add('on'); say('Listening. Say what you are looking for.');
        rec.onresult = function (ev) { var s = ''; for (var i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript; $('ir-q').value = s; if (ev.results[ev.results.length - 1].isFinal) ask(s); };
        rec.onerror = function (ev) { say(ev.error === 'not-allowed' ? 'The microphone is blocked for this site. Type it instead.' : 'I did not catch that. Try again, or type it.'); };
        rec.onend = function () { mic.classList.remove('on'); rec = null; };
        rec.start();
      });
    }
    root.addEventListener('click', function (ev) {
      var t = ev.target.closest ? ev.target : ev.target.parentNode;
      var b;
      if ((b = t.closest('[data-clear]'))) { clearAll(); return; }
      if ((b = t.closest('.ir-chip'))) {
        var v = b.getAttribute('data-t');
        if (v === '') S.tp = []; else { v = +v; var at = S.tp.indexOf(v); if (at >= 0) S.tp.splice(at, 1); else S.tp.push(v); }
        say(''); render(); return;
      }
      if ((b = t.closest('#ir-kind button'))) { S.kind = b.getAttribute('data-k'); render(); return; }
      if ((b = t.closest('#ir-top'))) { S.top = !S.top; render(); return; }
      if ((b = t.closest('#ir-stream'))) { stream(); return; }
      if ((b = t.closest('#ir-nowhere'))) { S.nowhere = !S.nowhere; S.place = ''; render(); return; }
      if ((b = t.closest('#ir-zoom button'))) {
        var z = b.getAttribute('data-z');
        if (z === 'home') flyTo(1, W / 2, world.top + world.h / 2);
        else zoomAt(z === 'in' ? 1.8 : 1 / 1.8, box.clientWidth / 2, box.clientHeight / 2);
        return;
      }
      if ((b = t.closest('#ir-pre button'))) {
        var p = b.getAttribute('data-pre'), n = buckets.length - 1;
        if (playing) play();
        setRange(p === 'oct7' ? 1 : p === 'year' ? Math.max(1, n - 11) : p === 'month' ? n : 0, n);
        return;
      }
      if ((b = t.closest('#ir-play'))) { play(); return; }
      if ((b = t.closest('#ir-more'))) { limit += PAGE_N; $('ir-items').insertAdjacentHTML('beforeend', shown.slice(limit - PAGE_N, limit).map(function (it, j) { return card(it, limit - PAGE_N + j); }).join('')); $('ir-more').hidden = shown.length <= limit; $('ir-more').textContent = 'Show ' + Math.min(PAGE_N, shown.length - limit) + ' more of ' + (shown.length - limit); return; }
      if ((b = t.closest('.ir-card button'))) { openSpot(+b.getAttribute('data-i')); return; }
    });
    $('ir-place').addEventListener('change', function () {
      var v = this.value;
      S.nowhere = v === 'global'; S.place = v === 'global' ? '' : v;
      render();
      if (S.place) focusPlace(S.place);
    });
    $('ir-sort').addEventListener('change', function () { S.sort = this.value; render(); });
    ['ir-from', 'ir-to'].forEach(function (id) {
      $(id).addEventListener('input', function () { if (playing) play(); var a = +$('ir-from').value, b = +$('ir-to').value; S.from = Math.min(a, b); S.to = Math.max(a, b); render(); });
    });
    var dlg = $('ir-spot');
    dlg.addEventListener('click', function (ev) {
      if (ev.target === dlg) { closeSpot(); return; }
      var b = ev.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-x')) closeSpot();
      else if (b.hasAttribute('data-step')) openSpot(spotAt + (+b.getAttribute('data-step')));
      else if (b.hasAttribute('data-play')) { var v = b.parentNode; v.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-play') + '?autoplay=1&rel=0" title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>'; }
      else if (b.hasAttribute('data-map')) { var k = shown[spotAt].p; closeSpot(); pulseAt(k); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    });
    dlg.addEventListener('cancel', function () { spotAt = -1; setTimeout(function () { dlg.innerHTML = ''; }, 0); });
    document.addEventListener('keydown', function (ev) {
      if (dlg.open && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) { var s = spotAt + (ev.key === 'ArrowRight' ? 1 : -1); if (s >= 0 && s < shown.length) openSpot(s); }
      if (ev.key === 'Escape' && document.documentElement.classList.contains('ir-show') && !dlg.open) stream(false);
      if (ev.target === document.body || (ev.target.closest && ev.target.closest('.ir-mapbox'))) {
        if (ev.key === '+' || ev.key === '=') zoomAt(1.5, box.clientWidth / 2, box.clientHeight / 2);
        if (ev.key === '-') zoomAt(1 / 1.5, box.clientWidth / 2, box.clientHeight / 2);
      }
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.closest && ev.target.closest('.ir-pin')) { ev.preventDefault(); openPin(pinAt(ev.target)); }
    });
    document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.documentElement.classList.contains('ir-show')) stream(false); });
    map.addEventListener('pointerdown', onDown);
    map.addEventListener('pointermove', onMove);
    map.addEventListener('pointerup', onUp);
    map.addEventListener('pointercancel', onUp);
    map.addEventListener('pointerleave', function () { $('ir-tip').hidden = true; });
    map.addEventListener('wheel', function (ev) { ev.preventDefault(); var r = box.getBoundingClientRect(); zoomAt(Math.exp(-ev.deltaY * (ev.deltaMode ? 0.05 : 0.0018)), ev.clientX - r.left, ev.clientY - r.top); }, { passive: false });
    var rt = 0;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { var c = (box.clientWidth / 2 - base.ox - T.x) / (base.s * T.k), d = (box.clientHeight / 2 - base.oy - T.y) / (base.s * T.k) + world.top; fit(); var s = base.s * T.k; setT(T.k, box.clientWidth / 2 - base.ox - c * s, box.clientHeight / 2 - base.oy - (d - world.top) * s); }, 120); });
  }

  /* ------------------------------------------------------------ start */
  Promise.all([fetch(root.getAttribute('data-src')).then(function (r) { if (!r.ok) throw r; return r.json(); }),
               fetch(root.getAttribute('data-geo')).then(function (r) { if (!r.ok) throw r; return r.json(); })]).then(function (res) {
    D = res[0]; items = D.items; P = D.places; topics = D.topics;
    gLand = document.createElementNS(SVGNS, 'g'); gPins = document.createElementNS(SVGNS, 'g');
    map.appendChild(gLand); map.appendChild(gPins);
    drawWorld(res[1]);
    $('ir-kind').innerHTML = KINDS.map(function (k) { return '<button type="button" data-k="' + k[0] + '" aria-pressed="false">' + k[1] + '</button>'; }).join('');
    fillPlaces();
    makeBuckets();
    readUrl();
    $('ir-bar').hidden = false; $('ir-time').hidden = false; $('ir-zoom').hidden = false;
    fit();
    // a phone's box is near square: open on the Middle East and Europe, where most of the bank is
    if (box.clientWidth < 700) { var q = proj(28, 38); setT(1, 0, 0); var s = base.s * 3.2; setT(3.2, box.clientWidth / 2 - base.ox - q[0] * s, box.clientHeight / 2 - base.oy - (q[1] - world.top) * s); }
    else setT(1, 0, 0);
    wire();
    render();
    if (S.place) focusPlace(S.place);
    root.setAttribute('data-ready', '1');
    setTimeout(function () { var h = $('ir-maphint'); if (h) h.hidden = true; }, 6000);
  }).catch(function () {
    $('ir-maphint').textContent = 'The map could not load. The newest items are listed here.';
  });
})();
