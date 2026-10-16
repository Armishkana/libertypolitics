/* Join the team: the form on panel/ of libertypolitics.com (README.md, "Join the team").

   community.js must be on the page before this file: it hands over Firebase, the signed-in reader and the sign-in
   panel (window.LP.members). An application is one document, teamapply/<the id of the account>, that only its
   owner and an admin can read (firestore.rules, "the team: applications"). Sending it also marks the account as a
   creator, with the kind of creator they said (users/<id>.creator and .creatorKind), so the Funnel page and the
   Intel Room know them. Applying needs an account, because the Team mark goes on an account, never on a name.

   What a person types reaches the page through textContent and .value, never as markup. */

const D = document, $ = id => D.getElementById(id);
const FORM = $('tj');
const KINDS = ['live', 'video', 'writer', 'none'];
const DRAFT = 'lp-teamjoin-draft';
let M = null, sending = false, pending = false;

function store(v) { try { if (v) sessionStorage.setItem(DRAFT, JSON.stringify(v)); else sessionStorage.removeItem(DRAFT); } catch (x) { } }
function stored() { try { return JSON.parse(sessionStorage.getItem(DRAFT) || 'null'); } catch (x) { return null; } }
function say(text, bad) { const l = $('tj-msg'); l.textContent = text || ''; l.className = 'tj-msg' + (bad ? ' bad' : ''); if (text && l.scrollIntoView) { try { l.scrollIntoView({ block: 'nearest' }); } catch (x) { } } }
function fromTag() { try { const f = (new URLSearchParams(location.search).get('from') || '').toLowerCase(); return /^[a-z0-9]{1,12}$/.test(f) ? f : ''; } catch (x) { return ''; } }
/* "youtube.com/@name" is what people type: it is made a full https address. Anything that is still not one is refused. */
function link(s) {
  s = (s || '').trim().replace(/\s+/g, '');
  if (!s) return '';
  if (/^http:\/\//i.test(s)) s = 'https://' + s.slice(7);
  if (!/^https:\/\//i.test(s)) s = 'https://' + s.replace(/^\/+/, '');
  return /^https:\/\/[^\s<>"']{4,}$/.test(s) && s.length <= 200 && /\.[a-z]{2,}/i.test(s) ? s : null;
}
function read() {
  const k = FORM.querySelector('input[name="tj-kind"]:checked');
  return { name: $('tj-name').value.trim(), ch: [$('tj-ch1').value, $('tj-ch2').value, $('tj-ch3').value], kind: k ? k.value : '',
    about: $('tj-about').value.trim(), tz: $('tj-tz').value.trim() };
}
function fill(v) {
  if (!v) return;
  if (v.name) $('tj-name').value = v.name;
  (v.ch || v.channels || []).forEach((c, i) => { if (i < 3 && c) $('tj-ch' + (i + 1)).value = c; });
  if (KINDS.includes(v.kind)) { const r = FORM.querySelector('input[name="tj-kind"][value="' + v.kind + '"]'); if (r) r.checked = true; }
  if (v.about) $('tj-about').value = v.about;
  if (v.tz) $('tj-tz').value = v.tz;
}
/* What is wrong with the form, as one sentence, or '' when it can be sent. */
function problem(v) {
  if (v.name.length < 2) return 'Write your name, the one people know you by.';
  if (/[<>]/.test(v.name + v.about)) return 'Please leave out the < and > signs.';
  if (!v.kind) return 'Pick what you make, or "Not yet".';
  const bad = v.ch.filter(c => c.trim() && link(c) === null);
  if (bad.length) return 'This link does not look like an address: ' + bad[0].trim().slice(0, 60);
  if (v.kind !== 'none' && !v.ch.some(c => link(c))) return 'Add a link to your channel or page, so I can watch you first.';
  if (v.about.length < 10) return 'Say in a sentence or two what you talk about.';
  return '';
}

let whoRun = 0;
async function who() {
  const line = $('tj-who'), u = M.user(), run = ++whoRun;      /* the reader can change twice in a moment: only the newest call writes the line */
  if (!u) { line.textContent = 'When you press Send, you make a free account first (or sign in). The Team mark goes on that account.'; return; }
  const base = 'Signed in as ' + (u.email || 'your account') + '. The answer comes to that address.';
  line.textContent = base;
  try {
    const { F, db } = await M.fb(), snap = await M.within(20000, F.getDoc(F.doc(db, 'teamapply', u.uid)));
    if (run !== whoRun || !snap.exists()) return;
    const d = snap.data(), at = d.at && d.at.toDate ? d.at.toDate() : null;
    if (!stored() && !FORM.hidden) fill(d);
    line.textContent = base + ' You applied' + (at ? ' on ' + at.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : '') + '. Sending again updates it.';
  } catch (x) { }
}

async function send() {
  if (sending) return;
  const v = read(), p = problem(v);
  if (p) { say(p, true); return; }
  const u = M.user();
  if (!u) {
    store(v); pending = true;
    say('Make your free account in the panel that opened, then this sends by itself.');
    M.open('auth', { mode: 'new', why: 'Make a free account to send your application. The Team mark goes beside this account\'s name.' });
    return;
  }
  sending = true; pending = false;
  const go = $('tj-go'); go.disabled = true; say('Sending...');
  const channels = v.ch.map(link).filter(Boolean);
  try {
    const { F, db } = await M.fb();
    await M.within(20000, F.setDoc(F.doc(db, 'teamapply', u.uid), { name: v.name, email: u.email, channels, kind: v.kind,
      about: v.about.slice(0, 1000), tz: v.tz.replace(/[^A-Za-z0-9_+:/ -]/g, '').slice(0, 64), from: fromTag(), at: F.serverTimestamp(), status: 'new' }));
    store(null);
    /* The account is marked a creator, with its kind. A refusal here never undoes the application. */
    try {
      const ref = F.doc(db, 'users', u.uid), snap = await M.within(20000, F.getDoc(ref));
      if (snap.exists()) {
        const mark = { creator: true, creatorKind: v.kind, email: u.email, confirmed: !!u.emailVerified };
        if (!snap.data().channel && channels[0]) mark.channel = channels[0];
        await M.within(20000, F.updateDoc(ref, mark));
      }
    } catch (x) { }
    say('');
    FORM.hidden = true;
    const done = $('tj-done'); done.hidden = false;
    try { done.focus(); done.scrollIntoView({ block: 'start' }); } catch (x) { }
  } catch (x) {
    say((x && x.code === 'permission-denied') ? 'The site refused it. Check the links start with https:// and try again.' : 'It did not send. Check your connection and press Send again.', true);
  } finally { sending = false; go.disabled = false; }
}

function start(m) {
  M = m;
  if (!FORM) return;
  try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz && !$('tj-tz').value) $('tj-tz').value = tz; } catch (x) { }
  fill(stored());
  FORM.addEventListener('submit', e => { e.preventDefault(); send(); });
  M.sub(() => { who(); if (pending && M.user()) { M.close && M.close(); send(); } });
  M.fb().then(who, () => { $('tj-who').textContent = 'The form could not reach the site. Check your connection and reload.'; });
  /* An account panel left open with a draft from before a reload: send it once they are in. */
  if (stored()) pending = true;
}
(function wait(n) {
  const m = window.LP && window.LP.members;
  if (m) { if (window.LP.close) m.close = window.LP.close; start(m); return; }
  if (n > 150) { const w = $('tj-who'); if (w) w.textContent = 'The form needs the page to finish loading. Reload it.'; return; }
  setTimeout(() => wait(n + 1), 100);
})(0);
