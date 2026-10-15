/* The members engine: the front question, the questions after sign-up, profiles, and the gatherings board.

   ONE FILE FOR BOTH SITES (libertypolitics.com, iranuncensored.com). build/members.py prints the parts and copies this
   file to assets/members.js; script_tags() loads it on every page. A part that is not on the page costs nothing.
   How it all works, in one place: ../README.md, "Members: profiles, the front question, the gatherings board".

   WHAT IT NEEDS. community.js (window.LP.members): Firebase once it is loaded, who is signed in, the sign-in panel, the
   words (tt) and faces. assets/members-data.json (written by members.py): the questions, the formats, the limits, the
   levels, the avatars. Without community.js the pages say what they are and nothing breaks.

   WHAT IT DOES, BY PART
   [data-fq]                the front page's ONE call to action (15 October 2026, Armin: "at the top we should just have
                            one call to action, which is 'Join the Fight'"). Signed out it opens the sign-up panel; signed
                            in it leads to where the reader chose to fight, or opens the questions below at the first one.
   after sign-in            how will you fight (the front question, data/front-ask.json "front": its line and a button to
                            where it leads), then the second question, and (Liberty Politics only) the state or country,
                            one tap each, skippable, in a panel of its own once the sign-in panel has closed. A tap on the
                            first is counted once per browser (front/<day>-<answer>, no name, no account). On the Iran site
                            the answer that says a reader is inside Iran ("free") is never offered here, so it is never
                            kept against an account. Never asked of a reader who said they are inside Iran. Asked again
                            from the reader's own profile until answered.
   [data-mb="front-board"]  the next three gatherings on the front page, or only the one button to host the first.
   [data-mb="board"]        gatherings/: every upcoming gathering, a filter by state or country.
   [data-mb="new"]          gatherings/new/: the host's form. No address field: the place is private and only accepted
                            guests read it. Two ticks (a public place for a first meeting, 18 and over) are required.
   [data-mb="one"]          gatherings/g/?id=: one gathering. I'm in, the host's yes or no, the place for accepted guests,
                            and after it started the guest's rating (1 to 5) and private note to the host.
   [data-mb="member"]       member/?u=<account id>: a profile. The owner edits it here: a drawn avatar or a photo made
                            small in this browser (256 pixels, a JPEG of 60 KB at most, kept in the profile document), one
                            line about them. A new photo is shown to others only once the site has looked at it.
   [data-q-tick]            the missions that tick themselves (make your account, answer the two questions, finish your
                            profile): data-q-tick-on is set when this reader's account shows it done, and quests.js is told
                            through the event "lp:members" and window.LPMembers.state(). XP for them is never claimed
                            here: build/quests.py grants it from what build/people.py reads.
   the account panel        one more line: Your profile.

   Every sentence a reader sees goes through tt('English sentence'), and its Persian is in
   ../../site-iu/build/community-strings.json (site-iu/build/strings_check.py fails while one is missing).
   A person's words (a name, a bio, a title) reach the page through textContent, never as markup. */

const D = document, H = D.documentElement;
const ROOT = H.getAttribute('data-root') || './';
const SITE = (window.LPSITE && typeof window.LPSITE === 'object') ? window.LPSITE : {};
const BASE = typeof SITE.base === 'string' ? SITE.base : '';
const K = (window.LP && window.LP.members) || null;
const SITE_KEY = (() => { const s = D.querySelector('script[src*="members.js"][data-site]'); return (s && s.getAttribute('data-site')) || 'lp'; })();
const IU = SITE_KEY === 'iu';
const LANG = (H.getAttribute('lang') || 'en').slice(0, 2) === 'fa' ? 'fa' : 'en';
const STR = SITE.strings || null, DIGITS = typeof SITE.digits === 'string' && SITE.digits.length === 10 ? SITE.digits : '';
const dig = K ? K.dig : n => (DIGITS ? String(n).replace(/[0-9]/g, d => DIGITS[d]) : String(n));
const tt = K ? K.tt : (s, v) => {
  let out = STR && typeof STR[s] === 'string' ? STR[s] : s;
  if (v) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in v ? (typeof v[k] === 'number' ? dig(v[k]) : String(v[k])) : m));
  return out;
};
const w = v => (v && typeof v === 'object' ? (v[LANG] || v.en || '') : (typeof v === 'string' ? v : ''));
const QUIET = !!(K && K.quiet);
function el(tag, cls, text, attrs) {
  const e = D.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function btn(cls, text, fn) { const b = el('button', cls, text, { type: 'button' }); if (fn) b.addEventListener('click', fn); return b; }
function say(line, text, bad) { line.textContent = text || ''; line.classList.toggle('bad', !!bad); }
const within = (ms, p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no({ code: 'lp/slow' }), ms))]);
const words = e => (K && K.words ? K.words(e) : tt('Something went wrong. Try again in a moment.'));
/* What this device keeps: an answer tapped before signing in, and whether the questions were put off. On a site whose
   readers may have their phone looked through (LPSITE.safety, the Iran site), it lasts only for the visit. */
const KEEP = (() => { try { const s = SITE.safety ? window.sessionStorage : window.localStorage; s.getItem('x'); return s; } catch (x) { return null; } })();
const kept = { get(k) { try { return KEEP ? JSON.parse(KEEP.getItem(k)) : null; } catch (x) { return null; } },
  set(k, v) { try { if (KEEP) { if (v == null) KEEP.removeItem(k); else KEEP.setItem(k, JSON.stringify(v)); } } catch (x) { } } };
const KEY = { front: SITE_KEY + '-front', counted: SITE_KEY + '-front-n', skip: SITE_KEY + '-onb-skip', filter: SITE_KEY + '-mb-where' };
const today = () => String(Math.floor(Date.now() / 86400000));
const me = () => { try { return K ? K.who() : null; } catch (x) { return null; } };
const fb = () => (K && !K.off ? K.fb() : Promise.reject({ code: 'lp/off' }));
const page = p => ROOT + BASE + p;
let DATA = null, dataAsk = null;
function data() {
  if (!dataAsk) dataAsk = fetch(ROOT + 'assets/members-data.json').then(r => r.json()).then(d => (DATA = d)).catch(() => (DATA = null));
  return dataAsk;
}
const idOk = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(s);
/* The same test the database applies to words a reader puts in a public document (noAddress() in firestore.rules). */
const ADDRESS = [/[0-9]+[a-z]?[ ,.]+([a-z.]+ ){0,3}(street|st|avenue|ave|road|rd|boulevard|blvd|lane|drive|highway|hwy|parkway|pkwy|terrace|crescent)([^a-z]|$)/,
  /(apt|apartment|suite|unit|flat|po box)[ .#:]*[0-9]/, /[0-9]{5}/, /[0-9][0-9 ().-]{7,}[0-9]/];
const looksLikeAddress = s => { const l = String(s || '').toLowerCase(); return ADDRESS.some(r => r.test(l)); };
const ms = t => (t && typeof t.toMillis === 'function' ? t.toMillis() : 0);
const same = (a, b) => !!(a && b && typeof a.isEqual === 'function' && a.isEqual(b));

/* ------------------------------------------------------------------ the reader's own account, as this file sees it */
let PRIV = null, PROF = null, mineFor = '', MYPOSTS = { post: false, reply: false };
/* post and reply (15 October 2026, community-strategy.md "THE RECRUITMENT SCREEN"): the reader has a live post of their own
   that starts a thread, and one that answers somebody. The Enlist missions "Carry out your first order" and "Answer another
   member" tick themselves from these, and build/people.py grants their XP from the same posts. */
const STATE = { account: false, questions: false, profile: false, post: false, reply: false };
function questionsDone(p) { return !!p && (IU ? !!p.role : !!(p.freedom && p.fight)); }
function profileDone(p) { return !!p && !!(p.bio && p.bio.trim()) && !!(p.avatar || p.pic); }
function paintState() {
  const u = me();
  STATE.account = !!u;
  STATE.questions = !!u && questionsDone(PRIV);
  STATE.profile = !!u && profileDone(PROF);
  STATE.post = !!u && MYPOSTS.post;
  STATE.reply = !!u && MYPOSTS.reply;
  D.querySelectorAll('[data-q-tick]').forEach(t => { if (STATE[t.getAttribute('data-q-tick')]) t.setAttribute('data-q-tick-on', ''); else t.removeAttribute('data-q-tick-on'); });
  try { D.dispatchEvent(new CustomEvent('lp:members', { detail: Object.assign({}, STATE) })); } catch (x) { }
}
async function loadMine(force) {
  const u = me();
  if (!u) { PRIV = PROF = null; mineFor = ''; MYPOSTS = { post: false, reply: false }; paintState(); return; }
  if (mineFor === u.uid && !force) return;
  mineFor = u.uid;
  try {
    const { F, db } = await within(25000, fb());
    const [a, b, c] = await Promise.all([F.getDoc(F.doc(db, 'private', u.uid)).catch(() => null), F.getDoc(F.doc(db, 'profiles', u.uid)).catch(() => null),
      F.getDocs(F.query(F.collection(db, 'posts'), F.where('uid', '==', u.uid), F.where('status', '==', 'live'), F.limit(50))).catch(() => null)]);
    PRIV = a && a.exists() ? a.data() : null;
    PROF = b && b.exists() ? b.data() : null;
    if (c) { const ps = c.docs.map(d => d.data()).filter(p => p.tag !== 'report' && !/^quest:/.test(String(p.about || ''))); MYPOSTS = { post: ps.some(p => !p.parent), reply: ps.some(p => !!p.parent) }; }
  } catch (x) { }
  paintState();
}
/* The private document is written whole every time (the rules want every field), from what is there and what changed. */
async function savePrivate(patch) {
  const u = me();
  if (!u) throw { code: 'lp/signedout' };
  const { F, db } = await within(25000, fb());
  const ref = F.doc(db, 'private', u.uid);
  if (!PRIV) { try { const s = await F.getDoc(ref); PRIV = s.exists() ? s.data() : null; } catch (x) { } }
  const was = PRIV || {};
  const next = IU ? { role: was.role || '' } : { freedom: was.freedom || '', other: was.other || '', fight: was.fight || '', country: was.country || '', state: was.state || '' };
  for (const k in patch) if (k in next) next[k] = patch[k];
  if (!IU && next.freedom !== 'other') next.other = '';
  if (!IU && next.country !== 'US') next.state = '';
  await within(20000, F.setDoc(ref, Object.assign({}, next, { updatedAt: F.serverTimestamp() })));
  PRIV = next;
  paintState();
}

/* ------------------------------------------------------------------ the front question */
async function countTap(a) {
  const { F, db } = await within(25000, fb());
  const ref = F.doc(db, 'front', today() + '-' + a);
  try { await F.updateDoc(ref, { n: F.increment(1) }); return; } catch (x) { }
  try { await F.setDoc(ref, { day: today(), a, n: 1 }); } catch (x) { await F.updateDoc(ref, { n: F.increment(1) }); }
}
async function counts() {
  const { F, db } = await within(25000, fb());
  const out = {};
  let through = '';
  try {
    const t = await F.getDoc(F.doc(db, 'front', '_total'));
    if (t.exists()) { const c = t.data().counts || {}; for (const k in c) if (typeof c[k] === 'number') out[k] = c[k]; through = String(t.data().through || ''); }
  } catch (x) { }
  const col = F.collection(db, 'front');
  const snap = await F.getDocs(through ? F.query(col, F.where('day', '>', through), F.limit(20)) : F.query(col, F.limit(20)));
  snap.docs.forEach(d => { const v = d.data(); if (typeof v.a === 'string' && typeof v.n === 'number' && d.id !== '_total') out[v.a] = (out[v.a] || 0) + v.n; });
  return out;
}
/* The front answers a reader can be offered after sign-up: never one marked "free" (on the Iran site, the answer that says
   the reader is inside Iran is never kept against an account, so it is never asked for here). */
const frontField = () => (DATA && DATA.front && DATA.front.field) || (IU ? 'role' : 'fight');
const frontAnswers = () => ((DATA && DATA.front && DATA.front.answers) || []).filter(a => a && a.id && !a.free);
/* Where a front answer leads ("path"): a page of the site, or "#discussion", the front page's discussion. */
function frontDest(a) {
  const p = String((a && a.path) || '');
  if (!p) return '';
  if (p.charAt(0) === '#') return D.getElementById(p.slice(1)) ? p : page('') + p;
  return page(p);
}
/* The answer's line ("line": what the account gets them) once the account exists: the sentence that asks them to make
   one is left out, so the reader is never told to make the account they just made. */
function lineAfter(a) {
  return w(a && a.line).split(/(?<=[.!?؟])\s+/).filter(s => s && !/\baccounts?\b|حساب/i.test(s)).join(' ');
}
function initFront() {
  const box = D.querySelector('[data-fq]');
  const go = box && box.querySelector('[data-fq-keep]');
  if (!go) return;
  /* 15 October 2026, Armin: "When I select these buttons, nothing really changes ... I think at the top we should just have
     one call to action, which is 'Join the Fight'". The answers left the front page for the questions after sign-up (the
     first step of askQuestions). ONE button, on screen from the first paint:
       signed out                     opens the sign-up panel (its href, the sign-in page, is the way with scripts off);
       signed in, answered            leads where that answer leads ("go", "path"); an answer that is not one of the front
                                      answers (an older question's) leads where the first one does, the discussion;
       signed in, not answered yet    opens the questions after sign-up at how-will-you-fight. A reader who said they are
                                      inside Iran is never asked: the button leads to the discussion. */
  const keepText = go.textContent, keepHref = go.getAttribute('href');
  const FIELD = box.getAttribute('data-fq-field') || frontField();
  let lead = null, fetching = false;      // lead: where the button goes for this reader; null: it opens a panel
  function paintGo() {
    const u = me();
    lead = null;
    if (u && !DATA && !fetching) { fetching = true; data().then(paintGo); }
    if (u && DATA) {
      const ans = frontAnswers(), had = mineFor === u.uid && PRIV ? PRIV[FIELD] : '';
      const a = (had && ans.find(x => x.id === had)) || (had || insideIran() ? ans.find(x => x.go && x.path) : null);
      if (a && a.go && a.path) lead = { text: w(a.go), href: frontDest(a) };
    }
    go.textContent = lead ? lead.text : keepText;
    go.setAttribute('href', lead ? lead.href : keepHref);
  }
  go.addEventListener('click', async ev => {
    if (!K) return;      // no accounts on this build: the link to the sign-in page
    if (!me()) { ev.preventDefault(); K.open('auth', { opener: go }); if (!K.off) fb().catch(() => { }); return; }
    if (lead) return;      // a link: it goes where the reader chose
    ev.preventDefault();
    try { await data(); await loadMine(); } catch (x) { }
    paintGo();
    if (lead) { window.location.assign(go.href); return; }
    askQuestions(true).catch(() => { });
  });
  paintGo();
  D.addEventListener('lp:members', paintGo);
  if (K) K.sub(paintGo);
}
/* One answer onto the reader's private document, in the field its question names. The Iran site keeps the role and nothing
   else (its rules refuse any other field), so a front answer there is kept only when the field is role. */
function keepAnswer(field, a, other) {
  if (IU) return field === 'role' ? savePrivate({ role: a }) : Promise.resolve();
  if (field === 'freedom') return savePrivate({ freedom: a, other: a === 'other' ? String(other || '').slice(0, 80) : '' });
  if (field === 'fight') return savePrivate({ fight: a });
  return Promise.resolve();
}
/* An answer tapped before the account was made goes onto it the moment the reader is signed in, unless the account already
   holds one. A pick kept before 15 October 2026 carries no field: it answered the freedom question. */
async function carryFront() {
  const k = kept.get(KEY.front);
  if (!k || !k.a) return;
  const f = k.f || (IU ? '' : 'freedom');
  if (!f || (PRIV && PRIV[f])) return;
  await keepAnswer(f, k.a, k.other);
}

/* ------------------------------------------------------------------ the questions after sign-up */
function insideIran() {
  if (!IU) return false;
  if (H.classList.contains('q-inside')) return true;
  try {
    for (const s of [window.sessionStorage, window.localStorage]) for (let i = 0; i < s.length; i++) { const k = s.key(i); if (/quests/.test(k) && /"inside"/.test(s.getItem(k) || '')) return true; }
  } catch (x) { }
  return false;
}
let onb = null;
function sheetOpen() { return [...D.querySelectorAll('dialog.sheet')].some(d => d.open && d !== (onb && onb.dlg)); }
function onbDialog() {
  if (onb) return onb;
  const dlg = el('dialog', 'sheet mb-sheet', null, { 'aria-labelledby': 'mb-onb-h', 'data-clarity-mask': 'true' });
  const inner = el('div', 'sheet-in'), top = el('div', 'sheet-top'), h = el('h2', null, '', { id: 'mb-onb-h', tabindex: '-1' });
  const x = btn('sheet-x', null, () => close()); x.setAttribute('aria-label', tt('Close')); x.textContent = '×';
  const body = el('div', 'sheet-body');
  top.append(h, x); inner.append(top, body); dlg.append(inner); D.body.appendChild(dlg);
  function close() { if (dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); } }
  dlg.addEventListener('click', ev => { if (ev.target === dlg) close(); });
  onb = { dlg, h, body, close };
  return onb;
}
async function askQuestions(force) {
  const u = me();
  if (!u || insideIran()) return;
  await data();
  if (!DATA) return;
  await loadMine();
  /* 15 October 2026 (Armin: one call to action at the top; the how-will-you-fight choice moved to right after the account):
     the steps are how will you fight (the front question, "fight"), the second question ("q"), the place (Liberty Politics
     only), then "done". Each is asked only while its answer is missing. On the Iran site the front question and the second
     one keep the same field (role), so a reader who answered the first is not asked the second. */
  const FF = frontField(), FA = frontAnswers(), S2 = DATA.second, SF = (S2 && S2.field) || (IU ? 'role' : 'freedom');
  const needFight = () => !!FA.length && !(PRIV && PRIV[FF]);
  const needSecond = () => !!(S2 && S2.answers && S2.answers.length) && !(PRIV && PRIV[SF]);
  const needPlace = !IU && DATA.place && DATA.place.ask && !(PRIV && PRIV.country);
  const after = () => (needSecond() ? 'q' : needPlace ? 'place' : 'done');
  if (!needFight() && !needSecond() && !needPlace) return;
  if (!force && kept.get(KEY.skip)) return;
  const O = onbDialog();
  const step = which => {
    O.body.textContent = '';
    if (which === 'fight') {
      O.h.textContent = tt('One more question');
      const F = DATA.front, line = el('p', 'mb-say', '', { role: 'status' }), res = el('div', 'mb-res', null, { 'data-mb-res': '' });
      res.hidden = true;
      O.body.append(el('p', 'sheet-lead', w(F.q)));
      const chips = el('div', 'mb-chips', null, { role: 'group', 'data-mb-fight': '' });
      FA.forEach(a => {
        const b = btn('mb-chip', w(a.text), async () => {
          chips.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          res.hidden = true;
          say(line, tt('Saving.'));
          /* the tap is counted once per browser, with no name and no account (front/<day>-<answer>), as on the front page before */
          if (K && !K.off && !kept.get(KEY.counted)) { kept.set(KEY.counted, 1); countTap(a.id).catch(() => kept.set(KEY.counted, null)); }
          try { await keepAnswer(FF, a.id, ''); } catch (e) { say(line, words(e), true); return; }
          say(line, '');
          res.textContent = '';
          const t = lineAfter(a);
          if (t) res.append(el('p', 'mb-res-l', t));
          const row = el('div', 'mb-res-go');
          if (a.go && a.path) { const g = el('a', 'btn btn-key', w(a.go), { href: frontDest(a) }); g.addEventListener('click', () => O.close()); row.append(g); }
          row.append(btn('btn btn-line', tt('Continue'), () => step(after())));
          res.append(row);
          res.hidden = false;
        });
        b.setAttribute('data-mb-a', a.id);
        b.setAttribute('aria-pressed', 'false');
        chips.append(b);
      });
      O.body.append(chips, line, res, el('p', 'sheet-hint', tt('Only you and I see your answers. I use them to suggest the right missions, never sell them, and delete them when you ask.')),
        btn('mb-text', tt('Not now'), () => { kept.set(KEY.skip, 1); O.close(); }));
    } else if (which === 'q') {
      O.h.textContent = tt('One more question');
      const S = DATA.second, line = el('p', 'mb-say', '', { role: 'status' });
      O.body.append(el('p', 'sheet-lead', w(S.q)));
      const chips = el('div', 'mb-chips', null, { role: 'group' });
      S.answers.forEach(a => chips.append(btn('mb-chip', w(a.text), async ev => {
        chips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === ev.currentTarget)));
        say(line, tt('Saving.'));
        try { await keepAnswer(SF, a.id, ''); step(needPlace ? 'place' : 'done'); }
        catch (e) { say(line, words(e), true); }
      })));
      chips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false'));
      O.body.append(chips, line, el('p', 'sheet-hint', tt('Only you and I see your answers. I use them to suggest the right missions, never sell them, and delete them when you ask.')),
        btn('mb-text', tt('Not now'), () => { kept.set(KEY.skip, 1); O.close(); }));
    } else if (which === 'place') {
      O.h.textContent = tt('One more question');
      O.body.append(el('p', 'sheet-lead', w(DATA.place.q)));
      const pick = placePicker(PRIV || {}, true), line = el('p', 'mb-say', '', { role: 'status' });
      const save = btn('btn btn-key', tt('Save'), async () => {
        const v = pick.value();
        if (!v.country) { say(line, tt('Pick a state or a country first.'), true); return; }
        say(line, tt('Saving.'));
        try { await savePrivate(v); step('done'); } catch (e) { say(line, words(e), true); }
      });
      O.body.append(pick.node, el('p', 'sheet-hint', w(DATA.place.why) || ''), save, line, btn('mb-text', tt('Skip this'), () => step('done')));
    } else {
      O.h.textContent = tt('You\'re in');
      O.body.append(el('p', 'sheet-lead', tt('Now finish your profile: a picture and one line about you.')),
        el('a', 'btn btn-key', tt('Finish your profile'), { href: page('member/?u=' + encodeURIComponent(u.uid) + '#edit') }),
        btn('mb-text', tt('Later'), () => O.close()));
    }
    try { O.h.focus({ preventScroll: true }); } catch (x) { }
  };
  step(needFight() ? 'fight' : needSecond() ? 'q' : 'place');
  if (!O.dlg.open) { if (O.dlg.showModal) O.dlg.showModal(); else O.dlg.setAttribute('open', ''); }
}
/* After sign-in the sign-in panel may still be open (check your email, you are in). The questions wait for it to close. */
function askWhenFree() {
  let n = 0;
  const t = setInterval(() => {
    if (++n > 600 || !me()) { clearInterval(t); return; }
    if (!sheetOpen()) { clearInterval(t); askQuestions(false).catch(() => { }); }
  }, 1000);
}

/* A state or a country (Liberty Politics), or a country (the Iran site, for an event). Named in the reader's language. */
function countryName(c) { try { return new Intl.DisplayNames([LANG === 'fa' ? 'fa' : 'en'], { type: 'region' }).of(c) || c; } catch (x) { return c; } }
function placePicker(was, withStates) {
  const node = el('div', 'mb-f');
  const states = withStates && DATA.states ? DATA.states : null;
  const cs = DATA.countries.filter(c => c !== 'US' || !states).map(c => [c, countryName(c)]).sort((a, b) => a[1].localeCompare(b[1], LANG));
  const top = el('select', null, null, { 'aria-label': states ? tt('Your state, or outside the US') : tt('Country') });
  const second = el('select', null, null, { 'aria-label': tt('Country') });
  top.append(el('option', null, states ? tt('Pick your state') : tt('Pick a country'), { value: '' }));
  if (states) {
    Object.entries(states).sort((a, b) => a[1].localeCompare(b[1])).forEach(([k, n]) => top.append(el('option', null, n, { value: 'US:' + k })));
    top.append(el('option', null, tt('Outside the US'), { value: 'abroad' }));
    second.append(el('option', null, tt('Pick a country'), { value: '' }));
    cs.forEach(([c, n]) => second.append(el('option', null, n, { value: c })));
  } else cs.forEach(([c, n]) => top.append(el('option', null, n, { value: c })));
  if (was.country === 'US' && was.state) top.value = 'US:' + was.state;
  else if (was.country && states) { top.value = 'abroad'; second.value = was.country; }
  else if (was.country) top.value = was.country;
  second.hidden = !(states && top.value === 'abroad');
  top.addEventListener('change', () => { second.hidden = !(states && top.value === 'abroad'); });
  node.append(top, second);
  return { node, top, second, value() {
    const v = top.value;
    if (v.startsWith('US:')) return { country: 'US', state: v.slice(3) };
    if (v === 'abroad') return { country: second.value || '', state: '' };
    return { country: v || '', state: '' };
  } };
}

/* ------------------------------------------------------------------ gatherings: shared pieces */
function fmtName(kind) { const f = DATA && DATA.formats.find(x => x.id === kind); return f ? w(f.name) : ''; }
function when(g) {
  const d = new Date(ms(g.startAt));
  const o = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };
  const loc = LANG === 'fa' ? 'fa-IR-u-ca-gregory' : 'en-US';
  try { return new Intl.DateTimeFormat(loc, Object.assign({ timeZone: g.tz }, o)).format(d); } catch (x) { return new Intl.DateTimeFormat(loc, o).format(d); }
}
function whereOf(g) {
  const st = g.country === 'US' && g.state && DATA && DATA.states ? DATA.states[g.state] : '';
  return [g.city, st || countryName(g.country)].filter(Boolean).join(', ');
}
function ratingLine(g) {
  const s = g.score && typeof g.score === 'object' ? g.score : null;
  if (!s || !s.n) return '';
  const avg = Math.round(s.avg * 10) / 10;
  return s.n === 1 ? tt('Rated {avg} out of 5 by 1 guest', { avg: dig(avg) }) : tt('Rated {avg} out of 5 by {n} guests', { avg: dig(avg), n: s.n });
}
function face(name, uid) { return K && K.face ? K.face(name, uid) : el('span', 'av', String(name || '?').slice(0, 1).toUpperCase()); }
/* What a kind of gathering is, in one line ('about' on a format in data/members.json). A stranger reads the kind's
   name on a card and has no idea what a Liberty Table is without it (Armin, 15 October 2026). */
function aboutOf(kind) { const f = DATA && DATA.formats.find(x => x.id === kind); return f && f.about ? w(f.about) : ''; }
/* A card: the whole card opens the gathering (the title's link is stretched over it, members.css .mb-open), and it says
   where you actually go: the city here, the exact spot only to the guests the host accepts. */
function card(g) {
  const li = el('li', 'mb-card'), href = page(DATA.paths.one + '?id=' + encodeURIComponent(g.id));
  li.append(el('span', 'mb-kind', fmtName(g.kind)));
  const h = el('h3'); h.append(el('a', 'mb-open', g.title, { href })); li.append(h);
  const ab = aboutOf(g.kind); if (ab) li.append(el('p', 'mb-about', ab));
  li.append(el('p', 'mb-when', when(g)), el('p', 'mb-where', whereOf(g)), el('p', 'mb-hint', tt('Only the guests the host says yes to get the exact place.')));
  if (g.line) li.append(el('p', null, g.line));
  const left = Math.max(0, g.size - (g.taken || 0));
  li.append(el('p', 'mb-seats', g.status === 'cancelled' ? tt('Called off') : left ? tt('{n} of {size} seats left', { n: left, size: g.size }) : tt('Full')));
  const host = el('p', 'mb-host mb-row');
  host.append(face(g.hostName, g.hostUid), el('a', null, g.hostName, { href: page(DATA.paths.member + '?u=' + encodeURIComponent(g.hostUid)) }));
  const r = ratingLine(g); if (r) host.append(el('span', null, r));
  li.append(host);
  const acts = el('div', 'mb-acts');
  if (g.status === 'open' && left && ms(g.startAt) > Date.now()) acts.append(el('a', 'btn btn-key mb-btn-s', tt('I\'m in'), { href: href + '#in' }));
  acts.append(el('a', 'btn btn-line mb-btn-s', tt('See the details'), { href }));
  li.append(acts);
  return li;
}
let listAsk = null;
async function upcoming() {
  if (listAsk) return listAsk;
  listAsk = (async () => {
    const { F, db } = await within(25000, fb());
    const col = F.collection(db, 'gatherings'), from = F.Timestamp.fromMillis(Date.now() - 6 * 3600000), lim = (DATA && DATA.limits.board) || 200;
    let snap;
    try { snap = await F.getDocs(F.query(col, F.where('hidden', '==', false), F.where('startAt', '>=', from), F.orderBy('startAt'), F.limit(lim))); }
    catch (e) { if (e && e.code === 'permission-denied') throw e; snap = await F.getDocs(F.query(col, F.where('hidden', '==', false), F.limit(lim))); }      // the index is not there yet
    return snap.docs.map(d => Object.assign({ id: d.id }, d.data()))
      .filter(g => g.status !== 'cancelled' && ms(g.startAt) >= Date.now() - 6 * 3600000).sort((a, b) => ms(a.startAt) - ms(b.startAt));
  })();
  listAsk.catch(() => { listAsk = null; });
  return listAsk;
}
const areaOf = g => (g.country === 'US' ? 'US:' + g.state : g.country);
const myArea = () => kept.get(KEY.filter) || (PRIV && PRIV.country ? (PRIV.country === 'US' && PRIV.state ? 'US:' + PRIV.state : PRIV.country) : '');
function notLive(body) { body.textContent = ''; body.append(el('p', 'mb-empty', tt('The board opens soon. Come back in a day or two.'))); }

/* ------------------------------------------------------------------ the front page's board */
function initFrontBoard() {
  const sec = D.querySelector('[data-mb="front-board"]');
  if (!sec || !K || K.off) return;
  const go = async () => {
    await data();
    if (!DATA) return;
    let all;
    try { all = await upcoming(); } catch (x) { return; }
    if (!all.length) return;
    const mine = myArea(), near = all.filter(g => areaOf(g) === mine), pick = (near.length ? near : all).slice(0, 3);
    const list = sec.querySelector('[data-mb-list]');
    list.textContent = ''; pick.forEach(g => list.append(card(g)));
    list.hidden = false;
    sec.querySelector('[data-mb-has]').hidden = false;
    const all_ = sec.querySelector('[data-mb-all]'); if (all_) all_.hidden = false;
    const first = sec.querySelector('[data-mb-first]'); if (first && first.getAttribute('data-more')) first.textContent = first.getAttribute('data-more');
  };
  if (QUIET) { const once = () => { window.removeEventListener('pointerdown', once, true); window.removeEventListener('keydown', once, true); go().catch(() => { }); }; window.addEventListener('pointerdown', once, true); window.addEventListener('keydown', once, true); }
  else go().catch(() => { });
}

/* ------------------------------------------------------------------ gatherings/: the board */
async function initBoard(box) {
  const body = box.querySelector('[data-mb-body]');
  await data();
  if (!DATA || !K || K.off) { body.setAttribute('aria-busy', 'false'); return; }
  let all;
  try { all = await upcoming(); } catch (e) { body.setAttribute('aria-busy', 'false'); if (e && e.code === 'permission-denied') notLive(body); else body.append(el('p', 'mb-say bad', words(e))); return; }
  if (me()) await loadMine();
  body.textContent = ''; body.setAttribute('aria-busy', 'false');
  const areas = [...new Set(all.map(areaOf))];
  const name = a => (a.startsWith('US:') ? (DATA.states && DATA.states[a.slice(3)]) || a : countryName(a));
  const f = el('div', 'mb-filter'), sel = el('select', null, null, { id: 'mb-where' });
  f.append(el('label', null, tt('Near'), { for: 'mb-where' }), sel);
  sel.append(el('option', null, tt('Everywhere'), { value: '' }));
  areas.map(a => [a, name(a)]).sort((a, b) => a[1].localeCompare(b[1], LANG)).forEach(([a, n]) => sel.append(el('option', null, n, { value: a })));
  const list = el('ul', 'mb-list'), empty = el('p', 'mb-empty');
  const draw = () => {
    const v = sel.value, shown = all.filter(g => !v || areaOf(g) === v);
    list.textContent = ''; shown.forEach(g => list.append(card(g)));
    empty.textContent = shown.length ? '' : (all.length ? tt('Nothing near you yet. Host the first one.') : tt('Nothing on the board yet. Host the first one.'));
    empty.hidden = !!shown.length;
  };
  const mine = myArea();
  sel.value = areas.includes(mine) ? mine : '';
  sel.addEventListener('change', () => { kept.set(KEY.filter, sel.value || null); draw(); });
  if (all.length) body.append(f);
  body.append(list, empty, safety());
  draw();
}
function safety() {
  const s = el('div', 'mb-safe');
  s.append(el('p', null, IU ? tt('Only events that are already public, outside Iran. Nothing inside Iran is ever listed here.') : tt('A first meeting with people from here is always in a public place. Never a home address.')),
    el('p', null, tt('Adults only: 18 and over.')),
    el('p', null, IU ? tt('I never send invitations or files. If someone says they are from here and sends you one, do not open it.') : tt('A gathering belongs to its host. I list it; I don\'t run it, pay for it or decide anything for it.')));
  if (DATA && DATA.safetyPage && !IU) s.append(el('a', null, tt('The safety page'), { href: page(DATA.safetyPage) }));
  return s;
}

/* ------------------------------------------------------------------ gatherings/new/: the host's form */
function field(label, input, hint) {
  const f = el('div', 'mb-f'), id = 'mb-' + Math.random().toString(36).slice(2, 9);
  input.id = id;
  f.append(el('label', null, label, { for: id }), input);
  if (hint) f.append(el('p', 'mb-hint', hint));
  return f;
}
function tick(text) {
  const l = el('label', 'mb-tick'), i = el('input', null, null, { type: 'checkbox' });
  l.append(i, el('span', null, text));
  return { node: l, input: i };
}
function signInFirst(body, text) {
  body.textContent = '';
  const u = me();
  if (u && !u.v) {
    body.append(el('p', 'mb-lede', tt('Confirm your email first. The link is in your inbox.')),
      btn('btn btn-line', tt('Send the link again'), () => K.open('check', { resend: true })));
    return;
  }
  const b = btn('btn btn-key', tt('Sign in or make your account'), () => { K.open('auth', { opener: b }); fb().catch(() => { }); });
  body.append(el('p', 'mb-lede', text), b);
}
async function initNew(box) {
  const body = box.querySelector('[data-mb-body]');
  await data();
  body.setAttribute('aria-busy', 'false');
  if (!DATA || !K || K.off) return;
  const draw = async () => {
    const u = me();
    if (!u || !u.v) { signInFirst(body, IU ? tt('Sign in to post a public event.') : tt('Sign in to host a gathering.')); return; }
    await loadMine();
    if (body.querySelector('form')) return;
    body.textContent = '';
    const L = DATA.limits, form = el('form', 'mb-form', null, { novalidate: '' }), line = el('p', 'mb-say', '', { role: 'status', 'aria-live': 'polite' });
    // the format: one tap
    let kind = DATA.formats.length === 1 ? DATA.formats[0].id : '';
    const chips = el('div', 'mb-chips', null, { role: 'group' });
    const fmt = el('div', 'mb-f'); fmt.append(el('span', 'mb-l', tt('What kind')), chips);
    const size = el('input', null, null, { type: 'number', inputmode: 'numeric', min: '2', max: '60', value: '4' });
    const place = placePicker(PRIV || {}, !IU);
    const fit = () => {
      const f = DATA.formats.find(x => x.id === kind);
      if (f) { size.min = String(f.min); size.max = String(f.max); if (+size.value < f.min || +size.value > f.max) size.value = String(Math.min(f.max, Math.max(f.min, +size.value || f.min))); }
      chips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-k') === kind)));
    };
    DATA.formats.forEach(f => { const b = btn('mb-chip', w(f.name), () => { kind = f.id; fit(); }); b.setAttribute('data-k', f.id); chips.append(b); });
    fit();
    if (DATA.formats.length > 1) form.append(fmt);
    const title = el('input', null, null, { type: 'text', maxlength: String(L.title), autocomplete: 'off' });
    const at = el('input', null, null, { type: 'datetime-local' });
    const city = el('input', null, null, { type: 'text', maxlength: String(L.city), autocomplete: 'address-level2' });
    const lineIn = el('input', null, null, { type: 'text', maxlength: String(L.line), autocomplete: 'off' });
    const link = el('input', null, null, { type: 'url', inputmode: 'url', maxlength: '300', placeholder: 'https://', autocapitalize: 'off', spellcheck: 'false' });
    const where = el('textarea', null, null, { maxlength: String(L.place), rows: '3' });
    const t1 = tick(IU ? tt('This event is already public, and it is outside Iran.') : tt('If anyone coming is someone I haven\'t met, the first meeting is in a public place.'));
    const t2 = tick(tt('Everyone coming is 18 or over.'));
    const t3 = IU ? tick(tt('I am one of its organisers.')) : null;
    form.append(field(tt('Title'), title, IU ? tt('What it is, in a few words.') : tt('What you will talk about, or what you will watch.')),
      field(tt('Day and time'), at, tt('Your own time. It is shown with your time zone.')),
      field(tt('City'), city, tt('The city or town only. Never an address.')));
    const pf = el('div', 'mb-f'); pf.append(el('span', 'mb-l', IU ? tt('Country') : tt('State, or country')), place.node); form.append(pf);
    form.append(field(IU ? tt('How many can come') : tt('How many guests'), size),
      field(tt('One line about it'), lineIn, tt('Optional.')),
      field(tt('Link to its own page'), link, tt('Optional. Your event page somewhere else, if it has one.')),
      field(IU ? tt('Where to meet, for the people you accept') : tt('The place, for the guests you accept'), where, tt('Only you and the guests you say yes to see this. Use a public place for a first meeting.')));
    form.append(t1.node, t2.node); if (t3) form.append(t3.node);
    const go = el('button', 'btn btn-key', IU ? tt('Post the event') : tt('Post the gathering'), { type: 'submit' });
    form.append(go, line, safety());
    body.append(form);
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const bad = (t, node) => { say(line, t, true); if (node) try { node.focus(); } catch (x) { } };
      const T = title.value.trim().replace(/\s+/g, ' '), C = city.value.trim().replace(/\s+/g, ' '), LN = lineIn.value.trim().replace(/\s+/g, ' ');
      let LK = link.value.trim(); if (LK && !/^https?:\/\//i.test(LK)) LK = 'https://' + LK; LK = LK.replace(/^http:/i, 'https:');
      const P = place.value(), start = at.value ? new Date(at.value).getTime() : NaN, n = parseInt(size.value, 10), f = DATA.formats.find(x => x.id === kind);
      if (!f) return bad(tt('Pick what kind of gathering it is.'));
      if (T.length < 3) return bad(tt('Give it a title.'), title);
      if (!(start > Date.now() + 15 * 60000)) return bad(tt('Pick a day and time that is still ahead.'), at);
      if (start > Date.now() + (L.daysAhead - 1) * 86400000) return bad(tt('Pick a day within the next six months.'), at);
      if (C.length < 2 || /[0-9<>]/.test(C)) return bad(tt('Type the city or town, with no numbers.'), city);
      if (!P.country) return bad(IU ? tt('Pick the country.') : tt('Pick the state or the country.'), place.top);
      if (P.country === 'IR') return bad(tt('Nothing inside Iran is ever listed here.'), place.top);
      if (f.us && P.country !== 'US') return bad(tt('This kind of gathering is for the US only.'));
      if (kind === 'registration' && P.state === 'fl') return bad(tt('A registration party is not offered in Florida.'));
      if (!(n >= f.min && n <= f.max)) return bad(tt('Pick between {a} and {b}.', { a: f.min, b: f.max }), size);
      if ([T, LN, C].some(looksLikeAddress)) return bad(tt('That looks like an address or a phone number. Keep the place for the private box below.'));
      if (/[<>]/.test(T + LN)) return bad(tt('Leave out the < and > signs.'));
      if (LK && !/^https:\/\/[^\s<>"']{4,}$/.test(LK)) return bad(tt('That link does not look right. Copy it from the address bar.'), link);
      if (!t1.input.checked || !t2.input.checked || (t3 && !t3.input.checked)) return bad(tt('Tick the boxes above to post it.'));
      go.disabled = true; say(line, tt('Posting.'));
      try {
        const { F, db } = await within(25000, fb()), u = me();
        const ref = F.doc(F.collection(db, 'gatherings'));
        let tz = 'UTC'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (x) { }
        await within(20000, F.setDoc(ref, { hostUid: u.uid, hostName: u.name, kind, title: T, line: LN, startAt: F.Timestamp.fromMillis(start), tz, city: C,
          country: P.country, state: P.state || '', size: n, taken: 0, link: LK, status: 'open', adult: true, publicPlace: true,
          createdAt: F.serverTimestamp(), hidden: false, score: null }));
        const pt = where.value.trim().slice(0, L.place);
        if (pt) await within(20000, F.setDoc(F.doc(db, 'gatherings', ref.id, 'place', 'p'), { text: pt, at: F.serverTimestamp() }));
        listAsk = null;
        location.href = page(DATA.paths.one + '?id=' + encodeURIComponent(ref.id));
      } catch (e) { go.disabled = false; say(line, words(e), true); }
    });
  };
  draw();
  K.sub(() => { if (!body.querySelector('form') || !me()) { body.textContent = ''; draw(); } });
}

/* ------------------------------------------------------------------ gatherings/g/?id=: one gathering */
function twoTap(text, again, fn) {
  let armed = false, t = 0;
  const b = btn('mb-text', text, () => {
    if (!armed) { armed = true; b.textContent = again; b.classList.add('armed'); t = setTimeout(off, 7000); return; }
    clearTimeout(t); off(); fn();
  });
  function off() { armed = false; b.textContent = text; b.classList.remove('armed'); }
  b.addEventListener('blur', () => { if (armed) off(); });
  return b;
}
function reportBox(tid, reasons) {
  const wrap = el('div', 'mb-f'), line = el('p', 'mb-say', '', { role: 'status' });
  const open = btn('mb-text', tt('Report this'), () => {
    if (!me()) { K.open('auth', { opener: open }); return; }
    open.hidden = true;
    const chips = el('div', 'mb-chips', null, { role: 'group', 'aria-label': tt('What is wrong with it?') });
    reasons.forEach(([why, text]) => chips.append(btn('mb-chip', text, async () => {
      say(line, tt('Sending.'));
      try {
        const { F, db } = await within(25000, fb()), u = me();
        await within(20000, F.setDoc(F.doc(db, 'users', u.uid, 'flags', tid), { why, about: tid, at: F.serverTimestamp() }));
        chips.remove(); say(line, tt('Thank you. I will look at it.'));
      } catch (e) { say(line, e && e.code === 'permission-denied' && !me().v ? tt('Confirm your email to report something.') : words(e), true); }
    })));
    wrap.append(el('p', 'mb-l', tt('What is wrong with it?')), chips);
  });
  wrap.append(open, line);
  return wrap;
}
async function initOne(box) {
  const body = box.querySelector('[data-mb-body]'), h1 = box.querySelector('[data-mb-h]');
  await data();
  const id = new URLSearchParams(location.search).get('id') || '';
  if (!DATA || !K || K.off) { body.setAttribute('aria-busy', 'false'); return; }
  if (!idOk(id)) { body.setAttribute('aria-busy', 'false'); body.append(el('p', 'mb-empty', tt('This gathering is not here any more.')), el('a', 'btn btn-line', tt('See the board'), { href: page(DATA.paths.board) })); return; }
  let G = null;
  async function load() {
    const { F, db } = await within(25000, fb());
    const s = await F.getDoc(F.doc(db, 'gatherings', id));
    G = s.exists() ? Object.assign({ id }, s.data()) : null;
  }
  async function draw() {
    try { await load(); } catch (e) { G = null; }
    body.textContent = ''; body.setAttribute('aria-busy', 'false');
    if (!G) { body.append(el('p', 'mb-empty', tt('This gathering is not here any more.')), el('a', 'btn btn-line', tt('See the board'), { href: page(DATA.paths.board) })); return; }
    h1.textContent = G.title;
    try { D.title = G.title + (D.title.includes('|') ? ' |' + D.title.split('|').slice(1).join('|') : ''); } catch (x) { }
    const top = el('div', 'mb-card');
    top.append(el('span', 'mb-kind', fmtName(G.kind)));
    const ab = aboutOf(G.kind); if (ab) top.append(el('p', 'mb-about', ab));
    top.append(el('p', 'mb-when', when(G)), el('p', 'mb-where', whereOf(G)), el('p', 'mb-hint', tt('Only the guests the host says yes to get the exact place.')));
    if (G.line) top.append(el('p', null, G.line));
    const left = Math.max(0, G.size - (G.taken || 0));
    top.append(el('p', 'mb-seats', G.status === 'cancelled' ? tt('Called off') : left ? tt('{n} of {size} seats left', { n: left, size: G.size }) : tt('Full')));
    const host = el('p', 'mb-host mb-row'); host.append(face(G.hostName, G.hostUid), el('span', null, tt('Hosted by')), el('a', null, G.hostName, { href: page(DATA.paths.member + '?u=' + encodeURIComponent(G.hostUid)) }));
    const r = ratingLine(G); if (r) host.append(el('span', null, r));
    top.append(host);
    if (G.link) top.append(el('a', null, tt('Its own page'), { href: G.link, target: '_blank', rel: 'noopener noreferrer nofollow' }));
    body.append(top);
    const u = me(), started = ms(G.startAt) <= Date.now();
    const act = el('div', 'mb-f', null, { id: 'in' }), line = el('p', 'mb-say', '', { role: 'status', 'aria-live': 'polite' });
    body.append(act, line);
    const { F, db } = await within(25000, fb());
    if (u && u.uid === G.hostUid) await hostPanel(act, line, F, db, started);
    else await guestPanel(act, line, F, db, started, u);
    body.append(safety());
    if (u && u.uid !== G.hostUid) body.append(reportBox('g-' + id, [['address', tt('It shows an address')], ['abusive', tt('It is abusive')], ['fake', tt('It is not real')], ['advert', tt('It is an advert')]]));
    if (location.hash === '#in') { const b = act.querySelector('button,input'); if (b) try { b.focus(); act.scrollIntoView({ block: 'center' }); } catch (x) { } }
  }
  async function guestPanel(act, line, F, db, started, u) {
    if (!u) {
      if (!started && G.status === 'open') { const b = btn('btn btn-key', tt('I\'m in'), () => { K.open('auth', { opener: b }); fb().catch(() => { }); }); act.append(b, el('p', 'mb-hint', tt('Sign in first. The host says yes or no, and only the guests they say yes to see the place.'))); }
      return;
    }
    const ref = F.doc(db, 'gatherings', id, 'guests', u.uid);
    let mine = null; try { const s = await F.getDoc(ref); mine = s.exists() ? s.data() : null; } catch (x) { }
    if (!mine) {
      if (started || G.status !== 'open') { act.append(el('p', 'mb-empty', started ? tt('This one has already started.') : tt('Called off'))); return; }
      if (G.size - (G.taken || 0) <= 0) { act.append(el('p', 'mb-empty', tt('Full'))); return; }
      if (!u.v) { act.append(el('p', 'mb-hint', tt('Confirm your email first. The link is in your inbox.'))); return; }
      const t = tick(tt('I am 18 or over.'));
      const b = btn('btn btn-key', tt('I\'m in'), async () => {
        if (!t.input.checked) { say(line, tt('Tick the box first.'), true); return; }
        b.disabled = true; say(line, tt('Sending.'));
        try { await within(20000, F.setDoc(ref, { uid: u.uid, name: u.name, status: 'asked', adult: true, at: F.serverTimestamp() })); draw(); }
        catch (e) { b.disabled = false; say(line, words(e), true); }
      });
      act.append(t.node, b, el('p', 'mb-hint', tt('The host says yes or no. Only the guests they say yes to see the place.')));
      return;
    }
    const drop = () => twoTap(tt('Take back my ask'), tt('Tap again to take it back'), async () => { try { await F.deleteDoc(ref); draw(); } catch (e) { say(line, words(e), true); } });
    if (mine.status === 'asked') { act.append(el('p', 'mb-lede', tt('You asked. The host answers here.'))); if (!started) act.append(drop()); return; }
    if (mine.status === 'no') { act.append(el('p', 'mb-lede', tt('The host can\'t fit you in this time.'))); return; }
    act.append(el('p', 'mb-lede', tt('You\'re in.')));
    try { const p = await F.getDoc(F.doc(db, 'gatherings', id, 'place', 'p')); if (p.exists()) { act.append(el('p', 'mb-l', tt('Where')), el('p', 'mb-place', p.data().text)); } else act.append(el('p', 'mb-hint', tt('The host has not written the place yet. Look again closer to the day.'))); } catch (x) { }
    if (!started) { act.append(drop()); return; }
    // after it started: the rating, once, and a private note to the host
    let rated = null; try { const s = await F.getDoc(F.doc(db, 'gatherings', id, 'ratings', u.uid)); rated = s.exists() ? s.data() : null; } catch (x) { }
    if (rated) { act.append(el('p', 'mb-hint', tt('You rated it {n} out of 5. Thank you.', { n: rated.stars }))); return; }
    let stars = 0;
    const row = el('div', 'mb-stars', null, { role: 'group', 'aria-label': tt('How was it, from 1 to 5?') });
    for (let i = 1; i <= 5; i++) { const s = btn('mb-star', dig(i), () => { stars = i; row.querySelectorAll('button').forEach((x, j) => x.setAttribute('aria-pressed', String(j + 1 === i))); }); s.setAttribute('aria-pressed', 'false'); row.append(s); }
    const note = el('textarea', null, null, { maxlength: String(DATA.limits.note), rows: '3' });
    const send = btn('btn btn-key', tt('Send'), async () => {
      if (!stars) { say(line, tt('Pick a number from 1 to 5.'), true); return; }
      send.disabled = true; say(line, tt('Sending.'));
      try {
        await within(20000, F.setDoc(F.doc(db, 'gatherings', id, 'ratings', u.uid), { stars, at: F.serverTimestamp() }));
        const n = note.value.trim();
        if (n.length >= 2) await within(20000, F.setDoc(F.doc(db, 'gatherings', id, 'notes', u.uid), { text: n.slice(0, DATA.limits.note), at: F.serverTimestamp() }));
        draw();
      } catch (e) { send.disabled = false; say(line, words(e), true); }
    });
    const form = el('div', 'mb-form');
    form.append(el('h2', 'mb-h2', tt('How was it?')), row, field(tt('A private note to the host'), note, tt('Optional. Only the host reads it. Your number stays between you and me.')), send);
    act.append(form);
  }
  async function hostPanel(act, line, F, db, started) {
    act.append(el('h2', 'mb-h2', tt('Your guests')));
    let guests = [];
    try { const s = await F.getDocs(F.query(F.collection(db, 'gatherings', id, 'guests'), F.limit(100))); guests = s.docs.map(d => Object.assign({ id: d.id }, d.data())); } catch (e) { say(line, words(e), true); }
    const list = el('ul', 'mb-guests');
    const recount = async () => {
      const n = guests.filter(g => g.status === 'in').length;
      if (n !== G.taken && n <= G.size) { await F.updateDoc(F.doc(db, 'gatherings', id), { taken: n, hostName: me().name }); G.taken = n; }
    };
    if (!guests.length) act.append(el('p', 'mb-hint', tt('Nobody has asked yet. When someone does, you say yes or no here.')));
    guests.sort((a, b) => ms(a.at) - ms(b.at)).forEach(g => {
      const li = el('li'), who = el('span', 'mb-row');
      who.append(face(g.name, g.id), el('a', null, g.name, { href: page(DATA.paths.member + '?u=' + encodeURIComponent(g.id)) }));
      const st = el('span', 'mb-hint', g.status === 'in' ? tt('Coming') : g.status === 'no' ? tt('Not this time') : tt('Asked'));
      const row = el('span', 'mb-row');
      const set = v => async () => {
        try { await F.updateDoc(F.doc(db, 'gatherings', id, 'guests', g.id), { status: v, at: F.serverTimestamp() }); g.status = v; await recount(); draw(); }
        catch (e) { say(line, words(e), true); }
      };
      if (!started && g.status !== 'in') row.append(btn('btn btn-key mb-btn-s', tt('Yes'), set('in')));
      if (!started && g.status !== 'no') row.append(btn('btn btn-line mb-btn-s', tt('No'), set('no')));
      li.append(who, st, row); list.append(li);
    });
    act.append(list);
    // the place: only the host and the guests they said yes to read it
    const pref = F.doc(db, 'gatherings', id, 'place', 'p');
    let ptext = ''; try { const p = await F.getDoc(pref); ptext = p.exists() ? p.data().text : ''; } catch (x) { }
    const ta = el('textarea', null, null, { maxlength: String(DATA.limits.place), rows: '3' }); ta.value = ptext;
    const saveP = btn('btn btn-line', tt('Save the place'), async () => {
      say(line, tt('Saving.'));
      try { await within(20000, F.setDoc(pref, { text: ta.value.trim().slice(0, DATA.limits.place), at: F.serverTimestamp() })); say(line, tt('Saved.')); } catch (e) { say(line, words(e), true); }
    });
    const pf = el('div', 'mb-form'); pf.append(field(tt('The place, for the guests you accept'), ta, tt('Only you and the guests you say yes to see this. Use a public place for a first meeting.')), saveP);
    act.append(pf);
    if (started) {
      try {
        const s = await F.getDocs(F.query(F.collection(db, 'gatherings', id, 'notes'), F.limit(100)));
        if (s.size) { act.append(el('h2', 'mb-h2', tt('Notes from your guests'))); s.docs.forEach(d => act.append(el('p', 'mb-place', d.data().text))); }
      } catch (x) { }
    }
    if (G.status === 'open' && !started) act.append(twoTap(tt('Call it off'), tt('Tap again to call it off'), async () => {
      try { await F.updateDoc(F.doc(db, 'gatherings', id), { status: 'cancelled', hostName: me().name }); listAsk = null; draw(); } catch (e) { say(line, words(e), true); }
    }));
  }
  await draw();
  K.sub(() => { draw().catch(() => { }); });
}

/* ------------------------------------------------------------------ member/?u=: a profile */
/* A photo made small in this browser: the middle square, 256 pixels, a JPEG of at most limits.picBytes. It never leaves
   the browser at its full size, and the database keeps it in the profile document (no file storage). */
async function shrink(file) {
  const L = DATA.limits, px = L.picPx || 256, most = 'data:image/jpeg;base64,'.length + Math.ceil(L.picBytes / 3) * 4;
  if (!file || !/^image\//.test(file.type || '')) throw { code: 'mb/notimage' };
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no({ code: 'mb/notimage' }); i.src = url; });
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    if (!s) throw { code: 'mb/notimage' };
    const c = D.createElement('canvas'); c.width = c.height = px;
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, px, px);
    x.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, px, px);
    for (const q of [0.86, 0.78, 0.7, 0.6, 0.5, 0.4, 0.3]) { const d = c.toDataURL('image/jpeg', q); if (d.length <= most && d.startsWith('data:image/jpeg;base64,')) return d; }
    throw { code: 'mb/toobig' };
  } finally { URL.revokeObjectURL(url); }
}
function picOf(p, uid, name, own) {
  const box = el('div', 'mb-pic');
  const av = p && p.avatar && DATA.avatars.find(a => a.id === p.avatar);
  const photoOk = p && p.pic && (own || same(p.picOk, p.picAt));
  if (photoOk) box.append(el('img', null, null, { src: p.pic, alt: '', width: '96', height: '96' }));
  else if (av) box.append(el('img', null, null, { src: ROOT + av.src, alt: '', width: '96', height: '96' }));
  else box.append(face(name, uid));
  return box;
}
function levelOf(xp) {
  const L = DATA.levels.slice().sort((a, b) => a.xp - b.xp);
  let i = 0; L.forEach((l, j) => { if (xp >= l.xp) i = j; });
  return { now: L[i], next: L[i + 1] || null };
}
async function initMember(box) {
  const body = box.querySelector('[data-mb-body]'), h1 = box.querySelector('[data-mb-h]');
  await data();
  if (!DATA || !K || K.off) { body.setAttribute('aria-busy', 'false'); return; }
  const q = new URLSearchParams(location.search).get('u') || '';
  let editing = location.hash === '#edit';
  async function draw() {
    const u = me(), uid = idOk(q) ? q : (u ? u.uid : '');
    body.textContent = ''; body.setAttribute('aria-busy', 'false');
    if (!uid) { signInFirst(body, tt('Sign in to see your profile.')); return; }
    const own = !!u && u.uid === uid;
    const { F, db } = await within(25000, fb());
    const get = p => F.getDoc(F.doc(db, ...p)).then(s => (s.exists() ? s.data() : null)).catch(() => null);
    const [P, X] = await Promise.all([get(['profiles', uid]), get(['xp', uid])]);
    if (own) { PROF = P; await loadMine(true); }
    const posts = await F.getDocs(F.query(F.collection(db, 'posts'), F.where('uid', '==', uid), F.where('status', '==', 'live'), F.limit(30))).then(s => s.docs.map(d => Object.assign({ id: d.id }, d.data()))).catch(() => []);
    const hosted = await F.getDocs(F.query(F.collection(db, 'gatherings'), F.where('hostUid', '==', uid), F.where('hidden', '==', false), F.limit(50))).then(s => s.docs.map(d => Object.assign({ id: d.id }, d.data()))).catch(() => []);
    const name = (P && P.name) || (X && X.name) || (posts[0] && posts[0].name) || (own ? u.name : '');
    if (!name) { body.append(el('p', 'mb-empty', tt('This member has not made a profile yet.'))); return; }
    if (P && P.hidden && !own) { body.append(el('p', 'mb-empty', tt('This profile is hidden.'))); return; }
    h1.textContent = name;
    try { D.title = name + (D.title.includes('|') ? ' |' + D.title.split('|').slice(1).join('|') : ''); } catch (x) { }
    const prof = el('div', 'mb-prof'), top = el('div', 'mb-top'), whoBox = el('div', 'mb-who');
    top.append(picOf(P, uid, name, own), whoBox);
    if (P && P.bio) whoBox.append(el('p', 'mb-bio', P.bio));
    else if (own) whoBox.append(el('p', 'mb-hint', tt('Add one line about you.')));
    prof.append(top);
    if (own && P && P.hidden) prof.append(el('p', 'mb-say bad', tt('Your profile is hidden from others while I look at a report about it.')));
    if (own && P && P.pic && !same(P.picOk, P.picAt)) prof.append(el('p', 'mb-hint', tt('Only you see this photo until I have looked at it. Usually within a day.')));
    // the rank
    const xp = X && typeof X.xp === 'number' ? X.xp : 0, lv = levelOf(xp), rank = el('div', 'mb-rank');
    rank.append(el('p', 'mb-kind', tt('Rank')), el('p', 'mb-when', w(lv.now.name) + ' · ' + tt('{n} XP', { n: xp })));
    if (lv.now.line) rank.append(el('p', 'mb-hint', w(lv.now.line)));
    if (lv.next) { const bar = el('div', 'mb-bar'), i = el('i'); i.style.width = Math.max(2, Math.min(100, Math.round(100 * (xp - lv.now.xp) / (lv.next.xp - lv.now.xp)))) + '%'; bar.append(i); rank.append(bar, el('p', 'mb-hint', tt('{n} XP to {level}', { n: lv.next.xp - xp, level: w(lv.next.name) }))); }
    prof.append(rank);
    // missions done
    const done = new Set(), list = el('ul', 'mb-stats');
    Object.values((X && X.reports) || {}).forEach(r => { if (r && r.state === 'accepted' && DATA.missions[r.mission]) done.add(w(DATA.missions[r.mission].title)); });
    if (own) Object.entries(DATA.missions).forEach(([, m]) => { if (m.auto && STATE[m.auto]) done.add(w(m.title)); });
    ((X && X.grants) || []).forEach(g => { if (g && g.what) done.add(g.what); });
    if (done.size) { prof.append(el('h2', 'mb-h2', tt('Missions done'))); [...done].forEach(t => list.append(el('li', null, '✓ ' + t))); prof.append(list); }
    // gatherings hosted
    if (hosted.length) {
      prof.append(el('h2', 'mb-h2', IU ? tt('Events posted') : tt('Gatherings hosted')));
      const ul = el('ul', 'mb-list'); hosted.sort((a, b) => ms(b.startAt) - ms(a.startAt)).forEach(g => ul.append(card(g))); prof.append(ul);
    }
    // what they wrote
    if (posts.length) {
      prof.append(el('h2', 'mb-h2', tt('What they wrote')));
      const ul = el('ul', 'mb-stats');
      posts.sort((a, b) => ms(b.createdAt) - ms(a.createdAt)).slice(0, 10).forEach(p => {
        const path = K.pathOf ? K.pathOf(p.about) : null;
        const li = el('li');
        if (path != null) li.append(el('a', null, p.subject || tt('Open the page'), { href: ROOT + path + '#p-' + p.id }));
        else li.append(el('span', null, p.subject || ''));
        li.append(el('span', 'mb-hint', ' · ' + (K.ago ? K.ago(ms(p.createdAt)) : '')));
        const t = String(p.text || '').trim(); if (t) li.append(el('p', 'mb-hint', t.length > 140 ? t.slice(0, 139) + '…' : t));
        ul.append(li);
      });
      prof.append(ul);
    }
    body.append(prof);
    if (own) {
      if (!questionsDone(PRIV) && !insideIran()) prof.before(btn('btn btn-line', tt('Answer the two questions'), () => askQuestions(true)));
      const edit = btn('btn btn-key', tt('Edit your profile'), () => { editing = true; drawEdit(); });
      prof.before(edit);
      if (editing) drawEdit();
      function drawEdit() {
        edit.hidden = true;
        if (body.querySelector('.mb-edit')) return;
        if (!u.v) { prof.before(el('p', 'mb-say bad mb-edit', tt('Confirm your email first. The link is in your inbox.'))); return; }
        const form = el('form', 'mb-form mb-edit', null, { novalidate: '' }), line = el('p', 'mb-say', '', { role: 'status', 'aria-live': 'polite' });
        let pic = (P && P.pic) || '', avatar = (P && P.avatar) || '';
        const prev = el('div', 'mb-top'), pv = () => { prev.textContent = ''; prev.append(picOf({ pic, avatar, picOk: null, picAt: null }, uid, name, true)); };
        pv();
        form.append(el('h2', 'mb-h2', tt('Your picture')), prev);
        if (IU) form.append(el('p', 'mb-say bad', tt('A face photo can be seen by anyone who opens this page. A drawn picture is safer.')));
        if (DATA.avatars.length) {
          const grid = el('div', 'mb-avs', null, { role: 'group', 'aria-label': tt('Pick a drawn picture') });
          DATA.avatars.forEach(a => {
            const b = btn('mb-av', null, () => { avatar = a.id; pic = ''; grid.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); pv(); });
            b.setAttribute('aria-pressed', String(a.id === avatar && !pic)); b.setAttribute('aria-label', w(a.alt) || a.id); b.setAttribute('data-av', a.id);
            b.append(el('img', null, null, { src: ROOT + a.src, alt: '', width: '64', height: '64', loading: 'lazy' })); grid.append(b);
          });
          form.append(el('p', 'mb-l', tt('Pick a drawn picture')), grid);
        }
        const file = el('input', null, null, { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', 'data-mb-file': '' });
        file.addEventListener('change', async () => {
          const f = file.files && file.files[0];
          if (!f) return;
          say(line, tt('Making it small.'));
          try { pic = await shrink(f); avatar = ''; form.querySelectorAll('.mb-av').forEach(x => x.setAttribute('aria-pressed', 'false')); pv(); say(line, tt('Ready. Save to keep it.')); }
          catch (e) { say(line, e && e.code === 'mb/toobig' ? tt('That picture could not be made small enough. Try another one.') : tt('That file is not a picture.'), true); }
        });
        form.append(field(tt('Or use a photo'), file, tt('It is cut to a square and made small before it leaves your phone.')));
        if (pic) form.append(btn('mb-text', tt('Remove the photo'), () => { pic = ''; pv(); }));
        const bio = el('textarea', null, null, { maxlength: String(DATA.limits.bio), rows: '2' }); bio.value = (P && P.bio) || '';
        const cnt = el('span', 'mb-count'), upd = () => { cnt.textContent = dig(DATA.limits.bio - bio.value.length); };
        bio.addEventListener('input', upd); upd();
        const bf = field(tt('One line about you'), bio, tt('What you care about, or what you would bring to a table. Never your address or your phone number.')); bf.append(cnt);
        form.append(bf, btn('mb-text', tt('Change your name'), () => K.open('account', {})));
        const save = el('button', 'btn btn-key', tt('Save'), { type: 'submit' });
        form.append(save, line);
        form.addEventListener('submit', async ev => {
          ev.preventDefault();
          const B = bio.value.trim().replace(/\s+/g, ' ');
          if (B.length > DATA.limits.bio) { say(line, tt('One line: {n} characters at most.', { n: DATA.limits.bio }), true); return; }
          if (looksLikeAddress(B) || /[<>]/.test(B)) { say(line, tt('Leave out addresses, phone numbers and the < and > signs.'), true); return; }
          save.disabled = true; say(line, tt('Saving.'));
          try {
            const u2 = me(), changed = pic !== ((P && P.pic) || '');
            const doc = { name: u2.name, bio: B, pic, avatar: pic ? '' : avatar, hidden: !!(P && P.hidden), updatedAt: F.serverTimestamp(),
              picAt: changed ? (pic ? F.serverTimestamp() : null) : ((P && P.picAt) || null), picOk: changed ? null : ((P && P.picOk) || null) };
            await within(20000, F.setDoc(F.doc(db, 'profiles', uid), doc));
            editing = false; try { history.replaceState(null, '', location.pathname + location.search); } catch (x) { }
            await draw();
          } catch (e) { save.disabled = false; say(line, words(e), true); }
        });
        prof.before(form);
      }
    } else if (u) body.append(reportBox('p-' + uid, [['picture', tt('The picture')], ['abusive', tt('It is abusive')], ['fake', tt('It pretends to be someone')], ['advert', tt('It is an advert')], ['address', tt('It shows an address')]]));
  }
  try { await draw(); } catch (e) { body.setAttribute('aria-busy', 'false'); body.append(el('p', 'mb-say bad', words(e))); }
  K.sub(() => { if (!body.querySelector('.mb-edit')) draw().catch(() => { }); });
}

/* ------------------------------------------------------------------ start */
function start() {
  window.LPMembers = { state: () => Object.assign({}, STATE), ask: () => askQuestions(true), test: K && K.emu ? { shrink: f => data().then(() => shrink(f)), counts, looksLikeAddress } : null };
  if (K) {
    K.account(() => { const u = me(); return u ? el('a', 'btn btn-line mb-acct', tt('Your profile'), { href: page('member/?u=' + encodeURIComponent(u.uid)) }) : null; });
    K.drop(async uid => {
      const { F, db } = await fb();
      const del = r => F.deleteDoc(r).catch(() => { });
      try {
        const g = await F.getDocs(F.query(F.collection(db, 'gatherings'), F.where('hostUid', '==', uid), F.where('hidden', '==', false), F.limit(100)));
        for (const d of g.docs) { await del(F.doc(db, 'gatherings', d.id, 'place', 'p')); await del(d.ref); }
      } catch (x) { }
      try { const f = await F.getDocs(F.query(F.collection(db, 'users', uid, 'flags'), F.limit(300))); for (const d of f.docs) await del(d.ref); } catch (x) { }
      await del(F.doc(db, 'profiles', uid)); await del(F.doc(db, 'private', uid));
      PRIV = PROF = null; kept.set(KEY.skip, null);
    });
  }
  initFront();
  initFrontBoard();
  const box = D.querySelector('[data-mb]:not([data-mb="front-board"])');
  if (box && K) {
    const kind = box.getAttribute('data-mb');
    ({ board: initBoard, new: initNew, one: initOne, member: initMember })[kind](box).catch(() => { });
  }
  const needs = !!(D.querySelector('[data-q-tick]') || D.querySelector('[data-fq]'));
  let was = !!me();
  if (was && needs) loadMine().then(carryFront).catch(() => { });
  paintState();
  D.addEventListener('lp:posted', ev => { if (ev && ev.detail && ev.detail.report) return; MYPOSTS[ev && ev.detail && ev.detail.reply ? 'reply' : 'post'] = true; paintState(); });
  if (K) K.sub(() => {
    const now = !!me(), came = now && !was; was = now;
    if (!now) { PRIV = PROF = null; mineFor = ''; paintState(); return; }
    if (came || needs) loadMine().then(async () => { await carryFront(); if (came) askWhenFree(); }).catch(() => { });
  });
}
start();
