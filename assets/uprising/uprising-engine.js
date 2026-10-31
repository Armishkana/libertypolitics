/* THE UPRISING SIMULATOR'S MODEL (libertypolitics.com uprising/, iranuncensored.com <lang>/uprising/, 1 November 2026).
   The page, the data and the words: build/uprising.py's docstring. This file is the model only, and it runs in two places:
   on the page (uprising.js plays one run you watch, hour by hour, with every hex recorded so the timeline can be scrubbed)
   and as a Web Worker (the hundreds of runs behind the odds, the reasons and the best-plan search). No DOM in here.

   THE MODEL, in one paragraph. The city is a grid of hexes built from its real streets (OpenStreetMap): each hex has its
   people, its avenues, its side streets and alleys, its mosques (where the Basij bases sit), its police stations, its
   barracks and the places that matter (the governorate, the broadcaster, the main square, the prison, the airport, the
   roads in from other cities). Every hour: people come out where the uprising has reached and where they are angry, and
   go home where they are afraid; crowds move along the roads toward the plan's targets or scatter into the alleys; the
   regime moves its forces to guard what matters and to break the biggest crowds, escalating from gas to massacre when it
   feels threatened (faster when the internet is off and nobody can film); where crowds outnumber forces the hex turns;
   forces lose cohesion under numbers, strikes, discipline and fraternization, and units defect; reinforcements come in
   on the highways unless the roads are held. Arms make crowds stronger where they fight and smaller everywhere, and
   harden the forces. The weights come from the research register (data/uprising/research.json): every constant below
   that is not plain geometry names the finding it stands on in K_SRC.

   Never classList.toggle here (there is no DOM); never Math.random (every run is a seed, so a run can be replayed). */
(function (G) {
  'use strict';

  // ------------------------------------------------------------------ small tools
  function rng(seed) { let a = (seed >>> 0) || 1; return function () { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(R) { let u = 0, v = 0; while (u === 0) u = R(); while (v === 0) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function pick(R, opts) { let s = 0; for (const o of opts) s += o[1]; let u = R() * s; for (const o of opts) { u -= o[1]; if (u <= 0) return o[0]; } return opts[opts.length - 1][0]; }
  function lognorm(R, sd) { return Math.exp(gauss(R) * sd - sd * sd / 2); }

  // ------------------------------------------------------------------ the constants (named so the page can show them)
  const K = {
    forcesPerPop: 0.0075,     // police, special units, Basij street units and IRGC a city can put on the street: 0.75% of its people
    coreShare: 0.35,          // of those, the IRGC, the special units and the plainclothes: the part that almost never defects
    armyPerPop: 0.0012,       // the regular army (Artesh) in the city's barracks
    KF: [2, 3.5, 6, 12, 26],   // how many unarmed people one member of the forces holds back, by the level of force used
    KA: 12,                   // one defected, armed soldier on the people's side, in the same units
    LAMBDA: [0, 0.000003, 0.00004, 0.0005, 0.0025],   // deaths per hour per exposed person in a clash, by level of force
    MU: [0, 0.004, 0.006, 0.006, 0.008],              // arrests per hour per exposed person
    THR: [0.25, 0.6, 1.0, 1.6],                        // the threat at which the regime moves up a level
    hours: 336,               // two weeks
  };
  const LEVELS = ['Watching', 'Batons and tear gas', 'Birdshot and some live fire', 'Live fire on crowds', 'Massacre: heavy weapons'];
  const K_SRC = {      // which finding in research.json each part of the model stands on (shown in How it works)
    participation: ['chenoweth-participation', 'chenoweth-3-5'], defection: ['defection-mechanism', 'chenoweth-defection'],
    backfire: ['backfire'], blackout: ['blackout-massacre', 'hassanpour-shutdown'], strike: ['strike-1978', 'strikes'],
    armed: ['chenoweth-violent', 'armed-civil-war'], city: ['beissinger-city'], night: ['night'], proxies: ['proxies-2026'],
  };

  // The strategies. Each sets the plan's dials; the reader can then move any dial. ids are stable (they ride in the address).
  const PLANS = {
    centre:    { conv: 0.85, strike: 0.15, blockade: 0.15, discipline: 0.85, fraternize: 0.45, night: 0.15, medics: 0.4, pace: 0.8, offline: 0.4, voice: 0.4, targets: 'centre' },
    districts: { conv: 0.25, strike: 0.25, blockade: 0.45, discipline: 0.75, fraternize: 0.4,  night: 0.45, medics: 0.55, pace: 0.45, offline: 0.6, voice: 0.2, targets: 'police' },
    water:     { conv: 0.15, strike: 0.2,  blockade: 0.2,  discipline: 0.85, fraternize: 0.3,  night: 0.5,  medics: 0.5, pace: 0.6, offline: 0.7, voice: 0.1, targets: 'spread' },
    strike:    { conv: 0.6,  strike: 0.95, blockade: 0.3,  discipline: 0.9,  fraternize: 0.5,  night: 0.1,  medics: 0.4, pace: 0.2, offline: 0.6, voice: 0.3, targets: 'centre' },
    soldiers:  { conv: 0.55, strike: 0.45, blockade: 0.1,  discipline: 0.97, fraternize: 0.95, night: 0.05, medics: 0.5, pace: 0.5, offline: 0.5, voice: 0.3, targets: 'garrison' },
    roads:     { conv: 0.35, strike: 0.35, blockade: 0.95, discipline: 0.75, fraternize: 0.4,  night: 0.35, medics: 0.4, pace: 0.6, offline: 0.6, voice: 0.2, targets: 'roads' },
    voice:     { conv: 0.7,  strike: 0.25, blockade: 0.2,  discipline: 0.85, fraternize: 0.5,  night: 0.2,  medics: 0.4, pace: 0.75, offline: 0.5, voice: 1.0, targets: 'tv' },
    night:     { conv: 0.3,  strike: 0.3,  blockade: 0.4,  discipline: 0.7,  fraternize: 0.35, night: 0.95, medics: 0.5, pace: 0.4, offline: 0.6, voice: 0.15, targets: 'police' },
    armed:     { conv: 0.5,  strike: 0.2,  blockade: 0.6,  discipline: 0.3,  fraternize: 0.15, night: 0.6,  medics: 0.5, pace: 0.7, offline: 0.5, voice: 0.3, targets: 'police' },
  };
  const DIALS = ['conv', 'strike', 'blockade', 'discipline', 'fraternize', 'night', 'medics', 'pace', 'offline', 'voice'];
  // How much each kind of place is worth taking, by the plan's targets (the regime guards in proportion to the base weight).
  const BASEW = { gov: 3, tv: 2.5, police: 2, square: 2, prison: 1.2, airport: 1.2, garrison: 2 };
  const TARGETW = {
    centre:   { gov: 3, tv: 1.5, police: 1, square: 4, prison: 0.6, airport: 0.4, garrison: 0.2 },
    police:   { gov: 1.5, tv: 1, police: 4, square: 1.5, prison: 1, airport: 0.5, garrison: 0.4 },
    spread:   { gov: 1, tv: 1, police: 2, square: 1.5, prison: 0.6, airport: 0.3, garrison: 0.2 },
    garrison: { gov: 1.5, tv: 1, police: 1, square: 2, prison: 0.6, airport: 0.6, garrison: 4 },
    roads:    { gov: 1.5, tv: 1, police: 1.5, square: 1.5, prison: 0.6, airport: 2.5, garrison: 0.5 },
    tv:       { gov: 2, tv: 5, police: 1, square: 2, prison: 0.6, airport: 0.5, garrison: 0.3 },
  };

  // ------------------------------------------------------------------ the board, once per city
  function prep(Bj) {
    if (Bj._p) return Bj._p;
    const H = Bj.hex, N = H.x.length, s = Bj.s;
    const B = { N, s, pop: Bj.pop, g: Bj.g, x: H.x, y: H.y };
    B.P = Float64Array.from(H.p); B.art = Float64Array.from(H.art); B.ter = Float64Array.from(H.ter); B.res = Float64Array.from(H.res);
    B.mos = Float64Array.from(H.mos); B.pol = Float64Array.from(H.pol); B.gar = Float64Array.from(H.gar); B.ent = Uint8Array.from(H.ent);
    B.shr = Float64Array.from(H.shr || new Array(N).fill(0));
    B.alley = new Float64Array(N); B.open = new Float64Array(N); B.cap = new Float64Array(N); B.periph = new Float64Array(N); B.sym = new Float64Array(N);
    let rmax = 1;
    for (let i = 0; i < N; i++) rmax = Math.max(rmax, Math.hypot(B.x[i], B.y[i]));
    const mosT = B.mos.reduce((a, v) => a + v, 0) || 1;
    for (let i = 0; i < N; i++) {
      const tot = B.art[i] + B.ter[i] + B.res[i] + 1;
      B.alley[i] = B.res[i] / tot; B.open[i] = B.art[i] / tot;
      B.cap[i] = (B.art[i] * 28 + B.ter[i] * 14 + B.res[i] * 6) * 1.5 + 2000;
      B.periph[i] = clamp(Math.hypot(B.x[i], B.y[i]) / rmax, 0, 1);
      // Poorer edges of Iranian cities rose hardest in 2019 and 2026; the shrine districts least (research: city history)
      B.sym[i] = clamp((0.8 + 0.35 * B.periph[i]) - 0.3 * Math.min(1, B.shr[i]), 0.2, 1.4);
    }
    B.mosShare = Float64Array.from(B.mos, v => v / mosT);
    // adjacency, flattened
    const off = new Int32Array(N + 1), nb = [];
    for (let i = 0; i < N; i++) { off[i] = nb.length; for (const j of H.nb[i]) nb.push(j); }
    off[N] = nb.length;
    B.off = off; B.nb = Int32Array.from(nb);
    B.ecap = new Float64Array(nb.length);      // people per hour that can cross from i to j along the roads
    for (let i = 0; i < N; i++) for (let e = off[i]; e < off[i + 1]; e++) {
      const j = B.nb[e];
      const ad = (B.art[i] + B.art[j]) / (2 * s), td = (B.ter[i] + B.ter[j]) / (2 * s), rd = (B.res[i] + B.res[j]) / (2 * s);
      B.ecap[e] = 20000 * ad + 6000 * td + 1500 * rd + 300;
    }
    // the places that matter
    B.sites = (Bj.sites || []).map((q, idx) => Object.assign({ idx }, q));
    B.obj = B.sites.filter(q => BASEW[q.k] != null);
    B.objW = B.obj.reduce((a, q) => a + BASEW[q.k], 0) || 1;
    B.Ptot = B.P.reduce((a, v) => a + v, 0) || 1;
    B.entries = []; for (let i = 0; i < N; i++) if (B.ent[i]) B.entries.push(i);
    B.entCap = B.entries.reduce((a, i) => a + B.art[i] + 1, 0) || 1;
    B.garH = []; for (let i = 0; i < N; i++) if (B.gar[i] > 0) B.garH.push(i);
    B.ign = Bj.ign || {};      // auto ignition hexes by kind (uni, bazaar, periphery, centre), written by uprising.py
    Bj._p = B;
    return B;
  }

  // ------------------------------------------------------------------ what "let the model decide" means
  function autoTurnout(Bj, S, nf) {      // percent of the city's people on the streets at the busiest hour
    const g = Bj.g == null ? 0.6 : Bj.g;
    const occ = { none: 1, funeral: 1.25, national: 1.15 }[S.occasion || 'none'] || 1;
    return (0.5 + 3.2 * Math.pow(g, 1.2)) * (nf == null ? 0.85 : nf) * occ;
  }
  const NATION = { all: 1, some: 0.7, alone: 0.4 };
  const NET = { on: 1, slow: 0.55, off: 0.12 };

  function resolve(B, Bj, S, R, fixed) {
    const X = {}, P = Object.assign({}, PLANS[S.plan && S.plan.type] || PLANS.centre, (S.plan || {}));
    for (const d of DIALS) P[d] = clamp(+P[d] || 0, 0, 1);
    if (!PLANS[P.type] || (P.type === 'armed' && !S.armed)) P.type = 'centre';
    if (!TARGETW[P.targets]) P.targets = PLANS[P.type].targets;
    X.plan = P;
    X.nation = S.nation && S.nation !== 'auto' ? S.nation : (fixed ? 'all' : pick(R, [['all', 0.55], ['some', 0.33], ['alone', 0.12]]));
    X.nf = NATION[X.nation] || 1;
    X.autoTurnout = autoTurnout(Bj, S, X.nf);
    const sd = S.turnout == null ? 0.45 : 0.12;
    X.turnout = (S.turnout == null ? X.autoTurnout : +S.turnout) * (fixed ? 1 : lognorm(R, sd));
    X.netMode = S.net || 'auto';
    X.powerMode = S.power || 'auto';
    const sl = S.starlink == null ? Math.round(100000 * B.pop / 90e6) : +S.starlink;      // research: terminals in the country, shared by people
    X.starlink = sl;
    X.slFloor = clamp(0.12 + sl / B.pop * 150, 0.12, 0.42);
    X.proxies = S.proxies && S.proxies !== 'auto' ? S.proxies : (fixed ? 'some' : pick(R, [['some', 0.6], ['none', 0.3], ['many', 0.1]]));
    X.loyalty = S.loyalty || 'auto';
    const k0 = { firm: 0.93, auto: 0.85, shaky: 0.62 }[X.loyalty] || 0.85;
    X.kappa0 = clamp(k0 + (fixed ? 0 : gauss(R) * 0.06), 0.3, 0.98);
    X.outside = S.outside && S.outside !== 'auto' ? S.outside : 'pressure';
    X.ruth = clamp(0.75 + (fixed ? 0 : gauss(R) * 0.1) + (X.proxies === 'some' ? 0.08 : X.proxies === 'many' ? 0.16 : 0), 0.2, 1.2);
    X.armed = !!S.armed;
    X.guns = X.armed ? Math.max(0, +S.guns || 0) : 0;
    X.drones = X.armed ? Math.max(0, +S.drones || 0) : 0;
    X.armA = X.armed ? clamp(Math.log10(1 + X.guns + 10 * X.drones) / 5, 0, 1) : 0;      // how heavily armed, 0..1 (100,000 guns = 1)
    X.hour = S.hour == null ? 17 : ((+S.hour % 24) + 24) % 24;
    X.reinfDelay = 6 + (fixed ? 4 : R() * 8);
    X.reinfTotal = { all: 0.12, some: 0.45, alone: 1.0 }[X.nation] * (fixed ? 1 : (0.7 + R() * 0.6));
    X.occasion = S.occasion || 'none';
    return X;
  }

  const DIURNAL = [0.35, 0.2, 0.1, 0.06, 0.05, 0.06, 0.1, 0.2, 0.3, 0.4, 0.5, 0.55, 0.55, 0.55, 0.6, 0.7, 0.85, 1, 1, 1, 0.95, 0.85, 0.7, 0.5];
  const NIGHTB = [0.3, 0.2, 0.08, 0.02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.05, 0.15, 0.3, 0.35, 0.35, 0.35];
  function isNight(h) { return h >= 20 || h < 6; }

  // ------------------------------------------------------------------ one uprising
  // opt.record: keep every hour of every hex (the run you watch); opt.fixed: no luck in the draws; opt.ign: hexes it starts in.
  function run(Bj, S, seed, opt) {
    opt = opt || {};
    const B = prep(Bj), N = B.N, R = rng(seed), X = resolve(B, Bj, S, R, !!opt.fixed), P = X.plan;
    const pop = B.pop, F0 = pop * K.forcesPerPop;
    const OFF = B.off, NB = B.nb, BP = B.P, ALLEY = B.alley, KF = K.KF;
    const c = new Float64Array(N), f = new Float64Array(N), k = new Float64Array(N), b = new Float64Array(N), act = new Float64Array(N),
      al = new Float64Array(N), dead = new Float64Array(N), pw = new Float64Array(N).fill(1), ft = new Float64Array(N), D = new Float64Array(N);
    // the regime holds the city at hour 0; its barracks hold harder
    for (let i = 0; i < N; i++) k[i] = B.gar[i] > 0 ? -1 : -0.6;
    // its forces: rank (police conscripts, Basij), core (IRGC, special units), proxies (later), army (in barracks)
    let rank = F0 * (1 - K.coreShare), core = F0 * K.coreShare, prox = 0, army = B.garH.length ? pop * K.armyPerPop : 0;
    let armyState = 0;      // 0 in barracks, 1 deployed with the regime, 2 neutral, 3 joined the people
    let proxPending = X.proxies === 'some' ? 0.06 * F0 : X.proxies === 'many' ? 0.18 * F0 : 0;
    const proxAt = 12 + R() * 36;
    let reinfLeft = X.reinfTotal * F0;
    // place the forces: guards at the places that matter, Basij in their neighbourhoods, the rest by police stations
    const polT = B.pol.reduce((a, v) => a + v, 0) || 1;
    const guardW = new Float64Array(N);
    for (const q of B.obj) guardW[q.h] += BASEW[q.k];
    const gwT = guardW.reduce((a, v) => a + v, 0) || 1;
    for (let i = 0; i < N; i++) f[i] = F0 * (0.3 * guardW[i] / gwT + 0.35 * B.mosShare[i] + 0.35 * (B.pol[i] / polT));
    // ignition: where it starts
    let ign = opt.ign || (S.plan && S.plan.ign) || null;
    if (!ign || !ign.length) ign = autoIgnition(B, P);
    ign = ign.filter(i => i >= 0 && i < N);
    const igT = ign.map((h, n) => n === 0 ? 0 : Math.round(n * (1 - P.pace) * 3));      // a slow plan lights them one after another
    // globals
    let kappa = X.kappa0, Lv = 0, fear = 0, anger = X.occasion === 'funeral' ? 0.25 : 0.05, mom = 1, sigma = 0, cm = X.netMode === 'auto' ? NET.slow : NET[X.netMode] || 1;
    let netCut = X.netMode === 'off', netCutAt = X.netMode === 'off' ? 0 : -1, powerCut = X.powerMode === 'off';
    let deadT = 0, arrT = 0, defT = 0, peak = 0, peakAt = 0, lvMax = 0, held = new Uint8Array(B.obj.length), heldAt = new Int32Array(B.obj.length).fill(-1);
    let libFor = 0, crushFor = 0, outcome = null, tEnd = K.hours, tvHeld = false, firstClash = -1, armedClash = 0, firstDef = -1;
    let stepsSinceDij = 99, objHeldW = 0, ctl = 0, warHex = 0;
    const day24 = new Float64Array(24);
    const ev = opt.record ? [] : null, fl = { s3: 0, s6: 0, re: 0, bl: 0 };
    const rec = opt.record ? { c: [], f: [], k: [], al: [], dead: [], pw: [], g: [] } : null;
    const tl = [];      // every 6 hours: control, crowd, force (for the chart)
    function E(t, type, h, extra) { if (ev) ev.push(Object.assign({ t, type, h: h == null ? -1 : h }, extra || {})); }
    const TW = TARGETW[P.targets] || TARGETW.centre;
    const armedTouch = X.armA;
    const gunsPer = X.guns, dronesPer = X.drones;
    const hasTV = B.obj.some(q => q.k === 'tv');

    function tick(t) {
      const hr = (X.hour + t) % 24, night = isNight(hr);
      // --- the internet and the power, as the regime decides (auto) or as the reader set them
      if (X.netMode === 'auto') {
        const threatNet = (peak / pop) * 100;
        if (!netCut && (threatNet > 0.6 * (1.1 - X.ruth * 0.3) || Lv >= 3) && R() < 0.12 + 0.2 * X.ruth) { netCut = true; netCutAt = t; E(t, 'netcut'); }
        cm = netCut ? NET.off : NET.slow;
      } else cm = NET[X.netMode] == null ? 1 : NET[X.netMode];
      cm = Math.max(cm, X.slFloor);      // Starlink keeps a floor under any blackout
      let pwrCity = 1;
      if (X.powerMode === 'off') { pwrCity = 0; }
      else if (X.powerMode === 'cuts' || (X.powerMode === 'auto' && Lv >= 3 && night)) {
        // the regime darkens the districts where crowds are biggest, at night, to raid them
        pwrCity = 0.7;
        if (!powerCut && X.powerMode === 'auto') { powerCut = true; E(t, 'powercut'); }
      }
      for (let i = 0; i < N; i++) pw[i] = pwrCity >= 1 ? 1 : pwrCity <= 0 ? 0 : (c[i] > 0.002 * BP[i] + 50 && night ? 0 : 1);
      const cmEff = cm * (pwrCity <= 0 ? 0.6 : pwrCity < 1 ? 0.85 : 1);
      const coord = Math.max(0.3 + 0.7 * cmEff, 0.35 + 0.45 * P.offline);      // a plan agreed beforehand (times, places) survives a blackout

      // --- the strike
      const sigT = P.strike * clamp(X.turnout / 3, 0.2, 1) * (0.55 + 0.45 * B_g(Bj)) * (0.6 + 0.4 * clamp(mom, 0, 1.5) / 1.5);      // a strike needs people too
      sigma += (sigT - sigma) * 0.018;
      if (sigma > 0.3 && !fl.s3) { fl.s3 = 1; E(t, 'strike', -1, { lv: 1 }); }
      if (sigma > 0.65 && !fl.s6) { fl.s6 = 1; E(t, 'strike', -1, { lv: 2 }); }

      // --- how many are on the streets this hour
      const ramp = Math.min(1, (t + 1) / (4 + (1 - P.pace) * 56));
      const strikeHold = (P.strike > 0.7 && t < 48 && P.pace < 0.4) ? 0.35 : 1;      // the strike plan stays home first
      const dn = DIURNAL[hr] + P.night * NIGHTB[hr];
      const discP = 0.85 + 0.3 * P.discipline * (1 - armedTouch);
      const armP = 1 - 0.4 * armedTouch;
      const mood = clamp((1 + 0.7 * anger - 0.95 * fear) * Math.pow(clamp(mom, 0.2, 2.2), 0.7), 0.03, 2.5);
      const Nt = pop * X.turnout / 100 * ramp * dn * mood * discP * armP * strikeHold * (1 + 0.25 * sigma);
      // ignition and spread
      for (let n = 0; n < ign.length; n++) if (t >= igT[n]) act[ign[n]] = 1;
      const beta = 0.11 * (0.4 + 0.6 * cmEff) * clamp(mood, 0.2, 1.6) * (night && P.night < 0.5 ? 0.5 : 1);
      const jump = 0.004 * cmEff * mood;
      for (let i = 0; i < N; i++) {
        let s = 0, d = 0;
        for (let e = OFF[i]; e < OFF[i + 1]; e++) { const j = NB[e]; if (act[j] > act[i]) s += act[j] - act[i]; d++; }
        ft[i] = act[i] + (d ? beta * s / d : 0) + jump * (1 - act[i]) * R() * 2;
      }
      for (let i = 0; i < N; i++) act[i] = clamp(ft[i], 0, 1);
      // spawn or send home
      let C = 0; for (let i = 0; i < N; i++) C += c[i];
      const diff = Nt - C;
      if (diff > 0) {
        let wT = 0;
        for (let i = 0; i < N; i++) { ft[i] = BP[i] * B.sym[i] * act[i] * (k[i] < -0.85 ? 0.25 : 1) * (pw[i] ? 1 : 0.8); wT += ft[i]; }
        if (wT > 0) for (let i = 0; i < N; i++) c[i] += 0.5 * diff * ft[i] / wT;
      } else if (C > 0) {
        for (let i = 0; i < N; i++) c[i] -= Math.min(c[i], -0.4 * diff * c[i] / C);
      }
      // --- where the crowds go: toward the plan's targets along the roads, or away from the guns
      if (stepsSinceDij >= 4) { dijkstra(B, D, held, TW, f, c, P); stepsSinceDij = 0; } else stepsSinceDij++;
      const conv = P.conv * coord;
      for (let i = 0; i < N; i++) ft[i] = 0;
      for (let i = 0; i < N; i++) {
        if (c[i] < 1) continue;
        // next hop toward the target
        let best = -1, bd = D[i];
        for (let e = OFF[i]; e < OFF[i + 1]; e++) { const j = NB[e]; if (D[j] < bd) { bd = D[j]; best = e; } }
        let out = 0;
        if (best >= 0 && conv > 0) {
          const j = NB[best];
          const mv = Math.min(c[i] * conv * 0.3, B.ecap[best] * (1 - 0.5 * Math.max(0, -k[j]) * (f[j] > c[j] ? 1 : 0)));
          ft[j] += mv; out += mv;
        }
        // scatter: where the forces win, people run into the side streets
        const rho = (c[i] + 1) / (f[i] * KF[Lv] + 1);
        if (rho < 0.8 && f[i] > 0) {
          let bj = -1, bs = 1e18;
          for (let e = OFF[i]; e < OFF[i + 1]; e++) { const j = NB[e]; const sc = (f[j] + 1) / (c[j] + 50) / (0.5 + ALLEY[j]); if (sc < bs) { bs = sc; bj = j; } }
          if (bj >= 0) { const mv = (c[i] - out) * 0.3 * (0.8 - rho) * (0.5 + ALLEY[i]); ft[bj] += mv; out += mv; }
        }
        ft[i] -= out;
      }
      for (let i = 0; i < N; i++) { c[i] = Math.max(0, c[i] + ft[i]); if (c[i] > B.cap[i]) { const sp = c[i] - B.cap[i]; c[i] = B.cap[i]; spill(B, c, i, sp); } }

      // --- the regime moves its forces
      let F = rank + core + prox + (armyState === 1 ? army : 0);
      let threatSum = 0;
      for (let i = 0; i < N; i++) { ft[i] = c[i] * (1 + 2 * guardW[i] / 3) * (k[i] > 0 ? 1.4 : 1); threatSum += ft[i]; }
      const mob = 0.15 * (1 - 0.3 * sigma);
      let fs = 0;
      for (let i = 0; i < N; i++) {
        const want = F * (0.25 * guardW[i] / gwT + 0.15 * B.mosShare[i] + 0.6 * (threatSum > 0 ? ft[i] / threatSum : B.pol[i] / polT));
        let barr = b[i]; for (let e = OFF[i]; e < OFF[i + 1]; e++) barr = Math.max(barr, b[NB[e]] * 0.5);
        f[i] += (want - f[i]) * mob * (want > f[i] ? (1 - 0.75 * barr) * (k[i] > 0.5 ? 0.6 : 1) : 1);
        if (f[i] < 0) f[i] = 0; fs += f[i];
      }
      if (fs > 0) { const sc = F / fs; for (let i = 0; i < N; i++) f[i] *= sc; }

      // --- the clashes, hex by hex
      let deadH = 0, arrH = 0, lossF = 0, contested = 0, dronesLeft = dronesPer;
      const kEff = 0.5 + 0.5 * kappa;
      const coreShareNow = F > 0 ? (core + prox) / F : 0;
      const droneSup = X.armed ? clamp(dronesPer / (F0 * 0.02 + 1), 0, 1) * 0.25 : 0;
      const nightE = night ? (P.night > 0.5 ? 0.85 : 1.05) : 1;
      for (let i = 0; i < N; i++) {
        const ci = c[i], fi = f[i], ai = al[i];
        if (ci < 5 && fi < 5) { k[i] += (k[i] > 0 ? 0.002 : -0.004); continue; }
        if (ci < 5 && ai < 1) {      // the forces own the street
          k[i] = Math.max(-1, k[i] - 0.03); if (b[i] > 0) b[i] = Math.max(0, b[i] - 0.05); continue;
        }
        if (fi < 3) {      // nobody stops them
          k[i] = Math.min(1, k[i] + 0.06 * Math.min(1, ci / (BP[i] * 0.004 + 30)));
          if (k[i] > 0.2) b[i] = Math.min(1, b[i] + 0.03 * (0.4 + P.blockade + (B.ent[i] ? P.blockade : 0)));
          continue;
        }
        contested++;
        if (firstClash < 0) { firstClash = t; E(t, 'clash', i); }
        const gunsI = gunsPer * (C > 0 ? ci / C : 0);
        const gunQ = ci > 0 ? 6 * gunsI / ci : 0;
        const Q = (1 + 0.6 * b[i]) * (0.7 + 0.3 * clamp(mom, 0, 1.6)) * (1 + Math.min(gunQ, 6));
        const Ef = KF[Lv] * kEff * (1 - 0.45 * ALLEY[i]) * (1 - droneSup) * nightE * (1 + 0.15 * coreShareNow);
        const rho = (ci * Q + ai * K.KA) / (fi * Ef + 1);
        const expo = clamp(1 / rho, 0, 1.5);
        const dens = clamp(ci / B.cap[i], 0, 1);
        const dd = ci * K.LAMBDA[Lv] * expo * (0.6 + 0.8 * B.open[i]) * (1 + dens) * (1 - 0.4 * P.medics) * (X.armed ? 1.4 : 1) * (pw[i] ? 1 : 1.25);
        const aa = ci * K.MU[Lv] * expo * (night && !pw[i] ? 1.5 : 1);
        c[i] = Math.max(0, ci - dd - aa); dead[i] += dd; deadH += dd; arrH += aa;
        if (rho > 1) {
          k[i] = Math.min(1, k[i] + 0.12 * Math.min(rho - 1, 2));
          const w = fi * 0.05 * Math.min(rho - 1, 3);      // pushed back
          f[i] -= w; spillF(B, f, k, i, w);
        } else {
          k[i] = Math.max(-1, k[i] - 0.15 * (1 - rho));
          const go = c[i] * 0.25 * (1 - rho) * (1 + Lv / 4); c[i] -= go;      // dispersed, gone home
        }
        if (X.armed && gunsI + dronesLeft > 0) {
          const dI = dronesPer > 0 ? Math.min(dronesLeft, dronesPer * (ci / (C + 1))) : 0; dronesLeft -= dI;
          const lf = Math.min(f[i] * 0.04, gunsI * 0.003 + dI * 0.05);
          f[i] -= lf; lossF += lf; armedClash++;
          if (Lv < 2 && lf > 0.5) { Lv = 2; E(t, 'lv', i, { lv: 2, why: 'armed' }); }
        }
        // where disciplined crowds face conscripts eye to eye, some lower their guns
        if (kappa < 0.75 && P.discipline > 0.6 && ci > fi * 3) {
          const loc = fi * 0.004 * P.fraternize * (0.75 - kappa) * (1 - coreShareNow);
          f[i] -= loc; al[i] += loc * 0.5; rank = Math.max(0, rank - loc); defT += loc;
        }
        if (k[i] > 0.4 && P.blockade > 0) b[i] = Math.min(1, b[i] + 0.02 * P.blockade);
      }
      for (let i = 0; i < N; i++) if (f[i] < 0) f[i] = 0;
      // the forces' losses come off their pools
      if (lossF > 0 && F > 0) { rank = Math.max(0, rank - lossF * rank / F); core = Math.max(0, core - lossF * core / F); prox = Math.max(0, prox - lossF * prox / F); }
      deadT += deadH; arrT += arrH;
      C = 0; for (let i = 0; i < N; i++) C += c[i];
      if (C > peak) { peak = C; peakAt = t; }

      // --- the regime's choice of force
      F = rank + core + prox + (armyState === 1 ? army : 0);
      ctl = 0; for (let i = 0; i < N; i++) if (k[i] > 0) ctl += BP[i] * k[i];
      ctl /= B.Ptot;
      const threat = (F > 0 ? C / (F * KF[Math.max(1, Lv)]) : 3) + 3 * objHeldW + 1.5 * ctl;
      const will = X.ruth + (cm <= NET.off + 0.01 ? 0.15 : 0) + 0.25 * armedTouch;
      if (Lv < 4 && C > 50 && threat > K.THR[Lv] * (1.3 - will) && R() < 0.25) { Lv++; lvMax = Math.max(lvMax, Lv); E(t, 'lv', -1, { lv: Lv }); }
      else if (Lv > 1 && threat < 0.25 * K.THR[Lv - 1] && R() < 0.05) { Lv--; E(t, 'lv', -1, { lv: Lv, down: 1 }); }
      if (Lv === 0 && C > 50) { Lv = 1; E(t, 'lv', -1, { lv: 1 }); }

      // --- fear, anger, momentum
      const vis = 0.4 + 0.6 * cmEff;
      fear = clamp(fear * 0.985 + (Nt > 1 ? 25 * deadH / Nt * (1.3 - 0.6 * vis) : 0) + (Nt > 1 ? 0.6 * arrH / Nt : 0), 0, 1.2);      // a massacre in the dark frightens most
      anger = clamp(anger * 0.995 + (Nt > 1 ? 18 * deadH / Nt : 0) * (0.3 + 0.7 * P.discipline * (1 - armedTouch)) * vis * vis, 0, 1.5);      // backfire: seen killings of peaceful people
      // --- the places that matter
      objHeldW = 0;
      for (let n = 0; n < B.obj.length; n++) {
        const q = B.obj[n], kk = k[q.h];
        const gar = q.k === 'garrison';
        const take = gar ? (kk > 0.75 && (armyState >= 2 || f[q.h] < 20)) : kk > 0.55;
        if (!held[n] && take) { held[n] = 1; heldAt[n] = t; mom = Math.min(2.2, mom + 0.06 * BASEW[q.k] * vis); E(t, 'take', q.h, { site: q.idx }); if (q.k === 'tv') { tvHeld = true; mom += 0.3 * P.voice; kappa -= 0.06 * P.voice; } }
        else if (held[n] && kk < 0.15) { held[n] = 0; mom = Math.max(0.2, mom - 0.05 * BASEW[q.k]); E(t, 'lose', q.h, { site: q.idx }); if (q.k === 'tv') tvHeld = false; }
        if (held[n]) objHeldW += BASEW[q.k];
      }
      objHeldW /= B.objW;
      mom = clamp(mom + (ctl > 0.05 ? 0.004 : 0) - (contested > 0 && C < Nt * 0.5 ? 0.01 : 0) - (Lv >= 3 ? 0.004 : 0) + 0.0015 * sigma, 0.2, 2.2);
      if (tvHeld) cm = Math.max(cm, 0.5);

      // --- cohesion and defection
      day24[t % 24] = C; let C24 = 0; for (let h = 0; h < 24; h++) if (day24[h] > C24) C24 = day24[h];      // the pressure the forces feel: the day's biggest crowd
      const psi = F > 0 ? clamp((C24 / F - 1) / 3, 0, 3) * X.nf : 3;      // only crowds that outnumber the forces press on them
      let dk = -0.0025 * psi * (0.3 + P.fraternize) * (0.3 + P.discipline * (1 - armedTouch)) - 0.0015 * sigma
        - (Lv >= 3 && deadH > F * 0.0003 ? 0.003 * P.discipline * (1 - armedTouch) : 0)
        + (armedClash > 0 && lossF > 0 ? 0.004 * armedTouch : 0) + (ctl < 0.02 && t > 24 ? 0.0015 : 0);
      if (X.outside === 'strikes') dk -= 0.001;
      kappa = clamp(kappa + dk, 0.05, 1);
      if (kappa < 0.5) {
        const rate = 0.02 * (0.5 - kappa) / 0.5 * (1 + P.fraternize);
        const dr = rank * rate, dc = core * rate * 0.15;
        rank -= dr; core -= dc; defT += dr + dc;
        if (dr + dc > 1) {
          if (firstDef < 0) { firstDef = t; E(t, 'defect', -1, { n: Math.round(dr + dc) }); }
          let cw = 0; for (let i = 0; i < N; i++) cw += c[i] * (k[i] > 0 ? 1 : 0.3);
          for (let i = 0; i < N; i++) al[i] += (dr + dc) * 0.4 * (cw > 0 ? c[i] * (k[i] > 0 ? 1 : 0.3) / cw : 1 / N);
        }
      }
      if (kappa < 0.2 && F > 0) { const g = (rank + core) * 0.05; rank *= 0.95; core *= 0.95; defT += g * 0.3; }
      // the army
      if (army > 0) {
        if (armyState === 0 && ctl > 0.35 && kappa > 0.6 && R() < 0.03) { armyState = 1; E(t, 'army', -1, { s: 1 }); }
        else if ((armyState === 0 || armyState === 1) && kappa < 0.45 && psi > 0.8 && R() < 0.02) { armyState = 2; E(t, 'army', -1, { s: 2 }); }
        else if (armyState === 2 && kappa < 0.35 && ctl > 0.35 && R() < 0.03) {
          armyState = 3; E(t, 'army', -1, { s: 3 });
          for (const h of B.garH) { al[h] += army * 0.6 / B.garH.length; k[h] = Math.max(k[h], 0.6); }
          defT += army * 0.6;
        }
      }
      // reinforcements on the highways, unless the roads are held
      if (t >= X.reinfDelay && reinfLeft > 0) {
        let blk = 0; for (const i of B.entries) blk += (B.art[i] + 1) * clamp(Math.max(0, k[i]) * 0.7 + b[i] * 0.6, 0, 1);
        blk = clamp(blk / B.entCap, 0, 1);
        const arr = Math.min(reinfLeft, X.reinfTotal * F0 / 36) * (1 - 0.85 * blk) * (1 - 0.35 * sigma);
        reinfLeft -= X.reinfTotal * F0 / 36;
        rank += arr * 0.6; core += arr * 0.4;
        if (arr > 1 && !fl.re) { fl.re = 1; E(t, 'reinf', -1, { n: Math.round(arr * 36) }); }
        if (blk > 0.5 && !fl.bl) { fl.bl = 1; E(t, 'blocked'); }
      }
      if (proxPending > 0 && t >= proxAt) {
        let blk = 0; for (const i of B.entries) blk += (B.art[i] + 1) * clamp(Math.max(0, k[i]) * 0.7 + b[i] * 0.6, 0, 1);
        blk = clamp(blk / B.entCap, 0, 1);
        prox += proxPending * (1 - 0.6 * blk); E(t, 'proxies', -1, { n: Math.round(proxPending) }); proxPending = 0;
      }
      if (X.outside === 'strikes') core *= 0.999;
      // allies fight beside the crowds and lose men too
      for (let i = 0; i < N; i++) if (al[i] > 0 && f[i] > 0) al[i] *= 0.995;
      if (contested > N * 0.25 && X.armed && t > 72) warHex++;

      // --- record
      F = rank + core + prox + (armyState === 1 ? army : 0);
      if (rec) {
        rec.c.push(Float32Array.from(c)); rec.f.push(Float32Array.from(f)); rec.k.push(Float32Array.from(k)); rec.al.push(Float32Array.from(al));
        rec.dead.push(Float32Array.from(dead)); rec.pw.push(Uint8Array.from(pw));
        rec.g.push({ t, hr, C, F, Lv, kappa, cm, sigma, ctl, obj: objHeldW, dead: deadT, arr: arrT, def: defT, al: al.reduce((a, v) => a + v, 0), mood, army: armyState, net: netCut, power: pwrCity < 1, Nt, held: Array.from(held) });
      }
      if (t % 6 === 5) tl.push([Math.round(ctl * 1000) / 1000, Math.round(C), Math.round(F), Lv]);

      // --- is it over?
      const libNow = objHeldW >= 0.7 && ctl >= 0.5 || (F < F0 * 0.15 && kappa < 0.3 && ctl > 0.3);
      libFor = libNow ? libFor + 1 : 0;
      if (libFor >= 12) { outcome = 'liberated'; tEnd = t; E(t, 'liberated'); return true; }
      const crushNow = t > 36 && C < pop * 0.0015 && objHeldW === 0 && ctl < 0.03;
      crushFor = crushNow ? crushFor + 1 : 0;
      if (crushFor >= 24) { outcome = 'crushed'; tEnd = t; E(t, 'crushed'); return true; }
          return false;
    }
    for (let t = 0; t < K.hours; t++) if (tick(t)) break;
    let lastPeak = 0; for (let h = 0; h < 24; h++) if (day24[h] > lastPeak) lastPeak = day24[h];
    if (!outcome) {
      if (X.armed && warHex > 48 && ctl > 0.15) outcome = 'war';
      else if (ctl > 0.2 || objHeldW > 0.25) outcome = 'zones';
      else if (ctl < 0.03 && objHeldW === 0 && lastPeak < pop * 0.003) outcome = 'crushed';
      else outcome = 'stalemate';
    }
    const out = {
      outcome, tEnd, dead: Math.round(deadT), arrested: Math.round(arrT), defected: Math.round(defT), peak: Math.round(peak), peakAt, lvMax,
      netCutAt, ctl, objHeld: objHeldW, kappa, army: armyState, tvHeld, sigma, nation: X.nation, proxies: X.proxies, turnout: X.turnout, tl,
      firstDef, blockedReinf: !!fl.bl,
    };
    if (rec) { out.rec = rec; out.ev = ev; out.X = X; }
    return out;
  }
  function B_g(Bj) { return Bj.g == null ? 0.6 : Bj.g; }

  function spill(B, c, i, amt) {
    let d = B.off[i + 1] - B.off[i]; if (!d) return;
    for (let e = B.off[i]; e < B.off[i + 1]; e++) c[B.nb[e]] += amt / d;
  }
  function spillF(B, f, k, i, amt) {      // pushed-back forces fall back to the neighbours the regime still holds
    let w = 0; for (let e = B.off[i]; e < B.off[i + 1]; e++) if (k[B.nb[e]] < 0) w += -k[B.nb[e]];
    if (w <= 0) return;      // nowhere to go: they are lost to the fight (fled, hiding)
    for (let e = B.off[i]; e < B.off[i + 1]; e++) { const j = B.nb[e]; if (k[j] < 0) f[j] += amt * (-k[j]) / w; }
  }

  // The distance field the crowds walk down: from every place the plan wants and does not yet hold, along the roads.
  let HEAP = null;
  function dijkstra(B, D, held, TW, f, c, P) {
    const N = B.N; D.fill(1e12);
    const heap = HEAP || (HEAP = new MinHeap()); heap.n = 0;
    for (let n = 0; n < B.obj.length; n++) {
      if (held[n]) continue;
      const q = B.obj[n], w = (TW[q.k] || 0.5);
      const d0 = -w * B.s * 1.5;      // a target worth more pulls from further away
      if (d0 < D[q.h]) { D[q.h] = d0; heap.push(q.h, d0); }
    }
    if (P.targets === 'roads') for (const i of B.entries) { const d0 = -2.5 * B.s; if (d0 < D[i]) { D[i] = d0; heap.push(i, d0); } }
    if (P.targets === 'spread' || heap.n === 0) for (let i = 0; i < N; i++) if (B.pol[i] > 0) { const d0 = -B.s; if (d0 < D[i]) { D[i] = d0; heap.push(i, d0); } }
    while (heap.n) {
      const i = heap.pop(), d = heap.top;
      if (d > D[i]) continue;
      for (let e = B.off[i]; e < B.off[i + 1]; e++) {
        const j = B.nb[e];
        const cost = B.s * (0.6 + 2400 / (B.ecap[e] + 600)) + (f[j] > c[j] * 0.2 ? B.s * 0.8 * (1 - P.conv) : 0);
        const nd = d + cost;
        if (nd < D[j]) { D[j] = nd; heap.push(j, nd); }
      }
    }
  }
  function MinHeap() { this.i = new Int32Array(4096); this.d = new Float64Array(4096); this.n = 0; }
  MinHeap.prototype.push = function (i, d) {
    if (this.n >= this.i.length) { const ni = new Int32Array(this.i.length * 2), nd = new Float64Array(this.i.length * 2); ni.set(this.i); nd.set(this.d); this.i = ni; this.d = nd; }
    const I = this.i, Dd = this.d; let n = this.n++; I[n] = i; Dd[n] = d;
    while (n > 0) { const p = (n - 1) >> 1; if (Dd[p] <= Dd[n]) break; let t = I[p]; I[p] = I[n]; I[n] = t; const u = Dd[p]; Dd[p] = Dd[n]; Dd[n] = u; n = p; }
  };
  MinHeap.prototype.pop = function () {      // returns the index; the key is left in this.top
    const I = this.i, Dd = this.d, ti = I[0]; this.top = Dd[0]; this.n--;
    if (this.n > 0) {
      I[0] = I[this.n]; Dd[0] = Dd[this.n]; let n = 0;
      for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < this.n && Dd[l] < Dd[m]) m = l; if (r < this.n && Dd[r] < Dd[m]) m = r; if (m === n) break; let t = I[m]; I[m] = I[n]; I[n] = t; const u = Dd[m]; Dd[m] = Dd[n]; Dd[n] = u; n = m; }
    }
    return ti;
  };

  // Where it starts when the reader has not clicked: by the plan, from the places uprisings in Iran have started.
  function autoIgnition(B, P) {
    const I = B.ign || {}, out = [];
    const add = a => { for (const h of (a || [])) if (out.indexOf(h) < 0 && out.length < 8) out.push(h); };
    if (P.targets === 'garrison' || P.targets === 'centre' || P.targets === 'tv') { add(I.uni); add(I.bazaar); add(I.edge); add(I.centre); }
    else if (P.targets === 'roads') { add(I.edge); add(I.uni); add(I.bazaar); }
    else { add(I.edge); add(I.uni); add(I.bazaar); add(I.centre); }
    if (!out.length) out.push(0);
    return out;
  }

  // ------------------------------------------------------------------ many runs
  const OUTCOMES = ['liberated', 'zones', 'stalemate', 'war', 'crushed'];
  function batch(Bj, S, n, seed0, slim) {
    const res = { n, out: { liberated: 0, zones: 0, stalemate: 0, war: 0, crushed: 0 }, dead: [], arrested: [], peak: [], tEnd: [], runs: [] };
    for (let r = 0; r < n; r++) {
      const seed = (seed0 + r * 7919) >>> 0;
      const o = run(Bj, S, seed);
      res.out[o.outcome]++;
      res.dead.push(o.dead); res.arrested.push(o.arrested); res.peak.push(o.peak); res.tEnd.push(o.tEnd);
      if (!slim) res.runs.push({ seed, o: o.outcome, dead: o.dead, ctl: o.ctl, obj: o.objHeld, def: o.defected, army: o.army, tv: o.tvHeld, net: o.netCutAt, lv: o.lvMax,
        sig: o.sigma, nat: o.nation, prox: o.proxies, blk: o.blockedReinf, fd: o.firstDef, tEnd: o.tEnd, peak: o.peak, tl: o.tl, turn: o.turnout });
    }
    res.p = res.out.liberated / n;
    return res;
  }
  function quant(a, q) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }

  // The questions behind "why": each factor moved to its other side, everything else held, the change in the odds.
  function factors(S) {
    const f = [];
    const tOn = S.turnout;
    f.push({ id: 'turnout-up', S: Object.assign({}, S, { turnout: (tOn == null ? null : tOn * 2), _tx: 2 }) });
    f.push({ id: 'turnout-down', S: Object.assign({}, S, { turnout: (tOn == null ? null : tOn / 2), _tx: 0.5 }) });
    f.push({ id: S.net === 'on' ? 'net-off' : 'net-on', S: Object.assign({}, S, { net: S.net === 'on' ? 'off' : 'on' }) });
    f.push({ id: S.nation === 'alone' ? 'nation-all' : 'nation-alone', S: Object.assign({}, S, { nation: S.nation === 'alone' ? 'all' : 'alone' }) });
    f.push({ id: S.armed ? 'unarmed' : 'armed', S: Object.assign({}, S, S.armed ? { armed: false } : { armed: true, guns: 5000, drones: 50 }) });
    const p = Object.assign({}, PLANS[(S.plan || {}).type] || PLANS.centre, S.plan || {});
    f.push({ id: p.strike > 0.5 ? 'nostrike' : 'strike', S: Object.assign({}, S, { plan: Object.assign({}, p, { strike: p.strike > 0.5 ? 0 : 0.95 }) }) });
    f.push({ id: p.fraternize > 0.6 ? 'nofrat' : 'frat', S: Object.assign({}, S, { plan: Object.assign({}, p, { fraternize: p.fraternize > 0.6 ? 0.1 : 0.95, discipline: p.fraternize > 0.6 ? p.discipline : Math.max(p.discipline, 0.9) }) }) });
    f.push({ id: p.blockade > 0.6 ? 'noblock' : 'block', S: Object.assign({}, S, { plan: Object.assign({}, p, { blockade: p.blockade > 0.6 ? 0 : 0.95 }) }) });
    f.push({ id: p.offline > 0.6 ? 'nooffline' : 'offline', S: Object.assign({}, S, { plan: Object.assign({}, p, { offline: p.offline > 0.6 ? 0 : 0.95 }) }) });
    f.push({ id: S.proxies === 'none' ? 'proxies-many' : 'proxies-none', S: Object.assign({}, S, { proxies: S.proxies === 'none' ? 'many' : 'none' }) });
    f.push({ id: S.loyalty === 'shaky' ? 'loyal-firm' : 'loyal-shaky', S: Object.assign({}, S, { loyalty: S.loyalty === 'shaky' ? 'firm' : 'shaky' }) });
    return f;
  }
  function withTx(Bj, S) {      // "twice as many" when turnout is the model's guess: fix it at twice the guess
    if (S._tx && S.turnout == null) { const nf = NATION[S.nation] || 0.85; return Object.assign({}, S, { turnout: autoTurnout(Bj, S, S.nation && S.nation !== 'auto' ? nf : 0.85) * S._tx }); }
    return S;
  }

  // The best plan for these conditions: every strategy, then dials around the best ones.
  function candidates(S, R) {
    const out = [], types = Object.keys(PLANS).filter(t => t !== 'armed' || S.armed);
    for (const t of types) out.push(Object.assign({ type: t }, PLANS[t]));
    for (let n = 0; n < 40; n++) {
      const t = types[Math.floor(R() * types.length)], p = Object.assign({ type: t }, PLANS[t]);
      for (const d of DIALS) if (R() < 0.45) p[d] = clamp(p[d] + (R() - 0.5) * 0.8, 0, 1);
      if (t !== 'armed') p.discipline = Math.max(p.discipline, 0.6);
      out.push(p);
    }
    return out;
  }

  // ------------------------------------------------------------------ the worker
  const API = { run, batch, prep, resolve, autoTurnout, factors, withTx, candidates, quant, rng, PLANS, DIALS, LEVELS, OUTCOMES, K, K_SRC, BASEW, TARGETW, NATION, NET };
  G.UPR = API;
  if (typeof WorkerGlobalScope !== 'undefined' && G instanceof WorkerGlobalScope) {
    let BOARD = null;
    G.onmessage = function (m) {
      const d = m.data || {};
      try {
        if (d.op === 'board') { BOARD = d.board; prep(BOARD); G.postMessage({ id: d.id, ok: 1 }); return; }
        if (!BOARD) throw new Error('no board');
        if (d.op === 'batch') { G.postMessage({ id: d.id, res: batch(BOARD, withTx(BOARD, d.S), d.n, d.seed, d.slim) }); return; }
        if (d.op === 'run') { const o = run(BOARD, d.S, d.seed, { record: false }); G.postMessage({ id: d.id, res: o }); return; }
      } catch (e) { G.postMessage({ id: d.id, err: String(e && e.stack || e) }); }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof self !== 'undefined' ? self : this);
