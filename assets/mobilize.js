/* Mobilize: XP from every tool, reputation, badges, the gathering upgrades (the door from a tool, check-in, the vouch,
   trusted members only, a guild that hosts) and guilds. ONE FILE FOR BOTH SITES; the one home is ../MOBILIZE.md.

   HOW IT IS LOADED. build/members.py copies this file to assets/mobilize.js?v=6bae3a4e76 and script_tags() loads it on every page, after
   members.js. members.js also imports it (import('./mobilize.js'), the same module, so one copy runs) and calls the parts
   that live inside its own pages: profile() on member/, formExtras() and prefill() on gatherings/new/, gathering() on
   gatherings/g/, marks() on every gathering card, drop() when an account is deleted. A part that is missing costs nothing.

   WHAT IT NEEDS. community.js (window.LP.members: Firebase, who is signed in, the words); assets/members-data.json "mz"
   (written by build/mobilize.py page_data: the tools, the tiers, the badges, the doors). Nothing it shows is trusted from the
   page: XP, reputation and badges are read from xp/ and standing/, which only build/mobilize.py and build/quests.py write.

   WHAT IT DOES ON ITS OWN, ON EVERY PAGE
   1. A day on a tool. On a page of a listed tool, once the reader has been there mz.used.seconds AND tapped, clicked or typed
      mz.used.taps times inside the page's main part (never the header, the menu, the bubble or the discussion), it writes
      users/<id>/used/<tool> (n + 1, once a day; the rules hold that). A tool may also say so: lp:did with {tool}. Signed out,
      nothing. Iran Uncensored: only once the reader's own action has loaded the account (nothing loads before a tap).
   2. The door. On a tool page listed in mz.doors, a card just above the discussion (#talk): "Do this with others", which
      opens gatherings/new/ prefilled (the contract in ../MOBILIZE.md).
   3. gatherings/?new=1&kind=&from=&ref=&title=&place= is sent on to gatherings/new/ with the same words.
   4. The guild pages ([data-mz="guilds" | "guild" | "guildnew"]).

   Sentences a reader can see on BOTH sites go through tt('English sentence'), with their Persian in
   ../../site-iu/build/community-strings.json (site-iu/build/strings_check.py reads this file). Sentences only Liberty Politics
   ever shows (check-in, the vouch, the doors, guild-hosted gatherings) go through en('...'): the Iran site never draws them.
   A person's words reach the page through textContent, never as markup. */

const D = document, H = D.documentElement;
const ROOT = H.getAttribute('data-root') || './';
const SITE = (window.LPSITE && typeof window.LPSITE === 'object') ? window.LPSITE : {};
const BASE = typeof SITE.base === 'string' ? SITE.base : '';
const SITE_KEY = (() => { const s = D.querySelector('script[src*="mobilize.js"][data-site], script[src*="members.js"][data-site]'); return (s && s.getAttribute('data-site')) || 'lp'; })();
const IU = SITE_KEY === 'iu';
const LANG = (H.getAttribute('lang') || 'en').slice(0, 2) === 'fa' ? 'fa' : 'en';
const K = () => (window.LP && window.LP.members) || null;
const STR = SITE.strings || null, DIGITS = typeof SITE.digits === 'string' && SITE.digits.length === 10 ? SITE.digits : '';
const dig = n => (DIGITS ? String(n).replace(/[0-9]/g, d => DIGITS[d]) : String(n));
function tt(s, v) {
  const k = K();
  const T = k && k.tt;      // community.js's own table (the Persian pages), handed over as LP.members.tt
  if (T) return T(s, v);
  let out = STR && typeof STR[s] === 'string' ? STR[s] : s;
  if (v) out = out.replace(/\{(\w+)\}/g, (m, x) => (x in v ? (typeof v[x] === 'number' ? dig(v[x]) : String(v[x])) : m));
  return out;
}
/* Liberty Politics only: a sentence the Iran site never draws (see the top of this file). */
function en(s, v) { return v ? s.replace(/\{(\w+)\}/g, (m, x) => (x in v ? String(v[x]) : m)) : s; }
const w = v => (v && typeof v === 'object' ? (v[LANG] || v.en || '') : (typeof v === 'string' ? v : ''));
function el(tag, cls, text, attrs) {
  const e = D.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function btn(cls, text, fn) { const b = el('button', cls, text, { type: 'button' }); if (fn) b.addEventListener('click', fn); return b; }
const say = (line, text, bad) => { line.textContent = text || ''; line.classList.toggle('bad', !!bad); };
const within = (ms, p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no({ code: 'lp/slow' }), ms))]);
const me = () => { try { const k = K(); return k ? k.who() : null; } catch (x) { return null; } };
const fb = () => { const k = K(); return k && !k.off ? k.fb() : Promise.reject({ code: 'lp/off' }); };
const page = p => ROOT + BASE + p;
const dayNow = () => Math.floor(Date.now() / 86400000);
const ms = t => (t && typeof t.toMillis === 'function' ? t.toMillis() : (typeof t === 'number' ? t : 0));
const words = e => { const k = K(); return k && k.words ? k.words(e) : tt('Something went wrong. Try again in a moment.'); };

let DATA = null, dataAsk = null;
function data() {
  if (!dataAsk) dataAsk = fetch(ROOT + 'assets/members-data.json').then(r => r.json()).then(d => (DATA = d)).catch(() => (DATA = null));
  return dataAsk;
}
const MZ = () => (DATA && DATA.mz) || null;
/* Device memory: the days already written (so a tool is written once a day, not on every page). The Iran site keeps it for
   the visit only, like everything else it keeps (LPSITE.safety). */
const KEEP = (() => { try { const s = SITE.safety ? window.sessionStorage : window.localStorage; s.getItem('x'); return s; } catch (x) { return null; } })();
const kept = { get(k) { try { return KEEP ? JSON.parse(KEEP.getItem(k)) : null; } catch (x) { return null; } },
  set(k, v) { try { if (KEEP) { if (v == null) KEEP.removeItem(k); else KEEP.setItem(k, JSON.stringify(v)); } } catch (x) { } } };

/* The ninth version of the rules is live when standing/_live answers 404 (403 before). Asked once a visit, over plain REST. */
let liveAsk = null;
function v9() {
  if (!liveAsk) {
    const k = K();
    liveAsk = (k && k.restDoc && !k.off) ? fetch(k.restDoc('standing/_live')).then(r => r.status === 404 || r.status === 200).catch(() => false) : Promise.resolve(false);
  }
  return liveAsk;
}
/* The page's own address inside the site (inside the language folder on the Iran site), like "uprising/" or "scorecard/x-tx/". */
function rel() {
  try {
    const root = new URL(ROOT + BASE, location.href).pathname;
    const p = location.pathname.replace(/index\.html$/, '');
    return p.startsWith(root) ? p.slice(root.length) : '';
  } catch (x) { return ''; }
}
const tierOf = rep => { const T = (MZ() && MZ().tiers) || []; let t = T[0] || null; T.forEach(x => { if (rep >= x.from) t = x; }); return t; };
const nextTier = rep => ((MZ() && MZ().tiers) || []).find(x => x.from > rep) || null;
const tool = id => ((MZ() && MZ().tools) || []).find(t => t.id === id) || null;
const badge = id => ((MZ() && MZ().badges) || []).find(b => b.id === id) || null;
const KIND_OK = k => typeof k === 'string' && DATA && Array.isArray(DATA.formats) && DATA.formats.some(f => f.id === k);
const FROM_OK = f => typeof f === 'string' && /^[a-z][a-z0-9-]{1,23}$/.test(f);
const REF_OK = r => typeof r === 'string' && /^[A-Za-z0-9:_.-]{0,80}$/.test(r);
const GUILD_OK = g => typeof g === 'string' && /^[A-Za-z0-9]{2,40}-[12]$/.test(g);

/* ------------------------------------------------------------------ 1. a day on a tool */
async function markDay(id) {
  const t = tool(id);
  if (!t) return false;
  const u = me();
  const memo = 'mz-day-' + id;
  if (kept.get(memo) === dayNow()) return false;
  if (!u || !u.v) return false;
  const k = K();
  if (IU && k && k.quiet && !(k.user && k.user())) return false;      // nothing loads from Google for this on the Iran site
  if (!(await v9())) return false;
  try {
    const { F, db } = await within(25000, fb());
    const ref = F.doc(db, 'users', u.uid, 'used', id);
    const s = await F.getDoc(ref);
    const d = s.exists() ? s.data() : null;
    if (!d) await F.setDoc(ref, { n: 1, day: dayNow() });
    else if (typeof d.day === 'number' && d.day < dayNow()) await F.setDoc(ref, { n: (d.n || 0) + 1, day: dayNow() });
    kept.set(memo, dayNow());
    try { D.dispatchEvent(new CustomEvent('lp:mz-day', { detail: { tool: id } })); } catch (x) { }
    return true;
  } catch (x) { return false; }
}
function trackTool() {
  const M = MZ(); if (!M) return;
  const here = rel();
  const t = (M.tools || []).find(x => (x.paths || []).some(p => here === p || here.startsWith(p)));
  D.addEventListener('lp:did', ev => { const id = ev && ev.detail && ev.detail.tool; if (typeof id === 'string') markDay(id); });
  if (!t) return;
  const need = (M.used && M.used.taps) || 3, secs = ((M.used && M.used.seconds) || 20) * 1000, t0 = Date.now();
  let taps = 0, done = false;
  const OUT = 'header, nav, footer, dialog, .talk, #talk, #discussion, .bubble, [data-bubble], .acct, .sheet, .mz-door';
  const go = () => { if (!done && taps >= need && Date.now() - t0 >= secs) { done = true; markDay(t.id); } };
  const hit = ev => { const x = ev.target; if (!x || !x.closest || x.closest(OUT)) return; taps++; go(); };
  D.addEventListener('pointerdown', hit, true);
  D.addEventListener('keydown', hit, true);
  setTimeout(go, secs + 50);
}

/* ------------------------------------------------------------------ 2. the door from a tool (Liberty Politics) */
function newHref(o) {
  const q = new URLSearchParams();
  Object.entries(o).forEach(([k, v]) => { if (v) q.set(k, String(v)); });
  return page((DATA && DATA.paths && DATA.paths.new) || 'gatherings/new/') + '?' + q.toString();
}
function drawDoor() {
  const M = MZ(); if (!M || IU) return;
  const here = rel(), talk = D.getElementById('talk');
  if (!talk || D.querySelector('.mz-door')) return;
  const d = (M.doors || []).find(x => here.startsWith(x.path) && (!x.slug || new RegExp(x.slug).test(here.slice(x.path.length))) && (x.path !== '' || here === ''));
  if (!d || !KIND_OK(d.kind)) return;
  const h1 = D.querySelector('h1'), name = h1 ? h1.textContent.trim().replace(/\s+/g, ' ').slice(0, 50) : '';
  if (d.title.includes('{name}') && !name) return;
  const title = en(d.title, { name }).slice(0, 80);
  const ref = here.slice(d.path.length).replace(/\/$/, '').replace(/[^A-Za-z0-9:_.-]/g, '-').slice(0, 80);
  const box = el('aside', 'mz-door', null, { 'aria-label': en('Do this with others') });
  const inner = el('div', 'wrap mz-door-in');
  const txt = el('div', 'mz-door-t');
  txt.append(el('p', 'mz-kicker', en('Do this with others')), el('p', 'mz-door-h', title), el('p', 'mz-door-p', d.say));
  inner.append(txt, el('a', 'btn btn-key mz-door-go', en('Host it'), { href: newHref({ kind: d.kind, from: d.tool, ref, title }) }));
  box.append(inner);
  talk.parentNode.insertBefore(box, talk);
}

/* ------------------------------------------------------------------ 2b. the board says guilds exist (both sites) */
function guildBand() {
  const box = D.querySelector('[data-mb="board"]'), M = MZ();
  if (!box || !M || D.querySelector('.mz-band')) return;
  const P = (DATA && DATA.mz && DATA.mz.pages && DATA.mz.pages.band) || null;
  const a = el('aside', 'mz-door mz-band', null, { 'aria-label': tt('Guilds') });
  const inner = el('div', 'wrap mz-door-in'), t = el('div', 'mz-door-t');
  t.append(el('p', 'mz-kicker', tt('Guilds')), el('p', 'mz-door-p', tt('Groups that meet again and again. Join one near you, or start your own.')));
  inner.append(t, el('a', 'btn btn-line mz-door-go', tt('See the guilds'), { href: page(M.guildPaths.list) }));
  a.append(inner);
  box.parentNode.insertBefore(a, box.nextSibling);
}

/* ------------------------------------------------------------------ 3. gatherings/?new=1 ... is the host's form */
function forwardNew() {
  const box = D.querySelector('[data-mb="board"]');
  if (!box) return;
  const q = new URLSearchParams(location.search);
  if (q.get('new') !== '1') return;
  q.delete('new');
  const to = page((DATA && DATA.paths && DATA.paths.new) || 'gatherings/new/') + (q.toString() ? '?' + q.toString() : '');
  try { location.replace(to); } catch (x) { location.href = to; }
}

/* ------------------------------------------------------------------ for members.js: the prefill contract */
export function prefill(qs) {
  const q = qs || new URLSearchParams(location.search);
  const clean = (s, n) => String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
  const out = { kind: '', from: '', ref: '', title: '', place: '' };
  if (KIND_OK(q.get('kind'))) out.kind = q.get('kind');
  if (FROM_OK(q.get('from'))) out.from = q.get('from');
  if (REF_OK(q.get('ref') || '')) out.ref = q.get('ref') || '';
  out.title = clean(q.get('title'), (DATA && DATA.limits && DATA.limits.title) || 80);
  out.place = clean(q.get('place'), (DATA && DATA.limits && DATA.limits.city) || 60).replace(/[0-9]/g, '');
  out.any = !!(out.kind || out.from || out.title || out.place);
  return out;
}
export function fromName(id) {
  if (id === 'member') return en('a politician\'s page');
  const t = tool(id);
  return t ? w(t.name) : '';
}
function fromHref(g) {
  const t = tool(g.from), d = ((MZ() && MZ().doors) || []).find(x => x.tool === g.from);
  if (g.from === 'member' && g.ref) return page('scorecard/' + g.ref + '/');
  if (t && t.paths && t.paths[0]) return page(t.paths[0]);
  return d ? page(d.path) : '';
}

/* ------------------------------------------------------------------ standing: one read, kept for the visit */
const STAND = {};
async function standing(uid) {
  if (!uid) return null;
  if (!(uid in STAND)) {
    STAND[uid] = (async () => {
      try {
        const k = K();
        if (k && k.restDoc && k.plain) {
          const r = await within(15000, fetch(k.restDoc('standing/' + uid)));
          if (r.status === 404) return null;
          if (r.ok) { const j = await r.json(); return k.plain({ mapValue: { fields: (j && j.fields) || {} } }) || null; }
        }
        const { F, db } = await within(25000, fb());
        const s = await F.getDoc(F.doc(db, 'standing', uid));
        return s.exists() ? s.data() : null;
      } catch (x) { return null; }
    })();
  }
  return STAND[uid];
}

/* ------------------------------------------------------------------ for members.js: the profile's standing */
function medal(b, own) {
  const li = el('li', 'mz-badge' + (b.kind === 'tool' ? ' mz-b-tool' : b.kind === 'hosted' || b.kind === 'came' ? ' mz-b-meet' : b.kind === 'met' ? ' mz-b-trust' : ''), null, { title: w(b.line) });
  li.append(el('span', 'mz-medal', w(b.name).slice(0, 1).toUpperCase(), { 'aria-hidden': 'true' }), el('b', null, w(b.name)), el('span', 'mz-bl', w(b.line)));
  if (own && b.kind === 'tool' && IU) li.append(el('span', 'mz-only', tt('Only you see this one')));
  return li;
}
export async function profile(slot, o) {
  await data();
  const M = MZ();
  if (!M || !slot || o.host) return;
  const st = await standing(o.uid);
  const rep = st && typeof st.rep === 'number' ? st.rep : 0;
  const t = tierOf(rep), nx = nextTier(rep);
  const box = el('section', 'mz-stand', null, { 'data-mz-stand': '' });
  const row = el('div', 'mz-rep');
  const pill = el('p', 'mz-tierline');
  pill.append(el('span', 'mz-tier mz-tier-' + (t ? t.id : 'new'), t ? w(t.name) : ''), el('span', 'mz-repn', tt('{n} reputation', { n: rep })));
  row.append(pill);
  if (nx) {
    const bar = el('div', 'mz-bar'), i = el('i');
    const lo = t ? t.from : 0;
    i.style.width = Math.max(3, Math.min(100, Math.round(100 * (rep - lo) / (nx.from - lo)))) + '%';
    bar.append(i);
    row.append(bar, el('p', 'mz-hint', tt('{n} more to {tier}', { n: nx.from - rep, tier: w(nx.name) })));
  }
  row.append(el('p', 'mz-hint', IU ? tt('Reputation is what other members say: likes from established members and the ratings of what you organised.') : tt('Reputation is what other members say: likes from established members, the ratings of what you hosted, and the people you met.')));
  box.append(row);
  // badges: the job's, and on the Iran site the owner's tool badges worked out here from their own days
  let ids = (st && Array.isArray(st.badges)) ? st.badges.slice() : [];
  let used = null;
  if (o.own) {
    try {
      const { F, db } = await within(25000, fb());
      const s = await F.getDocs(F.query(F.collection(db, 'users', o.uid, 'used'), F.limit(50)));
      used = {}; s.docs.forEach(d => { used[d.id] = d.data().n || 0; });
    } catch (x) { used = null; }
    if (IU && used) (M.badges || []).forEach(b => { if (b.kind === 'tool' && (used[b.tool] || 0) >= (b.days || M.toolBadgeDays) && !ids.includes(b.id)) ids.push(b.id); });
  }
  const list = ids.map(badge).filter(Boolean);
  const bw = el('div', 'mz-bwrap');
  bw.append(el('h2', 'mb-h3', tt('Badges')));
  if (list.length) { const ul = el('ul', 'mz-badges'); list.forEach(b => ul.append(medal(b, o.own))); bw.append(ul); }
  else bw.append(el('p', 'mz-hint', o.own ? (IU ? tt('No badge yet. Your first comes with your first post, your first public event, or five days on a tool.') : tt('No badge yet. Your first comes with your first post, your first gathering, or five days on a tool.')) : tt('No badge yet.')));
  box.append(bw);
  if (!IU && st && Array.isArray(st.guilds) && st.guilds.length) {
    const g = el('div', 'mz-gl');
    g.append(el('h2', 'mb-h3', en('Guilds')));
    const ul = el('ul', 'mz-glist');
    st.guilds.forEach(x => { if (!GUILD_OK(x.id)) return; const li = el('li'); li.append(el('a', null, x.name || '', { href: page(M.guildPaths.one + '?id=' + encodeURIComponent(x.id)) })); if (x.role === 'owner' || x.role === 'mod') li.append(el('span', 'mz-role', x.role === 'owner' ? en('owner') : en('mod'))); ul.append(li); });
    g.append(ul); box.append(g);
  }
  if (o.own) box.append(earn(M, used || {}), perks(M, rep));
  slot.append(box);
}
/* Ways to earn: every tool with how many days it has counted, and what the next day is worth. One native fold. */
function earn(M, used) {
  const det = el('details', 'mz-earn');
  const todayN = (M.tools || []).filter(t => kept.get('mz-day-' + t.id) === dayNow()).length;
  const sum = el('summary', 'mz-sum');
  sum.append(el('b', null, tt('Ways to earn XP')), el('span', null, todayN ? tt('{n} tools counted today', { n: todayN }) : tt('Every tool you come back to counts, once a day')));
  det.append(sum);
  const ul = el('ul', 'mz-tools');
  (M.tools || []).forEach(t => {
    const n = Math.min(used[t.id] || 0, t.days + 1), left = t.days + 1 - n;
    const li = el('li', 'mz-trow' + (left <= 0 ? ' is-done' : ''));
    const a = el('a', 'mz-tname', w(t.name), { href: page((t.paths || [])[0] || '') });
    const prog = el('span', 'mz-tprog');
    prog.textContent = n ? (left > 0 ? tt('{n} of {m} days', { n, m: t.days + 1 }) : tt('All {m} days counted', { m: t.days + 1 })) : tt('Not yet');
    const next = el('span', 'mz-tnext', left > 0 ? tt('+{n} XP next', { n: n ? t.day : t.first }) : '');
    const bar = el('span', 'mz-tbar'); const i = el('i'); i.style.width = Math.round(100 * n / (t.days + 1)) + '%'; bar.append(i);
    li.append(a, prog, next, bar); ul.append(li);
  });
  det.append(ul);
  const more = el('ul', 'mz-more');
  [[IU ? tt('Organise a public event') : tt('Host a gathering that happens'), (DATA && DATA.paths && DATA.paths.new) || 'gatherings/new/'], [IU ? tt('Go to a public event') : tt('Come to a gathering'), (DATA && DATA.paths && DATA.paths.board) || 'gatherings/'], [tt('Do a mission and report back'), 'missions/']]
    .forEach(([text, p]) => { const li = el('li'); li.append(el('a', null, text, { href: page(p) })); more.append(li); });
  det.append(el('p', 'mz-hint', tt('Meeting in person is worth the most.')), more);
  return det;
}
/* What reputation opens: the tiers as a ladder, the reader's own lit. */
function perks(M, rep) {
  const det = el('details', 'mz-perks');
  const t = tierOf(rep);
  const sum = el('summary', 'mz-sum');
  sum.append(el('b', null, tt('What your reputation opens')), el('span', null, tt('You are {tier}', { tier: t ? w(t.name) : '' })));
  det.append(sum);
  const ol = el('ol', 'mz-ladder');
  (M.tiers || []).forEach(x => {
    const li = el('li', rep >= x.from ? 'is-on' : '');
    const h = el('p', 'mz-lh'); h.append(el('b', null, w(x.name)), el('span', null, tt('from {n}', { n: x.from })));
    li.append(h, el('p', 'mz-lc', w(x.can)));
    ol.append(li);
  });
  det.append(ol);
  return det;
}

/* ------------------------------------------------------------------ for members.js: the host's form */
/* The level a guest must have reached, and (Liberty Politics) the guild that hosts it. read() is called at Post. */
export async function formExtras(o) {
  await data();
  const M = MZ(), u = me();
  if (!M || !u || !(await v9())) return null;
  const st = await standing(u.uid);
  const rep = st && typeof st.rep === 'number' ? st.rep : 0;
  const wrap = el('div', 'mb-f mz-extra');
  let lvl = (o && o.g && [0, 10, 50].includes(o.g.minRep)) ? o.g.minRep : 0;
  const chips = el('div', 'mb-chips', null, { role: 'group', 'aria-label': tt('Who can join') });
  const L = [[0, tt('Anyone'), tt('Every member')], [10, tt('Known members'), tt('Reputation 10 and up')], [50, tt('Trusted members'), tt('Reputation 50 and up')]];
  const paint = () => {
    chips.textContent = '';
    L.forEach(([v, t, sub]) => {
      const can = rep >= v;
      const b = btn('mb-chip', null, () => { if (can) { lvl = v; paint(); } });
      b.append(el('b', null, t), el('span', null, can ? sub : tt('You need {n} reputation', { n: v })));
      b.setAttribute('aria-pressed', String(lvl === v)); if (!can) { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
      chips.append(b);
    });
  };
  paint();
  wrap.append(el('span', 'mb-l', tt('Who can join')), chips, el('p', 'mb-hint', tt('A level asks guests for reputation other members gave them. You can ask only for a level you reached.')));
  let guild = (o && o.g && GUILD_OK(o.g.guild)) ? o.g.guild : '', gname = (o && o.g && o.g.guildName) || '';
  const mine = (!IU && st && Array.isArray(st.guilds)) ? st.guilds.filter(x => GUILD_OK(x.id) && (x.role === 'owner' || x.role === 'mod')) : [];
  const want = new URLSearchParams(location.search).get('guild');
  if (!guild && want && mine.some(x => x.id === want)) { guild = want; gname = (mine.find(x => x.id === want) || {}).name || ''; }
  if (mine.length) {
    const gc = el('div', 'mb-chips', null, { role: 'group', 'aria-label': en('Hosted by') });
    const gp = () => {
      gc.textContent = '';
      [['', en('Just me'), '']].concat(mine.map(x => [x.id, x.name, x.role === 'owner' ? en('You run it') : en('You are a mod')])).forEach(([v, t, sub]) => {
        const b = btn('mb-chip', null, () => { guild = v; gname = v ? (mine.find(x => x.id === v) || {}).name || '' : ''; gp(); });
        b.append(el('b', null, t)); if (sub) b.append(el('span', null, sub));
        b.setAttribute('aria-pressed', String(guild === v)); gc.append(b);
      });
    };
    gp();
    wrap.append(el('span', 'mb-l', en('Hosted by')), gc, el('p', 'mb-hint', en('A guild\'s gathering shows on the guild\'s page too.')));
  }
  return {
    node: wrap,
    read() {
      const out = { minRep: lvl };
      if (!IU) { out.guild = guild; out.guildName = guild ? String(gname).slice(0, 40) : ''; }
      return out;
    },
  };
}
/* The rows that go in the same batch as a gathering: its row in the guild that hosts it. */
export function batchRows(F, db, gid, doc) {
  if (IU || !doc || !GUILD_OK(doc.guild)) return [];
  return [[F.doc(db, 'guilds', doc.guild, 'events', gid), { at: F.serverTimestamp() }]];
}

/* ------------------------------------------------------------------ for members.js: a gathering's card and its page */
export function marks(g) {
  if (!g) return null;
  const row = el('p', 'mz-marks');
  if (g.minRep === 10 || g.minRep === 50) {
    const t = ((MZ() && MZ().tiers) || []).find(x => x.from === g.minRep);
    row.append(el('span', 'mz-tag mz-tag-lvl', g.minRep === 50 ? tt('Trusted members only') : tt('Known members only'), { title: t ? w(t.can) : '' }));
  }
  if (!IU && GUILD_OK(g.guild) && g.guildName) row.append(el('a', 'mz-tag mz-tag-guild', g.guildName, { href: page(((MZ() && MZ().guildPaths) || {}).one + '?id=' + encodeURIComponent(g.guild)) }));
  if (!IU && FROM_OK(g.from) && fromName(g.from)) {
    const h = fromHref(g);
    row.append(h ? el('a', 'mz-tag mz-tag-from', en('From {tool}', { tool: fromName(g.from) }), { href: h }) : el('span', 'mz-tag mz-tag-from', en('From {tool}', { tool: fromName(g.from) })));
  }
  return row.childNodes.length ? row : null;
}
/* The part of a gathering's page this file draws: why the level, the check-in, the vouch (Liberty Politics). */
export async function gathering(G, body, o) {
  await data();
  if (!G || !body || !MZ()) return;
  const u = o && o.u, F = o && o.F, db = o && o.db;
  if ((G.minRep === 10 || G.minRep === 50) && u && u.uid !== G.hostUid) {
    const st = await standing(u.uid), rep = st && typeof st.rep === 'number' ? st.rep : 0;
    if (rep < G.minRep) {
      const p = el('p', 'mz-say');
      p.append(el('b', null, G.minRep === 50 ? tt('Trusted members only') : tt('Known members only')), ' ' + (IU ? tt('You have {n} reputation, and this one asks for {m}. It grows when members like what you write and when you go to public events.', { n: rep, m: G.minRep }) : tt('You have {n} reputation, and this one asks for {m}. It grows when members like what you write and when you come to gatherings.', { n: rep, m: G.minRep })));
      body.append(p);
    }
  }
  if (IU || !u || !F || !db || G.status === 'cancelled' || G.held === 'none' || G.held === 'no') return;
  const start = ms(G.startAt), now = Date.now();
  const roomOpen = now > start - 3 * 3600000 && now < start + 24 * 3600000;
  const isHost = u.uid === G.hostUid;
  let mine = null;
  if (!isHost) { try { const s = await F.getDoc(F.doc(db, 'gatherings', G.id, 'guests', u.uid)); mine = s.exists() ? s.data() : null; } catch (x) { } }
  if (!isHost && (!mine || mine.status !== 'in')) return;
  const sec = el('section', 'mb-f mz-room', null, { id: 'checkin' });
  const line = el('p', 'mb-say', '', { role: 'status', 'aria-live': 'polite' });
  sec.append(el('h2', 'mb-h2', en('At the gathering')));
  let checked = isHost;
  if (!isHost) { try { checked = (await F.getDoc(F.doc(db, 'gatherings', G.id, 'checkin', u.uid))).exists(); } catch (x) { } }
  if (isHost && roomOpen) {
    const show = el('p', 'mz-code', '', { 'aria-live': 'polite' });
    const draw = c => { show.textContent = c ? c.split('').join(' ') : ''; };
    try { const s = await F.getDoc(F.doc(db, 'gatherings', G.id, 'code', 'c')); const d = s.exists() ? s.data() : null; if (d && ms(d.at) > now - 6 * 3600000) draw(d.code); } catch (x) { }
    const make = btn('btn btn-key', show.textContent ? en('Make a new code') : en('Show the check-in code'), async () => {
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = new Uint32Array(6); crypto.getRandomValues(r);
      const c = Array.from(r, x => A[x % A.length]).join('');
      make.disabled = true;
      try { await within(20000, F.setDoc(F.doc(db, 'gatherings', G.id, 'code', 'c'), { code: c, at: F.serverTimestamp() })); draw(c); make.textContent = en('Make a new code'); say(line, en('Show this to everyone in the room. It is good for six hours.')); }
      catch (e) { say(line, words(e), true); }
      make.disabled = false;
    });
    sec.append(el('p', 'mb-hint', en('The people who came type this code on this page. It proves they were there, so they can vouch for each other and it counts toward their reputation.')), show, make);
  } else if (!isHost && !checked && roomOpen) {
    const inp = el('input', 'mz-codein', null, { type: 'text', inputmode: 'text', autocapitalize: 'characters', autocomplete: 'off', maxlength: '6', spellcheck: 'false', 'aria-label': en('The check-in code') });
    const go = btn('btn btn-key', en('Check in'), async () => {
      const c = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (c.length !== 6) { say(line, en('The code is six letters and numbers. Ask the host to show it.'), true); return; }
      go.disabled = true; say(line, en('Checking.'));
      try { await within(20000, F.setDoc(F.doc(db, 'gatherings', G.id, 'checkin', u.uid), { uid: u.uid, name: u.name, code: c, at: F.serverTimestamp() })); checked = true; say(line, en('You are checked in. Thank you for coming.')); inp.remove(); go.remove(); vouches(); }
      catch (e) { go.disabled = false; say(line, e && e.code === 'permission-denied' ? en('That code is not right, or it is no longer good. Ask the host for the code on their screen.') : words(e), true); }
    });
    const r = el('div', 'mz-coderow'); r.append(inp, go);
    sec.append(el('p', 'mb-hint', en('At the gathering? Type the code the host shows you. It proves you were there.')), r);
  } else if (!isHost && checked) sec.append(el('p', 'mb-lede', en('You checked in.')));
  else if (now < start - 3 * 3600000) sec.append(el('p', 'mb-hint', en('Check-in opens three hours before it starts. The host shows a code in the room.')));
  const vbox = el('div', 'mz-vouch');
  sec.append(vbox, line);
  async function vouches() {
    vbox.textContent = '';
    if (!checked || now < start || now > start + 14 * 86400000) return;
    let ids = [];
    try { const s = await F.getDocs(F.query(F.collection(db, 'gatherings', G.id, 'checkin'), F.limit(100))); ids = s.docs.map(d => Object.assign({ id: d.id }, d.data())); } catch (x) { return; }
    const people = ids.filter(x => x.id !== u.uid).map(x => ({ id: x.id, name: x.name }));
    if (!isHost) people.unshift({ id: G.hostUid, name: G.hostName, host: true });
    if (!people.length) return;
    let given = new Set();
    try { const s = await F.getDocs(F.query(F.collection(db, 'gatherings', G.id, 'vouches'), F.where('from', '==', u.uid), F.limit(100))); given = new Set(s.docs.map(d => d.data().to)); } catch (x) { }
    vbox.append(el('h3', 'mb-h3', en('Who you met')), el('p', 'mb-hint', en('Vouch only for people you met here and trust. It is the strongest thing anyone can say about a member, and only the two of you see who said it.')));
    const ul = el('ul', 'mz-people');
    people.forEach(p => {
      const li = el('li', 'mb-row');
      const k = K();
      li.append(k && k.face ? k.face(p.name, p.id) : el('span'), el('a', null, p.name + (p.host ? ' · ' + en('host') : ''), { href: page(((DATA && DATA.paths && DATA.paths.member) || 'member/') + '?u=' + encodeURIComponent(p.id)) }));
      if (given.has(p.id)) li.append(el('span', 'mz-tag mz-tag-ok', en('Vouched')));
      else {
        let armed = false, tm = 0;
        const b = btn('mb-text mz-vbtn', en('I met them and trust them'), async () => {
          if (!armed) { armed = true; b.textContent = en('Tap again to vouch'); b.classList.add('armed'); tm = setTimeout(() => { armed = false; b.textContent = en('I met them and trust them'); b.classList.remove('armed'); }, 7000); return; }
          clearTimeout(tm); b.disabled = true;
          try { await within(20000, F.setDoc(F.doc(db, 'gatherings', G.id, 'vouches', u.uid + '_' + p.id), { from: u.uid, to: p.id, at: F.serverTimestamp() })); b.replaceWith(el('span', 'mz-tag mz-tag-ok', en('Vouched'))); }
          catch (e) { b.disabled = false; say(line, words(e), true); }
        });
        li.append(b);
      }
      ul.append(li);
    });
    vbox.append(ul);
  }
  if (sec.childNodes.length > 2 || checked) { body.append(sec); vouches(); }
}

/* ------------------------------------------------------------------ for members.js: an account deleted */
export async function drop(uid, F, db) {
  try { const s = await F.getDocs(F.query(F.collection(db, 'users', uid, 'used'), F.limit(50))); for (const d of s.docs) await F.deleteDoc(d.ref).catch(() => { }); } catch (x) { }
}

/* ------------------------------------------------------------------ start */
async function start() {
  await data();
  if (!MZ()) return;
  forwardNew();
  trackTool();
  drawDoor();
  guildBand();
  window.LPMZ = { ready: true, day: markDay };      // for the tests and for a tool that would rather call than dispatch
  const gp = D.querySelector('[data-mz]');
  if (gp) {
    const h = { el, btn, tt, en, w, say, within, me, fb, page, K, IU, LANG, dig, ms, words, GUILD_OK };
    try { const G = await import('./guilds.js'); if (G && G.init) await G.init(gp, { DATA, MZ: MZ(), standing, v9, h }); } catch (x) { const b = gp.querySelector('[data-mz-body]'); if (b) { b.setAttribute('aria-busy', 'false'); b.textContent = tt('Something went wrong. Try again in a moment.'); } }
  }
}
if (!window.__lpmz) { window.__lpmz = true; if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start(); }
