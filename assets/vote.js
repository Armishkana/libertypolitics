/* How to vote (build/vote.py; on iranuncensored.com, ../../site-iu/build/vote.py): what a date means TODAY.
   The pages state every deadline as a fact ("Register online by Monday, October 19") and never as a count of
   days, so a page built last week is still true this week. With this file missing nothing is lost. What it
   adds, from the visitor's own clock:
     - a chip beside each date: "in 8 days", "tomorrow", "today", "passed" (for a day something begins: "has started");
     - on a state's page, a first line saying what is still open today;
     - on the one line that offers the guide from another page, the next date that has not passed;
     - the state pickers of the guide.
   "Today" is counted in the STATE's time zone, not the visitor's: a deadline in Texas runs out at midnight in
   Texas, so a Texan reading this in Tokyo on the morning of the 20th still has the evening of the 19th, and
   one reading it in Honolulu late on the 19th does not. The instant comes from the visitor's clock; Intl says
   what day that instant is in the state (the way the job page's clock works, DOOR_CLOCK in render.py). A
   browser without that falls back to the visitor's own date.
   The words come from the page (data-words), so the Persian pages of the Iran site run this same file.
   Nothing here is added to community.js or discussion.js. The pure part is tested by build/vote-test.mjs. */
(function (root) {
  'use strict';

  /* The calendar day, as 2026-10-19, that an instant falls on in a time zone. */
  function dayIn(zone, ms) {
    try {
      var p = {};
      new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
      if (/^\d{4}$/.test(p.year) && p.month && p.day) return p.year + '-' + p.month + '-' + p.day;
    } catch (x) { /* an old browser, or a zone it does not know: the visitor's own date, below */ }
    var d = new Date(ms), two = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
  }

  /* Whole days from one date to another, both written 2026-10-19. NaN when either is not a date. */
  function days(from, to) {
    var a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from || ''), b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to || '');
    if (!a || !b) return NaN;
    return Math.round((Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3])) / 86400000);
  }

  /* THE ONE RULE. What a date is, seen from today: null for no date (a fact that could not be confirmed
     carries none, and gets no chip), or {k, n}: k is 'in' (n days, two or more), 'tomorrow', 'today', and once
     the day is behind us 'passed', or 'started' for a day something begins on (kind 'start'). */
  function chip(date, today, kind) {
    var n = days(today, date);
    if (isNaN(n)) return null;
    if (n > 1) return { k: 'in', n: n };
    if (n === 1) return { k: 'tomorrow', n: 1 };
    if (n === 0) return { k: 'today', n: 0 };
    return { k: kind === 'start' ? 'started' : 'passed', n: n };
  }

  /* The chip in the page's own words. digits is the ten digits of the page's language, or nothing. */
  function say(c, words) {
    if (!c || !words || !words[c.k]) return '';
    var n = String(c.n);
    if (words.digits) n = n.replace(/[0-9]/g, function (d) { return words.digits.charAt(+d); });
    return words[c.k].replace('{n}', n);
  }

  /* Of a list of [date, phrase], the first whose date has not passed. null when every one has. */
  function next(list, today) {
    for (var i = 0; i < (list || []).length; i++) if (days(today, list[i][0]) >= 0) return list[i];
    return null;
  }

  var api = { dayIn: dayIn, days: days, chip: chip, say: say, next: next };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LPVote = api;
  if (typeof document === 'undefined') return;

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function wordsOf(el) { try { return JSON.parse(el.getAttribute('data-words') || '{}'); } catch (x) { return {}; } }

  each(document.querySelectorAll('[data-vg]'), function (box) {
    var words = wordsOf(box), today = dayIn(box.getAttribute('data-zone') || 'America/New_York', Date.now());
    /* a chip beside each date */
    each(box.querySelectorAll('time.vg-d[datetime]'), function (t) {
      var c = chip(t.getAttribute('datetime'), today, t.getAttribute('data-kind') || ''), text = say(c, words);
      if (!text) return;
      var s = document.createElement('span');
      s.className = 'vg-chip' + (c.k === 'passed' ? ' gone' : (c.k === 'today' || c.k === 'tomorrow') ? ' now' : '');
      s.textContent = text;
      /* The full stop or comma that ends the date's sentence stays with the date, and the chip comes after it:
         "by Monday, October 5. [passed]", never "October 5 [passed] ." */
      var after = t.nextSibling;
      if (after && after.nodeType === 3 && /^[.,;:\u060C\u061B]/.test(after.nodeValue)) after = after.splitText(1);
      t.parentNode.insertBefore(s, after);
      t.parentNode.insertBefore(document.createTextNode(' '), s);
      if (after && after.nodeType === 3 && after.nodeValue && !/^\s/.test(after.nodeValue)) t.parentNode.insertBefore(document.createTextNode(' '), after);
    });
    /* the first line of a state's page: what has not passed. Each thing a voter can do carries the last day
       for it (data-to) and its own words (data-open, data-note); the line lists the ones still open. */
    var line = box.querySelector('[data-vg-open]');
    if (line && words.open) {
      var open = [];
      each(box.querySelectorAll('[data-open][data-to]'), function (el) {
        if (days(today, el.getAttribute('data-to')) >= 0) open.push(el.getAttribute('data-open') + (el.getAttribute('data-note') ? ' (' + el.getAttribute('data-note') + ')' : ''));
      });
      line.textContent = open.length ? words.open + ' ' + open.join(words.sep || ', ') + (words.stop || '.') : (words.none || '');
      line.hidden = !line.textContent;
    }
    /* the one line that offers the guide from another page: the next date that has not passed */
    each(box.querySelectorAll('[data-vg-next]'), function (el) {
      var list = [];
      try { list = JSON.parse(el.getAttribute('data-vg-next') || '[]'); } catch (x) { list = []; }
      var hit = next(list, today), c = hit && chip(hit[0], today), text = say(c, words);
      if (hit && text && words.next) el.textContent = words.next + ' ' + hit[1] + ' (' + text + ')' + (words.stop || '.');
    });
  });

  /* the state pickers of the guide: a choice opens that state's page, and the picker is empty again on the way back */
  var picks = document.querySelectorAll('select[data-vg-go]');
  each(picks, function (s) { s.addEventListener('change', function () { if (s.value) location.href = s.value; }); });
  if (picks.length) window.addEventListener('pageshow', function () { each(picks, function (s) { s.selectedIndex = 0; }); });
})(this);
