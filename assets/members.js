/* The members engine: the front question, the questions after sign-up, profiles, and the gatherings board.

   ONE FILE FOR BOTH SITES (libertypolitics.com, iranuncensored.com). build/members.py prints the parts and copies this
   file to assets/members.js?v=5f9b3e31a6; script_tags() loads it on every page. A part that is not on the page costs nothing.
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
   [data-mb="new"]          gatherings/new/: the host's form. Right after the title and the time, "Where is it?": a public
                            place (its name and street address, shown to everyone with Open in Maps; anyone can join, or the
                            host says yes to each) or a home (the full address, required, read only by the host and the guests
                            the host says yes to). Then the hook line, why come (1,000 characters), a cover picture made small
                            in this browser, a video link. Two ticks (a public place for a first meeting, 18 and over).
   [data-mb="one"]          gatherings/g/?id=: one gathering. The cover, where, how many are going, why come, the video, Share.
                            I'm in (at once at an open public place, else the host's yes or no), who is going (for the host
                            and the guests who are in), the host's edit box, and after it started the guest's rating (1 to 5),
                            the private note to the host, and "From the night": photos and videos the host and the guests post.
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
let PRIV = null, PROF = null, mineFor = '', MYPOSTS = { post: false, reply: false, warroom: false };
/* warroom (15 October 2026): the reader has a live post or reply of their own in the War Room's discussion. The Lead mission
   "Bring a plan to the War Room" ticks itself from it, and build/people.py grants its XP from the same posts. The key is
   the room's discussion on each site (build/room.py, KEY_OF). */
const ROOM_KEY = IU ? 'page:room' : 'page:build';
/* post and reply (15 October 2026, community-strategy.md "THE RECRUITMENT SCREEN"): the reader has a live post of their own
   that starts a thread, and one that answers somebody. The Enlist missions "Carry out your first order" and "Answer another
   member" tick themselves from these, and build/people.py grants their XP from the same posts. */
const STATE = { account: false, questions: false, profile: false, post: false, reply: false, warroom: false };
function questionsDone(p) { return !!p && (IU ? !!p.role : !!(p.freedom && p.fight)); }
function profileDone(p) { return !!p && !!(p.bio && p.bio.trim()) && !!(p.avatar || p.pic); }
function paintState() {
  const u = me();
  STATE.account = !!u;
  STATE.questions = !!u && questionsDone(PRIV);
  STATE.profile = !!u && profileDone(PROF);
  STATE.post = !!u && MYPOSTS.post;
  STATE.reply = !!u && MYPOSTS.reply;
  STATE.warroom = !!u && MYPOSTS.warroom;
  D.querySelectorAll('[data-q-tick]').forEach(t => { if (STATE[t.getAttribute('data-q-tick')]) t.setAttribute('data-q-tick-on', ''); else t.removeAttribute('data-q-tick-on'); });
  try { D.dispatchEvent(new CustomEvent('lp:members', { detail: Object.assign({}, STATE) })); } catch (x) { }
}
async function loadMine(force) {
  const u = me();
  if (!u) { PRIV = PROF = null; mineFor = ''; MYPOSTS = { post: false, reply: false, warroom: false }; paintState(); return; }
  if (mineFor === u.uid && !force) return;
  /* a forced read for the same reader keeps what is already known: a post just sent may not be in the query yet */
  const was = mineFor === u.uid ? MYPOSTS : {};
  mineFor = u.uid;
  try {
    const { F, db } = await within(25000, fb());
    const [a, b, c] = await Promise.all([F.getDoc(F.doc(db, 'private', u.uid)).catch(() => null), F.getDoc(F.doc(db, 'profiles', u.uid)).catch(() => null),
      F.getDocs(F.query(F.collection(db, 'posts'), F.where('uid', '==', u.uid), F.where('status', '==', 'live'), F.limit(50))).catch(() => null)]);
    PRIV = a && a.exists() ? a.data() : null;
    PROF = b && b.exists() ? b.data() : null;
    if (c) { const ps = c.docs.map(d => d.data()).filter(p => p.tag !== 'report' && !/^quest:/.test(String(p.about || ''))); MYPOSTS = { post: !!was.post || ps.some(p => !p.parent), reply: !!was.reply || ps.some(p => !!p.parent), warroom: !!was.warroom || ps.some(p => p.about === ROOM_KEY) }; }
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
  // Not on a team member's brand page (brand/, #bp): it is work, and the first thing they see there is their brand
  // (Armin, 17 Oct 2026). The questions wait for any other page, and stay in the account panel's steps.
  if (D.getElementById('bp')) return;
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

/* WHERE IT IS (15 October 2026, Armin: "don't be too conservative when it comes to safety ... Isn't it Meetup? Don't people
   provide addresses?"). placeKind 'public': the venue and its street address are on the gathering, for everyone, with a link
   to a map. placeKind 'home', or a gathering posted before that day (no placeKind): the city only, and the address goes to
   the guests the host says yes to (place/p). The rules (firestore.rules, the gatherings board) hold the same contract. */
const isPublic = g => !!g && g.placeKind === 'public' && !!g.address;
const openJoin = g => isPublic(g) && g.join === 'open';
function mapsHref(g) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([g.venue, g.address].filter(Boolean).join(', ')); }
function mapsLink(text, q) { return el('a', 'mb-map', text, { href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q), target: '_blank', rel: 'noopener noreferrer' }); }
function whereBlock(g) {
  const b = el('div', 'mb-whereb');
  if (isPublic(g)) {
    b.append(el('p', 'mb-venue', g.venue), el('p', 'mb-where', g.address + (whereOf(g) && !g.address.includes(g.city) ? ' · ' + whereOf(g) : '')));
    const m = el('a', 'mb-map', tt('Open in Maps'), { href: mapsHref(g), target: '_blank', rel: 'noopener noreferrer' }); b.append(m);
  } else b.append(el('p', 'mb-where', whereOf(g)), el('p', 'mb-hint', tt('Address sent to guests the host says yes to.')));
  return b;
}
/* How many are going: the guests who are in, and the host. Names are for the host and the guests who are in. */
function goingLine(g) { const n = (g.taken || 0) + 1; return n === 1 ? tt('1 going') : tt('{n} going', { n }); }
/* The picture at the top of a card and of the page: the host's own (thumb on the gathering, the larger one in cover/c), or a
   drawing for its kind, so no card is ever a blank box. */
const GLYPH = {
  table: '<circle cx="60" cy="40" r="17"/><circle cx="25" cy="28" r="7"/><circle cx="95" cy="28" r="7"/><circle cx="25" cy="54" r="7"/><circle cx="95" cy="54" r="7"/>',
  watch: '<rect x="28" y="16" width="64" height="40" rx="4"/><path d="M52 28l14 8-14 8z"/><path d="M48 64h24"/>',
  registration: '<rect x="38" y="12" width="44" height="56" rx="4"/><path d="M47 30h26M47 40h26M47 50h16"/><path d="M50 12v-4h20v4"/>',
  vote: '<path d="M30 40h60v28H30z"/><path d="M48 40l8-24 18 6-6 18"/><path d="M44 52h32"/>',
  'public-event': '<path d="M30 34l40-16v44L30 46z"/><path d="M30 34h-8v12h8"/><path d="M38 47l6 17"/><path d="M80 32c6 4 6 12 0 16"/>',
};
/* COVERS (16 October 2026, Armin, with a screenshot of a card wearing the small line drawing: "For gatherings that people
   have not added a cover for, you should add a cover yourself"). Every gathering without a picture of its own wears one of
   the site's own drawings (members-data.json "covers", the same paintings as the rest of the site): the one its host picked
   (art), else one of its kind's list, chosen by its id so a card and its page always show the same one. Over every cover sits
   the day, like a ticket, so a board of them reads at a glance. After the night, the first photo from its wall (nightPic)
   is the cover of its card under Past gatherings: what it was really like beats any drawing. The line drawing is kept only
   for a site with no drawings. */
const JPEG_OK = s => typeof s === 'string' && /^data:image\/jpeg;base64,/.test(s);
function artOf(g) {
  const C = DATA && DATA.covers;
  if (!C || !C.src) return '';
  if (typeof g.art === 'string' && C.src[g.art]) return g.art;
  const pool = (C.kinds && C.kinds[g.kind] && C.kinds[g.kind].length ? C.kinds[g.kind] : C.all) || [];
  if (!pool.length) return '';
  const s = String(g.id || g.title || '');
  let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}
function dayTile(g) {
  const t = ms(g.startAt); if (!t) return null;
  const loc = LANG === 'fa' ? 'fa-IR-u-ca-gregory' : 'en-US', d = new Date(t);
  const part = o => { try { return new Intl.DateTimeFormat(loc, Object.assign({ timeZone: g.tz }, o)).format(d); } catch (x) { return new Intl.DateTimeFormat(loc, o).format(d); } };
  const tile = el('span', 'mb-day', null, { 'aria-hidden': 'true' });
  tile.append(el('span', 'mb-day-m', part({ month: 'short' })), el('b', null, part({ day: 'numeric' })));
  return tile;
}
function cover(g, big) {
  const box = el('div', 'mb-cover mb-cover-' + String(g.kind || 'table').replace(/[^a-z-]/g, ''));
  const art = artOf(g), afterPic = JPEG_OK(g.nightPic) && ms(g.startAt) < Date.now();
  if (afterPic) {
    box.classList.add('mb-cover-night');
    box.append(el('img', null, null, { src: g.nightPic, alt: '', width: '480', height: '270', decoding: 'async' }));
  } else if (JPEG_OK(g.thumb)) {
    box.append(el('img', null, null, { src: g.thumb, alt: '', width: '480', height: '270', decoding: 'async' }));
  } else if (art) {
    box.classList.add('mb-cover-art');
    box.append(el('img', null, null, { src: ROOT + DATA.covers.src[art], alt: '', width: '800', height: '452', decoding: 'async', loading: big ? 'eager' : 'lazy', 'data-art': art }));
  } else {
    box.classList.add('mb-cover-drawn');
    box.innerHTML = '<svg viewBox="0 0 120 80" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + (GLYPH[g.kind] || GLYPH.table) + '</svg>';
  }
  const tile = dayTile(g); if (tile) box.append(tile);
  if (big) box.classList.add('mb-cover-big');
  return box;
}
/* AFTER THE NIGHT (16 October 2026, Armin: "once an event is done, there should be an option for people to add pictures and
   videos of the event, and it goes to the previous events section ... if an event was scheduled but nobody showed up or it
   didn't actually happen ... How do we deal with that?"). The host answers one question once it has started: did it
   happen? yes (and how many came), none (nobody came) or no (it did not happen): held and came on the gathering. A photo on
   its wall or a guest's rating also says it happened. Nothing says it did not on its own: a gathering nobody vouches for
   leaves the board six hours after it starts and never shows under Past gatherings, and a gathering that did not happen is
   never shown as a failure to anyone but its host, who is handed "Post it again" (same words, a new day). For 30 days the
   host and the guests who came post photos and videos; the first photo becomes the cover of its card under Past gatherings. */
const NIGHT_DAYS = 30;
const begun = g => !!ms(g.startAt) && ms(g.startAt) <= Date.now();
const over = g => !!ms(g.startAt) && ms(g.startAt) < Date.now() - 6 * 3600000;
const withinNight = g => begun(g) && ms(g.startAt) + NIGHT_DAYS * 86400000 > Date.now();
const didNot = g => g.held === 'none' || g.held === 'no';
const happened = g => g.status !== 'cancelled' && !didNot(g) && (g.held === 'yes' || (g.nightN || 0) > 0 || !!(g.score && g.score.n));
const wallOpen = g => withinNight(g) && !didNot(g) && g.status !== 'cancelled';
const askHost = g => withinNight(g) && !g.held && g.status !== 'cancelled';
function pastLine(g) {
  if (g.status === 'cancelled') return tt('Called off');
  if (g.held === 'none') return tt('Nobody came this time');
  if (g.held === 'no') return tt('It did not happen');
  const bits = [];
  if (g.held === 'yes' && g.came > 0) bits.push(g.came === 1 ? tt('1 came') : tt('{n} came', { n: dig(g.came) }));
  if ((g.nightN || 0) > 0) bits.push(tt('Photos and videos from the night'));
  return bits.join(' · ') || (happened(g) ? tt('It happened') : tt('It is over'));
}
const againHref = g => page(DATA.paths.new + '?again=' + encodeURIComponent(g.id));
/* The host's answer, in three taps at most: on the gathering's own page, and on the board for any of theirs still waiting. */
function heldForm(g, done) {
  const box = el('div', 'mb-held'), line = el('p', 'mb-say', '', { role: 'status', 'aria-live': 'polite' });
  const n = el('input', null, null, { type: 'number', inputmode: 'numeric', min: '1', max: '200', value: String(g.held === 'yes' && g.came > 0 ? g.came : (g.taken || 0) + 1) });
  const nf = field(tt('How many came, you included?'), n); nf.hidden = true;
  const btns = [];
  const save = async (held, came) => {
    btns.forEach(b => { b.disabled = true; }); say(line, tt('Saving.'));
    try {
      const { F, db } = await within(25000, fb());
      await within(20000, F.updateDoc(F.doc(db, 'gatherings', g.id), { held, came, hostName: me().name }));
      g.held = held; g.came = came; listAsk = null; done(g);
    } catch (e) { btns.forEach(b => { b.disabled = false; }); say(line, words(e), true); }
  };
  const yes = btn('btn btn-key mb-btn-s', tt('Yes, it happened'), () => {
    if (nf.hidden) { nf.hidden = false; yes.textContent = tt('Save'); try { n.focus(); } catch (x) { } return; }
    const c = parseInt(n.value, 10);
    if (!(c >= 1 && c <= 200)) { say(line, tt('Type how many came, from 1 to 200.'), true); return; }
    save('yes', c);
  });
  const none = btn('btn btn-line mb-btn-s', tt('Nobody came'), () => save('none', 1));
  const no = btn('btn btn-line mb-btn-s', tt('It did not happen'), () => save('no', 0));
  btns.push(yes, none, no);
  const row = el('div', 'mb-acts mb-held-acts'); row.append(yes, none, no);
  box.append(row, nf, line);
  return box;
}
/* What the host sees once they answered: thanks, and the one next step that grows the board. */
function heldNext(g) {
  const box = el('div', 'mb-held-next');
  const href = page(DATA.paths.one + '?id=' + encodeURIComponent(g.id));
  if (g.held === 'yes') {
    box.append(el('p', 'mb-lede', IU ? tt('Thank you. It is under Past events now.') : tt('Thank you. It is under Past gatherings now.')),
      el('p', 'mb-hint', tt('Post your photos and videos, and ask the people who came to post theirs. The first photo becomes its cover.')));
    const r = el('div', 'mb-acts'); r.append(el('a', 'btn btn-key mb-btn-s', tt('Add your photos'), { href: href + '#night' }), el('a', 'btn btn-line mb-btn-s', tt('Host the next one'), { href: againHref(g) }));
    box.append(r);
  } else {
    box.append(el('p', 'mb-lede', g.held === 'none' ? tt('That happens, most of all the first time. It stays off the board.') : tt('Understood. It stays off the board.')),
      el('p', 'mb-hint', tt('Post it again with a new day. Your words, the place and the picture are kept, and the people who saw it once see it again.')));
    box.append(el('a', 'btn btn-key mb-btn-s', tt('Post it again'), { href: againHref(g) }));
  }
  return box;
}
/* Put it in a calendar: a gathering in the calendar is a gathering remembered on the day. Google's own page, or a file any
   calendar opens (with a reminder three hours before). Never on the Iran site: a reader's phone may be looked through. */
function calRow(g, placeText) {
  const t = ms(g.startAt);
  if (IU || !t || t < Date.now()) return null;
  const z = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.[0-9]{3}/, '');
  const end = t + 2 * 3600000;
  let url = ''; try { url = new URL(page(DATA.paths.one + '?id=' + encodeURIComponent(g.id)), location.href).href; } catch (x) { }
  const full = isPublic(g) ? [g.venue, g.address].filter(Boolean).join(', ') : (placeText || whereOf(g));
  const gq = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(g.title || '') + '&dates=' + z(t) + '/' + z(end)
    + '&details=' + encodeURIComponent(url) + '&location=' + encodeURIComponent(isPublic(g) ? full : whereOf(g));
  const esc = s => String(s || '').replace(/[\\;,]/g, m => '\\' + m).replace(/\r?\n/g, '\\n');
  const host = location.hostname || 'gatherings';
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + host + '//gatherings//EN', 'BEGIN:VEVENT', 'UID:' + g.id + '@' + host, 'DTSTAMP:' + z(Date.now()),
    'DTSTART:' + z(t), 'DTEND:' + z(end), 'SUMMARY:' + esc(g.title), 'LOCATION:' + esc(full), 'DESCRIPTION:' + esc(url), 'URL:' + url,
    'BEGIN:VALARM', 'TRIGGER:-PT3H', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(g.title), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const box = el('div', 'mb-f mb-cal'), r = el('div', 'mb-acts');
  r.append(el('a', 'btn btn-line mb-btn-s', tt('Google Calendar'), { href: gq, target: '_blank', rel: 'noopener noreferrer' }),
    el('a', 'btn btn-line mb-btn-s', tt('Other calendar'), { href: 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics), download: 'gathering.ics' }));
  box.append(el('span', 'mb-l', tt('Put it in your calendar')), r, el('p', 'mb-hint', tt('So it does not slip your mind on the day.')));
  return box;
}
/* A video link people can play here: the same player the discussion uses (community.js embedOf, discussion.js plays it on a
   tap; nothing from the other site loads before that). TikTok has no player there: a plain link. */
function tvBox(url, label) {
  const emb = window.LP && window.LP.embedOf ? window.LP.embedOf(url) : null;
  if (!emb) { const a = el('a', 'mb-vid', label || tt('Watch the video'), { href: url, target: '_blank', rel: 'noopener noreferrer nofollow ugc' }); return a; }
  const box = el('div', 'tv tv-' + emb[0].toLowerCase(), null, { 'data-embed': emb[1], 'data-plat': emb[0] });
  const a = el('a', 'tv-play', null, { href: url, target: '_blank', rel: 'noopener noreferrer nofollow ugc' });
  const yt = emb[0] === 'YouTube' && /\/embed\/([\w-]{11})$/.exec(emb[1]);
  if (yt && !QUIET) a.append(el('img', null, null, { src: 'https://i.ytimg.com/vi/' + yt[1] + '/hqdefault.jpg', alt: '', loading: 'lazy', decoding: 'async', width: '480', height: '360' }));
  const cap = el('span', 'tv-what'); cap.append(el('b', null, label || tt('Watch the video')), el('span', null, tt('Play it here · {site}', { site: emb[0] })));
  a.append(el('span', 'tv-go', null, { 'aria-hidden': 'true' }), cap);
  box.append(a);
  return box;
}
const VIDEO_OK = /^https:\/\/(www\.|m\.|vm\.)?(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|x\.com|twitter\.com)\/.+$/;
/* Share: the site's own panel (share.js opens anything with data-share), with this gathering's own address. */
function shareBtn(g) {
  let url = ''; try { url = new URL(page(DATA.paths.one + '?id=' + encodeURIComponent(g.id)), location.href).href; } catch (x) { }
  const b = btn('btn btn-line mb-btn-s mb-share', tt('Share'));
  b.setAttribute('data-share', ''); if (url) b.setAttribute('data-url', url);
  b.setAttribute('data-title', String(g.title || '').slice(0, 80)); if (g.line) b.setAttribute('data-text', String(g.title || '') + ': ' + g.line);
  return b;
}
/* A card: the whole card opens the gathering (the title's link is stretched over it, members.css .mb-open). The picture, the
   hook line, when, where (the address itself for a public place), how many are going, and Share. */
function card(g) {
  const li = el('li', 'mb-card'), href = page(DATA.paths.one + '?id=' + encodeURIComponent(g.id));
  const past = over(g), u = me(), mine = !!(u && u.uid === g.hostUid);
  if (past) li.classList.add('mb-card-past');
  li.append(cover(g));
  li.append(el('span', 'mb-kind', fmtName(g.kind)));
  const h = el('h3'); h.append(el('a', 'mb-open', g.title, { href })); li.append(h);
  if (g.line) li.append(el('p', 'mb-hook', g.line));
  else { const ab = aboutOf(g.kind); if (ab) li.append(el('p', 'mb-about', ab)); }
  li.append(el('p', 'mb-when', when(g)), whereBlock(g));
  const left = Math.max(0, g.size - (g.taken || 0));
  if (past) li.append(el('p', 'mb-seats', pastLine(g)));
  else li.append(el('p', 'mb-seats', g.status === 'cancelled' ? tt('Called off') : goingLine(g) + ' · ' + (left ? tt('{n} of {size} seats left', { n: left, size: g.size }) : tt('Full'))));
  const host = el('p', 'mb-host mb-row');
  host.append(face(g.hostName, g.hostUid), el('a', null, g.hostName, { href: page(DATA.paths.member + '?u=' + encodeURIComponent(g.hostUid)) }));
  const r = ratingLine(g); if (r) host.append(el('span', null, r));
  li.append(host);
  /* Its own discussion, from wherever the card is shown (15 October 2026, Armin: "even if you're not on the page for the
     gathering, you should be able to see that there is an option to discuss this ... the number of people ... and the number
     of comments"). community.js draws it and counts it. */
  const tk = talkKey(g.id);
  const acts = el('div', 'mb-acts');
  if (g.status === 'open' && left && ms(g.startAt) > Date.now()) acts.append(el('a', 'btn btn-key mb-btn-s', tt('I\'m in'), { href: href + '#in' }));
  if (mine && askHost(g)) acts.append(el('a', 'btn btn-key mb-btn-s', tt('Did it happen?'), { href: href + '#happened' }));
  else if (past && happened(g) && wallOpen(g)) acts.append(el('a', 'btn btn-key mb-btn-s', tt('Add your photos'), { href: href + '#night' }));
  acts.append(el('a', 'btn btn-line mb-btn-s', past && g.nightN && !didNot(g) ? tt('See the photos') : tt('See the details'), { href: past && g.nightN && !didNot(g) ? href + '#night' : href }), shareBtn(g));
  if (tk) acts.append(el('a', 'talk-n', tt('Discuss'), { 'data-talk-n': tk, href: href + '#discussion' }));
  li.append(acts);
  return li;
}
/* The key a gathering's discussion is filed under (firestore.rules goodGatheringPost, community.js KEY_OK). */
const talkKey = id => (typeof id === 'string' && /^[A-Za-z0-9]{20}$/.test(id) ? 'gathering:' + id : '');
/* The board, read over plain REST (15 October 2026, Armin on the front page: "It took a while to load, which is weird").
   Through Firebase's own code the front page first fetched members-data.json, then three files of Firebase (the database
   one is large), then waited to learn who was signed in, then asked: a list anyone may read waited on all of it. One
   request now, sent at the same moment as members-data.json. Firebase's own code is still the way when this cannot be
   used (an older community.js still in a browser's cache). */
async function restUpcoming() {
  const lim = (DATA && DATA.limits.board) || 200, live = { fieldFilter: { field: { fieldPath: 'hidden' }, op: 'EQUAL', value: { booleanValue: false } } };
  const ask = async ordered => {
    const where = ordered ? { compositeFilter: { op: 'AND', filters: [live, { fieldFilter: { field: { fieldPath: 'startAt' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: new Date(Date.now() - 6 * 3600000).toISOString() } } }] } } : live;
    const q = { structuredQuery: Object.assign({ from: [{ collectionId: 'gatherings' }], where, limit: lim }, ordered ? { orderBy: [{ field: { fieldPath: 'startAt' }, direction: 'ASCENDING' }] } : {}) };
    return within(15000, fetch(K.rest('runQuery'), { method: 'POST', body: JSON.stringify(q) }));
  };
  const fail = r => (K.httpErr ? K.httpErr(r) : { code: r.status === 429 ? 'lp/busy' : r.status === 403 ? 'permission-denied' : 'lp/offline' });
  let res = await ask(true);
  if (res.status === 403 || res.status === 429) throw fail(res);      // a limit is not a missing index: asking again only spends more
  if (!res.ok) res = await ask(false);      // the index is not there yet
  if (!res.ok) throw fail(res);
  const got = await res.json();
  const stamp = v => (typeof v === 'number' ? { toMillis: () => v } : v);
  return (Array.isArray(got) ? got : []).filter(r => r && r.document).map(r => {
    const g = K.plain({ mapValue: { fields: r.document.fields || {} } }) || {};
    g.startAt = stamp(g.startAt); g.createdAt = stamp(g.createdAt);
    return Object.assign(g, { id: String(r.document.name || '').split('/').pop() });
  });
}
let listAsk = null;
async function upcoming() {
  if (listAsk) return listAsk;
  listAsk = (async () => {
    if (K && K.rest && K.plain) {
      return (await restUpcoming()).filter(g => g.status !== 'cancelled' && ms(g.startAt) >= Date.now() - 6 * 3600000).sort((a, b) => ms(a.startAt) - ms(b.startAt));
    }
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
    const list_ = upcoming(); list_.catch(() => { });      // at the same moment as the words, not after them
    await data();
    if (!DATA) return;
    let all;
    try { all = await list_; } catch (x) { return; }
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
  if (K && !K.off) upcoming().catch(() => { });      // asked at once; the words arrive at the same time
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
  const safe = safety();
  body.append(list, empty, safe);
  draw();
  /* The host's own gatherings still waiting for "did it happen?", at the top, three taps each (16 October 2026). */
  hostAsks(body).catch(() => { });
  /* Past gatherings (16 October 2026, Armin: "it goes to the previous events section"): the ones that happened, by the host's
     answer, a photo on the wall or a guest's rating, newest first, each with its first photo as its cover. Proof the board
     is real, and where the people who came post their photos for 30 days. */
  const past = await pastNights().catch(() => []);
  if (past.length) {
    const ul = el('ul', 'mb-list mb-past');
    past.forEach(g => ul.append(card(g)));
    safe.before(el('h2', 'mb-h2', IU ? tt('Past events') : tt('Past gatherings')),
      el('p', 'mb-hint', IU ? tt('Events that took place. The photos and videos are from the people who were there.') : tt('Gatherings that took place. The photos and videos are from the people who were there.')), ul);
  }
}
async function pastNights() {
  const { F, db } = await within(25000, fb());
  const col = F.collection(db, 'gatherings'), before = F.Timestamp.fromMillis(Date.now() - 6 * 3600000);
  let snap;
  try { snap = await F.getDocs(F.query(col, F.where('hidden', '==', false), F.where('startAt', '<', before), F.orderBy('startAt', 'desc'), F.limit(30))); }
  catch (e) { snap = await F.getDocs(F.query(col, F.where('hidden', '==', false), F.limit(200))); }      // the index is not there yet
  return snap.docs.map(d => Object.assign({ id: d.id }, d.data()))
    .filter(g => over(g) && happened(g)).sort((a, b) => ms(b.startAt) - ms(a.startAt)).slice(0, 12);
}
async function hostAsks(body) {
  const u = me();
  if (!u) return;
  const { F, db } = await within(25000, fb());
  const s = await F.getDocs(F.query(F.collection(db, 'gatherings'), F.where('hostUid', '==', u.uid), F.where('hidden', '==', false), F.limit(50)));
  const mine = s.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(askHost).sort((a, b) => ms(b.startAt) - ms(a.startAt));
  if (!mine.length || !body.isConnected) return;
  const box = el('section', 'mb-asks', null, { 'aria-label': tt('Did it happen?') });
  box.append(el('h2', 'mb-h2', IU ? tt('Did your event happen?') : mine.length === 1 ? tt('Did your gathering happen?') : tt('Did your gatherings happen?')),
    el('p', 'mb-hint', IU ? tt('Your answer puts it under Past events, where the people who came post their photos.') : tt('Your answer puts it under Past gatherings, where the people who came post their photos.')));
  mine.forEach(g => {
    const row = el('div', 'mb-ask-row');
    const h = el('p', 'mb-ask-t'); h.append(el('a', null, g.title, { href: page(DATA.paths.one + '?id=' + encodeURIComponent(g.id)) }));
    row.append(h, el('p', 'mb-when', when(g)), heldForm(g, gg => { row.textContent = ''; row.append(el('p', 'mb-ask-t', gg.title), heldNext(gg)); }));
    box.append(row);
  });
  body.prepend(box);
}
function safety() {
  const s = el('div', 'mb-safe');
  s.append(el('p', null, IU ? tt('Only events that are already public, outside Iran. Nothing inside Iran is ever listed here.') : tt('Meeting people you don\'t know yet? Do it somewhere public the first time.')),
    ...(IU ? [] : [el('p', null, tt('A home address only goes to the guests the host says yes to.'))]),
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
/* A picture made small in this browser: a JPEG cut to w by h (crop) or kept whole inside w by h, under most characters as a
   data address. It never leaves the browser at its full size, and the database keeps it in a document (no file storage:
   it needs billing). Returns '' when the file is not a picture it can read. */
async function shrinkTo(file, wd, ht, most, crop) {
  if (!file || !/^image\//.test(file.type || '')) throw { code: 'mb/notimage' };
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no({ code: 'mb/notimage' }); i.src = url; });
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) throw { code: 'mb/notimage' };
    for (const scale of [1, 0.8, 0.6, 0.45]) {
      let sx = 0, sy = 0, sw = iw, sh = ih, cw, ch;
      if (crop) {
        const want = wd / ht;
        if (iw / ih > want) { sw = ih * want; sx = (iw - sw) / 2; } else { sh = iw / want; sy = (ih - sh) / 2; }
        cw = Math.round(wd * scale); ch = Math.round(ht * scale);
      } else {
        const f = Math.min(1, wd / iw, ht / ih) * scale; cw = Math.max(1, Math.round(iw * f)); ch = Math.max(1, Math.round(ih * f));
      }
      const c = D.createElement('canvas'); c.width = cw; c.height = ch;
      const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, cw, ch);
      x.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
      for (const q of [0.82, 0.72, 0.6, 0.5, 0.4]) { const d = c.toDataURL('image/jpeg', q); if (d.length <= most && d.startsWith('data:image/jpeg;base64,')) return d; }
    }
    throw { code: 'mb/toobig' };
  } finally { URL.revokeObjectURL(url); }
}
/* The cover: one file, two sizes. thumb (480 by 270, under 20,000 characters) rides on the gathering so the board stays one
   quick read; big (1200 by 675, under 400,000) is cover/c, read only by the gathering's own page. */
const COVER = { thumb: [480, 270, 19500], big: [1200, 675, 390000] };
/* The picture: the host's own photo, or one of the site's drawings (16 October 2026), shown as the card will show it. A new
   gathering starts on a drawing of its kind picked at random, so two new cards side by side are seldom the same; tapping a
   drawing puts it on (and takes the host's own photo off, cover/c too: drop). kindOf: the kind the form has now. */
function coverPicker(g, line, kindOf) {
  const node = el('div', 'mb-f'), prev = el('div', 'mb-cover-prev');
  const C = DATA && DATA.covers && DATA.covers.src ? DATA.covers : null;
  let thumb = (g && g.thumb) || '', big = null, drop = false;      // big null: unchanged
  let art = g && typeof g.art === 'string' && C && C.src[g.art] ? g.art : '', picked = !!art;
  const kind = () => (kindOf && kindOf()) || (g && g.kind) || (DATA.formats[0] && DATA.formats[0].id) || 'table';
  const fresh = () => { const pool = (C.kinds && C.kinds[kind()]) || C.all; return pool[Math.floor(Math.random() * pool.length)] || C.all[0]; };
  if (C && !art) art = g && g.id ? artOf(g) : fresh();
  const grid = C ? el('div', 'mb-art-pick', null, { role: 'group', 'aria-label': tt('Or pick one of our drawings') }) : null;
  const paint = () => {
    if (C && !picked && !(g && g.id)) { const pool = (C.kinds && C.kinds[kind()]) || C.all; if (!pool.includes(art)) art = fresh(); }
    prev.textContent = ''; prev.append(cover({ kind: kind(), thumb, art, id: g && g.id }));
    if (grid) grid.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(!thumb && b.getAttribute('data-art') === art)));
  };
  if (grid) C.all.forEach(a => {
    const b = btn('mb-art', null, () => { art = a; picked = true; if (thumb) { thumb = ''; big = null; drop = !!(g && g.thumb); file.value = ''; } paint(); });
    b.setAttribute('data-art', a); b.setAttribute('aria-label', w(C.alt && C.alt[a]) || a);
    b.append(el('img', null, null, { src: ROOT + C.src[a], alt: '', width: '160', height: '90', loading: 'lazy', decoding: 'async' }));
    grid.append(b);
  });
  const id = 'mb-' + Math.random().toString(36).slice(2, 9);
  const file = el('input', null, null, { type: 'file', id, accept: 'image/jpeg,image/png,image/webp,image/gif', 'data-mb-cover': '' });
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    if (!f) return;
    say(line, tt('Making it small.'));
    try {
      const t = await shrinkTo(f, COVER.thumb[0], COVER.thumb[1], COVER.thumb[2], true);
      const b = await shrinkTo(f, COVER.big[0], COVER.big[1], COVER.big[2], true);
      thumb = t; big = b; drop = false; paint(); say(line, tt('Ready.'));
    } catch (e) { say(line, e && e.code === 'mb/toobig' ? tt('That picture could not be made small enough. Try another one.') : tt('That file is not a picture.'), true); }
  });
  paint();
  node.append(el('label', null, tt('A picture for the top'), { for: id }), prev, file,
    el('p', 'mb-hint', C ? tt('Your own photo of the place, the food or your last table works best. Without one, the card wears the drawing you pick below.') : tt('The place, the food, your last table: anything that makes people want to come. Without one, the card gets a drawing.')));
  if (grid) node.append(el('span', 'mb-l', tt('Or pick one of our drawings')), grid);
  return { node, repaint: paint, value: () => ({ thumb, big, art: C ? art : undefined, drop }) };
}
/* Where it is, who may join, why come, and a video: the parts the form and the host's edit box share. g: what is there now. */
function detailFields(g, line, kindOf) {
  g = g || {};
  const L = DATA.limits, out = el('div', 'mb-details');
  let kind = IU ? 'public' : (g.placeKind === 'public' || g.placeKind === 'home' ? g.placeKind : (g.id ? 'home' : ''));
  let join = g.join === 'ask' ? 'ask' : g.join === 'open' ? 'open' : '';
  const venue = el('input', null, null, { type: 'text', maxlength: '80', autocomplete: 'organization', 'data-mb-venue': '' }); venue.value = g.venue || '';
  const addr = el('input', null, null, { type: 'text', maxlength: '160', autocomplete: 'street-address', 'data-mb-address': '' }); addr.value = g.address || '';
  const home = el('textarea', null, null, { maxlength: String(L.place), rows: '2', autocomplete: 'street-address', 'data-mb-home': '' }); home.value = g.homeText || '';
  const pick = el('div', 'mb-chips mb-big', null, { role: 'group', 'aria-label': tt('Where is it?') });
  const pubBox = el('div', 'mb-sub'), homeBox = el('div', 'mb-sub');
  const joinPick = el('div', 'mb-chips', null, { role: 'group', 'aria-label': tt('Who can come?') });
  const chips = (box, list, cur, set) => { box.textContent = ''; list.forEach(([v, t, sub]) => { const b = btn('mb-chip', null, () => set(v)); b.append(el('b', null, t)); if (sub) b.append(el('span', null, sub)); b.setAttribute('data-v', v); b.setAttribute('aria-pressed', String(cur === v)); box.append(b); }); };
  const paint = () => {
    chips(pick, [['public', tt('A public place'), tt('A cafe, bar, restaurant, library, park or hall')], ['home', tt('A home or private place'), tt('The address goes only to the guests you say yes to')]], kind, v => { kind = v; if (v === 'home') join = 'ask'; else if (!join) join = 'open'; paint(); });
    chips(joinPick, [['open', tt('Anyone can join'), tt('They are in at once and see everything')], ['ask', tt('I say yes to each guest'), tt('You get a yes or no button for each one')]], join, v => { join = v; paint(); });
    pubBox.hidden = kind !== 'public'; homeBox.hidden = kind !== 'home';
  };
  if (!kind && !IU) kind = 'public';
  if (!join) join = kind === 'home' ? 'ask' : 'open';
  pubBox.append(field(tt('Name of the place'), venue, tt('Like Cafe Medici, or the Riverside Library, room 2.')),
    field(tt('Street address'), addr, tt('The full address. Everyone sees it, with a link to the map.')),
    el('span', 'mb-l', tt('Who can come?')), joinPick);
  homeBox.append(field(tt('The full address'), home, tt('Only you and the guests you say yes to see it. You say yes or no to each guest.')));
  const wf = el('div', 'mb-f'); wf.append(el('span', 'mb-l', tt('Where is it?')));
  if (!IU) wf.append(pick, el('p', 'mb-hint', tt('Meeting people you have not met before? Pick a public place the first time.')));
  out.append(wf, pubBox, homeBox);
  const about = el('textarea', null, null, { maxlength: '1000', rows: '5', 'data-mb-about': '' }); about.value = g.about || '';
  const cnt = el('span', 'mb-count'), upd = () => { cnt.textContent = dig(1000 - about.value.length); }; about.addEventListener('input', upd); upd();
  const af = field(tt('Tell people why they should come'), about, IU ? tt('What happens there, who it is for, what to bring.') : tt('What you will talk about or watch, who is coming, the food, the mood. Write it like you are inviting a friend.')); af.append(cnt);
  const video = el('input', null, null, { type: 'url', inputmode: 'url', maxlength: '300', placeholder: 'https://', autocapitalize: 'off', spellcheck: 'false', 'data-mb-video': '' }); video.value = g.video || '';
  const pic = coverPicker(g, line, kindOf);
  out.append(af, pic.node, field(tt('A video about it'), video, tt('Optional. A YouTube, TikTok, Instagram or X link: a clip of the place, an invite, your last night.')));
  paint();
  return {
    node: out, venue, addr, home, about, video,
    read() {
      const V = venue.value.trim().replace(/\s+/g, ' '), A = addr.value.trim().replace(/\s+/g, ' '), HM = home.value.trim().slice(0, L.place);
      const AB = about.value.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      let VD = video.value.trim(); if (VD && !/^https?:\/\//i.test(VD)) VD = 'https://' + VD; VD = VD.replace(/^http:/i, 'https:');
      if (!kind) return { bad: tt('Pick where it is.'), node: pick };
      if (kind === 'public' && V.length < 2) return { bad: tt('Type the name of the place.'), node: venue };
      if (kind === 'public' && A.length < 5) return { bad: tt('Type the street address, so people can find it.'), node: addr };
      if (kind === 'home' && HM.length < 5) return { bad: tt('Type the full address. Only the guests you say yes to will see it.'), node: home };
      if (/[<>]/.test(V + A + HM + AB)) return { bad: tt('Leave out the < and > signs.') };
      if (looksLikeAddress(AB.replace(/\n/g, ' '))) return { bad: tt('The address goes in its own box above, not in the description. Phone numbers stay out.'), node: about };
      if (VD && !VIDEO_OK.test(VD)) return { bad: tt('The video link must be from YouTube, TikTok, Instagram or X.'), node: video };
      const p = pic.value();
      const doc = { placeKind: kind, venue: kind === 'public' ? V : '', address: kind === 'public' ? A : '', join: kind === 'home' ? 'ask' : join, about: AB, video: VD, thumb: p.thumb };
      if (typeof p.art === 'string' && p.art) doc.art = p.art;
      return { doc, home: kind === 'home' ? HM : '', big: p.big, drop: p.drop };
    },
    repaint: pic.repaint,
  };
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
    DATA.formats.forEach(f => { const b = btn('mb-chip', w(f.name), () => { kind = f.id; fit(); try { more.repaint(); } catch (x) { } }); b.setAttribute('data-k', f.id); chips.append(b); });
    fit();
    if (DATA.formats.length > 1) form.append(fmt);
    const title = el('input', null, null, { type: 'text', maxlength: String(L.title), autocomplete: 'off', 'data-mb-title': '' });
    const at = el('input', null, null, { type: 'datetime-local' });
    const city = el('input', null, null, { type: 'text', maxlength: String(L.city), autocomplete: 'address-level2', 'data-mb-city': '' });
    const lineIn = el('input', null, null, { type: 'text', maxlength: String(L.line), autocomplete: 'off', 'data-mb-line': '' });
    const link = el('input', null, null, { type: 'url', inputmode: 'url', maxlength: '300', placeholder: 'https://', autocapitalize: 'off', spellcheck: 'false' });
    /* POST IT AGAIN (16 October 2026): ?again=<id> of the host's own gathering fills the form with it (the words, the kind,
       the place, the seats, the picture, the home address) and leaves only the day to pick. After a night nobody came to, and
       after a good one ("Host the next one"): a table that meets again is how a group forms. */
    let G0 = null, big0 = null;
    const againId = new URLSearchParams(location.search).get('again') || '';
    if (idOk(againId)) {
      try {
        const { F, db } = await within(25000, fb());
        const s = await F.getDoc(F.doc(db, 'gatherings', againId));
        const g = s.exists() ? Object.assign({ id: againId }, s.data()) : null;
        if (g && g.hostUid === u.uid) {
          G0 = Object.assign({}, g);
          if (!isPublic(g)) { try { const p = await F.getDoc(F.doc(db, 'gatherings', againId, 'place', 'p')); G0.homeText = p.exists() ? String(p.data().text || '') : ''; } catch (x) { } }
          if (JPEG_OK(g.thumb)) { try { const c = await F.getDoc(F.doc(db, 'gatherings', againId, 'cover', 'c')); big0 = c.exists() && JPEG_OK(c.data().pic) ? c.data().pic : null; } catch (x) { } }
        }
      } catch (x) { }
    }
    if (G0 && DATA.formats.some(f => f.id === G0.kind)) kind = G0.kind;
    const more = detailFields(G0 ? Object.assign({}, G0, { id: '', art: artOf(G0) }) : null, line, () => kind);
    if (G0) {
      title.value = G0.title || ''; city.value = G0.city || ''; lineIn.value = G0.line || ''; link.value = G0.link || '';
      if (G0.size) size.value = String(G0.size);
      if (G0.country === 'US' && G0.state && [...place.top.options].some(o => o.value === 'US:' + G0.state)) place.top.value = 'US:' + G0.state;
      else if (G0.country && place.second && [...place.second.options].some(o => o.value === G0.country)) { place.top.value = 'abroad'; place.second.value = G0.country; place.second.hidden = false; }
      else if (G0.country && [...place.top.options].some(o => o.value === G0.country)) place.top.value = G0.country;
      fit();
      form.prepend(el('p', 'mb-lede', tt('Posting "{title}" again. Everything is kept. Pick the new day.', { title: G0.title || '' })));
    }
    const t1 = tick(IU ? tt('This event is already public, and it is outside Iran.') : tt('If anyone coming is someone I haven\'t met, the first meeting is in a public place.'));
    const t2 = tick(tt('Everyone coming is 18 or over.'));
    const t3 = IU ? tick(tt('I am one of its organisers.')) : null;
    form.append(field(tt('Title'), title, IU ? tt('What it is, in a few words.') : tt('What you will talk about, or what you will watch.')),
      field(tt('Day and time'), at, tt('Your own time. It is shown with your time zone.')));
    form.append(more.node.firstChild);      // where is it, right after the title and the time
    [...more.node.querySelectorAll(':scope > .mb-sub')].forEach(n => form.append(n));
    form.append(field(tt('City or town'), city, tt('It shows on the board, so people nearby find it.')));
    const pf = el('div', 'mb-f'); pf.append(el('span', 'mb-l', IU ? tt('Country') : tt('State, or country')), place.node); form.append(pf);
    form.append(field(IU ? tt('How many can come') : tt('How many guests'), size),
      field(tt('One line people see on the card'), lineIn, tt('The hook. Like: Five of us, one question, the best tacos in town.')));
    [...more.node.children].forEach(n => form.append(n));
    form.append(field(tt('Link to its own page'), link, tt('Optional. Your event page somewhere else, if it has one.')));
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
      const M = more.read();
      if (M.bad) return bad(M.bad, M.node);
      if (C.length < 2 || /[0-9<>]/.test(C)) return bad(tt('Type the city or town, with no numbers.'), city);
      if (!P.country) return bad(IU ? tt('Pick the country.') : tt('Pick the state or the country.'), place.top);
      if (P.country === 'IR') return bad(tt('Nothing inside Iran is ever listed here.'), place.top);
      if (f.us && P.country !== 'US') return bad(tt('This kind of gathering is for the US only.'));
      if (kind === 'registration' && P.state === 'fl') return bad(tt('A registration party is not offered in Florida.'));
      if (!(n >= f.min && n <= f.max)) return bad(tt('Pick between {a} and {b}.', { a: f.min, b: f.max }), size);
      if ([T, LN, C].some(looksLikeAddress)) return bad(tt('That looks like an address or a phone number. The address has its own box.'));
      if (/[<>]/.test(T + LN)) return bad(tt('Leave out the < and > signs.'));
      if (LK && !/^https:\/\/[^\s<>"']{4,}$/.test(LK)) return bad(tt('That link does not look right. Copy it from the address bar.'), link);
      if (!t1.input.checked || !t2.input.checked || (t3 && !t3.input.checked)) return bad(tt('Tick the boxes above to post it.'));
      go.disabled = true; say(line, tt('Posting.'));
      try {
        const { F, db } = await within(25000, fb()), u = me();
        const ref = F.doc(F.collection(db, 'gatherings'));
        let tz = 'UTC'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (x) { }
        const bigPic = M.big || (G0 && M.doc.thumb && M.doc.thumb === G0.thumb ? big0 : null);      // posted again: the same large cover
        const commit = withArt => {
          const doc = Object.assign({}, M.doc); if (!withArt) delete doc.art;
          const b = F.writeBatch(db);
          b.set(ref, Object.assign({ hostUid: u.uid, hostName: u.name, kind, title: T, line: LN, startAt: F.Timestamp.fromMillis(start), tz, city: C,
            country: P.country, state: P.state || '', size: n, taken: 0, link: LK, status: 'open', adult: true, publicPlace: true,
            createdAt: F.serverTimestamp(), hidden: false, score: null, nightN: 0 }, doc));
          if (M.home) b.set(F.doc(db, 'gatherings', ref.id, 'place', 'p'), { text: M.home, at: F.serverTimestamp() });
          if (bigPic) b.set(F.doc(db, 'gatherings', ref.id, 'cover', 'c'), { pic: bigPic, at: F.serverTimestamp() });
          return within(30000, b.commit());
        };
        /* rules older than this page refuse the drawing's id: posted without it, the card picks the same kind of drawing itself */
        try { await commit(true); } catch (e) { if (e && e.code === 'permission-denied' && M.doc.art) await commit(false); else throw e; }
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
/* The gathering page is one page for every gathering, built with a discussion whose key community.js reads from the address
   (gatheringKey). Once the gathering is read, its discussion carries its title (what a post is filed under, the heading of
   the discussion) and Share hands out this gathering's own address. A gathering that is not there has no discussion. */
function nameTalk(g) {
  const t = D.getElementById('talk'), h = D.getElementById('talk-h'), sh = D.getElementById('share'), title = String(g.title || '').slice(0, 80);
  if (t && title) t.setAttribute('data-name', title);
  if (t) t.toggleAttribute('data-public-place', g.placeKind === 'public');      // an address may be said in its discussion (firestore.rules goodGatheringPost)
  if (h && title) h.textContent = title;
  if (sh) { sh.setAttribute('data-url', location.origin + location.pathname + '?id=' + encodeURIComponent(g.id)); if (title) sh.setAttribute('data-title', title); }
}
function noTalk() {
  const t = D.getElementById('talk');
  if (t) t.setAttribute('data-on', '');
  ['modes', 'band', 'discussion'].forEach(i => { const x = D.getElementById(i); if (x) x.hidden = true; });
  if (location.hash === '#discussion') try { history.replaceState(null, '', location.pathname + location.search); } catch (x) { }
}
async function initOne(box) {
  const body = box.querySelector('[data-mb-body]'), h1 = box.querySelector('[data-mb-h]');
  await data();
  const id = new URLSearchParams(location.search).get('id') || '';
  if (!DATA || !K || K.off) { body.setAttribute('aria-busy', 'false'); return; }
  if (!idOk(id)) { noTalk(); body.setAttribute('aria-busy', 'false'); body.append(el('p', 'mb-empty', tt('This gathering is not here any more.')), el('a', 'btn btn-line', tt('See the board'), { href: page(DATA.paths.board) })); return; }
  let G = null;
  /* The gathering itself is public, so it is read over plain REST first: the page shows it without waiting for Firebase's own
     code (15 October 2026, the same wait as the front page). Refused (hidden from the board, which its host and an admin may
     still open) or not possible: through Firebase, signed in, as before. */
  async function load() {
    if (K.restDoc && K.plain) {
      let res = null;
      try { res = await within(15000, fetch(K.restDoc('gatherings/' + id))); } catch (x) { res = null; }
      if (res && res.status === 404) { G = null; return; }
      if (res && res.ok) {
        const got = await res.json(), g = K.plain({ mapValue: { fields: (got && got.fields) || {} } }) || {};
        ['startAt', 'createdAt'].forEach(k => { const v = g[k]; if (typeof v === 'number') g[k] = { toMillis: () => v }; });
        G = Object.assign(g, { id });
        return;
      }
    }
    const { F, db } = await within(25000, fb());
    const s = await F.getDoc(F.doc(db, 'gatherings', id));
    G = s.exists() ? Object.assign({ id }, s.data()) : null;
  }
  async function draw() {
    try { await load(); } catch (e) { G = null; }
    body.textContent = ''; body.setAttribute('aria-busy', 'false');
    if (!G) { noTalk(); body.append(el('p', 'mb-empty', tt('This gathering is not here any more.')), el('a', 'btn btn-line', tt('See the board'), { href: page(DATA.paths.board) })); return; }
    h1.textContent = G.title;
    nameTalk(G);
    try { D.title = G.title + (D.title.includes('|') ? ' |' + D.title.split('|').slice(1).join('|') : ''); } catch (x) { }
    const top = el('div', 'mb-card mb-one');
    const cv = cover(G, true); top.append(cv);
    bigCover(cv);
    top.append(el('span', 'mb-kind', fmtName(G.kind)));
    if (G.line) top.append(el('p', 'mb-hook', G.line));
    top.append(el('p', 'mb-when', when(G)), whereBlock(G));
    const left = Math.max(0, G.size - (G.taken || 0)), started = ms(G.startAt) <= Date.now();
    top.append(el('p', 'mb-seats', G.status === 'cancelled' ? tt('Called off') : started && (G.held || over(G)) ? pastLine(G) : goingLine(G) + (started ? '' : ' · ' + (left ? tt('{n} of {size} seats left', { n: left, size: G.size }) : tt('Full')))));
    const host = el('p', 'mb-host mb-row'); host.append(face(G.hostName, G.hostUid), el('span', null, tt('Hosted by')), el('a', null, G.hostName, { href: page(DATA.paths.member + '?u=' + encodeURIComponent(G.hostUid)) }));
    const r = ratingLine(G); if (r) host.append(el('span', null, r));
    top.append(host);
    if (G.about) top.append(el('div', 'mb-desc', G.about));
    else { const ab = aboutOf(G.kind); if (ab) top.append(el('p', 'mb-about', ab)); }
    if (typeof G.video === 'string' && VIDEO_OK.test(G.video)) top.append(tvBox(G.video, tt('A video from the host')));
    if (G.link) top.append(el('a', null, tt('Its own page'), { href: G.link, target: '_blank', rel: 'noopener noreferrer nofollow' }));
    const row = el('div', 'mb-acts');
    if (talkKey(G.id)) row.append(el('a', 'talk-n', tt('Discuss'), { 'data-talk-n': talkKey(G.id), href: '#discussion' }));
    row.append(shareBtn(G));
    top.append(row);
    body.append(top);
    const u = me();
    const act = el('div', 'mb-f', null, { id: 'in' }), line = el('p', 'mb-say', '', { role: 'status', 'aria-live': 'polite' });
    body.append(act, line);
    const { F, db } = await within(25000, fb());
    if (u && u.uid === G.hostUid) await hostPanel(act, line, F, db, started);
    else await guestPanel(act, line, F, db, started, u);
    if (started && !didNot(G) && G.status !== 'cancelled') await nightWall(F, db, u);
    body.append(safety());
    if (u && u.uid !== G.hostUid) body.append(reportBox('g-' + id, [['address', tt('It shows a home address')], ['abusive', tt('It is abusive')], ['fake', tt('It is not real')], ['advert', tt('It is an advert')]]));
    if (location.hash === '#in') { const b = act.querySelector('button,input'); if (b) try { b.focus(); act.scrollIntoView({ block: 'center' }); } catch (x) { } }
    if (location.hash === '#night' || location.hash === '#happened') { const n = D.getElementById(location.hash.slice(1)); if (n) try { n.scrollIntoView(); } catch (x) { } }
  }
  /* The larger cover (cover/c), read only here; the card's small one shows until it arrives. */
  async function bigCover(cv) {
    if (!G.thumb) return;
    try {
      const { F, db } = await within(25000, fb());
      const s = await F.getDoc(F.doc(db, 'gatherings', id, 'cover', 'c'));
      const pic = s.exists() ? s.data().pic : '';
      if (typeof pic === 'string' && /^data:image\/jpeg;base64,/.test(pic)) { const i = cv.querySelector('img'); if (i) { i.src = pic; i.width = 1200; i.height = 675; } }
    } catch (x) { }
  }
  /* Who is going, by name: only the host and the guests who are in can read the list (the rules say the same). */
  async function goingList(F, db) {
    try {
      const s = await F.getDocs(F.query(F.collection(db, 'gatherings', id, 'guests'), F.limit(100)));
      const ins = s.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(g => g.status === 'in');
      const ul = el('ul', 'mb-going');
      const hl = el('li', 'mb-row'); hl.append(face(G.hostName, G.hostUid), el('span', null, G.hostName + ' · ' + tt('host'))); ul.append(hl);
      ins.forEach(g => { const li = el('li', 'mb-row'); li.append(face(g.name, g.id), el('a', null, g.name, { href: page(DATA.paths.member + '?u=' + encodeURIComponent(g.id)) })); ul.append(li); });
      const box = el('div', 'mb-f'); box.append(el('h2', 'mb-h2', tt('Who is going')), ul);
      return box;
    } catch (x) { return null; }
  }
  async function guestPanel(act, line, F, db, started, u) {
    const open = openJoin(G);
    if (!u) {
      if (!started && G.status === 'open') {
        const b = btn('btn btn-key', tt('I\'m in'), () => { K.open('auth', { opener: b }); fb().catch(() => { }); });
        act.append(b, el('p', 'mb-hint', open ? tt('Sign in first. Then one tap and you are in.') : isPublic(G) ? tt('Sign in first. The host says yes or no.') : tt('Sign in first. The host says yes or no, and the guests they say yes to get the address.')));
      }
      return;
    }
    const ref = F.doc(db, 'gatherings', id, 'guests', u.uid), gref = F.doc(db, 'gatherings', id);
    let mine = null; try { const s = await F.getDoc(ref); mine = s.exists() ? s.data() : null; } catch (x) { }
    if (!mine) {
      if (started || G.status !== 'open') { act.append(el('p', 'mb-empty', started ? tt('This one has already started.') : tt('Called off'))); return; }
      if (G.size - (G.taken || 0) <= 0) { act.append(el('p', 'mb-empty', tt('Full'))); return; }
      if (!u.v) { act.append(el('p', 'mb-hint', tt('Confirm your email first. The link is in your inbox.'))); return; }
      const t = tick(tt('I am 18 or over.'));
      const b = btn('btn btn-key', tt('I\'m in'), async () => {
        if (!t.input.checked) { say(line, tt('Tick the box first.'), true); return; }
        b.disabled = true; say(line, tt('Sending.'));
        try {
          if (open) {
            /* in at once: their own guest document and one more seat, in one batch (the rules check each against the other) */
            const bt = F.writeBatch(db);
            bt.set(ref, { uid: u.uid, name: u.name, status: 'in', adult: true, at: F.serverTimestamp() });
            bt.update(gref, { taken: F.increment(1) });
            await within(20000, bt.commit());
          } else await within(20000, F.setDoc(ref, { uid: u.uid, name: u.name, status: 'asked', adult: true, at: F.serverTimestamp() }));
          listAsk = null; draw();
        } catch (e) { b.disabled = false; say(line, words(e), true); }
      });
      act.append(t.node, b, el('p', 'mb-hint', open ? tt('Anyone can join this one. One tap and you are in.') : isPublic(G) ? tt('The host says yes or no to each guest.') : tt('The host says yes or no. The guests they say yes to get the address.')));
      return;
    }
    const leave = mine.status === 'in' && open;
    const drop = () => twoTap(leave || mine.status === 'in' ? tt('I can\'t come any more') : tt('Take back my ask'), tt('Tap again to be sure'), async () => {
      try {
        if (leave) { const bt = F.writeBatch(db); bt.delete(ref); bt.update(gref, { taken: F.increment(-1) }); await bt.commit(); }
        else await F.deleteDoc(ref);
        listAsk = null; draw();
      } catch (e) { say(line, words(e), true); }
    });
    if (mine.status === 'asked') { act.append(el('p', 'mb-lede', tt('You asked. The host answers here.'))); if (!started) act.append(drop()); return; }
    if (mine.status === 'no') { act.append(el('p', 'mb-lede', tt('The host can\'t fit you in this time.'))); return; }
    act.append(el('p', 'mb-lede', started ? (didNot(G) ? (G.held === 'none' ? tt('The host says nobody came this time.') : tt('The host says this one did not happen.')) : tt('You were in.')) : tt('You\'re in. See you there.')));
    let txt = '';
    try {
      const p = await F.getDoc(F.doc(db, 'gatherings', id, 'place', 'p'));
      txt = p.exists() ? String(p.data().text || '') : '';
      if (!started) {
        if (txt) { act.append(el('p', 'mb-l', isPublic(G) ? tt('A note from the host') : tt('The address')), el('p', 'mb-place', txt)); if (!isPublic(G)) act.append(mapsLink(tt('Open in Maps'), txt)); }
        else if (!isPublic(G)) act.append(el('p', 'mb-hint', tt('The host has not written the address yet. Look again closer to the day.')));
      }
    } catch (x) { }
    if (!started) { const c = calRow(G, isPublic(G) ? '' : txt); if (c) act.append(c); }
    const gl = await goingList(F, db); if (gl) act.append(gl);
    if (!started) { act.append(drop()); return; }
    if (didNot(G) || G.status === 'cancelled') return;
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
    /* Did it happen (16 October 2026): first thing the host sees once it started, for 30 days; their answer can be changed. */
    if (withinNight(G) && G.status !== 'cancelled') {
      const hp = el('section', 'mb-f mb-happened', null, { id: 'happened' });
      hp.append(el('h2', 'mb-h2', tt('Did it happen?')));
      const again = () => draw().catch(() => { });
      if (!G.held) hp.append(el('p', 'mb-hint', IU ? tt('Your answer puts it under Past events, where the people who came post their photos.') : tt('Your answer puts it under Past gatherings, where the people who came post their photos.')), heldForm(G, again));
      else {
        hp.append(heldNext(G));
        const ch = btn('mb-text', tt('Change my answer'), () => { ch.replaceWith(heldForm(G, again)); });
        hp.append(ch);
      }
      act.append(hp);
    }
    act.append(el('h2', 'mb-h2', tt('Your guests')));
    let guests = [], listed = false;
    try { const s = await F.getDocs(F.query(F.collection(db, 'gatherings', id, 'guests'), F.limit(100))); guests = s.docs.map(d => Object.assign({ id: d.id }, d.data())); listed = true; } catch (e) { say(line, words(e), true); }
    const list = el('ul', 'mb-guests');
    const recount = async () => {
      const n = guests.filter(g => g.status === 'in').length;
      if (n !== G.taken && n <= G.size) { await F.updateDoc(F.doc(db, 'gatherings', id), { taken: n, hostName: me().name }); G.taken = n; }
    };
    if (!guests.length) act.append(el('p', 'mb-hint', openJoin(G) ? tt('Nobody has joined yet. Share it: people join with one tap.') : tt('Nobody has asked yet. When someone does, you say yes or no here.')));
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
    if (listed) try { await recount(); } catch (x) { }      // the seats follow who is in, whoever let them in
    // place/p: the full address of a home (only the guests the host says yes to read it), or a note for the guests of a public place
    const pref = F.doc(db, 'gatherings', id, 'place', 'p');
    let ptext = ''; try { const p = await F.getDoc(pref); ptext = p.exists() ? p.data().text : ''; } catch (x) { }
    if (isPublic(G)) {
      const ta = el('textarea', null, null, { maxlength: String(DATA.limits.place), rows: '2' }); ta.value = ptext;
      const saveP = btn('btn btn-line', tt('Save the note'), async () => {
        say(line, tt('Saving.'));
        try { await within(20000, F.setDoc(pref, { text: ta.value.trim().slice(0, DATA.limits.place), at: F.serverTimestamp() })); say(line, tt('Saved.')); } catch (e) { say(line, words(e), true); }
      });
      const pf = el('div', 'mb-form'); pf.append(field(tt('A note only your guests see'), ta, tt('Optional. Like: ask for me at the bar, I have the red scarf.')), saveP);
      act.append(pf);
    }
    // the host changes where it is, who may join, the picture, the words and the video
    const edit = btn('btn btn-line', tt('Edit the gathering'), () => {
      edit.hidden = true;
      const form = el('form', 'mb-form mb-edit-g', null, { novalidate: '' }), eline = el('p', 'mb-say', '', { role: 'status', 'aria-live': 'polite' });
      const lineIn = el('input', null, null, { type: 'text', maxlength: String(DATA.limits.line), autocomplete: 'off' }); lineIn.value = G.line || '';
      const more = detailFields(Object.assign({}, G, { homeText: isPublic(G) ? '' : ptext }), eline);
      const save = el('button', 'btn btn-key', tt('Save'), { type: 'submit' });
      form.append(el('h2', 'mb-h2', tt('Edit the gathering')), field(tt('One line people see on the card'), lineIn), more.node, save, eline);
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        const M = more.read(), LN = lineIn.value.trim().replace(/\s+/g, ' ');
        if (M.bad) { say(eline, M.bad, true); if (M.node) try { M.node.focus(); } catch (x) { } return; }
        if (looksLikeAddress(LN) || /[<>]/.test(LN)) { say(eline, tt('That looks like an address or a phone number. The address has its own box.'), true); return; }
        save.disabled = true; say(eline, tt('Saving.'));
        try {
          const commit = withArt => {
            const doc = Object.assign({}, M.doc); if (!withArt || doc.art === G.art) delete doc.art;
            const bt = F.writeBatch(db);
            bt.update(F.doc(db, 'gatherings', id), Object.assign({ line: LN, hostName: me().name }, doc));
            if (M.home) bt.set(pref, { text: M.home, at: F.serverTimestamp() });
            if (M.big) bt.set(F.doc(db, 'gatherings', id, 'cover', 'c'), { pic: M.big, at: F.serverTimestamp() });
            else if (M.drop) bt.delete(F.doc(db, 'gatherings', id, 'cover', 'c'));      // their own photo off, a drawing on
            return within(30000, bt.commit());
          };
          try { await commit(true); } catch (e) { if (e && e.code === 'permission-denied' && M.doc.art) await commit(false); else throw e; }
          listAsk = null; draw();
        } catch (e) { save.disabled = false; say(eline, words(e), true); }
      });
      edit.after(form);
    });
    act.append(edit);
    if (!isPublic(G) && !ptext) act.append(el('p', 'mb-say bad', tt('Add the full address with Edit the gathering, so the guests you say yes to know where to go.')));
    if (!started && G.status === 'open') { const c = calRow(G, isPublic(G) ? '' : ptext); if (c) act.append(c); }
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
  /* "From the night": after it started, the host and the guests who were in post photos and video links; everyone sees them.
     Each post is its own document, <account id>-<nightN>, and nightN on the gathering goes up by one in the same batch. */
  async function nightWall(F, db, u) {
    const sec = el('section', 'mb-night', null, { id: 'night' });
    sec.append(el('h2', 'mb-h2', tt('From the night')));
    let posts = [];
    try { const s = await F.getDocs(F.query(F.collection(db, 'gatherings', id, 'night'), F.where('hidden', '==', false), F.limit(60))); posts = s.docs.map(d => Object.assign({ id: d.id }, d.data())); } catch (x) { }
    posts.sort((a, b) => ms(a.at) - ms(b.at));
    const ul = el('ul', 'mb-wall');
    posts.forEach(p => {
      const li = el('li', 'mb-shot');
      if (p.pic && /^data:image\/jpeg;base64,/.test(p.pic)) li.append(el('img', null, null, { src: p.pic, alt: tt('A photo from the night, posted by {name}', { name: p.name }), loading: 'lazy', decoding: 'async' }));
      if (p.video && VIDEO_OK.test(p.video)) li.append(tvBox(p.video, tt('A video from the night')));
      const by = el('p', 'mb-row mb-hint'); by.append(face(p.name, p.uid), el('span', null, p.name)); li.append(by);
      if (u && (u.uid === p.uid || u.uid === G.hostUid)) li.append(twoTap(tt('Take it down'), tt('Tap again to take it down'), async () => {
        /* the photo that is the past card's cover leaves with it, in the same batch (firestore.rules nightPicGone) */
        try {
          const ref = F.doc(db, 'gatherings', id, 'night', p.id);
          if (G.nightPicId === p.id) {
            try { const bt = F.writeBatch(db); bt.delete(ref); bt.update(F.doc(db, 'gatherings', id), { nightPic: '', nightPicId: '' }); await within(20000, bt.commit()); }
            catch (e) { await F.deleteDoc(ref); }
          } else await F.deleteDoc(ref);
          listAsk = null; draw();
        } catch (e) { }
      }));
      else if (u) li.append(reportBox('n-' + id + '-' + p.id, [['picture', tt('Someone in it did not agree to be posted')], ['abusive', tt('It is abusive')], ['advert', tt('It is an advert')]]));
      ul.append(li);
    });
    if (posts.length) sec.append(ul);
    else sec.append(el('p', 'mb-hint', tt('No photos yet. The host and the guests who came can post theirs here.')));
    // posting: the host or a guest who was in, for 30 days after it started
    let can = false;
    if (u && u.v && wallOpen(G)) {
      if (u.uid === G.hostUid) can = true;
      else { try { const s = await F.getDoc(F.doc(db, 'gatherings', id, 'guests', u.uid)); can = s.exists() && s.data().status === 'in'; } catch (x) { } }
    }
    if (can) {
      const form = el('div', 'mb-form'), pl = el('p', 'mb-say', '', { role: 'status', 'aria-live': 'polite' });
      let pic = '', small = '';
      const fid = 'mb-' + Math.random().toString(36).slice(2, 9);
      const file = el('input', null, null, { type: 'file', id: fid, accept: 'image/jpeg,image/png,image/webp,image/gif', 'data-mb-night': '' });
      const prev = el('div', 'mb-shot-prev');
      file.addEventListener('change', async () => {
        const f = file.files && file.files[0]; if (!f) return;
        say(pl, tt('Making it small.'));
        try {
          pic = await shrinkTo(f, 1280, 1280, 390000, false);
          small = await shrinkTo(f, COVER.thumb[0], COVER.thumb[1], COVER.thumb[2], true).catch(() => '');      // the past card's cover, if it is the first photo
          prev.textContent = ''; prev.append(el('img', null, null, { src: pic, alt: '' })); say(pl, tt('Ready.'));
        }
        catch (e) { pic = ''; small = ''; say(pl, e && e.code === 'mb/toobig' ? tt('That picture could not be made small enough. Try another one.') : tt('That file is not a picture.'), true); }
      });
      const vid = el('input', null, null, { type: 'url', inputmode: 'url', maxlength: '300', placeholder: 'https://', autocapitalize: 'off', spellcheck: 'false' });
      const ok = tick(tt('Everyone in it is fine with being posted.'));
      const post = btn('btn btn-key', tt('Post it'), async () => {
        let V = vid.value.trim(); if (V && !/^https?:\/\//i.test(V)) V = 'https://' + V; V = V.replace(/^http:/i, 'https:');
        if (!pic && !V) { say(pl, tt('Add a photo or a video link.'), true); return; }
        if (V && !VIDEO_OK.test(V)) { say(pl, tt('The video link must be from YouTube, TikTok, Instagram or X.'), true); return; }
        if (!ok.input.checked) { say(pl, tt('Tick the box first.'), true); return; }
        post.disabled = true; say(pl, tt('Posting.'));
        /* The first photo on the wall brings its small copy as the cover of the past card (nightPic, firestore.rules nightStep).
           Refused (rules older than this page, or someone else's photo got there first): the post goes without it. */
        const tryOnce = async withCover => {
          const gs = await F.getDoc(F.doc(db, 'gatherings', id));
          const cur = gs.exists() ? gs.data() : {};
          const n = (cur.nightN || 0) + 1, nid = u.uid + '-' + n;
          const bt = F.writeBatch(db);
          bt.set(F.doc(db, 'gatherings', id, 'night', nid), { uid: u.uid, name: u.name, pic, video: V, ok: true, at: F.serverTimestamp(), hidden: false });
          const up = { nightN: F.increment(1) };
          if (withCover && small && pic && !cur.nightPic) Object.assign(up, { nightPic: small, nightPicId: nid });
          bt.update(F.doc(db, 'gatherings', id), up);
          await within(30000, bt.commit());
        };
        try {
          try { await tryOnce(true); }
          catch (e) { if (e && e.code === 'permission-denied') { try { await tryOnce(true); } catch (e2) { if (e2 && e2.code === 'permission-denied') await tryOnce(false); else throw e2; } } else throw e; }
          listAsk = null; draw();
        }
        catch (e) { post.disabled = false; say(pl, words(e), true); }
      });
      form.append(el('h3', null, tt('Post your photos and videos')), el('label', 'mb-l', tt('A photo'), { for: fid }), file, prev,
        field(tt('Or a video link'), vid, tt('YouTube, TikTok, Instagram or X.')), ok.node, post, pl,
        el('p', 'mb-hint', tt('Everyone can see what you post here. Only post people who said yes to it.')));
      sec.append(form);
    }
    if (posts.length || can) body.append(sec);
  }
  await draw();
  K.sub(() => { draw().catch(() => { }); });
}

/* ------------------------------------------------------------------ member/?u=: a profile */
/* A photo made small in this browser: the middle square, 256 pixels, a JPEG of at most limits.picBytes. It never leaves
   the browser at its full size, and the database keeps it in the profile document (no file storage). */
async function shrink(file) {
  const { img, url } = await loadPic(file);
  try {
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    return squareJpeg(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s);
  } finally { URL.revokeObjectURL(url); }
}
/* The chosen file as a picture in this browser. The caller revokes url when it is done with it. */
async function loadPic(file) {
  if (!file || !/^image\//.test(file.type || '')) throw { code: 'mb/notimage' };
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no({ code: 'mb/notimage' }); i.src = url; });
    if (!img.naturalWidth || !img.naturalHeight) throw { code: 'mb/notimage' };
    return { img, url };
  } catch (e) { URL.revokeObjectURL(url); throw e; }
}
/* One square of a picture (sx, sy, side, in the picture's own pixels) as the small JPEG a profile keeps. */
function squareJpeg(img, sx, sy, s) {
  const L = DATA.limits, px = L.picPx || 256, most = 'data:image/jpeg;base64,'.length + Math.ceil(L.picBytes / 3) * 4;
  if (!(s > 0)) throw { code: 'mb/notimage' };
  const c = D.createElement('canvas'); c.width = c.height = px;
  const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, px, px);
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, sx, sy, s, s, 0, 0, px, px);
  for (const q of [0.86, 0.78, 0.7, 0.6, 0.5, 0.4, 0.3]) { const d = c.toDataURL('image/jpeg', q); if (d.length <= most && d.startsWith('data:image/jpeg;base64,')) return d; }
  throw { code: 'mb/toobig' };
}
/* 16 October 2026 (Armin: "when I uploaded my picture, it didn't let me select which part of the picture is going to be my
   profile picture"): the chooser. The photo fills a square with the round picture marked on it; the reader drags it (finger
   or mouse), zooms with the slider, two fingers or the mouse wheel, or uses the arrow keys and + and -. It opens on the
   middle square, so doing nothing gives what the site gave before. get() is the small JPEG of exactly the part in the circle. */
function cropper(img) {
  const W = img.naturalWidth, H = img.naturalHeight, MIN = Math.min(W, H), ZMAX = Math.max(1, Math.min(6, MIN / 64));
  let z = 1, side = MIN, sx = (W - MIN) / 2, sy = (H - MIN) / 2;
  const wrap = el('div', 'mb-crop');
  const stage = el('div', 'mb-crop-stage', null, { tabindex: '0', role: 'group', 'aria-label': tt('The part of the photo that will be your picture. Drag it, or use the arrow keys. Plus and minus zoom.') });
  const pic = el('img', null, null, { src: img.src, alt: '', draggable: 'false' });
  stage.append(pic, el('span', 'mb-crop-ring', null, { 'aria-hidden': 'true' }));
  const zid = 'mb-zoom-' + Math.random().toString(36).slice(2, 8);
  const zoom = el('input', 'mb-crop-zoom', null, { type: 'range', id: zid, 'aria-label': tt('Zoom'), min: '1', max: String(ZMAX), step: '0.01', value: '1' });
  const zl = el('div', 'mb-crop-zl');
  zl.append(el('span', 'mb-crop-sm', '−', { 'aria-hidden': 'true' }), zoom, el('span', 'mb-crop-lg', '+', { 'aria-hidden': 'true' }));
  wrap.append(stage, el('p', 'mb-hint mb-crop-how', tt('Drag the photo to put your face in the circle. Slide to zoom.')), zl);
  const S = () => stage.clientWidth || 280;
  function clamp() { side = MIN / z; sx = Math.min(Math.max(0, sx), W - side); sy = Math.min(Math.max(0, sy), H - side); }
  function paint() {
    clamp();
    const k = S() / side;
    pic.style.width = W + 'px'; pic.style.height = H + 'px';
    pic.style.transform = 'translate(' + (-sx * k) + 'px,' + (-sy * k) + 'px) scale(' + k + ')';
    if (+zoom.value !== z) zoom.value = String(z);
  }
  /* zoom to nz keeping the point (fx, fy) of the square (0..1, the middle by default) where it is */
  function zoomTo(nz, fx, fy) {
    nz = Math.min(ZMAX, Math.max(1, nz)); if (fx == null) { fx = 0.5; fy = 0.5; }
    const px = sx + fx * side, py = sy + fy * side, ns = MIN / nz;
    z = nz; sx = px - fx * ns; sy = py - fy * ns; paint();
  }
  function move(dx, dy) { const k = S() / side; sx -= dx / k; sy -= dy / k; paint(); }
  const pts = new Map(); let pinch = 0;
  const span = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  stage.addEventListener('pointerdown', ev => {
    pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    try { stage.setPointerCapture(ev.pointerId); } catch (x) { }
    if (pts.size === 2) pinch = span();
    stage.classList.add('on'); ev.preventDefault();
    try { stage.focus({ preventScroll: true }); } catch (x) { }   // preventDefault keeps the focus off it otherwise
  });
  stage.addEventListener('pointermove', ev => {
    const p = pts.get(ev.pointerId); if (!p) return;
    const dx = ev.clientX - p.x, dy = ev.clientY - p.y;
    p.x = ev.clientX; p.y = ev.clientY;
    if (pts.size === 1) move(dx, dy);
    else if (pts.size === 2 && pinch) {
      const n = span(), r = stage.getBoundingClientRect(), [a, b] = [...pts.values()];
      zoomTo(z * n / pinch, ((a.x + b.x) / 2 - r.left) / S(), ((a.y + b.y) / 2 - r.top) / S()); pinch = n;
      move(dx / 2, dy / 2);
    }
  });
  const up = ev => { pts.delete(ev.pointerId); if (pts.size < 2) pinch = 0; if (!pts.size) stage.classList.remove('on'); };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up); stage.addEventListener('lostpointercapture', up);
  stage.addEventListener('wheel', ev => {
    ev.preventDefault();
    const r = stage.getBoundingClientRect();
    zoomTo(z * Math.exp(-ev.deltaY * 0.0015), (ev.clientX - r.left) / S(), (ev.clientY - r.top) / S());
  }, { passive: false });
  stage.addEventListener('keydown', ev => {
    const step = ev.shiftKey ? 40 : 10, c = ev.code || '';
    const k = c === 'NumpadAdd' || c === 'Equal' ? '+' : c === 'NumpadSubtract' || c === 'Minus' ? '-' : ev.key;
    if (k === 'ArrowLeft') move(step, 0); else if (k === 'ArrowRight') move(-step, 0);
    else if (k === 'ArrowUp') move(0, step); else if (k === 'ArrowDown') move(0, -step);
    else if (k === '+' || k === '=') zoomTo(z * 1.15); else if (k === '-' || k === '_') zoomTo(z / 1.15);
    else return;
    ev.preventDefault();
  });
  zoom.addEventListener('input', () => zoomTo(+zoom.value));
  /* the square's size follows the screen (a phone turned on its side) */
  let ro = null;
  if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => paint()); ro.observe(stage); }
  requestAnimationFrame(paint); paint();
  return {
    node: wrap,
    get: () => { clamp(); return squareJpeg(img, sx, sy, side); },
    stop: () => { if (ro) ro.disconnect(); }
  };
}
/* The picture on a profile: an approved photo (the owner always sees their own), the drawn picture they chose, or the one
   the site gave them (community.js face(), 15 October 2026). */
function picOf(p, uid, name, own) {
  const box = el('div', 'mb-pic');
  const av = p && p.avatar && DATA.avatars.find(a => a.id === p.avatar);
  const photoOk = p && p.pic && (own || same(p.picOk, p.picAt));
  if (photoOk) box.append(el('img', null, null, { src: p.pic, alt: '', width: '128', height: '128' }));
  else if (av) box.append(el('img', null, null, { src: ROOT + av.src, alt: '', width: '128', height: '128' }));
  else box.append(face(name, uid));
  return box;
}
function levelOf(xp) {
  const L = DATA.levels.slice().sort((a, b) => a.xp - b.xp);
  let i = 0; L.forEach((l, j) => { if (xp >= l.xp) i = j; });
  return { now: L[i], next: L[i + 1] || null };
}
const PEN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm17.7-10.2a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
const UP = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M12 3l5 5h-3v6h-4V8H7l5-5zm-7 14h14v3H5v-3z"/></svg>';
const TICK = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z"/></svg>';
function svgIn(node, svg) { node.insertAdjacentHTML('beforeend', svg); return node; }

/* ------------------------------------------------------------------ what a person did, and the team (16 October 2026)
   Armin, 16 October 2026, on a discussion where he could not tap anyone: "There should be a way for me to click on every
   person's name and go see their bio, all their comments, and all their activities, including clicking on LibertyPolitics
   itself and seeing her bio as well." And: "When I click on the team, I should be able to be taken to a page where I see
   all the team members. The page for all the team members should also be under the About menu as well." community.js
   makes every name, face, Host and Team tag a link; this part draws where they lead. */

/* Every live post and reply of one account, newest first. From the proven copy of every live post (community.js
   snapOnce: three or four reads for the whole site) when there is one, else one question to the database. */
async function postsOf(uid, F, db) {
  const one = (id, x, at) => ({ id, about: x.about || '', subject: x.subject || '', text: String(x.text || ''), parent: x.parent || '', kind: x.kind || '', tag: x.tag || '', name: x.name || '', ms: at || 0, ups: x.ups || 0 });
  let rows = null;
  try { rows = K.live ? await within(20000, K.live()) : null; } catch (x) { rows = null; }
  const out = rows ? rows.filter(r => r.uid === uid && r.status === 'live').map(r => one(r.id, r, r.ms))
    : await F.getDocs(F.query(F.collection(db, 'posts'), F.where('uid', '==', uid), F.where('status', '==', 'live'), F.limit(500)))
      .then(s => s.docs.map(d => one(d.id, d.data(), ms(d.data().createdAt)))).catch(() => []);
  return out.sort((a, b) => b.ms - a.ms);
}
/* The site's own account wears the site's mark, as it does on every post. */
function hostPic() {
  const box = el('div', 'mb-pic mb-pic-host');
  box.append(el('img', null, null, { src: ROOT + (SITE.mark || 'assets/seal.png'), alt: '', width: '128', height: '128' }));
  return box;
}
/* One list of everything: {kind: post | reply | mission | gathering, ms, ...}, newest first. */
function activity(posts, X, hosted) {
  const out = posts.map(p => ({ kind: p.parent ? 'reply' : 'post', ms: p.ms, p }));
  Object.values((X && X.reports) || {}).forEach(r => {
    if (r && r.state === 'accepted' && DATA.missions[r.mission]) out.push({ kind: 'mission', ms: ms(r.at), what: w(DATA.missions[r.mission].title) });
  });
  ((X && X.grants) || []).forEach(g => { if (g && g.what) out.push({ kind: 'mission', ms: ms(g.at), what: g.what }); });
  hosted.forEach(g => out.push({ kind: 'gathering', ms: ms(g.createdAt) || ms(g.startAt), g }));
  return out.sort((a, b) => b.ms - a.ms);
}
const ACT_LABEL = () => ({ all: tt('All'), post: tt('Posts'), reply: tt('Replies'), mission: tt('Missions'), gathering: IU ? tt('Events') : tt('Gatherings') });
/* The activity list: a row of filters (only the kinds there are), then twenty at a time with Show more. */
function feedOf(acts) {
  const wrap = el('div', 'mb-act'), L = ACT_LABEL(), kinds = ['all', 'post', 'reply', 'mission', 'gathering'];
  const n = k => (k === 'all' ? acts.length : acts.filter(a => a.kind === k).length);
  const bar = el('div', 'mb-chips mb-actbar', null, { role: 'group', 'aria-label': tt('Show') });
  const list = el('ol', 'mb-actlist'), more = btn('btn btn-line mb-actmore', '', () => { shown += 20; draw(); });
  let only = 'all', shown = 20;
  const present = kinds.filter(k => n(k) > 0);
  if (present.length > 2) present.forEach(k => {
    const b = btn('mb-chip', null, () => { only = k; shown = 20; bar.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); });
    b.append(el('span', null, L[k]), el('b', null, dig(n(k))));
    b.setAttribute('aria-pressed', String(k === only));
    bar.append(b);
  });
  function row(a) {
    const li = el('li', 'mb-actrow mb-act-' + a.kind), head = el('p', 'mb-act-h');
    const when = el('time', 'mb-hint', K.ago ? K.ago(a.ms) : '', a.ms ? { datetime: new Date(a.ms).toISOString(), title: K.niceDate ? K.niceDate(a.ms) : '' } : null);
    if (a.kind === 'post' || a.kind === 'reply') {
      const p = a.p, path = K.pathOf ? K.pathOf(p.about) : null, where = p.subject || tt('a discussion');
      head.append(el('span', 'mb-act-k', a.kind === 'reply' ? tt('Replied in') : tt('Posted in')), ' ');
      head.append(path != null ? el('a', null, where, { href: ROOT + path + '#p-' + p.id }) : el('span', null, where));
      head.append(' ', when);
      li.append(head);
      const t = p.text.trim();
      if (t) {
        const body = el('p', 'mb-post-t', t, { dir: 'auto' });
        li.append(body);
        if (t.length > 280) { body.classList.add('is-cut'); li.append(btn('mb-readmore', tt('Read more'), ev => { body.classList.remove('is-cut'); ev.currentTarget.remove(); })); }
      }
    } else if (a.kind === 'mission') {
      head.append(el('span', 'mb-act-k', tt('Finished the mission')), ' ', el('b', null, a.what), ' ', when);
      li.append(head);
    } else {
      head.append(el('span', 'mb-act-k', IU ? tt('Posted the event') : tt('Hosted')), ' ');
      head.append(el('a', null, a.g.title || tt('a gathering'), { href: page(DATA.paths.one + '?id=' + encodeURIComponent(a.g.id)) }), ' ', when);
      li.append(head);
    }
    return li;
  }
  function draw() {
    const pick = acts.filter(a => only === 'all' || a.kind === only);
    list.textContent = '';
    pick.slice(0, shown).forEach(a => list.append(row(a)));
    const left = pick.length - shown;
    more.hidden = left <= 0;
    more.textContent = tt('Show more ({n} left)', { n: dig(Math.max(0, left)) });
  }
  draw();
  if (bar.childNodes.length) wrap.append(bar);
  wrap.append(list, more);
  return wrap;
}

/* about/team/: everyone on the team (mods/ in the database, by account id; a quiet member is never in it and never shown),
   the site's own account first. Each card is the way to that profile: the picture, the name, the one line, how much they
   wrote. The team page itself (team/) is the team's own room and stays theirs. */
async function initCrew(box) {
  const body = box.querySelector('[data-mb-body]');
  await data();
  if (!DATA || !K || K.off) { body.setAttribute('aria-busy', 'false'); return; }
  const { F, db } = await within(25000, fb());
  const hostId = DATA.host && DATA.host.uid;
  /* mods/ itself, not only its ids: build/team.py writes the name each person is known by there, so someone on the team
     who has not posted or made a profile yet is still on the page (16 October 2026: five on the team, two shown). */
  const [mods, rows] = await Promise.all([within(12000, F.getDocs(F.query(F.collection(db, 'mods'), F.limit(100))))
    .then(s => s.docs.map(d => ({ id: d.id, name: String((d.data() || {}).name || '') }))).catch(() => []),
  (K.live ? within(20000, K.live()) : Promise.resolve(null)).catch(() => null)]);
  const mine = uid => (rows ? rows.filter(r => r.uid === uid && r.status === 'live') : null);
  const people = await Promise.all(mods.filter(m => m.id !== hostId && idOk(m.id)).map(async m => {
    const id = m.id, P = await F.getDoc(F.doc(db, 'profiles', id)).then(s => (s.exists() ? s.data() : null)).catch(() => null);
    const posts = mine(id), last = posts && posts.length ? posts.slice().sort((a, b) => (b.ms || 0) - (a.ms || 0))[0] : null;
    return { id, P, n: posts ? posts.length : null, name: (P && P.name) || (last && last.name) || m.name };
  }));
  body.textContent = ''; body.setAttribute('aria-busy', 'false');
  const ul = el('ul', 'mb-crew');
  function cardFor(uid, name, bio, pic, tag, n) {
    const li = el('li'), a = el('a', 'mb-crew-card', null, { href: page(DATA.paths.member + '?u=' + encodeURIComponent(uid)) });
    const who = el('div', 'mb-crew-who'), top = el('p', 'mb-crew-name');
    top.append(el('b', null, name, { dir: 'auto' }), ' ', el('span', 'mb-tag ' + (tag === 'host' ? 'mb-tag-host' : 'mb-tag-team'), tag === 'host' ? tt('Host') : tt('Team')));
    who.append(top);
    if (bio) who.append(el('p', 'mb-crew-bio', bio, { dir: 'auto' }));
    if (n != null) who.append(el('p', 'mb-hint', n === 1 ? tt('1 post or reply') : tt('{n} posts and replies', { n: dig(n) })));
    a.append(pic, who);
    li.append(a);
    return li;
  }
  if (hostId) ul.append(cardFor(hostId, w(DATA.host.name), w(DATA.host.bio), hostPic(), 'host', rows ? mine(hostId).length : null));
  people.filter(x => x.name && !(x.P && x.P.hidden))
    .sort((a, b) => (b.n || 0) - (a.n || 0) || a.name.localeCompare(b.name))
    .forEach(x => ul.append(cardFor(x.id, x.name, x.P && x.P.bio, picOf(x.P, x.id, x.name, false), 'team', x.n)));
  body.append(ul);
  if (ul.children.length < 2) body.append(el('p', 'mb-hint', tt('Nobody else is on the team yet.')));
  /* The way onto it: the join form on panel/ (teamjoin.js, the Team session's). Liberty Politics only: Iran Uncensored has
     no join form, and its team is marked quietly. */
  if (!IU) { const go = el('p', 'mb-go'); go.append(el('a', 'btn btn-key', tt('Join the team'), { href: page('panel/#join') })); body.append(go); }
}

/* member/?u=: a profile (rebuilt 15 October 2026, Armin: "the way people's profiles look and the way they could edit it.
   Significantly improve that: the look of it, the user interface, the ease of use, and the intuitiveness").
   ONE card at the top says who this is: the picture, the name, the rank with how far to the next one, the one line. Three
   numbers under it. The owner sees, until it is done, one short list of what is left (a picture, a line, the two questions),
   each with its own button, in place of a row of separate buttons. Tapping their own picture or Edit your profile turns that
   same card into the editor, in place: the picture with two tabs (the drawn pictures, grouped, the reader's own kind first,
   the one they were given marked; or their own photo, one big button), the line with a live count, the name, and Save and
   Cancel kept on screen at the foot. Then what they did: missions, gatherings, what they wrote. */
async function initMember(box) {
  const body = box.querySelector('[data-mb-body]'), h1 = box.querySelector('[data-mb-h]');
  await data();
  if (!DATA || !K || K.off) { body.setAttribute('aria-busy', 'false'); return; }
  const q = new URLSearchParams(location.search).get('u') || '';
  let editing = location.hash === '#edit' ? 'all' : '';
  async function draw() {
    const u = me(), uid = idOk(q) ? q : (u ? u.uid : '');
    if (h1.parentNode !== box.querySelector('.mb-wrap')) { const wrap = box.querySelector('.mb-wrap'); if (wrap) wrap.insertBefore(h1, wrap.firstChild); }
    h1.classList.remove('mb-name');
    body.textContent = ''; body.setAttribute('aria-busy', 'false');
    if (!uid) { signInFirst(body, tt('Sign in to see your profile.')); return; }
    const own = !!u && u.uid === uid;
    const { F, db } = await within(25000, fb());
    const get = p => F.getDoc(F.doc(db, ...p)).then(s => (s.exists() ? s.data() : null)).catch(() => null);
    const [P, X] = await Promise.all([get(['profiles', uid]), get(['xp', uid])]);
    if (own) { PROF = P; await loadMine(true); }
    if (K.faceKnow && P) K.faceKnow(uid, P, own);
    const posts = await postsOf(uid, F, db);
    const host = !!(DATA.host && uid === DATA.host.uid), team = await within(8000, K.team ? K.team() : Promise.resolve(new Set())).catch(() => new Set());
    const hosted = (await F.getDocs(F.query(F.collection(db, 'gatherings'), F.where('hostUid', '==', uid), F.where('hidden', '==', false), F.limit(50))).then(s => s.docs.map(d => Object.assign({ id: d.id }, d.data()))).catch(() => []))
      .filter(g => own || !didNot(g));      // a night nobody came to is the host's own business, never shown to others (16 October 2026)
    const name = host ? w(DATA.host.name) : (P && P.name) || (X && X.name) || (posts[0] && posts[0].name) || (own ? u.name : '');
    if (!name) { body.append(el('p', 'mb-empty', tt('This member has not made a profile yet.'))); return; }
    if (P && P.hidden && !own) { body.append(el('p', 'mb-empty', tt('This profile is hidden.'))); return; }
    h1.textContent = name;
    try { D.title = name + (D.title.includes('|') ? ' |' + D.title.split('|').slice(1).join('|') : ''); } catch (x) { }

    // ---- what they did, counted once for the numbers and the lists
    const xp = X && typeof X.xp === 'number' ? X.xp : 0, lv = levelOf(xp);
    const done = new Set();
    Object.values((X && X.reports) || {}).forEach(r => { if (r && r.state === 'accepted' && DATA.missions[r.mission]) done.add(w(DATA.missions[r.mission].title)); });
    if (own) Object.entries(DATA.missions).forEach(([, m]) => { if (m.auto && STATE[m.auto]) done.add(w(m.title)); });
    ((X && X.grants) || []).forEach(g => { if (g && g.what) done.add(g.what); });

    // ---- the card at the top
    const prof = el('div', 'mb-prof'), hero = el('section', 'mb-hero'), heroPic = el('div', 'mb-hero-pic'), who = el('div', 'mb-hero-who');
    const pic = host ? hostPic() : picOf(P, uid, name, own);
    if (own && !host) {
      const b = btn('mb-pic-btn', null, () => openEdit('pic'));
      b.setAttribute('aria-label', tt('Change your picture'));
      b.append(pic, svgIn(el('span', 'mb-pic-pen'), PEN));
      heroPic.append(b);
    } else heroPic.append(pic);
    h1.classList.add('mb-name');
    who.append(h1);
    const rank = el('p', 'mb-rankline');
    rank.append(el('span', 'mb-rankname', w(lv.now.name)), el('span', 'mb-xp', tt('{n} XP', { n: xp })));
    if (!host) who.append(rank);
    /* 16 October 2026: who this is to the site, as a mark that leads somewhere. The site's own account says what it is in
       its own words (members.json words.host) and leads to the About page; someone on the team leads to the team page. */
    const marks = el('p', 'mb-marks');
    if (host) marks.append(el('span', 'mb-tag mb-tag-host', tt('Host')));
    else if (team.has(uid)) marks.append(el('a', 'mb-tag mb-tag-team', tt('Team'), { href: page(K.teamPage || 'about/team/') }));
    const since = !host && P && ms(P.createdAt);
    if (since && K.niceDate) marks.append(el('span', 'mb-hint', tt('Joined {date}', { date: K.niceDate(since) })));
    if (marks.childNodes.length) who.append(marks);
    if (host) who.append(el('p', 'mb-bio', w(DATA.host.bio)), el('a', 'btn btn-line mb-more', tt('More about this site'), { href: page(DATA.host.more || 'about/') }));
    else if (P && P.bio) who.append(el('p', 'mb-bio', P.bio));
    if (own) who.append(svgIn(btn('btn btn-line mb-editbtn', tt('Edit your profile'), () => openEdit('all')), PEN));
    hero.append(heroPic, who);
    if (lv.next && !host) {
      const prog = el('div', 'mb-prog'), bar = el('div', 'mb-bar'), i = el('i');
      i.style.width = Math.max(3, Math.min(100, Math.round(100 * (xp - lv.now.xp) / (lv.next.xp - lv.now.xp)))) + '%';
      bar.append(i);
      prog.append(bar, el('p', 'mb-hint', tt('{n} XP to {level}', { n: lv.next.xp - xp, level: w(lv.next.name) })));
      hero.append(prog);
    }
    if (lv.now.line && !host) hero.append(el('p', 'mb-hint mb-rankmeaning', w(lv.now.line)));
    prof.append(hero);
    if (own && P && P.hidden) prof.append(el('p', 'mb-say bad', tt('Your profile is hidden from others while I look at a report about it.')));
    if (own && P && P.pic && !same(P.picOk, P.picAt)) prof.append(el('p', 'mb-hint', tt('Only you see this photo until I have looked at it. Usually within a day.')));

    // ---- three numbers
    const nums = el('ul', 'mb-nums');
    const num = (n, label) => { const li = el('li'); li.append(el('b', null, dig(n)), el('span', null, label)); nums.append(li); };
    const nTop = posts.filter(p => !p.parent).length;
    if (host) { num(nTop, tt('Posts')); num(posts.length - nTop, tt('Replies')); num(new Set(posts.map(p => p.about)).size, tt('Discussions')); }
    else {
      num(done.size, tt('Missions done'));
      num(posts.length, tt('Posts and replies'));
      num(hosted.length, IU ? tt('Events posted') : tt('Gatherings hosted'));
    }
    prof.append(nums);

    // ---- what is left, for the owner only, until it is done
    if (own) {
      const steps = [
        { ok: !!(P && (P.avatar || P.pic)), text: tt('Pick your picture'), go: () => openEdit('pic') },
        { ok: !!(P && P.bio && P.bio.trim()), text: tt('Write one line about you'), go: () => openEdit('bio') },
      ];
      if (!insideIran()) steps.push({ ok: questionsDone(PRIV), text: tt('Answer the two questions'), go: () => askQuestions(true) });
      const left = steps.filter(s => !s.ok).length;
      if (left) {
        const todo = el('section', 'mb-todo'), ol = el('ol', 'mb-steps');
        todo.append(el('h2', 'mb-h3', tt('Finish your profile')), el('p', 'mb-hint', tt('{n} of {m} done', { n: steps.length - left, m: steps.length })));
        steps.forEach(s => {
          const li = el('li', s.ok ? 'is-done' : '');
          li.append(svgIn(el('span', 'mb-stepdot'), s.ok ? TICK : ''), el('span', 'mb-steptext', s.text));
          if (!s.ok) li.append(btn('btn btn-key mb-btn-s', tt('Do it'), s.go));
          ol.append(li);
        });
        todo.append(ol);
        prof.append(todo);
      }
    }

    // ---- what they did
    if (done.size) {
      prof.append(el('h2', 'mb-h2', tt('Missions done')));
      const ul = el('ul', 'mb-badges');
      [...done].forEach(t => { const li = svgIn(el('li'), TICK); li.append(el('span', null, t)); ul.append(li); });
      prof.append(ul);
    }
    if (hosted.length) {
      prof.append(el('h2', 'mb-h2', IU ? tt('Events posted') : tt('Gatherings hosted')));
      const ul = el('ul', 'mb-list'); hosted.sort((a, b) => ms(b.startAt) - ms(a.startAt)).forEach(g => ul.append(card(g))); prof.append(ul);
    }
    /* Everything they did, newest first (16 October 2026, Armin: "all their comments, and all their activities"): every
       live post and reply (the proven copy of every live post, postsOf), every mission the site accepted, every gathering
       they posted. Twenty at a time; one tap filters to one kind. */
    const acts = activity(posts, X, hosted);
    if (acts.length) prof.append(el('h2', 'mb-h2', tt('Activity')), feedOf(acts));
    else prof.append(el('p', 'mb-hint', own ? tt('What you write in the discussions shows here.') : tt('Nothing here yet.')));
    body.append(prof);
    if (!own && u && !host) body.append(reportBox('p-' + uid, [['picture', tt('The picture')], ['abusive', tt('It is abusive')], ['fake', tt('It pretends to be someone')], ['advert', tt('It is an advert')], ['address', tt('It shows an address')]]));
    if (own && editing) openEdit(editing);

    // ---- the editor: the top card becomes it, in place
    function openEdit(focus) {
      editing = focus || 'all';
      if (body.querySelector('.mb-edit')) return;
      if (!u.v) { hero.after(el('p', 'mb-say bad mb-edit', tt('Confirm your email first. The link is in your inbox.'))); return; }
      const form = el('form', 'mb-form mb-edit', null, { novalidate: '' }), line = el('p', 'mb-say', '', { role: 'status', 'aria-live': 'polite' });
      let photo = (P && P.pic) || '', avatar = (P && P.avatar) || '', given = null;
      // the top: the picture as it will look, the name and the way to change it
      const top = el('div', 'mb-ed-top'), prevBox = el('div', 'mb-hero-pic'), nameBox = el('div', 'mb-ed-name');
      const pv = () => { prevBox.textContent = ''; prevBox.append(picOf({ pic: photo, avatar, picOk: null, picAt: null }, uid, name, true)); };
      pv();
      nameBox.append(el('p', 'mb-name-s', name), btn('mb-text', tt('Change your name'), () => K.open('account', {})));
      top.append(prevBox, nameBox);
      form.append(top);
      // the picture: two tabs
      const set = el('fieldset', 'mb-ed-pic'), tabs = el('div', 'mb-tabs', null, { role: 'tablist' });
      set.append(el('legend', 'mb-l', tt('Your picture')));
      const drawn = el('div', 'mb-tabpane'), mine = el('div', 'mb-tabpane');
      const tab = (text, pane) => { const b = btn('mb-tab', text, () => show(pane)); b.setAttribute('role', 'tab'); return b; };
      const tDrawn = tab(tt('Drawn pictures'), drawn), tMine = tab(tt('Your photo'), mine);
      function show(pane) {
        [[tDrawn, drawn], [tMine, mine]].forEach(([t, p]) => { const on = p === pane; t.setAttribute('aria-selected', String(on)); p.hidden = !on; });
      }
      tabs.append(tDrawn, tMine);
      set.append(tabs, drawn, mine);
      const press = () => form.querySelectorAll('.mb-av').forEach(x => x.setAttribute('aria-pressed', String(!photo && x.getAttribute('data-av') === avatar)));
      const groups = { f: tt('Women'), m: tt('Men'), n: tt('Symbols') };
      const paintGrid = () => {
        drawn.textContent = '';
        const first = given ? given.kind : 'n', order = [first].concat(['f', 'm', 'n'].filter(k => k !== first));
        order.forEach(k => {
          const list = DATA.avatars.filter(a => (a.kind || 'n') === k);
          if (!list.length) return;
          const grid = el('div', 'mb-avs', null, { role: 'group', 'aria-label': groups[k] });
          list.forEach(a => {
            const b = btn('mb-av', null, () => { avatar = a.id; photo = ''; if (crop) { dropCrop(); drop.hidden = false; clear.hidden = true; } press(); pv(); say(line, tt('Looks good. Save to keep it.')); });
            b.setAttribute('aria-label', w(a.alt) || a.id); b.setAttribute('data-av', a.id); b.setAttribute('title', w(a.alt) || '');
            b.append(el('img', null, null, { src: ROOT + a.src, alt: '', width: '72', height: '72', loading: 'lazy' }));
            if (given && given.id === a.id && !(P && (P.avatar || P.pic))) b.append(el('span', 'mb-given', tt('Given to you')));
            grid.append(b);
          });
          drawn.append(el('p', 'mb-group', groups[k]), grid);
        });
        press();
      };
      paintGrid();
      // their own photo: one big button, the file box hidden inside it
      const file = el('input', 'mb-file', null, { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', 'data-mb-file': '' });
      const drop = el('label', 'mb-drop');
      svgIn(drop, UP); drop.append(el('b', null, tt('Upload a photo')), el('span', 'mb-hint', tt('You choose which part shows. It is made small before it leaves your phone.')), file);
      /* 16 October 2026: a chosen photo opens in the chooser (cropper above); Use this part makes the picture, and the
         chooser is kept so Change which part shows reopens it where it was left. Save while it is open uses what it shows. */
      let crop = null, cropUrl = '';
      const cropBox = el('div', 'mb-crop-box'), cropActs = el('div', 'mb-crop-acts');
      cropBox.hidden = true;
      const dropCrop = () => { if (crop) crop.stop(); crop = null; if (cropUrl) URL.revokeObjectURL(cropUrl); cropUrl = ''; cropBox.hidden = true; cropBox.textContent = ''; adjust.hidden = true; };
      const useCrop = () => {
        if (!crop || cropBox.hidden) return true;
        try { photo = crop.get(); } catch (e) { say(line, tt('That picture could not be made small enough. Try another one.'), true); return false; }
        cropBox.hidden = true; drop.hidden = false; clear.hidden = false; adjust.hidden = false; press(); pv();
        return true;
      };
      const useIt = el('button', 'btn btn-key', tt('Use this part'), { type: 'button' });
      useIt.addEventListener('click', () => { if (useCrop()) { say(line, tt('Ready. Save to keep it.')); try { prevBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (x) { } } });
      const another = btn('mb-text', tt('Choose another photo'), () => file.click());
      cropActs.append(useIt, another);
      const adjust = btn('mb-text', tt('Change which part shows'), () => { if (!crop) return; cropBox.hidden = false; drop.hidden = true; say(line, ''); try { cropBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (x) { } });
      adjust.hidden = true;
      const clear = btn('mb-text', tt('Remove the photo'), () => { photo = ''; dropCrop(); drop.hidden = false; clear.hidden = true; if (!avatar && given) avatar = given.id; press(); pv(); });
      clear.hidden = !photo;
      file.addEventListener('change', async () => {
        const f = file.files && file.files[0];
        file.value = '';
        if (!f) return;
        say(line, tt('Opening it.'));
        try {
          const { img, url } = await loadPic(f);
          dropCrop(); cropUrl = url;
          crop = cropper(img);
          cropBox.append(crop.node, cropActs);
          cropBox.hidden = false; drop.hidden = true; show(mine);
          say(line, tt('Move it until your face is in the circle, then press Use this part.'));
          try { cropBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (x) { }
        } catch (e) { say(line, tt('That file is not a picture.'), true); }
      });
      if (IU) mine.append(el('p', 'mb-say bad', tt('A face photo can be seen by anyone who opens this page. A drawn picture is safer.')));
      mine.append(drop, cropBox, adjust, clear);
      show(photo ? mine : drawn);
      form.append(set);
      // the line
      const bio = el('textarea', null, null, { maxlength: String(DATA.limits.bio), rows: '3', placeholder: tt('For example: I care about free speech, and I like to host.') }); bio.value = (P && P.bio) || '';
      const cnt = el('span', 'mb-count'), upd = () => { const n = bio.value.length; cnt.textContent = dig(n) + ' / ' + dig(DATA.limits.bio); cnt.classList.toggle('near', DATA.limits.bio - n < 20); };
      bio.addEventListener('input', upd); upd();
      const bf = field(tt('One line about you'), bio, tt('What you care about, or what you would bring to a table. Never your address or your phone number.')); bf.append(cnt);
      form.append(bf);
      // Save and Cancel, kept on screen
      const bar = el('div', 'mb-ed-bar'), save = el('button', 'btn btn-key', tt('Save'), { type: 'submit' });
      const cancel = btn('btn btn-line', tt('Cancel'), () => { editing = ''; try { history.replaceState(null, '', location.pathname + location.search); } catch (x) { } draw().catch(() => { }); });
      bar.append(save, cancel, line);
      form.append(bar);
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        if (!useCrop()) return;
        const B = bio.value.trim().replace(/\s+/g, ' ');
        if (B.length > DATA.limits.bio) { say(line, tt('One line: {n} characters at most.', { n: DATA.limits.bio }), true); return; }
        if (looksLikeAddress(B) || /[<>]/.test(B)) { say(line, tt('Leave out addresses, phone numbers and the < and > signs.'), true); bio.focus(); return; }
        save.disabled = true; say(line, tt('Saving.'));
        try {
          const u2 = me(), changed = photo !== ((P && P.pic) || '');
          const doc = { name: u2.name, bio: B, pic: photo, avatar: photo ? '' : avatar, hidden: !!(P && P.hidden), updatedAt: F.serverTimestamp(),
            picAt: changed ? (photo ? F.serverTimestamp() : null) : ((P && P.picAt) || null), picOk: changed ? null : ((P && P.picOk) || null) };
          await within(20000, F.setDoc(F.doc(db, 'profiles', uid), doc));
          if (K.faceKnow) K.faceKnow(uid, doc, true);
          editing = ''; try { history.replaceState(null, '', location.pathname + location.search); } catch (x) { }
          await draw();
        } catch (e) { save.disabled = false; say(line, words(e), true); }
      });
      hero.hidden = true;
      body.querySelectorAll('.mb-todo').forEach(t => { t.hidden = true; });
      hero.after(form);
      // the picture this member was given: marked in the grid, and saved as theirs when they save without choosing
      if (K.faceGiven) K.faceGiven(name, uid).then(g => { if (!g || !form.isConnected) return; given = g; if (!avatar && !photo) { avatar = g.id; pv(); } paintGrid(); }).catch(() => { });
      const go = focus === 'bio' ? bio : focus === 'pic' ? tDrawn : null;
      try { form.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (x) { }
      if (go) setTimeout(() => { try { go.focus({ preventScroll: true }); } catch (x) { } }, 50);
    }
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
        /* a home keeps its address until the gathering itself goes, so the three go in one batch */
        for (const d of g.docs) { const b = F.writeBatch(db); b.delete(F.doc(db, 'gatherings', d.id, 'place', 'p')); b.delete(F.doc(db, 'gatherings', d.id, 'cover', 'c')); b.delete(d.ref); await b.commit().catch(() => { }); }
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
    ({ board: initBoard, new: initNew, one: initOne, member: initMember, crew: initCrew })[kind](box).catch(() => { });
  }
  const needs = !!(D.querySelector('[data-q-tick]') || D.querySelector('[data-fq]'));
  let was = !!me();
  if (was && needs) loadMine().then(carryFront).catch(() => { });
  paintState();
  D.addEventListener('lp:posted', ev => {
    if (ev && ev.detail && ev.detail.report) return;
    MYPOSTS[ev && ev.detail && ev.detail.reply ? 'reply' : 'post'] = true; paintState();
    /* the event does not say which discussion the post was in (community.js), so the War Room's tick reads the reader's own
       posts again, once, until it is done (15 October 2026) */
    if (!MYPOSTS.warroom) setTimeout(() => { loadMine(true).catch(() => { }); }, 1500);
  });
  if (K) K.sub(() => {
    const now = !!me(), came = now && !was; was = now;
    if (!now) { PRIV = PROF = null; mineFor = ''; paintState(); return; }
    if (came || needs) loadMine().then(async () => { await carryFront(); if (came) askWhenFree(); }).catch(() => { });
  });
}
start();
