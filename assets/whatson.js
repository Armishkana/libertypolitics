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
  var KEEP = '#fbform button[type=submit], #ir-more:not([hidden]), [data-keepclear]';
  function duck() {
    var a = box.getBoundingClientRect(), hit = false;
    if (a.width > 0) [].forEach.call(document.querySelectorAll(KEEP), function (el) {
      var b = el.getBoundingClientRect();
      if (b.width > 0 && b.left < a.right + 6 && b.right > a.left - 6 && b.top < a.bottom + 6 && b.bottom > a.top - 6) hit = true;
    });
    if (hit !== (box.className.indexOf(' duck') > -1)) box.className = hit ? box.className + ' duck' : box.className.replace(' duck', '');
  }
  function redraw() { draw(); duck(); }
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
