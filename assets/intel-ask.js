/* THE ASK BOX of the Intel Room (libertypolitics.com/intel/, iranuncensored.com/<lang>/news/), an add-on intel.js loads
   from data-addons once the room is ready. Until it loads, intel.js's own ask() answers the box exactly as before.

   The brief (24 October 2026): a person who does not know how to use the filters types what they want, for example
   "viral commentary about the Iran protests this week, videos under 10 minutes", or says it in Persian, and the room sets
   the filters for them, shows them as chips they can see and take off (the room's own pills, each with its cross, and
   Adjust opens the filters panel), says in one line what it did, and offers Save this filter. A question about what is in
   the room ("what is trending", "who posted most about Gaza", "the most liked video about Iran") gets the answer itself
   on the card, each answer one tap away. Nothing found is never a dead end: the nearest set of filters that does find
   something is put on the screen, and the card says what was let go, with the other near sets one tap away.

   HOW IT READS. All in the browser, no paid model: a question costs nothing. Words in, one whole set of filters out (from
   the room's blank set, IRoom.blank), in this order, each step taking the words it used out of the text so the next step
   never reads them twice: the question shape; the time and the lens; where it was posted; any filter an add-on or a later
   build registered with words of its own (IRoom.addFilter({ key, ..., ask: [[pattern, value, said], ...] }), read from the
   room's registry every time, so a new filter teaches this box by declaring its words, never by an edit here); orders
   and floors (viral, most liked, 10K+ likes, credible); what it is (videos, articles, posts); a Trending story named by its
   own words; one account or outlet ("from Fox News", "@handle"); regions, places and topics; and the words left over
   become the search. The Persian page's words are first turned into these by the room's own table (CFG.askMap, written in
   site-iu/build/news.py), and its places and topics carry their Persian names already (CFG.askPlaces, CFG.askTopics).

   SAVED FILTERS are the room's saved views (localStorage 'ir-views', intel.js views()): the same list in the filters panel
   and here. Tap the search box and they are there, one tap each, with three things to try. Signed in, each is also kept on
   the account, so the phone and the computer hold the same ones: as a document in savelists/ (firebase/firestore.rules
   "savelists"; the SAVE LISTS documents of intel-prep.js) whose items hold one {"_filter": "<the address>"} row and no
   item (n 0). intel-prep.js leaves those documents out of the lists (isFilterDoc). No rules change was needed.

   Every sentence goes through T() (the Iran page's spoken Persian: site-iu/data/news-words.json, read by news.py
   t_keys()). No browser dialog, nothing hidden and animated in, every control at least 40px.
   Test: build/phone-test.html "THE ASK BOX". */
(function () {
  var R = window.IRoom, root = document.getElementById('ir');
  if (!R || !root || !R.askWith || !R.peek || document.getElementById('ira-pop')) return;
  var CFG = (function () { var el = document.getElementById('ir-cfg'); if (!el) return {}; try { var c = JSON.parse(el.textContent); return c && typeof c === 'object' ? c : {}; } catch (e) { return {}; } })();
  var TT = CFG.t && typeof CFG.t === 'object' ? CFG.t : null, FA = CFG.lang === 'fa';
  function T(s, v) { var r = TT && typeof TT[s] === 'string' ? TT[s] : s; if (v) Object.keys(v).forEach(function (k) { r = r.split('{' + k + '}').join(String(v[k])); }); return r; }
  function N(n) { var s = String(n); return FA ? s.replace(/\d/g, function (d) { return '\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9'.charAt(+d); }) : s; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cut(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/[\s,:;.'"-]+\S*$/, '') + '…' : t; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } return v; }
  function rx(src, flags) { try { return src instanceof RegExp ? src : new RegExp(src[0], src[1] || ''); } catch (e) { return /(?!)/; } }
  function gl(r) { return new RegExp(r.source, r.flags.indexOf('g') >= 0 ? r.flags : r.flags + 'g'); }
  // "on fire" as a reader's slang for hot ("what's on fire", "on fire right now") asks for the hottest; after a thing ("vessel
  // on fire in Hormuz", "ship reported on fire off Oman") it is the news itself and stays in the words (29 Oct 2026: two
  // Hormuz headlines could not find themselves, ask gate)
  var FIRE = /(?:^\s*|\b(?:what'?s|whats|what is|what are|who'?s|which|stories|story|news|topics?|things?|everything)\s+)on fire\b/;
  var SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z"/></svg>';
  var TUNE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>';
  var BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>';

  /* ------------------------------------------------------------------ reading the words */
  // words that carry no filter in English; a word here never becomes the search
  var STOP = /(^|\s)(happened|happen|happening|going|at|say|said|says|told|tell|show|showing|me|us|give|find|get|all|any|the|a|an|of|about|on|for|in|from|with|that|which|what|whats|is|are|was|were|i|im|want|need|please|some|can|could|you|to|and|or|by|it|its|this|these|those|evidence|proof|items?|things?|stuff|anything|everything|related|where|who|how|did|do|does|has|have|had|they|their|them|there|here|just|only|really|very|more|less|than|over|under|around|regarding|concerning|latest|news|look|looking|see|let|lets|my|our|we|be|been|being|will|would|should|best|good|great|new|stories|story|content|something|people|talking|discuss\w*|cover\w*|topic|topics|top|most|right|now|but|not|no|so|like|also|both|either|into|onto|per|via|vs|versus|shows|shown|showed|prove[sd]?|proving|demonstrat\w*|argu(e|es|ed|ing)|doesn'?t|isn'?t|aren'?t|wasn'?t|weren'?t|didn'?t|don'?t|can'?t|won'?t|never|commit|commits|committed|committing|doing|done|make|makes|made|actually|uses|using|out|breaking|thousands|hundreds|millions|dozens|many|numerous|lots)(?=\s|$)/g;
  // THE CLAIMS (29 October 2026; his ask "show me stuff that shows israel does not commit genocide" came back as the words
  // "shows commit genocide" over Israel only: 1 item, while the bank holds 157 on the genocide claim). A bank tag that names
  // a claim ("The genocide claim", "Blood libels debunked") is the room's evidence ON that claim, so the claim's own word
  // reaches it whatever verbs surround it, and asking AGAINST a claim (not, isn't, debunk, myth, lie) goes to the bank,
  // where that evidence lives, rather than to the last 24 hours, which mostly carry the accusation. Read from the bank's own
  // tags (vocab().tags), never from a list here: a new claim tag teaches this box by existing.
  var CLAIMTAG = /\b(claims?|libels?|debunk\w*|myths?|hoax\w*|lies|staged|fake\w*)\b/;
  var AGAINST = /\b(not|no|isn'?t|aren'?t|wasn'?t|weren'?t|doesn'?t|didn'?t|don'?t|never|false(ly)?|fake|myths?|lies|lie|lying|hoax\w*|debunk\w*|disprov\w*|refut\w*|rebut\w*|against|counter\w*|wrong(ly)?|untrue|baseless|accus\w*|allegations?|alleged|so-?called)\b/;
  var CLAIMSAY = /\b(commit\w*|carr(y|ies|ying|ied) out|engag\w* in|claims?|claimed|accus\w*|allegations?|alleged|so-?called|myths?|lies|lie|lying|hoax\w*|debunk\w*|disprov\w*|refut\w*|rebut\w*|false(ly)?|untrue|baseless)\b/;
  var CLAIMSYN = { famine: '|starv\\w*|hunger', genocide: '|genocidal' };
  function claimsOf(V) {
    return (V.tags || []).filter(function (g) { return CLAIMTAG.test(String(g).toLowerCase()); }).map(function (g) {
      var w = sigWords(g).filter(function (x) { return !CLAIMTAG.test(x) && !SOFT.test(' ' + x + ' '); })[0];
      if (!w) return null;
      var ws = String(g).toLowerCase().split(/[^a-z]+/), nx = ws[ws.indexOf(w) + 1] || '';
      if (/^(libels?|myths?|hoax\w*)$/.test(nx)) return { tag: g, w: w, rx: new RegExp('\\b(' + w + ' ' + nx.replace(/s$/, '') + 's?)\\b') };
      return { tag: g, w: w, rx: new RegExp('\\b(' + w.slice(0, Math.max(4, w.length - 1)) + '\\w*' + (CLAIMSYN[w] || '') + ')\\b') };
    }).filter(Boolean);
  }
  // who DOES something in the sentence ("israel does", "iran's", "qatar funds") is what the items are about, not where they
  // happened: the region row reads a place or a name in the headline, so it would keep 33 of the 157 genocide-claim items
  var ACTOR = /(?:^|\s)([a-z]{3,})(?:'s)?\s+(?:does|did|do|is|was|are|were|has|have|had|isn'?t|wasn'?t|aren'?t|doesn'?t|didn'?t|don'?t|never|not|commit\w*|kill\w*|starv\w*|target\w*|bomb\w*|fund\w*|pays?|paid|lie[sd]?|lying|want\w*|uses?|used|block\w*|shoot\w*|shot|attack\w*|invad\w*|occup\w*|genocid\w*)(?=\s|$)/g;
  // a word that describes a kind of piece rather than its subject: when no filter takes it, it is said, never searched
  var SOFT = /(^|\s)(commentary|commentaries|analysis|analyses|opinions?|takes?|hot takes?|reactions?|rants?|explain\w*|breakdowns?|discussions?|debates?|coverage|content|footage|updates?)(?=\s|$)/;
  function norm(raw, V) {
    var t = ' ' + String(raw || '').toLowerCase().replace(/[“”"’‘`]/g, "'").replace(/\u200c/g, '').replace(/\u064a/g, '\u06cc').replace(/\u0643/g, '\u06a9')
      .replace(/[\u06f0-\u06f9]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); }).replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/(\d),(\d{3})/g, '$1$2').replace(/[?!.,;:()«»\u060c\u061f]/g, ' ') + ' ';
    (V.map || []).forEach(function (a) { t = t.replace(a[0], a[1]); });
    return t.replace(/\s+/g, ' ');
  }
  function num(s, unit) {
    var n = parseFloat(String(s).replace(/,/g, '')); if (!isFinite(n)) return 0;
    unit = String(unit || '').toLowerCase();
    if (/^(k|thousand)$/.test(unit)) n *= 1000; else if (/^(m|million|mil)$/.test(unit)) n *= 1e6;
    return Math.round(n);
  }
  // the biggest of the room's own steps that is not above n (10K+ likes for "15,000 likes")
  function stepAtMost(list, n) { var v = 0; (list || []).forEach(function (o) { if (o[0] && o[0] <= n && o[0] > v) v = o[0]; }); return v; }
  // the shortest window past 24 hours that holds n hours, else the longest the room offers (0: the last 24 hours)
  function stepAtLeast(list, n) {
    var long = (list || []).filter(function (o) { return o[0] > 24; }).map(function (o) { return o[0]; }).sort(function (a, b) { return a - b; });
    for (var i = 0; i < long.length; i++) if (long[i] >= n) return long[i];
    return long.length ? long[long.length - 1] : 0;
  }
  function sigWords(s) {
    return String(s || '').toLowerCase().replace(/\u200c/g, '').split(/[^a-z0-9\u0600-\u06ff]+/).map(function (w) { return w.replace(/'s$/, ''); })
      .filter(function (w) { return w.length >= 4 && !/^(says|said|after|over|with|from|into|amid|about|will|that|this|their|they|what|when|where|have|been|more|than|most|just|news|live|watch|breaking|update|video|videos|post|posts|report|reports|calls|call|new)$/.test(w); });
  }

  function read(raw, base) {
    var V = R.vocab(), t = norm(raw, V).replace(/\b(far|hard|alt|radical)[- ](right|left)\b/g, '$1_$2').replace(/\b(?:october 7(?:th)?|oct\.? 7(?:th)?|7(?:th)? (?:of )?october|7 oct)\b(?!\s*,?\s*20\d\d)/g, 'oct7').replace(/\b(right|left)[- ]wing\b/g, '$1_wing'), did = [], left = [], intent = '';
    var has = function (r) { return r.test(t); };
    var eat = function (r) { var w = new RegExp('(?:' + r.source + ')[a-z0-9\\u0600-\\u06ff\\u200c]*', r.flags.indexOf('g') >= 0 ? r.flags : r.flags + 'g'); t = t.replace(w, ' '); };
    // 1. the shape of a question
    if (has(/\b(what'?s|what is|what are|whats)? ?(trending|hot right now|happening right now|going on|the big(gest)? stor(y|ies)|top stories|hot topics right now)\b/) && !has(/\bwho\b/)) intent = 'trending';
    if (has(/\bwhat should i (talk about|cover|do a show on)\b/)) intent = 'trending';
    if (has(/\bhow many\b/)) intent = 'count';
    if (has(/\bwho (is |are )?(post\w*|talk\w*|cover\w*|say\w*|tweet\w*)\b.*\bmost\b|\bwho posted most\b|\bwhich (accounts?|channels?|outlets?|people)\b|\btop (accounts?|posters?|channels?|outlets?|voices)\b|\bwho (is|are) (posting|talking)\b/)) intent = 'who';
    if (!intent && has(/\b(the )?(single )?(most liked|most viewed|most watched|most viral|top|best|biggest|hottest) (post|tweet|video|clip|article|story)\b(?!s)/)) intent = 'one';
    if (has(/\bwhy\b.*\b(hot|trending|viral|big|everywhere)\b/)) intent = 'why';
    eat(/\b(how many|who (is |are )?(posting|posted|talking|covering|saying|tweeting)( about)?( the)? most|who posted most|which (accounts?|channels?|outlets?|people)|top (accounts?|posters?|channels?|outlets?|voices)|what should i (talk about|cover|do a show on)|why is( it)?|why are|what'?s|what is|what are|whats|show me|find me|give me|i want|looking for|search for|tell me)\b/);
    if (intent === 'trending') eat(/\b(trending|hot right now|happening right now|going on|the big(gest)? stor(y|ies)|top stories|hot topics right now|right now)\b/);
    if (intent === 'why') eat(/\b(hot|trending|viral|big|everywhere)\b/);
    if (intent === 'who') eat(/\b(posts?|posted|posting|tweets?|tweeted)\b/);          // "who posted" asks for people, not for posts only
    // 1a. who does something in the sentence, and a claim the bank holds evidence on (THE CLAIMS, above)
    var actors = [], am; ACTOR.lastIndex = 0;
    while ((am = ACTOR.exec(t))) { actors.push(am[1]); ACTOR.lastIndex = am.index + am[0].length - 1; }
    var claim = null;
    var nWords = t.split(/\s+/).filter(Boolean).length;
    if (nWords <= 14) claimsOf(V).some(function (c) { var cm = c.rx.exec(t); if (!cm) return false; var near = t.split(/\s+/).filter(Boolean), at0 = t.slice(0, cm.index).split(/\s+/).filter(Boolean).length, win = near.slice(Math.max(0, at0 - 6), at0 + 7).join(' '); claim = { tag: c.tag, w: c.w, said: cm[0].trim(), against: AGAINST.test(win) }; t = t.replace(gl(c.rx), ' '); return true; });
    if (claim) { eat(CLAIMSAY); if (claim.against) eat(AGAINST); }

    // 1b. a filter that declares its own words (the room's registry: IRoom.addFilter({ key, ask: [[pattern, value, said]] }))
    // (read before the time words, so "breaking news" is the news filter and not only "today")
    var ext = V.ext || {}, extSet = {};
    Object.keys(ext).forEach(function (k) {
      var f = ext[k], rows = f && Array.isArray(f.ask) ? f.ask : null; if (!rows) return;
      for (var i = 0; i < rows.length; i++) {
        var r0 = rows[i]; if (!r0) continue;
        var pr = rx(r0[0]), mm = pr.exec(t); if (!mm) continue;
        var v = typeof r0[1] === 'function' ? r0[1](mm) : r0[1];
        if (v == null || v === '' || (f.valid && !f.valid(String(v)))) continue;
        extSet[k] = String(v); t = t.replace(mm[0], ' ');
        break;
      }
    });
    // 2. time, and which of the room's lenses that means
    var lens = base || V.lens, ns, n = V.buckets.length - 1, m, bank = null, within = 0, timed = false;
    var LIVEW = /\b(today|tonight|this morning|this evening|right now|now|breaking(?! (?:the|a|an|his|her|their|its|our|of|up|down|into|out|through|point|silence|bad)\b)|latest|newest|recent|recently|just in|live|last 24 hours|past 24 hours|24 hours|this week|past week|last week|this weekend|last few days|past few days|these days|lately|current|currently|fresh)\b/;
    if ((m = /\b(?:last|past|in the last|in the past|within)\s+(\d+)\s*(?:hours?|hrs?|h)\b/.exec(t)) || (m = /\b(?:last|past) (hour)\b/.exec(t))) {
      var hrs = m[1] === 'hour' ? 1 : +m[1];
      if (hrs < 24) { within = stepAtMost(V.within, Math.max(1, hrs)) || 0; if (!within) within = (V.within.filter(function (o) { return o[0]; }).sort(function (a, b) { return a[0] - b[0]; })[0] || [0])[0]; }
      else within = hrs <= 24 ? 0 : stepAtLeast(V.within, hrs);
      timed = true; t = t.replace(m[0], ' ');
      if (V.live) lens = 'live';
    }
    // days and weeks: the room's time picker past 24 hours (intel.js THE TIME PICKER), the shortest window that holds them
    else if ((m = /\b(?:last|past|in the last|in the past|within)\s+(\d+|few|couple of)\s*(days?|weeks?)\b/.exec(t)) || (m = /\b(this|past|last) (week)\b/.exec(t))) {
      var nn = m[2] === 'week' ? 1 : /^\d+$/.test(m[1]) ? +m[1] : 3, hh = nn * (/^week/.test(m[2]) ? 168 : 24);
      within = hh <= 24 ? 0 : stepAtLeast(V.within, hh);
      timed = true; t = t.replace(m[0], ' ');
      if (V.live) lens = 'live';
    }
    if (has(/since (the )?(oct7|october 7|oct 7|7 oct(ober)?|the massacre)/)) { bank = { from: 1, to: n, said: T('since 7 October') }; eat(/since (the )?(oct7|october 7(th)?|oct 7|7 oct(ober)?|the massacre)/); }
    else if (has(/\b(this month)\b/) && !V.live) { bank = { from: n, to: n, said: T('from this month') }; eat(/\bthis month\b/); }
    else if (has(/\b(past|last) (30 days|month)\b/)) { bank = { from: V.daysFrom(30), to: n, days: 30, said: T('from the past 30 days') }; eat(/\b(past|last) (30 days|month)\b/); }
    else if (has(/\b(past|last) (12 months|year)\b|\bthis year\b/)) { bank = { from: Math.max(1, n - 11), to: n, said: T('from the past year') }; eat(/\b(past|last) (12 months|year)\b|\bthis year\b/); }
    else if ((m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (20\d\d)\b/.exec(t))) {
      var bi = V.buckets.indexOf(m[2] + '-' + ('0' + (V.mon.map(function (x) { return x.toLowerCase(); }).indexOf(m[1]) + 1)).slice(-2));
      if (bi > 0) bank = { from: bi, to: bi, said: T('from {when}', { when: V.bLabel(bi) }) };
      t = t.replace(m[0], ' ');
    } else if ((m = /\b(in|during|since|after|last|this|early|late|mid|of|from)\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\b(?!\s*\d)/.exec(t))) {
      // a month with no year is the latest one the bank holds ("in January" in October 2026 is January 2026). Only after a
      // word like "in": "may" and "march" alone are a verb far more often than a month.
      var mk = ('0' + (['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[2].slice(0, 3)) + 1)).slice(-2), bj = -1;
      V.buckets.forEach(function (b, i) { if (i > 0 && /^\d{4}-\d\d$/.test(b) && b.slice(5) === mk) bj = i; });
      if (bj > 0) bank = /^(since|after)$/.test(m[1]) ? { from: bj, to: n, said: T('since {when}', { when: V.bLabel(bj) }) } : { from: bj, to: bj, said: T('from {when}', { when: V.bLabel(bj) }) };
      t = t.replace(m[0], ' ');
    } else if ((m = /\b(?:since|after) (20\d\d)\b/.exec(t))) {
      var a0 = V.buckets.indexOf(m[1] + '-01'); bank = { from: a0 > 0 ? a0 : 1, to: n, said: T('since {when}', { when: N(m[1]) }) }; t = t.replace(m[0], ' ');
    } else if ((m = /\b(?:in |during )?(20\d\d)\b/.exec(t))) {
      var y = m[1], f = -1, l = -1;
      V.buckets.forEach(function (b, i) { if (b.slice(0, 4) === y) { if (f < 0) f = i; l = i; } });
      if (+y < 2023) { f = l = 0; }
      if (f >= 0) bank = { from: f, to: l, said: +y < 2023 ? T('from before October 2023') : T('from {when}', { when: N(y) }) };
      t = t.replace(m[0], ' ');
    }
    // "top picks" are the bank's own marked items, whichever tab it was asked from (its "top" is not an order)
    var wantTop = has(/\btop picks?\b/) && !!V.sorts.bank;
    if (wantTop) eat(/\btop picks?\b/);
    if (bank && V.sorts.bank) lens = 'bank';
    else if (wantTop && !has(LIVEW)) lens = 'bank';
    else if (has(LIVEW) && V.live) { lens = 'live'; }
    if (has(LIVEW)) { timed = true; eat(LIVEW); }
    if (lens === 'readers' && (bank || has(LIVEW))) lens = V.live ? 'live' : 'bank';
    // "what is trending" is a question about the last 24 hours, whichever tab it was asked from (its words were eaten above)
    if (intent === 'trending' && V.live && !bank) lens = 'live';
    // asked against a claim, with no time said: the bank, where the evidence on it lives (THE CLAIMS)
    var toBank = false;
    if (claim && claim.against && !timed && lens !== 'bank' && V.sorts.bank) { lens = 'bank'; toBank = true; }
    if (Object.keys(extSet).length && V.live && !bank && lens !== 'live') lens = 'live';          // the room's facets cut the last 24 hours
    ns = R.blank(lens);
    Object.keys(extSet).forEach(function (k) { ns.ext[k] = extSet[k]; });
    if (ns.lens !== lens) lens = ns.lens;
    if (bank && lens === 'bank') { ns.from = bank.from; ns.to = bank.to; ns.days = bank.days || 0; did.push(bank.said); }
    if ((within || timed) && lens === 'live') ns.within = within;          // "today" is the last 24 hours, whatever the bar was on
    var sorts = V.sorts[lens] || [];
    var canSort = function (s) { return sorts.indexOf(s) >= 0; };

    // 3. where it was posted
    var pfGuess = false;
    (V.pf || []).forEach(function (pw) {
      var pm = rx(pw[0]).exec(t); if (!pm) return;
      if (ns.pf.indexOf(pw[1]) < 0) ns.pf.push(pw[1]);
      if (!/(?:^|\b(?:on|from|in|via|at|only)|(?:^|\s)(?:در|از|تو|توی|روی|فقط))\s*$/.test(t.slice(0, pm.index)) && !/^\s*(?:on|from|in)\b/.test(pm[0])) pfGuess = true;
      eat(pw[0]);
    });
    if (has(/\btweets?\b/)) { if (ns.pf.indexOf('X') < 0) ns.pf.push('X'); eat(/\btweets?\b/); }
    if (has(/\b(news sites?|news outlets?|the press|newspapers?)\b/) && (V.pfs || []).some(function (p) { return p[0] === 'News'; })) { if (ns.pf.indexOf('News') < 0) ns.pf.push('News'); eat(/\b(news sites?|news outlets?|the press|newspapers?)\b/); }

    var t3 = t;          // every word left here is part of what was asked: choose() reads them all, whatever a guess below eats
    // video length said in words but no filter took it: say so rather than search for "10 minutes"
    var LEN = /\b(?:(?:under|less than|shorter than|below|up to|max(?:imum)?|over|more than|longer than|at least)\s*\d+\s*(?:min(?:ute)?s?|m)\b|\d+\s*min(?:ute)?s? (?:or less|or shorter|or more|max|long)|short (?:videos?|clips?)|shorts\b|long[- ]form|full (?:interviews?|episodes?))/;
    if (has(LEN)) {
      var lm = LEN.exec(t)[0].trim(), lk = Object.keys(ext).filter(function (k) { return ext[k] && ext[k].field === 'dur'; })[0];
      // the room's length filter is in steps (under 1, 1 to 10, 10 to 30, 30 or more minutes): "under 5 minutes" takes the
      // step it falls in, so a number its own words did not list still sets it
      var mn = /(\d+)/.exec(lm), mins = mn ? +mn[1] : 0, under = /under|less|shorter|below|up to|max|or less|or shorter|short/.test(lm);
      var lv = !mins ? (under ? 'm' : 'xl') : under ? (mins <= 1 ? 's' : mins <= 10 ? 'm' : 'l') : (mins >= 30 ? 'xl' : mins >= 10 ? 'l' : 'm');
      if (lk && (!ext[lk].valid || ext[lk].valid(lv))) ns.ext[lk] = lv;
      else left.push(T('"{w}" (there is no video length filter yet)', { w: lm }));
      eat(LEN);
    }

    // 5. orders and floors
    var want = '';
    if (has(/\b(viral|going viral|blowing up|spreading fast)\b/)) {
      if (V.virals && V.virals.length > 1 && has(/\bviral\b/)) ns.vmin = 50;
      if (canSort('viral')) want = 'viral';
      eat(/\b(viral|going viral|blowing up|spreading fast)\b/);
    }
    if ((m = /\b(?:over|more than|at least|above|with)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|m|million)?\s*\+?\s*(likes?|views?)\b/.exec(t))) {
      var cnt = num(m[1], m[2]);
      if (/like/.test(m[3])) { var lv = stepAtMost(V.likes, cnt); if (lv) ns.lmin = lv; if (canSort('likes')) want = want || 'likes'; }
      else if (canSort('views')) want = 'views';
      t = t.replace(m[0], ' ');
    }
    if (has(/\b(most liked|liked|likes)\b/) && canSort('likes')) want = 'likes';
    else if (has(/\b(most viewed|most watched|views|watched)\b/) && canSort('views')) want = 'views';
    eat(/\b(most liked|liked|likes|most viewed|most watched|views|watched)\b/);
    if (has(FIRE) && lens === 'live') { ns.heat = 90; eat(/\bon fire\b/); }
    if (has(/\b(hottest|biggest|top|best|strongest|most important|hot)\b/)) {
      if (!want) want = lens === 'live' && canSort('hot') ? 'hot' : lens === 'bank' && canSort('top') ? 'top' : '';
      eat(/\b(hottest|biggest|top|best|strongest|most important|hot)\b/);
    }
    if (has(/\b(newest|most recent) first\b|\bnewest\b/) && canSort('new')) { want = 'new'; eat(/\b(newest|most recent)( first)?\b/); }
    if (has(/\boldest\b/) && canSort('old')) { want = 'old'; eat(/\boldest( first)?\b/); }
    if (has(/\b(credible|reliable|trusted|trustworthy|reputable|serious|mainstream)( sources?| outlets?)?\b/) && V.creds && V.creds.length > 1) { ns.crmin = 70; eat(/\b(credible|reliable|trusted|trustworthy|reputable|serious|mainstream)( sources?| outlets?)?\b/); }
    if (wantTop && lens === 'bank') ns.top = true;
    if (has(/\bexplainers?\b/) && V.hasEdu) { ns.edu = true; eat(/\bexplainers?\b/); }

    // 6. what it is
    // a kind said outright ("videos", "articles") is eaten; one read from a noun ("footage", "a report", "an interview") is a
    // guess: it stays in the words too, and choose() also tries the question without it
    // and a plural is asked for only where it is the thing wanted: first, at the end, or before "about", "from", "on"...
    // ("videos about Iran", "hostage videos"); in the middle of a sentence it is the subject ("Hamas documents show ...")
    var kindGuess = false;
    var asked = function (w) { var r = new RegExp('(?:^\\s*|\\b(?:me|any|only|just|some|all|latest|newest|recent|new|top|best|most liked|most viewed|liked|viewed|watched|viral|hot|good|short|long|full|more)\\s+)' + w + '\\b|\\b' + w + '(?=\\s*$|\\s+(?:about|on|of|from|that|which|with|showing|where|in|for|by|related|today|tonight|this|last|over|under|only)\\b)'); return r.test(t); };
    if (has(/\b(videos|clips|vlogs|livestreams)\b/)) { ns.kind = 'video'; if (asked('(?:videos|clips|vlogs|livestreams)')) eat(/\b(videos?|clips?|vlogs?|livestreams?)\b/); else kindGuess = true; }
    else if (has(/\b(video|clip|footage|interviews?|streams?|vlog|livestream)\b/)) { ns.kind = 'video'; kindGuess = true; eat(/\b(video|clip)\b/); }
    else if (has(/\b(articles|op-?eds|columns)\b/)) { ns.kind = 'article'; if (asked('(?:articles|op-?eds|columns)')) eat(/\b(articles?|op-?eds?|columns?)\b/); else kindGuess = true; }
    else if (has(/\b(article|op-?ed|column|reports?|news reports?)\b/)) { ns.kind = 'article'; kindGuess = true; eat(/\b(article|op-?ed|column)\b/); }
    else if (has(/\b(documents|pdfs|papers)\b/)) { ns.kind = 'doc'; if (asked('(?:documents|pdfs|papers)')) eat(/\b(documents?|pdfs?|papers?)\b/); else kindGuess = true; }
    else if (has(/\b(document|pdf|paper)\b/)) { ns.kind = 'doc'; kindGuess = true; }          // "data" is the bank's subject Data and numbers, not a kind of file
    else if (has(/\bposts\b/)) { ns.kind = 'post'; if (asked('posts')) eat(/\bposts\b/); else kindGuess = true; }
    eat(/\b(only|just)\b/);
    // a length is a video's: say videos, so the line and the pills read as asked
    // (a length read from a word like "clip" is itself a guess, so the kind it brings is one too: choose() tries without both)
    if (!ns.kind && Object.keys(ns.ext).some(function (k) { return ext[k] && ext[k].field === 'dur'; })) { ns.kind = 'video'; kindGuess = true; }

    // 7. a Trending story named by its own words, and the room's two story views
    var hotGuess = false;
    if (lens === 'live') {
      if (has(/\bblind ?spots?\b|\bone side (ignored|missed)\b|\bnot (being )?(covered|reported)\b/)) { ns.hot = 'blind'; eat(/\bblind ?spots?\b|\bone side (ignored|missed)\b|\bnot (being )?(covered|reported)\b/); }
      else if (intent === 'trending' || has(/\bhot topics\b|\bhot stories\b|\ball hot\b/)) { ns.hot = 'all'; eat(/\bhot topics\b|\bhot stories\b|\ball hot\b/); }
      else {
        var best = null, bs = 0, words = t.split(' ');
        (V.hots || []).forEach(function (h) {
          var sw = sigWords(h.name), hit = sw.filter(function (w) { return words.indexOf(w) >= 0 || words.indexOf(w + 's') >= 0 || words.indexOf(w.replace(/s$/, '')) >= 0; });
          var sc = hit.length + (sw.length && hit.length === sw.length ? 0.5 : 0);
          if (hit.length >= 2 && sc > bs) { bs = sc; best = { h: h, hit: hit }; }
        });
        if (best) { hotGuess = true; ns.hot = best.h.id; best.hit.forEach(function (w) { t = t.replace(new RegExp('(^|\\s)' + w + 's?(?=\\s|$)', 'g'), ' '); }); }
      }
    }
    // 8. one account or outlet: "@handle", or "from Fox News", "by Trump"
    var accs = null, accOf = function () { return accs || (accs = V.accounts(lens)); };
    if ((m = /(^|\s)@([a-z0-9_]{1,15})(?=\s|$)/.exec(t))) {
      var ak = '@' + m[2], fa0 = accOf().filter(function (a) { return a[0] === ak; })[0];
      if (fa0) { ns.who = fa0[0]; t = t.replace(m[0], ' '); }
    }
    if (!ns.who && (m = /\b(?:from|by|posted by|said by|according to)\s+([a-z0-9\u0600-\u06ff'.&-]+(?:\s+[a-z0-9\u0600-\u06ff'.&-]+){0,3})/.exec(t))) {
      var ph = m[1].trim(), placeLike = (V.places || []).some(function (pw) { return pw[0].test(' ' + ph.split(' ')[0] + ' '); }), bestA = null;
      if (!placeLike) for (var k2 = ph.split(' ').length; k2 >= 1 && !bestA; k2--) {
        var p2 = ph.split(' ').slice(0, k2).join(' ');
        if (p2.length < 3) continue;
        bestA = accOf().filter(function (a) { var nm = String(a[1]).toLowerCase(); return a[0] === p2 || a[0] === '@' + p2.replace(/\s+/g, '') || nm === p2 || (nm.indexOf(p2) === 0 && p2.length >= nm.length * 0.6); })[0] || null;
        if (bestA) t = t.replace(new RegExp('\\b(?:from|by|posted by|said by|according to)\\s+' + p2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), ' ');
      }
      if (bestA) ns.who = bestA[0];
    }
    // 9. regions, places and topics
    // "who" and "us" are a question and a pronoun far more often than the WHO and the US: only in capitals do they name them
    if (!/\bWHO\b/.test(raw)) eat(/\bwho\b/);
    if (!/\bU\.?S\.?\b|\bUSA\b/.test(raw)) eat(/\bus\b/);
    var fxs = [], actorOf = [];
    // a named place first (Gaza City, Tehran, a campus), so the region row does not eat its name ("gaza" of Gaza City)
    for (var i0 = 0; i0 < (V.places || []).length; i0++) {
      var pw0 = V.places[i0]; if (pw0[1].indexOf('c:') === 0 || !pw0[0].test(t) || !V.place(pw0[1])) continue;
      ns.place = pw0[1]; eat(pw0[0]); break;
    }
    (V.focus || []).forEach(function (f) {
      if (fxs.length >= 2) return;
      var nm = String(f[1]).toLowerCase(), r2 = f[3] instanceof RegExp ? new RegExp(f[3].source, f[3].flags.replace('g', '').indexOf('i') >= 0 ? f[3].flags.replace('g', '') : f[3].flags.replace('g', '') + 'i') : null;
      var hit = null;
      if (nm.length >= 3 && t.indexOf(' ' + nm + ' ') >= 0) hit = nm;
      else if (r2) {
        var mm = r2.exec(t), w = mm ? mm[0].trim() : '';
        // the region's pattern also names its people ("Trump", "Netanyahu"): a person typed is searched for, never widened to
        // a whole country; a country typed inside a region of many ("France" in Europe) is left for the country itself
        var pc = w ? (V.places || []).filter(function (pw) { return pw[1].indexOf('c:') === 0 && pw[0].test(' ' + w + ' '); })[0] : null, cn = pc ? pc[1].slice(2) : '';
        var stem = function (s) { return String(s || '').toLowerCase().slice(0, 4); };
        var named = w.length >= 3 && [f[1]].concat(f[2] || []).some(function (s) { return stem(s) === stem(w); });
        // a name of two words or more ("Islamic Republic", "Gaza Strip") names the region, never a person in it (29 Oct 2026:
        // "the Islamic Republic massacred" left "islamic" to the Islam topic and "republic" to the search, and found nothing)
        if (/\s/.test(w) || /^(irgc|mullahs?|ayatollahs?)$/.test(w)) named = true;
        else if (pc && (f[2] || []).length > 1 && (f[2] || []).indexOf(cn) >= 0) named = false;
        else if (pc && ((f[2] || []).indexOf(cn) >= 0)) named = true;
        if (named) hit = mm[0];
      }
      if (hit) {
        fxs.push(f[0]); t = t.replace(hit, ' ');
        if (actors.some(function (a) { return a === nm || (r2 && r2.test(' ' + a + ' ')); })) actorOf.push({ fx: f[0], name: f[1] });
      }
    });
    for (var i = 0; i < (V.places || []).length && !ns.place; i++) {
      var pw = V.places[i]; if (!pw[0].test(t)) continue;
      var pv = pw[1];
      if (pv.indexOf('c:') !== 0 || !V.place(pv)) continue;
      var cf = pv.indexOf('c:') === 0 ? (V.focus || []).filter(function (f) { return f[2] && f[2].length === 1 && f[2][0] === pv.slice(2); })[0] : null;
      if (cf) { if (fxs.indexOf(cf[0]) < 0 && fxs.length < 2) fxs.push(cf[0]); }
      else if (!(pv.indexOf('c:') === 0 && fxs.some(function (k) { var f = (V.focus || []).filter(function (x) { return x[0] === k; })[0]; return f && f[2] && f[2].indexOf(pv.slice(2)) >= 0; }))) ns.place = pv;
      eat(pw[0]);
      break;
    }
    ns.fx = fxs;
    if (V.rel && has(/\breligio(n|ns|us)\b|\bfaiths?\b/)) { ns.tp.push('rel'); eat(/\breligio(n|ns|us)\b|\bfaiths?\b/); }
    (V.topicAsk || []).forEach(function (ta) { if (ns.tp.length < 2 && ns.tp.indexOf(ta[1]) < 0 && ta[0].test(t)) { ns.tp.push(ta[1]); eat(ta[0]); } });
    (V.topics || []).forEach(function (tp) { var nm = String(tp[1]).toLowerCase(); if (ns.tp.length < 2 && ns.tp.indexOf(tp[0]) < 0 && nm.length >= 3 && t.indexOf(' ' + nm + ' ') >= 0) { ns.tp.push(tp[0]); t = t.replace(' ' + nm + ' ', ' '); } });
    if (ns.place === 'us-campus') ns.tp = ns.tp.filter(function (k) { return k !== 'education'; });
    // 10. what is left is the search; a word that only describes the kind of piece is said, never searched
    if (V.stopFa) t = t.replace(V.stopFa, ' ');
    var soft = [];
    t = t.replace(/\s+/g, ' ');
    t.split(' ').forEach(function (w) { if (w && SOFT.test(' ' + w + ' ')) soft.push(w); });
    var rest = (' ' + t + ' ').replace(gl(SOFT), ' ').replace(STOP, ' ').replace(STOP, ' ').replace(/[^a-z0-9_\u0590-\u06ff' -]/g, ' ').replace(/\s+/g, ' ').trim();
    ns.q = (claim ? [claim.w] : []).concat(rest.split(' ').filter(function (w) { return (w.length > 2 || (w.length === 2 && /[\u0600-\u06ff]/.test(w))) && !/^\d+$/.test(w) && (!claim || w !== claim.w); })).slice(0, 5).join(' ');
    // a place named only as who did something leaves the place row when it would hide most of what the words find (askIt)
    if (ns.place && actors.some(function (a) { return (V.places || []).some(function (pw) { return pw[1] === ns.place && pw[0].test(' ' + a + ' '); }); })) actorOf.push({ place: ns.place, name: ns.place.indexOf('c:') === 0 ? ns.place.slice(2) : V.name.place(ns.place) });
    soft.forEach(function (w) { if (left.length < 3) left.push(T('"{w}" (no filter for that yet)', { w: w })); });
    if (!want && claim && lens === 'bank' && canSort('top')) want = 'top';          // evidence on a claim: the strongest first
    if (want) ns.sort = want;
    if (sorts.indexOf(ns.sort) < 0) ns.sort = sorts[0] || ns.sort;
    // the words reading: what was asked, less the words that asked for an order, a kind said outright, or one account
    var tw = t3.replace(/\b(viral|going viral|blowing up|spreading fast|most liked|liked|likes|most viewed|most watched|views|watched|hottest|biggest|top picks?|top|best|strongest|most important|hot|newest|most recent|oldest|first|credible|reliable|trusted|trustworthy|reputable|explainers?|only|just)\b/g, ' ');
    if (FIRE.test(t3)) tw = tw.replace(/\bon fire\b/g, ' ');
    if (ns.kind && !kindGuess) tw = tw.replace(/\b(videos?|clips?|vlogs?|livestreams?|articles?|op-?eds?|columns?|documents?|pdfs?|papers?|posts)\b/g, ' ');
    if (ns.who) tw = tw.replace(/(^|\s)@[a-z0-9_]+|\b(?:from|by|posted by|said by|according to)\s+\S+(\s+\S+){0,3}/g, ' ');
    tw = tw.replace(LEN, ' ');
    if (!/\bWHO\b/.test(raw)) tw = tw.replace(/\bwho\b/g, ' ');
    var allw = (' ' + (V.stopFa ? tw.replace(V.stopFa, ' ') : tw) + ' ').replace(gl(SOFT), ' ').replace(STOP, ' ').replace(STOP, ' ').replace(/[^a-z0-9_\u0590-\u06ff' -]/g, ' ').replace(/\s+/g, ' ').trim().split(' ')
      .filter(function (w, i, a) { return (w.length > 2 || /^(uk|un|eu)$/.test(w) || (w.length === 2 && /[\u0600-\u06ff]/.test(w))) && !/^\d+$/.test(w) && a.indexOf(w) === i && (!claim || w !== claim.w); });
    var allq = (claim ? [claim.said || claim.w] : []).concat(allw.filter(function (w) { return !claim || w !== claim.said; })).slice(0, 6).join(' ');
    return { ns: ns, did: did, left: left, intent: intent, raw: raw, claim: claim, toBank: toBank, actor: actorOf, allq: allq, timed: timed || !!bank, kindGuess: kindGuess, want: want, hotGuess: hotGuess, pfGuess: pfGuess };
  }

  /* ------------------------------------------------------------------ saying what a set of filters is, in one line */
  function kindWord(k, one) { return (one ? { video: T('video'), article: T('article'), doc: T('document'), post: T('post') } : { video: T('videos'), article: T('articles'), doc: T('documents'), post: T('posts') })[k] || ''; }
  function describe(ns, n, extra) {
    var V = R.vocab(), nm = V.name, one = n === 1, parts = [];
    var noun = kindWord(ns.kind, one) || (ns.lens === 'live' ? (one ? T('story') : T('stories')) : (one ? T('item') : T('items')));
    if (ns.hot && ns.lens === 'live') {
      var h = (V.hots || []).filter(function (x) { return x.id === ns.hot; })[0];
      parts.push(h ? T('in the story "{name}"', { name: h.name }) : ns.hot === 'blind' ? T('that one side of the media left out') : T('in the hot stories'));
    }
    // a subject inside a sentence starts small ("on protests and unrest"), a name keeps its capital (AI, Islam)
    var low = function (w) { return FA || CFG.topics || /^(AI|Islam|Christianity|Judaism)\b/.test(w) ? w : w.charAt(0).toLowerCase() + w.slice(1); };
    if (ns.tp && ns.tp.length) parts.push(T('on {topics}', { topics: ns.tp.map(function (k) { return low(nm.topic(k)); }).join(T(' or ')) }));
    if (ns.fx && ns.fx.length) parts.push(T('about {place}', { place: ns.fx.map(nm.focus).join(T(' or ')) }));
    if (ns.place) parts.push(T('in {place}', { place: ns.place === 'global' ? T('no single place') : ns.place.indexOf('c:') === 0 ? nm.country(ns.place.slice(2)) : ns.place.split(',').map(nm.place).join(T(', ')) }));
    if (ns.who) { var acc = V.accounts(ns.lens).filter(function (a) { return a[0] === ns.who; })[0]; parts.push(T('from {who}', { who: acc ? acc[1] : ns.who })); }
    if (ns.pf && ns.pf.length) parts.push(T('on {pf}', { pf: ns.pf.map(nm.pf).join(T(' or ')) }));
    Object.keys(ns.ext || {}).forEach(function (k) { var f = V.ext[k]; if (!f) return; var lb = null; try { lb = f.label ? f.label(ns.ext[k]) : null; } catch (e) { lb = null; } lb = String(lb || ns.ext[k]); parts.push(!FA && /^[A-Z][a-z]/.test(lb) ? lb.charAt(0).toLowerCase() + lb.slice(1) : lb); });          // a pill's name inside a sentence: "commentary and analysis"
    if (ns.q) parts.push(ns.qm === 'best' ? T('best matches for "{q}"', { q: ns.q }) : ns.qm === 'rank' ? T('closest to "{q}" first', { q: ns.q }) : ns.qm === 'any' ? T('that mention any of "{q}"', { q: ns.q }) : T('that mention "{q}"', { q: ns.q }));
    if (ns.lmin) parts.push(T('with {n}+ likes', { n: nm.fmt(ns.lmin) }));
    if (ns.vmin) parts.push(ns.vmin >= 90 ? T('in the top 10% for reach') : ns.vmin >= 75 ? T('in the top quarter for reach') : T('viral (the top half for reach)'));
    if (ns.crmin) parts.push(T('from credible sources ({n}+)', { n: N(ns.crmin) }));
    if (ns.heat && ns.lens === 'live') parts.push(T('at heat {n}+', { n: N(ns.heat) }));
    if (ns.top && ns.lens === 'bank') parts.push(T('top picks only'));
    if (ns.edu) parts.push(T('explainers only'));
    if (ns.lens === 'bank' && V.buckets && (ns.from > 0 || ns.to < V.buckets.length - 1)) parts.push(ns.from === ns.to ? T('from {when}', { when: V.bLabel(ns.from) }) : T('from {a} to {b}', { a: V.bLabel(ns.from), b: V.bLabel(ns.to) }));
    if (ns.lens === 'live') parts.push(ns.within ? T('from {when}', { when: V.winSay ? V.winSay(ns.within) : ns.within }) : T('from the last 24 hours'));
    (extra || []).forEach(function (x) { parts.push(x); });
    var line = T('{n} {what}', { n: N(n), what: noun }) + (parts.length ? ' ' + parts.join(T(', ')) : '') + '.';
    var so = { hot: T(' Hottest first.'), viral: T(' Most viral first.'), likes: T(' Most liked first.'), views: T(' Most viewed first.'), top: T(' Top picks first.'), old: T(' Oldest first.') }[ns.sort];
    if (so) line += so;
    return line;
  }

  /* ------------------------------------------------------------------ nothing found: the nearest set that finds something */
  // What can be let go, least wanted first: the free words, the floors, the time, the platform, an add-on's filter, the kind,
  // the account, the place, the topic, the story. Each step says what it let go, in the words of the pill a reader sees.
  function drops(ns) {
    var V = R.vocab(), nm = V.name, out = [], cp = function () { return JSON.parse(JSON.stringify(ns)); };
    var add = function (label, fn) { var x = cp(); fn(x); out.push({ label: label, ns: x }); };
    if (ns.lmin) add(T('{n}+ likes', { n: nm.fmt(ns.lmin) }), function (x) { x.lmin = 0; });
    if (ns.vmin) add(T('viral only'), function (x) { x.vmin = 0; });
    if (ns.crmin) add(T('credible sources only'), function (x) { x.crmin = 0; });
    if (ns.heat) add(T('heat {n}+', { n: N(ns.heat) }), function (x) { x.heat = 0; });
    if (ns.within) add(V.winSay ? V.winSay(ns.within) : String(ns.within), function (x) { x.within = 0; });
    if (ns.lens === 'bank' && (ns.from !== 0 || ns.to !== V.buckets.length - 1 || ns.days)) add(T('the time'), function (x) { x.from = 0; x.to = V.buckets.length - 1; x.days = 0; });
    if (ns.top) add(T('top picks only'), function (x) { x.top = false; });
    if (ns.pf && ns.pf.length) add(T('{pf} only', { pf: ns.pf.map(nm.pf).join(T(' and ')) }), function (x) { x.pf = []; });
    Object.keys(ns.ext || {}).forEach(function (k) { var f = V.ext[k], lb = null; try { lb = f && f.label ? f.label(ns.ext[k]) : null; } catch (e) { } add(String(lb || ns.ext[k]), function (x) { delete x.ext[k]; }); });
    if (ns.kind) add(T('{kind} only', { kind: kindWord(ns.kind) }), function (x) { x.kind = ''; });
    if (ns.who) add(T('one account only'), function (x) { x.who = ''; });
    if (ns.place) add(ns.place.indexOf('c:') === 0 ? nm.country(ns.place.slice(2)) : nm.place(ns.place), function (x) { x.place = ''; });
    (ns.fx || []).forEach(function (k) { add(nm.focus(k), function (x) { x.fx = x.fx.filter(function (y) { return y !== k; }); }); });
    (ns.tp || []).forEach(function (k) { add(nm.topic(k), function (x) { x.tp = x.tp.filter(function (y) { return y !== k; }); }); });
    if (ns.hot) add(T('the story'), function (x) { x.hot = ''; });
    // the words are what was asked about: let go of last (29 Oct 2026: they went first, and "videos of staged footage" became
    // every video of Gaza)
    if (ns.q) add(T('the words "{q}"', { q: ns.q }), function (x) { x.q = ''; x.qm = ''; });
    return out;
  }
  // a set with nothing switched on is not a near answer: it is the whole room
  function isBlank(ns) { var b = R.blank(ns.lens); return JSON.stringify(Object.assign({}, ns, { sort: '' })) === JSON.stringify(Object.assign({}, b, { sort: '' })); }
  function otherLens(ns) {
    var V = R.vocab(), other = ns.lens === 'live' ? 'bank' : V.live ? 'live' : '';
    if (!other || !V.sorts[other]) return null;
    var o = R.blank(other); ['q', 'qm', 'tp', 'fx', 'place', 'kind', 'pf', 'who', 'lmin', 'vmin', 'crmin', 'ext'].forEach(function (k) { if (ns[k] != null) o[k] = JSON.parse(JSON.stringify(ns[k])); });
    var on = R.peek(o);
    return on > 0 && !isBlank(o) ? { ns: o, let: [], to: other, n: on } : null;
  }
  function nearest(ns) {
    var V = R.vocab(), one = drops(ns).map(function (d) { d.n = R.peek(d.ns); return d; }).filter(function (d) { return d.n > 0 && !isBlank(d.ns); });
    var timed = (ns.lens === 'bank' && (ns.from > 0 || ns.to < (V.buckets || []).length - 1 || ns.days)) || (ns.lens === 'live' && ns.within);
    var ol = timed ? null : otherLens(ns);          // the same filters in the other lens beat letting one of them go; never against a time that was said
    if (ol) return { best: ol, also: one.slice(0, 2).map(function (d) { return { ns: d.ns, let: [d.label], n: d.n }; }) };
    if (one.length) return { best: { ns: one[0].ns, let: [one[0].label], n: one[0].n }, also: one.slice(1, 3).map(function (d) { return { ns: d.ns, let: [d.label], n: d.n }; }) };
    // nothing one step away: let go in order until something is found
    var cur = JSON.parse(JSON.stringify(ns)), let_ = [];
    for (var g = 0; g < 12; g++) {
      var d = drops(cur)[0]; if (!d) break;
      cur = d.ns; let_.push(d.label);
      if (isBlank(cur)) break;
      var c = R.peek(cur); if (c > 0) return { best: { ns: cur, let: let_, n: c }, also: [] };
    }
    return null;
  }

  /* ------------------------------------------------------------------ the card under the pills: what it did, and what next */
  var card = null, C = { q: '', prev: null, box: '', saving: false, name: '', ans: '', note: '', near: [], left: [], from: '' };
  function ensureCard() {
    if (card && card.isConnected) return card;
    card = document.createElement('div'); card.className = 'ira'; card.id = 'ira'; card.setAttribute('role', 'status'); card.setAttribute('aria-live', 'polite');
    var said = $('ir-said'); if (said && said.parentNode) said.parentNode.insertBefore(card, said.nextSibling); else root.insertBefore(card, root.firstChild);
    card.addEventListener('click', onCard);
    card.addEventListener('submit', onSave);
    card.addEventListener('keydown', function (ev) { ev.stopPropagation(); if (ev.key === 'Escape' && C.saving) { C.saving = false; draw(); } });
    return card;
  }
  function closeCard() { if (card) { card.remove(); card = null; } C.q = ''; C.saving = false; }
  function savedHere() { var q = R.query(); return R.views().filter(function (v) { return v.q === (q || '?lens=' + R.lens()); })[0] || null; }
  function draw() {
    var el = ensureCard(), st = R.state(), n = R.shown().length, now = R.query(), same = now === C.q, sv = savedHere();
    var line = (C.from && same ? C.from + ' ' : '') + describe(st, n);
    var html = '<div class="ira-top"><span class="ira-i">' + SPARK + '</span><p class="ira-l"' + (FA ? ' dir="auto"' : '') + '>' + (same && C.note ? '<b>' + esc(C.note) + '</b> ' : '') + esc(line) + '</p>' +
      '<button type="button" class="ira-x" data-ira="x" aria-label="' + esc(T('Close')) + '">&times;</button></div>';
    if (same && C.ans) html += C.ans;
    if (same && C.near.length) html += '<div class="ira-near"><span>' + esc(T('Or try:')) + '</span>' + C.near.map(function (o, i) { return '<button type="button" data-ira-near="' + i + '">' + esc(o.label || T('without {what}', { what: o.let.join(T(' and ')) })) + ' <i class="num">' + N(o.n) + '</i></button>'; }).join('') + '</div>';
    if (same && C.left && C.left.length) html += '<p class="ira-left">' + esc(T('Not used: {what}.', { what: C.left.join(T(', ')) })) + '</p>';
    if (C.saving) {
      html += '<form class="ira-f" autocomplete="off"><label for="ira-n">' + esc(T('Name this filter')) + '</label><span><input id="ira-n" type="text" maxlength="32" dir="auto" value="' + esc(C.name) + '" required>' +
        '<button type="submit">' + esc(T('Save')) + '</button><button type="button" data-ira="nosave">' + esc(T('Cancel')) + '</button></span></form>';
    } else {
      html += '<div class="ira-a">' + (sv ? '<span class="ira-ok">' + STAR + esc(T('Saved as "{name}"', { name: sv.n })) + '</span>' : '<button type="button" class="ira-sv" data-ira="save">' + STAR + '<span>' + esc(T('Save this filter')) + '</span></button>') +
        '<button type="button" data-ira="adjust">' + TUNE + '<span>' + esc(T('Adjust')) + '</span></button>' +
        (C.prev ? '<button type="button" data-ira="undo">' + BACK + '<span>' + esc(T('Undo')) + '</span></button>' : '') + '</div>';
    }
    el.innerHTML = html;
    if (C.saving) { var i = $('ira-n'); if (i) { i.focus(); try { i.select(); } catch (e) { } } }
  }
  function onCard(ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var k = b.getAttribute('data-ira');
    if (k === 'x') { closeCard(); var q0 = $('ir-q'); if (q0) q0.focus({ preventScroll: true }); return; }
    if (k === 'save') { C.saving = true; C.name = cut(suggestName(), 32); draw(); return; }
    if (k === 'nosave') { C.saving = false; draw(); return; }
    if (k === 'adjust') { if (R.openFilters) R.openFilters('all'); return; }
    if (k === 'undo') { var p = C.prev; C.prev = null; closeCard(); if (p) R.apply(p.st, p.box); return; }
    if (b.hasAttribute('data-ira-near')) { var o = C.near[+b.getAttribute('data-ira-near')]; if (o) put(o.ns, { note: o.let ? T('Let go of {what}.', { what: o.let.join(T(' and ')) }) : '', keepPrev: true }); return; }
    if (b.hasAttribute('data-ira-hot')) { var st = R.state(); st.hot = b.getAttribute('data-ira-hot'); if (st.lens !== 'live') { var bl = R.blank('live'); bl.hot = st.hot; st = bl; } put(st, { keepPrev: true }); return; }
    if (b.hasAttribute('data-ira-who')) { var sw = R.state(); sw.who = b.getAttribute('data-ira-who'); put(sw, { keepPrev: true }); return; }
    if (b.hasAttribute('data-ira-open')) { var it = OPEN[+b.getAttribute('data-ira-open')]; if (it && R.open) R.open(it); return; }
  }
  function suggestName() {
    var raw = String(C.box || '').trim();
    if (raw && raw.length <= 32) return raw.charAt(0).toUpperCase() + raw.slice(1);
    var st = R.state(), V = R.vocab(), b = [];
    if (st.hot && st.lens === 'live') { var h = (V.hots || []).filter(function (x) { return x.id === st.hot; })[0]; if (h) b.push(h.name); }
    (st.fx || []).forEach(function (k) { b.push(V.name.focus(k)); });
    (st.tp || []).forEach(function (k) { b.push(V.name.topic(k)); });
    if (st.kind) b.push(kindWord(st.kind));
    if (st.q) b.push(st.q);
    return b.join(' ').trim() || raw || T('My filter');
  }
  function onSave(ev) {
    ev.preventDefault();
    var nm = String(($('ira-n') || {}).value || '').replace(/[<>]/g, '').trim().slice(0, 32); if (!nm) return;
    var q = R.query() || '?lens=' + R.lens();
    var v = R.views().filter(function (x) { return x.n !== nm && x.q !== q; });
    v.unshift({ n: nm, q: q, at: Date.now() });
    R.setViews(v.slice(0, 12)); viewsChanged();
    C.saving = false; draw();
    var q0 = card && card.querySelector('.ira-ok'); if (q0) q0.setAttribute('tabindex', '-1');
  }
  // Put a set on the screen and say what happened. o: note (a bold first word), keepPrev, from (what is being shown)
  function put(ns, o) {
    o = o || {};
    if (!o.keepPrev || !C.prev) C.prev = { st: R.state(), box: C.box || '' };
    if (o.box != null) C.box = o.box;
    R.apply(ns, o.box);
    C.q = R.query(); C.note = o.note || ''; C.ans = o.ans || ''; C.near = o.near || []; C.left = o.left || []; C.from = o.from || ''; C.saving = false;
    draw();
  }
  if (R.onRender) R.onRender(function () { if (!card || !card.isConnected) return; if (!R.query()) { closeCard(); return; } draw(); });

  /* ------------------------------------------------------------------ answers to questions about what is in the room */
  var OPEN = [];
  function whoOf(it) { return String(it.h || it.nm || '').toLowerCase(); }
  function nameOf(it) { return String(it.src === 'X' ? (it.nm || it.h || '') : (it.h || it.nm || it.src || '')).replace(/\s+/g, ' ').trim(); }
  function answer(intent, ns) {
    var V = R.vocab(), list;
    if (intent === 'trending') {
      list = R.peek(ns, true); var by = {}, order = [];
      list.forEach(function (it) { var s = R.storyOf ? R.storyOf(it) : null; if (!s) return; if (!by[s.id]) { by[s.id] = { id: s.id, name: s.name, n: 0, hot: s.hot }; order.push(by[s.id]); } by[s.id].n++; });
      order.sort(function (a, b) { return (b.hot - a.hot) || (b.n - a.n); });
      if (!order.length) order = (V.hots || []).filter(function (h) { return V.top.indexOf(h.id) >= 0; }).map(function (h) { return { id: h.id, name: h.name, n: h.n, hot: h.hot }; });
      if (!order.length) return '';
      return '<div class="ira-ans"><p>' + esc(T('The biggest stories right now. Tap one to see only it:')) + '</p><ol>' + order.slice(0, 3).map(function (s) {
        return '<li><button type="button" data-ira-hot="' + esc(s.id) + '"' + (FA ? ' dir="auto"' : '') + '><b>' + esc(s.name) + '</b><small>' + esc(T('Hot {n}', { n: N(s.hot) })) + '</small></button></li>';
      }).join('') + '</ol></div>';
    }
    if (intent === 'who') {
      list = R.peek(ns, true); var c = {}, nm = {};
      list.forEach(function (it) { var k = whoOf(it); if (!k) return; c[k] = (c[k] || 0) + 1; if (!nm[k]) nm[k] = nameOf(it); });
      var top = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).slice(0, 3);
      if (!top.length) return '';
      return '<div class="ira-ans"><p>' + esc(T('Who posted the most here. Tap one to see only theirs:')) + '</p><ol>' + top.map(function (k) {
        return '<li><button type="button" data-ira-who="' + esc(k) + '"><b' + (FA ? ' dir="auto"' : '') + '>' + esc(nm[k]) + '</b><small>' + esc(c[k] === 1 ? T('1 item') : T('{n} items', { n: N(c[k]) })) + '</small></button></li>';
      }).join('') + '</ol></div>';
    }
    if (intent === 'one') {
      list = R.shown(); OPEN = list.slice(0, 1);
      if (!OPEN.length) return '';
      var it = OPEN[0], r = R.reach ? R.reach(it) : null, bits = [nameOf(it)];
      if (r && r.likes != null) bits.push(T('{n} likes', { n: V.name.fmt(r.likes) }));
      if (r && r.views != null) bits.push(T('{n} views', { n: V.name.fmt(r.views) }));
      return '<div class="ira-ans"><p>' + esc(T('At the top:')) + '</p><button type="button" class="ira-one" data-ira-open="0"><b' + (FA ? ' dir="auto"' : '') + '>' + esc(cut(it.t, 140)) + '</b><small>' + esc(bits.filter(Boolean).join(' · ')) + '</small><span>' + esc(T('Open it')) + '</span></button></div>';
    }
    if (intent === 'why' && ns.hot && ns.hot !== 'all' && ns.hot !== 'blind') {
      var h = (V.hots || []).filter(function (x) { return x.id === ns.hot; })[0];
      if (h && h.why) return '<div class="ira-ans"><p>' + esc(T('Why it is hot: {why}.', { why: h.why })) + '</p></div>';
    }
    return '';
  }

  /* ------------------------------------------------------------------ the box itself */
  var AUTO = null;
  function askIt(text) {
    var raw = String(text || '').trim().slice(0, 200);
    if (!raw) return false;
    hidePop();
    // the lens a reader is in, not the one the last answer moved them to on its own ("nothing today, so the bank")
    var base = AUTO && R.lens() === AUTO.to ? AUTO.from : '';
    var pl = plan(raw, base);
    AUTO = pl.auto;
    put(pl.ns, pl.o);
    if (pl.intent) { C.ans = answer(pl.intent, R.state()); if (C.ans) draw(); }
    return true;
  }
  /* TWO READINGS, TWO TABS, KEEP THE BEST (29 Oct 2026, after Armin's second failed question in a day). A topic, region or
     place read from a word ("Islamic" as Islam, "ICJ" as The Hague, "Francesca" as France) is a guess, and every guess
     only ever narrowed: a wrong one emptied the answer, and the tab he happened to be on (the last 24 hours) answered
     questions about evidence the bank holds. So a question is read twice: as filters (what read() made of it) and as
     words (the same with the guessed topic, region and place taken off and every word searched, best matches first), and
     each in both tabs unless a time was said. The winner is the one whose first three items carry most of what was
     asked (IRoom.rel, the room's own weighed score). A question about proof or evidence leans to the bank, and the tab
     the reader is on wins a tie. */
  var EVID = /\b(proof|proves?|evidence|debunk\w*|rebut\w*|refut\w*|accus\w*|counter\w*|claims?|myths?|lies|lied|history|historical|documents?|data|numbers|statistics|stats|reports?|study|studies|research|sources?|examples?|quotes?|footage|explain\w*|was there|did|does|is it true)\b/i;
  var SOCIAL = /\b(liked|likes|views|viewed|viral|trending|tweets?|tweeted|posts|on x|reactions?|people (?:are )?saying|right now|today|tonight)\b/i;
  function choose(p, ns, base, o, withs) {
    if (!R.rel || !p.allq) { if (ns.q && !ns.qm) ns.qm = 'best'; return ns; }
    var V = R.vocab(), cp = function (x) { return JSON.parse(JSON.stringify(x)); }, here = ns.lens, cands = [];
    var A = cp(ns); if (A.q && !A.qm) A.qm = 'best';
    cands.push({ ns: A, pref: 0.03 });
    var guessed = (ns.tp || []).length || (ns.fx || []).length || ns.place || Object.keys(ns.ext || {}).length || (p.kindGuess && ns.kind) || p.hotGuess || (p.pfGuess && (ns.pf || []).length);
    if (guessed || p.allq !== ns.q) { var B = cp(ns); B.tp = []; B.fx = []; B.place = ''; B.ext = {}; if (p.kindGuess) B.kind = ''; if (p.hotGuess) B.hot = ''; if (p.pfGuess) B.pf = []; B.q = p.allq; B.qm = 'best'; cands.push({ ns: B, pref: p.allq.split(' ').length >= 5 ? 0.08 : 0.02, words: true }); }
    var other = here === 'live' ? 'bank' : here === 'bank' && V.live ? 'live' : '';
    if (other && V.sorts[other] && !p.timed && !p.toBank && !p.intent && !(ns.hot && !p.hotGuess) && !ns.who && !(/^(likes|views|viral)$/.test(p.want || '') && (V.sorts[other] || []).indexOf(p.want) < 0) && !ns.lmin && !ns.vmin) {
      cands.slice().forEach(function (c) {
        var x = R.blank(other);
        ['q', 'qm', 'tp', 'fx', 'place', 'kind', 'pf', 'lmin', 'vmin', 'crmin', 'ext', 'sort'].forEach(function (k) { if (c.ns[k] != null) x[k] = cp(c.ns[k]); });
        if ((V.sorts[other] || []).indexOf(x.sort) < 0) x.sort = (V.sorts[other] || [])[0] || x.sort;
        cands.push({ ns: x, pref: c.pref - 0.01, words: c.words });
      });
    }
    var bankW = V.sorts.bank ? Math.min(1, R.peek(R.blank('bank')) / 200) : 0;
    var ev = EVID.test(p.raw), so = SOCIAL.test(p.raw), W = [0.6, 0.25, 0.15], best = null, aw = p.allq.split(' ').filter(Boolean);
    var wt = aw.map(function (w) { return R.qw ? R.qw(w) : 1; }), wsum = wt.reduce(function (a, b) { return a + b; }, 0) || 1;
    // how much of the question an item answers: each word by its weight; a word a filter of this reading stands for
    // ("Harvard" read as the campus place) counts half for every item the filter lets through
    // (a place or region read from a name, Harvard or the Islamic Republic, stands for its word better than a topic does: 0.6, 0.45)
    var relC = function (it, c) {
      var inQ = ' ' + (c.ns.q || '') + ' ', facet = (c.ns.tp || []).length || (c.ns.fx || []).length || c.ns.place || c.ns.kind, s0 = 0;
      aw.forEach(function (w, i) { var r = R.rel(it, w); if (facet && inQ.indexOf(' ' + w + ' ') < 0) r = Math.max(r, c.ns.place || (c.ns.fx || []).length ? 0.6 : 0.45); s0 += wt[i] * r; });
      return s0 / wsum;
    };
    cands.forEach(function (c) {
      var list = R.peek(c.ns, true); c.n = list.length; if (!c.n) return;
      var ws = 0; c.q = 0; for (var k = 0; k < 3 && k < list.length; k++) { c.q += W[k] * relC(list[k], c); ws += W[k]; }
      c.q = c.q / ws + 0.03 * Math.log(Math.min(c.n, 8)) / Math.LN2;          // more of the same quality is a little better
      // with no time said, the curated bank answers by default and the last 24 hours answer what is social or recent ("most
      // liked", "on X", "trending"); a question about proof or evidence leans to the bank harder
      c.score = c.q + c.pref + (c.ns.lens === 'bank' ? bankW * (ev ? 0.15 : so ? 0 : 0.08) : (so ? 0.15 : 0)) + (c.ns.lens === here ? 0.02 : 0);
      if (!best || c.score > best.score) best = c;
    });
    if (!best) { if (ns.q && !ns.qm) ns.qm = 'best'; return ns; }
    // A GUESS NEVER HIDES THE ITEM WHOSE OWN HEADLINE SAYS ALL OF IT (29 Oct 2026, ask gate: the Persian headline «شمارش آرای
    // انتخابات اسرائیل به پایان رسید» asked in its own words was read as the Trending story on Israel's election, whose seven
    // items did not hold it, and the story won on its count). When the words find an item carrying every asked word in its
    // headline that the guessed filters leave out, the words win; the guess stays one tap away, below.
    if (!best.words) {
      var shown = {}; R.peek(best.ns, true).forEach(function (it) { shown[it.id] = 1; });
      var whole = null;
      cands.forEach(function (c) {
        if (c.words && c.n && (!whole || c.score > whole.score) && R.peek(c.ns, true).some(function (it) { return !shown[it.id] && R.rel(it, p.allq) >= 0.999; })) whole = c;
      });
      if (whole) best = whole;
    }
    // the filters it read stay one tap away when the words won
    var a0 = cands[0], hot0 = p.hotGuess && a0.ns.hot ? (V.hots || []).filter(function (h) { return h.id === a0.ns.hot; })[0] : null;
    if (best !== a0 && a0.n > 0 && guessed && best.ns.lens === a0.ns.lens) withs.push({ ns: a0.ns, label: T('narrowed to {what}', { what: [].concat((a0.ns.tp || []).map(V.name.topic), (a0.ns.fx || []).map(V.name.focus), a0.ns.place ? [a0.ns.place.indexOf('c:') === 0 ? V.name.country(a0.ns.place.slice(2)) : V.name.place(a0.ns.place)] : [], hot0 && hot0.name ? [hot0.name] : []).join(T(', ')) }), n: a0.n });
    if (best.ns.lens !== here) { o.moved = { from: base || here, to: best.ns.lens }; o.from = best.ns.lens === 'bank' ? T('Found in the bank.') : T('Found in the last 24 hours.'); }
    // the best there is carries under half of what was asked: say so, never pass it off as the answer
    // (29 Oct 2026: a stricter line, "the top item lacks a word carrying 40% of the question", was tried and taken out: it
    // put the note on three answers a person judged right, "tunnels under hospitals" among them)
    var top0 = R.peek(best.ns, true)[0];
    if (top0 && R.rel(top0, p.allq) < 0.5) { o.note = T('Nothing here has all of "{q}".', { q: p.allq.replace(/_/g, ' ') }); o.from = T('The closest:'); }
    return best.ns;
  }
  /* What a question becomes, without putting it on the screen: askIt shows it, and build/ask-test.html runs every question
     of build/ask-cases.json through it before either site is published (29 Oct 2026). */
  function plan(raw, base) {
    var AUTO = null;
    var p = read(raw, base), ns = p.ns, o = { box: raw, left: p.left }, withs = [];
    var cp = function (x) { return JSON.parse(JSON.stringify(x)); };
    // a place named only as who did something ("israel does not ...") narrows nothing it was asked to: when it would hide
    // more than half of what the rest finds, it comes off, and the narrow set stays one tap away (THE CLAIMS). Run again
    // on the other tab's set when nothing here moves the answer there.
    function widen(x) {
      (p.actor || []).forEach(function (a) {
        var wide = JSON.parse(JSON.stringify(x));
        if (a.fx) wide.fx = wide.fx.filter(function (k) { return k !== a.fx; }); else if (a.place) wide.place = '';
        var nN = R.peek(x), nW = R.peek(wide);
        if (nW > 0 && nN < nW * 0.5) { if (nN > 0) withs.push({ ns: x, label: T('only those naming {place}', { place: a.name }), n: nN }); x = wide; }
      });
      return x;
    }
    ns = widen(ns);
    ns = choose(p, ns, base, o, withs);
    // THE WORDS NEVER EMPTY A GOOD ANSWER (29 Oct 2026). Every word had to be in an item; a question in a whole sentence
    // ("proof that the Islamic Republic massacred thousands of Iranians in January") found nothing while the place and the
    // month it named held the very items. Under three found with every word: what the other filters found with the closest
    // first (qm rank) when that is a short list, else any of the words (qm any). The narrow set stays one tap away.
    if (ns.q && (!ns.qm || ns.qm === 'best')) {
      var n0 = R.peek(ns), wq = cp(ns); wq.q = ''; var framed = !isBlank(wq);
      if (n0 < 3) {
        var rk = cp(ns); rk.qm = 'rank'; var nR = framed ? R.peek(rk) : 0;
        var an = cp(ns); an.qm = 'any'; var nA = ns.q.indexOf(' ') > 0 && ns.qm !== 'best' ? R.peek(an) : 0;
        var pick = n0 > 0 && nR > n0 && nR <= 30 ? rk : nA > n0 && (n0 === 0 || nA <= 60) ? an : null;
        if (pick) { if (n0 > 0) withs.push({ ns: ns, label: T('only those with every word'), n: n0 }); ns = pick; }
      }
    }
    if (o.moved) { AUTO = o.moved; delete o.moved; }
    if (p.toBank) AUTO = { from: base || R.lens(), to: 'bank' };          // the next ask reads from the tab the reader chose
    if (p.claim && p.toBank) o.from = T('The bank: the evidence on {claim}.', { claim: FA ? p.claim.tag : p.claim.tag.charAt(0).toLowerCase() + p.claim.tag.slice(1) });
    var n = R.peek(ns);
    if (n) {
      // a thin answer is never the only answer: a set a few words wider that finds five times as much is one tap away
      var qw = String(ns.q || '').split(' ').filter(Boolean), each = qw.length > 1 ? qw.map(function (w) { var x = JSON.parse(JSON.stringify(ns)); x.q = qw.filter(function (y) { return y !== w; }).join(' '); return { label: T('the words "{q}"', { q: w }), ns: x }; }) : [];
      var wider = n <= 3 ? each.concat(drops(ns)).map(function (d) { d.n = R.peek(d.ns); return d; }).filter(function (d) { return d.n >= Math.max(n * 5, 10) && !isBlank(d.ns); }).slice(0, 2).map(function (d) { return { ns: d.ns, let: [d.label], n: d.n }; }) : [];
      o.near = withs.concat(wider).slice(0, 3);
    } else {
      var near = nearest(ns);
      if (near) {
        if (near.best.ns.lens !== ns.lens) AUTO = { from: ns.lens, to: near.best.ns.lens };
        ns = near.best.to ? widen(near.best.ns) : near.best.ns;
        o.note = T('Nothing matched all of it.');
        o.from = near.best.to ? T('Closest: the same in {where}.', { where: near.best.to === 'live' ? T('the last 24 hours') : T('the bank') }) : T('Closest: without {what}.', { what: near.best.let.join(T(' and ')) });
        o.near = withs.concat(near.also).slice(0, 3);
      } else {
        o.note = T('Nothing here matches that yet.');
        o.from = T('Try fewer words, or a place or a topic.');
      }
    }
    return { ns: ns, o: o, auto: AUTO, intent: p.intent, read: p };
  }
  R.askWith(askIt);
  R.askPlan = function (raw, base) { return plan(String(raw || '').trim().slice(0, 200), base || ''); };

  /* ------------------------------------------------------------------ saved filters and things to try, under the box */
  var form = $('ir-ask'), box = $('ir-q'), pop = document.createElement('div');
  pop.className = 'ira-pop'; pop.id = 'ira-pop'; pop.hidden = true; pop.setAttribute('role', 'region'); pop.setAttribute('aria-label', T('Saved filters and things to ask'));
  if (form) form.appendChild(pop);
  var TRY = [T('viral videos about Iran from today'), T('most liked posts on X about the protests'), T('what is trending right now')];
  var armed = -1, armT = 0;
  function drawPop() {
    var v = R.views(), html = '';
    if (v.length) html += '<p class="ira-ph">' + STAR + esc(T('Your saved filters')) + '</p><div class="ira-sv-l">' + v.map(function (x, i) {
      return '<span class="ira-chip"><button type="button" data-ira-v="' + i + '"' + (FA ? ' dir="auto"' : '') + '>' + esc(x.n) + '</button><button type="button" class="ira-chip-x' + (armed === i ? ' is-arm' : '') + '" data-ira-vx="' + i + '" aria-label="' + esc(armed === i ? T('Tap again to forget {name}', { name: x.n }) : T('Forget the view {name}', { name: x.n })) + '">' + (armed === i ? esc(T('Forget?')) : '&times;') + '</button></span>';
    }).join('') + '</div>';
    // the room's own one-tap views (intel.js PRESETS), when the last 24 hours are there to cut
    var ps = Array.isArray(R.presets) && R.preset && R.vocab().live ? R.presets : [];
    if (ps.length) html += '<p class="ira-ph">' + TUNE + esc(T('Ready-made views')) + '</p><div class="ira-try ira-pre">' + ps.map(function (p) { return '<button type="button" data-ira-pre="' + esc(p.key) + '" title="' + esc(p.says || '') + '">' + esc(p.name) + '</button>'; }).join('') + '</div>';
    html += '<p class="ira-ph">' + SPARK + esc(T('Ask in your own words, for example:')) + '</p><div class="ira-try">' + TRY.map(function (s, i) { return '<button type="button" data-ira-try="' + i + '"' + (FA ? ' dir="auto"' : '') + '>' + esc(s) + '</button>'; }).join('') + '</div>';
    if (!v.length) html += '<p class="ira-pn">' + esc(T('After you ask, tap Save this filter to keep it here.')) + '</p>';
    pop.innerHTML = html;
  }
  function showPop() { if (box && box.value.trim()) return; drawPop(); pop.hidden = false; if (box) box.setAttribute('aria-expanded', 'true'); }
  function hidePop() { pop.hidden = true; armed = -1; if (box) box.setAttribute('aria-expanded', 'false'); }
  if (box) {
    box.setAttribute('aria-controls', 'ira-pop'); box.setAttribute('aria-expanded', 'false');
    box.addEventListener('focus', showPop);
    box.addEventListener('click', showPop);
    box.addEventListener('input', function () { if (box.value.trim()) hidePop(); else showPop(); });
    box.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !pop.hidden) { ev.stopPropagation(); hidePop(); } });
  }
  // a tap inside the panel keeps the box's focus from closing it; a tap anywhere else closes it
  pop.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
  document.addEventListener('pointerdown', function (ev) { if (!pop.hidden && form && !form.contains(ev.target)) hidePop(); });
  document.addEventListener('focusin', function (ev) { if (!pop.hidden && form && !form.contains(ev.target)) hidePop(); });
  pop.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    if (b.hasAttribute('data-ira-pre')) { hidePop(); closeCard(); R.preset(b.getAttribute('data-ira-pre')); if (box) box.blur(); return; }
    if (b.hasAttribute('data-ira-try')) { var s = TRY[+b.getAttribute('data-ira-try')]; if (box) box.value = s; askIt(s); if (box) box.blur(); return; }
    if (b.hasAttribute('data-ira-v')) {
      var x = R.views()[+b.getAttribute('data-ira-v')]; if (!x) return;
      hidePop(); C.prev = { st: R.state(), box: box ? box.value : '' };
      R.go(x.q);
      C.q = R.query(); C.note = ''; C.ans = ''; C.near = []; C.left = []; C.saving = false; C.box = x.n;
      C.from = T('Your saved filter "{name}":', { name: x.n });
      draw(); if (box) box.blur();
      return;
    }
    if (b.hasAttribute('data-ira-vx')) {
      var i = +b.getAttribute('data-ira-vx');
      if (armed !== i) { armed = i; drawPop(); clearTimeout(armT); armT = setTimeout(function () { armed = -1; if (!pop.hidden) drawPop(); }, 4000); var f = pop.querySelector('[data-ira-vx="' + i + '"]'); if (f) f.focus(); return; }
      var v = R.views(); v.splice(i, 1); R.setViews(v); viewsChanged(); armed = -1; drawPop();
      if (card && card.isConnected) draw();
    }
  });
  /* ------------------------------------------------------------------ the saved filters on the account (savelists/) */
  var VS = { busy: false, again: false, uid: '', name: null, known: null, t: 0 };
  var GONE = 'ir-views-gone';
  function gone(v) { if (v === undefined) { var g = store(GONE); return Array.isArray(g) ? g.filter(function (x) { return typeof x === 'string'; }) : []; } store(GONE, v.slice(-60)); }
  function newId() { var a = new Uint8Array(12), s = '', abc = 'abcdefghijkmnpqrstuvwxyz23456789'; (window.crypto || window.msCrypto).getRandomValues(a); for (var i = 0; i < a.length; i++) s += abc.charAt(a[i] % abc.length); return s; }
  function lp(cb, tries) { if (window.LP && window.LP.members) { cb(window.LP); return; } if ((tries || 0) > 40) { cb(null); return; } setTimeout(function () { lp(cb, (tries || 0) + 1); }, 200); }
  function who(L) { return L && !L.off && L.members.who ? L.members.who() : null; }
  var LPX = null;
  // Every change to the views, from this box or from the filters panel: a view that had an account copy and is gone now is
  // deleted there too; a new one goes up with the next sync
  function viewsChanged() {
    var ids = {}; R.views().forEach(function (v) { if (v.id) ids[v.id] = 1; });
    var g = gone(); (VS.known || []).forEach(function (id) { if (!ids[id] && g.indexOf(id) < 0) g.push(id); }); gone(g);
    VS.known = Object.keys(ids);
    if (!pop.hidden) drawPop();
    clearTimeout(VS.t); VS.t = setTimeout(function () { sync(false); }, 800);
  }
  VS.known = R.views().filter(function (v) { return v.id; }).map(function (v) { return v.id; });
  if (R.onViews) R.onViews(viewsChanged);
  function filterQ(s) { try { var a = JSON.parse(s); return Array.isArray(a) && a.length === 1 && a[0] && typeof a[0]._filter === 'string' && /^\?[^<>"'`\\]{0,1500}$/.test(a[0]._filter) ? a[0]._filter : null; } catch (e) { return null; } }
  function sync(pull) {
    var L = LPX; if (!L || L.off || !L.members.fb || !who(L)) return;
    if (VS.busy) { VS.again = true; VS.pull = VS.pull || pull; return; }
    VS.busy = true;
    L.members.fb().then(function (S) {
      var u = S.auth && S.auth.currentUser; if (!u) return null;
      var first = VS.uid !== u.uid; VS.uid = u.uid; if (first) VS.name = null;
      var nm = VS.name != null ? Promise.resolve() : S.F.getDoc(S.F.doc(S.db, 'users', u.uid)).then(function (d) { VS.name = d.exists() ? String(d.data().name || '') : ''; });
      return nm.then(function () {
        if (!VS.name) return null;          // no name on the account yet: the filters stay on this device (savelists needs by)
        var get = first || pull ? S.F.getDocs(S.F.query(S.F.collection(S.db, 'savelists'), S.F.where('uid', '==', u.uid), S.F.limit(50))).then(function (snap) { merge(snap.docs, u.uid); }) : Promise.resolve();
        return get.then(function () { return push(S, u); });
      });
    }).catch(function () { /* offline or refused: they stay on this device and go up with the next change */ }).then(function () {
      VS.busy = false;
      if (VS.again) { var p = VS.pull; VS.again = false; VS.pull = false; sync(p); }
    });
  }
  function merge(docs, uid) {
    var v = R.views(), g = gone(), byId = {}, seen = {};
    v.forEach(function (x) { if (x.id) byId[x.id] = x; });
    docs.forEach(function (d) {
      var x = d.data() || {}, q = filterQ(x.items); if (q == null) return;
      seen[d.id] = 1;
      if (g.indexOf(d.id) >= 0) return;
      var at = x.updatedAt && x.updatedAt.toMillis ? x.updatedAt.toMillis() : 0, name = String(x.name || '').slice(0, 32), mine = byId[d.id];
      if (mine) { if (at > (mine.sv || 0) && !mine.dirty) { mine.n = name; mine.q = q; mine.sv = at; mine.uid = uid; } return; }
      var same = v.filter(function (y) { return !y.id && (y.q === q || y.n === name); })[0];
      if (same) { same.id = d.id; same.sv = at; same.uid = uid; same.n = name; same.q = q; return; }
      if (v.length < 12) v.push({ n: name, q: q, id: d.id, sv: at, uid: uid });
    });
    // gone from the account and not changed here: deleted on another device
    v = v.filter(function (x) { return !(x.id && x.sv && !x.dirty && !seen[x.id] && x.uid === uid); });
    gone(g.filter(function (id) { return seen[id]; }));
    R.setViews(v); VS.known = v.filter(function (x) { return x.id; }).map(function (x) { return x.id; });
    if (!pop.hidden) drawPop();
  }
  function push(S, u) {
    var jobs = gone().map(function (id) { return S.F.deleteDoc(S.F.doc(S.db, 'savelists', id)).then(function () { gone(gone().filter(function (x) { return x !== id; })); }, function () { }); });
    var v = R.views(), changed = false;
    v.forEach(function (x) {
      if (x.id && x.sv && !x.dirty && x.uid === u.uid) return;
      if (x.uid && x.uid !== u.uid) return;          // another account's, on a shared computer: never sent up under this one
      var fresh = !x.id || !x.sv; if (!x.id) { x.id = newId(); changed = true; }
      var ref = S.F.doc(S.db, 'savelists', x.id);
      var d = { uid: u.uid, by: VS.name, name: String(x.n || '').replace(/[<>]/g, '').trim().slice(0, 60) || T('My filter'), items: JSON.stringify([{ _filter: String(x.q || '').slice(0, 1500) }]), n: 0, mine: false, shared: false, lang: FA ? 'fa' : 'en', updatedAt: S.F.serverTimestamp() };
      var w = fresh ? S.F.setDoc(ref, Object.assign(d, { createdAt: S.F.serverTimestamp(), views: 0 })) : S.F.updateDoc(ref, d);
      jobs.push(w.then(function () { x.sv = Date.now(); x.uid = u.uid; delete x.dirty; changed = true; }, function () { }));
    });
    if (changed) R.setViews(v);
    return Promise.all(jobs).then(function () { R.setViews(v); VS.known = v.filter(function (x) { return x.id; }).map(function (x) { return x.id; }); });
  }
  lp(function (L) {
    LPX = L && !L.off ? L : null;
    if (!LPX || !LPX.members.sub) return;
    LPX.members.sub(function () { var me = who(LPX); if (me) sync(true); else if (!pop.hidden) drawPop(); });
  });
  root.setAttribute('data-ask', '1');
})();
