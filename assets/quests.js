/* The mission board: the chooser, "your mission", start, report back, the rank and the counts.

   ONE FILE FOR EVERY SITE THAT HAS A BOARD (libertypolitics.com/act/ and the Iran site). Nothing in it belongs
   to one site: the missions, the levels and every word of the board are printed by the site's own build, and
   this file reads them from the page. A site's render.py must print the markup below; the reference is act()
   and q_card() in libertypolitics' build/render.py, and the words are that site's data/missions.json.

   THE PAGE WORKS WITH THIS FILE MISSING. Every mission is a native <details>, so the board reads and opens
   with scripts off. Parts only this file can run carry the class "q-js" and are shown only when the page's
   own inline script has set "q-js-on" on <html> (so nothing jumps in after the page is drawn).

   ---------------------------------------------------------------- WHAT THE PAGE MUST CARRY (the contract)

   1. The board
      <section id="quests" data-q-board> ... </section>            one per page. No board, and this file does nothing.

   2. The data, inside the page
      <script type="application/json" id="quests-data">{
        "about":  "quest:",                     what a report is filed under: about = "quest:" + mission id
        "store":  "lp-quests",                  the name this device keeps the reader's choices under
        "levels": [{"xp":0,"name":"..."}, ...], lowest first
        "time":   ["5m","1h","weekly"],         the time ids, shortest first
        "missions": [{"id","tier":"main|quest|side","chain"?, "stage"?, "title","time","who":[ids],"can":[ids],
                      "where":"state|any","xp":N,"until"?:"YYYY-MM-DD","proof":"link|words|none","ask":"...","report":true,
                      "repeat"?:true|"each"}]
      }</script>
      "repeat" (optional, added 13 October 2026): the mission can be reported again after it was accepted. The database
      takes one accepted report a reader a mission a week, so Report again is offered seven days after the last one.
      "repeat": "each" (added 15 October 2026, the Intel Room missions): every accepted report pays, at most ten a reader a
      mission a day (quests.EACH_PER_DAY in build/quests.py judges it). The card is never stuck at accepted: its button reads
      "Send another" at once, and no "again in N days" line is drawn.
      Order matters: when two missions fit a reader equally, the one printed first wins.

   3. One card per mission, anywhere inside the board
      <details data-q-m="<id>" id="<id>" data-tier data-time data-who="a b" data-can="a b" data-where data-xp
               [data-chain data-stage] [data-q-until]>          (never "data-until": site.js writes a countdown into those)
        <summary> ... <b class="q-title">title</b> ...
          <span data-q="done" hidden></span>        "12 done", from xp/_board
          <span data-q="state" hidden></span>       the reader's own state of this mission
        </summary>
        <div class="q-body">
          <p class="q-hook">one line</p> ... steps, proof, links ...
          <a href="..." data-q-st="../vote/{st}/" data-q-ok="al ak ...">   a link that has a page per state: once
               the reader picks a state in data-q-ok, its address becomes data-q-st with {st} filled in
          <div data-q-act></div>                    Start and Report back are put here
        </div>
      </details>
      The card's id IS the mission id: act/#<id> opens that mission. Wrap a card in <li>; the <li> is what is hidden
      when a mission is not for this reader. A group of cards sits in [data-q-tier]; it hides when it is empty.

   4. The chooser (all optional; a row that is missing is simply not asked)
      <div data-q-row="who|time|can" [data-q-many]>                 data-q-many: more than one chip may be on
        <button type="button" data-q-chip="who:citizen" aria-pressed="false">...</button> ...
      </div>
      <select data-q-where><option value="">...</option><option value="tx">...</option></select>
      ?have=<time id> in the address chooses the time (the front page's chips link to it).
      WHO DECIDES WHAT IS SHOWN: once a reader says who they are, a mission whose "who" leaves them out is hidden
      from the whole board. Nothing chosen: every mission is listed, as the build printed it.

   5. Places this file fills (each optional)
      [data-q-slot="best"]    the best match, as one big card (a copy of the card, class q-big)
      [data-q-slot="also"]    two more that fit
      [data-q="yours-h"]      the heading over them: "Start here" until something is chosen, then "Your mission"
      #q-mine [hidden] with [data-q-slot="mine"]     the reader's own missions and what became of each
      #q-rank with [data-q="level"], [data-q="xp"], [data-q="bar"] (holds one <i>), [data-q="next"]
      [data-q-chain="<chain>"] with .q-dots (one <i> per stage) and [data-q="chain-n"]
      #q-top [hidden] with [data-q-slot="top"]       the leaderboard, drawn only when there are three names
      [data-q="none"]         one line when no mission is left for this reader

   ---------------------------------------------------------------- ADDED 14 OCTOBER 2026 (all optional)
   The page became "Missions": a journey in three acts, one next mission, the chooser one tap away, and a rank with a
   drawing. Every part below is optional: a page that prints none of it works exactly as before.

   6. In the data
      "path": ["<id>", ...]      the order a new reader is led through. While no chip is chosen, the missions offered
                                 are the first ones on the path that are still open to the reader; the rest follow by fit.
      "open": {"<name>": {"tx": "2026-10-05", ...}}      a table of last days by state (lower-case letters)
      a mission's "open": "<name>"      the mission is on the board only while the day of the reader's state in that table
                                 has not passed. No state chosen: the card is shown, [data-q-need] inside it is shown
                                 (the build's own words and a state picker), and Start and Report back are not offered.
                                 A state that the table does not hold, or whose day has passed: the mission is hidden.
      a mission's "in": ["us", "world"]      where it works. See the "in" row below. Left out: everywhere.
      a mission's "hook", "timeName", "modeName"      one line each, used only by [data-q-slot="next"]
      a level's "line"           one plain line that says what the rank means ([data-q="level-line"])
      "proof": "either"          the report form offers the link field and does not require it
      a mission's "confirm": true      the report form carries one box under the link ("Everyone shown in my post said
                                 yes ..."); a report with a link is not sent until it is ticked. A report with no link is.
      "rows": {"who": [ids], "in": [ids], "time": [ids], "can": [ids]}      the ids of the chooser's rows, for a page that
                                 carries the data and no chooser: what a reader chose on the board still decides what
                                 that page shows them (someone who said they are not a citizen is never offered a
                                 mission that leaves them out, on any page)
      "tier" is any word now (join, intel, gather, lead): only "main" still gets its small lead in fit()
      a mission's "auto": "account" | "questions" | "profile" | "post" | "reply" | "warroom"      (14 October 2026, evening;
                                 post and reply 15 October; warroom 15 October: a live post or reply of the reader's own in
                                 the War Room's discussion, page:build) it ticks itself from the reader's
                                 own account (build/members.js tells this file through window.LPMembers and "lp:members"):
                                 no Start, no report, one button to do it, and [data-q-tick] inside the card gets
                                 data-q-tick-on once done. Its XP is never claimed here: build/quests.py grants it.

   7. On the page
      <div data-q-row="in">      one more row of the chooser, one chip at a time ("in:us", "in:world"). Once chosen, a
                                 mission whose "in" leaves that place out is hidden, exactly as "who" hides.
      ?in=<id>                   chooses it for this visit only (it is never kept on the device), so a link from a page about
                                 another country opens the missions that work anywhere without changing a reader's own choice.
      [data-q-in="<id>"]         shown only while that place is chosen (a line that says what is being shown)
      <button data-q-in-set="">  sets the place ("" clears it) and keeps it
      select[data-q-where]       there may be several now (one in the chooser, one in a card that needs the state): they
                                 are kept alike. A copy of a card carries its own.
      [data-q-need]              inside a card whose mission has "open": see above
      [data-q-slot="next"]       ONE LINK to the reader's next mission, drawn from the data alone, so it works on a page
                                 that prints no cards (the front page). data-q-href on it is the address of the page that
                                 holds the cards; the link goes to <that>#<mission id>. The build prints the link a new
                                 reader gets, and it is replaced only when this reader's next mission is another one.
      [data-q-slot="best"] with no [data-q-slot="also"]      holds ONE card, the next mission, and nothing else
      [data-q-lv="<n>"]          inside #q-rank: a drawing for level n (0 is the lowest). Only the reader's own is shown.
      [data-q="level-line"]      inside #q-rank: the "line" of the reader's level
      [data-q-count="<tier>"]    "2 of 8 done" for the missions of that tier that this reader is shown
      A card whose summary already holds .q-hook-s is copied as it is (the hook is not added a second time).
      A page with no card and no [data-q-slot="top"] does not ask the database for xp/_board.

   8. Added the same day, second pass (all optional)
      Inside a [data-q-tier]: <ul data-q-top="3"> and <details data-q-more> holding <ul data-q-rest> and, in its summary,
      [data-q-rest-n]. Every <li> of the two lists carries data-q-i (its place in the act as printed). The top list then
      holds THIS reader's next N missions of the act, in printed order: shown to them, not reported and waiting, not
      accepted for good, of a chain only the stage they are on, and never the one already offered in [data-q-slot="best"]
      (which counts as one of its act's N: it is on show already, at the top of the page).
      Everything else goes back into the fold, in printed order; [data-q-rest-n] says how many it holds that the reader
      can see, and the fold is hidden when that is none. A card that is open is never moved. With this file missing the
      lists stay as printed. An address with a mission in it (#id) opens the fold that holds it.
      [data-q-rk="<n>"] anywhere: data-q-rk-is is set to "on" on the reader's rank, "next" on the one after, "" on the
      rest (the page's stylesheet decides what each looks like; as printed, rank 0 is on and rank 1 is next).

   ---------------------------------------------------------------- WHAT IS KEPT, AND WHERE

   On the device (localStorage; sessionStorage on a site that sets LPSITE.safety, so nothing outlives the visit):
   the chips chosen, the missions started, a report not yet sent. Never an account, never the id of a post.
   Choices never decide which side of the page an address opens.

   In the database (read only here; firestore.rules decides, and the tools in LIVING.md write):
     xp/{uid}   { xp, name, updatedAt, reports: { <postId>: {state:'accepted'|'back', xp, why, mission, at} }, grants: [...] }
     xp/_board  { done: {<missionId>: n}, top: [{name, xp}], updatedAt }
   A missing document is zero XP and no counts, never an error on the page.
   A REPORT is a post like any other, in the same posts collection, with about "quest:<mission id>" and the tag
   "report" (kind opinion with no link, link or video with one). community.js writes it (window.LP.quests.report).

   ---------------------------------------------------------------- WORDS

   Every sentence a reader sees from this file goes through tt('English sentence'), the same function and the
   same table community.js uses (window.LPSITE.strings). A site in another language adds each key to its table.
   A person's words (a name on the leaderboard, the reason a report came back) reach the page as text, never as markup. */

const D = document, H = D.documentElement;
const BOARD = D.querySelector('[data-q-board]');
const SITE = (window.LPSITE && typeof window.LPSITE === 'object') ? window.LPSITE : {};
/* What community.js hands over: the words, the signed-in reader, sending a report, and one public document by
   its address. On a page built with no accounts there is none of it, and the board still chooses and starts. */
const K = (window.LP && window.LP.quests) || null;
const STR = SITE.strings || null, DIGITS = typeof SITE.digits === 'string' && SITE.digits.length === 10 ? SITE.digits : '';
const dig = K ? K.dig : n => (DIGITS ? String(n).replace(/[0-9]/g, d => DIGITS[d]) : String(n));
const tt = K ? K.tt : (s, v) => {
  let out = STR && typeof STR[s] === 'string' ? STR[s] : s;
  if (v) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in v ? (typeof v[k] === 'number' ? dig(v[k]) : String(v[k])) : m));
  return out;
};
function el(tag, cls, text, attrs) {
  const e = D.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
const DATA = (() => { try { return JSON.parse(D.getElementById('quests-data').textContent); } catch (x) { return null; } })();

if (BOARD && DATA && Array.isArray(DATA.missions)) { try { run(); } catch (x) { /* the board as the build printed it is still there */ } }

function run() {
  const MS = DATA.missions.filter(m => m && typeof m.id === 'string' && /^[a-z0-9][a-z0-9-]{1,59}$/.test(m.id));
  const BY = new Map(MS.map(m => [m.id, m]));
  /* How many kinds of reader the most open mission on this board is for (fit() weighs a mission against it). It is
     not the number of who chips: on the Iran site no mission is for all five, because none is shared with readers inside Iran. */
  const WIDEST = Math.max(1, ...MS.map(m => (Array.isArray(m.who) ? m.who.length : 0)));
  const TIMES =Array.isArray(DATA.time) ? DATA.time : [];
  const LEVELS = (Array.isArray(DATA.levels) ? DATA.levels : []).filter(l => l && typeof l.xp === 'number' && typeof l.name === 'string').sort((a, b) => a.xp - b.xp);
  const MAXLEN = (K && K.max) || 600;
  const today = (() => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })();
  const q = (sel, root) => (root || D).querySelector(sel), qa = (sel, root) => [...(root || D).querySelectorAll(sel)];
  const cardsOf = id => qa('[data-q-m="' + id + '"]');
  const ROWS = {};
  qa('[data-q-row]').forEach(r => { ROWS[r.getAttribute('data-q-row')] = { box: r, many: r.hasAttribute('data-q-many'), ids: qa('[data-q-chip]', r).map(c => c.getAttribute('data-q-chip').split(':')[1]) }; });
  const wheres = () => qa('select[data-q-where]');
  /* The table a mission's "open" names: last days by state. */
  const OPEN = DATA.open && typeof DATA.open === 'object' ? DATA.open : {};
  const PATH = Array.isArray(DATA.path) ? DATA.path.filter(id => typeof id === 'string') : [];

  /* ---------------------------------------------------------------- what this device keeps */
  const KEEP = (() => { try { const s = SITE.safety ? window.sessionStorage : window.localStorage; s.getItem('x'); return s; } catch (x) { return null; } })();
  const NAME = typeof DATA.store === 'string' && DATA.store ? DATA.store : 'lp-quests';
  /* The ids of a row of the chooser: from the page, or, on a page that carries the data and no chooser, from the data
     ("rows"). What a reader chose on the board then still decides what that page offers them. */
  const idsOf = row => (ROWS[row] ? ROWS[row].ids : (DATA.rows && Array.isArray(DATA.rows[row]) ? DATA.rows[row] : []));
  const ST = { pick: { who: '', time: '', can: [], where: '', in: '' }, m: {} };
  /* The place chosen by the address (?in=) holds for this visit only and is never written to the device. */
  let visitIn = '';
  const placeNow = () => visitIn || ST.pick.in;
  (() => {
    let v = null;
    try { v = KEEP ? JSON.parse(KEEP.getItem(NAME)) : null; } catch (x) { v = null; }
    if (!v || typeof v !== 'object') return;
    const p = v.pick && typeof v.pick === 'object' ? v.pick : {};
    const one = (row, val) => (typeof val === 'string' && idsOf(row).includes(val) ? val : '');
    ST.pick.who = one('who', p.who); ST.pick.time = one('time', p.time); ST.pick.in = one('in', p.in);
    ST.pick.can = Array.isArray(p.can) ? p.can.filter(c => one('can', c)) : [];
    ST.pick.where = typeof p.where === 'string' && /^[a-z]{2}$/.test(p.where) ? p.where : '';
    const m = v.m && typeof v.m === 'object' ? v.m : {};
    for (const id in m) {
      const r = m[id];
      if (!BY.has(id) || !r || typeof r !== 'object') continue;
      ST.m[id] = { s: r.s === 'reported' ? 'reported' : r.s === 'started' ? 'started' : '', at: typeof r.at === 'number' ? r.at : 0,
        text: typeof r.text === 'string' ? r.text.slice(0, MAXLEN) : '', url: typeof r.url === 'string' ? r.url.slice(0, 400) : '' };
    }
  })();
  const save = () => { try { if (KEEP) KEEP.setItem(NAME, JSON.stringify(ST)); } catch (x) { } };
  const rec = id => ST.m[id] || (ST.m[id] = { s: '', at: 0, text: '', url: '' });

  /* ?have=1h : the front page's chips. Chosen, kept, and taken out of the address so a shared link is clean. */
  try {
    const u = new URL(location.href), have = u.searchParams.get('have');
    const inn = u.searchParams.get('in');
    if (have != null || inn != null) {
      if (have != null && idsOf('time').includes(have)) { ST.pick.time = have; save(); }
      if (inn != null && idsOf('in').includes(inn) && !ST.pick.in) visitIn = inn;
      u.searchParams.delete('have'); u.searchParams.delete('in');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    }
  } catch (x) { }

  /* ---------------------------------------------------------------- what the database says */
  let XP = { xp: 0, reports: {} }, TOP = { done: {}, top: [] }, MINE = [];
  const who = () => { try { return K && K.who ? K.who() : null; } catch (x) { return null; } };
  /* The newest verdict on each mission, from the reader's own xp document. */
  /* For each mission: the newest verdict (state, xp, why, at), and n, sum and last: how many of its reports were
     accepted, the XP they earned together, and when the newest of those was accepted. */
  function verdicts() {
    const out = {}, r = XP.reports && typeof XP.reports === 'object' ? XP.reports : {};
    for (const pid in r) {
      const v = r[pid];
      if (!v || typeof v !== 'object' || !BY.has(v.mission) || (v.state !== 'accepted' && v.state !== 'back')) continue;
      const at = typeof v.at === 'number' ? v.at : 0, xp = typeof v.xp === 'number' ? Math.max(0, Math.floor(v.xp)) : 0;
      const o = out[v.mission] || (out[v.mission] = { state: '', xp: 0, why: '', at: -1, n: 0, sum: 0, last: 0 });
      if (v.state === 'accepted') { o.n++; o.sum += xp; if (at > o.last) o.last = at; }
      if (at >= o.at) { o.state = v.state; o.xp = xp; o.why = typeof v.why === 'string' ? v.why.slice(0, 300) : ''; o.at = at; }
    }
    return out;
  }
  let VER = {};
  const WEEK = 7 * 86400000;
  /* ADDED 14 OCTOBER 2026, evening: a mission whose data carries "auto": "account" | "questions" | "profile" ticks itself
     from the reader's own account (made, both questions answered, a picture and one line on the profile). build/members.js
     says which through window.LPMembers.state() and the event "lp:members". Such a mission has no Start, no report and
     no XP claimed from this page: build/quests.py grants its XP from what build/people.py reads. With members.js missing,
     the account is still known (signed in) and the other two simply wait. */
  /* post and reply (15 October 2026): a live post of the reader's own that starts a thread, and one that answers somebody */
  /* warroom (15 October 2026): a live post or reply of the reader's own in the War Room's discussion (members.js reads it) */
  const AUTO_KINDS = ['account', 'questions', 'profile', 'post', 'reply', 'warroom'];
  let AUTO = { account: false, questions: false, profile: false, post: false, reply: false, warroom: false };
  /* the card says it too (data-q-auto, printed by missions.py): either one is enough */
  MS.forEach(m => { if (!m.auto) { const c = D.getElementById(m.id), a = c && c.getAttribute('data-q-auto'); if (AUTO_KINDS.includes(a)) m.auto = a; } });
  try { if (window.LPMembers && window.LPMembers.state) AUTO = Object.assign(AUTO, window.LPMembers.state()); } catch (x) { }
  const autoDone = m => !!(m && m.auto && (m.auto === 'account' ? (AUTO.account || !!who()) : AUTO[m.auto]));
  /* '' | started | reported | back | accepted. A mission that may be done again ("repeat") goes back to reported or
     back when a later report is waiting or was turned down; one that may not stays accepted for good. */
  function status(id) {
    const m = BY.get(id), v = VER[id], l = ST.m[id], judged = new Set(Object.keys(XP.reports || {}));
    if (m && m.auto) return autoDone(m) ? 'accepted' : '';
    const waiting = MINE.some(p => p.mission === id && !judged.has(p.id)) || !!(l && l.s === 'reported' && l.at > (v ? v.at : 0));
    if (v && v.n && !m.repeat) return 'accepted';
    if (waiting) return 'reported';
    if (v && v.state === 'back') return 'back';
    if (v && v.n) return 'accepted';
    return l && l.s === 'started' ? 'started' : '';
  }
  /* Accepted, may be done again, and the week since the last accepted report is up. A mission that pays each time
     ("repeat": "each") may be sent again at once: the ten a day are judged by build/quests.py, never counted here. */
  const each = m => !!(m && m.repeat === 'each');
  const again = id => { const m = BY.get(id), v = VER[id]; return !!(m.repeat && v && v.n && status(id) === 'accepted' && (each(m) || Date.now() - v.last >= WEEK)); };
  const daysLeft = id => { const v = VER[id]; return v && !each(BY.get(id)) ? Math.max(1, Math.ceil((v.last + WEEK - Date.now()) / 86400000)) : 0; };
  /* A report written and not sent: it is kept on this device, and the card must say so. */
  const draft = id => !!(ST.m[id] && ST.m[id].text && ST.m[id].text.trim());
  const expired = m => typeof m.until === 'string' && m.until < today;
  /* A mission that is only open while a day of the reader's state has not passed ("open": the name of a table in the
     data). 'ask': no state chosen yet, the card says so. 'no': the table does not hold the state, or its day has passed. */
  const gate = m => {
    if (typeof m.open !== 'string' || !m.open) return 'yes';
    const t = OPEN[m.open], st = ST.pick.where;
    if (!st) return 'ask';
    return t && typeof t[st] === 'string' && t[st] >= today ? 'yes' : 'no';
  };
  const shown = m => !expired(m) && (!ST.pick.who || !Array.isArray(m.who) || m.who.includes(ST.pick.who))
    && (!placeNow() || !Array.isArray(m.in) || m.in.includes(placeNow())) && gate(m) !== 'no';

  /* ---------------------------------------------------------------- which mission is yours */
  function fit(m, i) {
    const P = ST.pick, ti = TIMES.indexOf(m.time), pi = TIMES.indexOf(P.time), can = Array.isArray(m.can) ? m.can : [];
    let s = -i * 0.01;                                                    /* printed first wins a tie */
    if (pi >= 0) s += ti === pi ? 40 : ti < pi ? 10 : -40;
    else s += (TIMES.length - 1 - ti) * 5;                                /* nothing chosen: the shortest first */
    if (P.can.length) { const n = can.filter(c => P.can.includes(c)).length; s += can.length ? (n ? 20 + 5 * n : -15) : 8; }
    /* A reader who has not said who they are is offered the missions most readers can do: a mission loses up to 25,
       by how few kinds of reader it is for beside the most open mission on the board. (Until 14 October 2026 it lost
       a flat 25 for being for fewer than every chip, which on the Iran site was every mission alike, so its board
       opened on the one that ends soonest: the voting mission, which is for citizens alone.) */
    if (!P.who && Array.isArray(m.who) && ROWS.who) s -= 25 * (1 - Math.min(m.who.length, WIDEST) / WIDEST);
    if (m.until) s += 12;                                                 /* it ends */
    if (m.tier === 'main') s += 6 + (pi >= 0 && pi === TIMES.length - 1 ? 20 : 0);
    if (status(m.id) === 'started' || status(m.id) === 'back') s += 30;   /* yours already */
    return s;
  }
  function picks() {
    const open = new Set(), stageNow = {};
    MS.forEach(m => {
      const st = status(m.id);
      if (!shown(m) || st === 'reported' || (st === 'accepted' && !again(m.id))) return;
      if (m.chain) { if (stageNow[m.chain] != null && stageNow[m.chain] <= m.stage) return; stageNow[m.chain] = m.stage; }
      open.add(m.id);
    });
    /* of a chain, only the stage the reader is on */
    const list = MS.map((m, i) => ({ m, i })).filter(x => open.has(x.m.id) && (!x.m.chain || stageNow[x.m.chain] === x.m.stage));
    const byFit = list.map(x => ({ id: x.m.id, s: fit(x.m, x.i) })).sort((a, b) => b.s - a.s).map(x => x.id);
    /* Nothing chosen: the path leads. A mission the reader has started, or that came back, still comes first. */
    if (PATH.length && !(ST.pick.who || ST.pick.time || ST.pick.can.length)) {
      const mine = byFit.filter(id => { const st = status(id); return st === 'started' || st === 'back'; });
      const onPath = PATH.filter(id => byFit.includes(id) && !mine.includes(id) && gate(BY.get(id)) === 'yes');
      const rest = byFit.filter(id => !mine.includes(id) && !onPath.includes(id));
      return mine.concat(onPath, rest).slice(0, 3);
    }
    return byFit.slice(0, 3);
  }

  /* ---------------------------------------------------------------- drawing */
  const LABEL = {
    started: () => tt('Started'),
    reported: () => tt('Report sent. Waiting.'),
    back: () => tt('Sent back'),
    accepted: id => { if (BY.get(id) && BY.get(id).auto) return tt('Done'); const v = VER[id]; return v && v.n > 1 ? tt('Accepted {times} times. +{n} XP', { times: v.n, n: v.sum }) : tt('Accepted. +{n} XP', { n: (v && v.sum) || BY.get(id).xp }); },
    draft: () => tt('Report not sent')
  };
  function buildAct(card, id) {
    const box = q('[data-q-act]', card);
    if (!box || box._q) return box;
    box.textContent = '';
    const row = el('div', 'q-btns');
    const start = el('button', 'btn btn-key', tt('Start mission'), { type: 'button', 'data-q-start': '' });
    const report = el('button', 'btn btn-line', tt('Report back'), { type: 'button', 'data-q-report': '' });
    const drop = el('button', 'q-text', tt('Stop this mission'), { type: 'button', 'data-q-drop': '' });
    row.append(start, report, drop);
    const say = el('p', 'q-say', '', { role: 'status', 'aria-live': 'polite' });
    box.append(row, say);
    box._q = { start, report, drop, say, form: null };
    return box;
  }
  function paintCard(card, id) {
    const m = BY.get(id), st = status(id), v = VER[id];
    card.setAttribute('data-q-status', st);
    const done = q('[data-q="done"]', card), n = TOP.done && typeof TOP.done[id] === 'number' ? Math.max(0, Math.floor(TOP.done[id])) : 0;
    if (done) { done.hidden = !n; done.textContent = n ? tt('{n} done', { n }) : ''; }
    const kept = draft(id), more = again(id), mark = q('[data-q="state"]', card), tag = st || (kept ? 'draft' : '');
    if (mark) { mark.hidden = !tag; mark.textContent = tag ? LABEL[tag](id) : ''; mark.className = 'q-state' + (tag ? ' q-s-' + tag : ''); }
    const box = buildAct(card, id);
    if (!box) return;
    const B = box._q, can = m.report !== false, formOpen = !!(B.form && !B.form.hidden), ask = gate(m) === 'ask';
    if (m.auto) { paintAuto(card, m, B, st === 'accepted'); return; }
    const need = q('[data-q-need]', card); if (need) need.hidden = !ask;
    B.start.hidden = st !== '' || kept || ask;
    B.drop.hidden = st !== 'started';
    B.report.hidden = formOpen || !can || (st === 'accepted' && !more) || (ask && !st && !kept);
    B.report.textContent = kept ? tt('Finish your report') : each(m) && (more || st === 'reported') ? tt('Send another') : st === 'back' || more ? tt('Report again') : st === 'reported' ? tt('Send another report') : tt('Report back');
    B.report.className = 'btn ' + (st === 'started' || st === 'back' || kept ? 'btn-key' : 'btn-line');
    if (!B.say.hasAttribute('data-q-keep')) {
      let line = st === 'accepted' ? LABEL.accepted(id) + '.' + (v && v.why && v.state === 'accepted' ? ' ' + v.why : '')
        : st === 'back' ? (v && v.why ? tt('Sent back: {why}', { why: v.why }) : tt('Sent back. Read what counts as proof, then report again.'))
        : st === 'reported' ? tt('Report sent. I read every report. XP lands when it is accepted.')
        : st === 'started' ? tt('Started. Come back and report when it is done.') : '';
      if (st === 'accepted' && m.repeat && !each(m)) { const d = daysLeft(id); line += ' ' + (more ? tt('You can report it again now.') : d === 1 ? tt('You can report it again tomorrow.') : tt('You can report it again in {n} days.', { n: d })); }
      if (kept) line = (line ? line + ' ' : '') + tt('Your report is kept on this device. It has not been sent.');
      B.say.textContent = line; B.say.classList.remove('bad');
    }
  }
  /* A mission that ticks itself: no Start and no report. One way to do it while it is not done, a tick once it is. */
  const AUTO_HOW = {
    account: () => tt('Create your account and this ticks itself.'),
    questions: () => tt('Answer the two questions and this ticks itself.'),
    profile: () => tt('Add a picture and one line about you on your profile, and this ticks itself.'),
    post: () => tt('Post your take in any discussion, and this ticks itself.'),
    reply: () => tt('Reply to another member in any discussion, and this ticks itself.'),
    warroom: () => tt('Post one idea in the War Room, or answer one, and this ticks itself.')
  };
  function paintAuto(card, m, B, done) {
    B.start.hidden = B.report.hidden = B.drop.hidden = true;
    qa('[data-q-tick]', card).forEach(t => { if (done) t.setAttribute('data-q-tick-on', ''); else t.removeAttribute('data-q-tick-on'); });
    if (!B.auto) {
      const me = () => who();
      const L = window.LP && window.LP.open ? window.LP : null;
      const talk = m.auto === 'post' || m.auto === 'reply';
      /* the War Room is Liberty Politics' warroom/ (build/room.py); its discussion is page:build */
      const go = m.auto === 'warroom'
        ? el('a', 'btn btn-key', tt('Open the War Room'), { href: (H.getAttribute('data-root') || './') + (typeof SITE.base === 'string' ? SITE.base : '') + 'warroom/#discussion', 'data-q-auto-go': '' })
        : talk
        ? el('a', 'btn btn-key', tt('Open the discussion'), { href: (H.getAttribute('data-root') || './') + (typeof SITE.base === 'string' ? SITE.base : '') + '#discussion', 'data-q-auto-go': '' })
        : m.auto === 'profile'
        ? el('a', 'btn btn-key', tt('Open your profile'), { href: '#', 'data-q-auto-go': '' })
        : el('button', 'btn btn-key', m.auto === 'account' ? tt('Create your account') : tt('Answer them now'), { type: 'button', 'data-q-auto-go': '' });
      go.addEventListener('click', ev => {
        const u = me();
        if (!u) { ev.preventDefault(); if (L) L.open('auth', { opener: go }); return; }
        if (m.auto === 'questions') { ev.preventDefault(); if (window.LPMembers && window.LPMembers.ask) window.LPMembers.ask(); }
        if (m.auto === 'profile') go.setAttribute('href', (H.getAttribute('data-root') || './') + (typeof SITE.base === 'string' ? SITE.base : '') + 'member/?u=' + encodeURIComponent(u.uid) + '#edit');
      });
      B.say.before(go);
      B.auto = go;
    }
    B.auto.hidden = done;
    B.say.removeAttribute('data-q-keep'); B.say.classList.remove('bad');
    B.say.textContent = done ? tt('Done. It ticked itself.') : AUTO_HOW[m.auto] ? AUTO_HOW[m.auto]() : '';
  }
  function paintAll() {
    VER = verdicts();
    MS.forEach(m => {
      const on = shown(m);
      cardsOf(m.id).forEach(c => { paintCard(c, m.id); const li = c.closest('[data-q-board] li'); if (li && !c.closest('[data-q-slot]')) li.hidden = !on; });
    });
    qa('[data-q-tier]', BOARD).forEach(t => { t.hidden = !qa('[data-q-m]', t).some(c => { const li = c.closest('li'); return !(li && li.hidden); }); });
    const none = q('[data-q="none"]', BOARD);
    if (none) { const any = MS.some(shown); none.hidden = any; none.textContent = any ? '' : tt('No mission on this board fits yet. Tell me in the discussion which one is missing.'); }
    qa('[data-q-count]').forEach(e => {
      const ms = MS.filter(m => m.tier === e.getAttribute('data-q-count') && shown(m));
      e.textContent = ms.length ? tt('{n} of {all} done', { n: ms.filter(m => (m.auto ? autoDone(m) : VER[m.id] && VER[m.id].n)).length, all: ms.length }) : '';
    });
    qa('[data-q-in]').forEach(e => { e.hidden = e.getAttribute('data-q-in') !== placeNow(); });
    paintPicks(); paintFolds(); paintNext(); paintMine(); paintRank(); paintChains(); paintLinks();
  }
  /* Each act: this reader's next N missions on show, the rest behind its one fold (section 8 above). */
  function paintFolds() {
    const offered = (() => { const c = q('[data-q-slot="best"] [data-q-m]'); return c ? c.getAttribute('data-q-m') : ''; })();
    qa('[data-q-tier]', BOARD).forEach(t => {
      const top = q('[data-q-top]', t), more = q('[data-q-more]', t), rest = more && q('[data-q-rest]', more);
      if (!top || !rest) return;
      const N = Math.max(0, parseInt(top.getAttribute('data-q-top'), 10) || 3);
      const lis = qa('li[data-q-i]', t).filter(li => li.parentNode === top || li.parentNode === rest)
        .sort((a, b) => (+a.getAttribute('data-q-i')) - (+b.getAttribute('data-q-i')));
      const stageNow = {};
      lis.forEach(li => { const c = q('[data-q-m]', li), m = c && BY.get(c.getAttribute('data-q-m'));
        if (m && m.chain && status(m.id) !== 'accepted' && (stageNow[m.chain] == null || m.stage < stageNow[m.chain])) stageNow[m.chain] = m.stage; });
      const next = id => { const m = BY.get(id), st = status(id);
        if (!m || id === offered || !shown(m) || st === 'reported' || (st === 'accepted' && !again(id))) return false;
        return !m.chain || stageNow[m.chain] === m.stage; };
      /* the mission offered at the top of the page is one of the act's three, shown there and not twice */
      let n = lis.some(li => { const c = q('[data-q-m]', li); return c && c.getAttribute('data-q-m') === offered; }) ? 1 : 0;
      const want = lis.filter(li => { const c = q('[data-q-m]', li); if (c && c.open) return li.parentNode === top; if (n < N && c && next(c.getAttribute('data-q-m'))) { n++; return true; } return false; });
      lis.forEach(li => { const into = want.includes(li) ? top : rest; const c = q('[data-q-m]', li); if (c && c.open) return; into.appendChild(li); });
      const left = qa('li[data-q-i]', rest).filter(li => !li.hidden).length, cnt = q('[data-q-rest-n]', more);
      if (cnt) cnt.textContent = dig(left);
      more.hidden = !left;
    });
  }
  /* The reader's mission and two more: copies of the cards, so they open in place and work like the originals. */
  let lastPicks = '';
  function paintPicks() {
    const best = q('[data-q-slot="best"]'), also = q('[data-q-slot="also"]');
    if (!best) return;
    const ids = also ? picks() : picks().slice(0, 1), key = ids.join(' ');
    const chosen = !!(ST.pick.who || ST.pick.time || ST.pick.can.length);
    const h = q('[data-q="yours-h"]');
    if (h) h.textContent = !ids.length ? tt('Nothing left for you here') : chosen || ids.some(i => status(i)) ? tt('Your mission') : tt('Start here');
    const sec = best.closest('section');
    const repaint = () => qa('[data-q-slot] [data-q-m]').forEach(c => paintCard(c, c.getAttribute('data-q-m')));
    if (key === lastPicks) { repaint(); return; }
    /* a copy with a report open in it is not thrown away under the reader's hands (signing in changes what fits) */
    if (qa('[data-q-slot] form.q-form').some(f => !f.hidden)) { repaint(); return; }
    lastPicks = key;
    const copy = (id, big) => {
      const src = D.getElementById(id);
      if (!src) return null;
      const c = src.cloneNode(true);
      c.removeAttribute('id'); c.open = false;
      c.classList.add(big ? 'q-big' : 'q-small');
      const act = q('[data-q-act]', c); if (act) act.textContent = '';
      const hook = q('.q-hook', c), t = q('.q-title', c);
      if (hook && t && !q('.q-hook-s', c)) t.after(el('span', 'q-hook-s', hook.textContent));
      /* closed, the big card says how to get in; the words are drawn from this attribute (site.css, .q-big summary::before) */
      /* a mission that ticks itself has nothing to open: no label, its tick is on the card ([data-q-tick]) */
      const sm = q('summary', c); if (big && sm && !(BY.get(id) && BY.get(id).auto)) sm.setAttribute('data-q-go', tt('Open mission'));
      paintCard(c, id);
      return c;
    };
    best.textContent = ''; if (also) also.textContent = '';
    ids.forEach((id, n) => { const c = copy(id, n === 0); if (c) (n === 0 || !also ? best : also).append(c); });
    if (also && ids.length > 1) also.prepend(el('p', 'q-also-h', tt('Also fits you')));
    if (sec) sec.classList.toggle('q-empty', !ids.length);
  }
  /* One link to the reader's next mission, from the data alone: for a page that prints no cards (the front page). */
  let lastNext = null;
  function paintNext() {
    const slot = q('[data-q-slot="next"]');
    if (!slot) return;
    const id = picks()[0] || '', m = id && BY.get(id);
    if (lastNext === null) { const a = q('a[data-q-next]', slot); lastNext = a ? a.getAttribute('data-q-next') : ''; }
    if (!m || id === lastNext) return;
    lastNext = id;
    const a = el('a', 'q-next', null, { href: (slot.getAttribute('data-q-href') || '') + '#' + id, 'data-q-next': id });
    const t = el('span', 'q-next-t');
    t.append(el('b', null, m.title));
    if (typeof m.hook === 'string' && m.hook) t.append(el('span', 'q-next-h', m.hook));
    const meta = el('span', 'q-meta');
    if (typeof m.timeName === 'string' && m.timeName) meta.append(el('span', 'q-time', m.timeName));
    meta.append(el('span', 'q-xp num', tt('{n} XP', { n: m.xp })));
    if (typeof m.modeName === 'string' && m.modeName) meta.append(el('span', 'q-mode', m.modeName));
    t.append(meta); a.append(t);
    slot.textContent = ''; slot.append(a);
  }
  function paintMine() {
    const sec = D.getElementById('q-mine'), list = q('[data-q-slot="mine"]');
    if (!sec || !list) return;
    const order = { draft: 0, back: 1, started: 2, reported: 3, accepted: 4 };
    const rows = MS.filter(m => shown(m) && !m.auto).map(m => ({ m, st: status(m.id) || (draft(m.id) ? 'draft' : '') }))      /* a mission that ticks itself is not a report: it is not listed here */.filter(x => x.st).sort((a, b) => order[a.st] - order[b.st]);
    sec.hidden = !rows.length;
    list.textContent = '';
    rows.forEach(({ m, st }) => {
      const li = el('li', 'q-mine-r q-s-' + st), a = el('a', 'q-mine-a', null, { href: '#' + m.id, 'data-q-open': m.id }), v = VER[m.id];
      a.append(el('b', null, m.title), el('span', 'q-state q-s-' + st, LABEL[st](m.id)));
      li.append(a);
      if (st === 'back' && v && v.why) li.append(el('p', 'q-mine-why', v.why));
      list.append(li);
    });
  }
  function paintRank() {
    const box = D.getElementById('q-rank');
    if (!box || !LEVELS.length) return;
    const xp = typeof XP.xp === 'number' && XP.xp > 0 ? Math.floor(XP.xp) : 0;
    let i = 0; LEVELS.forEach((l, n) => { if (xp >= l.xp) i = n; });
    const cur = LEVELS[i], next = LEVELS[i + 1] || null, set = (k, t) => { const e = q('[data-q="' + k + '"]', box); if (e) e.textContent = t; return e; };
    set('level', cur.name); set('xp', tt('{n} XP', { n: xp }));
    const line = next ? tt('{n} XP to {level}', { n: next.xp - xp, level: next.name }) : tt('The top level');
    set('next', line);
    const bar = q('[data-q="bar"]', box), fill = bar && q('i', bar);
    if (fill) fill.style.width = (next ? Math.max(0, Math.min(100, 100 * (xp - cur.xp) / (next.xp - cur.xp))) : 100).toFixed(1) + '%';
    if (bar) bar.setAttribute('aria-label', line);
    qa('[data-q-lv]', box).forEach(e => { e.hidden = e.getAttribute('data-q-lv') !== String(i); });
    if (typeof cur.line === 'string') set('level-line', cur.line);
    qa('[data-q-rk]').forEach(e => { const n = +e.getAttribute('data-q-rk'); e.setAttribute('data-q-rk-is', n === i ? 'on' : n === i + 1 ? 'next' : ''); });
  }
  function paintChains() {
    qa('[data-q-chain]').forEach(box => {
      const name = box.getAttribute('data-q-chain'), stages = MS.filter(m => m.chain === name).sort((a, b) => a.stage - b.stage);
      const dots = qa('.q-dots i', box), n = stages.filter(m => status(m.id) === 'accepted').length;
      stages.forEach((m, k) => { if (dots[k]) { const st = status(m.id); dots[k].className = st === 'accepted' ? 'on' : st ? 'now' : ''; } });
      const t = q('[data-q="chain-n"]', box); if (t) t.textContent = tt('{n} of {all} done', { n, all: stages.length });
    });
  }
  /* A link that has a page for each state leads to the reader's own once they have said where they live. */
  function paintLinks() {
    const st = ST.pick.where;
    qa('a[data-q-st]').forEach(a => {
      if (!a.hasAttribute('data-q-href')) a.setAttribute('data-q-href', a.getAttribute('href'));
      const ok = st && (' ' + (a.getAttribute('data-q-ok') || '') + ' ').includes(' ' + st + ' ');
      a.setAttribute('href', ok ? a.getAttribute('data-q-st').replace('{st}', st) : a.getAttribute('data-q-href'));
    });
  }
  function paintChooser() {
    for (const row in ROWS) qa('[data-q-chip]', ROWS[row].box).forEach(c => {
      const id = c.getAttribute('data-q-chip').split(':')[1], on = ROWS[row].many ? ST.pick[row].includes(id) : (row === 'in' ? placeNow() : ST.pick[row]) === id;
      c.setAttribute('aria-pressed', String(on));
    });
    wheres().forEach(w => { if ([...w.options].some(o => o.value === ST.pick.where)) w.value = ST.pick.where; });
  }
  function paintTop() {
    const sec = D.getElementById('q-top'), list = q('[data-q-slot="top"]');
    if (!sec || !list) return;
    const rows = (Array.isArray(TOP.top) ? TOP.top : []).filter(r => r && typeof r.name === 'string' && r.name.trim() && typeof r.xp === 'number' && r.xp > 0)
      .sort((a, b) => b.xp - a.xp).slice(0, 10);
    sec.hidden = rows.length < 3;
    list.textContent = '';
    if (rows.length < 3) return;
    rows.forEach(r => {
      const li = el('li'), lv = LEVELS.filter(l => r.xp >= l.xp).pop();
      li.append(el('b', null, r.name.trim().slice(0, 40), { dir: 'auto' }), el('span', 'q-top-l', lv ? lv.name : ''), el('span', 'q-top-x num', tt('{n} XP', { n: Math.floor(r.xp) })));
      list.append(li);
    });
  }

  /* ---------------------------------------------------------------- the report */
  let uid = 0;
  function openForm(card, id) {
    const box = buildAct(card, id), B = box && box._q, m = BY.get(id);
    if (!B) return;
    if (!B.form) {
      const f = el('form', 'q-form', null, { novalidate: '' }), n = ++uid;
      const ta = el('textarea', null, null, { id: 'q-t' + n, rows: '4', maxlength: String(MAXLEN), placeholder: m.ask || '' });
      f.append(el('label', null, tt('What did you do?'), { for: 'q-t' + n }), ta);
      let link = null;
      if (m.proof === 'link' || m.proof === 'either') {
        link = el('input', null, null, { id: 'q-u' + n, type: 'url', inputmode: 'url', maxlength: '400', autocomplete: 'off', placeholder: 'https://' });
        f.append(el('label', null, m.proof === 'either' ? tt('Link to your own post, if you made one') : tt('Link to your proof'), { for: 'q-u' + n }), link);
      }
      /* THE HOST'S YES IS NOT THE GUEST'S YES (14 October 2026). A mission whose data says "confirm" puts one box under the
         link: a report that carries a link is not sent until the box is ticked. Nothing about the tick is stored. */
      let ok = null;
      if (link && m.confirm) {
        const lab = el('label', 'q-ok', null, { for: 'q-k' + n });
        ok = el('input', null, null, { id: 'q-k' + n, type: 'checkbox' });
        lab.append(ok, el('span', null, tt('Everyone shown in my post said yes to being shown on this site and on the shows.')));
        f.append(lab);
      }
      f.append(el('p', 'q-hint', tt('Leave out anything private about anyone. A report is a post: other readers can see it.')));
      const go = el('button', 'btn btn-key', tt('Send report'), { type: 'submit' }), no = el('button', 'q-text', tt('Not now'), { type: 'button' });
      const row = el('div', 'q-btns'); row.append(go, no);
      f.append(row);
      B.form = f; B.ta = ta; B.link = link; B.go = go; B.ok = ok;
      box.insertBefore(f, B.say);
      let t = 0;
      f.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { const r = rec(id); r.text = ta.value.slice(0, MAXLEN); r.url = link ? link.value.slice(0, 400) : ''; save(); }, 300); });
      no.addEventListener('click', () => { f.hidden = true; B.say.removeAttribute('data-q-keep'); paintAll(); try { if (card.isConnected) B.report.focus(); } catch (x) { } });
      f.addEventListener('submit', ev => { ev.preventDefault(); send(card, id); });
    }
    const r = rec(id);
    if (!B.ta.value) B.ta.value = r.text || '';
    if (B.link && !B.link.value) B.link.value = r.url || '';
    B.form.hidden = false; B.report.hidden = true;
    B.say.setAttribute('data-q-keep', ''); B.say.textContent = '';
    try { B.ta.focus({ preventScroll: true }); B.form.scrollIntoView({ block: 'nearest' }); } catch (x) { }
  }
  function tell(B, text, bad) { B.say.setAttribute('data-q-keep', ''); B.say.textContent = text; B.say.classList.toggle('bad', !!bad); }
  /* The mission whose report is waiting for the reader to sign in. Once they have, its form is open again with what
     they wrote and one line that says so: nothing is sent by itself, and nobody is left thinking the report was lost. */
  let waitingSign = '';
  async function send(card, id) {
    const B = q('[data-q-act]', card)._q, m = BY.get(id), r = rec(id);
    const text = B.ta.value.trim();
    let url = B.link ? B.link.value.trim() : '';
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    url = url.replace(/^http:/i, 'https:');
    if (text.length < 10) { tell(B, tt('Say what you did, in a sentence or two.'), true); B.ta.focus(); return; }
    if (B.link && !url && m.proof !== 'either') { tell(B, tt('Paste the link to your proof first.'), true); B.link.focus(); return; }
    if (url && !/^https:\/\/[^\s\/<>"']+\.[^\s<>"']+$/.test(url)) { tell(B, tt('That link does not look right. Copy it again from the address bar or the Share button.'), true); B.link.focus(); return; }
    if (url && B.ok && !B.ok.checked) { tell(B, tt('Tick the box first: everyone shown in your post has to have said yes.'), true); B.ok.focus(); return; }
    r.text = text; r.url = url; save();
    if (!K || !K.report || K.off) { tell(B, tt('Reports are not open here yet. Your report is kept on this device.'), true); return; }
    B.go.disabled = true; tell(B, tt('Sending.'));
    let res = null;
    try { res = await K.report({ about: (DATA.about || 'quest:') + id, subject: m.title, text, url }, B.go); } catch (x) { res = { ok: false, text: '' }; }
    B.go.disabled = false;
    if (res && res.ok) {
      waitingSign = '';
      ST.m[id] = { s: 'reported', at: Date.now(), text: '', url: '' }; save();
      if (res.post && res.post.id) MINE.push({ id: res.post.id, mission: id, status: res.post.status || '', ms: Date.now() });
      cardsOf(id).forEach(c => { const b = q('[data-q-act]', c), Q = b && b._q; if (Q && Q.form) { Q.ta.value = ''; if (Q.link) Q.link.value = ''; Q.form.hidden = true; } if (Q) Q.say.removeAttribute('data-q-keep'); });
      paintAll();
      if (res.post && res.post.status === 'held') cardsOf(id).forEach(c => { const b = q('[data-q-act]', c); if (b && b._q) tell(b._q, tt('Report sent. Confirm your email and it reaches me: until then only you can see it.')); });
      return;
    }
    const code = (res && res.code) || '';
    if (code === 'lp/signin' || code === 'lp/name') { waitingSign = id; tell(B, tt('Your report is kept on this device. Sign in, then press Send report.')); }
    else if (code === 'lp/closed') tell(B, tt('Reports are not open here yet. Your report is kept on this device.'), true);
    else tell(B, tt('That did not send. {why} Your report is kept.', { why: (res && res.text) || '' }).replace(/\s+/g, ' '), true);
  }

  /* ---------------------------------------------------------------- taps */
  D.addEventListener('click', ev => {
    const t = ev.target.closest ? ev.target : null;
    if (!t) return;
    const chip = t.closest('button[data-q-chip]');
    if (chip) {
      const [row, id] = chip.getAttribute('data-q-chip').split(':'), R = ROWS[row];
      if (!R) return;
      if (R.many) { const at = ST.pick[row].indexOf(id); if (at >= 0) ST.pick[row].splice(at, 1); else ST.pick[row].push(id); }
      else if (row === 'in') { ST.pick.in = placeNow() === id ? '' : id; visitIn = ''; }
      else ST.pick[row] = ST.pick[row] === id ? '' : id;
      save(); paintChooser(); paintAll();
      return;
    }
    const setIn = t.closest('button[data-q-in-set]');
    if (setIn) { const v = setIn.getAttribute('data-q-in-set'); ST.pick.in = idsOf('in').includes(v) ? v : ''; visitIn = ''; save(); paintChooser(); paintAll(); return; }
    const card = t.closest('[data-q-m]'), id = card && card.getAttribute('data-q-m');
    if (card && BY.has(id)) {
      if (t.closest('[data-q-start]')) { const r = rec(id); r.s = 'started'; r.at = Date.now(); save(); paintAll(); return; }
      if (t.closest('[data-q-drop]')) { const r = rec(id); r.s = ''; r.at = 0; save(); paintAll(); return; }
      if (t.closest('[data-q-report]')) { openForm(card, id); return; }
    }
    const open = t.closest('a[data-q-open]');
    if (open) { ev.preventDefault(); show(open.getAttribute('data-q-open'), true); }
  });
  /* Any state picker on the page, a copy of a card's included: they are kept alike, and a mission that waits for the state is painted again. */
  D.addEventListener('change', ev => {
    const w = ev.target && ev.target.matches && ev.target.matches('select[data-q-where]') ? ev.target : null;
    if (!w) return;
    ST.pick.where = /^[a-z]{2}$/.test(w.value) ? w.value : ''; save(); paintChooser(); paintAll();
  });

  /* act/#<mission id>: that mission, open. A report on the list of all discussions links here. */
  function show(id, move) {
    const c = BY.has(id) ? D.getElementById(id) : null;
    /* a mission that is not for this reader stays hidden, whatever the address says */
    if (!c || !shown(BY.get(id))) return;
    const fold = c.closest('details[data-q-more]'); if (fold) fold.open = true;
    c.open = true;
    if (move) { try { history.replaceState(null, '', '#' + id); } catch (x) { } }
    try { c.scrollIntoView({ block: 'start' }); } catch (x) { }
  }
  const fromHash = () => { const id = decodeURIComponent((location.hash || '').slice(1)); if (BY.has(id)) show(id, false); };
  window.addEventListener('hashchange', fromHash);

  /* ---------------------------------------------------------------- the database, asked once */
  async function ask() {
    if (!K || K.off || !K.doc) return;
    if (q('[data-q-m]') || q('[data-q-slot="top"]')) try { const b = await K.doc('xp/_board'); if (b && typeof b === 'object') { TOP = { done: b.done && typeof b.done === 'object' ? b.done : {}, top: Array.isArray(b.top) ? b.top : [] }; paintAll(); paintTop(); } } catch (x) { }
    await mine();
  }
  let asked = '';
  async function mine() {
    const me = who(), id = me && typeof me.uid === 'string' && /^[A-Za-z0-9]{1,128}$/.test(me.uid) ? me.uid : '';
    if (id === asked) return;
    asked = id;
    XP = { xp: 0, reports: {} }; MINE = [];
    if (id) {
      try { const x = await K.doc('xp/' + id); if (x && typeof x === 'object' && asked === id) XP = { xp: typeof x.xp === 'number' ? x.xp : 0, reports: x.reports && typeof x.reports === 'object' ? x.reports : {} }; } catch (x) { }
      try { if (K.mine) { const list = await K.mine(); if (Array.isArray(list) && asked === id) MINE = list.filter(p => p && typeof p.id === 'string' && BY.has(p.mission)); } } catch (x) { }
    }
    paintAll();
  }
  function signedIn() {
    if (!who()) return;
    const open = qa('[data-q-act]').filter(b => b._q && b._q.form && !b._q.form.hidden);
    if (open.length) { open.forEach(b => tell(b._q, tt('You are signed in. Send your report.'))); return; }
    if (!waitingSign || !BY.has(waitingSign) || !shown(BY.get(waitingSign))) return;
    const c = q('[data-q-slot] [data-q-m="' + waitingSign + '"]') || D.getElementById(waitingSign), box = c && q('[data-q-act]', c);
    if (!c || !box) return;
    c.open = true; openForm(c, waitingSign);
    if (box._q) tell(box._q, tt('You are signed in. Send your report.'));
  }
  /* Said once, at the moment a reader goes from signed out to signed in. community.js also calls back when it only
     asks the account again (after a post the rules refused, for one), and that must not wipe what the form just said. */
  let wasIn = !!who();
  D.addEventListener('lp:members', ev => { AUTO = Object.assign({}, AUTO, (ev && ev.detail) || {}); paintAll(); });
  if (K && K.sub) K.sub(() => { const isIn = !!who(), came = isIn && !wasIn; wasIn = isIn; mine().catch(() => { }); if (came) { try { signedIn(); } catch (x) { } } });

  paintChooser(); paintAll(); fromHash();
  H.classList.add('q-ready');
  /* A site that fetches nothing until its reader asks (LPSITE.quiet) waits for the first tap or key. */
  if (K && K.quiet) { const once = () => { window.removeEventListener('pointerdown', once, true); window.removeEventListener('keydown', once, true); ask().catch(() => { }); }; window.addEventListener('pointerdown', once, true); window.addEventListener('keydown', once, true); }
  else ask().catch(() => { });
}
