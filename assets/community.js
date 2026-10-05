/* Liberty Score: reader accounts, and what readers say.

   Every page works with this file missing. The build prints the pages; this file adds the parts that
   need an account: the sign-in panel, sending from the "Have your say" box, the posts readers made
   on a page (a race, a member, a state, a vote, or one of the site's own pages) with their replies,
   likes, unlikes and reports, the newest posts on the front page, the discussion page (talk/) and the
   page for the people who run the site (mod/).

   The rules in ../firebase/firestore.rules are published by hand, after the pages. So this file works
   under both versions of them (isV2 below): under the first, what it writes keeps the first shape, and
   the things only the second allows (a post on a state, vote or site page, a tagged post, a reply) fall
   back to the form or are not offered. Nothing has to be published again when the rules change.

   Accounts and posts are kept in Firebase. Its code is fetched only when it is needed: when this device
   has signed in before, when a reader taps Sign in, Send, Like, Unlike or Report, or when a discussion
   comes near the screen. What may be read and written is decided by ../firebase/firestore.rules, never
   by this file; anything here that checks who a reader is exists only to draw the right thing.

   A reader's words reach the page through textContent, never as markup. */

const D = document, root = D.documentElement.getAttribute('data-root') || './';
const $ = id => D.getElementById(id);
const CFG = (() => { try { return JSON.parse($('lp-cfg').textContent); } catch (x) { return null; } })();

/* ONE script for every site that carries a discussion (libertypolitics.com and iranuncensored.com). A site
   may hand in its own settings and its own words as window.LPSITE, set by a small script the build loads
   before this one (iranuncensored.com: assets/community-en.js and assets/community-fa.js, made by its
   render.py from site-iu/build/community-strings.json and site-iu/firebase/shared.json). With nothing handed
   in, everything below is exactly libertypolitics.com: its English words, its name rule, its addresses.
   tt(): every word a reader sees goes through it. The English sentence is the key; a site's table may give
   another sentence for it; the {parts} are filled in after that, numbers in the site's own digits.
   site-iu/build/test_discussion.py fails when a key here has no Persian. */
const SITE = (window.LPSITE && typeof window.LPSITE === 'object') ? window.LPSITE : {};
const STR = SITE.strings || null, DIGITS = typeof SITE.digits === 'string' && SITE.digits.length === 10 ? SITE.digits : '';
const dig = n => (DIGITS ? String(n).replace(/[0-9]/g, d => DIGITS[d]) : String(n));
function tt(s, v) {
  let out = STR && typeof STR[s] === 'string' ? STR[s] : s;
  if (v) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in v ? (typeof v[k] === 'number' ? dig(v[k]) : String(v[k])) : m));
  return out;
}
/* A sentence with one element inside it ("We sent a link to <b>you@example.com</b>. Open it ..."): the
   words before it, the element, the words after it, in the order the site's language puts them. */
function ttParts(s, name, node) { const p = tt(s).split('{' + name + '}'); return p.length === 2 ? [p[0], node, p[1]] : [p[0], node]; }
const RTL = SITE.dir === 'rtl', LANG = SITE.lang || 'en';
/* Two languages in one room: a site that hands in two "langs" shows every post in the language it was
   written in, offers a translation of the posts in the other one, and a filter once both are there
   (langOf, trCtl and langRow, further down). libertypolitics.com hands in none, and has none of it. */
const ML = Array.isArray(SITE.langs) && SITE.langs.length > 1;
/* A site that promises its readers nothing is fetched from anywhere else until they ask (iranuncensored.com,
   for readers inside Iran) hands in quiet: then no count of posts is asked for before a reader opens the
   discussion, and a shared video shows no picture from YouTube before it is tapped. */
const QUIET = SITE.quiet === true;

/* The local test emulators. The switch exists only on this machine's own addresses: on any other host
   EMU can never become true, whatever the address says. */
const LOCAL = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
let EMU = false;
if (LOCAL) {
  try {
    if (new URLSearchParams(location.search).get('lpemu') === '1') sessionStorage.setItem('lpemu', '1');
    EMU = sessionStorage.getItem('lpemu') === '1';
  } catch (x) { EMU = false; }
}
const DEMO = SITE.demo || { apiKey: 'demo-key', authDomain: 'demo-lp.firebaseapp.com', projectId: 'demo-lp', appId: 'demo-lp' };
/* A build made with no real project (data/firebase-config.json missing) never talks to the network. */
const OFF = !CFG || (!EMU && /^demo-/.test(String(CFG.fb && CFG.fb.projectId)));
/* "Continue with Google" is behind one switch in the build ("google" in data/firebase-config.json, read by
   render.py). Off, the panel is email and password only and nothing here mentions Google sign-in. */
const GOOGLE = !!(CFG && CFG.google === true);
const MAX = (CFG && CFG.max) || 600;
/* The name rule. A site may allow more letters (Persian on iranuncensored.com); the rules of its own
   Firebase project must then allow exactly the same, so one file feeds both (site-iu/firebase/shared.json).
   LETTER: what counts as a letter of a name, for the face beside a post and for where a name ends in a reply. */
const NAME_OK = SITE.nameOk ? new RegExp(SITE.nameOk) : /^[A-Za-z0-9 ._'@-]{1,40}$/, URL_OK = /^https:\/\/[^\s<>"']{4,400}$/;
const LETTER = SITE.letter ? new RegExp(SITE.letter) : /[A-Za-z0-9]/;
/* The way to the panel of the live show, where a site has one. Without it nothing here speaks of a panel. */
const PANEL = (CFG && CFG.panel) || '';
/* Switches for the tests, read only in emulator mode: a value kept for this tab under a name. */
const hookVal = k => { try { return EMU ? sessionStorage.getItem(k) || '' : ''; } catch (x) { return ''; } };
/* Names that would let a reader pass as the site or its owner are kept for the people who run it.
   The rules refuse them too (reserved() in firestore.rules, the same two patterns). */
/* What a yes to the news box gets a reader, said next to the box wherever it is offered. */
const NEWS_HINT = tt('One email a week at most: the grades that moved, the votes that moved them, and one clip from the show. Untick it whenever you like.');
/* A site with more letters in its names hands in the same test in its own letters (SITE.reserved): the
   letters that are written two ways are made one first (fold), then the same two patterns are tried. */
const RES = SITE.reserved || null, RES_FOLD = RES ? (RES.fold || []).map(([a, b]) => [new RegExp(a, 'g'), b]) : [];
const RES_SQUASH = RES ? new RegExp(RES.squash, 'g') : /[ ._'@-]/g, RES_IN = RES ? new RegExp(RES.inside) : /(libertypolitics|iranuncensored|arminnavabi)/;
const RES_WORD = RES ? new RegExp(RES.word) : /(^|[^a-z0-9])(armin|navabi|admin[a-z]*|moderator[a-z]*|official)([^a-z0-9]|$)/;
function reservedName(n) {
  let l = String(n).toLowerCase();
  RES_FOLD.forEach(([a, b]) => { l = l.replace(a, b); });
  return RES_IN.test(l.replace(RES_SQUASH, '')) || RES_WORD.test(l);
}
let adminIs = false;
function nameProblem(n) {
  if (!n) return tt('Type the name you want shown with your posts.');
  if (!NAME_OK.test(n)) return tt('Use only letters, numbers, spaces and . _ \' @ - in the name, 40 at most.');
  if (reservedName(n) && !adminIs) return tt('That name is kept for the people who run the site. Choose another.');
  return '';
}
/* The browsers built into the Facebook, Instagram, X, TikTok, Telegram and Line apps, and Android apps that
   show a page inside themselves. Google refuses to sign anyone in from inside these, so there the panel
   leads with the email form and says where Google does work. */
const INAPP = /FBAN|FBAV|Instagram|Twitter|TikTok|Telegram|\bLine\/|; wv\)/.test(hookVal('lpua') || navigator.userAgent || '');

function el(tag, cls, text, attrs) {
  const e = D.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function btn(cls, text, fn) { const b = el('button', cls, text, { type: 'button' }); if (fn) b.addEventListener('click', fn); return b; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* Nothing may wait forever: a promise that has not settled in ms fails as "slow". */
function within(ms, p) { return Promise.race([p, new Promise((_, no) => setTimeout(() => no({ code: 'lp/slow' }), ms))]); }
const KEY = { me: EMU ? 'lp-emu-me' : 'lp-me', seen: EMU ? 'lp-emu-seen' : 'lp-seen', draft: 'lp-draft' };
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (x) { return null; } },
  set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (x) { } }
};
const ICON = {
  up: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.3a2 2 0 0 0 2-1.7l1.4-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.7a2 2 0 0 0-2 1.7l-1.4 9a2 2 0 0 0 2 2.3zm7-13h2.7A2.3 2.3 0 0 1 22 4v7a2.3 2.3 0 0 1-2.3 2H17"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  g: '<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>'
};

/* ------------------------------------------------------------------ video links
   The same three patterns as embed_of() in render.py. build/phone-test.html checks that the two read a
   list of sample links the same way; change them together. */
function embedOf(url) {
  url = String(url || '');
  let m = /^https:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/)([\w-]{11})(?![\w-])/.exec(url) || /^https:\/\/youtu\.be\/([\w-]{11})(?![\w-])/.exec(url);
  if (m) return ['YouTube', 'https://www.youtube-nocookie.com/embed/' + m[1]];
  m = /^https:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/\w{1,15}\/status\/(\d{1,25})(?!\d)/.exec(url);
  if (m) return ['X', 'https://platform.twitter.com/embed/Tweet.html?id=' + m[1] + '&theme=dark&dnt=true'];
  m = /^https:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reel|tv)\/([\w-]{5,20})(?![\w-])/.exec(url);
  if (m) return ['Instagram', 'https://www.instagram.com/' + m[1] + '/' + m[2] + '/embed/'];
  return null;
}
/* Tracking parts are cut off a link before it is kept. */
function cleanUrl(url) {
  try {
    const u = new URL(url);
    [...u.searchParams.keys()].forEach(k => { if (/^(utm_|si$|igsh$|igshid$|fbclid$|feature$|s$|t$|ref_src$|ref_url$)/.test(k) && !(k === 't' && /youtu/.test(u.hostname))) u.searchParams.delete(k); });
    u.hash = '';
    return u.toString();
  } catch (x) { return url; }
}
/* The channel a video is on, when the link itself says so. A YouTube video link does not. */
function channelOf(url) {
  let m = /^https:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/(\w{1,15})\/status\//.exec(url);
  if (m && m[1] !== 'i') return 'https://x.com/' + m[1];
  m = /^https:\/\/(?:www\.)?instagram\.com\/([\w.]{1,30})\/(?:p|reel|tv)\//.exec(url);
  if (m) return 'https://www.instagram.com/' + m[1] + '/';
  m = /^https:\/\/(?:www\.)?tiktok\.com\/(@[\w.]{1,30})\/video\//.exec(url);
  if (m) return 'https://www.tiktok.com/' + m[1];
  return '';
}
function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (x) { return tt('the site'); } }
function niceDate(ms) {
  const d = new Date(ms);
  /* A site with its own month names writes the day first: "5 October 2026", "۵ اکتبر ۲۰۲۶". */
  if (Array.isArray(SITE.months) && SITE.months.length === 12) return dig(d.getDate()) + ' ' + SITE.months[d.getMonth()] + ' ' + dig(d.getFullYear());
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
/* How long ago, the way a person would say it. Past a week it is the date. */
function ago(ms) {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return tt('just now');
  if (s < 3600) { const n = Math.floor(s / 60); return n === 1 ? tt('1 minute ago') : tt('{n} minutes ago', { n }); }
  if (s < 86400) { const n = Math.floor(s / 3600); return n === 1 ? tt('1 hour ago') : tt('{n} hours ago', { n }); }
  if (s < 7 * 86400) { const d = Math.floor(s / 86400); return d === 1 ? tt('yesterday') : tt('{n} days ago', { n: d }); }
  return niceDate(ms);
}
/* The face beside a name: its first letter on one of six quiet grounds, picked by the name so the same
   reader looks the same everywhere. None of the six is a party's colour or a grade's. A name only the
   people who run the site can hold (reservedName) gets the site's own mark instead. */
function face(name) {
  const f = el('span', 'av', null, { 'aria-hidden': 'true' });
  if (reservedName(name)) { f.classList.add('av-host'); f.append(el('img', null, null, { src: root + (SITE.mark || 'assets/seal.png'), alt: '', width: '36', height: '36', decoding: 'async' })); return f; }
  let h = 0;
  for (const c of String(name)) h = (h * 31 + c.codePointAt(0)) % 9973;
  f.classList.add('av-' + (h % 6));
  f.textContent = ((LETTER.exec(name) || ['?'])[0]).toUpperCase();
  return f;
}
/* The page a discussion belongs to, from its key. null when the key is not one of ours: the front page is
   the empty address, so '' is an answer. render.py works it out the same way (subject_of), and
   build/phone-test.html checks the two agree. The same keys are the only ones the rules take. */
/* A site with other pages hands in its own: the kinds of page that are named by a slug and the folder of
   each (SITE.kinds), its single pages and the address of each (SITE.pages), and what every address starts
   with (SITE.base: "fa/" on a Persian page of iranuncensored.com, so one discussion is reached from the
   page in the reader's own language). The rules of that site's project take exactly the same keys. */
const SITE_KINDS = SITE.kinds || null, SITE_PAGES = SITE.pages || null, BASE = SITE.base || '';
const KEY_OK = SITE_KINDS && SITE_PAGES
  ? new RegExp('^(?:(' + Object.keys(SITE_KINDS).join('|') + '):([a-z0-9-]{2,60})|(\\b\\B)(x)|(page):(' + Object.keys(SITE_PAGES).join('|') + '))$')
  : /^(?:(race|member|vote):([a-z0-9-]{2,60})|(state):([a-z]{2})|(page):(home|scorecard|races|states|votes|methodology|about|believe|build|you))$/;
const DIR = SITE_KINDS && SITE_PAGES ? SITE_KINDS : { race: 'races/', member: 'scorecard/', state: 'states/', vote: 'votes/' };
function keyKind(about) { const m = KEY_OK.exec(about || ''); return m ? m[1] || m[3] || m[5] : ''; }
function pathOf(about) {
  const m = KEY_OK.exec(about || '');
  if (!m) return null;
  if (m[5]) return BASE + (SITE_KINDS && SITE_PAGES ? SITE_PAGES[m[6]] : (m[6] === 'home' ? '' : m[6] + '/'));
  return BASE + DIR[m[1] || m[3]] + (m[2] || m[4]) + '/';
}
/* How a page is named inside a sentence when all we have is its key (the discussion page, the report menu). */
function whatOf(about) { const k = keyKind(about); return k === 'race' ? tt('this race') : k === 'member' ? tt('this politician') : k === 'vote' ? tt('this vote') : k === 'state' ? tt('this state') : tt('this page'); }
/* The tag on a post. The first three say what a plain post is; the other four are the kinds a reader picks
   in the box when it is more than an opinion (KINDS in render.py), and those also reach us through the form. */
const TAGS = { wrong: tt('Something is wrong'), source: tt('Something we missed'), bug: tt('Bug'), idea: tt('Idea') };
const PLAIN = { opinion: tt('Opinion'), video: tt('Video'), link: tt('Link') };

/* ------------------------------------------------------------------ what went wrong, in plain words */
function words(e) {
  const c = (e && e.code) || '';
  const wrongPw = GOOGLE ? tt('That password is not right. Try again, tap "Forgot your password?", or tap Continue with Google if that is how you made the account.') : tt('That password is not right. Try again, or tap "Forgot your password?".');
  const noAcct = GOOGLE ? tt('That email and password do not match an account. Check both, tap "Forgot your password?", or tap Continue with Google if that is how you made the account.') : tt('That email and password do not match an account. Check both, or tap "Forgot your password?".');
  const T = {
    'auth/email-already-in-use': tt('That email already has an account. Sign in with it instead.'),
    'auth/invalid-email': tt('That email does not look right. Check it and try again.'),
    'auth/missing-email': tt('Type your email first.'),
    'auth/weak-password': tt('That password is too short. Use at least 8 characters.'),
    'auth/password-does-not-meet-requirements': tt('That password is too short. Use at least 8 characters.'),
    'auth/missing-password': tt('Type your password first.'),
    'auth/wrong-password': wrongPw,
    'auth/user-not-found': tt('No account uses that email. Check the spelling, or create an account.'),
    'auth/invalid-credential': noAcct,
    'auth/invalid-login-credentials': noAcct,
    'auth/popup-blocked': tt('Your browser stopped the Google window from opening. Allow pop-ups for this site and tap Continue with Google again, or use your email below.'),
    'auth/popup-closed-by-user': tt('The Google window was closed before it finished. Tap Continue with Google to try again.'),
    'auth/cancelled-popup-request': tt('The Google window was closed before it finished. Tap Continue with Google to try again.'),
    'auth/user-cancelled': tt('The Google window was closed before it finished. Tap Continue with Google to try again.'),
    'auth/unauthorized-domain': tt('Google sign-in is not set up for this address yet. Use your email below.'),
    'auth/operation-not-supported-in-this-environment': tt('Google sign-in does not work in this browser. Use your email below, or open this page in your phone\'s own browser.'),
    'auth/web-storage-unsupported': tt('Google sign-in does not work in this browser. Use your email below, or open this page in your phone\'s own browser.'),
    'auth/account-exists-with-different-credential': tt('That email already has an account made another way. Sign in with your email and password below.'),
    'auth/user-mismatch': tt('That is a different Google account. Pick the one you signed in with.'),
    'lp/name': tt('Choose the name shown with your posts first.'),
    'auth/too-many-requests': tt('Too many tries. Wait a few minutes and try again, or reset your password.'),
    'auth/user-disabled': tt('This account has been switched off. Tell us through the box at the bottom of any page.'),
    'auth/requires-recent-login': tt('For your safety, type your password again.'),
    'auth/operation-not-allowed': tt('Accounts are not switched on yet. Try again later.'),
    'auth/network-request-failed': tt('No connection. Check your internet and try again. What you typed is still here.'),
    'auth/user-token-expired': tt('You were signed out. Sign in again.'),
    'unavailable': tt('No connection. Check your internet and try again.'),
    'lp/offline': tt('No connection. Check your internet and try again. What you typed is still here.'),
    'lp/slow': tt('That is taking too long. Check your connection and try again.'),
    'lp/off': tt('Accounts are not switched on in this preview.'),
    'lp/signedout': tt('You were signed out. Sign in again.'),
    'permission-denied': tt('That was not allowed. Reload the page and try again.'),
    'not-found': tt('That post is no longer here.')
  };
  return T[c] || tt('Something went wrong. Try again in a moment.');
}

/* ------------------------------------------------------------------ Firebase, fetched when first needed */
let S = null, sdk = null, user = null, profile = null, pending = null;
let me = OFF ? null : store.get(KEY.me);
if (me && !(me.uid && typeof me.name === 'string')) me = null;
const subs = [];
/* Two switches for the tests, read only in emulator mode: lpbreak makes Firebase unreachable, lpnoindex
   makes the ordered question for the site-wide list fail the way a missing index does. */
const hook = k => { try { return EMU && sessionStorage.getItem(k) === '1'; } catch (x) { return false; } };
/* Which version of the rules is live. Under the second anyone may ask for config/rules (there is no such
   document; being allowed to ask is the answer), under the first the question is refused. A yes is kept on
   this device, because rules do not go back; a no is asked again on the next page. "lpv1" makes a test
   run as if the first version were live. */
let v2 = null;
async function isV2() {
  if (hook('lpv1')) return false;
  if (v2 !== null) return v2;
  if (!EMU && store.get('lp-v2') === 1) return (v2 = true);
  const { F, db } = await fb();
  try { await F.getDoc(F.doc(db, 'config', 'rules')); v2 = true; if (!EMU) store.set('lp-v2', 1); }
  catch (e) { if (e && e.code === 'permission-denied') v2 = false; else throw e; }
  return v2;
}
function fb() {
  if (OFF) return Promise.reject({ code: 'lp/off' });
  if (hook('lpbreak')) return Promise.reject({ code: 'lp/offline' });
  if (!sdk) sdk = boot().catch(e => { sdk = null; S = null; throw (e && e.code ? e : { code: 'lp/offline', cause: e }); });
  return sdk;
}
async function boot() {
  const base = 'https://www.gstatic.com/firebasejs/' + CFG.sdk + '/';
  const [app, A, F] = await within(20000, Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]));
  const a = app.initializeApp(EMU ? DEMO : CFG.fb), auth = A.getAuth(a), db = F.getFirestore(a);
  if (EMU) {
    A.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    F.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  S = { A, F, auth, db };
  await within(20000, new Promise(res => {
    let first = true;
    const done = () => { if (first) { first = false; res(); } };
    A.onAuthStateChanged(auth, u => { onUser(u); done(); }, done);
  }));
  return S;
}
function onUser(u) {
  const was = me;
  user = u || null;
  if (u) {
    const same = was && was.uid === u.uid;
    /* v: the email is confirmed. ok: the users document says so too and held posts were let out (settle). */
    /* name: the one the reader chose. It is empty for a moment while an account is being made, and for a
       reader who came in through Google until they have chosen one (Google's own name is never used). */
    me = { uid: u.uid, name: u.displayName || '', email: u.email || '', v: !!u.emailVerified, last: (same && was.last) || 0, ok: !!(same && was.ok && u.emailVerified) };
    store.set(KEY.me, me); store.set(KEY.seen, 1);
    if (!same) { profile = null; adminIs = false; }
  } else { me = null; profile = null; adminIs = false; store.set(KEY.me, null); }
  changed();
}
function changed() { paintHeader(); paintBox(); subs.forEach(f => { try { f(); } catch (x) { } }); }

/* The users document: what the account keeps beside the email and the password. */
async function loadProfile(force) {
  if (profile && !force) return profile;
  const { F, db } = await fb();
  if (!user) throw { code: 'lp/signedout' };
  const ref = F.doc(db, 'users', user.uid), snap = await F.getDoc(ref);
  if (snap.exists()) profile = snap.data();
  else if (!user.displayName) throw { code: 'lp/name' };      // came in through Google and has not chosen a name yet
  else profile = await makeProfile(user.displayName, false);
  return profile;
}
/* Google, in a window of its own. Called straight from the tap, with nothing awaited before it, or the
   browser treats the window as a pop-up nobody asked for and blocks it. In the test emulators a made-up
   Google reader is used instead of the window (the "lpgoogle" switch). */
function googleCred(again) {
  const { A, auth } = S, fake = hookVal('lpgoogle');
  if (fake) {
    const c = A.GoogleAuthProvider.credential(fake);
    return again ? A.reauthenticateWithCredential(auth.currentUser, c) : A.signInWithCredential(auth, c);
  }
  const p = new A.GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return again ? A.reauthenticateWithPopup(auth.currentUser, p) : A.signInWithPopup(auth, p);
}
const hasPassword = u => !!(u && u.providerData || []).some(p => p.providerId === 'password');
/* news: the reader's own tick on "Email me news from Liberty Politics". newsAt: the proof of that yes, the
   server's time in the write that turns news on, and nothing while news is off. The rules refuse any other
   value (a typed time, a time moved later, a time left behind after a no). Both ways in write it here:
   making an account (email or Google) and the account panel. */
const stamp = () => ({ toMillis: () => Date.now() });      // what this page holds until the server's own time is read back
async function makeProfile(name, news) {
  const { F, db } = S;
  const d = { name, email: user.email, confirmed: !!user.emailVerified, creator: false, channel: '', news: !!news, newsAt: news ? F.serverTimestamp() : null,
    createdAt: F.serverTimestamp(), lastPostAt: null, lastPost: '' };
  await F.setDoc(F.doc(db, 'users', user.uid), d);
  profile = Object.assign({}, d, { createdAt: null, newsAt: news ? stamp() : null });
  return profile;
}
async function saveProfile(patch) {
  await loadProfile();
  const { F, db } = S;
  const full = Object.assign({}, patch, { confirmed: !!user.emailVerified, email: user.email });
  let at;      // undefined: the news tick is not changing, so its time is left alone
  if ('news' in patch) {
    full.news = !!patch.news;
    if (!full.news) at = null;                         // off: no time is kept
    else if (!profile.news) at = stamp();              // off to on: this write's time
    if (at !== undefined) full.newsAt = at ? F.serverTimestamp() : null;
  }
  await F.updateDoc(F.doc(db, 'users', user.uid), full);
  Object.assign(profile, full, at !== undefined ? { newsAt: at } : {});
}
let holdAt = 0, holdIs = false;
async function holdOn(force) {
  if (!force && Date.now() - holdAt < 60000) return holdIs;
  const { F, db } = await fb(), snap = await F.getDoc(F.doc(db, 'config', 'site'));
  holdIs = snap.exists() && snap.data().hold === true; holdAt = Date.now();
  return holdIs;
}
let verifySent = 0;
async function sendVerify() {
  const { A, auth } = await fb();
  if (!auth.currentUser) throw { code: 'lp/signedout' };
  try {
    if (EMU) await A.sendEmailVerification(auth.currentUser);
    else await A.sendEmailVerification(auth.currentUser, { url: location.origin + location.pathname });
  } catch (e) {
    if (!/continue-ur[il]|invalid-dynamic-link/.test((e && e.code) || '')) throw e;
    await A.sendEmailVerification(auth.currentUser);       // the address of this page was not accepted as the way back: send it without one
  }
  verifySent = Date.now();
}
/* Has the reader opened the link? Asks the server, and if so brings everything into line. */
async function freshVerified() {
  const { A, auth } = await fb();
  if (!auth.currentUser) return false;
  if (auth.currentUser.emailVerified && me && me.v) return true;
  await A.reload(auth.currentUser);
  if (!auth.currentUser.emailVerified) return false;
  await A.getIdToken(auth.currentUser, true);
  onUser(auth.currentUser);
  await settle(true);
  return true;
}
/* Signed in and confirmed: make the users document say so, and let posts that were waiting for it out. */
let lastSettle = { n: 0, hold: false };
async function settle(force) {
  lastSettle = { n: 0, hold: false };
  const p = await loadProfile();
  const mark = () => { if (me) { me.ok = true; store.set(KEY.me, me); } };
  if (!force && p.confirmed) { mark(); return; }
  if (!p.confirmed) await saveProfile({});
  const { F, db } = S, hold = await holdOn(true);
  const snap = await F.getDocs(F.query(F.collection(db, 'posts'), F.where('uid', '==', user.uid), F.where('status', '==', 'held'), F.limit(50)));
  let n = 0;
  for (const d of snap.docs) { try { await F.updateDoc(d.ref, { status: hold ? 'pending' : 'live' }); n++; } catch (x) { } }
  lastSettle = { n, hold };
  mark();
  if (n) reloadTalk();
}
/* The users document cannot be deleted within 30 seconds of a post (the rule that keeps the pace), so
   this waits that out first, saying so. */
async function dropUserDoc(uid, say) {
  const { F, db } = S;
  const lastAt = Math.max((me && me.last) || 0, profile && profile.lastPostAt && profile.lastPostAt.toMillis ? profile.lastPostAt.toMillis() : 0);
  const left = lastAt + 32000 - Date.now();
  if (left > 0) { say(tt('One moment. This takes about {n} seconds.', { n: Math.ceil(left / 1000) })); await sleep(left); }
  try { await F.deleteDoc(F.doc(db, 'users', uid)); } catch (x) { }
}
/* A reader who confirmed in another tab comes back to this one. */
let lookedAt = 0;
function quietCheck() {
  if (!me || me.v || D.hidden || Date.now() - lookedAt < 5000) return;
  lookedAt = Date.now();
  freshVerified().then(ok => { if (ok && sheetView === 'check') show('done', {}); else if (ok) runPending(); }).catch(() => { });
}

/* ------------------------------------------------------------------ the control in the header */
function paintHeader() {
  const a = $('acct');
  if (!a) return;
  a.textContent = '';
  a.classList.toggle('in', !!me);
  if (me) {
    a.append(el('span', 'acct-i', (me.name.match(LETTER) || ['?'])[0].toUpperCase(), { 'aria-hidden': 'true' }), el('span', 'acct-n', me.name || tt('Choose a name')));
    a.setAttribute('aria-label', me.name ? tt('Your account: {name}', { name: me.name }) : tt('Finish signing in: choose your name'));
  } else { a.textContent = tt('Sign in'); a.removeAttribute('aria-label'); }
}
function initHeader() {
  const a = $('acct');
  if (!a) return;
  a.setAttribute('role', 'button'); a.setAttribute('aria-haspopup', 'dialog');
  const go = ev => { ev.preventDefault(); openSheet(me ? (me.name ? 'account' : 'name') : 'auth', { opener: a }); if (!OFF) fb().catch(() => { }); };
  a.addEventListener('click', go);
  a.addEventListener('keydown', ev => { if (ev.key === ' ') go(ev); });
  paintHeader();
}

/* ------------------------------------------------------------------ the panel
   One real dialog: the browser keeps focus inside it, closes it on Escape, and puts focus back where
   it was. On a phone it sits at the bottom of the screen; on a computer, in the middle. */
let sheet = null, sheetBody = null, sheetTitle = null, sheetOpener = null, sheetView = '', sheetStop = [];
function buildSheet() {
  /* data-clarity-mask: the heat-map service (Microsoft Clarity, render.py analytics_tags) gets nothing that is
     in this panel. It shows the reader's email address, and it is where a password is typed. */
  sheet = el('dialog', 'sheet', null, { id: 'lp-sheet', 'aria-labelledby': 'lp-sheet-h', 'data-clarity-mask': 'true' });
  const inner = el('div', 'sheet-in'), top = el('div', 'sheet-top');
  sheetTitle = el('h2', null, '', { id: 'lp-sheet-h', tabindex: '-1' });
  const x = btn('sheet-x', null, closeSheet); x.setAttribute('aria-label', tt('Close')); x.innerHTML = ICON.x;
  top.append(sheetTitle, x);
  sheetBody = el('div', 'sheet-body');
  inner.append(top, sheetBody); sheet.append(inner);
  /* A tap on the dark area around the panel closes it. A drag that began inside the panel does not. */
  let downOut = false;
  const outside = ev => { const r = inner.getBoundingClientRect(); return ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom; };
  sheet.addEventListener('pointerdown', ev => { downOut = ev.target === sheet && outside(ev); });
  sheet.addEventListener('click', ev => { if (ev.target === sheet && downOut && outside(ev)) closeSheet(); });
  sheet.addEventListener('close', closed);     // Escape closes it too, and lands here
  D.body.appendChild(sheet);
}
/* The panel has closed: stop what it was doing and put focus back on the control that opened it. */
function closed() {
  if (sheet.open) return;
  stopView(); sheetView = '';
  const o = sheetOpener; sheetOpener = null;
  if (o && D.contains(o)) { try { o.focus({ preventScroll: true }); } catch (x) { } }
}
function stopView() { sheetStop.forEach(f => { try { f(); } catch (x) { } }); sheetStop = []; }
function openSheet(view, opts) {
  opts = opts || {};
  if (!sheet) buildSheet();
  if (!sheet.open) {
    sheetOpener = opts.opener || D.activeElement;
    if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', '');
  }
  show(view, opts);
}
function closeSheet() { if (sheet && sheet.open) { if (sheet.close) sheet.close(); else sheet.removeAttribute('open'); closed(); } }
function show(view, opts) {
  stopView();
  sheetView = view;
  sheetBody.textContent = '';
  sheetBody.scrollTop = 0;
  ({ auth: viewAuth, name: viewName, check: viewCheck, done: viewDone, account: viewAccount, gone: viewGone })[view](opts || {});
}
function msgLine() { return el('p', 'sheet-msg', '', { role: 'status', 'aria-live': 'polite' }); }
/* The line sits under the button it belongs to, so the button never jumps when the line fills; it is
   brought into view because on a phone it can be below the edge of the panel. */
function tell(line, text, bad) {
  line.textContent = text || ''; line.className = 'sheet-msg' + (bad ? ' bad' : '');
  if (text && line.scrollIntoView) { try { line.scrollIntoView({ block: 'nearest' }); } catch (x) { } }
}
function field(label, input, hint) {
  const w = el('div', 'sheet-f'), id = 'lp-' + Math.random().toString(36).slice(2, 9);
  input.id = id;
  w.append(el('label', null, label, { for: id }), input.parentNode || input);
  if (hint) { const h = el('p', 'sheet-hint', hint, { id: id + 'h' }); input.setAttribute('aria-describedby', id + 'h'); w.append(h); }
  return w;
}
function pwField(auto) {
  const wrap = el('div', 'pw'), input = el('input', null, null, { type: 'password', autocomplete: auto, maxlength: '200', required: '' });
  if (RTL) input.setAttribute('dir', 'ltr');      // a password and an email are written left to right on a right-to-left page too
  const eye = btn('pw-eye', tt('Show'), () => {
    const on = input.type === 'password';
    input.type = on ? 'text' : 'password'; eye.textContent = on ? tt('Hide') : tt('Show'); eye.setAttribute('aria-pressed', String(on));
  });
  eye.setAttribute('aria-pressed', 'false'); eye.setAttribute('aria-label', tt('Show the password'));
  wrap.append(input, eye);
  return input;
}

/* Create your account, or sign in. One tap moves between the two and keeps the email typed so far. */
function viewAuth(opts) {
  let mode = opts.mode || (store.get(KEY.seen) ? 'in' : 'new');
  const kept = { name: opts.name || '', email: opts.email || '' };
  draw(opts.say, opts.sayBad);
  function draw(note, bad) {
    sheetBody.textContent = '';
    sheetTitle.textContent = mode === 'new' ? tt('Create your account') : tt('Sign in');
    const why = mode === 'new' ? opts.why : (opts.whyIn || opts.why);
    if (why) sheetBody.append(el('p', 'sheet-why', why));
    /* Google first: one tap, no password to make, and the email arrives already confirmed. */
    let gbtn = null;
    if (!GOOGLE) { /* the switch is off: email and password only */ }
    else if (INAPP) sheetBody.append(el('p', 'sheet-hint inapp', tt('Continue with Google works once this page is open in your phone\'s own browser (Chrome or Safari). Inside this app, use your email.')));
    else {
      const gline = el('p', 'sheet-msg gmsg', '', { role: 'status', 'aria-live': 'polite' });
      const gsay = (text, bad) => { gline.textContent = text; gline.className = 'sheet-msg gmsg' + (bad ? ' bad' : ''); };
      gbtn = btn('btn gbtn', null, () => {
        if (!S) return;
        let going;
        try { going = googleCred(false); } catch (e) { gsay(words(e), true); return; }      // nothing awaited before the window opens
        gbtn.disabled = true; gsay(tt('Waiting for Google.'));
        going.then(cred => { onUser(cred.user); return afterGoogle(); }).catch(e => { gbtn.disabled = false; gsay(words(e), true); });
      });
      gbtn.innerHTML = ICON.g; gbtn.append(el('span', null, tt('Continue with Google')));
      gbtn.disabled = !S;
      if (!S) fb().then(() => { gbtn.disabled = false; }, e => gsay(e && e.code === 'lp/off' ? words(e) : tt('Google sign-in could not load. {why}', { why: words(e) }), true));
      sheetBody.append(gbtn, gline, el('p', 'sheet-or', tt('or use your email')));
    }
    const seg = el('div', 'seg', null, { role: 'group', 'aria-label': tt('New here, or have an account?') });
    [['new', tt('Create account')], ['in', tt('Sign in')]].forEach(([m, w]) => {
      const b = btn(null, w, () => { if (mode !== m) { grab(); mode = m; draw(); } });
      b.setAttribute('aria-pressed', String(mode === m)); seg.append(b);
    });
    const form = el('form', 'sheet-form', null, { novalidate: '' }), line = msgLine();
    const name = el('input', null, null, { type: 'text', autocomplete: 'nickname', maxlength: '40', required: '', autocapitalize: 'words', spellcheck: 'false' });
    const email = el('input', null, null, { type: 'email', inputmode: 'email', autocomplete: 'email', maxlength: '254', required: '', autocapitalize: 'off', spellcheck: 'false' });
    const pw = pwField(mode === 'new' ? 'new-password' : 'current-password');
    const news = el('input', null, null, { type: 'checkbox' });
    name.value = kept.name; email.value = kept.email;
    if (RTL) email.setAttribute('dir', 'ltr');
    if (ML) name.setAttribute('dir', 'auto');
    function grab() { kept.name = name.value; kept.email = email.value; }
    const go = el('button', 'btn btn-key sheet-go', mode === 'new' ? tt('Create account') : tt('Sign in'), { type: 'submit' });
    form.append(seg);
    /* A site whose readers may be in danger for reading it says so before a name or an email is typed. */
    if (mode === 'new' && SITE.safety) form.append(el('p', 'sheet-hint safety', SITE.safety));
    if (mode === 'new') form.append(field(tt('Name shown with your posts'), name));
    form.append(field(tt('Email'), email, mode === 'new' ? tt('Never shown on the site, and never passed on.') : null));
    form.append(field(mode === 'new' ? tt('Password, at least 8 characters') : tt('Password'), pw));
    if (mode === 'new') {
      const lab = el('label', 'sheet-check'); lab.append(news, el('span', null, tt('Email me news from Liberty Politics')));
      form.append(lab, el('p', 'sheet-hint news-hint', NEWS_HINT));
    } else {
      form.append(btn('sheet-text', tt('Forgot your password?'), async () => {
        const em = email.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { tell(line, tt('Type your email above first, then tap "Forgot your password?".'), true); email.focus(); return; }
        tell(line, tt('Sending the reset link.'));
        try {
          const { A, auth } = await within(25000, fb());
          await within(25000, A.sendPasswordResetEmail(auth, em));
          tell(line, tt('We sent a reset link to {email}. Open it, choose a new password, then sign in here. No email in a few minutes? Check your spam folder.', { email: em }));
        } catch (e) { tell(line, words(e), true); }
      }));
    }
    form.append(go, line);
    if (note) tell(line, note, bad);
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const nm = name.value.trim().replace(/\s+/g, ' '), em = email.value.trim(), pass = pw.value;
      if (mode === 'new' && nameProblem(nm)) { tell(line, nameProblem(nm), true); name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { tell(line, tt('That email does not look right. Check it and try again.'), true); email.focus(); return; }
      if (!pass) { tell(line, tt('Type your password.'), true); pw.focus(); return; }
      if (mode === 'new' && pass.length < 8) { tell(line, tt('That password is too short. Use at least 8 characters.'), true); pw.focus(); return; }
      go.disabled = true; tell(line, mode === 'new' ? tt('Creating your account.') : tt('Signing you in.'));
      try {
        const { A, auth } = await within(25000, fb());
        if (mode === 'new') {
          const cred = await within(25000, A.createUserWithEmailAndPassword(auth, em, pass));
          await A.updateProfile(cred.user, { displayName: nm });
          onUser(cred.user);
          try { await makeProfile(nm, news.checked); } catch (x) { profile = null; }
          try { await sendVerify(); } catch (x) { }
        } else {
          const cred = await within(25000, A.signInWithEmailAndPassword(auth, em, pass));
          onUser(cred.user);
        }
        await afterSignIn();
      } catch (e) {
        go.disabled = false;
        tell(line, words(e), true);
        if (e && e.code === 'auth/email-already-in-use') {
          line.append(btn('sheet-text', tt('Sign in with {email}', { email: em }), () => { grab(); mode = 'in'; draw(); }));
        } else if (e && /password/.test(e.code || '')) pw.focus();
      }
    });
    sheetBody.append(form, el('a', 'sheet-text', tt('What we keep, and who can see it'), { href: root + (SITE.privacy || 'privacy/'), target: '_blank', rel: 'noopener' }));
    /* Focus goes to the heading, not a field: on a phone a focused field brings the keyboard up over the Google button. */
    setTimeout(() => { try { (gbtn ? sheetTitle : mode === 'new' && !name.value ? name : !email.value ? email : pw).focus({ preventScroll: true }); } catch (x) { } }, 30);
  }
}
/* Back from Google. A reader we know goes straight on. A new one chooses the name shown with their posts
   first: Google's own name and photo are never used, so the name is blanked before anything can be posted. */
async function afterGoogle() {
  const { A, F, auth, db } = S;
  const snap = await within(20000, F.getDoc(F.doc(db, 'users', user.uid)));
  if (snap.exists()) {
    profile = snap.data();
    if (NAME_OK.test(profile.name || '') && auth.currentUser.displayName !== profile.name) { await A.updateProfile(auth.currentUser, { displayName: profile.name }); onUser(auth.currentUser); }
    await afterSignIn();
    return;
  }
  const g = ((auth.currentUser.providerData || []).find(p => p.providerId === 'google.com') || {}).displayName || auth.currentUser.displayName || '';
  let first = (g.trim().split(/\s+/)[0] || '').replace(/[^A-Za-z0-9._'@-]/g, '').slice(0, 40);
  if (reservedName(first) || SITE.noPrefill) first = '';      // never prefilled on a site whose readers should not post under their own name
  if (auth.currentUser.displayName) { await A.updateProfile(auth.currentUser, { displayName: '' }); onUser(auth.currentUser); }
  show('name', { suggest: first });
}
/* One short step for a reader who came in through Google: the name shown with their posts, and the news tick. */
function viewName(opts) {
  sheetTitle.textContent = tt('Choose your name');
  if (opts.why) sheetBody.append(el('p', 'sheet-why', opts.why));
  else if (pending && pending.type === 'send') sheetBody.append(el('p', 'sheet-why', tt('Your note is saved. Choose a name to send it.')));
  sheetBody.append(el('p', 'sheet-lead', tt('You are signed in. One thing before you post.')));
  if (SITE.safety) sheetBody.append(el('p', 'sheet-hint safety', SITE.safety));
  const form = el('form', 'sheet-form', null, { novalidate: '' }), line = msgLine();
  const name = el('input', null, null, { type: 'text', autocomplete: 'nickname', maxlength: '40', required: '', autocapitalize: 'words', spellcheck: 'false' });
  const news = el('input', null, null, { type: 'checkbox' }), lab = el('label', 'sheet-check');
  name.value = opts.suggest || '';
  if (ML) name.setAttribute('dir', 'auto');
  lab.append(news, el('span', null, tt('Email me news from Liberty Politics')));
  const go = el('button', 'btn btn-key sheet-go', tt('Continue'), { type: 'submit' });
  form.append(field(tt('Name shown with your posts'), name, tt('Your own name or a handle. Your Google name and photo are not shown to anyone.')), lab, el('p', 'sheet-hint news-hint', NEWS_HINT), go, line);
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const nm = name.value.trim().replace(/\s+/g, ' ');
    if (nameProblem(nm)) { tell(line, nameProblem(nm), true); name.focus(); return; }
    go.disabled = true; tell(line, tt('Saving.'));
    try {
      const { A, auth } = await within(20000, fb());
      if (!auth.currentUser) throw { code: 'lp/signedout' };
      await A.updateProfile(auth.currentUser, { displayName: nm });
      onUser(auth.currentUser);
      await within(20000, makeProfile(nm, news.checked));
      await afterSignIn();
    } catch (e) { go.disabled = false; tell(line, words(e), true); }
  });
  sheetBody.append(form, btn('sheet-text', tt('Sign out instead'), async () => { try { pending = null; await S.A.signOut(S.auth); } catch (x) { } closeSheet(); }),
    el('a', 'sheet-text', tt('What we keep, and who can see it'), { href: root + (SITE.privacy || 'privacy/'), target: '_blank', rel: 'noopener' }));
  setTimeout(() => { try { name.focus({ preventScroll: true }); } catch (x) { } }, 30);
}
/* Signed in a moment ago: do what the reader was in the middle of, then show the right thing. */
async function afterSignIn() {
  const sendNow = pending && pending.type === 'send', replyNow = pending && pending.type === 'reply' ? pending : null;
  let sent = false;
  if (sendNow) { pending = null; sent = await send({ auto: true }); }
  /* A reply typed signed out goes the same way a note does: at once, and only its author sees it until the email is confirmed. */
  if (replyNow) { pending = null; sent = await sendReply(replyNow.id, replyNow.text) && 'reply'; }
  if (user && user.emailVerified) {
    try { await settle(false); } catch (x) { }
    await runPending();
    closeSheet();
  } else if (user) {
    show('check', { sent, note: pending ? pendingNote() : '' });
  }
}
function pendingNote() {
  if (!pending) return '';
  return pending.type === 'vote' ? tt('Confirm your email to like or unlike. Your tap is saved.') : pending.type === 'report' ? tt('Confirm your email to report a post. Your report is saved.') : '';
}
/* A like, an unlike or a report that was waiting for the reader to sign in and confirm. */
async function runPending() {
  const p = pending;
  if (!p || !me || !me.v) return;
  pending = null;
  if (p.type === 'vote') await vote(p.id, p.dir, true);
  else if (p.type === 'report') await report(p.id, p.why);
}

/* Check your email. Looks again by itself every few seconds and when the reader comes back to the tab. */
function viewCheck(opts) {
  sheetTitle.textContent = tt('Check your email');
  const email = (me && me.email) || tt('your address'), line = msgLine();
  const p = el('p', 'sheet-lead'); p.append(...ttParts('We sent a link to {email}. Open it to confirm the address is yours.', 'email', el('b', null, email, RTL ? { dir: 'ltr' } : null)));
  sheetBody.append(p);
  if (opts.sent) sheetBody.append(el('p', 'sheet-why', opts.sent === 'reply' ? tt('Your reply is sent. Only you can see it until you confirm.') : tt('Your note is sent. Only you can see it until you confirm.')));
  sheetBody.append(el('p', 'sheet-hint', opts.note || tt('Until you confirm, only you can see what you post, and you cannot like, unlike or report. No email after a few minutes? Check your spam folder.')));
  const ok = btn('btn btn-key sheet-go', tt('I have confirmed'), async () => {
    ok.disabled = true; tell(line, tt('Checking.'));
    try {
      if (await within(20000, freshVerified())) { show('done', {}); return; }
      tell(line, tt('Not confirmed yet. Open the link in the email we sent to {email}, then come back here.', { email }), true);
    } catch (e) { tell(line, words(e), true); }
    ok.disabled = false;
  });
  const again = btn('btn btn-line', tt('Send it again'), async () => {
    again.disabled = true; tell(line, tt('Sending.'));
    try { await within(20000, sendVerify()); tell(line, tt('Sent again to {email}.', { email })); } catch (e) { tell(line, words(e), true); }
    tick();
  });
  function tick() {
    const left = Math.ceil((verifySent + 60000 - Date.now()) / 1000);
    again.disabled = left > 0;
    again.textContent = left > 0 ? tt('Send it again in {n} s', { n: left }) : tt('Send it again');
  }
  const other = btn('sheet-text', tt('Use a different email'), () => changeEmail(line));
  const acts = el('div', 'sheet-acts'); acts.append(ok, again);
  sheetBody.append(acts, line, other);
  tick();
  if (opts.resend && Date.now() - verifySent > 60000) again.click();
  const t1 = setInterval(tick, 1000);
  const look = () => { if (sheetView === 'check' && !D.hidden) freshVerified().then(v => { if (v && sheetView === 'check') show('done', {}); }).catch(() => { }); };
  const t2 = setInterval(look, 4000);
  window.addEventListener('focus', look); D.addEventListener('visibilitychange', look);
  sheetStop.push(() => { clearInterval(t1); clearInterval(t2); window.removeEventListener('focus', look); D.removeEventListener('visibilitychange', look); });
  setTimeout(() => { try { ok.focus({ preventScroll: true }); } catch (x) { } }, 30);
}
/* The wrong address was typed. The unconfirmed account is taken away, a note sent from it goes back in
   the box, and the reader starts again with the name already filled in. */
async function changeEmail(line) {
  tell(line, tt('One moment.'));
  try {
    const { A, F, auth, db } = await within(20000, fb()), u = auth.currentUser, name = me ? me.name : '';
    if (!u) { show('auth', { mode: 'new', name }); return; }
    if (u.emailVerified) { tell(line, tt('This email is already confirmed.')); return; }
    let back = null;
    try {
      const snap = await F.getDocs(F.query(F.collection(db, 'posts'), F.where('uid', '==', u.uid), F.limit(50)));
      const docs = snap.docs.slice().sort((a, b) => ((b.data().createdAt || {}).seconds || 0) - ((a.data().createdAt || {}).seconds || 0));
      back = (docs.map(d => d.data()).find(d => !d.parent)) || null;      // a reply has no place in the box: it answered a post
      for (const d of docs) await F.deleteDoc(d.ref);
    } catch (x) { }
    await dropUserDoc(u.uid, t => tell(line, t));
    try { await A.deleteUser(u); } catch (x) { await A.signOut(auth); }
    if (back && window.LPBox && !$('fbmsg').value) {
      putDraft({ kind: TAGS[back.tag] ? back.tag : back.kind === 'opinion' ? 'opinion' : 'video', text: back.text || '', url: back.url || '', mine: !!back.mine, label: back.subject, id: (back.about || '').split(':')[1] || '', on: back.about });
      pending = { type: 'send' };
    }
    show('auth', { mode: 'new', name, why: back ? tt('Type the right email. Your note is saved and will be sent again.') : tt('Type the right email.') });
  } catch (e) { tell(line, words(e), true); }
}
function viewDone() {
  sheetTitle.textContent = tt('You are in');
  const n = lastSettle.n;
  sheetBody.append(el('p', 'sheet-lead', !n ? tt('Your email is confirmed.') : lastSettle.hold ? tt('Your email is confirmed. What you posted will show once we have looked at it.') : tt('Your email is confirmed. What you posted is on the page now.')));
  sheetBody.append(el('p', 'sheet-hint', tt('You can post, answer other readers, like, unlike and report on every page.')));
  const b = btn('btn btn-key sheet-go', tt('Done'), closeSheet);
  sheetBody.append(b);
  setTimeout(() => { try { b.focus({ preventScroll: true }); } catch (x) { } }, 30);
  runPending();
}
function viewGone() {
  sheetTitle.textContent = tt('Account deleted');
  sheetBody.append(el('p', 'sheet-lead', tt('Your account, what you posted, and your likes and unlikes are gone.')));
  const b = btn('btn btn-key sheet-go', tt('Done'), closeSheet);
  sheetBody.append(b);
  setTimeout(() => { try { b.focus({ preventScroll: true }); } catch (x) { } }, 30);
}

/* Your account. */
let forceOld = false;      // a test may set this to walk the "type your password again" path
function viewAccount() {
  sheetTitle.textContent = tt('Your account');
  const line = msgLine(), wait = el('p', 'sheet-hint', tt('Loading your details.'));
  sheetBody.append(wait);
  within(20000, fb().then(() => { if (!user) throw { code: 'lp/signedout' }; return loadProfile(true); })).then(draw, e => {
    wait.remove();
    if (e && e.code === 'lp/signedout') { show('auth', { mode: 'in', say: tt('You were signed out. Sign in again.'), sayBad: true }); return; }
    if (e && e.code === 'lp/name') { show('name', {}); return; }
    tell(line, words(e), true);
    sheetBody.append(line, btn('btn btn-line', tt('Try again'), () => show('account', {})));
  });
  function draw(p) {
    if (sheetView !== 'account') return;
    wait.remove();
    const form = el('form', 'sheet-form', null, { novalidate: '' });
    const name = el('input', null, null, { type: 'text', autocomplete: 'nickname', maxlength: '40', required: '', spellcheck: 'false' }); name.value = p.name;
    if (ML) name.setAttribute('dir', 'auto');
    form.append(field(tt('Name shown with your posts'), name, tt('A new name shows on what you post from now on.')));
    const mail = el('div', 'sheet-row'), state = el('span', 'tag' + (user.emailVerified ? ' ok' : ''), user.emailVerified ? tt('Confirmed') : tt('Not confirmed'));
    mail.append(el('span', 'sheet-k', tt('Email')), el('span', 'sheet-v', user.email || '', RTL ? { dir: 'ltr' } : null), state);
    form.append(mail);
    if (!user.emailVerified) form.append(btn('sheet-text', tt('Send the confirmation link again'), () => show('check', { resend: true })));
    const creator = el('input', null, null, { type: 'checkbox', role: 'switch' }); creator.checked = !!p.creator;
    const cl = el('label', 'sheet-check sw'); cl.append(creator, el('span', null, tt('I make political videos')));
    const channel = el('input', null, null, { type: 'url', inputmode: 'url', maxlength: '200', placeholder: 'https://', autocapitalize: 'off', spellcheck: 'false' }); channel.value = p.channel || '';
    const cf = field(tt('Link to your channel'), channel, tt('YouTube, X, Instagram, TikTok or your own site. We may write to you about our live panel.'));
    cf.hidden = !creator.checked;
    creator.addEventListener('change', () => { cf.hidden = !creator.checked; });
    const news = el('input', null, null, { type: 'checkbox' }); news.checked = !!p.news;
    const nl = el('label', 'sheet-check'); nl.append(news, el('span', null, tt('Email me news from Liberty Politics')));
    const save = el('button', 'btn btn-key sheet-go', tt('Save changes'), { type: 'submit' });
    if (PANEL) form.append(cl, cf);      // the switch for people who make videos belongs to the panel of the live show
    form.append(nl, el('p', 'sheet-hint news-hint', NEWS_HINT), save, line);
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const nm = name.value.trim().replace(/\s+/g, ' ');
      let ch = creator.checked ? channel.value.trim() : (p.channel || '');
      /* A kept name is allowed to the people who run the site, so that is checked before it is refused. */
      if (reservedName(nm) && !adminIs) { try { adminIs = (await S.F.getDoc(S.F.doc(S.db, 'admins', user.uid))).exists(); } catch (x) { } }
      if (nameProblem(nm)) { tell(line, nameProblem(nm), true); name.focus(); return; }
      if (ch && !/^https?:\/\//i.test(ch)) ch = 'https://' + ch;
      ch = ch.replace(/^http:/i, 'https:');
      if (ch && !(URL_OK.test(ch) && ch.length <= 200 && /^https:\/\/[^\s\/]+\.[^\s]+$/.test(ch))) { tell(line, tt('That channel link does not look right. Copy it from the address bar of your channel.'), true); channel.focus(); return; }
      save.disabled = true; tell(line, tt('Saving.'));
      try {
        if (nm !== me.name) { await S.A.updateProfile(user, { displayName: nm }); }
        await within(20000, saveProfile({ name: nm, creator: creator.checked, channel: ch, news: news.checked }));
        onUser(S.auth.currentUser);
        channel.value = ch;
        tell(line, tt('Saved.'));
      } catch (e) { tell(line, words(e), true); }
      save.disabled = false;
    });
    sheetBody.append(form);
    const out = btn('btn btn-line', tt('Sign out'), async () => {
      out.disabled = true;
      try { pending = null; await S.A.signOut(S.auth); closeSheet(); } catch (e) { out.disabled = false; tell(line, words(e), true); }
    });
    /* Two taps, never a browser dialog: the first arms the button, the second does it. */
    let armed = false, timer = 0;
    const del = btn('sheet-text danger', tt('Delete my account'), () => {
      if (!armed) {
        armed = true; del.textContent = tt('Tap again to delete your account and everything you posted'); del.classList.add('armed');
        timer = setTimeout(disarm, 7000); return;
      }
      clearTimeout(timer);
      removeAccount();
    });
    function disarm() { armed = false; clearTimeout(timer); del.textContent = tt('Delete my account'); del.classList.remove('armed'); }
    del.addEventListener('blur', () => { if (armed && !del.disabled) disarm(); });
    /* Deleting asks who you are once more if you signed in a while ago: with the password, or, for a
       reader who has no password because they came in through Google, with Google again. */
    const again = el('form', 'sheet-form', null, { novalidate: '' }); again.hidden = true;
    const pw = pwField('current-password'), byPw = hasPassword(user);
    let first = pw;
    if (byPw) {
      again.append(field(tt('For your safety, type your password to delete the account'), pw), el('button', 'btn btn-line danger', tt('Delete my account for good'), { type: 'submit' }));
      again.addEventListener('submit', async ev => {
        ev.preventDefault();
        if (!pw.value) { tell(line, tt('Type your password.'), true); pw.focus(); return; }
        tell(line, tt('Checking your password.'));
        try {
          await within(20000, S.A.reauthenticateWithCredential(S.auth.currentUser, S.A.EmailAuthProvider.credential(user.email, pw.value)));
          forceOld = false;
          await removeAccount(true);
        } catch (e) { tell(line, words(e), true); pw.focus(); }
      });
    } else {
      const g = btn('btn gbtn', null, () => {
        let going;
        try { going = googleCred(true); } catch (e) { tell(line, words(e), true); return; }       // straight from the tap, nothing awaited first
        tell(line, tt('Waiting for Google.'));
        going.then(() => { forceOld = false; return removeAccount(true); }).catch(e => tell(line, words(e), true));
      });
      g.innerHTML = ICON.g; g.append(el('span', null, tt('Continue with Google to delete')));
      again.append(el('p', 'sheet-lead', tt('For your safety, confirm with Google that it is you. Then the account is deleted.')), g);
      again.addEventListener('submit', ev => ev.preventDefault());
      first = g;
    }
    const foot = el('div', 'sheet-foot'); foot.append(out, del);
    sheetBody.append(foot, again);
    async function removeAccount(fresh) {
      const { A, F, auth, db } = S, u = auth.currentUser;
      if (!u) return;
      const old = forceOld || Date.now() - Date.parse(u.metadata && u.metadata.lastSignInTime || 0) > 4 * 60000;
      if (old && !fresh) { again.hidden = false; del.hidden = true; tell(line, ''); first.focus(); return; }
      del.disabled = out.disabled = save.disabled = true;
      try {
        tell(line, tt('Removing what you posted.'));
        const P = F.collection(db, 'posts');
        for (let round = 0; round < 20; round++) {
          const snap = await F.getDocs(F.query(P, F.where('uid', '==', u.uid), F.limit(200)));
          if (snap.empty) break;
          const b = F.writeBatch(db); snap.docs.forEach(d => b.delete(d.ref)); await b.commit();
        }
        /* Their likes, unlikes and reports: each is a document of their own, and each takes its count off
           the post as it goes (the rules allow one only together with the other). */
        tell(line, tt('Removing your likes and unlikes.'));
        for (const kind of ['votes', 'reports']) {
          for (let round = 0; round < 20; round++) {
            const snap = await F.getDocs(F.query(F.collection(db, 'users', u.uid, kind), F.limit(200)));
            if (snap.empty) break;
            let gone = 0;
            for (const d of snap.docs) {
              /* The count is moved by one without being read, so this works on a post the reader can no
                 longer see (hidden or removed). If the post is gone, or its reports were already set back
                 to none, the document goes by itself. */
              const v = d.data().v, step = kind === 'votes'
                ? { ups: F.increment(v === 1 ? -1 : 0), downs: F.increment(v === -1 ? -1 : 0), score: F.increment(v === 1 ? -1 : 1) }
                : { nrep: F.increment(-1) };
              try { const b = F.writeBatch(db); b.update(F.doc(P, d.id), step); b.delete(d.ref); await b.commit(); gone++; }
              catch (x) { try { await F.deleteDoc(d.ref); gone++; } catch (y) { } }
            }
            if (!gone) break;
          }
        }
        tell(line, tt('Removing your account.'));
        await dropUserDoc(u.uid, t => tell(line, t));
        try { await A.deleteUser(u); }
        catch (e) {
          if (e && e.code === 'auth/requires-recent-login') { del.disabled = out.disabled = save.disabled = false; again.hidden = false; del.hidden = true; tell(line, ''); first.focus(); return; }
          throw e;
        }
        pending = null;
        show('gone', {});
        reloadTalk();
      } catch (e) { del.disabled = out.disabled = save.disabled = false; disarm(); tell(line, words(e), true); }
    }
  }
}

/* ------------------------------------------------------------------ the "Have your say" box
   site.js shapes the box. This sends it. A reader writes first; what they wrote is kept on this device
   until it has been sent, so making an account in between loses nothing. */
function boxParts() {
  const f = $('fbform');
  return f && window.LPBox ? { f, B: window.LPBox, msg: $('fbmsg'), link: $('fblink'), mine: $('fbmine'), ctx: $('fbctx'), about: $('fbabout'), done: $('fbdone'), go: f.querySelector('button[type=submit]') } : null;
}
function pageOn() { const t = $('talk'); return (t && t.getAttribute('data-on')) || ''; }
function pageName() { const t = $('talk'); return (t && t.getAttribute('data-name')) || ''; }
/* at: when the note was last written. Putting a kept note back in the box is not writing it, so it keeps
   its own time: before 5 October 2026 every visit made the note new again and its 14 days never ran out. */
function saveDraft(at) {
  const b = boxParts();
  if (!b) return;
  const text = b.msg.value, url = b.link.value;
  if (!text.trim() && !url.trim()) { const d = store.get(KEY.draft); if (d && d.path === location.pathname) store.set(KEY.draft, null); keptMark(''); return; }
  const m = /^(.*) \[([^\]]*)\]$/.exec(b.ctx.value);
  store.set(KEY.draft, { path: location.pathname, kind: b.B.kind(), text, url, mine: b.mine.checked, label: m ? m[1] : '', id: m ? m[2] : '', on: b.f.getAttribute('data-on') || '', at: typeof at === 'number' ? at : Date.now() });
  keptMark(text.trim() || url.trim());
}
function putDraft(d) {
  const b = boxParts();
  if (!b) return;
  b.B.subject(d.label || '', d.id || '', d.on || '');
  b.B.pick(d.kind);
  b.msg.value = d.text || ''; b.link.value = d.url || ''; b.mine.checked = !!d.mine;
  b.B.shape();
  saveDraft(d.at);
}
/* A note the reader wrote and never sent. It NEVER decides which side of the page opens: the address alone
   does that, and a page with no "#discussion" in it opens on the record (Armin, 5 October 2026: "when I
   click on different pages the default should not be the discussion"). The record says the note is waiting
   instead, in the two places that already ask for the discussion: the question near the top and the band
   at the end. A tap on either opens the box as the reader left it. */
let kept = '', discCount = 0;
function keptMark(text) {
  kept = text || '';
  const nd = $('nudge'), ph = $('nudge-ph'), go = $('band-go'), tab = $('mode-discussion');
  if (nd && ph) {
    if (!ph.hasAttribute('data-was')) ph.setAttribute('data-was', ph.textContent);
    nd.classList.toggle('kept', !!kept);
    ph.textContent = kept ? tt('Your unsent note: “{text}”', { text: kept.length > 48 ? kept.slice(0, 46).trimEnd() + '…' : kept })
      : discCount > 0 ? tt('Agree, or not? Add what you think.') : ph.getAttribute('data-was');
    const i = nd.querySelector('.nudge-in i'); if (i) i.textContent = kept ? tt('Finish it') : tt('Discuss');
  }
  if (go) go.textContent = kept ? tt('Finish your unsent note') : tt('Open the discussion') + (discCount > 0 ? ' (' + (discCount > 99 ? dig('99') + '+' : dig(discCount)) + ')' : '');
  if (tab) tab.setAttribute('aria-label', (discCount > 0 ? (discCount === 1 ? tt('Discussion, {n} post', { n: discCount }) : tt('Discussion, {n} posts', { n: discCount })) : tt('Discussion')) + (kept ? tt(', your unsent note is here') : ''));
}
function paintBox() {
  const who = $('fbwho');
  if (!who) return;
  who.hidden = !me;
  who.textContent = me ? tt('You are signed in as {name}.', { name: me.name }) : '';
  const n = $('fbname'); if (n) n.value = me ? me.name : '';
}
function initBox() {
  const b = boxParts();
  if (!b) return;
  const d = store.get(KEY.draft);
  if (d && d.path === location.pathname && Date.now() - (d.at || 0) < 14 * 86400000 && !b.msg.value && !b.link.value) {
    putDraft(d);
    b.B.say(tt('What you wrote earlier is back in the box.'));
    /* The box is in the discussion, and the page stays on the side its address asked for. putDraft has
       already told the record that a note is waiting (keptMark). */
  }
  let t = 0;
  const later = () => { clearTimeout(t); t = setTimeout(saveDraft, 300); };
  b.f.addEventListener('input', later); b.f.addEventListener('change', later);
  D.addEventListener('click', ev => { if (ev.target.closest && ev.target.closest('a[href="#feedback"]')) { later(); b.done.hidden = true; } });
  paintBox();
}
function sayIn(b, text, bad, extra) {
  b.B.say(text, bad);
  if (extra) { const n = $('fbnote'); n.append(' ', extra); }
}
/* Send what is in the box. Returns true when it went. */
async function send(opts) {
  opts = opts || {};
  const b = boxParts();
  if (!b) return false;
  if ($('fbhp').value) { b.B.say(tt('Sent. Thank you.')); return false; }
  const kd = b.B.kind(), k = b.B.K[kd], text = b.msg.value.trim();
  let url = k.link ? b.link.value.trim() : '';
  b.done.hidden = true;
  if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
  url = url.replace(/^http:/i, 'https:');
  if (k.link === 2 && !url) { b.B.say(tt('Paste the link to the video first.'), true); b.link.focus(); return false; }
  if (url && !(/^https:\/\/[^\s\/]+\.[^\s]+$/.test(url) && URL_OK.test(url))) { b.B.say(tt('That link does not look right. Copy it again from the address bar or the Share button.'), true); b.link.focus(); return false; }
  if (text.length < k.min) { b.B.say(k.short, true); b.msg.focus(); return false; }
  if (text.length > k.max) { b.B.say(tt('That is {n} characters. Keep it to {max} so it fits on the page.', { n: text.length, max: k.max }), true); b.msg.focus(); return false; }
  saveDraft();
  if (!me) {
    pending = { type: 'send' };
    openSheet('auth', { why: tt('Your note is saved. Create an account to send it.'), whyIn: tt('Your note is saved. Sign in to send it.'), opener: b.go });
    b.B.say(tt('Your note is saved on this device. Sign in to send it.'));
    if (!OFF) fb().catch(() => { });
    return false;
  }
  b.go.disabled = true; b.B.say(tt('Sending.'));
  try {
    await within(25000, fb());
    if (!user) {
      b.go.disabled = false; b.B.say(tt('Your note is saved on this device. Sign in to send it.'));
      pending = { type: 'send' };
      openSheet('auth', { mode: 'in', why: tt('Your note is saved. Sign in to send it.'), opener: b.go });
      return false;
    }
    if (!user.displayName) {
      b.go.disabled = false; b.B.say(tt('Your note is saved on this device. Choose a name to send it.'));
      pending = { type: 'send' };
      openSheet('name', { opener: b.go });
      return false;
    }
    /* Where it goes. Everything a reader sends from a page that has a discussion is a post on that page:
       an opinion and a video as before, and now a correction, a bug, something we missed and an idea too,
       each with its tag. Those four also go to the form, which is where we read what needs acting on
       (FEEDBACK.md). Two things still go to the form alone: anything sent from a page with no discussion,
       and, while the first version of the rules is the live one, whatever only the second allows. */
    const on = b.f.getAttribute('data-on') || pageOn(), kk = keyKind(on), plain = kd === 'opinion' || kd === 'video';
    const first = plain && (kk === 'race' || kk === 'member');      // what the first version of the rules takes
    const social = !!kk && (first || await within(20000, isV2()));
    if (social) {
      const lab = /^(.*) \[([^\]]*)\]$/.exec(b.ctx.value);
      const subject = (plain ? (b.f.getAttribute('data-on') ? b.f.getAttribute('data-subject') : pageName()) : (lab && lab[1])) || pageName() || on;
      const made = kd === 'video' && b.mine.checked;
      const post = await within(30000, postIt({ text, url: url ? cleanUrl(url) : '', made, on, subject, tag: plain ? '' : kd, v2: !first }));
      /* The copy for us. It must not undo a post that is already on the page, so a failure here is let go. */
      if (!plain) { try { await within(15000, formIt(b, kd, text, url, post.id)); } catch (x) { } }
      clearBox(b);
      sentPost(b, post, made);
    } else {
      const kind = plain ? 'idea' : kd;
      await within(30000, formIt(b, kind, text, url));
      clearBox(b);
      b.B.say(!plain ? k.done : kk ? tt('Sent. Thank you. The discussion on this page opens shortly. Until it does, only we can read this.')
        : tt('Sent. Thank you. We read every one. To put it on a page, open the race or the politician it is about and say it there.'));
    }
    b.go.disabled = false;
    return true;
  } catch (e) {
    b.go.disabled = false;
    if (e && e.code === 'lp/pace') b.B.say(tt('You posted a moment ago. Wait {n} seconds, then press Send again. Your note is kept.', { n: e.wait }), true);
    else if (e && e.code === 'lp/hour') b.B.say(tt('That is a lot in one hour. Try again a little later. Your note is kept.'), true);
    else b.B.say(tt('That did not send. {why} Your note is kept.', { why: words(e) }), true);
    return false;
  }
}
function clearBox(b) {
  b.msg.value = ''; b.link.value = ''; b.mine.checked = false;
  b.B.subject('', '', ''); b.B.shape();
  store.set(KEY.draft, null);
  keptMark('');
}
/* A post on a page: one document in Firebase, written together with the time of the author's newest post
   (the rules allow one each 30 seconds). tag and parent (the post a reply answers) came with the second
   version of the rules; a plain post on a race or a member is still written without them, which both
   versions take, so that one needs no question about which version is live. */
async function postIt(d) {
  const { A, F, db } = S;
  const kind = !d.url ? 'opinion' : (embedOf(d.url) ? 'video' : 'link');
  const commit = async () => {
    const p = await loadProfile();
    const lastAt = Math.max(me.last || 0, p.lastPostAt && p.lastPostAt.toMillis ? p.lastPostAt.toMillis() : 0), wait = Math.ceil((lastAt + 31000 - Date.now()) / 1000);
    if (wait > 0) throw { code: 'lp/pace', wait };
    const status = user.emailVerified ? ((await holdOn()) ? 'pending' : 'live') : 'held';
    const ref = F.doc(F.collection(db, 'posts'));
    const data = { about: d.on, subject: String(d.subject).slice(0, 80), kind, text: d.text, url: kind === 'opinion' ? '' : d.url, mine: kind === 'video' && !!d.made, uid: user.uid, name: p.name, createdAt: F.serverTimestamp(), status, ups: 0, downs: 0, score: 0, nrep: 0 };
    if (d.v2) { data.tag = d.tag || ''; data.parent = d.parent || ''; }
    const mark = { lastPostAt: F.serverTimestamp(), lastPost: ref.id, confirmed: !!user.emailVerified, email: user.email };
    const channel = d.made ? channelOf(d.url) : '';
    if (d.made) { mark.creator = true; if (channel && !p.channel) mark.channel = channel; }
    const batch = F.writeBatch(db);
    batch.set(ref, data); batch.update(F.doc(db, 'users', user.uid), mark);
    await batch.commit();
    /* The time of THIS post, kept as a number. Until 5 October 2026 this answered with the time of asking,
       so after one post every later post or reply from the same page was told "wait 31 seconds" for good,
       until the reader loaded the page again. Found by the first test that sent twice from one page. */
    const sentAt = Date.now();
    Object.assign(profile, mark, { lastPostAt: { toMillis: () => sentAt } });
    return Object.assign({ tag: '', parent: '' }, data, { id: ref.id, ms: Date.now(), fresh: true, my: 0, reported: false });
  };
  let post;
  try { post = await commit(); }
  catch (e) {
    if (!e || e.code !== 'permission-denied') throw e;
    /* Refused. The usual reason is something this page held that had gone stale (the email was confirmed
       elsewhere, or the hold was switched). Ask again for all of it and try once more. */
    await A.getIdToken(user, true); await A.reload(user); onUser(S.auth.currentUser);
    await loadProfile(true); await holdOn(true);
    post = await commit();
  }
  me.last = Date.now(); store.set(KEY.me, me);
  talkAdd(post);
  return post;
}
/* A correction, something we missed, or an idea: to the Google Form, as before, now with who sent it.
   The form has no fields for a link, an email or an account, so they travel under a line of five dashes
   at the end of the note. FEEDBACK.md says how that tail is read; build/notes.py sends the same shape. */
async function formIt(b, kind, text, url, postId) {
  const now = Date.now();
  let log = (store.get('ls-notes') || []);
  log = Array.isArray(log) ? log.filter(t => now - t < 3600000) : [];
  if (log.length >= 6) throw { code: 'lp/hour' };
  const data = new URLSearchParams(new FormData(b.f)), kindField = b.f.querySelector('input[type=radio]').name, tail = [];
  if (url) tail.push('link: ' + url);
  tail.push('email: ' + (user.email || ''));
  tail.push('uid: ' + user.uid);
  if (postId) tail.push('post: ' + postId);      // it is also a post on the page: this is its id (mod/ and the Firebase console find it by this)
  data.set(kindField, kind);
  /* What it is about: the line of the record a reader opened the box from, or else the page itself. */
  if (!b.ctx.value && pageOn()) data.set(b.ctx.name, pageName() + ' [' + pageOn().split(':')[1] + ']');
  data.set(b.msg.name, text + '\n\n-----\n' + tail.join('\n'));
  data.set($('fbname').name, me.name);
  try { await fetch(b.f.action, { method: 'POST', mode: 'no-cors', body: data }); } catch (x) { throw { code: 'lp/offline' }; }
  log.push(now); store.set('ls-notes', log);
}
function sentPost(b, post, made) {
  const here = T && T.key === post.about && (!T.feed || T.full);
  const see = el('a', null, tt('See it'));
  see.href = (here || pathOf(post.about) == null ? '' : root + pathOf(post.about)) + '#p-' + post.id;
  const box = b.done; box.textContent = '';
  if (post.status === 'live') sayIn(b, post.tag ? tt('Sent. It is on the page now, and it has reached us too.') : tt('Sent. It is on the page now.'), false, see);
  else if (post.status === 'pending') b.B.say(tt('Sent. We are looking at new posts before they show, so it will be on the page once we have.'));
  else {
    sayIn(b, tt('Sent. Only you can see it until you confirm your email.'), false, see);
    box.hidden = false;
    box.append(btn('btn btn-line', tt('Send the confirmation link again'), ev => openSheet('check', { resend: true, opener: ev.currentTarget })));
  }
  if (!made || !(b.f.getAttribute('data-panel') || PANEL)) return;      // a site with no panel marks the video as the reader's own and asks for nothing more
  /* A reader who makes videos: the way to the panel, and where their channel is. */
  box.hidden = false;
  const p = el('p'); p.append(tt('You make videos? Our live show is looking for panelists.') + ' ', el('a', null, tt('Apply for the panel'), { href: b.f.getAttribute('data-panel') || CFG.panel, target: '_blank', rel: 'noopener' }));
  box.append(p);
  if (profile && profile.channel) { box.append(el('p', 'fbhint', tt('Your channel is saved as {channel}. You can change it under your name at the top of the page.', { channel: profile.channel.replace(/^https:\/\//, '') }))); return; }
  const f = el('div', 'fbrow'), id = 'fbchan', input = el('input', null, null, { id, type: 'url', inputmode: 'url', maxlength: '200', placeholder: 'https://', autocapitalize: 'off', spellcheck: 'false' });
  const line = el('p', 'fbhint', '', { role: 'status', 'aria-live': 'polite' });
  const save = btn('btn btn-line', tt('Save my channel'), async () => {
    let ch = input.value.trim();
    if (ch && !/^https?:\/\//i.test(ch)) ch = 'https://' + ch;
    ch = ch.replace(/^http:/i, 'https:');
    if (!(URL_OK.test(ch) && ch.length <= 200 && /^https:\/\/[^\s\/]+\.[^\s]+$/.test(ch))) { line.textContent = tt('That link does not look right. Copy it from the address bar of your channel.'); input.focus(); return; }
    save.disabled = true; line.textContent = tt('Saving.');
    try { await within(20000, saveProfile({ channel: ch, creator: true })); line.textContent = tt('Saved. Thank you.'); input.value = ch; }
    catch (e) { line.textContent = words(e); }
    save.disabled = false;
  });
  f.append(el('label', null, tt('Where can we find your videos?'), { for: id }), input, save, line);
  box.append(f);
}

/* ------------------------------------------------------------------ what readers say
   One section with id "talk". On a page (a race, a member, a state, a vote, one of the site's own pages)
   it shows the three most liked posts and the way to the rest. On talk/ it shows everything said on one
   page (?on=<key>), replies under the post they answer, or the newest across the site. */
let T = null;
function initTalk() {
  const sec = $('talk');
  if (!sec) return;
  /* full: the discussion of a page, on that page (the Discussion mode). Everything is shown there, replies
     under the post they answer, with the order and the kinds to pick from once there is enough to sort. */
  const full = sec.hasAttribute('data-full'), page = sec.classList.contains('talk-all');
  T = { el: sec, feed: sec.hasAttribute('data-feed'), all: page || full, full, key: sec.getAttribute('data-on') || '', name: sec.getAttribute('data-name') || '',
    what: sec.getAttribute('data-what') || tt('this page'), empty: sec.getAttribute('data-empty') || '', sort: 'top', only: '', posts: [], state: 'idle', seq: 0, rev: 0, v2: false, replying: null, open: new Set() };
  T.list = el('ul', 'votes talk-list');
  const go = sec.querySelector('.talk-go');
  if (go) sec.insertBefore(T.list, go); else sec.append(T.list);
  if (page) { initTalkPage(); return; }
  if (full) {
    if (T.feed) T.sort = 'new';
    T.ctl = el('div', 'talk-ctl'); T.ctl.hidden = true;
    sec.insertBefore(T.ctl, T.list);
    initPeek();
  }
  drawTalk();
  /* Fetched when the section comes near the screen, so a reader who never scrolls that far costs nothing. */
  if ('IntersectionObserver' in window) {
    /* Only if nothing has loaded it yet: a reader who posts before scrolling here has already loaded it, and
       loading again would wipe the list they are about to look at. */
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); if (T.state === 'idle') loadTalk(); } }, { rootMargin: '700px 0px' });
    io.observe(sec);
  } else loadTalk();
}
async function initTalkPage() {
  const on = new URLSearchParams(location.search).get('on');
  const h = $('talk-h'), intro = $('talk-intro'), pick = $('talk-pick'), back = $('talk-back'), box = $('talk-box');
  if (on == null) { T.sort = 'new'; loadTalk(); return; }
  T.feed = false;
  T.state = 'wait'; drawTalk();
  let names = null;
  try { names = await within(15000, fetch(root + (SITE.names || 'data/talk.json')).then(r => { if (!r.ok) throw 0; return r.json(); })); } catch (x) { names = null; }
  const path = pathOf(on);
  if (!names) { T.state = 'err'; T.retry = () => location.reload(); drawTalk(); return; }
  if (path == null || typeof names[on] !== 'string') {
    h.textContent = tt('That page is not on this site');
    intro.textContent = tt('The address may be old or mistyped. Pick a race or a member to see what readers said about it.');
    D.title = tt('Not on this site | Liberty Score');
    T.list.remove();
    return;
  }
  T.key = on; T.name = names[on];
  const what = T.what = whatOf(on);
  T.empty = tt('Nobody has said anything about {what} yet. Be the first.', { what });
  T.el.setAttribute('data-on', on); T.el.setAttribute('data-name', T.name);
  h.textContent = tt('{name}: what readers say', { name: T.name });
  D.title = tt('{name}: what readers say | Liberty Score', { name: T.name });
  intro.textContent = tt('What readers have said and shared about {what}. Their words and their videos, not ours.', { what });
  back.textContent = '← ' + T.name; back.href = root + path;
  /* The box, filed under this page (send() reads data-on from the section when the box names no other). */
  pick.remove();
  if (box) box.hidden = false;
  const chips = el('div', 'chips talk-sort', null, { role: 'group', 'aria-label': tt('Order') });
  [['top', tt('Most liked')], ['new', tt('Newest')]].forEach(([s, w]) => {
    const c = btn('chip', w, () => { T.sort = s; [...chips.children].forEach(o => o.setAttribute('aria-pressed', String(o === c))); drawTalk(); });
    c.setAttribute('aria-pressed', String(T.sort === s)); chips.append(c);
  });
  T.el.insertBefore(chips, T.list);
  loadTalk();
}
function reloadTalk() { if (T && (T.state === 'ok' || T.state === 'err')) { clearTimeout(T.t); T.t = setTimeout(() => loadTalk(true), 60); } }
async function loadTalk(quiet) {
  if (!T) return;
  const seq = ++T.seq;
  if (!quiet) { T.state = 'wait'; drawTalk(); }
  try {
    /* Something the reader did while the answer was on its way (a post, a like) makes that answer old:
       ask again rather than draw over what they just did. */
    let got, rev;
    do { rev = T.rev; got = await within(15000, fetchPosts()); if (seq !== T.seq) return; } while (rev !== T.rev);
    /* Reply is offered only once the rules that take a reply are live. Not knowing is treated as no. */
    try { T.v2 = await within(8000, isV2()); } catch (x) { T.v2 = false; }
    if (seq !== T.seq) return;
    T.posts = got; T.state = 'ok';
  } catch (e) {
    if (seq !== T.seq) return;
    T.state = e && e.code === 'lp/off' ? 'off' : 'err';
  }
  /* A link to a reply opens the thread it is in, or the reply would not be on the page to land on. */
  if (T.state === 'ok' && location.hash.indexOf('#p-') === 0) { const t = find(location.hash.slice(3)); if (t && t.parent) T.open.add(t.parent); }
  drawTalk();
  if (T.state === 'ok' && location.hash.indexOf('#p-') === 0) { const r = $(location.hash.slice(1)); if (r) r.scrollIntoView({ block: 'center' }); }
}
/* A post as the page holds it. The post itself carries only counts; my (1 liked, -1 unliked, 0 neither)
   and reported come from the reader's own private documents and are never on the post. */
function shape(id, d) {
  const num = v => (typeof v === 'number' && v > 0 ? Math.floor(v) : 0), str = v => typeof v === 'string' ? v : '';
  const ups = num(d.ups), downs = num(d.downs);
  return { id, about: str(d.about), subject: str(d.subject), kind: ['opinion', 'video', 'link'].includes(d.kind) ? d.kind : 'opinion', text: str(d.text).slice(0, MAX), url: str(d.url),
    tag: TAGS[d.tag] ? d.tag : '', parent: /^[A-Za-z0-9]{1,40}$/.test(str(d.parent)) ? d.parent : '',
    mine: d.mine === true, uid: str(d.uid), name: NAME_OK.test(str(d.name)) ? d.name : tt('A reader'), status: str(d.status), ups, downs, score: ups - downs, nrep: num(d.nrep), my: 0, reported: false,
    ms: d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : Date.now() };
}
async function fetchPosts() {
  const { F, db } = await fb(), P = F.collection(db, 'posts'), out = new Map();
  const take = snap => snap.docs.forEach(d => out.set(d.id, shape(d.id, d.data())));
  if (T.feed) {
    try {
      if (hook('lpnoindex')) throw { code: 'failed-precondition' };
      take(await F.getDocs(F.query(P, F.where('status', '==', 'live'), F.orderBy('createdAt', 'desc'), F.limit(60))));
    } catch (e) {
      if (!e || e.code !== 'failed-precondition') throw e;
      /* The index for the ordered question is not there yet: ask without an order and sort here. */
      take(await F.getDocs(F.query(P, F.where('status', '==', 'live'), F.limit(300))));
    }
  } else {
    take(await F.getDocs(F.query(P, F.where('about', '==', T.key), F.where('status', '==', 'live'), F.limit(200))));
    if (user) take(await F.getDocs(F.query(P, F.where('about', '==', T.key), F.where('uid', '==', user.uid), F.limit(50))));
  }
  /* What this reader liked, unliked and reported here: kept under their own account, where nobody else can read it. */
  if (user && user.emailVerified && out.size) {
    const own = name => { const c = F.collection(db, 'users', user.uid, name); return F.getDocs(T.feed ? F.query(c, F.limit(300)) : F.query(c, F.where('about', '==', T.key), F.limit(300))); };
    try {
      const [votes, reports] = await Promise.all([own('votes'), own('reports')]);
      votes.docs.forEach(d => { const p = out.get(d.id), v = d.data().v; if (p) p.my = v === 1 ? 1 : v === -1 ? -1 : 0; });
      reports.docs.forEach(d => { const p = out.get(d.id); if (p) p.reported = true; });
    } catch (x) { }
  }
  return [...out.values()];
}
function talkAdd(post) {
  /* On the front page the discussion is the newest posts from every page, and a post made there belongs in it. */
  if (!T || T.key !== post.about || (T.feed && !T.full)) return;
  T.rev++;
  if (T.state !== 'ok') { if (T.state === 'idle' || T.state === 'err') loadTalk(); return; }
  T.posts = T.posts.filter(p => p.id !== post.id).concat([post]);
  drawTalk();
}
/* The posts in the order they are shown. On the site-wide list that is every post, newest first, replies
   among them. Everywhere else it is the posts that answer nobody; their replies hang under them (repliesTo). */
function ordered() {
  const mineFirst = p => (p.fresh || (me && p.uid === me.uid && p.status !== 'live')) ? 1 : 0;
  const by = T.sort === 'new' ? (a, b) => b.ms - a.ms : (a, b) => (b.score - a.score) || (b.ms - a.ms);
  return T.posts.filter(p => !p.gone && (T.feed || !p.parent)).sort((a, b) => (mineFirst(b) - mineFirst(a)) || by(a, b));
}
/* The replies to one post, oldest first, the way a conversation reads. */
function repliesTo(id) { return T.posts.filter(p => !p.gone && p.parent === id).sort((a, b) => a.ms - b.ms); }
function stateRow(text, more) {
  const li = el('li', 'talk-state'); li.append(el('p', null, text));
  if (more) li.append(more);
  return li;
}
function drawTalk() {
  const L = T.list;
  L.textContent = '';
  L.classList.toggle('is-wait', T.state === 'wait' || T.state === 'idle');
  L.setAttribute('aria-busy', String(T.state === 'wait'));
  let n = 0;
  if (T.state === 'wait' || T.state === 'idle') {
    for (let i = 0; i < (T.all ? 3 : 2); i++) L.append(el('li', 'vote sk', null, { 'aria-hidden': 'true' }));
    if (T.state === 'wait') L.append(el('li', 'vh', tt('Loading what readers said.')));
  } else if (T.state === 'off') L.append(stateRow(tt('Reader posts are not switched on in this preview.')));
  else if (T.state === 'err') L.append(stateRow(tt('Could not load what readers said. Try again.'), btn('btn btn-line', tt('Try again'), () => (T.retry ? T.retry() : loadTalk()))));
  else {
    const every = ordered();
    if (T.lang && !bothLangs(every)) T.lang = '';      // the last post in one of the two languages has gone: the filter goes with it
    const rows = every.filter(p => (!T.only || ONLY[T.only][1](p)) && (!T.where || keyKind(p.about) === T.where) && (!T.lang || !lgOf(p) || lgOf(p) === T.lang));
    /* The number on the way to the whole discussion counts every post a reader would find there, replies too. */
    n = T.feed ? every.length : every.reduce((sum, p) => sum + 1 + repliesTo(p.id).length, 0);
    const best = T.sort === 'top' && rows.find(p => p.status === 'live' && p.score > 0 && !p.fresh);
    if (!every.length) L.append(stateRow(T.feed ? (T.full && T.empty) || tt('Nobody has posted yet. Pick a race or a member and be the first.') : T.empty || tt('Nobody has said anything about {what} yet. Be the first.', { what: T.what })));
    else if (!rows.length) L.append(stateRow(tt('Nothing of that kind here yet.'), btn('btn btn-line', tt('Show everything'), () => { T.only = ''; T.where = ''; T.lang = ''; drawTalk(); })));
    else (T.all ? rows : rows.slice(0, 3)).forEach(p => L.append(row(p, p === best)));
    if (T.full) { drawCtl(every); setCount(n); }
  }
  /* The way to the whole discussion, once there is one. */
  if (!T.all) {
    const go = T.el.querySelector('.talk-go');
    let more = T.el.querySelector('.talk-more');
    if (n && go) {
      if (!more) { more = el('a', 'btn btn-line talk-more'); go.prepend(more); }
      more.href = root + 'talk/?on=' + encodeURIComponent(T.key);
      more.textContent = tt('Open the discussion') + ' (' + dig(n) + ')';
    } else if (more) more.remove();
  }
}
/* The kinds a reader can narrow a discussion to. Opinions, videos, corrections and bugs sit in one list,
   each with its tag; these let a reader who came for one kind see only that. */
const ONLY = {
  video: [tt('Videos'), p => p.kind === 'video' || p.kind === 'link'],
  fix: [tt('Corrections'), p => p.tag === 'wrong' || p.tag === 'source'],
  site: [tt('Bugs and ideas'), p => p.tag === 'bug' || p.tag === 'idea']
};
/* Where a post was made, for the list of all discussions. */
const WHERE = { race: tt('Races'), member: tt('Politicians'), state: tt('States'), vote: tt('Votes'), page: tt('The site') };
let NAMES = null, namesAsked = false;
/* What a page is called: from the build's own list once it has loaded, until then from the post. */
function nameOf(about, fallback) { return (NAMES && typeof NAMES[about] === 'string' && NAMES[about]) || fallback || tt('Open the page'); }
/* The discussions with the most posts among the newest ones loaded, the front page's own left out. */
function busiest(every) {
  const by = new Map();
  every.forEach(p => { if (p.about === 'page:home' || pathOf(p.about) == null) return; const b = by.get(p.about) || { about: p.about, n: 0, subject: '' }; b.n++; if (!b.subject && !p.parent) b.subject = p.subject; by.set(p.about, b); });
  return [...by.values()].filter(b => b.n > 1).sort((a, b) => b.n - a.n).slice(0, 5);
}
/* The order and the kinds, above the list. Not drawn until there are three posts: with fewer there is
   nothing to sort, and a row of switches over one post is noise. */
function drawCtl(every) {
  const C = T.ctl;
  if (!C) return;
  C.textContent = '';
  /* With posts in both languages the two-language filter is worth showing from the second post on. */
  const both = bothLangs(every);
  C.hidden = every.length < 3 && !both;
  if (C.hidden) return;
  const chips = el('div', 'chips talk-sort', null, { role: 'group', 'aria-label': tt('Order, and what to show') });
  const chip = (text, on, fn) => { const c = btn('chip', text, () => { fn(); drawTalk(); }); c.setAttribute('aria-pressed', String(on)); chips.append(c); };
  if (every.length < 3) { C.append(langRow()); return; }
  if (!T.feed) [['top', tt('Most liked')], ['new', tt('Newest')]].forEach(([s, w]) => chip(w, T.sort === s, () => { T.sort = s; }));
  if (!T.feed) chips.append(el('span', 'chips-gap', null, { 'aria-hidden': 'true' }));
  chip(tt('Everything'), !T.only && !T.where, () => { T.only = ''; T.where = ''; });
  Object.keys(ONLY).forEach(k => { if (every.some(ONLY[k][1])) chip(ONLY[k][0], T.only === k, () => { T.only = k; }); });
  /* All discussions (the front page): every page's posts are in one list, so a reader can also narrow it by
     WHERE a post was made, and see which discussions are busiest. Armin, 5 October 2026: "all of the
     discussions happening in all of the other areas brought into one place in a way that makes sense". */
  if (T.feed) {
    const kinds = Object.keys(WHERE).filter(k => every.some(p => keyKind(p.about) === k));
    if (kinds.length > 1) {
      chips.append(el('span', 'chips-gap', null, { 'aria-hidden': 'true' }));
      kinds.forEach(k => chip(WHERE[k], T.where === k, () => { T.where = T.where === k ? '' : k; }));
    }
    const busy = busiest(every);
    if (busy.length) {
      const box = el('div', 'busy');
      box.append(el('p', 'busy-h', tt('Busiest discussions')));
      const ul = el('ul', 'busy-l');
      busy.forEach(b => { const li = el('li'), a = el('a', 'busy-a', null, { href: root + pathOf(b.about) + '#discussion' }); a.append(el('span', null, nameOf(b.about, b.subject)), el('b', 'num', dig(b.n))); li.append(a); ul.append(li); });
      box.append(ul);
      C.append(box);
    }
    if (!NAMES && !namesAsked) { namesAsked = true; within(15000, fetch(root + (SITE.names || 'data/talk.json')).then(r => (r.ok ? r.json() : null))).then(j => { if (j) { NAMES = j; drawTalk(); } }).catch(() => {}); }
  }
  C.append(chips);
  if (both) C.append(langRow());
}
/* The number on the switch, and at the end of the record. Shown only when there is something to count:
   a new place that shows a zero looks abandoned. */
function setCount(n) {
  const b = $('disc-n'), p = $('band-p');
  discCount = n > 0 ? n : 0;
  if (b) { b.hidden = !(n > 0); b.textContent = n > 99 ? dig('99') + '+' : dig(n); }
  if (n > 0 && p && !p.hasAttribute('data-set')) { p.textContent = n === 1 ? tt('1 post so far. Read it, and say where you stand.') : tt('{n} posts so far. Read them, and say where you stand.', { n }); }
  /* The same number on the question high on the record. */
  const nn = $('nudge-n');
  if (nn) { nn.hidden = !(n > 0); nn.textContent = n > 99 ? tt('99+ posts') : n === 1 ? tt('1 post') : tt('{n} posts', { n }); }
  /* The words on the button at the end of the record, on the question near the top and on the switch:
     one place writes them, because a note the reader never sent changes all three (keptMark). */
  keptMark(kept);
}
/* Before a reader has opened the discussion: how many posts it holds, asked for with one small request and
   without Firebase's own code (one read, whatever the number), and, once the end of the record is near the
   screen, the post readers liked most. The discussion itself loads only when a reader opens it. */
function restBase(what) { return (EMU ? 'http://127.0.0.1:8080/v1/' : 'https://firestore.googleapis.com/v1/') + 'projects/' + (EMU ? DEMO : CFG.fb).projectId + '/databases/(default)/documents:' + what + (EMU ? '' : '?key=' + encodeURIComponent(CFG.fb.apiKey)); }
function restWhere() {
  const live = { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'live' } } };
  return T.feed ? live : { compositeFilter: { op: 'AND', filters: [{ fieldFilter: { field: { fieldPath: 'about' }, op: 'EQUAL', value: { stringValue: T.key } } }, live] } };
}
function initPeek() {
  if (OFF || QUIET || hook('lpbreak')) return;
  const count = async () => {
    if (T.state !== 'idle') return;
    /* The limit is what the rules ask of every list of posts; a count under it still costs one read. */
    const q = { structuredAggregationQuery: { structuredQuery: { from: [{ collectionId: 'posts' }], where: restWhere(), limit: 300 }, aggregations: [{ alias: 'n', count: {} }] } };
    const res = await within(15000, fetch(restBase('runAggregationQuery'), { method: 'POST', body: JSON.stringify(q) }));
    if (!res.ok) return;
    const got = await res.json(), n = Number((((Array.isArray(got) ? got[0] : got) || {}).result || { aggregateFields: { n: {} } }).aggregateFields.n.integerValue || 0);
    if (T.state === 'idle' || T.state === 'wait') { T.peeked = n; setCount(n); }
  };
  /* The most liked post is asked for once two things are true, in whichever order they happen: the
     count says there is at least one post, and a place that shows it (the question high on the record,
     or the end of the record) is near the screen. */
  const band = $('band'), top = $('band-top'), nudge = $('nudge'), ntop = $('nudge-top');
  let near = false, asked = false;
  const best = async () => {
    if (asked || !near || !(T.peeked > 0) || T.feed || !top) return;
    asked = true;
    const q = { structuredQuery: { from: [{ collectionId: 'posts' }], where: restWhere(), limit: 8 } };
    const res = await within(15000, fetch(restBase('runQuery'), { method: 'POST', body: JSON.stringify(q) }));
    if (!res.ok) return;
    const got = await res.json();
    const p = (Array.isArray(got) ? got : []).filter(r => r.document).map(r => fromRest(r.document)).filter(p => p.status === 'live' && !p.parent && p.text)
      .sort((a, b) => (b.score - a.score) || (b.ms - a.ms))[0];
    if (!p) return;
    const cut = (t, n) => t.length > n ? t.slice(0, n - 3).replace(/\s+\S*$/, '') + '...' : t;
    top.textContent = '';
    top.append(el('blockquote', null, cut(p.text, 180), ML ? { dir: 'auto' } : null), el('p', null, p.name + ' · ' + niceDate(p.ms)));
    top.hidden = false;
    if (ntop) {
      ntop.textContent = '';
      if (ML) ntop.setAttribute('dir', 'auto');
      ntop.append(el('b', null, p.name + ': '), cut(p.text, 110));
      ntop.hidden = false;
    }
  };
  const idle = window.requestIdleCallback ? f => window.requestIdleCallback(f, { timeout: 2500 }) : f => setTimeout(f, 1200);
  idle(() => { count().then(best).catch(() => { }); });
  if (!band || !top || T.feed || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect();
    near = true;
    best().catch(() => { });
  }, { rootMargin: '500px 0px' });
  io.observe(band);
  if (nudge) io.observe(nudge);
}
/* ------------------------------------------------------------------ two languages in one room
   Only on a site that hands in two languages (ML). One discussion a page, both languages mixed: a small
   community split in two looks dead, and most readers of such a site read both. So nothing is stored about
   a post's language; the letters it is written in say it. Persian and Arabic letters making up three in
   ten of its letters or more: Persian. Otherwise English. No letters at all (a video with no words): no
   language, and it is shown whichever language a reader picks. */
const FA_LETTERS = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g, LATIN_LETTERS = /[A-Za-z]/g;
function langOf(text) {
  const s = String(text || ''), a = (s.match(FA_LETTERS) || []).length, l = (s.match(LATIN_LETTERS) || []).length;
  if (!a && !l) return '';
  return a / (a + l) >= 0.3 ? 'fa' : 'en';
}
/* The language of a post. A reply that starts with the name of the reader it answers ("@Dariush ...") is
   judged by what comes after the name: a short Persian answer to a reader with a Latin name is Persian. */
function lgOf(p) {
  if (p.lg === undefined || p.lgFor !== p.text) {
    const named = p.parent && p.text.charAt(0) === '@' && T ? mention(p) : '';
    p.lg = langOf(named ? p.text.slice(named.length + 1) : p.text); p.lgFor = p.text;
  }
  return p.lg;
}
/* The direction words run in, from their language. Not left to the browser's own guess (dir="auto"): that
   goes by the first letter, and a Persian reply that opens with a Latin name would be laid out left to
   right with its full stop on the wrong side. No letters to go by: the direction of the page. */
function dirOf(lg) { return lg === 'fa' ? 'rtl' : lg === 'en' ? 'ltr' : (RTL ? 'rtl' : 'ltr'); }
function bothLangs(posts) { return ML && SITE.langs.every(l => posts.some(p => lgOf(p) === l)); }
/* All languages, or one. Offered only once there are posts in both: a filter that changes nothing a reader
   can see is noise. The name of each language is written in that language, whatever page this is. */
const LANG_NAMES = { fa: 'فارسی', en: 'English' };
/* A row of its own under the order and the kinds: on a phone that row scrolls sideways, and a filter at
   the far end of it would be out of sight. */
function langRow() {
  const chips = el('div', 'chips talk-lang', null, { role: 'group', 'aria-label': tt('Language') });
  [''].concat(SITE.langs).forEach(l => {
    const c = btn('chip chip-lang', l ? LANG_NAMES[l] || l : tt('All languages'), () => { T.lang = l; drawTalk(); });
    c.setAttribute('aria-pressed', String((T.lang || '') === l)); c.setAttribute('data-lang-pick', l || 'all');
    if (l) c.setAttribute('lang', l);
    chips.append(c);
  });
  return chips;
}
/* Translate a post written in the other language than this page's. The control is a plain link to Google
   Translate, opened in a new tab: that is what it does in a browser with no translator of its own, and what
   it falls back to when the browser's own (the Translator API, Chrome and Edge) cannot do this pair, fails,
   or takes too long. With the browser's own, the words are translated where they stand and the same
   control puts the original back. Nothing is fetched from anywhere before the reader taps. */
function trUrl(text) { return 'https://translate.google.com/?sl=auto&tl=' + LANG + '&text=' + encodeURIComponent(text); }
async function trOwn(p) {
  const api = self.Translator, pair = { sourceLanguage: lgOf(p), targetLanguage: LANG };
  const can = await within(8000, Promise.resolve(api.availability(pair)));
  if (!can || can === 'unavailable') throw { code: 'lp/notr' };
  const tr = await within(60000, Promise.resolve(api.create(pair)));
  try {
    const out = await within(30000, Promise.resolve(tr.translate(p.text)));
    if (typeof out !== 'string' || !out.trim()) throw { code: 'lp/notr' };
    return out;
  } finally { try { if (tr && tr.destroy) tr.destroy(); } catch (x) { } }
}
function trCtl(p) {
  const wrap = el('p', 'tr'), shown = !!(p.tr && p.tr.on);
  const a = el('a', 'tr-b', shown ? tt('Show original') : p.trNo ? tt('Translate with Google') : tt('Translate'), { href: trUrl(p.text), target: '_blank', rel: 'noopener', 'data-tr': shown ? 'on' : p.trNo ? 'link' : 'off' });
  const line = el('span', 'tr-msg', p.trMsg || '', { role: 'status' });
  a.addEventListener('click', ev => {
    if (p.tr) { ev.preventDefault(); p.tr.on = !p.tr.on; redraw(p, 'tr-b'); return; }      // translated already: this only switches
    if (p.trNo || !('Translator' in self)) return;      // no translator in this browser: the link opens Google Translate
    ev.preventDefault();
    if (p.trBusy) return;
    p.trBusy = true; line.textContent = tt('Translating.');
    trOwn(p).then(text => { p.tr = { text, on: true }; p.trMsg = ''; },
      () => { p.trNo = true; p.trMsg = tt('This browser could not translate it here. Tap again to open it in Google Translate.'); })
      .then(() => { p.trBusy = false; const q = find(p.id) || p; q.tr = p.tr; q.trNo = p.trNo; q.trMsg = p.trMsg; redraw(q, 'tr-b'); });
  });
  wrap.append(a, line);
  return wrap;
}

/* The reader a reply answers, when it starts with their name ("@Dana K the 2019 vote..."): the longest name
   in that thread the words start with. Empty when it starts with no name from the thread. */
function mention(p) {
  if (!p.parent || p.text.charAt(0) !== '@') return '';
  const par = find(p.parent), names = (par ? [par.name] : []).concat(repliesTo(p.parent).map(r => r.name)).sort((a, b) => b.length - a.length);
  return names.find(n => p.text.startsWith('@' + n) && !LETTER.test(p.text.charAt(n.length + 1))) || '';
}
/* One post, drawn the way a conversation reads: a face, a name, how long ago, then the words. A reply (it
   has a parent) is drawn the same way, smaller, in the thread under the post it answers, and has no tag.
   A reply can be answered too: the answer is filed under the same post and starts with the name of the
   reader it answers, so a discussion is a list of threads and never a tree (Armin, 5 October 2026:
   "people should be able to reply to each other"). */
function row(p, best) {
  const li = el('li', 'vote said' + (p.status !== 'live' ? ' own' : '') + (p.parent ? ' reply' : ''), null, { id: 'p-' + p.id });
  const head = el('div', 'said-head'), meta = el('div', 'meta'), who = el('span', 'who');
  /* "Dana K replied 2 hours ago": the part after the name stays together, so on a narrow screen it moves under the name whole. */
  const sub = el('span', 'said-sub'), when = el('time', 'said-when', ago(p.ms), { datetime: new Date(p.ms).toISOString(), title: niceDate(p.ms) });
  if (p.parent) sub.append(...ttParts('replied {when}', 'when', when)); else sub.append(when);
  who.append(el('b', null, p.name, ML ? { dir: 'auto' } : null), ' ', sub);
  meta.append(who);
  /* Only the people who run the site can hold such a name (the rules refuse it to everyone else). */
  if (reservedName(p.name)) meta.append(el('span', 'tag host', tt('Host')));
  /* A plain opinion needs no label: it is what a post is. A video, a link, a correction, a bug or an idea says so. */
  if (!p.parent && (p.tag || p.kind !== 'opinion')) meta.append(el('span', 'tag kind' + (p.tag ? ' kind-' + p.tag : ''), TAGS[p.tag] || PLAIN[p.kind]));
  if (p.mine) meta.append(el('span', 'tag', tt('Made it')));
  if (best) meta.append(el('span', 'tag best', tt('Most liked')));
  head.append(face(p.name), meta);
  li.append(head);
  if (T.feed && pathOf(p.about) != null) li.append(el('a', 'said-on', tt('In: {page}', { page: nameOf(p.about, p.subject) }), { href: root + pathOf(p.about) + '#p-' + p.id }));
  /* A post opened from one line of a page (one vote on a member's page) says which line. */
  else if (!T.feed && !p.parent && p.subject && p.subject !== T.name) {
    /* On a site with two languages the line may have been written on the page in the other one: it is kept
       apart from the word before it, so each runs in its own direction. */
    if (ML) { const ab = el('p', 'said-about'); ab.append(...ttParts('About: {what}', 'what', el('bdi', null, p.subject))); li.append(ab); }
    else li.append(el('p', 'said-about', tt('About: {what}', { what: p.subject })));
  }
  const emb = p.kind === 'video' && URL_OK.test(p.url) ? embedOf(p.url) : null;
  if (emb) {
    const box = el('div', 'tv tv-' + emb[0].toLowerCase(), null, { 'data-embed': emb[1], 'data-plat': emb[0] });
    const a = el('a', 'tv-play', null, { href: p.url, target: '_blank', rel: 'noopener nofollow ugc' });
    const yt = emb[0] === 'YouTube' && /\/embed\/([\w-]{11})$/.exec(emb[1]);
    if (yt && !QUIET) a.append(el('img', null, null, { src: 'https://i.ytimg.com/vi/' + yt[1] + '/hqdefault.jpg', alt: '', loading: 'lazy', decoding: 'async', width: '480', height: '360' }));
    const cap = el('span', 'tv-what'); cap.append(el('b', null, tt('Video shared by {name}', { name: p.name })), el('span', null, tt('Play it here · {site}', { site: emb[0] })));
    a.append(el('span', 'tv-go', null, { 'aria-hidden': 'true' }), cap);
    box.append(a); li.append(box);
  }
  if (p.text) {
    const q = el('blockquote'), to = mention(p);
    if (p.tr && p.tr.on) q.textContent = p.tr.text;      // the reader asked for the translation (trCtl)
    else if (to) q.append(el('b', 'at', '@' + to, ML ? { dir: 'auto' } : null), p.text.slice(to.length + 1)); else q.textContent = p.text;
    li.append(q);
    /* Two languages in one room: the words keep the direction of the language they were written in, and a
       post in the other language than this page's can be translated where it stands. */
    if (ML) {
      const lg = lgOf(p);
      q.setAttribute('dir', dirOf(p.tr && p.tr.on ? LANG : lg));
      if (lg) li.setAttribute('data-lang', lg);
      if (lg && lg !== LANG) li.append(trCtl(p));
    }
  }
  if (p.kind !== 'opinion' && !emb && URL_OK.test(p.url)) li.append(el('a', 'said-link', tt('Open the link on {host}', { host: hostOf(p.url) }), { href: p.url, target: '_blank', rel: 'noopener nofollow ugc' }));
  if (p.status !== 'live') {
    const note = el('p', 'said-note');
    note.textContent = p.status === 'held' ? tt('Only you can see this until you confirm your email.') : p.status === 'pending' ? tt('Only you can see this until we have looked at it.')
      : p.status === 'hidden' ? tt('Readers reported this, so it is off the page until we have looked at it. Only you can see it.') : tt('We removed this because it broke the rules. Only you can see it.');
    li.append(note);
    if (p.status === 'held') li.append(btn('sheet-text', tt('Send the confirmation link again'), ev => openSheet('check', { resend: true, opener: ev.currentTarget })));
    if (!p.parent && !T.feed) hang(li, p);
    return li;
  }
  const bar = el('div', 'said-bar'), own = me && p.uid === me.uid;
  ['up', 'down'].forEach(dir => {
    const on = !!me && p.my === (dir === 'up' ? 1 : -1), n = dir === 'up' ? p.ups : p.downs, word = dir === 'up' ? tt('Like') : tt('Unlike');
    const b = btn('vt vt-' + dir, null, () => vote(p.id, dir, false));
    b.innerHTML = ICON[dir];
    b.append(el('span', null, word), el('b', 'num', dig(n)));
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', dir === 'up'
      ? (on ? (n === 1 ? tt('Like. {n} reader has, you among them. Tap to take it back.', { n }) : tt('Like. {n} readers have, you among them. Tap to take it back.', { n })) : (n === 1 ? tt('Like. {n} reader has.', { n }) : tt('Like. {n} readers have.', { n })))
      : (on ? (n === 1 ? tt('Unlike. {n} reader has, you among them. Tap to take it back.', { n }) : tt('Unlike. {n} readers have, you among them. Tap to take it back.', { n })) : (n === 1 ? tt('Unlike. {n} reader has.', { n }) : tt('Unlike. {n} readers have.', { n }))));
    if (own) { b.disabled = true; b.title = tt('You cannot like or unlike your own post'); }
    bar.append(b);
  });
  /* Reply: on a post and on every reply under it, on the page the discussion belongs to, and only once the
     rules that take a reply are live. The box opens right under whatever was tapped. An answer to a reply
     goes into the same thread (top is the post the thread hangs from) and starts with that reader's name. */
  /* Reply sits beside the likes; Report, or Delete on a reader's own post, at the end of the same line. */
  const acts = el('div', 'said-acts');
  if (!T.feed && T.v2) {
    const top = p.parent || p.id, at = p.parent ? p.id : '', pre = p.parent ? '@' + p.name + ' ' : '';
    const open = !!(T.replying && T.replying.id === top && (T.replying.at || '') === at);
    const rb = btn('reply-b', tt('Reply'), () => {
      T.replying = open ? null : { id: top, at, pre, text: pre };
      const q = find(top);
      if (q) redraw(q, open ? '' : 'reply-in');
    });
    rb.setAttribute('aria-expanded', String(open));
    acts.append(rb);
  } else if (T.feed && T.v2 && pathOf(p.about) != null) {
    /* All discussions: the post being answered lives on its own page, so Reply is the way there. */
    acts.append(el('a', 'said-go', tt('Reply'), { href: root + pathOf(p.about) + '#p-' + p.id }));
  }
  const last = own ? delCtl(p) : reportCtl(p);
  if (last) acts.append(last);
  if (acts.firstChild) bar.append(acts);
  li.append(bar);
  if (p.msg) li.append(el('p', 'said-msg' + (p.msgBad ? ' bad' : ''), p.msg, { role: 'status' }));
  if (p.parent && T.replying && T.replying.at === p.id && T.replying.id === p.parent) { const par = find(p.parent); if (par) li.append(replyBox(par, p)); }
  if (!p.parent && !T.feed) hang(li, p);
  return li;
}
/* Delete, for the author. A post other readers have answered stays: taking it away would take their
   answers out of sight with it. Two taps, because it cannot be undone. */
function delCtl(p) {
  if (T.feed || (!p.parent && repliesTo(p.id).length)) return null;
  const b = btn('del-b', tt('Delete'));
  let armed = 0;
  b.addEventListener('click', async () => {
    if (!armed) {
      b.textContent = tt('Tap again to delete'); b.classList.add('armed');
      armed = setTimeout(() => { armed = 0; b.textContent = tt('Delete'); b.classList.remove('armed'); }, 5000);
      return;
    }
    clearTimeout(armed); b.disabled = true; b.textContent = tt('Deleting');
    try {
      await within(25000, fb());
      if (!user || user.uid !== p.uid) throw { code: 'permission-denied' };
      await within(20000, S.F.deleteDoc(S.F.doc(S.db, 'posts', p.id)));
      const q = find(p.id);
      if (q) q.gone = true;
      T.rev++;
      drawTalk();
    } catch (e) {
      const q = find(p.id) || p;
      q.msg = tt('That did not delete. {why}', { why: words(e) }); q.msgBad = true;
      redraw(q);
    }
  });
  return b;
}
/* What hangs under a post: the box for a reply while it is open, and the replies. On a page that shows only
   the top three posts the replies are one line that leads to them; on the discussion page they are all there. */
function hang(li, p) {
  if (T.replying && T.replying.id === p.id && !T.replying.at) li.append(replyBox(p));
  const rs = repliesTo(p.id);
  if (!rs.length) return;
  if (T.all) {
    /* A long thread shows its first two replies and a way to the rest, so one argument does not bury the
       posts under it. It is open once the reader asks, while they are answering in it, and whenever one of
       its replies is their own new one or one only they can see. */
    const whole = rs.length <= 3 || T.open.has(p.id) || (T.replying && T.replying.id === p.id) || rs.some(r => r.fresh || r.status !== 'live');
    const ul = el('ul', 'replies');
    (whole ? rs : rs.slice(0, 2)).forEach(r => ul.append(row(r, false)));
    li.append(ul);
    if (!whole) li.append(btn('thread-more', tt('Show {n} more replies', { n: rs.length - 2 }), () => { T.open.add(p.id); redraw(p); }));
    return;
  }
  const mine = rs.filter(r => r.fresh || r.status !== 'live');
  if (mine.length) { const ul = el('ul', 'replies'); mine.forEach(r => ul.append(row(r, false))); li.append(ul); }
  const rest = rs.length - mine.length;
  if (rest) li.append(el('a', 'said-more', mine.length ? (rest === 1 ? tt('And 1 more reply') : tt('And {n} more replies', { n: rest })) : (rest === 1 ? tt('Read 1 reply') : tt('Read {n} replies', { n: rest })), { href: root + 'talk/?on=' + encodeURIComponent(p.about) + '#p-' + p.id }));
}
/* The box for a reply. p is the post the thread hangs from; to is the reply being answered, when it is one. */
function replyBox(p, to) {
  const f = el('form', 'reply-f', null, { novalidate: '' }), id = 're-' + p.id, name = (to || p).name;
  const ta = el('textarea', 'reply-in', null, { id, rows: '3', maxlength: String(MAX), placeholder: tt('Answer {name} in your own words.', { name }) });
  if (ML) {
    /* The box may open with a name in it ("@Dariush "): its direction follows what the reader types after that. */
    const pre = (T.replying && T.replying.pre) || '', aim = () => ta.setAttribute('dir', dirOf(langOf(ta.value.indexOf(pre) === 0 ? ta.value.slice(pre.length) : ta.value)));
    ta.addEventListener('input', aim);
    setTimeout(aim, 0);
  }
  const line = el('p', 'said-msg', '', { role: 'status', 'aria-live': 'polite' });
  const go = el('button', 'btn btn-key', tt('Send reply'), { type: 'submit' });
  const no = btn('btn btn-line', tt('Cancel'), () => { T.replying = null; redraw(p, 'reply-b'); });
  const acts = el('div', 'row'); acts.append(go, no);
  ta.value = T.replying.text || '';
  ta.addEventListener('input', () => { if (T.replying && T.replying.id === p.id) T.replying.text = ta.value; });
  /* Ctrl and Enter (Command and Enter on a Mac) sends, the way it does everywhere people argue. */
  ta.addEventListener('keydown', ev => { if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); go.click(); } });
  f.append(el('label', 'vh', tt('Your reply to {name}', { name }), { for: id }), ta, acts, line);
  if (T.replying.msg) { line.textContent = T.replying.msg; line.className = 'said-msg' + (T.replying.bad ? ' bad' : ''); }
  f.addEventListener('submit', async ev => {
    ev.preventDefault();
    go.disabled = true; line.textContent = tt('Sending.'); line.className = 'said-msg';
    await sendReply(p.id, ta.value);
    go.disabled = false;
  });
  return f;
}
/* Send a reply. Answers true when it went. What was typed is kept in T.replying until it has gone, so
   signing in or a refusal in between loses nothing. */
async function sendReply(id, raw) {
  let p = find(id);
  const text = String(raw || '').trim();
  /* Which reply in the thread is being answered, and the name the box began with, are kept through a refusal or a sign-in. */
  const cur = T.replying && T.replying.id === id ? T.replying : {}, keep = () => ({ id, at: cur.at || '', pre: cur.pre || '', text: raw });
  const say = (msg, bad) => { T.replying = Object.assign(keep(), { msg, bad }); const q = find(id); if (q) redraw(q, 'reply-in'); return false; };
  if (!p || p.status !== 'live') return false;
  if (text.length < 8 || (cur.pre && text === cur.pre.trim())) return say(tt('Write a few words first.'), true);
  if (text.length > MAX) return say(tt('That is {n} characters. Keep it to {max}.', { n: text.length, max: MAX }), true);
  const opener = $('p-' + id) && $('p-' + id).querySelector('.reply-b');
  if (!me) {
    T.replying = keep();
    pending = { type: 'reply', id, text: raw };
    openSheet('auth', { why: tt('Your reply is saved. Create an account to send it.'), whyIn: tt('Your reply is saved. Sign in to send it.'), opener });
    if (!OFF) fb().catch(() => { });
    return false;
  }
  try {
    await within(25000, fb());
    if (!user) { pending = { type: 'reply', id, text: raw }; openSheet('auth', { mode: 'in', why: tt('Your reply is saved. Sign in to send it.'), opener }); return false; }
    if (!user.displayName) { pending = { type: 'reply', id, text: raw }; openSheet('name', { why: tt('Your reply is saved. Choose a name to send it.'), opener }); return false; }
    p = find(id) || p;
    T.replying = null;      // postIt draws the reply under the post; the box must be gone by then
    try { await within(30000, postIt({ text, url: '', made: false, on: p.about, subject: p.subject || T.name, tag: '', parent: id, v2: true })); }
    catch (e) { T.replying = keep(); throw e; }
    return true;
  } catch (e) {
    if (e && e.code === 'lp/pace') return say(tt('You posted a moment ago. Wait {n} seconds, then send it again. Your reply is kept.', { n: e.wait }), true);
    return say(tt('That did not send. {why} Your reply is kept.', { why: words(e) }), true);
  }
}
function redraw(p, keep) {
  const old = $('p-' + p.id);
  if (!old) return;
  const best = !!old.querySelector('.tag.best'), had = D.activeElement && old.contains(D.activeElement) ? D.activeElement.className : '';
  const fresh = row(p, best);
  old.replaceWith(fresh);
  const cls = String(keep || had || '').split(' ').filter(Boolean), again = cls.length ? fresh.querySelector('.' + cls.join('.')) : null;
  if (again && !again.disabled) {
    try { again.focus({ preventScroll: true }); } catch (x) { }
    /* A reply box that opens with a name in it puts the caret after the name, and comes into view if it opened off the screen. */
    if (again.tagName === 'TEXTAREA') {
      try { again.setSelectionRange(again.value.length, again.value.length); } catch (x) { }
      const r = again.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 90 || r.top < 130) { try { again.scrollIntoView({ block: 'center' }); } catch (x) { } }
    }
  }
}
const find = id => T && T.posts.find(p => p.id === id);
/* Needs an account whose email is confirmed. Answers true when the reader has one right now; otherwise
   it keeps what they were doing and opens the panel at the right place. */
async function ready(what, opener) {
  /* Whole sentences, so another language can put its words in its own order. */
  const W = what.type === 'vote'
    ? { make: tt('Create an account to like or unlike. Your tap is saved.'), sign: tt('Sign in to like or unlike. Your tap is saved.'), name: tt('Choose a name to like or unlike. Your tap is saved.'), conf: tt('Confirm your email to like or unlike. Your tap is saved.') }
    : { make: tt('Create an account to report a post. Your report is saved.'), sign: tt('Sign in to report a post. Your report is saved.'), name: tt('Choose a name to report a post. Your report is saved.'), conf: tt('Confirm your email to report a post. Your report is saved.') };
  if (!me) {
    pending = what;
    openSheet('auth', { why: W.make, whyIn: W.sign, opener });
    if (!OFF) fb().catch(() => { });
    return false;
  }
  await within(25000, fb());
  if (!user) { pending = what; openSheet('auth', { mode: 'in', why: W.sign, opener }); return false; }
  if (!user.displayName) { pending = what; openSheet('name', { why: W.name, opener }); return false; }
  if (!me.v && !(await freshVerified().catch(() => false))) {
    pending = what;
    openSheet('check', { note: W.conf, opener });
    return false;
  }
  return true;
}
/* Like or unlike. One vote a person: a second tap on the same button takes it back, a tap on the other
   one moves it. The page changes at once and is put back if the server says no. force: set it, never
   take it back (a tap that waited for sign-in must not undo a vote made earlier). */
async function vote(id, dir, force) {
  let p = find(id);
  if (!p || p.status !== 'live') return;
  const opener = $('p-' + id) && $('p-' + id).querySelector('.vt-' + dir);
  try { if (!(await ready({ type: 'vote', id, dir }, opener))) return; }
  catch (e) { p.msg = words(e); p.msgBad = true; redraw(p, 'vt vt-' + dir); return; }
  p = find(id);
  if (!p) return;
  const uid = me.uid, val = dir === 'up' ? 1 : -1;
  if (p.uid === uid) { p.msg = tt('You cannot like or unlike your own post.'); p.msgBad = false; redraw(p); return; }
  const had = { my: p.my, ups: p.ups, downs: p.downs };
  if (p.my === val && force) return;
  const want = p.my === val ? 0 : val;
  const put = (q, my, ups, downs) => { q.my = my; q.ups = Math.max(0, ups); q.downs = Math.max(0, downs); q.score = q.ups - q.downs; };
  put(p, want, p.ups + (want === 1 ? 1 : 0) - (had.my === 1 ? 1 : 0), p.downs + (want === -1 ? 1 : 0) - (had.my === -1 ? 1 : 0));
  p.msg = '';
  T.rev++;
  redraw(p, 'vt vt-' + dir);
  try {
    /* The reader's own vote document and the post's two counts change in one write, or not at all.
       The vote document is private; the rules refuse a count that moves without it, and the other way round. */
    const { F, db } = S, ref = F.doc(db, 'posts', id), mine = F.doc(db, 'users', uid, 'votes', id);
    const now = await within(20000, F.runTransaction(db, async tx => {
      const s = await tx.get(ref), v = await tx.get(mine);
      if (!s.exists()) throw { code: 'not-found' };
      const d = s.data(), was = v.exists() ? v.data().v : 0;
      const ups = (d.ups || 0) + (want === 1 ? 1 : 0) - (was === 1 ? 1 : 0), downs = (d.downs || 0) + (want === -1 ? 1 : 0) - (was === -1 ? 1 : 0);
      if (was !== want) {
        if (want) tx.set(mine, { v: want, about: d.about, at: F.serverTimestamp() }); else tx.delete(mine);
        tx.update(ref, { ups, downs, score: ups - downs });
      }
      return { ups, downs };
    }));
    p = find(id) || p;
    put(p, want, now.ups, now.downs);
    T.rev++;
    redraw(p);
  } catch (e) {
    p = find(id) || p;
    put(p, had.my, had.ups, had.downs);
    p.msg = tt('That did not count. {why}', { why: words(e) }); p.msgBad = true;
    T.rev++;
    redraw(p);
  }
}
/* Report: a small menu with three reasons. Three reports from three readers hide a post until someone
   who runs the site has looked. */
function reportCtl(p) {
  const wrap = el('div', 'rp');
  if (p.reported) { wrap.append(el('span', 'rp-done', p.thanked ? tt('Reported. Thank you.') : tt('Reported'), { role: 'status' })); return wrap; }
  const about = tt('Not about {what}', { what: whatOf(p.about) });
  const b = btn('rp-b', tt('Report')), menu = el('div', 'rp-m', null, { role: 'menu', 'aria-label': tt('Why are you reporting this?') });
  b.setAttribute('aria-haspopup', 'menu'); b.setAttribute('aria-expanded', 'false');
  menu.hidden = true;
  const shut = back => { menu.hidden = true; b.setAttribute('aria-expanded', 'false'); D.removeEventListener('click', away, true); if (back) b.focus(); };
  const away = ev => { if (!wrap.contains(ev.target)) shut(false); };
  [['off-topic', about], ['abusive', tt('Abusive')], ['advert', tt('An advert')]].forEach(([why, label]) => {
    const i = btn(null, label, () => { shut(true); report(p.id, why); });
    i.setAttribute('role', 'menuitem'); menu.append(i);
  });
  b.addEventListener('click', () => {
    if (!menu.hidden) { shut(false); return; }
    menu.hidden = false; b.setAttribute('aria-expanded', 'true');
    D.addEventListener('click', away, true);
    menu.firstChild.focus();
  });
  wrap.addEventListener('keydown', ev => {
    if (menu.hidden) return;
    const items = [...menu.children], at = items.indexOf(D.activeElement);
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); shut(true); }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(at + 1) % items.length].focus(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); items[(at - 1 + items.length) % items.length].focus(); }
  });
  wrap.append(b, menu);
  return wrap;
}
async function report(id, why) {
  let p = find(id);
  if (!p) return;
  const opener = $('p-' + id) && $('p-' + id).querySelector('.rp-b');
  try { if (!(await ready({ type: 'report', id, why }, opener))) return; }
  catch (e) { p.msg = words(e); p.msgBad = true; redraw(p); return; }
  p = find(id);
  if (!p) return;
  const uid = me.uid;
  if (p.uid === uid) return;
  try {
    /* The reader's own report document (private: the author never learns who reported them) and the
       post's count of reports, in one write. The third report hides the post in that same write. */
    const { F, db } = S, ref = F.doc(db, 'posts', id), mine = F.doc(db, 'users', uid, 'reports', id);
    const hidden = await within(20000, F.runTransaction(db, async tx => {
      const s = await tx.get(ref), r = await tx.get(mine);
      if (!s.exists()) throw { code: 'not-found' };
      if (r.exists()) return false;
      const d = s.data(), nrep = (d.nrep || 0) + 1, patch = { nrep };
      if (nrep >= 3) patch.status = 'hidden';
      tx.set(mine, { why, about: d.about, at: F.serverTimestamp() });
      tx.update(ref, patch);
      return nrep >= 3;
    }));
    p = find(id) || p;
    p.reported = true; p.thanked = true;
    p.msg = hidden ? tt('It is off the page until we have looked at it.') : ''; p.msgBad = false;
    T.rev++;
    redraw(p);
    reason(p, why);
  } catch (e) {
    p = find(id) || p;
    /* Someone else's report hid it a moment ago: the reader's own was not needed. */
    if (e && e.code === 'permission-denied') { p.reported = true; p.thanked = true; p.msg = tt('It is already off the page while we look at it.'); p.msgBad = false; }
    else { p.msg = tt('That report did not go through. {why}', { why: words(e) }); p.msgBad = true; }
    redraw(p);
  }
}
/* Why it was reported goes to the notes sheet, so whoever looks at the post knows what to look for.
   Only the reason and the post: who reported it stays in that reader's own account. */
function reason(p, why) {
  const f = $('fbform');
  if (!f) return;
  try {
    const name = k => { const i = k === 'kind' ? f.querySelector('input[type=radio]') : $({ message: 'fbmsg', name: 'fbname', page: 'fbpage', about: 'fbctx' }[k]); return i && i.name; };
    const data = new URLSearchParams();
    data.set(name('kind'), 'report');
    data.set(name('message'), why + '\n\n-----\npost: ' + p.id);
    data.set(name('name'), ''); data.set(name('page'), location.origin + location.pathname); data.set(name('about'), (p.subject || '') + ' [' + p.about + ']');
    fetch(f.action, { method: 'POST', mode: 'no-cors', body: data }).catch(() => { });
  } catch (x) { }
}

/* ------------------------------------------------------------------ mod/: for the people who run the site
   The page is public and says one line. The tools are drawn only for a signed-in reader whose id is in
   the admins list, and the rules are what actually keep everyone else out of the data. */
function initMod() {
  const box = $('mod');
  if (!box) return;
  const gate = box.innerHTML;
  let shown = '';
  const closed = () => { if (shown !== 'gate') { box.innerHTML = gate; shown = 'gate'; } };
  async function draw() {
    if (!user) { closed(); return; }
    const uid = user.uid;
    if (shown === uid) return;
    try {
      const { F, db } = S, a = await F.getDoc(F.doc(db, 'admins', uid));
      if (!a.exists()) { closed(); return; }
    } catch (x) { closed(); return; }
    shown = uid; adminIs = true;
    modTools(box);
  }
  subs.push(draw);
  if (me) fb().then(draw, () => { });
}
function modTools(box) {
  const { F, db } = S, P = F.collection(db, 'posts');
  box.textContent = '';
  const line = el('p', 'sheet-msg', '', { role: 'status', 'aria-live': 'polite' });
  box.append(el('h1', 'talk-h1', 'Reader posts'));
  const hold = el('input', null, null, { type: 'checkbox', role: 'switch', id: 'mod-hold' }), hl = el('label', 'sheet-check sw mod-hold');
  hl.append(hold, el('span', null, 'Hold new posts until I have looked'));
  hold.addEventListener('change', async () => {
    hold.disabled = true;
    try { await F.setDoc(F.doc(db, 'config', 'site'), { hold: hold.checked }); holdAt = 0; tell(line, hold.checked ? 'New posts now wait for you before they show.' : 'New posts now show as soon as the reader\'s email is confirmed.'); }
    catch (e) { hold.checked = !hold.checked; tell(line, words(e), true); }
    hold.disabled = false;
  });
  const waitH = el('h2', 'mod-h', 'Waiting for you'), waitL = el('ul', 'votes mod-list', null, { id: 'mod-wait' });
  const newH = el('h2', 'mod-h', 'Newest'), newL = el('ul', 'votes mod-list', null, { id: 'mod-new' });
  const pplH = el('h2', 'mod-h', 'People'), pplL = el('ul', 'votes mod-list', null, { id: 'mod-people' });
  const copy = btn('btn btn-line', 'Copy emails'), csvBox = el('textarea', 'mod-csv', null, { readonly: '', rows: '6', 'aria-label': 'Names and emails, comma separated' });
  csvBox.hidden = true;
  const again = btn('btn btn-line', 'Load again', load);
  const top = el('div', 'row mod-top'); top.append(again);
  /* The two short links (libertypolitics.com/join and /panel): how many times each was used, day by day,
     and by which of our own links (the tag). Only an admin may read these. */
  const goH = el('h2', 'mod-h', 'Short links, last 28 days'), goBox = el('div', 'mod-go', null, { id: 'mod-go' });
  box.append(hl, line, top, waitH, waitL, newH, newL, goH, goBox, pplH, el('div', 'row', null), pplL);
  pplH.nextSibling.append(copy); pplL.before(csvBox);
  if (SITE.noStats) { goH.hidden = true; goBox.hidden = true; }      // a site with no short links has no counts to show
  const GO = ['yt', 'pin', 'qr', 'x', 'site', 'mail', 'other'], GOW = { yt: 'video description', pin: 'pinned comment', qr: 'QR code', x: 'X', site: 'this site', mail: 'newsletter', other: 'another tag', none: 'no tag' };
  function drawGo(days, err) {
    goBox.textContent = '';
    if (err) { goBox.append(el('p', 'said-note', err)); return; }
    const today = Math.floor(Date.now() / 86400000), num = v => (typeof v === 'number' && v > 0 ? Math.floor(v) : 0);
    const rows = days.filter(d => /^\d{5}$/.test(d.id) && +d.id > today - 28 && +d.id <= today).sort((a, b) => +b.id - +a.id);
    const split = (d, link) => { const o = { all: num(d[link]) }; let tagged = 0; GO.forEach(t => { o[t] = num(d[link + '_' + t]); tagged += o[t]; }); o.none = Math.max(0, o.all - tagged); return o; };
    const said = o => GO.concat(['none']).filter(t => o[t]).map(t => o[t] + ' ' + GOW[t]).join(', ');
    const sum = link => rows.reduce((acc, d) => { const o = split(d, link); Object.keys(o).forEach(k => { acc[k] = (acc[k] || 0) + o[k]; }); return acc; }, {});
    ['join', 'panel'].forEach(link => {
      const s = sum(link), p = el('p', 'mod-go-sum', null, { 'data-link': link });
      p.append(el('b', null, 'libertypolitics.com/' + link + ': ' + (s.all || 0)), s.all ? ' (' + said(s) + ')' : ' No use recorded yet.');
      goBox.append(p);
    });
    if (!rows.length) return;
    const wrap = el('div', 'scroll'), table = el('table', 'table mod-go-t'), head = el('tr'), body = el('tbody');
    ['Day', 'join', 'From', 'panel', 'From'].forEach(t => head.append(el('th', null, t, { scope: 'col' })));
    rows.forEach(d => {
      const tr = el('tr'), j = split(d, 'join'), p = split(d, 'panel');
      tr.append(el('td', 'num', new Date(+d.id * 86400000).toISOString().slice(0, 10)), el('td', 'num', String(j.all)), el('td', null, said(j)), el('td', 'num', String(p.all)), el('td', null, said(p)));
      body.append(tr);
    });
    const th = el('thead'); th.append(head); table.append(th, body); wrap.append(table); goBox.append(wrap);
  }
  let posts = [], people = [];
  const waiting = p => p.status === 'hidden' || p.status === 'pending' || (p.status === 'live' && p.nrep > 0);
  const label = p => ({ live: p.nrep ? 'Live, reported' : 'Live', hidden: 'Hidden by reports', pending: 'Waiting for you', held: 'Email not confirmed', removed: 'Removed' })[p.status] || p.status;
  function modRow(p) {
    const li = el('li', 'vote said', null, { 'data-id': p.id }), meta = el('div', 'meta'), who = el('span');
    who.append(el('b', null, p.name), ' · ' + niceDate(p.ms));
    meta.append(who, el('span', 'tag' + (p.status === 'live' && !p.nrep ? ' ok' : ''), label(p)));
    if (p.nrep) meta.append(el('span', 'tag', p.nrep + (p.nrep === 1 ? ' report' : ' reports')));
    li.append(meta);
    if (p.tag) meta.append(el('span', 'tag kind kind-' + p.tag, TAGS[p.tag]));
    if (p.parent) meta.append(el('span', 'tag', tt('Reply')));
    if (pathOf(p.about) != null) li.append(el('a', 'said-on', p.subject || p.about, { href: root + pathOf(p.about) }));
    if (p.text) li.append(el('blockquote', null, p.text));
    if (URL_OK.test(p.url)) li.append(el('a', 'said-link', p.url, { href: p.url, target: '_blank', rel: 'noopener nofollow ugc' }));
    li.append(el('p', 'said-note', p.ups + (p.ups === 1 ? ' like' : ' likes') + ' · ' + p.downs + (p.downs === 1 ? ' unlike' : ' unlikes') + (p.mine ? ' · says they made it' : '')));
    const acts = el('div', 'row'), note = el('p', 'said-msg', '', { role: 'status' });
    const set = async (patch, b) => {
      b.disabled = true;
      try { await F.updateDoc(F.doc(db, 'posts', p.id), patch); Object.assign(p, patch); place(); }
      catch (e) { b.disabled = false; note.textContent = words(e); note.className = 'said-msg bad'; }
    };
    const keep = btn('btn btn-line mod-keep', 'Keep', () => set({ status: 'live', nrep: 0 }, keep));
    let armed = false, timer = 0;
    const rm = btn('btn btn-line danger mod-rm', 'Remove', () => {
      if (!armed) { armed = true; rm.textContent = 'Tap again to remove'; rm.classList.add('armed'); timer = setTimeout(off, 6000); return; }
      clearTimeout(timer); set({ status: 'removed' }, rm);
    });
    const off = () => { armed = false; clearTimeout(timer); rm.textContent = 'Remove'; rm.classList.remove('armed'); };
    rm.addEventListener('blur', () => { if (armed && !rm.disabled) off(); });
    if (!(p.status === 'live' && !p.nrep)) acts.append(keep);
    if (p.status !== 'removed') acts.append(rm);
    li.append(acts, note);
    return li;
  }
  function place() {
    waitL.textContent = ''; newL.textContent = '';
    const w = posts.filter(waiting), rest = posts.filter(p => !waiting(p)).slice(0, 100);
    waitH.textContent = 'Waiting for you (' + w.length + ')';
    if (!w.length) waitL.append(stateRow('Nothing is waiting. No post is hidden, held for you, or reported.'));
    w.forEach(p => waitL.append(modRow(p)));
    newH.textContent = 'Newest (' + rest.length + ')';
    if (!rest.length) newL.append(stateRow('No posts yet.'));
    rest.forEach(p => newL.append(modRow(p)));
  }
  const cell = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = '\'' + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  /* newsAt: when the reader ticked "Email me news", as the server recorded it (UTC). Empty when they have not. */
  const when = u => (u.news && u.newsMs ? new Date(u.newsMs).toISOString().replace(/\.\d+Z$/, 'Z') : '');
  const csv = () => ['name,email,creator,channel,news,newsAt'].concat(people.map(u => [u.name, u.email, u.creator ? 'yes' : 'no', u.channel || '', u.news ? 'yes' : 'no', when(u)].map(cell).join(','))).join('\n');
  copy.addEventListener('click', async () => {
    const text = csv();
    try { await navigator.clipboard.writeText(text); tell(line, 'Copied ' + people.length + (people.length === 1 ? ' person' : ' people') + ' as name, email, creator, channel, news, newsAt.'); csvBox.hidden = true; }
    catch (x) { csvBox.hidden = false; csvBox.value = text; csvBox.focus(); csvBox.select(); tell(line, 'Your browser would not copy by itself. The list is in the box below: select it and copy.'); }
  });
  function drawPeople() {
    pplL.textContent = '';
    pplH.textContent = 'People (' + people.length + ')';
    if (!people.length) pplL.append(stateRow('Nobody has made an account yet.'));
    people.forEach(u => {
      const li = el('li', 'vote said'), meta = el('div', 'meta');
      meta.append(el('b', null, u.name), el('span', 'tag' + (u.confirmed ? ' ok' : ''), u.confirmed ? tt('Confirmed') : tt('Not confirmed')));
      if (u.creator) meta.append(el('span', 'tag best', 'Makes videos'));
      if (u.news) meta.append(el('span', 'tag', 'Wants news'));
      if (u.news) li.setAttribute('data-news-at', when(u));
      li.append(meta, el('p', 'mod-mail', u.email));
      if (u.creator && URL_OK.test(u.channel)) li.append(el('a', 'said-link', u.channel, { href: u.channel, target: '_blank', rel: 'noopener nofollow ugc' }));
      li.append(el('p', 'said-note', 'Joined ' + (u.ms ? niceDate(u.ms) : 'just now') + (u.news ? ' · ' + (u.newsMs ? 'Said yes to news on ' + niceDate(u.newsMs) : 'Said yes to news, date not recorded') : '')));
      pplL.append(li);
    });
  }
  async function load() {
    again.disabled = true; tell(line, 'Loading.');
    try {
      const [hid, pen, newest, users, cfg] = await within(25000, Promise.all([
        F.getDocs(F.query(P, F.where('status', '==', 'hidden'), F.limit(300))), F.getDocs(F.query(P, F.where('status', '==', 'pending'), F.limit(300))),
        F.getDocs(F.query(P, F.orderBy('createdAt', 'desc'), F.limit(100))), F.getDocs(F.query(F.collection(db, 'users'), F.limit(2000))), F.getDoc(F.doc(db, 'config', 'site'))]));
      const m = new Map();
      [hid, pen, newest].forEach(s => s.docs.forEach(d => m.set(d.id, shape(d.id, d.data()))));
      posts = [...m.values()].sort((a, b) => b.ms - a.ms);
      const str = v => typeof v === 'string' ? v : '';
      people = users.docs.map(d => { const u = d.data(); return { name: str(u.name), email: str(u.email), confirmed: u.confirmed === true, creator: u.creator === true, channel: str(u.channel), news: u.news === true, newsMs: u.newsAt && u.newsAt.toMillis ? u.newsAt.toMillis() : 0, ms: u.createdAt && u.createdAt.toMillis ? u.createdAt.toMillis() : 0 }; })
        .sort((a, b) => (b.creator - a.creator) || (b.ms - a.ms));
      hold.checked = cfg.exists() && cfg.data().hold === true;
      place(); drawPeople(); tell(line, '');
      /* The counts are read apart from the rest: while the first version of the rules is live nobody may read them. */
      if (!SITE.noStats) try {
        const st = await within(20000, F.getDocs(F.query(F.collection(db, 'stats'), F.limit(400))));
        drawGo(st.docs.map(d => Object.assign({ id: d.id }, d.data())));
      } catch (e) { drawGo([], e && e.code === 'permission-denied' ? 'The counts start once the new rules are published (README.md, "Short links that count").' : 'Could not load the counts. ' + words(e)); }
    } catch (e) { tell(line, 'Could not load. ' + words(e), true); }
    again.disabled = false;
  }
  load();
}

/* ------------------------------------------------------------------ the newest posts, on the front page
   The build prints one line that asks the reader in. Once the site has three posts to show, the newest
   three take its place, each with the page it is on. Fewer than three, or no answer, and the line stays:
   never an empty box, never a count. This asks Firestore directly, with one small request and without
   Firebase's own code, because it is near the top of the page most visitors land on. */
function fromRest(doc) {
  const out = {}, f = doc.fields || {};
  for (const k in f) {
    const v = f[k];
    out[k] = 'stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) : 'booleanValue' in v ? v.booleanValue
      : 'timestampValue' in v ? { toMillis: () => Date.parse(v.timestampValue) } : null;
  }
  return shape(String(doc.name || '').split('/').pop(), out);
}
function initLatest() {
  const sec = $('latest');
  if (!sec || OFF) return;
  let done = false;
  const run = () => { if (!done) { done = true; latest(sec).catch(() => { }); } };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); run(); } }, { rootMargin: '600px 0px' });
    io.observe(sec);
  } else run();
}
async function latest(sec) {
  if (hook('lpbreak')) return;
  const base = (EMU ? 'http://127.0.0.1:8080/v1/' : 'https://firestore.googleapis.com/v1/') + 'projects/' + (EMU ? DEMO : CFG.fb).projectId + '/databases/(default)/documents:runQuery';
  const q = { structuredQuery: { from: [{ collectionId: 'posts' }], where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'live' } } },
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }], limit: 12 } };
  const res = await within(15000, fetch(base + (EMU ? '' : '?key=' + encodeURIComponent(CFG.fb.apiKey)), { method: 'POST', body: JSON.stringify(q) }));
  if (!res.ok) return;
  const got = await res.json();
  const top = (Array.isArray(got) ? got : []).filter(r => r.document).map(r => fromRest(r.document)).filter(p => p.status === 'live' && !p.parent && pathOf(p.about) != null).slice(0, 3);
  if (top.length < 3) return;
  const wrap = sec.querySelector('.wrap') || sec, none = $('latest-none'), list = el('ul', 'votes latest-list');
  top.forEach(p => {
    const li = el('li', 'vote said'), meta = el('div', 'meta'), who = el('span');
    who.append(el('b', null, p.name), ' · ' + niceDate(p.ms));
    meta.append(who, el('span', 'tag kind' + (p.tag ? ' kind-' + p.tag : ''), TAGS[p.tag] || PLAIN[p.kind]));
    li.append(meta, el('a', 'said-on', p.subject || tt('Open the page'), { href: root + pathOf(p.about) + '#p-' + p.id }));
    const text = p.text.length > 200 ? p.text.slice(0, 197).replace(/\s+\S*$/, '') + '...' : p.text;
    if (text) li.append(el('blockquote', null, text));
    else if (p.kind !== 'opinion') li.append(el('p', 'said-note', p.kind === 'video' ? tt('A video. Watch it on the page.') : tt('A link. Open it on the page.')));
    list.append(li);
  });
  const more = el('div', 'row latest-go');
  more.append(el('a', 'btn btn-line', tt('Every discussion'), { href: '#discussion' }));
  if (none) none.remove();
  wrap.append(el('h2', null, tt('Latest from readers')), list, more);
  sec.classList.add('on');
}

/* ------------------------------------------------------------------ start */
function start() {
  if (!CFG) return;
  window.LP = { send: () => { send(); }, embedOf, pathOf, who: () => me && Object.assign({}, me), open: openSheet, close: closeSheet,
    ready: () => fb().then(() => true), emu: EMU, off: OFF, test: EMU ? { old: v => { forceOld = !!v; }, channelOf, cleanUrl, v2: () => isV2(), langOf, reserved: reservedName, nameProblem } : null };
  subs.push(reloadTalk);
  initHeader();
  initBox();
  initTalk();
  initLatest();
  initMod();
  if (me && !OFF) fb().then(() => { if (user && user.emailVerified && !me.ok) settle(false).catch(() => { }); }, () => { });
  window.addEventListener('focus', quietCheck); D.addEventListener('visibilitychange', quietCheck);
}
start();
