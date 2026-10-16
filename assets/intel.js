/* The Intel Room (intel/). Everything the page does: three lenses on one map (the last 24 hours, the bank, what readers
   sent and is not checked yet), the map (drag, pinch, scroll and the buttons zoom it), the circles (one per place, merged
   when they would touch; the last 24 hours pulse, hotter ones faster), the timeline (the bank only: two handles, four
   presets, play), the topics, the place, the kind, top picks, explainers, saved views, the list, the spotlight (one item,
   big, with arrows to the next and a way to say it is weak), the ask box, adding a find (a mission report, see intel.py),
   copy notes, the tour and full screen. Data: data/intel.json (build/intel_data.py), data/intel-live.json
   (build/intel_live.py), data/intel-reach.json (build/intel_reach.py: each item's likes, views and replies on its own
   platform), the readers' finds over plain REST. Words: build/intel.py and this file. Nothing is sent anywhere except a
   find the reader sends, through community.js.

   16 October 2026 (Armin: "It needs to look like a CIA-like intelligence hub but without violating the theme and brand ...
   Significantly improve the map ... data point in different shapes and maybe colors based on what they are ... screen
   based on social media ... how many likes each one of these has ... sort and screen them based on how hot they are, how
   viral they are, the time, location, topic"): the map is a globe (d3-geo, assets/intel-geo.js) that also lays flat, with
   the real night side; a mark's SHAPE says what it is (video, post, article, document) and its COLOUR where it was posted
   (PF below); places with few items show every item, crowded ones a count with a ring split by platform. Platform, heat,
   viral and the hours of the last 24 are filters; viral, likes and views are orders. VIRAL is measured, never guessed:
   where an item's like count (views on Telegram) ranks among the items of the same platform in the room, 0 to 100. */
(function () {
  'use strict';
  var root = document.getElementById('ir');
  if (!root || !window.fetch) return;
  var $ = function (id) { return document.getElementById(id); };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var FIRST = '2023-10';          // the timeline runs from the month of 7 October; anything older is one bar, "Earlier"
  var PAGE_N = 40;
  var MAXK = 400;          // deep enough that Gaza City, Khan Younis and Rafah come apart
  var TOUR_MS = 12000;
  // Where an item was posted: the key, the name a reader sees, the colour of its marks. The platforms' own colours, toned
  // to sit on the room's black; News is the brand's gold and a website the seal's pale gold, so the chrome stays gold.
  var PF = [['X', 'X', '#ECEAE3'], ['YouTube', 'YouTube', '#FF5348'], ['Telegram', 'Telegram', '#3FAEEA'], ['Instagram', 'Instagram', '#E8467F'],
    ['Facebook', 'Facebook', '#5F8BF2'], ['Threads', 'Threads', '#A88DFF'], ['TikTok', 'TikTok', '#32E3DC'], ['News', 'News', '#F4C430'],
    ['Web', 'Websites', '#D9C68C'], ['Document', 'Documents', '#D08A3C'], ['Other', 'Other video', '#8FC955']];
  var PFC = {}; PF.forEach(function (p) { PFC[p[0]] = p; });
  // What it is: one shape per kind, drawn about 0,0 (the list's thumbnails carry the same mark)
  var SHAPE = { video: 'M-5 -6.2 6.8 0-5 6.2z', post: 'M0 -7 7 0 0 7-7 0z', article: 'M-5.4 -5.4h10.8v10.8h-10.8z', doc: 'M0 -6.8 5.9 -3.4v6.8L0 6.8-5.9 3.4v-6.8z' };
  var KIND_N = { video: 'Video', post: 'Post', article: 'Article', doc: 'Document' };
  var HIDES = { Instagram: 1, Facebook: 1, Threads: 1, TikTok: 1 };          // no public like count without a login: never guessed
  var MISSION = { find: 'send-intel', mine: 'send-your-own' };
  var XP = { find: +root.getAttribute('data-xp-find') || 40, mine: +root.getAttribute('data-xp-own') || 90 };
  // The map's own country names for the places' countries, where the two differ.
  var TOPO = { 'Gaza': 'Palestine', 'West Bank': 'Palestine', 'United States': 'United States of America' };
  var KINDS = [['', 'All'], ['video', 'Videos'], ['post', 'Posts'], ['article', 'Articles'], ['doc', 'Documents and data']];
  var LENS = { live: 'Last 24 hours', bank: 'The bank', readers: 'From readers' };
  // Each lens's orders; viral, likes and views stay only where the lens has a measured number (trimmed after loading).
  var SORTS = { live: [['hot', 'Hottest first'], ['new', 'Newest first'], ['viral', 'Most viral'], ['likes', 'Most liked'], ['views', 'Most viewed']],
    bank: [['new', 'Newest first'], ['old', 'Oldest first'], ['top', 'Top picks first'], ['viral', 'Most viral'], ['likes', 'Most liked'], ['views', 'Most viewed']], readers: [['new', 'Newest first']] };
  var HEATS = [[0, 'Any heat'], [40, 'Warm 40+'], [70, 'Hot 70+'], [90, 'On fire 90+']];
  var VIRALS = [[0, 'Any reach'], [50, 'Top half'], [75, 'Top quarter'], [90, 'Top 10%']];
  var WITHIN = [[0, '24 hours'], [12, '12 h'], [6, '6 h'], [3, '3 h'], [1, '1 h']];
  // How credible the SOURCE is, 0 to 100, from the room's own table (intel_live.py for news and video, intel_x.py for X)
  var CREDS = [[0, 'Any source'], [50, '50+'], [70, '70+'], [85, '85+']];

  var D, BANK = [], LIVE = [], RD = [], LIVE_AT = 0, items = [], P, topics, buckets = [], REACH = {}, REACH_AT = 0;
  var S = { lens: 'bank', q: '', tp: [], place: '', kind: '', top: false, edu: false, from: 0, to: 0, sort: 'new', nowhere: false, pf: [], heat: 0, vmin: 0, within: 0, crmin: 0 };
  var shown = [], limit = PAGE_N, spotAt = -1, rdState = 'idle';

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
  function kindOf(it) { return it.k === 'document' || it.k === 'data' ? 'doc' : it.k === 'image' ? 'post' : it.k; }          // an image post is drawn as a post
  function crOf(it) { return it.cr != null ? it.cr : null; }
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

  /* ------------------------------------------------------------ where it was posted, and how many liked it there */
  function pfOf(it) {
    if (it._pf) return it._pf;
    var h = hostOf(it.u), s = it.src === 'News' ? 'News' : srcOf(it.u);
    if (/(^|\.)threads\.(net|com)$/.test(h)) s = 'Threads';
    else if (/^(drive|docs)\.google\.com$/.test(h)) s = 'Document';
    else if (s === 'Rumble') s = 'Other';
    if (!PFC[s]) s = 'Web';
    return (it._pf = s);
  }
  function pfColor(p) { return (PFC[p] || PFC.Web)[2]; }
  function pfName(p) { return (PFC[p] || PFC.Web)[1]; }
  // The counters, from data/intel-reach.json, or from the feed itself for a video of the last 24 hours (fresher).
  function reachOf(it) {
    if (it._r !== undefined) return it._r;
    var r = REACH[norm(it.u)] || null;
    if (it.lk != null || it.vw != null) { r = { pf: it.src === 'X' ? 'X' : 'YouTube', at: it.d }; if (it.lk != null) r.lk = it.lk; if (it.vw != null) r.vw = it.vw; if (it.rp != null) r.rs = it.rp; }
    return (it._r = r);
  }
  // The one number each platform shows everyone: likes on X and YouTube, views on Telegram (it has no public likes).
  function mainCount(it) { var r = reachOf(it); if (!r || r.x) return null; return pfOf(it) === 'Telegram' ? (r.vw != null ? r.vw : null) : (r.lk != null ? r.lk : null); }
  function likesOf(it) { var r = reachOf(it); return r && !r.x && r.lk != null ? r.lk : null; }
  function viewsOf(it) { var r = reachOf(it); return r && !r.x && r.vw != null ? r.vw : null; }
  function fmtN(n) {
    if (n == null) return '';
    if (n < 1000) return String(n);
    if (n < 1e6) { var k = n / 1e3; return (k < 10 ? k.toFixed(1).replace(/\.0$/, '') : Math.round(k)) + 'K'; }
    var m = n / 1e6; return (m < 10 ? m.toFixed(1).replace(/\.0$/, '') : Math.round(m)) + 'M';
  }
  // VIRAL: where the item's own number ranks among the items of the same platform in the room (both lenses), 0 to 100.
  // A platform needs 8 measured items before it is ranked at all, so a score never rests on a handful.
  var VN = {};
  function computeViral() {
    var by = {}, all = BANK.concat(LIVE);
    all.forEach(function (it) { var m = mainCount(it); if (m != null) (by[pfOf(it)] = by[pfOf(it)] || []).push(m); });
    Object.keys(by).forEach(function (p) { by[p].sort(function (a, b) { return a - b; }); VN[p] = by[p].length; });
    all.forEach(function (it) {
      var m = mainCount(it), a = by[pfOf(it)];
      delete it._v;
      if (m == null || !a || a.length < 8) return;
      var lo = 0, hi = a.length;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (a[mid] < m) lo = mid + 1; else hi = mid; }
      it._v = Math.max(0, Math.min(100, Math.round(100 * lo / (a.length - 1))));
    });
  }
  function viralWhy(it) {
    if (it._v == null) return '';
    var p = pfOf(it), n = VN[p] || 0, w = p === 'Telegram' ? 'views' : 'likes';
    return 'More ' + w + ' than ' + it._v + '% of the ' + n + ' ' + pfName(p) + ' items in the room with a count';
  }
  var ICO = {
    like: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10z"/></svg>',
    view: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>',
    reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    repost: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4 3 8l4 4M3 8h13a4 4 0 0 1 4 4v1M17 20l4-4-4-4M21 16H8a4 4 0 0 1-4-4v-1"/></svg>',
    viral: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20h3v-5H3zM10.5 20h3V10h-3zM18 20h3V4h-3z"/></svg>'
  };
  // A mark that says what it is and where it was posted: the map's shape in the platform's colour
  function mark(it, cls) {
    var k = kindOf(it), p = pfOf(it);
    return '<svg class="' + (cls || 'ir-mk') + '" viewBox="-8 -8 16 16" aria-hidden="true"><path d="' + (SHAPE[k] || SHAPE.post) + '" fill="' + pfColor(p) + '"/></svg>';
  }
  function reachLine(it) {
    var r = reachOf(it), p = pfOf(it), out = [];
    if (r && r.x) return '<span class="ir-rch ir-rch-x">' + esc(pfName(p)) + ' hides this count now (deleted, private or behind a login)</span>';
    if (r) {
      if (r.lk != null) out.push('<span title="' + esc(r.lk.toLocaleString('en-US') + ' likes on ' + pfName(p)) + '">' + ICO.like + '<b class="num">' + fmtN(r.lk) + '</b></span>');
      if (r.vw != null) out.push('<span title="' + esc((r['~'] ? 'About ' : '') + r.vw.toLocaleString('en-US') + ' views on ' + pfName(p)) + '">' + ICO.view + '<b class="num">' + (r['~'] ? '~' : '') + fmtN(r.vw) + '</b></span>');
      if (r.rp != null) out.push('<span title="' + esc(r.rp.toLocaleString('en-US') + ' replies') + '">' + ICO.reply + '<b class="num">' + fmtN(r.rp) + '</b></span>');
      if (r.rs != null) out.push('<span title="' + esc(r.rs.toLocaleString('en-US') + ' reposts') + '">' + ICO.repost + '<b class="num">' + fmtN(r.rs) + '</b></span>');
    }
    return out.length ? '<span class="ir-rch">' + out.join('') + '</span>' : '';
  }
  function viralTag(it) { return it._v != null ? '<span class="vir" style="--h:' + Math.max(4, it._v) + '%" title="' + esc(viralWhy(it)) + '">' + ICO.viral + '<b class="num">' + it._v + '</b> Viral</span>' : ''; }
  function reduced() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  /* ------------------------------------------------------------ the three lenses */
  function setOf(l) { return l === 'live' ? LIVE : l === 'readers' ? RD : BANK; }
  function liveFresh() { return LIVE.length >= 5 && LIVE_AT && Date.now() - LIVE_AT < 6 * 3600000; }
  function liveShown() { return LIVE.length > 0 && LIVE_AT && Date.now() - LIVE_AT < 48 * 3600000; }
  function useLens(l, quiet) {
    if (!LENS[l] || (l === 'live' && !liveShown())) l = 'bank';
    S.lens = l; items = setOf(l);
    S.sort = SORTS[l][0][0];          // each lens opens on its own order (hottest, newest); the address can still name another
    var hint = $('ir-maphint');
    if (hint) hint.textContent = l === 'live' ? 'The last 24 hours. Drag to turn the globe (two fingers on a phone), tap a mark.' : l === 'readers' ? 'Finds readers sent, not checked yet.' : BANK.length + ' items in the bank. Drag to turn the globe (two fingers on a phone), tap a mark.';
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
    if (!it._w) it._w = (it.t + ' ' + (it.n || '') + ' ' + (it.o || '') + ' ' + (it.h || '') + ' ' + (it.nm || '') + ' ' + (it.by || '') + ' ' + it.src + ' ' + placeName(it.p) + ' ' + (P[it.p] ? P[it.p][1] : '') + ' ' +
      (it.tp || []).map(function (i) { return topics[i]; }).join(' ')).toLowerCase();
    return it._w;
  }
  function pass(it, skip) {
    if (skip !== 'tp' && S.tp.length && !S.tp.some(function (t) { return (it.tp || []).indexOf(t) >= 0; })) return false;
    if (skip !== 'kind' && S.kind && kindOf(it) !== S.kind) return false;
    if (skip !== 'pf' && S.pf.length && S.pf.indexOf(pfOf(it)) < 0) return false;
    if (S.heat && S.lens === 'live' && (it.hot || 0) < S.heat) return false;
    if (skip !== 'viral' && S.vmin && (it._v == null || it._v < S.vmin)) return false;
    if (S.crmin && !(crOf(it) >= S.crmin)) return false;          // an item with no score never passes a minimum
    if (S.within && S.lens === 'live') { var ms = Date.parse(it.d || ''); if (!(ms > Date.now() - S.within * 3600000)) return false; }
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
    // most viral, liked, viewed: what has no measured number goes after everything that has one, newest first
    var num = function (f) { var nb2 = by; return function (x, y) { var a = f(x), b = f(y); return ((b == null ? -1 : b) - (a == null ? -1 : a)) || nb2(x, y); }; };
    if (S.sort === 'viral') by = num(function (i) { return i._v; });
    if (S.sort === 'likes') by = num(likesOf);
    if (S.sort === 'views') by = num(viewsOf);
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
    drawBoard();
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
    var y = ytId(it.u), p = pfOf(it), m = mark(it), pc = ' style="--pc:' + pfColor(p) + '"';
    if (it.th || y) return '<span class="ir-th yt" style="--pc:' + pfColor(p) + ';background-image:url(' + esc(it.th || 'https://i.ytimg.com/vi/' + y + '/mqdefault.jpg') + ')">' + m + '</span>';
    var s = p === 'Telegram' ? 'TG' : p === 'Document' ? 'DOC' : p === 'Facebook' ? 'FB' : p === 'Instagram' ? 'IG' : p === 'News' ? 'NEWS' : p === 'Web' ? 'WEB' : p === 'Threads' ? 'THR' : p === 'Other' ? 'VIDEO' : p;
    return '<span class="ir-th"' + pc + '><i>' + esc(s) + '</i>' + m + '</span>';
  }
  function card(it, i) {
    var where = it.p === 'global' && it.pw ? it.pw : placeName(it.p);
    var meta = '<span>' + esc(it.pend && !it.d ? 'Sent ' + ago(it.ms) : fmtDate(it.d)) + '</span> · ' + esc(where) + ' · ' + esc(it.h || it.src) + badges(it);
    var tags = hotTag(it) + viralTag(it) + reachLine(it);
    return '<li class="ir-card' + (i === spotAt ? ' on' : '') + (it.hot != null ? ' is-live' : '') + '"><button type="button" data-i="' + i + '">' + thumb(it) +
      '<span><span class="ir-c-t">' + esc(it.t) + '</span><span class="ir-c-m">' + meta + '</span>' + (tags ? '<span class="ir-c-x">' + tags + '</span>' : '') + '</span></button></li>';
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

  /* ------------------------------------------------------------ the map: a globe that also lays flat
     One canvas draws the Earth with d3-geo (assets/intel-geo.js): the globe is orthographic, the flat map Natural Earth,
     and both come from the same view, V: the longitude and latitude at the middle and a zoom. One SVG over it carries the
     marks, so each stays a real button with a name. The night side is the real one, from where the sun is now. */
  var G = window.d3 && window.d3.geoOrthographic ? window.d3 : null;
  var map = $('ir-map'), box = $('ir-mapbox'), cv = null, ctx = null, gPins = null;
  var V = { mode: 'globe', lon: 32, lat: 28, k: 1 }, moving = 0, LAND = null, LAND_HI = null, hiLoaded = false, dpr = 1, CW = 0, CH = 0, PJ = null;
  var BYNAME = {}, BYNAME_HI = {}, HEAT = {}, SELC = '', GRAT = null, EQ = { type: 'LineString', coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]] };
  var HEATC = ['', '#2B271D', '#36301C', '#46391B', '#5E4A1C'];

  // TopoJSON (world-atlas, Natural Earth) to features, the same as topojson-client's feature(): arcs undone, rings joined.
  function topoFeatures(t, byName) {
    var tf = t.transform, sx = tf ? tf.scale[0] : 1, sy = tf ? tf.scale[1] : 1, tx = tf ? tf.translate[0] : 0, ty = tf ? tf.translate[1] : 0;
    var arcs = t.arcs.map(function (a) { var x = 0, y = 0; return a.map(function (p) { if (!tf) return [p[0], p[1]]; x += p[0]; y += p[1]; return [x * sx + tx, y * sy + ty]; }); });
    function ring(ids) {
      var pts = [];
      ids.forEach(function (i) { var a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; pts = pts.length ? pts.concat(a.slice(1)) : a.slice(); });
      return pts;
    }
    var out = [];
    t.objects.countries.geometries.forEach(function (g) {
      var polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : null;
      if (!polys) return;
      var f = { type: 'Feature', properties: { name: g.properties.name }, geometry: { type: 'MultiPolygon', coordinates: polys.map(function (p) { return p.map(ring); }) } };
      out.push(f);
      (byName[f.properties.name] = byName[f.properties.name] || []).push(f);
    });
    return out;
  }
  function baseR() { return V.mode === 'globe' ? Math.min(CW, CH) * 0.46 : Math.min(CW / 5.6, CH / 2.9); }
  function makeProj() {
    var p = V.mode === 'globe' ? G.geoOrthographic().clipAngle(90).rotate([-V.lon, -V.lat]) : G.geoNaturalEarth1().rotate([-V.lon, 0]);
    p.scale(baseR() * V.k).translate([CW / 2, CH / 2]).precision(V.k > 12 ? 0.25 : 0.6);
    if (V.mode !== 'globe') { var c = p([V.lon, V.lat]); p.translate([CW - c[0], CH - c[1]]); }
    return p;
  }
  function seen(lon, lat) { return V.mode !== 'globe' || G.geoDistance([lon, lat], [V.lon, V.lat]) < Math.PI / 2 - 0.02; }
  function sizeCanvas() {
    CW = box.clientWidth; CH = box.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(CW * dpr)); cv.height = Math.max(1, Math.round(CH * dpr));
    cv.style.width = CW + 'px'; cv.style.height = CH + 'px';
  }
  // Where the sun is overhead now, and so the middle of the night opposite it (declination by day of year; the equation
  // of time is left out, so the line can sit up to 4 degrees off: it is a picture of night, not a clock).
  function nightAt() {
    var d = new Date(), day = (d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5;
    var decl = -23.44 * Math.cos(2 * Math.PI / 365 * (day + 10)), lon = (12 - d.getUTCHours() - d.getUTCMinutes() / 60) * 15 + 180;
    return [((lon + 540) % 360) - 180, -decl];
  }

  var drawQ = 0, drawT = 0;
  function requestDraw() {
    if (drawQ) return;
    drawQ = requestAnimationFrame(function () { drawQ = 0; drawNow(); });
    clearTimeout(drawT);
    drawT = setTimeout(function () { if (drawQ) { cancelAnimationFrame(drawQ); drawQ = 0; drawNow(); } }, 140);      // a tab in the background gets no frames
  }
  function drawNow() {
    if (!ctx || !LAND) return;
    if (box.clientWidth !== CW || box.clientHeight !== CH) sizeCanvas();
    if (!CW || !CH) return;
    PJ = makeProj();
    var path = G.geoPath(PJ, ctx), globe = V.mode === 'globe', R = PJ.scale(), cx = CW / 2, cy = CH / 2, land = LAND_HI && (V.k >= 8 || (V.k >= 2.5 && !moving)) ? LAND_HI : LAND;          // the light outline while it moves, the fine one once it stops
    var byName = land === LAND_HI ? BYNAME_HI : BYNAME;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CW, CH);
    if (globe && R < Math.hypot(CW, CH)) {          // the haze round the rim
      var hz = ctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.18);
      hz.addColorStop(0, 'rgba(244,196,48,0.26)'); hz.addColorStop(0.3, 'rgba(244,196,48,0.08)'); hz.addColorStop(1, 'rgba(244,196,48,0)');
      ctx.fillStyle = hz; ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.beginPath(); path({ type: 'Sphere' });
    if (globe) { var sg = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.42, R * 0.05, cx, cy, R); sg.addColorStop(0, '#171A21'); sg.addColorStop(0.7, '#0B0D12'); sg.addColorStop(1, '#050608'); ctx.fillStyle = sg; }
    else ctx.fillStyle = '#0A0B0F';
    ctx.fill();
    ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(233,217,166,0.08)';
    ctx.beginPath(); path(GRAT); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(244,196,48,0.2)'; ctx.beginPath(); path(EQ); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); land.forEach(function (f) { path(f); }); ctx.fillStyle = '#25231E'; ctx.fill();
    Object.keys(HEAT).forEach(function (n) {          // each country glows by how much of what is shown is about it
      if (!byName[n] || n === SELC) return;
      ctx.beginPath(); byName[n].forEach(function (f) { path(f); }); ctx.fillStyle = HEATC[HEAT[n]]; ctx.fill();
    });
    ctx.beginPath(); land.forEach(function (f) { path(f); }); ctx.strokeStyle = 'rgba(138,126,98,0.55)'; ctx.lineWidth = 0.6; ctx.stroke();
    if (SELC && byName[SELC]) { ctx.beginPath(); byName[SELC].forEach(function (f) { path(f); }); ctx.fillStyle = 'rgba(244,196,48,0.1)'; ctx.fill(); ctx.strokeStyle = '#F4C430'; ctx.lineWidth = 1.4; ctx.stroke(); }
    ctx.beginPath(); path(G.geoCircle().center(nightAt()).radius(90)()); ctx.fillStyle = 'rgba(0,0,0,0.24)'; ctx.fill();
    if (globe) { ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = 'rgba(244,196,48,0.5)'; ctx.lineWidth = 1.1; ctx.stroke(); }
    var sw = $('ir-sweep');
    if (sw) {          // the sweep sits on the globe; once the globe is bigger than the box it covers the box
      var big = !globe || R * 2 > Math.hypot(CW, CH);
      sw.style.cssText = '--sx:' + cx.toFixed(1) + 'px;--sy:' + cy.toFixed(1) + 'px;--sr:' + R.toFixed(1) + 'px';
      sw.hidden = big;
    }
    var hud = $('ir-hud-c');
    if (hud) hud.textContent = Math.abs(V.lat).toFixed(1) + '°' + (V.lat >= 0 ? 'N' : 'S') + ' ' + Math.abs(V.lon).toFixed(1) + '°' + (V.lon >= 0 ? 'E' : 'W') + '  ×' + (V.k < 10 ? V.k.toFixed(1) : Math.round(V.k));
    drawPinsNow();
  }
  function setView(lon, lat, k, now) {
    V.k = Math.max(1, Math.min(MAXK, k));
    V.lat = Math.max(V.mode === 'globe' ? -80 : -58, Math.min(80, lat));
    V.lon = ((lon % 360) + 540) % 360 - 180;
    if (V.k >= 2.5 && !hiLoaded) loadHi();
    if (now) drawNow(); else requestDraw();
  }
  // Move the Earth by dx, dy screen pixels, so the ground under a finger follows it.
  function panBy(dx, dy) {
    if (!PJ) PJ = makeProj();
    var s = PJ.scale(), deg = 180 / Math.PI;
    if (V.mode === 'globe') { setView(V.lon - dx / s * deg / Math.max(0.2, Math.cos(V.lat / deg)), V.lat + dy / s * deg, V.k); return; }
    var a = PJ.invert([CW / 2, CH / 2]), b = PJ.invert([CW / 2 - dx, CH / 2 - dy]);
    if (!a || !b || !isFinite(a[0]) || !isFinite(b[0])) return;
    var dl = b[0] - a[0]; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
    setView(V.lon + dl, V.lat + (b[1] - a[1]), V.k);
  }
  function zoomAt(f, px, py) {
    if (!PJ) PJ = makeProj();
    var k = Math.max(1, Math.min(MAXK, V.k * f));
    if (k === V.k) return;
    var at = PJ.invert([px, py]);
    V.k = k; PJ = makeProj();
    if (at && isFinite(at[0]) && isFinite(at[1]) && seen(at[0], at[1])) {
      var to = PJ(at);
      if (to && isFinite(to[0])) { panBy(px - to[0], py - to[1]); return; }
    }
    setView(V.lon, V.lat, k);
  }
  var anim = 0;
  function flyTo(k, lon, lat) {
    if (!G || !LAND) return;
    k = Math.max(1, Math.min(MAXK, k));
    var k0 = V.k, a = [V.lon, V.lat], b = [lon, lat], ip = G.geoInterpolate(a, b), dist = G.geoDistance(a, b);
    var t0 = performance.now(), dur = reduced() ? 0 : Math.min(1700, 600 + dist * 650 + Math.abs(Math.log(k / k0)) * 90), landed = 0;
    var dip = Math.min(Math.log(Math.max(k0, k)), dist * 1.4);          // a long way out on the way to somewhere far, like a camera
    cancelAnimationFrame(anim);
    (function step(now) {
      var t = dur ? Math.min(1, (now - t0) / dur) : 1, e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var c = ip(e), lk = Math.log(k0) + (Math.log(k) - Math.log(k0)) * e - 4 * e * (1 - e) * dip;
      moving = t < 1 ? 1 : 0;
      setView(c[0], c[1], Math.exp(lk), true);
      if (t < 1) anim = requestAnimationFrame(step); else landed = 1;
    })(t0);
    var mine = anim;
    setTimeout(function () { if (!landed && anim === mine) { cancelAnimationFrame(anim); moving = 0; setView(lon, lat, k, true); } }, dur + 150);
  }
  function home() { if (V.mode === 'globe') flyTo(1, 32, 28); else flyTo(1, 12, 12); }          // the flat map's middle sits in the Atlantic so America and Asia both show
  function loadHi() {
    hiLoaded = true;
    fetch(root.getAttribute('data-geo-hi')).then(function (r) { if (!r.ok) throw r; return r.json(); }).then(function (t) {
      LAND_HI = topoFeatures(t, BYNAME_HI); requestDraw();
    }).catch(function () { hiLoaded = false; });
  }
  function drawCountries() {
    // four steps of the brand's gold, by how much of what is shown is about the country; never a new colour
    var n = {}, max = 0;
    HEAT = {};
    (S.lens === 'readers' ? [] : shown).forEach(function (it) { var seen1 = {}; keysOf(it).forEach(function (k) { if (P[k] && P[k][1]) { var c = TOPO[P[k][1]] || P[k][1]; if (!seen1[c]) { seen1[c] = 1; n[c] = (n[c] || 0) + 1; } } }); });
    Object.keys(n).forEach(function (c) { if (n[c] > max) max = n[c]; });
    Object.keys(n).forEach(function (c) { var r = n[c] / max; HEAT[c] = r > 0.6 ? 4 : r > 0.3 ? 3 : r > 0.1 ? 2 : 1; });
    SELC = S.place.indexOf('c:') === 0 ? (TOPO[S.place.slice(2)] || S.place.slice(2)) : '';
    requestDraw();
  }

  /* The marks. Each place holds what is shown there. A place with few items shows every one of them, a shape for what it
     is in the colour of where it was posted, packed round the place like seeds in a sunflower; a crowded place, or places
     that would touch, show one gold circle with the count and a ring split by platform. A place picked shows up to 48. */
  var PG = [], pinData = [], glyphs = [], edges = [], PULSE = null, pinSig = '', GR = 6.2;
  function expandMax() { return CW < 520 ? 8 : 12; }
  function footR(n) { return n <= 1 ? GR + 3 : GR * 2.05 * Math.sqrt(n - 0.4) + GR + 3; }
  function pinR(n) { return Math.min(30, 9 + 3.2 * Math.sqrt(n)); }
  function seed(j, n) { if (n === 1) return [0, 0]; var r = GR * 2.05 * Math.sqrt(j + 0.6), a = j * 2.39996 - Math.PI / 2; return [r * Math.cos(a), r * Math.sin(a)]; }
  function groupPins() {
    var at = {};
    PG = [];
    if (S.lens !== 'readers') sortList(items.filter(function (it) { return pass(it, 'place'); })).forEach(function (it) {
      keysOf(it).forEach(function (k) { if (k !== 'global' && P[k] && P[k][2] != null) (at[k] = at[k] || []).push(it); });
    });
    Object.keys(at).forEach(function (k) {
      var its = at[k], pc = {}, hot = 0;
      its.forEach(function (it) { var p = pfOf(it); pc[p] = (pc[p] || 0) + 1; if ((it.hot || 0) > hot) hot = it.hot; });
      PG.push({ k: k, its: its, n: its.length, hot: hot, pc: pc, lon: P[k][3], lat: P[k][2] });
    });
    PG.sort(function (a, b) { return b.n - a.n; });
    var nw = S.lens === 'readers' ? 0 : items.filter(function (it) { return it.p === 'global' && pass(it, 'place'); }).length;
    var b = $('ir-nowhere'); b.hidden = !nw && !S.nowhere; b.textContent = 'No single place (' + nw + ')'; b.setAttribute('aria-pressed', S.nowhere ? 'true' : 'false');
  }
  function drawPins() { groupPins(); pinSig = ''; requestDraw(); }
  function ringSegs(pc, n, r) {
    var C = 2 * Math.PI * r, acc = 0, out = '';
    Object.keys(pc).sort(function (a, b) { return pc[b] - pc[a]; }).forEach(function (p) {
      var len = C * pc[p] / n;
      out += '<circle class="seg" r="' + r.toFixed(1) + '" stroke="' + pfColor(p) + '" stroke-dasharray="' + Math.max(0.1, len - (n > 1 && len > 3 ? 1.2 : 0)).toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '"/>';
      acc += len;
    });
    return '<g transform="rotate(-90)">' + out + '</g>';
  }
  function drawPinsNow() {
    if (!gPins || !PJ) return;
    var sel = S.place && S.place.indexOf('c:') !== 0 ? S.place.split(',') : [], selC = S.place.indexOf('c:') === 0 ? S.place.slice(2) : '';
    var live = S.lens === 'live', rd = S.lens === 'readers', pts = [];
    PG.forEach(function (g) {
      if (!seen(g.lon, g.lat)) return;
      var s = PJ([g.lon, g.lat]);
      if (!s || !isFinite(s[0])) return;
      var isSel = sel.indexOf(g.k) >= 0 || (!!selC && P[g.k][1] === selC), cap = isSel ? 48 : expandMax(), exp = g.n <= cap || (isSel && sel.length === 1);
      var m = Math.min(g.n, cap);
      pts.push({ keys: [g.k], gs: [g], n: g.n, hot: g.hot, x: s[0], y: s[1], r: exp ? footR(m) : pinR(g.n), exp: exp, m: m, sel: isSel, pc: g.pc });
    });
    // what would touch becomes one circle; a place picked never does, it is what the reader asked to see
    var merged = [];
    pts.forEach(function (p) {
      if (!p.sel) for (var i = 0; i < merged.length; i++) {
        var q = merged[i];
        if (q.sel) continue;
        if (Math.hypot(q.x - p.x, q.y - p.y) < q.r + p.r - 2) {
          q.keys = q.keys.concat(p.keys); q.gs = q.gs.concat(p.gs); q.n += p.n; q.hot = Math.max(q.hot, p.hot); q.exp = false; q.r = pinR(q.n);
          var pc = {}; [q.pc, p.pc].forEach(function (o) { Object.keys(o).forEach(function (k) { pc[k] = (pc[k] || 0) + o[k]; }); }); q.pc = pc;
          return;
        }
      }
      merged.push(p);
    });
    merged.sort(function (a, b) { return a.sel - b.sel; });          // a place picked is drawn last, over its neighbours
    var vis = merged.filter(function (m) { return m.x > -80 && m.y > -80 && m.x < CW + 80 && m.y < CH + 80; });
    // what the globe hides behind it: one arrow on the rim for each direction it lies in (bins of 20 degrees), with its count
    var bins = {}, rdn = Math.PI / 180, Rr = PJ.scale() - 16;
    edges = [];
    // only while the rim is on the screen: zoomed in, the far side is simply off the edge, like everything else
    if (V.mode === 'globe' && !rd && PJ.scale() * 2 <= Math.hypot(CW, CH) * 0.9) PG.forEach(function (g) {
      if (seen(g.lon, g.lat)) return;
      var f1 = V.lat * rdn, f2 = g.lat * rdn, dl = (g.lon - V.lon) * rdn;
      var th = Math.atan2(Math.sin(dl) * Math.cos(f2), Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl));
      var bk = Math.round(th / (Math.PI / 9)), e = bins[bk] || (bins[bk] = { bk: bk, n: 0, ts: 0, big: -1, hot: 0, lon: 0, lat: 0 });
      e.n += g.n; e.ts += th * g.n; e.hot = Math.max(e.hot, g.hot);
      if (g.n > e.big) { e.big = g.n; e.lon = g.lon; e.lat = g.lat; }
    });
    Object.keys(bins).sort(function (a, b) { return a - b; }).forEach(function (bk) {
      var e = bins[bk]; e.th = e.ts / e.n; e.x = CW / 2 + Math.sin(e.th) * Rr; e.y = CH / 2 - Math.cos(e.th) * Rr; edges.push(e);
    });
    var pulseK = PULSE && Date.now() - PULSE.at < 5000 ? PULSE.k : '';
    var sig = S.lens + '|' + S.place + '|' + pulseK + '|' + vis.map(function (m) { return m.keys.join(',') + ':' + m.n + (m.exp ? 'e' + m.m : ''); }).join(';') +
      '|' + edges.map(function (e) { return e.bk + ':' + e.n; }).join(';');
    pinData = vis; glyphs = [];
    vis.forEach(function (m) {          // where each item's mark is on the screen, for taps and the tip
      if (!m.exp) return;
      m.gs[0].its.slice(0, m.m).forEach(function (it, j) { var o = seed(j, m.m); glyphs.push({ it: it, k: m.keys[0], x: m.x + o[0], y: m.y + o[1], m: m }); });
    });
    if (sig === pinSig) {          // the same marks as last frame: only move them, so their rings keep pulsing
      var gs = gPins.childNodes;
      for (var i = 0; i < gs.length && i < vis.length; i++) gs[i].setAttribute('transform', 'translate(' + vis[i].x.toFixed(1) + ' ' + vis[i].y.toFixed(1) + ')');
      for (var j = 0; j < edges.length && vis.length + j < gs.length; j++) gs[vis.length + j].setAttribute('transform', 'translate(' + edges[j].x.toFixed(1) + ' ' + edges[j].y.toFixed(1) + ')');
      return;
    }
    pinSig = sig;
    var html = '';
    vis.forEach(function (m, i) {
      var dim = (sel.length || selC) && !m.sel, name = m.keys.length === 1 ? placeName(m.keys[0]) : m.keys.length + ' places';
      var cls = (live ? ' live' + (m.hot >= 70 ? ' hot' : '') : rd ? ' rd' : '') + (m.sel ? ' sel' : dim ? ' dim' : '');
      var pul = pulseK && m.keys.indexOf(pulseK) >= 0 ? '<circle class="pulse" r="10"/>' : '';
      var tr = ' transform="translate(' + m.x.toFixed(1) + ' ' + m.y.toFixed(1) + ')"';
      if (!m.exp) {
        var r = pinR(m.n);
        html += '<g class="ir-pin' + cls + '" data-p="' + i + '" tabindex="0" role="button" aria-label="' + esc(name + ', ' + m.n + (m.n === 1 ? ' item' : ' items')) + '"' + tr + '>' +
          (live ? '<circle class="ring" r="' + r.toFixed(1) + '"/><circle class="ring r2" r="' + r.toFixed(1) + '"/>' : '') + pul +
          '<circle class="halo" r="' + (r + 10).toFixed(1) + '"/>' + ringSegs(m.pc, m.n, r + 3.6) + '<circle class="core" r="' + r.toFixed(1) + '"/>' +
          '<circle class="shine" r="' + (r * 0.55).toFixed(1) + '" cx="' + (-r * 0.25).toFixed(1) + '" cy="' + (-r * 0.3).toFixed(1) + '"/><text>' + m.n + '</text></g>';
        return;
      }
      var its = m.gs[0].its.slice(0, m.m), body = '';
      its.forEach(function (it, j) {
        var o = seed(j, m.m), hotI = (it.hot || 0) >= 70 || (it._v || 0) >= 90;
        body += '<g class="ir-gl' + (hotI ? ' big' : '') + '" data-g="' + esc(String(it.id)) + '" transform="translate(' + o[0].toFixed(1) + ' ' + o[1].toFixed(1) + ')" role="button" tabindex="0" aria-label="' + esc(KIND_N[kindOf(it)] + ' on ' + pfName(pfOf(it)) + ': ' + it.t) + '">' +
          (hotI ? '<circle class="gl-hot" r="9"/>' : '') + '<path d="' + (SHAPE[kindOf(it)] || SHAPE.post) + '" fill="' + pfColor(pfOf(it)) + '"/></g>';
      });
      html += '<g class="ir-cl' + cls + '" data-p="' + i + '"' + tr + '>' + pul + (m.m > 1 ? '<circle class="cl-r" r="' + (footR(m.m) - 1).toFixed(1) + '"/>' : '') +
        (m.m > 1 ? '<circle class="cl-c" r="2.4"/>' : '') + body + (m.n > m.m ? '<text class="cl-more" y="' + (footR(m.m) + 12).toFixed(1) + '">+' + (m.n - m.m) + ' in the list</text>' : '') + '</g>';
    });
    edges.forEach(function (e, i) {
      html += '<g class="ir-edge' + (live ? ' live' : '') + '" data-e="' + i + '" tabindex="0" role="button" aria-label="' + esc(e.n + (e.n === 1 ? ' item' : ' items') + ' on the far side of the globe. Turn the globe to them.') + '" transform="translate(' + e.x.toFixed(1) + ' ' + e.y.toFixed(1) + ')">' +
        '<path d="M0 -21 5.5 -14.5h-11z" transform="rotate(' + (e.th / rdn).toFixed(1) + ')"/><circle r="12.5"/><text>' + e.n + '</text></g>';
    });
    gPins.innerHTML = html;
    $('ir-tip').hidden = true;
  }
  function drawLegend() {
    var el = $('ir-legend'), n = shown.length, sh = '';
    if (S.lens !== 'readers') ['video', 'post', 'article', 'doc'].forEach(function (k) {
      if (items.some(function (it) { return kindOf(it) === k; })) sh += '<span><svg viewBox="-8 -8 16 16" aria-hidden="true"><path d="' + SHAPE[k] + '"/></svg>' + KIND_N[k] + '</span>';
    });
    var head = S.lens === 'live' ? '<i class="lg-live"></i> Last 24 hours · <b class="num">' + n + '</b> ' + (n === 1 ? 'story' : 'stories') + (LIVE_AT ? ' · updated ' + esc(ago(LIVE_AT)) : '')
      : S.lens === 'readers' ? '<i class="lg-rd"></i> Sent by readers, being checked · <b class="num">' + n + '</b>'
      : '<i class="lg-bank"></i> The bank · <b class="num">' + n + '</b> ' + (n === 1 ? 'item' : 'items') + (fullRange() ? '' : ' · ' + esc($('ir-range').textContent));
    el.innerHTML = '<span class="lg-h">' + head + '</span>' + (sh ? '<span class="lg-k">' + sh + '<span class="lg-c">Colour: where it was posted</span></span>' : '');
    el.hidden = false;
  }
  function pinAt(el) {
    var ed = el && el.closest && el.closest('.ir-edge');
    if (ed) { var e = edges[+ed.getAttribute('data-e')]; return e ? { edge: e, x: e.x, y: e.y } : null; }
    var g = el && el.closest && el.closest('.ir-gl');
    if (g) { var id = g.getAttribute('data-g'); for (var i = 0; i < glyphs.length; i++) if (String(glyphs[i].it.id) === id) return glyphs[i]; }
    g = el && el.closest && el.closest('.ir-pin,.ir-cl');
    return g ? pinData[+g.getAttribute('data-p')] : null;
  }
  // What a tap landed on, from the marks' own positions (a captured pointer's target is the map itself): an item's mark
  // first, then a place's middle, then a circle.
  function pinHit(cx, cy) {
    var r = box.getBoundingClientRect(), x = cx - r.left, y = cy - r.top, best = null, bd = 1e9;
    edges.forEach(function (e) { var d = Math.hypot(e.x - x, e.y - y); if (d <= 18 && d < bd) { bd = d; best = { edge: e, x: e.x, y: e.y }; } });
    if (best) return best;
    glyphs.forEach(function (g) { var d = Math.hypot(g.x - x, g.y - y); if (d <= GR + 6 && d < bd) { bd = d; best = g; } });
    if (best) return best;
    pinData.forEach(function (m) { var d = Math.hypot(m.x - x, m.y - y), reach = m.exp ? (m.m > 1 ? 7 : GR + 6) : pinR(m.n) + 6; if (d <= reach && d < bd) { bd = d; best = m; } });
    return best;
  }
  function openGlyph(g) {
    var i = shown.indexOf(g.it);
    if (i < 0) {          // a mark of another place while one is picked: go to that place, then open it
      S.place = g.k; S.nowhere = false; $('ir-place').value = S.place; render(); i = shown.indexOf(g.it);
    }
    if (i >= 0) openSpot(i);
  }
  function fitTo(pts, kmin, kmax) {
    if (!G || !LAND || !CW) return;
    if (!pts.length) { home(); return; }
    var x = 0, y = 0, z = 0, rd = Math.PI / 180;
    pts.forEach(function (p) { var la = p[1] * rd, lo = p[0] * rd; x += Math.cos(la) * Math.cos(lo); y += Math.cos(la) * Math.sin(lo); z += Math.sin(la); });
    var c = Math.hypot(x, y, z) < 1e-6 ? pts[0] : [Math.atan2(y, x) / rd, Math.atan2(z, Math.hypot(x, y)) / rd], far = 0;
    pts.forEach(function (p) { far = Math.max(far, G.geoDistance(c, p)); });
    var half = Math.min(CW, CH) / 2 * 0.78, k;
    if (far < 0.0004) k = kmax;
    else if (V.mode === 'globe') k = far >= Math.PI / 2 ? 1 : half / (baseR() * Math.sin(far));
    else k = half / (baseR() * far * 0.95);
    flyTo(Math.max(kmin, Math.min(kmax, k)), c[0], c[1]);
  }
  function placePts(keys) { var o = {}; keys.forEach(function (k) { if (P[k] && P[k][2] != null) o[k] = [P[k][3], P[k][2]]; }); return Object.keys(o).map(function (k) { return o[k]; }); }
  function openPin(m) {
    if (!m) return;
    stopTour();
    if (m.edge) { flyTo(V.k, m.edge.lon, m.edge.lat); return; }
    if (m.it) { openGlyph(m); return; }
    if (m.keys.length > 1) { fitTo(placePts(m.keys), Math.min(MAXK, V.k * 2), MAXK); return; }          // several places under one circle: go closer, so they come apart
    S.place = S.place === m.keys[0] ? '' : m.keys[0];
    S.nowhere = false;
    $('ir-place').value = S.place;
    render();
    say(S.place ? 'Showing ' + shown.length + ' from ' + placeName(S.place) + '. Tap the place again to show every place.' : '');
  }

  // Drag (turns the globe, moves the flat map), pinch, scroll, double tap. On a phone, off the full screen, one finger
  // belongs to the page (it scrolls; touch-action pan-y in intel.css) and two fingers move and pinch the map.
  var ptrs = {}, last = null, moved = 0, pinch = null, mapOn = false, hintT = 0;
  function isFull() { return document.documentElement.classList.contains('ir-show'); }
  function mapHint(why) {
    var el = $('ir-wheel'); if (!el) return;
    el.textContent = why === 'touch' ? 'Use two fingers to move the map' : 'Click the map, or hold ' + (/Mac|iP(hone|ad)/.test(navigator.platform || '') ? 'Cmd' : 'Ctrl') + ', to zoom it';
    el.hidden = false; clearTimeout(hintT); hintT = setTimeout(function () { el.hidden = true; }, 1800);
  }
  function onDown(ev) {
    if (ev.button > 0) return;
    if (ev.pointerType === 'mouse') mapOn = true;
    stopTour(); cancelAnimationFrame(anim); poke();
    ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    try { map.setPointerCapture(ev.pointerId); } catch (e) { /* a pointer the browser no longer tracks: dragging still works without it */ }
    var ids = Object.keys(ptrs);
    if (ids.length === 1) { last = { x: ev.clientX, y: ev.clientY }; moved = 0; map.classList.add('drag'); }
    if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: V.k, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
  }
  function onMove(ev) {
    var r = box.getBoundingClientRect();
    if (!ptrs[ev.pointerId]) { hover(ev, r); return; }
    ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var ids = Object.keys(ptrs);
    poke(); moving = 1;
    if (ids.length === 2 && pinch) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (pinch.d > 0) zoomAt(pinch.k * d / pinch.d / V.k, mx - r.left, my - r.top);
      panBy(mx - pinch.mx, my - pinch.my); pinch.mx = mx; pinch.my = my;          // two fingers moving together move the map
      moved = 99;
      return;
    }
    if (ev.pointerType === 'touch' && !isFull()) {          // one finger: the page's, never the map's (a tap still opens a mark)
      if (last) { moved += Math.abs(ev.clientX - last.x) + Math.abs(ev.clientY - last.y); last = { x: ev.clientX, y: ev.clientY }; if (moved > 24) mapHint('touch'); }
      return;
    }
    if (last) {
      var dx = ev.clientX - last.x, dy = ev.clientY - last.y;
      moved += Math.abs(dx) + Math.abs(dy);
      last = { x: ev.clientX, y: ev.clientY };
      if (moved > 4) { panBy(dx, dy); $('ir-tip').hidden = true; }
    }
  }
  var lastTap = 0;
  function onUp(ev) {
    var was = ptrs[ev.pointerId];
    delete ptrs[ev.pointerId];
    if (Object.keys(ptrs).length < 2) pinch = null;
    if (!Object.keys(ptrs).length) {
      map.classList.remove('drag'); last = null;
      if (moving) { moving = 0; requestDraw(); }
      if (was && moved <= 4 && ev.type === 'pointerup') {
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
    if (m.edge) {
      tip.classList.remove('wide');
      tip.innerHTML = m.edge.n + (m.edge.n === 1 ? ' item' : ' items') + ' on the far side<small>Tap to turn the globe to them.</small>';
      tip.style.left = m.x + 'px'; tip.style.top = (m.y - 14) + 'px'; tip.hidden = false;
      return;
    }
    if (m.it) {
      var it = m.it, rc = reachOf(it), nums = [];
      if (rc && !rc.x) { if (rc.lk != null) nums.push(fmtN(rc.lk) + ' likes'); if (rc.vw != null) nums.push((rc['~'] ? '~' : '') + fmtN(rc.vw) + ' views'); }
      if (it.hot != null) nums.push('Hot ' + it.hot);
      if (it._v != null) nums.push('Viral ' + it._v);
      tip.innerHTML = '<span class="tip-k" style="--pc:' + pfColor(pfOf(it)) + '">' + mark(it, 'tip-m') + esc(KIND_N[kindOf(it)] + ' · ' + pfName(pfOf(it)) + ' · ' + fmtDate(it.d)) + '</span>' + esc(it.t.length > 90 ? it.t.slice(0, 88) + '…' : it.t) + '<small>' + esc(nums.join(' · ') || placeName(m.k)) + '. Tap to open.</small>';
      tip.classList.add('wide');
      tip.style.left = m.x + 'px'; tip.style.top = (m.y - 10) + 'px'; tip.hidden = false;
      return;
    }
    tip.classList.remove('wide');
    var names = m.keys.map(placeName);
    tip.innerHTML = esc(names.length > 3 ? names.slice(0, 3).join(', ') + ' and ' + (names.length - 3) + ' more' : names.join(', ')) + '<small>' + m.n + (m.n === 1 ? ' item. ' : ' items. ') + (m.hot ? 'Hottest ' + m.hot + '. ' : '') + (m.keys.length > 1 ? 'Tap to go closer.' : m.exp && m.m > 1 ? 'Tap the middle to show only these.' : 'Tap to show them.') + '</small>';
    tip.style.left = m.x + 'px'; tip.style.top = (m.y - (m.exp ? footR(m.m) : pinR(m.n))) + 'px'; tip.hidden = false;
  }

  // The globe turns by itself on the full screen (a stream), after 8 seconds with no hand on it; never with reduced motion.
  var spinF = 0, idleAt = 0;
  function poke() { idleAt = Date.now(); }
  function spin() {
    cancelAnimationFrame(spinF);
    var lastT = 0;
    (function step(t) {
      if (!document.documentElement.classList.contains('ir-show')) { spinF = 0; return; }
      if (V.mode === 'globe' && !tourT && !Object.keys(ptrs).length && Date.now() - idleAt > 8000 && !reduced() && V.k < 2.5 && !document.hidden && lastT)
        setView(V.lon + Math.min(50, t - lastT) * 0.0035, V.lat, V.k, true);
      lastT = t;
      spinF = requestAnimationFrame(step);
    })(0);
  }
  function setMode(m) {
    if (!G || m === V.mode) return;
    V.mode = m; store('ir-proj', m); pinSig = '';
    var b = $('ir-proj');
    if (b) { b.setAttribute('aria-label', m === 'globe' ? 'Lay the map flat' : 'Show the globe'); b.setAttribute('data-mode', m); }
    root.setAttribute('data-map', m);
    setView(V.lon, V.lat, V.k, true);
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
    // Where it was posted: each platform with its count in what is shown, and the likes measured there (views on Telegram)
    var pc = {}, lk = {}, vw = {}, has = {};
    items.forEach(function (it) {
      var p = pfOf(it); has[p] = 1;
      if (!pass(it, 'pf')) return;
      pc[p] = (pc[p] || 0) + 1;
      var r = reachOf(it); if (r && !r.x) { if (r.lk != null) lk[p] = (lk[p] || 0) + r.lk; if (r.vw != null) vw[p] = (vw[p] || 0) + r.vw; }
    });
    var po = PF.map(function (x) { return x[0]; }).filter(function (p) { return has[p] || S.pf.indexOf(p) >= 0; });
    po.sort(function (a, b) { return (pc[b] || 0) - (pc[a] || 0); });
    $('ir-pf').innerHTML = '<button class="ir-chip ir-pfc ir-pf-all" type="button" data-pf="" aria-pressed="' + (S.pf.length ? 'false' : 'true') + '">Every platform</button>' + po.map(function (p) {
      var sub = p === 'Telegram' && vw[p] != null ? ICO.view + fmtN(vw[p]) + ' views' : lk[p] != null ? ICO.like + fmtN(lk[p]) + ' likes' : HIDES[p] ? 'likes not public' : '';
      return '<button class="ir-chip ir-pfc" type="button" data-pf="' + p + '" aria-pressed="' + (S.pf.indexOf(p) >= 0) + '" style="--pc:' + pfColor(p) + '"><b class="ir-pfd" aria-hidden="true"></b><span>' + esc(pfName(p)) + ' <i>' + (pc[p] || 0) + '</i>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></button>';
    }).join('');
    seg('ir-heat', 'heat', 'Heat', HEATS, S.lens === 'live');
    seg('ir-within', 'within', 'Within', WITHIN, S.lens === 'live');
    seg('ir-viral', 'vmin', 'Viral', VIRALS, items.some(function (it) { return it._v != null; }) || !!S.vmin);
    seg('ir-cred', 'crmin', 'Credible', CREDS, items.some(function (it) { return crOf(it) != null; }) || !!S.crmin);
  }
  function seg(id, key, label, list, show) {
    var el = $(id); if (!el) return;
    el.hidden = !show;
    if (!show) return;
    el.innerHTML = '<span class="ir-seg-l">' + label + '</span>' + list.map(function (o) { return '<button type="button" data-seg="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (S[key] === o[0]) + '">' + o[1] + '</button>'; }).join('');
  }
  /* The board over the map: what is in view, counted. Every number is a count of what the list holds now. */
  var BOARD_IT = null;
  function drawBoard() {
    var el = $('ir-board'); if (!el) return;
    var places = {}, lk = 0, nl = 0, vw = 0, nv = 0, pc = {}, best = null, bestN = -1, live = S.lens === 'live';
    shown.forEach(function (it) {
      keysOf(it).forEach(function (k) { if (k !== 'global' && P[k]) places[k] = 1; });
      var r = reachOf(it); if (r && !r.x) { if (r.lk != null) { lk += r.lk; nl++; } if (r.vw != null) { vw += r.vw; nv++; } }
      var p = pfOf(it); pc[p] = (pc[p] || 0) + 1;
      var score = live ? (it.hot != null ? it.hot : -1) : (it._v != null ? it._v : -1);
      if (score > bestN) { bestN = score; best = it; }
    });
    BOARD_IT = bestN >= 0 ? best : null;
    var n = shown.length, tile = function (k, v, sub) { return '<div class="ir-b-t"><span class="ir-b-k">' + k + '</span><b class="num">' + v + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; };
    var mix = Object.keys(pc).sort(function (a, b) { return pc[b] - pc[a]; });
    var html = tile('In view', n.toLocaleString('en-US'), S.lens === 'live' ? (n === 1 ? 'story' : 'stories') : S.lens === 'readers' ? 'sent in' : (n === 1 ? 'item' : 'items')) +
      tile('Places', Object.keys(places).length, 'on the map') +
      tile('Likes', nl ? fmtN(lk) : '\u2013', nl ? 'on ' + nl + ' with a count' : 'none counted here') +
      tile('Views', nv ? fmtN(vw) : '\u2013', nv ? 'on ' + nv + ' with a count' : 'none counted here');
    if (BOARD_IT) html += '<button type="button" class="ir-b-t ir-b-top" data-board><span class="ir-b-k">' + (live ? 'Hottest' : 'Most viral') + ' \u00b7 ' + bestN + '</span><span class="ir-b-tt">' + esc(BOARD_IT.t) + '</span></button>';
    html += '<div class="ir-b-mix" role="img" aria-label="' + esc('Where it was posted: ' + mix.map(function (p) { return pfName(p) + ' ' + pc[p]; }).join(', ')) + '">' +
      mix.map(function (p) { return '<span style="flex:' + pc[p] + ';background:' + pfColor(p) + '" title="' + esc(pfName(p) + ': ' + pc[p]) + '"></span>'; }).join('') + '</div>';
    el.innerHTML = html; el.hidden = !n && S.lens === 'readers';
  }
  /* The wire: the hottest of the last 24 hours, running across the top. A headline opens it. */
  function drawWire() {
    var el = $('ir-wire'); if (!el) return;
    if (!liveShown() || LIVE.length < 3) { el.hidden = true; return; }
    var top = LIVE.slice().sort(function (a, b) { return (b.hot || 0) - (a.hot || 0); }).slice(0, 14);
    var one = function (it, dup) { return '<button type="button" data-wire="' + esc(String(it.id)) + '"' + (dup ? ' tabindex="-1"' : '') + '><span class="w-h">' + flame() + '<b class="num">' + it.hot + '</b></span>' + mark(it, 'w-m') + '<span class="w-t">' + esc(it.t) + '</span><span class="w-s">' + esc(it.h || it.src) + ' \u00b7 ' + esc(ago(Date.parse(it.d))) + '</span></button>'; };
    $('ir-wire-t').innerHTML = '<span class="w-set">' + top.map(function (it) { return one(it); }).join('') + '</span><span class="w-set" aria-hidden="true">' + top.map(function (it) { return one(it, 1); }).join('') + '</span>';
    $('ir-wire-t').style.animationDuration = Math.max(60, top.length * 9) + 's';
    el.hidden = false;
  }
  function openWire(id) {
    var it = null; LIVE.forEach(function (x) { if (String(x.id) === id) it = x; });
    if (!it) return;
    stopTour();
    if (S.lens !== 'live') useLens('live');
    var i = shown.indexOf(it);
    if (i < 0) { clearAll(); i = shown.indexOf(it); }
    if (i >= 0) openSpot(i);
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
    S.q = ''; S.tp = []; S.place = ''; S.kind = ''; S.top = false; S.edu = false; S.nowhere = false; S.pf = []; S.heat = 0; S.vmin = 0; S.within = 0; S.crmin = 0; S.sort = SORTS[S.lens][0][0]; S.from = 0; S.to = buckets.length - 1;
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
    if (S.pf.length) q.push('pf=' + S.pf.map(encodeURIComponent).join('.'));
    if (S.heat && S.lens === 'live') q.push('heat=' + S.heat);
    if (S.within && S.lens === 'live') q.push('within=' + S.within);
    if (S.vmin) q.push('viral=' + S.vmin);
    if (S.crmin) q.push('cred=' + S.crmin);
    if (S.top) q.push('top=1');
    if (S.edu) q.push('edu=1');
    if (S.lens === 'bank' && !fullRange()) q.push('from=' + buckets[S.from] + '&to=' + buckets[S.to]);
    if (S.sort !== SORTS[S.lens][0][0]) q.push('sort=' + S.sort);
    return q.length ? '?' + q.join('&') : '';
  }
  function writeUrl() {
    if (!history.replaceState || SHOWING) return;          // the show screen (intel-prep.js) owns the address while it is up
    var h = location.hash === '#add' ? '' : location.hash;
    history.replaceState(null, '', location.pathname + query() + h);
  }
  var defLens = 'bank', SHOWING = /[?&]show=/.test(location.search);
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
    S.pf = (u.get('pf') || '').split('.').filter(function (x) { return PFC[x]; });
    var pick = function (list, v) { v = +v || 0; return list.some(function (o) { return o[0] === v; }) ? v : 0; };
    S.heat = pick(HEATS, u.get('heat')); S.within = pick(WITHIN, u.get('within')); S.vmin = pick(VIRALS, u.get('viral')); S.crmin = pick(CREDS, u.get('cred'));
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
  var PF_WORDS = [[/\b(?:on|from|in) x\b|\btwitter\b|\btweets?\b|\bx posts?\b|\bx only\b/, 'X'], [/\byoutube\b/, 'YouTube'], [/\btelegram\b/, 'Telegram'],
    [/\binstagram\b|\binsta\b/, 'Instagram'], [/\bfacebook\b/, 'Facebook'], [/\bthreads\b/, 'Threads'], [/\btiktok\b/, 'TikTok']];
  var STOP = /\b(happened|happen|happening|going|at|say|said|says|told|tell|show|me|give|find|get|all|any|the|a|an|of|about|on|for|in|from|with|that|which|what|is|are|was|were|i|want|need|please|some|can|you|to|and|or|by|it|this|these|those|evidence|proof|proves|prove|items?|things?|stuff|posts?|anything|everything|related|showing|where|who|how|did|do|does|uses?|using|used|has|have|had|they|their|them)\b/g;
  function ask(text) {
    var raw = String(text || '').trim().slice(0, 200);
    if (!raw) { clearAll(); return; }
    stopTour();
    var t = ' ' + raw.toLowerCase().replace(/[“”"’]/g, "'") + ' ', said = [];
    var ns = { q: '', tp: [], place: '', kind: '', pf: [], sort: SORTS[S.lens][0][0], from: 0, to: buckets.length - 1 };
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
    // where it was posted: "on X", "YouTube only", "Telegram and Instagram"
    PF_WORDS.forEach(function (pw) { if (pw[0].test(t)) { if (ns.pf.indexOf(pw[1]) < 0) ns.pf.push(pw[1]); eat(new RegExp(pw[0].source, 'g')); } });
    if (ns.pf.length) eat(/\b(only|just)\b/g);
    // the new orders: liked, viewed, viral
    var want = /\b(most liked|liked|likes)\b/.test(t) ? 'likes' : /\b(most viewed|most watched|views)\b/.test(t) ? 'views' : /\b(viral|reach|spread)\b/.test(t) ? 'viral' : '';
    if (want) { eat(/\b(most liked|liked|likes|most viewed|most watched|views|viral|reach|spread|most)\b/g); }
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
    if (want) ns.sort = want;
    S.q = ns.q; S.tp = ns.tp; S.place = ns.place; S.kind = ns.kind; S.pf = ns.pf; S.heat = 0; S.vmin = 0; S.within = 0; S.crmin = 0; S.top = false; S.nowhere = false; S.sort = ns.sort; S.from = ns.from; S.to = ns.to;
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
    if (!count() && S.pf.length) { let_go.push(S.pf.map(pfName).join(' and ') + ' only'); S.pf = []; }
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
    if (S.pf.length) parts.push('on ' + S.pf.map(pfName).join(' or '));
    if (S.place) parts.push('in ' + (S.place.indexOf('c:') === 0 ? S.place.slice(2) : placeName(S.place)));
    parts = parts.concat(said);
    var line = parts.join(' ') + '.';
    if (S.sort === 'top') line += ' Top picks first.';
    if (S.sort === 'hot') line += ' Hottest first.';
    if (S.sort === 'viral') line += ' Most viral first.';
    if (S.sort === 'likes') line += ' Most liked first.';
    if (S.sort === 'views') line += ' Most viewed first.';
    if (let_go.length) line = 'Nothing matched all of it, so I let go of ' + let_go.join(' and ') + '. ' + line;
    if (!shown.length || (let_go.length && shown.length === items.length)) line = 'Nothing here matches that yet. Try a place, a topic or a year, like: videos from Gaza in 2024. Or add what is missing.';
    say(line, true);
    if (S.place && shown.length) focusPlace(S.place);
    $('ir-items').scrollTop = 0;
  }
  // Frame what is shown: the smallest view that holds every place, with room round it, never closer than a region.
  function frameShown() {
    var keys = [];
    shown.forEach(function (it) { keys = keys.concat(keysOf(it)); });
    fitTo(placePts(keys), 1, 4);
  }
  function focusPlace(v) {
    var ks = v.indexOf('c:') === 0 ? Object.keys(P).filter(function (k) { return P[k][1] === v.slice(2) && P[k][2] != null; }) : v.split(',');
    var pts = placePts(ks);
    // a whole country: frame the country itself (its outline's corners), not only the places in it
    if (v.indexOf('c:') === 0 && G) {
      var cn = TOPO[v.slice(2)] || v.slice(2);
      (BYNAME[cn] || []).forEach(function (f) { var b = G.geoBounds(f); if (b[1][0] - b[0][0] < 90) pts.push(b[0], b[1], [b[0][0], b[1][1]], [b[1][0], b[0][1]]); });
    }
    if (pts.length) fitTo(pts, 2, 40);
  }

  /* ------------------------------------------------------------ the spotlight */
  function openSpot(i) {
    var it = shown[i]; if (!it) return;
    spotAt = i;
    var y = ytId(it.u), dlg = $('ir-spot');
    var srcName = it.src === 'Document' ? 'the document' : it.src === 'News' ? (it.h || 'the news site') : it.src;
    var chips = '<span class="pfc" style="--pc:' + pfColor(pfOf(it)) + '">' + mark(it, 'ir-mk') + esc(KIND_N[kindOf(it)] + ' on ' + pfName(pfOf(it))) + '</span>' +
      (it.hot != null ? '<span class="hotc">' + flame() + 'Hot ' + it.hot + '</span>' : '') + (crOf(it) != null ? '<span title="How credible the source is, from the room\'s own table">Source credibility ' + crOf(it) + '</span>' : '') + (it._v != null ? '<span class="virc">' + ICO.viral + 'Viral ' + it._v + '</span>' : '') + (it.q ? '<span class="q">&#9733; Top pick</span>' : '') + (it.g ? '<span class="gr">Graphic footage</span>' : '') +
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
      spotReach(it) +
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
  function spotReach(it) {
    var r = reachOf(it), p = pfOf(it), nm = pfName(p), bits = [];
    if (r && r.x) return '<p class="ir-s-r">' + esc(nm) + ' no longer shows this one\'s counts: it was deleted, made private or put behind a login.</p>';
    if (!r) return HIDES[p] ? '<p class="ir-s-r ir-s-rx">' + esc(nm) + ' does not show its like counts without a login, so none is shown here.</p>' : '';
    if (r.lk != null) bits.push('<span>' + ICO.like + '<b class="num">' + r.lk.toLocaleString('en-US') + '</b> likes</span>');
    if (r.vw != null) bits.push('<span>' + ICO.view + '<b class="num">' + (r['~'] ? 'about ' : '') + r.vw.toLocaleString('en-US') + '</b> views</span>');
    if (r.rp != null) bits.push('<span>' + ICO.reply + '<b class="num">' + r.rp.toLocaleString('en-US') + '</b> replies</span>');
    if (r.rs != null) bits.push('<span>' + ICO.repost + '<b class="num">' + r.rs.toLocaleString('en-US') + '</b> reposts</span>');
    if (!bits.length) return '';
    var when = r.at ? (Date.parse(r.at) ? ' Counted ' + ago(Date.parse(r.at)) + '.' : '') : '';
    return '<p class="ir-s-r">' + bits.join('') + '<small>On ' + esc(nm) + ', as ' + esc(nm) + ' shows them.' + when + (it._v != null ? ' ' + esc(viralWhy(it)) + '.' : '') + '</small></p>';
  }
  function closeSpot() { var d = $('ir-spot'); spotAt = -1; if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); } d.innerHTML = ''; }
  function pulseAt(k) {
    if (!P[k] || P[k][2] == null) return;
    flyTo(Math.max(V.k, 6), P[k][3], P[k][2]);
    setTimeout(function () { PULSE = { k: k, at: Date.now() }; pinSig = ''; requestDraw(); }, 760);
  }

  /* ------------------------------------------------------------ the tour: one item every 12 seconds, the map flying to it */
  var tourT = 0, tourAt = -1;
  function lowerThird(it) {
    var lt = $('ir-lt');
    if (!it) { lt.hidden = true; lt.innerHTML = ''; return; }
    var y = ytId(it.u), th = it.th || (y ? 'https://i.ytimg.com/vi/' + y + '/mqdefault.jpg' : '');
    lt.innerHTML = (th ? '<span class="ir-lt-th" style="background-image:url(' + esc(th) + ')"></span>' : '') +
      '<span class="ir-lt-b"><span class="ir-lt-k">' + esc(LENS[S.lens]) + (it.hot != null ? ' · <b>' + flame() + 'Hot ' + it.hot + '</b>' : it.q ? ' · <b>&#9733; Top pick</b>' : '') + '</span>' +
      '<span class="ir-lt-t">' + esc(it.t) + '</span><span class="ir-lt-m">' + mark(it, 'ir-mk') + esc(fmtDate(it.d)) + ' · ' + esc(it.p === 'global' && it.pw ? it.pw : placeName(it.p)) + ' · ' + esc(it.h || it.src) + '</span>' + reachLine(it) + '</span>' +
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
    if (!on) { h.classList.remove('ir-ctl-on'); $('ir-ctl').setAttribute('aria-pressed', 'false'); }
    $('ir-stream').querySelector('span').textContent = on ? 'Leave full screen' : 'Full screen';
    $('ir-stream').setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) { clock(); clockT = setInterval(clock, 15000); poke(); spin(); } else { clearInterval(clockT); }
    if (on && h.requestFullscreen && !document.fullscreenElement) h.requestFullscreen().catch(function () {});
    if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    setTimeout(function () { refit(); }, 90);
    setTimeout(function () { refit(); }, 400);
  }
  function refit() { pinSig = ''; requestDraw(); }          // the view is a place and a zoom, so a new size only redraws it

  /* ------------------------------------------------------------ copy notes: the list as text, for show prep */
  function copyNotes() {
    var head = 'Intel Room, ' + LENS[S.lens].toLowerCase() + ($('ir-said').textContent ? ': ' + $('ir-said').textContent.replace(/\s*Clear$/, '') : '') + '\n' + location.href + '\n\n';
    var txt = head + shown.slice(0, 40).map(function (it, i) {
      var r = reachOf(it), n = r && !r.x ? [r.lk != null ? r.lk.toLocaleString('en-US') + ' likes' : '', r.vw != null ? (r['~'] ? '~' : '') + r.vw.toLocaleString('en-US') + ' views' : ''].filter(Boolean).join(', ') : '';
      return (i + 1) + '. ' + it.t + '\n   ' + [fmtDate(it.d), it.p === 'global' && it.pw ? it.pw : placeName(it.p), it.h || it.src, pfName(pfOf(it)) + (n ? ': ' + n : ''), it.hot != null ? 'Hot ' + it.hot + ' (' + (it.hotWhy || '') + ')' : '', it._v != null ? 'Viral ' + it._v : ''].filter(Boolean).join(' · ') + '\n   ' + it.u + (it.n ? '\n   ' + it.n : '');
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
      '<label><input type="radio" name="ir-who" value="mine"><span><b>I made it</b><small>My own video, article or research. Everyone who uses the room sees it, and so do the audiences of the creators who show the room on their streams: more people see your work</small><i class="num">+' + XP.mine + ' XP</i></span></label></fieldset>' +
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
      (mid === MISSION.mine ? '<p>You said you made it, so your account is marked as a creator\'s. Once it is on the map, everyone who uses the room can find it, and creators show the room on their live streams, so their audiences see your work too. Keep sending it: each one that is accepted earns the XP again.</p>' : '') +
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
      if ((b = t.closest('button[data-pf]'))) {
        var pv = b.getAttribute('data-pf');
        if (pv === '') S.pf = []; else { var pa = S.pf.indexOf(pv); if (pa >= 0) S.pf.splice(pa, 1); else S.pf.push(pv); }
        say(''); render(); return;
      }
      if ((b = t.closest('button[data-seg]'))) { S[b.getAttribute('data-seg')] = +b.getAttribute('data-v') || 0; render(); return; }
      if ((b = t.closest('button[data-wire]'))) { openWire(b.getAttribute('data-wire')); return; }
      if ((b = t.closest('button[data-board]'))) { var bi = shown.indexOf(BOARD_IT); if (bi >= 0) { stopTour(); openSpot(bi); } return; }
      if ((b = t.closest('.ir-chip'))) {
        var v = b.getAttribute('data-t');
        if (v === '') S.tp = []; else { v = +v; var at = S.tp.indexOf(v); if (at >= 0) S.tp.splice(at, 1); else S.tp.push(v); }
        say(''); render(); return;
      }
      if ((b = t.closest('#ir-kind button'))) { S.kind = b.getAttribute('data-k'); render(); return; }
      if ((b = t.closest('#ir-top'))) { S.top = !S.top; render(); return; }
      if ((b = t.closest('#ir-edu'))) { S.edu = !S.edu; render(); return; }
      if ((b = t.closest('#ir-stream'))) { stream(); return; }
      if ((b = t.closest('#ir-exit'))) { stream(false); return; }
      if ((b = t.closest('#ir-ctl'))) { var on = !document.documentElement.classList.contains('ir-ctl-on'); document.documentElement.classList.toggle('ir-ctl-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); setTimeout(refit, 60); return; }
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
        poke();
        if (z === 'home') home();
        else if (z === 'proj') setMode(V.mode === 'globe' ? 'flat' : 'globe');
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
      if (SHOWING) return;          // the show screen has its own keys
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
      if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.closest && ev.target.closest('.ir-pin,.ir-gl,.ir-edge')) { ev.preventDefault(); openPin(pinAt(ev.target)); }
    });
    document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.documentElement.classList.contains('ir-show')) stream(false); });
    map.addEventListener('pointerdown', onDown);
    map.addEventListener('pointermove', onMove);
    map.addEventListener('pointerup', onUp);
    map.addEventListener('pointercancel', onUp);
    map.addEventListener('pointerleave', function () { $('ir-tip').hidden = true; });
    /* The wheel and the page (16 October 2026, Armin: "it's really difficult to scroll up and down ... the map goes up and
       down, and the page goes up and down ... especially when I click on full screen"). On the page, the wheel scrolls the
       PAGE, over the map and over everything on it, until the map is clicked or Ctrl (Cmd on a Mac) is held; then it zooms
       the map, until the pointer leaves it. On the full screen the page does not move at all and the wheel always zooms. A
       pinch on a trackpad arrives as the wheel with Ctrl held, so it zooms the map. */
    box.addEventListener('wheel', function (ev) {
      if (!(isFull() || mapOn || ev.ctrlKey || ev.metaKey)) { mapHint('wheel'); return; }
      ev.preventDefault(); stopTour(); poke(); var r = box.getBoundingClientRect();
      zoomAt(Math.exp(-ev.deltaY * (ev.deltaMode ? 0.05 : 0.0018)), ev.clientX - r.left, ev.clientY - r.top);
    }, { passive: false });
    box.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') mapOn = false; });
    document.addEventListener('pointerdown', function (ev) { if (!box.contains(ev.target)) mapOn = false; }, true);
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
    // news and YouTube are an article or a video; an X post keeps what it carries (a post, an image, a video, an article)
    it.k = it.src === 'X' ? (['post', 'image', 'video', 'article'].indexOf(it.k) >= 0 ? it.k : 'post') : it.k === 'video' ? 'video' : 'article';
    return it;
  }
  var liveUrl = root.getAttribute('data-live'), reachUrl = root.getAttribute('data-reach');
  function soft(u, opt) { return u ? fetch(u, opt).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }) : Promise.resolve(null); }
  Promise.all([fetch(root.getAttribute('data-src')).then(function (r) { if (!r.ok) throw r; return r.json(); }),
               G ? soft(root.getAttribute('data-geo')) : Promise.resolve(null),
               soft(liveUrl, { cache: 'no-cache' }), soft(reachUrl, { cache: 'no-cache' })]).then(function (res) {
    D = res[0]; BANK = D.items; P = D.places; topics = D.topics;
    if (res[2] && Array.isArray(res[2].items)) { LIVE_AT = Date.parse(res[2].at) || 0; LIVE = res[2].items.filter(function (it) { return it && it.u && it.t; }).map(normLive); }
    if (res[3] && res[3].by && typeof res[3].by === 'object') { REACH = res[3].by; REACH_AT = Date.parse(res[3].at) || 0; }
    computeViral();
    // an order with nothing to order by is not offered (no like counts read yet, say)
    ['live', 'bank'].forEach(function (l) {
      var set = setOf(l);
      SORTS[l] = SORTS[l].filter(function (o) { var f = o[0] === 'viral' ? function (it) { return it._v; } : o[0] === 'likes' ? likesOf : o[0] === 'views' ? viewsOf : null; return !f || set.some(function (it) { return f(it) != null; }); });
    });
    // The glow behind each circle: gold for the bank and the readers, a warmer white gold for the last 24 hours.
    map.insertAdjacentHTML('afterbegin', '<defs><radialGradient id="irg"><stop offset="0" stop-color="#F4C430" stop-opacity=".5"/><stop offset="1" stop-color="#F4C430" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="irl"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".65"/><stop offset="1" stop-color="#FFB547" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="irs"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>');
    gPins = document.createElementNS(SVGNS, 'g'); gPins.setAttribute('class', 'pins');
    map.appendChild(gPins);
    cv = $('ir-globe');
    if (G && res[1] && res[1].objects && cv && cv.getContext) {
      ctx = cv.getContext('2d');
      GRAT = G.geoGraticule().step([15, 15])();
      LAND = topoFeatures(res[1], BYNAME);
      if (store('ir-proj') === 'flat') V.mode = 'flat';
      root.setAttribute('data-map', V.mode);
      var pb = $('ir-proj'); if (pb) { pb.setAttribute('data-mode', V.mode); pb.setAttribute('aria-label', V.mode === 'globe' ? 'Lay the map flat' : 'Show the globe'); }
      sizeCanvas();
      V.lon = -50; V.lat = 18;          // the first view turns in from the west
    } else $('ir-maphint').textContent = 'The map could not load. Everything is in the list.';
    $('ir-kind').innerHTML = KINDS.map(function (k) { return '<button type="button" data-k="' + k[0] + '" aria-pressed="false">' + k[1] + '</button>'; }).join('');
    makeBuckets();
    defLens = liveFresh() ? 'live' : 'bank';
    readUrl(location.search);
    $('ir-bar').hidden = false; $('ir-zoom').hidden = !LAND;
    if (LAND) setView(V.lon, V.lat, V.k, true);
    wire();
    render();
    drawViews();
    drawWire();
    // a phone's box is near square: open on the Middle East and Europe, where most of the bank is
    if (S.place) focusPlace(S.place);
    else if (box.clientWidth >= 700) frameShown();
    else flyTo(V.mode === 'globe' ? 1.25 : 3, 36, 31);
    // What intel-prep.js (the creator tools and the show screen) is handed: the items (the last hours, the bank, one by its
    // id: L for the last hours, B for the bank, R for a reader's find), and the room's own words and marks for them.
    var BYID = {};
    LIVE.forEach(function (it) { BYID[it.id] = it; }); BANK.forEach(function (it) { BYID['B' + it.id] = it; it._code = 'B' + it.id; });
    window.IRoom = { shown: function () { return shown.slice(); }, lens: function () { return S.lens; }, said: function () { return $('ir-said').textContent; },
      live: function () { return LIVE.slice(); }, bank: function () { return BANK.slice(); }, liveAt: function () { return LIVE_AT; },
      byId: function (id) { return BYID[id] || RD.filter(function (it) { return it.id === id; })[0] || null; },
      topics: function () { return topics.slice(); }, topicsOn: function () { return S.tp.map(function (i) { return topics[i]; }); },
      when: function (it) { return fmtDate(it.d); }, where: function (it) { return it.p === 'global' && it.pw ? it.pw : placeName(it.p); },
      code: function (it) { return it._code || String(it.id); }, pf: pfOf, kind: kindOf, mark: function (it) { return mark(it); }, fmt: fmtN, yt: ytId,
      reach: function (it) { var r = reachOf(it); return r && !r.x ? { likes: r.lk, views: r.vw, replies: r.rp, platform: pfName(pfOf(it)), viral: it._v } : null; } };
    if (!document.getElementById('ir-prep-js')) { var ps = document.createElement('script'); ps.id = 'ir-prep-js'; ps.src = root.getAttribute('data-prep') || '../assets/intel-prep.js'; document.body.appendChild(ps); }
    root.setAttribute('data-ready', '1');
    loadReaders();
    if (location.hash === '#add') openAdd();
    setTimeout(function () { var h = $('ir-maphint'); if (h) h.hidden = true; }, 6000);
  }).catch(function () {
    $('ir-maphint').textContent = 'The map could not load. The newest items are listed here.';
  });
})();
