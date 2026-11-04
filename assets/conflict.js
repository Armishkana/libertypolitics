/* The Conflict Simulator, Iran theatre (build/conflict.py, conflict.css; fifth rebuild, 4 November 2026).
   One zoomable map of the region. Every unit of data/conflict/forces.json is a marker or a list row that opens a card:
   a drawing, key specs, what it means, its members, its sources and the date it was last publicly reported. The
   Simulate tab runs a round 400 times with the numbers of data/conflict/iran.json and plays the most typical run on the map.
   Nothing hides and animates back in; arcs draw once, and not at all for a reader who asks for reduced motion. */
(function () {
  'use strict';
  var app = document.getElementById('cf-app'), blob = document.getElementById('cf-data');
  if (!app || !blob || !window.CF_GEO) return;
  var D = JSON.parse(blob.textContent), G = window.CF_GEO, FA = D.lang === 'fa', IU = D.site === 'iu';
  var NS = 'http://www.w3.org/2000/svg';

  /* ------------------------------------------------------------------ words */
  var W = {
    map: ['Map', 'نقشه'], list: ['All units', 'همهٔ نیروها'], sim: ['Simulate', 'شبیه‌سازی'],
    search: ['Search: a ship, a base, a missile…', 'جستجو: یه کشتی، یه پایگاه، یه موشک…'], nohit: ['Nothing by that name', 'چیزی با این اسم نیست'],
    layers: ['Layers', 'لایه‌ها'], sides: ['Sides', 'طرف‌ها'], all: ['All', 'همه'], none: ['None', 'هیچ‌کدوم'],
    legend: ['Key', 'راهنما'], zin: ['Zoom in', 'بزرگ‌تر'], zout: ['Zoom out', 'کوچیک‌تر'], reset: ['Whole region', 'کل منطقه'],
    full: ['Full screen', 'تمام صفحه'], exitfull: ['Leave full screen', 'خروج از تمام صفحه'], close: ['Close', 'بستن'],
    pos: ['Position', 'جا'], specs: ['Key specs', 'مشخصات اصلی'], means: ['What it means in a conflict', 'تو یه درگیری یعنی چی'],
    mem: ['In this group', 'تو این گروه'], partof: ['Part of', 'جزو'], src: ['Sources', 'منبع‌ها'], asof: ['As of', 'تا'],
    rep: ['Reported', 'گزارش‌شده'], est: ['Estimate', 'تخمین'], old: ['Not rechecked against the news within its limit: being refreshed', 'تو موعدش با خبرها مقایسه نشده: داره به‌روز می‌شه'],
    aged: ['This position was reported {n} days ago. Ships move: read it as where it was, not where it is.', 'این جا {n} روز پیش گزارش شده. کشتی‌ها جابه‌جا می‌شن: یعنی جایی که بود، نه جایی که الان هست.'],
    ring: ['Show its range on the map', 'بُردش رو روی نقشه نشون بده'], ringoff: ['Hide the range', 'بُرد رو پنهون کن'], rings: ['Clear range rings', 'پاک کردن دایره‌های بُرد'],
    from: ['from', 'از'], km: ['km', 'کیلومتر'], onmap: ['Show on the map', 'روی نقشه نشون بده'], count: ['Count', 'تعداد'],
    notplaced: ['Not a place on the map: a type of weapon or aircraft.', 'یه جا روی نقشه نیست: یه نوع سلاح یا هواپیماست.'],
    lgUS: ['United States', 'آمریکا'], lgIL: ['Israel', 'اسرائیل'], lgIR: ['Islamic Republic', 'جمهوری اسلامی'], lgPX: ['Its proxies', 'نیروهای نیابتیش'], lgG: ['Persian Gulf states, shipping', 'کشورهای خلیج فارس، کشتیرانی'],
    lgCl: ['A number: several units close together. Tap to zoom in.', 'عدد: چندتا نیرو نزدیک هم. بزنید تا بزرگ بشه.'],
    lgRing: ['Dashed circle: a range, measured on the globe.', 'دایرهٔ خط‌چین: بُرد، روی کرهٔ زمین اندازه گرفته شده.'],
    lgPos: ['Ships are shown where they were last publicly reported, never live. Faded: older than its recheck.', 'کشتی‌ها جایی نشون داده می‌شن که آخرین بار عمومی گزارش شدن، نه زنده. کم‌رنگ: از موعد بررسی‌ش گذشته.'],
    units: ['units', 'نیرو'], shown: ['shown', 'نشون داده شده'],
    // the simulator
    preset: ['Start from a round', 'از یه دور شروع کنید'], who: ['The Islamic Republic fires', 'جمهوری اسلامی شلیک می‌کنه'],
    salvo: ['Ballistic missiles on day 1', 'موشک بالستیک روز اول'], dr: ['Drones for each missile', 'پهپاد برای هر موشک'], days: ['Days of fighting', 'روزهای درگیری'],
    aim: ['Where it aims', 'کجا رو هدف می‌گیره'], strike: ['The US and Israel strike', 'آمریکا و اسرائیل حمله می‌کنن'],
    cv: ['Carriers in range', 'ناو هواپیمابر در دسترس'], b2: ['B-2 bombers', 'بمب‌افکن B-2'], tlam: ['Tomahawks, all days', 'تاماهاک، کل روزها'],
    ilj: ['Israel\'s air force joins', 'نیروی هوایی اسرائیل هم میاد'], targets: ['What they hit', 'چی رو می‌زنن'],
    shield: ['The shield: interceptors available', 'سپر: رهگیرهای موجود'], thIL: ['US THAAD: share sent to Israel', 'تاد آمریکا: سهمی که به اسرائیل می‌ره'],
    go: ['Run it 400 times', '۴۰۰ بار اجراش کن'], running: ['Running…', 'داره اجرا می‌شه…'], again: ['Change the round', 'دور رو عوض کنید'],
    day: ['Day', 'روز'], prev: ['Back', 'قبلی'], next: ['Next day', 'روز بعد'], play: ['Play', 'پخش'], pause: ['Pause', 'مکث'],
    sourced: ['sourced', 'منبع‌دار'], guess: ['estimate', 'تخمین'], off: ['off', 'خاموش'], on: ['on', 'روشن'], yes: ['Yes', 'آره'], no: ['No', 'نه'],
    score: ['Score for the US and Israel', 'نمره برای آمریکا و اسرائیل'], shieldHeld: ['Missiles stopped', 'موشک‌های متوقف‌شده'],
    launchCut: ['Launch power removed', 'قدرت شلیک از بین‌رفته'], left: ['Interceptors left', 'رهگیرهای باقی‌مونده'], cost: ['Interceptors fired, cost', 'هزینهٔ رهگیرهای شلیک‌شده'],
    through: ['through', 'رد شد'], stopped: ['stopped', 'متوقف شد'], fired: ['fired', 'شلیک شد'], why: ['What happened, and why', 'چی شد، و چرا'],
    range: ['in 8 of 10 runs between', 'تو ۸ تا از ۱۰ اجرا بین'], and: ['and', 'و'], share: ['Share this round', 'این دور رو بفرستید'], copied: ['Link copied', 'لینک کپی شد'],
    hz: ['Hormuz', 'هرمز'], pk: ['Kill chance per shot, in the simulator', 'شانس زدن با هر شلیک، تو شبیه‌ساز']
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
  function sv(tag, at, parent) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Counts only, never who: Liberty Politics through its own counter (window.lpTrack), Iran Uncensored through its tag,
  // which already refuses the cookie for readers in Iran. Nothing typed is ever sent (a search sends that it happened).
  var sent = {};
  function track(ev, p, once) {
    if (once) { if (sent[ev]) return; sent[ev] = 1; }
    try { p = p || {}; p.tool_lang = D.lang; if (window.lpTrack) window.lpTrack(ev, p); else if (IU && typeof window.gtag === 'function') window.gtag('event', ev, p); } catch (x) { }
  }

  /* ------------------------------------------------------------------ the drawings (240 x 120). One flat style: a dark
     ground, a horizon, the thing in light ink, its side's colour as one accent. Shapes follow each type's real profile. */
  var COL = { us: '#5B95F5', il: '#4CC3E0', ir: '#F06A58', px: '#F0A04B', gulf: '#A9A69B', geo: '#E2C25B' };
  var INK = '#E9E6DC', DIM = '#8C887E';
  function sea(y) { return '<rect x="0" y="' + y + '" width="240" height="' + (120 - y) + '" fill="#0E1A26"/><path d="M0 ' + (y + 6) + 'h240M20 ' + (y + 14) + 'h60M140 ' + (y + 12) + 'h70" stroke="#1E3346" stroke-width="2"/>'; }
  function ground(y) { return '<rect x="0" y="' + y + '" width="240" height="' + (120 - y) + '" fill="#1F1D1A"/><path d="M0 ' + y + 'h240" stroke="#3A3732" stroke-width="2"/>'; }
  function sky() { return '<rect width="240" height="120" fill="#141A20"/>'; }
  function plane(body, wing, tail, a) { return '<g fill="' + INK + '">' + body + '</g><g fill="' + DIM + '">' + wing + '</g>' + (tail || '') + (a ? '<path d="' + a + '" stroke="ACC" stroke-width="3" fill="none"/>' : ''); }
  var ART = {
    carrier: function () { return sky() + sea(78) + '<path d="M18 70h198l-10 12H34z" fill="' + INK + '"/><path d="M30 66h176l6 4H22z" fill="' + DIM + '"/><path d="M150 50h14v16h-14z" fill="' + INK + '"/><path d="M154 40h6v10h-6z" fill="' + DIM + '"/><path d="M60 60l14-3 14 3-14 2z M100 61l12-3 12 3-12 2z M180 61l10-2 10 2-10 2z" fill="' + DIM + '"/><path d="M34 82h172" stroke="ACC" stroke-width="3"/>'; },
    cruiser: function () { return sky() + sea(78) + '<path d="M20 72h196l-12 10H36z" fill="' + INK + '"/><path d="M70 72v-12h22v-8h16v-10h10v10h12v8h22v12z" fill="' + INK + '"/><path d="M108 42v-12M114 30h-12" stroke="' + DIM + '" stroke-width="2"/><rect x="40" y="66" width="18" height="6" fill="' + DIM + '"/><rect x="170" y="66" width="18" height="6" fill="' + DIM + '"/><path d="M36 82h168" stroke="ACC" stroke-width="3"/>'; },
    destroyer: function () { return sky() + sea(78) + '<path d="M22 72h194l-14 10H38z" fill="' + INK + '"/><path d="M80 72v-12h18v-10h22v10h20v12z" fill="' + INK + '"/><path d="M110 50v-16M104 38h12" stroke="' + DIM + '" stroke-width="2"/><rect x="44" y="66" width="20" height="6" fill="' + DIM + '"/><rect x="160" y="66" width="22" height="6" fill="' + DIM + '"/><path d="M38 82h164" stroke="ACC" stroke-width="3"/>'; },
    frigate: function () { return sky() + sea(78) + '<path d="M40 72h160l-12 10H54z" fill="' + INK + '"/><path d="M90 72v-10h14v-10h18v10h16v10z" fill="' + INK + '"/><path d="M114 52v-14" stroke="' + DIM + '" stroke-width="2"/><path d="M54 82h134" stroke="ACC" stroke-width="3"/>'; },
    amphib: function () { return sky() + sea(78) + '<path d="M16 68h204l-6 14H28z" fill="' + INK + '"/><path d="M150 68V48h18v20z" fill="' + INK + '"/><path d="M40 62l10-4 10 4M80 62l10-4 10 4" stroke="' + DIM + '" stroke-width="3" fill="none"/><circle cx="118" cy="58" r="5" fill="' + DIM + '"/><path d="M106 58h24" stroke="' + DIM + '" stroke-width="2"/><path d="M28 82h186" stroke="ACC" stroke-width="3"/>'; },
    submarine: function () { return sky() + sea(52) + '<path d="M30 80c0-8 10-12 24-12h130c14 0 26 5 26 12s-12 12-26 12H54c-14 0-24-4-24-12z" fill="' + INK + '"/><path d="M96 68l6-18h24l4 18z" fill="' + INK + '"/><path d="M210 80l14-8v16z" fill="' + DIM + '"/><path d="M54 92h130" stroke="ACC" stroke-width="3"/>'; },
    kilo: function () { return ART.submarine(); },
    fastboat: function () { return sky() + sea(80) + '<path d="M60 74h120l-20 10H72z" fill="' + INK + '"/><path d="M110 74v-10h22l6 10z" fill="' + DIM + '"/><path d="M90 74v-6h10" stroke="' + DIM + '" stroke-width="3"/><path d="M40 86c20-4 40-4 60 0" stroke="#355" stroke-width="2" fill="none"/><path d="M72 84h88" stroke="ACC" stroke-width="3"/>'; },
    minelayer: function () { return sky() + sea(50) + '<circle cx="120" cy="86" r="18" fill="' + INK + '"/><path d="M120 62v-6M120 110v6M96 86h-6M144 86h6M103 69l-4-4M137 69l4-4M103 103l-4 4M137 103l4 4" stroke="' + INK + '" stroke-width="4"/><path d="M120 104v16" stroke="' + DIM + '" stroke-width="2"/><circle cx="120" cy="86" r="18" fill="none" stroke="ACC" stroke-width="3"/>'; },
    fighter: function () { return sky() + plane('<path d="M30 62l150-6c14 0 26 3 30 6-4 3-16 6-30 6z"/>', '<path d="M92 60l-30-30h14l46 30zM92 64l-30 30h14l46-30zM176 58l18-16h8l-10 18zM176 66l18 16h8l-10-18z"/>', '', 'M60 62h80'); },
    stealth: function () { return sky() + plane('<path d="M24 62l120-10 70 10-70 10z"/>', '<path d="M86 56l-24-28h22l54 26zM86 68l-24 28h22l54-26zM170 56l26-14h8l-14 16zM170 68l26 14h8l-14-16z"/>', '', 'M54 62h90'); },
    bomber: function () { return sky() + plane('<path d="M20 62l170-7c14 0 26 3 30 7-4 4-16 7-30 7z"/>', '<path d="M100 58l-60-36h16l76 34zM100 66l-60 36h16l76-34zM186 56l16-18h8l-8 20zM186 68l16 18h8l-8-20z"/>', '<g fill="' + DIM + '"><rect x="70" y="40" width="16" height="5"/><rect x="70" y="79" width="16" height="5"/></g>', 'M60 62h110'); },
    stealthbomber: function () { return sky() + '<path d="M120 38l100 40-20 6-16-8-16 8-16-8-16 8-16-8-16 8-16-8-16 8-16-8-16 8-20-6z" fill="' + INK + '"/><path d="M70 66l50-20 50 20" stroke="ACC" stroke-width="3" fill="none"/>'; },
    tanker: function () { return sky() + plane('<path d="M24 60l172-5c14 0 24 3 26 6-2 3-12 6-26 6z"/>', '<path d="M104 58l-36-30h14l50 28zM104 64l-36 30h14l50-28zM190 56l14-16h8l-6 18z"/>', '<path d="M40 64l-26 22" stroke="' + DIM + '" stroke-width="3"/>', 'M60 61h120'); },
    awacs: function () { return ART.tanker() + '<ellipse cx="130" cy="44" rx="30" ry="6" fill="' + INK + '"/><path d="M130 50v8" stroke="' + DIM + '" stroke-width="3"/>'; },
    drone: function () { return sky() + plane('<path d="M50 62l120-4c12 0 20 2 22 4-2 2-10 4-22 4z"/>', '<path d="M110 60l-24-36h10l34 34zM110 64l-24 36h10l34-34zM44 60l-12-12h8l10 12zM44 64l-12 12h8l10-12z"/>', '<circle cx="182" cy="66" r="4" fill="' + DIM + '"/>', 'M70 62h70'); },
    owa: function () { return sky() + '<path d="M60 62l100-36v72z" fill="' + INK + '"/><path d="M150 60h40v4h-40z" fill="' + DIM + '"/><circle cx="196" cy="62" r="6" fill="' + DIM + '"/><path d="M84 62l60-22" stroke="ACC" stroke-width="3"/>'; },
    helo: function () { return sky() + '<path d="M70 66c0-10 14-16 34-16h20c16 0 24 8 24 16s-8 14-24 14h-20c-20 0-34-4-34-14z" fill="' + INK + '"/><path d="M148 64h56l8-10" stroke="' + INK + '" stroke-width="5" fill="none"/><path d="M40 44h150M114 44v8" stroke="' + DIM + '" stroke-width="4"/><path d="M84 82h50" stroke="ACC" stroke-width="3"/>'; },
    bm: function () { return sky() + '<path d="M30 60c0-7 6-10 14-10h140l26 10-26 10H44c-8 0-14-3-14-10z" fill="' + INK + '"/><path d="M40 50l-14-10h14zM40 70l-14 10h14z" fill="' + DIM + '"/><path d="M14 60h12" stroke="#E2C25B" stroke-width="5"/><path d="M110 50v20" stroke="ACC" stroke-width="3"/>'; },
    cm: function () { return sky() + '<path d="M40 60c0-5 4-7 10-7h140l20 7-20 7H50c-6 0-10-2-10-7z" fill="' + INK + '"/><path d="M110 54l-16-20h8l18 20zM110 66l-16 20h8l18-20zM48 54l-10-10h6l10 10z" fill="' + DIM + '"/><path d="M140 53v14" stroke="ACC" stroke-width="3"/>'; },
    tel: function () { return sky() + ground(88) + '<rect x="40" y="70" width="150" height="14" fill="' + INK + '"/><path d="M190 70h26l6 14h-32z" fill="' + INK + '"/><g fill="' + DIM + '"><circle cx="60" cy="88" r="7"/><circle cx="84" cy="88" r="7"/><circle cx="150" cy="88" r="7"/><circle cx="174" cy="88" r="7"/><circle cx="206" cy="88" r="7"/></g><path d="M50 68l120-34 6 6L56 72z" fill="' + INK + '"/><path d="M60 66l100-28" stroke="ACC" stroke-width="3"/>'; },
    tunnel: function () { return sky() + '<path d="M0 54l50-22 40 12 50-26 50 18 50-6v90H0z" fill="#2B2823"/><path d="M78 120V92c0-18 14-30 30-30s30 12 30 30v28z" fill="#0A0A0A"/><path d="M78 92c0-18 14-30 30-30s30 12 30 30" stroke="ACC" stroke-width="4" fill="none"/><path d="M96 120l6-26h12l6 26" stroke="' + DIM + '" stroke-width="2" fill="none"/>'; },
    patriot: function () { return sky() + ground(90) + '<rect x="36" y="78" width="130" height="10" fill="' + INK + '"/><g fill="' + DIM + '"><circle cx="56" cy="92" r="6"/><circle cx="140" cy="92" r="6"/></g><path d="M60 78l90-40 10 14-90 34z" fill="' + INK + '"/><g stroke="#141A20" stroke-width="2"><path d="M84 66l52-24M88 74l52-24"/></g><path d="M176 88V58h28v30z" fill="' + DIM + '"/><path d="M180 58l10-12 10 12" stroke="ACC" stroke-width="3" fill="none"/>'; },
    thaad: function () { return sky() + ground(90) + '<rect x="30" y="76" width="150" height="12" fill="' + INK + '"/><path d="M180 76h22l8 12h-30z" fill="' + INK + '"/><g fill="' + DIM + '"><circle cx="50" cy="92" r="6"/><circle cx="70" cy="92" r="6"/><circle cx="150" cy="92" r="6"/><circle cx="190" cy="92" r="6"/></g><path d="M44 74l110-44 8 12L52 84z" fill="' + INK + '"/><g fill="#141A20"><circle cx="76" cy="68" r="3"/><circle cx="92" cy="62" r="3"/><circle cx="108" cy="55" r="3"/><circle cx="124" cy="49" r="3"/></g><path d="M58 78l100-40" stroke="ACC" stroke-width="3"/>'; },
    shipsam: function () { return ART.destroyer() + '<path d="M58 66c10-30 30-50 60-58" stroke="#E2C25B" stroke-width="3" fill="none" stroke-dasharray="4 4"/>'; },
    irondome: function () { return sky() + ground(92) + '<rect x="70" y="84" width="100" height="8" fill="' + INK + '"/><path d="M80 84l60-44 14 10-60 42z" fill="' + INK + '"/><g fill="#141A20"><rect x="98" y="66" width="8" height="8"/><rect x="110" y="58" width="8" height="8"/><rect x="122" y="50" width="8" height="8"/></g><path d="M150 34c10-14 30-20 50-18" stroke="ACC" stroke-width="3" fill="none" stroke-dasharray="4 4"/>'; },
    sling: function () { return ART.patriot(); },
    arrow: function () { return sky() + ground(92) + '<rect x="40" y="82" width="140" height="10" fill="' + INK + '"/><path d="M60 80l100-56 10 12L70 90z" fill="' + INK + '"/><path d="M70 80l90-50" stroke="ACC" stroke-width="3"/><path d="M186 92V60h24v32z" fill="' + DIM + '"/><circle cx="198" cy="54" r="8" fill="none" stroke="' + DIM + '" stroke-width="3"/>'; },
    ironbeam: function () { return sky() + ground(92) + '<rect x="80" y="70" width="70" height="22" fill="' + INK + '"/><circle cx="130" cy="62" r="12" fill="' + DIM + '"/><path d="M138 54L220 14" stroke="ACC" stroke-width="3"/>'; },
    sam: function () { return sky() + ground(90) + '<rect x="40" y="76" width="120" height="12" fill="' + INK + '"/><g fill="' + DIM + '"><circle cx="58" cy="92" r="6"/><circle cx="80" cy="92" r="6"/><circle cx="138" cy="92" r="6"/></g><path d="M70 76V28h18v48zM96 76V28h18v48z" fill="' + INK + '"/><path d="M176 88l14-40 14 40" stroke="' + DIM + '" stroke-width="4" fill="none"/><path d="M168 46h44" stroke="ACC" stroke-width="3"/>'; },
    airbase: function () { return sky() + ground(60) + '<path d="M20 98L170 64l20 6L44 108z" fill="#3A3732"/><path d="M60 92l20-4M100 83l20-4M140 74l20-4" stroke="' + INK + '" stroke-width="3"/><path d="M190 60V40h20v20z" fill="' + INK + '"/><path d="M186 40h28" stroke="ACC" stroke-width="3"/><path d="M110 44l30-6c4 0 8 1 9 2-1 1-5 2-9 2zM124 40l-8-8h4l10 8z" fill="' + INK + '"/>'; },
    navalbase: function () { return sky() + sea(80) + '<path d="M0 80h240v-14H140v-10H0z" fill="#2B2823"/><path d="M30 56V36h14v20zM56 56V44h30v12z" fill="' + DIM + '"/><path d="M150 78h70l-6 8h-58z" fill="' + INK + '"/><path d="M178 78v-8h12v8z" fill="' + INK + '"/><path d="M40 36l20-12" stroke="ACC" stroke-width="3"/>'; },
    armybase: function () { return sky() + ground(80) + '<g fill="' + INK + '"><rect x="40" y="62" width="40" height="18"/><rect x="90" y="56" width="50" height="24"/><rect x="150" y="66" width="40" height="14"/></g><path d="M200 80V40" stroke="' + DIM + '" stroke-width="2"/><path d="M200 40h22v12h-22" fill="ACC"/>'; },
    militia: function () { return sky() + ground(90) + '<path d="M70 90V24" stroke="' + INK + '" stroke-width="4"/><path d="M72 26h80l-12 16 12 16H72z" fill="ACC"/><path d="M130 90l20-30 20 30z" fill="' + INK + '"/><path d="M180 90l12-18 12 18z" fill="' + DIM + '"/>'; },
    strait: function () { return '<rect width="240" height="120" fill="#0E1A26"/><path d="M0 0h240v36c-40 10-70 2-100 14S60 56 0 44z" fill="#2B2823"/><path d="M0 120h240V92c-30-10-80 6-110-8S40 84 0 96z" fill="#2B2823"/><path d="M10 74c60-10 120-12 220-10" stroke="ACC" stroke-width="3" stroke-dasharray="8 6" fill="none"/><path d="M150 66l14 0-4-4M150 66l10 4" stroke="' + INK + '" stroke-width="2" fill="none"/>'; },
    reactor: function () { return sky() + ground(90) + '<path d="M60 90c0-20 6-40 10-60h40c4 20 10 40 10 60z" fill="' + INK + '"/><path d="M140 90V56c0-16 40-16 40 0v34z" fill="' + DIM + '"/><path d="M76 20c10-10 20-10 30 0" stroke="' + DIM + '" stroke-width="3" fill="none"/><circle cx="160" cy="70" r="7" fill="none" stroke="ACC" stroke-width="3"/>'; },
    enrich: function () { return sky() + '<path d="M0 60l60-30 50 18 60-30 70 26v76H0z" fill="#2B2823"/><path d="M40 120v-24h160v24" fill="#0A0A0A"/><g fill="' + INK + '"><rect x="56" y="100" width="8" height="20"/><rect x="72" y="100" width="8" height="20"/><rect x="88" y="100" width="8" height="20"/><rect x="104" y="100" width="8" height="20"/><rect x="120" y="100" width="8" height="20"/><rect x="136" y="100" width="8" height="20"/><rect x="152" y="100" width="8" height="20"/><rect x="168" y="100" width="8" height="20"/></g><path d="M40 96h160" stroke="ACC" stroke-width="3"/>'; },
    refinery: function () { return sky() + ground(90) + '<g fill="' + INK + '"><rect x="40" y="40" width="10" height="50"/><rect x="60" y="54" width="10" height="36"/><rect x="100" y="66" width="40" height="24" rx="4"/><rect x="150" y="62" width="44" height="28" rx="4"/></g><path d="M45 40v-14" stroke="#E2C25B" stroke-width="4"/><path d="M80 70h20M140 76h10" stroke="' + DIM + '" stroke-width="3"/><path d="M100 66h40" stroke="ACC" stroke-width="3"/>'; },
    terminal: function () { return sky() + sea(80) + '<path d="M0 80h90V60H0z" fill="#2B2823"/><path d="M90 76h80" stroke="' + DIM + '" stroke-width="4"/><path d="M150 82h80l-8 10h-64z" fill="' + INK + '"/><g fill="' + INK + '"><rect x="14" y="44" width="26" height="16" rx="3"/><rect x="48" y="40" width="30" height="20" rx="3"/></g><path d="M158 82h64" stroke="ACC" stroke-width="3"/>'; },
    gasfield: function () { return sky() + sea(84) + '<path d="M90 84V50h60v34" stroke="' + INK + '" stroke-width="4" fill="none"/><rect x="84" y="40" width="72" height="12" fill="' + INK + '"/><path d="M150 40l20-24" stroke="' + DIM + '" stroke-width="3"/><path d="M172 14c4-6 8-6 6 2-2 6-8 4-6-2z" fill="#E2C25B"/><path d="M84 52h72" stroke="ACC" stroke-width="3"/>'; },
    hq: function () { return sky() + ground(92) + '<path d="M50 92V50l70-22 70 22v42z" fill="' + INK + '"/><g fill="#141A20"><rect x="70" y="60" width="14" height="14"/><rect x="113" y="60" width="14" height="14"/><rect x="156" y="60" width="14" height="14"/></g><path d="M120 28v-14" stroke="' + DIM + '" stroke-width="2"/><path d="M50 50l70-22 70 22" stroke="ACC" stroke-width="3" fill="none"/>'; }
  };
  function art(u) {
    var f = ART[u.a] || ART.hq, c = COL[u.s] || COL.geo;
    return '<svg viewBox="0 0 240 120" role="img" aria-label="' + esc(u.n) + '" preserveAspectRatio="xMidYMid slice">' + f().replace(/ACC/g, c) + '</svg>';
  }

  // The marker glyphs (24 x 24), one per family of drawings.
  var GLY = {
    ship: '<path d="M3 14h18l-3 4H6zM9 14V9h6v5M12 9V5"/>', sub: '<path d="M3 14c0-2 3-3 6-3h8c3 0 4 1 4 3s-1 3-4 3H9c-3 0-6-1-6-3zM10 11l1-4h4l1 4"/>',
    plane: '<path d="M12 3l2 7 7 3v2l-7-1-1 5 2 2v1l-3-1-3 1v-1l2-2-1-5-7 1v-2l7-3z"/>', drone: '<path d="M4 12h16M12 5v14M7 9l-3-3M17 9l3-3"/>',
    missile: '<path d="M5 19L17 7l2-2v4l-2 2L5 19zM5 19l2-5M5 19l5-2"/>', launcher: '<path d="M3 17h14v-3H3zM5 14l10-8 2 2-10 8M18 17h3v-2l-2-1"/>',
    tunnel: '<path d="M3 19V12a9 9 0 0118 0v7M8 19v-5a4 4 0 018 0v5"/>', shield: '<path d="M12 3l8 3v5c0 5-3 8-8 10-5-2-8-5-8-10V6z"/>',
    sam: '<path d="M6 18V8h3v10M11 18V8h3v10M4 18h16"/>', base: '<path d="M3 18L18 8l3 1L6 20zM15 6h4v3"/>', anchor: '<path d="M12 4v15M7 9h10M5 14c1 4 4 5 7 5s6-1 7-5"/>',
    atom: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="4"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-60 12 12)"/>',
    oil: '<path d="M12 3c3 5 6 8 6 11a6 6 0 01-12 0c0-3 3-6 6-11z"/>', strait: '<path d="M3 9c3-2 6 2 9 0s6-2 9 0M3 15c3-2 6 2 9 0s6-2 9 0"/>',
    flag: '<path d="M6 21V4M6 4h12l-3 4 3 4H6"/>', boat: '<path d="M4 14h16l-3 4H7zM10 14l2-5h3l2 5"/>', mine: '<circle cx="12" cy="12" r="5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>', hq: '<path d="M12 4l2.5 5 5.5.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.5-.8z"/>'
  };
  var FAM = { carrier: 'ship', cruiser: 'ship', destroyer: 'ship', frigate: 'ship', amphib: 'ship', shipsam: 'shield', submarine: 'sub', kilo: 'sub', fastboat: 'boat', minelayer: 'mine',
    fighter: 'plane', stealth: 'plane', bomber: 'plane', stealthbomber: 'plane', tanker: 'plane', awacs: 'plane', helo: 'plane', drone: 'drone', owa: 'drone',
    bm: 'missile', cm: 'missile', tel: 'launcher', tunnel: 'tunnel', patriot: 'shield', thaad: 'shield', irondome: 'shield', sling: 'shield', arrow: 'shield', ironbeam: 'shield',
    sam: 'sam', airbase: 'base', navalbase: 'anchor', armybase: 'flag', militia: 'flag', strait: 'strait', reactor: 'atom', enrich: 'atom', refinery: 'oil', terminal: 'oil', gasfield: 'oil', hq: 'hq' };
  function glyph(a) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (GLY[FAM[a] || 'hq']) + '</svg>'; }

  /* ------------------------------------------------------------------ the data */
  var U = D.units, BY = {};
  U.forEach(function (u) { BY[u.id] = u; });
  var PARENT = {};
  U.forEach(function (u) { (u.mem || []).forEach(function (m) { (PARENT[m] = PARENT[m] || []).push(u.id); }); });
  var CATN = {}; D.cats.forEach(function (c) { CATN[c.id] = c.n; });
  var PRI = ['csg', 'amphib', 'base', 'missilecity', 'nuclear', 'choke', 'oil', 'proxy', 'navy', 'airdef', 'launcher', 'ship', 'sub', 'defence', 'aircraft', 'missile'];
  function pri(u) { var i = PRI.indexOf(u.c); return (i < 0 ? 99 : i) * 1000 + (u.cnt ? 0 : 1); }
  var placed = U.filter(function (u) { return u.xy; }).sort(function (a, b) { return pri(a) - pri(b); });

  /* ------------------------------------------------------------------ state */
  var S = app.__cf = { cats: {}, sides: { us: 1, il: 1, ir: 1, px: 1, gulf: 1, geo: 1 }, tab: 'map', sel: null, k: 1, x: 0, y: 0, k0: 1, rings: [], q: '' };
  D.cats.forEach(function (c) { S.cats[c.id] = 1; });
  try { var h0 = /[#&]u=([\w-]+)/.exec(location.hash); if (h0 && BY[h0[1]]) S.sel = h0[1]; } catch (x) { }

  /* ------------------------------------------------------------------ the frame */
  app.innerHTML = '';
  var bar = h('div', 'cf-bar');
  bar.innerHTML = '<div class="cf-tabs" role="tablist">' + ['map', 'list', 'sim'].map(function (t) { return '<button type="button" role="tab" data-tab="' + t + '" aria-selected="' + (t === 'map') + '"><span class="cf-em" aria-hidden="true">' + (t === 'map' ? '🗺️ ' : t === 'list' ? '📋 ' : '🎲 ') + '</span>' + w(t) + '</button>'; }).join('') + '</div>' +
    '<div class="cf-search"><input type="search" enterkeyhint="search" autocomplete="off" aria-label="' + esc(w('search')) + '" placeholder="' + esc(w('search')) + '"><div class="cf-hits" hidden></div></div>';
  app.appendChild(bar);
  var board = h('div', 'cf-board'); app.appendChild(board);
  var left = h('div', 'cf-left'), side = h('div', 'cf-side');
  board.appendChild(left); board.appendChild(side);
  var mapEl = h('div', 'cf-map'); left.appendChild(mapEl);
  var svg = sv('svg', { 'class': 'cf-svg', 'aria-hidden': 'true' }, mapEl);
  var world = sv('g', { 'class': 'cf-world' }, svg);
  sv('rect', { x: -4000, y: -4000, width: 9000, height: 9000, 'class': 'cf-sea' }, world);
  var land = sv('g', { 'class': 'cf-land' }, world);
  G.c.forEach(function (d, i) { sv('path', { d: d, 'class': i === G.ir ? 'cf-iran' : i === G.il ? 'cf-isr' : '' }, land); });
  var gRings = sv('g', { 'class': 'cf-rings' }, world), gFly = sv('g', { 'class': 'cf-flys' }, world);
  var pins = h('div', 'cf-pins'); mapEl.appendChild(pins);
  // focus on a marker outside the frame would scroll the map box itself (overflow hidden still scrolls): never let it
  [mapEl, pins].forEach(function (b) { b.addEventListener('scroll', function () { if (b.scrollLeft || b.scrollTop) { b.scrollLeft = 0; b.scrollTop = 0; } }); });
  var ctl = h('div', 'cf-zoom');
  ctl.innerHTML = '<button type="button" data-act="zin" aria-label="' + esc(w('zin')) + '" title="' + esc(w('zin')) + '">+</button><button type="button" data-act="zout" aria-label="' + esc(w('zout')) + '" title="' + esc(w('zout')) + '">−</button>' +
    '<button type="button" data-act="reset" aria-label="' + esc(w('reset')) + '" title="' + esc(w('reset')) + '">⤢</button><button type="button" data-act="full" aria-label="' + esc(w('full')) + '" title="' + esc(w('full')) + '">⛶</button>';
  mapEl.appendChild(ctl);
  var ringClear = h('button', 'cf-ringclear'); ringClear.type = 'button'; ringClear.setAttribute('data-act', 'rings'); ringClear.hidden = true; ringClear.textContent = '◌ ' + w('rings'); mapEl.appendChild(ringClear);
  var simBar = h('div', 'cf-simbar'); simBar.hidden = true; left.appendChild(simBar);
  var below = h('div', 'cf-under');
  var card = h('div', 'cf-cardwrap'); card.hidden = true; app.appendChild(card);

  // seas and lands as names under the markers (HTML, so they stay one size)
  var names = [];
  D.seas.forEach(function (s) { var e = h('span', 'cf-nm cf-nm-sea', esc(s.n)); pins.appendChild(e); names.push({ e: e, xy: s.xy, z: s.z }); });
  D.lands.forEach(function (s) { var e = h('span', 'cf-nm cf-nm-land', esc(s.n)); pins.appendChild(e); names.push({ e: e, xy: s.xy, z: s.z }); });

  // one marker and one name per placed unit, made once
  placed.forEach(function (u) {
    var b = h('button', 'cf-mk s-' + u.s + (u.old ? ' cf-old' : '')); b.type = 'button'; b.dataset.id = u.id;
    b.setAttribute('aria-label', u.n);
    b.innerHTML = '<span class="cf-dot">' + glyph(u.a) + '</span>';
    pins.appendChild(b); u.el = b;
    var l = h('span', 'cf-lb', esc(u.n.replace(/ \(.*?\)/g, '').replace(/ carrier strike group$/, ''))); l.hidden = true; pins.appendChild(l); u.lb = l;
  });
  var clusters = [];

  /* ------------------------------------------------------------------ the camera */
  var MW = 0, MH = 0;
  function size() {
    MW = mapEl.clientWidth || MW; MH = mapEl.clientHeight || MH;
    S.k0 = Math.max(MW / G.w, MH / G.h);
  }
  function home() {      // fill the map with the region, centred on the Persian Gulf, never an empty edge
    size(); S.k = Math.max(MW / G.w, MH / G.h) * (MW < 600 ? 1.1 : 1);
    var c = proj([29.5, MW < 600 ? 50 : 46]); S.x = MW / 2 - c[0] * S.k; S.y = MH / 2 - c[1] * S.k; clamp();
  }
  function clamp() {
    var kmin = Math.max(MW / G.w, MH / G.h);
    S.k = Math.max(kmin, Math.min(kmin * 14, S.k));
    S.x = Math.min(0, Math.max(MW - G.w * S.k, S.x)); S.y = Math.min(0, Math.max(MH - G.h * S.k, S.y));
  }
  function sx(p) { return p[0] * S.k + S.x; }
  function sy(p) { return p[1] * S.k + S.y; }
  var raf = 0, lastK = 0, lastLay = 0;
  function draw(full) {
    world.setAttribute('transform', 'translate(' + S.x.toFixed(1) + ',' + S.y.toFixed(1) + ') scale(' + S.k.toFixed(4) + ')');
    $$('.cf-kr', gFly).concat($$('.cf-kr', gRings)).forEach(function (c) { c.setAttribute('r', (+c.dataset.r / S.k).toFixed(2)); });
    if (full || Math.abs(S.k - lastK) > 1e-6 || Date.now() - lastLay > 150) { lastK = S.k; layout(); } else move();
  }
  function soon(full) { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; draw(full); }); }

  /* ------------------------------------------------------------------ markers, clusters and names: placed so none touches */
  function vis(u) {
    if (!S.cats[u.c] || !S.sides[u.s]) return false;
    if (S.tab === 'sim' && S.simOn) return ['base', 'missilecity', 'nuclear', 'csg', 'choke', 'oil'].indexOf(u.c) >= 0;
    return true;
  }
  var MK = 30, R2 = 30 * 30;      // a marker is 30 px across; two closer than 30 px join one cluster
  function layout() {
    lastLay = Date.now();
    if (mapEl.clientWidth && (mapEl.clientWidth !== MW || mapEl.clientHeight !== MH)) { size(); clamp(); world.setAttribute('transform', 'translate(' + S.x.toFixed(1) + ',' + S.y.toFixed(1) + ') scale(' + S.k.toFixed(4) + ')'); }
    clusters.forEach(function (c) { c.e.remove(); }); clusters = [];
    var anchors = [];
    placed.forEach(function (u) {
      u.cl = null;
      if (!vis(u)) { u.el.hidden = true; u.lb.hidden = true; return; }
      var x = sx(u.xy), y = sy(u.xy), a = null;
      if (x < -16 || y < -16 || x > MW + 16 || y > MH + 16) { u.el.hidden = true; u.lb.hidden = true; return; }      // outside the frame: not drawn, not focusable
      for (var i = 0; i < anchors.length; i++) { var dx = anchors[i].x - x, dy = anchors[i].y - y; if (dx * dx + dy * dy < R2) { a = anchors[i]; break; } }
      if (a) { a.m.push(u); u.cl = a; } else anchors.push({ x: x, y: y, m: [u], u: u });
    });
    var boxes = [];
    anchors.forEach(function (a) {
      if (a.m.length === 1) { a.u.el.hidden = false; a.u.el.classList.toggle('cf-sel', S.sel === a.u.id); boxes.push(box(a.x, a.y, 15)); return; }
      a.m.forEach(function (u) { u.el.hidden = true; u.lb.hidden = true; });
      var c = h('button', 'cf-mk cf-cl'); c.type = 'button'; c.dataset.cl = a.m.length;
      var sides = {}; a.m.forEach(function (u) { sides[u.s] = 1; });
      c.innerHTML = '<span class="cf-dot">' + fd(a.m.length) + '</span>' + '<span class="cf-clr">' + Object.keys(sides).map(function (s) { return '<i class="s-' + s + '"></i>'; }).join('') + '</span>';
      c.setAttribute('aria-label', fd(a.m.length) + ' ' + w('units') + ': ' + a.m.slice(0, 4).map(function (u) { return u.n; }).join(', '));
      c.onclick = function () { zoomTo(a.m); };
      pins.appendChild(c); clusters.push({ e: c, a: a }); boxes.push(box(a.x, a.y, 15));
    });
    // names: the strongest first, right of the marker, else left, below, above; never over a marker or another name
    var shownN = 0, maxN = MW < 600 ? 14 : 34;
    LF = placed.length ? parseFloat(getComputedStyle(placed[0].lb).fontSize) || 13 : 13; LH = Math.max(16, Math.ceil(LF * 1.34));      // the stream view sets bigger names
    anchors.forEach(function (a) {
      var u = a.u;
      if (a.m.length > 1 || shownN >= maxN) { u.lb.hidden = true; return; }
      if (u.lbF !== LF) { u.lbF = LF; u.lbW = 0; }
      var tw = u.lbW || (u.lbW = textW(u.lb.textContent, 0, LF)), th = LH, x = a.x, y = a.y, ok = null;
      var tries = FA ? [[-19 - tw, -th / 2], [19, -th / 2], [-tw / 2, 17], [-tw / 2, -17 - th]] : [[19, -th / 2], [-19 - tw, -th / 2], [-tw / 2, 17], [-tw / 2, -17 - th]];
      for (var i = 0; i < tries.length && !ok; i++) {
        var b = [x + tries[i][0], y + tries[i][1], x + tries[i][0] + tw, y + tries[i][1] + th];
        if (b[0] < 4 || b[2] > MW - 4 || b[1] < 4 || b[3] > MH - 4) continue;
        if (!boxes.some(function (o) { return hit(o, b); })) ok = b;
      }
      if (!ok) { u.lb.hidden = true; return; }
      boxes.push(ok); shownN++;
      u.lb.hidden = false; u.lbOff = [ok[0] - x, ok[1] - y];
    });
    var z = S.k / S.k0;
    names.forEach(function (n) {
      if (z < n.z * 0.9 && !(n.z === 1)) { n.e.hidden = true; return; }
      if (n.f !== LF) { n.f = LF; n.w = 0; }
      var tw = n.w || (n.w = textW(n.e.textContent, LF <= 13, LF)), x = sx(n.xy) - tw / 2, y = sy(n.xy) - LH / 2, b = [x, y, x + tw, y + LH];
      n.e.hidden = b[0] < 0 || b[2] > MW || b[1] < 0 || b[3] > MH || boxes.some(function (o) { return hit(o, b); });
      if (!n.e.hidden) { boxes.push(b); n.off = [-tw / 2, -LH / 2]; }
    });
    move();
  }
  function box(x, y, r) { return [x - r, y - r, x + r, y + r]; }
  function hit(a, b) { return a[0] < b[2] + 2 && a[2] + 2 > b[0] && a[1] < b[3] + 2 && a[3] + 2 > b[1]; }
  var cv = document.createElement('canvas').getContext('2d');
  var LF = 13, LH = 16;
  function textW(t, small, px) { cv.font = (small ? '600 12px ' : '600 ' + (px || 13) + 'px ') + (FA ? 'Vazirmatn, Tahoma, sans-serif' : '"Public Sans", system-ui, sans-serif'); return Math.ceil(cv.measureText(t).width * 1.08) + 10; }
  function move() {
    placed.forEach(function (u) {
      if (u.el.hidden && u.lb.hidden) return;
      var x = sx(u.xy), y = sy(u.xy);
      u.el.style.transform = 'translate(' + (x - 22).toFixed(1) + 'px,' + (y - 22).toFixed(1) + 'px)';
      if (!u.lb.hidden) u.lb.style.transform = 'translate(' + (x + u.lbOff[0]).toFixed(1) + 'px,' + (y + u.lbOff[1]).toFixed(1) + 'px)';
    });
    clusters.forEach(function (c) { c.e.style.transform = 'translate(' + (c.a.x - 22 + (sx(c.a.u.xy) - c.a.x)).toFixed(1) + 'px,' + (c.a.y - 22 + (sy(c.a.u.xy) - c.a.y)).toFixed(1) + 'px)'; });
    names.forEach(function (n) { if (!n.e.hidden) n.e.style.transform = 'translate(' + (sx(n.xy) + n.off[0]).toFixed(1) + 'px,' + (sy(n.xy) + n.off[1]).toFixed(1) + 'px)'; });
  }
  function zoomTo(list, kmax) {
    var xs = list.map(function (u) { return u.xy[0]; }), ys = list.map(function (u) { return u.xy[1]; });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    var k = Math.min(MW / Math.max(30, (x1 - x0) * 2.2), MH / Math.max(30, (y1 - y0) * 2.2), S.k0 * (kmax || 12));
    if (k <= S.k * 1.05 && list.length > 1) k = S.k * 2.2;
    S.k = k; S.x = MW / 2 - (x0 + x1) / 2 * k; S.y = MH / 2 - (y0 + y1) / 2 * k; clamp(); draw(true);
    track('sim_map', {}, true);
  }

  /* ------------------------------------------------------------------ gestures: drag, pinch, wheel, double tap */
  var pts = {}, g0 = null, moved = 0;
  mapEl.addEventListener('pointerdown', function (ev) {
    if (ev.target.closest('.cf-zoom,.cf-ringclear')) return;
    pts[ev.pointerId] = [ev.clientX, ev.clientY]; moved = 0;
    var ids = Object.keys(pts);
    g0 = { x: S.x, y: S.y, k: S.k, p: ids.map(function (i) { return pts[i].slice(); }) };
  });
  window.addEventListener('pointermove', function (ev) {
    if (!pts[ev.pointerId] || !g0) return;
    pts[ev.pointerId] = [ev.clientX, ev.clientY];
    var ids = Object.keys(pts), r = mapEl.getBoundingClientRect();
    if (ids.length === 1 && g0.p.length === 1) {
      var dx = ev.clientX - g0.p[0][0], dy = ev.clientY - g0.p[0][1];
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = 1;
      if (!moved) return;
      S.x = g0.x + dx; S.y = g0.y + dy;
    } else if (ids.length >= 2 && g0.p.length >= 2) {
      moved = 1;
      var a = pts[ids[0]], b = pts[ids[1]], d1 = Math.hypot(a[0] - b[0], a[1] - b[1]), d0 = Math.hypot(g0.p[0][0] - g0.p[1][0], g0.p[0][1] - g0.p[1][1]) || 1;
      var cx = (g0.p[0][0] + g0.p[1][0]) / 2 - r.left, cy = (g0.p[0][1] + g0.p[1][1]) / 2 - r.top, nx = (a[0] + b[0]) / 2 - r.left, ny = (a[1] + b[1]) / 2 - r.top;
      var k = g0.k * d1 / d0; S.k = k; S.x = nx - (cx - g0.x) * k / g0.k; S.y = ny - (cy - g0.y) * k / g0.k;
    }
    clamp(); soon(false);
  });
  function up(ev) {
    if (!pts[ev.pointerId]) return;
    delete pts[ev.pointerId];
    var ids = Object.keys(pts);
    g0 = ids.length ? { x: S.x, y: S.y, k: S.k, p: ids.map(function (i) { return pts[i].slice(); }) } : null;
    if (moved) { draw(true); track('sim_map', {}, true); }
  }
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  mapEl.addEventListener('click', function (ev) { if (moved) { ev.stopPropagation(); ev.preventDefault(); moved = 0; } }, true);
  mapEl.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    var r = mapEl.getBoundingClientRect(), cx = ev.clientX - r.left, cy = ev.clientY - r.top, k = S.k * Math.exp(-ev.deltaY * 0.0018);
    k = Math.max(S.k0, Math.min(S.k0 * 14, k));
    S.x = cx - (cx - S.x) * k / S.k; S.y = cy - (cy - S.y) * k / S.k; S.k = k; clamp(); soon(true);
    track('sim_map', {}, true);
  }, { passive: false });
  mapEl.addEventListener('dblclick', function (ev) { if (ev.target.closest('button')) return; var r = mapEl.getBoundingClientRect(); zoomAt(ev.clientX - r.left, ev.clientY - r.top, 2); });
  function zoomAt(cx, cy, f) { var k = Math.max(S.k0, Math.min(S.k0 * 14, S.k * f)); S.x = cx - (cx - S.x) * k / S.k; S.y = cy - (cy - S.y) * k / S.k; S.k = k; clamp(); draw(true); track('sim_map', {}, true); }
  ctl.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var a = b.dataset.act;
    if (a === 'zin') zoomAt(MW / 2, MH / 2, 1.6); else if (a === 'zout') zoomAt(MW / 2, MH / 2, 1 / 1.6); else if (a === 'reset') { home(); draw(true); } else if (a === 'full') full();
  });
  function full() {
    var on = !app.classList.contains('cf-full');
    app.classList.toggle('cf-full', on); document.documentElement.classList.toggle('cf-noscroll', on);
    try { if (on && app.requestFullscreen && !document.fullscreenElement) app.requestFullscreen().catch(function () { }); else if (!on && document.fullscreenElement) document.exitFullscreen(); } catch (x) { }
    var b = $('[data-act=full]', ctl); b.setAttribute('aria-label', w(on ? 'exitfull' : 'full')); b.title = w(on ? 'exitfull' : 'full'); b.textContent = on ? '✕' : '⛶';
    setTimeout(function () { size(); clamp(); draw(true); }, 60);
    if (on) track('sim_full', {}, true);
  }
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && app.classList.contains('cf-full')) full(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { if (!card.hidden) closeCard(); else if (app.classList.contains('cf-full')) full(); } });
  pins.addEventListener('click', function (ev) { var b = ev.target.closest('.cf-mk[data-id]'); if (b) openCard(b.dataset.id, 'map'); });

  /* ------------------------------------------------------------------ range rings: a circle on the globe, drawn on the map */
  var R_E = 6371;
  function circle(ll, km) {
    var la = ll[0] * Math.PI / 180, lo = ll[1] * Math.PI / 180, d = km / R_E, out = [];
    for (var i = 0; i <= 120; i++) {
      var b = i / 120 * 2 * Math.PI, la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
      var lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
      out.push(proj([la2 * 180 / Math.PI, lo2 * 180 / Math.PI]));
    }
    return out;
  }
  var bb = D.bbox, mN = merc(bb[3]), kx = G.w / ((bb[2] - bb[0]) * Math.PI / 180);
  function merc(l) { return Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, l)) * Math.PI / 360)); }
  function proj(ll) { return [(ll[1] - bb[0]) * Math.PI / 180 * kx, (mN - merc(ll[0])) * kx]; }
  // a missile type has no place of its own: its range is drawn from the missile city nearest Israel that is reported to
  // hold that class, else the westernmost one (the reach that matters most to a viewer)
  function ringFrom(u) {
    if (u.ll) return [{ ll: u.ll, n: u.n }];
    if (u.c === 'missile') {
      var mc = U.filter(function (x) { return x.c === 'missilecity' && x.ll; }).sort(function (a, b) { return a.ll[1] - b.ll[1]; });
      return mc.slice(0, 1).map(function (x) { return { ll: x.ll, n: x.n }; });
    }
    if (u.s === 'il') return [{ ll: [31.21, 35.01], n: 'Nevatim' }];
    if (u.s === 'us' && u.c === 'aircraft') { var cs = U.filter(function (x) { return x.c === 'csg' && x.ll; }); if (cs.length) return [{ ll: cs[0].ll, n: cs[0].n }]; }
    return [];
  }
  function toggleRing(u) {
    var i = S.rings.indexOf(u.id);
    if (i >= 0) S.rings.splice(i, 1); else { S.rings.push(u.id); track('sim_ring', { unit: u.id }); }
    drawRings();
  }
  function drawRings() {
    gRings.innerHTML = '';
    S.rings.forEach(function (id) {
      var u = BY[id]; ringFrom(u).forEach(function (o) {
        var p = circle(o.ll, u.rk), c = COL[u.s];
        sv('path', { d: 'M' + p.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join('L') + 'Z', 'class': 'cf-ring', stroke: c }, gRings);
        var o2 = proj(o.ll); sv('circle', { cx: o2[0], cy: o2[1], r: 4 / S.k, 'data-r': 4, 'class': 'cf-kr', fill: c }, gRings);
        var top = p.reduce(function (a, q) { return q[1] < a[1] ? q : a; }, [0, 1e9]);
        var t = sv('text', { x: top[0], y: top[1], 'class': 'cf-ringt', fill: c, 'font-size': 12 / S.k, 'data-fs': 12 }, gRings); t.textContent = u.n.replace(/ \(.*?\)/, '') + ' · ' + fd(u.rk.toLocaleString('en-US')) + ' ' + w('km');
      });
    });
    ringClear.hidden = !S.rings.length;
    $$('.cf-ringt', gRings).forEach(function (t) { t.setAttribute('font-size', (12 / S.k).toFixed(2)); });
  }
  ringClear.onclick = function () { S.rings = []; drawRings(); if (S.sel) openCard(S.sel); };
  var _draw = draw; draw = function (f) { _draw(f); $$('.cf-ringt', gRings).forEach(function (t) { t.setAttribute('font-size', (12 / S.k).toFixed(2)); }); };

  /* ------------------------------------------------------------------ the card */
  function chip(id) { var u = BY[id]; return u ? '<button type="button" class="cf-chip s-' + u.s + '" data-u="' + esc(id) + '"><span class="cf-dot">' + glyph(u.a) + '</span>' + esc(u.n.replace(/ \(.*?\)/, '')) + '</button>' : ''; }
  function openCard(id, via) {
    var u = BY[id]; if (!u) return;
    S.sel = id;
    var sp = (u.sp || []).map(function (kv) { return '<dt>' + esc(kv[0]) + '</dt><dd>' + esc(fd(kv[1])) + '</dd>'; }).join('');
    if (u.sim && u.sim.pk) sp += '<dt>' + w('pk') + '</dt><dd>' + pc(u.sim.pk) + (u.sim.pkNote && !FA ? '<small class="cf-pkn">' + esc(u.sim.pkNote) + '</small>' : '') + '</dd>';
    var mem = (u.mem || []).filter(function (m) { return BY[m]; });
    var par = (PARENT[id] || []).filter(function (m) { return BY[m]; });
    var on = S.rings.indexOf(id) >= 0, canRing = u.rk && ringFrom(u).length;
    card.innerHTML = '<div class="cf-card s-' + u.s + '" data-u="' + esc(id) + '" role="dialog" aria-label="' + esc(u.n) + '">' +
      '<div class="cf-art">' + art(u) + '<button type="button" class="cf-x" data-act="close" aria-label="' + esc(w('close')) + '">✕</button></div>' +
      '<div class="cf-cb">' +
      '<div class="cf-tags"><span class="cf-pill s-' + u.s + '">' + esc(D.sides[u.s]) + '</span><span class="cf-pill">' + esc(CATN[u.c]) + '</span><span class="cf-pill ' + (u.cf === 'estimate' ? 'cf-est' : 'cf-rep') + '">' + w(u.cf === 'estimate' ? 'est' : 'rep') + '</span>' + (u.cnt != null ? '<span class="cf-pill">' + w('count') + ': ' + n0(u.cnt) + '</span>' : '') + '</div>' +
      '<h2>' + esc(u.n) + '</h2>' +
      (u.p ? '<p class="cf-pos">📍 ' + esc(u.p) + '</p>' : '<p class="cf-pos cf-np">' + w('notplaced') + '</p>') +
      (u.old ? '<p class="cf-oldn">⏳ ' + w('old') + '</p>' : '') + (u.mv && ageDays(u.as) > 7 ? '<p class="cf-oldn">⏳ ' + w('aged').replace('{n}', fd(ageDays(u.as))) + '</p>' : '') +
      '<h3>' + w('means') + '</h3><p class="cf-means">' + esc(u.m) + '</p>' +
      '<h3>' + w('specs') + '</h3><dl class="cf-specs">' + sp + '</dl>' +
      (mem.length ? '<h3>' + w('mem') + '</h3><div class="cf-mem">' + mem.map(chip).join('') + '</div>' : '') +
      (par.length ? '<h3>' + w('partof') + '</h3><div class="cf-mem">' + par.map(chip).join('') + '</div>' : '') +
      '<div class="cf-acts">' + (u.xy ? '<button type="button" class="cf-btn" data-act="show">📍 ' + w('onmap') + '</button>' : '') +
      (canRing ? '<button type="button" class="cf-btn" data-act="ring" aria-pressed="' + on + '">◌ ' + w(on ? 'ringoff' : 'ring') + '</button>' : '') + '</div>' +
      '<div class="cf-cardsrc"><b>' + w('src') + '</b> <span class="num">' + w('asof') + ' ' + esc(fd(u.as)) + '</span><ul>' + (u.src || []).map(function (s) { return '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + '</a></li>'; }).join('') + '</ul></div>' +
      '</div></div>';
    card.hidden = false; app.classList.add('cf-carded');
    placed.forEach(function (x) { x.el.classList.toggle('cf-sel', x.id === id); });
    try { history.replaceState(null, '', location.pathname + location.search + '#u=' + id); } catch (x) { }
    track('sim_card', { unit: id, kind: u.c }); track('sim_card_' + u.c, { unit: id });
    if (via === 'list' || via === 'search') { if (u.xy && S.tab === 'map' && MW >= 900) zoomTo([u], 5); }
    var f = $('[data-act=close]', card); if (f && via !== 'map') f.focus({ preventScroll: true });
  }
  function ageDays(d) { var t = Date.parse(d); return isNaN(t) ? 0 : Math.floor((Date.now() - t) / 864e5); }
  function closeCard() {
    card.hidden = true; app.classList.remove('cf-carded'); S.sel = null;
    placed.forEach(function (x) { x.el.classList.remove('cf-sel'); });
    try { history.replaceState(null, '', location.pathname + location.search); } catch (x) { }
  }
  card.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.u) return openCard(b.dataset.u, 'list');
    var a = b.dataset.act, u = BY[S.sel];
    if (a === 'close') closeCard();
    else if (a === 'ring') { toggleRing(u); openCard(u.id); }
    else if (a === 'show') { if (S.tab !== 'map') setTab('map'); zoomTo([u], 6); if (MW < 900) closeCard(); }
  });

  /* ------------------------------------------------------------------ layers, sides, key (under the map) */
  function count(c) { return U.filter(function (u) { return u.c === c; }).length; }
  function underMap() {
    below.innerHTML = '<div class="cf-sect"><b>' + w('layers') + '</b><span class="cf-ab"><button type="button" class="cf-tight" data-all="1">' + w('all') + '</button><button type="button" class="cf-tight" data-all="0">' + w('none') + '</button></span></div>' +
      '<div class="cf-layers">' + D.cats.map(function (c) {
        var any = U.filter(function (u) { return u.c === c.id; })[0]; if (!any) return '';
        return '<button type="button" data-cat="' + c.id + '" aria-pressed="' + !!S.cats[c.id] + '"><span class="cf-dot s-' + any.s + '">' + glyph(any.a) + '</span>' + esc(c.n) + ' <span class="num">' + fd(count(c.id)) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="cf-sect"><b>' + w('sides') + '</b></div><div class="cf-layers cf-sides">' + ['us', 'il', 'ir', 'px', 'gulf', 'geo'].map(function (s) {
        return U.some(function (u) { return u.s === s; }) ? '<button type="button" data-side="' + s + '" aria-pressed="' + !!S.sides[s] + '"><i class="cf-sw s-' + s + '"></i>' + esc(D.sides[s]) + '</button>' : '';
      }).join('') + '</div>' +
      '<details class="cf-key" open><summary>' + w('legend') + '</summary><ul>' +
      '<li><i class="cf-sw s-us"></i>' + w('lgUS') + ' <i class="cf-sw s-il"></i>' + w('lgIL') + ' <i class="cf-sw s-ir"></i>' + w('lgIR') + ' <i class="cf-sw s-px"></i>' + w('lgPX') + ' <i class="cf-sw s-gulf"></i>' + w('lgG') + '</li>' +
      '<li><span class="cf-dot cf-kc">3</span>' + w('lgCl') + '</li><li><svg viewBox="0 0 24 24" class="cf-kg"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/></svg>' + w('lgRing') + '</li>' +
      '<li>📍 ' + w('lgPos') + ' <span class="num">(' + esc(fd(D.readUtc)) + ')</span></li></ul></details>';
  }
  below.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.cat) { var c = b.dataset.cat; S.cats[c] = S.cats[c] ? 0 : 1; b.setAttribute('aria-pressed', !!S.cats[c]); track('sim_layer_' + c, {}); }
    else if (b.dataset.side) { var s = b.dataset.side; S.sides[s] = S.sides[s] ? 0 : 1; b.setAttribute('aria-pressed', !!S.sides[s]); track('sim_side', { side: s }); }
    else if (b.dataset.all) { var on = b.dataset.all === '1'; D.cats.forEach(function (c) { S.cats[c.id] = on ? 1 : 0; }); underMap(); }
    draw(true); if (S.tab === 'list') list();
  });

  /* ------------------------------------------------------------------ the list: every unit, the ones with no place too */
  function list() {
    var q = S.q.trim().toLowerCase(), html = '';
    D.cats.forEach(function (c) {
      var rows = U.filter(function (u) { return u.c === c.id && S.sides[u.s] && (!q || match(u, q)); });
      if (!rows.length) return;
      html += '<h3>' + esc(c.n) + ' <span class="num">' + fd(rows.length) + '</span></h3><div class="cf-grid">' + rows.map(function (u) {
        return '<button type="button" class="cf-li s-' + u.s + '" data-u="' + esc(u.id) + '" data-c="' + u.c + '"><span class="cf-lart">' + art(u) + '</span><span class="cf-ln">' + esc(u.n) + '</span><span class="cf-lm">' + esc((u.sp && u.sp[0] ? u.sp[0][1] : '')) + '</span></button>';
      }).join('') + '</div>';
    });
    side.innerHTML = '<div class="cf-list">' + (html || '<p>' + w('nohit') + '</p>') + '</div>';
  }
  function match(u, q) { return (u.n + ' ' + (u.en || '') + ' ' + (u.sp || []).map(function (x) { return x.join(' '); }).join(' ') + ' ' + CATN[u.c]).toLowerCase().indexOf(q) >= 0; }
  side.addEventListener('click', function (ev) { var b = ev.target.closest('[data-u]'); if (b && b.closest('.cf-list')) openCard(b.dataset.u, 'list'); });

  /* ------------------------------------------------------------------ search */
  var sIn = $('.cf-search input', bar), sHits = $('.cf-hits', bar), searched = 0;
  sIn.addEventListener('input', function () {
    S.q = sIn.value; var q = S.q.trim().toLowerCase();
    if (!q) { sHits.hidden = true; if (S.tab === 'list') list(); return; }
    if (!searched) { searched = 1; track('sim_search', {}); }
    var r = U.filter(function (u) { return match(u, q); }).sort(function (a, b) { return (a.n.toLowerCase().indexOf(q) < 0) - (b.n.toLowerCase().indexOf(q) < 0) || pri(a) - pri(b); }).slice(0, 8);
    sHits.innerHTML = r.length ? r.map(function (u) { return '<button type="button" data-u="' + esc(u.id) + '" class="s-' + u.s + '"><span class="cf-dot">' + glyph(u.a) + '</span><span>' + esc(u.n) + '<small>' + esc(CATN[u.c]) + '</small></span></button>'; }).join('') : '<p>' + w('nohit') + '</p>';
    sHits.hidden = false;
    if (S.tab === 'list') list();
  });
  sIn.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { var f = $('[data-u]', sHits); if (f) f.click(); } if (ev.key === 'Escape') { sIn.value = ''; sIn.dispatchEvent(new Event('input')); } });
  sHits.addEventListener('click', function (ev) { var b = ev.target.closest('[data-u]'); if (!b) return; sHits.hidden = true; openCard(b.dataset.u, 'search'); });
  document.addEventListener('click', function (ev) { if (!ev.target.closest('.cf-search')) sHits.hidden = true; });

  /* ------------------------------------------------------------------ tabs */
  function setTab(t) {
    S.tab = t; app.setAttribute('data-tab', t);
    $$('.cf-tabs [data-tab]', bar).forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === t); });
    if (t === 'list') list(); else if (t === 'sim') { if (RES) result(); else simForm(); track('sim_tab_sim', {}, true); } else { side.innerHTML = ''; side.appendChild(below); }
    simBar.hidden = !(t === 'sim' && RES);
    gFly.style.display = t === 'sim' ? '' : 'none';
    S.simOn = t === 'sim' && !!RES;
    setTimeout(function () { size(); clamp(); draw(true); }, 0);
  }
  $('.cf-tabs', bar).addEventListener('click', function (ev) { var b = ev.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });

  /* ================================================================== THE SIMULATOR
     The model, in full (How it works under the tool says the same in words):
     - Each day the Islamic Republic fires a salvo: the chosen size on day 1, then launch_rate of it, times the share of its
       launchers still working. Each missile flies at one area (Israel, the US bases, Persian Gulf oil, the ships) by the aim.
     - In each area the missile meets the shield in layer order. A share `cover` is never engaged. Otherwise each layer with
       interceptors left fires `shots` at it, each with the kill chance pk; it is stopped at the first layer that kills it.
       What no layer stops gets through. Drones are stopped at drone_kill.
     - US and Israeli strikes are aim points a day (carriers x cv_aim, Israel's sorties x il_aim, Tomahawks, the B-2s on day
       1), shared over the chosen target sets; a set's damage is 1 - exp(-points / need). Launcher damage cuts the next
       salvo (the share of launchers working, and `watch`: crews that will not risk launching under jets overhead).
     - The IRGC navy tries to close Hormuz with the chance `hormuz`; damage to the navy shortens it.
     Every uncertain number is drawn from its published range on each of 400 runs. */
  var F = D.facts, A = D.A, SC = D.sc;
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function tri(r, lo, m, hi) { var u = r(), c = (m - lo) / ((hi - lo) || 1); return u < c ? lo + Math.sqrt(u * (hi - lo) * (m - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - m)); }
  function dr(f, r) { if (!f) return 0; if (f.lo == null || f.hi == null || f.lo === f.hi) return f.v != null ? f.v : (f.lo || 0); var m = f.v != null ? f.v : (f.lo + f.hi) / 2; return tri(r, Math.min(f.lo, f.hi), Math.min(Math.max(m, Math.min(f.lo, f.hi)), Math.max(f.lo, f.hi)), Math.max(f.lo, f.hi)); }
  function val(k) { var f = F[k] || A[k]; return f ? (f.v != null ? f.v : (f.lo + f.hi) / 2) : 0; }
  function costOf(k) { var v = val(k); return v < 1000 ? v * 1e6 : v; }
  var SH = SC.shield.map(function (d) {
    var u = d.unit && BY[d.unit], pk = u && u.sim && u.sim.pk ? { v: u.sim.pk, lo: Math.max(0.3, u.sim.pk - 0.1), hi: Math.min(0.95, u.sim.pk + 0.08) } : A.pk;
    return { id: d.id, n: d.n, area: d.area, layer: d.layer, stock: d.stock, split: d.split, shots: d.shots, cost: costOf(d.cost), pk: pk, unit: d.unit, def: Math.round(val(d.stock) * (d.split ? 0.5 : 1)) };
  });
  var AREAS = ['il', 'us', 'oil', 'sea'];
  var P = null, RES = null, VIEW = 0, timer = 0;
  var DEF = { days: 3, salvo: 200, dr: 1.5, aIl: 3, aUs: 2, aOil: 1, aSea: 0, cv: 2, b2: 6, tlam: 300, il: 1, tLaunch: 1, tAd: 1, tNuke: 1, tNavy: 0, tOil: 0, thIL: 0.5 };
  function stockKey(d) { return 's_' + d.id; }
  function base(pre) {
    var p = {}; for (var k in DEF) p[k] = DEF[k];
    var src = (SC.presets.filter(function (x) { return x.id === pre; })[0] || SC.presets[0] || { p: {} }).p;
    for (k in src) p[k] = src[k];
    SH.forEach(function (d) { p[stockKey(d)] = d.split ? Math.round(val(d.stock)) : d.def; });
    p.preset = pre; return p;
  }
  try { var q0 = /[?&]s=([^&#]+)/.exec(location.search); if (q0) { P = JSON.parse(decodeURIComponent(q0[1])); } } catch (x) { P = null; }

  function run(p, seed, rec) {
    var r = rng(seed), days = [];
    var BM = dr(F.ir_bm, r), TEL0 = dr(F.ir_tel, r), cover = dr(A.cover, r), dk = dr(A.drone_kill, r), lr = dr(A.launch_rate, r), watch = val('watch');
    var need = A.need.v, dmg = { launch: 0, ad: 0, nuke: 0, navy: 0, oil: 0 }, tlamLeft = p.tlam;
    var pools = {}, start = {}, used = { n: 0, usd: 0, by: {} }, out = {};
    AREAS.forEach(function (a) { pools[a] = []; out[a] = { f: 0, s: 0, t: 0 }; });
    SH.forEach(function (d) {
      var n = +p[stockKey(d)] || 0;
      if (d.split === 'thIL') n = n * p.thIL; else if (d.split === 'thG') n = n * (1 - p.thIL);
      var o = { id: d.id, n: Math.round(n), s: d.shots, pk: dr(d.pk, r), c: d.cost, layer: d.layer, out: -1 };
      pools[d.area].push(o); start[d.id] = o.n;
    });
    pools.sea = pools.us.filter(function (o) { return o.id === 'sm6'; });      // ships defend themselves with their own SM-6
    AREAS.forEach(function (a) { pools[a].sort(function (x, y) { return x.layer - y.layer; }); });
    var aim = { il: p.aIl, us: p.aUs, oil: p.aOil, sea: p.aSea }, aimT = p.aIl + p.aUs + p.aOil + p.aSea || 1;
    var fullRef = 2 * A.cv_aim.v + F.il_sorties.v * A.il_aim.v;
    var hzTry = r() < F.hormuz.v, closure = 0, totF = 0, totS = 0, drones = 0, dStop = 0, firstSalvo = 0, lastSalvo = 0, mops = 0;
    for (var day = 1; day <= p.days; day++) {
      /* the strike */
      var ad = dmg.ad, eff = 0.6 + 0.4 * ad;
      var air = (p.cv * dr(A.cv_aim, r) + (p.il ? F.il_sorties.v * A.il_aim.v : 0)) * eff;
      var tl = Math.min(tlamLeft, Math.round(day === 1 ? p.tlam * 0.5 : p.tlam * 0.5 / Math.max(1, p.days - 1))); tlamLeft -= tl;
      var cap = air + tl, sets = [], wsum = 0;
      if (p.tLaunch) sets.push(['launch', 3]); if (p.tAd) sets.push(['ad', day === 1 ? 3 : 1]); if (p.tNuke) sets.push(['nuke', 1]); if (p.tNavy) sets.push(['navy', 1]); if (p.tOil) sets.push(['oil', 1]);
      sets.forEach(function (s) { wsum += s[1]; });
      if (!sets.length) { air = 0; tlamLeft += tl; tl = 0; cap = 0; }      // nothing chosen to hit: no strike, no Tomahawk spent
      var hits = {};
      sets.forEach(function (s) { var al = cap * s[1] / (wsum || 1); hits[s[0]] = al; dmg[s[0]] = 1 - (1 - dmg[s[0]]) * Math.exp(-al / need[s[0]]); });
      if (day === 1 && p.b2 && p.tNuke) { mops = Math.min(p.b2 * 2, 2 * F.b2_fleet.v); dmg.nuke = 1 - (1 - dmg.nuke) * Math.exp(-mops / 12); }
      /* the answer */
      var working = 1 - 0.6 * dmg.launch, sup = 1 - watch * dmg.launch;
      var m = Math.max(0, Math.round(Math.min(BM, p.salvo * (day === 1 ? 1 : lr) * working * sup)));
      BM -= m; totF += m; if (day === 1) firstSalvo = m; lastSalvo = m;
      var dd = Math.round(m * p.dr), dS = Math.round(dd * dk); drones += dd; dStop += dS;
      var dayOut = {};
      AREAS.forEach(function (a) {
        var n = Math.round(m * aim[a] / aimT), st = 0;
        for (var i = 0; i < n; i++) {
          if (r() >= cover) continue;
          var ps = pools[a];
          for (var j = 0; j < ps.length; j++) {
            var o = ps[j]; if (o.n < 1) continue;
            var sh = Math.min(o.n, o.s >= 2 ? 2 : (r() < o.s - 1 ? 2 : 1));
            o.n -= sh; used.n += sh; used.usd += sh * o.c; used.by[o.id] = (used.by[o.id] || 0) + sh;
            if (o.n < 1 && o.out < 0) o.out = day;
            var kill = 1 - Math.pow(1 - o.pk, sh);
            if (r() < kill) { st++; break; }
          }
        }
        out[a].f += n; out[a].s += st; out[a].t += n - st; totS += st;
        dayOut[a] = { f: n, s: st, t: n - st };
      });
      var hzD = hzTry ? Math.max(0, 1 - 0.9 * dmg.navy) : 0; closure += hzD;
      if (rec) days.push({ m: m, dr: dd, ds: dS, a: dayOut, hits: hits, tl: tl, air: Math.round(air), mops: day === 1 ? mops : 0, dmg: JSON.parse(JSON.stringify(dmg)), hz: hzD > 0.5,
        left: SH.map(function (d) { var o = (pools[d.area].filter(function (x) { return x.id === d.id; })[0]); return o ? o.n / Math.max(1, start[d.id]) : 1; }) });
    }
    var res = { f: totF, s: totS, stop: totF ? totS / totF : 1, out: out, used: used, rateEnd: (1 - 0.6 * dmg.launch) * (1 - watch * dmg.launch), first: firstSalvo, last: lastSalvo,
      dmg: dmg, closure: closure, hz: hzTry, drones: drones, dStop: dStop, mops: mops,
      outDay: {}, left: {} };
    SH.forEach(function (d) { var o = pools[d.area].filter(function (x) { return x.id === d.id; })[0]; res.outDay[d.id] = o ? o.out : -1; res.left[d.id] = o ? o.n / Math.max(1, start[d.id]) : 1; });
    if (rec) res.days = days;
    return res;
  }
  function q(a, f) { var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; }
  var N = 400;
  S.model = { run: run, base: base };      // for the tests (conflict.py --measure, the calibration check)
  function many(p, done) {
    var rs = [], i = 0, seed = hash(JSON.stringify(p));
    (function slice() { var t = performance.now(); while (i < N && performance.now() - t < 12) { rs.push(run(p, seed + i * 7919)); i++; } if (i < N) setTimeout(slice, 0); else done(rs, seed); })();
  }
  function hash(s) { var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function stats(rs, p, seed) {
    var st = rs.map(function (x) { return x.stop; }), re = rs.map(function (x) { return x.rateEnd; });
    var S2 = { stop: [q(st, 0.1), q(st, 0.5), q(st, 0.9)], rate: [q(re, 0.1), q(re, 0.5), q(re, 0.9)], usd: q(rs.map(function (x) { return x.used.usd; }), 0.5),
      hz: rs.filter(function (x) { return x.hz; }).length / rs.length, closure: q(rs.map(function (x) { return x.closure; }), 0.5) };
    S2.area = {}; AREAS.forEach(function (a) { S2.area[a] = { f: q(rs.map(function (x) { return x.out[a].f; }), 0.5), t: q(rs.map(function (x) { return x.out[a].t; }), 0.5) }; });
    S2.out = {}; S2.left = {};
    SH.forEach(function (d) { var od = rs.map(function (x) { return x.outDay[d.id]; }); S2.out[d.id] = { share: od.filter(function (x) { return x > 0; }).length / rs.length, day: q(od.filter(function (x) { return x > 0; }).concat([99]), 0.5) }; S2.left[d.id] = q(rs.map(function (x) { return x.left[d.id]; }), 0.5); });
    var ms = S2.stop[1], mr = S2.rate[1], best = 0, bd = 1e9;
    rs.forEach(function (x, i) { var d = Math.abs(x.stop - ms) * 4 + Math.abs(x.rateEnd - mr); if (d < bd) { bd = d; best = i; } });
    S2.typ = run(p, seed + best * 7919, true);
    S2.score = Math.round(100 * (0.6 * ms + 0.4 * (1 - mr)) - Math.min(15, (S2.area.oil.t || 0) * 1.5) - Math.min(10, S2.hz * S2.closure * 2));
    S2.score = Math.max(0, Math.min(100, S2.score));
    return S2;
  }

  /* ------------------------------------------------------------------ the form */
  function rangeRow(k, label, min, max, step, note) {
    var v = P[k];
    return '<label class="cf-rr"><span class="cf-rl">' + label + '<b class="num" data-v="' + k + '">' + fmt(k, v) + '</b></span><input type="range" data-k="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" aria-label="' + esc(label) + '">' + (note ? '<small>' + note + '</small>' : '') + '</label>';
  }
  function fmt(k, v) { return k === 'thIL' ? pc(v) : k === 'dr' ? fd((+v).toFixed(1)) : n0(v); }
  function srcNote(key) { var f = F[key], a = A[key]; if (f) return (f.est ? w('guess') : w('sourced')) + ': ' + esc(f.t) + (f.u ? ' · <a href="' + esc(f.u) + '" target="_blank" rel="noopener">' + w('src').toLowerCase() + '</a>' : ''); if (a) return w('guess') + ': ' + n0(a.v) + (a.lo != null ? ' (' + n0(a.lo) + '–' + n0(a.hi) + ')' : '') + ' · <a href="#a-' + key + '">' + (FA ? 'چرا' : 'why') + '</a>'; return ''; }
  function tog(k, label) { return '<button type="button" class="cf-tog" data-t="' + k + '" aria-pressed="' + !!P[k] + '">' + label + '</button>'; }
  function simForm() {
    if (!P) P = base('likely');
    var aims = [['aIl', SC.targets.il], ['aUs', SC.targets.us], ['aOil', SC.targets.oil], ['aSea', SC.targets.sea]];
    side.innerHTML = '<div class="cf-simform">' +
      '<h3>⭐ ' + w('preset') + '</h3><div class="cf-presets">' + SC.presets.map(function (x) { return '<button type="button" data-preset="' + x.id + '" aria-pressed="' + (P.preset === x.id) + '"><b>' + esc(x.n) + '</b><span>' + esc(x.why) + '</span></button>'; }).join('') + '</div>' +
      '<h3>🔴 ' + w('who') + '</h3>' + rangeRow('salvo', w('salvo'), 0, 600, 10, srcNote('ir_salvo')) + rangeRow('dr', w('dr'), 0, 4, 0.5, srcNote('drone_ratio')) + rangeRow('days', w('days'), 1, 7, 1) +
      '<div class="cf-rl">' + w('aim') + '</div>' + aims.map(function (a) { return rangeRow(a[0], (a[1] ? a[1].n : a[0]), 0, 3, 1); }).join('') +
      '<h3>🔵 ' + w('strike') + '</h3>' + rangeRow('cv', w('cv'), 0, 3, 1, srcNote('cv_aim')) + rangeRow('b2', w('b2'), 0, 19, 1, srcNote('b2_fleet')) + rangeRow('tlam', w('tlam'), 0, 1000, 25, srcNote('tlam_2026')) +
      '<div class="cf-togs">' + tog('il', w('ilj')) + '</div><div class="cf-rl">' + w('targets') + '</div><div class="cf-togs">' +
      tog('tLaunch', SC.strike.launch.n) + tog('tAd', SC.strike.ad.n) + tog('tNuke', SC.strike.nuke.n) + tog('tNavy', SC.strike.navy.n) + tog('tOil', SC.strike.oil.n) + '</div>' +
      '<h3>🛡️ ' + w('shield') + '</h3>' + SH.filter(function (d) { return d.split !== 'thG'; }).map(function (d) { var mx = Math.max(50, Math.round(d.def * (d.split ? 2 : 1) * 2.5 / 10) * 10); return rangeRow(stockKey(d), d.split ? (FA ? 'تاد آمریکا، کل' : 'US THAAD, all batteries') : d.n, 0, mx, d.def > 200 ? 10 : 5, srcNote(d.stock)); }).join('') +
      rangeRow('thIL', w('thIL'), 0, 1, 0.1) +
      '<button type="button" class="cf-go" id="cf-go">🎲 ' + w('go') + '</button></div>';
  }
  side.addEventListener('input', function (ev) {
    var t = ev.target; if (!t.dataset.k) return;
    P[t.dataset.k] = +t.value; P.preset = '';
    var b = $('[data-v="' + t.dataset.k + '"]', side); if (b) b.textContent = fmt(t.dataset.k, +t.value);
    $$('.cf-presets [data-preset]', side).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
  });
  side.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b || !b.closest('.cf-simform,.cf-result')) return;
    if (b.dataset.preset) { P = base(b.dataset.preset); simForm(); track('sim_preset', { preset: b.dataset.preset }); }
    else if (b.dataset.t) { P[b.dataset.t] = P[b.dataset.t] ? 0 : 1; b.setAttribute('aria-pressed', !!P[b.dataset.t]); P.preset = ''; }
    else if (b.id === 'cf-go') go();
    else if (b.dataset.act === 'again') { RES = null; S.simOn = false; simBar.hidden = true; gFly.innerHTML = ''; simForm(); draw(true); }
    else if (b.dataset.act === 'share') share();
  });
  function go() {
    var g = $('#cf-go'); g.disabled = true; g.textContent = w('running');
    track('sim_run', { preset: P.preset || 'custom' });
    many(P, function (rs, seed) {
      RES = stats(rs, P, seed); VIEW = 0; S.simOn = true;
      result(); simBar.hidden = false; showDay(0); draw(true);
      try { history.replaceState(null, '', location.pathname + '?s=' + encodeURIComponent(JSON.stringify(P)) + location.hash); } catch (x) { }
    });
  }
  function share() {
    var u = location.origin + location.pathname + '?s=' + encodeURIComponent(JSON.stringify(P));
    track('sim_share', {});
    try { if (navigator.share) { navigator.share({ url: u, title: document.title }).catch(function () { }); return; } navigator.clipboard.writeText(u); var b = $('[data-act=share]', side); if (b) b.textContent = '✓ ' + w('copied'); } catch (x) { }
  }

  /* ------------------------------------------------------------------ playing the typical run on the map */
  function pick(list, n, salt) { var o = []; for (var i = 0; i < n && list.length; i++) o.push(list[(i * 7 + salt) % list.length]); return o; }
  function arc(a, b, cls, bend, stopAt) {
    var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    var cx = mx - dy / L * L * bend, cy = my + dx / L * L * bend - L * 0.12;
    var d = 'M' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + 'Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + b[0].toFixed(1) + ',' + b[1].toFixed(1);
    var p = sv('path', { d: d, 'class': 'cf-fly ' + cls, pathLength: 100 }, gFly);
    if (stopAt) p.style.strokeDasharray = (stopAt * 100) + ' 200';
    function at(t) { return [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cx + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cy + t * t * b[1]]; }
    return at;
  }
  function dot(p, r, cls) { return sv('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: (r / S.k).toFixed(2), 'data-r': r, 'class': 'cf-kr ' + cls }, gFly); }
  function showDay(i) {
    var T = RES.typ, d = T.days[i]; VIEW = i;
    gFly.innerHTML = ''; gFly.classList.toggle('cf-anim', !REDUCE);
    var csg = U.filter(function (u) { return u.c === 'csg' && u.xy; }).map(function (u) { return u.xy; });
    var ilp = SC.targets.il.at.map(function (x) { return x.xy; });
    var from = [];
    if (P.cv && csg.length) from = from.concat(csg.slice(0, Math.max(1, Math.min(csg.length, P.cv))));
    if (P.il) from = from.concat(ilp.slice(0, 2));
    var bl = Object.keys(d.hits);
    if (from.length && bl.length) {
      bl.forEach(function (s, si) {
        var tg = (SC.strike[s] || { at: [] }).at; pick(tg, Math.min(tg.length, 4), si + i).forEach(function (t, k) {
          arc(from[(k + si) % from.length], t.xy, 'cf-fly-b', 0.08 * ((k % 2) ? 1 : -1));
          dot(t.xy, 5 + 6 * Math.min(1, d.dmg[s] || 0), 'cf-hitb');
        });
      });
    }
    var orig = { il: SC.origins.w, us: SC.origins.s, oil: SC.origins.s, sea: SC.origins.s.concat(SC.origins.navy || []) };
    AREAS.forEach(function (a, ai) {
      var o = d.a[a]; if (!o || !o.f) return;
      var tg = a === 'sea' ? csg.map(function (x) { return { xy: x }; }) : SC.targets[a].at; if (!tg.length) return;
      var nArc = Math.max(1, Math.min(14, Math.round(o.f / 12))), nThr = Math.round(nArc * o.t / o.f);
      for (var k = 0; k < nArc; k++) {
        var f0 = orig[a][(k + ai + i) % orig[a].length].xy, t0 = tg[(k * 3 + i) % tg.length].xy, thr = k < nThr;
        var at = arc(f0, t0, thr ? 'cf-fly-r' : 'cf-fly-r cf-fly-x', 0.06 * ((k % 3) - 1), thr ? 0 : 0.82);
        if (thr) dot(t0, 6, 'cf-imp'); else dot(at(0.82), 4, 'cf-int');
      }
    });
    if (d.hz) { var hz = U.filter(function (u) { return u.c === 'choke' && /hormuz/i.test(u.id); })[0]; if (hz && hz.xy) dot(hz.xy, 12, 'cf-hz'); }
    draw(false);
    // the day bar
    var tot = AREAS.reduce(function (s, a) { return s + (d.a[a] ? d.a[a].t : 0); }, 0), st = AREAS.reduce(function (s, a) { return s + (d.a[a] ? d.a[a].s : 0); }, 0);
    simBar.innerHTML = '<div class="cf-days">' + T.days.map(function (x, j) { return '<button type="button" data-day="' + j + '" aria-pressed="' + (j === i) + '">' + w('day') + ' ' + fd(j + 1) + '</button>'; }).join('') + '</div>' +
      '<p class="cf-cap"><b>' + w('day') + ' ' + fd(i + 1) + '</b> ' + say(d) + '</p>' +
      '<div class="cf-ctl"><button type="button" data-act="prev"' + (i ? '' : ' disabled') + '>‹ ' + w('prev') + '</button><button type="button" data-act="auto">' + (timer ? '⏸ ' + w('pause') : '▶ ' + w('play')) + '</button><button type="button" data-act="next"' + (i < T.days.length - 1 ? '' : ' disabled') + '>' + w('next') + ' ›</button></div>' +
      '<div class="cf-meters">' + SH.map(function (x, j) { var v = d.left[j]; return v < 1 || true ? '<span class="cf-meter" title="' + esc(x.n) + '"><i style="width:' + Math.round(100 * v) + '%" class="' + (v < 0.15 ? 'cf-low' : '') + '"></i><em>' + esc(x.n) + ' ' + pc(v) + '</em></span>' : ''; }).join('') + '</div>';
    if (i === T.days.length - 1) track('sim_done', {}, false);
  }
  function lst(d) { var x = AREAS.filter(function (a) { return d.a[a].t; }).map(function (a) { return SC.targets[a].n + ' ' + n0(d.a[a].t); }); return x.length ? ' (' + x.join(FA ? '، ' : ', ') + ')' : ''; }
  function say(d) {
    var parts = [], tl = d.tl, air = d.air;
    if (air || tl || d.mops) parts.push(FA ? 'آمریکا و اسرائیل حدود ' + n0(air + tl) + ' هدف رو می‌زنن' + (tl ? ' (' + n0(tl) + ' تاماهاک)' : '') + (d.mops ? '، با ' + n0(d.mops) + ' بمب سنگرشکن روی سایت‌های هسته‌ای' : '') + '.'
      : 'The US and Israel hit about ' + n0(air + tl) + ' aim points' + (tl ? ' (' + n0(tl) + ' Tomahawks)' : '') + (d.mops ? ', with ' + n0(d.mops) + ' GBU-57 bunker busters on the nuclear sites' : '') + '.');
    var th = AREAS.reduce(function (s, a) { return s + d.a[a].t; }, 0);
    parts.push(FA ? 'جمهوری اسلامی ' + n0(d.m) + ' موشک بالستیک و ' + n0(d.dr) + ' پهپاد شلیک می‌کنه؛ ' + n0(d.m - th) + ' موشک متوقف می‌شه و ' + n0(th) + ' تا رد می‌شه' + lst(d) + '.'
      : 'The Islamic Republic fires ' + n0(d.m) + ' ballistic missiles and ' + n0(d.dr) + ' drones; ' + n0(d.m - th) + ' missiles are stopped and ' + n0(th) + ' get through' + lst(d) + '.');
    if (d.hz) parts.push(FA ? 'نیروی دریایی سپاه هرمز رو مختل می‌کنه.' : 'The IRGC navy is disrupting Hormuz.');
    return esc(parts.join(' '));
  }
  simBar.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.day) { stop(); showDay(+b.dataset.day); }
    else if (b.dataset.act === 'prev') { stop(); showDay(Math.max(0, VIEW - 1)); }
    else if (b.dataset.act === 'next') { stop(); showDay(Math.min(RES.typ.days.length - 1, VIEW + 1)); }
    else if (b.dataset.act === 'auto') { if (timer) { stop(); showDay(VIEW); } else { if (VIEW >= RES.typ.days.length - 1) VIEW = -1; timer = setInterval(function () { if (VIEW >= RES.typ.days.length - 1) { stop(); showDay(VIEW); return; } showDay(VIEW + 1); }, 1800); showDay(VIEW + 1); } }
  });
  function stop() { if (timer) { clearInterval(timer); timer = 0; } }

  /* ------------------------------------------------------------------ the score and the explanation */
  function grade(s) { return s >= 85 ? 'A' : s >= 70 ? 'B' : s >= 55 ? 'C' : s >= 40 ? 'D' : 'F'; }
  function result() {
    var R = RES, T = R.typ, why = [];
    var fired = AREAS.reduce(function (s, a) { return s + R.area[a].f; }, 0), thr = AREAS.reduce(function (s, a) { return s + R.area[a].t; }, 0);
    var cal = F[SC.calib.il_fired] && F[SC.calib.il_through] ? (FA ? ' برای مقایسه: تو جنگ ۲۰۲۶ حدود ' + n0(F[SC.calib.il_fired].v) + ' موشک به اسرائیل شلیک شد و ' + n0(F[SC.calib.il_through].v) + ' تا رد شد.' : ' For scale: in the 2026 war about ' + n0(F[SC.calib.il_fired].v) + ' missiles were fired at Israel and ' + n0(F[SC.calib.il_through].v) + ' got through.') : '';
    why.push(FA ? 'تو معمولی‌ترین اجرا جمهوری اسلامی تو ' + fd(P.days) + ' روز حدود ' + n0(T.f) + ' موشک بالستیک شلیک می‌کنه و پدافند ' + pc(R.stop[1]) + ' رو متوقف می‌کنه (' + w('range') + ' ' + pc(R.stop[0]) + ' ' + w('and') + ' ' + pc(R.stop[2]) + ').' + cal
      : 'In the typical run the Islamic Republic fires about ' + n0(T.f) + ' ballistic missiles over ' + fd(P.days) + ' days and the shield stops ' + pc(R.stop[1]) + ' (' + w('range') + ' ' + pc(R.stop[0]) + ' ' + w('and') + ' ' + pc(R.stop[2]) + ').' + cal);
    var outs = SH.filter(function (d) { return R.out[d.id].share >= 0.5 && (+P[stockKey(d)] > 0); });
    if (outs.length) outs.slice(0, 3).forEach(function (d) { why.push(FA ? d.n + ' تو بیشتر اجراها تموم می‌شه (معمولاً روز ' + fd(R.out[d.id].day) + '). بعد از اون، موشک‌هایی که به اون منطقه می‌رن فقط با لایه‌های دیگه روبه‌رو می‌شن، برای همین نشت بالا می‌ره.' : d.n + ' runs out in most runs (typically on day ' + fd(R.out[d.id].day) + '). After that, missiles at that area meet only the other layers, so more get through.'); });
    else why.push(FA ? 'هیچ‌کدوم از رهگیرها تو بیشتر اجراها تموم نمی‌شه: موجودی‌ها برای این دور کافیه. یه دور طولانی‌تر یا شلیک بزرگ‌تر رو امتحان کنید تا ببینید کجا کم میاره.' : 'No interceptor stock runs out in most runs: the stocks are enough for this round. Try a longer round or a bigger salvo to see where it breaks.');
    if (P.tLaunch && (P.cv || P.il || P.tlam)) why.push(FA ? 'حمله به سکوهای پرتاب شلیک روزانه رو از ' + n0(T.first) + ' تو روز اول به ' + n0(T.last) + ' تو روز آخر می‌رسونه؛ ' + pc(1 - R.rate[1]) + ' از قدرت شلیکش از بین می‌ره. سکوهای متحرک قایم می‌شن، برای همین هیچ‌وقت به صفر نمی‌رسه.' : 'Strikes on the launchers cut the daily salvo from ' + n0(T.first) + ' on day 1 to ' + n0(T.last) + ' on the last day; ' + pc(1 - R.rate[1]) + ' of its launch power is gone. Mobile launchers hide, which is why it never reaches zero.');
    else why.push(FA ? 'هیچ‌کس سکوهای پرتاب رو نمی‌زنه، برای همین جمهوری اسلامی تا وقتی موشک داره می‌تونه با همین سرعت شلیک کنه. سپر فقط وقت می‌خره.' : 'Nobody hits the launchers, so the Islamic Republic can keep firing at this rate while its missiles last. The shield only buys time.');
    var dear = SH.slice().sort(function (a, b) { return b.cost - a.cost; })[0];
    why.push(FA ? 'هزینهٔ رهگیرهای شلیک‌شده حدود ' + money(R.usd) + 'ه. گرون‌ترینش ' + dear.n + 'ه، حدود ' + money(dear.cost) + ' برای هر رهگیر.' : 'The interceptors fired cost about ' + money(R.usd) + '. The dearest is ' + dear.n + ', about ' + money(dear.cost) + ' each.');
    if (R.area.oil.t > 0) why.push(FA ? 'حدود ' + n0(R.area.oil.t) + ' موشک به تأسیسات نفت و گاز خلیج فارس می‌خوره. تو ۲۰۲۶ همین حمله‌ها قیمت نفت رو بالا بردن.' : 'About ' + n0(R.area.oil.t) + ' missiles hit Persian Gulf oil and gas. In 2026 strikes like these pushed oil prices up.');
    if (R.hz > 0.3) why.push(FA ? 'تو ' + pc(R.hz) + ' از اجراها سپاه سعی می‌کنه هرمز رو ببنده؛ ' + (P.tNavy ? 'زدن نیروی دریایی‌ش این رو کوتاه‌تر می‌کنه.' : 'چون نیروی دریایی‌ش زده نمی‌شه، این کار تا آخر دور ادامه داره.') : 'In ' + pc(R.hz) + ' of runs the IRGC tries to close Hormuz; ' + (P.tNavy ? 'hitting its navy shortens that.' : 'its navy is not hit, so it keeps that up through the round.'));
    if (P.b2 && P.tNuke) why.push(FA ? 'B-2ها ' + n0(T.mops) + ' بمب GBU-57 روی سایت‌های هسته‌ای می‌ندازن. مدل نمی‌گه برنامهٔ هسته‌ای تموم می‌شه یا نه: گزارش‌ها می‌گن تونل‌های کوه کلنگ گزلا حدود ' + n0(F.pickaxe_depth.v) + ' متر عمق دارن، و GBU-57 حدود ' + n0(F.mop_pen.v) + ' متر نفوذ می‌کنه.' : 'B-2s drop ' + n0(T.mops) + ' GBU-57s on the nuclear sites. The model does not claim that ends the programme: Pickaxe Mountain\'s halls are reported about ' + n0(F.pickaxe_depth.v) + ' m deep, and a GBU-57 is reported to reach about ' + n0(F.mop_pen.v) + ' m.');
    var sc = R.score;
    side.innerHTML = '<div class="cf-result"><div class="cf-score"><span class="cf-grade cf-g' + grade(sc) + '">' + grade(sc) + '</span><span><b class="num">' + fd(sc) + '/' + fd(100) + '</b><small>' + w('score') + '</small></span></div>' +
      '<div class="cf-nums"><div><b class="num">' + pc(R.stop[1]) + '</b><small>' + w('shieldHeld') + '</small></div><div><b class="num">' + pc(1 - R.rate[1]) + '</b><small>' + w('launchCut') + '</small></div><div><b class="num">' + n0(thr) + '</b><small>' + (FA ? 'موشک رد شد' : 'missiles through') + '</small></div><div><b class="num">' + money(R.usd) + '</b><small>' + w('cost') + '</small></div></div>' +
      '<div class="cf-areas">' + AREAS.filter(function (a) { return R.area[a].f; }).map(function (a) { return '<div><b>' + esc(SC.targets[a].n) + '</b><span class="num">' + n0(R.area[a].f) + ' ' + w('fired') + ' · ' + n0(R.area[a].t) + ' ' + w('through') + '</span></div>'; }).join('') + '</div>' +
      '<h3>💡 ' + w('why') + '</h3><ol class="cf-why">' + why.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
      '<p class="cf-note">' + (FA ? 'نمره: ۶۰٪ سهم موشک‌های متوقف‌شده، ۴۰٪ قدرت شلیکِ از بین‌رفته، منهای ضربه به نفت و بسته شدن هرمز. یه مدل برای فکر کردنه، نه پیش‌بینی.' : 'Score: 60% the share of missiles stopped, 40% the launch power removed, less hits on oil and days Hormuz is shut. A model to think with, not a forecast.') + '</p>' +
      '<div class="cf-ra"><button type="button" class="cf-btn" data-act="again">⚙️ ' + w('again') + '</button><button type="button" class="cf-btn" data-act="share">🔗 ' + w('share') + '</button></div></div>';
  }

  /* ------------------------------------------------------------------ start */
  underMap(); side.appendChild(below);
  home(); draw(true);
  track('sim_view', {}, true);
  if (S.sel) openCard(S.sel, 'list');
  if (P) setTab('sim');
  var ro = window.ResizeObserver ? new ResizeObserver(function () { var k = S.k / S.k0; size(); S.k = S.k0 * k; clamp(); draw(true); }) : null;
  if (ro) ro.observe(mapEl); else window.addEventListener('resize', function () { size(); clamp(); draw(true); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placed.forEach(function (u) { u.lbW = 0; }); names.forEach(function (n) { n.w = 0; }); draw(true); });
})();
