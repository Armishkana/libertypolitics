/* Your Liberty Score (you/). A reader votes yes or no on twelve questions the House voted on, one for each
   measure, and gets a letter on the same scale as a member of Congress. Nothing here is sent anywhere:
   the answers live in this page and are gone when it is closed. The one thing fetched is data/you.json
   (every graded member's score on each measure), and only when the reader asks for their grade.
   The questions, the liberty side of each and the grade table are printed into the page by render.py
   (you()), so this file holds no editorial decision of its own. Tested in build/phone-test.html. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var cfgEl = $('yq-cfg'), list = $('yq');
  if (!cfgEl || !list) return;
  var C = JSON.parse(cfgEl.textContent);
  var root = document.documentElement.getAttribute('data-root') || '../';
  var items = Array.prototype.slice.call(list.querySelectorAll('.yq-i'));
  var ans = [], shown = false, data = null, asked = false;
  var go = $('yq-go'), left = $('yq-left'), res = $('yq-res'), sel = $('yq-state');
  var PARTY = { R: 'R', D: 'D', I: 'I' };

  function an(g) { return /^[AF]/.test(g) ? 'an' : 'a'; }
  function gradeFor(score) {
    for (var i = 0; i < C.grades.length; i++) if (score >= C.grades[i][0]) return C.grades[i][1];
    return 'F';
  }
  /* The same sum as a candidate graded on words (rec_score in render.py): each measure answered is 100 or 0,
     the score is the plain average to one decimal, and a letter needs the same number of measures. */
  function tally() {
    var n = 0, ok = 0, done = 0;
    items.forEach(function (li, i) {
      if (ans[i]) done++;
      if (ans[i] === 'yea' || ans[i] === 'nay') { n++; if (ans[i] === li.getAttribute('data-side')) ok++; }
    });
    var score = n ? Math.round(1000 * ok / n) / 10 : null;
    return { n: n, ok: ok, done: done, score: score, grade: n >= C.min ? gradeFor(score) : null };
  }

  function progress(t) {
    go.disabled = !t.grade;
    if (!t.grade) left.textContent = 'Answer at least ' + C.min + ' to get a letter. ' + (C.min - t.n) + ' to go.';
    else if (t.done < items.length) left.textContent = t.done + ' of ' + items.length + ' answered. See your grade now, or keep going.';
    else left.textContent = 'All ' + items.length + ' answered.';
  }

  function el(tag, cls, text) {
    var x = document.createElement(tag);
    if (cls) x.className = cls;
    if (text != null) x.textContent = text;
    return x;
  }

  /* One member, drawn like every other member row on the site, with how closely they match the reader. */
  function row(m) {
    var li = el('li'), a = el('a', 'person');
    a.href = root + 'scorecard/' + m.slug + '/';
    var f;
    if (m.img) {
      f = el('img', 'face ' + m.party);
      f.src = root + m.img; f.alt = ''; f.width = 52; f.height = 52; f.loading = 'lazy'; f.decoding = 'async';
    } else {
      var w = m.name.split(' ');
      f = el('span', 'face ' + m.party, (w[0].charAt(0) + w[w.length - 1].charAt(0)).toUpperCase());
      f.setAttribute('aria-hidden', 'true');
    }
    var who = el('span', 'who');
    who.appendChild(el('strong', null, m.name));
    who.appendChild(el('span', null, PARTY[m.party] + ' · ' + m.stateName + ' · ' + (m.chamber === 'S' ? 'Senate' : 'House')));
    who.appendChild(el('span', 'yq-m', m.match == null ? 'Too few votes in common to compare' : m.match + '% match on ' + m.common + ' measure' + (m.common === 1 ? '' : 's')));
    a.appendChild(f); a.appendChild(who);
    a.appendChild(el('span', 'g g-' + m.grade.charAt(0).toLowerCase(), m.grade));
    a.setAttribute('aria-label', m.name + ', Liberty Score ' + m.grade + (m.match == null ? '' : ', ' + m.match + ' percent match with you'));
    li.appendChild(a);
    return li;
  }

  function fill(ul, rows) {
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    rows.forEach(function (m) { ul.appendChild(row(m)); });
  }

  /* How close a member is to the reader: on every measure both have an answer for, the distance between
     the member's score (0 to 100, from every vote we count) and the reader's yes or no (100 or 0). */
  function compare(t) {
    var mine = items.map(function (li, i) {
      return ans[i] === 'yea' || ans[i] === 'nay' ? (ans[i] === li.getAttribute('data-side') ? 100 : 0) : null;
    });
    var need = Math.min(C.min, t.n);
    return data.members.map(function (r) {
      var sum = 0, k = 0;
      for (var i = 0; i < mine.length; i++) if (mine[i] != null && r[9][i] != null) { sum += Math.abs(mine[i] - r[9][i]); k++; }
      return { slug: r[0], name: r[1], party: r[2], state: r[3], stateName: r[4], chamber: r[5], grade: r[6], score: r[7], img: r[8],
               common: k, match: k >= need && k > 0 ? Math.round(100 - sum / k) : null };
    });
  }

  function people(t) {
    var all = compare(t), ok = all.filter(function (m) { return m.match != null; });
    var by = function (dir) {
      return function (a, b) { return dir * (b.match - a.match) || b.common - a.common || (a.name < b.name ? -1 : 1); };
    };
    fill($('yq-near'), ok.slice().sort(by(1)).slice(0, 4));
    fill($('yq-far'), ok.slice().sort(by(-1)).slice(0, 4));
    var lower = all.filter(function (m) { return m.score < t.score; }).length;
    $('yq-rank').textContent = lower === 0 ? 'No member of Congress I grade scores lower than that.'
      : lower === all.length ? 'That\'s higher than every one of the ' + all.length + ' members of Congress I grade.'
      : 'That\'s higher than ' + lower + ' of the ' + all.length + ' members of Congress I grade.';
    $('yq-like-p').textContent = 'Compared on the ' + t.n + ' measure' + (t.n === 1 ? '' : 's') + ' you answered, using every vote I count for each member.';
    $('yq-like').hidden = false;
    mineIn(all);
  }

  function mineIn(all) {
    var st = (sel.value || '').toUpperCase(), rows = st ? all.filter(function (m) { return m.state === st; }) : [];
    rows.sort(function (a, b) { return (a.chamber === b.chamber ? 0 : a.chamber === 'S' ? -1 : 1) || (a.name < b.name ? -1 : 1); });
    fill($('yq-mine'), rows);
  }

  function result() {
    var t = tally();
    progress(t);
    if (!shown || !t.grade) { if (shown && !t.grade) { res.hidden = true; shown = false; unshare(); } return; }
    var g = t.grade, gEl = $('yq-g');
    gEl.textContent = g;
    gEl.className = 'g g-r r-' + g.charAt(0).toLowerCase();
    gEl.setAttribute('aria-label', g + ', from your answers');
    $('yq-h').textContent = 'Your Liberty Score: ' + g;
    $('yq-p').textContent = t.score + ' out of 100. ' + t.ok + ' of your ' + t.n + ' answer' + (t.n === 1 ? ' was' : 's were') + ' on the liberty side.';
    items.forEach(function (li, i) {
      var a = ans[i], side = li.getAttribute('data-side'), you = li.querySelector('.yq-you');
      li.classList.remove('with', 'against');
      if (a === 'yea' || a === 'nay') {
        li.classList.add(a === side ? 'with' : 'against');
        you.textContent = 'You voted ' + (a === 'yea' ? 'Yes' : 'No') + '. ' + (a === side ? 'With the liberty side.' : 'Against the liberty side.');
      } else you.textContent = a === 'skip' ? 'You skipped this one.' : 'You haven\'t answered this one.';
      li.querySelector('.yq-a').hidden = false;
    });
    res.hidden = false;
    document.documentElement.classList.add('yq-done');
    /* The Share button under the header now sends the result, with its own picture. */
    var sh = $('share');
    if (sh) {
      if (!sh.hasAttribute('data-url0')) { sh.setAttribute('data-url0', sh.getAttribute('data-url')); sh.setAttribute('data-title0', sh.getAttribute('data-title')); }
      sh.setAttribute('data-url', C.origin + '/you/got/' + C.slug[g] + '/');
      sh.setAttribute('data-title', 'I got ' + an(g) + ' ' + g + ' on Liberty Score. What would you get?');
      var lab = sh.querySelector('span');
      if (lab) lab.textContent = 'Share your ' + g;
      sh.classList.add('yq-share');
      $('yq-sh').textContent = 'To send your ' + g + ' to someone, use the yellow Share button at the top. They get the same ' + items.length + ' questions.';
      sh.setAttribute('aria-label', 'Share your grade');
    }
    if (data) people(t);
    else if (!asked) {
      asked = true;
      fetch(root + 'data/you.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) { data = d; var t2 = tally(); if (shown && t2.grade) people(t2); })
        .catch(function () { asked = false; });      // the grade stands without the comparison; the next change asks again
    }
  }

  function unshare() {
    var sh = $('share');
    if (!sh || !sh.hasAttribute('data-url0')) return;
    sh.setAttribute('data-url', sh.getAttribute('data-url0'));
    sh.setAttribute('data-title', sh.getAttribute('data-title0'));
    var lab = sh.querySelector('span');
    if (lab) lab.textContent = 'Share';
    sh.classList.remove('yq-share');
    sh.setAttribute('aria-label', 'Share this page');
  }

  items.forEach(function (li, i) {
    Array.prototype.forEach.call(li.querySelectorAll('.yq-v'), function (b) {
      b.addEventListener('click', function () {
        ans[i] = b.getAttribute('data-v');
        Array.prototype.forEach.call(li.querySelectorAll('.yq-v'), function (o) {
          var on = o === b;
          o.classList.toggle('on', on);
          o.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        li.classList.add('done');
        result();
        if (shown) return;
        /* Bring the next question the reader has not answered into view; after the last one, the button. */
        var next = null;
        for (var k = 1; k <= items.length && !next; k++) { var j = (i + k) % items.length; if (!ans[j] && j > i) next = items[j]; }
        var to = next || $('yq-end');
        try { to.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); } catch (x) { to.scrollIntoView(); }
      });
    });
  });

  go.addEventListener('click', function () {
    if (!tally().grade) return;
    shown = true;
    result();
    try { res.scrollIntoView({ behavior: 'auto', block: 'start' }); } catch (x) { res.scrollIntoView(); }
  });

  if (sel) sel.addEventListener('change', function () { if (data && shown) { var t = tally(); if (t.grade) mineIn(compare(t)); } });

  /* Someone followed a shared result: say what the sender got. Only a grade from our own table is echoed. */
  try {
    var got = new URLSearchParams(location.search).get('got');
    if (got) {
      for (var g0 in C.slug) if (C.slug[g0] === got) {
        var line = $('yq-got');
        line.textContent = 'Someone sent you their grade: ' + an(g0) + ' ' + g0 + '. Your turn.';
        line.hidden = false;
      }
    }
  } catch (x) { }

  progress(tally());
  window.LPYou = { tally: tally };      // read by the phone test
})();
