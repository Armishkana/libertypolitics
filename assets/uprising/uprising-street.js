/* THE STREETS: WHERE EVERY FIGURE AND EVERY CAR MOVES (2 November 2026; the Uprising Simulator, build/uprising.js).

   Armin, 2 November 2026: the people "walk straight across the map through buildings instead of along streets", the cars "do
   not move in the streets properly", "nothing resembles a real uprising". Before this file each figure slid in a straight
   line to its next district and was drawn up to 90 times life size from the whole-city view. Now:

   THE NETWORK   the city's real streets (the board's roads, OpenStreetMap) joined where they meet into one graph. People walk
                 on every street (motorways cost them three times as much, so they keep to avenues and side streets); cars
                 drive on the motorways, avenues and streets, never the alleys.
   ROUTES        one shortest-path tree per destination (a flow field, as strategy games move armies): every figure going to
                 the same square follows the same streets, so a crowd becomes a column filling the avenue. Built a few
                 thousand nodes a frame, so nothing stalls.
   THE PEOPLE    come out of the side streets of their own district, walk to its gathering point (the square or the main
                 junction), and fill the streets around it; when they go home they walk back into the side streets and are
                 gone. Surplus walks to the next district along the streets.
   THE FORCES    leave their own bases (police stations, Basij bases, IRGC bases, from the board) and walk or drive there
                 along the streets; facing a crowd they stand as a line across the avenue, shields to the people.
   THE TRAFFIC   drives on the right in its lane, keeps its distance, queues at a crowd or a barricade and does not drive
                 through it; stopped cars by a crowd blink their hazard lights (honking in solidarity).
   SPEEDS        in real metres a second (walking 1.3, a marching column 1.0, a crowd running from fire 3.0, a Basij motorbike
                 10, a car 8 to 16). The run is a time-lapse of an hour every two seconds, so on screen a figure is held to
                 a pace the eye can follow (DISP below); it never leaves its street to catch up.
   THE AUDIT     audit() counts figures off the street network, figures inside a building, cars against their lane, and the
                 speeds in use. The phone test (build/phone-test.html) and build/uprising_street_check.mjs fail on any of them.

   The page never reads the agents directly: it asks for counts per district each hour (plan) and draws through this file. */

export function createStreets(THREE, cfg) {
  const { add, K, LOD2, LOWP, hash } = cfg;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  // ------------------------------------------------------------------------------------------------ the colours (one meaning each)
  const COL = cfg.colours;
  // real speeds, metres a second (research: build/../data/uprising/visual-rebuild-2026-11-02.md, "Speeds")
  const SPEED = { walk: 1.3, march: 0.7, run: 3.0, police: 1.2, bike: 10, car: [16, 11, 8, 6] };      // march: a dense column moves slower than one walker (Fruin, Still); the 2009 Enghelab march averaged far less with its stops
  // the street's half width a figure may stand in, by tier (motorway, avenue, street, alley), and a car's lane offset
  const HALFW = [9, 7.5, 4.2, 2.2], LANE = [5.2, 3.6, 2.2, 1.6];
  const WCOST = [3, 0.8, 0.9, 1.2], DCOST = [0.75, 1, 1.35, 9];

  // ------------------------------------------------------------------------------------------------ the network
  let N = 0, NX = null, NY = null, NT = null, NH = null, OFF = null, NB = null, NE = null, EA = null, EB = null, ET = null, EL = null, NEDGE = 0;
  let WOK = null, DOK = null;      // nodes on the main walking and driving networks
  let GRID = null, GC = 120, GX0 = 0, GY0 = 0, GW = 0, GH = 0;      // nodes by cell
  let EGRID = null, EGC = 60;      // edges by cell (the audit and the fill's clearance test)
  let BLD = [], BGRID = null, BGC = 50;      // building footprints for the audit
  let HEXN = null, HEXO = null, GATHER = null, LINE = [], BASE = {};
  let B = null;
  const key = (x, y) => (x + 50000) * 100000 + (y + 50000);

  function build(board, hexOf) {
    B = board;
    const map = new Map(), xs = [], ys = [], ts = [];
    const ea = [], eb = [], et = [];
    const nid = (x, y, t) => { const k = key(x, y); let i = map.get(k); if (i === undefined) { i = xs.length; map.set(k, i); xs.push(x); ys.push(y); ts.push(t); } else if (t < ts[i]) ts[i] = t; return i; };
    for (let t = 0; t < 4; t++) for (const a of (board.roads || {})['t' + t] || []) {
      let x = 0, y = 0, prev = -1;
      for (let n = 0; n + 1 < a.length; n += 2) {
        if (n === 0) { x = a[0]; y = a[1]; } else { x += a[n]; y += a[n + 1]; }
        const i = nid(x, y, t);
        if (prev >= 0 && prev !== i) { ea.push(prev); eb.push(i); et.push(t); }
        prev = i;
      }
    }
    N = xs.length;
    // a street that ends on another street's line, where simplifying the map dropped the shared point: split that line there
    const deg = new Int32Array(N); for (let e = 0; e < ea.length; e++) { deg[ea[e]]++; deg[eb[e]]++; }
    {
      const C = 40, g = new Map();
      for (let e = 0; e < ea.length; e++) {
        const x1 = xs[ea[e]], y1 = ys[ea[e]], x2 = xs[eb[e]], y2 = ys[eb[e]];
        for (let cx = Math.floor(Math.min(x1, x2) / C); cx <= Math.floor(Math.max(x1, x2) / C); cx++) for (let cy = Math.floor(Math.min(y1, y2) / C); cy <= Math.floor(Math.max(y1, y2) / C); cy++) { const k = cx * 100000 + cy; let l = g.get(k); if (!l) g.set(k, l = []); l.push(e); }
      }
      const dead = []; for (let i = 0; i < N; i++) if (deg[i] === 1) dead.push(i);
      const gone = new Uint8Array(ea.length + dead.length * 2);
      for (const d of dead) {
        const x = xs[d], y = ys[d], l = g.get(Math.floor(x / C) * 100000 + Math.floor(y / C)); if (!l) continue;
        let best = -1, bd = 3.5;
        for (const e of l) {
          if (gone[e] || ea[e] === d || eb[e] === d) continue;
          const x1 = xs[ea[e]], y1 = ys[ea[e]], dx = xs[eb[e]] - x1, dy = ys[eb[e]] - y1, L2 = dx * dx + dy * dy; if (!L2) continue;
          const u = ((x - x1) * dx + (y - y1) * dy) / L2; if (u <= 0.02 || u >= 0.98) continue;
          const dd = Math.hypot(x1 + dx * u - x, y1 + dy * u - y); if (dd < bd) { bd = dd; best = e; }
        }
        if (best >= 0) { gone[best] = 1; ea.push(ea[best], d); eb.push(d, eb[best]); et.push(et[best], et[best]); }
      }
      let w = 0; for (let e = 0; e < ea.length; e++) if (!gone[e]) { ea[w] = ea[e]; eb[w] = eb[e]; et[w] = et[e]; w++; } ea.length = eb.length = et.length = w;
    }
    NEDGE = ea.length;
    NX = Float32Array.from(xs); NY = Float32Array.from(ys); NT = Uint8Array.from(ts);
    EA = Int32Array.from(ea); EB = Int32Array.from(eb); ET = Uint8Array.from(et); EL = new Float32Array(NEDGE);
    for (let e = 0; e < NEDGE; e++) EL[e] = Math.hypot(NX[EB[e]] - NX[EA[e]], NY[EB[e]] - NY[EA[e]]) || 0.5;
    const dg = new Int32Array(N + 1); for (let e = 0; e < NEDGE; e++) { dg[EA[e] + 1]++; dg[EB[e] + 1]++; }
    for (let i = 0; i < N; i++) dg[i + 1] += dg[i];
    OFF = dg; NB = new Int32Array(NEDGE * 2); NE = new Int32Array(NEDGE * 2); const fill = OFF.slice(0, N);
    for (let e = 0; e < NEDGE; e++) { const a = EA[e], b = EB[e]; NB[fill[a]] = b; NE[fill[a]++] = e; NB[fill[b]] = a; NE[fill[b]++] = e; }
    // the main networks: the largest connected part for walking (every street) and for driving (no alleys)
    const comp = (ok) => {
      const c = new Int32Array(N).fill(-1); let best = -1, bestN = 0, id = 0; const st = new Int32Array(N);
      for (let s = 0; s < N; s++) {
        if (c[s] >= 0 || !ok(s, -1)) continue; let sp = 0, n = 0; st[sp++] = s; c[s] = id;
        while (sp) { const u = st[--sp]; n++; for (let k = OFF[u]; k < OFF[u + 1]; k++) { const v = NB[k]; if (c[v] < 0 && ok(v, NE[k])) { c[v] = id; st[sp++] = v; } } }
        if (n > bestN) { bestN = n; best = id; } id++;
      }
      const out = new Uint8Array(N); for (let i = 0; i < N; i++) out[i] = c[i] === best ? 1 : 0; return out;
    };
    WOK = comp(() => true);
    DOK = comp((v, e) => (e < 0 ? NT[v] <= 2 : ET[e] <= 2));
    // nodes by cell, edges by cell
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < N; i++) { if (NX[i] < x0) x0 = NX[i]; if (NY[i] < y0) y0 = NY[i]; if (NX[i] > x1) x1 = NX[i]; if (NY[i] > y1) y1 = NY[i]; }
    if (!N) { x0 = y0 = -1; x1 = y1 = 1; }
    GX0 = x0 - 1; GY0 = y0 - 1; GW = Math.ceil((x1 - GX0) / GC) + 1; GH = Math.ceil((y1 - GY0) / GC) + 1;
    GRID = new Map(); for (let i = 0; i < N; i++) { const k = cellK(NX[i], NY[i], GC); let l = GRID.get(k); if (!l) GRID.set(k, l = []); l.push(i); }
    EGRID = new Map();
    for (let e = 0; e < NEDGE; e++) {
      const ax = NX[EA[e]], ay = NY[EA[e]], bx = NX[EB[e]], by = NY[EB[e]], pad = HALFW[ET[e]] + 2;
      for (let cx = Math.floor((Math.min(ax, bx) - pad - GX0) / EGC); cx <= Math.floor((Math.max(ax, bx) + pad - GX0) / EGC); cx++)
        for (let cy = Math.floor((Math.min(ay, by) - pad - GY0) / EGC); cy <= Math.floor((Math.max(ay, by) + pad - GY0) / EGC); cy++) { const k = cx * 100000 + cy; let l = EGRID.get(k); if (!l) EGRID.set(k, l = []); l.push(e); }
    }
    // each node's district, and each district's nodes
    const H = board.hex.x.length; NH = new Int16Array(N);
    const cnt = new Int32Array(H + 1); for (let i = 0; i < N; i++) { const h = hexOf(NX[i], NY[i]); NH[i] = h; if (h >= 0 && WOK[i]) cnt[h + 1]++; }
    for (let h = 0; h < H; h++) cnt[h + 1] += cnt[h];
    HEXO = cnt; HEXN = new Int32Array(cnt[H]); const f2 = cnt.slice(0, H);
    for (let i = 0; i < N; i++) { const h = NH[i]; if (h >= 0 && WOK[i]) HEXN[f2[h]++] = i; }
    routeQ.length = 0; routeHead = 0; LINE = new Array(H).fill(null); BASE = {}; COV = null; WF = null;
    BLD = []; BGRID = new Map();
    return { nodes: N, edges: NEDGE, walk: WOK.reduce((a, b) => a + b, 0), drive: DOK.reduce((a, b) => a + b, 0) };
  }
  const cellK = (x, y, c) => Math.floor((x - GX0) / c) * 100000 + Math.floor((y - GY0) / c);
  function nearestNode(x, y, ok, maxR) {
    maxR = maxR || 1500; let best = -1, bd = maxR * maxR;
    const cx = Math.floor((x - GX0) / GC), cy = Math.floor((y - GY0) / GC);
    for (let r = 0; r <= Math.ceil(maxR / GC); r++) {
      for (let i = cx - r; i <= cx + r; i++) for (let j = cy - r; j <= cy + r; j++) {
        if (Math.abs(i - cx) !== r && Math.abs(j - cy) !== r) continue;
        const l = GRID.get(i * 100000 + j); if (!l) continue;
        for (const n of l) { if (ok && !ok[n]) continue; const d = (NX[n] - x) ** 2 + (NY[n] - y) ** 2; if (d < bd) { bd = d; best = n; } }
      }
      if (best >= 0 && (r * GC) ** 2 > bd) break;
    }
    return best;
  }
  // the distance from a point to the nearest street centre line, and that street's tier (the audit; the fill's clearance)
  function roadDist(x, y) {
    const l = EGRID.get(cellK(x, y, EGC)); let bd = 1e9, bt = 3;
    if (l) for (const e of l) {
      const x1 = NX[EA[e]], y1 = NY[EA[e]], dx = NX[EB[e]] - x1, dy = NY[EB[e]] - y1, L2 = dx * dx + dy * dy || 1;
      const u = clamp(((x - x1) * dx + (y - y1) * dy) / L2, 0, 1), d = Math.hypot(x1 + dx * u - x, y1 + dy * u - y);
      if (d - HALFW[ET[e]] < bd - HALFW[bt]) { bd = d; bt = ET[e]; }
    }
    return [bd, bt];
  }
  // a building footprint stands clear of every street: no corner and no edge midpoint inside a street's half width
  function clearOfRoads(fp, margin) {
    margin = margin || 0.5;
    for (let i = 0; i < fp.length; i++) {
      const a = fp[i], b = fp[(i + 1) % fp.length];
      for (const [x, y] of [[a[0], a[1]], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]]) { const [d, t] = roadDist(x, y); if (d < HALFW[t] + margin) return false; }
    }
    // and no street runs through it
    let cx = 0, cy = 0; for (const p of fp) { cx += p[0]; cy += p[1]; } cx /= fp.length; cy /= fp.length;
    const [d, t] = roadDist(cx, cy); return d >= HALFW[t] + margin;
  }
  // footprints for the audit: [[x, y], ...] in board metres (y north)
  function addBuildings(list) {
    for (const fp of list) {
      if (!fp || fp.length < 3) continue;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of fp) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      const id = BLD.length; BLD.push({ fp, x0, y0, x1, y1 });
      for (let cx = Math.floor((x0 - GX0) / BGC); cx <= Math.floor((x1 - GX0) / BGC); cx++) for (let cy = Math.floor((y0 - GY0) / BGC); cy <= Math.floor((y1 - GY0) / BGC); cy++) { const k = cx * 100000 + cy; let l = BGRID.get(k); if (!l) BGRID.set(k, l = []); l.push(id); }
    }
  }
  function clearBuildings() { BLD = []; BGRID = new Map(); LBLD = []; LGRID = new Map(); }
  // A STREET UNDER A BUILDING (2 November 2026, Sanandaj: police stood where OpenStreetMap draws a building over the road, an
  // arcade, a passage, or a mapping slip). Every segment with a point inside a mapped building is covered: routes avoid it
  // (fifty times the cost), nobody stops or stands on it, no car drives into it. Run whenever the buildings change.
  // And a street is only as wide as its buildings let it be (2 November 2026, the sweep of all 35 cities: in ten of them a
  // figure or a car stood inside a mapped building that comes closer to the street's centre than that kind of street's usual
  // width). WF[e] is the share of the usual half width that is clear on both sides along the whole segment.
  let COV = null, WF = null;
  const WSTEPS = [1, 0.7, 0.45, 0.2, 0];
  function markCovered() {
    COV = new Uint8Array(NEDGE); WF = new Float32Array(NEDGE).fill(1); let n = 0;
    for (let e = 0; e < NEDGE; e++) {
      const ax = NX[EA[e]], ay = NY[EA[e]], bx = NX[EB[e]], by = NY[EB[e]], L = EL[e], k = Math.max(1, Math.ceil(L / 3)), dx = (bx - ax) / L, dy = (by - ay) / L, hw = Math.max(HALFW[ET[e]], LANE[ET[e]] + 1.2) + 0.6;
      let f = 1;
      for (const w of WSTEPS) {
        let ok = true;
        // every line across the street up to this width, not only its edge (Bojnurd: a kiosk on the shoulder, between the
        // centre line and the street's edge, held a car)
        for (let j = 0; j <= k && ok; j++) { const u = j / k, x = ax + (bx - ax) * u, y = ay + (by - ay) * u; for (const w2 of WSTEPS) { if (w2 > w || !ok) continue; if (inBuilding(x - dy * hw * w2, y + dx * hw * w2) >= 0 || inBuilding(x + dy * hw * w2, y - dx * hw * w2) >= 0) ok = false; } }
        if (ok) { f = w; break; } f = -1;
      }
      if (f < 0) { COV[e] = 1; WF[e] = 0; n++; } else WF[e] = f;
    }
    if (A) for (let i = 0; i < A.n; i++) if (A.st[i] && A.e[i] >= 0 && COV[A.e[i]]) { if (A.st[i] === 1) needRoute(i); else if (A.dst[i] >= 0) settleNow(i); else hide(i); }
    if (T) for (let i = 0; i < T.n; i++) if (COV[T.e[i]] || WF[T.e[i]] < 0.2) { const e = pickFree(i); if (e >= 0) { T.e[i] = e; T.a[i] = EA[e]; T.b[i] = EB[e]; T.s[i] = 0; } }
    return n;
  }
  function pickFree(i) { for (let t = 0; t < 60; t++) { const e = Math.floor(hash(i, 90 + t) * NEDGE); if (ET[e] <= 2 && DOK[EA[e]] && DOK[EB[e]] && !COV[e] && WF[e] >= 0.2) return e; } return -1; }
  // the dense blocks around the camera (the page's local fill) live in their own grid, replaced whenever the camera moves on
  let LBLD = [], LGRID = new Map();
  function setLocalBuildings(list) {
    LBLD = []; LGRID = new Map();
    for (const fp of list) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of fp) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      const id = LBLD.length; LBLD.push({ fp, x0, y0, x1, y1 });
      for (let cx = Math.floor((x0 - GX0) / BGC); cx <= Math.floor((x1 - GX0) / BGC); cx++) for (let cy = Math.floor((y0 - GY0) / BGC); cy <= Math.floor((y1 - GY0) / BGC); cy++) { const k = cx * 100000 + cy; let l = LGRID.get(k); if (!l) LGRID.set(k, l = []); l.push(id); }
    }
  }
  function inPoly(f, x, y) { let ins = false; for (let i = 0, j = f.length - 1; i < f.length; j = i++) { const xi = f[i][0], yi = f[i][1], xj = f[j][0], yj = f[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; }
  function inBuilding(x, y) {
    const k = cellK(x, y, BGC), ll = LGRID.get(k);
    if (ll) for (const id of ll) { const b = LBLD[id]; if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && inPoly(b.fp, x, y)) return 1e6 + id; }
    const l = BGRID && BGRID.get(k); if (!l) return -1;
    for (const id of l) {
      const b = BLD[id]; if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1) continue;
      let ins = false; const f = b.fp;
      for (let i = 0, j = f.length - 1; i < f.length; j = i++) { const xi = f[i][0], yi = f[i][1], xj = f[j][0], yj = f[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; }
      if (ins) return id;
    }
    return -1;
  }

  // ------------------------------------------------------------------------------------------------ routes (A*)
  // Each walker gets its own shortest route on the streets (A*, the straight-line distance as the guide), computed under a
  // budget of nodes a frame so a big city never stalls; until its route is ready a walker waits where it stands. Avenues
  // cost a little less than side streets, so walkers bound for the same square converge on the same avenue, as a march does.
  let SG = null, SP = null, SS = null, STAMP = 0; const OH = { heap: new Int32Array(8192), hd: new Float32Array(8192), hn: 0 };
  function astar(a, b, mode, maxPop) {
    const walk = mode === 'w', ok = walk ? WOK : DOK, cost = walk ? WCOST : DCOST, hmin = walk ? 0.8 : 0.75;
    if (a < 0 || b < 0) return [null, 0]; if (a === b) return [[a], 1];
    if (!SG || SG.length !== N) { SG = new Float32Array(N); SP = new Int32Array(N); SS = new Uint32Array(N); STAMP = 0; }
    if (++STAMP > 4e9) { SS.fill(0); STAMP = 1; }
    const tx = NX[b], ty = NY[b], h = n => Math.hypot(NX[n] - tx, NY[n] - ty) * hmin;
    OH.hn = 0; SS[a] = STAMP; SG[a] = 0; SP[a] = -1; push(OH, a, h(a));
    let pops = 0, found = false;
    while (OH.hn && pops < maxPop) {
      const f0 = OH.hd[0], u = pop(OH); pops++;
      if (u === b) { found = true; break; }
      const gu = SG[u]; if (f0 > gu + h(u) + 0.01) continue;      // a stale entry
      for (let k = OFF[u]; k < OFF[u + 1]; k++) {
        const v = NB[k], e = NE[k]; if (!ok[v]) continue; if (!walk && ET[e] > 2) continue;
        if (COV && COV[e]) continue;      // never through a building
        if (!walk && WF && WF[e] < 0.2) continue;      // no vehicle where the street is narrower than a lane
        const nd = gu + EL[e] * cost[ET[e]];
        if (SS[v] !== STAMP || nd < SG[v]) { SS[v] = STAMP; SG[v] = nd; SP[v] = u; push(OH, v, nd + h(v)); }
      }
    }
    if (!found) return [null, pops];
    const out = []; let n = b; while (n !== -1 && out.length < 20000) { out.push(n); if (n === a) break; n = SP[n]; }
    return [out.reverse(), pops];
  }
  function push(f, n, d) {
    if (f.hn >= f.heap.length) { const h = new Int32Array(f.heap.length * 2); h.set(f.heap); f.heap = h; const hd = new Float32Array(f.hd.length * 2); hd.set(f.hd); f.hd = hd; }
    let i = f.hn++; const H = f.heap, D = f.hd;
    while (i > 0) { const p = (i - 1) >> 1; if (D[p] <= d) break; H[i] = H[p]; D[i] = D[p]; i = p; }
    H[i] = n; D[i] = d;
  }
  function pop(f) {
    const H = f.heap, D = f.hd, top = H[0], n = --f.hn; if (n <= 0) return top;
    const x = H[n], dx = D[n]; let i = 0;
    for (; ;) { let c = i * 2 + 1; if (c >= n) break; if (c + 1 < n && D[c + 1] < D[c]) c++; if (D[c] >= dx) break; H[i] = H[c]; D[i] = D[c]; i = c; }
    H[i] = x; D[i] = dx; return top;
  }
  const routeQ = []; let routeHead = 0;
  function needRoute(i) { if (!A.rq[i]) { A.rq[i] = 1; routeQ.push(i); } A.path[i] = null; }
  function pumpRoutes(budget) {
    while (routeHead < routeQ.length && budget > 0) {
      const i = routeQ[routeHead++]; A.rq[i] = 0;
      if (A.st[i] !== 1 || A.e[i] < 0) continue;
      const [p, pops] = astar(A.b[i], A.dst[i], 'w', 60000); budget -= pops + 50;
      if (p) { A.path[i] = p; A.pi[i] = 0; } else leave(i, false);
    }
    if (routeHead > 4096 && routeHead >= routeQ.length) { routeQ.length = 0; routeHead = 0; }
  }
  // a walking route between two nodes, as points (drawn plans)
  function pathXY(a, b) { if (a == null || b == null) return null; const [p] = astar(a, b, 'w', 200000); return p ? p.map(n => [NX[n], NY[n]]) : null; }

  // ------------------------------------------------------------------------------------------------ the agents
  // kinds: 0 protester, 1 riot police, 2 Basij on foot, 3 IRGC, 4 crossed over, 5 medic
  const KINDS = ['protester', 'riot', 'basij', 'irgc_soldier', 'defector', 'medic'];
  const KCOL = () => [COL.people, COL.regime, COL.regime, COL.regime, COL.people, COL.medic];
  let A = null, crowds = [], kindStart = [], kindN = [], POOL = null;
  const KNOT = LOD2 ? 4 : 6, POOLN = LOD2 ? 280 : LOWP ? 900 : 1800;
  function makeAgents(caps) {
    let n = 0; kindStart = []; kindN = [];
    for (let k = 0; k < KINDS.length; k++) { kindStart.push(n); kindN.push(caps[k]); n += caps[k]; }
    A = { n, kind: new Uint8Array(n), st: new Uint8Array(n), a: new Int32Array(n).fill(-1), b: new Int32Array(n).fill(-1), e: new Int32Array(n).fill(-1), s: new Float32Array(n), dst: new Int32Array(n).fill(-1),
      lat: new Float32Array(n), setl: new Float32Array(n), al: new Float32Array(n), hex: new Int16Array(n).fill(-1), sp: new Float32Array(n), x: new Float32Array(n), y: new Float32Array(n), hd: new Float32Array(n),
      v: new Float32Array(n), mode: new Uint8Array(n), line: new Int16Array(n).fill(-1), wait: new Float32Array(n), fwd: new Uint8Array(n), rq: new Uint8Array(n), path: new Array(n).fill(null), pi: new Int32Array(n) };
    routeQ.length = 0; routeHead = 0;
    for (let k = 0; k < KINDS.length; k++) for (let i = kindStart[k]; i < kindStart[k] + kindN[k]; i++) { A.kind[i] = k; A.sp[i] = 0.85 + 0.3 * hash(i, 3); A.lat[i] = (hash(i, 5) * 2 - 1); }
    // the figures up close (the kit's crowds, driven from here)
    for (const c of crowds) c.mesh.parent && c.mesh.parent.remove(c.mesh);
    crowds = [];
    POOL = null;
    if (K && K.city && K.city.crowd) for (let k = 0; k < KINDS.length; k++) {
      if (!kindN[k]) { crowds.push(null); continue; }
      if (k === 0) { try { POOL = K.city.crowd(POOLN, { kinds: ['protester'], driven: true, seed: 11, lite: LOWP, shadows: false, team: 'gold' }); POOL.mesh.traverse(m => { m.frustumCulled = false; }); add(POOL.mesh); } catch (e) { POOL = null; } crowds.push(null); continue; }
      try { const c = K.city.crowd(kindN[k], { kinds: [KINDS[k]], driven: true, seed: 11 + k, lite: LOWP, shadows: false, team: k === 0 || k === 4 ? 'gold' : k === 5 ? 'white' : 'red' }); c.mesh.frustumCulled = false; c.mesh.traverse(m => { m.frustumCulled = false; }); add(c.mesh); crowds.push(c); }
      catch (e) { crowds.push(null); }
    }
    // the dots from afar: one point per figure in its side's colour
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), al = new Float32Array(n);
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); ge.setAttribute('col', new THREE.BufferAttribute(col, 3)); ge.setAttribute('al', new THREE.BufferAttribute(al, 1).setUsage(THREE.DynamicDrawUsage));
    const kc = KCOL(); for (let i = 0; i < n; i++) col.set(kc[A.kind[i]], i * 3);
    const m = new THREE.ShaderMaterial({ uniforms: { uPx: cfg.uPx, uDot: { value: LOD2 ? 4.4 : 5.0 } },
      vertexShader: 'attribute vec3 col; attribute float al; uniform float uPx; uniform float uDot; varying vec3 vC; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(uDot, min(uDot * 2.2, 7.0 * uPx / -mv.z)); vC = col; vA = al; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25 || vA < 0.01) discard; float edge = smoothstep(0.25, 0.14, r); vec3 c = mix(vec3(0.03, 0.035, 0.045), vC, smoothstep(0.25, 0.16, r)); gl_FragColor = vec4(c, vA * edge); }',
      transparent: true, depthWrite: false, depthTest: true });
    const pts = new THREE.Points(ge, m); pts.frustumCulled = false; pts.renderOrder = 4; add(pts);
    // THE MASS (a soft glow on the street under every figure, its side's colour): from the district view a crowd of a few
    // dozen figures reads as one body filling its streets, and a police line as a red bar across it
    const gm = new THREE.ShaderMaterial({ uniforms: { uPx: cfg.uPx },
      vertexShader: 'attribute vec3 col; attribute float al; uniform float uPx; varying vec3 vC; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(85.0 * uPx / -mv.z, 9.0, 150.0); vC = col; vA = al; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0 || vA < 0.01) discard; gl_FragColor = vec4(vC * vA * 0.34 * (1.0 - r) * (1.0 - r), 1.0); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const gp = new THREE.Points(ge, gm); gp.frustumCulled = false; gp.renderOrder = 2; add(gp);
    A.dots = { ge, pos, al };
  }
  // where the figures of a district gather: its square or place that matters if it has one, else its main junction
  function setGathering(sitesByHex) {
    const H = B.hex.x.length; GATHER = new Int32Array(H).fill(-1);
    const W = [1.2, 3, 2.2, 0.6];
    for (let h = 0; h < H; h++) {
      const sq = sitesByHex && sitesByHex[h];
      if (sq) { const n = nearestNode(sq[0], sq[1], WOK, 600); if (n >= 0) { GATHER[h] = n; continue; } }
      let best = -1, bs = -1e9; const cx = B.hex.x[h], cy = B.hex.y[h];
      for (let k = HEXO[h]; k < HEXO[h + 1]; k++) { const n = HEXN[k], d = OFF[n + 1] - OFF[n]; const sc = W[NT[n]] * Math.min(d, 4) - Math.hypot(NX[n] - cx, NY[n] - cy) / B.s * 5; if (sc > bs) { bs = sc; best = n; } }
      GATHER[h] = best >= 0 ? best : nearestNode(cx, cy, WOK, B.s * 2);
    }
  }
  // the bases each kind of force leaves from: [[x, y], ...] per kind (riot: police; basij: Basij bases; irgc: IRGC bases)
  function setBases(byKind) {
    BASE = {};
    for (const k in byKind) BASE[k] = byKind[k].map(p => nearestNode(p[0], p[1], WOK, 400)).filter(n => n >= 0);
  }
  function baseFor(kind, h) {
    const L = BASE[kind]; const cx = B.hex.x[h], cy = B.hex.y[h];
    let best = -1, bd = (B.s * 3.2) ** 2;
    if (L) for (const n of L) { const d = (NX[n] - cx) ** 2 + (NY[n] - cy) ** 2; if (d < bd) { bd = d; best = n; } }
    return best;
  }
  // the police line of a district facing a crowd: across the avenue, about 40 metres from the crowd's gathering point,
  // on the side the forces come from. [front node (the crowd's side), back node, edge, the side it faces]
  function lineOf(h) {
    if (LINE[h]) return LINE[h];
    const g = GATHER[h]; if (g < 0) return null;
    const bn = baseFor('riot', h) >= 0 ? baseFor('riot', h) : baseFor('basij', h);
    const tx = bn >= 0 ? NX[bn] : 0, ty = bn >= 0 ? NY[bn] : 0;
    let dx = tx - NX[g], dy = ty - NY[g]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    let best = -1, bs = -2;
    for (let k = OFF[g]; k < OFF[g + 1]; k++) { const v = NB[k], e = NE[k]; if (!WOK[v] || ET[e] === 0 || (COV && COV[e])) continue; const ex = NX[v] - NX[g], ey = NY[v] - NY[g], el = Math.hypot(ex, ey) || 1; const sc = (ex * dx + ey * dy) / el + (ET[e] <= 1 ? 0.25 : 0); if (sc > bs) { bs = sc; best = k; } }
    if (best < 0) return null;
    // walk on along the same street until about 40 m from the gathering point
    let a = g, b = NB[best], e = NE[best], dist = EL[e];
    for (let step = 0; step < 6 && dist < 34; step++) {
      let nk = -1, ns = -2; const ex0 = NX[b] - NX[a], ey0 = NY[b] - NY[a], l0 = Math.hypot(ex0, ey0) || 1;
      for (let k = OFF[b]; k < OFF[b + 1]; k++) { const v = NB[k]; if (v === a || !WOK[v] || (COV && COV[NE[k]])) continue; const ex = NX[v] - NX[b], ey = NY[v] - NY[b], el = Math.hypot(ex, ey) || 1; const sc = (ex * ex0 + ey * ey0) / (el * l0); if (sc > ns) { ns = sc; nk = k; } }
      if (nk < 0 || ns < 0.7) break;
      a = b; b = NB[nk]; e = NE[nk]; dist += EL[e];
    }
    LINE[h] = { front: a, back: b, e, g };
    return LINE[h];
  }
  // the edge an agent sits on, and the point on it
  function edgeBetween(a, b) { for (let k = OFF[a]; k < OFF[a + 1]; k++) if (NB[k] === b) return NE[k]; return -1; }
  function placeOn(i, a, b, s) { const e = edgeBetween(a, b); A.a[i] = a; A.b[i] = b; A.e[i] = e; A.s[i] = clamp(s, 0, e >= 0 ? EL[e] : 0); }
  function anyNb(n, avoid, ok, noEdge) {
    const c = OFF[n + 1] - OFF[n]; if (!c) return -1; const r = Math.floor(hash(n, clock * 13 + avoid) * c);
    for (let t = 0; t < c; t++) { const k = OFF[n] + (r + t) % c; const v = NB[k]; if (v === avoid && c > 1) continue; if (ok && !ok[v]) continue; if (noEdge && noEdge[NE[k]]) continue; if (COV && COV[NE[k]]) continue; return k; }
    return -1;
  }
  // ---- this hour's plan: how many of each kind each district holds (the page computes it from the run), and the districts
  // where forces face a crowd (they stand as a line there). jump: the reader scrubbed, so everyone is placed, not walked.
  let crowdEdge = null, lineEdge = null;
  function plan(kind, want, contested, jump) {
    if (!A) return;
    const H = B.hex.x.length, s0 = kindStart[kind], n0 = kindN[kind];
    const have = []; for (let h = 0; h < H; h++) have.push([]);
    const free = [];
    for (let i = s0; i < s0 + n0; i++) { if ((A.st[i] === 1 || A.st[i] === 2 || A.st[i] === 3) && A.hex[i] >= 0) have[A.hex[i]].push(i); else if (A.st[i] === 0) free.push(i); }
    const send = (i, h) => { A.hex[i] = h; target(i, h, jump); };
    for (let h = 0; h < H; h++) {
      let sur = have[h].length - (want[h] | 0); if (sur <= 0) continue;
      // the ones farthest out leave first
      have[h].sort((p, q) => A.setl[q] - A.setl[p]);
      for (const j of B.hex.nb[h] || []) { if (sur <= 0) break; let def = (want[j] | 0) - have[j].length; while (def-- > 0 && sur > 0) { const p = have[h].pop(); have[j].push(p); send(p, j); sur--; } }
      while (sur-- > 0) { const p = have[h].pop(); leave(p, jump); }
    }
    for (let h = 0; h < H; h++) {
      let def = (want[h] | 0) - have[h].length;
      while (def-- > 0 && free.length) { const p = free.pop(); if (spawn(p, h, kind, jump)) { have[h].push(p); } }
    }
    // forces in a contested district re-form their line; everyone else keeps their place
    if (kind >= 1 && kind <= 3) for (let h = 0; h < H; h++) { const ln = contested && contested[h] ? lineOf(h) : null; for (const p of have[h]) { const want2 = ln ? h : -1; if (A.line[p] !== want2) { A.line[p] = want2; target(p, h, jump); } } }
  }
  function spawn(i, h, kind, jump) {
    let n = -1;
    if (kind >= 1 && kind <= 3) n = baseFor(kind === 1 ? 'riot' : kind === 2 ? 'basij' : 'irgc', h);
    if (n < 0) {      // a side street of the district (people come out of their own neighbourhoods)
      const c = HEXO[h + 1] - HEXO[h]; if (!c) return false;
      for (let t = 0; t < 6; t++) { const m = HEXN[HEXO[h] + Math.floor(hash(i, clock * 7 + t) * c)]; if (NT[m] >= 2 || t === 5) { n = m; break; } }
    }
    if (n < 0) return false;
    const k = anyNb(n, -1, WOK); if (k < 0) return false;
    placeOn(i, n, NB[k], 0); A.hex[i] = h; A.al[i] = jump ? 1 : 0; A.line[i] = -1;
    target(i, h, jump);
    return true;
  }
  function target(i, h, jump) {
    const ln = A.line[i] >= 0 ? lineOf(A.line[i]) : null;
    const kind = A.kind[i];
    let d = ln ? ln.back : GATHER[h];
    if (!ln && kind >= 1 && kind <= 3) { const bn = baseFor(kind === 1 ? 'riot' : kind === 2 ? 'basij' : 'irgc', h); if (bn >= 0 && NH[bn] === h) d = bn; }
    if (d < 0) { A.st[i] = 0; return; }
    A.dst[i] = d; A.st[i] = 1; A.wait[i] = 0;
    // how far past the gathering point this one walks before it stops: a crowd spreads over the streets around its point
    // a crowd covers as much street as its real numbers need (about two people a square metre on an avenue, spread over the
    // streets that meet at its point): 6,000 people reach about 85 m up each street, 50,000 about 250 m
    const P0 = people ? people[h] || 0 : (crowdSize && crowdSize[h] || 1) * 100;
    A.setl[i] = kind === 0 || kind === 4 ? 6 + Math.sqrt(hash(i, 17)) * clamp(Math.sqrt(P0) * 1.1, 12, 420) : kind === 5 ? 20 + 30 * hash(i, 19) : 3 + 12 * hash(i, 23);
    if (jump) settleNow(i); else needRoute(i);
  }
  function leave(i, jump) { if (jump) { hide(i); return; } A.st[i] = 4; A.setl[i] = 90 + 120 * hash(i, clock); A.hex[i] = -1; A.line[i] = -1; }
  function hide(i) { A.st[i] = 0; A.al[i] = 0; A.hex[i] = -1; A.line[i] = -1; }
  // the reader scrubbed: put the figure where it would stand
  function settleNow(i) {
    const d = A.dst[i]; const k = anyNb(d, -1, WOK); if (k < 0) { hide(i); return; }
    placeOn(i, d, NB[k], 0); A.al[i] = 1; arrive(i, true);
  }
  let crowdSize = null, people = null;
  function setCrowdSize(cs, ppl) { crowdSize = cs; people = ppl || null; }
  // the figure reached its destination: a crowd spreads along the streets (never past the police line); the forces take
  // their places in the line, shields to the crowd
  function arrive(i, now) {
    const kind = A.kind[i];
    if (A.line[i] >= 0 && kind >= 1 && kind <= 3) {
      const ln = lineOf(A.line[i]); if (!ln) { A.st[i] = 3; return; }
      const idx = (i - kindStart[kind]), rows = kind === 1 ? 0 : kind === 2 ? 1 : 2;
      const L = EL[ln.e] || 10, row = rows + Math.floor(hash(i, 31) * 2);
      placeOn(i, ln.back, ln.front, Math.max(0.5, L - 5 - row * 2.6));
      A.lat[i] = ((idx * 0.618) % 1) * 1.9 - 0.95; A.st[i] = 3; A.fwd[i] = 1; return;
    }
    A.st[i] = 2; A.fwd[i] = 0;
    if (now) { let guard = 40; while (A.st[i] === 2 && guard-- > 0) settleStep(i, 200); }
  }
  // one step of spreading out (dist metres at most); returns the metres used
  function settleStep(i, dist) {
    const e = A.e[i]; if (e < 0) { A.st[i] = 3; return 0; }
    const L = EL[e], left = L - A.s[i], use = Math.min(dist, A.setl[i], left);
    A.s[i] += use; A.setl[i] -= use;
    if (A.setl[i] <= 0.01) { A.st[i] = 3; return use; }
    if (A.s[i] >= L - 0.01) {
      const k = anyNb(A.b[i], A.a[i], WOK, lineEdge);
      if (k < 0) { A.st[i] = 3; A.s[i] = L * 0.6; return use; }
      A.a[i] = A.b[i]; A.b[i] = NB[k]; A.e[i] = NE[k]; A.s[i] = 0;
    }
    return use;
  }

  // ------------------------------------------------------------------------------------------------ moving, each frame
  let clock = 0, shown = 0;
  const DISP = { k: 1 };
  // dtR: real seconds; simRate: simulated seconds per real second while a run plays (0 when paused or before Play);
  // camDist: the camera's distance (the eye's pace cap); near: how much the figures show (0 dots .. 1 figures)
  function step(dtR, simRate, camDist) {
    if (!A) return;
    clock += dtR; pumpRoutes(LOD2 ? 25000 : 80000);
    const cap = Math.max(5, camDist * 0.11);      // never faster on screen than about a tenth of the view a second
    // which edges a crowd is standing on (cars stop there; other crowds do not cross a police line)
    if (!crowdEdge || crowdEdge.length !== NEDGE) { crowdEdge = new Uint8Array(NEDGE); lineEdge = new Uint8Array(NEDGE); }
    crowdEdge.fill(0); lineEdge.fill(0);
    for (let i = 0; i < A.n; i++) { if (A.st[i] < 2 || A.st[i] > 3 || A.e[i] < 0) continue; if (A.kind[i] === 0 || A.kind[i] === 4) crowdEdge[A.e[i]] = 1; else if (A.line[i] >= 0 && A.kind[i] <= 3) lineEdge[A.e[i]] = 1; }
    for (let h = 0; h < LINE.length; h++) if (LINE[h]) lineEdge[LINE[h].e] = 1;
    for (let i = 0; i < A.n; i++) {
      const st = A.st[i]; if (!st) continue;
      const kind = A.kind[i];
      let vReal = 0;
      if (st === 1) {      // walking to its destination along its route
        if (!A.path[i] && !A.rq[i]) needRoute(i);
        const vSim = (kind === 0 || kind === 4 ? (crowdSize && crowdSize[A.hex[i]] > 40 ? SPEED.march : SPEED.walk) : SPEED.police) * A.sp[i];
        const v = Math.min(simRate > 0 ? vSim * simRate : vSim * DISP.k, cap) * A.sp[i];
        let dist = v * dtR; vReal = v;
        let guard = 12;
        while (dist > 0 && guard-- > 0) {
          const e = A.e[i]; if (e < 0) { hide(i); break; }
          const L = EL[e], left = L - A.s[i];
          if (dist < left) { A.s[i] += dist; dist = 0; break; }
          dist -= left; A.s[i] = L;
          const u = A.b[i];
          if (u === A.dst[i]) { arrive(i, false); break; }
          const P = A.path[i];
          if (!P) { A.wait[i] += dtR; if (A.wait[i] > 6) leave(i, false); vReal = 0; break; }      // its route is not ready yet: it waits
          if (P[A.pi[i]] !== u) { const at = P.indexOf(u, A.pi[i]); if (at < 0) { needRoute(i); vReal = 0; break; } A.pi[i] = at; }
          const nx = P[A.pi[i] + 1]; if (nx === undefined) { arrive(i, false); break; }
          const e2 = edgeBetween(u, nx); if (e2 < 0) { needRoute(i); vReal = 0; break; }
          A.pi[i]++; A.a[i] = u; A.b[i] = nx; A.e[i] = e2; A.s[i] = 0;
        }
      } else if (st === 2) { const v = Math.min(simRate > 0 ? SPEED.walk * simRate : SPEED.walk * DISP.k, cap); settleStep(i, v * dtR); vReal = v; }
      else if (st === 4) {      // going home: into the side streets, then gone
        const v = Math.min(simRate > 0 ? SPEED.walk * simRate : SPEED.walk * DISP.k, cap); vReal = v;
        const used = settleStep(i, v * dtR); A.setl[i] = Math.max(0, A.setl[i]); A.st[i] = 4;
        if (A.setl[i] <= 0.5 || used === 0) { A.al[i] -= dtR * 1.5; if (A.al[i] <= 0) hide(i); }
      }
      if (st !== 4 && A.al[i] < 1) A.al[i] = Math.min(1, A.al[i] + dtR * 1.2);
      // the point on the street: along the edge, and across it inside the street's width
      const e = A.e[i]; if (e < 0) continue;
      const a = A.a[i], b = A.b[i], L = EL[e], u = L ? A.s[i] / L : 0;
      const dx = (NX[b] - NX[a]) / L, dy = (NY[b] - NY[a]) / L, hw = HALFW[ET[e]] * 0.92 * (WF ? WF[e] : 1);
      A.x[i] = NX[a] + (NX[b] - NX[a]) * u - dy * A.lat[i] * hw; A.y[i] = NY[a] + (NY[b] - NY[a]) * u + dx * A.lat[i] * hw;
      let hd = Math.atan2(dx, dy);
      if (A.st[i] === 3 && kind >= 1 && kind <= 3 && A.line[i] >= 0) hd = Math.atan2(dx, dy);      // the line faces the crowd (back -> front)
      else if (A.st[i] === 3) hd = Math.atan2(dx, dy) + Math.PI * (hash(i, 41) < 0.5 ? 1 : 0) + (hash(i, 43) - 0.5) * 1.2;
      A.hd[i] = hd; A.v[i] = vReal;
    }
    stepTraffic(dtR, camDist);
  }

  // ------------------------------------------------------------------------------------------------ drawing
  let near = 0;
  let focus = [0, 0];
  function draw(camDist, scale, t, dtR, fxy) {
    if (fxy) focus = fxy;
    if (!A) return;
    // figures up close, dots from afar: figures fade in under 1.4 km and are fully in under 0.9 km
    near = clamp((1500 - camDist) / 600, 0, 1);
    const d = A.dots, pos = d.pos, al = d.al; shown = 0;
    for (let i = 0; i < A.n; i++) {
      const vis = A.st[i] ? A.al[i] : 0;
      pos[i * 3] = A.x[i]; pos[i * 3 + 1] = 2.2; pos[i * 3 + 2] = -A.y[i]; al[i] = vis * (1 - near * 0.85);
      if (vis > 0.05) shown++;
    }
    d.ge.attributes.position.needsUpdate = true; d.ge.attributes.al.needsUpdate = true;
    // THE CLOSE-UP CROWD: near the camera each figure of the people is drawn as a knot of KNOT figures across the street's
    // width, so a street-level view shows a crowd, not a scatter (the far view and the audit use the walkers themselves)
    if (POOL && near > 0.02) {
      const c = POOL, cnt = c.count, fx = focus[0], fy = focus[1], R2 = (camDist * 1.6) ** 2; let w = 0;
      for (let i = kindStart[0]; i < kindStart[0] + kindN[0] && w + KNOT <= cnt; i++) {
        if (!A.st[i] || A.al[i] < 0.05 || A.e[i] < 0) continue;
        if ((A.x[i] - fx) ** 2 + (A.y[i] - fy) ** 2 > R2) continue;
        const e = A.e[i], a = A.a[i], b = A.b[i], L = EL[e], dx = (NX[b] - NX[a]) / L, dy = (NY[b] - NY[a]) / L, hw = HALFW[ET[e]] * 0.92 * (WF ? WF[e] : 1);
        for (let j = 0; j < KNOT; j++, w++) {
          const along = (hash(i, 61 + j) - 0.5) * 9, lat = clamp(A.lat[i] + (hash(i, 71 + j) - 0.5) * 0.9, -1, 1) - A.lat[i];
          c.px[w] = A.x[i] + dx * along - dy * lat * hw; c.pz[w] = -(A.y[i] + dy * along + dx * lat * hw);
          c.heading[w] = A.hd[i] + (A.v[i] > 0.05 ? 0 : (hash(i, 81 + j) - 0.5) * 2.4); c.spd[w] = A.v[i] > 0.05 ? Math.min(A.v[i], 4) : 0;
          c.vs[w] = scale * Math.min(1, A.al[i] * 1.5) * near;
        }
      }
      for (; w < cnt; w++) c.vs[w] = 0;
      c.update(dtR, t);
    } else if (POOL) { for (let w = 0; w < POOL.count; w++) POOL.vs[w] = 0; POOL.update(dtR, t); }
    for (let k = 0; k < crowds.length; k++) {
      const c = crowds[k]; if (!c || (k === 0 && POOL)) continue; const s0 = kindStart[k];
      for (let j = 0; j < c.count; j++) {
        const i = s0 + j, vis = A.st[i] ? A.al[i] : 0;
        c.px[j] = A.x[i]; c.pz[j] = -A.y[i]; c.heading[j] = A.hd[i]; c.spd[j] = A.v[i] > 0.05 ? Math.min(A.v[i], 4) : 0;
        c.vs[j] = near > 0.02 && vis > 0.02 ? scale * Math.min(1, vis * 1.5) * near : 0;
      }
      c.update(dtR, t);
    }
    drawTraffic(camDist, t);
  }

  // ------------------------------------------------------------------------------------------------ the traffic
  // Cars drive on the right, in their lane, at their street's speed (in real time up close; a little faster from afar so
  // the city still moves), keep about 8 m to the car ahead, wait at the end of their street when the next one is held by
  // a crowd or a police line, and blink their hazards when they are stuck by a crowd.
  let T = null;
  function buildTraffic(n) {
    const dn = []; for (let e = 0; e < NEDGE; e++) if (ET[e] <= 2 && DOK[EA[e]] && DOK[EB[e]]) dn.push(e);
    if (!dn.length || !n) { T = null; return; }
    T = { n, e: new Int32Array(n), a: new Int32Array(n), b: new Int32Array(n), s: new Float32Array(n), v: new Float32Array(n), stop: new Float32Array(n), x: new Float32Array(n), y: new Float32Array(n), hd: new Float32Array(n), on: new Float32Array(n), dens: 1, hz: new Uint8Array(n) };
    for (let i = 0; i < n; i++) { const e = dn[Math.floor(hash(i, 51) * dn.length)], f = hash(i, 52) < 0.5; T.e[i] = e; T.a[i] = f ? EA[e] : EB[e]; T.b[i] = f ? EB[e] : EA[e]; T.s[i] = hash(i, 53) * EL[e]; T.v[i] = 0; }
    // drawn as small boxes in quiet greys (instanced), a point each from afar
    const geo = new THREE.BoxGeometry(1.8, 1.5, 4.4); geo.translate(0, 0.75, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.25 });
    const im = new THREE.InstancedMesh(geo, mat, n); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false;
    const c = new THREE.Color(); for (let i = 0; i < n; i++) { const g = COL.carGreys[Math.floor(hash(i, 54) * COL.carGreys.length)]; c.setHex(g); im.setColorAt(i, c); }
    add(im); T.im = im;
    const pos = new Float32Array(n * 3), al = new Float32Array(n), hz = new Float32Array(n * 3), hzA = new Float32Array(n);
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); ge.setAttribute('al', new THREE.BufferAttribute(al, 1).setUsage(THREE.DynamicDrawUsage));
    const pm = new THREE.ShaderMaterial({ uniforms: { uPx: cfg.uPx, uC: { value: new THREE.Color(COL.traffic) } },
      vertexShader: 'attribute float al; uniform float uPx; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(5.0 * uPx / -mv.z, 1.4, 3.0); vA = al; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uC; varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; if (dot(d, d) > 0.25 || vA < 0.01) discard; gl_FragColor = vec4(uC, vA * 0.75); }', transparent: true, depthWrite: false });
    const pts = new THREE.Points(ge, pm); pts.frustumCulled = false; add(pts); T.pts = { ge, pos, al };
    const hge = new THREE.BufferGeometry(); hge.setAttribute('position', new THREE.BufferAttribute(hz, 3).setUsage(THREE.DynamicDrawUsage)); hge.setAttribute('al', new THREE.BufferAttribute(hzA, 1).setUsage(THREE.DynamicDrawUsage));
    const hm = new THREE.ShaderMaterial({ uniforms: { uPx: cfg.uPx }, vertexShader: 'attribute float al; uniform float uPx; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(9.0 * uPx / -mv.z, 2.0, 7.0); vA = al; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vA; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25 || vA < 0.01) discard; gl_FragColor = vec4(1.0, 0.62, 0.15, vA * smoothstep(0.25, 0.0, r)); }', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const hp = new THREE.Points(hge, hm); hp.frustumCulled = false; add(hp); T.hz3 = { ge: hge, pos: hz, al: hzA };
  }
  function setTraffic(dens) { if (T) T.dens = dens; }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
  function stepTraffic(dtR, camDist) {
    if (!T) return;
    const k = clamp(camDist / 700, 1, 5);      // real time up close
    // the order on each street, by direction: who is ahead of whom
    const lanes = new Map();
    for (let i = 0; i < T.n; i++) { const kk = T.e[i] * 2 + (T.a[i] === EA[T.e[i]] ? 0 : 1); let l = lanes.get(kk); if (!l) lanes.set(kk, l = []); l.push(i); }
    for (const l of lanes.values()) if (l.length > 1) l.sort((p, q) => T.s[q] - T.s[p]);
    for (const l of lanes.values()) {
      for (let r = 0; r < l.length; r++) {
        const i = l[r], e = T.e[i], L = EL[e], vmax = SPEED.car[ET[e]] * (0.85 + 0.3 * hash(i, 55));
        let limit = L;      // how far along it may go this frame
        if (r > 0) limit = Math.min(limit, T.s[l[r - 1]] - 8);
        const onCrowd = crowdEdge && (crowdEdge[e] || lineEdge[e]);
        if (onCrowd) limit = Math.min(limit, T.s[i]);      // stuck in a crowd: it stays where it is
        // the street ahead held by a crowd or a line: wait at the end of this one
        const nx = T.next ? T.next[i] : -1;
        let want = vmax;
        if (T.s[i] + 25 > limit) want = Math.max(0, (limit - T.s[i]) * 0.8);
        T.v[i] += (want - T.v[i]) * Math.min(1, dtR * 2.5);
        const go = Math.max(0, Math.min(T.v[i] * dtR * k, limit - T.s[i]));
        T.s[i] += go; T.hz[i] = onCrowd || (T.v[i] < 0.5 && T.stop[i] > 2 && nearCrowd(i)) ? 1 : 0;
        T.stop[i] = T.v[i] < 0.5 ? T.stop[i] + dtR : 0;
        if (T.s[i] >= L - 0.05) {      // at the junction: on to another street (never straight back, never into a held one)
          const u = T.b[i]; const c = OFF[u + 1] - OFF[u]; let pick = -1;
          for (let t = 0; t < c; t++) {
            const kk = OFF[u] + (Math.floor(hash(i, clock * 3) * c) + t) % c, v = NB[kk], e2 = NE[kk];
            if (v === T.a[i] || ET[e2] > 2 || !DOK[v]) continue;
            if (crowdEdge && (crowdEdge[e2] || lineEdge[e2])) continue;
            if (COV && (COV[e2] || WF[e2] < 0.2)) continue;      // under a building, or narrower than a lane
            pick = kk; break;
          }
          if (pick < 0) {      // only the way back is open, or everything ahead is held
            if (T.stop[i] > 6 || c === 1) { const e0 = T.e[i]; T.a[i] = u; T.b[i] = (EA[e0] === u ? EB[e0] : EA[e0]); T.s[i] = 0; }
          } else { T.a[i] = u; T.b[i] = NB[pick]; T.e[i] = NE[pick]; T.s[i] = 0; }
        }
      }
    }
    for (let i = 0; i < T.n; i++) {
      const e = T.e[i], a = T.a[i], b = T.b[i], L = EL[e], dx = (NX[b] - NX[a]) / L, dy = (NY[b] - NY[a]) / L, u = T.s[i] / L, off = LANE[ET[e]] * Math.max(0.25, WF ? WF[e] : 1);
      // drive on the right: the right of travel direction (dx, dy) is (dy, -dx)
      T.x[i] = NX[a] + (NX[b] - NX[a]) * u + dy * off; T.y[i] = NY[a] + (NY[b] - NY[a]) * u - dx * off; T.hd[i] = Math.atan2(dx, dy);
      const want = i < T.n * T.dens ? 1 : 0; T.on[i] += (want - T.on[i]) * Math.min(1, dtR * 1.5);
    }
  }
  function nearCrowd(i) { const b = T.b[i]; for (let k = OFF[b]; k < OFF[b + 1]; k++) if (crowdEdge[NE[k]]) return true; return false; }
  function drawTraffic(camDist, t) {
    if (!T) return;
    const close = camDist < 2600, P = T.pts, H = T.hz3; let any = false;
    for (let i = 0; i < T.n; i++) {
      const on = T.on[i] > 0.5;
      _e.set(0, T.hd[i], 0); _q.setFromEuler(_e); _p.set(T.x[i], 0, -T.y[i]); _s.setScalar(on && close ? 1 : 0);
      _m.compose(_p, _q, _s); T.im.setMatrixAt(i, _m);
      P.pos[i * 3] = T.x[i]; P.pos[i * 3 + 1] = 1.2; P.pos[i * 3 + 2] = -T.y[i]; P.al[i] = close ? 0 : T.on[i];
      H.pos[i * 3] = T.x[i]; H.pos[i * 3 + 1] = 2.2; H.pos[i * 3 + 2] = -T.y[i]; H.al[i] = T.hz[i] && on && (Math.sin(t * 6 + i) > 0) ? 0.9 : 0; if (H.al[i]) any = true;
    }
    T.im.instanceMatrix.needsUpdate = true; P.ge.attributes.position.needsUpdate = true; P.ge.attributes.al.needsUpdate = true;
    H.ge.attributes.position.needsUpdate = true; H.ge.attributes.al.needsUpdate = true;
  }

  // ------------------------------------------------------------------------------------------------ the forces' vehicles
  // Water cannon, patrol cars, Basij motorbikes (in groups), armoured cars: kit models that drive along the streets from
  // their bases to the back of the line, and park there.
  const VEH = [];
  function addVehicle(obj, lv, kind) { VEH.push({ o: obj, lv, kind, a: -1, b: -1, e: -1, s: 0, dst: -1, on: false, x: 0, y: 0, hd: 0, park: 0, base: obj.scale.x }); obj.visible = false; }
  function planVehicles(order, level, jump) {
    let vi = 0;
    for (const v of VEH) {
      const ok = v.lv <= Math.max(1, level) && order.length > 0;
      if (!ok) { v.on = false; v.o.visible = false; continue; }
      const h = order[Math.floor(vi / (v.kind === 'bike' ? 3 : 1)) % order.length]; vi++;
      const ln = lineOf(h); const dst = ln ? ln.back : GATHER[h]; if (dst < 0) { v.on = false; v.o.visible = false; continue; }
      if (v.dst === dst && v.on) continue;
      const ok2 = v.kind === 'bike' ? WOK : DOK;
      if (!v.on || jump) { let st = baseFor(v.kind === 'bike' ? 'basij' : 'riot', h); if (st < 0 || !ok2[st]) st = nearestNode(NX[dst] + 300, NY[dst], ok2, 3000); if (st < 0) continue; const k = anyNb(st, -1, ok2); if (k < 0) continue; v.a = st; v.b = NB[k]; v.e = NE[k]; v.s = 0; }
      v.dst = dst; v.on = true; v.park = 10 + (vi % 4) * 9; v.mode = v.kind === 'bike' ? 'w' : 'd'; v.path = astar(v.b, dst, v.mode, 50000)[0]; v.pi = 0;
      if (jump) { const k = anyNb(dst, -1, ok2); if (k >= 0) { v.a = NB[k]; v.b = dst; v.e = NE[k]; v.s = Math.max(0, EL[v.e] - v.park); } v.done = true; } else v.done = false;
    }
  }
  function stepVehicles(dtR, simRate, camDist, scale) {
    const cap = Math.max(8, camDist * 0.14);
    for (const v of VEH) {
      if (!v.on) { v.o.visible = false; continue; }
      if (!v.done) {
        const vs = (v.kind === 'bike' ? SPEED.bike : SPEED.car[1]);
        let dist = Math.min(simRate > 0 ? vs * simRate : vs, cap) * dtR, guard = 10;
        while (dist > 0 && guard-- > 0) {
          const L = EL[v.e], stopAt = v.b === v.dst ? Math.max(0, L - v.park) : L, left = stopAt - v.s;
          if (dist < left) { v.s += dist; break; }
          v.s = stopAt; dist -= left; if (v.b === v.dst) { v.done = true; break; }
          const P = v.path; if (!P) break; if (P[v.pi] !== v.b) { const at = P.indexOf(v.b); if (at < 0) break; v.pi = at; }
          const nx = P[v.pi + 1]; if (nx === undefined) { v.done = true; break; } const e2 = edgeBetween(v.b, nx); if (e2 < 0) break; v.pi++; v.a = v.b; v.b = nx; v.e = e2; v.s = 0;
        }
      }
      const e = v.e; if (e < 0) continue; const a = v.a, b = v.b, L = EL[e], dx = (NX[b] - NX[a]) / L, dy = (NY[b] - NY[a]) / L, u = v.s / L, off = (v.kind === 'bike' ? LANE[ET[e]] * 0.6 : LANE[ET[e]]) * Math.max(0.25, WF ? WF[e] : 1);
      v.x = NX[a] + (NX[b] - NX[a]) * u + dy * off; v.y = NY[a] + (NY[b] - NY[a]) * u - dx * off; v.hd = Math.atan2(dx, dy);
      v.o.position.set(v.x, 0, -v.y); v.o.rotation.y = v.hd + Math.PI; v.o.scale.setScalar(v.base * scale); v.o.visible = camDist < 3200;
    }
  }

  // ------------------------------------------------------------------------------------------------ the audit
  // Counted, not judged: what the phone test and the street check fail on.
  function audit() {
    const out = { figures: 0, offStreet: 0, inBuilding: 0, cars: 0, wrongLane: 0, carsInCrowd: 0, maxWalk: SPEED.run, maxCar: Math.max(...SPEED.car), speeds: SPEED, nodes: N, edges: NEDGE, buildings: BLD.length, localBuildings: LBLD.length, examples: [] };
    if (!A) return out;
    for (let i = 0; i < A.n; i++) {
      if (!A.st[i] || A.al[i] < 0.05 || A.e[i] < 0) continue; out.figures++;
      const [d, t] = roadDist(A.x[i], A.y[i]);
      if (d > HALFW[t] + 0.75) { out.offStreet++; if (out.examples.length < 6) out.examples.push(['off', A.kind[i], Math.round(A.x[i]), Math.round(A.y[i]), +d.toFixed(1)]); }
      if (inBuilding(A.x[i], A.y[i]) >= 0) { out.inBuilding++; if (out.examples.length < 6) out.examples.push(['bld', A.kind[i], Math.round(A.x[i]), Math.round(A.y[i])]); }
    }
    if (POOL) for (let w = 0; w < POOL.count; w += 3) { if (!POOL.vs[w]) continue; out.closeUp = (out.closeUp || 0) + 1; if (inBuilding(POOL.px[w], -POOL.pz[w]) >= 0) { out.inBuilding++; if (out.examples.length < 6) out.examples.push(['pool', Math.round(POOL.px[w]), Math.round(-POOL.pz[w])]); } }
    if (T) for (let i = 0; i < T.n; i++) {
      if (T.on[i] < 0.5) continue; out.cars++;
      const a = T.a[i], b = T.b[i], dx = NX[b] - NX[a], dy = NY[b] - NY[a];
      // which side of its own street's centre line the car is on, measured from its place and its heading
      const hx = Math.sin(T.hd[i]), hy = Math.cos(T.hd[i]), cross = hx * (T.y[i] - NY[a]) - hy * (T.x[i] - NX[a]);
      if (cross >= 0 || (dx * hx + dy * hy) <= 0) out.wrongLane++;      // left of its direction of travel, or driving backwards
      if (inBuilding(T.x[i], T.y[i]) >= 0) { out.inBuilding++; out.examples.unshift(['car', Math.round(T.x[i]), Math.round(T.y[i]), T.e[i], COV ? COV[T.e[i]] : -1, WF ? +WF[T.e[i]].toFixed(2) : -1, +T.s[i].toFixed(1), +EL[T.e[i]].toFixed(1), inBuilding(T.x[i], T.y[i]) >= 1e6 ? 'local' : 'mapped']); }
    }
    // the forces' own vehicles: on their streets, on the right, never in a building
    for (const v of VEH) {
      if (!v.on || v.e < 0) continue; out.vehicles = (out.vehicles || 0) + 1;
      const hx = Math.sin(v.hd), hy = Math.cos(v.hd), cross = hx * (v.y - NY[v.a]) - hy * (v.x - NX[v.a]);
      if (cross >= 0) out.wrongLane++;
      if (inBuilding(v.x, v.y) >= 0) { out.inBuilding++; out.examples.unshift(['veh', v.kind, Math.round(v.x), Math.round(v.y)]); }
    }
    return out;
  }

  return {
    build, buildTraffic, setTraffic, markCovered, inBuildingAt: (x, y) => inBuilding(x, y) >= 0, setLocalBuildings, get localN() { return LBLD.length; }, makeAgents, setGathering, setBases, setCrowdSize, plan, step, draw, audit, addBuildings, clearBuildings, clearOfRoads, roadDist,
    nearestNode, addVehicle, planVehicles, stepVehicles, lineOf, pathXY,
    get gather() { return GATHER; }, get A() { return A; }, get T() { return T; }, get VEH() { return VEH; }, get N() { return N; }, get near() { return near; }, get shown() { return shown; },
    node: n => [NX[n], NY[n]], SPEED, DISP, KINDS,
    reset() { if (A) for (let i = 0; i < A.n; i++) hide(i); for (const v of VEH) { v.on = false; v.o.visible = false; } VEH.length = 0; LINE = new Array(B ? B.hex.x.length : 0).fill(null); },
    resetVehicles() { VEH.length = 0; },
  };
}
