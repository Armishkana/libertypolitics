/* THE UPRISING SIMULATOR'S MODEL (libertypolitics.com uprising/, iranuncensored.com <lang>/uprising/; rebuilt 1 November 2026).
   The page, the data and the words: build/uprising.py's docstring. This file is the model only, and it runs in two places:
   on the page (uprising.js plays one run you watch, hour by hour, with every hex recorded so the timeline can be scrubbed)
   and as a Web Worker (the hundreds of runs behind the odds, the reasons, Compare and the best-plan search). No DOM in here.

   WHY IT WAS REBUILT. The fact-check of 1 November 2026 (data/audit-uprising-2026-11-01.md) backtested the first model on
   the real boards: with history's numbers typed in it "liberated" Tehran in January 2026 in 95% of runs, Rasht 98%, Tehran
   2009 92%, all of which were crushed, because crowd size alone made the forces defect. No unit has defected in any Iranian
   uprising since 1979. This model follows the audit's corrections P1-P14 and is held to history by a backtest
   (data/uprising/backtest.json, run by `python uprising.py --check`).

   THE MODEL, in one paragraph. The city is a grid of hexes built from its real streets (OpenStreetMap). Every hour people
   come out where the uprising has reached and where they are angry, and go home where they are afraid or tired; crowds walk
   the roads toward the plan's targets, its gathering points and its drawn routes, or scatter into the alleys. The regime's
   forces are POOLS with their own loyalty (ordinary police half conscripts, special units, Basij security battalions,
   Basij neighbourhood members, IRGC ground units, plainclothes and intelligence, foreign fighters); it commits them one
   rung at a time (police, then Basij battalions with birdshot, then IRGC with live fire, then heavy weapons), and when the
   threat is high, the internet is off and it is night it jumps straight to a massacre, which ends the street phase as it
   did in 2019 and 2026. Forces cross over only when they come to believe the regime is finished (Bel): the places held,
   the city held, the whole country rising for days, strikes that cut its money, an elite split. Crowd size alone does not
   move them. The army can stand aside only after a week of nationwide pressure, a deep strike and a broken core. Strikes
   are four sectors with different speeds. A liberated city must hold against the regional IRGC headquarters' counter-
   offensive. Every constant that is not plain geometry names the finding in research.json it stands on (K_SRC); the ones
   that are judgement, not measurement, say so.

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
    forcesPerPop: 0.0075,     // police, special units, Basij and IRGC a city can put on the street (0.75% of its people; judgement)
    armyPerPop: 0.0012,       // the regular army (Artesh) in the city's barracks (judgement)
    KF: [2, 3.5, 6, 12, 26],  // unarmed people one member of the forces holds back, by the rung of force used (judgement)
    KA: 12,                   // one defected, armed soldier on the people's side
    // deaths per hour per exposed person in a clash, by rung: calibrated on January 2026 (IHRNGO: about 0.08% of the crowd,
    // 1,278 named dead in Tehran province) and November 2019 (Amnesty: 142+ in Tehran province); audit P3
    LAMBDA: [0, 1.5e-7, 1.2e-6, 1.2e-4, 8e-4],
    // arrests per hour per exposed person during clashes: most arrests come AFTER the street phase (HRANA 53,552 nationwide
    // by 15 Feb 2026, from phone data and cameras), so the street rate is low and a wave follows (audit P3)
    MU: [0, 1.2e-4, 1.8e-4, 1.8e-4, 2.4e-4],
    THR: [0.25, 0.6, 1.0, 1.6],   // the threat at which the regime moves up a rung
    fearK: 220,               // a night killing about 0.1% of the crowd cuts the next days' turnout by 60-80% (audit P2)
    fearDecay: 0.995,         // per hour: half-life about six days
  };
  const LEVELS = ['Watching', 'Batons and tear gas', 'Birdshot and some live fire', 'Live fire on crowds', 'Massacre: heavy weapons'];
  // The forces as pools (audit P1, table (b2)). share of the street force, the rung it is committed at, the belief theta at
  // which it starts to cross over, and whether that needs an elite split first. Shares are a labelled estimate.
  const POOLS = [
    { id: 'cons',  share: 0.175, at: 1, theta: 0.45, split: false, core: false },   // FARAJA conscripts (about half the police: conscript-police-half)
    { id: 'pol',   share: 0.175, at: 1, theta: 0.6,  split: false, core: false },   // FARAJA career police
    { id: 'spec',  share: 0.10,  at: 1, theta: 0.8,  split: true,  core: true },    // special units (Yegan-e Vizheh, NOPO)
    { id: 'bmem',  share: 0.20,  at: 1, theta: 0.55, split: false, core: false },   // Basij neighbourhood members (the mosque bases)
    { id: 'bsec',  share: 0.15,  at: 2, theta: 0.8,  split: true,  core: true },    // Basij security battalions (Imam Ali, Fatehin)
    { id: 'irgc',  share: 0.15,  at: 3, theta: 0.8,  split: true,  core: true },    // IRGC provincial corps, ground units
    { id: 'plain', share: 0.05,  at: 4, theta: 9,    split: true,  core: true },    // plainclothes and intelligence: never
  ];
  // 1978: no IRGC, no Basij. Police (conscript-heavy), the gendarmerie and the Imperial Guard, SAVAK; the army in barracks.
  // The point of the 1979 backtest is exactly this difference (iran-no-defection-record).
  const POOLS_1978 = [
    { id: 'cons',  share: 0.45, at: 1, theta: 0.42, split: false, core: false },
    { id: 'pol',   share: 0.25, at: 1, theta: 0.55, split: false, core: false },
    { id: 'spec',  share: 0.20, at: 2, theta: 0.7,  split: true,  core: true },
    { id: 'plain', share: 0.10, at: 3, theta: 0.85, split: true,  core: true },
  ];
  const K_SRC = {      // which finding in research.json each part of the model stands on (How it works, the advisors)
    participation: ['participation-ladder', 'three-five-caveats', 'iran-2026-exception'],
    defection: ['defections-mechanism', 'iran-no-defection-record', 'who-shoots', 'conscript-police-half'],
    massacre: ['iran-massacre-ends-street-phase', 'iran-blackout-massacre-link', 'gohdes-shutdown-violence'],
    backfire: ['backfire'], momentum: ['momentum', 'forty-day-cycle'],
    blackout: ['iran-blackout-massacre-link', 'hassanpour-dispersion', 'tiered-internet', 'starlink-effect'],
    strike: ['general-strike', 'bazaar'], armed: ['cs-success-rates', 'armed-to-civil-war'], city: ['revolutionary-city'],
    night: ['night-tactics'], proxies: ['foreign-reinforcement'], outside: ['strikes-on-repression-2026', 'war-not-collapse'],
    reinforce: ['irgc-regional-hqs'], periphery: ['ethnic-periphery', 'iran-lethality-trend'], arrests: ['arrests-and-afterwards'],
  };

  // The strategies. Each sets the plan's dials; the reader can then move any dial. ids are stable (they ride in the address).
  // abroad: calls from satellite TV and media abroad (a fixed hour reaches homes with no internet; size of effect unknown)
  // film:   filming and sending it out (raises the price of killing if it gets out; people are arrested for it)
  const PLANS = {
    centre:    { conv: 0.85, strike: 0.15, blockade: 0.15, discipline: 0.85, fraternize: 0.45, night: 0.15, medics: 0.4, pace: 0.8, offline: 0.4, voice: 0.4, abroad: 0.5, film: 0.6, targets: 'centre' },
    districts: { conv: 0.25, strike: 0.25, blockade: 0.45, discipline: 0.75, fraternize: 0.4,  night: 0.45, medics: 0.55, pace: 0.45, offline: 0.6, voice: 0.2, abroad: 0.4, film: 0.5, targets: 'police' },
    water:     { conv: 0.15, strike: 0.2,  blockade: 0.2,  discipline: 0.85, fraternize: 0.3,  night: 0.5,  medics: 0.5, pace: 0.6, offline: 0.7, voice: 0.1, abroad: 0.4, film: 0.5, targets: 'spread' },
    strike:    { conv: 0.6,  strike: 0.95, blockade: 0.3,  discipline: 0.9,  fraternize: 0.5,  night: 0.1,  medics: 0.4, pace: 0.2, offline: 0.6, voice: 0.3, abroad: 0.6, film: 0.4, targets: 'centre' },
    soldiers:  { conv: 0.55, strike: 0.45, blockade: 0.1,  discipline: 0.97, fraternize: 0.95, night: 0.05, medics: 0.5, pace: 0.5, offline: 0.5, voice: 0.3, abroad: 0.6, film: 0.5, targets: 'garrison' },
    roads:     { conv: 0.35, strike: 0.35, blockade: 0.95, discipline: 0.75, fraternize: 0.4,  night: 0.35, medics: 0.4, pace: 0.6, offline: 0.6, voice: 0.2, abroad: 0.4, film: 0.4, targets: 'roads' },
    voice:     { conv: 0.7,  strike: 0.25, blockade: 0.2,  discipline: 0.85, fraternize: 0.5,  night: 0.2,  medics: 0.4, pace: 0.75, offline: 0.5, voice: 1.0, abroad: 0.7, film: 0.7, targets: 'tv' },
    night:     { conv: 0.3,  strike: 0.3,  blockade: 0.4,  discipline: 0.7,  fraternize: 0.35, night: 0.95, medics: 0.5, pace: 0.4, offline: 0.6, voice: 0.15, abroad: 0.5, film: 0.5, targets: 'police' },
    armed:     { conv: 0.5,  strike: 0.2,  blockade: 0.6,  discipline: 0.3,  fraternize: 0.15, night: 0.6,  medics: 0.5, pace: 0.7, offline: 0.5, voice: 0.3, abroad: 0.3, film: 0.3, targets: 'police' },
  };
  const DIALS = ['conv', 'strike', 'blockade', 'discipline', 'fraternize', 'night', 'medics', 'pace', 'offline', 'voice', 'abroad', 'film'];
  const SECTORS = ['bazaar', 'truck', 'oil', 'civil'];      // the strike by sector (audit P11, d4)
  // days for each sector's strike to reach its depth, and the day its effect starts to bite (judgement from 1978 and 2025)
  const SEC_RAMP = { bazaar: 1.5, truck: 3, oil: 6, civil: 4 }, SEC_BITE = { bazaar: 0, truck: 1, oil: 10, civil: 3 };
  const BASEW = { gov: 3, tv: 2.5, police: 2, square: 2, prison: 1.2, airport: 1.2, garrison: 2 };
  const TARGETW = {
    centre:   { gov: 3, tv: 1.5, police: 1, square: 4, prison: 0.6, airport: 0.4, garrison: 0.2 },
    police:   { gov: 1.5, tv: 1, police: 4, square: 1.5, prison: 1, airport: 0.5, garrison: 0.4 },
    spread:   { gov: 1, tv: 1, police: 2, square: 1.5, prison: 0.6, airport: 0.3, garrison: 0.2 },
    garrison: { gov: 1.5, tv: 1, police: 1, square: 2, prison: 0.6, airport: 0.6, garrison: 4 },
    roads:    { gov: 1.5, tv: 1, police: 1.5, square: 1.5, prison: 0.6, airport: 2.5, garrison: 0.5 },
    tv:       { gov: 2, tv: 5, police: 1, square: 2, prison: 0.6, airport: 0.5, garrison: 0.3 },
  };
  // Which cities carry more forces and meet lethal force earlier (audit P5, P12; labelled judgement from the register:
  // standing IRGC presence in Kurdish and Baluch cities, Sarallah's extra layer in Tehran, deeper loyalist pools in Qom and Mashhad)
  const GROUP = { sanandaj: 'kurd', saqqez: 'kurd', mahabad: 'kurd', javanrud: 'kurd', kermanshah: 'kurd', ilam: 'kurd', zahedan: 'baluch',
    tehran: 'capital', qom: 'holy', mashhad: 'holy' };
  const FORCE_MUL = { kurd: 1.3, baluch: 1.3, capital: 1.15, holy: 1.2 };
  const RUTH_ADD = { kurd: 0.2, baluch: 0.2, holy: -0.1 };
  const BORDER = { ahvaz: 1, izeh: 1, kermanshah: 1, javanrud: 1, ilam: 1 };      // where the foreign fighters come first (Shalamcheh, Khosravi)

  // ------------------------------------------------------------------ the board, once per city
  function prep(Bj) {
    if (Bj._p) return Bj._p;
    const H = Bj.hex, N = H.x.length, s = Bj.s;
    const B = { N, s, pop: Bj.pop, g: Bj.g, x: H.x, y: H.y, id: Bj.id };
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
      // poorer edges rose hardest in 2019 and 2026; the shrine districts least (cities.json history)
      B.sym[i] = clamp((0.8 + 0.35 * B.periph[i]) - 0.3 * Math.min(1, B.shr[i]), 0.2, 1.4);
    }
    B.mosShare = Float64Array.from(B.mos, v => v / mosT);
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
    B.sites = (Bj.sites || []).map((q, idx) => Object.assign({ idx }, q));
    B.obj = B.sites.filter(q => BASEW[q.k] != null);
    B.objW = B.obj.reduce((a, q) => a + BASEW[q.k], 0) || 1;
    B.Ptot = B.P.reduce((a, v) => a + v, 0) || 1;
    B.entries = []; for (let i = 0; i < N; i++) if (B.ent[i]) B.entries.push(i);
    B.entCap = B.entries.reduce((a, i) => a + B.art[i] + 1, 0) || 1;
    B.garH = []; for (let i = 0; i < N; i++) if (B.gar[i] > 0) B.garH.push(i);
    // the repression sites the board carries (OSM where mapped, typical placement elsewhere): weight the forces' bases
    B.secW = new Float64Array(N);
    for (const q of (Bj.sec || [])) if (q.h >= 0 && q.h < N) B.secW[q.h] += ({ irgc_hq: 3, special_police: 2.5, police_hq: 2, police_station: 1, basij: 1.2, artesh: 0, intelligence: 1, checkpoint: 0.5 }[q.k] || 0.3);
    B.ign = Bj.ign || {};
    B.grp = GROUP[Bj.id] || null;
    Bj._p = B;
    return B;
  }

  // ------------------------------------------------------------------ what "let the model decide" means
  function autoTurnout(Bj, S, nf) {      // percent of the city's people on the streets at the busiest hour
    const g = Bj.g == null ? 0.6 : Bj.g;
    const occ = { none: 1, funeral: 1.25, national: 1.15, shock: 1.3 }[S.occasion || 'none'] || 1;
    return (0.4 + 2.4 * Math.pow(g, 1.2)) * (nf == null ? 0.85 : nf) * occ;
  }
  const NATION = { all: 1, some: 0.7, alone: 0.4 };
  const NATION_BREADTH = { all: 1, some: 0.55, alone: 0.2 };
  const NET = { on: 1, slow: 0.55, off: 0.03 };      // January 2026 under 2%, Feb-May 2026 about 1% of normal (NetBlocks)

  function planOf(S) {
    const P = Object.assign({}, PLANS[S.plan && S.plan.type] || PLANS.centre, (S.plan || {}));
    for (const d of DIALS) P[d] = clamp(+P[d] || 0, 0, 1);
    if (!PLANS[P.type] || (P.type === 'armed' && !S.armed)) P.type = 'centre';
    if (!TARGETW[P.targets]) P.targets = PLANS[P.type].targets;
    const sec = {};
    for (const k of SECTORS) sec[k] = clamp(P.sec && typeof P.sec[k] === 'number' ? P.sec[k] : P.strike, 0, 1);
    P.sec = sec;
    P.gather = Array.isArray(P.gather) ? P.gather.filter(g => g && Number.isInteger(g.h)).slice(0, 8) : [];
    P.routes = Array.isArray(P.routes) ? P.routes.filter(r => Array.isArray(r) && r.length >= 2).slice(0, 6) : [];
    return P;
  }

  function resolve(B, Bj, S, R, fixed) {
    const X = {}, P = planOf(S);
    X.plan = P;
    X.year = S.year == null ? 2026 : +S.year;
    X.era = X.year < 1980 ? '1978' : 'ir';
    X.nation = S.nation && S.nation !== 'auto' ? S.nation : (fixed ? 'all' : pick(R, [['all', 0.5], ['some', 0.35], ['alone', 0.15]]));
    X.nf = NATION[X.nation] || 1;
    X.autoTurnout = autoTurnout(Bj, S, X.nf);
    const sd = S.turnout == null ? 0.45 : 0.12;
    X.turnout = (S.turnout == null ? X.autoTurnout : +S.turnout) * (fixed ? 1 : lognorm(R, sd));
    X.netMode = S.net || 'auto';
    X.powerMode = S.power || 'auto';
    // Starlink: 20,000-50,000 terminals in the whole country (starlink-effect, unverified); default the midpoint, shared by people
    const sl = S.starlink == null ? Math.round(30000 * B.pop / 90e6) : +S.starlink;
    X.starlink = sl;
    X.slFloor = clamp(0.02 + sl / B.pop * 30, 0.02, 0.10);
    X.proxies = X.era === '1978' ? 'none' : (S.proxies && S.proxies !== 'auto' ? S.proxies : (fixed ? 'some' : pick(R, [['some', 0.6], ['none', 0.3], ['many', 0.1]])));
    X.loyalty = S.loyalty || 'auto';
    X.belOff = ({ firm: -0.08, auto: 0, shaky: 0.12 }[X.loyalty] || 0) + (X.era === '1978' ? 0.08 : 0) + (fixed ? 0 : gauss(R) * 0.07);
    // the run's luck at the top: how near the elite is to breaking, and how long the army waits (no case is ever certain)
    X.splitMul = fixed ? 1 : lognorm(R, 0.8); X.armyMul = fixed ? 1 : lognorm(R, 0.8);
    X.strikeMul = fixed ? 1 : clamp(lognorm(R, 0.35), 0.4, 1.4);      // how well the strike committees hold together this time
    X.outside = S.outside && S.outside !== 'auto' ? S.outside : 'pressure';
    if (X.outside === 'strikes') X.outside = 'during';
    // lethality: sharper with each uprising since 2009 (iran-lethality-trend), sharper in the periphery (ethnic-periphery)
    X.ruth = clamp(0.75 + clamp((X.year - 2009) * 0.01, -0.2, 0.2) + (RUTH_ADD[B.grp] || 0) + (fixed ? 0 : gauss(R) * 0.08)
      + (X.proxies === 'some' ? 0.05 : X.proxies === 'many' ? 0.1 : 0) + (X.outside === 'during' ? 0.1 : X.outside === 'after' ? 0.05 : 0), 0.2, 1.3);
    X.armed = !!S.armed;
    X.guns = X.armed ? Math.max(0, +S.guns || 0) : 0;
    X.drones = X.armed ? Math.max(0, +S.drones || 0) : 0;
    X.armA = X.armed ? clamp(Math.log10(1 + X.guns + 10 * X.drones) / 5, 0, 1) : 0;
    X.hour = S.hour == null ? 17 : ((+S.hour % 24) + 24) % 24;
    X.hours = clamp((+S.days || 14) * 24, 72, 56 * 24);
    X.reinfDelay = 6 + (fixed ? 4 : R() * 8);
    X.reinfTotal = { all: 0.12, some: 0.45, alone: 1.0 }[X.nation] * (fixed ? 1 : (0.7 + R() * 0.6));
    X.occasion = S.occasion || 'none';
    X.forceMul = (FORCE_MUL[B.grp] || 1) * (fixed ? 1 : clamp(lognorm(R, 0.12), 0.8, 1.35));      // how many the regime can really put on the street
    // foreign fighters: a NATIONAL pool (800-5,000 reported, unverified: foreign-reinforcement), shared by the cities rising
    const pool = X.proxies === 'some' ? 1500 : X.proxies === 'many' ? 5000 : 0;
    const share = X.nation === 'alone' ? 0.8 : X.nation === 'some' ? B.pop / (B.pop + 15e6) : B.pop / 55e6;
    X.proxN = pool * clamp(share * (BORDER[B.id] ? 1.6 : 1), 0, 0.9);
    X.proxAt = BORDER[B.id] ? 6 + (fixed ? 6 : R() * 12) : 12 + (fixed ? 18 : R() * 36);
    return X;
  }

  const DIURNAL = [0.35, 0.2, 0.1, 0.06, 0.05, 0.06, 0.1, 0.2, 0.3, 0.4, 0.5, 0.55, 0.55, 0.55, 0.6, 0.7, 0.85, 1, 1, 1, 0.95, 0.85, 0.7, 0.5];
  const NIGHTB = [0.3, 0.2, 0.08, 0.02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.05, 0.15, 0.3, 0.35, 0.35, 0.35];
  function isNight(h) { return h >= 20 || h < 6; }

  // ------------------------------------------------------------------ one uprising
  // opt.record: keep every hour of every hex (the run you watch); opt.fixed: no luck in the draws; opt.ign: hexes it starts in.
  function run(Bj, S, seed, opt) {
    opt = opt || {};
    const B = prep(Bj), N = B.N, R = rng(seed), X = resolve(B, Bj, S, R, !!opt.fixed), P = X.plan, HOURS = X.hours;
    const pop = B.pop, F0 = pop * K.forcesPerPop * X.forceMul;
    const OFF = B.off, NB = B.nb, BP = B.P, ALLEY = B.alley, KF = K.KF;
    const c = new Float64Array(N), f = new Float64Array(N), k = new Float64Array(N), b = new Float64Array(N), act = new Float64Array(N),
      al = new Float64Array(N), dead = new Float64Array(N), pw = new Float64Array(N).fill(1), ft = new Float64Array(N), D = new Float64Array(N);
    for (let i = 0; i < N; i++) k[i] = B.gar[i] > 0 ? -1 : -0.6;
    // the pools
    const PL = (X.era === '1978' ? POOLS_1978 : POOLS).map(p => Object.assign({}, p, { n: p.share * F0, n0: p.share * F0 }));
    const poolOf = id => PL.find(p => p.id === id);
    let prox = 0, proxPending = X.proxN;
    let army = B.garH.length ? pop * K.armyPerPop : 0, armyState = 0;      // 0 barracks, 1 deployed, 2 neutral, 3 joined
    let reinfLeft = X.reinfTotal * F0;
    const polT = B.pol.reduce((a, v) => a + v, 0) || 1, secT = B.secW.reduce((a, v) => a + v, 0);
    const guardW = new Float64Array(N);
    for (const q of B.obj) guardW[q.h] += BASEW[q.k];
    const gwT = guardW.reduce((a, v) => a + v, 0) || 1;
    const baseW = new Float64Array(N);      // where the forces sit when nothing happens: their bases, the mosques, the stations
    for (let i = 0; i < N; i++) baseW[i] = 0.3 * guardW[i] / gwT + 0.3 * B.mosShare[i] + 0.25 * (B.pol[i] / polT) + (secT > 0 ? 0.15 * B.secW[i] / secT : 0.15 / N);
    for (let i = 0; i < N; i++) f[i] = F0 * 0.65 * baseW[i];
    // outside strikes on the apparatus (audit P8): a one-off cut at the top police and Basij hexes, a small nudge, no collapse
    let belNudge = X.outside === 'pressure' ? 0.02 : 0;
    if (X.outside === 'during' || X.outside === 'after') {
      const order = Array.from({ length: N }, (_, i) => i).sort((a, b2) => (B.pol[b2] + B.mos[b2] * 0.5 + B.secW[b2]) - (B.pol[a] + B.mos[a] * 0.5 + B.secW[a])).slice(0, Math.max(3, Math.round(N * 0.07)));
      let cut = 0; for (const i of order) { const d = f[i] * (0.15 + R() * 0.15); f[i] -= d; cut += d; }
      for (const p of PL) p.n = Math.max(0, p.n - cut * p.share);
      belNudge += 0.03;
    }
    // ignition, gathering points, routes
    let ign = opt.ign || (S.plan && S.plan.ign) || null;
    if (!ign || !ign.length) ign = autoIgnition(B, P);
    ign = ign.filter(i => i >= 0 && i < N);
    const igT = ign.map((h, n) => n === 0 ? 0 : Math.round(n * (1 - P.pace) * 3));
    const gather = P.gather.filter(g => g.h >= 0 && g.h < N).map(g => ({ h: g.h, t: clamp(+g.t || 0, 0, HOURS), done: 0 }));
    const routeNext = new Int32Array(N).fill(-1);      // a drawn route: the next hex along it
    const routeEnd = [];
    for (const r of P.routes) {
      const hs = r.filter(h => h >= 0 && h < N);
      for (let n = 0; n + 1 < hs.length; n++) if (routeNext[hs[n]] < 0) routeNext[hs[n]] = hs[n + 1];
      if (hs.length) routeEnd.push(hs[hs.length - 1]);
    }
    // globals
    let Lv = 0, fear = 0, anger = X.occasion === 'funeral' ? 0.25 : 0.05, mom = 1, fatigue = 1, cm = X.netMode === 'auto' ? NET.slow : NET[X.netMode] || 1;
    let netCut = X.netMode === 'off', netCutAt = X.netMode === 'off' ? 0 : -1, powerCut = X.powerMode === 'off';
    let bel = 0.1 + X.belOff + belNudge, split = false, splitAt = -1, daysMob = 0, firedOnPeaceful = 0, clearance = 0;
    const sig = { bazaar: 0, truck: 0, oil: 0, civil: 0 }, sigOn = { bazaar: 0, truck: 0, oil: 0, civil: 0 };
    let deadT = 0, arrT = 0, defT = 0, peak = 0, peakAt = 0, lvMax = 0, held = new Uint8Array(B.obj.length), heldAt = new Int32Array(B.obj.length).fill(-1);
    let libFor = 0, libNeed = X.nation === 'all' ? 24 : 72, counterAt = -1, counterDone = false, crushFor = 0, outcome = null, tEnd = HOURS, tvHeld = false;
    let firstClash = -1, armedClash = 0, firstDef = -1, massacreAt = -1, massDeadDay = 0, fortyAt = -1, mournAt = -1, waveLeft = 0, waveOn = false, hospRaid = 0, armyFor = 0;
    let stepsSinceDij = 99, objHeldW = 0, ctl = 0, warHex = 0, dayGain = 0, dayPeak = 0, lastCtl = 0, lastSig = 0, chk = 0, ctlPrev = 0, ctl24 = 0, ctlLow = 0, sFat = 1, lastBel = 0, noGain = 0, lastDayPeak = 0, occ = 0;
    const day24 = new Float64Array(24);
    const ev = opt.record ? [] : null, fl = { s: {}, re: 0, bl: 0, abroad: 0, chk: 0, raid: 0 };
    const rec = opt.record ? { c: [], f: [], k: [], al: [], dead: [], pw: [], g: [] } : null;
    const tl = [];
    function E(t, type, h, extra) { if (ev) ev.push(Object.assign({ t, type, h: h == null ? -1 : h }, extra || {})); }
    const TW = TARGETW[P.targets] || TARGETW.centre;
    const armedTouch = X.armA;
    const gunsPer = X.guns, dronesPer = X.drones;
    const nb = NATION_BREADTH[X.nation] || 1;
    const turnoutHold = X.outside === 'during' ? 0.5 : 1;      // March 2026: people stayed home while the bombs fell
    // smaller cities are deadlier per head: conscript police and non-local commanders (conscript-police-half; Rasht 2026: 392
    // dead in a city of 700,000 against 1,278 in Tehran province)
    const smallM = clamp(Math.pow(3e6 / pop, 0.6), 1, 3);
    // small, scattered, after-dark actions cost each person less, so they tire less (night-tactics; 2022 went on for months)
    const lowCost = (0.5 + 0.5 * P.conv) * (1 - 0.4 * P.night);
    const blk0 = Math.max(0, P.blockade - 0.25) * 1.33;      // a plan that barely barricades builds none
    // a price shock spreads fastest and burns out soonest: wide and shallow (economic-triggers-spread; 2017, 2019)
    const shockFat = X.occasion === 'shock' ? 1.8 : 1;

    function activeF() { let s = 0; for (const p of PL) if (Lv >= p.at || (p.at === 1 && Lv >= 0)) s += p.n; return s + (Lv >= 2 ? prox : 0) + (armyState === 1 && Lv >= 3 ? army : 0); }
    function coreF() { let s = 0; for (const p of PL) if (p.core && Lv >= p.at) s += p.n; return s + (Lv >= 2 ? prox : 0); }
    function coreAll() { let s = 0, s0 = 0; for (const p of PL) if (p.core) { s += p.n; s0 += p.n0; } return s0 > 0 ? s / s0 : 1; }

    function tick(t) {
      const hr = (X.hour + t) % 24, night = isNight(hr), day = Math.floor(t / 24);
      // --- the internet and the power
      if (X.netMode === 'auto') {
        const threatNet = (peak / pop) * 100;
        if (!netCut && (threatNet > 0.6 * (1.1 - X.ruth * 0.3) || Lv >= 3) && R() < 0.12 + 0.2 * X.ruth) { netCut = true; netCutAt = t; E(t, 'netcut'); }
        cm = netCut ? NET.off : NET.slow;
      } else cm = NET[X.netMode] == null ? 1 : NET[X.netMode];
      if (X.year < 1995) cm = 0.5;      // no internet in 1978: word of mouth, cassettes, the mosques
      const jam = netCut || X.netMode === 'off';
      cm = Math.max(cm, jam ? X.slFloor * 0.5 : X.slFloor);      // Starlink keeps a thin floor; jamming halves it (Miaan Group)
      let pwrCity = 1;
      if (X.powerMode === 'off') pwrCity = 0;
      else if (X.powerMode === 'cuts' || (X.powerMode === 'auto' && Lv >= 3 && night)) { pwrCity = 0.7; if (!powerCut && X.powerMode === 'auto') { powerCut = true; E(t, 'powercut'); } }
      for (let i = 0; i < N; i++) pw[i] = pwrCity >= 1 ? 1 : pwrCity <= 0 ? 0 : (c[i] > 0.002 * BP[i] + 50 && night ? 0 : 1);
      const cmEff = cm * (pwrCity <= 0 ? 0.6 : pwrCity < 1 ? 0.85 : 1);
      // agreed times and places survive a blackout (hassanpour-dispersion); a call from abroad on satellite TV sets an hour
      // for homes with no internet (effect size not measured in any source: kept modest)
      const coord = Math.max(0.3 + 0.7 * cmEff, 0.32 + 0.45 * P.offline + (jam ? 0.08 * P.abroad : 0));
      if (jam && P.abroad > 0.5 && !fl.abroad) { fl.abroad = 1; E(t, 'abroad'); }

      // --- the strike, sector by sector (audit P11)
      // a strike lives on organisation more than on crowds: agreed plans, a city that has risen before, the country with it;
      // fear (arrests of strike leaders) and lost wages wear it down; the regime breaks it harder at the top rungs
      const org = 0.35 * P.offline + 0.25 * B_g(Bj) + 0.25 * nb + 0.15 * P.abroad;
      const need = clamp(0.3 + 0.7 * org, 0.2, 1) * (1 - 0.35 * Math.min(1, fear)) * sFat * clamp(0.5 + X.turnout / 6, 0.5, 1) * X.strikeMul;
      for (const s2 of SECTORS) {
        const tgt = P.sec[s2] * need * (s2 === 'oil' ? 0.75 : 1);      // oil: IRGC-run sites and contract workers cap it (register, Oct 2022)
        sig[s2] += (tgt - sig[s2]) * (1 / (SEC_RAMP[s2] * 24)) * 2.2;
        if (Lv >= 3) sig[s2] *= 1 - 0.0015 * (Lv - 2);
        if (sig[s2] > 0.3 && !fl.s[s2]) { fl.s[s2] = 1; sigOn[s2] = t; E(t, 'strike', -1, { sec: s2 }); }
      }
      const bite = s2 => sig[s2] * (sigOn[s2] && t - sigOn[s2] >= SEC_BITE[s2] * 24 ? 1 : (s2 === 'oil' ? 0.15 : 0.5));
      const sigma = (sig.bazaar + sig.truck + sig.oil + sig.civil) / 4;

      // --- how many are on the streets this hour
      const ramp = Math.min(1, (t + 1) / (4 + (1 - P.pace) * 56));
      const strikeHold = (P.strike > 0.7 && t < 48 && P.pace < 0.4) ? 0.35 : 1;
      const dn = DIURNAL[hr] + P.night * NIGHTB[hr];
      const discP = 0.85 + 0.3 * P.discipline * (1 - armedTouch);
      const armP = 1 - 0.4 * armedTouch;
      // when people sense the regime is going (defections, a split, the army aside), they come back out
      const mood = clamp((1 + 0.7 * anger - 0.95 * fear + 1.2 * Math.max(0, bel - 0.4)) * Math.pow(clamp(mom, 0.2, 2.2), 0.7), 0.004, 2.5);
      const Nt = pop * X.turnout / 100 * ramp * dn * mood * discP * armP * strikeHold * (1 + 0.15 * sig.bazaar) * fatigue * (t < 168 ? turnoutHold : 1) * (1 - 0.85 * occ);
      for (let n = 0; n < ign.length; n++) if (t >= igT[n]) act[ign[n]] = 1;
      for (const g of gather) if (t >= g.t) act[g.h] = Math.max(act[g.h], 0.6);
      const beta = 0.11 * (0.4 + 0.6 * cmEff) * clamp(mood, 0.2, 1.6) * (night && P.night < 0.5 ? 0.5 : 1);
      const jump = 0.004 * cmEff * mood;
      for (let i = 0; i < N; i++) {
        let s = 0, d = 0;
        for (let e = OFF[i]; e < OFF[i + 1]; e++) { const j = NB[e]; if (act[j] > act[i]) s += act[j] - act[i]; d++; }
        ft[i] = act[i] + (d ? beta * s / d : 0) + jump * (1 - act[i]) * R() * 2;
      }
      for (let i = 0; i < N; i++) act[i] = clamp(ft[i], 0, 1);
      let C = 0; for (let i = 0; i < N; i++) C += c[i];
      const diff = Nt - C;
      if (diff > 0) {
        let wT = 0;
        for (let i = 0; i < N; i++) { ft[i] = BP[i] * B.sym[i] * act[i] * (k[i] < -0.85 ? 0.25 : 1) * (pw[i] ? 1 : 0.8); wT += ft[i]; }
        if (wT > 0) for (let i = 0; i < N; i++) c[i] += 0.5 * diff * ft[i] / wT;
      } else if (C > 0) {
        for (let i = 0; i < N; i++) c[i] -= Math.min(c[i], -0.4 * diff * c[i] / C);
      }
      // --- where the crowds go
      if (stepsSinceDij >= 4) { dijkstra(B, D, held, TW, f, c, P, gather, routeEnd, t); stepsSinceDij = 0; } else stepsSinceDij++;
      const conv = P.conv * coord;
      for (let i = 0; i < N; i++) ft[i] = 0;
      for (let i = 0; i < N; i++) {
        if (c[i] < 1) continue;
        let best = -1, bd = D[i];
        if (routeNext[i] >= 0) { for (let e = OFF[i]; e < OFF[i + 1]; e++) if (NB[e] === routeNext[i]) { best = e; break; } }
        if (best < 0) for (let e = OFF[i]; e < OFF[i + 1]; e++) { const j = NB[e]; if (D[j] < bd) { bd = D[j]; best = e; } }
        let out = 0;
        if (best >= 0 && conv > 0) {
          const j = NB[best];
          const mv = Math.min(c[i] * conv * 0.3 * (routeNext[i] >= 0 ? 1.3 : 1), B.ecap[best] * (1 - 0.5 * Math.max(0, -k[j]) * (f[j] > c[j] ? 1 : 0)));
          ft[j] += mv; out += mv;
        }
        const rho = (c[i] + 1) / (f[i] * KF[Lv] + 1);
        if (rho < 0.8 && f[i] > 0) {
          let bj = -1, bs = 1e18;
          for (let e = OFF[i]; e < OFF[i + 1]; e++) { const j = NB[e]; const sc = (f[j] + 1) / (c[j] + 50) / (0.5 + ALLEY[j]); if (sc < bs) { bs = sc; bj = j; } }
          if (bj >= 0) { const mv = (c[i] - out) * 0.3 * (0.8 - rho) * (0.5 + ALLEY[i]); ft[bj] += mv; out += mv; }
        }
        ft[i] -= out;
      }
      for (let i = 0; i < N; i++) { c[i] = Math.max(0, c[i] + ft[i]); if (c[i] > B.cap[i]) { const sp = c[i] - B.cap[i]; c[i] = B.cap[i]; spill(B, c, i, sp); } }
      for (const g of gather) if (!g.done && t >= g.t && c[g.h] > 2000) { g.done = 1; E(t, 'gather', g.h); }

      // --- the regime moves its forces (only the pools committed at this rung are on the street)
      let F = activeF();
      let threatSum = 0;
      for (let i = 0; i < N; i++) { ft[i] = c[i] * (1 + 2 * guardW[i] / 3) * (k[i] > 0 ? 1.4 : 1); threatSum += ft[i]; }
      const mob = 0.15 * (1 - 0.3 * bite('truck')) * (1 - 0.15 * bite('civil'));
      let fs = 0;
      for (let i = 0; i < N; i++) {
        const want = F * (0.25 * guardW[i] / gwT + 0.15 * baseW[i] + 0.6 * (threatSum > 0 ? ft[i] / threatSum : baseW[i]));
        let barr = b[i]; for (let e = OFF[i]; e < OFF[i + 1]; e++) barr = Math.max(barr, b[NB[e]] * 0.5);
        f[i] += (want - f[i]) * mob * (want > f[i] ? (1 - 0.75 * barr) * (k[i] > 0.5 ? 0.6 : 1) : 1);
        if (f[i] < 0) f[i] = 0; fs += f[i];
      }
      if (fs > 0) { const sc = F / fs; for (let i = 0; i < N; i++) f[i] *= sc; }

      // --- the clashes, hex by hex
      let deadH = 0, arrH = 0, lossF = 0, contested = 0, dronesLeft = dronesPer, peacefulBig = 0;
      const coreShareNow = F > 0 ? coreF() / F : 0;
      const droneSup = X.armed ? clamp(dronesPer / (F0 * 0.02 + 1), 0, 1) * 0.25 : 0;
      const raidMul = 1 + 0.3 * hospRaid * (1 - P.medics);      // hospital raids; medics only offset that penalty (audit P14)
      for (let i = 0; i < N; i++) {
        const ci = c[i], fi = f[i], ai = al[i];
        if (ci < 5 && fi < 5) { k[i] += (k[i] > 0 && b[i] > 0.5 ? 0.002 : -0.004); continue; }
        if (ci < Math.max(5, BP[i] * 0.0005) && ai < 1 && fi > ci * 0.05) { k[i] = Math.max(-1, k[i] - 0.03); if (b[i] > 0) b[i] = Math.max(0, b[i] - 0.05); continue; }
        // a district is the people's only while a real crowd or barricades hold it; a few dozen in a quiet street is not a hold
        if (ci < BP[i] * 0.01 && b[i] < 0.5 && ai < 1) { if (k[i] > 0) k[i] = Math.max(-0.2, k[i] - 0.15); if (b[i] > 0) b[i] = Math.max(0, b[i] - 0.01); continue; }
        if (fi < 3) {
          k[i] = Math.min(1, k[i] + 0.06 * Math.min(1, ci / (BP[i] * 0.004 + 30)));
          if (k[i] > 0.2) b[i] = Math.min(1, b[i] + 0.03 * (blk0 + (B.ent[i] ? blk0 : 0)) * (1.2 - 0.6 * P.discipline));      // barricades are a choice
          continue;
        }
        contested++;
        if (firstClash < 0) { firstClash = t; E(t, 'clash', i); }
        const gunsI = gunsPer * (C > 0 ? ci / C : 0);
        const gunQ = ci > 0 ? 6 * gunsI / ci : 0;
        const Q = (1 + 0.6 * b[i]) * (0.7 + 0.3 * clamp(mom, 0, 1.6)) * (1 + Math.min(gunQ, 6));
        const Ef = KF[Lv] * (1 - 0.45 * ALLEY[i]) * (1 - droneSup) * (1 + 0.15 * coreShareNow);
        const rho = (ci * Q + ai * K.KA) / (fi * Ef + 1);
        const expo = clamp(1 / rho, 0, 1.5);
        const dens = clamp(ci / B.cap[i], 0, 1);
        // night: small groups and rooftops are safer; big marches after dark under blackout are the deadliest (audit P13)
        const nightM = night ? (ci < BP[i] * 0.01 && P.night > 0.5 ? 0.5 : (jam ? 1.5 : 1.1)) : 1;
        const periM = (1 + 0.25 * B.periph[i] * (X.ruth > 0.8 ? 1 : 0.5)) * smallM;
        const dd = ci * K.LAMBDA[Lv] * expo * (0.6 + 0.8 * B.open[i]) * (1 + dens) * raidMul * (X.armed ? 1.4 : 1) * (pw[i] ? 1 : 1.25) * nightM * periM;
        const aa = ci * K.MU[Lv] * expo * (night && !pw[i] ? 1.5 : 1) * (1 + 0.3 * P.film);
        c[i] = Math.max(0, ci - dd - aa); dead[i] += dd; deadH += dd; arrH += aa;
        if (Lv >= 3 && ci > 20000 && P.discipline > 0.75 && !X.armed) peacefulBig++;
        if (rho > 1) {
          k[i] = Math.min(1, k[i] + 0.12 * Math.min(rho - 1, 2));
          const w = fi * 0.05 * Math.min(rho - 1, 3);
          f[i] -= w; spillF(B, f, k, i, w);
        } else {
          k[i] = Math.max(-1, k[i] - 0.15 * (1 - rho));
          const go = c[i] * 0.25 * (1 - rho) * (1 + Lv / 4); c[i] -= go;
          if (Lv >= 2) clearance += 0.002 * (1 - rho) * Math.min(1, ci / 5000);
        }
        if (X.armed && gunsI + dronesLeft > 0) {
          const dI = dronesPer > 0 ? Math.min(dronesLeft, dronesPer * (ci / (C + 1))) : 0; dronesLeft -= dI;
          const lf = Math.min(f[i] * 0.04, gunsI * 0.003 + dI * 0.05);
          f[i] -= lf; lossF += lf; armedClash++;
          if (Lv < 2 && lf > 0.5) { Lv = 2; E(t, 'lv', i, { lv: 2, why: 'armed' }); }
        }
        if (k[i] > 0.4 && blk0 > 0) b[i] = Math.min(1, b[i] + 0.02 * blk0);
      }
      for (let i = 0; i < N; i++) if (f[i] < 0) f[i] = 0;
      if (lossF > 0) { const Fa = activeF() || 1; for (const p of PL) if (Lv >= p.at) p.n = Math.max(0, p.n - lossF * p.n / Fa); prox = Math.max(0, prox - lossF * prox / Fa); }
      // the arrest wave after the street phase: identified from phone data and cameras (arrests-and-afterwards)
      if (!waveOn && peak > pop * 0.003 && t > peakAt + 24 && C < peak * 0.15 && outcome == null) { waveOn = true; waveLeft = peak * 0.011 * (1 + 0.3 * P.film); E(t, 'wave'); }
      if (waveOn && waveLeft > 0) { const a2 = Math.min(waveLeft, peak * 0.011 / 240); waveLeft -= a2; arrH += a2; fear = Math.min(1.2, fear + 30 * a2 / Math.max(1, peak)); }
      deadT += deadH; arrT += arrH;
      C = 0; for (let i = 0; i < N; i++) C += c[i];
      if (C > peak) { peak = C; peakAt = t; }
      if (C > dayPeak) dayPeak = C;

      // --- the regime's choice of force
      F = activeF();
      ctl = 0; for (let i = 0; i < N; i++) if (k[i] > 0) ctl += BP[i] * k[i];
      ctl /= B.Ptot;
      // disorder (burning banks and petrol stations, blocked highways: 2019) raises the threat the regime feels as much as numbers
      const threat = (F > 0 ? C / (F * KF[Math.max(1, Lv)]) : 3) + 3 * objHeldW + 1.5 * ctl + 0.8 * (1 - P.discipline) * Math.min(1, C / (pop * 0.002));
      // a divided leadership orders less killing (a split); the Shah's forces had no massacre doctrine at the top rung
      const will = X.ruth + (cm <= NET.off + 0.06 ? 0.15 : 0) + 0.25 * armedTouch - (split ? 0.2 : 0) - (armyState >= 2 ? 0.15 : 0);
      const lvCap = X.era === '1978' || armyState >= 2 ? 3 : 4;
      // the massacre comes at night, in the dark, at the peak (iran-blackout-massacre-link): straight to the top rung
      if (Lv < 4 && Lv >= 1 && X.era !== '1978' && jam && night && C > pop * 0.025 && threat > K.THR[3] * (1.3 - will) && R() < 0.35 * will) {
        Lv = 4; lvMax = 4; massacreAt = t; E(t, 'massacre', -1, { lv: 4 });
      } else if (Lv < lvCap && C > 50 && threat > K.THR[Lv] * (1.3 - will) && R() < 0.1 && (Lv < 2 || will >= 0.85 || objHeldW > 0.5) && (Lv < 3 || will >= 1 || objHeldW > 0.6)) { Lv++; lvMax = Math.max(lvMax, Lv); E(t, 'lv', -1, { lv: Lv }); }
      else if (Lv > 1 && threat < 0.25 * K.THR[Lv - 1] && R() < 0.05) { Lv--; E(t, 'lv', -1, { lv: Lv, down: 1 }); }
      if (Lv === 0 && C > 50) { Lv = 1; E(t, 'lv', -1, { lv: 1 }); }
      if (Lv >= 2 && !fl.chk) { fl.chk = 1; E(t, 'checkpoints'); }
      chk = Lv >= 2 || netCut ? 1 : 0;
      if (Lv >= 3 && !fl.raid && X.era !== '1978') { fl.raid = 1; hospRaid = 1; E(t, 'raid'); }

      // --- fear, anger, momentum, fatigue
      const vis = 0.4 + 0.6 * Math.max(cmEff, P.film * 0.3);
      if (Nt > 1) {
        const den = Math.max(Nt, C, pop * 0.003);      // the people who hear of it, not only the crowd that was shot at
        fear = clamp(fear * K.fearDecay + K.fearK * deadH / den * (1.3 - 0.6 * vis) + 0.6 * arrH / den, 0, 1.2);
        const org = 0.2 + 0.35 * P.offline + 0.25 * sigma + 0.2 * P.medics;      // backfire needs organisation (backfire)
        anger = clamp(anger * 0.995 + 18 * deadH / den * (0.3 + 0.7 * P.discipline * (1 - armedTouch)) * vis * vis * org, 0, 1.5);
      } else fear *= K.fearDecay;
      massDeadDay += deadH;
      // the places that matter
      objHeldW = 0;
      for (let n = 0; n < B.obj.length; n++) {
        const q = B.obj[n], kk = k[q.h];
        const gar = q.k === 'garrison';
        // a square is taken by standing in it; a guarded building only when its guards leave or waver, or a crowd storms it
        const bld = !gar && q.k !== 'square';
        const take = gar ? (kk > 0.75 && (armyState >= 2 || f[q.h] < 20)) : kk > 0.55 && (!bld || f[q.h] < F0 * 0.004 || bel > 0.5 || P.discipline < 0.6 || X.armed);
        if (!held[n] && take) { held[n] = 1; heldAt[n] = t; dayGain++; mom = Math.min(2.2, mom + 0.06 * BASEW[q.k] * vis); E(t, 'take', q.h, { site: q.idx }); if (q.k === 'tv') { tvHeld = true; mom += 0.3 * P.voice; } }
        else if (held[n] && kk < 0.15) { held[n] = 0; mom = Math.max(0.2, mom - 0.05 * BASEW[q.k]); E(t, 'lose', q.h, { site: q.idx }); if (q.k === 'tv') tvHeld = false; }
        if (held[n]) objHeldW += BASEW[q.k];
      }
      objHeldW /= B.objW;
      // momentum rises only while the uprising is GAINING ground, and drifts back otherwise (momentum)
      mom = clamp(mom + (ctl > ctlPrev + 0.002 ? 0.004 : (1 - mom) * 0.003) - (contested > 0 && C < Nt * 0.5 ? 0.01 : 0) - (Lv >= 3 ? 0.004 : 0) + 0.0015 * sigma, 0.2, 2.2);
      ctlPrev = ctl; ctl24 = ctl24 * (23 / 24) + ctl / 24; ctlLow = hr === (X.hour + 1) % 24 ? ctl : Math.min(ctlLow, ctl);
      if (tvHeld) cm = Math.max(cm, 0.5);
      // the day's end: fatigue without gains (momentum), the 40th day after a massacre (forty-day-cycle)
      if (hr === (X.hour + 23) % 24) {
        if ((dayPeak > pop * 0.004 || sigma > 0.4) && X.nation !== 'alone') daysMob++;
        sFat = sigma > 0.2 ? Math.max(0.5, sFat * (dayGain > 0 ? 1 : 0.985)) : Math.min(1, sFat + 0.02);
        const gained = dayGain > 0 || sigma > lastSig + 0.03 || bel > lastBel + 0.03;
        noGain = gained ? 0 : noGain + 1;      // days without a gain wear harder the longer they run (momentum)
        fatigue = gained ? Math.min(1.1, fatigue * 1.04 + 0.25 * Math.max(0, bel - 0.45)) : Math.max(0.04, fatigue * (1 - (0.06 + 0.02 * Math.min(noGain, 6) + 0.03 * (Lv >= 3 ? 1 : 0)) * lowCost * shockFat));
        if (massDeadDay > Math.max(10, pop * 5e-6) && mournAt < 0) mournAt = t;
        // after a day of mass killing the regime occupies the city: checkpoints "in every block" (Tehran, 14 Jan 2026), curfews
        if (Lv >= 3 && massDeadDay > Math.max(10, pop * 2e-6) && X.era !== '1978') { if (occ < 0.5) E(t, 'occupy'); occ = 1; }
        if (mournAt >= 0 && fortyAt < 0) fortyAt = mournAt + 40 * 24;
        lastDayPeak = dayPeak; dayGain = 0; dayPeak = 0; lastCtl = ctl; lastSig = sigma; lastBel = bel; massDeadDay = 0;
      }
      if (fortyAt >= 0 && t === fortyAt) {
        const scale = clamp(1 - deadT / (pop * 0.002), 0.2, 1);
        fear = Math.max(0, fear - 0.35 * scale); anger = Math.min(1.5, anger + 0.25 * scale * (0.5 + P.offline)); fatigue = Math.max(fatigue, 0.55 * scale + 0.2); E(t, 'forty');
      }

      // --- belief that the regime is finished, and defection (audit P1). Crowd size alone does not enter.
      clearance *= 0.98; occ *= 0.993;
      if (Lv >= 3 && peacefulBig > 0) firedOnPeaceful = Math.min(1, firedOnPeaceful + 0.01);
      const sustained = Math.min(1, daysMob / 10);
      const belT = 0.08 + X.belOff + belNudge + 0.24 * objHeldW + 0.18 * ctl + 0.15 * nb * sustained + 0.1 * nb * Math.min(1, daysMob / 28)
        + 0.32 * bite('oil') + 0.14 * bite('civil') + 0.08 * bite('truck') + 0.04 * bite('bazaar')
        + (split ? 0.22 : 0) + (tvHeld ? 0.05 * (0.5 + P.voice) : 0) + 0.05 * firedOnPeaceful + (armyState >= 2 ? 0.15 : 0)
        - 0.25 * Math.min(1, clearance) - 0.12 * Math.min(1, fear) + (X.armed ? -0.06 * armedTouch : 0);
      bel += (clamp(belT, 0, 1) - bel) * 0.02;
      // an elite split: belief held high for two days while the strikes bite (hazard is judgement; never seen since 1979)
      if (!split && bel > 0.5 && sigma > 0.3 && t > 48 && R() < 0.004 * (bel - 0.45) * 20 * X.splitMul * (X.loyalty === 'shaky' ? 2 : X.loyalty === 'firm' ? 0.4 : 1)) { split = true; splitAt = t; E(t, 'split'); }
      let defH = 0;
      // after a split and once the army stands aside, the core's own commanders waver (judgement: 1979, Bucharest 1989)
      const thMul = (split ? 0.85 : 1) * (armyState >= 2 ? 0.8 : 1);
      for (const p of PL) {
        if (p.split && !split) continue;
        const r = 0.01 * Math.max(0, bel - (p.theta < 5 ? p.theta * thMul : p.theta)) * (0.3 + P.fraternize) * (0.3 + P.discipline * (1 - armedTouch));
        if (r <= 0) continue;
        const d = p.n * r; p.n -= d; defH += d;
      }
      if (defH > 0) {
        defT += defH; dayGain += defH > F0 * 0.002 ? 1 : 0;
        if (firstDef < 0 && defT > Math.max(20, F0 * 0.003)) { firstDef = t; E(t, 'defect', -1, { n: Math.round(defT) }); }
        let cw = 0; for (let i = 0; i < N; i++) cw += c[i] * (k[i] > 0 ? 1 : 0.3);
        for (let i = 0; i < N; i++) al[i] += defH * 0.4 * (cw > 0 ? c[i] * (k[i] > 0 ? 1 : 0.3) / cw : 1 / N);
      }
      // the army (audit P9): neutral only after a week of nationwide pressure, a broken or split core and a deep strike
      if (army > 0) {
        if (armyState === 0 && ctl > 0.35 && bel < 0.4 && R() < 0.01) { armyState = 1; E(t, 'army', -1, { s: 1 }); }
        else if ((armyState === 0 || armyState === 1) && daysMob >= 7 && (split || coreAll() < 0.7) && sigma > 0.4 && R() < 0.02 * X.armyMul) { armyState = 2; E(t, 'army', -1, { s: 2 }); for (const h of B.garH) k[h] = Math.max(k[h], 0); }
        else if (armyState === 2 && split && bel > 0.8 && R() < 0.001) { armyState = 3; E(t, 'army', -1, { s: 3 }); for (const h of B.garH) { al[h] += army * 0.4 / B.garH.length; k[h] = Math.max(k[h], 0.6); } defT += army * 0.4; }
      }
      // reinforcements on the highways from the regional headquarters, unless the roads are held or the trucks stopped
      const blkNow = () => { let blk = 0; for (const i of B.entries) blk += (B.art[i] + 1) * clamp(Math.max(0, k[i]) * 0.7 + b[i] * 0.6, 0, 1); return clamp(blk / B.entCap, 0, 1); };
      if (t >= X.reinfDelay && reinfLeft > 0) {
        const blk = blkNow();
        const arr = Math.min(reinfLeft, X.reinfTotal * F0 / 36) * (1 - 0.85 * blk) * (1 - 0.4 * bite('truck'));
        reinfLeft -= X.reinfTotal * F0 / 36;
        for (const p of PL) p.n += arr * p.share / (PL.reduce((a, q) => a + q.share, 0));
        if (arr > 1 && !fl.re) { fl.re = 1; E(t, 'reinf', -1, { n: Math.round(arr * 36) }); }
        if (blk > 0.5 && !fl.bl) { fl.bl = 1; E(t, 'blocked'); }
      }
      if (proxPending > 0 && t >= X.proxAt) { const blk = blkNow(); prox += proxPending * (1 - 0.6 * blk); E(t, 'proxies', -1, { n: Math.round(proxPending) }); proxPending = 0; }
      for (let i = 0; i < N; i++) if (al[i] > 0 && f[i] > 0) al[i] *= 0.995;
      if (contested > N * 0.25 && X.armed && t > 72) warHex++;

      // --- record
      F = activeF();
      if (rec) {
        rec.c.push(Float32Array.from(c)); rec.f.push(Float32Array.from(f)); rec.k.push(Float32Array.from(k)); rec.al.push(Float32Array.from(al));
        rec.dead.push(Float32Array.from(dead)); rec.pw.push(Uint8Array.from(pw));
        rec.g.push({ t, hr, C, F, Lv, bel, cm, sigma, sig: Object.assign({}, sig), ctl, obj: objHeldW, dead: deadT, arr: arrT, def: defT, al: al.reduce((a, v) => a + v, 0), mood, fatigue, fear, army: armyState,
          net: netCut || X.netMode === 'off', power: pwrCity < 1, Nt, held: Array.from(held), split, chk, counter: counterAt >= 0 && !counterDone ? 1 : 0, pools: PL.map(p => Math.round(p.n)), prox: Math.round(prox) });
      }
      if (t % 6 === 5) tl.push([Math.round(ctl * 1000) / 1000, Math.round(C), Math.round(F), Lv, Math.round(bel * 100) / 100]);

      // --- is it over?
      const libNow = objHeldW >= 0.7 && ctl >= 0.5 && (F < F0 * 0.4 || bel > 0.6);
      libFor = libNow ? libFor + 1 : Math.max(0, libFor - 2);
      if (libFor >= 12 && counterAt < 0 && X.nation !== 'all') {      // the regional headquarters strikes back (audit P10)
        counterAt = t; const blk = blkNow();
        const n2 = F0 * (X.nation === 'alone' ? 0.6 : 0.3) * (1 - 0.7 * blk) * (1 - 0.4 * bite('truck'));
        const irgc = poolOf('irgc') || poolOf('spec'); if (irgc) irgc.n += n2;
        if (Lv < 3) Lv = 3;
        E(t, 'counter', -1, { n: Math.round(n2) });
      }
      if (libFor >= libNeed) { counterDone = true; outcome = 'liberated'; tEnd = t; E(t, 'liberated'); return true; }
      if (armyState === 3) { armyFor++; if (armyFor >= 24 && bel > 0.7) { outcome = 'army'; tEnd = t; E(t, 'armyrule'); return true; } }
      // the street phase is over when a whole day's biggest crowd is a tenth of the peak (or tiny), nothing is held, no strike
      day24[t % 24] = C; let roll = 0; for (let h = 0; h < 24; h++) if (day24[h] > roll) roll = day24[h];
      const crushNow = t > 48 && roll < Math.max(pop * 0.0015, peak * 0.1) && objHeldW === 0 && ctl < 0.03 && (sig.bazaar + sig.truck + sig.oil + sig.civil) / 4 < 0.25;
      crushFor = crushNow ? crushFor + 1 : 0;
      if (crushFor >= 36 && t > 72 && (fortyAt < 0 || fortyAt > HOURS || t > fortyAt + 48)) { outcome = 'crushed'; tEnd = t; E(t, 'crushed'); return true; }
      return false;
    }
    for (let t = 0; t < HOURS; t++) if (tick(t)) break;
    let lastPeak = 0; for (let h = 0; h < 24; h++) if (day24[h] > lastPeak) lastPeak = day24[h];
    if (!outcome) {
      if (X.armed && warHex > 48 && ctl > 0.15) outcome = 'war';
      else if (ctlLow > 0.15 || objHeldW > 0.25) outcome = 'zones';      // held around the clock, not only while the marches are out
      else if (ctl24 < 0.03 && objHeldW === 0 && lastDayPeak < Math.max(pop * 0.0015, peak * 0.1) && (sig.bazaar + sig.truck + sig.oil + sig.civil) / 4 < 0.25) outcome = 'crushed';
      else outcome = 'stalemate';
    }
    if (outcome === 'crushed' || outcome === 'stalemate') arrT += waveOn ? waveLeft : peak * 0.011 * (1 + 0.3 * P.film);      // the arrests that follow in the weeks after
    const out = {
      outcome, tEnd, dead: Math.round(deadT), arrested: Math.round(arrT), defected: Math.round(defT), peak: Math.round(peak), peakAt, lvMax,
      netCutAt, ctl, objHeld: objHeldW, bel, army: armyState, tvHeld, sigma: (sig.bazaar + sig.truck + sig.oil + sig.civil) / 4, sig, nation: X.nation, proxies: X.proxies, turnout: X.turnout, tl,
      firstDef, blockedReinf: !!fl.bl, split, splitAt, massacreAt, counterAt, days: tEnd / 24,
    };
    if (rec) { out.rec = rec; out.ev = ev; out.X = X; out.F0 = F0; }
    return out;
  }
  function B_g(Bj) { return Bj.g == null ? 0.6 : Bj.g; }

  function spill(B, c, i, amt) {
    let d = B.off[i + 1] - B.off[i]; if (!d) return;
    for (let e = B.off[i]; e < B.off[i + 1]; e++) c[B.nb[e]] += amt / d;
  }
  function spillF(B, f, k, i, amt) {      // pushed-back forces fall back to the neighbours the regime still holds
    let w = 0; for (let e = B.off[i]; e < B.off[i + 1]; e++) if (k[B.nb[e]] < 0) w += -k[B.nb[e]];
    if (w <= 0) return;
    for (let e = B.off[i]; e < B.off[i + 1]; e++) { const j = B.nb[e]; if (k[j] < 0) f[j] += amt * (-k[j]) / w; }
  }

  // The distance field the crowds walk down: from every place the plan wants and does not yet hold, its gathering points
  // (once their hour has come) and the ends of its drawn routes, along the roads.
  let HEAP = null;
  function dijkstra(B, D, held, TW, f, c, P, gather, routeEnd, t) {
    const N = B.N; D.fill(1e12);
    const heap = HEAP || (HEAP = new MinHeap()); heap.n = 0;
    const seed = (h, d0) => { if (d0 < D[h]) { D[h] = d0; heap.push(h, d0); } };
    for (let n = 0; n < B.obj.length; n++) { if (held[n]) continue; const q = B.obj[n]; seed(q.h, -(TW[q.k] || 0.5) * B.s * 1.5); }
    if (P.targets === 'roads') for (const i of B.entries) seed(i, -2.5 * B.s);
    if (P.targets === 'spread' || heap.n === 0) for (let i = 0; i < N; i++) if (B.pol[i] > 0) seed(i, -B.s);
    if (gather) for (const g of gather) if (t >= g.t) seed(g.h, -6 * B.s);
    if (routeEnd) for (const h of routeEnd) seed(h, -5 * B.s);
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
  MinHeap.prototype.pop = function () {
    const I = this.i, Dd = this.d, ti = I[0]; this.top = Dd[0]; this.n--;
    if (this.n > 0) {
      I[0] = I[this.n]; Dd[0] = Dd[this.n]; let n = 0;
      for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < this.n && Dd[l] < Dd[m]) m = l; if (r < this.n && Dd[r] < Dd[m]) m = r; if (m === n) break; let t = I[m]; I[m] = I[n]; I[n] = t; const u = Dd[m]; Dd[m] = Dd[n]; Dd[n] = u; n = m; }
    }
    return ti;
  };

  // Where it starts when the reader has not chosen: by the plan, from where uprisings in Iran have started.
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
  const OUTCOMES = ['liberated', 'army', 'zones', 'stalemate', 'war', 'crushed'];
  function emptyOut() { const o = {}; for (const k of OUTCOMES) o[k] = 0; return o; }
  function batch(Bj, S, n, seed0, slim) {
    const res = { n, out: emptyOut(), dead: [], arrested: [], peak: [], tEnd: [], def: [], runs: [] };
    for (let r = 0; r < n; r++) {
      const seed = (seed0 + r * 7919) >>> 0;
      const o = run(Bj, S, seed);
      res.out[o.outcome]++;
      res.dead.push(o.dead); res.arrested.push(o.arrested); res.peak.push(o.peak); res.tEnd.push(o.tEnd); res.def.push(o.defected);
      if (!slim) res.runs.push({ seed, o: o.outcome, dead: o.dead, ctl: o.ctl, obj: o.objHeld, def: o.defected, army: o.army, tv: o.tvHeld, net: o.netCutAt, lv: o.lvMax,
        sig: o.sigma, nat: o.nation, prox: o.proxies, blk: o.blockedReinf, fd: o.firstDef, tEnd: o.tEnd, peak: o.peak, tl: o.tl, turn: o.turnout, split: o.split, mas: o.massacreAt, bel: o.bel });
    }
    res.p = res.out.liberated / n;
    res.fall = (res.out.liberated + res.out.army) / n;
    return res;
  }
  function quant(a, q) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }

  // The questions behind "why": each factor moved to its other side, everything else held, the change in the odds.
  function factors(S) {
    const f = [];
    const tOn = S.turnout;
    const p = Object.assign({}, PLANS[(S.plan || {}).type] || PLANS.centre, S.plan || {});
    const withPlan = o => Object.assign({}, S, { plan: Object.assign({}, p, o) });
    f.push({ id: 'turnout-up', S: Object.assign({}, S, { turnout: (tOn == null ? null : tOn * 2), _tx: 2 }) });
    f.push({ id: 'turnout-down', S: Object.assign({}, S, { turnout: (tOn == null ? null : tOn / 2), _tx: 0.5 }) });
    f.push({ id: S.net === 'on' ? 'net-off' : 'net-on', S: Object.assign({}, S, { net: S.net === 'on' ? 'off' : 'on' }) });
    f.push({ id: S.nation === 'alone' ? 'nation-all' : 'nation-alone', S: Object.assign({}, S, { nation: S.nation === 'alone' ? 'all' : 'alone' }) });
    f.push({ id: S.armed ? 'unarmed' : 'armed', S: Object.assign({}, S, S.armed ? { armed: false } : { armed: true, guns: 5000, drones: 50 }) });
    const ps = (p.sec && typeof p.sec.oil === 'number') ? p.sec.oil : p.strike;
    f.push({ id: ps > 0.5 ? 'nooil' : 'oil', S: withPlan({ sec: Object.assign({}, p.sec || {}, { oil: ps > 0.5 ? 0 : 0.95 }) }) });
    f.push({ id: p.strike > 0.5 ? 'nostrike' : 'strike', S: withPlan({ strike: p.strike > 0.5 ? 0 : 0.95, sec: null }) });
    f.push({ id: p.fraternize > 0.6 ? 'nofrat' : 'frat', S: withPlan({ fraternize: p.fraternize > 0.6 ? 0.1 : 0.95, discipline: p.fraternize > 0.6 ? p.discipline : Math.max(p.discipline, 0.9) }) });
    f.push({ id: p.blockade > 0.6 ? 'noblock' : 'block', S: withPlan({ blockade: p.blockade > 0.6 ? 0 : 0.95 }) });
    f.push({ id: p.offline > 0.6 ? 'nooffline' : 'offline', S: withPlan({ offline: p.offline > 0.6 ? 0 : 0.95 }) });
    f.push({ id: S.proxies === 'none' ? 'proxies-many' : 'proxies-none', S: Object.assign({}, S, { proxies: S.proxies === 'none' ? 'many' : 'none' }) });
    f.push({ id: S.loyalty === 'shaky' ? 'loyal-firm' : 'loyal-shaky', S: Object.assign({}, S, { loyalty: S.loyalty === 'shaky' ? 'firm' : 'shaky' }) });
    f.push({ id: (S.days || 14) > 14 ? 'short' : 'long', S: Object.assign({}, S, { days: (S.days || 14) > 14 ? 14 : 56 }) });
    return f;
  }
  function withTx(Bj, S) {
    if (S._tx && S.turnout == null) { const nf = NATION[S.nation] || 0.85; return Object.assign({}, S, { turnout: autoTurnout(Bj, S, S.nation && S.nation !== 'auto' ? nf : 0.85) * S._tx }); }
    return S;
  }

  // The best plan for these conditions: every strategy, then dials and sectors around the best ones.
  function candidates(S, R) {
    const out = [], types = Object.keys(PLANS).filter(t => t !== 'armed' || S.armed);
    for (const t of types) out.push(Object.assign({ type: t }, PLANS[t]));
    for (let n = 0; n < 40; n++) {
      const t = types[Math.floor(R() * types.length)], p = Object.assign({ type: t }, PLANS[t]);
      for (const d of DIALS) if (R() < 0.45) p[d] = clamp(p[d] + (R() - 0.5) * 0.8, 0, 1);
      if (R() < 0.5) { p.sec = {}; for (const s of SECTORS) p.sec[s] = clamp(p.strike + (R() - 0.5) * 0.9, 0, 1); }
      if (t !== 'armed') p.discipline = Math.max(p.discipline, 0.6);
      out.push(p);
    }
    return out;
  }

  // ------------------------------------------------------------------ the worker
  const API = { run, batch, prep, resolve, planOf, autoTurnout, factors, withTx, candidates, quant, rng, PLANS, DIALS, SECTORS, LEVELS, OUTCOMES, K, K_SRC, BASEW, TARGETW, NATION, NET, POOLS, POOLS_1978, GROUP };
  G.UPR = API;
  if (typeof WorkerGlobalScope !== 'undefined' && G instanceof WorkerGlobalScope) {
    const BOARDS = {};
    G.onmessage = function (m) {
      const d = m.data || {};
      try {
        if (d.op === 'board') { BOARDS[d.key || 'a'] = d.board; prep(d.board); G.postMessage({ id: d.id, ok: 1 }); return; }
        const BOARD = BOARDS[d.key || 'a'];
        if (!BOARD) throw new Error('no board');
        if (d.op === 'batch') { G.postMessage({ id: d.id, res: batch(BOARD, withTx(BOARD, d.S), d.n, d.seed, d.slim) }); return; }
        if (d.op === 'run') { const o = run(BOARD, d.S, d.seed, { record: false }); G.postMessage({ id: d.id, res: o }); return; }
      } catch (e) { G.postMessage({ id: d.id, err: String(e && e.stack || e) }); }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof self !== 'undefined' ? self : this);
