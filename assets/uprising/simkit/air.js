/* SIMKIT air.js: aircraft, helicopters, drones, missiles, interceptors and bombs. The contract and the type list this file
   owns: build/simkit/SIMKIT.md. Everything is in metres, +Z forward, +Y up, centred on the body.

   How it is built: a few local helpers (loft = a body through cross-sections, plane = a mirrored wing, fin = a tail surface,
   nozzle, canopy, pod, prop, rotor) and two parametric builders: missile() for every munition and interceptor, and the
   airliner() family for the big jets. Each type below is its real proportions written as numbers (span, sweep, chords,
   tail layout), so a reader who knows the hardware can name it from the silhouette. */
export default function register(K) {
  const T = K.T, C = K.C, P = K.part, add = K.add, mir = K.mirror;
  const D = Math.PI / 180, H = Math.PI / 2, TAU = Math.PI * 2;

  // finishes the core palette does not carry (real paint schemes)
  const F = {
    navy: 0x9aa2a8, light: 0xa9b0b5, ruBlue: 0x7f98ab, ruSea: 0x5f7e96, ruGrey: 0x9ba7ae, ruDark: 0x3c4246,
    cnGrey: 0x8a9399, cnDark: 0x565e65, twGrey: 0x8d969c, uaGrey: 0x8995a0, uaDark: 0x5c6976, mirage: 0x8b949b,
    irSand: 0xb59c72, irBrown: 0x7d6046, irGreen: 0x6e7350, irBlue: 0x8fa3b2, ilSand: 0xbba67e, ilBrown: 0x9b7a55, ilGreen: 0x7f7c5c,
    drone: 0xb9bec2, white: 0xdfe2e3, olive: 0x5d6650, bomb: 0x6b6f56, rv: 0x3d3a36
  };
  const GLOW = 0xff8c3a, PLUME = 0x6a2c0c, ROCKET = 0xffb060, DARK = 0x15181b, GOLD = 0x7a6a3a;

  // ------------------------------------------------------------------ geometry helpers
  const geo = (arr) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(arr, 3)); return g; };
  /* loft: a closed body through cross-sections, ascending z. Each station [z, halfWidth, halfHeight, yCentre, [ex, ey]].
     ex/ey shape the section: [1,1] ellipse, [0.5,0.5] box, [1,1.6] a chined (sharp-edged) section. */
  function loft(st, seg, sh) {
    seg = seg || 10; sh = sh || [1, 1];
    const rings = st.map((s) => {
      const w = s[1], h = s[2], yc = s[3] || 0, e = s[4] || sh, r = [];
      for (let i = 0; i < seg; i++) {
        const a = i / seg * TAU, c = Math.cos(a), n = Math.sin(a);
        r.push([w * Math.sign(c) * Math.pow(Math.abs(c), e[0]), yc + h * Math.sign(n) * Math.pow(Math.abs(n), e[1]), s[0]]);
      }
      r.pt = w === 0 && h === 0; return r;
    });
    const out = [], tri = (a, b, c) => out.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let k = 0; k < rings.length - 1; k++) {
      const A = rings[k], B = rings[k + 1];
      for (let j = 0; j < seg; j++) {
        const j1 = (j + 1) % seg;
        if (!A.pt) tri(A[j], A[j1], B[j]);
        if (!B.pt) tri(A[j1], B[j1], B[j]);
      }
    }
    const f = rings[0], l = rings[rings.length - 1];
    if (!f.pt) { const c = [0, st[0][3] || 0, st[0][0]]; for (let j = 0; j < seg; j++) tri(c, f[(j + 1) % seg], f[j]); }
    if (!l.pt) { const s = st[st.length - 1], c = [0, s[3] || 0, s[0]]; for (let j = 0; j < seg; j++) tri(c, l[j], l[(j + 1) % seg]); }
    return geo(out);
  }
  const body = (l, col, st, seg, sh, pos, rot) => add(l, loft(st, seg, sh), col, pos, rot);
  // a trapezoid outline for one side: root at x0 (leading edge z, trailing edge z), tip at x1
  const tz = (x0, le0, te0, x1, le1, te1) => [[x0, le0], [x1, le1], [x1, te1], [x0, te0]];
  // a horizontal surface from one side's outline [[x,z],...], mirrored across x; dih in degrees, hinged at x = hx
  function plane(l, col, pts, y, th, dih, hx) {
    hx = hx || 0; add(l, P.slab(pts.map((p) => [p[0] - hx, p[1]]), th), col, [hx, y, 0], [0, 0, (dih || 0) * D]); mir(l, 1);
  }
  // camouflage patches laid on a quad surface: patches in (u along span, v along chord) fractions
  function camo(l, col, q, y, th, dih, patches, hx) {
    patches.forEach((pp) => {
      const pts = pp.map(([u, v]) => {
        const le = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u];
        const te = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u];
        return [le[0] + (te[0] - le[0]) * v, le[1] + (te[1] - le[1]) * v];
      });
      plane(l, col, pts, y, th * 1.5, dih, hx);
    });
  }
  const CAMO_A = [[[0.0, 0.05], [0.35, 0.0], [0.5, 0.45], [0.15, 0.7], [0.0, 0.6]], [[0.55, 0.3], [0.9, 0.15], [1, 0.75], [0.7, 0.95]]];
  const CAMO_B = [[[0.2, 0.4], [0.55, 0.1], [0.75, 0.5], [0.4, 0.95], [0.15, 0.9]], [[0.75, 0.0], [1, 0.05], [1, 0.4], [0.85, 0.3]]];
  // a tail fin from its side outline: root le0..te0 at height 0, tip le1..te1 at height h; cant in degrees, top outward
  function fin(l, col, x, y, le0, te0, le1, te1, h, th, cant, pair, tl) {
    const rot = [0, 0, -(cant || 0) * D];
    add(l, P.profile([[te0, 0], [le0, 0], [le1, h], [te1, h]], th), col, [x, y, 0], rot); if (pair) mir(l, 1);
    if (tl) {
      const f = 0.76, a = le0 + (le1 - le0) * f, b = te0 + (te1 - te0) * f;
      add(tl, P.profile([[b, h * f], [a, h * f], [le1, h], [te1, h]], th * 1.3), null, [x, y, 0], rot); if (pair) mir(tl, 1);
    }
  }
  // a roundel (team colour) on a wing at (x, y, z), mirrored
  function roundel(l, x, y, z, r) { add(l, P.cyl(r, r, 0.03, 10), null, [x, y, z]); mir(l, 1); }
  const canopy = (l, z, y, len, w, h, col) => add(l, P.sphere(1, 10, 6), col || C.glass, [0, y, z], null, [w, h, len / 2]);
  // a jet nozzle at (x,y,z): metal can, a hot disc, a faint plume
  function nozzle(L, x, y, z, r, len, col) {
    add(L.metal, P.cyl(r * 1.02, r * 0.9, len, 10), col || 0x5d5750, [x, y, z], [H, 0, 0]);
    add(L.glow, P.cyl(r * 0.7, r * 0.7, 0.02, 10), GLOW, [x, y, z - len / 2 - 0.01], [H, 0, 0]);
    add(L.glowAdd, P.cone(r * 0.5, r * 1.6, 8), PLUME, [x, y, z - len / 2 - r * 0.8], [-H, 0, 0]);
  }
  // a pod along z (tank, engine, store): centre, radius, length, nose / tail fractions, tail radius fraction
  function pod(l, col, x, y, z, r, len, nf, tf, tr, seg) {
    nf = nf == null ? 0.3 : nf; tf = tf == null ? 0.2 : tf; tr = tr == null ? 0.25 : tr; const h = len / 2;
    body(l, col, [[-h, r * tr, r * tr], [-h + len * tf, r, r], [h - len * nf, r, r], [h - len * nf * 0.45, r * 0.72, r * 0.72], [h, 0, 0]], seg || 8, null, [x, y, z]);
  }
  // a small air-to-air missile on a rail (wingtips, pylons): 2 parts (mirror with mir(l, 2))
  function aam(l, x, y, z, len, r) {
    pod(l, C.offwhite, x, y, z, r, len, 0.12, 0.02, 0.9, 6);
    add(l, P.slab([[-r * 3.2, z - len * 0.5], [0, z - len * 0.3], [r * 3.2, z - len * 0.5]], 0.02), C.offwhite, [x, y, 0]);
  }
  // a propeller in the x-y plane (spins about z), as a named group
  function prop(name, blades, r, chord, col, pos, spin) {
    const L = K.lists();
    for (let i = 0; i < blades; i++) {
      const a = i / blades * TAU + (spin || 0);
      add(L.solid, P.box(chord, r, Math.max(0.02, r * 0.05)), col || DARK, [-Math.sin(a) * r / 2, Math.cos(a) * r / 2, 0], [0, 0, a]);
    }
    add(L.solid, P.cone(Math.max(chord * 0.9, r * 0.16), Math.max(chord * 1.6, r * 0.32), 8), C.metal, [0, 0, 0.02], [H, 0, 0]);
    const g = K.group(L, null, name); g.position.set(pos[0], pos[1], pos[2]); return g;
  }
  // a helicopter rotor in the x-z plane (spins about y), as a named group
  function rotor(name, blades, r, chord, col, pos, hub) {
    const L = K.lists();
    for (let i = 0; i < blades; i++) {
      const a = i / blades * TAU;
      add(L.solid, P.box(r, r * 0.012 + 0.006, chord), col || DARK, [Math.cos(a) * r / 2, 0, -Math.sin(a) * r / 2], [0, a, 0]);
    }
    add(L.metal, P.cyl(hub || r * 0.06, (hub || r * 0.06) * 1.2, r * 0.05, 8), C.steel, [0, 0, 0]);
    const g = K.group(L, null, name); g.position.set(pos[0], pos[1], pos[2]); return g;
  }
  // a tail rotor in the y-z plane (spins about x)
  function trotor(name, blades, r, chord, pos) {
    const L = K.lists();
    for (let i = 0; i < blades; i++) {
      const a = i / blades * TAU;
      add(L.solid, P.box(0.04, r, chord), DARK, [0, Math.cos(a) * r / 2, Math.sin(a) * r / 2], [-a, 0, 0]);
    }
    const g = K.group(L, null, name); g.position.set(pos[0], pos[1], pos[2]); return g;
  }
  // anim: spin named parts; spec [[name, axis, rad/s], ...]. Found once per object, nothing allocated per frame after.
  const found = new WeakMap();
  function spin(spec) {
    return function (obj, dt, t) {
      let a = found.get(obj);
      if (!a) { a = []; obj.traverse((n) => { for (let i = 0; i < spec.length; i++) if (n.name === spec[i][0]) a.push(n, spec[i]); }); found.set(obj, a); }
      for (let i = 0; i < a.length; i += 2) a[i].rotation[a[i + 1][1]] = t * a[i + 1][2];
    };
  }
  const done = (L, o, name, kids) => { const g = K.group(L, o.team, name); (kids || []).forEach((k) => g.add(k)); return g; };
  const def = (type, meta, build) => K.define(type, Object.assign({ cat: 'air' }, meta), build);

  // ================================================================== FIGHTERS AND STRIKE JETS
  def('f35', { name: 'F-35 stealth fighter', real: 'F-35A/C Lightning II · F-35I Adir', role: 'stealth multirole fighter', side: 'us', len: 15.7 }, (K, o) => {
    const L = K.lists(), c = C.stealth;
    body(L.solid, c, [[-7.2, 0.58, 0.45, 0.12], [-6.4, 0.8, 0.55, 0.12], [-5, 1.15, 0.62, 0.14], [-3, 1.5, 0.7, 0.14], [-0.6, 1.66, 0.76, 0.12],
      [1.6, 1.62, 0.78, 0.12], [3.0, 1.2, 0.74, 0.12], [4.4, 0.82, 0.64, 0.1], [5.8, 0.6, 0.48, 0.05], [7, 0.34, 0.28, 0], [7.85, 0, 0, -0.03]], 10, [1, 1.5]);
    body(L.solid, c, [[-0.6, 0.12, 0.36, 0], [1.2, 0.3, 0.44, 0], [3.0, 0.32, 0.46, 0.02], [3.25, 0.31, 0.45, 0.02]], 6, [0.6, 0.6], [1.4, 0.02, 0]); mir(L.solid, 1);
    add(L.solid, P.box(0.5, 0.74, 0.04), DARK, [1.4, 0.04, 3.27]); mir(L.solid, 1);
    plane(L.solid, c, tz(1, 1.2, -4.6, 5.35, -1.73, -3.52), 0.05, 0.16, 0);
    plane(L.solid, c, tz(0.7, -4.9, -7.85, 3.3, -6.95, -7.7), 0.15, 0.1, 0);
    fin(L.solid, c, 0.85, 0.55, -4.2, -6.6, -5.9, -7.25, 2.2, 0.1, 25, true, L.team);
    nozzle(L, 0, 0.12, -7.6, 0.56, 0.9);
    canopy(L.glass, 4.1, 0.62, 3.1, 0.42, 0.42, GOLD);
    roundel(L.team, 3.6, 0.15, -2.5, 0.38);
    return done(L, o, 'f35');
  });

  def('f22', { name: 'F-22 Raptor', real: 'F-22A Raptor', role: 'stealth air superiority fighter', side: 'us', len: 18.9 }, (K, o) => {
    const L = K.lists(), c = C.usaf;
    body(L.solid, c, [[-8.6, 1.2, 0.42, 0.1], [-6.8, 1.35, 0.5, 0.1], [-4.5, 1.72, 0.6, 0.08], [-1, 1.82, 0.68, 0.08], [2, 1.76, 0.72, 0.08],
      [4, 1.2, 0.72, 0.12], [5.5, 0.84, 0.65, 0.12], [7, 0.64, 0.5, 0.08], [8.5, 0.35, 0.28, 0.02], [9.45, 0, 0, -0.02]], 10, [1, 1.6]);
    body(L.solid, c, [[-1.0, 0.16, 0.46, 0], [1.5, 0.38, 0.56, 0], [3.4, 0.4, 0.58, 0], [3.7, 0.39, 0.57, 0]], 6, [0.6, 0.6], [1.5, -0.02, 0]); mir(L.solid, 1);
    add(L.solid, P.box(0.62, 0.92, 0.04), DARK, [1.5, -0.02, 3.72]); mir(L.solid, 1);
    plane(L.solid, c, tz(1.6, 1.8, -5.3, 6.78, -2.86, -3.85), 0.08, 0.2, 0);
    plane(L.solid, c, tz(1.3, -5.6, -9.45, 4.45, -7.9, -9.15), 0.12, 0.12, 0);
    fin(L.solid, c, 1.5, 0.55, -3.6, -7.2, -6.2, -7.95, 2.6, 0.12, 28, true, L.team);
    add(L.metal, P.box(0.95, 0.5, 1.1), 0x55524d, [0.72, 0.08, -8.9]); mir(L.metal, 1);
    add(L.glow, P.box(0.7, 0.32, 0.02), GLOW, [0.72, 0.08, -9.46]); mir(L.glow, 1);
    add(L.glowAdd, P.cone(0.3, 1.2, 6), PLUME, [0.72, 0.08, -10.1], [-H, 0, 0]); mir(L.glowAdd, 1);
    canopy(L.glass, 5.9, 0.62, 3.6, 0.48, 0.5, GOLD);
    roundel(L.team, 4.5, 0.2, -2.6, 0.42);
    return done(L, o, 'f22');
  });

  def('f15e', { name: 'F-15E Strike Eagle', real: 'F-15E Strike Eagle · F-15I Ra\'am', role: 'two-seat strike fighter', side: 'us', len: 19.4 }, (K, o) => {
    const L = K.lists(), c = C.usafDark;
    body(L.solid, c, [[-8.0, 1.25, 0.55, 0.1], [-6.5, 1.3, 0.56, 0.1], [-4, 1.45, 0.6, 0.12], [0, 1.4, 0.65, 0.15], [3, 1.0, 0.72, 0.2],
      [4.4, 0.8, 0.8, 0.15], [6, 0.68, 0.75, 0.15], [7.5, 0.55, 0.55, 0.05], [8.8, 0.3, 0.32, -0.05], [9.7, 0, 0, -0.1]], 10, [0.8, 0.8]);
    // the big rectangular intakes with their conformal fuel tanks on the outside
    body(L.solid, c, [[-2.5, 0.48, 0.55, 0], [3.4, 0.48, 0.62, 0], [4.6, 0.46, 0.66, 0.05]], 6, [0.5, 0.5], [1.5, -0.12, 0]); mir(L.solid, 1);
    add(L.solid, P.box(0.82, 1.16, 0.06), DARK, [1.5, -0.08, 4.64], [0.35, 0, 0]); mir(L.solid, 1);
    pod(L.solid, c, 2.05, -0.15, -0.5, 0.42, 7.2, 0.18, 0.25, 0.4); mir(L.solid, 1);
    plane(L.solid, c, tz(1.6, 1.5, -4.8, 6.52, -3.42, -4.8), 0.38, 0.14, -1);
    plane(L.solid, c, tz(1.4, -5.6, -8.9, 4.3, -7.9, -9.2), 0.05, 0.1, 0);
    fin(L.solid, c, 1.25, 0.55, -4.4, -8.2, -6.9, -8.6, 2.95, 0.12, 2, true, L.team);
    nozzle(L, 0.65, 0.05, -8.4, 0.55, 0.9); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    canopy(L.glass, 5.6, 0.68, 3.8, 0.5, 0.55);
    // a load of bombs on the tank pylons, the strike look
    for (const z of [0.8, -1.4]) { pod(L.solid, F.bomb, 2.05, -0.62, z, 0.18, 1.9, 0.35, 0.2, 0.5, 6); mir(L.solid, 1); }
    roundel(L.team, 4.8, 0.48, -2.9, 0.42);
    return done(L, o, 'f15e');
  });

  def('f16', { name: 'F-16 Fighting Falcon', real: 'F-16C · F-16I Sufa · F-16V Viper', role: 'multirole fighter', side: 'us', len: 15.1 }, (K, o) => {
    const L = K.lists(), il = o.variant === 'il', c = il ? F.ilSand : C.haze;
    body(L.solid, c, [[-6.5, 0.46, 0.44, 0.15], [-5.2, 0.6, 0.5, 0.15], [-3, 0.76, 0.55, 0.1], [0, 0.72, 0.6, 0.1], [2.5, 0.62, 0.62, 0.15],
      [4.0, 0.58, 0.64, 0.24], [5.4, 0.5, 0.5, 0.15], [6.6, 0.3, 0.32, 0.05], [7.5, 0, 0, 0]], 10);
    // the chin intake under the cockpit
    body(L.solid, c, [[-1.2, 0.5, 0.36, 0], [2.8, 0.52, 0.4, 0], [3.4, 0.5, 0.42, 0.02]], 8, [0.8, 0.8], [0, -0.68, 0]);
    add(L.solid, P.box(0.82, 0.62, 0.05), DARK, [0, -0.66, 3.42], [0.3, 0, 0]);
    const wq = [[0.55, 4.6], [1.5, 0.75], [4.55, -1.85], [4.55, -3.0], [0.55, -3.1]];
    plane(L.solid, c, wq, 0.0, 0.12, 0);
    const sq = tz(0.45, -4.3, -6.8, 2.8, -6.1, -6.85);
    plane(L.solid, c, sq, 0.1, 0.08, -10);
    if (il) {
      const wq2 = tz(1.5, 0.75, -3.05, 4.55, -1.85, -3.0);
      camo(L.solid, F.ilBrown, wq2, 0, 0.12, 0, CAMO_A); camo(L.solid, F.ilGreen, wq2, 0, 0.135, 0, [CAMO_B[0]]); camo(L.solid, F.ilBrown, sq, 0.1, 0.08, -10, CAMO_B);
    }
    fin(L.solid, c, 0, 0.5, -3.0, -6.4, -5.3, -6.55, 2.9, 0.1, 0, false, L.team);
    fin(L.solid, c, 0.45, -0.35, -3.6, -5.0, -4.4, -5.1, -0.75, 0.05, 15, true);
    nozzle(L, 0, 0.15, -6.9, 0.48, 0.8);
    canopy(L.glass, 4.0, 0.56, 3.0, 0.4, 0.5);
    aam(L.solid, 4.62, 0, -2.0, 3.0, 0.08); mir(L.solid, 2);
    pod(L.solid, c, 2.6, -0.5, -1.4, 0.3, 4.4, 0.3, 0.25, 0.2); mir(L.solid, 1);
    roundel(L.team, 3.3, 0.08, -2.2, 0.34);
    return done(L, o, 'f16');
  });

  // the Super Hornet and its jamming twin share one airframe
  function hornet(K, o, growler) {
    const L = K.lists(), c = F.navy;
    body(L.solid, c, [[-7.6, 1.02, 0.5, 0.05], [-5.5, 1.2, 0.55, 0.05], [-2.5, 1.45, 0.6, 0.02], [1, 1.42, 0.62, 0.02], [3.4, 0.88, 0.7, 0.15],
      [5.2, 0.66, 0.7, 0.2], [6.8, 0.54, 0.55, 0.1], [8.2, 0.32, 0.34, 0], [9.15, 0, 0, -0.05]], 10, [0.85, 0.85]);
    plane(L.solid, c, [[0.55, 5.4], [1.3, 3.4], [2.05, 1.2], [2.05, -0.4], [0.55, -0.4]], 0.16, 0.12, 0);
    add(L.solid, P.box(0.72, 0.72, 3.4), c, [1.22, -0.42, 0.3]); mir(L.solid, 1);
    add(L.solid, P.box(0.62, 0.62, 0.05), DARK, [1.22, -0.42, 2.02]); mir(L.solid, 1);
    plane(L.solid, c, tz(2.0, 1.2, -3.4, 6.4, -0.4, -2.2), 0.05, 0.14, -3);
    plane(L.solid, c, tz(1.0, -5.0, -8.0, 3.4, -7.2, -8.3), 0.1, 0.1, -2);
    fin(L.solid, c, 1.05, 0.5, -2.6, -5.9, -4.9, -6.6, 2.6, 0.1, 20, true, L.team);
    nozzle(L, 0.55, 0.05, -8.0, 0.48, 0.8); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    canopy(L.glass, 5.3, 0.62, 2.9, 0.42, 0.5);
    if (growler) {
      // ALQ-218 receiver pods on the wingtips, three ALQ-99 jamming pods with their nose turbines
      pod(L.solid, C.offwhite, 6.45, 0.05, -1.0, 0.17, 3.0, 0.2, 0.15, 0.6, 6); mir(L.solid, 1);
      pod(L.solid, C.offwhite, 3.6, -0.6, 0.3, 0.32, 4.6, 0.12, 0.2, 0.5, 8); mir(L.solid, 1);
      pod(L.solid, C.offwhite, 0, -1.0, 0.8, 0.32, 4.6, 0.12, 0.2, 0.5, 8);
      for (const x of [3.6, -3.6]) add(L.solid, P.box(0.75, 0.06, 0.06), DARK, [x, -0.6, 2.62]);
      add(L.solid, P.box(0.75, 0.06, 0.06), DARK, [0, -1.0, 3.12]);
      add(L.team, P.box(0.06, 0.66, 0.4), null, [3.6, -0.6, -0.8]); mir(L.team, 1);
    } else {
      aam(L.solid, 6.5, 0.04, -1.2, 3.0, 0.085); mir(L.solid, 2);
      pod(L.solid, c, 3.6, -0.6, 0, 0.36, 4.2, 0.3, 0.25, 0.2); mir(L.solid, 1);
    }
    roundel(L.team, 4.6, 0.22, -1.5, 0.36);
    return done(L, o, growler ? 'ea18g' : 'fa18');
  }
  def('fa18', { name: 'F/A-18 Super Hornet', real: 'F/A-18E/F Super Hornet', role: 'carrier strike fighter', side: 'us', len: 18.3 }, (K, o) => hornet(K, o, false));
  def('ea18g', { name: 'EA-18G Growler jammer', real: 'EA-18G Growler', role: 'carrier electronic attack (radar jamming)', side: 'us', len: 18.3 }, (K, o) => hornet(K, o, true));

  def('f14', { name: 'F-14 Tomcat', real: 'F-14A Tomcat (IRIAF)', role: 'swing-wing interceptor', side: 'ir', len: 19.1 }, (K, o) => {
    const L = K.lists(), c = F.irSand, b = F.irBrown;
    body(L.solid, c, [[-2, 0.9, 0.6, 0.25], [1.5, 0.9, 0.75, 0.25], [3.8, 0.85, 0.85, 0.25], [5.6, 0.75, 0.82, 0.25], [7.2, 0.58, 0.62, 0.12],
      [8.6, 0.34, 0.36, 0.02], [9.55, 0, 0, -0.05]], 10);
    // two widely spaced engine nacelles with big box intakes, the flat "pancake" between them
    body(L.solid, c, [[-8.1, 0.5, 0.5, 0], [-6, 0.62, 0.62, 0], [-1, 0.7, 0.72, 0], [2.6, 0.62, 0.78, 0.05], [3.6, 0.6, 0.8, 0.08]], 8, [0.7, 0.7], [1.9, -0.25, 0]); mir(L.solid, 1);
    add(L.solid, P.box(1.1, 1.48, 0.06), DARK, [1.9, -0.17, 3.62], [0.25, 0, 0]); mir(L.solid, 1);
    plane(L.solid, c, [[0, 1.0], [1.6, 1.0], [1.6, -7.6], [0, -9.3]], 0.05, 0.25, 0);
    // fixed gloves and the swing wings spread at about 20 degrees
    const gq = [[0.8, 6.2], [3.4, 1.4], [3.4, -3.2], [0.8, -3.2]];
    plane(L.solid, c, gq, 0.25, 0.18, 0);
    const wq = tz(3.0, 0.9, -2.4, 9.77, -1.55, -3.25); plane(L.solid, c, wq, 0.25, 0.12, 0); camo(L.solid, b, wq, 0.25, 0.12, 0, CAMO_A);
    const sq = tz(1.9, -5.6, -8.8, 5.0, -8.0, -9.25); plane(L.solid, c, sq, -0.05, 0.1, 0); camo(L.solid, b, sq, -0.05, 0.1, 0, CAMO_B);
    camo(L.solid, b, gq, 0.25, 0.18, 0, [[[0.2, 0.5], [0.9, 0.55], [0.9, 0.9], [0.3, 0.95]]]);
    fin(L.solid, c, 1.75, 0.4, -3.9, -8.3, -6.9, -8.8, 3.0, 0.12, 5, true, L.team);
    fin(L.solid, c, 1.9, -0.7, -5.0, -7.0, -5.8, -7.2, -0.8, 0.06, 20, true);
    nozzle(L, 1.9, -0.25, -8.55, 0.52, 0.9); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    canopy(L.glass, 5.4, 0.85, 3.6, 0.45, 0.48);
    roundel(L.team, 7.2, 0.33, -2.3, 0.4);
    return done(L, o, 'f14');
  });

  def('f4', { name: 'F-4 Phantom II', real: 'F-4E Phantom II (IRIAF)', role: 'fighter-bomber', side: 'ir', len: 19.2 }, (K, o) => {
    const L = K.lists(), c = 0xa48d68, b = F.irBrown, g = F.irGreen;
    body(L.solid, c, [[-9.6, 0.14, 0.2, 0.75], [-7.5, 0.35, 0.45, 0.45], [-5.5, 0.7, 0.6, 0.15], [-3, 1.0, 0.7, 0], [0, 1.0, 0.75, 0.1], [2.5, 0.75, 0.8, 0.25],
      [4.5, 0.66, 0.8, 0.25], [6.5, 0.55, 0.6, 0.05], [8.6, 0.34, 0.36, -0.05], [9.6, 0, 0, -0.1]], 10);
    add(L.solid, P.box(0.55, 1.0, 4.6), c, [0.95, 0.05, 1.2]); mir(L.solid, 1);
    add(L.solid, P.box(0.45, 0.85, 0.06), DARK, [1.0, 0.05, 3.52]); mir(L.solid, 1);
    const wi = tz(0.9, 1.5, -3.6, 3.6, -1.2, -3.85); plane(L.solid, c, wi, -0.25, 0.14, 0); camo(L.solid, b, wi, -0.25, 0.14, 0, CAMO_A);
    const wo = tz(3.6, -0.9, -3.85, 5.85, -3.1, -4.4); plane(L.solid, c, wo, -0.25, 0.1, 12, 3.6);
    camo(L.solid, g, wo, -0.25, 0.1, 12, [[[0, 0.1], [0.8, 0.05], [1, 0.6], [0.1, 0.9]]], 3.6);
    plane(L.solid, c, tz(0.35, -6.6, -8.7, 2.75, -8.1, -9.1), 0.45, 0.1, -23);
    fin(L.solid, c, 0, 0.45, -4.8, -9.3, -8.1, -9.55, 2.6, 0.12, 0, false, L.team);
    nozzle(L, 0.52, -0.3, -6.1, 0.46, 0.9); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    canopy(L.glass, 4.4, 0.78, 4.2, 0.42, 0.45);
    pod(L.solid, c, 0, -0.85, -0.5, 0.38, 5.0, 0.3, 0.25, 0.25);
    roundel(L.team, 4.6, 0.12, -2.6, 0.36);
    return done(L, o, 'f4');
  });

  def('su24', { name: 'Su-24 Fencer', real: 'Su-24MK Fencer (IRIAF)', role: 'swing-wing strike bomber', side: 'ir', len: 22.5 }, (K, o) => {
    const L = K.lists(), c = F.irSand, b = F.irBrown;
    body(L.solid, c, [[-10.9, 0.95, 0.55, 0.05], [-9.5, 1.05, 0.6, 0.05], [-6, 1.2, 0.7, 0.05], [-2, 1.35, 0.8, 0.05], [2.5, 1.3, 0.85, 0.1], [5, 1.05, 0.88, 0.2],
      [7, 0.95, 0.86, 0.2], [8.7, 0.78, 0.66, 0.1], [10.3, 0.45, 0.45, 0], [11.25, 0, 0, -0.05]], 10, [0.85, 0.85]);
    add(L.solid, P.box(0.75, 1.15, 5.0), c, [1.48, -0.05, 2.4]); mir(L.solid, 1);
    add(L.solid, P.box(0.62, 1.0, 0.06), DARK, [1.5, -0.05, 4.92]); mir(L.solid, 1);
    const gq = [[1.2, 4.2], [3.2, 0.3], [3.2, -2.2], [1.2, -2.2]]; plane(L.solid, c, gq, 0.6, 0.22, 0);
    const wq = tz(2.9, -0.2, -3.4, 8.82, -4.35, -5.9); plane(L.solid, c, wq, 0.62, 0.14, -2); camo(L.solid, b, wq, 0.62, 0.14, -2, CAMO_A);
    const sq = tz(1.0, -7.2, -10.4, 4.3, -9.6, -10.95); plane(L.solid, c, sq, 0.1, 0.1, -5); camo(L.solid, b, sq, 0.1, 0.1, -5, CAMO_B);
    fin(L.solid, c, 0, 0.75, -5.5, -10.8, -9.2, -11.3, 3.4, 0.14, 0, false, L.team);
    fin(L.solid, c, 0.9, -0.6, -7.5, -9.8, -8.4, -10.0, -0.9, 0.06, 15, true);
    nozzle(L, 0.6, 0, -11.25, 0.5, 0.8); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    canopy(L.glass, 6.4, 0.82, 2.6, 0.78, 0.42);
    roundel(L.team, 6.6, 0.45, -3.6, 0.42);
    return done(L, o, 'su24');
  });

  def('mig29', { name: 'MiG-29 Fulcrum', real: 'MiG-29A Fulcrum (IRIAF)', role: 'air superiority fighter', side: 'ir', len: 17.3 }, (K, o) => {
    const L = K.lists(), c = 0x8e979c, b = 0x6c767d;
    body(L.solid, c, [[-7.6, 0.3, 0.25, 0.15], [-6, 0.5, 0.35, 0.15], [-3, 0.8, 0.4, 0.15], [0, 0.9, 0.42, 0.15], [2, 0.82, 0.48, 0.15], [3.6, 0.64, 0.56, 0.22],
      [5.2, 0.55, 0.6, 0.25], [6.6, 0.45, 0.48, 0.1], [7.8, 0.25, 0.3, 0], [8.66, 0, 0, -0.05]], 10);
    body(L.solid, c, [[-7.7, 0.45, 0.45, 0], [-6, 0.55, 0.52, 0], [-1, 0.6, 0.55, 0], [2.0, 0.5, 0.55, 0], [2.9, 0.48, 0.55, -0.1]], 8, [0.7, 0.7], [1.1, -0.42, 0]); mir(L.solid, 1);
    add(L.solid, P.box(0.85, 0.95, 0.05), DARK, [1.1, -0.5, 2.95], [0.4, 0, 0]); mir(L.solid, 1);
    plane(L.solid, c, [[0.4, 5.4], [1.5, 2.4], [2.4, 1.0], [5.68, -1.95], [5.68, -3.0], [0.4, -2.8]], 0.05, 0.12, -2);
    camo(L.solid, b, tz(2.4, 1.0, -2.9, 5.68, -1.95, -3.0), 0.05, 0.12, -2, CAMO_A);
    plane(L.solid, c, tz(1.6, -5.2, -8.2, 3.8, -7.4, -8.45), -0.2, 0.1, 0);
    fin(L.solid, c, 1.75, 0.0, -3.2, -6.4, -5.6, -6.9, 2.6, 0.1, 6, true, L.team);
    nozzle(L, 1.1, -0.42, -8.05, 0.47, 0.8); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    canopy(L.glass, 5.0, 0.68, 2.6, 0.4, 0.45);
    aam(L.solid, 4.2, -0.3, -1.0, 2.9, 0.085); mir(L.solid, 2);
    roundel(L.team, 4.4, 0.12, -1.9, 0.34);
    return done(L, o, 'mig29');
  });

  // the Flanker family: Su-27 (Ukraine), Su-35 (Russia), J-16 (China, two seats), Su-34 (side-by-side "platypus" nose, canards)
  function flanker(K, o, k) {
    const L = K.lists(), s34 = k === 'su34';
    const c = { su27: F.uaGrey, su35: F.ruGrey, j16: F.cnDark, su34: F.ruBlue }[k], b = { su27: F.uaDark, su35: F.ruBlue, j16: 0x4b5258, su34: F.ruSea }[k];
    const tail = s34 ? -11.67 : -10.97;
    const nose = s34 ? [[6.2, 1.0, 0.78, 0.3, [0.7, 0.8]], [7.8, 1.05, 0.72, 0.22, [0.7, 0.8]], [9.4, 0.82, 0.42, 0.0, [0.8, 0.9]], [10.9, 0.48, 0.22, -0.1], [11.67, 0, 0, -0.12]]
      : [[6.5, 0.72, 0.75, 0.3], [8.3, 0.55, 0.55, 0.1], [10.0, 0.3, 0.32, 0], [10.97, 0, 0, -0.05]];
    body(L.solid, c, [[tail, 0.15, 0.15, 0.3], [tail + 0.5, 0.3, 0.3, 0.3], [-7.5, 0.5, 0.35, 0.25], [-4, 1.0, 0.4, 0.2], [0, 1.2, 0.45, 0.2], [3, 1.0, 0.55, 0.25],
      [5.0, 0.8, 0.7, 0.3]].concat(nose), 10);
    body(L.solid, c, [[-8.9, 0.5, 0.5, 0], [-7, 0.62, 0.6, 0], [-1, 0.66, 0.62, 0], [2.6, 0.55, 0.55, 0], [3.6, 0.5, 0.55, -0.05]], 8, [0.7, 0.7], [1.35, -0.55, 0]); mir(L.solid, 1);
    add(L.solid, P.box(0.95, 1.0, 0.05), DARK, [1.35, -0.6, 3.62], [0.45, 0, 0]); mir(L.solid, 1);
    plane(L.solid, c, [[0.5, 7.2], [1.4, 4.3], [2.3, 2.5], [3.2, 1.0], [7.35, -2.73], [7.35, -4.1], [0.5, -4.3]], 0.0, 0.12, -2);
    camo(L.solid, b, tz(3.2, 1.0, -4.25, 7.35, -2.73, -4.1), 0, 0.12, -2, CAMO_A);
    aam(L.solid, 7.42, -0.05, -2.6, 2.9, 0.085); mir(L.solid, 2);
    body(L.solid, c, [[-9.6, 0.08, 0.1, 0], [-8.8, 0.22, 0.22, 0], [-3, 0.25, 0.3, 0], [-1.5, 0.12, 0.18, 0]], 6, null, [2.05, -0.15, 0]); mir(L.solid, 1);
    fin(L.solid, c, 2.05, 0.1, -4.6, -8.0, -7.3, -8.65, 3.2, 0.12, 0, true, L.team);
    const sq = tz(1.9, -6.4, -9.6, 5.0, -8.8, -9.9); plane(L.solid, c, sq, -0.15, 0.1, 0); camo(L.solid, b, sq, -0.15, 0.1, 0, CAMO_B);
    if (k !== 'su35') fin(L.solid, c, 1.35, -1.0, -5.4, -7.4, -6.4, -7.7, -0.9, 0.06, 10, true);
    nozzle(L, 1.35, -0.55, -9.2, 0.56, 0.9); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    if (s34) { canopy(L.glass, 7.1, 1.0, 2.4, 0.9, 0.42); plane(L.solid, c, tz(0.9, 5.6, 4.4, 3.0, 4.6, 4.1), 0.3, 0.08, 0); }
    else if (k === 'j16') canopy(L.glass, 6.2, 1.0, 4.4, 0.45, 0.5);
    else canopy(L.glass, 6.6, 1.0, 2.9, 0.45, 0.5);
    roundel(L.team, 5.4, 0.1, -3.0, 0.42);
    return done(L, o, k);
  }
  def('su27', { name: 'Su-27 Flanker', real: 'Su-27P/S Flanker (Ukrainian Air Force)', role: 'air superiority fighter', side: 'ua', len: 21.9 }, (K, o) => flanker(K, o, 'su27'));
  def('su35', { name: 'Su-35 Flanker-E', real: 'Su-35S Flanker-E', role: 'air superiority fighter', side: 'ru', len: 21.9 }, (K, o) => flanker(K, o, 'su35'));
  def('j16', { name: 'J-16 strike fighter', real: 'Shenyang J-16', role: 'two-seat strike fighter', side: 'cn', len: 21.9 }, (K, o) => flanker(K, o, 'j16'));
  def('su34', { name: 'Su-34 Fullback', real: 'Su-34 Fullback', role: 'strike bomber (side-by-side cockpit)', side: 'ru', len: 23.3 }, (K, o) => flanker(K, o, 'su34'));

  def('j20', { name: 'J-20 stealth fighter', real: 'Chengdu J-20 Mighty Dragon', role: 'stealth air superiority fighter', side: 'cn', len: 20.4 }, (K, o) => {
    const L = K.lists(), c = F.cnDark;
    body(L.solid, c, [[-8.9, 1.0, 0.42, 0.05], [-6.5, 1.25, 0.46, 0.05], [-3.5, 1.55, 0.5, 0.05], [0, 1.6, 0.6, 0.05], [2.5, 1.5, 0.65, 0.1], [4.4, 1.0, 0.65, 0.15],
      [6.0, 0.78, 0.62, 0.15], [7.6, 0.6, 0.48, 0.1], [9.2, 0.36, 0.3, 0], [10.2, 0, 0, -0.05]], 10, [1, 1.5]);
    body(L.solid, c, [[-0.2, 0.12, 0.38, 0], [2.0, 0.3, 0.44, 0], [4.0, 0.31, 0.46, 0], [4.3, 0.3, 0.45, 0]], 6, [0.6, 0.6], [1.48, -0.05, 0]); mir(L.solid, 1);
    add(L.solid, P.box(0.48, 0.72, 0.04), DARK, [1.48, -0.05, 4.32]); mir(L.solid, 1);
    plane(L.solid, c, [[1.2, 4.4], [3.4, 2.4], [3.4, 1.9], [1.2, 1.6]], 0.25, 0.08, 4);
    plane(L.solid, c, [[1.4, 1.4], [2.6, 0.3], [6.44, -3.96], [6.44, -5.0], [1.4, -5.7]], 0, 0.12, -3);
    fin(L.solid, c, 1.3, 0.45, -5.5, -8.2, -7.3, -8.7, 2.0, 0.1, 24, true, L.team);
    fin(L.solid, c, 1.15, -0.4, -5.8, -7.6, -6.6, -7.9, -0.8, 0.06, 25, true);
    nozzle(L, 0.62, 0.02, -9.3, 0.5, 0.8); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    canopy(L.glass, 6.1, 0.62, 3.2, 0.45, 0.5, GOLD);
    roundel(L.team, 4.6, 0.1, -3.8, 0.4);
    return done(L, o, 'j20');
  });

  def('mirage2000', { name: 'Mirage 2000', real: 'Dassault Mirage 2000-5F (Ukraine)', role: 'delta-wing fighter', side: 'ua', len: 14.4 }, (K, o) => {
    const L = K.lists(), c = F.mirage;
    body(L.solid, c, [[-6.6, 0.5, 0.48, 0.1], [-5, 0.62, 0.55, 0.1], [-2, 0.72, 0.6, 0.1], [1, 0.72, 0.62, 0.15], [3, 0.6, 0.64, 0.22], [4.4, 0.5, 0.55, 0.2],
      [5.6, 0.35, 0.36, 0.08], [7.2, 0, 0, 0]], 10);
    body(L.solid, c, [[-1.0, 0.42, 0.5, 0], [1.6, 0.42, 0.5, 0], [2.3, 0.36, 0.44, 0]], 8, null, [0.85, 0.05, 0]); mir(L.solid, 1);
    add(L.metal, P.cone(0.24, 0.7, 8), C.steel, [0.85, 0.05, 2.6], [H, 0, 0]); mir(L.metal, 1);
    plane(L.solid, c, [[0.5, 2.6], [4.56, -3.9], [4.56, -4.95], [0.5, -5.05]], -0.05, 0.14, 0);
    fin(L.solid, c, 0, 0.5, -2.4, -6.1, -5.5, -6.5, 2.6, 0.1, 0, false, L.team);
    nozzle(L, 0, 0.1, -6.95, 0.48, 0.8);
    canopy(L.glass, 3.4, 0.62, 2.4, 0.4, 0.48);
    aam(L.solid, 2.6, -0.3, -2.2, 2.9, 0.08); mir(L.solid, 2);
    roundel(L.team, 3.0, 0.08, -3.2, 0.34);
    return done(L, o, 'mirage2000');
  });

  def('idf', { name: 'F-CK-1 Ching-kuo', real: 'AIDC F-CK-1 Ching-kuo (IDF)', role: 'light fighter', side: 'tw', len: 14.2 }, (K, o) => {
    const L = K.lists(), c = F.twGrey;
    body(L.solid, c, [[-6.4, 0.62, 0.42, 0.12], [-5.0, 0.75, 0.48, 0.12], [-2, 0.85, 0.55, 0.1], [1, 0.85, 0.58, 0.12], [2.6, 0.62, 0.6, 0.18], [4.0, 0.55, 0.6, 0.25],
      [5.4, 0.45, 0.45, 0.12], [6.4, 0.27, 0.28, 0.03], [7.1, 0, 0, 0]], 10);
    body(L.solid, c, [[-1.5, 0.4, 0.42, 0], [1.4, 0.42, 0.46, 0], [2.0, 0.4, 0.45, 0]], 8, null, [0.95, -0.32, 0]); mir(L.solid, 1);
    add(L.solid, P.cyl(0.34, 0.34, 0.04, 8), DARK, [0.95, -0.32, 2.03], [H, 0, 0]); mir(L.solid, 1);
    plane(L.solid, c, [[0.6, 3.6], [1.4, 0.8], [4.27, -1.7], [4.27, -2.55], [0.6, -2.7]], 0, 0.12, 0);
    plane(L.solid, c, tz(0.5, -3.9, -6.2, 2.7, -5.6, -6.4), 0.05, 0.08, 0);
    fin(L.solid, c, 0, 0.5, -2.6, -6.0, -4.9, -6.3, 2.6, 0.1, 0, false, L.team);
    nozzle(L, 0.46, 0.08, -6.7, 0.42, 0.7); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    canopy(L.glass, 3.9, 0.6, 2.6, 0.4, 0.48);
    aam(L.solid, 4.33, 0, -1.5, 2.9, 0.08); mir(L.solid, 2);
    roundel(L.team, 3.0, 0.08, -1.6, 0.32);
    return done(L, o, 'idf');
  });

  // ================================================================== BOMBERS, TANKERS, RADAR PLANES, TRANSPORTS
  // a transport / airliner fuselage: a tube with a rounded nose and an upswept tail cone
  function tube(l, col, len, r, nl, tl, up, sh, yc) {
    const h = len / 2; yc = yc || 0;
    body(l, col, [[-h, r * 0.1, r * 0.14, yc + r * up], [-h + tl * 0.35, r * 0.45, r * 0.5, yc + r * up * 0.62], [-h + tl * 0.75, r * 0.85, r * 0.88, yc + r * up * 0.15],
      [-h + tl, r, r, yc], [h - nl, r, r, yc], [h - nl * 0.55, r * 0.88, r * 0.86, yc - r * 0.04], [h - nl * 0.2, r * 0.55, r * 0.5, yc - r * 0.12], [h, 0, 0, yc - r * 0.2]], 12, sh);
  }
  const leAt = (q, x) => q[0][1] + (q[1][1] - q[0][1]) * (x - q[0][0]) / (q[1][0] - q[0][0]);
  // a turbofan hung under the wing at span x (both sides): nacelle, dark intake, exhaust cone, pylon up to the wing at wy
  function fan(L, col, q, x, y, r, len, wy, ahead) {
    const z = leAt(q, x) + (ahead == null ? len * 0.2 : ahead);
    body(L.solid, col, [[z - len / 2, r * 0.6, r * 0.6], [z - len * 0.25, r * 0.92, r * 0.92], [z + len * 0.3, r, r], [z + len / 2, r * 0.92, r * 0.92]], 10, null, [x, y, 0]);
    add(L.solid, P.cyl(r * 0.78, r * 0.78, 0.05, 10), DARK, [x, y, z + len / 2 + 0.01], [H, 0, 0]);
    const ph = Math.max(0.1, wy - y - r * 0.6);
    add(L.solid, P.box(Math.max(0.15, r * 0.25), ph, len * 0.6), col, [x, y + r * 0.6 + ph / 2, z - len * 0.1]);
    add(L.metal, P.cone(r * 0.45, len * 0.3, 8), C.steel, [x, y, z - len / 2 - len * 0.12], [-H, 0, 0]);
    mir(L.solid, 3); mir(L.metal, 1);
  }
  // a flying boom trailing down and back from the tail (tankers)
  function boom(L, col, z, y, len) {
    const a = 26 * D, cz = z - Math.cos(a) * len / 2, cy = y - Math.sin(a) * len / 2, ez = z - Math.cos(a) * len * 0.82, ey = y - Math.sin(a) * len * 0.82;
    add(L.metal, P.cyl(0.32, 0.2, len, 8), col, [0, cy, cz], [H - a, 0, 0]);
    add(L.solid, P.box(2.2, 0.06, 0.7), col, [0.9, ey + 0.3, ez], [0, 0, 0.6]); mir(L.solid, 1);
    add(L.team, P.cyl(0.25, 0.25, 0.5, 8), null, [0, y - Math.sin(a) * len * 0.97, z - Math.cos(a) * len * 0.97], [H - a, 0, 0]);
  }
  // a radar rotodome on its struts, as a named group (spins about y when its name is in anim)
  function dome(name, o, r, th, col, pos, strut) {
    const L = K.lists();
    add(L.solid, P.cyl(r, r, th * 0.44, 20), col);
    add(L.solid, P.cyl(r * 0.76, r, th * 0.28, 20), col, [0, th * 0.36, 0]);
    add(L.solid, P.cyl(r, r * 0.76, th * 0.28, 20), col, [0, -th * 0.36, 0]);
    add(L.team, P.cyl(r * 1.01, r * 1.01, th * 0.14, 20), null);
    add(L.solid, P.box(r * 1.4, th * 0.05, r * 0.36), DARK, [0, th * 0.5, 0]);
    const g = K.group(L, o.team, name); g.position.set(pos[0], pos[1], pos[2]);
    const S = K.lists();
    for (const dz of [r * 0.25, -r * 0.25]) add(S.solid, P.box(0.32, strut, 1.4), col, [0, pos[1] - th * 0.4 - strut / 2, pos[2] + dz], [0, 0, 0]);
    return [g, S.solid];
  }

  def('b2', { name: 'B-2 Spirit stealth bomber', real: 'B-2A Spirit', role: 'stealth strategic bomber', side: 'us', len: 21 }, (K, o) => {
    const L = K.lists(), c = 0x474d53;
    const pl = [[0, 10.5], [26.2, -6.5], [26.2, -7.5], [21.6, -10.5], [10.8, -3.5], [0, -10.5]];
    add(L.solid, P.slab(pl.concat(pl.slice(1, -1).reverse().map((p) => [-p[0], p[1]])), 0.4), c);
    body(L.solid, c, [[-9.8, 0.6, 0.22, 0], [-6, 3.8, 0.62, 0.05], [-2, 5.4, 0.9, 0.1], [2, 5.4, 1.05, 0.15], [5.5, 4.2, 0.98, 0.12], [8.2, 2.4, 0.7, 0.05],
      [9.8, 1.0, 0.32, 0], [10.5, 0, 0, 0]], 12, [1, 2]);
    add(L.solid, P.box(1.8, 0.05, 0.55), DARK, [0, 0.98, 6.9], [-0.35, 0, 0]);
    add(L.solid, P.box(1.5, 0.3, 1.0), DARK, [2.7, 0.98, 3.3], [-0.2, 0, 0]); mir(L.solid, 1);
    add(L.solid, P.box(1.7, 0.1, 2.6), DARK, [2.5, 0.62, -5.6]); mir(L.solid, 1);
    add(L.glow, P.box(1.2, 0.04, 0.2), GLOW, [2.5, 0.66, -6.7]); mir(L.glow, 1);
    roundel(L.team, 14, 0.23, -4.2, 0.9);
    return done(L, o, 'b2');
  });

  def('b52', { name: 'B-52 Stratofortress', real: 'B-52H Stratofortress', role: 'long-range heavy bomber', side: 'us', len: 48.5 }, (K, o) => {
    const L = K.lists(), c = C.usafDark;
    body(L.solid, c, [[-24.2, 0.15, 0.3, 1.1], [-23, 0.5, 0.8, 1.0], [-18, 1.1, 1.5, 0.6], [-10, 1.45, 1.9, 0.3], [10, 1.5, 2.0, 0.3], [19, 1.5, 1.9, 0.35],
      [21.5, 1.4, 1.6, 0.3], [23.3, 1.0, 1.1, 0.2], [24.25, 0, 0, 0.1]], 10, [0.85, 0.85]);
    add(L.glass, P.box(2.4, 0.5, 1.2), C.glass, [0, 1.75, 21.4], [-0.5, 0, 0]);
    const wq = tz(1.4, 4.5, -5.0, 28.2, -14.3, -16.8), wy = (x) => 1.8 - x * Math.tan(2 * D);
    plane(L.solid, c, wq, 1.8, 0.4, -2);
    // eight engines in four twin pods on pylons
    for (const sx of [1, -1]) for (const x of [10.5, 19.0]) {
      const z = leAt(wq, x) + 1.2, y = wy(x) - 1.25;
      for (const dx of [-0.72, 0.72]) {
        body(L.solid, c, [[z - 2.9, 0.42, 0.42], [z - 1.5, 0.6, 0.6], [z + 1.6, 0.64, 0.64], [z + 2.1, 0.58, 0.58]], 8, null, [sx * x + dx, y, 0]);
        add(L.solid, P.cyl(0.48, 0.48, 0.05, 8), DARK, [sx * x + dx, y, z + 2.12], [H, 0, 0]);
      }
      add(L.solid, P.box(0.3, 1.0, 3.2), c, [sx * x, y + 0.85, z - 0.3]);
      pod(L.solid, c, sx * 24.2, wy(24.2) - 0.45, leAt(wq, 24.2) - 1.2, 0.42, 4.2, 0.35, 0.3, 0.2);
    }
    fin(L.solid, c, 0, 1.2, -15.5, -24.0, -21.5, -24.3, 7.5, 0.25, 0, false, L.team);
    plane(L.solid, c, tz(0.5, -17.5, -23.5, 7.8, -21.7, -23.8), 1.0, 0.18, 0);
    roundel(L.team, 16, wy(16) + 0.24, -8.6, 1.1);
    return done(L, o, 'b52');
  });

  def('b1b', { name: 'B-1B Lancer', real: 'B-1B Lancer', role: 'swing-wing heavy bomber', side: 'us', len: 44.5 }, (K, o) => {
    const L = K.lists(), c = 0x4f555b;
    body(L.solid, c, [[-22.2, 0.35, 0.55, 1.3], [-18, 1.1, 1.3, 0.9], [-10, 1.9, 1.7, 0.5], [0, 2.1, 1.9, 0.3], [8, 2.0, 2.0, 0.4], [14, 1.8, 1.9, 0.4],
      [18, 1.4, 1.5, 0.3], [21, 0.7, 0.8, 0], [22.25, 0, 0, -0.2]], 10, [0.9, 0.9]);
    add(L.glass, P.box(1.9, 0.45, 1.1), C.glass, [0, 1.45, 18.0], [-0.55, 0, 0]);
    plane(L.solid, c, [[1.5, 10.5], [6.8, 1.5], [6.8, -3.0], [1.5, -7.0]], 0.4, 0.5, 0);
    plane(L.solid, c, [[6.3, 0.8], [16.2, -9.1], [16.2, -11.3], [6.3, -3.6]], 0.5, 0.3, 0);
    body(L.solid, c, [[-12.6, 1.1, 0.65, 0], [-11, 1.25, 0.75, 0], [-5.5, 1.25, 0.75, 0], [-4.6, 1.2, 0.7, 0]], 8, [0.6, 0.6], [3.0, -1.6, 0]); mir(L.solid, 1);
    add(L.solid, P.box(2.2, 1.2, 0.05), DARK, [3.0, -1.6, -4.55]); mir(L.solid, 1);
    for (const x of [2.4, 3.6]) { nozzle(L, x, -1.6, -13.0, 0.5, 0.8); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1); }
    fin(L.solid, c, 0, 1.6, -12.5, -21.5, -19.5, -22.6, 7.0, 0.25, 0, false, L.team);
    plane(L.solid, c, tz(0.3, -16.5, -21.0, 7.0, -20.3, -21.8), 3.0, 0.2, 0);
    plane(L.solid, c, tz(0.8, 19.6, 18.9, 2.2, 19.2, 18.9), -0.2, 0.06, -30);
    roundel(L.team, 12.5, 0.67, -6.8, 0.9);
    return done(L, o, 'b1b');
  });

  def('kc46', { name: 'KC-46 Pegasus tanker', real: 'KC-46A Pegasus', role: 'aerial refuelling tanker (boom)', side: 'us', len: 50.5 }, (K, o) => {
    const L = K.lists(), c = 0x8e9499;
    tube(L.solid, c, 50.5, 2.52, 5.5, 13, 0.5);
    add(L.glass, P.box(2.6, 0.5, 0.9), C.glass, [0, 1.1, 23.2], [-0.6, 0, 0]);
    const wq = tz(2.0, 5.5, -3.5, 24.05, -8.0, -10.3);
    plane(L.solid, c, wq, -1.3, 0.45, 6);
    fan(L, c, wq, 7.5, -2.5, 1.38, 5.4, -1.3 + 7.5 * Math.tan(6 * D));
    fin(L.solid, c, 0, 1.8, -16.5, -24.5, -22.6, -25.1, 7.6, 0.3, 0, false, L.team);
    plane(L.solid, c, tz(0.5, -18.5, -24.0, 9.3, -23.0, -25.0), 0.8, 0.2, 7);
    boom(L, C.steel, -22.5, -1.2, 13);
    roundel(L.team, 16, -1.3 + 16 * Math.tan(6 * D) + 0.25, -5.6, 1.1);
    return done(L, o, 'kc46');
  });

  def('kc135', { name: 'KC-135 Stratotanker', real: 'KC-135R Stratotanker', role: 'aerial refuelling tanker (boom)', side: 'us', len: 41.5 }, (K, o) => {
    const L = K.lists(), c = 0x8f969b;
    tube(L.solid, c, 41.5, 1.85, 4.2, 10, 0.45);
    add(L.glass, P.box(2.0, 0.4, 0.8), C.glass, [0, 0.85, 19.1], [-0.6, 0, 0]);
    const wq = tz(1.8, 4.5, -3.5, 19.95, -8.2, -10.2), wy = (x) => -1.0 + x * Math.tan(7 * D);
    plane(L.solid, c, wq, -1.0, 0.35, 7);
    fan(L, c, wq, 7.2, wy(7.2) - 1.2, 0.95, 4.0, wy(7.2)); fan(L, c, wq, 12.4, wy(12.4) - 1.2, 0.95, 4.0, wy(12.4));
    fin(L.solid, c, 0, 1.2, -13.0, -19.6, -18.6, -20.6, 7.0, 0.25, 0, false, L.team);
    plane(L.solid, c, tz(0.4, -15.5, -20.0, 6.8, -19.3, -20.6), 0.4, 0.18, 7);
    boom(L, C.steel, -18.6, -0.9, 11);
    roundel(L.team, 15, wy(15) + 0.22, -6.8, 0.9);
    return done(L, o, 'kc135');
  });

  def('e3', { name: 'E-3 Sentry AWACS', real: 'E-3G Sentry (AWACS)', role: 'airborne radar and command (AWACS)', side: 'us', len: 46.6,
    anim: spin([['dome', 'y', 0.8]]) }, (K, o) => {
    const L = K.lists(), c = 0x8a9196;
    tube(L.solid, c, 46.6, 1.9, 4.4, 11, 0.45);
    add(L.glass, P.box(2.0, 0.4, 0.8), C.glass, [0, 0.9, 21.6], [-0.6, 0, 0]);
    const wq = tz(1.8, 5.0, -4.0, 22.2, -9.3, -11.2), wy = (x) => -1.0 + x * Math.tan(7 * D);
    plane(L.solid, c, wq, -1.0, 0.35, 7);
    fan(L, c, wq, 7.6, wy(7.6) - 1.1, 0.78, 5.2, wy(7.6)); fan(L, c, wq, 13.0, wy(13.0) - 1.1, 0.78, 5.2, wy(13.0));
    fin(L.solid, c, 0, 1.2, -15.0, -22.3, -20.6, -23.2, 6.6, 0.25, 0, false, L.team);
    plane(L.solid, c, tz(0.4, -17.5, -22.0, 7.0, -21.4, -22.7), 0.4, 0.18, 7);
    const [d, st] = dome('dome', o, 4.57, 1.83, c, [0, 4.6, -6.5], 2.2); st.forEach((p) => L.solid.push(p));
    return done(L, o, 'e3', [d]);
  });

  def('e2d', { name: 'E-2D Hawkeye', real: 'E-2D Advanced Hawkeye', role: 'carrier airborne early warning radar', side: 'us', len: 17.6,
    anim: spin([['dome', 'y', 1.0], ['prop', 'z', 22]]) }, (K, o) => {
    const L = K.lists(), c = F.navy;
    body(L.solid, c, [[-8.8, 0.35, 0.35, 0.9], [-6.5, 0.7, 0.7, 0.5], [-3, 1.15, 1.1, 0.1], [2, 1.2, 1.15, 0], [4.5, 1.05, 1.0, 0], [6.5, 0.85, 0.75, -0.05],
      [8.0, 0.45, 0.4, -0.15], [8.8, 0, 0, -0.2]], 10, [0.85, 0.85]);
    add(L.glass, P.box(1.5, 0.45, 0.8), C.glass, [0, 0.72, 6.3], [-0.6, 0, 0]);
    plane(L.solid, c, tz(0.8, 2.0, -1.7, 12.28, 1.2, -0.7), 1.15, 0.28, 0);
    const kids = [];
    for (const sx of [1, -1]) {
      body(L.solid, c, [[-3.2, 0.35, 0.45, -0.1], [-1, 0.55, 0.72, 0], [2.5, 0.55, 0.7, 0], [3.5, 0.35, 0.38, 0]], 8, null, [sx * 3.9, 0.75, 0]);
      kids.push(prop('prop', 8, 2.05, 0.28, DARK, [sx * 3.9, 0.75, 3.7], sx > 0 ? 0 : 0.2));
    }
    // the four-fin tail on a dihedral stabiliser
    plane(L.solid, c, tz(0, -7.4, -8.8, 3.9, -7.7, -8.8), 0.6, 0.12, 9);
    for (const x of [1.3, 3.9]) fin(L.solid, c, x, 0.6 + x * Math.tan(9 * D) - 0.7, -7.2, -8.8, -7.7, -8.9, 3.0, 0.1, 0, true, x > 2 ? L.team : null);
    const [d, st] = dome('dome', o, 3.66, 0.75, c, [0, 3.3, -2.4], 1.6); st.forEach((p) => L.solid.push(p));
    kids.push(d);
    return done(L, o, 'e2d', kids);
  });

  def('p8', { name: 'P-8 Poseidon', real: 'P-8A Poseidon', role: 'maritime patrol and anti-submarine', side: 'us', len: 39.5 }, (K, o) => {
    const L = K.lists(), c = F.navy;
    tube(L.solid, c, 39.5, 1.88, 4.0, 9.5, 0.45);
    add(L.glass, P.box(2.0, 0.4, 0.8), C.glass, [0, 0.85, 18.2], [-0.6, 0, 0]);
    const wq = tz(1.8, 4.0, -3.2, 17.0, -3.1, -4.9), wy = (x) => -0.9 + x * Math.tan(6 * D);
    plane(L.solid, c, wq, -0.9, 0.35, 6);
    plane(L.solid, c, [[16.9, -3.05], [18.9, -5.0], [18.9, -5.6], [16.9, -4.9]], -0.9, 0.2, 6);
    fan(L, c, wq, 4.9, wy(4.9) - 1.0, 0.95, 3.6, wy(4.9), 1.6);
    fin(L.solid, c, 0, 1.2, -11.0, -19.0, -17.0, -19.6, 6.5, 0.25, 0, false, L.team);
    plane(L.solid, c, tz(0.4, -15.5, -19.0, 7.0, -18.5, -19.6), 0.3, 0.18, 7);
    pod(L.solid, c, 0, -1.9, 9.5, 0.45, 6.0, 0.3, 0.3, 0.3);
    roundel(L.team, 12.5, wy(12.5) + 0.22, -2.6, 0.8);
    return done(L, o, 'p8');
  });

  // a big high-wing jet transport with a T-tail (C-17, Y-20)
  function lifter(K, o, s) {
    const L = K.lists(), c = s.col;
    body(L.solid, c, [[-s.len / 2, 0.5, 0.4, 2.4], [-s.len / 2 + 4, 1.6, 1.3, 1.6], [-s.len / 2 + 10, s.r * 0.95, s.r * 0.85, 0.5], [-s.len / 2 + 16, s.r, s.r, 0],
      [s.len / 2 - 7, s.r, s.r, 0], [s.len / 2 - 3.5, s.r * 0.85, s.r * 0.8, -0.2], [s.len / 2 - 1.2, s.r * 0.5, s.r * 0.45, -0.5], [s.len / 2, 0, 0, -0.7]], 12, [0.85, 0.85]);
    add(L.glass, P.box(2.6, 0.55, 1.0), C.glass, [0, 1.25, s.len / 2 - 2.6], [-0.6, 0, 0]);
    const wy = s.r * 0.78, wq = tz(2.0, s.le, s.le - 11, s.span / 2, s.le - (s.span / 2 - 2) * Math.tan(s.sweep * D), s.le - (s.span / 2 - 2) * Math.tan(s.sweep * D) - 3.4);
    plane(L.solid, c, wq, wy, 0.6, -3);
    for (const x of s.eng) fan(L, c, wq, x, wy - x * Math.tan(3 * D) - 1.7, 1.1, 5.4, wy - x * Math.tan(3 * D), 1.4);
    if (s.winglet) fin(L.solid, c, s.span / 2, wy - (s.span / 2) * Math.tan(3 * D), wq[1][1], wq[2][1], wq[2][1] + 0.8, wq[2][1] - 0.2, 2.8, 0.12, 12, true);
    const ft = -s.len / 2 - 1.2, fh = 8.4;
    fin(L.solid, c, 0, 2.2, ft + 9.5, ft + 2.5, ft + 4.2, ft + 0.6, fh, 0.35, 0, false, L.team);
    plane(L.solid, c, tz(0, ft + 4.8, ft + 0.9, 9.9, ft + 1.8, ft + 0.0), 2.2 + fh, 0.3, -2);
    roundel(L.team, s.span * 0.36, wy + 0.4, leAt(wq, s.span * 0.36) - 3.4, 1.2);
    return done(L, o, s.id);
  }
  def('c17', { name: 'C-17 Globemaster III', real: 'C-17A Globemaster III', role: 'strategic airlifter', side: 'us', len: 53 },
    (K, o) => lifter(K, o, { id: 'c17', col: 0x5f666c, len: 53, r: 3.4, span: 51.75, le: 6, sweep: 25, eng: [8.5, 15.4], winglet: true }));
  def('y20', { name: 'Y-20 Kunpeng airlifter', real: 'Xian Y-20 Kunpeng', role: 'strategic airlifter', side: 'cn', len: 47 },
    (K, o) => lifter(K, o, { id: 'y20', col: 0x8e959a, len: 47, r: 3.0, span: 45, le: 5, sweep: 22, eng: [7.6, 13.4], winglet: false }));

  def('tu95', { name: 'Tu-95 Bear bomber', real: 'Tu-95MS Bear-H', role: 'turboprop strategic bomber (cruise missiles)', side: 'ru', len: 46.2,
    anim: spin([['prop', 'z', 20], ['prop2', 'z', -20]]) }, (K, o) => {
    const L = K.lists(), c = 0xaeb3b6;
    body(L.solid, c, [[-23.1, 0.2, 0.3, 0.9], [-21, 0.6, 0.8, 0.6], [-15, 1.35, 1.5, 0.15], [15, 1.45, 1.55, 0], [19.5, 1.35, 1.4, -0.05], [21.8, 0.9, 0.85, -0.2],
      [22.9, 0.35, 0.32, -0.3], [23.1, 0, 0, -0.3]], 10);
    add(L.glass, P.box(1.6, 0.4, 1.0), C.glass, [0, 1.2, 19.4], [-0.5, 0, 0]);
    add(L.metal, P.cyl(0.08, 0.08, 3.0, 6), C.steel, [0, 0.9, 23.5], [H, 0, 0]);
    const wq = tz(1.4, 3.5, -4.5, 25.05, -13.05, -15.3);
    plane(L.solid, c, wq, -0.1, 0.4, -2);
    const kids = [];
    for (const sx of [1, -1]) for (const x of [6.8, 12.6]) {
      const z = leAt(wq, x), y = -0.1 - x * Math.tan(2 * D) - 0.15;
      body(L.solid, c, [[z - 9.5, 0.35, 0.4, -0.2], [z - 5, 0.7, 0.8, -0.1], [z + 1, 0.85, 0.9, 0], [z + 3.6, 0.75, 0.75, 0], [z + 4.6, 0.5, 0.5, 0]], 8, null, [sx * x, y, 0]);
      kids.push(prop('prop', 4, 2.8, 0.36, DARK, [sx * x, y, z + 4.8]), prop('prop2', 4, 2.75, 0.36, DARK, [sx * x, y, z + 4.3], 0.4));
    }
    fin(L.solid, c, 0, 1.0, -14.5, -21.7, -20.5, -22.6, 7.0, 0.3, 0, false, L.team);
    plane(L.solid, c, tz(0.3, -17.5, -22.2, 7.0, -21.0, -22.8), 0.6, 0.2, 0);
    roundel(L.team, 18, -0.1 - 18 * Math.tan(2 * D) + 0.25, -9.6, 1.0);
    return done(L, o, 'tu95', kids);
  });

  def('tu22m3', { name: 'Tu-22M3 Backfire', real: 'Tu-22M3 Backfire-C', role: 'swing-wing supersonic bomber', side: 'ru', len: 42.5 }, (K, o) => {
    const L = K.lists(), c = 0xb5b9bb;
    body(L.solid, c, [[-21.2, 0.9, 0.7, 0.4], [-17, 1.4, 1.1, 0.3], [-8, 1.6, 1.4, 0.15], [4, 1.5, 1.5, 0.1], [10, 1.25, 1.35, 0.15], [14, 1.0, 1.1, 0.1],
      [18, 0.65, 0.65, -0.05], [20.3, 0.3, 0.3, -0.15], [21.23, 0, 0, -0.2]], 10);
    add(L.glass, P.box(1.6, 0.5, 1.3), C.glass, [0, 1.1, 13.6], [-0.5, 0, 0]);
    body(L.solid, c, [[-17.5, 0.6, 0.8, 0], [-14, 0.75, 1.05, 0], [8, 0.75, 1.1, 0], [11.5, 0.7, 1.15, 0.05]], 6, [0.6, 0.6], [1.95, -0.1, 0]); mir(L.solid, 1);
    add(L.solid, P.box(1.2, 2.0, 0.06), DARK, [1.95, -0.05, 11.55]); mir(L.solid, 1);
    plane(L.solid, c, [[1.5, 7.5], [6.0, 0.5], [6.0, -3.5], [1.5, -6.0]], 0.55, 0.35, 0);
    plane(L.solid, c, [[5.5, 0.3], [17.14, -6.4], [17.14, -8.6], [5.5, -4.3]], 0.55, 0.25, -2);
    fin(L.solid, c, 0, 1.2, -8.0, -20.5, -18.6, -21.3, 7.5, 0.3, 0, false, L.team);
    plane(L.solid, c, tz(0.5, -16.0, -21.0, 7.4, -19.5, -21.6), 0.4, 0.2, 0);
    nozzle(L, 1.0, 0, -21.0, 0.7, 1.0); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    roundel(L.team, 12.5, 0.4, -5.5, 0.9);
    return done(L, o, 'tu22m3');
  });

  def('h6k', { name: 'H-6K bomber', real: 'Xian H-6K', role: 'missile-carrying bomber', side: 'cn', len: 34.8 }, (K, o) => {
    const L = K.lists(), c = 0xb3b8bb;
    body(L.solid, c, [[-17.4, 0.25, 0.35, 0.7], [-15, 0.65, 0.8, 0.4], [-10, 1.2, 1.3, 0.1], [10, 1.25, 1.35, 0], [14.5, 1.05, 1.1, -0.05], [16.6, 0.65, 0.65, -0.15],
      [17.4, 0, 0, -0.25]], 10);
    add(L.glass, P.box(1.6, 0.45, 1.0), C.glass, [0, 1.1, 13.6], [-0.5, 0, 0]);
    // the engines buried in the wing roots, with the K model's enlarged intakes beside the fuselage
    body(L.solid, c, [[-7.0, 0.55, 0.55, 0], [-4.5, 0.9, 0.9, 0], [3.5, 0.98, 0.98, 0], [6.0, 0.92, 0.92, 0]], 10, null, [1.95, -0.35, 0]); mir(L.solid, 1);
    add(L.solid, P.cyl(0.78, 0.78, 0.05, 10), DARK, [1.95, -0.35, 6.03], [H, 0, 0]); mir(L.solid, 1);
    const wq = tz(2.6, 2.6, -4.5, 16.5, -7.1, -9.3);
    plane(L.solid, c, wq, -0.45, 0.35, -3);
    for (const x of [6.5, 10.5]) {
      const y = -0.45 - x * Math.tan(3 * D) - 0.75, z = leAt(wq, x) - 1.5;
      pod(L.solid, 0xd4d6d6, x, y, z, 0.32, 6.4, 0.15, 0.1, 0.6, 8); mir(L.solid, 1);
      add(L.solid, P.slab([[-1.2, z - 1.4], [0, z - 0.2], [1.2, z - 1.4]], 0.04), 0xd4d6d6, [x, y, 0]); mir(L.solid, 1);
    }
    fin(L.solid, c, 0, 0.8, -10.0, -16.6, -15.0, -17.4, 6.0, 0.25, 0, false, L.team);
    plane(L.solid, c, tz(0.3, -13.2, -16.8, 5.8, -16.0, -17.4), 0.6, 0.18, 0);
    nozzle(L, 1.95, -0.35, -7.4, 0.55, 0.6); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    roundel(L.team, 12.5, -0.45 - 12.5 * Math.tan(3 * D) + 0.22, -5.8, 0.85);
    return done(L, o, 'h6k');
  });

  def('kj500', { name: 'KJ-500 radar plane', real: 'Shaanxi KJ-500', role: 'airborne early warning (fixed radar dome)', side: 'cn', len: 36.4,
    anim: spin([['prop', 'z', 22]]) }, (K, o) => {
    const L = K.lists(), c = 0xb7bcbf;
    body(L.solid, c, [[-18.2, 0.4, 0.5, 2.0], [-15, 1.1, 1.0, 1.3], [-10, 1.8, 1.7, 0.4], [-6, 1.9, 1.85, 0], [12, 1.9, 1.85, 0], [15.5, 1.6, 1.5, -0.1],
      [17.4, 0.9, 0.8, -0.3], [18.2, 0, 0, -0.4]], 12, [0.9, 0.9]);
    add(L.glass, P.box(2.0, 0.45, 0.9), C.glass, [0, 1.05, 16.5], [-0.6, 0, 0]);
    const wq = tz(1.5, 3.5, -1.5, 19, 1.6, -0.4);
    plane(L.solid, c, wq, 1.75, 0.45, 0);
    const kids = [];
    for (const sx of [1, -1]) for (const x of [5.0, 9.6]) {
      const z = leAt(wq, x);
      body(L.solid, c, [[z - 5.5, 0.3, 0.35, 0.1], [z - 2.5, 0.62, 0.72, 0], [z + 1.6, 0.6, 0.66, 0], [z + 2.5, 0.35, 0.35, 0]], 8, null, [sx * x, 1.35, 0]);
      kids.push(prop('prop', 6, 2.1, 0.3, DARK, [sx * x, 1.35, z + 2.7], x * 0.1));
    }
    fin(L.solid, c, 0, 1.4, -12.5, -17.5, -16.0, -18.0, 5.5, 0.25, 0, false, L.team);
    plane(L.solid, c, tz(0, -14.5, -18.0, 7.0, -16.6, -18.2), 1.6, 0.2, 0);
    fin(L.solid, c, 5.0, 0.4, -15.0, -17.6, -16.2, -17.9, 2.6, 0.1, 0, true);
    const [d, st] = dome('radome', o, 3.0, 1.0, c, [0, 4.5, -3.0], 2.2); st.forEach((p) => L.solid.push(p));
    kids.push(d);
    return done(L, o, 'kj500', kids);
  });

  // ================================================================== DRONES
  function shahed(K, o, jet) {
    const L = K.lists(), c = jet ? 0x4a4d50 : (o.variant === 'geran2' ? 0x2b2d2f : 0xc8c3b4);
    body(L.solid, c, [[-1.65, 0.13, 0.15, 0], [-1.3, 0.2, 0.21, 0], [0.9, 0.2, 0.21, 0], [1.45, 0.16, 0.17, 0], [1.7, 0.08, 0.08, 0], [1.76, 0, 0, 0]], 10);
    // the cropped delta from just behind the nose to the tail, fins on the tips above and below
    plane(L.solid, c, [[0.12, 1.05], [1.25, -1.15], [1.25, -1.62], [0.12, -1.62]], 0, 0.06, 0);
    fin(L.solid, c, 1.25, 0, -0.85, -1.62, -1.25, -1.64, 0.38, 0.04, 0, true);
    fin(L.solid, c, 1.25, 0, -0.95, -1.62, -1.3, -1.64, -0.28, 0.04, 0, true);
    add(L.team, P.cyl(0.215, 0.215, 0.14, 10), null, [0, 0, 0.55], [H, 0, 0]);
    const kids = [];
    if (jet) {
      body(L.solid, c, [[-1.4, 0.12, 0.08, 0], [-0.6, 0.15, 0.12, 0], [-0.25, 0.14, 0.11, 0.02]], 6, [0.6, 0.6], [0, 0.22, 0]);
      add(L.solid, P.box(0.22, 0.16, 0.04), DARK, [0, 0.24, -0.23]);
      nozzle(L, 0, 0, -1.72, 0.11, 0.14);
    } else kids.push(prop('prop', 2, 0.42, 0.07, DARK, [0, 0, -1.72]));
    return done(L, o, jet ? 'shahed238' : 'shahed136', kids);
  }
  def('shahed136', { name: 'Shahed-136 attack drone', real: 'Shahed-136 · Geran-2 (Russia)', role: 'one-way attack drone', side: 'ir', len: 3.5,
    anim: spin([['prop', 'z', 30]]) }, (K, o) => shahed(K, o, false));
  def('shahed238', { name: 'Shahed-238 jet attack drone', real: 'Shahed-238 · Geran-3 (Russia)', role: 'jet-powered one-way attack drone', side: 'ir', len: 3.5 }, (K, o) => shahed(K, o, true));

  def('mohajer6', { name: 'Mohajer-6 drone', real: 'Qods Mohajer-6', role: 'armed reconnaissance drone', side: 'ir', len: 5.7, anim: spin([['prop', 'z', 30]]) }, (K, o) => {
    const L = K.lists(), c = 0xbfc3c5;
    body(L.solid, c, [[-1.9, 0.18, 0.2, 0.05], [-1.5, 0.32, 0.34, 0.03], [0, 0.4, 0.42, 0], [1.8, 0.38, 0.4, 0], [2.5, 0.25, 0.28, -0.05], [2.83, 0, 0, -0.08]], 10);
    plane(L.solid, c, tz(0.2, 0.55, -0.35, 5.0, 0.4, -0.12), 0.3, 0.06, 0);
    body(L.solid, c, [[-2.85, 0.05, 0.06, 0], [-2.6, 0.07, 0.08, 0], [0.2, 0.08, 0.09, 0], [0.6, 0.05, 0.06, 0]], 6, null, [1.4, 0.25, 0]); mir(L.solid, 1);
    fin(L.solid, c, 1.4, 0.25, -2.25, -2.85, -2.45, -2.9, 0.8, 0.05, 0, true, L.team);
    plane(L.solid, c, [[0, -2.36], [1.45, -2.42], [1.45, -2.88], [0, -2.84]], 1.04, 0.05, 0);
    add(L.solid, P.sphere(0.16, 8, 6), DARK, [0, -0.38, 1.8]);
    pod(L.solid, 0x8d8f86, 2.2, 0.12, 0.1, 0.07, 1.1, 0.3, 0.2, 0.4, 6); mir(L.solid, 1);
    return done(L, o, 'mohajer6', [prop('prop', 2, 0.55, 0.08, DARK, [0, 0.03, -1.98])]);
  });

  def('shahed129', { name: 'Shahed-129 drone', real: 'Shahed 129', role: 'armed long-endurance drone', side: 'ir', len: 8, anim: spin([['prop', 'z', 30]]) }, (K, o) => {
    const L = K.lists(), c = 0xc9cccd;
    body(L.solid, c, [[-3.9, 0.12, 0.15, 0.05], [-3.0, 0.28, 0.3, 0.03], [-1, 0.38, 0.4, 0], [2.0, 0.38, 0.42, 0], [3.3, 0.32, 0.36, 0], [3.85, 0.2, 0.22, -0.05], [4.1, 0, 0, -0.08]], 10);
    plane(L.solid, c, tz(0.2, 0.65, -0.4, 8.0, 0.35, -0.15), 0.33, 0.08, 2);
    fin(L.solid, c, 0.1, 0.15, -2.9, -3.9, -3.5, -4.05, 1.5, 0.06, 40, true, L.team);
    add(L.solid, P.sphere(0.22, 8, 6), DARK, [0, -0.4, 3.2]);
    for (const x of [2.4, 3.2]) { pod(L.solid, 0x8d8f86, x, 0.12, 0.0, 0.08, 1.2, 0.3, 0.2, 0.4, 6); mir(L.solid, 1); }
    return done(L, o, 'shahed129', [prop('prop', 3, 0.9, 0.12, DARK, [0, 0.03, -4.0])]);
  });

  def('mq9', { name: 'MQ-9 Reaper drone', real: 'MQ-9A Reaper', role: 'armed long-endurance drone', side: 'us', len: 11, anim: spin([['prop', 'z', 30]]) }, (K, o) => {
    const L = K.lists(), c = 0xa9aeb2;
    body(L.solid, c, [[-5.2, 0.08, 0.1, 0.05], [-4.6, 0.18, 0.22, 0.05], [-2.5, 0.35, 0.35, 0], [0, 0.42, 0.42, 0], [2.5, 0.45, 0.45, 0], [4.0, 0.48, 0.6, 0.15],
      [5.0, 0.35, 0.42, 0.15], [5.5, 0, 0, 0.1]], 10);
    plane(L.solid, c, tz(0.3, 0.8, -0.7, 10.0, 0.35, -0.3), 0.1, 0.1, 2);
    fin(L.solid, c, 0.1, 0.1, -3.6, -5.0, -4.5, -5.2, 1.5, 0.06, 45, true, L.team);
    fin(L.solid, c, 0, -0.2, -4.2, -5.1, -4.8, -5.2, -0.9, 0.06, 0, false);
    add(L.solid, P.sphere(0.28, 8, 6), DARK, [0, -0.52, 3.6]);
    for (const x of [3.0, 5.5]) { pod(L.solid, x > 4 ? 0x8d8f86 : C.olive, x, -0.15, 0.2, 0.09, 1.7, 0.2, 0.15, 0.5, 6); mir(L.solid, 1); }
    return done(L, o, 'mq9', [prop('prop', 3, 1.15, 0.15, DARK, [0, 0.03, -5.55])]);
  });

  def('rq4', { name: 'RQ-4 Global Hawk', real: 'RQ-4B Global Hawk', role: 'high-altitude spy drone', side: 'us', len: 14.5 }, (K, o) => {
    const L = K.lists(), c = 0xc6cacd;
    body(L.solid, c, [[-7.25, 0.12, 0.18, 0.25], [-5.5, 0.4, 0.42, 0.15], [-1, 0.55, 0.55, 0], [3, 0.6, 0.62, 0.05], [5.0, 0.72, 0.82, 0.2], [6.4, 0.6, 0.62, 0.1], [7.25, 0, 0, 0]], 10);
    plane(L.solid, c, tz(0.4, 1.2, -0.7, 19.95, 0.0, -0.5), 0.45, 0.12, 3);
    body(L.solid, c, [[-6.0, 0.38, 0.32, 0], [-4.5, 0.55, 0.5, 0], [-2.0, 0.55, 0.52, 0], [-1.2, 0.5, 0.45, 0]], 10, null, [0, 0.85, 0]);
    add(L.solid, P.cyl(0.42, 0.38, 0.05, 10), DARK, [0, 0.85, -1.17], [H, 0, 0]);
    add(L.glow, P.cyl(0.3, 0.3, 0.02, 10), GLOW, [0, 0.85, -6.02], [H, 0, 0]);
    fin(L.solid, c, 0.25, 0.6, -5.2, -6.9, -6.3, -7.3, 2.2, 0.08, 40, true, L.team);
    return done(L, o, 'rq4');
  });

  def('tb2', { name: 'Bayraktar TB2 drone', real: 'Baykar Bayraktar TB2', role: 'armed medium-altitude drone', side: 'ua', len: 6.5, anim: spin([['prop', 'z', 30]]) }, (K, o) => {
    const L = K.lists(), c = 0xbfc3c6;
    body(L.solid, c, [[-3.25, 0.08, 0.1, 0.05], [-2.6, 0.2, 0.22, 0.05], [-1, 0.32, 0.34, 0], [1.5, 0.36, 0.38, 0], [2.6, 0.34, 0.36, 0], [3.0, 0.25, 0.26, -0.02], [3.25, 0, 0, -0.05]], 10);
    plane(L.solid, c, tz(0.2, 0.6, -0.35, 6.0, 0.35, -0.15), 0.3, 0.07, 2);
    // the inverted V tail
    fin(L.solid, c, 0.08, 0.0, -2.55, -3.2, -3.0, -3.3, -1.1, 0.05, -40, true, L.team);
    add(L.solid, P.sphere(0.18, 8, 6), DARK, [0, -0.35, 2.5]);
    pod(L.solid, 0x8d8f86, 2.0, 0.12, 0.1, 0.07, 1.0, 0.3, 0.2, 0.4, 6); mir(L.solid, 1);
    return done(L, o, 'tb2', [prop('prop', 2, 0.9, 0.12, DARK, [0, 0.02, -3.35])]);
  });

  def('orlan10', { name: 'Orlan-10 recon drone', real: 'STC Orlan-10', role: 'artillery spotting drone', side: 'ru', len: 2.0, anim: spin([['prop', 'z', 40]]) }, (K, o) => {
    const L = K.lists(), c = 0xb4b8ae;
    body(L.solid, c, [[-1.0, 0.03, 0.04, 0.02], [-0.4, 0.08, 0.09, 0], [0.6, 0.12, 0.13, 0], [0.9, 0.1, 0.11, 0], [1.0, 0.05, 0.05, 0]], 8);
    plane(L.solid, c, tz(0, 0.36, 0.06, 1.55, 0.3, 0.12), 0.13, 0.03, 2);
    plane(L.solid, c, tz(0, -0.8, -0.98, 0.38, -0.86, -0.98), 0.02, 0.02, 0);
    fin(L.solid, c, 0, 0.03, -0.72, -0.98, -0.9, -1.02, 0.34, 0.02, 0, false, L.team);
    return done(L, o, 'orlan10', [prop('prop', 2, 0.2, 0.035, DARK, [0, 0, 1.03])]);
  });

  // the A-10: a straight low wing, two engines in pods high on the rear fuselage, twin fins at the tailplane tips, the GAU-8 in the nose
  def('a10', { name: 'A-10 Thunderbolt II', real: 'A-10C Thunderbolt II ("Warthog")', role: 'close air support jet', side: 'us', len: 16.3 }, (K, o) => {
    const L = K.lists(), c = 0x6c7377, e = 0x5d6468;
    body(L.solid, c, [[-8.1, 0.22, 0.26, 0.35], [-6.6, 0.42, 0.46, 0.25], [-3.2, 0.68, 0.74, 0.08], [0, 0.82, 0.9, 0], [3, 0.78, 0.9, -0.05], [5.2, 0.6, 0.74, -0.1], [7.3, 0.34, 0.44, -0.16], [8.15, 0.08, 0.1, -0.2]], 10);
    plane(L.solid, c, tz(0.6, 1.5, -1.3, 8.75, 0.75, -0.45), -0.48, 0.16, 4);
    plane(L.solid, c, tz(0.3, -6.1, -7.7, 2.8, -6.5, -7.6), 0.42, 0.1, 0);
    fin(L.solid, c, 2.75, 0.42, -6.3, -7.8, -6.9, -8.0, 1.9, 0.1, 0, true, L.team);
    body(L.solid, e, [[-4.7, 0.36, 0.36, 0], [-3.9, 0.6, 0.6, 0], [-1.7, 0.62, 0.62, 0], [-1.25, 0.56, 0.56, 0]], 10, null, [1.25, 0.98, 0]); mir(L.solid, 1);
    add(L.solid, P.cyl(0.48, 0.48, 0.04, 10), DARK, [1.25, 0.98, -1.23], [H, 0, 0]); mir(L.solid, 1);
    add(L.solid, P.box(0.22, 0.55, 1.3), c, [0.92, 0.6, -3.0]); mir(L.solid, 1);
    nozzle(L, 1.25, 0.98, -4.75, 0.3, 0.35); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    canopy(L.glass, 5.3, 0.72, 1.8, 0.46, 0.46);
    add(L.metal, P.cyl(0.07, 0.07, 1.0, 6), DARK, [0, -0.3, 8.4], [H, 0, 0]);
    for (const x of [2.4, 3.6, 5.0]) { pod(L.solid, 0x8d8f86, x, -0.55, -0.2, 0.12, 1.6, 0.3, 0.2, 0.4, 6); mir(L.solid, 1); }
    roundel(L.team, 4.4, -0.35, -0.6, 0.38);
    return done(L, o, 'a10');
  });

  // the J-6 (a MiG-19 built in China), hundreds converted to unmanned attack drones: a nose intake, sharply swept wings with tall
  // fences, two engines side by side, a swept fin
  def('j6w', { name: 'J-6 attack drone', real: 'Shenyang J-6 converted to an unmanned attack drone', role: 'old fighter turned one-way attack drone', side: 'cn', len: 14.6 }, (K, o) => {
    const L = K.lists(), c = 0xa9afb2;
    body(L.solid, c, [[-6.6, 0.56, 0.5, 0.05], [-5, 0.7, 0.66, 0.05], [-1, 0.78, 0.8, 0], [3, 0.74, 0.76, 0], [5.4, 0.62, 0.62, 0], [6.9, 0.52, 0.5, 0], [7.3, 0.5, 0.48, 0]], 10);
    add(L.solid, P.cyl(0.42, 0.42, 0.04, 10), DARK, [0, 0, 7.31], [H, 0, 0]);
    add(L.solid, P.cone(0.16, 0.5, 8), 0x55595c, [0, 0, 7.25], [H, 0, 0]);
    plane(L.solid, c, tz(0.7, 1.6, -2.3, 4.6, -2.6, -3.8), 0, 0.12, -4);
    for (const x of [2.0, 3.3]) { add(L.solid, P.box(0.04, 0.24, 2.6), c, [x, 0.12, -1.4 - x * 0.35]); mir(L.solid, 1); }
    plane(L.solid, c, tz(0.5, -4.2, -6.0, 2.6, -6.0, -6.8), 0.0, 0.08, 0);
    fin(L.solid, c, 0, 0.6, -3.4, -6.4, -6.0, -7.2, 2.3, 0.1, 0, false, L.team);
    nozzle(L, 0.32, -0.05, -6.7, 0.3, 0.6); mir(L.metal, 1); mir(L.glow, 1); mir(L.glowAdd, 1);
    canopy(L.glass, 4.6, 0.62, 1.6, 0.36, 0.4);
    roundel(L.team, 3.0, 0.12, -2.4, 0.34);
    return done(L, o, 'j6w');
  });

  // Ukraine's long-range attack drones (FP-1 and Liutyi): a small high-wing aircraft shape with a propeller in the nose
  def('fp1', { name: 'FP-1 long-range attack drone', real: 'Fire Point FP-1 · Liutyi (Ukraine)', role: 'long-range one-way attack drone', side: 'ua', len: 4.4, anim: spin([['prop', 'z', 30]]) }, (K, o) => {
    const L = K.lists(), c = 0x8a8f86;
    body(L.solid, c, [[-2.2, 0.06, 0.08, 0.12], [-1.6, 0.16, 0.2, 0.08], [-0.4, 0.3, 0.32, 0.02], [1.0, 0.34, 0.34, 0], [1.9, 0.26, 0.26, -0.02], [2.2, 0.12, 0.12, -0.03]], 10);
    plane(L.solid, c, tz(0.2, 0.75, 0.2, 3.4, 0.6, 0.25), 0.32, 0.06, 1);
    plane(L.solid, c, tz(0.05, -1.7, -2.15, 0.9, -1.85, -2.15), 0.12, 0.04, 0);
    fin(L.solid, c, 0, 0.14, -1.5, -2.15, -1.95, -2.2, 0.6, 0.04, 0, false, L.team);
    return done(L, o, 'fp1', [prop('prop', 2, 0.55, 0.08, DARK, [0, 0, 2.24])]);
  });

  // ================================================================== HELICOPTERS
  // the Black Hawk family: MH-60R Seahawk (US Navy) and Z-20 (China, five blades)
  function hawk(K, o, z20) {
    const L = K.lists(), c = z20 ? F.olive : F.navy;
    body(L.solid, c, [[-9.6, 0.22, 0.3, 1.0], [-6, 0.32, 0.4, 0.85], [-3.4, 0.6, 0.62, 0.65], [-2.2, 1.0, 0.95, 0.25], [0, 1.15, 1.05, 0.1], [3.0, 1.15, 1.05, 0.1],
      [4.3, 0.98, 0.9, 0.05], [5.2, 0.5, 0.45, -0.1]], 10, [0.65, 0.65]);
    add(L.solid, P.box(1.5, 0.6, 4.4), c, [0, 1.35, -0.2]);
    add(L.glass, P.box(1.9, 0.7, 0.6), C.glass, [0, 0.45, 4.6], [-0.6, 0, 0]);
    add(L.glass, P.box(0.05, 0.7, 1.4), C.glass, [1.15, 0.35, 3.3]); mir(L.glass, 1);
    fin(L.solid, c, 0, 0.9, -9.0, -9.8, -9.6, -10.1, 2.3, 0.25, 0, false, L.team);
    plane(L.solid, c, tz(0, -9.0, -9.9, 2.2, -9.25, -9.9), 1.0, 0.08, 0);
    add(L.solid, P.box(0.12, 0.6, 0.12), DARK, [0.9, -1.2, 3.2]); mir(L.solid, 1); add(L.solid, P.box(0.1, 0.5, 0.1), DARK, [0, -0.5, -6.6]);
    if (!z20) { pod(L.solid, 0x8d8f86, 1.6, -0.3, 0.4, 0.16, 2.6, 0.2, 0.15, 0.4, 6); mir(L.solid, 1); }
    return done(L, o, z20 ? 'z20' : 'mh60', [rotor('rotor', z20 ? 5 : 4, 8.18, 0.53, DARK, [0, 2.15, 0.4]), trotor('trotor', 4, 1.68, 0.25, [0.32, 2.35, -9.95])]);
  }
  def('mh60', { name: 'MH-60R Seahawk', real: 'MH-60R Seahawk', role: 'naval helicopter (anti-submarine)', side: 'us', len: 19.8,
    anim: spin([['rotor', 'y', 13], ['trotor', 'x', 40]]) }, (K, o) => hawk(K, o, false));
  def('z20', { name: 'Z-20 helicopter', real: 'Harbin Z-20', role: 'utility helicopter', side: 'cn', len: 19.8,
    anim: spin([['rotor', 'y', 13], ['trotor', 'x', 40]]) }, (K, o) => hawk(K, o, true));

  def('ah64', { name: 'AH-64 Apache', real: 'AH-64E Apache Guardian', role: 'attack helicopter', side: 'us', len: 17.7,
    anim: spin([['rotor', 'y', 13], ['trotor', 'x', 40]]) }, (K, o) => {
    const L = K.lists(), c = C.oliveDark;
    body(L.solid, c, [[-8.2, 0.2, 0.3, 0.9], [-5, 0.3, 0.4, 0.75], [-2.2, 0.55, 0.6, 0.45], [-0.6, 0.75, 0.9, 0.2], [2.5, 0.62, 0.95, 0.15], [4.6, 0.52, 0.8, 0.1],
      [6.2, 0.38, 0.55, 0], [6.9, 0, 0, 0]], 10, [0.7, 0.7]);
    canopy(L.glass, 4.8, 0.62, 2.0, 0.48, 0.55); canopy(L.glass, 3.0, 0.95, 1.8, 0.5, 0.58);
    pod(L.solid, c, 0.95, 0.75, -0.8, 0.38, 3.0, 0.25, 0.3, 0.6); mir(L.solid, 1);
    plane(L.solid, c, tz(0.5, 0.9, -0.4, 2.45, 0.75, -0.3), 0.1, 0.12, 0);
    pod(L.solid, 0x575c45, 1.45, -0.35, 0.2, 0.28, 1.6, 0.15, 0.05, 0.9, 8); mir(L.solid, 1);
    for (const dx of [-0.16, 0.16]) for (const dy of [-0.28, -0.6]) { pod(L.solid, 0x575c45, 2.3 + dx, dy, 0.3, 0.09, 1.6, 0.25, 0.05, 0.9, 6); mir(L.solid, 1); }
    add(L.metal, P.cyl(0.05, 0.05, 1.5, 6), C.dark, [0, -0.85, 5.9], [H, 0, 0]);
    add(L.solid, P.sphere(0.25, 8, 6), c, [0, -0.7, 5.2]);
    add(L.solid, P.cyl(0.12, 0.14, 1.0, 8), C.steel, [0, 2.3, 0.2]);
    add(L.solid, P.cyl(0.55, 0.55, 0.45, 12), c, [0, 3.25, 0.2]);
    fin(L.solid, c, 0, 0.7, -6.9, -8.3, -8.0, -8.6, 1.9, 0.18, 0, false, L.team);
    plane(L.solid, c, tz(0, -7.3, -8.1, 1.7, -7.4, -8.1), 0.5, 0.06, 0);
    return done(L, o, 'ah64', [rotor('rotor', 4, 7.3, 0.53, DARK, [0, 2.8, 0.2]), trotor('trotor', 4, 1.4, 0.25, [-0.26, 2.4, -8.15])]);
  });

  def('ka52', { name: 'Ka-52 Alligator', real: 'Ka-52 Alligator', role: 'attack helicopter (coaxial rotors)', side: 'ru', len: 16,
    anim: spin([['rotor', 'y', 13], ['rotor2', 'y', -13]]) }, (K, o) => {
    const L = K.lists(), c = 0x3e4448;
    body(L.solid, c, [[-7.3, 0.25, 0.35, 0.6], [-4.5, 0.35, 0.45, 0.5], [-1.8, 0.75, 0.75, 0.3], [0.5, 0.95, 0.95, 0.15], [3.2, 0.95, 0.9, 0.1], [4.9, 0.8, 0.75, 0],
      [6.0, 0.45, 0.4, -0.1], [6.6, 0, 0, -0.15]], 10, [0.7, 0.7]);
    canopy(L.glass, 3.8, 0.62, 2.4, 0.9, 0.6);
    pod(L.solid, c, 1.0, 0.95, -0.5, 0.4, 2.8, 0.25, 0.3, 0.6); mir(L.solid, 1);
    plane(L.solid, c, tz(0.8, 0.6, -0.6, 2.9, 0.4, -0.4), 0.0, 0.12, 0);
    for (const x of [1.7, 2.6]) { pod(L.solid, 0x575c45, x, -0.35, 0.1, 0.2, 1.8, 0.2, 0.05, 0.9, 8); mir(L.solid, 1); }
    plane(L.solid, c, tz(0, -5.8, -6.8, 1.6, -6.1, -6.7), 0.6, 0.08, 0);
    fin(L.solid, c, 1.6, 0.2, -5.8, -6.7, -6.2, -6.9, 1.2, 0.06, 0, true, L.team);
    fin(L.solid, c, 0, 0.6, -5.6, -7.3, -6.8, -7.5, 1.4, 0.12, 0, false);
    add(L.solid, P.cyl(0.14, 0.18, 1.6, 8), C.steel, [0, 2.6, 0.4]);
    return done(L, o, 'ka52', [rotor('rotor', 3, 7.25, 0.55, DARK, [0, 2.3, 0.4]), rotor('rotor2', 3, 7.25, 0.55, DARK, [0, 3.25, 0.4])]);
  });

  // ================================================================== LOITERING MUNITIONS AND SMALL DRONES
  def('lancet', { name: 'Lancet loitering munition', real: 'ZALA Lancet-3', role: 'loitering attack drone', side: 'ru', len: 1.65, anim: spin([['prop', 'z', 40]]) }, (K, o) => {
    const L = K.lists(), c = 0x6e7166;
    body(L.solid, c, [[-0.82, 0.06, 0.06], [-0.7, 0.09, 0.09], [0.55, 0.09, 0.09], [0.75, 0.07, 0.07], [0.85, 0, 0]], 8);
    // two sets of X wings, front and rear
    for (const [z, sp] of [[0.42, 0.46], [-0.5, 0.44]]) for (let i = 0; i < 4; i++) {
      add(L.solid, P.slab(tz(0.07, z, z - 0.22, 0.07 + sp, z - 0.12, z - 0.24), 0.015), c, [0, 0, 0], [0, 0, (45 + 90 * i) * D]);
    }
    add(L.team, P.cyl(0.095, 0.095, 0.06, 8), null, [0, 0, 0.62], [H, 0, 0]);
    return done(L, o, 'lancet', [prop('prop', 2, 0.18, 0.03, DARK, [0, 0, -0.86])]);
  });

  // ALTIUS-700M / 600M: a tube-launched loitering munition, a slim body with one long straight wing on top, an X tail, a pusher propeller
  def('altius', { name: 'ALTIUS loitering munition', real: 'Anduril ALTIUS-700M / 600M', role: 'tube-launched loitering attack drone', side: 'tw', len: 1.9, anim: spin([['prop', 'z', 40]]) }, (K, o) => {
    const L = K.lists(), c = 0x7c8079;
    body(L.solid, c, [[-0.95, 0.07, 0.07], [-0.8, 0.1, 0.1], [0.6, 0.1, 0.1], [0.85, 0.07, 0.07], [0.95, 0, 0]], 8);
    add(L.solid, P.slab(tz(0, 0.2, 0.02, 1.25, 0.14, 0.06), 0.015), c, [0, 0.11, 0]); mir(L.solid, 1);
    for (let i = 0; i < 4; i++) add(L.solid, P.slab(tz(0.08, -0.62, -0.86, 0.3, -0.76, -0.9), 0.012), c, [0, 0, 0], [0, 0, (45 + 90 * i) * D]);
    add(L.team, P.cyl(0.105, 0.105, 0.06, 8), null, [0, 0, 0.5], [H, 0, 0]);
    add(L.solid, P.sphere(0.06, 8, 6), DARK, [0, -0.06, 0.82]);
    return done(L, o, 'altius', [prop('prop', 2, 0.2, 0.03, DARK, [0, 0, -0.97])]);
  });

  def('fpv', { name: 'FPV attack drone', real: 'FPV quadcopter with an RPG warhead', role: 'first-person-view kamikaze quadcopter', side: 'ua', len: 0.4,
    anim: spin([['rotor', 'y', 60]]) }, (K, o) => {
    const L = K.lists(), c = 0x26292b, kids = [];
    for (const a of [45, -45]) add(L.solid, P.box(0.34, 0.012, 0.025), c, [0, 0, 0], [0, a * D, 0]);
    add(L.solid, P.box(0.07, 0.035, 0.11), 0x3a3f44, [0, 0.022, 0]);
    add(L.solid, P.box(0.03, 0.03, 0.03), DARK, [0, 0.03, 0.065]);
    add(L.team, P.box(0.05, 0.012, 0.06), null, [0, 0.046, -0.01]);
    for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      add(L.metal, P.cyl(0.014, 0.014, 0.025, 8), C.steel, [x * 0.12, 0.012, z * 0.12]);
      kids.push(rotor('rotor', 3, 0.065, 0.016, 0x3c4a55, [x * 0.12, 0.03, z * 0.12], 0.01));
    }
    // the strapped-on RPG warhead pointing forward
    add(L.solid, P.cyl(0.03, 0.03, 0.14, 8), F.olive, [0, -0.03, 0.1], [H, 0, 0]);
    add(L.solid, P.cone(0.042, 0.11, 8), F.olive, [0, -0.03, 0.225], [H, 0, 0]);
    return done(L, o, 'fpv', kids);
  });

  // ================================================================== MUNITIONS: one parametric builder
  /* A missile, bomb or interceptor from a spec. Positions s are metres measured from the TAIL (0) to the tip (len).
     len, d (body diameter), col, nose 'ogive' | 'cone' | 'blunt' | 'bicone', nl (nose length), tailR (tail radius / R),
     prof: an explicit side profile [[s, r], ...] tail to tip (stages, necks, reentry vehicles), replaces body + nose,
     split: [s, colour] paints everything ahead of s another colour (a reentry vehicle, a seeker, a stage),
     flat / sh / seg: a non-round section (faceted stealth bodies), height = r * flat,
     fins: [{ at (root trailing edge), root, tip, span, sw (tip leading edge set back), n (4), roll (degrees, 45 = X), th, col, y }],
     band: s of the team-colour ring (false for none), motor: 'rocket' | 'jet', extra(L, z0, R, col): custom parts. */
  function nose(type, s0, nl, R) {
    if (type === 'cone') return [[s0 + nl * 0.97, R * 0.03], [s0 + nl, 0]];
    if (type === 'bicone') return [[s0 + nl * 0.45, R * 0.72], [s0 + nl * 0.97, R * 0.04], [s0 + nl, 0]];
    const out = [];
    if (type === 'blunt') { for (const t of [0.35, 0.65, 0.85, 0.96]) out.push([s0 + nl * t, R * Math.sqrt(1 - t * t)]); }
    else { const rho = (R * R + nl * nl) / (2 * R); for (const t of [0.25, 0.5, 0.7, 0.85, 0.95]) { const x = nl * t; out.push([s0 + x, Math.sqrt(rho * rho - x * x) + R - rho]); } }
    out.push([s0 + nl, 0]); return out;
  }
  function rAt(pr, s) {
    if (s <= pr[0][0]) return pr[0][1];
    for (let i = 0; i < pr.length - 1; i++) { const a = pr[i], b = pr[i + 1]; if (s >= a[0] && s <= b[0]) return b[0] === a[0] ? b[1] : a[1] + (b[1] - a[1]) * (s - a[0]) / (b[0] - a[0]); }
    return pr[pr.length - 1][1];
  }
  function missile(o, s, name) {
    const L = K.lists(), len = s.len, R = s.d / 2, z0 = -len / 2, col = s.col || C.white, fl = s.flat || 1;
    const nl = s.nl || R * 5;
    const pr = s.prof || [[0, R * (s.tailR || 0.92)], [Math.min(len * 0.05, R * 1.2), R], [len - nl, R]].concat(nose(s.nose || 'ogive', len - nl, nl, R));
    const st = (p) => [z0 + p[0], p[1], p[1] * fl, s.yc || 0];
    if (s.split) {
      const k = s.split[0], rk = rAt(pr, k);
      body(L.solid, col, pr.filter((p) => p[0] < k).concat([[k, rk]]).map(st), s.seg || 10, s.sh);
      body(L.solid, s.split[1], [[k, rk]].concat(pr.filter((p) => p[0] > k)).map(st), s.seg || 10, s.sh);
    } else body(L.solid, col, pr.map(st), s.seg || 10, s.sh);
    (s.fins || []).forEach((f) => {
      const n = f.n || 4, th = f.th || Math.max(0.008, s.d * 0.045), tip = Math.max(0.02, f.tip == null ? f.root * 0.4 : f.tip), sw = f.sw || 0;
      for (let i = 0; i < n; i++) {
        const ang = ((f.roll == null ? 45 : f.roll) + i * 360 / n) * D, r0 = rAt(pr, f.at + f.root * 0.5) * Math.hypot(Math.cos(ang), fl * Math.sin(ang)) * 0.9;
        const a = z0 + f.at, pts = [[r0, a + f.root], [r0 + f.span, a + f.root - sw], [r0 + f.span, a + f.root - sw - tip], [r0, a]];
        add(L.solid, P.slab(pts, th), f.col || col, [0, f.y || 0, 0], [0, 0, ang]);
      }
    });
    if (s.band !== false) {
      const b = s.band == null ? len * 0.62 : s.band, rb = rAt(pr, b) * 1.05 + 0.003;
      add(L.team, P.cyl(rb, rb, Math.max(0.025, s.d * 0.2), s.seg || 10), null, [0, s.yc || 0, z0 + b], [H, 0, 0], [1, 1, fl]);
    }
    const rn = Math.max(0.02, pr[0][1] * 0.72);
    if (s.motor === 'rocket') {
      add(L.glow, P.cyl(rn, rn, 0.02, 10), ROCKET, [0, 0, z0 - 0.012], [H, 0, 0]);
      add(L.glowAdd, P.cone(rn * 0.85, s.d * 1.2, 8), 0x6e4818, [0, 0, z0 - s.d * 0.6], [-H, 0, 0]);
      add(L.glowAdd, P.cone(rn * 1.3, s.d * 2.0, 8), 0x2e1606, [0, 0, z0 - s.d * 1.0], [-H, 0, 0]);
    } else if (s.motor === 'jet') add(L.glow, P.cyl(rn * 0.7, rn * 0.7, 0.02, 8), GLOW, [0, 0, z0 - 0.012], [H, 0, 0]);
    if (s.extra) s.extra(L, z0, R, col);
    return done(L, o, name);
  }
  const mdef = (type, meta, spec) => K.define(type, Object.assign({ cat: 'munition' }, meta), (K, o) => missile(o, spec, type));
  // a belly air intake for a cruise missile, s from the tail
  const scoop = (s, w, h, l) => (L, z0, R, col) => { add(L.solid, P.box(w, h, l), col, [0, -R - h * 0.35, z0 + s]); add(L.solid, P.box(w * 0.8, h * 0.7, 0.02), DARK, [0, -R - h * 0.35, z0 + s + l / 2 + 0.01]); };

  // ------------------------------------------------ the US and its partners: strike weapons
  mdef('tomahawk', { name: 'Tomahawk cruise missile', real: 'BGM-109 Tomahawk Block IV/V', role: 'ship- and sub-launched land-attack cruise missile', side: 'us', len: 5.56 },
    { len: 5.56, d: 0.52, col: 0x5b6166, nose: 'blunt', nl: 0.42, band: 4.3, motor: 'jet',
      fins: [{ n: 2, roll: 0, at: 2.45, root: 0.4, tip: 0.3, span: 1.08, sw: 0.06 }, { at: 0.03, root: 0.34, tip: 0.18, span: 0.3, sw: 0.14 }],
      extra: scoop(1.25, 0.24, 0.16, 0.7) });
  mdef('jassm', { name: 'JASSM stealth cruise missile', real: 'AGM-158 JASSM / JASSM-ER', role: 'air-launched stealthy cruise missile', side: 'us', len: 4.27 },
    { len: 4.27, d: 0.6, flat: 0.72, sh: [0.6, 0.6], seg: 8, col: 0x4c5257, nose: 'ogive', nl: 0.9, band: 3.0, motor: 'jet',
      fins: [{ n: 2, roll: 0, at: 1.25, root: 0.5, tip: 0.24, span: 0.95, sw: 0.4, y: 0.12 }, { n: 1, roll: 90, at: 0.03, root: 0.5, tip: 0.15, span: 0.3, sw: 0.32 }],
      extra: scoop(1.0, 0.22, 0.12, 0.6) });
  mdef('gbu57', { name: 'GBU-57 bunker buster', real: 'GBU-57A/B Massive Ordnance Penetrator', role: '13.6-tonne deep-penetrating bomb (B-2 only)', side: 'us', len: 6.2 },
    { len: 6.2, d: 0.8, col: 0x5f6658, nose: 'ogive', nl: 1.9, tailR: 0.7, band: 3.6,
      fins: [{ at: 0.04, root: 0.95, tip: 0.6, span: 0.42, sw: 0.25 }, { at: 1.6, root: 1.2, tip: 1.1, span: 0.06, sw: 0.05 }] });
  mdef('jdam', { name: 'JDAM guided bomb', real: 'GBU-31 JDAM (Mk 84, 2,000 lb)', role: 'GPS-guided bomb kit', side: 'us', len: 3.88 },
    { len: 3.88, d: 0.46, col: F.bomb, band: 2.4,
      prof: [[0, 0.15], [0.9, 0.2], [0.95, 0.23], [2.88, 0.23]].concat(nose('ogive', 2.88, 1.0, 0.23)),
      fins: [{ at: 0.02, root: 0.42, tip: 0.26, span: 0.3, sw: 0.14, col: 0x7f878f }, { at: 1.55, root: 0.75, tip: 0.7, span: 0.05, sw: 0.03 }],
      extra: (L, z0) => add(L.metal, P.cyl(0.205, 0.15, 0.9, 10), 0x7f878f, [0, 0, z0 + 0.45], [H, 0, 0]) });
  mdef('harm', { name: 'HARM anti-radar missile', real: 'AGM-88 HARM / AARGM', role: 'air-launched missile that homes on air-defence radars', side: 'us', len: 4.17 },
    { len: 4.17, d: 0.254, col: C.white, nose: 'ogive', nl: 0.62, band: 3.2, motor: 'rocket',
      fins: [{ at: 2.0, root: 0.78, tip: 0.06, span: 0.32, sw: 0.68 }, { at: 0.02, root: 0.34, tip: 0.12, span: 0.2, sw: 0.2 }] });
  mdef('atacms', { name: 'ATACMS ballistic missile', real: 'MGM-140 ATACMS', role: 'rocket-artillery ballistic missile (HIMARS)', side: 'us', len: 3.98 },
    { len: 3.98, d: 0.61, col: 0x5a6044, nose: 'ogive', nl: 1.1, band: 2.4, motor: 'rocket', fins: [{ at: 0.02, root: 0.55, tip: 0.12, span: 0.32, sw: 0.4 }] });
  mdef('storm_shadow', { name: 'Storm Shadow cruise missile', real: 'Storm Shadow / SCALP-EG', role: 'air-launched stealthy cruise missile', side: 'ua', len: 5.1 },
    { len: 5.1, d: 0.63, flat: 0.76, sh: [0.6, 0.6], seg: 8, col: 0x6b7177, nose: 'ogive', nl: 1.0, band: 3.6, motor: 'jet',
      fins: [{ n: 2, roll: 0, at: 1.9, root: 0.6, tip: 0.3, span: 1.2, sw: 0.5, y: -0.16 }, { at: 0.03, root: 0.45, tip: 0.2, span: 0.3, sw: 0.25 }],
      extra: scoop(1.0, 0.24, 0.14, 0.6) });

  // ------------------------------------------------ the Islamic Republic's ballistic and cruise missiles
  mdef('fateh110', { name: 'Fateh-110 ballistic missile', real: 'Fateh-110 (and Fateh-313)', role: 'short-range solid-fuel ballistic missile', side: 'ir', len: 8.86 },
    { len: 8.86, d: 0.61, col: 0xc6bf9e, nose: 'cone', nl: 2.3, band: 5.2, motor: 'rocket', split: [6.56, 0x6f6a5a],
      fins: [{ at: 6.15, root: 0.36, tip: 0.1, span: 0.22, sw: 0.26 }, { at: 0.04, root: 0.9, tip: 0.35, span: 0.5, sw: 0.55 }] });
  mdef('zolfaghar', { name: 'Zolfaghar ballistic missile', real: 'Zolfaghar (Fateh family)', role: 'short-range solid-fuel ballistic missile', side: 'ir', len: 10.3 },
    { len: 10.3, d: 0.68, col: 0x7a7d5c, nose: 'cone', nl: 2.6, band: 6.0, motor: 'rocket', split: [7.7, 0xd8d4c4],
      fins: [{ at: 7.3, root: 0.38, tip: 0.1, span: 0.24, sw: 0.28 }, { at: 0.04, root: 1.0, tip: 0.38, span: 0.52, sw: 0.6 }] });
  mdef('emad', { name: 'Emad ballistic missile', real: 'Emad (Shahab-3 family, steerable warhead)', role: 'medium-range liquid-fuel ballistic missile', side: 'ir', len: 15.5 },
    { len: 15.5, d: 1.25, col: 0xdcd8cc, band: 8.8, motor: 'rocket', split: [11.55, F.rv],
      prof: [[0, 0.6], [0.4, 0.625], [10.8, 0.625], [11.3, 0.36], [11.55, 0.36], [12.2, 0.47], [13.0, 0.41], [14.6, 0.2], [15.4, 0.035], [15.5, 0]],
      fins: [{ at: 0.04, root: 0.95, tip: 0.3, span: 0.36, sw: 0.55 }, { at: 12.05, root: 0.55, tip: 0.12, span: 0.2, sw: 0.36, col: F.rv }] });
  mdef('ghadr', { name: 'Ghadr ballistic missile', real: 'Ghadr-110 ("baby bottle" warhead)', role: 'medium-range liquid-fuel ballistic missile', side: 'ir', len: 15.86 },
    { len: 15.86, d: 1.25, col: 0x7c8260, band: 8.8, motor: 'rocket', split: [11.1, 0xdedad0],
      prof: [[0, 0.6], [0.4, 0.625], [10.6, 0.625], [11.05, 0.36], [11.45, 0.36], [12.05, 0.6], [12.6, 0.6], [13.6, 0.5], [14.6, 0.33], [15.4, 0.12], [15.86, 0]],
      fins: [{ at: 0.04, root: 0.95, tip: 0.3, span: 0.36, sw: 0.55 }] });
  mdef('kheibar_shekan', { name: 'Kheibar Shekan ballistic missile', real: 'Kheibar Shekan', role: 'medium-range solid-fuel ballistic missile (steerable warhead)', side: 'ir', len: 10.5 },
    { len: 10.5, d: 0.8, col: 0x8e9277, band: 5.0, motor: 'rocket', split: [7.0, 0x55585a],
      prof: [[0, 0.37], [0.3, 0.4], [7.0, 0.4], [7.4, 0.38], [8.8, 0.27], [10.0, 0.08], [10.5, 0]],
      fins: [{ at: 7.05, root: 0.62, tip: 0.14, span: 0.25, sw: 0.42, col: 0x55585a }] });
  mdef('sejjil', { name: 'Sejjil ballistic missile', real: 'Sejjil-2 (two-stage solid)', role: 'medium-range two-stage solid-fuel ballistic missile', side: 'ir', len: 17.6 },
    { len: 17.6, d: 1.25, col: 0xe2dfd6, band: 6.0, motor: 'rocket',
      prof: [[0, 0.58], [0.4, 0.625], [8.5, 0.625], [8.55, 0.6], [9.05, 0.6], [9.1, 0.625], [14.0, 0.625]].concat(nose('ogive', 14.0, 3.6, 0.625)),
      extra: (L, z0) => { add(L.solid, P.cyl(0.6, 0.6, 0.5, 10), 0x34373a, [0, 0, z0 + 8.8], [H, 0, 0]); add(L.solid, P.cyl(0.63, 0.63, 0.25, 10), 0x34373a, [0, 0, z0 + 15.0], [H, 0, 0]); } });
  mdef('fattah', { name: 'Fattah missile', real: 'Fattah-1 (claimed hypersonic glide warhead)', role: 'medium-range ballistic missile, claimed hypersonic', side: 'ir', len: 11.5 },
    { len: 11.5, d: 0.8, col: 0x9a9f8c, band: 4.6, motor: 'rocket', split: [7.2, 0x2f3236],
      prof: [[0, 0.37], [0.3, 0.4], [7.0, 0.4], [7.2, 0.33], [7.6, 0.33], [8.6, 0.28], [10.0, 0.15], [11.3, 0.03], [11.5, 0]],
      fins: [{ at: 7.6, root: 0.5, tip: 0.1, span: 0.18, sw: 0.38, col: 0x2f3236 }],
      extra: (L, z0) => add(L.solid, P.sphere(0.36, 10, 6), 0x2f3236, [0, 0, z0 + 7.25], null, [1, 1, 0.5]) });
  mdef('paveh', { name: 'Paveh cruise missile', real: 'Paveh (Soumar family)', role: 'ground-launched land-attack cruise missile', side: 'ir', len: 6.0 },
    { len: 6.0, d: 0.52, col: 0x8d969b, nose: 'ogive', nl: 0.8, band: 4.4, motor: 'jet',
      fins: [{ n: 2, roll: 0, at: 2.6, root: 0.42, tip: 0.3, span: 1.0, sw: 0.1 }, { at: 0.03, root: 0.36, tip: 0.18, span: 0.32, sw: 0.15 }],
      extra: (L, z0, R, col) => {
        // the turbojet carried outside, on top of the rear body
        body(L.solid, col, [[0.2, 0.13, 0.13], [0.5, 0.18, 0.18], [1.7, 0.18, 0.18], [1.9, 0.15, 0.15]], 8, null, [0, R + 0.14, z0]);
        add(L.solid, P.cyl(0.13, 0.13, 0.02, 8), DARK, [0, R + 0.14, z0 + 1.91], [H, 0, 0]);
        add(L.glow, P.cyl(0.09, 0.09, 0.02, 8), GLOW, [0, R + 0.14, z0 + 0.19], [H, 0, 0]);
        add(L.solid, P.box(0.08, 0.14, 0.9), col, [0, R + 0.02, z0 + 1.0]);
      } });

  // ------------------------------------------------ Russia
  mdef('iskander', { name: 'Iskander ballistic missile', real: '9M723 Iskander-M', role: 'short-range ballistic missile', side: 'ru', len: 7.3 },
    { len: 7.3, d: 0.92, col: 0x5c6448, nose: 'ogive', nl: 2.2, tailR: 0.95, band: 4.2, motor: 'rocket', fins: [{ at: 0.03, root: 0.62, tip: 0.36, span: 0.3, sw: 0.14 }] });
  mdef('kalibr', { name: 'Kalibr cruise missile', real: '3M-14 Kalibr', role: 'ship- and sub-launched land-attack cruise missile', side: 'ru', len: 6.2 },
    { len: 6.2, d: 0.533, col: 0x6d7377, nose: 'ogive', nl: 0.85, band: 4.6, motor: 'jet',
      fins: [{ n: 2, roll: 0, at: 2.5, root: 0.36, tip: 0.24, span: 1.25, sw: 0.16, y: -0.06 }, { at: 0.03, root: 0.36, tip: 0.16, span: 0.32, sw: 0.18 }],
      extra: scoop(1.3, 0.24, 0.15, 0.7) });
  mdef('kh101', { name: 'Kh-101 stealth cruise missile', real: 'Kh-101', role: 'air-launched stealthy cruise missile (Tu-95, Tu-160)', side: 'ru', len: 7.45 },
    { len: 7.45, d: 0.62, flat: 0.78, sh: [0.6, 0.6], seg: 8, col: 0x555b60, nose: 'ogive', nl: 1.3, band: 5.2, motor: 'jet',
      fins: [{ n: 2, roll: 0, at: 3.5, root: 0.42, tip: 0.3, span: 1.15, sw: 0.06, y: 0.14 }, { n: 3, roll: 90, at: 0.05, root: 0.6, tip: 0.2, span: 0.4, sw: 0.4 }],
      extra: (L, z0, R, col) => { body(L.solid, col, [[0.15, 0.12, 0.12], [0.4, 0.17, 0.17], [1.5, 0.17, 0.17], [1.7, 0.14, 0.14]], 8, null, [0, -R * 0.78 - 0.18, z0]);
        add(L.solid, P.cyl(0.12, 0.12, 0.02, 8), DARK, [0, -R * 0.78 - 0.18, z0 + 1.71], [H, 0, 0]); } });
  mdef('kinzhal', { name: 'Kinzhal air-launched missile', real: 'Kh-47M2 Kinzhal', role: 'air-launched aeroballistic missile (MiG-31K)', side: 'ru', len: 7.2 },
    { len: 7.2, d: 1.0, col: 0x9aa0a4, band: 4.2, split: [0.9, 0x9aa0a4],
      prof: [[0, 0.06], [0.45, 0.3], [0.9, 0.46], [1.3, 0.5], [5.0, 0.5]].concat(nose('ogive', 5.0, 2.2, 0.5)),
      fins: [{ at: 1.3, root: 0.5, tip: 0.3, span: 0.18, sw: 0.12 }] });

  // ------------------------------------------------ China and Taiwan
  mdef('df15', { name: 'DF-15 ballistic missile', real: 'Dongfeng-15', role: 'short-range ballistic missile', side: 'cn', len: 9.1 },
    { len: 9.1, d: 1.0, col: 0x5d6650, nose: 'bicone', nl: 2.6, band: 5.0, motor: 'rocket', split: [6.5, 0xd6d6cc], fins: [{ at: 0.03, root: 0.72, tip: 0.34, span: 0.36, sw: 0.32 }] });
  mdef('df21d', { name: 'DF-21D anti-ship ballistic missile', real: 'Dongfeng-21D ("carrier killer")', role: 'anti-ship ballistic missile', side: 'cn', len: 10.7 },
    { len: 10.7, d: 1.4, col: 0x5d6650, band: 5.6, motor: 'rocket', split: [7.6, 0xdcdcd4],
      prof: [[0, 0.66], [0.4, 0.7], [5.3, 0.7], [5.35, 0.67], [5.55, 0.67], [5.6, 0.7], [7.6, 0.7], [8.4, 0.58], [10.0, 0.18], [10.65, 0.03], [10.7, 0]],
      fins: [{ at: 7.6, root: 0.62, tip: 0.15, span: 0.28, sw: 0.42, col: 0xdcdcd4 }] });
  mdef('df17', { name: 'DF-17 hypersonic glide missile', real: 'Dongfeng-17 with DF-ZF glide vehicle', role: 'ballistic missile carrying a hypersonic glide vehicle', side: 'cn', len: 11 },
    { len: 11, d: 0.88, col: 0x5d6650, band: 4.5, motor: 'rocket',
      prof: [[0, 0.42], [0.3, 0.44], [7.6, 0.44], [7.9, 0.3]],
      fins: [{ at: 0.03, root: 0.7, tip: 0.3, span: 0.34, sw: 0.32 }],
      extra: (L, z0) => {
        // the wedge-shaped glide vehicle: flat underside, pointed nose, two canted tail fins
        const g = 0x2f3133;
        body(L.solid, g, [[z0 + 7.6, 0.44, 0.2, -0.02], [z0 + 8.6, 0.38, 0.18, 0.0], [z0 + 9.8, 0.24, 0.12, 0.02], [z0 + 10.8, 0.06, 0.04, 0.03], [z0 + 11, 0, 0, 0.03]], 10, [0.8, 1.1]);
        add(L.solid, P.slab(tz(0.38, z0 + 8.2, z0 + 7.6, 0.8, z0 + 7.8, z0 + 7.55), 0.03), g, [0, 0.05, 0], [0, 0, 35 * D]); mir(L.solid, 1);
      } });
  mdef('df26', { name: 'DF-26 ballistic missile', real: 'Dongfeng-26 ("Guam killer")', role: 'intermediate-range two-stage ballistic missile, reaches Guam', side: 'cn', len: 14 },
    { len: 14, d: 1.4, col: 0x5d6650, band: 6.4, motor: 'rocket', split: [10.4, 0xdcdcd4],
      prof: [[0, 0.66], [0.4, 0.7], [6.4, 0.7], [6.45, 0.67], [6.7, 0.67], [6.75, 0.7], [10.4, 0.7], [11.2, 0.6], [13.1, 0.2], [13.95, 0.03], [14, 0]],
      fins: [{ at: 10.45, root: 0.7, tip: 0.16, span: 0.3, sw: 0.46, col: 0xdcdcd4 }] });

  // ------------------------------------------------ Ukraine's own missiles
  mdef('neptune', { name: 'Neptune cruise missile', real: 'R-360 Neptune · Long Neptune', role: 'ground-launched anti-ship and land-attack cruise missile', side: 'ua', len: 5.05 },
    { len: 5.05, d: 0.38, col: 0x7d8478, nose: 'ogive', nl: 0.55, band: 3.5, motor: 'jet',
      fins: [{ at: 2.3, root: 0.6, tip: 0.3, span: 0.42, sw: 0.24 }, { at: 0.05, root: 0.34, tip: 0.18, span: 0.26, sw: 0.14 }],
      extra: scoop(2.0, 0.2, 0.12, 0.7) });
  // FP-5 Flamingo: a large cruise missile with its turbojet in a pod on top of the tail, like the old V-1, and a straight wing
  mdef('flamingo', { name: 'Flamingo cruise missile', real: 'Fire Point FP-5 Flamingo', role: 'long-range ground-launched cruise missile', side: 'ua', len: 12 },
    { len: 12, d: 0.9, col: 0x8a9296, nose: 'ogive', nl: 1.5, band: 8.6, motor: 'rocket',
      fins: [{ n: 2, roll: 0, at: 5.2, root: 1.1, tip: 0.8, span: 2.4, sw: 0.2 }, { at: 0.05, root: 0.7, tip: 0.35, span: 0.6, sw: 0.3 }],
      extra: (L, z0, R, col) => {
        body(L.solid, col, [[-0.6, 0.26, 0.26], [0.0, 0.36, 0.36], [3.0, 0.36, 0.36], [3.4, 0.3, 0.3]], 8, null, [0, R + 0.3, z0]);
        add(L.solid, P.cyl(0.28, 0.28, 0.02, 8), DARK, [0, R + 0.3, z0 + 3.41], [H, 0, 0]);
        add(L.glow, P.cyl(0.2, 0.2, 0.02, 8), GLOW, [0, R + 0.3, z0 - 0.61], [H, 0, 0]);
        add(L.solid, P.box(0.14, 0.3, 1.6), col, [0, R + 0.08, z0 + 1.6]);
      } });

  mdef('yj12', { name: 'YJ-12 anti-ship missile', real: 'YJ-12 (supersonic ramjet)', role: 'supersonic anti-ship cruise missile', side: 'cn', len: 6.3 },
    { len: 6.3, d: 0.6, col: 0xc4c8c8, nose: 'ogive', nl: 1.4, band: 4.7, motor: 'jet',
      fins: [{ at: 2.6, root: 1.0, tip: 0.12, span: 0.3, sw: 0.82 }, { at: 0.03, root: 0.46, tip: 0.18, span: 0.3, sw: 0.22 }],
      extra: (L, z0, R, col) => {
        // four long angular ramjet inlets around the body
        for (let i = 0; i < 4; i++) {
          const a = i * H;
          body(L.solid, col, [[0.3, 0.07, 0.11, 0], [0.6, 0.11, 0.14, 0], [3.7, 0.11, 0.14, 0], [3.8, 0.11, 0.14, 0]], 6, [0.6, 0.6], [0, 0, z0], [0, 0, 0]);
          const g = L.solid[L.solid.length - 1].g; g.translate(0, R + 0.06, 0); g.rotateZ(a);
          add(L.solid, P.box(0.18, 0.24, 0.02), DARK, [0, 0, 0]); const m = L.solid[L.solid.length - 1].g; m.translate(0, R + 0.06, z0 + 3.81); m.rotateZ(a);
        }
      } });
  mdef('hf2e', { name: 'Hsiung Feng IIE cruise missile', real: 'Hsiung Feng IIE', role: 'ground-launched land-attack cruise missile', side: 'tw', len: 6.9 },
    { len: 6.9, d: 0.52, col: 0xb9bec0, nose: 'ogive', nl: 0.8, band: 5.2, motor: 'rocket', split: [0.95, 0xb9bec0],
      prof: [[0, 0.24], [0.9, 0.26], [0.95, 0.24], [1.0, 0.26], [6.1, 0.26]].concat(nose('ogive', 6.1, 0.8, 0.26)),
      fins: [{ n: 2, roll: 0, at: 3.4, root: 0.38, tip: 0.26, span: 0.95, sw: 0.12, y: -0.05 }, { at: 1.0, root: 0.36, tip: 0.16, span: 0.3, sw: 0.18 },
        { at: 0.02, root: 0.5, tip: 0.3, span: 0.32, sw: 0.15, col: 0x55595c }],
      extra: (L, z0) => { add(L.solid, P.cyl(0.262, 0.262, 0.92, 10), 0x55595c, [0, 0, z0 + 0.46], [H, 0, 0]); scoop(2.0, 0.22, 0.14, 0.6)(L, z0, 0.26, 0xb9bec0); } });

  // ------------------------------------------------ interceptors
  mdef('pac3', { name: 'Patriot PAC-3 MSE interceptor', real: 'PAC-3 MSE (Patriot)', role: 'hit-to-kill missile-defence interceptor', side: 'us', len: 5.2 },
    { len: 5.2, d: 0.29, col: C.white, nose: 'ogive', nl: 0.9, band: 2.6, motor: 'rocket', fins: [{ at: 0.03, root: 0.58, tip: 0.34, span: 0.24, sw: 0.22 }],
      extra: (L, z0) => add(L.solid, P.cyl(0.152, 0.152, 0.22, 10), 0x2c3034, [0, 0, z0 + 4.05], [H, 0, 0]) });
  mdef('gemt', { name: 'Patriot GEM-T interceptor', real: 'MIM-104E PAC-2 GEM-T', role: 'air- and missile-defence interceptor', side: 'us', len: 5.31 },
    { len: 5.31, d: 0.41, col: C.white, nose: 'ogive', nl: 1.05, band: 3.0, motor: 'rocket', fins: [{ at: 0.03, root: 1.05, tip: 0.55, span: 0.42, sw: 0.42 }] });
  // 'thaad' is also the land.js battery id (registered later, so it wins there); 'thaad_int' always reaches this interceptor
  const THAAD_META = { name: 'THAAD interceptor', real: 'THAAD', role: 'high-altitude hit-to-kill missile-defence interceptor', side: 'us', len: 6.17 },
    THAAD = { len: 6.17, d: 0.34, col: C.white, band: 3.4, motor: 'rocket', split: [4.35, 0xcfd2d4],
      prof: [[0, 0.27], [0.62, 0.17], [4.35, 0.17], [5.3, 0.13], [6.1, 0.02], [6.17, 0]],
      extra: (L, z0) => add(L.solid, P.cyl(0.172, 0.172, 0.12, 10), 0x2c3034, [0, 0, z0 + 4.3], [H, 0, 0]) };
  mdef('thaad', THAAD_META, THAAD); mdef('thaad_int', THAAD_META, THAAD);
  mdef('sm3', { name: 'SM-3 interceptor', real: 'RIM-161 Standard Missile 3', role: 'ship-launched exo-atmospheric missile-defence interceptor', side: 'us', len: 6.55 },
    { len: 6.55, d: 0.53, col: C.white, band: 3.3, motor: 'rocket', split: [1.75, C.white],
      prof: [[0, 0.25], [0.2, 0.265], [1.7, 0.265], [1.75, 0.17], [4.55, 0.17], [4.6, 0.15], [5.4, 0.15]].concat(nose('ogive', 5.4, 1.15, 0.15)),
      fins: [{ at: 0.03, root: 0.6, tip: 0.42, span: 0.3, sw: 0.15, col: 0x9ba2a7 }, { at: 1.8, root: 0.45, tip: 0.25, span: 0.25, sw: 0.18 }, { at: 2.6, root: 1.9, tip: 1.6, span: 0.08, sw: 0.2 }],
      extra: (L, z0) => add(L.solid, P.cyl(0.268, 0.268, 1.5, 10), 0x9ba2a7, [0, 0, z0 + 0.95], [H, 0, 0]) });
  mdef('sm6', { name: 'SM-6 interceptor', real: 'RIM-174 Standard Missile 6', role: 'ship-launched air- and missile-defence interceptor', side: 'us', len: 6.6 },
    { len: 6.6, d: 0.53, col: C.white, band: 3.4, motor: 'rocket',
      prof: [[0, 0.25], [0.2, 0.265], [1.7, 0.265], [1.75, 0.17], [5.55, 0.17]].concat(nose('ogive', 5.55, 1.05, 0.17)),
      fins: [{ at: 0.03, root: 0.6, tip: 0.42, span: 0.3, sw: 0.15, col: 0x9ba2a7 }, { at: 1.8, root: 0.45, tip: 0.25, span: 0.26, sw: 0.18 }, { at: 2.4, root: 2.7, tip: 2.4, span: 0.09, sw: 0.25 }],
      extra: (L, z0) => add(L.solid, P.cyl(0.268, 0.268, 1.5, 10), 0x9ba2a7, [0, 0, z0 + 0.95], [H, 0, 0]) });
  mdef('arrow3', { name: 'Arrow 3 interceptor', real: 'Arrow 3 (Hetz 3)', role: 'exo-atmospheric missile-defence interceptor', side: 'il', len: 7.0 },
    { len: 7.0, d: 0.8, col: C.white, band: 2.4, motor: 'rocket', split: [3.5, 0x8d9499],
      prof: [[0, 0.38], [0.3, 0.4], [3.5, 0.4], [4.1, 0.25], [5.6, 0.25], [6.9, 0.03], [7.0, 0]] });
  mdef('arrow2', { name: 'Arrow 2 interceptor', real: 'Arrow 2 (Hetz 2)', role: 'upper-atmosphere missile-defence interceptor', side: 'il', len: 6.8 },
    { len: 6.8, d: 0.8, col: C.white, band: 2.0, motor: 'rocket',
      prof: [[0, 0.38], [0.3, 0.4], [3.35, 0.4], [3.5, 0.25], [5.4, 0.25]].concat(nose('ogive', 5.4, 1.4, 0.25)),
      fins: [{ at: 0.03, root: 0.8, tip: 0.4, span: 0.38, sw: 0.3 }, { at: 3.55, root: 0.4, tip: 0.18, span: 0.2, sw: 0.18 }] });
  mdef('stunner', { name: 'David\'s Sling Stunner interceptor', real: 'Stunner (David\'s Sling)', role: 'medium-range missile-defence interceptor', side: 'il', len: 4.6 },
    { len: 4.6, d: 0.23, col: C.white, band: 2.0, motor: 'rocket',
      prof: [[0, 0.11], [0.2, 0.115], [3.95, 0.115]],
      fins: [{ at: 0.03, root: 0.5, tip: 0.18, span: 0.22, sw: 0.28 }, { at: 3.0, root: 0.32, tip: 0.1, span: 0.08, sw: 0.18 }],
      extra: (L, z0) => {
        // the asymmetric "dolphin" nose: a drooped, slanted seeker tip
        body(L.solid, 0x26292c, [[z0 + 3.95, 0.115, 0.115, 0], [z0 + 4.2, 0.108, 0.1, -0.012], [z0 + 4.42, 0.075, 0.062, -0.035], [z0 + 4.56, 0.03, 0.025, -0.06], [z0 + 4.6, 0, 0, -0.065]], 10);
      } });
  mdef('tamir', { name: 'Iron Dome Tamir interceptor', real: 'Tamir (Iron Dome)', role: 'short-range rocket and drone interceptor', side: 'il', len: 3.0 },
    { len: 3.0, d: 0.16, col: C.white, nose: 'ogive', nl: 0.42, band: 1.6, motor: 'rocket',
      fins: [{ at: 2.22, root: 0.18, tip: 0.05, span: 0.09, sw: 0.12 }, { at: 0.03, root: 0.36, tip: 0.1, span: 0.13, sw: 0.25 }] });
  mdef('s300m', { name: 'S-300 interceptor', real: '48N6 (S-300PMU / S-400)', role: 'long-range air-defence interceptor', side: 'ru', len: 7.5 },
    { len: 7.5, d: 0.515, col: C.offwhite, nose: 'ogive', nl: 1.5, band: 4.4, motor: 'rocket', fins: [{ at: 0.03, root: 0.62, tip: 0.32, span: 0.32, sw: 0.25, roll: 0 }] });
  mdef('sayyad4', { name: 'Sayyad-4 interceptor', real: 'Sayyad-4 (Bavar-373)', role: 'long-range air-defence interceptor', side: 'ir', len: 7.5 },
    { len: 7.5, d: 0.515, col: 0xd9d5c6, nose: 'ogive', nl: 1.3, band: 4.6, motor: 'rocket',
      fins: [{ at: 0.03, root: 0.6, tip: 0.3, span: 0.34, sw: 0.24 }, { at: 1.7, root: 3.0, tip: 2.7, span: 0.1, sw: 0.25 }] });
  mdef('hq9', { name: 'HQ-9 interceptor', real: 'HQ-9', role: 'long-range air-defence interceptor', side: 'cn', len: 6.8 },
    { len: 6.8, d: 0.47, col: 0xc5c8bf, nose: 'ogive', nl: 1.3, band: 4.0, motor: 'rocket',
      fins: [{ at: 0.03, root: 0.62, tip: 0.3, span: 0.32, sw: 0.28 }, { at: 5.0, root: 0.32, tip: 0.1, span: 0.12, sw: 0.2 }] });
  mdef('tk3', { name: 'Tien Kung III interceptor', real: 'Tien Kung III (Sky Bow III)', role: 'long-range air- and missile-defence interceptor', side: 'tw', len: 5.3 },
    { len: 5.3, d: 0.41, col: C.white, nose: 'ogive', nl: 0.95, band: 3.6, motor: 'rocket',
      fins: [{ at: 0.03, root: 0.62, tip: 0.3, span: 0.3, sw: 0.26 }, { at: 1.5, root: 2.1, tip: 1.9, span: 0.1, sw: 0.15 }] });
  mdef('aim120', { name: 'AMRAAM air-to-air missile', real: 'AIM-120 AMRAAM', role: 'radar-guided air-to-air missile (also NASAMS)', side: 'us', len: 3.66 },
    { len: 3.66, d: 0.178, col: 0xd9dcdc, nose: 'ogive', nl: 0.55, band: 2.6, motor: 'rocket',
      fins: [{ at: 1.95, root: 0.46, tip: 0.05, span: 0.16, sw: 0.38 }, { at: 0.02, root: 0.3, tip: 0.12, span: 0.17, sw: 0.15 }] });
  mdef('iris_t', { name: 'IRIS-T missile', real: 'IRIS-T / IRIS-T SLM', role: 'short-range air-to-air and air-defence missile', side: 'ua', len: 2.94 },
    { len: 2.94, d: 0.127, col: 0xc9cccc, nose: 'ogive', nl: 0.36, band: 2.2, motor: 'rocket',
      fins: [{ at: 0.95, root: 1.4, tip: 1.2, span: 0.04, sw: 0.1 }, { at: 0.02, root: 0.25, tip: 0.1, span: 0.12, sw: 0.12 }] });
}
