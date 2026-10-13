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
                      "repeat"?:true}]
      }</script>
      "repeat" (optional, added 13 October 2026): the mission can be reported again after it was accepted. The database
      takes one accepted report a reader a mission a week, so Report again is offered seven days after the last one.
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
  const WHERE = q('[data-q-where]');

  /* ---------------------------------------------------------------- what this device keeps */
  const KEEP = (() => { try { const s = SITE.safety ? window.sessionStorage : window.localStorage; s.getItem('x'); return s; } catch (x) { return null; } })();
  const NAME = typeof DATA.store === 'string' && DATA.store ? DATA.store : 'lp-quests';
  const ST = { pick: { who: '', time: '', can: [], where: '' }, m: {} };
  (() => {
    let v = null;
    try { v = KEEP ? JSON.parse(KEEP.getItem(NAME)) : null; } catch (x) { v = null; }
    if (!v || typeof v !== 'object') return;
    const p = v.pick && typeof v.pick === 'object' ? v.pick : {};
    const one = (row, val) => (typeof val === 'string' && ROWS[row] && ROWS[row].ids.includes(val) ? val : '');
    ST.pick.who = one('who', p.who); ST.pick.time = one('time', p.time);
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
    if (have != null) {
      if (ROWS.time && ROWS.time.ids.includes(have)) { ST.pick.time = have; save(); }
      u.searchParams.delete('have');
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
  /* '' | started | reported | back | accepted. A mission that may be done again ("repeat") goes back to reported or
     back when a later report is waiting or was turned down; one that may not stays accepted for good. */
  function status(id) {
    const m = BY.get(id), v = VER[id], l = ST.m[id], judged = new Set(Object.keys(XP.reports || {}));
    const waiting = MINE.some(p => p.mission === id && !judged.has(p.id)) || !!(l && l.s === 'reported' && l.at > (v ? v.at : 0));
    if (v && v.n && !m.repeat) return 'accepted';
    if (waiting) return 'reported';
    if (v && v.state === 'back') return 'back';
    if (v && v.n) return 'accepted';
    return l && l.s === 'started' ? 'started' : '';
  }
  /* Accepted, may be done again, and the week since the last accepted report is up. */
  const again = id => { const m = BY.get(id), v = VER[id]; return !!(m.repeat && v && v.n && status(id) === 'accepted' && Date.now() - v.last >= WEEK); };
  const daysLeft = id => { const v = VER[id]; return v ? Math.max(1, Math.ceil((v.last + WEEK - Date.now()) / 86400000)) : 0; };
  /* A report written and not sent: it is kept on this device, and the card must say so. */
  const draft = id => !!(ST.m[id] && ST.m[id].text && ST.m[id].text.trim());
  const expired = m => typeof m.until === 'string' && m.until < today;
  const shown = m => !expired(m) && (!ST.pick.who || !Array.isArray(m.who) || m.who.includes(ST.pick.who));

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
    return list.map(x => ({ id: x.m.id, s: fit(x.m, x.i) })).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.id);
  }

  /* ---------------------------------------------------------------- drawing */
  const LABEL = {
    started: () => tt('Started'),
    reported: () => tt('Report sent. Waiting.'),
    back: () => tt('Sent back'),
    accepted: id => { const v = VER[id]; return v && v.n > 1 ? tt('Accepted {times} times. +{n} XP', { times: v.n, n: v.sum }) : tt('Accepted. +{n} XP', { n: (v && v.sum) || BY.get(id).xp }); },
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
    const B = box._q, can = m.report !== false, formOpen = !!(B.form && !B.form.hidden);
    B.start.hidden = st !== '' || kept;
    B.drop.hidden = st !== 'started';
    B.report.hidden = formOpen || !can || (st === 'accepted' && !more);
    B.report.textContent = kept ? tt('Finish your report') : st === 'back' || more ? tt('Report again') : st === 'reported' ? tt('Send another report') : tt('Report back');
    B.report.className = 'btn ' + (st === 'started' || st === 'back' || kept ? 'btn-key' : 'btn-line');
    if (!B.say.hasAttribute('data-q-keep')) {
      let line = st === 'accepted' ? LABEL.accepted(id) + '.' + (v && v.why && v.state === 'accepted' ? ' ' + v.why : '')
        : st === 'back' ? (v && v.why ? tt('Sent back: {why}', { why: v.why }) : tt('Sent back. Read what counts as proof, then report again.'))
        : st === 'reported' ? tt('Report sent. I read every report. XP lands when it is accepted.')
        : st === 'started' ? tt('Started. Come back and report when it is done.') : '';
      if (st === 'accepted' && m.repeat) { const d = daysLeft(id); line += ' ' + (more ? tt('You can report it again now.') : d === 1 ? tt('You can report it again tomorrow.') : tt('You can report it again in {n} days.', { n: d })); }
      if (kept) line = (line ? line + ' ' : '') + tt('Your report is kept on this device. It has not been sent.');
      B.say.textContent = line; B.say.classList.remove('bad');
    }
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
    paintPicks(); paintMine(); paintRank(); paintChains(); paintLinks();
  }
  /* The reader's mission and two more: copies of the cards, so they open in place and work like the originals. */
  let lastPicks = '';
  function paintPicks() {
    const best = q('[data-q-slot="best"]'), also = q('[data-q-slot="also"]');
    if (!best) return;
    const ids = picks(), key = ids.join(' ');
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
      if (hook && t) t.after(el('span', 'q-hook-s', hook.textContent));
      /* closed, the big card says how to get in; the words are drawn from this attribute (site.css, .q-big summary::before) */
      const sm = q('summary', c); if (big && sm) sm.setAttribute('data-q-go', tt('Open mission'));
      paintCard(c, id);
      return c;
    };
    best.textContent = ''; if (also) also.textContent = '';
    ids.forEach((id, n) => { const c = copy(id, n === 0); if (c) (n === 0 || !also ? best : also).append(c); });
    if (also && ids.length > 1) also.prepend(el('p', 'q-also-h', tt('Also fits you')));
    if (sec) sec.classList.toggle('q-empty', !ids.length);
  }
  function paintMine() {
    const sec = D.getElementById('q-mine'), list = q('[data-q-slot="mine"]');
    if (!sec || !list) return;
    const order = { draft: 0, back: 1, started: 2, reported: 3, accepted: 4 };
    const rows = MS.filter(shown).map(m => ({ m, st: status(m.id) || (draft(m.id) ? 'draft' : '') })).filter(x => x.st).sort((a, b) => order[a.st] - order[b.st]);
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
      const id = c.getAttribute('data-q-chip').split(':')[1], on = ROWS[row].many ? ST.pick[row].includes(id) : ST.pick[row] === id;
      c.setAttribute('aria-pressed', String(on));
    });
    if (WHERE && [...WHERE.options].some(o => o.value === ST.pick.where)) WHERE.value = ST.pick.where;
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
      if (m.proof === 'link') {
        link = el('input', null, null, { id: 'q-u' + n, type: 'url', inputmode: 'url', maxlength: '400', autocomplete: 'off', placeholder: 'https://' });
        f.append(el('label', null, tt('Link to your proof'), { for: 'q-u' + n }), link);
      }
      f.append(el('p', 'q-hint', tt('Leave out anything private about anyone. A report is a post: other readers can see it.')));
      const go = el('button', 'btn btn-key', tt('Send report'), { type: 'submit' }), no = el('button', 'q-text', tt('Not now'), { type: 'button' });
      const row = el('div', 'q-btns'); row.append(go, no);
      f.append(row);
      B.form = f; B.ta = ta; B.link = link; B.go = go;
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
    if (B.link && !url) { tell(B, tt('Paste the link to your proof first.'), true); B.link.focus(); return; }
    if (url && !/^https:\/\/[^\s\/<>"']+\.[^\s<>"']+$/.test(url)) { tell(B, tt('That link does not look right. Copy it again from the address bar or the Share button.'), true); B.link.focus(); return; }
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
      else ST.pick[row] = ST.pick[row] === id ? '' : id;
      save(); paintChooser(); paintAll();
      return;
    }
    const card = t.closest('[data-q-m]'), id = card && card.getAttribute('data-q-m');
    if (card && BY.has(id)) {
      if (t.closest('[data-q-start]')) { const r = rec(id); r.s = 'started'; r.at = Date.now(); save(); paintAll(); return; }
      if (t.closest('[data-q-drop]')) { const r = rec(id); r.s = ''; r.at = 0; save(); paintAll(); return; }
      if (t.closest('[data-q-report]')) { openForm(card, id); return; }
    }
    const open = t.closest('a[data-q-open]');
    if (open) { ev.preventDefault(); show(open.getAttribute('data-q-open'), true); }
  });
  if (WHERE) WHERE.addEventListener('change', () => { ST.pick.where = /^[a-z]{2}$/.test(WHERE.value) ? WHERE.value : ''; save(); paintLinks(); });

  /* act/#<mission id>: that mission, open. A report on the list of all discussions links here. */
  function show(id, move) {
    const c = BY.has(id) ? D.getElementById(id) : null;
    /* a mission that is not for this reader stays hidden, whatever the address says */
    if (!c || !shown(BY.get(id))) return;
    c.open = true;
    if (move) { try { history.replaceState(null, '', '#' + id); } catch (x) { } }
    try { c.scrollIntoView({ block: 'start' }); } catch (x) { }
  }
  const fromHash = () => { const id = decodeURIComponent((location.hash || '').slice(1)); if (BY.has(id)) show(id, false); };
  window.addEventListener('hashchange', fromHash);

  /* ---------------------------------------------------------------- the database, asked once */
  async function ask() {
    if (!K || K.off || !K.doc) return;
    try { const b = await K.doc('xp/_board'); if (b && typeof b === 'object') { TOP = { done: b.done && typeof b.done === 'object' ? b.done : {}, top: Array.isArray(b.top) ? b.top : [] }; paintAll(); paintTop(); } } catch (x) { }
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
  if (K && K.sub) K.sub(() => { const isIn = !!who(), came = isIn && !wasIn; wasIn = isIn; mine().catch(() => { }); if (came) { try { signedIn(); } catch (x) { } } });

  paintChooser(); paintAll(); fromHash();
  H.classList.add('q-ready');
  /* A site that fetches nothing until its reader asks (LPSITE.quiet) waits for the first tap or key. */
  if (K && K.quiet) { const once = () => { window.removeEventListener('pointerdown', once, true); window.removeEventListener('keydown', once, true); ask().catch(() => { }); }; window.addEventListener('pointerdown', once, true); window.addEventListener('keydown', once, true); }
  else ask().catch(() => { });
}
