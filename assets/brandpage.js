/* Brand pages (brand/ on libertypolitics.com): one brand, for the person it belongs to and for Armin.

   community.js must be on the page first: it hands this file Firebase and the signed-in reader (window.LP.room).
   WHO GETS IN is decided by the rules (firestore.rules, brandpages): an account named in a page's members list, and
   an admin. Everyone else sees one line and a sign-in button. The words of a page and its pictures are put in the
   database by build/brandpage.py with the site's own key; nothing about a person's brand is in the public build.
   What the owner does here is saved at once under brandpages/<page>/mine/<key> (a look picked, a like, their story,
   their bios) and notes/ (what they tell the site), and read by brandpage.py inbox. Runbook: ../README.md, "Brand pages".

   English only: brand pages exist on this site alone. A person's words reach the page through textContent. */

const D = document, $ = id => D.getElementById(id);
const BOX = $('bp');
let R = null, el = null, btn = null;
const ST = { uid: '', pages: [], key: '', doc: null, files: [], mine: {}, notes: [], urls: [], busy: false, look: '', open: {} };

const CSS = `
#bp{--bp-gap:clamp(28px,6vw,56px)}
#bp .bp-top{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
#bp .bp-chip{font:inherit;font-weight:700;font-size:.95rem;min-height:44px;padding:8px 16px;border:1px solid var(--line);border-radius:999px;background:var(--panel);color:var(--ink);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
#bp .bp-chip[aria-current="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
#bp .bp-hero{position:relative;border-radius:calc(var(--r) * 2);overflow:hidden;background:var(--sunk);border:1px solid var(--line)}
#bp .bp-hero img{display:block;width:100%;aspect-ratio:3/1;object-fit:cover}
#bp .bp-hello{display:flex;gap:16px;align-items:center;margin:18px 0 6px}
#bp .bp-face{flex:none;width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--line);background:var(--sunk)}
#bp h1{font-family:var(--display);font-weight:900;font-size:clamp(2rem,7vw,3.2rem);line-height:1.02;margin:0;text-transform:uppercase;letter-spacing:.01em}
#bp .bp-lede{color:var(--dim);font-size:1.08rem;line-height:1.55;margin:8px 0 0;max-width:44rem}
#bp .bp-steps{list-style:none;margin:22px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;counter-reset:s}
#bp .bp-steps a{display:flex;gap:10px;align-items:center;min-height:56px;padding:10px 12px;border:1px solid var(--line);border-radius:var(--r);background:var(--panel);color:var(--ink);text-decoration:none;font-weight:700;line-height:1.25}
#bp .bp-steps i{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:.9rem;border:2px solid var(--line);color:var(--dim)}
#bp .bp-steps .done i{background:var(--field);border-color:var(--field);color:var(--on-field)}
#bp .bp-steps small{display:block;font-weight:400;color:var(--dim);font-size:.82rem}
#bp .bp-meter{height:8px;border-radius:99px;background:var(--sunk);margin:14px 0 0;overflow:hidden;border:1px solid var(--line)}
#bp .bp-meter b{display:block;height:100%;background:var(--field);transition:width .4s}
#bp .bp-sec{margin-top:var(--bp-gap);padding-top:22px;border-top:1px solid var(--line);scroll-margin-top:80px}
#bp .bp-sec>h2{font-family:var(--display);font-weight:800;font-size:clamp(1.5rem,5vw,2rem);line-height:1.1;margin:0 0 6px;text-transform:uppercase}
#bp .bp-sub{color:var(--dim);margin:0 0 16px;line-height:1.55;max-width:44rem}
#bp .bp-looks{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px}
#bp .bp-look{border:1px solid var(--line);border-radius:calc(var(--r) * 1.5);background:var(--panel);overflow:hidden;display:flex;flex-direction:column;min-width:0}
#bp .bp-look.picked{outline:3px solid var(--field);outline-offset:-1px}
#bp .bp-look .pic{position:relative;background:var(--sunk);aspect-ratio:16/9;overflow:hidden}
#bp .bp-look .pic img{width:100%;height:100%;object-fit:cover;display:block}
#bp .bp-look .pic .face{position:absolute;left:12px;bottom:12px;width:58px;height:58px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.25)}
#bp .bp-badge{position:absolute;top:10px;right:10px;background:var(--field);color:var(--on-field);font-weight:800;font-size:.8rem;padding:6px 10px;border-radius:99px}
#bp .bp-look .body{padding:14px;display:flex;flex-direction:column;gap:10px;flex:1}
#bp .bp-look h3{margin:0;font-size:1.25rem}
#bp .bp-look p{margin:0;line-height:1.5}
#bp .bp-why{color:var(--dim);font-size:.95rem}
#bp .bp-dots{display:flex;gap:6px;flex-wrap:wrap}
#bp .bp-dots span{width:30px;height:30px;border-radius:50%;border:1px solid var(--line)}
#bp .bp-type{color:var(--dim);font-size:.88rem}
#bp .bp-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}
#bp .bp-acts button,#bp .bp-btn{font:inherit;font-weight:700;font-size:.95rem;min-height:44px;padding:8px 14px;border:1px solid var(--line);border-radius:var(--r);background:var(--bg);color:var(--ink);cursor:pointer}
#bp .bp-acts button[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
#bp .bp-acts .pick,#bp .bp-btn.main{background:var(--field);color:var(--on-field);border-color:var(--field)}
#bp .bp-acts .pick[aria-pressed="true"]{background:var(--field);color:var(--on-field)}
#bp .bp-btn:disabled,#bp .bp-acts button:disabled{opacity:.6;cursor:progress}
#bp button:focus-visible,#bp a:focus-visible,#bp textarea:focus-visible{outline:2px solid var(--field);outline-offset:2px}
#bp .bp-field{display:grid;gap:6px;margin:0 0 16px}
#bp .bp-field b{font-size:1rem}
#bp .bp-field small{color:var(--dim);font-size:.85rem}
#bp textarea{font:inherit;width:100%;padding:12px;border:1px solid var(--line);border-radius:var(--r);background:var(--sunk);color:var(--ink);min-height:96px;resize:vertical;line-height:1.5}
#bp .bp-state{font-size:.82rem;color:var(--dim);min-height:1.2em}
#bp .bp-state.ok{color:var(--ga)}
#bp .bp-state.bad{color:var(--gd)}
#bp .bp-draft{font-size:.8rem;font-weight:700;color:var(--field)}
#bp .bp-words{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:14px}
#bp .bp-card{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:14px;min-width:0}
#bp .bp-card h3{margin:0 0 8px;font-size:1.05rem;display:flex;justify-content:space-between;gap:8px;align-items:baseline}
#bp .bp-card h3 small{color:var(--dim);font-weight:400;font-size:.82rem}
#bp .bp-groups{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
#bp .bp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;list-style:none;margin:0;padding:0}
#bp .bp-file{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);display:flex;flex-direction:column;min-width:0}
#bp .bp-file .th{aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;background:var(--sunk);border-bottom:1px solid var(--line);border-radius:var(--r) var(--r) 0 0;overflow:hidden}
#bp .bp-file .th.clear{background:repeating-conic-gradient(#d9d8d0 0 25%,#f2f1e6 0 50%) 0 0/16px 16px}
#bp .bp-file .th img{max-width:100%;max-height:100%;display:block}
#bp .bp-file .m{padding:10px 10px 0;min-width:0}
#bp .bp-file .m b{display:block;font-size:.92rem;line-height:1.3;overflow-wrap:anywhere}
#bp .bp-file .m small{display:block;color:var(--dim);font-size:.78rem;margin-top:3px}
#bp .bp-file .bp-acts{padding:10px;gap:6px}
#bp .bp-file .bp-acts button{flex:1 1 auto;padding:8px 10px;font-size:.88rem}
#bp .bp-note{border:1px solid var(--line);border-radius:var(--r);background:var(--panel);padding:12px;margin-top:10px}
#bp .bp-note.site{border-inline-start:4px solid var(--field)}
#bp .bp-note .who{font-size:.85rem;color:var(--dim);margin-bottom:6px}
#bp .bp-note p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}
#bp .bp-next{list-style:none;padding:0;margin:0;display:grid;gap:10px}
#bp .bp-next li{display:flex;gap:12px;align-items:flex-start;line-height:1.5}
#bp .bp-next li span{flex:none;font-size:1.3rem}
#bp .bp-admin{background:var(--sunk);border:1px dashed var(--line);border-radius:var(--r);padding:10px 12px;font-size:.92rem;margin:0 0 14px}
#bp .bp-msg{font-weight:600;min-height:1.4em;margin:8px 0 0}
#bp .bp-msg.bad{color:var(--gd)}
`;

/* ------------------------------------------------------------------ small helpers */
const first = s => String(s || '').trim().split(/\s+/)[0] || '';
function bytesOf(v) { return v && typeof v.toUint8Array === 'function' ? v.toUint8Array() : (v instanceof Uint8Array ? v : null); }
function blobUrl(bytes, type) { const u = URL.createObjectURL(new Blob([bytes], { type })); ST.urls.push(u); return u; }
function freeUrls() { ST.urls.forEach(u => { try { URL.revokeObjectURL(u); } catch (x) { } }); ST.urls = []; }
function sizeText(n) { return n >= 1048576 ? (Math.round(n / 104857.6) / 10) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
function msg(text, bad) { const p = el('p', 'bp-msg' + (bad ? ' bad' : ''), text || '', { role: 'status', 'aria-live': 'polite' }); return p; }
function thumbOf(f) { const b = bytesOf(f.thumb); return b ? blobUrl(b, f.thumbType || 'image/jpeg') : ''; }
function fileById(id) { return ST.files.find(f => f.id === id); }
function v(k) { return (ST.mine[k] || {}).v || ''; }
function sec(id, title, sub) {
  const s = el('section', 'bp-sec', null, { id: 'bp-' + id });
  s.append(el('h2', null, title));
  if (sub) s.append(el('p', 'bp-sub', sub));
  return s;
}

/* One file out of the database, checked whole (the same pieces as the team page, teamroom.js fetchFile). */
async function fetchFile(f) {
  const { F, db } = await R.fb();
  const snap = await R.within(60000, F.getDocs(F.query(F.collection(db, 'brandpages', ST.key, 'files', f.id, 'parts'), F.limit(60))));
  const parts = snap.docs.map(d => [parseInt(d.id, 10), bytesOf(d.data().b)]).sort((a, b) => a[0] - b[0]);
  if (parts.length !== f.parts || parts.some((p, i) => p[0] !== i || !p[1])) throw { code: 'bp/broken' };
  const out = new Uint8Array(parts.reduce((n, p) => n + p[1].length, 0));
  let at = 0;
  for (const p of parts) { out.set(p[1], at); at += p[1].length; }
  if (out.length !== f.bytes) throw { code: 'bp/broken' };
  if (f.sha && window.crypto && crypto.subtle) {
    const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', out))).map(b => b.toString(16).padStart(2, '0')).join('');
    if (h !== f.sha) throw { code: 'bp/broken' };
  }
  return out;
}
function saveBlob(blob, name) {
  const u = URL.createObjectURL(blob), a = el('a', null, null, { href: u, download: name });
  a.style.display = 'none'; D.body.append(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 60000);
}
/* A zip with nothing squeezed: the same writer as teamroom.js zipOf, kept here because that file draws the team page. */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipOf(files) {
  const enc = new TextEncoder(), chunks = [], central = [];
  let at = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true);
    h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(h.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, at, true);
    central.push(new Uint8Array(c.buffer), name);
    at += 30 + name.length + f.data.length;
  }
  const size = central.reduce((n, p) => n + p.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, at, true);
  return new Blob(chunks.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
}

/* ------------------------------------------------------------------ saving what the owner does */
async function save(k, val, state) {
  const { F, db } = await R.fb();
  const u = R.user();
  if (state) { state.textContent = 'Saving...'; state.className = 'bp-state'; }
  try {
    await R.within(15000, F.setDoc(F.doc(db, 'brandpages', ST.key, 'mine', k), { uid: u.uid, v: String(val).slice(0, 3000), at: F.serverTimestamp() }));
    ST.mine[k] = { uid: u.uid, v: String(val) };
    if (state) { state.textContent = 'Saved. We see it.'; state.className = 'bp-state ok'; }
    progress();
    return true;
  } catch (e) {
    if (state) { state.textContent = (e && e.code === 'permission-denied') ? 'Not saved: confirm your email address first (Your account), then try again.' : 'Not saved. Check your connection and try again.'; state.className = 'bp-state bad'; }
    return false;
  }
}
async function writeNote(about, text, line, after) {
  const { F, db } = await R.fb();
  const u = R.user(), me = (window.LP.who && window.LP.who()) || {};
  try {
    await R.within(15000, F.addDoc(F.collection(db, 'brandpages', ST.key, 'notes'), { uid: u.uid, name: me.name || 'Reader', about, text: text.slice(0, 1500), createdAt: F.serverTimestamp() }));
    line.textContent = 'Sent. You will get an answer right here.'; line.className = 'bp-msg';
    await loadNotes(); paintTalk(); if (after) after();
  } catch (e) { line.textContent = 'Not sent. Check your connection and try again.'; line.className = 'bp-msg bad'; }
}

/* ------------------------------------------------------------------ who is let in */
function gate(text, withSignIn) {
  freeUrls();
  BOX.textContent = '';
  BOX.append(el('h1', null, 'Brand page'), el('p', 'bp-lede', text));
  if (withSignIn) BOX.append(btn('btn btn-key', 'Sign in', () => window.LP.open('auth', {})));
}
async function pagesFor(u) {
  const { F, db } = await R.fb();
  const got = new Map();
  const mineQ = await R.within(15000, F.getDocs(F.query(F.collection(db, 'brandpages'), F.where('members', 'array-contains', u.uid), F.limit(20))));
  mineQ.docs.forEach(d => got.set(d.id, d));
  try { (await R.within(15000, F.getDocs(F.query(F.collection(db, 'brandpages'), F.limit(20))))).docs.forEach(d => got.set(d.id, d)); } catch (x) { /* only an admin may list every page */ }
  return Array.from(got.values()).map(d => ({ key: d.id, name: d.data().name || d.id, doc: d.data(), mine: (d.data().members || []).includes(u.uid) }));
}
async function draw() {
  if (!R) return;
  const u = R.user();
  if (!u) { ST.uid = ''; gate('This is a private page for a member of the Liberty Politics team. Sign in with your account to open your brand.', true); return; }
  if (ST.uid === u.uid || ST.busy) return;
  ST.busy = true;
  try {
    const pages = await pagesFor(u);
    if (!R.user() || R.user().uid !== u.uid) return;
    if (!pages.length) { ST.uid = ''; gate('There is no brand page for this account yet. If you are on the team, tell Armin which email you signed up with here.', false); return; }
    ST.uid = u.uid; ST.pages = pages.sort((a, b) => (b.mine - a.mine) || a.name.localeCompare(b.name));
    const want = decodeURIComponent((location.hash || '').slice(1));
    await openPage((ST.pages.find(p => p.key === want) || ST.pages[0]).key);
  } catch (e) {
    ST.uid = '';
    gate('The brand page could not be loaded. Check your connection and load the page again.', false);
  } finally { ST.busy = false; }
}
async function loadNotes() {
  const { F, db } = await R.fb();
  const n = await R.within(20000, F.getDocs(F.query(F.collection(db, 'brandpages', ST.key, 'notes'), F.limit(300))));
  ST.notes = n.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
}
const ms = t => t && typeof t.toMillis === 'function' ? t.toMillis() : 0;
async function openPage(key) {
  const { F, db } = await R.fb();
  const page = ST.pages.find(p => p.key === key);
  ST.key = key;
  ST.doc = JSON.parse(page.doc.json || '{}');
  const [files, mine] = await Promise.all([
    R.within(30000, F.getDocs(F.query(F.collection(db, 'brandpages', key, 'files'), F.limit(300)))),
    R.within(20000, F.getDocs(F.query(F.collection(db, 'brandpages', key, 'mine'), F.limit(300)))),
  ]);
  ST.files = files.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (a.order || 0) - (b.order || 0));
  ST.mine = {};
  mine.docs.forEach(d => { ST.mine[d.id] = d.data(); });
  await loadNotes();
  ST.look = v('look') || ST.doc.rec;
  if (location.hash.slice(1) !== key) history.replaceState(null, '', '#' + key);
  paint();
}

/* ------------------------------------------------------------------ the page */
const STEPS = [
  ['look', 'Pick your look', 'Three directions, one tap'],
  ['story', 'Tell your story', 'Edit my first draft'],
  ['words', 'Check your words', 'Bios for every account'],
  ['kit', 'Get your kit', 'Every picture, ready to upload'],
];
function stepDone(k) {
  if (k === 'look') return !!v('look') || ST.doc.kind === 'show';
  if (k === 'story') return Object.keys(ST.mine).some(x => x.startsWith('story:'));
  if (k === 'words') return Object.keys(ST.mine).some(x => x.startsWith('words:'));
  if (k === 'kit') return !!v('kit:got');
  return false;
}
function progress() {
  const box = $('bp-steps'), bar = $('bp-bar');
  if (!box) return;
  let n = 0;
  box.querySelectorAll('li').forEach(li => { const ok = stepDone(li.dataset.k); n += ok; li.firstChild.className = ok ? 'done' : ''; li.querySelector('i').textContent = ok ? '✓' : li.dataset.n; });
  const all = box.querySelectorAll('li').length;
  if (bar) bar.firstChild.style.width = Math.round(n / all * 100) + '%';
  const sum = $('bp-sum');
  if (sum) sum.textContent = n === all ? 'All done. Your brand is ready to go live, whenever you are.' : `${n} of ${all} done.`;
}

function paint() {
  freeUrls();
  const B = ST.doc, person = B.kind === 'person', u = R.user();
  const pg = ST.pages.find(p => p.key === ST.key);
  BOX.textContent = '';
  if (ST.pages.length > 1) {
    const top = el('nav', 'bp-top', null, { 'aria-label': 'Brand pages' });
    ST.pages.forEach(p => {
      const a = el('a', 'bp-chip', p.name, { href: '#' + p.key, 'aria-current': p.key === ST.key ? 'true' : 'false' });
      a.addEventListener('click', ev => { ev.preventDefault(); history.replaceState(null, '', '#' + p.key); openPage(p.key); });
      top.append(a);
    });
    BOX.append(top);
  }
  if (person && pg && !pg.mine) BOX.append(el('p', 'bp-admin', `You are looking at ${B.person}'s page as an admin. What you save here is saved on her page, under your name.`));

  // The hero: the banner of the look in front, her face, her name, and the four steps.
  const look = B.looks.find(l => l.k === ST.look) || B.looks[0];
  const hero = el('div', 'bp-hero');
  const banner = fileById(look.files.find(id => /x-header|youtube-banner/.test(id)) || '');
  const himg = el('img', null, null, { alt: `${B.name} banner in the ${look.name} look`, src: banner ? thumbOf(banner) : '' });
  hero.append(himg);
  BOX.append(hero);
  if (banner) fetchFile(banner).then(b => { himg.src = blobUrl(b, banner.type); }).catch(() => { });
  const hello = el('div', 'bp-hello');
  const photo = fileById('photo');
  if (photo) hello.append(el('img', 'bp-face', null, { src: thumbOf(photo), alt: '' }));
  const hw = el('div');
  hw.append(el('h1', null, person ? `${first(B.person)}, meet your brand.` : `${B.name} brand`));
  hw.append(el('p', 'bp-lede', person
    ? `We built ${B.name} a complete identity: three looks to choose from, every picture your accounts need, and the words to go with them. Four steps, about ten minutes. Everything you tap here is saved and reaches us at once.`
    : `The ${B.name} brand in one place: the kit, the words on every account, and the story. Only you can open this page.`));
  hello.append(hw);
  BOX.append(hello);
  const steps = el('ol', 'bp-steps', null, { id: 'bp-steps' });
  STEPS.filter(([k]) => person || k !== 'look').forEach(([k, t, s], i) => {
    const li = el('li', null, null, { 'data-k': k, 'data-n': String(i + 1) });
    const a = el('a', null, null, { href: '#bp-' + k });
    a.addEventListener('click', ev => { ev.preventDefault(); $('bp-' + k).scrollIntoView({ behavior: 'smooth' }); });
    const i_ = el('i', null, String(i + 1)), tx = el('span', null, t);
    tx.append(el('small', null, s));
    a.append(i_, tx); li.append(a); steps.append(li);
  });
  BOX.append(steps);
  const bar = el('div', 'bp-meter', null, { id: 'bp-bar', role: 'presentation' }); bar.append(el('b')); BOX.append(bar);
  BOX.append(el('p', 'bp-sub', '', { id: 'bp-sum', style: 'margin-top:8px' }));

  if (person) BOX.append(paintLooks());
  BOX.append(paintStory(), paintWords(), paintKit());
  const talk = sec('talk', 'Talk to us', `Anything at all: a colour you hate, a size you need, a platform we missed, an idea for a series. ${person ? 'Armin and the team read every word, and the answer appears right here.' : ''}`);
  talk.append(el('div', null, null, { id: 'bp-talk' }));
  BOX.append(talk);
  paintTalk();
  if (person) BOX.append(paintNext());
  progress();
}

function react(key, label, val, after) {
  const b = el('button', null, label, { type: 'button', 'aria-pressed': v(key) === val ? 'true' : 'false' });
  b.addEventListener('click', async () => {
    const nv = v(key) === val ? '' : val;
    b.disabled = true;
    if (await save(key, nv)) { b.parentNode.querySelectorAll('[data-r]').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', nv ? 'true' : 'false'); if (after) after(nv); }
    b.disabled = false;
  });
  b.setAttribute('data-r', key);
  return b;
}

function paintLooks() {
  const B = ST.doc, s = sec('look', '1. Pick your look', 'Each look is a full set: banner, profile pictures, stream screens, Shorts covers and more. Tap the one that feels like you. You can change your mind any time.');
  const grid = el('div', 'bp-looks');
  const photo = fileById('photo');
  B.looks.forEach(l => {
    const card = el('article', 'bp-look' + (ST.look === l.k && v('look') ? ' picked' : ''));
    const pic = el('div', 'pic');
    const f = fileById(l.files.find(id => /youtube-banner/.test(id)) || l.files.find(id => /x-header/.test(id)) || '');
    if (f) pic.append(el('img', null, null, { src: thumbOf(f), alt: `${l.name}: the YouTube banner` }));
    if (photo) pic.append(el('img', 'face', null, { src: thumbOf(photo), alt: '' }));
    if (l.rec) pic.append(el('span', 'bp-badge', 'Our pick for you'));
    card.append(pic);
    const body = el('div', 'body');
    body.append(el('h3', null, l.name), el('p', null, l.short), el('p', 'bp-why', l.why));
    const dots = el('div', 'bp-dots', null, { 'aria-label': 'Colours' });
    l.palette.forEach(c => dots.append(el('span', null, null, { style: `background:${c.hex}`, title: `${c.name}: ${c.role}` })));
    body.append(dots, el('p', 'bp-type', 'Type: ' + l.fonts.join(' and ')));
    const acts = el('div', 'bp-acts');
    const pick = el('button', 'pick', v('look') === l.k ? '✓ My look' : 'Pick this look', { type: 'button', 'aria-pressed': v('look') === l.k ? 'true' : 'false' });
    pick.addEventListener('click', async () => {
      pick.disabled = true;
      if (await save('look', l.k)) { ST.look = l.k; paint(); $('bp-look').scrollIntoView(); }
      pick.disabled = false;
    });
    acts.append(pick, react('react:look:' + l.k, '❤ Love it', 'love'), react('react:look:' + l.k, '✕ Not me', 'no'));
    const show = el('button', null, 'See all pictures', { type: 'button' });
    show.addEventListener('click', () => { ST.look = l.k; paint(); $('bp-kit').scrollIntoView(); });
    acts.append(show);
    body.append(acts);
    card.append(body);
    grid.append(card);
  });
  s.append(grid);
  return s;
}

function field(k, label, help, draft) {
  const box = el('label', 'bp-field');
  const head = el('b', null, label);
  box.append(head);
  if (help) box.append(el('small', null, help));
  const saved = ST.mine[k];
  const ta = el('textarea', null, null, { rows: '4', maxlength: '3000' });
  ta.value = saved ? saved.v : draft || '';
  const state = el('span', 'bp-state', saved ? 'Saved.' : (draft ? '' : ''));
  if (!saved && draft) box.append(el('span', 'bp-draft', 'My first draft. Change anything, then tap outside the box.'));
  box.append(ta, state);
  let last = ta.value;
  ta.addEventListener('blur', () => { if (ta.value !== last) { last = ta.value; save(k, ta.value, state); } });
  return [box, ta];
}

function paintStory() {
  const B = ST.doc, person = B.kind === 'person';
  const s = sec('story', (person ? '2' : '1') + '. Tell your story', person
    ? 'Who you are, what you believe, where you are going. This is what we write everything else from: your bios, your Shorts, your About page. Each box saves itself when you tap outside it.'
    : 'The story every picture and line of this brand comes from. Each box saves itself when you tap outside it.');
  B.story.forEach(q => { const [box] = field('story:' + q.k, q.label, q.help, q.draft); s.append(box); });
  const ok = el('button', 'bp-btn main', 'This is right as it is', { type: 'button' });
  const st = el('span', 'bp-state');
  ok.addEventListener('click', async () => { ok.disabled = true; await save('story:ok', 'yes', st); ok.disabled = false; });
  s.append(ok, st);
  return s;
}

function paintWords() {
  const B = ST.doc, person = B.kind === 'person';
  const s = sec('words', (person ? '3' : '2') + '. Check your words', 'The bio for each account, written to fit its limit. Copy one, paste it into the app, done. Change any of them here and we keep your version.');
  const grid = el('div', 'bp-words');
  Object.keys(B.words).forEach(p => {
    const w = B.words[p], k = 'words:' + p.toLowerCase();
    const card = el('div', 'bp-card');
    const h = el('h3', null, p);
    const count = el('small');
    h.append(count); card.append(h);
    const saved = ST.mine[k];
    const ta = el('textarea', null, null, { rows: w.limit && w.limit <= 160 ? '3' : '7', 'aria-label': p + ' bio' });
    ta.value = saved ? saved.v : w.text;
    const state = el('span', 'bp-state', saved ? 'Your version, saved.' : '');
    const upd = () => { const n = ta.value.length; count.textContent = w.limit ? `${n} / ${w.limit}` : `${n} characters`; count.style.color = w.limit && n > w.limit ? 'var(--gd)' : ''; };
    upd(); ta.addEventListener('input', upd);
    let last = ta.value;
    ta.addEventListener('blur', () => { if (ta.value !== last) { last = ta.value; save(k, ta.value, state); } });
    const acts = el('div', 'bp-acts');
    const cp = el('button', null, 'Copy', { type: 'button' });
    cp.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(ta.value); cp.textContent = 'Copied'; } catch (x) { ta.select(); cp.textContent = 'Selected: copy it'; }
      setTimeout(() => { cp.textContent = 'Copy'; }, 2500);
      if (!ST.mine[k]) save(k, ta.value, state);
    });
    acts.append(cp, react('react:' + k, '👍', 'love'), react('react:' + k, '👎', 'no'));
    card.append(ta, acts, state);
    grid.append(card);
  });
  s.append(grid);
  return s;
}

function paintKit() {
  const B = ST.doc, person = B.kind === 'person';
  const look = B.looks.find(l => l.k === ST.look) || B.looks[0];
  const s = sec('kit', (person ? '4' : '3') + '. Get your kit', person
    ? `Every picture in the ${look.name} look, sized for each app. Download one, or all of them at once. Love it or hate it, tell us: tap a heart or a cross and we redraw.`
    : 'Every picture of the kit in use, sized for each app.');
  if (person && B.looks.length > 1) {
    const sw = el('div', 'bp-groups', null, { role: 'group', 'aria-label': 'Look' });
    B.looks.forEach(l => {
      const c = el('button', 'bp-chip', l.name + (v('look') === l.k ? ' ✓' : ''), { type: 'button', 'aria-current': l.k === look.k ? 'true' : 'false' });
      c.addEventListener('click', () => { ST.look = l.k; paint(); $('bp-kit').scrollIntoView(); });
      sw.append(c);
    });
    s.append(sw);
  }
  const files = look.files.map(fileById).filter(Boolean);
  const all = el('button', 'bp-btn main', `Download all ${files.length} pictures (${sizeText(files.reduce((n, f) => n + (f.bytes || 0), 0))})`, { type: 'button' });
  const line = msg('');
  all.addEventListener('click', async () => {
    all.disabled = true;
    try {
      const got = [];
      for (const [i, f] of files.entries()) { line.textContent = `Fetching ${i + 1} of ${files.length}...`; got.push({ name: (f.group || 'other').toLowerCase() + '/' + f.name, data: await fetchFile(f) }); }
      saveBlob(zipOf(got), `${B.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${look.k}-kit.zip`);
      line.textContent = 'Downloaded. Unzip it and each folder is one app.';
      save('kit:got', look.k);
    } catch (e) { line.textContent = 'The download stopped. Try again in a minute.'; line.className = 'bp-msg bad'; }
    all.disabled = false;
  });
  s.append(all, line);
  const groups = [];
  files.forEach(f => { if (!groups.includes(f.group)) groups.push(f.group); });
  groups.forEach(g => {
    s.append(el('h3', null, g, { style: 'margin:22px 0 10px' }));
    const ul = el('ul', 'bp-grid');
    files.filter(f => f.group === g).forEach(f => {
      const li = el('li', 'bp-file');
      const th = el('div', 'th' + (f.clear ? ' clear' : ''));
      th.append(el('img', null, null, { src: thumbOf(f), alt: f.title, loading: 'lazy' }));
      const m = el('div', 'm');
      m.append(el('b', null, f.title), el('small', null, `${f.w} × ${f.h} · ${sizeText(f.bytes || 0)}${f.clear ? ' · clear background' : ''}`));
      const acts = el('div', 'bp-acts');
      const dl = el('button', null, 'Download', { type: 'button' });
      dl.addEventListener('click', async () => {
        dl.disabled = true; dl.textContent = 'Fetching...';
        try { saveBlob(new Blob([await fetchFile(f)], { type: f.type }), f.name); dl.textContent = 'Downloaded'; if (!v('kit:got')) save('kit:got', look.k); }
        catch (e) { dl.textContent = 'Try again'; }
        dl.disabled = false;
      });
      acts.append(dl, react('react:file:' + f.id, '❤', 'love'), react('react:file:' + f.id, '✕', 'no'));
      li.append(th, m, acts);
      ul.append(li);
    });
    s.append(ul);
  });
  return s;
}

function paintTalk() {
  const box = $('bp-talk');
  if (!box) return;
  box.textContent = '';
  const tops = ST.notes.filter(n => !String(n.about || '').startsWith('re:'));
  if (!tops.length) box.append(el('p', 'bp-sub', 'Nothing here yet. Say anything below.'));
  tops.forEach(n => {
    const c = el('div', 'bp-note');
    c.append(el('div', 'who', (n.uid === R.user().uid ? 'You' : n.name) + (n.createdAt ? ' · ' + new Date(ms(n.createdAt)).toLocaleString() : '')), el('p', null, n.text));
    ST.notes.filter(r => r.about === 're:' + n.id).forEach(r => {
      const rc = el('div', 'bp-note site');
      rc.append(el('div', 'who', 'Liberty Politics'), el('p', null, r.text));
      c.append(rc);
    });
    box.append(c);
  });
  const ta = el('textarea', null, null, { rows: '4', maxlength: '1500', placeholder: 'Write to us...', 'aria-label': 'Write to us' });
  const send = el('button', 'bp-btn main', 'Send', { type: 'button' });
  const line = msg('');
  send.addEventListener('click', async () => {
    if (ta.value.trim().length < 2) { line.textContent = 'Write a few words first.'; return; }
    send.disabled = true;
    await writeNote('', ta.value.trim(), line, () => { });
    send.disabled = false;
  });
  box.append(ta, send, line);
}

function paintNext() {
  const s = sec('next', 'What happens next', '');
  const ol = el('ul', 'bp-next');
  [['🎨', 'You pick a look and tell us what you love and what you do not. We redraw anything you cross out.'],
   ['📥', 'You download the kit and put the pictures and words on your accounts. Nothing goes on any account unless you put it there.'],
   ['💬', 'Anything else, write it in Talk to us. Every member of the team gets a page like this one.']].forEach(([e, t]) => {
    const li = el('li'); li.append(el('span', null, e, { 'aria-hidden': 'true' }), el('p', null, t, { style: 'margin:0' })); ol.append(li);
  });
  s.append(ol);
  return s;
}

/* ------------------------------------------------------------------ start */
function start() {
  if (!BOX) return;
  const st = D.createElement('style'); st.textContent = CSS; D.head.append(st);
  const go = () => {
    if (!window.LP || !window.LP.room) return false;
    R = window.LP.room; el = R.el; btn = R.btn;
    R.sub(() => draw());
    draw();
    return true;
  };
  if (!go()) { let n = 0; const t = setInterval(() => { if (go() || ++n > 200) clearInterval(t); }, 50); }
  window.addEventListener('hashchange', () => { const k = location.hash.slice(1); if (ST.pages.some(p => p.key === k) && k !== ST.key) openPage(k); });
}
window.LPBRAND = { state: () => ({ uid: ST.uid, key: ST.key, look: ST.look, pages: ST.pages.map(p => p.key), mine: Object.assign({}, ST.mine) }) };      // for brand-test.html
start();
