/* Liberty Score. Every page works with this file missing: lists are printed in full by the build,
   and this only narrows them. Nothing is hidden first and revealed later. */
(function () {
  'use strict';
  var root = document.documentElement.getAttribute('data-root') || './';
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---- the invitation to the daily call: a reader can put it away for this visit ---- */
  var calls = document.getElementById('calls'), callsX = document.getElementById('calls-x');
  if (calls && callsX) {
    try { if (sessionStorage.getItem('lp-calls') === 'off') calls.className += ' off'; } catch (x) {}
    callsX.addEventListener('click', function () { calls.className += ' off'; try { sessionStorage.setItem('lp-calls', 'off'); } catch (x) {} });
  }

  /* ---- matching, shared by the home search and the scorecard search ----
     Each word typed must be the two-letter code of the member's state, or the START of a word in the
     member's name or state. Whole-string matching failed on "susan collins" (her listed name carries a
     middle initial), and substring matching made "ny" find Cornyn and "house" find Whitehouse. */
  function words(s) { return norm(s).split(/[^a-z0-9]+/).filter(Boolean); }
  function matches(q, toks, code) {
    return q.every(function (w) { return w === code || toks.some(function (t) { return t.indexOf(w) === 0; }); });
  }

  /* ---- home: find a member by name or state ---- */
  var find = document.getElementById('find');
  if (find) {
    var hits = document.getElementById('hits'), idx = null, loading = false, sp = document.getElementById('statepick');
    function load(cb) {
      if (idx) return cb();
      if (loading) return; loading = true;
      fetch(root + 'data/index.json').then(function (r) { return r.json(); }).then(function (d) {
        d.forEach(function (m) { m.t = words(m.n + ' ' + (m.f || '') + ' ' + m.s); m.code = m.a.toLowerCase(); });
        idx = d; cb();
      }).catch(function () { loading = false; });
    }
    function stateFor(q) {
      if (!sp || !q) return '';
      var opts = sp.options, i;
      for (i = 0; i < opts.length; i++) if (opts[i].value && (opts[i].value === q || norm(opts[i].text) === q)) return opts[i].value;
      return '';
    }
    function show() {
      var raw = norm(find.value.trim()), q = words(raw);
      hits.textContent = '';
      if (raw.length < 2 || !idx) return;
      var all = idx.filter(function (m) { return matches(q, m.t, m.code); }), st = stateFor(raw);
      if (st) all.sort(function (a, b) { return (b.code === st) - (a.code === st); });
      var out = all.slice(0, 12);
      if (!all.length) { hits.appendChild(el('li', 'none', 'No member of Congress or candidate matches that. Try a last name or a state.')); return; }
      if (st) {
        var sl = el('li'), sa = el('a', 'allhits', 'See who is on the ballot in ' + sp.querySelector('option[value="' + st + '"]').text);
        sa.href = root + 'states/' + st + '/#ballot'; sl.appendChild(sa); hits.appendChild(sl);
      }
      out.forEach(function (m) {
        var li = el('li'), a = el('a');
        a.href = root + (m.h || 'scorecard/' + m.u + '/');
        var g = el('span', 'g g-sm g-' + (m.g ? m.g[0].toLowerCase() : 'n'), m.g || (m.h ? '–' : '?'));
        var who = el('span', 'who');
        who.appendChild(el('strong', null, m.n)); who.appendChild(el('span', 'dim', ' ' + m.p + ' · ' + m.s + ' · ' + m.c));
        if (m.i) { var im = el('img', 'face ' + m.p); im.src = root + m.i; im.alt = ''; im.width = 40; im.height = 40; a.appendChild(im); }
        a.appendChild(who); a.appendChild(g); li.appendChild(a); hits.appendChild(li);
      });
      if (all.length > out.length) {
        var ml = el('li'), ma = el('a', 'allhits', 'See all ' + all.length + ' on the scorecard');
        ma.href = root + 'scorecard/?q=' + encodeURIComponent(find.value.trim()); ml.appendChild(ma); hits.appendChild(ml);
      }
    }
    function shut() { hits.textContent = ''; }
    find.addEventListener('focus', function () { load(show); });
    find.addEventListener('input', function () { load(show); });
    find.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
    document.addEventListener('click', function (e) { if (!find.form.contains(e.target)) shut(); });
    find.form.addEventListener('focusout', function () { setTimeout(function () { if (!find.form.contains(document.activeElement)) shut(); }, 150); });
    find.form.addEventListener('submit', function (e) {
      var st = stateFor(norm(find.value.trim())), first = hits.querySelector('a');
      if (st) { e.preventDefault(); location.href = root + 'states/' + st + '/'; }
      else if (first) { e.preventDefault(); location.href = first.href; }
    });
    if (sp) sp.addEventListener('change', function () { if (sp.value) location.href = root + 'states/' + sp.value + '/'; });
  }

  /* ---- scorecard list: search, filters, sort ---- */
  var list = document.getElementById('all');
  if (list) {
    var q = document.getElementById('q'), fc = document.getElementById('f-chamber'), fp = document.getElementById('f-party'),
      fs = document.getElementById('f-state'), so = document.getElementById('f-sort'), fb0 = document.getElementById('f-ballot'), fg = document.getElementById('f-grade'),
      count = document.getElementById('count'), items = Array.prototype.slice.call(list.children),
      clist = document.getElementById('cands'), ccount = document.getElementById('ccount'), hint = document.getElementById('racehint'),
      citems = clist ? Array.prototype.slice.call(clist.children) : [], hint0 = hint ? hint.innerHTML : '';
    items.forEach(function (li, i) { li._i = i; li._t = li.dataset.k.split(' '); });
    citems.forEach(function (li) { li._t = li.dataset.k.split(' '); });
    /* The state a reader is looking at: the State filter, or a search that is a state's name or code. */
    function stateNow() {
      if (fs.value) return fs.value;
      var raw = norm(q.value.trim()), o = fs.options, i;
      for (i = 0; i < o.length; i++) if (o[i].value && raw && (o[i].value === raw || norm(o[i].text) === raw)) return o[i].value;
      return '';
    }
    function pass(li, qq) {
      var d = li.dataset;
      return (!qq.length || matches(qq, li._t, d.s)) && (!fc.value || d.c === fc.value) && (!fp.value || d.p === fp.value) &&
        (!fs.value || d.s === fs.value) && (!fg.value || d.g === fg.value) && (!fb0.value || d.b === fb0.value);
    }
    var params = new URLSearchParams(location.search);
    if (params.get('q')) q.value = params.get('q');
    function apply() {
      var qq = words(q.value), n = 0;
      items.forEach(function (li) { var ok = pass(li, qq); li.hidden = !ok; if (ok) n++; });
      var cn = 0;
      citems.forEach(function (li) { var ok = pass(li, qq); li.hidden = !ok; if (ok) cn++; });
      count.textContent = n === items.length ? 'Showing all ' + n + ' members.' :
        n ? 'Showing ' + n + ' of ' + items.length + ' members.' : 'No member matches. Clear the search, or set the filters back to all.';
      if (cn && n !== items.length) {
        count.appendChild(document.createTextNode(' And '));
        var jump = el('a', null, cn + (cn === 1 ? ' candidate who is' : ' candidates who are') + ' not in Congress');
        jump.href = '#cands-h'; count.appendChild(jump); count.appendChild(document.createTextNode(', further down.'));
      }
      if (ccount) ccount.textContent = cn === citems.length ? 'Showing all ' + cn + ' candidates.' :
        cn ? 'Showing ' + cn + ' of ' + citems.length + ' candidates.' : 'No candidate matches.';
      if (hint) {
        var st = stateNow();
        if (st) {
          var name = fs.querySelector('option[value="' + st + '"]').text;
          hint.textContent = 'Voting in ' + name + '? ';
          var go = el('a', null, 'See every race in ' + name + ' on November 3, with the candidates side by side');
          go.href = root + 'states/' + st + '/#ballot'; hint.appendChild(go);
        } else hint.innerHTML = hint0;
      }
    }
    function sort() {
      var v = so.value;
      items.sort(function (a, b) {
        var x = a.dataset, y = b.dataset;
        if (v === 'best') return a._i - b._i;
        if (v === 'worst') return (x.v === '-1') - (y.v === '-1') || (+x.v) - (+y.v) || b._i - a._i;
        if (v === 'state') return x.t.localeCompare(y.t) || x.n.localeCompare(y.n);
        return x.n.localeCompare(y.n);
      });
      items.forEach(function (li) { list.appendChild(li); });
    }
    [q, fc, fp, fs, fg, fb0].forEach(function (c) { c.addEventListener('input', apply); c.addEventListener('change', apply); });
    so.addEventListener('change', function () { sort(); apply(); });
    apply();
  }

  /* ---- a state picker that opens that state's page ---- */
  Array.prototype.forEach.call(document.querySelectorAll('select[data-go]'), function (sel) {
    sel.addEventListener('change', function () {
      if (sel.value) location.href = root + sel.getAttribute('data-go') + sel.value + '/' + (sel.getAttribute('data-hash') || '');
    });
  });

  /* ---- member page: narrow the vote list ---- */
  var votes = document.getElementById('votes');
  if (votes) {
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip')), rows = Array.prototype.slice.call(votes.children),
      vc = document.getElementById('vcount'), cur = { m: '', o: '' };
    function vapply() {
      var n = 0;
      rows.forEach(function (li) {
        var ok = (!cur.m || li.dataset.m === cur.m) && (!cur.o || li.dataset.o === cur.o);
        li.hidden = !ok; if (ok) n++;
      });
      vc.textContent = n === rows.length ? rows.length + (rows.length === 1 ? ' vote or bill' : ' votes and bills') + ' on the record.' :
        n ? n + ' of ' + rows.length + ' shown.' : 'Nothing matches both choices. Tap a chip again to clear it.';
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var kind = c.dataset.kind, val = c.dataset.val;
        cur[kind] = (cur[kind] === val) ? '' : val;
        chips.forEach(function (o) { if (o.dataset.kind === kind) o.setAttribute('aria-pressed', String(o.dataset.val === cur[kind])); });
        vapply();
      });
    });
    vapply();
  }

  /* ---- days until the election, counted from the reader's own date ---- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-until]'), function (s) {
    var p = s.getAttribute('data-until').split('-'), now = new Date();
    var days = Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    if (days > 1) s.textContent = ' That is ' + days + ' days from today.';
    else if (days === 1) s.textContent = ' That is tomorrow.';
    else if (days === 0) s.textContent = ' That is today.';
  });

  /* ---- the "Have your say" box. This file shapes it: what it asks for by what the reader picked, and
     what it is about when a button on the page opened it. Sending is the job of community.js, because
     sending needs an account. With scripts off the form posts by itself, with no account. ---- */
  var fb = document.getElementById('fbform');
  if (fb && window.fetch && window.URLSearchParams && window.FormData) {
    var note = document.getElementById('fbnote'), ctx = document.getElementById('fbctx'), about = document.getElementById('fbabout'),
      msg = document.getElementById('fbmsg'), fbcount = document.getElementById('fbcount'),      // not "count": the scorecard list above owns that name
      msglab = document.getElementById('fbmsglab'), linkrow = document.getElementById('fblinkrow'), link = document.getElementById('fblink'),
      linklab = document.getElementById('fblinklab'), linkhint = document.getElementById('fblinkhint'), minerow = document.getElementById('fbminerow'),
      mine = document.getElementById('fbmine'), minehint = document.getElementById('fbminehint'),
      radios = Array.prototype.slice.call(fb.querySelectorAll('input[type=radio]'));
    document.getElementById('fbpage').value = location.origin + location.pathname;
    /* What the box asks for, by what the reader picked. link: 0 no link field, 1 a link is welcome, 2 a link
       is the point. max: what a reader says or shares is printed on a page, so it is kept short. */
    var K = {
      opinion: { lab: 'What do you think?', ph: 'Did we get this right? Who has it wrong, and why? Say it in your own words.', link: 0, min: 8, max: 600, short: 'Write a few words first.' },
      video: { lab: 'What is in the video? (optional)', ph: 'One line: who is speaking, and about what.', link: 2, min: 0, max: 600, short: '',
        linklab: 'Link to the video', linkhint: 'A video from YouTube, X or Instagram plays right on the page. From anywhere else, it is shown as a link.' },
      wrong: { lab: 'What is wrong, and where?', ph: 'A wrong vote, an unfair summary, a name that is missing, a sentence that reads badly.', link: 0, min: 8, max: 600, short: 'Write a few words about what is wrong.',
        done: 'Sent. Thank you. We check it, and we fix what holds up.' },
      bug: { lab: 'What broke, and where?', ph: 'A button that does nothing, a link that goes nowhere, a page that looks odd on your phone. Say which phone or browser if you can.', link: 0, min: 8, max: 600, short: 'Write a few words about what broke.',
        done: 'Sent. Thank you. We try it ourselves, and we fix what we can make happen.' },
      source: { lab: 'What did we miss?', ph: 'Something a candidate said or did, or a vote we should be counting.', link: 1, min: 8, max: 600, short: 'Write a few words about what we missed.',
        linklab: 'Link, if you have one', linkhint: 'No link? Say in your note where you saw it, and we will look for it.',
        done: 'Sent. Thank you. Once we have found the words ourselves, it goes on the page.' },
      idea: { lab: 'What should this site do?', ph: 'Something you looked for and did not find, or something that would make you come back.', link: 0, min: 8, max: 600, short: 'Write a few words first.',
        done: 'Sent. Thank you. We read every one.' }
    };
    function kind() { var r = radios.filter(function (x) { return x.checked; })[0]; return r && K[r.value] ? r.value : 'opinion'; }
    function say(text, bad) { note.textContent = text; note.className = 'fbnote' + (bad ? ' bad' : ''); }
    function tally() {
      var k = K[kind()], n = msg.value.length;
      if (!fbcount) return;
      fbcount.hidden = n < 400;
      fbcount.textContent = n + ' of ' + k.max + ' characters';
      fbcount.className = 'fbcount' + (n > k.max ? ' bad' : '');
    }
    function shape() {
      var k = K[kind()];
      /* While the reader is giving an opinion the box asks the page's own question ("What do you make of this race?"). */
      msglab.textContent = (kind() === 'opinion' && !ctx.value && fb.getAttribute('data-ask')) || k.lab; msg.placeholder = k.ph; msg.required = k.min > 0;
      radios.forEach(function (r) { var l = r.closest('label'); if (l) l.classList.toggle('on', r.checked); });
      linkrow.hidden = !k.link;
      if (k.link) { linklab.textContent = k.linklab; linkhint.textContent = k.linkhint; }
      minerow.hidden = kind() !== 'video';
      minehint.hidden = !mine.checked;
      tally();
    }
    /* What the box is about. label is what the reader sees; id goes to the notes sheet in square brackets;
       on is the race or member a post is filed under ("race:mi-senate"), empty when a button did not say. */
    function subject(label, id, on) {
      ctx.value = label ? label + ' [' + (id || '') + ']' : '';
      fb.setAttribute('data-on', on || ''); fb.setAttribute('data-subject', on ? label : '');
      about.textContent = 'About: ' + label;
      about.hidden = !label;
      /* A reader who came from one line of the record and wants to talk about the whole page can drop the line. */
      if (label) {
        var x = document.createElement('button');
        x.type = 'button'; x.className = 'fbabout-x'; x.textContent = 'Remove'; x.setAttribute('aria-label', 'Remove what this post is about');
        x.addEventListener('click', function () { subject('', '', ''); shape(); msg.focus(); });
        about.appendChild(x);
      }
    }
    function pick(want) { radios.forEach(function (r) { r.checked = r.value === want; }); say(''); shape(); }
    radios.forEach(function (r) { r.addEventListener('change', function () { say(''); shape(); }); });
    mine.addEventListener('change', shape);
    msg.addEventListener('input', tally);
    shape();
    /* Buttons that open the box are found when they are tapped, so the ones community.js draws later work too. */
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href="#feedback"]');
      if (!a || !(a.hasAttribute('data-kind') || a.hasAttribute('data-about'))) return;
      /* A note the reader never sent is waiting in the box: open the box as they left it, change nothing. */
      if (a.className.indexOf('kept') >= 0) { setTimeout(function () { msg.focus({ preventScroll: true }); }, 60); return; }
      subject(a.getAttribute('data-about') || '', a.getAttribute('data-id') || '', a.getAttribute('data-on') || '');
      pick(a.getAttribute('data-kind') || 'wrong');
      var first = K[kind()].link === 2 ? link : msg;
      setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
    });
    window.LPBox = { K: K, kind: kind, say: say, shape: shape, subject: subject, pick: pick };
    fb.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (window.LP && window.LP.send) { window.LP.send(); return; }
      say('Accounts did not load, so this cannot be sent yet. Check your connection and reload the page. What you wrote stays in the box.', true);
    });
  }

  /* ---- a video a reader shared. It is a plain link to where the video lives; a tap puts the player
     on the page instead. Nothing from another site loads until the reader asks for it. The tap is caught
     on the page, because community.js draws these after the page has loaded. ---- */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('.tv[data-embed] a.tv-play');
    if (!a) return;
    var box = a.closest('.tv'), src = box.getAttribute('data-embed'), b = a.querySelector('b');
    if (!/^https:\/\/(www\.youtube-nocookie\.com\/embed\/|platform\.twitter\.com\/embed\/Tweet\.html\?id=|www\.instagram\.com\/(p|reel|tv)\/)/.test(src)) return;
    ev.preventDefault();
    var fr = document.createElement('iframe');
    if (box.getAttribute('data-plat') === 'YouTube') src += '?autoplay=1&rel=0';
    fr.src = src; fr.title = b ? b.textContent : 'Video';
    fr.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; fr.allowFullscreen = true;
    fr.referrerPolicy = 'strict-origin-when-cross-origin';
    box.textContent = ''; box.appendChild(fr); box.classList.add('on');
  });
  /* A post from X says how tall it is once it has drawn itself. */
  window.addEventListener('message', function (ev) {
    if (ev.origin !== 'https://platform.twitter.com' || !ev.data) return;
    var d = ev.data['twttr.embed'], h = d && d.method === 'twttr.private.resize' && d.params && d.params[0] && d.params[0].height;
    if (!h) return;
    Array.prototype.forEach.call(document.querySelectorAll('.tv.on iframe'), function (fr) {
      if (fr.contentWindow === ev.source) fr.style.height = Math.min(Math.max(+h, 200), 1400) + 'px';
    });
  });

  /* ---- the record, or the discussion. One page, two modes, one switch (Armin, 5 October 2026: "the
     transition between a politician's page and the discussion page should be seamless, like maybe a
     different tab"). The mode is in the address (#discussion), so a link can open either one and the
     back button undoes a switch. The script in the head has already set the mode before the page drew;
     with scripts off both parts are on the page and the switch is two plain links.
     THE ADDRESS ALONE DECIDES WHICH SIDE A PAGE OPENS ON. After that only the reader's own tap, or the
     back button, changes it. Nothing kept on the device may: until 5 October 2026 a note a reader had
     typed and not sent opened that page on its discussion at every visit, for as long as the note was
     kept (Armin: "when I click on different pages the default should not be the discussion"). So
     LPMode.go refuses to switch until the reader has touched the page. ---- */
  var modes = document.getElementById('modes'), H = document.documentElement;
  if (modes && H.getAttribute('data-mode')) {
    var tabR = document.getElementById('mode-record'), tabD = document.getElementById('mode-discussion'), keepY = 0;
    var isDisc = function (h) { return h === '#discussion' || h === '#feedback' || h === '#talk' || h.indexOf('#p-') === 0; };
    /* "Discussions" in the menu is the front page's discussion: on that page it is lit while it is open. */
    var feedNav = document.querySelector('#talk[data-feed]') ? document.querySelectorAll('header.top nav a[href$="#discussion"],.subnav a[href$="#discussion"]') : [];
    var touched = false;
    ['pointerdown', 'keydown'].forEach(function (t) { window.addEventListener(t, function () { touched = true; }, true); });
    var paint = function (m) {
      H.setAttribute('data-mode', m);
      if (m === 'record') { tabR.setAttribute('aria-current', 'page'); tabD.removeAttribute('aria-current'); }
      else { tabD.setAttribute('aria-current', 'page'); tabR.removeAttribute('aria-current'); }
      Array.prototype.forEach.call(feedNav, function (a) { if (m === 'discussion') a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    };
    /* The top of the discussion sits right under the switch. A reader who is already near the top of the
       page stays where they are; one who was far down the record is brought up to it. */
    var head = document.querySelector('header.top'), main = document.getElementById('main');
    var toTop = function () {
      var y = main.getBoundingClientRect().top + window.pageYOffset - modes.offsetHeight - (head ? head.offsetHeight : 0);
      if (window.pageYOffset > y) window.scrollTo(0, Math.max(0, y));
    };
    var setMode = function (m) {
      var was = H.getAttribute('data-mode');
      if (was === m) { if (m === 'discussion') toTop(); return; }
      if (m === 'discussion') keepY = window.pageYOffset;
      paint(m);
      if (m === 'discussion') toTop(); else window.scrollTo(0, keepY);      /* back to the line of the record they left */
      try { document.dispatchEvent(new CustomEvent('lp:mode', { detail: m })); } catch (x) { }
    };
    var sync = function () { var h = location.hash; if (isDisc(h)) { if (H.getAttribute('data-mode') !== 'discussion') setMode('discussion'); } else if (H.getAttribute('data-mode') !== 'record') setMode('record'); };
    var put = function (hash) { try { history.pushState(null, '', hash || (location.pathname + location.search)); } catch (x) { location.hash = hash; } };
    paint(H.getAttribute('data-mode'));
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href="#discussion"],a[href="#feedback"],a[href="#record"]');
      if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
      ev.preventDefault();
      var want = a.getAttribute('href') === '#record' ? 'record' : 'discussion';
      if (H.getAttribute('data-mode') !== want) put(want === 'record' ? '' : '#discussion');
      setMode(want);
    });
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    window.LPMode = { go: function (m) { if (!touched) return false; if (H.getAttribute('data-mode') !== m) put(m === 'record' ? '' : '#discussion'); setMode(m); return true; }, is: function () { return H.getAttribute('data-mode'); } };
  }

  /* ---- share this page: the phone's own share sheet where there is one, the link copied where there is not ---- */
  var sh = document.getElementById('share');
  if (sh) sh.addEventListener('click', function () {
    var url = sh.getAttribute('data-url') + (H.getAttribute('data-mode') === 'discussion' ? '#discussion' : ''), lab = sh.querySelector('span'), old = lab.textContent;
    var done = function (text) { lab.textContent = text; sh.classList.add('said'); setTimeout(function () { lab.textContent = old; sh.classList.remove('said'); }, 2200); };
    if (navigator.share) { navigator.share({ title: sh.getAttribute('data-title'), url: url }).catch(function () { }); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done('Link copied'); }, function () { done('Copy the address bar'); });
    else done('Copy the address bar');
  });

  /* ---- copy the link ---- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) {
    b.addEventListener('click', function () {
      var url = b.getAttribute('data-copy'), old = b.textContent;
      function done(ok) { b.textContent = ok ? 'Link copied' : 'Could not copy. Copy the address from the address bar.'; setTimeout(function () { b.textContent = old; }, 2200); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      else done(false);
    });
  });
})();
