/* SIMKIT land.js (military ground forces and every site on the theatre maps): see build/simkit/SIMKIT.md for the contract and the type list this file owns.
   Built from shared helpers below (truck, tracked hull, canister packs, berms, tank farms, stacks, city clusters). Vehicles are real-size metres;
   inside a site, the vehicles and aircraft are drawn about 2x so they still read at the size a board draws a site (a miniature diorama). */
export default function register(K) {
  const T = K.T, C = K.C, P = K.part, add = K.add;
  const PI = Math.PI, H = PI / 2;

  // ------------------------------------------------------------------ extra real finishes (K.C first; these fill gaps)
  const X = {
    ir: 0xb9a47a, irGreen: 0x5d6447, us: C.desert, usGreen: 0x59603f, il: C.israel, ru: 0x525c3b, ua: 0x58613f, cn: 0x5e6a4a, tw: 0x55603f,
    earth: 0x8b7a5a, earthDark: 0x6f6148, rock: 0x857a69, rockDark: 0x625a4f, sandG: 0xcdb991, water: 0x2f596b, waterDeep: 0x274a5a, grass: 0x5b6a40,
    tankW: 0xe2dfd5, pipe: 0x9b9386, lime: 0xddd2b6, beige: 0xcdb48f, beige2: 0xb9a07c, redB: 0xb3402f, orange: 0xe2802e, conc: C.concrete,
    pad: 0x8d8a83, padDark: 0x6c6a66, glassT: 0x6f95ad, glassG: 0x5d8a7e, roofRed: 0xa34a36, roofGrey: 0x5f6266, copper: 0x5f9e88, stripeW: 0xf2f0e6,
    flame: 0xffa040, flameCore: 0xfff0b0, win: 0xffd27a, winCool: 0xbfe0ff
  };

  // ------------------------------------------------------------------ unit geometries, scaled per part (cheap, no per-part geometry build)
  const BX = P.box(1, 1, 1);
  const CU = {}; const cu = (s) => CU[s] || (CU[s] = P.cyl(1, 1, 1, s));
  const FRU = {}; const fru = (t) => { if (!FRU[t]) { const g = P.cyl(t, 1, 1, 4); g.rotateY(PI / 4); FRU[t] = g; } return FRU[t]; };
  const HEM = {}; const hemu = (s) => HEM[s] || (HEM[s] = P.hemi(1, s));
  const SPH = {}; const sphu = (s) => SPH[s] || (SPH[s] = P.sphere(1, s, Math.max(3, s >> 1)));

  // box centred at x,y,z
  function b(l, w, h, d, c, x, y, z, rx, ry, rz) { return add(l, BX, c, [x || 0, y || 0, z || 0], [rx || 0, ry || 0, rz || 0], [w, h, d]); }
  // box standing on y0
  function bs(l, w, h, d, c, x, y0, z, ry) { return add(l, BX, c, [x || 0, (y0 || 0) + h / 2, z || 0], [0, ry || 0, 0], [w, h, d]); }
  // vertical cylinder centred at x,y,z
  function cy(l, r, h, c, x, y, z, rx, ry, rz, s) { return add(l, cu(s || 8), c, [x || 0, y || 0, z || 0], [rx || 0, ry || 0, rz || 0], [r, h, r]); }
  // vertical cylinder standing on y0
  function cs(l, r, h, c, x, y0, z, s) { return add(l, cu(s || 8), c, [x || 0, (y0 || 0) + h / 2, z || 0], null, [r, h, r]); }
  // tapered cylinder standing on y0
  function ct(l, rt, rb, h, c, x, y0, z, s, ry) { return add(l, P.cyl(rt, rb, h, s || 8), c, [x || 0, (y0 || 0) + h / 2, z || 0], [0, ry || 0, 0]); }
  // cylinder lying along z (centre) / along x
  function cz(l, r, len, c, x, y, z, s) { return add(l, cu(s || 8), c, [x || 0, y || 0, z || 0], [H, 0, 0], [r, len, r]); }
  function cx(l, r, len, c, x, y, z, s) { return add(l, cu(s || 8), c, [x || 0, y || 0, z || 0], [0, 0, H], [r, len, r]); }
  // a rectangular frustum (earth berm, mound, roof): w x d at the base, top = t of the base, standing on y0
  function berm(l, w, h, d, c, x, y0, z, ry, t) { return add(l, fru(t == null ? 0.7 : t), c, [x || 0, (y0 || 0) + h / 2, z || 0], [0, ry || 0, 0], [w / 1.4142, h, d / 1.4142]); }
  function dome(l, r, c, x, y0, z, s, sy) { return add(l, hemu(s || 10), c, [x || 0, y0 || 0, z || 0], null, [r, r * (sy || 1), r]); }
  function ball(l, r, c, x, y, z, s) { return add(l, sphu(s || 8), c, [x || 0, y || 0, z || 0], null, [r, r, r]); }
  function wheel(l, x, z, r, w, s) { return cy(l, r, w, C.rubber, x, r, z, 0, 0, H, s || 8); }
  // a long thin member from point a to point b (pipes, wires, lattice legs, cables) as a box
  const _va = new T.Vector3(), _vb = new T.Vector3();
  function beam(l, ax, ay, az, bx, by, bz, t, c) {
    _va.set(bx - ax, by - ay, bz - az); const len = _va.length(); if (len < 1e-6) return l;
    const ry = Math.atan2(_va.x, _va.z), rx = -Math.atan2(_va.y, Math.hypot(_va.x, _va.z));
    const E = new T.Euler(rx, ry, 0, 'YXZ'), M = new T.Matrix4().makeRotationFromEuler(E);
    M.scale(_vb.set(t, t, len)); M.setPosition((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    const g = BX.toNonIndexed(); g.applyMatrix4(M); l.push({ g, c: new T.Color(c) }); return l;
  }
  function mark(L, x, y, z, w, d) { return b(L.team, Math.min(0.7, (w || 1) * 0.7), 0.06, Math.min(0.7, (d || 1) * 0.7), null, x, y, z); }
  // a flag on a pole in the side's colour (sites)
  function flag(L, x, z, h, s) { s = s || 1; b(L.metal, 0.25 * s, h, 0.25 * s, C.steel, x, h / 2, z); b(L.team, 0.12 * s, 2.2 * s, 3.6 * s, null, x, h - 1.3 * s, z + 1.9 * s); }
  // deterministic random (layouts must not change between builds)
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // move a whole parts-lists set into another (place a sub-model inside a site): position, yaw, uniform scale
  function place(dst, src, x, y, z, ry, s) {
    const M = new T.Matrix4().compose(new T.Vector3(x || 0, y || 0, z || 0), new T.Quaternion().setFromEuler(new T.Euler(0, ry || 0, 0)), new T.Vector3(s || 1, s || 1, s || 1));
    Object.keys(src).forEach((k) => src[k].forEach((p) => { p.g.applyMatrix4(M); dst[k].push(p); }));
    return dst;
  }
  // a moving child: build into fresh lists with fn(M), group it, position it
  function moving(root, team, name, fn, x, y, z, ry) {
    const M = K.lists(); fn(M); const g = K.group(M, team, name); g.position.set(x || 0, y || 0, z || 0); g.rotation.order = 'YXZ'; g.rotation.y = ry || 0; g.userData.ry = ry || 0; root.add(g); return g;
  }

  // ------------------------------------------------------------------ animation helpers (no allocation)
  const ss = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  function cyc(t, per) { const p = (((t % per) + per) % per) / per; return p < 0.12 ? 0 : p < 0.32 ? ss((p - 0.12) / 0.2) : p < 0.78 ? 1 : p < 0.95 ? 1 - ss((p - 0.78) / 0.17) : 0; }
  function kid(o, n) { const c = o.children; for (let i = 0; i < c.length; i++) if (c[i].name === n) return c[i]; return null; }
  // every direct child called name: f(child, index, t)
  const A = {
    spin: (name, speed) => (o, dt, t) => { const c = o.children; for (let i = 0; i < c.length; i++) if (c[i].name === name) c[i].rotation.y = c[i].userData.ry + t * speed + i; },
    erect: (name, per, max, lag) => (o, dt, t) => { const c = o.children; let k = 0; for (let i = 0; i < c.length; i++) if (c[i].name === name) { c[i].rotation.x = -cyc(t + k * (lag || 0), per) * max; k++; } },
    slew: (name, amp, speed) => (o, dt, t) => { const c = o.children; let k = 0; for (let i = 0; i < c.length; i++) if (c[i].name === name) { c[i].rotation.y = c[i].userData.ry + amp * Math.sin(t * speed + k * 1.7); k++; } },
    nod: (name, amp, speed) => (o, dt, t) => { const c = o.children; let k = 0; for (let i = 0; i < c.length; i++) if (c[i].name === name) { c[i].rotation.x = amp * Math.sin(t * speed + k * 2.1); k++; } },
    flicker: (name) => (o, dt, t) => { const c = o.children; let k = 0; for (let i = 0; i < c.length; i++) if (c[i].name === name) { const f = 0.8 + 0.18 * Math.sin(t * 11 + k) + 0.12 * Math.sin(t * 23.7 + k * 3) + 0.08 * Math.sin(t * 5.3); c[i].scale.set(0.85 + 0.2 * Math.sin(t * 7 + k), f * 1.15, 0.85 + 0.2 * Math.cos(t * 9 + k)); k++; } },
    all: (...fs) => (o, dt, t, KK) => { for (let i = 0; i < fs.length; i++) fs[i](o, dt, t, KK); },
    // a nested child (turret > radar): spin a grandchild
    spinIn: (parent, name, speed) => (o, dt, t) => { const p = kid(o, parent); if (!p) return; const r = kid(p, name); if (r) r.rotation.y = t * speed; }
  };

  // ------------------------------------------------------------------ vehicle helpers
  // a cab with a raked windscreen (side outline extruded across), and its glass
  function cab(l, w, ch, cl, c, x, y0, zc) { return add(l, P.profile([[-cl / 2, 0], [cl / 2, 0], [cl / 2, ch * 0.5], [cl / 2 - 0.38, ch], [-cl / 2, ch]], w), c, [x, y0, zc]); }
  function cabGlass(l, w, ch, x, y0, zf) { const a = Math.atan2(0.38, ch * 0.5); return b(l, w, ch * 0.44, 0.06, C.glass, x, y0 + ch * 0.74, zf - 0.19 + 0.04, -a, 0, 0); }
  // a wheeled truck, cab at +z. o: { len, wid, axles:[z], r, col, cab:'flat'|'split'|'bonnet'|'none', cabLen, cabH, bonnet, lo }
  function truck(L, o) {
    const len = o.len, w = o.wid || 2.5, r = o.r || 0.55, col = o.col, fz = len / 2, fy = r * 1.15 + 0.2, lo = !!o.lo;
    b(L.solid, w * 0.62, 0.4, len * 0.96, C.dark, 0, fy - 0.2, -len * 0.01);
    const wx = w / 2 - 0.25, ws = lo ? 6 : 8;
    o.axles.forEach((z) => {
      [1, -1].forEach((s) => { wheel(L.solid, s * wx, z, r, 0.46, ws); if (!lo) cy(L.metal, r * 0.42, 0.5, C.steel, s * wx, r, z, 0, 0, H, 6); });
      if (!lo) { b(L.solid, 0.56, 0.08, r * 2.2, col, wx, r * 2 + 0.1, z); K.mirror(L.solid, 1); }
    });
    const cl = o.cabLen || 2.3, ch = o.cabH || 2.0; let back = fz - cl;
    if (o.cab === 'split') {
      [1, -1].forEach((s) => { cab(L.solid, w * 0.34, ch, cl, col, s * w * 0.33, fy, fz - cl / 2); cabGlass(L.glass, w * 0.27, ch, s * w * 0.33, fy, fz); });
      bs(L.solid, w * 0.3, ch * 0.5, cl * 0.96, col, 0, fy, fz - cl / 2);
    } else if (o.cab === 'bonnet') {
      const bl = o.bonnet || 1.6;
      bs(L.solid, w * 0.78, ch * 0.56, bl, col, 0, fy, fz - bl / 2); if (!lo) b(L.solid, w * 0.6, ch * 0.4, 0.06, C.dark, 0, fy + ch * 0.28, fz + 0.01);
      cab(L.solid, w, ch, cl, col, 0, fy, fz - bl - cl / 2); cabGlass(L.glass, w * 0.86, ch, 0, fy, fz - bl);
      back = fz - bl - cl;
    } else if (o.cab !== 'none') {
      cab(L.solid, w, ch, cl, col, 0, fy, fz - cl / 2); cabGlass(L.glass, w * 0.86, ch, 0, fy, fz);
      if (!lo) { b(L.glass, 0.06, ch * 0.36, cl * 0.42, C.glass, w / 2 + 0.01, fy + ch * 0.68, fz - cl * 0.3); K.mirror(L.glass, 1); b(L.solid, w, 0.3, 0.25, C.dark, 0, fy - 0.05, fz + 0.1); }
    }
    return { y: fy, back, front: fz, w, cabTop: fy + ch };
  }
  // a tracked hull, front at +z. o: { len, wid, n, r, col, h, tw, glacis, rear, skirt, ws }
  function tracked(L, o) {
    const len = o.len, w = o.wid, r = o.r || 0.38, n = o.n || 6, tw = o.tw || 0.62, col = o.col;
    const tx = w / 2 - tw / 2, top = 2 * r + 0.24, h = o.h || 0.9, span = len * 0.76, ws = o.ws || 8;
    [1, -1].forEach((s) => {
      for (let i = 0; i < n; i++) cy(L.solid, r, tw * 0.86, C.dark, s * tx, r + 0.04, -span / 2 + (span * i) / (n - 1), 0, 0, H, ws);
      cy(L.solid, r * 0.78, tw * 0.8, C.dark, s * tx, r + 0.34, len * 0.45, 0, 0, H, 6); cy(L.solid, r * 0.72, tw * 0.8, C.dark, s * tx, r + 0.3, -len * 0.45, 0, 0, H, 6);
      b(L.solid, tw, 0.1, span + r * 1.6, C.rubber, s * tx, 0.05, 0); b(L.solid, tw, 0.1, len * 0.95, C.rubber, s * tx, top - 0.08, 0);
      if (o.skirt) b(L.solid, 0.1, o.skirt, len * 0.9, col, s * (w / 2 + 0.03), top - o.skirt / 2 + 0.14, 0.05);
    });
    b(L.solid, w - 2 * tw + 0.05, top - 0.3, len * 0.86, col, 0, 0.3 + (top - 0.3) / 2, 0);
    const g = o.glacis || 1.6, rr = o.rear || 0.4;
    add(L.solid, P.profile([[-len / 2, top - 0.1], [len / 2 - 0.15, top - 0.1], [len / 2, top + 0.12], [len / 2 - g, top + h], [-len / 2 + rr, top + h], [-len / 2, top + h - 0.35]], w), col);
    return { top: top + h, tx, tw, len };
  }
  // a gun barrel along +z from z0
  function barrel(l, r, len, c, y, z0, bulge) { cz(l, r, len, c, 0, y, z0 + len / 2, 8); if (bulge) cz(l, r * 1.7, len * 0.08, c, 0, y, z0 + len * bulge, 8); return l; }
  // a pack of box canisters lying along +z from z0..z0+len (cols across x, rows up y), end caps lighter
  function boxPack(l, cols, rows, cw, chh, len, col, cap, gap, y0, z0) {
    gap = gap || 0.05; y0 = y0 || 0; z0 = z0 || 0;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = (i - (cols - 1) / 2) * (cw + gap), y = y0 + chh / 2 + j * (chh + gap);
      b(l, cw, chh, len, col, x, y, z0 + len / 2); if (cap != null) b(l, cw * 0.82, chh * 0.82, 0.06, cap, x, y, z0 + len + 0.03);
    }
    return { w: cols * (cw + gap), h: rows * (chh + gap) };
  }
  function tubePack(l, cols, rows, rr, len, col, cap, gap, y0, z0, s) {
    gap = gap || 0.06; y0 = y0 || 0; z0 = z0 || 0;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = (i - (cols - 1) / 2) * (2 * rr + gap), y = y0 + rr + j * (2 * rr + gap);
      cz(l, rr, len, col, x, y, z0 + len / 2, s || 8); if (cap != null) cz(l, rr * 0.8, 0.06, cap, x, y, z0 + len + 0.03, s || 8);
    }
    return { w: cols * (2 * rr + gap), h: rows * (2 * rr + gap) };
  }
  // a flat phased-array face (w x h) tilted back by tilt, standing with its bottom edge at y0, facing +z, with a border
  function panel(l, w, h, t, c, edge, x, y0, z, tilt) {
    tilt = tilt || 0; const cyy = y0 + (h / 2) * Math.cos(tilt), czz = z - (h / 2) * Math.sin(tilt);
    b(l, w, h, t, edge, x, cyy, czz, -tilt, 0, 0); b(l, w * 0.9, h * 0.88, t * 0.3, c, x + 0, cyy + 0.0, czz + (t / 2) * Math.cos(tilt), -tilt, 0, 0);
    return l;
  }
  // a missile body along +z from z0: lathe profile [radius, z] scaled
  function lathe(l, pts, c, x, y, z0, s, seg) { return add(l, P.lathe(pts.map((p) => [p[0] * (s || 1), p[1] * (s || 1)]), seg || 10), c, [x || 0, y || 0, z0 || 0], [H, 0, 0]); }
  // simple trailer (2-3 axles) behind a point: returns deck y
  function trailer(L, o) {
    const len = o.len, w = o.wid || 2.5, r = o.r || 0.5, col = o.col, fy = r * 1.2 + 0.25;
    b(L.solid, w, 0.35, len, col, 0, fy, 0); o.axles.forEach((z) => [1, -1].forEach((s) => wheel(L.solid, s * (w / 2 - 0.25), z, r, 0.42, o.lo ? 6 : 8)));
    if (o.legs) [1, -1].forEach((s) => { beam(L.solid, s * w * 0.45, fy, len * 0.4, s * (w * 0.5 + 1.4), 0.1, len * 0.4, 0.2, C.dark); beam(L.solid, s * w * 0.45, fy, -len * 0.4, s * (w * 0.5 + 1.4), 0.1, -len * 0.4, 0.2, C.dark); });
    return { y: fy + 0.18 };
  }

  // ================================================================== A) MILITARY GROUND: the Islamic Republic
  // the Ghadr / Shahab "baby-bottle" missile profile, 15.6 m (radius, z)
  const GHADR = [[0, 0], [0.62, 0], [0.62, 0.3], [0.62, 10.3], [0.43, 11.2], [0.43, 11.9], [0.52, 12.5], [0.33, 14.4], [0.06, 15.5], [0, 15.6]];
  function irMissile(l, z0, y, s) {
    s = s || 1; lathe(l, GHADR, C.offwhite, 0, y, z0, s);
    b(l, 0.08 * s, 2.4 * s, 1.5 * s, C.dark, 0, y, z0 + 0.8 * s); b(l, 2.4 * s, 0.08 * s, 1.5 * s, C.dark, 0, y, z0 + 0.8 * s); // fins
    cz(l, 0.635 * s, 0.6 * s, X.irGreen, 0, y, z0 + 6.5 * s, 10); cz(l, 0.635 * s, 0.4 * s, X.irGreen, 0, y, z0 + 3.0 * s, 10);
  }
  K.define('tel_ir', { name: 'Ballistic missile launcher', real: 'Qiam / Ghadr-type 8x8 TEL (the Islamic Republic)', cat: 'land', role: 'ballistic missile launcher', side: 'ir', len: 13.3, anim: A.erect('erect', 16, H - 0.03) }, (K, o) => {
    const L = K.lists(); const t = truck(L, { len: 13.3, wid: 3.05, axles: [4.4, 2.4, -2.2, -4.3], r: 0.78, col: X.ir, cab: 'split', cabLen: 2.8, cabH: 2.05 });
    bs(L.solid, 2.6, 0.45, 9.6, X.ir, 0, t.y, -1.7); bs(L.solid, 0.7, 0.9, 2.8, X.irGreen, 1.0, t.y + 0.45, -0.6); bs(L.solid, 0.7, 0.7, 2.0, C.dark, -1.0, t.y + 0.45, -3.5);
    [1, -1].forEach((s) => { bs(L.solid, 0.35, t.y + 0.2, 0.35, C.dark, s * 1.3, 0, -6.2); b(L.solid, 0.8, 0.1, 0.8, C.dark, s * 1.3, 0.05, -6.2); });
    mark(L, 0.95, t.cabTop + 0.04, 5.3, 0.9, 1.2);
    const root = K.group(L, o.team, 'tel_ir');
    moving(root, o.team, 'erect', (M) => {
      b(M.solid, 0.25, 0.3, 11, X.irGreen, 0.55, 0.15, 5.6); b(M.solid, 0.25, 0.3, 11, X.irGreen, -0.55, 0.15, 5.6);
      [2.2, 6.5, 10.2].forEach((z) => b(M.solid, 1.6, 0.25, 0.4, X.irGreen, 0, 0.75, z));
      b(M.solid, 2.0, 0.25, 1.6, C.dark, 0, 0.1, 0.3); // launch table
      irMissile(M.solid, 0.35, 0.95, 0.8);
    }, 0, t.y + 0.65, -6.4);
    return root;
  });

  // a Shahed-136 one-way drone as a small delta (span 2.5 m, length 3.5 m), nose +z
  function shahed(l, x, y, z, rx, s) {
    s = s || 1; const M = [];
    add(M, P.slab([[0, 1.75], [1.25, -1.5], [1.1, -1.75], [-1.1, -1.75], [-1.25, -1.5]], 0.12), 0xb8b4a8);
    b(M, 0.42, 0.42, 3.3, 0xb3afa3, 0, 0.1, -0.05); cz(M, 0.17, 0.25, C.dark, 0, 0.1, -1.8, 6); b(M, 0.04, 1.0, 0.04, C.dark, 0, 0.1, -1.95); // prop
    b(M, 0.06, 0.55, 0.7, 0xb8b4a8, 1.2, 0.25, -1.45); b(M, 0.06, 0.55, 0.7, 0xb8b4a8, -1.2, 0.25, -1.45); // tip fins
    const mtx = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, 0, 0)), new T.Vector3(s, s, s));
    M.forEach((p) => { p.g.applyMatrix4(mtx); l.push(p); });
  }
  K.define('tel_shahed', { name: 'Shahed drone launcher', real: 'Shahed-136 five-round launch rack on a truck', cat: 'land', role: 'one-way attack drone launcher', side: 'ir', len: 10, anim: A.erect('erect', 18, 0.32) }, (K, o) => {
    const L = K.lists(); const t = truck(L, { len: 10, wid: 2.5, axles: [3.2, -1.6, -3.0], r: 0.55, col: X.irGreen, cab: 'bonnet', cabLen: 2.0, bonnet: 1.5, cabH: 1.9 });
    bs(L.solid, 2.5, 0.25, 6.4, X.irGreen, 0, t.y, -1.7);
    mark(L, 0, t.cabTop + 0.04, 2.9, 0.9, 0.9);
    const root = K.group(L, o.team, 'tel_shahed');
    moving(root, o.team, 'erect', (M) => {
      // the rack: four posts and five rails, the drones stacked nose forward
      [[-1.3, 0.2], [1.3, 0.2], [-1.3, 5.4], [1.3, 5.4]].forEach((p) => b(M.solid, 0.14, 3.2, 0.14, C.dark, p[0], 1.6, p[1]));
      for (let i = 0; i < 5; i++) { const y = 0.35 + i * 0.62; b(M.metal, 0.12, 0.08, 5.4, C.steel, 0, y, 2.8); shahed(M.solid, 0, y + 0.14, 3.0, 0, 1); }
      b(M.solid, 2.7, 0.12, 0.14, C.dark, 0, 3.2, 0.2); b(M.solid, 2.7, 0.12, 0.14, C.dark, 0, 3.2, 5.4);
    }, 0, t.y + 0.25, -4.6);
    return root;
  });

  // a MAZ-543 style 5P85 launcher with four vertical tubes (S-300 family); o.up = raised
  function launcher5P85(L, col, raised, lo) {
    const t = truck(L, { len: 13, wid: 3.05, axles: [4.3, 2.4, -2.2, -4.2], r: 0.78, col, cab: 'split', cabLen: 2.8, cabH: 2.0, lo });
    bs(L.solid, 2.8, 0.5, 9.4, col, 0, t.y, -1.6); bs(L.solid, 1.0, 1.0, 2.4, col, 0.8, t.y + 0.5, 0.5);
    const M = []; tubePack(M, 2, 2, 0.5, 7.2, 0xb7b49c, 0x8d8b78, 0.08, -1.05, 0.1, lo ? 6 : 8);
    b(M, 2.4, 0.3, 0.5, C.dark, 0, 0, 0.3); b(M, 2.4, 0.3, 0.5, C.dark, 0, 0, 6.6);
    const ang = raised ? H : 0.02, mtx = new T.Matrix4().makeRotationX(-ang).setPosition(0, t.y + 1.6, -6.0);
    M.forEach((p) => { p.g.applyMatrix4(mtx); L.solid.push(p); });
    return t;
  }
  K.define('s300', { name: 'S-300 battery', real: 'S-300PMU2: 5P85 launchers, 30N6E radar on 40V6M mast', cat: 'land', role: 'long-range air defence', side: 'ir', len: 120, anim: A.spin('radar', 0.25) }, (K, o) => {
    const L = K.lists(), col = X.ir;
    bs(L.solid, 58, 0.2, 54, X.sandG, 0, 0, 2); [[-19, 12, 0.5], [-6.5, 17, 0.15], [6.5, 17, -0.15], [19, 12, -0.5]].forEach((p) => { const V = K.lists(); launcher5P85(V, col, true, true); place(L, V, p[0], 0, p[1], p[2] + PI, 1); });
    // 40V6M mast: a lattice tower, the cabin at its foot
    const mh = 24; [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach((p) => beam(L.metal, p[0] * 2.2, 0, -14 + p[1] * 2.2, p[0] * 0.5, mh, -14 + p[1] * 0.5, 0.3, C.steel));
    for (let y = 4; y < mh; y += 5) { const k = 1.4 * (2.2 - (1.7 * y) / mh); b(L.metal, k * 2, 0.2, 0.2, C.steel, 0, y, -14 + k); b(L.metal, k * 2, 0.2, 0.2, C.steel, 0, y, -14 - k); }
    const V = K.lists(); const t = truck(V, { len: 12, wid: 3, axles: [4, 2.2, -2.4, -4.2], r: 0.7, col, cab: 'flat', cabLen: 2.4, lo: true }); bs(V.solid, 3, 2.4, 8.5, col, 0, t.y, -1.7); place(L, V, 11, 0, -15, 0.3, 1);
    bs(L.solid, 5, 2.8, 7, col, -11, 0, -18, 0.2); flag(L, -18, -4, 9, 1.2);
    const root = K.group(L, o.team, 's300');
    moving(root, o.team, 'radar', (M) => { panel(M.solid, 6.2, 5.2, 0.7, 0x8f8f7e, col, 0, 0, 0, 0.32); bs(M.solid, 3, 1.4, 2.5, col, 0, -1.4, -1.4); }, 0, mh + 1.4, -14);
    return root;
  });

  K.define('bavar373', { name: 'Bavar-373 air defence', real: 'Bavar-373: launcher with Sayyad-4 box canisters and phased-array radar', cat: 'land', role: 'long-range air defence', side: 'ir', len: 60, anim: A.all(A.spin('radar', 0.35), A.erect('erect', 20, H, 3)) }, (K, o) => {
    const L = K.lists(), col = X.ir; bs(L.solid, 40, 0.2, 40, X.sandG, 0, 0, 1);
    // engagement radar truck: a large flat phased array raised on the bed, facing +z
    const R = K.lists(); const t2 = truck(R, { len: 11, wid: 2.9, axles: [3.6, -1.8, -3.4], r: 0.65, col, cab: 'flat', cabLen: 2.4, lo: true }); bs(R.solid, 2.9, 1.2, 7.4, col, 0, t2.y, -1.6);
    panel(R.solid, 5.4, 4.6, 0.6, 0x9a957f, col, 0, t2.y + 1.2, -0.8, 0.35); place(L, R, 0, 0, -10, 0, 1);
    // the battery's other two trucks (Army Recognition): the command cabin and the S-band acquisition radar, both on Zafar 8x8s
    const Cc = K.lists(); const t3 = truck(Cc, { len: 10, wid: 2.8, axles: [3.4, 2.0, -1.8, -3.3], r: 0.62, col, cab: 'flat', cabLen: 2.2, lo: true });
    bs(Cc.solid, 2.8, 2.6, 6.2, col, 0, t3.y, -1.4); b(Cc.solid, 0.1, 0.9, 1.4, C.dark, 1.42, t3.y + 1.4, -0.4); cs(Cc.metal, 0.12, 5, C.steel, 0.9, t3.y + 2.6, -3.8, 5);
    place(L, Cc, -14, 0, -12, 0.5, 1);
    const Aq = K.lists(); const t4 = truck(Aq, { len: 10, wid: 2.8, axles: [3.4, 2.0, -1.8, -3.3], r: 0.62, col, cab: 'flat', cabLen: 2.2, lo: true });
    bs(Aq.solid, 2.8, 1.1, 6.2, col, 0, t4.y, -1.4); cs(Aq.metal, 0.35, 1.2, C.steel, 0, t4.y + 1.1, -1.8, 6);
    place(L, Aq, 14, 0, -12, -0.5, 1);
    const root = K.group(L, o.team, 'bavar373');
    // the acquisition array turns (A.spin('radar') in the anim): a wide flat panel on the turntable
      moving(root, o.team, 'radar', (M) => { panel(M.solid, 5.6, 2.2, 0.4, 0x9a957f, col, 0, 0, 0, 0.25); }, 14 + Math.sin(-0.5) * -1.8, t4.y + 2.3, -12 + Math.cos(-0.5) * -1.8);
    [[-11, 12, 0.25], [11, 12, -0.25]].forEach((p) => {
      const V = K.lists(); const t = truck(V, { len: 12.5, wid: 3, axles: [4.2, 2.4, -2.4, -4.2], r: 0.72, col, cab: 'flat', cabLen: 2.6, cabH: 2.2, lo: true });
      bs(V.solid, 2.9, 0.5, 8.5, col, 0, t.y, -1.8); mark(V, 0, t.cabTop + 0.04, 4.8, 1, 1);
      const g = K.group(V, o.team, 'trk'); g.position.set(p[0], 0, p[1]); g.rotation.y = p[2] + PI; root.add(g);
      const e = moving(root, o.team, 'erect', (M) => { boxPack(M.solid, 2, 2, 1.15, 1.15, 7.4, 0xc9bf9e, 0x8a826c, 0.08, -1.2, 0.2); b(M.solid, 2.6, 0.3, 0.4, C.dark, 0, -1.2, 0.4); }, 0, t.y + 1.65, 0, 0);
      // put the erector in the truck's frame: rear of the truck faces -z after the PI turn
      root.remove(e); e.position.set(0, t.y + 1.65, -6.0); g.add(e);
    });
    return root;
  });
  // erect anim for erectors nested one level (inside a placed truck group)
  const erectNested = (name, per, max, lag) => (o, dt, t) => { const c = o.children; let k = 0; for (let i = 0; i < c.length; i++) { const e = kid(c[i], name); if (e) { e.rotation.x = -cyc(t + k * (lag || 0), per) * max; k++; } } };
  K.types.bavar373.anim = A.all(A.spin('radar', 0.35), erectNested('erect', 20, H, 3));

  K.define('khordad15', { name: 'Khordad-15 air defence launcher', real: '3rd Khordad / Khordad-15 TELAR with Sayyad missiles', cat: 'land', role: 'medium-range air defence', side: 'ir', len: 11, anim: A.all(A.erect('erect', 17, H), A.slew('array', 0.6, 0.3)) }, (K, o) => {
    const L = K.lists(), col = X.ir; const t = truck(L, { len: 11, wid: 2.8, axles: [3.5, -1.9, -3.5], r: 0.66, col, cab: 'flat', cabLen: 2.4, cabH: 2.1 });
    bs(L.solid, 2.8, 0.45, 7.4, col, 0, t.y, -1.6); bs(L.solid, 1.2, 1.2, 1.6, col, 0, t.y + 0.45, 1.4); mark(L, 0, t.cabTop + 0.04, 4.2, 0.9, 1);
    [1, -1].forEach((s) => bs(L.solid, 0.3, t.y + 0.2, 0.3, C.dark, s * 1.4, 0, -5.2));
    const root = K.group(L, o.team, 'khordad15');
    moving(root, o.team, 'array', (M) => { panel(M.solid, 2.6, 2.2, 0.35, 0x9a957f, col, 0, 0, 0, 0.3); }, 0, t.y + 1.65, 1.6);
    moving(root, o.team, 'erect', (M) => { boxPack(M.solid, 2, 2, 0.85, 0.85, 6.0, 0xcac0a0, 0x8a826c, 0.07, -0.9, 0.2); b(M.solid, 2.0, 0.25, 0.4, C.dark, 0, -0.9, 0.3); }, 0, t.y + 1.4, -5.1);
    return root;
  });

  K.define('tor', { name: 'Tor short-range air defence', real: 'Tor-M1 / M2 (9K330/9K332) on GM-355 tracks', cat: 'land', role: 'short-range air defence', side: 'ir', len: 7.5, anim: A.all(A.slew('turret', 0.8, 0.25), A.spinIn('turret', 'radar', 2.4)) }, (K, o) => {
    const L = K.lists(), col = o.variant === 'ru' ? X.ru : X.irGreen; const h = tracked(L, { len: 7.5, wid: 3.3, n: 6, r: 0.36, col, h: 0.85, glacis: 1.4, tw: 0.55 });
    b(L.glass, 1.2, 0.2, 0.06, C.glass, 0.9, h.top - 0.35, 3.0, -0.6); mark(L, 1.2, h.top + 0.04, -3.0, 0.8, 0.8);
    const root = K.group(L, o.team, 'tor');
    const tu = moving(root, o.team, 'turret', (M) => {
      add(M.solid, P.slab([[-1.45, -1.5], [1.45, -1.5], [1.45, 1.1], [0.9, 1.7], [-0.9, 1.7], [-1.45, 1.1]], 2.0), col, [0, 1.0, -0.3]);
      // tracking radar: the round flat face on the front, the missile hatches on top
      b(M.solid, 1.6, 1.5, 0.3, col, 0, 1.15, 1.5, -0.25); cy(M.solid, 0.62, 0.12, 0x8f8f7e, 0, 1.2, 1.67, -H - 0.25, 0, 0, 12);
      for (let i = 0; i < 4; i++) { b(M.solid, 0.6, 0.06, 0.6, C.dark, -0.75, 2.03, -1.2 + i * 0.6); b(M.solid, 0.6, 0.06, 0.6, C.dark, 0.75, 2.03, -1.2 + i * 0.6); }
      b(M.solid, 0.35, 1.2, 0.35, col, 0, 2.6, -1.4);
    }, 0, h.top, -0.6);
    const r = moving(tu, o.team, 'radar', (M) => { b(M.solid, 2.4, 0.8, 0.25, 0x8f8f7e, 0, 0, 0, -0.35); b(M.solid, 0.3, 0.5, 0.4, col, 0, -0.45, -0.2); }, 0, 3.4, -1.4);
    return root;
  });

  K.define('radar_ghadir', { name: 'Ghadir over-the-horizon radar', real: 'Ghadir long-range early-warning radar array (Garmsar)', cat: 'land', role: 'strategic early-warning radar', side: 'ir', len: 220 }, (K, o) => {
    /* The layout as GlobalSecurity describes it (radar-qadir.htm): a square under 70 m a side, four lateral antenna faces (one per quarter
       of the sky, IRNA: "more than 100 antennas", 360 degrees), the inside nearly filled with buildings, ONE tall transmitter mast in the
       centre. (The corner-tower square is the bigger Sepehr; it is not this.) */
    const L = K.lists(), S = 66, mh = 18, TM = 62;
    bs(L.solid, S + 34, 0.3, S + 34, X.sandG, 0, 0, 0);
    bs(L.solid, S + 10, 0.12, S + 10, X.pad, 0, 0.3, 0);
    // the four faces: a reflector screen on its frame, and a curtain of dipole masts in front of it, each mast with three cross dipoles
    [0, H, PI, -H].forEach((ry) => {
      const sx = Math.sin(ry), sz = Math.cos(ry), ux = Math.cos(ry), uz = -Math.sin(ry), cxp = sx * S / 2, czp = sz * S / 2;
      b(L.solid, S * 0.94, mh, 0.4, 0x5d656b, cxp - sx * 1.5, mh / 2 + 0.3, czp - sz * 1.5, 0, ry, 0);
      [mh * 0.34, mh * 0.68, mh].forEach((y) => b(L.metal, S * 0.96, 0.45, 0.45, 0xc9ccce, cxp - sx * 1.3, y, czp - sz * 1.3, 0, ry, 0));
      const n = 12;
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1) - 0.5) * S * 0.88, x = cxp + sx * 2.2 + ux * u, z = czp + sz * 2.2 + uz * u;
        b(L.metal, 0.5, mh + 1.5, 0.5, 0xb9bdc0, x, (mh + 1.5) / 2 + 0.3, z);
        [0.45, 0.85].forEach((f) => b(L.metal, 3.6, 0.22, 0.22, 0xe2e4e5, x, mh * f + 0.6, z, 0, ry, 0));
      }
      // the guard rail and the cable trench along the face
      b(L.solid, S * 0.96, 0.5, 2.4, X.padDark, cxp + sx * 5.4, 0.55, czp + sz * 5.4, 0, ry, 0);
    });
    // the buildings that nearly fill the inside: transmitter halls, the operations block, the power hall, cooling units on the roofs
    const bld = [[-14, -14, 20, 6, 18], [14, -14, 18, 7.5, 16], [-14, 14, 18, 5.5, 18], [14, 14, 20, 6.5, 16]];
    bld.forEach((q, i) => {
      bs(L.solid, q[2], q[3], q[4], i % 2 ? C.offwhite : X.lime, q[0], 0.4, q[1]);
      bs(L.solid, q[2] + 0.6, 0.6, q[4] + 0.6, X.roofGrey, q[0], q[3] + 0.4, q[1]);
      for (let k = 0; k < 3; k++) bs(L.solid, 2.2, 1.4, 2.2, 0x9aa0a4, q[0] - q[2] * 0.3 + k * q[2] * 0.3, q[3] + 1.0, q[1]);
      for (let k = 0; k < 5; k++) b(L.glow, 2, 0.9, 0.1, X.win, q[0] - q[2] * 0.36 + k * q[2] * 0.18, q[3] * 0.55 + 0.4, q[1] + Math.sign(-q[1]) * (q[4] / 2 + 0.06));
    });
    // the central transmitter mast: a tapering lattice, striped red and white for aircraft, with its feed cage and top light
    const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]], w0 = 3.2, w1 = 0.7;
    legs.forEach((p) => beam(L.metal, p[0] * w0, 0.4, p[1] * w0, p[0] * w1, TM, p[1] * w1, 0.45, 0xd8d8d4));
    for (let k = 0; k < 8; k++) {
      const y0 = 0.4 + k * (TM / 8), y1 = y0 + TM / 8, wa = w0 + (w1 - w0) * (y0 / TM), wb = w0 + (w1 - w0) * (y1 / TM), c = k % 2 ? X.redB : X.stripeW;
      for (let j = 0; j < 4; j++) { const a2 = legs[j], b2 = legs[(j + 1) % 4]; beam(L.metal, a2[0] * wa, y0, a2[1] * wa, b2[0] * wb, y1, b2[1] * wb, 0.22, c); }
      bs(L.solid, wb * 2.1, 0.35, wb * 2.1, c, 0, y1 - 0.2, 0);
    }
    cy(L.metal, 2.4, 3, 0xc9ccce, 0, TM - 6, 0, 0, 0, 0, 8); cs(L.metal, 0.25, 6, C.steel, 0, TM, 0, 6);
    ball(L.glow, 0.7, 0xff3b2e, 0, TM + 6.2, 0, 6);
    bs(L.solid, 8, 3.2, 8, C.offwhite, 0, 0.4, 0); bs(L.solid, 8.6, 0.5, 8.6, X.roofGrey, 0, 3.6, 0);
    // the perimeter fence and the gate
    [0, H, PI, -H].forEach((ry) => b(L.metal, S + 22, 2.2, 0.25, 0x8a8f92, Math.sin(ry) * (S / 2 + 12), 1.4, Math.cos(ry) * (S / 2 + 12), 0, ry, 0));
    bs(L.solid, 6, 3.4, 4, C.offwhite, S / 2 + 6, 0.3, S / 2 + 14);
    flag(L, -(S / 2 + 8), S / 2 + 8, 14, 2);
    return K.group(L, o.team, 'radar_ghadir');
  });

  K.define('radar_ew', { name: 'Early-warning radar', real: 'Matla-ul-Fajr / P-18-type VHF early-warning radar', cat: 'land', role: 'early-warning radar', side: 'ir', len: 10, anim: A.spin('array', 0.9) }, (K, o) => {
    const L = K.lists(), col = X.irGreen; const t = truck(L, { len: 9.5, wid: 2.6, axles: [3.1, -1.4, -2.9], r: 0.6, col, cab: 'bonnet', cabLen: 1.9, bonnet: 1.5 });
    bs(L.solid, 2.6, 2.3, 5.6, col, 0, t.y, -1.6); b(L.solid, 0.1, 0.5, 0.8, C.dark, 1.31, t.y + 1.3, -0.6); mark(L, 0, t.y + 2.34, -3.5, 1, 1);
    [1, -1].forEach((s) => [2, -4.2].forEach((z) => beam(L.solid, s * 1.2, t.y, z + 0.4, s * 2.9, 0.1, z, 0.18, C.dark)));
    ct(L.metal, 0.22, 0.32, 3.4, C.steel, 0, t.y + 2.3, -1.6, 6);
    const root = K.group(L, o.team, 'radar_ew');
    // two rows of four Yagi antennas on a boom: the P-18 silhouette
    moving(root, o.team, 'array', (M) => {
      b(M.metal, 9.4, 0.25, 0.25, C.steel, 0, 0, 0); b(M.metal, 0.25, 3.6, 0.25, C.steel, 0, 0, 0);
      for (let i = 0; i < 4; i++) [1.3, -1.3].forEach((y) => { const x = -3.6 + i * 2.4; b(M.metal, 0.12, 0.12, 5.2, 0xc8ccd0, x, y, 1.4); for (let k = 0; k < 4; k++) b(M.metal, 1.6 - k * 0.16, 0.06, 0.06, 0xd8dcdf, x, y, 0.3 + k * 1.3); });
      b(M.metal, 9.4, 0.18, 0.18, C.steel, 0, 1.3, 0); b(M.metal, 9.4, 0.18, 0.18, C.steel, 0, -1.3, 0);
    }, 0, t.y + 5.9, -1.6);
    return root;
  });

  // low-detail TEL for sites: a truck with a missile (raised or flat)
  function miniTEL(l, col, raised) {
    b(l, 2.8, 1.0, 12.6, C.dark, 0, 0.9, 0); bs(l, 1.0, 2.0, 2.6, col, 1.0, 0.9, 5.0); bs(l, 1.0, 2.0, 2.6, col, -1.0, 0.9, 5.0); bs(l, 2.8, 0.6, 9.6, col, 0, 1.3, -1.6);
    [4.4, 2.4, -2.2, -4.3].forEach((z) => { b(l, 3.0, 1.5, 1.5, C.rubber, 0, 0.78, z); });
    const M = []; lathe(M, GHADR, C.offwhite, 0, 0.9, 0.3, 0.8, 8); b(M, 2.0, 0.08, 1.2, C.dark, 0, 0.9, 0.9);
    const mtx = new T.Matrix4().makeRotationX(raised ? -H : 0).setPosition(0, 2.3, -6.2); M.forEach((p) => { p.g.applyMatrix4(mtx); l.push(p); });
  }
  // a low-poly hill/ridge: a squashed sphere (rock) on y=0
  function hill(l, rx, h, rz, c, x, z, ry, s) { return add(l, new T.SphereGeometry(1, s || 9, 4, 0, PI * 2, 0, H), c, [x || 0, 0, z || 0], [0, ry || 0, 0], [rx, h, rz]); }
  // a tunnel portal facing +z: concrete frame and a dark mouth, standing on y0
  function portal(l, w, h, d, x, z, ry, c) {
    const G = []; bs(G, w + 3, h + 2.5, d, c || C.concrete, 0, 0, 0); b(G, w, h, 0.4, C.black, 0, h / 2, d / 2 + 0.02); bs(G, w + 4, 1.2, d + 1, C.concrete, 0, h + 2.5, 0.4);
    [1, -1].forEach((s) => add(G, P.profile([[d / 2, 0], [d / 2 + 7, 0], [d / 2, h + 2.5]], 1.4), c || C.concrete, [s * (w / 2 + 2.2), 0, 0]));
    const M = new T.Matrix4().compose(new T.Vector3(x, 0, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry || 0, 0)), new T.Vector3(1, 1, 1)); G.forEach((p) => { p.g.applyMatrix4(M); l.push(p); });
  }
  K.define('missile_city', { name: 'Underground missile base', real: 'IRGC "missile city" tunnel base cut into a hillside', cat: 'land', role: 'underground missile base', side: 'ir', len: 160, anim: A.erect('erect', 16, H - 0.05) }, (K, o) => {
    const L = K.lists();
    mountain(L.solid, 0, -45, 170, 80, 60, 4);
    // the cut face, retaining walls and the portal
    bs(L.solid, 46, 22, 10, X.rockDark, 0, 0, 6); portal(L.solid, 12, 10, 8, 0, 12, 0); [1, -1].forEach((s) => b(L.solid, 18, 8, 2, C.concrete, s * 16, 4, 14, 0, s * 0.35, 0));
    bs(L.solid, 16, 0.3, 70, C.asphalt, 0, 0, 50); for (let i = 0; i < 6; i++) b(L.solid, 0.6, 0.05, 4, X.stripeW, 0, 0.32, 26 + i * 10);
    bs(L.solid, 40, 0.3, 26, X.pad, 0, 0, 34);
    // vents and a radome on the ridge, a guard post, a flag
    [[-20, -30], [18, -36], [0, -55]].forEach((p) => { bs(L.solid, 3, 4, 3, C.concrete, p[0], 30, p[1]); b(L.solid, 3.6, 0.6, 3.6, C.dark, p[0], 34.2, p[1]); });
    bs(L.solid, 6, 4, 6, C.offwhite, 24, 0, 66); bs(L.solid, 7, 0.5, 7, X.roofGrey, 24, 4, 66); flag(L, -12, 40, 14, 1.8);
    // a second TEL parked, flat
    const V = []; miniTEL(V, X.ir, false); V.forEach((p) => { p.g.applyMatrix4(new T.Matrix4().makeRotationY(0.25).setPosition(16, 0, 36)); L.solid.push(p); });
    const root = K.group(L, o.team, 'missile_city');
    // the TEL at the mouth, its missile rising
    const V2 = K.lists(); const t = truck(V2, { len: 13.3, wid: 3.05, axles: [4.4, 2.4, -2.2, -4.3], r: 0.78, col: X.ir, cab: 'split', cabLen: 2.8, lo: true }); bs(V2.solid, 2.6, 0.45, 9.6, X.ir, 0, t.y, -1.7);
    const g = K.group(V2, o.team, 'tel'); g.position.set(-6, 0, 30); root.add(g);
    moving(root, o.team, 'erect', (M) => { b(M.solid, 1.4, 0.3, 11, X.irGreen, 0, 0.2, 5.6); irMissile(M.solid, 0.35, 0.95, 0.8); }, -6, t.y + 0.65, 30 - 6.4);
    return root;
  });

  K.define('coastal_ascm', { name: 'Coastal anti-ship missile launcher', real: 'Noor / Ghader coastal launcher (C-802 family)', cat: 'land', role: 'anti-ship missile launcher', side: 'ir', len: 10.5, anim: A.erect('erect', 15, 0.3) }, (K, o) => {
    const L = K.lists(), col = X.ir; const t = truck(L, { len: 10.5, wid: 2.55, axles: [3.4, -1.6, -3.1], r: 0.58, col, cab: 'bonnet', cabLen: 2.0, bonnet: 1.6 });
    bs(L.solid, 2.5, 0.35, 6.6, col, 0, t.y, -1.6); ct(L.solid, 0.9, 1.0, 0.5, C.dark, 0, t.y + 0.35, -2.4, 10); mark(L, 0, t.cabTop + 0.04, 3.2, 0.9, 0.8);
    const root = K.group(L, o.team, 'coastal_ascm');
    moving(root, o.team, 'erect', (M) => { tubePack(M.solid, 3, 1, 0.42, 6.8, 0xb9b39c, 0x6f6b5e, 0.1, 0, -0.6); b(M.solid, 2.9, 0.3, 0.5, C.dark, 0, 0, 0.6); b(M.solid, 2.9, 0.3, 0.5, C.dark, 0, 0, 5.4); }, 0, t.y + 1.0, -5.0);
    return root;
  });

  K.define('type12_er', { name: 'Type 12 / Type 25 anti-ship launcher', real: 'Type 12 SSM (upgraded: Type 25, about 1,000 km)', cat: 'land', role: 'truck-mounted anti-ship missile launcher (Japan)', side: 'any', len: 11, anim: A.erect('erect', 15, 0.3) }, (K, o) => {
    const L = K.lists(), col = 0x4f5a3c; const t = truck(L, { len: 10.5, wid: 2.55, axles: [3.4, -1.6, -3.1], r: 0.58, col, cab: 'bonnet', cabLen: 2.0, bonnet: 1.6 });
    bs(L.solid, 2.5, 0.35, 6.6, col, 0, t.y, -1.6); ct(L.solid, 0.9, 1.0, 0.5, C.dark, 0, t.y + 0.35, -2.4, 10); mark(L, 0, t.cabTop + 0.04, 3.2, 0.9, 0.8);
    const root = K.group(L, o.team, 'type12_er');
    moving(root, o.team, 'erect', (M) => { tubePack(M.solid, 3, 2, 0.4, 7.4, 0x6a7350, 0x3f4530, 0.08, 0, -0.6); b(M.solid, 2.9, 0.3, 0.5, C.dark, 0, 0, 0.6); b(M.solid, 2.9, 0.3, 0.5, C.dark, 0, 0, 5.4); }, 0, t.y + 1.0, -5.0);
    return root;
  });

  // ================================================================== US and Israeli air defence
  // the HEMTT tractor + M860 semitrailer with an M903 launcher (4 canisters), raised to `ang`; lists in frame, launcher box returned separately
  function trailerParts(L, len, w, col, z, r, axles, lo) { const fy = r * 1.2 + 0.25; bs(L.solid, w, 0.4, len, col, 0, fy - 0.2, z); axles.forEach((a) => [1, -1].forEach((s) => wheel(L.solid, s * (w / 2 - 0.25), a, r, 0.42, lo ? 6 : 8))); return fy + 0.2; }
  function m903b(L, col, ang, lo) {
    const t = truck(L, { len: 8.6, wid: 2.45, axles: [2.9, 1.3, -1.5, -3.0], r: 0.6, col, cab: 'flat', cabLen: 2.3, cabH: 1.8, lo });
    const y = trailerParts(L, 9.4, 2.45, col, -8.0, 0.55, [-10.6, -11.8], lo);
    [1, -1].forEach((s) => { beam(L.solid, s * 1.1, y - 0.3, -6.2, s * 3.0, 0.1, -6.6, 0.2, C.dark); beam(L.solid, s * 1.1, y - 0.3, -12.0, s * 3.0, 0.1, -12.4, 0.2, C.dark); });
    const M = []; boxPack(M, 2, 2, 1.08, 1.0, 5.9, 0xd9d2b8, 0xbab196, 0.06, 0, 0); b(M, 2.3, 0.25, 5.6, C.dark, 0, -0.12, 2.9);
    const mtx = new T.Matrix4().makeRotationX(ang).multiply(new T.Matrix4().makeRotationY(PI)).setPosition(0, y + 0.2, -6.4); M.forEach((p) => { p.g.applyMatrix4(mtx); L.solid.push(p); });
    beam(L.solid, 0, y, -9.4, 0, y + 2.4, -8.6, 0.25, C.steel);
    return t;
  }
  K.define('patriot', { name: 'Patriot battery', real: 'MIM-104 Patriot: four M903 launchers, AN/MPQ-65 radar, ECS, EPP, AMG', cat: 'land', role: 'air and missile defence battery', side: 'us', len: 110 }, (K, o) => {
    const L = K.lists(), col = X.us;
    bs(L.solid, 64, 0.2, 58, X.sandG, 0, 0, 5); [[-20, 10, 0.5], [-7, 15, 0.15], [7, 15, -0.15], [20, 10, -0.5]].forEach((p) => { berm(L.solid, 7, 1.6, 3, X.earth, p[0] + Math.sin(p[2]) * 15, 0.2, p[1] + Math.cos(p[2]) * 15, p[2], 0.45); const V = K.lists(); m903b(V, col, 0.66, true); place(L, V, p[0], 0, p[1], p[2] + PI, 1); });
    // AN/MPQ-65 on its semitrailer: shelter with the big tilted face toward the threat (+z)
    const R = K.lists(); const y = trailerParts(R, 9.5, 2.5, col, -1.2, 0.55, [-4.6, -5.8], true); bs(R.solid, 2.5, 2.6, 6.8, col, 0, y, -2.0);
    b(R.solid, 3.9, 3.9, 0.5, col, 0, y + 2.2, 2.4, -0.35); cy(R.solid, 1.55, 0.14, 0x9c9a8a, 0, y + 2.12, 2.72, H - 0.35, 0, 0, 12); b(R.solid, 1.3, 0.5, 0.12, 0x9c9a8a, 0, y + 3.65, 2.12, -0.35); b(R.solid, 0.5, 0.5, 0.12, 0x9c9a8a, 1.4, y + 0.9, 2.95, -0.35);
    place(L, R, 0, 0, 2, 0, 1);
    // ECS and EPP shelters on trucks, the antenna mast group with its two masts
    const E = K.lists(); let t = truck(E, { len: 7.5, wid: 2.45, axles: [2.5, -1.8, -3.0], r: 0.55, col, cab: 'bonnet', cabLen: 1.8, bonnet: 1.4, lo: true }); bs(E.solid, 2.4, 2.1, 4.0, col, 0, t.y, -1.7); place(L, E, -6, 0, -13, 0.3, 1);
    const F = K.lists(); t = truck(F, { len: 7.5, wid: 2.45, axles: [2.5, -1.8, -3.0], r: 0.55, col, cab: 'bonnet', cabLen: 1.8, bonnet: 1.4, lo: true }); bs(F.solid, 1.1, 1.5, 3.6, C.olive, 0.6, t.y, -1.8); bs(F.solid, 1.1, 1.5, 3.6, C.olive, -0.6, t.y, -1.8); place(L, F, 7, 0, -16, -0.4, 1);
    const G = K.lists(); t = truck(G, { len: 7.5, wid: 2.45, axles: [2.5, -1.8, -3.0], r: 0.55, col, cab: 'bonnet', cabLen: 1.8, bonnet: 1.4, lo: true }); bs(G.solid, 2.4, 1.6, 3.8, col, 0, t.y, -1.7);
    [0.7, -0.7].forEach((x) => { ct(G.metal, 0.12, 0.22, 28, C.steel, x, t.y + 1.6, -2.8, 6); b(G.metal, 1.6, 0.8, 0.2, 0xc8c8c0, x, t.y + 29.2, -2.8); });
    place(L, G, -18, 0, -16, 0.1, 1);
    beam(L.solid, 0, 0.15, -2, -6, 0.15, -11, 0.25, C.black); beam(L.solid, -6, 0.15, -11, 7, 0.15, -14, 0.25, C.black);
    flag(L, 20, -12, 8, 1.2);
    return K.group(L, o.team, 'patriot');
  });

  K.define('thaad_battery', { name: 'THAAD battery', real: 'THAAD: M1120 launchers (8 interceptors each), AN/TPY-2 radar', cat: 'land', role: 'high-altitude missile defence', side: 'us', len: 100 }, (K, o) => {
    const L = K.lists(), col = X.us;
    bs(L.solid, 50, 0.2, 52, X.sandG, 0, 0, 2); [[-15, 15, 0.35], [0, 19, 0], [15, 15, -0.35]].forEach((p) => {
      const V = K.lists(); const t = truck(V, { len: 10.2, wid: 2.5, axles: [4.0, 2.4, -2.4, -4.0], r: 0.62, col, cab: 'flat', cabLen: 2.4, cabH: 1.9, lo: true });
      bs(V.solid, 2.4, 0.4, 7.4, col, 0, t.y, -1.4);
      [1, -1].forEach((s) => beam(V.solid, s * 1.1, t.y, -4.6, s * 2.6, 0.1, -4.9, 0.2, C.dark));
      const M = []; tubePack(M, 4, 2, 0.31, 6.6, 0xd8d2bc, 0x8e897b, 0.04, 0, 0, 6); b(M, 2.8, 1.45, 0.25, col, 0, 0.66, 0.1); b(M, 2.8, 1.45, 0.25, col, 0, 0.66, 6.4);
      const mtx = new T.Matrix4().makeRotationX(-1.05).setPosition(0, t.y + 0.6, -4.8); M.forEach((p2) => { p2.g.applyMatrix4(mtx); V.solid.push(p2); });
      place(L, V, p[0], 0, p[1], p[2] + PI, 1);
    });
    // AN/TPY-2: the big flat array on its trailer, tilted back, facing +z; cooling and power units behind
    const R = K.lists(); const y = trailerParts(R, 11.5, 2.6, col, -2.5, 0.55, [-6.5, -7.7], true); bs(R.solid, 2.6, 1.6, 7, col, 0, y, -4.2);
    panel(R.solid, 8.4, 4.4, 0.8, 0x8f8f86, col, 0, y, 2.2, 0.42); b(R.solid, 1.0, 2.6, 1.0, C.dark, 0, y + 1.0, 0.6);
    place(L, R, 0, 0, 0, 0, 1);
    bs(L.solid, 2.5, 2.6, 6.0, col, -10, 0, -14, 0.2); bs(L.solid, 2.5, 2.4, 6.5, col, 10, 0, -15, -0.2); bs(L.solid, 2.5, 2.4, 5.0, col, 0, 0, -19);
    beam(L.solid, 0, 0.15, -6, -10, 0.15, -12, 0.25, C.black); beam(L.solid, 0, 0.15, -6, 10, 0.15, -13, 0.25, C.black);
    flag(L, 18, -8, 8, 1.2);
    return K.group(L, o.team, 'thaad_battery');
  });

  K.define('irondome', { name: 'Iron Dome battery', real: 'Iron Dome: Tamir launchers (20 rounds) and EL/M-2084 radar', cat: 'land', role: 'short-range rocket defence', side: 'il', len: 60, anim: A.spin('radar', 0.7) }, (K, o) => {
    const L = K.lists(), col = X.il;
    bs(L.solid, 34, 0.2, 32, X.sandG, 0, 0, 2); [[-9, 9, 0.3], [0, 12, 0], [9, 9, -0.3]].forEach((p) => {
      const V = K.lists(); const y = trailerParts(V, 6.0, 2.4, col, 0, 0.5, [-1.0, 0.4], true); b(V.solid, 0.3, 0.3, 2.4, C.dark, 0, y - 0.3, 4.1);
      [1, -1].forEach((s) => [2.4, -2.4].forEach((z) => beam(V.solid, s * 1.1, y - 0.2, z, s * 2.4, 0.1, z, 0.18, C.dark)));
      const M = []; b(M, 2.3, 2.9, 3.6, col, 0, 1.45, 1.8); for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) cz(M, 0.2, 0.08, C.dark, -0.81 + i * 0.54, 0.35 + j * 0.55, 3.62, 6);
      const mtx = new T.Matrix4().makeRotationX(-1.1).setPosition(0, y + 0.1, -2.6); M.forEach((q) => { q.g.applyMatrix4(mtx); V.solid.push(q); });
      place(L, V, p[0], 0, p[1], p[2], 1);
    });
    const B = K.lists(); const t = truck(B, { len: 8, wid: 2.5, axles: [2.7, -1.8, -3.1], r: 0.55, col, cab: 'flat', cabLen: 2.2, lo: true }); bs(B.solid, 2.5, 2.3, 4.6, col, 0, t.y, -1.6); place(L, B, -9, 0, -6, 0.4, 1);
    const R = K.lists(); const t2 = truck(R, { len: 8.5, wid: 2.5, axles: [2.8, -1.8, -3.2], r: 0.55, col, cab: 'flat', cabLen: 2.2, lo: true }); bs(R.solid, 2.5, 0.8, 5.0, col, 0, t2.y, -1.6); cs(R.metal, 0.4, 1.4, C.steel, 0, t2.y + 0.8, -1.8, 8);
    place(L, R, 7, 0, -4, -0.2, 1); flag(L, 14, -10, 7, 1);
    const root = K.group(L, o.team, 'irondome');
    moving(root, o.team, 'radar', (M) => { panel(M.solid, 4.2, 2.8, 0.45, 0x8e8c80, col, 0, 0, 0, 0.3); b(M.solid, 1, 0.6, 1, col, 0, 0, -0.6); }, 7 + Math.sin(-0.2) * -1.8, t2.y + 2.3, -4 - 1.8 * Math.cos(-0.2));
    return root;
  });

  K.define('davids_sling', { name: "David's Sling launcher", real: "David's Sling: Stunner launcher (12 rounds) on an 8x8 truck", cat: 'land', role: 'medium-range missile defence', side: 'il', len: 12, anim: A.erect('erect', 17, H - 0.12) }, (K, o) => {
    const L = K.lists(), col = X.il; const t = truck(L, { len: 12, wid: 2.55, axles: [4.0, 2.5, -2.4, -3.9], r: 0.64, col, cab: 'flat', cabLen: 2.4, cabH: 2.1 });
    bs(L.solid, 2.5, 0.5, 8.4, col, 0, t.y, -1.6); bs(L.solid, 1.0, 1.0, 1.6, C.dark, 0.7, t.y + 0.5, 1.6); mark(L, 0, t.cabTop + 0.04, 4.8, 1, 1);
    [1, -1].forEach((s) => [-5.4, 1.0].forEach((z) => beam(L.solid, s * 1.1, t.y, z, s * 2.5, 0.1, z, 0.2, C.dark)));
    const root = K.group(L, o.team, 'davids_sling');
    moving(root, o.team, 'erect', (M) => { b(M.solid, 2.4, 1.8, 6.2, col, 0, 0.9, 3.1); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) cz(M.solid, 0.22, 0.08, C.dark, -0.84 + i * 0.56, 0.35 + j * 0.55, 6.22, 6); b(M.solid, 2.6, 0.3, 0.4, C.dark, 0, -0.1, 0.3); }, 0, t.y + 0.7, -5.6);
    return root;
  });

  K.define('arrow', { name: 'Arrow launcher', real: 'Arrow 2 / Arrow 3 six-canister launcher with tractor', cat: 'land', role: 'exo-atmospheric missile defence', side: 'il', len: 18, anim: A.erect('erect', 18, 1.42) }, (K, o) => {
    const L = K.lists(), col = X.il; const t = truck(L, { len: 7.6, wid: 2.5, axles: [2.4, 0.9, -2.2], r: 0.6, col, cab: 'flat', cabLen: 2.4, cabH: 1.9 });
    const y = trailerParts(L, 10, 2.5, col, -8.2, 0.55, [-11.0, -12.2], false);
    [1, -1].forEach((s) => [-5.0, -12.5].forEach((z) => beam(L.solid, s * 1.1, y - 0.3, z, s * 2.7, 0.1, z, 0.2, C.dark)));
    mark(L, 0, t.cabTop + 0.04, 2.6, 0.9, 1);
    const root = K.group(L, o.team, 'arrow');
    moving(root, o.team, 'erect', (M) => { tubePack(M.solid, 3, 2, 0.5, 7.6, 0xd9d6c8, 0x8e8b7d, 0.06, 0, 0.2, 10); b(M.solid, 3.4, 2.3, 0.35, col, 0, 1.05, 0.4); b(M.solid, 3.4, 2.3, 0.35, col, 0, 1.05, 7.4); }, 0, y + 0.3, -13.0);
    return root;
  });

  // ================================================================== B) SITES: shared helpers (metres; vehicles inside a site are drawn 2x)
  // build parts in local coordinates, then move them into list l (position, yaw, uniform scale)
  function local(l, x, y, z, ry, s, fn) { const M = []; fn(M); const m = new T.Matrix4().compose(new T.Vector3(x || 0, y || 0, z || 0), new T.Quaternion().setFromEuler(new T.Euler(0, ry || 0, 0)), new T.Vector3(s || 1, s || 1, s || 1)); M.forEach((p) => { p.g.applyMatrix4(m); l.push(p); }); return l; }
  // a front outline (x, y) extruded along z, centred on z: arches, towers, monuments
  function shapeXY(pts, depth) { const s = new T.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g; }
  // the site's footprint: an octagonal tile of ground a shade off the board, so a site reads as one place
  function tile(l, w, d, c, h) { const cw = w / 2, cd = d / 2, k = Math.min(w, d) * 0.12; add(l, P.slab([[-cw + k, -cd], [cw - k, -cd], [cw, -cd + k], [cw, cd - k], [cw - k, cd], [-cw + k, cd], [-cw, cd - k], [-cw, -cd + k]], h || 0.4), c, [0, (h || 0.4) / 2, 0]); }
  function water(l, w, d, x, z, c) { return bs(l, w, 0.5, d, c || X.water, x, 0, z); }
  function road(l, ax, az, bx, bz, w, c) { const dx = bx - ax, dz = bz - az; return b(l, w, 0.3, Math.hypot(dx, dz), c || C.asphalt, (ax + bx) / 2, 0.5, (az + bz) / 2, 0, Math.atan2(dx, dz), 0); }
  // a building: block + a darker roof slab; pitched roof when roof === 'pitch'
  function bldg(l, w, h, d, c, x, z, ry, roof, rc) {
    bs(l, w, h, d, c, x, 0.4, z, ry);
    if (roof === 'pitch') add(l, P.profile([[-d / 2 - 0.4, 0], [d / 2 + 0.4, 0], [0, Math.min(w, d) * 0.35]], w + 0.6), rc || X.roofRed, [x, h + 0.4, z], [0, ry || 0, 0]);
    else if (roof !== 'none') bs(l, w * 0.94, 0.8, d * 0.94, rc || X.roofGrey, x, h + 0.4, z, ry);
  }
  // a storage tank (floating-roof top a shade darker on big ones)
  function tank(l, r, h, x, z, c, seg) { cs(l, r, h, c || X.tankW, x, 0.4, z, seg || 10); if (r > 9) cs(l, r * 0.9, 0.3, 0xb9b6ad, x, h + 0.4, z, seg || 10); }
  function tankFarm(l, cols, rows, r, h, gap, x, z, c) {
    const sx = 2 * r + gap, w = cols * sx, d = rows * sx;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) tank(l, r, h, x + (i - (cols - 1) / 2) * sx, z + (j - (rows - 1) / 2) * sx, c);
    [d / 2, -d / 2].forEach((dz) => bs(l, w + 4, 2.5, 2, X.earth, x, 0.4, z + dz)); [w / 2, -w / 2].forEach((dx) => bs(l, 2, 2.5, d + 4, X.earth, x + dx, 0.4, z));
  }
  // a chimney: tapered, red and white bands on the top third
  function stack(l, r, h, x, z, bands) {
    ct(l, r * 0.7, r, h * 0.66, C.concrete, x, 0.4, z, 8);
    const n = bands || 4, bh = (h * 0.34) / n; for (let i = 0; i < n; i++) { const f = 0.66 + (0.34 * i) / n; ct(l, r * (0.7 - (0.12 * (i + 1)) / n), r * (0.7 - (0.12 * i) / n), bh, i % 2 ? X.stripeW : X.redB, x, 0.4 + h * f, z, 8); }
    cy(l, r * 0.5, 0.4, C.black, x, h + 0.5, z, 0, 0, 0, 8);
  }
  // a hyperbolic cooling tower with its dark mouth, and a puff of steam (glass list) if steam
  function cooling(l, r, h, x, z, steam, glassL) {
    add(l, P.lathe([[r, 0], [r * 0.86, h * 0.3], [r * 0.66, h * 0.66], [r * 0.64, h * 0.8], [r * 0.7, h]], 12), C.concrete, [x, 0.4, z]);
    cy(l, r * 0.68, 0.3, 0x2a2a2a, x, 0.4 + h - 0.8, z, 0, 0, 0, 12);
    if (steam && glassL) { ball(glassL, r * 0.75, 0xf4f4f2, x, h + r * 0.5, z, 7); ball(glassL, r * 0.6, 0xf4f4f2, x + r * 0.5, h + r * 1.1, z - r * 0.2, 6); }
  }
  // a lattice transmission pylon (h tall), arms across x
  function pylon(l, x, z, h, ry, c) {
    local(l, x, 0, z, ry, 1, (M) => {
      const a = h * 0.12; [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach((p) => beam(M, p[0] * a, 0.3, p[1] * a, p[0] * a * 0.15, h, p[1] * a * 0.15, h * 0.025, c || C.steel));
      b(M, h * 0.62, h * 0.02, h * 0.04, c || C.steel, 0, h * 0.72, 0); b(M, h * 0.42, h * 0.02, h * 0.04, c || C.steel, 0, h * 0.88, 0); b(M, a * 1.2, h * 0.02, h * 0.02, c || C.steel, 0, h * 0.4, 0);
    });
  }
  function wires(l, ax, az, bx, bz, h) { const an = Math.atan2(bx - ax, bz - az); [-0.31, 0.31, -0.21, 0.21].forEach((u, i) => { const y = h * (i < 2 ? 0.71 : 0.87), ux = Math.cos(an) * u * h, uz = -Math.sin(an) * u * h; beam(l, ax + ux, y, az + uz, bx + ux, y, bz + uz, 0.35, 0x3a3d40); }); }
  // an aircraft as a dart seen from above (len metres), nose +z
  const DART = [[0, 0.5], [0.06, 0.3], [0.1, 0.06], [0.48, -0.2], [0.48, -0.27], [0.1, -0.22], [0.08, -0.34], [0.23, -0.46], [0.23, -0.5], [-0.23, -0.5], [-0.23, -0.46], [-0.08, -0.34], [-0.1, -0.22], [-0.48, -0.27], [-0.48, -0.2], [-0.1, 0.06], [-0.06, 0.3]];
  function jet(l, x, z, ry, len, c, y0) { local(l, x, y0 || 0.4, z, ry, len, (M) => { add(M, P.slab(DART, 0.035), c || C.iriaf, [0, 0.06, 0]); b(M, 0.09, 0.08, 0.8, c || C.iriaf, 0, 0.1, 0); b(M, 0.012, 0.13, 0.14, c || C.iriaf, 0, 0.17, -0.4); b(M, 0.06, 0.03, 0.12, C.glass, 0, 0.15, 0.22); }); }
  // a ship from the side: len, beam; kind 'tanker' (superstructure aft), 'warship', 'sub'
  function ship(l, x, z, ry, len, bm, kind) {
    local(l, x, 0.3, z, ry, 1, (M) => {
      const hh = bm * 0.42;
      if (kind === 'sub') { cz(M, bm / 2, len * 0.8, C.black, 0, bm * 0.5, 0, 8); ball(M, bm / 2, C.black, 0, bm * 0.5, len * 0.4, 6); add(M, P.cyl(bm / 2, bm * 0.06, len * 0.16, 8), C.black, [0, bm * 0.5, -len * 0.48], [H, 0, 0]); bs(M, bm * 0.55, bm * 0.7, len * 0.14, C.black, 0, bm * 0.6, len * 0.12); return; }
      const hc = kind === 'tanker' ? 0x2b2d30 : C.navy;
      add(M, P.profile([[-len / 2, 0], [len / 2 - bm * 0.6, 0], [len / 2, hh * 1.1], [-len / 2, hh * 1.05]], bm), hc);
      if (kind === 'tanker') {
        b(M, bm * 1.004, hh * 0.35, len * 0.9, C.hullRed, 0, hh * 0.17, -len * 0.04); b(M, bm * 0.94, 0.4, len * 0.9, 0x6b3a2e, 0, hh * 1.05 + 0.2, 0);
        b(M, bm * 0.08, 1.4, len * 0.7, C.steel, 0, hh * 1.05 + 0.9, len * 0.04); b(M, bm * 0.5, 1.2, bm * 0.08, C.steel, 0, hh * 1.05 + 0.8, 0);
        bs(M, bm * 0.8, bm * 0.45, bm * 0.35, C.white, 0, hh * 1.05, -len / 2 + bm * 0.35); bs(M, bm * 0.95, 1.2, bm * 0.16, C.white, 0, hh * 1.05 + bm * 0.42, -len / 2 + bm * 0.42);
        bs(M, bm * 0.18, bm * 0.25, bm * 0.2, 0x2b2d30, 0, hh * 1.05 + bm * 0.3, -len / 2 + bm * 0.12);
      } else {
        b(M, bm * 0.9, 0.3, len * 0.9, C.deck, 0, hh * 1.05, 0);
        bs(M, bm * 0.7, bm * 0.45, len * 0.22, C.navy, 0, hh * 1.05, len * 0.02); bs(M, bm * 0.5, bm * 0.4, len * 0.12, C.navy, 0, hh * 1.05 + bm * 0.45, len * 0.04);
        b(M, 0.6, bm * 0.9, 0.6, C.navyDark, 0, hh * 1.05 + bm * 1.1, len * 0.06); bs(M, bm * 0.3, bm * 0.2, bm * 0.4, C.navyDark, 0, hh * 1.05, len * 0.3); b(M, 0.4, 0.4, bm * 0.5, C.navyDark, 0, hh * 1.05 + bm * 0.25, len * 0.3 + bm * 0.3);
      }
    });
  }
  // small site vehicles (drawn s, default 2x): a tank, a truck, a canister launcher with raised canisters, a radar truck
  function miniTank(l, x, z, ry, c, s) { local(l, x, 0.4, z, ry, s || 2, (M) => { b(M, 3.5, 0.9, 7.5, C.dark, 0, 0.55, 0); b(M, 3.6, 0.7, 7.4, c, 0, 1.3, 0); add(M, P.slab([[-1.6, -1.8], [1.6, -1.8], [1.6, 0.8], [0.8, 1.8], [-0.8, 1.8], [-1.6, 0.8]], 0.9), c, [0, 2.1, -0.4]); cz(M, 0.12, 4.8, c, 0, 2.1, 3.6, 6); }); }
  function miniTruck(l, x, z, ry, c, s, box) { local(l, x, 0.4, z, ry, s || 2, (M) => { b(M, 2.4, 0.9, 8, C.dark, 0, 0.7, 0); bs(M, 2.4, 2.0, 2.2, c, 0, 0.9, 2.8); if (box) bs(M, 2.4, 2.4, 5.4, box, 0, 1.0, -1.3); else bs(M, 2.4, 0.9, 5.4, c, 0, 1.0, -1.3); }); }
  function miniLauncher(l, x, z, ry, c, s, n, round) {
    local(l, x, 0.4, z, ry, s || 2, (M) => {
      b(M, 2.8, 1.0, 11, C.dark, 0, 0.75, 0); bs(M, 2.8, 2.0, 2.4, c, 0, 1.0, 4.3); bs(M, 2.8, 0.6, 8, c, 0, 1.2, -1.4);
      const Q = []; if (round) tubePack(Q, 2, 2, 0.48, 7, 0xbdb9a2, null, 0.08, 0, 0, 6); else boxPack(Q, n || 2, 2, 0.95, 0.95, 6.5, 0xc8c0a2, null, 0.08, 0, 0);
      const m = new T.Matrix4().makeRotationX(-1.35).setPosition(0, 1.8, -5.0); Q.forEach((p) => { p.g.applyMatrix4(m); M.push(p); });
    });
  }
  function miniRadar(l, x, z, ry, c, s) { local(l, x, 0.4, z, ry, s || 2, (M) => { b(M, 2.8, 1.0, 9, C.dark, 0, 0.75, 0); bs(M, 2.8, 2.0, 2.4, c, 0, 1.0, 3.3); bs(M, 2.8, 1.0, 6, c, 0, 1.0, -1.2); panel(M, 4.4, 3.8, 0.5, 0x9a957f, c, 0, 2.0, -1.0, 0.4); }); }
  // a SAM site in miniature: launchers in revetments on a ring around a radar
  function samSite(l, x, z, c, n, R, s, round) {
    for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2 + 0.3, px = x + Math.sin(a) * R, pz = z + Math.cos(a) * R; berm(l, 9 * s, 2.2, 4 * s, X.earth, px + Math.sin(a) * 4.5 * s, 0.4, pz + Math.cos(a) * 4.5 * s, a, 0.4); miniLauncher(l, px, pz, a + PI, c, s, 2, round); }
    miniRadar(l, x, z, 0.4, c, s); road(l, x - R, z, x + R, z, 4, X.padDark); road(l, x, z - R, x, z + R, 4, X.padDark);
  }
  // a dense field of city blocks: o = { x, z, w, d, n, cols, hMin, hMax, tower:[count,min,max], towerCols, towerShape, pitch, roofCol, skip:[[x,z,r]], seed, glow, round, jit }
  function city(L, o) {
    const r = rng(o.seed || 7), cells = Math.ceil(Math.sqrt((o.n * o.w) / o.d)), rows = Math.ceil(o.n / cells), sx = o.w / cells, sz = o.d / rows;
    const ox = o.x || 0, oz = o.z || 0; let placed = 0;
    for (let i = 0; i < cells; i++) for (let j = 0; j < rows; j++) {
      const x = ox - o.w / 2 + (i + 0.5) * sx + (r() - 0.5) * sx * 0.25, z = oz - o.d / 2 + (j + 0.5) * sz + (r() - 0.5) * sz * 0.25;
      const roll = r();
      if (o.skip && o.skip.some((k) => Math.hypot(x - k[0], z - k[1]) < k[2])) continue;
      if (o.round && Math.hypot((x - ox) / (o.w / 2), (z - oz) / (o.d / 2)) > 0.95 + roll * 0.12) continue;
      const tall = o.tower && r() < o.tower[0] / o.n, hgt = tall ? o.tower[1] + r() * (o.tower[2] - o.tower[1]) : o.hMin + Math.pow(r(), 2) * (o.hMax - o.hMin);
      const pal = tall && o.towerCols ? o.towerCols : o.cols, c = pal[Math.floor(r() * pal.length)];
      const w = sx * (tall ? 0.42 + r() * 0.2 : 0.55 + r() * 0.3), d = sz * (tall ? 0.42 + r() * 0.2 : 0.55 + r() * 0.3);
      if (tall && o.towerShape === 'mix' && r() < 0.35) cs(L.solid, Math.min(w, d) / 2, hgt, c, x, 0.4, z, 8);
      else bs(L.solid, w, hgt, d, c, x, 0.4, z, (r() - 0.5) * (o.jit || 0));
      if (!tall && o.pitch && r() < o.pitch) add(L.solid, P.profile([[-d / 2, 0], [d / 2, 0], [0, Math.min(w, d) * 0.4]], w), o.roofCols ? o.roofCols[Math.floor(r() * o.roofCols.length)] : (o.roofCol || X.roofRed), [x, hgt + 0.4, z]);
      else if (r() < 0.3) bs(L.solid, w * 0.3, 2.5, d * 0.3, C.concrete, x + w * 0.15, hgt + 0.4, z - d * 0.1);
      if (o.glow && r() < o.glow) b(L.glow, w * 0.6, Math.max(1.2, hgt * 0.04), 0.2, tall ? X.winCool : X.win, x, 0.4 + hgt * (0.3 + r() * 0.5), z + d / 2 + 0.12);
      placed++;
    }
    return placed;
  }
  // a mosque: a dome on a drum and two minarets (s = drawing scale)
  function mosque(l, x, z, s, domeC, ry) { local(l, x, 0.4, z, ry, s, (M) => { bs(M, 30, 10, 30, X.lime, 0, 0, 0); cs(M, 10, 4, X.lime, 0, 10, 0, 10); dome(M, 10.5, domeC || X.copper, 0, 14, 0, 10, 1.15); [[1, 1], [-1, 1]].forEach((p) => { cs(M, 1.6, 34, X.lime, p[0] * 17, 0, p[1] * 17, 8); ct(M, 0, 1.8, 5, domeC || X.copper, p[0] * 17, 34, p[1] * 17, 8); }); }); }
  // a radome on a short tower
  function radome(l, x, z, r, y0) { cs(l, r * 0.8, y0, C.concrete, x, 0.4, z, 8); ball(l, r, C.white, x, 0.4 + y0 + r * 0.7, z, 10); }

  // ================================================================== B) SITES: the Islamic Republic's targets and the region
  // Sites are compact dioramas: footprints tightened and structures drawn about 1.5-2x so the place reads at board size.
  // a mountain: a smooth base and a cluster of craggy peaks (flat-shaded cones), snow on the tallest if snow
  function mountain(l, x, z, w, d, h, seed, snow, cols) {
    const r = rng(seed || 3), cl = cols || [X.rock, X.rockDark, 0x7a705f];
    hill(l, w * 0.46, h * 0.42, d * 0.46, cl[2], x, z, 0, 10);
    const n = 9; for (let i = 0; i < n; i++) {
      const top = i === 0, px = top ? x : x + (r() - 0.5) * w * 0.7, pz = top ? z : z + (r() - 0.5) * d * 0.5, ph = h * (top ? 1 : 0.5 + r() * 0.38), pr = Math.min(ph * (1.0 + r() * 0.5), d * 0.55);
      const sx = 0.7 + r() * 0.6, sz = 0.7 + r() * 0.6, rx = (r() - 0.5) * 0.1, rz = (r() - 0.5) * 0.1, seg = 5 + (i % 3), rot = r() * PI;
      add(l, P.cyl(pr * 0.06, pr, ph, seg), cl[i % 2], [px, ph / 2 + pr * 0.05, pz], [rx, rot, rz], [sx, 1, sz]);
      if (snow && ph > h * 0.8) add(l, P.cyl(pr * 0.02, pr * 0.3, ph * 0.3, seg), 0xf1f1ec, [px, ph * 0.84, pz], [rx, rot, rz], [sx, 1, sz]);
    }
  }
  // perimeter fence as a pale low line
  function fence(l, hw, hd, c) { [[0, hd, hw * 2, 2], [0, -hd, hw * 2, 2], [hw, 0, 2, hd * 2], [-hw, 0, 2, hd * 2]].forEach((f) => bs(l, f[2], 2.5, f[3], c || 0xcbc4b3, f[0], 0.4, f[1])); }

  K.define('site_airbase', { name: 'Air base', real: 'Fighter air base: runway, taxiway, hardened shelters, tower', cat: 'site', role: 'air base', side: 'any', len: 1500 }, (K, o) => {
    const L = K.lists(), side = o.variant || 'ir', jc = side === 'ir' ? C.iriaf : side === 'il' ? C.israel : C.usaf;
    tile(L.solid, 1540, 470, 0xb3a684);
    const rz = -150; bs(L.solid, 1480, 0.5, 52, C.asphalt, 0, 0.4, rz);
    for (let i = 0; i < 19; i++) b(L.solid, 34, 0.1, 4, X.stripeW, -576 + i * 64, 0.95, rz);
    [1, -1].forEach((s) => { for (let k = 0; k < 6; k++) b(L.solid, 38, 0.1, 4.6, X.stripeW, s * 712, 0.95, rz - 20 + k * 8); [-14, 14].forEach((dz) => b(L.solid, 28, 0.1, 8, X.stripeW, s * 630, 0.95, rz + dz)); });
    b(L.solid, 1440, 0.1, 2, X.stripeW, 0, 0.95, rz + 24); b(L.solid, 1440, 0.1, 2, X.stripeW, 0, 0.95, rz - 24);
    bs(L.solid, 1320, 0.45, 26, X.padDark, 0, 0.4, -78); [-650, -230, 230, 650].forEach((x) => bs(L.solid, 26, 0.42, 72, X.padDark, x, 0.4, -114));
    bs(L.solid, 320, 0.45, 96, X.pad, -300, 0.4, 0);
    // hardened aircraft shelters (drawn 1.7x): arched vaults, doors toward the taxiway, links
    const arch = []; for (let k = 0; k <= 8; k++) { const a = (k / 8) * PI; arch.push([Math.cos(a) * 22, Math.sin(a) * 18]); }
    for (let i = 0; i < 7; i++) {
      const x = 40 + i * 84, z = 70; add(L.solid, shapeXY(arch, 54), 0x8e8a7d, [x, 0.4, z]); bs(L.solid, 50, 21, 4, C.concrete, x, 0.4, z - 28); b(L.solid, 38, 15, 0.5, 0x55585a, x, 8, z - 30.2);
      bs(L.solid, 34, 0.42, 66, X.padDark, x, 0.4, z - 62); if (i % 2 === 0) jet(L.solid, x, z - 52, PI, 44, jc);
    }
    // tower, hangars, fuel, the apron's parked jets
    bs(L.solid, 13, 50, 13, C.offwhite, -90, 0.4, 70); bs(L.solid, 20, 9, 20, C.glass, -90, 50.4, 70); bs(L.solid, 22, 1.6, 22, X.roofGrey, -90, 59.4, 70); b(L.glow, 20.4, 1.6, 20.4, X.winCool, -90, 55, 70);
    bs(L.solid, 54, 14, 30, C.offwhite, -150, 0.4, 120);
    [-610, -480].forEach((x) => { bs(L.solid, 110, 24, 74, 0x9a9890, x, 0.4, 100); add(L.solid, shapeXY([[-55, 0], [-36, 11], [0, 16], [36, 11], [55, 0]], 74), X.roofGrey, [x, 24.4, 100]); b(L.solid, 86, 20, 0.5, 0x5f6262, x, 10.4, 62.8); });
    for (let i = 0; i < 5; i++) jet(L.solid, -420 + i * 60, -8, PI, 46, jc);
    tankFarm(L.solid, 3, 1, 13, 14, 8, 620, 150, X.tankW); bldg(L.solid, 70, 14, 26, C.offwhite, 420, 160, 0); bldg(L.solid, 46, 14, 26, C.offwhite, 330, 160, 0);
    road(L.solid, -740, 205, 740, 205, 10, X.padDark); flag(L, -130, 30, 30, 4);
    return K.group(L, o.team, 'site_airbase');
  });

  K.define('site_missile', { name: 'Missile base', real: 'IRGC missile base: tunnel portals in a ridge, a launcher outside', cat: 'site', role: 'ballistic missile base', side: 'ir', len: 480, anim: A.erect('erect', 16, H - 0.05) }, (K, o) => {
    const L = K.lists(); tile(L.solid, 480, 380, 0xb5a37f);
    mountain(L.solid, 0, -90, 470, 200, 150, 5);
    [-120, 0, 120].forEach((x, i) => {
      berm(L.solid, 86, 44, 50, X.rockDark, x, 0, 14, 0, 0.5); portal(L.solid, 20, 16, 14, x, 34, 0); bs(L.solid, 56, 0.42, 60, X.pad, x, 0.4, 72); road(L.solid, x, 100, x * 0.5, 150, 12);
      bs(L.solid, 7, 8, 7, C.concrete, x + 40, 62, -40 + i * 8); b(L.solid, 8, 1.4, 8, C.dark, x + 40, 70.6, -40 + i * 8);
    });
    road(L.solid, -230, 152, 230, 152, 12); bldg(L.solid, 56, 16, 26, C.offwhite, -170, 170, 0); bldg(L.solid, 36, 14, 22, C.offwhite, -110, 172, 0); bldg(L.solid, 40, 10, 40, 0x8f8a7c, 180, 172, 0);
    local(L.solid, 130, 0.4, 76, 0.3, 2.6, (M) => miniTEL(M, X.ir, false)); flag(L, 60, 120, 30, 4);
    const root = K.group(L, o.team, 'site_missile');
    const V = K.lists(); const t = truck(V, { len: 13.3, wid: 3.05, axles: [4.4, 2.4, -2.2, -4.3], r: 0.78, col: X.ir, cab: 'split', cabLen: 2.8, lo: true }); bs(V.solid, 2.6, 0.45, 9.6, X.ir, 0, t.y, -1.7);
    const s = 2.6, g = K.group(V, o.team, 'tel'); g.position.set(-10, 0.4, 84); g.scale.setScalar(s); root.add(g);
    const e = moving(root, o.team, 'erect', (M) => { b(M.solid, 1.4, 0.3, 11, X.irGreen, 0, 0.2, 5.6); irMissile(M.solid, 0.35, 0.95, 0.8); }, -10, 0.4 + s * (t.y + 0.65), 84 - s * 6.4); e.scale.setScalar(s);
    return root;
  });

  // a distillation column with its platforms
  function column(l, r, h, x, z) { cs(l, r, h, 0xcfccc3, x, 0.4, z, 8); dome(l, r, 0xcfccc3, x, h + 0.4, z, 8, 0.6); for (let k = 1; k <= 3; k++) cs(l, r + 2, 1.2, 0x7d838a, x, 0.4 + (h * k) / 4, z, 8); }
  K.define('site_refinery', { name: 'Oil refinery', real: 'Refinery: distillation columns, tank farm, pipe racks, flare stack', cat: 'site', role: 'refinery / fuel', side: 'any', len: 500, anim: A.flicker('flame') }, (K, o) => {
    const L = K.lists(); tile(L.solid, 500, 370, 0xa99d80);
    tankFarm(L.solid, 3, 3, 24, 22, 12, -140, 40, X.tankW); for (let i = 0; i < 4; i++) tank(L.solid, 12, 15, -200 + i * 34, -130, 0xd2cdc0);
    // the process block: columns, a cracker in an open frame, furnaces, a chimney
    [[10, -60, 6, 92], [36, -70, 8, 110], [24, -30, 5, 76], [58, -40, 6.5, 98], [-6, -20, 4.5, 64], [80, -76, 5, 84]].forEach((p) => column(L.solid, p[2], p[3], p[0], p[1]));
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach((p) => b(L.metal, 2.4, 64, 2.4, 0x7d838a, 70 + p[0] * 22, 32.4, 70 + p[1] * 16));
    [18, 36, 54].forEach((y) => bs(L.solid, 48, 2, 36, 0x737a80, 70, y, 70)); cs(L.solid, 8, 96, 0xcfccc3, 78, 0.4, 74, 8); cs(L.solid, 6, 44, 0xbab6ad, 60, 20, 62, 8);
    bs(L.solid, 44, 26, 18, 0x9d6b4e, -10, 0.4, 96); bs(L.solid, 44, 26, 18, 0x9d6b4e, -10, 0.4, 124); stack(L.solid, 5, 120, 20, 150, 4);
    [[150, 100], [186, 100], [168, 132]].forEach((p) => { ball(L.solid, 15, 0xece9df, p[0], 22, p[1], 8); [[1, 1], [-1, -1], [1, -1], [-1, 1]].forEach((q) => b(L.metal, 1.4, 16, 1.4, C.steel, p[0] + q[0] * 9, 8.4, p[1] + q[1] * 9)); });
    bs(L.solid, 90, 14, 26, 0x7d8a8f, 150, 0.4, -120); for (let i = 0; i < 5; i++) cy(L.solid, 7, 1.6, 0x3c4246, 116 + i * 17, 15, -120, 0, 0, 0, 8);
    // pipe racks tying it together
    [[-40, 0, 220, 0], [110, -150, 110, 150], [-40, -80, 110, -80]].forEach((r) => { beam(L.solid, r[0], 11, r[1], r[2], 11, r[3], 7, 0x8f8a80); const n = Math.round(Math.hypot(r[2] - r[0], r[3] - r[1]) / 30); for (let i = 0; i <= n; i++) b(L.metal, 1.6, 11, 1.6, C.steel, r[0] + ((r[2] - r[0]) * i) / n, 5.9, r[1] + ((r[3] - r[1]) * i) / n); });
    bldg(L.solid, 44, 14, 26, C.offwhite, 190, -50, 0); road(L.solid, -250, -168, 250, -168, 12, X.padDark);
    for (let i = 0; i < 6; i++) b(L.glow, 2, 2, 2, X.win, 4 + i * 14, 40 + (i % 3) * 12, -50 + (i % 2) * 20);
    // the flare stack and its flame
    ct(L.metal, 2, 3, 140, C.steel, 205, 0.4, 150, 6); [[1, 0], [-1, 0], [0, -1]].forEach((p) => beam(L.metal, 205 + p[0] * 34, 0.4, 150 + p[1] * 34, 205, 110, 150, 1, 0x9aa0a6));
    flag(L, 220, 40, 30, 4);
    const root = K.group(L, o.team, 'site_refinery');
    moving(root, o.team, 'flame', (M) => { ct(M.glowAdd, 0, 10, 38, X.flame, 0, 0, 0, 7); ct(M.glowAdd, 0, 6, 22, X.flameCore, 0, 0, 0, 6); ball(M.glowAdd, 9, X.orange, 0, 2, 0, 6); }, 205, 140.4, 150);
    return root;
  });

  K.define('site_oil_terminal', { name: 'Oil export terminal', real: 'Kharg-style crude terminal: T-jetty, moored tankers, tank farm', cat: 'site', role: 'oil export terminal', side: 'ir', len: 1000 }, (K, o) => {
    const L = K.lists();
    bs(L.solid, 380, 0.5, 760, 0xb8a882, -310, 0, 0); water(L.solid, 620, 760, 190, 0); bs(L.solid, 30, 0.55, 760, X.sandG, -115, 0, 0);
    tankFarm(L.solid, 4, 3, 26, 24, 14, -320, -130, X.tankW); tankFarm(L.solid, 3, 2, 22, 20, 12, -340, 210, 0xd8d3c6);
    bldg(L.solid, 60, 18, 34, C.offwhite, -170, 110, 0); bldg(L.solid, 36, 12, 24, C.offwhite, -170, 170, 0); stack(L.solid, 4, 80, -150, 40, 4);
    // trestle and the T-head jetty on piles, loading arms, mooring dolphins
    beam(L.solid, -250, 4, -6, -100, 4, -6, 3.5, 0x6c6a62); beam(L.solid, -250, 4, 6, -100, 4, 6, 3.5, 0x6c6a62);
    bs(L.solid, 380, 2, 18, C.concrete, 70, 6, 0); for (let i = 0; i < 7; i++) bs(L.solid, 4, 6, 14, 0x7c7a72, -100 + i * 55, 0, 0);
    bs(L.solid, 36, 2.4, 660, C.concrete, 260, 6, 0); for (let i = 0; i < 11; i++) bs(L.solid, 30, 6, 4, 0x7c7a72, 260, 0, -300 + i * 60);
    for (let i = 0; i < 4; i++) { const z = -230 + i * 150; [1, -1].forEach((s) => { b(L.metal, 2.4, 30, 2.4, C.steel, 260 + s * 14, 23, z); beam(L.metal, 260 + s * 14, 37, z, 260 + s * 28, 20, z, 1.8, 0xd8b23a); }); bs(L.solid, 16, 9, 14, C.offwhite, 260, 8.4, z + 40); }
    [-370, -330, 330, 370].forEach((z) => cs(L.solid, 9, 9, C.concrete, 260, 0, z, 8));
    ship(L.solid, 310, -90, 0, 330, 58, 'tanker'); ship(L.solid, 212, 170, PI, 270, 48, 'tanker');
    flag(L, -140, -20, 30, 4);
    return K.group(L, o.team, 'site_oil_terminal');
  });

  K.define('site_oilfield', { name: 'Oilfield', real: 'Onshore oilfield: pumpjacks, flowlines, a gathering station', cat: 'site', role: 'oil production', side: 'any', len: 420, anim: A.nod('nod', 0.32, 1.6) }, (K, o) => {
    const L = K.lists(); tile(L.solid, 420, 340, 0xc0ab83);
    const wells = [[-140, -100], [-20, -120], [110, -95], [-125, 45], [-5, 15], [125, 40]];
    tankFarm(L.solid, 3, 1, 12, 14, 8, 110, 125, X.tankW); cz(L.solid, 6, 30, 0xd9d6cc, 20, 7, 130, 8); bldg(L.solid, 26, 9, 18, C.offwhite, -40, 130, 0);
    ct(L.metal, 1.2, 1.8, 54, C.steel, 175, 0.4, 70, 6); ct(L.glowAdd, 0, 4, 14, X.flame, 175, 54.4, 70, 6);
    wells.forEach((w) => { beam(L.solid, w[0], 1.2, w[1], 20, 1.2, 128, 2, 0x5a5650); bs(L.solid, 50, 0.42, 34, 0xa59575, w[0], 0.4, w[1]); });
    road(L.solid, -210, 160, 210, 160, 10, 0x8e8068); road(L.solid, -210, -40, 210, -30, 9, 0x8e8068);
    flag(L, -110, 150, 24, 3.4);
    const root = K.group(L, o.team, 'site_oilfield');
    // pumpjacks (drawn 4x): skid, samson post, the walking beam nods
    const S0 = K.lists(), s = 4;
    wells.forEach((w, i) => {
      const ry = (i * 1.3) % (PI * 2);
      local(S0.solid, w[0], 0.4, w[1], ry, s, (M) => { b(M, 1.6, 0.5, 9, 0x3c3f42, 0, 0.25, -1); [[0.7, 1.2], [-0.7, 1.2], [0.7, -1.2], [-0.7, -1.2]].forEach((q) => beam(M, q[0], 0.5, q[1], 0, 6, 0, 0.3, 0x6b6f72)); bs(M, 1.4, 1.6, 1.4, 0x3c3f42, 0, 0.5, -4.4); cs(M, 0.35, 1.2, C.steel, 0, 0.5, 3.4, 6); });
      const nod = moving(root, o.team, 'nod', (M) => { b(M.solid, 0.5, 0.7, 8.6, X.redB, 0, 0, 0.4); add(M.solid, P.profile([[0, -1.6], [0.9, -0.6], [0.9, 0.7], [0, 1.0]], 0.7), X.redB, [0, 0, 4.4]); b(M.solid, 1.4, 1.6, 1.2, 0x3c3f42, 0, -0.6, -3.6); b(M.metal, 0.08, 4.6, 0.08, C.steel, 0, -3.4, 5.3); }, w[0], 0.4 + 6.2 * s, w[1], ry);
      nod.scale.setScalar(s);
    });
    root.add(K.group(S0, o.team, 'pj'));
    return root;
  });

  K.define('site_nuclear_enrich', { name: 'Enrichment plant', real: 'Natanz-type enrichment site: buried cascade halls under earth berms', cat: 'site', role: 'nuclear enrichment', side: 'ir', len: 720 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 720, 540, 0xb9a985);
    // the two buried cascade halls and the support hall between, under earth and concrete, vent shafts on top
    [-110, 110].forEach((x) => { berm(L.solid, 180, 24, 160, 0x9c8c68, x, 0.4, -50, 0, 0.74); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { bs(L.solid, 10, 9, 10, C.concrete, x - 36 + i * 36, 24.4, -80 + j * 60); b(L.solid, 12, 1.6, 12, C.dark, x - 36 + i * 36, 34.2, -80 + j * 60); } });
    berm(L.solid, 50, 18, 110, 0x968563, 0, 0.4, -50, 0, 0.7);
    // the access tunnel: a ramp and a portal at the end of a cut
    bs(L.solid, 20, 0.42, 120, C.asphalt, 0, 0.4, 110); berm(L.solid, 56, 20, 36, 0x968563, 0, 0.4, 36, 0, 0.55); portal(L.solid, 16, 12, 10, 0, 56, 0);
    // pilot plant and admin buildings above ground
    [[-230, 170, 90, 26, 44], [-120, 185, 60, 20, 36], [130, 175, 80, 18, 34], [240, 185, 50, 18, 40], [-270, 70, 40, 14, 30], [280, 60, 50, 14, 34]].forEach((p) => bldg(L.solid, p[2], p[3], p[4], C.offwhite, p[0], p[1], 0));
    for (let i = 0; i < 7; i++) b(L.glow, 8, 2, 0.3, X.win, -264 + i * 12, 14, 192.3);
    // the double perimeter fence, guard towers on the corners
    fence(L.solid, 340, 250); fence(L.solid, 326, 238, 0xb9b2a0);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach((p) => { bs(L.solid, 5, 20, 5, C.concrete, p[0] * 340, 0.4, p[1] * 250); bs(L.solid, 10, 5, 10, C.concrete, p[0] * 340, 20.4, p[1] * 250); });
    // air defence: a SAM site and gun positions around it
    samSite(L.solid, 255, -175, X.ir, 4, 42, 2.5, false);
    [[-280, -190], [-300, 0], [-20, -205], [40, 215]].forEach((p) => { berm(L.solid, 30, 4, 30, X.earth, p[0], 0.4, p[1], 0.4, 0.5); local(L.solid, p[0], 4.4, p[1], 0.5, 3, (M) => { cs(M, 1.2, 1.2, X.irGreen, 0, 0, 0, 8); beam(M, 0, 1, 0, 0.3, 4, 3, 0.25, C.dark); beam(M, 0, 1, 0, -0.3, 4, 3, 0.25, C.dark); }); });
    road(L.solid, -360, 225, 360, 225, 12); road(L.solid, 0, 170, 0, 225, 12); flag(L, -170, 120, 30, 4);
    return K.group(L, o.team, 'site_nuclear_enrich');
  });

  K.define('site_nuclear_mountain', { name: 'Mountain enrichment site', real: 'Fordow-type site: halls deep under a mountain, tunnel portals, support buildings', cat: 'site', role: 'nuclear enrichment (deep)', side: 'ir', len: 640 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 640, 540, 0xb2a07c);
    mountain(L.solid, 0, -130, 600, 250, 230, 9);
    // two tunnel portals at the foot of the mountain, cut faces and aprons
    [-70, 70].forEach((x) => { berm(L.solid, 90, 50, 56, X.rockDark, x, 0, 42, 0, 0.5); portal(L.solid, 20, 16, 14, x, 66, 0); bs(L.solid, 56, 0.42, 60, X.pad, x, 0.4, 102); });
    // ventilation shafts and a radar up the slope
    [[-90, -60, 90], [60, -80, 100], [-10, -150, 150]].forEach((p) => { bs(L.solid, 12, 12, 12, C.concrete, p[0], p[2], p[1]); b(L.solid, 14, 2, 14, C.dark, p[0], p[2] + 13, p[1]); });
    radome(L.solid, 200, -60, 16, 80);
    // support complex: halls, offices, parking, the fence
    [[-210, 190, 80, 24, 40], [-110, 205, 56, 18, 32], [20, 200, 50, 18, 34], [150, 190, 90, 26, 44], [-250, 120, 34, 14, 24]].forEach((p) => bldg(L.solid, p[2], p[3], p[4], C.offwhite, p[0], p[1], 0));
    bs(L.solid, 70, 0.42, 40, C.asphalt, 250, 0.4, 220); for (let i = 0; i < 6; i++) b(L.glow, 9, 2, 0.3, X.win, -240 + i * 12, 14, 210.3);
    fence(L.solid, 300, 250);
    road(L.solid, -70, 132, -20, 250, 12); road(L.solid, 70, 132, -20, 250, 12); road(L.solid, -310, 250, 310, 250, 12);
    samSite(L.solid, 235, 80, X.ir, 3, 34, 2.5, true); flag(L, -160, 140, 30, 4);
    return K.group(L, o.team, 'site_nuclear_mountain');
  });

  // a containment building: cylinder and dome (VVER style), optional band
  function reactor(l, r, h, x, z, c, band) { cs(l, r, h, c || 0xe6e2d8, x, 0.4, z, 14); dome(l, r, c || 0xe6e2d8, x, h + 0.4, z, 14, 0.62); if (band) cs(l, r * 1.01, 3, band, x, h * 0.8, z, 14); }
  K.define('site_reactor', { name: 'Nuclear power plant', real: 'Bushehr-type plant: one containment dome, turbine hall, sea intake', cat: 'site', role: 'nuclear power', side: 'ir', len: 520 }, (K, o) => {
    const L = K.lists(); bs(L.solid, 520, 0.45, 330, 0xbca97f, 0, 0, -45); water(L.solid, 520, 90, 0, 165); bs(L.solid, 520, 0.5, 20, X.sandG, 0, 0, 115);
    bs(L.solid, 96, 22, 86, 0xd8d0be, -50, 0.4, -10); reactor(L.solid, 38, 62, -50, -10, 0xece8de, 0xb0a48a);
    bs(L.solid, 130, 40, 50, 0xc9c4b8, 85, 0.4, -10); bs(L.solid, 134, 1.6, 54, 0x6f8fa3, 85, 40.4, -10);
    [[-160, -60, 50, 26, 40], [-160, 30, 40, 20, 30], [40, -110, 60, 18, 30], [170, -110, 40, 14, 30], [-60, 70, 40, 16, 24]].forEach((p) => bldg(L.solid, p[2], p[3], p[4], 0xddd6c6, p[0], p[1], 0));
    stack(L.solid, 4.4, 130, -110, -95, 4); for (let i = 0; i < 2; i++) bs(L.solid, 12, 4, 80, C.concrete, 60 + i * 34, 0.2, 105);
    // switchyard and lines leaving inland
    bs(L.solid, 120, 0.42, 60, 0x8f8b84, 190, 0.4, -160); for (let i = 0; i < 4; i++) { b(L.metal, 1.4, 22, 1.4, C.steel, 145 + i * 30, 11.4, -172); b(L.metal, 1.4, 22, 1.4, C.steel, 145 + i * 30, 11.4, -146); b(L.metal, 1.4, 1.4, 28, C.steel, 145 + i * 30, 22.4, -159); bs(L.solid, 10, 8, 6, 0x6f7377, 145 + i * 30, 0.4, -128); }
    pylon(L.solid, 130, -205, 46, 0); pylon(L.solid, 250, -205, 46, 0); wires(L.solid, 130, -205, 250, -205, 46);
    road(L.solid, -260, -195, 120, -195, 12); flag(L, -150, 80, 30, 4);
    for (let i = 0; i < 6; i++) b(L.glow, 8, 2, 0.3, X.win, 35 + i * 15, 16, 15.3);
    return K.group(L, o.team, 'site_reactor');
  });

  K.define('site_power', { name: 'Thermal power plant', real: 'Gas / oil-fired power station: turbine hall, stacks, cooling towers, switchyard', cat: 'site', role: 'electric power', side: 'any', len: 560 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 560, 400, 0xaea184);
    bs(L.solid, 180, 38, 50, 0xc8c3b6, -60, 0.4, 30); bs(L.solid, 184, 1.6, 54, 0x6f8fa3, -60, 38.4, 30);
    [-120, -60, 0].forEach((x) => { bs(L.solid, 46, 64, 40, 0xb4aea1, x, 0.4, -24); bs(L.solid, 42, 1.4, 36, X.roofGrey, x, 64.4, -24); });
    stack(L.solid, 6, 170, -150, -80, 5); stack(L.solid, 6, 170, -60, -80, 5); stack(L.solid, 6, 170, 30, -80, 5);
    cooling(L.solid, 46, 130, 160, -90); cooling(L.solid, 46, 130, 160, 40);
    tankFarm(L.solid, 2, 1, 18, 18, 10, -200, 140, X.tankW);
    bs(L.solid, 130, 0.42, 70, 0x8f8b84, 30, 0.4, 145); for (let i = 0; i < 5; i++) { b(L.metal, 1.4, 24, 1.4, C.steel, -20 + i * 25, 12.4, 128); b(L.metal, 1.4, 24, 1.4, C.steel, -20 + i * 25, 12.4, 162); b(L.metal, 1.4, 1.4, 36, C.steel, -20 + i * 25, 24.4, 145); bs(L.solid, 12, 9, 7, 0x6a6e72, -20 + i * 25, 0.4, 110); }
    pylon(L.solid, 130, 145, 50, H); pylon(L.solid, 250, 145, 50, H); wires(L.solid, 130, 145, 250, 145, 50);
    bldg(L.solid, 50, 14, 26, C.offwhite, -200, 70, 0); road(L.solid, -280, 190, 280, 190, 12); flag(L, -230, 10, 30, 4);
    for (let i = 0; i < 9; i++) b(L.glow, 9, 2, 0.3, X.win, -136 + i * 18, 22, 55.3);
    return K.group(L, o.team, 'site_power');
  });

  // a power transformer: tank, radiator fins, bushings
  function transformer(l, x, z, s) { local(l, x, 0.4, z, 0, s || 1, (M) => { bs(M, 8, 6, 5, 0x6f7a72, 0, 0, 0); for (let i = 0; i < 5; i++) { bs(M, 0.4, 5, 2.2, 0x5f6862, -3 + i * 1.5, 0.4, 3.6); bs(M, 0.4, 5, 2.2, 0x5f6862, -3 + i * 1.5, 0.4, -3.6); } [-2.5, 0, 2.5].forEach((bx) => ct(M, 0.25, 0.45, 3.4, 0x9a5a3a, bx, 6, 0, 6)); cs(M, 1.2, 2.2, 0x6f7a72, 3, 6, 1.6, 8); }); }
  K.define('site_substation', { name: 'Electrical substation', real: 'High-voltage substation: transformers, gantries, lines leaving', cat: 'site', role: 'electric grid node', side: 'any', len: 420 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 300, 240, 0x99958c);
    for (let i = 0; i < 4; i++) transformer(L.solid, -90 + i * 60, 45, 2.6);
    // gantries: posts and crossbeams over the bays; breakers in rows; busbars
    [-75, -5].forEach((z) => { for (let i = 0; i < 6; i++) b(L.metal, 1.6, 30, 1.6, C.steel, -120 + i * 48, 15.4, z); b(L.metal, 244, 1.6, 1.6, C.steel, 0, 30.4, z); b(L.metal, 244, 1.2, 1.2, C.steel, 0, 22.4, z); });
    for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) ct(L.solid, 0.9, 1.3, 10, 0xc9c4b6, -120 + i * 48 - 7 + k * 7, 0.4, -40, 6);
    for (let k = 0; k < 3; k++) beam(L.metal, -122, 20, -46 + k * 7, 122, 20, -46 + k * 7, 0.7, 0x8a8f94);
    bldg(L.solid, 34, 10, 18, C.offwhite, 100, 95, 0); fence(L.solid, 148, 118, 0xbdb8ac);
    // lines leaving in two directions
    [-1, 1].forEach((d) => { pylon(L.solid, d * 165, -40, 46, H); pylon(L.solid, d * 215, -40, 46, H); wires(L.solid, d * 165, -40, d * 215, -40, 46); wires(L.solid, d * 120, -40, d * 165, -40, 46); });
    pylon(L.solid, 60, -150, 46, 0); pylon(L.solid, 60, -205, 46, 0); wires(L.solid, 60, -150, 60, -205, 46);
    flag(L, 120, 65, 20, 3);
    return K.group(L, o.team, 'site_substation');
  });

  K.define('site_naval_base', { name: 'Naval base', real: 'Naval base: piers, breakwater, cranes, moored warships and a submarine', cat: 'site', role: 'naval base', side: 'any', len: 760 }, (K, o) => {
    const L = K.lists();
    bs(L.solid, 760, 0.5, 260, 0xb4a584, 0, 0, -190); water(L.solid, 760, 400, 0, 140); bs(L.solid, 760, 2, 14, C.concrete, 0, 0, -60);
    // breakwater: rock armour in a long arm and an elbow
    for (let k = 0; k < 8; k++) berm(L.solid, 54, 8, 24, 0x8d877b, -360 + k * 52, 0, 300, 0, 0.5);
    for (let k = 0; k < 5; k++) berm(L.solid, 46, 8, 24, 0x8d877b, 90 + k * 30, 0, 280 - k * 40, 0.9, 0.5);
    // piers with ships alongside (ships drawn 1.5x)
    [-250, -90, 70].forEach((x) => bs(L.solid, 24, 3, 210, C.concrete, x, 0, 45));
    ship(L.solid, -290, 60, 0, 140, 21, 'warship'); ship(L.solid, -210, 40, PI, 140, 21, 'warship'); ship(L.solid, -130, 40, 0, 110, 18, 'sub'); ship(L.solid, -50, 60, PI, 90, 14, 'warship');
    for (let i = 0; i < 3; i++) ship(L.solid, 130, 0 + i * 44, H, 34, 8, 'warship');
    // drydock with a hull inside, cranes, sheds
    bs(L.solid, 70, 2, 200, 0x7d7a73, 270, 0, 20); bs(L.solid, 52, 2.1, 180, 0x3c4144, 270, 0, 20); ship(L.solid, 270, 20, 0, 150, 22, 'warship');
    [[222, -30], [318, 70]].forEach((p) => { b(L.metal, 4, 70, 4, 0xd4a72c, p[0], 35.4, p[1]); b(L.metal, 3, 3, 70, 0xd4a72c, p[0], 70, p[1] + 20); bs(L.solid, 8, 6, 12, 0xd4a72c, p[0], 60, p[1] - 14); });
    for (let i = 0; i < 2; i++) bs(L.metal, 4, 44, 4, 0xd4a72c, 270 + (i ? 36 : -36), 0, -86); b(L.metal, 84, 6, 5, 0xd4a72c, 270, 44, -86);
    [[-290, -150, 90, 24, 50], [-170, -150, 90, 24, 50], [-40, -170, 70, 18, 36], [100, -160, 80, 20, 44], [250, -190, 70, 16, 40]].forEach((p) => bldg(L.solid, p[2], p[3], p[4], 0xbdb9ad, p[0], p[1], 0));
    cs(L.solid, 22, 0.5, C.concrete, -330, 0.4, -100, 14); b(L.solid, 3, 0.1, 18, X.stripeW, -336, 0.95, -100); b(L.solid, 3, 0.1, 18, X.stripeW, -324, 0.95, -100); b(L.solid, 12, 0.1, 3, X.stripeW, -330, 0.95, -100);
    road(L.solid, -380, -235, 380, -235, 12); flag(L, -110, -100, 30, 4);
    for (let i = 0; i < 6; i++) b(L.glow, 9, 2, 0.3, X.win, -320 + i * 14, 14, -124.7);
    return K.group(L, o.team, 'site_naval_base');
  });

  K.define('site_hq', { name: 'Command headquarters', real: 'Command bunker complex: buried bunker, antennas, helipad, walls', cat: 'site', role: 'command and control', side: 'any', len: 380 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 380, 340, 0xaea285);
    berm(L.solid, 140, 28, 96, 0x8f8366, -40, 0.4, -40, 0, 0.62); portal(L.solid, 12, 9, 10, -40, 18, 0); portal(L.solid, 12, 9, 10, 42, -40, H);
    for (let i = 0; i < 3; i++) { bs(L.solid, 7, 7, 7, C.concrete, -70 + i * 30, 28.4, -50); b(L.solid, 8, 1.2, 8, C.dark, -70 + i * 30, 36, -50); }
    [[110, -100, 96], [140, -40, 80], [110, 10, 64]].forEach((p) => { ct(L.metal, 0.6, 2.4, p[2], C.steel, p[0], 0.4, p[1], 4); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((d) => beam(L.solid, p[0], p[2] * 0.75, p[1], p[0] + d[0] * p[2] * 0.4, 0.4, p[1] + d[1] * p[2] * 0.4, 0.5, 0x55595c)); b(L.metal, 8, 1.6, 1.6, 0xdddddd, p[0], p[2] * 0.82, p[1]); b(L.metal, 6, 1.4, 1.4, 0xdddddd, p[0], p[2] * 0.64, p[1]); });
    [[40, 70], [76, 70]].forEach((p) => { cs(L.solid, 3, 9, C.concrete, p[0], 0.4, p[1], 6); cy(L.solid, 11, 1.2, C.white, p[0], 14, p[1] - 2, -0.7, 0, 0, 12); });
    [[-120, 110, 70, 18, 34], [-30, 120, 56, 16, 28], [-140, 40, 34, 14, 40]].forEach((p) => bldg(L.solid, p[2], p[3], p[4], 0xd8d1c0, p[0], p[1], 0));
    for (let i = 0; i < 6; i++) b(L.glow, 8, 2, 0.3, X.win, -148 + i * 11, 10, 127.3);
    // helipad
    cs(L.solid, 30, 0.5, C.concrete, 130, 0.4, 110, 14); b(L.solid, 4, 0.1, 24, X.stripeW, 122, 0.95, 110); b(L.solid, 4, 0.1, 24, X.stripeW, 138, 0.95, 110); b(L.solid, 16, 0.1, 4, X.stripeW, 130, 0.95, 110);
    // walls and corner towers, the gate
    [[0, 160, 360, 4], [0, -160, 360, 4], [180, 0, 4, 320], [-180, 0, 4, 320]].forEach((f) => bs(L.solid, f[2], 6, f[3], 0xcfc6b2, f[0], 0.4, f[1]));
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach((p) => { bs(L.solid, 8, 20, 8, 0xcfc6b2, p[0] * 180, 0.4, p[1] * 160); bs(L.solid, 12, 4, 12, 0xcfc6b2, p[0] * 180, 20.4, p[1] * 160); });
    bs(L.solid, 30, 0.6, 8, C.asphalt, 0, 0.4, 160); road(L.solid, 0, 160, 0, 200, 12);
    miniTruck(L.solid, 30, 135, 0, X.irGreen, 2.5); miniTruck(L.solid, 52, 135, 0, X.irGreen, 2.5); flag(L, -10, 130, 30, 4);
    return K.group(L, o.team, 'site_hq');
  });

  // ---------------------------------------------------------------- cities and capitals
  K.define('site_city_me', { name: 'City (Middle East)', real: 'Middle Eastern city: dense low-rise, a few towers, a mosque', cat: 'site', role: 'city', side: 'any', len: 900 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 920, 760, 0xb4a383);
    road(L.solid, -460, 0, 460, 0, 18, 0x4a4b4c); road(L.solid, 0, -380, 0, 380, 16, 0x4a4b4c); road(L.solid, -320, -380, 320, 380, 14, 0x4a4b4c);
    city(L, { w: 880, d: 720, n: 210, cols: [X.beige, X.beige2, 0xd8c8a6, 0xc4ae88, 0xe0d4ba], hMin: 9, hMax: 30, tower: [7, 80, 150], towerCols: [0x8fa4b0, 0xcfc8b8, 0x6f8a9a], skip: [[0, 0, 24], [150, 120, 70]], seed: 11, glow: 0.12, round: true });
    mosque(L.solid, 150, 120, 2.4, X.copper, 0.3);
    return K.group(L, o.team, 'site_city_me');
  });

  K.define('cap_tehran', { name: 'Tehran', real: 'Tehran: Milad Tower, Azadi Tower, the Alborz behind', cat: 'site', role: 'capital', side: 'ir', len: 1300 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 1300, 1000, 0xb3a283);
    // the Alborz along the north edge, snow on the peaks
    mountain(L.solid, -330, -420, 640, 200, 260, 13, true); mountain(L.solid, 330, -420, 640, 200, 240, 17, true);
    road(L.solid, -650, 120, 650, 120, 20, 0x4a4b4c); road(L.solid, 100, -300, 100, 500, 18, 0x4a4b4c);
    city(L, { w: 1240, d: 700, z: 130, n: 180, cols: [X.beige, X.beige2, 0xd8c8a6, 0xc4ae88, 0xa99272], hMin: 9, hMax: 32, tower: [8, 60, 120], towerCols: [0x9aa7ae, 0xcfc8b8], skip: [[-300, 40, 90], [-470, 300, 130], [100, 120, 26]], seed: 21, glow: 0.1 });
    // Milad Tower (435 m): podium, tapering shaft, the pod, the mast
    const mx = -300, mz = 40; ct(L.solid, 30, 44, 26, 0xc8c4bc, mx, 0.4, mz, 8); ct(L.solid, 9, 15, 290, 0xcfcbc2, mx, 26, mz, 8);
    ct(L.solid, 34, 14, 26, 0x9fb3c0, mx, 280, mz, 8); ct(L.solid, 30, 34, 18, 0x7f99ab, mx, 306, mz, 8); ct(L.solid, 12, 30, 14, 0xcfcbc2, mx, 324, mz, 8); ct(L.metal, 1.5, 6, 100, C.steel, mx, 338, mz, 6);
    b(L.glow, 60, 3, 60, X.winCool, mx, 300, mz, 0, PI / 8, 0);
    // Azadi Tower (drawn 2x): the split arch of white marble on its oval plaza
    const ax = -470, az = 300; add(L.solid, P.slab([[-110, 0], [-78, -60], [0, -80], [78, -60], [110, 0], [78, 60], [0, 80], [-78, 60]], 0.6), 0xd9d1bd, [ax, 0.7, az]);
    add(L.solid, shapeXY([[-63, 0], [-24, 0], [-14, 30], [0, 48], [14, 30], [24, 0], [63, 0], [31, 52], [20, 76], [12, 90], [-12, 90], [-20, 76], [-31, 52]], 52), 0xeeeae2, [ax, 1, az]);
    ct(L.solid, 14, 18, 10, 0xeeeae2, ax, 91, az, 4); b(L.glass, 18, 10, 0.4, 0x6f95ad, ax, 64, az + 26.3);
    flag(L, 120, 160, 30, 4);
    return K.group(L, o.team, 'cap_tehran');
  });

  K.define('cap_telaviv', { name: 'Tel Aviv', real: 'Tel Aviv: Azrieli towers among the high-rise, the Mediterranean coast', cat: 'site', role: 'capital / city', side: 'il', len: 1000 }, (K, o) => {
    const L = K.lists(); bs(L.solid, 800, 0.45, 800, 0xc9bda2, 100, 0, 0); water(L.solid, 200, 800, -400, 0); bs(L.solid, 36, 0.5, 800, X.sandG, -282, 0, 0);
    road(L.solid, 260, -400, 260, 400, 22, 0x4a4b4c); road(L.solid, -240, -400, -240, 400, 14, 0x4a4b4c);
    city(L, { x: 90, w: 700, d: 780, n: 200, cols: [C.offwhite, 0xe6e1d6, 0xd9d2c3, 0xefece6], hMin: 10, hMax: 28, tower: [18, 80, 200], towerCols: [0x7f9fb5, 0x9ab3c4, 0xcfd6db, 0x5f7f96], towerShape: 'mix', skip: [[260, 0, 75]], seed: 31, glow: 0.12 });
    // Azrieli Center: round, triangular and square towers on a podium
    const zx = 260, zz = 0; bs(L.solid, 120, 18, 90, 0xd8d4cc, zx, 0.4, zz); cs(L.solid, 22, 187, 0x8fa9bb, zx - 36, 18.4, zz + 10, 14);
    add(L.solid, P.slab([[0, 26], [24, -14], [-24, -14]], 169), 0x9db4c4, [zx + 4, 18.4 + 84.5, zz - 18]); bs(L.solid, 34, 154, 34, 0x86a2b6, zx + 40, 18.4, zz + 14);
    [[zx - 36, 205, zz + 10], [zx + 4, 187, zz - 18], [zx + 40, 172, zz + 14]].forEach((p) => b(L.glow, 6, 2, 6, X.winCool, p[0], p[1], p[2]));
    flag(L, 330, 80, 30, 4);
    return K.group(L, o.team, 'cap_telaviv');
  });

  // ================================================================== A) MILITARY GROUND: Russia, Ukraine and their partners
  // a main battle tank or tracked vehicle with a slewing turret. s: { hull:{...}, col, tur:[[x,z]], th, tz, gun:[r, len, y, z0, bulge], gx, extra(M, col), hullExtra(L, h, col) }
  function armour(K, o, type, s) {
    const L = K.lists(), col = s.col, h = tracked(L, Object.assign({ col }, s.hull));
    if (s.hullExtra) s.hullExtra(L, h, col);
    mark(L, 0, h.top + 0.04, -h.len * 0.38, 0.8, 0.8);
    const root = K.group(L, o.team, type);
    moving(root, o.team, 'turret', (M) => {
      if (s.tur) add(M.solid, P.slab(s.tur, s.th), col, [0, s.th / 2, s.tz || 0]);
      if (s.gun) { const g = s.gun; local(M.solid, s.gx || 0, 0, 0, 0, 1, (Q) => barrel(Q, g[0], g[1], col, g[2], g[3], g[4])); }
      if (s.extra) s.extra(M, col);
    }, 0, h.top, s.ty || 0);
    return root;
  }
  const tankAnim = A.slew('turret', 0.55, 0.32);

  K.define('abrams', { name: 'M1 Abrams tank', real: 'M1A2 SEPv3 / M1A1 Abrams', cat: 'land', role: 'main battle tank', side: 'us', len: 9.8, anim: tankAnim }, (K, o) => armour(K, o, 'abrams', {
    col: o.variant === 'green' ? X.usGreen : X.us, hull: { len: 7.9, wid: 3.66, n: 7, r: 0.36, h: 0.72, glacis: 1.9, rear: 0.3, skirt: 0.78, tw: 0.64 }, ty: -0.5,
    tur: [[-1.85, -2.5], [1.85, -2.5], [1.9, 0.4], [1.25, 1.75], [-1.25, 1.75], [-1.9, 0.4]], th: 0.82, gun: [0.12, 5.3, 0.42, 1.7],
    extra: (M, c) => { b(M.solid, 0.9, 0.55, 0.5, c, 0, 0.42, 1.85); b(M.solid, 3.5, 0.5, 0.7, c, 0, 0.5, -2.85); b(M.solid, 0.45, 0.5, 0.45, c, -0.55, 1.05, -0.3); b(M.solid, 0.5, 0.35, 0.6, C.dark, 0.75, 1.0, 0.1); b(M.metal, 0.05, 0.05, 1.0, C.dark, 0.75, 1.1, 0.8); }
  }));
  K.define('m1a2t', { name: 'M1A2T Abrams (Taiwan)', real: 'M1A2T Abrams, Republic of China Army', cat: 'land', role: 'main battle tank', side: 'tw', len: 9.8, anim: tankAnim }, (K, o) => armour(K, o, 'm1a2t', {
    col: X.tw, hull: { len: 7.9, wid: 3.66, n: 7, r: 0.36, h: 0.72, glacis: 1.9, rear: 0.3, skirt: 0.78, tw: 0.64 }, ty: -0.5,
    tur: [[-1.85, -2.5], [1.85, -2.5], [1.9, 0.4], [1.25, 1.75], [-1.25, 1.75], [-1.9, 0.4]], th: 0.82, gun: [0.12, 5.3, 0.42, 1.7],
    extra: (M, c) => { b(M.solid, 0.9, 0.55, 0.5, c, 0, 0.42, 1.85); b(M.solid, 3.5, 0.5, 0.7, c, 0, 0.5, -2.85); b(M.solid, 0.45, 0.5, 0.45, c, -0.55, 1.05, -0.3); b(M.solid, 0.5, 0.35, 0.6, C.dark, 0.75, 1.0, 0.1); }
  }));
  K.define('leopard2', { name: 'Leopard 2 tank', real: 'Leopard 2A6 / 2A4', cat: 'land', role: 'main battle tank', side: 'ua', len: 10.9, anim: tankAnim }, (K, o) => armour(K, o, 'leopard2', {
    col: 0x55603f, hull: { len: 7.7, wid: 3.75, n: 7, r: 0.36, h: 0.72, glacis: 1.3, rear: 0.3, skirt: 0.72, tw: 0.64 }, ty: -0.3,
    tur: [[-1.75, -2.3], [1.75, -2.3], [1.75, 0.6], [0.3, 2.4], [-0.3, 2.4], [-1.75, 0.6]], th: 0.95, gun: [0.1, 6.4, 0.45, 1.0],
    extra: (M, c) => { cs(M.solid, 0.26, 0.55, c, -0.65, 0.95, 0.4, 8); b(M.solid, 3.2, 0.45, 0.6, c, 0, 0.5, -2.55); b(M.solid, 0.5, 0.35, 0.5, c, 0.8, 0.95, 0.9); }
  }));
  K.define('t90', { name: 'T-90 tank', real: 'T-90A / T-90M Proryv', cat: 'land', role: 'main battle tank', side: 'ru', len: 9.6, anim: tankAnim }, (K, o) => armour(K, o, 't90', {
    col: X.ru, hull: { len: 6.9, wid: 3.46, n: 6, r: 0.38, h: 0.6, glacis: 1.6, rear: 0.3, skirt: 0.36, tw: 0.6 }, ty: -0.2,
    hullExtra: (L, h, c) => { [0.6, -0.6].forEach((x) => cx(L.solid, 0.3, 1.0, C.oliveDark, x * 1.5, h.top + 0.05, -3.55, 8)); b(L.solid, 3.0, 0.2, 1.0, 0x4a5233, 0, h.top - 0.25, 2.9, -0.55); },
    tur: [[-1.5, -1.3], [1.5, -1.3], [1.75, 0.3], [0.45, 1.75], [-0.45, 1.75], [-1.75, 0.3]], th: 0.7, gun: [0.09, 6.0, 0.38, 1.3, 0.45],
    extra: (M, c) => { [1, -1].forEach((s) => { b(M.solid, 0.36, 0.3, 0.32, c, s * 0.82, 0.55, 1.2); b(M.glow, 0.22, 0.18, 0.04, 0xff3a28, s * 0.82, 0.55, 1.37); }); cs(M.solid, 0.4, 0.3, c, 0.6, 0.7, -0.2, 8); b(M.metal, 0.05, 0.05, 1.1, C.dark, 0.6, 1.1, 0.4); }
  }));
  K.define('type99', { name: 'Type 99 tank', real: 'ZTZ-99A (Type 99A)', cat: 'land', role: 'main battle tank', side: 'cn', len: 11, anim: tankAnim }, (K, o) => armour(K, o, 'type99', {
    col: X.cn, hull: { len: 7.6, wid: 3.5, n: 6, r: 0.4, h: 0.7, glacis: 1.5, rear: 0.3, skirt: 0.68, tw: 0.62 }, ty: -0.3,
    tur: [[-1.8, -2.0], [1.8, -2.0], [1.85, 0.7], [0.75, 2.3], [-0.75, 2.3], [-1.85, 0.7]], th: 0.88, gun: [0.1, 6.2, 0.42, 1.6, 0.42],
    extra: (M, c) => { b(M.solid, 0.5, 0.45, 0.5, c, 0.7, 1.08, 0.2); b(M.solid, 0.6, 0.3, 0.4, C.dark, -0.7, 1.0, -0.4); b(M.solid, 3.3, 0.4, 0.5, c, 0, 0.45, -2.2); }
  }));
  K.define('bradley', { name: 'Bradley fighting vehicle', real: 'M2A2 ODS / M2A3 Bradley', cat: 'land', role: 'infantry fighting vehicle', side: 'us', len: 6.55, anim: tankAnim }, (K, o) => armour(K, o, 'bradley', {
    col: X.us, hull: { len: 6.55, wid: 3.6, n: 6, r: 0.34, h: 1.25, glacis: 1.1, rear: 0.1, skirt: 0.78, tw: 0.56 }, ty: 0.2,
    tur: [[-1.2, -1.1], [1.2, -1.1], [1.25, 0.5], [0.75, 1.05], [-0.75, 1.05], [-1.25, 0.5]], th: 0.75, gun: [0.05, 2.4, 0.38, 1.0], gx: 0.35,
    extra: (M, c) => { b(M.solid, 0.55, 0.55, 1.45, c, -1.5, 0.5, -0.15); b(M.solid, 0.35, 0.35, 0.35, C.dark, -1.5, 0.5, 0.6); b(M.solid, 0.35, 0.4, 0.35, c, 0.6, 0.95, -0.6); }
  }));
  K.define('bmp', { name: 'BMP infantry fighting vehicle', real: 'BMP-2 / BMP-3', cat: 'land', role: 'infantry fighting vehicle', side: 'ru', len: 6.7, anim: tankAnim }, (K, o) => armour(K, o, 'bmp', {
    col: X.ru, hull: { len: 6.7, wid: 3.15, n: 6, r: 0.36, h: 0.72, glacis: 2.6, rear: 0.25, tw: 0.52 }, ty: -0.1,
    hullExtra: (L, h, c) => { for (let i = 0; i < 4; i++) b(L.solid, 2.6, 0.08, 0.12, 0x47502f, 0, h.top - 0.55 + i * 0.13, 3.0 - i * 0.45, -0.3); },
    tur: [[-0.9, -0.9], [0.9, -0.9], [1.1, 0], [0.9, 0.9], [-0.9, 0.9], [-1.1, 0]], th: 0.6, gun: [0.05, 3.2, 0.35, 0.9],
    extra: (M, c) => { cz(M.solid, 0.1, 1.3, C.dark, 0.25, 0.75, 0.1, 6); cs(M.solid, 0.3, 0.2, c, -0.45, 0.6, -0.2, 6); }
  }));
  K.define('gepard', { name: 'Gepard anti-aircraft gun', real: 'Flakpanzer Gepard 1A2', cat: 'land', role: 'self-propelled anti-aircraft gun', side: 'ua', len: 7.7, anim: A.all(A.slew('turret', 0.8, 0.3), A.spinIn('turret', 'radar', 2.2)) }, (K, o) => {
    const root = armour(K, o, 'gepard', {
      col: 0x4c5539, hull: { len: 7.3, wid: 3.3, n: 7, r: 0.34, h: 0.75, glacis: 1.0, rear: 0.3, skirt: 0.5, tw: 0.55 }, ty: -0.3,
      tur: [[-1.45, -1.6], [1.45, -1.6], [1.45, 1.2], [1.05, 1.6], [-1.05, 1.6], [-1.45, 1.2]], th: 1.2,
      extra: (M, c) => { [1, -1].forEach((s) => { b(M.solid, 0.5, 0.65, 1.8, c, s * 1.75, 0.75, 0.6); beam(M.metal, s * 1.75, 0.9, 1.4, s * 1.75, 2.6, 4.3, 0.12, C.dark); b(M.solid, 0.5, 0.65, 1.8, c, s * 1.75, 0.75, 0.6); }); cy(M.solid, 0.55, 0.1, 0x8f8f7e, 0, 0.75, 1.62, H, 0, 0, 12); b(M.solid, 0.3, 0.8, 0.3, c, 0, 1.6, -1.1); }
    });
    const tu = kid(root, 'turret'); moving(tu, o.team, 'radar', (M) => { b(M.solid, 2.6, 0.9, 0.18, 0x8f8f7e, 0, 0, 0, -0.3); b(M.solid, 0.25, 0.4, 0.3, 0x4c5539, 0, -0.45, -0.15); }, 0, 2.2, -1.1);
    return root;
  });

  K.define('himars', { name: 'HIMARS rocket launcher', real: 'M142 HIMARS (GMLRS / ATACMS pod)', cat: 'land', role: 'precision rocket artillery', side: 'us', len: 7, anim: A.all(A.slew('turret', 0.5, 0.25), (o, dt, t) => { const tu = kid(o, 'turret'); if (tu) { const p = kid(tu, 'pod'); if (p) p.rotation.x = -cyc(t, 14) * 0.9; } }) }, (K, o) => {
    const L = K.lists(), col = X.usGreen; const t = truck(L, { len: 7.0, wid: 2.44, axles: [2.25, -1.2, -2.55], r: 0.6, col, cab: 'flat', cabLen: 2.3, cabH: 1.95 });
    bs(L.solid, 2.4, 0.45, 4.6, col, 0, t.y, -1.15); mark(L, 0, t.cabTop + 0.04, 2.3, 0.8, 0.8);
    const root = K.group(L, o.team, 'himars');
    const tu = moving(root, o.team, 'turret', (M) => { cs(M.solid, 0.9, 0.35, C.dark, 0, 0, 0, 10); b(M.solid, 2.2, 0.4, 1.0, col, 0, 0.5, 0.2); }, 0, t.y + 0.45, -3.1, 0);
    moving(tu, o.team, 'pod', (M) => { b(M.solid, 2.25, 1.0, 4.4, col, 0, 0.5, 2.2); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) cz(M.solid, 0.22, 0.06, C.dark, -0.7 + i * 0.7, 0.27 + j * 0.46, 4.42, 6); }, 0, 0.6, -0.1);
    return root;
  });

  K.define('grad', { name: 'Grad rocket launcher', real: 'BM-21 Grad on Ural-375D', cat: 'land', role: 'multiple rocket launcher', side: 'ru', len: 7.35, anim: A.erect('erect', 15, 0.5) }, (K, o) => {
    const L = K.lists(), col = o.variant === 'ua' ? X.ua : X.ru; const t = truck(L, { len: 7.35, wid: 2.4, axles: [2.5, -1.3, -2.7], r: 0.58, col, cab: 'bonnet', cabLen: 1.9, bonnet: 1.5, cabH: 1.8, lo: true });
    bs(L.solid, 2.3, 0.3, 3.6, col, 0, t.y, -1.6); cs(L.solid, 0.7, 0.4, C.dark, 0, t.y + 0.3, -2.5, 8); mark(L, 0, t.cabTop + 0.04, 1.2, 0.8, 0.8);
    const root = K.group(L, o.team, 'grad');
    moving(root, o.team, 'erect', (M) => { for (let i = 0; i < 10; i++) for (let j = 0; j < 4; j++) add(M.solid, cu(4), j % 2 ? 0x4c5434 : 0x58613d, [-0.81 + i * 0.18, 0.12 + j * 0.18, 1.5], [H, PI / 4, 0], [0.085, 3.0, 0.085]); b(M.solid, 1.9, 0.12, 0.3, C.dark, 0, -0.04, 0.2); b(M.solid, 1.9, 0.12, 0.3, C.dark, 0, -0.04, 2.8); }, 0, t.y + 0.75, -3.2, 0);
    return root;
  });

  K.define('tos1', { name: 'TOS-1A thermobaric launcher', real: 'TOS-1A Solntsepyok on T-72 chassis', cat: 'land', role: 'heavy thermobaric rocket launcher', side: 'ru', len: 9.5, anim: A.erect('erect', 16, 0.45) }, (K, o) => {
    const L = K.lists(), col = X.ru, h = tracked(L, { len: 6.9, wid: 3.46, n: 6, r: 0.38, h: 0.6, glacis: 1.6, rear: 0.3, skirt: 0.36, tw: 0.6, col });
    b(L.solid, 2.4, 0.4, 2.2, col, 0, h.top + 0.2, 1.6); cs(L.solid, 1.1, 0.4, C.dark, 0, h.top, -0.6, 10); mark(L, 1.0, h.top + 0.45, 2.0, 0.6, 0.6);
    const root = K.group(L, o.team, 'tos1');
    moving(root, o.team, 'erect', (M) => {
      add(M.solid, P.profile([[0, 0], [4.6, 0], [4.6, 1.5], [0, 1.8]], 2.6), col);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) b(M.solid, 0.3, 0.3, 0.05, C.dark, -1.0 + i * 0.4, 0.25 + j * 0.36, 4.62);
      b(M.solid, 2.8, 0.2, 0.3, C.dark, 0, 0.9, 2.4);
    }, 0, h.top + 0.4, -2.7);
    return root;
  });

  K.define('pantsir', { name: 'Pantsir air defence', real: 'Pantsir-S1 (96K6) on KAMAZ-6560', cat: 'land', role: 'gun-missile air defence', side: 'ru', len: 9.6, anim: A.all(A.slew('turret', 0.7, 0.28), A.spinIn('turret', 'radar', 2.0)) }, (K, o) => {
    const L = K.lists(), col = X.ru; const t = truck(L, { len: 9.6, wid: 2.55, axles: [3.6, 2.1, -1.5, -3.0], r: 0.6, col, cab: 'flat', cabLen: 2.3, cabH: 2.0, lo: true });
    bs(L.solid, 2.5, 1.1, 6.6, col, 0, t.y, -1.4); mark(L, 0, t.cabTop + 0.04, 3.5, 0.8, 0.8);
    const root = K.group(L, o.team, 'pantsir');
    const tu = moving(root, o.team, 'turret', (M) => {
      cs(M.solid, 1.0, 0.4, C.dark, 0, 0, 0, 10); bs(M.solid, 1.8, 1.6, 2.4, col, 0, 0.4, 0);
      cy(M.solid, 0.62, 0.12, 0x8f8f7e, 0, 1.2, 1.22, H, 0, 0, 12);
      [1, -1].forEach((s) => { tubePack(M.solid, 2, 3, 0.15, 3.2, 0x6e7a52, C.dark, 0.03, 0.9, -1.4, 6); M.solid.splice(M.solid.length - 12, 12).forEach((p) => { p.g.translate(s * 1.3, 0, 0); M.solid.push(p); }); cz(M.metal, 0.05, 2.6, C.dark, s * 1.15, 2.0, 1.0, 6); cz(M.metal, 0.05, 2.6, C.dark, s * 1.32, 2.0, 1.0, 6); b(M.solid, 0.45, 0.35, 0.8, col, s * 1.22, 2.0, -0.4); });
    }, 0, t.y + 1.1, -2.6);
    moving(tu, o.team, 'radar', (M) => { b(M.solid, 2.2, 1.0, 0.2, 0x8f8f7e, 0, 0, 0, -0.25); b(M.solid, 0.3, 0.5, 0.3, col, 0, -0.5, -0.1); }, 0, 2.65, -0.7);
    return root;
  });

  K.define('m777', { name: 'M777 howitzer', real: 'M777A2 155 mm towed howitzer', cat: 'land', role: 'towed artillery', side: 'us', len: 9.5, anim: A.nod('gun', 0.12, 0.4) }, (K, o) => {
    const L = K.lists(), col = X.us;
    b(L.solid, 1.2, 0.5, 2.4, col, 0, 0.55, 0); b(L.solid, 1.8, 0.35, 1.0, col, 0, 0.35, 1.0);
    [[1, 1], [-1, 1]].forEach((p) => { beam(L.solid, p[0] * 0.5, 0.45, 1.2, p[0] * 1.7, 0.15, 3.0, 0.25, col); b(L.solid, 0.6, 0.4, 0.15, C.dark, p[0] * 1.75, 0.2, 3.1); });
    [[1, -1], [-1, -1]].forEach((p) => { beam(L.solid, p[0] * 0.45, 0.45, -1.0, p[0] * 1.9, 0.15, -4.2, 0.25, col); b(L.solid, 0.7, 0.5, 0.15, C.dark, p[0] * 1.95, 0.22, -4.3); });
    [1, -1].forEach((s) => wheel(L.solid, s * 1.05, -0.3, 0.45, 0.3, 8));
    const root = K.group(L, o.team, 'm777');
    const g = moving(root, o.team, 'gun', (M) => { b(M.solid, 0.7, 0.5, 2.4, col, 0, 0, 0.3); cz(M.solid, 0.1, 5.4, col, 0, 0.15, 3.4, 8); b(M.solid, 0.35, 0.3, 0.5, C.dark, 0, 0.15, 6.2); [1, -1].forEach((s) => cz(M.metal, 0.07, 2.2, C.steel, s * 0.22, -0.05, 1.4, 6)); }, 0, 1.1, 0.2);
    g.rotation.x = -0.5;
    return root;
  });
  K.types.m777.anim = (o, dt, t) => { const g = kid(o, 'gun'); if (g) g.rotation.x = -0.5 - 0.15 * Math.sin(t * 0.4); };

  // S-400: three 5P85TE2 launchers on semitrailers, the 92N6 engagement radar, the 91N6 search radar turning
  K.define('s400', { name: 'S-400 battery', real: 'S-400 Triumf: 5P85TE2 launchers, 92N6E and 91N6E radars', cat: 'land', role: 'long-range air defence', side: 'ru', len: 100, anim: A.spin('radar', 0.5) }, (K, o) => {
    const L = K.lists(), col = X.ru; bs(L.solid, 56, 0.2, 58, X.sandG, 0, 0, 8);
    [[-17, 10, 0.45], [0, 14, 0], [17, 10, -0.45]].forEach((p) => {
      const V = K.lists(); truck(V, { len: 7, wid: 2.75, axles: [2.3, 0.6, -1.0], r: 0.68, col, cab: 'flat', cabLen: 2.5, cabH: 2.0, lo: true });
      const y = trailerParts(V, 11, 2.8, col, -7.5, 0.6, [-10.5, -12.0], true); bs(V.solid, 2.6, 0.8, 4.5, col, 0, y, -4.6);
      const M = []; tubePack(M, 2, 2, 0.5, 7.4, 0xb4b29a, 0x8b8977, 0.08, -1.05, 0.1, 6); b(M, 2.4, 0.3, 0.5, C.dark, 0, 0, 0.3); b(M, 2.4, 0.3, 0.5, C.dark, 0, 0, 6.8);
      const mtx = new T.Matrix4().makeRotationX(-H).setPosition(0, y + 1.5, -12.6); M.forEach((q) => { q.g.applyMatrix4(mtx); V.solid.push(q); });
      place(L, V, p[0], 0, p[1], p[2] + PI, 1);
    });
    const R = K.lists(); const t = truck(R, { len: 12, wid: 3, axles: [4, 2.2, -2.4, -4.2], r: 0.7, col, cab: 'flat', cabLen: 2.4, lo: true }); bs(R.solid, 3, 1.2, 8.5, col, 0, t.y, -1.7);
    panel(R.solid, 5.8, 4.6, 0.6, 0x8f8f7e, col, 0, t.y + 1.2, -1.0, 0.5); place(L, R, -12, 0, -10, 0.2, 1);
    const B = K.lists(); const y2 = trailerParts(B, 10, 2.8, col, 0, 0.6, [-3.5, -4.8], true); bs(B.solid, 2.6, 2.2, 5, col, 0, y2, 1); ct(B.metal, 0.6, 0.9, 7, C.steel, 0, y2, -2.5, 8); place(L, B, 12, 0, -11, -0.2, 1);
    flag(L, 22, -2, 8, 1.2);
    const root = K.group(L, o.team, 's400');
    moving(root, o.team, 'radar', (M) => { panel(M.solid, 8.6, 3.6, 0.5, 0x8f8f7e, col, 0, -1.6, 0, 0.3); panel(M.solid, 8.6, 3.6, 0.5, 0x8f8f7e, col, 0, -1.6, -1.4, -0.3); }, 12 - Math.sin(-0.2) * 2.5, y2 + 7.6, -11 - Math.cos(-0.2) * 2.5);
    return root;
  });

  // Iskander's 9M723 profile (radius, z), 7.3 m
  const ISK = [[0, 0], [0.46, 0], [0.46, 4.9], [0.42, 5.6], [0.3, 6.5], [0.1, 7.15], [0, 7.3]];
  K.define('iskander_tel', { name: 'Iskander missile launcher', real: '9P78-1 Iskander-M TEL on MZKT-7930', cat: 'land', role: 'short-range ballistic missile launcher', side: 'ru', len: 13.1, anim: A.erect('erect', 16, H - 0.03) }, (K, o) => {
    const L = K.lists(), col = X.ru; const t = truck(L, { len: 13.1, wid: 3.07, axles: [4.6, 2.9, -1.9, -3.7], r: 0.72, col, cab: 'flat', cabLen: 3.0, cabH: 2.1 });
    bs(L.solid, 3.0, 0.5, 9.6, col, 0, t.y, -1.6); [1, -1].forEach((s) => bs(L.solid, 0.35, t.y + 0.2, 0.35, C.dark, s * 1.35, 0, -6.0));
    mark(L, 0, t.cabTop + 0.04, 5.0, 0.9, 0.9);
    const root = K.group(L, o.team, 'iskander_tel');
    moving(root, o.team, 'erect', (M) => { b(M.solid, 2.7, 0.35, 8.8, col, 0, 0.18, 4.4); [0.62, -0.62].forEach((x) => { lathe(M.solid, ISK, 0x4f5a3a, x, 0.85, 0.4, 1, 10); b(M.solid, 0.06, 1.3, 0.8, C.dark, x, 0.85, 0.8); b(M.solid, 1.3, 0.06, 0.8, C.dark, x, 0.85, 0.8); }); b(M.solid, 2.8, 0.25, 0.4, C.dark, 0, 1.4, 6.0); }, 0, t.y + 0.55, -6.3);
    return root;
  });

  K.define('iris_t_sys', { name: 'IRIS-T SLM air defence', real: 'IRIS-T SLM: launcher (8 canisters) and TRML-4D radar', cat: 'land', role: 'medium-range air defence', side: 'ua', len: 45, anim: A.all(A.spin('radar', 1.2), A.erect('erect', 18, H - 0.05)) }, (K, o) => {
    const L = K.lists(), col = 0x5b6346; bs(L.solid, 32, 0.2, 28, X.sandG, 0, 0, 0);
    const V = K.lists(); const t = truck(V, { len: 10.2, wid: 2.55, axles: [3.8, 2.3, -2.2, -3.6], r: 0.6, col, cab: 'flat', cabLen: 2.4, cabH: 2.0, lo: true }); bs(V.solid, 2.5, 0.5, 6.8, col, 0, t.y, -1.4); mark(V, 0, t.cabTop + 0.04, 3.9, 0.8, 0.8);
    place(L, V, -7, 0, 4, 0.3, 1);
    const R = K.lists(); const t2 = truck(R, { len: 9, wid: 2.55, axles: [3.2, -1.6, -3.0], r: 0.6, col, cab: 'flat', cabLen: 2.3, lo: true }); bs(R.solid, 2.5, 1.8, 5.4, col, 0, t2.y, -1.6); place(L, R, 9, 0, -6, -0.4, 1);
    const root = K.group(L, o.team, 'iris_t_sys');
    // the launcher's 8 canisters (2 x 4) raised vertical at the rear of the truck
    const ex = -7 + Math.sin(0.3) * -4.8, ez = 4 + Math.cos(0.3) * -4.8;
    moving(root, o.team, 'erect', (M) => { boxPack(M.solid, 4, 2, 0.5, 0.5, 4.6, 0xc9c6b4, 0x8b8a7e, 0.05, -0.55, 0.2); b(M.solid, 2.4, 0.25, 0.4, C.dark, 0, -0.6, 0.4); }, ex, t.y + 1.3, ez, 0.3);
    moving(root, o.team, 'radar', (M) => { panel(M.solid, 3.4, 2.0, 0.35, 0x8f8f86, col, 0, -1.0, 0, 0.35); }, 9 - Math.sin(-0.4) * 1.6, t2.y + 3.4, -6 - Math.cos(-0.4) * 1.6);
    return root;
  });

  K.define('nasams', { name: 'NASAMS air defence', real: 'NASAMS: launcher (6 AMRAAM canisters) and AN/MPQ-64 Sentinel radar', cat: 'land', role: 'medium-range air defence', side: 'ua', len: 45, anim: A.all(A.spin('radar', 1.2), A.erect('erect', 18, H - 0.05)) }, (K, o) => {
    const L = K.lists(), col = 0x5b6346; bs(L.solid, 32, 0.2, 28, X.sandG, 0, 0, 0);
    const V = K.lists(); const t = truck(V, { len: 10.2, wid: 2.55, axles: [3.8, 2.3, -2.2, -3.6], r: 0.6, col, cab: 'flat', cabLen: 2.4, cabH: 2.0, lo: true }); bs(V.solid, 2.5, 0.5, 6.8, col, 0, t.y, -1.4); mark(V, 0, t.cabTop + 0.04, 3.9, 0.8, 0.8);
    place(L, V, -7, 0, 4, 0.3, 1);
    const R = K.lists(); const t2 = truck(R, { len: 9, wid: 2.55, axles: [3.2, -1.6, -3.0], r: 0.6, col, cab: 'flat', cabLen: 2.3, lo: true }); bs(R.solid, 2.5, 1.8, 5.4, col, 0, t2.y, -1.6); place(L, R, 9, 0, -6, -0.4, 1);
    const root = K.group(L, o.team, 'nasams');
    // the launcher's 6 canisters (2 x 3) raised vertical at the rear of the truck
    const ex = -7 + Math.sin(0.3) * -4.8, ez = 4 + Math.cos(0.3) * -4.8;
    moving(root, o.team, 'erect', (M) => { boxPack(M.solid, 3, 2, 0.55, 0.55, 3.9, 0xc9c6b4, 0x8b8a7e, 0.05, -0.55, 0.2); b(M.solid, 2.4, 0.25, 0.4, C.dark, 0, -0.6, 0.4); }, ex, t.y + 1.3, ez, 0.3);
    moving(root, o.team, 'radar', (M) => { panel(M.solid, 2.2, 1.6, 0.3, 0x8f8f86, col, 0, -1.0, 0, 0.35); }, 9 - Math.sin(-0.4) * 1.6, t2.y + 3.4, -6 - Math.cos(-0.4) * 1.6);
    return root;
  });

  // ---------------------------------------------------------------- small units: troops, a convoy, a hardened shelter
  function soldier(l, x, z, ry, kneel, c) {
    local(l, x, 0, z, ry, 1, (M) => {
      const k = kneel ? 0.45 : 0;
      b(M, 0.16, 0.85 - k, 0.18, c, 0.12, (0.85 - k) / 2, kneel ? 0.2 : 0); b(M, 0.16, 0.85 - k * 0.2, 0.18, c, -0.12, (0.85 - k * 0.2) / 2, kneel ? -0.25 : 0);
      b(M, 0.44, 0.6, 0.26, c, 0, 1.15 - k, 0); b(M, 0.34, 0.42, 0.18, 0x4a4e36, 0, 1.18 - k, -0.2);
      b(M, 0.13, 0.5, 0.13, c, 0.28, 1.12 - k, 0.12, -0.9); b(M, 0.13, 0.5, 0.13, c, -0.28, 1.12 - k, 0.18, -1.1);
      b(M, 0.2, 0.22, 0.2, C.skin, 0, 1.56 - k, 0); dome(M, 0.17, 0x4a4e36, 0, 1.6 - k, 0, 6);
      b(M, 0.06, 0.08, 0.9, C.black, 0.05, 1.22 - k, 0.45);
    });
  }
  K.define('troops', { name: 'Infantry squad', real: 'An eight-soldier rifle squad', cat: 'land', role: 'infantry', side: 'any', len: 14 }, (K, o) => {
    const L = K.lists(), c = o.variant === 'tan' ? 0x8f7f5f : 0x5d6247;
    [[0, 4, 0, 0], [-2.2, 2.2, 0, 0], [2.2, 2.2, 0, 1], [-4.4, 0.2, 0, 0], [4.4, 0.4, 0, 0], [-1.2, -1.4, 0, 1], [1.6, -1.6, 0, 0], [0, -4, 0, 0]].forEach((p, i) => { soldier(L.solid, p[0], p[1], (i % 3 - 1) * 0.2, p[3], c); b(L.team, 0.46, 0.08, 0.28, null, p[0], 1.3 - (p[3] ? 0.45 : 0), p[1]); });
    return K.group(L, o.team, 'troops');
  });

  function cargoTruck(L, col, canvas, lo) { const t = truck(L, { len: 8, wid: 2.5, axles: [2.6, -1.6, -2.9], r: 0.58, col, cab: 'bonnet', cabLen: 1.9, bonnet: 1.5, cabH: 1.8, lo }); bs(L.solid, 2.5, 0.4, 4.6, col, 0, t.y, -1.6); add(L.solid, P.profile([[-2.3, 0], [2.3, 0], [2.3, 1.4], [2.0, 1.75], [-2.3, 1.75]], 2.5), canvas || 0x5d6345, [0, t.y + 0.4, -1.6]); return t; }
  K.define('convoy', { name: 'Supply convoy', real: 'Three military cargo trucks on the move', cat: 'land', role: 'logistics convoy', side: 'any', len: 40 }, (K, o) => {
    const L = K.lists(), col = o.variant === 'tan' ? X.us : X.ru;
    [14, 0, -14].forEach((z, i) => { const V = K.lists(); cargoTruck(V, col, i === 1 ? 0x6b6a52 : 0x5d6345, true); mark(V, 0, 2.6, 2.6, 0.8, 0.8); place(L, V, (i - 1) * 0.6, 0, z, 0, 1); });
    return K.group(L, o.team, 'convoy');
  });

  K.define('has', { name: 'Hardened aircraft shelter', real: 'Hardened aircraft shelter (third-generation type)', cat: 'land', role: 'aircraft shelter', side: 'any', len: 38 }, (K, o) => {
    const L = K.lists(); bs(L.solid, 44, 0.3, 70, X.padDark, 0, 0, 14);
    const arch = []; for (let k = 0; k <= 10; k++) { const a = (k / 10) * PI; arch.push([Math.cos(a) * 13.5, Math.sin(a) * 10.5]); }
    add(L.solid, shapeXY(arch, 36), 0x8e8a7d, [0, 0.3, -2]); bs(L.solid, 30, 12.5, 2.5, C.concrete, 0, 0.3, 16.5); b(L.solid, 22, 9, 0.3, 0x2a2c2e, 0, 4.8, 17.8);
    bs(L.solid, 12, 9.5, 1.4, 0x6d706f, -16, 0.3, 18.6); bs(L.solid, 12, 9.5, 1.4, 0x6d706f, 16, 0.3, 18.6); bs(L.solid, 6, 4, 4, C.concrete, 0, 9, -20);
    jet(L.solid, 0, 30, 0, 16, C.usaf, 0.6); b(L.solid, 0.8, 0.05, 30, 0xd8c86a, 0, 0.32, 34);
    flag(L, 17, 26, 8, 0.8);
    return K.group(L, o.team, 'has');
  });

  // ================================================================== B) SITES: Ukraine / Russia theatre, generic military places
  // a deck or slab running between two points in x-y (bridges, ramps): w wide (z), h thick
  function deck(l, ax, ay, bx, by, w, h, c, z) { const dx = bx - ax, dy = by - ay; return b(l, Math.hypot(dx, dy), h, w, c, (ax + bx) / 2, (ay + by) / 2, z || 0, 0, 0, Math.atan2(dy, dx)); }
  // an onion dome on a drum (churches)
  function onion(l, r, x, y0, z, c, drumC) { cs(l, r * 0.62, r * 1.1, drumC || C.white, x, y0, z, 6); add(l, sphu(6), c || C.gold, [x, y0 + r * 1.1 + r * 0.95, z], null, [r, r * 1.15, r]); ct(l, 0, r * 0.35, r * 1.3, c || C.gold, x, y0 + r * 1.1 + r * 1.9, z, 5); }
  // a sawtooth-roofed factory hall: w along x, d along z, teeth facing +z with glazing
  function sawHall(l, gl, w, h, d, x, z, c) {
    bs(l, w, h, d, c || 0xb7afa2, x, 0.4, z); const n = Math.max(3, Math.round(d / 14)), tz = d / n, pts = [[-d / 2, 0]];
    for (let i = 0; i < n; i++) { pts.push([-d / 2 + i * tz + tz * 0.75, 9]); pts.push([-d / 2 + (i + 1) * tz, 9]); pts.push([-d / 2 + (i + 1) * tz, i === n - 1 ? 0 : 1.5]); }
    add(l, P.profile(pts, w), 0x7d7f80, [x, h + 0.4, z]);
    for (let i = 0; i < n; i++) b(gl, w * 0.96, 7.4, 0.3, 0x7fa3bb, x, h + 0.4 + 4.6, z - d / 2 + (i + 1) * tz - 0.25);
  }

  K.define('site_npp6', { name: 'Nuclear power plant (six reactors)', real: 'Zaporizhzhia-type plant: six VVER-1000 units, turbine hall, cooling pond', cat: 'site', role: 'nuclear power', side: 'ua', len: 900 }, (K, o) => {
    const L = K.lists(); bs(L.solid, 900, 0.45, 400, 0xa9a184, 0, 0, -60); water(L.solid, 900, 120, 0, 200); bs(L.solid, 900, 0.5, 14, C.concrete, 0, 0, 137);
    for (let i = 0; i < 6; i++) { const x = -325 + i * 130; bs(L.solid, 66, 26, 66, 0xd9d5cb, x, 0.4, -10); reactor(L.solid, 26, 64, x, -10, 0xedeae2); bs(L.solid, 40, 30, 26, 0xcfcac0, x + 40, 0.4, -60); }
    bs(L.solid, 840, 46, 50, 0xc8c3b8, 0, 0.4, -105); bs(L.solid, 844, 1.6, 54, 0x6f8fa3, 0, 46.4, -105);
    [-260, 0, 260].forEach((x) => stack(L.solid, 4.6, 150, x, 50, 5));
    cooling(L.solid, 44, 140, 360, -205); cooling(L.solid, 44, 140, 250, -215);
    for (let i = 0; i < 8; i++) b(L.solid, 30, 0.1, 30, 0x3a6d82, -360 + i * 40, 0.7, 90);
    bs(L.solid, 220, 0.42, 70, 0x8f8b84, -260, 0.4, -200); for (let i = 0; i < 6; i++) { b(L.metal, 1.4, 24, 1.4, C.steel, -350 + i * 36, 12.4, -215); b(L.metal, 1.4, 24, 1.4, C.steel, -350 + i * 36, 12.4, -185); b(L.metal, 1.4, 1.4, 32, C.steel, -350 + i * 36, 24.4, -200); }
    pylon(L.solid, -420, -240, 50, 0); pylon(L.solid, -100, -240, 50, 0); wires(L.solid, -420, -240, -100, -240, 50);
    for (let i = 0; i < 12; i++) b(L.glow, 10, 2, 0.3, X.win, -400 + i * 70, 18, -79.7);
    flag(L, 410, 40, 30, 4);
    return K.group(L, o.team, 'site_npp6');
  });

  K.define('site_hydro', { name: 'Hydroelectric dam', real: 'Dnipro-type hydro dam: spillway bays, powerhouse, reservoir', cat: 'site', role: 'hydro power', side: 'ua', len: 680 }, (K, o) => {
    const L = K.lists();
    // the banks: high ground both sides; reservoir up, river down
    [-1, 1].forEach((s) => { berm(L.solid, 140, 46, 560, 0x8c8064, s * 290, 0, 0, 0, 0.8); bs(L.solid, 120, 0.4, 560, 0x7e8a5a, s * 300, 46, 0); });
    water(L.solid, 470, 250, 0, -150); bs(L.solid, 470, 0.5, 250, X.water, 0, 38, -150); water(L.solid, 470, 250, 0, 150);
    // the dam: a gravity wall with spillway piers and gates, the road on top, the powerhouse below
    bs(L.solid, 480, 44, 26, 0xc2bdb1, 0, 0, 0); bs(L.solid, 480, 1.4, 30, C.asphalt, 0, 44, 0);
    for (let i = 0; i < 17; i++) { const x = -200 + i * 22; bs(L.solid, 6, 46, 40, 0xb3ada0, x, 0, 12); if (i < 16) { b(L.solid, 15, 10, 1.2, 0x5f6466, x + 11, 34, 6); if (i % 4 === 1) b(L.glass, 14, 38, 1, 0xeef3f4, x + 11, 18, 22, -0.25); } }
    bs(L.solid, 90, 34, 44, 0xb9b4a8, 180, 0, 36); bs(L.solid, 92, 1.6, 46, 0x6f8fa3, 180, 34, 36); for (let i = 0; i < 4; i++) transformer(L.solid, 150 + i * 20, 70, 1.4);
    pylon(L.solid, 230, 90, 46, 0); pylon(L.solid, 300, 160, 46, 0.6); wires(L.solid, 230, 90, 300, 160, 46);
    for (let i = 0; i < 8; i++) b(L.glow, 6, 1.6, 0.3, X.win, 145 + i * 10, 20, 58.3);
    flag(L, -250, 20, 24, 3.4);
    return K.group(L, o.team, 'site_hydro');
  });

  K.define('site_bridge', { name: 'Crimean (Kerch) bridge', real: 'Kerch Strait bridge: road and rail spans on piers, the twin arches over the channel', cat: 'site', role: 'strategic bridge', side: 'ru', len: 1300 }, (K, o) => {
    const L = K.lists(); water(L.solid, 1300, 420, 0, 0); bs(L.solid, 120, 0.6, 420, 0xb9ab88, -620, 0, 0); bs(L.solid, 120, 0.6, 420, 0xb9ab88, 620, 0, 0);
    const zr = -24, zt = 26, A = 113, low = 22, hi = 38;
    // the road bridge (two carriageways) and the rail bridge beside it: approach spans, ramps, the channel span
    [[zr, 26, 0xc9c5bb], [zt, 14, 0xb9b5ab]].forEach((p, k) => {
      deck(L.solid, -640, low, -300, low, p[1], 3, p[2], p[0]); deck(L.solid, 300, low, 640, low, p[1], 3, p[2], p[0]);
      deck(L.solid, -300, low, -A, hi, p[1], 3, p[2], p[0]); deck(L.solid, A, hi, 300, low, p[1], 3, p[2], p[0]); deck(L.solid, -A, hi, A, hi, p[1], 3, p[2], p[0]);
      for (let x = -600; x <= 600; x += 60) { if (Math.abs(x) < A - 5) continue; const y = Math.abs(x) > 300 ? low : low + ((300 - Math.abs(x)) / (300 - A)) * (hi - low); b(L.solid, 5, y, 5, C.concrete, x, y / 2, p[0] - p[1] * 0.3); b(L.solid, 5, y, 5, C.concrete, x, y / 2, p[0] + p[1] * 0.3); }
      // the arch: two steel ribs on a parabola, hangers down to the deck
      [-1, 1].forEach((s) => { const zz = p[0] + s * (p[1] / 2 - 1); let px = -A, py = hi; for (let i = 1; i <= 10; i++) { const x = -A + (2 * A * i) / 10, y = hi + 46 * (1 - (x / A) * (x / A)); beam(L.metal, px, py, zz, x, y, zz, 3.4, 0xd9dcde); if (i < 10) beam(L.metal, x, y, zz, x, hi, zz, 0.6, 0xbfc3c6); px = x; py = y; } });
      for (let i = 1; i < 6; i++) { const x = -A + (2 * A * i) / 6; b(L.metal, 2, 2, p[1], 0xd9dcde, x, hi + 46 * (1 - (x / A) * (x / A)), p[0]); }
      [-A, A].forEach((x) => { b(L.solid, 10, hi, 10, C.concrete, x, hi / 2, p[0] - p[1] * 0.3); b(L.solid, 10, hi, 10, C.concrete, x, hi / 2, p[0] + p[1] * 0.3); });
    });
    // a train on the rail bridge, traffic on the road
    for (let i = 0; i < 9; i++) b(L.solid, 22, 4.4, 4, i === 0 ? 0x8a2f2a : 0x5b4a3c, 380 - i * 24, low + 3.7, zt);
    for (let i = 0; i < 6; i++) b(L.solid, 6, 2.2, 3, [0xc23b2e, 0xe7e7e7, 0x2f4f6f][i % 3], -480 + i * 70, low + 2.6, zr + (i % 2 ? 6 : -6));
    for (let i = 0; i < 6; i++) b(L.glow, 1.2, 1.2, 1.2, X.win, -560 + i * 220, low + 6, zr - 13);
    flag(L, -600, 120, 20, 3);
    return K.group(L, o.team, 'site_bridge');
  });

  K.define('site_industry', { name: 'Industrial plant', real: 'Factory complex: sawtooth halls, chimneys, rail siding', cat: 'site', role: 'industry / arms production', side: 'any', len: 520 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 520, 400, 0xa39d8f);
    sawHall(L.solid, L.glass, 170, 16, 120, -110, -60); sawHall(L.solid, L.glass, 130, 14, 100, 90, -70); sawHall(L.solid, L.glass, 120, 12, 70, -130, 90);
    stack(L.solid, 4, 90, 20, -150, 3); ct(L.solid, 3, 4.5, 70, X.brick, 200, 0.4, -150, 8);
    cs(L.solid, 26, 30, 0x8d9296, 120, 0.4, 100, 12); bldg(L.solid, 60, 16, 30, C.offwhite, 160, 40, 0); bldg(L.solid, 50, 12, 24, 0xb9b2a5, 40, 70, 0);
    // rail siding with wagons, a gantry crane over a yard
    b(L.solid, 500, 0.6, 4, 0x5a4e44, 0, 0.7, 175); for (let i = 0; i < 10; i++) b(L.solid, 18, 6, 4, i % 2 ? 0x6d4a3a : 0x55606a, -200 + i * 21, 4, 175);
    [-1, 1].forEach((s) => b(L.metal, 3, 26, 3, 0xd4a72c, 20 + s * 40, 13.4, 140)); b(L.metal, 90, 4, 4, 0xd4a72c, 20, 26, 140);
    bs(L.solid, 90, 0.42, 40, C.asphalt, 190, 0.4, 150); for (let i = 0; i < 4; i++) miniTruck(L.solid, 160 + i * 20, 150, 0, 0x6d6f73, 1.6);
    for (let i = 0; i < 8; i++) b(L.glow, 8, 2, 0.3, X.win, -190 + i * 20, 8, 0.3);
    road(L.solid, -260, 195, 260, 195, 10); flag(L, -230, 160, 24, 3.4);
    return K.group(L, o.team, 'site_industry');
  });

  K.define('site_army', { name: 'Army base', real: 'Garrison: barracks, parade ground, vehicle park with tanks', cat: 'site', role: 'army base', side: 'any', len: 520 }, (K, o) => {
    const L = K.lists(), side = o.variant || 'ru', vc = side === 'us' ? X.us : side === 'cn' ? X.cn : side === 'ir' ? X.irGreen : X.ru;
    tile(L.solid, 520, 420, 0xa9a184);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) bldg(L.solid, 80, 14, 16, 0xd8cfbb, -170 + i * 92, -150 + j * 44, 0, 'pitch', X.roofRed);
    bldg(L.solid, 60, 20, 30, 0xe0d8c6, -170, -40, 0); bldg(L.solid, 50, 12, 26, 0xd8cfbb, -90, -40, 0);
    bs(L.solid, 130, 0.42, 90, 0x8f8a80, 40, 0.4, -40); for (let k = 0; k < 4; k++) b(L.solid, 120, 0.1, 1.6, X.stripeW, 40, 0.9, -70 + k * 20);
    // vehicle park: rows of tanks under open sheds and in the open
    bs(L.solid, 260, 0.42, 130, 0x7f7b72, 80, 0.4, 120);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) miniTank(L.solid, -20 + i * 38, 75 + r * 40, PI, vc, 2.2);
    [75, 115].forEach((z) => { for (let i = 0; i < 4; i++) b(L.metal, 1.2, 12, 1.2, C.steel, -40 + i * 78, 6.4, z - 16); b(L.solid, 240, 1, 24, 0x6f7072, 75, 12.8, z); });
    for (let i = 0; i < 4; i++) miniTruck(L.solid, 190 + (i % 2) * 22, 30 + Math.floor(i / 2) * 26, 0, vc, 2);
    cs(L.solid, 2, 26, C.concrete, 210, 0.4, -150, 6); cs(L.solid, 9, 10, 0xb9b3a6, 210, 26.4, -150, 10);
    fence(L.solid, 250, 200); bs(L.solid, 30, 0.6, 6, C.asphalt, 0, 0.4, 200);
    for (let i = 0; i < 8; i++) b(L.glow, 6, 1.6, 0.3, X.win, -200 + i * 10, 7, -141.7);
    flag(L, 40, -100, 30, 4);
    return K.group(L, o.team, 'site_army');
  });

  K.define('site_radar', { name: 'Radar station', real: 'Air surveillance radar station: radomes and a turning search radar', cat: 'site', role: 'radar station', side: 'any', len: 320, anim: A.spin('radar', 0.8) }, (K, o) => {
    const L = K.lists(); tile(L.solid, 320, 260, 0xa9a184);
    radome(L.solid, -90, -50, 20, 18); radome(L.solid, -20, -80, 15, 26); radome(L.solid, 90, 40, 17, 14);
    bldg(L.solid, 70, 14, 30, C.offwhite, -60, 60, 0); bldg(L.solid, 30, 9, 20, 0xb9b2a5, 20, 80, 0);
    ct(L.metal, 1.4, 4, 50, C.steel, 0, 0.4, 70, 4); cy(L.solid, 5, 0.8, C.white, 0, 46, 75, -0.6, 0, 0, 10);
    // the search radar's tower; the antenna turns
    bs(L.solid, 16, 26, 16, C.concrete, 60, 0.4, -50);
    fence(L.solid, 150, 120); road(L.solid, 0, 120, 0, 160, 8); flag(L, 120, 100, 20, 3);
    for (let i = 0; i < 5; i++) b(L.glow, 8, 2, 0.3, X.win, -90 + i * 14, 8, 75.3);
    const root = K.group(L, o.team, 'site_radar');
    moving(root, o.team, 'radar', (M) => { b(M.metal, 2, 6, 2, C.steel, 0, 3, 0); local(M.metal, 0, 8, 0, 0, 1, (Q) => { b(Q, 34, 1, 1, 0xc8ccd0, 0, 6, 0); b(Q, 34, 1, 1, 0xc8ccd0, 0, -6, 0); for (let i = 0; i < 9; i++) b(Q, 0.8, 12, 0.8, 0xc8ccd0, -16 + i * 4, 0, 0); b(Q, 34, 13, 0.4, 0x7d8489, 0, 0, -1.4, -0.2); }); }, 60, 26.4, -50);
    return root;
  });

  K.define('site_airdef', { name: 'Air defence site', real: 'SAM site: launchers in revetments around the engagement radar', cat: 'site', role: 'air defence site', side: 'any', len: 340, anim: A.spin('radar', 0.7) }, (K, o) => {
    const L = K.lists(), side = o.variant || 'ir', vc = side === 'ru' ? X.ru : side === 'cn' ? X.cn : side === 'us' ? X.us : X.ir;
    tile(L.solid, 260, 260, 0xab9f80);
    samSite(L.solid, 0, 0, vc, 6, 72, 3.2, side === 'ru' || side === 'cn');
    bs(L.solid, 16, 5, 12, vc, -34, 0.4, -30); bs(L.solid, 16, 5, 12, vc, 34, 0.4, -34); bs(L.solid, 30, 10, 18, 0xbdb5a3, -90, 0.4, 100);
    [[0, 125], [125, 0], [-125, 0], [0, -125]].forEach((p) => road(L.solid, 0, 0, p[0], p[1], 6, X.padDark)); fence(L.solid, 126, 126);
    flag(L, 100, 100, 24, 3.4);
    const root = K.group(L, o.team, 'site_airdef');
    moving(root, o.team, 'radar', (M) => { ct(M.metal, 0.8, 1.8, 18, C.steel, 0, -18, 0, 6); panel(M.solid, 20, 9, 1.2, 0x8f8f7e, vc, 0, 0, 0, 0.3); }, 36, 18.4, 30);
    return root;
  });

  K.define('site_city_eu', { name: 'City (Europe)', real: 'European city: mid-rise blocks, pitched roofs, a cathedral, a river', cat: 'site', role: 'city', side: 'any', len: 900 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 920, 760, 0x8f9070);
    b(L.solid, 960, 0.5, 70, X.water, 0, 0.5, 120, 0, 0.12, 0); [-200, 160].forEach((x) => b(L.solid, 16, 3, 110, C.concrete, x, 6, 120 - x * 0.12, 0, 0.12, 0));
    city(L, { w: 880, d: 720, n: 220, cols: [0xe3dccb, 0xd8cdb4, 0xcbb994, 0xd9c2b0, 0xc7c9c4, 0xe9e3d3], hMin: 12, hMax: 30, pitch: 0.75, roofCols: [X.roofRed, 0x8a4a3a, X.roofGrey, 0x6b6e70], tower: [5, 70, 120], towerCols: [0x86a2b6, 0x9fb2bf], skip: [[0, 120, 50], [-200, 140, 18], [160, 100, 18], [-60, -60, 40]], seed: 41, glow: 0.12, round: true });
    // the cathedral: nave, transept, a tower and spire
    local(L.solid, -60, 0.4, -60, 0.2, 1.6, (M) => { bs(M, 22, 22, 60, 0xd6cdb8, 0, 0, 0); add(M, shapeXY([[-12, 0], [12, 0], [0, 11]], 62), 0x5f6a6a, [0, 22, 0]); bs(M, 46, 18, 14, 0xd6cdb8, 0, 0, 6); bs(M, 12, 44, 12, 0xd6cdb8, 0, 0, 34); ct(M, 0, 8, 30, 0x5f8a7a, 0, 44, 34, 4, PI / 4); });
    return K.group(L, o.team, 'site_city_eu');
  });

  K.define('cap_kyiv', { name: 'Kyiv', real: 'Kyiv: golden domes, the Motherland Monument over the Dnipro', cat: 'site', role: 'capital', side: 'ua', len: 1100 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 1100, 900, 0x8c9070);
    water(L.solid, 230, 900, 330, 0); bs(L.solid, 90, 0.6, 300, 0x7c8a5a, 330, 0, -150); [-120, 220].forEach((z) => b(L.solid, 300, 3, 22, C.concrete, 330, 14, z));
    city(L, { x: -170, w: 720, d: 840, n: 140, cols: [0xe6dcc6, 0xd9c9a6, 0xe5d1b8, 0xcfd2cc, 0xd9cfa8, 0xeae4d6], hMin: 14, hMax: 36, pitch: 0.3, roofCols: [0x5f8a6a, X.roofGrey, 0x8a4a3a], tower: [5, 60, 110], towerCols: [0x9fb2bf, 0xd8d8d0], skip: [[-180, -120, 100], [190, 260, 90], [120, -200, 60]], seed: 51, glow: 0.1 });
    city(L, { x: 500, w: 160, d: 840, n: 24, cols: [0xd8d8d0, 0xcfd2cc, 0xe0dccf], hMin: 20, hMax: 60, seed: 57 });
    // St Sophia: a white cathedral crowned by golden domes
    local(L.solid, -180, 0.4, -120, 0.3, 2.8, (M) => { bs(M, 50, 18, 40, 0xf2efe6, 0, 0, 0); onion(M, 7, 0, 18, 0, C.gold); [[-14, -10], [14, -10], [-14, 10], [14, 10]].forEach((p) => onion(M, 4.5, p[0], 18, p[1], C.gold)); bs(M, 12, 46, 12, 0xf2efe6, 0, 0, 34); onion(M, 4.6, 0, 46, 34, C.gold); });
    // the Lavra bell tower above the river
    local(L.solid, 120, 0.4, -200, 0, 2.4, (M) => { for (let k = 0; k < 4; k++) bs(M, 22 - k * 4, 18, 22 - k * 4, 0xf2efe6, 0, k * 18, 0); onion(M, 5, 0, 72, 0, C.gold, 0xf2efe6); bs(M, 40, 12, 26, 0xf2efe6, 30, 0, 20); onion(M, 5, 30, 12, 20, C.gold); });
    // the Motherland Monument on its hill: pedestal, the figure, sword raised, shield
    hill(L.solid, 80, 26, 80, 0x6f7f52, 190, 260, 0, 9);
    local(L.solid, 190, 26.4, 260, 0, 1.5, (M) => { cs(M, 15, 26, 0xbfc2c2, 0, -3, 0, 10); ct(M, 4, 7.5, 34, 0xb8bec2, 0, 23, 0, 8); ball(M, 2.8, 0xb8bec2, 0, 59, 0, 6); beam(M, 3, 52, 0, 11, 68, 2, 1.8, 0xb8bec2); beam(M, 11, 68, 2, 18, 82, 3, 1.0, 0xd9dde0); cy(M, 5.5, 1, 0xb8bec2, -7, 48, 2, H, 0, 0.3, 10); });
    flag(L, -40, 300, 30, 4);
    return K.group(L, o.team, 'cap_kyiv');
  });

  K.define('cap_moscow', { name: 'Moscow', real: 'Moscow: the Kremlin walls and towers, St Basil\'s, the Moskva', cat: 'site', role: 'capital', side: 'ru', len: 1100 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 1100, 900, 0x8e8e78);
    b(L.solid, 1150, 0.5, 80, X.water, 0, 0.5, 300, 0, -0.08, 0);
    city(L, { w: 1040, d: 840, n: 130, cols: [0xe1d6bd, 0xd8c39e, 0xcfc9bf, 0xe3c9a8, 0xd2d3cf, 0xbfa58a], hMin: 16, hMax: 40, pitch: 0.2, roofCols: [0x5f6a6a, 0x6b4a3a], tower: [3, 80, 130], towerCols: [0x9fb2bf], skip: [[-40, -20, 230], [0, 300, 60], [-300, 300, 60], [300, 300, 60]], seed: 61, glow: 0.1 });
    // the Kremlin: red brick walls on a triangle, towers with green tents and red stars
    const KP = [[-220, 150], [200, 170], [130, -160], [-110, -210]];
    for (let i = 0; i < KP.length; i++) { const a = KP[i], c = KP[(i + 1) % KP.length]; const dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz); b(L.solid, 6, 22, len, 0xa3402f, (a[0] + c[0]) / 2, 11.4, (a[1] + c[1]) / 2, 0, Math.atan2(dx, dz), 0); for (let k = 0; k < 3; k++) { const f = (k + 0.5) / 3, x = a[0] + dx * f, z = a[1] + dz * f; bs(L.solid, 14, 34, 14, 0xa3402f, x, 0.4, z); ct(L.solid, 0, 11, 22, 0x3f6b52, x, 34.4, z, 4, PI / 4); } bs(L.solid, 18, 40, 18, 0xa3402f, a[0], 0.4, a[1]); ct(L.solid, 0, 13, 30, 0x3f6b52, a[0], 40.4, a[1], 4, PI / 4); }
    // Spasskaya tower on the Red Square side
    const sx = 172, sz = 10; bs(L.solid, 22, 50, 22, 0xa3402f, sx, 0.4, sz); bs(L.solid, 16, 22, 16, 0xa3402f, sx, 50.4, sz); ct(L.solid, 0, 11, 34, 0x3f6b52, sx, 72.4, sz, 8); add(L.glow, P.cyl(0, 4, 5, 5), 0xff2a1a, [sx, 109, sz]);
    // inside: the palace, the cathedrals with gold domes, Ivan the Great bell tower
    bs(L.solid, 120, 26, 40, 0xe6dcb0, -60, 0.4, 100); bs(L.solid, 122, 3, 42, 0x4f7a5f, -60, 26.4, 100); bs(L.solid, 90, 22, 50, 0xe6dcb0, 30, 0.4, -100);
    [[-60, 20], [-10, 30], [-40, -40]].forEach((p) => { bs(L.solid, 26, 20, 26, 0xf2efe6, p[0], 0.4, p[1]); onion(L.solid, 6, p[0], 20.4, p[1], C.gold); [[-8, -8], [8, 8]].forEach((q) => onion(L.solid, 3.4, p[0] + q[0], 20.4, p[1] + q[1], C.gold)); });
    for (let k = 0; k < 4; k++) cs(L.solid, 9 - k * 1.5, 22, 0xf2efe6, 40, 0.4 + k * 22, 40, 8); onion(L.solid, 6, 40, 88.4, 40, C.gold, 0xf2efe6);
    // Red Square and St Basil's at its end
    bs(L.solid, 80, 0.5, 300, 0x7a6f68, 250, 0.4, 0);
    local(L.solid, 250, 0.4, 175, 0, 2.6, (M) => { bs(M, 36, 12, 36, 0xb04a36, 0, 0, 0); cs(M, 5, 26, 0xb04a36, 0, 12, 0, 8); ct(M, 0, 5, 16, 0x3f8a5a, 0, 38, 0, 8); const cols = [0x3f8a5a, 0xd9a640, 0x3a6fb0, 0xc23b2e, 0x2f9a8a, 0xd9a640, 0x3a6fb0, 0xc23b2e]; for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; onion(M, i % 2 ? 3.6 : 4.6, Math.sin(a) * 13, 12, Math.cos(a) * 13, cols[i], 0xb04a36); } });
    flag(L, 80, 140, 30, 4);
    return K.group(L, o.team, 'cap_moscow');
  });

  // ---------------------------------------------------------------- the other Middle East capitals
  K.define('cap_jerusalem', { name: 'Jerusalem', real: 'Jerusalem: the Old City walls, the Dome of the Rock on the Temple Mount', cat: 'site', role: 'capital', side: 'il', len: 1000 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 1000, 800, 0xb9ad8e);
    city(L, { w: 960, d: 760, n: 150, cols: [0xe1d6bb, 0xd8cba9, 0xcfc0a0, 0xe8dfc8], hMin: 7, hMax: 18, tower: [6, 50, 110], towerCols: [0xd8cba9, 0x9fb2bf], skip: [[40, 20, 230], [330, 40, 120]], seed: 71, glow: 0.1 });
    // the Old City walls, limestone, with towers
    fence(L.solid, 200, 180, 0xd9cdb0); [[0, 180, 400, 6], [0, -180, 400, 6], [200, 0, 6, 360], [-200, 0, 6, 360]].forEach((f) => bs(L.solid, f[2], 14, f[3], 0xd4c6a4, f[0], 0.4, f[1]));
    [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1], [1, 0], [-1, 0]].forEach((p) => bs(L.solid, 14, 20, 14, 0xd4c6a4, p[0] * 200, 0.4, p[1] * 180));
    city(L, { x: -40, z: 20, w: 300, d: 320, n: 50, cols: [0xe1d6bb, 0xd8cba9, 0xcfc0a0], hMin: 6, hMax: 12, skip: [[110, 10, 90]], seed: 73 });
    // the Temple Mount platform, the Dome of the Rock (drawn 1.6x), al-Aqsa to the south
    berm(L.solid, 150, 10, 220, 0xd9cdae, 110, 0.4, 10, 0, 0.97);
    local(L.solid, 110, 10.4, 0, PI / 8, 1.6, (M) => { cs(M, 22, 11, 0x3b78a8, 0, 0, 0, 8); cs(M, 22.6, 2, 0xe7e1d0, 0, 11, 0, 8); cs(M, 10.5, 7, 0x3b78a8, 0, 13, 0, 16); dome(M, 10.5, C.gold, 0, 20, 0, 14, 1.15); });
    bs(L.solid, 40, 12, 70, 0xd8cdb2, 110, 10.4, 95); dome(L.solid, 9, 0x8f9aa0, 110, 22.4, 70, 10, 1.0);
    hill(L.solid, 120, 50, 160, 0x8a8a62, 420, 40, 0, 9);
    flag(L, -260, 260, 30, 4);
    return K.group(L, o.team, 'cap_jerusalem');
  });

  K.define('cap_riyadh', { name: 'Riyadh', real: 'Riyadh: the Kingdom Centre, Al Faisaliyah, low desert city', cat: 'site', role: 'capital', side: 'gulf', len: 1100 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 1100, 900, 0xc2ab84);
    road(L.solid, -60, -450, -60, 450, 24, 0x4a4b4c); road(L.solid, -550, 100, 550, 100, 18, 0x4a4b4c);
    city(L, { w: 1060, d: 860, n: 210, cols: [0xd8c4a0, 0xcdb48f, 0xe1d2b6, 0xc2a882], hMin: 8, hMax: 24, tower: [8, 60, 140], towerCols: [0x8fa4b0, 0x7f8f9c, 0xcfc8b8], skip: [[60, -60, 70], [-220, 200, 60], [-60, 0, 20]], seed: 81, glow: 0.1, round: true });
    // Kingdom Centre (302 m): the tower body and the parabolic opening between its two arms, the sky bridge
    const kx = 60, kz = -60; add(L.solid, P.slab([[-36, -10], [-20, -22], [20, -22], [36, -10], [36, 10], [20, 22], [-20, 22], [-36, 10]], 196), 0x7f8d99, [kx, 98.4, kz]);
    [-1, 1].forEach((s) => { beam(L.solid, kx + s * 28, 196, kz, kx + s * 10, 302, kz, 14, 0x7f8d99); beam(L.solid, kx + s * 30, 190, kz, kx + s * 28, 210, kz, 14, 0x7f8d99); });
    b(L.solid, 34, 6, 12, 0x5f6d78, kx, 280, kz); b(L.glow, 30, 2, 12.4, X.winCool, kx, 280, kz);
    // Al Faisaliyah: the tapering pyramid tower with the golden globe
    berm(L.solid, 56, 230, 56, 0x8a98a2, -220, 0.4, 200, 0, 0.1); ball(L.solid, 15, C.gold, -220, 196, 200, 10); ct(L.metal, 0.5, 2, 40, C.steel, -220, 230, 200, 6);
    flag(L, 200, 200, 30, 4);
    return K.group(L, o.team, 'cap_riyadh');
  });

  K.define('cap_doha', { name: 'Doha', real: 'Doha: the West Bay towers on the bay, the Corniche', cat: 'site', role: 'capital', side: 'gulf', len: 1000 }, (K, o) => {
    const L = K.lists(); bs(L.solid, 1000, 0.45, 520, 0xc6b08a, 0, 0, -140); water(L.solid, 1000, 280, 0, 260);
    bs(L.solid, 1000, 0.55, 26, X.sandG, 0, 0, 128); road(L.solid, -500, 112, 500, 112, 16, 0x4a4b4c);
    city(L, { x: -200, z: -150, w: 560, d: 460, n: 120, cols: [0xdccbaa, 0xcdb48f, 0xe5d8be], hMin: 8, hMax: 22, seed: 91, glow: 0.08 });
    // West Bay: the tower cluster on the north-east of the bay
    city(L, { x: 300, z: -120, w: 340, d: 300, n: 30, cols: [0x7f9fb5, 0x9ab3c4, 0x5f7f96, 0xcfd6db], hMin: 90, hMax: 210, towerShape: 'mix', tower: [30, 120, 230], towerCols: [0x7f9fb5, 0x9ab3c4, 0x5f7f96, 0xcfd6db], skip: [[230, -60, 40], [360, -40, 40]], seed: 93, glow: 0.2 });
    cs(L.solid, 20, 220, 0x9aa7b0, 230, 0.4, -60, 12); dome(L.solid, 20, 0x9aa7b0, 230, 220.4, -60, 12, 0.7); ct(L.metal, 0.5, 2, 26, C.steel, 230, 234, -60, 6);
    add(L.solid, P.lathe([[20, 0], [14, 90], [21, 195], [0, 196]], 12), 0x6f95ad, [360, 0.4, -40]);
    // the Museum of Islamic Art on its island
    bs(L.solid, 90, 1, 70, 0xd8c8a6, -120, 0, 230); bs(L.solid, 50, 20, 50, 0xe3d6bb, -120, 1, 230); bs(L.solid, 36, 14, 36, 0xe3d6bb, -120, 21, 230); bs(L.solid, 22, 10, 22, 0xe3d6bb, -120, 35, 230);
    flag(L, -400, 60, 30, 4);
    return K.group(L, o.team, 'cap_doha');
  });

  // ================================================================== A) MILITARY GROUND: China and Taiwan
  // a canister TEL (DF-21 / DF-26): a long road-mobile truck, the canister rises from the rear
  function canTEL(K, o, type, s) {
    const L = K.lists(), col = X.cn; const t = truck(L, { len: s.len, wid: 3.2, axles: s.axles, r: 0.75, col, cab: 'flat', cabLen: 3.0, cabH: 2.3, lo: true });
    bs(L.solid, 3.1, 0.6, s.len - 3.4, col, 0, t.y, -1.6); [1, -1].forEach((k) => bs(L.solid, 0.4, t.y + 0.3, 0.4, C.dark, k * 1.45, 0, -s.len / 2 + 0.6));
    b(L.solid, 3.0, 0.9, 0.8, col, 0, t.cabTop - 0.3, s.len / 2 - 3.4); mark(L, 0, t.cabTop + 0.04, s.len / 2 - 1.3, 0.9, 0.9);
    const root = K.group(L, o.team, type);
    moving(root, o.team, 'erect', (M) => {
      cz(M.solid, s.r, s.can, 0x4f5c43, 0, s.r + 0.2, s.can / 2 + 0.3, 12); cz(M.solid, s.r * 1.04, 0.35, 0x2f3529, 0, s.r + 0.2, 0.45, 12); cz(M.solid, s.r * 1.04, 0.35, 0x2f3529, 0, s.r + 0.2, s.can + 0.15, 12);
      [0.3, 0.6].forEach((f) => cz(M.solid, s.r * 1.03, 0.25, 0xd9d6c8, 0, s.r + 0.2, s.can * f, 12));
      b(M.solid, 1.8, 0.35, s.can * 0.8, C.dark, 0, 0.1, s.can * 0.45);
    }, 0, t.y + 0.55, -s.len / 2 + 0.4);
    return root;
  }
  K.define('df21_tel', { name: 'DF-21 missile launcher', real: 'DF-21D anti-ship ballistic missile TEL (10x10)', cat: 'land', role: 'anti-ship / medium-range ballistic missile', side: 'cn', len: 15, anim: A.erect('erect', 17, H - 0.05) }, (K, o) => canTEL(K, o, 'df21_tel', { len: 15, axles: [6.0, 4.4, -1.6, -3.2, -4.8], r: 0.8, can: 11.8 }));
  K.define('df26_tel', { name: 'DF-26 missile launcher', real: 'DF-26 intermediate-range ballistic missile TEL (12x12)', cat: 'land', role: 'intermediate-range ballistic missile', side: 'cn', len: 18, anim: A.erect('erect', 18, H - 0.05) }, (K, o) => canTEL(K, o, 'df26_tel', { len: 18, axles: [7.4, 5.8, 1.0, -2.4, -4.0, -5.6], r: 0.98, can: 14.6 }));

  K.define('hq9_sys', { name: 'HQ-9 air defence', real: 'HQ-9 / HQ-9B: TEL with four tubes and HT-233 radar', cat: 'land', role: 'long-range air defence', side: 'cn', len: 45, anim: A.erect('erect', 18, H - 0.03) }, (K, o) => {
    const L = K.lists(), col = X.cn; bs(L.solid, 34, 0.2, 30, X.sandG, 0, 0, 0);
    const R = K.lists(); const t2 = truck(R, { len: 12, wid: 3, axles: [4.2, 2.6, -2.4, -4.0], r: 0.7, col, cab: 'flat', cabLen: 2.6, lo: true }); bs(R.solid, 3, 1.4, 8.2, col, 0, t2.y, -1.6);
    panel(R.solid, 6.2, 5.0, 0.7, 0x8f8f7e, col, 0, t2.y + 1.4, -0.4, 0.42); place(L, R, 9, 0, -7, -0.3, 1);
    const V = K.lists(); const t = truck(V, { len: 12.5, wid: 3.0, axles: [4.4, 2.8, -2.2, -4.0], r: 0.7, col, cab: 'flat', cabLen: 2.6, cabH: 2.2, lo: true }); bs(V.solid, 3.0, 0.5, 8.6, col, 0, t.y, -1.7); mark(V, 0, t.cabTop + 0.04, 4.8, 0.9, 0.9);
    place(L, V, -8, 0, 6, 0.4, 1); flag(L, 16, 10, 7, 1);
    const root = K.group(L, o.team, 'hq9_sys');
    moving(root, o.team, 'erect', (M) => { tubePack(M.solid, 2, 2, 0.52, 7.4, 0xb9b8a2, 0x8b8a78, 0.08, -1.1, 0.1, 8); b(M.solid, 2.5, 0.3, 0.5, C.dark, 0, -1.1, 0.3); }, -8 + Math.sin(0.4) * -5.9, t.y + 1.7, 6 + Math.cos(0.4) * -5.9, 0.4);
    return root;
  });

  K.define('plz05', { name: 'PLZ-05 howitzer', real: 'PLZ-05 155 mm self-propelled howitzer', cat: 'land', role: 'self-propelled artillery', side: 'cn', len: 11, anim: tankAnim }, (K, o) => armour(K, o, 'plz05', {
    col: X.cn, hull: { len: 7.4, wid: 3.4, n: 7, r: 0.36, h: 0.65, glacis: 1.3, rear: 0.1, skirt: 0.6, tw: 0.6 }, ty: -0.9,
    tur: [[-1.65, -3.0], [1.65, -3.0], [1.65, 1.6], [1.15, 2.2], [-1.15, 2.2], [-1.65, 1.6]], th: 1.45, gun: [0.11, 7.0, 0.85, 2.2],
    extra: (M, c) => { b(M.solid, 0.5, 0.35, 0.6, c, 0, 0.85, 9.0); b(M.solid, 0.5, 0.4, 0.5, C.dark, -0.8, 1.65, -0.5); cs(M.solid, 0.35, 0.3, c, 0.8, 1.45, -1.2, 8); }
  }));

  K.define('zbd05', { name: 'ZBD-05 amphibious fighting vehicle', real: 'ZBD-05 (VN18) amphibious IFV, PLA Marine Corps', cat: 'land', role: 'amphibious assault vehicle', side: 'cn', len: 9.5, anim: tankAnim }, (K, o) => {
    const L = K.lists(), col = 0x5f7280, h = tracked(L, { len: 8.2, wid: 3.6, n: 6, r: 0.36, h: 0.75, glacis: 0.6, rear: 0.1, skirt: 0.9, tw: 0.6, col });
    // the boat bow and its trim vane, the high flat deck
    add(L.solid, P.profile([[0, 0.6], [1.5, 1.3], [1.6, 1.8], [0, h.top + 0.05]], 3.6), col, [0, 0, 4.0]); b(L.solid, 3.5, 0.12, 1.4, 0x52636f, 0, 1.6, 6.0, -0.9);
    b(L.solid, 3.5, 0.3, 0.5, 0x52636f, 0, h.top - 0.2, -4.2); mark(L, 1.1, h.top + 0.04, -3.0, 0.7, 0.7);
    const root = K.group(L, o.team, 'zbd05');
    moving(root, o.team, 'turret', (M) => { add(M.solid, P.slab([[-0.95, -1.0], [0.95, -1.0], [1.1, 0.2], [0.7, 1.0], [-0.7, 1.0], [-1.1, 0.2]], 0.7), col, [0, 0.35, 0]); barrel(M.solid, 0.05, 2.8, col, 0.4, 0.9); [1, -1].forEach((s) => cz(M.solid, 0.09, 1.1, C.dark, s * 1.15, 0.5, 0.0, 6)); }, 0, h.top, -0.6);
    return root;
  });

  K.define('phl16', { name: 'PHL-16 rocket launcher', real: 'PHL-16 / PCH-191 long-range rocket launcher (8x8)', cat: 'land', role: 'long-range rocket artillery', side: 'cn', len: 12, anim: A.all(A.slew('turret', 0.35, 0.22), (o, dt, t) => { const tu = kid(o, 'turret'); if (tu) { const p = kid(tu, 'pod'); if (p) p.rotation.x = -cyc(t, 15) * 0.85; } }) }, (K, o) => {
    const L = K.lists(), col = X.cn; const t = truck(L, { len: 12, wid: 2.9, axles: [4.4, 2.9, -2.4, -4.0], r: 0.68, col, cab: 'flat', cabLen: 2.6, cabH: 2.1 });
    bs(L.solid, 2.9, 0.5, 8.4, col, 0, t.y, -1.6); [1, -1].forEach((s) => bs(L.solid, 0.35, t.y + 0.2, 0.35, C.dark, s * 1.3, 0, -5.6)); mark(L, 0, t.cabTop + 0.04, 4.6, 0.9, 0.9);
    const root = K.group(L, o.team, 'phl16');
    const tu = moving(root, o.team, 'turret', (M) => { cs(M.solid, 1.0, 0.4, C.dark, 0, 0, 0, 10); }, 0, t.y + 0.5, -5.2, 0);
    moving(tu, o.team, 'pod', (M) => { [1, -1].forEach((s) => { b(M.solid, 1.2, 1.15, 7.6, col, s * 0.66, 0.6, 3.8); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) cz(M.solid, 0.22, 0.06, C.dark, s * 0.66 - 0.27 + i * 0.54, 0.33 + j * 0.54, 7.62, 6); }); b(M.solid, 2.6, 0.3, 0.6, C.dark, 0, 0, 0.4); }, 0, 0.5, -0.2);
    return root;
  });

  K.define('tk3_sys', { name: 'Tien Kung III launcher', real: 'Sky Bow III (TK-3) launcher: four canisters on a semitrailer', cat: 'land', role: 'long-range air defence', side: 'tw', len: 18, anim: A.erect('erect', 18, 1.1) }, (K, o) => {
    const L = K.lists(), col = X.tw; truck(L, { len: 7.6, wid: 2.5, axles: [2.5, 0.9, -2.0], r: 0.6, col, cab: 'flat', cabLen: 2.4, cabH: 1.9 });
    const y = trailerParts(L, 10, 2.5, col, -8.2, 0.55, [-10.8, -12.0], false);
    [1, -1].forEach((s) => [-5.0, -12.6].forEach((z) => beam(L.solid, s * 1.1, y - 0.3, z, s * 2.8, 0.1, z, 0.2, C.dark)));
    mark(L, 0, 2.1 + 0.04, 2.6, 0.9, 0.9);
    const root = K.group(L, o.team, 'tk3_sys');
    moving(root, o.team, 'erect', (M) => { boxPack(M.solid, 2, 2, 1.1, 1.05, 6.4, 0xc9c8b2, 0x9a9984, 0.06, 0, 0); b(M.solid, 2.4, 0.3, 6.2, C.dark, 0, -0.15, 3.1); }, 0, y + 0.3, -12.8);
    return root;
  });

  K.define('hf2_coastal', { name: 'Hsiung Feng coastal launcher', real: 'Hsiung Feng II / III mobile coastal launcher (4 canisters)', cat: 'land', role: 'anti-ship missile launcher', side: 'tw', len: 11, anim: A.erect('erect', 15, 0.42) }, (K, o) => {
    const L = K.lists(), col = X.tw; const t = truck(L, { len: 11, wid: 2.55, axles: [3.7, 2.3, -2.0, -3.6], r: 0.62, col, cab: 'flat', cabLen: 2.4, cabH: 2.0 });
    bs(L.solid, 2.5, 0.45, 7.6, col, 0, t.y, -1.6); [1, -1].forEach((s) => bs(L.solid, 0.3, t.y + 0.2, 0.3, C.dark, s * 1.25, 0, -5.2)); mark(L, 0, t.cabTop + 0.04, 4.2, 0.9, 0.9);
    const root = K.group(L, o.team, 'hf2_coastal');
    moving(root, o.team, 'erect', (M) => { boxPack(M.solid, 2, 2, 1.05, 0.85, 6.8, 0xbdbca8, 0x8e8d7b, 0.06, 0, 0); b(M.solid, 2.3, 0.25, 6.4, C.dark, 0, -0.12, 3.2); }, 0, t.y + 0.7, -5.4);
    return root;
  });

  // ================================================================== B) SITES: China / Taiwan theatre
  K.define('site_chipfab', { name: 'Chip fab', real: 'Semiconductor fab campus (TSMC-style GigaFab): clean-room buildings, utilities', cat: 'site', role: 'semiconductor fab', side: 'tw', len: 700 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 700, 500, 0x7f8c6a);
    // two GigaFab clean-room blocks: huge white boxes, rooftop air handlers in rows, a blue band
    [[-150, -60], [170, -60]].forEach((p) => {
      bs(L.solid, 260, 46, 170, 0xeef0ef, p[0], 0.4, p[1]); bs(L.solid, 262, 6, 172, 0x5d84a8, p[0], 30, p[1]);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) bs(L.solid, 26, 7, 30, 0xb8bec2, p[0] - 105 + i * 42, 46.4, p[1] - 50 + j * 50);
      for (let i = 0; i < 4; i++) b(L.glow, 40, 2, 0.3, X.winCool, p[0] - 90 + i * 60, 22, p[1] + 85.3);
    });
    bs(L.solid, 40, 8, 6, C.glass, 10, 26, -60); // sky bridge between the fabs
    // the office tower, the utility plant with its cooling cells, chemical tanks, parking
    bs(L.solid, 44, 90, 30, 0x86a2b6, 0, 0.4, 120); bs(L.solid, 46, 2, 32, 0xdfe3e5, 0, 90.4, 120);
    bs(L.solid, 120, 18, 50, 0xd9dcdc, -200, 0.4, 150); for (let i = 0; i < 6; i++) cy(L.solid, 7, 2, 0x3c4246, -250 + i * 20, 19.4, 150, 0, 0, 0, 8);
    for (let i = 0; i < 5; i++) tank(L.solid, 7, 18, 140 + i * 20, 150, 0xf2f2f2, 8);
    bs(L.solid, 160, 0.42, 60, C.asphalt, 220, 0.4, 210); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) b(L.solid, 30, 1.6, 4, [0xc8c8c8, 0x3a5a8a, 0xb03a2e, 0xe8e8e8][(i + j) % 4], 160 + i * 38, 1.2, 196 + j * 26);
    road(L.solid, -350, 235, 350, 235, 12); flag(L, 60, 180, 30, 4);
    return K.group(L, o.team, 'site_chipfab');
  });

  const portAnim = (o, dt, t) => { const c = o.children; let k = 0; for (let i = 0; i < c.length; i++) if (c[i].name === 'crane') { c[i].position.x = c[i].userData.bx + 14 * Math.sin(t * 0.18 + k * 1.3); k++; } };
  K.define('site_port', { name: 'Container port', real: 'Container terminal: ship-to-shore cranes, container stacks, a moored ship', cat: 'site', role: 'port / logistics', side: 'any', len: 800, anim: portAnim }, (K, o) => {
    const L = K.lists(); bs(L.solid, 800, 0.5, 380, 0x9b978e, 0, 0, -130); water(L.solid, 800, 260, 0, 190); bs(L.solid, 800, 3, 16, C.concrete, 0, 0, 62);
    // container stacks in coloured rows, with gantries over them
    const cc = [0xb03a2e, 0x2f5f9a, 0x3e8a5a, 0xd9a640, 0x8a8f94, 0xe0e0e0, 0x7a3e6a, 0xc2662e];
    for (let r = 0; r < 5; r++) for (let i = 0; i < 6; i++) { const x = -330 + i * 120, z = -10 - r * 50; for (let k = 0; k < 3; k++) bs(L.solid, 90, 2.6, 12, cc[(r * 7 + i * 3 + k * 5) % 8], x, 0.4 + k * 2.6, z); }
    for (let i = 0; i < 3; i++) { const x = -270 + i * 240; [1, -1].forEach((s) => b(L.metal, 1.4, 22, 1.4, 0xd8d8d0, x + s * 50, 11.4, -60)); b(L.metal, 104, 2, 2, 0xd8d8d0, x, 22, -60); }
    bldg(L.solid, 70, 16, 30, C.offwhite, -330, -270, 0); bldg(L.solid, 50, 12, 24, 0xb9b2a5, 300, -270, 0); road(L.solid, -400, -300, 400, -300, 12);
    // the container ship at the quay: hull, deck stacks, the bridge house
    local(L.solid, 30, 0.3, 112, -H, 1, (M) => { add(M, P.profile([[-150, 0], [128, 0], [150, 14], [-150, 15]], 44), 0x2c3e50); b(M, 44.2, 4, 290, 0x8a2f2a, 0, 2, -2);
      for (let i = 0; i < 9; i++) for (let k = 0; k < 2; k++) bs(M, 40, 2.6, 22, cc[(i * 3 + k) % 8], 0, 15 + k * 2.6, 110 - i * 26); bs(M, 36, 22, 14, C.white, 0, 15, -128); bs(M, 8, 10, 8, 0x2b2d30, 0, 30, -140); });
    flag(L, -380, -200, 30, 4);
    const root = K.group(L, o.team, 'site_port');
    // ship-to-shore cranes along the quay; they travel
    [-260, -120, 20, 160, 300].forEach((x) => {
      const g = moving(root, o.team, 'crane', (M) => {
        [[-14, -8], [14, -8], [-14, 22], [14, 22]].forEach((p) => b(M.metal, 2.4, 50, 2.4, 0x3a6fb0, p[0], 25, p[1]));
        b(M.metal, 32, 3, 3, 0x3a6fb0, 0, 50, -8); b(M.metal, 32, 3, 3, 0x3a6fb0, 0, 50, 22); b(M.metal, 4, 4, 120, 0x3a6fb0, 0, 54, 40); bs(M.solid, 14, 8, 16, 0xe7e7e2, 0, 52, -2);
        beam(M.metal, 0, 52, -8, 0, 74, 6, 1.6, 0x3a6fb0); beam(M.metal, 0, 74, 6, 0, 56, 98, 0.8, 0x9aa0a6);
      }, x, 0.4, 40);
      g.userData.bx = x;
    });
    return root;
  });

  K.define('site_beach', { name: 'Landing beach', real: 'Defended landing beach: obstacles, wire, pillboxes, trenches', cat: 'site', role: 'invasion beach', side: 'tw', len: 520 }, (K, o) => {
    const L = K.lists(); bs(L.solid, 520, 0.45, 220, 0x7f8a5c, 0, 0, -130); bs(L.solid, 520, 0.5, 110, 0xd8c8a0, 0, 0, 30); water(L.solid, 520, 140, 0, 155); bs(L.solid, 520, 0.55, 18, 0xe8eef0, 0, 0, 88);
    for (let i = 0; i < 7; i++) berm(L.solid, 80, 10, 30, 0xc9b88e, -240 + i * 80, 0.4, -24, 0, 0.5);
    // hedgehogs and tetrahedra on the sand, wire lines
    for (let i = 0; i < 14; i++) { const x = -240 + i * 36 + (i % 2) * 12, z = 50 + (i % 2) * 18; [[1, 0], [0, 1]].forEach((d) => beam(L.solid, x - d[0] * 3, 0.4, z - d[1] * 3, x + d[0] * 3, 6, z + d[1] * 3, 0.7, 0x4a4540)); beam(L.solid, x, 0.4, z, x, 6.5, z, 0.7, 0x4a4540); }
    for (let i = 0; i < 10; i++) add(L.solid, P.cone(3.4, 5, 3), C.concrete, [-225 + i * 50, 2.9, 20 + (i % 2) * 6]);
    [8, 0].forEach((z) => b(L.solid, 500, 1.2, 0.8, 0x3a3530, 0, 1.4, z));
    // pillboxes on the dune line, trenches behind, a coastal gun
    [-160, 0, 160].forEach((x) => { bs(L.solid, 18, 8, 14, C.concrete, x, 6, -26); b(L.solid, 12, 1.4, 0.4, C.black, x, 11, -18.8); });
    for (let i = 0; i < 9; i++) b(L.solid, 54, 1, 5, 0x4a4234, -220 + i * 55, 0.7, -70 + (i % 2) * 12, 0, (i % 2 ? 0.35 : -0.35), 0);
    berm(L.solid, 30, 5, 30, X.earth, 200, 0.4, -120, 0, 0.6); local(L.solid, 200, 5.4, -120, 0, 2.4, (M) => { cs(M, 1.6, 1.4, X.tw, 0, 0, 0, 8); cz(M, 0.16, 6, X.tw, 0, 1.0, 3.2, 6); });
    // a landing craft running in
    local(L.solid, -100, 0.3, 175, PI, 1, (M) => { add(M, P.profile([[-24, 0], [22, 0], [26, 5], [-24, 5]], 14), 0x6d7880); bs(M, 4, 6, 5, 0x6d7880, 5, 5, -20); bs(M, 4, 6, 5, 0x6d7880, -5, 5, -20); b(M, 13, 4, 1, 0x5a646c, 0, 4, 24); });
    flag(L, -230, -150, 24, 3.4);
    return K.group(L, o.team, 'site_beach');
  });

  K.define('site_city_asia', { name: 'City (East Asia)', real: 'East Asian city: dense high-rise towers', cat: 'site', role: 'city', side: 'any', len: 900 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 920, 760, 0x8d8d80);
    road(L.solid, -460, 40, 460, 40, 20, 0x4a4b4c); road(L.solid, 60, -380, 60, 380, 20, 0x4a4b4c);
    city(L, { w: 880, d: 720, n: 180, cols: [0xd8dcdc, 0xc9cfd2, 0xe6e6e0, 0xb7bfc4, 0xa9b6bf], hMin: 24, hMax: 80, tower: [30, 110, 240], towerCols: [0x7f9fb5, 0x5f7f96, 0x9ab3c4, 0xcfd6db, 0x6d8a8a], towerShape: 'mix', skip: [[60, 40, 22]], seed: 101, glow: 0.18, round: true });
    return K.group(L, o.team, 'site_city_asia');
  });

  K.define('cap_taipei', { name: 'Taipei', real: 'Taipei: Taipei 101 over the basin, the mountains behind', cat: 'site', role: 'capital', side: 'tw', len: 1100 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 1100, 900, 0x7f8a6c);
    mountain(L.solid, -100, -400, 1000, 180, 220, 23, false, [0x5f6f4a, 0x6b7a52, 0x56653f]);
    b(L.solid, 80, 0.5, 900, X.water, -470, 0.5, 60, 0, 0.1, 0);
    city(L, { x: 0, z: 120, w: 900, d: 620, n: 170, cols: [0xd8dcdc, 0xc9cfd2, 0xe6e6e0, 0xb7bfc4], hMin: 18, hMax: 60, tower: [12, 80, 160], towerCols: [0x7f9fb5, 0x9ab3c4, 0xcfd6db], skip: [[200, 80, 70]], seed: 111, glow: 0.14 });
    // Taipei 101 (508 m): podium, shaft, eight flared modules, the crown and spire
    const tx = 200, tz = 80, gc = 0x5d8a7e; bs(L.solid, 120, 30, 90, 0xb9c2c0, tx, 0.4, tz); ct(L.solid, 26, 34, 70, gc, tx, 30.4, tz, 4, PI / 4);
    for (let i = 0; i < 8; i++) ct(L.solid, 33, 24, 34, i % 2 ? gc : 0x6a9688, tx, 100.4 + i * 34, tz, 4, PI / 4);
    ct(L.solid, 14, 22, 22, gc, tx, 372.4, tz, 4, PI / 4); ct(L.metal, 1.5, 6, 110, C.steel, tx, 394, tz, 6);
    for (let i = 0; i < 8; i++) b(L.glow, 34, 1.4, 34, X.winCool, tx, 132 + i * 34, tz, 0, PI / 4, 0);
    flag(L, 60, 300, 30, 4);
    return K.group(L, o.team, 'cap_taipei');
  });

  K.define('cap_beijing', { name: 'Beijing', real: 'Beijing: the Forbidden City, Tiananmen, the CCTV tower, low and wide', cat: 'site', role: 'capital', side: 'cn', len: 1200 }, (K, o) => {
    const L = K.lists(); tile(L.solid, 1200, 1000, 0x8e8a7c);
    road(L.solid, -600, 230, 600, 230, 26, 0x4a4b4c);
    city(L, { w: 1160, d: 960, n: 230, cols: [0x9a9890, 0x8f8b82, 0xa8a49a, 0xb9b3a6], hMin: 6, hMax: 18, tower: [10, 60, 140], towerCols: [0x7f9fb5, 0x9ab3c4], skip: [[-80, -60, 260], [-80, 330, 110], [380, 260, 70]], seed: 121, glow: 0.08 });
    // the Forbidden City: moat, red walls, halls with yellow roofs on white terraces along the axis
    const fx = -80, fz = -80; [[0, 238, 380, 16], [0, -238, 380, 16], [178, 0, 16, 476], [-178, 0, 16, 476]].forEach((f) => bs(L.solid, f[2], 0.5, f[3], X.water, fx + f[0], 0.2, fz + f[1])); [[0, 220, 330, 6], [0, -220, 330, 6], [160, 0, 6, 440], [-160, 0, 6, 440]].forEach((f) => bs(L.solid, f[2], 14, f[3], 0x9e3a2c, fx + f[0], 0.4, fz + f[1]));
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach((p) => { bs(L.solid, 18, 16, 18, 0x9e3a2c, fx + p[0] * 160, 0.4, fz + p[1] * 220); berm(L.solid, 24, 8, 24, 0xd9a640, fx + p[0] * 160, 16.4, fz + p[1] * 220, 0, 0.3); });
    [[150, 90, 30], [60, 70, 26], [-30, 90, 34], [-120, 60, 24]].forEach((h) => { bs(L.solid, h[1] + 14, 5, h[2] + 14, 0xe7e3da, fx, 0.4, fz + h[0]); bs(L.solid, h[1], 14, h[2], 0x9e3a2c, fx, 5.4, fz + h[0]); berm(L.solid, h[1] + 10, 12, h[2] + 10, 0xd9a640, fx, 19.4, fz + h[0], 0, 0.45); });
    // Tiananmen gate and the square, the monument
    bs(L.solid, 120, 18, 30, 0x9e3a2c, fx, 0.4, fz + 260); berm(L.solid, 128, 10, 38, 0xd9a640, fx, 18.4, fz + 260, 0, 0.55); bs(L.solid, 90, 8, 22, 0x9e3a2c, fx, 28.4, fz + 260); berm(L.solid, 98, 8, 30, 0xd9a640, fx, 36.4, fz + 260, 0, 0.5);
    bs(L.solid, 200, 0.6, 200, 0xb9b3a6, fx, 0.4, fz + 410); add(L.solid, P.cyl(2, 5, 38, 4), 0xe7e3da, [fx, 19.4, fz + 410], [0, PI / 4, 0]); bs(L.solid, 40, 26, 160, 0xd8d1c0, fx - 140, 0.4, fz + 410);
    // the CCTV headquarters: two leaning towers joined at the top
    const cxp = 380, czp = 260; bs(L.solid, 90, 30, 70, 0x6f7b85, cxp, 0.4, czp); beam(L.solid, cxp - 25, 30, czp - 10, cxp - 30, 220, czp + 10, 30, 0x6f7b85); beam(L.solid, cxp + 25, 30, czp + 10, cxp + 30, 220, czp - 10, 30, 0x6f7b85); b(L.solid, 90, 30, 40, 0x6f7b85, cxp, 222, czp, 0, 0.2, 0);
    hill(L.solid, 50, 40, 40, 0x5f7a4a, fx, fz - 290, 0, 8);
    flag(L, fx, fz + 340, 30, 4);
    return K.group(L, o.team, 'cap_beijing');
  });
}
