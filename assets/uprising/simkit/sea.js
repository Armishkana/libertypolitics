/* SIMKIT sea.js (warships, submarines, boats, merchant ships): see build/simkit/SIMKIT.md for the contract and the type list this file owns.
   Frame: metres, +Z is the bow, +Y up, +X is PORT (so starboard, where carrier islands sit, is -X). The waterline is y = 0;
   hulls are drawn from just below it (-0.35 m) up. Every hull comes out of hull() (a deck outline, a sheer line, a flare and a
   raked stem), every stealthy block out of loft() (a bottom and a top outline), every array face out of panel(). */
export default function register(K) {
  const T = K.T, C = K.C, P = K.part, add = K.add;
  const PI = Math.PI, H2 = PI / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  // ------------------------------------------------------------------ finishes (real paint, never the team colour)
  const F = {
    us: C.haze, usDk: 0x7d878f, usDeck: 0x585f66, fdeck: C.deck,
    cn: 0xa9b2b8, cnDk: 0x939ca2, cnDeck: 0x6e7880,
    ru: 0x7d8a92, ruDk: 0x66727a, ruDeck: 0x585f62,
    ir: 0xb0b5b2, irDk: 0x8f9692, irDeck: 0x777d79, irCam: 0x8c9a86,
    tw: 0x8f999f, twDeck: 0x5f676d, il: 0xa2a8aa, ilDeck: 0x6c7276,
    sub: 0x24282b, subDk: 0x181b1d, white: 0xeef0f0, buff: 0xc9b98f, glass: 0x22303c, red: C.hullRed,
    jet: 0x8a9298, jetCn: 0x9aa2a8, mesh: 0x3c4348, black: 0x1a1c1e, rubber: 0x2a2d30
  };

  // ------------------------------------------------------------------ small maths
  function ip(pts, u) {
    if (u <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return lerp(a[1], b[1], (u - a[0]) / ((b[0] - a[0]) || 1)); }
    return pts[pts.length - 1][1];
  }
  // a triangle soup that winds every triangle to face the hinted outward direction (the shared materials are one-sided)
  function Soup() {
    const a = [];
    const tri = (p, q, r, n) => {
      const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      if (cx * cx + cy * cy + cz * cz < 1e-12) return;
      if (cx * n[0] + cy * n[1] + cz * n[2] < 0) a.push(p[0], p[1], p[2], r[0], r[1], r[2], q[0], q[1], q[2]);
      else a.push(p[0], p[1], p[2], q[0], q[1], q[2], r[0], r[1], r[2]);
    };
    return {
      tri, quad: (p, q, r, s, n) => { tri(p, q, r, n); tri(p, r, s, n); },
      geo: () => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(a, 3)); return g; },
      empty: () => !a.length
    };
  }
  const put = (list, soup, col) => { if (!soup.empty()) add(list, soup.geo(), col); };

  // ------------------------------------------------------------------ the hull: deck outline + sheer + flare + raked stem
  // s: { len, beam, sheer [[u,h]], plan [[u,halfFraction]] (u 0 = stern .. 1 = bow), flare (waterline narrower by this share),
  //      rake (m the stem rakes forward), sover (m the stern overhangs), bt (boot-top height), col, boot, deck, z0 (stern z) }
  const WAR = [[0, .78], [.12, .93], [.35, 1], [.58, 1], [.75, .86], [.88, .58], [.96, .24], [1, .02]];
  const MERCH = [[0, .86], [.06, .97], [.16, 1], [.8, 1], [.9, .86], [.96, .55], [1, .12]];
  function hull(L, s) {
    const len = s.len, hb = s.beam / 2, zs = s.z0 == null ? -len / 2 : s.z0;
    const plan = s.plan || WAR, sheer = s.sheer, fl = s.flare == null ? .12 : s.flare, fs = s.flareShape == null ? .4 : s.flareShape;
    const rake = s.rake == null ? len * .05 : s.rake, so = s.sover == null ? len * .012 : s.sover;
    const bt = s.bt == null ? Math.max(.22, len * .0035) : s.bt, kn = .5, n = s.n || 18;
    let us = []; for (let i = 0; i <= n; i++) us.push(i / n);
    plan.forEach((p) => us.push(p[0])); sheer.forEach((p) => us.push(p[0]));
    us = us.filter((u) => u >= 0 && u <= 1).sort((a, b) => a - b).filter((u, i, A) => !i || u - A[i - 1] > 1e-4);
    const ring = (u) => {
      const w = Math.max(.03, hb * ip(plan, u)), h = ip(sheer, u);
      const zd = zs + u * len, zw = zs + so + u * (len - rake - so), ww = w * (1 - fl);
      return [[w, h, zd], [lerp(ww, w, fs), h * kn, lerp(zw, zd, kn)], [ww, bt, lerp(zw, zd, bt / h)], [ww, 0, zw], [ww * .94, -.35, zw - .35 * (zd - zw) / h]];
    };
    const x0 = s.x0 || 0, side = Soup(), boot = Soup(), deck = Soup(), X = (p, g) => [p[0] * g + x0, p[1], p[2]];
    const rings = us.map(ring);
    for (let i = 1; i < rings.length; i++) {
      const a = rings[i - 1], b = rings[i];
      for (const g of [1, -1]) for (let k = 0; k < 4; k++) (k < 2 ? side : boot).quad(X(a[k], g), X(b[k], g), X(b[k + 1], g), X(a[k + 1], g), [g, k === 3 ? -.5 : 0, 0]);
      deck.quad(X(a[0], 1), X(b[0], 1), X(b[0], -1), X(a[0], -1), [0, 1, 0]);
    }
    const r0 = rings[0], cz = r0[2][2], cy = r0[0][1] / 2;   // transom
    const tp = [0, 1, 2, 3, 4].map((k) => X(r0[k], 1)).concat([4, 3, 2, 1, 0].map((k) => X(r0[k], -1)));
    for (let i = 0; i < tp.length; i++) side.tri([x0, cy, cz], tp[i], tp[(i + 1) % tp.length], [0, 0, -1]);
    put(L.solid, side, s.col); put(L.solid, boot, s.boot == null ? F.red : s.boot); put(L.solid, deck, s.deck == null ? s.col : s.deck);
    const uOf = (z) => (z - zs) / len;
    return {
      top: (z) => ip(sheer, uOf(z)), half: (z) => hb * ip(plan, uOf(z)), len, zs, zb: zs + len,
      // a frame on the hull side at z, at fraction f of the way from waterline to deck, side g (+1 port, -1 starboard)
      frame(z, f, g) {
        const u = uOf(z), A = ring(u), B = ring(Math.min(1, u + .01)), Pp = [lerp(A[3][0], A[0][0], f) * g, A[0][1] * f, lerp(A[3][2], A[0][2], f)];
        const v = norm([(A[0][0] - A[3][0]) * g, A[0][1], A[0][2] - A[3][2]]), t = norm([(B[0][0] - A[0][0]) * g, B[0][1] - A[0][1], B[0][2] - A[0][2]]);
        let nn = norm(cross(t, v)); if (nn[0] * g < 0) nn = nn.map((x) => -x);
        return { p: Pp, n: nn, v: norm([-nn[0] * nn[1], 1 - nn[1] * nn[1], -nn[2] * nn[1]]) };
      }
    };
  }
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  // ------------------------------------------------------------------ blocks
  // loft: a bottom outline and a top outline ([x, z] each, same count, convex) joined; stealthy deckhouses, funnels, masts
  function loft(list, col, bot, top, y0, y1, noTop) {
    const s = Soup(), n = bot.length;
    let cx = 0, cz = 0; bot.forEach((p) => { cx += p[0] / n; cz += p[1] / n; });
    for (let i = 0; i < n; i++) {
      const a = bot[i], b = bot[(i + 1) % n], c = top[(i + 1) % n], d = top[i];
      const mx = (a[0] + b[0]) / 2 - cx, mz = (a[1] + b[1]) / 2 - cz;
      s.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [c[0], y1, c[1]], [d[0], y1, d[1]], [mx, 0, mz]);
    }
    if (!noTop) for (let i = 1; i < n - 1; i++) s.tri([top[0][0], y1, top[0][1]], [top[i][0], y1, top[i][1]], [top[i + 1][0], y1, top[i + 1][1]], [0, 1, 0]);
    put(list, s, col);
  }
  // an outline: a w x d rectangle centred at (x, z) with chamfered corners (ch), or a plain one (ch 0)
  function rect(w, d, x, z, ch) {
    const a = w / 2, b = d / 2; x = x || 0; z = z || 0;
    if (!ch) return [[x - a, z - b], [x + a, z - b], [x + a, z + b], [x - a, z + b]];
    return [[x - a + ch, z - b], [x + a - ch, z - b], [x + a, z - b + ch], [x + a, z + b - ch], [x + a - ch, z + b], [x - a + ch, z + b], [x - a, z + b - ch], [x - a, z - b + ch]];
  }
  // a block: w x d footprint at (x, z), from y up h; top shrunk to tw x td and moved dz along z (sloped faces)
  function frus(bw, bd, tw, td, h, dz) {
    const g = new T.BoxGeometry(1, 1, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const up = p.getY(i) > 0; p.setXYZ(i, p.getX(i) * (up ? tw : bw), up ? h : 0, p.getZ(i) * (up ? td : bd) + (up ? dz || 0 : 0)); }
    return g;
  }
  const blk = (list, col, w, h, d, x, y, z, tw, td, dz) => add(list, frus(w, d, tw == null ? w : tw, td == null ? d : td, h, dz), col, [x, y, z]);
  // a rod between two points (masts, legs, booms, rails)
  const _v = new T.Vector3(), _q = new T.Quaternion(), _e = new T.Euler(), _up = new T.Vector3(0, 1, 0);
  function rod(list, col, a, b, r, seg) {
    _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const l = _v.length(); _v.normalize();
    _q.setFromUnitVectors(_up, _v); _e.setFromQuaternion(_q, 'XYZ');
    add(list, new T.CylinderGeometry(r, r, l, seg || 4, 1, true), col, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [_e.x, _e.y, _e.z]);
  }
  // a flat horizontal strip (deck markings, hatches), yawed about y
  function flat(list, col, w, d, x, y, z, yaw) { const g = new T.PlaneGeometry(w, d); g.rotateX(-H2); if (yaw) g.rotateY(yaw); add(list, g, col, [x, y, z]); }
  // a dashed line on a deck from (x0,z0) to (x1,z1)
  function dash(list, col, x0, z0, x1, z1, y, w, n, fill) {
    const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz), yaw = Math.atan2(dx, dz), seg = l / n;
    for (let i = 0; i < n; i++) { const t = (i + .5) / n; flat(list, col, w, seg * (fill || .55), x0 + dx * t, y, z0 + dz * t, yaw); }
  }
  // an array face: octagon (seg 8) or square (seg 4) of radius r, facing yaw (0 = bow, +H2 = port), tilted back by tilt
  function panel(list, col, r, x, y, z, yaw, tilt, seg) {
    const g = seg === 4 ? P.box(r * 2, r * 2, .32) : P.cyl(r, r, .32, seg || 8);
    if (seg === 4) g.rotateX(-(tilt || 0)); else { g.rotateY(PI / 8); g.rotateX(H2 - (tilt || 0)); }
    g.rotateY(yaw); add(list, g, col, [x, y, z]);
  }
  // a rotating part: fill(lists) draws it about its own origin; anim turns every child called 'radar'
  function rotor(o, x, y, z, fill, name) { const l = K.lists(); fill(l); const g = K.group(l, o.team, name || 'radar'); g.position.set(x, y, z); return g; }
  const spin = (speed) => (obj, dt) => {
    let r = obj.__rad;
    if (!r) { r = obj.__rad = []; obj.traverse((n) => { if (n.name === 'radar') r.push(n); }); }
    for (let i = 0; i < r.length; i++) r[i].rotation.y += dt * speed * (i % 2 ? .8 : 1);
  };
  // a ship model: lists merged, moving parts attached
  function ship(L, o, name, parts) { const g = K.group(L, o.team, name); (parts || []).forEach((p) => g.add(p)); return g; }

  // ------------------------------------------------------------------ hull numbers: seven-segment digits painted on a surface
  const SEG = { a: [.5, .93, 1, .14], b: [.89, .73, .22, .5], c: [.89, .27, .22, .5], d: [.5, .07, 1, .14], e: [.11, .27, .22, .5], f: [.11, .73, .22, .5], g: [.5, .5, 1, .14] };
  const GLY = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' };
  // fr: { p, n, v } (point, outward normal, glyph up); h: digit height
  function digits(list, col, str, fr, h) {
    const s = Soup(), w = h * .58, gap = h * .22, U = cross(fr.v, fr.n), n = fr.n, V = fr.v;
    const total = str.length * w + (str.length - 1) * gap;
    const at = (u, v) => [fr.p[0] + U[0] * u + V[0] * v + n[0] * .06, fr.p[1] + U[1] * u + V[1] * v + n[1] * .06, fr.p[2] + U[2] * u + V[2] * v + n[2] * .06];
    for (let i = 0; i < str.length; i++) {
      const ox = -total / 2 + i * (w + gap), segs = GLY[str[i]] || '';
      for (const k of segs) {
        const q = SEG[k], cu = ox + q[0] * w, cv = (q[1] - .5) * h, uu = q[2] * w / 2, vv = q[3] * h / 2;
        s.quad(at(cu - uu, cv - vv), at(cu + uu, cv - vv), at(cu + uu, cv + vv), at(cu - uu, cv + vv), n);
      }
    }
    put(list, s, col);
  }
  // the number on both bows (US / Chinese / Taiwanese style: big white figures forward)
  function bowNumber(L, H, str, z, h, col, f) {
    for (const g of [1, -1]) digits(L.solid, col == null ? F.white : col, str, H.frame(z, f == null ? .58 : f, g), h);
  }
  // a painted band on both hull sides (coast guard slash, ferry stripe): from z-w/2..z+w/2 at height share f0, leaning by lean at f1
  function hullBand(list, col, H, z, w, lean, f0, f1) {
    const s = Soup();
    for (const g of [1, -1]) {
      const q = [[z - w / 2, f0], [z + w / 2, f0], [z + w / 2 + lean, f1], [z - w / 2 + lean, f1]].map(([zz, f]) => { const fr = H.frame(zz, f, g); return { p: fr.p.map((v, k) => v + fr.n[k] * .07), n: fr.n }; });
      s.quad(q[0].p, q[1].p, q[2].p, q[3].p, q[0].n);
    }
    put(list, s, col);
  }
  const deckNum = (list, str, x, y, z, h, yaw) => digits(list, C.deckLine, str, { p: [x, y, z], n: [0, 1, 0], v: [Math.sin(yaw || 0), 0, Math.cos(yaw || 0)] }, h);

  // ------------------------------------------------------------------ fittings
  // flag on a short staff (the team colour)
  function flag(L, x, y, z, s) { s = s || 1; rod(L.metal, F.mesh, [x, y, z], [x, y + 2.4 * s, z], .06 * s, 3); add(L.team, P.box(.08 * s, 1.5 * s, 2.3 * s), null, [x, y + 1.6 * s, z - 1.2 * s]); }
  // Mk 45 5-inch gun: the angular shield and a long barrel
  function gun5(list, col, x, y, z, s) {
    s = s || 1; add(list, P.profile([[-2.3 * s, 0], [2.1 * s, 0], [2.7 * s, .8 * s], [1.2 * s, 2 * s], [-2.3 * s, 2 * s]], 3.3 * s), col, [x, y, z]);
    add(list, P.cyl(.12 * s, .2 * s, 7 * s, 6), col, [x, y + 1.2 * s, z + 5.3 * s], [H2 - .06, 0, 0]);
  }
  // a rounded gun (76 mm OTO / AK-176 / 100 mm): a faceted cupola and a barrel
  function gunDome(list, col, x, y, z, r, bl) {
    add(list, P.cyl(r * .78, r, r * .9, 8), col, [x, y + r * .45, z]); add(list, P.cone(r * .78, r * .5, 8), col, [x, y + r * 1.15, z]);
    add(list, P.cyl(r * .09, r * .13, bl, 6), col, [x, y + r * .6, z + bl / 2 + r * .6], [H2 - .08, 0, 0]);
  }
  // a twin gun turret (AK-130, H/PJ-38 130 mm)
  function gunTwin(list, col, x, y, z, s, twin) {
    add(list, P.profile([[-2.6 * s, 0], [2.2 * s, 0], [3 * s, 1 * s], [1.4 * s, 2.4 * s], [-2.6 * s, 2.4 * s]], 4 * s), col, [x, y, z]);
    for (const dx of twin ? [-.7, .7] : [0]) add(list, P.cyl(.13 * s, .2 * s, 6.5 * s, 6), col, [x + dx * s, y + 1.4 * s, z + 5.2 * s], [H2 - .1, 0, 0]);
  }
  // Phalanx CIWS: the white radome on a grey mount
  function ciws(L, x, y, z, s) {
    s = s || 1; add(L.solid, P.cyl(.8 * s, .95 * s, 1 * s, 6), F.usDk, [x, y + .5 * s, z]);
    add(L.solid, P.cyl(.55 * s, .6 * s, 1.5 * s, 8), F.white, [x, y + 1.75 * s, z - .2 * s]); add(L.solid, P.cone(.55 * s, .55 * s, 8), F.white, [x, y + 2.77 * s, z - .2 * s]);
    add(L.metal, P.cyl(.1 * s, .1 * s, 2 * s, 5), F.mesh, [x, y + 1.3 * s, z + 1.1 * s], [H2, 0, 0]);
  }
  // a box missile launcher (RAM, Pantsir, YJ canisters...): n tubes in a block, raised at elev
  function canisters(list, col, x, y, z, n, w, l, elev, yaw) {
    const g = P.box(w * n, w, l); g.translate(0, w / 2, 0); g.rotateX(-(elev || 0)); if (yaw) g.rotateY(yaw); add(list, g, col, [x, y, z]);
  }
  // Mk 41 style VLS: a raised panel of cols x rows hatches
  function vls(list, x, y, z, cols, rows, cell, base, hatch) {
    add(list, P.box(cols * cell + .5, .3, rows * cell + .5), base == null ? F.usDk : base, [x, y + .15, z]);
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) flat(list, hatch == null ? 0x6a737a : hatch, cell * .8, cell * .8, x + (c - (cols - 1) / 2) * cell, y + .31, z + (r - (rows - 1) / 2) * cell);
  }
  // an air-search antenna (rotating): a flat rectangle on a pedestal
  function bedstead(l, w, h, col) { add(l.solid, P.box(w, h, .35), col, [0, h / 2 + .5, 0], [-.18, 0, 0]); add(l.solid, P.box(.8, .8, .8), F.mesh, [0, .3, -.3]); }
  // a dish / illuminator
  function dish(list, col, x, y, z, r, yaw) { const g = P.cyl(r, r * .6, r * .5, 8); g.rotateX(H2 - .3); g.rotateY(yaw || 0); add(list, g, col, [x, y, z]); }
  // a lattice mast: four legs tapering to the top, cross-braced
  function lattice(list, col, x, y0, z, y1, wb, wt, rake) {
    const zt = z - (rake || 0), lv = 4, c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sz] of c) rod(list, col, [x + sx * wb / 2, y0, z + sz * wb / 2], [x + sx * wt / 2, y1, zt + sz * wt / 2], .12, 3);
    for (let i = 0; i < lv; i++) {
      const t0 = i / lv, t1 = (i + 1) / lv, w0 = lerp(wb, wt, t0) / 2, w1 = lerp(wb, wt, t1) / 2, ya = lerp(y0, y1, t0), yb = lerp(y0, y1, t1), za = lerp(z, zt, t0), zb = lerp(z, zt, t1);
      for (const sx of [-1, 1]) rod(list, col, [x + sx * w0, ya, za - w0], [x + sx * w1, yb, zb + w1], .07, 3);
      for (const sz of [-1, 1]) rod(list, col, [x - w0, ya, za + sz * w0], [x + w1, yb, zb + sz * w1], .07, 3);
    }
  }
  // a boat on davits (RHIB / lifeboat)
  function boat(list, col, x, y, z, l) { add(list, P.profile([[-l / 2, 0], [l / 2 - l * .2, 0], [l / 2, l * .14], [-l / 2, l * .14]], l * .34), col, [x, y, z]); }

  // ------------------------------------------------------------------ parked aircraft (tiny silhouettes; air.js is not imported)
  function outline(half) { const m = half.slice().reverse().filter((p) => p[0] > 0).map((p) => [-p[0], p[1]]); return half.concat(m); }
  const JET = outline([[0, 8.5], [.6, 6], [.95, 3], [1.05, 1.6], [6.1, -1.5], [6.1, -2.7], [1.2, -2.5], [1.2, -5], [3.4, -7.2], [3.4, -8.1], [.7, -7.8], [0, -8.3]]);
  const JET_CN = outline([[0, 10.5], [.7, 7.5], [1.1, 3.5], [1.3, 2], [7.4, -2.5], [7.4, -3.7], [1.4, -3.4], [1.4, -6], [4, -8], [4, -9.2], [.8, -9], [0, -10.2]]);
  const DRONE = outline([[0, 3.4], [.5, 2.4], [.55, .6], [6.8, -.2], [6.8, -.9], [.55, -.8], [.5, -2.6], [1.6, -3.6], [1.6, -4], [0, -3.8]]);
  function jet(L, x, y, z, yaw, shape, col, s) {
    const g = P.slab(shape || JET, .7 * (s || 1)); if (s && s !== 1) g.scale(s, 1, s); g.rotateY(yaw || 0); add(L.solid, g, col || F.jet, [x, y + .45, z]);
    const sh = s || 1, c = Math.cos(yaw || 0), sn = Math.sin(yaw || 0);
    for (const sx of [-1.4, 1.4]) { const tx = sx * sh, tz = -6.4 * sh; const fg = P.box(.15, 2.4 * sh, 2.6 * sh); fg.rotateY(yaw || 0); add(L.solid, fg, col || F.jet, [x + tx * c + tz * sn, y + 1.4 * sh, z - tx * sn + tz * c]); }
  }
  function helo(L, x, y, z, yaw, col, s) {
    s = s || 1; yaw = yaw || 0; const c = Math.cos(yaw), sn = Math.sin(yaw), at = (lz) => [x + lz * sn, z + lz * c];
    const put2 = (g, lz, ly, list, cc) => { g.rotateY(yaw); const p = at(lz * s); add(list || L.solid, g, cc || col || F.jet, [p[0], y + ly * s, p[1]]); };
    put2(P.profile([[-3.4 * s, .3 * s], [3 * s, .3 * s], [4.4 * s, 1.1 * s], [3.8 * s, 2.3 * s], [-2.4 * s, 2.6 * s], [-3.6 * s, 1.7 * s]], 2.3 * s), 0, 0);
    put2(P.box(.45 * s, .6 * s, 7.4 * s), -6.6, 1.9); put2(P.box(.2 * s, 2.2 * s, 1.2 * s), -10.2, 2.6);
    for (const r of [PI / 4, -PI / 4]) { const g = P.box(.38 * s, .08, 16 * s); g.rotateY(r); put2(g, .3, 2.95, L.solid, 0x2e3236); }
  }
  // ------------------------------------------------------------------ flight decks
  // the flight-deck slab from a top-view outline ([x, z]), with its thickness and edge colour
  function fdeck(L, pts, y, thick, col) { add(L.solid, P.slab(pts, thick), col == null ? F.fdeck : col, [0, y - thick / 2, 0]); return y; }
  // helicopter spot on a small deck: circle-ish outline and a centreline
  // y is a height, or a function of z (a deck with sheer: H.top)
  function heloSpot(list, x, y, z, r) {
    const Y = typeof y === 'function' ? (zz) => y(zz) + .08 : () => y;
    for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2, a2 = (i + 1) / 8 * PI * 2; const x0 = x + Math.sin(a) * r, z0 = z + Math.cos(a) * r, x1 = x + Math.sin(a2) * r, z1 = z + Math.cos(a2) * r; flat(list, C.deckLine, .3, Math.hypot(x1 - x0, z1 - z0), (x0 + x1) / 2, Y((z0 + z1) / 2), (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0)); }
    for (let i = 0; i < 3; i++) flat(list, C.deckLine, .25, r * 1.06, x, Y(z + (i - 1) * r * 1.06), z + (i - 1) * r * 1.06);
  }

  // =====================================================================================================================
  // THE UNITED STATES
  // =====================================================================================================================

  // ---------------------------------------------------------------- Arleigh Burke (Flight IIA): 155 m, beam 20 m
  K.define('ddg_burke', { name: 'Arleigh Burke-class destroyer', real: 'DDG-51 Arleigh Burke class (Flight IIA / III)', cat: 'sea', role: 'Aegis destroyer: fleet air and missile defence, Tomahawk strike, anti-submarine', side: 'us', len: 155 }, (K, o) => {
    const L = K.lists(), c = F.us, dk = F.usDeck;
    const H = hull(L, { len: 155, beam: 20, sheer: [[0, 5.4], [.42, 6.3], [.8, 7.7], [1, 9.6]], plan: [[0, .82], [.12, .95], [.38, 1], [.6, .98], [.76, .84], [.88, .58], [.96, .24], [1, .02]], flare: .14, rake: 9, col: c, deck: dk });
    // forward deckhouse: the faceted block that carries the four SPY faces, then the bridge
    const y0 = 6.1, zf = 17.5, db = 28, wb = 15.6, dt = 24.5, wt = 12.6, ch0 = 4.2, ch1 = 3, y1 = 15.4;
    loft(L.solid, c, rect(wb, db, 0, zf, ch0), rect(wt, dt, 0, zf - .6, ch1), y0, y1);
    loft(L.solid, c, rect(12.2, 15, 0, 21.5, 2.4), rect(10.6, 12.6, 0, 20.6, 1.8), y1, 18.6);
    loft(L.glass, F.glass, rect(10.9, .6, 0, 27.4), rect(10.4, .6, 0, 27.0), 17.1, 18.1, true);
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const t = .55, w = lerp(wb, wt, t) / 2, d = lerp(db, dt, t) / 2, ch = lerp(ch0, ch1, t), zc = zf + lerp(0, -.6, t);
      panel(L.solid, 0x48515a, 2.05, sx * (w - ch / 2 + .12), lerp(y0, y1, t), zc + sz * (d - ch / 2 + .12), Math.atan2(sx, sz), .32);
    }
    blk(L.solid, c, 16.8, .5, 3, 0, 16.6, 25.5);                       // bridge wings
    ciws(L, 0, 10.5, 33, 1.1); blk(L.solid, c, 4, 4.5, 4, 0, 6.2, 33);  // forward Phalanx on its platform
    // the raked tripod mast
    const mz = 12.5;
    rod(L.solid, c, [2.6, 18.6, mz + 2], [0, 33.5, mz - 2.5], .6, 5); rod(L.solid, c, [-2.6, 18.6, mz + 2], [0, 33.5, mz - 2.5], .6, 5); rod(L.solid, c, [0, 18.6, mz - 5], [0, 33.5, mz - 2.5], .6, 5);
    blk(L.solid, c, 2.4, 6, 2.4, 0, 33, mz - 2.7, 1.2, 1.2, -.6);
    blk(L.solid, c, 10, .35, .7, 0, 31.5, mz - 2.2); blk(L.solid, c, 6.5, .3, .6, 0, 36.5, mz - 3.1);
    rod(L.metal, F.mesh, [0, 38.5, mz - 3.3], [0, 44, mz - 3.6], .14, 4);
    add(L.solid, P.cyl(.9, .9, 1.4, 8), F.white, [0, 39.5, mz - 3.3]);
    dish(L.solid, F.usDk, 3.6, 19.4, 15.5, 1.1, .5); dish(L.solid, F.usDk, -3.6, 19.4, 15.5, 1.1, -.5);
    flag(L, 0, 36.8, mz - 3.6, 1.2);
    // midships deckhouse and the two stacks with black caps
    blk(L.solid, c, 12.4, 3.4, 33, 0, 5.9, -12.5, 11.6, 32);
    for (const [z, h] of [[-3, 18.2], [-24, 17.4]]) {
      loft(L.solid, c, rect(8, 7.4, 0, z, 1.2), rect(6.8, 6.2, 0, z - 1.4, 1), 9.2, h);
      loft(L.solid, F.black, rect(6.8, 6.2, 0, z - 1.4, 1), rect(6.5, 5.9, 0, z - 1.5, .9), h, h + .7);
    }
    for (const g of [1, -1]) boat(L.solid, F.rubber, g * 6.6, 7.6, -14, 7.5);
    // forward VLS (32), the 5-inch gun, aft VLS (64)
    vls(L.solid, 0, H.top(38) - .1, 38, 8, 4, .92); gun5(L.solid, c, 0, H.top(52), 52);
    vls(L.solid, 0, H.top(-37) - .1, -37, 8, 8, .92);
    // hangar (double, IIA) with doors, Phalanx and illuminators on top; flight deck aft
    loft(L.solid, c, rect(15.6, 18, 0, -51, 1.4), rect(14, 15.4, 0, -51.8, 1), 5.4, 10.8);
    for (const g of [1, -1]) blk(L.solid, F.usDk, 5.6, 4.2, .2, g * 3.6, 5.5, -60.1);
    ciws(L, 0, 10.8, -56, 1.1); dish(L.solid, F.usDk, 3.4, 11.3, -46.5, 1.1, 2.6); dish(L.solid, F.usDk, -3.4, 11.3, -46.5, 1.1, -2.6);
    const fy = H.top(-68) + .02; heloSpot(L.solid, 0, H.top, -68.5, 5); flat(L.solid, C.deckLine, 12, .3, 0, H.top(-61.5) + .08, -61.5);
    flag(L, 0, H.top(-77) + .2, -76.6, 1);
    bowNumber(L, H, '113', 62, 3.2);
    return ship(L, o, 'ddg_burke');
  });

  // the JMSDF's Atago and Maya destroyers: the Arleigh Burke design, longer (170 m)
  K.define('jmsdf_ddg', { name: 'JMSDF Aegis destroyer', real: 'Atago and Maya classes (built on the Arleigh Burke design)', cat: 'sea', role: 'Japanese Aegis destroyer: ballistic missile defence, anti-ship', side: 'any', len: 170 }, (K, o) => {
    const L = K.lists(), c = F.us, dk = F.usDeck;
    const H = hull(L, { len: 170, beam: 21, sheer: [[0, 5.4], [.42, 6.3], [.8, 7.7], [1, 9.6]], plan: [[0, .82], [.12, .95], [.38, 1], [.6, .98], [.76, .84], [.88, .58], [.96, .24], [1, .02]], flare: .14, rake: 9, col: c, deck: dk });
    // forward deckhouse: the faceted block that carries the four SPY faces, then the bridge
    const y0 = 6.1, zf = 17.5, db = 28, wb = 15.6, dt = 24.5, wt = 12.6, ch0 = 4.2, ch1 = 3, y1 = 15.4;
    loft(L.solid, c, rect(wb, db, 0, zf, ch0), rect(wt, dt, 0, zf - .6, ch1), y0, y1);
    loft(L.solid, c, rect(12.2, 15, 0, 21.5, 2.4), rect(10.6, 12.6, 0, 20.6, 1.8), y1, 18.6);
    loft(L.glass, F.glass, rect(10.9, .6, 0, 27.4), rect(10.4, .6, 0, 27.0), 17.1, 18.1, true);
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const t = .55, w = lerp(wb, wt, t) / 2, d = lerp(db, dt, t) / 2, ch = lerp(ch0, ch1, t), zc = zf + lerp(0, -.6, t);
      panel(L.solid, 0x48515a, 2.05, sx * (w - ch / 2 + .12), lerp(y0, y1, t), zc + sz * (d - ch / 2 + .12), Math.atan2(sx, sz), .32);
    }
    blk(L.solid, c, 16.8, .5, 3, 0, 16.6, 25.5);                       // bridge wings
    ciws(L, 0, 10.5, 33, 1.1); blk(L.solid, c, 4, 4.5, 4, 0, 6.2, 33);  // forward Phalanx on its platform
    // the raked tripod mast
    const mz = 12.5;
    rod(L.solid, c, [2.6, 18.6, mz + 2], [0, 33.5, mz - 2.5], .6, 5); rod(L.solid, c, [-2.6, 18.6, mz + 2], [0, 33.5, mz - 2.5], .6, 5); rod(L.solid, c, [0, 18.6, mz - 5], [0, 33.5, mz - 2.5], .6, 5);
    blk(L.solid, c, 2.4, 6, 2.4, 0, 33, mz - 2.7, 1.2, 1.2, -.6);
    blk(L.solid, c, 10, .35, .7, 0, 31.5, mz - 2.2); blk(L.solid, c, 6.5, .3, .6, 0, 36.5, mz - 3.1);
    rod(L.metal, F.mesh, [0, 38.5, mz - 3.3], [0, 44, mz - 3.6], .14, 4);
    add(L.solid, P.cyl(.9, .9, 1.4, 8), F.white, [0, 39.5, mz - 3.3]);
    dish(L.solid, F.usDk, 3.6, 19.4, 15.5, 1.1, .5); dish(L.solid, F.usDk, -3.6, 19.4, 15.5, 1.1, -.5);
    flag(L, 0, 36.8, mz - 3.6, 1.2);
    // midships deckhouse and the two stacks with black caps
    blk(L.solid, c, 12.4, 3.4, 33, 0, 5.9, -12.5, 11.6, 32);
    for (const [z, h] of [[-3, 18.2], [-24, 17.4]]) {
      loft(L.solid, c, rect(8, 7.4, 0, z, 1.2), rect(6.8, 6.2, 0, z - 1.4, 1), 9.2, h);
      loft(L.solid, F.black, rect(6.8, 6.2, 0, z - 1.4, 1), rect(6.5, 5.9, 0, z - 1.5, .9), h, h + .7);
    }
    for (const g of [1, -1]) boat(L.solid, F.rubber, g * 6.6, 7.6, -14, 7.5);
    // forward VLS (32), the 5-inch gun, aft VLS (64)
    vls(L.solid, 0, H.top(38) - .1, 38, 8, 4, .92); gun5(L.solid, c, 0, H.top(52), 52);
    vls(L.solid, 0, H.top(-37) - .1, -37, 8, 8, .92);
    // hangar (double, IIA) with doors, Phalanx and illuminators on top; flight deck aft
    loft(L.solid, c, rect(15.6, 18, 0, -51, 1.4), rect(14, 15.4, 0, -51.8, 1), 5.4, 10.8);
    for (const g of [1, -1]) blk(L.solid, F.usDk, 5.6, 4.2, .2, g * 3.6, 5.5, -60.1);
    ciws(L, 0, 10.8, -56, 1.1); dish(L.solid, F.usDk, 3.4, 11.3, -46.5, 1.1, 2.6); dish(L.solid, F.usDk, -3.4, 11.3, -46.5, 1.1, -2.6);
    const fy = H.top(-68) + .02; heloSpot(L.solid, 0, H.top, -68.5, 5); flat(L.solid, C.deckLine, 12, .3, 0, H.top(-61.5) + .08, -61.5);
    flag(L, 0, H.top(-77) + .2, -76.6, 1);
    bowNumber(L, H, '113', 62, 3.2);
    return ship(L, o, 'jmsdf_ddg');
  });

  // ---------------------------------------------------------------- supercarriers: a shared builder, the class lives in cfg
  // deck outline [x, z] (port +x), island footprint and stack, elevators, parked air wing
  function supercarrier(o, cfg) {
    const L = K.lists(), c = F.us, fy = 20.2;
    hull(L, { len: 318, beam: 40, z0: -158, sheer: [[0, 18.7], [.8, 18.7], [1, 19.2]], plan: [[0, .84], [.1, .95], [.3, 1], [.7, 1], [.85, .82], [.95, .42], [1, .05]], flare: .1, flareShape: .2, rake: 22, sover: 7, col: c, deck: c, bt: .6, n: 16 });
    fdeck(L, cfg.deck, fy, 1.8, F.fdeck);
    // the sponsons under the angled deck and the island, so the overhang reads as structure, not a floating plate
    add(L.solid, P.slab([[19, 50], [39, 40], [33, -110], [22, -150], [19, -150]], 3.2), c, [0, 17, 0]);
    // markings: the angled landing area, its dashed centre line, the bow and waist catapults, the deck number
    const ly = fy + .02, ta = Math.tan(9 * PI / 180), ax = (z) => -1 + (z + 158) * ta, yaw = 9 * PI / 180;
    for (const off of [-12, 12]) { const x0 = ax(-160) + off, x1 = ax(38) + off; flat(L.solid, C.deckLine, .45, 200, (x0 + x1) / 2, ly, -61, yaw); }
    dash(L.solid, C.deckLine, ax(-158), -158, ax(30), 30, ly, .5, 14);
    for (const x of [-9, 6]) flat(L.solid, C.deckLine, .35, 92, x, ly, 116, x < 0 ? .015 : -.015);
    for (const x of [21, 32]) flat(L.solid, C.deckLine, .35, 70, x - 6, ly, 2, yaw);
    flat(L.solid, 0xc8a83a, .5, 330, -22, ly, 0);                                     // the foul line (yellow) along the island side
    deckNum(L.solid, cfg.num, -2, ly, 138, 13);
    // island
    const I = cfg.island, ix = I.x, iz = I.z;
    blk(L.solid, c, I.w, I.h1, I.l, ix, fy, iz, I.w, I.l * .97);
    loft(L.solid, c, rect(I.w - .6, I.l2, ix, iz + I.f2, I.ch || 0), rect(I.w - 1.4, I.l2 - 3, ix, iz + I.f2 - .8, I.ch ? I.ch * .8 : 0), fy + I.h1, fy + I.h1 + I.h2);
    loft(L.glass, F.glass, rect(I.w - .7, .5, ix, iz + I.f2 + I.l2 / 2 + .05), rect(I.w - 1.5, .5, ix, iz + I.f2 + I.l2 / 2 - .7), fy + I.h1 + I.h2 * .45, fy + I.h1 + I.h2 * .85, true);
    loft(L.glass, F.glass, rect(I.w - .2, .5, ix, iz + I.l / 2 + .05), rect(I.w - .3, .5, ix, iz + I.l / 2 + .02), fy + I.h1 - 3, fy + I.h1 - 1.4, true);
    for (const g of [1, -1]) digits(L.solid, F.white, cfg.num, { p: [ix + g * (I.w / 2 + .02), fy + I.h1 * .5, iz - I.l * .1], n: [g, 0, 0], v: [0, 1, 0] }, I.h1 * .55);
    const parts = cfg.top(L, ix, fy + I.h1 + I.h2, iz) || [];
    // point defence: RAM and Phalanx on the sponsons
    ciws(L, -30, fy - 3.2, -150, 1.3); ciws(L, 21, fy - 3.2, 70, 1.3); canisters(L.solid, F.usDk, 26, fy - 3, -146, 3, 1.2, 4, .3, 2.6); canisters(L.solid, F.usDk, -30, fy - 3, 150, 3, 1.2, 4, .3, -.6);
    // the air wing parked where real decks park it: the bow, along the island ("the street") and the stern corral
    for (let i = 0; i < 4; i++) jet(L, -22 + i * 1.2, fy, 154 - i * 13, -2.2);
    for (let i = 0; i < 3; i++) jet(L, ix + 12, fy, iz + I.l / 2 + 12 + i * 13, -2.4);
    for (let i = 0; i < 3; i++) jet(L, -20, fy, -112 - i * 13, -.8);
    jet(L, 12, fy, 120, PI * .9); jet(L, 2, fy, 132, PI * .95);
    helo(L, -10, fy, -140, .4); helo(L, -24, fy, cfg.heloZ, .8);
    flag(L, ix, cfg.flagY, iz - 2, 1.8);
    return ship(L, o, cfg.name, parts);
  }
  const NIMITZ_DECK = [[-10, 166], [8, 166], [16, 142], [18, 62], [30, 52], [40, 40], [38, -30], [33, -88], [43, -90], [43, -113], [30, -116], [24, -150], [20, -166], [-26, -166], [-29, -145],
    [-29, -72], [-39, -72], [-39, -50], [-30, -50], [-30, -44], [-37.5, -44], [-37.5, 6], [-30, 6], [-30, 14], [-40, 14], [-40, 38], [-30, 38], [-30, 46], [-40, 46], [-40, 70], [-29, 70], [-27, 110]];
  const FORD_DECK = [[-13, 167], [11, 167], [18, 140], [19, 62], [31, 52], [41, 40], [39, -30], [33, -88], [44, -90], [44, -113], [30, -116], [24, -150], [20, -167], [-25, -167], [-30, -140],
    [-30, -80], [-37.5, -80], [-37.5, -46], [-30, -46], [-30, 2], [-40, 2], [-40, 26], [-30, 26], [-30, 38], [-40, 38], [-40, 62], [-29, 62], [-27, 110]];

  // Nimitz: a big stepped island with the tall mast, SPS-48 and SPS-49 (both rotate), four elevators (three starboard)
  K.define('cvn_nimitz', { name: 'Nimitz-class aircraft carrier', real: 'CVN-68 Nimitz class', cat: 'sea', role: 'Nuclear supercarrier: the centre of a carrier strike group, about 60 aircraft', side: 'us', len: 333, anim: spin(1.1) }, (K, o) => supercarrier(o, {
    name: 'cvn_nimitz', deck: NIMITZ_DECK, num: '68', heloZ: 90, flagY: 64,
    island: { x: -33.2, z: -18, w: 9, l: 44, h1: 10, l2: 30, f2: 3, h2: 9 },
    top(L, x, y, z) {
      const c = F.us;
      loft(L.solid, c, rect(4, 4, x, z - 4), rect(2.6, 2.6, x, z - 6), y, y + 14);
      lattice(L.solid, c, x, y + 13, z - 6, y + 22, 3, 1.4, 1.2);
      blk(L.solid, c, 12, .4, .8, x, y + 12, z - 5.5); blk(L.solid, c, 7, .35, .7, x, y + 19, z - 6.6);
      add(L.solid, P.cyl(1.2, 1.2, 1.6, 8), F.white, [x, y + 23.5, z - 7.3]); rod(L.metal, F.mesh, [x, y + 24, z - 7.3], [x, y + 31, z - 7.5], .12, 4);
      blk(L.solid, c, 4.6, 5, 6, x, y - 9, z - 19);
      dish(L.solid, F.usDk, x + 4, y - 1, z + 8, 1.1, .3);
      return [rotor(o, x, y + 14.2, z - 4.6, (l) => bedstead(l, 5.6, 4.6, F.mesh)),
        rotor(o, x, y - 4, z - 19, (l) => { add(l.solid, P.box(8.5, 2.8, .4), F.mesh, [0, 1.8, 0], [-.15, 0, 0]); add(l.solid, P.box(.8, .8, .8), F.mesh, [0, .4, 0]); })];
    }
  }));
  // Ford: the island is smaller and about 40 m further aft, with fixed array faces and one enclosed mast; three elevators
  K.define('cvn_ford', { name: 'Gerald R. Ford-class aircraft carrier', real: 'CVN-78 Gerald R. Ford class', cat: 'sea', role: 'Nuclear supercarrier with electromagnetic catapults: the newest carrier strike group flagship', side: 'us', len: 337 }, (K, o) => supercarrier(o, {
    name: 'cvn_ford', deck: FORD_DECK, num: '78', heloZ: -20, flagY: 56,
    island: { x: -33.2, z: -63, w: 8.4, l: 30, h1: 9, l2: 22, f2: 2.5, h2: 8, ch: 2.6 },
    top(L, x, y, z) {
      const c = F.us, y0 = y - 8, zc = z + 2.5, t = .5, w = lerp(7.8, 7, t) / 2, d = lerp(22, 19, t) / 2, ch = lerp(2.6, 2.08, t), zz = zc - .4 * t;
      panel(L.solid, 0x4a535b, 1.7, x, y0 + 4.2, zz + d + .1, 0, .12, 4);
      for (const sx of [1, -1]) panel(L.solid, 0x4a535b, 1.7, x + sx * (w - ch / 2 + .1), y0 + 4.2, zz - (d - ch / 2 + .1), Math.atan2(sx, -1), .12, 4);
      loft(L.solid, c, rect(4.4, 6, x, z - 1, 1.2), rect(2.6, 3.4, x, z - 2, .7), y, y + 12);
      blk(L.solid, c, 7, .35, .7, x, y + 9, z - 1.8);
      add(L.solid, P.cyl(1.3, 1.3, 2, 8), F.white, [x, y + 13, z - 2]); rod(L.metal, F.mesh, [x, y + 14, z - 2], [x, y + 20, z - 2.2], .12, 4);
      dish(L.solid, F.usDk, x + 3.6, y - 1, z + 11, 1, .3);
      return [];
    }
  }));

  // ---------------------------------------------------------------- Ticonderoga cruiser: 173 m, two deckhouses, two arrays on each
  K.define('cg_tico', { name: 'Ticonderoga-class cruiser', real: 'CG-47 Ticonderoga class', cat: 'sea', role: 'Aegis guided-missile cruiser: air-defence commander of a carrier group, 122 missile cells', side: 'us', len: 173, anim: spin(1.2) }, (K, o) => {
    const L = K.lists(), c = F.us;
    const H = hull(L, { len: 173, beam: 16.8, sheer: [[0, 5.2], [.5, 6], [.8, 7.4], [1, 9.4]], plan: [[0, .76], [.12, .92], [.35, 1], [.6, 1], [.76, .86], [.88, .58], [.96, .24], [1, .02]], flare: .1, rake: 8, col: c, deck: F.usDeck });
    // forward deckhouse: arrays face forward and to starboard; the lattice foremast carries the SPS-49 (rotates)
    blk(L.solid, c, 14, 10.5, 30, 0, 5.8, 22, 13, 29, -.4);
    blk(L.solid, c, 11, 3, 13, 0, 16.3, 30, 10.4, 12.4, -.3); loft(L.glass, F.glass, rect(10.7, .5, 0, 36.6), rect(10.2, .5, 0, 36.3), 17.4, 18.6, true);
    panel(L.solid, 0x48515a, 1.9, 0, 12, 36.9, 0, .32); panel(L.solid, 0x48515a, 1.9, -6.85, 12, 27, -H2, .32);
    lattice(L.solid, c, 0, 16.3, 20, 31, 4, 1.6, 1); blk(L.solid, c, 8, .35, .7, 0, 28, 19.4);
    // the two stacks (three uptakes each) and the aft deckhouse with arrays aft and to port, mainmast, hangar
    for (const z of [3.5, -9]) { blk(L.solid, c, 7, 9, 7, 0, 7, z, 6.2, 6.4, -.6); for (const dx of [-1.8, 0, 1.8]) add(L.solid, P.cyl(.75, .75, 1.6, 6), F.black, [dx, 16.6, z - .6]); }
    blk(L.solid, c, 14, 9, 26, 0, 5.6, -18, 13, 25);
    panel(L.solid, 0x48515a, 1.9, 0, 11.6, -31.1, PI, .32); panel(L.solid, 0x48515a, 1.9, 6.85, 11.6, -22, H2, .32);
    lattice(L.solid, c, 0, 14.6, -14, 27, 3, 1.2, .8);
    ciws(L, -5, 14.6, -26, 1.1); ciws(L, 5, 14.6, -10, 1.1);
    for (const g of [1, -1]) boat(L.solid, F.rubber, g * 7.4, 8, -2, 7);
    // VLS fore and aft, 5-inch guns fore and aft, flight deck between the aft deckhouse and the aft VLS, Harpoons on the fantail
    vls(L.solid, 0, H.top(50) - .1, 50, 8, 8, .9); gun5(L.solid, c, 0, H.top(64), 64);
    heloSpot(L.solid, 0, H.top, -40, 4.5);
    vls(L.solid, 0, H.top(-56) - .1, -56, 8, 8, .9); gun5(L.solid, c, 0, H.top(-70), -71);
    for (const g of [1, -1]) canisters(L.solid, F.usDk, g * 4.5, H.top(-64), -64, 2, 1, 5, .25, g * .25);
    flag(L, 0, 30.5, 19, 1.3); flag(L, 0, H.top(-86) + .2, -85.6, 1);
    bowNumber(L, H, '70', 70, 3.2);
    return ship(L, o, 'cg_tico', [rotor(o, 0, 31.2, 19, (l) => bedstead(l, 7.2, 2.6, F.mesh))]);
  });

  // ---------------------------------------------------------------- big-deck amphibs: a shared builder
  function bigDeck(o, cfg) {
    const L = K.lists(), c = F.us, fy = cfg.fy;
    hull(L, { len: cfg.len - 6, beam: cfg.beam, z0: -cfg.len / 2, sheer: [[0, fy - 1.6], [1, fy - 1.2]], plan: cfg.plan, flare: .05, flareShape: .3, rake: cfg.rake, sover: 2, col: c, deck: c, bt: .5, n: 14 });
    fdeck(L, cfg.deck, fy, 1.6);
    if (cfg.well) blk(L.solid, F.mesh, 14, 7.5, .3, 0, .4, -cfg.len / 2 + .5);
    const ly = fy + .02;
    flat(L.solid, C.deckLine, .45, cfg.len * .86, 4, ly, 2);
    for (let i = 0; i < 6; i++) { const z = cfg.len * .38 - i * cfg.len * .14; heloSpot(L.solid, 9, ly, z, 4.2); }
    deckNum(L.solid, cfg.num, -4, ly, cfg.len * .43, 9);
    const I = cfg.island, ix = I.x, iz = I.z;
    blk(L.solid, c, I.w, I.h1, I.l, ix, fy, iz);
    loft(L.solid, c, rect(I.w - .6, I.l2, ix, iz + I.f2), rect(I.w - 1.2, I.l2 - 2.4, ix, iz + I.f2 - .6), fy + I.h1, fy + I.h1 + I.h2);
    loft(L.glass, F.glass, rect(I.w - .7, .5, ix, iz + I.f2 + I.l2 / 2 + .05), rect(I.w - 1.3, .5, ix, iz + I.f2 + I.l2 / 2 - .5), fy + I.h1 + I.h2 * .45, fy + I.h1 + I.h2 * .85, true);
    for (const g of [1, -1]) digits(L.solid, F.white, cfg.num, { p: [ix + g * (I.w / 2 + .02), fy + I.h1 * .5, iz], n: [g, 0, 0], v: [0, 1, 0] }, I.h1 * .55);
    const parts = cfg.top(L, ix, fy + I.h1 + I.h2, iz);
    ciws(L, -14, fy - 2.6, cfg.len / 2 - 22, 1.2); ciws(L, 15, fy - 2.6, -cfg.len / 2 + 6, 1.2); canisters(L.solid, F.usDk, -15, fy - 2.6, -cfg.len / 2 + 8, 3, 1.1, 4, .3, -2.5);
    cfg.air(L, fy);
    flag(L, ix, cfg.flagY, iz - 3, 1.6);
    return ship(L, o, cfg.name, parts);
  }
  const AMPHIB_PLAN = [[0, .9], [.1, .98], [.3, 1], [.72, 1], [.86, .84], [.95, .5], [1, .08]];
  // America (LHA-6): no well deck, a larger hangar, a tall blocky island with one big mast
  K.define('lha_america', { name: 'America-class amphibious assault ship', real: 'LHA-6 America class', cat: 'sea', role: 'Amphibious assault ship: F-35B jets, MV-22 tiltrotors and helicopters for a Marine expeditionary unit', side: 'us', len: 257, anim: spin(1.1) }, (K, o) => bigDeck(o, {
    name: 'lha_america', len: 257, beam: 32, fy: 19.5, rake: 16, num: '6', flagY: 62, plan: AMPHIB_PLAN,
    deck: [[-8, 128], [9, 128], [17, 96], [18, 10], [27, 10], [27, -12], [18, -12], [18, -128], [-17, -128], [-17, -64], [-27, -64], [-27, -44], [-18, -44], [-18, -40], [-21, -40], [-21, 18], [-18, 18], [-17, 96]],
    island: { x: -16.5, z: -10, w: 8.6, l: 52, h1: 11, l2: 32, f2: 6, h2: 9 },
    top(L, x, y, z) {
      const c = F.us; loft(L.solid, c, rect(5.5, 9, x, z + 2, 1.5), rect(3.4, 5, x, z + 1, .8), y, y + 15);
      blk(L.solid, c, 9, .4, .8, x, y + 12, z + 1); add(L.solid, P.cyl(1.1, 1.1, 1.6, 8), F.white, [x, y + 16, z + 1]); rod(L.metal, F.mesh, [x, y + 17, z + 1], [x, y + 23, z + 1], .12, 4);
      blk(L.solid, c, 4.5, 6, 6, x, y - 9, z - 21);
      return [rotor(o, x, y + 15, z + 1.5, (l) => bedstead(l, 5.2, 4.2, F.mesh)), rotor(o, x, y - 3, z - 21, (l) => bedstead(l, 7.6, 2.6, F.mesh))];
    },
    air(L, fy) {
      for (let i = 0; i < 5; i++) jet(L, -6, fy, 100 - i * 13, -2.3);
      for (let i = 0; i < 3; i++) helo(L, 9, fy, 95 - i * 36, PI * .5);
      for (let i = 0; i < 3; i++) helo(L, -8, fy, -60 - i * 18, -.9, null, 1.25);
    }
  }));
  // Wasp (LHD-1): a well deck (the stern gate), a longer lower island with a forward and an aft mast
  K.define('lhd_wasp', { name: 'Wasp-class amphibious assault ship', real: 'LHD-1 Wasp class', cat: 'sea', role: 'Amphibious assault ship with a well deck: landing craft, helicopters, tiltrotors and jump jets', side: 'us', len: 257, anim: spin(1.1) }, (K, o) => bigDeck(o, {
    name: 'lhd_wasp', len: 257, beam: 32, fy: 18.5, rake: 18, num: '1', flagY: 52, well: true, plan: AMPHIB_PLAN,
    deck: [[-7, 128], [7, 128], [16, 98], [17, 6], [26, 6], [26, -16], [17, -16], [17, -126], [-16, -126], [-16, -70], [-26, -70], [-26, -50], [-17, -50], [-17, -36], [-20, -36], [-20, 28], [-17, 28], [-16, 98]],
    island: { x: -16, z: -3, w: 8, l: 62, h1: 9, l2: 26, f2: 14, h2: 7 },
    top(L, x, y, z) {
      const c = F.us; lattice(L.solid, c, x, y, z + 15, y + 15, 3.4, 1.4, 1); blk(L.solid, c, 8, .35, .7, x, y + 12, z + 14);
      add(L.solid, P.cyl(1, 1, 1.4, 8), F.white, [x, y + 16, z + 14]); rod(L.metal, F.mesh, [x, y + 16.5, z + 14], [x, y + 22, z + 14], .12, 4);
      blk(L.solid, c, 5, 5, 8, x, y - 7, z - 22); rod(L.solid, c, [x, y - 2, z - 22], [x, y + 9, z - 23], .5, 5);
      dish(L.solid, F.usDk, x + 3, y - 1, z + 26, 1, .4);
      return [rotor(o, x, y + 9.5, z - 23, (l) => bedstead(l, 5.2, 4.2, F.mesh)), rotor(o, x, y - 6.5, z + 2, (l) => bedstead(l, 7.2, 2.4, F.mesh))];
    },
    air(L, fy) {
      for (let i = 0; i < 4; i++) helo(L, -6, fy, 104 - i * 15, -2.2, null, 1.15);
      for (let i = 0; i < 2; i++) jet(L, -7, fy, -64 - i * 13, -.9, null, .82);
      helo(L, 9, fy, 60, PI * .5); helo(L, 9, fy, -10, PI * .5);
    }
  }));

  // ---------------------------------------------------------------- San Antonio LPD: sloped sides and two enclosed masts
  K.define('lpd_sanantonio', { name: 'San Antonio-class amphibious transport dock', real: 'LPD-17 San Antonio class', cat: 'sea', role: 'Amphibious transport dock: 700 Marines, landing craft in a well deck, helicopters and tiltrotors', side: 'us', len: 208.5 }, (K, o) => {
    const L = K.lists(), c = F.us;
    const H = hull(L, { len: 208.5, beam: 31.9, sheer: [[0, 10.2], [.4, 10.6], [.8, 12.6], [1, 15]], plan: [[0, .93], [.1, .99], [.35, 1], [.62, .98], [.78, .8], [.9, .5], [.97, .2], [1, .03]], flare: .06, rake: 12, col: c, deck: F.usDeck });
    // the superstructure, sloped like the hull, running from the bow quarter back to the hangar
    loft(L.solid, c, rect(29, 88, 0, 4, 6), rect(23, 82, 0, 2, 4), 10.4, 20.5);
    loft(L.solid, c, rect(21, 28, 0, 34, 4), rect(17, 24, 0, 33, 3), 20.5, 26.5);
    loft(L.glass, F.glass, rect(18, .5, 0, 46.2), rect(16.6, .5, 0, 45.5), 23.5, 25.6, true);
    // the AEM/S masts: tall faceted octagonal towers
    loft(L.solid, c, rect(10, 10, 0, 30, 3), rect(4.6, 4.6, 0, 29, 1.4), 26.5, 48);
    loft(L.solid, c, rect(10, 10, 0, -22, 3), rect(5, 5, 0, -23, 1.5), 20.5, 41);
    rod(L.metal, F.mesh, [0, 48, 29], [0, 54, 29], .15, 4); add(L.solid, P.cyl(.9, .9, 1.2, 8), F.white, [0, 49, 29]);
    // hangar and flight deck aft, RAM fore and aft, the stern gate of the well deck
    blk(L.solid, c, 24, 7.5, 16, 0, 10.4, -48);
    const fyy = H.top(-80) + .02; for (const z of [-68, -90]) heloSpot(L.solid, 0, H.top, z, 5); flat(L.solid, C.deckLine, .4, 46, 0, fyy, -80);
    canisters(L.solid, F.usDk, 0, 20.5, 47.5, 3, 1.1, 4, .3); canisters(L.solid, F.usDk, 9, 18, -54, 3, 1.1, 4, .3, PI);
    for (const g of [1, -1]) { add(L.solid, P.cyl(.6, .7, 1.4, 6), F.usDk, [g * 6, H.top(70) + .7, 70]); }
    blk(L.solid, F.mesh, 14, 6.5, .3, 0, .4, -103.2);
    helo(L, 0, fyy, -70, 0, null, 1.2); helo(L, 0, fyy, -91, 0, null, 1.2);
    flag(L, 0, 54, 28.6, 1.4); bowNumber(L, H, '28', 88, 4.5);
    return ship(L, o, 'lpd_sanantonio');
  });

  // ---------------------------------------------------------------- submarines: a body of revolution, only the top shows
  // s: { len, r, sink (how far the axis sits below the water), prof [[u, rFraction]], col, z0 }
  function subBody(L, s) {
    const len = s.len, z0 = s.z0 == null ? -len / 2 : s.z0, n = s.n || 22, prof = s.prof, sink = s.sink, sv = Soup(), xs = s.xs || 1;
    const ring = (u) => {
      const r = s.r * ip(prof, u), z = z0 + u * len, out = [];
      const yb = -.35, a0 = r > sink - yb ? Math.asin(Math.max(-1, Math.min(1, (yb + sink) / Math.max(r, .01)))) : H2;
      for (let k = 0; k <= 4; k++) { const a = lerp(a0, H2, k / 4); out.push([Math.cos(a) * r * xs, Math.sin(a) * r - sink, z]); }
      return out;
    };
    let prev = ring(0);
    for (let i = 1; i <= n; i++) {
      const cur = ring(i / n);
      for (const g of [1, -1]) for (let k = 0; k < 4; k++) sv.quad([prev[k][0] * g, prev[k][1], prev[k][2]], [cur[k][0] * g, cur[k][1], cur[k][2]], [cur[k + 1][0] * g, cur[k + 1][1], cur[k + 1][2]], [prev[k + 1][0] * g, prev[k + 1][1], prev[k + 1][2]], [g * Math.cos(lerp(0, H2, k / 4)), Math.sin(lerp(0, H2, k / 4)), 0]);
      prev = cur;
    }
    put(L.solid, sv, s.col);
    if (s.fin != null) {   // the awash casing that runs back to the upper rudder, so the fin does not float on its own
      let u = 0; while (u < .5 && s.r * ip(prof, u) - sink < .3) u += .005;
      const zv = z0 + u * len + 1, l = zv - s.fin + 2; if (l > 0) blk(L.solid, s.col, s.r * .28, .7, l, 0, -.35, s.fin + l / 2 - 1.5, s.r * .12, l - 1);
    }
    return { top: (z) => Math.max(-.35, s.r * ip(prof, (z - z0) / len) - sink) };
  }
  const SUB_PROF = [[0, .05], [.06, .42], [.16, .8], [.28, .98], [.4, 1], [.82, 1], [.9, .94], [.96, .72], [1, .3]];
  // a sail: an elliptical-ish outline lofted up (taper), with an optional leading-edge fillet
  function sail(list, col, z, l, w, y0, h, rake) {
    const pts = [[0, l / 2], [w * .42, l * .36], [w / 2, l * .05], [w * .44, -l * .3], [w * .2, -l / 2], [-w * .2, -l / 2], [-w * .44, -l * .3], [-w / 2, l * .05], [-w * .42, l * .36]].map((p) => [p[0], p[1] + z]);
    loft(list, col, pts, pts.map((p) => [p[0] * .9, (p[1] - z) * .94 + z - (rake || 0)]), y0, y0 + h);
  }
  function fin(list, col, x, y, z, span, chord, th, roll) { const g = P.profile([[-chord / 2, 0], [chord / 2, 0], [chord * .2, span], [-chord / 2, span]], th); g.rotateZ(roll || 0); add(list, g, col, [x, y, z]); }

  K.define('ssn_virginia', { name: 'Virginia-class attack submarine', real: 'SSN-774 Virginia class', cat: 'sea', role: 'Nuclear attack submarine: hunts ships and submarines, Tomahawk strike, special forces', side: 'us', len: 115 }, (K, o) => {
    const L = K.lists(), c = F.sub;
    const S = subBody(L, { len: 115, r: 5.2, sink: 3.7, prof: SUB_PROF, col: c, fin: -54 });
    sail(L.solid, c, 30, 11, 3, S.top(30) - .3, 7.6, .3);
    add(L.solid, P.profile([[24.5, 0], [27, 0], [25.6, 3.4], [24.5, 1.4]], 2.6), c, [0, S.top(25) - .3, 0]);   // the leading-edge fillet
    fin(L.solid, c, 0, -.4, -54, 4.6, 4, .5);
    rod(L.metal, F.mesh, [0, S.top(30) + 7.2, 31], [0, S.top(30) + 9.5, 31], .18, 4); rod(L.metal, F.mesh, [0, S.top(30) + 7.2, 29.5], [0, S.top(30) + 8.8, 29.5], .25, 4);
    add(L.team, P.box(.08, 1, 1.6), null, [0, S.top(30) + 9, 30.2]);
    return ship(L, o, 'ssn_virginia');
  });
  K.define('ssgn_ohio', { name: 'Ohio-class guided-missile submarine', real: 'SSGN-726 Ohio class (SSGN)', cat: 'sea', role: 'Cruise-missile submarine: up to 154 Tomahawks in 22 converted ballistic-missile tubes', side: 'us', len: 170 }, (K, o) => {
    const L = K.lists(), c = F.sub;
    const S = subBody(L, { len: 170, r: 6.4, sink: 4.8, prof: [[0, .05], [.05, .45], [.12, .82], [.2, .98], [.3, 1], [.84, 1], [.92, .9], [.97, .65], [1, .28]], col: c, fin: -80 });
    // the missile deck: the long raised flat behind the sail with its 24 hatches in two rows
    const y = S.top(0) - .2; loft(L.solid, c, rect(6.4, 64, 0, 4, 1.6), rect(5.6, 62, 0, 4, 1.2), y - .4, y + 1.6);
    for (let i = 0; i < 12; i++) for (const g of [1, -1]) flat(L.solid, F.subDk, 1.9, 1.9, g * 1.35, y + 1.62, 32 - i * 5.1);
    sail(L.solid, c, 47, 13, 3.4, S.top(47) - .3, 7.2, .3);
    for (const g of [1, -1]) add(L.solid, P.box(4.2, .35, 2.6), c, [g * 3.6, S.top(47) + 4.8, 48.6]);
    fin(L.solid, c, 0, -.4, -80, 5, 5, .55);
    rod(L.metal, F.mesh, [0, S.top(47) + 6.8, 48.5], [0, S.top(47) + 9.3, 48.5], .2, 4);
    add(L.team, P.box(.08, 1, 1.6), null, [0, S.top(47) + 8.8, 47.7]);
    return ship(L, o, 'ssgn_ohio');
  });

  // ---------------------------------------------------------------- Independence-class LCS: the trimaran with the huge flight deck
  K.define('lcs', { name: 'Independence-class littoral combat ship', real: 'LCS-2 Independence class (trimaran)', cat: 'sea', role: 'Littoral combat ship: fast trimaran for mine countermeasures and shallow-water patrol', side: 'us', len: 127.4 }, (K, o) => {
    const L = K.lists(), c = F.us;
    hull(L, { len: 127.4, beam: 10, sheer: [[0, 6], [.6, 7], [1, 9.6]], plan: [[0, .7], [.2, .95], [.5, 1], [.75, .8], [.9, .45], [1, .02]], flare: .2, rake: 3, col: c, deck: c });
    for (const g of [1, -1]) hull(L, { len: 62, beam: 2.6, z0: -63.7, x0: g * 12.8, sheer: [[0, 5], [1, 5]], plan: [[0, .7], [.4, 1], [.8, .7], [1, .05]], flare: .1, rake: 2, col: c, deck: c, n: 8 });
    // the cross-structure: the wide body that spans all three hulls, sides sloping out
    loft(L.solid, c, [[-13, -63.6], [13, -63.6], [13, 6], [5, 30], [-5, 30], [-13, 6]], [[-15.8, -63.7], [15.8, -63.7], [15.8, 8], [6, 33], [-6, 33], [-15.8, 8]], 4.6, 10.6);
    // the superstructure and its angular mast
    loft(L.solid, c, rect(18, 36, 0, 4, 4), rect(14, 31, 0, 2.5, 3), 10.6, 18.6);
    loft(L.glass, F.glass, rect(10, .5, 0, 21.8), rect(9.6, .5, 0, 21.2), 15.6, 17.4, true);
    loft(L.solid, c, rect(6, 6, 0, 2, 1.5), rect(2.4, 2.4, 0, 0, .6), 18.6, 30.5);
    rod(L.metal, F.mesh, [0, 30.5, 0], [0, 35, 0], .12, 4); add(L.solid, P.cyl(.8, .8, 1, 8), F.white, [0, 31.2, 0]);
    gunDome(L.solid, c, 0, 10.6, 26, 1.6, 4.2); canisters(L.solid, F.usDk, 0, 18.6, -12, 3, 1, 3.6, .3, PI);
    const fyy = 10.62; heloSpot(L.solid, 0, fyy, -40, 6); flat(L.solid, C.deckLine, .4, 38, 0, fyy, -44); helo(L, 0, fyy, -38, 0);
    flag(L, 0, 33, -.5, 1.2); digits(L.solid, F.white, '2', { p: [15.85, 8.6, 12], n: [1, 0, 0], v: [0, 1, 0] }, 3); digits(L.solid, F.white, '2', { p: [-15.85, 8.6, 12], n: [-1, 0, 0], v: [0, 1, 0] }, 3);
    return ship(L, o, 'lcs');
  });

  // ---------------------------------------------------------------- fleet oiler (MSC): bridge aft, refuelling kingposts amidships
  K.define('tao', { name: 'Fleet replenishment oiler', real: 'T-AO-187 Henry J. Kaiser / T-AO-205 John Lewis class', cat: 'sea', role: 'Fleet oiler: refuels the carrier group under way, the strike group\'s endurance', side: 'us', len: 210 }, (K, o) => {
    const L = K.lists(), c = F.us;
    const H = hull(L, { len: 210, beam: 29.7, sheer: [[0, 12.5], [.84, 12.5], [.86, 15], [1, 16]], plan: MERCH, flare: .03, rake: 8, sover: 4, col: c, deck: 0x6c7377, bt: .7 });
    // bridge aft, buff funnel with the MSC bands
    blk(L.solid, F.white, 24, 14, 22, 0, 12.4, -76, 23, 21.4);
    blk(L.solid, F.white, 30, .5, 5, 0, 25.8, -68); loft(L.glass, F.glass, rect(22.6, .5, 0, -65.1), rect(22.4, .5, 0, -65.3), 24, 25.8, true);
    rod(L.solid, F.white, [0, 26.4, -72], [0, 34, -74], .4, 5);
    blk(L.solid, F.buff, 6, 10, 8, 0, 24, -88, 5.4, 7.2, -.6); blk(L.solid, 0x2c4f8a, 5.5, .8, 7.2, 0, 31, -88.4); blk(L.solid, C.gold, 5.4, .6, 7, 0, 32, -88.5); blk(L.solid, F.black, 5.4, 1.2, 7, 0, 33.6, -88.6);
    // the refuelling stations: pairs of kingposts with their crossbeams, a hose run between
    for (const z of [-44, -20, 4, 28, 52]) { for (const g of [1, -1]) blk(L.solid, c, 1.2, 15, 1.2, g * 5, 12.4, z); blk(L.solid, c, 13, 1, 1.2, 0, 27, z); for (const g of [1, -1]) rod(L.metal, F.mesh, [g * 5.5, 26, z], [g * 13.5, 16, z], .12, 3); }
    rod(L.metal, F.mesh, [0, 13.6, -62], [0, 13.6, 82], .5, 5);
    blk(L.solid, c, 12, 4, 10, 0, 15.8, 86);
    flag(L, 0, 34, -74.5, 1.2); bowNumber(L, H, '205', 92, 3.6, F.white, .7);
    return ship(L, o, 'tao');
  });

  // ---------------------------------------------------------------- Avenger mine countermeasures ship (wooden hull)
  K.define('mcm_avenger', { name: 'Avenger-class mine countermeasures ship', real: 'MCM-1 Avenger class', cat: 'sea', role: 'Mine countermeasures: hunts and clears sea mines (Bahrain-based, the Persian Gulf)', side: 'us', len: 68 }, (K, o) => {
    const L = K.lists(), c = F.us;
    const H = hull(L, { len: 68, beam: 11.9, sheer: [[0, 3.6], [.55, 4.2], [.58, 5.6], [1, 7]], plan: [[0, .82], [.2, .97], [.5, 1], [.75, .85], [.9, .5], [1, .04]], flare: .08, rake: 4, col: c, deck: F.usDeck });
    blk(L.solid, c, 10, 3.6, 24, 0, 5.4, 9); blk(L.solid, c, 8.6, 2.8, 11, 0, 9, 14, 8, 10.4, -.3); loft(L.glass, F.glass, rect(8.2, .4, 0, 19.6), rect(7.8, .4, 0, 19.3), 10.2, 11.4, true);
    lattice(L.solid, c, 0, 11.8, 12, 21, 2.2, .7, .6); rod(L.metal, F.mesh, [0, 21, 11.4], [0, 25, 11.3], .1, 4);
    blk(L.solid, c, 3, 7, 4, 0, 9, -1, 2.6, 3.4, -.6); blk(L.solid, F.black, 2.6, .5, 3.4, 0, 16, -1.6);
    // the sweep deck aft: cable reels, a crane, the mine-neutralisation vehicle
    for (const g of [1, -1]) add(L.solid, P.cyl(1.2, 1.2, 2.2, 8), F.mesh, [g * 3, H.top(-22) + 1.4, -22], [0, 0, H2]);
    rod(L.solid, c, [3.5, H.top(-14), -14], [2, 9, -24], .25, 4); add(L.solid, P.box(1.6, 1.2, 3.6), 0xd9a640, [-2.5, H.top(-27) + .6, -27]);
    gunDome(L.solid, c, 0, H.top(28), 27, .7, 2);
    flag(L, 0, 23, 11, .8); bowNumber(L, H, '14', 27, 1.8);
    return ship(L, o, 'mcm_avenger');
  });

  // =====================================================================================================================
  // ISRAEL
  // =====================================================================================================================
  K.define('saar6', { name: 'Sa\'ar 6-class corvette', real: 'Sa\'ar 6 (Magen class)', cat: 'sea', role: 'Missile corvette: guards Israel\'s offshore gas fields, Barak-8 air defence, C-Dome', side: 'il', len: 90 }, (K, o) => {
    const L = K.lists(), c = F.il;
    const H = hull(L, { len: 90, beam: 13.5, sheer: [[0, 4.4], [.5, 5], [.8, 6], [1, 7.4]], plan: WAR, flare: .16, rake: 4, col: c, deck: F.ilDeck });
    // forward block and the tall tapered mast with the four MF-STAR faces
    loft(L.solid, c, rect(12.4, 24, 0, 9, 2), rect(10.6, 21, 0, 8, 1.6), 5, 11.6);
    loft(L.glass, F.glass, rect(9.6, .5, 0, 18.6), rect(9.2, .5, 0, 18.1), 9.6, 11, true);
    loft(L.solid, c, rect(6.6, 7, 0, 7, 1.6), rect(3.6, 3.8, 0, 6.4, .8), 11.6, 25);
    for (const [yaw, dx, dz] of [[0, 0, 1], [PI, 0, -1], [H2, 1, 0], [-H2, -1, 0]]) panel(L.solid, 0x50585e, 1.3, dx * 2.75, 16.5, 6.6 + dz * 2.9, yaw, .2, 4);
    lattice(L.solid, c, 0, 25, 6.4, 30, 1.6, .5, 0); rod(L.metal, F.mesh, [0, 30, 6.4], [0, 33, 6.4], .08, 4);
    // midships launchers, the aft tower with its domes, hangar and helideck
    for (const g of [1, -1]) canisters(L.solid, 0x8c9396, g * 3, 5.4, -4, 2, .9, 5.4, .35, g * .5);
    loft(L.solid, c, rect(11.6, 18, 0, -16, 2), rect(10.4, 16, 0, -16.6, 1.6), 4.8, 11);
    loft(L.solid, c, rect(5, 5, 0, -12, 1), rect(3.6, 3.6, 0, -12.4, .7), 11, 17); add(L.solid, P.sphere(1.3, 8, 6), F.white, [-.9, 18, -12.4]); add(L.solid, P.sphere(1.3, 8, 6), F.white, [.9, 18, -12.4]);
    vls(L.solid, 0, 11, -20, 4, 4, .9, 0x7f8689, 0x5f666a);
    gunDome(L.solid, c, 0, H.top(28), 28, 1.5, 4); add(L.solid, P.box(4, .8, 3), c, [0, H.top(22) + 1, 22]);
    heloSpot(L.solid, 0, H.top, -36, 4.5);
    flag(L, 0, 30, 6, .9); flag(L, 0, H.top(-44.5) + .2, -44.2, .8);
    return ship(L, o, 'saar6');
  });

  // =====================================================================================================================
  // THE ISLAMIC REPUBLIC (IRGC Navy and the regular navy)
  // =====================================================================================================================

  // IRGC Navy fast attack boat (Peykaap / Zolfaghar class): a planing hull, a low cabin, two anti-ship missile tubes aft
  K.define('irgcn_fac', { name: 'IRGC Navy fast attack boat', real: 'Peykaap II / Zolfaghar class fast attack craft', cat: 'sea', role: 'Swarm boat: 50+ knots, Nasr/Kowsar anti-ship missiles or torpedoes, attacks in groups', side: 'ir', len: 17 }, (K, o) => {
    const L = K.lists(), c = F.ir;
    const H = hull(L, { len: 17, beam: 3.7, sheer: [[0, 1.25], [.6, 1.4], [1, 1.9]], plan: [[0, .84], [.3, 1], [.6, .95], [.82, .7], [.94, .35], [1, .02]], flare: .14, rake: 2.2, sover: .1, col: c, deck: F.irDk, bt: .12, n: 10 });
    // camouflage patches along the sides
    for (const [z, f, w] of [[4, .55, 2.2], [-2.5, .6, 2.6], [-6.5, .5, 1.6]]) for (const g of [1, -1]) { const fr = H.frame(z, f, g); add(L.solid, P.box(.05, .55, w), F.irCam, [fr.p[0] + fr.n[0] * .04, fr.p[1], fr.p[2]], [0, 0, -g * .2]); }
    loft(L.solid, F.irDk, rect(2.6, 4.6, 0, 1.5, .5), rect(2.2, 3, 0, .9, .3), 1.35, 2.75);
    loft(L.glass, F.glass, rect(2.3, .2, 0, 3.5), rect(2, .2, 0, 2.6), 1.9, 2.65, true);
    rod(L.metal, F.mesh, [0, 2.75, .3], [0, 4.2, .1], .05, 3); add(L.solid, P.cyl(.25, .25, .25, 6), F.white, [0, 4, .1]);
    for (const g of [1, -1]) { const t = P.cyl(.28, .28, 4.6, 6); t.rotateX(H2 - .12); add(L.solid, t, F.irDk, [g * 1, 1.75, -4.4]); add(L.solid, P.box(.2, .5, .4), F.irDk, [g * 1, 1.45, -5.8]); }
    add(L.solid, P.cyl(.25, .3, .5, 6), F.mesh, [0, H.top(5.6) + .25, 5.6]); rod(L.metal, F.mesh, [0, H.top(5.6) + .5, 5.6], [0, H.top(5.6) + .65, 7.2], .05, 3);
    add(L.team, P.box(.04, .45, .7), null, [0, 4.4, -.25]);
    return ship(L, o, 'irgcn_fac');
  });

  // Shahid Soleimani: a wave-piercing catamaran missile corvette with vertical launch cells and a helicopter deck
  K.define('irgcn_soleimani', { name: 'Shahid Soleimani-class catamaran corvette', real: 'Shahid Soleimani class (IRGC Navy, FS313)', cat: 'sea', role: 'Catamaran missile corvette: vertical-launch anti-ship and air-defence missiles, a helicopter, fast', side: 'ir', len: 65 }, (K, o) => {
    const L = K.lists(), c = 0x7a8084, dk = 0x5f6569;
    for (const g of [1, -1]) hull(L, { len: 61, beam: 4.4, z0: -32.5, x0: g * 5.4, sheer: [[0, 3.4], [.8, 3.8], [1, 5.6]], plan: [[0, .8], [.2, 1], [.7, 1], [.88, .7], [1, .05]], flare: -.05, rake: -4, sover: .3, col: c, deck: c, bt: .2, n: 10 });
    // the bridging deck and the angular superstructure
    loft(L.solid, c, [[-7.2, -32.3], [7.2, -32.3], [7.2, 16], [3, 22], [-3, 22], [-7.2, 16]], [[-7.6, -32.5], [7.6, -32.5], [7.6, 17], [3.2, 23], [-3.2, 23], [-7.6, 17]], 2.4, 5.6);
    loft(L.solid, c, rect(12.6, 22, 0, 4, 2.6), rect(10.4, 18, 0, 3, 2), 5.6, 9.6);
    loft(L.glass, F.glass, rect(8, .4, 0, 13.6), rect(7.4, .4, 0, 12.8), 8, 9.3, true);
    loft(L.solid, c, rect(4.2, 5, 0, 1, 1), rect(2, 2.4, 0, 0, .5), 9.6, 16.6); rod(L.metal, F.mesh, [0, 16.6, 0], [0, 20, 0], .08, 4);
    add(L.solid, P.sphere(.8, 8, 6), F.white, [0, 17, 0]);
    vls(L.solid, 0, 5.5, -9, 4, 4, .9, dk, 0x4c5256);
    for (const g of [1, -1]) canisters(L.solid, dk, g * 4.6, 5.6, -3, 2, .8, 5, .25, g * .3);
    blk(L.solid, c, 9, 3.6, 6, 0, 5.6, -15.5);
    heloSpot(L.solid, 0, 5.62, -24.5, 4.2); helo(L, 0, 5.62, -24, 0, 0x6d7a5e, .85);
    gunDome(L.solid, c, 0, 5.6, 17, .7, 2.2);
    for (const g of [1, -1]) digits(L.solid, F.white, '313', { p: [g * 7.62, 4.2, 6], n: [g, 0, 0], v: [0, 1, 0] }, 1.5);
    flag(L, 0, 19.2, -.4, .7); flag(L, 0, 5.6, -32.2, .6);
    return ship(L, o, 'irgcn_soleimani');
  });

  // Moudge class (Jamaran): the Alvand-derived frigate, 76 mm forward, the big funnel, C-802 launchers, helicopter deck aft
  K.define('moudge', { name: 'Moudge-class frigate (Jamaran)', real: 'Moudge class (Jamaran, Dena, Sahand)', cat: 'sea', role: 'The regular navy\'s frigate: anti-ship missiles, a 76 mm gun, a helicopter deck', side: 'ir', len: 94, anim: spin(1.3) }, (K, o) => {
    const L = K.lists(), c = F.ir;
    const H = hull(L, { len: 94, beam: 11.1, sheer: [[0, 3.6], [.45, 4], [.48, 5.6], [.8, 6.2], [1, 7.4]], plan: WAR, flare: .1, rake: 5, col: c, deck: F.irDeck });
    blk(L.solid, c, 9.6, 3, 26, 0, 5.4, 9); blk(L.solid, c, 8.4, 3, 11, 0, 8.4, 16, 7.8, 10.2, -.3);
    loft(L.glass, F.glass, rect(7.9, .4, 0, 21.4), rect(7.4, .4, 0, 21), 9.8, 11, true);
    // the tripod mast with a rotating search radar, the broad funnel aft of it
    rod(L.solid, c, [1.8, 11.4, 15], [0, 21, 13], .25, 4); rod(L.solid, c, [-1.8, 11.4, 15], [0, 21, 13], .25, 4); rod(L.solid, c, [0, 11.4, 10], [0, 21, 13], .25, 4);
    blk(L.solid, c, 5, .3, .5, 0, 19, 13.2); rod(L.metal, F.mesh, [0, 22, 13], [0, 25, 13], .08, 4);
    blk(L.solid, c, 4.6, 6, 7, 0, 8.4, 0, 3.6, 5.6, -1.2); blk(L.solid, F.black, 3.6, .5, 5.6, 0, 14.4, -1.2);
    for (const g of [1, -1]) canisters(L.solid, F.irDk, g * 2.2, H.top(-8), -8, 2, 1, 6, .25, g * .35);
    blk(L.solid, c, 8, 3.2, 9, 0, 5.4, -16);
    gunDome(L.solid, c, 0, H.top(33), 33, 1.4, 3.8);
    add(L.solid, P.cyl(.5, .6, 1, 6), F.irDk, [2.5, H.top(-13) + 3.7, -14]); add(L.solid, P.cyl(.5, .6, 1, 6), F.irDk, [-2.5, H.top(-13) + 3.7, -14]);
    heloSpot(L.solid, 0, H.top, -33, 4);
    flag(L, 0, 24.5, 12.7, .9); bowNumber(L, H, '76', 37, 2.2);
    return ship(L, o, 'moudge', [rotor(o, 0, 21, 13, (l) => bedstead(l, 4.6, 1.3, F.mesh))]);
  });

  // Kilo (Tareq): the broad 'whale' hull, a tall flat-topped sail; Russia's Black Sea boats are the 636.3 improved version
  K.define('kilo', { name: 'Kilo-class submarine', real: 'Project 877EKM Kilo (the Islamic Republic: Tareq class) / Project 636.3 (Russia)', cat: 'sea', role: 'Diesel-electric attack submarine: torpedoes and mines; Russia\'s fire Kalibr cruise missiles', side: 'ir', len: 73 }, (K, o) => {
    const L = K.lists(), c = F.sub;
    const S = subBody(L, { len: 73, r: 5, sink: 3.3, prof: [[0, .25], [.04, .62], [.1, .86], [.2, 1], [.7, 1], [.86, .8], [.95, .5], [1, .2]], col: c, xs: 1.05, fin: -34 });
    // the flat casing deck along the top
    loft(L.solid, c, rect(3, 50, 0, 4, 1.2), rect(2.6, 49, 0, 4, 1), S.top(4) - .3, S.top(4) + .35);
    const sy = S.top(10) + .3;
    loft(L.solid, c, [[0, 17], [1.5, 14], [1.6, 6], [1.2, 2], [-1.2, 2], [-1.6, 6], [-1.5, 14]], [[0, 15.6], [1.3, 13.6], [1.4, 6.5], [1, 3.2], [-1, 3.2], [-1.4, 6.5], [-1.3, 13.6]], sy, sy + 5.4);
    rod(L.metal, F.mesh, [0, sy + 5.4, 12.5], [0, sy + 7.5, 12.5], .15, 4); rod(L.metal, F.mesh, [0, sy + 5.4, 11], [0, sy + 6.8, 11], .2, 4);
    fin(L.solid, c, 0, -.4, -34, 3.6, 3.6, .45);
    add(L.team, P.box(.06, .9, 1.4), null, [0, sy + 7, 12]);
    return ship(L, o, 'kilo');
  });

  // Ghadir midget submarine: 29 m, for the shallow Persian Gulf and the Strait of Hormuz
  K.define('ghadir', { name: 'Ghadir-class midget submarine', real: 'Ghadir class (IS-120)', cat: 'sea', role: 'Midget submarine: torpedoes and mines in the shallow Persian Gulf and the Strait of Hormuz', side: 'ir', len: 29 }, (K, o) => {
    const L = K.lists(), c = F.sub;
    const S = subBody(L, { len: 29, r: 1.6, sink: .9, prof: [[0, .1], [.08, .62], [.2, .96], [.3, 1], [.78, 1], [.9, .8], [1, .25]], col: c, n: 14, fin: -13.5 });
    sail(L.solid, c, 4, 4.4, 1, S.top(4) - .15, 2.2, .1);
    add(L.solid, P.box(2.6, .14, .9), c, [0, S.top(4) + 1.5, 4.8]);
    fin(L.solid, c, 0, -.3, -13.5, 1.6, 1.6, .2);
    rod(L.metal, F.mesh, [0, S.top(4) + 2, 4.2], [0, S.top(4) + 3, 4.2], .07, 3);
    add(L.team, P.box(.04, .4, .6), null, [0, S.top(4) + 2.8, 3.9]);
    return ship(L, o, 'ghadir');
  });

  // a merchant superstructure aft: the accommodation block with bridge wings, and the funnel behind
  function accommodation(L, z, w, decks, y0, col, funnel, fcol, band) {
    const h = decks * 2.8, d = 16 + decks * .4;
    blk(L.solid, col, w, h, d, 0, y0, z, w - .6, d - .6);
    blk(L.solid, col, w + 9, .5, 4, 0, y0 + h - .5, z + d / 2 - 2.5);
    loft(L.glass, F.glass, rect(w - .7, .4, 0, z + d / 2 - .25), rect(w - .9, .4, 0, z + d / 2 - .35), y0 + h - 2.2, y0 + h - .7, true);
    rod(L.solid, col, [0, y0 + h, z], [0, y0 + h + 7, z - 1.5], .3, 4); blk(L.solid, col, 7, .3, .5, 0, y0 + h + 5, z - 1.2);
    if (funnel) {
      const fz = z - d / 2 - 3; blk(L.solid, fcol || col, 6.4, 9, 8, 0, y0 + h - 4, fz, 5.6, 7, -1.2);
      if (band != null) blk(L.solid, band, 6, 1.6, 7.6, 0, y0 + h + 1.6, fz - .7, 5.8, 7.2, -.1);
      blk(L.solid, F.black, 5.6, .8, 7, 0, y0 + h + 5, fz - 1.2);
    }
  }

  // Makran: a converted Aframax tanker with a raised helicopter platform over the foredeck, bridge aft
  K.define('makran', { name: 'Makran forward base ship', real: 'IRIS Makran (441), converted tanker', cat: 'sea', role: 'Forward base ship: helicopters, drones, fast boats and supplies far from the Persian Gulf', side: 'ir', len: 228 }, (K, o) => {
    const L = K.lists(), c = 0x9da3a6;
    const H = hull(L, { len: 228, beam: 42, sheer: [[0, 11], [.85, 11], [.88, 13.5], [1, 14.5]], plan: MERCH, flare: .02, rake: 7, sover: 4, col: c, deck: 0x6f7577, bt: 2.4 });
    accommodation(L, -96, 26, 6, 10.8, 0xd8d3c4, true, 0xd8d3c4);
    // the flight deck on its platform, with structure and sheds underneath
    const py = 22; add(L.solid, P.slab([[-20, 96], [20, 96], [21, 10], [-21, 10]], 1.2), F.fdeck, [0, py - .6, 0]);
    for (const z of [18, 40, 62, 84]) for (const g of [1, -1]) blk(L.solid, c, 1.2, py - 11.6, 1.2, g * 17, 10.8, z);
    blk(L.solid, c, 30, 7, 60, 0, 10.8, 50, 30, 60); blk(L.solid, F.irDk, 14, 5, .3, 0, 10.8, 19.8);
    flat(L.solid, C.deckLine, .5, 80, 0, py + .02, 53); for (let i = 0; i < 4; i++) heloSpot(L.solid, (i % 2 ? 9 : -9), py + .02, 24 + i * 19, 5.5);
    helo(L, -9, py, 24, .3, 0x6d7a5e); helo(L, 9, py, 62, -.3, 0x6d7a5e);
    rod(L.metal, F.mesh, [0, 11, -40], [0, 11, 8], .5, 5);
    for (const g of [1, -1]) { rod(L.solid, c, [g * 14, 11, -20], [g * 14, 24, -24], .5, 4); rod(L.metal, F.mesh, [g * 14, 24, -24], [g * 19, 13, -8], .15, 3); }
    flag(L, 0, 34, -98, 1.4); bowNumber(L, H, '441', 103, 5, F.white, .62);
    return ship(L, o, 'makran');
  });

  // Shahid Bagheri: a container ship turned drone carrier: bridge aft, an angled flight deck with a ski jump at the bow
  K.define('shahid_bagheri', { name: 'Shahid Bagheri drone carrier', real: 'IRGCN Shahid Bahman Bagheri (C110-4), converted container ship', cat: 'sea', role: 'Drone carrier: launches fixed-wing drones from a ski jump, carries helicopters and fast boats', side: 'ir', len: 240 }, (K, o) => {
    const L = K.lists(), c = 0x5c6266, dk = 0x3f4448;
    const H = hull(L, { len: 240, beam: 32, sheer: [[0, 13], [.86, 13], [.9, 15], [1, 16]], plan: [[0, .84], [.06, .96], [.18, 1], [.76, 1], [.88, .82], [.96, .48], [1, .1]], flare: .02, rake: 9, sover: 5, col: c, deck: dk, bt: 1.6 });
    // the original bridge block (full beam) aft, its funnel
    blk(L.solid, c, 32, 18, 16, 0, 12.8, -92, 31, 15); blk(L.solid, c, 36, .6, 4, 0, 30.2, -86);
    loft(L.glass, F.glass, rect(30.5, .4, 0, -84.3), rect(30, .4, 0, -84.6), 27.8, 30, true);
    blk(L.solid, c, 18, 6, 10, 0, 30.8, -94); lattice(L.solid, c, 0, 36.8, -94, 46, 2.6, .8, .8); blk(L.solid, c, 8, .3, .5, 0, 44, -94.6);
    blk(L.solid, dk, 7, 7, 8, 0, 30.8, -104, 6, 7, -1);
    // the flight deck on its frames, rising into the ski jump
    const fy = 19; add(L.solid, P.slab([[-17, 86], [17, 86], [18, -74], [-17, -74]], 1.2), dk, [0, fy - .6, 0]);
    add(L.solid, P.profile([[86, -.6], [104, -.6], [116, 4.4], [116, 5.4], [104, 1.4], [86, .6]], 30), dk, [0, fy, 0]);
    for (const z of [-60, -30, 0, 30, 60, 84]) for (const g of [1, -1]) blk(L.solid, c, 1, fy - 13.2, 1, g * 15, 12.8, z);
    blk(L.solid, c, 26, 5.2, 120, 0, 12.8, 10, 26, 120);
    const ly = fy + .02, ta = Math.tan(-6 * PI / 180);
    for (const off of [-8, 8]) flat(L.solid, C.deckLine, .4, 120, off + 2, ly, -12, -6 * PI / 180);
    dash(L.solid, C.deckLine, 2 + ta * -70, -70, 2 + ta * 46, 46, ly, .45, 10);
    flat(L.solid, C.deckLine, .4, 90, -8, ly, 40);
    for (let i = 0; i < 4; i++) jet(L, -11, fy, 70 - i * 12, -2.2, DRONE, 0xa7aca8, 1.1);
    helo(L, 9, fy, -40, .5, 0x6d7a5e); helo(L, 9, fy, -62, .5, 0x6d7a5e);
    for (const g of [1, -1]) digits(L.solid, F.white, '110-4', H.frame(-50, .6, g), 4);
    flag(L, 0, 46, -95, 1.3);
    return ship(L, o, 'shahid_bagheri');
  });

  // a moored contact sea mine: the horned sphere riding at the surface
  K.define('seamine', { name: 'Naval contact mine', real: 'Moored contact mine (M-08 / Sadaf-02 type)', cat: 'sea', role: 'Sea mine: thousands could be laid in the Strait of Hormuz to close it to shipping', side: 'ir', len: 1.4 }, (K, o) => {
    const L = K.lists(), c = 0x3a3d3a;
    add(L.solid, P.sphere(.62, 10, 7), c, [0, .05, 0]);
    for (const [x, y, z] of [[0, .62, 0], [.5, .38, 0], [-.5, .38, 0], [0, .38, .5], [0, .38, -.5]]) { const d = norm([x, y - .05, z]); rod(L.metal, 0x8a7d58, [x * .9, y * .9 + .02, z * .9], [x + d[0] * .2, y + d[1] * .2, z + d[2] * .2], .05, 5); }
    add(L.solid, P.torus(.62, .04, 4, 12), 0x6a4a32, [0, .05, 0], [H2, 0, 0]);
    add(L.team, P.box(.08, .08, .08), null, [0, .82, 0]);
    return ship(L, o, 'seamine');
  });

  // =====================================================================================================================
  // MERCHANT SHIPPING
  // =====================================================================================================================

  // VLCC supertanker: 330 m, two million barrels; the deck pipework, the manifold cranes, the white accommodation aft
  K.define('vlcc', { name: 'VLCC oil supertanker', real: 'Very Large Crude Carrier (about 300,000 t, 2 million barrels)', cat: 'sea', role: 'Supertanker: about a fifth of the world\'s oil passes the Strait of Hormuz in ships like this', side: 'any', len: 330 }, (K, o) => {
    const L = K.lists(), hullC = 0x2b2f36;
    const H = hull(L, { len: 330, beam: 60, sheer: [[0, 12], [.9, 12], [.92, 14.5], [1, 15]], plan: [[0, .86], [.05, .97], [.13, 1], [.82, 1], [.92, .84], [.97, .52], [.995, .2], [1, .04]], flare: .02, rake: 6, sover: 6, col: hullC, deck: 0x6e3a2f, bt: 2.2, n: 20 });
    accommodation(L, -140, 34, 7, 11.8, 0xebe8e0, true, 0xebe8e0, 0x1f5fa8);
    // the catwalk and pipe rack down the centre, the cargo manifold with its hose cranes, tank hatches
    rod(L.metal, 0x9aa0a6, [0, 13.4, -125], [0, 13.4, 150], .7, 5); rod(L.metal, 0x9aa0a6, [2, 12.8, -125], [2, 12.8, 150], .35, 4); rod(L.metal, 0x9aa0a6, [-2, 12.8, -125], [-2, 12.8, 150], .35, 4);
    for (let i = 0; i < 8; i++) for (const g of [1, -1]) flat(L.solid, 0x6e3024, 5, 6, g * 14, 12.06, -100 + i * 30);
    for (const g of [1, -1]) { rod(L.metal, 0x9aa0a6, [g * 6, 12.4, 10], [g * 27, 12.4, 10], .45, 4); rod(L.solid, 0xd9a640, [g * 10, 12, 4], [g * 10, 22, 4], .5, 4); rod(L.solid, 0xd9a640, [g * 10, 22, 4], [g * 24, 16, 8], .3, 4); }
    blk(L.solid, 0xebe8e0, 10, 3, 6, 0, 14.4, 156);
    flag(L, 0, 32, -142, 1.6); flag(L, 0, 12.2, -164.4, 1.4);
    return ship(L, o, 'vlcc');
  });

  // =====================================================================================================================
  // CHINA
  // =====================================================================================================================

  // Chinese carriers: one builder; Shandong has the ski jump and a big island, Fujian is flat with three catapults
  function cnCarrier(o, cfg) {
    const L = K.lists(), c = F.cn, fy = 19.6, half = cfg.len / 2;
    hull(L, { len: cfg.len - 5, beam: 38, z0: -half + 2, sheer: [[0, 18.2], [1, 18.6]], plan: [[0, .84], [.1, .95], [.3, 1], [.7, 1], [.85, .8], [.95, .42], [1, .05]], flare: .1, flareShape: .2, rake: 18, sover: 6, col: c, deck: c, bt: .6, n: 16 });
    fdeck(L, cfg.deck, fy, 1.8, 0x3d4247);
    add(L.solid, P.slab([[19, 56], [37, 40], [31, -110], [21, -150], [19, -150]], 3.2), c, [0, 16.4, 0]);
    if (cfg.ski) add(L.solid, P.profile([[half - 50, -.9], [half, -.9], [half, 10.2], [half - 12, 5.6], [half - 26, 2.4], [half - 38, .9], [half - 50, .5]], 30), 0x3d4247, [-1, fy, 0]);
    const ly = fy + .02, ta = Math.tan(9 * PI / 180), ax = (z) => (z + half) * ta - 1, yaw = 9 * PI / 180;
    for (const off of [-11, 11]) { const x0 = ax(-half) + off, x1 = ax(30) + off; flat(L.solid, C.deckLine, .45, half + 30, (x0 + x1) / 2, ly, (30 - half) / 2, yaw); }
    dash(L.solid, C.deckLine, ax(-half + 4), -half + 4, ax(24), 24, ly, .5, 12);
    flat(L.solid, 0xc8a83a, .5, cfg.len * .95, -21, ly, 0);
    cfg.marks(L, ly);
    deckNum(L.solid, cfg.num, -2, ly, cfg.ski ? half - 64 : half - 26, 12);
    const I = cfg.island, ix = I.x, iz = I.z;
    blk(L.solid, c, I.w, I.h1, I.l, ix, fy, iz, I.w, I.l * .97);
    const yb = fy + I.h1, yt = yb + I.h2, w0 = I.w - .6, w1 = I.w - 1.4, d0 = I.l2, d1 = I.l2 - 3, ch0 = 2.6, ch1 = 2.1, zc = iz + I.f2;
    loft(L.solid, c, rect(w0, d0, ix, zc, ch0), rect(w1, d1, ix, zc - .8, ch1), yb, yt);
    loft(L.glass, F.glass, rect(w0 - 4, .5, ix, zc + d0 / 2 + .05), rect(w1 - 3.6, .5, ix, zc - .8 + d1 / 2 - .2), yb + I.h2 * .7, yb + I.h2 * .92, true);
    const t = .42, w = lerp(w0, w1, t) / 2, d = lerp(d0, d1, t) / 2, ch = lerp(ch0, ch1, t), zz = zc - .8 * t;
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) panel(L.solid, 0x5a646c, 1.6, ix + sx * (w - ch / 2 + .1), lerp(yb, yt, t), zz + sz * (d - ch / 2 + .1), Math.atan2(sx, sz), .15, 4);
    for (const g of [1, -1]) digits(L.solid, F.white, cfg.num, { p: [ix + g * (I.w / 2 + .02), fy + I.h1 * .5, iz], n: [g, 0, 0], v: [0, 1, 0] }, I.h1 * .55);
    const parts = cfg.top(L, ix, yt, zc) || [];
    for (let i = 0; i < 4; i++) jet(L, -20 + i, fy, (cfg.ski ? half - 70 : half - 12) - i * 14, -2.2, JET_CN, F.jetCn);
    for (let i = 0; i < 3; i++) jet(L, ix + 12, fy, iz + I.l / 2 + 14 + i * 15, -2.4, JET_CN, F.jetCn);
    for (let i = 0; i < 3; i++) jet(L, -19, fy, -half + 40 + i * 15, -.8, JET_CN, F.jetCn);
    helo(L, -8, fy, -half + 22, .4, F.jetCn);
    flag(L, ix, yt + 16, zc - 2, 1.7);
    return ship(L, o, cfg.name, parts);
  }
  K.define('cv_shandong', { name: 'Shandong aircraft carrier', real: 'Type 002 Shandong (CV-17)', cat: 'sea', role: 'Ski-jump carrier: J-15 fighters launched off the bow ramp, China\'s first home-built carrier', side: 'cn', len: 315, anim: spin(1) }, (K, o) => cnCarrier(o, {
    name: 'cv_shandong', len: 315, num: '17', ski: true,
    deck: [[-15, 157], [15, 157], [19, 124], [20, 70], [34, 58], [38, 40], [36, -40], [30, -110], [26, -144], [22, -157], [-24, -157], [-27, -144], [-28, -72], [-37, -72], [-37, -50], [-29, -50], [-29, -26], [-36, -26], [-36, 26], [-29, 26], [-29, 36], [-37, 36], [-37, 58], [-28, 58], [-26, 110]],
    island: { x: -31.5, z: 0, w: 9.5, l: 46, h1: 10, l2: 30, f2: 2, h2: 11 },
    marks(L, ly) { for (const x of [-6, 6]) flat(L.solid, C.deckLine, .35, 60, x, ly, 80); for (const x of [16]) flat(L.solid, C.deckLine, .35, 60, x, ly, 10, 9 * PI / 180); },
    top(L, x, y, z) {
      loft(L.solid, F.cn, rect(4.4, 5, x, z - 2, 1.2), rect(2.6, 3, x, z - 3, .6), y, y + 10);
      blk(L.solid, F.cn, 8, .35, .7, x, y + 8, z - 2.8); rod(L.metal, F.mesh, [x, y + 13, z - 3.2], [x, y + 19, z - 3.4], .12, 4);
      return [rotor(o, x, y + 10, z - 3, (l) => { add(l.solid, P.box(5.4, 2.4, .9), F.mesh, [0, 1.8, 0], [-.1, 0, 0]); add(l.solid, P.box(.9, .9, .9), F.mesh, [0, .4, 0]); })];
    }
  }));
  K.define('cv_liaoning', { name: 'Liaoning aircraft carrier', real: 'Type 001 Liaoning (CV-16), the rebuilt Varyag', cat: 'sea', role: 'Ski-jump carrier: China\'s first carrier, rebuilt from the Soviet Varyag', side: 'cn', len: 315, anim: spin(1) }, (K, o) => cnCarrier(o, {
    name: 'cv_liaoning', len: 305, num: '16', ski: true,
    deck: [[-15, 157], [15, 157], [19, 124], [20, 70], [34, 58], [38, 40], [36, -40], [30, -110], [26, -144], [22, -157], [-24, -157], [-27, -144], [-28, -72], [-37, -72], [-37, -50], [-29, -50], [-29, -26], [-36, -26], [-36, 26], [-29, 26], [-29, 36], [-37, 36], [-37, 58], [-28, 58], [-26, 110]],
    island: { x: -31.5, z: 0, w: 9.5, l: 46, h1: 10, l2: 30, f2: 2, h2: 11 },
    marks(L, ly) { for (const x of [-6, 6]) flat(L.solid, C.deckLine, .35, 60, x, ly, 80); for (const x of [16]) flat(L.solid, C.deckLine, .35, 60, x, ly, 10, 9 * PI / 180); },
    top(L, x, y, z) {
      loft(L.solid, F.cn, rect(4.4, 5, x, z - 2, 1.2), rect(2.6, 3, x, z - 3, .6), y, y + 10);
      blk(L.solid, F.cn, 8, .35, .7, x, y + 8, z - 2.8); rod(L.metal, F.mesh, [x, y + 13, z - 3.2], [x, y + 19, z - 3.4], .12, 4);
      return [rotor(o, x, y + 10, z - 3, (l) => { add(l.solid, P.box(5.4, 2.4, .9), F.mesh, [0, 1.8, 0], [-.1, 0, 0]); add(l.solid, P.box(.9, .9, .9), F.mesh, [0, .4, 0]); })];
    }
  }));
  K.define('cv_fujian', { name: 'Fujian aircraft carrier', real: 'Type 003 Fujian (CV-18)', cat: 'sea', role: 'Catapult carrier: three electromagnetic catapults, J-35 stealth fighters and KJ-600 radar planes', side: 'cn', len: 316 }, (K, o) => cnCarrier(o, {
    name: 'cv_fujian', len: 316, num: '18',
    deck: [[-12, 158], [10, 158], [17, 135], [18, 62], [30, 52], [40, 40], [38, -30], [33, -110], [24, -150], [20, -158], [-26, -158], [-29, -140], [-29, -96], [-39, -96], [-39, -72], [-29, -72], [-29, -62], [-37.5, -62], [-37.5, -22], [-29, -22], [-29, -10], [-39, -10], [-39, 14], [-29, 14], [-26, 110]],
    island: { x: -33, z: -42, w: 8.6, l: 34, h1: 9, l2: 24, f2: 2, h2: 9 },
    marks(L, ly) { for (const x of [-8, 6]) flat(L.solid, C.deckLine, .35, 92, x, ly, 108, x < 0 ? .015 : -.015); flat(L.solid, C.deckLine, .35, 76, 18, ly, 0, 9 * PI / 180); },
    top(L, x, y, z) {
      loft(L.solid, F.cn, rect(4, 5, x, z - 2, 1.2), rect(2.4, 3, x, z - 3, .6), y, y + 11);
      add(L.solid, P.cyl(1.2, 1.2, 1.8, 8), F.white, [x, y + 12, z - 3]); rod(L.metal, F.mesh, [x, y + 13, z - 3], [x, y + 18, z - 3.2], .12, 4);
      return [];
    }
  }));

  // Type 055: the big destroyer (cruiser-size): a tall integrated forward superstructure and mast, 112 missile cells
  K.define('type055', { name: 'Type 055 destroyer', real: 'Type 055 Renhai class', cat: 'sea', role: 'Large destroyer (cruiser-size): 112 missile cells, YJ-21 anti-ship ballistic missiles, carrier escort', side: 'cn', len: 180 }, (K, o) => {
    const L = K.lists(), c = F.cn;
    const H = hull(L, { len: 180, beam: 20, sheer: [[0, 6], [.5, 7.2], [.8, 8.6], [1, 10.6]], plan: [[0, .8], [.12, .94], [.38, 1], [.6, 1], [.76, .85], [.88, .58], [.96, .24], [1, .02]], flare: .14, rake: 9, col: c, deck: F.cnDeck });
    // forward superstructure, its four big array faces and the integrated mast on top
    const y0 = 7, y1 = 20, zf = 26, db = 34, wb = 18.4, dt = 30, wt = 15;
    loft(L.solid, c, rect(wb, db, 0, zf, 4.4), rect(wt, dt, 0, zf - 1, 3.4), y0, y1);
    loft(L.glass, F.glass, rect(13, .5, 0, zf + dt / 2 - 1.3), rect(12.6, .5, 0, zf + dt / 2 - 1.6), y1 - 3.4, y1 - 2, true);
    loft(L.solid, c, rect(11, 13, 0, 21, 2.6), rect(5.6, 6.4, 0, 19.5, 1.4), y1, 37);
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const t = .58, w = lerp(wb, wt, t) / 2, d = lerp(db, dt, t) / 2, ch = lerp(4.4, 3.4, t);
      panel(L.solid, 0x56606a, 2.3, sx * (w - ch / 2 + .12), lerp(y0, y1, t), zf - t + sz * (d - ch / 2 + .12), Math.atan2(sx, sz), .2, 4);
      panel(L.solid, 0x56606a, 1.1, sx * 3.6, 30, 20 + sz * 4.2, Math.atan2(sx, sz), .18, 4);
    }
    rod(L.metal, F.mesh, [0, 37, 19.4], [0, 42, 19.4], .14, 4); add(L.solid, P.cyl(.9, .9, 1.2, 8), F.white, [0, 37.8, 19.4]);
    // forward VLS 64, the 130 mm gun, the stealthy funnel block, aft superstructure with 48 cells and the hangar
    vls(L.solid, 0, H.top(53) - .1, 53, 8, 8, .95, F.cnDk, 0x7c858c); gunTwin(L.solid, c, 0, H.top(68), 68, 1);
    loft(L.solid, c, rect(14, 34, 0, -11, 2.4), rect(12.6, 32, 0, -11.6, 2), 7, 12.4);
    loft(L.solid, c, rect(9, 13, 0, -6, 2), rect(6.4, 9.6, 0, -7.6, 1.4), 12.4, 21);
    vls(L.solid, 0, H.top(-35) - .1, -35, 8, 6, .95, F.cnDk, 0x7c858c);
    loft(L.solid, c, rect(16, 20, 0, -54, 2.4), rect(14.6, 19, 0, -54.4, 2), 6.4, 13.2);
    add(L.solid, P.cyl(.8, .9, 2, 6), F.cnDk, [0, 14.2, -48]); add(L.solid, P.cyl(.7, .8, 1.6, 6), F.cnDk, [0, 13.4, 9]);
    heloSpot(L.solid, 0, H.top, -74, 5);
    flag(L, 0, 41, 18.6, 1.3); bowNumber(L, H, '101', 72, 3.4);
    return ship(L, o, 'type055');
  });

  // Type 052D: four array faces on the forward block, 130 mm gun, 64 cells (32 fore, 32 aft), one big funnel
  K.define('type052d', { name: 'Type 052D destroyer', real: 'Type 052D Luyang III class', cat: 'sea', role: 'Air-defence destroyer: 64 missile cells, the backbone of Chinese task groups', side: 'cn', len: 157 }, (K, o) => {
    const L = K.lists(), c = F.cn;
    const H = hull(L, { len: 157, beam: 17, sheer: [[0, 5.4], [.5, 6.4], [.8, 7.8], [1, 9.6]], plan: WAR, flare: .12, rake: 8, col: c, deck: F.cnDeck });
    loft(L.solid, c, rect(14.6, 24, 0, 19, 3.2), rect(12, 21, 0, 18.4, 2.6), 6.4, 16);
    loft(L.solid, c, rect(10.6, 12, 0, 22, 2), rect(9.4, 10.6, 0, 21.4, 1.6), 16, 19);
    loft(L.glass, F.glass, rect(9.6, .5, 0, 27.6), rect(9.1, .5, 0, 26.9), 17.3, 18.6, true);
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const t = .55, w = lerp(14.6, 12, t) / 2, d = lerp(24, 21, t) / 2, ch = lerp(3.2, 2.6, t); panel(L.solid, 0x56606a, 1.9, sx * (w - ch / 2 + .12), lerp(6.4, 16, t), 18.6 + sz * (d - ch / 2 + .12), Math.atan2(sx, sz), .25, 4); }
    loft(L.solid, c, rect(4.6, 5, 0, 14, 1.2), rect(2.4, 2.6, 0, 13, .6), 19, 31); blk(L.solid, c, 7, .35, .6, 0, 27, 13.2);
    add(L.solid, P.sphere(1.4, 8, 6), F.white, [0, 32.2, 13]);
    blk(L.solid, c, 12.4, 3.2, 28, 0, 6, -12); blk(L.solid, c, 7, 7.6, 9, 0, 9.2, -5, 6, 7.4, -1); blk(L.solid, F.black, 6, .6, 7.4, 0, 16.8, -6);
    vls(L.solid, 0, H.top(41) - .1, 41, 8, 4, .95, F.cnDk, 0x7c858c); gunDome(L.solid, c, 0, H.top(55), 55, 2, 6);
    vls(L.solid, 0, H.top(-30) - .1, -30, 8, 4, .95, F.cnDk, 0x7c858c);
    blk(L.solid, c, 14, 6.2, 18, 0, 5.6, -46, 13.4, 17.4); canisters(L.solid, F.cnDk, 0, 11.8, -42, 4, .7, 2.6, .25);
    heloSpot(L.solid, 0, H.top, -66, 4.5);
    flag(L, 0, 29, 12.6, 1.1); bowNumber(L, H, '117', 64, 3);
    return ship(L, o, 'type052d');
  });

  // Type 054A frigate: 76 mm gun, 32 cells forward, the rotating 3-D radar on its mast, YJ-83 launchers amidships, hangar
  K.define('type054a', { name: 'Type 054A frigate', real: 'Type 054A Jiangkai II class', cat: 'sea', role: 'General-purpose frigate: anti-submarine and escort, the most numerous Chinese warship', side: 'cn', len: 134, anim: spin(1.3) }, (K, o) => {
    const L = K.lists(), c = F.cn;
    const H = hull(L, { len: 134, beam: 16, sheer: [[0, 5], [.5, 6], [.8, 7.2], [1, 8.8]], plan: WAR, flare: .12, rake: 7, col: c, deck: F.cnDeck });
    loft(L.solid, c, rect(13.4, 22, 0, 14, 2), rect(11.6, 20, 0, 13.4, 1.6), 6, 12.8);
    loft(L.solid, c, rect(10, 10, 0, 18, 1.6), rect(9, 8.8, 0, 17.4, 1.2), 12.8, 15.6);
    loft(L.glass, F.glass, rect(8.6, .5, 0, 22.5), rect(8.2, .5, 0, 21.8), 14, 15.2, true);
    loft(L.solid, c, rect(4, 4.4, 0, 10, 1), rect(2.2, 2.4, 0, 9.4, .5), 15.6, 26); blk(L.solid, c, 6, .35, .6, 0, 23, 9.6);
    for (const g of [1, -1]) canisters(L.solid, F.cnDk, g * 3, 6.2, -2, 4, .8, 5.6, .3, g * .5);
    blk(L.solid, c, 6.4, 7, 8, 0, 6, -12, 5.4, 7, -1); blk(L.solid, F.black, 5.4, .5, 7, 0, 13, -13);
    vls(L.solid, 0, H.top(34) - .1, 34, 8, 4, .9, F.cnDk, 0x7c858c); gunDome(L.solid, c, 0, H.top(46), 46, 1.6, 4.4);
    blk(L.solid, c, 13.4, 6, 17, 0, 5.4, -32, 12.8, 16.4); add(L.solid, P.cyl(.9, 1, 2, 6), F.cnDk, [0, 12.4, -27]);
    heloSpot(L.solid, 0, H.top, -54, 4.2);
    flag(L, 0, 26.5, 9.2, 1); bowNumber(L, H, '575', 54, 2.8);
    return ship(L, o, 'type054a', [rotor(o, 0, 26.2, 9.6, (l) => bedstead(l, 5, 2, F.mesh))]);
  });

  // big-deck amphibs (China): Type 075 and Type 076, both with two islands
  function cnDeck(o, cfg) {
    const L = K.lists(), c = F.cn, fy = cfg.fy, half = cfg.len / 2;
    hull(L, { len: cfg.len - 6, beam: cfg.beam, z0: -half, sheer: [[0, fy - 1.6], [1, fy - 1.2]], plan: AMPHIB_PLAN, flare: .04, flareShape: .3, rake: cfg.rake, sover: 2, col: c, deck: c, bt: .5, n: 14 });
    fdeck(L, cfg.deck, fy, 1.6, 0x3d4247);
    const ly = fy + .02;
    flat(L.solid, C.deckLine, .45, cfg.len * .88, cfg.lineX || 0, ly, 0);
    for (let i = 0; i < 5; i++) heloSpot(L.solid, cfg.spotX, ly, half * .72 - i * cfg.len * .16, 4.6);
    deckNum(L.solid, cfg.num, cfg.lineX || 0, ly, half * .86, 10);
    for (const I of cfg.islands) {
      blk(L.solid, c, I.w, I.h1, I.l, I.x, fy, I.z);
      loft(L.solid, c, rect(I.w - .6, I.l - 6, I.x, I.z, 2), rect(I.w - 1.6, I.l - 9, I.x, I.z - .6, 1.4), fy + I.h1, fy + I.h1 + I.h2);
      if (I.glass) loft(L.glass, F.glass, rect(I.w - 4, .5, I.x, I.z + (I.l - 6) / 2 + .05), rect(I.w - 4.6, .5, I.x, I.z + (I.l - 9) / 2 - .3), fy + I.h1 + I.h2 * .55, fy + I.h1 + I.h2 * .85, true);
      if (I.mast) { loft(L.solid, c, rect(4.4, 6, I.x, I.z - 1, 1.2), rect(2.4, 3, I.x, I.z - 2, .6), fy + I.h1 + I.h2, fy + I.h1 + I.h2 + I.mast); add(L.solid, P.cyl(1.2, 1.2, 1.6, 8), F.white, [I.x, fy + I.h1 + I.h2 + I.mast + .8, I.z - 2]); }
      for (const [sx, sz] of [[1, 1], [-1, 1]]) panel(L.solid, 0x5a646c, 1.4, I.x + sx * (I.w / 2 - .9), fy + I.h1 + I.h2 * .45, I.z + sz * (I.l - 7) / 2, Math.atan2(sx, sz), .15, 4);
    }
    for (const g of [1, -1]) digits(L.solid, F.white, cfg.num, { p: [cfg.islands[0].x + g * (cfg.islands[0].w / 2 + .02), fy + cfg.islands[0].h1 * .5, cfg.islands[0].z], n: [g, 0, 0], v: [0, 1, 0] }, cfg.islands[0].h1 * .55);
    cfg.air(L, fy);
    flag(L, cfg.islands[0].x, fy + cfg.islands[0].h1 + cfg.islands[0].h2 + (cfg.islands[0].mast || 0) + 3, cfg.islands[0].z - 3, 1.5);
    return ship(L, o, cfg.name);
  }
  K.define('type075', { name: 'Type 075 amphibious assault ship', real: 'Type 075 Yushen class LHD', cat: 'sea', role: 'Amphibious assault ship: about 30 helicopters, landing craft and 1,000 troops: the Taiwan landing force', side: 'cn', len: 237 }, (K, o) => cnDeck(o, {
    name: 'type075', len: 237, beam: 36, fy: 19, rake: 14, num: '31', spotX: 8,
    deck: [[-9, 118], [9, 118], [19, 88], [21, -118], [-21, -118], [-21, -30], [-26, -30], [-26, 40], [-21, 40], [-19, 88]],
    islands: [{ x: -21, z: 22, w: 9, l: 30, h1: 9, h2: 7, glass: 1, mast: 12 }, { x: -21, z: -14, w: 9, l: 24, h1: 9, h2: 5 }],
    air(L, fy) { for (let i = 0; i < 4; i++) helo(L, -8, fy, 90 - i * 18, -2.2, F.jetCn, 1.2); for (let i = 0; i < 3; i++) helo(L, 8, fy, -50 - i * 22, PI * .5, F.jetCn, 1.2); }
  }));
  K.define('type076', { name: 'Type 076 amphibious assault ship', real: 'Type 076 Sichuan (51) LHD', cat: 'sea', role: 'Catapult-equipped amphibious ship: drones and helicopters off an electromagnetic catapult', side: 'cn', len: 263 }, (K, o) => cnDeck(o, {
    name: 'type076', len: 263, beam: 42, fy: 21, rake: 15, num: '51', spotX: 10, lineX: 4,
    deck: [[-12, 131], [12, 131], [24, 96], [26, -131], [-26, -131], [-26, -40], [-30, -40], [-30, 50], [-26, 50], [-24, 96]],
    islands: [{ x: -24, z: 30, w: 10, l: 32, h1: 10, h2: 8, glass: 1, mast: 14 }, { x: -24, z: -18, w: 10, l: 30, h1: 10, h2: 7 }],
    air(L, fy) {
      flat(L.solid, C.deckLine, .4, 100, 12, fy + .03, 70, -.02);
      for (let i = 0; i < 4; i++) jet(L, -10, fy, 100 - i * 13, -2.2, DRONE, 0x9aa2a8, 1.4);
      for (let i = 0; i < 3; i++) helo(L, 10, fy, -50 - i * 24, PI * .5, F.jetCn, 1.2);
    }
  }));

  // Type 071 LPD: a long high superstructure forward of a flight deck and hangar, 76 mm gun on the bow
  K.define('type071', { name: 'Type 071 amphibious transport dock', real: 'Type 071 Yuzhao class LPD', cat: 'sea', role: 'Amphibious transport dock: hovercraft in a well deck, 800 troops, armoured vehicles', side: 'cn', len: 210 }, (K, o) => {
    const L = K.lists(), c = F.cn;
    const H = hull(L, { len: 210, beam: 28, sheer: [[0, 9.6], [.6, 10.2], [.85, 12.8], [1, 14.6]], plan: [[0, .92], [.1, .99], [.4, 1], [.65, .97], [.8, .78], [.92, .45], [1, .03]], flare: .06, rake: 12, col: c, deck: F.cnDeck });
    loft(L.solid, c, rect(26, 92, 0, 8, 3), rect(24, 88, 0, 7, 2.4), 10, 19);
    loft(L.solid, c, rect(20, 24, 0, 40, 2.4), rect(17, 21, 0, 39, 1.8), 19, 25);
    loft(L.glass, F.glass, rect(15, .5, 0, 51.6), rect(14.2, .5, 0, 50.8), 22.4, 24.2, true);
    loft(L.solid, c, rect(5, 6, 0, 35, 1.2), rect(2.6, 3, 0, 34, .6), 25, 38); add(L.solid, P.sphere(1.5, 8, 6), F.white, [0, 39.2, 34]);
    blk(L.solid, c, 8, 6, 9, 0, 19, 4, 6.6, 8, -1); blk(L.solid, F.black, 6.6, .5, 8, 0, 25, 3);
    for (const z of [-62, -84]) heloSpot(L.solid, 0, H.top, z, 5.4); flat(L.solid, C.deckLine, .4, 50, 0, H.top(-74) + .1, -74);
    gunDome(L.solid, c, 0, H.top(76), 76, 1.6, 4.4);
    blk(L.solid, F.mesh, 14, 6.5, .3, 0, .4, -103.3); helo(L, 0, H.top(-62) + .05, -62, 0, F.jetCn, 1.2);
    flag(L, 0, 39, 33.4, 1.3); bowNumber(L, H, '998', 88, 4.2);
    return ship(L, o, 'type071');
  });

  // Type 093 nuclear attack submarine (093A/B: the hump aft of the sail)
  K.define('type093', { name: 'Type 093 attack submarine', real: 'Type 093A/B Shang class', cat: 'sea', role: 'Nuclear attack submarine: hunts carriers and submarines, YJ-18 cruise missiles', side: 'cn', len: 110 }, (K, o) => {
    const L = K.lists(), c = F.sub;
    const S = subBody(L, { len: 110, r: 5.4, sink: 3.9, prof: SUB_PROF, col: c, fin: -52 });
    sail(L.solid, c, 27, 11, 3, S.top(27) - .3, 6.8, .4);
    for (const g of [1, -1]) add(L.solid, P.box(3.6, .32, 2.2), c, [g * 3.2, S.top(27) + 4.4, 28]);
    const hy = S.top(0); loft(L.solid, c, rect(5.6, 22, 0, 6, 2), rect(4, 19, 0, 6, 1.4), hy - .5, hy + 1.2);
    fin(L.solid, c, 0, -.4, -52, 4.4, 4, .5);
    rod(L.metal, F.mesh, [0, S.top(27) + 6.4, 28], [0, S.top(27) + 8.6, 28], .18, 4);
    add(L.team, P.box(.08, 1, 1.5), null, [0, S.top(27) + 8.2, 27.2]);
    return ship(L, o, 'type093');
  });

  // a large ro-ro passenger ferry of the kind the PLA trains to use as invasion lift
  K.define('roro', { name: 'Ro-ro ferry (invasion lift)', real: 'Bohai-class 30,000 t ro-ro passenger ferry (civilian, PLA-requisitioned)', cat: 'sea', role: 'Civilian ferry drafted to carry tanks and troops across the Taiwan Strait: drives vehicles on and off', side: 'cn', len: 178 }, (K, o) => {
    const L = K.lists(), w = F.white, blue = 0x1f4f9a;
    const H = hull(L, { len: 178, beam: 28, sheer: [[0, 9], [1, 10.4]], plan: [[0, .9], [.08, .99], [.2, 1], [.78, 1], [.9, .8], [.97, .4], [1, .06]], flare: .03, rake: 10, sover: 3, col: w, deck: 0x8a9094, bt: 1.4, boot: blue });
    for (const g of [1, -1]) { const fr = H.frame(0, .38, g); add(L.solid, P.box(.08, 1.2, 150), blue, [fr.p[0] + g * .05, fr.p[1], 0]); }
    loft(L.solid, w, rect(27.6, 150, 0, -6, 6), rect(27, 146, 0, -7.4, 5), 10, 24);
    for (const y of [13, 16.6, 20.2]) for (const g of [1, -1]) add(L.glass, P.box(.1, 1, 134), F.glass, [g * 13.85, y, -6]);
    loft(L.solid, w, rect(25, 40, 0, 44, 5), rect(23, 36, 0, 42, 4), 24, 30);
    loft(L.glass, F.glass, rect(18, .5, 0, 63.6), rect(16.6, .5, 0, 62.6), 26.4, 29, true);
    blk(L.solid, w, 30, .5, 5, 0, 29.5, 58);
    for (const g of [1, -1]) { blk(L.solid, w, 3.6, 9, 9, g * 6, 24, -58, 3, 7.6, -1.4); blk(L.solid, 0xc8102e, 3.2, 1.2, 7.8, g * 6, 31, -59.2); blk(L.solid, F.black, 3, .7, 7.6, g * 6, 32.4, -59.6); }
    blk(L.solid, 0x6d7377, 14, 7, .5, 0, 1.6, -89.1);
    rod(L.solid, w, [0, 30, 40], [0, 38, 38], .35, 4);
    flag(L, 0, 37, 37.6, 1.3); flag(L, 0, 24, -80, 1.2);
    return ship(L, o, 'roro');
  });

  // China Coast Guard cutter: white with the coast guard's red and blue slash; a 76 mm gun
  K.define('cg_china', { name: 'China Coast Guard cutter', real: 'Type 818 Zhaotou-class cutter (China Coast Guard)', cat: 'sea', role: 'Coast guard cutter: water cannon, boarding and blockade enforcement around Taiwan and the South China Sea', side: 'cn', len: 128 }, (K, o) => {
    const L = K.lists(), c = F.white;
    const H = hull(L, { len: 128, beam: 16, sheer: [[0, 5], [.5, 6], [.8, 7.2], [1, 8.8]], plan: WAR, flare: .12, rake: 7, col: c, deck: 0x9aa0a4, boot: 0x2c3e60 });
    // the slash: a broad red band and a narrow blue band, raked, on both bows
    hullBand(L.solid, 0xc8102e, H, 33, 3.6, 2.6, .12, .96); hullBand(L.solid, 0x1f4f9a, H, 29.4, 1.3, 2.6, .12, .96);
    loft(L.solid, c, rect(13, 32, 0, 6, 2), rect(11.6, 30, 0, 5.2, 1.6), 6, 12.6);
    loft(L.solid, c, rect(10, 11, 0, 14, 1.6), rect(9, 10, 0, 13.4, 1.2), 12.6, 15.4);
    loft(L.glass, F.glass, rect(8.6, .5, 0, 19.5), rect(8.2, .5, 0, 18.9), 14, 15.2, true);
    lattice(L.solid, c, 0, 15.4, 9, 26, 2.6, .8, .6); rod(L.metal, F.mesh, [0, 26, 8.4], [0, 29, 8.4], .1, 4); add(L.solid, P.sphere(1.2, 8, 6), c, [0, 16.8, 3]);
    blk(L.solid, c, 6, 6.4, 7, 0, 12.6, -6, 5.2, 6.4, -1); blk(L.solid, F.black, 5.2, .5, 6.4, 0, 19, -7);
    for (const g of [1, -1]) add(L.solid, P.cyl(.35, .45, 1.2, 6), 0x8a9094, [g * 4, 13.2, 12]);
    gunDome(L.solid, c, 0, H.top(44), 44, 1.5, 4.2);
    heloSpot(L.solid, 0, H.top, -50, 4.4); blk(L.solid, c, 12.6, 5.6, 14, 0, 5.4, -34);
    flag(L, 0, 29, 8.2, 1); bowNumber(L, H, '2502', 50, 2.4, 0x1f2a44);
    return ship(L, o, 'cg_china');
  });

  // maritime militia trawler: a big steel fishing vessel, bridge forward, working deck and gantry aft
  K.define('militia', { name: 'Maritime militia trawler', real: 'People\'s Armed Forces Maritime Militia steel-hulled trawler', cat: 'sea', role: 'Maritime militia: fishing-boat swarms that crowd, ram and block, the grey zone around Taiwan and reefs', side: 'cn', len: 52 }, (K, o) => {
    const L = K.lists(), hc = 0x34506e, w = F.white;
    const H = hull(L, { len: 52, beam: 9, sheer: [[0, 3.2], [.55, 3.2], [.6, 4.6], [1, 5.6]], plan: [[0, .82], [.2, .97], [.55, 1], [.8, .8], [.94, .4], [1, .04]], flare: .1, rake: 3, col: hc, deck: 0x6f6a5c, bt: .35, boot: 0x7a2e26 });
    blk(L.solid, w, 7, 3, 12, 0, 4.4, 9); blk(L.solid, w, 6, 2.4, 6, 0, 7.4, 11, 5.6, 5.6, -.2); loft(L.glass, F.glass, rect(5.6, .3, 0, 14.05), rect(5.3, .3, 0, 13.7), 8.2, 9.4, true);
    rod(L.solid, w, [0, 9.8, 10], [0, 16, 9.6], .15, 4); blk(L.solid, w, 3.6, .2, .3, 0, 14, 9.7); add(L.solid, P.cyl(.5, .5, .4, 8), w, [0, 10.2, 12]);
    rod(L.solid, 0xd9a640, [3.4, 3.2, -20], [2.6, 9, -22], .2, 4); rod(L.solid, 0xd9a640, [-3.4, 3.2, -20], [-2.6, 9, -22], .2, 4); rod(L.solid, 0xd9a640, [2.6, 9, -22], [-2.6, 9, -22], .2, 4);
    rod(L.solid, w, [0, 3.2, -4], [0, 12, -4], .18, 4); rod(L.metal, F.mesh, [0, 10, -4], [3.5, 6, -14], .07, 3); rod(L.metal, F.mesh, [0, 10, -4], [-3.5, 6, -14], .07, 3);
    add(L.solid, P.cyl(.9, .9, 2.2, 8), F.mesh, [0, 4.4, -16], [0, 0, H2]);
    bowNumber(L, H, '16', 20, 1.6);
    flag(L, 0, 16, 9.4, .7);
    return ship(L, o, 'militia');
  });

  // =====================================================================================================================
  // TAIWAN
  // =====================================================================================================================

  // Kang Ding (La Fayette): the stealth frigate: sloped clad sides, a big pyramid foremast, enclosed forecastle
  K.define('kangding', { name: 'Kang Ding-class frigate', real: 'Kang Ding class (La Fayette type)', cat: 'sea', role: 'Stealth frigate: Hsiung Feng II anti-ship missiles, anti-submarine helicopter', side: 'tw', len: 125, anim: spin(1.2) }, (K, o) => {
    const L = K.lists(), c = F.tw;
    const H = hull(L, { len: 125, beam: 15.4, sheer: [[0, 5.2], [.5, 6.2], [.8, 7.4], [1, 9]], plan: WAR, flare: -.06, flareShape: .5, rake: 6, col: c, deck: F.twDeck });
    loft(L.solid, c, rect(15, 70, 0, 2, 3), rect(12.4, 66, 0, 1, 2.2), 6, 12.4);
    loft(L.solid, c, rect(11, 12, 0, 22, 2), rect(9.6, 10, 0, 21.4, 1.6), 12.4, 15.4);
    loft(L.glass, F.glass, rect(8.6, .5, 0, 27.3), rect(8.2, .5, 0, 26.5), 13.8, 15, true);
    loft(L.solid, c, rect(8, 8, 0, 15, 2.4), rect(3, 3, 0, 13.5, .9), 15.4, 29);
    loft(L.solid, c, rect(6, 7, 0, -10, 2), rect(2.6, 3, 0, -11, .8), 12.4, 23);
    loft(L.solid, c, rect(7, 6, 0, 2, 1.4), rect(5.6, 4.6, 0, 1.4, 1), 12.4, 16);
    for (const g of [1, -1]) canisters(L.solid, 0x6f7a80, g * 2.4, 12.4, -1, 2, .8, 5, .3, g * .4);
    gunDome(L.solid, c, 0, H.top(42), 42, 1.4, 3.8);
    heloSpot(L.solid, 0, H.top, -50, 4.4);
    flag(L, 0, 29, 13.2, 1); bowNumber(L, H, '1202', 50, 2.4);
    return ship(L, o, 'kangding', [rotor(o, 0, 29, 13.4, (l) => bedstead(l, 4.6, 1.6, F.mesh))]);
  });

  // Cheng Kung (Perry): the tall slab superstructure, single-arm launcher on the bow, 76 mm amidships, twin hangars
  K.define('chengkung', { name: 'Cheng Kung-class frigate', real: 'Cheng Kung class (Oliver Hazard Perry type)', cat: 'sea', role: 'Guided-missile frigate: Standard SM-1 missiles from the bow launcher, Hsiung Feng missiles', side: 'tw', len: 138, anim: spin(1.2) }, (K, o) => {
    const L = K.lists(), c = F.tw;
    const H = hull(L, { len: 138, beam: 14.3, sheer: [[0, 5], [.6, 6], [.85, 7], [1, 8.4]], plan: WAR, flare: .08, rake: 6, col: c, deck: F.twDeck });
    blk(L.solid, c, 13, 6.4, 68, 0, 5.8, -6, 12.6, 67.4);
    blk(L.solid, c, 10, 3.6, 16, 0, 12.2, 19, 9.6, 15.4); loft(L.glass, F.glass, rect(9.6, .5, 0, 26.8), rect(9.2, .5, 0, 26.6), 13.8, 15, true);
    lattice(L.solid, c, 0, 15.8, 20, 26, 2.6, 1, .6); add(L.solid, P.sphere(1.3, 8, 6), F.white, [0, 27.3, 19.4]);
    lattice(L.solid, c, 0, 12.2, 4, 24, 3.4, 1.2, .6);
    blk(L.solid, c, 4.4, 6.4, 6.4, 0, 12.2, -6, 3.8, 5.6, -.8); blk(L.solid, F.black, 3.8, .5, 5.6, 0, 18.6, -6.8);
    gunDome(L.solid, c, 0, 12.2, -14, 1.4, 3.6);
    add(L.solid, P.cyl(1.6, 1.8, 1.6, 8), c, [0, H.top(44) + .8, 44]); add(L.solid, P.box(.9, .9, 4.8), F.white, [0, H.top(44) + 2.4, 45.2], [-.2, 0, 0]);
    for (const g of [1, -1]) canisters(L.solid, 0x6f7a80, g * 3.2, 12.2, -24, 2, .8, 5, .3, g * .4);
    ciws(L, 0, 12.2, -36, 1.1);
    heloSpot(L.solid, 0, H.top, -56, 4.6);
    flag(L, 0, 26, 19, 1); bowNumber(L, H, '1101', 56, 2.4);
    return ship(L, o, 'chengkung', [rotor(o, 0, 24, 3.4, (l) => bedstead(l, 6, 2.2, F.mesh))]);
  });

  // Tuo Chiang: the stealth catamaran corvette packed with anti-ship missiles amidships
  K.define('tuochiang', { name: 'Tuo Chiang-class corvette', real: 'Tuo Chiang class (catamaran corvette)', cat: 'sea', role: 'Stealth catamaran "carrier killer": 8 Hsiung Feng II and 8 supersonic Hsiung Feng III missiles', side: 'tw', len: 60.4 }, (K, o) => {
    const L = K.lists(), c = F.tw;
    for (const g of [1, -1]) hull(L, { len: 58, beam: 3.6, z0: -30.2, x0: g * 5, sheer: [[0, 2.8], [1, 4.4]], plan: [[0, .8], [.2, 1], [.7, 1], [.9, .6], [1, .05]], flare: -.05, rake: -2.4, sover: .2, col: c, deck: c, bt: .2, n: 10 });
    loft(L.solid, c, [[-6.6, -30], [6.6, -30], [6.6, 14], [2.8, 26], [-2.8, 26], [-6.6, 14]], [[-7, -30.2], [7, -30.2], [7, 15], [3, 27], [-3, 27], [-7, 15]], 2.2, 5.2);
    loft(L.solid, c, rect(12.6, 30, 0, 2, 3), rect(10.4, 26, 0, .8, 2.2), 5.2, 9.6);
    loft(L.glass, F.glass, rect(7.4, .4, 0, 13.8), rect(6.8, .4, 0, 13), 8, 9.2, true);
    loft(L.solid, c, rect(5, 6, 0, 6, 1.2), rect(2, 2.4, 0, 5, .5), 9.6, 17.4); rod(L.metal, F.mesh, [0, 17.4, 5], [0, 20, 5], .07, 4);
    for (const g of [1, -1]) for (let i = 0; i < 2; i++) canisters(L.solid, 0x6f7a80, g * (2.4 + i * 2), 9.6, -6, 2, .8, 5.4, .3, g * .45);
    gunDome(L.solid, c, 0, 5.2, 20, .9, 2.6);
    heloSpot(L.solid, 0, 5.22, -22, 3.6);
    for (const g of [1, -1]) digits(L.solid, F.white, '618', { p: [g * 7.02, 3.8, 10], n: [g, 0, 0], v: [0, 1, 0] }, 1.6);
    flag(L, 0, 19.6, 4.6, .7);
    return ship(L, o, 'tuochiang');
  });

  // Hai Kun: Taiwan's own submarine, with the X-form stern planes
  K.define('haikun', { name: 'Hai Kun-class submarine', real: 'Hai Kun class (Indigenous Defense Submarine)', cat: 'sea', role: 'Diesel-electric attack submarine: Mk 48 torpedoes, denies the Taiwan Strait to an invasion fleet', side: 'tw', len: 70 }, (K, o) => {
    const L = K.lists(), c = F.sub;
    const S = subBody(L, { len: 70, r: 4, sink: 2.8, prof: SUB_PROF, col: c, fin: -32 });
    sail(L.solid, c, 14, 8, 2.2, S.top(14) - .3, 5, .3);
    for (const g of [1, -1]) fin(L.solid, c, g * .6, -.3, -32, 3.8, 3, .4, -g * PI / 4);
    rod(L.metal, F.mesh, [0, S.top(14) + 4.7, 14.6], [0, S.top(14) + 6.6, 14.6], .15, 4);
    add(L.team, P.box(.06, .8, 1.3), null, [0, S.top(14) + 6.2, 14]);
    return ship(L, o, 'haikun');
  });

  // =====================================================================================================================
  // RUSSIA
  // =====================================================================================================================

  // Admiral Grigorovich (Project 11356): 100 mm gun, Shtil and Kalibr cells, the pyramid mast with the Fregat radar
  K.define('grigorovich', { name: 'Admiral Grigorovich-class frigate', real: 'Project 11356R Admiral Grigorovich class', cat: 'sea', role: 'Frigate: Kalibr cruise missiles that strike Ukrainian cities, Shtil air defence', side: 'ru', len: 125, anim: spin(1.2) }, (K, o) => {
    const L = K.lists(), c = F.ru;
    const H = hull(L, { len: 125, beam: 15.2, sheer: [[0, 5], [.5, 6], [.8, 7.4], [1, 9.2]], plan: WAR, flare: .12, rake: 7, col: c, deck: F.ruDeck });
    loft(L.solid, c, rect(13, 22, 0, 16, 2), rect(11.4, 20, 0, 15.4, 1.6), 6.2, 12.4);
    loft(L.solid, c, rect(10, 10, 0, 21, 1.6), rect(9, 8.8, 0, 20.4, 1.2), 12.4, 15.4); loft(L.glass, F.glass, rect(8.6, .5, 0, 25.6), rect(8.2, .5, 0, 24.8), 13.8, 15, true);
    loft(L.solid, c, rect(7, 8, 0, 12, 2), rect(2.8, 3, 0, 10.4, .8), 12.4, 27); blk(L.solid, c, 7, .35, .6, 0, 22, 11.4);
    add(L.solid, P.sphere(1, 8, 6), F.white, [3, 15.8, 16]); add(L.solid, P.sphere(1, 8, 6), F.white, [-3, 15.8, 16]);
    blk(L.solid, c, 10, 3.4, 28, 0, 6, -10); blk(L.solid, c, 5.6, 6.6, 8, 0, 9.2, -6, 4.6, 7, -1.2); blk(L.solid, F.black, 4.6, .5, 7, 0, 15.8, -7.2);
    loft(L.solid, c, rect(4.4, 5, 0, -18, 1), rect(2.4, 2.6, 0, -18.6, .5), 9.4, 18); add(L.solid, P.sphere(1, 8, 6), F.white, [0, 18.8, -18.6]);
    vls(L.solid, 0, H.top(36) - .1, 36, 4, 2, 1.2, F.ruDk, 0x59656c); add(L.solid, P.cyl(2.6, 2.6, .5, 12), F.ruDk, [0, H.top(43) + .25, 43]);
    gunDome(L.solid, c, 0, H.top(51), 51, 1.8, 4.6);
    blk(L.solid, c, 13, 5.6, 14, 0, 5.4, -33, 12.4, 13.4); heloSpot(L.solid, 0, H.top, -50, 4.3);
    for (const g of [1, -1]) add(L.solid, P.cyl(.8, .9, 1.4, 6), F.ruDk, [g * 4.2, 11.7, -28]);
    flag(L, 0, 22.4, 10.6, 1); bowNumber(L, H, '745', 48, 2.6, F.white, .62);
    return ship(L, o, 'grigorovich', [rotor(o, 0, 27, 10.6, (l) => { add(l.solid, P.box(5, 1.6, .4), F.mesh, [-.1, 1.4, 1.2], [-.2, 0, 0]); add(l.solid, P.box(5, 1.6, .4), F.mesh, [.1, 1.4, -1.2], [.2, PI, 0]); add(l.solid, P.box(.8, 1, .8), F.mesh, [0, .5, 0]); })]);
  });

  // Karakurt (Project 22800): the small missile corvette: 76 mm gun, eight Kalibr cells, Pantsir-M aft
  K.define('karakurt', { name: 'Karakurt-class corvette', real: 'Project 22800 Karakurt class', cat: 'sea', role: 'Small missile ship: eight Kalibr or Oniks missiles, a target for Ukraine\'s naval drones', side: 'ru', len: 67 }, (K, o) => {
    const L = K.lists(), c = F.ru;
    const H = hull(L, { len: 67, beam: 11, sheer: [[0, 3.8], [.5, 4.4], [.8, 5.2], [1, 6.4]], plan: WAR, flare: .14, rake: 4, col: c, deck: F.ruDeck });
    loft(L.solid, c, rect(9.8, 22, 0, 3, 1.8), rect(8.4, 20, 0, 2.2, 1.4), 4.4, 9);
    loft(L.glass, F.glass, rect(6.8, .4, 0, 12.6), rect(6.4, .4, 0, 11.8), 7.4, 8.6, true);
    loft(L.solid, c, rect(5.6, 6, 0, 4, 1.4), rect(2.2, 2.4, 0, 3, .6), 9, 19.6); add(L.solid, P.sphere(.9, 8, 6), F.white, [0, 20.2, 3]);
    for (const [yaw, dx, dz] of [[0, 0, 1], [PI, 0, -1], [H2, 1, 0], [-H2, -1, 0]]) panel(L.solid, 0x55606a, .8, dx * 1.9, 13.4, 3.6 + dz * 2.1, yaw, .2, 4);
    vls(L.solid, 0, H.top(18) - .1, 18, 4, 2, 1.2, F.ruDk, 0x59656c);
    gunDome(L.solid, c, 0, H.top(25), 25, 1.3, 3.4);
    blk(L.solid, c, 6.4, 2.4, 6, 0, 4.2, -14); add(L.solid, P.box(2.4, 1.4, 2.4), c, [0, 7.3, -14]); for (const g of [1, -1]) canisters(L.solid, F.ruDk, g * 1.8, 6.8, -14, 2, .45, 2.6, .3);
    add(L.solid, P.sphere(.7, 8, 6), F.white, [0, 8.6, -14]);
    flag(L, 0, 19.6, 2.6, .7); bowNumber(L, H, '630', 25, 1.7, F.white, .62);
    return ship(L, o, 'karakurt');
  });

  // Ropucha (Project 775): the landing ship: long tank deck forward with bow doors, the superstructure well aft
  K.define('ropucha', { name: 'Ropucha-class landing ship', real: 'Project 775 Ropucha class', cat: 'sea', role: 'Landing ship: tanks and marines over the beach through bow doors; several sunk off Crimea', side: 'ru', len: 112.5, anim: spin(1.3) }, (K, o) => {
    const L = K.lists(), c = F.ru;
    const H = hull(L, { len: 112.5, beam: 15, sheer: [[0, 6.6], [.3, 6.8], [.85, 7.6], [1, 9.4]], plan: [[0, .9], [.12, .99], [.4, 1], [.78, .96], [.9, .7], [.97, .32], [1, .06]], flare: .06, rake: 6, col: c, deck: F.ruDeck });
    blk(L.solid, c, 12.6, 5.6, 26, 0, 6.6, -22, 12, 25.4);
    blk(L.solid, c, 10, 3, 12, 0, 12.2, -16, 9.4, 11.4); loft(L.glass, F.glass, rect(9.4, .5, 0, -10.2), rect(9, .5, 0, -10.5), 13.4, 14.8, true);
    lattice(L.solid, c, 0, 15.2, -14, 25, 2.8, .8, .4); blk(L.solid, c, 6, .3, .5, 0, 22, -14.2);
    blk(L.solid, c, 4, 6, 6, 0, 12.2, -27, 3.4, 5.4, -.8); blk(L.solid, F.black, 3.4, .5, 5.4, 0, 18.2, -27.8);
    for (const z of [-4, -36]) for (const g of [1, -1]) gunTwin(L.solid, c, g * 3.6, H.top(z) + (z < -30 ? 5.6 : 0), z, .55, true);
    flat(L.solid, F.ruDk, 8, 22, 0, H.top(25) + .1, 25);
    canisters(L.solid, F.ruDk, 0, H.top(44), 44, 4, .5, 3, .6);
    flag(L, 0, 25, -14.4, 1); bowNumber(L, H, '151', 40, 2.6, F.white, .62);
    return ship(L, o, 'ropucha', [rotor(o, 0, 25, -14.4, (l) => bedstead(l, 3.6, 1.2, F.mesh))]);
  });

  // Slava (Project 1164), the class of the Moskva: eight pairs of huge Bazalt/Vulkan tubes flanking the forward superstructure
  K.define('slava', { name: 'Slava-class cruiser', real: 'Project 1164 Atlant (Slava class; Moskva sunk April 2022)', cat: 'sea', role: 'Missile cruiser: 16 giant anti-ship missiles, S-300F air defence; the Moskva was sunk by two Neptune missiles', side: 'ru', len: 186, anim: spin(1) }, (K, o) => {
    const L = K.lists(), c = F.ru;
    const H = hull(L, { len: 186, beam: 20.8, sheer: [[0, 6.6], [.4, 7.4], [.8, 8.6], [1, 10.6]], plan: WAR, flare: .12, rake: 9, col: c, deck: F.ruDeck });
    // the superstructure: a towering block, the big mast with the rotating air-search, the uptakes
    blk(L.solid, c, 14, 7, 20, 0, 7.6, 4, 13.4, 19); blk(L.solid, c, 9.6, 7, 28, 0, 7.6, 28, 9, 27.4);
    blk(L.solid, c, 11, 8, 18, 0, 14.6, 30, 10, 16.4, -.6); loft(L.glass, F.glass, rect(10.4, .5, 0, 39.2), rect(9.6, .5, 0, 38.4), 19.4, 21, true);
    loft(L.solid, c, rect(9, 10, 0, 22, 2), rect(3.4, 3.6, 0, 20, 1), 22.6, 38); blk(L.solid, c, 9, .4, .7, 0, 33, 20.6);
    for (const g of [1, -1]) blk(L.solid, c, 4.6, 9, 9, g * 3, 14.6, 4, 4, 8, -1); for (const g of [1, -1]) blk(L.solid, F.black, 4, .6, 8, g * 3, 23.6, 3);
    blk(L.solid, c, 12, 6, 30, 0, 7.6, -20);
    loft(L.solid, c, rect(5, 6, 0, -14, 1.2), rect(2.6, 3, 0, -15, .6), 13.6, 30); add(L.solid, P.sphere(2.2, 10, 7), F.white, [0, 31, -15]);
    // the sixteen anti-ship missile tubes, in pairs, raised toward the bow
    for (const g of [1, -1]) for (let i = 0; i < 4; i++) { const tz = 36 - i * 6.4; for (const k of [0, 1]) { const t = P.cyl(1.25, 1.25, 12, 8); t.rotateX(H2 - .16); add(L.solid, t, 0x8d999f, [g * (6.3 + k * 2.6), 9.4 + k * .5 + i * .35, tz]); } }
    // forward the twin 130 mm turret; aft the eight S-300F revolver hatches, then the hangar and helicopter deck
    gunTwin(L.solid, c, 0, H.top(66), 66, 1.1, true);
    for (let i = 0; i < 8; i++) add(L.solid, P.cyl(1.5, 1.5, .4, 10), F.ruDk, [(i % 2 ? 2.4 : -2.4), H.top(-50) + .2, -42 - Math.floor(i / 2) * 4]);
    blk(L.solid, c, 12, 5, 12, 0, 6.8, -62); heloSpot(L.solid, 0, H.top, -80, 4.6);
    for (const g of [1, -1]) add(L.solid, P.cyl(.8, .9, 1.4, 6), F.ruDk, [g * 5.2, 15.3, -6]);
    flag(L, 0, 38.4, 19.4, 1.3); bowNumber(L, H, '121', 72, 3.2, F.white, .62);
    return ship(L, o, 'slava', [rotor(o, 0, 38, 20, (l) => { add(l.solid, P.box(7.2, 2.2, .5), F.mesh, [0, 1.8, .8], [-.2, 0, 0]); add(l.solid, P.box(7.2, 2.2, .5), F.mesh, [0, 1.8, -.8], [.2, 0, 0]); add(l.solid, P.box(1, 1.4, 1), F.mesh, [0, .7, 0]); })]);
  });

  // =====================================================================================================================
  // UKRAINE
  // =====================================================================================================================

  // Magura V5: the naval drone that sank Russian warships in the Black Sea: a low dark wedge
  K.define('magura', { name: 'Magura V5 naval drone', real: 'Magura V5 unmanned surface vessel (HUR)', cat: 'sea', role: 'Kamikaze sea drone: 300 kg warhead, has sunk several Black Sea Fleet ships, now launches missiles too', side: 'ua', len: 5.5 }, (K, o) => {
    const L = K.lists(), c = 0x3b4248;
    hull(L, { len: 5.5, beam: 1.5, sheer: [[0, .38], [.7, .44], [1, .5]], plan: [[0, .8], [.3, 1], [.7, .88], [.9, .5], [1, .03]], flare: .2, rake: .9, sover: .02, col: c, deck: 0x2e3439, bt: .04, boot: 0x2b2f33, n: 8 });
    loft(L.solid, c, rect(.9, 1.6, 0, -.6, .2), rect(.6, 1.1, 0, -.75, .15), .42, .66);
    rod(L.metal, F.mesh, [0, .66, -.9], [0, 1.15, -.95], .025, 3); add(L.solid, P.cyl(.09, .09, .1, 6), F.white, [0, .7, -.4]);
    add(L.solid, P.box(.3, .06, .4), 0x1c1f22, [0, .66, -.45]);
    add(L.team, P.box(.02, .14, .22), null, [0, 1.08, -1.05]);
    return ship(L, o, 'magura');
  });
  // Sea Baby: the SBU's larger drone boat, raised deck and a small sensor housing
  K.define('seababy', { name: 'Sea Baby naval drone', real: 'Sea Baby unmanned surface vessel (SBU)', cat: 'sea', role: 'Heavy sea drone: up to 850 kg warhead, struck the Kerch bridge and Russian warships', side: 'ua', len: 6 }, (K, o) => {
    const L = K.lists(), c = 0x4a5258;
    hull(L, { len: 6, beam: 1.9, sheer: [[0, .5], [.6, .56], [1, .68]], plan: [[0, .86], [.3, 1], [.7, .9], [.9, .55], [1, .04]], flare: .18, rake: .8, sover: .02, col: c, deck: 0x3a4146, bt: .05, boot: 0x2b2f33, n: 8 });
    loft(L.solid, c, rect(1.3, 2.6, 0, -.3, .3), rect(1, 2, 0, -.5, .2), .54, .82);
    loft(L.solid, 0x2e3439, rect(.5, .5, 0, .6, .1), rect(.4, .4, 0, .55, .08), .82, 1.05);
    rod(L.metal, F.mesh, [0, .82, -1.3], [0, 1.4, -1.35], .025, 3);
    add(L.team, P.box(.02, .16, .24), null, [0, 1.32, -1.45]);
    return ship(L, o, 'seababy');
  });

  // =====================================================================================================================
  // MERCHANT SHIPPING (continued)
  // =====================================================================================================================
  const BOXES = [0x1b4f8f, 0xc8102e, 0xdedede, 0x2f7a4a, 0xd96a1d, 0x5e6e7a, 0x8a2f5a, 0xc9a227];
  K.define('container', { name: 'Container ship', real: 'Neo-Panamax container ship (about 14,000 TEU)', cat: 'sea', role: 'Container ship: carries the goods trade through the Strait of Hormuz, the Red Sea and the Taiwan Strait', side: 'any', len: 366 }, (K, o) => {
    const L = K.lists();
    const H = hull(L, { len: 366, beam: 51, sheer: [[0, 14], [.88, 14], [.92, 17], [1, 18]], plan: [[0, .82], [.05, .95], [.14, 1], [.76, 1], [.88, .8], [.96, .44], [1, .06]], flare: .03, rake: 10, sover: 8, col: 0x1f3a5c, deck: 0x5d6266, bt: 2.4 });
    accommodation(L, -60, 30, 8, 13.8, F.white, false);
    blk(L.solid, 0x1f3a5c, 7, 14, 10, 0, 13.8, -158, 6, 9, -1); blk(L.solid, F.black, 6, 1, 9, 0, 27.8, -159);
    // the container bays: stacks across the beam, uneven heights and colours
    let k = 0;
    for (let z = 150; z > -168; z -= 13.6) {
      if (z < -44 && z > -76) continue;
      const tier = z > 120 ? 4 : z < -140 ? 5 : 7;
      for (let j = 0; j < 4; j++) { const hgt = (tier - ((k * 7 + j * 3) % 3)) * 2.6, w = 11.8; add(L.solid, P.box(w, hgt, 12.2), BOXES[(k * 3 + j * 5) % BOXES.length], [-17.7 + j * w, 14 + hgt / 2, z]); }
      k++;
    }
    blk(L.solid, F.white, 16, 2.4, 5, 0, 17.6, 166);
    flag(L, 0, 40, -62, 1.6); flag(L, 0, 14, -181, 1.4);
    return ship(L, o, 'container');
  });
  K.define('lng', { name: 'LNG carrier', real: 'Moss-type LNG carrier (about 145,000 m3)', cat: 'sea', role: 'Liquefied gas carrier: Qatar ships a fifth of the world\'s LNG through the Strait of Hormuz', side: 'any', len: 290 }, (K, o) => {
    const L = K.lists();
    const H = hull(L, { len: 290, beam: 49, sheer: [[0, 15], [.88, 15], [.92, 18], [1, 19]], plan: MERCH, flare: .02, rake: 8, sover: 6, col: 0x7a2a2a, deck: 0x5f6b5a, bt: 2.2 });
    accommodation(L, -121, 34, 6, 14.8, F.white, true, F.white, 0x1f5fa8);
    // the four Moss spheres: domes above a skirt, joined by the walkway
    for (let i = 0; i < 4; i++) {
      const z = 96 - i * 50;
      add(L.solid, P.cyl(21, 21.5, 6, 16), 0xd9d4c7, [0, 18, z]); add(L.solid, P.hemi(21, 16), 0xe9e4d6, [0, 21, z]);
      add(L.metal, P.cyl(1.4, 1.4, 2, 8), 0x9aa0a6, [0, 41.6, z]);
    }
    rod(L.metal, 0x9aa0a6, [0, 34, 118], [0, 34, -108], .5, 4);
    blk(L.solid, F.white, 18, 4, 8, 0, 18.4, 134);
    flag(L, 0, 41, -123, 1.6); flag(L, 0, 15, -145, 1.4);
    return ship(L, o, 'lng');
  });
}
