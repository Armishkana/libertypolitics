/* The team page (team/) of libertypolitics.com and iranuncensored.com: the brand's files to download, and one
   room where the team says what is missing and the site answers.

   One file for both sites, like community.js, which must be on the page before it: community.js hands this
   file Firebase, the signed-in reader, and the same words and faces the discussion uses (window.LP.room).
   Every sentence a person sees goes through tt(), the English as the key; the Iran site's Persian for each is in
   site-iu/build/community-strings.json, and its strings_check.py fails when one is missing.

   WHO GETS IN is decided by the rules of the database (firestore.rules, inRoom), never here: the team
   (mods/), an admin, and someone on the team with no public mark (quiet/). To everyone else the page is one
   line and a sign-in button, and every question this file asks is refused. The files are not on the site at
   all: they are kept in the database (teamkit/, a document a file, its bytes in pieces under it), put there
   by build/teamroom.py with the site's own key. Runbook: ../README.md, "The team page".

   A person's words reach the page through textContent, never as markup. */

const D = document, $ = id => D.getElementById(id);
const BOX = $('team');
let R = null, tt = s => s, el = null, btn = null;
const ST = { kit: null, brand: null, room: null, group: '', ground: 'dark', uid: '', busy: false, urls: [], lastRoom: 0 };

const CSS = `
#team .tr-h1{font-family:var(--display);font-weight:900;font-size:clamp(2.2rem,8vw,3.6rem);line-height:1;margin:0 0 10px;text-transform:uppercase;letter-spacing:.01em}
html[lang="fa"] #team .tr-h1{text-transform:none;letter-spacing:0;line-height:1.3}
#team .tr-lede{color:var(--dim);max-width:46rem;margin:0 0 18px;font-size:1.05rem;line-height:1.55}
#team .tr-sec{margin-top:34px;padding-top:22px;border-top:1px solid var(--line)}
#team .tr-sec>h2{font-family:var(--display);font-weight:800;font-size:1.7rem;line-height:1.15;margin:0 0 6px;text-transform:uppercase}
html[lang="fa"] #team .tr-sec>h2{text-transform:none;line-height:1.4}
#team .tr-sub{color:var(--dim);margin:0 0 14px;line-height:1.55;max-width:46rem}
#team .tr-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#team .tr-chip{font:inherit;font-weight:700;font-size:.95rem;min-height:44px;padding:8px 14px;border:1px solid var(--line);border-radius:999px;background:var(--panel);color:var(--ink);cursor:pointer}
#team .tr-chip[aria-pressed="true"]{background:var(--field);border-color:var(--field);color:var(--on-field)}
#team .tr-chip:focus-visible,#team .tr-card button:focus-visible,#team .tr-sw:focus-visible{outline:2px solid var(--field);outline-offset:2px}
#team .tr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-top:14px;padding:0;list-style:none}
#team .tr-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);display:flex;flex-direction:column;min-width:0}
#team .tr-pic{aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;background:var(--sunk);border-bottom:1px solid var(--line);overflow:hidden;border-radius:var(--r) var(--r) 0 0}
#team .tr-pic.white{background:#EDECE4}
#team .tr-pic.clear{background:repeating-conic-gradient(#2a2a28 0 25%,#1c1c1b 0 50%) 0 0/16px 16px}
#team .tr-pic.clear.white{background:repeating-conic-gradient(#d9d8d0 0 25%,#f2f1e6 0 50%) 0 0/16px 16px}
#team .tr-pic img{max-width:100%;max-height:100%;display:block}
#team .tr-meta{padding:10px 10px 4px;min-width:0}
#team .tr-meta b{display:block;font-size:.95rem;line-height:1.3;overflow-wrap:anywhere}
#team .tr-meta small{display:block;color:var(--dim);font-size:.8rem;margin-top:3px}
#team .tr-card button{font:inherit;font-weight:700;font-size:.9rem;min-height:44px;margin:8px 10px 10px;padding:8px 10px;border:1px solid var(--field);border-radius:var(--r);background:transparent;color:var(--field);cursor:pointer;margin-top:auto}
#team .tr-card button[disabled]{opacity:.6;cursor:progress}
#team .tr-sw{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}
#team .tr-sw button{font:inherit;font-weight:700;font-size:.9rem;min-height:44px;padding:8px 14px;border:0;background:var(--panel);color:var(--ink);cursor:pointer}
#team .tr-sw button[aria-pressed="true"]{background:var(--ink);color:var(--bg)}
#team .tr-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
#team .tr-panel{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:14px;min-width:0}
#team .tr-panel h3{font-size:1rem;margin:0 0 10px}
#team .tr-panel ul{margin:0;padding-inline-start:1.1rem;line-height:1.55}
#team .tr-panel li+li{margin-top:6px}
#team .tr-col{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:4px 0;border:0;background:none;color:inherit;font:inherit;text-align:start;cursor:pointer}
#team .tr-col i{flex:none;width:34px;height:34px;border-radius:50%;border:1px solid var(--line)}
#team .tr-col span{min-width:0}
#team .tr-col code{display:block;color:var(--dim);font-size:.85rem}
#team .tr-note{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:12px;margin-top:12px}
#team .tr-who{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.9rem}
#team .tr-who time{color:var(--dim)}
#team .tr-text{margin:8px 0 0;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
#team .tr-link{display:inline-block;margin-top:6px;overflow-wrap:anywhere}
#team .tr-reply{margin:10px 0 0;padding:10px 0 0;border-top:1px solid var(--line)}
#team .tr-reply.host{border-inline-start:3px solid var(--field);padding-inline-start:10px}
#team .tr-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
#team .tr-acts button{font:inherit;font-size:.9rem;font-weight:700;min-height:44px;padding:6px 12px;border:1px solid var(--line);border-radius:var(--r);background:none;color:var(--ink);cursor:pointer}
#team .tr-acts button.armed{border-color:var(--gd);color:var(--gd)}
#team .tr-form{display:grid;gap:10px;margin-top:12px}
#team .tr-form textarea,#team .tr-form input[type=url]{font:inherit;width:100%;padding:10px;border:1px solid var(--line);border-radius:var(--r);background:var(--sunk);color:var(--ink);min-height:44px}
#team .tr-form textarea{min-height:110px;resize:vertical;line-height:1.5}
#team .tr-form label{font-weight:700;font-size:.9rem;display:grid;gap:6px}
#team .tr-count{color:var(--dim);font-size:.8rem;font-weight:400}
#team .tag.st-done{color:var(--ga)}#team .tag.st-no{color:var(--gd)}#team .tag.st-his{color:var(--gc)}#team .tag.st-doing{color:var(--field)}#team .tag.st-open{color:var(--dim)}
#team .tr-empty{color:var(--dim);margin-top:12px}
#team .tr-msg{font-weight:600;min-height:1.4em;margin:8px 0 0}
#team .tr-msg.bad{color:var(--gd)}
`;

const KINDS = () => [
  ['missing', tt('Something is missing')],
  ['need', tt('I need another size or format')],
  ['wrong', tt('Something looks wrong')],
  ['idea', tt('An idea for the brand')],
  ['note', tt('Just a note')],
];
const STATES = () => ({ done: tt('Done'), no: tt('Not doing this'), his: tt('With the owner to decide'), doing: tt('Working on it'), open: tt('Waiting for an answer') });

function bytesOf(v) { return v && typeof v.toUint8Array === 'function' ? v.toUint8Array() : (v instanceof Uint8Array ? v : null); }
function sizeText(n) { return n >= 1048576 ? tt('{n} MB', { n: (Math.round(n / 104857.6) / 10) }) : tt('{n} KB', { n: Math.max(1, Math.round(n / 1024)) }); }
function msOf(t) { return t && typeof t.toMillis === 'function' ? t.toMillis() : 0; }
function line() { return el('p', 'tr-msg', '', { role: 'status', 'aria-live': 'polite' }); }
function say(l, text, bad) { l.textContent = text || ''; l.className = 'tr-msg' + (bad ? ' bad' : ''); }
function freeUrls() { ST.urls.forEach(u => { try { URL.revokeObjectURL(u); } catch (x) { } }); ST.urls = []; }

/* ------------------------------------------------------------------ one file out of the database, checked */
async function fetchFile(f) {
  const { F, db } = await R.fb();
  const snap = await R.within(60000, F.getDocs(F.query(F.collection(db, 'teamkit', f.id, 'parts'), F.limit(60))));
  const parts = snap.docs.map(d => [parseInt(d.id, 10), bytesOf(d.data().b)]).sort((a, b) => a[0] - b[0]);
  if (parts.length !== f.parts || parts.some((p, i) => p[0] !== i || !p[1])) throw { code: 'tr/broken' };
  const out = new Uint8Array(parts.reduce((n, p) => n + p[1].length, 0));
  let at = 0;
  for (const p of parts) { out.set(p[1], at); at += p[1].length; }
  if (out.length !== f.bytes) throw { code: 'tr/broken' };
  if (f.sha && window.crypto && crypto.subtle) {
    const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', out))).map(b => b.toString(16).padStart(2, '0')).join('');
    if (h !== f.sha) throw { code: 'tr/broken' };
  }
  return out;
}
function saveBlob(blob, name) {
  const u = URL.createObjectURL(blob), a = el('a', null, null, { href: u, download: name });
  a.style.display = 'none'; D.body.append(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 60000);
}
function fail(e) {
  const c = (e && e.code) || '';
  if (c === 'tr/broken') return tt('That file did not arrive whole. Try again in a minute; if it keeps happening, tell me in the room below.');
  if (c === 'permission-denied') return tt('This account is no longer on the team list, so the file was refused.');
  return tt('The file could not be fetched. Check your connection and try again.');
}

/* A zip with nothing squeezed (the pictures are already squeezed): header, bytes, and a list at the end. */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipOf(files) {
  const enc = new TextEncoder(), chunks = [], central = [];
  const now = new Date(), time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1), date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  let at = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
    h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    chunks.push(new Uint8Array(h.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true);
    c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, name.length, true);
    c.setUint32(42, at, true);
    central.push(new Uint8Array(c.buffer), name);
    at += 30 + name.length + f.data.length;
  }
  const size = central.reduce((n, p) => n + p.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, size, true); e.setUint32(16, at, true);
  return new Blob(chunks.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
}

/* ------------------------------------------------------------------ what is drawn for whom */
function gate(text, withSignIn) {
  freeUrls();
  BOX.textContent = '';
  BOX.append(el('h1', 'tr-h1', tt('Team page')), el('p', 'tr-lede', text, { id: 'team-gate' }));
  if (withSignIn) BOX.append(btn('btn btn-key', tt('Sign in'), () => window.LP.open('auth', {})));
}
async function draw() {
  if (!R) return;
  const u = R.user();
  if (!u) { ST.uid = ''; gate(BOX.getAttribute('data-gate') || tt('This page is for the team. Sign in with your team account to open it.'), true); return; }
  if (ST.uid === u.uid || ST.busy) return;
  ST.busy = true;
  try {
    const ok = await R.inRoom();
    if (!R.user() || R.user().uid !== u.uid) return;
    if (!ok) { ST.uid = ''; gate(tt('This account is not on the team list. If you are on the team, tell the person who brought you in which email you signed up with here.'), false); return; }
    ST.uid = u.uid;
    await open();
  } catch (e) {
    ST.uid = '';
    gate(tt('The team page could not be loaded. Check your connection and load the page again.'), false);
  } finally { ST.busy = false; }
}

async function open() {
  const { F, db } = await R.fb();
  const [kit, room] = await Promise.all([
    R.within(30000, F.getDocs(F.query(F.collection(db, 'teamkit'), F.limit(400)))),
    R.within(30000, F.getDocs(F.query(F.collection(db, 'teamroom'), F.limit(300)))),
  ]);
  ST.brand = null; ST.kit = [];
  kit.docs.forEach(d => {
    const v = d.data();
    if (d.id === '-brand') { try { ST.brand = JSON.parse(v.json); } catch (x) { ST.brand = null; } return; }
    if (v.kind === 'file') ST.kit.push(Object.assign({ id: d.id }, v));
  });
  ST.kit.sort((a, b) => (a.order || 0) - (b.order || 0));
  ST.room = room.docs.map(d => Object.assign({ id: d.id }, d.data()));
  ST.lastRoom = Date.now();
  paint();
}

function paint() {
  freeUrls();
  const B = ST.brand || {}, fa = R.lang === 'fa';
  BOX.textContent = '';
  BOX.append(el('h1', 'tr-h1', tt('Team page')));
  BOX.append(el('p', 'tr-lede', tt('The brand files for {brand}, ready to download, and a room where you tell me what is missing. Only the team can open this page.', { brand: (fa && B.native) || B.name || '' })));
  const jump = el('div', 'tr-row');
  jump.append(el('a', 'btn btn-key', tt('Download files'), { href: '#team-files' }), el('a', 'btn btn-line', tt('Ask for something'), { href: '#team-room' }));
  BOX.append(jump);
  BOX.append(basics(B, fa), files(B), roomSec());
}

/* The basics: how the logo is used, the colours (a tap copies the code), the fonts, the address. */
function basics(B, fa) {
  const sec = el('section', 'tr-sec', null, { id: 'team-basics' });
  sec.append(el('h2', null, tt('The basics')), el('p', 'tr-sub', tt('What every picture and video keeps the same.')));
  const cols = el('div', 'tr-cols');
  const rules = ((B.rules || {})[fa ? 'fa' : 'en'] || (B.rules || {}).en || []);
  if (rules.length) {
    const p = el('div', 'tr-panel'), ul = el('ul');
    rules.forEach(r => ul.append(el('li', null, r)));
    p.append(el('h3', null, tt('The logo')), ul); cols.append(p);
  }
  if ((B.colours || []).length) {
    const p = el('div', 'tr-panel'), l = line();
    p.append(el('h3', null, tt('Colours (tap one to copy its code)')));
    B.colours.forEach(c => {
      const b = el('button', 'tr-col', null, { type: 'button', 'aria-label': tt('Copy {hex}', { hex: c.hex }) }), sw = el('i'), t = el('span');
      sw.style.background = c.hex;
      t.append(D.createTextNode(c.name), el('code', null, c.hex, { dir: 'ltr' }));
      b.append(sw, t);
      b.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(c.hex); say(l, tt('Copied {hex}', { hex: c.hex })); }
        catch (x) { say(l, c.hex); }
      });
      p.append(b);
    });
    p.append(l); cols.append(p);
  }
  if ((B.fonts || []).length || B.address || B.tagline) {
    const p = el('div', 'tr-panel'), ul = el('ul');
    p.append(el('h3', null, tt('Fonts and words')));
    (B.fonts || []).forEach(f => {
      const li = el('li');
      li.append(el('a', null, f.name, { href: f.url, target: '_blank', rel: 'noopener', dir: 'ltr' }), D.createTextNode(': ' + ((fa && f.useFa) || f.use || '')));
      ul.append(li);
    });
    if (B.address) { const li = el('li'); li.append(D.createTextNode(tt('The address is always written like this:') + ' '), el('b', null, B.address, { dir: 'ltr' })); ul.append(li); }
    if (B.tagline) { const li = el('li'); li.append(D.createTextNode(tt('The line under the name:') + ' '), el('b', null, B.tagline, { dir: 'ltr' })); ul.append(li); }
    p.append(ul); cols.append(p);
  }
  sec.append(cols);
  return sec;
}

/* The files: pick a place (YouTube, StreamYard ...) and a background, download one or all of what is shown. */
function shownFiles() {
  return ST.kit.filter(f => (!ST.group || f.group === ST.group) && (f.ground === 'both' || f.ground === '' || f.ground === ST.ground));
}
function files(B) {
  const sec = el('section', 'tr-sec', null, { id: 'team-files' });
  sec.append(el('h2', null, tt('Download files')));
  if (!ST.kit.length) {
    sec.append(el('p', 'tr-empty', tt('The files are not here yet. Tell me in the room below what you need first.')));
    return sec;
  }
  const when = B.updated ? new Date(B.updated).getTime() : 0;
  sec.append(el('p', 'tr-sub', when ? tt('Last changed {when}. When a file changes, I say so in the room below.', { when: R.ago(when) }) : tt('Pick where the picture goes, then the background it sits on.')));
  const groups = [], labels = {};
  ST.kit.forEach(f => { if (groups.indexOf(f.group) < 0) { groups.push(f.group); labels[f.group] = (R.lang === 'fa' && f.groupFa) || f.group; } });
  const chips = el('div', 'tr-row', null, { role: 'group', 'aria-label': tt('Where the picture goes') });
  const grounds = el('div', 'tr-sw', null, { role: 'group', 'aria-label': tt('Background') });
  const grid = el('ul', 'tr-grid', null, { id: 'team-grid' }), all = btn('btn btn-key', '', () => allZip(all, msg)), msg = line();
  const redo = () => {
    Array.from(chips.children).forEach(c => c.setAttribute('aria-pressed', String(c.getAttribute('data-g') === ST.group)));
    Array.from(grounds.children).forEach(c => c.setAttribute('aria-pressed', String(c.getAttribute('data-gr') === ST.ground)));
    const list = shownFiles();
    grid.textContent = '';
    list.forEach(f => grid.append(card(f, msg)));
    all.textContent = tt('Download all {n} shown, as one zip ({size})', { n: list.length, size: sizeText(list.reduce((n, f) => n + f.bytes, 0)) });
    all.hidden = list.length < 2;
  };
  [['', tt('Everything')]].concat(groups.map(g => [g, labels[g]])).forEach(([g, label]) => {
    const c = el('button', 'tr-chip', label, { type: 'button', 'data-g': g });
    c.addEventListener('click', () => { ST.group = g; redo(); });
    chips.append(c);
  });
  [['dark', tt('Dark background')], ['white', tt('White background')]].forEach(([g, label]) => {
    const c = el('button', null, label, { type: 'button', 'data-gr': g });
    c.addEventListener('click', () => { ST.ground = g; redo(); });
    grounds.append(c);
  });
  all.id = 'team-zip';
  const top = el('div', 'tr-row'); top.append(grounds, all);
  sec.append(chips, el('div', null, null, { style: 'height:10px' }), top, msg, grid);
  redo();
  return sec;
}
function card(f, msg) {
  const li = el('li', 'tr-card'), pic = el('div', 'tr-pic' + (f.clear ? ' clear' : '') + (f.ground === 'white' ? ' white' : '')), meta = el('div', 'tr-meta');
  const th = bytesOf(f.thumb);
  if (th) {
    const u = URL.createObjectURL(new Blob([th], { type: f.thumbType || 'image/jpeg' })); ST.urls.push(u);
    pic.append(el('img', null, null, { src: u, alt: '', decoding: 'async' }));
  }
  const title = (R.lang === 'fa' && f.titleFa) || f.title || f.name;
  meta.append(el('b', null, title), el('small', null, [f.w && f.h ? f.w + ' × ' + f.h : '', sizeText(f.bytes)].filter(Boolean).join(' · '), { dir: 'ltr' }));
  const b = el('button', null, tt('Download'), { type: 'button', 'aria-label': tt('Download {name}', { name: title }), 'data-file': f.id });
  b.addEventListener('click', async () => {
    b.disabled = true; say(msg, tt('Fetching {name}.', { name: title }));
    try { saveBlob(new Blob([await fetchFile(f)], { type: f.type || 'application/octet-stream' }), f.name); say(msg, tt('Saved {name}. Look in your downloads.', { name: f.name })); }
    catch (e) { say(msg, fail(e), true); }
    b.disabled = false;
  });
  li.append(pic, meta, b);
  return li;
}
async function allZip(b, msg) {
  const list = shownFiles();
  if (!list.length || b.disabled) return;
  b.disabled = true;
  const got = [];
  try {
    let next = 0, done = 0;
    const work = async () => {
      while (next < list.length) {
        const f = list[next++];
        got.push({ name: f.name, data: await fetchFile(f) });
        done++; say(msg, tt('Fetching {n} of {all}.', { n: done, all: list.length }));
      }
    };
    await Promise.all([work(), work(), work()]);
    got.sort((a, c) => (a.name < c.name ? -1 : 1));
    const B = ST.brand || {};
    saveBlob(zipOf(got), (B.slug || 'brand') + '-files' + (ST.group ? '-' + ST.group.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '') + '-' + ST.ground + '.zip');
    say(msg, tt('Saved {n} files as one zip. Look in your downloads.', { n: got.length }));
  } catch (e) { say(msg, fail(e), true); }
  b.disabled = false;
}

/* ------------------------------------------------------------------ the room */
function roomSec() {
  const sec = el('section', 'tr-sec', null, { id: 'team-room' });
  sec.append(el('h2', null, tt('Ask for something')));
  sec.append(el('p', 'tr-sub', tt('A file that is missing, a size or format you need, something that looks wrong, or an idea for the brand. I read every note here, check it, and answer in this room: done, not doing it and why, or passed to the owner when the call is his. The whole team sees this room. Nobody else does.')));
  sec.append(noteForm(''));
  const list = el('div', null, null, { id: 'team-notes' });
  sec.append(list);
  paintRoom(list);
  const again = btn('btn btn-line', tt('Check for new answers'), async () => {
    again.disabled = true;
    try { await reloadRoom(); } catch (x) { }
    again.disabled = false;
  });
  again.id = 'team-again';
  const foot = el('div', 'tr-row', null, { style: 'margin-top:14px' }); foot.append(again);
  sec.append(foot);
  return sec;
}
async function reloadRoom() {
  const { F, db } = await R.fb();
  const room = await R.within(30000, F.getDocs(F.query(F.collection(db, 'teamroom'), F.limit(300))));
  ST.room = room.docs.map(d => Object.assign({ id: d.id }, d.data()));
  ST.lastRoom = Date.now();
  const list = $('team-notes');
  if (list) paintRoom(list);
}
function paintRoom(list) {
  list.textContent = '';
  const tops = ST.room.filter(n => !n.parent).sort((a, b) => msOf(b.createdAt) - msOf(a.createdAt));
  if (!tops.length) { list.append(el('p', 'tr-empty', tt('Nothing has been asked yet. The first note is yours.'))); return; }
  tops.forEach(n => list.append(noteCard(n)));
}
function who(n) {
  const w = el('div', 'tr-who'), ms = msOf(n.createdAt);
  w.append(R.face(n.name || '?', n.uid), el('b', null, n.name || '?'));
  if (ms) w.append(el('time', null, R.ago(ms), { datetime: new Date(ms).toISOString() }));
  return w;
}
function body(n) {
  const f = D.createDocumentFragment();
  f.append(el('p', 'tr-text', n.text || '', { dir: 'auto' }));
  if (typeof n.url === 'string' && /^https:\/\/[^\s<>"']{4,}$/.test(n.url)) f.append(el('a', 'tr-link', n.url, { href: n.url, target: '_blank', rel: 'noopener noreferrer nofollow', dir: 'ltr' }));
  return f;
}
function noteCard(n) {
  const S = STATES(), K = {}; KINDS().forEach(([k, t]) => { K[k] = t; });
  const box = el('article', 'tr-note', null, { id: 'n-' + n.id }), head = who(n);
  const st = ['done', 'no', 'his', 'doing'].indexOf(n.state) >= 0 ? n.state : (n.kind === 'note' ? '' : 'open');
  if (K[n.kind]) head.append(el('span', 'tag', K[n.kind]));
  if (st) head.append(el('span', 'tag st-' + st, S[st]));
  box.append(head, body(n));
  ST.room.filter(r => r.parent === n.id).sort((a, b) => msOf(a.createdAt) - msOf(b.createdAt)).forEach(r => {
    const d = el('div', 'tr-reply' + (r.host ? ' host' : ''));
    d.append(who(r), body(r));
    if (r.uid === ST.uid) d.append(acts(r, null));
    box.append(d);
  });
  box.append(acts(n, box));
  return box;
}
function acts(n, box) {
  const row = el('div', 'tr-acts');
  if (box) {
    const rb = btn(null, tt('Reply'), () => {
      if (box.querySelector('form')) { box.querySelector('form textarea').focus(); return; }
      const f = noteForm(n.id); box.append(f); f.querySelector('textarea').focus();
    });
    rb.setAttribute('data-act', 'reply'); row.append(rb);
  }
  if (n.uid === ST.uid) {
    /* Two taps, never a browser dialog: the first arms the button, the second does it. */
    let armed = false, timer = 0;
    const del = btn(null, tt('Take this back'), async () => {
      if (!armed) { armed = true; del.textContent = tt('Tap again to delete it'); del.classList.add('armed'); timer = setTimeout(() => { armed = false; del.textContent = tt('Take this back'); del.classList.remove('armed'); }, 5000); return; }
      clearTimeout(timer); del.disabled = true;
      try { const { F, db } = await R.fb(); await R.within(20000, F.deleteDoc(F.doc(db, 'teamroom', n.id))); await reloadRoom(); }
      catch (e) { del.disabled = false; armed = false; del.textContent = tt('It could not be deleted. Try again.'); }
    });
    del.setAttribute('data-act', 'back'); row.append(del);
  }
  return row;
}
function noteForm(parent) {
  const form = el('form', 'tr-form', null, { novalidate: '' }), msg = line();
  const ta = el('textarea', null, null, { maxlength: String(R.max), dir: 'auto', required: '', id: parent ? 'tr-r-' + parent : 'tr-new' });
  const count = el('span', 'tr-count', '');
  let kind = 'missing';
  if (!parent) {
    const pick = el('div', 'tr-row', null, { role: 'group', 'aria-label': tt('What kind of note is it?') });
    KINDS().forEach(([k, t]) => {
      const c = el('button', 'tr-chip', t, { type: 'button', 'aria-pressed': String(k === kind), 'data-kind': k });
      c.addEventListener('click', () => { kind = k; Array.from(pick.children).forEach(x => x.setAttribute('aria-pressed', String(x === c))); });
      pick.append(c);
    });
    form.append(pick);
  }
  const lab = el('label'); lab.append(D.createTextNode(parent ? tt('Your reply') : tt('What do you need? Say where it will be used and what size, if you know.')), ta, count);
  const link = el('input', null, null, { type: 'url', inputmode: 'url', maxlength: '400', placeholder: 'https://', autocapitalize: 'off', spellcheck: 'false', dir: 'ltr' });
  const ll = el('label'); ll.append(D.createTextNode(tt('A link to an example (optional)')), link);
  const go = el('button', 'btn btn-key', parent ? tt('Send reply') : tt('Send to the room'), { type: 'submit' });
  ta.addEventListener('input', () => { count.textContent = ta.value.length > R.max - 200 ? tt('{n} left', { n: R.max - ta.value.length }) : ''; });
  form.append(lab, ll, go, msg);
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const u = R.user(), text = ta.value.trim();
    let url = link.value.trim();
    if (!u) { say(msg, tt('You were signed out. Sign in again.'), true); return; }
    if (text.length < 3) { say(msg, tt('Write a few words first.'), true); ta.focus(); return; }
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    url = url.replace(/^http:/i, 'https:');
    if (url && !/^https:\/\/[^\s<>"']{4,400}$/.test(url)) { say(msg, tt('That link does not look right. Copy it from the address bar.'), true); link.focus(); return; }
    if (!u.displayName) { say(msg, tt('Choose the name shown with your notes first: tap your account at the top.'), true); return; }
    if (!u.emailVerified) { say(msg, tt('Confirm your email first: open the link I sent when you made the account.'), true); return; }
    go.disabled = true; say(msg, tt('Sending.'));
    try {
      const { F, db } = await R.fb();
      await R.within(20000, F.setDoc(F.doc(F.collection(db, 'teamroom')), { uid: u.uid, name: u.displayName, kind: parent ? 'note' : kind, text, url, parent, createdAt: F.serverTimestamp() }));
      ta.value = ''; link.value = ''; count.textContent = '';
      await reloadRoom();
      if (!parent) say(msg, tt('Sent. I answer here, usually the same day.'));
    } catch (e) {
      say(msg, e && e.code === 'permission-denied' ? tt('The note was refused. Load the page again; if it keeps happening, your account may be off the team list.') : tt('The note could not be sent. Check your connection and try again.'), true);
    }
    go.disabled = false;
  });
  return form;
}

/* ------------------------------------------------------------------ start */
function start() {
  if (!BOX) return;
  const LP = window.LP;
  if (!LP || !LP.room || LP.off) return;      // no discussion script, or a build with no real project: the line the build printed stays
  R = LP.room; tt = R.tt; el = R.el; btn = R.btn;
  D.head.append(el('style', null, CSS));
  R.sub(() => { draw(); });
  /* A signed-in reader is known from this device before Firebase has loaded; ask for it either way, so a
     stranger gets the sign-in button and the team gets the page. */
  R.fb().then(draw, () => { if (!R.user()) gate(BOX.getAttribute('data-gate') || '', true); });
  D.addEventListener('visibilitychange', () => {
    if (!D.hidden && ST.uid && Date.now() - ST.lastRoom > 120000) reloadRoom().catch(() => { });
  });
  window.LPTEAM = { state: () => ({ uid: ST.uid, files: (ST.kit || []).length, notes: (ST.room || []).length }), fetchFile: id => fetchFile(ST.kit.find(f => f.id === id)), zipOf, crc32, reload: reloadRoom };
}
if (window.LP) start(); else D.addEventListener('DOMContentLoaded', start);
