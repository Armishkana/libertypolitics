/* The share panel: what opens when a reader taps Share. The same file on every site (libertypolitics.com and
   iranuncensored.com ship it from here). Its looks are build/share.css, which each site's render.py adds to
   the end of its own site.css.

   WHY THE SITE DRAWS ITS OWN PANEL (Armin, 14 October 2026, with a picture of the grey Windows share window:
   "It's horrible ... word of mouth is the most important thing for our website to grow ... make it rewarding
   for them, beautiful, easy to use"). Until that day the button handed the job to the browser
   (navigator.share). On a phone that opens the phone's own list of apps, which is good. On a Windows computer
   it opens a system window with OneNote and Phone Link in it. So: the panel is the site's own everywhere, and
   the phone's list is one more button inside it, offered only where it is the good one.

   WHAT A READER GETS
     - the picture and the title their friend will see, before they send anything
     - the link, and one button that copies it
     - one tap for each app people really send links with (a plain link each: no pop-up to be blocked)
     - after they have sent it: a thank-you, and where the site has a mission for it, the way to report it
   Nothing about the reader is put in the link. What is sent is the page's own public address.

   WHAT OPENS IT: the button with id "share" under the header, and anything that carries data-share.
   What it reads from that control (each optional):
     data-url    the address to send                   else <link rel=canonical>, else this address
     data-title  the title on the card                 else og:title, else the page's title
     data-text   the words put in front of the link    else the title
     data-pic    the picture on the card               else og:image
   A page on its discussion side is sent with #discussion, so the friend lands where the reader was.

   WHAT A SITE MAY HAND IN, as window.LPSITE.share (iranuncensored.com does, in its community-<lang>.js):
     apps     the apps, in order. Known: whatsapp telegram x facebook reddit email sms (a phone only) more (a phone's own list, a phone only)
     note     one quiet line at the foot of the panel, already in the page's language
     mission  {"href": "<address of the mission card, from the site's root>"}: where "I sent it" is reported
   Words: the English here is the key; a site's other words come from window.LPSITE.strings through tt(),
   the same table community.js and discussion.js read.

   THE PICTURE TO POST (30 October 2026, build/shareimg.js, README "The picture to post"). A tool that registers a
   picture in window.LPShotQ gets two things from here: assets/shareimg.js?v=95fe996bb7 is loaded (while the browser is idle, or on
   the first tap), and the panel shows that picture at its top with Save picture, so every Share tap also offers it.
   Anything carrying data-shot="<id>" ("Make a picture") opens the picture's own sheet.

   WITH THIS FILE MISSING the Share button still works: discussion.js copies the link. In a browser with no
   <dialog>, this file does the same. */
(function () {
  'use strict';
  var D = document, W = window;
  var SITE = (W.LPSITE && typeof W.LPSITE === 'object') ? W.LPSITE : {}, STR = SITE.strings || null, CFG = (SITE.share && typeof SITE.share === 'object') ? SITE.share : {};
  var DIGITS = typeof SITE.digits === 'string' && SITE.digits.length === 10 ? SITE.digits : '';
  function tt(s, v) {
    var out = STR && typeof STR[s] === 'string' ? STR[s] : s;
    if (v) out = out.replace(/\{(\w+)\}/g, function (m, k) {
      if (!(k in v)) return m;
      return typeof v[k] === 'number' && DIGITS ? String(v[k]).replace(/[0-9]/g, function (d) { return DIGITS[d]; }) : String(v[k]);
    });
    return out;
  }
  /* Where the site's own files are, from this file's own address: the same in a folder on a test computer
     as on the public site. */
  var ROOT = (function () { var s = D.currentScript && D.currentScript.src; return s && /assets\/share\.js/.test(s) ? s.replace(/assets\/share\.js.*$/, '') : ''; })();
  var UA = navigator.userAgent || '';
  var PHONE = /Android|iPhone|iPad|iPod/i.test(UA) || (navigator.userAgentData && navigator.userAgentData.mobile === true);
  /* The phone's own list of apps. Never on Windows: that is the grey window this file replaces. */
  var NATIVE = typeof navigator.share === 'function' && !/Windows/i.test(UA);

  var ICON = {
    x: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
    ok: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>'
  };
  function line(d) { return '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; }
  function mark(d) { return '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor"><path d="' + d + '"/></svg>'; }
  function q(s) { return encodeURIComponent(s); }
  /* Each app: its name, its mark, and the address that opens it with the link in place. s = {url, title, text}. */
  var APPS = {
    whatsapp: { name: tt('WhatsApp'), icon: mark('M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'),
      href: function (s) { return 'https://wa.me/?text=' + q(s.text + ' ' + s.url); } },
    telegram: { name: tt('Telegram'), icon: mark('M21.9 4.3 18.7 19.6c-.24 1.07-.87 1.33-1.76.83l-4.87-3.59-2.35 2.26c-.26.26-.48.48-.98.48l.35-4.96 9.02-8.15c.39-.35-.09-.54-.61-.2L6.35 13.29l-4.8-1.5c-1.04-.33-1.06-1.04.22-1.54L20.55 3c.87-.32 1.63.2 1.35 1.3Z'),
      href: function (s) { return 'https://t.me/share/url?url=' + q(s.url) + '&text=' + q(s.text); } },
    x: { name: tt('X'), icon: mark('M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'),
      href: function (s) { return 'https://x.com/intent/post?text=' + q(s.text) + '&url=' + q(s.url); } },
    facebook: { name: tt('Facebook'), icon: mark('M13.5 22v-8.2h2.75l.42-3.2H13.5V8.56c0-.93.26-1.56 1.59-1.56h1.7V4.14A22.6 22.6 0 0 0 14.31 4c-2.45 0-4.13 1.5-4.13 4.24v2.36H7.4v3.2h2.78V22z'),
      href: function (s) { return 'https://www.facebook.com/sharer/sharer.php?u=' + q(s.url); } },
    reddit: { name: tt('Reddit'), icon: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="14.5" rx="8" ry="5.5"/><circle cx="18.5" cy="4.5" r="1.7"/><path d="M12 9l1.2-5 3.7.8"/><circle cx="4.3" cy="11" r="1.6"/><circle cx="19.7" cy="11" r="1.6"/><path d="M9 16.4c1.8 1.2 4.2 1.2 6 0"/><circle cx="9" cy="13.3" r=".9" fill="currentColor" stroke="none"/><circle cx="15" cy="13.3" r=".9" fill="currentColor" stroke="none"/></svg>',
      href: function (s) { return 'https://www.reddit.com/submit?url=' + q(s.url) + '&title=' + q(s.title); } },
    email: { name: tt('Email'), icon: line('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>'), same: true,
      href: function (s) { return 'mailto:?subject=' + q(s.title) + '&body=' + q((s.text === s.title ? '' : s.text + '\n\n') + s.url); } },
    sms: { name: tt('Messages'), icon: line('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 12h.01M12 12h.01M15 12h.01"/>'), phone: true, same: true,
      href: function (s) { return 'sms:?&body=' + q(s.text + ' ' + s.url); } },
    more: { name: tt('More'), icon: line('<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>'), native: true }
  };
  var ORDER = (Array.isArray(CFG.apps) && CFG.apps.length ? CFG.apps : ['whatsapp', 'x', 'facebook', 'telegram', 'reddit', 'email', 'sms', 'more'])
    .filter(function (k, i, a) { return APPS.hasOwnProperty(k) && a.indexOf(k) === i; });

  function el(tag, cls, text) { var n = D.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function meta(p) { var m = D.querySelector('meta[property="' + p + '"]'); return m ? (m.getAttribute('content') || '') : ''; }
  function plain(u) { try { return new URL(u, location.href); } catch (x) { return null; } }

  /* What is being sent, read at the moment of the tap: you.js changes the button's address once a reader
     has a grade, so nothing here is read ahead of time. */
  function subject(from) {
    var get = function (k) { return (from && from.getAttribute && from.getAttribute(k)) || ''; };
    var canon = D.querySelector('link[rel="canonical"]');
    var url = get('data-url') || (canon && canon.href) || (location.origin + location.pathname);
    if (D.documentElement.getAttribute('data-mode') === 'discussion' && url.indexOf('#') < 0) url += '#discussion';
    var title = get('data-title') || meta('og:title') || D.title || '';
    var pic = get('data-pic') || meta('og:image');
    /* On a test computer the picture's public address may not exist yet, or may be an older one. The same
       file is in this build, so it is read from here. On the public site this changes nothing. */
    var pu = pic && plain(pic), uu = plain(url);
    if (pu && uu && ROOT && pu.origin === uu.origin && pu.origin !== location.origin) pic = ROOT + pu.pathname.replace(/^\//, '') + pu.search;
    return { url: url, title: title, text: get('data-text') || title, pic: pic || '', host: uu ? uu.hostname.replace(/^www\./, '') : '' };
  }

  function count(method, s) {
    try { D.dispatchEvent(new CustomEvent('lp:share', { detail: { method: method, url: s.url } })); } catch (x) { }
    /* A count of taps by app and page, when the site has its visitor counter on. Never on a site that asks
       for no counts (LPSITE.noStats). */
    try { if (!SITE.noStats && typeof W.gtag === 'function') W.gtag('event', 'share', { method: method, content_type: 'page', item_id: (plain(s.url) || {}).pathname || '' }); } catch (x) { }
  }

  /* ---- the link, copied. The clipboard where the browser has one; the old way where it does not or will
     not; and if neither works the link is left selected, so the reader's own copy does the rest. ---- */
  function copyText(text, input) {
    var old = function () {
      return new Promise(function (res, rej) {
        try { input.focus(); input.select(); input.setSelectionRange(0, text.length); if (D.execCommand && D.execCommand('copy')) res(); else rej(new Error('no copy')); }
        catch (x) { rej(x); }
      });
    };
    if (navigator.clipboard && navigator.clipboard.writeText && W.isSecureContext !== false) return navigator.clipboard.writeText(text).catch(old);
    return old();
  }

  /* With no <dialog> in the browser there is no panel to draw: copy the link and say so on the button. */
  function legacy(from, s) {
    var lab = from.querySelector('span') || from, old = lab.textContent, t = D.createElement('input');
    var said = function (text) { lab.textContent = text; from.classList.add('said'); setTimeout(function () { lab.textContent = old; from.classList.remove('said'); }, 2200); };
    t.value = s.url; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0;top:0;left:0'; D.body.appendChild(t);
    copyText(s.url, t).then(function () { said(tt('Link copied')); count('copy', s); }, function () { said(tt('Copy the address bar')); }).then(function () { t.remove(); });
  }

  /* ------------------------------------------------------------------ the panel
     One real dialog, built on the first tap and kept: the browser holds focus inside it, closes it on
     Escape and puts focus back on the button that opened it. It wears the classes of the sign-in panel
     (.sheet in site.css), so it sits at the foot of a phone's screen and in the middle of a computer's. */
  var P = null, NOW = null, sayTimer = 0;
  function build() {
    var dlg = el('dialog', 'sheet shr'), inner = el('div', 'sheet-in'), top = el('div', 'sheet-top'), h = el('h2', null, tt('Pass it on'));
    dlg.id = 'shr'; dlg.setAttribute('aria-labelledby', 'shr-h'); h.id = 'shr-h'; h.tabIndex = -1;
    var x = el('button', 'sheet-x'); x.type = 'button'; x.setAttribute('aria-label', tt('Close')); x.innerHTML = ICON.x;
    top.append(h, x);
    var body = el('div', 'sheet-body');
    var lead = el('p', 'shr-lead', tt('Who is the one person who should see this?'));
    // the picture to post, when the page has one (build/shareimg.js): its own small row at the top
    var shot = el('div', 'shr-shot'), shotPic = el('button', 'shr-shot-pic'), shotImg = el('img'), shotT = el('div', 'shr-shot-t');
    var shotSave = el('button', 'btn btn-key shr-shot-save', tt('Save picture'));
    shot.hidden = true; shotPic.type = 'button'; shotPic.setAttribute('aria-label', tt('See the picture')); shotImg.alt = ''; shotImg.width = 1080; shotImg.height = 1350;
    shotSave.type = 'button';
    shotPic.appendChild(shotImg);
    shotT.append(el('p', 'shr-shot-l', tt('Your picture, ready to post')), shotSave);
    shot.append(shotPic, shotT);
    var card = el('figure', 'shr-card'), pic = el('img', 'shr-pic'), cap = el('figcaption', 'shr-meta'), t = el('b', 'shr-t'), host = el('span', 'shr-h');
    pic.alt = ''; pic.width = 1200; pic.height = 630;
    /* A picture that did not come is put away, and its address forgotten, so the next opening asks for it again
       (a dropped connection is not a missing file) and a broken image is never what a reader is shown. */
    pic.addEventListener('error', function () { pic.hidden = true; pic.removeAttribute('src'); card.classList.remove('shr-has-pic'); });
    host.dir = 'ltr';
    cap.append(t, host); card.append(pic, cap);
    var row = el('div', 'shr-copy'), url = el('input', 'shr-url'), go = el('button', 'btn btn-key shr-go'), goIc = el('i', 'shr-go-i'), goLab = el('span', null, tt('Copy link'));
    url.type = 'text'; url.readOnly = true; url.dir = 'ltr'; url.setAttribute('aria-label', tt('The link to this page')); url.setAttribute('autocomplete', 'off'); url.spellcheck = false;
    url.addEventListener('focus', function () { try { url.select(); } catch (e) { } });
    go.type = 'button'; goIc.innerHTML = ICON.copy; go.append(goIc, goLab);
    row.append(url, go);
    var say = el('p', 'shr-say'); say.setAttribute('role', 'status'); say.setAttribute('aria-live', 'polite');
    var apps = el('ul', 'shr-apps'); apps.setAttribute('aria-label', tt('Send it with'));
    var links = {};
    ORDER.forEach(function (k) {
      var a = APPS[k];
      if ((a.phone && !PHONE) || (a.native && !(NATIVE && PHONE))) return;
      var li = el('li'), c = el(a.native ? 'button' : 'a', 'shr-app'), ic = el('i', 'shr-ic'), nm = el('span', null, a.name);
      ic.innerHTML = a.icon; c.setAttribute('data-app', k); c.append(ic, nm);
      if (a.native) c.type = 'button';
      else if (!a.same) { c.target = '_blank'; c.rel = 'noopener'; }
      li.appendChild(c); apps.appendChild(li); links[k] = c;
    });
    var after = el('p', 'shr-after'), afterText = el('span'), afterGo = el('a', 'shr-after-a');
    after.hidden = true; after.append(afterText, afterGo);
    var note = el('p', 'shr-note', typeof CFG.note === 'string' ? CFG.note : ''); note.hidden = !note.textContent;
    body.append(shot, lead, card, row, say, apps, after, note);
    shotPic.addEventListener('click', function () {
      var id = P.shotId, o = P.opener;
      if (!id) return;
      shut();
      shotLib().then(function (L) { L.open(id, o); }, function () { });
    });
    shotSave.addEventListener('click', function () {
      var id = P.shotId;
      if (!id) return;
      shotLib().then(function (L) { return L.save(id, 'post'); }).then(function () {
        if (P.shotId !== id) return;
        shotSave.textContent = tt('Saved');
        setTimeout(function () { shotSave.textContent = tt('Save picture'); }, 2600);
        done('picture');
      }, function () { });
    });
    inner.append(top, body); dlg.appendChild(inner);

    function done(method) {
      if (!NOW) return;
      count(method, NOW);
      var m = CFG.mission && typeof CFG.mission.href === 'string' && ROOT ? CFG.mission.href : '';
      afterText.textContent = m ? tt('Sent it? Tell me who you sent it to, and it counts as a mission.') : tt('Thank you. This is how I reach the next person.');
      afterGo.hidden = !m;
      if (m) { afterGo.href = ROOT + m; afterGo.textContent = tt('Report it'); }
      after.hidden = false;
      try { after.scrollIntoView({ block: 'nearest' }); } catch (e) { }
    }
    go.addEventListener('click', function () {
      if (!NOW) return;
      var s = NOW;
      copyText(s.url, url).then(function () {
        go.classList.add('ok'); goIc.innerHTML = ICON.ok; goLab.textContent = tt('Copied'); say.classList.remove('shr-say-on'); say.textContent = tt('Link copied');
        clearTimeout(sayTimer);
        sayTimer = setTimeout(function () { go.classList.remove('ok'); goIc.innerHTML = ICON.copy; goLab.textContent = tt('Copy link'); say.textContent = ''; }, 2600);
        done('copy');
      }, function () {
        try { url.focus(); url.select(); } catch (e) { }
        say.classList.add('shr-say-on'); say.textContent = tt('The link is selected. Copy it from the box.');
      });
    });
    apps.addEventListener('click', function (ev) {
      var c = ev.target.closest ? ev.target.closest('.shr-app') : null;
      if (!c || !NOW) return;
      var k = c.getAttribute('data-app'), s = NOW;
      if (!APPS[k].native) { done(k); return; }      // a plain link: the browser opens it, nothing to wait for
      /* The phone's own list. Closing it without picking is not an error, and is not counted as a send. */
      try { navigator.share({ title: s.title, text: s.text === s.title ? undefined : s.text, url: s.url }).then(function () { done('more'); }, function () { }); } catch (x) { }
    });
    x.addEventListener('click', shut);
    /* A tap on the dark area around the panel closes it. A drag that began inside the panel does not. */
    var downOut = false;
    var outside = function (ev) { var r = inner.getBoundingClientRect(); return ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom; };
    dlg.addEventListener('pointerdown', function (ev) { downOut = ev.target === dlg && outside(ev); });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg && downOut && outside(ev)) shut(); });
    dlg.addEventListener('close', function () {
      var o = P.opener; P.opener = null; NOW = null;
      if (o && D.contains(o)) { try { o.focus({ preventScroll: true }); } catch (e) { } }
    });
    D.body.appendChild(dlg);
    P = { dlg: dlg, card: card, pic: pic, t: t, host: host, url: url, go: go, goIc: goIc, goLab: goLab, say: say, links: links, after: after, opener: null,
      shot: shot, shotImg: shotImg, shotSave: shotSave, shotId: null, shotObj: '' };
  }

  /* ---- the picture to post (build/shareimg.js), loaded only on a page that registered one ---- */
  var SHOTQ = W.LPShotQ = W.LPShotQ || [], SHOT_P = null, VQ = (function () { var s = D.currentScript && D.currentScript.src, m = s && /\?[^#]*/.exec(s); return m ? m[0] : ''; })();
  function hasShots() { return !!((W.LPShot && W.LPShot.list && W.LPShot.list().length) || (W.LPShotQ && W.LPShotQ.length)); }
  function shotLib() {
    if (W.LPShot && W.LPShot.ready) return Promise.resolve(W.LPShot);
    if (SHOT_P) return SHOT_P;
    SHOT_P = new Promise(function (res, rej) {
      var s = D.createElement('script'), base = ROOT || (D.documentElement.getAttribute('data-root') || '');
      // the same ?v= as this file's own address, so a new build never pairs this file with yesterday's picture code
      var src = base + 'assets/shareimg.js?v=95fe996bb7';
      s.src = src + (src.indexOf('?') < 0 ? VQ : '');
      s.onload = function () { if (W.LPShot && W.LPShot.ready) res(W.LPShot); else { SHOT_P = null; rej(new Error('no picture code')); } };
      s.onerror = function () { SHOT_P = null; s.remove(); rej(new Error('no picture code')); };
      D.head.appendChild(s);
    });
    return SHOT_P;
  }
  function shotSoon() {
    if (W.LPShot || SHOT_P || !hasShots()) return;
    var go = function () { shotLib().catch(function () { }); };
    if (W.requestIdleCallback) W.requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 1200);
  }
  if (Array.isArray(SHOTQ)) { var push0 = SHOTQ.push; SHOTQ.push = function () { var n = push0.apply(SHOTQ, arguments); shotSoon(); return n; }; }
  if (D.readyState === 'complete') shotSoon(); else W.addEventListener('load', shotSoon);
  // the picture row of the panel: shown at once when the page has a picture, filled when it is drawn
  function shotRow(from, s) {
    var on = hasShots();
    P.shot.hidden = !on; P.dlg.classList.toggle('shr-has-shot', on); P.shotId = null;
    P.shotSave.textContent = tt('Save picture');
    if (!on) return;
    P.shotImg.removeAttribute('src');
    shotLib().then(function (L) {
      var id = L.pick(from);
      if (NOW !== s) return;
      if (!id) { P.shot.hidden = true; P.dlg.classList.remove('shr-has-shot'); return; }
      P.shotId = id;
      return L.png(id, 'post').then(function (b) {
        if (NOW !== s || P.shotId !== id) return;
        if (P.shotObj) URL.revokeObjectURL(P.shotObj);
        P.shotObj = URL.createObjectURL(b); P.shotImg.src = P.shotObj;
      });
    }).catch(function () { if (NOW === s) { P.shot.hidden = true; P.dlg.classList.remove('shr-has-shot'); } });
  }
  function shut() { if (P && P.dlg.open) P.dlg.close(); }

  function open(from) {
    var s = subject(from);
    if (!W.HTMLDialogElement || !D.createElement('dialog').showModal) { legacy(from, s); return; }
    if (!P) build();
    NOW = s;
    P.t.textContent = s.title; P.host.textContent = s.host; P.url.value = s.url;
    P.pic.hidden = !s.pic; P.card.classList.toggle('shr-has-pic', !!s.pic);
    if (s.pic && P.pic.getAttribute('src') !== s.pic) P.pic.src = s.pic;
    Object.keys(P.links).forEach(function (k) { if (APPS[k].href) P.links[k].href = APPS[k].href(s); });
    clearTimeout(sayTimer);
    P.go.classList.remove('ok'); P.goIc.innerHTML = ICON.copy; P.goLab.textContent = tt('Copy link'); P.say.classList.remove('shr-say-on'); P.say.textContent = ''; P.after.hidden = true;
    shotRow(from, s);
    if (!P.dlg.open) { P.opener = from && from.focus ? from : D.activeElement; P.dlg.showModal(); }
    try { P.go.focus({ preventScroll: true }); } catch (e) { }
  }

  D.addEventListener('click', function (ev) {
    var shotFrom = ev.target && ev.target.closest ? ev.target.closest('[data-shot]') : null;
    if (shotFrom && !ev.defaultPrevented) {      // "Make a picture": the picture's own sheet
      ev.preventDefault();
      shotLib().then(function (L) { L.open(shotFrom.getAttribute('data-shot'), shotFrom); }, function () { });
      return;
    }
    var from = ev.target && ev.target.closest ? ev.target.closest('#share,[data-share]') : null;
    if (!from || ev.defaultPrevented) return;
    ev.preventDefault();
    open(from);
  });
  /* For the page's other scripts: discussion.js leaves the Share button alone once this is here. */
  W.LPShare = { open: open, close: shut, apps: ORDER.slice(), shot: function (id, from) { return shotLib().then(function (L) { return L.open(id, from); }); } };
})();
