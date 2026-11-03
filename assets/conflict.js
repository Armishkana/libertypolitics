/* The Conflict Simulator, Iran theatre (3 November 2026). Both sites, both languages. Built by build/conflict.py.
   A turn-based plan-and-watch game on a flat SVG map. The map's layout (every marker, label and name) is computed and
   checked for overlap at build time; this file only scales it. No animation loop: a move draws once, with CSS.
   Model: run() below, one campaign with its uncertain numbers drawn from their ranges; many() runs it 500 times.
   Every number it reads is in the page's data block, each with its source or its "estimate" reason (#cf-facts). */
(function () {
  'use strict';
  var el = document.getElementById('cf-data'), app = document.getElementById('cf-app');
  if (!el || !app) return;
  var D = JSON.parse(el.textContent), FA = D.lang === 'fa', F = D.facts, A = D.A;

  /* ------------------------------------------------------------------ words */
  var W = {
    plan: ['Plan', 'نقشه'], play: ['Play', 'اجرا'], debrief: ['Debrief', 'نتیجه'],
    start: ['Start from', 'شروع از'], goal: ['Your goal', 'هدفتون'], forces: ['Forces', 'نیروها'], defence: ['Defence', 'دفاع'],
    targets: ['Targets', 'هدف‌ها'], rules: ['Length and extras', 'مدت و بقیه'], go: ['Play it', 'اجراش کن'],
    carriers: ['Carrier strike groups', 'ناوگروه‌های هواپیمابر'], ddg: ['Destroyers', 'ناوشکن‌ها'], tlam: ['Destroyer cells with Tomahawks', 'خونه‌های ناوشکن با تاماهاوک'],
    ssgn: ['A cruise-missile submarine', 'یه زیردریایی موشک‌انداز'], b2: ['GBU-57 bunker busters (B-2)', 'بمب سنگرشکن جی‌بی‌یو-۵۷ (بی-۲)'],
    b1: ['B-1B bombers with JASSM-ERs', 'بمب‌افکن بی-۱ با موشک جَسم'], land: ['US jets from Persian Gulf bases', 'جت‌های آمریکا از پایگاه‌های خلیج فارس'],
    israel: ['Israel', 'اسرائیل'], full: ['All in', 'کامل'], limited: ['Limited', 'محدود'], out: ['Stays out', 'بیرون'],
    thaad: ['US THAAD batteries go to', 'آتشبارهای تاد آمریکا کجا برن'], split: ['One each', 'هر کدوم یکی'], gulf: ['Persian Gulf bases', 'پایگاه‌های خلیج فارس'],
    pac: ['Patriot interceptors in the Persian Gulf', 'موشک پاتریوت تو خلیج فارس'], shipdef: ['Destroyer interceptors cover', 'رهگیرهای ناوشکن از کجا دفاع کنن'],
    oildef: ['Defend Saudi and Qatari oil and gas', 'دفاع از نفت و گاز عربستان و قطر'],
    ad: ['Air defence and radars', 'پدافند هوایی و رادارها'], launch: ['Missile launchers and bases', 'سکوها و پایگاه‌های موشکی'],
    nuke: ['Nuclear sites', 'سایت‌های هسته‌ای'], navy: ['IRGC navy, mines, coastal missiles', 'نیروی دریایی سپاه، مین، موشک ساحلی'],
    jets: ['Remaining fighter jets', 'جنگنده‌های باقی‌مونده'], rep: ['Repression forces (Basij, IRGC Tehran, police)', 'نیروهای سرکوب (بسیج، سپاه تهران، پلیس)'],
    leaders: ['Regime officials', 'مقام‌های رژیم'], none: ['None', 'هیچ‌کدوم'], irgc: ['IRGC chiefs only', 'فقط فرمانده‌های سپاه'],
    irgc_artesh: ['IRGC and Artesh chiefs', 'فرمانده‌های سپاه و ارتش'], all: ['Everyone, politicians too', 'همه، سیاستمدارها هم'],
    energy: ['Iranian energy', 'انرژی ایران'], oil: ['Oil exports (Kharg)', 'صادرات نفت (خارک)'], ref: ['Refineries and fuel', 'پالایشگاه و سوخت'],
    power: ['Power plants and grid', 'نیروگاه‌ها و شبکه برق'], raid: ['Commando raid for the uranium', 'عملیات کماندویی برای اورانیوم'],
    days: ['How long', 'چقدر طول بکشه'], d3: ['3 days', '۳ روز'], d10: ['10 days', '۱۰ روز'], d30: ['30 days', '۳۰ روز'],
    net: ['Get the internet to Iranians', 'رسوندن اینترنت به ایرانی‌ها'], off: ['Off', 'نه'], on: ['On', 'آره'], first: ['First', 'اول'],
    yes: ['Yes', 'آره'], no: ['No', 'نه'], now: ['now', 'الان'],
    turn: ['Turn', 'مرحله'], night1: ['Night 1', 'شب اول'], day: ['Day', 'روز'], days_: ['Days', 'روزهای'], after: ['What it leads to', 'به کجا می‌رسه'],
    prev: ['Back', 'قبلی'], next: ['Next', 'بعدی'], auto: ['Auto', 'خودکار'], pause: ['Pause', 'توقف'], toDebrief: ['See the result', 'نتیجه رو ببین'],
    mleft: ['Its missiles left', 'موشک‌های باقی‌مونده‌ش'], tleft: ['Its launchers working', 'سکوهای سالمش'],
    iIL: ['Interceptors over Israel', 'رهگیرهای بالای اسرائیل'], iG: ['Interceptors over the Persian Gulf', 'رهگیرهای بالای خلیج فارس'], hz: ['Hormuz', 'هرمز'],
    open: ['open', 'باز'], closed: ['closed', 'بسته'], dayN: ['day', 'روز'],
    win: ['WIN', 'بُرد'], lose: ['LOSS', 'باخت'], met: ['Your goal was met in', 'به هدفتون رسیدید تو'], ofRuns: ['of 500 runs', 'از ۵۰۰ اجرا'],
    likely: ['The likely real plan', 'نقشه‌ی واقعیِ محتمل'], vs: ['Your plan against the likely real plan', 'نقشه‌ی شما در برابر نقشه‌ی واقعیِ محتمل'],
    you: ['You', 'شما'], odds: ['How likely each outcome is', 'احتمال هر نتیجه'], cost: ['The cost', 'هزینه'], diff: ['What made the difference', 'چی فرق ایجاد کرد'],
    share: ['Share my result', 'نتیجه‌م رو بفرست'], copied: ['Link copied', 'لینک کپی شد'], again: ['Change the plan', 'نقشه رو عوض کن'], watch: ['Watch it again', 'دوباره ببین'],
    o_goal: ['Your goal is met', 'به هدفتون می‌رسید'], o_crack: ['The regime cracks', 'رژیم ترک برمی‌داره'], o_deal: ['A deal ends it', 'یه توافق تمومش می‌کنه'],
    o_hz: ['Hormuz shut for more than 5 days', 'هرمز بیشتر از ۵ روز بسته می‌مونه'], o_oil: ['A big hit on Persian Gulf oil and gas', 'ضربه‌ی بزرگ به نفت و گاز خلیج فارس'],
    o_heu: ['Its enriched uranium survives', 'اورانیوم غنی‌شده‌ش سالم می‌مونه'], o_pick: ['Pickaxe Mountain is shut', 'کوه کلنگ گزلا بسته می‌شه'],
    k_il: ['Killed in Israel', 'کشته در اسرائیل'], k_g: ['Killed at Persian Gulf bases and cities (US troops among them)', 'کشته تو پایگاه‌ها و شهرهای خلیج فارس (با نظامی‌های آمریکایی)'],
    k_ir: ['Killed in Iran', 'کشته در ایران'], civ: ['about half of them civilians', 'حدود نصفشون غیرنظامی'], k_raid: ['US commandos killed in the raid', 'کماندوهای آمریکایی کشته‌شده تو عملیات'],
    usd: ['What the US spends', 'خرج آمریکا'], intc: ['Interceptors fired (all sides)', 'رهگیرهای شلیک‌شده (همه‌ی طرف‌ها)'], worth: ['worth', 'به ارزش'],
    oilp: ['Oil price', 'قیمت نفت'], calm: ['calm', 'آروم'], up: ['up', 'بالا'], spike: ['spike', 'جهش'],
    typical: ['The most typical of the 500 runs', 'معمولی‌ترین اجرا از ۵۰۰ تا'], est: ['estimate', 'تخمین'],
    legend: ['Key', 'راهنما'], kb: ['The US, Israel and partners', 'آمریکا، اسرائیل و متحدهاشون'], kr: ['The Islamic Republic and its allies', 'جمهوری اسلامی و متحدهاش'],
    kn: ['Persian Gulf states (not fighting)', 'کشورهای خلیج فارس (بی‌طرف)'], kmove: ['the move in this step', 'حرکتِ این قدم'], ktrue: ['true spot of a marker moved aside', 'جای دقیقِ نشونه‌ای که کنار رفته'],
    why: ['Why', 'چرا'], range: ['middle 80% of runs', '۸۰ درصدِ وسطِ اجراها'], running: ['Running 500 simulations', 'در حال اجرای ۵۰۰ شبیه‌سازی'],
    better: ['better than', 'بهتر از'], worse: ['worse than', 'بدتر از'], same: ['the same as', 'مثل'], pts: ['points', 'امتیاز'],
    tryit: ['If you change', 'اگه عوض کنید'], best1: ['One change that would help most', 'یه تغییر که بیشتر از همه کمک می‌کنه'], tryit2: ['Try it', 'امتحانش کن'],
    nobetter: ['No single change raises your odds by 5 points or more. Try another goal.', 'هیچ تغییر تکی‌ای شانستون رو ۵ امتیاز یا بیشتر بالا نمی‌بره. یه هدف دیگه رو امتحان کنید.'], to: ['to', 'به'], moves: ['your goal moves', 'هدفتون جابه‌جا می‌شه'],
    rnow: ['Right now', 'همین الان'], rnowSub: ['Where the forces stand today. Pick a plan on the right and press Play.', 'نیروها امروز کجان. یه نقشه انتخاب کنید و اجرا رو بزنید.'],
    rnowSubM: ['Where the forces stand today. Pick a plan below and press Play.', 'نیروها امروز کجان. یه نقشه پایین انتخاب کنید و اجرا رو بزنید.'],
    i_ij: ['icon', 'آیکون'], gradeOf: ['Grade', 'نمره'], shareT: ['My plan on the Conflict Simulator', 'نقشه‌ی من تو شبیه‌ساز درگیری'],
    uncertain: ['Likelihoods, not certainties: each bar is how often it happened in 500 runs with the uncertain numbers drawn from their ranges.', 'احتمالن، نه قطعیت: هر نوار نشون می‌ده تو ۵۰۰ اجرا با عددهای نامطمئن چند بار اتفاق افتاد.'],
    noTargets: ['Pick at least one target.', 'حداقل یه هدف انتخاب کنید.'], wait3: ['Waiting for the third carrier: the campaign starts in about 18 days, and the regime repairs launchers meanwhile.', 'صبر برای ناو سوم: حمله حدود ۱۸ روز دیگه شروع می‌شه و رژیم تو این مدت سکوهاشو تعمیر می‌کنه.']
  };
  function w(k) { var x = W[k]; return x ? x[FA ? 1 : 0] : k; }
  var DIG = '۰۱۲۳۴۵۶۷۸۹';
  function fd(s) { s = String(s); return FA ? s.replace(/[0-9]/g, function (c) { return DIG[+c]; }).replace(/,/g, '٬').replace(/\./g, '٫') : s; }
  function n0(x) { return fd(Math.round(x).toLocaleString('en-US')); }
  function pc(x) { return fd(Math.round(x * 100)) + (FA ? '٪' : '%'); }
  function money(x) { return x >= 1e9 ? (FA ? fd((x / 1e9).toFixed(1)) + ' میلیارد دلار' : '$' + (x / 1e9).toFixed(1) + ' billion') : (FA ? fd(Math.round(x / 1e6)) + ' میلیون دلار' : '$' + Math.round(x / 1e6) + ' million'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ------------------------------------------------------------------ the dice: a seeded generator, so a plan always gives the same result */
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function tri(r, lo, m, hi) { var u = r(), c = (m - lo) / ((hi - lo) || 1); return u < c ? lo + Math.sqrt(u * (hi - lo) * (m - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - m)); }
  function draw(f, r) { if (!f) return 0; if (f.lo == null || f.hi == null || f.lo === f.hi) return f.v != null ? f.v : (f.lo || 0); var m = f.v != null ? f.v : (f.lo + f.hi) / 2; return tri(r, Math.min(f.lo, f.hi), Math.min(Math.max(m, Math.min(f.lo, f.hi)), Math.max(f.lo, f.hi)), Math.max(f.lo, f.hi)); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ------------------------------------------------------------------ THE MODEL: one campaign */
  var SETS = ['ad', 'launch', 'nuke', 'navy', 'jets', 'rep', 'lead', 'oil', 'ref', 'power'];
  function turnsOf(days) { return days === 3 ? [1, 1, 1] : days === 10 ? [1, 2, 3, 4] : [1, 3, 6, 10, 10]; }
  function costOf(k) { var f = F[k]; if (!f) return 0; var v = f.v != null ? f.v : (f.lo + f.hi) / 2; return v < 1000 ? v * 1e6 : v; }

  function run(p, seed, rec) {
    var r = rng(seed), need = A.need.v, steps = [], turns = [];
    var wait = p.carriers >= 3;
    var BM = draw(F.ir_bm, r), TELs = draw(F.ir_tel, r), DR = draw(F.ir_dr, r);
    var TEL0 = TELs * (wait ? 1 + A.rebuild.v * A.wait_days.v / 7 : 1), TEL = TEL0;
    var salvo = draw(F.ir_salvo, r), d1 = tri(r, 1.2, 1.8, 2.4), ad0 = draw(F.ir_ad, r);
    var pk = draw(F.intercept, r), pE = draw(A.empty_kill, r);
    var hzTry = r() < F.hormuz.v, gulfHit = r() < F.gulf_hits.v, prox = draw(F.proxies, r), coh = draw(F.cohesion, r);
    var dmg = {}; SETS.forEach(function (s) { dmg[s] = 0; });
    var cvAim = draw(A.cv_aim, r), host = p.oildef ? 1 : A.host.v, landAim = p.land ? draw(A.land_aim, r) * host : 0;
    var ilAim = (p.israel === 'full' ? 1 : p.israel === 'limited' ? 0.35 : 0) * F.il_sorties.v * A.il_aim.v;
    var cells = F.ddg_cells.v, tlamAll = Math.round(p.ddg * cells * p.tlam) + (p.ssgn ? F.ssgn.v : 0), tlamLeft = tlamAll;
    var smCells = p.ddg * cells * (1 - p.tlam), smShip = smCells * A.ship_share.v, smArea = smCells - smShip, sm3 = Math.min(smArea * 0.35, draw(A.sm3_cap, r)), sm6 = smArea - sm3;
    var thIL = (p.thaad === 'israel' ? 2 : p.thaad === 'split' ? 1 : 0) * F.thaad_batt.v, thG = (2 * F.thaad_batt.v - thIL) + A.gulf_thaad.v;
    var pools = {
      il: [{ k: 'thaad', n: thIL, s: 2, c: costOf('thaad_cost'), us: 1 }, { k: 'sm3', n: p.shipdef === 'israel' ? sm3 : 0, s: 2, c: costOf('sm3_cost'), us: 1 },
           { k: 'arrow', n: draw(A.arrow_left, r), s: 1.5, c: costOf('arrow_cost') }, { k: 'sm6', n: p.shipdef === 'israel' ? sm6 : 0, s: 2, c: costOf('sm6_cost'), us: 1 },
           { k: 'sling', n: draw(A.sling_left, r), s: 2, c: costOf('sling_cost') }],
      g: [{ k: 'thaad', n: thG - A.gulf_thaad.v, s: 2, c: costOf('thaad_cost'), us: 1 }, { k: 'gthaad', n: A.gulf_thaad.v, s: 2, c: costOf('thaad_cost') },
          { k: 'sm3', n: p.shipdef === 'gulf' ? sm3 : 0, s: 2, c: costOf('sm3_cost'), us: 1 }, { k: 'sm6', n: p.shipdef === 'gulf' ? sm6 : 0, s: 2, c: costOf('sm6_cost'), us: 1 },
          { k: 'pac', n: p.pac, s: F.pac3_doc.v || 2, c: costOf('pac3_cost'), us: 1 }]
    };
    var start = { il: sum(pools.il), g: sum(pools.g) };
    var rateEnd = 1, usUsd = 0, used = { n: 0, usd: 0 }, leak = { il: 0, g: 0, o: 0 }, fired = { m: 0, d: 0 }, closure = 0, deadIR = 0;
    var mop = p.b2, pickShut = false, halls = false, raidOK = false, raidDead = 0, tl = turnsOf(p.days), day = 1;
    var fullRef = 2 * cvAim + 70 + F.il_sorties.v * A.il_aim.v;      // the 2026 war: two carriers, land jets, Israel all in
    function sum(ps) { return ps.reduce(function (a, b) { return a + b.n; }, 0); }
    function defend(ps, m, pkx) {      // m missiles at one area: engaged while the right interceptors last
      var stopped = 0, left = m;
      for (var i = 0; i < ps.length && left > 0; i++) {
        var can = Math.min(left, Math.floor(ps[i].n / ps[i].s));
        if (can <= 0) continue;
        ps[i].n -= can * ps[i].s; used.n += can * ps[i].s; used.usd += can * ps[i].s * ps[i].c; if (ps[i].us) usUsd += can * ps[i].s * ps[i].c;
        stopped += can * pkx; left -= can;
      }
      stopped += left * pE;
      return { stop: Math.round(stopped), through: Math.max(0, Math.round(m - stopped)) };
    }
    var weights = {}; SETS.forEach(function (s) { weights[s] = s === 'lead' ? (p.leaders === 'none' ? 0 : 1) : (+p[s] || 0); });
    var tw = SETS.reduce(function (a, s) { return a + weights[s]; }, 0) || 1;
    for (var t = 0; t < tl.length; t++) {
      var d = tl[t], adWork = ad0 * (1 - dmg.ad), eff = 0.6 + 0.4 * (1 - adWork / Math.max(ad0, 0.01));
      var air = (p.carriers * cvAim + landAim + ilAim) * d * eff * (t === 0 && !wait ? 1.2 : 1);
      var tlam = Math.min(tlamLeft, Math.round(t === 0 ? tlamAll * 0.5 : tlamAll * 0.5 / (tl.length - 1)));
      tlamLeft -= tlam;
      var jassm = p.b1 * F.b1_load.v;
      var cap = air + tlam + jassm, alloc = {};
      var wt = {}; SETS.forEach(function (s) { wt[s] = weights[s] * (t === 0 && s === 'ad' && weights.ad ? 2 : 1); });
      var tw2 = SETS.reduce(function (a, s) { return a + wt[s]; }, 0) || 1;
      SETS.forEach(function (s) { alloc[s] = cap * wt[s] / tw2; dmg[s] = 1 - (1 - dmg[s]) * Math.exp(-alloc[s] / need[s]); });
      if (t === 0 && mop && p.nuke) {
        pickShut = r() < 1 - Math.exp(-mop / A.pickaxe.v.close);
        halls = r() < A.pickaxe.v.halls * Math.min(1, mop / 8);
        dmg.nuke = 1 - (1 - dmg.nuke) * Math.exp(-mop / 12);
      }
      if (t === 1 && p.raid) { raidOK = r() < draw(A.raid, r) * (dmg.ad > 0.5 ? 1 : 0.6); raidDead = Math.round(draw(A.raid_dead, r)); }
      var intensity = Math.min(1.6, Math.max(0.15, cap / d / fullRef)) * (p.power ? 1.1 : 1);
      deadIR += draw(A.dead_ir_day, r) * d * intensity;
      /* the answer */
      var sup = 1 - A.watch.v * dmg.launch;
      TEL = TEL0 * (1 - 0.6 * dmg.launch);
      var m = Math.min(BM, salvo * (TEL / TEL0) * sup * (t === 0 ? d1 + 0.5 * (d - 1) : 0.5 * d) * (wait ? 1.05 : 1));
      m = Math.max(0, Math.round(m)); BM -= m;
      var dr = Math.round(Math.min(DR, m * A.drone_ratio.v)); DR -= dr;
      fired.m += m; fired.d += dr;
      var sIL = p.israel === 'out' ? 0.3 : 0.5, sO = gulfHit ? 0.05 : 0, sS = 0.05, sG = 1 - sIL - sO - sS;
      rateEnd = (TEL / TEL0) * sup;      // what it could fire a day now, against an undamaged day
      var mIL = Math.round(m * sIL), mO = Math.round(m * sO), mG = m - mIL - mO - Math.round(m * sS);
      var aIL = defend(pools.il, mIL, pk), aG = defend(pools.g, mG, pk);
      var aO = p.oildef ? defend(pools.g, mO, pk) : { stop: Math.round(mO * pE), through: mO - Math.round(mO * pE) };
      var drThrough = Math.round(dr * (1 - A.drone_kill.v));
      leak.il += aIL.through; leak.g += aG.through + Math.round(drThrough * 0.15); leak.o += aO.through + (gulfHit ? Math.round(drThrough * 0.04) : 0);
      var hzDays = hzTry ? d * Math.max(0, 1 - 0.9 * dmg.navy) : 0;
      closure += hzDays;
      var proxy = r() < prox;
      if (rec) {
        var lbl = t === 0 ? w('night1') : (d === 1 ? w('day') + ' ' + fd(day) : w('days_') + ' ' + fd(day) + '–' + fd(day + d - 1));
        var S = [];
        var top = SETS.filter(function (s) { return wt[s] > 0 && s !== 'lead'; }).sort(function (a, b) { return alloc[b] - alloc[a]; });
        var hits = top.slice(0, 2);
        if (tlam > 0) S.push({ sd: 'b', from: ['b_ships'], to: sto(hits), k: 'tlam', n: tlam, sets: hits, sub: p.ssgn && t === 0 ? 'ssgn' : '' });
        if (t === 0 && mop && p.nuke) S.push({ sd: 'b', from: ['b_b2'], to: ['pickaxe'], k: 'mop', n: mop, ok: pickShut, halls: halls });
        if (p.carriers || landAim || jassm) S.push({ sd: 'b', from: ['b_cv'].concat(landAim ? ['b_land'] : []).concat(jassm ? ['b_b1'] : []), to: sto(top.slice(0, 3)), k: 'air', n: Math.round((p.carriers * cvAim + landAim) * d * eff + jassm), c: p.carriers, land: !!landAim, b1: jassm ? p.b1 : 0, jassm: jassm, sets: top.slice(0, 3) });
        if (ilAim) S.push({ sd: 'b', from: ['b_il'], to: sto(top.slice(0, 2)), k: 'il', n: Math.round(ilAim * d * eff), sets: top.slice(0, 2) });
        if (t === 0 && p.leaders !== 'none') S.push({ sd: 'b', from: ['b_il'], to: ['tehran'], k: 'lead', tier: p.leaders });
        if (t === 0 && p.rep) S.push({ sd: 'b', from: ['b_cv'], to: D.sets.rep, k: 'rep' });
        if (t === 1 && p.raid) S.push({ sd: 'b', from: ['b_ships'], to: ['isfahan-nuclear'], k: 'raid', ok: raidOK, dead: raidDead });
        if (m > 0) {
          S.push({ sd: 'r', from: D.sets.o_west, to: D.sets.r_il, k: 'mil', n: mIL, stop: aIL.stop, thr: aIL.through, left: sum(pools.il) / Math.max(1, start.il) });
          S.push({ sd: 'r', from: D.sets.o_south, to: D.sets.r_gulf, k: 'mg', n: mG, stop: aG.stop, thr: aG.through, dr: dr, left: sum(pools.g) / Math.max(1, start.g) });
          if (mO) S.push({ sd: 'r', from: D.sets.o_south, to: D.sets.r_oil, k: 'mo', n: mO, thr: aO.through, def: !!p.oildef });
        } else S.push({ sd: 'r', from: D.sets.o_west, to: D.sets.r_il, k: 'quiet' });
        if (hzTry && t === 0) S.push({ sd: 'r', from: D.sets.o_navy, to: ['hormuz'], k: 'hz', d: hzDays });
        else if (hzTry && hzDays >= 0.5) S.push({ sd: 'r', from: D.sets.o_navy, to: ['hormuz'], k: 'hz2', d: hzDays });
        if (proxy && (t === 1 || t === 2)) S.push({ sd: 'r', from: t === 1 ? D.sets.o_hz : D.sets.o_ht, to: t === 1 ? D.sets.t_hz : D.sets.t_ht, k: t === 1 ? 'hzb' : 'ht' });
        turns.push({ lbl: lbl, steps: S, st: { bm: BM, tel: TEL / TEL0, il: sum(pools.il) / Math.max(1, start.il), g: sum(pools.g) / Math.max(1, start.g), hz: hzTry && hzDays >= 0.5, cd: closure, dmg: JSON.parse(JSON.stringify(dmg)) } });
      }
      day += d;
    }
    /* what it leads to */
    var heu = raidOK ? false : r() < F.heu.v;
    var dealP = A.deal.v * (0.7 + 0.3 * (dmg.launch + dmg.nuke)) * (p.leaders === 'all' ? 0.5 : 1);
    if (hzTry) closure += draw(A.hz_after, r) * Math.max(0.15, 1 - 0.85 * dmg.navy);
    var deal = r() < dealP;
    if (deal) heu = false;
    var R = A.regime.v, pf = F.fall_mkt.v * (1 + (R.rep - 1) * dmg.rep);
    if (p.leaders !== 'none') pf *= 1 + (R.irgc - 1) * dmg.lead;
    if (p.leaders === 'irgc_artesh' || p.leaders === 'all') pf *= 1 - (1 - R.artesh) * dmg.lead;
    if (p.leaders === 'all') pf *= 1 + (R.pol - 1) * dmg.lead;
    if (p.power) pf *= 1 - (1 - R.power) * dmg.power;
    if (p.ref) pf *= 1 - (1 - R.ref) * dmg.ref;
    if (p.net) pf *= R.net;
    if (p.days >= 30) pf *= R.long;
    pf *= F.cohesion.v / Math.max(0.3, coh);
    pf = Math.min(R.cap, pf);
    var crack = r() < pf, telLeft = TEL / TELs, oilMajor = leak.o >= A.gulf_major.v;
    var oilLvl = closure > 5 || oilMajor ? 2 : closure > 1 ? 1 : 0;
    var usDays = p.days + (wait ? 0 : 0), usInt = Math.min(1.5, Math.max(0.35, (p.carriers + p.ddg / 5 + p.b1 / 4 + (p.land ? 1 : 0)) / 4.6));
    var goals = {
      missiles: rateEnd < 0.1,
      bomb: dmg.nuke >= 0.8 && (pickShut || halls) && !heu,
      hormuz: closure <= 5 && !oilMajor,
      free: crack
    };
    var res = {
      ok: goals[p.goal], goals: goals, telLeft: telLeft, bmLeft: BM, fired: fired, leak: leak, closure: closure, oilMajor: oilMajor, oilLvl: oilLvl,
      heu: heu, deal: deal, crack: crack, pick: pickShut, halls: halls, raid: raidOK, raidDead: raidDead,
      dead: { il: leak.il * A.dead_il.v, g: leak.g * draw(A.dead_gulf, r), ir: deadIR },
      usd: Math.max(costOf('us_day') * usDays * usInt, ((tlamAll - tlamLeft) * costOf('tlam_cost') + p.b1 * F.b1_load.v * tl.length * costOf('jassm_cost') + usUsd) * 1.15), rateEnd: rateEnd, intc: used, ilLeft: sum(pools.il) / Math.max(1, start.il), gLeft: sum(pools.g) / Math.max(1, start.g),
      tlam: tlamAll - tlamLeft, jassm: p.b1 * F.b1_load.v * tl.length, mop: p.nuke ? mop : 0
    };
    if (rec) res.turns = turns;
    return res;
  }
  function sto(sets) { var o = []; sets.forEach(function (s) { (D.sets[s] || []).slice(0, s === 'launch' ? 4 : 3).forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); }); return o; }

  /* 500 runs. Each plan has its own seeds (its code), so the same plan always gives the same numbers, and a shared link
     shows the reader what the sharer saw. Runs in slices so the page never stalls (no long task). */
  var N = 500;
  function many(p, done, n) {
    n = n || N;
    var base = hash(code(p)), out = [], i = 0;
    function slice() {
      var t0 = performance.now();
      while (i < n && performance.now() - t0 < 12) { out.push(run(p, base + i * 7919, false)); i++; }
      if (i < n) setTimeout(slice, 0); else done(stats(out, p, base));
    }
    slice();
  }
  function q(a, f) { var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; }
  function stats(rs, p, base) {
    var k = rs.length, S = { n: k, p: p };
    function share(f) { return rs.filter(f).length / k; }
    S.ok = share(function (x) { return x.ok; });
    S.crack = share(function (x) { return x.crack; }); S.deal = share(function (x) { return x.deal; });
    S.hz = share(function (x) { return x.closure > 5; }); S.oil = share(function (x) { return x.oilMajor; });
    S.heu = share(function (x) { return x.heu; }); S.pick = share(function (x) { return x.pick || x.halls; });
    ['il', 'g', 'ir'].forEach(function (z) { var v = rs.map(function (x) { return x.dead[z]; }); S['d_' + z] = [q(v, 0.1), q(v, 0.5), q(v, 0.9)]; });
    var u = rs.map(function (x) { return x.usd; }); S.usd = [q(u, 0.1), q(u, 0.5), q(u, 0.9)];
    var ic = rs.map(function (x) { return x.intc.n; }); S.intc = [q(ic, 0.1), q(ic, 0.5), q(ic, 0.9)];
    var iu = rs.map(function (x) { return x.intc.usd; }); S.intcUsd = q(iu, 0.5);
    S.raidDead = q(rs.map(function (x) { return x.raidDead; }), 0.5);
    S.oilLvl = q(rs.map(function (x) { return x.oilLvl; }), 0.5);
    S.tel = q(rs.map(function (x) { return x.telLeft; }), 0.5);
    /* the most typical run: its outcome is the majority's, and its numbers sit closest to the medians */
    var maj = S.ok >= 0.5, mt = S.tel, ml = q(rs.map(function (x) { return x.leak.il + x.leak.g; }), 0.5), best = -1, bd = 1e9;
    var pickMaj = S.pick >= 0.5, wantPick = p.nuke && p.b2;
    rs.forEach(function (x, i) { if (x.ok !== maj || (wantPick && (x.pick || x.halls) !== pickMaj)) return; var dd = Math.abs(x.telLeft - mt) * 4 + Math.abs(x.leak.il + x.leak.g - ml) / Math.max(1, ml); if (dd < bd) { bd = dd; best = i; } });
    if (best < 0) best = 0;
    S.typical = run(p, base + best * 7919, true);
    return S;
  }

  /* ------------------------------------------------------------------ the plan in a link */
  var KEYS = Object.keys(D.choices);
  function code(p) { return KEYS.map(function (k) { var c = D.choices[k], v = p[k]; return c.opts ? c.opts.indexOf(v) : Math.round((v - (c.min || 0)) / (c.step || 1)); }).map(function (x) { return Math.max(0, x).toString(36); }).join('.'); }
  function decode(s) {
    var a = String(s || '').split('.'); if (a.length !== KEYS.length) return null;
    var p = {};
    for (var i = 0; i < KEYS.length; i++) {
      var c = D.choices[KEYS[i]], x = parseInt(a[i], 36); if (isNaN(x)) return null;
      if (c.opts) { if (x >= c.opts.length) return null; p[KEYS[i]] = c.opts[x]; }
      else { var v = (c.min || 0) + x * (c.step || 1); if (v > c.max + 1e-9) return null; p[KEYS[i]] = Math.round(v * 100) / 100; }
    }
    return p;
  }
  var LIKELY = D.presets[0].p;

  /* ------------------------------------------------------------------ what each step says */
  var SETW = {
    ad: ['air defence and radars', 'پدافند هوایی و رادارها'], launch: ['missile launchers and bases', 'سکوها و پایگاه‌های موشکی'],
    nuke: ['nuclear sites', 'سایت‌های هسته‌ای'], navy: ['the IRGC navy and coastal missiles', 'نیروی دریایی سپاه و موشک‌های ساحلی'],
    jets: ['airbases and the jets left', 'پایگاه‌های هوایی و جت‌های باقی‌مونده'], rep: ['the Basij, the IRGC Tehran command and the police', 'بسیج، قرارگاه ثارالله و پلیس'],
    oil: ['the Kharg oil terminal', 'پایانه‌ی نفتی خارک'], ref: ['refineries and fuel depots', 'پالایشگاه‌ها و انبارهای سوخت'], power: ['power plants', 'نیروگاه‌ها']
  };
  function sets(a) { var x = a.map(function (s) { return SETW[s] ? SETW[s][FA ? 1 : 0] : s; }); return x.length > 1 ? x.slice(0, -1).join(FA ? '، ' : ', ') + (FA ? ' و ' : ' and ') + x[x.length - 1] : x[0] || ''; }
  var TIER = { irgc: ['IRGC commanders', 'فرمانده‌های سپاه'], irgc_artesh: ['IRGC and Artesh commanders', 'فرمانده‌های سپاه و ارتش'], all: ['IRGC and Artesh commanders and senior politicians', 'فرمانده‌های سپاه و ارتش و سیاستمدارهای ارشد'] };
  function say(s) {
    var t = '', u = '', E = !FA;
    switch (s.k) {
      case 'tlam': t = E ? 'US destroyers' + (s.sub ? ' and a submarine' : '') + ' fire ' + n0(s.n) + ' Tomahawks at ' + sets(s.sets) + '.' : 'ناوشکن‌های آمریکا' + (s.sub ? ' و یه زیردریایی' : '') + ' ' + n0(s.n) + ' تا تاماهاوک به ' + sets(s.sets) + ' شلیک می‌کنن.';
        u = E ? 'From the Gulf of Oman. Range 1,600 km.' : 'از دریای عمان. برد ۱٬۶۰۰ کیلومتر.'; break;
      case 'mop': t = E ? fd(Math.ceil(s.n / 2)) + ' B-2s fly from Diego Garcia and drop ' + n0(s.n) + ' GBU-57 bunker busters on Pickaxe Mountain.' : fd(Math.ceil(s.n / 2)) + ' تا بی-۲ از دیه‌گو گارسیا میان و ' + n0(s.n) + ' تا بمب سنگرشکن جی‌بی‌یو-۵۷ روی کوه کلنگ گزلا می‌ندازن.';
        u = s.halls ? (E ? 'One reaches the halls, 80 to 100 m down. Rare.' : 'یکیش به تالارهای ۸۰ تا ۱۰۰ متری می‌رسه. کم پیش میاد.') : s.ok ? (E ? 'Its entrances are shut. The halls, 80 to 100 m down, survive.' : 'ورودی‌هاش بسته می‌شه. تالارهای ۸۰ تا ۱۰۰ متری سالم می‌مونن.') : (E ? 'Its entrances stay open this time.' : 'این بار ورودی‌هاش باز می‌مونه.'); break;
      case 'jassm': t = E ? fd(s.b) + ' B-1Bs fire ' + n0(s.n) + ' JASSM-ER cruise missiles at ' + sets(s.sets) + '.' : fd(s.b) + ' تا بی-۱، ' + n0(s.n) + ' تا موشک کروز جَسم به ' + sets(s.sets) + ' شلیک می‌کنن.';
        u = E ? 'Fired from outside its air defence, 800+ km away.' : 'از بیرون برد پدافندش، از بیشتر از ۸۰۰ کیلومتری.'; break;
      case 'air': var who = [], fwho = [];
        if (s.c) { who.push('jets from ' + fd(s.c) + ' carrier' + (s.c > 1 ? 's' : '')); fwho.push('جت‌های ' + fd(s.c) + ' ناو'); }
        if (s.land) { who.push('jets from Persian Gulf bases'); fwho.push('جت‌های پایگاه‌های خلیج فارس'); }
        if (s.b1) { who.push(fd(s.b1) + ' B-1B bombers'); fwho.push(fd(s.b1) + ' تا بی-۱'); }
        t = E ? who.join(', ').replace(/^./, function (c) { return c.toUpperCase(); }) + ' hit about ' + n0(s.n) + ' targets: ' + sets(s.sets) + '.' : fwho.join('، ') + ' حدود ' + n0(s.n) + ' هدف رو می‌زنن: ' + sets(s.sets) + '.';
        if (s.b1) u = E ? 'The B-1Bs fire ' + n0(s.jassm) + ' JASSM-ER cruise missiles from 800+ km, outside its air defence.' : 'بی-۱ها ' + n0(s.jassm) + ' تا موشک کروز جَسم از بیشتر از ۸۰۰ کیلومتری، بیرون از برد پدافندش، شلیک می‌کنن.'; break;
      case 'il': t = E ? 'Israeli jets hit about ' + n0(s.n) + ' targets: ' + sets(s.sets) + '.' : 'جت‌های اسرائیل حدود ' + n0(s.n) + ' هدف رو می‌زنن: ' + sets(s.sets) + '.'; break;
      case 'lead': t = E ? 'Strikes on ' + TIER[s.tier][0] + ' in Tehran.' : 'حمله به ' + TIER[s.tier][1] + ' تو تهران.';
        u = E ? 'In 2026 every post was refilled and a new Supreme Leader was chosen in 9 days.' : 'تو ۲۰۲۶ همه‌ی جاها دوباره پر شد و تو ۹ روز رهبر جدید انتخاب شد.'; break;
      case 'rep': t = E ? 'Strikes on the Basij, the IRGC\'s Tehran command and police headquarters.' : 'حمله به بسیج، قرارگاه ثارالله سپاه و ستاد پلیس.';
        u = E ? 'The forces that put down protests.' : 'نیروهایی که اعتراض‌ها رو سرکوب می‌کنن.'; break;
      case 'raid': t = E ? 'US commandos raid the Isfahan tunnels for the enriched uranium.' : 'کماندوهای آمریکا برای اورانیوم غنی‌شده به تونل‌های اصفهان حمله می‌کنن.';
        u = s.ok ? (E ? 'They find it and take it out. ' : 'پیداش می‌کنن و می‌برنش. ') + (E ? n0(s.dead) + ' killed.' : n0(s.dead) + ' کشته.') : (E ? 'They do not find it. ' + n0(s.dead) + ' killed.' : 'پیداش نمی‌کنن. ' + n0(s.dead) + ' کشته.'); break;
      case 'mil': t = E ? 'The Islamic Republic fires ' + n0(s.n) + ' ballistic missiles at Israel.' : 'جمهوری اسلامی ' + n0(s.n) + ' تا موشک بالستیک به اسرائیل شلیک می‌کنه.';
        u = E ? n0(s.stop) + ' stopped, ' + n0(s.thr) + ' get through. Interceptors over Israel left: ' + pc(s.left) + '.' : n0(s.stop) + ' تا زده می‌شه، ' + n0(s.thr) + ' تا رد می‌شه. رهگیرهای باقی‌مونده بالای اسرائیل: ' + pc(s.left) + '.'; break;
      case 'mg': t = E ? 'It fires ' + n0(s.n) + ' missiles and ' + n0(s.dr) + ' drones at US bases around the Persian Gulf.' : n0(s.n) + ' تا موشک و ' + n0(s.dr) + ' تا پهپاد به پایگاه‌های آمریکا دور خلیج فارس شلیک می‌کنه.';
        u = E ? n0(s.stop) + ' missiles stopped, ' + n0(s.thr) + ' get through; most drones are shot down. Interceptors left: ' + pc(s.left) + '.' : n0(s.stop) + ' تا موشک زده می‌شه، ' + n0(s.thr) + ' تا رد می‌شه؛ بیشتر پهپادها زده می‌شن. رهگیرهای باقی‌مونده: ' + pc(s.left) + '.'; break;
      case 'mo': t = E ? 'It fires ' + n0(s.n) + ' missiles at Saudi and Qatari oil and gas.' : n0(s.n) + ' تا موشک به نفت و گاز عربستان و قطر شلیک می‌کنه.';
        u = (s.def ? '' : (E ? 'Undefended. ' : 'بی‌دفاع. ')) + (E ? n0(s.thr) + ' get through.' : n0(s.thr) + ' تا رد می‌شه.'); break;
      case 'quiet': t = E ? 'It fires almost nothing: its launchers are hit or watched from the air.' : 'تقریباً هیچی شلیک نمی‌کنه: سکوهاش یا زده شدن یا از هوا زیر نظرن.'; break;
      case 'hz': t = E ? 'The IRGC navy lays mines and attacks ships: the Strait of Hormuz closes.' : 'نیروی دریایی سپاه مین می‌ریزه و به کشتی‌ها حمله می‌کنه: تنگه‌ی هرمز بسته می‌شه.';
        u = E ? 'It did the same in March, June and July 2026.' : 'مارس، ژوئن و ژوئیه ۲۰۲۶ هم همین کارو کرد.'; break;
      case 'hz2': t = E ? 'Hormuz stays closed for about ' + n0(Math.max(1, s.d)) + ' more days.' : 'هرمز حدود ' + n0(Math.max(1, s.d)) + ' روز دیگه بسته می‌مونه.'; break;
      case 'hzb': t = E ? 'Hezbollah fires rockets at northern Israel. Iron Dome stops most of them.' : 'حزب‌الله به شمال اسرائیل راکت می‌زنه. گنبد آهنین بیشترشو می‌زنه.'; break;
      case 'ht': t = E ? 'The Houthis fire at ships and at Saudi oil.' : 'حوثی‌ها به کشتی‌ها و نفت عربستان شلیک می‌کنن.'; break;
    }
    return { t: t, u: u };
  }

  /* ------------------------------------------------------------------ THE MAP */
  var NS = 'http://www.w3.org/2000/svg';
  var ICON = {      // 24-unit glyphs, one style: white on the side's frame
    jet: 'M12 2.5l1.6 6.2 6.9 4.1v1.9l-6.9-2-.8 5 2.6 1.9v1.6L12 20.4l-3.4.8v-1.6l2.6-1.9-.8-5-6.9 2v-1.9l6.9-4.1z',
    ship: 'M2.5 14h19l-3 5h-13zM6 13V9.5h12V13zM10.5 9.5V6h3v3.5z', carrier: 'M2 12.5h20l-3.2 5.5H5.2zM14.5 8h3.2v4.5h-3.2z',
    oil: 'M12 3.2c3.6 4.6 5.6 7.6 5.6 10.5a5.6 5.6 0 0 1-11.2 0c0-2.9 2-5.9 5.6-10.5z', gas: 'M12 3c1.5 3 4.5 4.6 4.5 9a4.5 4.5 0 0 1-9 0c0-2.5 1.3-3.6 2.1-5.4.6 1.6 1.5 2.4 2.4 2.6C11.5 7.4 11.3 5.3 12 3zM6 19h12v2H6z',
    refinery: 'M3.5 20.5v-9l4.5 2.8v-2.8l4.5 2.8V5h3v15.5zM17.5 20.5V8h3v12.5z', power: 'M13.5 2.5L5 13.5h5.5l-1.2 8 8.7-11.5h-5.6z',
    nuclear: 'M12 10.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zM10.5 8.6L7.8 3.9A9 9 0 0 1 16.2 3.9L13.5 8.6a3.3 3.3 0 0 0-3 0zM15.3 13.5h5.5a9 9 0 0 1-4.2 7.3l-2.8-4.8a3.3 3.3 0 0 0 1.5-2.5zM8.7 13.5a3.3 3.3 0 0 0 1.5 2.5l-2.8 4.8a9 9 0 0 1-4.2-7.3z',
    mountain: 'M2 19.5l7-12 4 6.2 2.6-3.7L22 19.5zM8.2 13.5l1.6-1 1.3 1.2z', missile: 'M12 2c1.9 1.9 2.9 4.6 2.9 8.3v5.4l2.3 3.3h-3.1L12 17.3 9.9 19h-3.1l2.3-3.3v-5.4C9.1 6.6 10.1 3.9 12 2z',
    rocket: 'M5 19l3-7 9-9 2 2-9 9zM4 20l2.5-1M16.5 5.5l2 2', radar: 'M5 5.5a9.5 9.5 0 0 0 13.4 13.4zM11.7 12.3l5.8-5.8M17.5 4.5l2 2M8 20.5h8',
    hq: 'M12 2.8l2.7 5.6 6.1.8-4.4 4.3 1.1 6.1L12 16.7 6.5 19.6l1.1-6.1-4.4-4.3 6.1-.8z', city: 'M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z',
    army: 'M3.5 7.5l8.5 5 8.5-5v4l-8.5 5-8.5-5z', mine: 'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1'
  };
  var STROKE = { rocket: 1, radar: 1, mine: 1 };
  var ICONW = {
    jet: ['airbase', 'پایگاه هوایی'], ship: ['ships, naval base', 'کشتی، پایگاه دریایی'], carrier: ['aircraft carriers', 'ناو هواپیمابر'], oil: ['oil', 'نفت'],
    gas: ['gas', 'گاز'], refinery: ['refinery', 'پالایشگاه'], power: ['power plant', 'نیروگاه'], nuclear: ['nuclear site', 'سایت هسته‌ای'],
    mountain: ['tunnels under a mountain', 'تونل زیر کوه'], missile: ['missile base', 'پایگاه موشکی'], rocket: ['rockets, militia', 'راکت، شبه‌نظامی'],
    radar: ['air defence', 'پدافند هوایی'], hq: ['leaders, command', 'رهبران، فرماندهی'], city: ['city', 'شهر'], army: ['militia, army', 'شبه‌نظامی، ارتش'], mine: ['mines', 'مین']
  };
  function sv(tag, at, parent) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
  function frame(g, side, s) {
    var h = s / 2;
    if (side === 'r') sv('path', { d: 'M0 ' + (-h) + 'L' + h + ' 0L0 ' + h + 'L' + (-h) + ' 0Z', 'class': 'cf-fr cf-r' }, g);
    else if (side === 'n') sv('circle', { r: h * 0.9, 'class': 'cf-fr cf-n' }, g);
    else sv('rect', { x: -h * 0.86, y: -h * 0.86, width: s * 0.86, height: s * 0.86, rx: s * 0.12, 'class': 'cf-fr cf-b' }, g);
  }
  function glyph(g, icon, side, s) {
    var k = (side === 'r' ? 0.46 : 0.6) * s / 24;
    var p = sv('path', { d: ICON[icon] || ICON.city, transform: 'scale(' + k + ') translate(-12 -12)', 'class': STROKE[icon] ? 'cf-gl cf-gls' : 'cf-gl' }, g);
    return p;
  }
  var MAP = { view: 'region', size: 'lg' };
  function viewOf(id) { for (var i = 0; i < D.views.length; i++) if (D.views[i].id === id) return D.views[i]; }
  function lay(view) { return D.L[view + '|' + MAP.size]; }
  function mPos(view, pid) {      // a place's marker in this view, or null
    var mid = D.VM[view][pid]; if (!mid) return null;
    var L = lay(view); for (var i = 0; i < L.m.length; i++) if (L.m[i].id === mid) return { id: mid, x: L.m[i].x, y: L.m[i].y };
    var f = viewOf(view).mk[mid].f;      // a computer-only marker: on a phone its places are drawn by the one it folds into
    if (f) for (var j = 0; j < L.m.length; j++) if (L.m[j].id === f) return { id: f, x: L.m[j].x, y: L.m[j].y };
    return null;
  }
  function project(view, ll) {
    var V = viewOf(view), b = V.bbox, k = 1000 / ((b[2] - b[0]) * Math.PI / 180);
    function m(l) { return Math.log(Math.tan(Math.PI / 4 + l * Math.PI / 360)); }
    return { x: (ll[1] - b[0]) * Math.PI / 180 * k, y: (m(b[3]) - m(ll[0])) * k };
  }
  function pt(view, ref) {      // a from/to reference: a place id, a set of points (b_ships ...), or a lat/lon
    if (typeof ref === 'string' && D.sets[ref]) ref = D.sets[ref][0];
    if (typeof ref === 'string') { var q = mPos(view, ref); if (q) return q; if (D.P[ref]) ref = D.P[ref].ll; else return null; }
    return { x: NaN, y: NaN, ll: project(view, ref) };      // off this view: placed on the frame's edge once the target is known
  }
  function edgeFrom(to, p, L) {      // where the straight line from the target toward an off-map origin leaves the frame
    var m = 6, dx = p.x - to.x, dy = p.y - to.y, t = 1;
    if (p.x < m) t = Math.min(t, (m - to.x) / dx); if (p.x > L.w - m) t = Math.min(t, (L.w - m - to.x) / dx);
    if (p.y < m) t = Math.min(t, (m - to.y) / dy); if (p.y > L.h - m) t = Math.min(t, (L.h - m - to.y) / dy);
    return { x: to.x + dx * t, y: to.y + dy * t, edge: t < 1 };
  }
  function pickView(to) {
    var order = ['hormuz', 'israel', 'center', 'gulf'];
    for (var i = 0; i < order.length; i++) {
      var v = order[i], ok = to.length && to.every(function (x) { return typeof x === 'string' && !!mPos(v, x); });
      if (ok) return v;
    }
    return 'region';
  }

  var svg, layers = {};
  function drawMap(view, hl) {
    MAP.view = view;
    var L = lay(view), V = viewOf(view), u = L.u;
    var box = $('.cf-map', app);
    box.innerHTML = '';
    svg = sv('svg', { viewBox: '0 0 ' + L.w + ' ' + L.h, 'class': 'cf-svg', role: 'img', 'aria-label': V.n }, box);
    svg.style.setProperty('--u', u);
    var defs = sv('defs', {}, svg);
    ['b', 'r'].forEach(function (s) { var mk = sv('marker', { id: 'cf-ah-' + s, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, defs); sv('path', { d: 'M0 0L10 5L0 10z', 'class': 'cf-ah-' + s }, mk); });
    sv('rect', { x: 0, y: 0, width: L.w, height: L.h, 'class': 'cf-sea' }, svg);
    var land = sv('g', { 'class': 'cf-land' }, svg);
    (D.geo[view] || []).forEach(function (c) { sv('path', { d: c.d, 'class': c.n === 'Iran' ? 'cf-iran' : '' }, land); });
    var gl = sv('g', { 'class': 'cf-geo' }, svg);
    L.g.forEach(function (g) {
      var t = sv('text', { x: g.x + g.w / 2, y: g.y + g.h * (FA ? 0.66 : 0.78), 'font-size': g.fs, 'stroke-width': 2.6 * u, 'class': g.k === 'sea' ? 'cf-sea-t' : 'cf-land-t', 'text-anchor': 'middle' }, gl);
      t.textContent = g.t;
    });
    layers.arcs = sv('g', { 'class': 'cf-arcs' }, svg);
    var mg = sv('g', { 'class': 'cf-mks' }, svg);
    L.m.forEach(function (m) {
      var meta = V.mk[m.id];
      if (m.x !== m.tx || m.y !== m.ty) { sv('line', { x1: m.tx, y1: m.ty, x2: m.x, y2: m.y, 'class': 'cf-lead' }, mg); sv('circle', { cx: m.tx, cy: m.ty, r: 2.2 * u, 'class': 'cf-dot' }, mg); }
      var g = sv('g', { transform: 'translate(' + m.x + ' ' + m.y + ')', 'class': 'cf-mk', 'data-id': m.id, tabindex: 0, role: 'button', 'aria-label': meta.n }, mg);
      frame(g, meta.s, L.mk); glyph(g, meta.i, meta.s, L.mk);
      sv('path', { d: 'M' + (-L.mk * 0.42) + ' ' + (L.mk * 0.42) + 'L' + (L.mk * 0.42) + ' ' + (-L.mk * 0.42), 'class': 'cf-slash' }, g);
    });
    var lg = sv('g', { 'class': 'cf-lbls' }, svg);
    L.l.forEach(function (l) {
      if (l.lead) sv('line', { x1: l.lead[0], y1: l.lead[1], x2: l.lead[2], y2: l.lead[3], 'class': 'cf-lead' }, lg);
      var t = sv('text', { x: l.x + l.w / 2, y: l.y + l.h * (FA ? 0.66 : 0.78), 'font-size': L.fs, 'stroke-width': 3.2 * u, 'class': 'cf-lbl', 'data-id': l.id, 'text-anchor': 'middle' }, lg);      // the middle of the measured box: right in both directions
      t.textContent = l.t;
    });
    layers.badges = sv('g', { 'class': 'cf-bds' }, svg);
    legend(view);
    $$('.cf-vt button', app).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === view ? 'true' : 'false'); });
    if (hl) hl();
  }
  function markHit(dm) {      // a marker whose places were wrecked carries a slash
    if (!svg || !dm) return;
    var hitSets = Object.keys(dm).filter(function (s) { return dm[s] > 0.55; });
    var ids = {};
    hitSets.forEach(function (s) { (D.sets[s] || []).forEach(function (pid) { var q = mPos(MAP.view, pid); if (q) ids[q.id] = 1; }); });
    $$('.cf-mk', svg).forEach(function (g) { g.classList[ids[g.dataset.id] ? 'add' : 'remove']('cf-hit'); });
  }
  function drawStep(s, num, dm) {
    var view = pickView(s.to);
    if (view !== MAP.view || !svg) drawMap(view);
    layers.arcs.innerHTML = ''; layers.badges.innerHTML = '';
    $$('.cf-mk', svg).forEach(function (g) { g.classList.remove('cf-on', 'cf-from'); });
    markHit(dm);
    var L = lay(view), tos = [], seen = {};
    s.to.forEach(function (x) { var q = pt(view, x); if (q && q.id && !seen[q.id]) { seen[q.id] = 1; tos.push(q); } });
    var froms = [], fs = {};
    s.from.forEach(function (x) { var q = pt(view, x); var key = q ? (q.id || (Math.round(q.ll.x) + ',' + Math.round(q.ll.y))) : ''; if (q && !fs[key]) { fs[key] = 1; froms.push(q); } });
    froms = froms.slice(0, 2); tos = tos.slice(0, 5);
    tos.forEach(function (to, i) {
      var fr = froms[i % Math.max(1, froms.length)]; if (!fr) return;
      if (fr.ll) fr = edgeFrom(to, fr.ll, L);
      var dx = to.x - fr.x, dy = to.y - fr.y, len = Math.hypot(dx, dy); if (len < 2) return;
      var cx = (fr.x + to.x) / 2 - dy * 0.18, cy = (fr.y + to.y) / 2 + dx * 0.18;
      var end = { x: to.x - dx / len * L.mk * 0.62, y: to.y - dy / len * L.mk * 0.62 };
      var path = sv('path', { d: 'M' + fr.x + ' ' + fr.y + 'Q' + cx + ' ' + cy + ' ' + end.x + ' ' + end.y, 'stroke-width': 2.4 * L.u, 'class': 'cf-arc cf-arc-' + s.sd, 'marker-end': 'url(#cf-ah-' + s.sd + ')' }, layers.arcs);
      path.style.setProperty('--len', Math.ceil(len * 1.2));
    });
    froms.forEach(function (f) { if (f.id) { var g = $('.cf-mk[data-id="' + f.id + '"]', svg); if (g) g.classList.add('cf-from'); } });
    tos.forEach(function (to) {
      var g = $('.cf-mk[data-id="' + to.id + '"]', svg); if (g) g.classList.add('cf-on');
      var c = sv('g', { transform: 'translate(' + (to.x + L.mk / 2) + ' ' + (to.y - L.mk / 2) + ')', 'class': 'cf-bd cf-bd-' + s.sd }, layers.badges);
      sv('circle', { r: L.bd }, c); var tx = sv('text', { 'font-size': L.bd * 1.3, dy: L.bd * 0.45, 'text-anchor': 'middle' }, c); tx.textContent = fd(num);
    });
  }
  function legend(view) {
    var V = viewOf(view), icons = {};
    Object.keys(V.mk).forEach(function (k) { icons[V.mk[k].i] = 1; });
    var h = '<span class="cf-lg-k"><svg viewBox="-12 -12 24 24" aria-hidden="true"><rect x="-9" y="-9" width="18" height="18" rx="2.5" class="cf-fr cf-b"/></svg>' + w('kb') + '</span>'
      + '<span class="cf-lg-k"><svg viewBox="-12 -12 24 24" aria-hidden="true"><path d="M0 -11L11 0L0 11L-11 0Z" class="cf-fr cf-r"/></svg>' + w('kr') + '</span>'
      + '<span class="cf-lg-k"><svg viewBox="-12 -12 24 24" aria-hidden="true"><circle r="10" class="cf-fr cf-n"/></svg>' + w('kn') + '</span>'
      + '<span class="cf-lg-k"><svg viewBox="-12 -12 24 24" aria-hidden="true"><circle r="7" class="cf-lg-bd"/></svg>' + w('kmove') + '</span>';
    Object.keys(icons).forEach(function (i) {
      h += '<span class="cf-lg-i"><svg viewBox="-12 -12 24 24" aria-hidden="true"><path d="' + ICON[i] + '" transform="translate(-12 -12)" class="' + (STROKE[i] ? 'cf-lgs' : 'cf-lgf') + '"/></svg>' + (ICONW[i] ? ICONW[i][FA ? 1 : 0] : i) + '</span>';
    });
    $('.cf-legend', app).innerHTML = '<b>' + w('legend') + '</b>' + h;
  }

  /* ------------------------------------------------------------------ THE PANELS */
  var plan = null, tab = 'plan', result = null, likely = null, cur = { t: 0, s: 0 }, timer = null;
  function initPlan() {
    var q = /[?&]p=([0-9a-z.]+)/.exec(location.search), p = q && decode(q[1]);
    plan = p || JSON.parse(JSON.stringify(LIKELY));
    return !!p;
  }
  var HINT = {
    carriers: function () { return FA ? '۲ تا الان تو منطقه‌ان؛ سومی حدود ۱۴ تا ۲۱ روز دیگه می‌رسه.' : 'Two are in the region now; a third can arrive in about 14 to 21 days.'; },
    ddg: function () { return FA ? 'بیشتر از ۱۰ تا تو منطقه؛ هر کدوم ' + n0(F.ddg_cells.v) + ' خونه‌ی موشک.' : 'More than 10 in the region; ' + n0(F.ddg_cells.v) + ' missile cells each.'; },
    tlam: function (p) { var n = Math.round(p.ddg * F.ddg_cells.v * p.tlam) + (p.ssgn ? F.ssgn.v : 0), sm = Math.round(p.ddg * F.ddg_cells.v * (1 - p.tlam)); return FA ? n0(n) + ' تا تاماهاوک، ' + n0(sm) + ' تا رهگیر. تا اوت ۲۰۲۶ حدود ' + pc(F.tlam_used.v) + ' ذخیره‌ی تاماهاوک آمریکا مصرف شده بود.' : n0(n) + ' Tomahawks, ' + n0(sm) + ' interceptors. About ' + pc(F.tlam_used.v) + ' of the US Tomahawk stock was used by August 2026.'; },
    ssgn: function () { return FA ? n0(F.ssgn.v) + ' تا تاماهاوک دیگه، اگه یکیش اونجا باشه (هیچ‌وقت اعلام نمی‌کنن).' : n0(F.ssgn.v) + ' more Tomahawks, if one is there (boats are never announced).'; },
    b2: function (p) { return FA ? fd(Math.ceil(p.b2 / 2)) + ' تا بی-۲. ژوئن ۲۰۲۵، ۱۴ تا انداخته شد؛ ذخیره‌ی الان محرمانه‌ست.' : fd(Math.ceil(p.b2 / 2)) + ' B-2s. 14 were dropped in June 2025; the stock now is secret.'; },
    b1: function (p) { return FA ? n0(p.b1 * F.b1_load.v) + ' تا جَسم در هر موج، برد بیشتر از ۸۰۰ کیلومتر.' : n0(p.b1 * F.b1_load.v) + ' JASSM-ERs a wave, range 800+ km.'; },
    land: function () { return FA ? 'حدود ۳۰ اف-۳۵ تو منطقه. کشورهای میزبان باید اجازه بدن.' : 'About 30 F-35As in the region. The host countries must allow it.'; },
    israel: function () { return FA ? 'با همه‌ی توان حدود ' + n0(F.il_sorties.v) + ' پرواز حمله در روز.' : 'All in: about ' + n0(F.il_sorties.v) + ' strike sorties a day.'; },
    thaad: function () { return FA ? 'هر آتشبار ' + n0(F.thaad_batt.v) + ' رهگیر. آمریکا تو کل دنیا حدود ' + F.thaad_left.t + ' تا داره.' : F.thaad_batt.t + ' interceptors a battery. The US has about ' + F.thaad_left.t + ' left worldwide.'; },
    pac: function () { return FA ? 'آمریکا تو کل دنیا ' + F.pac3_left.t + ' تا داره. به هر موشک ۲ تا شلیک می‌شه.' : 'The US has ' + F.pac3_left.t + ' left worldwide. Two are fired at each missile.'; },
    shipdef: function (p) { var sm = Math.round(p.ddg * F.ddg_cells.v * (1 - p.tlam) * (1 - A.ship_share.v)); return FA ? n0(sm) + ' تا اس‌ام-۳ و اس‌ام-۶ (بقیه برای دفاع از خود کشتی).' : n0(sm) + ' SM-3s and SM-6s (the rest defend the ship itself).'; },
    oildef: function () { return FA ? 'بدونش، کشورهای خلیج فارس ممکنه حمله از خاکشون رو محدود کنن.' : 'Without it, the host countries may limit strikes from their soil.'; },
    nuke: function () { return FA ? 'کوه کلنگ گزلا فقط با جی‌بی‌یو-۵۷ زده می‌شه.' : 'Pickaxe Mountain is only reached with GBU-57s.'; },
    launch: function () { return FA ? '۲۰۲۶: پرتاب‌ها تو ۱۱ روز ۹۲ درصد کم شد.' : '2026: launches fell 92% in 11 days.'; },
    rep: function () { return FA ? 'بیشترین کمک به مردمِ تو خیابون.' : 'Helps people in the street most.'; },
    leaders: function () { return FA ? 'تو ۲۰۲۶ تو ' + fd(F.leader_days.v) + ' روز رهبر جدید انتخاب شد.' : 'In 2026 a new leader was chosen in ' + fd(F.leader_days.v) + ' days.'; },
    power: function () { return FA ? 'خاموشی سرِ مردم عادی خراب می‌شه و اون‌ها رو از شما دور می‌کنه (تخمین).' : 'Blackouts land on ordinary Iranians and turn them against you (estimate).'; },
    raid: function () { return FA ? 'شانس موفقیت حدود ' + pc(A.raid.v) + ' (تخمین).' : 'About a ' + pc(A.raid.v) + ' chance it works (estimate).'; },
    net: function () { return FA ? 'به مردم کمک می‌کنه خبر رو ببینن و هماهنگ بشن.' : 'Helps people see the news and organise.'; }
  };
  var LINK = { carriers: 'f-carriers', tlam: 'a-tlam_share', ssgn: 'f-ssgn', b2: 'f-mop_stock', b1: 'f-b1_load', land: 'a-host', israel: 'f-il_sorties', thaad: 'f-thaad_left', pac: 'f-pac3_left', shipdef: 'a-ship_share', oildef: 'a-host', launch: 'a-watch', rep: 'a-regime', leaders: 'f-leader_days', power: 'a-regime', raid: 'a-raid', net: 'a-regime', nuke: 'a-pickaxe', ddg: 'f-ddg_cells' };
  var SECT = [
    ['forces', ['carriers', 'ddg', 'tlam', 'ssgn', 'b2', 'b1', 'land', 'israel']],
    ['defence', ['thaad', 'pac', 'shipdef', 'oildef']],
    ['targets', ['ad', 'launch', 'nuke', 'navy', 'jets', 'rep', 'leaders', 'oil', 'ref', 'power', 'raid']],
    ['rules', ['days', 'net']]
  ];
  function optLabel(k, v) {
    if (['ad', 'launch', 'nuke', 'navy', 'jets', 'rep'].indexOf(k) >= 0) return w(['off', 'on', 'first'][v]);
    if (k === 'days') return w('d' + v);
    if (k === 'b2') return fd(v);
    if (k === 'israel' || k === 'thaad' || k === 'shipdef' || k === 'leaders') return w(v);
    return v ? w('on') : w('off');
  }
  function control(k) {
    var c = D.choices[k], v = plan[k], h = '';
    var lab = k === 'thaad' ? w('thaad') : k === 'shipdef' ? w('shipdef') : w(k);
    if (c.opts) {
      h = '<div class="cf-seg" role="group" aria-label="' + esc(lab) + '">' + c.opts.map(function (o) {
        var t = k === 'thaad' && o === 'gulf' ? w('gulf') : optLabel(k, o);
        return '<button type="button" data-k="' + k + '" data-v="' + esc(JSON.stringify(o)) + '" aria-pressed="' + (o === v) + '">' + esc(t) + '</button>';
      }).join('') + '</div>';
    } else if (c.step && c.step < 1) {
      h = '<div class="cf-sl"><input type="range" data-k="' + k + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + v + '" aria-label="' + esc(lab) + '"><output>' + pc(v) + '</output></div>';
    } else if (c.step) {
      h = '<div class="cf-sl"><input type="range" data-k="' + k + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + v + '" aria-label="' + esc(lab) + '"><output>' + n0(v) + '</output></div>';
    } else {
      h = '<div class="cf-step"><button type="button" data-k="' + k + '" data-d="-1" aria-label="−">−</button><output>' + fd(v) + '</output><button type="button" data-k="' + k + '" data-d="1" aria-label="+">+</button></div>';
    }
    var hint = HINT[k] ? '<p class="cf-hint">' + esc(HINT[k](plan)) + (LINK[k] ? ' <a href="#' + LINK[k] + '" class="cf-i" data-to="' + LINK[k] + '">' + (FA ? 'منبع' : 'source') + '</a>' : '') + '</p>' : '';
    return '<div class="cf-row" data-row="' + k + '"><span class="cf-lab">' + esc(lab) + '</span>' + h + hint + '</div>';
  }
  function planPanel() {
    var g = '<div class="cf-goals" role="group" aria-label="' + w('goal') + '">' + Object.keys(D.goals).map(function (k) {
      return '<button type="button" data-goal="' + k + '" aria-pressed="' + (plan.goal === k) + '"><b>' + esc(D.goals[k].n) + '</b><span>' + esc(D.goals[k].win) + '</span></button>';
    }).join('') + '</div>';
    var pr = '<div class="cf-presets">' + D.presets.map(function (p, i) {
      return '<button type="button" data-preset="' + i + '" aria-pressed="' + (code(p.p) === code(plan)) + '"><b>' + esc(p.n) + '</b><span>' + esc(firstSentences(p.why, 1)) + '</span></button>';
    }).join('') + '</div>';
    var on = D.presets.filter(function (p) { return code(p.p) === code(plan); })[0];
    if (on && firstSentences(on.why, 1) !== on.why) pr += '<p class="cf-hint">' + esc(on.why.slice(firstSentences(on.why, 1).length).trim()) + '</p>';
    var secs = SECT.map(function (s) { return '<details class="cf-sec"' + (s[0] === 'targets' ? ' open' : '') + '><summary>' + w(s[0]) + '</summary>' + s[1].map(control).join('') + '</details>'; }).join('');
    var wn = plan.carriers >= 3 ? '<p class="cf-warn">' + w('wait3') + '</p>' : '';
    return '<h2 class="cf-h">' + w('start') + '</h2>' + pr + '<h2 class="cf-h">' + w('goal') + '</h2>' + g + secs + wn
      + '<div class="cf-go"><button type="button" class="cf-play" id="cf-go">' + w('go') + (FA ? ' ◂' : ' ▸') + '</button></div>';
  }
  function setTab(t) {
    tab = t; app.setAttribute('data-tab', t);
    $$('.cf-tabs button', app).forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'); });
    var P = $('.cf-panel', app);
    if (t === 'plan') { P.innerHTML = planPanel(); stopAuto(); nowMap(); }
    if (t === 'play') { P.innerHTML = playPanel(); showStep(); }
    if (t === 'debrief') { P.innerHTML = debriefPanel(); stopAuto(); }
    P.scrollTop = 0;
  }
  function nowMap() {
    drawMap('region');
    var ids = ['carriers', 'us-ships', 'israel', 'gulf-bases', 'tehran', 'nuclear', 'mb-west', 'hormuz'];
    $$('.cf-mk', svg).forEach(function (g) { if (ids.indexOf(g.dataset.id) >= 0) g.classList.add('cf-from'); });
    $('.cf-cap', app).innerHTML = '<b>' + w('rnow') + '</b> <span class="num">' + esc(dateOf(D.now.asOf)) + '</span><p>' + esc(firstSentences(D.now.state, 2)) + '</p><p class="cf-cap-u">' + w(innerWidth < 900 ? 'rnowSubM' : 'rnowSub') + '</p>';
  }
  function dateOf(iso) { try { return new Date(iso + 'T12:00:00Z').toLocaleDateString(FA ? 'fa-IR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return iso; } }
  function firstSentences(s, n) { var a = s.split(/(?<=[.!?؟])\s+/); return a.slice(0, n).join(' '); }

  function go() {
    var any = ['ad', 'launch', 'nuke', 'navy', 'jets', 'rep', 'oil', 'ref', 'power'].some(function (k) { return +plan[k] > 0; }) || plan.leaders !== 'none';
    if (!any) { alertLine(w('noTargets')); return; }
    try { history.replaceState(null, '', location.pathname + '?p=' + code(plan) + location.hash); } catch (e) { }
    var P = $('.cf-panel', app);
    P.innerHTML = '<p class="cf-busy" role="status">' + w('running') + '…</p>';
    many(plan, function (S) {
      result = S;
      var lc = code(LIKELY) === code(plan);
      var fin = function () { cur = { t: 0, s: 0 }; setTab('play'); startAuto(); };
      if (lc) { likely = S; fin(); } else if (likely) fin(); else many(LIKELY, function (L) { likely = L; fin(); });
    });
  }
  function alertLine(t) { var x = $('.cf-go', app); if (x && !$('.cf-err', x)) { var p = document.createElement('p'); p.className = 'cf-err'; p.setAttribute('role', 'alert'); p.textContent = t; x.appendChild(p); } }

  /* Play: the typical run, a turn at a time, a step at a time */
  function playPanel() {
    var T = result.typical.turns;
    var tabs = '<div class="cf-turns" role="tablist">' + T.map(function (t, i) { return '<button type="button" role="tab" data-turn="' + i + '" aria-selected="' + (i === cur.t) + '">' + esc(t.lbl) + '</button>'; }).join('') + '</div>';
    var tt = T[cur.t], k = 0;
    var steps = '<ol class="cf-steps">' + tt.steps.map(function (s, i) { var x = say(s); return '<li data-step="' + i + '" class="cf-st-' + s.sd + '"><span class="cf-n">' + fd(i + 1) + '</span><div><p>' + esc(x.t) + '</p>' + (x.u ? '<p class="cf-u">' + esc(x.u) + '</p>' : '') + '</div></li>'; }).join('') + '</ol>';
    var st = tt.st;
    var bars = '<div class="cf-bars">' + bar(w('mleft'), st.bm / Math.max(1, F.ir_bm.v), n0(st.bm), 'r') + bar(w('tleft'), st.tel, pc(st.tel), 'r')
      + bar(w('iIL'), st.il, pc(st.il), 'b') + bar(w('iG'), st.g, pc(st.g), 'b')
      + '<div class="cf-bar"><span>' + w('hz') + '</span><b class="' + (st.hz ? 'cf-bad' : 'cf-good') + '">' + (st.hz ? w('closed') : w('open')) + '</b></div></div>';
    var ctl = '<div class="cf-ctl"><button type="button" data-act="prev">' + (FA ? '▸ ' : '◂ ') + w('prev') + '</button><button type="button" data-act="auto" aria-pressed="' + (!!timer) + '">' + (timer ? w('pause') : w('auto')) + '</button><button type="button" data-act="next">' + w('next') + (FA ? ' ◂' : ' ▸') + '</button></div>';
    var fin = '<div class="cf-go"><button type="button" class="cf-play" data-act="debrief">' + w('toDebrief') + '</button></div>';
    return '<p class="cf-typ">' + w('typical') + '</p>' + tabs + ctl + steps + bars + fin;
  }
  function bar(l, f, t, s) { f = Math.max(0, Math.min(1, f)); return '<div class="cf-bar"><span>' + esc(l) + '</span><i class="cf-bar-' + s + '"><i style="width:' + Math.round(f * 100) + '%"></i></i><b>' + esc(t) + '</b></div>'; }
  function showStep() {
    var T = result.typical.turns, tt = T[cur.t], s = tt.steps[cur.s];
    $$('.cf-steps li', app).forEach(function (li, i) { li.classList.toggle('cf-cur', i === cur.s); li.classList.toggle('cf-done', i < cur.s); });
    var prevDmg = cur.t > 0 ? T[cur.t - 1].st.dmg : null;
    drawStep(s, cur.s + 1, s.sd === 'r' ? tt.st.dmg : prevDmg);
    var x = say(s);
    $('.cf-cap', app).innerHTML = '<b>' + esc(tt.lbl) + ' · ' + fd(cur.s + 1) + '/' + fd(tt.steps.length) + '</b><p>' + esc(x.t) + '</p>' + (x.u ? '<p class="cf-cap-u">' + esc(x.u) + '</p>' : '');
    var li = $('.cf-steps li.cf-cur', app), P = $('.cf-panel', app);
    if (li && P && P.scrollHeight > P.clientHeight) { var top = li.offsetTop - P.offsetTop; if (top < P.scrollTop || top > P.scrollTop + P.clientHeight - 80) P.scrollTop = Math.max(0, top - 60); }
  }
  function step(d) {
    var T = result.typical.turns, s = cur.s + d, t = cur.t;
    if (s >= T[t].steps.length) { if (t + 1 >= T.length) { stopAuto(); setTab('debrief'); return; } t++; s = 0; }
    else if (s < 0) { if (t === 0) s = 0; else { t--; s = T[t].steps.length - 1; } }
    var changed = t !== cur.t; cur = { t: t, s: s };
    if (changed) $('.cf-panel', app).innerHTML = playPanel();
    showStep();
  }
  var SPEED = 3200;
  function startAuto() { stopAuto(); if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; timer = setInterval(function () { if (document.hidden) return; step(1); }, SPEED); syncAuto(); }
  function stopAuto() { if (timer) clearInterval(timer); timer = null; syncAuto(); }
  function syncAuto() { var b = $('[data-act="auto"]', app); if (b) { b.setAttribute('aria-pressed', !!timer); b.textContent = timer ? w('pause') : w('auto'); } }

  /* Debrief: the grade, the odds, the cost, against the likely real plan */
  function grade(x) { return x >= 0.7 ? 'A' : x >= 0.55 ? 'B' : x >= 0.4 ? 'C' : x >= 0.25 ? 'D' : 'F'; }
  function debriefPanel() {
    var S = result, L = likely, g = grade(S.ok), win = S.ok >= 0.5, same = code(plan) === code(LIKELY);
    var d = Math.round((S.ok - L.ok) * 100);
    var head = '<div class="cf-grade cf-g-' + g + '"><span class="cf-gl-big">' + g + '</span><div><b class="' + (win ? 'cf-good' : 'cf-bad') + '">' + (win ? w('win') : w('lose')) + ' · ' + esc(D.goals[plan.goal].n) + '</b><p>' + w('met') + ' <b>' + pc(S.ok) + '</b> ' + w('ofRuns') + '.</p>'
      + (same ? '' : '<p>' + w('likely') + ': <b>' + pc(L.ok) + '</b>. ' + (FA ? 'شما ' + fd(Math.abs(d)) + ' امتیاز ' + (d > 0 ? w('better') : d < 0 ? w('worse') : w('same')) + ' اون.' : 'You are ' + (d === 0 ? 'level with it' : Math.abs(d) + ' points ' + (d > 0 ? 'better' : 'worse'))) + '.</p>') + '</div></div>';
    function row(k, a, b, bad) { return '<tr><th>' + w(k) + '</th><td>' + oddsBar(a, bad) + '</td>' + (same ? '' : '<td>' + oddsBar(b, bad) + '</td>') + '</tr>'; }
    var odds = '<h3 class="cf-h">' + w('odds') + '</h3><p class="cf-note">' + w('uncertain') + '</p><table class="cf-odds"><thead><tr><th></th><th>' + w('you') + '</th>' + (same ? '' : '<th>' + w('likely') + '</th>') + '</tr></thead><tbody>'
      + row('o_goal', S.ok, L.ok, 0) + row('o_crack', S.crack, L.crack, 0) + row('o_deal', S.deal, L.deal, 0) + row('o_pick', S.pick, L.pick, 0)
      + row('o_heu', S.heu, L.heu, 1) + row('o_hz', S.hz, L.hz, 1) + row('o_oil', S.oil, L.oil, 1) + '</tbody></table>';
    function rg(a) { return n0(a[1]) + ' <span class="cf-rg">(' + n0(a[0]) + '–' + n0(a[2]) + ')</span>'; }
    var cost = '<h3 class="cf-h">' + w('cost') + '</h3><table class="cf-cost"><tbody>'
      + '<tr><th>' + w('k_il') + '</th><td>' + rg(S.d_il) + '</td></tr><tr><th>' + w('k_g') + '</th><td>' + rg(S.d_g) + '</td></tr>'
      + '<tr><th>' + w('k_ir') + '</th><td>' + rg(S.d_ir) + ' <span class="cf-rg">' + w('civ') + '</span></td></tr>'
      + (plan.raid ? '<tr><th>' + w('k_raid') + '</th><td>' + n0(S.raidDead) + '</td></tr>' : '')
      + '<tr><th>' + w('usd') + '</th><td>' + money(S.usd[1]) + '</td></tr><tr><th>' + w('intc') + '</th><td>' + n0(S.intc[1]) + ' · ' + w('worth') + ' ' + money(S.intcUsd) + '</td></tr>'
      + '<tr><th>' + w('oilp') + '</th><td>' + w(['calm', 'up', 'spike'][S.oilLvl]) + '</td></tr></tbody></table><p class="cf-note">' + w('range') + ' · ' + w('est') + '</p>';
    var diff = (same ? '' : '<h3 class="cf-h">' + w('diff') + '</h3><ul class="cf-diff" id="cf-diff"><li class="cf-busy">' + w('running') + '…</li></ul>')
      + '<h3 class="cf-h">' + w('best1') + '</h3><ul class="cf-diff" id="cf-best"><li class="cf-busy">' + w('running') + '…</li></ul>';
    var share = '<div class="cf-go"><button type="button" class="cf-play" data-act="share">' + w('share') + '</button><button type="button" class="cf-ghost" data-act="watch">' + w('watch') + '</button><button type="button" class="cf-ghost" data-act="plan">' + w('again') + '</button></div><p class="cf-shared" role="status" aria-live="polite"></p>';
    setTimeout(function () { if (same) bestChange(); else difference(bestChange); }, 30);
    return head + share + odds + cost + diff;
  }
  function oddsBar(x, bad) { return '<span class="cf-ob' + (bad ? ' cf-ob-bad' : '') + '"><i style="width:' + Math.round(x * 100) + '%"></i></span><b>' + pc(x) + '</b>'; }
  /* What made the difference: each choice where you differ from the likely real plan, set back to its value alone */
  function difference(then) {
    var keys = KEYS.filter(function (k) { return k !== 'goal' && plan[k] !== LIKELY[k]; }), out = [], i = 0;
    var ul = $('#cf-diff', app); if (!ul) return;
    if (!keys.length) { ul.innerHTML = ''; if (then) then(); return; }
    function nextOne() {
      if (i >= keys.length || !$('#cf-diff', app)) { finish(); if (then) then(); return; }
      var k = keys[i++], p2 = JSON.parse(JSON.stringify(plan)); p2[k] = LIKELY[k];
      many(p2, function (S2) { out.push({ k: k, d: result.ok - S2.ok }); nextOne(); }, 160);
    }
    function finish() {
      var u = $('#cf-diff', app); if (!u) return;
      out.sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); });
      u.innerHTML = out.slice(0, 4).map(function (o) {
        var lab = o.k === 'thaad' ? w('thaad') : o.k === 'shipdef' ? w('shipdef') : w(o.k);
        var yours = D.choices[o.k].opts ? optLabel(o.k, plan[o.k]) : fd(plan[o.k]), theirs = D.choices[o.k].opts ? optLabel(o.k, LIKELY[o.k]) : fd(LIKELY[o.k]);
        if (o.k === 'tlam') { yours = pc(plan[o.k]); theirs = pc(LIKELY[o.k]); }
        return '<li><b>' + esc(lab) + '</b>: ' + esc(yours) + ' (' + w('likely').toLowerCase() + ': ' + esc(theirs) + ') <span class="' + (o.d >= 0 ? 'cf-good' : 'cf-bad') + '">' + (o.d >= 0 ? '+' : '−') + fd(Math.abs(Math.round(o.d * 100))) + ' ' + w('pts') + '</span></li>';
      }).join('');
    }
    nextOne();
  }
  /* The one change that helps most: every other value of every lever, tried alone (120 runs each), best three shown */
  function alts(k) {
    var c = D.choices[k], v = plan[k];
    if (c.opts) return c.opts.filter(function (o) { return o !== v; });
    var st = c.step || 1, out = [];
    [v - 2 * st, v + 2 * st, c.min, c.max].forEach(function (x) { x = Math.round(Math.max(c.min, Math.min(c.max, x)) * 100) / 100; if (x !== v && out.indexOf(x) < 0) out.push(x); });
    return out;
  }
  function bestChange() {
    var tries = [];
    KEYS.forEach(function (k) { if (k !== 'goal') alts(k).forEach(function (x) { tries.push([k, x]); }); });
    var out = [], i = 0, base = result.ok;
    function nextOne() {
      if (!$('#cf-best', app)) return;
      if (i >= tries.length) return finish();
      var k = tries[i][0], x = tries[i][1]; i++;
      var p2 = JSON.parse(JSON.stringify(plan)); p2[k] = x;
      many(p2, function (S2) { out.push({ k: k, x: x, d: S2.ok - base, p: p2 }); setTimeout(nextOne, 0); }, 120);
    }
    function finish() {
      var u = $('#cf-best', app); if (!u) return;
      var seen = {}, top = out.filter(function (o) { return o.d >= 0.05; }).sort(function (a, b) { return b.d - a.d; }).filter(function (o) { if (seen[o.k]) return false; seen[o.k] = 1; return true; }).slice(0, 3);
      if (!top.length) { u.innerHTML = '<li>' + w('nobetter') + '</li>'; return; }
      u.innerHTML = top.map(function (o, j) {
        var lab = o.k === 'thaad' ? w('thaad') : o.k === 'shipdef' ? w('shipdef') : w(o.k);
        var val = o.k === 'tlam' ? pc(o.x) : D.choices[o.k].opts ? optLabel(o.k, o.x) : fd(o.x);
        return '<li><b>' + esc(lab) + '</b> → ' + esc(val) + ' <span class="cf-good">+' + fd(Math.round(o.d * 100)) + ' ' + w('pts') + '</span> <button type="button" class="cf-mini" data-try="' + j + '">' + w('tryit2') + '</button></li>';
      }).join('');
      BEST = top;
    }
    nextOne();
  }
  var BEST = [];
  function shareIt() {
    var url = location.origin + location.pathname + '?p=' + code(plan);
    var text = w('shareT') + ': ' + D.goals[plan.goal].n + ', ' + w('gradeOf') + ' ' + grade(result.ok) + ' (' + pc(result.ok) + ')';
    var msg = $('.cf-shared', app);
    if (navigator.share) { navigator.share({ title: document.title, text: text, url: url }).catch(function () { }); return; }
    var done = function () { if (msg) msg.textContent = w('copied'); };
    if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(done, function () { if (msg) msg.textContent = url; });
    else if (msg) msg.textContent = url;
  }

  /* ------------------------------------------------------------------ the shell */
  function shell() {
    var vt = '<div class="cf-vt" role="group" aria-label="' + w('map') + '">' + D.views.map(function (v) { return '<button type="button" data-v="' + v.id + '" aria-pressed="false">' + esc(v.n) + '</button>'; }).join('') + '</div>';
    app.innerHTML = '<div class="cf-board"><div class="cf-left"><div class="cf-mapwrap">' + vt + '<div class="cf-map"></div></div><div class="cf-cap" aria-live="polite"></div><div class="cf-legend"></div></div>'
      + '<div class="cf-side"><div class="cf-tabs" role="tablist">' + ['plan', 'play', 'debrief'].map(function (t, i) { return '<button type="button" role="tab" data-tab="' + t + '" aria-selected="' + (t === 'plan') + '"' + (t !== 'plan' ? ' disabled' : '') + '><span class="cf-n">' + fd(i + 1) + '</span>' + w(t) + '</button>'; }).join('') + '</div><div class="cf-panel"></div></div></div>';
  }
  function size() { var m = $('.cf-map', app); var s = m && m.clientWidth >= 520 ? 'lg' : 'sm'; if (s !== MAP.size) { MAP.size = s; return true; } return false; }
  function onClick(ev) {
    var b = ev.target.closest('button, a.cf-i'); if (!b || !app.contains(b)) return;
    if (b.dataset.to) { var t = document.getElementById(b.dataset.to); if (t) { var d = t.closest('details'); if (d) d.open = true; } return; }
    if (b.dataset.tab) { if (!b.disabled) setTab(b.dataset.tab); return; }
    if (b.dataset.v && !b.dataset.k) { stopAuto(); drawMap(b.dataset.v); return; }
    if (b.dataset.preset != null) { plan = JSON.parse(JSON.stringify(D.presets[+b.dataset.preset].p)); refreshPlan(); return; }
    if (b.dataset.goal) { plan.goal = b.dataset.goal; refreshPlan(); return; }
    if (b.dataset.k && b.dataset.d) { var c = D.choices[b.dataset.k]; plan[b.dataset.k] = Math.max(c.min, Math.min(c.max, plan[b.dataset.k] + +b.dataset.d)); refreshPlan(); return; }
    if (b.dataset.k && b.dataset.v != null) { plan[b.dataset.k] = JSON.parse(b.dataset.v); refreshPlan(); return; }
    if (b.id === 'cf-go') { go(); return; }
    if (b.dataset.turn) { stopAuto(); cur = { t: +b.dataset.turn, s: 0 }; $('.cf-panel', app).innerHTML = playPanel(); showStep(); return; }
    if (b.dataset.act === 'next') { stopAuto(); step(1); return; }
    if (b.dataset.act === 'prev') { stopAuto(); step(-1); return; }
    if (b.dataset.act === 'auto') { if (timer) stopAuto(); else startAuto(); return; }
    if (b.dataset.act === 'debrief') { setTab('debrief'); return; }
    if (b.dataset.act === 'share') { shareIt(); return; }
    if (b.dataset.act === 'watch') { cur = { t: 0, s: 0 }; setTab('play'); startAuto(); return; }
    if (b.dataset.act === 'plan') { setTab('plan'); return; }
    if (b.dataset.try != null && BEST[+b.dataset.try]) { plan = JSON.parse(JSON.stringify(BEST[+b.dataset.try].p)); result = null; go(); return; }
  }
  function refreshPlan() {
    var P = $('.cf-panel', app), open = $$('details.cf-sec', P).map(function (d) { return d.open; }), st = P.scrollTop;
    P.innerHTML = planPanel();
    $$('details.cf-sec', P).forEach(function (d, i) { if (open[i] != null) d.open = open[i]; });
    P.scrollTop = st;
    result = null;      // a changed plan has not been run yet
    ['play', 'debrief'].forEach(function (t) { var b = $('.cf-tabs [data-tab="' + t + '"]', app); if (b) b.disabled = true; });
  }
  function onInput(ev) {
    var i = ev.target; if (!i.dataset || !i.dataset.k) return;
    plan[i.dataset.k] = +i.value; result = null;
    ['play', 'debrief'].forEach(function (t) { var b = $('.cf-tabs [data-tab="' + t + '"]', app); if (b) b.disabled = true; });
    var o = i.parentNode.querySelector('output'); if (o) o.textContent = D.choices[i.dataset.k].step < 1 ? pc(+i.value) : n0(+i.value);
    var row = i.closest('.cf-row'), h = row && row.querySelector('.cf-hint');
    if (h && HINT[i.dataset.k]) h.firstChild.textContent = HINT[i.dataset.k](plan) + ' ';
    ['tlam', 'shipdef'].forEach(function (k) { var r = $('.cf-row[data-row="' + k + '"] .cf-hint', app); if (r && HINT[k]) r.firstChild.textContent = HINT[k](plan) + ' '; });
  }
  shell();
  size();
  var shared = initPlan();
  setTab('plan');
  app.addEventListener('click', onClick);
  app.addEventListener('input', onInput);
  var rz = 0;
  addEventListener('resize', function () { if (rz) return; rz = requestAnimationFrame(function () { rz = 0; if (size()) { if (tab === 'play') showStep(); else if (tab === 'plan') nowMap(); else drawMap(MAP.view); } }); });
  /* once a run exists, Play and Debrief open */
  var _setTab = setTab; setTab = function (t) { _setTab(t); if (result) $$('.cf-tabs button', app).forEach(function (b) { b.disabled = false; }); };
  if (shared) go();
  if (/[?&]dbg=1/.test(location.search)) window.__cf = { run: run, many: many, D: D, code: code };      // for the calibration in conflict.py --measure
})();
