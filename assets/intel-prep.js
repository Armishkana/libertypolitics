/* The Intel Room's creator tools and its show screen (intel/). Loaded by intel.js once the room is ready; everything it
   knows about an item comes from intel.js through window.IRoom.

   WHO MEETS IT (changed 19 October 2026, see "FOR EVERYONE" below). Until that day it sat behind one quiet switch at the
   foot of the Filters drawer that needed an account (Armin, 16 October: "If they come there and see that this seems to be
   a tool for content creators ... they're going to get confused"), and nobody but him found it. Now "Make a show" is one
   outlined button on the room's bar, for anyone; making needs no account, saving and the link need a free one
   (users/{uid}.creator is still set to true when a signed-in reader turns it on: that is how creators are found).

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
  // Iran Uncensored's room hands its own name, address and stamp in the same #ir-cfg intel.js reads (site-iu/build/news.py)
  var CFG = (function () { var el = document.getElementById('ir-cfg'); try { return el ? JSON.parse(el.textContent) || {} : {}; } catch (e) { return {}; } })();
  var SITE_MARK = CFG.mark || 'libertypolitics.com/intel', BRAND = CFG.brand || 'Liberty Politics', SEAL = CFG.seal || '../assets/seal.png';
  // Every sentence a reader of Iran Uncensored can meet goes through T() (CFG.t, the same table intel.js reads; site-iu/build/
  // news.py lists the keys of every T() call in this file too and stops the Persian build while one has no Persian). N() writes digits
  // the page's way. Liberty Politics hands no table: both give back what they are handed.
  var TT = CFG.t && typeof CFG.t === 'object' ? CFG.t : null, FA = CFG.lang === 'fa';
  function T(s, v) { var r = TT && typeof TT[s] === 'string' ? TT[s] : s; if (v) Object.keys(v).forEach(function (k) { r = r.split('{' + k + '}').join(String(v[k])); }); return r; }
  function N(n) { var s = String(n); return FA ? s.replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(+d); }) : s; }
  // Every link this file draws opens without telling the far site where it came from when the page asks (CFG.noref: Iran
  // Uncensored), and only ever to a web address: a saved show or list is JSON anyone can write by hand (cleanSnap below),
  // so an item's u is never trusted to be http(s) (24 Oct 2026: a "javascript:" u ran on a tap and "Save a copy" spread it).
  var RELN = CFG.noref ? 'noopener noreferrer' : 'noopener';
  function href(u) { u = String(u == null ? '' : u); return /^https?:\/\//i.test(u) ? u : '#'; }
  // a cut that never leaves half of a character pair behind (encodeURIComponent throws on a lone high surrogate, and the
  // throw took the whole maker down: an emoji at character 100 of a title was enough)
  function cutU(s, n) { s = String(s == null ? '' : s).slice(0, n); var c = s.charCodeAt(s.length - 1); return c >= 0xD800 && c <= 0xDBFF ? s.slice(0, -1) : s; }
  // the arrows of the show screen and the lists point the way the page reads (CFG.rtl: the Persian page reads right to left)
  var RTL = !!CFG.rtl;
  // PLAIN (Iran Uncensored, CFG.prep 'plain', 19 October 2026): the maker without the machine-written titles, cover lines and
  // descriptions. Over a feed two-thirds Persian they came out mixed, and a machine-made Persian title is a brand risk on
  // Kaveh's channel (site-iu/README.md, "Show tools"). So there the creator writes the title and the note; the run order,
  // saving, the link and the show screen are the same. Regime media never goes in a show there (R.regime): it has no link.
  var PLAIN = CFG.prep === 'plain';
  var CLOCK = CFG.clock || { tz: 'America/New_York', locale: 'en-US', label: ' ET' };
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
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
    save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    read: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/></svg>',
    out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
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
  // the part an item plays, for an older show link that carries one (role~code); read only through roleName(), which looks
  // up own keys alone (a role of "constructor" in a hand-made address printed "function Object()")
  var ROLE = { report: T('The report'), own: T('In their own words'), clip: T('The clip'), reaction: T('Reaction'), more: T('More on it'), other: T('The other side, or the silence'),
    proof: T('Background, from the bank'), related: T('Related'), rank: '' };
  var PACKS = null;
  var KEY = 'ir-creator';
  /* HOW MANY GO IN (23 Oct 2026, Armin: "How could somebody create a show that is three hours with three items? ... I
     should be able to make a three-hour show out of it"). A live show talks about each item for a few minutes, the
     comments included, so three hours wants about sixty; an edited video about twenty-five. The run order says how long
     the show it holds would run on air (MIN_PER, minutes an item, a planning number, never a promise). */
  var MAXN_LIVE = 60, MAXN_VIDEO = 25, MIN_PER = { live: 3, video: 0.75 };
  function maxN() { return !PLAIN && st.kind === 'video' ? MAXN_VIDEO : MAXN_LIVE; }
  var TONES = [['plain', 'Descriptive'], ['mid', 'Balanced'], ['bold', 'Engaging']], AIMS = [['clicks', 'Clicks'], ['watch', 'Watch time']], KINDS2 = [['live', 'Live show'], ['video', 'Video']];
  var st = store(KEY);
  if (!st || typeof st !== 'object') st = {};
  // on is never read back: the maker starts closed on every visit, for him exactly as for a stranger (21 Oct 2026, ONE DOOR below)
  st = { on: false, kind: st.kind === 'video' ? 'video' : 'live', tone: ['plain', 'mid', 'bold'].indexOf(st.tone) >= 0 ? st.tone : 'mid', aim: st.aim === 'watch' ? 'watch' : 'clicks' };
  function save() { store(KEY, st); }
  // set: the show, in its order. best: the order the room worked out (and why each item sits where it does). mine: true once
  // the creator has changed it. acts: each change, in order, for the log. rest: how far the "not in the show" list is open.
  var ui = { open: false, tab: 'titles', pick: { titles: '', covers: '', descs: '' }, page: { titles: 0, covers: 0, descs: 0 }, sig: '', mem: '', pack: null, set: [], pool: [],
    best: null, mine: false, acts: [], rest: 8, sent: '',
    // saving and sending (19 October 2026): the creator's own title and note (null: not typed), the saved show this maker
    // session writes to (its id, and what it held when saved, to tell "saved" from "changed since"), their saved shows
    myTitle: null, myNote: null, saved: null, savedSig: '', mineState: 'idle', shows: [], arm: '', wantSave: false, svMsg: '' };
  // What creators pick and how they reorder, counted by build/show_learn.py from showedits/ (data/show-learn.json): a title
  // or cover shape that creators keep choosing rises a little in the list. Absent or old, nothing changes.
  var LEARN = null;
  (function () { var w = root.getAttribute('data-words'); if (!w) return; fetch(w.replace(/show-words\.json.*$/, 'show-learn.json'), { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d && d.schema === 1 && d.picks) { LEARN = d; if (ui.pack) draw(); } }).catch(function () { }); })();
  var ORDER_KEY = 'ir-show-order';          // his own order for a set, on this device, so a reload keeps it

  /* ---------------------------------------------------------------- what the show is about
     18 October 2026. Armin picked the France riots story (111 items: Macron, Paris, Lyon, Limoges) and every title said
     "The the US Story They Are Not Showing You". Two faults. The subject came from a fixed list of 29 names with no France,
     no Macron and no Paris in it, so the one name it did know ("U.S.", in one headline of 25) won. And "the US" went through
     cap1() and then bare(), which only strips a lower-case "the ", so "The" was written twice.
     So now: (1) the subject is MEASURED from the set, never looked up: the country each item is placed in, the names its
     own headlines repeat, and the story's own place and title (the list below only adds what a name IS: a person, a group,
     the stance's adversary); (2) every option, written or built, passes fits(): it may not name a person or a place that
     too few of the items carry, and lint() refuses doubled words, "undefined", a dangling word or quote, an over-long title.
     build/phone-test.html (the gate every publish passes) runs both against every story of the hour. */
  // Named people, groups and places the room knows something ABOUT: kind (person, group, place), whether the stance counts
  // them an adversary (the only names a "losing control?" question is ever asked about), and the country they speak for.
  var ENT = [
    ['Khamenei', 'KHAMENEI', /\bkhamenei\b/i, 1, 'person', 'Iran'], ['the IRGC', 'IRGC', /\birgc\b|revolutionary guards?/i, 1, 'group', 'Iran'], ['Pezeshkian', 'PEZESHKIAN', /\bpezeshkian\b/i, 1, 'person', 'Iran'],
    ['Araghchi', 'ARAGHCHI', /\baraghchi\b/i, 1, 'person', 'Iran'], ['Hezbollah', 'HEZBOLLAH', /\bhezbollah\b/i, 1, 'group', 'Lebanon'], ['Hamas', 'HAMAS', /\bhamas\b/i, 1, 'group', 'Gaza'],
    ['the Houthis', 'HOUTHIS', /\bhouthis?\b/i, 1, 'group', 'Yemen'], ['Netanyahu', 'NETANYAHU', /\bnetanyahu\b/i, 0, 'person', 'Israel'], ['Trump', 'TRUMP', /\btrump\b/i, 0, 'person', 'the US'],
    ['Rubio', 'RUBIO', /\brubio\b/i, 0, 'person', 'the US'], ['Vance', 'VANCE', /\bvance\b/i, 0, 'person', 'the US'], ['Hegseth', 'HEGSETH', /\bhegseth\b/i, 0, 'person', 'the US'],
    ['Putin', 'PUTIN', /\bputin\b/i, 0, 'person', 'Russia'], ['Erdogan', 'ERDOGAN', /\berdo[gğ]an\b/i, 0, 'person', 'Turkey'], ['Pahlavi', 'PAHLAVI', /\bpahlavi\b/i, 0, 'person', 'Iran'],
    ['Macron', 'MACRON', /\bmacron\b/i, 0, 'person', 'France'], ['Le Pen', 'LE PEN', /\ble ?pen\b/i, 0, 'person', 'France'], ['Bardella', 'BARDELLA', /\bbardella\b/i, 0, 'person', 'France'],
    ['Starmer', 'STARMER', /\bstarmer\b/i, 0, 'person', 'the UK'], ['Farage', 'FARAGE', /\bfarage\b/i, 0, 'person', 'the UK'], ['Merz', 'MERZ', /\bmerz\b/i, 0, 'person', 'Germany'],
    ['Meloni', 'MELONI', /\bmeloni\b/i, 0, 'person', 'Italy'], ['Zelensky', 'ZELENSKY', /\bzelens[kc]yy?\b/i, 0, 'person', 'Ukraine'], ['Xi', 'XI', /\bxi jinping\b|\bxi\b(?= (says|warns|meets|and|to)\b)/i, 0, 'person', 'China'],
    ['Modi', 'MODI', /\bmodi\b/i, 0, 'person', 'India'], ['Orban', 'ORBAN', /\borb[aá]n\b/i, 0, 'person', 'Hungary'], ['Sisi', 'SISI', /\bsisi\b/i, 0, 'person', 'Egypt'],
    ['Musk', 'MUSK', /\bmusk\b/i, 0, 'person', 'the US'], ['Biden', 'BIDEN', /\bbiden\b/i, 0, 'person', 'the US'], ['Obama', 'OBAMA', /\bobama\b/i, 0, 'person', 'the US'],
    ['Mamdani', 'MAMDANI', /\bmamdani\b/i, 0, 'person', 'the US'], ['Ilhan Omar', 'OMAR', /\bilhan omar\b/i, 0, 'person', 'the US'], ['Carney', 'CARNEY', /\bcarney\b/i, 0, 'person', 'Canada'],
    ['the Strait of Hormuz', 'HORMUZ', /\bhormuz\b/i, 0, 'place', 'Iran'], ['the West Bank', 'WEST BANK', /west bank/i, 0, 'place', 'the West Bank'], ['Gaza', 'GAZA', /\bgaza\b/i, 0, 'place', 'Gaza'],
    ['the UN', 'UN', /\bU\.N\.|\bUN\b|United Nations|UNRWA/, 0, 'group', ''], ['NATO', 'NATO', /\bnato\b/i, 0, 'group', ''], ['the EU', 'EU', /\bE\.U\.|\bEU\b|European Union/, 0, 'group', ''],
    ['Europe', 'EUROPE', /\beurope\b|\beuropean\b(?! union)/i, 0, 'place', '']
  ];
  // How a title says a country (the map names it "United States"; a title says "the US"), and the words that mean it.
  var SAY = { 'United States': 'the US', 'United Kingdom': 'the UK', 'United Arab Emirates': 'the UAE', 'West Bank': 'the West Bank', 'Saudi Arabia': 'Saudi Arabia' };
  var CUP = { 'the US': 'USA', 'the UK': 'UK', 'the UAE': 'UAE', 'the West Bank': 'WEST BANK' };
  var DEMONYM = { France: 'french', Italy: 'italian', Germany: 'german', Iran: 'iranian', Israel: 'israeli', 'the US': 'america|american|americans|u\\.s\\.|usa|white house|pentagon',
    'the UK': 'british|britain|u\\.k\\.|england|london', Russia: 'russian|kremlin|moscow', China: 'chinese|beijing', Ukraine: 'ukrainian|kyiv', Lebanon: 'lebanese|beirut', Syria: 'syrian|damascus',
    Turkey: 'turkish|ankara', Egypt: 'egyptian|cairo', Spain: 'spanish|madrid', Sweden: 'swedish', Poland: 'polish', India: 'indian', Pakistan: 'pakistani', Canada: 'canadian',
    Yemen: 'yemeni', Iraq: 'iraqi|baghdad', Qatar: 'qatari|doha', Gaza: 'gazan', Venezuela: 'venezuelan', Mexico: 'mexican', Netherlands: 'dutch', Belgium: 'belgian', Greece: 'greek', 'Saudi Arabia': 'saudi|riyadh' };
  var SMALL = /^(a|an|and|as|at|but|by|for|in|of|on|or|the|to|vs|via|with|from|into|over)$/i;
  // capitalised words that are not names: they start sentences, shout, or name a group rather than a subject
  var NOTNAME = /^(i|im|it|its|we|you|he|she|they|this|that|these|those|the|a|an|and|but|or|if|as|at|in|on|of|to|for|from|by|with|not|no|now|just|breaking|watch|live|new|news|video|update|alert|holy|here|there|why|what|who|how|when|where|my|our|your|his|her|their|mr|mrs|ms|dr|president|minister|prime|police|government|state|city|town|hall|muslims?|islam|islamic|islamist|christians?|jews?|jewish|left|right|leftist|antifa|god|allah|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tonight|yesterday|january|february|march|april|may|june|july|august|september|october|november|december|x|twitter|youtube|fox|cnn|bbc|reuters|ap|nbc|cbs|abc|msnbc|wion|full|report|footage|moment|people|everyone|nobody)$/i;
  function titleCase(t) {
    var ws = String(t).split(' ');
    return ws.map(function (w, i) {
      if (/[A-Z].*[A-Z]/.test(w) || /\d/.test(w)) return w;          // IRGC, U.S., 2026, PLAYING stay as written
      if (i && SMALL.test(w) && !/[:?!.]$/.test(ws[i - 1])) return w.toLowerCase();          // "Iran: The Part", never "Iran: the Part"
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }
  function noDash(t) { return String(t).replace(/\s*[–—]\s*/g, ', ').replace(/\s+-\s+/g, ', '); }
  // A headline as a title: no "LIVE:" or outlet tail, no emoji, no dashes, cut at a clause when long, title case.
  function cleanHead(t) {
    t = String(t || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
    for (var k = 0; k < 2; k++) t = t.replace(/^(LIVE|WATCH|BREAKING|TRENDING|JUST IN|NEW|NOW|UPDATE|HOLY \w+)\b[!:|\s-]*/i, '');
    t = t.replace(/\s+[|–—-]\s+[^|–—-]{2,40}$/, '').replace(/\s*#\w+/g, '').replace(/[.!]+$/, '');
    if (/^['"‘“]/.test(t) && /['"’”]$/.test(t) && !/["“”]|['‘’](?![a-z])/.test(t.slice(1, -1))) t = t.slice(1, -1);          // a quote that is the whole headline: the words, not the marks
    return noDash(t).trim();
  }
  function headline(it) { var t = cleanHead(it.t); return titleCase(t.length <= 84 ? t : clip(t, 70)); }          // a whole headline up to 84 characters beats a cut one
  function clip(t, n) {
    t = String(t).trim();
    if (t.length <= n) return t;
    var rx = /[:,;.?!]\s|\s(as|after|while|amid|but|over)\s/g, m, at = -1;
    while ((m = rx.exec(t))) if (m.index >= 24 && m.index <= n) at = m.index;
    if (at > 0) return t.slice(0, at).replace(/[\s,:;]+$/, '');
    t = t.slice(0, n).replace(/\s+\S*$/, '').replace(/[\s,:;]+$/, '');
    while (/\s(a|an|and|as|at|but|by|for|in|of|on|or|the|to|is|are|was|with|from|who|that|which|when|while|where|than|into|his|her|their|its|this|these|my|our)$/i.test(t)) t = t.replace(/\s+\S+$/, '');
    return t;
  }
  function listOf(xs) { xs = xs.filter(Boolean); return xs.length < 2 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }
  function words(n) { return String(n).split(/\s+/).filter(Boolean).length; }
  function bare(name) { return String(name).replace(/^the /i, ''); }
  function cap1(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function rxWord(w) { return new RegExp('(^|[^a-z])(' + w + ')([^a-z]|$)', 'i'); }
  // a country: its name as written ("US", never the word "us"), or its people and capital in any case
  function rxPlace(name) {
    var a = new RegExp('(^|[^A-Za-z])' + bare(name).replace(/ /g, '\\s') + '([^A-Za-z]|$)'), b = DEMONYM[name] ? new RegExp('(^|[^a-z])(' + DEMONYM[name] + ')([^a-z]|$)', 'i') : null;
    return { source: a.source, test: function (s) { return a.test(s) || (!!b && b.test(s)); } };
  }
  // every country the map knows, so a title can never name one the items do not carry, even in an hour with none of it
  var COUNTRIES = ['Afghanistan', 'Argentina', 'Armenia', 'Australia', 'Azerbaijan', 'Belgium', 'Brazil', 'Canada', 'China', 'Colombia', 'Cuba', 'Egypt', 'France', 'Gaza', 'Germany', 'Greece',
    'Hungary', 'India', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Lebanon', 'Libya', 'Mexico', 'Netherlands', 'Nigeria', 'North Korea', 'Norway', 'Pakistan', 'Poland',
    'Qatar', 'Russia', 'Saudi Arabia', 'Somalia', 'South Africa', 'South Korea', 'Spain', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Turkey', 'Ukraine', 'the UAE', 'the UK',
    'the US', 'Venezuela', 'the West Bank', 'Yemen'];
  // a headline's SHOUTING taken down to normal case; acronyms stay
  function calm(t) { return String(t).replace(/\b[A-Z][A-Z']{3,}\b/g, function (w) { return /^(IRGC|NATO|IAEA|OPEC|UNRWA|MAGA|USA|NYPD|IDF)$/.test(w) ? w : w.toLowerCase(); }); }
  function textOf(it) { return String(it.t || '') + ' ' + String(it.n || ''); }

  // What happened, in one noun a title can carry, and the words in the items that say it.
  var EVENTS = [
    ['Riots', /\briot(s|ers?|ing)?\b/i], ['Protests', /\bprotest(s|ers?|ing)?\b|\bdemonstrat\w+/i], ['Clashes', /\bclash(es|ed)?\b/i], ['Fires', /\bburn(s|ing|ed|t)?\b|\bablaze\b|\bon fire\b|\btorch(ed|es)?\b|\bfires?\b/i, 1],
    ['Arrests', /\barrest(s|ed)?\b|\bdetain(ed|s)?\b/i], ['Strikes', /\bstrikes?\b|\bairstrikes?\b/i], ['Attack', /\battack(s|ed)?\b/i], ['War', /\bwar\b/i], ['Ceasefire', /\bceasefire\b|\btruce\b/i],
    ['Sanctions', /\bsanction(s|ed)?\b/i], ['Election', /\belection(s)?\b|\bmidterms?\b|\bballot\b|\bvot(e|ers|ing)\b/i], ['Crackdown', /\bcrackdown\b/i], ['Talks', /\btalks\b|\bnegotiat\w+/i],
    ['Shooting', /\bshooting\b|\bgunman\b/i], ['Missiles', /\bmissiles?\b/i], ['Drones', /\bdrones?\b/i], ['Tankers', /\btankers?\b/i], ['Coup', /\bcoup\b/i], ['Trial', /\btrial\b|\bindict\w+/i],
    ['Resignation', /\bresign(s|ed|ation)?\b/i], ['Collapse', /\bcollaps(e|es|ed|ing)\b/i, 1], ['Chaos', /\bchaos\b|\bwar zone\b|\bmayhem\b/i, 1]
  ];
  var NUMRX = /\b((?:at least|over|more than|nearly|almost|some)\s+)?(\d{1,3}(?:,\d{3})+|\d{2,})\s+(?:people\s+)?(arrested|detained|dead|killed|injured|wounded|missing|protesters|rioters|troops|soldiers|missiles|drones|homes|buildings|cars|outlets|countries)\b/i;

  // What the set measurably is. Every name in it carries its share: the part of the items that name it.
  function analyse(set) {
    var n = set.length, by = {}, outlets = {}, kinds = { video: 0, post: 0, article: 0, image: 0 }, views = 0, maxLike = 0, t0 = Infinity, t1 = 0, W = [], wsum = 0;
    // the story of each item counts what the hourly search found FOR it too (storyFn: rel and deep), as the run order does;
    // R.storyOf alone knows only a story's own items, so a show of one hot story read under half and lost its written words
    var sOf = storyFn();
    set.forEach(function (it, i) {
      var h = sOf(it);
      if (h) { (by[h.id] = by[h.id] || { h: h, n: 0 }).n++; }
      var r = R.reach(it) || {}, lk = R.likes ? R.likes(it) : likes(it);
      var w = 1 + (it.hot || 0) / 50 + (lk ? Math.log(1 + lk) / Math.LN10 / 2 : 0) + (i < 3 ? 0.5 : 0);
      W.push(w); wsum += w;
      var o = it.h || it.nm || ''; if (o) outlets[o] = (outlets[o] || 0) + w;
      kinds[typeOf(it)] = (kinds[typeOf(it)] || 0) + 1;
      if (r.views) views += r.views;
      if (lk && lk > maxLike) maxLike = lk;
      var ms = Date.parse(it.d || ''); if (!isNaN(ms)) { t0 = Math.min(t0, ms); t1 = Math.max(t1, ms); }
    });
    var stories = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.n - a.n || b.h.score - a.h.score; });
    var dom = stories.length && stories[0].n / n >= 0.5 ? stories[0].h : null;
    var domTitle = dom ? String(dom.title || '') : '';
    // ---- the names: every name is scored by the items that carry it (plain share and share weighted by heat)
    var names = {};
    function add(key, e) { if (!names[key]) { e.hits = 0; e.wh = 0; names[key] = e; } return names[key]; }
    function country(it) { var c = R.placeOf ? R.placeOf(it) : ''; return c ? (SAY[c] || c) : ''; }
    ENT.forEach(function (e) { add(e[0], { name: e[0], up: e[1], rx: e[2], foe: !!e[3], kind: e[4], of: e[5] }); });
    var cs = COUNTRIES.slice();
    set.forEach(function (it) { var c = country(it); if (c && cs.indexOf(c) < 0) cs.push(c); });
    cs.forEach(function (c) { if (!names[c]) add(c, { name: c, up: CUP[c] || bare(c).toUpperCase(), rx: rxPlace(c), foe: false, kind: 'place', of: c }); });
    // names the headlines themselves repeat, capitalised in the middle of a sentence-case headline (Lyon, Limoges, Marseille)
    var cand = {};
    set.concat(dom ? [{ t: domTitle }] : []).forEach(function (it) {
      var ws = String(it.t || '').replace(/[^\w\s'’.,:!?-]/g, ' ').split(/\s+/).filter(Boolean);
      var caps = ws.filter(function (w) { return /^[A-Z]/.test(w) && w.length > 3; }).length, long = ws.filter(function (w) { return w.length > 3; }).length || 1;
      if (caps / long > 0.6) return;          // a Title Case or SHOUTING headline says nothing about which words are names
      ws.forEach(function (w, i) {
        var bareW = w.replace(/^['’]+|['’.,:!?]+$|['’]s$/g, '');
        if (!i || /[.!?:]$/.test(ws[i - 1]) || !/^[A-Z][a-zà-ÿ]{2,}$/.test(bareW) || NOTNAME.test(bareW)) return;
        cand[bareW] = (cand[bareW] || 0) + 1;
      });
    });
    Object.keys(cand).forEach(function (w) {
      if (Object.keys(names).some(function (k) { return names[k].rx.test(w); })) return;          // already known (Macron, France)
      var placeish = set.filter(function (it) { return new RegExp('\\b(in|across|from|near|outside)\\s+' + w + '\\b(?!\\s+[A-Z])').test(it.t || ''); }).length >= 2;
      // a name found by its capital is matched with its capital (24 Oct 2026: "Ilhan Nur Said Elmi" made "Said" a name, and the
      // case-free match then refused every description that says "who said what", leaving the maker with one)
      add(w, { name: w, up: w.toUpperCase(), rx: new RegExp('(^|[^A-Za-z])(' + w + ')([^A-Za-z]|$)'), foe: false, kind: placeish ? 'place' : 'name', of: '', open: true });
    });
    Object.keys(names).forEach(function (k) {
      var e = names[k];
      e.placed = 0; e.said = 0;
      set.forEach(function (it, i) { var c = country(it); if (e.kind === 'place' && c === e.name) e.placed++; if (e.rx.test(it.t || '')) e.said++; if (e.rx.test(textOf(it)) || (e.kind === 'place' && c === e.name)) { e.hits++; e.wh += W[i]; } });
      e.share = n ? Math.max(e.hits / n, wsum ? e.wh / wsum : 0) : 0;
      e.inTitle = !!domTitle && e.rx.test(domTitle);
      if (e.inTitle) e.share = Math.max(e.share, 0.34);          // the story's own title names its subject
    });
    // the story's own place (show_packs measured it over all of the story's items, not only these 25)
    if (dom && dom.s && dom.s.p && R.placeOf) { var sc = country({ p: dom.s.p }); if (sc && names[sc]) { names[sc].share = Math.max(names[sc].share, 0.5); names[sc].placed = Math.max(names[sc].placed || 0, 0.5 * n); } }
    var ok = Object.keys(names).map(function (k) { return names[k]; }).filter(function (e) { return e.share >= SHARE_MIN; }).sort(function (a, b) { return b.share - a.share; });
    // a person and their own country are one subject (Macron with France, Khamenei with Iran): keep the stronger first
    var E = ok.filter(function (e) { return !(e.kind === 'place' && ok.some(function (p) { return p.of === e.name && p !== e && p.share >= e.share; })); });
    // THE PLACE is where the items happen, not whose people they name: "Israeli settlers attack ... in West Bank" is placed
    // in the West Bank (18 October 2026: it was titled "Israel Attack"). The country most items are placed in wins when it
    // holds 30% of them; only a set with no such country falls back to the most named one.
    var places = ok.filter(function (e) { return e.kind === 'place' && !e.open; });
    var place = places.slice().sort(function (a, b) { return b.placed - a.placed; }).filter(function (e) { return e.placed >= 0.3 * n; })[0] || places[0] || null;
    var person = ok.filter(function (e) { return e.kind === 'person' || e.kind === 'group'; })[0] || null;
    var spots = ok.filter(function (e) { return e.kind === 'place' && e.open && e !== place; });
    // ---- what happened, and the hardest number the items state
    var ev = EVENTS.map(function (x) { var c = 0; set.forEach(function (it) { if (x[1].test(textOf(it))) c++; }); if (domTitle && x[1].test(domTitle)) c += n / 10; return { w: x[0], s: n ? c / n : 0, mood: !!x[2] }; })
      .filter(function (x) { return x.s >= 0.15; }).sort(function (a, b) { return b.s - a.s; });
    var evs = ev.filter(function (x) { return !x.mood; });          // "France Riots", never "France Chaos": a mood is not an event
    var num = null, byHeat = set.map(function (it, i) { return [it, W[i]]; }).sort(function (a, b) { return b[1] - a[1]; });
    for (var j = 0; j < byHeat.length && !num; j++) { var m = NUMRX.exec(String(byHeat[j][0].t || '')); if (m) num = { say: titleCase(((m[1] || '').trim() ? cap1(m[1].trim().toLowerCase()) + ' ' : '') + m[2] + ' ' + cap1(m[3].toLowerCase())), up: m[2] + ' ' + m[3].toUpperCase(), it: byHeat[j][0] }; }
    var quote = null, qm = /["“‘]([^"”’]{6,40})["”’]/.exec(domTitle);
    if (qm && words(qm[1]) >= 2 && words(qm[1]) <= 6) quote = qm[1].trim();
    var O = Object.keys(outlets).sort(function (a, b) { return (a.charAt(0) === '@') - (b.charAt(0) === '@') || outlets[b] - outlets[a]; });
    var span = t1 && t0 < Infinity ? (Date.now() - t0) / 3600000 : null, era;
    if (span != null && span <= 30) era = 'today';
    else if (span != null && span <= 24 * 8) era = 'this week';
    else if (span != null && t0 >= Date.parse('2023-10-07')) era = 'since October 7';
    else era = '';
    var mentions = function (re) { var c = 0; set.forEach(function (it) { if (re.test(textOf(it))) c++; }); return c; };
    return { n: n, dom: dom, stories: stories.map(function (s) { return s.h; }), E: E, all: names, place: place, person: person, spots: spots,
      ev: evs[0] ? evs[0].w : '', ev2: evs[1] ? evs[1].w : '', fire: ev.some(function (x) { return x.w === 'Fires'; }), chaos: ev.some(function (x) { return x.w === 'Chaos'; }), num: num, quote: quote, mentions: mentions,
      O: O, kinds: kinds, views: views, maxLike: maxLike, era: era, lead: set[0], H: headline(dom && dom.title ? { t: dom.title } : set[0]) };
  }
  var SHARE_MIN = 0.15;
  // The story in one sentence, as a sentence: the story's own first line (show_packs writes it in sentence case), else the
  // strongest headline with its shouting taken down.
  function sentence(A) {
    var d = A.dom && A.dom.s && A.dom.s.desc ? String(A.dom.s.desc) : '', m = /^.*?[.?!](\s|$)/.exec(d);
    var t = m && m[0].length >= 20 && m[0].length <= 220 ? m[0].trim() : clip(cleanHead(A.lead ? A.lead.t : A.H), 140);
    return cap1(calm(noDash(cleanHead(t))));
  }
  function say(e) { return e ? e.name : ''; }          // "the US", "France", "Macron": what a title writes

  // THE GATE. An option may name only what the items carry: every known or measured name in it must hold SHARE_MIN of the set
  // (or be in the story's own title). Fails closed for the option, never for the show: the story's own headline always passes.
  // ONE ITEM NEVER LICENSES A NAME (19 Oct 2026). In a story of 4 items one stray headline is 25%, so a written title built
  // on it ("Zelenskyy Warns Ukraine Will Not Prevail If US Takes Russia's Side" for a 1,000-drone strike) passed while the
  // phone gate, which asks for two headlines, stopped every publish of the site. So a name also needs two headlines that
  // say it, or the story's own title, or 15% of the items placed there: the same standard the phone gate counts.
  function fits(A, text) {
    var bad = '';
    Object.keys(A.all).some(function (k) {
      var e = A.all[k], carried = e.share >= SHARE_MIN && (e.said >= 2 || e.inTitle || e.placed >= SHARE_MIN * A.n);
      if (!carried && e.rx.test(text)) { bad = e.name; return true; } return false;
    });
    return !bad;
  }
  function lint(text, kind) {
    var t = String(text || '');
    if (!t.trim() || /undefined|NaN|\bnull\b|\[object/.test(t)) return false;
    if (/\b(\w+)\s+\1\b/i.test(t.replace(/\b(\d+)\b/g, ''))) return false;          // "The the US", "France France"
    if ((t.match(/"/g) || []).length % 2 || (t.match(/[“]/g) || []).length !== (t.match(/[”]/g) || []).length) return false;
    if (/\s(a|an|and|of|the|to|is|for|with|from)$/i.test(t.replace(/[?!.]+$/, ''))) return false;
    if (/: $|  |\s[,:.]/.test(t) || (kind === 'titles' && /, and /.test(t))) return false;
    if (kind === 'titles' && t.length > 80) return false;
    if (kind === 'covers' && words(t) > 4) return false;
    return true;
  }

  // The room's own words, when there is no written set for the show. Each option is built from a fact the set carries
  // (the place, the person, what happened, a number, a quote, the clips) and is offered only when that fact is there.
  function roomWords(A) {
    var live = st.kind === 'live', N = A.n, V = A.kinds.video || 0, E1 = A.E[0], E2 = A.E[1], E3 = A.E[2];
    var single = !!A.dom || A.stories.length <= 1 || N <= 2;
    var P = say(A.place), PER = A.person && (A.person.kind === 'person' || A.person.kind === 'group') ? say(A.person) : '';
    // subj names the show in two to four words: the place and what happened ("France Riots", "US Election", "West Bank
    // Attack": a compound never takes "the" twice), else the one name nearly every item carries. the: the same, ready to
    // follow a verb ("the France Riots", "Paxton"). pl: whether the event is plural, for "Are"/"Is", "Matter"/"Matters".
    var EV = A.ev, Pc = P ? cap1(P) : '', Pb = P ? cap1(bare(P)) : '';
    var lone = !EV ? (PER && A.person.share >= 0.5 ? PER : E1 && E1.kind !== 'place' && E1.share >= 0.6 ? cap1(say(E1)) : '') : '';
    var subj = EV && Pb ? Pb + ' ' + EV : lone, the = EV && Pb ? 'the ' + subj : subj, pl = /s$/.test(EV);
    var VIOLENT = /^(Riots|Protests|Clashes|Attack|War|Shooting|Strikes|Missiles|Drones)$/.test(EV);
    var name = A.dom && A.dom.w && A.dom.w.name ? A.dom.w.name : subj || clip(A.H, 40);
    var names = A.stories.filter(function (h) { return h.w && h.w.name; }).slice(0, 3).map(function (h) { return h.w.name; });
    if (names.length < 2) names = A.E.filter(function (e) { return !e.open; }).slice(0, 3).map(function (e) { return cap1(say(e)); });
    if (names.length < 2) single = true;
    var two = A.spots.filter(function (e) { return e.share >= 0.08; }).slice(0, 2).map(say);
    var pr = PER ? '(?:' + A.person.rx.source + ')' : '', where = !!PER && A.mentions(new RegExp(pr + '[^.]{0,40}(nowhere to be|hiding|missing|silent)|where is ' + pr, 'i')) >= 2;
    var when = A.era === 'today' ? 'Today' : A.era === 'this week' ? 'This Week' : '';
    var T = [];
    function t(id, tone, aim, s) { if (s) T.push({ t: noDash(s), tone: tone, aim: aim, id: id }); }
    if (single) {
      t('head', 'plain', 'clicks', A.H);
      if (A.num && subj) t('num-colon', 'plain', 'clicks', subj + ': ' + A.num.say);
      if (subj && two.length === 2) t('from-to', 'plain', 'watch', subj + ': From ' + two[0] + ' to ' + two[1]);
      if (subj) t('in-clips', 'plain', 'watch', V >= 3 ? subj + ', in ' + V + ' Videos' : subj + ': What the Sources Show');
      if (EV && subj && A.era === 'today') t('hour', 'plain', 'watch', subj + ', Hour by Hour');
      if (EV && PER && subj && !A.person.foe && PER !== Pc) t('test', 'mid', 'clicks', PER + '\'s Biggest Test Yet? ' + cap1(the));
      if (EV && subj) t('how-bad', 'mid', 'clicks', 'How Bad ' + (pl ? 'Are ' : 'Is ') + the + ', Really?');
      if (EV && P) t('beyond', 'mid', 'watch', 'Why ' + the + (pl ? ' Matter' : ' Matters') + ' Far Beyond ' + Pc);
      var E2ok = E2 && E2 !== A.place && E2 !== A.person && !E2.open && say(E2) !== P;
      if (subj) t('next', 'mid', 'watch', E2ok ? 'What ' + the + (pl || !EV ? ' Mean' : ' Means') + ' for ' + cap1(say(E2)) : cap1(the) + ': What Happens Next');
      if (A.num && P) t('num-now', 'bold', 'clicks', A.num.say + '. This Is ' + Pc + ' Right Now');
      if (A.fire && P) t('burning', 'bold', 'clicks', Pc + ' Is Burning' + (live ? ': Live' : ''));
      if (where) t('where', 'bold', 'clicks', 'Where Is ' + PER + '? ' + subj);
      if (PER && A.person.foe) t('losing', 'bold', 'clicks', 'Is ' + PER + ' Losing Control?');
      if (PER && A.quote) t('quote', 'bold', 'clicks', PER + ': "' + titleCase(A.quote) + '"');
      if (subj) t('nobody', 'bold', 'watch', 'What Nobody Is Telling You About ' + the);
      if (subj) t('sharing', 'bold', 'watch', live ? subj + ' LIVE: Every Clip, Every Reaction' : cap1(the) + ': The Footage Everyone Is Sharing');
      // A BLINDSPOT (18 Oct 2026, intel.js "who covered it"): one side of the media carried the story and the other not once,
      // counted by intel_live.py from our lean table. The fact is the count; the titles say only that.
      var BS = A.dom && A.dom.s && A.dom.s.bs && A.dom.s.ls ? A.dom.s : null;
      var bsSubj = subj || Pc || (E1 ? cap1(say(E1)) : ''), bsThe = subj ? the : bsSubj;
      if (BS && bsSubj) {
        var quiet = BS.bs === 'L' ? 'Left' : 'Right', loud = BS.bs === 'L' ? 'Right' : 'Left', nLoud = BS.ls[BS.bs === 'L' ? 2 : 0];
        t('bs-count', 'plain', 'clicks', bsSubj + ': ' + nLoud + ' ' + loud + ' Outlets Covered It, None on the ' + quiet);
        t('bs-why', 'bold', 'watch', 'Why Is the ' + quiet + ' Silent on ' + bsThe + '?');
      }
      if (!EV && E1) { t('latest', 'plain', 'clicks', cap1(say(E1)) + ': What Just Happened'); t('matters', 'mid', 'clicks', 'Why ' + cap1(say(E1)) + ' Matters More Than You Think'); }
    } else {
      t('m-biggest', 'plain', 'clicks', titleCase(listOf(names)) + ': ' + (when ? when + '\'s' : 'The') + ' Biggest Stories');
      t('m-sources', 'plain', 'clicks', titleCase(listOf(names.slice(0, 2))) + (when ? ': ' + when + ' in ' + N + ' Sources' : ': ' + N + ' Sources'));
      t('m-need', 'plain', 'watch', N + ' Stories You Need to Know: ' + titleCase(names[0]) + ' and More');
      t('m-explained', 'plain', 'watch', titleCase(names[0]) + ', ' + titleCase(names[1] || '') + ' and Everything Else, Explained');
      if (E1 && E2 && E3) t('m-three', 'mid', 'clicks', cap1(say(E1)) + ', ' + say(E2) + ' and ' + say(E3) + ': Everything That Happened' + (when ? ' ' + when : ''));
      t('m-start', 'mid', 'clicks', titleCase(names[0]) + ' Is Only the Start');
      t('m-next', 'mid', 'watch', titleCase(names[0]) + ', ' + titleCase(names[1] || '') + ' and What Comes Next');
      t('m-connect', 'mid', 'watch', 'How ' + titleCase(names[0]) + ' and ' + titleCase(names[1] || '') + ' Connect');
      t('m-bad', 'bold', 'clicks', E1 && E1.foe ? cap1(say(E1)) + ' Just Had a Very Bad ' + (A.era === 'today' ? 'Day' : 'Week') + '?' : 'The ' + N + ' Stories Everyone Is Fighting About');
      t('m-live', 'bold', 'clicks', live ? 'LIVE: ' + titleCase(names[0]) + ', ' + titleCase(names[1] || '') + ' and Your Questions' : 'Watch These ' + N + ' Clips Before You Pick a Side');
      t('m-media', 'bold', 'watch', 'What the Media Will Not Connect: ' + titleCase(names[0]) + ' and ' + titleCase(names[1] || ''));
      t('m-real', 'bold', 'watch', 'The Real Story Behind ' + titleCase(listOf(names.slice(0, 2))));
    }
    T = T.map(function (x) { return { t: titleCase(x.t), tone: x.tone, aim: x.aim, id: x.id }; });
    var up = function (s) { return String(s).toUpperCase(); };
    var C = [];
    function c(id, tone, s) { if (s) C.push({ t: s, tone: tone, id: id }); }
    if (subj) c('c-subj', 'plain', up(subj));
    if (A.num) c('c-num', 'plain', A.num.up.replace(/^(AT LEAST|OVER|MORE THAN|NEARLY|ALMOST|SOME)\s+/i, ''));
    c('c-count', 'plain', (N > 1 ? N + ' SOURCES' : 'THE SOURCE') + (when ? ', ' + when.toUpperCase() : ''));
    if (A.fire && P) c('c-fire', 'mid', up(bare(Pc)) + ' ON FIRE');
    if (A.chaos) c('c-chaos', 'mid', 'TOTAL CHAOS');
    c('c-what', 'mid', 'WHAT JUST HAPPENED');
    if (where) c('c-where', 'bold', 'WHERE IS ' + A.person.up + '?');
    if (PER && A.person.foe) c('c-corner', 'bold', A.person.up + ' CORNERED?');
    if (VIOLENT && P) c('c-out', 'bold', up(EV) + ' OUT OF CONTROL?');
    if (single && A.dom && A.dom.s && A.dom.s.bs) c('c-silent', 'bold', 'THE ' + (A.dom.s.bs === 'L' ? 'LEFT' : 'RIGHT') + ' IS SILENT');
    c('c-watch', 'bold', live ? 'WE\'RE LIVE' : 'WATCH THIS');
    var src = A.O.slice(0, 3), more = A.O.length - src.length;
    var from = src.length ? ' from ' + listOf(src.concat(more > 0 ? [more + ' more'] : [])) : '';
    var what = N + (N === 1 ? ' source' : ' sources'), onVid = V ? (V === N ? (N === 1 ? ', on video' : ', all on video') : ', ' + V + ' of them on video') : '';
    var lead = sentence(A).replace(/[.?!]+$/, '');
    var fact = A.num && A.num.it ? clip(cleanHead(A.num.it.t), 110).replace(/[.?!]+$/, '') : '';
    if (fact && fact.toLowerCase() === lead.toLowerCase()) fact = '';
    var factLine = fact ? ' ' + cap1(calm(fact)) +(A.num.it.h || A.num.it.nm ? ' (' + (A.num.it.h || A.num.it.nm) + ')' : '') + '.' : '';
    var spotsLine = two.length === 2 ? ' From ' + two[0] + ' to ' + two[1] + ', ' : ' ';
    var D = [
      { t: (subj ? subj + ': ' : '') + lead + '.' + factLine + ' ' + cap1(what) + from + onVid + (A.era ? ', ' + A.era : '') + '. ' + (live ? 'On this live show we go through every one of them, in order.' : 'This video goes through every one of them, in order.'), tone: 'plain', id: 'd-plain' },
      { t: (single ? cap1(subj || name) : titleCase(listOf(names.slice(0, 2)))) + ': what happened, who said what, and what it means.' + factLine + ' ' + (live ? 'Live, we' : 'We') + ' go through ' + what + from + onVid + ', each one linked below.', tone: 'mid', id: 'd-mid' },
      { t: 'Everyone is talking about ' + (single ? (the || bare(name)) : listOf(names.slice(0, 2))) + '.' + (two.length === 2 ? spotsLine + 'here is what the ' + (V ? 'clips' : 'sources') + ' actually show' : ' Here is what the ' + (V ? 'clips' : 'sources') + ' actually show') + from + ', and what the coverage leaves out. Every source is linked below, so check it yourself.', tone: 'bold', id: 'd-bold' }
    ].map(function (x) { return { t: noDash(x.t).replace(/\.\./g, '.').replace(/\s+/g, ' '), tone: x.tone, id: x.id }; });
    var opener = lead + '.' + factLine;
    var introB = 'Welcome in. ' + opener + ' We have ' + what + onVid + ', and we are going through every one. ';
    var intro = { plain: introB + 'Tell me in the chat what you make of it.', mid: introB + 'Stay to the end, because the last one changes how the first one reads. Put your take in the chat.',
      bold: 'Welcome in. ' + opener + ' You have seen the headlines. Now we look at the actual ' + (V ? 'footage' : 'sources') + ', ' + what + onVid + ', and you decide. Drop your take in the chat.' };
    var hook = { plain: (A.num ? A.num.say + '. ' : '') + lead + '. Here is what the ' + (V ? 'clips' : 'sources') + ' show.', mid: lead + '. Here is what it shows, and what it does not.', bold: A.num ? A.num.say + '. And that is not even the worst of it.' : 'You have seen the headline. You have not seen this.' };
    return { titles: T, covers: C, descs: D, intro: intro, hook: hook, src: 'room' };
  }
  // The written words of the show's main story, when the show is mostly that story and the words were written for it.
  function writtenWords(A) {
    var w = A.dom && A.dom.w;
    if (!w || !Array.isArray(w.titles) || !w.titles.length) return null;
    var ok = function (x) { return x && typeof x.t === 'string' && x.t.trim(); };
    return { titles: w.titles.filter(ok).map(function (x, i) { return { t: noDash(x.t), tone: x.tone, aim: x.aim, w: 1, id: 'w' + i }; }), covers: (w.covers || []).filter(ok).map(function (x, i) { return { t: noDash(x.t), tone: x.tone, w: 1, id: 'w' + i }; }),
      descs: (w.descs || []).filter(ok).map(function (x, i) { return { t: noDash(x.t), tone: x.tone, w: 1, id: 'w' + i }; }), intro: w.intro || {}, hook: w.hook || {}, src: 'written' };
  }
  function build(set) {
    var A = analyse(set), room = roomWords(A), wr = writtenWords(A);
    var P = wr ? { titles: wr.titles.concat(room.titles), covers: wr.covers.concat(room.covers), descs: wr.descs.concat(room.descs),
      intro: Object.assign({}, room.intro, wr.intro), hook: Object.assign({}, room.hook, wr.hook), src: 'written' } : room;
    var dropped = [];
    ['titles', 'covers', 'descs'].forEach(function (k) {
      var seen = {};
      P[k] = P[k].filter(function (x, i) {
        var key = x.t.toLowerCase();
        if (seen[key]) return false; seen[key] = 1;
        var head = k === 'titles' && x.id === 'head';          // the story's own headline: the items' own words, always offered
        if (!head && (!lint(x.t, k) || !fits(A, x.t))) { dropped.push(k + ': ' + x.t); return false; }
        return true;
      });
    });
    // never fewer than three titles either (18 Oct 2026, "Dispute in Front of Home Leads to Fatal..." had two): titles
    // that name nothing, so they always fit, offered only when the others were refused
    if (P.titles.length < 3) {
      var Nt = A.n, Vt = A.kinds.video || 0;
      ['What Really Happened? ' + (Nt > 1 ? 'The ' + Nt + ' Sources, One by One' : 'The Source, Line by Line'), 'Watch Before You Share: What the ' + (Vt ? 'Clips' : 'Sources') + ' Show', 'The Full Story, Source by Source']
        .forEach(function (t, i) { if (P.titles.length < 3 && lint(t, 'titles') && fits(A, t) && !P.titles.some(function (y) { return y.t.toLowerCase() === t.toLowerCase(); })) P.titles.push({ t: t, tone: ['plain', 'mid', 'plain'][i], id: 't-safe' + i }); });
    }
    // never fewer than two descriptions (18 Oct 2026: a mixed hour, France riots with Milan and US items, had every
    // drafted description refused by fits() for naming a place only a few items carry, and the maker offered none):
    // two that name nothing but the sources, so they always fit, offered only when the others were refused
    if (P.descs.length < 2) {
      var live0 = st.kind === 'live', V0 = A.kinds.video || 0, N0 = A.n, src0 = A.O.slice(0, 3), more0 = A.O.length - src0.length;
      var from0 = src0.length ? ' from ' + listOf(src0.concat(more0 > 0 ? [more0 + ' more'] : [])) : '';
      var onV0 = V0 ? (V0 === N0 ? (N0 === 1 ? ', on video' : ', all on video') : ', ' + V0 + ' of them on video') : '';
      var what0 = N0 + (N0 === 1 ? ' source' : ' sources') + from0 + onV0;
      // 21 Oct 2026: an outlet named after a place ("from Iran International") can itself be refused by fits(), so the
      // last two name no outlet at all and always fit
      var bare0 = N0 + (N0 === 1 ? ' source' : ' sources') + onV0;
      [{ t: 'What happened, who said what, and what it means: ' + what0 + '. ' + (live0 ? 'On this live show we go through every one of them, in order, each one linked below.' : 'This video goes through every one of them, in order, each one linked below.'), tone: 'plain', id: 'd-safe1' },
       { t: 'Here is what the ' + (V0 ? 'clips' : 'sources') + ' actually show, and what the coverage leaves out: ' + what0 + '. Every source is linked below, so check it yourself.', tone: 'mid', id: 'd-safe2' },
       { t: 'What happened, who said what, and what it means: ' + bare0 + '. ' + (live0 ? 'On this live show we go through every one of them, in order, each one linked below.' : 'This video goes through every one of them, in order, each one linked below.'), tone: 'plain', id: 'd-safe3' },
       { t: 'Here is what the ' + (V0 ? 'clips' : 'sources') + ' actually show, and what the coverage leaves out: ' + bare0 + '. Every source is linked below, so check it yourself.', tone: 'mid', id: 'd-safe4' }]
        .forEach(function (x) { x.t = noDash(x.t).replace(/\s+/g, ' '); if (P.descs.length < 2 && lint(x.t, 'descs') && fits(A, x.t) && !P.descs.some(function (y) { return y.t.toLowerCase() === x.t.toLowerCase(); })) P.descs.push(x); });
    }
    P.dropped = dropped;
    P.A = A;
    return P;
  }
  // The options in the order the dials ask for: the chosen style and aim first, the written ones before the room's, and
  // then what creators actually pick (data/show-learn.json, build/show_learn.py: a template picked often rises a little).
  // A Blindspot angle (bs-*, c-silent) rises whatever the dials say: one side's silence is the story's strongest fact.
  function ranked(list, kind) {
    var L = LEARN, pk = L && L.picks && L.picks[kind] || {};
    return list.map(function (x, i) { return { x: x, s: (x.w ? 10 : 0) + (x.tone === st.tone ? 4 : 0) + (kind === 'titles' && x.aim === st.aim ? 2 : 0) +
        (/^(bs-|c-silent)/.test(x.id || '') ? 5 : 0) + Math.min(1.5, (pk[x.id] || 0) / 4) - i / 1000 }; })
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

  /* ---------------------------------------------------------------- the run order, story by story
     Armin, 18 October 2026: "come up with the best order of the items so that the most viral, most important things are
     first. We don't jump around ... give me the option to change ... Always take notes on how people and I change it."
     And 24 October 2026, on the order that came out: "when I create a filter and I have 20 tweets to show, and then I click
     make a show ... you don't put it in a logical order for that to make sense on the show. It goes all over the place.
     Come up with the best strategy to fix that." What made it jump, read in the 18 October code: a thread held at most four
     items, so a big story was cut into several threads that were then interleaved with other stories by strength; a Persian
     headline had no words at all (only Latin letters were kept), so on Iran Uncensored nothing grouped; threads followed
     each other by strength alone, never by how related they were; inside a thread the order was likeness to its first
     item, not the order a host tells a story; and the room's own stories (R.storyOf) were only ever a penalty.
     So now, the show is told story by story:
     STRENGTH (vScore, scorer): how hot an item is and how far it has travelled, times how squarely it is ON the show's subject.
     SEGMENTS (segment): an item's segment is its story of the hour (R.storyOf: a story build/show_packs.py made; the room's
     own fallback groups by country are not stories), whole, with no cap. An item with no story joins the segment it is
     strongly related to (JOIN): the rare words two items share in either language (Persian letters made one first: ي ی,
     ك ک, the half space out, a small list of Persian small words), the people and groups both name (R.actors), the X posts
     a news story lists as its own (rx), and, weaker, the exact place, the country, the names, the subjects and the region.
     A word or a mark that half the set shares separates nothing. Otherwise an item is a segment of its own.
     WHICH GO IN (pickSet), when the filters leave more than the show holds: segments in order of strength, each giving its
     strongest items up to a cap (8 for a live show, 6 for a video), so a big story comes in with its core and never as one
     stray item; then, while there is room, the rest of each segment in the same order. A repost of the same thing once.
     THE ORDER (threadOrder): the strongest segment opens (a live show opens on something to look at when one is nearly as
     strong, as before); after each segment the next is the one most related to it (REL) among those within about a third of
     the strongest left (all the war stories together, then US politics), else the strongest left. A story once left is
     never come back to.
     INSIDE A SEGMENT (tell), the order a host tells it: what happened (the best report: an article or a news outlet's
     video, unless the strongest clip is far stronger, then the clip opens), the evidence (clips and pictures, strongest
     first), the reactions (posts, most liked first), the other reports, and long commentary last; ties go older first, so
     the story moves forward in time.
     Every change a creator makes is kept on this device and, when they open the show screen or copy its package, sent to
     showedits/ (build/show_learn.py counts them). build/phone-test.html "THE RUN ORDER" holds the fixture that proves it. */
  var STOP = /^(the|and|for|that|this|these|those|with|from|have|has|had|are|was|were|will|would|could|should|just|now|they|their|them|there|then|what|when|where|which|who|whom|you|your|our|ours|not|but|all|out|into|about|after|over|more|most|than|very|been|being|its|his|her|she|him|how|why|can|does|did|doing|get|got|gets|says|said|say|today|tonight|yet|again|still|here|one|two|new|breaking|watch|live|video|full|report|update|amp|https|com|www|every|like|looking|look|people|country|make|made|going|know|think|thing|things|really|even|only|also|some|any|many|much|while|because|before|right|left|time|year|years|day|days|week|now|soon|happen|happening|want|need|see|seen|come|coming|take|taking|way|back|down|off|ever|never|always|another|other|same|first|last|next|big|huge|massive|literally|absolutely|holy|shit|fuck|damn|crap)$/;
  // Persian small words (written and spoken), made one the way normFa makes a headline: they link nothing
  var STOP_FA = /^(و|در|به|از|که|این|آن|اون|با|را|رو|برای|یک|یه|هم|تا|بر|است|هست|نیست|بود|بودن|شد|شده|شود|میشه|میشود|نمیشه|می|نمی|ها|های|خود|خودش|ما|شما|او|اونا|آنها|انها|ایشان|یا|اما|ولی|پس|چه|چی|کرد|کرده|کند|کنه|کنند|کنن|کردن|دارد|داره|دارند|دارن|گفت|گفته|باید|اگر|اگه|روی|پیش|بعد|قبل|همه|هر|دیگر|دیگه|نه|ای|اند|ایم|باشد|باشه|میکند|میکنه|توی|تو|اینکه|چون|حتی|فقط|الان|امروز|دیروز|امشب|ویدیو|ویدئو|فوری|خبر|خبری|گزارش|کامل|ببینید|زنده|جدید|بیشتر|هنوز|سال|روز|ساعت|شب|درباره|مورد|علیه|بین|بدون|عنوان|طور|چند|خیلی|کسی|چیزی|کار|حال|زمان|دو|سه|یکی|اینها|آن‌ها|اینجا|آنجا|اونجا|ببین|لطفا|نظر)$/;
  function normFa(s) { return String(s).replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, '').replace(/[ً-ٰٟـ]/g, '').replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); }); }
  var TOKS = {}, FEATS = {};          // the words and marks of each item, by its code: kept here, never written onto the room's items
  function toks(it) {
    var t = String(it.t || ''), tx = typeof it.tx === 'string' && it.tx.length > t.length ? it.tx.slice(0, 400) : t, key = R.code(it) + '|' + tx.length;
    if (TOKS[key]) return TOKS[key];
    var o = {};
    normFa(tx).split(/[^\p{L}\p{N}]+/u).forEach(function (raw, i) {
      if (!raw) return;
      if (/[؀-ۿ]/.test(raw)) {          // Persian (or Arabic) letters: the plural ending off, the small words out
        var p = raw.replace(/(های|ها)$/, '');
        if (p.length < 3 || STOP_FA.test(raw) || STOP_FA.test(p)) return;
        o[p] = Math.max(o[p] || 0, 1);
        return;
      }
      var w = raw.toLowerCase();
      if (w.length < 3 || STOP.test(w) || /^\d+$/.test(w)) return;
      var name = i > 0 && /^[A-Z][a-zà-ÿ]/.test(raw);
      w = w.replace(/(ings|ing|ers|ies|es|ed|s)$/, '') || w;
      if (w.length >= 3) o[w] = Math.max(o[w] || 0, name ? 1.5 : 1);
    });
    return (TOKS[key] = o);
  }
  // the structured marks an item carries, as tokens with their own weight: the people and groups it names count most
  function feats(it) {
    var key = R.code(it);
    if (FEATS[key]) return FEATS[key];
    var f = {}, c = R.placeOf ? R.placeOf(it) : '';
    (R.actors ? R.actors(it) : []).forEach(function (a) { f['a:' + a] = 1.6; });
    (R.names ? R.names(it) : []).forEach(function (n) { f['n:' + n] = 0.5; });
    if (it.p && it.p !== 'global' && it.p !== c) f['p:' + it.p] = 0.8;
    if (c) f['c:' + c] = 0.7;
    (R.subjects ? R.subjects(it) : []).forEach(function (k) { f['t:' + k] = 0.4; });
    (R.fx ? R.fx(it) : []).forEach(function (k) { f['f:' + k] = 0.3; });
    return (FEATS[key] = f);
  }
  function vScore(it) {
    var lk = R.likes ? R.likes(it) : likes(it), r = R.reach(it) || {};
    return (+it.hot || 0) + (it._v || 0) * 0.4 + (lk ? 9 * Math.log(1 + +lk) / Math.LN10 : 0) + (r.views ? 5 * Math.log(1 + r.views) / Math.LN10 : 0);
  }
  // strength times subject: a function of an item, measured against the pool the filters leave
  function scorer(pool) {
    var A0 = analyse(pool), keys = A0.E.filter(function (e) { return e.share >= 0.3; }).slice(0, 3), place = A0.place && A0.place.share >= 0.3 ? A0.place : null;
    var evRx = null; EVENTS.forEach(function (x) { if (x[0] === A0.ev) evRx = x[1]; });
    if (place && keys.indexOf(place) < 0) keys.push(place);
    if (!keys.length) return vScore;          // a mixed set has no one subject to be on: strength alone
    var memo = {};
    return function (it) {
      var k = R.code(it); if (memo[k] != null) return memo[k];
      var tx = textOf(it), c = R.placeOf ? R.placeOf(it) : '', on = keys.some(function (e) { return e.rx.test(tx) || (e.kind === 'place' && (SAY[c] || c) === e.name); }) || (!!evRx && evRx.test(tx));
      return (memo[k] = vScore(it) * (on ? 1 : 0.36));
    };
  }
  // How related two items are: the rare words and marks they share, each weighted by how rare it is in this set
  function simOf(list) {
    var df = {}, N = list.length || 1, raw = function (it) { return String(it.id || '').replace(/^L/, ''); };
    list.forEach(function (it) { Object.keys(toks(it)).concat(Object.keys(feats(it))).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
    var idf = function (w) { var d = df[w] || 0; return d < 2 || d > Math.max(2, N * 0.5) ? 0 : Math.log(1 + N / d); };
    return function (a, b) {
      var ta = toks(a), tb = toks(b), fa = feats(a), fb = feats(b), s = 0;
      Object.keys(ta).forEach(function (w) { if (tb[w]) s += idf(w) * Math.max(ta[w], tb[w]); });
      Object.keys(fa).forEach(function (w) { if (fb[w]) s += idf(w) * fa[w]; });
      // a news story names the X posts that share its words (intel_live.py join_x, rx): the same story, whatever else
      if ((Array.isArray(a.rx) && a.rx.indexOf(raw(b)) >= 0) || (Array.isArray(b.rx) && b.rx.indexOf(raw(a)) >= 0)) s += 4;
      return s;
    };
  }
  function sameWords(a, b) {
    var ta = Object.keys(toks(a)), tb = toks(b), n = 0; ta.forEach(function (w) { if (tb[w]) n++; });
    var u = ta.length + Object.keys(tb).length - n; return u > 3 && n / u >= 0.8;
  }
  var JOIN = 2.4, REL = 2, NEAR_STR = 0.65;
  // the story an item belongs to: one build/show_packs.py made (it carries s); the room's fallback groups by country do not
  // An item the hourly search found FOR a story (build/intel_deep.py: rel and deep, the story's ids) is in that story too.
  function storyFn(opt) {
    if (opt && typeof opt.storyOf === 'function') return opt.storyOf;
    var found = {};
    (R.hots ? R.hots() : []).forEach(function (h) { if (h.s && h.ids) Object.keys(h.ids).forEach(function (id) { if (!found[id]) found[id] = h; }); });
    return function (it) { var h = R.storyOf ? R.storyOf(it) : null; return h && h.s ? h : found[it.id] || null; };
  }
  function segment(list, score, sim, storyOf) {
    var segs = [], by = {}, order = list.slice().sort(function (a, b) { return score(b) - score(a); });
    order.forEach(function (it) { var h = storyOf(it); if (!h) return; var k = 's' + h.id; if (!by[k]) segs.push(by[k] = { key: k, h: h, its: [] }); by[k].its.push(it); });
    order.forEach(function (it) {
      if (storyOf(it)) return;
      var best = null, bs = 0;
      segs.forEach(function (g) {
        var ss = g.its.map(function (x) { return sim(it, x); }).sort(function (a, b) { return b - a; });
        var s = ss.length > 1 ? (ss[0] + ss[1]) / 2 : ss[0];
        if (s > bs) { bs = s; best = g; }
      });
      if (best && bs >= JOIN) best.its.push(it); else segs.push({ key: 'i' + R.code(it), h: null, its: [it] });
    });
    segs.forEach(function (g) {
      g.its.sort(function (a, b) { return score(b) - score(a); });
      g.str = score(g.its[0]) + (g.its[1] ? 0.3 * score(g.its[1]) : 0) + (g.its[2] ? 0.15 * score(g.its[2]) : 0);
    });
    return segs.sort(function (a, b) { return b.str - a.str; });
  }
  // what an item is in the telling of a story: the report, the clip (or picture), a reaction, or long commentary
  function roleOf(it) {
    var k = typeOf(it), dur = +it.dur || 0;
    if (k === 'article') return it.src === 'X' ? 'reaction' : 'report';          // an X post that links an article is somebody's take on it
    if (it.src === 'YouTube') {
      if (/\/shorts\//.test(it.u || '')) return 'clip';
      if (it.cat === 'commentary' || dur > 20 * 60) return 'talk';
      return 'report';          // a news outlet's video (cat news), or a channel the room has no word for: the news
    }
    if (k === 'video' || k === 'image') return 'clip';
    return 'reaction';
  }
  function tell(its, score, live) {
    var older = function (a, b) { return (Date.parse(a.d || '') || 0) - (Date.parse(b.d || '') || 0); };
    var by = function (f) { return function (a, b) { return (f(b) - f(a)) || older(a, b); }; };
    var lk = function (it) { var l = R.likes ? R.likes(it) : likes(it); return +l || 0; };
    var g = { report: [], clip: [], reaction: [], talk: [] };
    its.forEach(function (it) { g[roleOf(it)].push(it); });
    g.report.sort(by(score)); g.clip.sort(by(score)); g.talk.sort(by(score));
    g.reaction.sort(function (a, b) { return (lk(b) - lk(a)) || (score(b) - score(a)) || older(a, b); });
    var out = [], rep = g.report, v0 = g.clip[0], lead = rep[0];
    // the clip opens when it is far stronger than any report; and a live show's first story opens on something to look at
    if (lead && v0 && score(v0) > score(lead) * (live ? 0.85 : 1.6)) lead = null;
    if (lead) { out.push(lead); rep = rep.slice(1); return out.concat(g.clip, g.reaction, rep, g.talk); }
    // the clip opened: what happened comes straight after it, then the rest of the evidence
    return g.clip.slice(0, 1).concat(rep.slice(0, 1), g.clip.slice(1), g.reaction, rep.slice(1), g.talk);
  }
  var NEARV = 0.85;
  /* One address per thing, without its tracking (24 Oct 2026). Cutting the whole query made article.php?id=1 and ?id=2 one
     address, so the second article never got in. Now only what says who shared it is dropped (utm_ and the click ids,
     share tokens); everything else stays, sorted, so the same link shared twice is still one. On X a post is its path:
     its ?s= and ?t= are the share source and token, and nothing on X's side needs them. */
  var TRACK = /^(utm_\w*|fbclid|gclid|gclsrc|dclid|gbraid|wbraid|msclkid|yclid|twclid|ttclid|li_fat_id|mc_cid|mc_eid|_hsenc|_hsmi|mkt_tok|igsh|igshid|si|ref|ref_src|ref_url|cmpid|smid|ocid|at_medium|at_campaign|share|sharetype|feature)$/i;
  function urlKey(u0) {
    var s = String(u0 || '').replace(/#.*$/, ''), at = s.indexOf('?'), base = at < 0 ? s : s.slice(0, at), qs = at < 0 ? '' : s.slice(at + 1);
    base = base.replace(/^https?:\/\/(www\.|mobile\.|m\.)?/i, '');
    if (/^(x|twitter)\.com\//i.test(base)) qs = '';
    var keep = qs.split('&').filter(function (p) {
      if (!p) return false;
      var k = p.split('=')[0]; try { k = decodeURIComponent(k); } catch (e) { }
      return !TRACK.test(k);
    }).sort();
    return base + (keep.length ? '?' + keep.join('&') : '');
  }
  function pickSet(all, opt) {
    var score = scorer(all), sorted = all.slice().sort(function (a, b) { return score(b) - score(a); }), cand = [], seenU = {};
    var want = Math.max(maxN() * 4, 120);
    for (var i = 0; i < sorted.length && cand.length < want; i++) {
      // one address per thing: a YouTube video by its id (24 Oct 2026: cutting the query made every watch?v= link one address,
      // so a show only ever held one YouTube video)
      var it = sorted[i], y = R.yt ? R.yt(it.u) : '', u = y ? 'yt:' + y : urlKey(it.u);
      if (u && seenU[u]) continue;
      if (cand.some(function (x) { return sameWords(x, it); })) continue;          // the same clip reposted with the same words
      if (u) seenU[u] = 1;
      cand.push(it);
    }
    var out = cand;
    if (cand.length > maxN()) {
      var segs = segment(cand, score, simOf(cand), storyFn(opt)), cap = maxN() >= 40 ? 8 : maxN() >= 20 ? 6 : 4;
      out = [];
      segs.forEach(function (g) { g.its.slice(0, cap).forEach(function (x) { if (out.length < maxN()) out.push(x); }); });
      segs.forEach(function (g) { g.its.slice(cap).forEach(function (x) { if (out.length < maxN()) out.push(x); }); });
    }
    out.score = score;
    return out;
  }
  // The set in the order it is told: segments (above), the strongest first, each followed by the most related one near it
  // in strength; inside each, the order a host tells it. why: one plain line per item; segs: each segment, where it starts.
  function threadOrder(set, opt) {
    var score = set.score || vScore, sim = simOf(set), live = st.kind === 'live' && !(opt && opt.video);
    var visual = function (it) { var k = typeOf(it); return k === 'video' || k === 'image'; };
    var left = segment(set, score, sim, storyFn(opt));
    if (!left.length) return { list: [], why: {}, threads: 0, segs: [], segOf: {} };
    var top0 = score(left[0].its[0]), vis0 = function (g) { return g.its.some(function (x) { return visual(x) && score(x) >= top0 * NEARV; }); };
    // a live show opens on something to look at: the segment with a video or picture nearly as strong as the strongest goes first
    var first = live && !vis0(left[0]) ? left.filter(vis0)[0] || left[0] : left[0];
    // how related two segments are: each item's best match on the other side, the middle one of them taken both ways, so one stray joke post
    // that names Netanyahu does not make a celebrity story "related" to a West Bank attack: both sides must be about the other
    var rel = function (A, B) {
      var best = function (P, Q) {
        var m = P.its.map(function (x) { return Math.max.apply(null, Q.its.map(function (y) { return sim(x, y); })); }).sort(function (a, b) { return a - b; }), h = m.length >> 1;
        return m.length % 2 ? m[h] : (m[h - 1] + m[h]) / 2;          // the median: one item that happens to share a name moves nothing
      };
      return Math.min(best(A, B), best(B, A));
    };
    var placed = [first]; left.splice(left.indexOf(first), 1); first.relTo = null;
    while (left.length) {
      var last = placed[placed.length - 1], strong = left[0].str, best = null, br = REL;
      left.forEach(function (g) { if (g.str < strong * NEAR_STR) return; var r = rel(last, g); if (r > br) { br = r; best = g; } });
      var next = best || left[0];
      next.relTo = best ? last : null;
      placed.push(next); left.splice(left.indexOf(next), 1);
    }
    var out = [], why = {}, segs = [], segOf = {};
    placed.forEach(function (g, gi) {
      var its = tell(g.its, score, live && gi === 0), at = out.length + 1;
      g.at = at;
      segs.push({ at: out.length, n: its.length, name: segName(g), rel: !!g.relTo, relAt: g.relTo ? g.relTo.at : 0 });
      var sawReport = false;
      its.forEach(function (it, k) {
        var c = R.code(it), role = roleOf(it);
        segOf[c] = gi;
        if (!k) why[c] = gi === 0 ? 'Opens the show: the biggest story' : g.relTo ? 'Next story, related to #' + g.relTo.at : 'Next story: the biggest left';
        else why[c] = role === 'report' ? (sawReport ? 'More reporting' : 'What happened') : role === 'clip' ? (typeOf(it) === 'image' ? 'The picture' : 'The clip') : role === 'reaction' ? 'Reaction' : 'Commentary';
        if (role === 'report') sawReport = true;
        out.push(it);
      });
    });
    return { list: out, why: why, threads: segs.length, segs: segs, segOf: segOf };
  }
  // a segment's name: its story's own name, else its strongest headline, cut at a clause
  function segName(g) {
    if (g.h && g.h.name) return String(g.h.name);
    return clip(cleanHead(g.its[0].t), 64) || String(g.its[0].t || '').slice(0, 64);
  }
  // Where each segment of a list starts (indexes), by the segments of the best order: a creator's own order still shows
  // where it changes story. An item the best order does not know is a segment of its own.
  function segStarts(list, best) {
    var so = best && best.segOf || {}, out = [];
    list.forEach(function (it, i) { var s = so[R.code(it)]; if (!i || s == null || s !== so[R.code(list[i - 1])]) out.push(i); });
    return out;
  }

  /* ---------------------------------------------------------------- the switch, and the maker */
  var tools = root.querySelector('.ir-tools');
  if (!tools) return;
  /* FOR EVERYONE (Armin, 19 October 2026: "other people, when they're logged in, are not seeing it. This should have been
     available for everybody"). The switch sat at the foot of the Filters drawer, so nobody but him ever found it. Now
     "Make a show" is a button on the room's one bar, beside Add, for anyone, signed in or not: making a show needs no
     account; saving it and getting a link to send does (free), because a saved show is a public page with a name on it.
     ONE DOOR, AND THE SAME PAGE FOR EVERYONE (21 October 2026, Armin: "there are just so many buttons in so many places
     doing the same thing", and he saw the maker as his alone). The 19 Oct button was ADDED beside the old design instead
     of replacing it: the Filters drawer kept its "Show maker" switch, and his device remembered the switch, so his page
     drew a "Make a show from these 100 / Make the show" strip above the map that no stranger ever saw. Three doors to one
     tool, and two different pages. Now: this button is the only door; it opens the whole maker at once; the maker's head
     closes it; nothing about it is remembered between visits; Brief me lives inside it as the quick briefing.
     build/phone-test.html "ONE DOOR" counts the doors and compares his page with a stranger's. */
  var mkb = document.createElement('button');
  mkb.type = 'button'; mkb.className = 'ir-cb ir-cb-show'; mkb.id = 'ir-mk-b'; mkb.setAttribute('aria-pressed', 'false'); mkb.setAttribute('aria-controls', 'ir-sm');
  mkb.innerHTML = ICON.play + '<span>' + esc(T('Make a show')) + '</span>';
  var cmdb = root.querySelector('.ir-cmd-b'), addb = $('ir-add-b');
  if (cmdb) { if (addb && addb.parentNode === cmdb) cmdb.insertBefore(mkb, addb); else cmdb.appendChild(mkb); }
  var panel = document.createElement('section');
  panel.className = 'ir-sm'; panel.id = 'ir-sm'; panel.hidden = true; panel.setAttribute('aria-label', T('Make a show'));
  var anchor = $('ir-main');          // the show maker is one bar, right above the map (18 Oct 2026: the map comes first)
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor); else root.appendChild(panel);          // an older page without #ir-main still gets the panel
  var msg = document.createElement('p');
  msg.className = 'ir-crmsg'; msg.id = 'ir-crmsg'; msg.setAttribute('aria-live', 'polite');
  tools.parentNode.insertBefore(msg, tools.nextSibling);

  function lp(cb, tries) { if (window.LP && window.LP.members) { cb(window.LP); return; } if ((tries || 0) > 40) { cb(null); return; } setTimeout(function () { lp(cb, (tries || 0) + 1); }, 150); }
  function signedIn(L) { return !!(L && L.members.who && L.members.who()); }
  /* READ ON OPEN (24 October 2026; Armin, on a story he had open: "This will make it not usable for a show"). A post the
     hourly read has not reached is read the moment a signed-in creator opens it: replyasks/<x_id | yt_id> gets
     {st: 'ask'} (firebase/firestore.rules "replyasks"), build/intel_replies.py --asks on his PC answers it within about a
     minute, and this waits for the answer and hands it to intel.js (R.rpAsk). cb(entry, 'asking' | 'done' | 'fail' |
     'unread'): 'unread' when this account may not ask (the rules refused), so the panel shows only the link. */
  /* WAITING FOR THE ANSWER (24 Oct 2026). It read the ask's document every 5 seconds for up to 5 minutes, per post: a
     45-row show opened as a creator was about 2,700 reads. Now one listener per post (onSnapshot: a read only when the
     document changes), closed the moment the answer, a failure or the 5 minutes come; polling, slowing down, only where
     the database script has no listener. What is remembered: an answer, and an ask under way. A failure or a refusal is
     tried again on the next open after a minute (it was kept for good, so one cold start of his PC left a post "could not
     be read" until the page was reloaded), and an ask nobody answered in 30 minutes is asked again, not waited on. */
  var RPA = {}, RPA_RETRY = 60000;
  function askReplies(k, cb) {
    var a = RPA[k];
    if (a && (a.st === 'asking' || a.st === 'done' || Date.now() - a.t < RPA_RETRY)) { if (a.st === 'asking') a.cbs.push(cb); cb(a.e, a.st); return; }
    a = RPA[k] = { st: 'asking', e: null, cbs: [cb], t: Date.now() };
    cb(null, 'asking');
    function end(e, st) { if (a.st !== 'asking') return; a.st = st; a.e = e; a.t = Date.now(); var c = a.cbs; a.cbs = []; c.forEach(function (f) { try { f(e, st); } catch (x) { } }); }
    lp(function (L) {
      if (!L || L.off || !L.members.fb || !signedIn(L)) { end(null, 'unread'); return; }
      L.members.fb().then(function (S) {
        var ref = S.F.doc(S.db, 'replyasks', k.replace(':', '_')), t0 = Date.now();
        function look() { return S.F.getDoc(ref).then(function (d) { return d.exists() ? d.data() : null; }); }
        function entry(d) {
          var r = []; try { r = JSON.parse(d.j || '[]'); } catch (x) { }
          return { at: d.at && d.at.toDate ? d.at.toDate().toISOString() : new Date().toISOString(), r: Array.isArray(r) ? r : [] };
        }
        function old(d) { return !d.at || !d.at.toMillis || Date.now() - d.at.toMillis() > 30 * 60000; }
        // the answer, or its absence: true when it ended the wait
        function seen(d) {
          if (d && d.st === 'done') { end(entry(d), 'done'); return true; }
          if (d && d.st === 'fail') { end(null, 'fail'); return true; }
          return false;
        }
        function wait() {
          var un = null, stop = function () { clearTimeout(cap); if (un) { try { un(); } catch (x) { } un = null; } };
          var cap = setTimeout(function () { stop(); end(null, 'fail'); }, Math.max(1000, 5 * 60000 - (Date.now() - t0)));          // his PC is off: say so, never wait forever
          if (typeof S.F.onSnapshot === 'function') {
            try {
              un = S.F.onSnapshot(ref, function (snap) { if (a.st !== 'asking') { stop(); return; } if (seen(snap.exists() ? snap.data() : null)) stop(); },
                function () { stop(); end(null, 'fail'); });
              return;
            } catch (x) { un = null; }
          }
          var gap = 5000;
          (function poll() {
            if (a.st !== 'asking') { stop(); return; }
            look().then(function (d) { if (seen(d) || a.st !== 'asking') { stop(); return; } gap = Math.min(30000, gap * 1.5); setTimeout(poll, gap); })
              .catch(function () { stop(); end(null, 'fail'); });
          })();
        }
        return look().then(function (d) {
          if (d && d.st === 'done' && (!old(d) || entry(d).r.length)) { end(entry(d), 'done'); return; }
          if (d && d.st === 'ask' && !old(d)) { wait(); return; }          // asked lately (by him on another device): wait for that answer
          if (d && d.st === 'fail' && !old(d)) { end(null, 'fail'); return; }
          return S.F.setDoc(ref, { st: 'ask', at: S.F.serverTimestamp() }).then(function () { wait(); },
            function (ex) { end(null, ex && ex.code === 'permission-denied' ? 'unread' : 'fail'); });
        });
      }).catch(function () { end(null, 'fail'); });
    });
  }
  // handed to the room once a creator's sign-in is known, and again whenever it changes
  function offerAsk() { lp(function (L) { if (R.rpAsk && signedIn(L)) R.rpAsk(askReplies); }); }
  offerAsk();
  document.addEventListener('lp:members', function (ev) { if (ev && ev.detail && ev.detail.account) offerAsk(); });
  // The mark that says this reader makes shows: creator=true on their own account, the same field "I made it" sets.
  function markCreator(L) {
    if (!L || L.off || !L.members.fb) return;
    L.members.fb().then(function (S) {
      var u = S.auth && S.auth.currentUser; if (!u) return;
      return S.F.updateDoc(S.F.doc(S.db, 'users', u.uid), { creator: true, confirmed: !!u.emailVerified, email: u.email });
    }).catch(function () { /* the account has no profile yet, or the write was refused: the tools still work on this device */ });
  }
  function setOn(on) {
    st.on = on; ui.open = on; save();
    mkb.setAttribute('aria-pressed', on ? 'true' : 'false');
    panel.hidden = !on;
    document.documentElement.classList.toggle('ir-cr-on', on);
    msg.textContent = '';
    if (on) { draw(); lp(function (L) { if (signedIn(L)) markCreator(L); }); }
  }
  // The bar's button opens the whole maker at once, and closes it again.
  mkb.addEventListener('click', function () {
    if (st.on) { setOn(false); return; }
    if (ui.src) { ui.src = null; ui.sig = ''; }          // the bar's door always makes a show from the filters
    setOn(true);
    if (panel.getBoundingClientRect().top > innerHeight - 160 || panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  function dial(key, label, list) {
    return '<div class="ir-sm-dial" role="radiogroup" aria-label="' + esc(label) + '"><span class="ir-sm-dl">' + esc(label) + '</span><span class="ir-sm-db">' + list.map(function (o) {
      return '<button type="button" role="radio" data-dial="' + key + '" data-v="' + o[0] + '" aria-checked="' + (st[key] === o[0]) + '">' + esc(o[1]) + '</button>';
    }).join('') + '</span></div>';
  }
  function mix(A) {
    var k = A.kinds, b = [], pk = k.post + k.image;
    if (k.video) b.push(k.video === 1 ? T('1 video') : T('{n} videos', { n: N(k.video) }));
    if (pk) b.push(pk === 1 ? T('1 post') : T('{n} posts', { n: N(pk) }));
    if (k.article) b.push(k.article === 1 ? T('1 article') : T('{n} articles', { n: N(k.article) }));
    if (k.doc) b.push(k.doc === 1 ? T('1 document') : T('{n} documents', { n: N(k.doc) }));
    return b.join(T(', '));
  }
  function optHtml(kind) {
    var list = opts(kind), cur = (chosen(kind) || {}).t, many = ui.pack[kind].length > PAGE[kind];
    if (!list.length) return '<p class="ir-sm-none">Nothing to offer here yet.</p>';
    return '<ul class="ir-sm-opts" role="radiogroup" aria-label="' + (kind === 'titles' ? 'Titles' : kind === 'covers' ? 'Cover text' : 'Descriptions') + '">' + list.map(function (x, i) {
      var meta = kind === 'titles' ? x.t.length + ' characters' + (x.t.length > 70 ? ', long for YouTube' : '') : kind === 'covers' ? words(x.t) + (words(x.t) === 1 ? ' word' : ' words') : x.t.length + ' characters';
      return '<li class="ir-sm-o ir-sm-' + kind + (x.t === cur ? ' on' : '') + '"><button type="button" role="radio" class="ir-sm-pick" data-pick="' + kind + '" data-i="' + i + '" aria-checked="' + (x.t === cur) + '"><span class="ir-sm-t">' + esc(x.t) + '</span><small>' + meta + '</small></button>' +
        '<button type="button" class="ir-sm-cp" data-cp="' + kind + '" data-i="' + i + '" aria-label="' + esc(T('Copy this one')) + '">' + ICON.copy + '</button></li>';
    }).join('') + '</ul>' + (many ? '<button type="button" class="ir-sm-more" data-mk="more">' + ICON.redo + '<span>Other options</span></button>' : '');
  }
  function bitsOf(it) {
    var r = R.reach(it) || {}, lk = R.likes ? R.likes(it) : null, bits = [R.when(it), it.h || it.nm || it.src];
    if (lk != null) bits.push(T('{n} likes', { n: R.fmt(lk) })); else if (r.views) bits.push(T('{n} views', { n: R.fmt(r.views) }));
    return bits.filter(Boolean).join(' · ');
  }
  // An item's headline as a link to its source; regime media (Iran Uncensored) is never a link, and never in a show at all.
  function itemLink(it) { return isReg(it) ? '<span class="ir-sm-a">' + esc(it.t) + '</span>' : '<a href="' + esc(href(it.u)) + '" target="_blank" rel="' + RELN + ' nofollow">' + esc(it.t) + '</a>'; }
  function isReg(it) { return !!(R.regime && R.regime(it)); }
  function whyWords(w) {
    var m = /^Next story, related to #(\d+)$/.exec(w);
    if (m) return T('Next story, related to #{n}', { n: N(m[1]) });
    var WHY = { 'Opens the show: the biggest story': T('Opens the show: the biggest story'), 'Next story: the biggest left': T('Next story: the biggest left'), 'What happened': T('What happened'),
      'More reporting': T('More reporting'), 'The clip': T('The clip'), 'The picture': T('The picture'), 'Reaction': T('Reaction'), 'Commentary': T('Commentary') };
    return WHY[w] || w;
  }
  // The header over each story in the run order: its name, how many items, and whether it follows on from the one before.
  // A run of stories of one item each shares one header, so five lone posts are not five headers.
  function segHead(list, i, starts) {
    var k = starts.indexOf(i); if (k < 0) return '';
    var end = k + 1 < starts.length ? starts[k + 1] : list.length, n = end - i, sg = ui.best && ui.best.segs ? ui.best.segs[(ui.best.segOf || {})[R.code(list[i])]] : null;
    if (n === 1) {
      var prevOne = k > 0 && starts[k] - starts[k - 1] === 1;
      return prevOne ? '' : '<li class="ir-sm-sg is-one"><b>' + esc(T('Other stories, one item each')) + '</b></li>';
    }
    var name = sg ? sg.name : clip(cleanHead(list[i].t), 64);
    return '<li class="ir-sm-sg"><b' + (FA ? ' dir="auto"' : '') + '>' + esc(name) + '</b><small>' + esc(T('{n} items', { n: N(n) })) + (sg && sg.rel && !ui.mine ? ' · ' + esc(T('related to the story before')) : '') + '</small></li>';
  }
  var MOVE = {
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>', down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>', add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
  };
  function onAir(n) {          // how long a show of n items runs (MIN_PER), in words: "About 2 h 15 min on air, 45 items"
    var k = st.kind === 'video' ? 'video' : 'live', m = Math.round(n * MIN_PER[k]), h = Math.floor(m / 60), r = m % 60;
    var t = h ? h + ' h' + (r ? ' ' + r + ' min' : '') : m + ' min';
    return (k === 'video' ? 'About ' + t + ' of video, ' : 'About ' + t + ' on air at about 3 minutes an item, ') + n + ' items. Add or take out items below to change it.';
  }
  function runHtml() {
    var why = ui.best ? ui.best.why : {}, last = ui.set.length - 1;
    var since = ui.acts.length - 1 - ui.acts.lastIndexOf('reset');          // the log keeps everything; the count is since the last reset
    var head = '<div class="ir-sm-rhead"><p>' + (ui.mine ? '<b>' + esc(T('Your order')) + '</b> · ' + esc(ui.listOrder && !since ? T('the order of your list') : since === 1 ? T('1 change, kept on this device') : T('{n} changes, kept on this device', { n: N(since) }))
      : '<b>' + esc(T('Best order')) + '</b> · ' + esc(T('story by story: the biggest first, each one from what happened to the reactions, related stories side by side'))) + '</p>' +
      (ui.mine ? '<button type="button" class="ir-sm-best" data-mk="best">' + ICON.redo + '<span>' + esc(ui.listOrder ? T('Best order for a show') : T('Back to the best order')) + '</span></button>' : '') + '</div>' +
      (PLAIN ? '' : '<p class="ir-sm-len">' + esc(onAir(ui.set.length)) + '</p>');
    var starts = segStarts(ui.set, ui.best);
    var list = '<ol class="ir-sm-run">' + ui.set.map(function (it, i) {
      var c = R.code(it), w = why[c] || '';
      return segHead(ui.set, i, starts) + '<li data-c="' + esc(c) + '"><span class="num">' + N(i + 1) + '</span>' + R.mark(it) + itemLink(it) +
        '<span class="ir-sm-mv"><button type="button" data-mv="up" data-i="' + i + '" aria-label="' + esc(T('Move up')) + '"' + (i ? '' : ' disabled') + '>' + MOVE.up + '</button>' +
        '<button type="button" data-mv="down" data-i="' + i + '" aria-label="' + esc(T('Move down')) + '"' + (i < last ? '' : ' disabled') + '>' + MOVE.down + '</button>' +
        '<button type="button" data-mv="out" data-i="' + i + '" aria-label="' + esc(T('Take out of the show')) + '"' + (ui.set.length > 1 ? '' : ' disabled') + '>' + MOVE.out + '</button></span>' +
        '<small>' + (w && !ui.mine ? '<em>' + esc(whyWords(w)) + '</em> · ' : '') + esc(bitsOf(it)) + '</small></li>';
    }).join('') + '</ol>';
    var inSet = {}; ui.set.forEach(function (it) { inSet[R.code(it)] = 1; });
    var sc = ui.best && ui.best.score || vScore, rest = ui.pool.filter(function (it) { return !inSet[R.code(it)]; }).sort(function (a, b) { return sc(b) - sc(a); });
    var more = rest.length ? '<div class="ir-sm-rest"><p class="ir-sm-rl"><b>' + esc(T('Not in the show: {n}', { n: N(rest.length) })) + '</b> · ' + esc(T('the strongest first. Add one and it goes at the end.')) +
      (ui.set.length >= maxN() ? ' ' + esc(T('The show holds {n}: take one out first.', { n: N(maxN()) })) : '') + '</p>' +
      '<ul>' + rest.slice(0, ui.rest).map(function (it) {
        return '<li><button type="button" class="ir-sm-add" data-add="' + esc(R.code(it)) + '" aria-label="' + esc(T('Add to the show')) + '"' + (ui.set.length >= maxN() ? ' disabled' : '') + '>' + MOVE.add + '</button>' + R.mark(it) +
          itemLink(it) + '<small>' + esc(bitsOf(it)) + '</small></li>';
      }).join('') + '</ul>' + (rest.length > ui.rest ? '<button type="button" class="ir-sm-more" data-mk="rest">' + ICON.redo + '<span>' + esc(T('Show {n} more', { n: N(Math.min(12, rest.length - ui.rest)) })) + '</span></button>' : '') + '</div>' : '';
    return head + list + more;
  }
  function sigOf(list) { var s = list.map(function (it) { return R.code(it); }).join('.'), h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return list.length + ':' + (h >>> 0).toString(36); }
  // His order for this set, kept on this device (the last 20 sets), and put back when the same filters come back.
  function keepOrder() {
    var all = store(ORDER_KEY); if (!all || typeof all !== 'object' || Array.isArray(all)) all = {};
    if (ui.mine) all[ui.mem] = { at: Date.now(), codes: ui.set.map(function (it) { return R.code(it); }), acts: ui.acts.slice(-60) }; else delete all[ui.mem];
    var ks = Object.keys(all).sort(function (a, b) { return all[b].at - all[a].at; }); ks.slice(20).forEach(function (k) { delete all[k]; });
    store(ORDER_KEY, all);
  }
  // The words follow WHAT is in the show, never its order: a move keeps every pick; adding or taking out an item rebuilds them.
  function rewords() {
    var keep = ui.pick, sorted = ui.set.slice().sort(function (a, b) { return vScore(b) - vScore(a); });
    ui.pack = ui.set.length ? build(sorted) : null;
    ui.pick = keep;
  }
  function draw() {
    if (panel.hidden) return;
    // the pool: what the filters leave, or a list the creator made (SAVE LISTS: "Make a show from this list")
    var all = (ui.src ? srcPool() : R.shown()).filter(function (it) { return !isReg(it); }), n = all.length;
    var mem = sigOf(all), sig = mem + '|' + st.kind;
    if (sig !== ui.sig) {
      var kindOnly = ui.mem === mem;
      ui.sig = sig; ui.mem = mem; ui.pool = all; ui.page = { titles: 0, covers: 0, descs: 0 };
      if (!kindOnly) { ui.pick = { titles: '', covers: '', descs: '' }; ui.myTitle = null; ui.myNote = null; ui.saved = null; ui.savedSig = ''; }
      var picked = n ? pickSet(all) : null;
      ui.best = picked ? threadOrder(picked) : null;
      if (ui.best) ui.best.score = picked.score;
      ui.set = ui.best ? ui.best.list.slice() : []; ui.mine = false; ui.acts = []; ui.rest = 8; ui.listOrder = false;
      // a list its maker put in order by hand opens in that order ("Your order"); the best order is one tap away
      if (ui.src && ui.src.mine && n) { ui.set = all.slice(0, maxN()); ui.mine = true; ui.listOrder = true; }
      var kept = store(ORDER_KEY), mine = kept && kept[mem];
      if (mine && Array.isArray(mine.codes)) {
        var byC = {}; all.forEach(function (it) { byC[R.code(it)] = it; });
        var back = mine.codes.map(function (c) { return byC[c]; }).filter(Boolean);
        // an order kept on this device is his edit of the show, not the list's own order: the header says changes, not "the order of your list"
        if (back.length) { ui.set = back.slice(0, maxN()); ui.mine = true; ui.listOrder = false; ui.acts = Array.isArray(mine.acts) ? mine.acts.slice() : []; }
      }
      rewords();
    }
    var A = ui.pack && ui.pack.A;
    // 24 Oct 2026: with "Regime only" on, the room listed 88 items and this said the filters left nothing. It now says why.
    var shownNow = R.shown ? R.shown() : [], regOnly = !n && shownNow.length > 0 && shownNow.every(isReg);
    var bar = '<div class="ir-sm-bar"><span class="ir-sm-ic" aria-hidden="true">' + ICON.play + '</span><p class="ir-sm-l"><b>' + esc(n ? T('Make a show from these {n}', { n: N(n) }) : regOnly ? T('Regime media never goes into a show') : T('Your filters leave nothing')) + '</b><span>' +
      (n ? esc(mix(A)) + (n > maxN() ? ' · ' + esc(T('the strongest {n} go in, in the best order', { n: N(ui.set.length) })) : '') : esc(regOnly ? T('Take the regime filter off and the show fills again') : T('Loosen a filter and the show fills again'))) + '</span></p>' +
      '<button type="button" class="ir-sm-go" data-mk="toggle" aria-expanded="true">' + esc(T('Close')) + '</button></div>';          // the head of the open maker: its only button closes it (the bar's "Make a show" is the one way in)
    if (!n) { keepFocus(function () { panel.innerHTML = bar; }); panel.classList.toggle('open', false); return; }
    var bf = R.brief ? R.brief() : null;          // the quick briefing (Brief me until 21 Oct): the hottest stories, ready to play, no choices
    var acts = '<div class="ir-sm-acts"><a class="ir-sm-show" href="' + esc(showUrl()) + '" target="_blank" rel="' + RELN + '">' + ICON.play + '<span>' + esc(T('Open the show screen')) + '</span></a>' +
      '<button type="button" class="ir-sm-copy" data-mk="copy">' + ICON.copy + '<span>' + esc(T('Copy the package')) + '</span></button>' +
      (bf && bf.url ? '<a class="ir-sm-brief" id="ir-brief" href="' + esc(bf.url) + '" target="_blank" rel="' + RELN + '">' + ICON.play + '<span>' + esc(T('Or play the quick briefing: the {n} hottest stories', { n: N(bf.n) })) + '</span></a>' : '') + '</div>';
    var from = '<p class="ir-sm-from"><span>' + esc(T('Built from')) + '</span> ' + esc(fromLine()) + (ui.src ? ' <button type="button" class="ir-sm-best" data-mk="nolist">' + esc(T('Use the filters instead')) + '</button>' : '') + '</p>';
    var body;
    if (PLAIN) {
      // Iran Uncensored: the creator's own title and note, the run order, the screen, saving and the link (see PLAIN above)
      body = '<div class="ir-sm-body">' + from + wordsHtml() + '<div class="ir-sm-pane ir-sm-pane-run">' + runHtml() + '</div>' + acts + shareHtml() + '</div>';
    } else {
      var tabs = [['titles', 'Titles'], ['covers', 'Cover text'], ['descs', 'Description'], ['run', 'Run order ' + ui.set.length]];
      body = '<div class="ir-sm-body">' + from +
        '<div class="ir-sm-dials">' + dial('kind', 'Making', KINDS2) + dial('tone', 'Style', TONES) + dial('aim', 'Aim for', AIMS) + '</div>' +
        '<div class="ir-sm-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (ui.tab === t[0]) + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>' +
        '<div class="ir-sm-pane" role="tabpanel">' + (ui.tab === 'run' ? runHtml() : optHtml(ui.tab)) + '</div>' + acts +
        '<p class="ir-sm-pk"><b>Your pick:</b> ' + esc((chosen('titles') || {}).t || '') + ' <span>· ' + esc((chosen('covers') || {}).t || '') + '</span></p>' + shareHtml() + '</div>';
    }
    keepFocus(function () { panel.innerHTML = bar + body; });
    panel.classList.toggle('open', true);
    if (ui.mineState === 'idle') loadMine();
  }
  // A redraw (a pick, the hourly feed, a filter) must never take the cursor out of a box he is typing in.
  function keepFocus(fn) {
    var a = document.activeElement, id = a && panel.contains(a) && a.id, s0 = id && a.selectionStart, s1 = id && a.selectionEnd;
    fn();
    if (!id) return;
    var b = $(id); if (!b) return;
    b.focus({ preventScroll: true });
    try { if (s0 != null) b.setSelectionRange(s0, s1); } catch (e) { }
  }
  function showUrl() {
    var A = ui.pack.A, c = curCover(), d = curDesc();
    var gs = segStarts(ui.set, ui.best).filter(function (i) { return i > 0; });          // where each story starts, for the screen's rundown
    return '?show=' + ui.set.map(function (it) { return 'on~' + R.code(it); }).join('.') + '&kind=' + (PLAIN ? 'live' : st.kind) + '&t=' + encodeURIComponent(cutU(curTitle() || (PLAIN ? '' : A.H), 100)) +
      (gs.length ? '&g=' + gs.join('.') : '') +
      (c ? '&c=' + encodeURIComponent(cutU(c, 40)) : '') + '&i=' + encodeURIComponent(cutU(curNote(), 420)) + (!PLAIN && A.dom && A.dom.s ? '&st=' + encodeURIComponent(A.dom.id) : '') +
      (d ? '&d=' + encodeURIComponent(cutU(firstLine(d), 200)) : '');          // cutU: never half an emoji (encodeURIComponent throws on one)
  }
  // The show's words as they stand: what the creator typed wins; else (Liberty Politics) the picks of the tabs.
  function curTitle() { if (ui.myTitle != null && ui.myTitle.trim()) return ui.myTitle.trim(); return PLAIN || !ui.pack ? '' : ((chosen('titles') || {}).t || ui.pack.A.H || ''); }
  function curNote() { if (ui.myNote != null) return ui.myNote.trim(); return PLAIN || !ui.pack ? '' : introText(); }
  function curCover() { return PLAIN || !ui.pack ? '' : ((chosen('covers') || {}).t || ''); }
  function curDesc() { return PLAIN || !ui.pack || !chosen('descs') ? '' : fullDesc(chosen('descs').t); }
  // Iran Uncensored's maker: the title and the note are the creator's own words (PLAIN)
  function wordsHtml() {
    return '<div class="ir-sv-f ir-sv-words"><label for="ir-sv-t">' + esc(T('Title')) + '</label><input id="ir-sv-t" type="text" maxlength="120" dir="auto" autocomplete="off" value="' + esc(ui.myTitle != null ? ui.myTitle : curTitle()) + '" placeholder="' + esc(T('Name the show')) + '">' +
      '<label for="ir-sv-n">' + esc(T('A note for whoever presents it')) + '</label><textarea id="ir-sv-n" rows="3" maxlength="1200" dir="auto" placeholder="' + esc(T('What the show is about, in a few lines. It shows beside the screen and on the page.')) + '">' + esc(ui.myNote != null ? ui.myNote : curNote()) + '</textarea></div>';
  }
  function firstLine(t) { var m = /^.*?[.?!](\s|$)/.exec(t); return (m ? m[0] : t).trim(); }
  // THE NOTES ON HOW PEOPLE CHANGE IT. When a creator commits a show (opens its screen or copies its package), one record goes
  // to showedits/<their account id>-<time>: the order the room proposed, the order they used, every change between, and which
  // title, cover and description they took (and which shape of each). Only signed-in creators write; only the site reads.
  // build/show_learn.py counts them (data/show-learn.json, back into ranked()), so an order or a title shape people keep
  // changing is seen, and the rules here are changed from evidence. The last 30 also stay on this device.
  function sendEdit(how) {
    if (!ui.pack || !ui.best) return;
    // a title the creator typed is recorded as their own ('own'), never as the pick it replaced
    var t = PLAIN || (ui.myTitle != null && ui.myTitle.trim()) ? { t: curTitle(), id: 'own' } : chosen('titles') || {}, c = PLAIN ? {} : chosen('covers') || {}, d = PLAIN ? {} : chosen('descs') || {}, A = ui.pack.A;
    var codes = function (l) { return l.map(function (it) { return R.code(it); }).join('.').slice(0, 900); };
    var titles = ranked(ui.pack.titles, 'titles').map(function (x) { return x.t; });
    var rec = { v: 1, how: how, from: String(fromLine()).slice(0, 160), story: A.dom ? String(A.dom.id).slice(0, 40) : '', pool: ui.pool.length,
      auto: codes(ui.best.list), final: codes(ui.set), moved: ui.mine, acts: ui.acts.join(' ').slice(0, 600),
      kind: st.kind, tone: st.tone, aim: st.aim, words: String(ui.pack.src || '').slice(0, 10),
      title: String(t.t || '').slice(0, 100), titleId: String(t.id || '').slice(0, 24), titleAt: Math.max(-1, titles.indexOf(t.t)),
      cover: String(c.t || '').slice(0, 40), coverId: String(c.id || '').slice(0, 24), descId: String(d.id || '').slice(0, 24) };
    var key = JSON.stringify([rec.final, rec.title, rec.cover, rec.descId, how]);
    if (key === ui.sent) return;
    ui.sent = key;
    var local = store('ir-show-edits'); if (!Array.isArray(local)) local = []; local.push(Object.assign({ at: new Date().toISOString() }, rec)); store('ir-show-edits', local.slice(-30));
    lp(function (L) {
      if (!L || L.off || !L.members.fb || !signedIn(L)) return;
      L.members.fb().then(function (S) {
        var u = S.auth && S.auth.currentUser; if (!u) return;
        return S.F.setDoc(S.F.doc(S.db, 'showedits', u.uid + '-' + Date.now()), Object.assign({ uid: u.uid, at: S.F.serverTimestamp() }, rec));
      }).catch(function () { /* refused or offline: the record stays on this device */ });
    });
  }
  function move(i, to, act) {
    if (to < 0 || to >= ui.set.length || i === to) return;
    var it = ui.set.splice(i, 1)[0]; ui.set.splice(to, 0, it);
    ui.mine = true; ui.acts.push(act + (i + 1)); keepOrder();
  }
  // The package: everything someone needs to do the show, as text for a chat or an email. With a saved show, its link
  // leads; the link is the part that keeps working (the show screen's long address needs the items still in the room).
  function packageText() {
    var n = 0, link = savedFresh() ? savedUrl(ui.saved.id) : '', out = [];
    var add = function (h, v) { if (v) out.push(h, v, ''); };
    add(T('TITLE'), curTitle());
    if (link) add(T('THE SHOW, READY TO PRESENT'), link);
    add(T('COVER TEXT'), curCover());
    add(T('DESCRIPTION'), curDesc());
    add(PLAIN ? T('NOTE') : st.kind === 'video' ? T('OPENING HOOK') : T('INTRO, TO READ OUT'), curNote());
    out.push(T('RUN ORDER'));
    ui.set.forEach(function (it) { n++; out.push(N(n) + '. ' + it.t.replace(/\s+/g, ' ').trim() + '\n   ' + it.u); });
    if (!link) out.push('', T('SHOW SCREEN'), location.origin + location.pathname + showUrl());
    out.push('', T('Made in the Intel Room: {site}', { site: 'https://' + SITE_MARK }));
    return out.join('\n');
  }
  /* SAVE IT AND SEND THE LINK (Armin, 19 October 2026: "when you make a show, you should be able to save it, share it, and get
     a link for it ... an assistant or a friend could prepare a show for somebody, get a link, and send it ... It would also
     be a good way for us to get this tool shared with more people"). A saved show is shows/<id> in the site's database
     (firestore.rules, "shows"): its words, its run order and a copy of every item as it was, so the link keeps working
     after the items leave the room's last 24 hours. The link is this page with ?s=<id>: anyone opens it, presents it, reads
     it as a page with its sources, and is offered the maker for a show of their own. Saving needs a free account with a
     confirmed email, because a saved show is a public page that carries its maker's name. Who opened it is never kept:
     only how many times (views), which the maker sees under "Your saved shows". */
  function savedUrl(id) { return location.origin + location.pathname + '?s=' + id; }
  function nowSig() { return JSON.stringify([ui.set.map(function (it) { return R.code(it); }), curTitle(), curNote(), curCover(), curDesc()]); }
  function savedFresh() { return !!(ui.saved && ui.savedSig === nowSig()); }
  // A copy of an item as the show screen reads it: the room's own fields, without its working notes (_x), long text capped
  function snapItem(it) {
    var o = {};
    Object.keys(it).forEach(function (k) {
      var v = it[k];
      if ((k.charAt(0) === '_' && k !== '_v') || typeof v === 'function' || v === undefined) return;
      o[k] = typeof v === 'string' && v.length > 4000 ? v.slice(0, 4000) : v;
    });
    o._code = R.code(it);
    return o;
  }
  /* THE ONE DOOR FOR A COPY THAT COMES BACK (24 Oct 2026). A saved show (?s=), a shared list (?l=), the lists on an account
     and this device's own lists all hand back items as JSON the database checks only for its brackets, so anyone can
     write one by hand and send the link: "hot":"<img onerror=...>" ran the moment the show opened, a "javascript:" u ran
     on a tap, and a th0 on any host made every reader's browser call that host (a reader inside Iran included). So every
     such copy comes in through cleanSnap() and nowhere else, and the room's own drawing (R.mark, R.vis, R.refHtml, the
     counts) only ever sees what it lets through: plain values, no working notes ("_" keys, but _code and _sg), u a web
     address, th0 a Bing News picture, th a picture on Bing, X or YouTube, the counts numbers, d a date, the words
     words. An item without words or a web address is not an item: it is dropped. */
  var TH0_RX = /^https:\/\/www\.bing\.com\/th\?id=[A-Za-z0-9._-]{8,120}&pid=News$/;
  var TH_RX = [/^https:\/\/www\.bing\.com\/th\?id=[A-Za-z0-9._-]{8,120}&pid=News&w=240&h=150&c=7$/, /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/[A-Za-z0-9_]+\.jpg$/,
    /^https:\/\/pbs\.twimg\.com\/[A-Za-z0-9_\/-]+(?:\.(?:jpg|jpeg|png|webp)|\?format=(?:jpg|png|webp)&name=[A-Za-z0-9]+)$/];
  var SNAP_NUM = ['hot', 'lk', 'vw', 'rp', 'dur', 'cr'], SNAP_TXT = ['t', 'h', 'nm', 'src', 'tx', 'hotWhy', 'pw', 'dm', 'cat', 'sd', 'av'];
  var SNAP_KINDS = { post: 1, image: 1, video: 1, article: 1, document: 1, data: 1 }, DATE_RX = /^[0-9TZ:.+\- ]{4,40}$/;
  function badKey(k) { return k === '__proto__' || k === 'constructor' || k === 'prototype'; }
  // plain values only: strings, finite numbers, true/false/null, and arrays and objects of them, three deep at most
  function sane(v, depth) {
    if (typeof v === 'string') return v.length > 20000 ? v.slice(0, 20000) : v;
    if (typeof v === 'number') return isFinite(v) ? v : undefined;
    if (typeof v === 'boolean' || v === null) return v;
    if (!v || typeof v !== 'object' || depth > 3) return undefined;
    if (Array.isArray(v)) { var a = []; for (var i = 0; i < v.length && a.length < 200; i++) { var x = sane(v[i], depth + 1); if (x !== undefined) a.push(x); } return a; }
    var o = {};
    Object.keys(v).forEach(function (k) { if (badKey(k)) return; var x = sane(v[k], depth + 1); if (x !== undefined) o[k] = x; });
    return o;
  }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function cleanSnap(o0) {
    if (!isObj(o0)) return null;
    var x = sane(o0, 0); if (!x) return null;
    Object.keys(x).forEach(function (k) { if (k.charAt(0) === '_' && k !== '_code' && k !== '_sg') delete x[k]; });
    if (typeof x.t !== 'string' || !x.t.trim() || typeof x.u !== 'string' || !/^https?:\/\//i.test(x.u)) return null;
    if (x._code != null && (typeof x._code !== 'string' || !/^[^\s<>"'`\\]{1,120}$/.test(x._code))) delete x._code;
    if (x._sg) x._sg = 1; else delete x._sg;
    if (x.id != null && typeof x.id !== 'string' && typeof x.id !== 'number') delete x.id;
    SNAP_NUM.forEach(function (k) { if (x[k] != null && typeof x[k] !== 'number') delete x[k]; });
    SNAP_TXT.forEach(function (k) { if (x[k] != null && typeof x[k] !== 'string') delete x[k]; });
    if (x.d != null && !(typeof x.d === 'string' && DATE_RX.test(x.d))) delete x.d;
    if (x.k != null && !(typeof x.k === 'string' && Object.prototype.hasOwnProperty.call(SNAP_KINDS, x.k))) delete x.k;
    if (x.p != null && x.p !== 'global') { var pl = typeof x.p === 'string' && R.place ? R.place(x.p) : null; if (typeof x.p !== 'string' || (R.place && !(pl && typeof pl.name === 'string'))) x.p = 'global'; }
    if (x.th0 != null && !(typeof x.th0 === 'string' && TH0_RX.test(x.th0))) delete x.th0;
    if (x.th != null && !(typeof x.th === 'string' && TH_RX.some(function (rx) { return rx.test(x.th); }))) delete x.th;
    ['also', 'rx'].forEach(function (k) { if (x[k] != null) { if (Array.isArray(x[k])) x[k] = x[k].filter(function (s) { return typeof s === 'string'; }); else delete x[k]; } });
    ['tp', 'ls'].forEach(function (k) { if (x[k] != null) { if (Array.isArray(x[k])) x[k] = x[k].filter(function (n) { return typeof n === 'number'; }); else delete x[k]; } });
    if (x.m != null) { if (Array.isArray(x.m)) x.m = x.m.filter(isObj); else delete x.m; }
    // what a post quotes or answers, its note and its link card: objects whose words are words and whose date is a date
    ['qt', 'ry', 'nt', 'cd', 'lsn'].forEach(function (k) {
      if (x[k] == null) return;
      if (!isObj(x[k])) { delete x[k]; return; }
      var r = x[k];
      ['t', 'nm', 'h', 'u', 'av', 'dm', 'i'].forEach(function (f) { if (r[f] != null && typeof r[f] !== 'string') delete r[f]; });
      if (r.d != null && !(typeof r.d === 'string' && DATE_RX.test(r.d))) delete r.d;
      if (r.m != null) { if (Array.isArray(r.m)) r.m = r.m.filter(isObj); else delete r.m; }
    });
    return x;
  }
  function snapAll() {
    var gs = segStarts(ui.set, ui.best), list = ui.set.map(function (it, i) { var o = snapItem(it); if (i && gs.indexOf(i) >= 0) o._sg = 1; return o; }), js = JSON.stringify(list);          // _sg: a new story starts here
    // the database caps the copy (firestore.rules, 200,000 characters): drop the heaviest optional parts until it fits
    ['also', 'cd', 'm', 'tx'].forEach(function (k) { if (js.length > 190000) { list.forEach(function (o) { delete o[k]; }); js = JSON.stringify(list); } });
    return js.length > 190000 ? null : js;
  }
  function newId() {
    var a = new Uint8Array(12), s = '', abc = 'abcdefghijkmnpqrstuvwxyz23456789';
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < a.length; i++) s += abc.charAt(a[i] % abc.length);
    return s;
  }
  function who(L) { return L && !L.off && L.members.who ? L.members.who() : null; }
  var LPX = null;          // the account hooks, once community.js has them (null on a copy of the site with no accounts)
  lp(function (L) {
    LPX = L && !L.off ? L : null;
    if (LPX && LPX.members.sub) LPX.members.sub(function () {
      // another account (or none): the show this maker saved belongs to the last one, so it is not "saved" here any more
      var uid = (who(LPX) || {}).uid || '';
      if (ui.uidAt != null && uid !== ui.uidAt) { ui.saved = null; ui.savedSig = ''; ui.svMsg = ''; ui.arm = ''; }
      ui.uidAt = uid;
      ui.mineState = 'idle'; ui.shows = []; if (ui.wantSave && signedIn(LPX)) { ui.wantSave = false; draw(); saveShow(); } else draw();
    });
    if (!panel.hidden) draw();
  });
  function shareHtml() {
    var me = who(LPX), fresh = savedFresh(), url = ui.saved ? savedUrl(ui.saved.id) : '';
    var h = '<section class="ir-sv" aria-labelledby="ir-sv-h"><h4 class="ir-sv-h" id="ir-sv-h">' + ICON.link + '<span>' + esc(T('Save it and send the link')) + '</span></h4>' +
      '<p class="ir-sv-p">' + esc(T('One link for the whole show. Whoever opens it can present it, read it as a page with every source, or make their own.')) + '</p>';
    if (!PLAIN) h += '<div class="ir-sv-f"><label for="ir-sv-t">' + esc(T('Title')) + '</label><input id="ir-sv-t" type="text" maxlength="120" dir="auto" autocomplete="off" value="' + esc(ui.myTitle != null ? ui.myTitle : curTitle()) + '">' +
      '<label for="ir-sv-n">' + esc(T('A note for whoever presents it')) + '</label><textarea id="ir-sv-n" rows="3" maxlength="1200" dir="auto">' + esc(ui.myNote != null ? ui.myNote : curNote()) + '</textarea></div>';
    if (!LPX) h += '<p class="ir-sv-say">' + esc(T('Saving works on the live site.')) + '</p>';
    else if (!me) h += '<div class="ir-sv-row"><button type="button" class="ir-sv-go" data-sv="in">' + ICON.save + '<span>' + esc(T('Sign in to save it')) + '</span></button><small>' + esc(T('Free. A saved show carries its maker\'s name, so it needs an account.')) + '</small></div>';
    else if (!me.v) h += '<div class="ir-sv-row"><button type="button" class="ir-sv-go" data-sv="check">' + ICON.save + '<span>' + esc(T('Confirm your email to save it')) + '</span></button><small>' + esc(T('We sent you a link when you made the account. One tap on it and you can save.')) + '</small></div>';
    else h += '<div class="ir-sv-row"><button type="button" class="ir-sv-go" data-sv="save"' + (fresh ? ' disabled' : '') + '>' + ICON.save + '<span>' +
      esc(fresh ? T('Saved') : ui.saved ? T('Save the changes') : T('Save and get the link')) + '</span></button>' + (ui.saved && !fresh ? '<small>' + esc(T('The link stays the same.')) + '</small>' : '') + '</div>';
    if (url) {
      var msg = curTitle() + '\n' + url, enc = encodeURIComponent;
      h += '<div class="ir-sv-link"><label class="vh" for="ir-sv-u">' + esc(T('The link')) + '</label><input id="ir-sv-u" type="text" readonly dir="ltr" value="' + esc(url) + '">' +
        '<button type="button" data-sv="copy">' + ICON.copy + '<span>' + esc(T('Copy the link')) + '</span></button></div>' +
        '<div class="ir-sv-to" role="group" aria-label="' + esc(T('Send it')) + '">' +
        (navigator.share ? '<button type="button" data-sv="share">' + ICON.share + '<span>' + esc(T('Send')) + '</span></button>' : '') +
        '<a href="https://wa.me/?text=' + enc(msg) + '" target="_blank" rel="' + RELN + '">WhatsApp</a>' +
        '<a href="https://t.me/share/url?url=' + enc(url) + '&text=' + enc(curTitle()) + '" target="_blank" rel="' + RELN + '">Telegram</a>' +
        '<a href="https://x.com/intent/post?text=' + enc(curTitle()) + '&url=' + enc(url) + '" target="_blank" rel="' + RELN + '">X</a>' +
        '<a href="mailto:?subject=' + enc(curTitle()) + '&body=' + enc(packageText()) + '">' + esc(T('Email')) + '</a>' +
        '<button type="button" data-sv="pack">' + ICON.copy + '<span>' + esc(T('Copy it with the package')) + '</span></button></div>' +
        '<p class="ir-sv-open"><a href="' + esc(url) + '" target="_blank" rel="' + RELN + '">' + ICON.play + '<span>' + esc(T('Open it as they will')) + '</span></a></p>';
    }
    h += '<p class="ir-sv-say" id="ir-sv-say" aria-live="polite">' + esc(ui.svMsg) + '</p>';
    if (me && me.v) h += mineHtml();
    return h + '</section>';
  }
  function mineHtml() {
    if (ui.mineState !== 'done' || !ui.shows.length) return '';
    return '<details class="ir-sv-mine"' + (ui.mineOpen ? ' open' : '') + '><summary>' + esc(T('Your saved shows ({n})', { n: N(ui.shows.length) })) + '</summary><ul>' + ui.shows.map(function (s) {
      var arm = ui.arm === s.id;
      return '<li><a href="' + esc(savedUrl(s.id)) + '" target="_blank" rel="' + RELN + '">' + esc(s.title) + '</a><small>' +
        esc([s.n === 1 ? T('1 item') : T('{n} items', { n: N(s.n) }), s.at ? dayOf(s.at) : '', s.views === 1 ? T('opened once') : T('opened {n} times', { n: N(s.views || 0) })].filter(Boolean).join(' · ')) + '</small>' +
        '<span class="ir-sv-mb"><button type="button" data-sv="copyone" data-id="' + esc(s.id) + '" aria-label="' + esc(T('Copy the link')) + '">' + ICON.copy + '</button>' +
        '<button type="button" data-sv="del" data-id="' + esc(s.id) + '" class="' + (arm ? 'is-arm' : '') + '" aria-label="' + esc(arm ? T('Tap again to delete it') : T('Delete')) + '">' + ICON.out + (arm ? '<span>' + esc(T('Tap again to delete it')) + '</span>' : '') + '</button></span></li>';
    }).join('') + '</ul></details>';
  }
  function dayOf(ms) { try { return new Intl.DateTimeFormat(FA ? 'fa-IR' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(ms)); } catch (e) { return ''; } }
  function svSay(t) { ui.svMsg = t; var el = $('ir-sv-say'); if (el) el.textContent = t; }
  function loadMine() {
    var me = who(LPX); if (!me || !me.v) return;
    ui.mineState = 'loading';
    LPX.members.fb().then(function (S) {
      return S.F.getDocs(S.F.query(S.F.collection(S.db, 'shows'), S.F.where('uid', '==', me.uid), S.F.limit(50)));
    }).then(function (snap) {
      ui.shows = snap.docs.map(function (d) { var x = d.data() || {}, t = x.updatedAt && x.updatedAt.toMillis ? x.updatedAt.toMillis() : 0; return { id: d.id, title: String(x.title || ''), n: +x.n || 0, views: +x.views || 0, at: t }; })
        .sort(function (a, b) { return b.at - a.at; });
      ui.mineState = 'done'; draw();
    }).catch(function () { ui.mineState = 'failed'; });
  }
  function saveShow() {
    var L = LPX, me = who(L);
    if (!L) { svSay(T('Saving works on the live site.')); return; }
    if (!me) { ui.wantSave = true; L.members.open('auth', { opener: mkb }); return; }
    if (!me.v) { L.members.open('check', { resend: true, opener: mkb }); return; }
    var plainTx = function (s, n) { return cutU(String(s || '').replace(/[<>]/g, ''), n); };          // the rules take no markup in a show's words; never half an emoji
    var title = plainTx(curTitle(), 120).trim();
    if (title.length < 3) { svSay(T('Give the show a title first.')); var ti = $('ir-sv-t'); if (ti) ti.focus(); return; }
    var items = snapAll();
    if (!items) { svSay(T('This show is too big to save. Take a few items out and save again.')); return; }
    var id = ui.saved ? ui.saved.id : newId(), sig = nowSig(), A = ui.pack && ui.pack.A;
    svSay(T('Saving...'));
    L.members.fb().then(function (S) {
      var u = S.auth && S.auth.currentUser; if (!u) throw new Error('signed-out');
      return S.F.getDoc(S.F.doc(S.db, 'users', u.uid)).then(function (us) {
        var name = us.exists() ? String(us.data().name || '') : '';
        // desc: the description alone. curDesc() adds the run order and the room's address for a YouTube description, and the
        // saved show's page drew that as one run-on paragraph above the very items it listed
        var dsc = PLAIN || !ui.pack || !chosen('descs') ? '' : chosen('descs').t;
        var d = { uid: u.uid, by: name, title: title, note: plainTx(curNote(), 1200), cover: plainTx(curCover(), 40), desc: plainTx(dsc, 2000),
          kind: PLAIN ? 'live' : st.kind, n: ui.set.length, items: items, story: !PLAIN && A && A.dom && A.dom.s ? String(A.dom.id).slice(0, 40) : '',
          from: String(fromLine()).slice(0, 160), lang: FA ? 'fa' : 'en', updatedAt: S.F.serverTimestamp() };
        var ref = S.F.doc(S.db, 'shows', id);
        var make = function () { return S.F.setDoc(ref, Object.assign({}, d, { createdAt: S.F.serverTimestamp(), views: 0, hidden: false })); };
        // deleted elsewhere (his other device, "Your saved shows"): the same link is made again, never "not-found" forever
        if (ui.saved) return S.F.updateDoc(ref, d).catch(function (e) { if (e && e.code === 'not-found') return make(); throw e; });
        return make();
      });
    }).then(function () {
      ui.saved = { id: id }; ui.savedSig = sig; ui.mineState = 'idle'; ui.svMsg = T('Saved. Copy the link and send it.');
      markCreator(L); sendEdit('save'); draw();
      var u0 = $('ir-sv-u'); if (u0) { u0.focus(); u0.select(); }
    }).catch(function (e) { svSay(T('It did not save. Check the connection and try again.') + (e && e.code ? ' (' + e.code + ')' : '')); });
  }
  function delShow(id) {
    if (!LPX) return;
    LPX.members.fb().then(function (S) { return S.F.deleteDoc(S.F.doc(S.db, 'shows', id)); })
      .then(function () { ui.shows = ui.shows.filter(function (s) { return s.id !== id; }); if (ui.saved && ui.saved.id === id) { ui.saved = null; ui.savedSig = ''; } ui.arm = ''; ui.svMsg = T('Deleted. Its link opens nothing now.'); draw(); })
      .catch(function () { svSay(T('It did not delete. Try again.')); });
  }
  panel.addEventListener('toggle', function (ev) { if (ev.target.classList && ev.target.classList.contains('ir-sv-mine')) ui.mineOpen = ev.target.open; }, true);
  panel.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'ir-sv-t') ui.myTitle = t.value;
    else if (t.id === 'ir-sv-n') ui.myNote = t.value;
    else return;
    // the save button and the screen's link follow the words without a redraw (a redraw here would fight the typing)
    var go = panel.querySelector('[data-sv="save"]');
    if (go && ui.saved) { go.disabled = savedFresh(); var gs = go.querySelector('span'); if (gs) gs.textContent = savedFresh() ? T('Saved') : T('Save the changes'); }
    var sl = panel.querySelector('.ir-sm-show'); if (sl) sl.setAttribute('href', showUrl());
  });
  function copyText(t, done, fail) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { fallback(t) ? done() : fail(); }); else if (fallback(t)) done(); else fail();
  }
  function fallback(t) {
    try { var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  }
  function flash(b, txt) {
    // a button with no words of its own says what happened in its label, then gets its own label back (it was always "Copy
    // this one", in English, even on the saved shows' "Copy the link")
    var s = b.querySelector('span'), was = s ? s.textContent : '', wasL = b.getAttribute('aria-label');
    b.classList.add('done'); if (s) s.textContent = txt; else b.setAttribute('aria-label', txt);
    setTimeout(function () { b.classList.remove('done'); if (s) s.textContent = was; else if (wasL != null) b.setAttribute('aria-label', wasL); else b.removeAttribute('aria-label'); }, 1800);
  }
  panel.addEventListener('click', function (ev) {
    if (ev.target.closest('.ir-sm-show')) { sendEdit('screen'); return; }          // the link opens the screen; the record goes with it
    var b = ev.target.closest('button'); if (!b || !panel.contains(b)) return;
    var mk = b.getAttribute('data-mk');
    if (mk === 'toggle') { setOn(false); mkb.focus({ preventScroll: true }); return; }          // Close: the maker goes, focus back on its one door
    if (mk === 'more') { ui.page[ui.tab]++; draw(); return; }
    if (mk === 'rest') { ui.rest += 12; draw(); return; }
    if (mk === 'nolist') { ui.src = null; ui.sig = ''; draw(); var fb0 = panel.querySelector('[data-tab="run"]') || panel.querySelector('[data-mk="toggle"]'); if (fb0) fb0.focus(); return; }
    if (mk === 'best') { ui.set = ui.best.list.slice(); ui.mine = false; ui.acts.push('reset'); keepOrder(); rewords(); draw(); var rb = panel.querySelector('[data-tab="run"]'); if (rb) rb.focus(); return; }
    if (mk === 'copy') { sendEdit('copy'); copyText(packageText(), function () { flash(b, T('Copied: the words and every link')); }, function () { flash(b, T('Copying is blocked here')); }); return; }
    var sv = b.getAttribute('data-sv');
    if (sv) {
      if (sv === 'in' || sv === 'check' || sv === 'save') { saveShow(); return; }
      if (sv === 'copy' || sv === 'copyone') {
        var u1 = sv === 'copy' ? savedUrl(ui.saved.id) : savedUrl(b.getAttribute('data-id'));
        copyText(u1, function () { flash(b, T('Copied')); sendEdit('share'); }, function () { flash(b, T('Copying is blocked here')); }); return;
      }
      if (sv === 'pack') { copyText(packageText(), function () { flash(b, T('Copied: the link, the words and every source')); sendEdit('share'); }, function () { flash(b, T('Copying is blocked here')); }); return; }
      if (sv === 'share') { navigator.share({ title: curTitle(), text: curTitle(), url: savedUrl(ui.saved.id) }).then(function () { sendEdit('share'); }).catch(function () { }); return; }
      if (sv === 'del') {
        var di = b.getAttribute('data-id'), dt = panel.querySelector('details.ir-sv-mine'); ui.mineOpen = !!(dt && dt.open);
        if (ui.arm === di) { delShow(di); return; }
        ui.arm = di; draw(); var ab = panel.querySelector('[data-sv="del"][data-id="' + di + '"]'); if (ab) ab.focus();
        setTimeout(function () { if (ui.arm === di) { ui.arm = ''; draw(); } }, 4000);
        return;
      }
    }
    if (b.hasAttribute('data-mv')) {
      var mi = +b.getAttribute('data-i'), mv = b.getAttribute('data-mv'), sel;
      if (mv === 'up') { move(mi, mi - 1, 'u'); sel = '[data-mv="up"][data-i="' + (mi - 1) + '"]'; }
      else if (mv === 'down') { move(mi, mi + 1, 'd'); sel = '[data-mv="down"][data-i="' + (mi + 1) + '"]'; }
      else if (ui.set.length > 1) { ui.acts.push('x' + (mi + 1) + ':' + R.code(ui.set[mi])); ui.set.splice(mi, 1); ui.mine = true; keepOrder(); rewords(); sel = '[data-mv="out"][data-i="' + Math.min(mi, ui.set.length - 1) + '"]'; }
      draw(); var fb = sel && panel.querySelector(sel); if (fb && !fb.disabled) fb.focus(); return;
    }
    if (b.hasAttribute('data-add')) {
      if (ui.set.length >= maxN()) return;
      var ac = b.getAttribute('data-add'), ait = ui.pool.filter(function (x) { return R.code(x) === ac; })[0];
      if (ait) { ui.set.push(ait); ui.mine = true; ui.acts.push('a' + ui.set.length + ':' + ac); keepOrder(); rewords(); }
      draw(); var nb = panel.querySelector('.ir-sm-add'); if (nb) nb.focus(); return;
    }
    if (b.hasAttribute('data-tab')) { ui.tab = b.getAttribute('data-tab'); draw(); var tb = panel.querySelector('[data-tab="' + ui.tab + '"]'); if (tb) tb.focus(); return; }
    if (b.hasAttribute('data-dial')) {
      var k = b.getAttribute('data-dial'); st[k] = b.getAttribute('data-v'); save();
      if (k === 'kind') ui.sig = '';          // a live show and a video get different words (intro or hook, "live" titles)
      else { ui.pick = { titles: '', covers: '', descs: '' }; ui.page = { titles: 0, covers: 0, descs: 0 }; }
      draw(); var db = panel.querySelector('[data-dial="' + k + '"][aria-checked="true"]'); if (db) db.focus(); return;
    }
    if (b.hasAttribute('data-pick')) { var po = opts(b.getAttribute('data-pick'))[+b.getAttribute('data-i')]; if (po) ui.pick[b.getAttribute('data-pick')] = po.t; if (b.getAttribute('data-pick') === 'titles') ui.myTitle = null; draw(); var pb = panel.querySelector('[data-pick="' + b.getAttribute('data-pick') + '"][data-i="' + b.getAttribute('data-i') + '"]'); if (pb) pb.focus(); return; }
    if (b.hasAttribute('data-cp')) {
      var o = opts(b.getAttribute('data-cp'))[+b.getAttribute('data-i')]; if (!o) return;
      var txt = b.getAttribute('data-cp') === 'descs' ? fullDesc(o.t) : o.t;
      copyText(txt, function () { flash(b, T('Copied')); }, function () { flash(b, T('Copying is blocked here')); });
    }
  });
  /* SHOW MONEY (job 6hp9CRVm7P59vwGf, 19 October 2026). Beside each topic chip, what a live hour on that subject has
     earned in Super Chat on the English channel, and one line above the show maker with the places and the Ali show
     (projects/money/superchat-topics.py reads it off YouTube Studio and writes it). It is his income, so it is one
     database document that only an admin can read (firestore.rules, showmoney/); for anyone else the read is refused
     and nothing is drawn. Display only: he still picks. Since 21 Oct it is drawn whenever an admin is signed in (html
     class ir-money-on), no longer tied to the maker being open: the maker no longer stays open between visits. */
  var MONEY = null;
  // Liberty Politics only: it is the English channel's Super Chat, and Iran Uncensored (the page that hands a word table,
  // CFG.t) is Kaveh's channel, where an admin signed in saw his English income on the Persian chips
  var MONEY_HERE = !CFG.t;
  var MONEY_THIN = 10;          // under this many shows a topic's $/h is drawn faded with ~ (24 Oct 2026, see moneyPaint)
  function moneyLoad() {
    if (!MONEY_HERE) return;
    if (MONEY) { moneyPaint(); return; }
    lp(function (L) {
      if (!L || L.off || !signedIn(L) || !L.members.fb) return;
      L.members.fb().then(function (S) { return S.F.getDoc(S.F.doc(S.db, 'showmoney', 'topics')); })
        .then(function (snap) { if (!snap || !snap.exists()) return; MONEY = JSON.parse(snap.data().json); moneyPaint(); })
        .catch(function () { /* not an admin: the rules refuse it and the chips stay as they are */ });
    });
  }
  function moneyPaint() {
    if (!MONEY) return;
    document.documentElement.classList.add('ir-money-on');
    var by = {}, usd = function (n) { return '$' + Math.round(n); };
    (MONEY.topics || []).forEach(function (g) { if (g.shown) by[g.key] = g; });
    var box = $('ir-topics');
    if (box) [].forEach.call(box.querySelectorAll('[data-t]'), function (b) {
      var g = by[b.getAttribute('data-t')], m = b.querySelector('.ir-money');
      if (!g) { if (m) m.parentNode.removeChild(m); if (b.hasAttribute('data-mt0')) { var t0 = b.getAttribute('data-mt0'); if (t0) b.title = t0; else b.removeAttribute('title'); b.removeAttribute('data-mt0'); } return; }
      if (!m) { m = document.createElement('b'); m.className = 'ir-money'; b.appendChild(m); }
      // 24 Oct 2026 (Armin did not know what "$22/h" meant): the key line below says it; under THIN shows the figure is one
      // good night's luck (8 shows put Protests at $34 an hour), so it is faded and marked ~
      var thin = (g.streams || 0) < MONEY_THIN;
      m.classList.toggle('is-thin', thin);
      m.textContent = (thin ? '~' : '') + usd(g.perHour) + '/h';
      if (!b.hasAttribute('data-mt0')) b.setAttribute('data-mt0', b.getAttribute('title') || '');          // the chip's own tooltip, put back on sign-out
      b.title = 'Super Chat per live hour on this topic: ' + usd(g.perHour) + ' (' + g.streams + ' shows, ' + MONEY.window + '). Median show: ' + usd(MONEY.medianPerHour) + '.';
    });
    // WHAT "$/h" IS, said where the figures are (Topic in the filters panel): only an admin ever sees this
    var tsec = $('ir-dr-topic'), key = $('ir-money-key');
    if (tsec && !key) { key = document.createElement('p'); key.id = 'ir-money-key'; key.className = 'ir-money-key'; var tp0 = tsec.querySelector('.ir-dr-p'); tsec.insertBefore(key, tp0 ? tp0.nextSibling : tsec.firstChild); }
    if (key) key.innerHTML = '<b>$/h</b> beside a topic: the Super Chat your own live shows on that topic earned per hour on air, ' + esc(MONEY.windowLabel || MONEY.window) +
      ' (' + MONEY.streams + ' shows; a typical show ' + usd(MONEY.medianPerHour) + '/h). Read off YouTube Studio ' + esc(MONEY.readOn ? new Date(MONEY.readOn + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : '') + '. Only you see this. A faded ~ figure comes from under ' + MONEY_THIN + ' shows: too few to trust.';
    var line = $('ir-money-line');
    if (!line) { line = document.createElement('p'); line.id = 'ir-money-line'; line.className = 'ir-money-line'; panel.parentNode.insertBefore(line, panel); }
    var rows = (MONEY.places || []).concat(MONEY.ali ? [MONEY.ali] : []).filter(function (g) { return g.shown; })
      .sort(function (a, b) { return b.perHour - a.perHour; });
    line.textContent = 'Super Chat per live hour, ' + (MONEY.windowLabel || MONEY.window) + ' (' + MONEY.streams + ' shows, median ' + usd(MONEY.medianPerHour) + '): ' +
      rows.map(function (g) { return g.name + ' ' + usd(g.perHour); }).join(' · ') + '. Topic chips show theirs.';
  }
  if (R.onRender) R.onRender(draw);
  if (R.onRender) R.onRender(moneyPaint);
  lp(function (L) {
    if (L && L.members.sub) L.members.sub(function () {
      if (signedIn(L)) moneyLoad(); else moneyClear();          // signed out: his income leaves the page, tooltips and the line too
    });
  });
  function moneyClear() {
    MONEY = null;
    document.documentElement.classList.remove('ir-money-on');
    [].forEach.call(document.querySelectorAll('.ir-money'), function (m) { m.parentNode.removeChild(m); });
    [].forEach.call(document.querySelectorAll('[data-mt0]'), function (b) { var t0 = b.getAttribute('data-mt0'); if (t0) b.title = t0; else b.removeAttribute('title'); b.removeAttribute('data-mt0'); });
    var line = $('ir-money-line'); if (line) line.parentNode.removeChild(line);
    var key = $('ir-money-key'); if (key) key.parentNode.removeChild(key);
  }
  moneyLoad();
  // for build/phone-test.html, which checks every story of the hour against the gate: nothing here changes the page
  window.IRShow = { analyse: analyse, build: build, pickSet: pickSet, threadOrder: threadOrder, simOf: simOf, roleOf: roleOf, toks: toks, fits: fits, lint: lint, vScore: vScore, scorer: scorer, ui: ui, st: st,
    money: function (d) { MONEY = d; moneyPaint(); } };          // phone-test hands it a made-up table; the real one only comes from the database

  /* ---------------------------------------------------------------- SAVE LISTS (24 October 2026)
     Armin: "every single item that I click on can be saved. For example, every tweet, every YouTube video, and every news
     article, I should be able to save it and add it to a save list. I could create multiple save lists ... and change the
     order of it. I should be able to have a link to that save list where I could share my save list, and every save list
     should be able to be turned into a show as well, by itself ... 'Make a Show' option should be available for a list that
     I create myself, and figure out the order and everything of it."
     THE CONTROL: a bookmark beside every card (intel.js CARDX: a sibling button, so the card is still one tap target), in the
     spotlight's buttons (SPOTA) and on the show screen's stage. One tap saves to the list used last and says so, with Change
     list and Undo; the first save ever makes a list called Saved. Change list is a sheet with every list (an item can be in
     several) and a box for a new one. A saved item's bookmark is filled everywhere.
     THE LISTS: one door on the room's bar, "Lists" with how many, beside Make a show (a different tool: the show maker keeps
     its ONE DOOR). Each list: rename, delete (tap twice), move items up and down (and drag them on a computer), take one out,
     Arrange for a show (the run order of the show maker, story by story; undo), Make a show from this list, Share link, Copy
     as text.
     WHERE IT LIVES: on this device (localStorage 'ir-lists'), each item as a copy (snapItem: the room's own fields, without
     its working notes), so a list keeps working after its items leave the room's last 24 hours. Signed in, every list is
     also savelists/<id> on the account (firebase/firestore.rules "savelists": only its owner reads and writes it; anyone with
     the link reads it once it is shared), so the phone and the computer hold the same lists; the two are merged on sign-in,
     list by list, the later change winning, and nothing made on the device signed out is lost. Sharing needs the free
     account with a confirmed email, as saving a show does: a shared list is a page with its maker's name on it.
     THE LINK: ?l=<id> is the list as a page (title, maker, every item with its source; regime media never a link), with
     Make a show from this list and Save a copy to my lists. Openings are counted, never who.
     A SHOW FROM A LIST: the maker opens with the list as its pool ("Built from: your list ..."); a list put in order by hand
     opens in that order, the best order one tap away; the show screen finds an item that has left the room in this device's
     lists. build/phone-test.html "SAVE LISTS" clicks all of it. */
  var LKEY = 'ir-lists', LMAX = 50, LITEMS = 100;
  var DEFNAME = FA ? T('Saved items') : 'Saved';          // the list the first save ever makes (on the Persian page its own word: "Saved" there is the button's)
  var BM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z"/></svg>';
  var LISTI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z"/><path d="M9.5 8h5M9.5 11h5"/></svg>';
  var DRAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/></svg>';
  function okList(l) { return !!l && typeof l === 'object' && typeof l.id === 'string' && /^[a-z0-9]{8,24}$/.test(l.id) && typeof l.name === 'string' && Array.isArray(l.items); }
  var LS = (function () { var v = store(LKEY); return v && typeof v === 'object' && Array.isArray(v.lists) ? v : {}; })();
  LS = { v: 1, last: typeof LS.last === 'string' ? LS.last : '', lists: (LS.lists || []).filter(okList), gone: Array.isArray(LS.gone) ? LS.gone.filter(function (x) { return typeof x === 'string'; }) : [] };
  LS.lists.forEach(function (l) { l.items = l.items.map(cleanSnap).filter(function (o) { return o && o._code; }); l.views = +l.views || 0; if (typeof l.uid !== 'string') l.uid = ''; });          // a list's copies come in through cleanSnap too
  var ME = '';          // the account signed in, once community.js knows it ('' signed out)
  var LV = { open: '', arm: '', ren: false, msg: '', undo: null, drag: -1, sharing: '' };          // the Lists panel: the list open, the delete armed, renaming
  function lsSave() { if (store(LKEY, LS) === null) { toast(T('This device has no room left for lists. Take some items out.')); return false; } return true; }
  // the lists of whoever is here: signed in, theirs and the ones made on this device signed out; signed out, only those
  // (until 24 Oct 2026 signing out showed every account's synced lists on a shared computer)
  function lists() { return LS.lists.filter(function (l) { return !l.uid || l.uid === ME; }); }
  function byList(id) { return lists().filter(function (l) { return l.id === id; })[0] || null; }
  function has(l, c) { return l.items.some(function (o) { return o._code === c; }); }
  function savedIn(c) { return lists().filter(function (l) { return has(l, c); }); }
  // an item that has left the room, from this device's own copies (the show screen, a show made from a list)
  function lsSnap(c) { for (var i = 0; i < LS.lists.length; i++) for (var j = 0; j < LS.lists[i].items.length; j++) if (LS.lists[i].items[j]._code === c) return LS.lists[i].items[j]; return null; }
  // the freshest copy of a list's item: the room's own while it is still there (its counts move), else the list's
  function fresh(o) { return (o._code && R.byId(o._code)) || o; }
  function srcPool() { return ui.src ? ui.src.items.map(fresh) : []; }
  function fromLine() { return ui.src ? (ui.src.by ? T('the list "{name}" by {who}', { name: ui.src.name, who: ui.src.by }) : T('your list "{name}"', { name: ui.src.name })) : R.filterLine ? R.filterLine() : ''; }          // a shared list someone sent is theirs, not "your list"
  function makeList(name) {
    if (lists().length >= LMAX) { toast(T('You have {n} lists, the most there can be. Delete one first.', { n: N(LMAX) })); return null; }
    var l = { id: newId(), name: String(name || DEFNAME).replace(/[<>]/g, '').trim().slice(0, 60) || DEFNAME, items: [], mine: false, at: Date.now(), sv: 0, dirty: true, shared: false, uid: ME, views: 0 };
    LS.lists.unshift(l);
    return l;
  }
  // a change to a list: kept on this device at once, sent to the account a moment later, every mark and the door redrawn
  function touch(l) { if (l) { l.at = Date.now(); l.dirty = true; } lsSave(); lsSyncSoon(); marks(); if (lsDlg && lsDlg.open) lsDraw(); }
  var SVREG = {};          // the item behind every Save button drawn, by its code (an add-on's list in the spotlight is not in the room's index)
  function svFor(c) { return SVREG[c] || R.byId(c) || lsSnap(c); }
  function saveBtn(it, cls) {
    var c = R.code(it), on = savedIn(c).length > 0;
    SVREG[c] = it;
    return '<button type="button" class="ir-svb' + (cls ? ' ' + cls : '') + (on ? ' is-on' : '') + '" data-svk="' + esc(c) + '" aria-pressed="' + on + '" aria-label="' + esc(on ? T('Saved to a list. Change it') : T('Save to a list')) + '" title="' + esc(on ? T('Saved to a list. Change it') : T('Save to a list')) + '">' + BM +
      (/\bir-svb-w\b/.test(cls || '') ? '<span>' + esc(on ? T('Saved') : T('Save')) + '</span>' : '') + '</button>';
  }
  // every Save button on the page follows the lists, and the door says how many there are
  function marks() {
    [].forEach.call(document.querySelectorAll('[data-svk]'), function (b) {
      var on = savedIn(b.getAttribute('data-svk')).length > 0, w = on ? T('Saved to a list. Change it') : T('Save to a list');
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', w); b.title = w;
      var sp = b.querySelector('span'); if (sp) sp.textContent = on ? T('Saved') : T('Save');
    });
    var n = $('ir-ls-n'); if (n) n.textContent = lists().length ? N(lists().length) : '';
  }
  function addItem(l, it) {
    if (!l || has(l, R.code(it))) return false;
    if (l.items.length >= LITEMS) { toast(T('"{name}" holds {n} items, the most a list can. Start another list.', { name: l.name, n: N(LITEMS) })); return false; }
    l.items.push(snapItem(it)); LS.last = l.id; touch(l);
    return true;
  }
  function dropItem(l, c) { var n0 = l.items.length; l.items = l.items.filter(function (o) { return o._code !== c; }); if (l.items.length !== n0) touch(l); }
  // One tap: into the list used last (the first ever makes "Saved"); a tap on a filled bookmark opens Change list
  function tapSave(c, btn) {
    var it = svFor(c); if (!it) return;
    if (savedIn(c).length) { openPick(c, btn); return; }
    var l = byList(LS.last) || lists()[0] || makeList(DEFNAME);
    if (!l || !addItem(l, it)) return;
    toast(T('Saved to "{name}"', { name: l.name }), [[T('Change list'), function () { openPick(c, btn); }], [T('Undo'), function () { dropItem(l, c); toast(T('Taken out of "{name}"', { name: l.name })); }]]);
  }
  /* The short line that says what a tap did, with what can be done next. It sits where the reader is: inside the open
     sheet or spotlight (a page under a modal cannot be tapped), on the show screen or the list's page, else at the foot. */
  var toastT = 0;
  function toast(msg, acts) {
    var old = $('ir-svt'); if (old) old.remove();
    clearTimeout(toastT);
    var host = [$('ir-svd'), lsDlg, $('ir-spot')].filter(function (d) { return d && d.open; })[0] || $('ir-sh') || $('ir-lp') || document.body;
    var el = document.createElement('div'); el.className = 'ir-svt ir-keep'; el.id = 'ir-svt'; el.setAttribute('role', 'status');
    el.innerHTML = '<p>' + esc(msg) + '</p>' + (acts || []).map(function (a, i) { return '<button type="button" data-svt="' + i + '">' + esc(a[0]) + '</button>'; }).join('') +
      '<button type="button" class="ir-svt-x" data-svt="x" aria-label="' + esc(T('Close')) + '">&times;</button>';
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-svt]'); if (!b) return;
      ev.stopPropagation();
      var k = b.getAttribute('data-svt'); el.remove();
      if (k !== 'x' && acts && acts[+k]) acts[+k][1]();
    });
    host.appendChild(el);
    toastT = setTimeout(function () { if (el.isConnected && !el.contains(document.activeElement)) el.remove(); }, 10000);
  }
  /* ---- Change list: the sheet. A modal of its own, so it opens over the spotlight as well as over the room. */
  var pickDlg = null, pickC = '', pickBack = null;
  function openPick(c, back) {
    pickC = c; pickBack = back || null;
    if (!pickDlg) {
      pickDlg = document.createElement('dialog'); pickDlg.className = 'ir-spot ir-svd ir-keep'; pickDlg.id = 'ir-svd'; pickDlg.setAttribute('aria-labelledby', 'ir-svd-h');
      document.body.appendChild(pickDlg);
      pickDlg.addEventListener('click', function (ev) {
        if (ev.target === pickDlg) { closePick(); return; }
        var b = ev.target.closest('button'); if (!b) return;
        if (b.hasAttribute('data-svd-x')) closePick();
      });
      pickDlg.addEventListener('change', function (ev) {
        var cb = ev.target; if (!cb.hasAttribute('data-svd-l')) return;
        var l = byList(cb.getAttribute('data-svd-l')), it = svFor(pickC); if (!l || !it) return;
        if (cb.checked) { if (!addItem(l, it)) cb.checked = false; } else dropItem(l, pickC);
        pickDraw(cb.getAttribute('data-svd-l'));
      });
      pickDlg.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var inp = $('ir-svd-n'), nm = inp ? inp.value.trim() : '', it = svFor(pickC);
        if (!nm) { if (inp) inp.focus(); return; }
        var l = makeList(nm); if (!l) return;
        if (it) addItem(l, it); else touch(l);
        pickDraw(l.id);
      });
      // its keys are its own: typing a list's name must not step the spotlight or the show screen behind it ("F" ran the stream)
      pickDlg.addEventListener('keydown', function (ev) { ev.stopPropagation(); });
      pickDlg.addEventListener('close', function () { var b = pickBack; pickBack = null; if (b && b.isConnected) try { b.focus({ preventScroll: true }); } catch (e) { } });
    }
    pickDraw();
    if (!pickDlg.open) { if (pickDlg.showModal) pickDlg.showModal(); else pickDlg.setAttribute('open', ''); }
    var f = pickDlg.querySelector('input[type="checkbox"]') || $('ir-svd-n'); if (f) f.focus();
  }
  function closePick() { if (pickDlg && pickDlg.open) { if (pickDlg.close) pickDlg.close(); else pickDlg.removeAttribute('open'); } }
  // A redraw of a sheet keeps the line that says what a tap did (its Undo was wiped a second later by the account's answer)
  function keepToast(host, fn) {
    var t = $('ir-svt'), inside = !!(t && host.contains(t));
    fn();
    if (inside && !t.isConnected) host.appendChild(t);
  }
  function pickDraw(focusId) {
    var it = svFor(pickC), ls = lists();
    keepToast(pickDlg, function () { pickHtml(it, ls); });
    if (focusId) { var cb = pickDlg.querySelector('[data-svd-l="' + focusId + '"]'); if (cb) cb.focus(); }
  }
  function pickHtml(it, ls) {
    pickDlg.innerHTML = '<div class="ir-s-in"><div class="ir-s-top"><h2 class="ir-svd-h" id="ir-svd-h">' + esc(T('Save to a list')) + '</h2><button class="ir-s-x" type="button" data-svd-x aria-label="' + esc(T('Close')) + '">&times;</button></div>' +
      (it ? '<p class="ir-svd-it"' + (FA ? ' dir="auto"' : '') + '>' + R.mark(it) + '<span>' + esc(String(it.t || '').slice(0, 160)) + '</span></p>' : '') +
      (ls.length ? '<ul class="ir-svd-ls">' + ls.map(function (l) {
        return '<li><label><input type="checkbox" data-svd-l="' + esc(l.id) + '"' + (has(l, pickC) ? ' checked' : '') + '><span' + (FA ? ' dir="auto"' : '') + '>' + esc(l.name) + '</span><small>' + esc(l.items.length === 1 ? T('1 item') : T('{n} items', { n: N(l.items.length) })) + '</small></label></li>';
      }).join('') + '</ul>' : '<p class="ir-svd-none">' + esc(T('No lists yet. Name the first one below.')) + '</p>') +
      '<form class="ir-svd-new" autocomplete="off"><label for="ir-svd-n">' + esc(T('A new list')) + '</label><span><input id="ir-svd-n" type="text" maxlength="60" dir="auto" placeholder="' + esc(T('Name it, for example Friday show')) + '"><button type="submit">' + ICON.plus + '<span>' + esc(T('Make it')) + '</span></button></span></form>' +
      '<button type="button" class="ir-svd-done" data-svd-x>' + esc(T('Done')) + '</button></div>';
  }
  // Save buttons anywhere (cards, spotlight, show screen, a list's page): caught first, so a card's own tap never fires too
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-svk]'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    tapSave(b.getAttribute('data-svk'), b);
  }, true);
  if (R.addCardX) R.addCardX(function (it) { return saveBtn(it, 'ir-c-sv'); });
  if (R.addSpotAct) R.addSpotAct(function (it) { return saveBtn(it, 'ir-svb-w ir-s-b'); });

  /* ---- the Lists door and its panel */
  var lsb = document.createElement('button');
  lsb.type = 'button'; lsb.className = 'ir-cb ir-cb-ls'; lsb.id = 'ir-ls-b'; lsb.setAttribute('aria-haspopup', 'dialog');
  lsb.innerHTML = LISTI + '<span>' + esc(T('Lists')) + '</span><i class="num" id="ir-ls-n"></i>';
  if (cmdb) { if (mkb.parentNode === cmdb) cmdb.insertBefore(lsb, mkb.nextSibling); else cmdb.appendChild(lsb); }
  var lsDlg = document.createElement('dialog');
  lsDlg.className = 'ir-spot ir-ls ir-keep'; lsDlg.id = 'ir-ls'; lsDlg.setAttribute('aria-labelledby', 'ir-ls-h');
  document.body.appendChild(lsDlg);
  lsDlg.addEventListener('keydown', function (ev) { ev.stopPropagation(); });          // as the Save sheet: its keys never reach the room
  marks();
  function lsOpen(id) {
    LV.open = id || ''; LV.arm = ''; LV.ren = false; LV.msg = '';
    lsDraw();
    if (!lsDlg.open) { if (lsDlg.showModal) lsDlg.showModal(); else lsDlg.setAttribute('open', ''); }
    var f = lsDlg.querySelector('[data-ls-go], [data-ls="new"], .ir-s-x'); if (f) f.focus();
  }
  function lsClose() { if (lsDlg.open) { if (lsDlg.close) lsDlg.close(); else lsDlg.removeAttribute('open'); } }
  lsb.addEventListener('click', function () { lsOpen(''); });
  function listUrl(id) { return location.origin + location.pathname + '?l=' + id; }
  function changed(l) { return l.at ? T('changed {t}', { t: R.ago ? R.ago(l.at) : dayOf(l.at) }) : ''; }
  function where() {
    var me = who(LPX);
    if (!LPX) return '<p class="ir-ls-where">' + esc(T('Your lists are kept on this device.')) + '</p>';
    if (!me) return '<p class="ir-ls-where">' + esc(T('Your lists are kept on this device. Sign in, free, and they are on your phone and your computer too.')) + ' <button type="button" class="ir-ls-in" data-ls="in">' + esc(T('Sign in')) + '</button></p>';
    return '<p class="ir-ls-where">' + esc(T('On your account: the same lists on every device you sign in on.')) + '</p>';
  }
  function lsDraw() {
    var l = LV.open ? byList(LV.open) : null, h;
    if (!l) {
      LV.open = '';
      var ls = lists();
      h = '<div class="ir-s-in"><div class="ir-s-top"><h2 class="ir-ls-h" id="ir-ls-h">' + LISTI + '<span>' + esc(T('Your lists')) + '</span></h2><button class="ir-s-x" type="button" data-ls="x" aria-label="' + esc(T('Close')) + '">&times;</button></div>' +
        (ls.length ? '<ul class="ir-ls-all">' + ls.map(function (x) {
          return '<li><button type="button" data-ls-go="' + esc(x.id) + '"><b' + (FA ? ' dir="auto"' : '') + '>' + esc(x.name) + '</b><small>' + esc([x.items.length === 1 ? T('1 item') : T('{n} items', { n: N(x.items.length) }), changed(x), x.shared ? T('shared') : ''].filter(Boolean).join(' · ')) + '</small>' + (RTL ? ICON.prev : ICON.next) + '</button></li>';
        }).join('') + '</ul>' : '<p class="ir-ls-none">' + esc(T('Nothing saved yet. Tap the bookmark on any post, video or article to keep it here.')) + '</p>') +
        '<form class="ir-svd-new ir-ls-new" autocomplete="off"><label for="ir-ls-nn">' + esc(T('A new list')) + '</label><span><input id="ir-ls-nn" type="text" maxlength="60" dir="auto" placeholder="' + esc(T('Name it, for example Friday show')) + '"><button type="submit" data-ls="new">' + ICON.plus + '<span>' + esc(T('Make it')) + '</span></button></span></form>' +
        where() + '<p class="ir-ls-msg" aria-live="polite">' + esc(LV.msg) + '</p></div>';
      lsKeep(function () { lsDlg.innerHTML = h; });
      return;
    }
    var n = l.items.length, last = n - 1, arm = LV.arm === l.id;
    h = '<div class="ir-s-in"><div class="ir-s-top"><button type="button" class="ir-s-bk" data-ls="home"><span aria-hidden="true">' + (RTL ? '&rsaquo;' : '&lsaquo;') + '</span> ' + esc(T('All lists')) + '</button><button class="ir-s-x" type="button" data-ls="x" aria-label="' + esc(T('Close')) + '">&times;</button></div>' +
      (LV.ren ? '<form class="ir-svd-new ir-ls-ren" autocomplete="off"><label for="ir-ls-rn">' + esc(T('The list\'s name')) + '</label><span><input id="ir-ls-rn" type="text" maxlength="60" dir="auto" value="' + esc(l.name) + '"><button type="submit">' + esc(T('Save')) + '</button></span></form>'
        : '<h2 class="ir-ls-h ir-ls-name" id="ir-ls-h"' + (FA ? ' dir="auto"' : '') + '>' + esc(l.name) + '</h2>') +
      '<p class="ir-ls-meta">' + esc([n === 1 ? T('1 item') : T('{n} items', { n: N(n) }), changed(l), l.mine ? T('in your own order') : ''].filter(Boolean).join(' · ')) + '</p>' +
      '<div class="ir-ls-acts">' +
      '<button type="button" class="ir-ls-show" data-ls="show"' + (n ? '' : ' disabled') + '>' + ICON.play + '<span>' + esc(T('Make a show from this list')) + '</span></button>' +
      '<button type="button" data-ls="arrange"' + (n > 1 ? '' : ' disabled') + '>' + ICON.redo + '<span>' + esc(T('Arrange for a show')) + '</span></button>' +
      '<button type="button" data-ls="share"' + (n ? '' : ' disabled') + '>' + ICON.link + '<span>' + esc(l.shared ? T('The link') : T('Share link')) + '</span></button>' +
      '<button type="button" data-ls="text"' + (n ? '' : ' disabled') + '>' + ICON.copy + '<span>' + esc(T('Copy as text')) + '</span></button>' +
      '<button type="button" data-ls="ren">' + ICON.notes + '<span>' + esc(T('Rename')) + '</span></button>' +
      '<button type="button" data-ls="del" class="' + (arm ? 'is-arm' : '') + '">' + ICON.out + '<span>' + esc(arm ? T('Tap again to delete the list') : T('Delete the list')) + '</span></button></div>' +
      shareBox(l) + '<p class="ir-ls-msg" aria-live="polite">' + esc(LV.msg) + '</p>' +
      (n ? '<ol class="ir-ls-its">' + l.items.map(function (o, i) {
        var x = fresh(o);
        return '<li draggable="true" data-ls-i="' + i + '"><span class="ir-ls-grip" aria-hidden="true" title="' + esc(T('Drag to move it')) + '">' + DRAG + '</span><span class="num">' + N(i + 1) + '</span>' + R.mark(x) +
          (isReg(x) ? '<span class="ir-sm-a"' + (FA ? ' dir="auto"' : '') + '>' + esc(x.t) + '</span>' : '<a href="' + esc(href(x.u)) + '" target="_blank" rel="' + RELN + ' nofollow"' + (FA ? ' dir="auto"' : '') + '>' + esc(x.t) + '</a>') +
          '<span class="ir-sm-mv"><button type="button" data-ls-mv="up" data-i="' + i + '" aria-label="' + esc(T('Move up')) + '"' + (i ? '' : ' disabled') + '>' + MOVE.up + '</button>' +
          '<button type="button" data-ls-mv="down" data-i="' + i + '" aria-label="' + esc(T('Move down')) + '"' + (i < last ? '' : ' disabled') + '>' + MOVE.down + '</button>' +
          '<button type="button" data-ls-mv="out" data-i="' + i + '" aria-label="' + esc(T('Take it out of the list')) + '">' + MOVE.out + '</button></span>' +
          '<small>' + esc(bitsOf(x)) + (isReg(x) ? ' · ' + esc(T('Regime media: not linked.')) : '') + '</small></li>';
      }).join('') + '</ol>' : '<p class="ir-ls-none">' + esc(T('This list is empty. Tap the bookmark on any item to put it here.')) + '</p>') + '</div>';
    lsKeep(function () { lsDlg.innerHTML = h; });
  }
  // a redraw keeps the cursor in the box being typed in
  function lsKeep(fn) {
    var a = document.activeElement, id = a && lsDlg.contains(a) && a.id, s0 = id && a.selectionStart, s1 = id && a.selectionEnd;
    keepToast(lsDlg, fn);
    var b = id && $(id); if (!b) return;
    b.focus({ preventScroll: true }); try { if (s0 != null) b.setSelectionRange(s0, s1); } catch (e) { }
  }
  function shareBox(l) {
    if (LV.sharing !== l.id && !l.shared) return '';
    var me = who(LPX);
    if (!LPX) return '<div class="ir-ls-sh"><p>' + esc(T('Sharing works on the live site.')) + '</p></div>';
    if (!me) return '<div class="ir-ls-sh"><p>' + esc(T('A shared list carries its maker\'s name, so sharing needs the free account.')) + '</p><button type="button" class="ir-sv-go" data-ls="in">' + ICON.save + '<span>' + esc(T('Sign in to share it')) + '</span></button></div>';
    if (!me.v) return '<div class="ir-ls-sh"><p>' + esc(T('We sent you a link when you made the account. One tap on it and you can share.')) + '</p><button type="button" class="ir-sv-go" data-ls="check">' + ICON.save + '<span>' + esc(T('Confirm your email to share it')) + '</span></button></div>';
    if (!l.shared || l.dirty || !l.sv) return '<div class="ir-ls-sh"><p>' + esc(T('Making the link...')) + '</p></div>';
    var url = listUrl(l.id);
    return '<div class="ir-ls-sh"><p>' + esc(T('Anyone with this link can open the list, make a show from it or save a copy.')) + (l.views ? ' ' + esc(l.views === 1 ? T('opened once') : T('opened {n} times', { n: N(l.views) })) : '') + '</p>' +
      '<div class="ir-sv-link"><label class="vh" for="ir-ls-u">' + esc(T('The link')) + '</label><input id="ir-ls-u" type="text" readonly dir="ltr" value="' + esc(url) + '"><button type="button" data-ls="copy">' + ICON.copy + '<span>' + esc(T('Copy the link')) + '</span></button></div>' +
      shareTo(l.name, l.items.length, url, 'data-ls="send"',
        '<a href="' + esc(url) + '" target="_blank" rel="' + RELN + '">' + esc(T('Open it as they will')) + '</a><button type="button" data-ls="unshare">' + esc(T('Stop sharing')) + '</button>') + '</div>';
  }
  /* SHARING A LIST (24 Oct 2026): one row of places to send it, the same for its maker and for anyone the link reaches (a
     list's page passes itself on). The words that go with the link say what it is ("Friday show: 12 items from the Intel
     Room"), because the site is static: every list's link shows the Intel Room's own preview card when pasted, never one
     made for the list (README, "Save lists"). X, WhatsApp, Telegram and email open their own share pages; Send is the
     phone's own share sheet where there is one. */
  function shareWords(name, n) { return T('{name}: {n} items from the Intel Room', { name: name, n: N(n) }); }
  function shareTo(name, n, url, sendAttr, extra) {
    var enc = encodeURIComponent, w = shareWords(name, n);
    return '<div class="ir-sv-to" role="group" aria-label="' + esc(T('Send it')) + '">' + (navigator.share ? '<button type="button" ' + sendAttr + '>' + ICON.share + '<span>' + esc(T('Send')) + '</span></button>' : '') +
      '<a href="https://wa.me/?text=' + enc(w + '\n' + url) + '" target="_blank" rel="' + RELN + '">WhatsApp</a><a href="https://t.me/share/url?url=' + enc(url) + '&text=' + enc(w) + '" target="_blank" rel="' + RELN + '">Telegram</a>' +
      '<a href="https://x.com/intent/post?text=' + enc(w) + '&url=' + enc(url) + '" target="_blank" rel="' + RELN + '">X</a>' +
      '<a href="mailto:?subject=' + enc(name) + '&body=' + enc(w + '\n\n' + url) + '">' + esc(T('Email')) + '</a>' + (extra || '') + '</div>';
  }
  function listText(name, its) {
    var out = [name, ''];
    its.forEach(function (o, i) { var x = fresh(o); out.push(N(i + 1) + '. ' + String(x.t || '').replace(/\s+/g, ' ').trim() + '\n   ' + (isReg(x) ? T('Regime media: not linked.') : x.u)); });
    out.push('', T('Made in the Intel Room: {site}', { site: 'https://' + SITE_MARK }));
    return out.join('\n');
  }
  function lsMove(l, i, to) {
    if (to < 0 || to >= l.items.length || i === to) return;
    var o = l.items.splice(i, 1)[0]; l.items.splice(to, 0, o); l.mine = true; touch(l);
  }
  // "Arrange for a show": the show maker's own order (threadOrder), story by story; undo puts the old order back
  function arrange(l) {
    var prev = { items: l.items.slice(), mine: l.mine }, pool = l.items.map(fresh);
    pool.score = scorer(pool);
    var o = threadOrder(pool), byC = {};
    l.items.forEach(function (x) { byC[x._code] = x; });
    var next = o.list.map(function (x) { return byC[R.code(x)]; }).filter(Boolean);
    l.items.forEach(function (x) { if (next.indexOf(x) < 0) next.push(x); });
    l.items = next; l.mine = false; touch(l);
    toast(T('Arranged for a show: story by story'), [[T('Undo'), function () { l.items = prev.items; l.mine = prev.mine; touch(l); }]]);
  }
  // A show from a list: the maker opens with the list as its pool
  function makeFrom(src) {
    lsClose();
    ui.src = { id: src.id || '', name: src.name, items: src.items.slice(), mine: !!src.mine, by: !src.mineToo && src.by ? String(src.by) : '' };
    ui.sig = ''; ui.tab = 'run';
    if (st.on) draw(); else setOn(true);
    setTimeout(function () { panel.scrollIntoView({ block: 'start', behavior: 'smooth' }); var r = panel.querySelector('[data-tab="run"]') || panel.querySelector('[data-mk="toggle"]'); if (r) r.focus({ preventScroll: true }); }, 60);
  }
  lsDlg.addEventListener('click', function (ev) {
    if (ev.target === lsDlg) { lsClose(); return; }
    var b = ev.target.closest('button'); if (!b || !lsDlg.contains(b)) return;
    var l = byList(LV.open), k = b.getAttribute('data-ls');
    if (b.hasAttribute('data-ls-go')) { LV.open = b.getAttribute('data-ls-go'); LV.arm = ''; LV.ren = false; LV.msg = ''; lsDraw(); var f0 = lsDlg.querySelector('[data-ls="home"]'); if (f0) f0.focus(); return; }
    if (k === 'x') { lsClose(); return; }
    if (k === 'home') { var was = LV.open; LV.open = ''; LV.msg = ''; lsDraw(); var f1 = lsDlg.querySelector('[data-ls-go="' + was + '"]'); if (f1) f1.focus(); return; }
    if (k === 'in') { if (LPX) { LV.wantShare = LV.sharing; LPX.members.open('auth', { opener: lsb }); } return; }
    if (k === 'check') { if (LPX) LPX.members.open('check', { resend: true, opener: lsb }); return; }
    if (!l) return;
    if (k === 'show') { makeFrom(l); return; }
    if (k === 'arrange') { arrange(l); return; }
    if (k === 'text') { copyText(listText(l.name, l.items), function () { flash(b, T('Copied: every item and its link')); }, function () { flash(b, T('Copying is blocked here')); }); return; }
    if (k === 'ren') { LV.ren = !LV.ren; lsDraw(); var ri = $('ir-ls-rn'); if (ri) { ri.focus(); ri.select(); } return; }
    if (k === 'del') {
      if (LV.arm !== l.id) { LV.arm = l.id; lsDraw(); var ab = lsDlg.querySelector('[data-ls="del"]'); if (ab) ab.focus(); setTimeout(function () { if (LV.arm === l.id) { LV.arm = ''; if (lsDlg.open) lsDraw(); } }, 4000); return; }
      LS.lists = LS.lists.filter(function (x) { return x !== l; });
      if (l.sv) LS.gone.push(l.id);
      if (LS.last === l.id) LS.last = '';
      LV.open = ''; LV.arm = ''; LV.msg = T('Deleted "{name}".', { name: l.name }) + (l.shared ? ' ' + T('Its link opens nothing now.') : '');
      touch(null); lsDraw(); var nb = lsDlg.querySelector('[data-ls-go], #ir-ls-nn'); if (nb) nb.focus(); return;
    }
    if (k === 'share') {
      LV.sharing = l.id;
      var me = who(LPX);
      if (me && me.v && !l.shared) { l.shared = true; touch(l); }
      else lsDraw();
      var sf = lsDlg.querySelector('.ir-ls-sh button, #ir-ls-u'); if (sf) sf.focus();
      return;
    }
    if (k === 'unshare') { l.shared = false; LV.sharing = ''; LV.msg = T('Not shared any more: its link opens nothing now.'); touch(l); return; }
    if (k === 'copy') { copyText(listUrl(l.id), function () { flash(b, T('Copied')); }, function () { flash(b, T('Copying is blocked here')); }); return; }
    if (k === 'send') { navigator.share({ title: l.name, text: shareWords(l.name, l.items.length), url: listUrl(l.id) }).catch(function () { }); return; }
    if (b.hasAttribute('data-ls-mv')) {
      var i = +b.getAttribute('data-i'), mv = b.getAttribute('data-ls-mv'), sel;
      if (mv === 'up') { lsMove(l, i, i - 1); sel = '[data-ls-mv="up"][data-i="' + (i - 1) + '"]'; }
      else if (mv === 'down') { lsMove(l, i, i + 1); sel = '[data-ls-mv="down"][data-i="' + (i + 1) + '"]'; }
      else { var gone = l.items[i]; dropItem(l, gone._code); sel = '[data-ls-mv="out"][data-i="' + Math.min(i, l.items.length - 1) + '"]'; toast(T('Taken out of "{name}"', { name: l.name }), [[T('Undo'), function () { l.items.splice(Math.min(i, l.items.length), 0, gone); touch(l); }]]); }
      var fb = lsDlg.querySelector(sel); if (fb && !fb.disabled) fb.focus(); else { var fo = lsDlg.querySelector('[data-ls="home"]'); if (fo) fo.focus(); }
    }
  });
  lsDlg.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target;
    if (f.classList.contains('ir-ls-ren')) {
      var l = byList(LV.open), v = ($('ir-ls-rn').value || '').replace(/[<>]/g, '').trim().slice(0, 60);
      if (l && v) { l.name = v; LV.ren = false; touch(l); var nm = lsDlg.querySelector('[data-ls="ren"]'); if (nm) nm.focus(); }
      return;
    }
    var inp = $('ir-ls-nn'), name = inp ? inp.value.trim() : '';
    if (!name) { if (inp) inp.focus(); return; }
    var nl = makeList(name); if (!nl) return;
    LS.last = nl.id; LV.open = nl.id; LV.msg = T('Made. Tap the bookmark on any item to put it here.'); touch(nl);
    var hb = lsDlg.querySelector('[data-ls="home"]'); if (hb) hb.focus();
  });
  // drag to reorder, on a computer (the up and down buttons do the same on a phone)
  lsDlg.addEventListener('dragstart', function (ev) { var li = ev.target.closest && ev.target.closest('[data-ls-i]'); if (!li) return; LV.drag = +li.getAttribute('data-ls-i'); li.classList.add('is-drag'); try { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(LV.drag)); } catch (e) { } });
  lsDlg.addEventListener('dragover', function (ev) { var li = ev.target.closest && ev.target.closest('[data-ls-i]'); if (!li || LV.drag < 0) return; ev.preventDefault(); [].forEach.call(lsDlg.querySelectorAll('.is-over'), function (x) { x.classList.remove('is-over'); }); li.classList.add('is-over'); });
  lsDlg.addEventListener('dragend', function () { LV.drag = -1; [].forEach.call(lsDlg.querySelectorAll('.is-over,.is-drag'), function (x) { x.classList.remove('is-over', 'is-drag'); }); });
  lsDlg.addEventListener('drop', function (ev) {
    var li = ev.target.closest && ev.target.closest('[data-ls-i]'), l = byList(LV.open); if (!li || !l || LV.drag < 0) return;
    ev.preventDefault();
    var from = LV.drag, to = +li.getAttribute('data-ls-i'); LV.drag = -1;
    lsMove(l, from, to);
  });
  if (location.hash === '#lists') { if (history.replaceState) history.replaceState(null, '', location.pathname + location.search); if (!/[?&](show|s|l)=/.test(location.search)) setTimeout(function () { lsOpen(''); }, 200); }

  /* ---- the lists on the account (savelists/, firebase/firestore.rules) */
  var LSY = { t: 0, busy: false, again: false, uid: '', name: null };
  function lsItemsJson(l) {
    var list = l.items.map(function (o) { return Object.assign({}, o); }), js = JSON.stringify(list);
    ['also', 'lsn', 'cd', 'm', 'tx'].forEach(function (k) { if (js.length > 190000) { list.forEach(function (o) { delete o[k]; }); js = JSON.stringify(list); } });
    return js.length > 190000 ? null : js;
  }
  function parseItems(s) { try { var a = JSON.parse(typeof s === 'string' && s ? s : '[]'); return Array.isArray(a) ? a.slice(0, LITEMS * 2).map(cleanSnap).filter(function (o) { return o && o._code; }).slice(0, LITEMS) : []; } catch (e) { return []; } }          // through cleanSnap: a shared list is anyone's JSON
  // THE ASK BOX keeps each saved filter as a savelists/ document holding one {"_filter": address} row and no item
  // (build/intel-ask.js): never a list here, never merged, never deleted by this side
  function isFilterDoc(x) { return typeof (x && x.items) === 'string' && x.items.indexOf('[{"_filter":') === 0; }
  function lsSyncSoon() { clearTimeout(LSY.t); if (ME) LSY.t = setTimeout(lsSync, 1200); }
  function lsSync(pull) {
    var L = LPX; if (!L || L.off || !L.members.fb || !who(L)) return;
    if (LSY.busy) { LSY.again = true; LSY.pullAgain = LSY.pullAgain || pull; return; }
    LSY.busy = true;
    L.members.fb().then(function (S) {
      var u = S.auth && S.auth.currentUser; if (!u) return null;
      var first = LSY.uid !== u.uid; LSY.uid = u.uid;
      if (first) LSY.name = null;
      var nm = LSY.name != null ? Promise.resolve() : S.F.getDoc(S.F.doc(S.db, 'users', u.uid)).then(function (d) { LSY.name = d.exists() ? String(d.data().name || '') : ''; });
      return nm.then(function () {
        if (!first && !pull) return null;
        return S.F.getDocs(S.F.query(S.F.collection(S.db, 'savelists'), S.F.where('uid', '==', u.uid), S.F.limit(LMAX))).then(function (snap) { lsMerge(snap.docs, u.uid); });
      }).then(function () { return lsPush(S, u); });
    }).catch(function () { /* offline, or refused: the lists stay on this device and go up with the next change */ }).then(function () {
      LSY.busy = false;
      if (LSY.again) { var p = LSY.pullAgain; LSY.again = false; LSY.pullAgain = false; lsSync(p); }
    });
  }
  // The device and the account, list by list: a list changed in only one place takes that change; changed in both, the later
  // one wins; made on this device signed out, it goes up; gone from the account and unchanged here, it was deleted elsewhere.
  function lsMerge(docs, uid) {
    var mine = {}, seen = {};
    LS.lists.forEach(function (l) { mine[l.id] = l; });
    docs.forEach(function (d) {
      var x = d.data() || {}, at = x.updatedAt && x.updatedAt.toMillis ? x.updatedAt.toMillis() : 0, l = mine[d.id];
      if (isFilterDoc(x)) return;          // a saved filter of the ask box (intel-ask.js), not a list
      seen[d.id] = 1;
      if (LS.gone.indexOf(d.id) >= 0) return;          // deleted on this device: lsPush deletes it on the account
      var r = { id: d.id, name: String(x.name || DEFNAME).slice(0, 60), items: parseItems(x.items), mine: !!x.mine, shared: !!x.shared, at: at, sv: at, dirty: false, uid: uid, views: +x.views || 0 };
      if (!l) { LS.lists.push(r); return; }
      l.uid = uid; l.views = r.views;
      if (at > (l.sv || 0) && (!l.dirty || at >= l.at)) Object.assign(l, r);
    });
    LS.lists = LS.lists.filter(function (l) {
      if (seen[l.id] || (l.uid && l.uid !== uid)) return true;
      if (l.sv && !l.dirty) return false;
      l.uid = uid; l.sv = 0; l.dirty = true; return true;
    });
    LS.gone = LS.gone.filter(function (id) { return seen[id]; });
    LS.lists.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    lsSave(); marks(); if (lsDlg.open) lsDraw();
  }
  function lsPush(S, u) {
    var jobs = LS.gone.map(function (id) { return S.F.deleteDoc(S.F.doc(S.db, 'savelists', id)).then(function () { LS.gone = LS.gone.filter(function (x) { return x !== id; }); }, function () { }); });
    LS.lists.forEach(function (l) {
      if (!l.dirty || (l.uid && l.uid !== u.uid)) return;
      var items = lsItemsJson(l); if (!items) return;
      var at0 = l.at, ref = S.F.doc(S.db, 'savelists', l.id);
      var d = { uid: u.uid, by: LSY.name || '', name: l.name.replace(/[<>]/g, '').slice(0, 60) || DEFNAME, items: items, n: l.items.length, mine: !!l.mine,
        shared: !!(l.shared && u.emailVerified), lang: FA ? 'fa' : 'en', updatedAt: S.F.serverTimestamp() };
      var w = l.sv ? S.F.updateDoc(ref, d) : S.F.setDoc(ref, Object.assign(d, { createdAt: S.F.serverTimestamp(), views: 0 }));
      jobs.push(w.then(function () { return S.F.getDoc(ref); }).then(function (snap) {
        var x = snap.data() || {}; l.sv = x.updatedAt && x.updatedAt.toMillis ? x.updatedAt.toMillis() : Date.now(); l.uid = u.uid; l.views = +x.views || 0;
        if (l.at === at0) l.dirty = false;
      }).catch(function (e) { if (e && e.code === 'not-found') { l.sv = 0; LSY.again = true; } }));
    });
    return Promise.all(jobs).then(function () { lsSave(); marks(); if (lsDlg.open) lsDraw(); });
  }
  lp(function (L) {
    if (!L || L.off || !L.members.sub) return;
    L.members.sub(function () {
      var me = who(L), was = ME;
      ME = me ? me.uid : '';
      if (ME !== was) { marks(); if (lsDlg.open) lsDraw(); if (pickDlg && pickDlg.open) pickDraw(); }
      if (ME) {
        lsSync(true);
        if (LV.wantShare) { var l = byList(LV.wantShare); LV.wantShare = ''; if (l && me.v && !l.shared) { l.shared = true; touch(l); } }
      }
    });
  });

  /* ---- a shared list, as a page (?l=<id>) */
  function listPage(id) {
    document.documentElement.classList.add('ir-sh-on');
    var wait = document.createElement('div'); wait.className = 'ir-sh ir-sh-wait'; wait.id = 'ir-lp';
    wait.innerHTML = '<div class="ir-sh-card"><p class="ir-sh-ck">' + esc(BRAND) + ' · ' + esc(T('Intel Room')) + '</p><p class="ir-sh-ct">' + esc(T('Opening the list...')) + '</p></div>';
    document.body.appendChild(wait);
    var fail = function () {
      wait.innerHTML = '<div class="ir-sh-card"><h1>' + esc(T('This list is not here, or it is not shared')) + '</h1><p>' + esc(T('Its maker may have stopped sharing it or deleted it, or the link is cut short.')) + '</p>' +
        '<p class="ir-sh-cta"><a class="ir-sh-mk" href="' + esc(location.pathname) + '">' + ICON.play + '<span>' + esc(T('Open the Intel Room')) + '</span></a></p></div>';
    };
    if (!/^[a-z0-9]{8,24}$/.test(id)) { fail(); return; }
    var own = LS.lists.filter(function (l) { return l.id === id; })[0];
    if (own) { wait.remove(); drawListPage({ id: id, name: own.name, items: own.items, mine: own.mine, by: '', mineToo: true }); return; }          // its maker, on their own device: the list as it is now
    lp(function (L) {
      if (!L || !L.members || !L.members.restDoc) { fail(); return; }
      fetch(L.members.restDoc('savelists/' + id), { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (doc) {
        var f = doc && doc.fields; if (!f) { fail(); return; }
        var v = function (k) { var x = f[k]; if (!x) return ''; return x.stringValue != null ? x.stringValue : x.integerValue != null ? +x.integerValue : x.booleanValue != null ? x.booleanValue : x.timestampValue != null ? Date.parse(x.timestampValue) : ''; };
        wait.remove();
        drawListPage({ id: id, name: String(v('name') || T('A list')), items: parseItems(v('items')), mine: !!v('mine'), by: String(v('by') || ''), at: v('updatedAt') || 0 });
        lsCountView(L, id, String(v('uid') || ''));
      }).catch(fail);
    });
  }
  function lsCountView(L, id, owner) { countOpen(L, 'savelists', id, owner, 'ir-seen-l-' + id); }
  function drawListPage(spec) {
    var its = spec.items.map(fresh), pg = document.createElement('div');
    pg.className = 'ir-sh is-read ir-lpg'; pg.id = 'ir-lp';
    var meta = function (x) { var w = R.where(x); return [R.when(x), x.nm || x.h || x.src, w && w !== T('No single place') ? w : ''].filter(Boolean).join(' · '); };
    // anyone the link reached can pass it on (a list opened from its link is shared; its maker's own copy only once it is)
    var lurl = listUrl(spec.id), shareable = !spec.mineToo || !!(byList(spec.id) || {}).shared;
    var shareH = shareable && its.length ? '<div class="ir-lp-sh"><p>' + esc(T('Pass it on:')) + '</p><div class="ir-sv-link"><label class="vh" for="ir-lp-u">' + esc(T('The link')) + '</label><input id="ir-lp-u" type="text" readonly dir="ltr" value="' + esc(lurl) + '">' +
      '<button type="button" data-lp="link">' + ICON.copy + '<span>' + esc(T('Copy the link')) + '</span></button></div>' + shareTo(spec.name, its.length, lurl, 'data-lp="send"') + '</div>' : '';
    var acts = '<button type="button" data-lp="show"' + (its.length ? '' : ' disabled') + '>' + ICON.play + '<span>' + esc(T('Make a show from this list')) + '</span></button>' +
      (spec.mineToo ? '<button type="button" data-lp="open">' + LISTI + '<span>' + esc(T('Open it in your lists')) + '</span></button>' : '<button type="button" data-lp="copy">' + BM + '<span>' + esc(T('Save a copy to my lists')) + '</span></button>');
    pg.innerHTML = '<header class="ir-sh-bar"><a class="ir-sh-brand" href="' + esc(location.pathname) + '" aria-label="' + esc(T('Back to the Intel Room')) + '"><img src="' + esc(SEAL) + '" alt="" width="40" height="40"><span><b>' + esc(BRAND) + '</b> ' + esc(T('Intel Room')) + '</span></a>' +
      '<p class="ir-sh-title"' + (FA ? ' dir="auto"' : '') + '>' + esc(spec.name) + '</p><div class="ir-sh-tools ir-lp-tools">' + acts + '</div></header>' +
      '<main class="ir-sh-stage" id="ir-lp-stage"><article class="ir-rd"><header class="ir-rd-h"><p class="ir-rd-k">' + esc(T('A list from the Intel Room')) + '</p><h1' + (FA ? ' dir="auto"' : '') + '>' + esc(spec.name) + '</h1>' +
      '<p class="ir-rd-by">' + esc([spec.by ? T('Made by {name}', { name: spec.by }) : '', spec.at ? dayOf(spec.at) : '', its.length === 1 ? T('1 item') : T('{n} items', { n: N(its.length) })].filter(Boolean).join(' · ')) + '</p>' + shareH + '</header>' +
      (its.length ? '<ol class="ir-rd-list">' + its.map(function (x, i) {
        var rg = isReg(x);
        return '<li><span class="ir-rd-num num">' + N(i + 1) + '</span><div class="ir-rd-b"><p class="ir-rd-m">' + R.mark(x) + esc(meta(x)) + '</p>' +
          '<p class="ir-rd-t"' + (FA ? ' dir="auto"' : '') + '>' + esc(R.fullText ? R.fullText(x) : x.t) + '</p>' +
          (rg ? '<p class="ir-rd-rg">' + esc(T('Regime media: not linked.')) + '</p>' : '<p class="ir-rd-s"><a href="' + esc(href(x.u)) + '" target="_blank" rel="' + RELN + ' nofollow">' + esc(T('Open the source: {site}', { site: x.src === 'News' && x.h ? x.h : String(x.u).replace(/^https?:\/\/(www\.)?/, '').split('/')[0] })) + '</a></p>') +
          '<p class="ir-lp-sv">' + saveBtn(x, 'ir-svb-w') + '</p></div></li>';
      }).join('') + '</ol>' : '<p class="ir-rd-none">' + esc(T('This list is empty.')) + '</p>') +
      '<footer class="ir-rd-f"><p>' + esc(T('Every item links to where it was first published. Check it yourself.')) + '</p><p class="ir-rd-acts">' + acts + '</p>' +
      '<p class="ir-rd-mark">' + esc(T('Made in the Intel Room: the news and the evidence of the last 24 hours on one map, free for anyone.')) + ' <a href="' + esc(location.pathname) + '">' + esc(SITE_MARK) + '</a></p></footer></article></main>';
    document.body.appendChild(pg);
    document.title = spec.name + ' | ' + BRAND + ' ' + T('Intel Room');
    pg.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-lp]'); if (!b) return;
      var k = b.getAttribute('data-lp');
      if (k === 'copy') {
        var l = makeList(spec.name); if (!l) return;
        spec.items.slice(0, LITEMS).forEach(function (o) { l.items.push(Object.assign({}, o)); });
        l.mine = spec.mine; LS.last = l.id; touch(l);
        toast(T('Saved to your lists as "{name}"', { name: l.name }), [[T('Open your lists'), function () { leavePage(); lsOpen(l.id); }]]);
        return;
      }
      if (k === 'link') { copyText(lurl, function () { flash(b, T('Copied')); }, function () { flash(b, T('Copying is blocked here')); }); return; }
      if (k === 'send') { navigator.share({ title: spec.name, text: shareWords(spec.name, its.length), url: lurl }).catch(function () { }); return; }
      if (k === 'open') { leavePage(); lsOpen(spec.id); return; }
      if (k === 'show') { leavePage(); makeFrom(spec); }
    });
    pg.setAttribute('data-ready', '1');
  }
  // from a list's page back into the room (to make a show of it, or to open the lists): the page goes, the room comes back
  function leavePage() {
    var pg = $('ir-lp'); if (pg) pg.remove();
    document.documentElement.classList.remove('ir-sh-on');
    if (history.replaceState) history.replaceState(null, '', location.pathname);
    if (R.showing) R.showing(false);
    document.title = BRAND + ' ' + T('Intel Room');
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30);          // the map was measured while the page hid it
  }

  /* ---------------------------------------------------------------- the show screen (?show=) */
  var q = new URLSearchParams(location.search);
  PACKS = R.packs ? R.packs() : null;          // intel.js has already read data/show-packs.json
  if (q.get('s')) loadSaved(q.get('s'));
  else if (q.get('l')) listPage(q.get('l'));          // a shared list (SAVE LISTS)
  else if (q.get('show')) showScreen(fromQuery());
  else {
    // an address that names a show or a list with nothing in it (?s=, ?show=): intel.js stepped aside for a screen that
    // never came (SHOWING), so its keys and its address were dead; hand them back
    if (/[?&](show|s|l)=/.test(location.search) && R.showing) R.showing(false);
    if (location.hash === '#make') { setOn(true); if (history.replaceState) history.replaceState(null, '', location.pathname + location.search); setTimeout(function () { panel.scrollIntoView({ block: 'start' }); }, 300); } draw(); }          // #make: a show screen's "Make your own" (a hash, because the room rewrites its query)

  // The show the address spells out (?show=, made by the maker on this device): its items must still be in the room
  function fromQuery() {
    var codes = String(q.get('show') || '').split('.').filter(Boolean).slice(0, MAXN_LIVE);          // as many as a live show holds (HOW MANY GO IN)
    var gs = String(q.get('g') || '').split('.').map(Number);          // where each story starts (the maker's segStarts)
    // an item that has left the room is still on the screen when a list on this device holds its copy (SAVE LISTS)
    var rows = codes.map(function (c, i) { var m = /^([a-z]+)~(.+)$/.exec(c); if (!m) return null; var x = R.byId(m[2]) || lsSnap(m[2]); return x && !isReg(x) ? { role: m[1], it: x, sg: gs.indexOf(i) >= 0 } : null; }).filter(Boolean);
    var story = null, sid = q.get('st') || '';
    if (PACKS && Array.isArray(PACKS.stories)) PACKS.stories.forEach(function (s) { if (s && String(s.id) === sid) story = s; });
    var video = q.get('kind') === 'video';
    return { rows: rows, video: video, title: q.get('t') || (story && story.title) || T('The Intel Room'), intro: q.get('i') || (story ? (video ? story.hook : story.intro) : ''),
      cover: (q.get('c') || '').slice(0, 40), desc: q.get('d') || (story ? story.desc : ''), gone: codes.length - rows.length };
  }
  // A saved show (?s=<id>): read once from the database without loading the database's whole script (its REST address),
  // its items taken from the room where they still are (fresher counts), else from the copy saved with it.
  function loadSaved(id) {
    document.documentElement.classList.add('ir-sh-on');
    var wait = document.createElement('div'); wait.className = 'ir-sh ir-sh-wait'; wait.id = 'ir-sh-wait';
    wait.innerHTML = '<div class="ir-sh-card"><p class="ir-sh-ck">' + esc(BRAND) + ' · ' + esc(T('Intel Room')) + '</p><p class="ir-sh-ct">' + esc(T('Opening the show...')) + '</p></div>';
    document.body.appendChild(wait);
    var fail = function () {
      wait.innerHTML = '<div class="ir-sh-card"><h1>' + esc(T('This show is not here any more')) + '</h1><p>' + esc(T('Its maker may have deleted it, or the link is cut short.')) + '</p>' +
        '<p class="ir-sh-cta"><a class="ir-sh-mk" href="' + esc(location.pathname + '#make') + '">' + ICON.play + '<span>' + esc(T('Make a show of your own')) + '</span></a> <a href="' + esc(location.pathname) + '">' + esc(T('Open the Intel Room')) + '</a></p></div>';
    };
    if (!/^[a-z0-9]{8,24}$/.test(id)) { fail(); return; }
    lp(function (L) {
      if (!L || !L.members || !L.members.restDoc) { fail(); return; }
      fetch(L.members.restDoc('shows/' + id), { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (doc) {
        var f = doc && doc.fields; if (!f) { fail(); return; }
        var v = function (k) { var x = f[k]; if (!x) return ''; return x.stringValue != null ? x.stringValue : x.integerValue != null ? +x.integerValue : x.booleanValue != null ? x.booleanValue : x.timestampValue != null ? Date.parse(x.timestampValue) : ''; };
        var items = [], js = v('items'); try { items = JSON.parse(typeof js === 'string' && js ? js : '[]'); } catch (e) { items = []; }
        // every copy through cleanSnap (THE ONE DOOR): a saved show is anyone's JSON
        var rows = (Array.isArray(items) ? items.slice(0, MAXN_LIVE * 2) : []).map(cleanSnap).filter(Boolean).map(function (o) {
          var live = o._code ? R.byId(o._code) : null;
          return { role: 'on', it: live || o, sg: !!o._sg };
        }).filter(function (r) { return !isReg(r.it); }).slice(0, MAXN_LIVE);
        wait.remove();
        showScreen({ rows: rows, video: v('kind') === 'video', title: String(v('title') || T('The Intel Room')), intro: String(v('note') || ''), cover: String(v('cover') || ''), desc: String(v('desc') || ''),
          saved: { id: id, by: String(v('by') || ''), uid: String(v('uid') || ''), views: +v('views') || 0, at: v('updatedAt') || v('createdAt') || 0 } });
        countView(L, id, String(v('uid') || ''));
      }).catch(fail);
    });
  }
  // One more opening, once per show per browser session, never by its maker. No name, no account, no device kept.
  function countView(L, id, owner) { countOpen(L, 'shows', id, owner, 'ir-seen-' + id); }
  // Counted only once the sign-in is known: before it, who() is empty (or a remembered account), and the maker's own open of
  // his show counted as a stranger's. auth.known() answers once Firebase has; without it, the first sub() call.
  function countOpen(L, coll, id, owner, k) {
    if (!L || L.off || !L.members.fb) return;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) { return; }
    var done = false, go = function () {
      if (done) return; done = true;
      var me = who(L); if (me && me.uid === owner) return;
      L.members.fb().then(function (S) { return S.F.updateDoc(S.F.doc(S.db, coll, id), { views: S.F.increment(1) }); }).catch(function () { });
    };
    var A = L.members.auth;
    if (A && typeof A.known === 'function') A.known().then(go, go);
    else if (L.members.sub) L.members.sub(go);
    else go();
  }

  function showScreen(spec) {
    var rows = spec.rows, video = spec.video, title = spec.title, intro = spec.intro, cover = spec.cover, desc = spec.desc, saved = spec.saved || null;
    var at = Math.max(0, Math.min(rows.length, Math.floor(+q.get('n') || 0)));          // 0 is the intro card (a whole number: &n=1.5 by hand drew rows[0.5], undefined, and stopped the screen)
    // READ ON OPEN, for the whole show at once: every post in it is asked for now, so its replies are there before he
    // reaches it (a reader's screen asks nothing: R.replies only asks once a creator's sign-in has been handed over)
    if (R.replies) setTimeout(function () { rows.forEach(function (r) { if (r && r.it && R.rpKey && R.rpKey(r.it)) R.replies(r.it, function () { }); }); }, 1500);
    // PRESENT or READ. Read is the show as a page: its words, then every item with its source, for a phone, a class, a
    // briefing or print. A saved show opens to read on a phone, and always on Iran Uncensored's Persian page (CFG.light):
    // present loads players from YouTube and X, and a reader inside Iran loads nothing from elsewhere without a tap.
    // On the light page a saved show always opens to read, whatever the address says: &v=present in a link someone sent
    // would load YouTube's and X's players for a reader inside Iran before any tap. "Present it" is one tap from there.
    var qv = q.get('v') === 'read' || (q.get('v') === 'present' && !(saved && CFG.light)) ? q.get('v') : '';
    var mode = qv || (saved && (CFG.light || matchMedia('(max-width:900px)').matches) ? 'read' : 'present');
    document.documentElement.classList.add('ir-sh-on');
    var sh = document.createElement('div');
    sh.className = 'ir-sh'; sh.id = 'ir-sh';
    sh.innerHTML = '<div class="ir-sh-bg" aria-hidden="true"><i></i><i></i></div>' +
      '<header class="ir-sh-bar"><a class="ir-sh-brand" href="' + esc(location.pathname) + '" aria-label="' + esc(T('Back to the Intel Room')) + '"><img src="' + esc(SEAL) + '" alt="" width="40" height="40"><span><b>' + esc(BRAND) + '</b> ' + esc(T('Intel Room')) + '</span></a>' +
      '<div class="ir-sh-title ir-sh-topic" id="ir-sh-topic" title="' + esc(title) + '"><p class="ir-sh-tk">' + esc(T('On the show today')) + '</p><p class="ir-sh-tt" id="ir-sh-tt"' + (FA ? ' dir="auto"' : '') + '></p>' +
        '<button type="button" class="ir-sh-tpe" id="ir-sh-tpe" aria-label="' + esc(T('Change the topic on the screen')) + '" title="' + esc(T('Change the topic on the screen')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg></button></div>' +
      '<p class="ir-sh-count num" id="ir-sh-count" aria-live="polite"></p><time class="ir-sh-clock num" id="ir-sh-clock"></time>' +
      '<div class="ir-sh-tools"><button type="button" id="ir-sh-mode" aria-pressed="false" title="' + esc(T('Read it as a page')) + '">' + ICON.read + '<span>' + esc(T('Read it as a page')) + '</span></button>' +
      '<button type="button" id="ir-sh-notes" aria-pressed="false" title="' + esc(T('Host notes')) + ' (N)">' + ICON.notes + '<span>' + esc(T('Host notes')) + '</span></button><button type="button" id="ir-sh-full" title="' + esc(T('Full screen')) + ' (F)">' + ICON.full + '<span>' + esc(T('Full screen')) + '</span></button>' +
      (saved ? '<button type="button" id="ir-sh-send" title="' + esc(T('Send')) + '">' + ICON.share + '<span>' + esc(T('Send')) + '</span></button>' : '') +
      '<a class="ir-sh-mk" id="ir-sh-mk" href="' + esc(location.pathname + '#make') + '">' + ICON.plus + '<span>' + esc(T('Make your own')) + '</span></a></div></header>' +
      '<main class="ir-sh-stage" id="ir-sh-stage"></main>' +
      '<aside class="ir-sh-notes" id="ir-sh-pad" hidden><p class="ir-sh-nl">' + esc(saved ? T('A note from the maker') : video ? T('Your opening hook') : T('Your 30-second intro')) + '</p><p class="ir-sh-nt">' + esc(intro || T('Say what the show is about, and what you will show.')) + '</p></aside>' +
      '<footer class="ir-sh-foot"><button type="button" class="ir-sh-nav" id="ir-sh-prev" aria-label="' + esc(T('Previous')) + '">' + (RTL ? ICON.next : ICON.prev) + '</button><ol class="ir-sh-strip" id="ir-sh-strip" aria-label="' + esc(T('The rundown')) + '"></ol><button type="button" class="ir-sh-nav" id="ir-sh-next" aria-label="' + esc(T('Next')) + '">' + (RTL ? ICON.prev : ICON.next) + '</button>' +
      '<p class="ir-sh-mark" aria-hidden="true">' + (saved && saved.by ? '<span class="ir-sh-by">' + esc(T('Made by {name}', { name: saved.by })) + ' · </span>' : '') + SITE_MARK + '</p></footer>';
    document.body.appendChild(sh);
    document.title = title + ' | ' + T('Show screen') + ' | ' + BRAND + ' ' + T('Intel Room');
    var empty = !rows.length;
    if (empty) { $('ir-sh-stage').innerHTML = '<div class="ir-sh-card"><h1>' + esc(T('This show has nothing in it')) + '</h1><p>' + esc(T('Its items have left the room since the link was made.')) + ' <a href="' + esc(location.pathname + '#make') + '">' + esc(T('Make it again in the Intel Room')) + '</a></p></div>'; }
    var narrow = matchMedia('(max-width:900px)').matches;
    function notes(on) { $('ir-sh-pad').hidden = !on; $('ir-sh-notes').setAttribute('aria-pressed', on ? 'true' : 'false'); sh.classList.toggle('has-notes', on); if (typeof refitSoon === 'function') refitSoon(); }
    notes(narrow && !!intro);
    // THE STORIES OF THE SHOW (24 Oct 2026, the run order told story by story): where each starts, from the maker (g in the
    // address, _sg in a saved show's copy). A run of one-item stories shares one break. An older link carries none: no breaks.
    var SEGS = (function () {
      if (!rows.some(function (r) { return r.sg; })) return null;
      var s0 = [], sOf = storyFn(); rows.forEach(function (r, i) { if (!i || r.sg) s0.push(i); });
      return s0.map(function (a, k) {
        var b = k + 1 < s0.length ? s0[k + 1] : rows.length, x = rows[a].it, h = sOf(x);
        return { at: a, n: b - a, name: h && h.s && h.name ? String(h.name) : clip(cleanHead(x.t), 64) };
      });
    })();
    function segAt(i) {
      if (!SEGS) return null;
      for (var k = 0; k < SEGS.length; k++) if (SEGS[k].at === i) {
        if (SEGS[k].n > 1) return SEGS[k];
        return k > 0 && SEGS[k - 1].n === 1 ? null : { name: T('Other stories, one item each'), n: 0 };
      }
      return null;
    }
    /* THE TOPIC ON THE SCREEN (25 Oct 2026). Someone who joins the stream halfway must see at once what the show is about.
       The bar used to carry the whole title on one line, cut with "..." when long. Now it carries the TOPIC: a few words,
       large, never cut. In order: the host's own words (&tp=, set by the pencil beside it), a title of 48 letters or fewer, else the story that holds most
       of the show (over 60%: its short name from show_packs.py), else the title (a long one shortened at its first break). Each item also
       names its own story (storyLine) when the show tells more than one. */
    var sOf0 = storyFn();
    function storyName(x) { var h = x ? sOf0(x) : null; return h && h.s && h.name ? String(h.name) : ''; }
    function shortTopic(t) {
      t = String(t || '').replace(/\s+/g, ' ').trim();
      if (t.length <= 72) return t;
      var head = t.split(/\s*[:|–—]\s*|\s+-\s+|[?!]\s+/)[0];
      if (head.length >= 12 && head.length <= 72) return head;
      var o = ''; t.split(' ').some(function (w) { if ((o + ' ' + w).trim().length > 64) return true; o = (o + ' ' + w).trim(); return false; });
      // never end on a word that leads somewhere ("... runs on and on about"): the topic reads as said, not as cut
      for (var g = 0; g < 4 && /\s(a|an|the|and|or|but|of|for|to|in|on|at|by|with|about|from|that|which|who|as|is|are|was|its|their|his|her|this|after|over|into|across|against|while|than|because|if|when|where|says|said)$/i.test(o); g++) o = o.replace(/\s+\S+$/, '');
      return o || cutU(t, 64);
    }
    function autoTopic() {
      var t0 = String(title || '').replace(/\s+/g, ' ').trim();
      if (t0 && t0.length <= 48) return t0;          // a title short enough to be the topic is the host's own words: it wins
      var tally = {}, best = '', bn = 0;
      rows.forEach(function (r) { var n = storyName(r.it); if (n) { tally[n] = (tally[n] || 0) + 1; if (tally[n] > bn) { bn = tally[n]; best = n; } } });
      if (best && bn > rows.length * 0.6 && best.length <= 56) return best;          // one story is most of the show: its name
      return shortTopic(title) || best || shortTopic(rows[0] ? cleanHead(rows[0].it.t) : '');          // a show with no title (the plain maker) still says what it is about
    }
    var TOPIC = cutU(String(q.get('tp') || '').replace(/\s+/g, ' ').trim(), 60) || autoTopic();
    function paintTopic() { var t = $('ir-sh-tt'); if (t) { t.textContent = TOPIC; t.style.fontSize = ''; } if (typeof refitSoon === 'function') refitSoon(); }
    function setTopic(v) {
      v = cutU(String(v || '').replace(/\s+/g, ' ').trim(), 60);
      var auto = autoTopic(); TOPIC = v || auto;
      if (history.replaceState) { var u = new URLSearchParams(location.search); if (v && v !== auto) u.set('tp', v); else u.delete('tp'); history.replaceState(null, '', location.pathname + '?' + u.toString()); }
      paintTopic();
    }
    // the pencil: the topic becomes a box in place (Enter or leaving the box keeps it, Escape leaves it as it was)
    function editTopic() {
      var t = $('ir-sh-tt'); if (!t || $('ir-sh-tpi')) return;
      t.hidden = true;
      var inp = document.createElement('input');
      inp.type = 'text'; inp.id = 'ir-sh-tpi'; inp.className = 'ir-sh-tpi'; inp.maxLength = 60; inp.value = TOPIC; inp.dir = 'auto'; inp.autocomplete = 'off';
      inp.setAttribute('aria-label', T('The topic on the screen, in a few words'));
      t.parentNode.insertBefore(inp, t.nextSibling);
      var done = false, end = function (keep) { if (done) return; done = true; if (keep) setTopic(inp.value); inp.remove(); t.hidden = false; paintTopic(); };
      inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); end(true); $('ir-sh-tpe').focus(); } else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); end(false); $('ir-sh-tpe').focus(); } });
      inp.addEventListener('blur', function () { end(true); });
      inp.focus(); inp.select();
    }
    // the story of row i, when the show tells more than one and it is not the topic already on the bar
    function storyLine(i) {
      var n = '';
      if (SEGS) { for (var k = 0; k < SEGS.length; k++) if (i >= SEGS[k].at && i < SEGS[k].at + SEGS[k].n) { n = SEGS[k].n > 1 ? SEGS[k].name : ''; break; } }
      else n = storyName(rows[i] && rows[i].it);
      return n && n.toLowerCase() !== TOPIC.toLowerCase() ? n : '';
    }
    function strip() {
      $('ir-sh-strip').innerHTML = '<li><button type="button" data-go="0"' + (at === 0 ? ' aria-current="true"' : '') + '><span class="ir-sh-sn">' + esc(T('Intro')) + '</span><span class="ir-sh-stt">' + esc(title) + '</span></button></li>' +
        rows.map(function (r, i) {
          var sg = segAt(i);
          return (sg ? '<li class="ir-sh-sg"><span' + (FA ? ' dir="auto"' : '') + '>' + esc(sg.name) + '</span></li>' : '') + '<li><button type="button" data-go="' + (i + 1) + '"' + (at === i + 1 ? ' aria-current="true"' : '') + '>' + R.mark(r.it) + '<span class="ir-sh-sn num">' + N(i + 1) + '</span><span class="ir-sh-stt">' + esc(r.it.t) + '</span></button></li>';
        }).join('');
      var cur = $('ir-sh-strip').querySelector('[aria-current]');
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    // the clock of the audience (Liberty Politics: US Eastern; Iran Uncensored: Tehran, CFG.clock), never the computer's own
    function clock() { try { $('ir-sh-clock').textContent = new Intl.DateTimeFormat(CLOCK.locale || 'en-US', { timeZone: CLOCK.tz, hour: 'numeric', minute: '2-digit' }).format(new Date()) + (CLOCK.label || ''); } catch (e) { $('ir-sh-clock').textContent = ''; } }
    clock(); setInterval(clock, 15000);
    /* EVERY ITEM OPENS AS IT WAS MADE (25 Oct 2026; Armin: the top comments he opened on one item were still open on the
       next). One function puts back everything a tap on an item can change: the replies panel, a reply or the words on the
       screen alone, the full-size picture, the Save sheet, a playing video (stopped and let go, so the next one has the
       line to itself) and a focused control inside the item. go() runs it, and every way of moving (the arrows and keys,
       the buttons, a swipe, a tap in the rundown, Home and End, back from reading) goes through go(). */
    function resetItem() {
      rpOn = false; rpCur = null; closeReply();
      [].forEach.call($('ir-sh-stage').querySelectorAll('iframe.ir-xv-f'), function (f) {
        var P = f._xp; if (!P) return; P.dead = 1;
        try { if (P.hls) P.hls.destroy(); } catch (e) { } P.hls = null;
        try { P.v.pause(); P.v.removeAttribute('src'); P.v.load(); } catch (e) { }
      });
      var lb = document.getElementById('ir-lb'); if (lb && lb.open) { try { lb.close(); } catch (e) { lb.removeAttribute('open'); } }
      if (typeof closePick === 'function') closePick();
      var a = document.activeElement; if (a && a !== document.body && $('ir-sh-stage').contains(a) && a.blur) a.blur();
    }
    function go(i) {
      at = Math.max(0, Math.min(rows.length, i));
      if (mode === 'read') return;
      resetItem();
      $('ir-sh-count').textContent = at === 0 ? T('Intro') : T('{n} of {m}', { n: N(at), m: N(rows.length) });
      $('ir-sh-prev').disabled = at === 0; $('ir-sh-next').disabled = at === rows.length;
      if (!empty) stage();
      strip();
      if (history.replaceState) { var u = new URLSearchParams(location.search); u.set('n', at); history.replaceState(null, '', location.pathname + '?' + u.toString()); }
    }
    // READ: the show as a page (see mode above). Every item with its words, who said it, when, where, its counts and its
    // source; regime media (Iran Uncensored) shown and never linked; nothing loads from another site.
    function readHtml() {
      var meta = function (x) { var w = R.where(x); return [R.when(x), x.nm || x.h || x.src, w && w !== T('No single place') ? w : ''].filter(Boolean).join(' · '); };
      return '<article class="ir-rd">' +
        '<header class="ir-rd-h">' + (cover ? '<p class="ir-rd-k">' + esc(cover) + '</p>' : '') + '<h1>' + esc(title) + '</h1>' +
        (saved && saved.by ? '<p class="ir-rd-by">' + esc(T('Made by {name} in the Intel Room', { name: saved.by })) + (saved.at ? ' · ' + esc(dayOf(saved.at)) : '') + '</p>' : '') +
        (desc ? '<p class="ir-rd-d">' + esc(desc) + '</p>' : '') +
        (intro ? '<div class="ir-rd-n"><p class="ir-rd-nl">' + esc(saved ? T('A note from the maker') : video ? T('Your opening hook') : T('Your 30-second intro')) + '</p><p>' + esc(intro) + '</p></div>' : '') + '</header>' +
        (empty ? '<p class="ir-rd-none">' + esc(T('This show has nothing in it')) + '</p>' : '<ol class="ir-rd-list">' + rows.map(function (r, i) {
          var x = r.it, rg = isReg(x), sg = segAt(i);
          return (sg ? '<li class="ir-rd-sg"><h2' + (FA ? ' dir="auto"' : '') + '>' + esc(sg.name) + '</h2>' + (sg.n ? '<small>' + esc(T('{n} items', { n: N(sg.n) })) + '</small>' : '') + '</li>' : '') + '<li><span class="ir-rd-num num">' + N(i + 1) + '</span><div class="ir-rd-b"><p class="ir-rd-m">' + R.mark(x) + esc(meta(x)) + '</p>' +
            '<p class="ir-rd-t">' + paras(full(x)) + '</p>' + counts(x) +
            (!rg && R.repliesOn !== false && R.rpKey && R.rpKey(x) ?'<div class="ir-rd-rp" data-rdrp="' + i + '"></div>' : '') +
            (rg ?'<p class="ir-rd-rg">' + esc(T('Regime media: not linked.')) + '</p>' : '<p class="ir-rd-s"><a href="' + esc(href(x.u)) + '" target="_blank" rel="' + RELN + ' nofollow">' + esc(srcLine(x)) + '</a></p>') + '</div></li>';
        }).join('') + '</ol>') +
        '<footer class="ir-rd-f"><p>' + esc(T('Every item links to where it was first published. Check it yourself.')) + '</p>' +
        '<p class="ir-rd-acts"><button type="button" data-rd="present">' + ICON.play + '<span>' + esc(T('Open the show screen')) + '</span></button><button type="button" data-rd="print">' + ICON.notes + '<span>' + esc(T('Print or save as PDF')) + '</span></button>' +
        '<a class="ir-sh-mk" href="' + esc(location.pathname + '#make') + '">' + ICON.plus + '<span>' + esc(T('Make a show of your own')) + '</span></a></p>' +
        '<p class="ir-rd-mark">' + esc(T('Made in the Intel Room: the news and the evidence of the last 24 hours on one map, free for anyone.')) + ' <a href="' + esc(location.pathname) + '">' + esc(SITE_MARK) + '</a></p></footer></article>';
    }
    /* THE TOP REPLIES ON THE PAGE (22 Oct 2026; Armin: the show "doesn't have an option for me to see the top comments,
       the comments with the most likes"). The page view (a phone's default) had none; the stage had them behind a button.
       Now every post and video on the page carries its most-liked replies: the top 3 open, the rest one tap away, or an
       honest "not read yet" with the link to read them where they are. Filled after the page is drawn, from the same
       file and rows the stage uses (R.replies, R.repliesHtml). */
    var RD_TOP = 3;
    function readReplies() {
      [].forEach.call($('ir-sh-stage').querySelectorAll('[data-rdrp]'), function (box) {
        var r = rows[+box.getAttribute('data-rdrp')]; if (!r || !R.replies) return;
        R.replies(r.it, function (e, st) {
          if (!box.isConnected || mode !== 'read') return;
          var list = e && e.r && e.r.length ? e.r : null;
          if (!list) { box.innerHTML = R.repliesNone(r.it, st); return; }
          box.innerHTML = R.repliesHead(r.it, e) + R.repliesHtml(r.it, list.slice(0, RD_TOP), false) +
            (list.length > RD_TOP ? '<details class="ir-rd-more"><summary>' + esc(T('Show all {n}', { n: N(list.length) })) + '</summary>' + R.repliesHtml(r.it, list.slice(RD_TOP), false) + '</details>' : '');
        });
      });
    }
    function setMode(m) {
      mode = m;
      sh.classList.toggle('is-read', m === 'read');
      var mb = $('ir-sh-mode'); mb.setAttribute('aria-pressed', m === 'read' ? 'true' : 'false');
      mb.title = m === 'read' ? T('Open the show screen') : T('Read it as a page');
      mb.innerHTML = (m === 'read' ? ICON.play + '<span>' + esc(T('Open the show screen')) + '</span>' : ICON.read + '<span>' + esc(T('Read it as a page')) + '</span>');
      if (history.replaceState) { var u = new URLSearchParams(location.search); u.set('v', m); history.replaceState(null, '', location.pathname + '?' + u.toString()); }
      if (m === 'read') { closeReply(); $('ir-sh-stage').innerHTML = readHtml(); readReplies(); $('ir-sh-stage').scrollTop = 0;$('ir-sh-count').textContent = rows.length === 1 ? T('1 item') : T('{n} items', { n: N(rows.length) }); }
      else { $('ir-sh-stage').innerHTML = ''; if (empty) $('ir-sh-stage').innerHTML = '<div class="ir-sh-card"><h1>' + esc(T('This show has nothing in it')) + '</h1></div>'; go(at); }
    }
    /* THE ITEM ON THE SCREEN (rebuilt 18 Oct 2026). Armin, on an X post drawn 550px wide in a 1900px screen with its words
       cut twice ("I'd you're shocked ... of the P..."): "you have so much space to make the tweet bigger. Use it! ... if i
       can't read the full thing, it is useless ... for every posts you have to have the options to check the comments with
       the highest likes ... when i look at this on a small screen, everything get mixed together." So:
       - an X post of words is drawn by the page itself, its WHOLE text (R.fullText) sized to fill the stage (fitText);
         X's own player is kept only for a post whose whole text the room does not have
       - every headline and post text is sized to its box, never clamped with "...": the largest size at which nothing
         spills, and at the smallest readable size it scrolls (is-scroll) rather than cut
       - the most-liked replies (R.replies, build/intel_replies.py): a button under the item (key R), a panel beside it
         that stays open from item to item, and any one reply put on the screen alone (rbig: arrows step, Esc closes)
       - on a screen 900px or narrower everything is one column that scrolls, sized by CSS, never fitted */
    var rpOn = false, rbAt = -1, rpCur = null;          // the replies panel (stays on across items), the reply on the screen alone, the item's replies
    var CARD_RX2 = /^https:\/\/pbs\.twimg\.com\/(?:card_img\/\d+\/[A-Za-z0-9_-]+|media\/[A-Za-z0-9_-]+)\?format=(?:jpg|png|webp)$/;
    function full(x) { return R.fullText ? R.fullText(x) : x.t; }
    function paras(t) { return String(t || '').split(/\n\s*\n+/).map(function (p) { return '<span class="ir-sh-pp"' + (FA ? ' dir="auto"' : '') + '>' + esc(p.trim()) + '</span>'; }).join(' '); }          // dir=auto on the Persian page: an English post reads left to right, its full stop at its end   // the space: a copy or a screen reader read "partnership.We" (22 Oct 2026)
    // the rare post whose end even the room could not get (X's 280 and the mirror both failed): say so, never pretend
    function more(x) { var w = full(x); return w.length >= 270 && /…$/.test(w) ? '<a class="ir-sh-more" href="' + esc(href(x.u)) + '" target="_blank" rel="' + RELN + '">' + esc(T('The post goes on: read the rest on X')) + '</a>' : ''; }
    function initial(x) { return String(x.nm || x.h || '?').replace(/^@/, '').slice(0, 1).toUpperCase() || '?'; }
    function face(x, cls) {
      var av = R.avOf ? R.avOf(x, '400x400') : '';
      return av ? '<span class="' + cls + '" style="background-image:url(' + esc(av) + ')"></span>' : '<span class="' + cls + ' is-mono">' + esc(initial(x)) + '</span>';
    }
    // an X post of words, drawn as the post: the author, the whole text as large as the stage allows, its link card
    function postCard(x) {
      var cd = x.cd && CARD_RX2.test(x.cd.i || '') && !(R.media && R.media(x).length) ? x.cd : null;
      var rf = R.refHtml ? R.refHtml(x, 'is-show') : { before: '', after: '' };          // the post it quotes or answers, and its note (24 Oct 2026)
      return '<figure class="ir-sh-post">' +
        '<figcaption class="ir-sh-ph">' + face(x, 'ir-sh-pav') + '<span class="ir-sh-pwho"><b>' + esc(x.nm || x.h) + '</b><small>' + esc([x.h, R.when(x)].filter(Boolean).join(' · ')) + '</small></span>' + R.mark(x) + '</figcaption>' +
        rf.before + '<blockquote class="ir-sh-ptx" id="ir-sh-fit2">' + paras(full(x)) + '</blockquote>' + more(x) + rf.after +
        (cd ? '<span class="ir-sh-pcd"><span class="ir-sh-pci" style="background-image:url(' + esc(cd.i + '&name=' + (/\/media\//.test(cd.i) ? 'medium' : '800x419')) + ')"></span>' + (cd.t || cd.dm ? '<span class="ir-sh-pct">' + (cd.dm ? '<small>' + esc(cd.dm) + '</small>' : '') + esc(cd.t || '') + '</span>' : '') + '</span>' : '') +
        '</figure>';
    }
    function stage() {
      var el = $('ir-sh-stage');
      el.classList.remove('one-title', 'is-post', 'rp-on', 'has-rb', 'is-xm-long');          // one-title set again by frame() when the item's own card already carries its headline
      rbAt = -1; rpCur = null;
      if (at === 0) {
        el.innerHTML = '<div class="ir-sh-open"><p class="ir-sh-k">' + esc(cover || (video ? T('Today\'s video') : T('On the show today'))) + '</p><h1>' + esc(title) + '</h1>' + (desc ? '<p class="ir-sh-d">' + esc(firstSentence(desc)) + '</p>' : '') +
          '<ol class="ir-sh-agenda">' + rows.slice(0, 6).map(function (r) { return '<li>' + R.mark(r.it) + '<span>' + esc(roleName(r) ? roleName(r) + ': ' : '') + esc(cut(r.it.t, 80)) + '</span></li>'; }).join('') + '</ol></div>';
        refitSoon();
        return;
      }
      var r = rows[at - 1], x = r.it, k = R.rpKey ? R.rpKey(x) : '';
      var isX = x.src === 'X' && /\/status\/\d+/.test(x.u || ''), hasM = isX && !!(R.media && R.media(x).length), words = full(x);
      var own = isX && !hasM && !(/…$/.test(words) && !x.tx);          // drawn as the post itself (X's player only when the room lacks the whole text)
      var where = R.where(x) !== T('No single place') ? R.where(x) : '';          // R.where speaks the page's language (placeName goes through T)
      var rfm = hasM && R.refHtml ? R.refHtml(x, 'is-show') : { before: '', after: '' };          // beside a video: what it quotes or answers
      var sl = storyLine(at - 1);
      el.innerHTML = '<div class="ir-sh-frame" id="ir-sh-frame"></div><div class="ir-sh-info" id="ir-sh-info">' + (sl ? '<p class="ir-sh-story"' + (FA ? ' dir="auto"' : '') + '>' + esc(sl) + '</p>' : '') + (roleName(r) ? '<p class="ir-sh-role">' + esc(roleName(r)) + '</p>' : '') +
        (hasM ? '<p class="ir-sh-who">' + face(x, 'ir-sh-wav') + '<b>' + esc(x.nm || x.h) + '</b><small>' + esc(x.h) + '</small></p>' + rfm.before + '<p class="ir-sh-pt" id="ir-sh-fit">' + paras(words) + '</p>' + more(x) + rfm.after
          : '<h2 id="ir-sh-fit">' + paras(words) + '</h2>') +
        '<p class="ir-sh-meta">' + R.mark(x) + esc((isX ? [R.when(x), where] : [R.when(x), x.nm || x.h || x.src, where]).filter(Boolean).join(' · ')) + '</p>' +
        counts(x) + coverLine(x) + (x.hotWhy ? '<p class="ir-sh-why">' + ICON.flame + esc(x.hotWhy) + '</p>' : '') + (x.also && x.also.length ? '<p class="ir-sh-also">' + esc(T('Also carried by {list}', { list: x.also.join(T(', ')) })) + '</p>' : '') +
        '<p class="ir-sh-acts">' + (hasM && words.length > 110 ? '<button type="button" class="ir-sh-rpb ir-sh-wb" id="ir-sh-wb" title="' + esc(T('The words on the screen alone (W)')) + '">' + ICON.full + '<span>' + esc(T('Words on the screen')) + '</span></button>' : '') + (k ? '<button type="button" class="ir-sh-rpb" id="ir-sh-rpb" aria-pressed="false" aria-controls="ir-sh-rp" title="' + esc(T('Top replies (R)')) + '">' + ICON.reply + '<span>' + esc(k.slice(0, 2) === 'yt' ? T('Top comments') : T('Top replies')) + '</span><b class="num" id="ir-sh-rpn"></b></button>' : '') +
        saveBtn(x, 'ir-svb-w ir-sh-svb') + '<a class="ir-sh-src" href="' + esc(href(x.u)) + '" target="_blank" rel="' + RELN + '">' + esc(srcLine(x)) + '</a></p></div>' +
        (k ? '<aside class="ir-sh-rp" id="ir-sh-rp" aria-label="' + esc(T('Most-liked replies')) + '" hidden></aside>' : '') +
        '<div class="ir-sh-rbig" id="ir-sh-rbig" role="dialog" aria-label="' + esc(T('A reply on the screen')) + '" hidden></div>';
      // a post with a video or pictures and many words: the words get as much of the screen as the picture
      el.classList.toggle('is-xm-long', hasM && words.length > 110);
      if (own) {
        el.classList.add('one-title', 'is-post');
        var fr = $('ir-sh-frame'); fr.className = 'ir-sh-frame is-post'; fr.innerHTML = postCard(x);
      } else frame($('ir-sh-frame'), x);
      if (k) {
        var mine = at;
        R.replies(x, function (e, st) {
          if (mine !== at) return;
          rpCur = { e: e, st: st, x: x, own: own };
          var n = $('ir-sh-rpn'); if (n) n.textContent = e && e.r.length ? N(e.r.length) : '';
          if (rpOn) replies(true);
        });
      }
      refitSoon();
    }
    // the replies panel beside the item (under it on a phone); stays on from item to item until it is closed
    function replies(on) {
      var box = $('ir-sh-rp'), b = $('ir-sh-rpb'), el = $('ir-sh-stage');
      if (!box || !b) return;
      if (on !== undefined) rpOn = on;
      b.setAttribute('aria-pressed', rpOn ? 'true' : 'false');
      box.hidden = !rpOn; el.classList.toggle('rp-on', rpOn);
      if (!rpOn) { closeReply(); refitSoon(); return; }
      if (!rpCur) { box.innerHTML = '<p class="ir-rp-no">' + esc(T('Loading the replies')) + '</p>'; return; }
      var c = rpCur, x = c.x, list = c.e && c.e.r.length ? c.e.r : null;
      box.innerHTML = '<div class="ir-sh-rph">' + R.repliesHead(x, c.e) + '<button type="button" class="ir-sh-rpx" data-rp-close aria-label="' + esc(T('Close the replies')) + '">&times;</button></div>' +
        (c.own ? '' : '<blockquote class="ir-sh-rpq">' + esc(full(x)) + '</blockquote>') +
        (list ? R.repliesHtml(x, list, true) + '<p class="ir-sh-rpt">' + esc(T('Tap a reply to put it on the screen alone.')) + '</p>' : R.repliesNone(x, c.st));
      box.scrollTop = 0;
      refitSoon();
    }
    // one reply on the screen alone, as large as the stage allows
    function showReply(n) {
      var c = rpCur, list = c && c.e ? c.e.r : [];
      if (!list.length) return;
      rbAt = (n + list.length) % list.length;
      var r = list[rbAt], x = c.x, big = $('ir-sh-rbig'), k = R.rpKey(x).slice(0, 2), html = R.repliesHtml(x, [r], false);
      // reuse the row's own face and name, then the text large
      var tmp = document.createElement('div'); tmp.innerHTML = html;
      var av = tmp.querySelector('.ir-rp-av'), who = tmp.querySelector('.ir-rp-who');
      big.innerHTML = '<div class="ir-sh-rbin">' +
        '<p class="ir-sh-rbh">' + (av ? av.outerHTML : '') + (who ? who.outerHTML : '') + '</p>' +
        '<blockquote class="ir-sh-rbt" id="ir-sh-rbt">' + paras(r.t) + '</blockquote>' +
        '<p class="ir-sh-rbc">' + esc(k === 'yt' ? T('A comment on') : T('Replying to')) + ' <b>' + esc(x.nm || x.h || x.src) + '</b><span class="num">' + esc(T('{n} of {m}', { n: N(rbAt + 1), m: N(list.length) })) + '</span></p>' +
        '<div class="ir-sh-rbn"><button type="button" data-rb="-1" aria-label="' + esc(T('The reply before')) + '">' + (RTL ? ICON.next : ICON.prev) + '</button><button type="button" data-rb="0">' + esc(T('Back to the post')) + '</button><button type="button" data-rb="1" aria-label="' + esc(T('The next reply')) + '">' + (RTL ? ICON.prev : ICON.next) + '</button></div></div>';
      big.hidden = false; $('ir-sh-stage').classList.add('has-rb');
      refitSoon();
    }
    // the post's own words on the screen alone (a long post beside its video is small; one tap makes it the whole screen)
    function showWords() {
      var x = rows[at - 1] && rows[at - 1].it, big = $('ir-sh-rbig'); if (!x || !big) return;
      rbAt = -2;
      big.innerHTML = '<div class="ir-sh-rbin">' +
        '<p class="ir-sh-rbh">' + face(x, 'ir-rp-av') + '<span class="ir-rp-who"><b>' + esc(x.nm || x.h) + '</b><small>' + esc([x.h, R.when(x)].filter(Boolean).join(' · ')) + '</small></span></p>' +
        '<blockquote class="ir-sh-rbt" id="ir-sh-rbt">' + paras(full(x)) + '</blockquote>' + more(x) +
        '<div class="ir-sh-rbn"><button type="button" data-rb="0">' + esc(T('Back to the post')) + '</button></div></div>';
      big.hidden = false; $('ir-sh-stage').classList.add('has-rb');
      refitSoon();
    }
    function closeReply() { var big = $('ir-sh-rbig'); rbAt = -1; if (big) { big.hidden = true; big.innerHTML = ''; } var el = $('ir-sh-stage'); if (el) el.classList.remove('has-rb'); }
    /* fitText: the largest font size, between lo and hi pixels, at which t does not spill out of box. The box is measured
       by its children's extent when it has element children (a column centred in its cell spills both ways, which
       scrollHeight does not see), else by its own scroll height. At lo, if it still spills, t scrolls: never cut. */
    function spills(box) {
      var c = box.children, top = Infinity, bot = -Infinity, any = false;
      for (var i = 0; i < c.length; i++) { if (!c[i].offsetParent && getComputedStyle(c[i]).position !== 'fixed') continue; var rc = c[i].getBoundingClientRect(); if (!rc.height) continue; any = true; top = Math.min(top, rc.top); bot = Math.max(bot, rc.bottom); }
      if (!any) return box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1;
      return bot - top > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1;
    }
    // fol: what must stay SMALLER than t, sized with it (a quoted post's words at FOL of the post's own). 25 Oct 2026: a
    // quote kept its fixed size up to 40px while the post that quoted it was squeezed to 18px beside it.
    var FOL = 0.72;
    function fitText(t, box, hi, lo, fol) {
      if (!t || !box || !t.offsetParent) return;
      t.classList.remove('is-scroll');
      hi = Math.max(lo, Math.round(hi));
      var size = function (m) { t.style.fontSize = m + 'px'; if (fol) [].forEach.call(fol, function (e) { e.style.fontSize = Math.max(14, Math.round(m * FOL)) + 'px'; }); };
      size(hi);
      if (!spills(box)) return;
      var a = lo, b = hi;
      for (var n = 0; n < 12 && b - a > 0.5; n++) { var m = (a + b) / 2; size(m); if (spills(box)) b = m; else a = m; }
      size(Math.floor(a));
      if (spills(box)) t.classList.add('is-scroll');
    }
    var narrowQ = matchMedia('(max-width:900px)'), fitT = 0;
    function refit() {
      var all = sh.querySelectorAll('#ir-sh-fit,#ir-sh-fit2,#ir-sh-rbt,.ir-sh-ct,.ir-sh-open h1,#ir-sh-tt,.ir-sh-stage .ir-ref-t');
      if (narrowQ.matches) { [].forEach.call(all, function (t) { t.style.fontSize = ''; t.classList.remove('is-scroll'); }); return; }
      var H = window.innerHeight, W = window.innerWidth, u = Math.min(H, W * 0.6);
      var pt = $('ir-sh-fit2'); if (pt) fitText(pt, pt, u * 0.1, 18, sh.querySelectorAll('.ir-sh-post .ir-ref-t'));
      var f = $('ir-sh-fit'), info = $('ir-sh-info'), stg = $('ir-sh-stage');
      if (f && info) {
        // TIGHT (25 Oct 2026): when even the smallest size spills (a 720p window, a long post, the coverage under it), the
        // extra lines step aside (why it is hot, who else carried it, the coverage words) before the buttons are pushed
        // off the screen: what he must be able to tap stays on it
        var fitInfo = function () { fitText(f, info, f.tagName === 'H2' ? u * 0.072 : u * 0.05, 15, sh.querySelectorAll('.ir-sh-info .ir-ref-t')); };
        stg.classList.remove('is-tight'); fitInfo();
        if (f.classList.contains('is-scroll') || spills(info)) { stg.classList.add('is-tight'); fitInfo(); }
      }
      var rb = $('ir-sh-rbt'); if (rb) fitText(rb, rb, u * 0.095, 18);
      var ct = sh.querySelector('.ir-sh-ct'), fr = $('ir-sh-frame'); if (ct && fr) fitText(ct, fr, u * 0.075, 18);
      var oh = sh.querySelector('.ir-sh-open h1'), op = $('ir-sh-stage'); if (oh && op) fitText(oh, op, u * 0.11, 24);
      var tt = $('ir-sh-tt'), tb = $('ir-sh-topic'); if (tt && tb && !tt.hidden && mode !== 'read') {
        fitText(tt, tb, u * 0.05, 18);          // the topic: as large as two lines of the bar allow
        // 25 Oct 2026: the bar centres its rows, so a topic of three lines can measure as fitting while its last line hangs
        // below the bar (a 60-letter Persian topic at 1920x1080, phone-test "the topic is cut"). The topic's OWN box must sit
        // inside the bar: step down a pixel at a time until it does, never below the floor.
        var ins = function () { var a = tt.getBoundingClientRect(), b = tb.getBoundingClientRect(); return a.bottom <= b.bottom + 1 && a.top >= b.top - 1; };
        // No step cap below the floor (25 Oct 2026): a 40-step cap stopped at 33px from a 73px start and left the last line
        // hanging under the bar; the 18px floor alone bounds the loop.
        for (var fs = parseFloat(getComputedStyle(tt).fontSize); fs > 18 && !ins(); ) { fs -= 1; tt.style.fontSize = fs + 'px'; }
      }
    }
    function refitSoon() { clearTimeout(fitT); fitT = setTimeout(refit, 40); }          // a timer, not a frame: a page in a background tab gets no frames
    // The topic is watched too (25 Oct 2026): its box and its words change size without the stage changing (the Persian
    // font arriving after document.fonts.ready had already settled, the bar's tools taking their width), and the topic
    // stayed at the size fitted before, three lines in a two-line bar (Iran Uncensored phone test, part stage).
    if (window.ResizeObserver) { var shRO = new ResizeObserver(refitSoon); ['ir-sh-stage', 'ir-sh-topic', 'ir-sh-tt'].forEach(function (id) { if ($(id)) shRO.observe($(id)); }); }
    window.addEventListener('resize', refitSoon);
    // and a backstop once a second: a browser that paints no frames (a background tab, some streaming apps' browser
    // sources) reports neither a resize nor a ResizeObserver change, and the text kept its old size (measured 18 Oct 2026)
    var lastBox = '';
    // 25 Oct 2026: the topic's own box is in the key too, and the look is four times a second: in a browser that paints no
    // frames the Persian font arrived after the fit, the topic grew to three lines in its two-line bar, and nothing refitted
    // it before the phone test looked (fa/news/, "the topic is cut", three runs in a row)
    setInterval(function () { var s0 = $('ir-sh-stage'); if (!s0) return; var t0 = $('ir-sh-tt'), kb = s0.clientWidth + 'x' + s0.clientHeight + (t0 ? '|' + t0.offsetWidth + 'x' + t0.offsetHeight : ''); if (kb !== lastBox) { lastBox = kb; refitSoon(); } }, 250);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refitSoon);
    function firstSentence(t) { var m = /^.*?[.?!](\s|$)/.exec(t); return (m ? m[0] : t).trim(); }
    function roleName(r) { return r.role === 'on' ? '' : r.role === 'rel' ? T('Related') : Object.prototype.hasOwnProperty.call(ROLE, r.role) ? ROLE[r.role] : ''; }
    function cut(t, n) { return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; }
    function srcLine(x) { var h = String(x.u).replace(/^https?:\/\/(www\.)?/, '').split('/')[0]; return T('Open the source: {site}', { site: x.src === 'News' && x.h ? x.h : h }); }
    /* WHO COVERED THIS STORY, on the screen (25 Oct 2026): of the outlets that carried it, how many lean left, centre and
       right (intel_live.py spread(), our own lean table; the page only draws what the file says), and a Blindspot names
       the silent side. Drawn only from five rated outlets up, so a bar of one or two never reads as a verdict to the
       audience; nothing where the feed has no spread (Iran Uncensored's room). */
    function coverLine(x) {
      var o = R.spread ? R.spread(x) : null; if (!o || !Array.isArray(o.ls)) return '';
      var n = function (i) { return Math.max(0, +o.ls[i] || 0); }, rated = n(0) + n(1) + n(2);
      if (rated < 5) return '';
      var sides = [['L', T('Left')], ['C', T('Centre')], ['R', T('Right')]];
      var bar = '<span class="ir-sp ir-sh-spb" aria-hidden="true">' + sides.map(function (s, i) { return n(i) ? '<i class="ir-sp-' + s[0] + '" style="flex:' + n(i) + '"></i>' : ''; }).join('') + '</span>';
      var key = sides.map(function (s, i) { return '<span class="ir-sh-cv' + s[0] + '">' + esc(s[1]) + ' <b class="num">' + N(n(i)) + '</b></span>'; }).join('');
      var bs = o.bs === 'L' || o.bs === 'R' ? '<span class="ir-bs">' + esc(o.bs === 'L' ? T('Left silent') : T('Right silent')) + '</span>' : '';
      return '<div class="ir-sh-cov" role="img" aria-label="' + esc(T('Outlets that carried it: {l} left, {c} centre, {r} right', { l: N(n(0)), c: N(n(1)), r: N(n(2)) })) + '">' +
        '<p class="ir-sh-covh">' + esc(o === x ? T('Who covered it') : T('Who covered this story')) + bs + '</p>' + bar + '<p class="ir-sh-covn">' + key + '</p></div>';
    }
    function counts(x) {
      // every count is made a number here, whatever the item says (a saved show's "hot":"<img onerror=...>" ran on open)
      var r = R.reach(x) || {}, b = [], num = function (v) { if (v == null || v === '') return null; v = +v; return isFinite(v) ? v : null; };
      var lk = num(r.likes != null ? r.likes : x.lk), vw = num(r.views != null ? r.views : x.vw), rp = num(x.rp), hot = num(x.hot);
      if (lk != null) b.push('<span><b class="num">' + esc(R.fmt(lk)) + '</b> ' + esc(T('likes')) + '</span>');
      if (rp != null) b.push('<span><b class="num">' + esc(R.fmt(rp)) + '</b> ' + esc(T('reposts')) + '</span>');
      if (vw != null) b.push('<span><b class="num">' + esc(R.fmt(vw)) + '</b> ' + esc(T('views')) + '</span>');
      if (hot != null) b.push('<span><b class="num">' + N(Math.round(hot) || 0) + '</b> ' + esc(T('hot')) + '</span>');
      return b.length ? '<p class="ir-sh-n">' + b.join('') + '</p>' : '';
    }
    var twLoad = null;
    function tw() { if (window.twttr && window.twttr.widgets) return Promise.resolve(window.twttr); if (twLoad) return twLoad;
      twLoad = new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'https://platform.twitter.com/widgets.js'; s.async = true; s.onload = function () { var n = 0; (function wait() { if (window.twttr && window.twttr.widgets) res(window.twttr); else if (n++ > 50) rej(); else setTimeout(wait, 100); })(); }; s.onerror = rej; document.head.appendChild(s); });
      return twLoad; }
    function card(el, x, why) {
      // the story's photo, a link card's picture or its place above the words (18 Oct 2026: no item without a picture)
      var v = R.vis && !x.sn ? R.vis(x, true) : null, im = v && (v.k === 'pic' || v.k === 'loc') ? '<span class="ir-sh-ci" style="background-image:url(' + (v.k === 'loc' ? v.u : esc(v.u)) + ')"></span>' : '';
      el.innerHTML = '<div class="ir-sh-card">' + im + '<p class="ir-sh-ck">' + R.mark(x) + esc(x.h || x.src) + ' · ' + esc(R.when(x)) + '</p><p class="ir-sh-ct">' + esc(x.t) + '</p>' + (why ? '<p class="ir-sh-cw">' + esc(why) + '</p>' : '') + '</div>';
    }
    function frame(el, x) {
      var y = R.yt(x.u), st2 = /(?:x|twitter)\.com\/[^\/]+\/status\/(\d+)/.exec(x.u || ''), tg = /t\.me\/(?:s\/)?([A-Za-z0-9_]+\/\d+)/.exec(x.u || '');
      if (y) {
        // the player takes the video's own measured shape (R.vshape), as large as the stage allows and never cut (18 Oct 2026)
        var mine1 = at, shape = function (a) { if (mine1 !== at) return; el.style.setProperty('--ar', a.toFixed(4)); el.classList.toggle('is-tall', a < 1); };
        el.className = 'ir-sh-frame is-yt';
        shape(R.vshape ? R.vshape(y, x.u, shape) : /\/shorts\//.test(x.u) ? 9 / 16 : 16 / 9);
        el.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + y + '?cc_load_policy=1&cc_lang_pref=en&hl=en&rel=0&playsinline=1&modestbranding=1" title="' + esc(x.t) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
        return;
      }
      if (st2) {
        // the post's own video or pictures fill the stage (17 Oct 2026); X's player when it has none, or its video will not play
        var mine0 = at;
        if (R.media && R.media(x).length) {
          el.className = 'ir-sh-frame is-xm';
          el.innerHTML = R.mediaHtml(x, true);
          R.wireMedia(el.querySelector('.ir-xm'), x, function () { if (mine0 === at) xPost(el, x, st2[1]); });
          return;
        }
        xPost(el, x, st2[1]);
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
      // a picture link is drawn as the picture only when it is the room's own item, or on X's or YouTube's picture host: a
      // saved show is JSON anyone can write, and an <img> of any address would tell that address who opened the show
      // (a reader inside Iran included), before any tap
      if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(x.u || '') && (R.byId(R.code(x)) === x || /^https:\/\/(pbs\.twimg\.com|i\.ytimg\.com)\//.test(x.u))) { el.className = 'ir-sh-frame is-img'; el.innerHTML = '<img src="' + esc(x.u) + '" alt="' + esc(x.t) + '">'; return; }
      el.className = 'ir-sh-frame is-card';
      $('ir-sh-stage').classList.add('one-title');
      card(el, x, x.also && x.also.length ? T('Also carried by {list}', { list: x.also.join(T(', ')) }) : '');
    }
    // X's own player for a post, its card up until X has drawn it
    function xPost(el, x, id) {
        el.className = 'ir-sh-frame is-x';
        card(el, x, T('Loading the post from X'));
        var mine = at;
        // The post's own card stays up until X has drawn it (X can take several seconds, or never, behind a blocker)
        var box2 = document.createElement('div'); box2.className = 'ir-sh-tw'; el.appendChild(box2);
        var fail = function (why) { if (mine === at) { card(el, x, why); } };
        tw().then(function (TW) {
          if (mine !== at) return;
          return TW.widgets.createTweet(id, box2, { theme: 'dark', dnt: true, align: 'center', conversation: 'none' }).then(function (w) {
            if (!w) { fail(T('X did not show this post here. Open it on X.')); return; }
            var n = 0;
            (function drawn() {
              if (mine !== at) return;
              var f = box2.querySelector('iframe');
              if (f && f.getBoundingClientRect().height > 120) { var c = el.querySelector('.ir-sh-card'); if (c) c.remove(); el.classList.add('is-drawn'); scaleTweet(el, box2); return; }
              if (n++ > 120) { fail(T('X did not show this post here. Open it on X.')); return; }
              setTimeout(drawn, 250);
            })();
          });
        }).catch(function () { fail(T('X\'s player is blocked in this browser. Open the post on X.')); });
    }
    // X draws its post 550px wide whatever the screen: scaled to the frame (both ways), up to twice its size, and again
    // when X grows it (a picture loading); a phone keeps X's own size
    function scaleTweet(el, box2) {
      var tw0 = box2.firstElementChild; if (!tw0) return;
      var fit1 = function () {
        if (!el.isConnected) return;
        tw0.style.zoom = '';
        if (narrowQ.matches) return;
        var w = tw0.offsetWidth || 550, h = tw0.offsetHeight || 1;
        tw0.style.zoom = String(Math.max(1, Math.min(2, (el.clientWidth - 8) / w, (el.clientHeight - 8) / h)).toFixed(3));
      };
      fit1();
      if (window.ResizeObserver) { var ro = new ResizeObserver(function () { if (!el.isConnected) { ro.disconnect(); return; } setTimeout(fit1, 0); }); ro.observe(el); var f2 = box2.querySelector('iframe'); if (f2) ro.observe(f2); }
    }
    sh.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.id === 'ir-sh-mode') { setMode(mode === 'read' ? 'present' : 'read'); return; }
      if (b.getAttribute('data-rd') === 'present') { setMode('present'); return; }
      if (b.getAttribute('data-rd') === 'print') { window.print(); return; }
      if (b.id === 'ir-sh-send') {
        var url = savedUrl(saved.id), sp = b.querySelector('span');
        var copied = function () { if (sp) { sp.textContent = T('Link copied'); setTimeout(function () { sp.textContent = T('Send'); }, 1800); } };
        if (navigator.share) navigator.share({ title: title, url: url }).catch(function () { });
        else copyText(url, copied, function () { if (sp) sp.textContent = url; });
        return;
      }
      if (b.id === 'ir-sh-tpe') { editTopic(); return; }
      if (b.id === 'ir-sh-rpb') { replies(!rpOn); return; }
      if (b.hasAttribute('data-rp-close')) { replies(false); var rb0 = $('ir-sh-rpb'); if (rb0) rb0.focus(); return; }
      if (b.hasAttribute('data-rp')) { showReply(+b.getAttribute('data-rp')); return; }
      if (b.id === 'ir-sh-wb') { showWords(); return; }
      if (b.hasAttribute('data-rb')) { var d0 = +b.getAttribute('data-rb'); if (d0 && rbAt >= 0) showReply(rbAt + d0); else closeReply(); return; }
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
    document.addEventListener('fullscreenchange', function () { var s2 = $('ir-sh-full').querySelector('span'); if (s2) s2.textContent = document.fullscreenElement ? T('Leave full screen') : T('Full screen'); });
    document.addEventListener('keydown', function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey || (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName))) return;
      var k = ev.key;
      if (mode === 'read') { if (k === 'p' || k === 'P') setMode('present'); return; }          // a page scrolls; its keys are the browser's
      // on a page that reads right to left the left arrow goes forward (the next item sits to the left)
      if (RTL && (k === 'ArrowLeft' || k === 'ArrowRight')) k = k === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
      // a reply on the screen alone: the arrows step the replies, Esc goes back to the post
      if (rbAt === -2 && (k === 'Escape' || k === 'w' || k === 'W')) { ev.preventDefault(); closeReply(); return; }
      if ((k === 'w' || k === 'W') && $('ir-sh-wb')) { showWords(); return; }
      if (rbAt >= 0) {
        if (k === 'Escape') { ev.preventDefault(); closeReply(); return; }
        if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown') { ev.preventDefault(); showReply(rbAt + 1); return; }
        if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { ev.preventDefault(); showReply(rbAt - 1); return; }
      }
      if (k === 'r' || k === 'R') { if ($('ir-sh-rpb')) replies(!rpOn); return; }
      if (k === 'Escape' && rpOn && $('ir-sh-rpb')) { replies(false); return; }
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
      if (rbAt === -2) return;
      // a swipe toward the start of the line steps forward: leftward on an English page, rightward on a Persian one
      var fwd = RTL ? dx > 0 : dx < 0;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (rbAt >= 0) showReply(rbAt + (fwd ? 1 : -1)); else go(at + (fwd ? 1 : -1)); }
    }, { passive: true });
    if (mode === 'present' && rows.some(function (r) { return /^https:\/\/(www\.)?(x|twitter)\.com\//.test(r.it.u || ''); })) tw().catch(function () {});          // X's player loads once, early
    paintTopic();
    if (mode === 'read') setMode('read'); else go(at);
    sh.setAttribute('data-ready', '1');
  }
})();
