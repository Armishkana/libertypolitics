/* The Intel Room's creator tools and its show screen (intel/). Loaded by intel.js once the room is ready; everything it
   knows about an item comes from intel.js through window.IRoom.

   Armin, 16 October 2026: a creator who goes live, or makes a video, should be able to plan a show from the room: "only x
   and youtube" for a live show (his rule to his producer, 11 October), the count, the hours, the topics, the platform,
   the type, the length, the category, the order and how credible a source must be, and get back three recommended shows,
   each with a title, a description, a 30-second intro to read and the rundown in order. And one tab to show it all on a
   stream: "Intuitive design is the most important thing." People who do not make shows must never meet any of this
   ("If they come there and see that this seems to be a tool for content creators ... they're going to get confused"), so
   it all sits behind one quiet switch, off by default, and turning it on needs an account (that is how creators are
   found: users/{uid}.creator is set to true, a field the rules already take).

   THE WORDS. Each story's title, description, intro and hook come from data/show-packs.json (build/show_packs.py, every
   hour, from what the feed measured). While they are its templates they are marked "Working title". Those words are never
   a source: every claim in a show is one of the linked items, and a slot nothing in the room fills (the other side, a
   telling silence) says so and links a search instead of inventing an answer.

   THE RUNDOWN, two shapes from the producer's own packs (projects/brand/site/research/kaveh-pack-study-2026-10-16.md):
   the story pack (the report, the subject's own words, the clip, reactions, the other side or the silence, the proof)
   and the ranked roundup (the hour's most liked, each marked on the story or related).

   THE SHOW SCREEN is the same page with ?show= in the address: the room steps aside and one item fills the screen, with
   previous and next, what is next, a counter, the intro card first and libertypolitics.com/intel always on it. Made for
   a 1920x1080 screen share and for a phone. */
(function () {
  'use strict';
  var R = window.IRoom, root = document.getElementById('ir');
  if (!R || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } return v; }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
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
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>'
  };

  /* ---------------------------------------------------------------- what an item is, for planning */
  // The type a creator picks: a text post, an image, a video, an article (a document counts as an article here).
  function typeOf(it) { var k = R.kind(it); return it.k === 'image' ? 'image' : k === 'doc' ? 'article' : k; }
  function pfOf(it) { var p = R.pf(it); return p === 'X' || p === 'YouTube' || p === 'News' ? p : p === 'Web' || p === 'Document' ? 'News' : p; }
  function catOf(it) {
    if (it.cat) return it.cat === 'reaction' ? 'commentary' : it.cat;
    if (it.edu) return 'educational';
    if (it.src === 'News') return 'news';
    if (/\b(explain|explainer|explained|history|how |why |lesson)/i.test(it.t)) return 'educational';
    if (/\b(analysis|breakdown|deep dive|what it means)\b/i.test(it.t)) return 'analysis';
    return it.hot == null ? 'news' : 'commentary';
  }
  // How credible the source is: the table's number (build/intel_live.py and build/intel_x.py), and the bank's checked
  // items count as 70. An item with no number passes only "Any".
  function crOf(it) { return it.cr != null ? it.cr : (it.hot == null && !it.pend ? 70 : null); }
  function durOf(it) { if (it.dur != null) return it.dur; if (/\/shorts\//.test(it.u || '')) return 45; return null; }
  function likes(it) { var r = R.reach(it); return r && r.likes != null ? r.likes : (it.lk != null ? it.lk : null); }
  function engaged(it) { var r = R.reach(it) || {}; var n = (r.likes || it.lk || 0) + 2 * (it.rp || 0) + (r.replies || 0); return n || null; }
  function ageH(it) { var ms = Date.parse(it.d || ''); if (isNaN(ms)) return null; if ((it.d || '').length === 10) ms += 12 * 3600000; return (Date.now() - ms) / 3600000; }

  /* ---------------------------------------------------------------- the plan */
  var KEY = 'ir-creator';
  var DEF = {
    live: { n: 10, win: 24, pf: ['X', 'YouTube'], ty: [], len: '', cat: [], sort: 'hot', cr: 0, tp: [], shape: 'pack' },
    video: { n: 10, win: 48, pf: ['X', 'YouTube', 'News'], ty: [], len: '', cat: [], sort: 'hot', cr: 0, tp: [], shape: 'pack' }
  };
  var OPT = {
    n: [[3, '3'], [10, '10'], [20, '20']],
    win: [[2, '2 h'], [6, '6 h'], [24, '24 h'], [48, '48 h']],
    pf: [['X', 'X'], ['YouTube', 'YouTube'], ['News', 'News']],
    ty: [['post', 'Text posts'], ['image', 'Images'], ['video', 'Videos'], ['article', 'Articles']],
    len: [['', 'Any length'], ['short', 'Under 1 min'], ['mid', '1 to 10 min'], ['long', 'Over 10 min']],
    cat: [['news', 'News'], ['analysis', 'Analysis'], ['commentary', 'Commentary'], ['educational', 'Educational']],
    sort: [['hot', 'Hottest'], ['liked', 'Most liked'], ['engaged', 'Most engaged'], ['credible', 'Most credible'], ['new', 'Newest']],
    cr: [[0, 'Any source'], [50, '50+'], [70, '70+'], [85, '85+']],
    shape: [['pack', 'Story pack'], ['roundup', 'Ranked roundup']]
  };
  var st = store(KEY);
  if (!st || typeof st !== 'object') st = {};
  st = { on: st.on === true, kind: st.kind === 'video' ? 'video' : 'live', plan: { live: Object.assign(copy(DEF.live), (st.plan || {}).live || {}), video: Object.assign(copy(DEF.video), (st.plan || {}).video || {}) } };
  function save() { store(KEY, st); }
  function plan() { return st.plan[st.kind]; }

  function inPlan(it, p) {
    var h = ageH(it);
    if (h == null || h > p.win || h < -1) return false;
    if (p.pf.length && p.pf.indexOf(pfOf(it)) < 0) return false;
    if (p.ty.length && p.ty.indexOf(typeOf(it)) < 0) return false;
    if (p.len) {
      if (typeOf(it) === 'video') { var d = durOf(it); if (d == null) return false; if (p.len === 'short' ? d >= 60 : p.len === 'mid' ? (d < 60 || d > 600) : d <= 600) return false; }
    }
    if (p.cat.length && p.cat.indexOf(catOf(it)) < 0) return false;
    if (p.cr) { var c = crOf(it); if (c == null || c < p.cr) return false; }
    return true;
  }
  function onTopic(it, p) { return !p.tp.length || (it.tp || []).some(function (t) { return p.tp.indexOf(t) >= 0; }); }
  function pool(p) {
    var seen = {};
    return R.live().concat(R.bank()).filter(function (it) { if (seen[it.u]) return false; seen[it.u] = 1; return inPlan(it, p); });
  }
  function score(it, sort) {
    if (sort === 'liked') return likes(it);
    if (sort === 'engaged') return engaged(it);
    if (sort === 'credible') return crOf(it);
    if (sort === 'new') { var h = ageH(it); return h == null ? null : -h; }
    return it.hot != null ? it.hot : it._v != null ? it._v : null;
  }
  function ranked(list, sort) {
    return list.slice().sort(function (a, b) {
      var x = score(a, sort), y = score(b, sort);
      return ((y == null ? -1e12 : y) - (x == null ? -1e12 : x)) || ((b.hot || 0) - (a.hot || 0));
    });
  }

  /* ---------------------------------------------------------------- the stories and the three shows */
  var PACKS = null;
  function storyItems(s) { return s.items.map(function (id) { return R.byId('L' + id); }).filter(Boolean); }
  // When the packs file is missing or from another hour of the feed, the room groups what it has by place and topic, and
  // words each group with the same plain template (the page says "Working title").
  function fallbackStories() {
    var by = {};
    R.live().forEach(function (it) { var k = it.p + '|' + ((it.tp || [])[0] != null ? it.tp[0] : ''); (by[k] = by[k] || []).push(it); });
    return Object.keys(by).map(function (k) {
      var its = by[k].sort(function (a, b) { return (b.hot || 0) - (a.hot || 0); }), lead = its.filter(function (i) { return i.src === 'News'; })[0] || its[0];
      return { id: 'f' + k.replace(/[^a-z0-9]/gi, ''), local: its, lead: lead, hot: lead.hot || 0, tp: (lead.tp || []).slice(0, 3), p: lead.p, kw: '', bank: [], wt: true,
        title: lead.t.length > 90 ? lead.t.slice(0, 88).replace(/\s+\S*$/, '') : lead.t, desc: lead.t + '. On the show: ' + its.length + (its.length === 1 ? ' source' : ' sources') + ', each linked below.',
        intro: 'Welcome in. Here is the story right now: ' + lead.t.replace(/\.$/, '') + '. We are going to go through it source by source, and then I want to know what you make of it. Put it in the chat.',
        hook: lead.t.replace(/\.$/, '') + '. Here is what it shows, and what it does not.' };
    });
  }
  function stories() {
    var fresh = PACKS && PACKS.stories && PACKS.stories.length && PACKS.from && R.liveAt() && Math.abs(Date.parse(PACKS.from) - R.liveAt()) < 3 * 3600000;
    if (!fresh) return fallbackStories();
    return PACKS.stories.map(function (s) { return Object.assign({}, s, { local: storyItems(s), lead: R.byId('L' + s.lead) }); }).filter(function (s) { return s.local.length; });
  }
  function recommend() {
    var p = plan(), P = pool(p), inP = {};
    P.forEach(function (it) { inP[it.id] = 1; });
    var out = [];
    stories().forEach(function (s) {
      var its = s.local.filter(function (it) { return inP[it.id]; });
      if (!its.length) return;
      if (p.tp.length && !(s.tp || []).some(function (t) { return p.tp.indexOf(t) >= 0; }) && !its.some(function (it) { return onTopic(it, p); })) return;
      out.push({ s: s, its: its, sc: (s.hot || 0) * (0.6 + 0.4 * Math.min(1, its.length / 3)) });
    });
    out.sort(function (a, b) { return b.sc - a.sc; });
    return { shows: out.slice(0, 3).map(function (o) { return { s: o.s, run: rundown(o.s, o.its, P, p) }; }), pool: P };
  }
  function nameWords(it) { return String((it.nm || '') + ' ' + (it.h || '')).toLowerCase().replace(/[@_]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 3; }); }
  // A rundown is a list of rows: {role, it} or {role: 'other', search} (the slot nothing in the room fills).
  function rundown(s, its, P, p) {
    var rows = [], used = {}, n = p.n;
    function take(role, it) { if (!it || used[it.id] || rows.length >= n) return; used[it.id] = 1; rows.push({ role: role, it: it, on: true }); }
    var byCr = function (a, b) { return (crOf(b) || 0) - (crOf(a) || 0) || (b.hot || 0) - (a.hot || 0); };
    if (p.shape === 'roundup') {
      var onS = {}; its.forEach(function (it) { onS[it.id] = 1; });
      ranked(P.filter(function (it) { return onTopic(it, p); }), p.sort).slice(0, n).forEach(function (it) {
        rows.push({ role: 'rank', it: it, on: !!onS[it.id] || (it.tp || []).some(function (t) { return (s.tp || []).indexOf(t) >= 0; }) });
      });
      return rows;
    }
    var title = String(s.title || '').toLowerCase();
    take('report', its.filter(function (it) { return typeOf(it) === 'article'; }).sort(byCr)[0] || its.filter(function (it) { return it.src === 'X' && catOf(it) === 'news'; }).sort(byCr)[0]);
    take('own', its.filter(function (it) { return it.src === 'X' && !used[it.id] && nameWords(it).some(function (w) { return title.indexOf(w) >= 0; }); })[0]);
    take('clip', ranked(its.filter(function (it) { return typeOf(it) === 'video' && !used[it.id]; }), 'liked')[0]);
    ranked(its.filter(function (it) { return it.src === 'X' && !used[it.id]; }), p.sort).slice(0, 3).forEach(function (it) { take('reaction', it); });
    ranked(its.filter(function (it) { return !used[it.id]; }), p.sort).forEach(function (it) { take('more', it); });
    if (rows.length < n) rows.push({ role: 'other', search: s.kw || s.title, on: true });
    (s.bank || []).slice(0, 2).forEach(function (id) { if (rows.length < n + 1) { var b = R.byId('B' + id); if (b) take('proof', b); } });
    // the rest of the count: related items in the plan, the same topic or place first
    var rel = P.filter(function (it) { return !used[it.id] && ((it.tp || []).some(function (t) { return (s.tp || []).indexOf(t) >= 0; }) || it.p === s.p) && onTopic(it, p); });
    ranked(rel, p.sort).forEach(function (it) { if (rows.length < n + 1) { used[it.id] = 1; rows.push({ role: 'related', it: it, on: false }); } });
    return rows.slice(0, n + 1);
  }
  var ROLE = { report: 'The report', own: 'In their own words', clip: 'The clip', reaction: 'Reaction', more: 'More on it', other: 'The other side, or the silence',
    proof: 'Background, from the bank', related: 'Related', rank: '' };
  function searchUrl(q) { return 'https://x.com/search?q=' + encodeURIComponent(q) + '&f=live'; }
  function codeOf(it) { return R.code(it); }          // L (the last hours), B (the bank), R (a reader's find)
  function showUrl(sh, i) {
    var parts = sh.run.filter(function (r) { return r.it; }).map(function (r) { return (r.role === 'rank' ? (r.on ? 'on' : 'rel') : r.role) + '~' + codeOf(r.it); });
    return '?show=' + parts.join('.') + '&st=' + encodeURIComponent(sh.s.id) + '&kind=' + st.kind + '&t=' + encodeURIComponent(String(sh.s.title).slice(0, 90)) + (i != null ? '&n=' + (i + 1) : '');
  }

  /* ---------------------------------------------------------------- the switch, and the panel */
  var tools = root.querySelector('.ir-tools');
  if (!tools) return;
  var sw = document.createElement('label');
  sw.className = 'ir-crsw';
  sw.innerHTML = '<input type="checkbox" role="switch" id="ir-crsw"><span><b>Creator tools</b><small>For live shows and videos</small></span>';
  tools.appendChild(sw);
  var panel = document.createElement('section');
  panel.className = 'ir-cr'; panel.id = 'ir-cr'; panel.hidden = true; panel.setAttribute('aria-labelledby', 'ir-cr-h');
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

  function seg(key, multi) {
    var p = plan();
    return '<div class="ir-cr-seg" role="group" aria-label="' + esc(LAB[key]) + '"><span class="ir-cr-l">' + LAB[key] + '</span>' + OPT[key].map(function (o) {
      var on = multi ? p[key].indexOf(o[0]) >= 0 : p[key] === o[0];
      return '<button type="button" data-cr="' + key + '" data-v="' + esc(o[0]) + '" aria-pressed="' + on + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }
  var LAB = { n: 'Items', win: 'From the last', pf: 'Platform', ty: 'Type', len: 'Video length', cat: 'Category', sort: 'Order', cr: 'Credibility', shape: 'Rundown' };
  function list(xs) { return xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]; }
  function summary(p) {
    var bits = [p.n + ' items', 'last ' + p.win + ' h', p.pf.length ? list(p.pf) : 'every platform'];
    if (p.ty.length) bits.push(p.ty.map(function (t) { return OPT.ty.filter(function (o) { return o[0] === t; })[0][1].toLowerCase(); }).join(', '));
    if (p.len) bits.push(OPT.len.filter(function (o) { return o[0] === p.len; })[0][1].toLowerCase());
    if (p.cat.length) bits.push(p.cat.join(', '));
    if (p.cr) bits.push('credibility ' + p.cr + '+');
    if (p.tp.length) bits.push(p.tp.map(function (t) { return R.topics()[t]; }).join(', '));
    bits.push(OPT.sort.filter(function (o) { return o[0] === p.sort; })[0][1].toLowerCase() + ' first');
    return bits.join(' · ');
  }
  var openPlan = false, openRun = {};
  function draw() {
    if (panel.hidden) return;
    var p = plan(), res = recommend(), video = st.kind === 'video', topics = R.topics();
    var tc = {}; res.pool.forEach(function (it) { (it.tp || []).forEach(function (t) { tc[t] = (tc[t] || 0) + 1; }); });
    var tps = Object.keys(tc).map(Number).sort(function (a, b) { return tc[b] - tc[a]; }).concat(p.tp.filter(function (t) { return !tc[t]; }));
    var html = '<div class="ir-cr-h"><h2 id="ir-cr-h">Plan a ' + (video ? 'video' : 'show') + '</h2>' +
      '<div class="ir-cr-kind" role="tablist" aria-label="What you are making"><button type="button" role="tab" data-kind="live" aria-selected="' + !video + '">Live show</button><button type="button" role="tab" data-kind="video" aria-selected="' + video + '">Edited video</button></div></div>' +
      '<div class="ir-cr-plan"><p class="ir-cr-sum"><span>' + esc(summary(p)) + '</span><button type="button" class="ir-cr-adj" data-cr-plan aria-expanded="' + openPlan + '">' + (openPlan ? 'Done' : 'Change') + '</button></p>' +
      '<div class="ir-cr-ctl" id="ir-cr-ctl"' + (openPlan ? '' : ' hidden') + '>' + seg('n') + seg('win') + seg('pf', 1) + seg('ty', 1) + seg('len') + seg('cat', 1) + seg('sort') + seg('cr') + seg('shape') +
      (tps.length ? '<div class="ir-cr-seg ir-cr-tps" role="group" aria-label="Topics"><span class="ir-cr-l">Topics</span>' + tps.map(function (t) { return '<button type="button" data-cr="tp" data-v="' + t + '" aria-pressed="' + (p.tp.indexOf(t) >= 0) + '">' + esc(topics[t]) + (tc[t] ? ' <i>' + tc[t] + '</i>' : '') + '</button>'; }).join('') + '</div>' : '') +
      '<p class="ir-cr-fine">' + res.pool.length + ' items fit this plan. Credibility is the source\'s, from the room\'s own table; a video\'s length is known for posts on X and for Shorts.' + (st.kind === 'live' ? ' Live shows start on X and YouTube only: things you can play on screen.' : '') + ' <button type="button" data-cr-reset>Back to the usual plan</button></p></div></div>';
    if (!res.shows.length) {
      html += '<p class="ir-cr-none">Nothing in the room fits this plan right now. Widen the hours, or let go of a platform or a type.</p>';
    } else {
      html += '<ol class="ir-cr-shows">' + res.shows.map(function (sh, i) { return showCard(sh, i, video); }).join('') + '</ol>';
    }
    panel.innerHTML = html;
    panel._shows = res.shows;
  }
  function showCard(sh, i, video) {
    var s = sh.s, items = sh.run.filter(function (r) { return r.it; }), place = s.lead ? R.where(s.lead) : '';
    var meta = '<span class="ir-cr-hot">' + ICON.flame + '<b class="num">' + (s.hot || 0) + '</b> Hot</span><span>' + items.length + (items.length === 1 ? ' source' : ' sources') + '</span>' + (place && place !== 'No single place' ? '<span>' + esc(place) + '</span>' : '');
    var open = !!openRun[s.id];
    return '<li class="ir-cr-show"><div class="ir-cr-s1"><span class="ir-cr-n num" aria-hidden="true">' + (i + 1) + '</span><div class="ir-cr-st">' +
      (s.wt ? '<span class="ir-cr-wt">Working title</span>' : '') + '<h3>' + esc(s.title) + '</h3><p class="ir-cr-m">' + meta + '</p></div></div>' +
      '<p class="ir-cr-d">' + esc(s.desc) + '</p>' +
      '<div class="ir-cr-act"><a class="ir-cr-go" href="' + esc(showUrl(sh)) + '" target="_blank" rel="noopener">' + ICON.play + '<span>Open the show screen</span></a>' +
      '<button type="button" class="ir-cr-b" data-run="' + esc(s.id) + '" aria-expanded="' + open + '">' + (open ? 'Hide the rundown' : 'The intro and rundown') + '</button>' +
      '<button type="button" class="ir-cr-b" data-copy="' + i + '">' + ICON.copy + '<span>Copy all</span></button></div>' +
      (open ? runHtml(sh, video) : '') + '</li>';
  }
  function rowMeta(it) {
    var r = R.reach(it), bits = [R.when(it), it.h || it.src];
    if (r && r.likes != null) bits.push(r.likes.toLocaleString('en-US') + ' likes');
    else if (it.lk != null) bits.push(it.lk.toLocaleString('en-US') + ' likes');
    if (crOf(it) != null) bits.push('credibility ' + crOf(it));
    return bits.filter(Boolean).join(' · ');
  }
  function runHtml(sh, video) {
    var s = sh.s, n = 0;
    return '<div class="ir-cr-run"><div class="ir-cr-intro"><p class="ir-cr-il">' + (video ? 'Your opening hook' : 'Your 30-second intro') + '<small>Read it out to open</small></p><p class="ir-cr-it">' + esc(video ? s.hook : s.intro) + '</p></div>' +
      '<ol class="ir-cr-rows">' + sh.run.map(function (r) {
        if (!r.it) return '<li class="ir-cr-row is-gap"><span class="ir-cr-role">' + ROLE.other + '</span><span class="ir-cr-rt">Nothing in the room shows it yet. <a href="' + esc(searchUrl(r.search)) + '" target="_blank" rel="noopener">' + ICON.search + 'Search X for it</a></span></li>';
        n++;
        var role = r.role === 'rank' ? (r.on ? 'On the story' : 'Related') : ROLE[r.role];
        return '<li class="ir-cr-row' + (r.on ? '' : ' is-rel') + '"><span class="ir-cr-role"><b class="num">' + n + '</b>' + esc(role) + '</span>' + R.mark(it(r)) +
          '<span class="ir-cr-rt"><a href="' + esc(r.it.u) + '" target="_blank" rel="noopener">' + esc(r.it.t) + '</a><small>' + esc(rowMeta(r.it)) + '</small></span></li>';
      }).join('') + '</ol></div>';
  }
  function it(r) { return r.it; }
  function asText(sh) {
    var s = sh.s, video = st.kind === 'video', n = 0;
    return [s.title, '', s.desc, '', (video ? 'Opening hook: ' : 'Intro (30 seconds): ') + (video ? s.hook : s.intro), '', 'Rundown:'].concat(sh.run.map(function (r) {
      if (!r.it) return '-  ' + ROLE.other + ': nothing in the room yet. Search: ' + searchUrl(r.search);
      n++;
      return n + '. ' + (r.role === 'rank' ? (r.on ? '[on the story] ' : '[related] ') : '[' + ROLE[r.role] + '] ') + r.it.t + '\n   ' + rowMeta(r.it) + '\n   ' + r.it.u;
    })).concat(['', 'Show screen: ' + location.origin + location.pathname + showUrl(sh)]).join('\n');
  }
  function copyText(t, done, fail) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fail); else fail();
  }
  panel.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var p = plan();
    if (b.hasAttribute('data-kind')) { st.kind = b.getAttribute('data-kind'); save(); draw(); return; }
    if (b.hasAttribute('data-cr-plan')) { openPlan = !openPlan; draw(); return; }
    if (b.hasAttribute('data-cr-reset')) { st.plan[st.kind] = copy(DEF[st.kind]); save(); draw(); return; }
    if (b.hasAttribute('data-run')) { var id = b.getAttribute('data-run'); openRun[id] = !openRun[id]; draw(); return; }
    if (b.hasAttribute('data-copy')) {
      var sh = panel._shows[+b.getAttribute('data-copy')]; if (!sh) return;
      copyText(asText(sh), function () { b.querySelector('span').textContent = 'Copied'; setTimeout(function () { var s2 = b.querySelector('span'); if (s2) s2.textContent = 'Copy all'; }, 2200); },
        function () { b.querySelector('span').textContent = 'Copying is blocked here'; });
      return;
    }
    var k = b.getAttribute('data-cr'); if (!k) return;
    var raw = b.getAttribute('data-v'), v = typeof DEF.live[k] === 'number' || k === 'tp' ? +raw : raw;
    if (Array.isArray(p[k])) { var at = p[k].indexOf(v); if (at >= 0) p[k].splice(at, 1); else p[k].push(v); }
    else p[k] = v;
    save(); draw();
  });
  if (st.on) setOn(true);

  /* ---------------------------------------------------------------- the show screen (?show=) */
  var q = new URLSearchParams(location.search);
  function loadPacks() {
    var u = root.getAttribute('data-packs');
    return u ? fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }) : Promise.resolve(null);
  }
  loadPacks().then(function (d) {
    PACKS = d && Array.isArray(d.stories) ? d : null;
    if (q.get('show')) showScreen(); else draw();
  });

  function showScreen() {
    var codes = String(q.get('show') || '').split('.').filter(Boolean).slice(0, 40);
    var rows = codes.map(function (c) { var m = /^([a-z]+)~(.+)$/.exec(c); if (!m) return null; var x = R.byId(m[2]); return x ? { role: m[1], it: x } : null; }).filter(Boolean);
    var story = null, sid = q.get('st') || '';
    if (PACKS) PACKS.stories.forEach(function (s) { if (s.id === sid) story = s; });
    var video = q.get('kind') === 'video';
    var title = (story && story.title) || q.get('t') || 'The Intel Room';
    var intro = story ? (video ? story.hook : story.intro) : '';
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
        el.innerHTML = '<div class="ir-sh-open"><p class="ir-sh-k">' + (video ? 'Today\'s video' : 'On the show today') + '</p><h1>' + esc(title) + '</h1>' + (desc ? '<p class="ir-sh-d">' + esc(firstSentence(desc)) + '</p>' : '') +
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
