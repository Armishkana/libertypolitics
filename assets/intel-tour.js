/* THE TOURS of the Intel Room (libertypolitics.com/intel/, iranuncensored.com/<lang>/news/), an add-on intel.js loads from
   data-addons once the room is ready. The same file on both sites.

   Armin, 23 October 2026: "there needs to be a 'Take a Tour' or something similar for each part of the Intel room ... even
   if they're 5 years old." And 24 October 2026: "As we add more features, the tours need to be updated on both of the
   websites... Significantly improve the tour in general so that people can understand how to use it, and also make it so
   that the tour keeps getting updated."

   THREE SHORT TOURS, one per screen, each a list of STEPS. A step points at a real control (a spotlight cut out of a dim
   screen), says in one or two short sentences what it does for you, and may offer "Show me", which does it for you. A step
   whose control is not on the page right now is skipped, never pointed at empty space.
     room   ask in plain words (Show me asks for you) and what it understood, the lenses, Trending (Show me taps the
            hottest story), the wire, Topic / Region / Filters with the ready-made views, the map, a card, who runs the
            media (Iran), Forces, your lists, Make a show, Add, Play; it ends on a first useful thing to do: a ready-made
            view, or the show maker's tour
     maker  the show maker, part by part (opened from the room tour's end, or "How the show maker works" in the maker)
     show   the show screen (intel/?show=, Persian صفحهٔ اجرا): the topic and its pencil, moving through the show, the item,
            which story, who covered it, the top comments, the tools ("Tour" among the show screen's own tools)
   DOORS. "Tour" on the room's bar (lit on a first visit, and when something new arrived since the visitor's last tour), a
   one-time line above the bar on a computer, the room tour's last step, "How the show maker works" in the open maker, and
   "Tour" on the show screen. Nothing ever starts by itself, and the show screen (which may be on air) never lights up.
   WHAT IS NEW. V is the tours' version. A visitor who took an older tour (ir-tour-seen holds its version; the first tour
   wrote '1') gets "New in the Intel Room": the Tour button lit, and on a computer one line above the bar, both opening
   only the steps whose v is newer than theirs. Bump V and mark the new or changed steps with v when the room changes.

   IT KEEPS UP WITH THE ROOM (24 October 2026). A tour nobody checks goes stale in silence, so:
     - The words about filters are read from the room's own registers (IRoom.presets, IRoom.facets): a new ready-made view
       or filter is named in the tour the day it is registered.
     - AUDIT (IRoomTour.audit(scope)): SURF lists where the room's major controls live (the bar, the filters panel, the
       list's tabs, the maker, the show screen's bar, stage and tools). Every control found there must be covered by a step
       (its covers) or be in SKIP with the reason it is not toured; and every step's control must exist on the site it is
       for. build/phone-test.html and site-iu/build/phone-test.html (part tour) run the audit on the built pages and walk
       every tour (IRoomTour.walk) at 360px and 1280px, and deploy.py publishes nothing while either fails. So a new control
       without a tour step, or a step whose control was renamed away, stops the publish of both sites.
   It never hides content and animates it back (CLAUDE.md, phone rules): the spotlight and the card simply appear.
   KEYS. Right arrow or Enter: next (left arrow on a right-to-left page). Esc: close. Focus stays in the tour card, and the
   keys never reach the room or the show screen underneath while the tour is open.
   PHONE. The card sits at the bottom of the screen (at the top when the spotlight is low), every button at least 44 px.
   WORDS. Every sentence goes through T(), the room's own table (CFG.t, from site-iu/data/news-words.json): on Liberty
   Politics there is no CFG and T() gives back the English as written; the Iran page's English says its own version of a
   step where that room differs ("en"), its Persian is spoken Persian ("fa"), and news.py t_keys() reads this file, so the
   Persian build stops while a sentence here has no Persian. A key is always a literal, never built with +. */
(function () {
  var R = window.IRoom, root = document.getElementById('ir');
  if (!R || !root || document.getElementById('irt-b')) return;
  var V = 2, SEEN = 'ir-tour-seen';
  var CFG = (function () { var el = document.getElementById('ir-cfg'); if (!el) return {}; try { var c = JSON.parse(el.textContent); return c && typeof c === 'object' ? c : {}; } catch (e) { return {}; } })();
  var SITE = document.getElementById('ir-cfg') ? 'iu' : 'lp';
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
  function seenV() { var s = get(SEEN); return s ? (parseInt(s, 10) || 1) : 0; }          // the first tour wrote '1'
  function list(a) { return a.filter(Boolean).join(T(', ')); }
  function presets() { return (R.presets || []).filter(function (p) { return p && p.name; }); }
  function facets() { var f = R.facets || {}; return Object.keys(f).map(function (k) { return f[k] && f[k].name; }).filter(Boolean); }
  // Show me on the ask box: the room is asked one of its own "things to try", the way a visitor types it
  function askExample() {
    var form = $('ir-ask'), box = $('ir-q'); if (!form || !box) return;
    box.value = T('viral videos about Iran from today');
    box.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    try { box.blur(); } catch (e) { }
  }
  function tryPreset() { var p = presets()[0]; if (p && R.preset) R.preset(p.key); }

  /* ------------------------------------------------------------------ the steps
     k       the step's own name (the walk reports it; covers and SKIP use the same names as SURF's keys)
     at      where it points: the first selector with a control on the screen (all: every control of the first that has any)
     when    it waits for a "Show me" before it: it keeps its number, and is skipped when its control did not appear
     opt     its control is legitimately absent at times (a story picked, an item with replies): the audit does not ask for it
     site    its control exists on one site only ('lp' or 'iu'): absent there, it is simply skipped
     v       the tours' version that added or changed it (WHAT IS NEW)
     covers  the controls (SURF keys) it explains: a control in SURF with no step and no SKIP fails the audit
     act     "Show me": does it for you, then goes on; acts on a last step: the buttons that end it (up to two) */
  var ROOM = [
    { k: 'hello', e: '👋', h: T('Welcome to the Intel Room'), p: T('It finds the news, videos and posts the world is talking about right now, and helps you turn them into a show. This tour takes about a minute.') },
    { k: 'ask', at: ['#ir-ask'], v: 2, e: '💬', h: T('Just ask'), p: T('Type what you want in plain words, like viral videos about Iran this week. The room sets the filters for you. You can also ask what is trending, or tap the microphone and say it.'),
      act: { label: T('Show me'), run: askExample }, covers: ['ir-ask', 'ir-q', 'ir-mic', '.ir-go', 'ira-pop'] },
    { k: 'asked', at: ['#ira'], when: function () { return shown($('ira')); }, opt: true, v: 2, e: '✅', h: T('Here is what it understood'),
      p: T('Each chip is one filter: tap its x to drop it. Save this filter keeps the set. Next time, tap the empty search box and your saved filters are there.'), covers: ['ira'] },
    { k: 'lens', at: ['#ir-lens'], e: '🕐', h: T('Pick what to look at'), p: T('Last 24 hours is today. The Bank is older things I kept. From readers is what people sent in. The number is how many things are in each.'), covers: ['lens=*', 'ir-time'] },
    { k: 'hot', at: ['#ir-hotrow'], e: '🔥', h: T('The hottest stories'), p: T('Each button is one story people are talking about. The first number says how hot it is (100 is the hottest). The last number says how many things you can look at.'),
      act: { label: T('Show me'), run: function () {          // the ask step's own demo is undone first (its Undo), so the story opens on the whole room
        var u = q('#ira [data-ira="undo"]'); if (u && shown(u)) { u.click(); setTimeout(function () { clickEl(firstShown(['#ir-hots .ir-hs'])); }, 120); } else clickEl(firstShown(['#ir-hots .ir-hs']));
      } }, covers: ['ir-hotrow'] },
    { k: 'story', at: ['#ir-pills'], when: storyOn, opt: true, e: '📌', h: T('Now you see only that story'), p: T('Posts on X, articles and videos about it, all in one place: enough for a whole show. Tap the x next to its name to see everything again.'), covers: ['ir-pills'] },
    { k: 'wire', at: ['#ir-wire'], v: 2, e: '📰', h: T('The wire'), p: T('The newest headlines roll past here. Put your finger on it to stop it. Tap a headline to jump to its story, then Back to your view brings your filters back.'), covers: ['ir-wire'] },
    { k: 'filters', at: ['#ir-cmd [data-open]'], all: true, v: 2, e: '🗂️', h: T('Topic, Region and Filters'),
      p: function () {
        var pr = presets().map(function (x) { return x.name; }), fc = facets();
        return (pr.length ? T('Topic picks a subject and Region a part of the world. Filters starts with one-tap views: {list}.', { list: list(pr) }) : T('Topic picks a subject and Region a part of the world. Filters keeps only what you want.')) +
          (fc.length ? ' ' + T('Also in Filters: {facets}.', { facets: list(fc) }) : '');
      },
      covers: ['open=*', 'ir-drawer', 'ir-dr-pre', 'ir-dr-topic', 'ir-topics', 'ir-dr-region', 'ir-fx', 'in:ir-pf', 'ir-pf', 'in:ir-kind', 'ir-kind', 'ir-f-*',
        'in:ir-within', 'ir-within', 'ir-heat', 'ir-likes', 'ir-viral', 'ir-cred', 'in:ir-save', 'in:ir-pics', 'ir-pics', 'ir-views'] },
    { k: 'map', at: ['#ir-mapbox'], e: '🌍', h: T('The map'), p: T('Each circle is a place where things are happening. A bigger circle means more. Tap a circle to see what happened there. Lines join places in the same story.'),
      covers: ['ir-main', 'ir-mapbox', 'ir-zoom', 'z=*', 'ir-lk', 'ir-proj', 'ltab=links'] },
    { k: 'labels', at: ['#ir-items .ir-card .ir-c-x', '#ir-items .ir-card .ir-by'], e: '🏷️', h: T('On each card'), p: T('The round picture is who posted it, and its badge says where. Hot means people are talking about it now. Viral means more likes than usual.') },
    { k: 'card', at: ['#ir-items .ir-card'], v: 2, e: '👆', h: T('Open a card'), p: T('Tap a card to open it big: the video, the whole post, the top comments and which outlets covered it. The bookmark beside it saves it to a list.'), covers: ['ltab=items'] },
    // the Iran room's own doors (site-iu/build/news-camps.js): Liberty Politics has neither, so there the step is skipped
    { k: 'media', at: ['#ir-ltab [data-ltab="media"]', '#iuc-cb'], site: 'iu', e: '🧭', h: T('Who runs the media'), p: T('This tab lists who is behind every source: the regime and each part of it, the opposition, foreign money, the independent press. Tap one to see only what it says.'), covers: ['iuc-cb', 'ltab=media'] },
    { k: 'forces', at: ['#ir-ltab [data-ltab="forces"]'], v: 2, e: '⚓', h: T('Forces'), p: T('Military bases and warships, on the map and in this tab. Tap one to see its own news and where it is now. The shield on the map shows or hides them.'), covers: ['ltab=forces', 'irf-z'] },
    { k: 'lists', at: ['#ir-ls-b'], v: 2, e: '🔖', h: T('Your lists'), p: T('Everything you save with the bookmark lands here. Put it in order, send a list to anyone by WhatsApp, Telegram, X or email, or make a show from it.'), covers: ['ir-ls-b'] },
    { k: 'make', at: ['#ir-mk-b'], e: '🎬', h: T('Make a show'), p: T('This turns what you are looking at into a show: titles, cover words, a description and the best order to talk about things.'), covers: ['ir-mk-b', 'ir-sm'] },
    { k: 'add', at: ['#ir-add-b'], e: '➕', h: T('Add something'), p: T('Found a good post or video that is not here? Add it, and after a quick check everyone can see it.'), covers: ['ir-add-b'] },
    { k: 'play', at: ['#ir-tour'], e: '▶️', h: T('Play'), p: T('Play shows every card big, one after another, by itself. Good for putting the room on screen during a live show.'), covers: ['ir-tour'] },
    { k: 'end', v: 2, e: '🎉', h: T('Now try it'), p: T('Ask the search box for anything, or start with a ready-made view. Tap Tour on the bar to see this again.'), end: 'room',
      acts: [{ label: function () { var p = presets()[0]; return p ? T('Try {name}', { name: p.name }) : ''; }, run: tryPreset, main: true },
        { label: T('Tour the show maker'), run: function () { startMaker(); }, when: function () { return !!$('ir-mk-b'); } }] }
  ];
  var MAKER = [
    { k: 'mk-bar', at: ['#ir-sm .ir-sm-bar'], e: '🎬', h: T('This is the show maker'), p: T('It already picked the strongest things from what you were looking at, and put them in a good order to talk about.') },
    { k: 'mk-from', at: ['#ir-sm .ir-sm-from'], e: '🧭', h: T('Made from your choices'), p: T('This says what the show is made from. Pick another story or change a filter, and the show changes with it.'), covers: ['.ir-sm-from'] },
    { k: 'mk-dials', at: ['#ir-sm .ir-sm-dials'], site: 'lp', e: '🎛️', h: T('Three choices'), p: T('Making: a live show or a video. Style: plain words or bold ones. Aim for: more clicks or more watching.'), covers: ['.ir-sm-dials'] },
    { k: 'mk-tabs', at: ['#ir-sm .ir-sm-tabs'], site: 'lp', e: '📝', h: T('Ready-made words'), p: T('Titles, Cover text and Description give you words you can use right away. Tap the one you like best to pick it.'), covers: ['.ir-sm-tabs', 'tab=*', '.ir-sm-pane'] },
    // the plain maker (Iran Uncensored, intel-prep.js PLAIN): the creator's own title and note, and no ready-made words
    { k: 'mk-words', at: ['#ir-sm .ir-sv-words'], site: 'iu', e: '✍️', h: T('Your title and your note'), p: T('Write the show’s title and a note in your own words. Nothing here is written for you.'), covers: ['.ir-sv-words', '.ir-sv-f'] },
    { k: 'mk-run', at: ['#ir-sm .ir-sm-tabs [data-tab="run"]'], opt: true, e: '📋', h: T('The run order'), p: T('This is the list of things in the order you will talk about them, and how long the show will run.'),
      act: { label: T('Show me'), run: function () { clickEl(q('#ir-sm [data-tab="run"]')); } } },
    { k: 'mk-order', at: ['#ir-sm .ir-sm-run', '#ir-sm .ir-sm-pane'], e: '↕️', h: T('Change the order'), p: T('Use the arrows to move a thing up or down, and the x to take it out. The maker keeps your changes on this device.'), covers: ['.ir-sm-run'] },
    { k: 'mk-acts', at: ['#ir-sm .ir-sm-acts'], e: '📺', h: T('Go live'), p: T('Open the show screen to present it full screen, one thing at a time, with the top comments. Copy the package to paste all the words anywhere.'), covers: ['.ir-sm-acts', '.ir-sm-show', '.ir-sm-copy'] },
    { k: 'mk-save', at: ['#ir-sm .ir-sv'], e: '🔗', h: T('Save it and share it'), p: T('Save the show to get one link. Anyone who opens it can present it, read it as a page, or make their own.'), covers: ['.ir-sv'] },
    { k: 'mk-end', at: ['#ir-sm .ir-sm-go'], v: 2, e: '✅', h: T('You are ready'), p: T('Close goes back to the room. On the show screen, the question mark up top shows how to run it.'), end: 'maker' }
  ];
  function itemOn() { return !!$('ir-sh-frame'); }
  var SHOW = [
    { k: 'sh-hello', v: 2, e: '📺', h: T('This is the show screen'), p: T('It shows your show full screen, one thing at a time, for you and everyone watching. Here is how to run it.') },
    { k: 'sh-topic', at: ['#ir-sh-topic'], v: 2, e: '🏷️', h: T('What the show is about'), p: T('Anyone who tunes in halfway sees the topic here. Tap the pencil to put it in your own words.'), covers: ['ir-sh-topic', '.ir-sh-bar'] },
    { k: 'sh-move', at: ['#ir-sh .ir-sh-foot'], v: 2, e: '⏭️', h: T('Move through the show'), p: T('Use the arrows, the arrow keys or a clicker. Tap any item in the rundown to jump to it. The count up top says where you are.'),
      act: { label: T('Show me'), run: function () { clickEl($('ir-sh-next')); } }, covers: ['.ir-sh-foot', 'ir-sh-prev', 'ir-sh-next', 'ir-sh-strip', 'ir-sh-count'] },
    { k: 'sh-item', at: ['#ir-sh-frame'], when: itemOn, v: 2, e: '🖼️', h: T('The thing itself'), p: T('The video, picture or post, as big as the screen allows. Tap a picture to see it full size. Save keeps it in one of your lists.'),
      covers: ['ir-sh-stage', 'ir-sh-frame', 'ir-sh-info', '.ir-sh-acts', 'ir-sh-wb', '.ir-sh-who', 'ir-sh-fit', '.ir-sh-meta', '.ir-sh-src', '.ir-svb', '.ir-ref'] },
    { k: 'sh-story', at: ['#ir-sh-stage .ir-sh-story'], when: itemOn, opt: true, v: 2, e: '📌', h: T('Which story'), p: T('When a show tells more than one story, this line says which story this item belongs to.'), covers: ['.ir-sh-story', '.ir-sh-role'] },
    { k: 'sh-cover', at: ['#ir-sh-stage .ir-sh-cov'], when: itemOn, opt: true, v: 2, e: '⚖️', h: T('Who covered it'), p: T('Which outlets carried it, from left to right. It shows only when enough rated outlets did, and says so when one side stayed silent.'), covers: ['.ir-sh-cov'] },
    { k: 'sh-replies', at: ['#ir-sh-rpb'], when: itemOn, opt: true, v: 2, e: '💬', h: T('Top comments'), p: T('Put the most-liked replies on the screen. They close by themselves when you move to the next item.'), covers: ['ir-sh-rpb', 'ir-sh-rp', 'ir-sh-rbig'] },
    { k: 'sh-tools', at: ['#ir-sh .ir-sh-tools'], v: 2, e: '🧰', h: T('Your tools'), p: T('Read it as a page, your host notes, full screen, and Make your own. A saved show also has Send.'),
      covers: ['ir-sh-mode', 'ir-sh-notes', 'ir-sh-pad', 'ir-sh-full', 'ir-sh-send', 'ir-sh-mk', 'irt-sh', '.ir-sh-tools'] },
    { k: 'sh-end', v: 2, e: '✅', h: T('You are ready to go live'), p: T('Tap the question mark up top any time to see this again.'), end: 'show' }
  ];
  // what is new since an older tour: the room's steps with a newer v, between a hello and a goodbye of their own
  function newsList(since) {
    var fresh = ROOM.filter(function (s) { return (s.v || 1) > since && !s.end; });
    return [{ k: 'new-hello', e: '✨', h: T('New in the Intel Room'), p: T('A few things changed since your last visit. Here they are, one at a time.') }].concat(fresh).concat([
      { k: 'new-end', e: '🎉', h: T('That is everything new'), p: T('Tap Tour on the bar any time for the whole tour.'), end: 'news',
        acts: [{ label: T('See the whole tour'), run: function () { startRoom(); } }] }]);
  }

  /* ------------------------------------------------------------------ the register the audit reads (IT KEEPS UP)
     SURF: where each screen's major controls live, and how each is named (keyOf): its id, else data-open / data-tab /
     data-ltab / data-lens / data-z / data-preset as "open=topic", else its first class as ".ir-sm-from"; a filters
     panel section by the first id inside it ("in:ir-pf"). A name in covers or SKIP ending in * covers every name it starts. */
  var SURF = {
    room: ['#ir > *', '#ir-cmd button', '#ir-cmd a', '#ir-drawer .ir-dr-s', '#ir-drawer [role="group"][id]', '#ir-drawer .ir-tools > [id]', '#ir-ltab [data-ltab]', '.ir-list-t > *', '#ir-zoom > *'],
    maker: ['#ir-sm .ir-sm-body > *', '#ir-sm .ir-sm-tabs [data-tab]', '#ir-sm .ir-sm-acts > *'],
    show: ['#ir-sh > *', '#ir-sh .ir-sh-bar > *', '#ir-sh .ir-sh-tools > *', '#ir-sh .ir-sh-foot > *', '#ir-sh-stage > *', '#ir-sh-stage .ir-sh-info > *', '#ir-sh-stage .ir-sh-acts > *']
  };
  // what is deliberately not toured, and why (reasons in lower case: they are notes, never shown)
  var SKIP = {
    '.ir-brand': 'the room name and clock, shown on full screen only', 'ir-cmd': 'the bar: its controls are toured one by one', 'ir-said': 'a line for screen readers', 'ir-board': 'counts of what is in view',
    'ir-livenote': 'where the last 24 hours come from, read under the map', '.ir-about': 'reading under the room', '.ir-grow': 'reading under the room',
    'ir-sug': 'team members only', '.ir-foot': 'the footer line', 'irt-nudge': 'the tour offer itself', 'irt-b': 'the tour door itself', 'ir-copy': 'a creator tool named by its own label',
    '.ir-sel': 'the order menu says what it does', 'ir-stream': 'full screen, said by its own label', 'ir-save': 'save this filter: the ask step says it',
    '.irt-how': 'the tour door itself', 'ir-brief': 'the quick brief says what it does on its own button', '.ir-sm-pk': 'the package text the copy button copies',
    '.ir-sh-bg': 'the ground behind the show', '.ir-sh-brand': 'the way back to the room', 'ir-sh-clock': 'the clock', '.ir-sh-mark': 'the site mark',
    '.ir-sh-n': 'like and view counts', '.ir-sh-why': 'why it is hot', '.ir-sh-also': 'who else carried it', '.ir-sh-open': 'the opening card of a show', '.ir-sh-card': 'a show with nothing in it', '.ir-sh-pp': 'a picture beside the words'
  };
  var DATA = ['data-open', 'data-tab', 'data-ltab', 'data-lens', 'data-z', 'data-preset'];
  function keyOf(el, sel) {
    if (el.id) return el.id;
    if (/\.ir-dr-s$/.test(sel)) { var f = el.querySelector('[id]'); if (f) return 'in:' + f.id; }
    for (var i = 0; i < DATA.length; i++) if (el.hasAttribute(DATA[i])) return DATA[i].slice(5) + '=' + el.getAttribute(DATA[i]);
    var c = String(el.getAttribute('class') || '').split(/\s+/)[0];
    return c ? '.' + c : el.tagName.toLowerCase();
  }
  function named(names, k) { return names.some(function (n) { return n === k || (n.slice(-1) === '*' && k.indexOf(n.slice(0, -1)) === 0); }); }
  function audit(scope) {
    var steps = scope === 'maker' ? MAKER : scope === 'show' ? SHOW : ROOM, missing = [], loose = [], seen = {};
    var covered = Object.keys(SKIP);
    steps.forEach(function (s) { covered = covered.concat(s.covers || []); });
    steps.forEach(function (s) {
      if (!s.at || s.opt || (s.site && s.site !== SITE)) return;
      if (!s.at.some(function (sel) { return document.querySelector(sel); })) missing.push(s.k + ' (' + s.at.join(' | ') + ')');
    });
    (SURF[scope] || []).forEach(function (sel) {
      [].forEach.call(document.querySelectorAll(sel), function (el) {
        if (el.tagName === 'SCRIPT' || el.tagName === 'TEMPLATE' || el.tagName === 'NOSCRIPT') return;
        var k = keyOf(el, sel);
        if (seen[k]) return; seen[k] = 1;
        if (!named(covered, k)) loose.push(k);
      });
    });
    return { site: SITE, scope: scope, missing: missing, loose: loose, controls: Object.keys(seen).length };
  }

  /* ------------------------------------------------------------------ the overlay */
  var ov = null, hole = null, tip = null, steps = null, at = 0, back = null, raf = 0, name = '';
  function build() {
    ov = document.createElement('div');
    ov.className = 'irt ir-keep';          // ir-keep: the show screen hides every other child of body (intel.css)
    if (RTL) { ov.setAttribute('dir', 'rtl'); ov.setAttribute('lang', 'fa'); }
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'irt-h');
    ov.innerHTML = '<div class="irt-hole" aria-hidden="true"></div><div class="irt-tip" tabindex="-1"><div class="irt-top"><span class="irt-e" aria-hidden="true"></span><p class="irt-n"></p>' +
      '<button type="button" class="irt-x" data-t="end" aria-label="' + esc(T('Close the tour')) + '">×</button></div><h3 id="irt-h"></h3><p class="irt-p"></p><div class="irt-dots" aria-hidden="true"></div>' +
      '<div class="irt-b"><button type="button" class="irt-skip" data-t="end">' + esc(T('Skip the tour')) + '</button><span><button type="button" class="irt-back" data-t="back">' + esc(T('Back')) + '</button>' +
      '<button type="button" class="irt-act" data-t="act" data-i="0"></button><button type="button" class="irt-act irt-act2" data-t="act" data-i="1"></button><button type="button" class="irt-next" data-t="next">' + esc(T('Next')) + '</button></span></div></div>';
    document.body.appendChild(ov);
    hole = q('.irt-hole', ov); tip = q('.irt-tip', ov);
    /* The keys live on the overlay, so the overlay must keep the focus (24 Oct 2026): a tap on the dim page around the
       card left the focus on nothing, and Esc and the arrows stopped working. */
    ov.tabIndex = -1;
    ov.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-t]');
      if (!b) { if (steps && !tip.contains(ev.target)) focusMain(); return; }
      var t = b.getAttribute('data-t');
      if (!steps) return;
      var s = steps[at];
      if (t === 'end') end();
      else if (t === 'back') back1();
      else if (t === 'next') { if (s.end) { end(); return; } go(at + 1, 1); }
      else if (t === 'act') {
        if (s.end) { var a = (s.acts || [])[+b.getAttribute('data-i')]; end(); if (a) a.run(); return; }
        if (s.act) { s.act.run(); setTimeout(function () { if (steps) go(at + 1, 1); }, 160); }          // Esc in those ms ends the tour: nothing to go to
      }
    });
    ov.addEventListener('keydown', function (ev) {
      if (!steps) return;
      ev.stopPropagation();          // the room's and the show screen's own keys (arrows move the show) wait while the tour talks
      if (ev.key === 'Escape') { ev.preventDefault(); end(); }
      else if (ev.key === (RTL ? 'ArrowLeft' : 'ArrowRight')) { ev.preventDefault(); q('.irt-next', ov).click(); }          // forward is the way the page reads
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
    if (!s.at || (s.site && s.site !== SITE)) return [];
    if (s.all) { for (var i = 0; i < s.at.length; i++) { var l = [].filter.call(document.querySelectorAll(s.at[i]), shown); if (l.length) return l; } return []; }
    var el = firstShown(s.at); return el ? [el] : [];
  }
  function usable(s) { return (!s.site || s.site === SITE) && (!s.when || s.when()) && (!s.at || targets(s).length > 0); }
  function rectOf(els) {
    var r = null;
    els.forEach(function (el) { var b = el.getBoundingClientRect(); r = r ? { l: Math.min(r.l, b.left), t: Math.min(r.t, b.top), r: Math.max(r.r, b.right), b: Math.max(r.b, b.bottom) } : { l: b.left, t: b.top, r: b.right, b: b.bottom }; });
    return r;
  }
  function words(x) { return typeof x === 'function' ? x() : x; }
  function actsOf(s) { return (s.acts || []).filter(function (a) { return (!a.when || a.when()) && words(a.label); }); }
  // the card's main button: "Show me", or a last step's first offer, else Next
  function focusMain() {
    var s = steps && steps[at], act = q('.irt-act[data-i="0"]', ov), next = q('.irt-next', ov);
    ((s && !act.hidden && (s.act || (s.end && actsOf(s).length && actsOf(s)[0].main))) ? act : next).focus({ preventScroll: true });
  }
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
    var real = steps.filter(function (x) { return x === s || usable(x) || (x.when && !x.opt && (!x.site || x.site === SITE)); });          // a step that waits on "Show me" keeps its number
    var n = real.indexOf(s);
    q('.irt-e', ov).textContent = s.e || '';
    q('.irt-n', ov).textContent = T('{n} of {m}', { n: N(n + 1), m: N(real.length) });
    q('#irt-h', ov).textContent = s.h;
    q('.irt-p', ov).textContent = words(s.p);
    q('.irt-dots', ov).innerHTML = real.map(function (x, k) { return '<i' + (k === n ? ' class="on"' : '') + '></i>'; }).join('');
    var a0 = q('.irt-act[data-i="0"]', ov), a1 = q('.irt-act[data-i="1"]', ov), next = q('.irt-next', ov);
    q('.irt-back', ov).hidden = n <= 0;
    q('.irt-skip', ov).hidden = !!s.end;
    a1.hidden = true;
    var A = s.end ? actsOf(s) : [];
    tip.classList.toggle('has-main', !!(A[0] && A[0].main));          // the first useful thing to do is the filled button, Done the plain one
    if (s.end) {
      a0.hidden = !A[0]; a0.textContent = A[0] ? words(A[0].label) : '';
      a1.hidden = !A[1]; a1.textContent = A[1] ? words(A[1].label) : '';
      next.textContent = T('Done');
    } else { a0.hidden = !s.act; a0.textContent = s.act ? s.act.label : ''; next.textContent = T('Next'); }
    ov.classList.toggle('is-center', !els.length);
    placeNow();
    setTimeout(placeNow, 80);          // a scroll or a "Show me" moves the page under the spotlight: measure again
    setTimeout(placeNow, 400);
    focusMain();
  }
  function place() { cancelAnimationFrame(raf); raf = requestAnimationFrame(placeNow); }          // scrolling and resizing: once a frame
  function placeNow() {
    if (!ov || !steps || ov.hidden) return;
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
    var L = Math.max(4, r.l - pad), Tp = Math.max(4, r.t - pad), W = Math.min(vw - 4, r.r + pad) - L, H = Math.min(vh - 4, r.b + pad) - Tp;
    hole.style.display = 'block';
    hole.style.left = L + 'px'; hole.style.top = Tp + 'px'; hole.style.width = Math.max(0, W) + 'px'; hole.style.height = Math.max(0, H) + 'px';
    var th = tip.offsetHeight, x, y;
    if (phone) {
      x = 12;
      y = (Tp + H / 2 > vh / 2 && Tp > th + 24) || Tp + H + th + 24 > vh ? 12 : vh - th - 12;          // away from the spotlight
      if (y === 12 && Tp < th + 24 && Tp + H + th + 24 <= vh) y = vh - th - 12;
    } else {
      x = Math.min(Math.max(12, RTL ? L + W - tw : L), vw - tw - 12);
      y = Tp + H + 14 + th <= vh - 12 ? Tp + H + 14 : Tp - th - 14 >= 12 ? Tp - th - 14 : Math.max(12, vh - th - 12);
    }
    tip.style.left = Math.round(x) + 'px'; tip.style.top = Math.round(y) + 'px';
  }
  function start(list, nm) {
    if (!ov) build();
    if (!back) back = document.activeElement;
    steps = list; name = nm; ov.hidden = false; document.documentElement.classList.add('irt-on');
    if (nm !== 'show') {          // the show screen's tour says nothing about what is new in the room
      tb.classList.remove('is-new');
      put(SEEN, String(V));
      var nudge = $('irt-nudge'); if (nudge) nudge.remove();
    }
    go(0, 1);
  }
  function end() {
    if (!ov) return;
    ov.hidden = true; steps = null; document.documentElement.classList.remove('irt-on');
    var b = back; back = null;
    if (b && b.isConnected && b.focus) b.focus({ preventScroll: true });
  }
  function startRoom() { start(ROOM, 'room'); }
  function startNews() { start(newsList(sv0 > 0 && sv0 < V ? sv0 : seenV()), 'news'); }          // what was new when the page opened, even once the tour has been taken
  function startMaker() {          // the maker draws itself a moment after it opens: wait for its parts (at most 4 s)
    if (!makerOpen()) clickEl($('ir-mk-b'));
    var n = 0, t = setInterval(function () { if ((makerOpen() && q('#ir-sm .ir-sm-acts, #ir-sm .ir-sv')) || ++n > 40) { clearInterval(t); if (makerOpen()) start(MAKER, 'maker'); } }, 100);
  }
  function startShow() {
    if (!$('ir-sh')) return;
    if (!itemOn() && $('ir-sh-next')) clickEl($('ir-sh-next'));          // from the opening card to the first item, so every part is there
    setTimeout(function () { start(SHOW, 'show'); }, 150);
  }
  // the Tour button: a visitor who took an older tour gets what is new, everyone else the whole room
  function door() { var v = seenV(); if (v > 0 && v < V && newsList(v).length > 2) startNews(); else startRoom(); }

  /* ------------------------------------------------------------------ the walk (the phone tests: IRoomTour.walk)
     Takes a tour from its first step to its last the way a visitor does (Show me where a step has one, else Next) and
     measures every card as it is drawn: inside the screen, words at least 12px, buttons at least 40px, the spotlight on
     its control. Resolves { seen: [step names], bad: [problems] }. */
  function walk(nm, wait) {
    wait = wait || 450;
    return new Promise(function (done) {
      var seenK = [], bad = [], guard = 0;
      ({ room: startRoom, maker: startMaker, show: startShow, news: startNews })[nm]();
      var w0 = 0;
      function first() { if (steps) setTimeout(look, wait); else if (++w0 > 50) look(); else setTimeout(first, 100); }          // the maker and the show screen take a moment to open
      function look() {
        if (!steps || ++guard > 40) { if (steps) { bad.push('the ' + nm + ' tour did not end after 40 steps'); end(); } done({ seen: seenK, bad: bad }); return; }
        var s = steps[at], vw = document.documentElement.clientWidth, vh = window.innerHeight, r = tip.getBoundingClientRect();
        seenK.push(s.k);
        if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) bad.push(s.k + ': the card runs off the screen (' + Math.round(r.left) + ',' + Math.round(r.top) + ' to ' + Math.round(r.right) + ',' + Math.round(r.bottom) + ' in ' + vw + 'x' + vh + ')');
        [].forEach.call(tip.querySelectorAll('h3, p, button'), function (el) {
          if (!shown(el)) return;
          if (el.textContent.trim() && parseFloat(getComputedStyle(el).fontSize) < 12) bad.push(s.k + ': words under 12px (' + el.className + ')');
          if (el.tagName === 'BUTTON' && el.getBoundingClientRect().height < 40) bad.push(s.k + ': a button under 40px (' + el.className + ')');
        });
        if (!words(s.p) || /undefined|NaN|\{\w+\}/.test(words(s.p) + s.h)) bad.push(s.k + ': its words are missing or unfilled');
        var els = targets(s);
        if (els.length) {
          var h = hole.getBoundingClientRect(), t = els[0].getBoundingClientRect();
          if (!(h.right > t.left && h.left < t.right && h.bottom > t.top && h.top < t.bottom)) bad.push(s.k + ': the spotlight is not on its control');
        }
        var a0 = q('.irt-act[data-i="0"]', ov);
        (s.act && !a0.hidden ? a0 : q('.irt-next', ov)).click();
        setTimeout(look, wait);
      }
      setTimeout(first, 100);
    });
  }

  /* ------------------------------------------------------------------ the doors */
  var ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9v.4"/><path d="M12 17.2h.01"/></svg>';
  var tb = document.createElement('button');
  tb.type = 'button'; tb.className = 'ir-cb ir-cb-tour'; tb.id = 'irt-b'; tb.setAttribute('aria-label', T('Take the tour: how the Intel Room works'));
  tb.innerHTML = ICO + '<span>' + esc(T('Tour')) + '</span>';
  tb.addEventListener('click', door);
  var sv0 = seenV(), fresh0 = sv0 > 0 && sv0 < V && newsList(sv0).length > 2;
  if (!sv0 || fresh0) tb.classList.add('is-new');          // lit: a first visit, or something new since the last tour (a phone has no room for the line above the map)
  var cmdb = q('#ir-cmd .ir-cmd-b');
  if (cmdb) cmdb.appendChild(tb);
  // the one line above the bar, on a computer: a first visit, or what is new since an older tour
  if ((!sv0 || fresh0) && $('ir-cmd')) {
    var nd = document.createElement('p');
    nd.className = 'irt-nudge'; nd.id = 'irt-nudge';
    nd.innerHTML = !sv0
      ? '<span aria-hidden="true">👋</span><b>' + esc(T('New here?')) + '</b> <span>' + esc(T('See how the Intel Room works in one minute.')) + '</span><button type="button" class="irt-go">' + esc(T('Take the tour')) + '</button>'
      : '<span aria-hidden="true">✨</span><b>' + esc(T('New in the Intel Room')) + '</b> <span>' + esc(T('Just ask in plain words, ready-made views, lists you can send, and a tour of the show screen.')) + '</span><button type="button" class="irt-go">' + esc(T('See what is new')) + '</button>';
    nd.innerHTML += '<button type="button" class="irt-no" aria-label="' + esc(T('No thanks, hide this')) + '">×</button>';
    $('ir-cmd').parentNode.insertBefore(nd, $('ir-cmd'));
    q('.irt-go', nd).addEventListener('click', door);
    q('.irt-no', nd).addEventListener('click', function () { put(SEEN, String(V)); nd.remove(); tb.classList.remove('is-new'); });
  }
  // "How the show maker works" at the top of the open maker: the maker redraws itself, so the line is put back after every redraw
  var sm = null;
  function howTo() {
    var body = sm && q('.ir-sm-body', sm);
    if (!body || q('.irt-how', body)) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'irt-how'; b.innerHTML = ICO + '<span>' + esc(T('How the show maker works')) + '</span>';
    b.addEventListener('click', function () { start(MAKER, 'maker'); });
    body.insertBefore(b, body.firstChild);
  }
  // "Tour" among the show screen's own tools (never lit: the show screen may be on air)
  function showDoor() {
    var tools = q('#ir-sh .ir-sh-tools');
    if (!tools || $('irt-sh')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'irt-sh'; b.title = T('How the show screen works'); b.setAttribute('aria-label', T('How the show screen works'));
    b.innerHTML = ICO;          // its icon alone at every width (its name is the tooltip): the topic keeps the bar's width
    b.addEventListener('click', startShow);
    tools.insertBefore(b, $('ir-sh-mk') || null);
  }
  // the maker and the show screen are built by intel-prep.js, which loads after the add-ons: wait for them (at most a minute)
  var waited = 0, wt = setInterval(function () {
    sm = sm || $('ir-sm');
    if ($('ir-sh')) showDoor();
    if ((sm && ($('ir-sh') || waited > 20)) || ++waited > 120) {
      clearInterval(wt);
      if (sm && window.MutationObserver) new MutationObserver(howTo).observe(sm, { childList: true });
      howTo(); showDoor();
    }
  }, 500);
  window.IRoomTour = { room: startRoom, maker: startMaker, show: startShow, news: startNews, end: end, version: V, site: SITE,
    steps: function () { return { room: ROOM.length, maker: MAKER.length, show: SHOW.length, news: Math.max(0, newsList(seenV() || V).length - 2) }; },
    required: function (nm) { var l = nm === 'maker' ? MAKER : nm === 'show' ? SHOW : ROOM; return l.filter(function (s) { return !s.opt && !s.when && (!s.site || s.site === SITE); }).map(function (s) { return s.k; }); },
    at: function () { return steps ? { name: name, i: at, k: steps[at].k, h: steps[at].h } : null; },
    audit: audit, walk: walk };
})();
