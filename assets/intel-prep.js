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
  var ROLE = { report: 'The report', own: 'In their own words', clip: 'The clip', reaction: 'Reaction', more: 'More on it', other: 'The other side, or the silence',
    proof: 'Background, from the bank', related: 'Related', rank: '' };
  var PACKS = null;
  var KEY = 'ir-creator', MAXN = 25;
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
    set.forEach(function (it, i) {
      var h = R.storyOf ? R.storyOf(it) : null;
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
      add(w, { name: w, up: w.toUpperCase(), rx: rxWord(w), foe: false, kind: placeish ? 'place' : 'name', of: '', open: true });
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
      var what0 = N0 + (N0 === 1 ? ' source' : ' sources') + from0 + (V0 ? (V0 === N0 ? (N0 === 1 ? ', on video' : ', all on video') : ', ' + V0 + ' of them on video') : '');
      [{ t: 'What happened, who said what, and what it means: ' + what0 + '. ' + (live0 ? 'On this live show we go through every one of them, in order, each one linked below.' : 'This video goes through every one of them, in order, each one linked below.'), tone: 'plain', id: 'd-safe1' },
       { t: 'Here is what the ' + (V0 ? 'clips' : 'sources') + ' actually show, and what the coverage leaves out: ' + what0 + '. Every source is linked below, so check it yourself.', tone: 'mid', id: 'd-safe2' }]
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

  /* ---------------------------------------------------------------- the run order
     Armin, 18 October 2026: "come up with the best order of the items so that the most viral, most important things are
     first. We don't jump around, so we start with something very viral, and then we do a couple of things that are very
     close to the first item before we move to the next items ... give me the option to change ... Always take notes on how
     people and I change it."
     STRENGTH: how hot the item is and how far it has travelled (heat, its viral rank, likes, views), times how squarely it
     is ON the show's subject: an item that names none of the set's main names, its country or what happened counts for
     little more than a third (the Iran post in the France riots set, a Congress post in it: strong, but another story).
     WHICH ITEMS GO IN: the strongest MAXN of everything the filters leave (never just the first MAXN of the room's sort), a
     repost of the same thing kept once.
     THE ORDER: threads. The strongest opens (for a live show a video or picture when one is nearly as strong: the opener is
     on screen); then up to three that are closest to it, closest first; then the strongest left opens the next thread.
     "Close" is the rare words two headlines share, weighted by how rare they are in this set: Limoges, Marseille, town
     hall, Macron's absence. A word that half the set shares (France, riots) separates nothing; a word only one item has
     links nothing; a name counts half again. Every change he makes is kept on this device and, when he opens the show screen
     or copies the package, sent to showedits/ (build/show_learn.py counts them). */
  var STOP = /^(the|and|for|that|this|these|those|with|from|have|has|had|are|was|were|will|would|could|should|just|now|they|their|them|there|then|what|when|where|which|who|whom|you|your|our|ours|not|but|all|out|into|about|after|over|more|most|than|very|been|being|its|his|her|she|him|how|why|can|does|did|doing|get|got|gets|says|said|say|today|tonight|yet|again|still|here|one|two|new|breaking|watch|live|video|full|report|update|amp|https|com|www|every|like|looking|look|people|country|make|made|going|know|think|thing|things|really|even|only|also|some|any|many|much|while|because|before|right|left|time|year|years|day|days|week|now|soon|happen|happening|want|need|see|seen|come|coming|take|taking|way|back|down|off|ever|never|always|another|other|same|first|last|next|big|huge|massive|literally|absolutely|holy|shit|fuck|damn|crap)$/;
  var TOKS = {};          // the words of each item, by its code: kept here, never written onto the room's items
  function toks(it) {
    var key = R.code(it) + '|' + (it.t || '').length;
    if (TOKS[key]) return TOKS[key];
    var o = {};
    String(it.t || '').replace(/[^A-Za-zÀ-ÿ0-9\s]/g, ' ').split(/\s+/).forEach(function (raw, i) {
      var w = raw.toLowerCase();
      if (w.length < 3 || STOP.test(w) || /^\d+$/.test(w)) return;
      var name = i > 0 && /^[A-Z][a-zà-ÿ]/.test(raw);
      w = w.replace(/(ings|ing|ers|ies|es|ed|s)$/, '') || w;
      if (w.length >= 3) o[w] = Math.max(o[w] || 0, name ? 1.5 : 1);
    });
    return (TOKS[key] = o);
  }
  function vScore(it) {
    var lk = R.likes ? R.likes(it) : likes(it), r = R.reach(it) || {};
    return (it.hot || 0) + (it._v || 0) * 0.4 + (lk ? 9 * Math.log(1 + lk) / Math.LN10 : 0) + (r.views ? 5 * Math.log(1 + r.views) / Math.LN10 : 0);
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
  function simOf(list) {
    var df = {}, N = list.length || 1;
    list.forEach(function (it) { Object.keys(toks(it)).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
    var idf = function (w) { var d = df[w] || 0; return d < 2 || d >= N * 0.5 ? 0 : Math.log(N / d); };
    return function (a, b) {
      var ta = toks(a), tb = toks(b), s = 0;
      Object.keys(ta).forEach(function (w) { if (tb[w]) s += idf(w) * Math.max(ta[w], tb[w]); });
      var ha = R.storyOf ? R.storyOf(a) : null, hb = R.storyOf ? R.storyOf(b) : null;
      if (ha && hb && ha !== hb) s -= 1;          // two different stories of the hour are two threads
      return s;
    };
  }
  function sameWords(a, b) {
    var ta = Object.keys(toks(a)), tb = toks(b), n = 0; ta.forEach(function (w) { if (tb[w]) n++; });
    var u = ta.length + Object.keys(tb).length - n; return u > 3 && n / u >= 0.8;
  }
  var NEAR = 1.1, THREAD = 4;
  function pickSet(all) {
    var score = scorer(all), sorted = all.slice().sort(function (a, b) { return score(b) - score(a); }), out = [], seenU = {};
    for (var i = 0; i < sorted.length && out.length < MAXN; i++) {
      var it = sorted[i], u = String(it.u || '').replace(/[?#].*$/, '').replace(/^https?:\/\/(www\.|mobile\.)?/, '');
      if (u && seenU[u]) continue;
      if (out.some(function (x) { return sameWords(x, it); })) continue;          // the same clip reposted with the same words
      if (u) seenU[u] = 1;
      out.push(it);
    }
    out.score = score;
    return out;
  }
  // Threads are found for the whole set first, then put in order: every item joins the thread it is closest to overall (the
  // two Limoges town hall clips together, even though one also names Macron), at most THREAD to a thread. Then the thread
  // holding the strongest item opens, each thread is told strongest first and then closest to that, and the next thread is
  // the one holding the strongest item left.
  function threadOrder(set) {
    var score = set.score || vScore, sim = simOf(set), visual = function (it) { var k = typeOf(it); return k === 'video' || k === 'image'; };
    var n = set.length, S = [], i, j;
    for (i = 0; i < n; i++) { S.push([]); for (j = 0; j < n; j++) S[i].push(i === j ? 0 : sim(set[i], set[j])); }
    var groups = set.map(function (it, k) { return [k]; });
    for (;;) {
      var best = -1, bi = -1, bj = -1;
      for (i = 0; i < groups.length; i++) for (j = i + 1; j < groups.length; j++) {
        if (groups[i].length + groups[j].length > THREAD) continue;
        var tot = 0; groups[i].forEach(function (x) { groups[j].forEach(function (y) { tot += S[x][y]; }); });
        var avg = tot / (groups[i].length * groups[j].length);
        if (avg > best) { best = avg; bi = i; bj = j; }
      }
      if (bi < 0 || best < NEAR) break;
      groups[bi] = groups[bi].concat(groups[bj]); groups.splice(bj, 1);
    }
    var top = function (g) { return Math.max.apply(null, g.map(function (k) { return score(set[k]); })); };
    groups.sort(function (a, b) { return top(b) - top(a); });
    // a live show opens on something to look at: the thread with a video or picture nearly as strong as the strongest goes first
    if (st.kind === 'live' && groups.length > 1 && !groups[0].some(function (k) { return visual(set[k]) && score(set[k]) >= top(groups[0]) * 0.85; })) {
      var vi = -1; groups.some(function (g, gi) { if (g.some(function (k) { return visual(set[k]) && score(set[k]) >= top(groups[0]) * 0.85; })) { vi = gi; return true; } return false; });
      if (vi > 0) groups.unshift(groups.splice(vi, 1)[0]);
    }
    var out = [], why = {};
    groups.forEach(function (g, gi) {
      var lead = g.slice().sort(function (a, b) { return score(set[b]) - score(set[a]); });
      var seed = lead[0];
      if (gi === 0 && st.kind === 'live' && !visual(set[seed])) { var v = lead.filter(function (k) { return visual(set[k]) && score(set[k]) >= score(set[seed]) * 0.85; })[0]; if (v != null) seed = v; }
      var at = out.length + 1;
      out.push(set[seed]); why[R.code(set[seed])] = gi === 0 ? 'Opens the show: the strongest' : 'Next thread: the strongest left';
      g.filter(function (k) { return k !== seed; }).sort(function (a, b) { return S[seed][b] - S[seed][a] || score(set[b]) - score(set[a]); })
        .forEach(function (k) { out.push(set[k]); why[R.code(set[k])] = 'Same thread as #' + at; });
    });
    return { list: out, why: why, threads: groups.length };
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
  panel.className = 'ir-sm'; panel.id = 'ir-sm'; panel.hidden = true; panel.setAttribute('aria-label', 'Make a show');
  var anchor = $('ir-main');          // the show maker is one bar, right above the map (18 Oct 2026: the map comes first)
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor); else root.appendChild(panel);          // an older page without #ir-main still gets the panel
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
        '<button type="button" class="ir-sm-cp" data-cp="' + kind + '" data-i="' + i + '" aria-label="Copy this one">' + ICON.copy + '</button></li>';
    }).join('') + '</ul>' + (many ? '<button type="button" class="ir-sm-more" data-mk="more">' + ICON.redo + '<span>Other options</span></button>' : '');
  }
  function bitsOf(it) {
    var r = R.reach(it) || {}, lk = R.likes ? R.likes(it) : null, bits = [R.when(it), it.h || it.nm || it.src];
    if (lk != null) bits.push(T('{n} likes', { n: R.fmt(lk) })); else if (r.views) bits.push(T('{n} views', { n: R.fmt(r.views) }));
    return bits.filter(Boolean).join(' · ');
  }
  // An item's headline as a link to its source; regime media (Iran Uncensored) is never a link, and never in a show at all.
  function itemLink(it) { return isReg(it) ? '<span class="ir-sm-a">' + esc(it.t) + '</span>' : '<a href="' + esc(it.u) + '" target="_blank" rel="noopener nofollow">' + esc(it.t) + '</a>'; }
  function isReg(it) { return !!(R.regime && R.regime(it)); }
  function whyWords(w) {
    var m = /^Same thread as #(\d+)$/.exec(w);
    if (m) return T('Same thread as #{n}', { n: N(m[1]) });
    return w === 'Opens the show: the strongest' ? T('Opens the show: the strongest') : w === 'Next thread: the strongest left' ? T('Next thread: the strongest left') : w;
  }
  var MOVE = {
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>', down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>', add: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
  };
  function runHtml() {
    var why = ui.best ? ui.best.why : {}, last = ui.set.length - 1;
    var since = ui.acts.length - 1 - ui.acts.lastIndexOf('reset');          // the log keeps everything; the count is since the last reset
    var head = '<div class="ir-sm-rhead"><p>' + (ui.mine ? '<b>' + esc(T('Your order')) + '</b> · ' + esc(since === 1 ? T('1 change, kept on this device') : T('{n} changes, kept on this device', { n: N(since) }))
      : '<b>' + esc(T('Best order')) + '</b> · ' + esc(T('the strongest first, then what is closest to it, then the next thread'))) + '</p>' +
      (ui.mine ? '<button type="button" class="ir-sm-best" data-mk="best">' + ICON.redo + '<span>' + esc(T('Back to the best order')) + '</span></button>' : '') + '</div>';
    var list = '<ol class="ir-sm-run">' + ui.set.map(function (it, i) {
      var c = R.code(it), w = why[c] || '';
      return '<li data-c="' + esc(c) + '"><span class="num">' + N(i + 1) + '</span>' + R.mark(it) + itemLink(it) +
        '<span class="ir-sm-mv"><button type="button" data-mv="up" data-i="' + i + '" aria-label="' + esc(T('Move up')) + '"' + (i ? '' : ' disabled') + '>' + MOVE.up + '</button>' +
        '<button type="button" data-mv="down" data-i="' + i + '" aria-label="' + esc(T('Move down')) + '"' + (i < last ? '' : ' disabled') + '>' + MOVE.down + '</button>' +
        '<button type="button" data-mv="out" data-i="' + i + '" aria-label="' + esc(T('Take out of the show')) + '"' + (ui.set.length > 1 ? '' : ' disabled') + '>' + MOVE.out + '</button></span>' +
        '<small>' + (w && !ui.mine ? '<em>' + esc(whyWords(w)) + '</em> · ' : '') + esc(bitsOf(it)) + '</small></li>';
    }).join('') + '</ol>';
    var inSet = {}; ui.set.forEach(function (it) { inSet[R.code(it)] = 1; });
    var sc = ui.best && ui.best.score || vScore, rest = ui.pool.filter(function (it) { return !inSet[R.code(it)]; }).sort(function (a, b) { return sc(b) - sc(a); });
    var more = rest.length ? '<div class="ir-sm-rest"><p class="ir-sm-rl"><b>' + esc(T('Not in the show: {n}', { n: N(rest.length) })) + '</b> · ' + esc(T('the strongest first. Add one and it goes at the end.')) +
      (ui.set.length >= MAXN ? ' ' + esc(T('The show holds {n}: take one out first.', { n: N(MAXN) })) : '') + '</p>' +
      '<ul>' + rest.slice(0, ui.rest).map(function (it) {
        return '<li><button type="button" class="ir-sm-add" data-add="' + esc(R.code(it)) + '" aria-label="' + esc(T('Add to the show')) + '"' + (ui.set.length >= MAXN ? ' disabled' : '') + '>' + MOVE.add + '</button>' + R.mark(it) +
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
    var all = R.shown().filter(function (it) { return !isReg(it); }), n = all.length;
    var mem = sigOf(all), sig = mem + '|' + st.kind;
    if (sig !== ui.sig) {
      var kindOnly = ui.mem === mem;
      ui.sig = sig; ui.mem = mem; ui.pool = all; ui.page = { titles: 0, covers: 0, descs: 0 };
      if (!kindOnly) { ui.pick = { titles: '', covers: '', descs: '' }; ui.myTitle = null; ui.myNote = null; ui.saved = null; ui.savedSig = ''; }
      var picked = n ? pickSet(all) : null;
      ui.best = picked ? threadOrder(picked) : null;
      if (ui.best) ui.best.score = picked.score;
      ui.set = ui.best ? ui.best.list.slice() : []; ui.mine = false; ui.acts = []; ui.rest = 8;
      var kept = store(ORDER_KEY), mine = kept && kept[mem];
      if (mine && Array.isArray(mine.codes)) {
        var byC = {}; all.forEach(function (it) { byC[R.code(it)] = it; });
        var back = mine.codes.map(function (c) { return byC[c]; }).filter(Boolean);
        if (back.length) { ui.set = back.slice(0, MAXN); ui.mine = true; ui.acts = Array.isArray(mine.acts) ? mine.acts.slice() : []; }
      }
      rewords();
    }
    var A = ui.pack && ui.pack.A;
    var bar = '<div class="ir-sm-bar"><span class="ir-sm-ic" aria-hidden="true">' + ICON.play + '</span><p class="ir-sm-l"><b>' + esc(n ? T('Make a show from these {n}', { n: N(n) }) : T('Your filters leave nothing')) + '</b><span>' +
      (n ? esc(mix(A)) + (n > MAXN ? ' · ' + esc(T('the strongest {n} go in, in the best order', { n: N(ui.set.length) })) : '') : esc(T('Loosen a filter and the show fills again'))) + '</span></p>' +
      '<button type="button" class="ir-sm-go" data-mk="toggle" aria-expanded="true">' + esc(T('Close')) + '</button></div>';          // the head of the open maker: its only button closes it (the bar's "Make a show" is the one way in)
    if (!n) { keepFocus(function () { panel.innerHTML = bar; }); panel.classList.toggle('open', false); return; }
    var bf = R.brief ? R.brief() : null;          // the quick briefing (Brief me until 21 Oct): the hottest stories, ready to play, no choices
    var acts = '<div class="ir-sm-acts"><a class="ir-sm-show" href="' + esc(showUrl()) + '" target="_blank" rel="noopener">' + ICON.play + '<span>' + esc(T('Open the show screen')) + '</span></a>' +
      '<button type="button" class="ir-sm-copy" data-mk="copy">' + ICON.copy + '<span>' + esc(T('Copy the package')) + '</span></button>' +
      (bf && bf.url ? '<a class="ir-sm-brief" id="ir-brief" href="' + esc(bf.url) + '" target="_blank" rel="noopener">' + ICON.play + '<span>' + esc(T('Or play the quick briefing: the {n} hottest stories', { n: N(bf.n) })) + '</span></a>' : '') + '</div>';
    var from = '<p class="ir-sm-from"><span>' + esc(T('Built from')) + '</span> ' + esc(R.filterLine ? R.filterLine() : '') + '</p>';
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
    return '?show=' + ui.set.map(function (it) { return 'on~' + R.code(it); }).join('.') + '&kind=' + (PLAIN ? 'live' : st.kind) + '&t=' + encodeURIComponent((curTitle() || (PLAIN ? '' : A.H)).slice(0, 100)) +
      (c ? '&c=' + encodeURIComponent(c.slice(0, 40)) : '') + '&i=' + encodeURIComponent(curNote().slice(0, 420)) + (!PLAIN && A.dom && A.dom.s ? '&st=' + encodeURIComponent(A.dom.id) : '') +
      (d ? '&d=' + encodeURIComponent(firstLine(d).slice(0, 200)) : '');
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
    var rec = { v: 1, how: how, from: String(R.filterLine ? R.filterLine() : '').slice(0, 160), story: A.dom ? String(A.dom.id).slice(0, 40) : '', pool: ui.pool.length,
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
  function snapAll() {
    var list = ui.set.map(snapItem), js = JSON.stringify(list);
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
  lp(function (L) { LPX = L && !L.off ? L : null; if (LPX && LPX.members.sub) LPX.members.sub(function () { ui.mineState = 'idle'; ui.shows = []; if (ui.wantSave && signedIn(LPX)) { ui.wantSave = false; draw(); saveShow(); } else draw(); }); if (!panel.hidden) draw(); });
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
        '<a href="https://wa.me/?text=' + enc(msg) + '" target="_blank" rel="noopener">WhatsApp</a>' +
        '<a href="https://t.me/share/url?url=' + enc(url) + '&text=' + enc(curTitle()) + '" target="_blank" rel="noopener">Telegram</a>' +
        '<a href="https://x.com/intent/post?text=' + enc(curTitle()) + '&url=' + enc(url) + '" target="_blank" rel="noopener">X</a>' +
        '<a href="mailto:?subject=' + enc(curTitle()) + '&body=' + enc(packageText()) + '">' + esc(T('Email')) + '</a>' +
        '<button type="button" data-sv="pack">' + ICON.copy + '<span>' + esc(T('Copy it with the package')) + '</span></button></div>' +
        '<p class="ir-sv-open"><a href="' + esc(url) + '" target="_blank" rel="noopener">' + ICON.play + '<span>' + esc(T('Open it as they will')) + '</span></a></p>';
    }
    h += '<p class="ir-sv-say" id="ir-sv-say" aria-live="polite">' + esc(ui.svMsg) + '</p>';
    if (me && me.v) h += mineHtml();
    return h + '</section>';
  }
  function mineHtml() {
    if (ui.mineState !== 'done' || !ui.shows.length) return '';
    return '<details class="ir-sv-mine"' + (ui.mineOpen ? ' open' : '') + '><summary>' + esc(T('Your saved shows ({n})', { n: N(ui.shows.length) })) + '</summary><ul>' + ui.shows.map(function (s) {
      var arm = ui.arm === s.id;
      return '<li><a href="' + esc(savedUrl(s.id)) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a><small>' +
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
    var plainTx = function (s, n) { return String(s || '').replace(/[<>]/g, '').slice(0, n); };          // the rules take no markup in a show's words
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
        var d = { uid: u.uid, by: name, title: title, note: plainTx(curNote(), 1200), cover: plainTx(curCover(), 40), desc: plainTx(curDesc(), 2000),
          kind: PLAIN ? 'live' : st.kind, n: ui.set.length, items: items, story: !PLAIN && A && A.dom && A.dom.s ? String(A.dom.id).slice(0, 40) : '',
          from: String(R.filterLine ? R.filterLine() : '').slice(0, 160), lang: FA ? 'fa' : 'en', updatedAt: S.F.serverTimestamp() };
        var ref = S.F.doc(S.db, 'shows', id);
        if (ui.saved) return S.F.updateDoc(ref, d);
        return S.F.setDoc(ref, Object.assign(d, { createdAt: S.F.serverTimestamp(), views: 0, hidden: false }));
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
    var s = b.querySelector('span'), was = s ? s.textContent : '';
    b.classList.add('done'); if (s) s.textContent = txt; else b.setAttribute('aria-label', txt);
    setTimeout(function () { b.classList.remove('done'); if (s) s.textContent = was; else b.setAttribute('aria-label', 'Copy this one'); }, 1800);
  }
  panel.addEventListener('click', function (ev) {
    if (ev.target.closest('.ir-sm-show')) { sendEdit('screen'); return; }          // the link opens the screen; the record goes with it
    var b = ev.target.closest('button'); if (!b || !panel.contains(b)) return;
    var mk = b.getAttribute('data-mk');
    if (mk === 'toggle') { setOn(false); mkb.focus({ preventScroll: true }); return; }          // Close: the maker goes, focus back on its one door
    if (mk === 'more') { ui.page[ui.tab]++; draw(); return; }
    if (mk === 'rest') { ui.rest += 12; draw(); return; }
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
      if (ui.set.length >= MAXN) return;
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
      copyText(txt, function () { flash(b, 'Copied'); }, function () { flash(b, 'Copying is blocked here'); });
    }
  });
  /* SHOW MONEY (job 6hp9CRVm7P59vwGf, 19 October 2026). Beside each topic chip, what a live hour on that subject has
     earned in Super Chat on the English channel, and one line above the show maker with the places and the Ali show
     (projects/money/superchat-topics.py reads it off YouTube Studio and writes it). It is his income, so it is one
     database document that only an admin can read (firestore.rules, showmoney/); for anyone else the read is refused
     and nothing is drawn. Display only: he still picks. Since 21 Oct it is drawn whenever an admin is signed in (html
     class ir-money-on), no longer tied to the maker being open: the maker no longer stays open between visits. */
  var MONEY = null;
  function moneyLoad() {
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
      if (!g) { if (m) m.parentNode.removeChild(m); return; }
      if (!m) { m = document.createElement('b'); m.className = 'ir-money'; b.appendChild(m); }
      m.textContent = usd(g.perHour) + '/h';
      b.title = 'Super Chat per live hour on this topic: ' + usd(g.perHour) + ' (' + g.streams + ' shows, ' + MONEY.window + '). Median show: ' + usd(MONEY.medianPerHour) + '.';
    });
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
      if (signedIn(L)) moneyLoad(); else { MONEY = null; document.documentElement.classList.remove('ir-money-on'); }          // signed out: his income leaves the page
    });
  });
  moneyLoad();
  // for build/phone-test.html, which checks every story of the hour against the gate: nothing here changes the page
  window.IRShow = { analyse: analyse, build: build, pickSet: pickSet, threadOrder: threadOrder, fits: fits, lint: lint, vScore: vScore, scorer: scorer, ui: ui, st: st,
    money: function (d) { MONEY = d; moneyPaint(); } };          // phone-test hands it a made-up table; the real one only comes from the database

  /* ---------------------------------------------------------------- the show screen (?show=) */
  var q = new URLSearchParams(location.search);
  PACKS = R.packs ? R.packs() : null;          // intel.js has already read data/show-packs.json
  if (q.get('s')) loadSaved(q.get('s'));
  else if (q.get('show')) showScreen(fromQuery());
  else { if (location.hash === '#make') { setOn(true); if (history.replaceState) history.replaceState(null, '', location.pathname + location.search); setTimeout(function () { panel.scrollIntoView({ block: 'start' }); }, 300); } draw(); }          // #make: a show screen's "Make your own" (a hash, because the room rewrites its query)

  // The show the address spells out (?show=, made by the maker on this device): its items must still be in the room
  function fromQuery() {
    var codes = String(q.get('show') || '').split('.').filter(Boolean).slice(0, 40);
    var rows = codes.map(function (c) { var m = /^([a-z]+)~(.+)$/.exec(c); if (!m) return null; var x = R.byId(m[2]); return x && !isReg(x) ? { role: m[1], it: x } : null; }).filter(Boolean);
    var story = null, sid = q.get('st') || '';
    if (PACKS) PACKS.stories.forEach(function (s) { if (s.id === sid) story = s; });
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
        var items = []; try { items = JSON.parse(v('items') || '[]'); } catch (e) { items = []; }
        var rows = (Array.isArray(items) ? items : []).filter(function (o) { return o && typeof o === 'object' && typeof o.t === 'string'; }).map(function (o) {
          var live = o._code ? R.byId(o._code) : null;
          return { role: 'on', it: live || o };
        }).filter(function (r) { return !isReg(r.it); }).slice(0, 40);
        wait.remove();
        showScreen({ rows: rows, video: v('kind') === 'video', title: String(v('title') || T('The Intel Room')), intro: String(v('note') || ''), cover: String(v('cover') || ''), desc: String(v('desc') || ''),
          saved: { id: id, by: String(v('by') || ''), uid: String(v('uid') || ''), views: +v('views') || 0, at: v('updatedAt') || v('createdAt') || 0 } });
        countView(L, id, String(v('uid') || ''));
      }).catch(fail);
    });
  }
  // One more opening, once per show per browser session, never by its maker. No name, no account, no device kept.
  function countView(L, id, owner) {
    var k = 'ir-seen-' + id;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) { return; }
    var me = who(L); if (me && me.uid === owner) return;
    if (!L || L.off || !L.members.fb) return;
    L.members.fb().then(function (S) { return S.F.updateDoc(S.F.doc(S.db, 'shows', id), { views: S.F.increment(1) }); }).catch(function () { });
  }

  function showScreen(spec) {
    var rows = spec.rows, video = spec.video, title = spec.title, intro = spec.intro, cover = spec.cover, desc = spec.desc, saved = spec.saved || null;
    var at = Math.max(0, Math.min(rows.length, +q.get('n') || 0));          // 0 is the intro card
    // PRESENT or READ. Read is the show as a page: its words, then every item with its source, for a phone, a class, a
    // briefing or print. A saved show opens to read on a phone, and always on Iran Uncensored's Persian page (CFG.light):
    // present loads players from YouTube and X, and a reader inside Iran loads nothing from elsewhere without a tap.
    var mode = q.get('v') === 'read' || q.get('v') === 'present' ? q.get('v') : (saved && (CFG.light || matchMedia('(max-width:900px)').matches) ? 'read' : 'present');
    document.documentElement.classList.add('ir-sh-on');
    var sh = document.createElement('div');
    sh.className = 'ir-sh'; sh.id = 'ir-sh';
    sh.innerHTML = '<div class="ir-sh-bg" aria-hidden="true"><i></i><i></i></div>' +
      '<header class="ir-sh-bar"><a class="ir-sh-brand" href="' + esc(location.pathname) + '" aria-label="' + esc(T('Back to the Intel Room')) + '"><img src="' + esc(SEAL) + '" alt="" width="40" height="40"><span><b>' + esc(BRAND) + '</b> ' + esc(T('Intel Room')) + '</span></a>' +
      '<p class="ir-sh-title">' + esc(title) + '</p>' +
      '<p class="ir-sh-count num" id="ir-sh-count" aria-live="polite"></p><time class="ir-sh-clock num" id="ir-sh-clock"></time>' +
      '<div class="ir-sh-tools"><button type="button" id="ir-sh-mode" aria-pressed="false">' + ICON.read + '<span>' + esc(T('Read it as a page')) + '</span></button>' +
      '<button type="button" id="ir-sh-notes" aria-pressed="false">' + ICON.notes + '<span>' + esc(T('Host notes')) + '</span></button><button type="button" id="ir-sh-full">' + ICON.full + '<span>' + esc(T('Full screen')) + '</span></button>' +
      (saved ? '<button type="button" id="ir-sh-send">' + ICON.share + '<span>' + esc(T('Send')) + '</span></button>' : '') +
      '<a class="ir-sh-mk" id="ir-sh-mk" href="' + esc(location.pathname + '#make') + '">' + ICON.plus + '<span>' + esc(T('Make your own')) + '</span></a></div></header>' +
      '<main class="ir-sh-stage" id="ir-sh-stage"></main>' +
      '<aside class="ir-sh-notes" id="ir-sh-pad" hidden><p class="ir-sh-nl">' + esc(saved ? T('A note from the maker') : video ? T('Your opening hook') : T('Your 30-second intro')) + '</p><p class="ir-sh-nt">' + esc(intro || T('Say what the show is about, and what you will show.')) + '</p></aside>' +
      '<footer class="ir-sh-foot"><button type="button" class="ir-sh-nav" id="ir-sh-prev" aria-label="' + esc(T('Previous')) + '">' + ICON.prev + '</button><ol class="ir-sh-strip" id="ir-sh-strip" aria-label="' + esc(T('The rundown')) + '"></ol><button type="button" class="ir-sh-nav" id="ir-sh-next" aria-label="' + esc(T('Next')) + '">' + ICON.next + '</button>' +
      '<p class="ir-sh-mark" aria-hidden="true">' + (saved && saved.by ? '<span class="ir-sh-by">' + esc(T('Made by {name}', { name: saved.by })) + ' · </span>' : '') + SITE_MARK + '</p></footer>';
    document.body.appendChild(sh);
    document.title = title + ' | ' + BRAND + ' ' + T('Intel Room');
    var empty = !rows.length;
    if (empty) { $('ir-sh-stage').innerHTML = '<div class="ir-sh-card"><h1>' + esc(T('This show has nothing in it')) + '</h1><p>' + esc(T('Its items have left the room since the link was made.')) + ' <a href="' + esc(location.pathname + '#make') + '">' + esc(T('Make it again in the Intel Room')) + '</a></p></div>'; }
    var narrow = matchMedia('(max-width:900px)').matches;
    function notes(on) { $('ir-sh-pad').hidden = !on; $('ir-sh-notes').setAttribute('aria-pressed', on ? 'true' : 'false'); sh.classList.toggle('has-notes', on); if (typeof refitSoon === 'function') refitSoon(); }
    notes(narrow && !!intro);
    function strip() {
      $('ir-sh-strip').innerHTML = '<li><button type="button" data-go="0"' + (at === 0 ? ' aria-current="true"' : '') + '><span class="ir-sh-sn">' + esc(T('Intro')) + '</span><span class="ir-sh-stt">' + esc(title) + '</span></button></li>' +
        rows.map(function (r, i) {
          return '<li><button type="button" data-go="' + (i + 1) + '"' + (at === i + 1 ? ' aria-current="true"' : '') + '>' + R.mark(r.it) + '<span class="ir-sh-sn num">' + N(i + 1) + '</span><span class="ir-sh-stt">' + esc(r.it.t) + '</span></button></li>';
        }).join('');
      var cur = $('ir-sh-strip').querySelector('[aria-current]');
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    // the clock of the audience (Liberty Politics: US Eastern; Iran Uncensored: Tehran, CFG.clock), never the computer's own
    function clock() { try { $('ir-sh-clock').textContent = new Intl.DateTimeFormat(CLOCK.locale || 'en-US', { timeZone: CLOCK.tz, hour: 'numeric', minute: '2-digit' }).format(new Date()) + (CLOCK.label || ''); } catch (e) { $('ir-sh-clock').textContent = ''; } }
    clock(); setInterval(clock, 15000);
    function go(i) {
      at = Math.max(0, Math.min(rows.length, i));
      if (mode === 'read') return;
      $('ir-sh-count').textContent = at === 0 ? T('Intro') : T('{n} of {m}', { n: N(at), m: N(rows.length) });
      $('ir-sh-prev').disabled = at === 0; $('ir-sh-next').disabled = at === rows.length;
      if (!empty) stage();
      strip();
      if (history.replaceState) { var u = new URLSearchParams(location.search); u.set('n', at); history.replaceState(null, '', location.pathname + '?' + u.toString()); }
    }
    // READ: the show as a page (see mode above). Every item with its words, who said it, when, where, its counts and its
    // source; regime media (Iran Uncensored) shown and never linked; nothing loads from another site.
    function readHtml() {
      var meta = function (x) { var w = R.where(x); return [R.when(x), x.nm || x.h || x.src, w && w !== 'No single place' ? w : ''].filter(Boolean).join(' · '); };
      return '<article class="ir-rd">' +
        '<header class="ir-rd-h">' + (cover ? '<p class="ir-rd-k">' + esc(cover) + '</p>' : '') + '<h1>' + esc(title) + '</h1>' +
        (saved && saved.by ? '<p class="ir-rd-by">' + esc(T('Made by {name} in the Intel Room', { name: saved.by })) + (saved.at ? ' · ' + esc(dayOf(saved.at)) : '') + '</p>' : '') +
        (desc ? '<p class="ir-rd-d">' + esc(desc) + '</p>' : '') +
        (intro ? '<div class="ir-rd-n"><p class="ir-rd-nl">' + esc(saved ? T('A note from the maker') : video ? T('Your opening hook') : T('Your 30-second intro')) + '</p><p>' + esc(intro) + '</p></div>' : '') + '</header>' +
        (empty ? '<p class="ir-rd-none">' + esc(T('This show has nothing in it')) + '</p>' : '<ol class="ir-rd-list">' + rows.map(function (r, i) {
          var x = r.it, rg = isReg(x);
          return '<li><span class="ir-rd-num num">' + N(i + 1) + '</span><div class="ir-rd-b"><p class="ir-rd-m">' + R.mark(x) + esc(meta(x)) + '</p>' +
            '<p class="ir-rd-t">' + paras(full(x)) + '</p>' + counts(x) +
            (rg ? '<p class="ir-rd-rg">' + esc(T('Regime media: not linked.')) + '</p>' : '<p class="ir-rd-s"><a href="' + esc(x.u) + '" target="_blank" rel="noopener nofollow">' + esc(srcLine(x)) + '</a></p>') + '</div></li>';
        }).join('') + '</ol>') +
        '<footer class="ir-rd-f"><p>' + esc(T('Every item links to where it was first published. Check it yourself.')) + '</p>' +
        '<p class="ir-rd-acts"><button type="button" data-rd="present">' + ICON.play + '<span>' + esc(T('Present it')) + '</span></button><button type="button" data-rd="print">' + ICON.notes + '<span>' + esc(T('Print or save as PDF')) + '</span></button>' +
        '<a class="ir-sh-mk" href="' + esc(location.pathname + '#make') + '">' + ICON.plus + '<span>' + esc(T('Make a show of your own')) + '</span></a></p>' +
        '<p class="ir-rd-mark">' + esc(T('Made in the Intel Room: the news and the evidence of the last 24 hours on one map, free for anyone.')) + ' <a href="' + esc(location.pathname) + '">' + esc(SITE_MARK) + '</a></p></footer></article>';
    }
    function setMode(m) {
      mode = m;
      sh.classList.toggle('is-read', m === 'read');
      var mb = $('ir-sh-mode'); mb.setAttribute('aria-pressed', m === 'read' ? 'true' : 'false');
      mb.innerHTML = (m === 'read' ? ICON.play + '<span>' + esc(T('Present it')) + '</span>' : ICON.read + '<span>' + esc(T('Read it as a page')) + '</span>');
      if (history.replaceState) { var u = new URLSearchParams(location.search); u.set('v', m); history.replaceState(null, '', location.pathname + '?' + u.toString()); }
      if (m === 'read') { closeReply(); $('ir-sh-stage').innerHTML = readHtml(); $('ir-sh-stage').scrollTop = 0; $('ir-sh-count').textContent = rows.length === 1 ? T('1 item') : T('{n} items', { n: N(rows.length) }); }
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
    var CARD_RX2 = /^https:\/\/pbs\.twimg\.com\/card_img\/\d+\/[A-Za-z0-9_-]+\?format=(?:jpg|png|webp)$/;
    function full(x) { return R.fullText ? R.fullText(x) : x.t; }
    function paras(t) { return String(t || '').split(/\n\s*\n+/).map(function (p) { return '<span class="ir-sh-pp">' + esc(p.trim()) + '</span>'; }).join(''); }
    // the rare post whose end even the room could not get (X's 280 and the mirror both failed): say so, never pretend
    function more(x) { var w = full(x); return w.length >= 270 && /…$/.test(w) ? '<a class="ir-sh-more" href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(T('The post goes on: read the rest on X')) + '</a>' : ''; }
    function initial(x) { return String(x.nm || x.h || '?').replace(/^@/, '').slice(0, 1).toUpperCase() || '?'; }
    function face(x, cls) {
      var av = R.avOf ? R.avOf(x, '400x400') : '';
      return av ? '<span class="' + cls + '" style="background-image:url(' + esc(av) + ')"></span>' : '<span class="' + cls + ' is-mono">' + esc(initial(x)) + '</span>';
    }
    // an X post of words, drawn as the post: the author, the whole text as large as the stage allows, its link card
    function postCard(x) {
      var cd = x.cd && CARD_RX2.test(x.cd.i || '') && !(R.media && R.media(x).length) ? x.cd : null;
      return '<figure class="ir-sh-post">' +
        '<figcaption class="ir-sh-ph">' + face(x, 'ir-sh-pav') + '<span class="ir-sh-pwho"><b>' + esc(x.nm || x.h) + '</b><small>' + esc([x.h, R.when(x)].filter(Boolean).join(' · ')) + '</small></span>' + R.mark(x) + '</figcaption>' +
        '<blockquote class="ir-sh-ptx" id="ir-sh-fit2">' + paras(full(x)) + '</blockquote>' + more(x) +
        (cd ? '<span class="ir-sh-pcd"><span class="ir-sh-pci" style="background-image:url(' + esc(cd.i + '&name=800x419') + ')"></span>' + (cd.t || cd.dm ? '<span class="ir-sh-pct">' + (cd.dm ? '<small>' + esc(cd.dm) + '</small>' : '') + esc(cd.t || '') + '</span>' : '') + '</span>' : '') +
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
      var where = R.where(x) !== 'No single place' ? R.where(x) : '';
      el.innerHTML = '<div class="ir-sh-frame" id="ir-sh-frame"></div><div class="ir-sh-info" id="ir-sh-info">' + (roleName(r) ? '<p class="ir-sh-role">' + esc(roleName(r)) + '</p>' : '') +
        (hasM ? '<p class="ir-sh-who">' + face(x, 'ir-sh-wav') + '<b>' + esc(x.nm || x.h) + '</b><small>' + esc(x.h) + '</small></p><p class="ir-sh-pt" id="ir-sh-fit">' + paras(words) + '</p>' + more(x)
          : '<h2 id="ir-sh-fit">' + paras(words) + '</h2>') +
        '<p class="ir-sh-meta">' + R.mark(x) + esc((isX ? [R.when(x), where] : [R.when(x), x.nm || x.h || x.src, where]).filter(Boolean).join(' · ')) + '</p>' +
        counts(x) + (x.hotWhy ? '<p class="ir-sh-why">' + ICON.flame + esc(x.hotWhy) + '</p>' : '') + (x.also && x.also.length ? '<p class="ir-sh-also">' + esc(T('Also carried by {list}', { list: x.also.join(T(', ')) })) + '</p>' : '') +
        '<p class="ir-sh-acts">' + (hasM && words.length > 110 ? '<button type="button" class="ir-sh-rpb ir-sh-wb" id="ir-sh-wb" title="' + esc(T('The words on the screen alone (W)')) + '">' + ICON.full + '<span>' + esc(T('Words on the screen')) + '</span></button>' : '') + (k ? '<button type="button" class="ir-sh-rpb" id="ir-sh-rpb" aria-pressed="false" aria-controls="ir-sh-rp" title="' + esc(T('Top replies (R)')) + '">' + ICON.reply + '<span>' + esc(k.slice(0, 2) === 'yt' ? T('Top comments') : T('Top replies')) + '</span><b class="num" id="ir-sh-rpn"></b></button>' : '') +
        '<a class="ir-sh-src" href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(srcLine(x)) + '</a></p></div>' +
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
          var n = $('ir-sh-rpn'); if (n) n.textContent = e && e.r.length ? String(e.r.length) : '';
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
        '<div class="ir-sh-rbn"><button type="button" data-rb="-1" aria-label="' + esc(T('The reply before')) + '">' + ICON.prev + '</button><button type="button" data-rb="0">' + esc(T('Back to the post')) + '</button><button type="button" data-rb="1" aria-label="' + esc(T('The next reply')) + '">' + ICON.next + '</button></div></div>';
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
    function fitText(t, box, hi, lo) {
      if (!t || !box || !t.offsetParent) return;
      t.classList.remove('is-scroll');
      hi = Math.max(lo, Math.round(hi));
      t.style.fontSize = hi + 'px';
      if (!spills(box)) return;
      var a = lo, b = hi;
      for (var n = 0; n < 12 && b - a > 0.5; n++) { var m = (a + b) / 2; t.style.fontSize = m + 'px'; if (spills(box)) b = m; else a = m; }
      t.style.fontSize = Math.floor(a) + 'px';
      if (spills(box)) t.classList.add('is-scroll');
    }
    var narrowQ = matchMedia('(max-width:900px)'), fitT = 0;
    function refit() {
      var all = sh.querySelectorAll('#ir-sh-fit,#ir-sh-fit2,#ir-sh-rbt,.ir-sh-ct,.ir-sh-open h1');
      if (narrowQ.matches) { [].forEach.call(all, function (t) { t.style.fontSize = ''; t.classList.remove('is-scroll'); }); return; }
      var H = window.innerHeight, W = window.innerWidth, u = Math.min(H, W * 0.6);
      var pt = $('ir-sh-fit2'); if (pt) fitText(pt, pt, u * 0.1, 18);
      var f = $('ir-sh-fit'), info = $('ir-sh-info'); if (f && info) fitText(f, info, f.tagName === 'H2' ? u * 0.072 : u * 0.05, 15);
      var rb = $('ir-sh-rbt'); if (rb) fitText(rb, rb, u * 0.095, 18);
      var ct = sh.querySelector('.ir-sh-ct'), fr = $('ir-sh-frame'); if (ct && fr) fitText(ct, fr, u * 0.075, 18);
      var oh = sh.querySelector('.ir-sh-open h1'), op = $('ir-sh-stage'); if (oh && op) fitText(oh, op, u * 0.11, 24);
    }
    function refitSoon() { clearTimeout(fitT); fitT = setTimeout(refit, 40); }          // a timer, not a frame: a page in a background tab gets no frames
    if (window.ResizeObserver) new ResizeObserver(refitSoon).observe($('ir-sh-stage'));
    window.addEventListener('resize', refitSoon);
    // and a backstop once a second: a browser that paints no frames (a background tab, some streaming apps' browser
    // sources) reports neither a resize nor a ResizeObserver change, and the text kept its old size (measured 18 Oct 2026)
    var lastBox = '';
    setInterval(function () { var s0 = $('ir-sh-stage'); if (!s0) return; var kb = s0.clientWidth + 'x' + s0.clientHeight; if (kb !== lastBox) { lastBox = kb; refitSoon(); } }, 1000);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refitSoon);
    function firstSentence(t) { var m = /^.*?[.?!](\s|$)/.exec(t); return (m ? m[0] : t).trim(); }
    function roleName(r) { return r.role === 'on' ? '' : r.role === 'rel' ? 'Related' : ROLE[r.role] || ''; }
    function cut(t, n) { return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; }
    function srcLine(x) { var h = String(x.u).replace(/^https?:\/\/(www\.)?/, '').split('/')[0]; return T('Open the source: {site}', { site: x.src === 'News' && x.h ? x.h : h }); }
    function counts(x) {
      var r = R.reach(x) || {}, b = [];
      var lk = r.likes != null ? r.likes : x.lk, vw = r.views != null ? r.views : x.vw;
      if (lk != null) b.push('<span><b class="num">' + R.fmt(lk) + '</b> ' + esc(T('likes')) + '</span>');
      if (x.rp != null) b.push('<span><b class="num">' + R.fmt(x.rp) + '</b> ' + esc(T('reposts')) + '</span>');
      if (vw != null) b.push('<span><b class="num">' + R.fmt(vw) + '</b> ' + esc(T('views')) + '</span>');
      if (x.hot != null) b.push('<span><b class="num">' + N(x.hot) + '</b> ' + esc(T('hot')) + '</span>');
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
      if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(x.u || '')) { el.className = 'ir-sh-frame is-img'; el.innerHTML = '<img src="' + esc(x.u) + '" alt="' + esc(x.t) + '">'; return; }
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
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (rbAt >= 0) showReply(rbAt + (dx < 0 ? 1 : -1)); else go(at + (dx < 0 ? 1 : -1)); }
    }, { passive: true });
    if (mode === 'present' && rows.some(function (r) { return /^https:\/\/(www\.)?(x|twitter)\.com\//.test(r.it.u || ''); })) tw().catch(function () {});          // X's player loads once, early
    if (mode === 'read') setMode('read'); else go(at);
    sh.setAttribute('data-ready', '1');
  }
})();
