/* The results map (results/). Built by build/results.py, which says what each file is for.

   Four parts, in this order:
   1. ElectionData   the data adapter: reads assets/election-results.json, polls it, works out who won or leads where.
                     Every other part reads ElectionData.view(office) and nothing else, so a new feed changes only the file.
   2. mockEngine     TEST NUMBERS, made in the browser from each state's 2024 lean: an election night that runs from
                     polls closing to the last call in three minutes. Offered only where the build allows it (data-mock-ok).
   3. the map        states as SVG paths (assets/results-geo/states.json), the small-state chips, the hover card.
   4. the panels     the tally bar, the deep dive (counties drawn from assets/results-geo/counties/<ST>.json), search,
                     the tabs and the stream view (?stream=1, and &transparent=1 for an OBS browser source).
   The address keeps the state: ?office=governor#tx opens that tab with Texas pinned. */
(function () {
  'use strict';
  var root = document.getElementById('em');
  if (!root) return;
  var API = root.getAttribute('data-api'), GEO = root.getAttribute('data-geo'), ROOT = root.getAttribute('data-root') || '../';
  var qs = new URLSearchParams(location.search);
  var MOCK_OK = root.getAttribute('data-mock-ok') === '1';
  var OFFICES = ['senate', 'house', 'governor', 'president'];
  /* Which votes the map counts (Elysa, 30 October 2026: "include early voting results on the live map"): all of them,
     only those cast before Election Day (early in person and by mail), or only Election Day's. Read from r.modes, which
     exists only where the official source itself splits the count; anywhere else the map says the state does not. */
  var VOTES = ['all', 'early', 'day'];
  var vmode = VOTES.indexOf(qs.get('votes')) >= 0 ? qs.get('votes') : 'all';
  var SMALL = ['VT', 'NH', 'MA', 'RI', 'CT', 'NJ', 'DE', 'MD', 'DC'];
  var PNAME = { R: 'Republican', D: 'Democrat', I: 'Independent', L: 'Libertarian', G: 'Green', O: 'Other' };
  var nf = new Intl.NumberFormat('en-US');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, el) { return (el || root).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------------------------------------------------------------- 1. the data adapter */
  var ElectionData = (function () {
    var doc = null, subs = [], timer = null, mockOn = false, engine = null;
    function race(office, st) {
      var o = doc && doc.offices[office];
      var r = o && o.races[st];
      if (!r) return { st: st, none: true };
      // copies, so the early-vote view never writes over the full count
      var cands = (r.candidates || []).map(function (c) { var o = {}; for (var k in c) o[k] = c[k]; o.votes = c.votes || 0; return o; });
      var part = vmode !== 'all' && office !== 'president';
      if (part) {
        var m = r.modes;
        if (!m) {
          cands.forEach(function (c) { c.votes = 0; c.pct = 0; });
          return { st: st, r: r, cands: cands, total: 0, status: 'nosplit', party: null, called: null, margin: null, reporting: r.reporting || 0, seats: r.seats || 1, part: true };
        }
        var byP = {}, seen = {};
        (vmode === 'early' ? [m.early, m.mail] : [m.day]).forEach(function (x) { Object.keys(x || {}).forEach(function (p) { byP[p] = (byP[p] || 0) + (x[p] || 0); }); });
        // the source splits by party: each party's votes go to its first candidate on the ballot
        cands.forEach(function (c) { c.votes = seen[c.party] ? 0 : (byP[c.party] || 0); seen[c.party] = 1; });
      }
      cands.sort(function (a, b) { return (b.votes || 0) - (a.votes || 0); });
      var total = cands.reduce(function (s, c) { return s + (c.votes || 0); }, 0);
      cands.forEach(function (c) { c.pct = total ? 100 * c.votes / total : 0; });
      var lead = total ? cands[0] : null;
      // a call is for the whole race, so a slice of the votes (early, or Election Day) only ever shows who leads it
      var called = part ? null : (r.called || null);
      var status = called ? 'won' : (lead && (r.reporting > 0 || part) ? 'lead' : 'wait');
      var party = called || (lead && status === 'lead' ? lead.party : null);
      if (party && party !== 'R' && party !== 'D') party = 'I';
      return { st: st, r: r, cands: cands, total: total, status: status, party: party, called: called, part: part,
        margin: total && cands[1] ? cands[0].pct - cands[1].pct : null, reporting: r.reporting || 0, seats: r.seats || 1 };
    }
    function view(office) {
      var out = {};
      // the House is keyed by seat (tx-18), every other office by state
      Object.keys(office === 'house' ? ((doc.offices.house || {}).races || {}) : doc.states).forEach(function (st) { out[st] = race(office, st); });
      return out;
    }
    function emit() { subs.forEach(function (f) { f(doc); }); }
    function fetchDoc() {
      return fetch(API + (API.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    }
    function load() {
      return fetchDoc().then(function (d) {
        doc = d;
        if (mockOn) { engine = mockEngine(d); engine.apply(); }
        emit();
        return d;
      });
    }
    function poll() {
      clearTimeout(timer);
      var wait = mockOn ? 1500 : 30000;
      timer = setTimeout(function () {
        if (document.hidden && !mockOn) return poll();
        if (mockOn && engine) { engine.apply(); emit(); poll(); }
        else load().then(poll, poll);
      }, wait);
    }
    return {
      start: function (m) { mockOn = !!m; return load().then(function (d) { poll(); return d; }); },
      setMock: function (m) { mockOn = !!m; return this.start(mockOn); },
      restart: function () { if (engine) { engine.restart(); engine.apply(); emit(); } },
      show: function (d) { doc = d; emit(); },      // the browser test lays its own numbers over the map; the next read replaces them
      mock: function () { return mockOn; },
      engine: function () { return engine; },
      doc: function () { return doc; },
      race: race, view: view,
      subscribe: function (f) { subs.push(f); }
    };
  })();

  /* ---------------------------------------------------------------- 2. the mock engine (TEST NUMBERS) */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { return (r() + r() + r() + r() - 2) * 1.7; }
  var GEOX = {};      // each state's label x, so the east closes first
  var FC = {};        // the forecasters' margin and rating per House seat (assets/midterms.json), when it loads: {id: {m, w}}
  var HNOW = null;    // who holds the House today, from the same file: {R, D}

  function mockEngine(d) {
    var DUR = 180000, t0 = Date.now(), base = JSON.parse(JSON.stringify(d.offices));
    var night = rng(hash('night' + Math.floor(t0 / 1000)));
    var swing = gauss(night) * 1.5;
    var nSeats = {};      // House seats per state, to share a state's turnout among its districts
    Object.keys((base.house || {}).races || {}).forEach(function (k) { var s = base.house.races[k].st; nSeats[s] = (nSeats[s] || 0) + 1; });
    function names(office, r) {
      var c = (r.candidates || []).filter(function (x) { return x.party; });
      if (office === 'president' || !c.length) return [{ name: 'Republican nominee', party: 'R' }, { name: 'Democratic nominee', party: 'D' }];
      return c.map(function (x) { return { name: x.name, party: x.party, incumbent: x.incumbent }; });
    }
    function apply() {
      var p = Math.min(1, (Date.now() - t0) / DUR);
      d.mock = true; d.live = p < 1; d.updated = new Date().toISOString();
      OFFICES.forEach(function (office) {
        var o = d.offices[office], b = base[office];
        if (!o || !b) return;
        if (office === 'president') { o.final = false; o.year = 2028; }
        Object.keys(b.races).forEach(function (st) {
          var src = b.races[st], r = rng(hash(office + st)), home = office === 'house' ? src.st : st;
          var s = d.states[home] || {}, lean = s.lean == null ? 0 : s.lean;
          // a House seat starts from the forecasters' margin for it (assets/midterms.json), else its state's 2024 lean
          if (office === 'house') lean = FC[st] && FC[st].m != null ? -FC[st].m : lean + gauss(r) * 9;
          var close = 0.05 + 0.35 * (1 - Math.min(1, Math.max(0, (GEOX[home] || 600) / 900)));
          var sp = Math.max(0, Math.min(1, (p - close) / 0.55));
          var rep = sp >= 1 ? 100 : Math.floor(99 * (1 - Math.pow(1 - sp, 2)));
          var margin = lean * 0.85 + swing + gauss(r) * 3;      // R minus D, points
          var mirage = (r() - 0.5) * 16 * (1 - sp);
          var seen = margin + mirage;
          var turnout = Math.round((s.votes2024 || 1500000) / (office === 'house' ? (nSeats[home] || 1) : 1) * (office === 'president' ? 1 : 0.72) * (0.92 + r() * 0.16));
          var counted = Math.round(turnout * rep / 100);
          var cs = names(office, src), minor = cs.filter(function (c) { return c.party !== 'R' && c.party !== 'D' && c.party !== 'I'; });
          var hasD = cs.some(function (c) { return c.party === 'D'; }), opp = hasD ? 'D' : 'I';
          var other = minor.length ? 1.5 + r() * 2.5 : 0;
          var rShare = (100 - other + seen) / 2, oShare = 100 - other - rShare;
          var out = cs.map(function (c) {
            var share = c.party === 'R' ? rShare : (c.party === opp ? oShare : (c.party === 'I' && hasD ? 0.8 : other / Math.max(1, minor.length)));
            return { name: c.name, party: c.party, incumbent: c.incumbent, votes: Math.max(0, Math.round(counted * share / 100)) };
          });
          var called = null;
          if (rep >= 100 || (rep >= 90 && Math.abs(seen) > 1.5) || (rep >= 20 && Math.abs(seen) > 14) || (rep > 0 && sp > 0.02 && Math.abs(lean) > 25)) called = seen > 0 ? 'R' : opp;
          var nr = { seats: src.seats, special: src.special, reporting: rep, called: called, candidates: out, link: src.link, areas: {}, _m: seen, _sp: sp, _turn: counted,
            st: src.st, district: src.district, label: src.label, hold: src.hold };
          if (office !== 'president' && counted) {
            // early in person and by mail are counted first, Election Day last; Democrats vote more by mail (TEST NUMBERS)
            var md = { early: {}, mail: {}, day: {} }, ready = Math.min(1, sp * 2.5);
            out.forEach(function (c) {
              var mf = c.party === 'D' ? 0.22 : 0.09, ef = 0.42, all = c.votes / Math.max(0.01, (ef + mf) * ready + (1 - ef - mf) * sp);
              md.mail[c.party] = (md.mail[c.party] || 0) + Math.round(all * mf * ready);
              md.early[c.party] = (md.early[c.party] || 0) + Math.round(all * ef * ready);
              md.day[c.party] = (md.day[c.party] || 0) + Math.max(0, c.votes - Math.round(all * mf * ready) - Math.round(all * ef * ready));
            });
            nr.modes = md;
          }
          if (src.split && called) nr.split = src.split;
          o.races[st] = nr;
        });
      });
    }
    return { apply: apply, restart: function () { t0 = Date.now(); }, done: function () { return Date.now() - t0 >= DUR; },
      // County numbers for the deep dive, made to add up to the state's count.
      areas: function (office, st, counties) {
        var race = d.offices[office].races[st];
        if (!race || !race._turn) return {};
        var r = rng(hash('c' + office + st)), ws = counties.map(function () { return Math.exp(gauss(r) * 0.9); });
        var sum = ws.reduce(function (a, b) { return a + b; }, 0), out = {};
        // Big counties lean left and small ones right, then every county moves by one amount so the weighted
        // county margin comes out at the state's own margin.
        var raw = counties.map(function (c, i) { var cr = rng(hash(c.fips)); return gauss(cr) * 9 - Math.log(ws[i]) * 9; });
        var avg = raw.reduce(function (a, m, i) { return a + m * ws[i] / sum; }, 0);
        counties.forEach(function (c, i) {
          var cr = rng(hash(c.fips + 'r')), m = race._m + raw[i] - avg;
          var v = Math.round(race._turn * ws[i] / sum), rs = Math.max(0, Math.min(100, (m + 100) / 2));
          out[c.fips] = { R: Math.round(v * rs / 100), D: Math.round(v * (100 - rs) / 100), reporting: Math.min(100, Math.round(race.reporting * (0.8 + cr() * 0.4))) };
        });
        return out;
      } };
  }

  /* ---------------------------------------------------------------- 3. the map */
  var geo = null, office = OFFICES.indexOf(qs.get('office')) >= 0 ? qs.get('office') : 'senate', sel = null, cur = {};
  var svg = $('.em-map svg'), gS = $('.em-states'), gL = $('.em-labels'), tip = $('.em-tip'), small = $('.em-small');
  // The gold edges are their own two paths above the states, never the state moved to the top: moving the pressed path
  // mid-click made Chrome drop the click, so a state on the map could not be picked (Armin, 30 October 2026).
  var ringSel = $('.ring-sel'), ringHov = $('.ring-hov'), side = $('.em-side'), lobbyEl = $('.em-lobby'), hovSt = null;
  var SIDE = window.matchMedia ? matchMedia('(min-width:1100px)') : { matches: false };
  var NS = 'http://www.w3.org/2000/svg';
  // The House map: one tile per seat (assets/results-geo/house-hex.json, made by build/house_hex.py), drawn in its own svg.
  var hex = null, hexTile = {}, hexSvg = $('.em-hex'), gT = $('.em-tiles'), gF = $('.em-flips'), gE = $('.em-hedge'), gHL = $('.em-hlab');
  var hexSel = hexSvg && hexSvg.querySelector('.ring-sel'), hexHov = hexSvg && hexSvg.querySelector('.ring-hov');
  function rings() { return office === 'house' ? { sel: hexSel, hov: hexHov } : { sel: ringSel, hov: ringHov }; }
  function houseRace(k) { var h = ElectionData.doc() && ElectionData.doc().offices.house; return h && h.races[k]; }
  // what a place is called: a state, or a House seat ("Texas 18")
  function nameOf(k) { var h = office === 'house' && houseRace(k); return h ? h.label : (geo.states[k] ? geo.states[k].name : k); }
  function shapeOf(k) { if (office === 'house') return hexTile[k] ? hexD(hexTile[k]) : null; return geo.states[k] && geo.states[k].d; }
  function hexD(t) {
    var S = hex.size, p = [];
    for (var i = 0; i < 6; i++) { var a = Math.PI / 180 * (60 * i - 30); p.push((t.x + S * Math.cos(a)).toFixed(1) + ',' + (t.y + S * Math.sin(a)).toFixed(1)); }
    return 'M' + p.join('L') + 'Z';
  }
  // A sitting member losing: the party winning or ahead is not the party of the member running for the seat again
  // (hold is known only where the member runs again, so this never claims to count every seat changing party).
  function gain(v) { return v && !v.none && v.party && v.status !== 'wait' && !v.part && v.r && v.r.hold && v.r.hold !== v.party ? v.party : null; }
  function gainTag(v) { var g = gain(v); return g ? '<span class="em-gain m-' + (g === 'R' || g === 'D' ? g.toLowerCase() : 'i') + '">' + (g === 'R' ? 'Republican' : g === 'D' ? 'Democratic' : 'Independent') + (v.status === 'won' ? ' gain' : ' ahead of the sitting member') + '</span>' : ''; }

  function cls(v) {
    if (!v || v.none) return 's-n';
    if (v.status === 'nosplit') return 's-x';
    if (v.status === 'wait' || !v.party) return 's-u';
    return 's-' + v.party.toLowerCase() + (v.status === 'won' ? 'w' : 'l');
  }
  function word(v) {
    var o = ElectionData.doc().offices[office];
    if (!v || v.none) return 'no ' + o.label + ' race this year';
    if (v.status === 'nosplit') return 'this state does not report early votes apart';
    if (v.status === 'won') return PNAME[v.called] + ' won';
    if (v.status === 'lead') return PNAME[v.party] + ' ahead, ' + (v.part ? (vmode === 'early' ? 'early and mail votes' : 'Election Day votes') : v.reporting + '% counted');
    return 'no count yet';
  }

  function drawMap() {
    var frag = document.createDocumentFragment(), lab = document.createDocumentFragment();
    Object.keys(geo.states).forEach(function (st) {
      var s = geo.states[st];
      GEOX[st] = s.label[0];
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', s.d); p.setAttribute('data-st', st); p.setAttribute('tabindex', '0'); p.setAttribute('role', 'button');
      frag.appendChild(p);
      if (SMALL.indexOf(st) < 0) {
        var t = document.createElementNS(NS, 'text');
        t.setAttribute('x', s.label[0]); t.setAttribute('y', s.label[1]); t.setAttribute('data-st', st);
        t.textContent = st;
        if (s.size < 900) t.setAttribute('class', 'tiny');
        lab.appendChild(t);
      }
    });
    gS.appendChild(frag); gL.appendChild(lab);
    small.innerHTML = SMALL.map(function (st) { return '<li><button type="button" data-st="' + st + '"><b>' + st + '</b><span></span></button></li>'; }).join('');
    $('.em-loading').remove();
    fillFind();
  }
  // the search box offers every state, and on the House tab every seat too ("Texas 18")
  function fillFind() {
    var dl = document.getElementById('em-states'), h = office === 'house' && ElectionData.doc() && ElectionData.doc().offices.house;
    var opts = Object.keys(geo.states).map(function (st) { return geo.states[st].name; });
    if (h) opts = opts.concat(Object.keys(h.races).map(function (k) { return h.races[k].label; }));
    var html = opts.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
    if (dl._h !== html) { dl.innerHTML = html; dl._h = html; }
    find.placeholder = office === 'house' ? 'Find a seat' : 'Jump to a state';
  }
  function drawHex(h) {
    hex = h; hexTile = {};
    hexSvg.setAttribute('viewBox', '-8 -8 ' + (h.width + 16) + ' ' + (h.height + 16));
    var t = '', f = '', e = '', l = '';
    h.tiles.forEach(function (x) {
      hexTile[x.id] = x;
      t += '<path data-st="' + esc(x.id) + '" d="' + hexD(x) + '"/>';
      f += '<circle data-st="' + esc(x.id) + '" cx="' + x.x + '" cy="' + x.y + '" r="' + (h.size * 0.3).toFixed(1) + '"/>';
    });
    Object.keys(h.states).forEach(function (st) {
      var s = h.states[st];
      e += '<path d="' + s.edge + '"/>';
      l += '<text x="' + s.label[0] + '" y="' + s.label[1] + '" data-st="' + st + '">' + st + '</text>';
    });
    gT.innerHTML = t; gF.innerHTML = f; gE.innerHTML = e; gHL.innerHTML = l;
  }
  function paintHex() {
    if (!hex) return;
    Array.prototype.forEach.call(gT.children, function (p) {
      var k = p.getAttribute('data-st'), v = cur[k], c = cls(v) + (k === sel ? ' sel' : '');
      if (p.getAttribute('class') !== c) p.setAttribute('class', c);
      p.setAttribute('aria-label', nameOf(k) + ': ' + word(v));
    });
    Array.prototype.forEach.call(gF.children, function (c) {
      var g = gain(cur[c.getAttribute('data-st')]), k = g ? 'on g-' + g.toLowerCase() : '';
      if (c.getAttribute('class') !== k) c.setAttribute('class', k);
    });
  }

  function paint() {
    var o = ElectionData.doc().offices[office];
    cur = ElectionData.view(office);
    if (office === 'house') paintHex(); else paintStates();
    // only the map on screen carries the gold edges
    [ringSel, ringHov, hexSel, hexHov].forEach(function (el) { if (el) el.removeAttribute('d'); });
    ring(rings().sel, sel); ring(rings().hov, hovSt);
    tally(o);
    status();
    lobby(o);
    if (tip.getAttribute('data-st') && !tip.hidden) { if (cur[tip.getAttribute('data-st')]) tipFill(tip.getAttribute('data-st')); else hover(null); }
    if (sel && cur[sel]) deep(sel, true);
  }
  function paintStates() {
    Array.prototype.forEach.call(gS.children, function (p) {
      var st = p.getAttribute('data-st'), v = cur[st];
      p.setAttribute('class', cls(v) + (st === sel ? ' sel' : ''));
      p.setAttribute('aria-label', geo.states[st].name + ': ' + word(v));
    });
    Array.prototype.forEach.call(gL.children, function (t) {
      var st = t.getAttribute('data-st'), v = cur[st];
      t.textContent = st;
      if (office === 'president' && v && !v.none) {
        var n = document.createElementNS(NS, 'tspan'); n.setAttribute('x', t.getAttribute('x')); n.setAttribute('dy', '11'); n.textContent = v.seats;
        t.appendChild(n);
      }
      t.setAttribute('class', (geo.states[st].size < 900 ? 'tiny ' : '') + (v && !v.none && v.status !== 'wait' ? 'em-on' : ''));
    });
    Array.prototype.forEach.call(small.querySelectorAll('button'), function (b) {
      var st = b.getAttribute('data-st'), v = cur[st];
      b.className = cls(v) + (st === sel ? ' sel' : '') + (st === hovSt ? ' hov' : '');
      b.querySelector('span').textContent = office === 'president' && v && !v.none ? v.seats : '';
      b.setAttribute('aria-label', geo.states[st].name + ': ' + word(v));
    });
  }
  function ring(el, st) { if (!el) return; var d = st && shapeOf(st); if (d) el.setAttribute('d', d); else el.removeAttribute('d'); }
  // Write a box only when what it says has changed: the page re-reads the numbers every 30 seconds (1.5 with test
  // numbers), and rewriting an unchanged box lost the keyboard's place in it and made a screen reader read it again.
  function put(el, html) { if (el._h === html) return false; el.innerHTML = html; el._h = html; return true; }

  // The side panel when no state is picked: what to do, and the closest races, each a way into its state.
  function lobby(o) {
    if (!lobbyEl) return;
    var ras = Object.keys(cur).map(function (st) { return cur[st]; }).filter(function (v) { return !v.none; });
    var counted = ras.filter(function (v) { return v.total && v.margin != null; }).sort(function (a, b) { return a.margin - b.margin; });
    var past = office === 'president' && !ElectionData.mock(), hs = office === 'house';
    var h = '<h2>' + (hs ? 'Pick a seat' : 'Pick a state') + '</h2><p class="dim">' + (hs
      ? 'Every tile is one House seat, all the same size, grouped by state. Click or tap one to see its count and every other seat in its state.'
      : 'Click or tap any state on the map to see ' + (past ? 'how it voted in 2024.' : 'its ' + esc(o.label) + ' result, county by county.')) + '</p>';
    var row = function (v, right, rk) {
      return '<li><button type="button" data-st="' + esc(v.st) + '"><span class="nn">' + esc(nameOf(v.st)) + '</span>' +
        '<span class="nr dim">' + right + '</span><span class="ng num m-' + rk[1] + '">' + rk[0] + '</span></button></li>';
    };
    var pk = function (p) { return (p === 'R' || p === 'D') ? p.toLowerCase() : 'i'; };
    // seats changing hands lead the House panel: that is the story of the night
    var flips = hs ? ras.filter(gain) : [];
    if (flips.length) {
      h += '<h3>Sitting members losing (' + flips.length + ')</h3><ol class="em-near">' + flips.sort(function (a, b) { return (a.status === 'won' ? 0 : 1) - (b.status === 'won' ? 0 : 1) || a.margin - b.margin; }).slice(0, 10).map(function (v) {
        return row(v, v.status === 'won' ? 'Called' : v.reporting + '% counted', [esc(v.party) + ' gain', pk(v.party)]);
      }).join('') + '</ol>';
    }
    if (counted.length) {
      h += '<h3>' + (past ? 'Closest states in 2024' : v_part() ? 'Closest in ' + (vmode === 'early' ? 'early votes' : 'Election Day votes') : 'Closest races so far') + '</h3><ol class="em-near">' + counted.slice(0, 8).map(function (v) {
        var p = v.cands[0].party;
        return row(v, past || v.part ? '' : v.status === 'won' ? 'Called' : v.reporting + '% counted', [esc(p) + ' +' + v.margin.toFixed(1), pk(p)]);
      }).join('') + '</ol>';
    } else if (hs && Object.keys(FC).length) {
      // before a vote is counted: the seats the forecasters call closest, so the panel is never empty
      var near = ras.filter(function (v) { return FC[v.st] && FC[v.st].m != null; }).sort(function (a, b) { return Math.abs(FC[a.st].m) - Math.abs(FC[b.st].m); });
      h += '<h3>Closest seats, by the forecasters</h3><ol class="em-near">' + near.slice(0, 8).map(function (v) {
        var m = FC[v.st].m, p = m > 0 ? 'D' : 'R';
        return row(v, esc(FC[v.st].w || ''), [Math.abs(m) < 0.05 ? 'Even' : p + ' +' + Math.abs(m).toFixed(1), pk(p)]);
      }).join('') + '</ol><p class="dim em-fc-n">The forecasters’ expected margin, from <a href="' + ROOT + 'races/usa/#midterms">Call the Midterms</a>. The real count replaces it on the night.</p>';
    } else {
      h += '<p class="em-wait">' + ras.length + ' ' + esc(o.label) + ' ' + (hs ? 'seat' : 'race') + (ras.length === 1 ? '' : 's') + ' on the ballot. The closest ones show here as the votes are counted.</p>';
    }
    h += changesFor(null);
    put(lobbyEl, h);
  }
  function v_part() { return vmode !== 'all' && office !== 'president'; }

  function badge(p) { return '<i class="pb pb-' + (p === 'R' || p === 'D' ? p.toLowerCase() : 'i') + '">' + esc(p) + '</i>'; }
  function seatLine(v, o, st) {
    if (office === 'president') return v.seats + ' electoral vote' + (v.seats === 1 ? '' : 's') + (v.r && v.r.split ? ' (split: R ' + v.r.split.R + ', D ' + v.r.split.D + ')' : '');
    var held = v.r && v.r.hold ? ', held by ' + { R: 'a Republican', D: 'a Democrat', I: 'an independent' }[v.r.hold] : '';
    if (office === 'house') return (v.r && v.r.special ? 'Special election' : 'House seat') + held;
    return (v.r && v.r.special ? 'Special election' : (office === 'senate' ? '1 Senate seat' : 'Governor')) + (office === 'senate' ? held : '');
  }
  // Who leads and by how many percentage points (Elysa, 30 October 2026: "show the actual percentage points for margin
  // of victory"): the first two candidates' shares of the count, apart.
  function marginTag(v) {
    if (!v.total || v.margin == null || !v.cands[1]) return '';
    var p = v.cands[0].party, k = (p === 'R' || p === 'D') ? p.toLowerCase() : 'i';
    return '<span class="em-mg m-' + k + '">' + esc(PNAME[p] || p) + (v.status === 'won' ? ' won by ' : ' ahead by ') + v.margin.toFixed(1) + ' points' +
      (v.part ? (vmode === 'early' ? ' in early votes' : ' on Election Day') : '') + '</span>';
  }
  // One line under a race: who leads the votes cast early (in person and by mail) and who leads Election Day's, where
  // the source splits them. The gap between the two is the "mirage" a viewer should expect as the count moves.
  function modeLine(v) {
    var m = v.r && v.r.modes;
    if (!m || v.part) return '';
    var seg = function (xs, label) {
      var t = {}, n = 0;
      xs.forEach(function (x) { Object.keys(x || {}).forEach(function (p) { t[p] = (t[p] || 0) + (x[p] || 0); n += x[p] || 0; }); });
      if (!n) return '';
      var p = Object.keys(t).sort(function (a, b) { return t[b] - t[a]; })[0], k = (p === 'R' || p === 'D') ? p.toLowerCase() : 'i';
      return '<span>' + label + ' <b class="m-' + k + '">' + esc(p) + ' ' + (100 * t[p] / n).toFixed(1) + '%</b></span>';
    };
    var a = seg([m.early, m.mail], 'Early and mail'), b = seg([m.day], 'Election Day');
    return a || b ? '<p class="em-ml">' + [a, b].filter(Boolean).join('') + '</p>' : '';
  }
  /* Early voting (Elysa, 30 October 2026: "include early voting results on the live map"): how the counted votes were
     cast, only where the official source itself splits them (r.modes, written by results_feed.py from the source; today
     North Carolina's State Board of Elections). Nothing is estimated: a race whose source gives no split shows no table. */
  var MODES = [['early', 'Early, in person'], ['mail', 'By mail'], ['day', 'Election Day'], ['provisional', 'Provisional']];
  function modesTable(v) {
    var m = v.r && v.r.modes;
    if (!m || !v.cands[1]) return '';
    var a = v.cands[0].party, b = v.cands[1].party;
    var lk = function (p) { return p === 'D' ? ' lead-d' : p === 'R' ? ' lead-r' : ''; };
    var rowsH = MODES.map(function (md) {
      var x = m[md[0]]; if (!x) return '';
      var t = Object.keys(x).reduce(function (s, k) { return s + (x[k] || 0); }, 0); if (!t) return '';
      var sa = 100 * (x[a] || 0) / t, sb = 100 * (x[b] || 0) / t;
      return '<tr><td>' + md[1] + '</td><td class="num">' + nf.format(t) + '</td><td class="num' + (sa >= sb ? lk(a) : '') + '">' + sa.toFixed(1) + '%</td><td class="num' + (sb > sa ? lk(b) : '') + '">' + sb.toFixed(1) + '%</td></tr>';
    }).join('');
    if (!rowsH) return '';
    return '<h3 class="em-modes-h">Early and Election Day votes</h3><table class="em-modes"><thead><tr><th>Counted so far</th><th class="num">Votes</th><th class="num">' + esc(a) + '</th><th class="num">' + esc(b) + '</th></tr></thead><tbody>' + rowsH +
      '</tbody></table><p class="dim em-modes-n">Early and mail votes are usually counted first, so an early lead can shrink or grow as Election Day votes come in.</p>';
  }
  function calledTag(v) { return v.status === 'won' ? '<span class="called">&#10003; Called for ' + esc(PNAME[v.called] || v.called) + '</span>' : ''; }
  function rows(v, n) {
    if (!v.cands.length) return '<p class="dim">The candidates for this race are not on the site yet.</p>';
    return '<ul class="em-cands">' + v.cands.slice(0, n).map(function (c, i) {
      var p = (c.party === 'R' || c.party === 'D') ? c.party.toLowerCase() : 'i';
      // Their Liberty Score beside the count: filled when graded on votes in Congress, an outline when on the record.
      var gr = c.grade ? ' <span class="em-gr' + (c.gradedOn === 'record' ? ' em-gr-o' : '') + '" title="Liberty Score ' + esc(c.grade) +
        (c.gradedOn === 'record' ? ', from what they have said and done' : ', from their votes in Congress') + '">' + esc(c.grade) + '</span>' : '';
      return '<li class="' + (i === 0 && v.total ? 'em-lead' : '') + '">' + badge(c.party) + '<span class="nm">' + esc(c.name) + gr + (c.incumbent ? ' <small>incumbent</small>' : '') +
        (v.called && c.party === v.called ? ' <b class="ck" aria-label="winner">&#10003;</b>' : '') + '</span>' +
        '<span class="em-vt num">' + (v.total ? nf.format(c.votes) : '&ndash;') + '</span><span class="pc num">' + (v.total ? c.pct.toFixed(1) + '%' : '') + '</span>' +
        '<span class="pbar"><i class="f-' + p + '" style="width:' + (v.total ? c.pct.toFixed(1) : 0) + '%"></i></span></li>';
    }).join('') + '</ul>';
  }
  function reportingLine(v) {
    if (office === 'president' && !ElectionData.mock()) return 'Certified result';
    if (v.part) return v.status === 'nosplit' ? 'This state does not report early votes apart from Election Day' : (vmode === 'early' ? 'Early and mail votes only' : 'Election Day votes only');
    if (!v.total && office === 'house' && FC[v.st] && FC[v.st].w) return 'No votes counted yet &middot; Forecasters: ' + esc(FC[v.st].w);
    return v.total ? v.reporting + '% reporting' : 'No votes counted yet';
  }
  /* Trust, per race (Elysa's list, 29 October 2026): when these numbers last changed, where they were read, and a dead
     source shown as STALE with its last good numbers, never a blank map. 20 minutes with no change while counting. */
  var STALE_MIN = 20;
  function clock(iso) { var t = new Date(iso); return isNaN(t) ? '' : t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); }
  function isStale(v) {
    var d = ElectionData.doc();
    if (ElectionData.mock() || !d.live || !v.r || !v.total || v.called || v.reporting >= 100 || !v.r.updated) return false;
    return Date.now() - new Date(v.r.updated).getTime() > STALE_MIN * 60000;
  }
  function trustLine(v) {
    if (ElectionData.mock() || office === 'president' || !v.r || !v.total) return '';
    var src = v.r.numbersFrom, s = src ? (src.url ? '<a href="' + esc(src.url) + '" target="_blank" rel="noopener">' + esc(src.name) + '</a>' : esc(src.name)) : '';
    var bits = [];
    if (v.r.updated) bits.push((isStale(v) ? '<b class="em-stale">No new numbers since ' : 'Updated ') + esc(clock(v.r.updated)) + (isStale(v) ? '</b>' : ''));
    if (s) bits.push('Numbers from ' + s);
    if (v.r.frozen) bits.push('Held by hand while a source is checked');
    return bits.length ? '<p class="em-trust dim">' + bits.join(' &middot; ') + '</p>' : '';
  }
  function changesFor(st) {
    var ch = (ElectionData.doc().changes || []).filter(function (c) { return c.office === office && (!st || c.st === st); });
    if (!ch.length || ElectionData.mock()) return '';
    return '<h3>' + (st ? 'Corrections in this race' : 'Corrections tonight') + '</h3><ul class="em-changes">' + ch.slice(-6).reverse().map(function (c) {
      return '<li><span class="num dim">' + esc(clock(c.at)) + '</span> ' + (st ? '' : '<b>' + esc(geo.states[c.st] ? geo.states[c.st].name : ((houseRace(c.st) || {}).label || c.st)) + ':</b> ') + esc(c.what) + '</li>';
    }).join('') + '</ul>';
  }
  function tipFill(st) {
    var v = cur[st], o = ElectionData.doc().offices[office], nm = nameOf(st);
    tip.setAttribute('data-st', st);
    if (!v || v.none) { tip.innerHTML = '<h3>' + esc(nm) + '</h3><p class="dim">No ' + esc(o.label) + ' race this year.</p>'; return; }
    tip.innerHTML = '<h3>' + esc(nm) + '<small>' + esc(seatLine(v, o, st)) + '</small></h3>' +
      '<p class="rep">' + calledTag(v) + gainTag(v) + '<span>' + reportingLine(v) + '</span>' + marginTag(v) + '</p>' +
      (v.total && !v.part ? '<span class="rbar"><i style="width:' + v.reporting + '%"></i></span>' : '') + rows(v, 2) + modeLine(v) + trustLine(v);
  }
  function tipAt(x, y) {
    var w = tip.offsetWidth, h = tip.offsetHeight, vw = innerWidth, vh = innerHeight;
    var left = x + 18, top = y + 18;
    if (left + w > vw - 8) left = x - w - 18;
    if (top + h > vh - 8) top = y - h - 18;
    tip.style.left = Math.max(8, left) + 'px'; tip.style.top = Math.max(8, top) + 'px';
  }
  function hover(st, ev) {
    if (!st) { tip.hidden = true; tip.removeAttribute('data-st'); hl(null); return; }
    if (tip.getAttribute('data-st') !== st || tip.hidden) { tipFill(st); tip.hidden = false; hl(st); }
    if (ev) tipAt(ev.clientX, ev.clientY);
  }
  function hl(st) {
    hovSt = st || null;
    Array.prototype.forEach.call(root.querySelectorAll('.hov'), function (n) { n.classList.remove('hov'); });
    ring(ringHov, hovSt);      // its own path above every state, so no neighbour covers the gold edge and no state moves
    if (!st) return;
    var b = small.querySelector('[data-st="' + st + '"]'); if (b) b.classList.add('hov');
    var n = lobbyEl && lobbyEl.querySelector('[data-st="' + st + '"]'); if (n) n.classList.add('hov');
  }

  /* ---------------------------------------------------------------- 4. the panels */
  function tally(o) {
    var sum = { R: { w: 0, l: 0 }, D: { w: 0, l: 0 }, I: { w: 0, l: 0 } }, n = 0;
    Object.keys(cur).forEach(function (st) {
      var v = cur[st]; if (v.none) return; n += v.seats;
      if (v.status === 'won' && v.r.split) { sum.R.w += v.r.split.R; sum.D.w += v.r.split.D; return; }
      if (v.party) sum[v.party][v.status === 'won' ? 'w' : 'l'] += v.seats;
    });
    var base = o.base || { R: 0, D: 0 }, of = o.of || n, need = o.need;
    var dW = base.D + sum.D.w, rW = base.R + sum.R.w;
    var pct = function (x) { return (100 * x / of).toFixed(2) + '%'; };
    var who = office === 'president' ? (ElectionData.mock() ? { D: 'Democratic nominee', R: 'Republican nominee' } : { D: 'Harris', R: 'Trump' }) : { D: 'Democrats', R: 'Republicans' };
    var unitTxt = office === 'president' ? 'electoral votes' : (office === 'senate' ? 'seats' : 'governor races');
    var sen = office === 'senate';
    /* Elysa, 29 October 2026: "My only confusion is the count for the senate races." Before a vote is counted the bar
       read Democrats 34, Republicans 31: the seats NOT on the ballot, which looked like a score. So the Senate says in
       words what is being voted on and what each side needs, and the line under each number splits held from won. */
    var needD = need, needR = sen && o.tiebreak === 'R' ? need - 1 : need;
    var mid = need ? '<span class="tmark" style="left:' + pct(need) + '"><b>' + (sen ? 'Control: D ' + needD + ' &middot; R ' + needR : need + ' to win') + '</b></span>' : '';
    var extra = sum.I.w + sum.I.l ? '<span class="tind">Independent ' + (sum.I.w + sum.I.l) + '</span>' : '';
    var basebit = sen ? '<small>' + base.D + ' not on the ballot' + (sum.D.w ? ' + ' + sum.D.w + ' won' : '') + '</small>' : '';
    var basebitR = sen ? '<small>' + base.R + ' not on the ballot' + (sum.R.w ? ' + ' + sum.R.w + ' won' : '') + '</small>' : '';
    var senLine = '';
    if (sen) {
      var up = o.up || (of - base.D - base.R), decided = sum.D.w + sum.R.w + sum.I.w;
      var lD = Math.max(0, needD - dW), lR = Math.max(0, needR - rW);
      senLine = !decided
        ? up + ' seats are on the ballot. Democrats need ' + lD + ' of them for control, Republicans need ' + lR + ' (the Vice President breaks a tie).'
        : (decided + ' of ' + up + ' seats called. ' + (lD === 0 ? 'Democrats have control. ' : lR === 0 ? 'Republicans have control. ' :
           'Democrats need ' + lD + ' more, Republicans need ' + lR + ' more, of the ' + (up - decided) + ' still open.'));
    }
    var houseLine = '';
    if (office === 'house') {
      var called = sum.D.w + sum.R.w + sum.I.w, gD = 0, gR = 0, now = HNOW || {};
      Object.keys(cur).forEach(function (k) { var g = gain(cur[k]); if (g === 'D') gD++; else if (g === 'R') gR++; });
      houseLine = (called ? called + ' of ' + of + ' seats called. ' : 'All ' + of + ' seats are on the ballot; ' + need + ' wins the majority. ') +
        (dW >= need ? 'Democrats have the majority. ' : rW >= need ? 'Republicans have the majority. ' : '') +
        (gD || gR ? 'Sitting members losing so far: ' + gR + ' Democrat' + (gR === 1 ? '' : 's') + ' to a Republican, ' + gD + ' Republican' + (gD === 1 ? '' : 's') + ' to a Democrat.'
          : (now.R || now.D ? 'Today Republicans hold ' + now.R + ' seats and Democrats ' + now.D + '.' : ''));
    }
    if (v_part()) houseLine = (vmode === 'early' ? 'Counting early and mail votes only: ' : 'Counting Election Day votes only: ') + 'the bar shows who leads in them, not who won. ' + houseLine;
    put($('.em-tally'),
      '<div class="tnum tnum-d"><span class="tw num">' + dW + '</span><span class="tn">' + esc(who.D) + (sum.D.l ? ' <em>+' + sum.D.l + ' ahead</em>' : '') + basebit + '</span></div>' +
      '<div class="tbar" role="img" aria-label="' + esc(who.D + ' ' + dW + ', ' + who.R + ' ' + rW + ' ' + unitTxt + (need ? ', ' + need + ' needed' : '')) + '">' +
      '<i class="b-d" style="width:' + pct(dW) + '"></i><i class="b-dl" style="left:' + pct(dW) + ';width:' + pct(sum.D.l) + '"></i>' +
      '<i class="b-rl" style="right:' + pct(rW) + ';width:' + pct(sum.R.l) + '"></i><i class="b-r" style="width:' + pct(rW) + '"></i>' + mid + '</div>' +
      '<div class="tnum tnum-r"><span class="tw num">' + rW + '</span><span class="tn">' + esc(who.R) + (sum.R.l ? ' <em>+' + sum.R.l + ' ahead</em>' : '') + basebitR + '</span></div>' +
      '<p class="tsub">' + (houseLine ? esc(houseLine) + ' ' : '') + (senLine ? esc(senLine) + ' ' : '') + (office === 'governor' ?Object.keys(cur).filter(function (s) { return !cur[s].none; }).length + ' governor races. ' : '') + extra + '</p>');
    $('.em-note').textContent = o.note || '';
  }

  function status() {
    var d = ElectionData.doc(), mock = ElectionData.mock();
    var anyVotes = Object.keys(cur).some(function (s) { return cur[s].total; });
    var live = $('.em-live'), upd = $('.em-upd');
    live.hidden = !(d.live || (mock && !ElectionData.engine().done()));
    live.lastChild.textContent = mock ? 'Live test' : 'Live';
    root.querySelector('.em-test').hidden = !mock;
    var t = new Date(d.updated);
    var at = isNaN(t) ? '' : t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
    if (office === 'president' && !mock) upd.textContent = 'Certified 2024 result';
    else if (!anyVotes && !mock) upd.textContent = countdown();
    else upd.textContent = 'Last updated ' + at;
    /* The whole file stopped arriving while the night is live: say so, keep the last good numbers on the map. The file is
       written at least every 5 minutes by results_feed.py while it runs, even when no number moved. */
    var quiet = !mock && d.live && office !== 'president' && Date.now() - new Date(d.heartbeat || d.updated).getTime() > 12 * 60000;
    upd.classList.toggle('em-stale', quiet);
    if (quiet) { live.hidden = true; upd.textContent = 'Paused: no new numbers since ' + clock(d.updated) + '. The map shows the last ones.'; }
  }

  // 6pm Eastern on election day (Eastern Standard Time by then: the clocks go back on November 1), counted down.
  function countdown() {
    var ms = Date.parse((root.getAttribute('data-election') || '2026-11-03') + 'T23:00:00Z') - Date.now();
    if (!(ms > 0)) return 'Waiting for the first numbers';
    var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
    return 'First polls close in ' + (d ? d + (d === 1 ? ' day ' : ' days ') : '') + h + (h === 1 ? ' hour' : ' hours') + (d ? '' : ' ' + m + ' min') + ' \u00b7 6pm Eastern, November 3';
  }

  var countyCache = {};
  function counties(st) {
    if (countyCache[st]) return Promise.resolve(countyCache[st]);
    return fetch(GEO + 'counties/' + st + '.json').then(function (r) { return r.json(); }).then(function (j) { countyCache[st] = j; return j; });
  }
  function deep(st, quiet) {
    var box = $('.em-deep'), v = cur[st], o = ElectionData.doc().offices[office], nm = nameOf(st), hs = office === 'house';
    if (!v) return;
    var where = hs && v.r ? (geo.states[v.r.st] || {}).name : nm;
    var link = v.r && v.r.link ? '<a class="em-btn dk-link" href="' + ROOT + v.r.link + '">' + (hs ? 'Who is running for ' + esc(nm) : 'Who is running in ' + esc(nm)) + ' &rarr;</a>' : '';
    var head = '<header><div><p class="em-kick">' + esc(o.label) + (office === 'president' && !ElectionData.mock() ? ' 2024' : '') + '</p><h2>' + esc(nm) + '</h2>' +
      (v.none ? '' : '<p class="rep">' + calledTag(v) + gainTag(v) + '<span>' + esc(seatLine(v, o, st)) + ' &middot; ' + reportingLine(v) + '</span>' + marginTag(v) + '</p>') + '</div>' +
      '<button type="button" class="em-close" aria-label="Close ' + esc(nm) + '" title="Close (Esc)">&times;</button></header>';
    box.setAttribute('data-st', st);
    if (v.none) put(box, head + '<p class="dim">No ' + esc(o.label) + ' race in ' + esc(nm) + ' this year.</p>');
    else {
      // 2024 has no county numbers on the site, so it draws no county map: a grey map that can never fill says nothing.
      // A House seat has no county map either (its lines cross counties); it lists every seat in its state instead.
      var hasCo = !hs && !(office === 'president' && !ElectionData.mock() && !(v.r && v.r.areas && Object.keys(v.r.areas).length));
      // The key carries the county numbers too, so a box whose words did not change still redraws its counties when they did.
      var fresh = put(box, head + '<div class="dk-grid' + (hasCo ? '' : ' dk-one') + '"><div class="dk-cands">' + rows(v, 6) + modeLine(v) + modesTable(v) + trustLine(v) + link + changesFor(st) + '</div>' +
        (hasCo ? '<div class="dk-co"><h3>By county</h3><div class="cmap"></div><div class="ctab"></div></div>' : '') +
        (hs && v.r ? delegation(v.r.st, st, where) : '') + '</div>');
      if (!hasCo) return finish();
      var ak = office + st + JSON.stringify((v.r && v.r.areas) || {}) + (ElectionData.mock() ? v.total : '');
      if (fresh || box._a !== ak) { box._a = ak; fillCounties(st, v); }
    }
    finish();
    function finish() {
    box.hidden = false;
    root.classList.add('em-open');
    if (quiet) return;
      var was = sel;
      sel = st;
      paint();
      history.replaceState(null, '', location.pathname + location.search + '#' + st.toLowerCase());
      // Beside the map (a wide screen) the panel is already in view: start it at its top. Under the map (a phone), bring
      // it up, but only when it is not on the screen already.
      if (SIDE.matches && !root.classList.contains('em-s')) { if (was !== st) side.scrollTop = 0; }
      else if (!root.classList.contains('em-s')) {
        var r = box.getBoundingClientRect();
        if (r.top > innerHeight - 120 || r.bottom < 80) box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }
  // Every seat in a House seat's state, each a way to it: a state's whole delegation at a glance.
  function delegation(st, k, where) {
    var ids = Object.keys(cur).filter(function (x) { return cur[x].r && cur[x].r.st === st; });
    if (ids.length < 2) return '';
    ids.sort(function (a, b) { return (parseInt(cur[a].r.district, 10) || 0) - (parseInt(cur[b].r.district, 10) || 0); });
    var won = { R: 0, D: 0, I: 0 };
    ids.forEach(function (x) { var v = cur[x]; if (v.party && v.status !== 'wait') won[v.party] = (won[v.party] || 0) + 1; });
    return '<div class="dk-del"><h3>All ' + ids.length + ' seats in ' + esc(where) + (won.R + won.D + won.I ? ' <small class="dim">D ' + won.D + ' &middot; R ' + won.R + (won.I ? ' &middot; I ' + won.I : '') + ' won or ahead</small>' : '') + '</h3><ol class="em-near em-del">' + ids.map(function (x) {
      var v = cur[x], p = v.total ? v.cands[0].party : null, kk = (p === 'R' || p === 'D') ? p.toLowerCase() : 'i';
      var right = v.total && v.margin != null ? esc(p) + ' +' + v.margin.toFixed(1) : (FC[x] && FC[x].m != null && !v.part ? (Math.abs(FC[x].m) < 0.05 ? 'Even' : (FC[x].m > 0 ? 'D' : 'R') + ' +' + Math.abs(FC[x].m).toFixed(1)) : '&ndash;');
      if (!v.total && FC[x] && FC[x].m != null) kk = FC[x].m > 0 ? 'd' : 'r';
      var sw = '<i class="sw ' + cls(v) + '" aria-hidden="true"></i>';
      return '<li><button type="button" data-st="' + esc(x) + '"' + (x === k ? ' aria-current="true"' : '') + '>' + sw + '<span class="nn">' + esc(/^\d+$/.test(String(v.r.district)) ? 'District ' + v.r.district : 'At large') +
        (gain(v) ? ' <b class="em-gain-s m-' + gain(v).toLowerCase() + '">gain</b>' : '') + '</span><span class="nr dim">' + (v.total ? (v.status === 'won' ? 'Called' : v.part ? '' : v.reporting + '%') : (FC[x] && FC[x].w ? esc(FC[x].w) : '')) + '</span><span class="ng num m-' + kk + '">' + right + '</span></button></li>';
    }).join('') + '</ol></div>';
  }
  function fillCounties(st, v) {
    var box = $('.em-deep'), key = box._a;
    counties(st).catch(function () { return null; }).then(function (g) {
      if (box.getAttribute('data-st') !== st || box._a !== key) return;
      if (!g) { box.querySelector('.cmap').innerHTML = '<p class="dim">The county map could not load. The state result above is complete.</p>'; box._a = null; return; }
      var areas = (v.r && v.r.areas && Object.keys(v.r.areas).length) ? v.r.areas : (ElectionData.mock() ? ElectionData.engine().areas(office, st, g.counties) : {});
      var b = g.box, pad = 4, vb = (b[0] - pad) + ' ' + (b[1] - pad) + ' ' + (b[2] - b[0] + 2 * pad) + ' ' + (b[3] - b[1] + 2 * pad);
      var sw = Math.max(0.15, (b[2] - b[0]) / 600);
      var paths = g.counties.map(function (c) {
        var a = areas[c.fips], k = 's-u';
        if (a && (a.R || a.D)) k = a.R >= a.D ? 's-rl' : 's-dl';
        if (a && a.reporting >= 95 && (a.R || a.D)) k = a.R >= a.D ? 's-rw' : 's-dw';
        var t = c.name + (a && (a.R || a.D) ? ': R ' + (100 * a.R / (a.R + a.D)).toFixed(0) + '%, D ' + (100 * a.D / (a.R + a.D)).toFixed(0) + '%, ' + a.reporting + '% reporting' : ': no count yet');
        return '<path class="' + k + '" d="' + c.d + '"><title>' + esc(t) + '</title></path>';
      }).join('');
      box.querySelector('.cmap').innerHTML = '<svg viewBox="' + vb + '" style="--cw:' + sw + '" role="img" aria-label="Counties of ' + esc(geo.states[st].name) + '">' + paths + '<path class="outline" d="' + g.outline + '"/></svg>';
      var list = g.counties.filter(function (c) { var a = areas[c.fips]; return a && (a.R || a.D); })
        .map(function (c) { var a = areas[c.fips]; return { n: c.name, R: a.R, D: a.D, t: a.R + a.D, rep: a.reporting }; })
        .sort(function (x, y) { return y.t - x.t; });
      box.querySelector('.ctab').innerHTML = list.length ?
        '<table><thead><tr><th>Largest counties</th><th class="num">R</th><th class="num">D</th><th class="num">Counted</th></tr></thead><tbody>' +
        list.slice(0, 8).map(function (c) {
          return '<tr><td>' + esc(c.n) + '</td><td class="num' + (c.R >= c.D ? ' lead-r' : '') + '">' + (100 * c.R / c.t).toFixed(1) + '%</td><td class="num' + (c.D > c.R ? ' lead-d' : '') + '">' + (100 * c.D / c.t).toFixed(1) + '%</td><td class="num">' + c.rep + '%</td></tr>';
        }).join('') + '</tbody></table>' + (list.length > 8 ? '<p class="dim">' + (list.length - 8) + ' more counties on the map.</p>' : '')
        : '<p class="dim">' + (office === 'president' && !ElectionData.mock() ? 'County results for 2024 are not on the site.' : 'County numbers appear here as they are counted.') + '</p>';
    });
  }
  function closeDeep(byKey) {
    var box = $('.em-deep'), was = sel; box.hidden = true; root.classList.remove('em-open'); box.removeAttribute('data-st'); sel = null; paint();
    history.replaceState(null, '', location.pathname + location.search);
    // From the keyboard, the place goes back to the state that was open, so the next Tab carries on from the map.
    if (byKey && was) { var n = small.querySelector('[data-st="' + was + '"]') || gS.querySelector('[data-st="' + was + '"]') || (office === 'house' && find); if (n) n.focus(); }
  }
  function pick(q) {
    q = String(q || '').trim().toLowerCase(); if (!q) return null;
    var hit = null;
    if (office === 'house') return pickSeat(q);
    return pickState(q);
  }
  // A House seat from what a reader types: "TX-18", "tx 18", "Texas 18", "Alaska at large", or a state alone (its seat
  // with the closest count, else its first seat).
  function pickSeat(q) {
    var h = (ElectionData.doc().offices.house || {}).races || {};
    var lab = Object.keys(h).filter(function (k) { return h[k].label.toLowerCase() === q; })[0];
    if (lab) return lab;
    var m = q.match(/^(.*?)[\s-]*(\d{1,2}|al|at large)$/), st = null, num = null;
    if (m && m[1]) { st = pickState(m[1]); num = m[2] === 'al' || m[2] === 'at large' ? 'al' : String(parseInt(m[2], 10)); }
    else st = pickState(q);
    if (!st) return null;
    var id = num ? st.toLowerCase() + '-' + num : null;
    if (id && h[id]) return id;
    if ((num === '1' || num === 'al') && h[st.toLowerCase() + '-al']) return st.toLowerCase() + '-al';
    var ids = Object.keys(h).filter(function (k) { return h[k].st === st; });
    if (!ids.length || num) return null;
    var counted = ids.filter(function (k) { return cur[k] && cur[k].total && cur[k].margin != null; }).sort(function (a, b) { return cur[a].margin - cur[b].margin; });
    return counted[0] || ids[0];
  }
  function pickState(q) {
    q = String(q || '').trim().toLowerCase(); if (!q) return null;
    var hit = null;
    Object.keys(geo.states).some(function (st) { if (st.toLowerCase() === q || geo.states[st].name.toLowerCase() === q) { hit = st; return true; } });
    if (!hit) Object.keys(geo.states).some(function (st) { if (geo.states[st].name.toLowerCase().indexOf(q) === 0) { hit = st; return true; } });
    return hit;
  }
  function setOffice(o) {
    var was = office, k = sel;
    office = o;
    root.classList.toggle('em-h', o === 'house');
    root.classList.toggle('em-p', o === 'president');
    Array.prototype.forEach.call(root.querySelectorAll('[data-office]'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-office') === o ? 'true' : 'false'); });
    // The open place carries across tabs: a House seat opens its state on the Senate tab, a state opens its first seat on
    // the House tab.
    if (k && (was === 'house') !== (o === 'house')) {
      var h = (ElectionData.doc().offices.house || {}).races || {};
      sel = o === 'house' ? (Object.keys(h).filter(function (x) { return h[x].st === k; })[0] || null) : (h[k] ? h[k].st : null);
      if (!sel) { var box = $('.em-deep'); box.hidden = true; root.classList.remove('em-open'); box.removeAttribute('data-st'); }
    }
    var u = new URL(location.href); u.searchParams.set('office', o); u.hash = sel ? '#' + sel.toLowerCase() : '';
    history.replaceState(null, '', u.pathname + u.search + u.hash);
    hover(null);
    fillFind();
    paint();
  }
  function setVotes(m) {
    vmode = m;
    root.classList.toggle('em-part', m !== 'all');
    Array.prototype.forEach.call(root.querySelectorAll('[data-votes]'), function (b) { b.setAttribute('aria-checked', b.getAttribute('data-votes') === m ? 'true' : 'false'); });
    var u = new URL(location.href); if (m === 'all') u.searchParams.delete('votes'); else u.searchParams.set('votes', m);
    history.replaceState(null, '', u.pathname + u.search + u.hash);
    var n = $('.em-part-n');
    if (n) n.textContent = m === 'all' ? '' : (m === 'early' ? 'Only the votes cast before Election Day, in person and by mail.' : 'Only the votes cast on Election Day.') +
      ' Shown where the state reports them apart from the rest; a striped place does not. A race is called on all its votes, so this view shows who leads, never who won.';
    paint();
  }
  function stream(on) {
    root.classList.toggle('em-s', on);
    document.documentElement.classList.toggle('em-streaming', on);
    document.documentElement.classList.toggle('em-clear', on && qs.get('transparent') === '1');
    $('.em-stream').setAttribute('aria-pressed', on ? 'true' : 'false');
    $('.em-stream').textContent = on ? 'Exit stream view' : 'Stream view';
    var u = new URL(location.href); if (on) u.searchParams.set('stream', '1'); else { u.searchParams.delete('stream'); u.searchParams.delete('transparent'); }
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  }

  /* wiring */
  function stOf(t) { var n = t && t.closest && t.closest('[data-st]'); return n ? n.getAttribute('data-st') : null; }
  var mapEl = $('.em-map'), pressed = 0;
  mapEl.addEventListener('pointermove', function (ev) { if (ev.pointerType !== 'mouse') return; hover(stOf(ev.target), ev); });
  mapEl.addEventListener('pointerleave', function () { hover(null); });
  mapEl.addEventListener('pointerdown', function () { pressed = Date.now(); });
  mapEl.addEventListener('click', function (ev) { var st = stOf(ev.target); if (st) { tip.hidden = true; deep(st); } });
  mapEl.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { var st = stOf(ev.target); if (st) { ev.preventDefault(); deep(st); } } });
  // Focus from the keyboard shows the card beside the state; focus that a click or a tap gave it does not (the pointer
  // already shows it, and on a phone the card would sit over the map).
  mapEl.addEventListener('focusin', function (ev) { var st = stOf(ev.target); if (st && Date.now() - pressed > 600) { tipFill(st); tip.hidden = false; hl(st); var r = ev.target.getBoundingClientRect(); tipAt(r.right, r.top); } });
  mapEl.addEventListener('focusout', function () { if (Date.now() - pressed > 600) hover(null); });
  $('.em-deep').addEventListener('click', function (ev) {
    if (ev.target.closest('.em-close')) return closeDeep(ev.detail === 0);
    var b = ev.target.closest('button[data-st]'); if (b) deep(b.getAttribute('data-st'));      // a seat in the state's list
  });
  $('.em-deep').addEventListener('pointerover', function (ev) { var b = ev.target.closest('button[data-st]'); hl(b ? b.getAttribute('data-st') : null); });
  $('.em-deep').addEventListener('pointerleave', function () { hl(null); });
  // The closest-races list: a row lights its state on the map and opens it.
  if (lobbyEl) {
    lobbyEl.addEventListener('click', function (ev) { var st = stOf(ev.target); if (st) deep(st); });
    lobbyEl.addEventListener('pointerover', function (ev) { hl(stOf(ev.target)); });
    lobbyEl.addEventListener('pointerleave', function () { hl(null); });
    lobbyEl.addEventListener('focusin', function (ev) { hl(stOf(ev.target)); });
    lobbyEl.addEventListener('focusout', function () { hl(null); });
  }
  root.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-office]'); if (t) setOffice(t.getAttribute('data-office'));
    var w = ev.target.closest('[data-votes]'); if (w) setVotes(w.getAttribute('data-votes'));
  });
  $('.em-tabs').addEventListener('keydown', function (ev) {
    if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
    var on = OFFICES.filter(function (o) { var b = root.querySelector('[data-office="' + o + '"]'); return b && !b.hidden; });
    var i = (on.indexOf(office) + (ev.key === 'ArrowRight' ? 1 : on.length - 1)) % on.length;
    setOffice(on[i]); root.querySelector('[data-office="' + on[i] + '"]').focus();
  });
  var find = $('.em-find input');
  // A name that matches no state says so in the box, rather than nothing happening.
  function go(said) {
    var q = find.value.trim(); if (!q) return;
    var st = pick(q);
    if (st) { find.setCustomValidity(''); deep(st); find.value = ''; find.blur(); }
    else if (said) { find.setCustomValidity(office === 'house' ? 'No seat called "' + q + '". Try a state, or a seat like TX-18 or Texas 18.' : 'No state called "' + q + '". Try its name or its two letters, like TX.'); find.reportValidity(); }
  }
  find.addEventListener('change', function () { go(false); });
  find.addEventListener('input', function () { find.setCustomValidity(''); });
  find.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); go(true); } });
  $('.em-stream').addEventListener('click', function () { stream(!root.classList.contains('em-s')); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (!$('.em-deep').hidden) closeDeep(true); else if (root.classList.contains('em-s')) stream(false);
  });
  var mockBtn = $('.em-mock');
  if (MOCK_OK) {
    mockBtn.hidden = false;
    mockBtn.addEventListener('click', function () {
      var on = !ElectionData.mock();
      mockBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      ElectionData.setMock(on);
    });
    root.querySelector('.em-test').addEventListener('click', function (ev) { if (ev.target.closest('.em-restart')) ElectionData.restart(); });
    root.querySelector('.em-test').innerHTML += ' <button type="button" class="em-restart">Start the night again</button>';
  }

  var startMock = MOCK_OK && (root.getAttribute('data-mock') === '1' || qs.get('mock') === '1');
  mockBtn.setAttribute('aria-pressed', startMock ? 'true' : 'false');
  if (qs.get('stream') === '1') stream(true);
  Array.prototype.forEach.call(root.querySelectorAll('[data-office]'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-office') === office ? 'true' : 'false'); });
  root.classList.toggle('em-h', office === 'house');
  root.classList.toggle('em-p', office === 'president');
  root.classList.toggle('em-part', vmode !== 'all');
  Array.prototype.forEach.call(root.querySelectorAll('[data-votes]'), function (b) { b.setAttribute('aria-checked', b.getAttribute('data-votes') === vmode ? 'true' : 'false'); });

  // The forecasters' margins per House seat: the House tab's hover card and side panel before a vote is counted, and the
  // starting point of the test numbers. Optional: without it the House tab still works.
  fetch(ROOT + 'assets/midterms.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
    ((m && m.races) || []).forEach(function (x) { if (x.c === 'H') FC[x.id] = { m: x.m, w: x.w }; });
    HNOW = m && m.house && m.house.now || null;
    if (geo && ElectionData.doc()) paint();
  }).catch(function () {});

  Promise.all([
    fetch(GEO + 'states.json').then(function (r) { return r.json(); }),
    fetch(GEO + 'house-hex.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
  ]).then(function (got) {
    geo = got[0]; drawMap();
    if (got[1] && hexSvg) drawHex(got[1]);
    ElectionData.subscribe(paint);
    return ElectionData.start(startMock);
  }).then(function (d) {
    // a results file from before the House was added, or no tile map: no House tab, rather than an empty one
    if (!(d.offices.house && hex)) {
      var hb = root.querySelector('[data-office="house"]'); if (hb) hb.hidden = true;
      if (office === 'house') setOffice('senate');
    }
    if (vmode !== 'all') setVotes(vmode);
    var h = location.hash.replace('#', '');
    if (h && office === 'house' && d.offices.house && d.offices.house.races[h.toLowerCase()]) deep(h.toLowerCase(), false);
    else if (h && office !== 'house' && geo.states[h.toUpperCase()]) deep(h.toUpperCase(), false);
  }).catch(function (err) {
    var l = $('.em-loading'); if (l) l.textContent = 'The map could not load. Every race is listed on Who is running.';
    if (window.console) console.error('results map', err);
  });
  window.LPResults = ElectionData;      // for the browser test and the console
})();
