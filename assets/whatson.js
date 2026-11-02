/* What is on next: the live show and the group call, in the bubble that follows a reader down every page.
   Armin, 11 October 2026: "a place that shows when the next group call is, when the next live show is ...
   When people are moving around on the website, they could see that we have discussions coming up, and
   that we have live streams coming up."
   The times live in one register per site (data/whats-on.json) as wall-clock times in U.S. Eastern, the zone
   the shows are run by. The build prints them as a true sentence in Eastern time, so with this file missing
   the bubble still says when to come. What this adds, from the visitor's own clock: what is on NOW, or how
   long until the next thing and what time that is where the visitor is. Nothing here knows or prints where
   anyone lives; the only zones are U.S. Eastern and the visitor's own.
   Intl turns an Eastern wall-clock time into an instant (the way DOOR_CLOCK in render.py does), so the day
   U.S. clocks change (1 November 2026) needs no table and no library. The same file runs on both sites: the
   words come from the page (data-words). The pure part is tested by build/whatson-test.mjs. */
(function (root) {
  'use strict';

  /* The date and time an instant has in a zone, as numbers. */
  function parts(zone, ms) {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = +x.value; });
    return p;
  }

  /* How far a zone's clock is from UTC at an instant, in milliseconds (minus four hours for Eastern in summer). */
  function offset(zone, ms) {
    var p = parts(zone, ms);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(ms / 60000) * 60000;
  }

  /* The instant a wall-clock time in a zone is. Two passes: the first guess can land on the other side of a
     clock change, and the second reads the offset that holds at the answer. */
  function at(zone, y, m, d, hh, mm) {
    var wall = Date.UTC(y, m - 1, d, hh, mm), t = wall - offset(zone, wall);
    return wall - offset(zone, t);
  }

  /* THE ONE RULE. For each thing in the register, its occurrence that matters at this instant: the one that is
     on now (start <= now < end), or else the next one to start. Returned with what is on now first, then by
     start. days are 0 (Sunday) to 6, counted in the register's own zone; an item with no days is on every day. */
  function plan(items, now) {
    var out = [];
    (items || []).forEach(function (it) {
      var s = /^(\d{1,2}):(\d{2})$/.exec(it.start || ''), e = /^(\d{1,2}):(\d{2})$/.exec(it.end || ''), zone = it.tz || 'America/New_York';
      if (!s || !e) return;
      var p = parts(zone, now), best = null;
      for (var k = -1; k <= 8 && !best; k++) {
        var day = new Date(Date.UTC(p.year, p.month - 1, p.day + k)), y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate();
        if (it.days && it.days.length && it.days.indexOf(day.getUTCDay()) < 0) continue;
        var start = at(zone, y, m, d, +s[1], +s[2]), end = at(zone, y, m, d, +e[1], +e[2]);
        if (end <= start) end = at(zone, y, m, d + 1, +e[1], +e[2]);      // a show that runs past midnight
        if (start <= now && now < end) best = { id: it.id, on: true, start: start, end: end, mins: 0 };
        else if (start > now) best = { id: it.id, on: false, start: start, end: end, mins: Math.ceil((start - now) / 60000) };
      }
      if (best) out.push(best);
    });
    return out.sort(function (a, b) { return (b.on - a.on) || (a.start - b.start); });
  }

  /* SEVERAL SHOWS, ONE ROW (13 October 2026: the channel runs five live shows a day, and a bubble with one of
     them said the next show was 17 hours off while another was live). Items that name the same row share one
     line of the bubble. For each row, the one occurrence that matters: what is on now (the latest to start, if
     two overlap), or else the next to start. An item with no row is a row of its own. Same order as plan(). */
  function rows(items, now) {
    var rowOf = {}, best = {}, out = [];
    (items || []).forEach(function (it) { rowOf[it.id] = it.row || it.id; });
    plan(items, now).forEach(function (p) {
      var r = rowOf[p.id], q = best[r];
      if (!q || (p.on && q.on && p.start > q.start)) best[r] = { id: p.id, row: r, on: p.on, start: p.start, end: p.end, mins: p.mins };
    });
    for (var r in best) if (Object.prototype.hasOwnProperty.call(best, r)) out.push(best[r]);
    return out.sort(function (a, b) { return (b.on - a.on) || (a.start - b.start); });
  }

  function num(n, words) {
    var s = String(n);
    return (words && words.digits) ? s.replace(/[0-9]/g, function (d) { return words.digits.charAt(+d); }) : s;
  }

  /* "2 h 10 min", "2 h", "35 min", in the page's words. */
  function span(mins, words) {
    var h = Math.floor(mins / 60), m = mins % 60, out = [];
    if (h) out.push(words.h.replace('{n}', num(h, words)));
    if (m || !h) out.push(words.min.replace('{n}', num(m, words)));
    return out.join(words.join || ' ');
  }

  /* The time of day of an instant on the visitor's own clock ("6:00 PM"). zone is for the test only. */
  function clock(ms, locale, zone) {
    var o = { hour: 'numeric', minute: '2-digit' };
    if (zone) o.timeZone = zone;
    // 24 Oct 2026: the Persian bubble said «ساعت ۷:۰۰ به وقت شما», morning or evening unsaid. Persian gets a 12-hour
    // clock and the part of the day as it is spoken (صبح, ظهر, عصر, شب).
    if (/^fa/i.test(locale || '')) {
      var h = +new Intl.DateTimeFormat('en-GB', zone ? { hour: 'numeric', hourCycle: 'h23', timeZone: zone } : { hour: 'numeric', hourCycle: 'h23' }).format(new Date(ms));
      o.hourCycle = 'h12';
      var t = new Intl.DateTimeFormat(locale, o).formatToParts(new Date(ms)).filter(function (p) { return p.type !== 'dayPeriod'; }).map(function (p) { return p.value; }).join('').trim();
      return t + ' ' + (h >= 5 && h < 12 ? 'صبح' : h >= 12 && h < 15 ? 'ظهر' : h >= 15 && h < 19 ? 'عصر' : 'شب');
    }
    return new Intl.DateTimeFormat(locale || undefined, o).format(new Date(ms));
  }

  /* The two lines of one row: [what, when]. first is true for the row at the top of the bubble. */
  function row(p, it, words, first, locale, zone) {
    if (p.on) return [it.now, words.until.replace('{t}', clock(p.end, locale, zone))];
    if (first) return [p.mins <= 1 ? words.soon.replace('{name}', it.short) : words.in.replace('{name}', it.short).replace('{span}', span(p.mins, words)),
      words.at0.replace('{t}', clock(p.start, locale, zone))];
    return [it.name, words.at.replace('{t}', clock(p.start, locale, zone))];
  }

  var api = { parts: parts, offset: offset, at: at, plan: plan, rows: rows, span: span, clock: clock, row: row };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LPOn = api;
  if (typeof document === 'undefined' || !root.Intl) return;

  var box = document.getElementById('calls'), cfg, words;
  try { cfg = JSON.parse(box.getAttribute('data-on')); words = JSON.parse(box.getAttribute('data-words')); } catch (x) { return; }
  if (!cfg || !cfg.items || !words) return;
  var byId = {};
  cfg.items.forEach(function (it) { byId[it.id] = it; });
  function draw() {
    var list;
    var now = Date.now(), each;
    try { list = rows(cfg.items, now); each = plan(cfg.items, now); } catch (x) { return; }      // a browser that does not know the zone keeps the printed sentence
    var lines = box.querySelector('.calls-rows');
    for (var i = list.length - 1; i >= 0; i--) {
      var a = box.querySelector('a[data-on-row="' + list[i].row + '"]');
      if (!a) continue;
      var two = row(list[i], byId[list[i].id], words, i === 0, words.locale);
      a.querySelector('b').textContent = two[0];
      a.querySelector('small').textContent = two[1];
      a.className = 'calls-a' + (list[i].on ? ' live' : '');
      if (lines && lines.firstChild !== a) lines.insertBefore(a, lines.firstChild);      // what is on now, or next, goes on top
    }
    /* The show on air right now, for the side of All discussions (community.js drawJump): a reader who came from
       YouTube is offered the show they were watching as the first thing to talk about. */
    var onAir = list.filter(function (q) { return q.on && byId[q.id] && byId[q.id].row === 'show'; })[0], was = root.LPOn.live;
    root.LPOn.live = onAir ? { id: onAir.id, the: byId[onAir.id].the || byId[onAir.id].short || '' } : null;
    if ((was && was.id) !== (onAir && onAir.id)) { try { window.dispatchEvent(new CustomEvent('lp:onnow')); } catch (x) { } }
    /* A WAY IN THAT IS TRUE AT EVERY HOUR (14 October 2026: the front page's first way in is the live chat). A link that
       carries data-on-way="<row>" holds one [data-on-say]: as the build printed it, a true sentence in U.S. Eastern.
       Here it becomes what the bubble's top row would say for that row, in one line: a show that is on reads as live
       (and the link gets the class "live"), otherwise the line says how long until the next one, on the visitor's clock. */
    Array.prototype.forEach.call(document.querySelectorAll('[data-on-way]'), function (a) {
      var p = list.filter(function (q) { return q.row === a.getAttribute('data-on-way'); })[0], say = a.querySelector('[data-on-say]');
      if (!p || !say || !byId[p.id]) return;
      say.textContent = row(p, byId[p.id], words, true, words.locale).join(words.sep || ', ');
      a.className = a.className.replace(/ live\b/g, '') + (p.on ? ' live' : '');
    });
    /* The same times where a page states them in a sentence (the About page, the footer): the visitor's own
       clock is added after the Eastern one, unless the visitor's clock IS Eastern. A row of several shows is
       stated as "from 11am", so what is added is when the first show of the day starts on the visitor's clock. */
    Array.prototype.forEach.call(document.querySelectorAll('[data-on-local]'), function (el) {
      var key = el.getAttribute('data-on-local');
      var its = cfg.items.filter(function (it) { return (it.row || it.id) === key; });
      if (!its.length) its = cfg.items.filter(function (it) { return it.id === key; });
      if (!its.length || !words.local) return;
      var first = its.slice().sort(function (x, y) { return x.start < y.start ? -1 : x.start > y.start ? 1 : 0; })[0];
      var p = each.filter(function (q) { return q.id === first.id; })[0];
      if (!p) return;
      var mine = clock(p.start, words.locale), theirs = clock(p.start, words.locale, first.tz || 'America/New_York');
      if (mine === theirs) el.textContent = '';
      else if (its.length > 1) el.textContent = words.from ? words.from.replace('{a}', mine) : '';
      else el.textContent = words.local.replace('{a}', mine).replace('{b}', clock(p.end, words.locale));
    });
  }
  /* NEVER OVER THE BUTTON THAT SENDS A POST. The bubble is fixed to the corner and the page scrolls under it, so on
     a phone the button of the box a reader writes in can come to rest behind it. While the two overlap the
     bubble steps aside (it keeps its place, so nothing jumps), and it is back as soon as the button has moved on.
     The stylesheet already takes it away while a reader types. */
  /* 24 Oct 2026 (Armin, with a picture of the Persian Intel Room: the bubble sat over the list's last cards and its "40
     more" button). The same rule now covers every button a reader needs at the bottom of a page: the send button, the
     Intel Room's "Show more" and anything marked data-keepclear. Looked up on each check, since a page draws them late. */
  /* 31 Oct 2026 (audit: the bubble lay on "Apply to come on", the ON AIR band's button, on the War Room at 1440 and the
     Missions page at 390): that button is kept clear too. Over a button the bubble first folds to its pill (below), and
     only if the pill still touches it does it step aside. */
  var KEEP = '#fbform button[type=submit], #ir-more:not([hidden]), [data-keepclear], .tband-a';
  function hits() {
    var a = box.getBoundingClientRect(), hit = false;
    if (a.width > 0) [].forEach.call(document.querySelectorAll(KEEP), function (el) {
      var b = el.getBoundingClientRect();
      if (b.width > 0 && b.left < a.right + 6 && b.right > a.left - 6 && b.top < a.bottom + 6 && b.bottom > a.top - 6) hit = true;
    });
    return hit;
  }
  /* 1 Nov 2026 (the Persian method page at 360px: the page is short, so the ON AIR band's button sits in the bubble's corner
     and even the short pill touched it by 3px, which hid the bubble from the first pixel). Before stepping aside, the pill
     rises just above whatever it touches, as long as it stays below the header; only if there is no room does it hide. */
  function rise() {
    /* It looks upward in 12px steps for the first place that touches neither a kept-clear button nor any other control
       (the live Persian method page: one fixed lift put it on the discussion's own button). Words under it are fine, as
       anywhere else it floats; a control is not. No free place between here and the header: it steps aside. */
    var a = box.getBoundingClientRect(), vh = window.innerHeight;
    var head = document.querySelector('header.top'), floor = (head ? Math.max(0, head.getBoundingClientRect().bottom) : 0) + 8;
    // 1 Nov 2026 (the Persian method and scenarios pages at 360px: the closed Menu's links, laid out off the screen inside
    // a closed <details>, were counted as controls, so the pill found no free place and hid): a control nobody can see is
    // not in the way. Closed details (all but the summary), and what the browser says is not visible.
    var unseen = function (el) { var dd = el.closest('details:not([open])'); if (dd && !el.closest('summary')) return true;
      try { return el.checkVisibility ? !el.checkVisibility({ visibilityProperty: true }) : false; } catch (e) { return false; } };
    var near = function (b, top, bot) { return b.width > 0 && b.left < a.right + 6 && b.right > a.left - 6 && b.top < bot + 6 && b.bottom > top - 6; };
    var rects = function (sel, skip) { return [].filter.call(document.querySelectorAll(sel), function (el) { return !box.contains(el) && !(skip && head && head.contains(el)) && !unseen(el); }).map(function (el) { return el.getBoundingClientRect(); }).filter(function (b) { return b.width > 0 && b.bottom > floor && b.top < vh; }); };
    var keep = rects(KEEP), ctl = rects('a[href],button,input,textarea,select,[role=button]', true);
    for (var up = 12; a.top - up >= floor; up += 12) {
      var top = a.top - up, bot = a.bottom - up, ok = true, i;
      for (i = 0; ok && i < keep.length; i++) if (near(keep[i], top, bot)) ok = false;
      for (i = 0; ok && i < ctl.length; i++) if (near(ctl[i], top, bot)) ok = false;
      if (ok) { box.style.translate = '0 ' + (-up) + 'px'; return true; }
    }
    return false;
  }
  function duck() {
    if (box.style.translate) box.style.translate = '';
    var hit = hits();
    if (pill && / calls-short\b/.test(box.className)) { pillDraw(false); hit = hits(); }      // back to the whole sentence where it fits
    if (hit && fold && !held && !folded()) { fold(true); hit = hits(); }
    if (hit && pill && folded() && !held) { pillDraw(true); hit = hits(); }      // the short form (pillDraw) before stepping aside
    if (hit && !held && rise()) hit = false;
    if (held) hit = false;     // the reader opened it with a tap: it stays where they can read it until it folds again
    if (hit !== (box.className.indexOf(' duck') > -1)) box.className = hit ? box.className + ' duck' : box.className.replace(' duck', '');
  }
  /* DOCKED ON A TOOL'S PAGE (1 November 2026). On a page that carries a tool (its How it works doors, the Intel Room, a
     simulator's board) the corner bubble sat on the tool itself: the Liberty Score's opening words at 360px, a card of the
     Tools page and the Regime Board's chart at 1280, the Conflict Simulator's side panel at 1440. A tool is the page, so
     nothing may lie on it. There the bubble docks into the header, which is always on screen (it is sticky): the
     YouTube mark carries the red live dot while a show is on, its link opens the live stream, and its name says what is
     on now or when the next show starts. The bubble keeps its place in the page (class dock), so the cross, the tests and
     the stream view still find it. Every other page keeps the bubble in the corner, and the footer leaves room under it
     (footer padding-bottom in site.css) so the end of a page is never under it. One home for the look: CSS below. */
  var TOOL_PAGE = '.lpt-doors, #ir, #wargame, #scenarios, #uprising';
  root.LPOn.toolPage = TOOL_PAGE;      // the one list of what makes a page a tool's page (build/phone-test.html reads it here)
  var yt = document.querySelector('header.top a.yt'), docked = !!(yt && document.querySelector(TOOL_PAGE));
  if (docked) {
    box.className += ' dock';
    var ytHref = yt.getAttribute('href'), ytName = yt.getAttribute('aria-label') || '';
    if (!document.getElementById('calls-dock-css')) {
      var st = document.createElement('style'); st.id = 'calls-dock-css';
      st.textContent = '.calls.dock{display:none!important}header.top a.yt{position:relative}' +
        /* the dot sits on the YouTube mark's corner, wherever the mark is (31 Oct 2026: pinned to the link's end, it lay on
           the "e" of "Watch live" at 1440). It is a flex item placed right after the mark (the words move after it), pulled
           back onto the mark by its margins, which also give back its width and one gap: nothing beside it moves. */
        'header.top a.yt.calls-live>span{order:1}' +
        'header.top a.yt.calls-live::after{content:"";flex:none;width:10px;height:10px;margin-inline:-15px -3px;transform:translateY(-10px);border-radius:50%;background:#C8102E;box-shadow:0 0 0 2px #0A0A0A,0 0 0 5px rgba(200,16,46,.35)}';
      (document.head || document.documentElement).appendChild(st);
    }
  }
  function dock() {
    if (!docked) return;
    var top = box.querySelector('.calls-a'), live = box.querySelector('.calls-a.live');
    if (!top) return;
    var say = [top.querySelector('b'), top.querySelector('small')].map(function (x) { return x ? x.textContent.trim() : ''; }).filter(Boolean).join(', ');
    yt.className = yt.className.replace(/ calls-live\b/g, '') + (live ? ' calls-live' : '');
    yt.setAttribute('href', live ? live.getAttribute('href') : ytHref);
    yt.setAttribute('aria-label', live ? say : ytName);
    yt.setAttribute('title', say);
  }
  /* THE BUBBLE FOLDS TO A PILL (31 October 2026; audit at 1440 and 390: the whole bubble lay on right-hand buttons and, on a
     phone, on headings). It is still on screen from the first pixel (14 October) and says its whole sentence; after 8
     seconds with no finger, pointer or keyboard on it, it folds into a small pill in the same corner: red, "Live", while a
     show is on, otherwise the time to the next one. A tap on the pill opens the sentence again, and it folds again 8 seconds
     after it is left. Folded once, it opens folded on the reader's next page of the visit. The cross still puts it away for
     the visit (site.js). Nothing of the page is hidden; only the bubble changes size. One home for its look: the CSS here. */
  var fold = null, held = false, foldT = 0, pill = null, FOLD_MS = 8000;
  function folded() { return / fold\b/.test(' ' + box.className); }
  if (!docked) {
    if (!document.getElementById('calls-fold-css')) {
      var fs = document.createElement('style'); fs.id = 'calls-fold-css';
      fs.textContent = '.calls-pill{display:none}' +
        '.calls.fold{border-radius:999px}.calls.fold .calls-rows,.calls.fold .calls-x{display:none}' +
        '.calls.fold .calls-pill{display:inline-flex;align-items:center;gap:8px;min-height:44px;min-width:44px;margin:0;padding:0 16px 0 14px;border:0;border-radius:999px;background:transparent;color:var(--field);font:800 .8125rem/1 var(--body);letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;cursor:pointer}' +
        ':lang(fa) .calls-pill{letter-spacing:0}.calls.calls-short .calls-pill{letter-spacing:0;text-transform:none}' +
        '.calls-pill i{flex:none;width:10px;height:10px;box-sizing:border-box;border-radius:50%;border:2px solid currentColor}' +
        '.calls.fold.is-live{background:#C8102E;border-color:#C8102E}.calls.fold.is-live .calls-pill{color:#fff}' +
        '.calls.fold.is-live .calls-pill i{border:0;background:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.3)}' +
        '.calls-pill:focus-visible{outline:3px solid var(--field);outline-offset:3px}';
      (document.head || document.documentElement).appendChild(fs);
    }
    pill = document.createElement('button');
    pill.type = 'button'; pill.className = 'calls-pill'; pill.setAttribute('aria-expanded', 'false');
    pill.innerHTML = '<i aria-hidden="true"></i><span></span>';
    box.insertBefore(pill, box.firstChild);
    fold = function (on) {
      clearTimeout(foldT); foldT = 0;
      if (on === folded()) return;
      box.className = on ? box.className + ' fold' : box.className.replace(/ fold\b/g, '');
      pill.setAttribute('aria-expanded', on ? 'false' : 'true');
    };
    var later = function () {
      clearTimeout(foldT);
      foldT = setTimeout(function () {
        foldT = 0;
        if (box.matches && box.matches(':hover, :focus-within')) return later();
        held = false; fold(true);
        try { sessionStorage.setItem('lp-calls-fold', '1'); } catch (x) { }
        duck();
      }, FOLD_MS);
    };
    pill.addEventListener('click', function () {
      held = true; fold(false); duck();
      var a = box.querySelector('.calls-a');
      if (a) a.focus({ preventScroll: true });
      later();
    });
    box.addEventListener('pointerleave', function () { if (!folded()) later(); });
    box.addEventListener('focusout', function () { if (!folded()) later(); });
    var was = false;
    try { was = sessionStorage.getItem('lp-calls-fold') === '1'; } catch (x) { }
    if (was) fold(true); else later();
  }
  /* What the pill says: Live while a show is on, otherwise how long until the next one; its name for a screen reader is the
     bubble's top row. */
  /* SHORT FORM (1 November 2026, phone test at 375x740): folded, "Live in 5 h 59 min" was wide enough to touch the front
     page's Apply to come on, so the bubble hid and left the first screen. Where the pill would touch a button it first
     says only the time, in plain case ("5 h 59 min"), and hides only if even that still touches. Its name for a screen
     reader keeps the whole sentence. */
  function pillDraw(short) {
    if (!pill) return;
    var top = box.querySelector('.calls-a'), live = !!box.querySelector('.calls-a.live'), say = '';
    var fa = /^fa/i.test(words.locale || '');
    try { var p = rows(cfg.items, Date.now())[0]; if (p && !p.on && p.mins > 1) say = short ? (fa ? span(p.mins, words) + ' دیگه' : span(p.mins, words)) : (fa ? 'زنده، ' + span(p.mins, words) + ' دیگه' : 'Live in ' + span(p.mins, words)); } catch (x) { }
    if (live || !say) { say = fa ? 'زنده' : 'Live'; short = false; }
    pill.querySelector('span').textContent = say;
    box.className = box.className.replace(/ is-live\b/g, '').replace(/ calls-short\b/g, '') + (live ? ' is-live' : '') + (short ? ' calls-short' : '');
    if (top) pill.setAttribute('aria-label', [top.querySelector('b'), top.querySelector('small')].map(function (x) { return x ? x.textContent.trim() : ''; }).filter(Boolean).join(', '));
  }
  function redraw() { draw(); dock(); pillDraw(); duck(); }
  redraw();
  setInterval(redraw, 30000);
  var dk = 0, soon = function () { if (!dk) dk = setTimeout(function () { dk = 0; duck(); }, 60); };
  window.addEventListener('scroll', soon, { passive: true });
  window.addEventListener('resize', soon);
  window.addEventListener('hashchange', soon);
  document.addEventListener('click', soon);
  document.addEventListener('input', soon);
  api.draw = draw;      /* for build/bubble-view.html, which shows the bubble as it is at a chosen moment */
})(this);
