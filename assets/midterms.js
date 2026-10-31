/* Call the Midterms (build/midterms.py prints the section and writes assets/midterms.json; this file makes it move).
   The mood slider moves every race by the same number of points; a tap on a candidate calls that race for them,
   a second tap hands it back to the mood. Both chambers redraw seat by seat, the slider shows where each one changes
   hands, the odds come from pretend elections run in the browser, and "Run election night" plays one of them in the
   order polls close. On election night the Senate races really called (assets/election-results.json) are locked.
   The choice rides in the address: ?mood=8.5&d=tx-senate&r=pa-7#midterms. Without this file the section still shows
   both chambers as the forecasters rate them today and the close Senate races. */
(function () {
  'use strict';
  var D = document, W = window;
  var box = D.getElementById('midterms');
  if (!box || !W.fetch || !W.JSON) return;
  var ROOT = box.getAttribute('data-root') || '../';
  var $ = function (id) { return D.getElementById(id); };
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var M, RS = [], BY = {}, TODAY = parseFloat(box.getAttribute('data-today')) || 0;
  var mood = TODAY, pick = {}, real = {}, realM = {}, night = null, tab = 'S', where = 'close', showAll = false;
  var MK = null;      // the betting markets (assets/markets.json, build/markets.py): {at, us: {S|H: {D, R}, V: {m}}, r: {id: [L%, R%, $, feeds]}}
  var MKALL = null;   // the same file as read; MK is null while the reader has "Betting odds" switched off (markets.js, lp:odds)
  // a market link, through the affiliate door when markets.js is on the page (plain until a code exists, never tagged without it)
  function mkA(u, t) { return W.LPAff ? W.LPAff.a(u, esc(t)) : '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + '</a>'; }
  var SNEED = 51, HNEED = 218;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function moodWords(v) { var a = r1(Math.abs(v)); return a === 0 ? 'Dead even' : (v > 0 ? 'Democrats by ' : 'Republicans by ') + a; }
  function short(v) { var a = r1(Math.abs(v)); return a === 0 ? 'Even' : (v > 0 ? 'D+' : 'R+') + a; }
  function party(p) { return p === 'D' ? 'Democrats' : p === 'R' ? 'Republicans' : 'Independents'; }
  function sideParty(x, s) { return s === 'R' ? 'R' : x.L.p; }
  // ---------------------------------------------------------------- the betting markets
  // fav(x): the side the markets favor in a race ('L' or 'R'), its chance in 100, and the name; null where no market prices it.
  function fav(x) {
    var m = MK && x && MK.r[x.id];
    if (!m || x.lock || !x.L || !x.R) return null;
    var s = m[0] >= m[1] ? 'L' : 'R';
    return { s: s, p: s === 'L' ? m[0] : m[1], n: x[s].n };
  }
  function surname(n) { var w = String(n).replace(/,?\s+(Jr|Sr|II|III|IV)\.?$/, '').trim().split(/\s+/); return w[w.length - 1]; }
  // a call goes against the markets when the side it picks is the one they give under 45 in 100
  function against(x, s) { var f = fav(x); return !!(f && s && s !== f.s && f.p >= 55); }
  function againstAll(ch, shift) { return RS.filter(function (x) { return (!ch || x.c === ch) && !real[x.id] && against(x, sideAt(x, shift)); }); }

  // ---------------------------------------------------------------- who wins a race
  // real (called on the night) beats the reader's call beats a race with one side on the ballot beats the mood.
  function sideAt(x, shift) {
    if (real[x.id]) return real[x.id];
    if (pick[x.id]) return pick[x.id];
    if (x.lock) return x.lock === 'R' ? 'R' : 'L';
    var v = x.m + shift;
    if (v === 0) return x.hold === 'R' ? 'R' : 'L';
    return v > 0 ? 'L' : 'R';
  }
  function fixed(x) { return !!(real[x.id] || pick[x.id] || x.lock); }
  function tally(ch, shift, fn) {
    var t = { D: 0, R: 0, I: 0 };
    if (ch === 'S') { t.D = M.senate.base.D; t.R = M.senate.base.R; }
    RS.forEach(function (x) {
      if (x.c !== ch) return;
      var s = fn ? fn(x) : sideAt(x, shift);
      if (s === 'L' || s === 'R') t[sideParty(x, s)]++;      // a seat not called yet (election night) is in no column
    });
    return t;
  }
  // Who controls: the Senate needs 51, or 50 for the Republicans (the Vice President breaks a tie); the House 218.
  function control(ch, t) {
    if (ch === 'S') return t.D >= SNEED ? 'D' : t.R >= SNEED - 1 ? 'R' : 'I';
    return t.D >= HNEED ? 'D' : t.R >= HNEED ? 'R' : 'I';
  }
  // The mood at which Democrats take a chamber, given every call the reader has made: tenths of a point, searched.
  function flipAt(ch) {
    var lo = -600, hi = 600;
    var dAt = function (k) { return control(ch, tally(ch, k / 10)) === 'D'; };
    if (!dAt(hi)) return { never: true };
    if (dAt(lo)) return { always: true };
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (dAt(mid)) hi = mid; else lo = mid; }
    return { at: TODAY + hi / 10 };
  }

  // ---------------------------------------------------------------- the chambers
  var DOTS = {};
  function seatsOf(ch, side) {
    var out = [];
    if (ch === 'S') {
      for (var k = 0; k < M.senate.base.D; k++) out.push({ p: 'D', fx: true, m: 999 });
      for (k = 0; k < M.senate.base.R; k++) out.push({ p: 'R', fx: true, m: -999 });
    }
    RS.forEach(function (x) {
      if (x.c !== ch) return;
      var s = side(x);
      out.push({ p: s ? sideParty(x, s) : 'U', fx: false, m: x.m, pin: !!pick[x.id], real: !!real[x.id] });
    });
    var rank = { D: 3, I: 2, U: 1, R: 0 };
    out.sort(function (a, b) { return (rank[b.p] - rank[a.p]) || (b.m - a.m); });
    return out;
  }
  function paintChamber(ch, side) {
    var row = seatsOf(ch, side), dots = DOTS[ch];
    for (var k = 0; k < dots.length; k++) {
      var s = row[k], c = 'p-' + s.p + (s.fx ? ' is-fixed' : '') + (s.pin ? ' is-pin' : '') + (s.real ? ' is-real' : '');
      if (dots[k].getAttribute('class') !== c) dots[k].setAttribute('class', c);
    }
  }
  function board(ch, t, ctrl, done) {
    var b = $('mt-b-' + ch), name = ch === 'S' ? 'Senate' : 'House';
    b.querySelector('.mt-n-D').textContent = t.D;
    b.querySelector('.mt-n-R').textContent = t.R;
    var ni = b.querySelector('.mt-n-I');
    ni.textContent = t.I; ni.hidden = !t.I;
    var w = b.querySelector('.mt-v-w'), c = b.querySelector('.mt-v-c');
    b.classList.remove('is-D', 'is-R', 'is-I');
    if (done === false) { w.textContent = ''; c.textContent = 'Votes still being counted'; return; }
    b.classList.add('is-' + ctrl);
    if (ctrl === 'I') { w.textContent = 'Independents'; c.textContent = 'decide the ' + name; }
    else { w.textContent = party(ctrl); c.textContent = (ch === 'S' && ctrl === 'R' && t.R === 50 ? 'keep the Senate on the Vice President’s vote' : (gainWord(ch, ctrl) + ' the ' + name)); }
  }
  function nowOf(ch) {
    if (ch === 'S') { var r = M.senate.base.R; RS.forEach(function (x) { if (x.c === 'S' && x.hold === 'R') r++; }); return { R: r, D: 100 - r }; }
    return M.house.now;
  }
  function gainWord(ch, p) { var n = nowOf(ch); return (p === 'R' ? n.R >= n.D : n.D > n.R) ? 'keep' : 'take'; }
  // the same words as gain_words() in midterms.py: who gains, how many, and their count from today to this map
  function gainLine(ch, t) {
    var n = nowOf(ch), dd = t.D - n.D;
    if (!dd) return 'No change from today';
    var p = dd > 0 ? 'D' : 'R', k = Math.abs(t[p] - n[p]) || Math.abs(dd);
    return party(p) + ' gain ' + k + ' seat' + (k === 1 ? '' : 's') + ' (' + n[p] + ' → ' + t[p] + ')';
  }

  // ---------------------------------------------------------------- the slider
  var IN = $('mt-mood'), OUT = $('mt-mood-v'), MIN = parseFloat(IN.min), MAX = parseFloat(IN.max);
  function posOf(v) { return ((-v - MIN) / (MAX - MIN)) * 100; }      // the slider runs Democrats (left) to Republicans
  function pin(id, v) {
    var p = $(id);
    if (v == null || -v < MIN || -v > MAX) { p.hidden = true; return; }
    p.hidden = false; p.style.left = 'calc(' + posOf(v) + '% + ' + (14 - posOf(v) * 0.28) + 'px)';
  }
  function moodLabel() {
    OUT.textContent = moodWords(mood);
    OUT.className = 'mt-mood-v ' + (r1(mood) > 0 ? 'is-D' : r1(mood) < 0 ? 'is-R' : '');
    IN.setAttribute('aria-valuetext', moodWords(mood));
    IN.style.setProperty('--at', posOf(mood) + '%');
    // The "Set it to" row lights the one setting the slider is at. It follows the slider alone, never whether races are
    // called: with any race called nothing ever lit (Armin, 30 October 2026: "when i click these buttons, they don't stay
    // highlighted"). Betting favorites outranks Polls today when both are true, so only one is ever lit.
    var mk = isMarketMap();
    [].forEach.call(box.querySelectorAll('.mt-pre[data-mood]'), function (b) { b.setAttribute('aria-pressed', !mk && r1(parseFloat(b.getAttribute('data-mood'))) === r1(mood) ? 'true' : 'false'); });
    var yr = $('mt-year'), hit = '';
    [].forEach.call(yr.options, function (o) { if (o.value && r1(parseFloat(o.value)) === r1(mood)) hit = o.value; });
    yr.value = hit;
    yr.classList.toggle('is-on', !!hit && !mk);
  }
  // The Senate and House marks on the slider say their own name, and the line under it says the same thing in words:
  // what Democrats need in the national vote to take each chamber (Armin, 30 October 2026: "the mood of the country has
  // a yellow triangle, S, and an H. It might be confusing to people").
  function flips() {
    var parts = [], at = {};
    ['S', 'H'].forEach(function (ch) {
      var f = flipAt(ch), name = ch === 'S' ? 'Senate' : 'House', tag = '<b class="mt-tag mt-tag-' + ch + '">' + name + '</b> ';
      at[ch] = f.at;
      pin('mt-pin-' + ch, f.at);
      if (f.never) parts.push('<span class="mt-flip">' + tag + 'Democrats cannot win it with the races you called</span>');
      else if (f.always) parts.push('<span class="mt-flip">' + tag + 'Democrats win it at any setting, with the races you called</span>');
      else {
        var a = r1(Math.abs(f.at));
        parts.push('<span class="mt-flip">' + tag + (a === 0 ? 'Democrats need a tie'
          : f.at > 0 ? 'Democrats need to win by <b class="num">' + a + '</b>'
          : 'Democrats win it even losing by <b class="num">' + a + '</b>') + '</span>');
      }
    });
    $('mt-flips').innerHTML = parts.join('');
    // two marks closer than a tag's width stand one above the other, never on top of each other
    var w = IN.offsetWidth || 300, near = at.S != null && at.H != null && Math.abs(posOf(at.S) - posOf(at.H)) * w / 100 < 70;
    IN.parentNode.classList.toggle('is-stack', !!near);
  }

  // ---------------------------------------------------------------- the chances: pretend elections
  var NAT = 3, RACE = 5, RUNS = 2000, oddsT = null;
  var rnd = Math.random;
  function seeded(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss() { var u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function odds() {
    rnd = seeded(20261103);      // the chances are the same every time for the same map: a drag never flickers
    var shift = mood - TODAY, win = { S: 0, H: 0 }, free = [], base = { S: { D: 0, R: 0, I: 0 }, H: { D: 0, R: 0, I: 0 } };
    base.S.D = M.senate.base.D; base.S.R = M.senate.base.R;
    RS.forEach(function (x) { if (fixed(x)) base[x.c][sideParty(x, sideAt(x, 0))]++; else free.push(x); });
    for (var n = 0; n < RUNS; n++) {
      var nat = gauss() * NAT, t = { S: { D: base.S.D, R: base.S.R, I: base.S.I }, H: { D: base.H.D, R: base.H.R, I: base.H.I } };
      for (var k = 0; k < free.length; k++) {
        var x = free[k], v = x.m + shift + nat + gauss() * RACE;
        t[x.c][v > 0 ? x.L.p : 'R']++;
      }
      if (control('S', t.S) === 'D') win.S++;
      if (control('H', t.H) === 'D') win.H++;
    }
    rnd = Math.random;      // election night stays a surprise
    ['S', 'H'].forEach(function (ch) {
      var p = Math.round(win[ch] / RUNS * 100), o = $('mt-b-' + ch).querySelector('.mt-odds');
      var lead = p >= 50 ? 'D' : 'R', q = lead === 'D' ? p : 100 - p;
      o.hidden = false;
      var row = function (k, pd, cls) {
        var ld = pd >= 50 ? 'D' : 'R', qq = ld === 'D' ? pd : 100 - pd;
        return '<span class="mt-vs' + cls + '"><span class="mt-vs-k">' + k + '</span><span class="mt-odds-bar"><i class="mt-odds-d" style="width:' + pd + '%"></i></span>'
          + '<b class="is-' + ld + '" title="' + party(ld) + '">' + ld + ' ' + (qq >= 99 ? '99+' : qq) + '%</b></span>';
      };
      var mk = MK && MK.us[ch], h = '<span class="mt-vs-h">Chance to win it</span>' + row('Your map', p, '');
      if (mk) {
        h += row('<span class="mt-vs-l">Betting markets</span><span class="mt-vs-s">Markets</span>', mk.D, ' is-mk');
        if ((mk.D >= 50 ? 'D' : 'R') !== lead && Math.abs(mk.D - 50) >= 5) h += '<span class="mt-vs-say">Your map and the markets pick different winners.</span>';
        // where the number was read: every market link through the one door (markets.js LPAff, build/affiliate.py)
        h += '<span class="mt-vs-src">' + (mk.u || []).map(function (u) { return mkA(u, /kalshi\.com/.test(u) ? 'Kalshi' : 'Polymarket'); }).join(' and ')
          + (W.LPAff && W.LPAff.note(mk.u) ? ' <span class="mk-aff">' + esc(W.LPAff.note(mk.u)) + '</span>' : '') + '</span>';
      }
      o.innerHTML = h;
    });
  }
  function oddsSoon() { clearTimeout(oddsT); oddsT = setTimeout(odds, 140); }

  // ---------------------------------------------------------------- the race cards
  var LIST = $('mt-list'), MORE = $('mt-more'), WHERE = $('mt-where'), PAGE = 24;
  function face(c) {
    if (!c.f) return '<span class="mt-face" aria-hidden="true"></span>';
    if (/\.(jpg|jpeg|png|webp)$/i.test(c.f)) return '<img class="mt-face" src="' + esc(ROOT + c.f) + '" alt="" width="40" height="40" loading="lazy" decoding="async">';
    return '<span class="mt-face" aria-hidden="true">' + esc(c.f) + '</span>';
  }
  function grade(c) { return c.g ? '<span class="g g-sm ' + esc(c.g[0]) + '" title="Liberty Score">' + esc(c.g[1]) + '</span>' : ''; }
  function partyName(p) { return p === 'D' ? 'Democrat' : p === 'R' ? 'Republican' : 'Independent'; }
  function card(x) {
    var who = function (k) {
      var c = x[k];
      if (!c) return '';
      return '<button type="button" class="mt-pick is-' + c.p + '" data-id="' + esc(x.id) + '" data-side="' + k + '" aria-pressed="false">'
        + face(c) + '<span class="mt-who"><b>' + esc(c.n) + '</b><small>' + partyName(c.p) + '</small></span>' + grade(c)
        + '<span class="mt-win" aria-hidden="true"></span></button>';
    };
    return '<li class="mt-race" data-id="' + esc(x.id) + '"><p class="mt-rhead"><a class="mt-rname" href="' + esc(ROOT + 'races/' + x.id + '/') + '">' + esc(x.lb) + '</a>'
      + '<span class="mt-rate" title="The forecasters’ average rating">' + (x.lock ? '' : 'Experts: ') + esc(x.w) + '</span>' + mkChip(x) + '<span class="mt-state"></span></p>'
      + '<div class="mt-pair">' + who('L') + who('R') + '</div>'
      + '<div class="mt-meter" aria-hidden="true"><span class="mt-meter-in"></span></div></li>';
  }
  function mkChip(x) {
    var f = fav(x);
    if (!f) return '';
    return '<span class="mt-mk is-' + (f.s === 'R' ? 'R' : x.L.p) + '" title="The betting markets’ chance: Polymarket and Kalshi">Markets: ' + esc(surname(f.n)) + ' <b class="num">' + f.p + '%</b></span>';
  }
  function chosen() {
    var c = RS.filter(function (x) { return x.c === tab; });
    if (where === 'close') c = c.filter(function (x) { return Math.abs(x.m) < M.model.safeFloor; });
    else if (where === 'mine') c = c.filter(function (x) { return pick[x.id]; });
    else if (where === 'against') { var sh = mood - TODAY; c = c.filter(function (x) { return against(x, sideAt(x, sh)); }); }
    else if (where !== 'all') c = c.filter(function (x) { return x.st === where; });
    return c.sort(function (a, b) { return (Math.abs(a.m) - Math.abs(b.m)) || (a.lb < b.lb ? -1 : 1); });
  }
  function options() {
    var c = RS.filter(function (x) { return x.c === tab; }), sts = {}, nClose = 0;
    c.forEach(function (x) { sts[x.st] = x.lb.replace(/ (Senate.*|\d+|at large)$/, ''); if (Math.abs(x.m) < M.model.safeFloor) nClose++; });
    var nMine = c.filter(function (x) { return pick[x.id]; }).length, nAg = againstAll(tab, mood - TODAY).length;
    var h = '<option value="close">The close races (' + nClose + ')</option><option value="all">Every ' + (tab === 'S' ? 'Senate' : 'House') + ' race (' + c.length + ')</option>'
      + (nMine ? '<option value="mine">The races you called (' + nMine + ')</option>' : '')
      + (nAg ? '<option value="against">Where you go against the markets (' + nAg + ')</option>' : '')
      + Object.keys(sts).sort(function (a, b) { return sts[a] < sts[b] ? -1 : 1; }).map(function (s) { return '<option value="' + s + '">' + esc(sts[s]) + '</option>'; }).join('');
    WHERE.innerHTML = h;
    if ((where === 'mine' && !nMine) || (where === 'against' && !nAg)) where = 'close';
    WHERE.value = where;
  }
  function list() {
    var c = chosen(), shown = showAll ? c : c.slice(0, PAGE);
    LIST.innerHTML = shown.length ? shown.map(card).join('') : '<li class="mt-empty dim">No races here.</li>';
    MORE.hidden = c.length <= PAGE;
    MORE.textContent = showAll ? 'Show fewer' : 'Show all ' + c.length;
    cards();
  }
  function cards() {
    var shift = mood - TODAY;
    [].forEach.call(LIST.querySelectorAll('.mt-race'), function (li) {
      var x = BY[li.getAttribute('data-id')], s = night ? night.side[x.id] : sideAt(x, shift), v = x.m + shift;
      li.classList.toggle('is-pin', !!pick[x.id]);
      li.classList.toggle('is-real', !!real[x.id]);
      li.classList.toggle('is-against', !night && !real[x.id] && against(x, s));
      [].forEach.call(li.querySelectorAll('.mt-pick'), function (b) {
        var k = b.getAttribute('data-side'), won = s === k;
        b.classList.toggle('is-win', won);
        b.classList.toggle('is-lose', !!s && !won);
        b.setAttribute('aria-pressed', pick[x.id] === k ? 'true' : 'false');
        b.disabled = !!real[x.id] || !!x.lock || !!night;
        b.querySelector('.mt-win').textContent = won ? (real[x.id] ? 'Won' : pick[x.id] ? 'Your call' : 'Wins') : '';
      });
      var st = li.querySelector('.mt-state'), sw = stateWords(x, s, v);
      if (st._t !== sw.t + sw.p) { st._t = sw.t + sw.p; st.innerHTML = sw.h; st.className = 'mt-state' + (sw.p ? ' is-' + sw.p : '') + (sw.k ? ' is-' + sw.k : ''); st.title = sw.t; }
      var mi = li.querySelector('.mt-meter-in'), w = Math.min(50, Math.abs(v) * 2.5);
      mi.style.width = (x.lock || pick[x.id] || real[x.id] ? 0 : w) + '%';
      mi.style.left = v > 0 ? (50 - w) + '%' : '50%';
      mi.className = 'mt-meter-in is-' + (v > 0 ? x.L.p : 'R');
    });
  }

  // The words at the right of a card's head: who wins and by how many percentage points (Elysa, 30 October 2026: "show
  // the actual percentage points for margin of victory"). Before the night it is the forecast margin at the slider; on a
  // pretend night, the margin that night's run drew for a race once it is called; on the real night, the counted margin.
  // A race the reader called, or with one side on the ballot, has no margin to show.
  // {h: the pill's html, t: the same in words for its title, p: the party colour, k: what kind}
  function marginWords(x, s, pts, lead) {
    var p = sideParty(x, s), n = r1(Math.abs(pts)).toFixed(1), who = surname(x[s].n);
    return { h: (lead ? '<span class="mt-sk">' + lead + '</span> ' : '') + '<b class="num">' + p + ' +' + n + '</b> <span class="mt-su">pts</span>', t: who + ' by ' + n + ' percentage points', p: p };
  }
  function stateWords(x, s, v) {
    var o;
    if (real[x.id]) { o = realM[x.id] != null ? marginWords(x, real[x.id], realM[x.id], 'Called') : { h: 'Called on the night', t: 'Called on the night', p: sideParty(x, real[x.id]) }; o.k = 'real'; return o; }
    if (pick[x.id]) return { h: 'Your call', t: 'You called this race', p: '', k: 'mine' };
    if (x.lock) return { h: '', t: '', p: '' };
    if (night) { if (night.v[x.id] != null && s) { o = marginWords(x, s, night.v[x.id], 'Won'); o.k = 'won'; return o; } return { h: '', t: '', p: '' }; }
    if (Math.abs(v) < 0.05) return { h: '<b>Dead even</b>', t: 'Dead even at this setting', p: '' };
    return marginWords(x, v > 0 ? 'L' : 'R', v);
  }

  // the short counts: the line under the slider and the bar that stays on screen among the race cards
  function counts(ch, t) {
    var k = ch === 'S' ? 's' : 'h';
    [].forEach.call(box.querySelectorAll('.mt-' + k + '-D'), function (el) { el.textContent = t.D + (t.I ? '+' + t.I : ''); });
    [].forEach.call(box.querySelectorAll('.mt-' + k + '-R'), function (el) { el.textContent = t.R; });
  }

  // ---------------------------------------------------------------- one draw of the whole map
  function draw() {
    var shift = mood - TODAY, side = function (x) { return sideAt(x, shift); };
    ['S', 'H'].forEach(function (ch) {
      var t = tally(ch, shift);
      paintChamber(ch, side);
      board(ch, t, control(ch, t));
      $('mt-b-' + ch).querySelector('.mt-gain').textContent = gainLine(ch, t);
      counts(ch, t);
    });
    $('mt-score-m').textContent = short(mood);
    moodLabel();
    flips();
    cards();
    var n = Object.keys(pick).length;
    $('mt-mine').hidden = !n;
    $('mt-mine').innerHTML = n ? 'You called ' + n + ' race' + (n === 1 ? '' : 's') + ' yourself. <button type="button" class="mt-clear" id="mt-clear">Hand them all back to the mood</button>' : '';
    runLabel();
    boldSum();
    oddsSoon();
    save();
  }

  // The line under step 3: how many of the reader's calls go against the betting markets, and a tap to see them.
  function boldSum() {
    var el = $('mt-boldsum'), mk = $('mt-mk');
    if (!MK) { el.hidden = true; mk.hidden = true; return; }
    mk.hidden = false;
    mk.setAttribute('aria-pressed', isMarketMap() ? 'true' : 'false');
    var sh = mood - TODAY, S = againstAll('S', sh), H = againstAll('H', sh);
    el.hidden = false;
    if (!S.length && !H.length) {
      el.innerHTML = '<span class="mt-bs-i" aria-hidden="true">=</span><span>Your map agrees with the betting markets in every race they price.</span>';
      return;
    }
    var names = S.slice(0, 3).map(function (x) { return x.lb.replace(/ Senate.*$/, ''); }), say = [];
    if (S.length) say.push('<b class="num">' + S.length + '</b> Senate race' + (S.length === 1 ? '' : 's') + ' (' + esc(names.join(', ')) + (S.length > 3 ? ' and more' : '') + ')');
    if (H.length) say.push('<b class="num">' + H.length + '</b> House race' + (H.length === 1 ? '' : 's'));
    el.innerHTML = '<span class="mt-bs-i" aria-hidden="true">&#9889;</span><span>You go against the betting markets in ' + say.join(' and ') + '. '
      + '<button type="button" class="mt-bs-go" id="mt-bs-go">Show them</button></span>';
  }
  // the map the markets would draw: the national vote they expect (the Markets mark; today's polls when they price none),
  // and every race they price given to their favorite
  function mkMood() { return MK && MK.us && MK.us.V && isFinite(MK.us.V.m) ? Math.max(-MAX, Math.min(-MIN, MK.us.V.m)) : TODAY; }
  function isMarketMap() {
    if (!MK || r1(mood) !== r1(mkMood())) return false;
    var sh = mood - TODAY;
    return RS.every(function (x) { var f = fav(x); return !f || real[x.id] || f.p <= 50 || sideAt(x, sh) === f.s; })
      && Object.keys(pick).every(function (i) { var f = fav(BY[i]); return f && pick[i] === f.s; });
  }
  // the calls Betting favorites makes: every race the markets price where their favorite is not already ahead at that vote
  function marketPicks() {
    var keep = pick, out = {}, sh = mkMood() - TODAY;
    pick = {};
    RS.forEach(function (x) { var f = fav(x); if (f && f.p > 50 && !real[x.id] && sideAt(x, sh) !== f.s) out[x.id] = f.s; });
    pick = keep;
    return out;
  }
  function marketMap() { mood = mkMood(); pick = marketPicks(); IN.value = String(-mood); }
  // THE READER'S SWITCH (markets.js: "Betting odds", remembered, heard here as lp:odds). Off takes every market number off
  // the board: the chips, the market row under each chamber, the Markets mark, Betting favorites and the line that counts
  // the races called against them. The markets' own calls are handed back; calls the reader made stay.
  function oddsOn() {
    var on = !D.documentElement.classList.contains('mk-off');
    if (!on && MK) dropMarketPicks();
    MK = on ? MKALL : null;
    if (!MK && where === 'against') where = 'close';
    $('mt-mksw').hidden = !MKALL;
    mkPin();
    options(); list(); draw();
  }
  // The Markets mark sits under the slider with Polls today. Closer than a label's width, the two labels stand back to back,
  // each still pointing at its own place (the marks are often under a point apart: polls D+8.9, markets D+9.7 on 31 Oct).
  function mkPin() {
    var v = MK && MK.us && MK.us.V, tr = IN.parentNode, a = $('mt-pin-mk'), b = $('mt-pin-today');
    pin('mt-pin-mk', v ? v.m : null);
    a.style.transform = b.style.transform = '';
    var w = IN.offsetWidth || 300, gap = v ? (posOf(TODAY) - posOf(v.m)) * w / 100 : 999, near = !!v && Math.abs(gap) < 96;
    tr.classList.toggle('is-mk-l', near && gap > 0);
    tr.classList.toggle('is-mk-r', near && gap <= 0);
    if (near) {      // each label leans away from the other with its narrow triangle on its own point, 2px apart even at 0
      var x = Math.min(3, (Math.abs(gap) - 2) / 2);
      (gap > 0 ? a : b).style.transform = 'translateX(calc(-100% + ' + x + 'px))';
      (gap > 0 ? b : a).style.transform = 'translateX(' + (-x) + 'px)';
    }
  }
  // Another setting after Betting favorites hands the markets' calls back, so "Dead even" is a dead-even map; calls the
  // reader made by hand stay, as they do when the slider moves.
  function dropMarketPicks() {
    if (!MK) return;
    var a = Object.keys(pick), m = marketPicks(), b = Object.keys(m);
    if (!a.length || a.length !== b.length || !a.every(function (i) { return m[i] === pick[i]; })) return;
    pick = {}; if (where === 'mine') where = 'close'; options(); list();
  }

  // ---------------------------------------------------------------- election night
  function hm(h) {
    var day = h >= 24 ? (h >= 48 ? ' Thursday' : ' Wednesday') : '', hh = Math.floor(h) % 24, mm = Math.floor((h - Math.floor(h)) * 60);
    return ((hh % 12) || 12) + ':' + (mm < 10 ? '0' : '') + mm + (hh < 12 ? ' AM' : ' PM') + day;
  }
  function runNight() {
    var shift = mood - TODAY, nat = gauss() * NAT, calls = [];
    night = { side: {}, v: {}, at: 0, done: false, feed: [], flash: {} };
    RS.forEach(function (x) {
      var s, v;
      if (fixed(x)) { s = sideAt(x, shift); v = s === 'L' ? 30 : -30; }
      else { v = x.m + shift + nat + gauss() * RACE; s = v > 0 ? 'L' : 'R'; }
      var a = Math.abs(v), wait = a >= 15 ? Math.random() * 0.05 : (15 - a) / 15 * 4.5 * (0.55 + Math.random() * 0.9) + (a < 1 ? 5 + Math.random() * 9 : 0);
      calls.push({ x: x, s: s, v: v, t: x.close + wait });
    });
    calls.sort(function (a, b) { return a.t - b.t; });
    // the run spends its seconds on the close races: a safe seat is a blink, a close one a beat
    var tot = 0;
    calls.forEach(function (c) { tot += Math.abs(c.x.m) < M.model.safeFloor || (c.x.hold && c.x.hold !== sideParty(c.x, c.s)) ? 1 : 0.12; c.cw = tot; });
    night.calls = calls; night.k = 0; night.tot = tot;
    var me = night, DUR = reduce ? 0 : 14000, t0 = null;
    $('mt-night').hidden = false; $('mt-night-end').hidden = true; $('mt-flash').hidden = true;
    $('mt-feed').innerHTML = '';
    $('mt-clock-l').textContent = 'Eastern time · one pretend night at ' + short(mood);
    box.classList.add('is-night');
    [IN].concat([].slice.call(box.querySelectorAll('.mt-pre,#mt-year'))).forEach(function (b) { b.disabled = true; });
    runLabel();
    var nb = $('mt-night');
    if (nb.getBoundingClientRect().top > W.innerHeight * 0.6 || nb.getBoundingClientRect().top < 0) {
      $('mt-b-S').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
    cards();
    // a timer, not animation frames: a background tab pauses frames, and the night must still reach its end
    function frame() {
      if (night !== me) return;      // a newer run, or back to the map: this one stops
      var ts = Date.now();
      if (t0 === null) t0 = ts;
      var f = DUR ? Math.min(1, (ts - t0) / DUR) : 1;
      if (me.skip) f = 1;
      step(f * me.tot);
      if (f < 1) setTimeout(frame, 40); else finish();
    }
    frame();
  }
  function step(upto) {
    var n = night, newer = [];
    while (n.k < n.calls.length && n.calls[n.k].cw <= upto + 1e-9) { var c = n.calls[n.k++]; n.side[c.x.id] = c.s; if (!fixed(c.x)) n.v[c.x.id] = c.v; newer.push(c); }
    if (!newer.length && n.k) return;
    var now = n.k ? n.calls[n.k - 1].t : 19;
    $('mt-clock').textContent = hm(now);
    var side = function (x) { return n.side[x.id] || null; };
    ['S', 'H'].forEach(function (ch) {
      paintChamber(ch, side);
      var t = tally(ch, 0, function (x) { return n.side[x.id]; });
      var c = clinched(ch, t);
      board(ch, t, c, c ? true : false);
      if (c && !n.flash[ch]) {
        n.flash[ch] = 1;
        var fl = $('mt-flash');
        fl.hidden = false;
        fl.className = 'mt-flash is-' + c;
        fl.textContent = hm(now) + ': ' + (c === 'I' ? 'independents decide the ' : party(c) + ' ' + (ch === 'S' && c === 'R' && t.R === 50 ? 'keep' : gainWord(ch, c)) + ' the ') + (ch === 'S' ? 'Senate' : 'House');
      }
      counts(ch, t);
    });
    $('mt-called').innerHTML = '<span>' + n.k + ' of ' + n.calls.length + ' races called</span><span class="mt-prog" aria-hidden="true"><i style="width:' + (100 * n.k / n.calls.length).toFixed(1) + '%"></i></span>';
    var feed = $('mt-feed'), add = '';
    newer.forEach(function (c) {
      var x = c.x, p = sideParty(x, c.s), flip = x.hold && x.hold !== p, close = Math.abs(x.m) < M.model.safeFloor;
      if (!close && !flip) return;
      var who = c.s === 'L' ? x.L.n : x.R.n;
      add = '<li class="is-' + p + '"><span class="mt-feed-t num">' + hm(c.t) + '</span><span><b>' + esc(x.lb) + '</b> ' + esc(who) + (flip ? ' <em>' + party(p).replace(/s$/, '') + ' gain</em>' : '') + '</span>'
        + (fixed(x) ? '' : '<b class="mt-feed-m num">' + p + '+' + r1(Math.abs(c.v)).toFixed(1) + '</b>') + '</li>' + add;
    });
    if (add) {
      feed.insertAdjacentHTML('afterbegin', add);
      while (feed.children.length > 6) feed.removeChild(feed.lastChild);
    }
    cards();
  }
  // A chamber is decided once one side has enough seats called that the rest cannot change who controls it.
  function clinched(ch, t) {
    var left = (ch === 'S' ? 100 : 435) - t.D - t.R - t.I;
    if (ch === 'S') {
      if (t.D >= SNEED) return 'D';
      if (t.R >= SNEED - 1) return 'R';
      if (!left) return 'I';
      return null;
    }
    if (t.D >= HNEED) return 'D';
    if (t.R >= HNEED) return 'R';
    if (!left) return 'I';
    return null;
  }
  function finish() {
    if (!night || night.done) return;
    night.done = true;
    var res = ['S', 'H'].map(function (ch) {
      var t = tally(ch, 0, function (x) { return night.side[x.id]; }), c = control(ch, t), name = ch === 'S' ? 'Senate' : 'House';
      return (c === 'I' ? 'Independents decide the ' + name : party(c) + ' ' + (ch === 'S' && c === 'R' && t.R === 50 ? 'keep' : gainWord(ch, c)) + ' the ' + name)
        + ', ' + Math.max(t.D, t.R) + ' to ' + Math.min(t.D, t.R) + (t.I ? ' with ' + t.I + ' independent' + (t.I > 1 ? 's' : '') : '');
    });
    var fl = $('mt-flash');
    fl.hidden = false; fl.className = 'mt-flash is-end';
    fl.innerHTML = '<span class="mt-flash-k">Morning after, at ' + esc(short(mood)) + '</span>' + esc(res[0]) + '. ' + esc(res[1]) + '.';
    $('mt-night-end').hidden = false;
    $('mt-skip').hidden = true;
    cards();
  }
  // Step 2's own buttons stay live through a pretend night and after it (Elysa, 30 October 2026: "the start button ...
  // not visible after you click run election night ... need to refresh the page to run a new simulation"). Run election
  // night stayed greyed out once a night had run, Start again was hidden unless a race had been called by hand, and the
  // one live button, Run it again, sat at the foot of the night's feed, a phone screen and more below. Now Run says
  // "Run it again" and Start again shows for as long as a night is on screen, both right under the chambers.
  function runLabel() {
    $('mt-run').lastChild.textContent = night ? ' Run it again' : ' Run election night';
    $('mt-reset').hidden = !(night || Object.keys(pick).length || r1(mood) !== r1(TODAY));
  }
  function leaveNight() {
    night = null;
    $('mt-night').hidden = true; $('mt-skip').hidden = false;
    box.classList.remove('is-night');
    [IN].concat([].slice.call(box.querySelectorAll('.mt-pre,#mt-year'))).forEach(function (b) { b.disabled = false; });
    runLabel();
  }
  function endNight() {
    leaveNight();
    draw();
  }

  // ---------------------------------------------------------------- the address
  var saveT = null;
  function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 250); }
  function saveNow() {
    var q = new URLSearchParams(W.location.search), d = [], r = [];
    q.delete('mood'); q.delete('d'); q.delete('r');
    Object.keys(pick).forEach(function (i) { (pick[i] === 'L' ? d : r).push(i); });
    if (r1(mood) !== r1(TODAY)) q.set('mood', String(r1(mood)));
    if (d.length) q.set('d', d.join(','));
    if (r.length) q.set('r', r.join(','));
    var qs = q.toString().replace(/%2C/g, ',');
    try { W.history.replaceState(W.history.state, '', W.location.pathname + (qs ? '?' + qs : '') + W.location.hash); } catch (err) {}
    var S = tally('S', mood - TODAY), H = tally('H', mood - TODAY), cs = control('S', S), chh = control('H', H);
    var say = function (ch, c, t) { var name = ch === 'S' ? 'the Senate' : 'the House'; return c === 'I' ? 'independents decide ' + name : party(c) + ' ' + gainWord(ch, c) + ' ' + name + ' ' + Math.max(t.D, t.R) + '-' + Math.min(t.D, t.R); };
    var sh = $('mt-share');
    sh.setAttribute('data-url', box.getAttribute('data-canon') + (qs ? '?' + qs : '') + '#midterms');
    var ag = MK ? againstAll(null, mood - TODAY).length : 0;
    sh.setAttribute('data-text', 'My midterms, at ' + short(mood) + ': ' + say('H', chh, H) + ', ' + say('S', cs, S) + '.'
      + (MK ? (ag ? ' I go against the betting markets in ' + ag + ' race' + (ag === 1 ? '' : 's') + '.' : ' I agree with the betting markets everywhere.') : '') + ' Call yours:');
  }
  function load() {
    var q = new URLSearchParams(W.location.search), v = parseFloat(q.get('mood'));
    if (!isNaN(v)) mood = Math.max(-MAX, Math.min(-MIN, v));
    ['d', 'r'].forEach(function (k) {
      (q.get(k) || '').split(',').forEach(function (i) { if (BY[i] && !BY[i].lock && BY[i][k === 'd' ? 'L' : 'R']) pick[i] = k === 'd' ? 'L' : 'R'; });
    });
    IN.value = String(-mood);
  }

  // ---------------------------------------------------------------- election night for real: the results map's file
  function realCalls() {
    W.fetch(ROOT + 'assets/election-results.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (doc) {
      if (!doc || doc.mock) return;
      var sen = ((doc.offices || {}).senate || {}).races || {}, hou = ((doc.offices || {}).house || {}).races || {}, n = 0;
      RS.forEach(function (x) {
        var row = x.c === 'S' ? sen[x.st] : hou[x.id];
        var c = (row || {}).called;
        if (!c) return;
        var s = c === 'R' ? 'R' : (x.L && x.L.p === c ? 'L' : null);
        if (s) { if (real[x.id] !== s) n++; real[x.id] = s; delete pick[x.id]; }
        var vs = ((row || {}).candidates || []).map(function (k) { return k.votes || 0; }).sort(function (a, b) { return b - a; });
        var tot = vs.reduce(function (a, b) { return a + b; }, 0), m = tot && vs.length > 1 ? r1(100 * (vs[0] - vs[1]) / tot) : null;
        if (s && realM[x.id] !== m) { realM[x.id] = m; n++; }
      });
      if (n) { options(); list(); draw(); }
      if (doc.live && !realCalls.t) realCalls.t = setInterval(realCalls, 60000);
    }).catch(function () {});
  }

  // ---------------------------------------------------------------- start
  function start(doc) {
    M = doc; RS = doc.races;
    RS.forEach(function (x) { BY[x.id] = x; });
    TODAY = doc.mood.today;
    SNEED = doc.senate.need; HNEED = doc.house.need;
    ['S', 'H'].forEach(function (ch) { DOTS[ch] = [].slice.call(box.querySelectorAll('.mt-dots[data-ch="' + ch + '"] circle')); });
    load();
    pin('mt-pin-today', TODAY);
    box.classList.add('is-live');
    options(); list(); draw();
    realCalls();
    stick();
    markets();
    picture();      // the picture to post (build/shareimg.js): "Make a picture" beside Share
  }

  // The betting markets: read once; a file over 48 hours old is not shown (the hourly push has stopped).
  function markets() {
    W.fetch(ROOT + 'assets/markets.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.at || !d.r || (Date.now() - Date.parse(d.at)) > 48 * 3600 * 1000) return;
      MKALL = d;
      oddsOn();
    }).catch(function () {});
  }
  D.addEventListener('lp:odds', function () { if (MKALL) oddsOn(); });
  W.addEventListener('resize', function () { if (MK) mkPin(); });

  // The small scoreboard that stays on screen once both chambers have scrolled away above (among the race cards, on
  // election night). It sits at the top of the whole section, so it never lies over the Senate and House tabs (it did
  // until 30 October 2026), and a tap on it goes back up to the slider.
  function stick() {
    var sc = $('mt-score'), boards = box.querySelector('.mt-boards');
    var top = 0;
    [].forEach.call(D.querySelectorAll('.top,.modes'), function (el) { var cs = W.getComputedStyle(el); if (cs.position === 'sticky' || cs.position === 'fixed') top += el.offsetHeight; });
    sc.style.top = top + 'px';
    $('mt-mood-box').style.scrollMarginTop = (top + 12) + 'px';
    // a scroll check, not an IntersectionObserver: a fast fling or a jump from above the chambers to below them never
    // crosses them, and an observer then never fires (measured 30 October 2026: the bar stayed hidden)
    var was = null, queued = false;
    function upd() {
      queued = false;
      var on = boards.getBoundingClientRect().bottom < top;
      if (on === was) return;
      was = on;
      sc.classList.toggle('is-on', on);
      sc.setAttribute('aria-hidden', on ? 'false' : 'true');
      sc.tabIndex = on ? 0 : -1;
    }
    function soon() { if (!queued) { queued = true; (W.requestAnimationFrame || setTimeout)(upd); } }
    W.addEventListener('scroll', soon, { passive: true });
    W.addEventListener('resize', soon);
    upd();
  }

  IN.addEventListener('input', function () { mood = -parseFloat(IN.value); draw(); optionsSoon(); });
  // the counts in "Which races" follow the slider a moment after it stops
  var optT = null;
  function optionsSoon() { clearTimeout(optT); optT = setTimeout(function () { options(); if (where === 'against') list(); }, 300); }
  box.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('button');
    if (!b || !box.contains(b) || b.disabled) return;
    if (night && !/^mt-(skip|back|again|more|run|reset)$/.test(b.id) && !b.classList.contains('mt-tab')) return;
    if (b.classList.contains('mt-pick')) {
      var i = b.getAttribute('data-id'), k = b.getAttribute('data-side');
      if (pick[i] === k) delete pick[i]; else pick[i] = k;
      var hadMine = WHERE.querySelector('option[value="mine"]');
      draw();
      if (!!hadMine !== !!Object.keys(pick).length || where === 'mine') { options(); if (where === 'mine') list(); }
    } else if (b.classList.contains('mt-pre') && b.hasAttribute('data-mood')) {
      dropMarketPicks(); mood = parseFloat(b.getAttribute('data-mood')); IN.value = String(-mood); draw();
    } else if (b.id === 'mt-reset') {
      if (night) leaveNight();
      mood = TODAY; pick = {}; IN.value = String(-mood); where = 'close'; options(); list(); draw();
    } else if (b.id === 'mt-mk') {
      marketMap(); options(); list(); draw();
    } else if (b.id === 'mt-bs-go') {
      if (!againstAll(tab, mood - TODAY).length) {
        tab = tab === 'S' ? 'H' : 'S';
        [].forEach.call(box.querySelectorAll('.mt-tab'), function (t) { t.setAttribute('aria-selected', t.id === 'mt-tab-' + tab ? 'true' : 'false'); });
      }
      where = 'against'; showAll = false; options(); list();
      var hw = $('mt-how'); if (hw.scrollIntoView) hw.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    } else if (b.id === 'mt-clear') {
      pick = {}; if (where === 'mine') where = 'close'; options(); list(); draw();
    } else if (b.id === 'mt-run' || b.id === 'mt-again') {
      if (night) { night = null; }
      runNight();
    } else if (b.id === 'mt-skip') {
      if (night) night.skip = true;
    } else if (b.id === 'mt-back') {
      endNight();
    } else if (b.id === 'mt-more') {
      showAll = !showAll; list();
    } else if (b.classList.contains('mt-tab')) {
      tab = b.id === 'mt-tab-H' ? 'H' : 'S'; where = 'close'; showAll = false;
      [].forEach.call(box.querySelectorAll('.mt-tab'), function (t) { t.setAttribute('aria-selected', t === b ? 'true' : 'false'); });
      options(); list();
    }
  });
  WHERE.addEventListener('change', function () { where = WHERE.value; showAll = false; list(); });
  $('mt-year').addEventListener('change', function () { var v = parseFloat(this.value); if (!isNaN(v) && !night) { dropMarketPicks(); mood = v; IN.value = String(-mood); draw(); } });

  // ---------------------------------------------------------------- the picture to post (build/shareimg.js)
  // Armin, 30 October 2026: "when people play around with these tools, they should be able to produce an image that they
  // could post on social media. It has our website and our branding on it". The Congress as the reader built it: both
  // chambers seat by seat in the party colours, who controls each, and four close races with the candidates' faces (the
  // reader's own calls first). Drawn from the map (the mood and the calls), never from a pretend night in progress.
  // The frame (the brand, the title, the address at the foot) is shareimg.js's; url() and text() are the Share button's.
  var PIC_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>';
  function picSay(ch) {
    var t = tally(ch, mood - TODAY), c = control(ch, t), name = ch === 'S' ? 'Senate' : 'House';
    if (c === 'I') return { t: t, c: c, p: 'Independents', w: 'decide the ' + name, vp: false };
    return { t: t, c: c, p: party(c), w: gainWord(ch, c) + ' the ' + name, vp: ch === 'S' && c === 'R' && t.R === SNEED - 1 };
  }
  function picRaces() {
    var shift = mood - TODAY, two = function (x) { return x.L && x.R && !x.lock; };
    var mine = RS.filter(function (x) { return pick[x.id] && two(x); }).sort(function (a, b) { return Math.abs(a.m) - Math.abs(b.m); });
    var rest = RS.filter(function (x) { return !pick[x.id] && two(x); })
      .sort(function (a, b) { return ((a.c === 'S' ? 0 : 1) - (b.c === 'S' ? 0 : 1)) || (Math.abs(a.m + shift) - Math.abs(b.m + shift)); });
    return mine.concat(rest).slice(0, 4);
  }
  function picDraw(ctx, box, kit) {
    var c = kit.c, col = { D: c.dem, R: c.rep, I: c.ind, U: '#2E2D2A' }, shift = mood - TODAY;
    var side = function (x) { return sideAt(x, shift); };
    var races = picRaces(), src = function (k) { return k && k.f && /\.(jpg|jpeg|png|webp)$/i.test(k.f) ? ROOT + k.f : ''; };
    var want = [];
    races.forEach(function (x) { want.push(kit.img(src(x.L)), kit.img(src(x.R))); });
    return Promise.all(want).then(function (ims) {
      var gap = 24, cw = (box.w - gap) / 2, cardH = 96, rows = races.length > 2 && box.h >= 560 ? 2 : (races.length ? 1 : 0), vp = picSay('S').vp || picSay('H').vp;
      var racesH = rows ? 42 + rows * cardH + (rows - 1) * 14 : 0, between = rows ? 26 : 0;
      var fixedH = 40 + 74 + 44 + 22 + (vp ? 28 : 0), sc = Math.min((cw - 40) / 400, Math.max(0.5, (box.h - racesH - between - fixedH) / 212));
      var panelH = fixedH + 212 * sc, total = panelH + between + racesH, y = box.y + Math.max(0, (box.h - total) / 2);
      // the two chambers
      ['S', 'H'].forEach(function (ch, k) {
        var x0 = box.x + k * (cw + gap), say = picSay(ch), t = say.t, cx = x0 + cw / 2;
        kit.round(ctx, x0, y, cw, panelH, 28); ctx.fillStyle = c.sunk; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = c.line; ctx.stroke();
        ctx.save(); kit.round(ctx, x0, y, cw, panelH, 28); ctx.clip(); ctx.fillStyle = col[say.c] || c.line; ctx.fillRect(x0, y, cw, 9); ctx.restore();
        if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
        kit.text(ctx, ch === 'S' ? 'SENATE' : 'HOUSE', x0 + 22, y + 50, { px: 30, weight: 800, fam: 'display', color: c.ink });
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
        kit.text(ctx, (ch === 'S' ? SNEED : HNEED) + ' TO WIN', x0 + cw - 22, y + 50, { px: 26, weight: 800, fam: 'display', color: c.dim, align: 'end' });
        // the chamber, seat by seat, on the page's own seat plan (the circles of the chamber on the page)
        var hx = cx - 200 * sc, hy = y + 40, row = seatsOf(ch, side), dots = DOTS[ch] || [];
        var svg = dots.length && dots[0].ownerSVGElement, mid = svg && svg.querySelector('.mt-mid');
        if (mid) {
          ctx.save(); ctx.strokeStyle = c.field; ctx.globalAlpha = 0.75; ctx.lineWidth = Math.max(1.5, 1.6 * sc); ctx.setLineDash([3 * sc, 4 * sc]);
          ctx.beginPath(); ctx.moveTo(hx + +mid.getAttribute('x1') * sc, hy + +mid.getAttribute('y1') * sc); ctx.lineTo(hx + +mid.getAttribute('x2') * sc, hy + +mid.getAttribute('y2') * sc); ctx.stroke(); ctx.restore();
        }
        dots.forEach(function (d, i) {
          var s = row[i];
          if (!s) return;
          var r = +d.getAttribute('r') * sc;
          ctx.beginPath(); ctx.arc(hx + +d.getAttribute('cx') * sc, hy + +d.getAttribute('cy') * sc, r, 0, Math.PI * 2);
          ctx.globalAlpha = s.fx ? 0.4 : 1; ctx.fillStyle = col[s.p] || col.U; ctx.fill(); ctx.globalAlpha = 1;
          if (s.pin) { ctx.lineWidth = Math.max(1.2, r * 0.45); ctx.strokeStyle = c.field; ctx.stroke(); }
        });
        // the count, big, in the party colours
        var ny = hy + 212 * sc + 74, dn = t.D + (t.I ? '+' + t.I : '');
        kit.text(ctx, dn, cx - 26, ny, { px: 84, weight: 900, fam: 'display', color: c.dem, align: 'end' });
        kit.text(ctx, String(t.R), cx + 26, ny, { px: 84, weight: 900, fam: 'display', color: c.rep, align: 'start' });
        kit.text(ctx, '–', cx, ny - 6, { px: 56, weight: 800, fam: 'display', color: c.dim, align: 'center' });
        // who controls it: the party in its colour, the rest in ink
        var p1 = say.p + ' ', p2 = say.w, wy = ny + 44, px = kit.fit(ctx, p1 + p2, cw - 36, 28, 700, 'body');
        var w1 = ctx.measureText(p1).width, w2 = ctx.measureText(p2).width, sx = cx - (w1 + w2) / 2;
        kit.text(ctx, p1, sx, wy, { px: px, weight: 700, fam: 'body', color: col[say.c] || c.ink, align: 'left' });
        kit.text(ctx, p2, sx + w1, wy, { px: px, weight: 700, fam: 'body', color: c.ink, align: 'left' });
        if (say.vp) kit.text(ctx, 'on the Vice President’s vote', cx, wy + 30, { px: 22, weight: 600, fam: 'body', color: c.dim, align: 'center', max: cw - 36 });
      });
      if (!rows) return;
      // four close races, the reader's own calls first
      var ry = y + panelH + between, nMine = races.filter(function (x) { return pick[x.id]; }).length;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
      kit.text(ctx, nMine ? 'MY CALLS' + (nMine < races.length ? ', AND THE CLOSEST RACES' : '') : 'THE CLOSEST RACES', box.x, ry + 30, { px: 30, weight: 800, fam: 'display', color: c.dim, max: box.w });
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      races.slice(0, rows * 2).forEach(function (x, i) {
        var x0 = box.x + (i % 2) * (cw + gap), y0 = ry + 48 + Math.floor(i / 2) * (cardH + 16);
        var s = side(x), wk = s === 'R' ? 'R' : 'L', lk = wk === 'L' ? 'R' : 'L', win = x[wk], lose = x[lk], wp = sideParty(x, s), v = x.m + shift;
        kit.round(ctx, x0, y0, cw, cardH, 22); ctx.fillStyle = c.panel; ctx.fill();
        ctx.save(); kit.round(ctx, x0, y0, cw, cardH, 22); ctx.clip(); ctx.fillStyle = col[wp] || c.line; ctx.fillRect(x0, y0, 8, cardH); ctx.restore();
        var fx = x0 + 24 + 34, fy = y0 + cardH / 2 - 3;
        kit.face(ctx, ims[i * 2 + (lk === 'L' ? 0 : 1)], fx + 36, fy + 24, 38, { ring: c.panel, ringW: 3, dim: 0.35, initials: lose.f && !src(lose) ? lose.f : kit.initials(lose.n) });
        kit.face(ctx, ims[i * 2 + (wk === 'L' ? 0 : 1)], fx, fy, 68, { ring: col[wp], ringW: 4, initials: win.f && !src(win) ? win.f : kit.initials(win.n) });
        // what it says at the end: the reader's call, or who wins by how many points at this mood
        var pill = pick[x.id] ? 'MY CALL' : Math.abs(v) < 0.05 ? 'EVEN' : wp + ' +' + r1(Math.abs(v)).toFixed(1);
        ctx.font = kit.font(26, 800, 'display');
        var pw = ctx.measureText(pill).width + 24, ph = 40, px0 = x0 + cw - 18 - pw, py0 = y0 + (cardH - ph) / 2;
        kit.round(ctx, px0, py0, pw, ph, ph / 2); ctx.fillStyle = pick[x.id] ? c.field : kit.alpha(col[wp] || c.ink, 0.18); ctx.fill();
        kit.text(ctx, pill, px0 + pw / 2, py0 + ph / 2 + 1, { px: 26, weight: 800, fam: 'display', color: pick[x.id] ? c.onField : (col[wp] || c.ink), align: 'center', base: 'middle' });
        var tx = x0 + 24 + 68 + 30, tw = px0 - 12 - tx;
        kit.text(ctx, win.n, tx, y0 + 43, { px: 28, weight: 700, fam: 'body', color: c.ink, max: tw });
        ctx.font = kit.font(23, 600, 'body');
        // the race and who lost it, or the race alone where both do not fit
        var l2 = x.lb + ', beats ' + surname(lose.n);
        if (ctx.measureText(l2).width > tw) l2 = x.lb;
        kit.text(ctx, l2, tx, y0 + 74, { px: 23, weight: 600, fam: 'body', color: c.dim, max: tw });
      });
    });
  }
  function picture() {
    var sh = $('mt-share');
    if (!sh || !sh.parentNode || $('mt-pic')) return;
    var b = D.createElement('button');
    b.type = 'button'; b.id = 'mt-pic'; b.className = 'btn btn-line shot-make'; b.setAttribute('data-shot', 'midterms');
    b.innerHTML = PIC_ICON + '<span>Make a picture</span>';
    sh.parentNode.insertBefore(b, sh.nextSibling);
    (W.LPShotQ = W.LPShotQ || []).push({
      id: 'midterms', el: '#midterms',
      kicker: 'Call the midterms',
      cta: 'Who wins Congress? Call it yourself at',
      title: function () {
        var S = picSay('S'), H = picSay('H'), hv = H.w.split(' ')[0], sv = S.w.split(' ')[0];
        // one party with both chambers is said once: "Republicans keep the House and the Senate"
        var said = S.c === H.c && S.c !== 'I' ? H.p + ' ' + (hv === sv ? hv + ' the House and the Senate' : H.w + ' and ' + S.w) : H.p + ' ' + H.w + ', ' + S.p + ' ' + S.w;
        return 'My ' + String(M.election || '2026').slice(0, 4) + ' Congress: ' + said;
      },
      sub: function () {
        var a = r1(Math.abs(mood)), n = Object.keys(pick).length;
        var at = r1(mood) === r1(TODAY) ? 'At today’s polls, ' + moodWords(mood) : a === 0 ? 'If the country splits dead even' : 'If the country votes ' + moodWords(mood);
        return at + (n ? '. I called ' + n + ' race' + (n === 1 ? '' : 's') + ' myself.' : '.');
      },
      text: function () { saveNow(); return sh.getAttribute('data-text'); },
      url: function () { saveNow(); return sh.getAttribute('data-url'); },
      draw: picDraw
    });
  }

  W.fetch(ROOT + 'assets/midterms.json').then(function (r) { return r.json(); }).then(start).catch(function () {});
})();
