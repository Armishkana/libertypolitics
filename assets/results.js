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
  var OFFICES = ['senate', 'governor', 'president'];
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
      var cands = (r.candidates || []).slice().sort(function (a, b) { return (b.votes || 0) - (a.votes || 0); });
      var total = cands.reduce(function (s, c) { return s + (c.votes || 0); }, 0);
      cands.forEach(function (c) { c.pct = total ? 100 * c.votes / total : 0; });
      var lead = total ? cands[0] : null;
      var status = r.called ? 'won' : (lead && r.reporting > 0 ? 'lead' : 'wait');
      var party = r.called || (lead && status === 'lead' ? lead.party : null);
      if (party && party !== 'R' && party !== 'D') party = 'I';
      return { st: st, r: r, cands: cands, total: total, status: status, party: party, called: r.called || null,
        margin: total && cands[1] ? cands[0].pct - cands[1].pct : null, reporting: r.reporting || 0, seats: r.seats || 1 };
    }
    function view(office) {
      var out = {};
      Object.keys(doc.states).forEach(function (st) { out[st] = race(office, st); });
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

  function mockEngine(d) {
    var DUR = 180000, t0 = Date.now(), base = JSON.parse(JSON.stringify(d.offices));
    var night = rng(hash('night' + Math.floor(t0 / 1000)));
    var swing = gauss(night) * 1.5;
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
        if (office === 'president') { o.final = false; o.year = 2028; }
        Object.keys(b.races).forEach(function (st) {
          var src = b.races[st], r = rng(hash(office + st));
          var s = d.states[st] || {}, lean = s.lean == null ? 0 : s.lean;
          var close = 0.05 + 0.35 * (1 - Math.min(1, Math.max(0, (GEOX[st] || 600) / 900)));
          var sp = Math.max(0, Math.min(1, (p - close) / 0.55));
          var rep = sp >= 1 ? 100 : Math.floor(99 * (1 - Math.pow(1 - sp, 2)));
          var margin = lean * 0.85 + swing + gauss(r) * 3;      // R minus D, points
          var mirage = (r() - 0.5) * 16 * (1 - sp);
          var seen = margin + mirage;
          var turnout = Math.round((s.votes2024 || 1500000) * (office === 'president' ? 1 : 0.72) * (0.92 + r() * 0.16));
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
          var nr = { seats: src.seats, special: src.special, reporting: rep, called: called, candidates: out, link: src.link, areas: {}, _m: seen, _sp: sp, _turn: counted };
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
  var NS = 'http://www.w3.org/2000/svg';

  function cls(v) {
    if (!v || v.none) return 's-n';
    if (v.status === 'wait' || !v.party) return 's-u';
    return 's-' + v.party.toLowerCase() + (v.status === 'won' ? 'w' : 'l');
  }
  function word(v) {
    var o = ElectionData.doc().offices[office];
    if (!v || v.none) return 'no ' + o.label + ' race this year';
    if (v.status === 'won') return PNAME[v.called] + ' won';
    if (v.status === 'lead') return PNAME[v.party] + ' ahead, ' + v.reporting + '% counted';
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
    var dl = document.getElementById('em-states');
    dl.innerHTML = Object.keys(geo.states).map(function (st) { return '<option value="' + esc(geo.states[st].name) + '">'; }).join('');
  }

  function paint() {
    var o = ElectionData.doc().offices[office];
    cur = ElectionData.view(office);
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
      b.className = cls(v) + (st === sel ? ' sel' : '');
      b.querySelector('span').textContent = office === 'president' && v && !v.none ? v.seats : '';
      b.setAttribute('aria-label', geo.states[st].name + ': ' + word(v));
    });
    tally(o);
    status();
    if (tip.getAttribute('data-st') && !tip.hidden) tipFill(tip.getAttribute('data-st'));
    if (sel) deep(sel, true);
  }

  function badge(p) { return '<i class="pb pb-' + (p === 'R' || p === 'D' ? p.toLowerCase() : 'i') + '">' + esc(p) + '</i>'; }
  function seatLine(v, o, st) {
    if (office === 'president') return v.seats + ' electoral vote' + (v.seats === 1 ? '' : 's') + (v.r && v.r.split ? ' (split: R ' + v.r.split.R + ', D ' + v.r.split.D + ')' : '');
    return (v.r && v.r.special ? 'Special election' : (office === 'senate' ? '1 Senate seat' : 'Governor'));
  }
  function calledTag(v) { return v.status === 'won' ? '<span class="called">&#10003; Called for ' + esc(PNAME[v.called] || v.called) + '</span>' : ''; }
  function rows(v, n) {
    if (!v.cands.length) return '<p class="dim">The candidates for this race are not on the site yet.</p>';
    return '<ul class="em-cands">' + v.cands.slice(0, n).map(function (c, i) {
      var p = (c.party === 'R' || c.party === 'D') ? c.party.toLowerCase() : 'i';
      return '<li class="' + (i === 0 && v.total ? 'em-lead' : '') + '">' + badge(c.party) + '<span class="nm">' + esc(c.name) + (c.incumbent ? ' <small>incumbent</small>' : '') +
        (v.called && c.party === v.called ? ' <b class="ck" aria-label="winner">&#10003;</b>' : '') + '</span>' +
        '<span class="em-vt num">' + (v.total ? nf.format(c.votes) : '&ndash;') + '</span><span class="pc num">' + (v.total ? c.pct.toFixed(1) + '%' : '') + '</span>' +
        '<span class="pbar"><i class="f-' + p + '" style="width:' + (v.total ? c.pct.toFixed(1) : 0) + '%"></i></span></li>';
    }).join('') + '</ul>';
  }
  function reportingLine(v) {
    if (office === 'president' && !ElectionData.mock()) return 'Certified result';
    return v.total ? v.reporting + '% reporting' : 'No votes counted yet';
  }
  function tipFill(st) {
    var v = cur[st], o = ElectionData.doc().offices[office], s = geo.states[st];
    tip.setAttribute('data-st', st);
    if (!v || v.none) { tip.innerHTML = '<h3>' + esc(s.name) + '</h3><p class="dim">No ' + esc(o.label) + ' race this year.</p>'; return; }
    tip.innerHTML = '<h3>' + esc(s.name) + '<small>' + esc(seatLine(v, o, st)) + '</small></h3>' +
      '<p class="rep">' + calledTag(v) + '<span>' + reportingLine(v) + '</span></p>' +
      (v.total ? '<span class="rbar"><i style="width:' + v.reporting + '%"></i></span>' : '') + rows(v, 2);
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
    Array.prototype.forEach.call(root.querySelectorAll('.hov'), function (n) { n.classList.remove('hov'); });
    if (!st) return;
    var p = gS.querySelector('[data-st="' + st + '"]');
    if (p) { p.classList.add('hov'); gS.appendChild(p); }      // drawn last, so its gold edge is not covered by a neighbour
    var b = small.querySelector('[data-st="' + st + '"]'); if (b) b.classList.add('hov');
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
    var mid = need ? '<span class="tmark" style="left:' + pct(need) + '"><b>' + need + (office === 'senate' ? ' for control' : ' to win') + '</b></span>' : '';
    var extra = sum.I.w + sum.I.l ? '<span class="tind">Independent ' + (sum.I.w + sum.I.l) + '</span>' : '';
    var basebit = office === 'senate' ? '<small>' + base.D + ' not up</small>' : '';
    var basebitR = office === 'senate' ? '<small>' + base.R + ' not up</small>' : '';
    $('.em-tally').innerHTML =
      '<div class="tnum tnum-d"><span class="tw num">' + dW + '</span><span class="tn">' + esc(who.D) + (sum.D.l ? ' <em>+' + sum.D.l + ' ahead</em>' : '') + basebit + '</span></div>' +
      '<div class="tbar" role="img" aria-label="' + esc(who.D + ' ' + dW + ', ' + who.R + ' ' + rW + ' ' + unitTxt + (need ? ', ' + need + ' needed' : '')) + '">' +
      '<i class="b-d" style="width:' + pct(dW) + '"></i><i class="b-dl" style="left:' + pct(dW) + ';width:' + pct(sum.D.l) + '"></i>' +
      '<i class="b-rl" style="right:' + pct(rW) + ';width:' + pct(sum.R.l) + '"></i><i class="b-r" style="width:' + pct(rW) + '"></i>' + mid + '</div>' +
      '<div class="tnum tnum-r"><span class="tw num">' + rW + '</span><span class="tn">' + esc(who.R) + (sum.R.l ? ' <em>+' + sum.R.l + ' ahead</em>' : '') + basebitR + '</span></div>' +
      '<p class="tsub">' + (office === 'governor' ? Object.keys(cur).filter(function (s) { return !cur[s].none; }).length + ' governor races. ' : '') + extra + '</p>';
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
    else if (!anyVotes && !mock) upd.textContent = 'First polls close at 6pm Eastern on November 3';
    else upd.textContent = 'Last updated ' + at;
  }

  var countyCache = {};
  function counties(st) {
    if (countyCache[st]) return Promise.resolve(countyCache[st]);
    return fetch(GEO + 'counties/' + st + '.json').then(function (r) { return r.json(); }).then(function (j) { countyCache[st] = j; return j; });
  }
  function deep(st, quiet) {
    var box = $('.em-deep'), v = cur[st], s = geo.states[st], o = ElectionData.doc().offices[office];
    if (!v) return;
    var link = v.r && v.r.link ? '<a class="em-btn" href="' + ROOT + v.r.link + '">The race page</a>' : '';
    var head = '<header><div><p class="em-kick">' + esc(o.label) + (office === 'president' && !ElectionData.mock() ? ' 2024' : '') + '</p><h2>' + esc(s.name) + '</h2>' +
      (v.none ? '' : '<p class="rep">' + calledTag(v) + '<span>' + esc(seatLine(v, o, st)) + ' &middot; ' + reportingLine(v) + '</span></p>') + '</div>' +
      '<div class="dk-act">' + link + '<button type="button" class="em-btn em-close" aria-label="Close ' + esc(s.name) + '">Close</button></div></header>';
    if (v.none) { box.innerHTML = head + '<p class="dim">No ' + esc(o.label) + ' race in ' + esc(s.name) + ' this year.</p>'; }
    else {
      var keep = quiet && box.getAttribute('data-st') === st && box.querySelector('.cmap svg');
      box.innerHTML = head + '<div class="dk-grid"><div class="dk-cands">' + rows(v, 6) + '</div><div class="dk-co"><h3>By county</h3><div class="cmap"></div><div class="ctab"></div></div></div>';
      fillCounties(st, v, keep);
    }
    box.setAttribute('data-st', st);
    box.hidden = false;
    root.classList.add('em-open');
    if (!quiet) {
      sel = st;
      paint();
      history.replaceState(null, '', location.pathname + location.search + '#' + st.toLowerCase());
      if (!root.classList.contains('em-s')) box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    }
  }
  function fillCounties(st, v, keep) {
    var box = $('.em-deep');
    counties(st).then(function (g) {
      if (box.getAttribute('data-st') !== st) return;
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
  function closeDeep() {
    var box = $('.em-deep'); box.hidden = true; root.classList.remove('em-open'); box.removeAttribute('data-st'); sel = null; paint();
    history.replaceState(null, '', location.pathname + location.search);
  }
  function pick(q) {
    q = String(q || '').trim().toLowerCase(); if (!q) return null;
    var hit = null;
    Object.keys(geo.states).some(function (st) { if (st.toLowerCase() === q || geo.states[st].name.toLowerCase() === q) { hit = st; return true; } });
    if (!hit) Object.keys(geo.states).some(function (st) { if (geo.states[st].name.toLowerCase().indexOf(q) === 0) { hit = st; return true; } });
    return hit;
  }
  function setOffice(o) {
    office = o;
    Array.prototype.forEach.call(root.querySelectorAll('[data-office]'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-office') === o ? 'true' : 'false'); });
    var u = new URL(location.href); u.searchParams.set('office', o); history.replaceState(null, '', u.pathname + u.search + u.hash);
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
  var mapEl = $('.em-map');
  mapEl.addEventListener('pointermove', function (ev) { if (ev.pointerType !== 'mouse') return; hover(stOf(ev.target), ev); });
  mapEl.addEventListener('pointerleave', function () { hover(null); });
  mapEl.addEventListener('click', function (ev) { var st = stOf(ev.target); if (st) { hover(null); deep(st); } });
  mapEl.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { var st = stOf(ev.target); if (st) { ev.preventDefault(); deep(st); } } });
  mapEl.addEventListener('focusin', function (ev) { var st = stOf(ev.target); if (st) { tipFill(st); tip.hidden = false; hl(st); var r = ev.target.getBoundingClientRect(); tipAt(r.right, r.top); } });
  mapEl.addEventListener('focusout', function () { hover(null); });
  $('.em-deep').addEventListener('click', function (ev) { if (ev.target.closest('.em-close')) closeDeep(); });
  root.addEventListener('click', function (ev) { var t = ev.target.closest('[data-office]'); if (t) setOffice(t.getAttribute('data-office')); });
  $('.em-tabs').addEventListener('keydown', function (ev) {
    var i = OFFICES.indexOf(office);
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { i = (i + (ev.key === 'ArrowRight' ? 1 : 2)) % 3; setOffice(OFFICES[i]); root.querySelector('[data-office="' + OFFICES[i] + '"]').focus(); }
  });
  var find = $('.em-find input');
  function go() { var st = pick(find.value); if (st) { deep(st); find.value = ''; find.blur(); } }
  find.addEventListener('change', go);
  find.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); go(); } });
  $('.em-stream').addEventListener('click', function () { stream(!root.classList.contains('em-s')); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (!$('.em-deep').hidden) closeDeep(); else if (root.classList.contains('em-s')) stream(false);
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
  root.querySelector('[data-office="' + office + '"]') && setTimeout(function () {}, 0);
  Array.prototype.forEach.call(root.querySelectorAll('[data-office]'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-office') === office ? 'true' : 'false'); });

  fetch(GEO + 'states.json').then(function (r) { return r.json(); }).then(function (g) {
    geo = g; drawMap();
    ElectionData.subscribe(paint);
    return ElectionData.start(startMock);
  }).then(function () {
    var h = location.hash.replace('#', '').toUpperCase();
    if (h && geo.states[h]) deep(h, false);
  }).catch(function (err) {
    var l = $('.em-loading'); if (l) l.textContent = 'The map could not load. Every race is listed on Every election.';
    if (window.console) console.error('results map', err);
  });
  window.LPResults = ElectionData;      // for the browser test and the console
})();
