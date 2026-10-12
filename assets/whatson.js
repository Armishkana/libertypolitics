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
    return new Intl.DateTimeFormat(locale || undefined, o).format(new Date(ms));
  }

  /* The two lines of one row: [what, when]. first is true for the row at the top of the bubble. */
  function row(p, it, words, first, locale, zone) {
    if (p.on) return [it.now, words.until.replace('{t}', clock(p.end, locale, zone))];
    if (first) return [p.mins <= 1 ? words.soon.replace('{name}', it.short) : words.in.replace('{name}', it.short).replace('{span}', span(p.mins, words)),
      words.at0.replace('{t}', clock(p.start, locale, zone))];
    return [it.name, words.at.replace('{t}', clock(p.start, locale, zone))];
  }

  var api = { parts: parts, offset: offset, at: at, plan: plan, span: span, clock: clock, row: row };
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
    try { list = plan(cfg.items, Date.now()); } catch (x) { return; }      // a browser that does not know the zone keeps the printed sentence
    var rows = box.querySelector('.calls-rows');
    for (var i = list.length - 1; i >= 0; i--) {
      var a = box.querySelector('a[data-on-row="' + list[i].id + '"]');
      if (!a) continue;
      var two = row(list[i], byId[list[i].id], words, i === 0, words.locale);
      a.querySelector('b').textContent = two[0];
      a.querySelector('small').textContent = two[1];
      a.className = 'calls-a' + (list[i].on ? ' live' : '');
      if (rows && rows.firstChild !== a) rows.insertBefore(a, rows.firstChild);      // what is on now, or next, goes on top
    }
    /* The same times where a page states them in a sentence (the About page, the footer): the visitor's own
       clock is added after the Eastern one, unless the visitor's clock IS Eastern. */
    Array.prototype.forEach.call(document.querySelectorAll('[data-on-local]'), function (el) {
      var p = list.filter(function (q) { return q.id === el.getAttribute('data-on-local'); })[0];
      if (!p || !words.local) return;
      var mine = clock(p.start, words.locale), theirs = clock(p.start, words.locale, byId[p.id].tz || 'America/New_York');
      el.textContent = mine === theirs ? '' : words.local.replace('{a}', mine).replace('{b}', clock(p.end, words.locale));
    });
  }
  /* NEVER OVER THE BUTTON THAT SENDS A POST. The bubble is fixed to the corner and the page scrolls under it, so on
     a phone the button of the box a reader writes in can come to rest behind it. While the two overlap the
     bubble steps aside (it keeps its place, so nothing jumps), and it is back as soon as the button has moved on.
     The stylesheet already takes it away while a reader types. */
  var send = document.querySelector('#fbform button[type=submit]');
  function duck() {
    if (!send) return;
    var a = box.getBoundingClientRect(), b = send.getBoundingClientRect();
    var hit = a.width > 0 && b.width > 0 && b.left < a.right + 6 && b.right > a.left - 6 && b.top < a.bottom + 6 && b.bottom > a.top - 6;
    if (hit !== (box.className.indexOf(' duck') > -1)) box.className = hit ? box.className + ' duck' : box.className.replace(' duck', '');
  }
  function redraw() { draw(); duck(); }
  redraw();
  setInterval(redraw, 30000);
  if (send) {
    window.addEventListener('scroll', duck, { passive: true });
    window.addEventListener('resize', duck);
    window.addEventListener('hashchange', function () { setTimeout(duck, 60); });
    document.addEventListener('click', function () { setTimeout(duck, 60); });
    document.addEventListener('input', function () { setTimeout(duck, 60); });
  }
  api.draw = draw;      /* for build/bubble-view.html, which shows the bubble as it is at a chosen moment */
})(this);
