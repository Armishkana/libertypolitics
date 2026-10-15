/* The Intel Room (intel/). Everything the page does: three lenses on one map (the last 24 hours, the bank, what readers
   sent and is not checked yet), the map (drag, pinch, scroll and the buttons zoom it), the circles (one per place, merged
   when they would touch; the last 24 hours pulse, hotter ones faster), the timeline (the bank only: two handles, four
   presets, play), the topics, the place, the kind, top picks, explainers, saved views, the list, the spotlight (one item,
   big, with arrows to the next and a way to say it is weak), the ask box, adding a find (a mission report, see intel.py),
   copy notes, the tour and full screen. Data: data/intel.json (build/intel_data.py), data/intel-live.json
   (build/intel_live.py), the readers' finds over plain REST. Words: build/intel.py and this file. Nothing is sent
   anywhere except a find the reader sends, through community.js. */
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
  var TOUR_MS = 12000;
  var MISSION = { find: 'send-intel', mine: 'send-your-own' };
  var XP = { find: +root.getAttribute('data-xp-find') || 40, mine: +root.getAttribute('data-xp-own') || 90 };
  // The map's own country names for the places' countries, where the two differ.
  var TOPO = { 'Gaza': 'Palestine', 'West Bank': 'Palestine', 'United States': 'United States of America' };
  var KINDS = [['', 'All'], ['video', 'Videos'], ['post', 'Posts'], ['article', 'Articles'], ['doc', 'Documents and data']];
  var LENS = { live: 'Last 24 hours', bank: 'The bank', readers: 'From readers' };
  var SORTS = { live: [['hot', 'Hottest first'], ['new', 'Newest first']], bank: [['new', 'Newest first'], ['old', 'Oldest first'], ['top', 'Top picks first']], readers: [['new', 'Newest first']] };

  var D, BANK = [], LIVE = [], RD = [], LIVE_AT = 0, items = [], P, topics, buckets = [];
  var S = { lens: 'bank', q: '', tp: [], place: '', kind: '', top: false, edu: false, from: 0, to: 0, sort: 'new', nowhere: false };
  var shown = [], limit = PAGE_N, spotAt = -1, world = null, hiLoaded = false, rdState = 'idle';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } return v; }
  function sstore(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } return v; }
  function ago(ms) {
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 36) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
  }
  function fmtDate(d) {
    if (!d) return 'No date';
    if (d.length > 10) { var ms = Date.parse(d); return isNaN(ms) ? d.slice(0, 10) : ago(ms); }
    var p = d.split('-');
    if (p.length === 3) return (+p[2]) + ' ' + MON[+p[1] - 1] + ' ' + p[0];
    if (p.length === 2) return MON[+p[1] - 1] + ' ' + p[0];
    return p[0];
  }
  function monthOf(d) { return d.length >= 7 ? d.slice(0, 7) : d.slice(0, 4) + '-06'; }
  function placeName(k) { return (P[k] || ['No single place'])[0]; }
  function ytId(u) { var m = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/.exec(u || ''); return m ? m[1] : ''; }
  function kindOf(it) { return it.k === 'document' || it.k === 'data' ? 'doc' : it.k; }
  function hostOf(u) { var m = /^https?:\/\/([^\/?#]+)/i.exec(u || ''); return m ? m[1].toLowerCase().replace(/^(www|m|mobile)\./, '') : ''; }
  function srcOf(u) {
    var h = hostOf(u);
    if (/(^|\.)(x|twitter)\.com$/.test(h)) return 'X';
    if (/youtu\.?be/.test(h)) return 'YouTube';
    if (/^t\.me$/.test(h)) return 'Telegram';
    if (/facebook\.com$|fb\.watch$/.test(h)) return 'Facebook';
    if (/instagram\.com$/.test(h)) return 'Instagram';
    if (/tiktok\.com$/.test(h)) return 'TikTok';
    if (/rumble\.com$/.test(h)) return 'Rumble';
    if (/\.pdf($|\?)/i.test(u || '')) return 'Document';
    return h || 'Link';
  }
  // One address for one thing, so the same clip sent twice (x.com and twitter.com, a link with tracking on it) is found.
  function norm(u) {
    var y = ytId(u); if (y) return 'yt:' + y;
    var m = /^https?:\/\/([^\/?#]+)([^?#]*)/i.exec(String(u || '').trim());
    if (!m) return String(u || '').trim().toLowerCase();
    var h = m[1].toLowerCase().replace(/^(www|m|mobile)\./, '').replace(/^twitter\.com$/, 'x.com');
    var path = m[2].replace(/\/+$/, '').toLowerCase();
    var st = /^\/[^\/]+\/status\/(\d+)/.exec(path); if (h === 'x.com' && st) return 'x:' + st[1];
    return h + path;
  }
  function flame() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-7 1-9.5z"/></svg>'; }
  function hotTag(it) { return it.hot != null ? '<span class="hot" style="--h:' + Math.max(4, it.hot) + '%" title="' + esc(it.hotWhy || '') + '">' + flame() + '<b class="num">' + it.hot + '</b> Hot</span>' : ''; }

  /* ------------------------------------------------------------ the projection (the same as build time) */
  var W = 2000, SC = W / (2 * Math.PI * 0.8707);
  function proj(lon, lat) {
    var l = lon * Math.PI / 180, p = lat * Math.PI / 180, p2 = p * p, p4 = p2 * p2;
    var x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * p2 * (0.003971 - 0.001529 * p2)));
    var y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
    return [x * SC + W / 2, -y * SC];
  }

  /* ------------------------------------------------------------ the three lenses */
  function setOf(l) { return l === 'live' ? LIVE : l === 'readers' ? RD : BANK; }
  function liveFresh() { return LIVE.length >= 5 && LIVE_AT && Date.now() - LIVE_AT < 6 * 3600000; }
  function liveShown() { return LIVE.length > 0 && LIVE_AT && Date.now() - LIVE_AT < 48 * 3600000; }
  function useLens(l, quiet) {
    if (!LENS[l] || (l === 'live' && !liveShown())) l = 'bank';
    S.lens = l; items = setOf(l);
    S.sort = SORTS[l][0][0];          // each lens opens on its own order (hottest, newest); the address can still name another
    var hint = $('ir-maphint');
    if (hint) hint.textContent = l === 'live' ? 'The last 24 hours. Tap a circle to see what happened there.' : l === 'readers' ? 'Finds readers sent, not checked yet.' : BANK.length + ' items in the bank. Tap a gold circle.';
    $('ir-sort').innerHTML = SORTS[l].map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('');
    $('ir-sort').value = S.sort;
    root.setAttribute('data-shows', l);
    $('ir-time').hidden = l !== 'bank';
    $('ir-top').hidden = l !== 'bank';
    fillPlaces();
    if (!quiet) { stopTour(); render(); if (!S.place) frameShown(); }
  }
  function drawLens() {
    var el = $('ir-lens'), html = '';
    ['live', 'bank', 'readers'].forEach(function (l) {
      if (l === 'live' && !liveShown()) return;
      var n = setOf(l).length, on = S.lens === l;
      var sub = l === 'live' ? (LIVE_AT ? 'updated ' + ago(LIVE_AT) : '') : l === 'readers' ? (rdState === 'loading' ? 'loading' : 'being checked') : 'checked';
      html += '<button type="button" role="tab" class="ir-lens-' + l + '" data-lens="' + l + '" aria-selected="' + on + '">' +
        (l === 'live' ? '<i class="ir-live-dot" aria-hidden="true"></i>' : '') + '<b>' + LENS[l] + '</b> <span class="num">' + n + '</span><small>' + esc(sub) + '</small></button>';
    });
    el.innerHTML = html; el.hidden = false;
    $('ir-kick-l').textContent = S.lens === 'live' && liveFresh() ? 'Live' : '';
  }
  function liveNote() {
    var el = $('ir-livenote');
    if (S.lens === 'live') {
      el.innerHTML = 'The last 24 hours, read every hour from public news and video feeds' + (LIVE_AT ? ', last ' + esc(ago(LIVE_AT)) : '') + '. <b>Hot</b> is measured: how many different outlets carry a story, or how fast a video is being watched. Seen something that should be here? <a href="#add">Add it</a>.';
      el.hidden = false;
    } else if (S.lens === 'readers') {
      el.innerHTML = 'What readers sent in that I have not checked yet. A find goes on the map, with its sender\'s name, once it is checked. <a href="#add">Add yours</a>.';
      el.hidden = false;
    } else el.hidden = true;
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
  function keysOf(it) { return [it.p].concat(it.a || []); }
  function inPlace(it) {
    if (S.nowhere) return it.p === 'global';
    if (!S.place) return true;
    var keys = keysOf(it);
    if (S.place.indexOf('c:') === 0) {
      var c = S.place.slice(2);
      return keys.some(function (k) { return P[k] && P[k][1] === c; });
    }
    var want = S.place.split(',');
    return keys.some(function (k) { return want.indexOf(k) >= 0; });
  }
  function words(it) {
    if (!it._w) it._w = (it.t + ' ' + (it.n || '') + ' ' + (it.o || '') + ' ' + (it.h || '') + ' ' + (it.by || '') + ' ' + it.src + ' ' + placeName(it.p) + ' ' + (P[it.p] ? P[it.p][1] : '') + ' ' +
      (it.tp || []).map(function (i) { return topics[i]; }).join(' ')).toLowerCase();
    return it._w;
  }
  function pass(it, skip) {
    if (skip !== 'tp' && S.tp.length && !S.tp.some(function (t) { return (it.tp || []).indexOf(t) >= 0; })) return false;
    if (skip !== 'kind' && S.kind && kindOf(it) !== S.kind) return false;
    if (S.top && S.lens === 'bank' && !it.q) return false;
    if (S.edu && !it.edu) return false;
    if (skip !== 'place' && !inPlace(it)) return false;
    if (S.lens === 'bank' && skip !== 'time' && !fullRange()) { var b = bucketOf(it); if (b < S.from || b > S.to) return false; }
    if (S.q) {
      var w = words(it), terms = S.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (w.indexOf(terms[i]) < 0) return false;
    }
    return true;
  }
  function sortList(a) {
    var by = function (x, y) { return (y.d || y.sent || '').toString().localeCompare((x.d || x.sent || '').toString()); };
    if (S.lens === 'readers') by = function (x, y) { return (y.ms || 0) - (x.ms || 0); };
    if (S.sort === 'old') by = function (x, y) { return (x.d || '9999').localeCompare(y.d || '9999'); };
    if (S.sort === 'top') { var nb = by; by = function (x, y) { return ((y.q || 0) - (x.q || 0)) || nb(x, y); }; }
    if (S.sort === 'hot') { var nh = by; by = function (x, y) { return ((y.hot || 0) - (x.hot || 0)) || nh(x, y); }; }
    return a.sort(function (x, y) { return ((x.x || 0) - (y.x || 0)) || by(x, y); });      // an unlabelled post goes last, whatever the order
  }

  /* ------------------------------------------------------------ everything that redraws */
  function render(keepSpot) {
    shown = sortList(items.filter(function (it) { return pass(it); }));
    limit = PAGE_N;
    drawLens();
    drawList();
    drawPins();
    drawCountries();
    if (S.lens === 'bank') drawBars();
    drawChips();
    drawState();
    drawLegend();
    liveNote();
    writeUrl();
    if (!keepSpot && $('ir-spot').open) closeSpot();
  }

  function badges(it) {
    var b = '';
    if (it.q) b += ' · <span class="q">&#9733; Top pick</span>';
    if (it.g) b += ' · <span class="gr">Graphic</span>';
    if (it.edu) b += ' · <span class="ed">Explainer</span>';
    if (it.own) b += ' · <span class="own">Creator\'s own</span>';
    if (it.by) b += ' · <span class="by">Sent by ' + esc(it.by) + '</span>';
    if (it.pend) b += ' · <span class="pend">Being checked</span>';
    return b;
  }
  function thumb(it) {
    var y = ytId(it.u);
    if (it.th || y) return '<span class="ir-th yt" style="background-image:url(' + esc(it.th || 'https://i.ytimg.com/vi/' + y + '/mqdefault.jpg') + ')"></span>';
    var s = it.src === 'Telegram' ? 'TG' : it.src === 'Document' ? 'DOC' : it.src === 'Facebook' ? 'FB' : it.src === 'Instagram' ? 'IG' : it.src === 'News' ? 'NEWS' : (it.src || '').length > 9 ? 'WEB' : it.src;
    return '<span class="ir-th">' + esc(s) + '</span>';
  }
  function card(it, i) {
    var where = it.p === 'global' && it.pw ? it.pw : placeName(it.p);
    var meta = '<span>' + esc(it.pend && !it.d ? 'Sent ' + ago(it.ms) : fmtDate(it.d)) + '</span> · ' + esc(where) + ' · ' + esc(it.h || it.src) + badges(it);
    return '<li class="ir-card' + (i === spotAt ? ' on' : '') + (it.hot != null ? ' is-live' : '') + '"><button type="button" data-i="' + i + '">' + thumb(it) +
      '<span><span class="ir-c-t">' + esc(it.t) + '</span><span class="ir-c-m">' + meta + '</span>' + hotTag(it) + '</span></button></li>';
  }
  function drawList() {
    var ol = $('ir-items');
    if (!shown.length) {
      ol.innerHTML = S.lens === 'readers' && !items.length
        ? '<li class="ir-empty">' + (rdState === 'loading' ? 'Loading what readers sent.' : rdState === 'off' ? 'Readers\' finds show here on the live site.' : 'Nothing waiting to be checked right now.') + '<br><a href="#add">Be the next to add something</a></li>'
        : '<li class="ir-empty">Nothing here matches all of that.<br><button type="button" data-clear>Clear every filter</button></li>';
    } else {
      ol.innerHTML = shown.slice(0, limit).map(card).join('');
    }
    $('ir-more').hidden = shown.length <= limit;
    $('ir-more').textContent = 'Show ' + Math.min(PAGE_N, shown.length - limit) + ' more (' + (shown.length - limit) + ' left)';
    var n = shown.length, w = S.lens === 'live' ? (n === 1 ? 'story' : 'stories') : S.lens === 'readers' ? (n === 1 ? 'find' : 'finds') : (n === 1 ? 'item' : 'items');
    $('ir-count').innerHTML = '<b class="num">' + n + '</b> ' + w + (n === items.length ? (S.lens === 'bank' ? ' in the bank' : S.lens === 'live' ? ' in 24 hours' : ' waiting') : ' match');
    $('ir-copy').hidden = !n; $('ir-tour').hidden = !n;
  }

  /* ------------------------------------------------------------ the map */
  var map = $('ir-map'), box = $('ir-mapbox'), gLand, gGrid, gPins, T = { k: 1, x: 0, y: 0 }, base = { s: 1, ox: 0, oy: 0 }, paths = {};
  function fit() {
    var cw = box.clientWidth, ch = box.clientHeight;
    var s = Math.min(cw / W, ch / world.h);
    base.s = s; base.ox = (cw - W * s) / 2; base.oy = (ch - world.h * s) / 2;
  }
  function scr(X, Y) { var s = base.s * T.k; return [base.ox + (X * s) + T.x, base.oy + (Y - world.top) * s + T.y]; }
  function setT(k, x, y) {
    var cw = box.clientWidth, ch = box.clientHeight;
    k = Math.max(1, Math.min(MAXK, k));
    var s = base.s * k, mw = W * s, mh = world.h * s;
    // keep some of the world on screen: the map cannot be thrown away
    x = Math.max(cw - base.ox - mw - cw * 0.3, Math.min(-base.ox + cw * 0.3, x));
    y = Math.max(ch - base.oy - mh - ch * 0.3, Math.min(-base.oy + ch * 0.3, y));
    T.k = k; T.x = x; T.y = y;
    var tr = 'translate(' + (base.ox + T.x) + ' ' + (base.oy + T.y) + ') scale(' + s + ') translate(0 ' + (-world.top) + ')';
    gLand.setAttribute('transform', tr); gGrid.setAttribute('transform', tr);
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
    var cw = box.clientWidth, ch = box.clientHeight;
    var k0 = T.k, x0 = T.x, y0 = T.y, t0 = performance.now(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700;
    cancelAnimationFrame(anim);
    var landed = 0;
    (function step(now) {
      var t = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - t, 3);
      var k_ = Math.exp(Math.log(k0) + (Math.log(k) - Math.log(k0)) * e);      // zoom in log space so the move feels even
      var s0 = base.s * k0, sk = base.s * k_;
      var c0x = (cw / 2 - base.ox - x0) / s0, c0y = (ch / 2 - base.oy - y0) / s0 + world.top;
      var mx = c0x + (cx - c0x) * e, my = c0y + (cy - c0y) * e;
      setT(k_, cw / 2 - base.ox - mx * sk, ch / 2 - base.oy - (my - world.top) * sk);
      if (t < 1) anim = requestAnimationFrame(step);
      else landed = 1;
    })(t0);
    // A tab in the background gets no animation frames: the move must still land where it was going.
    var mine = anim;
    setTimeout(function () { if (!landed && anim === mine) { cancelAnimationFrame(anim); var sk = base.s * k; setT(k, cw / 2 - base.ox - cx * sk, ch / 2 - base.oy - (cy - world.top) * sk); } }, dur + 120);
  }
  function drawGrid() {
    // Lines of latitude and longitude every 15 degrees: the sea reads as a globe laid flat, not as a black box.
    var d = '', lon, lat, q, i;
    for (lon = -180; lon <= 180; lon += 15) { for (lat = -80, i = 0; lat <= 84; lat += 4, i++) { q = proj(lon, lat); d += (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); } }
    for (lat = -75; lat <= 75; lat += 15) { for (lon = -180, i = 0; lon <= 180; lon += 5, i++) { q = proj(lon, lat); d += (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); } }
    var p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); p.setAttribute('class', 'gr');
    var eq = document.createElementNS(SVGNS, 'path'), e0 = proj(-180, 0), e1 = proj(180, 0);
    eq.setAttribute('d', 'M' + e0[0] + ' ' + e0[1] + 'L' + e1[0] + ' ' + e1[1]); eq.setAttribute('class', 'gr eq');
    gGrid.innerHTML = ''; gGrid.appendChild(p); gGrid.appendChild(eq);
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
    // Each country glows by how much of what is shown is about it: four steps of the brand's gold, never a new colour.
    var n = {}, sel = {}, max = 0;
    (S.lens === 'readers' ? [] : shown).forEach(function (it) { var seen = {}; keysOf(it).forEach(function (k) { if (P[k] && P[k][1]) { var c = TOPO[P[k][1]] || P[k][1]; if (!seen[c]) { seen[c] = 1; n[c] = (n[c] || 0) + 1; } } }); });
    Object.keys(n).forEach(function (c) { if (n[c] > max) max = n[c]; });
    if (S.place.indexOf('c:') === 0) sel[TOPO[S.place.slice(2)] || S.place.slice(2)] = 1;
    Object.keys(paths).forEach(function (c) {
      var r = n[c] ? n[c] / max : 0, h = !r ? '' : r > 0.6 ? ' h4' : r > 0.3 ? ' h3' : r > 0.1 ? ' h2' : ' h1';
      paths[c].forEach(function (p) { p.setAttribute('class', 'c' + (sel[c] ? ' sel' : h)); });
    });
  }

  // One circle per place; places whose circles would overlap at this zoom become one circle.
  var pinData = [];
  function pinR(n) { return Math.min(30, 9 + 3.2 * Math.sqrt(n)); }
  function drawPins() {
    if (!world || !gPins) return;
    // A find nobody has checked yet is listed, never put on the map: the map is what holds up.
    if (S.lens === 'readers') { gPins.innerHTML = ''; pinData = []; $('ir-nowhere').hidden = true; return; }
    var counts = {}, hot = {};
    items.forEach(function (it) { if (pass(it, 'place')) keysOf(it).forEach(function (k) { if (k !== 'global' && P[k] && P[k][2] != null) { counts[k] = (counts[k] || 0) + 1; if ((it.hot || 0) > (hot[k] || 0)) hot[k] = it.hot; } }); });
    var nw = items.filter(function (it) { return it.p === 'global' && pass(it, 'place'); }).length;
    var b = $('ir-nowhere'); b.hidden = !nw && !S.nowhere; b.textContent = 'No single place (' + nw + ')'; b.setAttribute('aria-pressed', S.nowhere ? 'true' : 'false');
    var sel = S.place && S.place.indexOf('c:') !== 0 ? S.place.split(',') : [];
    var pts = Object.keys(counts).map(function (k) { var q = proj(P[k][3], P[k][2]), s = scr(q[0], q[1]); return { keys: [k], n: counts[k], hot: hot[k] || 0, x: s[0], y: s[1], wx: q[0], wy: q[1] }; });
    pts.sort(function (a, b) { return b.n - a.n; });
    var merged = [];
    pts.forEach(function (p) {
      for (var i = 0; i < merged.length; i++) {
        var m = merged[i], dx = m.x - p.x, dy = m.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < pinR(m.n) + pinR(p.n) - 4) { m.keys = m.keys.concat(p.keys); m.n += p.n; m.hot = Math.max(m.hot, p.hot); return; }
      }
      merged.push({ keys: p.keys.slice(), n: p.n, hot: p.hot, x: p.x, y: p.y, wx: p.wx, wy: p.wy });
    });
    pinData = merged;
    var cw = box.clientWidth, ch = box.clientHeight, html = '', live = S.lens === 'live', rd = S.lens === 'readers';
    merged.forEach(function (m, i) {
      if (m.x < -40 || m.y < -40 || m.x > cw + 40 || m.y > ch + 40) return;
      var r = pinR(m.n), isSel = sel.length && m.keys.some(function (k) { return sel.indexOf(k) >= 0; }), dim = sel.length && !isSel;
      var name = m.keys.length === 1 ? placeName(m.keys[0]) : m.keys.length + ' places';
      var cls = 'ir-pin' + (live ? ' live' + (m.hot >= 70 ? ' hot' : '') : rd ? ' rd' : '') + (isSel ? ' sel' : dim ? ' dim' : '');
      html += '<g class="' + cls + '" data-p="' + i + '" tabindex="0" role="button" aria-label="' + esc(name + ', ' + m.n + (m.n === 1 ? ' item' : ' items')) + '" transform="translate(' + m.x.toFixed(1) + ' ' + m.y.toFixed(1) + ')">' +
        (live ? '<circle class="ring" r="' + r.toFixed(1) + '"/><circle class="ring r2" r="' + r.toFixed(1) + '"/>' : '') +
        (m.pulse ? '<circle class="pulse" r="10"/>' : '') +
        '<circle class="halo" r="' + (r + 9).toFixed(1) + '"/><circle class="core" r="' + r.toFixed(1) + '"/><circle class="shine" r="' + (r * 0.55).toFixed(1) + '" cx="' + (-r * 0.25).toFixed(1) + '" cy="' + (-r * 0.3).toFixed(1) + '"/><text>' + m.n + '</text></g>';
    });
    gPins.innerHTML = html;
  }
  function drawLegend() {
    var el = $('ir-legend'), n = shown.length;
    if (S.lens === 'live') el.innerHTML = '<i class="lg-live"></i> Last 24 hours · <b class="num">' + n + '</b> ' + (n === 1 ? 'story' : 'stories') + (LIVE_AT ? ' · updated ' + esc(ago(LIVE_AT)) : '') + '<span class="lg-s">The faster a circle pulses, the hotter the story</span>';
    else if (S.lens === 'readers') el.innerHTML = '<i class="lg-rd"></i> Sent by readers, being checked · <b class="num">' + n + '</b>';
    else el.innerHTML = '<i class="lg-bank"></i> The bank · <b class="num">' + n + '</b> ' + (n === 1 ? 'item' : 'items') + (fullRange() ? '' : ' · ' + esc($('ir-range').textContent));
    el.hidden = false;
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
    stopTour();
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
    stopTour();
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
    tip.innerHTML = esc(names.length > 3 ? names.slice(0, 3).join(', ') + ' and ' + (names.length - 3) + ' more' : names.join(', ')) + '<small>' + m.n + (m.n === 1 ? ' item. ' : ' items. ') + (m.hot ? 'Hottest ' + m.hot + '. ' : '') + (m.keys.length > 1 ? 'Tap to go closer.' : 'Tap to show them.') + '</small>';
    tip.style.left = m.x + 'px'; tip.style.top = (m.y - pinR(m.n)) + 'px'; tip.hidden = false;
  }

  /* ------------------------------------------------------------ the timeline (the bank) */
  function makeBuckets() {
    var now = new Date(), end = now.getUTCFullYear() + '-' + ('0' + (now.getUTCMonth() + 1)).slice(-2);
    BANK.forEach(function (it) { if (it.d && monthOf(it.d) > end) end = monthOf(it.d); });
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
      out += '<rect' + (i >= S.from && i <= S.to ? ' class="in"' : '') + ' x="' + (i * w + w * 0.14).toFixed(1) + '" y="' + (h - bh).toFixed(1) + '" width="' + (w * 0.72).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="1.5"/>';
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
    items.forEach(function (it) { if (pass(it, 'tp')) (it.tp || []).forEach(function (t) { c[t]++; }); });
    var order = topics.map(function (t, i) { return i; }).filter(function (i) { return c[i] || S.tp.indexOf(i) >= 0; });
    order.sort(function (a, b) { return (S.tp.indexOf(b) >= 0) - (S.tp.indexOf(a) >= 0) || c[b] - c[a]; });
    $('ir-topics').innerHTML = '<button class="ir-chip" type="button" data-t="" aria-pressed="' + (S.tp.length ? 'false' : 'true') + '">Every topic</button>' +
      order.map(function (i) { return '<button class="ir-chip" type="button" data-t="' + i + '" aria-pressed="' + (S.tp.indexOf(i) >= 0) + '">' + esc(topics[i]) + ' <i>' + c[i] + '</i></button>'; }).join('');
    [].forEach.call($('ir-kind').querySelectorAll('button'), function (b) {
      var k = b.getAttribute('data-k');
      b.setAttribute('aria-pressed', k === S.kind ? 'true' : 'false');
      b.hidden = !!k && k !== S.kind && !items.some(function (it) { return kindOf(it) === k; });
    });
    $('ir-top').setAttribute('aria-pressed', S.top ? 'true' : 'false');
    var anyEdu = items.some(function (it) { return it.edu; });
    $('ir-edu').hidden = !anyEdu && !S.edu; $('ir-edu').setAttribute('aria-pressed', S.edu ? 'true' : 'false');
    $('ir-sort').value = S.sort;
  }
  function placeOptions(list, withAll) {
    var byC = {}, n = {};
    list.forEach(function (it) { keysOf(it).forEach(function (k) { if (k === 'global' || !P[k]) return; n[k] = (n[k] || 0) + 1; var c = P[k][1]; (byC[c] = byC[c] || {})[k] = 1; }); });
    var cs = Object.keys(byC).map(function (c) { var t = 0; list.forEach(function (it) { if (keysOf(it).some(function (k) { return P[k] && P[k][1] === c; })) t++; }); return [c, t]; });
    cs.sort(function (a, b) { return b[1] - a[1]; });
    var html = '';
    cs.forEach(function (ct) {
      var ks = Object.keys(byC[ct[0]]);
      if (ks.length === 1 && P[ks[0]][0] === ct[0]) { html += '<option value="' + ks[0] + '">' + esc(ct[0]) + (withAll ? ' (' + ct[1] + ')' : '') + '</option>'; return; }
      html += '<optgroup label="' + esc(ct[0]) + '">' + (withAll ? '<option value="c:' + esc(ct[0]) + '">All of ' + esc(ct[0]) + ' (' + ct[1] + ')</option>' : '') +
        ks.sort(function (a, b) { return n[b] - n[a]; }).map(function (k) { return '<option value="' + k + '">' + esc(P[k][0]) + (withAll ? ' (' + n[k] + ')' : '') + '</option>'; }).join('') + '</optgroup>';
    });
    return html;
  }
  function fillPlaces() {
    $('ir-place').innerHTML = '<option value="">Every place</option>' + placeOptions(items, true) + '<option value="global">No single place</option>';
    drawState();
  }
  function drawState() {
    var want = S.nowhere ? 'global' : S.place;
    $('ir-place').value = want;
    if ($('ir-place').value !== want) $('ir-place').value = '';
  }
  function say(t, clear) {
    var el = $('ir-said');
    el.innerHTML = t ? esc(t) + (clear ? ' <button type="button" data-clear>Clear</button>' : '') : '';
  }
  function clearAll() {
    S.q = ''; S.tp = []; S.place = ''; S.kind = ''; S.top = false; S.edu = false; S.nowhere = false; S.sort = SORTS[S.lens][0][0]; S.from = 0; S.to = buckets.length - 1;
    $('ir-q').value = ''; $('ir-from').value = 0; $('ir-to').value = S.to;
    say('');
    render();
  }

  /* ------------------------------------------------------------ the address keeps the view, so a view can be sent and saved */
  function query() {
    var q = [];
    if (S.lens !== defLens) q.push('lens=' + S.lens);
    if (S.q) q.push('q=' + encodeURIComponent(S.q));
    if (S.tp.length) q.push('topic=' + S.tp.join('.'));
    if (S.nowhere) q.push('place=global'); else if (S.place) q.push('place=' + encodeURIComponent(S.place));
    if (S.kind) q.push('kind=' + S.kind);
    if (S.top) q.push('top=1');
    if (S.edu) q.push('edu=1');
    if (S.lens === 'bank' && !fullRange()) q.push('from=' + buckets[S.from] + '&to=' + buckets[S.to]);
    if (S.sort !== SORTS[S.lens][0][0]) q.push('sort=' + S.sort);
    return q.length ? '?' + q.join('&') : '';
  }
  function writeUrl() {
    if (!history.replaceState) return;
    var h = location.hash === '#add' ? '' : location.hash;
    history.replaceState(null, '', location.pathname + query() + h);
  }
  var defLens = 'bank';
  function readUrl(search) {
    var u = new URLSearchParams(search);
    useLens(u.get('lens') || defLens, true);
    S.q = (u.get('q') || '').slice(0, 120);
    S.tp = (u.get('topic') || '').split('.').filter(function (x) { return x !== '' && topics[+x]; }).map(Number);
    var p = u.get('place') || '';
    S.place = ''; S.nowhere = false;
    if (p === 'global') S.nowhere = true; else if (p.indexOf('c:') === 0 || (p && p.split(',').every(function (k) { return P[k]; }))) S.place = p;
    S.kind = ['video', 'post', 'article', 'doc'].indexOf(u.get('kind')) >= 0 ? u.get('kind') : '';
    S.top = u.get('top') === '1'; S.edu = u.get('edu') === '1';
    if (SORTS[S.lens].some(function (s) { return s[0] === u.get('sort'); })) S.sort = u.get('sort');
    S.from = 0; S.to = buckets.length - 1;
    var f = buckets.indexOf(u.get('from')), t = buckets.indexOf(u.get('to'));
    if (f >= 0 && t >= 0) { S.from = Math.min(f, t); S.to = Math.max(f, t); }
    $('ir-from').value = S.from; $('ir-to').value = S.to;
    $('ir-q').value = S.q;
  }

  /* ------------------------------------------------------------ saved views: a reader's own dashboards, on this device */
  var VKEY = 'ir-views';
  function views() { var v = store(VKEY); return Array.isArray(v) ? v.filter(function (x) { return x && typeof x.n === 'string' && typeof x.q === 'string'; }).slice(0, 12) : []; }
  function drawViews(asking) {
    var el = $('ir-views'), v = views(), html = '';
    if (v.length) html += '<span class="ir-v-l">Your views</span>' + v.map(function (x, i) { return '<span class="ir-v"><button type="button" data-view="' + i + '">' + esc(x.n) + '</button><button type="button" class="ir-v-x" data-unview="' + i + '" aria-label="Forget the view ' + esc(x.n) + '">&times;</button></span>'; }).join('');
    if (asking) html += '<form class="ir-v-f" id="ir-v-f"><label class="vh" for="ir-v-n">Name this view</label><input id="ir-v-n" maxlength="32" placeholder="Name it, e.g. Gaza videos this year" required><button type="submit">Save</button><button type="button" data-v-cancel>Cancel</button></form>';
    el.innerHTML = html; el.hidden = !html;
    if (asking) setTimeout(function () { var i = $('ir-v-n'); if (i) i.focus(); }, 30);
  }
  function saveView(name) {
    var v = views().filter(function (x) { return x.n !== name; });
    v.unshift({ n: name.slice(0, 32), q: query() || '?lens=' + S.lens });
    store(VKEY, v.slice(0, 12));
    drawViews();
    say('Saved on this device as "' + name + '". Tap it any time to come back to exactly this.');
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
    stopTour();
    var t = ' ' + raw.toLowerCase().replace(/[“”"’]/g, "'") + ' ', said = [];
    var ns = { q: '', tp: [], place: '', kind: '', sort: SORTS[S.lens][0][0], from: 0, to: buckets.length - 1 };
    var eat = function (rx) { t = t.replace(rx, ' '); };
    // "today", "breaking", "right now": the last 24 hours, when there is a feed
    if (/\b(today|breaking|right now|last 24|past 24|24 hours|this morning|tonight|live)\b/.test(t) && liveShown()) { if (S.lens !== 'live') useLens('live', true); ns.sort = 'hot'; eat(/\b(today|breaking|right now|last 24 hours|past 24 hours|24 hours|this morning|tonight|live|news)\b/g); said.push('in the last 24 hours'); }
    // time (the bank's timeline)
    var n = buckets.length - 1, m;
    if (S.lens === 'bank') {
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
    }
    // kind and quality
    if (/\b(videos?|clips?|footage|watch|interviews?)\b/.test(t)) { ns.kind = 'video'; eat(/\b(videos?|clips?|footage|watch|interviews?)\b/g); }
    else if (/\barticles?|reports?|stor(y|ies)\b/.test(t)) { ns.kind = 'article'; eat(/\barticles?|reports?|stor(y|ies)\b/g); }
    else if (/\bdocuments?|pdfs?|papers?\b/.test(t)) { ns.kind = 'doc'; eat(/\bdocuments?|pdfs?|papers?\b/g); }
    if (/\b(best|strongest|top|indisputable|killer|most convincing|undeniable|hardest hitting|hottest|biggest)\b/.test(t)) { ns.sort = S.lens === 'live' ? 'hot' : S.lens === 'bank' ? 'top' : ns.sort; eat(/\b(best|strongest|top|indisputable|killer|most convincing|undeniable|hardest hitting|hottest|biggest)\b/g); }
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
    if (ns.place === 'us-campus') ns.tp = ns.tp.filter(function (ix) { return topics[ix] !== 'Campuses'; });
    ns.tp = ns.tp.filter(function (ix) { return !(ns.place && (topics[ix] === 'Qatar' || topics[ix] === 'Iran') && ns.place.toLowerCase().indexOf(topics[ix].toLowerCase()) >= 0); });
    PLACE_WORDS.forEach(function (pw) { if (pw[1] === ns.place) eat(new RegExp(pw[0].source, 'g')); });
    TOPIC_WORDS.forEach(function (tw) { if (ns.tp.indexOf(topics.indexOf(tw[1])) >= 0) eat(new RegExp('\\b(' + tw[1].toLowerCase().replace(/[^a-z ]/g, '') + ')\\b', 'g')); });
    var rest = t.replace(STOP, ' ').replace(/[^a-z0-9֐-ۿ' -]/g, ' ').replace(/\s+/g, ' ').trim();
    var steer = /^(there|here|no|not|isnt|wasnt|arent|any|very|really|just|lies|lie|lying|liar|liars|myth|myths|debunked|debunk|best|top|strongest|hamas|genocide|genocidal|famine|starvation|starving|media|un|ngos?|propaganda|pallywood|staged|fake|data|stats|statistics|numbers|history|historical|campus|campuses|journalists?|gaza|gazans?|israel|israeli|israelis|iran|iranian|qatar|qatari|lebanon|syria|uk|us|usa|america|american|britain|british|jihad|islamist|radical|islam|claim|claims|terror|terrorists?|news|hot)$/;
    ns.q = rest.split(' ').filter(function (w) { return w.length > 2 && !steer.test(w); }).slice(0, 4).join(' ');
    S.q = ns.q; S.tp = ns.tp; S.place = ns.place; S.kind = ns.kind; S.top = false; S.nowhere = false; S.sort = ns.sort; S.from = ns.from; S.to = ns.to;
    if (!SORTS[S.lens].some(function (s) { return s[0] === S.sort; })) S.sort = SORTS[S.lens][0][0];
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
    if (S.q && S.tp.length) { var withT = count(), keep = S.tp; S.tp = []; if (count() <= withT * 2) S.tp = keep; }
    if (!count() && S.kind) { let_go.push({ video: 'videos only', article: 'articles only', doc: 'documents only', post: 'posts only' }[S.kind]); S.kind = ''; }
    if (!count() && S.tp.length > 1) S.tp = S.tp.slice(0, 1);
    if (!count() && S.lens === 'bank' && !fullRange()) { let_go.push('the time'); said = []; S.from = 0; S.to = buckets.length - 1; $('ir-from').value = 0; $('ir-to').value = S.to; }
    if (!count() && S.tp.length) { let_go.push('the topic'); S.tp = []; }
    render();
    var noun = S.lens === 'live' ? (shown.length === 1 ? 'story' : 'stories') : (shown.length === 1 ? 'item' : 'items');
    var kindW = { video: 'videos', article: 'articles', doc: 'documents', post: 'posts' }[S.kind] || noun;
    var parts = [shown.length + ' ' + kindW];
    if (S.tp.length) parts.push('on ' + S.tp.map(function (x) { var w = topics[x]; return /^(Hamas|UN|Qatar|Iran|Israel|Anti-Israel)\b/.test(w) ? w : w.charAt(0).toLowerCase() + w.slice(1); }).join(' or '));
    if (S.q) parts.push('that mention "' + S.q + '"');
    if (S.place) parts.push('in ' + (S.place.indexOf('c:') === 0 ? S.place.slice(2) : placeName(S.place)));
    parts = parts.concat(said);
    var line = parts.join(' ') + '.';
    if (S.sort === 'top') line += ' Top picks first.';
    if (S.sort === 'hot') line += ' Hottest first.';
    if (let_go.length) line = 'Nothing matched all of it, so I let go of ' + let_go.join(' and ') + '. ' + line;
    if (!shown.length || (let_go.length && shown.length === items.length)) line = 'Nothing here matches that yet. Try a place, a topic or a year, like: videos from Gaza in 2024. Or add what is missing.';
    say(line, true);
    if (S.place && shown.length) focusPlace(S.place);
    $('ir-items').scrollTop = 0;
  }
  // Frame what is shown: the smallest view that holds every circle, with room round it, never closer than a region.
  function frameShown() {
    if (!world) return;
    var q = [];
    shown.forEach(function (it) { keysOf(it).forEach(function (k) { if (P[k] && P[k][2] != null) q.push(proj(P[k][3], P[k][2])); }); });
    if (!q.length) { flyTo(1, W / 2, world.top + world.h / 2); return; }
    var xs = q.map(function (a) { return a[0]; }), ys = q.map(function (a) { return a[1]; });
    var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
    var cw = box.clientWidth, ch = box.clientHeight, pad = 1.5;
    var k = Math.max(1, Math.min(4, Math.min(cw / ((maxx - minx || 200) * pad * base.s), ch / ((maxy - miny || 120) * pad * base.s))));
    flyTo(k, (minx + maxx) / 2, (miny + maxy) / 2);
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
    var srcName = it.src === 'Document' ? 'the document' : it.src === 'News' ? (it.h || 'the news site') : it.src;
    var chips = (it.hot != null ? '<span class="hotc">' + flame() + 'Hot ' + it.hot + '</span>' : '') + (it.q ? '<span class="q">&#9733; Top pick</span>' : '') + (it.g ? '<span class="gr">Graphic footage</span>' : '') +
      (it.edu ? '<span class="ed">Explainer</span>' : '') + (it.own ? '<span class="own">Creator\'s own</span>' : '') + (it.pend ? '<span class="pend">Being checked</span>' : '') +
      (it.tp || []).map(function (t) { return '<span>' + esc(topics[t]) + '</span>'; }).join('');
    var when = it.d ? fmtDate(it.d) + (it.ds === 'said' ? ' (the date it shows)' : '') : it.pend ? 'Sent ' + ago(it.ms) : 'No date on it';
    var where = [it.p === 'global' && it.pw ? it.pw : placeName(it.p)].concat((it.a || []).map(placeName)).join(', ');
    var by = it.by ? ' · sent by ' + esc(it.by) : '';
    dlg.innerHTML = '<div class="ir-s-in">' +
      '<div class="ir-s-top"><span>' + esc(LENS[S.lens]) + ' · ' + (i + 1) + ' of ' + shown.length + '</span><button class="ir-s-x" type="button" data-x aria-label="Close">&times;</button></div>' +
      '<h2 id="ir-spot-t">' + esc(it.t) + '</h2>' +
      '<p class="ir-s-m"><b>' + esc(when) + '</b> · ' + esc(where) + ' · ' + esc(it.h && it.src !== 'News' ? it.h + ' on ' + it.src : it.h || it.src) + by + '</p>' +
      (chips ? '<div class="ir-s-c">' + chips + '</div>' : '') +
      (it.hotWhy ? '<p class="ir-s-o">Why it is hot: ' + esc(it.hotWhy) + (it.also && it.also.length ? '. Also carried by ' + esc(it.also.join(', ')) : '') + '.</p>' : '') +
      (y ? '<div class="ir-s-v" style="background-image:url(https://i.ytimg.com/vi/' + y + '/hqdefault.jpg)"><button type="button" data-play="' + y + '" aria-label="Play it here"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button></div>' : '') +
      (it.n ? '<p class="ir-s-n">' + esc(it.n) + '</p>' : '') +
      (it.o ? '<p class="ir-s-o">In the bank: ' + esc(it.o) + '</p>' : '') +
      (it.pend ? '<p class="ir-s-o">A reader sent this in. It is not checked yet, so it is not on the map: open it with that in mind.</p>' : '') +
      '<div class="ir-s-a"><a class="ir-s-open" href="' + esc(it.u) + '" target="_blank" rel="noopener">Open on ' + esc(srcName) + '</a>' +
      (it.p !== 'global' ? '<button class="ir-s-b" type="button" data-map>Show on the map</button>' : '') +
      '<div class="ir-s-nav"><button type="button" data-step="-1" aria-label="Previous"' + (i ? '' : ' disabled') + '>&larr;</button><button type="button" data-step="1" aria-label="Next"' + (i < shown.length - 1 ? '' : ' disabled') + '>&rarr;</button></div></div>' +
      '<p class="ir-s-f">Weak, wrong, or missing context? <a href="#feedback" data-kind="wrong" data-about="' + esc(('Intel Room: ' + it.t).slice(0, 78)) + '" data-id="intel-' + esc(String(it.id)) + '" data-on="page:intel" data-close-spot>Say why in the discussion</a>. That is how the room gets better.</p>' +
      '</div>';
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    [].forEach.call($('ir-items').querySelectorAll('.ir-card'), function (li) { li.classList.toggle('on', li.firstChild && +li.firstChild.getAttribute('data-i') === i); });
  }
  function closeSpot() { var d = $('ir-spot'); spotAt = -1; if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); } d.innerHTML = ''; }
  function pulseAt(k) {
    var q = proj(P[k][3], P[k][2]);
    flyTo(Math.max(T.k, 6), q[0], q[1]);
    setTimeout(function () { pinData.forEach(function (m) { if (m.keys.indexOf(k) >= 0) m.pulse = 1; }); drawPinsKeep(); }, 760);
  }
  function drawPinsKeep() {          // redraw the circles without re-merging, so a pulse survives
    var g = gPins.querySelectorAll('.ir-pin');
    [].forEach.call(g, function (el) { var m = pinData[+el.getAttribute('data-p')]; if (m && m.pulse) { var c = document.createElementNS(SVGNS, 'circle'); c.setAttribute('class', 'pulse'); c.setAttribute('r', '10'); el.insertBefore(c, el.firstChild); m.pulse = 0; } });
  }

  /* ------------------------------------------------------------ the tour: one item every 12 seconds, the map flying to it */
  var tourT = 0, tourAt = -1;
  function lowerThird(it) {
    var lt = $('ir-lt');
    if (!it) { lt.hidden = true; lt.innerHTML = ''; return; }
    var y = ytId(it.u), th = it.th || (y ? 'https://i.ytimg.com/vi/' + y + '/mqdefault.jpg' : '');
    lt.innerHTML = (th ? '<span class="ir-lt-th" style="background-image:url(' + esc(th) + ')"></span>' : '') +
      '<span class="ir-lt-b"><span class="ir-lt-k">' + esc(LENS[S.lens]) + (it.hot != null ? ' · <b>' + flame() + 'Hot ' + it.hot + '</b>' : it.q ? ' · <b>&#9733; Top pick</b>' : '') + '</span>' +
      '<span class="ir-lt-t">' + esc(it.t) + '</span><span class="ir-lt-m">' + esc(fmtDate(it.d)) + ' · ' + esc(it.p === 'global' && it.pw ? it.pw : placeName(it.p)) + ' · ' + esc(it.h || it.src) + '</span></span>' +
      '<span class="ir-lt-n num">' + (tourAt + 1) + '/' + Math.min(shown.length, 30) + '</span>';
    lt.hidden = false;
  }
  function tourStep(dir) {
    var n = Math.min(shown.length, 30);
    if (!n) { stopTour(); return; }
    tourAt = (tourAt + (dir || 1) + n) % n;
    var it = shown[tourAt];
    lowerThird(it);
    [].forEach.call($('ir-items').querySelectorAll('.ir-card'), function (li) { li.classList.toggle('on', li.firstChild && +li.firstChild.getAttribute('data-i') === tourAt); });
    var li = $('ir-items').querySelector('.ir-card.on'); if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
    if (it.p !== 'global' && P[it.p] && P[it.p][2] != null) pulseAt(it.p);
  }
  function startTour() {
    if (!shown.length) return;
    closeSpot(); tourAt = -1; tourStep(1);
    clearInterval(tourT); tourT = setInterval(function () { tourStep(1); }, TOUR_MS);
    $('ir-tour').setAttribute('aria-pressed', 'true'); $('ir-tour').querySelector('span').textContent = 'Stop tour';
  }
  function stopTour() {
    if (!tourT && $('ir-lt').hidden) return;
    clearInterval(tourT); tourT = 0; lowerThird(null);
    $('ir-tour').setAttribute('aria-pressed', 'false'); $('ir-tour').querySelector('span').textContent = 'Tour';
  }

  /* ------------------------------------------------------------ full screen, for a stream */
  var clockT = 0;
  function clock() {
    // US Eastern, always: the shows are on Eastern time, and the computer's own clock would say where it is.
    try { $('ir-clock').textContent = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(new Date()) + ' ET'; } catch (e) { $('ir-clock').textContent = ''; }
  }
  function stream(on) {
    var h = document.documentElement;
    if (on === undefined) on = !h.classList.contains('ir-show');
    h.classList.toggle('ir-show', on);
    $('ir-stream').querySelector('span').textContent = on ? 'Leave full screen' : 'Full screen';
    $('ir-stream').setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) { clock(); clockT = setInterval(clock, 15000); } else { clearInterval(clockT); }
    if (on && h.requestFullscreen && !document.fullscreenElement) h.requestFullscreen().catch(function () {});
    if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    setTimeout(function () { refit(); }, 90);
    setTimeout(function () { refit(); }, 400);
  }
  function refit() {
    if (!world) return;
    var c = (box.clientWidth / 2 - base.ox - T.x) / (base.s * T.k), d = (box.clientHeight / 2 - base.oy - T.y) / (base.s * T.k) + world.top;
    var ow = base.s; fit(); if (!isFinite(c) || !ow) { setT(T.k, T.x, T.y); return; }
    var s = base.s * T.k; setT(T.k, box.clientWidth / 2 - base.ox - c * s, box.clientHeight / 2 - base.oy - (d - world.top) * s);
  }

  /* ------------------------------------------------------------ copy notes: the list as text, for show prep */
  function copyNotes() {
    var head = 'Intel Room, ' + LENS[S.lens].toLowerCase() + ($('ir-said').textContent ? ': ' + $('ir-said').textContent.replace(/\s*Clear$/, '') : '') + '\n' + location.href + '\n\n';
    var txt = head + shown.slice(0, 40).map(function (it, i) {
      return (i + 1) + '. ' + it.t + '\n   ' + [fmtDate(it.d), it.p === 'global' && it.pw ? it.pw : placeName(it.p), it.h || it.src, it.hot != null ? 'Hot ' + it.hot + ' (' + (it.hotWhy || '') + ')' : ''].filter(Boolean).join(' · ') + '\n   ' + it.u + (it.n ? '\n   ' + it.n : '');
    }).join('\n\n');
    var done = function () { say('Copied ' + Math.min(40, shown.length) + ' items with their links. Paste them into your show notes.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt, done); });
    else fallbackCopy(txt, done);
  }
  function fallbackCopy(txt, done) {
    var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { say('Copying is blocked in this browser. Select the list and copy it by hand.'); }
    document.body.removeChild(ta);
  }

  /* ------------------------------------------------------------ readers' finds: what was sent and is not checked yet
     A find is a post about quest:send-intel or quest:send-your-own (a mission report). The live ones are read over plain
     REST, like the count of a discussion, so a visitor loads none of Firebase's code for it. One that the bank already
     holds (an accepted find, "r" in intel.json) is left out here. */
  var FIND_KEYS = ['quest:' + MISSION.find, 'quest:' + MISSION.mine];
  function lp(cb, tries) { if (window.LP && window.LP.members && window.LP.quests) { cb(window.LP); return; } if ((tries || 0) > 75) { cb(null); return; } setTimeout(function () { lp(cb, (tries || 0) + 1); }, 200); }
  var FIELD = /^(When|Where|Topics|Explainer|Graphic|Mine):\s*(.*)$/i;
  function parseFind(id, d) {
    var lines = String(d.text || '').split('\n'), what = [], f = {};
    lines.forEach(function (l) { var m = FIELD.exec(l.trim()); if (m) f[m[1].toLowerCase()] = m[2].trim(); else if (l.trim()) what.push(l.trim()); });
    var t = what.join(' ').slice(0, 160) || 'A link a reader sent';
    var it = { id: 'R' + id, rid: id, t: t, u: d.url, src: srcOf(d.url), p: 'global', tp: [], k: ytId(d.url) || d.kind === 'video' ? 'video' : srcOf(d.url) === 'X' || srcOf(d.url) === 'Telegram' ? 'post' : 'article',
      by: d.name || '', own: d.about === FIND_KEYS[1], pend: 1, ms: d.createdAt || 0 };
    if (f.when && /^\d{4}-\d{2}-\d{2}$/.test(f.when)) it.d = f.when;
    if (f.where) {
      var k = Object.keys(P).filter(function (k) { return P[k][0].toLowerCase() === f.where.toLowerCase(); })[0];
      if (k) it.p = k; else it.pw = f.where.slice(0, 60);
    }
    if (f.topics) it.tp = f.topics.split(/\s*·\s*/).map(function (n) { return topics.indexOf(n); }).filter(function (i) { return i >= 0; });
    if (/^yes/i.test(f.explainer || '')) it.edu = 1;
    if (/^yes/i.test(f.graphic || '')) it.g = 1;
    return it;
  }
  function loadReaders() {
    lp(function (L) {
      if (!L || L.off || L.quests.off) { rdState = 'off'; if (S.lens === 'readers') render(); else drawLens(); return; }
      rdState = 'loading'; drawLens();
      var q = { structuredQuery: { from: [{ collectionId: 'posts' }], where: { compositeFilter: { op: 'AND', filters: [
        { fieldFilter: { field: { fieldPath: 'about' }, op: 'IN', value: { arrayValue: { values: FIND_KEYS.map(function (k) { return { stringValue: k }; }) } } } },
        { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'live' } } }] } }, limit: 200 } };
      fetch(L.members.rest('runQuery'), { method: 'POST', body: JSON.stringify(q) }).then(function (r) { if (!r.ok) throw r; return r.json(); }).then(function (got) {
        var inBank = {}, seenU = {};
        BANK.forEach(function (it) { if (it.r) inBank[it.r] = 1; seenU[norm(it.u)] = 1; });
        var list = (Array.isArray(got) ? got : []).filter(function (r) { return r.document; }).map(function (r) {
          var id = r.document.name.split('/').pop(), d = L.members.plain({ mapValue: { fields: r.document.fields || {} } }) || {};
          return d.parent ? null : parseFind(id, d);
        }).filter(function (it) { return it && it.u && !inBank[it.rid] && !seenU[norm(it.u)]; });
        var mineNow = RD.filter(function (it) { return it.fresh; });
        RD.length = 0;
        mineNow.concat(list.filter(function (it) { return !mineNow.some(function (m) { return m.rid === it.rid; }); })).forEach(function (it) { RD.push(it); });
        rdState = 'ok';
        if (S.lens === 'readers') render(); else drawLens();
      }).catch(function () { rdState = 'off'; if (S.lens === 'readers') render(); else drawLens(); });
    });
  }

  /* ------------------------------------------------------------ add to the Intel Room
     The link and one line are all that is asked. Everything else is optional and helps it go up faster. A find made by
     someone else is quest:send-intel; the reader's own work is quest:send-your-own (more XP, and a video sent as theirs
     marks the account a creator). What the reader typed is kept on the device until it is sent, so signing in on the way
     loses nothing. */
  var DKEY = 'ir-add', MAXT = 600;
  function compose(f) {
    var lines = [f.what.trim()];
    if (f.date) lines.push('When: ' + f.date);
    if (f.place) lines.push('Where: ' + f.place);
    if (f.topics.length) lines.push('Topics: ' + f.topics.map(function (i) { return topics[i]; }).join(' · '));
    if (f.edu) lines.push('Explainer: yes');
    if (f.gr) lines.push('Graphic: yes');
    if (f.who === 'mine') lines.push('Mine: yes, I made it');
    return lines.join('\n').slice(0, MAXT);
  }
  function addHtml() {
    var places = placeOptions(BANK, false);
    var today = new Date().toISOString().slice(0, 10);
    return '<form class="ir-a" id="ir-a" novalidate>' +
      '<div class="ir-a-top"><p class="ir-a-k"><span class="ir-a-badge">The main mission</span><span id="ir-a-xp">+' + XP.find + ' XP when it is accepted</span></p><button class="ir-s-x" type="button" data-a-x aria-label="Close">&times;</button></div>' +
      '<h2 id="ir-add-h">Add to the Intel Room</h2>' +
      '<p class="ir-a-lede">Evidence nobody can find does nothing. Send the link, say what it shows, and I check it. Once it is on the map it carries your name, and anyone can use it.</p>' +
      '<div class="ir-a-f"><label for="ir-a-url">The link</label>' +
      '<div class="ir-a-row"><input id="ir-a-url" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="Paste a link: x.com, youtube.com, a news site, a PDF"><button type="button" class="ir-a-paste" id="ir-a-paste" hidden>Paste</button></div>' +
      '<div class="ir-a-prev" id="ir-a-prev" hidden></div></div>' +
      '<fieldset class="ir-a-who"><legend>Whose is it?</legend>' +
      '<label><input type="radio" name="ir-who" value="find" checked><span><b>I found it</b><small>Someone else\'s clip, post, article, document or data</small><i class="num">+' + XP.find + ' XP</i></span></label>' +
      '<label><input type="radio" name="ir-who" value="mine"><span><b>I made it</b><small>My own video, article or research. For creators</small><i class="num">+' + XP.mine + ' XP</i></span></label></fieldset>' +
      '<div class="ir-a-f"><label for="ir-a-what">What does it show? <small>One line, in your own words</small></label>' +
      '<textarea id="ir-a-what" rows="2" maxlength="300" placeholder="Example: Hamas gunmen firing from inside a school in Khan Younis, filmed by a resident"></textarea></div>' +
      '<details class="ir-a-more" id="ir-a-more"><summary>When, where and the topic <small>Optional. It goes up faster with them</small></summary>' +
      '<div class="ir-a-grid"><div class="ir-a-f"><label for="ir-a-date">When it happened</label><input id="ir-a-date" type="date" max="' + today + '"></div>' +
      '<div class="ir-a-f"><label for="ir-a-place">Where</label><select id="ir-a-place"><option value="">Not sure, or no one place</option>' + places + '<option value="other">Somewhere else</option></select><input id="ir-a-where" maxlength="60" placeholder="Where? City and country" hidden></div></div>' +
      '<div class="ir-a-f"><span class="ir-a-lab" id="ir-a-tl">Topics <small>up to three</small></span><div class="ir-a-tops" role="group" aria-labelledby="ir-a-tl">' +
      topics.map(function (n, i) { return '<button type="button" class="ir-chip" data-at="' + i + '" aria-pressed="false">' + esc(n) + '</button>'; }).join('') + '</div></div>' +
      '<label class="ir-a-chk"><input type="checkbox" id="ir-a-edu"><span><b>It is an explainer</b> A lesson, a history, a breakdown of a subject, rather than footage of one moment</span></label>' +
      '<label class="ir-a-chk"><input type="checkbox" id="ir-a-gr"><span><b>It shows graphic violence</b> So it is marked before anyone opens it</span></label></details>' +
      '<p class="ir-a-msg" id="ir-a-msg" aria-live="polite"></p>' +
      '<div class="ir-a-act"><button type="submit" class="ir-a-send" id="ir-a-send">Send it in</button><a class="ir-a-talk" href="#discussion" data-a-x>Rather argue about it? The discussion</a></div>' +
      '<p class="ir-a-fine">Once checked, the link, your line and your name are public. Never send anything that shows a private person\'s face, name or home without their yes, and nothing that tells where someone inside Iran is.</p>' +
      '</form><div class="ir-a-done" id="ir-a-done" hidden></div>';
  }
  function af() {
    var who = (document.querySelector('input[name="ir-who"]:checked') || {}).value || 'find';
    var pv = $('ir-a-place').value, place = pv === 'other' ? $('ir-a-where').value.trim() : pv ? P[pv][0] : '';
    return { url: $('ir-a-url').value.trim(), what: $('ir-a-what').value, who: who, date: $('ir-a-date').value, placeKey: pv, place: place, where: $('ir-a-where').value,
      topics: [].map.call($('ir-add').querySelectorAll('.ir-a-tops [aria-pressed="true"]'), function (b) { return +b.getAttribute('data-at'); }),
      edu: $('ir-a-edu').checked, gr: $('ir-a-gr').checked };
  }
  function keepDraft() { sstore(DKEY, af()); }
  function restoreDraft(d) {
    if (!d) return;
    $('ir-a-url').value = d.url || ''; $('ir-a-what').value = d.what || '';
    var r = document.querySelector('input[name="ir-who"][value="' + (d.who === 'mine' ? 'mine' : 'find') + '"]'); if (r) r.checked = true;
    $('ir-a-date').value = d.date || ''; $('ir-a-place').value = d.placeKey || ''; $('ir-a-where').hidden = d.placeKey !== 'other'; $('ir-a-where').value = d.where || '';
    (d.topics || []).forEach(function (i) { var b = $('ir-add').querySelector('[data-at="' + i + '"]'); if (b) b.setAttribute('aria-pressed', 'true'); });
    $('ir-a-edu').checked = !!d.edu; $('ir-a-gr').checked = !!d.gr;
    if (d.date || d.placeKey || (d.topics || []).length || d.edu || d.gr) $('ir-a-more').open = true;
    whoChanged(); preview();
  }
  function amsg(t, bad) { var m = $('ir-a-msg'); m.innerHTML = t || ''; m.className = 'ir-a-msg' + (bad ? ' bad' : ''); }
  function fixUrl(u) { u = String(u || '').trim(); if (/^(www\.|[a-z0-9-]+\.[a-z]{2,}\/)/i.test(u)) u = 'https://' + u; return u.replace(/^http:\/\//i, 'https://'); }
  var known = null;
  function knownUrls() {
    if (known) return known;
    known = {}; BANK.forEach(function (it) { known[norm(it.u)] = it; }); LIVE.forEach(function (it) { if (!known[norm(it.u)]) known[norm(it.u)] = it; });
    return known;
  }
  function preview() {
    var u = fixUrl($('ir-a-url').value), el = $('ir-a-prev');
    if (!/^https:\/\/[^\s\/<>"']+\.[^\s<>"']+$/.test(u)) { el.hidden = true; el.innerHTML = ''; return null; }
    var y = ytId(u), s = srcOf(u), h = hostOf(u), handle = (/(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status/i.exec(u) || /t\.me\/(?:s\/)?([A-Za-z0-9_]+)\/\d/.exec(u) || [])[1];
    var what = y ? 'A YouTube video' : s === 'X' ? 'A post on X' + (handle ? ' by @' + handle : '') : s === 'Telegram' ? 'A Telegram post' + (handle ? ' from @' + handle : '') :
      s === 'Document' ? 'A document on ' + h : ['Facebook', 'Instagram', 'TikTok', 'Rumble'].indexOf(s) >= 0 ? 'A post on ' + s : 'A page on ' + h;
    var dup = knownUrls()[norm(u)] || RD.filter(function (it) { return norm(it.u) === norm(u); })[0];
    el.innerHTML = (y ? '<span class="ir-th yt" style="background-image:url(https://i.ytimg.com/vi/' + y + '/mqdefault.jpg)"></span>' : '<span class="ir-th">' + esc(s.length > 9 ? 'WEB' : s) + '</span>') +
      '<span><b>' + esc(what) + '</b>' + (dup ? '<em class="dup">' + (dup.pend ? 'Someone already sent this one in. It is being checked.' : 'Already in the room: ' + esc(dup.t)) + '</em>' : '<small>Looks good. Now say what it shows.</small>') + '</span>';
    el.hidden = false;
    return { u: u, dup: dup };
  }
  function whoChanged() {
    var mine = ((document.querySelector('input[name="ir-who"]:checked') || {}).value === 'mine');
    $('ir-a-xp').textContent = '+' + (mine ? XP.mine : XP.find) + ' XP when it is accepted';
    $('ir-a-what').placeholder = mine ? 'Example: My 10 minute breakdown of the casualty numbers from Gaza, with every source on screen' : 'Example: Hamas gunmen firing from inside a school in Khan Younis, filmed by a resident';
  }
  var addOpener = null;
  function openAdd(opener) {
    stopTour(); closeSpot();
    var dlg = $('ir-add');
    if (!dlg.firstChild || $('ir-a-done') && !$('ir-a-done').hidden) { dlg.innerHTML = addHtml(); restoreDraft(sstore(DKEY)); }
    addOpener = opener || null;
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    if (navigator.clipboard && navigator.clipboard.readText && window.isSecureContext) $('ir-a-paste').hidden = false;
    setTimeout(function () { var i = $('ir-a-url'); if (i && !i.value) i.focus(); }, 40);
  }
  function closeAdd() {
    var d = $('ir-add'); if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); }
    if (location.hash === '#add' && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }
  var sending = false;
  function sendAdd() {
    if (sending) return;
    var f = af(), pv = preview(), u = pv && pv.u;
    if (!u) { amsg('Paste the full link first, the one that starts with https://', true); $('ir-a-url').focus(); return; }
    if (pv.dup) { amsg(pv.dup.pend ? 'Someone already sent this link. It will be on the map once it is checked.' : 'This one is already in the room. Find something it does not have yet.', true); return; }
    if (f.what.trim().length < 10) { amsg('Say in one line what it shows, so it can be checked and found.', true); $('ir-a-what').focus(); return; }
    if ($('ir-a-place').value === 'other' && !f.place) { amsg('Write where it is, or pick "Not sure".', true); $('ir-a-where').focus(); return; }
    keepDraft();
    var mid = f.who === 'mine' ? MISSION.mine : MISSION.find;
    sending = true; $('ir-a-send').disabled = true; amsg('Sending...');
    lp(function (L) {
      if (!L || L.off) { sending = false; $('ir-a-send').disabled = false; amsg('Sending is not open on this copy of the site. What you wrote is kept on this device.', true); return; }
      sstore('ir-add-wait', 1);
      // Not signed in: the sign-in panel opens, and a modal form would sit on top of it. Close the form first; it comes
      // back, filled in, the moment they are in (the subscriber in wire()).
      if (!(L.quests.who && L.quests.who())) closeAdd();
      L.quests.report({ about: 'quest:' + mid, subject: ('Intel Room: ' + f.what.trim()).slice(0, 80), text: compose(f), url: u, made: f.who === 'mine' }, $('ir-a-send')).then(function (r) {
        sending = false; $('ir-a-send').disabled = false;
        if (r && r.ok) { sstore('ir-add-wait', null); sstore(DKEY, null); sent(f, u, r.post || {}, mid, L); return; }
        var c = r && r.code;
        if (c === 'lp/signin' || c === 'lp/name') { closeAdd(); amsg('Sign in, and this comes back with what you wrote. Then press Send it in.'); return; }
        sstore('ir-add-wait', null);
        if (c === 'lp/closed') amsg('Sending finds is not open yet. What you wrote is kept on this device; try again later.', true);
        else amsg(esc((r && r.text) || 'That did not go through. Check your connection and press Send it in again. What you wrote is kept.'), true);
      });
    });
  }
  function sent(f, u, post, mid, L) {
    var me = L.who && L.who() || {};
    var it = parseFind(post.id || String(Date.now()), { text: compose(f), url: u, name: me.name || 'You', about: 'quest:' + mid, createdAt: Date.now(), kind: ytId(u) ? 'video' : 'link' });
    it.fresh = 1; RD.unshift(it); known = null;
    drawLens();
    var held = post.status === 'held', xp = mid === MISSION.mine ? XP.mine : XP.find;
    $('ir-a').hidden = true;
    var d = $('ir-a-done');
    d.innerHTML = '<div class="ir-a-top"><p class="ir-a-k"><span class="ir-a-badge">Sent</span></p><button class="ir-s-x" type="button" data-a-x aria-label="Close">&times;</button></div>' +
      '<h2>Thank you. It is in.</h2>' +
      '<p>I check every find, usually within a day: that it opens, and that it shows what you said. Once it is on the map, your name is on it and the <b class="num">' + xp + ' XP</b> is yours. If something is missing, the answer comes under your find and in Replies to you.</p>' +
      (held ? '<p class="ir-a-msg bad">One step left: confirm your email with the link that was sent to you. Until then your find is waiting and only you can see it.</p>' : '') +
      (mid === MISSION.mine ? '<p>You said you made it, so your account is marked as a creator\'s. Keep sending your work: each one that is accepted counts.</p>' : '') +
      '<div class="ir-a-act"><button type="button" class="ir-a-send" data-a-again>Send another</button><button type="button" class="ir-s-b" data-a-see>See it with the other finds</button><a class="ir-a-talk" href="../missions/#' + esc(mid) + '">Your missions</a></div>';
    d.hidden = false;
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
    // Anything on the page that leads to #add opens the form instead of jumping.
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href="#add"]');
      if (!a) return;
      ev.preventDefault(); openAdd(a);
    });
    root.addEventListener('click', function (ev) {
      var t = ev.target.closest ? ev.target : ev.target.parentNode;
      var b;
      if ((b = t.closest('[data-clear]'))) { clearAll(); return; }
      if ((b = t.closest('button[data-lens]'))) { useLens(b.getAttribute('data-lens')); say(''); return; }
      if ((b = t.closest('.ir-chip'))) {
        var v = b.getAttribute('data-t');
        if (v === '') S.tp = []; else { v = +v; var at = S.tp.indexOf(v); if (at >= 0) S.tp.splice(at, 1); else S.tp.push(v); }
        say(''); render(); return;
      }
      if ((b = t.closest('#ir-kind button'))) { S.kind = b.getAttribute('data-k'); render(); return; }
      if ((b = t.closest('#ir-top'))) { S.top = !S.top; render(); return; }
      if ((b = t.closest('#ir-edu'))) { S.edu = !S.edu; render(); return; }
      if ((b = t.closest('#ir-stream'))) { stream(); return; }
      if ((b = t.closest('#ir-save'))) { drawViews(true); return; }
      if ((b = t.closest('[data-view]'))) { var vw = views()[+b.getAttribute('data-view')]; if (vw) { readUrl(vw.q); render(); if (S.place) focusPlace(S.place); say('Showing your view "' + vw.n + '".'); } return; }
      if ((b = t.closest('[data-unview]'))) { var vs = views(); vs.splice(+b.getAttribute('data-unview'), 1); store(VKEY, vs); drawViews(); return; }
      if ((b = t.closest('[data-v-cancel]'))) { drawViews(); return; }
      if ((b = t.closest('#ir-copy'))) { copyNotes(); return; }
      if ((b = t.closest('#ir-tour'))) { if (tourT) stopTour(); else startTour(); return; }
      if ((b = t.closest('#ir-lt'))) { var at2 = tourAt; stopTour(); openSpot(at2); return; }
      if ((b = t.closest('#ir-nowhere'))) { S.nowhere = !S.nowhere; S.place = ''; render(); return; }
      if ((b = t.closest('#ir-zoom button'))) {
        var z = b.getAttribute('data-z');
        if (z === 'full') { stream(); return; }
        stopTour();
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
      if ((b = t.closest('#ir-more'))) { limit += PAGE_N; $('ir-items').insertAdjacentHTML('beforeend', shown.slice(limit - PAGE_N, limit).map(function (it, j) { return card(it, limit - PAGE_N + j); }).join('')); $('ir-more').hidden = shown.length <= limit; $('ir-more').textContent = 'Show ' + Math.min(PAGE_N, shown.length - limit) + ' more (' + (shown.length - limit) + ' left)'; return; }
      if ((b = t.closest('.ir-card button'))) { stopTour(); openSpot(+b.getAttribute('data-i')); return; }
    });
    root.addEventListener('submit', function (ev) {
      if (ev.target.id !== 'ir-v-f') return;
      ev.preventDefault(); var n = ($('ir-v-n').value || '').trim(); if (n) saveView(n);
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
      if (ev.target.closest('[data-close-spot]')) { closeSpot(); return; }      // the discussion link: discussion.js fills the box from it
      var b = ev.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-x')) closeSpot();
      else if (b.hasAttribute('data-step')) openSpot(spotAt + (+b.getAttribute('data-step')));
      else if (b.hasAttribute('data-play')) { var v = b.parentNode; v.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-play') + '?autoplay=1&rel=0" title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>'; }
      else if (b.hasAttribute('data-map')) { var k = shown[spotAt].p; closeSpot(); pulseAt(k); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    });
    dlg.addEventListener('cancel', function () { spotAt = -1; setTimeout(function () { dlg.innerHTML = ''; }, 0); });
    var ad = $('ir-add');
    ad.addEventListener('click', function (ev) {
      if (ev.target === ad) { closeAdd(); return; }
      var b = ev.target.closest('[data-a-x]'); if (b) { if (b.tagName !== 'A') ev.preventDefault(); closeAdd(); return; }
      if (ev.target.closest('[data-a-again]')) { ad.innerHTML = addHtml(); $('ir-a-url').focus(); return; }
      if (ev.target.closest('[data-a-see]')) { closeAdd(); useLens('readers'); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if ((b = ev.target.closest('[data-at]'))) {
        var on = b.getAttribute('aria-pressed') === 'true', n = ad.querySelectorAll('.ir-a-tops [aria-pressed="true"]').length;
        if (!on && n >= 3) { amsg('Three topics at most. Untick one first.', true); return; }
        b.setAttribute('aria-pressed', on ? 'false' : 'true'); amsg(''); keepDraft(); return;
      }
      if (ev.target.closest('#ir-a-paste')) {
        navigator.clipboard.readText().then(function (s) { $('ir-a-url').value = String(s || '').trim().slice(0, 400); preview(); keepDraft(); $('ir-a-what').focus(); }, function () { $('ir-a-paste').hidden = true; amsg('Paste it into the box with a long press, or Ctrl and V.'); });
      }
    });
    ad.addEventListener('input', function (ev) {
      if (ev.target.id === 'ir-a-url') { preview(); amsg(''); }
      if (ev.target.name === 'ir-who') whoChanged();
      keepDraft();
    });
    ad.addEventListener('change', function (ev) {
      if (ev.target.id === 'ir-a-place') { $('ir-a-where').hidden = ev.target.value !== 'other'; if (ev.target.value === 'other') $('ir-a-where').focus(); }
      if (ev.target.name === 'ir-who') whoChanged();
      keepDraft();
    });
    ad.addEventListener('paste', function (ev) { if (ev.target.id === 'ir-a-url') setTimeout(function () { preview(); keepDraft(); if (preview()) $('ir-a-what').focus(); }, 0); });
    ad.addEventListener('submit', function (ev) { ev.preventDefault(); sendAdd(); });
    ad.addEventListener('close', function () { if (location.hash === '#add' && history.replaceState) history.replaceState(null, '', location.pathname + location.search); });
    document.addEventListener('keydown', function (ev) {
      var typing = ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName);
      if (dlg.open && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) { var s = spotAt + (ev.key === 'ArrowRight' ? 1 : -1); if (s >= 0 && s < shown.length) openSpot(s); return; }
      if (!typing && !dlg.open && !ad.open && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
        if (ev.key === 'f' || ev.key === 'F') { stream(); return; }
        if (tourT && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) { tourStep(ev.key === 'ArrowRight' ? 1 : -1); clearInterval(tourT); tourT = setInterval(function () { tourStep(1); }, TOUR_MS); return; }
      }
      if (ev.key === 'Escape' && document.documentElement.classList.contains('ir-show') && !dlg.open && !ad.open) stream(false);
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
    map.addEventListener('wheel', function (ev) { ev.preventDefault(); stopTour(); var r = box.getBoundingClientRect(); zoomAt(Math.exp(-ev.deltaY * (ev.deltaMode ? 0.05 : 0.0018)), ev.clientX - r.left, ev.clientY - r.top); }, { passive: false });
    var rt = 0;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(refit, 120); });
    window.addEventListener('hashchange', function () { if (location.hash === '#add') openAdd(); });
    // Signing in on the way to sending: the form comes back as it was left.
    lp(function (L) { if (L && L.quests && L.quests.sub) L.quests.sub(function () { if (sstore('ir-add-wait') && L.quests.who && L.quests.who()) { sstore('ir-add-wait', null); setTimeout(function () { openAdd(); amsg('You are signed in. Press Send it in.'); }, 400); } }); });
  }

  /* ------------------------------------------------------------ start */
  function normLive(it) {
    // The feed may name a whole country (c:Iran): it is drawn at that country's own place when there is one, else at its
    // first place on the map, and filtered as that country.
    if (typeof it.p === 'string' && it.p.indexOf('c:') === 0) {
      var c = it.p.slice(2), ks = Object.keys(P).filter(function (k) { return P[k][1] === c && P[k][2] != null; });
      var own = ks.filter(function (k) { return P[k][0] === c; })[0];
      it.p = own || ks[0] || 'global';
      if (it.p === 'global') it.pw = c;
    }
    if (!P[it.p]) it.p = 'global';
    it.tp = (it.tp || []).filter(function (i) { return topics[i]; });
    it.id = 'L' + it.id;
    it.k = it.k === 'video' ? 'video' : 'article';
    return it;
  }
  var liveUrl = root.getAttribute('data-live');
  Promise.all([fetch(root.getAttribute('data-src')).then(function (r) { if (!r.ok) throw r; return r.json(); }),
               fetch(root.getAttribute('data-geo')).then(function (r) { if (!r.ok) throw r; return r.json(); }),
               liveUrl ? fetch(liveUrl, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }) : Promise.resolve(null)]).then(function (res) {
    D = res[0]; BANK = D.items; P = D.places; topics = D.topics;
    if (res[2] && Array.isArray(res[2].items)) { LIVE_AT = Date.parse(res[2].at) || 0; LIVE = res[2].items.filter(function (it) { return it && it.u && it.t; }).map(normLive); }
    // The glow behind each circle: gold for the bank and the readers, a warmer white gold for the last 24 hours.
    map.insertAdjacentHTML('afterbegin', '<defs><radialGradient id="irg"><stop offset="0" stop-color="#F4C430" stop-opacity=".5"/><stop offset="1" stop-color="#F4C430" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="irl"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".65"/><stop offset="1" stop-color="#FFB547" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="irs"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>');
    gGrid = document.createElementNS(SVGNS, 'g'); gGrid.setAttribute('class', 'grid');
    gLand = document.createElementNS(SVGNS, 'g'); gPins = document.createElementNS(SVGNS, 'g');
    map.appendChild(gGrid); map.appendChild(gLand); map.appendChild(gPins);
    drawWorld(res[1]); drawGrid();
    $('ir-kind').innerHTML = KINDS.map(function (k) { return '<button type="button" data-k="' + k[0] + '" aria-pressed="false">' + k[1] + '</button>'; }).join('');
    makeBuckets();
    defLens = liveFresh() ? 'live' : 'bank';
    readUrl(location.search);
    $('ir-bar').hidden = false; $('ir-zoom').hidden = false;
    fit();
    // a phone's box is near square: open on the Middle East and Europe, where most of the bank is
    if (box.clientWidth < 700) { var q = proj(28, 38); setT(1, 0, 0); var s = base.s * 3.2; setT(3.2, box.clientWidth / 2 - base.ox - q[0] * s, box.clientHeight / 2 - base.oy - (q[1] - world.top) * s); }
    else setT(1, 0, 0);
    wire();
    render();
    drawViews();
    if (S.place) focusPlace(S.place);
    else if (box.clientWidth >= 700) frameShown();
    // What intel-prep.js (show prep) is handed: what the room shows now, and the room's own words for a date and a place.
    window.IRoom = { shown: function () { return shown.slice(); }, lens: function () { return S.lens; }, said: function () { return $('ir-said').textContent; },
      topicsOn: function () { return S.tp.map(function (i) { return topics[i]; }); }, when: function (it) { return fmtDate(it.d); },
      where: function (it) { return it.p === 'global' && it.pw ? it.pw : placeName(it.p); } };
    if (!document.getElementById('ir-prep-js')) { var ps = document.createElement('script'); ps.id = 'ir-prep-js'; ps.src = root.getAttribute('data-prep') || '../assets/intel-prep.js'; document.body.appendChild(ps); }
    root.setAttribute('data-ready', '1');
    loadReaders();
    if (location.hash === '#add') openAdd();
    setTimeout(function () { var h = $('ir-maphint'); if (h) h.hidden = true; }, 6000);
  }).catch(function () {
    $('ir-maphint').textContent = 'The map could not load. The newest items are listed here.';
  });
})();
