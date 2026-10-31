/* THE WARGAME (libertypolitics.com wargame/<theatre>/). The page, the models and the words: build/wargame.py's docstring.
   The register this reads: <script id="wg-data">, written by wargame.py from data/raw/wargame/<theatre>.json.

   THE PARTS
     map      the theatre in SVG (land, borders, places, the front), a canvas on top for what flies (fx), zoom and drag
     replay   a past war, day by day: every event of the register flies on the map with its words and its source
     room     the war room: the experts a reader seats, each with a briefing; the numbers of the run are their average
              (or every expert's, or the betting markets', or the reader's own sliders)
     moves    the choices of the theatre's model (MODELS[id].levers)
     run      1,000 wars in the background for the odds, then the most typical one played on the map, day by day
     result   how the 1,000 ended, what the typical one cost, which advisor called it, and the betting markets beside it
   The state of a scenario rides in the address (?s=), so Share sends exactly what was built.
   Never classList.toggle(name, state): tog(el, name, state) (wargame.py stops the build on the first). */
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
        sunk: 0, landed: 0, energy: P.energy_days, will: clamp(P.tw_will * luck.will, 0.2, 1), carriers: 0, usLoss: 0, kTW: 0, kPLA: 0, plaShips: 0, esc: 0, broke: 0 };
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
      if (snaps) snaps.push({ d: s.d, b: MOD.board(s), sec: s.sec ? Object.assign({}, s.sec) : null, gain: s.gain });
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

  // ---------------------------------------------------------------- the map
  var svg = $('#wg-map'), stage = $('#wg-stage'), cv = $('#wg-fx'), hud = $('#wg-hud'), panel = $('#wg-panel');
  var NS = 'http://www.w3.org/2000/svg';
  var vb = { x: 0, y: 0, w: G.w, h: G.h };
  function el(tag, at) { var n = D.createElementNS(NS, tag); for (var k in at) n.setAttribute(k, at[k]); return n; }
  var GLYPH = {
    airbase: 'M0-7L2 0L7 2V4L2 3L1 6L3 7V8H-3V7L-1 6L-2 3L-7 4V2L-2 0Z',
    naval: 'M-7 1H7L4 6H-4ZM-1-7H1V1H-1ZM-4-4H4V-2.5H-4Z',
    missile: 'M0-8L3-3V5L5 8H-5L-3 5V-3Z',
    nuclear: 'M0-2.2A2.2 2.2 0 1 1 0 2.2A2.2 2.2 0 1 1 0-2.2ZM0-8L4-1.5H-4ZM-6.9 4L-2.4 2.4L-4.1 6.9ZM6.9 4L4.1 6.9L2.4 2.4Z',
    oil: 'M0-8C3-4 5-1 5 2A5 5 0 0 1-5 2C-5-1-3-4 0-8Z',
    capital: 'M0-8L2.4-2.5H8L3.5 1L5.2 7L0 3.5L-5.2 7L-3.5 1L-8-2.5H-2.4Z',
    choke: 'M-8-2H8V2H-8ZM-2-8H2V8H-2Z',
    beach: 'M-7 4Q-3.5 0 0 4T7 4V6H-7Z'
  };
  function glyph(k) { return GLYPH[k] || (k === 'city' ? 'M-4-4H4V4H-4Z' : 'M0-5.5L5.5 0L0 5.5L-5.5 0Z'); }
  function drawPlaces() {
    var g = $('#wg-places'), L = $('#wg-labels'); g.innerHTML = ''; L.innerHTML = '';
    PLACES.forEach(function (p) {
      var a = el('g', { class: 'wg-p k-' + p.k + ' t-' + p.team + (p.off ? ' off' : ''), transform: 'translate(' + p.ex.toFixed(1) + ' ' + p.ey.toFixed(1) + ')', tabindex: '0', role: 'button', 'aria-label': p.n, 'data-id': p.id });
      a.appendChild(el('circle', { r: 11, class: 'wg-hit' }));
      a.appendChild(el('path', { d: glyph(p.k), fill: colorOf(p.o), class: 'wg-g' }));
      g.appendChild(a);
      if ((p.v || 0) >= 4 || p.k === 'capital') {
        var t = el('text', { x: p.ex + 10, y: p.ey + 4, class: 'wg-lab t-' + p.team }); t.textContent = p.off ? p.n + ' →' : p.n; L.appendChild(t);
      }
    });
    (G.c || []).forEach(function (c) {
      if (!c.l || c.a < 2500) return;
      var t = el('text', { x: c.l[0], y: c.l[1], class: 'wg-cty' }); t.textContent = tk('c:', c.n) !== c.n ? tk('c:', c.n) : c.n.toUpperCase(); L.insertBefore(t, L.firstChild);
    });
    declutter();
  }
  // Names never pile up: the most valuable place keeps its name, a name that would overlap one already shown is hidden
  // (its place still shows and opens on a tap). Run again after every zoom, since names keep their size on screen.
  function declutter() {
    var L = $('#wg-labels'); if (!L) return;
    var labs = $$('.wg-lab', L), ctys = $$('.wg-cty', L), kept = [];
    labs.concat(ctys).forEach(function (t) { tog(t, 'gone', false); });
    var order = labs.map(function (t, i) { return { t: t, v: i }; });
    var vals = PLACES.filter(function (p) { return (p.v || 0) >= 4 || p.k === 'capital'; });
    order.forEach(function (o, i) { var p = vals[i]; o.v = p ? ((p.k === 'capital' ? 10 : 0) + (p.v || 0)) : 0; });
    order.sort(function (a, b) { return b.v - a.v; });
    function over(b) { for (var i = 0; i < kept.length; i++) { var k = kept[i]; if (b.x < k.x + k.width + 2 && b.x + b.width + 2 > k.x && b.y < k.y + k.height && b.y + b.height > k.y) return true; } return false; }
    order.forEach(function (o) { var b; try { b = o.t.getBBox(); } catch (x) { return; } if (over(b)) tog(o.t, 'gone', true); else kept.push(b); });
    ctys.forEach(function (t) { var b; try { b = t.getBBox(); } catch (x) { return; } if (over(b)) tog(t, 'gone', true); });
  }
  var dcT = 0;
  function setView(v) {
    var minW = G.w / 6;
    v.w = clamp(v.w, minW, G.w); v.h = v.w * G.h / G.w;
    v.x = clamp(v.x, 0, G.w - v.w); v.y = clamp(v.y, 0, G.h - v.h);
    vb = v; svg.setAttribute('viewBox', v.x.toFixed(1) + ' ' + v.y.toFixed(1) + ' ' + v.w.toFixed(1) + ' ' + v.h.toFixed(1));
    tog(stage, 'zoomed', v.w < G.w - 1);
    svg.style.setProperty('--z', (G.w / v.w).toFixed(3));
    clearTimeout(dcT); dcT = setTimeout(declutter, 120);
  }
  function fit() { setView({ x: 0, y: 0, w: G.w, h: G.h }); }
  function toMap(cx, cy) {
    var r = svg.getBoundingClientRect(), s = Math.min(r.width / vb.w, r.height / vb.h);
    var ox = (r.width - vb.w * s) / 2, oy = (r.height - vb.h * s) / 2;
    return [vb.x + (cx - r.left - ox) / s, vb.y + (cy - r.top - oy) / s];
  }
  function zoomAt(cx, cy, f) {
    var m = toMap(cx, cy), w = clamp(vb.w / f, G.w / 6, G.w);
    var k = w / vb.w;
    setView({ x: m[0] - (m[0] - vb.x) * k, y: m[1] - (m[1] - vb.y) * k, w: w });
  }
  (function gestures() {
    var ptrs = {}, last = null, moved = 0, pinch0 = 0;
    stage.addEventListener('wheel', function (ev) { if (!ev.ctrlKey && !stage.classList.contains('zoomed') && ev.deltaY > 0) return; ev.preventDefault(); zoomAt(ev.clientX, ev.clientY, ev.deltaY < 0 ? 1.18 : 1 / 1.18); }, { passive: false });
    stage.addEventListener('pointerdown', function (ev) { if (ev.target.closest('button, a, .wg-hudi')) return; ptrs[ev.pointerId] = [ev.clientX, ev.clientY]; last = [ev.clientX, ev.clientY]; moved = 0; });
    W.addEventListener('pointermove', function (ev) {
      if (!ptrs[ev.pointerId]) return;
      var ids = Object.keys(ptrs); ptrs[ev.pointerId] = [ev.clientX, ev.clientY];
      if (ids.length >= 2) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]], dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch0) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, dist / pinch0);
        pinch0 = dist; moved = 99; return;
      }
      if (!stage.classList.contains('zoomed')) return;
      var dx = ev.clientX - last[0], dy = ev.clientY - last[1]; moved += Math.abs(dx) + Math.abs(dy); last = [ev.clientX, ev.clientY];
      if (moved > 6) { var r = svg.getBoundingClientRect(), s = Math.min(r.width / vb.w, r.height / vb.h); setView({ x: vb.x - dx / s, y: vb.y - dy / s, w: vb.w }); }
    });
    W.addEventListener('pointerup', function (ev) { delete ptrs[ev.pointerId]; if (Object.keys(ptrs).length < 2) pinch0 = 0; });
    W.addEventListener('pointercancel', function (ev) { delete ptrs[ev.pointerId]; pinch0 = 0; });
    stage.addEventListener('dblclick', function (ev) { if (ev.target.closest('button, .wg-hudi')) return; zoomAt(ev.clientX, ev.clientY, 1.8); });
    svg.addEventListener('click', function (ev) { if (moved > 6) return; var g = ev.target.closest('.wg-p'); if (g) placeSheet(PL[g.getAttribute('data-id')]); });
    svg.addEventListener('keydown', function (ev) { var g = ev.target.closest && ev.target.closest('.wg-p'); if (g && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); placeSheet(PL[g.getAttribute('data-id')]); } });
  })();

  // the front line (Ukraine): the register's snapshots, moved by the model's gains per sector
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
  var frontNow = null;
  function drawFront(pts, lobes, label) {
    var g = $('#wg-front'); if (!g) return;
    g.innerHTML = '';
    if (!pts || !UA) return;
    var defs = svg.querySelector('defs');
    if (!$('#wg-uaclip')) { var cp = el('clipPath', { id: 'wg-uaclip' }); cp.appendChild(el('path', { d: UA.d })); defs.appendChild(cp); }
    var grp = el('g', { 'clip-path': 'url(#wg-uaclip)' });
    grp.appendChild(el('path', { d: frontPath(pts), class: 'wg-occ' }));
    g.appendChild(grp);
    g.appendChild(el('path', { d: 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L'), class: 'wg-line' }));
    // a lobe is a pocket off the line: {side, n, ring}. Russian-held pockets inside Ukraine are shaded like the rest of the
    // occupied land (inside the clip); Ukrainian-held ground inside Russia (the Kursk salient) is drawn blue, unclipped.
    (lobes || []).forEach(function (o) {
      var ring = Array.isArray(o) ? o : (o && o.ring) || [];
      if (!ring.length || !Array.isArray(ring[0])) return;
      var d = 'M' + ring.map(xy).map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L') + 'Z';
      var ua = o && o.side && teamOf(o.side) === 'blue';
      var path = el('path', { d: d, class: ua ? 'wg-lobe' : 'wg-occ' });
      if (o && o.n) { var t = el('title', {}); t.textContent = o.n; path.appendChild(t); }
      (ua ? g : grp).appendChild(path);
    });
  }
  function frontAt(iso) {
    var F = R.fronts || [], best = null;
    F.forEach(function (f) { if (f.d <= iso) best = f; });
    return best || F[0];
  }

  // ---------------------------------------------------------------- what flies: the canvas
  var ctx = cv.getContext('2d'), FX = [], raf = 0, dpr = 1;
  function sizeCanvas() {
    var r = stage.getBoundingClientRect(); dpr = Math.min(2, W.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
  }
  function scr(p) {
    var r = svg.getBoundingClientRect(), sr = stage.getBoundingClientRect(), s = Math.min(r.width / vb.w, r.height / vb.h);
    var ox = (r.width - vb.w * s) / 2 + (r.left - sr.left), oy = (r.height - vb.h * s) / 2 + (r.top - sr.top);
    return [((p[0] - vb.x) * s + ox) * dpr, ((p[1] - vb.y) * s + oy) * dpr];
  }
  var SPEED = { strike: 1100, missile: 1300, drone: 2100, naval: 2300, intercept: 900 };
  function launch(ev, t0) {
    var a = pt(ev.from), b = pt(ev.to), c = colorOf(ev.side);
    if (b && !a) { FX.push({ k: 'burst', p: b, t0: t0, dur: 900, c: c, big: ev.big }); return; }
    if (!a || !b) return;
    var n = Math.min(10, Math.max(1, Math.round(Math.sqrt(ev.n || 1)))), stop = ev.n ? (ev.stop || 0) / ev.n : 0;
    var dur = (SPEED[ev.t] || 1300) * (REDUCED ? 0.6 : 1);
    for (var i = 0; i < n; i++) {
      var jit = [(Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18];
      var dead = Math.random() < stop;
      FX.push({ k: 'shot', t: ev.t, a: [a[0] + jit[0] * 0.3, a[1] + jit[1] * 0.3], b: [b[0] + jit[0], b[1] + jit[1]], t0: t0 + i * 90, dur: dur * (0.9 + Math.random() * 0.25), c: c, dead: dead, cut: 0.62 + Math.random() * 0.25 });
    }
  }
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function frame(now) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    var keep = [];
    for (var i = 0; i < FX.length; i++) {
      var f = FX[i], x = (now - f.t0) / f.dur;
      if (x < 0) { keep.push(f); continue; }
      if (f.k === 'shot') {
        var end = f.dead ? f.cut : 1;
        if (x > end) {
          FX.push({ k: 'burst', p: f.dead ? lerpArc(f, f.cut) : f.b, t0: now, dur: f.dead ? 500 : 900, c: f.dead ? '#9FD0FF' : f.c, small: f.dead, map: true });
          continue;
        }
        drawShot(f, ease(Math.min(x, end)));
        keep.push(f);
      } else if (f.k === 'burst') {
        if (x > 1) continue;
        if (!f.p || !isFinite(f.p[0]) || !isFinite(f.p[1])) continue;
        var p = scr(f.p), rr = (f.small ? 7 : f.big ? 30 : 16) * dpr * (0.3 + x);
        var g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr);
        g.addColorStop(0, 'rgba(255,240,200,' + (1 - x) + ')'); g.addColorStop(0.35, hexA(f.c, 0.8 * (1 - x))); g.addColorStop(1, hexA(f.c, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, 7); ctx.fill();
        if (!f.small) { ctx.strokeStyle = hexA(f.c, 0.7 * (1 - x)); ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.arc(p[0], p[1], rr * 1.6, 0, 7); ctx.stroke(); }
        keep.push(f);
      }
    }
    FX = keep;
    raf = FX.length ? W.requestAnimationFrame(frame) : 0;
  }
  function kickFx() { if (!raf) raf = W.requestAnimationFrame(frame); }
  function lerpArc(f, x) {
    var a = f.a, b = f.b, h = arcH(f), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - h;
    return [(1 - x) * (1 - x) * a[0] + 2 * (1 - x) * x * mx + x * x * b[0], (1 - x) * (1 - x) * a[1] + 2 * (1 - x) * x * my + x * x * b[1]];
  }
  function arcH(f) { var L = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]); return f.t === 'missile' ? L * 0.32 : f.t === 'strike' ? L * 0.12 : f.t === 'naval' ? 0 : L * 0.06; }
  function drawShot(f, x) {
    var steps = 12, tail = f.t === 'naval' ? 0.08 : f.t === 'drone' ? 0.1 : 0.2;
    ctx.lineCap = 'round';
    for (var i = 0; i < steps; i++) {
      var u0 = Math.max(0, x - tail * (i + 1) / steps), u1 = Math.max(0, x - tail * i / steps);
      var p0 = scr(lerpArc(f, u0)), p1 = scr(lerpArc(f, u1));
      ctx.strokeStyle = hexA(f.c, 0.9 * (1 - i / steps)); ctx.lineWidth = (f.t === 'naval' ? 3 : 2) * dpr * (1 - i / steps * 0.6);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    }
    var h = scr(lerpArc(f, x));
    ctx.fillStyle = '#fff'; ctx.shadowColor = f.c; ctx.shadowBlur = 10 * dpr;
    ctx.beginPath(); ctx.arc(h[0], h[1], (f.t === 'naval' ? 3 : 2) * dpr, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  function hexA(h, a) { var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(h || '#ffffff'); return m ? 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + clamp(a, 0, 1).toFixed(3) + ')' : h; }
  function hitPlace(id, how) { var p = PL[id]; if (!p) return; var g = svg.querySelector('.wg-p[data-id="' + id + '"]'); tog(g, 'hit', how === 'hit' || how === 'partial'); }

  // ---------------------------------------------------------------- the HUD on the map
  function hudSet(o) {
    hud.innerHTML = '<div class="wg-hudi wg-h-top"><b class="wg-h-when num">' + esc(o.when || '') + '</b><span>' + esc(o.title || '') + '</span></div>' +
      (o.board ? '<dl class="wg-hudi wg-h-board num">' + o.board.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>' : '') +
      (o.say ? '<div class="wg-hudi wg-h-say">' + o.say + '</div>' : '') +
      '<div class="wg-hudi wg-h-ctl"><button type="button" class="wg-ib" id="wg-play" aria-label="' + (playing ? tr('Pause') : tr('Play')) + '">' + (playing ? '❚❚' : '▶') + '</button>' +
      '<button type="button" class="wg-ib" id="wg-speed" aria-label="' + tr('Speed') + '">' + N(S.speed) + '×</button>' +
      '<button type="button" class="wg-ib" id="wg-fit" aria-label="' + tr('Fit the whole map') + '">⤢</button>' +
      '<button type="button" class="wg-ib" id="wg-full" aria-label="' + tr('Full screen') + '">⛶</button></div>';
  }
  hud.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.id === 'wg-play') { if (playing) pause(); else resume(); }
    else if (b.id === 'wg-speed') { S.speed = S.speed >= 4 ? 0.5 : S.speed * 2; b.textContent = N(S.speed) + '×'; }
    else if (b.id === 'wg-fit') fit();
    else if (b.id === 'wg-full') full();
  });
  function full() {
    var on = box.classList.contains('wg-full');
    if (!on) { tog(box, 'wg-full', true); D.documentElement.style.overflow = 'hidden'; if (box.requestFullscreen) box.requestFullscreen().catch(function () {}); }
    else { tog(box, 'wg-full', false); D.documentElement.style.overflow = ''; if (D.fullscreenElement && D.exitFullscreen) D.exitFullscreen().catch(function () {}); }
    setTimeout(function () { sizeCanvas(); }, 60);
  }
  D.addEventListener('fullscreenchange', function () { if (!D.fullscreenElement && box.classList.contains('wg-full')) { tog(box, 'wg-full', false); D.documentElement.style.overflow = ''; setTimeout(sizeCanvas, 60); } });
  D.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && box.classList.contains('wg-full') && !D.fullscreenElement) full(); });

  // ---------------------------------------------------------------- the player: one timeline of days, replay or model
  var TL = null, ti = 0, playing = false, timer = 0;
  function play(tl) { TL = tl; ti = 0; playing = true; PLACES.forEach(function (p) { hitPlace(p.id, null); }); tick(); }
  function pause() { playing = false; clearTimeout(timer); showStep(ti - 1); }
  function resume() { if (!TL) return; if (ti >= TL.steps.length) ti = 0; playing = true; tick(); }
  function tick() {
    if (!TL || !playing) return;
    if (ti >= TL.steps.length) { playing = false; showStep(TL.steps.length - 1); if (TL.done) TL.done(); return; }
    var st = TL.steps[ti], now = performance.now();
    (st.ev || []).forEach(function (ev, k) { launch(ev, now + k * 260); if (ev.to && typeof ev.to === 'string') setTimeout(function () { hitPlace(ev.to, ev.res); }, 1300 + k * 260); });
    kickFx();
    showStep(ti); ti++;
    var ms = (st.ms || TL.ms || 1800) / S.speed;
    timer = setTimeout(tick, REDUCED ? ms * 0.7 : ms);
  }
  function showStep(i) {
    if (!TL) return;
    var st = TL.steps[Math.max(0, i)]; if (!st) return;
    hudSet({ when: st.when, title: st.title, board: st.board, say: st.say || st.caption });
    if (st.front) drawFront(st.front, st.lobes);
    var cap = $('#wg-cap'); if (cap) cap.innerHTML = st.caption || '';
    var bar = $('#wg-prog'); if (bar) bar.style.setProperty('--p', Math.round(100 * (i + 1) / TL.steps.length) + '%');
    if (TL.onStep) TL.onStep(i);
  }

  // ---------------------------------------------------------------- REPLAY: a past war from the register
  function replayTL(h) {
    var steps = h.days.map(function (dd) {
      var evs = (dd.ev || []).filter(function (v) { return v.t !== 'note' || v.to; }).map(function (v) { return { t: v.t === 'intercept' ? 'missile' : v.t === 'kill' ? 'strike' : v.t === 'ground' ? 'naval' : v.t, side: v.side, from: v.from, to: v.to, n: v.n, stop: v.res === 'intercepted' ? v.n : v.res === 'partial' ? Math.round((v.n || 1) * 0.8) : 0, res: v.res }; });
      var cap = (dd.ev || []).map(function (v) {
        return '<li><i style="background:' + colorOf(v.side) + '"></i>' + esc(v.w || '') + ((v.src || []).length ? ' <a href="' + esc(v.src[0]) + '" target="_blank" rel="noopener">' + tr('source') + '</a>' : '') + '</li>';
      }).join('');
      var f = TID === 'ukraine' ? frontAt(dd.d) : null;
      return { when: day(dd.d), title: dd.title || h.name, ev: evs, caption: '<ul class="wg-evl">' + cap + '</ul>', front: f ? frontPts(f.line) : null, lobes: f ? f.lobes : null, ms: 2600 };
    });
    return { steps: steps, done: function () { var c = $('#wg-cap'); if (c) c.insertAdjacentHTML('beforeend', '<p class="wg-res"><b>' + tr('How it ended.') + '</b> ' + esc(h.result || '') + '</p>'); } };
  }

  // ---------------------------------------------------------------- the panel
  var TABS = [['next', tr('Run the next war')], ['replay', tr('Replay past wars')], ['room', tr('War room')]];
  function drawPanel() {
    panel.innerHTML = '<div class="wg-tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" class="wg-tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>' +
      '<div class="wg-body" id="wg-body"></div>';
    drawTab();
  }
  panel.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-tab]'); if (t) { S.tab = t.getAttribute('data-tab'); $$('.wg-tab', panel).forEach(function (b) { b.setAttribute('aria-selected', b === t); }); drawTab(); return; }
    var lv = ev.target.closest('[data-lv]'); if (lv) { S.lv[lv.getAttribute('data-lv')] = lv.getAttribute('data-o'); stale(); drawTab(); return; }
    var ln = ev.target.closest('[data-lens]'); if (ln) { S.lens = ln.getAttribute('data-lens'); if (S.lens === 'mine' && !S.mine) S.mine = avgOf(S.room.length ? S.room.map(function (i) { return EXID[i]; }) : EX); stale(); drawTab(); return; }
    var x = ev.target.closest('[data-seat]'); if (x) { seat(x.getAttribute('data-seat')); return; }
    var br = ev.target.closest('[data-brief]'); if (br) { brief(EXID[br.getAttribute('data-brief')]); return; }
    var dt = ev.target.closest('[data-date]'); if (dt) { S.date = dt.getAttribute('data-date'); stale(); drawTab(); return; }
    var rp = ev.target.closest('[data-replay]'); if (rp) { startReplay(rp.getAttribute('data-replay')); return; }
    if (ev.target.closest('#wg-run')) { run(); return; }
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
  function pmFmt(p, v) { return p.max <= 1 && p.min >= 0 ? pc(v) : fmt(v) + (p.unit && !/count/.test(p.unit) ? ' ' + p.unit.replace(/^0-1$/, '') : ''); }
  function seat(id) {
    var i = S.room.indexOf(id);
    if (i >= 0) S.room.splice(i, 1); else if (S.room.length < 10) S.room.push(id);
    S.lens = 'room'; stale(); drawTab();
    var sh = $('#wg-sheet'); if (!sh.hidden) { var b = $('#wg-sh-seat'); if (b) { var on = S.room.indexOf(id) >= 0; b.textContent = on ? tr('Leave the war room') : tr('Seat in my war room'); tog(b, 'on', on); } }
  }
  var LAST = null;
  function stale() { LAST = null; writeUrl(); var r = $('#wg-result'); if (r) tog(r, 'old', true); }
  function face(x, cls) {
    return '<span class="wg-face ' + (cls || '') + (x.kind === 'org' ? ' org' : '') + '">' + (x.face ? '<img src="' + esc(x.face) + '" alt="" loading="lazy" decoding="async" width="240" height="300">' : '<b>' + esc(initials(x.nEn || x.n)) + '</b>') + '</span>';
  }
  function leanTag(l) { return l ? '<span class="wg-lean l-' + esc(l) + '">' + esc(tk('lean:', l)) + '</span>' : ''; }
  function roomPresets() {
    var by = function (L) { return EX.filter(function (x) { return L.indexOf(x.lean) >= 0; }).map(function (x) { return x.id; }); };
    var out = [[tr('Hawks'), by(['hawk', 'optimist'])], [tr('Doves and skeptics'), by(['dove', 'skeptic', 'pessimist'])], [tr('Think tanks only'), EX.filter(function (x) { return x.kind === 'org'; }).map(function (x) { return x.id; })], [tr('Generals and analysts'), EX.filter(function (x) { return x.kind === 'person'; }).map(function (x) { return x.id; })]];
    return out.filter(function (o) { return o[1].length >= 2; });
  }
  function roomHtml(compact) {
    var seated = S.room.map(function (i) { return EXID[i]; }).filter(Boolean);
    var lens = [['room', tr('My war room') + (seated.length ? ' (' + N(seated.length) + ')' : '')], ['all', tf('All {n} experts', { n: N(EX.length) })], ['markets', tr('Betting markets')], ['mine', tr('My own numbers')]];
    var h = '<div class="wg-lens" role="radiogroup" aria-label="' + esc(tr('Whose numbers run the war')) + '">' + lens.map(function (l) { return '<button type="button" role="radio" data-lens="' + l[0] + '" aria-checked="' + (S.lens === l[0]) + '">' + esc(l[1]) + '</button>'; }).join('') + '</div>';
    if (S.lens === 'room') {
      h += '<p class="wg-hint">' + esc(seated.length ? tr('The war runs on the average of their numbers. Tap a face to hear their briefing.') : tr('Seat 2 to 10 advisors. Until you do, everyone sits in.')) + '</p>';
      h += '<div class="wg-presets">' + roomPresets().map(function (p) { return '<button type="button" class="wg-chip" data-room="' + p[1].join(',') + '">' + esc(p[0]) + '</button>'; }).join('') + '</div>';
      h += '<ul class="wg-room' + (compact ? ' compact' : '') + '">' + EX.map(function (x) {
        var on = S.room.indexOf(x.id) >= 0;
        return '<li class="' + (on ? 'on' : '') + '"><button type="button" class="wg-ex" data-brief="' + esc(x.id) + '" aria-label="' + esc(tf('Briefing from {n}', { n: x.n })) + '">' + face(x) + '<b>' + esc(x.n) + '</b><span>' + esc(x.who || '') + '</span>' + leanTag(x.lean) + '</button>' +
          '<button type="button" class="wg-seat' + (on ? ' on' : '') + '" data-seat="' + esc(x.id) + '" aria-pressed="' + on + '">' + esc(on ? tr('Seated') : tr('Seat')) + '</button></li>';
      }).join('') + '</ul>';
    } else if (S.lens === 'mine') {
      var P = S.mine || avgOf(EX);
      h += '<p class="wg-hint">' + esc(tr('Your own numbers. Each starts at the experts’ average.')) + ' <button type="button" class="wg-link" id="wg-reset">' + esc(tr('Back to the average')) + '</button></p><div class="wg-pms">' +
        (R.params || []).map(function (p) {
          var step = p.max <= 1 ? 0.01 : Math.max(1, Math.round((p.max - p.min) / 100));
          return '<label class="wg-pm"><span>' + esc(p.n) + ' <output id="wg-pmv-' + p.id + '" class="num">' + pmFmt(p, P[p.id]) + '</output></span><input type="range" data-pm="' + p.id + '" min="' + p.min + '" max="' + p.max + '" step="' + step + '" value="' + P[p.id] + '"><small>' + esc(p.help || '') + '</small></label>';
        }).join('') + '</div>';
    } else if (S.lens === 'markets') {
      h += '<p class="wg-hint">' + esc(tr('The experts’ average, moved wherever a betting market prices the same thing.')) + ' ' + ((R.markets || []).length ? '' : esc(tr('No market is priced today.'))) + '</p>' + marketsHtml();
    } else h += '<p class="wg-hint">' + esc(tr('Every expert in the room, averaged equally.')) + '</p>';
    return h;
  }
  function marketsHtml() {
    var M = R.markets || []; if (!M.length) return '';
    return '<ul class="wg-mk mk-blk">' + M.map(function (m) {
      var o = m.o[0];
      return '<li><b class="num">' + pc(o[1]) + '</b><span>' + esc(m.q) + (m.o.length > 1 ? ' <small>' + esc(o[0]) + '</small>' : '') + ' <a href="' + esc(m.u) + '" target="_blank" rel="' + esc(m.rel || 'noopener') + '">' + esc(m.w || tr('market')) + '</a></span></li>';
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
    var b = $('#wg-body'); if (!b) return;
    if (S.tab === 'replay') {
      b.innerHTML = '<p class="wg-hint">' + esc(tr('Every strike of a past war, on the day it happened, from the reporting. Pick one and watch.')) + '</p><ul class="wg-hist">' + (R.history || []).map(function (h) {
        return '<li><button type="button" data-replay="' + esc(h.id) + '"><b>' + esc(h.name) + '</b><span class="num">' + esc(day(h.start)) + esc(tr(' to ')) + esc(day(h.end)) + '</span><span class="wg-ops">' + esc((h.ops || []).join('  ·  ')) + '</span><span>' + esc(h.summary || '') + '</span></button></li>';
      }).join('') + '</ul>';
      b.insertAdjacentHTML('afterbegin', '<div class="wg-cap" id="wg-cap"></div><div id="wg-tally"></div>');
      return;
    }
    if (S.tab === 'room') { b.innerHTML = '<div class="wg-step"><h3><i>' + N(1) + '</i>' + esc(tr('Your war room')) + '</h3>' + roomHtml(false) + '</div>'; return; }
    b.innerHTML = '<div class="wg-step"><h3><i>' + N(1) + '</i>' + esc(tr('Whose numbers')) + '</h3>' + roomHtml(true) + '</div>' + datesHtml() +
      '<div class="wg-step"><h3><i>' + N((R.dates || []).some(function (d) { return d.d >= R.today; }) ? 3 : 2) + '</i>' + esc(tr('Your moves')) + '</h3>' + leversHtml() + '</div>' +
      '<button type="button" class="wg-run" id="wg-run">' + esc(tr('Run the war 1,000 times')) + '</button>' +
      '<div class="wg-prog" id="wg-prog" aria-hidden="true"></div><div class="wg-cap" id="wg-cap"></div><div id="wg-result">' + (LAST ? resultHtml(LAST) : '') + '</div>';
  }

  // ---------------------------------------------------------------- the briefing
  var sheet = $('#wg-sheet'), sheetIn = $('#wg-sh-in'), lastFocus = null;
  function openSheet(html) {
    lastFocus = D.activeElement; sheetIn.innerHTML = '<button type="button" class="wg-x" id="wg-x" aria-label="' + esc(tr('Close')) + '">×</button>' + html; sheet.hidden = false;
    var x = $('#wg-x'); if (x) x.focus();
  }
  function closeSheet() { sheet.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  sheet.addEventListener('click', function (ev) { if (ev.target === sheet || ev.target.closest('#wg-x')) closeSheet(); else if (ev.target.closest('#wg-sh-seat')) seat(ev.target.closest('#wg-sh-seat').getAttribute('data-id')); });
  D.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !sheet.hidden) closeSheet(); });
  function brief(x) {
    if (!x) return;
    var on = S.room.indexOf(x.id) >= 0;
    var own = runMany(Object.assign(avgOf(EX), x.p || {}), S.lv, 300, 4242);
    var top = MOD.outcomes.filter(function (o) { return o.id === own.top; })[0];
    var nums = Object.keys(x.p || {}).map(function (k) { var p = PM[k]; if (!p) return ''; return '<li><b class="num">' + pmFmt(p, x.p[k]) + '</b><span>' + esc(p.n) + (x.pWhy && x.pWhy[k] ? '<small>' + esc(x.pWhy[k]) + '</small>' : '') + '</span></li>'; }).join('');
    openSheet('<div class="wg-brief"><div class="wg-br-who">' + face(x, 'big') + '<div><p class="wg-br-k">' + esc(tr('Briefing')) + '</p><h3 id="wg-sh-t">' + esc(x.n) + '</h3><p class="dim">' + esc(x.who || '') + '</p>' + leanTag(x.lean) + '</div></div>' +
      '<div class="wg-br-say"><p class="wg-br-view">' + esc(x.view || '') + '</p><ol>' + (x.brief || []).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol>' +
      '<p class="wg-br-own">' + esc(tr('With your moves, a war run on their numbers alone most often ends:')) + ' <b style="color:' + (top ? top.c : '') + '">' + esc(top ? top.n : '') + '</b> <span class="num">(' + pc(own.cnt[own.top] / own.n) + ')</span></p></div>' +
      (nums ? '<h4>' + esc(tr('Their numbers in this game')) + '</h4><ul class="wg-br-nums">' + nums + '</ul>' : '') +
      '<h4>' + esc(tr('What they published')) + '</h4><ul class="wg-br-src">' + (x.said || []).map(function (s) { return '<li>' + esc(s.w) + ' <a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(day(s.date || '')) + '</a></li>'; }).join('') + '</ul>' +
      '<p class="wg-fine">' + esc(tr('These lines are my summary of their published work, not their words. The numbers are my reading of it.')) + '</p>' +
      '<button type="button" class="wg-run' + (on ? ' on' : '') + '" id="wg-sh-seat" data-id="' + esc(x.id) + '">' + esc(on ? tr('Leave the war room') : tr('Seat in my war room')) + '</button></div>');
  }
  function placeSheet(p) {
    if (!p) return;
    openSheet('<div class="wg-place"><p class="wg-br-k" style="color:' + colorOf(p.o) + '">' + esc((SIDE[p.o] || {}).n || p.o || '') + '  ·  ' + esc(tk('k:', p.k)) + '</p><h3 id="wg-sh-t">' + esc(p.n) + '</h3>' +
      (p.why ? '<p>' + esc(p.why) + '</p>' : '') + (p.st ? '<p class="dim">' + esc(p.st) + '</p>' : '') +
      ((p.src || []).length ? '<p class="wg-fine">' + p.src.slice(0, 3).map(function (u, i) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(tf('Source {n}', { n: N(i + 1) })) + '</a>'; }).join('  ·  ') + '</p>' : '') + '</div>');
  }

  // ---------------------------------------------------------------- RUN
  function advisorLine(ev) {
    if (!ev.param) return '';
    var room = (S.lens === 'room' && S.room.length ? S.room.map(function (i) { return EXID[i]; }) : EX).filter(function (x) { return x && x.pWhy && x.pWhy[ev.param]; });
    if (!room.length) return '';
    var x = room[Math.abs(hash(ev.param + ev.d)) % room.length];
    return '<span class="wg-say">' + face(x, 'tiny') + '<span><b>' + esc(x.n) + '</b>' + esc(x.pWhy[ev.param]) + '</span></span>';
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
  function run() {
    var btn = $('#wg-run'); if (btn) { btn.disabled = true; btn.textContent = tr('Running 1,000 wars…'); }
    setTimeout(function () {
      var P = params(), lv = Object.assign({}, S.lv);
      var res = runMany(P, lv, 1000, 1337 + hash(JSON.stringify(lv)));
      if (TID === 'iran') res.A.intOutShare = intOutShare(P, lv, 300, 99);
      var feat = runOne(P, lv, res.seed, true);
      // what each advisor's numbers alone would say: who called it
      res.calls = EX.map(function (x) { var o = runMany(Object.assign(avgOf(EX), x.p || {}), lv, 200, 777); return { x: x, top: o.top, p: o.cnt[o.top] / o.n, hit: o.cnt[feat.out] / o.n }; });
      res.feat = feat; res.P = P; res.lv = lv; LAST = res;
      var start = S.date || R.today, unit = MOD.unit === 'week' ? 7 : 1;
      var byDay = {}; feat.log.forEach(function (ev) { (byDay[ev.d] = byDay[ev.d] || []).push(ev); });
      var f0 = TID === 'ukraine' ? frontPts((frontAt(R.today) || {}).line) : null;
      var steps = feat.snaps.map(function (sn) {
        var evs = byDay[sn.d] || [], loud = evs.filter(function (v) { return v.w && !v.quiet; });
        var say = ''; for (var i = 0; i < evs.length && !say; i++) say = advisorLine(evs[i]);
        return { when: tf(MOD.unit === 'week' ? 'Week {n}' : 'Day {n}', { n: N(sn.d) }) + '  ·  ' + day(addDays(start, (sn.d - 1) * unit)), title: R.meta.h1, ev: evs.filter(function (v) { return v.from || v.to; }), board: sn.b, say: say,
          caption: loud.length ? '<ul class="wg-evl">' + loud.map(function (v) { return '<li><i style="background:' + colorOf(v.side) + '"></i>' + esc(v.w) + '</li>'; }).join('') + '</ul>' : '',
          front: f0 ? shifted(f0, sn.sec) : null, ms: loud.some(function (v) { return v.big; }) ? 2200 : 1300 };
      });
      if (btn) { btn.disabled = false; btn.textContent = tr('Run it again'); }
      var r = $('#wg-result'); if (r) { r.innerHTML = resultHtml(res); tog(r, 'old', false); }
      reportCalls(res);
      play({ steps: steps, done: function () { var c = $('#wg-cap'); var o = MOD.outcomes.filter(function (x) { return x.id === feat.out; })[0]; if (c) c.innerHTML = '<p class="wg-res"><b style="color:' + o.c + '">' + esc(o.n) + '.</b> ' + esc(o.w) + ' ' + esc(tr('This was the most typical of the 1,000 wars.')) + '</p>'; } });
      if (W.innerWidth < 900) stage.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    }, 30);
  }
  function resultHtml(res) {
    var bars = MOD.outcomes.map(function (o) { var p = res.cnt[o.id] / res.n; return '<li><span>' + esc(o.n) + '</span><b class="num">' + pc(p) + '</b><i style="--p:' + (p * 100).toFixed(1) + '%;--c:' + o.c + '"></i></li>'; }).join('');
    var sum = MOD.summary(res.A, res.lv).map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd class="num">' + esc(x[1]) + '</dd></div>'; }).join('');
    var calls = res.calls.slice().sort(function (a, b) { return b.hit - a.hit; }).slice(0, 5).map(function (c) { var o = MOD.outcomes.filter(function (x) { return x.id === c.top; })[0]; return '<li>' + face(c.x, 'tiny') + '<span><b>' + esc(c.x.n) + '</b> ' + esc(tr('expects')) + ' <em style="color:' + o.c + '">' + esc(o.n.toLowerCase()) + '</em> <span class="num">(' + pc(c.p) + ')</span></span></li>'; }).join('');
    var top = MOD.outcomes.filter(function (o) { return o.id === res.top; })[0];
    return '<div class="wg-out"><h3>' + esc(tr('How the 1,000 wars ended')) + '</h3><p class="wg-big">' + tf('{o} in {p} of them.', { o: '<b style="color:' + top.c + '">' + esc(top.n) + '</b>', p: '<span class="num">' + pc(res.cnt[res.top] / res.n) + '</span>' }) + '</p><ul class="wg-bars">' + bars + '</ul>' +
      '<dl class="wg-sum">' + sum + '</dl><h4>' + esc(tr('Who in the room called it')) + '</h4><ul class="wg-calls">' + calls + '</ul>' +
      (IU ? '' : '<div class="lpc" data-lpc-tool="war-' + TID + '" data-lpc-n="3"></div>') +      // Iran Uncensored has no Make your call (make_rules.py, difference 8)
      '<div class="wg-share"><button type="button" class="wg-run" id="wg-share">' + esc(tr('Share this war')) + '</button><button type="button" class="wg-run wg-ghost" data-shot="' + KEY + TID + '" hidden>' + esc(tr('Make a picture')) + '</button></div></div>';
  }
  function reportCalls(res) {
    // The war's answer next to the betting markets and the readers (CALLS.md: a calculator reports its own number).
    var lpc = $('.lpc', box);
    if (W.LPCalls && lpc) {
      try {
        // Only a market that asks what this model answers gets "Your build says" (ids from assets/calls.json; option order is fixed)
        if (TID === 'iran') { var f = res.cnt.fall / res.n; W.LPCalls.mine('p:663583', f >= 0.5 ? 0 : 1, 'Your war room: the regime falls in ' + pc(f) + ' of the wars you built'); }
        W.LPCalls.mount(lpc);
      } catch (x) {}
    }
    $$('[data-shot]', box).forEach(function (b) { b.hidden = !W.LPShot; });
  }

  // ---------------------------------------------------------------- the address, share and the picture
  function writeUrl() {
    var q = { r: S.room.join('.'), l: S.lens, d: S.date || '' };
    MOD.levers.forEach(function (l) { q[l.id] = S.lv[l.id]; });
    var s = Object.keys(q).filter(function (k) { return q[k]; }).map(function (k) { return k + ':' + q[k]; }).join(',');
    try { history.replaceState(null, '', location.pathname + '?s=' + encodeURIComponent(s) + location.hash); } catch (x) {}
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
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { var b = $('#wg-share'); if (b) { b.textContent = tr('Link copied'); setTimeout(function () { b.textContent = tr('Share this war'); }, 1600); } });
  }
  (W.LPShotQ = W.LPShotQ || []).push({
    id: KEY + TID, kicker: tr('WARGAME'), el: '#' + box.id, cta: tr('Run the war yourself'), url: function () { writeUrl(); return location.href; },
    title: function () { if (!LAST) return R.meta.h1; var o = MOD.outcomes.filter(function (x) { return x.id === LAST.top; })[0]; return tf('My war room: {o} ({p})', { o: o.n.toLowerCase(), p: pc(LAST.cnt[LAST.top] / LAST.n) }); },
    sub: function () { return R.meta.h1; },
    text: function () { return R.meta.lede; },
    draw: function (c, bx, kit) {
      var s = Math.min(bx.w / G.w, (bx.h * 0.6) / G.h), ox = bx.x + (bx.w - G.w * s) / 2, oy = bx.y;
      c.save(); c.translate(ox, oy); c.scale(s, s);
      c.fillStyle = '#0b0f14'; c.fillRect(0, 0, G.w, G.h);
      (G.c || []).forEach(function (k) { var p = new Path2D(k.d); c.fillStyle = '#23221f'; c.fill(p); c.strokeStyle = '#3a3936'; c.lineWidth = 1 / s; c.stroke(p); });
      PLACES.forEach(function (p) { if (p.off) return; c.fillStyle = colorOf(p.o); c.beginPath(); c.arc(p.x, p.y, 5, 0, 7); c.fill(); });
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
      (R.now ? tf('Where things stand, {d}: ', { d: esc(day(R.now.asOf)) }) + esc(R.now.state) : '') + '</p>';
  }

  // ---------------------------------------------------------------- start
  function startReplay(id) {
    var h = (R.history || []).filter(function (x) { return x.id === id; })[0]; if (!h) return;
    $$('[data-replay]', panel).forEach(function (b) { tog(b, 'on', b.getAttribute('data-replay') === id); });
    var t = $('#wg-tally'); if (t) t.innerHTML = (h.tally || []).length ? '<dl class="wg-sum">' + h.tally.map(function (x) { return '<div><dt>' + esc(x.k) + '</dt><dd class="num">' + esc(x.v) + '</dd></div>'; }).join('') + '</dl>' : '';
    play(replayTL(h));
    if (W.innerWidth < 900) stage.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  }
  function idle() {
    var f = TID === 'ukraine' ? frontAt(R.today) : null;
    if (f) drawFront(frontPts(f.line), f.lobes);
    hudSet({ when: day(R.today), title: R.title || R.meta.h1, board: null, say: R.now ? '<span class="wg-now">' + esc(R.now.state) + '</span>' : '' });
  }
  drawPlaces();
  readUrl();
  if (!S.room.length) S.room = EX.slice(0, Math.min(5, EX.length)).map(function (x) { return x.id; });
  drawPanel(); idle(); sizeCanvas();
  W.addEventListener('resize', function () { sizeCanvas(); });
  var how = $('#wg-how-body'); if (how) how.innerHTML = howHtml();
  box.classList.add('wg-ready');
  W.WG = { run: run, replay: startReplay, models: MODELS, params: params, state: S, runMany: runMany, runOne: runOne, fit: fit };
})();
