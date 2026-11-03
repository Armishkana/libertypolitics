/* THE UPRISING SIMULATOR'S PLAN ROOM (libertypolitics.com uprising/, iranuncensored.com <lang>/uprising/; 3 November 2026).
   The city view since 3 November 2026. The 3D street board (uprising.js) stays one tap away (?view=3d).

   Armin, 3 November 2026, on the 3D board: he cannot understand what is happening when things move; it slows his computer;
   too few strategy options. So this view is a flat map drawn on one canvas, and a plan you build yourself:
     1. THE PLAN. Groups, each with a start on the real streets, a size and a wave (who leaves first); stops on the way;
        a meeting point (groups with the same meeting point merge there); squares to hold; places to avoid; the hour of the
        night; the internet. Routes follow the city's main streets (OpenStreetMap, the board's own roads).
     2. THE REGIME. data/uprising/response.json: who comes (local police, Basij, plain-clothes, special units, the IRGC,
        reported Iraqi militias only if switched on), when, how many, and the ladder from watching to machine guns with the
        triggers for each step, all from how 2009, November 2019, 2022 and January 2026 unfolded, with sources.
     3. PLAYBACK. One typical run, five simulated minutes a step: the clock, the event feed in plain words, a legend,
        pause and step. Then the odds over many runs, a score, and a debrief that says why.
     4. COMPARE. The site's own plans, run the same way, beside yours.
   Analytical and historical only: forces enter from a compass side, never from a named base; nothing here is current.

   PERFORMANCE (the reason this exists): one canvas; the streets are stroked once into an offscreen picture and only redrawn
   when the view settles; while dragging or playing the picture is copied and the few moving things drawn on top; frames are
   drawn only when something changed (no loop while idle). No DOM per moving thing.

   NOTHING OVERLAPS (3 November 2026, from the Conflict Simulator session: assets "mingled with each other ... so ugly"):
   every crowd, force, flag and name is placed by one function, place(), which never lets two screen boxes meet: it slides an
   item round its anchor with a leader line, merges a force into its neighbour's count, or drops a name. UPPLAN.check() plays a
   whole run at several zooms and fails on any two boxes that meet (deploy path: build/phone-test.html, uprising_plan_check.mjs).

   Words: every sentence through tr()/tf(); uprising.py --check fails on any without Persian (site-iu/data/uprising-fa.json).
   Never classList.toggle(name, state): tog(). No browser dialogs. Nothing animates in. */
const D = document, W = window;

export async function start(opt) {
  const box = D.getElementById('uprising');
  const DATA = JSON.parse(D.getElementById('up-data').textContent);
  const FA = DATA.lang === 'fa', IU = DATA.site === 'iu';
  const TR = DATA.S || {};
  const tr = s => (Object.prototype.hasOwnProperty.call(TR, s) ? TR[s] : s);
  const tf = (s, o) => tr(s).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null ? o[k] : m));
  const N_ = s => (FA ? String(s).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'.charAt(+d)).replace(/%/g, '٪') : String(s));
  const fmt = n => { n = Math.round(n || 0); return FA ? n.toLocaleString('fa-IR') : n.toLocaleString('en-US'); };
  const big = n => { n = Math.round(n || 0); if (n >= 1e6) return N_((Math.round(n / 1e5) / 10) + (FA ? ' میلیون' : 'M')); if (n >= 1e4) return N_(Math.round(n / 1e3) + (FA ? ' هزار' : 'k')); if (n >= 1000) return N_((Math.round(n / 100) / 10) + (FA ? ' هزار' : 'k')); return fmt(n); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tog = (el, c, on) => { if (el) { if (on) el.classList.add(c); else el.classList.remove(c); } };
  const $ = (s, r) => (r || D).querySelector(s), $$ = (s, r) => Array.from((r || D).querySelectorAll(s));
  const ext = (href, txt) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
  const PHONE = () => W.innerWidth < 760;
  const CITIES = (DATA.cities || []).filter(c => c.ready !== false);
  const byId = {}; for (const c of CITIES) byId[c.id] = c;
  const cname = c => (c ? (FA ? c.fa : c.n) : '');
  const stage = D.getElementById('up-stage');
  const bootEl = D.getElementById('up-boot'), bootT = D.getElementById('up-boot-t');

  // ================================================================== loading
  const RESP = await fetch(DATA.asset + 'response.json').then(r => r.json());
  const UNITS = RESP.units, LAD = RESP.ladder, TRIG = {}; for (const t of RESP.triggers) TRIG[t.id] = t;
  const U = {}; for (const u of UNITS) U[u.id] = u;
  let city = null, B = null, G = null;
  const boards = {};
  async function loadCity(id) {
    if (!boards[id]) boards[id] = fetch(DATA.asset + 'b/' + id + '-plan.json').then(r => { if (!r.ok) throw new Error('no plan board for ' + id); return r.json(); });
    return boards[id];
  }

  // ================================================================== the street graph (the board's main roads, t0 to t2)
  function decode(a) { const p = []; let x = 0, y = 0; for (let i = 0; i + 1 < a.length; i += 2) { if (!i) { x = a[0]; y = a[1]; } else { x += a[i]; y += a[i + 1]; } p.push(x, y); } return p; }
  function graph(Bd) {
    const key = new Map(), X = [], Y = [], adj = [];
    const node = (x, y) => { const k = x * 100003 + y; let n = key.get(k); if (n === undefined) { n = X.length; key.set(k, n); X.push(x); Y.push(y); adj.push([]); } return n; };
    const COST = [1.15, 0.9, 1.0];      // motorways cost a little more to march on, avenues a little less (est): columns converge on avenues
    const lines = [[], [], []];
    for (let t = 0; t < 3; t++) for (const a of (Bd.roads['t' + t] || [])) {
      const p = decode(a); lines[t].push(p);
      let prev = node(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) { const n = node(p[i], p[i + 1]); if (n !== prev) { const d = Math.hypot(X[n] - X[prev], Y[n] - Y[prev]) * COST[t]; adj[prev].push(n, d); adj[n].push(prev, d); } prev = n; }
    }
    // keep the largest connected part for routing; other pieces are drawn but never snapped to
    const comp = new Int32Array(X.length).fill(-1); let best = -1, bestN = 0, c = 0;
    for (let s = 0; s < X.length; s++) {
      if (comp[s] >= 0) continue; let n = 0; const st = [s]; comp[s] = c;
      while (st.length) { const v = st.pop(); n++; const a = adj[v]; for (let i = 0; i < a.length; i += 2) if (comp[a[i]] < 0) { comp[a[i]] = c; st.push(a[i]); } }
      if (n > bestN) { bestN = n; best = c; } c++;
    }
    const CELL = 400, grid = new Map();
    for (let n = 0; n < X.length; n++) { if (comp[n] !== best) continue; const k = Math.floor(X[n] / CELL) * 7919 + Math.floor(Y[n] / CELL); let g = grid.get(k); if (!g) grid.set(k, g = []); g.push(n); }
    function snap(x, y) {
      let bn = -1, bd = 1e18; const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
      for (let r = 0; r < 12 && (bn < 0 || r < 2); r++) for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
        const g = grid.get((cx + i) * 7919 + cy + j); if (!g) continue;
        for (const n of g) { const d = (X[n] - x) ** 2 + (Y[n] - y) ** 2; if (d < bd) { bd = d; bn = n; } }
      }
      return bn;
    }
    // shortest path (A*), avoid circles cost twenty times as much; returns a flat [x,y,...] and its length in metres
    function route(a, b, avoid) {
      const N = X.length, g = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
      const pen = n => { for (const v of avoid) if ((X[n] - v[0]) ** 2 + (Y[n] - v[1]) ** 2 < v[2] * v[2]) return 20; return 1; };
      const h = n => Math.hypot(X[n] - X[b], Y[n] - Y[b]) * 0.9;
      const heap = [], push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
      const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { const a = 2 * i + 1, c2 = a + 1; let m = i; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (c2 < heap.length && heap[c2][0] < heap[m][0]) m = c2; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
      g[a] = 0; push(a, h(a)); let it = 0;
      while (heap.length && it++ < 400000) {
        const [, v] = pop(); if (done[v]) continue; done[v] = 1; if (v === b) break;
        const ad = adj[v];
        for (let i = 0; i < ad.length; i += 2) { const w = ad[i], nd = g[v] + ad[i + 1] * (avoid.length ? pen(w) : 1); if (nd < g[w]) { g[w] = nd; prev[w] = v; push(w, nd + h(w)); } }
      }
      if (!done[b]) return { p: [X[a], Y[a], X[b], Y[b]], len: Math.hypot(X[a] - X[b], Y[a] - Y[b]) };
      const out = []; for (let v = b; v >= 0; v = prev[v]) out.push(Y[v], X[v]); out.reverse();
      let len = 0; for (let i = 2; i < out.length; i += 2) len += Math.hypot(out[i] - out[i - 2], out[i + 1] - out[i - 1]);
      return { p: out, len };
    }
    // the streets as tiles of 2.5 km, each one Path2D with its box: drawBase strokes only the tiles on screen
    const TS = 2500, P2 = lines.map(L => {
      const tiles = new Map();
      for (const l of L) {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < l.length; i += 2) { x0 = Math.min(x0, l[i]); x1 = Math.max(x1, l[i]); y0 = Math.min(y0, l[i + 1]); y1 = Math.max(y1, l[i + 1]); }
        const k = Math.floor((x0 + x1) / 2 / TS) * 7919 + Math.floor((y0 + y1) / 2 / TS);
        let t = tiles.get(k); if (!t) tiles.set(k, t = { p: new Path2D(), b: [1e9, 1e9, -1e9, -1e9] });
        t.p.moveTo(l[0], l[1]); for (let i = 2; i < l.length; i += 2) t.p.lineTo(l[i], l[i + 1]);
        t.b = [Math.min(t.b[0], x0), Math.min(t.b[1], y0), Math.max(t.b[2], x1), Math.max(t.b[3], y1)];
      }
      return [...tiles.values()];
    });
    return { X, Y, snap, route, P2, n: X.length };
  }

  // ================================================================== places, sides of the city
  const KIND = { square: 1, sq2: 1, uni: 1, bazaar: 1, gov: 1, tv: 1, mosalla: 1, stadium: 1, terminal: 1, shrine: 1, hospital: 0, prison: 1, airport: 1, garrison: 0, police: 1, industry: 0, power: 0 };
  const REDK = { gov: 1, tv: 1, police: 1, garrison: 1, prison: 1 };      // red lines: the trigger 'redline' (response.json)
  // OpenStreetMap's names carry stray zero-width non-joiners (U+200C) before a space or at an end, where they join nothing; drawing
  // "دانشگاه‌ تهران" with one cost a single 250 ms frame on the Persian Tehran board (3 Nov 2026), so they are dropped once, here
  const zw = t => (typeof t === 'string' && t.indexOf('\u200c') >= 0 ? t.replace(/\u200c+(?=\s|$)|(^|\s)\u200c+/g, '$1') : t);
  const siteName = s => zw(FA ? (s.n || s.genFa || s.en) : (s.k === 'airport' && s.gen ? s.gen : (s.en || s.gen || s.n)));      // OSM's English name for an airport is often another language's (Flughafen)
  const DIRS = ['east', 'north-east', 'north', 'north-west', 'west', 'south-west', 'south', 'south-east'];
  const dirOf = (dx, dy) => DIRS[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
  const DIRW = { east: tr('east'), 'north-east': tr('north-east'), north: tr('north'), 'north-west': tr('north-west'), west: tr('west'), 'south-west': tr('south-west'), south: tr('south'), 'south-east': tr('south-east') };
  const dirWord = d => DIRW[d] || d;
  const uname = u => (FA ? u.fa : u.n), lname = l => (FA ? l.fa : l.n), uicon = u => (FA && u.iconFa ? u.iconFa : u.icon);
  function placeAt(x, y, bare) {      // a place in words: 'at Azadi Square', 'near Azadi Square', 'in east Tehran' (bare: without at/in)
    let best = null, bd = 1e18;
    for (const s of B.sites) { if (!KIND[s.k] || !(s.en || s.n)) continue; const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
    if (best && bd < 350) return bare ? siteName(best) : tf('at {p}', { p: siteName(best) });
    if (best && bd < 1800) return tf('near {p}', { p: siteName(best) });
    const d = tf('{d} {c}', { d: dirWord(dirOf(x - CX, y - CY)), c: cname(city) });
    return bare ? d : tf('in {p}', { p: d });
  }
  const andList = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(FA ? '، ' : ', ') + (FA ? ' و ' : ' and ') + a[a.length - 1]);
  let CX = 0, CY = 0, R = 15000, BASES = { FARAJA: [], Basij: [], IRGC: [] };
  function sideOf(x, y, aff) {      // the compass side a force comes from: the mean of the three nearest of its kind's places (never named)
    const L = BASES[aff] && BASES[aff].length ? BASES[aff] : BASES.FARAJA;
    if (!L.length) return dirOf(x - CX, y - CY);
    const near = L.map(b => [Math.hypot(b[0] - x, b[1] - y), b]).sort((a, b) => a[0] - b[0]).slice(0, 3);
    let dx = 0, dy = 0; for (const [d, b] of near) { dx += (b[0] - x) / (d || 1); dy += (b[1] - y) / (d || 1); }
    return Math.hypot(dx, dy) < 0.2 ? dirOf(x - CX, y - CY) : dirOf(dx, dy);
  }
  const AFF = { police: 'FARAJA', special: 'FARAJA', basij: 'Basij', plain: 'Basij', irgc: 'IRGC', foreign: 'IRGC' };
  let MEMO = new Map();
  const memo = (tag, x, y, fn) => { const k = tag + (Math.round(x / 120) * 4099 + Math.round(y / 120)); let v = MEMO.get(k); if (v === undefined) { v = fn(); MEMO.set(k, v); } return v; };
  const isEdge = (x, y) => Math.hypot(x - CX, y - CY) > R * 0.62;
  const redNear = (x, y) => memo('r', x, y, () => redNear0(x, y));
  const redNear0 = (x, y) => { let best = null, bd = TRIG.redline.m; for (const s of B.sites) if (REDK[s.k]) { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } } for (const s of (B.sec || [])) if (s.k === 'irgc_hq' || s.k === 'police_hq') { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = { k: 'base', en: null }; } } return best; };
  const popAt = (x, y) => memo('p', x, y, () => popAt0(x, y));
  const popAt0 = (x, y) => { const H = B.hex; let bi = 0, bd = 1e18; for (let i = 0; i < H.x.length; i++) { const d = (H.x[i] - x) ** 2 + (H.y[i] - y) ** 2; if (d < bd) { bd = d; bi = i; } } return H.p[bi] || 0; };

  // ================================================================== the plans
  const GL = FA ? ['الف', 'ب', 'پ', 'ت', 'ث', 'ج'] : ['A', 'B', 'C', 'D', 'E', 'F'];
  const MAXG = 6;
  let plan = null;
  const clone = o => JSON.parse(JSON.stringify(o));
  function siteXY(i) { const s = B.sites[i]; return [s.x, s.y]; }
  function pick(kinds) { return B.sites.map((s, i) => [s, i]).filter(([s]) => kinds.includes(s.k)).map(([, i]) => i); }
  function popular(n, minR, maxR) {      // the busiest districts at a distance from the centre: start points for presets
    const H = B.hex, idx = H.x.map((_, i) => i).filter(i => { const d = Math.hypot(H.x[i] - CX, H.y[i] - CY); return d >= minR && d <= maxR; });
    idx.sort((a, b) => H.p[b] - H.p[a]); const out = [];
    for (const i of idx) { if (out.every(j => Math.hypot(H.x[i] - H.x[j], H.y[i] - H.y[j]) > 2600)) out.push(i); if (out.length >= n) break; }
    return out.map(i => [H.x[i], H.y[i]]);
  }
  function presets() {
    const main = pick(['square'])[0] ?? pick(['sq2'])[0] ?? pick(['gov'])[0] ?? 0;
    const sq = pick(['sq2', 'square']), baz = pick(['bazaar']), uni = pick(['uni']);
    const mid = popular(4, R * 0.18, R * 0.55), ring = popular(6, R * 0.2, R * 0.75), edge = popular(4, R * 0.55, R * 1.0);
    const fs = Math.pow(Math.min(1, city.pop / RESP.scale.capital), RESP.scale.crowds);      // the site's crowds scale with the city
    const G_ = (s, to, n, wave, via) => ({ s, to, n: Math.max(500, Math.round(n * fs / 500) * 500), wave: wave || 0, via: via || [] });
    const P = [];
    P.push({ id: 'march', n: tr('One big march'), why: tr('2009: one column on the main avenue to the biggest square, hundreds of thousands strong.'), src: 'https://iranhumanrights.org/?p=2523',
      hour: 16, net: 'regime', foreign: false, hold: [main], avoid: [], groups: mid.slice(0, 3).map(s => G_(s, main, 15000, 0)) });
    P.push({ id: 'many', n: tr('Every neighbourhood at once'), why: tr('2022: small crowds in many districts at once, each holding its own corner, hard to crush everywhere.'), src: 'https://al-monitor.com/originals/2022/10/bold-tactics-have-kept-iran-protests-going',
      hour: 20, net: 'regime', foreign: false, hold: [], avoid: [], groups: ring.slice(0, 6).map(s => { const t = nearestSite(s, ['sq2', 'square', 'uni', 'bazaar']); return G_(s, t, 3000, 0); }) });
    if (baz.length || uni.length) {
      const tgt = sq.length > 1 ? sq[1] : main;
      const starts = [...baz.slice(0, 2).map(siteXY), ...uni.slice(0, 2).map(siteXY)].slice(0, 4);
      P.push({ id: 'converge', n: tr('Bazaar and campus converge'), why: tr('December 2025: the bazaar shut and marched; students came out of the campuses; both met in a square.'), src: 'https://www.iranintl.com/en/202512302678',
        hour: 15, net: 'regime', foreign: false, hold: [tgt], avoid: [], groups: starts.map((s, i) => G_(s, tgt, i < 2 ? 8000 : 4000, i < 2 ? 0 : 30)) });
    }
    P.push({ id: 'edges', n: tr('Night on the edges'), why: tr('November 2019: the poorer edges of the city and the highways, at night. The regime cut the internet and shot most there.'), src: 'https://www.amnesty.org/en/latest/news/2020/11/iran-internet-deliberately-shut-down-during-november-2019-killings/',
      hour: 21, net: 'regime', foreign: false, hold: [], avoid: [], groups: edge.slice(0, 4).map(s => G_(s, nearestSite(s, ['sq2', 'square', 'terminal', 'industry', 'bazaar', 'uni']), 6000, 0)) });
    if (sq.length >= 2) {
      const a = sq[0], b2 = sq[1];
      P.push({ id: 'call', n: tr('The 20:00 call, two squares'), why: tr('January 2026: one call, everyone out at 20:00 towards two squares. It was the biggest night, and the bloodiest.'), src: 'https://www.amnesty.org/en/latest/news/2026/01/internet-shutdown-in-iran-hides-violations-in-escalating-protests/',
        hour: 20, net: 'regime', foreign: false, hold: [a, b2], avoid: [], groups: ring.slice(0, 5).map((s, i) => G_(s, i % 2 ? b2 : a, 12000, 0)) });
    }
    return P.filter(p => p.groups.length);
  }
  function nearestSite(xy, kinds) { let bi = 0, bd = 1e18; B.sites.forEach((s, i) => { if (!kinds.includes(s.k)) return; const d = Math.hypot(s.x - xy[0], s.y - xy[1]); if (d < bd) { bd = d; bi = i; } }); return bi; }
  function blank() { const P = presets(); return clone(P[0]); }

  // the plan in the address (?pl=): the city, then the plan, base64url. A link a reader chooses to send; nothing is saved anywhere.
  const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const dec = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
  function toAddr() { try { const u = new URL(location.href); u.searchParams.set('city', city.id); u.searchParams.set('pl', enc(slim(plan))); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (_) { } }
  const slim = p => ({ h: p.hour, i: p.net === 'off' ? 1 : 0, f: p.foreign ? 1 : 0, o: p.hold, a: p.avoid.map(v => v.map(Math.round)), g: p.groups.map(g => [g.s.map(Math.round), g.to, g.n, g.wave, g.via.map(v => v.map(Math.round))]) });
  const fat = s => ({ id: 'mine', hour: s.h, net: s.i ? 'off' : 'regime', foreign: !!s.f, hold: s.o || [], avoid: s.a || [], groups: (s.g || []).slice(0, MAXG).map(g => ({ s: g[0], to: g[1], n: g[2], wave: g[3] || 0, via: g[4] || [] })) });

  // ================================================================== THE MODEL: one night, five minutes a step
  const TICK = 5;
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const lerpTab = (tab, h) => { h = ((h % 24) + 24) % 24; for (let i = 1; i < tab.length; i++) if (h <= tab[i][0]) { const [a, va] = tab[i - 1], [b, vb] = tab[i]; return va + (vb - va) * (h - a) / (b - a); } return tab[tab.length - 1][1]; };
  const along = (p, d) => { for (let i = 2; i < p.length; i += 2) { const s = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]); if (d <= s) { const f = s ? d / s : 0; return [p[i - 2] + (p[i] - p[i - 2]) * f, p[i - 1] + (p[i + 1] - p[i - 1]) * f]; } d -= s; } return [p[p.length - 2], p[p.length - 1]]; };
  function routes(P) {      // each group's path on the streets: start, its stops, its meeting point
    return P.groups.map(g => {
      const pts = [g.s, ...g.via, siteXY(g.to)];
      let p = [], len = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = G.snap(pts[i - 1][0], pts[i - 1][1]), b = G.snap(pts[i][0], pts[i][1]);
        const r = G.route(a, b, P.avoid); p = p.length ? p.concat(r.p.slice(2)) : r.p; len += r.len;
      }
      let direct = 0; for (let i = 1; i < pts.length; i++) direct += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      return { p, len, direct };
    });
  }
  function simulate(P, RT, seed, keep) {
    const r = rng(seed), rr = (a, b) => a + (b - a) * r();
    const C = RESP.crowd, SC = RESP.scale, capital = city.id === 'tehran';
    const popK = SC.capital * Math.pow(city.pop / SC.capital, SC.forces) / 1e5;      // forces scale less than the people (est, response.json scale)
    const hours = Math.min(14, Math.max(6, (30 - P.hour) % 24 || 24));
    const T = Math.round(hours * 60 / TICK);
    const pool = {}; for (const u of UNITS) { if (u.optional && !P.foreign) continue; if (u.onlyBig && city.pop < 1e6) continue; pool[u.id] = popK * rr(u.per100k[0], u.per100k[1]) * (capital && u.capital ? u.capital : 1); }
    const arrive = {}; for (const u of UNITS) arrive[u.id] = rr(u.arriveMin[0], u.arriveMin[1]);
    let net = P.net === 'off' ? 'off' : 'on', netAt = net === 'off' ? 0 : null;
    const turnout = lerpTab(C.evening, P.hour);
    const crowds = P.groups.map((g, i) => ({ i, ids: [i], name: GL[i], st: 'wait', x: g.s[0], y: g.s[1], d: 0, n: 0, n0: g.n * turnout * rr(0.6, 1.3), res: rr(0.65, 0.85),
      formAt: g.wave + rr(0, 10), form: null, r: 0, rAt: 0, holdT: 0, f: {}, seen: {}, regroup: 0, to: g.to, route: RT[i], edge: isEdge(g.s[0], g.s[1]) }));
    const ev = [], frames = [], held = {}; for (const h of P.hold) held[h] = 0;
    let dead = 0, hurt = 0, jailed = 0, peak = 0, topR = 0, merges = 0, firstArr = {}, lastArr = {};
    const clock = m => { const t = (P.hour * 60 + m) % 1440; return N_(String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0')); };
    const say = keep ? (m, k, txt, x, y, key) => ev.push({ m, k, t: clock(m), txt: txt(), x, y, key: !!key }) : () => 0;
    const live = () => crowds.filter(c => c.st === 'walk' || c.st === 'hold');
    for (let s = 0; s <= T; s++) {
      const m = s * TICK, hNow = (P.hour + m / 60) % 24, night = hNow < 6 || hNow >= 22;
      // the internet
      const L = live(), tot = L.reduce((a, c) => a + c.n, 0);
      if (net === 'on' && (L.length >= RESP.internet.minCrowds || tot >= RESP.internet.minPeople)) {
        const p = RESP.internet.cutChancePerHour * TICK / 60 * (L.some(c => c.r >= 4) ? 1.6 : 1) * (hNow >= 18 || hNow < 2 ? 1.3 : 0.7);
        if (r() < p) { net = 'off'; netAt = m; say(m, 'net', () => tf('The internet is cut across {c}. Fewer people hear where to go, and what happens next is hidden.', { c: cname(city) }), CX, CY, true); }
      }
      for (const c of crowds) {
        if (c.st === 'wait' && m >= c.formAt) {
          c.st = 'walk'; c.form = m; c.n = c.n0;
          say(m, 'gather', () => tf('Group {g} gathers {p}: about {n} people.', { g: c.name, p: placeAt(c.x, c.y), n: big(c.n) }), c.x, c.y, s === 0 || c.i === 0);
          if (c.route.len > 50) say(m, 'go', () => tf('Group {g} sets off for {p}, {k} km on the streets.', { g: c.name, p: siteName(B.sites[c.to]), k: N_((c.route.len / 1000).toFixed(1)) }), c.x, c.y);
        }
        if (c.st === 'gone' && c.regroup && m >= c.regroup) {      // 2022: scattered crowds re-form nearby a while later
          c.regroup = 0; c.st = 'hold'; c.n = Math.max(300, c.nLost * rr(0.2, 0.4)); c.res = rr(0.45, 0.6); c.r = Math.max(0, c.r - 2); c.holdT = 0; c.x += rr(-500, 500); c.y += rr(-500, 500); c.seen = {}; c.form = m;
          say(m, 'regroup', () => tf('Part of Group {g} regroups {p}: about {n} people.', { g: c.name, p: placeAt(c.x, c.y), n: big(c.n) }), c.x, c.y);
        }
        if (c.st !== 'walk' && c.st !== 'hold') continue;
        // move
        if (c.st === 'walk') {
          const v = (c.n > 20000 ? C.walkBig : C.walk) * 60 * TICK * (c.r >= 2 ? 0.7 : 1);
          c.d = Math.min(c.route.len, c.d + v); [c.x, c.y] = along(c.route.p, c.d);
          if (c.d >= c.route.len - 1) {
            c.st = 'hold'; const tgt = B.sites[c.to];
            firstArr[c.to] = firstArr[c.to] ?? m; lastArr[c.to] = m;
            const host = crowds.find(o => o !== c && o.st === 'hold' && o.to === c.to && Math.hypot(o.x - c.x, o.y - c.y) < 300);
            if (host) {
              const before = host.ids.map(i => GL[i]);
              host.n += c.n; host.res = Math.min(0.95, Math.max(host.res, c.res) + 0.08); host.ids.push(...c.ids); c.st = 'merged'; merges++;
              say(m, 'merge', () => tf('Groups {a} merge at {p}: about {n} people together.', { a: andList(before.concat([c.name])), p: siteName(tgt), n: big(host.n) }), c.x, c.y, true);
              continue;
            }
            say(m, 'arrive', () => tf('Group {g} reaches {p} and stays: about {n} people.', { g: c.name, p: siteName(tgt), n: big(c.n) }), c.x, c.y, true);
          }
        }
        // grow
        const hexPop = popAt(c.x, c.y);
        const g = C.grow * (night ? 0.45 : 1) * (net === 'off' ? 0.6 : 1) * c.res * (c.st === 'walk' ? 1 : 0.7) * Math.min(1.4, hexPop / 25000 + 0.3);
        c.n = Math.min(c.n0 * 6 + hexPop * 0.35, c.n * (1 + g));
        if (c.st === 'hold') c.holdT += TICK;
        // the regime: who has arrived (each kind after its time, counted from when this crowd formed)
        const since = m - c.form, wt = L.reduce((a, o) => a + o.n * (redNear(o.x, o.y) ? 2 : 1), 0) || 1, share = c.n * (redNear(c.x, c.y) ? 2 : 1) / wt;
        let strength = 0, maxR = 0;
        for (const u of UNITS) {
          if (pool[u.id] == null) continue;
          let at = arrive[u.id]; if (u.id === 'irgc') at = Math.max(at, (c.seen.special ?? 1e9) + 120);      // the IRGC only after the special units have failed for two hours
          if (since < at) continue;
          const n = pool[u.id] * share * Math.min(1, (since - at) / 45 + 0.3);
          c.f[u.id] = n; maxR = Math.max(maxR, u.maxRung);
          strength += n * ({ police: 3, basij: 6, plain: 4, special: 12, irgc: 15, foreign: 12 }[u.id] || 5);
          if (c.seen[u.id] == null) { c.seen[u.id] = since; if (u.id !== 'police' || c.i === 0 || c.ids.length > 1) say(m, 'force', () => tf('{u} reach Group {g} {p}, from the {d}: about {n} of them.', { u: uname(u), g: c.name, p: placeAt(c.x, c.y), d: dirWord(sideOf(c.x, c.y, AFF[u.id])), n: big(n) }), c.x, c.y, u.id === 'special' || u.id === 'irgc' || u.id === 'foreign'); }
        }
        // the ladder: the highest rung the triggers call for, at most one step every 15 minutes, never above what has arrived
        let want = 0; for (const [n, rung] of TRIG.size.at) if (c.n >= n) want = rung;
        if (c.st === 'hold') want = Math.max(want, Math.min(6, (c.r || 1) + Math.floor(c.holdT / TRIG.hold.everyMin) - 1));
        const red = redNear(c.x, c.y); if (red && want >= 1) want += TRIG.redline.plus;
        if (c.edge || isEdge(c.x, c.y)) want += want >= 2 ? TRIG.edge.plus : 0;
        if (net === 'off' && hNow < 6 && want >= 2) want += 1;
        want = Math.min(want, maxR, 6);
        if (want > c.r && m - c.rAt >= 15 && r() < 0.75) {
          c.r++; c.rAt = m; topR = Math.max(topR, c.r);
          if (c.r >= 2) say(m, 'rung', () => tf('The regime moves to {w} against Group {g} {p}.', { p: placeAt(c.x, c.y), w: lname(LAD[c.r]).toLowerCase(), g: c.name }), c.x, c.y, c.r >= 4);
        }
        // the clash
        if (strength > 0 && c.r >= 1) {
          // q: how far the forces outmatch this crowd. Big crowds are safer per head (safety in numbers: 2009's millions marched
          // past the Basij on 15 June), so the crowd counts with an exponent above one (est).
          const q = Math.min(2.5, strength / Math.max(1, 1.6 * Math.pow(c.n, 1.06))), Lr = LAD[c.r];
          const left = c.n * Lr.scatter * 0.55 * Math.max(0.15, q) * rr(0.7, 1.3);
          const k = c.n * Lr.kill * Math.min(1.5, q + 0.3) * rr(0.5, 1.5), hu = c.n * Lr.hurt * Math.min(1, q) * rr(0.6, 1.4), ja = c.n * 0.0015 * Math.min(1, q) * (c.f.plain ? 1.6 : 1);
          dead += k; hurt += hu; jailed += ja; c.n = Math.max(0, c.n - left - k - ja);
          c.res -= Lr.scatter * 0.3 * Math.min(2.5, q) * rr(0.7, 1.3) - (c.n > 50000 ? 0.022 : c.n > 15000 ? 0.014 : 0.008);
        } else c.res = Math.min(0.95, c.res + 0.004);
        if (c.res < C.breakAt || c.n < 250) {
          c.st = 'gone'; c.nLost = Math.max(c.n, c.n0 * 0.5);
          say(m, 'scatter', () => tf('Group {g} breaks into the side streets {p}.', { g: c.name, p: placeAt(c.x, c.y) }), c.x, c.y, true);
          if (r() < (net === 'off' ? 0.28 : 0.42) && hNow > 6 || r() < 0.2) c.regroup = m + rr(35, 80);
        }
        peak = Math.max(peak, c.n);
      }
      // holding the squares
      for (const h of P.hold) { const [hx, hy] = siteXY(h); if (crowds.some(c => c.st === 'hold' && c.n >= 2000 && Math.hypot(c.x - hx, c.y - hy) < 350)) held[h] += TICK; }
      if (keep) frames.push({ m, net, dead, jailed, cs: crowds.map(c => ({ x: c.x, y: c.y, n: c.n, st: c.st, r: c.r, ids: c.ids.slice(), f: Object.assign({}, c.f), fs: c.seen })) });
      if (s > 24 && crowds.every(c => c.st === 'gone' && !c.regroup || c.st === 'merged' || c.st === 'wait' && c.formAt > m + 600)) { if (keep) say(m, 'end', () => tr('The streets are empty. The night is over for this plan.'), CX, CY, true); break; }
    }
    const endM = frames.length ? frames[frames.length - 1].m : T * TICK;
    const dawnHeld = P.hold.filter(h => { const [hx, hy] = siteXY(h); return crowds.some(c => c.st === 'hold' && c.n >= 2000 && Math.hypot(c.x - hx, c.y - hy) < 350); });
    if (keep) for (const h of dawnHeld) say(endM, 'dawn', () => tf('Morning: {p} is still held.', { p: siteName(B.sites[h]) }), ...siteXY(h), true);
    const heldMax = Math.max(0, ...Object.values(held));
    return { ev, frames, dead, hurt, jailed, peak, topR, net: netAt, merges, held, heldMax, dawn: dawnHeld.length > 0, firstArr, lastArr, endM, last: crowds.filter(c => c.st === 'hold').length };
  }
  // many runs: the odds. Returns the run closest to the middle as the one to watch.
  function evaluate(P, runs) {
    const RT = routes(P); const out = [];
    runs = runs || 160;
    for (let i = 0; i < runs; i++) out.push(simulate(P, RT, 1000 + i * 7919, false));
    const q = (arr, f) => { const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
    const d = out.map(o => o.dead), pk = out.map(o => o.peak), hm = out.map(o => o.heldMax);
    const hasHold = P.hold.length > 0;
    const res = {
      runs, RT, hasHold,
      hold2: hasHold ? out.filter(o => o.heldMax >= 120).length / runs : null,
      dawn: hasHold ? out.filter(o => o.dawn).length / runs : null,
      last: out.filter(o => o.last > 0).length / runs,
      peak: q(pk, 0.5), dead: [q(d, 0.1), q(d, 0.5), q(d, 0.9)], jailed: q(out.map(o => o.jailed), 0.5), hurt: q(out.map(o => o.hurt), 0.5),
      topR: q(out.map(o => o.topR), 0.5), net: out.filter(o => o.net != null).length / runs, heldMed: q(hm, 0.5), merges: q(out.map(o => o.merges), 0.5),
    };
    // the score (this page's own yardstick, said so on the page): holding, lasting, numbers; lives lost count against it
    const sc = (hasHold ? 38 * res.hold2 + 22 * res.dawn : 30 * res.last + 10 * Math.min(1, res.heldMed / 240)) + 22 * Math.min(1, res.peak / 60000) + (hasHold ? 0 : 10 * res.last)
      + 18 * (1 - Math.min(1, res.dead[1] / 250));
    res.score = Math.round(Math.max(0, Math.min(100, sc)));
    // the run to watch: the one whose score is nearest the middle
    const single = o => (hasHold ? Math.min(1, o.heldMax / 240) : o.last ? 1 : 0) * 60 + Math.min(1, o.peak / 60000) * 22 + (1 - Math.min(1, o.dead / 250)) * 18;
    const ss = out.map((o, i) => [single(o), i]).sort((a, b) => a[0] - b[0]); const mid = ss[Math.floor(ss.length / 2)][1];
    res.seed = 1000 + mid * 7919;
    return res;
  }
  const grade = s => (s >= 70 ? 'A' : s >= 55 ? 'B' : s >= 40 ? 'C' : s >= 25 ? 'D' : 'F');

  // ================================================================== the room (DOM, built once)
  const room = D.createElement('div'); room.className = 'upp'; room.id = 'upp';
  room.innerHTML = `
<div class="upp-map" id="upp-map"><canvas id="upp-cv" aria-label="${esc(tr('Map of the city with your plan'))}"></canvas>
  <div class="upp-hint" id="upp-hint" hidden></div>
  <div class="upp-zoom"><button type="button" class="upp-ib" id="upp-zin" aria-label="${esc(tr('Zoom in'))}">+</button><button type="button" class="upp-ib" id="upp-zout" aria-label="${esc(tr('Zoom out'))}">&minus;</button><button type="button" class="upp-ib" id="upp-zfit" aria-label="${esc(tr('Show the whole plan'))}">&#8982;</button></div>
  <button type="button" class="upp-ib upp-keyb" id="upp-keyb" aria-expanded="false">${esc(tr('Key'))}</button>
  <div class="upp-legend" id="upp-legend" hidden></div>
  <div class="upp-play" id="upp-play" hidden>
    <div class="upp-clock"><b id="upp-clk">--:--</b><span id="upp-stat"></span></div>
    <div class="upp-ctl"><button type="button" class="upp-ib" id="upp-pp" aria-label="${esc(tr('Pause'))}"></button><button type="button" class="upp-ib" id="upp-step" aria-label="${esc(tr('Next event'))}">&#9197;</button>
      <input type="range" id="upp-scrub" min="0" max="100" value="0" aria-label="${esc(tr('Time'))}"><span class="upp-spd" role="group" aria-label="${esc(tr('Speed'))}"><button type="button" data-s="1" class="on">1×</button><button type="button" data-s="2">2×</button><button type="button" data-s="4">4×</button></span>
      <button type="button" class="upp-ib" id="upp-stop">${esc(tr('Back to the plan'))}</button></div>
    <ol class="upp-feed" id="upp-feed" aria-live="polite"></ol>
  </div>
</div>
<aside class="upp-side" id="upp-side">
  <div class="upp-tabs" role="tablist"><button type="button" role="tab" data-t="plan" class="on" aria-selected="true">${esc(tr('Your plan'))}</button><button type="button" role="tab" data-t="cmp" aria-selected="false">${esc(tr('Compare plans'))}</button><button type="button" role="tab" data-t="reg" aria-selected="false">${esc(tr('How the regime responds'))}</button></div>
  <div class="upp-pane" id="upp-p-plan"></div>
  <div class="upp-pane" id="upp-p-cmp" hidden></div>
  <div class="upp-pane" id="upp-p-reg" hidden></div>
  <div class="upp-go"><button type="button" class="upp-run" id="upp-run">${esc(tr('Play the night'))}</button><a class="upp-3d" id="upp-3d" href="#">${esc(tr('3D streets'))}</a></div>
</aside>`;
  stage.appendChild(room);
  box.dataset.plan = 'on';
  const cv = $('#upp-cv'), ctx = cv.getContext('2d'), mapEl = $('#upp-map');
  const base = D.createElement('canvas'), bctx = base.getContext('2d', { willReadFrequently: true });      // the streets are drawn on the CPU: stroking tens of thousands of lines is fast there, and slow on some graphics chips
  let Wd = 0, Ht = 0, DPR = 1, V = { x: 0, y: 0, k: 0.02 }, BV = null, dirty = true, baseDirty = true;

  // ================================================================== drawing
  const COL = { ground: '#101317', road0: '#59606b', road1: '#454b54', road2: '#2f343b', crowd: '#f5b842', crowdInk: '#17130a', force: '#eb4549', now: '#8fdcff', route: 'rgba(245,184,66,.75)', avoid: '#eb4549', hold: '#f5b842', text: '#e9edf1', dim: '#9aa3ad' };
  const RUNGC = ['#8d939b', '#c9a54a', '#e0873a', '#e86a3a', '#eb4549', '#c42c43', '#8f1730'];
  function resize() {
    const r = mapEl.getBoundingClientRect(); DPR = Math.min(2, W.devicePixelRatio || 1);
    if (!r.width || !r.height) return;
    Wd = Math.round(r.width); Ht = Math.round(r.height);
    cv.width = base.width = Math.round(Wd * DPR); cv.height = base.height = Math.round(Ht * DPR); cv.style.width = Wd + 'px'; cv.style.height = Ht + 'px';
    baseDirty = true; measure();
  }
  const sx = x => (x - V.x) * V.k + Wd / 2, sy = y => (V.y - y) * V.k + Ht / 2;
  const wx = px => (px - Wd / 2) / V.k + V.x, wy = py => V.y - (py - Ht / 2) / V.k;
  function drawBase() {
    bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.fillStyle = COL.ground; bctx.fillRect(0, 0, base.width, base.height);
    bctx.setTransform(V.k * DPR, 0, 0, -V.k * DPR, (Wd / 2 - V.x * V.k) * DPR, (Ht / 2 + V.y * V.k) * DPR);
    const px = 1 / V.k;
    // districts: a quiet wash by how many people live there (the hexes of the board)
    if (B.hex.pts) { /* outlines not shipped in the plan board: skipped */ }
    const tiers = V.k > 0.05 ? [2, 1, 0] : V.k > 0.02 ? [2, 1, 0] : [1, 0];
    const vx0 = wx(-40), vx1 = wx(Wd + 40), vy0 = wy(Ht + 40), vy1 = wy(-40);
    for (const t of tiers) {
      bctx.strokeStyle = [COL.road0, COL.road1, COL.road2][t]; bctx.lineWidth = [2.2, 1.4, 0.9][t] * px * (V.k > 0.06 ? 1.4 : 1); bctx.lineCap = 'round'; bctx.lineJoin = 'round';
      for (const T of G.P2[t]) if (T.b[2] >= vx0 && T.b[0] <= vx1 && T.b[3] >= vy0 && T.b[1] <= vy1) bctx.stroke(T.p);
    }
    BV = { x: V.x, y: V.y, k: V.k }; baseDirty = false;
  }
  let raf = 0, settle = 0;
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(t) {
    raf = 0;
    if (playing) advance(t);
    if (dirty || playing) draw();
    if (playing) kick();
  }
  function draw() {
    dirty = false; if (!Wd || !B) return;
    if (baseDirty && !dragging) drawBase();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = COL.ground; ctx.fillRect(0, 0, cv.width, cv.height);
    if (BV) { const f = V.k / BV.k; ctx.setTransform(f, 0, 0, f, (Wd / 2 - (V.x - BV.x) * V.k - Wd / 2 * f) * DPR, (Ht / 2 + (V.y - BV.y) * V.k - Ht / 2 * f) * DPR); ctx.drawImage(base, 0, 0); }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (BV && (Math.abs(BV.k - V.k) > 1e-9 || BV.x !== V.x || BV.y !== V.y)) { baseDirty = true; clearTimeout(settle); settle = setTimeout(() => { if (!dragging) { dirty = true; kick(); } }, 140); }
    const items = playing || shown ? playItems() : planItems();
    LAST = place(items);
    paint(LAST);
  }
  // ---------------------------------------------------------------- the items on the map
  // an item: {k: kind, x, y (world), w, h (screen box), pri, side, lab, ...}; place() decides where each is drawn
  function planItems() {
    const it = [], P = plan;
    P.avoid.forEach((a, i) => it.push({ k: 'avoid', x: a[0], y: a[1], rad: a[2], pri: 3, i }));
    const RT = planRoutes();
    P.groups.forEach((g, i) => { it.push({ k: 'route', p: RT[i] ? RT[i].p : null, pri: 0, i }); g.via.forEach((v, j) => it.push({ k: 'via', x: v[0], y: v[1], w: 14, h: 14, pri: 6, i, j })); });
    const dests = {}; P.groups.forEach((g, i) => { (dests[g.to] = dests[g.to] || []).push(i); });
    for (const to in dests) { const s = B.sites[to]; it.push({ k: 'dest', x: s.x, y: s.y, w: 26, h: 26, pri: 9, hold: P.hold.includes(+to), lab: siteName(s), ids: dests[to] }); }
    for (const h of P.hold) if (!dests[h]) { const s = B.sites[h]; it.push({ k: 'dest', x: s.x, y: s.y, w: 26, h: 26, pri: 8, hold: true, lab: siteName(s), ids: [] }); }
    P.groups.forEach((g, i) => it.push({ k: 'start', x: g.s[0], y: g.s[1], w: 30, h: 30, pri: 10, i, n: g.n, sel: i === selG }));
    placeNames(it, 4);
    return it;
  }
  function placeNames(it, pri) {      // the city's places, most important first; place() drops any that would cover something
    const want = PHONE() ? 5 : 10; let n = 0;
    const order = B.sites.map((s, i) => [s, i]).filter(([s]) => KIND[s.k] && (s.en || s.n) && !/^(Square|Bazaar|Hospital)$/.test(s.en || '')).sort((a, b) => (b[0].obj ? 1 : 0) - (a[0].obj ? 1 : 0));
    for (const [s, i] of order) { if (it.some(o => o.k === 'dest' && o.lab === siteName(s))) continue; it.push({ k: 'name', x: s.x, y: s.y, lab: siteName(s), pri: pri - n * 0.01, i, red: !!REDK[s.k] }); if (++n >= want) break; }
  }
  let shown = null, fpos = 0;      // the run being shown and where in it (frame index, fractional)
  function playItems() {
    const it = [], F = shown.frames, i0 = Math.min(F.length - 1, Math.floor(fpos)), f = fpos - i0, a = F[i0], b = F[Math.min(F.length - 1, i0 + 1)];
    const RT = shown.RT;
    plan.groups.forEach((g, i) => it.push({ k: 'route', p: RT[i] ? RT[i].p : null, pri: 0, i, faint: true }));
    for (const h of plan.hold) { const s = B.sites[h]; it.push({ k: 'dest', x: s.x, y: s.y, w: 26, h: 26, pri: 8, hold: true, lab: siteName(s), ids: [], held: a.cs.some(c => c.st === 'hold' && c.n >= 2000 && Math.hypot(c.x - s.x, c.y - s.y) < 350) }); }
    a.cs.forEach((c, j) => {
      const c2 = b.cs[j]; if (c.st !== 'walk' && c.st !== 'hold') return;
      const x = c.x + (c2.x - c.x) * f, y = c.y + (c2.y - c.y) * f, n = c.n + (c2.n - c.n) * f;
      const rad = Math.max(13, Math.min(30, 6 + Math.sqrt(n) / 7));
      it.push({ k: 'crowd', x, y, w: rad * 2, h: rad * 2, pri: 10 + n / 1e5, n, ids: c.ids, r: c.r });
      const kinds = Object.keys(c.f).filter(u => c.f[u] >= 1).sort((p, q) => U[p].maxRung - U[q].maxRung);
      for (const u of kinds) it.push({ k: 'force', x, y, w: 26, h: 22, pri: 7 + U[u].maxRung / 10, u, n: c.f[u], side: sideOf(x, y, AFF[u]), host: c.ids[0], rad });
    });
    placeNames(it, 3);
    // the moment that just happened: an ice-blue ring
    const now = shown.ev.filter(e => e.key && e.k !== 'net' && e.k !== 'end' && e.m <= a.m + TICK * f && e.m > a.m - 20);      // a city-wide event has no place to ring
    if (now.length) { const e = now[now.length - 1]; it.push({ k: 'ring', x: e.x, y: e.y, pri: 1 }); }
    return it;
  }
  // ---------------------------------------------------------------- place(): nothing ever overlaps
  const OFF = [[0, 0], [1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1], [2, 0], [-2, 0], [0, -2], [0, 2], [2, -1], [-2, -1], [2, 1], [-2, 1], [1, -2], [-1, -2], [1, 2], [-1, 2], [3, 0], [-3, 0], [0, 3], [0, -3]];
  const SIDE = { east: [1, 0], 'north-east': [0.7, -0.7], north: [0, -1], 'north-west': [-0.7, -0.7], west: [-1, 0], 'south-west': [-0.7, 0.7], south: [0, 1], 'south-east': [0.7, 0.7] };
  // the controls over the map: nothing is ever placed under them (measured on resize, play, the key and the debrief; never per frame)
  let EXC = [];
  function measure() {
    const mr = mapEl.getBoundingClientRect(); EXC = [];
    for (const el of [$('.upp-zoom', room), keyb, legend, $('#upp-play'), hint, $('#upp-debrief')]) {
      if (!el || el.hidden || !el.offsetParent) continue; const r = el.getBoundingClientRect(); if (r.width) EXC.push([r.left - mr.left - 4, r.top - mr.top - 4, r.width + 8, r.height + 8]);
    }
    dirty = true; kick();
  }
  function freeArea() {      // the part of the map no control covers, for fitting the plan into view
    let t = 8, b = Ht - 8, l = 8, r = Wd - 8;
    for (const e of EXC) { if (e[2] > Wd * 0.6) { if (e[1] > Ht / 2) b = Math.min(b, e[1]); else t = Math.max(t, e[1] + e[3]); } else if (e[0] > Wd / 2) r = Math.min(r, e[0]); else if (e[3] < Ht * 0.4) t = Math.max(t, Math.min(e[1] + e[3], 64)); }
    return { l, t, r, b };
  }
  function place(items) {
    const boxes = [], out = [], M = 3;
    const inside = b => b[0] >= 2 && b[1] >= 2 && b[0] + b[2] <= Wd - 2 && b[1] + b[3] <= Ht - 2 && !EXC.some(o => b[0] < o[0] + o[2] && b[0] + b[2] > o[0] && b[1] < o[1] + o[3] && b[1] + b[3] > o[1]);
    const hit = b => boxes.some(o => b[0] < o[0] + o[2] + M && b[0] + b[2] + M > o[0] && b[1] < o[1] + o[3] + M && b[1] + b[3] + M > o[1]);
    ctx.font = (FA ? '600 13px Vazirmatn,Tahoma,sans-serif' : '600 12.5px system-ui,-apple-system,Segoe UI,Roboto,sans-serif');
    const sorted = items.slice().sort((a, b) => b.pri - a.pri);
    const merged = {};
    for (const o of sorted) {
      if (o.k === 'route' || o.k === 'avoid' || o.k === 'ring') { out.push(o); continue; }
      const ax = sx(o.x), ay = sy(o.y);
      if (o.k === 'name' || o.k === 'dest' && o.lab) {
        // the marker (dest) first, then its name beside it
        if (o.k === 'dest') {
          const b = [ax - o.w / 2, ay - o.h / 2, o.w, o.h]; if (!inside(b) || hit(b)) { const s = slide(o, ax, ay, hit, inside); if (!s) continue; o.px = s[0]; o.py = s[1]; boxes.push(s[2]); } else { o.px = ax; o.py = ay; boxes.push(b); }
        }
        const tw = ctx.measureText(o.lab).width + 4, th = 17, bx = o.k === 'dest' ? o.px : ax, by = o.k === 'dest' ? o.py : ay;
        const tries = [[bx + (o.k === 'dest' ? 16 : 6), by - th / 2], [bx - (o.k === 'dest' ? 16 : 6) - tw, by - th / 2], [bx - tw / 2, by + (o.k === 'dest' ? 16 : 6)], [bx - tw / 2, by - (o.k === 'dest' ? 16 : 6) - th]];
        let put = null; for (const [tx, ty] of tries) { const b = [tx, ty, tw, th]; if (inside(b) && !hit(b)) { put = b; break; } }
        if (put) { boxes.push(put); o.tb = put; }
        if (o.k === 'dest' || put) out.push(o);
        continue;
      }
      if (o.k === 'force') {      // beside its crowd, on the side it came from; if no room, its count joins the force already drawn
        const d = SIDE[o.side] || [1, 0], host = out.find(c => c.k === 'crowd' && c.ids[0] === o.host);
        const hx = host ? host.px : ax, hy = host ? host.py : ay, rad = (host ? host.w / 2 : o.rad) + 16;
        let put = null;
        for (let step = 0; step < 4 && !put; step++) for (const turn of [0, 0.5, -0.5, 1, -1]) {
          const a = Math.atan2(d[1], d[0]) + turn * 0.7, rr2 = rad + step * 22, cx = hx + Math.cos(a) * rr2, cy = hy + Math.sin(a) * rr2, b = [cx - o.w / 2, cy - o.h / 2, o.w, o.h];
          if (inside(b) && !hit(b)) { put = b; o.px = cx; o.py = cy; o.lx = hx; o.ly = hy; break; }
        }
        if (put) { boxes.push(put); out.push(o); }
        else { const k = o.host + ':' + o.side; const f = out.find(x => x.k === 'force' && x.host === o.host); if (f) { f.more = (f.more || 0) + o.n; merged[k] = 1; } }
        continue;
      }
      // crowds, starts, stops
      const b = [ax - o.w / 2, ay - o.h / 2, o.w, o.h];
      if (inside(b) && !hit(b)) { o.px = ax; o.py = ay; boxes.push(b); out.push(o); continue; }
      const s = slide(o, ax, ay, hit, inside);
      if (s) { o.px = s[0]; o.py = s[1]; o.lx = ax; o.ly = ay; boxes.push(s[2]); out.push(o); }
      else if (o.k === 'crowd') { const near = out.find(x => x.k === 'crowd' && Math.hypot(x.px - ax, x.py - ay) < 60); if (near) { near.n += o.n; near.ids = near.ids.concat(o.ids); } }
    }
    out.boxes = boxes;
    return out;
  }
  function slide(o, ax, ay, hit, inside) {
    const st = Math.max(o.w, o.h) * 0.75;
    for (const [i, j] of OFF) { if (!i && !j) continue; const cx = ax + i * st, cy = ay + j * st, b = [cx - o.w / 2, cy - o.h / 2, o.w, o.h]; if (inside(b) && !hit(b)) return [cx, cy, b]; }
    return null;
  }
  // ---------------------------------------------------------------- paint
  function paint(L) {
    const c = ctx;
    for (const o of L) if (o.k === 'avoid') { const r = Math.max(10, o.rad * V.k); c.beginPath(); c.arc(sx(o.x), sy(o.y), r, 0, 7); c.fillStyle = 'rgba(235,69,73,.10)'; c.fill(); c.setLineDash([5, 5]); c.lineWidth = 1.6; c.strokeStyle = 'rgba(235,69,73,.85)'; c.stroke(); c.setLineDash([]); c.save(); c.beginPath(); c.arc(sx(o.x), sy(o.y), r, 0, 7); c.clip(); c.strokeStyle = 'rgba(235,69,73,.25)'; c.lineWidth = 1; for (let k = -r * 2; k < r * 2; k += 9) { c.beginPath(); c.moveTo(sx(o.x) + k - r, sy(o.y) - r); c.lineTo(sx(o.x) + k + r, sy(o.y) + r); c.stroke(); } c.restore(); }
    for (const o of L) if (o.k === 'route' && o.p) {
      c.beginPath(); for (let i = 0; i < o.p.length; i += 2) { const X = sx(o.p[i]), Y = sy(o.p[i + 1]); if (!i) c.moveTo(X, Y); else c.lineTo(X, Y); }
      c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = o.faint ? 'rgba(245,184,66,.28)' : 'rgba(0,0,0,.55)'; c.lineWidth = o.faint ? 3 : 6; c.stroke();
      if (!o.faint) { c.setLineDash([7, 6]); c.strokeStyle = o.i === selG ? '#ffd27a' : COL.route; c.lineWidth = o.i === selG ? 3 : 2.2; c.stroke(); c.setLineDash([]); }
    }
    for (const o of L) if (o.k === 'ring') { c.beginPath(); c.arc(sx(o.x), sy(o.y), 34, 0, 7); c.strokeStyle = COL.now; c.lineWidth = 2.5; c.globalAlpha = 0.9; c.stroke(); c.globalAlpha = 1; }
    for (const o of L) {      // leader lines from a slid item to where it really is
      if (o.lx == null || o.k === 'route') continue;
      c.beginPath(); c.moveTo(o.lx, o.ly); c.lineTo(o.px, o.py); c.strokeStyle = o.k === 'force' ? 'rgba(235,69,73,.7)' : 'rgba(245,184,66,.6)'; c.lineWidth = 1.2; c.stroke();
    }
    for (const o of L) {
      if (o.k === 'dest') {
        const x = o.px, y = o.py; c.beginPath(); c.arc(x, y, 12, 0, 7); c.fillStyle = 'rgba(16,19,23,.92)'; c.fill(); c.lineWidth = 2; c.strokeStyle = o.held ? COL.crowd : o.hold ? COL.hold : '#cfd5dc'; c.stroke();
        // a flag for a square to hold, a meeting dot otherwise
        if (o.hold) { c.beginPath(); c.moveTo(x - 4, y + 6); c.lineTo(x - 4, y - 7); c.lineTo(x + 6, y - 4); c.lineTo(x - 4, y - 1); c.fillStyle = o.held ? COL.crowd : COL.hold; c.strokeStyle = c.fillStyle; c.lineWidth = 1.6; c.stroke(); c.fill(); }
        else { c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fillStyle = '#cfd5dc'; c.fill(); }
      } else if (o.k === 'start') {
        const x = o.px, y = o.py; c.beginPath(); c.arc(x, y, 14, 0, 7); c.fillStyle = o.sel ? '#ffd27a' : COL.crowd; c.fill(); c.lineWidth = 2; c.strokeStyle = '#17130a'; c.stroke();
        c.fillStyle = COL.crowdInk; c.font = '800 13px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(GL[o.i], x, y + 0.5);
      } else if (o.k === 'via') {
        c.beginPath(); c.arc(o.px, o.py, 6, 0, 7); c.fillStyle = '#17130a'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = COL.crowd; c.stroke();
      } else if (o.k === 'crowd') {
        const x = o.px, y = o.py, r = o.w / 2;
        c.beginPath(); c.arc(x, y, r + 5, 0, 7); c.fillStyle = 'rgba(245,184,66,.16)'; c.fill();
        c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = COL.crowd; c.fill(); c.lineWidth = 2.5; c.strokeStyle = RUNGC[o.r] || RUNGC[0]; c.stroke();
        c.fillStyle = COL.crowdInk; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '800 ' + (r > 18 ? 12 : 11) + 'px system-ui,sans-serif'; c.fillText(FA ? N_(big(o.n)) : big(o.n), x, y - (r > 16 ? 5 : 0));
        if (r > 16) { c.font = '700 10px system-ui,sans-serif'; c.fillText(o.ids.map(i => GL[i]).join(''), x, y + 7); }
      } else if (o.k === 'force') {
        const x = o.px, y = o.py, w = o.w, h = o.h;
        c.beginPath(); rrect(c, x - w / 2, y - h / 2, w, h, 5); c.fillStyle = COL.force; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#2a0b0d'; c.stroke();
        c.fillStyle = '#fff'; c.font = '800 12px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(uicon(U[o.u]) + (o.more ? '+' : ''), x, y + 0.5);
      }
      if (o.tb) {
        const b = o.tb; c.font = (FA ? '600 13px Vazirmatn,Tahoma,sans-serif' : '600 12.5px system-ui,-apple-system,Segoe UI,Roboto,sans-serif'); c.textAlign = 'left'; c.textBaseline = 'middle';
        c.lineWidth = 3.5; c.strokeStyle = 'rgba(8,10,13,.95)'; c.lineJoin = 'round'; c.strokeText(o.lab, b[0] + 2, b[1] + b[3] / 2);
        c.fillStyle = o.k === 'dest' ? (o.hold ? '#ffd27a' : '#fff') : o.red ? '#f3a2a4' : COL.dim; c.fillText(o.lab, b[0] + 2, b[1] + b[3] / 2);
      }
    }
  }
  function rrect(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  let LAST = [];

  // ================================================================== the view: pan, zoom, fit
  function fit(pts) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 - x0 < 2000) { const m = (x0 + x1) / 2; x0 = m - 1000; x1 = m + 1000; } if (y1 - y0 < 2000) { const m = (y0 + y1) / 2; y0 = m - 1000; y1 = m + 1000; }
    const pad = PHONE() ? 30 : 60, F = freeArea(), fw = Math.max(80, F.r - F.l - pad * 2), fh = Math.max(80, F.b - F.t - pad * 2);
    V = { k: Math.min(fw / (x1 - x0), fh / (y1 - y0)) };
    V.x = (x0 + x1) / 2 - ((F.l + F.r) / 2 - Wd / 2) / V.k; V.y = (y0 + y1) / 2 + ((F.t + F.b) / 2 - Ht / 2) / V.k;
    V.k = Math.max(0.004, Math.min(0.25, V.k)); baseDirty = true; dirty = true; kick();
  }
  const planPts = () => { const p = []; for (const g of plan.groups) { p.push(g.s, siteXY(g.to)); for (const v of g.via) p.push(v); } for (const h of plan.hold) p.push(siteXY(h)); return p; };
  function zoomAt(f, px, py) { const x = wx(px), y = wy(py); V.k = Math.max(0.004, Math.min(0.25, V.k * f)); V.x = x - (px - Wd / 2) / V.k; V.y = y + (py - Ht / 2) / V.k; dirty = true; kick(); }
  let dragging = false, ptrs = new Map(), down = null, pinch = null;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.offsetX, e.offsetY]); if (ptrs.size === 1) down = { x: e.offsetX, y: e.offsetY, vx: V.x, vy: V.y, t: Date.now(), moved: false }; else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: V.k }; } });
  cv.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
    if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomAt(pinch.k * d / pinch.d / V.k, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); dragging = true; down && (down.moved = true); return; }
    if (!down) return; const dx = e.offsetX - down.x, dy = e.offsetY - down.y;
    if (!down.moved && Math.hypot(dx, dy) < 6) return;
    down.moved = true; dragging = true; V.x = down.vx - dx / V.k; V.y = down.vy + dy / V.k; dirty = true; kick();
  });
  const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { const tap = down && !down.moved; const d0 = down; down = null; if (dragging) { dragging = false; dirty = true; kick(); } if (tap && d0) onTap(d0.x, d0.y); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.offsetX, e.offsetY); }, { passive: false });
  $('#upp-zin').onclick = () => zoomAt(1.5, Wd / 2, Ht / 2); $('#upp-zout').onclick = () => zoomAt(1 / 1.5, Wd / 2, Ht / 2);
  $('#upp-zfit').onclick = () => fit(planPts());

  // ================================================================== editing on the map
  let mode = null, selG = 0;      // mode: 'start' | 'via' | 'dest' | 'avoid' | null
  const hint = $('#upp-hint');
  function setMode(m) {
    mode = m; hint.hidden = !m; setTimeout(measure, 0);
    if (m) hint.innerHTML = `<span>${esc({ start: tf('Tap the map where Group {g} starts.', { g: GL[selG] }), via: tf('Tap a street Group {g} should pass on its way.', { g: GL[selG] }), dest: tf('Tap a square or place for Group {g} to meet at.', { g: GL[selG] }), avoid: tr('Tap a place the plan should keep away from.') }[m])}</span><button type="button" class="upp-ib" id="upp-hx">${esc(tr('Done'))}</button>`;
    if (m) $('#upp-hx').onclick = () => setMode(null);
    tog(mapEl, 'picking', !!m);
  }
  function onTap(px, py) {
    if (playing || shown) return;
    const x = wx(px), y = wy(py), g = plan.groups[selG];
    if (!mode) {      // a tap on a start picks that group
      const hitG = LAST.find(o => o.k === 'start' && Math.hypot(o.px - px, o.py - py) < 18);
      if (hitG) { selG = hitG.i; drawPanel(); dirty = true; kick(); }
      return;
    }
    if (mode === 'start' && g) { const n = G.snap(x, y); g.s = [G.X[n], G.Y[n]]; setMode(null); }
    else if (mode === 'via' && g) { const n = G.snap(x, y); if (g.via.length < 3) g.via.push([G.X[n], G.Y[n]]); if (g.via.length >= 3) setMode(null); }
    else if (mode === 'dest' && g) { g.to = nearestSite([x, y], Object.keys(KIND).filter(k => KIND[k])); setMode(null); }
    else if (mode === 'avoid') { if (plan.avoid.length < 4) plan.avoid.push([x, y, 700]); setMode(null); }
    changed();
  }

  // ================================================================== the side: your plan
  let routeCache = null, routeKey = '';
  function planRoutes() { const k = JSON.stringify([plan.groups.map(g => [g.s, g.via, g.to]), plan.avoid]); if (k !== routeKey) { routeKey = k; routeCache = routes(plan); } return routeCache; }
  let evalT = 0, lastEval = null;
  function changed() { plan.id = 'mine'; toAddr(); drawPanel(); dirty = true; kick(); clearTimeout(evalT); evalT = setTimeout(() => { lastEval = evaluate(plan, 120); drawOdds(); }, 220); }
  const SIZES = [500, 1000, 2000, 3000, 5000, 8000, 12000, 20000, 30000, 50000, 80000];
  const HOURS = [10, 14, 16, 18, 20, 21, 22, 0];
  const holdable = () => B.sites.map((s, i) => [s, i]).filter(([s]) => KIND[s.k] && (s.en || s.n));
  function drawPanel() {
    const P = plan, el = $('#upp-p-plan');
    const pre = presets();
    el.innerHTML = `
<p class="upp-lede">${esc(tf('Build a plan for one night in {c}, then play it. The regime answers the way it did in 2009, 2019, 2022 and January 2026.', { c: cname(city) }))}</p>
<div class="upp-row"><label class="upp-lab" for="upp-city">${esc(tr('City'))}</label><select id="upp-city">${CITIES.map(c => `<option value="${c.id}"${c.id === city.id ? ' selected' : ''}>${esc(cname(c))}</option>`).join('')}</select></div>
<div class="upp-row"><span class="upp-lab">${esc(tr('Start from'))}</span><div class="upp-chips">${pre.map(p => `<button type="button" class="upp-chip${P.id === p.id ? ' on' : ''}" data-pre="${p.id}">${esc(p.n)}</button>`).join('')}</div></div>
<h3 class="upp-h">${esc(tr('1. Groups'))} <small>${N_(P.groups.length)}/${N_(MAXG)}</small></h3>
<ol class="upp-groups">${P.groups.map((g, i) => groupCard(g, i)).join('')}</ol>
${P.groups.length < MAXG ? `<button type="button" class="upp-add" id="upp-addg">+ ${esc(tr('Add a group'))}</button>` : ''}
<h3 class="upp-h">${esc(tr('2. Squares to hold'))}</h3>
<p class="upp-small">${esc(tr('Holding a square counts when 2,000 or more people stay on it.'))}</p>
<div class="upp-chips">${holdable().filter(([s]) => ['square', 'sq2', 'gov', 'tv', 'uni', 'bazaar', 'mosalla'].includes(s.k)).slice(0, 12).map(([s, i]) => `<button type="button" class="upp-chip${P.hold.includes(i) ? ' on' : ''}" data-hold="${i}">${P.hold.includes(i) ? '⚑ ' : ''}${esc(siteName(s))}</button>`).join('')}</div>
<h3 class="upp-h">${esc(tr('3. Places to avoid'))}</h3>
<div class="upp-chips">${P.avoid.map((a, i) => `<button type="button" class="upp-chip on" data-unavoid="${i}">✕ ${esc(placeAt(a[0], a[1], true))}</button>`).join('')}${P.avoid.length < 4 ? `<button type="button" class="upp-chip" id="upp-avoid">+ ${esc(tr('Mark a place on the map'))}</button>` : ''}</div>
<h3 class="upp-h">${esc(tr('4. When and how'))}</h3>
<div class="upp-row"><span class="upp-lab">${esc(tr('Start hour'))}</span><div class="upp-chips">${HOURS.map(h => `<button type="button" class="upp-chip${P.hour === h ? ' on' : ''}" data-hour="${h}">${N_(String(h).padStart(2, '0') + ':00')}</button>`).join('')}</div></div>
<div class="upp-row"><span class="upp-lab">${esc(tr('The internet'))}</span><div class="upp-chips"><button type="button" class="upp-chip${P.net !== 'off' ? ' on' : ''}" data-net="regime">${esc(tr('On until the regime cuts it'))}</button><button type="button" class="upp-chip${P.net === 'off' ? ' on' : ''}" data-net="off">${esc(tr('Already cut'))}</button></div></div>
<label class="upp-check"><input type="checkbox" id="upp-foreign"${P.foreign ? ' checked' : ''}> <span>${esc(tr('Count the reported Iraqi militias (not confirmed)'))}</span></label>
<div class="upp-odds" id="upp-odds"></div>`;
    $('#upp-city', el).onchange = e => switchCity(e.target.value);
    $$('[data-pre]', el).forEach(b => b.onclick = () => { plan = clone(pre.find(p => p.id === b.dataset.pre)); selG = 0; shownOff(); toAddr(); drawPanel(); fit(planPts()); lastEval = null; drawOdds(); clearTimeout(evalT); evalT = setTimeout(() => { lastEval = evaluate(plan, 120); drawOdds(); }, 60); });
    $$('[data-hold]', el).forEach(b => b.onclick = () => { const i = +b.dataset.hold, k = P.hold.indexOf(i); if (k >= 0) P.hold.splice(k, 1); else if (P.hold.length < 3) P.hold.push(i); changed(); });
    $$('[data-unavoid]', el).forEach(b => b.onclick = () => { P.avoid.splice(+b.dataset.unavoid, 1); changed(); });
    const av = $('#upp-avoid', el); if (av) av.onclick = () => setMode('avoid');
    $$('[data-hour]', el).forEach(b => b.onclick = () => { P.hour = +b.dataset.hour; changed(); });
    $$('[data-net]', el).forEach(b => b.onclick = () => { P.net = b.dataset.net; changed(); });
    $('#upp-foreign', el).onchange = e => { P.foreign = e.target.checked; changed(); };
    const ag = $('#upp-addg', el); if (ag) ag.onclick = () => { const s = popular(8, R * 0.15, R * 0.7)[P.groups.length % 8] || [CX, CY]; P.groups.push({ s, to: P.groups[0] ? P.groups[0].to : 0, n: 5000, wave: 0, via: [] }); selG = P.groups.length - 1; changed(); };
    $$('.upp-g', el).forEach(li => {
      const i = +li.dataset.g, g = P.groups[i];
      li.onclick = e => { if (e.target.closest('button,select,input')) return; selG = i; drawPanel(); dirty = true; kick(); };
      $('[data-act=start]', li).onclick = () => { selG = i; setMode('start'); drawPanel(); };
      $('[data-act=via]', li).onclick = () => { selG = i; setMode('via'); drawPanel(); };
      $('[data-act=dest]', li).onclick = () => { selG = i; setMode('dest'); drawPanel(); };
      const cl = $('[data-act=clearvia]', li); if (cl) cl.onclick = () => { g.via = []; changed(); };
      const rm = $('[data-act=rm]', li); if (rm) rm.onclick = () => { P.groups.splice(i, 1); selG = 0; changed(); };
      $('[data-act=size]', li).oninput = e => { g.n = SIZES[+e.target.value]; $('[data-act=sizev]', li).textContent = big(g.n); };
      $('[data-act=size]', li).onchange = () => changed();
      $('[data-act=wave]', li).onchange = e => { g.wave = +e.target.value; changed(); };
      $('[data-act=to]', li).onchange = e => { g.to = +e.target.value; changed(); };
    });
    drawOdds();
  }
  function groupCard(g, i) {
    const si = SIZES.reduce((b, v, k) => (Math.abs(v - g.n) < Math.abs(SIZES[b] - g.n) ? k : b), 0);
    const mates = plan.groups.map((o, j) => j).filter(j => j !== i && plan.groups[j].to === g.to);
    const opts = holdable().map(([s, k]) => `<option value="${k}"${k === g.to ? ' selected' : ''}>${esc(siteName(s))}</option>`).join('');
    return `<li class="upp-g${i === selG ? ' sel' : ''}" data-g="${i}"><div class="upp-gh"><b class="upp-gl">${GL[i]}</b><span class="upp-gfrom">${esc(tf('From {p}', { p: placeAt(g.s[0], g.s[1], true) }))}</span>${plan.groups.length > 1 ? `<button type="button" class="upp-x" data-act="rm" aria-label="${esc(tf('Remove Group {g}', { g: GL[i] }))}">✕</button>` : ''}</div>
<div class="upp-gb"><button type="button" class="upp-sb" data-act="start">${esc(tr('Move the start'))}</button><button type="button" class="upp-sb" data-act="via">+ ${esc(tr('A street on the way'))}</button>${g.via.length ? `<button type="button" class="upp-sb" data-act="clearvia">${esc(tf('Clear {n} stops', { n: N_(g.via.length) }))}</button>` : ''}</div>
<label class="upp-gr"><span>${esc(tr('People'))} <b data-act="sizev">${big(g.n)}</b></span><input type="range" min="0" max="${SIZES.length - 1}" step="1" value="${si}" data-act="size" aria-label="${esc(tr('People'))}"></label>
<div class="upp-gr2"><label><span>${esc(tr('Meets at'))}</span><select data-act="to">${opts}</select></label><button type="button" class="upp-sb upp-pin" data-act="dest" aria-label="${esc(tr('Pick on the map'))}">⌖</button>
<label><span>${esc(tr('Leaves'))}</span><select data-act="wave">${[0, 15, 30, 45, 60, 90, 120].map(w => `<option value="${w}"${w === g.wave ? ' selected' : ''}>${w ? esc(tf('{m} min later', { m: N_(w) })) : esc(tr('At the start'))}</option>`).join('')}</select></label></div>
${mates.length ? `<p class="upp-small upp-merge">${esc(tf('Merges with {g} there.', { g: mates.map(j => tf('Group {g}', { g: GL[j] })).join(FA ? ' و ' : ' and ') }))}</p>` : ''}</li>`;
  }
  function drawOdds() {
    const el = $('#upp-odds'); if (!el) return;
    if (!lastEval) { el.innerHTML = `<p class="upp-small">${esc(tr('Working out the odds...'))}</p>`; return; }
    el.innerHTML = oddsHTML(lastEval, true);
  }
  const pct = v => N_(Math.round(v * 100) + '%');
  function oddsHTML(E, full) {
    const rows = [];
    if (E.hasHold) { rows.push([tr('Holds a square for 2 hours or more'), pct(E.hold2)]); rows.push([tr('Still holding it in the morning'), pct(E.dawn)]); }
    else rows.push([tr('Still on the streets in the morning'), pct(E.last)]);
    rows.push([tr('Biggest crowd, typical'), big(E.peak)]);
    rows.push([tr('Lives lost, likely range'), N_(fmt(E.dead[0]) + '–' + fmt(E.dead[2]))]);
    rows.push([tr('Arrests, typical'), fmt(E.jailed)]);
    rows.push([tr('The regime goes as far as'), lname(LAD[E.topR])]);
    rows.push([tr('Internet cut that night'), pct(E.net)]);
    return `<div class="upp-score"><b class="upp-grade g-${grade(E.score)}">${grade(E.score)}</b><div><span class="upp-sn">${N_(E.score)}<small>/${N_(100)}</small></span><span class="upp-small">${esc(tf('Over {n} runs of the same night. Likelihoods, not predictions.', { n: N_(E.runs) }))}</span></div></div>
<dl class="upp-dl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${full ? `<p class="upp-small">${esc(tr('The score is this page\'s own yardstick: holding the squares and lasting count for a plan, lives lost count against it.'))}</p>` : ''}`;
  }

  // ================================================================== compare
  function drawCompare() {
    const el = $('#upp-p-cmp');
    const P = presets(); const mine = plan.id === 'mine' ? [Object.assign(clone(plan), { n: tr('Your plan') })] : [];
    const all = mine.concat(P);
    el.innerHTML = `<p class="upp-lede">${esc(tf('The same night in {c}, run {n} times for each plan. The site\'s own plans each follow a real night in Iran.', { c: cname(city), n: N_(120) }))}</p><div class="upp-cmp" id="upp-cmpt"><p class="upp-small">${esc(tr('Working out the odds...'))}</p></div>`;
    setTimeout(() => {
      const ev = all.map(p => [p, evaluate(p, 120)]);
      const best = ev.reduce((b, x) => (x[1].score > b[1].score ? x : b), ev[0]);
      $('#upp-cmpt').innerHTML = `<div class="upp-ct"><table><thead><tr><th>${esc(tr('Plan'))}</th><th>${esc(tr('Score'))}</th><th>${esc(tr('Holds 2h+'))}</th><th>${esc(tr('Biggest crowd'))}</th><th>${esc(tr('Lives lost'))}</th><th>${esc(tr('Goes as far as'))}</th></tr></thead><tbody>${ev.map(([p, E]) => `<tr${p === best[0] ? ' class="best"' : ''}><th><b>${esc(p.n)}</b>${p.why ? `<small>${esc(p.why)} ${ext(p.src, esc(tr('Source')))}</small>` : ''}</th><td><b class="upp-grade g-${grade(E.score)}">${grade(E.score)}</b> ${N_(E.score)}</td><td>${E.hasHold ? pct(E.hold2) : '<span class="upp-small">' + esc(tr('no square')) + '</span>'}</td><td>${big(E.peak)}</td><td>${N_(fmt(E.dead[1]))}</td><td>${esc(lname(LAD[E.topR]))}</td></tr>`).join('')}</tbody></table></div>
<p class="upp-small">${esc(tr('Tap a plan to load it and change it.'))}</p><div class="upp-chips">${ev.map(([p]) => p.id === 'mine' ? '' : `<button type="button" class="upp-chip" data-load="${p.id}">${esc(p.n)}</button>`).join('')}</div>`;
      $$('[data-load]', el).forEach(b => b.onclick = () => { plan = clone(P.find(p => p.id === b.dataset.load)); selG = 0; tab('plan'); toAddr(); drawPanel(); fit(planPts()); changed(); plan.id = b.dataset.load; drawPanel(); });
    }, 30);
  }
  // ================================================================== how the regime responds
  function drawRegime() {
    const el = $('#upp-p-reg'), src = a => (a || []).slice(0, 2).map((u, i) => ext(u, N_(i + 1))).join(' ');
    el.innerHTML = `<p class="upp-lede">${esc(tr('Who comes, when, and what makes them escalate. From how 2009, November 2019, 2022 and January 2026 unfolded. Times and numbers marked est are this page\'s estimates.'))}</p>
<h3 class="upp-h">${esc(tr('Who comes'))}</h3><ul class="upp-units">${UNITS.map(u => `<li><i class="upp-ficon" aria-hidden="true">${uicon(u)}</i><div><b>${esc(FA ? u.fa : u.n)}</b><p>${esc(FA ? u.roleFa : u.role)}</p><p class="upp-small">${esc(tf('Arrives {a} to {b} minutes after a crowd forms (est).', { a: N_(u.arriveMin[0]), b: N_(u.arriveMin[1]) }))} ${esc(tr('Sources'))}: ${src(u.src)}</p></div></li>`).join('')}</ul>
<h3 class="upp-h">${esc(tr('The ladder'))}</h3><ol class="upp-ladder">${LAD.map(l => `<li style="--c:${RUNGC[l.r]}"><b>${esc(lname(l))}</b><span>${esc(FA ? l.whatFa : l.what)}</span> ${src(l.src)}</li>`).join('')}</ol>
<h3 class="upp-h">${esc(tr('What makes it climb'))}</h3><ul class="upp-trig">${RESP.triggers.map(t => `<li><b>${esc(FA ? t.fa : t.n)}</b><span>${esc(FA ? t.ruleFa : t.rule)}</span> ${src(t.src)}</li>`).join('')}<li><b>${esc(FA ? RESP.internet.fa : RESP.internet.n)}</b><span>${esc(FA ? RESP.internet.ruleFa : RESP.internet.rule)} ${esc(FA ? RESP.internet.effectsFa : RESP.internet.effects)}</span> ${src(RESP.internet.src)}</li></ul>
<p class="upp-safe">${esc(tr('This is a model of the public record, not a plan for any real night. It holds nothing current: no positions, no routes, nothing a security force does not already know.'))}${IU ? ' ' + esc(tr('Nothing you do here leaves your device.')) : ''}</p>
<p class="upp-small">${esc(tf('Facts last checked {d}.', { d: N_(RESP.readUtc.slice(0, 10)) }))}</p>`;
  }
  // ================================================================== tabs
  function tab(t) { $$('.upp-tabs [data-t]').forEach(b => { const on = b.dataset.t === t; tog(b, 'on', on); b.setAttribute('aria-selected', String(on)); }); for (const k of ['plan', 'cmp', 'reg']) $('#upp-p-' + k).hidden = k !== t; if (t === 'cmp') drawCompare(); if (t === 'reg') drawRegime(); }
  $$('.upp-tabs [data-t]').forEach(b => b.onclick = () => tab(b.dataset.t));

  // ================================================================== playback
  let playing = false, speed = 1, lastT = 0, evShown = 0, run = null;
  const pp = $('#upp-pp'), feed = $('#upp-feed'), scrub = $('#upp-scrub'), clk = $('#upp-clk'), stat = $('#upp-stat');
  const SEC_PER_TICK = 0.5;      // 1x: five simulated minutes every half second, an hour every six seconds
  function play() {
    setMode(null);
    lastEval = lastEval || evaluate(plan, 120);
    const RT = planRoutes();
    run = simulate(plan, RT, lastEval.seed, true); run.RT = RT; shown = run; fpos = 0; evShown = 0;
    feed.innerHTML = ''; scrub.max = String(run.frames.length - 1); scrub.value = '0';
    $('#upp-play').hidden = false; tog(room, 'playing', true); $('#upp-run').textContent = tr('Play it again');
    setPlaying(true); syncUI(); resize(); measure(); fit(planPts());
  }
  function setPlaying(on) { playing = on; pp.innerHTML = on ? '&#10074;&#10074;' : '&#9654;'; pp.setAttribute('aria-label', on ? tr('Pause') : tr('Play')); lastT = 0; if (on) kick(); }
  function advance(t) {
    if (!lastT) lastT = t; const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
    fpos = Math.min(run.frames.length - 1, fpos + dt * speed / SEC_PER_TICK);
    syncUI();
    if (fpos >= run.frames.length - 1) { setPlaying(false); debrief(); }
  }
  function syncUI() {
    const F = run.frames[Math.floor(fpos)];
    const tm = (plan.hour * 60 + F.m) % 1440;
    clk.textContent = N_(String(Math.floor(tm / 60)).padStart(2, '0') + ':' + String(tm % 60).padStart(2, '0'));
    const onst = F.cs.filter(c => c.st === 'walk' || c.st === 'hold').reduce((a, c) => a + c.n, 0);
    stat.innerHTML = `<span>${esc(tr('On the streets'))} <b>${big(onst)}</b></span><span>${esc(tr('Lives lost'))} <b>${fmt(F.dead)}</b></span><span>${esc(tr('Arrested'))} <b>${fmt(F.jailed)}</b></span><span class="${F.net === 'off' ? 'off' : ''}">${esc(F.net === 'off' ? tr('Internet cut') : tr('Internet on'))}</span>`;
    scrub.value = String(Math.floor(fpos));
    // the feed: every event up to now, newest on top
    const list = run.ev.filter(e => e.m <= F.m);
    if (list.length !== evShown) {
      evShown = list.length;
      feed.innerHTML = list.slice(-40).reverse().map((e, i) => `<li class="k-${e.k}${e.key ? ' key' : ''}${i === 0 ? ' new' : ''}"><time>${e.t}</time><span>${esc(e.txt)}</span></li>`).join('');
    }
  }
  pp.onclick = () => { if (!run) return; if (fpos >= run.frames.length - 1) { fpos = 0; evShown = -1; } setPlaying(!playing); };
  $('#upp-step').onclick = () => { if (!run) return; setPlaying(false); const m = run.frames[Math.floor(fpos)].m; const nx = run.ev.find(e => e.m > m); const target = nx ? run.frames.findIndex(f => f.m >= nx.m) : run.frames.length - 1; fpos = target < 0 ? run.frames.length - 1 : target; syncUI(); dirty = true; kick(); if (fpos >= run.frames.length - 1) debrief(); };
  scrub.oninput = () => { if (!run) return; setPlaying(false); fpos = +scrub.value; syncUI(); dirty = true; kick(); };
  $$('.upp-spd button').forEach(b => b.onclick = () => { speed = +b.dataset.s; $$('.upp-spd button').forEach(x => tog(x, 'on', x === b)); });
  $('#upp-stop').onclick = () => shownOff();
  function shownOff() { setPlaying(false); shown = null; run = null; $('#upp-play').hidden = true; tog(room, 'playing', false); $('#upp-run').textContent = tr('Play the night'); const d = $('#upp-debrief'); if (d) d.remove(); measure(); }
  $('#upp-run').onclick = () => play();

  // ================================================================== the debrief: why it worked or failed
  function debrief() {
    const E = lastEval, Rn = run, why = [];
    const srcOf = id => { const t = TRIG[id]; return t && t.src ? ' ' + ext(t.src[0], esc(tr('Source'))) : ''; };
    // merging and timing
    const dests = {}; plan.groups.forEach((g, i) => { (dests[g.to] = dests[g.to] || []).push(i); });
    for (const to in dests) if (dests[to].length > 1 && Rn.firstArr[to] != null) {
      const gap = Rn.lastArr[to] - Rn.firstArr[to];
      if (gap > 40) why.push(['-', tf('The groups meeting at {p} arrived {m} minutes apart, so the first faced the forces alone.', { p: siteName(B.sites[to]), m: N_(Math.round(gap)) })]);
      else why.push(['+', tf('The groups met at {p} within {m} minutes of each other, so they stood together.', { p: siteName(B.sites[to]), m: N_(Math.max(5, Math.round(gap))) })]);
    }
    // red lines
    const reds = new Set(); for (const h of plan.hold.concat(plan.groups.map(g => g.to))) { const s = B.sites[h]; if (REDK[s.k] || redNear(s.x, s.y)) reds.add(siteName(s)); }
    if (reds.size) why.push(['-', tf('{p} is within 800 m of a place the regime treats as a red line, and crowds there met live fire sooner.', { p: [...reds].slice(0, 2).join(FA ? ' و ' : ' and ') }) + srcOf('redline')]);
    // the edges
    if (plan.groups.some(g => isEdge(g.s[0], g.s[1]))) why.push(['-', tr('Starting on the edge of the city brings heavier weapons sooner, as in 2019 and January 2026.') + srcOf('edge')]);
    // the hour
    const to = lerpTab(RESP.crowd.evening, plan.hour);
    why.push([to >= 1 ? '+' : '-', to >= 1 ? tf('Starting at {h} brings the most people out, after work and as the bazaar closes.', { h: N_(String(plan.hour).padStart(2, '0') + ':00') }) : tf('Fewer people come out at {h} than in the early evening.', { h: N_(String(plan.hour).padStart(2, '0') + ':00') })]);
    // spread
    if (plan.groups.length >= TRIG.spread.crowds && Object.keys(dests).length >= 3) why.push(['+', tr('Many crowds at once stretched the forces thin, but each small crowd was easier to scatter.') + srcOf('spread')]);
    // the internet
    if (E.net > 0.5) why.push(['-', tf('The internet was cut in {p} of runs, and with it the crowd grew slower and lost its timing.', { p: pct(E.net) }) + ' ' + ext(RESP.internet.src[1], esc(tr('Source')))]);
    // routes
    const extra = planRoutes().reduce((a, r) => a + Math.max(0, r.len - r.direct), 0);
    if (plan.avoid.length && extra > 1500) why.push(['-', tf('Keeping away from the marked places added {k} km of walking, more time for the forces to arrive.', { k: N_((extra / 1000).toFixed(1)) })]);
    // the size of the crowd at its goal
    if (E.hasHold) why.push([E.hold2 >= 0.3 ? '+' : '-', E.hold2 >= 0.3 ? tf('About {n} people held on long enough to hold the square in {p} of runs.', { n: big(E.peak), p: pct(E.hold2) }) : tf('At about {n} people, the crowd was too small to hold the square against the special units in most runs.', { n: big(E.peak) })]);
    if (E.topR >= 4) why.push(['-', tf('The regime went as far as {r}: in the record it does, once a crowd will not leave.', { r: lname(LAD[E.topR]).toLowerCase() }) + ' ' + ext(LAD[4].src[1], esc(tr('Source')))]);
    const el = D.createElement('div'); el.className = 'upp-debrief'; el.id = 'upp-debrief';
    el.innerHTML = `<div class="upp-dh"><h3>${esc(tr('Why it went this way'))}</h3><button type="button" class="upp-ib" id="upp-dx" aria-label="${esc(tr('Close'))}">✕</button></div>${oddsHTML(E, false)}<ul class="upp-why">${why.map(([s, t]) => `<li class="${s === '+' ? 'up' : 'down'}"><i aria-hidden="true">${s === '+' ? '▲' : '▼'}</i><span>${t.replace(/<a /g, '<a ').split(/(<a [^>]*>[^<]*<\/a>)/).map((p, i) => i % 2 ? p : esc(p)).join('')}</span></li>`).join('')}</ul>
<p class="upp-small">${esc(tr('Try another plan, or compare it with the site\'s own plans.'))}</p><div class="upp-chips"><button type="button" class="upp-chip" id="upp-dplan">${esc(tr('Change the plan'))}</button><button type="button" class="upp-chip" id="upp-dcmp">${esc(tr('Compare plans'))}</button></div>`;
    const old = $('#upp-debrief'); if (old) old.remove();
    mapEl.appendChild(el);
    { const pr = $('#upp-play').getBoundingClientRect(), mr = mapEl.getBoundingClientRect(), top = el.getBoundingClientRect().top - mr.top; el.style.maxHeight = Math.max(160, pr.top - mr.top - top - 10) + 'px'; }      // never over the controls
    $('#upp-dx').onclick = () => { el.remove(); measure(); };
    measure();
    $('#upp-dplan').onclick = () => { shownOff(); tab('plan'); };
    $('#upp-dcmp').onclick = () => { el.remove(); tab('cmp'); };
  }

  // ================================================================== the key
  const legend = $('#upp-legend'), keyb = $('#upp-keyb');
  legend.innerHTML = `<h4>${esc(tr('Key'))}</h4><ul>
<li><i class="lg-start">A</i>${esc(tr('Where a group starts'))}</li><li><i class="lg-route"></i>${esc(tr('Its route on the streets'))}</li><li><i class="lg-via"></i>${esc(tr('A street it passes'))}</li>
<li><i class="lg-dest"></i>${esc(tr('Where groups meet'))}</li><li><i class="lg-hold">⚑</i>${esc(tr('A square to hold'))}</li><li><i class="lg-avoid"></i>${esc(tr('A place to avoid'))}</li>
<li><i class="lg-crowd">5k</i>${esc(tr('A crowd and how many people'))}</li>
${UNITS.map(u => `<li><i class="lg-force">${uicon(u)}</i>${esc(FA ? u.fa : u.n)}</li>`).join('')}
<li><i class="lg-ring"></i>${esc(tr('What just happened'))}</li></ul><p class="upp-small">${esc(tr('The ring round a crowd shows how far the regime has gone against it:'))}</p><ol class="lg-lad">${LAD.map(l => `<li><i style="background:${RUNGC[l.r]}"></i>${esc(lname(l))}</li>`).join('')}</ol>`;
  keyb.onclick = () => { const on = legend.hidden; legend.hidden = !on; keyb.setAttribute('aria-expanded', String(on)); measure(); };

  // ================================================================== the city
  async function switchCity(id) {
    if (!byId[id]) return;
    if (bootEl) { tog(bootEl, 'off', false); if (bootT) bootT.textContent = tf('Loading the streets of {c}...', { c: cname(byId[id]) }); }
    shownOff(); setMode(null);
    B = await loadCity(id); city = byId[id]; G = graph(B);
    CX = 0; CY = 0; R = B.r || 15000;
    const H = B.hex; let sx_ = 0, sy_ = 0, sp = 0; for (let i = 0; i < H.x.length; i++) { sx_ += H.x[i] * H.p[i]; sy_ += H.y[i] * H.p[i]; sp += H.p[i]; } if (sp) { CX = sx_ / sp; CY = sy_ / sp; }
    MEMO = new Map(); BASES = { FARAJA: [], Basij: [], IRGC: [] }; for (const s of (B.sec || [])) if (BASES[s.aff]) BASES[s.aff].push([s.x, s.y]);
    let fromAddr = null; try { const q = new URLSearchParams(location.search); if (q.get('pl') && (q.get('city') || id) === id) fromAddr = fat(dec(q.get('pl'))); } catch (_) { fromAddr = null; }
    plan = fromAddr && fromAddr.groups.length && fromAddr.groups.every(g => B.sites[g.to]) ? fromAddr : blank();
    selG = 0; routeKey = ''; lastEval = null;
    $('#upp-3d').href = '?city=' + id + '&view=3d';
    resize(); fit(planPts()); toAddr(); drawPanel(); tab('plan');
    if (bootEl) tog(bootEl, 'off', true);
    clearTimeout(evalT); evalT = setTimeout(() => { lastEval = evaluate(plan, 120); drawOdds(); }, 40);
    dispatchEvent(new CustomEvent('upp:city', { detail: id }));
  }
  new ResizeObserver(() => resize()).observe(mapEl);

  // ================================================================== the check (deploy path): nothing overlaps, no errors, light enough
  // Plays the typical run of every preset at three zooms and fails on any two screen boxes that meet, any item outside the map,
  // a frame slower than the budget, or a page error. Returns {bad: [...], frames, worstMs}.
  async function check(o) {
    o = o || {}; const bad = [], zooms = o.zooms || [0.6, 1, 2.2], times = []; let frames = 0, worst = 0, baseMs = 0;
    const errs = []; const onErr = e => errs.push(String(e.message || e)); W.addEventListener('error', onErr);
    const P = presets();
    for (const p of P.slice(0, o.plans || P.length)) {
      plan = clone(p); routeKey = ''; lastEval = evaluate(plan, 40); const RT = planRoutes();
      run = simulate(plan, RT, lastEval.seed, true); run.RT = RT; shown = run; $('#upp-play').hidden = false; tog(room, 'playing', true); resize(); measure();
      for (const z of zooms) {
        fit(planPts()); V.k *= z; baseDirty = true; const tb = performance.now(); drawBase(); bctx.getImageData(0, 0, 1, 1); baseMs = Math.max(baseMs, performance.now() - tb);
        for (let f = 0; f < run.frames.length; f += 2) {
          // ctx.getImageData makes the canvas paint this frame now, inside its own timing: without it the browser holds the drawing of
          // every frame in this loop and paints hundreds at once inside one later frame (3 Nov 2026: a 250 ms "frame" on the Persian
          // Tehran board that measured 7 ms once each frame was painted, as a browser showing it does)
          fpos = f; const t0 = performance.now(); draw(); ctx.getImageData(0, 0, 1, 1); const dt = performance.now() - t0; worst = Math.max(worst, dt); times.push(dt); frames++;
          const bx = LAST.boxes || [];
          for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) { const a = bx[i], b = bx[j]; if (a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1]) { bad.push(`${city.id} ${p.id} zoom ${z} frame ${f}: two things overlap on the map`); i = bx.length; break; } }
          for (const a of bx) if (a[0] < 0 || a[1] < 0 || a[0] + a[2] > Wd || a[1] + a[3] > Ht) { bad.push(`${city.id} ${p.id} zoom ${z} frame ${f}: something is drawn off the map`); break; }
          for (const a of bx) if (EXC.some(o => a[0] < o[0] + o[2] && a[0] + a[2] > o[0] && a[1] < o[1] + o[3] && a[1] + a[3] > o[1])) { bad.push(`${city.id} ${p.id} zoom ${z} frame ${f}: something is drawn under a control`); break; }
          if (bad.length > 20) break;
        }
      }
    }
    shownOff(); plan = blank(); routeKey = ''; drawPanel(); fit(planPts());
    W.removeEventListener('error', onErr);
    for (const e of errs) bad.push('page error: ' + e);
    // frames: the 95th percentile within budget, and no single frame over four times it (one garbage collection is not a slow page)
    times.sort((a, b) => a - b); const p95 = times.length ? times[Math.floor(times.length * 0.95)] : 0, fb = o.frameMs || 40;
    if (p95 > fb) bad.push(`${city.id}: frames are slow, 95% under ${Math.round(p95)} ms (budget ${fb} ms)`);
    if (worst > fb * 4) bad.push(`${city.id}: a frame took ${Math.round(worst)} ms (ceiling ${fb * 4} ms)`);
    if (baseMs > (o.baseMs || 150)) bad.push(`${city.id}: redrawing the streets took ${Math.round(baseMs)} ms (budget ${o.baseMs || 150} ms)`);
    return { bad: [...new Set(bad)], frames, worstMs: Math.round(worst), p95Ms: Math.round(p95 * 10) / 10, baseMs: Math.round(baseMs) };
  }
  W.UPPLAN = { check, switchCity, get plan() { return plan; }, evaluate: p => evaluate(p || plan, 120), presets, get city() { return city && city.id; }, play };

  await switchCity(opt && opt.city && byId[opt.city] ? opt.city : (byId.tehran ? 'tehran' : CITIES[0].id));
  return W.UPPLAN;
}
