/* THE TOUR of the Intel Room (libertypolitics.com/intel/), an add-on intel.js loads from data-addons once the room is ready.

   Armin, 23 October 2026: "there needs to be a 'Take a Tour' or something similar for each part of the Intel room ... It
   shows me how everything works ... This needs to be an utterly perfect tour for everybody that makes it easy for
   everybody to understand how everything works, even if they're 5 years old."

   HOW IT WORKS. Two tours, each a list of STEPS. A step points at a real control on the page (a spotlight cut out of a dim
   screen, the rest of the page untouched), says in one or two short sentences what it is and what it does for you, and
   may offer "Show me", which does the thing for you (taps the hottest story, opens the run order) so you learn by seeing
   it happen. A step whose control is not on the page right now (no Trending row in a quiet hour, the maker closed) is
   skipped, never pointed at empty space.
     the room tour    the lenses, the search, the Trending row (Show me taps the hottest story), the story view, Topic /
                      Region / Filters, the map, a card (its face, its badge, its labels), Make a show, Add, Play
     the maker tour   the show maker, part by part: what it is built from, the three dials, the words, the run order
                      (Show me opens it), the show screen, saving and sharing
   DOORS. "Tour" on the room's bar (always), a one-time "New here?" line above the bar (until it is taken or closed on that
   device), the last step of the room tour ("Tour the show maker"), and "How it works" at the top of the open maker.
   It never hides content and animates it back (CLAUDE.md, phone rules): the spotlight and the card simply appear.
   KEYS. Right arrow or Enter: next. Left arrow: back. Esc: close. Focus stays inside the tour card while it is open.
   PHONE. The card sits at the bottom of the screen (at the top when the spotlight is low), every button at least 44 px.
   BOTH SITES (24 October 2026). Iran Uncensored's room loads this same file (site-iu/build/news.py names it in data-addons).
   Every sentence goes through T(), the room's own table (CFG.t, from site-iu/data/news-words.json): on Liberty Politics
   there is no CFG and T() gives back the English as written; the Iran page's English says its own version of a step where
   that room differs ("en", e.g. the camps in place of left and right), its Persian is spoken Persian ("fa"), and news.py
   t_keys() reads this file, so the Persian build stops while a sentence here has no Persian. A step whose control exists on
   one site only (the Iran room's Media tab) is simply skipped on the other, the same rule as any absent control. On a
   right-to-left page the left arrow is "next".
   Test: build/phone-test.html "TOUR" walks both tours at 360 px and 1280 px; site-iu/build/phone-test.html the Iran ones. */
(function () {
  var R = window.IRoom, root = document.getElementById('ir');
  if (!R || !root || document.getElementById('irt-b')) return;
  var SEEN = 'ir-tour-seen';
  var CFG = (function () { var el = document.getElementById('ir-cfg'); if (!el) return {}; try { var c = JSON.parse(el.textContent); return c && typeof c === 'object' ? c : {}; } catch (e) { return {}; } })();
  var TT = CFG.t && typeof CFG.t === 'object' ? CFG.t : null, FA = CFG.lang === 'fa', RTL = !!CFG.rtl;
  function T(s, v) { var r = TT && typeof TT[s] === 'string' ? TT[s] : s; if (v) Object.keys(v).forEach(function (k) { r = r.split('{' + k + '}').join(String(v[k])); }); return r; }
  function N(n) { var s = String(n); return FA ? s.replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(+d); }) : s; }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function $(id) { return document.getElementById(id); }
  function q(sel, inside) { return (inside || document).querySelector(sel); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shown(el) {
    if (!el || !el.isConnected) return false;
    var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]');
  }
  function firstShown(sels) { for (var i = 0; i < sels.length; i++) { var list = document.querySelectorAll(sels[i]); for (var j = 0; j < list.length; j++) if (shown(list[j])) return list[j]; } return null; }
  function clickEl(el) { if (el) el.click(); }
  function storyOn() { var p = $('ir-pills'); return !!(p && q('.ir-pill-about', p)); }
  function makerOpen() { var m = $('ir-sm'); return !!(m && !m.hidden && m.classList.contains('open')); }

  /* ------------------------------------------------------------------ the steps (the words a five-year-old can follow) */
  var ROOM = [
    { e: '👋', h: T('Welcome to the Intel Room'), p: T('It finds the news, videos and posts the world is talking about right now, and helps you turn them into a show. This tour takes about a minute.') },
    { at: ['#ir-lens'], e: '🕐', h: T('Pick what to look at'), p: T('Last 24 hours is today. The Bank is older things we kept. From readers is what people sent in. The number is how many things are in each.') },
    { at: ['#ir-ask'], e: '🔎', h: T('Search or ask'), p: T('Type anything, like Iran or videos from Gaza today. Or tap the microphone and just say it.') },
    { at: ['#ir-hotrow'], e: '🔥', h: T('The hottest stories'), p: T('Each button is one story people are talking about. The first number says how hot it is (100 is the hottest). The last number says how many things you can look at.'),
      act: { label: T('Show me'), run: function () { clickEl(firstShown(['#ir-hots .ir-hs'])); } } },
    { at: ['#ir-pills'], when: storyOn, e: '📌', h: T('Now you see only that story'), p: T('Posts on X, articles and videos about it, all in one place: enough for a whole show. Tap the x next to its name to see everything again.') },
    { at: ['#ir-cmd [data-open]'], all: true, e: '🗂️', h: T('Topic, Region and Filters'), p: T('Topic picks a subject, like war or AI. Region picks a part of the world. Filters keeps only what you want: only videos, only X posts, only articles, or only the most liked.') },
    { at: ['#ir-mapbox'], e: '🌍', h: T('The map'), p: T('Each circle is a place where things are happening. A bigger circle means more. Tap a circle to see what happened there. Lines join places in the same story.') },
    { at: ['#ir-items .ir-card .ir-by'], e: '🃏', h: T('Who posted it'), p: T('The round picture is who posted it: a person, a YouTube channel or a news site’s logo. The little badge on it says where: X, YouTube or an article.') },
    { at: ['#ir-items .ir-card .ir-c-x'], e: '🏷️', h: T('The little labels'), p: T('Hot: how much people are talking about it right now. Viral: more likes than usual. The coloured bar: which news sites carried it, blue left, grey centre, red right.') },
    // the Iran room's own tab (site-iu/build/news-camps.js): Liberty Politics has no such tab, so there the step is skipped
    { at: ['#ir-ltab [data-ltab="media"]'], e: '🧭', h: T('Who runs the media'), p: T('This tab lists who is behind every source: the regime and each part of it, the opposition, foreign money, the independent press. Tap one to see only what it says.') },
    { at: ['#ir-items .ir-card'], e: '👆', h: T('Open a card'), p: T('Tap any card to open it big: watch the video, read the whole post and see the comments with the most likes.') },
    { at: ['#ir-mk-b'], e: '🎬', h: T('Make a show'), p: T('This turns what you are looking at into a show: titles, cover words, a description and the best order to talk about things.') },
    { at: ['#ir-add-b'], e: '➕', h: T('Add something'), p: T('Found a good post or video that is not here? Add it, and after a quick check everyone can see it.') },
    { at: ['#ir-tour'], e: '▶️', h: T('Play'), p: T('Play shows every card big, one after another, by itself. Good for putting the room on screen during a live show.') },
    { e: '🎉', h: T('That’s the room!'), p: T('Tap Tour on the bar any time to see this again. Want to see how the show maker works too?'), end: 'room' }
  ];
  var MAKER = [
    { at: ['#ir-sm .ir-sm-bar'], e: '🎬', h: T('This is the show maker'), p: T('It already picked the strongest things from what you were looking at, and put them in a good order to talk about.') },
    { at: ['#ir-sm .ir-sm-from'], e: '🧭', h: T('Made from your choices'), p: T('This says what the show is made from. Pick another story or change a filter, and the show changes with it.') },
    { at: ['#ir-sm .ir-sm-dials'], e: '🎛️', h: T('Three choices'), p: T('Making: a live show or a video. Style: plain words or bold ones. Aim for: more clicks or more watching.') },
    { at: ['#ir-sm .ir-sm-tabs'], e: '📝', h: T('Ready-made words'), p: T('Titles, Cover text and Description give you words you can use right away. Tap the one you like best to pick it.') },
    // the plain maker (Iran Uncensored, intel-prep.js PLAIN): the creator's own title and note, and no ready-made words
    { at: ['#ir-sm .ir-sv-words'], e: '✍️', h: T('Your title and your note'), p: T('Write the show’s title and a note in your own words. Nothing here is written for you.') },
    { at: ['#ir-sm .ir-sm-tabs [data-tab="run"]'], e: '📋', h: T('The run order'), p: T('This is the list of things in the order you will talk about them, and how long the show will run.'),
      act: { label: T('Show me'), run: function () { clickEl(q('#ir-sm [data-tab="run"]')); } } },
    { at: ['#ir-sm .ir-sm-run', '#ir-sm .ir-sm-pane'], e: '↕️', h: T('Change the order'), p: T('Use the arrows to move a thing up or down, and the x to take it out. The maker keeps your changes on this device.') },
    { at: ['#ir-sm .ir-sm-acts'], e: '📺', h: T('Go live'), p: T('Open the show screen to present it full screen, one thing at a time, with the top comments. Copy the package to paste all the words anywhere.') },
    { at: ['#ir-sm .ir-sv'], e: '🔗', h: T('Save it and share it'), p: T('Save the show to get one link. Anyone who opens it can present it, read it as a page, or make their own.') },
    { at: ['#ir-sm .ir-sm-go'], e: '✅', h: T('You are ready'), p: T('Close goes back to the room. Make a show any time from the bar. Have fun!'), end: 'maker' }
  ];

  /* ------------------------------------------------------------------ the overlay */
  var ov = null, hole = null, tip = null, steps = null, at = 0, back = null, raf = 0, name = '';
  function build() {
    ov = document.createElement('div');
    ov.className = 'irt'; if (RTL) { ov.setAttribute('dir', 'rtl'); ov.setAttribute('lang', 'fa'); } ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'irt-h');
    ov.innerHTML = '<div class="irt-hole" aria-hidden="true"></div><div class="irt-tip" tabindex="-1"><div class="irt-top"><span class="irt-e" aria-hidden="true"></span><p class="irt-n"></p>' +
      '<button type="button" class="irt-x" data-t="end" aria-label="' + esc(T('Close the tour')) + '">×</button></div><h3 id="irt-h"></h3><p class="irt-p"></p><div class="irt-dots" aria-hidden="true"></div>' +
      '<div class="irt-b"><button type="button" class="irt-skip" data-t="end">' + esc(T('Skip the tour')) + '</button><span><button type="button" class="irt-back" data-t="back">' + esc(T('Back')) + '</button>' +
      '<button type="button" class="irt-act" data-t="act"></button><button type="button" class="irt-next" data-t="next">' + esc(T('Next')) + '</button></span></div></div>';
    document.body.appendChild(ov);
    hole = q('.irt-hole', ov); tip = q('.irt-tip', ov);
    /* The keys live on the overlay, so the overlay must keep the focus (24 Oct 2026): a tap on the dim page around the
       card left the focus on nothing, and Esc and the arrows stopped working. The overlay takes focus itself (tabIndex
       -1), and a tap anywhere outside the card's buttons puts it back on the card's main button. */
    ov.tabIndex = -1;
    ov.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-t]');
      if (!b) { if (steps && !tip.contains(ev.target)) focusMain(); return; }          // inside the card, the card (tabindex -1) keeps the focus itself
      var t = b.getAttribute('data-t');
      if (!steps) return;
      if (t === 'end') end();
      else if (t === 'back') back1();
      else if (t === 'next') { if (steps[at].end === 'room') { end(); return; } if (steps[at].end === 'maker') { end(); return; } go(at + 1, 1); }
      else if (t === 'act') { var s = steps[at]; if (s.end === 'room') { end(); startMaker(); return; } if (s.act) { s.act.run(); setTimeout(function () { if (steps) go(at + 1, 1); }, 120); } }          // Esc in those 120 ms ends the tour: nothing to go to
    });
    ov.addEventListener('keydown', function (ev) {
      if (!steps) return;
      if (ev.key === 'Escape') { ev.preventDefault(); end(); }
      else if (ev.key === (RTL ? 'ArrowLeft' : 'ArrowRight')) { ev.preventDefault(); q('.irt-next', ov).click(); }          // forward is the way the page reads (the buttons are mirrored on a right-to-left page)
      else if (ev.key === (RTL ? 'ArrowRight' : 'ArrowLeft')) { ev.preventDefault(); back1(); }
      else if (ev.key === 'Tab') {          // focus stays in the card
        var f = [].filter.call(tip.querySelectorAll('button'), function (b) { return !b.hidden; });
        if (!f.length) return;
        if (ev.shiftKey && document.activeElement === f[0]) { ev.preventDefault(); f[f.length - 1].focus(); }
        else if (!ev.shiftKey && document.activeElement === f[f.length - 1]) { ev.preventDefault(); f[0].focus(); }
      }
    });
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
  }
  function targets(s) {
    if (!s.at) return [];
    if (s.all) { for (var i = 0; i < s.at.length; i++) { var l = [].filter.call(document.querySelectorAll(s.at[i]), shown); if (l.length) return l; } return []; }
    var el = firstShown(s.at); return el ? [el] : [];
  }
  function usable(s) { return (!s.when || s.when()) && (!s.at || targets(s).length > 0); }
  function rectOf(els) {
    var r = null;
    els.forEach(function (el) { var b = el.getBoundingClientRect(); r = r ? { l: Math.min(r.l, b.left), t: Math.min(r.t, b.top), r: Math.max(r.r, b.right), b: Math.max(r.b, b.bottom) } : { l: b.left, t: b.top, r: b.right, b: b.bottom }; });
    return r;
  }
  // the card's main button: "Show me" where the step has one, else Next
  function focusMain() { var s = steps && steps[at], act = q('.irt-act', ov), next = q('.irt-next', ov); ((s && s.act && !s.end && !act.hidden) ? act : next).focus({ preventScroll: true }); }
  // Back, from the button or the key: only where the Back button is shown (a step behind this one can be used)
  function back1() { if (steps && !q('.irt-back', ov).hidden) go(at - 1, -1); }
  function go(i, dir) {
    while (i >= 0 && i < steps.length && !usable(steps[i])) i += dir || 1;
    if (i < 0) {          // nothing usable behind: stay where we are, or (at the start) take the first usable step ahead
      if (dir < 0 && steps[at] && usable(steps[at])) { focusMain(); return; }
      i = 0; while (i < steps.length && !usable(steps[i])) i++;
    }
    if (i >= steps.length) { end(); return; }
    at = i;
    var s = steps[at], els = targets(s);
    if (els.length) {
      var r = rectOf(els), vh = window.innerHeight;
      if (r.t < 70 || r.b > vh - 20) els[0].scrollIntoView({ block: r.b - r.t > vh * 0.6 ? 'start' : 'center', behavior: 'auto' });
    }
    var real = steps.filter(function (x) { return x.when ? true : usable(x); }), n = real.indexOf(s);          // a step that waits on "Show me" keeps its number
    q('.irt-e', ov).textContent = s.e || '';
    q('.irt-n', ov).textContent = T('{n} of {m}', { n: N(n + 1), m: N(real.length) });
    q('#irt-h', ov).textContent = s.h;
    q('.irt-p', ov).textContent = s.p;
    q('.irt-dots', ov).innerHTML = real.map(function (x, k) { return '<i' + (k === n ? ' class="on"' : '') + '></i>'; }).join('');
    var act = q('.irt-act', ov), next = q('.irt-next', ov);
    q('.irt-back', ov).hidden = n <= 0;
    q('.irt-skip', ov).hidden = !!s.end;
    if (s.end === 'room') { act.hidden = !q('#ir-mk-b'); act.textContent = T('Tour the show maker'); next.textContent = T('Done'); }
    else if (s.end === 'maker') { act.hidden = true; next.textContent = T('Done'); }
    else { act.hidden = !s.act; act.textContent = s.act ? s.act.label : ''; next.textContent = T('Next'); }
    ov.classList.toggle('is-center', !els.length);
    placeNow();
    setTimeout(placeNow, 80);          // a scroll or a "Show me" moves the page under the spotlight: measure again
    setTimeout(placeNow, 400);
    focusMain();
  }
  function place() { cancelAnimationFrame(raf); raf = requestAnimationFrame(placeNow); }          // scrolling and resizing: once a frame
  function placeNow() {
    if (!ov || !steps || ov.hidden) return;
    (function () {
      var s = steps[at], els = targets(s), vw = document.documentElement.clientWidth, vh = window.innerHeight, phone = vw < 640;
      var tw = Math.min(phone ? vw - 24 : 380, vw - 24);
      tip.style.width = tw + 'px';
      if (!els.length) {
        hole.style.display = 'none';
        tip.style.left = Math.round((vw - tw) / 2) + 'px';
        tip.style.top = Math.max(12, Math.round((vh - tip.offsetHeight) / 2)) + 'px';
        return;
      }
      var r = rectOf(els), pad = 8;
      var L = Math.max(4, r.l - pad), T = Math.max(4, r.t - pad), W = Math.min(vw - 4, r.r + pad) - L, H = Math.min(vh - 4, r.b + pad) - T;
      hole.style.display = 'block';
      hole.style.left = L + 'px'; hole.style.top = T + 'px'; hole.style.width = Math.max(0, W) + 'px'; hole.style.height = Math.max(0, H) + 'px';
      var th = tip.offsetHeight, x, y;
      if (phone) {
        x = 12;
        y = (T + H / 2 > vh / 2 && T > th + 24) || T + H + th + 24 > vh ? 12 : vh - th - 12;          // away from the spotlight
        if (y === 12 && T < th + 24 && T + H + th + 24 <= vh) y = vh - th - 12;
      } else {
        x = Math.min(Math.max(12, L), vw - tw - 12);
        y = T + H + 14 + th <= vh - 12 ? T + H + 14 : T - th - 14 >= 12 ? T - th - 14 : Math.max(12, vh - th - 12);
      }
      tip.style.left = Math.round(x) + 'px'; tip.style.top = Math.round(y) + 'px';
    })();
  }
  function start(list, nm) {
    if (!ov) build();
    if (!back) back = document.activeElement;
    steps = list; name = nm; ov.hidden = false; document.documentElement.classList.add('irt-on');
    tb.classList.remove('is-new');
    put(SEEN, '1');
    var nudge = $('irt-nudge'); if (nudge) nudge.remove();
    go(0, 1);
  }
  function end() {
    if (!ov) return;
    ov.hidden = true; steps = null; document.documentElement.classList.remove('irt-on');
    var b = back; back = null;
    if (b && b.isConnected && b.focus) b.focus({ preventScroll: true });
  }
  function startRoom() { start(ROOM, 'room'); }
  function startMaker() {
    if (!makerOpen()) clickEl($('ir-mk-b'));
    setTimeout(function () { if (makerOpen()) start(MAKER, 'maker'); }, 150);
  }

  /* ------------------------------------------------------------------ the doors */
  var ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9v.4"/><path d="M12 17.2h.01"/></svg>';
  var tb = document.createElement('button');
  tb.type = 'button'; tb.className = 'ir-cb ir-cb-tour'; tb.id = 'irt-b'; tb.setAttribute('aria-label', T('Take the tour: how the Intel Room works'));
  tb.innerHTML = ICO + '<span>' + esc(T('Tour')) + '</span>';
  tb.addEventListener('click', startRoom);
  if (!get(SEEN)) tb.classList.add('is-new');          // a first visit: the button itself is lit (a phone has no room for the nudge line above the map)
  var cmdb = q('#ir-cmd .ir-cmd-b');
  if (cmdb) cmdb.appendChild(tb);
  // the one-time nudge, above the bar, for a first visit on this device
  if (!get(SEEN) && $('ir-cmd')) {
    var nd = document.createElement('p');
    nd.className = 'irt-nudge'; nd.id = 'irt-nudge';
    nd.innerHTML = '<span aria-hidden="true">👋</span><b>' + esc(T('New here?')) + '</b> <span>' + esc(T('See how the Intel Room works in one minute.')) + '</span>' +
      '<button type="button" class="irt-go">' + esc(T('Take the tour')) + '</button><button type="button" class="irt-no" aria-label="' + esc(T('No thanks, hide this')) + '">×</button>';
    $('ir-cmd').parentNode.insertBefore(nd, $('ir-cmd'));
    q('.irt-go', nd).addEventListener('click', startRoom);
    q('.irt-no', nd).addEventListener('click', function () { put(SEEN, '1'); nd.remove(); tb.classList.remove('is-new'); });
  }
  // "How it works" at the top of the open maker: the maker redraws itself, so the line is put back after every redraw
  var sm = null;
  function howTo() {
    var body = sm && q('.ir-sm-body', sm);
    if (!body || q('.irt-how', body)) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'irt-how'; b.innerHTML = ICO + '<span>' + esc(T('How the show maker works')) + '</span>';
    b.addEventListener('click', function () { start(MAKER, 'maker'); });
    body.insertBefore(b, body.firstChild);
  }
  // the maker is built by intel-prep.js, which loads after the add-ons: wait for it (at most a minute), then follow its redraws
  var waited = 0, wt = setInterval(function () {
    sm = $('ir-sm');
    if (sm || ++waited > 120) {
      clearInterval(wt);
      if (sm && window.MutationObserver) new MutationObserver(howTo).observe(sm, { childList: true });
      howTo();
    }
  }, 500);
  window.IRoomTour = { room: startRoom, maker: startMaker, end: end, steps: function () { return { room: ROOM.length, maker: MAKER.length }; },
    at: function () { return steps ? { name: name, i: at, h: steps[at].h } : null; } };
})();
