/* THE UPRISING SIMULATOR'S NOW VIEW (libertypolitics.com uprising/, iranuncensored.com <lang>/uprising/; 1 November 2026).
   The page's default. Armin, 1 November 2026: "They all need to start with the current situation. Even if I don't want to
   play the game, the default needs to be that I could see where everything stands right now ... with live updates ...
   kind of like a breaking news live update visualization ... if anything major happens ... showing that something is
   happening now. It needs to show which parts of the maps are hot right now ... in the most beautiful, elegant design."

   WHAT IT SHOWS. The map of Iran (drawn on the server by uprising.py now_svg, so it paints before this script runs), every
   city in the register coloured by its live unrest; heat where the reports are; the nationwide level; Happening now; the
   breaking banner; a city's card (its live reports, then where it stands from the register: its anger, its security, its
   past uprisings, all dated and sourced). "Enter the city" opens its 3D board: uprising.js, loaded only then.

   THE DATA (build/uprising.py NOW_SRC, LIVE_URL; the contract is the LIVE FEED builder's). The snapshot from the build rides
   in the page (DATA.now0); the page then fetches the live branch on raw GitHub (cache: no-store) and the same-origin copy
   (assets/now/uprising.json), keeps whichever has the newer "at", and polls every 60 seconds while the tab is visible. It
   says how old the data is; past three hours it shows the time plainly instead of pretending it is live. A plain GET of
   public data: no cookies, no referrer, nothing of the reader's sent anywhere (Iran Uncensored's promise on this page).

   THE ADDRESS. ?city=, ?s=, ?mode=, ?adv=, ?tab=, ?cmp=, ?res=, ?play=, ?c= or ?view=sim open Simulate directly (an inline
   line in the section sets data-view before the first paint). Back to Now clears the scenario from the address.
   Never classList.toggle(name, state) (uprising.py stops the build): tog(). No browser dialogs. Nothing animates in. */
const D = document, W = window;
const box = D.getElementById('uprising'), src = D.getElementById('up-data');
if (box && src) { try { boot(); } catch (e) { console.error('Uprising Simulator, the Now view:', e); } }

function boot() {
  const DATA = JSON.parse(src.textContent);
  const FA = DATA.lang === 'fa', IU = DATA.site === 'iu';
  const TR = DATA.S || {};
  const tr = s => (Object.prototype.hasOwnProperty.call(TR, s) ? TR[s] : s);
  const tf = (s, o) => tr(s).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null ? o[k] : m));
  const N_ = s => (FA ? String(s).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'.charAt(+d)).replace(/%/g, '٪') : String(s));
  const fmt = n => { n = Math.round(n || 0); return FA ? n.toLocaleString('fa-IR') : n.toLocaleString('en-US'); };
  const big = n => { n = Math.round(n || 0); if (n >= 1e6) return N_((Math.round(n / 1e5) / 10) + (FA ? ' میلیون' : 'M')); if (n >= 1e4) return N_(Math.round(n / 1e3) + (FA ? ' هزار' : 'k')); return fmt(n); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r) => (r || D).querySelector(s), $$ = (s, r) => Array.from((r || D).querySelectorAll(s));
  const tog = (el, c, on) => { if (el) { if (on) el.classList.add(c); else el.classList.remove(c); } };
  const ext = (href, txt) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
  const BP = 760;      // the one phone breakpoint (uprising.css: max-width 759.98px; uprising.js PHONE)
  const PHONE = () => W.innerWidth < BP;
  const CITIES = DATA.cities || [];
  const byId = {}; for (const c of CITIES) byId[c.id] = c;
  const stage = D.getElementById('up-stage'), nowEl = D.getElementById('up-now'), svg = D.getElementById('up-nsvg');
  const side = D.getElementById('up-nside'), card = D.getElementById('up-ncard'), brk = D.getElementById('up-nbrk');
  const qs = new URLSearchParams(location.search);

  // ================================================================== the stage fills the first screen
  function size() {
    const topY = stage.getBoundingClientRect().top + (W.scrollY || 0), want = Math.max(PHONE() ? 520 : 600, Math.round(W.innerHeight - topY));
    if (!D.documentElement.classList.contains('lp-stream') && Math.abs(stage.offsetHeight - want) > 2) stage.style.height = want + 'px';
    scaleMap();
  }

  // ================================================================== Now and Simulate
  const DEEP = ['city', 's', 'c', 'mode', 'adv', 'tab', 'cmp', 'res', 'play', 'pl'];
  let view = box.dataset.view === 'sim' ? 'sim' : 'now', simP = null, simCity = null;
  function setView(v, keepAddr) {
    view = v; box.dataset.view = v;
    $$('#up-view [data-view]').forEach(b => { const on = b.dataset.view === v; tog(b, 'on', on); b.setAttribute('aria-selected', String(on)); });
    if (v === 'now') {
      if (!keepAddr) { try { const u = new URL(location.href); for (const k of DEEP.concat(['view', 'at'])) u.searchParams.delete(k); history.replaceState(null, '', u.pathname + (u.search === '?' ? '' : u.search) + u.hash); } catch (_) { } }
      scaleMap(); poll();
    }
    W.dispatchEvent(new Event('resize'));
  }
  function bestCity() {      // where Simulate opens when no city was picked: the hottest city whose streets are in
    let best = null, bv = -1;
    for (const c of CITIES) { if (c.ready === false) continue; const L = live(c.id), v = L ? (L.n || 0) + (L.d1 || 0) * 0.01 : 0; if (v > bv) { bv = v; best = c.id; } }
    return bv > 0 ? best : (byId.tehran && byId.tehran.ready !== false ? 'tehran' : best);
  }
  function enterSim(cid) {
    const id = cid || simCity || (qs.get('city') && byId[qs.get('city')] ? qs.get('city') : null) || bestCity();
    setView('sim', true); closeCard();
    if (!simP) {
      simCity = id;
      const bootEl = D.getElementById('up-boot'); tog(bootEl, 'off', false);
      const t = D.getElementById('up-boot-t'); if (t && byId[id]) t.textContent = tf('Loading the streets of {c}...', { c: FA ? byId[id].fa : byId[id].n });
      // the plan room (uprising-plan.js, 3 November 2026) is the city view; the 3D street board only when the address asks (?view=3d)
      const want3d = qs.get('view') === '3d' || ['s', 'mode', 'adv', 'cmp', 'res', 'play'].some(k => qs.has(k));
      simP = (want3d ? import('./uprising.js').then(m => m.start({ city: id })) : import('./uprising-plan.js').then(m => m.start({ city: id }))).catch(err => { console.error(err); if (t) t.textContent = tr('Something went wrong loading the simulator. Reload the page to try again.'); });
    } else if (id && id !== simCity) {
      simCity = id; simP.then(() => { if (W.UPPLAN && W.UPPLAN.switchCity) W.UPPLAN.switchCity(id); else if (W.UPRPAGE && W.UPRPAGE.switchCity) W.UPRPAGE.switchCity(id); });
    }
  }
  $$('#up-view [data-view]').forEach(b => b.addEventListener('click', () => { if (b.dataset.view === 'sim') enterSim(); else setView('now'); }));
  W.UPRNOW = { enterSim, setView, get view() { return view; }, get data() { return NOW; }, get src() { return NOWsrc; }, card: openCard, poll, cityState: id => stateOf(id) };

  // ================================================================== the map
  const P = DATA.proj;
  const merc = la => Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, la)) * Math.PI / 360));
  const proj = (la, lo) => (P ? [(lo - P.W) * Math.PI / 180 * P.k, (P.mN - merc(la)) * P.k] : null);
  const VB = svg ? svg.viewBox.baseVal : null;
  let SC = 1;      // screen pixels per map unit
  // the stream view zooms the tool's words (build/stream.js --lps-z); the map's names follow
  const LZ = () => (D.documentElement.classList.contains('lp-stream') ? (parseFloat(getComputedStyle(D.documentElement).getPropertyValue('--lps-z')) || 1) : 1);
  const G = {};      // the city groups
  if (svg) for (const g of $$('.up-nc', svg)) G[g.dataset.c] = g;
  function scaleMap() {
    if (!svg || !VB) return;
    const r = svg.getBoundingClientRect(); if (!r.width) return;
    SC = Math.min(r.width / VB.width, r.height / VB.height) || 1;
    svg.style.setProperty('--k', (LZ() / SC).toFixed(4));
    for (const id in G) { const g = G[id], rr = +g.dataset.r, hit = g.querySelector('.up-nc-h'); hit.setAttribute('r', Math.max(rr * 1.8, 18 / SC).toFixed(1)); }
    placeNames();
  }
  // names never pile up: the hottest and the biggest cities are named first; a name that would cover another is dropped
  // (the same rule as the 3D board's places and the Conflict Simulator's map)
  function placeNames() {
    if (!svg) return;
    const fs = 12.5 * LZ() / SC, kept = [], order = CITIES.filter(c => G[c.id]).slice().sort((a, b) => (heatOf(b.id) - heatOf(a.id)) || ((b.pop || 0) - (a.pop || 0)));
    const maxN = PHONE() ? 9 : 22; let n = 0;
    for (const c2 of CITIES) if (c2.xy && G[c2.id]) { const r2 = +G[c2.id].dataset.r; kept.push([c2.xy[0] - r2, c2.xy[1] - r2, r2 * 2, r2 * 2]); }      // never over a dot
    for (const c of order) {
      const g = G[c.id], t = g.querySelector('.up-nc-t'), xy = c.xy; if (!t || !xy) continue;
      const nm = FA ? c.fa : c.n, w = nm.length * fs * (FA ? 0.5 : 0.56) + 6 / SC, h = fs * 1.25, rr = +g.dataset.r;
      const spots = [[0, -rr - 4 / SC, 'middle'], [rr + 5 / SC, fs * 0.35, 'start'], [-rr - 5 / SC, fs * 0.35, 'end'], [0, rr + fs + 2 / SC, 'middle']];
      let ok = null;
      const sel = g.classList.contains('sel'), want = sel || (n < maxN && (heatOf(c.id) > 0.05 || (c.pop || 0) > (PHONE() ? 1.4e6 : 4e5)));
      if (want) for (const [dx, dy, an] of spots) {
        const x0 = xy[0] + dx - (an === 'middle' ? w / 2 : an === 'end' ? w : 0), y0 = xy[1] + dy - h * 0.8, bx = [x0, y0, w, h];
        if (kept.some(k => bx[0] < k[0] + k[2] && bx[0] + bx[2] > k[0] && bx[1] < k[1] + k[3] && bx[1] + bx[3] > k[1])) continue;
        if (x0 < VB.x || x0 + w > VB.x + VB.width || y0 < VB.y) continue;
        ok = [dx, dy, an, bx]; break;
      }
      if (!ok) { t.style.display = 'none'; continue; }
      t.style.display = ''; t.setAttribute('x', ok[0].toFixed(1)); t.setAttribute('y', ok[1].toFixed(1)); t.setAttribute('text-anchor', FA ? ({ start: 'end', end: 'start', middle: 'middle' })[ok[2]] : ok[2]);
      if (FA) t.setAttribute('direction', 'rtl');
      t.style.fontSize = fs.toFixed(2) + 'px'; kept.push(ok[3]); n++;
    }
  }
  // tap: the nearest city to the finger, within 28px, so dense places (Tehran, Karaj, Qom) never steal each other's taps
  if (svg) {
    svg.addEventListener('click', ev => {
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const m = svg.getScreenCTM(); if (!m) return;
      const p = pt.matrixTransform(m.inverse()); let best = null, bd = (30 / SC) ** 2;
      for (const c of CITIES) { if (!c.xy) continue; const d = (c.xy[0] - p.x) ** 2 + (c.xy[1] - p.y) ** 2; if (d < bd) { bd = d; best = c.id; } }
      if (best) openCard(best); else closeCard();
    });
    svg.addEventListener('keydown', ev => { const g = ev.target.closest && ev.target.closest('.up-nc'); if (g && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); openCard(g.dataset.c); } });
    svg.addEventListener('pointermove', ev => { if (PHONE() || !ev.target.closest) return; const g = ev.target.closest('.up-nc'); tip(g ? g.dataset.c : null, ev); });
    svg.addEventListener('pointerleave', () => tip(null));
  }
  const tipEl = D.createElement('div'); tipEl.className = 'up-ntip'; tipEl.hidden = true; nowEl.appendChild(tipEl);
  function tip(id, ev) {
    if (!id) { tipEl.hidden = true; return; }
    const c = byId[id], s = stateOf(id), L = live(id), r = nowEl.getBoundingClientRect();
    tipEl.innerHTML = `<b>${esc(FA ? c.fa : c.n)}</b><span class="q-${s.q}">${esc(tr(s.word))}${L && L.d1 ? ' · ' + tf('{n} reports today', { n: N_(L.d1) }) : ''}</span>`;
    tipEl.hidden = false; tipEl.style.left = Math.min(r.width - 220, ev.clientX - r.left + 14) + 'px'; tipEl.style.top = (ev.clientY - r.top + 14) + 'px';
  }

  // ================================================================== the live data
  let NOW = DATA.now0 && DATA.now0.v === 1 ? DATA.now0 : null, NOWsrc = NOW ? 'build' : null, fetched = false;
  const seen = { brk: null, first: 0, init: false };
  try { const s0 = JSON.parse(sessionStorage.getItem('up-now-seen') || 'null'); if (s0) { seen.brk = s0.brk; seen.first = s0.first || 0; seen.init = true; } } catch (_) { }
  const live = id => (NOW && NOW.cities && NOW.cities[id]) || null;
  const heatOf = id => { const L = live(id); return L ? Math.max(L.n || 0, Math.min(1, (L.d1 || 0) / 12)) : 0; };
  const CRACK_KM = 45;
  function nearHot(id, kinds) {      // the hot items within a short drive of a city (the feed names provinces as well as cities)
    const c = byId[id]; if (!c || !c.ll || !NOW) return [];
    const [la, lo] = c.ll; const km = (a, b) => Math.hypot((a[0] - b[0]) * 111, (a[1] - b[1]) * 111 * Math.cos(la * Math.PI / 180));
    return (NOW.hot || []).filter(h => h.ll && (!kinds || kinds.includes(h.k)) && km(h.ll, [la, lo]) < CRACK_KM);
  }
  function stateOf(id) {
    const L = live(id), n = heatOf(id), crack = nearHot(id, ['crackdown']).some(h => (h.n || 0) > 0.15);
    const q = !L || ((L.d7 || 0) === 0 && n < 0.03) ? 0 : n < 0.25 ? 1 : n < 0.6 ? 2 : 3;
    return { q, n, crack, now: !!(L && (L.d1 || 0) > 0), word: crack && q >= 1 ? 'Crackdown' : ['Quiet', 'Reports this week', 'Protests', 'Heavy unrest'][q] };
  }
  const ago = iso => {
    const t = Date.parse(iso); if (!t) return '';
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return tr('just now'); if (m < 60) return tf('{n} min ago', { n: N_(m) });
    const h = Math.round(m / 60); if (h < 48) return tf('{n} h ago', { n: N_(h) });
    return tf('{n} days ago', { n: N_(Math.round(h / 24)) });
  };
  let TZF = null; try { TZF = new Intl.DateTimeFormat(FA ? 'fa-IR' : 'en-GB', { timeZone: 'Asia/Tehran', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); } catch (_) { }
  const tehran = iso => { const t = Date.parse(iso); return t && TZF ? TZF.format(new Date(t)) : (iso || ''); };
  const STALE_H = 3;
  const stale = () => !NOW || !Date.parse(NOW.at) || (Date.now() - Date.parse(NOW.at)) > STALE_H * 3600e3;
  async function getJ(u, o) {
    try { const r = await fetch(u, o); if (!r.ok) return null; const j = await r.json(); return j && j.v === 1 && Date.parse(j.at) ? j : null; } catch (_) { return null; }
  }
  let polling = false;
  async function poll() {
    if (polling || D.visibilityState === 'hidden') return; polling = true;
    const o = { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' };
    const [a, b] = await Promise.all([DATA.nowLive ? getJ(DATA.nowLive, Object.assign({ mode: 'cors' }, o)) : null, DATA.nowAsset ? getJ(DATA.nowAsset, o) : null]);
    polling = false; fetched = true;
    let best = NOW, bs = NOWsrc;
    for (const [j, s] of [[a, 'live'], [b, 'site']]) if (j && (!best || Date.parse(j.at) > Date.parse(best.at))) { best = j; bs = s; }
    const changed = best !== NOW; NOW = best; NOWsrc = bs;
    if (changed || !drawn) draw(); else drawAge();
  }
  setInterval(() => { if (view === 'now') poll(); }, 60000);
  D.addEventListener('visibilitychange', () => { if (D.visibilityState === 'visible' && view === 'now') poll(); });
  setInterval(drawAge, 30000);

  // ================================================================== drawing it
  let drawn = false;
  const LV_C = { Calm: '#5fb39a', Watch: '#f4c430', Elevated: '#f59a2e', High: '#ff6a3d', Critical: '#ff3b4f' };
  const KIND = { protest: ['Protest', 'p'], crackdown: ['Crackdown', 'c'], strike: ['Strike', 's'], news: ['News', 'n'], clash: ['Clash', 'c'], fire: ['Fire', 'p'], air: ['Strike from the air', 'c'], naval: ['At sea', 'n'] };
  function draw() {
    drawn = true;
    drawAge(); drawLevel(); drawTicker(); drawBreaking(); drawCities(); drawHeat(); placeNames();
    if (card && !card.hidden && card.dataset.c) openCard(card.dataset.c, true);
    announce();
  }
  function drawAge() {
    const el = D.getElementById('up-nage'), lv = D.getElementById('up-nlive'); if (!el) return;
    if (!NOW) { el.textContent = fetched ? tr('The live feed is not running yet. The map shows every city in the simulator.') : tr('Connecting to the live feed...'); tog(lv, 'off', true); return; }
    const st = stale(); tog(lv, 'off', st); tog(nowEl, 'stale', st);
    el.textContent = st ? tf('Last update {t}, Tehran time. Not live.', { t: tehran(NOW.at) }) : tf('Updated {a}', { a: ago(NOW.at) });
    el.title = tehran(NOW.at);
  }
  function drawLevel() {
    const el = D.getElementById('up-nlvl'); if (!el) return;
    const L = NOW && NOW.level;
    if (!L) { el.innerHTML = `<div class="up-gauge"><svg viewBox="0 0 120 70" aria-hidden="true"><path class="tr" d="M10 62a50 50 0 0 1 100 0"/></svg><div class="up-gv"><b>${N_('–')}</b><span>${tr('Nationwide level')}</span></div></div>`; return; }
    const n = Math.max(0, Math.min(100, +L.n || 0)), col = LV_C[L.word] || '#f4c430', d = (L.prev != null) ? n - L.prev : 0;
    const a = Math.PI * (1 - n / 100), x = 60 + 50 * Math.cos(a), y = 62 - 50 * Math.sin(a);
    el.innerHTML = `<div class="up-gauge" style="--c:${col}"><svg viewBox="0 0 120 70" aria-hidden="true"><path class="tr" d="M10 62a50 50 0 0 1 100 0"/>${n > 0 ? `<path class="fl" d="M10 62A50 50 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}"/>` : ''}${[25, 50, 75].map(t => { const b = Math.PI * (1 - t / 100); return `<path class="tk" d="M${(60 + 44 * Math.cos(b)).toFixed(1)} ${(62 - 44 * Math.sin(b)).toFixed(1)}L${(60 + 54 * Math.cos(b)).toFixed(1)} ${(62 - 54 * Math.sin(b)).toFixed(1)}"/>`; }).join('')}<circle class="nd" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.5"/></svg>
      <div class="up-gv"><b>${N_(Math.round(n))}</b><em>${esc(FA ? (L.fa || tr(L.word)) : L.word)}</em>${Math.abs(d) >= 1 ? `<i class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'} ${N_(Math.round(Math.abs(d)))}</i>` : ''}<span>${tr('Nationwide level of unrest, out of 100')}</span></div></div>`;
  }
  function headline(it) { return FA && it.fa ? it.fa : it.t; }
  // a headline's own language, whatever the page's: the feed carries Persian sources as they wrote it
  const PERS = /[؀-ۿ]/;
  const langOf = t => (PERS.test(t || '') ? (FA ? '' : ' lang="fa" dir="rtl"') : (FA ? ' lang="en" dir="ltr"' : ''));
  function drawTicker() {
    const ol = D.getElementById('up-ntick'); if (!ol) return;
    const T = (NOW && NOW.ticker) || [];
    if (!T.length) { ol.innerHTML = `<li class="up-nt0">${NOW ? tr('No new reports in the last hours.') : tr('Live reports appear here as soon as the feed runs.')}</li>`; return; }
    ol.innerHTML = T.slice(0, PHONE() ? 6 : 9).map((it, i) => {
      const k = KIND[it.k] || KIND.news, h = headline(it), cid = cityAt(it);
      return `<li class="k-${k[1]}"${cid ? ` data-c="${cid}"` : ''}><span class="up-ntm"><i></i>${esc(tr(k[0]))}${it.place ? ' · ' + esc(FA && it.placeFa ? it.placeFa : it.place) : ''}<time datetime="${esc(it.d)}">${esc(ago(it.d))}</time></span>
        <span class="up-nth"${langOf(h)}>${it.u ? ext(it.u, esc(h)) : esc(h)}</span>${it.src ? `<em>${esc(it.src)}</em>` : ''}${cid ? `<button type="button" class="up-ntgo" data-c="${cid}" aria-label="${esc(tf('Open {c}', { c: FA ? byId[cid].fa : byId[cid].n }))}">›</button>` : ''}</li>`;
    }).join('');
    $$('.up-ntgo', ol).forEach(b => b.addEventListener('click', () => openCard(b.dataset.c)));
  }
  function cityAt(it) {      // the register city a report is about: by name, else the nearest within a short drive
    if (!it) return null;
    const nm = String(it.place || '').toLowerCase();
    for (const c of CITIES) if (nm && (nm === c.n.toLowerCase() || nm.startsWith(c.n.toLowerCase()) || (it.placeFa && it.placeFa === c.fa))) return c.id;
    if (!it.ll) return null;
    let best = null, bd = 30 * 30;
    for (const c of CITIES) { if (!c.ll) continue; const d = ((c.ll[0] - it.ll[0]) * 111) ** 2 + ((c.ll[1] - it.ll[1]) * 92) ** 2; if (d < bd) { bd = d; best = c.id; } }
    return best;
  }
  function drawBreaking() {
    const B = NOW && NOW.breaking;
    if (!brk) return;
    if (!B || stale()) { brk.hidden = true; tog(box, 'brk', false); return; }
    const cid = cityAt(B), h = FA && B.fa ? B.fa : B.t;
    brk.innerHTML = `<b><i></i>${tr('Breaking')}</b><span${langOf(h)}>${esc(h)}</span><em>${B.place ? esc(B.place) + ' · ' : ''}${esc(ago(B.since))}${B.src ? ' · ' + (B.u ? ext(B.u, esc(B.src)) : esc(B.src)) : ''}</em>${cid ? `<button type="button" class="up-nbgo" data-c="${cid}">${esc(tf('See {c}', { c: FA ? byId[cid].fa : byId[cid].n }))}</button>` : ''}`;
    brk.hidden = false; tog(box, 'brk', true);
    const b = $('.up-nbgo', brk); if (b) b.addEventListener('click', () => openCard(b.dataset.c));
  }
  function drawCities() {
    for (const c of CITIES) {
      const g = G[c.id]; if (!g) continue;
      const s = stateOf(c.id);
      for (const q of [0, 1, 2, 3]) tog(g, 'q' + q, s.q === q);
      tog(g, 'crack', s.crack); tog(g, 'live', s.now); tog(g, 'soon', c.ready === false);
      g.setAttribute('aria-label', (FA ? c.fa : c.n) + ', ' + tr(s.word));
    }
  }
  function drawHeat() {
    const H = D.getElementById('up-nheat'); if (!H) return;
    const items = ((NOW && NOW.hot) || []).filter(h => h.ll && (h.n || 0) > 0.04 && !stale()).slice(0, 40);
    H.innerHTML = items.map(h => {
      const p = proj(h.ll[0], h.ll[1]); if (!p) return '';
      const r = 18 + (h.n || 0) * 64, fresh = Date.now() - Date.parse(h.last) < 6 * 3600e3;
      return `<circle class="up-nh${h.k === 'crackdown' ? ' c' : h.k === 'strike' ? ' s' : ''}${fresh ? ' fresh' : ''}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r.toFixed(1)}" style="--o:${(0.5 + 0.5 * (h.n || 0)).toFixed(2)}"/>`;
    }).join('');
  }
  // something new since the last look: the city glows and a line says so (a pulse on a marker; nothing is hidden)
  function announce() {
    if (!NOW) return;
    const B = NOW.breaking, newestFirst = Math.max(0, ...((NOW.hot || []).map(h => Date.parse(h.first) || 0)));
    const isNew = seen.init && ((B && B.since && B.since !== seen.brk) || newestFirst > seen.first);
    if (isNew) {
      const fresh = (NOW.hot || []).filter(h => (Date.parse(h.first) || 0) > seen.first).slice(0, 4);
      for (const h of fresh) { const id = cityAt(h); if (id && G[id]) { tog(G[id], 'new', true); setTimeout(() => tog(G[id], 'new', false), 12000); } }
      const h0 = fresh[0] || B; if (h0) toast(tf('New: {p}', { p: (FA && h0.placeFa) || h0.place || tr('a new report') }));
    }
    seen.brk = B ? B.since : null; seen.first = Math.max(seen.first, newestFirst); seen.init = true;
    try { sessionStorage.setItem('up-now-seen', JSON.stringify({ brk: seen.brk, first: seen.first })); } catch (_) { }
  }
  function toast(t) { const el = D.createElement('div'); el.className = 'up-ntoast'; el.setAttribute('role', 'status'); el.textContent = t; nowEl.appendChild(el); setTimeout(() => el.remove(), 5000); }
  function drawSources() {
    const el = D.getElementById('up-nsrc'); if (!el) return;
    const S = (NOW && NOW.sources) || [];
    el.innerHTML = (S.length ? tr('Sources') + ': ' + S.map(s => s.u ? ext(s.u, esc(s.n)) : esc(s.n)).join(' · ') + '. ' : '') + esc(tr(NOW && NOW.note ? 'Heat shows where reports of protests, strikes and crackdowns cluster in the last days. It counts reports, not people, and a blackout hides what it cannot see.' : 'Colours come from the live feed: reports of protests, strikes and crackdowns in each city.'));
  }

  // ================================================================== a city's card
  const SECW = { irgc_hq: 'IRGC compounds', basij: 'Basij bases', police_hq: 'police commands', special_police: 'special police bases', police_station: 'police stations', artesh: 'army bases', intelligence: 'intelligence offices' };
  function short(t, n) { t = String(t || ''); if (t.length <= n) return esc(t); const cut = t.slice(0, n).replace(/\s+\S*$/, ''); return `${esc(cut)}… <details class="up-nmore"><summary>${tr('More')}</summary>${esc(t.slice(cut.length))}</details>`; }
  function openCard(id, keep) {
    const c = byId[id]; if (!c || !card) return;
    for (const k in G) tog(G[k], 'sel', k === id);
    const L = live(id), s = stateOf(id), hot = nearHot(id).sort((a, b) => Date.parse(b.last) - Date.parse(a.last));
    const lastT = (L && L.t) ? { t: L.t, u: L.u, d: L.last } : hot[0] ? { t: hot[0].t, u: hot[0].u, d: hot[0].last, src: hot[0].src } : null;
    const hist = (c.h || []).slice().reverse().slice(0, 4);
    const secK = c.secK || {}, secL = Object.keys(SECW).filter(k => secK[k]).map(k => `<li><b>${N_(secK[k])}</b> ${esc(tr(SECW[k]))}</li>`).join('');
    const thin = (c.bldN || 0) < 150;
    card.dataset.c = id;
    card.innerHTML = `<button type="button" class="up-x" id="up-ncx" aria-label="${tr('Close')}">✕</button>
      <h2 id="up-ncard-h">${esc(FA ? c.fa : c.n)} <span>${esc(FA ? c.n : c.fa)}</span></h2>
      <p class="up-nc-sub">${esc(c.prov || '')}${c.pop ? ' · ' + tf('{n} people', { n: big(c.pop) }) : ''}</p>
      <div class="up-nst q-${s.q}${s.crack ? ' crack' : ''}"><b><i></i>${esc(tr(s.word))}</b><span>${L ? tf('{a} reports in 24 hours · {b} in 7 days', { a: N_(L.d1 || 0), b: N_(L.d7 || 0) }) + (L.last ? ' · ' + tf('last {t}', { t: ago(L.last) }) : '') : NOW ? tr('No reports from here in the live feed.') : tr('The live feed is not running yet.')}</span></div>
      ${lastT ? `<div class="up-nlast"><p${langOf(lastT.t)}>${lastT.u ? ext(lastT.u, esc(lastT.t)) : esc(lastT.t)}</p><span>${lastT.src ? esc(lastT.src) + ' · ' : ''}${lastT.d ? `<time>${esc(ago(lastT.d))}</time>` : ''}</span></div>` : ''}
      <div class="up-ncols">
        <div><h3>${tr('Anger')}</h3><div class="up-nbar" style="--g:${c.g == null ? 0.5 : c.g}"><i></i><b>${N_(Math.round((c.g == null ? 0.5 : c.g) * 100))}</b></div>${!FA && c.gw ? `<p>${short(c.gw, 150)}</p>` : `<p>${tr('How angry the city is, from its record in past uprisings and today’s hardship (the register).')}</p>`}</div>
        <div><h3>${tr('The regime here')}</h3>${secL ? `<ul class="up-nsec">${secL}</ul><p class="up-ntiny">${tr('Mapped in OpenStreetMap; more stand where they are not mapped.')}</p>` : `<p>${tr('OpenStreetMap maps none of its security places.')}</p>`}${!FA && c.sec ? `<p>${short(c.sec, 140)}</p>` : ''}</div>
      </div>
      ${hist.length ? `<h3>${tr('In past uprisings')}</h3><ul class="up-nhist">${hist.map(x => `<li><b>${esc(N_(x.u))}</b>${!FA && x.w ? `<span>${short(x.w, 110)}</span>` : ''}${x.d ? `<em>${esc(typeof x.d === 'number' ? tf('{n} killed', { n: fmt(x.d) }) : (FA ? '' : x.d))}</em>` : ''}</li>`).join('')}</ul>` : ''}
      ${thin ? `<p class="up-nthin">${tf('OpenStreetMap maps only {n} buildings here, so the 3D city fills its real streets with typical blocks.', { n: N_(c.bldN || 0) })}</p>` : ''}
      <div class="up-ngo">${c.ready === false ? `<button type="button" class="up-play" disabled>${tr('Its streets are being mapped')}</button>` : `<button type="button" class="up-play" id="up-nenter"><i>▶</i><span>${esc(tf('Enter {c}', { c: FA ? c.fa : c.n }))}</span></button>`}</div>
      <p class="up-src">${tr('The register')}: ${(c.src || []).slice(0, 2).map((u, i) => ext(u, tr('source') + ' ' + N_(i + 1))).join(' · ')}${NOW ? ' · ' + tf('Live feed, {t}', { t: tehran(NOW.at) }) : ''}</p>`;
    card.hidden = false; tog(nowEl, 'carded', true);
    $('#up-ncx', card).addEventListener('click', closeCard);
    const en = D.getElementById('up-nenter'); if (en) en.addEventListener('click', () => enterSim(id));
    const hint = D.getElementById('up-nhint'); if (hint) hint.hidden = true;
    placeNames();
    if (!keep) { card.scrollTop = 0; if (!PHONE()) { const b = D.getElementById('up-nenter'); if (b) b.focus({ preventScroll: true }); } }
  }
  function closeCard() { if (!card) return; card.hidden = true; delete card.dataset.c; tog(nowEl, 'carded', false); for (const k in G) tog(G[k], 'sel', false); placeNames(); }
  D.addEventListener('keydown', ev => { if (ev.key === 'Escape' && view === 'now' && card && !card.hidden) closeCard(); });

  // ================================================================== the first visit: three steps, once
  function guide() {
    let k = 0; try { if (localStorage.getItem('up-guide') === '1') return; } catch (_) { return; }
    const S3 = [['This is Iran right now', 'Every dot is a city. Its colour is its unrest in the live reports; heat marks where things are happening.'],
      ['Tap a city', 'Its card says what is happening there and where it stands. Enter it to see its real streets in 3D.'],
      ['Find the plan that wins', 'In the city, pick an advisor or command it yourself. The simulator runs your plan many times: the odds, the cost on all sides, and a better plan.']];
    const el = D.createElement('div'); el.className = 'up-guide'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', tr('How it works'));
    const show = () => { el.innerHTML = `<span class="up-gn">${tf('{a} of {b}', { a: N_(k + 1), b: N_(3) })}</span><b>${tr(S3[k][0])}</b><p>${tr(S3[k][1])}</p><div><button type="button" class="up-sec" data-g="x">${tr('Skip')}</button><button type="button" class="up-play" data-g="n">${tr(k < 2 ? 'Next' : 'Got it')}</button></div>`; };
    const done = () => { el.remove(); try { localStorage.setItem('up-guide', '1'); } catch (_) { } };
    el.addEventListener('click', ev => { const b = ev.target.closest('[data-g]'); if (!b) return; if (b.dataset.g === 'x' || k >= 2) done(); else { k++; show(); } });
    show(); nowEl.appendChild(el);
  }

  // ================================================================== the stream view on Iran Uncensored (build/stream.js
  // prints Liberty Politics' mark; this page is the one place on that site that carries it)
  if (IU && 'MutationObserver' in W) {
    new MutationObserver(() => { const m = $('.lps-mark'); if (m && !m.dataset.iu) { m.dataset.iu = '1'; m.innerHTML = 'iranuncensored<b>.com</b>'; } }).observe(D.body, { childList: true });
  }

  // ================================================================== start
  W.addEventListener('resize', size);
  if (W.ResizeObserver && svg) new ResizeObserver(() => scaleMap()).observe(svg);
  size();
  draw(); drawSources();
  if (!NOW) drawAge();
  const deep = DEEP.some(k => qs.has(k)) || qs.get('view') === 'sim' || qs.get('view') === '3d';
  if (deep) enterSim(qs.get('city') && byId[qs.get('city')] ? qs.get('city') : null);
  else { setView('now', true); guide(); }
  poll().then(drawSources);
}
