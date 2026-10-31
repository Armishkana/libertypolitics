/* The coalition calculator (build/coalition.py prints the page; this file makes it move).
   Every party is a button: tap to put it in the government, tap again to take it out. "Outside" marks a party
   that keeps a minority government alive without joining it. The chamber fills from the left in the order the
   parties were picked, the bar fills to the majority line, a red line the choice breaks is shown with its
   source, and "Ways to reach" lists every smallest team that makes a majority. The choice rides in the address
   (?gov=a,b&out=c) with the page's #hash left alone, so the discussion switch keeps working.
   With this file missing, the page still shows the chamber as the election left it and every party's seats. */
(function () {
  'use strict';
  var D = document, W = window;
  var box = D.getElementById('coalition'), raw = D.getElementById('coal-data');
  if (!box || !raw) return;
  var C;
  try { C = JSON.parse(raw.textContent); } catch (err) { return; }
  var P = {}, ids = [];
  C.parties.forEach(function (p) { P[p.id] = p; ids.push(p.id); });
  var MAJ = C.majority, ALL = C.seats;
  var gov = [], out = [];
  var dots = [].slice.call(box.querySelectorAll('.coal-dots circle'));
  var $ = function (id) { return D.getElementById(id); };
  var N = $('coal-n'), OF = $('coal-of'), SAY = $('coal-say'), WARN = $('coal-warn'), BAR = $('coal-bar'), BARO = $('coal-bar-o');
  var WAYS = $('coal-ways'), WAYSL = $('coal-ways-l'), RESET = $('coal-reset'), SHARE = $('coal-share');
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var showAll = false;

  function sum(list) { var s = 0; list.forEach(function (i) { s += P[i].seats; }); return s; }
  function names(list) { return list.map(function (i) { return P[i].name; }); }
  function join(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // A stated red line this government touches. wont-sit-with: the party and a target both in government (or the
  // target keeping it alive from outside, when the party refused that too). only-with: the party is in, and none
  // of the parties it said it governs with are. soft: a condition about who leads, broken only when a target is
  // the biggest party in the government, so it would hold the prime minister (broken() decides).
  function clashes(set, outs) {
    outs = outs || [];
    var hit = [];
    (C.redLines || []).forEach(function (r) {
      if (set.indexOf(r.party) < 0) return;
      if (r.kind === 'wont-sit-with') {
        if (r.targets.some(function (x) { return set.indexOf(x) >= 0 || (r.alsoOutside && outs.indexOf(x) >= 0); })) hit.push(r);
      } else if (r.kind === 'only-with') {
        if (!r.targets.some(function (x) { return set.indexOf(x) >= 0; })) hit.push(r);
      }
    });
    return hit;
  }
  function lead(set) { return set.slice().sort(function (a, b) { return (P[b].seats - P[a].seats) || (ids.indexOf(a) - ids.indexOf(b)); })[0]; }
  function broken(r, set) { return !r.soft || r.targets.indexOf(lead(set)) >= 0; }
  function hard(list, set) { return list.filter(function (r) { return broken(r, set); }); }

  // ---------------------------------------------------------------- what a government is called, and how likely it is
  // Every name is computed from the register, never typed per option: outside votes make it a Minority Government,
  // the two biggest parties together a Unity Government, a government without the party in power (C.incumbent) a
  // Change Government, anything else is named after its prime minister. "with ..." names who crosses from another
  // bloc; a whole bloc is named as one (C.blocWords) when every party of it joins.
  var BIG2 = ids.slice().sort(function (a, b) { return P[b].seats - P[a].seats; }).slice(0, 2);
  function surname(i) { var w = P[i].leader.split(' '); return w[w.length - 1]; }
  function label(i) { return (P[i].the ? 'the ' : '') + P[i].name; }
  function group(list) {
    var done = {}, parts = [];
    list.forEach(function (i) {
      if (done[i]) return;
      var b = P[i].bloc, all = ids.filter(function (x) { return P[x].bloc === b; });
      if (all.length > 1 && all.every(function (x) { return list.indexOf(x) >= 0; })) {
        all.forEach(function (x) { done[x] = 1; });
        parts.push((C.blocWords || {})[b] || 'the ' + b + ' parties');
      } else { done[i] = 1; parts.push(label(i)); }
    });
    return join(parts);
  }
  function name(G, O) {
    var L = lead(G), camp = P[L].camp || L, cross = G.filter(function (i) { return (P[i].camp || i) !== camp; }), title;
    if (O.length) title = 'Minority Government';
    else if (BIG2.every(function (i) { return G.indexOf(i) >= 0; })) { title = 'Unity Government'; cross = G.filter(function (i) { return BIG2.indexOf(i) < 0; }); }
    else if (C.incumbent && P[C.incumbent] && G.indexOf(C.incumbent) < 0) title = 'Change Government';
    else title = surname(L) + ' Government';
    var q = [];
    if (cross.length) q.push('with ' + group(cross));
    if (O.length) q.push('backed from outside by ' + group(O));
    return { title: title, qual: q.join(', '), pm: surname(L) };
  }
  // How far apart a cabinet is, left to right, from the bloc words the parties carry (blocs off this line, such as
  // the ultra-Orthodox or the Arab parties, are not placed on it). Four steps or more apart costs a lot.
  var AXIS = { 'Far-left': 0, 'Left': 1, 'Centre-left': 2, 'Center-left': 2, 'Centre': 3, 'Center': 3, 'Centre-right': 4, 'Center-right': 4, 'Right': 5, 'Far-right': 6 };
  function spread(G) {      // only between parties that ran in different blocs: a bloc that ran together has already agreed
    var best = null, on = G.filter(function (i) { return AXIS[P[i].bloc] != null; });
    on.forEach(function (x) { on.forEach(function (y) {
      var d = AXIS[P[y].bloc] - AXIS[P[x].bloc];
      if (d > 0 && (P[x].camp || x) !== (P[y].camp || y) && (!best || d > best.n)) best = { n: d, lo: P[x].bloc, hi: P[y].bloc };
    }); });
    return best;
  }
  function bw(b) { return 'the ' + b.toLowerCase().replace('-', ' '); }
  var TIER = { likely: 'Likely', possible: 'Possible', unlikely: 'Unlikely', remote: 'Very unlikely' };
  // For a government: every stated red line it breaks counts hard against it (by leader, so one leader's two lines
  // count once and a bit), every leader on record as open to it counts for it, and mixing blocs, needing outside
  // votes and adding parties cost a little. The reasons are the same facts in words, against first.
  function judge(G, O) {
    var broke = hard(clashes(G, O), G), plus = [], who = {}, camps = {};
    (C.redLines || []).forEach(function (r) {
      var inG = function (t) { return G.indexOf(t) >= 0; };
      if (r.kind === 'open-to' && (G.indexOf(r.party) >= 0 || O.indexOf(r.party) >= 0) && r.targets.some(inG)) plus.push(r);
      else if (r.kind === 'outside-support' && O.indexOf(r.party) >= 0 && r.targets.some(inG)) plus.push(r);
    });
    broke.forEach(function (r) { who[r.party] = 1; });
    G.forEach(function (i) { camps[P[i].camp || i] = 1; });
    var n = Object.keys(who).length, nc = Object.keys(camps).length, L = lead(G), sp = spread(G), far = sp && sp.n >= 4 ? sp.n - 3 : 0;
    var score = -100 * n - 20 * (broke.length - n) - 40 * far + 6 * plus.length - 15 * (nc - 1) - (O.length ? 8 : 0) - 3 * G.length;
    var tier = n === 0 && !far ? (plus.length && nc <= 2 ? 'likely' : 'possible') : n + (far ? 1 : 0) <= 1 ? 'unlikely' : 'remote';
    var why = [], seen = {};
    broke.forEach(function (r) {
      var k = r.party + (r.soft ? 's' : r.kind);
      if (seen[k]) return;
      seen[k] = 1;
      var inG = r.targets.filter(function (t) { return G.indexOf(t) >= 0; }), inO = r.targets.filter(function (t) { return O.indexOf(t) >= 0; });
      if (r.soft) why.push(surname(r.party) + ' won’t serve under ' + surname(L));
      else if (r.kind === 'only-with') why.push(surname(r.party) + ' backs only ' + group(r.targets));
      else why.push(surname(r.party) + ' ruled out ' + (inG.length ? group(inG) : 'relying on ' + group(inO)));
    });
    if (far) why.push('Joins ' + bw(sp.lo) + ' and ' + bw(sp.hi));
    plus.forEach(function (r) {
      var k = r.party + r.kind;
      if (seen[k]) return;
      seen[k] = 1;
      why.push(r.kind === 'outside-support' ? label(r.party).replace(/^t/, 'T') + ' offered to back it from outside' : surname(r.party) + ' is open to it');
    });
    if (!why.length) why.push('No leader has ruled it out');
    return { score: score, tier: tier, why: why, broke: n };
  }

  // ---------------------------------------------------------------- the chamber
  var last = [];
  function paint() {
    var empty = !gov.length && !out.length, seq = [];
    if (empty) {
      C.parties.forEach(function (p) { for (var k = 0; k < p.seats; k++) seq.push([p.id, 'r']); });
    } else {
      gov.forEach(function (i) { for (var k = 0; k < P[i].seats; k++) seq.push([i, 'g']); });
      out.forEach(function (i) { for (var k = 0; k < P[i].seats; k++) seq.push([i, 'o']); });
      ids.forEach(function (i) { if (gov.indexOf(i) < 0 && out.indexOf(i) < 0) for (var k = 0; k < P[i].seats; k++) seq.push([i, 'x']); });
    }
    var n = 0;
    dots.forEach(function (c, k) {
      var s = seq[k], key = s[0] + s[1];
      c.setAttribute('fill', P[s[0]].color);
      c.setAttribute('stroke', P[s[0]].color);
      c.setAttribute('class', 'd-' + s[1]);
      c.setAttribute('data-p', s[0]);
      // seats that change fill in one after another from the left: the chamber "fills up" to the line
      c.style.transitionDelay = (!reduce && last[k] !== key && s[1] !== 'x') ? (n++ * 7) + 'ms' : '0ms';
      last[k] = key;
    });
    box.classList.toggle('is-empty', empty);
  }

  // ---------------------------------------------------------------- the betting markets, woven into the sentence
  // C.mk.pm: {party: [the market's spelling of its leader, chance in 100]} (build/markets.py pm_payload). The sentence
  // names the chance of the biggest party's leader; a reader with "Betting odds" off never sees it (markets.css hides
  // .coal-mk under html.mk-off). markets.js hands over this hour's prices as lp:markets.
  function pmOdds(i) {
    var m = C.mk && C.mk.pm && C.mk.pm[i];
    if (!m) return '';
    return ' <span class="coal-mk">The betting markets give ' + esc(surname(i)) + ' <b class="num">' + m[1] + ' in 100</b> to be the next prime minister.</span>';
  }
  D.addEventListener('lp:markets', function (ev) {
    var w = C.mk && ev.detail && ev.detail.w && ev.detail.w[C.mk.slug];
    if (!w) return;
    var by = {};
    w.o.forEach(function (o) { by[o[0]] = o[1]; });
    Object.keys(C.mk.pm).forEach(function (i) { var n = C.mk.pm[i][0]; if (by[n] != null) C.mk.pm[i][1] = by[n]; });
    words();
  });

  // ---------------------------------------------------------------- the number, the bar, the sentence
  function words() {
    var g = sum(gov), o = sum(out), t = g + o;
    N.textContent = gov.length || out.length ? g : ALL;
    OF.innerHTML = gov.length || out.length
      ? 'of <b class="num">' + MAJ + '</b> needed' + (o ? '<span class="coal-plus num">+' + o + ' outside</span>' : '')
      : 'seats in the ' + esc(C.chamber || 'parliament');
    BAR.style.width = (g / ALL * 100) + '%';
    // the bar under the chamber in the same party colours as the seats and as the bar docked at the bottom of a phone
    var acc = 0, stops = [];
    gov.forEach(function (i, k) {
      var a = (acc / g * 100).toFixed(3), b = ((acc += P[i].seats) / g * 100).toFixed(3), cut = k < gov.length - 1 ? 'calc(' + b + '% - 2px)' : b + '%';
      stops.push(P[i].color + ' ' + a + '% ' + cut, 'var(--sunk) ' + cut + ' ' + b + '%');
    });
    BAR.style.backgroundImage = g ? 'linear-gradient(90deg,' + stops.join(',') + ')' : 'none';
    BARO.style.left = (g / ALL * 100) + '%';
    BARO.style.width = (o / ALL * 100) + '%';
    box.classList.toggle('is-maj', g >= MAJ);
    box.classList.toggle('is-min', g < MAJ && t >= MAJ);
    var big = gov.slice().sort(function (a, b) { return P[b].seats - P[a].seats; })[0];
    var biggest = big ? ' The biggest party in it is ' + esc(P[big].name) + ', led by ' + esc(P[big].leader) + '.' + pmOdds(big) : '';
    var s;
    if (!gov.length && !out.length) s = 'Tap a party to start a government. No party has ' + MAJ + ' on its own.';
    else if (g >= MAJ) s = '<b>A majority.</b> ' + g + ' seats, ' + (g - MAJ ? (g - MAJ) + ' more than it needs' : 'not one to spare') + '. ' + (ALL - g) + ' seats would sit in opposition.' + biggest;
    else if (t >= MAJ) s = '<b>A minority government that can survive.</b> ' + g + ' seats inside, and ' + o + ' from ' + esc(join(names(out))) + ' outside, make ' + t + ': enough to beat a vote of no confidence, as long as they keep voting with it.' + biggest;
    else s = '<b>' + (MAJ - t) + ' seat' + (MAJ - t === 1 ? '' : 's') + ' short.</b> ' + (o ? g + ' in government and ' + o + ' outside make ' + t + '.' : g + ' seats so far.') + ' Add a party, or see the ways to reach ' + MAJ + ' below.';
    if (gov.length && t >= MAJ) {
      var nm = name(gov, g >= MAJ ? [] : out), jd = judge(gov, g >= MAJ ? [] : out);
      s = '<span class="coal-now"><span class="coal-now-t">' + esc(nm.title) + (nm.qual ? ' <span class="coal-now-q">' + esc(nm.qual) + '</span>' : '') + '</span>'
        + '<span class="coal-like is-' + jd.tier + '">' + TIER[jd.tier] + '</span></span>' + s;
    }
    SAY.innerHTML = s;
    var hit = clashes(gov, out);
    WARN.innerHTML = hit.map(function (r) {
      var b = broken(r, gov);
      return '<li class="' + (b ? '' : 'is-soft') + '"><span aria-hidden="true">' + (b ? '⚠' : '◐') + '</span> <span><b>' + (b ? 'Breaks a red line' : 'A condition, kept here') + ':</b> '
        + esc(r.says) + ' <a href="' + esc(r.url) + '" target="_blank" rel="noopener">Source</a></span></li>';
    }).join('');
    box.classList.toggle('is-bad', hard(hit, gov).length > 0);
    RESET.hidden = !(gov.length || out.length);
    SHARE.hidden = !gov.length;
    if (PIC) PIC.hidden = !gov.length;      // "Make a picture" beside Share (the picture to post, below)
  }

  // ---------------------------------------------------------------- the buttons
  function rows() {
    [].forEach.call(box.querySelectorAll('.coal-row'), function (li) {
      var i = li.getAttribute('data-id'), ing = gov.indexOf(i) >= 0, ino = out.indexOf(i) >= 0;
      li.classList.toggle('is-in', ing);
      li.classList.toggle('is-out', ino);
      li.querySelector('.coal-pick').setAttribute('aria-pressed', ing ? 'true' : 'false');
      li.querySelector('.coal-out').setAttribute('aria-pressed', ino ? 'true' : 'false');
    });
    // what each of these changes, so build/phone-test.html can check it is on screen after a tap
    [].forEach.call(box.querySelectorAll('.coal-pick,.coal-out,.coal-pre'), function (b) { b.setAttribute('data-shows', '#coal-n,.coal-mini'); });
    [].forEach.call(box.querySelectorAll('.coal-pre'), function (b) {
      var pr = preset(b.getAttribute('data-pre'));
      var on = pr && same(pr.gov, gov) && same(pr.out || [], out);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function same(a, b) { return a.length === b.length && a.every(function (x) { return b.indexOf(x) >= 0; }); }
  function preset(id) { return (C.presets || []).filter(function (p) { return p.id === id; })[0]; }

  // ---------------------------------------------------------------- every government that can reach a majority
  // Majority teams: every smallest set of parties that, added to what the reader picked, makes the line. Minority
  // teams: the same, with the parties the reader marked Outside, plus any party on record as offering outside
  // support to the leader who would be prime minister, voting from outside. Each is named and judged, and the likeliest comes first.
  function minimal(list, tot) { return list.every(function (i) { return tot - P[i].seats < MAJ; }); }
  function subsets(arr, fn) { for (var m = 0; m < (1 << arr.length); m++) { var x = []; for (var k = 0; k < arr.length; k++) if (m & (1 << k)) x.push(arr[k]); fn(x); } }
  function ways() {
    var g = sum(gov), o = sum(out), found = [];
    if (g >= MAJ) {
      WAYSL.textContent = 'This government already has ' + MAJ + '. Take a party out to see who it can do without.';
      WAYS.innerHTML = '';
      return;
    }
    var rest = ids.filter(function (i) { return gov.indexOf(i) < 0; });
    subsets(rest, function (add) {
      var s = g + sum(add);
      if (add.length && s >= MAJ && minimal(add, s)) found.push({ add: add, outs: [], total: s });
    });
    if (g + o < MAJ) {
      var offers = {};
      (C.redLines || []).forEach(function (r) { if (r.kind === 'outside-support' && gov.indexOf(r.party) < 0 && out.indexOf(r.party) < 0) offers[r.party] = (offers[r.party] || []).concat(r.targets); });
      subsets(Object.keys(offers), function (extra) {
        if (!extra.length && !out.length) return;
        var O = out.concat(extra), left = rest.filter(function (i) { return O.indexOf(i) < 0; });
        subsets(left, function (add) {
          var G = gov.concat(add), sg = sum(G), tot = sg + sum(O);
          if (!G.length || sg >= MAJ || tot < MAJ || !minimal(add.concat(extra), tot)) return;
          if (!extra.every(function (x) { return offers[x].indexOf(lead(G)) >= 0; })) return;      // they offered to back that prime minister, nobody else
          found.push({ add: add, outs: extra, total: tot, inside: sg });
        });
      });
    }
    found.forEach(function (f) {
      var G = gov.concat(f.add), O = f.inside != null ? out.concat(f.outs) : [];
      f.O = O; f.name = name(G, O); f.j = judge(G, O);
    });
    found.sort(function (a, b) { return (b.j.score - a.j.score) || (a.total - b.total); });
    var clean = found.filter(function (f) { return !f.j.broke; }).length, top = found[0];
    var intro = !gov.length ? '' : (g + o >= MAJ ? 'To govern without outside votes, add one of these to ' : 'Add one of these to ') + esc(join(names(gov))) + '.';
    WAYSL.innerHTML = (intro ? intro + ' ' : '') + '<span class="num">' + found.length + '</span> ways' + (showAll ? '' : ', shown here as the likeliest of each kind') + ', ranked by what the leaders have said on the record. '
      + (!found.length ? '' : clean === found.length ? 'None breaks a red line a leader has stated.'
        : !clean ? '<b>Every one breaks a red line a leader has stated</b>, so the top one needs the fewest leaders to go back on their word.'
        : '<b><span class="num">' + clean + '</span> break no stated red line.</b>');
    // first view: the likeliest of each kind (Unity, Minority, Change, ...), so the kinds can be compared; all on request
    var kin = {}, shown = [];
    found.forEach(function (f) { var t = f.name.title; kin[t] = (kin[t] || 0) + 1; if (kin[t] === 1) shown.push(f); });
    if (showAll) shown = found;
    WAYS.innerHTML = shown.map(function (f, k) {
      var have = gov.concat(f.add).map(function (i) { return chip(i, gov.indexOf(i) >= 0, false); }).join('')
        + f.O.map(function (i) { return chip(i, out.indexOf(i) >= 0, true); }).join('');
      return '<li><button type="button" class="coal-way is-' + f.j.tier + (k === 0 ? ' is-best' : '') + '" data-add="' + f.add.join(',') + '" data-out="' + f.outs.join(',') + '" data-shows="#coal-n,.coal-mini">'
        + '<span class="coal-way-top">' + (k === 0 ? '<span class="coal-best">Likeliest here</span>' : '') + '<span class="coal-like is-' + f.j.tier + '">' + TIER[f.j.tier] + '</span></span>'
        + '<span class="coal-way-name"><b>' + esc(f.name.title) + '</b>' + (f.name.qual ? ' <span>' + esc(f.name.qual) + '</span>' : '') + '</span>'
        + '<span class="coal-way-pm">' + esc(f.name.pm) + ' as prime minister' + (!showAll && kin[f.name.title] > 1 ? ' · the likeliest of ' + kin[f.name.title] + ' like it' : '') + '</span>'
        + '<span class="coal-way-body"><span class="coal-chips">' + have + '</span><span class="coal-way-n num">' + f.total + '</span></span>'
        + '<span class="coal-way-why">' + esc(f.j.why.slice(0, 3).join(' · ')) + '</span></button></li>';
    }).join('') + (found.length > shown.length || showAll ? '<li class="coal-more-li"><button type="button" class="btn btn-line coal-more">' + (showAll ? 'Show one of each kind' : 'Show all ' + found.length + ' ways') + '</button></li>' : '');
  }
  function chip(i, have, outside) {
    return '<span class="coal-chip' + (have ? ' is-have' : '') + (outside ? ' is-outside' : '') + '" style="--pc:' + P[i].color + '">' + esc(P[i].name) + ' <span class="num">' + P[i].seats + '</span>' + (outside ? '<span class="coal-chip-o">outside</span>' : '') + '</span>';
  }

  // ---------------------------------------------------------------- the address
  function save() {
    var q = new URLSearchParams(W.location.search);
    q.delete('gov'); q.delete('out');
    if (gov.length) q.set('gov', gov.join(','));
    if (out.length) q.set('out', out.join(','));
    var qs = q.toString().replace(/%2C/g, ',');
    try { W.history.replaceState(W.history.state, '', W.location.pathname + (qs ? '?' + qs : '') + W.location.hash); } catch (err) {}
    var canon = box.getAttribute('data-canon');
    SHARE.setAttribute('data-url', canon + (qs ? '?' + qs : '') + '#coalition');
    var g = sum(gov), o = sum(out);
    SHARE.setAttribute('data-text', 'My government for ' + C.country + ': ' + gov.map(function (i) { return P[i].name + ' ' + P[i].seats; }).join(' + ')
      + (o ? ', with ' + join(names(out)) + ' outside' : '') + ' = ' + (g + o) + ' of ' + ALL + '. Build yours:');
  }
  function load() {
    var q = new URLSearchParams(W.location.search);
    var ok = function (s) { return (s || '').split(',').filter(function (i, k, a) { return P[i] && a.indexOf(i) === k; }); };
    gov = ok(q.get('gov'));
    out = ok(q.get('out')).filter(function (i) { return gov.indexOf(i) < 0; });
  }

  // ---------------------------------------------------------------- how free the government would be
  // The Liberty Scores of the leaders inside it (C.lib, from the page's own grades), weighted by their seats, on
  // the site's one letter scale (C.scale). Parties outside are not ministers, so they do not count. A party whose
  // leader is not graded is named, never guessed. The same choice lights its leaders in Side by side (#side).
  var LIB = $('coal-lib'), LIB_ = C.lib || {}, SCALE = C.scale || [];
  function letter(sc) { for (var k = 0; k < SCALE.length; k++) if (sc >= SCALE[k][0]) return SCALE[k][1]; return 'F'; }
  function liberty() {
    if (!LIB) return;
    var w = 0, t = 0, miss = [];
    gov.forEach(function (i) { if (LIB_[i]) { w += P[i].seats; t += P[i].seats * LIB_[i][0]; } else miss.push(i); });
    if (!gov.length || !w) { LIB.hidden = true; LIB.innerHTML = ''; mark(); return; }
    var sc = t / w, g = letter(sc), all = sum(gov);
    LIB.innerHTML = '<span class="g g-r r-' + g.charAt(0).toLowerCase() + '" aria-hidden="true">' + esc(g) + '</span>'
      + '<span><b>Liberty Score of this government: ' + esc(g) + '</b>, <span class="num">' + Math.floor(sc) + '</span> out of 100. '
      + 'The grades of its leaders, each counted by its seats' + (miss.length ? ', from ' + (all - sum(miss)) + ' of its ' + all + ' seats. Not graded: ' + esc(join(miss.map(function (i) { return P[i].name + ' (' + P[i].leader + ')'; }))) : '')
      + '. <a href="#side">See them side by side</a></span>';
    LIB.hidden = false;
    mark();
  }
  function mark() {
    var mx = D.querySelector('.wmx');
    if (!mx) return;
    var who = {};
    gov.forEach(function (i) { if (P[i].person) who[P[i].person] = 1; });
    var on = Object.keys(who).length > 0;
    mx.classList.toggle('has-gov', on);
    [].forEach.call(mx.querySelectorAll('.wmx-c[data-person]'), function (a) { a.classList.toggle('is-gov', !!who[a.getAttribute('data-person')]); });
    var note = D.getElementById('wmx-gov');
    if (note) {
      note.hidden = !on;
      if (on) note.innerHTML = 'Lit up: the leaders of the government you built above (' + esc(join(gov.filter(function (i) { return P[i].person; }).map(function (i) { return P[i].name; }))) + '). <a href="#coalition">Change it</a>';
    }
  }

  // ---------------------------------------------------------------- the change follows the thumb on a phone
  // Armin, note qkdl1tzs, 30 October 2026 (Guy said the same that morning): "on mobile clicking the parties and
  // seeing the change requires scrolling". Under 960px the chamber sits above the list, so a tap lower down
  // changes a picture nobody can see. While the count under the chamber is off screen and the calculator is on
  // it, a bar pinned to the bottom of the screen DRAWS the same change: every party picked as its own block of
  // seats in its colour, against the majority line, the total, and the verdict (the government's name and how
  // likely it is, or how many seats short). It flashes on every tap so the eye goes to it; tapping it goes back
  // to the chamber. Every control that changes the count carries data-shows, and build/phone-test.html taps
  // each one at 360px and fails if what it changed is not on the screen.
  // Armin, note vvyso03a, 30 October 2026: "I really like ... the bar that shows the number of seats that are adding
  // up ... However, it's kind of not noticeable unless you pay attention." It floated in the middle of the screen in
  // the grey of the cards under it, with the next-show bubble sitting below it. Now it is docked to the bottom edge,
  // the way an app's own bar is: lit by the site's yellow along its top, the number large, the verdict in two plain
  // lines (what the government is, and how likely or what is in it), and the gap still missing to the majority drawn
  // in the bar. While it shows, the next-show bubble steps aside (html.coal-docked in coalition.css) and comes back
  // the moment the bar goes; the site's other floating buttons ride above it.
  var MINI = D.createElement('button'), STAGE = box.querySelector('.coal-stage'), COUNT = box.querySelector('.coal-bar') || STAGE, HTML = D.documentElement;
  MINI.type = 'button'; MINI.className = 'coal-mini'; MINI.hidden = true;
  MINI.setAttribute('aria-label', 'Back to the chamber');
  box.appendChild(MINI);
  var miniWas = null;
  // a small drawing of the chamber, so the way back up says where it goes without words
  var HEMI = '<svg viewBox="0 0 24 14" width="24" height="14" aria-hidden="true"><path d="M2 13a10 10 0 0 1 20 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="0.1 4.2"/><path d="M7 13a5 5 0 0 1 10 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="0.1 4"/></svg>';
  function miniPaint() {
    var n = sum(gov), o = sum(out), t = n + o, head, sub, state;
    if (!gov.length && !out.length) { head = 'Tap a party to add its seats'; sub = MAJ + ' seats make a government'; state = 'empty'; }
    else if (gov.length && t >= MAJ) {
      var O = n >= MAJ ? [] : out, nm = name(gov, O), jd = judge(gov, O);
      head = esc(nm.title);
      sub = '<i class="coal-like is-' + jd.tier + '">' + TIER[jd.tier] + '</i>' + (nm.qual ? ' ' + esc(nm.qual) : '');
      state = n >= MAJ ? 'maj' : 'min';
    } else {
      head = (MAJ - t) + ' seat' + (MAJ - t === 1 ? '' : 's') + ' short';
      sub = esc(gov.map(function (i) { return P[i].name; }).concat(out.map(function (i) { return P[i].name + ' outside'; })).join(' + '));
      state = 'short';
    }
    var pc = function (k) { return (k / ALL * 100).toFixed(3) + '%'; };
    var segs = gov.map(function (i) { return '<i style="width:' + pc(P[i].seats) + ';--pc:' + P[i].color + '"></i>'; }).join('')
      + out.map(function (i) { return '<i class="is-o" style="width:' + pc(P[i].seats) + ';--pc:' + P[i].color + '"></i>'; }).join('');
    MINI.className = 'coal-mini is-' + state;
    MINI.innerHTML = '<span class="coal-mini-top"><span class="coal-mini-n"><b class="num" data-n="' + n + '">' + n + (o ? '<small>+' + o + '</small>' : '') + '</b>'
      + '<span class="coal-mini-of">of <span class="num">' + MAJ + '</span></span></span>'
      + '<span class="coal-mini-say"><span class="coal-mini-h">' + head + '</span><span class="coal-mini-s">' + sub + '</span></span>'
      + '<span class="coal-mini-up" aria-hidden="true">' + HEMI + '<span>Chamber</span></span></span>'
      + '<span class="coal-mini-bar" aria-hidden="true"><span class="coal-mini-segs">' + segs + '</span>'
      + (t < MAJ ? '<span class="coal-mini-gap" style="left:' + pc(t) + ';width:' + pc(MAJ - t) + '"></span>' : '')
      + '<span class="coal-mini-line" style="left:' + pc(MAJ) + '"></span></span>';
    var key = gov.join(',') + '|' + out.join(',');
    if (miniWas !== null && key !== miniWas && !reduce) { void MINI.offsetWidth; MINI.classList.add('is-flash'); }
    miniWas = key;
    miniShow();
  }
  // shown while the count is off screen (scrolled under the header, or below the bottom) and the calculator still
  // fills the bottom of the screen, so it never sits over the section after it
  function miniShow() {
    var on = false;
    if (W.innerWidth < 960) {
      var h = W.innerHeight, b = box.getBoundingClientRect(), c = COUNT.getBoundingClientRect(), head = 0;
      // the header and the Record / Discussion switch stay on top of the page; what is under them is off screen too
      [].forEach.call(D.querySelectorAll('.top,.modes'), function (el) { if (/sticky|fixed/.test(W.getComputedStyle(el).position)) head = Math.max(head, el.getBoundingClientRect().bottom); });
      on = (c.bottom < head + 4 || c.top > h - 110) && b.top < h - 120 && b.bottom > h - 40;
    }
    MINI.hidden = !on;
    HTML.classList.toggle('coal-docked', on);
    if (on) HTML.style.setProperty('--coal-dock', MINI.offsetHeight + 'px');
  }
  var miniQ = false;
  function miniLater() { if (miniQ) return; miniQ = true; (W.requestAnimationFrame || setTimeout)(function () { miniQ = false; miniShow(); }); }
  W.addEventListener('scroll', miniLater, { passive: true });
  W.addEventListener('resize', miniLater);
  MINI.addEventListener('click', function () { if (STAGE) STAGE.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });
  MINI.addEventListener('animationend', function (ev) { if (ev.target === MINI) MINI.classList.remove('is-flash'); });

  function draw() { paint(); words(); liberty(); rows(); ways(); save(); miniPaint(); }

  box.addEventListener('click', function (ev) {
    var b = ev.target.closest('button');
    if (!b || !box.contains(b)) return;
    var i = b.getAttribute('data-id');
    if (b.classList.contains('coal-pick')) {
      if (gov.indexOf(i) >= 0) gov.splice(gov.indexOf(i), 1);
      else { gov.push(i); out = out.filter(function (x) { return x !== i; }); }
    } else if (b.classList.contains('coal-out')) {
      if (out.indexOf(i) >= 0) out.splice(out.indexOf(i), 1);
      else { out.push(i); gov = gov.filter(function (x) { return x !== i; }); }
    } else if (b.classList.contains('coal-pre')) {
      var pr = preset(b.getAttribute('data-pre'));
      if (!pr) return;
      gov = pr.gov.slice(); out = (pr.out || []).slice();
    } else if (b.classList.contains('coal-way')) {
      b.getAttribute('data-add').split(',').forEach(function (x) { if (P[x] && gov.indexOf(x) < 0) { gov.push(x); out = out.filter(function (y) { return y !== x; }); } });
      (b.getAttribute('data-out') || '').split(',').forEach(function (x) { if (P[x] && gov.indexOf(x) < 0 && out.indexOf(x) < 0) out.push(x); });
      var st = box.querySelector('.coal-stage');
      if (st && st.getBoundingClientRect().top < 0) st.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    } else if (b.classList.contains('coal-more')) {
      showAll = !showAll; ways(); return;
    } else if (b.id === 'coal-reset') {
      gov = []; out = [];
    } else return;
    draw();
  });

  // the seat total on each preset button
  [].forEach.call(box.querySelectorAll('[data-pre-n]'), function (s) {
    var pr = preset(s.getAttribute('data-pre-n'));
    if (pr) s.textContent = sum(pr.gov) + (pr.out && pr.out.length ? ' + ' + sum(pr.out) : '');
  });
  // ---------------------------------------------------------------- the picture to post (build/shareimg.js)
  // Armin, 30 October 2026: "when people play around with these tools, they should be able to produce an image that they
  // could post on social media. It has our website and our branding on it". The chamber exactly as the reader picked it
  // (the circles of the chamber on the page, in their colours), the count against the majority, the bar to the line,
  // what the government is and how likely, and the parties in it with their leaders' faces. The frame (the brand, the
  // title, the address at the foot) is shareimg.js's; url() and text() are the Share button's.
  var PIC = null;
  function picVerdict() {
    var g = sum(gov), o = sum(out), t = g + o;
    if (!gov.length) return { title: (MAJ - t) + ' seats short', line: 'No party has ' + MAJ + ' on its own.' };
    if (t >= MAJ) {
      var O = g >= MAJ ? [] : out, nm = name(gov, O), jd = judge(gov, O);
      return { title: nm.title, tier: jd.tier, why: jd.why[0],
        line: g >= MAJ ? 'A majority: ' + g + ' seats, ' + (g - MAJ ? (g - MAJ) + ' more than it needs.' : 'not one to spare.') : 'A minority government: ' + g + ' inside and ' + o + ' outside make ' + t + '.' };
    }
    return { title: (MAJ - t) + ' seat' + (MAJ - t === 1 ? '' : 's') + ' short', line: g + ' seats' + (o ? ' and ' + o + ' outside' : '') + '. A government needs ' + MAJ + '.' };
  }
  function picDraw(ctx, bx, kit) {
    var c = kit.c, list = gov.concat(out);
    var faceOf = function (i) { return box.querySelector('.coal-row[data-id="' + i + '"] .coal-face'); };
    return Promise.all(list.map(function (i) { var f = faceOf(i); return kit.img(f && f.tagName === 'IMG' ? f.getAttribute('src') : ''); })).then(function (ims) {
      var g = sum(gov), o = sum(out), empty = !list.length;
      // the parties, as chips that wrap: measured first, so the chamber takes what is left
      var chipH = 76, cg = 12, maxRows = bx.h >= 680 ? 3 : 2, chips = [], cx = 0, row = 0;
      list.forEach(function (i, k) {
        ctx.font = kit.font(26, 700, 'body');
        var nw = ctx.measureText(P[i].name).width;
        ctx.font = kit.font(32, 800, 'display');
        var sw = ctx.measureText(String(P[i].seats)).width, w = 10 + 56 + 14 + nw + 14 + sw + 22;
        w = Math.min(w, bx.w);
        if (cx && cx + w > bx.w) { row++; cx = 0; }
        chips.push({ i: i, im: ims[k], x: cx, row: row, w: w, out: out.indexOf(i) >= 0, nw: nw, sw: sw });
        cx += w + cg;
      });
      var shown = chips.filter(function (ch) { return ch.row < maxRows; }), rows = shown.length ? shown[shown.length - 1].row + 1 : 0;
      if (shown.length < chips.length) {      // the ones that do not fit are counted on one more chip, after the last that fits
        var last = shown[shown.length - 1], mw = 160;
        if (last.x + last.w + cg + mw <= bx.w) shown.push({ x: last.x + last.w + cg, row: last.row, w: mw, more: chips.length - shown.length });
        else { last.more = chips.length - shown.length + 1; last.w = mw; }
      }
      var chipsH = rows ? rows * chipH + (rows - 1) * cg : 0, barH = 30, fixed = 26 + 44 + barH + (rows ? 34 + chipsH : 0);
      var sc = Math.min(bx.w * 0.86 / 400, (bx.h - fixed) / 212), total = 212 * sc + fixed, y = bx.y + Math.max(0, (bx.h - total) / 2);
      // the chamber
      var hx = bx.x + (bx.w - 400 * sc) / 2, hy = y, svg = dots.length && dots[0].ownerSVGElement, mid = svg && svg.querySelector('.coal-mid');
      if (mid) {
        ctx.save(); ctx.strokeStyle = c.field; ctx.globalAlpha = empty ? 0.35 : 0.8; ctx.lineWidth = Math.max(2, 1.5 * sc); ctx.setLineDash([3 * sc, 4 * sc]);
        ctx.beginPath(); ctx.moveTo(hx + +mid.getAttribute('x1') * sc, hy + +mid.getAttribute('y1') * sc); ctx.lineTo(hx + +mid.getAttribute('x2') * sc, hy + +mid.getAttribute('y2') * sc); ctx.stroke(); ctx.restore();
      }
      dots.forEach(function (d) {
        var k = d.getAttribute('class') || '', col = d.getAttribute('fill') || c.dim, r = +d.getAttribute('r') * sc;
        ctx.beginPath(); ctx.arc(hx + +d.getAttribute('cx') * sc, hy + +d.getAttribute('cy') * sc, r, 0, Math.PI * 2);
        ctx.globalAlpha = /\bd-o\b/.test(k) ? 0.22 : /\bd-x\b/.test(k) ? 0.13 : 1; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
        if (/\bd-o\b/.test(k)) { ctx.lineWidth = Math.max(1.5, 1.6 * sc); ctx.strokeStyle = col; ctx.stroke(); }
      });
      // the count in the middle of the chamber
      var ccx = bx.x + bx.w / 2, base = hy + 198 * sc;
      kit.text(ctx, String(empty ? ALL : g), ccx, base - 26 * sc, { px: Math.min(150, 62 * sc), weight: 900, fam: 'display', color: g >= MAJ ? c.field : c.ink, align: 'center' });
      kit.text(ctx, empty ? 'seats' : 'of ' + MAJ + ' needed', ccx, base, { px: Math.min(30, 13 * sc), weight: 600, fam: 'body', color: c.dim, align: 'center' });
      // the bar to the majority line
      var by = hy + 212 * sc + 26 + 44, pc = function (n) { return bx.w * n / ALL; }, ax = bx.x;
      kit.round(ctx, bx.x, by, bx.w, barH, barH / 2); ctx.fillStyle = c.sunk; ctx.fill();
      ctx.save(); kit.round(ctx, bx.x, by, bx.w, barH, barH / 2); ctx.clip();
      gov.forEach(function (i) { ctx.fillStyle = P[i].color; ctx.fillRect(ax, by, Math.max(0, pc(P[i].seats) - 3), barH); ax += pc(P[i].seats); });
      out.forEach(function (i) { ctx.globalAlpha = 0.4; ctx.fillStyle = P[i].color; ctx.fillRect(ax, by, Math.max(0, pc(P[i].seats) - 3), barH); ctx.globalAlpha = 1; ax += pc(P[i].seats); });
      ctx.restore();
      var lx = bx.x + pc(MAJ);
      ctx.fillStyle = c.field; ctx.fillRect(lx - 2, by - 10, 4, barH + 20);
      kit.text(ctx, MAJ + ' for a majority', lx, by - 18, { px: 26, weight: 700, fam: 'body', color: c.field, align: 'center' });
      // the parties in it, with their leaders' faces
      var cy0 = by + barH + 34;
      shown.forEach(function (ch) {
        var x0 = bx.x + ch.x, y0 = cy0 + ch.row * (chipH + cg), p = P[ch.i];
        kit.round(ctx, x0, y0, ch.w, chipH, chipH / 2); ctx.fillStyle = c.panel; ctx.fill();
        if (ch.out) { ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.strokeStyle = p.color; ctx.stroke(); ctx.setLineDash([]); }
        if (ch.more) {
          kit.text(ctx, '+' + ch.more + ' more', x0 + ch.w / 2, y0 + chipH / 2 + 1, { px: 28, weight: 700, fam: 'body', color: c.dim, align: 'center', base: 'middle' });
          return;
        }
        var f = faceOf(ch.i);
        kit.face(ctx, ch.im, x0 + 10 + 28, y0 + chipH / 2, 56, { ring: p.color, ringW: 4, initials: f && f.tagName !== 'IMG' ? f.textContent : kit.initials(p.leader) });
        var tx = x0 + 10 + 56 + 14;
        kit.text(ctx, p.name, tx, y0 + chipH / 2 + 1, { px: 26, weight: 700, fam: 'body', color: c.ink, base: 'middle', max: ch.w - 80 - ch.sw - 34 });
        kit.text(ctx, String(p.seats), x0 + ch.w - 20, y0 + chipH / 2 + 2, { px: 32, weight: 800, fam: 'display', color: ch.out ? c.dim : c.ink, align: 'end', base: 'middle' });
      });
    });
  }
  (function picture() {
    if (!SHARE || !SHARE.parentNode) return;
    PIC = D.createElement('button');
    PIC.type = 'button'; PIC.id = 'coal-pic'; PIC.className = 'btn btn-line shot-make'; PIC.hidden = true; PIC.setAttribute('data-shot', 'coalition');
    PIC.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg><span>Make a picture</span>';
    SHARE.parentNode.insertBefore(PIC, SHARE.nextSibling);
    (W.LPShotQ = W.LPShotQ || []).push({
      id: 'coalition', el: '#coalition',
      kicker: 'Build ' + C.country + '’s next government',
      cta: 'Can you get to ' + MAJ + '? Build yours at',
      title: function () { return 'My government for ' + C.country + ': ' + picVerdict().title; },
      sub: function () { var v = picVerdict(); return v.line + (v.tier ? ' ' + TIER[v.tier] + '. ' + v.why + '.' : ''); },
      text: function () { save(); return SHARE.getAttribute('data-text'); },
      url: function () { save(); return SHARE.getAttribute('data-url'); },
      draw: picDraw
    });
  })();

  box.classList.add('is-live');
  load();
  draw();
})();
