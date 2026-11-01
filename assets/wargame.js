/* THE CONFLICT SIMULATOR (libertypolitics.com simulator/<theatre>/; until 1 November 2026 "the Wargame" at wargame/). The page,
   the models and the words: build/wargame.py's docstring. The register this reads: <script id="wg-data">, written by
   wargame.py from data/wargame/<theatre>.json.

   THE PARTS
     engine   the theatre's model (MODELS[id]: levers, outcomes, init, step, end, stats, board, orb), runOne and runMany (the
              Monte Carlo), and the experts' lenses (params()). Plain arithmetic a reader can check: HOW IT WORKS prints it.
     board    THE BOARD (1 November 2026, Armin: "a very high-end strategic video game look ... real video game
              visualizations"): the theatre in WebGL (three.js, served from the site: assets/vendor/), on the baked satellite
              ground with its real relief (wargame.py --terrain), the places as game markers, what flies as arcs with trails,
              interceptions and impacts, a tilted camera that follows the action. No WebGL: the same board drawn flat on the
              satellite poster (Flat below). No scripts: the poster and the text below it.
     hud      the command interface drawn over the board: the top bar (theatre, date, play, speed, camera, full screen), the
              order of battle (the two coalitions' forces, depleting as the days play), the panel (Simulate, Replay,
              Briefing room; a bottom sheet on a phone), the timeline with the intel feed, the minimap, the camera buttons
     replay   a past war, day by day: every event of the register flies on the board with its words and its source
     room     the briefing room: the experts a reader seats, each with a briefing that plays over the board
     run      1,000 runs in the background for the odds, then the after-action report (the outcomes as gauges, each beside
              the betting market that asks the same thing, and the gap), and the most typical run played on the board
   The state of a scenario rides in the address (?s=), so Share sends exactly what was built.
   Never classList.toggle(name, state): tog(el, name, state) (wargame.py stops the build on the first). Never a browser
   dialog. Nothing is hidden and animated back in: the intel feed types its line, and the whole line is there when it stops. */
(function () {
  'use strict';
  var D = document, W = window;
  var box = D.getElementById('wargame') || D.getElementById('scenarios'), src = D.getElementById('wg-data');      // scenarios: the Iran Uncensored page
  if (!box || !src) return;
  var R = JSON.parse(src.textContent);
  var TID = R.id;
  // THE WORDS (31 October 2026, the Iran Uncensored version at iranuncensored.com <lang>/scenarios/iran/). Every sentence the page
  // says goes through tr(), keyed by its English; R.S is the table wargame.py hands over (UI there). Liberty Politics ships no
  // table, so tr() returns the English untouched and nothing it says changes. On Iran Uncensored the English table renames the
  // war words (that page never says war: site-iu/LIVING.md) and the Persian table is the page in Persian, with Persian digits.
  var TR = R.S || {}, FA = R.lang === 'fa', IU = R.site === 'iu', KEY = IU ? 'scn-' : 'war-';
  function tr(s) { return Object.prototype.hasOwnProperty.call(TR, s) ? TR[s] : s; }
  function tf(s, o) { return tr(s).replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] != null ? o[k] : m; }); }
  function tk(pre, k) { return Object.prototype.hasOwnProperty.call(TR, pre + k) ? TR[pre + k] : k; }      // a kind, a lean, a country
  function N(s) { s = String(s == null ? '' : s); return FA ? s.replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(+d); }).replace(/%/g, '٪') : s; }

  // ---------------------------------------------------------------- small tools
  function $(s, r) { return (r || D).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tog(el, c, on) { if (el) { if (on) el.classList.add(c); else el.classList.remove(c); } }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function fmt(n) { n = Math.round(n); if (FA) return n.toLocaleString('fa-IR'); return n >= 10000 ? (Math.round(n / 100) / 10).toLocaleString('en-US') + 'k' : n.toLocaleString('en-US'); }
  function pc(x) { return FA ? N(Math.round(x * 100)) + '٪' : Math.round(x * 100) + '%'; }
  function rng(seed) { var a = seed >>> 0; return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function day(iso) { var d = new Date(iso + 'T12:00:00Z'); if (FA) return isNaN(d) ? N(iso) : d.toLocaleDateString('fa-IR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function initials(n) { return String(n || '').replace(/\(.*?\)/g, '').split(/\s+/).filter(function (w) { return /^[A-Z]/.test(w); }).slice(0, 3).map(function (w) { return w[0]; }).join(''); }
  var REDUCED = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- the theatre
  var G = R.geo, B = G.bbox;
  var K = G.w / ((B[2] - B[0]) * Math.PI / 180);
  function merc(lat) { lat = clamp(lat, -85, 85); return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
  var MN = merc(B[3]);
  function xy(ll) { return [(ll[1] - B[0]) * Math.PI / 180 * K, (MN - merc(ll[0])) * K]; }
  var SIDE = {}; (R.sides || []).forEach(function (s) { SIDE[s.id] = s; });
  var TEAMC = { blue: '#4C8DFF', red: '#FF5A48', grey: '#B9B7A6' };
  function teamOf(o) { return (SIDE[o] || {}).team || 'grey'; }
  function colorOf(o) { return (SIDE[o] || {}).c || TEAMC[teamOf(o)]; }
  var PL = {}, PLACES = (R.places || []).map(function (p) {
    var q = Object.assign({}, p); var c = xy(p.ll);
    q.x = c[0]; q.y = c[1]; q.off = c[0] < 0 || c[0] > G.w || c[1] < 0 || c[1] > G.h;
    if (q.off) { q.ex = clamp(c[0], 14, G.w - 14); q.ey = clamp(c[1], 14, G.h - 14); } else { q.ex = c[0]; q.ey = c[1]; }
    q.team = teamOf(p.o); q.hp = 1; PL[p.id] = q; return q;
  });
  function pt(x) { if (!x) return null; if (typeof x === 'string') { var p = PL[x]; return p ? [p.ex, p.ey] : null; } if (!Array.isArray(x) || !isFinite(x[0]) || !isFinite(x[1])) return null; var c = xy(x); return [clamp(c[0], 4, G.w - 4), clamp(c[1], 4, G.h - 4)]; }
  function pick(r, test) {
    var c = PLACES.filter(test); if (!c.length) return null;
    var tot = c.reduce(function (a, p) { return a + (p.v || 2); }, 0), x = r() * tot;
    for (var i = 0; i < c.length; i++) { x -= (c[i].v || 2); if (x <= 0) return c[i]; }
    return c[c.length - 1];
  }
  function ofTeam(t, kinds) { return function (p) { return p.team === t && (!kinds || kinds.indexOf(p.k) >= 0); }; }
  function ofSide(o, kinds) { return function (p) { return p.o === o && (!kinds || kinds.indexOf(p.k) >= 0); }; }

  // ---------------------------------------------------------------- the parameters and the war room
  var PM = {}; (R.params || []).forEach(function (p) { PM[p.id] = p; });
  var EX = R.experts || [], EXID = {}; EX.forEach(function (x) { EXID[x.id] = x; });
  function avgOf(list) {
    var P = {};
    (R.params || []).forEach(function (p) {
      var v = 0, n = 0;
      list.forEach(function (x) { var y = (x.p || {})[p.id]; if (typeof y === 'number') { v += y; n++; } });
      P[p.id] = n ? v / n : p.base;
    });
    return P;
  }
  function marketParams() {
    // The base estimates, moved where a betting market prices the same thing (a market tagged with a game number).
    var P = avgOf([]);
    (R.markets || []).forEach(function (m) {
      if (!m.param || !PM[m.param] || !m.o || !m.o.length) return;
      var y = m.o[0][1]; if (typeof y !== 'number') return;
      var p = PM[m.param];
      if (p.max <= 1 && p.min >= 0) P[m.param] = clamp(y, p.min, p.max);
    });
    return P;
  }
  var S = { room: [], lens: 'room', mine: null, lv: {}, date: null, speed: 1, tab: 'next' };
  function params() {
    if (S.lens === 'all') return avgOf(EX);
    if (S.lens === 'markets') return marketParams();
    if (S.lens === 'mine') return Object.assign(avgOf(EX), S.mine || {});
    var room = S.room.map(function (id) { return EXID[id]; }).filter(Boolean);
    return avgOf(room.length ? room : EX);
  }

  // ---------------------------------------------------------------- THE MODELS. Each: levers, how, outcomes, init, step, end, stats
  // A model is plain arithmetic a reader can check: HOW IT WORKS prints model.how in these same words.
  var MODELS = {};

  MODELS.iran = {
    unit: 'day', max: 75,
    levers: [
      { id: 'who', n: tr('Who attacks'), o: [['both', tr('US and Israel together')], ['il', tr('Israel alone')], ['us', tr('The US alone')]] },
      { id: 'first', n: tr('Who fires first'), o: [['blue', tr('They strike first')], ['ir', tr('The Islamic Republic strikes first')]] },
      { id: 'aim', n: tr('The main aim'), o: [['nuclear', tr('The nuclear program')], ['military', tr('Missiles and air defense')], ['regime', tr('The regime itself')], ['energy', tr('Oil and power')]] },
      { id: 'heavy', n: tr('B-2s with bunker busters'), o: [['yes', tr('Yes')], ['no', tr('No')]], when: function (lv) { return lv.who !== 'il'; } },
      { id: 'hormuz', n: tr('The Strait of Hormuz'), o: [['auto', tr('Let the model decide')], ['close', tr('The Islamic Republic closes it')], ['open', tr('It stays open')]] }
    ],
    outcomes: [
      { id: 'deal', n: tr('A deal'), c: '#46CC82', w: tr('The fighting stops with limits on the nuclear program.') },
      { id: 'cease', n: tr('A ceasefire, nothing settled'), c: '#E8DC82', w: tr('The guns stop. The program and the regime are still there.') },
      { id: 'fall', n: tr('The regime falls'), c: '#F4C430', w: tr('The Islamic Republic loses its grip on power.') },
      { id: 'long', n: tr('Still fighting'), c: '#FF5A48', w: tr('No end after 75 days.') }
    ],
    how: [
      'Each day the attackers fly strike sorties: Israel its daily number, the US about 150 when it is in. The first three days hit hardest.',
      'Strikes wear down the Islamic Republic’s air defense first; the weaker it is, the more each sortie kills launchers and missiles on the ground, and the more the main aim is hit.',
      'Bunker busters dropped by B-2s are the only thing that does real damage to sites under mountains. Israel alone can only scratch them.',
      'The Islamic Republic fires up to its daily salvo while it has launchers and missiles. Interceptors stop the given share until they run low; then more get through. Defenders fire at the missiles headed for cities and bases, about one interceptor per missile fired overall.',
      'Every day there is a chance of a ceasefire. It grows when oil spikes, when interceptors run out, when the aim is met, and when the world pushes. It shrinks when the aim is the regime itself.',
      'Strikes on the regime, killed leaders and a falling economy wear down its cohesion. Below a floor it falls.',
      'Each war is run 1,000 times with different luck. The war shown on the map is the most typical one.'
    ].map(tr),
    init: function (P, lv, r) {
      var ilIn = lv.who !== 'us', usIn = lv.who !== 'il';
      return { d: 0, P: P, lv: lv, ilIn: ilIn, usIn: usIn, bm: P.ir_bm, lch: P.ir_launchers, dr: P.ir_drones, int: P.interceptors, ad: P.ir_ad,
        nuke: 1, coh: P.cohesion, hz: false, hzDay: 0, oil: 0, kIR: 0, kBlue: 0, kGulf: 0, fired: 0, stopped: 0, leaders: 0, sorties: 0, intOut: 0 };
    },
    step: function (s, r, emit) {
      var P = s.P, lv = s.lv; s.d++;
      var d = s.d;
      // the US may join a war Israel started
      if (!s.usIn && lv.who === 'il' && r() < P.us_join / 7) { s.usIn = true; emit({ t: 'note', w: tr('The United States joins the strikes.'), side: 'US', big: 1 }); }
      // the attackers
      var surge = d <= 3 ? 1.35 : Math.max(0.45, Math.pow(0.97, d - 3));
      var react = (lv.first === 'ir' && d === 1) ? 0.45 : 1;
      var C = ((s.ilIn ? P.il_sorties : 0) + (s.usIn ? 150 : 0)) * surge * react;
      s.sorties += C;
      s.ad = Math.max(0.03, s.ad - C / 2000 * (d <= 3 ? 1.4 : 0.6));
      var open = 1.2 - s.ad;
      var lk = Math.min(s.lch, C / 1000 * s.lch * (lv.aim === 'military' ? 0.14 : 0.07) * open * (0.7 + 0.6 * r()));
      s.lch -= lk; s.bm = Math.max(0, s.bm - lk * 2.5);
      var bust = (s.usIn && lv.heavy !== 'no') ? 0.24 : 0.06;
      // without bunker busters the deepest sites (Fordow, Pickaxe Mountain) outlast the bombing: the program keeps about 45%
      var floor = (s.usIn && lv.heavy !== 'no') ? 0 : 0.45;
      if (lv.aim === 'nuclear' || d <= 4) s.nuke = Math.max(floor, s.nuke - bust * (lv.aim === 'nuclear' ? 1 : 0.5) * open * (0.5 + r()));
      s.coh -= (lv.aim === 'regime' ? 0.009 : 0.004) * (s.usIn ? 1.3 : 1) * (0.6 + 0.8 * r());      // the regime outlived Khamenei's killing in 2026: cohesion falls slowly
      if (lv.aim === 'energy') { s.oil += 3 + 3 * r(); s.coh -= 0.01; }
      if (r() < (lv.aim === 'regime' ? 0.16 : 0.05)) { s.leaders++; s.coh -= 0.025; emit({ t: 'kill', side: s.ilIn ? 'IL' : 'US', to: pick(r, function (p) { return p.team === 'red' && (p.k === 'capital' || p.k === 'hq'); }), w: tr('A senior commander is killed in a strike.') }); }
      s.kIR += C * (0.35 + 0.4 * r());
      // what the strikes hit, for the map
      var from = s.ilIn ? function () { return pick(r, ofTeam('blue', ['airbase'])); } : function () { return pick(r, ofTeam('blue', ['naval', 'airbase'])); };
      var aimK = { nuclear: ['nuclear'], military: ['missile', 'airdef', 'radar'], regime: ['capital', 'hq', 'city'], energy: ['oil', 'power', 'port'] }[lv.aim] || ['missile'];
      var waves = Math.min(5, 1 + Math.round(C / 90));
      for (var i = 0; i < waves; i++) {
        var tg = pick(r, function (p) { return p.team === 'red' && (i === 0 && s.ad > 0.35 ? (p.k === 'airdef' || p.k === 'radar') : aimK.indexOf(p.k) >= 0); }) || pick(r, ofTeam('red'));
        emit({ t: 'strike', side: s.ilIn && (!s.usIn || i % 2 === 0) ? 'IL' : 'US', from: from(), to: tg, n: Math.round(C / waves), res: 'hit' });
      }
      if (s.usIn && lv.heavy !== 'no' && d <= 3 && r() < 0.6) emit({ t: 'strike', side: 'US', from: pick(r, function (p) { return p.o === 'US' && p.off; }) || pick(r, ofSide('US')), to: pick(r, ofTeam('red', ['nuclear'])), n: 7, res: 'hit', w: tr('B-2 bombers drop bunker busters on a buried site.'), big: 1 });
      // the Islamic Republic answers
      var fat = Math.max(0.12, Math.exp(-(d - 1) * 0.11)) * (s.lch / Math.max(1, P.ir_launchers));
      var open1 = (lv.first === 'ir' && d === 1) ? 1 : (d === 1 ? 0.55 : 1);
      var salvo = Math.round(Math.min(P.ir_salvo * fat * open1, s.bm, s.lch * 1.2) * (0.7 + 0.6 * r()));
      if (salvo > 0) {
        var need = salvo * 0.95;      // defenders fire about two at each missile headed for a city or a base, and let the ones falling in open ground land
        var rate = P.intercept * (s.int >= need ? 1 : s.int / need) * (salvo > 200 ? 0.92 : 1);
        if (s.int < need && !s.intOut) { s.intOut = d; emit({ t: 'note', w: tr('Interceptors are running low. More missiles get through.'), big: 1, param: 'interceptors' }); }
        s.int = Math.max(0, s.int - need); s.bm -= salvo; s.fired += salvo;
        var stop = Math.round(salvo * rate); s.stopped += stop;
        var leak = salvo - stop;
        s.kBlue += leak * (0.35 + 0.35 * r());
        var tgt = s.usIn && r() < 0.35 ? ofTeam('blue', ['airbase', 'naval']) : function (p) { return p.team === 'blue' && (p.k === 'city' || p.k === 'capital' || p.k === 'airbase'); };
        var parts = Math.min(4, 1 + Math.floor(salvo / 60));
        for (var j = 0; j < parts; j++) emit({ t: 'missile', side: 'IR', from: pick(r, ofTeam('red', ['missile'])) || pick(r, ofTeam('red')), to: pick(r, tgt), n: Math.round(salvo / parts), stop: Math.round(stop / parts), res: leak > 0 ? 'partial' : 'intercepted' });
      }
      var dr = Math.min(s.dr, Math.round(salvo * 1.2 * r()));
      if (dr > 0) { s.dr -= dr; emit({ t: 'drone', side: 'IR', from: pick(r, ofTeam('red', ['missile', 'airbase'])), to: pick(r, ofTeam('blue', ['city', 'airbase'])), n: dr, stop: Math.round(dr * 0.95), res: 'partial' }); }
      // the Gulf, Hormuz, the proxies
      if (s.usIn && r() < P.gulf_hits * 0.18) { s.oil += 6; s.kGulf += 4 * r(); emit({ t: 'missile', side: 'IR', from: pick(r, ofTeam('red', ['missile'])), to: pick(r, function (p) { return p.team !== 'red' && (p.k === 'oil' || (p.o !== 'IL' && p.k === 'airbase')); }), n: 8, stop: 6, res: 'partial', w: tr('Missiles hit the Persian Gulf: oil and US bases.'), param: 'gulf_hits' }); }
      if (!s.hz && lv.hormuz !== 'open' && (lv.hormuz === 'close' ? d === 2 : r() < P.hormuz * 0.07 * (1.6 - s.coh))) { s.hz = true; s.hzDay = d; s.oil += 25; emit({ t: 'naval', side: 'IR', to: pick(r, function (p) { return p.k === 'choke'; }), w: tr('The Islamic Republic tries to close the Strait of Hormuz.'), big: 1, param: 'hormuz' }); }
      if (s.hz && s.usIn && d - s.hzDay > 6 && r() < 0.12) { s.hz = false; s.oil = Math.max(0, s.oil - 18); emit({ t: 'naval', side: 'US', to: pick(r, function (p) { return p.k === 'choke'; }), w: tr('US warships force the strait open again.'), big: 1 }); }
      if (r() < P.proxies * 0.4) emit({ t: 'missile', side: 'HT', from: pick(r, function (p) { return p.team === 'red' && p.o !== 'IR'; }) || pick(r, ofTeam('red', ['missile'])), to: pick(r, ofTeam('blue', ['city', 'naval', 'port'])), n: 3, stop: 3, res: 'intercepted', param: 'proxies' });
      if (s.hz) s.oil += 1.2;
      s.coh -= s.oil > 40 ? 0.004 : 0;
    },
    end: function (s, r) {
      var P = s.P, lv = s.lv;
      if (s.coh < 0.08 || (s.coh < 0.25 && r() < (0.25 - s.coh) * 0.04)) return 'fall';
      // calibrated on the two real wars: twelve days in June 2025, about forty from 28 February 2026
      var h = 0.004 + P.cease * 0.03 + (s.oil > 40 ? 0.015 : 0) + (s.intOut ? 0.03 : 0) + (s.bm < 60 ? 0.04 : 0) - (lv.aim === 'regime' ? 0.012 : 0);
      if (lv.aim === 'nuclear' && s.nuke < 0.2) h += 0.05;
      if (lv.aim === 'military' && s.lch < P.ir_launchers * 0.2) h += 0.05;
      if (s.d >= 3 && r() < Math.max(0.003, h)) return (s.nuke < 0.35 && s.coh < 0.55 && r() < 0.6) ? 'deal' : 'cease';
      if (s.d >= this.max) return 'long';
      return null;
    },
    stats: function (s, r) {
      return { days: s.d, fired: s.fired, stopped: s.stopped, nuke: 1 - s.nuke, heu: r() < s.P.heu_survives * (s.nuke + 0.4) / 1.4 ? 1 : 0, hz: s.hzDay ? 1 : 0, oil: s.oil, kIR: s.kIR, kBlue: s.kBlue + s.kGulf, leaders: s.leaders, intOut: s.intOut };
    },
    orb: function (s) {
      var P = s.P;
      return { mis: { r: P.ir_bm ? s.bm / P.ir_bm : 1 }, drn: { r: P.ir_drones ? s.dr / P.ir_drones : 1 }, ad: { b: P.interceptors ? s.int / P.interceptors : 1, r: P.ir_ad ? s.ad / P.ir_ad : 1 } };
    },
    board: function (s) {
      return [[tr('Day'), N(s.d)], [tr('Missiles fired'), fmt(s.fired)], [tr('Stopped'), s.fired ? pc(s.stopped / s.fired) : '–'], [tr('Interceptors left'), fmt(s.int)],
        [tr('Launchers left'), fmt(s.lch)], [tr('Nuclear program hit'), pc(1 - s.nuke)], [tr('Oil'), N('+' + Math.round(s.oil) + '%')], [tr('Hormuz'), s.hz ? tr('Closed') : tr('Open')]];
    },
    summary: function (A) {
      return [[tr('How long'), tf('{n} days (typical)', { n: N(Math.round(A.days)) })], [tr('Missiles fired at Israel and the US'), fmt(A.fired)], [tr('Share stopped'), pc(A.fired ? A.stopped / A.fired : 0)],
        [tr('Nuclear program destroyed'), pc(A.nuke)], [tr('Enriched uranium survives'), pc(A.heu)], [tr('Hormuz closed at some point'), pc(A.hz)],
        [tr('Oil price peak'), N('+' + Math.round(A.oil) + '%')], [tr('Interceptors run low'), A.intOutShare ? tf('{p} of wars', { p: pc(A.intOutShare) }) : tr('never')],
        [tr('Deaths in Iran (model)'), fmt(A.kIR)], [tr('Deaths in Israel, the Persian Gulf states and US forces (model)'), fmt(A.kBlue)]];
    }
  };

  MODELS.ukraine = {
    unit: 'week', max: 52,
    levers: [
      { id: 'us', n: 'US weapons and intelligence', o: [['full', 'Full flow'], ['now', 'As today'], ['cut', 'Cut off']] },
      { id: 'eu', n: 'Europe', o: [['surge', 'Steps up'], ['now', 'As today'], ['tired', 'Grows tired']] },
      { id: 'deep', n: 'Ukraine’s long-range strikes', o: [['free', 'Unleashed'], ['now', 'As today'], ['held', 'Held back']] },
      { id: 'ru', n: 'Russia', o: [['push', 'A big offensive'], ['now', 'As today'], ['mob', 'Mobilizes more men']] },
      { id: 'talks', n: 'Talks', o: [['none', 'No real talks'], ['push', 'Hard push for a ceasefire']] },
      { id: 'len', n: 'How far ahead', o: [['26', '6 months'], ['52', '1 year'], ['104', '2 years']] }
    ],
    outcomes: [
      { id: 'cease', n: 'A ceasefire on the line', c: '#E8DC82', w: 'The front freezes where it is.' },
      { id: 'ru', n: 'Russia breaks through', c: '#FF5A48', w: 'Russia takes far more ground than today’s pace.' },
      { id: 'grind', n: 'The grind goes on', c: '#B9B7A6', w: 'Small Russian gains at a huge cost, no end.' },
      { id: 'ua', n: 'Ukraine pushes back', c: '#4C8DFF', w: 'Ukraine takes back ground.' }
    ],
    how: [
      'The game moves one week at a time. Russia takes ground at today’s monthly pace, made faster or slower by how hard it pushes and by the weapons and soldiers Ukraine has.',
      'Ukraine’s strength is its soldiers times its weapons. US and European aid each add to the weapons; cutting them makes every Russian push go further.',
      'Ukraine’s long-range drones hit Russian refineries and bases each week, which wears down Russia’s economy. Russia’s economy wears down by itself too, faster under tighter sanctions.',
      'When Ukraine runs short of soldiers and weapons together, the front can break: gains triple for a while. When Russia’s economy runs out, its push slows and talks get likelier.',
      'Every week there is a chance of a ceasefire, higher when talks are pushed and when either side is worn out.',
      'The ground taken is spread over the sectors of the front by where Russia attacks most, and the line on the map moves west by that much.',
      'Each future is run 1,000 times with different luck. The one shown on the map is the most typical.'
    ],
    init: function (P, lv) {
      var us = { full: 1, now: P.us_aid, cut: 0.05 }[lv.us], eu = { surge: 1, now: P.eu_aid, tired: P.eu_aid * 0.55 }[lv.eu];
      var deep = { free: Math.min(1, P.ua_deep + 0.35), now: P.ua_deep, held: P.ua_deep * 0.4 }[lv.deep];
      var push = P.ru_push * ({ push: 1.35, now: 1, mob: 1.15 }[lv.ru]);
      return { d: 0, P: P, lv: lv, us: us, eu: eu, deep: deep, push: push, men: P.ua_men, econ: P.ru_econ, gain: 0, sec: {}, cas: 0, broke: 0, max: +lv.len || 52, waves: 0, refin: 0 };
    },
    step: function (s, r, emit) {
      var P = s.P, lv = s.lv; s.d++;
      var arms = 0.35 + 0.4 * s.us + 0.35 * s.eu;
      var ua = clamp(s.men * 0.55 + arms * 0.5, 0.1, 1.4);
      var push = s.push * (0.55 + 0.45 * s.econ) * (lv.ru === 'mob' && s.d > 8 ? 1.15 : 1);
      var g = P.ru_gain / 4.33 * push * (1.55 - ua) * (0.6 + 0.8 * r());
      if (!s.broke && r() < Math.max(0, 0.6 - ua) * 0.12 + (s.men < 0.25 ? 0.05 : 0)) { s.brokeEver = 1; s.broke = 6; emit({ t: 'ground', side: 'RU', to: pick(r, function (p) { return p.k === 'city' && p.team === 'blue' && p.v >= 3; }), w: 'The front breaks in one sector. Russian units pour through.', big: 1, param: 'ua_men' }); }
      if (s.broke > 0) { g *= 3; s.broke--; }
      if (s.men > 0.4 && r() < Math.max(0, P.ua_counter * arms - 0.3) * 0.25) { g -= P.ru_gain * (0.8 + 1.5 * r()); emit({ t: 'ground', side: 'UA', w: 'A Ukrainian counterattack takes back villages.', param: 'ua_counter' }); }
      s.gain += g;
      var SEC = { pokrovsk: 0.28, kostiantynivka: 0.2, zaporizhzhia: 0.15, kupiansk: 0.1, lyman: 0.1, siversk: 0.1, kharkiv: 0.04, kherson: 0.03 };
      for (var k in SEC) s.sec[k] = (s.sec[k] || 0) + g * SEC[k] * (0.7 + 0.6 * r());
      s.cas += P.ru_cas * 7 * push * (0.85 + 0.3 * r());
      // the strikes of the week, for the map
      var dr = Math.round(P.ru_drones * 7 * (0.8 + 0.4 * r())), stopR = clamp(P.ua_intercept * (0.75 + 0.3 * s.us + 0.1 * s.eu), 0.3, 0.97);
      for (var w = 0; w < 2; w++) emit({ t: 'drone', side: 'RU', from: pick(r, function (p) { return p.team === 'red' && (p.k === 'airbase' || p.k === 'missile'); }), to: pick(r, function (p) { return p.team === 'blue' && (p.k === 'city' || p.k === 'capital' || p.k === 'power'); }), n: Math.round(dr / 2), stop: Math.round(dr / 2 * stopR), res: 'partial' });
      if (r() < 0.5) emit({ t: 'missile', side: 'RU', from: pick(r, ofTeam('red', ['airbase'])), to: pick(r, function (p) { return p.team === 'blue' && (p.k === 'capital' || p.k === 'power' || p.k === 'city'); }), n: Math.round(20 + 40 * r()), stop: Math.round((20 + 40 * r()) * stopR * 0.6), res: 'partial' });
      if (r() < s.deep * 0.9) { s.refin++; s.econ -= 0.006 * s.deep; emit({ t: 'drone', side: 'UA', from: pick(r, function (p) { return p.team === 'blue' && p.k !== 'capital'; }), to: pick(r, function (p) { return p.team === 'red' && (p.k === 'oil' || p.k === 'airbase' || p.k === 'industry'); }), n: Math.round(40 + 120 * s.deep * r()), stop: 0, res: 'hit', param: 'ua_deep' }); }
      if (g > 0) emit({ t: 'ground', side: 'RU', w: Math.round(g) + ' square km taken this week.', quiet: 1 });
      s.econ = Math.max(0, s.econ - 0.0035 * (0.7 + 0.6 * r()));
      s.men = clamp(s.men - 0.002 - (arms < 0.6 ? 0.004 : 0) + (arms > 0.9 ? 0.001 : 0), 0, 1);      // without weapons, units bleed faster
      if (s.econ < 0.2) s.push *= 0.985;
    },
    end: function (s, r) {
      var P = s.P;
      var h = P.cease * 0.012 + (s.lv.talks === 'push' ? 0.012 : 0) + (s.econ < 0.3 ? 0.012 : 0) + (s.men < 0.3 ? 0.01 : 0);
      if (s.d >= 4 && r() < h) return 'cease';
      if (s.d >= s.max) {
        var pace = P.ru_gain / 4.33 * s.max;
        return (s.brokeEver || s.gain > pace * 1.8) ? 'ru' : s.gain < -pace * 0.2 ? 'ua' : 'grind';
      }
      return null;
    },
    stats: function (s) { return { days: s.d, gain: s.gain, cas: s.cas, econ: s.econ, men: s.men, refin: s.refin, sec: s.sec }; },
    orb: function (s) { return { land: { b: s.P.ua_men ? s.men / s.P.ua_men : 1, r: clamp(1 - s.cas / 715000, 0, 1) } }; },
    board: function (s) {
      return [['Week', s.d], ['Ground taken', fmt(s.gain) + ' km²'], ['Russian losses', fmt(s.cas)], ['Ukraine’s soldiers', pc(s.men)], ['Russia’s economy', pc(s.econ)], ['Refinery strikes', s.refin]];
    },
    summary: function (A) {
      return [['How long it ran', Math.round(A.days) + ' weeks (typical)'], ['Ground Russia takes', fmt(A.gain) + ' km²'], ['Russian killed and wounded (model)', fmt(A.cas)],
        ['Refinery and base strikes', fmt(A.refin)], ['Russia’s economy at the end', pc(A.econ)], ['Ukraine’s soldiers at the end', pc(A.men)]];
    }
  };

  MODELS.taiwan = {
    unit: 'day', max: 90,
    levers: [
      { id: 'plan', n: 'What China does', o: [['quar', 'A quarantine'], ['block', 'A blockade'], ['inv', 'An invasion']] },
      { id: 'us', n: 'The United States', o: [['now', 'Fights at once'], ['late', 'Fights late'], ['out', 'Stays out']] },
      { id: 'jp', n: 'Japan', o: [['fight', 'Fights'], ['bases', 'Lends its bases'], ['out', 'Stays out']] },
      { id: 'ph', n: 'The Philippines', o: [['yes', 'Opens its bases'], ['no', 'Stays out']] },
      { id: 'prep', n: 'Taiwan’s defense', o: [['now', 'As today'], ['porc', 'A porcupine: mines, drones, missiles']] }
    ],
    outcomes: [
      { id: 'hold', n: 'Taiwan holds', c: '#4C8DFF', w: 'The invasion fails, or the blockade breaks.' },
      { id: 'stale', n: 'A stalemate', c: '#E8DC82', w: 'Neither side gets what it came for.' },
      { id: 'cease', n: 'Stopped by a ceasefire', c: '#B9B7A6', w: 'Pressure stops it before it is settled.' },
      { id: 'falls', n: 'Taiwan falls or gives in', c: '#FF5A48', w: 'Beijing gets what it wanted.' }
    ],
    how: [
      'An invasion opens with missile strikes on Taiwan’s air bases, radars and ports, and on US bases if the US is in. Taiwan’s air defense stops a share.',
      'From day 3 landing waves cross the strait. Each wave loses ships to Taiwan’s coastal missiles and, once they join, to US and Japanese anti-ship missiles, which run down as they are used.',
      'Troops that land build a beachhead. If it grows bigger than Taiwan’s defenders, scaled by their will to fight, Taiwan falls. If the landing lift is mostly sunk first, the invasion fails.',
      'A blockade cuts Taiwan’s fuel. When the energy runs out and will is low, Taiwan may give in. Each week US and allied escorts may break it, with a risk of a shooting war.',
      'A quarantine is coast guard boarding, not war. It ends when Beijing stops, when Taiwan accepts it, or when it becomes a blockade.',
      'Every day there is a chance the world forces a stop. Each war is run 1,000 times; the one shown is the most typical.'
    ],
    init: function (P, lv, r) {
      var usIn = lv.us === 'out' ? false : true;
      var luck = { k: 0.6 + 0.8 * r(), rdy: 0.7 + 0.6 * r(), will: 0.65 + 0.7 * r() };      // each war draws its own luck: the fog no model removes
      var usDay = lv.us === 'now' ? Math.max(1, Math.round(P.us_days * 0.5)) : lv.us === 'late' ? Math.round(P.us_days * 2 + 7) : 999;
      var tw = 1 * (lv.prep === 'porc' ? 1.15 : 1);
      return { d: 0, P: P, lv: lv, usIn: false, usDay: usIn ? usDay : 999, tw: tw, twAir: 1, mis: P.pla_missiles, lift: 1, ashore: 0, defend: 120 * clamp(P.tw_will * luck.will, 0.3, 1.2) * tw, luck: luck, asm: lv.us === 'out' ? 0 : P.us_asm,
        sunk: 0, landed: 0, energy: P.energy_days, will: clamp(P.tw_will * luck.will, 0.2, 1), carriers: 0, usLoss: 0, kTW: 0, kPLA: 0, plaShips: 0, esc: 0, broke: 0,
        defend0: 120 * clamp(P.tw_will * luck.will, 0.3, 1.2) * tw };
    },
    step: function (s, r, emit) {
      var P = s.P, lv = s.lv; s.d++;
      var d = s.d, jp = { fight: 1, bases: 0.5, out: 0 }[lv.jp], ph = lv.ph === 'yes' ? 1 : 0;
      if (!s.usIn && d >= s.usDay && r() < Math.max(0.3, P.us_in)) { s.usIn = true; emit({ t: 'note', side: 'US', w: 'US forces join the fight.', big: 1, param: 'us_in' }); }
      if (lv.plan === 'inv') {
        if (d <= 4) {
          var m = Math.round(s.mis * [0, 0.4, 0.25, 0.12, 0.08][d]); s.mis -= m;
          var stopR = P.tw_ad * 0.45 * (lv.prep === 'porc' ? 1.15 : 1);
          s.twAir = Math.max(0.1, s.twAir - m * (1 - stopR) / P.pla_missiles * 1.3);
          s.kTW += m * (1 - stopR) * 0.6;
          for (var i = 0; i < 3; i++) emit({ t: 'missile', side: 'CN', from: pick(r, ofTeam('red', ['missile', 'airbase'])), to: pick(r, function (p) { return p.o === 'TW' && (p.k === 'airbase' || p.k === 'radar' || p.k === 'port' || p.k === 'airdef'); }), n: Math.round(m / 3), stop: Math.round(m / 3 * stopR), res: 'partial' });
          if (s.usIn || lv.us === 'now') emit({ t: 'missile', side: 'CN', from: pick(r, ofTeam('red', ['missile'])), to: pick(r, function (p) { return p.o === 'US' && p.k === 'airbase'; }), n: Math.round(m * 0.15), stop: Math.round(m * 0.05), res: 'partial', w: 'Missiles hit US bases in Japan and Guam.' });
        }
        if (d >= 3 && s.lift > 0.08 && d <= 35) {
          // a wave every day while the fleet lasts; ships sunk shrink the fleet, nothing else does
          var wave = P.pla_lift * (d === 3 ? 1 : 0.7) * s.lift;
          var kill = P.ship_kill * 0.35 * (lv.prep === 'porc' ? 1.25 : 1) * (0.5 + 0.5 * s.twAir) * s.luck.k;
          if (s.usIn) { var shots = Math.min(s.asm, 60 + 40 * jp); s.asm -= shots; kill += shots / 600 * (1 + 0.3 * ph); }
          kill += jp > 0.9 ? 0.06 : 0;
          kill = clamp(kill * (0.75 + 0.5 * r()), 0.02, 0.85);
          var lost = wave * kill; s.lift = Math.max(0, s.lift - kill * 0.25 - 0.01);
          s.sunk += lost; s.kPLA += lost * 1000 * 0.3; s.plaShips += Math.round(kill * 30);
          var land = (wave - lost) * P.pla_ready * s.luck.rdy; s.ashore += land; s.landed += land;
          emit({ t: 'naval', side: 'CN', from: pick(r, ofTeam('red', ['port', 'naval'])), to: pick(r, function (p) { return p.k === 'beach'; }) || pick(r, ofSide('TW', ['city'])), n: Math.round(wave * 10), stop: Math.round(lost * 10), res: 'partial', w: Math.round(wave) + ',000 troops cross. ' + pc(kill) + ' are sunk on the way.', quiet: d > 6 && d % 3 !== 0 });
          if (s.usIn) emit({ t: 'strike', side: 'US', from: pick(r, ofSide('US', ['naval', 'airbase'])), to: pick(r, ofTeam('red', ['naval', 'port'])), n: 24, res: 'hit', param: 'ship_kill' });
        }
        // the fight ashore: defenders grind the beachhead; US and Japanese airpower hit it too once they are in
        var will = clamp(s.will, 0.2, 1);
        var att = s.ashore * (1 + 0.015 * d), def = s.defend * will * (0.6 + 0.4 * s.twAir);
        var trade = Math.min(s.ashore, def * 0.025 * (0.7 + 0.6 * r()) + (s.usIn ? s.ashore * 0.03 : 0)); s.ashore -= trade; s.kPLA += trade * 400;
        s.defend = Math.max(0, s.defend - att * 0.022 * (0.7 + 0.6 * r())); s.kTW += att * 30;
        s.will = clamp(s.will - (att > def ? 0.012 : 0.003) + (s.usIn ? 0.004 : 0), 0, 1);
        if (s.usIn && r() < 0.03 * (s.mis > 0 ? 1 : 0.4)) { s.carriers++; s.usLoss += 3000; emit({ t: 'missile', side: 'CN', from: pick(r, ofTeam('red', ['missile'])), to: pick(r, ofSide('US', ['naval'])), n: 30, stop: 24, res: 'hit', w: 'A US carrier is hit.', big: 1 }); }
        if (s.usIn) s.usLoss += 40 * r();
      } else if (lv.plan === 'block') {
        s.energy -= 1; if (s.energy < 0) s.will = clamp(s.will - 0.022, 0, 1);      // no fuel: power cuts, then rationing, then pressure to talk
        if (d % 7 === 0) {
          emit({ t: 'naval', side: 'CN', from: pick(r, ofTeam('red', ['port', 'naval'])), to: pick(r, function (p) { return p.k === 'port' && p.o === 'TW'; }), n: 12, res: 'hit', w: 'Tankers turned back. Taiwan has ' + Math.max(0, Math.round(s.energy)) + ' days of fuel left.' });
          if (s.usIn && r() < 0.07 * (1 + 0.4 * jp) * (1 + 0.2 * ph)) { s.broke = 1; emit({ t: 'naval', side: 'US', from: pick(r, ofSide('US', ['naval'])), to: pick(r, function (p) { return p.k === 'port' && p.o === 'TW'; }), n: 6, res: 'hit', w: 'An escorted convoy gets through. The blockade breaks.', big: 1 }); }
          if (s.usIn && r() < 0.08) { s.esc++; s.usLoss += 200; s.kPLA += 300; emit({ t: 'strike', side: 'CN', from: pick(r, ofTeam('red', ['airbase'])), to: pick(r, ofSide('US', ['naval'])), n: 12, res: 'partial', w: 'Shots are fired between warships.', big: 1 }); }
        }
      } else {
        if (d % 3 === 0) emit({ t: 'naval', side: 'CN', from: pick(r, ofTeam('red', ['port'])), to: pick(r, function (p) { return p.k === 'port' && p.o === 'TW'; }), n: 4, res: 'hit', w: 'Coast guard ships board and inspect ships bound for Taiwan.', quiet: d % 6 !== 0 });
        s.energy -= 0.15; s.will = clamp(s.will - 0.002, 0, 1);
      }
    },
    end: function (s, r) {
      var P = s.P, lv = s.lv, d = s.d;
      if (d >= 5 && r() < P.cease * 0.006 + (s.carriers > 1 ? 0.008 : 0)) return 'cease';
      if (lv.plan === 'inv') {
        if (s.ashore > s.defend * Math.max(0.25, s.will) && d > 5) return 'falls';
        if (d > 10 && (s.lift < 0.12 || d > 35) && s.ashore < Math.max(5, s.defend * 0.15)) return 'hold';
        if (d >= 60) return 'stale';
      } else if (lv.plan === 'block') {
        if (s.broke) return 'hold';
        if (s.energy < -10 && s.will < 0.45 && r() < 0.1) return 'falls';
        if (d >= this.max) return 'stale';
      } else {
        if (d > 10 && r() < 0.012 + (s.usIn ? 0.008 : 0)) return 'hold';
        if (d > 20 && s.will < 0.5 && r() < 0.01) return 'falls';
        if (d > 30 && r() < 0.006) { s.lv = Object.assign({}, lv, { plan: 'block' }); }
        if (d >= this.max) return 'stale';
      }
      return null;
    },
    stats: function (s) { return { days: s.d, landed: s.landed, sunk: s.sunk, ships: s.plaShips, carriers: s.carriers, usLoss: s.usLoss, kTW: s.kTW, kPLA: s.kPLA, energy: s.energy }; },
    orb: function (s) {
      var P = s.P, d0 = s.defend0 || s.defend || 1;
      return { mis: { r: P.pla_missiles ? s.mis / P.pla_missiles : 1, b: P.us_asm ? (s.asm / P.us_asm) : 1 }, sea: { r: s.lift }, land: { b: s.defend / d0 } };
    },
    board: function (s) {
      if (s.lv.plan === 'inv') return [['Day', s.d], ['Landed', fmt(s.landed) + 'k'], ['Ashore now', fmt(s.ashore) + 'k'], ['Sunk crossing', fmt(s.sunk) + 'k'], ['Defenders', fmt(s.defend) + 'k'], ['Will to fight', pc(s.will)], ['US in', s.usIn ? 'Yes' : 'No'], ['US carriers hit', s.carriers]];
      return [['Day', s.d], ['Fuel left', Math.max(0, Math.round(s.energy)) + ' days'], ['Will to fight', pc(s.will)], ['US in', s.usIn ? 'Yes' : 'No'], ['Clashes', s.esc]];
    },
    summary: function (A, lv) {
      if (lv.plan === 'inv') return [['How long', Math.round(A.days) + ' days (typical)'], ['PLA troops landed', fmt(A.landed) + ',000'], ['PLA troops lost at sea', fmt(A.sunk) + ',000'], ['PLA ships sunk', fmt(A.ships)], ['US carriers hit', A.carriers.toFixed(1)], ['US losses (model)', fmt(A.usLoss)], ['Taiwan losses (model)', fmt(A.kTW)]];
      return [['How long', Math.round(A.days) + ' days (typical)'], ['Taiwan’s fuel at the end', Math.round(A.energy) + ' days'], ['US losses (model)', fmt(A.usLoss)]];
    }
  };

  var MOD = MODELS[TID];
  if (!MOD) return;
  MOD.levers.forEach(function (l) { S.lv[l.id] = l.o[0][0]; });

  // ---------------------------------------------------------------- running wars
  function runOne(P, lv, seed, emit) {
    var r = rng(seed), s = MOD.init(P, Object.assign({}, lv), r), out = null, log = emit ? [] : null;
    var push = emit ? function (ev) {
      ev.d = s.d;
      if (ev.from && ev.from.id) ev.from = ev.from.id;      // models pick place records; the player and the map take ids
      if (ev.to && ev.to.id) ev.to = ev.to.id;
      log.push(ev);
    } : function () {};
    var snaps = emit ? [] : null;
    while (!out) {
      MOD.step(s, r, push);
      if (snaps) snaps.push({ d: s.d, b: MOD.board(s), o: MOD.orb ? MOD.orb(s) : null, sec: s.sec ? Object.assign({}, s.sec) : null, gain: s.gain });
      out = MOD.end(s, r);
      if (s.d > 400) out = MOD.outcomes[MOD.outcomes.length - 1].id;
    }
    return { out: out, st: MOD.stats(s, r), log: log, snaps: snaps, s: s };
  }
  function runMany(P, lv, n, seed0) {
    var cnt = {}, sum = {}, days = [], seeds = [];
    MOD.outcomes.forEach(function (o) { cnt[o.id] = 0; });
    for (var i = 0; i < n; i++) {
      var sd = (seed0 + i * 7919) >>> 0, x = runOne(P, lv, sd, null);
      cnt[x.out]++; days.push(x.st.days); seeds.push({ sd: sd, out: x.out, days: x.st.days });
      for (var k in x.st) if (typeof x.st[k] === 'number') sum[k] = (sum[k] || 0) + x.st[k];
    }
    var A = {}; for (var k2 in sum) A[k2] = sum[k2] / n;
    A.intOutShare = sum.intOut !== undefined ? seeds.length && 0 : 0;
    days.sort(function (a, b) { return a - b; });
    A.days = days[Math.floor(n / 2)];
    var top = MOD.outcomes.slice().sort(function (a, b) { return cnt[b.id] - cnt[a.id]; })[0].id;
    var typical = seeds.filter(function (x) { return x.out === top; }).sort(function (a, b) { return Math.abs(a.days - A.days) - Math.abs(b.days - A.days); })[0];
    return { n: n, cnt: cnt, A: A, top: top, seed: typical ? typical.sd : seed0 };
  }
  function intOutShare(P, lv, n, seed0) {      // how often interceptors ran low (Iran only)
    var k = 0; for (var i = 0; i < n; i++) if (runOne(P, lv, (seed0 + i * 104729) >>> 0, null).st.intOut) k++; return k / n;
  }

  // ---------------------------------------------------------------- the front line (Ukraine): the register's snapshots, moved by the model's gains per sector
  var UA = (G.c || []).filter(function (c) { return /^Ukraine$/.test(c.n); })[0];
  function frontPts(line) { return (line || []).map(function (q) { var c = xy(q); return [c[0], c[1], q[2] || '']; }); }
  function frontPath(pts) {
    if (!pts.length) return '';
    var f = pts, first = f[0], lastp = f[f.length - 1];
    var far = [[lastp[0], G.h + 400], [G.w + 400, G.h + 400], [G.w + 400, -400], [first[0], -400]];
    return 'M' + f.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L') + 'L' + far.map(function (p) { return p.join(','); }).join('L') + 'Z';
  }
  function shifted(pts, sec) {
    if (!sec) return pts;
    var lens = {}, out = [];
    for (var i = 1; i < pts.length; i++) { var k = pts[i][2]; if (k) lens[k] = (lens[k] || 0) + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); }
    var kmPer = (B[2] - B[0]) * 111 * Math.cos(48 * Math.PI / 180) / G.w;      // km in one map unit, near 48N
    for (var j = 0; j < pts.length; j++) {
      var p = pts[j], k2 = p[2], a = pts[Math.max(0, j - 1)], b = pts[Math.min(pts.length - 1, j + 1)];
      var tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1;
      var depthKm = k2 && lens[k2] ? (sec[k2] || 0) / (lens[k2] * kmPer) : 0;
      var dd = depthKm / kmPer;
      out.push([p[0] + (-ty / L) * dd, p[1] + (tx / L) * dd, k2]);
    }
    return out;
  }
  function frontAt(iso) {
    var F = R.fronts || [], best = null;
    F.forEach(function (f) { if (f.d <= iso) best = f; });
    return best || F[0];
  }

  function hexA(h, a) { var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(h || '#ffffff'); return m ? 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + clamp(a, 0, 1).toFixed(3) + ')' : h; }


  // ======================================================================== THE BOARD (1 November 2026)
  var app = $('#wg-app'), stage = $('#wg-stage'), hud = $('#wg-hud'), glc = $('#wg-gl'), tagsEl = $('#wg-tags'), posterEl = $('#wg-poster');
  if (!app || !stage || !hud) return;
  var GLR = R.gl || {};
  var FR = GLR.frame || [-80, -80, G.w + 80, G.h + 80];      // the ground: the theatre plus its margin, in map units
  var FW = FR[2] - FR[0], FH = FR[3] - FR[1];
  var TEAMHEX = { blue: '#3D8BFF', red: '#FF4A3A', grey: '#C9C6B5' };
  var GOLD = '#F4C430', CYAN = '#7FE3FF';
  function teamHex(o) { return TEAMHEX[teamOf(o)] || TEAMHEX.grey; }
  function rgb(h) { var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(h || '#ffffff'); return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1]; }
  function narrow() { return (app.clientWidth || W.innerWidth) < 760; }
  var THN = String(R.meta.short || (R.meta.kick || '').split('·').pop() || '').trim();
  var COAL = { iran: [tr('The US and Israel'), tr('The Islamic Republic and its allies')], ukraine: [tr('Ukraine and its backers'), tr('Russia')], taiwan: [tr('Taiwan, the US and allies'), tr('China')] }[TID] || ['', ''];
  var ORBN = { mis: tr('Missiles'), drn: tr('Drones'), ad: tr('Air defence'), air: tr('Aircraft'), sea: tr('Ships'), land: tr('Troops (thousands)'), art: tr('Rockets and artillery') };
  // the latitude in the middle of the theatre, and how many km one map unit is there (Mercator is the same both ways)
  var LATC = (2 * Math.atan(Math.exp(MN - (G.h / 2) / K)) - Math.PI / 2);
  var KMU = 6378.137 * Math.cos(LATC) / K;

  // ---------------------------------------------------------------- the command interface (drawn over the board)
  S.follow = !REDUCED; S.sheet = 'mid'; S.orbOpen = null; S.view = '';
  var TABS = [['next', tr('Simulate')], ['replay', tr('Replay')], ['room', tr('Briefing room')]];
  function ico(name) {
    var P = {
      play: '<path d="M8 5v14l11-7z" fill="currentColor"/>', pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>',
      full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2"/>',
      cam: '<path d="M3 7h12v10H3zM15 10l6-3v10l-6-3" fill="none" stroke="currentColor" stroke-width="2"/>',
      plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4"/>', minus: '<path d="M5 12h14" stroke="currentColor" stroke-width="2.4"/>',
      rot: '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.2"/>',
      home: '<path d="M4 12l8-7 8 7M7 10v9h10v-9" fill="none" stroke="currentColor" stroke-width="2.2"/>',
      forces: '<path d="M4 18h4V9H4zM10 18h4V5h-4zM16 18h4v-6h-4z" fill="currentColor"/>'
    };
    return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }
  function hudHtml() {
    var sib = (R.sib || []).length > 1 ? '<nav class="wg-ths" aria-label="' + esc(tr('Theatres')) + '">' + R.sib.map(function (s) { return '<a class="wg-th" href="' + esc(s.u) + '"' + (s.id === TID ? ' aria-current="page"' : '') + '>' + esc(s.n) + '</a>'; }).join('') + '</nav>' : '';
    return '<div class="wg-top" id="wg-top"><div class="wg-brand"><span class="wg-logo" aria-hidden="true"></span><span class="wg-bn">' + esc(IU ? tr('Scenarios') : (R.name || 'Conflict Simulator')) + '</span><b class="wg-thn">' + esc(THN) + '</b></div>' + sib +
      '<div class="wg-clock"><b class="wg-cdate num" id="wg-date"></b><span class="wg-dn num" id="wg-dn"></span></div>' +
      '<div class="wg-tx"><button type="button" class="wg-ib wg-play" id="wg-play" aria-label="' + esc(tr('Play')) + '">' + ico('play') + '</button>' +
      '<button type="button" class="wg-ib wg-spd num" id="wg-speed" aria-label="' + esc(tr('Speed')) + '">1×</button>' +
      '<button type="button" class="wg-ib" id="wg-cam" aria-pressed="' + S.follow + '" aria-label="' + esc(tr('Camera follows the action')) + '">' + ico('cam') + '</button>' +
      '<button type="button" class="wg-ib" id="wg-full" aria-label="' + esc(tr('Full screen')) + '">' + ico('full') + '</button></div></div>' +
      '<aside class="wg-orb" id="wg-orb"><button type="button" class="wg-orb-t" id="wg-orbt" aria-expanded="true" aria-controls="wg-orbb">' + ico('forces') + '<span>' + esc(tr('Forces')) + '</span></button><div class="wg-orb-b" id="wg-orbb"></div></aside>' +
      '<div class="wg-nav" id="wg-nav"><button type="button" class="wg-ib" id="wg-zin" aria-label="' + esc(tr('Zoom in')) + '">' + ico('plus') + '</button>' +
      '<button type="button" class="wg-ib" id="wg-zout" aria-label="' + esc(tr('Zoom out')) + '">' + ico('minus') + '</button>' +
      '<button type="button" class="wg-ib" id="wg-rot" aria-label="' + esc(tr('Turn the map')) + '">' + ico('rot') + '</button>' +
      '<button type="button" class="wg-ib" id="wg-fit" aria-label="' + esc(tr('Show the whole theatre')) + '">' + ico('home') + '</button></div>' +
      '<div class="wg-mini" id="wg-mini" role="button" tabindex="0" aria-label="' + esc(tr('Minimap: tap to move the camera there')) + '"><canvas id="wg-minic"></canvas></div>' +
      '<div class="wg-panel" id="wg-panel" data-sheet="mid"><button type="button" class="wg-grab" id="wg-grab" aria-label="' + esc(tr('Make the panel bigger or smaller')) + '"><i></i></button>' +
      '<div class="wg-ph" id="wg-ph"></div><div class="wg-tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" class="wg-tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>' +
      '<div class="wg-body" id="wg-body"></div></div>' +
      '<div class="wg-tl" id="wg-tl"><div class="wg-feed" id="wg-feed" aria-live="polite"></div>' +
      '<div class="wg-scrub" id="wg-scrub" role="slider" tabindex="0" aria-label="' + esc(tr('Timeline: drag to a day')) + '" aria-valuemin="1" aria-valuemax="1" aria-valuenow="1"><div class="wg-ticks" id="wg-ticks"></div><i class="wg-head" id="wg-head"></i></div></div>' +
      '<p class="wg-credit">' + esc(tr('Imagery: NASA. Elevation: AWS Terrain Tiles.')) + '</p>' +
      '<p class="wg-load" id="wg-load">' + esc(tr('Loading the 3D theatre…')) + '</p>';
  }
  hud.innerHTML = hudHtml();
  var doors = $('#wg-doorslot .lpt-doors');
  if (doors) $('#wg-ph').appendChild(doors);
  var panel = $('#wg-panel'), body = $('#wg-body'), feed = $('#wg-feed'), scrub = $('#wg-scrub');
  if (narrow()) { S.orbOpen = false; S.sheet = 'min'; panel.setAttribute('data-sheet', 'min'); }

  // ---------------------------------------------------------------- the order of battle
  var ORB = (R.orb || []).filter(function (o) { return ORBN[o.id]; });
  S.orbNow = {};
  function orbReset() { S.orbNow = {}; ORB.forEach(function (o) { S.orbNow[o.id] = { b: 1, r: 1 }; }); }
  orbReset();
  function orbCount(v, unk) { return v === null ? '?' : fmt(v) + (unk ? '+' : ''); }
  function orbDraw() {
    var b = $('#wg-orbb'); if (!b) return;
    var open = S.orbOpen === null ? !narrow() : S.orbOpen;
    tog($('#wg-orb'), 'open', open); $('#wg-orbt').setAttribute('aria-expanded', open);
    b.innerHTML = '<div class="wg-orb-sides"><span class="wg-ob">' + esc(COAL[0]) + '</span><span class="wg-or">' + esc(COAL[1]) + '</span></div>' + ORB.map(function (o) {
      var f = S.orbNow[o.id] || { b: 1, r: 1 };
      var fb = o.blue ? clamp(f.b == null ? 1 : f.b, 0, 1) : 0, fr = o.red ? clamp(f.r == null ? 1 : f.r, 0, 1) : 0;
      var nb = o.blue == null ? '?' : o.blue ? fmt(o.blue * fb) : '–', nr = o.red == null ? '?' : o.red ? fmt(o.red * fr) : '–';
      return '<div class="wg-orow"><span class="wg-on">' + esc(ORBN[o.id]) + '</span><div class="wg-obar"><span class="wg-onb num">' + nb + '</span><i class="wg-ofb" style="--f:' + (o.blue == null ? 1 : fb).toFixed(3) + '"></i><i class="wg-ofr" style="--f:' + (o.red == null ? 1 : fr).toFixed(3) + '"></i><span class="wg-onr num">' + nr + '</span></div></div>';
    }).join('');
  }

  // ---------------------------------------------------------------- the feed (the intel ticker) and the clock
  var typeT = 0;
  function typeInto(el, text) {
    clearInterval(typeT);
    if (REDUCED || !text) { el.textContent = text || ''; return; }
    var i = 0, n = text.length, step = Math.max(1, Math.ceil(n / 50));
    el.textContent = '';
    typeT = setInterval(function () { i = Math.min(n, i + step); el.textContent = text.slice(0, i); if (i >= n) clearInterval(typeT); }, 22);
    setTimeout(function () { el.textContent = text; }, 1600);      // the whole line is there, whatever the timer did
  }
  function feedSet(head, lines) {
    feed.innerHTML = '<p class="wg-fh"><b class="wg-fk">' + esc(tr('INTEL')) + '</b><span id="wg-fht"></span></p>' + (lines || []).slice(0, 6).map(function (v) {
      return '<p class="wg-fl"><i style="background:' + esc(v.c || GOLD) + '"></i>' + esc(v.w || '') + (v.src ? ' <a href="' + esc(v.src) + '" target="_blank" rel="noopener">' + esc(tr('source')) + ' ↗</a>' : '') + '</p>';
    }).join('');
    typeInto($('#wg-fht'), head || '');
  }
  function clockSet(date, dn) { var a = $('#wg-date'), b = $('#wg-dn'); if (a) a.textContent = date || ''; if (b) b.textContent = dn || ''; }

  // ---------------------------------------------------------------- the player: one timeline of days, a replay or a run
  var TL = null, ti = 0, playing = false, timer = 0;
  function playIcon() { var b = $('#wg-play'); if (b) { b.innerHTML = ico(playing ? 'pause' : 'play'); b.setAttribute('aria-label', playing ? tr('Pause') : tr('Play')); } }
  function play(tl) { stop(); TL = tl; ti = 0; playing = true; V && V.reset(); orbReset(); orbDraw(); ticks(); playIcon(); tick(); }
  function stop() { playing = false; clearTimeout(timer); playIcon(); }
  function pause() { stop(); }
  function resume() {
    if (!TL) { var h = (R.history || [])[(R.history || []).length - 1]; if (h) startReplay(h.id); return; }
    if (ti >= TL.steps.length) { seek(0); }
    playing = true; playIcon(); tick();
  }
  function stepAt(i, live) {
    var st = TL.steps[i]; if (!st) return;
    if (live && V) {
      var lag = 0;
      (st.ev || []).forEach(function (ev, k) { var ms = V.shot(ev, k * 280); lag = Math.max(lag, ms + k * 280); });
      if (S.follow && !userBusy()) { var pts = []; (st.ev || []).forEach(function (ev) { var a = pt(ev.from), b = pt(ev.to); if (a) pts.push(a); if (b) pts.push(b); }); if (pts.length) V.focus(pts, {}); }
    } else if (V) {
      (st.ev || []).forEach(function (ev) { if (typeof ev.to === 'string') V.hit(ev.to, ev.res, true); });
    }
    if (st.front && V) V.front(st.front, st.lobes);
    if (st.orb) { S.orbNow = st.orb; orbDraw(); }
    clockSet(st.when, st.dn);
    if (live || i === ti - 1) feedSet(st.head, st.lines);
    var hd = $('#wg-head'); if (hd) hd.style.left = (TL.steps.length > 1 ? 100 * i / (TL.steps.length - 1) : 0) + '%';
    if (scrub) { scrub.setAttribute('aria-valuemax', TL.steps.length); scrub.setAttribute('aria-valuenow', i + 1); scrub.setAttribute('aria-valuetext', st.when || ''); }
    if (TL.onStep) TL.onStep(i);
  }
  function tick() {
    if (!TL || !playing) return;
    if (ti >= TL.steps.length) { stop(); if (TL.done) TL.done(); return; }
    stepAt(ti, true); ti++;
    var st = TL.steps[ti - 1];
    var ms = (st.ms || TL.ms || 2000) / S.speed;
    timer = setTimeout(tick, REDUCED ? ms * 0.8 : ms);
  }
  function seek(i) {
    if (!TL) return;
    var was = playing; stop();
    i = clamp(i, 0, TL.steps.length - 1);
    if (V) V.reset(); orbReset();
    for (var k = 0; k < i; k++) stepAt(k, false);
    ti = i;
    if (was) { playing = true; playIcon(); tick(); }
    else { stepAt(i, false); feedSet(TL.steps[i].head, TL.steps[i].lines); ti = i + 1; }
  }
  function ticks() {
    var t = $('#wg-ticks'); if (!t) return;
    if (!TL) { t.innerHTML = ''; return; }
    var n = TL.steps.length;
    t.innerHTML = TL.steps.map(function (st, i) {
      var c = (st.ev || []).length, big = (st.ev || []).some(function (v) { return v.big; });
      var col = (st.ev || [])[0] ? teamHex((st.ev[0] || {}).side) : 'rgba(243,241,234,.4)';
      return '<i style="left:' + (n > 1 ? 100 * i / (n - 1) : 0) + '%;height:' + Math.min(100, 30 + c * 14) + '%;background:' + col + (big ? ';box-shadow:0 0 6px ' + col : '') + '"></i>';
    }).join('');
  }
  (function scrubbing() {
    var down = false;
    function at(ev) { var r = scrub.getBoundingClientRect(); return Math.round(clamp((ev.clientX - r.left) / Math.max(1, r.width), 0, 1) * ((TL ? TL.steps.length : 1) - 1)); }
    scrub.addEventListener('pointerdown', function (ev) { if (!TL) return; down = true; try { scrub.setPointerCapture(ev.pointerId); } catch (x) {} seek(at(ev)); });
    scrub.addEventListener('pointermove', function (ev) { if (down && TL) { var i = at(ev); if (i !== ti - 1) seek(i); } });
    scrub.addEventListener('pointerup', function () { down = false; });
    scrub.addEventListener('keydown', function (ev) {
      if (!TL) return;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { ev.preventDefault(); seek(ti); }
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { ev.preventDefault(); seek(ti - 2); }
      else if (ev.key === 'Home') { ev.preventDefault(); seek(0); } else if (ev.key === 'End') { ev.preventDefault(); seek(TL.steps.length - 1); }
    });
  })();

  // ---------------------------------------------------------------- REPLAY: a past war from the register
  function nOf(v) { return typeof v === 'number' ? v : 0; }
  function replayTL(h) {
    var start = h.start || (h.days[0] || {}).d, used = {};
    ORB.forEach(function (o) { used[o.id] = { b: 0, r: 0 }; });
    function spend(id, team, n) { if (!used[id] || !n) return; used[id][team === 'blue' ? 'b' : 'r'] += n; }
    var steps = h.days.map(function (dd) {
      (dd.ev || []).forEach(function (v) {
        var tm = teamOf(v.side), other = tm === 'blue' ? 'red' : 'blue', n = nOf(v.n);
        if (v.t === 'missile' || (v.t === 'strike' && tm === 'red')) spend('mis', tm, n);
        if (v.t === 'drone') spend('drn', tm, n);
        var stopped = v.res === 'intercepted' ? n : v.res === 'partial' ? Math.round(n * 0.8) : 0;
        if (v.t === 'missile' || v.t === 'drone' || v.t === 'intercept' || (v.t === 'strike' && tm === 'red')) spend('ad', other, stopped);
      });
      var orb = {};
      ORB.forEach(function (o) { orb[o.id] = { b: o.blue ? 1 - used[o.id].b / o.blue : 1, r: o.red ? 1 - used[o.id].r / o.red : 1 }; });
      var evs = (dd.ev || []).filter(function (v) { return v.t !== 'note' || v.to; }).map(function (v) {
        return { t: v.t === 'intercept' ? 'missile' : v.t === 'kill' ? 'strike' : v.t === 'move' ? 'ground' : v.t, side: v.side, from: v.from, to: v.to, n: v.n,
          stop: v.res === 'intercepted' ? (v.n || 1) : v.res === 'partial' ? Math.round((v.n || 1) * 0.8) : 0, res: v.res, big: v.t === 'kill' || (v.n || 0) >= 100 };
      });
      var f = TID === 'ukraine' ? frontAt(dd.d) : null;
      var dn = Math.round((new Date(dd.d + 'T12:00:00Z') - new Date(start + 'T12:00:00Z')) / 864e5);
      return { when: day(dd.d), dn: tf('D+{n}', { n: N(dn) }), head: dd.title || h.name, ev: evs, orb: orb,
        lines: (dd.ev || []).map(function (v) { return { w: v.w, c: teamHex(v.side), src: (v.src || [])[0] }; }),
        front: f ? frontPts(f.line) : null, lobes: f ? f.lobes : null, ms: 3000 };
    });
    return { kind: 'replay', h: h, steps: steps, onStep: function (i) { tallyDraw(h, (i + 1) / steps.length); },
      done: function () { var r = $('#wg-res'); if (r) r.innerHTML = '<b>' + esc(tr('How it ended.')) + '</b> ' + esc(h.result || ''); tallyDraw(h, 1); } };
  }
  function tallyDraw(h, f) {
    var t = $('#wg-tally'); if (!t) return;
    t.innerHTML = (h.tally || []).map(function (x) {
      var v = String(x.v), m = /\d[\d,]*(?:\.\d+)?/.exec(v), shown = v;
      if (m && f < 1) { var num = parseFloat(m[0].replace(/,/g, '')); shown = v.slice(0, m.index) + fmt(num * f) + v.slice(m.index + m[0].length); }
      return '<div><dt>' + esc(x.k) + '</dt><dd class="num">' + esc(N(shown)) + '</dd></div>';
    }).join('');
  }
  function startReplay(id) {
    var h = (R.history || []).filter(function (x) { return x.id === id; })[0]; if (!h) return;
    S.tab = 'replay'; S.playing = id; drawPanel();
    play(replayTL(h));
    if (narrow() && S.sheet === 'max') sheetTo('mid');
  }

  // ---------------------------------------------------------------- the panel
  function drawPanel() {
    $$('.wg-tab', panel).forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === S.tab); });
    tog(panel, 'aar', S.tab === 'next' && !!LAST && S.view === 'aar');
    drawTab();
  }
  function pmFmt(p, v) { return p.max <= 1 && p.min >= 0 ? pc(v) : fmt(v) + (p.unit && !/count/.test(p.unit) ? ' ' + p.unit.replace(/^0-1$/, '') : ''); }
  function seat(id) {
    var i = S.room.indexOf(id);
    if (i >= 0) S.room.splice(i, 1); else if (S.room.length < 10) S.room.push(id);
    S.lens = 'room'; stale(); drawTab();
    var b = $('#wg-bf-seat'); if (b) { var on = S.room.indexOf(id) >= 0; b.textContent = on ? tr('Leave my briefing room') : tr('Seat in my briefing room'); tog(b, 'on', on); }
  }
  var LAST = null;
  function stale() { LAST = null; S.view = ''; writeUrl(); var r = $('#wg-result'); if (r) tog(r, 'old', true); tog(panel, 'aar', false); }
  function face(x, cls) {
    return '<span class="wg-face ' + (cls || '') + (x.kind === 'org' ? ' org' : '') + '">' + (x.face ? '<img src="' + esc(x.face) + '" alt="" loading="lazy" decoding="async" width="240" height="300">' : '<b>' + esc(initials(x.nEn || x.n)) + '</b>') + '</span>';
  }
  function leanTag(l) { return l ? '<span class="wg-lean l-' + esc(l) + '">' + esc(tk('lean:', l)) + '</span>' : ''; }
  function roomPresets() {
    var by = function (L) { return EX.filter(function (x) { return L.indexOf(x.lean) >= 0; }).map(function (x) { return x.id; }); };
    var out = [[tr('Hawks'), by(['hawk', 'optimist'])], [tr('Doves and skeptics'), by(['dove', 'skeptic', 'pessimist'])], [tr('Think tanks only'), EX.filter(function (x) { return x.kind === 'org'; }).map(function (x) { return x.id; })], [tr('Generals and analysts'), EX.filter(function (x) { return x.kind === 'person'; }).map(function (x) { return x.id; })]];
    return out.filter(function (o) { return o[1].length >= 2; });
  }
  function lensHtml() {
    var seated = S.room.map(function (i) { return EXID[i]; }).filter(Boolean);
    var lens = [['room', tr('My briefing room') + (seated.length ? ' (' + N(seated.length) + ')' : '')], ['all', tf('All {n} experts', { n: N(EX.length) })], ['markets', tr('Betting markets')], ['mine', tr('My own numbers')]];
    return '<div class="wg-lens" role="radiogroup" aria-label="' + esc(tr('Whose numbers run the simulation')) + '">' + lens.map(function (l) { return '<button type="button" role="radio" class="wg-lb" data-lens="' + l[0] + '" aria-checked="' + (S.lens === l[0]) + '">' + esc(l[1]) + '</button>'; }).join('') + '</div>';
  }
  function slidersHtml() {
    var P = S.mine || avgOf(EX);
    return '<p class="wg-hint">' + esc(tr('Your own numbers. Each starts at the experts’ average.')) + '</p><button type="button" class="wg-chip" id="wg-reset">' + esc(tr('Back to the average')) + '</button><div class="wg-pms">' +
      (R.params || []).map(function (p) {
        var step = p.max <= 1 ? 0.01 : Math.max(1, Math.round((p.max - p.min) / 100));
        return '<label class="wg-pm"><span>' + esc(p.n) + ' <output id="wg-pmv-' + p.id + '" class="num">' + pmFmt(p, P[p.id]) + '</output></span><input type="range" class="wg-pmr" data-pm="' + p.id + '" min="' + p.min + '" max="' + p.max + '" step="' + step + '" value="' + P[p.id] + '"><small>' + esc(p.help || '') + '</small></label>';
      }).join('') + '</div>';
  }
  function lensBody(compact) {
    var seated = S.room.map(function (i) { return EXID[i]; }).filter(Boolean);
    if (S.lens === 'room') {
      var h = '<p class="wg-hint">' + esc(seated.length ? tr('The simulation runs on the average of their numbers. Tap a face for their briefing.') : tr('Seat 2 to 10 experts. Until you do, everyone sits in.')) + '</p>';
      if (compact) return h + '<div class="wg-seated">' + (seated.length ? seated : EX).slice(0, 10).map(function (x) { return '<button type="button" class="wg-ex wg-exs" data-brief="' + esc(x.id) + '" aria-label="' + esc(tf('Briefing from {n}', { n: x.n })) + '">' + face(x, 'tiny') + '</button>'; }).join('') + '</div>';
      return h;
    }
    if (S.lens === 'mine') return slidersHtml();
    if (S.lens === 'markets') return '<p class="wg-hint">' + esc(tr('The experts’ average, moved wherever a betting market prices the same thing.')) + ' ' + ((R.markets || []).length ? '' : esc(tr('No market is priced today.'))) + '</p>' + marketsHtml();
    return '<p class="wg-hint">' + esc(tr('Every expert in the room, averaged equally.')) + '</p>';
  }
  function roomHtml() {
    var h = lensHtml() + '<div class="wg-presets">' + roomPresets().map(function (p) { return '<button type="button" class="wg-chip" data-room="' + p[1].join(',') + '">' + esc(p[0]) + '</button>'; }).join('') + '</div>' + lensBody(false);
    if (S.lens === 'room' || S.lens === 'all') {
      h += '<ul class="wg-room">' + EX.map(function (x) {
        var on = S.room.indexOf(x.id) >= 0;
        return '<li class="' + (on ? 'on' : '') + '"><button type="button" class="wg-ex" data-brief="' + esc(x.id) + '" aria-label="' + esc(tf('Briefing from {n}', { n: x.n })) + '">' + face(x) + '<span class="wg-exn"><b>' + esc(x.n) + '</b><span>' + esc(x.who || '') + '</span>' + leanTag(x.lean) + '</span></button>' +
          '<button type="button" class="wg-seat' + (on ? ' on' : '') + '" data-seat="' + esc(x.id) + '" aria-pressed="' + on + '">' + esc(on ? tr('Seated') : tr('Seat')) + '</button></li>';
      }).join('') + '</ul>';
    }
    return h;
  }
  function marketsHtml() {
    var M = R.markets || []; if (!M.length) return '';
    return '<ul class="wg-mk">' + M.map(function (m) {
      var o = m.o[0];
      return '<li><b class="num">' + pc(o[1]) + '</b><span>' + esc(m.q) + (m.o.length > 1 ? ' <small>' + esc(o[0]) + '</small>' : '') + ' <a href="' + esc(m.u) + '" target="_blank" rel="' + esc(m.rel || 'noopener') + '">' + esc(m.w || tr('market')) + ' ↗</a></span></li>';
    }).join('') + '</ul>';
  }
  function datesHtml() {
    var Ds = (R.dates || []).filter(function (d) { return d.d >= R.today; });
    if (!Ds.length) return '';
    if (!S.date) S.date = Ds[0].d;
    return '<div class="wg-step"><h3><i>' + N(2) + '</i>' + esc(tr('When it starts')) + '</h3><div class="wg-dates">' + Ds.map(function (d) { return '<button type="button" class="wg-date" data-date="' + d.d + '" aria-pressed="' + (S.date === d.d) + '"><b class="num">' + esc(day(d.d)) + '</b><span>' + esc(d.why) + '</span></button>'; }).join('') + '</div></div>';
  }
  function leversHtml() {
    return MOD.levers.filter(function (l) { return !l.when || l.when(S.lv); }).map(function (l) {
      return '<div class="wg-lv"><span>' + esc(l.n) + '</span><div class="wg-seg" role="radiogroup" aria-label="' + esc(l.n) + '">' + l.o.map(function (o) { return '<button type="button" role="radio" data-lv="' + l.id + '" data-o="' + o[0] + '" aria-checked="' + (S.lv[l.id] === o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>';
    }).join('');
  }
  function drawTab() {
    if (!body) return;
    var top = '';
    if (S.tab === 'replay') {
      var cur = (R.history || []).filter(function (x) { return x.id === S.playing; })[0];
      body.innerHTML = (cur ? '<div class="wg-now"><p class="wg-k">' + esc(tr('Now replaying')) + '</p><h3>' + esc(cur.name) + '</h3><p class="wg-ops">' + esc((cur.ops || []).join('  ·  ')) + '</p><dl class="wg-sum" id="wg-tally"></dl><p class="wg-res" id="wg-res"></p></div>' : '') +
        '<p class="wg-hint">' + esc(tr('Every strike of a past war, on the day it happened, from the reporting. Pick one and watch.')) + '</p><ul class="wg-hist">' + (R.history || []).slice().reverse().map(function (h) {
          return '<li><button type="button" class="wg-hb' + (h.id === S.playing ? ' on' : '') + '" data-replay="' + esc(h.id) + '"><b>' + esc(h.name) + '</b><span class="num">' + esc(day(h.start)) + esc(tr(' to ')) + esc(day(h.end)) + '  ·  ' + esc(tf('{n} days on the board', { n: N((h.days || []).length) })) + '</span><span class="wg-ops">' + esc((h.ops || []).join('  ·  ')) + '</span></button></li>';
        }).join('') + '</ul>';
      if (cur && TL && TL.h === cur) tallyDraw(cur, TL.steps.length ? ti / TL.steps.length : 0);
      return;
    }
    if (S.tab === 'room') { body.innerHTML = '<div class="wg-step"><h3><i>' + N(1) + '</i>' + esc(tr('Your briefing room')) + '</h3>' + roomHtml() + '</div>'; return; }
    if (S.view === 'aar' && LAST) { body.innerHTML = aarHtml(LAST); bindCalls(); return; }
    body.innerHTML = top + '<div class="wg-step"><h3><i>' + N(1) + '</i>' + esc(tr('Whose numbers')) + '</h3>' + lensHtml() + lensBody(true) + '</div>' + datesHtml() +
      '<div class="wg-step"><h3><i>' + N((R.dates || []).some(function (d) { return d.d >= R.today; }) ? 3 : 2) + '</i>' + esc(tr('Your moves')) + '</h3>' + leversHtml() + '</div>' +
      '<button type="button" class="wg-run" id="wg-run">' + esc(tr('Run 1,000 simulations')) + '</button>' +
      (LAST ? '<button type="button" class="wg-chip wg-open" id="wg-report">' + esc(tr('Open the last report')) + '</button>' : '') +
      '<p class="wg-fine">' + esc(tr('A model to think with, not a forecast.')) + '</p>';
  }
  panel.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-tab]'); if (t) { S.tab = t.getAttribute('data-tab'); if (S.tab !== 'next') S.view = ''; drawPanel(); if (narrow()) sheetTo(S.tab === 'room' ? 'max' : S.sheet === 'min' ? 'mid' : S.sheet); return; }
    var lv = ev.target.closest('[data-lv]'); if (lv) { S.lv[lv.getAttribute('data-lv')] = lv.getAttribute('data-o'); stale(); drawTab(); return; }
    var ln = ev.target.closest('[data-lens]'); if (ln) { S.lens = ln.getAttribute('data-lens'); if (S.lens === 'mine' && !S.mine) S.mine = avgOf(S.room.length ? S.room.map(function (i) { return EXID[i]; }) : EX); stale(); drawTab(); return; }
    var x = ev.target.closest('[data-seat]'); if (x) { seat(x.getAttribute('data-seat')); return; }
    var br = ev.target.closest('[data-brief]'); if (br) { brief(EXID[br.getAttribute('data-brief')]); return; }
    var dt = ev.target.closest('[data-date]'); if (dt) { S.date = dt.getAttribute('data-date'); stale(); drawTab(); return; }
    var rp = ev.target.closest('[data-replay]'); if (rp) { startReplay(rp.getAttribute('data-replay')); return; }
    if (ev.target.closest('#wg-run')) { run(); return; }
    if (ev.target.closest('#wg-report')) { S.view = 'aar'; drawPanel(); return; }
    if (ev.target.closest('#wg-back')) { S.view = ''; drawPanel(); return; }
    if (ev.target.closest('#wg-again')) { S.view = ''; drawPanel(); run(); return; }
    if (ev.target.closest('#wg-watch')) { if (LAST && LAST.tl) { play(LAST.tl); if (narrow()) sheetTo('min'); } return; }
    if (ev.target.closest('#wg-share')) { share(); return; }
    if (ev.target.closest('#wg-reset')) { S.mine = avgOf(EX); drawTab(); stale(); return; }
    var pre = ev.target.closest('[data-room]'); if (pre) { S.room = pre.getAttribute('data-room').split(',').filter(function (i) { return EXID[i]; }); S.lens = 'room'; stale(); drawTab(); }
  });
  panel.addEventListener('input', function (ev) {
    var s = ev.target.closest('[data-pm]'); if (!s) return;
    S.mine = S.mine || avgOf(EX); S.mine[s.getAttribute('data-pm')] = +s.value;
    var o = $('#wg-pmv-' + s.getAttribute('data-pm')); if (o) o.textContent = pmFmt(PM[s.getAttribute('data-pm')], +s.value);
    stale();
  });
  // the bottom sheet (a phone): three heights, a tap on the handle steps through them, a drag sets them
  function sheetTo(k) { S.sheet = k; panel.setAttribute('data-sheet', k); layout(); }
  (function sheetDrag() {
    var g = $('#wg-grab'), y0 = 0, h0 = 0, moved = 0, id = null;
    g.addEventListener('pointerdown', function (ev) { id = ev.pointerId; y0 = ev.clientY; h0 = panel.getBoundingClientRect().height; moved = 0; try { g.setPointerCapture(id); } catch (x) {} });
    g.addEventListener('pointermove', function (ev) { if (id !== ev.pointerId) return; var dy = ev.clientY - y0; moved = Math.max(moved, Math.abs(dy)); if (moved > 6) { panel.style.height = clamp(h0 - dy, 64, app.clientHeight - 60) + 'px'; } });
    g.addEventListener('pointerup', function (ev) {
      if (id !== ev.pointerId) return; id = null;
      var hh = app.clientHeight, ph = panel.getBoundingClientRect().height; panel.style.height = '';
      if (moved <= 6) sheetTo(S.sheet === 'min' ? 'mid' : S.sheet === 'mid' ? 'max' : 'min');
      else sheetTo(ph < hh * 0.25 ? 'min' : ph < hh * 0.62 ? 'mid' : 'max');
    });
  })();

  // ---------------------------------------------------------------- the briefing: the expert, over the board
  var bfEl = null, bfX = null, bfT = 0;
  function briefPlaces(x) {
    var text = [x.view || ''].concat(x.brief || []).join(' ').toLowerCase(), hit = [];
    PLACES.forEach(function (p) {
      var n = String(p.n || '').toLowerCase().replace(/\(.*?\)/g, '').split(/[ ,]+/).filter(function (w) { return w.length > 4; })[0];
      if (n && text.indexOf(n) >= 0 && hit.indexOf(p) < 0) hit.push(p);
    });
    if (!hit.length) {
      var KIND = { hormuz: ['choke'], heu_survives: ['nuclear'], ir_bm: ['missile'], ir_launchers: ['missile'], interceptors: ['airbase'], gulf_hits: ['oil'], proxies: ['missile'], cohesion: ['capital'],
        ru_gain: ['city'], ua_deep: ['oil'], ru_drones: ['airbase'], pla_lift: ['beach', 'port'], ship_kill: ['naval'], us_in: ['airbase'], tw_ad: ['airbase', 'radar'], energy_days: ['port'] };
      Object.keys(x.p || {}).forEach(function (k) { (KIND[k] || []).forEach(function (kind) { PLACES.forEach(function (p) { if (p.k === kind && !p.off && hit.length < 6 && hit.indexOf(p) < 0) hit.push(p); }); }); });
    }
    return hit.slice(0, 6);
  }
  function brief(x) {
    if (!x) return;
    closeBrief(true);
    bfX = x;
    var on = S.room.indexOf(x.id) >= 0;
    var own = runMany(Object.assign(avgOf(EX), x.p || {}), S.lv, 300, 4242);
    var top = MOD.outcomes.filter(function (o) { return o.id === own.top; })[0];
    var nums = Object.keys(x.p || {}).map(function (k) { var p = PM[k]; if (!p) return ''; return '<li><b class="num">' + pmFmt(p, x.p[k]) + '</b><span>' + esc(p.n) + (x.pWhy && x.pWhy[k] ? '<small>' + esc(x.pWhy[k]) + '</small>' : '') + '</span></li>'; }).join('');
    var i = EX.indexOf(x);
    bfEl = D.createElement('div');
    bfEl.className = 'wg-bf'; bfEl.id = 'wg-bf'; bfEl.setAttribute('role', 'dialog'); bfEl.setAttribute('aria-modal', 'false'); bfEl.setAttribute('aria-labelledby', 'wg-bf-n');
    bfEl.innerHTML = '<div class="wg-bf-in"><div class="wg-bf-top"><p class="wg-k">' + esc(tr('Briefing')) + '  ·  ' + N(i + 1) + '/' + N(EX.length) + '</p><button type="button" class="wg-ib" id="wg-bf-x" aria-label="' + esc(tr('Close')) + '">×</button></div>' +
      '<div class="wg-bf-who"><div class="wg-bf-pic">' + face(x, 'big') + '<i></i></div><div><h3 id="wg-bf-n">' + esc(x.n) + '</h3><p class="wg-bf-r">' + esc(x.who || '') + '</p>' + leanTag(x.lean) + '</div></div>' +
      '<blockquote class="wg-bf-q" id="wg-bf-q"></blockquote>' +
      '<ol class="wg-bf-l">' + (x.brief || []).map(function (l, k) { return '<li data-k="' + k + '">' + esc(l) + '</li>'; }).join('') + '</ol>' +
      '<p class="wg-bf-own">' + esc(tr('With your moves, a run on their numbers alone most often ends:')) + ' <b style="color:' + (top ? top.c : '') + '">' + esc(top ? top.n : '') + '</b> <span class="num">(' + pc(own.cnt[own.top] / own.n) + ')</span></p>' +
      (nums ? '<h4>' + esc(tr('Their numbers in this simulation')) + '</h4><ul class="wg-bf-nums">' + nums + '</ul>' : '') +
      '<h4>' + esc(tr('What they published')) + '</h4><ul class="wg-bf-src">' + (x.said || []).map(function (s) { return '<li>' + esc(s.w) + ' <a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(day(s.date || '')) + ' ↗</a></li>'; }).join('') + '</ul>' +
      '<p class="wg-fine">' + esc(tr('These lines are my summary of their published work, not their words. The numbers are my reading of it.')) + '</p>' +
      '<div class="wg-bf-b"><button type="button" class="wg-ib" id="wg-bf-p" aria-label="' + esc(tr('Previous expert')) + '">‹</button><button type="button" class="wg-run' + (on ? ' on' : '') + '" id="wg-bf-seat">' + esc(on ? tr('Leave my briefing room') : tr('Seat in my briefing room')) + '</button><button type="button" class="wg-ib" id="wg-bf-nx" aria-label="' + esc(tr('Next expert')) + '">›</button></div></div>';
    app.appendChild(bfEl);
    typeInto($('#wg-bf-q'), x.view || '');
    var places = briefPlaces(x), lines = $$('.wg-bf-l li', bfEl), k = -1;
    function beat() {
      k++;
      lines.forEach(function (li, j) { tog(li, 'on', j === k); });
      var p = places.length ? places[k % places.length] : null;
      if (V && places.length) { V.pulse(places.map(function (q) { return q.id; })); V.focus(p ? [[p.ex, p.ey]] : places.map(function (q) { return [q.ex, q.ey]; }), { tight: !!p }); }
      if (k < lines.length - 1) bfT = setTimeout(beat, REDUCED ? 2600 : 3400);
    }
    if (V && places.length) V.focus(places.map(function (q) { return [q.ex, q.ey]; }), {});
    bfT = setTimeout(beat, 1500);
    var xb = $('#wg-bf-x'); if (xb) xb.focus({ preventScroll: true });
  }
  function closeBrief(quiet) {
    clearTimeout(bfT);
    if (bfEl) { bfEl.remove(); bfEl = null; if (V) V.pulse([]); }
    if (!quiet && bfX) { var b = $('[data-brief="' + bfX.id + '"]', panel); if (b) b.focus({ preventScroll: true }); }
    bfX = null;
  }
  app.addEventListener('click', function (ev) {
    if (!bfEl || !bfEl.contains(ev.target)) return;
    if (ev.target.closest('#wg-bf-x')) closeBrief();
    else if (ev.target.closest('#wg-bf-seat') && bfX) seat(bfX.id);
    else if (ev.target.closest('#wg-bf-nx') && bfX) brief(EX[(EX.indexOf(bfX) + 1) % EX.length]);
    else if (ev.target.closest('#wg-bf-p') && bfX) brief(EX[(EX.indexOf(bfX) - 1 + EX.length) % EX.length]);
  });

  // ---------------------------------------------------------------- a place: its dossier
  // the dossier of a place sits over the board, not over the page (1 November 2026): the board stays lit, so the place's range
  // rings and its neighbours are seen while it is read. Closed by its cross, Esc, or a tap on empty ground.
  var sheet = $('#wg-sheet'), sheetIn = $('#wg-sh-in'), lastFocus = null;
  if (sheet) { app.appendChild(sheet); sheet.setAttribute('aria-modal', 'false'); }
  function openSheet(html) {
    lastFocus = D.activeElement; sheetIn.innerHTML = '<button type="button" class="wg-x" id="wg-x" aria-label="' + esc(tr('Close')) + '">×</button>' + html; sheet.hidden = false;
    var x = $('#wg-x'); if (x) x.focus({ preventScroll: true });
  }
  function closeSheet() { sheet.hidden = true; if (V) V.select(null); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  sheet.addEventListener('click', function (ev) { if (ev.target === sheet || ev.target.closest('#wg-x')) closeSheet(); });
  D.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (!sheet.hidden) closeSheet(); else if (bfEl) closeBrief();
  });
  function forcesAt(id) { return (R.forces || []).filter(function (f) { return (f.at || []).indexOf(id) >= 0; }); }
  function placeSheet(p) {
    if (!p) return;
    if (V) {
      V.select(p.id); touched();
      var rr = rangesOf(p.id);      // the camera pulls back far enough to show the reach of what is based there
      if (rr.length) V.focus(rr[rr.length - 1].filter(function (q, i) { return i % 8 === 0; }).concat([[p.ex, p.ey]]), { wide: true }); else V.focus([[p.ex, p.ey]], { tight: true });
    }
    var fs = forcesAt(p.id);
    openSheet('<div class="wg-place"><p class="wg-k" style="color:' + teamHex(p.o) + '">' + esc((SIDE[p.o] || {}).n || p.o || '') + '  ·  ' + esc(tk('k:', p.k)) + '</p><h3 id="wg-sh-t">' + esc(p.n) + '</h3>' +
      '<p class="wg-pips" aria-label="' + esc(tf('Importance {n} of 5', { n: N(p.v || 2) })) + '">' + [1, 2, 3, 4, 5].map(function (k) { return '<i class="' + (k <= (p.v || 2) ? 'on' : '') + '"></i>'; }).join('') + '</p>' +
      (p.why ? '<p>' + esc(p.why) + '</p>' : '') + (p.st ? '<p class="wg-dim">' + esc(p.st) + '</p>' : '') +
      (fs.length ? '<h4>' + esc(tr('Based here')) + '</h4><ul class="wg-fs">' + fs.map(function (f) { return '<li><b>' + esc(f.n) + '</b>' + (f.count ? ' <span class="num">' + fmt(f.count) + '</span>' : '') + (f.rangeKm ? ' <span class="wg-dim num">' + esc(tf('range {n} km', { n: fmt(f.rangeKm) })) + '</span>' : '') + '</li>'; }).join('') + '</ul>' : '') +
      ((p.src || []).length ? '<p class="wg-fine">' + p.src.slice(0, 3).map(function (u, i) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(tf('Source {n}', { n: N(i + 1) })) + ' ↗</a>'; }).join('  ·  ') + '</p>' : '') + '</div>');
  }

  // ---------------------------------------------------------------- RUN, and the after-action report
  function advisorLine(ev) {
    if (!ev.param) return '';
    var room = (S.lens === 'room' && S.room.length ? S.room.map(function (i) { return EXID[i]; }) : EX).filter(function (x) { return x && x.pWhy && x.pWhy[ev.param]; });
    if (!room.length) return '';
    var x = room[Math.abs(hash(ev.param + ev.d)) % room.length];
    return x.n + ': ' + x.pWhy[ev.param];
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
  function run() {
    var btn = $('#wg-run'); if (btn) { btn.disabled = true; btn.textContent = tr('Running 1,000 simulations…'); }
    setTimeout(function () {
      var P = params(), lv = Object.assign({}, S.lv);
      var res = runMany(P, lv, 1000, 1337 + hash(JSON.stringify(lv)));
      if (TID === 'iran') res.A.intOutShare = intOutShare(P, lv, 300, 99);
      var feat = runOne(P, lv, res.seed, true);
      res.calls = EX.map(function (x) { var o = runMany(Object.assign(avgOf(EX), x.p || {}), lv, 200, 777); return { x: x, top: o.top, p: o.cnt[o.top] / o.n, hit: o.cnt[feat.out] / o.n }; });
      res.feat = feat; res.P = P; res.lv = lv;
      var start = S.date || R.today, unit = MOD.unit === 'week' ? 7 : 1;
      var byDay = {}; feat.log.forEach(function (ev) { (byDay[ev.d] = byDay[ev.d] || []).push(ev); });
      var f0 = TID === 'ukraine' ? frontPts((frontAt(R.today) || {}).line) : null;
      var steps = feat.snaps.map(function (sn) {
        var evs = byDay[sn.d] || [], loud = evs.filter(function (v) { return v.w && !v.quiet; });
        var say = ''; for (var i = 0; i < evs.length && !say; i++) say = advisorLine(evs[i]);
        var lines = loud.map(function (v) { return { w: v.w, c: teamHex(v.side) }; });
        if (say) lines.push({ w: say, c: GOLD });
        var orb = {}; ORB.forEach(function (o) { orb[o.id] = Object.assign({ b: 1, r: 1 }, (sn.o || {})[o.id] || {}); });
        return { when: tf(MOD.unit === 'week' ? 'Week {n}' : 'Day {n}', { n: N(sn.d) }), dn: day(addDays(start, (sn.d - 1) * unit)), head: loud.length ? loud[0].w : (sn.b || []).slice(1, 3).map(function (b) { return b[0] + ' ' + b[1]; }).join('  ·  '),
          ev: evs.filter(function (v) { return v.from || v.to; }), lines: lines.slice(loud.length ? 1 : 0), orb: orb, board: sn.b,
          front: f0 ? shifted(f0, sn.sec) : null, ms: loud.some(function (v) { return v.big; }) ? 2400 : 1500 };
      });
      res.tl = { kind: 'run', steps: steps, done: function () { var o = MOD.outcomes.filter(function (x) { return x.id === feat.out; })[0]; feedSet(o.n + '. ' + o.w, [{ w: tr('This was the most typical of the 1,000 runs.'), c: o.c }]); } };
      LAST = res; S.view = 'aar'; S.tab = 'next';
      if (btn) { btn.disabled = false; btn.textContent = tr('Run 1,000 simulations'); }
      drawPanel();
      reportCalls(res);
      play(res.tl);
      if (narrow() && S.sheet !== 'max') sheetTo('mid');
    }, 40);
  }
  function mkById(id) { return (R.markets || []).filter(function (m) { return m.id === id; })[0]; }
  function mkOpt(m, horizonIso) {      // the option of a market with dates that is nearest the end of the run, else its first
    if (!m || !m.o || !m.o.length) return null;
    if (m.o.length === 1 || !horizonIso) return m.o[0];
    var best = m.o[0], bd = Infinity, h = Date.parse(horizonIso);
    m.o.forEach(function (o) { var t = Date.parse(String(o[0]).replace(/^(By|Before)\s+/i, '')); if (isFinite(t) && Math.abs(t - h) < bd) { bd = Math.abs(t - h); best = o; } });
    return best;
  }
  function gauge(p, c) {
    var r = 34, L = 2 * Math.PI * r, f = clamp(p, 0, 1);
    return '<svg class="wg-gauge" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="' + r + '" class="wg-g0"/><circle cx="42" cy="42" r="' + r + '" class="wg-g1" style="stroke:' + c + ';stroke-dasharray:' + (L * f).toFixed(1) + ' ' + L.toFixed(1) + '"/></svg>';
  }
  function aarHtml(res) {
    var top = MOD.outcomes.filter(function (o) { return o.id === res.top; })[0];
    var end = addDays(S.date || R.today, Math.round(res.A.days || 30) * (MOD.unit === 'week' ? 7 : 1));
    var outs = MOD.outcomes.map(function (o) {
      var p = res.cnt[o.id] / res.n, mid = (R.om || {})[o.id], m = mid && mkById(mid), opt = m && mkOpt(m, end), bet = '';
      if (m && opt) {
        var q = opt[1], gap = Math.round((p - q) * 100);
        bet = '<p class="wg-bet"><span>' + esc(tf('My model says {a}, the market says {b}.', { a: pc(p), b: pc(q) })) + '</span> <b class="num ' + (gap > 0 ? 'up' : gap < 0 ? 'dn' : '') + '">' + (gap > 0 ? '+' : '') + N(gap) + ' ' + esc(tr('pts')) + '</b>' +
          '<small>' + esc(m.q) + (m.o.length > 1 ? ' (' + esc(opt[0]) + ')' : '') + ' <a href="' + esc(m.u) + '" target="_blank" rel="' + esc(m.rel || 'noopener') + '">' + esc(m.w || tr('market')) + ' ↗</a></small></p>';
      }
      return '<li class="wg-oc' + (o.id === res.top ? ' top' : '') + '"><div class="wg-oc-g">' + gauge(p, o.c) + '<b class="num" style="color:' + o.c + '">' + pc(p) + '</b></div><div class="wg-oc-t"><h4>' + esc(o.n) + '</h4><p>' + esc(o.w) + '</p>' + bet + '</div></li>';
    }).join('');
    var sm = '';
    (R.sm || []).some(function (r) { if (!r[1] || res.lv[r[0]] === r[1]) { var m = mkById(r[2]); if (m) { var o = mkOpt(m, S.date || R.today); sm = '<p class="wg-bet wg-start"><span>' + esc(tr('Does it start at all? The simulation assumes it does. The market:')) + '</span> <b class="num">' + pc(o[1]) + '</b><small>' + esc(m.q) + (m.o.length > 1 ? ' (' + esc(o[0]) + ')' : '') + ' <a href="' + esc(m.u) + '" target="_blank" rel="' + esc(m.rel || 'noopener') + '">' + esc(m.w || tr('market')) + ' ↗</a></small></p>'; } return true; } return false; });
    var sum = MOD.summary(res.A, res.lv).map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd class="num">' + esc(x[1]) + '</dd></div>'; }).join('');
    var calls = res.calls.slice().sort(function (a, b) { return b.hit - a.hit; }).slice(0, 5).map(function (c) { var o = MOD.outcomes.filter(function (x) { return x.id === c.top; })[0]; return '<li>' + face(c.x, 'tiny') + '<span><b>' + esc(c.x.n) + '</b> ' + esc(tr('expects')) + ' <em style="color:' + o.c + '">' + esc(o.n.toLowerCase()) + '</em> <span class="num">(' + pc(c.p) + ')</span></span></li>'; }).join('');
    return '<div class="wg-aar" id="wg-result"><div class="wg-aar-h"><p class="wg-k">' + esc(tr('After-action report')) + '  ·  ' + esc(tr('1,000 simulations')) + '</p><button type="button" class="wg-chip" id="wg-back">' + esc(tr('Change the moves')) + '</button></div>' +
      '<p class="wg-big">' + tf('{o} in {p} of them.', { o: '<b style="color:' + top.c + '">' + esc(top.n) + '</b>', p: '<span class="num">' + pc(res.cnt[res.top] / res.n) + '</span>' }) + '</p>' +
      '<ul class="wg-ocs">' + outs + '</ul>' + sm +
      '<p class="wg-fine">' + esc(tr('A model to think with, not a forecast. The markets ask their own questions, war or no war; each one is named beside its number.')) + '</p>' +
      '<div class="wg-aar-b"><button type="button" class="wg-run" id="wg-watch">' + esc(tr('Watch the typical run')) + '</button><button type="button" class="wg-chip" id="wg-again">' + esc(tr('Run it again')) + '</button></div>' +
      '<h4>' + esc(tr('The cost, averaged over the runs')) + '</h4><dl class="wg-sum">' + sum + '</dl>' +
      '<h4>' + esc(tr('Who in the room called it')) + '</h4><ul class="wg-calls">' + calls + '</ul>' +
      '<div class="wg-share"><button type="button" class="wg-run" id="wg-share">' + esc(tr('Share this simulation')) + '</button><button type="button" class="wg-chip" data-shot="' + KEY + TID + '" hidden>' + esc(tr('Make a picture')) + '</button></div></div>';
  }
  function bindCalls() { $$('[data-shot]', box).forEach(function (b) { b.hidden = !W.LPShot; }); }
  function reportCalls(res) {
    // The simulation's answer next to the betting markets and the readers (CALLS.md: a calculator reports its own number).
    var lpc = $('.lpc', box);
    if (W.LPCalls && lpc) {
      try {
        if (TID === 'iran') { var f = res.cnt.fall / res.n; W.LPCalls.mine('p:663583', f >= 0.5 ? 0 : 1, 'Your briefing room: the regime falls in ' + pc(f) + ' of the runs you built'); }
        W.LPCalls.mount(lpc);
      } catch (x) {}
    }
    bindCalls();
  }

  // ---------------------------------------------------------------- the address, share and the picture
  function writeUrl() {
    var q = { r: S.room.join('.'), l: S.lens, d: S.date || '' };
    MOD.levers.forEach(function (l) { q[l.id] = S.lv[l.id]; });
    var s = Object.keys(q).filter(function (k) { return q[k]; }).map(function (k) { return k + ':' + q[k]; }).join(',');
    try { history.replaceState(history.state, '', location.pathname + '?s=' + encodeURIComponent(s) + (/[?&]stream=1/.test(location.search) ? '&stream=1' : '') + location.hash); } catch (x) {}
  }
  function readUrl() {
    var m = /[?&]s=([^&]+)/.exec(location.search); if (!m) return false;
    decodeURIComponent(m[1]).split(',').forEach(function (kv) {
      var i = kv.indexOf(':'), k = kv.slice(0, i), v = kv.slice(i + 1);
      if (k === 'r') S.room = v.split('.').filter(function (x) { return EXID[x]; });
      else if (k === 'l' && /^(room|all|markets|mine)$/.test(v)) S.lens = v === 'mine' ? 'all' : v;
      else if (k === 'd' && /^\d{4}-\d\d-\d\d$/.test(v)) S.date = v;
      else MOD.levers.forEach(function (l) { if (l.id === k && l.o.some(function (o) { return o[0] === v; })) S.lv[k] = v; });
    });
    return true;
  }
  function share() {
    writeUrl();
    var url = location.href, t = R.meta.title;
    if (W.LPShare && W.LPShare.open) { try { W.LPShare.open({ url: url, title: t }); return; } catch (x) {} }
    if (navigator.share) navigator.share({ title: t, url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { var b = $('#wg-share'); if (b) { b.textContent = tr('Link copied'); setTimeout(function () { b.textContent = tr('Share this simulation'); }, 1600); } });
  }
  var posterImg = null;
  (W.LPShotQ = W.LPShotQ || []).push({
    id: KEY + TID, kicker: tr('CONFLICT SIMULATOR'), el: '#' + box.id, cta: tr('Run the simulation yourself'), url: function () { writeUrl(); return location.href; },
    title: function () { if (!LAST) return R.meta.h1; var o = MOD.outcomes.filter(function (x) { return x.id === LAST.top; })[0]; return tf('My briefing room: {o} ({p})', { o: o.n.toLowerCase(), p: pc(LAST.cnt[LAST.top] / LAST.n) }); },
    sub: function () { return R.meta.h1; },
    text: function () { return R.meta.lede; },
    draw: function (c, bx, kit) {
      var s = Math.min(bx.w / G.w, (bx.h * 0.6) / G.h), ox = bx.x + (bx.w - G.w * s) / 2, oy = bx.y;
      c.save(); c.translate(ox, oy); c.scale(s, s);
      if (posterEl && posterEl.complete && posterEl.naturalWidth) c.drawImage(posterEl, 0, 0, G.w, G.h);
      else { c.fillStyle = '#0b0f14'; c.fillRect(0, 0, G.w, G.h); }
      PLACES.forEach(function (p) { if (p.off) return; c.fillStyle = teamHex(p.o); c.beginPath(); c.arc(p.x, p.y, 5, 0, 7); c.fill(); });
      c.restore();
      if (!LAST) return;
      var y = oy + G.h * s + 30, w = bx.w;
      MOD.outcomes.forEach(function (o) {
        var p = LAST.cnt[o.id] / LAST.n;
        c.fillStyle = '#2b2a27'; c.fillRect(bx.x, y, w, 34); c.fillStyle = o.c; c.fillRect(bx.x, y, w * p, 34);
        c.fillStyle = '#F3F1EA'; c.font = kit.font(26, 700); c.textBaseline = 'middle'; c.fillText(o.n + '  ' + pc(p), bx.x + 12, y + 17);
        y += 44;
      });
    }
  });

  // ---------------------------------------------------------------- HOW IT WORKS, under the board
  function howHtml() {
    var ps = (R.params || []).map(function (p) { return '<li><b>' + esc(p.n) + '</b>: ' + tf('{v} today, between {a} and {b}. ', { v: pmFmt(p, p.base), a: pmFmt(p, p.min), b: pmFmt(p, p.max) }) + ((p.src || []).length ? '<a href="' + esc(p.src[0]) + '" target="_blank" rel="noopener">' + esc(tr('Source')) + '</a>' : '') + '</li>'; }).join('');
    return '<ol>' + MOD.how.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol><h4>' + esc(tr('The numbers and where they come from')) + '</h4><ul class="wg-how-p">' + ps + '</ul>' +
      '<p>' + esc(tr('Each advisor sets only the numbers their published work speaks to; the rest are the average of the others. Betting markets move a number when a market prices the same thing.')) + ' ' +
      (R.now ? tf('Where things stand, {d}: ', { d: esc(day(R.now.asOf)) }) + esc(R.now.state) : '') + '</p>' +
      '<h4>' + esc(tr('Moving around the board')) + '</h4><p>' + esc(tr('Drag to move, pinch or scroll to zoom, two fingers or the right mouse button to turn. Keys: arrows move, + and − zoom, Q and E turn, space plays and pauses, [ and ] step through the places, Enter opens one.')) + '</p>';
  }

  // ---------------------------------------------------------------- the top bar and the camera buttons
  hud.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var id = b.id;
    if (id === 'wg-play') { if (playing) pause(); else resume(); }
    else if (id === 'wg-speed') { S.speed = S.speed >= 4 ? 1 : S.speed * 2; b.textContent = N(S.speed) + '×'; }
    else if (id === 'wg-cam') { S.follow = !S.follow; b.setAttribute('aria-pressed', S.follow); }
    else if (id === 'wg-full') full();
    else if (id === 'wg-orbt') { S.orbOpen = !($('#wg-orb').classList.contains('open')); orbDraw(); layout(); }
    else if (V && id === 'wg-zin') { touched(); V.zoomBy(1 / 1.45); }
    else if (V && id === 'wg-zout') { touched(); V.zoomBy(1.45); }
    else if (V && id === 'wg-rot') { touched(); V.rotateBy(Math.PI / 4); }
    else if (V && id === 'wg-fit') { V.home(); }
  });
  function full() {
    var on = box.classList.contains('wg-full');
    if (!on) { tog(box, 'wg-full', true); D.documentElement.style.overflow = 'hidden'; if (box.requestFullscreen) box.requestFullscreen().catch(function () {}); }
    else { tog(box, 'wg-full', false); D.documentElement.style.overflow = ''; if (D.fullscreenElement && D.exitFullscreen) D.exitFullscreen().catch(function () {}); }
    setTimeout(layout, 80);
  }
  D.addEventListener('fullscreenchange', function () { if (!D.fullscreenElement && box.classList.contains('wg-full')) { tog(box, 'wg-full', false); D.documentElement.style.overflow = ''; } setTimeout(layout, 80); });
  D.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && box.classList.contains('wg-full') && !D.fullscreenElement && sheet.hidden && !bfEl) full(); });

  // ---------------------------------------------------------------- the size of the board and where the panels leave it free
  var lastW = 0;
  function layout() {
    // the board fills the first screen under the site's header: measured once per width (a phone's address bar comes and goes)
    var full = box.classList.contains('wg-full') || D.documentElement.classList.contains('lp-stream');
    if (!full && (W.innerWidth !== lastW || !app.style.height)) {
      lastW = W.innerWidth;
      var top = app.getBoundingClientRect().top + (W.pageYOffset || 0);
      app.style.height = Math.max(440, Math.round(W.innerHeight - top)) + 'px';
    }
    if (full) app.style.height = '';
    var r = stage.getBoundingClientRect(), ins = { l: 0, r: 0, t: 0, b: 0 };
    if (!r.width) return;
    var tb = $('#wg-top'), tl = $('#wg-tl');
    if (tb) ins.t = tb.getBoundingClientRect().bottom - r.top;
    if (narrow()) { ins.b = r.bottom - panel.getBoundingClientRect().top + (tl ? tl.getBoundingClientRect().height + 8 : 0); }
    else {
      ins.r = r.right - panel.getBoundingClientRect().left;
      var ob = $('#wg-orb'); if (ob && ob.classList.contains('open')) ins.l = ob.getBoundingClientRect().right - r.left;
      if (tl) ins.b = r.bottom - tl.getBoundingClientRect().top;
    }
    FREE = ins;
    if (V) V.resize(ins);
  }
  var rzT = 0;
  W.addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(layout, 60); });

  // ---------------------------------------------------------------- the user's hands: the camera leaves them alone for a while
  var lastTouch = 0;
  function touched() { lastTouch = Date.now(); }
  function userBusy() { return Date.now() - lastTouch < 4000; }

  // ======================================================================== THE VIEW: what draws the board (3D, or flat)
  var V = null;
  var BADGE = {};      // a canvas per (kind, team, capital): the game marker, shared by both views
  var GLYPH = {
    airbase: [0, 'M0-7L2 0L7 2V4L2 3L1 6L3 7V8H-3V7L-1 6L-2 3L-7 4V2L-2 0Z'],
    naval: [0, 'M-7 1H7L4 6H-4ZM-1-7H1V1H-1ZM-4-4H4V-2.5H-4Z'],
    missile: [0, 'M0-8L3-3V5L5 8H-5L-3 5V-3Z'],
    nuclear: [0, 'M0-2.2A2.2 2.2 0 1 1 0 2.2A2.2 2.2 0 1 1 0-2.2ZM0-8L4-1.5H-4ZM-6.9 4L-2.4 2.4L-4.1 6.9ZM6.9 4L4.1 6.9L2.4 2.4Z'],
    oil: [0, 'M0-8C3-4 5-1 5 2A5 5 0 0 1-5 2C-5-1-3-4 0-8Z'],
    capital: [0, 'M0-8L2.4-2.5H8L3.5 1L5.2 7L0 3.5L-5.2 7L-3.5 1L-8-2.5H-2.4Z'],
    choke: [0, 'M-8-4L-1 0L-8 4ZM8-4L1 0L8 4Z'],
    beach: [0, 'M-7 4Q-3.5 0 0 4T7 4V6H-7Z'],
    airdef: [1, 'M0-7L6-4.5V1C6 4.5 3.5 6.5 0 8C-3.5 6.5-6 4.5-6 1V-4.5ZM0-3V4M-2.5-0.5L0-3L2.5-0.5'],
    radar: [1, 'M-6-3A8 8 0 0 0 3 7ZM-1.5 2L4-4M-3 8H5'],
    hq: [0, 'M-5-8H-3V8H-5ZM-3-7H7L4-3.5L7 0H-3Z'],
    army: [1, 'M-8-5H8V5H-8ZM-8-5L8 5M8-5L-8 5'],
    port: [1, 'M0-5V7M-4-2H4M-6 2A6 5 0 0 0 6 2M0-8A1.6 1.6 0 1 1 0-4.8A1.6 1.6 0 1 1 0-8'],
    power: [0, 'M1-8L-5 1H0L-2 8L5-2H0Z'],
    industry: [0, 'M-8 7V-1L-3 2V-1L2 2V-6H5V-1L8-3V7Z'],
    bridge: [1, 'M-8 4H8M-6 4V1A6 5 0 0 1 6 1V4'],
    city: [0, 'M-7 7V-1H-3V7ZM-2 7V-6H2V7ZM3 7V-3H7V7Z']
  };
  function badge(k, team, cap) {
    var key = k + '|' + team + '|' + (cap ? 1 : 0);
    if (BADGE[key]) return BADGE[key];
    var c = D.createElement('canvas'), s = 128; c.width = c.height = s;
    var x = c.getContext('2d'), col = TEAMHEX[team] || TEAMHEX.grey;
    x.translate(s / 2, s / 2);
    function hex(r) { x.beginPath(); for (var i = 0; i < 6; i++) { var a = Math.PI / 3 * i - Math.PI / 2; x[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); }
    x.shadowColor = col; x.shadowBlur = 16;
    hex(48); x.fillStyle = 'rgba(6,10,16,0.92)'; x.fill();
    x.shadowBlur = 0;
    x.lineWidth = 7; x.strokeStyle = col; hex(48); x.stroke();
    x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,0.22)'; hex(39); x.stroke();
    if (cap) { x.lineWidth = 4; x.strokeStyle = GOLD; hex(58); x.stroke(); }
    var g = GLYPH[k] || [0, 'M0-6L6 0L0 6L-6 0Z'], p = new Path2D(g[1]);
    x.save(); x.scale(3.6, 3.6);
    if (g[0]) { x.lineWidth = 1.7; x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = '#F6F3EA'; x.stroke(p); }
    else { x.fillStyle = '#F6F3EA'; x.fill(p); }
    x.restore();
    BADGE[key] = c; return c;
  }
  function markPx(p) { return (narrow() ? 18 : 22) + (p.v || 2) * (narrow() ? 2 : 3) + (p.k === 'capital' ? 5 : 0) - (p.off ? 4 : 0); }
  var LABELED = PLACES.filter(function (p) { return (p.v || 0) >= 4 || p.k === 'capital'; });
  var HOME = (function () { var q = PLACES.filter(function (p) { return !p.off && ((p.v || 0) >= 4 || p.k === 'capital'); }).map(function (p) { return [p.ex, p.ey]; }); return q.length >= 3 ? q : [[0, 0], [G.w, G.h]]; })();
  // the names on the board: one span each, placed by the view, the most important first; one that would overlap a name
  // already shown waits (its marker still shows, and a tap opens it). Off the screen: not drawn at all.
  var TAG = {};
  PLACES.forEach(function (p) {
    var t = D.createElement('span'); t.className = 'wg-tag t-' + p.team + (p.k === 'capital' ? ' cap' : '') + (p.off ? ' off' : '');
    t.textContent = p.off ? p.n + ' →' : p.n; t.setAttribute('aria-hidden', 'true'); tagsEl.appendChild(t); TAG[p.id] = t; p.pri = (p.k === 'capital' ? 10 : 0) + (p.v || 2);
  });
  var tagOrder = PLACES.slice().sort(function (a, b) { return b.pri - a.pri; });
  var FREE = { l: 0, r: 0, t: 0, b: 0 };
  function placeTags(proj, zoomed) {      // proj(p) -> [x, y, visible, px]
    var w = stage.clientWidth - FREE.r, h = stage.clientHeight - FREE.b, kept = [];
    tagOrder.forEach(function (p) {
      var t = TAG[p.id], q = proj(p);
      var want = q && q[2] && !q[4] && (zoomed > 1.6 || LABELED.indexOf(p) >= 0 || S.sel === p.id || S.pulse && S.pulse.indexOf(p.id) >= 0);
      if (!want) { if (t.style.display !== 'none') t.style.display = 'none'; return; }
      var tw = t._w || (t._w = Math.max(30, p.n.length * 7.4 + 12)), th = 18;
      var x = q[0] - tw / 2, y = q[1] + q[3] * 0.5 + 2;
      if (x < FREE.l + 2 || y < FREE.t + 2 || x + tw > w - 2 || y + th > h - 2) { t.style.display = 'none'; return; }
      for (var i = 0; i < kept.length; i++) { var k = kept[i]; if (x < k[0] + k[2] && x + tw > k[0] && y < k[1] + k[3] && y + th > k[1]) { t.style.display = 'none'; return; } }
      kept.push([x, y, tw, th]);
      t.style.display = ''; t.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    });
  }
  // the minimap: the poster, the places, and the ground the camera sees
  var mini = $('#wg-minic'), miniX = mini ? mini.getContext('2d') : null;
  function miniDraw() {
    if (!miniX || !mini.offsetWidth) return;
    var w = mini.offsetWidth, h = mini.offsetHeight, d = Math.min(2, W.devicePixelRatio || 1);
    if (mini.width !== Math.round(w * d)) { mini.width = Math.round(w * d); mini.height = Math.round(h * d); }
    var c = miniX; c.setTransform(d * w / G.w, 0, 0, d * h / G.h, 0, 0);
    if (posterEl.complete && posterEl.naturalWidth) c.drawImage(posterEl, 0, 0, G.w, G.h); else { c.fillStyle = '#0a0d12'; c.fillRect(0, 0, G.w, G.h); }
    PLACES.forEach(function (p) { if (p.off) return; c.fillStyle = teamHex(p.o); c.fillRect(p.x - 6, p.y - 6, 12, 12); });
    var q = V && V.groundRect ? V.groundRect() : null;
    if (q) { c.beginPath(); q.forEach(function (p, i) { c[i ? 'lineTo' : 'moveTo'](clamp(p[0], -50, G.w + 50), clamp(p[1], -50, G.h + 50)); }); c.closePath(); c.lineWidth = G.w / w * 1.6; c.strokeStyle = GOLD; c.stroke(); c.fillStyle = 'rgba(244,196,48,0.10)'; c.fill(); }
  }
  if (mini) {
    var mDown = false;
    function miniGo(ev) { var r = mini.getBoundingClientRect(); if (V) { touched(); V.moveTo((ev.clientX - r.left) / r.width * G.w, (ev.clientY - r.top) / r.height * G.h); } }
    $('#wg-mini').addEventListener('pointerdown', function (ev) { mDown = true; miniGo(ev); });
    W.addEventListener('pointermove', function (ev) { if (mDown) miniGo(ev); });
    W.addEventListener('pointerup', function () { mDown = false; });
    $('#wg-mini').addEventListener('keydown', function (ev) { if ((ev.key === 'Enter' || ev.key === ' ') && V) { ev.preventDefault(); V.home(); } });
  }
  // the geodesic circle around a place, in map units (a range ring is a true distance on the earth, drawn in Mercator)
  function ringPts(ll, km) {
    var out = [], d = km / 6371, la = ll[0] * Math.PI / 180, lo = ll[1] * Math.PI / 180;
    for (var i = 0; i <= 96; i++) {
      var b = i / 96 * 2 * Math.PI, la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
      var lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
      out.push(xy([la2 * 180 / Math.PI, lo2 * 180 / Math.PI]));
    }
    return out;
  }
  function rangesOf(id) { var p = PL[id]; if (!p) return []; var km = {}; forcesAt(id).forEach(function (f) { if (f.rangeKm && f.rangeKm < 6000) km[f.rangeKm] = 1; }); return Object.keys(km).map(Number).sort(function (a, b) { return a - b; }).slice(0, 3).map(function (k) { return ringPts(p.ll, k); }); }
  function sweepSites() {
    var ids = {};
    PLACES.forEach(function (p) { if ((p.k === 'airdef' || p.k === 'radar') && !p.off) ids[p.id] = 1; });
    (R.forces || []).forEach(function (f) { if (f.k === 'interceptor' || f.k === 'sam') (f.at || []).forEach(function (a) { if (PL[a] && !PL[a].off) ids[a] = 1; }); });
    return Object.keys(ids);
  }
  function defenderOf(toId, team) {      // where an interceptor rises from: the nearest air defence, airbase or warship of the defending side
    var t = PL[toId]; if (!t) return null;
    var best = null, bd = Infinity;
    PLACES.forEach(function (p) { if (p.team !== team || p.off || ['airdef', 'radar', 'airbase', 'naval', 'capital', 'city'].indexOf(p.k) < 0) return; var d = Math.hypot(p.ex - t.ex, p.ey - t.ey) + (p.k === 'airdef' ? -60 : 0); if (d < bd) { bd = d; best = p; } });
    return best;
  }
  var SPEED = { strike: 2400, missile: 2600, drone: 4200, naval: 4200, ground: 3200, intercept: 2000 };

  // ---------------------------------------------------------------- the 3D view (three.js)
  function makeGL(T) {
    var dpr = Math.min(2, W.devicePixelRatio || 1);
    var renderer = new T.WebGLRenderer({ canvas: glc, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (T.ColorManagement) T.ColorManagement.enabled = false;
    renderer.outputColorSpace = T.LinearSRGBColorSpace;
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x05070a, 1);
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(38, 1, 2, 12000);
    var maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
    var clock0 = performance.now();
    var U = { uTime: { value: 0 } };
    var HW = G.w / 2, HH = G.h / 2;
    function wx(x) { return x - HW; } function wz(y) { return y - HH; }
    // the height of the ground under a map point, from the baked heightmap (0 until it has loaded)
    var hm = null, hmW = 0, hmH = 0, EX = 12, hScale = 0;
    function hAt(x, y) {
      if (!hm) return 0;
      var u = (x - FR[0]) / FW * (hmW - 1), v = (y - FR[1]) / FH * (hmH - 1);
      if (u < 0 || v < 0 || u > hmW - 1 || v > hmH - 1) return 0;
      var i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, i1 = Math.min(hmW - 1, i + 1), j1 = Math.min(hmH - 1, j + 1);
      var a = hm[j * hmW + i], b = hm[j * hmW + i1], c = hm[j1 * hmW + i], d = hm[j1 * hmW + i1];
      return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
    }
    // ---- the textures drawn on the page: the land, the borders and the lines, the ground of each side, the scorch marks
    var big = !narrow() && dpr * W.innerWidth > 900;
    function cnv(w) { var c = D.createElement('canvas'); c.width = w; c.height = Math.round(w * FH / FW); return c; }
    var mask = cnv(1024), lin = cnv(big ? 2048 : 1536), ovl = cnv(1024), ovlBase = cnv(1024);
    function onMap(c) { var x = c.getContext('2d'), s = c.width / FW; x.setTransform(s, 0, 0, c.height / FH, -FR[0] * s, -FR[1] * c.height / FH); return x; }
    var paths = (G.c || []).map(function (c) { return { n: c.n, p: new Path2D(c.d) }; });
    (function () {
      var x = mask.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, mask.width, mask.height);
      x = onMap(mask); x.fillStyle = '#f00'; paths.forEach(function (c) { x.fill(c.p); });
      var b = onMap(ovlBase), s = ovlBase.width / FW;
      paths.forEach(function (c) { var side = (R.ctry || {})[c.n]; if (!side) return; var t = teamOf(side); b.fillStyle = t === 'blue' ? 'rgba(40,120,255,0.13)' : t === 'red' ? 'rgba(255,58,40,0.12)' : 'rgba(200,196,170,0.06)'; b.fill(c.p); });
      var l = onMap(lin), ls = lin.width / FW;
      paths.forEach(function (c) { l.lineJoin = 'round'; l.lineWidth = 1.2 / ls; l.strokeStyle = 'rgba(236,226,196,0.30)'; l.stroke(c.p); });
      paths.forEach(function (c) {
        var side = (R.ctry || {})[c.n]; if (!side) return;
        var col = TEAMHEX[teamOf(side)] || TEAMHEX.grey;
        l.shadowColor = col; l.shadowBlur = 10; l.lineWidth = 2.6 / ls; l.strokeStyle = col; l.stroke(c.p);
        l.shadowBlur = 0; l.lineWidth = 1.1 / ls; l.strokeStyle = 'rgba(255,255,255,0.85)'; l.stroke(c.p);
      });
    })();
    var scorch = [], frontNow = null;
    function drawOvl() {
      var x = ovl.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, ovl.width, ovl.height); x.drawImage(ovlBase, 0, 0);
      var m = onMap(ovl), s = ovl.width / FW;
      if (frontNow && UA) {
        m.save(); m.clip(new Path2D(UA.d));
        var occ = new Path2D(frontPath(frontNow.pts));
        m.fillStyle = 'rgba(255,50,36,0.30)'; m.fill(occ);
        m.save(); m.clip(occ); m.strokeStyle = 'rgba(255,90,70,0.55)'; m.lineWidth = 1.4 / s;
        for (var k = -FH; k < FW + FH; k += 7 / s * 1.4) { m.beginPath(); m.moveTo(FR[0] + k, FR[1]); m.lineTo(FR[0] + k - FH, FR[3]); m.stroke(); }
        m.restore();
        (frontNow.lobes || []).forEach(function (o) { var ring = Array.isArray(o) ? o : (o && o.ring) || []; if (!ring.length || !Array.isArray(ring[0]) || (o.side && teamOf(o.side) === 'blue')) return; m.fillStyle = 'rgba(255,50,36,0.32)'; m.fill(new Path2D('M' + ring.map(xy).map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L') + 'Z')); });
        m.restore();
        (frontNow.lobes || []).forEach(function (o) { if (!o || !o.ring || !o.side || teamOf(o.side) !== 'blue') return; m.fillStyle = 'rgba(61,139,255,0.30)'; m.fill(new Path2D('M' + o.ring.map(xy).map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L') + 'Z')); });
      }
      scorch.forEach(function (q) {
        var g = m.createRadialGradient(q[0], q[1], 0, q[0], q[1], q[2]);
        g.addColorStop(0, 'rgba(10,6,4,0.85)'); g.addColorStop(0.45, 'rgba(40,18,8,0.55)'); g.addColorStop(0.8, 'rgba(255,110,40,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g; m.beginPath(); m.arc(q[0], q[1], q[2], 0, 7); m.fill();
      });
      if (texOvl) texOvl.needsUpdate = true;
    }
    var ovlDirty = 0;
    function addScorch(x, y, r) { scorch.push([x, y, r]); if (scorch.length > 160) scorch.shift(); ovlDirty = 1; }
    function ctex(c) { var t = new T.CanvasTexture(c); t.anisotropy = maxAniso; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; return t; }
    var texMask = ctex(mask), texLin = ctex(lin), texOvl = ctex(ovl);
    drawOvl();
    var blank = new T.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blank.needsUpdate = true;
    var TU = { tColor: { value: blank }, tNight: { value: blank }, tHeight: { value: blank }, tMask: { value: texMask }, tLin: { value: texLin }, tOvl: { value: texOvl },
      uTime: U.uTime, uTexel: { value: new T.Vector2(1 / 1024, 1 / 1024) }, uHS: { value: 0 }, uWorld: { value: new T.Vector2(FW, FH) },
      uTheatre: { value: new T.Vector4((0 - FR[0]) / FW, 1 - (G.h - FR[1]) / FH, (G.w - FR[0]) / FW, 1 - (0 - FR[1]) / FH) }, uHex: { value: G.w / 46 }, uCam: { value: new T.Vector3() }, uReady: { value: 0 }, uFog: { value: new T.Vector2(1500, 3500) } };
    var terrainMat = new T.ShaderMaterial({
      uniforms: TU, extensions: { derivatives: true },
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: [
        'uniform sampler2D tColor, tNight, tHeight, tMask, tLin, tOvl; uniform float uTime, uHS, uHex, uReady; uniform vec2 uTexel, uWorld, uFog; uniform vec4 uTheatre; uniform vec3 uCam;',
        'varying vec2 vUv; varying vec3 vW;',
        'float H(vec2 u){ float h = texture2D(tHeight, u).r; return h * h * uHS; }',
        'float hexEdge(vec2 p){ vec2 s = vec2(1.0, 1.7320508); vec2 a = mod(p, s) - s * 0.5; vec2 b = mod(p - s * 0.5, s) - s * 0.5; vec2 g = dot(a, a) < dot(b, b) ? a : b; vec2 q = abs(g); return max(dot(q, s * 0.5), q.x); }',
        'void main(){',
        '  vec3 sat = texture2D(tColor, vUv).rgb;',
        '  float land = texture2D(tMask, vUv).r;',
        '  float hl = H(vUv - vec2(uTexel.x, 0.0)), hr = H(vUv + vec2(uTexel.x, 0.0)), hd = H(vUv - vec2(0.0, uTexel.y)), hu = H(vUv + vec2(0.0, uTexel.y));',
        '  vec2 st = uTexel * uWorld * 2.0;',
        '  vec3 n = normalize(vec3(-(hr - hl) / st.x, 1.0, (hu - hd) / st.y));',
        '  vec3 L = normalize(vec3(-0.62, 0.52, -0.58));',
        '  float diff = clamp(dot(n, L), 0.0, 1.0);',
        '  float lum = dot(sat, vec3(0.299, 0.587, 0.114));',
        '  vec3 landC = mix(vec3(lum), sat, 0.40) * vec3(0.96, 0.94, 0.86) * 0.60;',
        '  vec3 seaC = vec3(0.006, 0.022, 0.045) + lum * vec3(0.07, 0.17, 0.26);',
        '  float sh = sin(vW.x * 0.09 + uTime * 0.55) * sin(vW.z * 0.12 - uTime * 0.42) + sin((vW.x + vW.z) * 0.035 + uTime * 0.3);',
        '  seaC += vec3(0.012, 0.03, 0.05) * (0.5 + 0.35 * sh);',
        '  vec3 col = mix(seaC, landC, land);',
        '  col *= mix(1.0, 0.26 + 1.32 * diff, land);',
        '  float nt = texture2D(tNight, vUv).r; col += pow(nt, 2.4) * vec3(1.0, 0.62, 0.26) * 1.25 * land;',
        '  vec4 ov = texture2D(tOvl, vUv); col = mix(col, ov.rgb, ov.a);',
        '  vec4 ln = texture2D(tLin, vUv); col += ln.rgb * ln.a * (0.82 + 0.18 * sin(uTime * 1.7));',
        '  float hx = hexEdge(vW.xz / uHex); float fw = fwidth(hx); col += vec3(0.96, 0.77, 0.19) * (1.0 - smoothstep(0.5 - fw * 1.5, 0.5, hx) * 0.0) * smoothstep(0.5 - fw * 1.6, 0.5, hx) * 0.07;',
        '  float o = max(max(uTheatre.x - vUv.x, vUv.x - uTheatre.z), max(uTheatre.y - vUv.y, vUv.y - uTheatre.w));',
        '  col = mix(col, vec3(0.012, 0.016, 0.022), smoothstep(-0.005, 0.05, o) * 0.82);',
        '  float d = length(vW - uCam); col = mix(col, vec3(0.03, 0.045, 0.06), smoothstep(uFog.x, uFog.y, d) * 0.65);',
        '  col = mix(vec3(0.02, 0.025, 0.03), col, uReady);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'].join('\n')
    });
    var segX = narrow() ? 200 : 340, segZ = Math.round(segX * FH / FW);
    var tgeo = new T.PlaneGeometry(FW, FH, segX, segZ); tgeo.rotateX(-Math.PI / 2);
    tgeo.translate(wx((FR[0] + FR[2]) / 2), 0, wz((FR[1] + FR[3]) / 2));
    var terrain = new T.Mesh(tgeo, terrainMat); terrain.frustumCulled = false; scene.add(terrain);
    function loadTex(url, srgb) { return new Promise(function (res) { new T.TextureLoader().load(url, function (t) { t.anisotropy = maxAniso; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; res(t); }, undefined, function () { res(null); }); }); }
    var readyP = Promise.all([loadTex(GLR.color), loadTex(GLR.night), new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = GLR.height; })]).then(function (a) {
      if (a[0]) TU.tColor.value = a[0];
      if (a[1]) TU.tNight.value = a[1];
      if (a[2]) {
        var im = a[2], c = D.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        var x = c.getContext('2d'); x.drawImage(im, 0, 0);
        var px = x.getImageData(0, 0, c.width, c.height).data; hmW = c.width; hmH = c.height;
        var trueU = (GLR.peakM || 3000) / 1000 / KMU; EX = clamp(22 / Math.max(0.2, trueU), 5, 18); hScale = (GLR.peakM || 3000) / 1000 / KMU * EX;
        hm = new Float32Array(hmW * hmH);
        for (var i = 0; i < hm.length; i++) { var v = px[i * 4] / 255; hm[i] = v * v * hScale; }
        var ht = new T.CanvasTexture(c); ht.minFilter = T.LinearFilter; ht.generateMipmaps = false; TU.tHeight.value = ht;
        TU.uTexel.value.set(1 / hmW, 1 / hmH); TU.uHS.value = hScale;
        var pos = tgeo.attributes.position;
        for (var k = 0; k < pos.count; k++) pos.setY(k, hAt(pos.getX(k) + HW, pos.getZ(k) + HH));
        pos.needsUpdate = true; tgeo.computeBoundingSphere();
        placeMarks();
      }
      TU.uReady.value = 1; fade = 1;
      return true;
    });
    var fade = 0;
    // ---- the markers: a badge per place standing on a short stem, a ring on the ground, a sweep at each air defence
    var marks = [], sprMat = {}, stemGeo = new T.BufferGeometry(), stemPos = new Float32Array(PLACES.length * 6), stemCol = new Float32Array(PLACES.length * 6);
    stemGeo.setAttribute('position', new T.BufferAttribute(stemPos, 3)); stemGeo.setAttribute('color', new T.BufferAttribute(stemCol, 3));
    var stems = new T.LineSegments(stemGeo, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthTest: false, depthWrite: false, blending: T.AdditiveBlending }));
    stems.renderOrder = 5; stems.frustumCulled = false; scene.add(stems);
    var ringGeo = new T.RingGeometry(0.78, 1, 48); ringGeo.rotateX(-Math.PI / 2);
    var ringMat = new T.ShaderMaterial({
      uniforms: { uTime: U.uTime }, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'attribute vec3 icol; attribute float iph; varying vec3 vC; varying float vP; void main(){ vC = icol; vP = iph; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uTime; varying vec3 vC; varying float vP; void main(){ float p = 0.55 + 0.45 * sin(uTime * 2.2 + vP * 6.283); gl_FragColor = vec4(vC * p * 0.9, 1.0); }'
    });
    var rings = new T.InstancedMesh(ringGeo, ringMat, PLACES.length);
    var icol = new Float32Array(PLACES.length * 3), iph = new Float32Array(PLACES.length);
    rings.geometry.setAttribute('icol', new T.InstancedBufferAttribute(icol, 3)); rings.geometry.setAttribute('iph', new T.InstancedBufferAttribute(iph, 1));
    rings.renderOrder = 3; rings.frustumCulled = false; scene.add(rings);
    var M4 = new T.Matrix4(), V3 = new T.Vector3(), Q = new T.Quaternion(), S3 = new T.Vector3();
    PLACES.forEach(function (p, i) {
      var key = p.k + '|' + p.team + '|' + (p.k === 'capital');
      if (!sprMat[key]) { var tx = new T.CanvasTexture(badge(p.k, p.team, p.k === 'capital')); tx.minFilter = T.LinearMipmapLinearFilter; tx.anisotropy = 2; sprMat[key] = tx; }
      var sm = new T.SpriteMaterial({ map: sprMat[key], depthTest: false, depthWrite: false, transparent: true, sizeAttenuation: false, color: 0xffffff });
      var s = new T.Sprite(sm); s.renderOrder = 10; s.center.set(0.5, 0.15); scene.add(s);
      var c = rgb(teamHex(p.o)); icol.set(c, i * 3); iph[i] = (i * 0.137) % 1;
      p.mi = i; marks.push({ p: p, s: s, i: i, hit: 0 });
    });
    var marksByPri = marks.slice().sort(function (a, b) { return b.p.pri - a.p.pri; });
    function placeMarks() {
      marks.forEach(function (m) {
        var p = m.p, y = hAt(p.ex, p.ey), lift = p.off ? 1.5 : 4 + (p.v || 2) * 0.8;
        m.base = new T.Vector3(wx(p.ex), y, wz(p.ey)); m.top = new T.Vector3(wx(p.ex), y + lift, wz(p.ey));
        m.s.position.copy(m.top);
        stemPos.set([m.base.x, m.base.y, m.base.z, m.top.x, m.top.y, m.top.z], m.i * 6);
        var c = rgb(teamHex(p.o)); stemCol.set([c[0] * 0.4, c[1] * 0.4, c[2] * 0.4, c[0], c[1], c[2]], m.i * 6);
        var r = p.off ? 0.001 : 3 + (p.v || 2) * 1.2;
        M4.compose(V3.set(m.base.x, m.base.y + 0.25, m.base.z), Q.identity(), S3.set(r, 1, r)); rings.setMatrixAt(m.i, M4);
      });
      stemGeo.attributes.position.needsUpdate = true; stemGeo.attributes.color.needsUpdate = true; rings.instanceMatrix.needsUpdate = true;
      if (sweeps) sweeps.forEach(function (s) { var p = PL[s.userData.id]; s.position.set(wx(p.ex), hAt(p.ex, p.ey) + 0.4, wz(p.ey)); });
    }
    var sweepMat = new T.ShaderMaterial({
      uniforms: { uTime: U.uTime, uC: { value: new T.Color(0x7fe3ff) } }, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float uTime; uniform vec3 uC; varying vec2 vP; void main(){ float r = length(vP); float a = atan(vP.y, vP.x); float s = fract((a / 6.2831853) + uTime * 0.25); float wedge = pow(1.0 - s, 7.0) * 0.55; float edge = smoothstep(0.93, 1.0, r) * (1.0 - smoothstep(1.0, 1.02, r)) * 0.35; float rings = (1.0 - smoothstep(0.0, 0.02, abs(fract(r * 3.0) - 0.5) - 0.48)) * 0.12; float a2 = (wedge + edge + rings) * (1.0 - smoothstep(0.98, 1.0, r)); gl_FragColor = vec4(uC * a2, 1.0); }'
    });
    var sweepGeo = new T.CircleGeometry(1, 64); sweepGeo.rotateX(-Math.PI / 2);
    var sweeps = sweepSites().map(function (id) { var m = new T.Mesh(sweepGeo, sweepMat.clone()); m.material.uniforms.uTime = U.uTime; m.material.uniforms.uC.value = new T.Color(teamHex(PL[id].o)); m.scale.set(16, 1, 16); m.userData.id = id; m.renderOrder = 2; scene.add(m); return m; });
    placeMarks();
    // ---- ribbons: the front line, range rings (a strip on the ground that glows; a dash may flow along it)
    var ribMat = function (c, op, dash, speed) {
      return new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uC: { value: new T.Color(c) }, uO: { value: op }, uD: { value: dash || 0 }, uS: { value: speed || 0 } }, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
        vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float uTime, uO, uD, uS; uniform vec3 uC; varying vec2 vU; void main(){ float e = 1.0 - abs(vU.y * 2.0 - 1.0); float a = pow(e, 1.6) * uO; if (uD > 0.0) a *= 0.35 + 0.65 * step(0.45, fract((vU.x - uTime * uS) / uD)); gl_FragColor = vec4(uC * a, 1.0); }' });
    };
    function ribbon(pts, width, lift) {
      var P = [], len = [0], i, j;
      for (i = 0; i < pts.length - 1; i++) { var a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 3)); for (j = 0; j < n; j++) P.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); }
      P.push(pts[pts.length - 1]);
      var pos = new Float32Array(P.length * 6), uv = new Float32Array(P.length * 4), idx = [], acc = 0;
      for (i = 0; i < P.length; i++) {
        var p0 = P[Math.max(0, i - 1)], p1 = P[Math.min(P.length - 1, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], L2 = Math.hypot(dx, dy) || 1, nx = -dy / L2 * width / 2, ny = dx / L2 * width / 2;
        if (i) acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
        var y = hAt(P[i][0], P[i][1]) + (lift || 0.6);
        pos.set([wx(P[i][0] + nx), y, wz(P[i][1] + ny), wx(P[i][0] - nx), y, wz(P[i][1] - ny)], i * 6); uv.set([acc, 0, acc, 1], i * 4);
        if (i) { var k = (i - 1) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx);
      return g;
    }
    var frontObj = [], rangeObj = [];
    function clearObjs(list) { list.forEach(function (o) { scene.remove(o); o.geometry.dispose(); o.material.dispose(); }); list.length = 0; }
    function setFront(pts, lobes) {
      frontNow = pts ? { pts: pts, lobes: lobes } : null; drawOvl();
      clearObjs(frontObj);
      if (!pts || pts.length < 2) return;
      var p2 = pts.map(function (q) { return [q[0], q[1]]; });
      var glow = new T.Mesh(ribbon(p2, 10, 0.8), ribMat(0xff3b2a, 0.32)); glow.renderOrder = 4;
      var core = new T.Mesh(ribbon(p2, 2.6, 0.9), ribMat(0xff6a50, 1.0, 16, 9)); core.renderOrder = 4;
      [glow, core].forEach(function (o) { o.frustumCulled = false; scene.add(o); frontObj.push(o); });
    }
    // ---- the particles: one cloud that glows (heads, trails, flashes, sparks) and one of smoke
    function dotTex(soft) { var c = D.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); if (soft) { g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)'); } else { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,0.75)'); g.addColorStop(0.55, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); } x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c); }
    function cloud(cap, additive) {
      var g = new T.BufferGeometry(), pos = new Float32Array(cap * 3), col = new Float32Array(cap * 3), sz = new Float32Array(cap), al = new Float32Array(cap);
      g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('pcol', new T.BufferAttribute(col, 3).setUsage(T.DynamicDrawUsage));
      g.setAttribute('psz', new T.BufferAttribute(sz, 1).setUsage(T.DynamicDrawUsage)); g.setAttribute('pal', new T.BufferAttribute(al, 1).setUsage(T.DynamicDrawUsage));
      var m = new T.ShaderMaterial({ uniforms: { tex: { value: dotTex(!additive) }, uScale: { value: 300 }, uMax: { value: 160 } }, transparent: true, depthTest: false, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
        vertexShader: 'attribute vec3 pcol; attribute float psz, pal; uniform float uScale, uMax; varying vec3 vC; varying float vA; void main(){ vC = pcol; vA = pal; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(psz * uScale / -mv.z, 1.5, uMax); gl_Position = projectionMatrix * mv; }',
        fragmentShader: additive ? 'uniform sampler2D tex; varying vec3 vC; varying float vA; void main(){ float t = texture2D(tex, gl_PointCoord).a; gl_FragColor = vec4(vC * t * vA, 1.0); }'
          : 'uniform sampler2D tex; varying vec3 vC; varying float vA; void main(){ float t = texture2D(tex, gl_PointCoord).a * vA; gl_FragColor = vec4(vC, t); }' });
      var p = new T.Points(g, m); p.frustumCulled = false; p.renderOrder = additive ? 20 : 15; scene.add(p);
      return { cap: cap, g: g, pos: pos, col: col, sz: sz, al: al, n: 0, m: m, live: [] };
    }
    var GLOW = cloud(narrow() ? 1800 : 3200, true), SMOKE = cloud(narrow() ? 300 : 520, false);
    function puff(C, x, y, z, o) { if (C.live.length >= C.cap * 0.85) return; C.live.push({ x: x, y: y, z: z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, g: o.g || 0, t: 0, life: o.life || 1, s0: o.s0 || 2, s1: o.s1 == null ? o.s0 || 2 : o.s1, c: o.c || [1, 1, 1], a0: o.a == null ? 1 : o.a, drag: o.drag || 0 }); }
    function emit(C, x, y, z, s, c, a) { if (C.n >= C.cap) return; var i = C.n++; C.pos[i * 3] = x; C.pos[i * 3 + 1] = y; C.pos[i * 3 + 2] = z; C.col[i * 3] = c[0]; C.col[i * 3 + 1] = c[1]; C.col[i * 3 + 2] = c[2]; C.sz[i] = s; C.al[i] = a; }
    function stepCloud(C, dt) {
      var keep = [];
      for (var i = 0; i < C.live.length; i++) {
        var q = C.live[i]; q.t += dt; if (q.t >= q.life) continue;
        var f = q.t / q.life; q.vy -= q.g * dt; var dr = Math.max(0, 1 - q.drag * dt); q.vx *= dr; q.vy *= dr; q.vz *= dr; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
        emit(C, q.x, q.y, q.z, q.s0 + (q.s1 - q.s0) * f, q.c, q.a0 * (1 - f) * (f < 0.08 ? f / 0.08 : 1)); keep.push(q);
      }
      C.live = keep;
    }
    function flushCloud(C) { var g = C.g; g.setDrawRange(0, C.n); ['position', 'pcol', 'psz', 'pal'].forEach(function (k) { g.attributes[k].needsUpdate = true; }); }
    // ---- shockwaves: a pool of flat rings that grow and fade
    var waveGeo = new T.RingGeometry(0.86, 1, 64); waveGeo.rotateX(-Math.PI / 2);
    var waves = [];
    for (var wi = 0; wi < 26; wi++) { var wm = new T.Mesh(waveGeo, new T.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending })); wm.visible = false; wm.renderOrder = 6; scene.add(wm); waves.push({ m: wm, t: 1, life: 1, r: 1 }); }
    function wave(x, y, z, r, c) { var w = null; for (var i = 0; i < waves.length; i++) if (waves[i].t >= waves[i].life) { w = waves[i]; break; } if (!w) return; w.t = 0; w.life = 1.1; w.r = r; w.m.position.set(x, y + 0.3, z); w.m.material.color.set(c || 0xffb070); w.m.visible = true; }
    // ---- what flies
    var shots = [], timers = [];
    function later(fn, ms) { var t = setTimeout(function () { timers.splice(timers.indexOf(t), 1); fn(); }, ms); timers.push(t); }
    function pos3(x, y, lift) { return new T.Vector3(wx(x), hAt(x, y) + (lift || 0), wz(y)); }
    function shot(ev, delay) {
      var a = pt(ev.from), b = pt(ev.to), team = teamOf(ev.side), c = rgb(teamHex(ev.side));
      var kind = ev.t;
      if (b && !a) { later(function () { impact(b[0], b[1], c, ev.big ? 1.6 : 1, typeof ev.to === 'string' ? ev.to : null, ev.res); }, delay + 300); return 600; }
      if (!a || !b) return 0;
      // a salvo reads as a salvo: at least three streaks for anything that flies (two for ships and columns), more for big numbers
      var n = clamp(Math.round(Math.sqrt(ev.n || 9)), kind === 'naval' || kind === 'ground' ? 2 : 3, kind === 'drone' ? 9 : 8), stop = ev.n ? (ev.stop || 0) / ev.n : 0;
      var dur = (SPEED[kind] || 2600) / Math.sqrt(S.speed) * (REDUCED ? 0.7 : 1);
      var L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (var i = 0; i < n; i++) {
        var jx = (Math.random() - 0.5) * 14, jy = (Math.random() - 0.5) * 14;
        var dead = Math.random() < stop;
        var s = { k: kind, team: team, a: [a[0] + jx * 0.3, a[1] + jy * 0.3], b: [b[0] + jx, b[1] + jy], t0: performance.now() + delay + i * 140, dur: dur * (0.9 + Math.random() * 0.25), c: c,
          dead: dead, cut: 0.6 + Math.random() * 0.28, to: typeof ev.to === 'string' ? ev.to : null, res: ev.res, big: ev.big, L: L, wob: Math.random() * 6.28, smoke: 0, icpt: null };
        s.apex = kind === 'missile' ? Math.min(140, L * 0.34) : kind === 'strike' ? Math.min(40, L * 0.1) : kind === 'drone' ? 3 : kind === 'naval' || kind === 'ground' ? 0.6 : 8;
        s.ya = hAt(s.a[0], s.a[1]) + 2; s.yb = hAt(s.b[0], s.b[1]) + 0.5;
        if (dead) { var dfd = defenderOf(s.to, team === 'blue' ? 'red' : 'blue'); s.icFrom = dfd ? [dfd.ex, dfd.ey] : [s.b[0] + (Math.random() - 0.5) * 30, s.b[1] + (Math.random() - 0.5) * 30]; }
        shots.push(s);
      }
      return dur + n * 140;
    }
    function at(s, u, out) {
      var x = s.a[0] + (s.b[0] - s.a[0]) * u, y = s.a[1] + (s.b[1] - s.a[1]) * u, base = s.ya + (s.yb - s.ya) * u, h;
      if (s.k === 'naval' || s.k === 'ground') h = Math.max(hAt(x, y), 0) + 0.6;
      else if (s.k === 'drone') { var px = -(s.b[1] - s.a[1]) / (s.L || 1), py = (s.b[0] - s.a[0]) / (s.L || 1), wv = Math.sin(u * 18 + s.wob) * 1.2; x += px * wv; y += py * wv; h = Math.max(hAt(x, y) + 2.5, base + s.apex * 4 * u * (1 - u)); }
      else h = Math.max(hAt(x, y) + 1, base + s.apex * 4 * u * (1 - u));
      out[0] = wx(x); out[1] = h; out[2] = wz(y); return out;
    }
    var tmp = [0, 0, 0], tmp2 = [0, 0, 0];
    function ease(s, x) { return s.k === 'missile' ? x * x * (3 - 2 * x) * 0.4 + x * 0.6 : x; }
    function flyShots(now) {
      var keep = [];
      for (var i = 0; i < shots.length; i++) {
        var s = shots[i], x = (now - s.t0) / s.dur;
        if (x < 0) { keep.push(s); continue; }
        var end = s.dead ? s.cut : 1;
        if (s.dead && !s.icpt && x > s.cut - 0.3) {      // the interceptor rises to meet it where it will be
          at(s, ease(s, s.cut), tmp2);
          s.icpt = { a: pos3(s.icFrom[0], s.icFrom[1], 1), b: new T.Vector3(tmp2[0], tmp2[1], tmp2[2]), t0: now, dur: Math.max(200, (s.cut - x) * s.dur) };
        }
        if (s.icpt) {
          var ic = s.icpt, f = clamp((now - ic.t0) / ic.dur, 0, 1), ix = ic.a.x + (ic.b.x - ic.a.x) * f, iz = ic.a.z + (ic.b.z - ic.a.z) * f, iy = ic.a.y + (ic.b.y - ic.a.y) * Math.pow(f, 0.7) + Math.sin(f * Math.PI) * 6;
          emit(GLOW, ix, iy, iz, 4.2 * homeD / 1000, [0.75, 0.95, 1], 1); emit(GLOW, ix, iy, iz, 10 * homeD / 1000, [0.4, 0.8, 1], 0.45);
          for (var q = 1; q < 20; q++) { var f2 = Math.max(0, f - q * 0.018), jx = ic.a.x + (ic.b.x - ic.a.x) * f2, jz = ic.a.z + (ic.b.z - ic.a.z) * f2, jy = ic.a.y + (ic.b.y - ic.a.y) * Math.pow(f2, 0.7) + Math.sin(f2 * Math.PI) * 6; emit(GLOW, jx, jy, jz, 3.2 * homeD / 1000 * (1 - q / 20), [0.5, 0.88, 1], 0.85 * (1 - q / 20)); }
        }
        if (x >= end) {
          if (s.dead) { at(s, ease(s, s.cut), tmp); burst(tmp[0], tmp[1], tmp[2], [0.75, 0.92, 1], 0.7); }
          else { impact(s.b[0], s.b[1], s.c, s.big ? 1.4 : 1, s.to, s.res); }
          continue;
        }
        var u = ease(s, x), U0 = homeD / 1000;      // sizes grow with the theatre's home distance, so a head reads the same on every board
        at(s, u, tmp);
        var hs = (s.k === 'missile' ? 4.6 : s.k === 'strike' ? 3.8 : s.k === 'drone' ? 3 : 3.4) * U0;
        emit(GLOW, tmp[0], tmp[1], tmp[2], hs * 3.4, s.c, 0.5);
        emit(GLOW, tmp[0], tmp[1], tmp[2], hs * 1.3, [1, 0.97, 0.88], 1);
        // the hot trail behind the head: dense enough to read as a line, thinning and fading
        var tail = s.k === 'drone' ? 0.07 : s.k === 'naval' || s.k === 'ground' ? 0.06 : 0.2, Lt = Math.max(8, s.L * tail * (s.k === 'missile' ? 1.5 : 1));
        var nt = clamp(Math.round(Lt / (1.1 * U0)), 10, 44);
        for (var k = 1; k <= nt; k++) { var uu = Math.max(0, u - tail * k / nt); at(s, uu, tmp2); var f3 = k / nt; emit(GLOW, tmp2[0], tmp2[1], tmp2[2], hs * (1 - f3 * 0.75), f3 < 0.15 ? [1, 0.92, 0.75] : s.c, 0.95 * (1 - f3)); }
        // and the path it already flew, faint: the arc stays readable as it rises off the ground
        if (s.k !== 'drone') { var nc = clamp(Math.round(s.L * Math.max(0, u - tail) / (7 * U0)), 0, 40); for (var q2 = 0; q2 < nc; q2++) { at(s, (u - tail) * q2 / Math.max(1, nc), tmp2); emit(GLOW, tmp2[0], tmp2[1], tmp2[2], 1.5 * U0, s.c, 0.22); } }
        if (s.k === 'missile' && now - s.smoke > 70) { s.smoke = now; puff(SMOKE, tmp[0], tmp[1], tmp[2], { life: 1.6, s0: 1.6, s1: 4.5, c: [0.62, 0.62, 0.66], a: 0.32, vy: 0.4 }); }
        keep.push(s);
      }
      shots = keep;
    }
    function burst(x, y, z, c, k) {
      k *= homeD / 1000;
      puff(GLOW, x, y, z, { life: 0.35, s0: 10 * k, s1: 22 * k, c: [1, 1, 1], a: 1 });
      puff(GLOW, x, y, z, { life: 0.6, s0: 6 * k, s1: 14 * k, c: c, a: 0.9 });
      for (var i = 0; i < 10; i++) { var a = Math.random() * 6.28, sp = 8 + Math.random() * 14; puff(GLOW, x, y, z, { life: 0.5 + Math.random() * 0.4, s0: 1.4, s1: 0.4, c: c, a: 1, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: (Math.random() - 0.3) * sp, g: 18, drag: 1.5 }); }
    }
    function impact(x, y, c, k, id, res) {
      var p = pos3(x, y, 0.6), k0 = k; k *= Math.max(0.8, homeD / 1000);
      puff(GLOW, p.x, p.y + 1, p.z, { life: 0.45, s0: 16 * k, s1: 34 * k, c: [1, 0.95, 0.8], a: 1 });
      puff(GLOW, p.x, p.y + 1, p.z, { life: 1.2, s0: 10 * k, s1: 20 * k, c: [1, 0.45, 0.12], a: 0.85 });
      for (var i = 0; i < 16 * k; i++) { var a = Math.random() * 6.28, sp = 6 + Math.random() * 16; puff(GLOW, p.x, p.y + 1, p.z, { life: 0.7 + Math.random() * 0.6, s0: 1.5, s1: 0.3, c: [1, 0.7, 0.3], a: 1, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 10 + Math.random() * 18, g: 30, drag: 0.8 }); }
      for (var j = 0; j < 7 * k; j++) puff(SMOKE, p.x + (Math.random() - 0.5) * 3, p.y + 1, p.z + (Math.random() - 0.5) * 3, { life: 2.2 + Math.random() * 1.5, s0: 4, s1: 13, c: [0.09, 0.08, 0.08], a: 0.6, vy: 3 + Math.random() * 3, vx: (Math.random() - 0.5) * 2, vz: (Math.random() - 0.5) * 2, drag: 0.4 });
      wave(p.x, p.y, p.z, 14 * k, 0xffa560);
      addScorch(x, y, 5 * k0 + Math.random() * 2);
      if (id) hit(id, res, false);
    }
    function hit(id, res, instant) {
      var m = marks.filter(function (q) { return q.p.id === id; })[0]; if (!m) return;
      if (res === 'hit' || res === 'partial') { m.hit = performance.now(); m.s.material.color.setRGB(1, 0.62, 0.5); if (instant) addScorch(m.p.ex, m.p.ey, 6); }
    }
    // ---- the camera: a target on the ground, a distance, a heading and a tilt; it eases toward where it is asked to go
    var cam = { x: 0, z: 0, d: 900, yaw: 0, pitch: 0.92 }, goal = { x: 0, z: 0, d: 900, yaw: 0, pitch: 0.92 }, ins = { l: 0, r: 0, t: 0, b: 0 }, vw = 1, vh = 1, dMin = 60, dMax = 6000, homeD = 900;
    function camApply(c) {
      var pitch = c.pitch - clamp((homeD - c.d) / homeD, 0, 0.75) * 0.42;      // closer in, the camera leans toward the horizon, like a strategy game's
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      camera.position.set(c.x - Math.sin(c.yaw) * cp * c.d, sp * c.d, c.z + Math.cos(c.yaw) * cp * c.d);
      camera.lookAt(c.x, 0, c.z); camera.updateMatrixWorld();
    }
    function clampGoal() {
      goal.d = clamp(goal.d, dMin, dMax); goal.pitch = clamp(goal.pitch, 0.6, 1.36);
      goal.x = clamp(goal.x, -HW - 20, HW + 20); goal.z = clamp(goal.z, -HH - 20, HH + 20);
    }
    var ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0), hitV = new T.Vector3();
    function ground(cx, cy, c) {      // the point on the sea-level plane under a screen point, for the camera c (default: now)
      var r = glc.getBoundingClientRect();
      if (c) camApply(c);
      ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var g = ray.ray.intersectPlane(plane, hitV);
      if (c) camApply(cam);
      return g ? [g.x, g.z] : null;
    }
    function fitD(pts, minSpan) {      // the distance at which every point fits inside the free part of the screen
      var lo = dMin, hi = dMax * 1.2, c = Object.assign({}, goal), xs = pts.map(function (p) { return wx(p[0]); }), zs = pts.map(function (p) { return wz(p[1]); });
      var cx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2, cz = (Math.min.apply(null, zs) + Math.max.apply(null, zs)) / 2;
      var span = Math.max(minSpan || 0, Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, zs) - Math.min.apply(null, zs));
      c.x = cx; c.z = cz;
      var V4 = new T.Vector3();
      var fx0 = -1 + 2 * ins.l / vw, fx1 = 1 - 2 * ins.r / vw, fy0 = -1 + 2 * ins.b / vh, fy1 = 1 - 2 * ins.t / vh;
      for (var it = 0; it < 18; it++) {
        var mid = (lo + hi) / 2; c.d = mid; camApply(c); var ok = true;
        var box2 = [[cx - span / 2, cz - span / 2], [cx + span / 2, cz - span / 2], [cx - span / 2, cz + span / 2], [cx + span / 2, cz + span / 2]];
        if (pts.length > 1 || minSpan) box2 = pts.map(function (p) { return [wx(p[0]), wz(p[1])]; }).concat(minSpan ? [[cx - minSpan / 2, cz - minSpan / 2], [cx + minSpan / 2, cz + minSpan / 2]] : []);
        for (var k = 0; k < box2.length; k++) { V4.set(box2[k][0], 0, box2[k][1]).project(camera); if (V4.x < fx0 + 0.06 || V4.x > fx1 - 0.06 || V4.y < fy0 + 0.08 || V4.y > fy1 - 0.08) { ok = false; break; } }
        if (ok) hi = mid; else lo = mid;
      }
      camApply(cam);
      return { x: cx, z: cz, d: hi };
    }
    function viewOffset() {      // the middle of the free part of the screen is where the camera looks
      var ox = (ins.r - ins.l) / 2, oy = (ins.b - ins.t) / 2;
      camera.setViewOffset(vw, vh, ox, oy, vw, vh); camera.updateProjectionMatrix();
    }
    function resize(i) {
      if (i) ins = i;
      var r = stage.getBoundingClientRect(); vw = Math.max(1, r.width); vh = Math.max(1, r.height);
      renderer.setSize(vw, vh, false);
      camera.aspect = vw / vh; viewOffset();
      dMax = 6000; var fa = fitD([[0, 0], [G.w, G.h]], 0), f = fitD(HOME, 0); homeD = f.d; dMax = fa.d * 1.15; dMin = Math.max(40, fa.d * 0.06); TU.uFog.value.set(homeD * 1.1, homeD * 3);
      if (!started) { goal.x = cam.x = f.x; goal.z = cam.z = f.z; goal.d = cam.d = f.d * 1.12; started = 1; }
      clampGoal();
      var p11 = camera.projectionMatrix.elements[5];
      GLOW.m.uniforms.uScale.value = SMOKE.m.uniforms.uScale.value = vh * p11 / 2 * renderer.getPixelRatio();
      GLOW.m.uniforms.uMax.value = SMOKE.m.uniforms.uMax.value = Math.min(renderer.capabilities.maxPointSize || 64, 220);
      sprScale();
      dirty = 1;
    }
    var started = 0, dirty = 1;
    // A marker that would sit on a more important one shrinks to a pip (a strategy map's stack): the most important place
    // keeps its badge, a tap or a zoom brings the rest back. The chosen, the hit and the briefed are never shrunk.
    var pipT = 0, PV = new T.Vector3();
    function sprScale() {
      var p11 = camera.projectionMatrix.elements[5], z = Math.pow(clamp(homeD / cam.d, 0.7, 6), 0.42), now = performance.now();
      if (now - pipT > 160) {
        pipT = now; var kept = [];
        marksByPri.forEach(function (m) {
          if (!m.top) return;
          PV.copy(m.top).project(camera); var x = (PV.x + 1) / 2 * vw, y = (1 - PV.y) / 2 * vh, r = markPx(m.p) * z * 0.42;
          var keep = S.sel === m.p.id || m.pulse || m.hit || S.hov === m.p.id;
          if (!keep) for (var i = 0; i < kept.length; i++) { var k = kept[i]; if (Math.abs(k[0] - x) < k[2] + r && Math.abs(k[1] - y) < (k[2] + r) * 0.9) { m.pip = 1; return; } }
          m.pip = 0; kept.push([x, y, r]);
        });
      }
      marks.forEach(function (m) { var px = markPx(m.p) * z * (S.sel === m.p.id ? 1.25 : 1) * (m.pip ? 0.42 : 1) * (m.pulse ? 1 + 0.12 * Math.sin(now / 180) : 1); var sc = 2 * px / (p11 * vh); m.s.scale.set(sc, sc, 1); });
    }
    function focus(pts, o) {
      o = o || {};
      if (!pts || !pts.length) return;
      var f = fitD(pts, o.tight ? 140 : 220);
      goal.x = f.x; goal.z = f.z; goal.d = clamp(f.d, homeD * (o.tight ? 0.42 : 0.5), o.wide ? dMax : homeD * (o.tight ? 0.7 : 1.05));
      if (o.instant) Object.assign(cam, goal);
      clampGoal();
    }
    function home(instant) { var f = fitD(HOME, 0); goal.x = f.x; goal.z = f.z; goal.d = f.d; goal.yaw = 0; goal.pitch = 0.92; clampGoal(); if (instant) Object.assign(cam, goal); }
    // ---- the hands: drag to move, pinch or wheel to zoom, two fingers or the right button to turn, a tap to open a place
    var ptrs = {}, pdown = null, moved = 0, last = null, gesture = null;
    function screenOf(v3) { var v = v3.clone().project(camera); return [(v.x + 1) / 2 * vw, (1 - v.y) / 2 * vh, v.z < 1]; }
    function pickAt(cx, cy) {
      var r = glc.getBoundingClientRect(), best = null, bd = 1e9;
      marks.forEach(function (m) { if (!m.top) return; var q = screenOf(m.top); var px = markPx(m.p); var dx = q[0] - (cx - r.left), dy = q[1] - px * 0.35 - (cy - r.top), d = Math.hypot(dx, dy); if (q[2] && d < Math.max(24, px * 0.65) && d < bd) { bd = d; best = m.p; } });
      return best;
    }
    stage.addEventListener('pointerdown', function (ev) {
      if (ev.target.closest('button, a, .wg-panel, .wg-top, .wg-orb, .wg-tl, .wg-nav, .wg-mini, .wg-bf')) return;
      touched(); ptrs[ev.pointerId] = [ev.clientX, ev.clientY]; moved = 0;
      try { stage.setPointerCapture(ev.pointerId); } catch (x) {}
      var ids = Object.keys(ptrs);
      if (ids.length === 1) { pdown = [ev.clientX, ev.clientY]; last = [ev.clientX, ev.clientY]; gesture = (ev.button === 2 || ev.ctrlKey || ev.shiftKey) ? 'turn' : 'pan'; last.g = ground(ev.clientX, ev.clientY); }
      else if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; gesture = 'two'; last = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), ang: Math.atan2(b[1] - a[1], b[0] - a[0]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; moved = 99; }
    });
    stage.addEventListener('contextmenu', function (ev) { if (!ev.target.closest('.wg-panel, .wg-top')) ev.preventDefault(); });
    stage.addEventListener('pointermove', function (ev) {
      if (!ptrs[ev.pointerId]) { hover(ev); return; }
      ptrs[ev.pointerId] = [ev.clientX, ev.clientY]; touched();
      var ids = Object.keys(ptrs);
      if (gesture === 'two' && ids.length >= 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if (last.d) goal.d = clamp(goal.d * last.d / Math.max(1, d), dMin, dMax);
        var da = ang - last.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; goal.yaw -= da;
        goal.pitch = clamp(goal.pitch + (m[1] - last.m[1]) * 0.004 * (Math.abs(da) < 0.02 && Math.abs(d - last.d) < 4 ? 1 : 0), 0.6, 1.36);
        var g0 = ground(last.m[0], last.m[1]), g1 = ground(m[0], m[1]); if (g0 && g1) { goal.x -= g1[0] - g0[0]; goal.z -= g1[1] - g0[1]; }
        last = { d: d, ang: ang, m: m }; clampGoal(); Object.assign(cam, { x: goal.x, z: goal.z }); return;
      }
      var dx = ev.clientX - last[0], dy = ev.clientY - last[1]; moved += Math.abs(dx) + Math.abs(dy);
      if (moved < 5) return;
      if (gesture === 'turn') { goal.yaw += dx * 0.006; goal.pitch = clamp(goal.pitch + dy * 0.004, 0.6, 1.36); cam.yaw = goal.yaw; cam.pitch = goal.pitch; }
      else if (last.g) { var g = ground(ev.clientX, ev.clientY); if (g) { goal.x -= g[0] - last.g[0]; goal.z -= g[1] - last.g[1]; clampGoal(); cam.x = goal.x; cam.z = goal.z; camApply(cam); } }
      last = [ev.clientX, ev.clientY]; last.g = ground(ev.clientX, ev.clientY);
      dirty = 1;
    });
    function up(ev) {
      if (!ptrs[ev.pointerId]) return;
      delete ptrs[ev.pointerId];
      if (Object.keys(ptrs).length === 0) {
        if (moved < 6 && pdown && ev.type === 'pointerup') { var p = pickAt(ev.clientX, ev.clientY); if (p) placeSheet(p); else if (S.sel || !sheet.hidden) { select(null); if (!sheet.hidden) closeSheet(); } }
        gesture = null; pdown = null;
      } else if (gesture === 'two') { var id = Object.keys(ptrs)[0]; last = [ptrs[id][0], ptrs[id][1]]; last.g = ground(last[0], last[1]); gesture = 'pan'; }
    }
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', function (ev) {
      if (ev.target.closest('.wg-panel, .wg-orb, .wg-tl, .wg-bf')) return;
      if (ev.deltaY > 0 && goal.d >= dMax * 0.99) return;      // fully out: the wheel scrolls the page again
      ev.preventDefault(); touched();
      var f = Math.pow(1.0015, ev.deltaY * (ev.deltaMode === 1 ? 30 : 1));
      var g0 = ground(ev.clientX, ev.clientY), nd = clamp(goal.d * f, dMin, dMax), c2 = Object.assign({}, cam, { d: nd, x: goal.x, z: goal.z });
      var g1 = ground(ev.clientX, ev.clientY, c2);
      goal.d = nd; if (g0 && g1) { goal.x -= g1[0] - g0[0]; goal.z -= g1[1] - g0[1]; }
      clampGoal();
    }, { passive: false });
    stage.addEventListener('dblclick', function (ev) { if (ev.target.closest('.wg-panel, .wg-top, .wg-orb, .wg-tl, .wg-nav')) return; var g = ground(ev.clientX, ev.clientY); if (g) { touched(); goal.x = g[0]; goal.z = g[1]; goal.d = clamp(goal.d / 1.8, dMin, dMax); clampGoal(); } });
    var hovered = null;
    function hover(ev) {
      if (ev.pointerType !== 'mouse') return;
      var p = pickAt(ev.clientX, ev.clientY);
      if (p !== hovered) { hovered = p; stage.style.cursor = p ? 'pointer' : ''; if (S.hov !== (p && p.id)) { S.hov = p ? p.id : null; dirty = 1; } }
    }
    stage.tabIndex = 0;
    var cycle = -1;
    stage.addEventListener('keydown', function (ev) {
      if (ev.target !== stage) return;
      var k = ev.key, step = goal.d * 0.08, sy = Math.sin(goal.yaw), cy = Math.cos(goal.yaw), mv = function (f, s) { goal.x += (sy * f + cy * s) * step; goal.z += (-cy * f + sy * s) * step; };
      if (k === 'ArrowUp' || k === 'w') mv(1, 0); else if (k === 'ArrowDown' || k === 's') mv(-1, 0); else if (k === 'ArrowLeft' || k === 'a') mv(0, -1); else if (k === 'ArrowRight' || k === 'd') mv(0, 1);
      else if (k === '+' || k === '=') goal.d /= 1.3; else if (k === '-' || k === '_') goal.d *= 1.3; else if (k === 'q') goal.yaw -= 0.3; else if (k === 'e') goal.yaw += 0.3;
      else if (k === '0' || k === 'r') home(); else if (k === ' ') { if (playing) pause(); else resume(); }
      else if (k === ']' || k === '[') { var vis = PLACES.filter(function (p) { return !p.off; }); cycle = (cycle + (k === ']' ? 1 : -1) + vis.length) % vis.length; select(vis[cycle].id); focus([[vis[cycle].ex, vis[cycle].ey]], { tight: true }); }
      else if (k === 'Enter' && S.sel) { placeSheet(PL[S.sel]); }
      else return;
      ev.preventDefault(); touched(); clampGoal();
    });
    // ---- selection and the briefing's highlights
    function select(id) {
      S.sel = id; clearObjs(rangeObj);
      if (id) rangesOf(id).forEach(function (r, i) { var m = new T.Mesh(ribbon(r, 1.8, 1.2), ribMat(teamHex(PL[id].o), 0.9, 12, 5)); m.renderOrder = 4; m.frustumCulled = false; scene.add(m); rangeObj.push(m); });
      sprScale(); dirty = 1;
    }
    function pulse(ids) { S.pulse = ids || []; marks.forEach(function (m) { m.pulse = S.pulse.indexOf(m.p.id) >= 0; }); }
    // ---- the frame
    var raf = 0, visible = true, lastT = performance.now(), frames = 0, fpsT = performance.now(), fps = 60, lowFor = 0;
    function frame(now) {
      raf = 0;
      if (!visible || D.hidden) return;
      var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      U.uTime.value = (now - clock0) / 1000;
      // the idle drift: a slow sway, like a strategy game's menu, until the reader touches the board
      if (!REDUCED && !TL && !userBusy() && !bfEl && lastTouch === 0) goal.yaw = Math.sin(U.uTime.value * 0.05) * 0.12;
      var k = 1 - Math.exp(-dt * 5.5);
      ['x', 'z', 'd', 'yaw', 'pitch'].forEach(function (q) { cam[q] += (goal[q] - cam[q]) * k; });
      camApply(cam);
      TU.uCam.value.copy(camera.position);
      marks.forEach(function (m) { if (m.hit && now - m.hit > 9000) { m.hit = 0; m.s.material.color.setRGB(1, 1, 1); } if (m.hit && Math.random() < dt * 3) puff(SMOKE, m.base.x + (Math.random() - 0.5) * 2, m.base.y + 1.5, m.base.z + (Math.random() - 0.5) * 2, { life: 3, s0: 3, s1: 10, c: [0.12, 0.11, 0.1], a: 0.45, vy: 2.5, vx: 0.8, drag: 0.2 }); });
      waves.forEach(function (w) { if (w.t >= w.life) { w.m.visible = false; return; } w.t += dt; var f = w.t / w.life; var r = w.r * (0.15 + 0.85 * Math.sqrt(f)); w.m.scale.set(r, 1, r); w.m.material.opacity = (1 - f) * 0.9; });
      GLOW.n = 0; SMOKE.n = 0;
      flyShots(now);
      stepCloud(GLOW, dt); stepCloud(SMOKE, dt);
      flushCloud(GLOW); flushCloud(SMOKE);
      if (ovlDirty && now - (drawOvl.t || 0) > 220) { ovlDirty = 0; drawOvl.t = now; drawOvl(); }
      sprScale();
      renderer.render(scene, camera);
      if (tagsT++ % 2 === 0) placeTags(function (p) { var m = marks[p.mi]; if (!m || !m.top) return null; var q = screenOf(m.top); return [q[0], q[1], q[2], markPx(p) * (m.pip ? 0.42 : 1), m.pip && S.sel !== p.id]; }, homeD / cam.d);
      if (tagsT % 10 === 0) miniDraw();
      frames++;
      if (now - fpsT > 1000) { fps = frames * 1000 / (now - fpsT); frames = 0; fpsT = now; if (fps < 32 && renderer.getPixelRatio() > 1) { if (++lowFor >= 2) { renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.25)); resize(); lowFor = 0; } } else lowFor = 0; }
      raf = W.requestAnimationFrame(frame);
    }
    var tagsT = 0;
    function kick() { if (!raf && visible && !D.hidden) { lastT = performance.now(); raf = W.requestAnimationFrame(frame); } }
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(stage);
    D.addEventListener('visibilitychange', function () { if (!D.hidden) kick(); });
    glc.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); visible = false; switchToFlat(); });
    resize(); home(true); cam.d = goal.d * 1.25; cam.pitch = 1.2;
    kick();
    return {
      kind: '3d', ready: readyP,
      reset: function () { shots = []; timers.forEach(clearTimeout); timers = []; GLOW.live = []; SMOKE.live = []; scorch = []; drawOvl(); marks.forEach(function (m) { m.hit = 0; m.s.material.color.setRGB(1, 1, 1); }); },
      shot: shot, hit: hit, front: setFront, focus: focus, home: home, select: select, pulse: pulse, resize: resize,
      zoomBy: function (f) { goal.d = clamp(goal.d * f, dMin, dMax); }, rotateBy: function (a) { goal.yaw += a; },
      moveTo: function (x, y) { goal.x = wx(x); goal.z = wz(y); clampGoal(); },
      groundRect: function () { var r = glc.getBoundingClientRect(), q = [[r.left + ins.l, r.top + ins.t], [r.right - ins.r, r.top + ins.t], [r.right - ins.r, r.bottom - ins.b], [r.left + ins.l, r.bottom - ins.b]].map(function (c) { var g = ground(c[0], c[1]); return g ? [g[0] + HW, g[1] + HH] : null; }); return q.every(Boolean) ? q : null; },
      fps: function () { return fps; }, cam: cam, renderer: renderer,
      dbg: function () { return { shots: shots.length, glow: GLOW.n, live: GLOW.live.length, smoke: SMOKE.n, scale: GLOW.m.uniforms.uScale.value, max: GLOW.m.uniforms.uMax.value, d: cam.d }; }
    };
  }

  // ---------------------------------------------------------------- the flat view (no WebGL): the same board on the poster
  function makeFlat() {
    var cv = glc, ctx = cv.getContext('2d');
    if (!ctx) return null;
    var dpr = Math.min(2, W.devicePixelRatio || 1), vw = 1, vh = 1, ins = { l: 0, r: 0, t: 0, b: 0 };
    var view = { x: G.w / 2, y: G.h / 2, s: 1 }, goalV = { x: G.w / 2, y: G.h / 2, s: 1 }, sMin = 1, FX = [], scorch = [], front = null, raf = 0;
    function fitS() { return Math.min((vw - ins.l - ins.r) / G.w, (vh - ins.t - ins.b) / G.h) * 0.96; }
    function resize(i) { if (i) ins = i; var r = stage.getBoundingClientRect(); vw = r.width; vh = r.height; cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); sMin = fitS(); if (!resize.done) { home(true); resize.done = 1; } kick(); }
    function scr(x, y) { return [(x - view.x) * view.s + ins.l + (vw - ins.l - ins.r) / 2, (y - view.y) * view.s + ins.t + (vh - ins.t - ins.b) / 2]; }
    function inv(cx, cy) { var r = cv.getBoundingClientRect(); return [(cx - r.left - ins.l - (vw - ins.l - ins.r) / 2) / view.s + view.x, (cy - r.top - ins.t - (vh - ins.t - ins.b) / 2) / view.s + view.y]; }
    function home(instant) { goalV.x = G.w / 2; goalV.y = G.h / 2; goalV.s = sMin; if (instant) Object.assign(view, goalV); kick(); }
    function focus(pts, o) { if (!pts.length) return; var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; }); var span = Math.max(o && o.tight ? 140 : 220, Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys)); goalV.x = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2; goalV.y = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2; goalV.s = clamp(Math.min((vw - ins.l - ins.r) / span, (vh - ins.t - ins.b) / span) * 0.8, sMin, sMin * 6); kick(); }
    function shot(ev, delay) {
      var a = pt(ev.from), b = pt(ev.to), c = teamHex(ev.side), t0 = performance.now() + delay;
      if (b && !a) { FX.push({ k: 'boom', p: b, t0: t0 + 300, dur: 1000, c: c, id: typeof ev.to === 'string' ? ev.to : null, res: ev.res }); kick(); return 1300; }
      if (!a || !b) return 0;
      var n = Math.min(8, Math.max(1, Math.round(Math.sqrt(ev.n || 1)))), stop = ev.n ? (ev.stop || 0) / ev.n : 0, dur = (SPEED[ev.t] || 2600) * (REDUCED ? 0.7 : 1);
      for (var i = 0; i < n; i++) { var j = [(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14]; FX.push({ k: 'shot', t: ev.t, a: a, b: [b[0] + j[0], b[1] + j[1]], t0: t0 + i * 120, dur: dur * (0.9 + Math.random() * 0.2), c: c, dead: Math.random() < stop, cut: 0.62 + Math.random() * 0.25, id: typeof ev.to === 'string' ? ev.to : null, res: ev.res }); }
      kick(); return dur + n * 120;
    }
    function arc(f, u) { var L = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]), h = f.t === 'missile' ? L * 0.3 : f.t === 'strike' ? L * 0.1 : f.t === 'naval' || f.t === 'ground' ? 0 : L * 0.05; return [f.a[0] + (f.b[0] - f.a[0]) * u, f.a[1] + (f.b[1] - f.a[1]) * u - h * 4 * u * (1 - u)]; }
    var hits = {};
    function frame(now) {
      raf = 0;
      var k = 0.16; view.x += (goalV.x - view.x) * k; view.y += (goalV.y - view.y) * k; view.s += (goalV.s - view.s) * k;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, vw, vh);
      var o = scr(0, 0);
      if (posterEl.complete && posterEl.naturalWidth) ctx.drawImage(posterEl, o[0], o[1], G.w * view.s, G.h * view.s);
      ctx.save(); ctx.translate(o[0], o[1]); ctx.scale(view.s, view.s);
      if (front && UA) {
        ctx.save(); ctx.clip(new Path2D(UA.d)); ctx.fillStyle = 'rgba(255,50,36,0.32)'; ctx.fill(new Path2D(frontPath(front))); ctx.restore();
        ctx.strokeStyle = '#ff5a48'; ctx.lineWidth = 2.4 / view.s; ctx.shadowColor = '#ff3b2a'; ctx.shadowBlur = 10; ctx.beginPath(); front.forEach(function (p, i) { ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); ctx.stroke(); ctx.shadowBlur = 0;
      }
      scorch.forEach(function (q) { var g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], q[2]); g.addColorStop(0, 'rgba(10,6,4,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q[0], q[1], q[2], 0, 7); ctx.fill(); });
      ctx.restore();
      var keep = [];
      ctx.globalCompositeOperation = 'lighter';
      FX.forEach(function (f) {
        var x = (now - f.t0) / f.dur; if (x < 0) { keep.push(f); return; }
        if (f.k === 'shot') {
          var end = f.dead ? f.cut : 1;
          if (x >= end) { var p = arc(f, end); FX.push({ k: 'boom', p: p, t0: now, dur: f.dead ? 500 : 1000, c: f.dead ? CYAN : f.c, small: f.dead }); if (!f.dead) { scorch.push([f.b[0], f.b[1], 6]); if (f.id && (f.res === 'hit' || f.res === 'partial')) hits[f.id] = now; } return; }
          for (var i = 0; i < 10; i++) { var u0 = Math.max(0, x - 0.18 * (i + 1) / 10), u1 = Math.max(0, x - 0.18 * i / 10), a = scr.apply(null, arc(f, u0)), b = scr.apply(null, arc(f, u1)); ctx.strokeStyle = hexA(f.c, 0.9 * (1 - i / 10)); ctx.lineWidth = 2.4 * (1 - i / 14); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
          var h = scr.apply(null, arc(f, x)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(h[0], h[1], 2.6, 0, 7); ctx.fill();
          keep.push(f);
        } else if (f.k === 'boom') {
          if (x > 1) return;
          var q = scr(f.p[0], f.p[1]), rr = (f.small ? 9 : 26) * (0.3 + x);
          var g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], rr); g.addColorStop(0, 'rgba(255,240,200,' + (1 - x) + ')'); g.addColorStop(0.4, hexA(f.c, 0.8 * (1 - x))); g.addColorStop(1, hexA(f.c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q[0], q[1], rr, 0, 7); ctx.fill();
          if (!f.small) { ctx.strokeStyle = hexA('#ffb070', 0.8 * (1 - x)); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(q[0], q[1], rr * 1.7, 0, 7); ctx.stroke(); }
          if (f.id && x < 0.05 && (f.res === 'hit' || f.res === 'partial')) hits[f.id] = now;
          keep.push(f);
        }
      });
      ctx.globalCompositeOperation = 'source-over';
      FX = keep;
      var z = Math.pow(view.s / sMin, 0.3);
      PLACES.forEach(function (p) {
        var q = scr(p.ex, p.ey), px = markPx(p) * z * (S.sel === p.id ? 1.25 : 1);
        if (q[0] < -40 || q[1] < -40 || q[0] > vw + 40 || q[1] > vh + 40) return;
        ctx.globalAlpha = 1; ctx.drawImage(badge(p.k, p.team, p.k === 'capital'), q[0] - px / 2, q[1] - px / 2, px, px);
        if (hits[p.id] && now - hits[p.id] < 9000) { ctx.strokeStyle = 'rgba(255,120,60,' + (0.5 + 0.5 * Math.sin(now / 150)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q[0], q[1], px * 0.55, 0, 7); ctx.stroke(); }
      });
      placeTags(function (p) { var q = scr(p.ex, p.ey); return [q[0], q[1], true, markPx(p) * z]; }, view.s / sMin);
      miniDraw();
      if (FX.length || Math.abs(goalV.s - view.s) > 0.001 || Math.abs(goalV.x - view.x) > 0.05 || Math.abs(goalV.y - view.y) > 0.05) raf = W.requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = W.requestAnimationFrame(frame); }
    if (posterEl && !posterEl.complete) posterEl.addEventListener('load', kick);
    var pt0 = null, ptrs = {}, mv = 0, d0 = 0;
    stage.addEventListener('pointerdown', function (ev) { if (ev.target.closest('button, a, .wg-panel, .wg-top, .wg-orb, .wg-tl, .wg-nav, .wg-mini, .wg-bf')) return; touched(); ptrs[ev.pointerId] = [ev.clientX, ev.clientY]; pt0 = [ev.clientX, ev.clientY]; mv = 0; d0 = 0; });
    stage.addEventListener('pointermove', function (ev) {
      if (!ptrs[ev.pointerId]) return; var prev = ptrs[ev.pointerId]; ptrs[ev.pointerId] = [ev.clientX, ev.clientY]; var ids = Object.keys(ptrs);
      if (ids.length >= 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d0) goalV.s = view.s = clamp(view.s * d / d0, sMin, sMin * 8); d0 = d; mv = 99; kick(); return; }
      var dx = ev.clientX - prev[0], dy = ev.clientY - prev[1]; mv += Math.abs(dx) + Math.abs(dy);
      if (mv > 5) { goalV.x = view.x -= dx / view.s; goalV.y = view.y -= dy / view.s; kick(); }
    });
    stage.addEventListener('pointerup', function (ev) {
      if (!ptrs[ev.pointerId]) return; delete ptrs[ev.pointerId];
      if (mv < 6 && pt0) { var r = cv.getBoundingClientRect(), best = null, bd = 1e9, z = Math.pow(view.s / sMin, 0.3); PLACES.forEach(function (p) { var q = scr(p.ex, p.ey), dd = Math.hypot(q[0] - (ev.clientX - r.left), q[1] - (ev.clientY - r.top)); if (dd < Math.max(22, markPx(p) * z * 0.6) && dd < bd) { bd = dd; best = p; } }); if (best) placeSheet(best); }
    });
    stage.addEventListener('wheel', function (ev) { if (ev.target.closest('.wg-panel, .wg-orb, .wg-tl, .wg-bf')) return; if (ev.deltaY > 0 && goalV.s <= sMin * 1.01) return; ev.preventDefault(); var m = inv(ev.clientX, ev.clientY), f = ev.deltaY < 0 ? 1.18 : 1 / 1.18, ns = clamp(goalV.s * f, sMin, sMin * 8); goalV.x = m[0] - (m[0] - goalV.x) * view.s / ns; goalV.y = m[1] - (m[1] - goalV.y) * view.s / ns; goalV.s = ns; kick(); }, { passive: false });
    return {
      kind: 'flat', ready: Promise.resolve(true),
      reset: function () { FX = []; scorch = []; hits = {}; kick(); }, shot: shot,
      hit: function (id, res, instant) { if (res === 'hit' || res === 'partial') { hits[id] = performance.now(); var p = PL[id]; if (p && instant) scorch.push([p.ex, p.ey, 6]); kick(); } },
      front: function (pts) { front = pts; kick(); }, focus: focus, home: home, select: function (id) { S.sel = id; kick(); }, pulse: function (ids) { S.pulse = ids || []; kick(); }, resize: resize,
      zoomBy: function (f) { goalV.s = clamp(goalV.s / f, sMin, sMin * 8); kick(); }, rotateBy: function () {}, moveTo: function (x, y) { goalV.x = x; goalV.y = y; kick(); },
      groundRect: function () { var a = inv(stage.getBoundingClientRect().left + ins.l, stage.getBoundingClientRect().top + ins.t), b = inv(stage.getBoundingClientRect().right - ins.r, stage.getBoundingClientRect().bottom - ins.b); return [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]]; },
      fps: function () { return 60; }
    };
  }
  function switchToFlat() {
    var c2 = D.createElement('canvas'); c2.className = 'wg-gl'; c2.id = 'wg-gl'; c2.setAttribute('aria-hidden', 'true');
    glc.parentNode.replaceChild(c2, glc); glc = c2;
    V = makeFlat(); tog(app, 'flat', true); tog(app, 'gl', false); layout(); if (V) V.home(true);
    var l = $('#wg-load'); if (l) l.remove();
  }
  function hasGL() { try { var c = D.createElement('canvas'); return !!(W.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (x) { return false; } }

  // ---------------------------------------------------------------- the idle board, and the start
  function idle() {
    var f = TID === 'ukraine' ? frontAt(R.today) : null;
    if (f && V) V.front(frontPts(f.line), f.lobes);
    clockSet(day(R.today), tr('Today'));
    feedSet(R.title || R.meta.h1, R.now ? [{ w: R.now.state, c: GOLD }] : []);
  }
  readUrl();
  if (!S.room.length) S.room = EX.slice(0, Math.min(5, EX.length)).map(function (x) { return x.id; });
  drawPanel(); orbDraw();
  var how = $('#wg-how-body'); if (how) how.innerHTML = howHtml();
  box.classList.add('wg-ready');
  layout();
  function boot(v) {
    V = v; layout(); idle();
    (V.ready || Promise.resolve()).then(function () { var l = $('#wg-load'); if (l) l.remove(); tog(app, 'live', true); var f = TID === 'ukraine' ? frontAt(R.today) : null; if (f) V.front(frontPts(f.line), f.lobes); });
  }
  var forceFlat = /[?&]flat=1/.test(location.search);
  if (!forceFlat && hasGL() && GLR.three) {
    import(new URL(GLR.three, location.href).href).then(function (T) {      // import() resolves against this script, not the page: make it absolute
      var v = null;
      try { v = makeGL(T); } catch (x) { if (W.console) console.warn('Conflict Simulator: WebGL failed, drawing the flat board', x); }
      if (v) { tog(app, 'gl', true); boot(v); } else { switchToFlat(); idle(); }
    }, function (x) { if (W.console) console.warn('Conflict Simulator: three.js did not load, drawing the flat board', x); switchToFlat(); idle(); });
  } else { switchToFlat(); idle(); }
  W.WG = { run: run, replay: startReplay, models: MODELS, params: params, state: S, runMany: runMany, runOne: runOne, seek: seek, view: function () { return V; }, fps: function () { return V && V.fps ? V.fps() : 0; }, brief: function (id) { brief(EXID[id] || EX[0]); }, place: function (id) { placeSheet(PL[id]); }, layout: layout };
})();
