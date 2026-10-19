/* Join the team: the page and the form on panel/ (README.md, "Join the team" and "Panel recruitment, 19 October 2026").
   The same file on both sites: libertypolitics.com/panel and iranuncensored.com/<lang>/panel. Every sentence a person
   sees from here goes through tt(), the English as the key; the Iran site's Persian is in
   ../../site-iu/build/community-strings.json (its strings_check.py reads this file too).

   Three parts, and the first two need nothing from the site's database, so they work even when it cannot be reached:
   1. The video at the top: a picture and a play button (a.pv). The YouTube player is loaded only when it is tapped, from
      youtube-nocookie.com, so the page stays light on a phone. With scripts off the picture is a plain link to the video.
   2. The show times: anything marked data-et="11:00-14:00" (U.S. Eastern) is given the reader's own clock, in the words of
      its data-tpl and the locale of the page (data-loc on the form's section).
   3. The form. community.js must be on the page: it hands over Firebase, the signed-in reader and the sign-in panel
      (window.LP.members). An application is one document, teamapply/<the id of the account>, that only its owner and an
      admin can read (firestore.rules, "the team: applications"). Its fields, which build/teamapply.py reads by name:
        name, email, channels (up to 3 links), kind (live|video|writer|none), about, tz, from (the ?from= tag), at, status,
        video (the link to a 1 to 3 minute video, required), topics (keys, at least one), slots (keys of the shows they can
        come on, or 'other'), kit (true: camera, microphone and connection work), consent (true), heard (a key, or '').
      Sending it also marks the account as a creator, with its kind (users/<id>.creator and .creatorKind).
   What a person types reaches the page through textContent and .value, never as markup. */

const D = document, $ = id => D.getElementById(id);
const FORM = $('tj');
const KINDS = ['live', 'video', 'writer', 'none'];
const DRAFT = 'lp-teamjoin-draft';
const SEC = FORM ? FORM.closest('[data-loc]') : D.querySelector('[data-loc]');
const LOC = (SEC && SEC.getAttribute('data-loc')) || undefined;
let M = null, sending = false, pending = false, tt = s => s;

/* ------------------------------------------------------------------ 1. the video, loaded on tap */
function lite(a) {
  const id = a.getAttribute('data-yt');
  if (!/^[\w-]{11}$/.test(id || '')) return;
  a.addEventListener('click', ev => {
    if (ev.ctrlKey || ev.metaKey || ev.shiftKey) return;      /* a new tab, if they asked for one */
    ev.preventDefault();
    const s = parseInt(a.getAttribute('data-start') || '0', 10) || 0, e = parseInt(a.getAttribute('data-end') || '0', 10) || 0;
    const f = D.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1&modestbranding=1' + (s ? '&start=' + s : '') + (e > s ? '&end=' + e : '');
    f.title = a.getAttribute('aria-label') || 'Video';
    f.className = 'pv-f';
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    f.setAttribute('allowfullscreen', '');
    f.referrerPolicy = 'strict-origin-when-cross-origin';      /* YouTube refuses to play for a page that sends no referrer */
    a.replaceWith(f);
    try { f.focus(); } catch (x) { }
  });
}
D.querySelectorAll('a.pv[data-yt]').forEach(lite);

/* ------------------------------------------------------------------ 2. the show times on the reader's own clock */
function etClock() {
  if (!window.Intl) return;
  try {
    const n = new Date(), p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(n).forEach(x => { p[x.type] = +x.value; });
    const off = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute) - Math.floor(n.getTime() / 60000) * 60000;
    const at = hm => { const [h, m] = hm.split(':').map(Number); return new Date(Date.UTC(p.year, p.month - 1, p.day, h, m) - off); };
    const same = at('11:00'); if (same.getHours() === 11 && same.getMinutes() === 0) return;      /* the reader is on U.S. Eastern time already */
    const f = new Intl.DateTimeFormat(LOC, { hour: 'numeric', minute: '2-digit' });
    D.querySelectorAll('[data-et][data-tpl]').forEach(el => {
      const m = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/.exec(el.getAttribute('data-et') || '');
      if (!m) return;
      el.textContent = el.getAttribute('data-tpl').replace('{a}', f.format(at(m[1]))).replace('{b}', f.format(at(m[2])));
      el.hidden = false;
    });
  } catch (x) { }
}
etClock();

/* ------------------------------------------------------------------ 3. the form */
function store(v) { try { if (v) sessionStorage.setItem(DRAFT, JSON.stringify(v)); else sessionStorage.removeItem(DRAFT); } catch (x) { } }
function stored() { try { return JSON.parse(sessionStorage.getItem(DRAFT) || 'null'); } catch (x) { return null; } }
function say(text, bad) { const l = $('tj-msg'); l.textContent = text || ''; l.className = 'tj-msg' + (bad ? ' bad' : ''); if (text && l.scrollIntoView) { try { l.scrollIntoView({ block: 'nearest' }); } catch (x) { } } }
function fromTag() { try { const f = (new URLSearchParams(location.search).get('from') || '').toLowerCase(); return /^[a-z0-9]{1,12}$/.test(f) ? f : ''; } catch (x) { return ''; } }
function jsonAttr(name, dflt) { try { return JSON.parse(FORM.getAttribute(name) || 'null') || dflt; } catch (x) { return dflt; } }
const HOSTS = FORM ? jsonAttr('data-hosts', []) : [];
const HEARD_OF = FORM ? jsonAttr('data-heard-map', {}) : {};
/* "youtube.com/@name" is what people type: it is made a full https address. Anything that is still not one is refused. */
function link(s, max) {
  s = (s || '').trim().replace(/\s+/g, '');
  if (!s) return '';
  if (/^http:\/\//i.test(s)) s = 'https://' + s.slice(7);
  if (!/^https:\/\//i.test(s)) s = 'https://' + s.replace(/^\/+/, '');
  s = s.replace(/^https:\/\/([^/?#]+)/i, (m, h) => 'https://' + h.toLowerCase());      /* YouTube.com is youtube.com: the rules read the host in lower case */
  return /^https:\/\/[^\s<>"']{4,}$/.test(s) && s.length <= (max || 200) && /\.[a-z]{2,}/i.test(s) ? s : null;
}
/* The video's link is on a site Armin can open in one tap: the host, or a part of it (m.youtube.com, www.loom.com). */
function videoOk(u) {
  const m = /^https:\/\/([^/?#]+)\/./i.exec(u || '');
  if (!m) return false;
  const h = m[1].toLowerCase().replace(/:\d+$/, '');
  return HOSTS.some(x => h === x || h.endsWith('.' + x));
}
const ticked = name => Array.from(FORM.querySelectorAll('input[name="' + name + '"]:checked')).map(i => i.value);
function read() {
  const k = FORM.querySelector('input[name="tj-kind"]:checked');
  return {
    name: $('tj-name').value.trim(), ch: [$('tj-ch1').value, $('tj-ch2').value, $('tj-ch3').value], kind: k ? k.value : '',
    video: $('tj-video').value.trim(), topics: ticked('tj-topic'), slots: ticked('tj-slot'),
    about: $('tj-about').value.trim(), tz: $('tj-tz').value.trim(), heard: $('tj-heard').value,
    kit: $('tj-kit').checked, consent: $('tj-consent').checked
  };
}
function tick(name, keys) { FORM.querySelectorAll('input[name="' + name + '"]').forEach(i => { i.checked = (keys || []).includes(i.value); }); }
function fill(v) {
  if (!v) return;
  if (v.name) $('tj-name').value = v.name;
  (v.ch || v.channels || []).forEach((c, i) => { if (i < 3 && c) $('tj-ch' + (i + 1)).value = c; });
  if (KINDS.includes(v.kind)) { const r = FORM.querySelector('input[name="tj-kind"][value="' + v.kind + '"]'); if (r) r.checked = true; }
  if (v.video) $('tj-video').value = v.video;
  if (Array.isArray(v.topics)) tick('tj-topic', v.topics);
  if (Array.isArray(v.slots)) tick('tj-slot', v.slots);
  if (v.about) $('tj-about').value = v.about;
  if (v.tz) $('tj-tz').value = v.tz;
  if (v.heard && FORM.querySelector('#tj-heard option[value="' + v.heard + '"]')) $('tj-heard').value = v.heard;
  if (typeof v.kit === 'boolean') $('tj-kit').checked = v.kit;
  if (typeof v.consent === 'boolean') $('tj-consent').checked = v.consent;
}
/* What is wrong with the form: one sentence and the field to go to, or null when it can be sent. */
function problem(v) {
  if (v.name.length < 2) return [tt('Write your name, the one people know you by.'), 'tj-name'];
  if (/[<>]/.test(v.name + v.about)) return [tt('Please leave out the < and > signs.'), /[<>]/.test(v.name) ? 'tj-name' : 'tj-about'];
  if (!v.kind) return [tt('Pick what you make, or "Not yet".'), 'tj-kinds'];
  const bad = v.ch.findIndex(c => c.trim() && link(c) === null);
  if (bad >= 0) return [tt('This link does not look like an address: {link}', { link: v.ch[bad].trim().slice(0, 60) }), 'tj-ch' + (bad + 1)];
  if (v.kind !== 'none' && !v.ch.some(c => link(c))) return [tt('Add a link to your channel or page, so it can be watched first.'), 'tj-ch1'];
  if (!v.video) return [tt('Paste the link to your video. It is the one part of this form nobody can skip.'), 'tj-video'];
  const vl = link(v.video, 300);
  if (!vl) return [tt('This link does not look like an address: {link}', { link: v.video.slice(0, 60) }), 'tj-video'];
  if (!videoOk(vl)) return [tt('Put the video on YouTube, Google Drive, Loom, Dropbox, X, TikTok, Instagram or Vimeo, and paste that link.'), 'tj-video'];
  if (!v.topics.length) return [tt('Pick at least one subject you would talk about.'), 'tj-topics'];
  if (!v.slots.length) return [tt('Pick at least one show you could come on, or "Other times".'), 'tj-slots'];
  if (v.about.length < 10) return [tt('Say in a sentence or two what you talk about.'), 'tj-about'];
  if (!v.kit) return [tt('Tick the box when your camera, microphone and connection work. The show needs all three.'), 'tj-kit'];
  if (!v.consent) return [tt('Tick the last box to say you are 18 or older and agree to the show being recorded and published.'), 'tj-consent'];
  return null;
}
function mark(id) {
  FORM.querySelectorAll('[aria-invalid="true"]').forEach(x => x.removeAttribute('aria-invalid'));
  const el = id && $(id);
  if (!el) return;
  el.setAttribute('aria-invalid', 'true');
  const target = el.matches('input,textarea,select') ? el : el.querySelector('input');
  try { if (target) target.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); } catch (x) { }
}

let whoRun = 0;
async function who() {
  const line = $('tj-who'), u = M.user(), run = ++whoRun;      /* the reader can change twice in a moment: only the newest call writes the line */
  if (!u) { line.textContent = tt('When you press Send, you make a free account first (or sign in). The Team mark goes on that account.'); return; }
  line.textContent = tt('Signed in as {email}. The answer comes to that address.', { email: u.email || '' });
  try {
    const { F, db } = await M.fb(), snap = await M.within(20000, F.getDoc(F.doc(db, 'teamapply', u.uid)));
    if (run !== whoRun || !snap.exists()) return;
    const d = snap.data(), at = d.at && d.at.toDate ? d.at.toDate() : null;
    if (!stored() && !FORM.hidden) fill(d);
    line.textContent = at ? tt('Signed in as {email}. You applied on {date}. Change anything below and press Send to update it.', { email: u.email || '', date: at.toLocaleDateString(LOC, { day: 'numeric', month: 'long' }) })
      : tt('Signed in as {email}. You applied already. Change anything below and press Send to update it.', { email: u.email || '' });
    $('tj-go').textContent = tt('Update my application');
  } catch (x) { }
}

async function send() {
  if (sending) return;
  const v = read(), p = problem(v);
  if (p) { say(p[0], true); mark(p[1]); return; }
  mark(null);
  const u = M.user();
  if (!u) {
    store(v); pending = true;
    say(tt('Make your free account in the box that opened, then this sends by itself.'));
    M.open('auth', { mode: 'new', why: tt('Make a free account to send your application. The Team mark goes beside this account\'s name.') });
    return;
  }
  sending = true; pending = false;
  const go = $('tj-go'); go.disabled = true; say(tt('Sending...'));
  const channels = v.ch.map(c => link(c)).filter(Boolean);
  try {
    const { F, db } = await M.fb();
    await M.within(20000, F.setDoc(F.doc(db, 'teamapply', u.uid), {
      name: v.name, email: u.email, channels, kind: v.kind,
      about: v.about.slice(0, 1000), tz: v.tz.replace(/[^A-Za-z0-9_+:/ -]/g, '').slice(0, 64), from: fromTag(), at: F.serverTimestamp(), status: 'new',
      video: link(v.video, 300), topics: v.topics.slice(0, 8), slots: v.slots.slice(0, 8), kit: true, consent: true, heard: v.heard
    }));
    store(null);
    /* The account is marked a creator, with its kind. A refusal here never undoes the application. */
    try {
      const ref = F.doc(db, 'users', u.uid), snap = await M.within(20000, F.getDoc(ref));
      if (snap.exists()) {
        const mk = { creator: true, creatorKind: v.kind, email: u.email, confirmed: !!u.emailVerified };
        if (!snap.data().channel && channels[0]) mk.channel = channels[0];
        await M.within(20000, F.updateDoc(ref, mk));
      }
    } catch (x) { }
    say('');
    FORM.hidden = true;
    const done = $('tj-done'); done.hidden = false;
    try { done.focus(); done.scrollIntoView({ block: 'start' }); } catch (x) { }
  } catch (x) {
    say((x && x.code === 'permission-denied') ? tt('The site refused it. Check the links start with https:// and try again.') : tt('It did not send. Check your connection and press Send again.'), true);
  } finally { sending = false; go.disabled = false; }
}

function start(m) {
  M = m;
  if (typeof m.tt === 'function') tt = m.tt;
  if (!FORM) return;
  try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz && !$('tj-tz').value) $('tj-tz').value = tz; } catch (x) { }
  const f = fromTag(), h = HEARD_OF[f];
  if (h && !$('tj-heard').value && FORM.querySelector('#tj-heard option[value="' + h + '"]')) $('tj-heard').value = h;
  fill(stored());
  FORM.addEventListener('submit', e => { e.preventDefault(); send(); });
  /* A mark goes once the reader changes the field it is on. */
  FORM.addEventListener('input', e => { const x = e.target.closest('[aria-invalid="true"]'); if (x) x.removeAttribute('aria-invalid'); });
  FORM.addEventListener('change', e => { const x = e.target.closest('[aria-invalid="true"]'); if (x) x.removeAttribute('aria-invalid'); });
  M.sub(() => { who(); if (pending && M.user()) { M.close && M.close(); send(); } });
  M.fb().then(who, () => { $('tj-who').textContent = tt('The form could not reach the site. Check your connection and reload.'); });
  /* An account panel left open with a draft from before a reload: send it once they are in. */
  if (stored()) pending = true;
}
(function wait(n) {
  const m = window.LP && window.LP.members;
  if (m) { if (window.LP.close) m.close = window.LP.close; start(m); return; }
  if (n > 150) { const w = $('tj-who'); if (w) w.textContent = tt('The form needs the page to finish loading. Reload it.'); return; }
  setTimeout(() => wait(n + 1), 100);
})(0);
