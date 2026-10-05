/* The discussion's own controls, the same file on every site that carries a discussion (libertypolitics.com
   and iranuncensored.com): the box a reader writes in, the switch between a page's record and its
   discussion, the player a shared video opens in, and the Share button. It was part of site.js until
   5 October 2026; each site's own site.js keeps what is its own (search, filters, joining).
   Every page works with this file missing: with scripts off both parts of a page are on it, one after the
   other, and the box posts by itself.
   Words: the English here is libertypolitics.com's. A site may hand in other words as
   window.LPSITE.strings, the same table community.js reads (iranuncensored.com:
   site-iu/build/community-strings.json). tt() looks a sentence up there and fills in its {parts}. */
(function () {
  'use strict';
  var SITE = (window.LPSITE && typeof window.LPSITE === 'object') ? window.LPSITE : {}, STR = SITE.strings || null;
  var DIGITS = typeof SITE.digits === 'string' && SITE.digits.length === 10 ? SITE.digits : '';
  function tt(s, v) {
    var out = STR && typeof STR[s] === 'string' ? STR[s] : s;
    if (v) out = out.replace(/\{(\w+)\}/g, function (m, k) {
      if (!(k in v)) return m;
      return typeof v[k] === 'number' && DIGITS ? String(v[k]).replace(/[0-9]/g, function (d) { return DIGITS[d]; }) : String(v[k]);
    });
    return out;
  }

  /* ---- the box a reader writes in. This file shapes it: what it asks for by what the reader picked, and
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
      opinion: { lab: tt('What do you think?'), ph: tt('Did we get this right? Who has it wrong, and why? Say it in your own words.'), link: 0, min: 8, max: 600, short: tt('Write a few words first.') },
      video: { lab: tt('What is in the video? (optional)'), ph: tt('One line: who is speaking, and about what.'), link: 2, min: 0, max: 600, short: '',
        linklab: tt('Link to the video'), linkhint: tt('A video from YouTube, X or Instagram plays right on the page. From anywhere else, it is shown as a link.') },
      wrong: { lab: tt('What is wrong, and where?'), ph: tt('A wrong vote, an unfair summary, a name that is missing, a sentence that reads badly.'), link: 0, min: 8, max: 600, short: tt('Write a few words about what is wrong.'),
        done: tt('Sent. Thank you. We check it, and we fix what holds up.') },
      bug: { lab: tt('What broke, and where?'), ph: tt('A button that does nothing, a link that goes nowhere, a page that looks odd on your phone. Say which phone or browser if you can.'), link: 0, min: 8, max: 600, short: tt('Write a few words about what broke.'),
        done: tt('Sent. Thank you. We try it ourselves, and we fix what we can make happen.') },
      source: { lab: tt('What did we miss?'), ph: tt('Something a candidate said or did, or a vote we should be counting.'), link: 1, min: 8, max: 600, short: tt('Write a few words about what we missed.'),
        linklab: tt('Link, if you have one'), linkhint: tt('No link? Say in your note where you saw it, and we will look for it.'),
        done: tt('Sent. Thank you. Once we have found the words ourselves, it goes on the page.') },
      idea: { lab: tt('What should this site do?'), ph: tt('Something you looked for and did not find, or something that would make you come back.'), link: 0, min: 8, max: 600, short: tt('Write a few words first.'),
        done: tt('Sent. Thank you. We read every one.') }
    };
    function kind() { var r = radios.filter(function (x) { return x.checked; })[0]; return r && K[r.value] ? r.value : 'opinion'; }
    function say(text, bad) { note.textContent = text; note.className = 'fbnote' + (bad ? ' bad' : ''); }
    function tally() {
      var k = K[kind()], n = msg.value.length;
      if (!fbcount) return;
      fbcount.hidden = n < 400;
      fbcount.textContent = tt('{n} of {max} characters', { n: n, max: k.max });
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
      about.textContent = tt('About: {what}', { what: label });
      about.hidden = !label;
      /* A reader who came from one line of the record and wants to talk about the whole page can drop the line. */
      if (label) {
        wake();
        var x = document.createElement('button');
        x.type = 'button'; x.className = 'fbabout-x'; x.textContent = tt('Remove'); x.setAttribute('aria-label', tt('Remove what this post is about'));
        x.addEventListener('click', function () { subject('', '', ''); shape(); msg.focus(); });
        about.appendChild(x);
      }
    }
    function pick(want) { radios.forEach(function (r) { r.checked = r.value === want; }); say(''); shape(); wake(); }
    radios.forEach(function (r) { r.addEventListener('change', function () { say(''); shape(); }); });
    mine.addEventListener('change', shape);
    msg.addEventListener('input', tally);
    shape();
    /* The box rests small until a reader comes to it: the question, a place to type and the button. The kinds
       and the line about an account show once they tap in, pick a kind or have words in it. It wakes one way
       only and never shrinks back while the page is open, so nothing can vanish from under a finger. With
       scripts off it is never put to rest. Why: on a phone the whole box filled the first screen of every
       discussion, and a reader saw a form before they saw a single post. */
    var fbsec = document.getElementById('feedback');
    function wake() { if (fbsec) fbsec.classList.remove('rest'); }
    if (fbsec && !msg.value && !link.value) fbsec.classList.add('rest');
    fb.addEventListener('focusin', wake); fb.addEventListener('input', wake); fb.addEventListener('change', wake);
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
      say(tt('Accounts did not load, so this cannot be sent yet. Check your connection and reload the page. What you wrote stays in the box.'), true);
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
    fr.src = src; fr.title = b ? b.textContent : tt('Video');
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
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(tt('Link copied')); }, function () { done(tt('Copy the address bar')); });
    else done(tt('Copy the address bar'));
  });
})();
