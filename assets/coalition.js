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

  // A stated red line this government breaks. wont-sit-with: the party and a target both in government (or the
  // target keeping it alive from outside, when the party refused that too). only-with: the party is in, and none
  // of the parties it said it governs with are. soft: a condition that is shown, never counted as broken.
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
  function hard(list) { return list.filter(function (r) { return !r.soft; }); }

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

  // ---------------------------------------------------------------- the number, the bar, the sentence
  function words() {
    var g = sum(gov), o = sum(out), t = g + o;
    N.textContent = gov.length || out.length ? g : ALL;
    OF.innerHTML = gov.length || out.length
      ? 'of <b class="num">' + MAJ + '</b> needed' + (o ? '<span class="coal-plus num">+' + o + ' outside</span>' : '')
      : 'seats in the ' + esc(C.chamber || 'parliament');
    BAR.style.width = (g / ALL * 100) + '%';
    BARO.style.left = (g / ALL * 100) + '%';
    BARO.style.width = (o / ALL * 100) + '%';
    box.classList.toggle('is-maj', g >= MAJ);
    box.classList.toggle('is-min', g < MAJ && t >= MAJ);
    var big = gov.slice().sort(function (a, b) { return P[b].seats - P[a].seats; })[0];
    var lead = big ? ' The biggest party in it is ' + esc(P[big].name) + ', led by ' + esc(P[big].leader) + '.' : '';
    var s;
    if (!gov.length && !out.length) s = 'Tap a party to start a government. No party has ' + MAJ + ' on its own.';
    else if (g >= MAJ) s = '<b>A majority.</b> ' + g + ' seats, ' + (g - MAJ ? (g - MAJ) + ' more than it needs' : 'not one to spare') + '. ' + (ALL - g) + ' seats would sit in opposition.' + lead;
    else if (t >= MAJ) s = '<b>A minority government that can survive.</b> ' + g + ' seats inside, and ' + o + ' from ' + esc(join(names(out))) + ' outside, make ' + t + ': enough to beat a vote of no confidence, as long as they keep voting with it.' + lead;
    else s = '<b>' + (MAJ - t) + ' seat' + (MAJ - t === 1 ? '' : 's') + ' short.</b> ' + (o ? g + ' in government and ' + o + ' outside make ' + t + '.' : g + ' seats so far.') + ' Add a party, or see the ways to reach ' + MAJ + ' below.';
    SAY.innerHTML = s;
    var hit = clashes(gov, out);
    WARN.innerHTML = hit.map(function (r) {
      return '<li class="' + (r.soft ? 'is-soft' : '') + '"><span aria-hidden="true">' + (r.soft ? '◐' : '⚠') + '</span> <span><b>' + (r.soft ? 'A condition' : 'Breaks a red line') + ':</b> '
        + esc(r.says) + ' <a href="' + esc(r.url) + '" target="_blank" rel="noopener">Source</a></span></li>';
    }).join('');
    box.classList.toggle('is-bad', hard(hit).length > 0);
    RESET.hidden = !(gov.length || out.length);
    SHARE.hidden = !gov.length;
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
    [].forEach.call(box.querySelectorAll('.coal-pre'), function (b) {
      var pr = preset(b.getAttribute('data-pre'));
      var on = pr && same(pr.gov, gov) && same(pr.out || [], out);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function same(a, b) { return a.length === b.length && a.every(function (x) { return b.indexOf(x) >= 0; }); }
  function preset(id) { return (C.presets || []).filter(function (p) { return p.id === id; })[0]; }

  // ---------------------------------------------------------------- every smallest team that makes a majority
  function ways() {
    var g = sum(gov), rest = ids.filter(function (i) { return gov.indexOf(i) < 0; }), found = [];
    if (g >= MAJ) {
      WAYSL.textContent = 'This government already has ' + MAJ + '. Try taking a party out to see who it can do without.';
      WAYS.innerHTML = '';
      return;
    }
    var n = rest.length;
    for (var m = 1; m < (1 << n); m++) {
      var add = [], s = g;
      for (var k = 0; k < n; k++) if (m & (1 << k)) { add.push(rest[k]); s += P[rest[k]].seats; }
      if (s < MAJ) continue;
      var minimal = add.every(function (i) { return s - P[i].seats < MAJ; });
      if (!minimal) continue;
      var all = gov.concat(add), camps = {};
      all.forEach(function (i) { camps[P[i].camp || i] = 1; });
      found.push({ add: add, total: s, bad: hard(clashes(all)).length > 0, camps: Object.keys(camps).length });
    }
    // a team that breaks no stated red line first; then the fewest blocs mixed (the blocs the parties ran in), the
    // fewest parties, and the slimmest majority
    found.sort(function (a, b) { return (a.bad - b.bad) || (a.camps - b.camps) || (a.add.length - b.add.length) || (a.total - b.total); });
    var good = found.filter(function (f) { return !f.bad; }).length;
    var lead = gov.length ? 'Add one of these to ' + esc(join(names(gov))) + ' to reach ' + MAJ + '.' : 'Every smallest team of parties that makes ' + MAJ + '. Tap one to try it.';
    WAYSL.innerHTML = lead + ' <span class="num">' + found.length + '</span> in all. '
      + (found.length === good ? 'None breaks a red line a leader has stated.'
        : !good ? '<b>Every one of them breaks a red line</b> a leader has stated.'
        : '<b>Only <span class="num">' + good + '</span> break no red line</b> a leader has stated, and they come first.');
    var shown = showAll ? found : found.slice(0, 6);
    WAYS.innerHTML = shown.map(function (f) {
      var chips = gov.concat(f.add).map(function (i) {
        return '<span class="coal-chip' + (gov.indexOf(i) >= 0 ? ' is-have' : '') + '" style="--pc:' + P[i].color + '">' + esc(P[i].name) + ' <span class="num">' + P[i].seats + '</span></span>';
      }).join('');
      return '<li><button type="button" class="coal-way' + (f.bad ? ' is-bad' : '') + '" data-add="' + f.add.join(',') + '"><span class="coal-chips">' + chips + '</span>'
        + '<span class="coal-way-n num">' + f.total + '</span>' + (f.bad ? '<span class="coal-way-bad">Breaks a red line</span>' : '') + '</button></li>';
    }).join('') + (found.length > 6 ? '<li><button type="button" class="btn btn-line coal-more">' + (showAll ? 'Show fewer' : 'Show all ' + found.length) + '</button></li>' : '');
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

  function draw() { paint(); words(); rows(); ways(); save(); }

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
  box.classList.add('is-live');
  load();
  draw();
})();
