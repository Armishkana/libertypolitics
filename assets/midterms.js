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
  var mood = TODAY, pick = {}, real = {}, night = null, tab = 'S', where = 'close', showAll = false;
  var SNEED = 51, HNEED = 218;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function moodWords(v) { var a = r1(Math.abs(v)); return a === 0 ? 'Dead even' : (v > 0 ? 'Democrats by ' : 'Republicans by ') + a; }
  function short(v) { var a = r1(Math.abs(v)); return a === 0 ? 'Even' : (v > 0 ? 'D+' : 'R+') + a; }
  function party(p) { return p === 'D' ? 'Democrats' : p === 'R' ? 'Republicans' : 'Independents'; }
  function sideParty(x, s) { return s === 'R' ? 'R' : x.L.p; }

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
    [].forEach.call(box.querySelectorAll('.mt-pre'), function (b) { b.setAttribute('aria-pressed', r1(parseFloat(b.getAttribute('data-mood'))) === r1(mood) ? 'true' : 'false'); });
    var yr = $('mt-year'), hit = '';
    [].forEach.call(yr.options, function (o) { if (o.value && r1(parseFloat(o.value)) === r1(mood)) hit = o.value; });
    yr.value = hit;
    yr.classList.toggle('is-on', !!hit);
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
      o.innerHTML = '<span class="mt-odds-bar"><i class="mt-odds-d" style="width:' + p + '%"></i></span><span><b class="is-' + lead + '">' + party(lead) + ' win it ' + (q >= 99 ? 'almost every time' : q + ' times in 100') + '</b> if the vote went like this</span>';
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
      + '<span class="mt-rate" title="The forecasters’ average rating">' + (x.lock ? '' : 'Experts: ') + esc(x.w) + '</span><span class="mt-state"></span></p>'
      + '<div class="mt-pair">' + who('L') + who('R') + '</div>'
      + '<div class="mt-meter" aria-hidden="true"><span class="mt-meter-in"></span></div></li>';
  }
  function chosen() {
    var c = RS.filter(function (x) { return x.c === tab; });
    if (where === 'close') c = c.filter(function (x) { return Math.abs(x.m) < M.model.safeFloor; });
    else if (where === 'mine') c = c.filter(function (x) { return pick[x.id]; });
    else if (where !== 'all') c = c.filter(function (x) { return x.st === where; });
    return c.sort(function (a, b) { return (Math.abs(a.m) - Math.abs(b.m)) || (a.lb < b.lb ? -1 : 1); });
  }
  function options() {
    var c = RS.filter(function (x) { return x.c === tab; }), sts = {}, nClose = 0;
    c.forEach(function (x) { sts[x.st] = x.lb.replace(/ (Senate.*|\d+|at large)$/, ''); if (Math.abs(x.m) < M.model.safeFloor) nClose++; });
    var nMine = c.filter(function (x) { return pick[x.id]; }).length;
    var h = '<option value="close">The close races (' + nClose + ')</option><option value="all">Every ' + (tab === 'S' ? 'Senate' : 'House') + ' race (' + c.length + ')</option>'
      + (nMine ? '<option value="mine">The races you called (' + nMine + ')</option>' : '')
      + Object.keys(sts).sort(function (a, b) { return sts[a] < sts[b] ? -1 : 1; }).map(function (s) { return '<option value="' + s + '">' + esc(sts[s]) + '</option>'; }).join('');
    WHERE.innerHTML = h;
    if (where === 'mine' && !nMine) where = 'close';
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
      [].forEach.call(li.querySelectorAll('.mt-pick'), function (b) {
        var k = b.getAttribute('data-side'), won = s === k;
        b.classList.toggle('is-win', won);
        b.classList.toggle('is-lose', !!s && !won);
        b.setAttribute('aria-pressed', pick[x.id] === k ? 'true' : 'false');
        b.disabled = !!real[x.id] || !!x.lock || !!night;
        b.querySelector('.mt-win').textContent = won ? (real[x.id] ? 'Won' : pick[x.id] ? 'Your call' : 'Wins') : '';
      });
      var st = li.querySelector('.mt-state');
      st.textContent = real[x.id] ? 'Called on the night' : pick[x.id] ? 'Your call' : x.lock ? '' : night ? '' : (Math.abs(v) < 0.05 ? 'Dead even' : 'Wins by ' + r1(Math.abs(v)) + ' pts');
      var mi = li.querySelector('.mt-meter-in'), w = Math.min(50, Math.abs(v) * 2.5);
      mi.style.width = (x.lock || pick[x.id] || real[x.id] ? 0 : w) + '%';
      mi.style.left = v > 0 ? (50 - w) + '%' : '50%';
      mi.className = 'mt-meter-in is-' + (v > 0 ? x.L.p : 'R');
    });
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
    $('mt-reset').hidden = !(n || r1(mood) !== r1(TODAY));
    oddsSoon();
    save();
  }

  // ---------------------------------------------------------------- election night
  function hm(h) {
    var day = h >= 24 ? (h >= 48 ? ' Thursday' : ' Wednesday') : '', hh = Math.floor(h) % 24, mm = Math.floor((h - Math.floor(h)) * 60);
    return ((hh % 12) || 12) + ':' + (mm < 10 ? '0' : '') + mm + (hh < 12 ? ' AM' : ' PM') + day;
  }
  function runNight() {
    var shift = mood - TODAY, nat = gauss() * NAT, calls = [];
    night = { side: {}, at: 0, done: false, feed: [], flash: {} };
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
    [IN].concat([].slice.call(box.querySelectorAll('.mt-pre,#mt-year,#mt-run,#mt-reset'))).forEach(function (b) { b.disabled = true; });
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
    while (n.k < n.calls.length && n.calls[n.k].cw <= upto + 1e-9) { var c = n.calls[n.k++]; n.side[c.x.id] = c.s; newer.push(c); }
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
    $('mt-called').textContent = n.k + ' of ' + n.calls.length + ' races called';
    var feed = $('mt-feed'), add = '';
    newer.forEach(function (c) {
      var x = c.x, p = sideParty(x, c.s), flip = x.hold && x.hold !== p, close = Math.abs(x.m) < M.model.safeFloor;
      if (!close && !flip) return;
      var who = c.s === 'L' ? x.L.n : x.R.n;
      add = '<li class="is-' + p + '"><span class="mt-feed-t num">' + hm(c.t) + '</span><span><b>' + esc(x.lb) + '</b> ' + esc(who) + (flip ? ' <em>' + party(p).replace(/s$/, '') + ' gain</em>' : '') + '</span></li>' + add;
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
  function endNight() {
    night = null;
    $('mt-night').hidden = true; $('mt-skip').hidden = false;
    box.classList.remove('is-night');
    [IN].concat([].slice.call(box.querySelectorAll('.mt-pre,#mt-year,#mt-run,#mt-reset'))).forEach(function (b) { b.disabled = false; });
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
    sh.setAttribute('data-text', 'My midterms, at ' + short(mood) + ': ' + say('H', chh, H) + ', ' + say('S', cs, S) + '. Call yours:');
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
      var sen = ((doc.offices || {}).senate || {}).races || {}, n = 0;
      RS.forEach(function (x) {
        if (x.c !== 'S') return;
        var c = (sen[x.st] || {}).called;
        if (!c) return;
        var s = c === 'R' ? 'R' : (x.L && x.L.p === c ? 'L' : null);
        if (s) { if (real[x.id] !== s) n++; real[x.id] = s; delete pick[x.id]; }
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
  }

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

  IN.addEventListener('input', function () { mood = -parseFloat(IN.value); draw(); });
  box.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('button');
    if (!b || !box.contains(b) || b.disabled) return;
    if (night && !/^mt-(skip|back|again|more)$/.test(b.id) && !b.classList.contains('mt-tab')) return;
    if (b.classList.contains('mt-pick')) {
      var i = b.getAttribute('data-id'), k = b.getAttribute('data-side');
      if (pick[i] === k) delete pick[i]; else pick[i] = k;
      var hadMine = WHERE.querySelector('option[value="mine"]');
      draw();
      if (!!hadMine !== !!Object.keys(pick).length || where === 'mine') { options(); if (where === 'mine') list(); }
    } else if (b.classList.contains('mt-pre')) {
      mood = parseFloat(b.getAttribute('data-mood')); IN.value = String(-mood); draw();
    } else if (b.id === 'mt-reset') {
      mood = TODAY; pick = {}; IN.value = String(-mood); where = 'close'; options(); list(); draw();
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
  $('mt-year').addEventListener('change', function () { var v = parseFloat(this.value); if (!isNaN(v) && !night) { mood = v; IN.value = String(-mood); draw(); } });

  W.fetch(ROOT + 'assets/midterms.json').then(function (r) { return r.json(); }).then(start).catch(function () {});
})();
