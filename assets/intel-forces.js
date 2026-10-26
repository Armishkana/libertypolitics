/* THE FORCES LAYER and HOW EACH SIDE FRAMED IT (build/intel-forces.js, 23 October 2026). Both Intel Rooms: build/intel.py
   (Liberty Politics) and site-iu/build/news.py (Iran Uncensored, English and Persian) name this file in the room's
   data-addons, and intel.js loads it once the room is ready. The files it reads are the room's data-forces,
   data-forces-news and data-frames.

   TWO SITES, TWO LANGUAGES (23 Oct 2026). Iran Uncensored's room hands a config in the same #ir-cfg intel.js reads
   (site-iu/build/news.py config()), and everything a reader sees here goes through it:
   - T(s, vars): every sentence, key = the English exactly as written here, {name} parts filled in. news.py t_keys() reads
     this file too, and STOPS the Persian build while a T('...') key has no spoken Persian in site-iu/data/news-words.json.
     So a key is always a literal (never built by +), and one and many are two keys. N(): Persian digits on the Persian page.
     CFG.months: the Persian page's month names.
   - Data in Persian: on the Persian page a shown field X of a site, a ship, a theatre or a pulse row is read from X + '_fa'
     when the room's forces file carries it (site-iu/data/forces-fa.json, merged by news.py). A site matches a headline by
     its English rx OR its rx_fa. Wikipedia's English extract is hidden there unless x_fa exists. A ship's position, written
     weekly in English, is composed from its structured fields (pr, the place) instead.
   - CFG.sides: [[key, name in the page's language], ...]: the outlets' sides for HOW EACH SIDE FRAMED IT (Iran: free
     Persian media, the press in English, the regime's media) instead of Left, Centre and Right. "Your balance" is a US
     lean, so it is not kept or shown there.
   - CFG.forcesWars: the conflicts picked when the address names none (Iran: the Iran war, the Houthis, Israel's fronts).
   - CFG.light: this layer loads nothing from another site (no picture; every outside thing is a link the reader taps), and
     regime media (window.IRoom.regime) is never a link.
   Liberty Politics hands no config, so T() and N() give back what they are handed and every line reads as before.

   Armin, 23 Oct 2026: "figure out how we could better include the features of Ground News and Delta Sweep.com ... make
   sure that we have all the main military assets of important countries visibly shown on the map, especially in the
   upcoming war, and then news related to those military assets connected to it."

   WHAT IT ADDS
   1. Military sites on the map (data/intel-forces.json, written hourly by build/intel_forces.py from the register
      data/intel-forces-src.json, every coordinate checked against Wikipedia): a small square per site, its symbol says
      what it is (air base, naval base, nuclear site, missile base ...), its colour who runs it (BLOCS). A site the room's
      news names right now carries a gold ring and the count. Tier 2 sites show once the map is zoomed in, or when their
      theatre is picked. Sites that would sit on each other show the most important one; a tap there lists them all.
   2. US carriers and big-deck amphibious ships where the US Naval Institute's weekly Fleet Tracker last put them, with
      its date. The Navy publishes no live positions, so the date is always on screen.
   3. A site's profile (tap it): who runs it, where, why it matters, Wikipedia's own two sentences and link, the room's
      news that NAMES it, news placed near it, the nearest sites of the other side with their distance, and what the
      betting markets say for its theatre. "Show its news" is a filter in the address (?mil=<site>), with a pill.
   4. The Forces tab beside Stories and Connections: the sites in the news now, the fleet, the markets, and every site
      by conflict, all following the conflicts picked.
   6. CONFLICTS (23 Oct 2026): the chip on the map is the one door. Tick the Iran war, the Houthis, Ukraine ... one or
      several (?war=gulf,redsea); the stories, the sites, the odds and the map follow. War pressure per conflict
      (DeltaSweep's Pulse, MEASURED from the feed) is shown in that picker.
   7. Every asset's own newest news (data/intel-forces-news.json, its own search, every headline names it) heads its
      profile; a ship says where, how exact, the date and how old. A site that would sit on a news circle moves to its
      rim with a thin line back, so no count is ever hidden.
   8. A site's or a ship's card (24 Oct 2026, photoHtml and covHtml): up to three photos of it from its Wikipedia article,
      then everything said about it (the room's items, its own X, YouTube and article searches) drawn as the room's own
      cards with All / X / YouTube / Articles; a tap opens the room's spotlight on it (IRoom.openList) with Back to the card.
   5. In every story's spotlight: HOW EACH SIDE FRAMED IT (Ground News's headlines side by side, from
      data/intel-frames.json, written by intel_live.py frames()), who reported it first, the military sites the story
      names, and YOUR BALANCE: the lean of what this reader opened here in 7 days (kept on this device only).
   Nothing here decides a fact: every number is counted from the files, every claim about a site comes from the register
   or Wikipedia, and an odds line says it is a market, not a fact. Tests: build/phone-test.html, the FORCES block. */
(function () {
  'use strict';
  var R = window.IRoom, root = document.getElementById('ir');
  if (!R || !R.map || !root || window.IRF) return;
  var $ = function (id) { return document.getElementById(id); };
  var SVGNS = 'http://www.w3.org/2000/svg';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } return null; }
  var CFG = (function () { var el = document.getElementById('ir-cfg'); if (!el) return {}; try { var c = JSON.parse(el.textContent); return c && typeof c === 'object' ? c : {}; } catch (e) { return {}; } })();
  var TT = CFG.t && typeof CFG.t === 'object' ? CFG.t : null, FA = CFG.lang === 'fa', IU = !!CFG.lang;
  function T(s, v) {
    var r = TT && typeof TT[s] === 'string' ? TT[s] : s;
    if (v) Object.keys(v).forEach(function (k) { r = r.split('{' + k + '}').join(String(v[k])); });
    return r;
  }
  function N(n) { var s = String(n); return FA ? s.replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(+d); }).replace(/\./g, '٫') : s; }
  function LN(n) { return FA ? N(n.toLocaleString('en-US').replace(/,/g, '٬')) : n.toLocaleString('en-US'); }
  var DA = CFG.dirAuto ? ' dir="auto"' : '';
  function bd(h) { return DA ? '<bdi>' + h + '</bdi>' : h; }          // a name or a headline in either language, kept whole inside a line
  // a field as this page shows it: on the Persian page X_fa when the file carries it
  function L(o, k) { var f = o && o[k + '_fa']; return FA && typeof f === 'string' && f ? f : o ? o[k] : ''; }
  // regime media (Iran Uncensored): shown, never a link (intel.js isRegime; Liberty Politics: never one)
  function regime(u) { return !!(R.regime && R.regime({ u: u })); }
  function nozw(s) { return String(s).replace(/‌/g, ''); }          // Persian's half space out, as intel.js does before it matches
  var FL = 'ء-غف-يپچژکگیۀٔ';          // Persian letters (site-iu/build/news.py boundary_fa)
  function fmtN(n) { return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(n); }
  function agoMs(ms) {
    var h = (Date.now() - ms) / 36e5;
    if (!(h >= 0)) return '';
    if (h < 1) return T('{n} min ago', { n: N(Math.max(1, Math.round(h * 60))) });
    if (h < 48) return Math.round(h) === 1 ? T('1 hour ago') : T('{n} hours ago', { n: N(Math.round(h)) });
    return T('{n} days ago', { n: N(Math.round(h / 24)) });
  }
  var MONS = Array.isArray(CFG.months) && CFG.months.length === 12 ? CFG.months : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function day(iso) { var d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : '')); return isNaN(d) ? '' : N(d.getUTCDate()) + ' ' + MONS[d.getUTCMonth()]; }

  /* WHO RUNS IT: the colour of a site's mark. Muted, so they sit on the room's black and gold, and never the gold itself
     (gold is the news). [key, name a reader sees, colour, operator codes]. */
  var BLOCS = [
    ['us', T('United States'), '#6E9BE8', ['US']],
    ['il', T('Israel'), '#7FD0EE', ['IL']],
    ['ally', T('US allies in NATO and Asia'), '#A9BCDD', ['UK', 'FR', 'NATO', 'DE', 'IT', 'ES', 'GR', 'AU', 'JP', 'KR', 'TW', 'PH']],
    ['arab', T('Gulf Arab states, Egypt, Jordan and Turkey'), '#8CC79C', ['SA', 'AE', 'QA', 'EG', 'JO', 'TR', 'BH', 'KW', 'OM']],
    ['ir', T('Iran and its network'), '#E4574B', ['IR', 'HZ', 'HT', 'IQM']],          // Iran Uncensored names the regime here, never the country
    ['ru', T('Russia'), '#E59A4E', ['RU']],
    ['cn', T('China'), '#E37FAE', ['CN']],
    ['kp', T('North Korea'), '#B892E6', ['KP']],
    ['sa', T('India and Pakistan'), '#C8BFAA', ['IN', 'PK']]
  ];
  var BLOC_OF = {}, BLOC_BY = {};
  BLOCS.forEach(function (b) { BLOC_BY[b[0]] = b; b[3].forEach(function (o) { BLOC_OF[o] = b[0]; }); });
  // the other side, for "nearest sites of the other side": the war's two camps, and the great powers' rivals
  var RIVAL = { us: ['ir', 'ru', 'cn', 'kp'], il: ['ir'], ally: ['ru', 'cn', 'kp'], arab: ['ir'], ir: ['us', 'il', 'arab', 'ally'], ru: ['us', 'ally'], cn: ['us', 'ally'], kp: ['us', 'ally'], sa: [] };
  // IR: Iran Uncensored always separates Iranians from the Islamic Republic, so a site the regime runs says so (its own key:
  // the table's "Iran" is the country)
  var OPN = { US: T('United States'), IL: T('Israel'), UK: T('United Kingdom'), FR: T('France'), NATO: T('NATO'), DE: T('Germany'), IT: T('Italy'), ES: T('Spain'), GR: T('Greece'), AU: T('Australia'), JP: T('Japan'), KR: T('South Korea'), TW: T('Taiwan'), PH: T('Philippines'),
    SA: T('Saudi Arabia'), AE: T('United Arab Emirates'), QA: T('Qatar'), EG: T('Egypt'), JO: T('Jordan'), TR: T('Turkey'), BH: T('Bahrain'), KW: T('Kuwait'), OM: T('Oman'), IR: IU ? T('The Islamic Republic') : 'Iran', HZ: T('Hezbollah'), HT: T('The Houthis'), IQM: T('Iran-backed Iraqi militias'),
    RU: T('Russia'), CN: T('China'), KP: T('North Korea'), IN: T('India'), PK: T('Pakistan') };
  function blocOf(a) { return BLOC_BY[BLOC_OF[a.o] || 'sa']; }
  function colOf(a) { return blocOf(a)[2]; }

  /* WHAT IT IS: a symbol per kind, drawn in a 20 by 20 box about 0,0, in the site's colour. [name, name in a list, path] */
  var KIND = {
    air: [T('Air base'), T('Air bases'), 'M0 -7 1.4 -2.2 7 1v1.6L1.4 0.6 1.2 4.4 3 5.8V7L0 6 -3 7V5.8L-1.2 4.4-1.4 0.6-7 2.6V1L-1.4-2.2z'],
    naval: [T('Naval base'), T('Naval bases'), 'M0-7a1.8 1.8 0 1 1 0 3.6A1.8 1.8 0 1 1 0-7zM-0.9-3.4h1.8V5.2c2.3-.3 3.9-1.6 4.4-3.6l-1.5.2L5.9-.9 7.1 2.6l-1.4-.5C5 5.2 2.8 7 0 7S-5 5.2-5.7 2.1l-1.4.5L-5.9-.9-3.8 1.8l-1.5-.2c.5 2 2.1 3.3 4.4 3.6z'],
    army: [T('Army base'), T('Army bases'), 'M-6.5 1 0-3.5 6.5 1V4L0-.5-6.5 4zM-6.5-4.5 0-9 6.5-4.5V-1.5L0-6-6.5-1.5z'],
    hq: [T('Command headquarters'), T('Command headquarters'), 'M0-7.2 2.1-2.4 7.2-2 3.3 1.4 4.5 6.5 0 3.8-4.5 6.5-3.3 1.4-7.2-2-2.1-2.4z'],
    nuclear: [T('Nuclear site'), T('Nuclear sites'), 'M0-1.6a1.6 1.6 0 1 1 0 3.2A1.6 1.6 0 1 1 0-1.6zM-1.1-2.6-3.5-6.6A7.3 7.3 0 0 1 3.5-6.6L1.1-2.6A2.8 2.8 0 0 0-1.1-2.6zM2.8 0.3 7.4 0.4A7.3 7.3 0 0 1 3.9 6.4L1.6 2.4A2.8 2.8 0 0 0 2.8 0.3zM-1.6 2.4-3.9 6.4A7.3 7.3 0 0 1-7.4 0.4L-2.8 0.3A2.8 2.8 0 0 0-1.6 2.4z'],
    missile: [T('Missile base'), T('Missile bases'), 'M0-8C1.6-6.6 2.2-4.6 2.2-2.6V3.2L4 5.2V7.2L2.2 6.2V7H-2.2V6.2L-4 7.2V5.2L-2.2 3.2V-2.6C-2.2-4.6-1.6-6.6 0-8z'],
    drone: [T('Drone base or factory'), T('Drone sites'), 'M0-6 7 4.5 4.5 4.5 0 1.5-4.5 4.5-7 4.5z'],
    radar: [T('Radar or missile defence'), T('Radar and missile defence'), 'M-6 4.5A8 8 0 0 1 4.5-6L-0.8-.8zM-0.8-.8 3.5-5M1.5 1.5A4 4 0 0 0 4.2-2.6M-1.5 6.5H5'],
    space: [T('Space launch site'), T('Space launch sites'), 'M0-8C2-6.2 2.6-3.8 2.6-1.6V3L4.6 6.6H-4.6L-2.6 3V-1.6C-2.6-3.8-2-6.2 0-8zM0-3.2a1.2 1.2 0 1 0 .1 0'],
    oil: [T('Oil or gas target'), T('Oil and gas'), 'M0-7.5C2.6-3.6 4.8-1 4.8 2A4.8 4.8 0 0 1-4.8 2C-4.8-1-2.6-3.6 0-7.5z'],
    choke: [T('Chokepoint'), T('Chokepoints'), 'M-7-6C-2-3-2 3-7 6M7-6C2-3 2 3 7 6M-3.5 0H3.5'],
    proxy: [T('Militia stronghold'), T('Militia strongholds'), 'M-5-7V7M-5-6.5H5.5L3.3-3 5.5 0.5H-5'],
    carrier: [T('Aircraft carrier'), T('Aircraft carriers'), 'M-8 1.5H8L6 5H-6.5zM-5-.5H5.5V1.5H-5zM2-3.5H4.5V-.5H2z'],
    amphib: [T('Amphibious assault ship'), T('Amphibious ships'), 'M-8 1.5H8L6 5H-6.5zM-5-.2H5V1.5H-5zM-1-3H1.5V-.2H-1z']
  };
  var STROKED = { radar: 1, choke: 1, proxy: 1 };          // drawn as lines, not filled shapes
  function sym(k, extra) {
    var p = KIND[k] || KIND.army;
    return '<path class="irf-g' + (STROKED[k] ? ' ln' : '') + '"' + (extra || '') + ' d="' + p[2] + '"/>';
  }

  var D = null, FR = null, TH = {}, BYID = {}, ASSETS = [], SHIPS = [], ON = store('ir-forces') !== 'off';
  var NEWS = {}, NEAR = {}, OF_ITEM = {}, MKEY = '', FOCUS = '', NAMED_N = 0, AN = {}, AGE = null;
  // FHELD: the ?mil= value FOCUS is held by (let go when the pill goes); KEEPF: "Go to it on the map" keeps its focus
  // through the dialog's close event, which comes after the tap; AGAIN: the room is drawing once more after new matches
  var FHELD = '', KEEPF = false, AGAIN = false;
  var AIM = {}, AX = {}, AYT = {};          // each asset's photos, own X posts and own YouTube videos (intel-forces-news.json im, x, yt)
  var g = null, gL = null, EL = {}, DRAWN = [], LINES = [];
  /* THE FLEET'S AGE (23 Oct 2026). The room once showed USS Theodore Roosevelt off California for three weeks after it had
     reached Japan: the builder read a feed that had stopped, and nothing on the page said how old the position was. Now
     every ship says its date and its age, a fleet older than STALE days is drawn faded with the age on it, and one older
     than GONE days is not drawn at all (only listed, with the reason). The builder's own check fails at 9 days. */
  var STALE = 9, GONE = 16;
  /* Counted in the reader's own calendar days, again on every redraw and every ten minutes (24 Oct 2026): it was counted
     once, from noon UTC, so a reader in Tehran saw the fleet a day younger before noon UTC, and a tab left open for ten
     hours never aged. */
  function fleetAge() {
    var m = D && D.fleet && /^(\d{4})-(\d\d)-(\d\d)$/.exec(D.fleet.at || '');
    if (!m) return null;
    var now = new Date(), t0 = new Date(+m[1], +m[2] - 1, +m[3]).getTime(), t1 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return isFinite(t0) ? Math.max(0, Math.round((t1 - t0) / 864e5)) : null;          // round: a clock change makes a day 23 or 25 hours
  }
  // the age changed (midnight passed): ships too old to draw leave the map, marks fade, the open tab says the new age
  function refreshAge() {
    var a = fleetAge();
    if (a === AGE) return false;
    AGE = a;
    SHIPS.forEach(function (s) {
      s._nomap = !!s._nopos || (AGE != null && AGE > GONE);
      var e = EL[s.id]; if (e) e.classList.toggle('old', AGE != null && AGE > STALE);
    });
    return true;
  }
  // a link that leaves the page: only http and https, never a javascript: or data: address from a feed
  function safeU(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : '#'; }
  // regime media, judged on the whole item (its address, its domain, its own mark), as intel.js does
  function rgItem(x) { return !!(x && ((R.regime && R.regime(x)) || regime(x.u))); }
  /* AN ANNIVERSARY IS NOT NEWS (24 Oct 2026): "43 years ago, Hezbollah terrorists attacked U.S. Marine barracks" headed
     Hezbollah and "US bases in the region" in "In the news now". A headline that opens on how many years ago something
     happened (or "on this day") is kept, but after the real news. Only the opening words are read: a story that mentions
     "20 years ago" in its middle is still news. */
  var PAST_RX = /\b\d{1,3}\s+years?\s+ago\b|\bon this day\b|\btoday in history\b|\b\d{1,3}(st|nd|rd|th)\s+anniversary\b/i;
  var PAST_FA = /[0-9۰-۹]+\s*سال\s*پیش|[0-9۰-۹]+\s*سال\s*قبل|در\s*چنین\s*روزی|[0-9۰-۹]+\s*(?:مین|امین)\s*سالگرد/;
  function isPast(it) { var t = nozw(String((it && it.t) || '').slice(0, 90)); return PAST_RX.test(t) || PAST_FA.test(t); }

  /* ------------------------------------------------------------ loading */
  function soft(u) { return u ? fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }) : Promise.resolve(null); }
  var fu = root.getAttribute('data-forces') || '', nu = root.getAttribute('data-forces-news') || (fu ? fu.replace(/intel-forces\.json(\?.*)?$/, 'intel-forces-news.json') : '');
  Promise.all([soft(fu), soft(root.getAttribute('data-frames')), soft(nu)]).then(function (res) {
    if (res[1] && res[1].schema === 1 && res[1].by && typeof res[1].by === 'object') FR = res[1];
    if (res[2] && res[2].schema === 1 && res[2].by && typeof res[2].by === 'object') {
      AN = res[2].by;
      var ob = function (o) { return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; };
      AIM = ob(res[2].im); AX = ob(res[2].x); AYT = ob(res[2].yt);
    }
    if (res[0] && res[0].schema === 1 && Array.isArray(res[0].assets)) start(res[0]);
    R.addSpot(spot);          // the framing block works even with no forces file
    window.IRF = { ready: true, on: function () { return ON; }, drawn: function () { return DRAWN.slice(); }, named: function () { return NAMED_N; }, data: function () { return D; }, open: dossier,
      news: function (id) { return (NEWS[id] || []).slice(); }, latest: function (id) { return (AN[id] || []).slice(); },
      cover: function (id) { return BYID[id] ? coverOf(BYID[id]).slice() : []; }, photos: function (id) { return BYID[id] ? photos(BYID[id]) : []; }, wars: wars, setWars: setWars, picker: warPicker, age: function () { return D ? fleetAge() : AGE; } };
    root.setAttribute('data-forces-ready', D ? '1' : '0');
  });

  function start(d) {
    D = d;
    var thn = d.th || {}, thf = FA && d.th_fa && typeof d.th_fa === 'object' ? d.th_fa : {};
    ['gulf', 'levant', 'redsea', 'europe', 'pacific', 'southasia', 'americas'].forEach(function (k, i) {
      TH[k] = thf[k] || thn[k] || [T('Iran war'), T('Israel, Gaza and Lebanon'), T('Houthis and the Red Sea'), T('Russia and Ukraine'), T('China, Taiwan and Korea'), T('India and Pakistan'), T('Venezuela and the Americas')][i];
    });
    AGE = fleetAge();
    d.assets.forEach(function (a) {
      if (!a || !a.id || !Array.isArray(a.ll) || !isFinite(a.ll[0]) || !isFinite(a.ll[1])) return;
      try { a._rx = a.rx ? new RegExp(cleanRx(a.rx), 'i') : null; } catch (e) { a._rx = null; }
      a._rxf = faRx(a.rx_fa);
      a._t = 'site'; BYID[a.id] = a; ASSETS.push(a);
    });
    var fl = d.fleet && Array.isArray(d.fleet.ships) ? d.fleet : null;
    if (fl) fl.ships.forEach(function (s) {
      if (!s || !s.id || BYID[s.id]) return;
      var placed = Array.isArray(s.ll) && isFinite(s.ll[0]) && isFinite(s.ll[1]);
      if (!placed && s.pr !== 'none') return;
      try { s._rx = s.rx ? new RegExp(cleanRx(s.rx), 'i') : null; } catch (e) { s._rx = null; }
      s._rxf = faRx(s.rx_fa);
      s._t = 'ship'; s.o = s.o || 'US'; s.tier = 1; s.th = s.th || (placed ? thOfSea(s.ll) : '');
      s._nopos = !placed;
      s._nomap = !placed || (AGE != null && AGE > GONE);          // listed, never drawn: no position, or a position too old to show
      BYID[s.id] = s; SHIPS.push(s);
    });
    if (!ASSETS.length && !SHIPS.length) return;
    build();
    match();
    /* AFTER EVERY REDRAW (24 Oct 2026). The room filters and draws its tabs BEFORE this runs, so after a lens switch (or new
       items) ?mil= and ?war= had been tested against the last lens's matches: ?mil=any then the Bank showed "Nothing here
       matches". When the matches change and one of this file's filters is on, the room draws once more, at once (so the
       framing that follows a lens switch frames the right list); the second pass finds the same matches and stops, and
       AGAIN guards it besides, so it can never loop. The Forces tab is drawn again with the new matches. A focus held by
       the ?mil= pill goes when the pill goes. */
    R.onRender(function () {
      var changed = match(), aged = refreshAge(), mil = R.filterOn('mil');
      if (FHELD && mil !== FHELD) { FHELD = ''; FOCUS = ''; R.map.redraw(); }
      if (changed && (mil || R.filterOn('war')) && !AGAIN && R.rendered) {
        AGAIN = true;
        try { R.rendered(); } finally { AGAIN = false; }
        return;
      }
      if ((changed || aged) && R.tabOn() === 'forces' && $('irf-tab') && !$('irf-tab').hidden) drawTab();
      drawTabCount(); chipText();
    });
    setInterval(function () { if (refreshAge()) { R.map.redraw(); if (R.tabOn() === 'forces' && $('irf-tab') && !$('irf-tab').hidden) drawTab(); } }, 6e5);
    R.addFilter({ key: 'mil', valid: function (v) { return v === 'any' || (v.indexOf('th:') === 0 && !!TH[v.slice(3)]) || (v.indexOf('g:') === 0 && !!GBY[v.slice(2)]) || !!BYID[v]; }, test: passMil, label: milLabel });
    R.addFilter({ key: 'war', valid: function (v) { return (DEFW.length && v === 'all') || String(v).split(',').every(function (k) { return !!CF[k]; }); }, test: passWar, label: warLabel });
    var oldTh = R.filterOn('mil');          // a link from before 23 Oct 2026 (?mil=th:gulf) opens the same conflict
    if (oldTh.indexOf('th:') === 0 && CF[oldTh.slice(3)]) { R.filter('mil', ''); R.filter('war', oldTh.slice(3)); }
    // the room's own conflicts when the address names none (Iran Uncensored: CFG.forcesWars); "every conflict" is then
    // ?war=all, so the reader's choice is kept in the address like any other
    if (DEFW.length && !R.filterOn('war')) R.filter('war', DEFW.join(','));
    R.addTab('forces', { el: 'irf-tab', draw: drawTab, count: drawTabCount });
    R.map.addLayer({ draw: draw, hit: hit, hitEl: hitEl, tip: tip, open: openMark });
    drawTabCount();
    chip();
  }
  // A JSON "\b" read as a backspace (U+0008) where a word edge was meant: put the word edge back.
  function cleanRx(r) { return String(r).replace(/\u0008/g, '\\b'); }
  // a site's Persian pattern (Iran Uncensored's forces file, rx_fa): matched against the text with its half spaces taken out
  function faRx(r) { if (!r) return null; try { return new RegExp(nozw(r), 'i'); } catch (e) { return null; } }
  /* A ship's theatre from where it is (24 Oct 2026). A ship in its home waters is in no conflict (''): USS Ronald Reagan in
     port at San Diego, Bremerton or Everett had fallen into "Russia and Ukraine", and Norfolk into "Venezuela". The Gulf
     of Aden is the Houthis' sea (Red Sea theatre), not the Iran war's. */
  function thOfSea(ll) {
    var la = ll[0], lo = ll[1];
    if (lo > 30 && lo < 44 && la > 10 && la < 30) return 'redsea';
    if (lo >= 44 && lo < 51.5 && la > 10 && la < 16) return 'redsea';          // the Gulf of Aden, out to Socotra's west
    if (lo >= 44 && lo < 80 && la > -10 && la < 32) return 'gulf';
    if (lo > 20 && lo <= 36 && la > 30 && la < 38) return 'levant';
    if (lo > 95 || lo < -165) return 'pacific';          // the western Pacific, past Midway; Hawaii is home
    if (lo >= -100 && lo < -30 && la < 24) return 'americas';          // the Caribbean and South America, not the US coasts
    if (lo < -30) return '';          // the US coasts, Hawaii, the western Atlantic: home waters
    return 'europe';
  }

  /* ------------------------------------------------------------ which news names which site */
  function words(it) { return (it.t || '') + ' ' + (it.n || '') + ' ' + (R.fullText ? (R.fullText(it) || '') : ''); }
  function km(a, b) {
    var r = Math.PI / 180, dla = (b[0] - a[0]) * r, dlo = (b[1] - a[1]) * r;
    var h = Math.sin(dla / 2) * Math.sin(dla / 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dlo / 2) * Math.sin(dlo / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  var NEAR_KM = 60;
  /* GROUPS (23 Oct 2026). Measured that day: of 442 items only 3 headlines named one site, because the war's news names
     sites as a GROUP ("Iran threatens to attack US military bases", "plans to target Iranian nuclear sites"). Such a story
     is connected to the group, never counted on one site's mark (that would put the same gold count on thirty bases): the
     profile of each member lists it as "about US bases in the region", the Forces tab lists the group, and ?mil=g:<key>
     shows its stories. [key, name, pattern, context pattern or null, which sites are members] */
  var GULFCTX = /\b(iran\w*|tehran|irgc|middle east|mideast|the region|gulf|hormuz|iraq\w*|syria\w*|qatar\w*|bahrain\w*|kuwait\w*|saudi\w*|emirat\w*|uae|jordan\w*|centcom)\b/i;
  var GROUPS = [
    ['usbases', T('US bases in the region'), /\b(u\.?s\.?|us|american|america's)\s+(military\s+)?(bases?|troops|forces|personnel|military installations?)\b/i, GULFCTX,
      function (a) { return a._t === 'site' && a.o === 'US' && ['gulf', 'levant', 'redsea'].indexOf(a.th) >= 0; }],
    ['usfleet', T('US warships near Iran'), /\b(aircraft carriers?|carrier strike groups?|warships?|destroyers?|naval blockade|blockade)\b/i, GULFCTX,
      function (a) { return a._t === 'ship' && ['gulf', 'redsea', 'levant'].indexOf(a.th) >= 0; }],
    ['irnuke', T('Iran\'s nuclear sites'), /\bnuclear\s+(sites?|facilit\w+|program\w*|plants?)\b|\benrichment\b|\b(enriched\s+)?uranium\b/i, /\biran\w*\b|\btehran\b/i,
      function (a) { return a.o === 'IR' && a.k === 'nuclear'; }],
    ['irnavy', T('Iran\'s navy and IRGC Navy'), /\birgc[- ]?n(avy)?\b|\biranian navy\b|\birgc naval\b|\biran's navy\b|\bfast boats?\b/i, null,
      function (a) { return a.o === 'IR' && a.k === 'naval'; }],
    ['iroil', T('Iran\'s oil and gas'), /\boil (exports?|terminals?|fields?|facilit\w+|tankers?)\b|\bshadow fleet\b|\btankers?\b|\brefiner\w+\b/i, /\biran\w*\b|\bkharg\b|\bhormuz\b/i,
      function (a) { return a.o === 'IR' && a.k === 'oil'; }],
    ['ilbases', T('Israel\'s air bases'), /\bisraeli (air ?)?bases?\b|\b(air ?)?bases? in israel\b|\bidf bases?\b/i, null,
      function (a) { return a.o === 'IL' && a.k === 'air'; }],
    ['hz', T('Hezbollah'), /\bhezbollah\b|\bhizbullah\b/i, null, function (a) { return a.o === 'HZ'; }],
    ['ht', T('The Houthis'), /\bhouthis?\b|\bansar ?allah\b/i, null, function (a) { return a.o === 'HT'; }],
    ['iqm', T('Iran-backed Iraqi militias'), /\biraqi militias?\b|\bkata'?ib hezbollah\b|\bpopular mobili[sz]ation\b|\bislamic resistance in iraq\b/i, null, function (a) { return a.o === 'IQM'; }]
  ];
  var GBY = {}, GNEWS = {}, GOF = {};          // GBY: key -> group; GNEWS: key -> stories; GOF: site id -> its group keys
  GROUPS.forEach(function (g) { GBY[g[0]] = g; });
  // the same groups in Persian headlines (g[5] the pattern, g[6] the context), only where the room has a config
  function fp(ws) { return new RegExp('(?:^|[^' + FL + '])(?:' + ws.map(nozw).join('|') + ')'); }          // a stem: the ending may run on
  var FA_IR = fp(['ایران', 'تهران', 'جمهوری اسلامی', 'سپاه', 'رژیم']);
  var FA_GULF = fp(['ایران', 'تهران', 'جمهوری اسلامی', 'سپاه', 'خاورمیانه', 'منطقه', 'خلیج فارس', 'هرمز', 'عراق', 'سوریه', 'قطر', 'بحرین', 'کویت', 'عربستان', 'امارات', 'اردن', 'سنتکام']);
  if (IU) [
    ['usbases', fp(['پایگاه‌های آمریکا', 'پایگاه‌های نظامی آمریکا', 'پایگاه‌های آمریکایی', 'نیروهای آمریکایی', 'نیروهای آمریکا', 'سربازان آمریکایی']), FA_GULF],
    ['usfleet', fp(['ناو هواپیمابر', 'ناوهای هواپیمابر', 'ناوگروه', 'ناوشکن', 'ناوهای جنگی', 'کشتی‌های جنگی آمریکا', 'محاصرهٔ دریایی', 'محاصره دریایی']), FA_GULF],
    ['irnuke', fp(['تأسیسات هسته‌ای', 'تاسیسات هسته‌ای', 'سایت‌های هسته‌ای', 'برنامهٔ هسته‌ای', 'برنامه هسته‌ای', 'غنی‌سازی', 'اورانیوم']), FA_IR],
    ['irnavy', fp(['نیروی دریایی سپاه', 'نیروی دریایی ارتش', 'قایق‌های تندرو']), null],
    ['iroil', fp(['صادرات نفت', 'پایانهٔ نفتی', 'پایانه نفتی', 'نفتکش', 'ناوگان سایه', 'پالایشگاه', 'میدان نفتی', 'میدان گازی']), fp(['ایران', 'جمهوری اسلامی', 'خارک', 'هرمز'])],
    ['ilbases', fp(['پایگاه‌های اسرائیل', 'پایگاه هوایی اسرائیل', 'پایگاه‌های هوایی اسرائیل', 'پایگاه‌های ارتش اسرائیل']), null],
    ['hz', fp(['حزب‌الله']), null],
    ['ht', fp(['حوثی', 'انصارالله']), null],
    ['iqm', fp(['شبه‌نظامیان عراقی', 'گروه‌های نیابتی عراق', 'کتائب حزب‌الله', 'حشد الشعبی', 'حشدالشعبی', 'مقاومت اسلامی عراق']), null]
  ].forEach(function (x) { var g = GBY[x[0]]; if (g) { g[5] = x[1]; g[6] = x[2]; } });
  function inGroup(g, w, wf) { return (g[2].test(w) && (!g[3] || g[3].test(w))) || (!!g[5] && g[5].test(wf) && (!g[6] || g[6].test(wf))); }
  function groupsOf(a) { return GOF[a.id] || []; }
  function match() {
    var its = R.items(), key = R.lens() + ':' + its.length + ':' + (its[0] ? its[0].id : '') + ':' + (its.length ? its[its.length - 1].id : '');
    if (key === MKEY) return false;
    MKEY = key; NEWS = {}; NEAR = {}; OF_ITEM = {}; GNEWS = {}; GOF = {};
    var all = ASSETS.concat(SHIPS), sites = ASSETS;
    GROUPS.forEach(function (g) { all.forEach(function (a) { if (g[4](a)) (GOF[a.id] = GOF[a.id] || []).push(g[0]); }); });
    its.forEach(function (it) {
      var w = words(it), wf = nozw(w), hit1 = [];
      all.forEach(function (a) { if ((a._rx && a._rx.test(w)) || (a._rxf && a._rxf.test(wf))) { (NEWS[a.id] = NEWS[a.id] || []).push(it); hit1.push(a.id); } });
      GROUPS.forEach(function (g) {
        if (inGroup(g, w, wf) && all.some(g[4])) { (GNEWS[g[0]] = GNEWS[g[0]] || []).push(it); hit1.push('g:' + g[0]); }
      });
      if (hit1.length) OF_ITEM[it.id] = hit1;
      // placed near a site: only a place smaller than a country (a city, a base), never a country's middle
      var p = R.place(it.p);
      if (p && p.name !== p.country && isFinite(p.lat)) sites.forEach(function (a) {
        if (hit1.indexOf(a.id) < 0 && km([p.lat, p.lon], a.ll) <= NEAR_KM) (NEAR[a.id] = NEAR[a.id] || []).push(it);
      });
    });
    var byHot = function (x, y) { return (isPast(x) - isPast(y)) || ((y.hot || 0) - (x.hot || 0)) || String(y.d || '').localeCompare(String(x.d || '')); };          // an anniversary after the real news
    Object.keys(NEWS).forEach(function (k) { NEWS[k].sort(byHot); });
    Object.keys(NEAR).forEach(function (k) { NEAR[k].sort(byHot); });
    Object.keys(GNEWS).forEach(function (k) { GNEWS[k].sort(byHot); });
    NAMED_N = Object.keys(NEWS).length + Object.keys(GNEWS).length;
    all.forEach(function (a) {
      var e = EL[a.id]; if (!e) return;
      var n = (NEWS[a.id] || []).length;
      e.classList.toggle('news', n > 0);
      e.classList.toggle('hot', n >= 3 || (NEWS[a.id] || []).some(function (it) { return (it.hot || 0) >= 70; }));
      var b = e.querySelector('.irf-n'); if (b) b.textContent = n ? (n > 99 ? N(99) + '+' : N(n)) : '';
    });
    R.map.redraw();
    return true;
  }
  function passMil(it, v) {
    var ids = OF_ITEM[it.id] || [];
    if (v === 'any') return ids.length > 0;
    if (v.indexOf('g:') === 0) return ids.indexOf(v) >= 0;
    if (v.indexOf('th:') === 0) {
      var th = v.slice(3);
      return ids.some(function (id) {
        if (id.indexOf('g:') === 0) { var g = GBY[id.slice(2)]; return !!g && ASSETS.concat(SHIPS).some(function (a) { return a.th === th && g[4](a); }); }
        return BYID[id] && BYID[id].th === th;
      });
    }
    if (ids.indexOf(v) >= 0) return true;
    return (NEAR[v] || []).indexOf(it) >= 0;
  }
  function milLabel(v) {
    if (v === 'any') return T('Military news');
    if (v.indexOf('g:') === 0) return T('Military news: {what}', { what: GBY[v.slice(2)] ? GBY[v.slice(2)][1] : v.slice(2) });
    if (v.indexOf('th:') === 0) return T('Military news: {what}', { what: TH[v.slice(3)] || v.slice(3) });
    return T('Military site: {name}', { name: BYID[v] ? L(BYID[v], 'n') : v });
  }

  /* CONFLICTS (23 Oct 2026, Armin: "If I want to see news and military assets related to the current Iran conflict, I
     should be able to do that ... the Ukraine conflict ... Iran plus the Houthi one ... intuitive, easy to use, and doesn't
     make it confusing"). ONE control: the chip on the map. Tap it, tick one conflict or several, and everything follows at
     once: the stories (list and map), the military sites (only that conflict's, its smaller ones too), the betting odds,
     and the map frames it. It lives in the address (?war=gulf,redsea) with a pill like every other filter, so a link opens
     the same view. A conflict is one of the builder's theatres, so the Pulse, the markets and the sites need no second
     list. A story is in a conflict when its own words name it (rx), when it is placed in one of the conflict's countries
     (c), or when it names one of that conflict's military sites. */
  var CF = {
    gulf: { rx: /\b(iran\w*|tehran|irgc|khamenei|hormuz|kharg|fordow|natanz|persian gulf|gulf of oman|islamic republic)\b/i, c: ['Iran'] },
    redsea: { rx: /\b(houthis?|ansar ?allah|yemen\w*|red sea|bab[- ]?(el|al)[- ]?mandab|sanaa|hodeidah|aden)\b/i, c: ['Yemen'] },
    levant: { rx: /\b(gaza\w*|hamas|hezbollah|leban\w*|beirut|west bank|idf|netanyahu|israel\w*)\b/i, c: ['Israel', 'Palestine', 'Lebanon'] },
    europe: { rx: /\b(ukrain\w*|kyiv|kiev|zelensk\w*|donbas|donetsk|luhansk|zaporizhzhia|kharkiv|crimea\w*|kremlin|putin|russia\w*)\b/i, c: ['Ukraine'] },
    pacific: { rx: /\b(taiwan\w*|south china sea|beijing|xi jinping|chinese military|pla navy|north korea\w*|pyongyang|kim jong[- ]un)\b/i, c: ['Taiwan', 'North Korea'] },
    southasia: { rx: /\b(india|indian|indians|india's|pakistan\w*|kashmir\w*|modi|islamabad|new delhi)\b/i, c: ['India', 'Pakistan'] },          // never "india\w*": it took Indiana
    americas: { rx: /\b(venezuel\w*|maduro|caracas|cartels?|boat strikes?)\b/i, c: ['Venezuela'] }
  };
  var CF_ORDER = ['gulf', 'redsea', 'levant', 'europe', 'pacific', 'southasia', 'americas'];
  var DEFW = Array.isArray(CFG.forcesWars) ? CF_ORDER.filter(function (k) { return CFG.forcesWars.indexOf(k) >= 0; }) : [];
  /* Persian headlines (Iran Uncensored's feed is two-thirds Persian): the same conflicts and groups in Persian words, whole
     words, the half space taken out first. Only where the room has a config: Liberty Politics' matching stays as it was. */
  function fw(ws) { return new RegExp('(?:^|[^' + FL + '])(?:' + ws.map(nozw).join('|') + ')(?![' + FL + '])'); }
  if (IU) {
    CF.gulf.fa = fw(['ایران', 'ایرانی', 'تهران', 'سپاه', 'خامنه‌ای', 'هرمز', 'خارک', 'فردو', 'نطنز', 'خلیج فارس', 'دریای عمان', 'جمهوری اسلامی']);
    CF.redsea.fa = fw(['حوثی', 'حوثی‌ها', 'انصارالله', 'یمن', 'یمنی', 'دریای سرخ', 'باب‌المندب', 'صنعا', 'الحدیده', 'حدیده', 'عدن']);
    CF.levant.fa = fw(['غزه', 'حماس', 'حزب‌الله', 'لبنان', 'لبنانی', 'بیروت', 'کرانهٔ باختری', 'کرانه باختری', 'نتانیاهو', 'اسرائیل', 'اسرائیلی', 'ارتش اسرائیل']);
    CF.europe.fa = fw(['اوکراین', 'اوکراینی', 'کی‌یف', 'کییف', 'زلنسکی', 'دونباس', 'دونتسک', 'لوهانسک', 'زاپوریژیا', 'خارکیف', 'کریمه', 'کرملین', 'پوتین', 'روسیه', 'روسی']);
    CF.pacific.fa = fw(['تایوان', 'دریای چین جنوبی', 'پکن', 'شی جین‌پینگ', 'ارتش چین', 'کرهٔ شمالی', 'کره شمالی', 'پیونگ‌یانگ', 'کیم جونگ اون']);
    CF.southasia.fa = fw(['هند', 'هندی', 'پاکستان', 'پاکستانی', 'کشمیر', 'مودی', 'اسلام‌آباد', 'دهلی نو']);
    CF.americas.fa = fw(['ونزوئلا', 'ونزوئلایی', 'مادورو', 'کاراکاس', 'کارتل', 'کارتل‌ها']);
  }
  function wars() { var v = R.filterOn('war'); return v ? v.split(',').filter(function (k) { return CF[k]; }) : []; }
  function inWar(it, k) {
    var c = CF[k]; if (!c) return false;
    if (c.rx.test(words(it))) return true;
    if (c.fa && c.fa.test(nozw(words(it)))) return true;
    var p = R.place(it.p); if (p && c.c.indexOf(p.country) >= 0) return true;
    return (OF_ITEM[it.id] || []).some(function (id) { return BYID[id] && BYID[id].th === k; });
  }
  function passWar(it, v) { return v === 'all' || String(v).split(',').some(function (k) { return inWar(it, k); }); }
  function warLabel(v) { return v === 'all' ? T('Every conflict') : String(v).split(',').map(function (k) { return TH[k] || k; }).join(' + '); }
  function setWars(list, quiet) {
    list = CF_ORDER.filter(function (k) { return list.indexOf(k) >= 0; });
    if (!ON && list.length) setOn(true);
    R.filter('war', list.length ? list.join(',') : DEFW.length ? 'all' : '');
    chipText();
    if (!quiet && list.length) frameWars(list);
    if ($('irf-tab') && R.tabOn() === 'forces') drawTab();
  }
  function frameWars(list) {          // the conflicts' main sites set the frame; the farthest outliers (Diego Garcia) do not
    var pts = [];
    list.forEach(function (th) {
      var p = ASSETS.filter(function (a) { return a.th === th && a.tier !== 2; }).map(function (a) { return [a.ll[1], a.ll[0]]; });
      if (p.length > 4) {
        var cy = p.reduce(function (s, q) { return s + q[1]; }, 0) / p.length, cx = p.reduce(function (s, q) { return s + q[0]; }, 0) / p.length;
        p = p.map(function (q) { return { p: q, d: km([cy, cx], [q[1], q[0]]) }; }).sort(function (x, y) { return x.d - y.d; })
          .slice(0, Math.ceil(p.length * 0.85)).map(function (o) { return o.p; });
      }
      pts = pts.concat(p);
    });
    if (pts.length) setTimeout(function () { R.map.fit(pts, 1.4, 12); }, 0);          // after the room frames its own list
  }
  function pulseOf(k) { return (D.pulse || []).filter(function (p) { return p.th === k; })[0] || null; }
  // the level's word and the measurement in the page's words (the builder writes them in English: intel_forces.py
  // word_of() and why_of(), the same numbers). The rows' "top" story ids are not read here, so a room without those
  // stories (Iran Uncensored) loses nothing.
  var LVW = { Calm: T('Calm'), Watch: T('Watch'), Elevated: T('Elevated'), High: T('High'), Critical: T('Critical') };
  function lvWord(p) { return LVW[p.word] || p.word; }
  function pulseWhy(p) {
    if (!IU) return p.why || '';
    var n = +p.now || 0, s = n === 1 ? T('1 war story in the last 24 hours') : T('{n} war stories in the last 24 hours', { n: N(n) });
    if (p.prev == null) return T('{what} (no count from yesterday yet).', { what: s });
    if (n > p.prev) return T('{what}, up from {n} the day before.', { what: s, n: N(p.prev) });
    if (n < p.prev) return T('{what}, down from {n} the day before.', { what: s, n: N(p.prev) });
    return T('{what}, the same as the day before.', { what: s });
  }
  function lvClass(p) { return 'lv' + Math.min(4, Math.floor(((p && p.lvl) || 0) / 20)); }
  // the picker: every conflict with how hot it is today, tap to add or take away; the map and the list move behind it
  function warPicker() {
    var on = wars(), its = R.items();
    var rows = CF_ORDER.slice().sort(function (a, b) { return ((pulseOf(b) || {}).lvl || 0) - ((pulseOf(a) || {}).lvl || 0); }).map(function (k) {
      var p = pulseOf(k), n = its.filter(function (it) { return inWar(it, k); }).length, ns = ASSETS.filter(function (a) { return a.th === k; }).length + SHIPS.filter(function (s) { return s.th === k && !s._nomap; }).length;
      var tr = !p || p.prev == null ? '' : p.now > p.prev ? ' · <span class="up">' + esc(T('rising')) + '</span>' : p.now < p.prev ? ' · <span class="dn">' + esc(T('easing')) + '</span>' : ' · ' + esc(T('holding'));
      var sel = on.indexOf(k) >= 0;
      return '<li><button type="button" class="irf-war' + (sel ? ' on' : '') + '" data-irf-war="' + k + '" aria-pressed="' + (sel ? 'true' : 'false') + '">' +
        '<span class="irf-war-box" aria-hidden="true"></span>' + (p ? gauge(p) : '') +
        '<span class="irf-war-t"><b>' + esc(TH[k]) + '</b><small>' + (p ? '<span class="irf-pc-w ' + lvClass(p) + '">' + esc(lvWord(p)) + '</span> · ' : '') + esc((n === 1 ? T('1 story now') : T('{n} stories now', { n: N(n) })) + ' · ' + T('{n} military sites', { n: N(ns) })) + tr + '</small></span></button></li>';
    }).join('');
    showDlg('<div class="ir-s-top"><span>' + esc(T('Conflicts')) + '</span><button class="ir-s-x" type="button" data-irf-x aria-label="' + esc(T('Close')) + '">&times;</button></div>' +
      '<h2 id="irf-dlg-t" class="irf-h">' + esc(T('Which conflicts?')) + '</h2><p class="irf-note">' + esc(T('Tick one or several. The stories, the military sites, the odds and the map all follow. Hottest first: how many war stories the room carries today against yesterday.')) + '</p>' +
      '<ul class="irf-wars">' + rows + '</ul><div class="ir-s-a"><button class="ir-s-open" type="button" data-irf-x>' + (on.length ? esc(T('Show {what}', { what: warLabel(on.join(',')) })) : esc(T('Done'))) + '</button>' +
      (on.length ? '<button class="ir-s-b" type="button" data-irf-allwars>' + esc(T('Show every conflict')) + '</button>' : '') + '</div>');
  }

  /* ------------------------------------------------------------ the marks */
  function build() {
    gL = document.createElementNS(SVGNS, 'g'); gL.setAttribute('class', 'irf-lines');
    g = document.createElementNS(SVGNS, 'g'); g.setAttribute('class', 'irf');
    /* UNDER the news marks (23 Oct 2026): a site's mark once sat on a news circle and hid its count. Now the news is always
       on top, and draw() moves any site that would sit under a circle out to its rim, with a thin line back to where it
       really is, so both stay readable. */
    var pins = R.map.pins && R.map.pins();
    if (pins && pins.parentNode === R.map.svg) { R.map.svg.insertBefore(gL, pins); R.map.svg.insertBefore(g, pins); }
    else { R.map.svg.appendChild(gL); R.map.svg.appendChild(g); }
    var html = '';
    ASSETS.concat(SHIPS).forEach(function (a) {
      var ship = a._t === 'ship', k = ship ? (a.k === 'amphib' ? 'amphib' : 'carrier') : a.k;
      html += '<g class="irf-m' + (ship ? ' ship' + (AGE != null && AGE > STALE ? ' old' : '') + (a.pr === 'area' ? ' rough' : '') : '') + ' t' + (a.tier || 1) + '" data-irf="' + esc(a.id) + '" style="--c:' + colOf(a) + '" display="none">' +
        (ship ? '<circle class="irf-area" r="17"/>' : '') + '<circle class="irf-ring" r="14"/>' +
        '<rect class="irf-b" x="-10" y="-10" width="20" height="20" rx="' + (ship ? 10 : 4.5) + '"/>' + sym(k, ' transform="scale(.92)"') +
        '<g class="irf-nb" transform="translate(10 -10)"><circle r="7.5"/><text class="irf-n"></text></g>' +
        '<text class="irf-lb" y="22">' + esc(ship ? (a.hull || L(a, 'n')) : shortName(a)) + '</text><text class="irf-more" x="12" y="13"></text></g>';
    });
    g.innerHTML = html;
    [].forEach.call(g.childNodes, function (e) { EL[e.getAttribute('data-irf')] = e; });
    var z = $('ir-zoom'), full = z && z.querySelector('.ir-z-full');
    if (z && !z.querySelector('.irf-z')) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'irf-z'; b.id = 'irf-z';
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6v5.6c0 4.6 3.2 8 7.5 9.4 4.3-1.4 7.5-4.8 7.5-9.4V6z"/><path d="m8.6 12 2.4 2.4 4.6-4.8"/></svg>';
      b.addEventListener('click', function () { setOn(!ON); });
      if (full) z.insertBefore(b, full); else z.appendChild(b);
    }
    setOn(ON, true);
  }
  function shortName(a) {
    if (FA && a.n_fa) return String(a.n_fa).replace(/^(پایگاه (هوایی|دریایی|موشکی|نظامی|زمینی)|تأسیسات هسته‌ای|سایت هسته‌ای) /, '');          // the map's label: the name, not the kind
    return String(a.n).replace(/\s+(Air Base|Air Force Base|Naval Base|Naval Station|Military Base|Airbase)$/i, '').replace(/^(Naval Support Activity|Naval Station|Naval Air Station)\s+/i, ''); }
  function setOn(v, quiet) {
    ON = !!v; store('ir-forces', ON ? 'on' : 'off');
    var b = $('irf-z');
    if (b) { b.setAttribute('aria-pressed', ON ? 'true' : 'false'); b.setAttribute('aria-label', ON ? T('Hide the military sites') : T('Show the military sites')); b.title = ON ? T('Military sites: on') : T('Military sites: off'); }
    if (g) g.style.display = ON ? '' : 'none';
    if (gL) gL.style.display = ON ? '' : 'none';
    if (!quiet) R.map.redraw();
    var t = $('irf-on'); if (t) t.setAttribute('aria-pressed', ON ? 'true' : 'false');
  }
  // which sites to draw now: tier 1 always, tier 2 once zoomed in or when its theatre or itself is picked
  function wants(a, v, mil, ws) {
    if (a._nomap) return false;
    if (FOCUS === a.id || mil === a.id) return true;
    if (ws.length && ws.indexOf(a.th) < 0) return false;          // a conflict picked: only its sites
    if (a.tier !== 2) return true;
    if (v.k >= 2.6 || ws.length) return true;          // a conflict picked shows its smaller sites too
    if (mil && mil === 'th:' + a.th) return true;
    return (NEWS[a.id] || []).length > 0;          // a tier 2 site in today's news is shown too
  }
  function prio(a) { return (a.id === FOCUS ? 1e6 : 0) + (NEWS[a.id] || []).length * 100 + (a._t === 'ship' ? 60 : 0) + (a.tier === 2 ? 0 : 40) + (a.k === 'nuclear' ? 10 : 0); }
  function draw() {
    if (!g || !ON) { DRAWN = []; return; }
    var PJ = R.map.proj(); if (!PJ) return;
    var v = R.map.view(), mil = R.filterOn('mil'), ws = wars(), cand = [];
    ASSETS.concat(SHIPS).forEach(function (a) {
      var e = EL[a.id]; if (!e) return;
      if (!wants(a, v, mil, ws) || !R.map.seen(a.ll[1], a.ll[0])) { if (e._on) { e.setAttribute('display', 'none'); e._on = 0; } return; }
      var s = PJ([a.ll[1], a.ll[0]]);
      if (!s || !isFinite(s[0]) || s[0] < -30 || s[1] < -30 || s[0] > v.w + 30 || s[1] > v.h + 30) { if (e._on) { e.setAttribute('display', 'none'); e._on = 0; } return; }
      cand.push({ a: a, x: s[0], y: s[1], x0: s[0], y0: s[1], p: prio(a), e: e });
    });
    clearOfNews(cand);
    cand.sort(function (x, y) { return y.p - x.p; });
    var shownM = [], gap = v.w < 520 ? 17 : 19;
    cand.forEach(function (c) {
      for (var i = 0; i < shownM.length; i++) { var o = shownM[i]; if (Math.abs(o.x - c.x) < gap && Math.abs(o.y - c.y) < gap) { o.near.push(c.a); hide(c.e); return; } }
      c.near = []; shownM.push(c);
    });
    var lbK = v.w < 520 ? 4.2 : 3.2;
    // a name is drawn only where it has room: never over another site's mark or another name (most important first)
    var boxes = shownM.map(function (c) { return [c.x - 11, c.y - 11, c.x + 11, c.y + 11]; });
    var free = function (r) { for (var i = 0; i < boxes.length; i++) { var q = boxes[i]; if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) return false; } return true; };
    shownM.forEach(function (c) {
      var e = c.e;
      e.setAttribute('transform', 'translate(' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) + ')');
      if (!e._on) { e.setAttribute('display', 'inline'); e._on = 1; }
      var want = c.a.id === FOCUS || (c.a._t === 'ship' && v.k >= 1.4) || (v.k >= lbK && (c.a.tier !== 2 || v.k >= lbK * 1.8));
      var lw = (c.a._t === 'ship' ? (c.a.hull || L(c.a, 'n')) : shortName(c.a)).length * 6.1 + 6, lr = [c.x - lw / 2, c.y + 12, c.x + lw / 2, c.y + 26];
      var lb = want && (c.a.id === FOCUS || free(lr));
      if (lb) boxes.push(lr);
      if (e._lb !== lb) { e.classList.toggle('lb', lb); e._lb = lb; }
      var mt = c.near.length ? '+' + N(c.near.length) : '';
      if (e._mt !== mt) { e.querySelector('.irf-more').textContent = mt; e._mt = mt; }
      if (e._f !== (c.a.id === FOCUS)) { e.classList.toggle('focus', c.a.id === FOCUS); e._f = c.a.id === FOCUS; }
    });
    DRAWN = shownM;
    drawLines(PJ, v);
  }
  function hide(e) { if (e._on) { e.setAttribute('display', 'none'); e._on = 0; } }
  /* A site under a news circle goes out to the circle's rim, on the side it really lies (straight out from the circle's
     middle), and keeps a thin line back to its true place. Twice, so a site pushed out of one circle into the next is
     pushed out of that one too. Sites pushed to the same spot then merge into one mark with "+N", like any crowd. */
  function clearOfNews(cand) {
    var ms = R.map.marks ? (R.map.marks() || []) : [];
    if (!ms.length) return;
    var inside = function (x, y) { for (var i = 0; i < ms.length; i++) if (Math.hypot(x - ms[i].x, y - ms[i].y) < ms[i].r + 11) return true; return false; };
    cand.forEach(function (c, ci) {
      for (var pass = 0; pass < 6 && inside(c.x, c.y); pass++) ms.forEach(function (m) {
        var dx = c.x - m.x, dy = c.y - m.y, d = Math.hypot(dx, dy), need = m.r + 12;
        if (d >= need) return;
        if (d < 0.5) { var ang = (ci * 2.39996) % (2 * Math.PI); dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
        c.x = m.x + dx / d * need; c.y = m.y + dy / d * need; c.moved = true;
      });
      if (!inside(c.x, c.y)) return;
      // circles that touch can box a site in (measured 23 Oct 2026: Al Udeid between Doha's and the Gulf's): step out
      // from the middle of the circles it is in, along one line, until it is clear of every one
      var hit = ms.filter(function (m) { return Math.hypot(c.x0 - m.x, c.y0 - m.y) < m.r + 40; });
      var mx = 0, my = 0; hit.forEach(function (m) { mx += m.x; my += m.y; }); mx /= hit.length || 1; my /= hit.length || 1;
      var ux = c.x0 - mx, uy = c.y0 - my, ul = Math.hypot(ux, uy);
      if (ul < 0.5) { ux = Math.cos(ci * 2.39996); uy = Math.sin(ci * 2.39996); ul = 1; }
      ux /= ul; uy /= ul;
      for (var t = 0; t < 400; t += 4) { var x = c.x0 + ux * t, y = c.y0 + uy * t; if (!inside(x, y)) { c.x = x; c.y = y; c.moved = true; return; } }
    });
  }
  // from the site in focus to every place its news comes from: the news "connected to it"
  function drawLines(PJ, v) {
    if (!gL) return;
    // the leaders: from a mark moved off a news circle back to where the site really is (under the circle)
    var ld = '';
    DRAWN.forEach(function (c) { if (c.moved) ld += 'M' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) + 'L' + c.x0.toFixed(1) + ' ' + c.y0.toFixed(1); });
    var lead = ld ? '<path class="irf-ld" d="' + ld + '"/>' : '';
    var a = FOCUS ? BYID[FOCUS] : (R.filterOn('mil') && BYID[R.filterOn('mil')]) || null;
    if (a && a._nomap) a = null;
    if (!a) { if (gL._h !== lead) { gL.innerHTML = lead; gL._h = lead; } LINES = []; return; }
    var s0 = R.map.seen(a.ll[1], a.ll[0]) ? PJ([a.ll[1], a.ll[0]]) : null, seenP = {}, d = '';
    if (!s0) { if (gL._h !== lead) { gL.innerHTML = lead; gL._h = lead; } return; }
    (NEWS[a.id] || []).concat(NEAR[a.id] || []).forEach(function (it) {
      var p = R.place(it.p); if (!p || !isFinite(p.lat) || seenP[it.p]) return;
      seenP[it.p] = 1;
      if (km([p.lat, p.lon], a.ll) < 25 || !R.map.seen(p.lon, p.lat)) return;
      var s1 = PJ([p.lon, p.lat]); if (!s1 || !isFinite(s1[0])) return;
      var mx = (s0[0] + s1[0]) / 2, my = (s0[1] + s1[1]) / 2 - Math.min(80, Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) * 0.25);
      d += 'M' + s0[0].toFixed(1) + ' ' + s0[1].toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + s1[0].toFixed(1) + ' ' + s1[1].toFixed(1);
    });
    var html = lead + (d ? '<path class="irf-ln-g" d="' + d + '"/><path class="irf-ln" d="' + d + '" style="stroke:' + colOf(a) + '"/>' : '');
    if (gL._h !== html) { gL.innerHTML = html; gL._h = html; }
  }
  function hit(x, y) {
    if (!ON) return null;
    var best = null, bd = 14;
    DRAWN.forEach(function (c) { var dd = Math.hypot(c.x - x, c.y - y); if (dd < bd) { bd = dd; best = c; } });
    return best ? { x: best.x, y: best.y, a: best.a, near: best.near.slice() } : null;
  }
  function hitEl(el) {
    var m = el && el.closest && el.closest('.irf-m');
    if (!m) return null;
    var id = m.getAttribute('data-irf');
    for (var i = 0; i < DRAWN.length; i++) if (DRAWN[i].a.id === id) return { x: DRAWN[i].x, y: DRAWN[i].y, a: DRAWN[i].a, near: DRAWN[i].near.slice() };
    return null;
  }
  function kindName(a) { return (KIND[a._t === 'ship' ? (a.k === 'amphib' ? 'amphib' : 'carrier') : a.k] || KIND.army)[0]; }
  /* A SHIP'S POSITION IN WORDS, always with how exact it is and how old: "In port at Sasebo", "Left Yokosuka, at sea",
     "Somewhere in the Arabian Sea", or no place at all. Never a bare point that reads as a live position. */
  function shipWhere(s) {
    if (IU) return shipWhereT(s);
    if (s.pr === 'none' || !s.ll) return (s.area ? s.area + ', ' : '') + 'no position published';
    if (s.pr === 'area') return 'Somewhere in the ' + String(s.area).replace(/^the /i, '');
    return s.area || '';
  }
  /* Iran Uncensored: the same line from its parts, in the page's words. The builder writes "area" in English every week
     (intel_forces.py place_of(): "In port at X", "Near X", "Left X, at sea", a sea's name, or USNI's own section name), so
     the place is taken out of it and named from the forces file's places_fa (site-iu/data/forces-fa.json "places"); a
     place it does not know stays in its own letters, kept whole. */
  function placeT(x) {
    x = String(x || '').replace(/^the /i, '').trim();
    var pf = FA && D.places_fa && typeof D.places_fa === 'object' ? D.places_fa : null, k = x.toLowerCase();
    return pf && typeof pf[k] === 'string' ? pf[k] : x;
  }
  function shipWhereT(s) {
    var ar = String(L(s, 'area') || ''), m;
    if (FA && s.area_fa) return s.pr === 'none' || !s.ll ? T('{place}, no position published', { place: s.area_fa }) : s.area_fa;
    if (s.pr === 'none' || !s.ll) return ar ? T('{place}, no position published', { place: placeT(ar) }) : T('No position published');
    if (s.pr === 'area') return T('Somewhere in the {place}', { place: placeT(ar) });
    if ((m = /^In port at (.+)$/i.exec(ar))) return T('In port at {place}', { place: placeT(m[1]) });
    if ((m = /^Left (.+), at sea$/i.exec(ar))) return T('Left {place}, at sea', { place: placeT(m[1]) });
    if ((m = /^Near (.+)$/i.exec(ar))) return T('Near {place}', { place: placeT(m[1]) });
    return placeT(ar);
  }
  function shipWhen(s) {
    // a story has its hour, so its age is measured ("9 hours ago"); the tracker has only a day, so its age is counted in
    // calendar days, never called "today" because of a clock's midnight
    var at = s.by ? s.by.at : D.fleet.at, src = s.by ? T('USNI News') : T('USNI Fleet Tracker');
    if (String(at).length > 10) { var ms = Date.parse(at); return T('{src}, {date}', { src: src, date: day(at) }) + (isFinite(ms) ? ' (' + agoMs(ms) + ')' : ''); }
    return T('{src}, {date}', { src: src, date: day(at) }) + (AGE == null ? '' : ' (' + ageWords(AGE) + ')');
  }
  function latestOf(a) {          // the asset's own newest news: USNI's newer stories about a ship first, then the search
    var seen = {}, out = [];
    (a.nw || []).map(function (x) { return { t: x.t, u: x.u, s: T('USNI News'), d: x.at }; }).concat(AN[a.id] || []).forEach(function (x) {
      var k = String(x.t).toLowerCase().replace(/\W+/g, ' ').slice(0, 60);
      if (!seen[k]) { seen[k] = 1; out.push(x); }
    });
    return out;
  }
  /* EVERYTHING SAID ABOUT ONE ASSET, drawn as the room draws its stories (24 Oct 2026, Armin on USS Theodore Roosevelt:
     "pages like this needs to have news items related to it (x posts, YouTube, articles etc) shown here, the same way that
     you show it on the intel room"). One list from five places, every item naming the asset: the room's own items (the
     last day and the bank, by the asset's rx), its own X search (7 days), its own YouTube search (this month) and its own
     article search (30 days) from build/intel_forces.py, and USNI's newer stories about a ship. One address or one headline
     is one row; newest first. A tap opens the room's own spotlight on it (window.IRoom.openList), stepping through what the
     reader is looking at, with "Back to <the asset>". */
  var COV = {}, COVF = {}, COVN = {}, COVS = {}, COV_STEP = 6, CUR = '', SCROLL = {};
  /* BEST FIRST (24 Oct 2026, Armin on USS George Washington: "are these really the best things"). Newest first put an
     unknown channel's video on top because it was an hour newer than Sky News'. Each item now scores by how much the
     room trusts who said it (cr: the room's own lists, build/intel_forces.py cr_of), how far it reached (likes and
     reposts on X, views on YouTube) and how fresh it is, a day costing what a tenth more reach buys. The Persian page puts
     Persian first. "Newest first" is one tap away for the latest word on where a ship is. Language is never decided
     here: every file this reads holds only what this room's readers can read (build/room_lang.py). */
  function covScore(it, a) {
    var ms = Date.parse(it.d || ''), age = isFinite(ms) ? Math.max(0, (Date.now() - ms) / 864e5) : 30;
    // about IT, not only mentioning it: a post on USS Theodore Roosevelt that names George Washington in its last line
    // ranked first on George Washington's card (24 Oct). Named in the opening words counts for a fifth of the trust scale.
    var lead = String(it.t || '').slice(0, 120), about = a && ((a._rx && a._rx.test(lead)) || (a._rxf && a._rxf.test(nozw(lead)))) ? 12 : 0;
    var cr = it.cr != null && isFinite(+it.cr) ? +it.cr : it.src === 'News' ? 55 : 50;
    var reach = it.src === 'X' ? 8 * Math.log(1 + (+it.lk || 0) + 2 * (+it.rp || 0)) / Math.LN10 : it.src === 'YouTube' || /youtu\.?be/.test(it.u || '') ? 5 * Math.log(1 + (+it.vw || 0)) / Math.LN10 : 0;
    return cr + reach + about - Math.min(30, 2.5 * age) + (FA && /[؀-ۿ]/.test(it.t || '') ? 25 : 0);
  }
  function urlKey(u) {
    u = String(u || ''); var m;
    if ((m = /(?:x|twitter)\.com\/[^\/]+\/status\/(\d+)/.exec(u))) return 'x:' + m[1];
    if ((m = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/.exec(u))) return 'yt:' + m[1];
    return u.replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase();
  }
  function titleKey(t) { return String(t || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 60); }          // every script's letters (a Japanese title is a title)
  function covKind(it) { return it.src === 'X' ? 'x' : it.src === 'YouTube' || /youtu\.?be/.test(it.u || '') ? 'yt' : it.src === 'News' ? 'news' : 'other'; }
  function names(a, it) { var w = words(it); return !!((a._rx && a._rx.test(w)) || (a._rxf && a._rxf.test(nozw(w)))); }
  function coverOf(a) {
    var lv = R.live ? R.live() : [], bk = R.bank ? R.bank() : [];
    var srt = COVS[a.id] || 'best', key = MKEY + ':' + lv.length + ':' + bk.length + ':' + srt;
    if (COV[a.id] && COV[a.id].key === key) return COV[a.id].list;
    var out = [], seenU = {}, seenT = {};
    function add(it) {
      if (!it || !it.u || !it.t) return;
      var ku = urlKey(it.u), kt = titleKey(it.t);
      if (seenU[ku] || (kt.length > 16 && seenT[kt])) return;
      seenU[ku] = 1; seenT[kt] = 1; out.push(it);
    }
    (NEWS[a.id] || []).forEach(add);
    lv.concat(bk).forEach(function (it) { if (names(a, it)) add(it); });
    (AX[a.id] || []).forEach(add);
    (AYT[a.id] || []).forEach(add);
    (a.nw || []).forEach(function (x, i) { add({ id: 'usni-' + a.id + '-' + i, t: x.t, u: x.u, src: 'News', h: T('USNI News'), dm: 'news.usni.org', d: x.at, k: 'article' }); });
    (AN[a.id] || []).forEach(function (x, i) { add({ id: 'an-' + a.id + '-' + i, t: x.t, u: x.u, src: 'News', h: x.s || '', dm: x.dm || '', d: x.d, k: 'article' }); });
    // each kind best first (or newest first), then taken in turns (an X post, a video, an article ...), the kind with the
    // best item first: one order alone filled the first screen with one kind and hid the others (USS Theodore Roosevelt, 24 Oct)
    var ms = function (it) { var v = Date.parse(it.d || ''); return isFinite(v) ? v : 0; };
    out = out.map(function (it) { return { it: it, s: srt === 'new' ? 0 : covScore(it, a), m: ms(it) }; })
      .sort(function (x, y) { return y.s - x.s || y.m - x.m; }).map(function (x) { return x.it; });
    var by = {}, order = [];
    out.forEach(function (it) { var k = covKind(it); if (!by[k]) { by[k] = []; order.push(k); } by[k].push(it); });
    var mixed = [];
    for (var r = 0; mixed.length < out.length; r++) order.forEach(function (k) { if (by[k][r]) mixed.push(by[k][r]); });
    COV[a.id] = { key: key, list: mixed };
    return mixed;
  }
  function covShown(a) { var f = COVF[a.id] || 'all', all = coverOf(a); return f === 'all' ? all : all.filter(function (it) { return covKind(it) === f; }); }
  function moreOn(a) {
    var q = encodeURIComponent(String(a.n || '').replace(/[^\p{L}\p{N}\s'’.-]/gu, ' ').replace(/\s+/g, ' ').trim());
    if (!q) return '';
    var ln = function (u, w) { return '<a href="' + u + '" target="_blank" rel="noopener">' + esc(w) + '</a>'; };
    return '<p class="irf-more">' + [ln('https://x.com/search?q=%22' + q + '%22&f=live', T('More on X')), ln('https://www.youtube.com/results?search_query=%22' + q + '%22', T('More on YouTube')),
      ln('https://news.google.com/search?q=%22' + q + '%22', T('More in the news'))].join('') + '</p>';
  }
  function covHtml(a) {
    var all = coverOf(a), f = COVF[a.id] || 'all', n = COVN[a.id] || COV_STEP, list = covShown(a), cnt = { all: all.length, x: 0, yt: 0, news: 0, other: 0 };
    all.forEach(function (it) { cnt[covKind(it)]++; });
    var h = '<section class="irf-sec irf-cov" id="irf-cov"><h3>' + esc(T('What is being said about it')) + '</h3>';
    if (!all.length) return h + '<p class="irf-note">' + esc(T('Nothing in the last 30 days names it yet. Searched again every few hours.')) + '</p>' + moreOn(a) + '</section>';
    var chips = [['all', T('All')], ['x', 'X'], ['yt', T('YouTube')], ['news', T('Articles')]].filter(function (c) { return c[0] === 'all' || cnt[c[0]]; });
    if (chips.length > 2) h += '<div class="irf-cfs" role="group" aria-label="' + esc(T('Show only')) + '">' + chips.map(function (c) {
      return '<button type="button" class="irf-cf" data-irf-cf="' + c[0] + '" aria-pressed="' + (f === c[0] ? 'true' : 'false') + '">' + esc(c[1]) + ' <i class="num">' + N(cnt[c[0]]) + '</i></button>';
    }).join('') + '</div>';
    if (all.length > 1) {
      var so = COVS[a.id] || 'best';
      h += '<div class="irf-cfs irf-cso" role="group" aria-label="' + esc(T('Order')) + '">' + [['best', T('Best first')], ['new', T('Newest first')]].map(function (c) {
        return '<button type="button" class="irf-cf" data-irf-cs="' + c[0] + '" aria-pressed="' + (so === c[0] ? 'true' : 'false') + '">' + esc(c[1]) + '</button>';
      }).join('') + '</div>';
    }
    h += '<ol class="irf-covl">' + list.slice(0, n).map(function (it, i) { return R.cardHtml(it, 'data-irf-cov="' + i + '"'); }).join('') + '</ol>';
    if (list.length > n) h += '<button type="button" class="ir-s-b irf-covm" data-irf-covm>' + esc(T('Show {n} more', { n: N(Math.min(10, list.length - n)) })) + '</button>';
    return h + '<p class="irf-note">' + esc(T('Every one names it: X posts from the last 7 days, videos and articles from the last 30 days, and what the room carries. Tap one to see it here.')) + '</p>' + moreOn(a) + '</section>';
  }
  function redrawCov() {
    var a = BYID[CUR], el = dlg && dlg.querySelector('#irf-cov'); if (!a || !el) return;
    var sc = keepScroll(); el.outerHTML = covHtml(a); sc();
  }
  /* PICTURES OF IT (24 Oct 2026, Armin: "there should be a picture of the thing at the top, or a couple of pictures ... If
     I say USS Tripoli ... I should see a couple of pictures of USS Tripoli"). Up to three photos from its own Wikipedia
     article (build/intel_forces.py 4b: Wikimedia Commons files only, the lead photo first, never a logo or a crest), one
     large with the others beside it to tap, the caption and the credit under it; the large one opens the file on Commons.
     A page that loads nothing from another site before a tap (CFG.light) shows a button instead. */
  var PH_OK = /^[0-9a-f]\/[0-9a-f]{2}\/[A-Za-z0-9%._~!*'()+,;=@-]+\.(?:jpe?g|png)$/i, PH_AT = {}, PH_ON = {};
  function photos(a) { return (Array.isArray(AIM[a.id]) ? AIM[a.id] : []).filter(function (p) { return Array.isArray(p) && PH_OK.test(String(p[0])); }).slice(0, 3); }
  function phUrl(p, w) { return 'https://upload.wikimedia.org/wikipedia/commons/thumb/' + p + '/' + w + 'px-' + p.split('/')[2]; }
  function phPage(p) { return 'https://commons.wikimedia.org/wiki/File:' + p.split('/')[2]; }
  function photoHtml(a) {
    var ph = photos(a); if (!ph.length) return '';
    if (R.pics && !R.pics() && !PH_ON[a.id]) return '<button type="button" class="ir-s-b irf-ph-on" data-irf-phon>' + esc(ph.length === 1 ? T('Show its picture') : T('Show its {n} pictures', { n: N(ph.length) })) + '</button>';
    var at = Math.min(PH_AT[a.id] || 0, ph.length - 1), big = ph[at], nm = L(a, 'n');
    // the small copy (the same one the row below loads) stands under the large one, so the box is never blank while it comes
    return '<figure class="irf-ph" id="irf-ph"><a class="irf-ph-big" href="' + esc(phPage(big[0])) + '" target="_blank" rel="noopener" title="' + esc(T('Open the picture full size on Wikimedia Commons')) + '" style="background-image:url(&quot;' + esc(phUrl(big[0], 330)) + '&quot;)">' +
      '<img src="' + esc(phUrl(big[0], 500)) + '" srcset="' + esc(phUrl(big[0], 500)) + ' 500w, ' + esc(phUrl(big[0], 960)) + ' 960w" sizes="(min-width: 760px) 560px, 94vw" alt="' + esc(big[1] || nm) + '" decoding="async"></a>' +
      (ph.length > 1 ? '<div class="irf-ph-row">' + ph.map(function (p, i) {
        return '<button type="button" class="irf-ph-t" data-irf-ph="' + i + '" aria-pressed="' + (i === at ? 'true' : 'false') + '" aria-label="' + esc(T('Picture {i} of {n}', { i: N(i + 1), n: N(ph.length) })) + '"><img src="' + esc(phUrl(p[0], 330)) + '" alt="" loading="lazy" decoding="async"></button>';
      }).join('') + '</div>' : '') +
      '<figcaption' + DA + '>' + (big[1] && !FA ? esc(big[1]) + ' ' : '') + '<a href="' + esc(phPage(big[0])) + '" target="_blank" rel="noopener">' + esc(T('Photo: Wikimedia Commons')) + '</a></figcaption></figure>';
  }
  function redrawPh() {
    var a = BYID[CUR], el = dlg && (dlg.querySelector('#irf-ph') || dlg.querySelector('.irf-ph-on')); if (!a || !el) return;
    var sc = keepScroll(); el.outerHTML = photoHtml(a); sc();
  }
  // newest first by date (an item with no date, or one that cannot be read, goes last); "Latest" means the newest, never
  // the best scored (24 Oct 2026)
  function msOf(it) { var v = Date.parse((it && it.d) || ''); return isFinite(v) ? v : -Infinity; }
  function newest(list) { return (list || []).slice().sort(function (x, y) { var a = msOf(x), b = msOf(y); return a === b ? 0 : b > a ? 1 : -1; }); }
  function tip(m) {
    var a = m.a, n = (NEWS[a.id] || []).length, la = newest(coverOf(a))[0];
    if (la && !isFinite(msOf(la))) la = null;          // nothing dated: no "Latest" line rather than a guess
    var sub = a._t === 'ship' ? shipWhere(a) + ' · ' + shipWhen(a) : kindName(a) + ' · ' + (OPN[a.o] || a.o) + (a.host && a.host !== 'Sea' && OPN[a.o] !== L(a, 'host') ? ' · ' + T('in {place}', { place: L(a, 'host') }) : '');
    return '<span class="tip-k" style="--pc:' + colOf(a) + '"><i class="irf-dot"></i>' + esc(a._t === 'ship' ? (a.hull || T('At sea')) : kindName(a)) + '</span>' + esc(L(a, 'n')) +
      '<small>' + esc(sub) + '.</small>' + (la ? '<small class="irf-tip-la">' + esc(T('Latest:')) + ' ' + bd(esc(la.t)) + (agoMs(msOf(la)) ? ' · ' + esc(agoMs(msOf(la))) : '') + '</small>' : '') +
      '<small>' + (n ? esc(n === 1 ? T('1 story here names it.') + ' ' : T('{n} stories here name it.', { n: N(n) }) + ' ') : '') + (m.near.length ? esc(T('+{n} more on this spot.', { n: N(m.near.length) }) + ' ') : '') + esc(T('Tap for its news.')) + '</small>';
  }
  function openMark(m) {
    if (m.near && m.near.length) { picker([m.a].concat(m.near)); return; }
    dossier(m.a.id);
  }

  /* ------------------------------------------------------------ the profile of one site (and the picker for a crowded spot) */
  var dlg = null;
  function dialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'ir-spot irf-dlg'; dlg.id = 'irf-dlg'; dlg.setAttribute('aria-labelledby', 'irf-dlg-t');
    document.body.appendChild(dlg);
    dlg.addEventListener('click', function (ev) {
      var t = ev.target, b;
      if (t === dlg) { closeDlg(); return; }
      if ((b = t.closest('[data-irf-x]'))) { closeDlg(); return; }
      if ((b = t.closest('[data-irf-site]'))) { dossier(b.getAttribute('data-irf-site')); return; }
      if ((b = t.closest('[data-irf-cov]'))) { openCov(+b.getAttribute('data-irf-cov')); return; }
      if ((b = t.closest('[data-irf-oi]'))) { openFrom(listOf(b.getAttribute('data-irf-ol') || ''), +b.getAttribute('data-irf-oi')); return; }
      if ((b = t.closest('[data-irf-cf]'))) { COVF[CUR] = b.getAttribute('data-irf-cf'); COVN[CUR] = COV_STEP; redrawCov(); return; }
      if ((b = t.closest('[data-irf-cs]'))) { COVS[CUR] = b.getAttribute('data-irf-cs'); COVN[CUR] = COV_STEP; redrawCov(); return; }
      if ((b = t.closest('[data-irf-covm]'))) { COVN[CUR] = (COVN[CUR] || COV_STEP) + 10; redrawCov(); return; }
      if ((b = t.closest('[data-irf-ph]'))) { PH_AT[CUR] = +b.getAttribute('data-irf-ph') || 0; redrawPh(); return; }
      if ((b = t.closest('[data-irf-phon]'))) { PH_ON[CUR] = 1; redrawPh(); return; }
      if ((b = t.closest('[data-irf-item]'))) { openItem(b.getAttribute('data-irf-for'), b.getAttribute('data-irf-item')); return; }
      if ((b = t.closest('[data-irf-show]'))) { var id = b.getAttribute('data-irf-show'); closeDlg(); R.filter('mil', id); R.tab('items'); listTop(); return; }
      if ((b = t.closest('[data-irf-fly]'))) { var a = BYID[b.getAttribute('data-irf-fly')]; if (a) { KEEPF = true; closeDlg(); FOCUS = a.id; FHELD = ''; R.map.fly(a._t === 'ship' ? 5 : 26, a.ll[1], a.ll[0]); R.map.redraw(); } return; }
      if ((b = t.closest('[data-irf-copy]'))) { copy(b.getAttribute('data-irf-copy'), b); return; }
      if ((b = t.closest('[data-irf-war]'))) {
        var k = b.getAttribute('data-irf-war'), on = wars(), i = on.indexOf(k), sc = keepScroll();
        if (i >= 0) on.splice(i, 1); else on.push(k);
        setWars(on); warPicker(); sc(); return;
      }
      if ((b = t.closest('[data-irf-allwars]'))) { setWars([]); warPicker(); return; }
    });
    /* The close event comes AFTER the tap that closed the dialog (24 Oct 2026): "Go to it on the map" had set FOCUS and
       this then cleared it, so the ring, the name and the lines vanished as the map arrived. KEEPF keeps that focus. A
       focus kept because a ?mil= filter is on is held by that filter (FHELD) and goes when the pill goes (onRender). */
    dlg.addEventListener('close', function () {
      if (KEEPF) { KEEPF = false; return; }
      var mil = R.filterOn('mil');
      if (mil) { if (FOCUS) FHELD = mil; return; }
      FOCUS = ''; R.map.redraw();
    });
    // a photo that will not load leaves no broken box: a small one goes, a large one takes the whole strip with it
    dlg.addEventListener('error', function (ev) {
      var im = ev.target; if (!im || im.tagName !== 'IMG') return;
      var tb = im.closest('.irf-ph-t'), f = im.closest('.irf-ph');
      if (tb) tb.hidden = true; else if (f) f.hidden = true;
    }, true);
    return dlg;
  }
  // one of the asset's items, opened in the room's spotlight; the spotlight steps through the list as filtered here
  function openCov(i) { var a = BYID[CUR]; if (a) openFrom(covShown(a), i); }
  function openFrom(list, i) {
    var a = BYID[CUR]; if (!a || !R.openList || !list || !list[i]) return;
    var inr = dlg.querySelector('.irf-in'), id = a.id;
    SCROLL[id] = [dlg.scrollTop, inr ? inr.scrollTop : 0];
    closeDlg();
    R.openList(list, i, { label: L(a, 'n'), back: function () { dossier(id, true); } });
  }
  function closeDlg() { if (dlg && dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); } }
  // a redraw of the picker after a tap keeps the reader where they were (showDlg goes back to the top)
  function keepScroll() { var d = dlg, i = d && d.querySelector('.irf-in'), a = d ? d.scrollTop : 0, b = i ? i.scrollTop : 0; return function () { if (d) d.scrollTop = a; var j = d && d.querySelector('.irf-in'); if (j) j.scrollTop = b; }; }
  function showDlg(html) {
    var d = dialog();
    KEEPF = false;          // a dialog opened again: its next close is an ordinary close (a page without dialog events never fired one)
    d.innerHTML = '<div class="ir-s-in irf-in">' + html + '</div>';
    if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
    d.scrollTop = 0; var inr = d.querySelector('.irf-in'); if (inr) inr.scrollTop = 0;
  }
  function icon(a, big) {
    var k = a._t === 'ship' ? (a.k === 'amphib' ? 'amphib' : 'carrier') : a.k;
    return '<svg class="irf-ico' + (big ? ' big' : '') + '" viewBox="-11 -11 22 22" style="--c:' + colOf(a) + '" aria-hidden="true"><rect class="irf-b" x="-10" y="-10" width="20" height="20" rx="' + (a._t === 'ship' ? 10 : 4.5) + '"/>' + sym(k, ' transform="scale(.92)"') + '</svg>';
  }
  function picker(list) {
    list = list.slice().sort(function (x, y) { return prio(y) - prio(x); });
    showDlg('<div class="ir-s-top"><span>' + esc(T('{n} military sites here', { n: N(list.length) })) + '</span><button class="ir-s-x" type="button" data-irf-x aria-label="' + esc(T('Close')) + '">&times;</button></div>' +
      '<h2 id="irf-dlg-t" class="irf-h">' + esc(T('Pick one')) + '</h2><ul class="irf-rows">' + list.map(function (a) { return row(a); }).join('') + '</ul>' +
      '<p class="irf-note">' + esc(T('Zoom in and they come apart on the map.')) + '</p>');
  }
  function row(a, extra) {
    var n = (NEWS[a.id] || []).length;
    return '<li><button type="button" class="irf-row" data-irf-site="' + esc(a.id) + '">' + icon(a) + '<span class="irf-row-t"><b>' + esc(L(a, 'n')) + '</b><small>' + bd(esc(extra || (kindName(a) + ' · ' + (OPN[a.o] || a.o)))) + '</small></span>' +
      (n ? '<span class="irf-row-n" title="' + esc(T('Stories that name it')) + '">' + N(n) + '</span>' : '') + '</button></li>';
  }
  function itemRow(it, forId) {
    var src = it.src === 'X' ? (it.nm || it.h || 'X') : (it.h || it.src);
    return '<li><button type="button" class="irf-it" data-irf-item="' + esc(String(it.id)) + '" data-irf-for="' + esc(forId) + '"><span class="irf-it-t"' + DA + '>' + esc(it.t) + '</span><small>' + bd(esc(src)) +
      esc((it.d ? ' · ' + agoMs(Date.parse(it.d)) : '') + (it.hot != null ? ' · ' + T('Hot {n}', { n: N(it.hot) }) : '')) + '</small></button></li>';
  }
  // a room story in the card, drawn as the room draws it (R.cardHtml), opening in its spotlight with Back to the card;
  // a page without the room's card (an older intel.js) keeps the plain row
  function roomCard(it, from, i, forId) { return R.cardHtml ? R.cardHtml(it, 'data-irf-ol="' + esc(from) + '" data-irf-oi="' + i + '"') : itemRow(it, forId); }
  function listOf(from) { return from === 'near' ? (NEAR[CUR] || []) : from.indexOf('g:') === 0 ? (GNEWS[from.slice(2)] || []) : []; }
  function openItem(forId, itemId) {
    closeDlg();
    R.filter('mil', forId); R.tab('items');
    var it = (forId.indexOf('g:') === 0 ? GNEWS[forId.slice(2)] || [] : (NEWS[forId] || []).concat(NEAR[forId] || [])).filter(function (x) { return String(x.id) === itemId; })[0];
    if (it && !R.open(it)) { R.filter('mil', ''); R.open(it); }
  }
  function rivalsOf(a) {
    var mine = BLOC_OF[a.o], riv = RIVAL[mine] || [];
    if (!riv.length) return [];
    return ASSETS.filter(function (b) { return b !== a && riv.indexOf(BLOC_OF[b.o]) >= 0; })
      .map(function (b) { return { b: b, d: km(a.ll, b.ll) }; }).sort(function (x, y) { return x.d - y.d; }).slice(0, 4);
  }
  /* A SITE'S OR A SHIP'S PROFILE (rebuilt 23 Oct 2026, Armin: "when I click on USS Theodore Roosevelt, I should be able to
     see the most recent news related to it, and you don't provide that ... when I click on any of this military stuff, I
     get the information on it and the most recent news items in relation to it, especially specifically about that item").
     In the order a host needs it on air: where it is now and how sure that is; the newest news ABOUT IT (its own search,
     every headline names it); what the room's stories say; then what it is. */
  // a sentence with HTML put into its {parts} (handed the sentence already through T): the words escaped first, the parts handed in already made
  function Th(t, v) { var r = esc(t); if (v) Object.keys(v).forEach(function (k) { r = r.split('{' + k + '}').join(String(v[k])); }); return r; }
  function link(u, h) { return '<a href="' + esc(safeU(u)) + '" target="_blank" rel="noopener">' + h + '</a>'; }
  function newsRow(x) {
    var ms = Date.parse(x.d), meta = esc((x.s || '') + (isFinite(ms) ? ' · ' + agoMs(ms) : ''));
    // regime media (Iran Uncensored): shown, marked, never a link: opening it would show the regime's servers who reads it
    if (rgItem(x)) return '<li><div class="irf-it irf-nw irf-rg"><span class="irf-it-t"' + DA + '>' + esc(x.t) + '</span><small>' + meta + ' · ' + esc(T('Regime media, not linked')) + '</small></div></li>';
    return '<li><a class="irf-it irf-nw" href="' + esc(safeU(x.u)) + '" target="_blank" rel="noopener"><span class="irf-it-t"' + DA + '>' + esc(x.t) + '</span><small>' + meta + '</small></a></li>';
  }
  function coordN(v) { return v >= 0 ? T('{n}°N', { n: N(Math.abs(v).toFixed(2)) }) : T('{n}°S', { n: N(Math.abs(v).toFixed(2)) }); }
  function coordE(v) { return v >= 0 ? T('{n}°E', { n: N(Math.abs(v).toFixed(2)) }) : T('{n}°W', { n: N(Math.abs(v).toFixed(2)) }); }
  /* THE BETTING MARKETS are shown on the English pages only. Their questions are Polymarket's own English titles, a new set
     every hour, so the Persian page could only show them in English or in a machine's Persian; it shows neither. */
  var MK_ON = !FA;
  function dossier(id, back) {
    var a = BYID[id]; if (!a) return;
    if (CUR !== a.id) { COVF[a.id] = COVF[a.id] || 'all'; if (!back) { COVN[a.id] = COV_STEP; PH_AT[a.id] = 0; } }
    CUR = a.id;
    FOCUS = a.id; R.map.redraw();
    var ship = a._t === 'ship', bl = blocOf(a), news = NEWS[a.id] || [], near = NEAR[a.id] || [];
    var home = FA ? a.home_fa || '' : a.home || '';
    var facts = [[T('Run by'), OPN[a.o] || a.o], [T('What'), kindName(a)], ship ? [T('Home port'), home] : [T('Where'), a.host === 'Sea' ? T('At sea') : L(a, 'host')], [T('Conflict'), TH[a.th] || '']].filter(function (f) { return f[1]; });
    var ll = a.ll ? (coordN(a.ll[0]) + ' ' + coordE(a.ll[1])) : '';
    // Wikipedia is English Wikipedia: on the Persian page it says so, and its English sentences show only in Persian (x_fa)
    var wl = a.w ? link('https://en.wikipedia.org/wiki/' + encodeURIComponent(a.w.replace(/ /g, '_')), Th(T('Wikipedia: {title}'), { title: bd(esc(a.w)) })) : '';
    var xx = FA ? a.x_fa || '' : a.x || '', grp = FA ? a.grp_fa || '' : a.grp || '', say = FA ? a.say_fa || '' : a.say || '';
    var where = '';
    if (ship) {
      var old = AGE != null && AGE > STALE && !a.by, rough = a.pr === 'area', none = a.pr === 'none' || !a.ll;
      where = '<section class="irf-now' + (old ? ' old' : '') + '"><h3>' + esc(T('Where it is')) + '</h3><p class="irf-now-w">' + esc(shipWhere(a)) + '</p>' +
        '<p class="irf-now-s">' + esc(shipWhen(a)) + '. ' + (a.by ? link(a.by.u, bd(esc(a.by.t))) : D.fleet.u ? link(D.fleet.u, esc(T('Read the tracker'))) : '') + '</p>' +
        (say ? '<p class="irf-now-q">' + (a.by ? esc(T('The tracker of {date}, before that:', { date: day(D.fleet.at) }) + ' ') : '') + '"' + esc(say) + '"</p>' : '') +
        '<p class="irf-note">' + (none ? esc(T('The report names no place we can put on a map, so it has no mark.')) + ' ' : rough ? esc(T('The report names the sea, not a point: the mark is the middle of that sea.')) + ' ' : '') +
        (old ? esc(T('This report is {n} days old; the ship has probably moved since.', { n: N(AGE) })) + ' ' : '') + esc(T('The Navy does not publish live positions, so this is the last public one.')) + '</p></section>';
    } else if (a.st) where = '<p class="irf-st"><b>' + esc(T('Status')) + '</b> ' + esc(L(a, 'st')) + '</p>';
    var riv = ship ? [] : rivalsOf(a);
    var mk = MK_ON ? (D.markets || []).filter(function (m) { return m.th === a.th; }).slice(0, 2) : [];
    var html = '<div class="ir-s-top"><span>' + esc(ship ? T('Warship') : T('Military site')) + '</span><button class="ir-s-x" type="button" data-irf-x aria-label="' + esc(T('Close')) + '">&times;</button></div>' +
      '<div class="irf-hd">' + icon(a, true) + '<div><h2 id="irf-dlg-t" class="irf-h">' + esc(L(a, 'n')) + (ship && a.hull ? ' <span class="irf-hull">' + esc(a.hull) + '</span>' : '') + '</h2>' +
      '<p class="irf-side" style="--c:' + bl[2] + '"><i class="irf-dot"></i>' + esc(bl[1]) + '</p></div></div>' + photoHtml(a) + where +
      (R.cardHtml ? covHtml(a) : '<section class="irf-sec"><h3>' + esc(T('Latest news about it')) + '</h3>' +
        (latestOf(a).length ? '<ul class="irf-its">' + latestOf(a).slice(0, 6).map(newsRow).join('') + '</ul>' : '<p class="irf-note">' + esc(T('No headline in the last 30 days names it. Searched again every few hours.')) + '</p>') + '</section>') +
      groupSecs(a) +
      (near.length ? '<section class="irf-sec"><h3>' + esc(near.length === 1 ? T('1 story placed near it') : T('{n} stories placed near it', { n: N(near.length) })) + '</h3><p class="irf-note">' + esc(T('Within {n} km. Near is not the same as about it.', { n: N(NEAR_KM) })) + '</p><ul class="irf-its">' + near.slice(0, 4).map(function (it, i) { return roomCard(it, 'near', i, a.id); }).join('') + '</ul></section>' : '') +
      '<section class="irf-sec"><h3>' + esc(T('What it is')) + '</h3>' + (a.why ? '<p class="irf-why">' + esc(L(a, 'why')) + '</p>' : '') + (grp ? '<p class="irf-why">' + esc(grp) + '</p>' : '') +
      '<dl class="irf-facts">' + facts.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl>' +
      (xx ? '<p class="irf-x">' + esc(xx) + '</p>' : '') + '<p class="irf-src">' + [wl, ship ? '' : esc(ll)].filter(Boolean).join(' · ') + '</p></section>' +
      (riv.length ? '<section class="irf-sec"><h3>' + esc(T('The other side\'s nearest sites')) + '</h3><ul class="irf-rows">' + riv.map(function (r) { return row(r.b, T('{n} km', { n: LN(Math.round(r.d)) }) + ' · ' + kindName(r.b) + ' · ' + (OPN[r.b.o] || r.b.o)); }).join('') + '</ul><p class="irf-note">' + esc(T('Straight-line distance.')) + '</p></section>' : '') +
      (mk.length ? '<section class="irf-sec"><h3>' + esc(T('What the betting markets say')) + '</h3>' + mk.map(market).join('') + '</section>' : '') +
      '<div class="ir-s-a">' + (news.length || near.length ? '<button class="ir-s-open" type="button" data-irf-show="' + esc(a.id) + '">' + esc(T('Show its stories in the room')) + '</button>' : '') +
      (a.ll && !a._nomap ? '<button class="ir-s-b" type="button" data-irf-fly="' + esc(a.id) + '">' + esc(T('Go to it on the map')) + '</button>' : '') + '<button class="ir-s-b" type="button" data-irf-copy="' + esc(a.id) + '">' + esc(T('Copy for the show')) + '</button></div>';
    showDlg(html);
    // back from the spotlight: the card opens where the reader left it
    if (back && SCROLL[a.id]) { var d0 = dlg, s0 = SCROLL[a.id]; d0.scrollTop = s0[0]; var i0 = d0.querySelector('.irf-in'); if (i0) i0.scrollTop = s0[1]; }
  }
  // the stories about a group this site belongs to (US bases in the region, Iran's nuclear sites ...): connected, not counted on its mark
  function groupSecs(a) {
    return groupsOf(a).filter(function (k) { return (GNEWS[k] || []).length; }).map(function (k) {
      var LL = GNEWS[k], g = GBY[k];
      return '<section class="irf-sec"><h3>' + esc(LL.length === 1 ? T('1 story about {what}', { what: g[1] }) : T('{n} stories about {what}', { n: N(LL.length), what: g[1] })) + '</h3><p class="irf-note">' + esc(T('They name the group, not this site by name.')) + '</p><ul class="irf-its">' +
        LL.slice(0, 5).map(function (it, i) { return roomCard(it, 'g:' + k, i, 'g:' + k); }).join('') + '</ul><button type="button" class="ir-s-b" data-irf-show="g:' + esc(k) + '">' + esc(T('Show all {n} about {what}', { n: N(LL.length), what: g[1] })) + '</button></section>';
    }).join('');
  }
  function market(m) {
    var p = Math.round((+m.p || 0) * 100);
    return '<a class="irf-mk" href="' + esc(safeU(m.u)) + '" target="_blank" rel="noopener"><span class="irf-mk-p"><b>' + N(p) + '%</b><small>' + esc(T('say yes')) + '</small></span><span class="irf-mk-q">' + esc(m.q) + '<small>' + esc(T('${n} bet on Polymarket', { n: fmtN(m.vol || 0) }) + (m.end ? ' · ' + T('closes {date}', { date: day(m.end) }) : '')) + '</small></span></a>';
  }
  var SITE_MARK = CFG.mark || 'libertypolitics.com/intel';          // the room's own address, on what is copied for a show
  function copy(id, btn) {
    var a = BYID[id]; if (!a) return;
    var lines = [L(a, 'n') + (a._t === 'ship' ? ' (' + (a.hull || '') + '): ' + shipWhere(a) + '. ' + shipWhen(a) : ', ' + kindName(a) + ', ' + (OPN[a.o] || a.o) + (a.host && a.host !== 'Sea' ? ', ' + T('in {place}', { place: L(a, 'host') }) : ''))];
    if (a.why) lines.push(L(a, 'why'));
    if (a.st) lines.push(T('Status:') + ' ' + L(a, 'st'));
    // everything the card lists, newest first: X posts, videos and articles (24 Oct 2026), each with who and when
    var la = newest(coverOf(a)).slice(0, 10);
    if (la.length) { lines.push(T('Latest news:')); la.forEach(function (x) {
      var who = x.src === 'X' ? (x.nm || x.h || 'X') + ', X' : x.src === 'YouTube' ? (x.h || '') + ', ' + T('YouTube') : (x.h || x.src || '');
      var qx = x.src === 'X' && x.qt && x.qt.t ? ' [' + T('Quoting {who}', { who: x.qt.nm || x.qt.h }) + ': ' + String(x.qt.t).replace(/\s+/g, ' ').slice(0, 160) + ']' : '';          // a quote never copied as if it stood alone (24 Oct 2026)
      lines.push('- ' + x.t + qx + ' (' + who + (x.d && day(x.d) ? ', ' + day(x.d) : '') + ')' + (rgItem(x) || safeU(x.u) === '#' ? '' : ' ' + x.u));
    }); }
    lines.push(SITE_MARK + '/?mil=' + a.id);
    var txt = lines.join('\n'), done = function () { btn.textContent = T('Copied'); setTimeout(function () { btn.textContent = T('Copy for the show'); }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { fallback(txt); done(); });
    else { fallback(txt); done(); }
  }
  function fallback(t) { var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* nothing to do */ } ta.remove(); }      // data-consent: 'none:clipboard'

  /* ------------------------------------------------------------ the Forces tab */
  function tabEl() {
    var el = $('irf-tab');
    if (!el) {
      el = document.createElement('div'); el.id = 'irf-tab'; el.className = 'irf-tab'; el.hidden = true;
      var links = $('ir-links'); links.parentNode.insertBefore(el, links.nextSibling);
      el.addEventListener('click', function (ev) {
        var t = ev.target, b;
        // a conflict's list the reader opened or closed stays so through every redraw (they once all collapsed on each one)
        if ((b = t.closest('details[data-irf-sites] > summary'))) { THOPEN[b.parentNode.getAttribute('data-irf-sites')] = !b.parentNode.open; return; }
        if ((b = t.closest('[data-irf-site]'))) { dossier(b.getAttribute('data-irf-site')); return; }
        if ((b = t.closest('#irf-on'))) { setOn(!ON); return; }
        if ((b = t.closest('[data-irf-g]'))) { var gv = 'g:' + b.getAttribute('data-irf-g'); if (!ON) setOn(true); R.filter('mil', R.filterOn('mil') === gv ? '' : gv); R.tab('items'); listTop(); return; }
        if ((b = t.closest('[data-irf-any]'))) { R.filter('mil', R.filterOn('mil') === 'any' ? '' : 'any'); R.tab('items'); listTop(); return; }
      });
    }
    var tb = $('ir-ltab');
    if (tb && !tb.querySelector('[data-ltab="forces"]')) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('data-ltab', 'forces'); b.setAttribute('aria-selected', 'false');
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6v5.6c0 4.6 3.2 8 7.5 9.4 4.3-1.4 7.5-4.8 7.5-9.4V6z"/></svg>' + esc(T('Forces')) + ' <i class="num" id="irf-tab-n"></i>';
      tb.appendChild(b); tb.classList.add('irf-3');
    }
    return el;
  }
  /* "In the news now", one predicate for the list and the number on the tab (24 Oct 2026): the tab once counted every
     named site and group in every conflict, uncapped, while its list showed the picked conflicts' only, twelve sites at
     most, so the two disagreed. */
  var NAMED_CAP = 12;
  function newsNow() {
    var ws = wars(), all = ASSETS.concat(SHIPS);
    var named = all.filter(function (a) { return (NEWS[a.id] || []).length && inWs(a, ws); }).sort(function (x, y) { return NEWS[y.id].length - NEWS[x.id].length; });
    var gk = GROUPS.filter(function (g) { return (GNEWS[g[0]] || []).length && all.some(function (a) { return g[4](a) && inWs(a, ws); }); }).sort(function (x, y) { return GNEWS[y[0]].length - GNEWS[x[0]].length; });
    return { named: named.slice(0, NAMED_CAP), gk: gk };
  }
  function drawTabCount() { tabEl(); var n = $('irf-tab-n'); if (!n) return; var nn = D ? newsNow() : null, c = nn ? nn.named.length + nn.gk.length : 0; n.textContent = c ? N(c) : ''; }
  function listTop() { var l = root.querySelector('.ir-list'); if (l && l.getBoundingClientRect().top < 0) l.scrollIntoView({ block: 'start' }); }
  function gauge(p) {
    var lv = Math.max(0, Math.min(100, +p.lvl || 0)), ang = Math.PI * (1 - lv / 100), x = 30 + 24 * Math.cos(ang), y = 32 - 24 * Math.sin(ang);
    return '<svg class="irf-ga" viewBox="0 0 60 36" aria-hidden="true"><path class="irf-ga-b" d="M6 32A24 24 0 0 1 54 32"/><path class="irf-ga-v lv' + Math.min(4, Math.floor(lv / 20)) + '" d="M6 32A24 24 0 0 1 ' + x.toFixed(1) + ' ' + y.toFixed(1) + '"/><line x1="30" y1="32" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/><circle cx="30" cy="32" r="2.6"/></svg>';
  }
  function inWs(a, ws) { return !ws.length || ws.indexOf(a.th) >= 0; }
  var THOPEN = {};
  function ageWords(n) { return n == null ? '' : n <= 0 ? T('today') : n === 1 ? T('1 day ago') : T('{n} days ago', { n: N(n) }); }
  /* The Forces tab. War pressure moved INTO the conflict picker on 23 Oct 2026, so the gauges and the choosing are one
     place (one door); the tab says which conflicts it is showing and lists what follows from that. */
  function drawTab() {
    var el = tabEl(); if (!D) { el.innerHTML = '<p class="ir-empty">' + esc(T('The military sites could not load. Everything else in the room works.')) + '</p>'; return; }
    var mil = R.filterOn('mil'), ws = wars(), nn = newsNow(), named = nn.named, gk = nn.gk;
    var html = '<div class="irf-tab-h"><p>' + (ws.length ? Th(T('Showing {what}. Pick others with the Conflicts button on the map.'), { what: '<b>' + esc(warLabel(ws.join(','))) + '</b>' }) : esc(T('Every conflict. To follow one or several, use the Conflicts button on the map.'))) + '</p>' +
      '<button type="button" class="irf-tog" id="irf-on" aria-pressed="' + (ON ? 'true' : 'false') + '"><span>' + esc(T('On the map')) + '</span></button></div>';
    html +='<section class="irf-sec"><h3>' + esc(T('In the news now')) + '</h3>' +
      (named.length || gk.length ? '<ul class="irf-rows">' + gk.map(function (g) {
        var LL = GNEWS[g[0]], a0 = ASSETS.concat(SHIPS).filter(g[4])[0];
        return '<li><button type="button" class="irf-row' + (mil === 'g:' + g[0] ? ' on' : '') + '" data-irf-g="' + esc(g[0]) + '">' + (a0 ? icon(a0) : '') + '<span class="irf-row-t"><b>' + esc(g[1]) + '</b><small>' + bd(esc(LL[0].t)) + '</small></span><span class="irf-row-n" title="' + esc(T('Stories about them')) + '">' + N(LL.length) + '</span></button></li>';
      }).join('') + named.map(function (a) { return row(a, NEWS[a.id][0].t); }).join('') + '</ul>' +
        '<button type="button" class="ir-s-b irf-any" data-irf-any aria-pressed="' + (mil === 'any' ? 'true' : 'false') + '">' + esc(mil === 'any' ? T('Show every story again') : T('Show only military news')) + '</button>'
        : '<p class="irf-note">' + esc(T('No story in this view names a military site.')) + '</p>') + '</section>';
    var sh = SHIPS.filter(function (s) { return !ws.length || ws.indexOf(s.th) >= 0; });
    if (sh.length) {
      var old = AGE != null && AGE > STALE;
      html += '<section class="irf-sec"><h3>' + esc(T('US carriers and big-deck ships')) + '</h3><p class="irf-note' + (old ? ' irf-warn' : '') + '">' + esc(T('Last public positions: the US Naval Institute\'s Fleet Tracker of {date} ({age})', { date: day(D.fleet.at), age: ageWords(AGE) }) +
        (D.fleet.checked ? T(', checked {ago}', { ago: agoMs(Date.parse(D.fleet.checked)) }) : '') + T(', and its newer stories where they say where a ship is.') + ' ' +
        (old ? T('This report is old: ships have probably moved.') + ' ' : '') + T('The Navy does not publish live positions.')) + '</p><ul class="irf-rows">' +
        sh.map(function (s) { return row(s, (s.hull ? s.hull + ' · ' : '') + shipWhere(s) + (s.by ? ' · ' + T('USNI {date}', { date: day(s.by.at) }) : '')); }).join('') + '</ul></section>';
    }
    var mk = MK_ON ? (D.markets || []).filter(function (m) { return !ws.length || ws.indexOf(m.th) >= 0; }) : [];
    if (mk.length) html += '<section class="irf-sec"><h3>' + esc(T('What the betting markets say')) + '</h3><p class="irf-note">' + esc(T('Prices on Polymarket: what bettors expect, not a fact.')) + '</p>' + mk.slice(0, 8).map(market).join('') + '</section>';
    var ths = ws.length ? ws : Object.keys(TH);
    html += '<section class="irf-sec"><h3>' + esc(T('Every site, by conflict')) + '</h3>' + ths.map(function (th) {
      var list = ASSETS.filter(function (a) { return a.th === th; }).sort(function (x, y) { return prio(y) - prio(x) || String(L(x, 'n')).localeCompare(L(y, 'n')); });
      if (!list.length) return '';
      var op = THOPEN[th] != null ? THOPEN[th] : ws.length === 1;
      return '<details class="irf-th" data-irf-sites="' + esc(th) + '"' + (op ? ' open' : '') + '><summary><span>' + esc(TH[th]) + '</span><i class="num">' + N(list.length) + '</i></summary><ul class="irf-rows">' + list.map(function (a) { return row(a); }).join('') + '</ul></details>';
    }).join('') + '</section>';
    html += '<section class="irf-sec irf-key"><h3>' + esc(T('Colour: who runs it')) + '</h3><ul>' + BLOCS.filter(function (b) { return ASSETS.some(function (a) { return BLOC_OF[a.o] === b[0]; }); }).map(function (b) { return '<li style="--c:' + b[2] + '"><i class="irf-dot"></i>' + esc(b[1]) + '</li>'; }).join('') +
      '</ul><p class="irf-note">' + esc(T('A gold ring means a story in the room names it. A dashed ring round a ship means the report gives the sea, not a point. Sites come from the register in our repository, each checked against Wikipedia and against the news of 2025 and 2026. Wrong or missing? Say so in the discussion.')) + '</p></section>';
    el.innerHTML = html;
  }

  /* ------------------------------------------------------------ the chip on the map: the ONE door to the conflicts */
  function hottest() { return (D.pulse || []).filter(function (x) { return TH[x.th]; }).slice().sort(function (a, b) { return (b.lvl || 0) - (a.lvl || 0); })[0] || null; }
  function chip() {
    var box = R.map.box;
    if (!box || $('irf-chip')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'irf-chip'; b.className = 'irf-chip'; b.setAttribute('aria-haspopup', 'dialog');
    b.addEventListener('click', warPicker);
    box.appendChild(b);
    chipText();
  }
  function chipText() {
    var b = $('irf-chip'); if (!b || !D) return;
    var ws = wars(), p = ws.length ? ws.map(pulseOf).filter(Boolean).sort(function (x, y) { return (y.lvl || 0) - (x.lvl || 0); })[0] : hottest();
    b.className = 'irf-chip ' + lvClass(p) + (ws.length ? ' on' : '');
    var h = ws.length ? '<b>' + esc(warLabel(ws.join(','))) + '</b>' : esc(T('All conflicts')) + (p ? '<small>' + esc(TH[p.th] + T(': ') + lvWord(p)) + '</small>' : '');
    var html = '<i aria-hidden="true"></i><span>' + h + '</span><svg class="irf-chip-v" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>';
    if (b._h !== html) { b.innerHTML = html; b._h = html; }
    b.setAttribute('aria-label', ws.length ? T('Conflicts: showing {what}. Change', { what: warLabel(ws.join(',')) }) : T('Conflicts: showing all. Pick one or several'));
    b.title = p ? pulseWhy(p) : '';
  }

  /* ------------------------------------------------------------ in the spotlight: how each side framed it, the sites, your balance */
  var SIDE_N = { L: 'Left', C: 'Centre', R: 'Right' };
  /* THE SIDES (CFG.sides, Iran Uncensored: free Persian media, the press in English, the regime's media; names already in
     the page's language). With them the framing block is framedSides(); without them it is Liberty Politics' Left, Centre
     and Right, untouched (framedLCR), and only there is "Your balance" kept and shown: it is a US lean (it.sd). */
  var SIDES = Array.isArray(CFG.sides) ? CFG.sides.filter(function (x) { return Array.isArray(x) && x[0] && x[1]; }) : [];
  if (!SIDES.length) SIDES = null;
  function outletName(o) { return String(o).replace(/\s+[-|:]\s+.*$/, '').replace(/^www\./, ''); }
  function spot(it) {
    if (!SIDES) record(it);
    var out = '', fr = FR && /^L/.test(String(it.id)) && FR.by[String(it.id).slice(1)];          // a live item's id is 'L' + the feed's own (normLive)
    if (fr && fr.length >= 2) out += SIDES ? framedSides(fr) : framedLCR(fr);
    var sites = (OF_ITEM[it.id] || []).map(function (id) { return BYID[id]; }).filter(Boolean);
    var gs = (OF_ITEM[it.id] || []).filter(function (id) { return id.indexOf('g:') === 0 && GBY[id.slice(2)]; });
    if (gs.length) out += '<section class="irf-sp" aria-label="' + esc(T('Military news it belongs to')) + '"><h3>' + esc(T('Military news it belongs to')) + '</h3><div class="irf-sp-c">' + gs.map(function (id) {
      return '<button type="button" class="irf-sc" data-irf-gf="' + esc(id) + '"><span>' + esc(GBY[id.slice(2)][1] + ' (' + N(GNEWS[id.slice(2)].length) + ')') + '</span></button>';
    }).join('') + '</div></section>';
    if (sites.length) out += '<section class="irf-sp" aria-label="' + esc(T('Military sites it names')) + '"><h3>' + esc(T('Military sites it names')) + '</h3><div class="irf-sp-c">' + sites.slice(0, 6).map(function (a) {
      return '<button type="button" class="irf-sc" data-irf-spot="' + esc(a.id) + '">' + icon(a) + '<span>' + esc(L(a, 'n')) + '</span></button>';
    }).join('') + '</div></section>';
    if (!SIDES) out += balance();
    return out;
  }
  // Liberty Politics: Left, Centre, Right (data/intel-frames.json rows [side, outlet, headline, when])
  function framedLCR(fr) {
    var out = '';
    var col = { L: [], C: [], R: [] }, first = {}, un = [];
    fr.forEach(function (r) { var t = Date.parse(r[3]); if (r[0] && col[r[0]]) { col[r[0]].push(r); if (!(first[r[0]] <= t)) first[r[0]] = t; } else un.push(r); });
    var rated = ['L', 'C', 'R'].filter(function (s) { return col[s].length; });
    var t0 = Math.min.apply(null, fr.map(function (r) { return Date.parse(r[3]) || Infinity; })), lead = fr.filter(function (r) { return Date.parse(r[3]) === t0; })[0];
    var tl = [];
    if (lead) tl.push('First: ' + outletName(lead[1]) + (lead[0] ? ' (' + SIDE_N[lead[0]] + ')' : '') + ', ' + agoMs(t0));
    ['L', 'C', 'R'].filter(function (s) { return first[s] && !(lead && lead[0] === s && first[s] === t0); })
      .sort(function (x, y) { return first[x] - first[y]; })          // in the order the sides came to it
      .forEach(function (s) {
        var h = Math.round((first[s] - t0) / 36e5);
        tl.push((s === 'C' ? 'the Centre' : 'the ' + SIDE_N[s]) + (h < 1 ? ' within the hour' : ' ' + h + (h === 1 ? ' hour later' : ' hours later')));
      });
    var none = ['L', 'R'].filter(function (s) { return !col[s].length && rated.length; }).map(function (s) { return 'the ' + SIDE_N[s]; });
    var tls = tl.length ? tl[0] + (tl.length > 1 ? '. Then ' + tl.slice(1).join(', ') : '') + '.' + (none.length ? ' Not carried by ' + none.join(' or ') + ' at all.' : '') : '';
    if (rated.length >= 1 || un.length) out += '<section class="irf-fr" aria-label="How each side framed it"><h3>How each side framed it</h3>' +
      (tls ? '<p class="irf-tl">' + esc(tls) + '</p>' : '') +
      '<div class="irf-fr-c">' + ['L', 'C', 'R'].map(function (s) {
        return '<div class="irf-fc s' + s + '"><h4>' + SIDE_N[s] + '</h4>' + (col[s].length ? col[s].map(function (r) { return '<p><b>' + esc(outletName(r[1])) + '</b>' + esc(r[2]) + '<small>' + esc(agoMs(Date.parse(r[3]))) + '</small></p>'; }).join('') : '<p class="irf-none">Not covered by the outlets we rate on this side.</p>') + '</div>';
      }).join('') + '</div>' +
      (un.length ? '<p class="irf-un">Also: ' + un.map(function (r) { return '<b>' + esc(outletName(r[1])) + '</b> "' + esc(r[2]) + '"'; }).join('; ') + '</p>' : '') + '</section>';
    return out;
  }
  // the room's own sides (CFG.sides), in its words: who carried it first, when each side came to it, who did not at all
  function framedSides(fr) {
    var keys = SIDES.map(function (x) { return String(x[0]); }), name = {}, col = {}, first = {}, un = [];
    SIDES.forEach(function (x) { name[x[0]] = String(x[1]); });
    keys.forEach(function (k) { col[k] = []; });
    fr.forEach(function (r) { var t = Date.parse(r[3]); if (r[0] && col[r[0]]) { col[r[0]].push(r); if (!(first[r[0]] <= t)) first[r[0]] = t; } else un.push(r); });
    var rated = keys.filter(function (s) { return col[s].length; });
    var t0 = Math.min.apply(null, fr.map(function (r) { return Date.parse(r[3]) || Infinity; })), lead = fr.filter(function (r) { return Date.parse(r[3]) === t0; })[0];
    var tl = [], who = function (o) { return bd(esc(outletName(o))); };
    if (lead) tl.push(lead[0] && name[lead[0]] ? Th(T('First: {who} ({side}), {ago}'), { who: who(lead[1]), side: esc(name[lead[0]]), ago: esc(agoMs(t0)) })
      : Th(T('First: {who}, {ago}'), { who: who(lead[1]), ago: esc(agoMs(t0)) }));
    keys.filter(function (s) { return first[s] && !(lead && lead[0] === s && first[s] === t0); })
      .sort(function (x, y) { return first[x] - first[y]; })
      .forEach(function (s) {
        var h = Math.round((first[s] - t0) / 36e5);
        tl.push(esc(h < 1 ? T('{side} within the hour', { side: name[s] }) : h === 1 ? T('{side} 1 hour later', { side: name[s] }) : T('{side} {n} hours later', { side: name[s], n: N(h) })));
      });
    var none = rated.length ? keys.filter(function (s) { return !col[s].length; }).map(function (s) { return name[s]; }) : [];
    var tls = tl.length ? tl[0] + (tl.length > 1 ? Th(T('. Then {list}'), { list: tl.slice(1).join(esc(T(', '))) }) : '') + '.' +
      (none.length ? ' ' + esc(T('Not carried by {list} at all.', { list: none.join(T(' or ')) })) : '') : '';
    if (!rated.length && !un.length) return '';
    return '<section class="irf-fr" aria-label="' + esc(T('How each side framed it')) + '"><h3>' + esc(T('How each side framed it')) + '</h3>' +
      (tls ? '<p class="irf-tl">' + tls + '</p>' : '') +
      '<div class="irf-fr-c">' + keys.map(function (s) {
        return '<div class="irf-fc s' + esc(s) + '"><h4>' + esc(name[s]) + '</h4>' + (col[s].length ? col[s].map(function (r) { return '<p><b' + DA + '>' + esc(outletName(r[1])) + '</b><span' + DA + '>' + esc(r[2]) + '</span><small>' + esc(agoMs(Date.parse(r[3]))) + '</small></p>'; }).join('') : '<p class="irf-none">' + esc(T('None of the outlets I follow on this side carried it.')) + '</p>') + '</div>';
      }).join('') + '</div>' +
      (un.length ? '<p class="irf-un">' + esc(T('Also:')) + ' ' + un.map(function (r) { return '<b' + DA + '>' + esc(outletName(r[1])) + '</b> ' + bd('"' + esc(r[2]) + '"'); }).join(esc(T('; '))) + '</p>' : '') + '</section>';
  }
  // a tap on a group in the spotlight: close the spotlight, show the group's stories
  document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest('[data-irf-gf]');
    if (!b) return;
    var sp = $('ir-spot'); if (sp && sp.open) { var x = sp.querySelector('[data-x]'); if (x) x.click(); else sp.close(); }
    R.filter('mil', b.getAttribute('data-irf-gf')); R.tab('items'); listTop();
  });
  // a tap on a site in the spotlight: close the spotlight, open the site
  document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest('[data-irf-spot]');
    if (!b) return;
    var sp = $('ir-spot'); if (sp && sp.open) { var x = sp.querySelector('[data-x]'); if (x) x.click(); else sp.close(); }
    if (!ON) setOn(true);
    dossier(b.getAttribute('data-irf-spot'));
  });

  /* YOUR BALANCE (Ground News's "My News Bias"): the lean of the outlets whose stories this reader opened here in the last
     7 days. On this device only, never sent. Shown once three rated stories have been opened. */
  var DIET = 'ir-diet';
  function diet() { try { var v = JSON.parse(localStorage.getItem(DIET) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function record(it) {
    var s = it.sd; if (s !== 'L' && s !== 'C' && s !== 'R') return;
    var now = Date.now(), d = diet().filter(function (r) { return Array.isArray(r) && now - r[0] < 7 * 864e5 && r[2] !== it.id; });
    d.push([now, s, it.id]);
    try { localStorage.setItem(DIET, JSON.stringify(d.slice(-300))); } catch (e) { /* storage full or blocked: the balance just stays empty */ }
  }
  function balance() {
    var d = diet(), c = { L: 0, C: 0, R: 0 };
    d.forEach(function (r) { if (c[r[1]] != null) c[r[1]]++; });
    var n = c.L + c.C + c.R;
    if (n < 3) return '';
    var pc = function (k) { return Math.round(100 * c[k] / n); };
    var low = ['L', 'C', 'R'].filter(function (k) { return c[k] === 0; }).map(function (k) { return SIDE_N[k]; });
    return '<section class="irf-bal" aria-label="Your balance"><h3>Your balance this week</h3><div class="irf-bal-b" aria-hidden="true"><i class="sL" style="width:' + pc('L') + '%"></i><i class="sC" style="width:' + pc('C') + '%"></i><i class="sR" style="width:' + pc('R') + '%"></i></div>' +
      '<p>' + esc(n + ' stories you opened here: ' + c.L + ' from the Left, ' + c.C + ' from the Centre, ' + c.R + ' from the Right.') + (low.length ? ' ' + esc('Nothing yet from the ' + low.join(' or the ') + '.') : '') + ' <small>Kept on this device only.</small></p></section>';
  }
})();
