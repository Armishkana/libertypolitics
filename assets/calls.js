/* MAKE YOUR CALL: the shared call widget (LPCalls) and the Beat the Markets page (markets/). libertypolitics.com only.
   The plan, the names, the scoring rule and every data contract are ../CALLS.md, the one home; this file points there and
   restates none of it. Looks: build/calls.css (added to the end of site.css). The page: build/calls.py.

   MOUNT   <div class="lpc" data-lpc-tool="midterms" data-lpc-tag="race:mi-senate" data-lpc-n="3"></div> anywhere a page
           loads this script (render.py page() adds it, with markets.js, wherever a body carries data-lpc-tool). The tool's
           markets, most popular first, at most n, then "More calls" for the rest, added below so nothing above moves.
           A tag may be several, comma separated: a market with any of them is drawn; "control+senate" is a market with both.
           data-lpc-h="<title>" gives the mount a heading: the title, the one line, and the way to keep score (signed out:
           Sign in to keep score; signed in: Your record, with the count of new results). A tool's mount shows a question
           once (Polymarket and Kalshi often ask the same one). No market: the mount stays hidden.
   API     LPCalls.mount(el[, opts])    draws (or redraws) a mount; the page hands opts {filter, sort, n, page: true}
           LPCalls.mine(id, o, label)   a calculator's own answer: "Your build says: ..." on that market's card
           LPCalls.inbox()              the unread results (users/<uid>/calls/_inbox) or null; also the event lpc:inbox
           events  lpc:call {id, o, label, tool} on document after a call is saved; lpc:inbox {n, r}; lpc:ready
   NUMBERS Markets from assets/calls.json (this hour), Readers from callstats/<mid> (the hourly job), You from
           users/<uid>/calls/<mid>. A market price never comes from here into a score: the job scores from its own history.
   ODDS    html.mk-off (the one odds switch, markets.js) takes the market prices off; Readers and You stay (calls.css).
   LINKS   every market link goes through LPAff.link() (markets.js), so the affiliate code and rel come from one door.
   SIGNED OUT  the You slot is visibly empty; a tap on an option keeps the pick on this device and opens the site's own
           sign-in panel (community.js, LP.open); once the account exists and is confirmed, the pick is saved.
   NEVER   a browser dialog, an email promise (there is no email provider: CALLS.md, Open items), anything hidden and
           animated in, a price typed by the browser into anything that scores. */
(function () {
  'use strict';
  var D = document, W = window;
  if (W.LPCalls) return;
  var ME = D.currentScript;
  var ROOT = (ME && ME.getAttribute('data-root')) || './';
  var NOW = function () { return Date.now(); };
  var MID_OK = /^[pk]_[A-Za-z0-9._-]{1,100}$/;
  var TOOL_OK = /^[a-z][a-z-]{1,19}$/;      // war-iran, war-ukraine: a tool's name may carry a hyphen
  var PEND_KEY = 'lpc-pend', LIVE_KEY = 'lpc-live';
  var STALE_H = 48;

  // ---------------------------------------------------------------- small helpers
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pct(p) { p = +p || 0; if (p > 0 && p < 0.005) return '<1%'; if (p < 1 && p > 0.995) return '>99%'; return Math.round(p * 100) + '%'; }
  function win(p) { return Math.round(100 * (1 - (+p || 0))); }
  function money(v) { v = +v || 0; return v >= 1e9 ? '$' + (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'K' : '$' + Math.round(v); }
  function midOf(id) { return String(id || '').replace(/:/g, '_'); }
  function day(iso) {
    var t = Date.parse(iso || ''); if (!(t > 0)) return '';
    // A date in another year names its year: "closes Nov 7" on a 2028 market read as this week (31 Oct 2026).
    var o = { month: 'short', day: 'numeric' };
    if (new Date(t).getFullYear() !== new Date(NOW()).getFullYear()) o.year = 'numeric';
    try { return new Date(t).toLocaleDateString('en-US', o); } catch (e) { return ''; }
  }
  function closes(m) {
    var t = Date.parse(m.end || '');
    if (m.st === 'resolved' || m.st === 'closed' || (t > 0 && t <= NOW())) return '';
    if (!(t > 0)) return '';
    var h = (t - NOW()) / 3600000;
    if (h < 24) return 'closes in ' + Math.max(1, Math.round(h)) + ' h';
    return 'closes ' + day(m.end);
  }
  function isShut(m) { var t = Date.parse(m.end || ''); return m.st !== 'open' || (t > 0 && t <= NOW()); }
  function ls(k, v) {
    try { if (v === undefined) return W.localStorage.getItem(k); if (v === null) W.localStorage.removeItem(k); else W.localStorage.setItem(k, v); } catch (e) { }
    return null;
  }
  function fire(name, detail) { try { D.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) { } }
  function track(name, data) { try { if (W.lpTrack) W.lpTrack(name, data); } catch (e) { } }
  function aff() { return W.LPAff || { link: function (u) { return { href: String(u || ''), rel: 'noopener' }; }, note: function () { return ''; }, on: function () { return !D.documentElement.classList.contains('mk-off'); } }; }
  function srcName(m) { return m.src === 'k' ? 'Kalshi' : 'Polymarket'; }
  function yesNo(m) { return m.o.length === 2 && /^yes$/i.test(m.o[0][0]) && /^no$/i.test(m.o[1][0]); }
  function lead(m) {      // the option the Markets number names: Yes on a yes/no market, else the favourite
    if (yesNo(m)) return 0;
    var b = 0; m.o.forEach(function (o, i) { if (+o[1] > +m.o[b][1]) b = i; }); return b;
  }
  // a Firestore REST value, and an SDK value, made plain
  function val(v) {
    if (!v || typeof v !== 'object') return null;
    if ('integerValue' in v) return +v.integerValue;
    if ('doubleValue' in v) return +v.doubleValue;
    if ('booleanValue' in v) return !!v.booleanValue;
    if ('stringValue' in v) return v.stringValue;
    if ('timestampValue' in v) return Date.parse(v.timestampValue);
    if ('nullValue' in v) return null;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
    if ('mapValue' in v) return obj(v.mapValue.fields || {});
    return null;
  }
  function obj(fields) { var o = {}; for (var k in fields) if (Object.prototype.hasOwnProperty.call(fields, k)) o[k] = val(fields[k]); return o; }
  function ms(t) { return t && t.toMillis ? t.toMillis() : (typeof t === 'number' ? t : 0); }

  // ---------------------------------------------------------------- the catalog (assets/calls.json)
  var CAT = null, BY = {};
  var catP = (W.fetch ? W.fetch(ROOT + 'assets/calls.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }) : Promise.resolve(null))
    .then(function (d) {
      if (!d || !Array.isArray(d.m)) return null;
      d.m = d.m.filter(function (m) { return m && m.id && m.q && Array.isArray(m.o) && m.o.length >= 1 && m.o.length <= 80; });      // an option past the 20th is shown but cannot be called (CALLS.md: o is 0..19)
      d.m.forEach(function (m) { BY[m.id] = m; m.mid = midOf(m.id); });
      d.t = Date.parse(d.at || '') || 0;
      d.stale = !(d.t > 0) || NOW() - d.t > STALE_H * 3600000;
      CAT = d;
      return d;
    }, function () { return null; });

  // ---------------------------------------------------------------- accounts (community.js hands LP.members)
  var LP = null, M = null;
  var lpP = new Promise(function (res) {
    var n = 0;
    (function wait() {
      if (W.LP && W.LP.members) { LP = W.LP; M = LP.members; return res(LP); }
      if (++n < 80) setTimeout(wait, 250); else res(null);      // community.js is a module that loads Firebase lazily: 20 s at most
    })();
  });
  function who() { try { return M && !LP.off ? M.who() : null; } catch (e) { return null; } }
  function restUrl(path, extra) {
    var u = M.restDoc(path);
    return extra ? u + (u.indexOf('?') >= 0 ? '&' : '?') + extra : u;
  }

  // the rules that take a call are published: users/-/calls/_live answers 404 then, 403 before (firebase/firestore.rules)
  var LIVE = null;
  var liveP = lpP.then(function (L) {
    if (!L || L.off) return (LIVE = false);
    if (!L.emu && ls(LIVE_KEY) === '1') return (LIVE = true);
    return W.fetch(restUrl('users/-/calls/_live')).then(function (r) {
      LIVE = r.status === 404;
      if (LIVE && !L.emu) ls(LIVE_KEY, '1');
      return LIVE;
    }, function () { return (LIVE = false); });
  });

  // Readers: every callstats document, one public read (the hourly job writes them; no page can)
  var STATS = {};
  var statsP = lpP.then(function (L) {
    if (!L || L.off) return STATS;
    var token = '', pages = 0;
    function next() {
      return W.fetch(restUrl('callstats', 'pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : ''))).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (!j) return STATS;
        (j.documents || []).forEach(function (d) {
          var o = obj(d.fields || {}), id = String(d.name || '').split('/').pop();
          if (MID_OK.test(id) && typeof o.n === 'number' && Array.isArray(o.c)) STATS[id] = { n: o.n, c: o.c.map(function (x) { return +x || 0; }), at: +o.at || 0 };
        });
        token = j.nextPageToken || '';
        return token && ++pages < 10 ? next() : STATS;
      }, function () { return STATS; });
    }
    return next();
  });

  // You: this reader's calls, the record the job keeps, the unread results
  var MINE = {}, MINE_UID = '', PUB = null, INBOX = null, REC = null;
  var mineP = Promise.resolve(MINE);
  function loadMine() {
    mineP = lpP.then(function (L) {
      if (!L || L.off || !who()) { MINE = {}; MINE_UID = ''; PUB = INBOX = REC = null; return MINE; }
      return M.within(25000, M.fb()).then(function (x) {
        var F = x.F, db = x.db, u = M.user();
        if (!u) { MINE = {}; MINE_UID = ''; PUB = INBOX = REC = null; return MINE; }
        return M.within(20000, F.getDocs(F.query(F.collection(db, 'users', u.uid, 'calls'), F.limit(1000)))).then(function (snap) {
          var got = {}; PUB = null; INBOX = null;
          snap.docs.forEach(function (d) {
            var v = d.data() || {};
            if (d.id === '_pub') PUB = { pub: !!v.pub };
            else if (d.id === '_inbox') INBOX = { r: Array.isArray(v.r) ? v.r : [], at: ms(v.at) };
            else if (MID_OK.test(d.id) && typeof v.o === 'number') got[d.id] = { o: v.o, at: ms(v.at) || NOW(), tool: v.tool || '' };
          });
          MINE = got; MINE_UID = u.uid;
          return M.within(15000, F.getDoc(F.doc(db, 'callrec', u.uid))).then(function (s) { REC = s.exists() ? s.data() : null; }, function () { REC = null; });
        }).then(function () {
          fire('lpc:inbox', { n: INBOX ? INBOX.r.length : 0, r: INBOX ? INBOX.r : [] });
          return MINE;
        });
      });
    }).catch(function () { return MINE; });
    return mineP;
  }

  // ---------------------------------------------------------------- picks kept on this device until they can be saved
  function pend() { try { var p = JSON.parse(ls(PEND_KEY) || '{}'); return p && typeof p === 'object' ? p : {}; } catch (e) { return {}; } }
  function setPend(mid, o, tool) {
    var p = pend(); p[mid] = { o: o, tool: tool, t: NOW() };
    var keys = Object.keys(p).sort(function (a, b) { return p[b].t - p[a].t; }).slice(0, 30), q = {};
    keys.forEach(function (k) { if (NOW() - p[k].t < 7 * 86400000) q[k] = p[k]; });
    ls(PEND_KEY, JSON.stringify(q));
  }
  function dropPend(mid) { var p = pend(); delete p[mid]; ls(PEND_KEY, Object.keys(p).length ? JSON.stringify(p) : null); }
  function flushPend() {
    var p = pend(), ids = Object.keys(p);
    if (!ids.length || !who()) return Promise.resolve();
    return catP.then(function () {
      var u = M && M.user && M.user();
      if (!u || !u.emailVerified || !LIVE) return;
      return ids.reduce(function (chain, mid) {
        return chain.then(function () {
          var m = null; for (var k in BY) if (BY[k].mid === mid) m = BY[k];
          if (!m || isShut(m)) { dropPend(mid); return; }
          return save(m, p[mid].o, p[mid].tool).then(function () { dropPend(mid); }, function () { });
        });
      }, Promise.resolve());
    });
  }

  // ---------------------------------------------------------------- what a card says
  var OPEN_OPTS = {}, BUILD = {}, SAY = {};
  function readers(m) {
    var s = STATS[m.mid], my = MINE[m.mid], c, n;
    c = s ? s.c.slice() : [];
    while (c.length < m.o.length) c.push(0);
    n = s ? s.n : 0;
    if (my && (!s || my.at > s.at)) { c[my.o] = (c[my.o] || 0) + 1; n += 1; }      // your own call, before the hourly count has it
    return { n: n, c: c };
  }
  function gap(m) {
    var r = readers(m);
    if (!r.n) return -1;
    var g = 0; m.o.forEach(function (o, i) { g = Math.max(g, Math.abs((r.c[i] || 0) / r.n - (+o[1] || 0))); });
    return g;
  }
  function scored(mid) { var sc = REC && REC.sc; return sc && sc[mid] && typeof sc[mid][1] === 'number' ? sc[mid][1] : null; }
  function spark(d) {
    if (!Array.isArray(d) || d.length < 2) return '';
    var lo = Math.min.apply(null, d), hi = Math.max.apply(null, d), span = Math.max(hi - lo, 0.02);
    var pts = d.map(function (v, i) { return (i * 60 / (d.length - 1)).toFixed(1) + ',' + (16 - ((v - lo) / span) * 14 - 1).toFixed(1); }).join(' ');
    return '<svg class="lpc-sp" viewBox="0 0 60 16" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts + '"/></svg>';
  }
  function youCell(m) {
    var my = MINE[m.mid], p = pend()[m.mid], u = who(), shut = isShut(m);
    if (!u) {
      if (p && m.o[p.o]) return '<div class="lpc-n lpc-n-y is-set"><span class="lpc-k">You</span><b>' + esc(m.o[p.o][0]) + '</b><small>Sign in to keep it</small></div>';
      return '<button type="button" class="lpc-n lpc-n-y" data-lpc-in><span class="lpc-k">You</span><small>Sign in to make your call</small></button>';
    }
    if (!my && p && m.o[p.o]) return '<div class="lpc-n lpc-n-y is-set"><span class="lpc-k">You</span><b>' + esc(m.o[p.o][0]) + '</b><small>Not saved yet</small></div>';
    if (!my || !m.o[my.o]) return '<div class="lpc-n lpc-n-y"><span class="lpc-k">You</span><b>&ndash;</b><small>' + (shut ? 'No call made' : 'Tap your call') + '</small></div>';
    var lab = esc(m.o[my.o][0]);
    if (m.st === 'resolved') {
      var won = my.o === m.win, pts = scored(m.mid);
      return '<div class="lpc-n lpc-n-y is-set ' + (won ? 'is-won' : 'is-lost') + '"><span class="lpc-k">You</span><b>' + lab + '</b><small>' + (won ? 'Right' : 'Missed') + (pts != null ? ' ' + (pts > 0 ? '+' : '') + pts : '') + '</small></div>';
    }
    return '<div class="lpc-n lpc-n-y is-set"><span class="lpc-k">You</span><b>' + lab + '</b><small>' + (shut ? 'Waiting for the result' : (my.saving ? 'Saving' : '+' + win(m.o[my.o][1]) + ' if right')) + '</small></div>';
  }
  function sayLine(m) {
    if (SAY[m.mid]) return SAY[m.mid];
    var my = MINE[m.mid];
    if (m.st === 'resolved') {
      var wl = typeof m.win === 'number' && m.o[m.win] ? esc(m.o[m.win][0]) : 'none of these';
      if (!my) return '<p class="lpc-say">Settled: <b>' + wl + '</b>.</p>';
      var pts = scored(m.mid), won = my.o === m.win;
      return '<p class="lpc-say ' + (won ? 'is-won' : 'is-lost') + '">' + (won ? 'You called it' : 'The market went the other way') + (pts != null ? ': <b>' + (pts > 0 ? '+' : '') + pts + ' points</b>.' : '. Your points are in Your record.') + '</p>';
    }
    if (isShut(m)) return '<p class="lpc-say">Closed. Waiting for the result.</p>';
    if (my && m.o[my.o]) return '<p class="lpc-say">Your call: ' + esc(m.o[my.o][0]) + '. If it comes in: <b>+' + win(m.o[my.o][1]) + ' points</b></p>';
    return '<p class="lpc-say"></p>';
  }
  // A calculator's own answer (LPCalls.mine): "Your build says X" beside the numbers, and one tap makes it the reader's call
  function buildLine(m, b, picked, shut) {
    if (!b || !m.o[b.o]) return '';
    var lab = '<span class="lpc-ml">Your build says <b>' + esc(b.label || m.o[b.o][0]) + '</b></span>';
    if (picked === b.o) return '<p class="lpc-mine is-same">' + lab + '<small>Same as your call</small></p>';
    if (shut || b.o > 19 || !MID_OK.test(m.mid)) return '<p class="lpc-mine">' + lab + '</p>';
    return '<button type="button" class="lpc-mine" data-lpc-o="' + b.o + '">' + lab + '<small>Make it my call</small></button>';
  }
  // A tool's mount may carry a heading (data-lpc-h): its title, the one line, and the way to keep score. Signed out: a
  // button that opens the sign-in panel. Signed in: Your record on Beat the Markets, with the count of new results.
  function head(mt) {
    var h = mt.opts.page ? '' : mt.el.getAttribute('data-lpc-h');
    if (!h) return '';
    var n = INBOX ? INBOX.r.length : 0, act = '';
    if (who()) act = '<a class="lpc-rec" href="' + esc(ROOT + 'markets/#record') + '">Your record' + (n ? ' <b class="lpc-new">' + n + ' new</b>' : '') + '</a>';
    else act = '<button type="button" class="lpc-rec" data-lpc-in>Sign in to keep score</button>';      // the same door as the empty You slot
    return '<div class="lpc-hd"><p class="lpc-h"><b>' + esc(h) + '</b><span>Your read against the betting markets and everyone here.</span></p>' + act + '</div>';
  }
  function card(m) {
    var mk = aff(), r = readers(m), L = lead(m), my = MINE[m.mid], p = pend()[m.mid], shut = isShut(m), resolved = m.st === 'resolved', winIx = typeof m.win === 'number' && m.o[m.win] ? m.win : -1;
    var picked = my ? my.o : (p ? p.o : -1);
    var meta = [srcName(m), money(m.v) + ' traded'];
    var cl = closes(m); if (cl) meta.push(cl);
    var st = resolved ? '<span class="lpc-st is-won">Settled</span>' : (shut ? '<span class="lpc-st">Closed</span>' : '');
    // Readers: the share of callers on the same option the Markets number names, so the two compare at a glance
    var rTop = L;
    if (!yesNo(m) && r.n) { r.c.forEach(function (c, i) { if (c > (r.c[rTop] || 0)) rTop = i; }); }
    var rCell = r.n
      ? '<b>' + pct((r.c[rTop] || 0) / r.n) + '</b><small>' + esc(m.o[rTop][0]) + ' &middot; ' + r.n + (r.n === 1 ? ' call' : ' calls') + '</small>'
      : '<b>&ndash;</b><small>No calls yet</small>';
    var mCell = resolved
      ? (winIx >= 0 ? '<b>' + esc(m.o[winIx][0]) + '</b><small>Won</small>' : '<b>None</b><small>Every option lost</small>')
      : '<b>' + pct(m.o[L][1]) + '</b><small>' + esc(m.o[L][0]) + '</small>' + spark(m.d);
    // the options: up to four, the favourites first on a many-name market, plus the one you called
    var order = m.o.map(function (o, i) { return i; });
    if (!yesNo(m)) order.sort(function (a, b) { return (+m.o[b][1] || 0) - (+m.o[a][1] || 0); });
    var all = OPEN_OPTS[m.mid] || order.length <= 5;
    var show = all ? order : order.slice(0, 4);
    if (!all && picked >= 0 && show.indexOf(picked) < 0) show.push(picked);
    if (!all && winIx >= 0 && show.indexOf(winIx) < 0) show.push(winIx);
    var b = BUILD[m.id];
    var opts = show.map(function (i) {
      var o = m.o[i], w = Math.max(0, Math.min(100, Math.round((+o[1] || 0) * 100)));
      var cls = 'lpc-b' + (i === winIx ? ' is-won' : '');
      return '<button type="button" class="' + cls + '" data-lpc-o="' + i + '" aria-pressed="' + (i === picked ? 'true' : 'false') + '"' + (shut || !MID_OK.test(m.mid) || i > 19 ? ' disabled' : '') + '>'
        + '<span class="lpc-bl">' + esc(o[0]) + '</span><span class="lpc-bp">' + (resolved ? '' : pct(o[1])) + '</span><i class="lpc-bi" style="width:' + (resolved ? 0 : w) + '%"></i></button>';
    }).join('');
    if (!all) opts += '<button type="button" class="lpc-more1" data-lpc-all>Show all ' + order.length + '</button>';
    var l = mk.link(m.u);
    return '<article class="lpc-c" id="m-' + esc(m.mid) + '" data-lpc-c="' + esc(m.mid) + '">'
      + '<p class="lpc-meta">' + st + '<span>' + meta.map(esc).join(' &middot; ') + '</span></p>'
      + '<h3 class="lpc-q">' + esc(m.q) + '</h3>'
      + '<div class="lpc-3"><div class="lpc-n lpc-n-m"><span class="lpc-k">Markets</span>' + mCell + '</div>'
      + '<div class="lpc-n lpc-n-r"><span class="lpc-k">Readers</span>' + rCell + '</div>' + youCell(m) + '</div>'
      + buildLine(m, b, picked, shut)
      + '<div class="lpc-o" role="group" aria-label="Your call">' + opts + '</div>'
      + sayLine(m)
      + '<p class="lpc-src">Market: <a href="' + esc(l.href) + '" target="_blank" rel="' + esc(l.rel) + '">' + srcName(m) + '</a></p>'
      + '</article>';
  }

  // ---------------------------------------------------------------- mounts
  var MOUNTS = [];
  function popular(a, b) { return (+b.v || 0) - (+a.v || 0); }
  function pick(el) {
    var tool = el.getAttribute('data-lpc-tool') || '', tags = (el.getAttribute('data-lpc-tag') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    // "control+senate": a market carrying every one of the joined tags (the Senate's control, not every Senate race)
    var has = function (m, t) { return t.split('+').every(function (x) { return (m.t || []).indexOf(x) >= 0; }); };
    return CAT.m.filter(function (m) {
      if (tool && tool !== 'markets' && (m.tools || []).indexOf(tool) < 0) return false;
      if (tags.length && !tags.some(function (t) { return has(m, t); })) return false;
      return true;
    });
  }
  function rows(mt) {
    var list = mt.opts.filter ? CAT.m.filter(mt.opts.filter) : pick(mt.el);
    if (!mt.opts.page) list = list.filter(function (m) { return m.st !== 'resolved' || MINE[m.mid]; });      // a tool shows what can still be called, and your settled ones
    list.sort(mt.opts.sort || function (a, b) { return (isShut(a) - isShut(b)) || popular(a, b); });
    if (!mt.opts.page) {      // a tool shows a question once: Polymarket and Kalshi often ask the same one (the most traded stays, or the one you called)
      var seen = {}, yours = {}, p = pend(), key = function (m) { return String(m.q).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
      list.forEach(function (m) { if (MINE[m.mid] || p[m.mid]) yours[key(m)] = m.mid; });
      list = list.filter(function (m) {
        var k = key(m);
        if (yours[k] && yours[k] !== m.mid) return false;
        if (seen[k]) return false;
        seen[k] = 1; return true;
      });
    }
    return list;
  }
  function draw(mt) {
    if (!CAT) return;
    var el = mt.el, list = rows(mt), n = mt.opts.n || +el.getAttribute('data-lpc-n') || 3;
    mt.list = list;
    el.style.minHeight = '';
    el.classList.toggle('lpc-stale', !!CAT.stale);
    if (!list.length) {
      if (mt.opts.page) { el.hidden = false; el.innerHTML = '<p class="lpc-none">No market matches. Clear the search, or pick another topic.</p>'; }
      else { el.hidden = true; el.innerHTML = ''; }
      if (mt.opts.onDraw) mt.opts.onDraw(list);
      return;
    }
    el.hidden = false;
    var first = list.slice(0, Math.max(n, mt.keep || 0));
    mt.drawn = first.length; mt.step = mt.opts.page ? n : Math.max(6, Math.min(12, n * 2));
    el.innerHTML = head(mt) + '<div class="lpc-l">' + first.map(card).join('') + '</div>' + moreBar(mt)
      + '<p class="lpc-aff">' + esc(aff().note(list.map(function (m) { return m.u; }))) + '</p>';
    mt.drawn = first.length;
    if (mt.opts.onDraw) mt.opts.onDraw(list);
  }
  // More calls adds the next few below (never the whole of a 600-market tool at once); a tool's mount also offers the page
  function moreBar(mt) {
    var rest = mt.list.length - mt.drawn, tag = (mt.el.getAttribute('data-lpc-tool') || '');
    var all = !mt.opts.page && mt.list.length > (+mt.el.getAttribute('data-lpc-n') || 3)
      ? '<a class="btn btn-line" href="' + esc(ROOT + 'markets/' + (tag && tag !== 'markets' ? '?tool=' + encodeURIComponent(tag) : '')) + '">All ' + mt.list.length + ' on Beat the Markets</a>' : '';
    if (rest <= 0 && !all) return '';
    return '<div class="lpc-more">' + (rest > 0 ? '<button type="button" class="btn btn-line" data-lpc-more>More calls (' + Math.min(rest, mt.step) + ' of ' + rest + ')</button>' : '') + all + '</div>';
  }
  function moreOf(mt, btn) {
    var box = mt.el.querySelector('.lpc-l');
    if (!box || !mt.list) return;
    var add = mt.list.slice(mt.drawn, mt.drawn + mt.step);
    var tmp = D.createElement('div'); tmp.innerHTML = add.map(card).join('');
    while (tmp.firstChild) box.appendChild(tmp.firstChild);
    mt.drawn += add.length; mt.keep = mt.drawn;
    var wrap = btn.closest('.lpc-more');
    var next = add.length ? box.children[box.children.length - add.length] : null;
    if (wrap) { var t2 = D.createElement('div'); t2.innerHTML = moreBar(mt); if (t2.firstChild) wrap.replaceWith(t2.firstChild); else wrap.remove(); }
    if (next) { var b = next.querySelector('button:not(:disabled)'); if (b) { try { b.focus({ preventScroll: true }); } catch (e) { } } }
  }
  function redraw(mid) {
    var m = null; for (var k in BY) if (BY[k].mid === mid) { m = BY[k]; break; }
    if (!m) return;
    [].forEach.call(D.querySelectorAll('[data-lpc-c="' + mid + '"]'), function (c) {
      var had = D.activeElement && c.contains(D.activeElement) ? (D.activeElement.getAttribute('data-lpc-o') || (D.activeElement.hasAttribute('data-lpc-all') ? 'all' : '')) : null;
      var tmp = D.createElement('div'); tmp.innerHTML = card(m);
      c.innerHTML = tmp.firstChild.innerHTML;
      if (had !== null) {
        var f = had === 'all' ? c.querySelector('[data-lpc-o]') : c.querySelector('[data-lpc-o="' + had + '"]');
        if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } }
      }
    });
  }
  function drawAll() { MOUNTS.forEach(draw); }
  function toolOf(el) { var mt = el.closest('.lpc'), t = mt && mt.getAttribute('data-lpc-tool'); return TOOL_OK.test(t || '') ? t : 'markets'; }

  function signIn(opener) {
    if (!LP || !LP.open) return false;
    LP.open('auth', { why: 'Make a free account and every call you make is kept and scored against the markets. It takes one step.',
      whyIn: 'Sign in and your calls are kept and scored against the markets.', opener: opener });
    return true;
  }
  function tell(mid, html) { SAY[mid] = html; redraw(mid); }
  function save(m, o, tool) {
    return M.within(25000, M.fb()).then(function (x) {
      var u = M.user(); if (!u) throw { code: 'lp/signedout' };
      return M.within(20000, x.F.setDoc(x.F.doc(x.db, 'users', u.uid, 'calls', m.mid), { o: o, tool: TOOL_OK.test(tool) ? tool : 'markets', at: x.F.serverTimestamp() }));
    }).then(function () {
      MINE[m.mid] = { o: o, at: NOW(), tool: tool };
      track('call_made', { tool: tool });
      fire('lpc:call', { id: m.id, o: o, label: m.o[o][0], tool: tool });
    });
  }
  function call(btn) {
    var c = btn.closest('[data-lpc-c]'), mid = c && c.getAttribute('data-lpc-c'), o = +btn.getAttribute('data-lpc-o');
    var m = null; for (var k in BY) if (BY[k].mid === mid) { m = BY[k]; break; }
    if (!m || !m.o[o] || isShut(m) || !MID_OK.test(mid)) return;
    var tool = toolOf(btn);
    if (!LP) { tell(mid, '<p class="lpc-say">Accounts are loading. Tap again in a moment.</p>'); return; }
    if (!who()) {
      setPend(mid, o, tool); delete SAY[mid];
      tell(mid, '<p class="lpc-say">Sign in and your call is kept: ' + esc(m.o[o][0]) + '.</p>');
      signIn(btn);
      return;
    }
    if (LIVE === false) {      // the rules that take a call are not published yet: kept on this device, saved once they are (flushPend)
      setPend(mid, o, tool);
      tell(mid, '<p class="lpc-say">Calls open in a few minutes. Yours is kept on this device until then: ' + esc(m.o[o][0]) + '.</p>');
      return;
    }
    var u = M.user && M.user();
    if (u && !u.emailVerified) {
      setPend(mid, o, tool);
      tell(mid, '<p class="lpc-say">Confirm your email (the link is in your inbox) and this call is saved: ' + esc(m.o[o][0]) + '.</p>');
      return;
    }
    var was = MINE[m.mid];
    if (was && was.o === o) return;
    MINE[m.mid] = { o: o, at: NOW(), tool: tool, saving: true };
    delete SAY[mid]; redraw(mid);
    save(m, o, tool).then(function () { dropPend(mid); redraw(mid); }, function (e) {
      if (was) MINE[m.mid] = was; else delete MINE[m.mid];
      if (e && e.code === 'lp/signedout') { setPend(mid, o, tool); signIn(btn); tell(mid, '<p class="lpc-say">Sign in and your call is kept.</p>'); return; }
      tell(mid, '<p class="lpc-say is-bad">' + esc((M.words && M.words(e)) || 'That call did not save. Try again.') + '</p>');
    });
  }
  D.addEventListener('click', function (ev) {
    var t = ev.target && ev.target.closest ? ev.target : null;
    if (!t || !t.closest('.lpc')) return;
    var b;
    if ((b = t.closest('[data-lpc-o]'))) { call(b); return; }
    if ((b = t.closest('[data-lpc-in]'))) { if (!signIn(b) && b.closest('[data-lpc-c]')) tell(b.closest('[data-lpc-c]').getAttribute('data-lpc-c'), '<p class="lpc-say">Accounts are loading. Try again in a moment.</p>'); return; }
    if ((b = t.closest('[data-lpc-all]'))) { var mid = b.closest('[data-lpc-c]').getAttribute('data-lpc-c'); OPEN_OPTS[mid] = true; redraw(mid); return; }
    if ((b = t.closest('[data-lpc-more]'))) { var el = b.closest('.lpc'); MOUNTS.forEach(function (mt) { if (mt.el === el) moreOf(mt, b); }); }
  });

  function mount(el, opts) {
    if (!el) return null;
    var mt = null;
    MOUNTS.forEach(function (x) { if (x.el === el) mt = x; });
    if (!mt) { mt = { el: el, opts: {}, keep: 0 }; MOUNTS.push(mt); }
    if (opts) { mt.opts = opts; mt.keep = 0; }
    if (!CAT && !el.innerHTML.trim()) el.style.minHeight = (Math.min(+el.getAttribute('data-lpc-n') || 3, 3) * (W.innerWidth < 700 ? 250 : 90)) + 'px';
    return catP.then(function () {
      if (!CAT) { el.style.minHeight = ''; el.hidden = !(mt.opts && mt.opts.page); if (mt.opts && mt.opts.page) el.innerHTML = '<p class="lpc-none">The markets could not be read just now. Try again in a minute.</p>'; return mt; }
      draw(mt); return mt;
    });
  }

  // ---------------------------------------------------------------- the API
  W.LPCalls = {
    mount: mount,
    refresh: function (el) { MOUNTS.forEach(function (mt) { if (!el || mt.el === el) { mt.keep = 0; draw(mt); } }); },
    mine: function (id, o, label) {
      if (o == null) { delete BUILD[id]; } else BUILD[id] = { o: +o, label: String(label == null ? '' : label) };
      var m = BY[id]; if (m) redraw(m.mid);
    },
    inbox: function () { return INBOX; },
    clearInbox: function () {
      return M.within(20000, M.fb()).then(function (x) { var u = M.user(); if (!u) return; return x.F.deleteDoc(x.F.doc(x.db, 'users', u.uid, 'calls', '_inbox')); })
        .then(function () { INBOX = null; fire('lpc:inbox', { n: 0, r: [] }); });
    },
    // for the page: the catalog, a market's Readers split and gap, this reader's state
    cat: function () { return CAT; }, ready: function () { return catP; }, gap: gap, readers: readers, closed: isShut,
    my: function () { return MINE; }, rec: function () { return REC; }, pub: function () { return PUB; }, uid: function () { return MINE_UID; },
    who: who, lp: function () { return LP; }, signIn: signIn, loaded: function () { return mineP; }, live: function () { return liveP; },
    points: win, pct: pct, esc: esc, obj: obj, restUrl: function (p) { return M ? restUrl(p) : ''; }
  };

  // ---------------------------------------------------------------- start
  [].forEach.call(D.querySelectorAll('.lpc[data-lpc-tool]:not([data-lpc-page])'), function (el) { mount(el); });
  D.addEventListener('lpc:inbox', function () {      // the count of new results in a tool's heading follows the inbox (seen, or new)
    MOUNTS.forEach(function (mt) { var hd = mt.el.querySelector(':scope > .lpc-hd'), h = hd && head(mt); if (h) { var t = D.createElement('div'); t.innerHTML = h; hd.replaceWith(t.firstChild); } });
  });
  lpP.then(function (L) {
    if (!L) return;
    if (M.sub) M.sub(function () { loadMine().then(function () { return flushPend(); }).then(drawAll); });
    Promise.all([catP, statsP, liveP, loadMine()]).then(function () { return flushPend(); }).then(function () { drawAll(); fire('lpc:ready', {}); });
    // Deleting the account deletes the calls: account-ask.js (loaded on every page with accounts) holds that drop hook.
  });
  if (D.getElementById('btm')) page();

  // ================================================================ THE BEAT THE MARKETS PAGE (markets/, build/calls.py)
  function page() {
    var root = D.getElementById('btm'), list = D.getElementById('btm-list'), secAll = D.getElementById('btm-all'), secRec = D.getElementById('btm-rec');
    var q = D.getElementById('btm-q'), sortSel = D.getElementById('btm-sort'), count = D.getElementById('btm-count'), age = D.getElementById('btm-age');
    var tabs = [].slice.call(D.querySelectorAll('[data-btm-tab]')), badge = D.getElementById('btm-badge');
    var params = new URLSearchParams(W.location.search);
    var S = { topic: params.get('t') || 'all', status: params.get('st') === 'closed' ? 'closed' : 'open', sort: params.get('s') || 'popular', q: params.get('q') || '' };
    var pubUid = /^[A-Za-z0-9]{6,40}$/.test(params.get('u') || '') ? params.get('u') : '';
    var onlyTool = /^[a-z][a-z-]{1,19}$/.test(params.get('tool') || '') ? params.get('tool') : '';
    if (q) q.value = S.q;
    if (sortSel && [].some.call(sortSel.options, function (o) { return o.value === S.sort; })) sortSel.value = S.sort; else S.sort = 'popular';

    function keep() {
      var p = new URLSearchParams(W.location.search);
      [['t', S.topic !== 'all' ? S.topic : ''], ['st', S.status === 'closed' ? 'closed' : ''], ['s', S.sort !== 'popular' ? S.sort : ''], ['q', S.q]].forEach(function (kv) { if (kv[1]) p.set(kv[0], kv[1]); else p.delete(kv[0]); });
      var s = p.toString();
      try { W.history.replaceState(null, '', W.location.pathname + (s ? '?' + s : '') + W.location.hash); } catch (e) { }
    }
    function chips() {
      [].forEach.call(D.querySelectorAll('[data-btm-topic]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-btm-topic') === S.topic ? 'true' : 'false'); });
      [].forEach.call(D.querySelectorAll('[data-btm-status]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-btm-status') === S.status ? 'true' : 'false'); });
    }
    var sorts = {
      popular: function (a, b) { return popular(a, b); },
      soon: function (a, b) { var x = Date.parse(a.end || '') || 9e15, y = Date.parse(b.end || '') || 9e15; return (S.status === 'closed' ? y - x : x - y) || popular(a, b); },
      gap: function (a, b) { return (gap(b) - gap(a)) || popular(a, b); }
    };
    function filter(m) {
      if (onlyTool && (m.tools || []).indexOf(onlyTool) < 0) return false;
      if (S.topic !== 'all' && m.topic !== S.topic) return false;
      var shut = isShut(m);
      if (S.status === 'open' ? shut : !shut) return false;
      if (S.q) { var words = S.q.toLowerCase().split(/\s+/).filter(Boolean), hay = (m.q + ' ' + m.o.map(function (o) { return o[0]; }).join(' ')).toLowerCase(); if (!words.every(function (w) { return hay.indexOf(w) >= 0; })) return false; }
      return true;
    }
    function onDraw(rows) {
      if (!count) return;
      count.textContent = rows.length + (rows.length === 1 ? ' market' : ' markets') + (onlyTool ? ' from one tool. ' : '');
      if (onlyTool) { var a = D.createElement('a'); a.href = W.location.pathname; a.textContent = 'Show every market'; count.appendChild(a); }
    }
    var opts = { page: true, n: 24, filter: filter, sort: function (a, b) { return sorts[S.sort](a, b); }, onDraw: onDraw };
    function apply() { chips(); keep(); W.LPCalls.refresh(list); }
    D.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest && ev.target.closest('[data-btm-topic],[data-btm-status],[data-btm-tab]');
      if (!b || !root.contains(b)) return;
      if (b.hasAttribute('data-btm-topic')) { S.topic = b.getAttribute('data-btm-topic'); apply(); }
      else if (b.hasAttribute('data-btm-status')) { S.status = b.getAttribute('data-btm-status'); if (S.sort === 'gap' && S.status === 'closed') S.sort = 'popular'; if (sortSel) sortSel.value = S.sort; apply(); }
      else { ev.preventDefault(); view(b.getAttribute('data-btm-tab'), true); }
    });
    var tq = 0;
    if (q) q.addEventListener('input', function () { clearTimeout(tq); tq = setTimeout(function () { S.q = q.value.trim().slice(0, 80); apply(); }, 120); });
    if (sortSel) sortSel.addEventListener('change', function () { S.sort = sorts[sortSel.value] ? sortSel.value : 'popular'; apply(); });
    chips();
    mount(list, opts).then(function () {
      if (age && CAT) age.textContent = CAT.stale ? 'The market prices are paused: they are more than two days old.' : agoText(CAT.t);
    });
    // the two views: every market, and Your record (markets/#record, or markets/?u=<account> for someone's public record).
    // Switching rewrites the address without a jump; the record/discussion switch of the page keeps its own #record.
    function view(which, user) {
      var rec = which === 'record';
      secAll.hidden = rec; secRec.hidden = !rec;
      tabs.forEach(function (t) { t.setAttribute('aria-current', (t.getAttribute('data-btm-tab') === which) ? 'true' : 'false'); });
      if (user) {
        var p = new URLSearchParams(W.location.search); p.delete('u'); pubUid = '';
        var s = p.toString();
        try { W.history.replaceState(null, '', W.location.pathname + (s ? '?' + s : '') + (rec ? '#record' : '')); } catch (e) { }
      }
      if (rec) record();
    }
    view(pubUid || W.location.hash === '#record' ? 'record' : 'all', false);
    D.addEventListener('lpc:inbox', function (ev) { var n = ev.detail && ev.detail.n || 0; if (badge) { badge.hidden = !n; badge.textContent = n; } if (!secRec.hidden) record(); });
    D.addEventListener('lpc:ready', function () { if (!secRec.hidden) record(); });

    // ---------------------------------------------------------------- Your record
    var recBox = D.getElementById('btm-recbox');
    function agoText(t) {
      var m = Math.max(0, Math.round((NOW() - t) / 60000));
      return m < 2 ? 'Prices this minute' : m < 60 ? 'Prices ' + m + ' min ago' : 'Prices ' + Math.round(m / 60) + ' h ago';
    }
    function sign(n) { n = Math.round(+n || 0); return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); }
    function headline(r) {
      if (!r || !(r.right + r.wrong)) return '<p class="btm-head">No call of yours has settled yet.</p>';
      var b = Math.round(+r.beat || 0);
      return b >= 0 ? '<p class="btm-head">You beat the markets by <b>' + sign(b) + '</b></p>' : '<p class="btm-head is-down">The markets beat you by <b>' + Math.abs(b) + '</b></p>';
    }
    function stats(r, made, open) {
      var cells = [[made, 'Calls made'], [r ? r.right || 0 : 0, 'Right'], [r ? r.wrong || 0 : 0, 'Wrong'], [open, 'Open'], [sign(r ? r.pts || 0 : 0), 'Points won']];
      return '<ul class="btm-stats">' + cells.map(function (c) { return '<li><b class="num">' + esc(c[0]) + '</b><span>' + c[1] + '</span></li>'; }).join('') + '</ul>';
    }
    function best(r) {
      var b = r && Array.isArray(r.best) ? r.best.filter(function (x) { return x && x.q; }) : [];
      if (!b.length) return '';
      return '<div><p class="btm-h3">Best calls</p><ul class="btm-list">' + b.slice(0, 5).map(function (x) {
        return '<li><span class="btm-lq">' + esc(x.q) + '</span><span class="btm-lc">Called ' + esc(x.o) + '</span><b class="btm-lp ' + ((+x.pts || 0) >= 0 ? 'is-up' : 'is-down') + '">' + sign(x.pts) + '</b></li>';
      }).join('') + '</ul></div>';
    }
    function openList() {
      var rows = Object.keys(MINE).map(function (mid) { var m = null; for (var k in BY) if (BY[k].mid === mid) m = BY[k]; return m && !isShut(m) && m.o[MINE[mid].o] ? m : null; }).filter(Boolean)
        .sort(function (a, b) { return (Date.parse(a.end || '') || 9e15) - (Date.parse(b.end || '') || 9e15); });
      if (!rows.length) return '';
      return '<div><p class="btm-h3">Your open calls</p><ul class="btm-list">' + rows.slice(0, 40).map(function (m) {
        var o = MINE[m.mid].o;
        return '<li><span class="btm-lq"><a href="#m-' + esc(m.mid) + '" data-btm-goto="' + esc(m.mid) + '">' + esc(m.q) + '</a></span><span class="btm-lc">Your call: ' + esc(m.o[o][0]) + (closes(m) ? ' &middot; ' + closes(m) : '') + '</span><b class="btm-lp num">+' + win(m.o[o][1]) + '</b></li>';
      }).join('') + '</ul></div>';
    }
    function inboxPart() {
      if (!INBOX || !INBOX.r.length) return '';
      return '<div class="btm-new" role="status"><p class="btm-h3">New results</p><ul class="btm-list">' + INBOX.r.slice(0, 20).map(function (x) {
        return '<li><span class="btm-lq">' + esc(x.q || '') + '</span><span class="btm-lc">' + ((+x.pts || 0) >= 0 ? 'You called it' : 'Missed') + (x.o ? ': ' + esc(x.o) : '') + '</span><b class="btm-lp ' + ((+x.pts || 0) >= 0 ? 'is-up' : 'is-down') + '">' + sign(x.pts) + '</b></li>';
      }).join('') + '</ul><button type="button" class="btn btn-line" data-btm-seen>Got it</button></div>';
    }
    function pubPart() {
      var on = !!(PUB && PUB.pub), url = (W.location.origin || '') + W.location.pathname + '?u=' + encodeURIComponent(MINE_UID);
      var r = REC, b = r && (r.right + r.wrong) ? Math.round(+r.beat || 0) : null;
      var text = b == null ? 'My calls against the betting markets on Liberty Politics. Can you beat them?' : (b >= 0 ? 'I beat the betting markets by ' + sign(b) + ' points on Liberty Politics. Can you?' : 'The betting markets are ahead of me on Liberty Politics. Can you beat them?');
      return '<div class="btm-pub"><button type="button" class="btm-pubsw" data-btm-pub role="switch" aria-checked="' + on + '"><span class="mk-sw-t" aria-hidden="true"><i></i></span><span>Show my record to everyone</span></button>'
        + (on ? '<button type="button" class="btn btn-line" data-share data-url="' + esc(url) + '" data-title="My record: Beat the Markets" data-text="' + esc(text) + '">Share my record</button>' : '')
        + '</div><p class="btm-note" id="btm-pubmsg" role="status">' + (on ? 'Anyone with the link sees your name, your score and your best calls. Never your email.' : 'Private: only you see it. Switch it on to share it.') + '</p>';
    }
    function recordMine() {
      var made = Object.keys(MINE).length, open = Object.keys(MINE).filter(function (mid) { var m = null; for (var k in BY) if (BY[k].mid === mid) m = BY[k]; return m && m.st !== 'resolved'; }).length;
      recBox.innerHTML = inboxPart() + headline(REC) + stats(REC, Math.max(made, REC ? REC.n || 0 : 0), open) + best(REC) + openList()
        + '<p class="btm-note">You\'ll see your results here when each market settles.</p>' + pubPart();
    }
    function recordOut() {
      recBox.innerHTML = '<div class="btm-out"><p class="btm-note">Sign in and every call you make is kept and scored against the markets.</p>'
        + '<button type="button" class="btn btn-key" data-btm-in>Sign in to keep your record</button>'
        + '<p class="btm-note">You\'ll see your results here when each market settles.</p></div>';
    }
    function recordPublic(uid) {
      recBox.innerHTML = '<p class="btm-note">Reading this record.</p>';
      lpP.then(function (L) {
        if (!L) throw 0;
        return W.fetch(restUrl('callrec/' + uid)).then(function (r) { return r.ok ? r.json() : null; });
      }).then(function (d) {
        if (!d || !d.fields) { recBox.innerHTML = '<p class="btm-note">This record is private, or has no calls yet.</p>'; return; }
        var r = obj(d.fields);
        recBox.innerHTML = '<p class="btm-h3">' + esc(r.name || 'A reader') + '\'s record</p>' + headline(r) + stats(r, r.n || 0, r.open || 0) + best(r)
          + '<p class="btm-note">Think you can do better? <a href="./" data-btm-tab="all">Make your own calls</a>.</p>';
      }).catch(function () { recBox.innerHTML = '<p class="btm-note is-bad">This record could not be read just now. Try again in a minute.</p>'; });
    }
    function record() {
      if (!recBox) return;
      if (pubUid && pubUid !== MINE_UID) { recordPublic(pubUid); return; }
      if (!who()) { recordOut(); return; }
      recBox.innerHTML = '<p class="btm-note">Reading your calls.</p>';
      mineP.then(function () { if (!who()) recordOut(); else recordMine(); });
    }
    recBox && recBox.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest && ev.target.closest('button,a');
      if (!b) return;
      if (b.hasAttribute('data-btm-in')) { signIn(b); return; }
      if (b.hasAttribute('data-btm-seen')) { b.disabled = true; W.LPCalls.clearInbox().then(record, function () { b.disabled = false; }); return; }
      if (b.hasAttribute('data-btm-goto')) {
        ev.preventDefault();
        var mid = b.getAttribute('data-btm-goto'), m = null; for (var k in BY) if (BY[k].mid === mid) m = BY[k];
        if (m) { S.topic = 'all'; S.status = 'open'; S.q = ''; if (q) q.value = ''; view('all', true); chips(); keep(); opts.n = 9999; W.LPCalls.refresh(list); opts.n = 24; var c = D.getElementById('m-' + mid); if (c) { c.scrollIntoView({ block: 'center' }); var f = c.querySelector('button'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { } } } }
        return;
      }
      if (b.hasAttribute('data-btm-pub')) {
        var on = b.getAttribute('aria-checked') !== 'true', msg = D.getElementById('btm-pubmsg');
        b.disabled = true;
        M.within(25000, M.fb()).then(function (x) {
          var u = M.user(); if (!u) throw { code: 'lp/signedout' };
          return M.within(20000, x.F.setDoc(x.F.doc(x.db, 'users', u.uid, 'calls', '_pub'), { pub: on, at: x.F.serverTimestamp() }));
        }).then(function () { PUB = { pub: on }; track('record_public', { on: on }); recordMine(); }, function (e) {
          b.disabled = false; if (msg) { msg.className = 'btm-note is-bad'; msg.textContent = (M.words && M.words(e)) || 'That did not save. Try again.'; }
        });
      }
    });
  }
})();
