/* The Intel Room's creator tools and its show screen (intel/). Loaded by intel.js once the room is ready; everything it
   knows about an item comes from intel.js through window.IRoom.

   WHO MEETS IT. People who do not make shows must never meet any of this (Armin, 16 October 2026: "If they come there and
   see that this seems to be a tool for content creators ... they're going to get confused"), so it sits behind one quiet
   switch, off by default, and turning it on needs an account (users/{uid}.creator is set to true: that is how creators are
   found).

   WHAT IT DOES (rebuilt 17 October 2026, see "the show maker" below). The room's own filters, which everyone has, decide
   what is in the show; the switch adds one bar that turns what is left into a show: titles, cover text, descriptions, the
   intro, the run order and the show screen.

   THE SHOW SCREEN is the same page with ?show= in the address: the room steps aside and one item fills the screen, with
   previous and next, what is next, a counter, the intro card first and libertypolitics.com/intel always on it. Made for
   a 1920x1080 screen share and for a phone. The maker hands it its picks: t (title), c (cover text, the intro card's
   kicker), i (the intro or hook for the host's notes). */
(function () {
  'use strict';
  var R = window.IRoom, root = document.getElementById('ir');
  if (!R || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } return v; }
  var SITE_MARK = 'libertypolitics.com/intel';
  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4M10 9l4 2-4 2z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    notes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h4"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6l-6 6 6 6M4 12h16"/></svg>',
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-7 1-9.5z"/></svg>',
    redo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>'
  };

  /* ---------------------------------------------------------------- what an item is */
  // The type a creator picks: a text post, an image, a video, an article (a document counts as an article here).
  function typeOf(it) { var k = R.kind(it); return it.k === 'image' ? 'image' : k === 'doc' ? 'article' : k; }
  function likes(it) { var r = R.reach(it); return r && r.likes != null ? r.likes : (it.lk != null ? it.lk : null); }

  /* ---------------------------------------------------------------- the show maker
     Armin, 17 October 2026, after the first version dropped a wall of text on the page: "Whatever filter I use (time,
     topic, geography, country, whatever), those remaining things that are left over based on every filter that I have on
     should be able to turn that into a show ... It will give me a title, a description, and small text that I could use
     either in a banner or under the cover ... multiple titles, multiple short texts, and multiple descriptions that I could
     choose from ... Should the text be more engaging or more descriptive? ... whether I want the highest engagement or the
     highest clicks." So there is no second set of filters here any more: the room's own filters (for everyone) decide what
     is in the show, and this is one quiet bar under them that opens a compact maker: three dials, four tabs, a handful of
     one-line options to pick from, and the show screen.

     THE WORDS. For a hot story, data/show-words.json (build/intel_words.py, written for the hottest stories each hour) has
     agency-grade titles, cover lines, descriptions, an intro and a hook in three styles and two aims. When the show is mostly
     one such story, those are used. Otherwise (a mix of stories, the bank, a reader's finds) the words are built here from
     what the items measurably are: the named people and countries in their headlines, the story names, the counts, the
     outlets and the hours. Never a claim the items do not carry: every fact in a show is one of its linked items. */
  var ROLE = { report: 'The report', own: 'In their own words', clip: 'The clip', reaction: 'Reaction', more: 'More on it', other: 'The other side, or the silence',
    proof: 'Background, from the bank', related: 'Related', rank: '' };
  var PACKS = null;
  var KEY = 'ir-creator', MAXN = 25;
  var TONES = [['plain', 'Descriptive'], ['mid', 'Balanced'], ['bold', 'Engaging']], AIMS = [['clicks', 'Clicks'], ['watch', 'Watch time']], KINDS2 = [['live', 'Live show'], ['video', 'Video']];
  var st = store(KEY);
  if (!st || typeof st !== 'object') st = {};
  st = { on: st.on === true, kind: st.kind === 'video' ? 'video' : 'live', tone: ['plain', 'mid', 'bold'].indexOf(st.tone) >= 0 ? st.tone : 'mid', aim: st.aim === 'watch' ? 'watch' : 'clicks' };
  function save() { store(KEY, st); }
  var ui = { open: false, tab: 'titles', pick: { titles: '', covers: '', descs: '' }, page: { titles: 0, covers: 0, descs: 0 }, sig: '', pack: null, set: [] };

  // Named people, groups and places, most specific first. FOE: the stance's adversaries, the only names a "losing
  // control?" style question is ever asked about.
  var ENT = [
    ['Khamenei', 'KHAMENEI', /\bkhamenei\b/i, 1], ['the IRGC', 'IRGC', /\birgc\b|revolutionary guards?/i, 1], ['Pezeshkian', 'PEZESHKIAN', /\bpezeshkian\b/i, 1],
    ['Araghchi', 'ARAGHCHI', /\baraghchi\b/i, 1], ['Hezbollah', 'HEZBOLLAH', /\bhezbollah\b/i, 1], ['Hamas', 'HAMAS', /\bhamas\b/i, 1], ['the Houthis', 'HOUTHIS', /\bhouthis?\b/i, 1],
    ['Netanyahu', 'NETANYAHU', /\bnetanyahu\b/i, 0], ['Trump', 'TRUMP', /\btrump\b/i, 0], ['Rubio', 'RUBIO', /\brubio\b/i, 0], ['Vance', 'VANCE', /\bvance\b/i, 0],
    ['Hegseth', 'HEGSETH', /\bhegseth\b/i, 0], ['Putin', 'PUTIN', /\bputin\b/i, 0], ['Erdogan', 'ERDOGAN', /\berdo[gğ]an\b/i, 0], ['Pahlavi', 'PAHLAVI', /\bpahlavi\b/i, 0],
    ['the Strait of Hormuz', 'HORMUZ', /\bhormuz\b/i, 0, 1], ['the West Bank', 'WEST BANK', /west bank/i, 0, 1], ['Gaza', 'GAZA', /\bgaza\b/i, 0, 1], ['Iran', 'IRAN', /\biran\w*|\btehran\b|islamic republic/i, 0],
    ['Israel', 'ISRAEL', /\bisrael\w*|\bidf\b/i, 0], ['Lebanon', 'LEBANON', /\bleban\w*/i, 0], ['Syria', 'SYRIA', /\bsyria\w*/i, 0], ['Yemen', 'YEMEN', /\byemen\w*/i, 0],
    ['Qatar', 'QATAR', /\bqatar\w*/i, 0], ['the UN', 'UN', /\bU\.N\.|\bUN\b|United Nations|UNRWA/, 0], ['China', 'CHINA', /\bchin(a|ese)\b/i, 0], ['Russia', 'RUSSIA', /\brussia\w*/i, 0],
    ['Europe', 'EUROPE', /\beurope\w*/i, 0], ['the US', 'USA', /\bU\.S\.|\bUSA?\b|White House|Pentagon|\bAmerica\b/, 0]
  ];
  var SMALL = /^(a|an|and|as|at|but|by|for|in|of|on|or|the|to|vs|via|with|from|into|over)$/i;
  function titleCase(t) {
    var ws = String(t).split(' ');
    return ws.map(function (w, i) {
      if (/[A-Z].*[A-Z]/.test(w) || /\d/.test(w)) return w;          // IRGC, U.S., 2026, PLAYING stay as written
      if (i && SMALL.test(w) && !/[:?!.]$/.test(ws[i - 1])) return w.toLowerCase();          // "Iran: The Part", never "Iran: the Part"
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }
  function noDash(t) { return String(t).replace(/\s*[–—]\s*/g, ', ').replace(/\s+-\s+/g, ', '); }
  // A headline as a title: no "LIVE:" or outlet tail, no dashes, cut at a clause when long, title case.
  function headline(it) {
    var t = String(it.t || '').replace(/\s+/g, ' ').trim();
    t = t.replace(/^(LIVE|WATCH|BREAKING|TRENDING|JUST IN|NEW)\b[!:|\s-]*/i, '');
    t = t.replace(/\s+[|–—-]\s+[^|–—-]{2,40}$/, '').replace(/[.!]+$/, '');
    t = t.replace(/^['"\u2018\u201c]+/, '').replace(/['"\u2019\u201d]+$/, '');          // a quote that is the whole headline: the words, not the marks
    t = noDash(t);
    return titleCase(clip(t, 70));
  }
  function clip(t, n) {
    t = String(t).trim();
    if (t.length <= n) return t;
    var rx = /[:,;]\s|\s(as|after|while|amid|but|over)\s/g, m, at = -1;
    while ((m = rx.exec(t))) if (m.index >= 24 && m.index <= n) at = m.index;
    if (at > 0) return t.slice(0, at).replace(/[\s,:;]+$/, '');
    return t.slice(0, n).replace(/\s+\S*$/, '').replace(/[\s,:;]+$/, '');
  }
  function listOf(xs) { xs = xs.filter(Boolean); return xs.length < 2 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }
  function words(n) { return String(n).split(/\s+/).filter(Boolean).length; }
  function bare(name) { return name.replace(/^the /, ''); }
  function cap1(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // What the set measurably is.
  function analyse(set) {
    var n = set.length, by = {}, ents = {}, outlets = {}, kinds = { video: 0, post: 0, article: 0, image: 0 }, views = 0, maxLike = 0, t0 = Infinity, t1 = 0;
    set.forEach(function (it, i) {
      var h = R.storyOf ? R.storyOf(it) : null;
      if (h) { (by[h.id] = by[h.id] || { h: h, n: 0 }).n++; }
      var r = R.reach(it) || {}, lk = R.likes ? R.likes(it) : likes(it);
      var w = 1 + (it.hot || 0) / 50 + (lk ? Math.log(1 + lk) / Math.LN10 / 2 : 0) + (i < 3 ? 0.5 : 0);
      var txt = (it.t || '') + ' ' + (it.n || '');
      ENT.forEach(function (e) { if (e[2].test(txt)) ents[e[0]] = (ents[e[0]] || 0) + w; });
      var o = it.h || it.nm || ''; if (o) outlets[o] = (outlets[o] || 0) + w;
      kinds[typeOf(it)] = (kinds[typeOf(it)] || 0) + 1;
      if (r.views) views += r.views;
      if (lk && lk > maxLike) maxLike = lk;
      var ms = Date.parse(it.d || ''); if (!isNaN(ms)) { t0 = Math.min(t0, ms); t1 = Math.max(t1, ms); }
    });
    var stories = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.n - a.n || b.h.score - a.h.score; });
    var dom = stories.length && stories[0].n / n >= 0.5 ? stories[0].h : null;
    // the story's own title (one event, worded once for the whole group) names its subject better than any one headline
    if (dom && dom.title) ENT.forEach(function (e) { if (e[2].test(dom.title)) ents[e[0]] = (ents[e[0]] || 0) + 3; });
    var E = Object.keys(ents).sort(function (a, b) { return ents[b] - ents[a]; });
    // a story is about the first name its own title gives, most specific first (the IRGC before Iran)
    if (dom && dom.title) { var first = ENT.filter(function (e) { return e[2].test(dom.title); })[0]; if (first) E = [first[0]].concat(E.filter(function (e) { return e !== first[0]; })); }
    // a person and their own country are one subject: Khamenei with Iran, Netanyahu with Israel
    var PAIR = { Khamenei: 'Iran', 'the IRGC': 'Iran', Pezeshkian: 'Iran', Araghchi: 'Iran', Netanyahu: 'Israel', Trump: 'the US', Rubio: 'the US', Vance: 'the US', Hegseth: 'the US', Putin: 'Russia' };
    E = E.filter(function (e) { return !E.some(function (p) { return PAIR[p] === e && E.indexOf(p) < E.indexOf(e); }); });
    var O = Object.keys(outlets).sort(function (a, b) { return outlets[b] - outlets[a]; });
    var span = t1 && t0 < Infinity ? (Date.now() - t0) / 3600000 : null, era;
    if (span != null && span <= 30) era = 'today';
    else if (span != null && span <= 24 * 8) era = 'this week';
    else if (span != null && t0 >= Date.parse('2023-10-07')) era = 'since October 7';
    else era = '';
    return { n: n, dom: dom, stories: stories.map(function (s) { return s.h; }), E: E, foe: function (e) { return ENT.some(function (x) { return x[0] === e && x[3]; }); },
      actor: function (e) { return !!e && ENT.some(function (x) { return x[0] === e && !x[4]; }); },
      short: function (e) { var x = ENT.filter(function (y) { return y[0] === e; })[0]; return x ? x[1] : String(e).toUpperCase(); },
      O: O, kinds: kinds, views: views, maxLike: maxLike, era: era, lead: set[0], H: headline(dom && dom.title ? { t: dom.title } : set[0]) };
  }

  // The room's own words, when there is no written set for the show (a mix of stories, the bank, readers' finds).
  function roomWords(A) {
    var live = st.kind === 'live', N = A.n, V = A.kinds.video || 0, E1 = A.E[0], E2 = A.E[1], E3 = A.E[2];
    var single = !!A.dom || A.stories.length <= 1 || N <= 2;
    var name = A.dom && A.dom.w && A.dom.w.name ? A.dom.w.name : E1 ? cap1(E1) : clip(A.H, 40);
    var names = A.stories.filter(function (h) { return h.w && h.w.name; }).slice(0, 3).map(function (h) { return h.w.name; });
    if (names.length < 2) names = A.E.slice(0, 3).map(cap1);
    if (names.length < 2) single = true;
    var vs = A.actor(E1) && A.actor(E2), foe = E1 && A.foe(E1), when = A.era === 'today' ? 'Today' : A.era === 'this week' ? 'This Week' : '';
    var T = [];
    function t(tone, aim, s) { if (s && s.indexOf('undefined') < 0) T.push({ t: noDash(s), tone: tone, aim: aim }); }
    if (single) {
      t('plain', 'clicks', A.H);
      t('plain', 'clicks', E1 && E2 ? titleCase(cap1(E1) + ' and ' + E2 + ': The Latest, Source by Source') : titleCase(name + ': The Latest'));
      if (A.H.length <= 50) t('plain', 'watch', A.H + (live ? ': Live Breakdown' : ': What We Know'));
      t('plain', 'watch', titleCase(name + ': Every Source in One Place'));
      t('mid', 'clicks', vs ? cap1(E1) + ' vs ' + cap1(E2) + ': What Just Happened' : titleCase(name + ': What Just Happened'));
      t('mid', 'clicks', titleCase(name + ' Is Bigger Than It Looks'));
      t('mid', 'watch', V >= 3 ? titleCase(name + ', Explained in ' + V + ' Clips') : titleCase(name + ': The Full Story, in Order'));
      t('mid', 'watch', 'What ' + titleCase(name) + ' Really Means for ' + (A.actor(E2) ? cap1(E2) : 'the Region'));
      t('bold', 'clicks', foe ? 'Is ' + cap1(E1) + ' Losing Control?' : 'Nobody Is Talking About This ' + titleCase(bare(name)) + ' Story');
      t('bold', 'clicks', live ? A.short(E1 || name) + '?! Live Reaction' : 'Watch This Before You Believe the Headlines');
      t('bold', 'watch', 'The ' + titleCase(bare(name)) + ' Story They Are Not Showing You');
      t('bold', 'watch', titleCase(name) + ': The Part Nobody Is Telling You');
    } else {
      t('plain', 'clicks', titleCase(listOf(names)) + ': ' + (when ? when + '\'s' : 'The') + ' Biggest Stories');
      t('plain', 'clicks', titleCase(listOf(names.slice(0, 2))) + (when ? ': ' + when + ' in ' + N + ' Sources' : ': ' + N + ' Sources'));
      t('plain', 'watch', N + ' Stories You Need to Know: ' + titleCase(names[0]) + ' and More');
      t('plain', 'watch', titleCase(names[0]) + ', ' + titleCase(names[1] || '') + ' and Everything Else, Explained');
      t('mid', 'clicks', E1 && E2 && E3 ? cap1(E1) + ', ' + E2 + ' and ' + E3 + ': Everything That Happened' + (when ? ' ' + when : '') : '');
      t('mid', 'clicks', titleCase(names[0]) + ' Is Only the Start');
      t('mid', 'watch', titleCase(names[0]) + ', ' + titleCase(names[1] || '') + ' and What Comes Next');
      t('mid', 'watch', 'How ' + titleCase(names[0]) + ' and ' + titleCase(names[1] || '') + ' Connect');
      t('bold', 'clicks', foe ? cap1(E1) + ' Just Had a Very Bad ' + (A.era === 'today' ? 'Day' : 'Week') + '?' : 'The ' + N + ' Stories Everyone Is Fighting About');
      t('bold', 'clicks', live ? 'LIVE: ' + titleCase(names[0]) + ', ' + titleCase(names[1] || '') + ' and Your Questions' : 'Watch These ' + N + ' Clips Before You Pick a Side');
      t('bold', 'watch', 'What the Media Will Not Connect: ' + titleCase(names[0]) + ' and ' + titleCase(names[1] || ''));
      t('bold', 'watch', 'The Real Story Behind ' + titleCase(listOf(names.slice(0, 2))));
    }
    T = T.filter(function (x) { return x.t.length <= 80 && !/: $|, and |  /.test(x.t); }).map(function (x) { return { t: titleCase(x.t), tone: x.tone, aim: x.aim }; });
    var s1 = A.short(E1 || name), s2 = vs ? A.short(E2) : '';
    var C = [
      { t: s2 ? s1 + ' VS ' + s2 : s1 + ' LATEST', tone: 'plain' }, { t: (N > 1 ? N + ' SOURCES' : 'THE SOURCE') + (when ? ', ' + when.toUpperCase() : ''), tone: 'plain' },
      { t: 'WHAT JUST HAPPENED', tone: 'mid' }, { t: s1 + ': THE TRUTH', tone: 'mid' },
      { t: foe ? s1 + ' CORNERED?' : 'WATCH THIS', tone: 'bold' }, { t: live ? 'WE\'RE LIVE' : 'IT\'S HAPPENING', tone: 'bold' }
    ].filter(function (x) { return words(x.t) <= 4; });
    var src = A.O.slice(0, 3), more = A.O.length - src.length;
    var from = src.length ? ' from ' + listOf(src.concat(more > 0 ? [more + ' more'] : [])) : '';
    var what = N + (N === 1 ? ' source' : ' sources'), onVid = V ? (V === N ? (N === 1 ? ', on video' : ', all on video') : ', ' + V + ' of them on video') : '';
    var lead = A.H.replace(/[.?!]+$/, '');
    var D = [
      { t: lead + '. ' + what + from + onVid + (A.era ? ', ' + A.era : '') + '. ' + (live ? 'On this live show we go through every one of them, in order.' : 'This video goes through every one of them, in order.'), tone: 'plain' },
      { t: titleCase(name) + ': what happened, who said what, and what it means. ' + (live ? 'Live, we' : 'We') + ' go through ' + what + from + onVid + ', each one linked below.', tone: 'mid' },
      { t: 'Everyone is talking about ' + (single ? bare(name) : listOf(names.slice(0, 2))) + '. Here is what the ' + (V ? 'clips' : 'sources') + ' actually show' + from + ', and what the coverage leaves out. Every source is linked below, so check it yourself.', tone: 'bold' }
    ].map(function (x) { return { t: noDash(x.t), tone: x.tone }; });
    var introB = 'Welcome in. ' + lead + '. We have ' + what + onVid + ', and we are going through every one. ';
    var intro = { plain: introB + 'Tell me in the chat what you make of it.', mid: introB + 'Stay to the end, because the last one changes how the first one reads. Put your take in the chat.', bold: 'Welcome in. ' + lead + '. You have seen the headlines. Now we look at the actual ' + (V ? 'footage' : 'sources') + ', ' + what + onVid + ', and you decide. Drop your take in the chat.' };
    var hook = { plain: lead + '. Here is what the ' + (V ? 'clips' : 'sources') + ' show.', mid: lead + '. Here is what it shows, and what it does not.', bold: 'You have seen the headline. You have not seen this.' };
    return { titles: T, covers: C, descs: D, intro: intro, hook: hook, src: 'room' };
  }
  // The written words of the show's main story, when the show is mostly that story and the words were written for it.
  function writtenWords(A) {
    var w = A.dom && A.dom.w;
    if (!w || !Array.isArray(w.titles) || !w.titles.length) return null;
    var ok = function (x) { return x && typeof x.t === 'string' && x.t.trim(); };
    return { titles: w.titles.filter(ok).map(function (x) { return { t: noDash(x.t), tone: x.tone, aim: x.aim }; }), covers: (w.covers || []).filter(ok).map(function (x) { return { t: noDash(x.t), tone: x.tone }; }),
      descs: (w.descs || []).filter(ok).map(function (x) { return { t: noDash(x.t), tone: x.tone }; }), intro: w.intro || {}, hook: w.hook || {}, src: 'written' };
  }
  function build(set) {
    var A = analyse(set), room = roomWords(A), wr = writtenWords(A);
    var P = wr ? { titles: wr.titles.concat(room.titles), covers: wr.covers.concat(room.covers), descs: wr.descs.concat(room.descs),
      intro: Object.assign({}, room.intro, wr.intro), hook: Object.assign({}, room.hook, wr.hook), src: 'written' } : room;
    ['titles', 'covers', 'descs'].forEach(function (k) { var seen = {}; P[k] = P[k].filter(function (x) { var key = x.t.toLowerCase(); if (seen[key]) return false; seen[key] = 1; return true; }); });
    P.A = A;
    return P;
  }
  // The options in the order the dials ask for: the chosen style and aim first, the written ones before the room's.
  function ranked(list, kind) {
    return list.map(function (x, i) { return { x: x, s: (x.tone === st.tone ? 4 : 0) + (kind === 'titles' && x.aim === st.aim ? 2 : 0) - i / 1000 }; })
      .sort(function (a, b) { return b.s - a.s; }).map(function (o) { return o.x; });
  }
  var PAGE = { titles: 5, covers: 4, descs: 3 };
  function opts(kind) {
    var all = ranked(ui.pack[kind], kind), p = PAGE[kind], o = [];
    if (all.length <= p) return all;
    var s = (ui.page[kind] * p) % all.length;
    for (var i = 0; i < p; i++) o.push(all[(s + i) % all.length]);
    return o;
  }
  // The pick is kept by its words, so paging through other options never loses it.
  function chosen(kind) { var all = ranked(ui.pack[kind], kind); return all.filter(function (x) { return x.t === ui.pick[kind]; })[0] || opts(kind)[0] || null; }
  function introText() { var src = st.kind === 'video' ? ui.pack.hook : ui.pack.intro; return src[st.tone] || src.mid || src.plain || ''; }
  function fullDesc(d) {
    var n = 0;
    return d + '\n\n' + (st.kind === 'live' ? 'On the show' : 'In this video') + ':\n' + ui.set.map(function (it) { n++; return n + '. ' + it.t.replace(/\s+/g, ' ').trim() + (it.h || it.nm ? ' (' + (it.h || it.nm) + ')' : '') + '\n' + it.u; }).join('\n') +
      '\n\nEvery source on one map: https://' + SITE_MARK;
  }

  /* ---------------------------------------------------------------- the switch, and the maker */
  var tools = root.querySelector('.ir-tools');
  if (!tools) return;
  var sw = document.createElement('label');
  sw.className = 'ir-crsw';
  sw.innerHTML = '<input type="checkbox" role="switch" id="ir-crsw"><span><b>Creator tools</b><small>Turn what you see into a show</small></span>';
  tools.appendChild(sw);
  var panel = document.createElement('section');
  panel.className = 'ir-sm'; panel.id = 'ir-sm'; panel.hidden = true; panel.setAttribute('aria-label', 'Make a show');
  var anchor = $('ir-board');
  anchor.parentNode.insertBefore(panel, anchor);
  var msg = document.createElement('p');
  msg.className = 'ir-crmsg'; msg.id = 'ir-crmsg'; msg.setAttribute('aria-live', 'polite');
  tools.parentNode.insertBefore(msg, tools.nextSibling);

  function lp(cb, tries) { if (window.LP && window.LP.members) { cb(window.LP); return; } if ((tries || 0) > 40) { cb(null); return; } setTimeout(function () { lp(cb, (tries || 0) + 1); }, 150); }
  function signedIn(L) { return !!(L && L.members.who && L.members.who()); }
  // The mark that says this reader makes shows: creator=true on their own account, the same field "I made it" sets.
  function markCreator(L) {
    if (!L || L.off || !L.members.fb) return;
    L.members.fb().then(function (S) {
      var u = S.auth && S.auth.currentUser; if (!u) return;
      return S.F.updateDoc(S.F.doc(S.db, 'users', u.uid), { creator: true, confirmed: !!u.emailVerified, email: u.email });
    }).catch(function () { /* the account has no profile yet, or the write was refused: the tools still work on this device */ });
  }
  var wantOn = false;
  function setOn(on) {
    st.on = on; save();
    $('ir-crsw').checked = on;
    panel.hidden = !on;
    document.documentElement.classList.toggle('ir-cr-on', on);
    msg.textContent = '';
    if (on) draw();
  }
  $('ir-crsw').checked = st.on;
  $('ir-crsw').addEventListener('change', function () {
    var want = this.checked;
    if (!want) { setOn(false); return; }
    this.checked = false;
    lp(function (L) {
      if (!L || L.off) { setOn(true); return; }          // a copy of the site with no accounts (a local preview): nothing to sign in to
      if (signedIn(L)) { markCreator(L); setOn(true); return; }
      wantOn = true;
      msg.innerHTML = 'Creator tools are free with an account. <button type="button" data-cr-in>Sign in or make one</button>';
      L.members.open('auth', { opener: $('ir-crsw') });
    });
  });
  msg.addEventListener('click', function (ev) { if (ev.target.closest('[data-cr-in]')) lp(function (L) { if (L) L.members.open('auth', { opener: $('ir-crsw') }); }); });
  lp(function (L) { if (L && L.members.sub) L.members.sub(function () { if (wantOn && signedIn(L)) { wantOn = false; markCreator(L); setOn(true); panel.scrollIntoView({ block: 'start', behavior: 'smooth' }); } }); });

  function dial(key, label, list) {
    return '<div class="ir-sm-dial" role="radiogroup" aria-label="' + esc(label) + '"><span class="ir-sm-dl">' + esc(label) + '</span><span class="ir-sm-db">' + list.map(function (o) {
      return '<button type="button" role="radio" data-dial="' + key + '" data-v="' + o[0] + '" aria-checked="' + (st[key] === o[0]) + '">' + esc(o[1]) + '</button>';
    }).join('') + '</span></div>';
  }
  function mix(A) {
    var k = A.kinds, b = [];
    if (k.video) b.push(k.video + (k.video === 1 ? ' video' : ' videos'));
    if (k.post || k.image) b.push((k.post + k.image) + ((k.post + k.image) === 1 ? ' post' : ' posts'));
    if (k.article) b.push(k.article + (k.article === 1 ? ' article' : ' articles'));
    if (k.doc) b.push(k.doc + (k.doc === 1 ? ' document' : ' documents'));
    return b.join(', ');
  }
  function optHtml(kind) {
    var list = opts(kind), cur = (chosen(kind) || {}).t, many = ui.pack[kind].length > PAGE[kind];
    if (!list.length) return '<p class="ir-sm-none">Nothing to offer here yet.</p>';
    return '<ul class="ir-sm-opts" role="radiogroup" aria-label="' + (kind === 'titles' ? 'Titles' : kind === 'covers' ? 'Cover text' : 'Descriptions') + '">' + list.map(function (x, i) {
      var meta = kind === 'titles' ? x.t.length + ' characters' + (x.t.length > 70 ? ', long for YouTube' : '') : kind === 'covers' ? words(x.t) + (words(x.t) === 1 ? ' word' : ' words') : x.t.length + ' characters';
      return '<li class="ir-sm-o ir-sm-' + kind + (x.t === cur ? ' on' : '') + '"><button type="button" role="radio" class="ir-sm-pick" data-pick="' + kind + '" data-i="' + i + '" aria-checked="' + (x.t === cur) + '"><span class="ir-sm-t">' + esc(x.t) + '</span><small>' + meta + '</small></button>' +
        '<button type="button" class="ir-sm-cp" data-cp="' + kind + '" data-i="' + i + '" aria-label="Copy this one">' + ICON.copy + '</button></li>';
    }).join('') + '</ul>' + (many ? '<button type="button" class="ir-sm-more" data-mk="more">' + ICON.redo + '<span>Other options</span></button>' : '');
  }
  function runHtml() {
    return '<ol class="ir-sm-run">' + ui.set.map(function (it, i) {
      var r = R.reach(it) || {}, lk = R.likes ? R.likes(it) : null, bits = [R.when(it), it.h || it.nm || it.src];
      if (lk != null) bits.push(R.fmt(lk) + ' likes'); else if (r.views) bits.push(R.fmt(r.views) + ' views');
      return '<li><span class="num">' + (i + 1) + '</span>' + R.mark(it) + '<a href="' + esc(it.u) + '" target="_blank" rel="noopener">' + esc(it.t) + '</a><small>' + esc(bits.filter(Boolean).join(' · ')) + '</small></li>';
    }).join('') + '</ol>';
  }
  function draw() {
    if (panel.hidden) return;
    var all = R.shown(), set = all.slice(0, MAXN), n = all.length;
    var sig = set.map(function (it) { return R.code(it); }).join('.') + '|' + st.kind;
    if (sig !== ui.sig) { ui.sig = sig; ui.set = set; ui.pick = { titles: '', covers: '', descs: '' }; ui.page = { titles: 0, covers: 0, descs: 0 }; ui.pack = set.length ? build(set) : null; }
    var A = ui.pack && ui.pack.A;
    var bar = '<div class="ir-sm-bar"><span class="ir-sm-ic" aria-hidden="true">' + ICON.play + '</span><p class="ir-sm-l"><b>' + (n ? 'Make a show from these ' + n : 'Your filters leave nothing') + '</b><span>' +
      (n ? esc(mix(A)) + (n > MAXN ? ' · the first ' + MAXN + ' in your order go in' : '') : 'Loosen a filter and the show fills again') + '</span></p>' +
      (n ? '<button type="button" class="ir-sm-go" data-mk="toggle" aria-expanded="' + ui.open + '">' + (ui.open ? 'Close' : 'Make the show') + '</button>' : '') + '</div>';
    if (!n || !ui.open) { panel.innerHTML = bar; panel.classList.toggle('open', false); return; }
    var tabs = [['titles', 'Titles'], ['covers', 'Cover text'], ['descs', 'Description'], ['run', 'Run order ' + set.length]];
    var body = '<div class="ir-sm-body"><p class="ir-sm-from"><span>Built from</span> ' + esc(R.filterLine ? R.filterLine() : '') + '</p>' +
      '<div class="ir-sm-dials">' + dial('kind', 'Making', KINDS2) + dial('tone', 'Style', TONES) + dial('aim', 'Aim for', AIMS) + '</div>' +
      '<div class="ir-sm-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (ui.tab === t[0]) + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>' +
      '<div class="ir-sm-pane" role="tabpanel">' + (ui.tab === 'run' ? runHtml() : optHtml(ui.tab)) + '</div>' +
      '<div class="ir-sm-acts"><a class="ir-sm-show" href="' + esc(showUrl()) + '" target="_blank" rel="noopener">' + ICON.play + '<span>Open the show screen</span></a>' +
      '<button type="button" class="ir-sm-copy" data-mk="copy">' + ICON.copy + '<span>Copy the package</span></button></div>' +
      '<p class="ir-sm-pk"><b>Your pick:</b> ' + esc((chosen('titles') || {}).t || '') + ' <span>· ' + esc((chosen('covers') || {}).t || '') + '</span></p></div>';
    panel.innerHTML = bar + body;
    panel.classList.toggle('open', true);
  }
  function showUrl() {
    var t = chosen('titles'), c = chosen('covers'), A = ui.pack.A;
    return '?show=' + ui.set.map(function (it) { return 'on~' + R.code(it); }).join('.') + '&kind=' + st.kind + '&t=' + encodeURIComponent((t ? t.t : A.H).slice(0, 100)) +
      (c ? '&c=' + encodeURIComponent(c.t.slice(0, 40)) : '') + '&i=' + encodeURIComponent(introText().slice(0, 420)) + (A.dom && A.dom.s ? '&st=' + encodeURIComponent(A.dom.id) : '');
  }
  function packageText() {
    var t = chosen('titles'), c = chosen('covers'), d = chosen('descs'), n = 0;
    return ['TITLE', t ? t.t : '', '', 'COVER TEXT', c ? c.t : '', '', 'DESCRIPTION', fullDesc(d ? d.t : ''), '', st.kind === 'video' ? 'OPENING HOOK' : 'INTRO, TO READ OUT', introText(), '',
      'RUN ORDER'].concat(ui.set.map(function (it) { n++; return n + '. ' + it.t.replace(/\s+/g, ' ').trim() + '\n   ' + it.u; })).concat(['', 'SHOW SCREEN', location.origin + location.pathname + showUrl()]).join('\n');
  }
  function copyText(t, done, fail) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { fallback(t) ? done() : fail(); }); else if (fallback(t)) done(); else fail();
  }
  function fallback(t) {
    try { var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  }
  function flash(b, txt) {
    var s = b.querySelector('span'), was = s ? s.textContent : '';
    b.classList.add('done'); if (s) s.textContent = txt; else b.setAttribute('aria-label', txt);
    setTimeout(function () { b.classList.remove('done'); if (s) s.textContent = was; else b.setAttribute('aria-label', 'Copy this one'); }, 1800);
  }
  panel.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b || !panel.contains(b)) return;
    var mk = b.getAttribute('data-mk');
    if (mk === 'toggle') { ui.open = !ui.open; draw(); if (ui.open) { var bd = panel.querySelector('.ir-sm-body'); if (bd && bd.getBoundingClientRect().top > innerHeight - 120) panel.scrollIntoView({ block: 'start', behavior: 'smooth' }); } return; }
    if (mk === 'more') { ui.page[ui.tab]++; draw(); return; }
    if (mk === 'copy') { copyText(packageText(), function () { flash(b, 'Copied: title, cover, description, intro, links'); }, function () { flash(b, 'Copying is blocked here'); }); return; }
    if (b.hasAttribute('data-tab')) { ui.tab = b.getAttribute('data-tab'); draw(); var tb = panel.querySelector('[data-tab="' + ui.tab + '"]'); if (tb) tb.focus(); return; }
    if (b.hasAttribute('data-dial')) {
      var k = b.getAttribute('data-dial'); st[k] = b.getAttribute('data-v'); save();
      if (k === 'kind') ui.sig = '';          // a live show and a video get different words (intro or hook, "live" titles)
      else { ui.pick = { titles: '', covers: '', descs: '' }; ui.page = { titles: 0, covers: 0, descs: 0 }; }
      draw(); var db = panel.querySelector('[data-dial="' + k + '"][aria-checked="true"]'); if (db) db.focus(); return;
    }
    if (b.hasAttribute('data-pick')) { var po = opts(b.getAttribute('data-pick'))[+b.getAttribute('data-i')]; if (po) ui.pick[b.getAttribute('data-pick')] = po.t; draw(); var pb = panel.querySelector('[data-pick="' + b.getAttribute('data-pick') + '"][data-i="' + b.getAttribute('data-i') + '"]'); if (pb) pb.focus(); return; }
    if (b.hasAttribute('data-cp')) {
      var o = opts(b.getAttribute('data-cp'))[+b.getAttribute('data-i')]; if (!o) return;
      var txt = b.getAttribute('data-cp') === 'descs' ? fullDesc(o.t) : o.t;
      copyText(txt, function () { flash(b, 'Copied'); }, function () { flash(b, 'Copying is blocked here'); });
    }
  });
  if (R.onRender) R.onRender(draw);
  if (st.on) setOn(true);

  /* ---------------------------------------------------------------- the show screen (?show=) */
  var q = new URLSearchParams(location.search);
  PACKS = R.packs ? R.packs() : null;          // intel.js has already read data/show-packs.json
  if (q.get('show')) showScreen(); else draw();

  function showScreen() {
    var codes = String(q.get('show') || '').split('.').filter(Boolean).slice(0, 40);
    var rows = codes.map(function (c) { var m = /^([a-z]+)~(.+)$/.exec(c); if (!m) return null; var x = R.byId(m[2]); return x ? { role: m[1], it: x } : null; }).filter(Boolean);
    var story = null, sid = q.get('st') || '';
    if (PACKS) PACKS.stories.forEach(function (s) { if (s.id === sid) story = s; });
    var video = q.get('kind') === 'video';
    var title = q.get('t') || (story && story.title) || 'The Intel Room';
    var intro = q.get('i') || (story ? (video ? story.hook : story.intro) : '');
    var cover = (q.get('c') || '').slice(0, 40);
    var desc = story ? story.desc : '';
    var at = Math.max(0, Math.min(rows.length, +q.get('n') || 0));          // 0 is the intro card
    document.documentElement.classList.add('ir-sh-on');
    var sh = document.createElement('div');
    sh.className = 'ir-sh'; sh.id = 'ir-sh';
    sh.innerHTML = '<div class="ir-sh-bg" aria-hidden="true"><i></i><i></i></div>' +
      '<header class="ir-sh-bar"><a class="ir-sh-brand" href="' + esc(location.pathname) + '" aria-label="Back to the Intel Room"><img src="../assets/seal.png" alt="" width="40" height="40"><span><b>Liberty Politics</b> Intel Room</span></a>' +
      '<p class="ir-sh-title">' + esc(title) + '</p>' +
      '<p class="ir-sh-count num" id="ir-sh-count" aria-live="polite"></p><time class="ir-sh-clock num" id="ir-sh-clock"></time>' +
      '<div class="ir-sh-tools"><button type="button" id="ir-sh-notes" aria-pressed="false">' + ICON.notes + '<span>Host notes</span></button><button type="button" id="ir-sh-full">' + ICON.full + '<span>Full screen</span></button></div></header>' +
      '<main class="ir-sh-stage" id="ir-sh-stage"></main>' +
      '<aside class="ir-sh-notes" id="ir-sh-pad" hidden><p class="ir-sh-nl">' + (video ? 'Your opening hook' : 'Your 30-second intro') + '</p><p class="ir-sh-nt">' + esc(intro || 'Say what the show is about, and what you will show.') + '</p></aside>' +
      '<footer class="ir-sh-foot"><button type="button" class="ir-sh-nav" id="ir-sh-prev" aria-label="Previous">' + ICON.prev + '</button><ol class="ir-sh-strip" id="ir-sh-strip" aria-label="The rundown"></ol><button type="button" class="ir-sh-nav" id="ir-sh-next" aria-label="Next">' + ICON.next + '</button>' +
      '<p class="ir-sh-mark" aria-hidden="true">' + SITE_MARK + '</p></footer>';
    document.body.appendChild(sh);
    document.title = title + ' | Liberty Politics';
    if (!rows.length) { $('ir-sh-stage').innerHTML = '<div class="ir-sh-card"><h1>This show has nothing in it</h1><p>Its items have left the room since the link was made. Plan it again in <a href="' + esc(location.pathname) + '">the Intel Room</a>.</p></div>'; }
    var narrow = matchMedia('(max-width:900px)').matches;
    function notes(on) { $('ir-sh-pad').hidden = !on; $('ir-sh-notes').setAttribute('aria-pressed', on ? 'true' : 'false'); sh.classList.toggle('has-notes', on); }
    notes(narrow && !!intro);
    function strip() {
      $('ir-sh-strip').innerHTML = '<li><button type="button" data-go="0"' + (at === 0 ? ' aria-current="true"' : '') + '><span class="ir-sh-sn">Intro</span><span class="ir-sh-stt">' + esc(title) + '</span></button></li>' +
        rows.map(function (r, i) {
          return '<li><button type="button" data-go="' + (i + 1) + '"' + (at === i + 1 ? ' aria-current="true"' : '') + '>' + R.mark(r.it) + '<span class="ir-sh-sn num">' + (i + 1) + '</span><span class="ir-sh-stt">' + esc(r.it.t) + '</span></button></li>';
        }).join('');
      var cur = $('ir-sh-strip').querySelector('[aria-current]');
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    function clock() { try { $('ir-sh-clock').textContent = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(new Date()) + ' ET'; } catch (e) { $('ir-sh-clock').textContent = ''; } }
    clock(); setInterval(clock, 15000);
    function go(i) {
      at = Math.max(0, Math.min(rows.length, i));
      $('ir-sh-count').textContent = at === 0 ? 'Intro' : at + ' of ' + rows.length;
      $('ir-sh-prev').disabled = at === 0; $('ir-sh-next').disabled = at === rows.length;
      stage();
      strip();
      if (history.replaceState) { var u = new URLSearchParams(location.search); u.set('n', at); history.replaceState(null, '', location.pathname + '?' + u.toString()); }
    }
    function stage() {
      var el = $('ir-sh-stage');
      el.classList.remove('one-title');          // set again by frame() when the item's own card already carries its headline
      if (at === 0) {
        el.innerHTML = '<div class="ir-sh-open"><p class="ir-sh-k">' + esc(cover || (video ? 'Today\'s video' : 'On the show today')) + '</p><h1>' + esc(title) + '</h1>' + (desc ? '<p class="ir-sh-d">' + esc(firstSentence(desc)) + '</p>' : '') +
          '<ol class="ir-sh-agenda">' + rows.slice(0, 6).map(function (r) { return '<li>' + R.mark(r.it) + '<span>' + esc(roleName(r) ? roleName(r) + ': ' : '') + esc(cut(r.it.t, 80)) + '</span></li>'; }).join('') + '</ol></div>';
        return;
      }
      var r = rows[at - 1], x = r.it;
      el.innerHTML = '<div class="ir-sh-frame" id="ir-sh-frame"></div><div class="ir-sh-info">' + (roleName(r) ? '<p class="ir-sh-role">' + esc(roleName(r)) + '</p>' : '') +
        '<h2>' + esc(x.t) + '</h2><p class="ir-sh-meta">' + R.mark(x) + esc([R.when(x), x.nm || x.h || x.src, R.where(x) !== 'No single place' ? R.where(x) : ''].filter(Boolean).join(' · ')) + '</p>' +
        counts(x) + (x.hotWhy ? '<p class="ir-sh-why">' + ICON.flame + esc(x.hotWhy) + '</p>' : '') + (x.also && x.also.length ? '<p class="ir-sh-also">Also carried by ' + esc(x.also.join(', ')) + '</p>' : '') +
        '<a class="ir-sh-src" href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(srcLine(x)) + '</a></div>';
      frame($('ir-sh-frame'), x);
    }
    function firstSentence(t) { var m = /^.*?[.?!](\s|$)/.exec(t); return (m ? m[0] : t).trim(); }
    function roleName(r) { return r.role === 'on' ? '' : r.role === 'rel' ? 'Related' : ROLE[r.role] || ''; }
    function cut(t, n) { return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; }
    function srcLine(x) { var h = String(x.u).replace(/^https?:\/\/(www\.)?/, '').split('/')[0]; return 'Open the source: ' + (x.src === 'News' && x.h ? x.h : h); }
    function counts(x) {
      var r = R.reach(x) || {}, b = [];
      var lk = r.likes != null ? r.likes : x.lk, vw = r.views != null ? r.views : x.vw;
      if (lk != null) b.push('<span><b class="num">' + R.fmt(lk) + '</b> likes</span>');
      if (x.rp != null) b.push('<span><b class="num">' + R.fmt(x.rp) + '</b> reposts</span>');
      if (vw != null) b.push('<span><b class="num">' + R.fmt(vw) + '</b> views</span>');
      if (x.hot != null) b.push('<span><b class="num">' + x.hot + '</b> hot</span>');
      return b.length ? '<p class="ir-sh-n">' + b.join('') + '</p>' : '';
    }
    var twLoad = null;
    function tw() { if (window.twttr && window.twttr.widgets) return Promise.resolve(window.twttr); if (twLoad) return twLoad;
      twLoad = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'https://platform.twitter.com/widgets.js'; s.async = true; s.onload = function () { var n = 0; (function wait() { if (window.twttr && window.twttr.widgets) res(window.twttr); else if (n++ > 50) rej(); else setTimeout(wait, 100); })(); }; s.onerror = rej; document.head.appendChild(s); });
      return twLoad; }
    function card(el, x, why) {
      el.innerHTML = '<div class="ir-sh-card"><p class="ir-sh-ck">' + R.mark(x) + esc(x.h || x.src) + ' · ' + esc(R.when(x)) + '</p><p class="ir-sh-ct">' + esc(x.t) + '</p>' + (why ? '<p class="ir-sh-cw">' + esc(why) + '</p>' : '') + '</div>';
    }
    function frame(el, x) {
      var y = R.yt(x.u), st2 = /(?:x|twitter)\.com\/[^\/]+\/status\/(\d+)/.exec(x.u || ''), tg = /t\.me\/(?:s\/)?([A-Za-z0-9_]+\/\d+)/.exec(x.u || '');
      if (y) {
        var tall = /\/shorts\//.test(x.u);
        el.className = 'ir-sh-frame is-yt' + (tall ? ' is-tall' : '');
        el.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + y + '?cc_load_policy=1&cc_lang_pref=en&hl=en&rel=0&playsinline=1&modestbranding=1" title="' + esc(x.t) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
        return;
      }
      if (st2) {
        el.className = 'ir-sh-frame is-x';
        card(el, x, 'Loading the post from X');
        var mine = at;
        // The post's own card stays up until X has drawn it (X can take several seconds, or never, behind a blocker)
        var box2 = document.createElement('div'); box2.className = 'ir-sh-tw'; el.appendChild(box2);
        var fail = function (why) { if (mine === at) { card(el, x, why); } };
        tw().then(function (T) {
          if (mine !== at) return;
          return T.widgets.createTweet(st2[1], box2, { theme: 'dark', dnt: true, align: 'center', conversation: 'none' }).then(function (w) {
            if (!w) { fail('X did not show this post here. Open it on X.'); return; }
            var n = 0;
            (function drawn() {
              if (mine !== at) return;
              var f = box2.querySelector('iframe');
              if (f && f.getBoundingClientRect().height > 120) { var c = el.querySelector('.ir-sh-card'); if (c) c.remove(); el.classList.add('is-drawn'); return; }
              if (n++ > 120) { fail('X did not show this post here. Open it on X.'); return; }
              setTimeout(drawn, 250);
            })();
          });
        }).catch(function () { fail('X\'s player is blocked in this browser. Open the post on X.'); });
        return;
      }
      if (tg) {
        el.className = 'ir-sh-frame is-tg';
        el.innerHTML = '';
        var s = document.createElement('script'); s.async = true; s.src = 'https://telegram.org/js/telegram-widget.js?22';
        s.setAttribute('data-telegram-post', tg[1]); s.setAttribute('data-width', '100%'); s.setAttribute('data-dark', '1');
        el.appendChild(s);
        return;
      }
      if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(x.u || '')) { el.className = 'ir-sh-frame is-img'; el.innerHTML = '<img src="' + esc(x.u) + '" alt="' + esc(x.t) + '">'; return; }
      el.className = 'ir-sh-frame is-card';
      $('ir-sh-stage').classList.add('one-title');
      card(el, x, x.also && x.also.length ? 'Also carried by ' + x.also.join(', ') : '');
    }
    sh.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.id === 'ir-sh-prev') go(at - 1);
      else if (b.id === 'ir-sh-next') go(at + 1);
      else if (b.hasAttribute('data-go')) go(+b.getAttribute('data-go'));
      else if (b.id === 'ir-sh-notes') notes($('ir-sh-pad').hidden);
      else if (b.id === 'ir-sh-full') fullscreen();
    });
    function fullscreen() {
      var d = document.documentElement;
      if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen().catch(function () {}); }
      else if (d.requestFullscreen) d.requestFullscreen().catch(function () {});
    }
    document.addEventListener('fullscreenchange', function () { var s2 = $('ir-sh-full').querySelector('span'); if (s2) s2.textContent = document.fullscreenElement ? 'Leave full screen' : 'Full screen'; });
    document.addEventListener('keydown', function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey || (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName))) return;
      var k = ev.key;
      if (k === 'ArrowRight' || k === 'PageDown' || k === 'ArrowDown') { ev.preventDefault(); go(at + 1); }
      else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp') { ev.preventDefault(); go(at - 1); }
      else if (k === 'Home') { ev.preventDefault(); go(0); }
      else if (k === 'End') { ev.preventDefault(); go(rows.length); }
      else if (k === 'n' || k === 'N') notes($('ir-sh-pad').hidden);
      else if (k === 'f' || k === 'F') fullscreen();
    });
    // A swipe across the item steps it on a phone.
    var sx = null;
    $('ir-sh-stage').addEventListener('touchstart', function (ev) { sx = ev.touches.length === 1 ? { x: ev.touches[0].clientX, y: ev.touches[0].clientY } : null; }, { passive: true });
    $('ir-sh-stage').addEventListener('touchend', function (ev) {
      if (!sx) return; var t = ev.changedTouches[0], dx = t.clientX - sx.x, dy = t.clientY - sx.y; sx = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(at + (dx < 0 ? 1 : -1));
    }, { passive: true });
    if (rows.some(function (r) { return /^https:\/\/(www\.)?(x|twitter)\.com\//.test(r.it.u || ''); })) tw().catch(function () {});          // X's player loads once, early
    go(at);
    sh.setAttribute('data-ready', '1');
  }
})();
