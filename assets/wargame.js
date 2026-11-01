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
  if (/[?&]shot=/.test(location.search)) W.addEventListener('error', function (e) { var d = D.getElementById('wg-err') || D.body.appendChild(Object.assign(D.createElement('pre'), { id: 'wg-err' })); d.style.cssText = 'position:fixed;left:0;top:0;z-index:99;max-width:60vw;white-space:pre-wrap;background:#300;color:#f88;font:12px monospace;padding:6px'; d.textContent += (e.message || e) + ' @' + (e.lineno || '') + ':' + (e.colno || '') + '\n' + (e.error && e.error.stack ? e.error.stack.split('\n').slice(0, 4).join('\n') : '') + '\n'; });      // a screenshot shows a page error (TOOLS.md, the headless checks)
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
  // THE ORDER OF BATTLE AS PLACES (1 November 2026): a site of the other side in the register's oob (data/wargame/_SCHEMA.md "oob")
  // that stands at its own point, not at a place already drawn, becomes a place too: the missile bases, refineries, power plants
  // and the repression apparatus's headquarters can then be targeted, struck and opened like any other. KIND_OF maps its model.
  var KIND_OF = { site_missile: 'missile', site_refinery: 'oil', site_oil_terminal: 'oil', site_power: 'power', site_substation: 'power', site_hq: 'hq', site_army: 'army', site_airbase: 'airbase', site_naval_base: 'naval', site_radar: 'radar', site_airdef: 'airdef' };
  function oobPlaces(R) {
    var out = [];
    ((R.oob || {}).red || []).forEach(function (f) {
      var k = KIND_OF[f.type]; if (!k) return;
      (f.at || []).forEach(function (a, i) {
        if (!Array.isArray(a)) return;
        out.push({ id: f.id + (i ? '-' + i : ''), n: f.name, o: f.o, k: k, ll: a, v: f.org ? 3 : 2, why: f.note || '', st: f.status || '', src: f.src, org: f.org || null, model: f.type, oob: f.id });
      });
    });
    return out;
  }
  var PL = {}, PLACES = (R.places || []).concat(oobPlaces(R)).map(function (p) {
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

  // ======================================================================== MODELS-BEGIN (build/test_wargame.mjs runs this block in node)
  // THE MODELS (rebuilt 1 November 2026 from the fact audits, data/wargame/audit-*-2026-11-01.md, part (b) of each).
  // A model is plain arithmetic a reader can check: HOW IT WORKS prints model.how in these same words. A plan is four things
  // the reader sets: the FORCES (rows of the register's order of battle, oob, switched on or off: lv.off), the TARGETS (target
  // sets in the order the reader ranks them: lv.tg), the RULES (lv.<rule id>) and the experts whose numbers run it (params()).
  // The backtests (the real wars the models must reproduce) are in build/test_wargame.mjs, run by wargame.py --check.
  var MODELS = {};
  var OOB = R.oob || { blue: [], red: [] };
  function offOf(lv) { var o = {}; String(lv.off || '').split('.').forEach(function (k) { if (k) o[k] = 1; }); return o; }
  function tgList(M, lv) { return String(lv.tg == null ? M.targets.filter(function (t) { return t.on; }).map(function (t) { return t.id; }).join(',') : lv.tg).split(',').filter(function (k) { return M.targets.some(function (t) { return t.id === k; }); }); }
  // the weight of each target set: by its rank among the sets switched on, each one 0.55 of the one above it (of four sets the
  // first gets about half the strikes, then 27%, 15% and 8%), so the order the reader sets is the order the strikes follow
  function tgW(M, lv) {
    var ids = tgList(M, lv), n = ids.length, tot = 0, w = { _n: n };
    M.targets.forEach(function (t) { w[t.id] = 0; });
    ids.forEach(function (k, i) { tot += Math.pow(0.55, i); });
    ids.forEach(function (k, i) { w[k] = Math.pow(0.55, i) / tot; });
    return w;
  }
  // what the chosen forces add up to: c[role] = rows switched on, c[role + '#'] = their counts (null counts as one), c._wait =
  // the longest wait of a row that is days away (a force three days or more away delays the start)
  function rolesOf(M, lv) {
    var off = offOf(lv), c = { _wait: 0 };
    (OOB.blue || []).forEach(function (f) {
      var ro = M.role(f); if (!ro || off[f.id]) return;
      c[ro] = (c[ro] || 0) + 1; c[ro + '#'] = (c[ro + '#'] || 0) + (typeof f.count === 'number' ? f.count : 1);
      if ((f.days || 0) >= 3) c._wait = Math.max(c._wait, f.days);
    });
    return c;
  }
  function jit(r, a) { return 1 - a + 2 * a * r(); }

  // ---------------------------------------------------------------- the Islamic Republic vs the US and Israel (one step a day)
  MODELS.iran = {
    unit: 'day', max: 75,
    role: function (f) {
      var t = f.type;
      if (f.o === 'IL') return /^(f35|f15e|f16)$/.test(t) ? 'ilair' : t === 'arrow' ? 'arrow' : 'illow';
      if (f.o === 'AE') return 'gulfad';
      return { cvn_nimitz: 'carrier', lhd_wasp: 'amphib', ddg_burke: 'ddg', ssgn_ohio: 'sub', b2: 'b2', b1b: 'bomber', b52: 'bomber', f15e: 'usair', a10: 'usair',
        kc135: 'tanker', e3: 'awacs', mq9: 'isr', patriot: 'patriot', thaad_battery: 'thaad' }[t] || null;
    },
    presets: [['all', tr('The US and Israel'), ''], ['il', tr('Israel alone'), function (f) { return f.o !== 'IL'; }], ['us', tr('The US alone'), function (f) { return f.o === 'IL' && /^(f35|f15e|f16)$/.test(f.type); }]],
    targets: [
      { id: 'launch', n: tr('Launchers and missile bases'), k: ['missile'], on: 1, buys: tr('Fewer missiles at Israel and the Persian Gulf. In 2026 the launch rate fell 92% in about 11 days, mostly because launchers were watched from the air, not destroyed.'), costs: tr('Needs aircraft and drones over western Iran all day; drones are shot down doing it.') },
      { id: 'airdef', n: tr('Air defence and radars'), k: ['airdef', 'radar'], on: 1, buys: tr('Every other strike gets cheaper and fewer aircraft and drones are lost.'), costs: tr('The first days go to defences while the regime fires its biggest salvos.') },
      { id: 'nuke', n: tr('Nuclear sites'), k: ['nuclear'], on: 1, buys: tr('Wrecks the enrichment halls. Only B-2s with GBU-57s reach the deepest ones.'), costs: tr('The GBU-57 stock is small, Pickaxe Mountain lies over 100 m under granite, and where the enriched uranium sits is not known.') },
      { id: 'navy', n: tr('The IRGC Navy and Hormuz'), k: ['naval', 'choke'], on: 0, buys: tr('Fewer boats to attack ships. With escorts and mine clearance the strait fills up again.'), costs: tr('Strikes alone do not reopen the strait: mines stay until they are cleared.') },
      { id: 'lead', n: tr('Leadership'), k: ['capital', 'hq'], on: 0, buys: tr('Killed commanders slow the regime for a while.'), costs: tr('In 2026 killing the Supreme Leader on day one did not break the regime; a new one was chosen in nine days.') },
      { id: 'repress', n: tr('The repression apparatus'), k: ['hq'], org: 1, on: 0, buys: tr('The Thar-Allah headquarters, the Basij bases, FARAJA and the intelligence ministry keep people off the streets. This is the one target set that helps an uprising.'), costs: tr('It only pays if people are in the streets to use the opening (see Rules: the street).') },
      { id: 'grid', n: tr('The power grid'), k: ['power'], on: 0, buys: tr('Cuts power to the regime’s industry; 86% of Iran’s power comes from gas.'), costs: tr('Darkens the homes of the people who would have to rise, and hands the regime a grievance.') },
      { id: 'oil', n: tr('Oil exports'), k: ['oil', 'port'], on: 0, buys: tr('Kharg ships most of the regime’s crude. Cutting it cuts the money that pays the IRGC.'), costs: tr('Invites strikes on Gulf energy (Ras Laffan, Ras Tanura and Abqaiq were hit in 2026) and pushes oil up.') }
    ],
    rules: [
      { id: 'first', n: tr('Who fires first'), o: [['blue', tr('They strike first')], ['ir', tr('The Islamic Republic strikes first')]] },
      { id: 'len', n: tr('How long the campaign is planned'), o: [['7', tr('A week')], ['3', tr('3 days')], ['14', tr('Two weeks')], ['open', tr('Until the aims are met')]] },
      { id: 'hz', n: tr('The Strait of Hormuz'), o: [['escort', tr('Escorts and mine clearance')], ['strike', tr('Strike the IRGC Navy only')], ['none', tr('Leave it')]] },
      { id: 'def', n: tr('Where the interceptors go first'), o: [['both', tr('Split evenly')], ['il', tr('Israel first')], ['gulf', tr('Gulf energy and bases first')]] },
      { id: 'street', n: tr('The street'), o: [['none', tr('No call to the streets')], ['call', tr('The opposition calls people out')], ['strike', tr('A call and a general strike')]] },
      { id: 'net', n: tr('The internet for Iranians'), o: [['none', tr('Nothing done')], ['push', tr('Satellite internet and broadcasts pushed in')]] },
      { id: 'talks', n: tr('Talks while fighting'), o: [['none', tr('No talks')], ['mediate', tr('Qatar and Pakistan mediate')]] },
      { id: 'raid', n: tr('A raid for the enriched uranium'), o: [['no', tr('No')], ['yes', tr('Yes, if it can be found')]] }
    ],
    outcomes: [
      { id: 'deal', n: tr('A deal'), c: '#46CC82', w: tr('The fighting stops with limits on the nuclear program and the enriched uranium gone.') },
      { id: 'cease', n: tr('A ceasefire, nothing settled'), c: '#E8DC82', w: tr('The guns stop. The program and the regime are still there, and five rounds in 18 months say it can start again.') },
      { id: 'fall', n: tr('The regime falls'), c: '#F4C430', w: tr('The Islamic Republic loses its grip on power.') },
      { id: 'long', n: tr('Still fighting'), c: '#FF5A48', w: tr('No end after 75 days.') }
    ],
    goals: [
      { id: 'bomb', n: tr('Stop the bomb'), s: function (A, c) { return A.nuke * 0.5 + (1 - A.heu) * 0.5; } },
      { id: 'free', n: tr('Help Iranians bring down the regime'), s: function (A, c, n) { return c.fall / n; } },
      { id: 'short', n: tr('A short war'), s: function (A) { return -A.days; } },
      { id: 'lives', n: tr('Fewest deaths'), s: function (A) { return -(A.kIR + A.kBlue); } },
      { id: 'oil', n: tr('Keep oil calm'), s: function (A) { return -A.oil; } }
    ],
    how: [
      tr('A plan is the forces you send, the target sets in the order you rank them, and the rules. The first set on the list gets the largest share of each day’s strikes.'),
      tr('Strike sorties a day: Israel about 200 on day one and about 60 on later days (its daily number in the experts’ numbers sets the level); each US carrier about 45; US jets in Jordan and the Persian Gulf 40, halved without tankers; bombers 20; destroyers fire Tomahawks the first three days.'),
      tr('Air defence only drops to a pop-up floor: it never reaches zero, and while it lasts it shoots down drones often and jets rarely (in 2026 an F-15E and an A-10, and 49 MQ-9s by August).'),
      tr('Launchers are mostly pinned down, not destroyed: the more aircraft and drones watch the launch areas, the fewer launch. Its first day is its top salvo, as big when it is struck first (480 missiles on 28 February 2026); after that each launcher has to reload from its tunnel, so a day is 60% of the top salvo times the launchers not pinned down.'),
      tr('Its missiles split between Israel and, once the US is in, the Persian Gulf. Each area has its own interceptors: the experts’ total, split by where you send them first. Defenders engage about 45% of the missiles (the rest fall on open ground), Israel about 1.3 interceptors per missile, Patriot two. When an area runs low, more get through.'),
      tr('Enrichment halls fall to strikes, but the deepest only to B-2 raids with GBU-57s (three nights of bombs). The enriched uranium survives unless a raid finds it.'),
      tr('Hormuz is a flow, not a switch. It starts at about half of normal (blockade since 14 July, more than thirty ships hit in October, mines laid). Each day the IRGC Navy hits ships and the flow falls; escorts and mine clearance bring it back slowly. Strikes only thin the boats.'),
      tr('The regime falls only when the street outgrows its power to repress. The street grows with a call to protest, a general strike, internet getting through and money running out; it shrinks with arrests and with a rally after strikes on homes and power. Repression shrinks only when its own organs are hit or the money to pay them stops. Killing leaders barely moves it, as in 2026.'),
      tr('The campaign stops near its planned length: before it, a small daily chance of a ceasefire; after it, a large one, except in the runs (about one in five) where it overruns its plan. Oil spikes, interceptors running out and mediation add to it. A deal needs the halls wrecked and the uranium gone, and is likelier with open talks.'),
      tr('Each plan is run 1,000 times with different luck. The run shown on the map is the most typical one.')
    ],
    init: function (P, lv, r) {
      var c = rolesOf(this, lv), w = tgW(this, lv);
      if (!w._n) { w.launch = 0.5; w.airdef = 0.5; }
      var il = c.ilair ? 1 : 0, us = (c.carrier || c.b2 || c.bomber || c.usair || c.ddg || c.sub) ? 1 : 0;
      var near = (c.carrier || c.usair || c.ddg || c.amphib || c.patriot || c.tanker) ? 1 : 0;      // US forces in the region the regime can reach (B-2s from Missouri are not)
      // the interceptors by area: the experts' total split by the layers you send (Israel's upper tier 0.42 of it with Arrow, US THAAD
      // and the destroyers' SM-3; the Gulf 0.4 with US Patriot and THAAD and the Gulf states' own), then shifted by where they go first
      var lay = { arrow: 0.3, thaad: 0.12, ddg: 0.1, patriot: 0.3, gulfad: 0.1, illow: 0.08 };
      var ilS = (c.arrow ? lay.arrow : 0) + (c.thaad ? lay.thaad : 0) + (c.ddg ? lay.ddg : 0) + (c.illow ? lay.illow : 0);
      var gS = (c.patriot ? lay.patriot : 0) + (c.gulfad ? lay.gulfad : 0) + (c.thaad ? 0.04 : 0);
      var mv = lv.def === 'il' ? 0.15 : lv.def === 'gulf' ? -0.15 : 0;
      var poolI = P.interceptors * Math.max(0, ilS + mv * (gS > 0 ? 1 : 0)), poolG = P.interceptors * Math.max(0, gS - mv * (ilS > 0 ? 1 : 0));
      var wait = c._wait || 0;
      return { d: 0, P: P, lv: lv, c: c, w: w, il: il, us: us, near: near, wait: wait, ad: P.ir_ad, lch: P.ir_launchers + wait * 1.1, lch0: P.ir_launchers + wait * 1.1, supp: 0,
        bm: P.ir_bm, dr: P.ir_drones, enr: 1, deep: 1, raids: c.b2 ? 3 : 0, heuGone: 0, raidDone: 0, R: P.cohesion, R0: P.cohesion,
        Pr: ({ none: 0.12, call: 0.26, strike: 0.36 }[lv.street] || 0.12) + (lv.net === 'push' ? 0.03 : 0), split: 0,
        over: r() < 0.14 + (near ? 0.08 : 0), flow: 0.45, flowMin: 0.45, boats: 1, dmg: 0, exp: 1, grid: 1, avail: 1, intI: poolI, intG: poolG, intI0: poolI, intG0: poolG,
        upI: c.arrow || c.thaad || c.ddg ? 1 : 0.55, upG: c.patriot || c.gulfad || c.thaad ? 1 : 0.4,
        oil: 0, oilPeak: 0, kIR: 0, kBlue: 0, fired: 0, stopped: 0, leaders: 0, sorties: 0, intOut: 0, jets: 0, uav: 0, used: 0, fire1: 0, fire11: 0, hits: 0 };
    },
    step: function (s, r, emit) {
      var P = s.P, lv = s.lv, c = s.c, w = s.w; s.d++; var d = s.d;
      // the attackers' sorties
      var ilS = s.il ? P.il_sorties * (d === 1 ? 1.3 : d <= 3 ? 0.9 : 0.4) : 0;
      var usS = s.us ? (45 * (c.carrier || 0) + (c.usair ? 40 * (c.tanker ? 1 : 0.5) * s.avail : 0) + (c.bomber ? 20 : 0) + (c.ddg ? (d <= 3 ? 30 : 6) : 0) + (c.sub && d <= 2 ? 25 : 0)) : 0;
      var C = (ilS + usS) * ((lv.first === 'ir' && d === 1) ? 0.8 : 1) * jit(r, 0.15);
      s.sorties += C;
      var E = {}; this.targets.forEach(function (t) { E[t.id] = C * (w[t.id] || 0); });
      var eff = clamp(1 - 1.5 * s.ad, 0.3, 1);
      // the Islamic Republic fires first in the day, with what yesterday left it
      // its top salvo comes from launchers set up before the war; after day one each launcher must reload from its tunnel (0.6)
      var cap = P.ir_salvo * (d === 1 ? 0.95 : 0.6) * (1 - s.supp) * (s.lch / Math.max(1, s.lch0));
      var salvo = Math.round(Math.min(cap * jit(r, 0.2), s.bm));
      if (d === 1) s.fire1 = salvo; if (d === 11) s.fire11 = salvo;
      if (salvo > 0) {
        var gShare = s.near ? 0.4 * P.gulf_hits : 0.05, sG = Math.round(salvo * gShare), sI = salvo - sG;
        var ar = function (n, stock, shots, up) { if (!n) return { stop: 0, need: 0 }; var need = n * 0.45 * shots; var rate = P.intercept * up * (stock >= need ? 1 : stock / need); return { stop: Math.round(n * rate), need: need }; };
        var aI = ar(sI, s.intI, 1.3, s.upI), aG = ar(sG, s.intG, 2, s.upG);
        s.used += Math.min(aI.need, s.intI) + Math.min(aG.need, s.intG);
        s.intI = Math.max(0, s.intI - aI.need); s.intG = Math.max(0, s.intG - aG.need);
        var stop = aI.stop + aG.stop, leak = salvo - stop; s.bm -= salvo; s.fired += salvo; s.stopped += stop; s.hits += leak;
        s.kBlue += leak * (0.35 + 0.35 * r());
        s.avail = Math.max(0.5, s.avail - (sG - aG.stop) * 0.002);
        if (!s.intOut && ((s.intI0 && s.intI < s.intI0 * 0.12) || (s.intG0 && s.intG < s.intG0 * 0.12))) { s.intOut = d; emit({ t: 'note', w: tr('Interceptors are running low. More missiles get through.'), why: tr('Each area keeps its own stock, and nothing new arrives inside the war.'), big: 1, param: 'interceptors' }); }
        var parts = Math.min(4, 1 + Math.floor(salvo / 60));
        for (var j = 0; j < parts; j++) {
          var toG = s.us && j % 3 === 2;
          emit({ t: 'missile', side: 'IR', from: pick(r, ofTeam('red', ['missile'])) || pick(r, ofTeam('red')), to: pick(r, toG ? ofTeam('blue', ['airbase', 'naval', 'oil']) : function (p) { return p.o === 'IL' && (p.k === 'city' || p.k === 'airbase' || p.k === 'hq'); }) || pick(r, ofTeam('blue')),
            n: Math.round(salvo / parts), stop: Math.round(stop / parts), res: leak > 0 ? 'partial' : 'intercepted', w: j === 0 && d <= 2 ? tf('{n} ballistic missiles in the air.', { n: fmt(salvo) }) : null, why: j === 0 && d === 1 ? tr('Its first day is its biggest, whoever starts: launchers are ready before anyone can pin them down.') : null });
        }
      }
      var dr = Math.min(s.dr, Math.round(cap * 1.5 * jit(r, 0.4)));
      if (dr > 0) {
        s.dr -= dr; var dLeak = dr * (s.us ? 0.08 : 0.04); s.dmg += s.us ? dLeak * 0.05 : 0; s.kBlue += dLeak * 0.05;
        emit({ t: 'drone', side: 'IR', from: pick(r, ofTeam('red', ['missile', 'airbase'])), to: pick(r, s.us ? ofTeam('blue', ['oil', 'airbase']) : ofSide('IL', ['city', 'airbase'])), n: dr, stop: Math.round(dr - dLeak), res: 'partial' });
      }
      // the strikes, set by set
      s.ad = Math.max(0.04, s.ad * Math.exp(-(E.airdef / 350 + C / 3000)));
      var cov = (E.launch + 0.12 * (C - E.launch) + (c.isr ? 25 : 0) + (s.il ? 25 : 0)) * eff;      // Israel flies its own drones over the launch areas
      s.supp += (cov / (cov + 11) * 0.95 - s.supp) * 0.4;
      var lk = Math.min(s.lch, s.lch * E.launch * eff / 2500 * jit(r, 0.4)); s.lch -= lk;
      s.bm = Math.max(0, s.bm - s.bm * E.launch * eff / 9000);
      if (E.nuke > 0) s.enr = Math.max(c.b2 ? 0 : 0.5, s.enr - s.enr * E.nuke * eff / 450 * jit(r, 0.5));
      if (s.raids > 0 && E.nuke > 0 && d >= 2 && d % 2 === 0) {
        s.raids--; s.enr = Math.max(0, s.enr - 0.25); s.deep = Math.max(0, s.deep - 0.15 * jit(r, 0.3));
        emit({ t: 'strike', side: 'US', kind: 'b2', from: 'diego-garcia', to: pick(r, ofTeam('red', ['nuclear'])), n: 6, res: 'hit', w: tr('B-2 bombers drop GBU-57 bunker busters on a buried site.'), why: tr('Nothing else reaches halls 80 to 100 metres down, and only by sending several bombs down the same shaft.'), big: 1 });
      }
      if (lv.raid === 'yes' && s.us && !s.raidDone && d === 6) {
        s.raidDone = 1; var found = r() < 1 - P.heu_survives + 0.2;
        if (found && r() < 0.7) s.heuGone = 1; s.kBlue += 15 + 40 * r();
        emit({ t: 'strike', side: 'US', kind: 'raid', from: pick(r, ofSide('US', ['airbase'])), to: pick(r, ofTeam('red', ['nuclear'])), n: 4, res: s.heuGone ? 'hit' : 'miss', w: s.heuGone ? tr('A raid seizes the enriched uranium.') : tr('A raid finds no enriched uranium where it looked.'), why: tr('Its location is not known: McKenzie says it lies under rubble, and digging it out would be seen.'), big: 1 });
      }
      var pk = Math.min(0.6, E.lead / 250);
      if (r() < pk) { s.leaders++; s.R = Math.max(0.15, s.R - 0.01); s.Pr = Math.max(0, s.Pr - 0.004); emit({ t: 'kill', side: s.il ? 'IL' : 'US', to: pick(r, function (p) { return p.team === 'red' && (p.k === 'capital' || p.k === 'hq') && !p.org; }), w: tr('A senior commander is killed in a strike.'), why: tr('In 2026 the regime replaced its Supreme Leader in nine days; one more death changes little.') }); }
      var rp = E.repress * eff / 6000 * jit(r, 0.4); s.R = Math.max(0.15, s.R - rp);
      var gl = Math.min(s.grid, E.grid * eff / 900 * jit(r, 0.3)); s.grid -= gl;
      var xl = Math.min(s.exp, E.oil * eff / 700 * jit(r, 0.3)); s.exp -= xl; s.dmg += xl * 25;
      s.R = Math.max(0.15, s.R - xl * 0.25 - gl * 0.15);
      s.kIR += C * (0.3 + 0.35 * r()) + gl * 400;
      // what the strikes hit, for the map: one wave per set with a share of the day, the biggest set first
      var from = s.il ? function () { return pick(r, ofSide('IL', ['airbase'])); } : function () { return pick(r, ofTeam('blue', ['naval', 'airbase'])); };
      var sets = this.targets.filter(function (t) { return E[t.id] > 4; }).sort(function (a, b) { return E[b.id] - E[a.id]; }).slice(0, 4);
      sets.forEach(function (t, i) {
        var tg = pick(r, function (p) { return p.team === 'red' && t.k.indexOf(p.k) >= 0 && (!t.org || p.org) && (t.id !== 'lead' || !p.org); }) || pick(r, ofTeam('red', t.k));
        if (tg) emit({ t: 'strike', side: s.il && (!s.us || i % 2 === 0) ? 'IL' : 'US', set: t.id, from: from(), to: tg, n: Math.round(E[t.id]), res: 'hit', quiet: i > 0 || d > 3,
          w: i === 0 ? tf('{n} strikes, most on {set}.', { n: fmt(C), set: t.n.toLowerCase() }) : null, why: i === 0 && d <= 3 ? t.buys : null });
      });
      // air losses: the pop-up floor still bites
      if (c.isr && r() < 0.35 * s.ad / 0.2) { s.uav++; }
      if (r() < C / 2000 * s.ad / 0.2 * 0.3) { s.jets++; emit({ t: 'note', side: 'IR', w: tr('A US or Israeli jet is shot down.'), why: tr('A pop-up air defence never fully goes away.') }); }
      // the Persian Gulf, Hormuz and the allies
      if (s.us && r() < P.gulf_hits * 0.12 * (1 + 2 * w.oil)) { s.dmg += 5 + 5 * r(); s.kBlue += 3 * r(); emit({ t: 'missile', side: 'IR', from: pick(r, ofTeam('red', ['missile'])), to: pick(r, function (p) { return p.team !== 'red' && p.k === 'oil'; }), n: 8, stop: 6, res: 'partial', w: tr('Missiles and drones hit Gulf energy.'), why: w.oil > 0 ? tr('Strikes on its oil invite strikes on its neighbours’ oil.') : null, param: 'gulf_hits' }); }
      s.boats *= Math.exp(-(E.navy / 400 + (lv.hz !== 'none' ? 0.01 : 0)));
      var shipsHit = (1 + (d <= 30 ? 1 : 0.5)) * P.hormuz * s.boats * jit(r, 0.5);
      var heal = lv.hz === 'escort' ? 0.02 * (c.ddg ? 1 : 0.4) : 0.004;
      s.flow = clamp(s.flow - shipsHit * 0.015 + heal * (1 - s.flow), 0.02, 1); s.flowMin = Math.min(s.flowMin, s.flow);
      if (d === 2 || (d % 9 === 0 && shipsHit > 1.2)) emit({ t: 'naval', side: 'IR', from: pick(r, ofTeam('red', ['naval'])), to: pick(r, function (p) { return p.k === 'choke' && p.o === 'IR'; }), n: Math.round(shipsHit * 3) + 1, res: 'hit', w: tf('Ships hit near Hormuz. Traffic is at {p} of normal.', { p: pc(s.flow) }), why: lv.hz === 'escort' ? tr('Escorts and mine clearance bring it back, slowly.') : tr('Only escorts and mine clearance bring traffic back.'), param: 'hormuz' });
      if (r() < P.proxies * 0.3) { s.dmg += 1.5; s.intG = Math.max(0, s.intG - 4); emit({ t: 'missile', side: 'HT', from: pick(r, ofSide('HT')) || pick(r, ofTeam('red', ['missile'])), to: pick(r, function (p) { return p.team === 'blue' && (p.o === 'SA' || p.k === 'naval' || p.k === 'oil'); }), n: 3, stop: 2, res: 'partial', quiet: 1, param: 'proxies' }); }
      s.dmg *= 0.97;
      s.oil = (1 - s.flow) * 45 + s.dmg - 0.55 * 45; s.oilPeak = Math.max(s.oilPeak, s.oil);
      // the street and the regime's power to repress it
      s.Pr = clamp(s.Pr + 0.002 * (1 - s.exp) + (lv.net === 'push' ? 0.002 : 0) + (lv.street !== 'none' && d % 7 === 1 ? 0.02 : 0) - 0.006 * s.R * s.Pr - gl * 0.5 - (s.leaders ? 0 : 0), 0, 1);
      s.split = clamp(s.split + Math.max(0, s.Pr - s.R) * 0.02 + (E.repress > 10 ? 0.001 : 0), 0, 1);
      if (lv.street !== 'none' && d % 7 === 1) emit({ t: 'note', side: 'IR', to: 'tehran', w: lv.street === 'strike' ? tr('Strikes and night protests spread from Tehran.') : tr('Crowds answer the call in Tehran and other cities.'), why: s.Pr > s.R * 0.85 ? tr('The crowds now outgrow what the Basij and the police can hold.') : tr('Repression still outweighs the street.'), quiet: d > 1 });
    },
    end: function (s, r) {
      var P = s.P, lv = s.lv, w = s.w;
      var gap = s.Pr - 0.85 * s.R;
      if (r() < 0.0006 * (1 + 0.1 * Math.min(10, s.leaders)) * (s.R0 / Math.max(0.15, s.R))) return 'fall';
      if (gap > 0 && r() < 0.15 * Math.pow(gap, 1.5) * (1 + 4 * s.split)) return 'fall';
      var L = lv.len === 'open' ? 0 : +lv.len || 7, h;
      if (L && !s.over) h = s.d < L ? 0.004 + P.cease * 0.01 : 0.35;
      else if (L) h = s.d < L ? 0.004 + P.cease * 0.01 : 0.006 + P.cease * 0.018;
      else h = 0.006 + P.cease * 0.018;
      h += (s.oil > 30 ? 0.015 : 0) + (s.intOut ? 0.04 : 0) + (lv.talks === 'mediate' ? 0.01 : 0) - (w.repress + w.lead > 0.4 ? 0.006 : 0);
      if (s.d >= 2 && r() < Math.max(0.003, h)) return (s.enr < 0.35 && (s.heuGone || r() < 0.2) && r() < (lv.talks === 'mediate' ? 1 : 0.35)) ? 'deal' : 'cease';
      if (s.d >= this.max) return 'long';
      return null;
    },
    stats: function (s, r) {
      var heu = s.heuGone ? 0 : (r() < s.P.heu_survives * (s.enr * 0.3 + 0.7) ? 1 : 0);
      return { days: s.d, fired: s.fired, stopped: s.stopped, nuke: 1 - s.enr, deep: 1 - s.deep, heu: heu, flow: s.flowMin, oil: Math.max(0, s.oilPeak), kIR: s.kIR, kBlue: s.kBlue, leaders: s.leaders,
        intOut: s.intOut ? 1 : 0, used: s.used, jets: s.jets, uav: s.uav, rep: s.R / s.R0, street: s.Pr, fire1: s.fire1, fire11: s.fire11, wait: s.wait };
    },
    orb: function (s) {
      var P = s.P, i0 = (s.intI0 + s.intG0) || 1;
      return { mis: { r: P.ir_bm ? s.bm / P.ir_bm : 1 }, drn: { r: P.ir_drones ? s.dr / P.ir_drones : 1 }, ad: { b: (s.intI + s.intG) / i0, r: P.ir_ad ? s.ad / P.ir_ad : 1 } };
    },
    say: function (s) { return tf('{f} missiles fired so far, {p} of them stopped. {q} of the launchers are pinned down.', { f: fmt(s.fired), p: s.fired ? pc(s.stopped / s.fired) : pc(0), q: pc(s.supp) }); },
    board: function (s) {
      return [[tr('Day'), N(s.d)], [tr('Missiles fired'), fmt(s.fired)], [tr('Stopped'), s.fired ? pc(s.stopped / s.fired) : '–'], [tr('Interceptors left'), fmt(s.intI + s.intG)],
        [tr('Launchers pinned down'), pc(s.supp)], [tr('Enrichment destroyed'), pc(1 - s.enr)], [tr('Hormuz traffic'), pc(s.flow)], [tr('Power to repress'), pc(s.R / s.R0)]];
    },
    summary: function (A, lv, cnt, n) {
      return [[tr('How long'), tf('{n} days (typical)', { n: N(Math.round(A.days)) })], [tr('Missiles fired at Israel and the Persian Gulf'), fmt(A.fired)], [tr('Share stopped'), pc(A.fired ? A.stopped / A.fired : 0)],
        [tr('Enrichment destroyed'), pc(A.nuke)], [tr('Deepest halls destroyed'), pc(A.deep)], [tr('Enriched uranium survives'), pc(A.heu)], [tr('Hormuz traffic at its lowest'), pc(A.flow)],
        [tr('Oil price rise at the peak'), N('+' + Math.round(A.oil) + '%')], [tr('Interceptors used'), fmt(A.used)], [tr('Interceptors run low'), A.intOut ? tf('{p} of runs', { p: pc(A.intOut) }) : tr('never')],
        [tr('Power to repress at the end'), pc(A.rep)], [tr('US and Israeli jets lost'), (Math.round(A.jets * 10) / 10).toLocaleString('en-US')],
        [tr('Deaths in Iran (model)'), fmt(A.kIR)], [tr('Deaths in Israel, the Persian Gulf states and US forces (model)'), fmt(A.kBlue)]];
    }
  };

  // ---------------------------------------------------------------- Russia vs Ukraine (one step a week)
  var SEAS = [0.8, 0.7, 0.6, 0.75, 0.95, 1.15, 1.4, 1.3, 1.1, 1.05, 1.25, 0.95];      // the shape of DeepState's 2025 monthly gains, mean 1
  var SECW = { kostiantynivka: 0.26, zaporizhzhia: 0.24, kupiansk: 0.14, lyman: 0.14, pokrovsk: 0.12, kharkiv: 0.08, kherson: 0.02 };
  MODELS.ukraine = {
    unit: 'week', max: 52,
    role: function (f) { return { patriot: 'patriot', iris_t_sys: 'sam', nasams: 'sam', f16: 'jets', mirage2000: 'jets', su24: 'su24', storm_shadow: 'storm', atacms: 'atacms', flamingo: 'missiles', neptune: 'missiles', fp1: 'drones' }[f.type] || null; },
    presets: [['all', tr('Everything Ukraine has'), ''], ['nodeep', tr('No long-range strikes'), function (f) { return /^(su24|storm_shadow|atacms|flamingo|neptune|fp1)$/.test(f.type); }], ['noad', tr('No Western air defence'), function (f) { return /^(patriot|iris_t_sys|nasams)$/.test(f.type); }]],
    targets: [
      { id: 'port', n: tr('Baltic oil export ports'), k: ['oil', 'port'], on: 1, buys: tr('Hits the money directly: Primorsk and Ust-Luga ship the crude that funds the war.'), costs: tr('Russia moves air defence to cover them, and repairs take weeks, not months.') },
      { id: 'ref', n: tr('Refineries'), k: ['oil'], on: 1, buys: tr('Fuel shortages and export bans inside Russia.'), costs: tr('Hurts Russia’s own fuel more than its export money.') },
      { id: 'air', n: tr('Air bases and glide-bomb carriers'), k: ['airbase'], on: 1, buys: tr('Fewer Su-34s dropping glide bombs on the front: fewer Russian gains.'), costs: tr('Needs missiles more than drones: Neptune, Flamingo, Storm Shadow, ATACMS.') },
      { id: 'shahed', n: tr('Shahed launch and production sites'), k: ['airbase', 'industry', 'missile'], on: 0, buys: tr('Fewer drones on Ukrainian cities and power.'), costs: tr('The sites are spread out and quickly replaced.') },
      { id: 'occ', n: tr('Power and supply in occupied areas'), k: ['power', 'bridge', 'port'], on: 0, buys: tr('Slows the supply of the Russian assault.'), costs: tr('Small effect each week.') }
    ],
    rules: [
      { id: 'us', n: tr('The United States'), o: [['purl', tr('Sells weapons, shares intelligence (today)')], ['full', tr('Full aid and intelligence')], ['intel', tr('Intelligence cut')], ['cut', tr('Everything cut')]] },
      { id: 'eu', n: tr('European money'), o: [['holds', tr('The 90 billion euro loan holds')], ['assets', tr('Frozen Russian assets used too')], ['tired', tr('Fatigue after the spring 2027 elections')]] },
      { id: 'ad', n: tr('What air defence protects first'), o: [['cities', tr('Cities')], ['grid', tr('The power grid')], ['front', tr('The front and industry')]] },
      { id: 'ru', n: tr('Russia'), o: [['grind', tr('Grinds on as today')], ['push', tr('A big summer offensive')], ['mob', tr('A partial mobilisation')], ['pause', tr('Pauses for talks')]] },
      { id: 'mob', n: tr('Ukraine’s mobilisation'), o: [['today', tr('As today')], ['young', tr('Contracts from age 18')], ['rotate', tr('Rotate and demobilise')]] },
      { id: 'post', n: tr('On the ground'), o: [['elastic', tr('Elastic defence with drones')], ['hold', tr('Hold every town')], ['counter', tr('Local counteroffensives')]] },
      { id: 'sanc', n: tr('US oil sanctions'), o: [['waive', tr('Waived (today, since 17 October)')], ['enforce', tr('Enforced')], ['tariff', tr('Tariffs on the buyers too')]] },
      { id: 'talks', n: tr('Talks'), o: [['none', tr('No real talks')], ['line', tr('A ceasefire on the line')], ['donetsk', tr('A ceasefire if Ukraine leaves Donetsk')]] },
      { id: 'len', n: tr('How far ahead'), o: [['52', tr('1 year')], ['26', tr('6 months')], ['104', tr('2 years')]] }
    ],
    outcomes: [
      { id: 'cease', n: tr('A ceasefire on the line'), c: '#E8DC82', w: tr('The front freezes where it is.') },
      { id: 'ru', n: tr('Russia breaks through'), c: '#FF5A48', w: tr('Russia takes almost twice today’s pace of ground or more.') },
      { id: 'grind', n: tr('The grind goes on'), c: '#B9B7A6', w: tr('Small Russian gains at a huge cost, no end.') },
      { id: 'ua', n: tr('Ukraine pushes back'), c: '#4C8DFF', w: tr('Ukraine ends with more ground than it started with.') }
    ],
    goals: [
      { id: 'ground', n: tr('Hold the most ground'), s: function (A) { return -A.gain; } },
      { id: 'econ', n: tr('Drain Russia’s war money'), s: function (A) { return -A.econ; } },
      { id: 'power', n: tr('Keep the lights on'), s: function (A) { return A.grid; } },
      { id: 'peace', n: tr('A ceasefire soonest'), s: function (A, c, n) { return c.cease / n; } }
    ],
    how: [
      tr('One step a week. Russia takes ground at today’s pace, made bigger or smaller by every choice, and every choice is measured against today, so “as today” gives today’s pace (DeepState: about 93 km² a month net in 2026). Summer and November take the most ground, late winter the least.'),
      tr('Ukraine’s strength is its soldiers, its weapons and its power grid (which makes its drones). US and European money add weapons; a cut makes each Russian push go further.'),
      tr('Russia’s strength is its recruits against its losses (about 35,000 to 40,000 recruits a month, close to its losses) and the money for sign-up bonuses. A mobilisation adds men after about ten weeks.'),
      tr('Each week Russia sends about 1,800 drones, 35 ballistic missiles and cruise missiles. Only Patriot stops ballistic missiles, and its PAC-3 rounds run out: about 12 a month arrive from the US (more with full aid; European-funded ones are assumed to start after three months). What gets through hits the grid or the cities, worse in winter, and repairs come back slowly.'),
      tr('Ukraine’s long-range strikes follow your target list: ports cut Russia’s oil money, refineries its fuel, air bases the glide bombs on the front, Shahed sites the drones. Without US intelligence they hit less.'),
      tr('Russia’s war money moves with oil revenue: export ports hit, refineries down and sanctions. On its own it wears down by only a few points a year.'),
      tr('Counterattacks happen when Ukraine has drones and men to spare; local counteroffensives make them likelier and costlier. When Ukraine runs short of men and weapons together, a sector can break.'),
      tr('The outcome is read from the ground: “Russia breaks through” is almost twice today’s pace or more; “Ukraine pushes back” is a net gain for Ukraine. Every week there is a chance of a ceasefire, higher with talks and when either side is worn out.'),
      tr('Each future draws its own luck for the assault and the counterattacks, and is run 1,000 times. The one shown on the map is the most typical.')
    ],
    init: function (P, lv, r) {
      var c = rolesOf(this, lv), w = tgW(this, lv);
      var arms = { full: 1, purl: P.us_aid, intel: P.us_aid, cut: 0 }[lv.us], intel = lv.us === 'intel' || lv.us === 'cut' ? 0 : 1;
      var eu = { holds: P.eu_aid, assets: Math.min(1, P.eu_aid + 0.2), tired: P.eu_aid }[lv.eu];
      var deep = P.ua_deep * (c.drones ? 1 : 0.35) * (c.missiles || c.storm || c.atacms ? 1.15 : 0.9);
      return { d: 0, P: P, lv: lv, c: c, w: w, arms: arms, intel: intel, eu: eu, deep: deep, armsNow: 0.35 + 0.4 * P.us_aid + 0.35 * P.eu_aid,
        men: P.ua_men, econ: P.ru_econ, pool: 1, grid: 1, gridMin: 1, pac: 40, ref: 0, port: 0, glide: 0, shahed: 0, gain: 0, sec: {}, cas: 0, civ: 0, broke: 0, brokeEver: 0,
        max: +lv.len || 52, luck: Math.exp((r() - 0.5) * 1.2), ulk: Math.exp((r() - 0.5) * 0.8), refin: 0, mon: lv.mon == null ? new Date().getUTCMonth() : +lv.mon, counter: 0 };
    },
    step: function (s, r, emit) {
      var P = s.P, lv = s.lv, c = s.c, w = s.w; s.d++; var d = s.d;
      var m = (s.mon + Math.floor((d - 1) / 4.33)) % 12, winter = m >= 10 || m <= 1;
      var eu = lv.eu === 'tired' && d > 20 ? P.eu_aid * 0.55 : s.eu;
      var arms = 0.35 + 0.4 * s.arms + 0.35 * eu, armsF = arms / s.armsNow;
      var uaF = clamp(Math.pow(s.men / Math.max(0.05, P.ua_men), 0.5) * Math.pow(armsF, 0.4) * (0.85 + 0.15 * s.grid) * (c.jets ? 1 : 0.95), 0.35, 1.6);
      var econF = clamp(0.6 + 0.4 * s.econ / Math.max(0.05, P.ru_econ), 0.4, 1.2);
      var ruF = { grind: 1, push: 1.35, mob: d > 10 ? 1.2 : 1, pause: 0.4 }[lv.ru] * P.ru_push;
      var pushF = ruF * econF * clamp(s.pool, 0.6, 1.3);
      var post = { hold: 0.9, elastic: 1.12, counter: 1 }[lv.post] || 1;
      var g = P.ru_gain / 4.33 * SEAS[m] * pushF / Math.pow(uaF, 1.2) * (1 - s.glide) * post * s.luck * jit(r, 0.4);
      if (!s.broke && uaF < 0.65 && r() < (0.65 - uaF) * 0.15) { s.broke = 6; s.brokeEver = 1; emit({ t: 'ground', side: 'RU', to: pick(r, function (p) { return p.k === 'city' && p.team === 'blue' && p.v >= 3; }), w: tr('The front breaks in one sector. Russian units pour through.'), why: tr('Ukraine is short of soldiers and weapons at the same time.'), big: 1, param: 'ua_men' }); }
      if (s.broke > 0) { g *= 2.5; s.broke--; }
      var pc0 = (lv.post === 'counter' ? 0.08 : 0.03) * s.ulk / Math.sqrt(s.luck) * P.ua_counter / 0.35 * Math.min(1.3, uaF) * (s.men > 0.35 ? 1 : 0.3);
      if (r() < pc0) { var back = (lv.post === 'counter' ? 100 + 300 * r() : 50 + 150 * r()); g -= back; s.counter++; s.men -= lv.post === 'counter' ? 0.003 : 0.001; emit({ t: 'ground', side: 'UA', w: tf('A Ukrainian counterattack takes back about {n} km².', { n: fmt(back) }), why: tr('Drones and men to spare: Ukraine hits where Russia is thin.'), param: 'ua_counter' }); }
      s.gain += g;
      for (var k in SECW) s.sec[k] = (s.sec[k] || 0) + g * SECW[k] * jit(r, 0.3);
      var lossW = P.ru_cas * 7 * pushF * jit(r, 0.15); s.cas += lossW;
      var recW = P.ru_cas * 7 * econF * (lv.ru === 'mob' && d > 10 ? 1.25 : 1);
      s.pool = clamp(s.pool + (recW - lossW) / 700000 * 3, 0.5, 1.4);
      // the air war: drones, ballistic missiles, the grid
      var drones = P.ru_drones * 7 * (1 - s.shahed), bal = 35 * jit(r, 0.3);
      var dStop = P.ua_intercept * (c.sam ? 1 : 0.92) * (c.jets ? 1 : 0.95), leakD = drones * (1 - dStop);
      var need = bal * 0.6 * 2, bStopR = c.patriot ? Math.min(0.65, s.pac / Math.max(1, need)) : 0.06;
      s.pac = Math.max(0, s.pac - Math.min(s.pac, need)) + (s.arms > 0 ? 3 * s.arms / Math.max(0.1, P.us_aid) : 0) + (d > 13 && lv.eu !== 'tired' ? 3 : 0);
      var leakB = bal * (1 - bStopR);
      var gHit = (leakD * 0.00012 + leakB * 0.0025) * ({ cities: 1, grid: 0.6, front: 1.2 }[lv.ad] || 1) * (winter ? 1.5 : 1);
      s.grid = clamp(s.grid - gHit + 0.012, 0.2, 1); s.gridMin = Math.min(s.gridMin, s.grid);
      s.civ += (leakD * 0.02 + leakB * 0.5) * ({ cities: 0.7, grid: 1.2, front: 1.1 }[lv.ad] || 1);
      emit({ t: 'drone', side: 'RU', from: pick(r, function (p) { return p.team === 'red' && (p.k === 'airbase' || p.k === 'missile'); }), to: pick(r, function (p) { return p.team === 'blue' && (p.k === 'city' || p.k === 'capital' || p.k === 'power'); }), n: Math.round(drones), stop: Math.round(drones * dStop), res: 'partial', quiet: 1 });
      if (r() < 0.55) emit({ t: 'missile', side: 'RU', from: pick(r, ofTeam('red', ['airbase', 'missile'])), to: pick(r, function (p) { return p.team === 'blue' && (p.k === 'capital' || p.k === 'power' || p.k === 'city'); }), n: Math.round(bal), stop: Math.round(bal * bStopR), res: 'partial',
        w: winter && gHit > 0.03 ? tf('A combined strike on the grid. Power is at {p}.', { p: pc(s.grid) }) : null, why: !c.patriot ? tr('Without Patriot almost no ballistic missile is stopped.') : s.pac < need ? tr('PAC-3 rounds are short: about 12 a month arrive.') : null });
      // Ukraine's long-range strikes
      var cap = s.deep * (0.85 + 0.15 * s.grid) * (s.intel ? 1 : 0.6) * jit(r, 0.3);
      s.ref = clamp(s.ref * 0.85 + cap * w.ref * 0.12, 0, 0.6); s.port = clamp(s.port * 0.8 + cap * w.port * 0.12, 0, 0.6);
      s.glide = clamp(s.glide * 0.9 + cap * w.air * 0.03 * (c.storm || c.atacms || c.missiles ? 1.5 : 0.6), 0, 0.15);
      s.shahed = clamp(s.shahed * 0.9 + cap * w.shahed * 0.04, 0, 0.2);
      if (w.occ) g *= 1 - 0.05 * cap * w.occ;
      if (cap > 0.1) { s.refin++; var set = this.targets.filter(function (t) { return w[t.id] > 0; }).sort(function (a, b) { return w[b.id] - w[a.id]; })[0];
        if (set) emit({ t: c.drones ? 'drone' : 'strike', side: 'UA', set: set.id, from: pick(r, function (p) { return p.team === 'blue' && p.k !== 'capital'; }), to: pick(r, function (p) { return p.team === 'red' && set.k.indexOf(p.k) >= 0; }) || pick(r, ofTeam('red', ['oil'])), n: Math.round(150 + 450 * cap), stop: Math.round(60 * cap), res: 'hit', quiet: d % 4 !== 1, w: d % 4 === 1 ? tf('Ukrainian long-range strike on {set}.', { set: set.n.toLowerCase() }) : null, why: d % 4 === 1 ? set.buys : null, param: 'ua_deep' }); }
      var rev = (1 - s.port * 0.6 - s.ref * 0.25) * ({ waive: 1, enforce: 0.9, tariff: 0.82 }[lv.sanc] || 1);
      s.econ = clamp(s.econ + (rev - 1) * 0.01 - 0.0008 - (lv.ru === 'mob' && d > 10 ? 0.001 : 0), 0, 1);
      s.men = clamp(s.men - 0.0015 - (armsF < 0.8 ? 0.002 : 0) + (lv.mob === 'young' && d > 8 ? 0.0025 : 0) - (lv.mob === 'rotate' ? 0.0008 : 0) - (s.broke ? 0.003 : 0) - (s.grid < 0.4 && winter ? 0.001 : 0), 0, 1);
      if (g > 0) emit({ t: 'ground', side: 'RU', w: tf('{n} km² taken this week.', { n: fmt(g) }), quiet: 1 });
    },
    end: function (s, r) {
      var P = s.P, lv = s.lv;
      var h = P.cease * 0.012 + ({ none: 0, line: 0.01, donetsk: 0.02 }[lv.talks] || 0) + (lv.ru === 'pause' ? 0.01 : 0) + (s.econ < 0.3 ? 0.01 : 0) + (s.men < 0.3 ? 0.01 : 0) + (s.grid < 0.4 ? 0.006 : 0);
      if (s.d >= 4 && r() < h) return 'cease';
      if (s.d >= s.max) {
        var pace = P.ru_gain / 4.33 * s.max;
        return s.gain > pace * 1.8 ? 'ru' : s.gain < 0 ? 'ua' : 'grind';
      }
      return null;
    },
    stats: function (s) { return { days: s.d, gain: s.gain, cas: s.cas, econ: s.econ, men: s.men, refin: s.refin, grid: s.gridMin, civ: s.civ, counter: s.counter, sec: s.sec, perMonth: s.gain / Math.max(1, s.d) * 4.33, casDay: s.cas / Math.max(1, s.d) / 7 }; },
    orb: function (s) { return { land: { b: s.P.ua_men ? s.men / s.P.ua_men : 1, r: clamp(s.pool, 0, 1) } }; },
    say: function (s) { return tf('{g} km² taken so far. Ukraine’s power is at {p}.', { g: fmt(Math.max(0, s.gain)), p: pc(s.grid) }); },
    board: function (s) {
      return [[tr('Week'), N(s.d)], [tr('Ground taken'), fmt(s.gain) + ' km²'], [tr('Russian losses'), fmt(s.cas)], [tr('Ukraine’s soldiers'), pc(s.men)], [tr('Ukraine’s power'), pc(s.grid)], [tr('Russia’s war money'), pc(s.econ)], [tr('PAC-3 rounds'), fmt(s.pac)]];
    },
    summary: function (A) {
      return [[tr('How long it ran'), tf('{n} weeks (typical)', { n: N(Math.round(A.days)) })], [tr('Ground Russia takes'), fmt(A.gain) + ' km²'], [tr('A month, on average'), fmt(A.perMonth) + ' km²'], [tr('Russian killed and wounded (model)'), fmt(A.cas)],
        [tr('Ukraine’s power at its lowest'), pc(A.grid)], [tr('Civilians killed by strikes (model)'), fmt(A.civ)], [tr('Long-range strike weeks'), fmt(A.refin)], [tr('Russia’s war money at the end'), pc(A.econ)], [tr('Ukraine’s soldiers at the end'), pc(A.men)]];
    }
  };

  // ---------------------------------------------------------------- China vs Taiwan (one step a day)
  var ECH = [3, 6, 10, 13, 17, 20, 24, 27, 31, 34, 38, 41, 45, 48, 52, 55];      // the landing echelons: one every 3.5 days (CSIS)
  MODELS.taiwan = {
    unit: 'day', max: 90,
    role: function (f) {
      if (f.o === 'US') return { cvn_nimitz: 'carrier', lhd_wasp: 'usamphib', jassm: 'asm' }[f.type] || null;
      if (f.o === 'JP') return f.type === 'jmsdf_ddg' ? 'jpnavy' : 'jpasm';
      return { f16: 'twair', idf: 'twair', mirage2000: 'twair', m1a2t: 'twland', himars: 'twland', hf2_coastal: 'ascm', patriot: 'twad', altius: 'drones', kangding: 'twnavy' }[f.type] || null;
    },
    presets: [['all', tr('Everyone who could fight'), ''], ['alone', tr('Taiwan alone'), function (f) { return f.o !== 'TW'; }]],
    targets: [
      { id: 'fleet', n: tr('The invasion fleet at sea'), k: ['naval', 'beach'], on: 1, buys: tr('Ships sunk in the strait drown the troops on them. In the CSIS runs this decided the war.'), costs: tr('The anti-ship missiles run out in the first week.') },
      { id: 'ports', n: tr('Embarkation ports and ships loading'), k: ['port'], on: 1, buys: tr('Fewer ships ever sail, if there is warning to strike before they do.'), costs: tr('Strikes on the Chinese mainland are an escalation of their own.') },
      { id: 'rf', n: tr('Rocket Force launchers'), k: ['missile'], on: 0, buys: tr('Fewer missiles on Taiwan’s air bases and on US bases.'), costs: tr('Launchers hide and move; it takes many strikes for a few kills.') },
      { id: 'air', n: tr('PLA air bases'), k: ['airbase'], on: 0, buys: tr('Weaker cover over the landing beaches.'), costs: tr('Hardened shelters and runway repairs blunt it.') }
    ],
    rules: [
      { id: 'open', n: tr('What China does'), o: [['inv', tr('An invasion')], ['block', tr('A blockade')], ['quar', tr('A coast guard quarantine')], ['strike', tr('Missile strikes only')]] },
      { id: 'bases', n: tr('China strikes US bases in Japan and Guam'), o: [['yes', tr('Yes, on day one')], ['no', tr('No, to keep Japan out')]], when: function (lv) { return lv.open !== 'quar'; } },
      { id: 'warn', n: tr('Warning'), o: [['visible', tr('Weeks of visible build-up')], ['surprise', tr('A surprise')]] },
      { id: 'season', n: tr('Season'), o: [['apr', tr('April')], ['oct', tr('October')], ['other', tr('Another month (rough seas)')]], when: function (lv) { return lv.open === 'inv'; } },
      { id: 'us', n: tr('The United States'), o: [['maybe', tr('Decides later (the chance in the numbers)')], ['now', tr('Fights from day one')], ['late', tr('Fights after two weeks')], ['arms', tr('Sends arms only')], ['out', tr('Stays out')]] },
      { id: 'jassm', n: tr('JASSM-ER used against ships'), o: [['yes', tr('Yes (CSIS base case)')], ['no', tr('No, only LRASM')]] },
      { id: 'subs', n: tr('US submarines sent'), o: [['most', tr('Most of the Pacific fleet')], ['few', tr('A few')]] },
      { id: 'jp', n: tr('Japan'), o: [['bases', tr('Lends its bases')], ['fight', tr('Fights')], ['out', tr('Stays out')]] },
      { id: 'ph', n: tr('The Philippines'), o: [['yes', tr('Opens its bases and the Luzon Strait sites')], ['no', tr('Stays out')]] },
      { id: 'tw', n: tr('Taiwan’s defence'), o: [['today', tr('As today')], ['porc', tr('A porcupine: mines, coastal missiles, drones')], ['res', tr('Reserves called up early')], ['stock', tr('Fuel and coal stockpiled')]] },
      { id: 'conv', n: tr('Under a blockade'), o: [['escort', tr('US-escorted convoys')], ['commercial', tr('Commercial ships only')], ['airlift', tr('An airlift')]], when: function (lv) { return lv.open === 'block'; } },
      { id: 'will', n: tr('Taiwan’s leaders'), o: [['hold', tr('Hold out')], ['talk', tr('Negotiate when the power fails')]] }
    ],
    outcomes: [
      { id: 'hold', n: tr('Taiwan holds'), c: '#4C8DFF', w: tr('The invasion fails, or the blockade breaks.') },
      { id: 'stale', n: tr('A stalemate'), c: '#E8DC82', w: tr('Neither side gets what it came for.') },
      { id: 'cease', n: tr('Stopped by a ceasefire'), c: '#B9B7A6', w: tr('Pressure stops it before it is settled.') },
      { id: 'falls', n: tr('Taiwan falls or gives in'), c: '#FF5A48', w: tr('Beijing gets what it wanted.') }
    ],
    goals: [
      { id: 'hold', n: tr('Taiwan stays free'), s: function (A, c, n) { return c.hold / n - c.falls / n; } },
      { id: 'cost', n: tr('Fewest US losses'), s: function (A) { return -(A.usLoss + A.carriers * 3000); } },
      { id: 'short', n: tr('A short war'), s: function (A) { return -A.days; } },
      { id: 'power', n: tr('Keep Taiwan’s lights on'), s: function (A) { return A.power; } }
    ],
    how: [
      tr('An invasion opens with missiles on Taiwan’s air bases, radars and ports, and on US bases in Japan and Guam if China chooses to (which brings Japan in). Taiwan’s air defence stops a share; about half its air force is lost, mostly on the ground.'),
      tr('The landing comes in echelons, one every 3.5 days from day 3. The first carries the first wave; later ones carry what the surviving fleet can lift, more if a port has been taken (civilian ferries need one).'),
      tr('Each echelon loses ships to Taiwan’s coastal missiles, to US anti-ship missiles from Japan, Guam and the bombers (if Japan stays out, most US jets cannot reach), to US submarines and to Japan if it fights. The whole fleet sails each time, so ships sunk shrink every later echelon.'),
      tr('Troops ashore fight Taiwan’s defenders, who grow as reserves arrive. Without a port and with the fleet sunk, the beachhead runs short of supply and wears down. If it outgrows the defenders it takes the cities one by one, south to north: Taiwan falls when Taipei does.'),
      tr('A blockade runs down Taiwan’s energy: the gas is gone in about 11 days and power halves; the coal runs out near week nine (later with stockpiles). Escorted convoys can break it, at a cost in ships.'),
      tr('A quarantine is coast guard boarding, not war. It ends when Beijing stops, when Taiwan accepts it, or when it becomes a blockade.'),
      tr('Whether the US fights is drawn once per run when the choice is “decides later”, and each war draws its own luck for the crossing and the defenders. Each plan is run 1,000 times; the one shown is the most typical.')
    ],
    init: function (P, lv, r) {
      var c = rolesOf(this, lv), w = tgW(this, lv);
      var usDay = lv.us === 'now' ? 1 : lv.us === 'late' ? 14 : lv.us === 'maybe' ? Math.max(3, Math.round(P.us_days * 2 + 2)) : 999;
      if (lv.us === 'maybe' && r() >= P.us_in) usDay = 999;
      var jp = { fight: 1, bases: 0.5, out: 0 }[lv.jp];
      if (lv.bases === 'yes' && lv.open === 'inv') jp = 1;
      var vis = lv.warn === 'visible';
      return { d: 0, P: P, lv: lv, c: c, w: w, usDay: usDay, usIn: false, jp: jp, vis: vis, twAir: 1, mis: P.pla_missiles * (1 - 0.15 * w.rf * (vis ? 1 : 0.5)), lift: 1 - 0.15 * w.ports * (vis ? 1 : 0.3),
        asm: c.asm ? (lv.jassm === 'no' ? 450 : P.us_asm) : 0, carriers: c.carrier ? (vis ? 2 : 1) : 0, cHit: 0, usAir: 0, ashore: 0, landed: 0, sunk: 0, port: 0, prog: 0, cities: 0,
        kl: 0.55 + 0.75 * r(), defend: 100 * (vis || lv.tw === 'res' ? 1.25 : 1) * (c.twland ? 1 : 0.85) * (0.85 + 0.3 * r()), res: 0, will: clamp(P.tw_will * jit(r, 0.2), 0.2, 1), power: 1, powerMin: 1, usLoss: 0, kTW: 0, kPLA: 0, plaShips: 0, merch: 0, broke: 0, esc: 0, plan: lv.open };
    },
    step: function (s, r, emit) {
      var P = s.P, lv = s.lv, c = s.c, w = s.w; s.d++; var d = s.d;
      if (!s.usIn && d >= s.usDay) { s.usIn = true; emit({ t: 'note', side: 'US', w: tr('US forces join the fight.'), why: lv.us === 'maybe' ? tr('The decision was drawn once for this run, with the chance in the numbers.') : null, big: 1, param: 'us_in' }); }
      var land = s.jp >= 0.5 ? 1 : 0.25;
      if (s.plan === 'inv' || s.plan === 'strike') {
        if (d <= 4) {
          var m = Math.round(s.mis * [0, 0.4, 0.25, 0.12, 0.08][d]); s.mis -= m;
          var stopR = P.tw_ad * (c.twad ? 1 : 0.6) * (lv.tw === 'porc' ? 1.1 : 1);
          s.twAir = Math.max(0.15, s.twAir - m * (1 - stopR) / P.pla_missiles * 1.2 * (s.vis ? 0.75 : 1) * (1 - 0.5 * w.air));
          s.kTW += m * (1 - stopR) * 0.6;
          for (var i = 0; i < 3; i++) emit({ t: 'missile', side: 'CN', from: pick(r, ofTeam('red', ['missile', 'airbase'])), to: pick(r, function (p) { return p.o === 'TW' && (p.k === 'airbase' || p.k === 'radar' || p.k === 'port'); }), n: Math.round(m / 3), stop: Math.round(m / 3 * stopR), res: 'partial',
            w: i === 0 && d === 1 ? tf('{n} missiles on Taiwan’s air bases, radars and ports.', { n: fmt(m) }) : null, why: i === 0 && d === 1 ? tr('China opens by trying to ground Taiwan’s air force before the landing.') : null });
          if (lv.bases === 'yes' && d <= 3 && lv.us !== 'out') {
            var lostA = Math.round((50 + 40 * r()) * (s.vis ? 0.8 : 1)); s.usAir += lostA; s.usLoss += 60 * r();
            emit({ t: 'missile', side: 'CN', from: pick(r, ofTeam('red', ['missile'])), to: pick(r, function (p) { return p.o === 'US' && p.k === 'airbase'; }), n: Math.round(m * 0.15), stop: Math.round(m * 0.04), res: 'partial', w: d === 1 ? tf('Missiles hit US bases in Japan and Guam: about {n} aircraft lost on the ground.', { n: fmt(lostA) }) : null, why: d === 1 ? tr('In the CSIS runs about 90% of US aircraft losses came on the ground.') : null, big: d === 1 });
          }
        }
      }
      if (s.plan === 'inv') {
        if (ECH.indexOf(d) >= 0 && s.lift > 0.06 && d <= 56) {
          var wave = P.pla_lift * (d === 3 ? 1 : 0.85 * s.lift * (s.port ? 1.8 : 1));
          var kill = (c.ascm ? (lv.tw === 'porc' ? 0.16 : 0.08) : 0.03) + 0.05 * s.twAir * (c.twair ? 1 : 0.4) + (c.twnavy && d <= 6 ? 0.02 : 0);
          if (s.usIn) {
            var shots = Math.min(s.asm, (140 * land + 30) * (lv.subs === 'most' ? 1 : 0.8)); s.asm -= shots;
            kill += shots / 900 * (0.6 + w.fleet) + (lv.subs === 'most' ? 0.12 : 0.05) + (lv.ph === 'yes' ? 0.02 : 0);
          }
          if (s.jp >= 1) kill += c.jpnavy ? 0.06 : 0.03;
          kill += (0.6 - P.pla_ready) * 0.15;
          if (lv.season === 'other') kill += 0.06;
          kill = clamp(kill * s.kl * jit(r, 0.2), 0.02, 0.85);
          var lost = wave * kill; s.lift = Math.max(0, s.lift * (1 - kill * 0.92));
          s.sunk += lost; s.kPLA += lost * 1000 * 0.3; s.plaShips = Math.round((1 - s.lift) * 86);
          var arr = wave - lost; s.ashore += arr; s.landed += arr;
          emit({ t: 'naval', side: 'CN', from: pick(r, ofTeam('red', ['port', 'naval'])), to: pick(r, function (p) { return p.k === 'beach'; }) || pick(r, ofSide('TW', ['city'])), n: Math.round(wave * 10), stop: Math.round(lost * 10), res: 'partial',
            w: tf('An echelon of {n},000 troops crosses. {p} are lost at sea.', { n: fmt(wave), p: pc(kill) }), why: s.usIn ? tr('US missiles and submarines join Taiwan’s coastal missiles against the fleet.') : tr('Only Taiwan’s own missiles and aircraft reach the fleet.') });
          if (s.usIn) emit({ t: 'strike', side: 'US', set: 'fleet', from: pick(r, ofSide('US', ['naval', 'airbase'])), to: pick(r, ofTeam('red', ['naval', 'port'])), n: 24, res: 'hit', quiet: 1, param: 'ship_kill' });
        }
        if (!s.port && s.ashore > 20 && r() < 0.05 * Math.min(1.5, s.ashore / Math.max(10, s.defend * 0.4))) { s.port = 1; emit({ t: 'ground', side: 'CN', to: pick(r, function (p) { return p.k === 'port' && p.o === 'TW'; }), w: tr('PLA troops take a port. Ferries can unload now.'), why: tr('Civilian ro-ro ferries need a port; this doubles what each echelon can land.'), big: 1 }); }
        if (!s.port && s.lift < 0.25) s.ashore *= 0.975;
        s.res = Math.min(150, s.res + (lv.tw === 'res' || s.vis ? 5 : 3) * (d >= 3 ? 1 : 0));
        var D = s.defend + s.res, will = clamp(s.will, 0.2, 1);
        var dA = Math.min(s.ashore, 0.02 * D * will * (0.6 + 0.4 * s.twAir) * jit(r, 0.3) + (s.usIn ? 0.02 * s.ashore * land : 0)); s.ashore -= dA; s.kPLA += dA * 400;
        var dD = 0.015 * s.ashore * (1 + 0.01 * d) * jit(r, 0.3); s.defend = Math.max(0, s.defend - dD); s.kTW += dD * 300;
        if (s.ashore > D * will * 0.9) { s.prog += 0.045 * Math.min(2, s.ashore / Math.max(1, D * will)); var nc = Math.floor(s.prog); if (nc > s.cities) { s.cities = nc; emit({ t: 'ground', side: 'CN', to: pick(r, function (p) { return p.o === 'TW' && (p.k === 'city' || p.k === 'capital'); }), w: [tr('Tainan and Kaohsiung fall.'), tr('Taichung falls.'), tr('Taipei falls.')][Math.min(2, nc - 1)], big: 1 }); } }
        s.will = clamp(s.will - (s.ashore > D * 0.8 ? 0.006 : 0.001) + (s.usIn ? 0.003 : 0), 0, 1);
        if (s.usIn && d <= 16 && s.carriers > s.cHit && r() < 0.05 * (s.carriers - s.cHit) * (s.mis > 0 ? 1 : 0.5)) { s.cHit++; s.usLoss += 2500; emit({ t: 'missile', side: 'CN', from: pick(r, ofTeam('red', ['missile'])), to: pick(r, ofSide('US', ['naval'])), n: 30, stop: 24, res: 'hit', w: tr('A US carrier is hit.'), why: tr('DF-21D and DF-26 missiles hunt carriers inside about 2,000 km. CSIS lost two in every base run.'), big: 1 }); }
        if (s.usIn) { s.usLoss += 30 * r(); if (r() < 0.2) s.usAir += Math.round(3 * r()); }
      } else if (s.plan === 'block') {
        var coal = P.energy_days * (lv.tw === 'stock' ? 1.5 : 1), lng = 11 * (lv.tw === 'stock' ? 1.5 : 1);
        s.power = d < lng ? 1 : d < coal ? 0.55 : d < 150 ? (lv.tw === 'stock' ? 0.35 : 0.2) : 0.1;
        if (lv.conv === 'airlift') s.power = Math.min(1, s.power + 0.05); else if (lv.conv === 'commercial') s.power = Math.min(1, s.power + 0.03);
        s.powerMin = Math.min(s.powerMin, s.power);
        s.will = clamp(s.will - (1 - s.power) * 0.008 + (s.usIn ? 0.002 : 0), 0, 1);
        if (d % 7 === 0) {
          emit({ t: 'naval', side: 'CN', from: pick(r, ofTeam('red', ['port', 'naval'])), to: pick(r, function (p) { return p.k === 'port' && p.o === 'TW'; }), n: 12, res: 'hit', w: tf('Tankers turned back. Taiwan’s power is at {p}.', { p: pc(s.power) }), why: d < lng ? tr('Gas lasts about 11 days; then power halves.') : tr('Coal runs out near week nine without stockpiles.') });
          if (s.usIn && lv.conv === 'escort') {
            s.merch += 5 + Math.round(10 * r()); s.usLoss += 80 * r(); s.kPLA += 100 * r();
            if (r() < 0.12 * (1 + 0.4 * s.jp) * (1 + 0.2 * (lv.ph === 'yes' ? 1 : 0))) { s.broke = 1; emit({ t: 'naval', side: 'US', from: pick(r, ofSide('US', ['naval'])), to: pick(r, function (p) { return p.k === 'port' && p.o === 'TW'; }), n: 6, res: 'hit', w: tr('Escorted convoys get through. The blockade breaks.'), why: tr('CSIS: convoys can restore power, at the cost of over a hundred merchant ships on each side.'), big: 1 }); }
            else if (r() < 0.25) { s.esc++; emit({ t: 'strike', side: 'CN', from: pick(r, ofTeam('red', ['airbase'])), to: pick(r, ofSide('US', ['naval'])), n: 12, res: 'partial', w: tr('Shots are fired between warships.'), big: 1 }); }
          }
        }
      } else if (s.plan === 'quar') {
        if (d % 3 === 0) emit({ t: 'naval', side: 'CN', from: pick(r, ofTeam('red', ['port'])), to: pick(r, function (p) { return p.k === 'port' && p.o === 'TW'; }), n: 4, res: 'hit', w: tr('Coast guard ships board and inspect ships bound for Taiwan.'), why: tr('Insurers and shippers count the risk; some ships go elsewhere.'), quiet: d % 6 !== 0 });
        s.power = Math.max(0.85, s.power - 0.002); s.powerMin = Math.min(s.powerMin, s.power); s.will = clamp(s.will - 0.002, 0, 1);
      } else if (s.plan === 'strike' && d > 4 && d <= 20) {
        var m2 = Math.round(s.mis * 0.06); s.mis -= m2; s.will = clamp(s.will - 0.004, 0, 1); s.kTW += m2 * 0.3;
        if (d % 2 === 0) emit({ t: 'missile', side: 'CN', from: pick(r, ofTeam('red', ['missile'])), to: pick(r, function (p) { return p.o === 'TW'; }), n: m2, stop: Math.round(m2 * P.tw_ad), res: 'partial', quiet: d % 4 !== 0 });
      }
    },
    end: function (s, r) {
      var P = s.P, lv = s.lv, d = s.d;
      if (d >= 5 && r() < P.cease * 0.0045 + (s.cHit > 1 ? 0.008 : 0)) return 'cease';
      if (lv.will === 'talk' && s.will < 0.35 && r() < 0.06) return 'falls';
      if (s.plan === 'inv') {
        if (s.cities >= 3) return 'falls';
        if (d > 10 && s.lift < 0.12 && s.ashore < Math.max(4, (s.defend + s.res) * 0.1)) return 'hold';
        if (d > 40 && s.ashore < (s.defend + s.res) * 0.3 && s.lift < 0.2) return 'hold';
        if (d >= this.max) return 'stale';
      } else if (s.plan === 'block') {
        if (s.broke) return 'hold';
        if (s.will < 0.3 && r() < 0.05) return 'falls';
        if (s.power < 0.45 && r() < 0.004 * (1.3 - s.will) * (lv.will === 'talk' ? 3 : 1)) return 'falls';      // a long blackout can bring a government to terms (CSIS, Lights Out?)
        if (d >= this.max) return 'stale';
      } else if (s.plan === 'strike') {
        if (d > 20 && r() < 0.05) return s.will < 0.4 ? 'falls' : 'stale';
        if (d >= 40) return 'stale';
      } else {
        if (d > 10 && r() < 0.012 + (s.usIn ? 0.008 : 0)) return 'hold';
        if (d > 20 && s.will < 0.5 && r() < 0.01) return 'falls';
        if (d > 30 && r() < 0.006) s.plan = 'block';
        if (d >= this.max) return 'stale';
      }
      return null;
    },
    stats: function (s) { return { days: s.d, landed: s.landed, sunk: s.sunk, ships: s.plaShips, carriers: s.cHit, usAir: s.usAir, usLoss: s.usLoss, kTW: s.kTW, kPLA: s.kPLA, power: s.powerMin, ashore: s.ashore, merch: s.merch }; },
    orb: function (s) {
      var P = s.P;
      return { mis: { r: P.pla_missiles ? s.mis / P.pla_missiles : 1, b: P.us_asm ? (s.asm / P.us_asm) : 1 }, sea: { r: s.lift }, land: { b: (s.defend + s.res) / 100 } };
    },
    say: function (s) { if (s.plan === 'inv') return s.ashore >= 1 ? tf('{l},000 PLA troops landed so far, {a},000 still ashore.', { l: fmt(s.landed), a: fmt(s.ashore) }) : s.landed >= 1 ? tf('{l},000 PLA troops landed so far, no beachhead left.', { l: fmt(s.landed) }) : tr('No PLA troops ashore yet.'); return tf('Taiwan’s power is at {p}, its will to fight at {w}.', { p: pc(s.power), w: pc(s.will) }); },
    board: function (s) {
      if (s.plan === 'inv') return [[tr('Day'), N(s.d)], [tr('Landed'), fmt(s.landed) + 'k'], [tr('Ashore now'), fmt(s.ashore) + 'k'], [tr('Lost at sea'), fmt(s.sunk) + 'k'], [tr('Defenders'), fmt(s.defend + s.res) + 'k'], [tr('Will to fight'), pc(s.will)], [tr('US in'), s.usIn ? tr('Yes') : tr('No')], [tr('US carriers hit'), N(s.cHit)]];
      return [[tr('Day'), N(s.d)], [tr('Power'), pc(s.power)], [tr('Will to fight'), pc(s.will)], [tr('US in'), s.usIn ? tr('Yes') : tr('No')], [tr('Clashes'), N(s.esc)]];
    },
    summary: function (A, lv) {
      if (lv.open === 'inv') return [[tr('How long'), tf('{n} days (typical)', { n: N(Math.round(A.days)) })], [tr('PLA troops landed'), fmt(A.landed) + ',000'], [tr('PLA troops lost at sea'), fmt(A.sunk) + ',000'], [tr('PLA amphibious ships sunk'), fmt(A.ships)],
        [tr('US carriers hit'), (Math.round(A.carriers * 10) / 10).toLocaleString('en-US')], [tr('US aircraft lost'), fmt(A.usAir)], [tr('US killed (model)'), fmt(A.usLoss)], [tr('Taiwan losses (model)'), fmt(A.kTW)]];
      return [[tr('How long'), tf('{n} days (typical)', { n: N(Math.round(A.days)) })], [tr('Taiwan’s power at its lowest'), pc(A.power)], [tr('Merchant ships lost'), fmt(A.merch)], [tr('US losses (model)'), fmt(A.usLoss)]];
    }
  };

  // ---------------------------------------------------------------- running a plan
  function runOneM(M, P, lv, seed, emit) {
    var r = rng(seed), s = M.init(P, Object.assign({}, lv), r), out = null, log = emit ? [] : null;
    var push = emit ? function (ev) {
      ev.d = s.d;
      if (ev.from && ev.from.id) ev.from = ev.from.id;      // models pick place records; the player and the map take ids
      if (ev.to && ev.to.id) ev.to = ev.to.id;
      log.push(ev);
    } : function () {};
    var snaps = emit ? [] : null;
    while (!out) {
      M.step(s, r, push);
      if (snaps) snaps.push({ d: s.d, say: M.say ? M.say(s) : '', b: M.board(s), o: M.orb ? M.orb(s) : null, sec: s.sec ? Object.assign({}, s.sec) : null, gain: s.gain, grid: s.grid, blk: s.plan === 'block' ? 1 - s.power : 0 });
      out = M.end(s, r);
      if (s.d > 400) out = M.outcomes[M.outcomes.length - 1].id;
    }
    return { out: out, st: M.stats(s, r), log: log, snaps: snaps, s: s };
  }
  function runManyM(M, P, lv, n, seed0) {
    var cnt = {}, sum = {}, days = [], seeds = [];
    M.outcomes.forEach(function (o) { cnt[o.id] = 0; });
    for (var i = 0; i < n; i++) {
      var sd = (seed0 + i * 7919) >>> 0, x = runOneM(M, P, lv, sd, null);
      cnt[x.out]++; days.push(x.st.days); seeds.push({ sd: sd, out: x.out, days: x.st.days });
      for (var k in x.st) if (typeof x.st[k] === 'number') sum[k] = (sum[k] || 0) + x.st[k];
    }
    var A = {}; for (var k2 in sum) A[k2] = sum[k2] / n;
    days.sort(function (a, b) { return a - b; });
    A.days = days[Math.floor(n / 2)];
    var top = M.outcomes.slice().sort(function (a, b) { return cnt[b.id] - cnt[a.id]; })[0].id;
    var typical = seeds.filter(function (x) { return x.out === top; }).sort(function (a, b) { return Math.abs(a.days - A.days) - Math.abs(b.days - A.days); })[0];
    return { n: n, cnt: cnt, A: A, top: top, seed: typical ? typical.sd : seed0 };
  }
  // each advisor's plan by their lean (planOf() applies it; an expert's own `plan` in the register wins): my reading, not their words
  var LEANPLAN = {
    iran: { hawk: { tg: 'launch,airdef,repress,nuke,oil', len: 'open', hz: 'escort', street: 'call', net: 'push', talks: 'none', raid: 'yes' },
      realist: { tg: 'nuke,launch,airdef', len: '7', hz: 'escort', street: 'none', net: 'push', talks: 'mediate', raid: 'no' },
      pessimist: { tg: 'launch,airdef,nuke', len: '3', hz: 'none', street: 'none', net: 'none', talks: 'none', raid: 'no', def: 'il' },
      dove: { tg: 'nuke', len: '3', hz: 'none', street: 'none', net: 'push', talks: 'mediate', raid: 'no' } },
    ukraine: { hawk: { us: 'full', eu: 'assets', ad: 'grid', post: 'counter', mob: 'young', sanc: 'tariff', talks: 'none', tg: 'port,air,ref,shahed' },
      realist: { us: 'purl', eu: 'holds', ad: 'grid', post: 'elastic', mob: 'today', sanc: 'enforce', talks: 'line', tg: 'port,ref,air' },
      pessimist: { us: 'purl', eu: 'tired', ad: 'cities', post: 'elastic', mob: 'today', sanc: 'waive', talks: 'line', tg: 'ref,air' },
      dove: { us: 'cut', eu: 'tired', ad: 'cities', post: 'hold', mob: 'today', sanc: 'waive', talks: 'donetsk', tg: 'ref' } },
    taiwan: { hawk: { open: 'inv', bases: 'yes', warn: 'surprise', season: 'apr', us: 'now', jassm: 'yes', subs: 'most', jp: 'fight', ph: 'yes', tw: 'porc', will: 'hold', tg: 'fleet,rf,ports' },
      optimist: { open: 'inv', bases: 'yes', warn: 'visible', season: 'apr', us: 'now', jassm: 'yes', subs: 'most', jp: 'bases', ph: 'yes', tw: 'today', will: 'hold', tg: 'fleet,ports' },
      realist: { open: 'block', bases: 'no', warn: 'visible', us: 'maybe', jp: 'bases', ph: 'yes', tw: 'stock', conv: 'escort', will: 'hold', tg: 'fleet,ports' },
      pessimist: { open: 'inv', bases: 'yes', warn: 'surprise', season: 'oct', us: 'late', jassm: 'no', subs: 'few', jp: 'bases', ph: 'no', tw: 'today', will: 'hold', tg: 'fleet' },
      dove: { open: 'quar', bases: 'no', warn: 'visible', us: 'arms', jp: 'out', ph: 'no', tw: 'today', will: 'talk', tg: 'fleet' } }
  };
  // ======================================================================== MODELS-END

  var MOD = MODELS[TID];
  if (!MOD) return;
  // the plan the page opens with: each rule's first option, the target sets marked on, and every force in the region now (a force
  // three days or more away, or one not yet delivered, starts switched off: the reader adds it and sees the wait)
  function offByDefault(f) { return (f.days || 0) >= 3 || /(on order|not operational|sea trials|handover)/i.test((f.status || '') + ' ' + (f.note || '')); }
  function planDefault() {
    var lv = {}; MOD.rules.forEach(function (l) { lv[l.id] = l.o[0][0]; });
    lv.tg = tgList(MOD, {}).join(',');
    lv.off = (OOB.blue || []).filter(function (f) { return MOD.role(f) && offByDefault(f); }).map(function (f) { return f.id; }).join('.');
    return lv;
  }
  S.lv = planDefault();
  function runOne(P, lv, seed, emit) { return runOneM(MOD, P, lv, seed, emit); }
  function runMany(P, lv, n, seed0) { return runManyM(MOD, P, lv, n, seed0); }

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
  var TABS = [['plan', tr('Plan')], ['watch', tr('Watch')], ['compare', tr('Compare')], ['replay', tr('Replay')]];
  S.tab = 'plan';
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
    typeT = setInterval(function () { i = Math.min(n, i + step); var j = i >= n ? n : text.lastIndexOf(' ', i); el.textContent = i >= n ? text : text.slice(0, Math.max(0, j)).replace(/[.,;:]$/, '') + '…'; if (i >= n) clearInterval(typeT); }, 22);
    setTimeout(function () { el.textContent = text; }, 1600);      // the whole line is there, whatever the timer did
  }
  // the caption bar: what is happening (typed out, the whole line there when it stops), why, and the lines behind it
  function feedSet(head, lines, why) {
    feed.innerHTML = '<p class="wg-fh"><b class="wg-fk">' + esc(tr('INTEL')) + '</b><span id="wg-fht"></span></p>' + (why ? '<p class="wg-why">' + esc(why) + '</p>' : '') + (lines || []).slice(0, 5).map(function (v) {
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
    if (live || i === ti - 1) feedSet(st.head, st.lines, st.why);
    if (V && V.gridDark) V.gridDark(st.grid != null ? st.grid : 1);
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
    else { stepAt(i, false); feedSet(TL.steps[i].head, TL.steps[i].lines, TL.steps[i].why); ti = i + 1; }
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
    S.tab = 'replay'; S.playing = id; drawPanel(); if (V && V.gridDark) V.gridDark(1);
    play(replayTL(h));
    if (narrow() && S.sheet === 'max') sheetTo('mid');
  }

  // ---------------------------------------------------------------- THE PANEL (rebuilt 1 November 2026, TOOLS.md "The second rebuild")
  // Plan is four steps, the same on every theatre: Forces (the order of battle as cards, each with its 3D model), Targets (the
  // target sets ranked), Rules, Advisors (one tap applies an advisor's whole plan). Then Watch (the typical run on the board and
  // the after-action report), Compare (up to four saved plans run 1,000 times side by side against a goal), Replay (past wars).
  var STEPS = [['forces', tr('Forces')], ['targets', tr('Targets')], ['rules', tr('Rules')], ['advisors', tr('Advisors')]];
  S.tab = 'plan'; S.step = 'forces'; S.saved = []; S.goal = (MOD.goals[0] || {}).id; S.cmp = null; S.who = '';
  var LAST = null;
  function drawPanel() {
    $$('.wg-tab', panel).forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === S.tab); });
    var wasAar = panel.classList.contains('aar');
    tog(panel, 'aar', S.tab === 'watch' && !!LAST);
    drawTab();
    if (wasAar !== panel.classList.contains('aar')) setTimeout(layout, 300);      // after its width has moved (wargame.css: .25s)
  }
  function pmFmt(p, v) { return p.max <= 1 && p.min >= 0 ? pc(v) : fmt(v) + (p.unit && !/count/.test(p.unit) ? ' ' + p.unit.replace(/^0-1$/, '') : ''); }
  function stale() { LAST = null; writeUrl(); var r = $('#wg-result'); if (r) tog(r, 'old', true); tog(panel, 'aar', false); }
  function seat(id) {
    var i = S.room.indexOf(id);
    if (i >= 0) S.room.splice(i, 1); else if (S.room.length < 10) S.room.push(id);
    S.lens = 'room'; stale(); drawTab();
    var b = $('#wg-bf-seat'); if (b) { var on = S.room.indexOf(id) >= 0; b.textContent = on ? tr('Take out of my briefing room') : tr('Seat in my briefing room'); tog(b, 'on', on); }
  }
  // ---- an advisor as a character: the framed portrait when a photo is cleared, else a drawn bust with the organisation's mark
  var LEANC = { hawk: '#FF6B4A', optimist: '#4C8DFF', realist: '#E8DC82', pessimist: '#B98CFF', dove: '#46CC82', skeptic: '#B9B7A6' };
  function orgMark(x) { var w = String(x.kind === 'org' ? (x.nEn || x.n) : (x.who || '')).replace(/\(.*?\)/g, ''); var m = w.match(/\b[A-Z]{2,6}\b/); return m ? m[0] : initials(w) || initials(x.nEn || x.n); }
  function bust(x) {
    var c = LEANC[x.lean] || '#B9B7A6', id = 'b' + Math.abs(hash(x.id));
    return '<svg class="wg-bust" viewBox="0 0 120 150" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".55"/><stop offset="1" stop-color="#0b0f14"/></linearGradient></defs>' +
      '<rect width="120" height="150" fill="url(#' + id + ')"/><path d="M60 30c14 0 23 11 23 26s-9 29-23 29-23-14-23-29 9-26 23-26z" fill="#1c232c" stroke="' + c + '" stroke-opacity=".7"/>' +
      '<path d="M14 150c2-30 20-48 46-50 26 2 44 20 46 50z" fill="#1c232c" stroke="' + c + '" stroke-opacity=".7"/><path d="M50 100l10 16 10-16" fill="none" stroke="' + c + '" stroke-opacity=".6"/>' +
      '<circle cx="93" cy="125" r="18" fill="#0b0f14" stroke="' + c + '" stroke-width="2"/><text x="93" y="129.5" text-anchor="middle" font-size="' + (orgMark(x).length > 3 ? 9 : 12) + '" font-weight="700" fill="#F3F1EA" font-family="system-ui,sans-serif">' + esc(orgMark(x)) + '</text></svg>';
  }
  function face(x, cls) {
    return '<span class="wg-face ' + (cls || '') + (x.kind === 'org' ? ' org' : '') + '" style="--lc:' + (LEANC[x.lean] || '#B9B7A6') + '">' + (x.face ? '<img src="' + esc(x.face) + '" alt="" loading="lazy" decoding="async" width="240" height="300">' : bust(x)) + '</span>';
  }
  function leanTag(l) { return l ? '<span class="wg-lean l-' + esc(l) + '">' + esc(tk('lean:', l)) + '</span>' : ''; }
  // ---- an advisor's plan: the plan their lean argues for, unless the register gives their own (expert.plan); my reading, not their words
  function planOf(x) {
    var T0 = LEANPLAN[TID] || {}, l = x.lean;
    var t = T0[l] || T0[{ optimist: 'hawk', skeptic: 'dove' }[l]] || T0.realist || {};
    if (TID === 'taiwan' && l === 'skeptic') t = T0.realist;
    var lv = Object.assign(planDefault(), t, x.plan || {});
    return lv;
  }
  function usePlan(x) {
    S.lv = planOf(x); S.who = x.id;
    if (S.room.indexOf(x.id) < 0) { S.room = [x.id]; }
    S.lens = 'room'; stale(); closeBrief(true); S.tab = 'plan'; S.step = 'forces'; drawPanel();
    feedSet(tf('{n}’s plan is on the board. Run it, or change any part.', { n: x.n }), []);
  }
  // ---- step 1: forces
  function offs() { return offOf(S.lv); }
  function setOff(id, off) { var o = offs(); if (off) o[id] = 1; else delete o[id]; S.lv.off = Object.keys(o).join('.'); S.who = ''; stale(); }
  function cnt(f) { return typeof f.count === 'number' ? fmt(f.count) : tr('not published'); }
  function when(f) { return (f.days || 0) >= 3 ? tf('{n} days away', { n: N(f.days) }) : tr('In the region now'); }
  function glyphFor(f) { var k = { air: 'airbase', munition: 'missile', sea: 'naval', land: 'army', site: 'industry' }[(V && V.kit && V.kit() && (V.kit().types[f.type] || {}).cat) || ''] || 'army'; return badge(k, teamOf(f.o), false).toDataURL(); }
  function forceCard(f, team) {
    var on = !offs()[f.id], live = team === 'blue' && !!MOD.role(f);
    return '<li class="wg-fc' + (live ? (on ? ' on' : ' off') : ' info') + ' t-' + team + '"><span class="wg-fc-pic"><img data-thumb="' + esc(f.type) + '" data-team="' + team + '" alt="" width="128" height="96"></span>' +
      '<span class="wg-fc-t"><b>' + esc(f.name) + '</b><span class="wg-fc-n num">' + esc(cnt(f)) + '</span><span class="wg-fc-w' + ((f.days || 0) >= 3 ? ' far' : '') + '">' + esc(when(f)) + '</span></span>' +
      (live ? '<button type="button" class="wg-fc-tg" data-force="' + esc(f.id) + '" aria-pressed="' + on + '" aria-label="' + esc(tf(on ? 'Leave out: {n}' : 'Send: {n}', { n: f.name })) + '">' + esc(on ? tr('Sent') : tr('Send')) + '</button>' : '') +
      '<button type="button" class="wg-fc-i" data-unit="' + esc(f.id) + '" aria-label="' + esc(tf('About {n}', { n: f.name })) + '">i</button></li>';
  }
  function forcesHtml() {
    var blue = (OOB.blue || []), red = (OOB.red || []).filter(function (f) { return !KIND_OF[f.type]; });
    var c = rolesOf(MOD, S.lv), wait = c._wait;
    return '<p class="wg-hint">' + esc(tr('Choose what you send. Each card is a real unit or stock, with the source behind it. A force days away delays the start, and the other side uses the wait.')) + '</p>' +
      '<div class="wg-presets">' + (MOD.presets || []).map(function (p) { return '<button type="button" class="wg-chip" data-preset="' + p[0] + '">' + esc(p[1]) + '</button>'; }).join('') + '</div>' +
      (wait ? '<p class="wg-warn">' + esc(tf('Starts in {n} days, when the last force arrives.', { n: N(wait) })) + '</p>' : '') +
      '<h4>' + esc(COAL[0]) + '</h4><ul class="wg-fcs">' + blue.map(function (f) { return forceCard(f, 'blue'); }).join('') + '</ul>' +
      '<h4>' + esc(COAL[1]) + '</h4><ul class="wg-fcs">' + red.map(function (f) { return forceCard(f, 'red'); }).join('') + '</ul>' +
      '<p class="wg-fine">' + esc(tf('Order of battle as of {d}, from my fact check of that day; every card opens its sources.', { d: day((OOB.asOf || R.today)) })) + '</p>';
  }
  function fillThumbs() {
    $$('img[data-thumb]', body).forEach(function (im) {
      if (im.getAttribute('src')) return;
      var t = im.getAttribute('data-thumb'), team = im.getAttribute('data-team'), u = V && V.thumb ? V.thumb(t, team) : null;
      im.src = u || glyphFor({ type: t, o: team === 'blue' ? (R.sides.filter(function (s) { return s.team === 'blue'; })[0] || {}).id : (R.sides.filter(function (s) { return s.team === 'red'; })[0] || {}).id });
      tog(im, 'glyph', !u);
    });
  }
  // ---- step 2: targets
  function targetsHtml() {
    var on = tgList(MOD, S.lv), w = tgW(MOD, S.lv), rest = MOD.targets.filter(function (t) { return on.indexOf(t.id) < 0; });
    var rows = on.map(function (id) { return MOD.targets.filter(function (t) { return t.id === id; })[0]; }).concat(rest);
    return '<p class="wg-hint">' + esc(tr('Rank what your side strikes. The first set gets about half of each day’s strikes, the next about a quarter. Switch off what you would not hit.')) + '</p><ol class="wg-tgs">' + rows.map(function (t, i) {
      var live = on.indexOf(t.id) >= 0;
      return '<li class="wg-tg' + (live ? ' on' : '') + '"><span class="wg-tg-r num">' + (live ? N(i + 1) : '–') + '</span><div class="wg-tg-t"><b>' + esc(t.n) + (live ? ' <span class="num">' + pc(w[t.id]) + '</span>' : '') + '</b>' +
        '<p class="wg-buys"><i>' + esc(tr('Buys')) + '</i> ' + esc(t.buys) + '</p><p class="wg-costs"><i>' + esc(tr('Costs')) + '</i> ' + esc(t.costs) + '</p></div>' +
        '<div class="wg-tg-b">' + (live ? '<button type="button" class="wg-ib" data-tgmove="' + t.id + '" data-d="-1" aria-label="' + esc(tf('Move up: {n}', { n: t.n })) + '"' + (i === 0 ? ' disabled' : '') + '>↑</button><button type="button" class="wg-ib" data-tgmove="' + t.id + '" data-d="1" aria-label="' + esc(tf('Move down: {n}', { n: t.n })) + '"' + (i === on.length - 1 ? ' disabled' : '') + '>↓</button>' : '') +
        '<button type="button" class="wg-chip' + (live ? ' on' : '') + '" data-tgon="' + t.id + '" aria-pressed="' + live + '">' + esc(live ? tr('On') : tr('Off')) + '</button></div></li>';
    }).join('') + '</ol>';
  }
  function tgMove(id, d) { var l = tgList(MOD, S.lv), i = l.indexOf(id), j = i + d; if (i < 0 || j < 0 || j >= l.length) return; l.splice(i, 1); l.splice(j, 0, id); S.lv.tg = l.join(','); S.who = ''; stale(); }
  function tgOn(id) { var l = tgList(MOD, S.lv), i = l.indexOf(id); if (i >= 0) l.splice(i, 1); else l.push(id); S.lv.tg = l.join(','); S.who = ''; stale(); }
  // ---- step 3: rules
  function rulesHtml() {
    return MOD.rules.filter(function (l) { return !l.when || l.when(S.lv); }).map(function (l) {
      return '<div class="wg-lv"><span>' + esc(l.n) + '</span><div class="wg-seg" role="radiogroup" aria-label="' + esc(l.n) + '">' + l.o.map(function (o) { return '<button type="button" role="radio" data-lv="' + l.id + '" data-o="' + o[0] + '" aria-checked="' + (S.lv[l.id] === o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>';
    }).join('') + datesHtml();
  }
  function datesHtml() {
    var Ds = (R.dates || []).filter(function (d) { return d.d >= R.today; });
    if (!Ds.length) return '';
    if (!S.date) S.date = Ds[0].d;
    return '<div class="wg-lv"><span>' + esc(tr('When it starts')) + '</span><div class="wg-dates">' + Ds.map(function (d) { return '<button type="button" class="wg-date" data-date="' + d.d + '" aria-pressed="' + (S.date === d.d) + '"><b class="num">' + esc(day(d.d)) + '</b><span>' + esc(d.why) + '</span></button>'; }).join('') + '</div></div>';
  }
  // ---- step 4: advisors
  function lensHtml() {
    var seated = S.room.map(function (id) { return EXID[id]; }).filter(Boolean);
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
  function marketsHtml() {
    var M = R.markets || []; if (!M.length) return '<p class="wg-hint">' + esc(tr('No market is priced today.')) + '</p>';
    return '<ul class="wg-mk">' + M.map(function (m) {
      var o = m.o[0];
      return '<li><b class="num">' + pc(o[1]) + '</b><span>' + esc(m.q) + (m.o.length > 1 ? ' <small>' + esc(o[0]) + '</small>' : '') + ' <a href="' + esc(m.u) + '" target="_blank" rel="' + esc(m.rel || 'noopener') + '">' + esc(m.w || tr('market')) + ' ↗</a></span></li>';
    }).join('') + '</ul>';
  }
  function advisorsHtml() {
    var h = '<p class="wg-hint">' + esc(tr('Each advisor briefs you and has a plan. “Use this plan” sets every step at once; seat several to run on their numbers.')) + '</p>';
    h += '<ul class="wg-advs">' + EX.map(function (x) {
      var on = S.room.indexOf(x.id) >= 0;
      return '<li class="wg-adv' + (on ? ' on' : '') + (S.who === x.id ? ' cur' : '') + '"><button type="button" class="wg-adv-p" data-brief="' + esc(x.id) + '" aria-label="' + esc(tf('Briefing from {n}', { n: x.n })) + '">' + face(x, 'card') + '</button>' +
        '<div class="wg-adv-t"><b>' + esc(x.n) + '</b><span>' + esc(x.who || '') + '</span>' + leanTag(x.lean) + '</div>' +
        '<div class="wg-adv-b"><button type="button" class="wg-chip wg-use" data-use="' + esc(x.id) + '">' + esc(S.who === x.id ? tr('Their plan is on') : tr('Use this plan')) + '</button><button type="button" class="wg-chip' + (on ? ' on' : '') + '" data-seat="' + esc(x.id) + '" aria-pressed="' + on + '">' + esc(on ? tr('Seated') : tr('Seat')) + '</button></div></li>';
    }).join('') + '</ul>';
    h += '<h4>' + esc(tr('Whose numbers run it')) + '</h4>' + lensHtml();
    if (S.lens === 'mine') h += slidersHtml();
    else if (S.lens === 'markets') h += '<p class="wg-hint">' + esc(tr('The experts’ average, moved wherever a betting market prices the same thing.')) + '</p>' + marketsHtml();
    else h += '<p class="wg-hint">' + esc(S.lens === 'all' ? tr('Every expert in the room, averaged equally.') : tr('The simulation runs on the average of the seated advisors’ numbers.')) + '</p>';
    return h;
  }
  // ---- the plan as one line, for Compare and the share text
  function planSummary(lv) {
    var t = tgList(MOD, lv).slice(0, 2).map(function (id) { return MOD.targets.filter(function (x) { return x.id === id; })[0].n; }).join(', ');
    var r = MOD.rules.filter(function (l) { return !l.when || l.when(lv); }).slice(0, 3).map(function (l) { var o = l.o.filter(function (q) { return q[0] === lv[l.id]; })[0]; return o ? o[1] : ''; }).join(' · ');
    return (t ? t + ' · ' : '') + r;
  }
  function drawTab() {
    if (!body) return;
    if (S.tab === 'replay') {
      var cur = (R.history || []).filter(function (x) { return x.id === S.playing; })[0];
      body.innerHTML = (cur ? '<div class="wg-now"><p class="wg-k">' + esc(tr('Now replaying')) + '</p><h3>' + esc(cur.name) + '</h3><p class="wg-ops">' + esc((cur.ops || []).join('  ·  ')) + '</p><dl class="wg-sum" id="wg-tally"></dl><p class="wg-res" id="wg-res"></p></div>' : '') +
        '<p class="wg-hint">' + esc(tr('Every strike of a past war, on the day it happened, from the reporting. Pick one and watch.')) + '</p><ul class="wg-hist">' + (R.history || []).slice().reverse().map(function (h) {
          return '<li><button type="button" class="wg-hb' + (h.id === S.playing ? ' on' : '') + '" data-replay="' + esc(h.id) + '"><b>' + esc(h.name) + '</b><span class="num">' + esc(day(h.start)) + esc(tr(' to ')) + esc(day(h.end)) + '  ·  ' + esc(tf('{n} days on the board', { n: N((h.days || []).length) })) + '</span><span class="wg-ops">' + esc((h.ops || []).join('  ·  ')) + '</span></button></li>';
        }).join('') + '</ul>';
      if (cur && TL && TL.h === cur) tallyDraw(cur, TL.steps.length ? ti / TL.steps.length : 0);
      return;
    }
    if (S.tab === 'watch') {
      body.innerHTML = LAST ? aarHtml(LAST) : '<p class="wg-hint">' + esc(tr('Nothing has run yet. Set your plan, then run it: the most typical of 1,000 runs plays here, day by day.')) + '</p><button type="button" class="wg-run" id="wg-run">' + esc(tr('Run 1,000 times and watch')) + '</button>';
      bindCalls(); return;
    }
    if (S.tab === 'compare') { body.innerHTML = compareHtml(); return; }
    var stepI = STEPS.map(function (x) { return x[0]; }).indexOf(S.step);
    var html = { forces: forcesHtml, targets: targetsHtml, rules: rulesHtml, advisors: advisorsHtml }[S.step]();
    var who = S.who && EXID[S.who];
    body.innerHTML = '<ol class="wg-steps" role="tablist">' + STEPS.map(function (x, i) { return '<li><button type="button" role="tab" data-step="' + x[0] + '" aria-selected="' + (S.step === x[0]) + '"><i class="num">' + N(i + 1) + '</i>' + esc(x[1]) + '</button></li>'; }).join('') + '</ol>' +
      (who ? '<p class="wg-who">' + face(who, 'tiny') + '<span>' + esc(tf('Plan: {n}', { n: who.n })) + '</span></p>' : '') +
      '<div class="wg-stepb">' + html + '</div>' +
      (stepI < STEPS.length - 1 ? '<button type="button" class="wg-chip wg-next" data-step="' + STEPS[stepI + 1][0] + '">' + esc(tf('Next: {s}', { s: STEPS[stepI + 1][1] })) + ' →</button>' : '') +
      '<div class="wg-foot2">' +
      '<button type="button" class="wg-run" id="wg-run">' + esc(tr('Run 1,000 times and watch')) + '</button>' +
      '<button type="button" class="wg-chip" id="wg-save"' + (S.saved.length >= 4 ? ' disabled' : '') + '>' + esc(tf('Save to compare ({n} of 4)', { n: N(S.saved.length) })) + '</button></div>' +
      '<p class="wg-fine">' + esc(tr('A model to think with, not a forecast.')) + '</p>';
    fillThumbs();
  }
  function step(k) { S.step = k; S.tab = 'plan'; drawPanel(); if (narrow() && S.sheet === 'min') sheetTo('mid'); body.scrollTop = 0; }
  panel.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-tab]'); if (t) { S.tab = t.getAttribute('data-tab'); drawPanel(); if (narrow()) sheetTo(S.sheet === 'min' ? 'mid' : S.sheet); return; }
    var st = ev.target.closest('[data-step]'); if (st) { step(st.getAttribute('data-step')); return; }
    var fo = ev.target.closest('[data-force]'); if (fo) { var id = fo.getAttribute('data-force'); setOff(id, !offs()[id]); drawTab(); return; }
    var un = ev.target.closest('[data-unit]'); if (un) { var f = (OOB.blue || []).concat(OOB.red || []).filter(function (x) { return x.id === un.getAttribute('data-unit'); })[0]; if (f) unitSheet(f); return; }
    var pr = ev.target.closest('[data-preset]'); if (pr) { var ps = MOD.presets.filter(function (q) { return q[0] === pr.getAttribute('data-preset'); })[0]; var keep = offOf(planDefault()); S.lv.off = (OOB.blue || []).filter(function (f) { return MOD.role(f) && ((ps[2] && ps[2](f)) || keep[f.id]); }).map(function (f) { return f.id; }).join('.'); S.who = ''; stale(); drawTab(); return; }
    var tm = ev.target.closest('[data-tgmove]'); if (tm) { tgMove(tm.getAttribute('data-tgmove'), +tm.getAttribute('data-d')); drawTab(); return; }
    var to = ev.target.closest('[data-tgon]'); if (to) { tgOn(to.getAttribute('data-tgon')); drawTab(); return; }
    var lv = ev.target.closest('[data-lv]'); if (lv) { S.lv[lv.getAttribute('data-lv')] = lv.getAttribute('data-o'); S.who = ''; stale(); drawTab(); return; }
    var ln = ev.target.closest('[data-lens]'); if (ln) { S.lens = ln.getAttribute('data-lens'); if (S.lens === 'mine' && !S.mine) S.mine = avgOf(S.room.length ? S.room.map(function (i) { return EXID[i]; }) : EX); stale(); drawTab(); return; }
    var x = ev.target.closest('[data-seat]'); if (x) { seat(x.getAttribute('data-seat')); return; }
    var us = ev.target.closest('[data-use]'); if (us) { usePlan(EXID[us.getAttribute('data-use')]); return; }
    var br = ev.target.closest('[data-brief]'); if (br) { brief(EXID[br.getAttribute('data-brief')]); return; }
    var dt = ev.target.closest('[data-date]'); if (dt) { S.date = dt.getAttribute('data-date'); stale(); drawTab(); return; }
    var rp = ev.target.closest('[data-replay]'); if (rp) { startReplay(rp.getAttribute('data-replay')); return; }
    var cg = ev.target.closest('[data-goal]'); if (cg) { S.goal = cg.getAttribute('data-goal'); drawTab(); return; }
    var cl = ev.target.closest('[data-load]'); if (cl) { var sv = S.saved[+cl.getAttribute('data-load')]; if (sv) { S.lv = Object.assign({}, sv.lv); S.who = sv.who || ''; stale(); S.tab = 'plan'; drawPanel(); } return; }
    var cx = ev.target.closest('[data-drop]'); if (cx) { S.saved.splice(+cx.getAttribute('data-drop'), 1); S.cmp = null; writeUrl(); drawTab(); return; }
    if (ev.target.closest('#wg-run')) { run(); return; }
    if (ev.target.closest('#wg-save')) { savePlan(); return; }
    if (ev.target.closest('#wg-cmp')) { compare(); return; }
    if (ev.target.closest('#wg-back')) { S.tab = 'plan'; drawPanel(); return; }
    if (ev.target.closest('#wg-again')) { run(); return; }
    if (ev.target.closest('#wg-watch')) { if (LAST && LAST.tl) { play(LAST.tl); if (narrow()) sheetTo('min'); } return; }
    if (ev.target.closest('#wg-share')) { share(); return; }
    if (ev.target.closest('#wg-reset')) { S.mine = avgOf(EX); drawTab(); stale(); return; }
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

  // ---------------------------------------------------------------- the briefing: the advisor as a character, over the board
  var bfEl = null, bfX = null, bfT = 0;
  function briefPlaces(x) {
    var text = [x.view || ''].concat(x.brief || []).join(' ').toLowerCase(), hit = [];
    PLACES.forEach(function (p) {
      var n = String(p.n || '').toLowerCase().replace(/\(.*?\)/g, '').split(/[ ,]+/).filter(function (w) { return w.length > 4; })[0];
      if (n && text.indexOf(n) >= 0 && hit.indexOf(p) < 0 && !p.off) hit.push(p);
    });
    if (!hit.length) { var lv = planOf(x), first = tgList(MOD, lv)[0], t = MOD.targets.filter(function (q) { return q.id === first; })[0]; if (t) PLACES.forEach(function (p) { if (t.k.indexOf(p.k) >= 0 && p.team === 'red' && !p.off && hit.length < 6) hit.push(p); }); }
    return hit.slice(0, 6);
  }
  function brief(x) {
    if (!x) return;
    closeBrief(true);
    bfX = x;
    var on = S.room.indexOf(x.id) >= 0, lv = planOf(x);
    var own = runMany(Object.assign(avgOf(EX), x.p || {}), lv, 300, 4242);
    var top = MOD.outcomes.filter(function (o) { return o.id === own.top; })[0];
    var nums = Object.keys(x.p || {}).map(function (k) { var p = PM[k]; if (!p) return ''; return '<li><b class="num">' + pmFmt(p, x.p[k]) + '</b><span>' + esc(p.n) + (x.pWhy && x.pWhy[k] ? '<small>' + esc(x.pWhy[k]) + '</small>' : '') + '</span></li>'; }).join('');
    var i = EX.indexOf(x);
    bfEl = D.createElement('div');
    bfEl.className = 'wg-bf'; bfEl.id = 'wg-bf'; bfEl.setAttribute('role', 'dialog'); bfEl.setAttribute('aria-modal', 'false'); bfEl.setAttribute('aria-labelledby', 'wg-bf-n');
    bfEl.innerHTML = '<div class="wg-bf-in"><div class="wg-bf-top"><p class="wg-k">' + esc(tr('Briefing')) + '  ·  ' + N(i + 1) + '/' + N(EX.length) + '</p><button type="button" class="wg-ib" id="wg-bf-x" aria-label="' + esc(tr('Close')) + '">×</button></div>' +
      '<div class="wg-bf-who"><div class="wg-bf-pic">' + face(x, 'big') + '<i></i></div><div><h3 id="wg-bf-n">' + esc(x.n) + '</h3><p class="wg-bf-r">' + esc(x.who || '') + '</p>' + leanTag(x.lean) + '</div></div>' +
      '<blockquote class="wg-bf-q" id="wg-bf-q"></blockquote>' +
      '<div class="wg-bf-plan"><p class="wg-k">' + esc(tr('Their plan')) + '</p><p>' + esc(planSummary(lv)) + '</p><p class="wg-bf-own">' + esc(tr('Run on their numbers alone, it most often ends:')) + ' <b style="color:' + (top ? top.c : '') + '">' + esc(top ? top.n : '') + '</b> <span class="num">(' + pc(own.cnt[own.top] / own.n) + ')</span></p>' +
      '<button type="button" class="wg-run" id="wg-bf-use">' + esc(tr('Use this plan')) + '</button></div>' +
      '<ol class="wg-bf-l">' + (x.brief || []).map(function (l, k) { return '<li data-k="' + k + '">' + esc(l) + '</li>'; }).join('') + '</ol>' +
      (nums ? '<h4>' + esc(tr('Their numbers in this simulation')) + '</h4><ul class="wg-bf-nums">' + nums + '</ul>' : '') +
      '<h4>' + esc(tr('What they published')) + '</h4><ul class="wg-bf-src">' + (x.said || []).map(function (s) { return '<li>' + esc(s.w) + ' <a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(day(s.date || '')) + ' ↗</a></li>'; }).join('') + '</ul>' +
      '<p class="wg-fine">' + esc(tr('These lines are my summary of their published work, not their words. The numbers and the plan are my reading of it.')) + '</p>' +
      '<div class="wg-bf-b"><button type="button" class="wg-ib" id="wg-bf-p" aria-label="' + esc(tr('Previous expert')) + '">‹</button><button type="button" class="wg-chip' + (on ? ' on' : '') + '" id="wg-bf-seat">' + esc(on ? tr('Take out of my briefing room') : tr('Seat in my briefing room')) + '</button><button type="button" class="wg-ib" id="wg-bf-nx" aria-label="' + esc(tr('Next expert')) + '">›</button></div></div>';
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
    else if (ev.target.closest('#wg-bf-use') && bfX) usePlan(bfX);
    else if (ev.target.closest('#wg-bf-seat') && bfX) seat(bfX.id);
    else if (ev.target.closest('#wg-bf-nx') && bfX) brief(EX[(EX.indexOf(bfX) + 1) % EX.length]);
    else if (ev.target.closest('#wg-bf-p') && bfX) brief(EX[(EX.indexOf(bfX) - 1 + EX.length) % EX.length]);
  });

  // ---------------------------------------------------------------- a place, a unit: their cards over the board
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
  function srcLinks(src) { return (src || []).length ? '<p class="wg-fine">' + src.slice(0, 4).map(function (u, i) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(tf('Source {n}', { n: N(i + 1) })) + ' ↗</a>'; }).join('  ·  ') + '</p>' : ''; }
  function forcesAt(id) { return (R.forces || []).filter(function (f) { return (f.at || []).indexOf(id) >= 0; }); }
  function oobAt(id) { return (OOB.blue || []).concat(OOB.red || []).filter(function (f) { return (f.at || []).indexOf(id) >= 0 && !KIND_OF[f.type]; }); }
  function placeSheet(p) {
    if (!p) return;
    if (V) {
      V.select(p.id); touched();
      var rr = rangesOf(p.id);
      if (rr.length) V.focus(rr[rr.length - 1].filter(function (q, i) { return i % 8 === 0; }).concat([[p.ex, p.ey]]), { wide: true }); else V.focus([[p.ex, p.ey]], { tight: true });
    }
    var fs = forcesAt(p.id), us = oobAt(p.id);
    openSheet('<div class="wg-place"><p class="wg-k" style="color:' + teamHex(p.o) + '">' + esc((SIDE[p.o] || {}).n || p.o || '') + '  ·  ' + esc(tk('k:', p.k)) + (p.org ? '  ·  ' + esc(tk('org:', p.org)) : '') + '</p><h3 id="wg-sh-t">' + esc(p.n) + '</h3>' +
      '<p class="wg-pips" aria-label="' + esc(tf('Importance {n} of 5', { n: N(p.v || 2) })) + '">' + [1, 2, 3, 4, 5].map(function (k) { return '<i class="' + (k <= (p.v || 2) ? 'on' : '') + '"></i>'; }).join('') + '</p>' +
      (p.why ? '<p>' + esc(p.why) + '</p>' : '') + (p.st ? '<p class="wg-dim">' + esc(p.st) + '</p>' : '') +
      (us.length ? '<h4>' + esc(tr('Order of battle here')) + '</h4><ul class="wg-fs">' + us.map(function (f) { return '<li><button type="button" class="wg-lnk" data-sheetunit="' + esc(f.id) + '"><b>' + esc(f.name) + '</b></button> <span class="num">' + esc(cnt(f)) + '</span></li>'; }).join('') + '</ul>' : '') +
      (fs.length ? '<h4>' + esc(tr('Based here')) + '</h4><ul class="wg-fs">' + fs.map(function (f) { return '<li><b>' + esc(f.n) + '</b>' + (f.count ? ' <span class="num">' + fmt(f.count) + '</span>' : '') + (f.rangeKm ? ' <span class="wg-dim num">' + esc(tf('range {n} km', { n: fmt(f.rangeKm) })) + '</span>' : '') + '</li>'; }).join('') + '</ul>' : '') +
      srcLinks(p.src) + '</div>');
  }
  function unitSheet(f, u) {
    var kit = V && V.kit ? V.kit() : null, t = u ? u.t : f.type, meta = kit && kit.types[t] ? kit.types[t] : null, team = teamOf(f.o);
    var pic = V && V.thumb ? V.thumb(f.type, team === 'red' ? 'red' : 'blue') : null;
    if (u && V) { touched(); V.focus([[u.x, u.y]], { tight: true }); }
    var at = (f.at || []).map(function (a) { return typeof a === 'string' && PL[a] ? PL[a].n : null; }).filter(Boolean);
    openSheet('<div class="wg-place wg-unit"><p class="wg-k" style="color:' + teamHex(f.o) + '">' + esc((SIDE[f.o] || {}).n || f.o) + '  ·  ' + esc(when(f)) + '</p><h3 id="wg-sh-t">' + esc(f.name) + '</h3>' +
      (pic ? '<img class="wg-unit-pic" src="' + pic + '" alt="" width="256" height="192">' : '') +
      '<dl class="wg-sum"><div><dt>' + esc(tr('How many')) + '</dt><dd class="num">' + esc(cnt(f)) + (f.lo != null && f.hi != null ? ' <small>(' + fmt(f.lo) + '–' + fmt(f.hi) + ')</small>' : '') + '</dd></div>' +
      (meta ? '<div><dt>' + esc(tr('Model')) + '</dt><dd>' + esc(meta.real || meta.name) + (u && u.stand || (meta && meta.type !== f.type && !LAUNCH_OF[f.type]) ? ' <small>' + esc(tr('(drawn with a stand-in model)')) + '</small>' : '') + '</dd></div>' : '') +
      '<div><dt>' + esc(tr('Where')) + '</dt><dd>' + esc(at.length ? at.join(', ') : (f.where || tr('not published'))) + '</dd></div></dl>' +
      (f.status ? '<p>' + esc(f.status) + '</p>' : '') + (f.note ? '<p class="wg-dim">' + esc(f.note) + '</p>' : '') + (f.unc ? '<p class="wg-dim">' + esc(tf('How sure: {u}', { u: f.unc })) + '</p>' : '') +
      srcLinks(f.src) + '</div>');
  }
  var LAUNCH_OF = { emad: 1, fateh110: 1, ghadr: 1, paveh: 1, shahed136: 1, df15: 1, df21d: 1, df26: 1, atacms: 1, storm_shadow: 1, jassm: 1, stunner: 1 };
  sheet.addEventListener('click', function (ev) { var b = ev.target.closest('[data-sheetunit]'); if (!b) return; var f = (OOB.blue || []).concat(OOB.red || []).filter(function (x) { return x.id === b.getAttribute('data-sheetunit'); })[0]; if (f) unitSheet(f); });

  // ---------------------------------------------------------------- RUN, and the after-action report
  function advisorLine(ev) {
    if (!ev.param) return '';
    var room = (S.lens === 'room' && S.room.length ? S.room.map(function (i) { return EXID[i]; }) : EX).filter(function (x) { return x && x.pWhy && x.pWhy[ev.param]; });
    if (!room.length) return '';
    var x = room[Math.abs(hash(ev.param + ev.d)) % room.length];
    return x.n + ': ' + x.pWhy[ev.param];
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
  function runLv() { var lv = Object.assign({}, S.lv); lv.mon = new Date((S.date || R.today) + 'T12:00:00Z').getUTCMonth(); return lv; }
  function run() {
    var btn = $('#wg-run'); if (btn) { btn.disabled = true; btn.textContent = tr('Running 1,000 simulations…'); }
    setTimeout(function () {
      var P = params(), lv = runLv();
      var res = runMany(P, lv, 1000, 1337 + hash(JSON.stringify(lv)));
      var feat = runOne(P, lv, res.seed, true);
      res.calls = EX.map(function (x) { var o = runMany(Object.assign(avgOf(EX), x.p || {}), lv, 200, 777); return { x: x, top: o.top, p: o.cnt[o.top] / o.n, hit: o.cnt[feat.out] / o.n }; });
      res.feat = feat; res.P = P; res.lv = lv;
      var wait = (feat.s && feat.s.wait) || 0;
      var start = addDays(S.date || R.today, wait), unit = MOD.unit === 'week' ? 7 : 1;
      var byDay = {}; feat.log.forEach(function (ev) { (byDay[ev.d] = byDay[ev.d] || []).push(ev); });
      var f0 = TID === 'ukraine' ? frontPts((frontAt(R.today) || {}).line) : null;
      var steps = feat.snaps.map(function (sn) {
        var evs = byDay[sn.d] || [], loud = evs.filter(function (v) { return v.w && !v.quiet; });
        var say = ''; for (var i = 0; i < evs.length && !say; i++) say = advisorLine(evs[i]);
        var lines = loud.map(function (v) { return { w: v.w, c: teamHex(v.side) }; });
        if (say) lines.push({ w: say, c: GOLD });
        var why = ''; for (var j = 0; j < evs.length && !why; j++) why = evs[j].why || '';
        var orb = {}; ORB.forEach(function (o) { orb[o.id] = Object.assign({ b: 1, r: 1 }, (sn.o || {})[o.id] || {}); });
        return { when: MOD.unit === 'week' ? tf('Week {n}', { n: N(sn.d) }) : tf('Day {n}', { n: N(sn.d) }), dn: day(addDays(start, (sn.d - 1) * unit)), head: loud.length ? loud[0].w : sn.say, why: why,
          ev: evs.filter(function (v) { return v.from || v.to; }), lines: lines.slice(loud.length ? 1 : 0), orb: orb, board: sn.b, grid: sn.grid != null ? sn.grid : sn.blk ? 1 - sn.blk : null,
          front: f0 ? shifted(f0, sn.sec) : null, ms: loud.some(function (v) { return v.big; }) ? 2600 : 1600 };
      });
      res.tl = { kind: 'run', steps: steps, done: function () { var o = MOD.outcomes.filter(function (x) { return x.id === feat.out; })[0]; feedSet(o.n + '. ' + o.w, [{ w: tr('This was the most typical of the 1,000 runs.'), c: o.c }]); } };
      LAST = res; S.tab = 'watch';
      drawPanel();
      reportCalls(res);
      play(res.tl);
      if (narrow() && S.sheet !== 'min') sheetTo('min');
    }, 40);
  }
  function mkById(id) { return (R.markets || []).filter(function (m) { return m.id === id; })[0]; }
  function mkOpt(m, horizonIso) {
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
    var sum = MOD.summary(res.A, res.lv, res.cnt, res.n).map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd class="num">' + esc(x[1]) + '</dd></div>'; }).join('');
    var calls = res.calls.slice().sort(function (a, b) { return b.hit - a.hit; }).slice(0, 5).map(function (c) { var o = MOD.outcomes.filter(function (x) { return x.id === c.top; })[0]; return '<li>' + face(c.x, 'tiny') + '<span><b>' + esc(c.x.n) + '</b> ' + esc(tr('expects')) + ' <em style="color:' + o.c + '">' + esc(o.n.toLowerCase()) + '</em> <span class="num">(' + pc(c.p) + ')</span></span></li>'; }).join('');
    return '<div class="wg-aar" id="wg-result"><div class="wg-aar-h"><p class="wg-k">' + esc(tr('After-action report')) + '  ·  ' + esc(tr('1,000 simulations')) + '</p><button type="button" class="wg-chip" id="wg-back">' + esc(tr('Change the plan')) + '</button></div>' +
      '<p class="wg-big">' + tf('{o} in {p} of them.', { o: '<b style="color:' + top.c + '">' + esc(top.n) + '</b>', p: '<span class="num">' + pc(res.cnt[res.top] / res.n) + '</span>' }) + '</p>' +
      '<ul class="wg-ocs">' + outs + '</ul>' + sm +
      '<p class="wg-fine">' + esc(tr('A model to think with, not a forecast. The markets ask their own questions; each one is named beside its number.')) + '</p>' +
      '<div class="wg-aar-b"><button type="button" class="wg-run" id="wg-watch">' + esc(tr('Watch the typical run again')) + '</button><button type="button" class="wg-chip" id="wg-save"' + (S.saved.length >= 4 ? ' disabled' : '') + '>' + esc(tf('Save to compare ({n} of 4)', { n: N(S.saved.length) })) + '</button></div>' +
      '<h4>' + esc(tr('The cost, averaged over the runs')) + '</h4><dl class="wg-sum">' + sum + '</dl>' +
      '<h4>' + esc(tr('Who in the room called it')) + '</h4><ul class="wg-calls">' + calls + '</ul>' +
      '<div class="wg-share"><button type="button" class="wg-run" id="wg-share">' + esc(tr('Share this plan')) + '</button><button type="button" class="wg-chip" data-shot="' + KEY + TID + '" hidden>' + esc(tr('Make a picture')) + '</button></div></div>';
  }
  function bindCalls() { $$('[data-shot]', box).forEach(function (b) { b.hidden = !W.LPShot; }); }
  function reportCalls(res) {
    var lpc = $('.lpc', box);
    if (W.LPCalls && lpc) {
      try {
        if (TID === 'iran') { var f = res.cnt.fall / res.n; W.LPCalls.mine('p:663583', f >= 0.5 ? 0 : 1, 'Your plan: the regime falls in ' + pc(f) + ' of the runs you built'); }
        W.LPCalls.mount(lpc);
      } catch (x) {}
    }
    bindCalls();
  }

  // ---------------------------------------------------------------- COMPARE: up to four plans, 1,000 runs each, side by side
  var LETTERS = ['A', 'B', 'C', 'D'];
  function savePlan() {
    if (S.saved.length >= 4) return;
    var who = S.who && EXID[S.who];
    S.saved.push({ n: who ? who.n : tf('Plan {l}', { l: LETTERS[S.saved.length] }), lv: Object.assign({}, S.lv), who: S.who || '' });
    S.cmp = null; writeUrl();
    var b = $('#wg-save'); if (b) { b.textContent = tf('Saved. {n} of 4 in Compare', { n: N(S.saved.length) }); b.disabled = S.saved.length >= 4; }
  }
  function compareHtml() {
    var G0 = MOD.goals || [];
    var h = '<p class="wg-hint">' + esc(tr('Save up to four plans from the Plan tab, pick what you want most, and run them side by side: 1,000 runs each, on the same numbers.')) + '</p>';
    if (!S.saved.length) return h + '<button type="button" class="wg-chip" data-tab="plan">' + esc(tr('Go to the plan')) + '</button>';
    h += '<div class="wg-lv"><span>' + esc(tr('What matters most')) + '</span><div class="wg-seg" role="radiogroup">' + G0.map(function (g) { return '<button type="button" role="radio" data-goal="' + g.id + '" aria-checked="' + (S.goal === g.id) + '">' + esc(g.n) + '</button>'; }).join('') + '</div></div>';
    var C = S.cmp, best = -1;
    if (C) { var g = G0.filter(function (q) { return q.id === S.goal; })[0] || G0[0], bs = -Infinity; C.forEach(function (r, i) { var v = g.s(r.A, r.cnt, r.n); r.score = v; if (v > bs) { bs = v; best = i; } }); }
    h += '<div class="wg-cmp"><table><thead><tr><th></th>' + S.saved.map(function (sv, i) { return '<th class="' + (i === best ? 'best' : '') + '">' + (i === best ? '<span class="wg-bestk">' + esc(tr('Best for this')) + '</span>' : '') + '<b>' + esc(sv.n) + '</b><small>' + esc(planSummary(sv.lv)) + '</small><span class="wg-cmp-b"><button type="button" class="wg-chip" data-load="' + i + '">' + esc(tr('Open')) + '</button><button type="button" class="wg-ib" data-drop="' + i + '" aria-label="' + esc(tf('Remove {n}', { n: sv.n })) + '">×</button></span></th>'; }).join('') + '</tr></thead>';
    if (C) {
      var rows = MOD.outcomes.map(function (o) { return '<tr><th style="color:' + o.c + '">' + esc(o.n) + '</th>' + C.map(function (r, i) { var p = r.cnt[o.id] / r.n; return '<td class="num' + (i === best ? ' best' : '') + '"><i class="wg-bar" style="--f:' + p.toFixed(3) + ';--c:' + o.c + '"></i>' + pc(p) + '</td>'; }).join('') + '</tr>'; }).join('');
      var sums = C.map(function (r, i) { return MOD.summary(r.A, S.saved[i].lv, r.cnt, r.n); });
      (sums[0] || []).forEach(function (row, k) { rows += '<tr><th>' + esc(row[0]) + '</th>' + sums.map(function (sm, i) { return '<td class="num' + (i === best ? ' best' : '') + '">' + esc((sm[k] || [])[1] || '–') + '</td>'; }).join('') + '</tr>'; });
      h += '<tbody>' + rows + '</tbody>';
    }
    h += '</table></div><button type="button" class="wg-run" id="wg-cmp">' + esc(C ? tr('Run them again') : tf('Run all {n}, 1,000 times each', { n: N(S.saved.length) })) + '</button>';
    return h;
  }
  function compare() {
    var b = $('#wg-cmp'); if (b) { b.disabled = true; b.textContent = tr('Running…'); }
    var P = params(), out = [], i = 0;
    (function next() {
      if (i >= S.saved.length) { S.cmp = out; drawTab(); return; }
      var lv = Object.assign({}, S.saved[i].lv); lv.mon = new Date((S.date || R.today) + 'T12:00:00Z').getUTCMonth();
      out.push(runMany(P, lv, 1000, 1337 + hash(JSON.stringify(lv)))); i++;
      if (b) b.textContent = tf('Running {i} of {n}…', { i: N(i), n: N(S.saved.length) });
      setTimeout(next, 20);
    })();
  }

  // ---------------------------------------------------------------- the address, share and the picture
  // The whole plan rides in ?s=: whose numbers (r, l), the start (d), each rule, the targets in order (tg, joined by "-"), the
  // forces left out (off, joined by "."), and the saved plans of Compare (p1 to p4: a name, then the same keys after "~").
  function lvStr(lv, sep, kv) { return Object.keys(lv).filter(function (k) { return k !== 'mon' && lv[k] != null && lv[k] !== ''; }).map(function (k) { return k + kv + String(lv[k]).replace(/,/g, '-'); }).join(sep); }
  function lvRead(str, sep, kv) {
    var lv = planDefault();
    str.split(sep).forEach(function (p) {
      var i = p.indexOf(kv), k = p.slice(0, i), v = p.slice(i + 1);
      if (k === 'tg') lv.tg = v.split('-').filter(function (x) { return MOD.targets.some(function (t) { return t.id === x; }); }).join(',');
      else if (k === 'off') lv.off = v.split('.').filter(function (x) { return (OOB.blue || []).some(function (f) { return f.id === x; }); }).join('.');
      else MOD.rules.forEach(function (l) { if (l.id === k && l.o.some(function (o) { return o[0] === v; })) lv[k] = v; });
    });
    return lv;
  }
  function writeUrl() {
    var q = { r: S.room.join('.'), l: S.lens, d: S.date || '', w: S.who || '' }, s = Object.keys(q).filter(function (k) { return q[k]; }).map(function (k) { return k + ':' + q[k]; });
    s.push(lvStr(S.lv, ',', ':'));
    S.saved.forEach(function (sv, i) { s.push('p' + (i + 1) + ':' + encodeURIComponent(sv.n).replace(/~/g, '') + '~' + lvStr(sv.lv, '~', '=')); });
    try { history.replaceState(history.state, '', location.pathname + '?s=' + encodeURIComponent(s.join(',')) + (/[?&]stream=1/.test(location.search) ? '&stream=1' : '') + location.hash); } catch (x) {}
  }
  function readUrl() {
    var m = /[?&]s=([^&]+)/.exec(location.search); if (!m) return false;
    var raw = decodeURIComponent(m[1]), lvParts = [];
    raw.split(',').forEach(function (kv) {
      var i = kv.indexOf(':'), k = kv.slice(0, i), v = kv.slice(i + 1);
      if (k === 'r') S.room = v.split('.').filter(function (x) { return EXID[x]; });
      else if (k === 'l' && /^(room|all|markets|mine)$/.test(v)) S.lens = v === 'mine' ? 'all' : v;
      else if (k === 'd' && /^\d{4}-\d\d-\d\d$/.test(v)) S.date = v;
      else if (k === 'w' && EXID[v]) S.who = v;
      else if (/^p[1-4]$/.test(k) && S.saved.length < 4) { var j = v.indexOf('~'); try { S.saved.push({ n: decodeURIComponent(v.slice(0, j)).slice(0, 60), lv: lvRead(v.slice(j + 1), '~', '='), who: '' }); } catch (x) {} }
      else if (k) lvParts.push(kv);
    });
    if (lvParts.length) S.lv = lvRead(lvParts.join(','), ',', ':');
    return true;
  }
  function share() {
    writeUrl();
    var url = location.href, t = R.meta.title;
    if (W.LPShare && W.LPShare.open) { try { W.LPShare.open({ url: url, title: t }); return; } catch (x) {} }
    if (navigator.share) navigator.share({ title: t, url: url }).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { var b = $('#wg-share'); if (b) { b.textContent = tr('Link copied'); setTimeout(function () { b.textContent = tr('Share this plan'); }, 1600); } });
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
    var mb = $('#wg-mini'), ob = $('#wg-orb');
    if (mb && ob) { tog(mb, 'wg-hid', false); var m1 = mb.getBoundingClientRect(), o1 = ob.getBoundingClientRect(); tog(mb, 'wg-hid', !!(m1.width && o1.width && m1.top < o1.bottom + 6 && m1.left < o1.right && m1.right > o1.left)); }
    hudT = 0;
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
  var KITON = 0;      // set once the 3D models stand under the markers: the markers shrink to plates over them
  function markPx(p) { return ((narrow() ? 18 : 22) + (p.v || 2) * (narrow() ? 2 : 3) + (p.k === 'capital' ? 5 : 0) - (p.off ? 4 : 0)) * (KITON && !p.off ? 0.56 : 1); }
  var LABELED = PLACES.filter(function (p) { return (p.v || 0) >= 4 || p.k === 'capital'; });
  var HOME = (function () { var q = PLACES.filter(function (p) { return !p.off && ((p.v || 0) >= 4 || p.k === 'capital'); }).map(function (p) { return [p.ex, p.ey]; }); return q.length >= 3 ? q : [[0, 0], [G.w, G.h]]; })();
  // the names on the board: one span each, placed by the view, the most important first; one that would overlap a name
  // already shown waits (its marker still shows, and a tap opens it). Off the screen: not drawn at all.
  var TAG = {};
  PLACES.forEach(function (p) {
    var t = D.createElement('span'); t.className = 'wg-tag t-' + p.team + (p.k === 'capital' ? ' cap' : '') + (p.off ? ' off' : '');
    t.textContent = p.off ? p.n + ' →' : p.n; t.setAttribute('aria-hidden', 'true'); t.style.display = 'none'; tagsEl.appendChild(t); TAG[p.id] = t; p.pri = (p.k === 'capital' ? 10 : 0) + (p.v || 2);
  });
  var tagOrder = PLACES.slice().sort(function (a, b) { return b.pri - a.pri; });
  var FREE = { l: 0, r: 0, t: 0, b: 0 };
  // NAMES NEVER PILE UP (1 November 2026). The most important places are named first; a name is dropped when it would cover a
  // name already shown, the marker of a place at least as important, or any panel over the board (the bars, the forces, the
  // minimap, the camera buttons, the timeline, the panel, a briefing), or when it would run past the edge of the board.
  var hudBox = [], hudT = 0;
  function hudRects() {
    var now = performance.now(); if (now - hudT < 400) return hudBox; hudT = now;
    var r0 = stage.getBoundingClientRect();
    hudBox = $$('.wg-top, .wg-orb, .wg-mini, .wg-nav, .wg-tl, .wg-panel, .wg-bf, .wg-credit', app).filter(function (e) { return e.offsetParent !== null; })
      .map(function (e) { var r = e.getBoundingClientRect(); return [r.left - r0.left - 3, r.top - r0.top - 3, r.width + 6, r.height + 6]; }).filter(function (q) { return q[2] > 10 && q[3] > 10; });
    return hudBox;
  }
  function over(a, k) { return a[0] < k[0] + k[2] && a[0] + a[2] > k[0] && a[1] < k[1] + k[3] && a[1] + a[3] > k[1]; }
  function placeTags(proj, zoomed) {      // proj(p) -> [x, y, visible, px, pip]
    var w = stage.clientWidth, h = stage.clientHeight, kept = hudRects().slice(), mk = [];
    tagOrder.forEach(function (p) { var q = proj(p); if (q && q[2] && !q[4]) mk.push([p, [q[0] - q[3] * 0.35, q[1] - q[3] * 0.75, q[3] * 0.7, q[3] * 0.7]]); });
    tagOrder.forEach(function (p) {
      var t = TAG[p.id], q = proj(p);
      var want = q && q[2] && !q[4] && (zoomed > 1.6 || LABELED.indexOf(p) >= 0 || S.sel === p.id || S.pulse && S.pulse.indexOf(p.id) >= 0);
      if (!want) { if (t.style.display !== 'none') t.style.display = 'none'; return; }
      if (!t._mw) measureTags();
      var M4 = 4, tw = (t._mw || Math.max(30, p.n.length * 7.6 + 14)) + 2 * M4, th = (t._mh || 18) + 2 * M4;
      // under its marker first, then to its right, then to its left
      var spots = [[q[0] - tw / 2, q[1] + q[3] * 0.5 - 2], [q[0] + q[3] * 0.5, q[1] - q[3] * 0.4 - th / 2], [q[0] - q[3] * 0.5 - tw, q[1] - q[3] * 0.4 - th / 2], [q[0] - tw / 2, q[1] - q[3] - th]], ok = false, box, x, y;
      for (var sp = 0; sp < spots.length && !ok; sp++) {
        x = spots[sp][0]; y = spots[sp][1]; box = [x, y, tw, th];
        ok = x >= 2 && y >= 2 && x + tw <= w - 2 && y + th <= h - 2;
        for (var i = 0; ok && i < kept.length; i++) if (over(box, kept[i])) ok = false;
        for (var j = 0; ok && j < mk.length; j++) if (mk[j][0] !== p && over(box, mk[j][1])) ok = false;
      }
      if (!ok && S.sel !== p.id) { if (t.style.display !== 'none') t.style.display = 'none'; return; }
      kept.push(box);
      t.style.display = ''; t.style.transform = 'translate(' + Math.round(x + M4) + 'px,' + Math.round(y + M4) + 'px)';
    });
  }
  // each name's drawn size, read from the page itself (its font, padding, capitals and any scale), once and after each resize
  function measureTags() {
    PLACES.forEach(function (p) { var t = TAG[p.id], was = t.style.display; t.style.visibility = 'hidden'; t.style.display = ''; var r = t.getBoundingClientRect(); t._mw = Math.ceil(r.width) || 0; t._mh = Math.ceil(r.height) || 18; t.style.display = was; t.style.visibility = ''; });
  }
  W.addEventListener('resize', function () { PLACES.forEach(function (p) { TAG[p.id]._mw = 0; }); });
  // how many pairs of names on the board overlap right now (the phone test counts them after a run has settled: it must be 0)
  function tagOverlaps() {
    var R2 = PLACES.map(function (p) { return TAG[p.id]; }).filter(function (t) { return t.style.display !== 'none' && t.offsetParent !== null; }).map(function (t) { return t.getBoundingClientRect(); }), n = 0;
    for (var i = 0; i < R2.length; i++) for (var j = i + 1; j < R2.length; j++) { var a = R2[i], b = R2[j]; if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) n++; }
    return n;
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
  function makeGL(T, kitMod) {
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
      (typeof blackout !== 'undefined' && blackout ? blackout : []).forEach(function (q) {      // the cities a power plant fed, dark
        var g = m.createRadialGradient(q[0], q[1], 0, q[0], q[1], q[2]);
        g.addColorStop(0, 'rgba(2,3,6,0.78)'); g.addColorStop(0.7, 'rgba(2,3,6,0.5)'); g.addColorStop(1, 'rgba(2,3,6,0)');
        m.fillStyle = g; m.beginPath(); m.arc(q[0], q[1], q[2], 0, 7); m.fill();
      });
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
      uTheatre: { value: new T.Vector4((0 - FR[0]) / FW, 1 - (G.h - FR[1]) / FH, (G.w - FR[0]) / FW, 1 - (0 - FR[1]) / FH) }, uHex: { value: G.w / 46 }, uCam: { value: new T.Vector3() }, uReady: { value: 0 }, uFog: { value: new T.Vector2(1500, 3500) }, uNight: { value: 1 } };
    var terrainMat = new T.ShaderMaterial({
      uniforms: TU, extensions: { derivatives: true },
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: [
        'uniform sampler2D tColor, tNight, tHeight, tMask, tLin, tOvl; uniform float uTime, uHS, uHex, uReady, uNight; uniform vec2 uTexel, uWorld, uFog; uniform vec4 uTheatre; uniform vec3 uCam;',
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
        '  float nt = texture2D(tNight, vUv).r; col += pow(nt, 2.4) * vec3(1.0, 0.62, 0.26) * 1.25 * land * uNight;',
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
        var p = m.p, y = hAt(p.ex, p.ey), lift = p.off ? 1.5 : m.model ? m.model.userData.fit * KU * ZK * 0.5 + 3 : 4 + (p.v || 2) * 0.8;
        m.base = new T.Vector3(wx(p.ex), y, wz(p.ey)); m.top = new T.Vector3(wx(p.ex), y + lift, wz(p.ey));
        m.s.position.copy(m.top);
        stemPos.set([m.base.x, m.base.y, m.base.z, m.top.x, m.top.y, m.top.z], m.i * 6);
        var c = rgb(teamHex(p.o)); stemCol.set([c[0] * 0.4, c[1] * 0.4, c[2] * 0.4, c[0], c[1], c[2]], m.i * 6);
        var r = p.off ? 0.001 : (m.model ? siteFit(p) * KU * ZK * 0.55 : 3 + (p.v || 2) * 1.2);
        if (m.model) { var cc = rgb(teamHex(p.o)); icol.set([cc[0] * 0.32, cc[1] * 0.32, cc[2] * 0.32], m.i * 3); }      // under a model the ring is a faint base plate, not a beacon
        M4.compose(V3.set(m.base.x, m.base.y + 0.25, m.base.z), Q.identity(), S3.set(r, 1, r)); rings.setMatrixAt(m.i, M4);
      });
      stemGeo.attributes.position.needsUpdate = true; stemGeo.attributes.color.needsUpdate = true; rings.instanceMatrix.needsUpdate = true; rings.geometry.attributes.icol.needsUpdate = true;
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
    // ---- THE KIT ON THE BOARD (1 November 2026; build/simkit/SIMKIT.md). Every place stands as its 3D model at game scale (bigger
    // than the map, as a strategy game draws it, sized from the home view so it reads on a phone); the order of battle (R.oob)
    // stands at its bases and stations, carrier groups with their escorts at sea; what flies is the aircraft, missile or drone
    // that would fly it; impacts are the kit's explosions of the right kind; a damaged site keeps burning, goes dark and stays so.
    var KIT = null, KFX = null, kitBuilt = 0, KU = 1, kitObjs = [], units = [], orbiters = [], damaged = {}, blackout = [], darkMat = {};
    if (kitMod && kitMod.createKit) { try { KIT = kitMod.createKit(T); } catch (x) { KIT = null; if (W.console) console.warn('Conflict Simulator: the 3D kit failed, drawing markers only', x); } }
    if (KIT) {
      KIT.lights(scene, { hemi: 2.3, sunI: 3.4, sky: 0xd6e4ff, ground: 0x5a4c38 });
      KFX = KIT.fx(scene, camera, { scale: 1 });
      ['solid', 'metal', 'glass'].forEach(function (k) { var m = KIT.mat[k].clone(); m.color = new T.Color(0x3a3430); m.emissive = new T.Color(0x0); darkMat[k] = m; });
    }
    var CITYK = { iran: 'site_city_me', ukraine: 'site_city_eu', taiwan: 'site_city_asia' }[TID] || 'site_city_me';
    var CAPK = { tehran: 'cap_tehran', 'tel-aviv': 'cap_telaviv', kyiv: 'cap_kyiv', moscow: 'cap_moscow', taipei: 'cap_taipei', riyadh: 'cap_riyadh', doha: 'cap_doha', jerusalem: 'cap_jerusalem', beijing: 'cap_beijing' };
    var BYID = { fordow: 'site_nuclear_mountain', pickaxe: 'site_nuclear_mountain', natanz: 'site_nuclear_enrich', 'isfahan-nuclear': 'site_nuclear_enrich', arak: 'site_reactor', 'bushehr-npp': 'site_reactor', dimona: 'site_reactor',
      znpp: 'site_npp6', kharg: 'site_oil_terminal', lavan: 'site_oil_terminal', 'ras-tanura': 'site_oil_terminal', primorsk: 'site_oil_terminal', 'ust-luga': 'site_oil_terminal', 'kerch-bridge': 'site_bridge',
      'dnipro-hpp': 'site_hydro', 'kremenchuk-hpp': 'site_hydro', 'kakhovka-dam': 'site_hydro', 'tsmc-hsinchu': 'site_chipfab', 'tsmc-tainan': 'site_chipfab', 'isfahan-ad': 'bavar373', 'south-pars': 'site_refinery' };
    var BYKIND = { airbase: 'site_airbase', naval: 'site_naval_base', missile: 'site_missile', nuclear: 'site_nuclear_enrich', oil: 'site_refinery', city: CITYK, hq: 'site_hq', airdef: 'site_airdef', port: 'site_port',
      army: 'site_army', radar: 'site_radar', industry: 'site_industry', power: 'site_power', bridge: 'site_bridge', beach: 'site_beach' };
    // a model the kit does not draw yet stands in as its nearest relative (counted by wargame.py --check as a gap, and the card says so)
    var STAND = { a10: 'f15e', nasams: 'iris_t_sys', flamingo: 'storm_shadow', neptune: 'storm_shadow', fp1: 'tb2', altius: 'lancet', cv_liaoning: 'cv_shandong', df26: 'df21d', j6w: 'mig29', jmsdf_ddg: 'ddg_burke', type12_er: 'coastal_ascm', thaad: 'thaad_battery' };
    // a stock of missiles or drones stands on the board as what launches it
    var LAUNCH = { emad: 'tel_ir', fateh110: 'tel_ir', ghadr: 'tel_ir', paveh: 'tel_ir', shahed136: 'tel_shahed', df15: 'df21_tel', df21d: 'df21_tel', df26: 'df26_tel', atacms: 'himars', storm_shadow: 'su24', jassm: 'b1b', stunner: 'irondome', tomahawk: 'ddg_burke' };
    function kitType(t) { if (!KIT || !t) return null; if (KIT.has(t)) return t; var s = STAND[t]; return s && KIT.has(s) ? s : null; }
    function atSea(p) { return p.k === 'choke' || (p.k === 'naval' && /\b(station|sea)\b/i.test(p.n || '')) || /strait|channel/i.test(p.id); }
    function placeType(p) {
      if (!KIT || p.off || atSea(p)) return null;
      var t = p.model || BYID[p.id] || (p.k === 'capital' ? CAPK[p.id] || CITYK : BYKIND[p.k]);
      if (p.k === 'airdef' && p.team === 'red' && TID === 'iran' && !BYID[p.id]) t = 's300';
      return kitType(t) || kitType(BYKIND[p.k]);
    }
    function siteFit(p) { return (9 + (p.v || 2) * 2.2) * (p.k === 'capital' ? 1.3 : p.k === 'city' ? 1.1 : 1); }
    function teamName(o) { var t = teamOf(o); return t === 'blue' || t === 'red' ? t : 'grey'; }
    function put(obj, x, y, lift) { obj.position.set(wx(x), hAt(x, y) + (lift || 0), wz(y)); }
    function kitAdd(obj, fit, kind) { obj.userData.fit = fit; obj.userData.kind = kind; obj.userData.s1 = obj.scale.x; obj.matrixAutoUpdate = true; scene.add(obj); kitObjs.push(obj); return obj; }
    function buildKit() {
      if (!KIT || kitBuilt) return; kitBuilt = 1; KU = Math.max(0.35, homeD / 1000) * 1.8;
      marks.forEach(function (m) {
        var p = m.p, t = placeType(p); if (!t) return;
        var o = KIT.make(t, { team: teamName(p.o), fit: siteFit(p) }); o.rotation.y = (p.mi * 2.399) % 6.283 * 0.25;
        m.model = kitAdd(o, siteFit(p), 'site'); m.model.userData.place = p.id; put(o, p.ex, p.ey, 0);
      });
      // the order of battle: each row at each of its places (a red site of its own is already a place), grouped so none overlap
      var spots = {};
      ['blue', 'red'].forEach(function (team) {
        (OOB[team] || []).forEach(function (f) {
          if (team === 'red' && KIND_OF[f.type]) return;
          var t = kitType(LAUNCH[f.type] && !KIT.has(f.type) ? LAUNCH[f.type] : f.type) || kitType(LAUNCH[f.type]); if (!t) return;
          var meta = KIT.types[t] || {}, cat = meta.cat;
          if (cat === 'munition') { t = kitType(LAUNCH[f.type]); if (!t) return; meta = KIT.types[t] || {}; cat = meta.cat; }
          (f.at || []).forEach(function (a) {
            var p = typeof a === 'string' ? PL[a] : null, q = p ? [p.ex, p.ey] : pt(a); if (!q) return;
            var key = p ? p.id : q.join(',');
            (spots[key] = spots[key] || { x: q[0], y: q[1], p: p, list: [] }).list.push({ f: f, t: t, cat: cat });
          });
        });
      });
      Object.keys(spots).forEach(function (key) {
        var sp = spots[key], sea = sp.p ? atSea(sp.p) : false, base = (sp.p ? siteFit(sp.p) : 14) * KU;
        var ships = sp.list.filter(function (u) { return u.cat === 'sea'; }), rest = sp.list.filter(function (u) { return u.cat !== 'sea'; });
        // a carrier group: the carriers in a line abreast, the destroyers and amphibious ships on a ring around them
        var big = ships.filter(function (u) { return /^(cvn|cv_|lha|lhd|type075|type076)/.test(u.t); }), small = ships.filter(function (u) { return big.indexOf(u) < 0; });
        var n = 0, k;
        big.forEach(function (u, i) { var fit = /^(cvn|cv_)/.test(u.t) ? 22 : 16, ox = (i - (big.length - 1) / 2) * 30 * KU, oy = sea ? 0 : base * 0.9; unitAt(u, sp.x + ox, sp.y + oy, fit, 0); n++; });
        var esc = []; small.forEach(function (u) { var c = Math.min(typeof u.f.count === 'number' ? u.f.count : 1, sea ? 6 : 2); for (k = 0; k < c; k++) esc.push(u); });
        esc.forEach(function (u, i) { var a = i / Math.max(1, esc.length) * 6.283 + 0.4, r = (sea ? (26 + big.length * 10) * KU : base * 0.95); unitAt(u, sp.x + Math.cos(a) * r, sp.y + Math.sin(a) * r * 0.8, 10, a + 1.57); });
        rest.forEach(function (u, i) {
          var a = (i + 0.5) / Math.max(1, rest.length) * 3.6 - 1.8 + (sp.p ? sp.p.mi : 0) * 0.3, r = base * 0.72 + 2;
          var air = u.cat === 'air', fit = air ? (/^(b2|b52|b1b|kc|e3|e2d|tu95|h6k|c17|y20)/.test(u.t) ? 11 : 7) : 9;
          unitAt(u, sp.x + Math.cos(a) * r, sp.y + Math.sin(a) * r, fit, a);
          if (/^(kc135|kc46|e3|e2d|kj500)$/.test(u.t) && sp.p) orbitOf(u, sp.p);
        });
      });
      kitScale();
    }
    function unitAt(u, x, y, fit, yaw) {
      var o = KIT.make(u.t, { team: teamName(u.f.o), fit: fit }); o.rotation.y = yaw || 0;
      put(o, x, y, u.cat === 'sea' ? 0.2 : 0.4); kitAdd(o, fit, u.cat === 'sea' ? 'ship' : 'unit');
      var rec = { f: u.f, t: u.t, o: o, x: x, y: y, stand: u.t !== u.f.type && !LAUNCH[u.f.type] };
      o.userData.unit = rec; units.push(rec); return rec;
    }
    // tankers and radar planes fly a racetrack between their base and the other side's capital, as they would on station
    function orbitOf(u, p) {
      var cap = PLACES.filter(function (q) { return q.k === 'capital' && q.team !== teamOf(u.f.o) && !q.off; })[0]; if (!cap) return;
      var cx = p.ex + (cap.ex - p.ex) * 0.32, cy = p.ey + (cap.ey - p.ey) * 0.32;
      var o = KIT.make(u.t, { team: teamName(u.f.o), fit: 10 }); kitAdd(o, 10, 'air');
      orbiters.push({ o: o, x: cx, y: cy, r: 22, ph: Math.random() * 6.28, f: u.f });
    }
    function kitScale() {
      if (!KIT) return;
      KU = Math.max(0.35, homeD / 1000) * 1.8;      // game scale: a site reads at the home view on a phone, as a strategy game draws it
      kitObjs.forEach(function (o) { o.scale.setScalar(o.userData.s1 * KU * ZK); });
    }
    var ZK = 1;      // closer in, the models shrink toward true scale, so a zoomed view is not crowded by its own sites
    var lodT = 0;
    function kitFrame(now, dt) {
      if (!KIT) return;
      var zk = clamp(Math.pow(cam.d / Math.max(1, homeD), 0.45), 0.45, 1.15);
      if (Math.abs(zk - ZK) > 0.02) { ZK = zk; kitScale(); placeMarks(); }
      KIT.tick(dt, now / 1000);
      orbiters.forEach(function (b) {
        var a = now / 1000 * 0.22 + b.ph, x = b.x + Math.cos(a) * b.r * KU, y = b.y + Math.sin(a) * b.r * 0.55 * KU;
        b.o.position.set(wx(x), Math.max(hAt(x, y), 0) + 34 * KU, wz(y));
        b.o.rotation.y = -a + Math.PI;      // tangent to the circle, nose forward
      });
      units.forEach(function (u) { if (u.o.userData.kind === 'ship') u.o.position.y = 0.2 + Math.sin(now / 900 + u.x) * 0.15 * KU; });
      if (now - lodT > 250) {      // a model smaller than about two pixels is not drawn (its badge still is): a phone keeps its frame rate
        lodT = now; var p11 = camera.projectionMatrix.elements[5];
        kitObjs.forEach(function (o) { var d = o.position.distanceTo(camera.position) || 1, px = o.userData.fit * KU * p11 * vh / (2 * d); o.visible = px > (o.userData.kind === 'site' ? 2.2 : 3); });
      }
      if (KFX) KFX.update(dt, now / 1000);
    }
    // a damaged site: its model darkens, its lights go out, and it burns and smokes for as long as the run is on the board
    function damage(id, instant) {
      if (!KIT || damaged[id]) return; var m = marks.filter(function (q) { return q.p.id === id; })[0]; if (!m) return;
      damaged[id] = 1; var p = m.p, fit = siteFit(p) * KU;
      if (m.model) m.model.traverse(function (n) { if (!n.isMesh) return; if (n.name === 'glow' || n.name === 'glowAdd') { n.visible = false; return; } if (darkMat[n.name]) { n.userData.mat0 = n.userData.mat0 || n.material; n.material = darkMat[n.name]; } });
      if (KFX && !instant) { var v = pos3(p.ex, p.ey, 0.5); KFX.fire(v, fit * 0.32, 900); KFX.smoke(v, fit * 0.5, 900); }
      else if (KFX) { var v2 = pos3(p.ex, p.ey, 0.5); KFX.smoke(v2, fit * 0.4, 900); }
      if (p.k === 'power') darkAround(p, 1);
    }
    // a power plant hit: the cities it feeds go dark (the night lights under them are covered on the ground texture)
    function darkAround(p, k) {
      var R0 = (TID === 'ukraine' ? 150 : TID === 'taiwan' ? 90 : 200) * k;
      blackout.push([p.ex, p.ey, R0 * 0.55]);
      PLACES.forEach(function (q) { if (q.team === p.team && (q.k === 'city' || q.k === 'capital') && Math.hypot(q.ex - p.ex, q.ey - p.ey) < R0) { blackout.push([q.ex, q.ey, 26 + (q.v || 2) * 6]); var mm = marks[q.mi]; if (mm && mm.model) mm.model.traverse(function (n) { if (n.name === 'glow') n.visible = false; }); } });
      ovlDirty = 1;
    }
    function kitReset() {
      if (!KIT) return;
      damaged = {}; blackout = [];
      marks.forEach(function (m) { if (m.model) m.model.traverse(function (n) { if (!n.isMesh) return; n.visible = true; if (n.userData.mat0) n.material = n.userData.mat0; }); });
      if (KFX) KFX.clear();
      fliers.forEach(function (f) { if (f.tr) f.tr.stop(); scene.remove(f.o); }); fliers = [];
    }
    // what flies: the real aircraft, missile, drone or ship for each side and kind of event
    var FLY = {
      missile: { IR: ['emad', 'ghadr', 'kheibar_shekan', 'fattah', 'sejjil'], HT: ['zolfaghar'], HZ: ['fateh110'], RU: ['iskander', 'kinzhal', 'kh101', 'kalibr'], CN: ['df15', 'df21d', 'df17'], UA: ['atacms'], US: ['tomahawk'], IL: ['jassm'] },
      drone: { IR: ['shahed136', 'shahed136', 'shahed238'], HT: ['shahed136'], RU: ['shahed136', 'shahed238'], UA: ['tb2'], CN: ['mig29'], US: ['mq9'], IL: ['mq9'], TW: ['lancet'] },
      strike: { IL: ['f35', 'f15e', 'f16'], US: ['fa18', 'f35', 'f15e'], UA: ['su24'], RU: ['su34', 'tu95'], CN: ['h6k', 'j16', 'j20'], TW: ['f16', 'idf'], IR: ['su24'], JP: ['f35'] },
      naval: { CN: ['type075', 'type071', 'roro', 'type052d'], US: ['ddg_burke'], IR: ['irgcn_fac'], TW: ['kangding'], RU: ['grigorovich'], UA: ['magura'] }
    };
    var INT = { blue: { missile: TID === 'iran' ? ['arrow3', 'arrow2', 'thaad_int', 'sm3', 'pac3'] : TID === 'taiwan' ? ['pac3', 'tk3'] : ['pac3', 'iris_t'], drone: TID === 'iran' ? ['tamir'] : TID === 'taiwan' ? ['tk3'] : ['iris_t'] },
      red: { missile: TID === 'taiwan' ? ['hq9'] : TID === 'iran' ? ['sayyad4', 's300m'] : ['s300m'], drone: TID === 'taiwan' ? ['hq9'] : ['s300m'], strike: TID === 'taiwan' ? ['hq9'] : TID === 'iran' ? ['sayyad4'] : ['s300m'] } };
    function flyType(ev, i) {
      if (ev.kind === 'b2') return kitType('b2');
      var k = ev.t === 'ground' ? null : ev.t, L = k && FLY[k] && (FLY[k][ev.side] || FLY[k][teamOf(ev.side) === 'blue' ? 'US' : 'IR']);
      if (k === 'strike' && ev.side === 'US' && typeof ev.from === 'string' && PL[ev.from] && PL[ev.from].k === 'airbase') L = ['f15e', 'f35', 'f15e'];
      return L ? kitType(L[i % L.length]) : null;
    }
    var fliers = [];
    function flySize(t) { var c = (KIT.types[t] || {}).cat; return c === 'sea' ? 9 : c === 'munition' ? 5 : /^(b2|b52|b1b|tu95|h6k)$/.test(t) ? 10 : /^(shahed|mq9|tb2|lancet)/.test(t) ? 4 : 7; }
    function flyMake(t, team) { if (!t || fliers.length > (narrow() ? 40 : 90)) return null; var o = KIT.make(t, { team: team, fit: flySize(t) * 1.4 }); o.scale.multiplyScalar(KU); scene.add(o); return o; }
    function trailKind(t) { var c = (KIT.types[t] || {}).cat; return c === 'sea' ? 'wake' : c === 'munition' ? 'rocket' : /^(shahed|mq9|tb2|lancet)/.test(t) ? 'drone' : 'jet'; }
    function boomKind(id, res) {
      var p = id && PL[id]; if (!p) return 'blast';
      if (p.k === 'oil' || p.k === 'port' && p.team === 'red') return 'fuel';
      if (p.k === 'missile' || p.k === 'army' || p.k === 'industry') return 'secondary';
      if (p.k === 'nuclear' && (p.hard || 0) >= 0.6 || BYID[p.id] === 'site_nuclear_mountain') return 'bunker';
      if (atSea(p) || p.k === 'naval' && (KIT && units.some(function (u) { return u.f.at && u.f.at.indexOf(p.id) >= 0 && u.o.userData.kind === 'ship'; }))) return 'ship';
      return 'blast';
    }
    // a model drawn alone, for the Forces cards: rendered once per type into a small picture with the board's own renderer
    var thumbs = {}, thumbScene = null, thumbCam = null, thumbRT = null;
    function thumb(type, team) {
      var t = kitType(type) || kitType(LAUNCH[type]); if (!t) return null;
      var key = t + '|' + team; if (thumbs[key]) return thumbs[key];
      if (!thumbScene) {
        thumbScene = new T.Scene(); KIT.lights(thumbScene, { hemi: 3.2, sunI: 4.4, sky: 0xdce8ff, ground: 0x6a5a44 });
        thumbCam = new T.PerspectiveCamera(30, 4 / 3, 0.1, 1000); thumbRT = new T.WebGLRenderTarget(256, 192);
      }
      var o = KIT.make(t, { team: team, fit: 10 }); o.rotation.y = 0.75; thumbScene.add(o); o.updateMatrixWorld(true);
      var bb = new T.Box3().setFromObject(o), ctr = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()), rad = Math.max(sz.x, sz.z, sz.y * 1.3) * 0.62;
      var dist = rad / Math.tan(15 * Math.PI / 180) * 1.02;
      thumbCam.position.set(ctr.x + dist * 0.12, ctr.y + dist * 0.5, ctr.z + dist * 0.86); thumbCam.lookAt(ctr);
      var old = renderer.getRenderTarget(), oc = new T.Color(); renderer.getClearColor(oc); var oa = renderer.getClearAlpha();
      renderer.setRenderTarget(thumbRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(thumbScene, thumbCam);
      var px = new Uint8Array(256 * 192 * 4); renderer.readRenderTargetPixels(thumbRT, 0, 0, 256, 192, px);
      renderer.setRenderTarget(old); renderer.setClearColor(oc, oa); thumbScene.remove(o);
      var c = D.createElement('canvas'); c.width = 256; c.height = 192; var x = c.getContext('2d'), im = x.createImageData(256, 192);
      for (var row = 0; row < 192; row++) im.data.set(px.subarray((191 - row) * 1024, (192 - row) * 1024), row * 1024);
      x.putImageData(im, 0, 0);
      try { thumbs[key] = c.toDataURL('image/png'); } catch (e) { thumbs[key] = null; }
      return thumbs[key];
    }
    // the grid of a whole side failing (the model's own number, each day of a run): the night lights of its cities fade with it
    function gridDark(f) { TU.uNight.value = clamp(f == null ? 1 : f, 0.15, 1); }
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
        if (KIT && kitBuilt) { s.mt = flyType(ev, i); s.team2 = team === 'blue' || team === 'red' ? team : 'grey'; }
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
        if (s.mt && !s.o && !s.gone) { s.o = flyMake(s.mt, s.team2); if (s.o) { fliers.push({ o: s.o }); if (KFX) s.tr = KFX.trail(s.o, { kind: trailKind(s.mt) }); } else s.gone = 1; }
        var end = s.dead ? s.cut : 1;
        if (s.dead && !s.icpt && x > s.cut - 0.3) {      // the interceptor rises to meet it where it will be
          at(s, ease(s, s.cut), tmp2);
          s.icpt = { a: pos3(s.icFrom[0], s.icFrom[1], 1), b: new T.Vector3(tmp2[0], tmp2[1], tmp2[2]), t0: now, dur: Math.max(200, (s.cut - x) * s.dur) };
          if (KIT && kitBuilt) { var dT = s.team === 'blue' ? 'red' : 'blue', IL = (INT[dT] || {})[s.k] || (INT[dT] || {}).missile; var it = IL ? kitType(IL[Math.floor(Math.random() * IL.length)]) : null; if (it) { s.icpt.o = flyMake(it, dT); if (s.icpt.o) { fliers.push({ o: s.icpt.o }); if (KFX) s.icpt.tr = KFX.trail(s.icpt.o, { kind: 'rocket' }); } } }
        }
        if (s.icpt) {
          var ic = s.icpt, f = clamp((now - ic.t0) / ic.dur, 0, 1), ix = ic.a.x + (ic.b.x - ic.a.x) * f, iz = ic.a.z + (ic.b.z - ic.a.z) * f, iy = ic.a.y + (ic.b.y - ic.a.y) * Math.pow(f, 0.7) + Math.sin(f * Math.PI) * 6;
          emit(GLOW, ix, iy, iz, 4.2 * homeD / 1000, [0.75, 0.95, 1], 1); emit(GLOW, ix, iy, iz, 10 * homeD / 1000, [0.4, 0.8, 1], 0.45);
          if (ic.o) { ic.o.position.set(ix, iy, iz); ic.o.lookAt(ix + (ic.b.x - ic.a.x), iy + (ic.b.y - ic.a.y) * 0.6 + 4, iz + (ic.b.z - ic.a.z)); }
          for (var q = 1; q < 20; q++) { var f2 = Math.max(0, f - q * 0.018), jx = ic.a.x + (ic.b.x - ic.a.x) * f2, jz = ic.a.z + (ic.b.z - ic.a.z) * f2, jy = ic.a.y + (ic.b.y - ic.a.y) * Math.pow(f2, 0.7) + Math.sin(f2 * Math.PI) * 6; emit(GLOW, jx, jy, jz, 3.2 * homeD / 1000 * (1 - q / 20), [0.5, 0.88, 1], 0.85 * (1 - q / 20)); }
        }
        if (x >= end) {
          if (s.dead) { at(s, ease(s, s.cut), tmp); burst(tmp[0], tmp[1], tmp[2], [0.75, 0.92, 1], 0.7, s.k === 'strike'); }
          else { impact(s.b[0], s.b[1], s.c, s.big ? 1.4 : 1, s.to, s.res, s.k); }
          flyDone(s);
          continue;
        }
        var u = ease(s, x), U0 = homeD / 1000;      // sizes grow with the theatre's home distance, so a head reads the same on every board
        at(s, u, tmp);
        if (s.o) { at(s, ease(s, Math.min(1, x + 0.01)), tmp2); s.o.position.set(tmp[0], tmp[1], tmp[2]); if (Math.abs(tmp2[0] - tmp[0]) + Math.abs(tmp2[2] - tmp[2]) + Math.abs(tmp2[1] - tmp[1]) > 1e-4) s.o.lookAt(tmp2[0], tmp2[1], tmp2[2]); }
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
    function flyDone(s) {
      if (s.tr) s.tr.stop(); if (s.o) { var so = s.o; scene.remove(so); fliers = fliers.filter(function (f) { return f.o !== so; }); s.o = null; }
      if (s.icpt) { if (s.icpt.tr) s.icpt.tr.stop(); if (s.icpt.o) { var io = s.icpt.o; scene.remove(io); fliers = fliers.filter(function (f) { return f.o !== io; }); s.icpt.o = null; } }
    }
    function burst(x, y, z, c, k, jet) {
      if (KFX) { var bv = new T.Vector3(x, y, z); if (jet) KFX.explode(bv, 7 * homeD / 1000, 'air'); else KFX.intercept(bv, 5 * homeD / 1000); return; }
      k *= homeD / 1000;
      puff(GLOW, x, y, z, { life: 0.35, s0: 10 * k, s1: 22 * k, c: [1, 1, 1], a: 1 });
      puff(GLOW, x, y, z, { life: 0.6, s0: 6 * k, s1: 14 * k, c: c, a: 0.9 });
      for (var i = 0; i < 10; i++) { var a = Math.random() * 6.28, sp = 8 + Math.random() * 14; puff(GLOW, x, y, z, { life: 0.5 + Math.random() * 0.4, s0: 1.4, s1: 0.4, c: c, a: 1, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: (Math.random() - 0.3) * sp, g: 18, drag: 1.5 }); }
    }
    function impact(x, y, c, k, id, res, kind) {
      var p = pos3(x, y, 0.6), k0 = k; k *= Math.max(0.8, homeD / 1000);
      if (KFX) {      // the kit's explosion of the right kind: a refinery burns, a missile base cooks off, a buried site throws dust, a ship erupts
        var bk = kind === 'naval' && !id ? 'ship' : boomKind(id, res);
        KFX.explode(p, (id && PL[id] ? 4 + (PL[id].v || 2) * 1.4 : 5) * k, bk);
        wave(p.x, p.y, p.z, 10 * k, 0xffa560); addScorch(x, y, 5 * k0 + Math.random() * 2);
        if (id) hit(id, res, false);
        return;
      }
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
      if (res === 'hit' || res === 'partial') { m.hit = performance.now(); m.s.material.color.setRGB(1, 0.62, 0.5); if (instant) addScorch(m.p.ex, m.p.ey, 6); damage(id, instant); }
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
      if (fx1 - fx0 < 0.5) { fx0 = -1; fx1 = 1; } if (fy1 - fy0 < 0.5) { fy0 = -1; fy1 = 1; }      // panels mid-move can leave no free room: fit the whole screen rather than fly the camera to its limit
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
      dMax = 6000; var fa = fitD([[0, 0], [G.w, G.h]], 0), f = fitD(HOME, 0); if (f.d < 7000 || !homeD) homeD = f.d; dMax = fa.d * 1.15; dMin = Math.max(40, fa.d * 0.06); TU.uFog.value.set(homeD * 1.1, homeD * 3);
      if (KIT) { if (!kitBuilt) buildKit(); else kitScale(); KITON = 1; placeMarks(); }
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
      units.forEach(function (u) { if (!u.o.visible) return; var q = screenOf(u.o.position), d = Math.hypot(q[0] - (cx - r.left), q[1] - (cy - r.top)); if (q[2] && d < 20 && d < bd * 0.8) { bd = d; best = { unit: u }; } });
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
        if (moved < 6 && pdown && ev.type === 'pointerup') { var p = pickAt(ev.clientX, ev.clientY); if (p && p.unit) unitSheet(p.unit.f, p.unit); else if (p) placeSheet(p); else if (S.sel || !sheet.hidden) { select(null); if (!sheet.hidden) closeSheet(); } }
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
      kitFrame(now, dt);
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
      reset: function () { shots.forEach(flyDone); shots = []; timers.forEach(clearTimeout); timers = []; GLOW.live = []; SMOKE.live = []; scorch = []; kitReset(); drawOvl(); marks.forEach(function (m) { m.hit = 0; m.s.material.color.setRGB(1, 1, 1); }); },
      thumb: thumb, units: function () { return units; }, kit: function () { return KIT; }, gridDark: gridDark,
      shot: shot, hit: hit, front: setFront, focus: focus, home: home, select: select, pulse: pulse, resize: resize,
      zoomBy: function (f) { goal.d = clamp(goal.d * f, dMin, dMax); }, rotateBy: function (a) { goal.yaw += a; },
      moveTo: function (x, y) { goal.x = wx(x); goal.z = wz(y); clampGoal(); },
      groundRect: function () { var r = glc.getBoundingClientRect(), q = [[r.left + ins.l, r.top + ins.t], [r.right - ins.r, r.top + ins.t], [r.right - ins.r, r.bottom - ins.b], [r.left + ins.l, r.bottom - ins.b]].map(function (c) { var g = ground(c[0], c[1]); return g ? [g[0] + HW, g[1] + HH] : null; }); return q.every(Boolean) ? q : null; },
      fps: function () { return fps; }, cam: cam, renderer: renderer,
      dbg: function () { return { shots: shots.length, glow: GLOW.n, live: GLOW.live.length, smoke: SMOKE.n, d: Math.round(cam.d), goal: Math.round(goal.d), homeD: Math.round(homeD), dMax: Math.round(dMax), fliers: fliers.length, units: units.length, models: kitObjs.length, fps: Math.round(fps) }; }
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
  // ?shot=run | step:<id> | tab:<id> | brief:<expert> | unit:<oob id> | compare: put the page in that state for a screenshot (the
  // headless checks in TOOLS.md "the second rebuild" judge the board in the middle of a played run). Does nothing otherwise.
  function demo() {
    var m = /[?&]shot=([a-z]+)(?::([\w-]+))?/.exec(location.search); if (!m) return;
    var at = /[?&]at=([\w-]+)(?::([\d.]+))?/.exec(location.search);
    if (at && PL[at[1]] && V) setTimeout(function () { touched(); lastTouch = Date.now() + 600000; V.focus([[PL[at[1]].ex, PL[at[1]].ey]], { tight: true, instant: true }); if (at[2]) V.zoomBy(+at[2]); }, 50);
    if (/[?&]dbg=1/.test(location.search)) setInterval(function () { var d = D.getElementById('wg-dbg') || D.body.appendChild(Object.assign(D.createElement('pre'), { id: 'wg-dbg' })); d.style.cssText = 'position:fixed;left:0;bottom:0;z-index:99;background:#003;color:#8cf;font:12px monospace;padding:6px'; var wide = []; $$('body *').forEach(function (e) { var r = e.getBoundingClientRect(); if (r.right > W.innerWidth + 1 && r.width > 0 && wide.length < 6 && !e.closest('#wg-dbg')) wide.push((e.id || e.className || e.tagName) + ':' + Math.round(r.right)); }); d.textContent = 'sw ' + D.documentElement.scrollWidth + ' iw ' + W.innerWidth + ' ' + wide.join(' | ') + ' ' + JSON.stringify(V && V.dbg ? V.dbg() : {}); }, 500);
    if (m[1] === 'run') run();
    else if (m[1] === 'step') step(m[2]);
    else if (m[1] === 'tab') { S.tab = m[2]; drawPanel(); }
    else if (m[1] === 'brief') brief(EXID[m[2]] || EX[0]);
    else if (m[1] === 'unit') { var f = (OOB.blue || []).concat(OOB.red || []).filter(function (x) { return x.id === m[2]; })[0]; var u = V && V.units ? V.units().filter(function (q) { return q.f === f; })[0] : null; if (f) unitSheet(f, u); }
    else if (m[1] === 'compare') { S.saved = [{ n: tr('Plan A'), lv: planDefault() }].concat(EX.slice(0, 3).map(function (x) { return { n: x.n, lv: planOf(x), who: x.id }; })); S.tab = 'compare'; drawPanel(); compare(); }
  }
  function boot(v) {
    V = v; layout(); idle(); if (S.tab === 'plan') drawTab();
    (V.ready || Promise.resolve()).then(function () { var l = $('#wg-load'); if (l) l.remove(); tog(app, 'live', true); demo(); var f = TID === 'ukraine' ? frontAt(R.today) : null; if (f) V.front(frontPts(f.line), f.lobes); });
  }
  var forceFlat = /[?&]flat=1/.test(location.search);
  if (!forceFlat && hasGL() && GLR.three) {
    var kitP = GLR.kit ? import(new URL(GLR.kit, location.href).href).catch(function (x) { if (W.console) console.warn('Conflict Simulator: the 3D kit did not load, drawing markers only', x); return null; }) : Promise.resolve(null);
    Promise.all([import(new URL(GLR.three, location.href).href), kitP]).then(function (mods) {      // import() resolves against this script, not the page: make it absolute
      var T = mods[0], v = null;
      try { v = makeGL(T, mods[1]); } catch (x) { if (W.console) console.warn('Conflict Simulator: WebGL failed, drawing the flat board', x); }
      if (v) { tog(app, 'gl', true); boot(v); } else { switchToFlat(); idle(); }
    }, function (x) { if (W.console) console.warn('Conflict Simulator: three.js did not load, drawing the flat board', x); switchToFlat(); idle(); });
  } else { switchToFlat(); idle(); }
  W.WG = { tagOverlaps: tagOverlaps, step: function (k) { if (S.tab === 'plan' && S.step === k) return; S.step = k; S.tab = 'plan'; drawPanel(); }, run: run, replay: startReplay, models: MODELS, params: params, state: S, runMany: runMany, runOne: runOne, seek: seek, view: function () { return V; }, fps: function () { return V && V.fps ? V.fps() : 0; }, brief: function (id) { brief(EXID[id] || EX[0]); }, place: function (id) { placeSheet(PL[id]); }, layout: layout };
})();
