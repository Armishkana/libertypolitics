/* SIMKIT fx.js: explosions, fire, smoke, trails, tracers, muzzle flashes, interceptions, tear gas, shockwaves.
   Contract (the calls and the kinds): build/simkit/SIMKIT.md. Never restate it elsewhere.

   How it draws: ONE instanced mesh of camera-facing quads (one draw call for every particle), sorted back to front each
   frame, blended premultiplied so a single particle can glow (additive), occlude (smoke) or cool from one into the other
   (a fireball that turns into black smoke). The look comes from a procedural atlas built once at start: eight boiling
   fireball frames (a flipbook), four lit smoke puffs, a soft glow, a ring, a spark and a spray. Debris is a second
   instanced mesh of small dark chunks with gravity and spin; flashes borrow a small pool of point lights that light the
   models around them. Everything is pooled: nothing allocates per frame. Sizes are in units of the size argument, so a
   call reads the same on a 2,000-unit theatre board and on a 50-unit gallery cell. */
const ATLAS = {};                                                       // the atlas pixels, built once per page and shared by every FX
export default function makeFX(K, scene, camera, o) {
  o = o || {};
  const T = K.T;
  const narrow = typeof innerWidth !== 'undefined' && innerWidth < 760;
  const MAX = Math.max(256, Math.floor(o.max || (narrow ? 2500 : 6000)));
  const Q = o.quality != null ? o.quality : narrow ? 0.55 : 1;           // particle counts per call
  const SCALE = o.scale || 1;
  const NL = o.lights != null ? o.lights : narrow ? 1 : 4;              // pooled point lights (constant count: no shader recompiles)
  const DMAX = narrow ? 160 : 420;                                       // debris chunks
  const EMAX = 128;                                                      // emitters (fires, smoke columns, trails, cook-off chains)
  let WX = 0.94, WZ = 0.34;                                              // wind direction (speed is per particle, in its own size units)
  if (o.wind) { const l = Math.hypot(o.wind[0], o.wind[2]) || 1; WX = o.wind[0] / l; WZ = o.wind[2] / l; }

  // ============================================================ the atlas: 4 x 4 cells, built once, procedurally
  const FB = 0, SMK = 8, GLOW = 12, RING = 13, SPARK = 14, SPRAY = 15;   // cells 0-7 fireball flipbook, 8-11 smoke puffs
  const atlas = buildAtlas(narrow ? 128 : 192);

  function buildAtlas(C) {
    const W = C * 4;
    if (!ATLAS[C]) ATLAS[C] = atlasData(C, W);
    const tex = new T.DataTexture(ATLAS[C], W, W, T.RGBAFormat, T.UnsignedByteType);
    tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.needsUpdate = true;
    return tex;
  }
  function atlasData(C, W) {
    const data = new Uint8Array(W * W * 4);
    // improved Perlin noise, seeded
    const perm = new Uint8Array(512); { const p = []; for (let i = 0; i < 256; i++) p[i] = i; let s = 1337; for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); const t = p[i]; p[i] = p[j]; p[j] = t; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10), lerp = (a, b, t) => a + (b - a) * t;
    const grad = (h, x, y, z) => { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
    function noise(x, y, z) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255; x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z), A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
      return lerp(lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u), lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
        lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u), lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
    }
    // billowy fbm (cauliflower lobes) in 0..1
    function billow(x, y, z, oct) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * Math.abs(noise(x * f, y * f, z * f)); n += a; a *= 0.5; f *= 2.03; } return Math.max(0, Math.min(1, s / n * 2.2)); }
    function fbm(x, y, z, oct) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2.03; } return Math.max(0, Math.min(1, 0.5 + s / n * 0.9)); }
    const F = new Float32Array(C * C), G = new Float32Array(C * C);
    const L = [-0.42, 0.78, 0.46]; { const l = Math.hypot(L[0], L[1], L[2]); L[0] /= l; L[1] /= l; L[2] /= l; }
    const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    // write one cell: dens (R), detail/heat (G), top-lit shading (B) computed from the field's slope and a sphere normal
    function put(cell, densOf, bump) {
      const cx = (cell % 4) * C, cy = Math.floor(cell / 4) * C;     // row 0 at the bottom (DataTexture, no flip)
      for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
        const i = y * C + x, u = (x + 0.5) / C * 2 - 1, v = (y + 0.5) / C * 2 - 1, r = Math.hypot(u, v);
        const xl = x > 0 ? i - 1 : i, xr = x < C - 1 ? i + 1 : i, yd = y > 0 ? i - C : i, yu = y < C - 1 ? i + C : i;
        const dx = (F[xr] - F[xl]) * C * 0.25, dy = (F[yu] - F[yd]) * C * 0.25;
        const sz = Math.sqrt(Math.max(0, 1 - Math.min(1, r * r)));
        let nx = u * 0.4 - dx * bump, ny = v * 0.4 - dy * bump, nz = sz * 0.5 + 0.5; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        const sh = Math.max(0, Math.min(1, (nx * L[0] + ny * L[1] + nz * L[2]) * 0.55 + 0.45));
        const d = densOf(i, r), o4 = ((cy + y) * W + cx + x) * 4;
        data[o4] = Math.round(Math.max(0, Math.min(1, d)) * 255); data[o4 + 1] = Math.round(Math.max(0, Math.min(1, G[i])) * 255); data[o4 + 2] = Math.round(sh * 255); data[o4 + 3] = 255;
      }
    }
    // fireball flipbook: the same ball boiling, from compact and dense (frame 0) to broken and wispy (frame 7)
    for (let k = 0; k < 8; k++) {
      const tz = k * 0.36, br = k / 7;
      for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
        const i = y * C + x, u = (x + 0.5) / C * 2 - 1, v = (y + 0.5) / C * 2 - 1, r = Math.hypot(u, v);
        const wx = noise(u * 1.6 + 11, v * 1.6, tz) * 0.42, wy = noise(u * 1.6, v * 1.6 + 23, tz) * 0.42;
        const n = 0.55 * fbm(u * 2.0 + wx, v * 2.0 + wy - tz * 0.3, tz * 0.8 + 3, 4) + 0.45 * billow(u * 2.6 + wx, v * 2.6 + wy - tz * 0.3, tz * 0.8 + 9, 3);
        const f = 1 - r * (1.06 + br * 0.12) + (n - 0.5) * (0.85 + br * 0.75) + 0.1 - br * 0.05;
        F[i] = f * sstep(1.0, 0.82, r);
        const ridge = 1 - Math.abs(noise(u * 4.2 + wx * 2, v * 4.2 + wy * 2, tz + 7));
        G[i] = Math.max(0, Math.min(1, f * 1.45)) * (0.4 + 0.7 * ridge * ridge);
      }
      put(FB + k, (i) => sstep(0.0, 0.3 + br * 0.08, F[i]), 0.1);
    }
    // smoke puffs: several overlapping lobes with billowy detail, lit from the top left
    for (let k = 0; k < 4; k++) {
      let s = 977 + k * 131; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const lobes = []; for (let j = 0; j < 7; j++) { const a = rnd() * 6.283, d = rnd() * 0.3; lobes.push([Math.cos(a) * d, Math.sin(a) * d * 0.85 + 0.03, 0.24 + rnd() * 0.17]); }
      for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
        const i = y * C + x, u = (x + 0.5) / C * 2 - 1, v = (y + 0.5) / C * 2 - 1, r = Math.hypot(u, v);
        let b = 0; for (let j = 0; j < lobes.length; j++) { const q = lobes[j], dd = Math.hypot(u - q[0], v - q[1]) / q[2]; b += Math.exp(-dd * dd * 1.6); }
        const n = 0.6 * fbm(u * 2.1 + k * 17.3, v * 2.1 - k * 5.1, k * 3.7, 4) + 0.4 * billow(u * 2.8 + k * 7.7, v * 2.8 + k * 3.3, k * 1.9 + 5, 3);
        const f = Math.min(1.4, b) * (0.5 + 0.8 * n) - 0.3;
        F[i] = f * sstep(0.98, 0.5, r); G[i] = n;
      }
      put(SMK + k, (i) => { const d = sstep(0.0, 0.55, F[i]); return d * d * (1.6 - 0.6 * d); }, 0.09);
    }
    // glow, ring, spark: analytic, unlit
    const flat = (cell, fn) => { for (let i = 0; i < C * C; i++) { F[i] = 0; G[i] = 0; } put(cell, (i, r) => fn(r), 0); };
    flat(GLOW, (r) => Math.max(0, Math.exp(-r * r * 4.2) * 0.85 + Math.pow(Math.max(0, 1 - r), 3) * 0.3 - 0.01) * sstep(1, 0.9, r));
    flat(RING, (r) => Math.min(1, Math.exp(-Math.pow((r - 0.8) / 0.11, 2)) * 0.8 + Math.pow(Math.min(1, r / 0.8), 3) * 0.28 * (r < 0.8 ? 1 : 0)) * sstep(1, 0.9, r));
    flat(SPARK, (r) => Math.min(1, Math.exp(-r * r * 7) * 1.15 + Math.exp(-r * r * 2.2) * 0.25) * sstep(1, 0.88, r));
    // spray: streaky upward droplets (water columns, thrown earth)
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
      const i = y * C + x, u = (x + 0.5) / C * 2 - 1, v = (y + 0.5) / C * 2 - 1, r = Math.hypot(u * 1.15, v * 0.9);
      const n = fbm(u * 4.2, v * 1.3, 9.1, 4), m = fbm(u * 2.4 + 4, v * 2.4, 2.2, 3);
      F[i] = ((1 - r) * 1.15 + (n - 0.5) * 1.0 + (m - 0.5) * 0.7) * sstep(1.0, 0.75, Math.hypot(u, v)); G[i] = n;
    }
    put(SPRAY, (i) => sstep(0.05, 0.55, F[i]), 0.06);
    return data;
  }

  // ============================================================ the particle mesh
  const geo = new T.InstancedBufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const A0 = new Float32Array(MAX * 4), A1 = new Float32Array(MAX * 4), A2 = new Float32Array(MAX * 4), A3 = new Float32Array(MAX * 4);
  const attr = [A0, A1, A2, A3].map((arr, k) => { const a = new T.InstancedBufferAttribute(arr, 4); a.setUsage(T.DynamicDrawUsage); geo.setAttribute('a' + k, a); return a; });
  geo.instanceCount = 0;
  const uni = {
    uTex: { value: atlas }, uLight: { value: 1 }, uInvView: { value: camera.matrixWorld },
    uFog: { value: new T.Vector3(1e6, 2e6, 0) }, uFogMode: { value: 0 }
  };
  const mat = new T.ShaderMaterial({
    uniforms: uni, transparent: true, side: T.DoubleSide, depthWrite: false, depthTest: true, toneMapped: false,
    blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor,
    vertexShader: [
      'attribute vec4 a0; attribute vec4 a1; attribute vec4 a2; attribute vec4 a3;',
      'uniform mat4 uInvView; uniform vec3 uFog; uniform float uFogMode;',
      'varying vec2 vUa; varying vec2 vUb; varying float vMix; varying vec4 vCol; varying float vHeat; varying float vAdd; varying float vVert; varying float vLitK; varying float vFog; varying float vSoft;',
      'vec2 cellUV(float c, vec2 q){ return (vec2(mod(c, 4.0), floor(c / 4.0)) + q * 0.485 + 0.5) / 4.0; }',
      'void main(){',
      '  vec2 cr = position.xy; float size = abs(a0.w); float rot = a1.w; float cs = cos(rot), sn = sin(rot);',
      '  vec2 rc = vec2(cr.x * cs - cr.y * sn, cr.x * sn + cr.y * cs); vec4 mv; vVert = rc.y * 0.5 + 0.5; vSoft = 1e3;',
      '  if (a0.w < 0.0) { mv = modelViewMatrix * vec4(a0.xyz + vec3(rc.x, 0.0, -rc.y) * size, 1.0); vVert = 1.0; }',
      '  else if (dot(a1.xyz, a1.xyz) > 1e-10) {',
      '    vec4 v0 = modelViewMatrix * vec4(a0.xyz, 1.0); vec4 v1 = modelViewMatrix * vec4(a0.xyz - a1.xyz, 1.0);',
      '    vec2 d = v0.xy - v1.xy; float L = length(d); vec2 ax = L > 1e-6 ? d / L : vec2(0.0, 1.0); vec2 pp = vec2(ax.y, -ax.x);',
      '    mv = mix(v1, v0, cr.y * 0.5 + 0.5); mv.xy += pp * cr.x * size + ax * cr.y * size; vVert = 0.7;',
      '  } else { mv = modelViewMatrix * vec4(a0.xyz, 1.0); mv.xy += rc * size; }',
      '  if (a0.w > 0.0 && a3.w > -1e8) { vec4 w = uInvView * mv; vSoft = (w.y - a3.w) / max(size * 0.55, 1e-4); }',
      '  float f = a3.x; float ca = floor(f); vMix = f - ca; float cb = ca < 8.0 ? mod(ca + 1.0, 8.0) : ca; if (ca >= 8.0) vMix = 0.0;',
      '  vUa = cellUV(ca, cr); vUb = cellUV(cb, cr); vLitK = (ca < 12.0 || ca > 14.5) ? 1.0 : 0.0;',
      '  vCol = a2; vHeat = a3.y; vAdd = a3.z; float dz = -mv.z;',
      '  vFog = uFogMode < 0.5 ? 0.0 : (uFogMode < 1.5 ? smoothstep(uFog.x, uFog.y, dz) : 1.0 - exp(-uFog.z * uFog.z * dz * dz));',
      '  gl_Position = projectionMatrix * mv;',
      '}'].join('\n'),
    fragmentShader: [
      'uniform sampler2D uTex; uniform float uLight;',
      'varying vec2 vUa; varying vec2 vUb; varying float vMix; varying vec4 vCol; varying float vHeat; varying float vAdd; varying float vVert; varying float vLitK; varying float vFog; varying float vSoft;',
      'vec3 ramp(float h){ vec3 c = vec3(0.0);',
      '  c = mix(c, vec3(0.42, 0.05, 0.015), smoothstep(0.04, 0.3, h)); c = mix(c, vec3(1.0, 0.33, 0.04), smoothstep(0.3, 0.62, h));',
      '  c = mix(c, vec3(1.0, 0.68, 0.2), smoothstep(0.62, 0.95, h)); c = mix(c, vec3(1.0, 0.95, 0.78), smoothstep(0.95, 1.35, h));',
      '  return c * (0.55 + 0.75 * clamp(h, 0.0, 1.6)); }',
      'void main(){',
      '  vec4 t = mix(texture2D(uTex, vUa), texture2D(uTex, vUb), vMix);',
      '  float a = t.r * vCol.a * (1.0 - vFog) * smoothstep(0.0, 1.0, vSoft);',
      '  if (a < 0.002) discard;',
      '  float lit = mix(0.95, mix(0.4, 1.12, t.b) * mix(0.8, 1.05, vVert), vLitK);',
      '  vec3 c = vCol.rgb * mix(1.0, lit * uLight, 1.0 - vAdd);',
      '  float h = vHeat * (0.32 + 0.95 * t.g);',
      '  c = c * (1.0 - clamp(h * 1.4, 0.0, 0.93)) + ramp(h);',
      '  gl_FragColor = vec4(c * a, a * (1.0 - vAdd));',
      '}'].join('\n')
  });
  const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 12; mesh.name = 'simkit-fx';
  scene.add(mesh);

  // ============================================================ particle state (struct of arrays)
  const f32 = () => new Float32Array(MAX);
  const px = f32(), py = f32(), pz = f32(), vx = f32(), vy = f32(), vz = f32(), age = f32(), life = f32(), s0 = f32(), s1 = f32(), spw = f32(),
    rot = f32(), rv = f32(), r0 = f32(), g0 = f32(), b0 = f32(), r1 = f32(), g1 = f32(), b1 = f32(), al = f32(), fin = f32(), fo = f32(),
    ht = f32(), hl = f32(), ad = f32(), cel = f32(), fps = f32(), drg = f32(), grv = f32(), wk = f32(), tb = f32(), stk = f32(),
    sx = f32(), sy = f32(), sZ = f32(), gy = f32(), sd = f32();
  const fl = new Uint8Array(MAX), alive = new Uint8Array(MAX), free = new Int32Array(MAX);
  let freeTop = 0, nLive = 0; for (let i = MAX - 1; i >= 0; i--) free[freeTop++] = i;
  const FLAT = 1, KILLFLOOR = 2, BOUNCE = 4;
  // sorting buffers
  const keyD = new Float32Array(MAX), idxA = new Int32Array(MAX), idxB = new Int32Array(MAX), keyQ = new Uint16Array(MAX), cnt = new Uint32Array(256);

  // the one spawn spec, reset and filled by each recipe (no allocation)
  const sp = {};
  function P() {
    sp.x = 0; sp.y = 0; sp.z = 0; sp.vx = 0; sp.vy = 0; sp.vz = 0; sp.life = 1; sp.delay = 0; sp.s0 = 1; sp.s1 = 1; sp.sp = 1; sp.rot = 0; sp.rv = 0;
    sp.r0 = 1; sp.g0 = 1; sp.b0 = 1; sp.r1 = -1; sp.g1 = 0; sp.b1 = 0; sp.a = 1; sp.fin = 0; sp.fo = 0.6; sp.heat = 0; sp.hl = 1; sp.add = 0;
    sp.cell = GLOW; sp.fps = 0; sp.drag = 0; sp.g = 0; sp.wk = 0; sp.turb = 0; sp.stk = 0; sp.sx = 0; sp.sy = 0; sp.sz = 0; sp.floor = -1e9; sp.flags = 0;
    return sp;
  }
  function col(s, r, g, b, r2, g2, b2) { s.r0 = r; s.g0 = g; s.b0 = b; if (r2 != null) { s.r1 = r2; s.g1 = g2; s.b1 = b2; } else s.r1 = -1; return s; }
  function spawn(s) {
    if (freeTop === 0) return -1;
    const i = free[--freeTop]; alive[i] = 1; nLive++;
    px[i] = s.x; py[i] = s.y; pz[i] = s.z; vx[i] = s.vx; vy[i] = s.vy; vz[i] = s.vz; age[i] = -s.delay; life[i] = Math.max(1e-5, s.life);
    s0[i] = s.s0; s1[i] = s.s1; spw[i] = s.sp; rot[i] = s.rot; rv[i] = s.rv; r0[i] = s.r0; g0[i] = s.g0; b0[i] = s.b0;
    if (s.r1 < 0) { r1[i] = s.r0; g1[i] = s.g0; b1[i] = s.b0; } else { r1[i] = s.r1; g1[i] = s.g1; b1[i] = s.b1; }
    al[i] = s.a; fin[i] = s.fin; fo[i] = s.fo; ht[i] = s.heat; hl[i] = Math.max(0.01, s.hl); ad[i] = s.add; cel[i] = s.cell; fps[i] = s.fps;
    drg[i] = s.drag; grv[i] = s.g; wk[i] = s.wk; tb[i] = s.turb; stk[i] = s.stk; sx[i] = s.sx; sy[i] = s.sy; sZ[i] = s.sz; gy[i] = s.floor; fl[i] = s.flags;
    sd[i] = Math.random() * 6.283;
    return i;
  }
  function kill(i) { alive[i] = 0; free[freeTop++] = i; nLive--; }
  const fill = () => nLive / MAX;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const N = (k) => Math.max(1, Math.round(k * Q));
  // a random direction; out in D3 (no allocation). up: 0 = any, 1 = upper hemisphere, cone = minimum y
  const D3 = [0, 0, 0];
  function dir(minY) {
    const y = rnd(minY == null ? -1 : minY, 1), a = Math.random() * 6.283, r = Math.sqrt(Math.max(0, 1 - y * y));
    D3[0] = Math.cos(a) * r; D3[1] = y; D3[2] = Math.sin(a) * r; return D3;
  }
  const smokeCell = () => SMK + Math.floor(Math.random() * 4);

  // ============================================================ debris: small dark chunks with gravity and spin
  const dGeo = new T.BoxGeometry(1, 0.55, 0.8);
  const dMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.05, flatShading: true });
  const dMesh = new T.InstancedMesh(dGeo, dMat, DMAX); dMesh.count = 0; dMesh.frustumCulled = false; dMesh.castShadow = false; dMesh.name = 'simkit-fx-debris';
  dMesh.instanceMatrix.setUsage(T.DynamicDrawUsage); dMesh.setColorAt(0, new T.Color(0x222222)); dMesh.instanceColor.setUsage(T.DynamicDrawUsage);
  scene.add(dMesh);
  const d32 = () => new Float32Array(DMAX);
  const dx = d32(), dy = d32(), dz = d32(), dvx = d32(), dvy = d32(), dvz = d32(), drx = d32(), dry = d32(), drz = d32(), dwx = d32(), dwy = d32(), dwz = d32(),
    dsc = d32(), dage = d32(), dlife = d32(), dgy = d32(), dg = d32(), dS = d32(), dacc = d32(), dcr = d32(), dcg = d32(), dcb = d32();
  const dtr = new Uint8Array(DMAX), dal = new Uint8Array(DMAX);
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3(), _c = new T.Color();
  // trail: 0 none, 1 smoke, 2 burning (fire and smoke)
  function chunk(x, y, z, vX, vY, vZ, size, S, floor, g, trail, r, gC, b, lifeS) {
    let k = -1; for (let i = 0; i < DMAX; i++) if (!dal[i]) { k = i; break; }
    if (k < 0) return;
    dal[k] = 1; dx[k] = x; dy[k] = y; dz[k] = z; dvx[k] = vX; dvy[k] = vY; dvz[k] = vZ; drx[k] = rnd(0, 6.3); dry[k] = rnd(0, 6.3); drz[k] = rnd(0, 6.3);
    dwx[k] = rnd(-9, 9); dwy[k] = rnd(-9, 9); dwz[k] = rnd(-9, 9); dsc[k] = size; dage[k] = 0; dlife[k] = lifeS || rnd(2.5, 4); dgy[k] = floor; dg[k] = g; dS[k] = S;
    dacc[k] = 0; dtr[k] = trail; dcr[k] = r; dcg[k] = gC; dcb[k] = b;
  }
  function stepDebris(dt) {
    let m = 0;
    for (let k = 0; k < DMAX; k++) {
      if (!dal[k]) continue;
      dage[k] += dt; if (dage[k] >= dlife[k]) { dal[k] = 0; continue; }
      const airborne = dy[k] > dgy[k] + 1e-3 || dvy[k] > 0;
      if (airborne) {
        dvy[k] -= dg[k] * dt; const dr = 1 / (1 + 0.25 * dt); dvx[k] *= dr; dvz[k] *= dr;
        dx[k] += dvx[k] * dt; dy[k] += dvy[k] * dt; dz[k] += dvz[k] * dt;
        drx[k] += dwx[k] * dt; dry[k] += dwy[k] * dt; drz[k] += dwz[k] * dt;
        if (dy[k] < dgy[k]) { dy[k] = dgy[k]; dvy[k] = Math.abs(dvy[k]) > dS[k] * 0.6 ? -dvy[k] * 0.28 : 0; dvx[k] *= 0.45; dvz[k] *= 0.45; dwx[k] *= 0.4; dwy[k] *= 0.4; dwz[k] *= 0.4; }
        // a trail behind a flying chunk: a dark smoke streamer, burning ones also shed fire
        if (dtr[k] && dage[k] < 1.6 && (dvy[k] > -dS[k] * 2.2 || dtr[k] === 2)) {
          dacc[k] += dt; const S = dS[k], gap = dtr[k] === 2 ? 0.036 : 0.045;
          while (dacc[k] >= gap) {
            dacc[k] -= gap;
            const s = P(); s.x = dx[k]; s.y = dy[k]; s.z = dz[k]; s.life = rnd(1.0, 1.8); s.s0 = S * 0.1; s.s1 = S * rnd(0.3, 0.42); s.sp = 1.6;
            col(s, 0.3, 0.29, 0.28, 0.5, 0.49, 0.48); s.a = 0.5 * (1 - dage[k] / 1.6); s.fin = 0.05; s.fo = 0.35; s.cell = smokeCell(); s.rot = rnd(0, 6.3); s.wk = S * 0.25; s.turb = S * 0.05;
            if (dtr[k] === 2) { s.heat = 1.5; s.hl = 0.3; s.s0 = S * 0.13; }
            s.floor = dgy[k]; spawn(s);
          }
        }
      }
      const fade = Math.min(1, (dlife[k] - dage[k]) / 0.6);
      _e.set(drx[k], dry[k], drz[k]); _q.setFromEuler(_e); _p.set(dx[k], dy[k], dz[k]); const sc = dsc[k] * fade; _s.set(sc, sc, sc);
      _m.compose(_p, _q, _s); dMesh.setMatrixAt(m, _m); _c.setRGB(dcr[k], dcg[k], dcb[k]); dMesh.setColorAt(m, _c); m++;
    }
    dMesh.count = m; dMesh.instanceMatrix.needsUpdate = true; if (dMesh.instanceColor) dMesh.instanceColor.needsUpdate = true;
  }

  // ============================================================ flash lights: a constant pool (count never changes, so no shader recompile)
  const lights = [];
  for (let i = 0; i < NL; i++) {
    const l = new T.PointLight(0xffaa55, 0, 10, 2); l.castShadow = false; l.name = 'simkit-fx-light'; scene.add(l);
    lights.push({ l, t: 0, life: 0, peak: 0, prio: 0, on: false, flick: 0, hold: 0 });
  }
  // prio: 3 big blast, 2 small blast or intercept, 1 fire. flick: a burning fire's flicker. hold: seconds at full before the fade
  function light(x, y, z, hex, peak, range, lifeS, prio, flick, hold) {
    if (!NL) return;
    let best = null, bs = 1e9;
    for (let i = 0; i < lights.length; i++) {
      const L = lights[i]; if (!L.on) { best = L; break; }
      const sc = L.prio * 10 + (1 - L.t / L.life); if (sc < bs) { bs = sc; best = L; }
    }
    if (best.on && best.prio > prio) return;
    best.on = true; best.t = 0; best.life = lifeS; best.peak = peak; best.prio = prio; best.flick = flick || 0; best.hold = hold || 0;
    best.l.color.setHex(hex); best.l.distance = range; best.l.position.set(x, y, z);
  }
  function stepLights(dt) {
    for (let i = 0; i < lights.length; i++) {
      const L = lights[i]; if (!L.on) continue;
      L.t += dt; if (L.t >= L.life) { L.on = false; L.l.intensity = 0; continue; }
      let e;
      if (L.flick) { const a = L.t / L.life; e = Math.min(1, L.t / 0.5) * Math.min(1, (1 - a) / 0.2) * (0.72 + 0.18 * Math.sin(L.t * 23 + i) + 0.1 * Math.sin(L.t * 41.7)); }
      else if (L.t < 0.035) e = L.t / 0.035;
      else if (L.t < 0.035 + L.hold) e = 1;
      else { const a = (L.t - 0.035 - L.hold) / Math.max(0.01, L.life - 0.035 - L.hold); e = (1 - a) * (1 - a) * (0.85 + 0.15 * Math.sin(L.t * 37)); }
      L.l.intensity = L.peak * Math.max(0, e);
    }
  }

  // ============================================================ building blocks (S = the effect's size in world units)
  function flashAt(x, y, z, S, r, g, b, k, floor) {
    const fl_ = floor == null ? -1e9 : floor;
    let s = P(); s.x = x; s.y = y; s.z = z; s.life = 0.16 * k; s.s0 = S * 1.3; s.s1 = S * 1.9; col(s, 1, 0.96, 0.85); s.a = 1; s.add = 1; s.fo = 0.15; s.floor = fl_; spawn(s);
    s = P(); s.x = x; s.y = y; s.z = z; s.life = 0.42 * k; s.s0 = S * 2.0; s.s1 = S * 3.4; s.sp = 2; col(s, r, g, b); s.a = 0.5; s.add = 1; s.fo = 0; s.floor = fl_; spawn(s);
  }
  function airRing(x, y, z, S, k) {        // the quick shock sphere a blast throws: a faint expanding ring of light
    const s = P(); s.x = x; s.y = y; s.z = z; s.life = 0.32 * k; s.s0 = S * 0.4; s.s1 = S * 3.3 * k; s.sp = 2.2; col(s, 1, 0.92, 0.8); s.a = 0.16; s.add = 1; s.fo = 0.0; s.cell = RING; spawn(s);
  }
  // fireball puffs: hot, boiling, cooling into smoke of colour c (n puffs, radius R, outward speed v, buoyancy up)
  function fireball(x, y, z, S, n, R, v0, v1, lifeA, lifeB, sA, sB, heat, hlA, hlB, up, cr, cg, cb, floor, delay) {
    for (let i = 0; i < n; i++) {
      const d = dir(-0.15), s = P(), rr = rnd(0, R) * S;
      s.x = x + d[0] * rr; s.y = y + Math.abs(d[1]) * rr * 0.7; s.z = z + d[2] * rr;
      const sp_ = rnd(v0, v1) * S; s.vx = d[0] * sp_; s.vy = Math.abs(d[1]) * sp_ * 0.8 + S * 0.25; s.vz = d[2] * sp_;
      s.drag = 3.2; s.g = -up * S; s.life = rnd(lifeA, lifeB); s.s0 = S * rnd(sA * 0.85, sA * 1.15); s.s1 = S * rnd(sB * 0.85, sB * 1.15); s.sp = 2.4;
      s.heat = heat * rnd(0.9, 1.1); s.hl = rnd(hlA, hlB); col(s, cr, cg, cb, cr * 1.6, cg * 1.6, cb * 1.6); s.a = 0.96; s.fin = 0.02; s.fo = 0.55;
      s.cell = FB + rnd(0, 1.2); s.fps = rnd(3.5, 5.5); s.rot = rnd(0, 6.3); s.rv = rnd(-0.7, 0.7); s.wk = S * 0.18; s.turb = S * 0.08; s.floor = floor; s.delay = delay || 0;
      spawn(s);
    }
  }
  function sparks(x, y, z, S, n, v0, v1, minY, r, g, b, floor, lifeA, lifeB, delay) {
    for (let i = 0; i < n; i++) {
      const d = dir(minY), s = P(), v = rnd(v0, v1) * S;
      s.x = x; s.y = y; s.z = z; s.vx = d[0] * v; s.vy = d[1] * v; s.vz = d[2] * v; s.g = S * 4.2; s.drag = 0.9;
      s.life = rnd(lifeA || 0.5, lifeB || 1.3); s.s0 = S * rnd(0.05, 0.085); s.s1 = S * 0.025; col(s, r, g, b, 1, 0.3, 0.06); s.a = 1; s.add = 1; s.fo = 0.5;
      s.cell = SPARK; s.stk = 0.06; s.floor = floor; s.flags = BOUNCE; s.delay = delay || 0; spawn(s);
    }
  }
  function column(x, y, z, S, n, lifeA, lifeB, cr, cg, cb, cr2, cg2, cb2, a, heat, delayA, delayB, rise) {
    for (let i = 0; i < n; i++) {
      const s = P(), a2 = rnd(0, 6.3), rr = rnd(0, 0.22) * S;
      s.x = x + Math.cos(a2) * rr; s.y = y + S * rnd(0.25, 0.6); s.z = z + Math.sin(a2) * rr;
      s.vy = S * rnd(0.8, 1.6) * (rise || 1); s.vx = rnd(-0.15, 0.15) * S; s.vz = rnd(-0.15, 0.15) * S; s.drag = 0.65; s.g = -0.08 * S;
      s.life = rnd(lifeA, lifeB); s.s0 = S * rnd(0.35, 0.5); s.s1 = S * rnd(1.3, 1.9); s.sp = 1.5; col(s, cr, cg, cb, cr2, cg2, cb2); s.a = a; s.fin = 0.3; s.fo = 0.45;
      s.heat = heat; s.hl = 0.5; s.cell = smokeCell(); s.rot = rnd(-0.5, 0.5); s.rv = rnd(-0.12, 0.12); s.wk = S * 0.4; s.turb = S * 0.12; s.floor = y; s.delay = rnd(delayA, delayB);
      spawn(s);
    }
  }
  // a ground ring of light, a skirt of dust and a ring of dust puffs rolling outward (radius in world units)
  function groundShock(x, y, z, R, S, glow, dust, cr, cg, cb) {
    let s;
    if (glow) { s = P(); s.x = x; s.y = y + S * 0.03; s.z = z; s.life = 0.6; s.s0 = R * 0.08; s.s1 = R; s.sp = 2.6; col(s, 1, 0.82, 0.58); s.a = 0.5 * glow; s.add = 1; s.fo = 0.05; s.cell = RING; s.flags = FLAT; spawn(s); }
    s = P(); s.x = x; s.y = y + S * 0.02; s.z = z; s.life = 1.5; s.s0 = R * 0.1; s.s1 = R * 0.85; s.sp = 2.2; col(s, cr, cg, cb); s.a = 0.42 * dust; s.fo = 0.25; s.cell = RING; s.flags = FLAT; spawn(s);
    const n = N(22 * dust);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, 6.283), v = rnd(0.55, 1.3) * R * 1.6; s = P();
      s.x = x + Math.cos(a) * R * 0.08; s.y = y + S * 0.12; s.z = z + Math.sin(a) * R * 0.08; s.vx = Math.cos(a) * v; s.vz = Math.sin(a) * v; s.vy = S * rnd(0.15, 0.4); s.drag = 2.4;
      s.life = rnd(1.6, 2.8); s.s0 = R * 0.1; s.s1 = R * rnd(0.24, 0.42); s.sp = 1.8; col(s, cr, cg, cb, cr * 1.1, cg * 1.1, cb * 1.1); s.a = 0.3; s.fin = 0.04; s.fo = 0.3;
      s.cell = smokeCell(); s.rot = rnd(0, 6.3); s.wk = S * 0.2; s.floor = y; spawn(s);
    }
  }
  function debris(x, y, z, S, n, v0, v1, minY, floor, trailP, burnP, r, g, b, sz) {
    for (let i = 0; i < n; i++) {
      const d = dir(minY), v = rnd(v0, v1) * S, sh = rnd(0.7, 1.15), tr = Math.random() < burnP ? 2 : Math.random() < trailP ? 1 : 0;
      chunk(x + d[0] * S * 0.1, y + S * 0.1, z + d[2] * S * 0.1, d[0] * v, d[1] * v, d[2] * v, S * (sz || 1) * rnd(0.045, 0.1), S, floor, S * 4.5, tr, r * sh, g * sh, b * sh);
    }
  }
  function groundEmbers(x, y, z, S, n) {
    for (let i = 0; i < n; i++) {
      const s = P(), a = rnd(0, 6.3), rr = rnd(0.1, 0.6) * S; s.x = x + Math.cos(a) * rr; s.y = y + S * 0.02; s.z = z + Math.sin(a) * rr;
      s.life = rnd(1.8, 3.5); s.s0 = S * rnd(0.05, 0.1); s.s1 = S * 0.03; col(s, 1, 0.42, 0.1, 0.7, 0.12, 0.02); s.a = 0.9; s.add = 1; s.fin = 0.2; s.fo = 0.3; s.cell = SPARK; s.delay = rnd(0.1, 0.4); spawn(s);
    }
  }

  // ============================================================ explosions
  const LH = 0xffa050;
  function blast(x, y, z, S, k) {               // k: 1 a full blast, smaller for cook-offs
    const fl0 = y;
    flashAt(x, y + S * 0.35, z, S * k, 1, 0.55, 0.2, 1, y + S * 0.02); airRing(x, y + S * 0.4, z, S * k, 1);
    light(x, y + S * 0.9, z, LH, 9 * S * S * k * k, S * 7 * k, 1.1, k >= 1 ? 3 : 2, 0, 0.08);
    fireball(x, y + S * 0.25, z, S * k, N(5), 0.14, 0.2, 0.6, 1.1, 1.6, 0.6, 1.1, 2.0, 0.6, 0.85, 0.6, 0.14, 0.125, 0.11, fl0);   // the hot core
    fireball(x, y + S * 0.15, z, S * k, N(16), 0.3, 1.3, 2.8, 1.8, 2.9, 0.34, 1.1, 1.7, 0.7, 1.25, 0.55, 0.16, 0.14, 0.12, fl0);
    column(x, y, z, S * k, N(14), 3.8, 6.2, 0.24, 0.215, 0.19, 0.42, 0.4, 0.37, 0.8, 0.55, 0.15, 0.9);
    groundShock(x, y, z, S * 2.3 * k, S * k, 1, 1, 0.5, 0.44, 0.36);
    sparks(x, y + S * 0.2, z, S * k, N(26), 2.5, 6.5, 0.1, 1, 0.82, 0.48, fl0);
    debris(x, y, z, S * k, N(11), 2.2, 4.8, 0.2, fl0, 0.4, 0.15, 0.17, 0.155, 0.14);
    groundEmbers(x, y, z, S * k, N(7));
    if (k >= 1) emitter(SMOKEK, x, y, z, S * 0.55, 4.5);
  }
  function fuel(x, y, z, S) {
    flashAt(x, y + S * 0.4, z, S * 0.85, 1, 0.45, 0.12, 1.4, y + S * 0.02);
    light(x, y + S * 1.2, z, 0xff8a3a, 8 * S * S, S * 8, 2.6, 3, 0, 0.5);
    fireball(x, y + S * 0.3, z, S, N(6), 0.15, 0.3, 0.6, 1.6, 2.2, 0.6, 1.1, 1.9, 0.9, 1.3, 0.8, 0.07, 0.06, 0.055, y);
    for (let i = 0; i < N(22); i++) {           // the rolling fireball: rising, turning over, cooling to black
      const s = P(), a = rnd(0, 6.3), rr = rnd(0, 0.38) * S, v = rnd(0.5, 1.3) * S;
      s.x = x + Math.cos(a) * rr; s.y = y + S * rnd(0.25, 0.6); s.z = z + Math.sin(a) * rr; s.vx = Math.cos(a) * v; s.vz = Math.sin(a) * v; s.vy = rnd(1.1, 2.4) * S;
      s.drag = 1.5; s.g = -0.85 * S; s.life = rnd(2.6, 3.8); s.s0 = S * rnd(0.38, 0.5); s.s1 = S * rnd(1.0, 1.45); s.sp = 1.8; s.heat = rnd(1.35, 1.65); s.hl = rnd(1.1, 1.9);
      col(s, 0.07, 0.06, 0.055, 0.13, 0.12, 0.11); s.a = 0.97; s.fin = 0.03; s.fo = 0.6; s.cell = FB + rnd(0, 1.5); s.fps = rnd(2.8, 4); s.rot = rnd(0, 6.3); s.rv = rnd(-0.9, 0.9);
      s.wk = S * 0.25; s.turb = S * 0.1; s.floor = y; s.delay = rnd(0, 0.35); spawn(s);
    }
    column(x, y, z, S * 1.2, N(18), 5, 8, 0.06, 0.055, 0.05, 0.17, 0.165, 0.16, 0.92, 0.5, 0.4, 1.8, 1.25);
    groundShock(x, y, z, S * 1.6, S, 0.55, 0.7, 0.45, 0.4, 0.33);
    sparks(x, y + S * 0.3, z, S, N(16), 2, 5, 0.2, 1, 0.75, 0.38, y);
    debris(x, y, z, S, N(6), 2, 4, 0.2, y, 0.3, 0.3, 0.16, 0.15, 0.14);
    emitter(FIREK, x, y, z, S * 0.65, 7);
  }
  function cookoff(x, y, z, S) {                 // one cook-off in a chain: a bright pop, fireworks of sparks, burning streamers
    flashAt(x, y + S * 0.3, z, S * 0.8, 1, 0.7, 0.35, 0.8, y + S * 0.02);
    light(x, y + S * 0.6, z, 0xffb060, 5 * S * S, S * 7, 0.45, 2, 0, 0);
    fireball(x, y + S * 0.15, z, S, N(6), 0.15, 1, 2.2, 1.0, 1.8, 0.32, 0.8, 1.8, 0.35, 0.6, 0.4, 0.14, 0.13, 0.12, y);
    sparks(x, y + S * 0.2, z, S, N(18), 3.5, 9, 0.15, 1, 0.9, 0.62, y, 0.6, 1.6);
    debris(x, y, z, S, N(2), 3, 5.5, 0.4, y, 0, 1, 0.18, 0.16, 0.14, 0.8);
    column(x, y, z, S * 0.8, N(3), 3, 5, 0.42, 0.41, 0.4, 0.55, 0.55, 0.54, 0.6, 0.3, 0.05, 0.3);
  }
  function bunker(x, y, z, S) {
    flashAt(x, y + S * 0.12, z, S * 0.55, 1, 0.5, 0.18, 0.7, y + S * 0.02);
    light(x, y + S * 0.5, z, 0xffa050, 4 * S * S, S * 5, 0.5, 2, 0, 0);
    for (let i = 0; i < N(26); i++) {            // the plume of earth punched out of the ground
      const s = P(), a = rnd(0, 6.3), rr = rnd(0, 0.2) * S;
      s.x = x + Math.cos(a) * rr; s.y = y + S * 0.2; s.z = z + Math.sin(a) * rr; s.vy = S * rnd(2.4, 5.8); s.vx = Math.cos(a) * S * rnd(0.1, 0.55); s.vz = Math.sin(a) * S * rnd(0.1, 0.55);
      s.drag = 1.5; s.g = 0.7 * S; s.life = rnd(2.6, 4.6); s.s0 = S * rnd(0.22, 0.32); s.s1 = S * rnd(0.75, 1.25); s.sp = 1.6;
      const sh = rnd(0.85, 1.12); col(s, 0.4 * sh, 0.33 * sh, 0.25 * sh, 0.56 * sh, 0.5 * sh, 0.41 * sh); s.a = 0.9; s.fin = 0.02; s.fo = 0.45;
      s.cell = i % 3 === 0 ? SPRAY : smokeCell(); s.rot = i % 3 === 0 ? 0 : rnd(-0.6, 0.6); s.wk = S * 0.3; s.turb = S * 0.1; s.floor = y; spawn(s);
    }
    fireball(x, y + S * 0.15, z, S * 0.6, N(3), 0.1, 0.2, 0.6, 0.6, 0.9, 0.35, 0.6, 1.5, 0.18, 0.25, 0.6, 0.3, 0.25, 0.2, y);
    debris(x, y, z, S, N(14), 2.8, 6, 0.6, y, 0.25, 0, 0.3, 0.24, 0.17, 1.1);
    groundShock(x, y, z, S * 2.4, S, 0.15, 1.3, 0.5, 0.43, 0.33);
    for (let i = 0; i < N(6); i++) {             // the dust that settles and hangs
      const s = P(), a = rnd(0, 6.3), rr = rnd(0.2, 0.9) * S; s.x = x + Math.cos(a) * rr; s.y = y + S * 0.04; s.z = z + Math.sin(a) * rr;
      s.life = rnd(4.5, 6.5); s.s0 = S * 0.6; s.s1 = S * rnd(2.2, 3); s.sp = 1.4; col(s, 0.52, 0.46, 0.37); s.a = 0.3; s.fin = 0.6; s.fo = 0.4; s.cell = GLOW; s.flags = FLAT; s.delay = rnd(0.4, 1.2); spawn(s);
    }
  }
  function ship(x, y, z, S) {
    flashAt(x, y + S * 0.3, z, S * 0.8, 1, 0.55, 0.2, 1, y + S * 0.02);
    light(x, y + S * 0.8, z, LH, 7 * S * S, S * 7, 1.0, 3, 0, 0.05);
    for (let i = 0; i < N(42); i++) {            // the water column: thrown up, falling back
      const s = P(), a = rnd(0, 6.3), rr = rnd(0, 0.22) * S, sh = rnd(0.92, 1.04);
      s.x = x + Math.cos(a) * rr; s.y = y + S * 0.15; s.z = z + Math.sin(a) * rr; s.vy = S * rnd(3.2, 6.8); s.vx = Math.cos(a) * S * rnd(0.1, 0.5); s.vz = Math.sin(a) * S * rnd(0.1, 0.5);
      s.drag = 0.55; s.g = 3.3 * S; s.life = rnd(2, 3); s.s0 = S * rnd(0.16, 0.24); s.s1 = S * rnd(0.45, 0.8); s.sp = 1.3; s.rot = rnd(-0.25, 0.25);
      col(s, 0.93 * sh, 0.96 * sh, 0.98 * sh, 0.82, 0.86, 0.88); s.a = 0.9; s.fin = 0.02; s.fo = 0.6; s.cell = i % 4 ? SPRAY : smokeCell(); s.wk = S * 0.12; s.floor = y; s.flags = KILLFLOOR; spawn(s);
    }
    let s = P(); s.x = x; s.y = y + S * 0.03; s.z = z; s.life = 2.6; s.s0 = S * 0.3; s.s1 = S * 2.4; s.sp = 2; col(s, 0.92, 0.95, 0.97); s.a = 0.7; s.fo = 0.3; s.cell = RING; s.flags = FLAT; spawn(s);
    for (let i = 0; i < N(16); i++) {            // the foam thrown out over the water, and the mist hanging after
      const a = (i / 16) * 6.283, v = S * rnd(1, 1.6); s = P(); s.x = x; s.y = y + S * 0.03; s.z = z; s.vx = Math.cos(a) * v; s.vz = Math.sin(a) * v; s.drag = 1.4;
      s.life = rnd(2.5, 4); s.s0 = S * 0.3; s.s1 = S * rnd(0.9, 1.3); col(s, 0.9, 0.94, 0.96); s.a = 0.5; s.fo = 0.25; s.cell = GLOW; s.flags = FLAT; spawn(s);
    }
    for (let i = 0; i < N(8); i++) {
      s = P(); const a = rnd(0, 6.3), rr = rnd(0, 0.6) * S; s.x = x + Math.cos(a) * rr; s.y = y + S * rnd(0.3, 0.9); s.z = z + Math.sin(a) * rr; s.vy = S * 0.15;
      s.life = rnd(3.5, 5); s.s0 = S * 0.5; s.s1 = S * rnd(1.5, 2.1); col(s, 0.82, 0.85, 0.87); s.a = 0.35; s.fin = 0.8; s.fo = 0.4; s.cell = smokeCell(); s.wk = S * 0.3; s.floor = y; s.delay = rnd(0.6, 1.3); spawn(s);
    }
    fireball(x, y + S * 0.25, z, S * 0.75, N(8), 0.18, 0.6, 1.6, 1.5, 2.4, 0.35, 0.9, 1.7, 0.5, 0.8, 0.5, 0.1, 0.09, 0.085, y);
    debris(x, y, z, S, N(7), 2, 4.2, 0.4, y, 0.4, 0.1, 0.2, 0.2, 0.21);
    emitter(FIREK, x, y, z, S * 0.45, 7);
  }
  function airKill(x, y, z, S) {
    const floor = Math.min(0, y - S);
    flashAt(x, y, z, S, 1, 0.6, 0.25, 0.9); airRing(x, y, z, S * 0.8, 1);
    light(x, y, z, LH, 6 * S * S, S * 7, 0.8, 2, 0, 0.03);
    fireball(x, y, z, S, N(10), 0.15, 1.2, 2.4, 1.5, 2.6, 0.3, 0.8, 1.7, 0.35, 0.6, 0.15, 0.12, 0.11, 0.1, -1e9);
    for (let i = 0; i < N(8); i++) {             // the dark smudge left hanging in the sky
      const d = dir(), s = P(), v = rnd(0.4, 1) * S; s.x = x; s.y = y; s.z = z; s.vx = d[0] * v; s.vy = d[1] * v * 0.6; s.vz = d[2] * v; s.drag = 1.8;
      s.life = rnd(3.5, 5.5); s.s0 = S * 0.35; s.s1 = S * rnd(0.9, 1.3); col(s, 0.14, 0.13, 0.12, 0.3, 0.29, 0.28); s.a = 0.75; s.fin = 0.15; s.fo = 0.4; s.heat = 0.6; s.hl = 0.35;
      s.cell = smokeCell(); s.rot = rnd(0, 6.3); s.wk = S * 0.35; s.turb = S * 0.08; s.delay = rnd(0.05, 0.25); spawn(s);
    }
    sparks(x, y, z, S, N(26), 2, 6, -1, 1, 0.8, 0.45, floor, 0.6, 1.6);
    debris(x, y, z, S, N(10), 1, 3, -0.6, floor, 0.5, 0.4, 0.16, 0.16, 0.17, 0.9);
  }
  function intercept(pos, size) {
    const S = size * SCALE, x = pos.x, y = pos.y, z = pos.z, floor = Math.min(0, y - S);
    let s = P(); s.x = x; s.y = y; s.z = z; s.life = 0.14; s.s0 = S * 1.2; s.s1 = S * 1.6; col(s, 0.92, 0.96, 1); s.add = 1; s.fo = 0.1; spawn(s);
    s = P(); s.x = x; s.y = y; s.z = z; s.life = 0.38; s.s0 = S * 1.8; s.s1 = S * 2.8; s.sp = 2; col(s, 1, 0.8, 0.55); s.a = 0.45; s.add = 1; s.fo = 0; spawn(s);
    airRing(x, y, z, S * 0.7, 0.9);
    light(x, y, z, 0xdde6ff, 5 * S * S, S * 7, 0.55, 2, 0, 0);
    fireball(x, y, z, S * 0.7, N(4), 0.1, 0.8, 1.6, 0.5, 0.8, 0.3, 0.55, 1.8, 0.2, 0.3, 0, 0.75, 0.75, 0.74, -1e9);
    for (let i = 0; i < N(22); i++) {            // the white burst ball interceptors leave
      const d = dir(), v = rnd(0.3, 2.0) * S; s = P(); s.x = x + d[0] * S * 0.15; s.y = y + d[1] * S * 0.15; s.z = z + d[2] * S * 0.15; s.vx = d[0] * v; s.vy = d[1] * v; s.vz = d[2] * v; s.drag = 2.4;
      s.life = rnd(2.6, 4.2); s.s0 = S * 0.3; s.s1 = S * rnd(0.75, 1.1); s.sp = 2; const sh = rnd(0.9, 1.04); col(s, 0.9 * sh, 0.9 * sh, 0.88 * sh, 0.72, 0.72, 0.72); s.a = 0.88; s.fin = 0.04; s.fo = 0.4;
      s.heat = 0.9; s.hl = 0.12; s.cell = smokeCell(); s.rot = rnd(0, 6.3); s.wk = S * 0.25; s.turb = S * 0.05; spawn(s);
    }
    sparks(x, y, z, S * 1.3, N(34), 2.5, 6, -1, 1, 0.97, 0.85, floor, 0.5, 1.4);
    debris(x, y, z, S, N(8), 0.8, 2.4, -0.5, floor, 0.75, 0.1, 0.25, 0.25, 0.26, 0.6);
  }
  function explode(pos, size, kind) {
    const S = size * SCALE, x = pos.x, y = pos.y, z = pos.z;
    switch (kind) {
      case 'fuel': fuel(x, y, z, S); break;
      case 'secondary': { blast(x, y, z, S * 0.75, 1); const e = emitter(CHAINK, x, y, z, S, 4); if (e) { e.n = N(6) + 1; e.next = rnd(0.2, 0.4); } break; }
      case 'bunker': bunker(x, y, z, S); break;
      case 'ship': ship(x, y, z, S); break;
      case 'air': airKill(x, y, z, S); break;
      default: blast(x, y, z, S, 1);
    }
  }

  // ============================================================ emitters: fires, smoke columns, gas, trails, cook-off chains
  const FIREK = 1, SMOKEK = 2, GASK = 3, TRAILK = 4, CHAINK = 5;
  const em = []; for (let i = 0; i < EMAX; i++) em.push({ on: false, k: 0, x: 0, y: 0, z: 0, S: 1, t: 0, dur: 0, a0: 0, a1: 0, a2: 0, a3: 0, gen: 0, obj: null, stopped: false,
    tk: 0, w: 1, len: 30, cr: 1, cg: 0.7, cb: 0.4, lx: 0, ly: 0, lz: 0, has: false, spd: 0, dx: 0, dy: 0, dz: 1, n: 0, next: 0, lit: false });
  function emitter(k, x, y, z, S, dur) {
    let e = null; for (let i = 0; i < EMAX; i++) if (!em[i].on) { e = em[i]; break; }
    if (!e) return null;
    e.on = true; e.k = k; e.x = x; e.y = y; e.z = z; e.S = S; e.t = 0; e.dur = dur; e.a0 = e.a1 = e.a2 = e.a3 = 0; e.gen++; e.obj = null; e.stopped = false; e.has = false; e.spd = 0; e.lit = false;
    return e;
  }
  const _v = new T.Vector3(), _w = new T.Vector3();
  function stepEmitters(dt) {
    const thr = fill() > 0.7 ? Math.max(0, (1 - fill()) / 0.3) : 1;   // continuous emitters back off as the pool fills; bursts never starve
    for (let i = 0; i < EMAX; i++) {
      const e = em[i]; if (!e.on) continue;
      e.t += dt;
      if (e.k === TRAILK) { stepTrail(e, dt, thr); continue; }
      if (e.k === CHAINK) {
        if (e.t >= e.next && e.n > 0) { const a = rnd(0, 6.3), rr = rnd(0.15, 0.8) * e.S; cookoff(e.x + Math.cos(a) * rr, e.y, e.z + Math.sin(a) * rr, e.S * rnd(0.42, 0.68)); e.n--; e.next = e.t + rnd(0.18, 0.6); }
        if (e.n <= 0) e.on = false; continue;
      }
      if (e.t >= e.dur) { e.on = false; continue; }
      const a = e.t / e.dur, ramp = Math.min(1, e.t / 0.35) * (a > 0.8 ? (1 - a) / 0.2 : 1) * thr, S = e.S, x = e.x, y = e.y, z = e.z;
      if (e.k === FIREK) {
        if (!e.lit && S > 0) { e.lit = true; light(x, y + S * 0.8, z, 0xff8a40, 3.5 * S * S, S * 6, e.dur, 1, 1, 0); }
        e.a0 += dt * 26 * Q * ramp;
        while (e.a0 >= 1) {                       // flames: looping flipbook, hot, cooling into smoke as they lick upward
          e.a0 -= 1; const s = P(), an = rnd(0, 6.3), rr = Math.sqrt(Math.random()) * 0.42 * S, bed = Math.random() < 0.3;
          s.x = x + Math.cos(an) * rr; s.y = y + S * (bed ? 0.1 : 0.2); s.z = z + Math.sin(an) * rr; s.vy = S * (bed ? rnd(0.2, 0.5) : rnd(0.8, 1.4)); s.vx = rnd(-0.12, 0.12) * S; s.vz = rnd(-0.12, 0.12) * S;
          s.drag = 1.1; s.g = -0.75 * S; s.life = bed ? rnd(0.6, 0.9) : rnd(0.9, 1.35); s.s0 = S * rnd(0.3, 0.42) * (1 - rr / S * 0.7); s.s1 = S * (bed ? rnd(0.35, 0.45) : rnd(0.5, 0.65)); s.sp = 1.2;
          s.heat = rnd(1.4, 1.75); s.hl = s.life * rnd(0.75, 0.95); col(s, 0.1, 0.09, 0.08, 0.16, 0.15, 0.14); s.a = 0.95; s.fin = 0.05; s.fo = 0.5;
          s.cell = FB + rnd(0, 8); s.fps = -rnd(6, 9); s.rot = rnd(-0.4, 0.4); s.rv = rnd(-0.8, 0.8); s.wk = S * 0.2; s.turb = S * 0.12; s.floor = y; spawn(s);
        }
        e.a1 += dt * 8 * Q * ramp;
        while (e.a1 >= 1) { e.a1 -= 1; smokePuff(x, y + S * 0.75, z, S, 0.13, 0.36, 0.78, 0.45); }
        e.a2 += dt * 6 * Q * ramp;
        while (e.a2 >= 1) {                       // embers riding the heat
          e.a2 -= 1; const s = P(), an = rnd(0, 6.3), rr = rnd(0, 0.35) * S;
          s.x = x + Math.cos(an) * rr; s.y = y + S * 0.3; s.z = z + Math.sin(an) * rr; s.vy = S * rnd(1.4, 3); s.vx = rnd(-0.4, 0.4) * S; s.vz = rnd(-0.4, 0.4) * S; s.g = 0.35 * S; s.drag = 0.9;
          s.life = rnd(1.1, 2.2); s.s0 = S * rnd(0.025, 0.04); s.s1 = S * 0.012; col(s, 1, 0.62, 0.22, 1, 0.25, 0.05); s.add = 1; s.fo = 0.4; s.cell = SPARK; s.turb = S * 0.45; s.wk = S * 0.4; spawn(s);
        }
      } else if (e.k === SMOKEK) {
        e.a1 += dt * 9 * Q * ramp;
        while (e.a1 >= 1) { e.a1 -= 1; smokePuff(x, y + S * 0.3, z, S, 0.17, 0.4, 0.82, 0.12); }
      } else if (e.k === GASK) {
        e.a1 += dt * 13 * Q * ramp;
        while (e.a1 >= 1) {                       // a pale cloud hugging the ground: half lies flat on it, half billows just above
          e.a1 -= 1; const s = P(), an = rnd(0, 6.3), v = rnd(0.5, 1.4) * S, flat = Math.random() < 0.45;
          s.x = x + Math.cos(an) * S * 0.15; s.y = y + (flat ? S * 0.04 : S * rnd(0.15, 0.35)); s.z = z + Math.sin(an) * S * 0.15; s.vx = Math.cos(an) * v; s.vz = Math.sin(an) * v; s.vy = flat ? 0 : S * rnd(0.03, 0.14);
          s.drag = 0.85; s.life = rnd(3.6, 5.6); s.s0 = S * 0.28; s.s1 = S * rnd(1.4, 2.1) * (flat ? 1.3 : 1); s.sp = 1.8; const sh = rnd(0.95, 1.03);
          col(s, 0.84 * sh, 0.86 * sh, 0.8 * sh, 0.88, 0.89, 0.86); s.a = flat ? 0.34 : 0.24; s.fin = 0.45; s.fo = 0.42; s.cell = flat ? GLOW : smokeCell(); s.rot = rnd(0, 6.3); s.rv = rnd(-0.15, 0.15);
          s.wk = S * 0.3; s.turb = S * 0.12; s.floor = y; if (flat) s.flags = FLAT; spawn(s);
        }
      }
    }
  }
  function smokePuff(x, y, z, S, dark, light_, a, heat) {
    const s = P(), an = rnd(0, 6.3), rr = rnd(0, 0.28) * S, sh = rnd(0.9, 1.1);
    s.x = x + Math.cos(an) * rr; s.y = y; s.z = z + Math.sin(an) * rr; s.vy = S * rnd(0.8, 1.2); s.vx = rnd(-0.1, 0.1) * S; s.vz = rnd(-0.1, 0.1) * S; s.drag = 0.5; s.g = -0.38 * S;
    s.life = rnd(5, 7.5); s.s0 = S * rnd(0.3, 0.4); s.s1 = S * rnd(1.3, 1.8); s.sp = 1.25; col(s, dark * sh, dark * 0.95 * sh, dark * 0.9 * sh, light_ * sh, light_ * 0.98 * sh, light_ * 0.96 * sh);
    s.a = a; s.fin = 0.35; s.fo = 0.5; s.heat = heat; s.hl = 0.7; s.cell = smokeCell(); s.rot = rnd(-0.5, 0.5); s.rv = rnd(-0.1, 0.1); s.wk = S * 0.7; s.turb = S * 0.15; s.floor = y - S * 0.3; spawn(s);
  }
  function fire(pos, size, seconds) { emitter(FIREK, pos.x, pos.y, pos.z, size * SCALE, seconds == null ? 8 : seconds); }
  function smoke(pos, size, seconds) { emitter(SMOKEK, pos.x, pos.y, pos.z, size * SCALE, seconds == null ? 8 : seconds); }
  function gas(pos, size, seconds) {
    const S = size * SCALE;
    for (let i = 0; i < N(5); i++) {               // the canister's first gush
      const s = P(), d = dir(0), v = rnd(0.8, 1.6) * S; s.x = pos.x; s.y = pos.y + S * 0.12; s.z = pos.z; s.vx = d[0] * v; s.vy = d[1] * v * 0.4; s.vz = d[2] * v; s.drag = 1.4;
      s.life = rnd(2.5, 3.5); s.s0 = S * 0.2; s.s1 = S * 1.0; s.sp = 2; col(s, 0.9, 0.91, 0.86); s.a = 0.32; s.fin = 0.05; s.fo = 0.4; s.cell = smokeCell(); s.rot = rnd(0, 6.3); s.floor = pos.y; spawn(s);
    }
    emitter(GASK, pos.x, pos.y, pos.z, S, seconds == null ? 8 : seconds);
  }

  // trails follow a moving object: emitted by distance travelled, so they stay continuous at any frame rate
  const TK = { rocket: 0, jet: 1, drone: 2, wake: 3 };
  function trail(obj, opt) {
    opt = opt || {};
    const e = emitter(TRAILK, 0, 0, 0, 1, 1e9); if (!e) return { stop() {} };
    e.obj = obj; e.tk = TK[opt.kind] != null ? TK[opt.kind] : 0;
    // width from the body: its narrow side, but a rocket's plume is judged by its LENGTH too (a missile is a pencil; its exhaust column is not)
    const us = obj && obj.userData && obj.userData.size, sc = obj && obj.scale ? obj.scale.x : 1;
    const wAuto = us ? Math.max(0.3, Math.min(us[0], us[2]) * sc * 0.35, e.tk === 0 ? Math.max(us[0], us[2]) * sc * 0.075 : 0) : 1;
    const w = (opt.width || wAuto) * (opt.width ? SCALE : 1);
    e.w = w; e.len = opt.length || w * (e.tk === 1 ? 80 : e.tk === 3 ? 30 : e.tk === 2 ? 16 : 60);
    const c = new T.Color(opt.color != null ? opt.color : e.tk === 3 ? 0xeaf2f5 : 0xffb066); e.cr = c.r; e.cg = c.g; e.cb = c.b;
    const g = e.gen;
    return { stop() { if (e.gen === g) e.stopped = true; } };
  }
  function stepTrail(e, dt, thr) {
    const ob = e.obj;
    if (e.stopped || !ob || !ob.parent) { e.on = false; e.obj = null; return; }
    if (!ob.visible) return;
    ob.getWorldPosition(_v);
    if (!e.has) { e.lx = _v.x; e.ly = _v.y; e.lz = _v.z; e.has = true; ob.getWorldDirection(_w); e.dx = _w.x; e.dy = _w.y; e.dz = _w.z; return; }
    const ddx = _v.x - e.lx, ddy = _v.y - e.ly, ddz = _v.z - e.lz, dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
    if (dist > 1e-6) { e.dx = ddx / dist; e.dy = ddy / dist; e.dz = ddz / dist; e.spd += (dist / Math.max(dt, 1e-4) - e.spd) * (e.spd ? 0.35 : 1); }
    const w = e.w, tk = e.tk, X = _v.x, Y = _v.y, Z = _v.z;
    let s;
    if (tk === 0) {                                // the motor: a white-hot core and a plume streaming back from it
      s = P(); s.x = X; s.y = Y; s.z = Z; s.life = 1e-5; s.s0 = s.s1 = w * 1.5; col(s, 1, 0.96, 0.85); s.add = 1; s.fo = 1; spawn(s);
      s = P(); s.x = X; s.y = Y; s.z = Z; s.life = 1e-5; s.s0 = s.s1 = w * 4.6; col(s, e.cr, e.cg, e.cb); s.a = 0.5; s.add = 1; s.fo = 1; spawn(s);
      s = P(); s.x = X - e.dx * w * 0.6; s.y = Y - e.dy * w * 0.6; s.z = Z - e.dz * w * 0.6; s.life = 1e-5; s.s0 = s.s1 = w * 0.9; col(s, e.cr, e.cg * 0.95, e.cb * 0.8); s.add = 1; s.fo = 1;
      s.cell = SPARK; s.sx = e.dx * w * 7; s.sy = e.dy * w * 7; s.sz = e.dz * w * 7; spawn(s);
    } else if (tk === 2) {
      s = P(); s.x = X; s.y = Y; s.z = Z; s.life = 1e-5; s.s0 = s.s1 = w * 1.1; col(s, e.cr, e.cg, e.cb); s.a = 0.25; s.add = 1; s.fo = 1; spawn(s);
    }
    if (dist <= 1e-6) return;
    const gap = tk === 0 ? w * 0.7 : tk === 1 ? w * 0.55 : tk === 2 ? w * 1.1 : w * 0.4;
    // a rocket's smoke hangs in the air well after the motor has passed (the launch column people film); the pool throttle still shortens it
    const lifeT = Math.max(tk === 3 ? 1.6 : tk === 0 ? 0.6 + 1.6 * thr : 0.5, Math.min(tk === 1 ? 9 : 7, e.len / Math.max(e.spd, 1e-3)));
    let u = gap - e.a0, made = 0;
    const maxN = Math.max(2, Math.round(40 * thr));
    while (u <= dist && made < maxN) {
      const f = u / dist, x = e.lx + ddx * f, y = e.ly + ddy * f, z = e.lz + ddz * f; made++;
      if (tk === 0) {
        s = P(); s.x = x; s.y = y; s.z = z; s.life = 0.13; s.s0 = w * 1.3; s.s1 = w * 0.4; col(s, e.cr, e.cg * 0.85, e.cb * 0.6); s.a = 0.8; s.add = 1; s.fo = 0; spawn(s);
        s = P(); s.x = x; s.y = y; s.z = z; s.vx = rnd(-0.3, 0.3) * w; s.vy = rnd(-0.3, 0.3) * w + w * 0.15; s.vz = rnd(-0.3, 0.3) * w; s.drag = 0.3;
        s.life = lifeT * rnd(0.85, 1.15); s.s0 = w * 0.75; s.s1 = w * rnd(3.6, 5); s.sp = 1.7; const sh = rnd(0.94, 1.03); col(s, 0.9 * sh, 0.9 * sh, 0.88 * sh, 0.74, 0.74, 0.74);
        s.a = 0.62; s.fin = 0.02; s.fo = 0.25; s.heat = 0.55; s.hl = 0.12; s.cell = smokeCell(); s.rot = rnd(0, 6.3); s.rv = rnd(-0.3, 0.3); s.wk = w * 0.6; s.turb = w * 0.3; spawn(s);
      } else if (tk === 1) {
        s = P(); s.x = x; s.y = y; s.z = z; s.life = lifeT * rnd(0.9, 1.1); s.s0 = w * 0.35; s.s1 = w * 2.2; s.sp = 1.5; col(s, 0.96, 0.97, 1); s.a = 0.42; s.fin = 0.25; s.fo = 0.3;
        s.cell = smokeCell(); s.rot = rnd(0, 6.3); s.wk = w * 0.3; s.turb = w * 0.1; spawn(s);
      } else if (tk === 2) {
        s = P(); s.x = x; s.y = y; s.z = z; s.life = lifeT; s.s0 = w * 0.5; s.s1 = w * 1.5; col(s, 0.7, 0.7, 0.7); s.a = 0.17; s.fin = 0.1; s.fo = 0.2; s.cell = smokeCell(); s.rot = rnd(0, 6.3); spawn(s);
      } else {                                     // a ship's wake: two arms spreading in a V, churned foam down the middle
        const pxn = -e.dz, pzn = e.dx, hs = e.spd * 0.36;
        for (let side = -1; side <= 1; side += 2) {
          s = P(); s.x = x + pxn * side * w * 0.45; s.y = y + 0.02 * w; s.z = z + pzn * side * w * 0.45; s.vx = pxn * side * hs; s.vz = pzn * side * hs; s.drag = 0.35;
          s.life = lifeT * rnd(0.9, 1.1); s.s0 = w * 0.6; s.s1 = w * 2.0; s.sp = 1.4; col(s, e.cr, e.cg, e.cb); s.a = 0.36; s.fin = 0.05; s.fo = 0.2; s.cell = GLOW; s.flags = FLAT; spawn(s);
        }
        s = P(); s.x = x - e.dx * w * 0.6; s.y = y + 0.03 * w; s.z = z - e.dz * w * 0.6; s.life = lifeT * 0.6; s.s0 = w * 0.7; s.s1 = w * 1.8; s.sp = 1.5; col(s, e.cr, e.cg, e.cb); s.a = 0.5; s.fin = 0.05; s.fo = 0.2; s.cell = smokeCell(); s.rot = rnd(0, 6.3); s.flags = FLAT; spawn(s);
      }
      u += gap;
    }
    e.a0 = made >= maxN ? 0 : dist - (u - gap);
    e.lx = X; e.ly = Y; e.lz = Z;
  }

  // ============================================================ gunfire
  function tracer(from, to, color) {
    const c = new T.Color(color != null ? color : 0xffd27a);
    const ddx = to.x - from.x, ddy = to.y - from.y, ddz = to.z - from.z, dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz) || 1;
    const tt = Math.max(0.12, Math.min(0.45, dist / 420)), w = Math.max(0.06, dist * 0.0075), n = N(6) < 3 ? 3 : N(6), spr = dist * 0.012;
    for (let k = 0; k < n; k++) {
      const dl = k * 0.075 + rnd(0, 0.02), jx = rnd(-spr, spr), jy = rnd(-spr, spr), jz = rnd(-spr, spr);
      const vX = (ddx + jx) / tt, vY = (ddy + jy) / tt, vZ = (ddz + jz) / tt;
      let s = P(); s.x = from.x; s.y = from.y; s.z = from.z; s.vx = vX; s.vy = vY; s.vz = vZ; s.life = tt; s.delay = dl; s.s0 = s.s1 = w * 1.4; col(s, c.r, c.g, c.b); s.a = 0.8; s.add = 1; s.fo = 1; s.cell = SPARK; s.stk = 0.2 * tt; spawn(s);
      s = P(); s.x = from.x; s.y = from.y; s.z = from.z; s.vx = vX; s.vy = vY; s.vz = vZ; s.life = tt; s.delay = dl; s.s0 = s.s1 = w * 0.6; col(s, 1, 0.97, 0.88); s.add = 1; s.fo = 1; s.cell = SPARK; s.stk = 0.16 * tt; spawn(s);
      s = P(); s.x = from.x + ddx / dist * w * 2; s.y = from.y + ddy / dist * w * 2; s.z = from.z + ddz / dist * w * 2; s.life = 0.05; s.delay = dl; s.s0 = w * 3.2; s.s1 = w * 2; col(s, 1, 0.8, 0.45); s.add = 1; s.fo = 0; spawn(s);
      s = P(); s.x = to.x + jx; s.y = to.y + jy; s.z = to.z + jz; s.life = rnd(0.5, 0.8); s.delay = dl + tt; s.s0 = w * 1.2; s.s1 = w * 4; s.sp = 2; col(s, 0.55, 0.5, 0.44); s.a = 0.55; s.fo = 0.2; s.cell = smokeCell(); s.rot = rnd(0, 6.3); s.vy = w * 2; s.drag = 2; spawn(s);
      s = P(); s.x = to.x + jx; s.y = to.y + jy; s.z = to.z + jz; s.life = 0.08; s.delay = dl + tt; s.s0 = w * 2.2; s.s1 = w * 1; col(s, c.r, c.g, c.b); s.add = 1; s.fo = 0; spawn(s);
    }
  }
  function muzzle(pos, size) {
    const S = size * SCALE;
    let s = P(); s.x = pos.x; s.y = pos.y; s.z = pos.z; s.life = 0.07; s.s0 = S * 0.8; s.s1 = S * 0.5; col(s, 1, 0.88, 0.55); s.add = 1; s.fo = 0; spawn(s);
    s = P(); s.x = pos.x; s.y = pos.y; s.z = pos.z; s.life = 0.05; s.s0 = s.s1 = S * 0.3; col(s, 1, 0.98, 0.9); s.add = 1; s.fo = 0; spawn(s);
    for (let i = 0; i < 4; i++) {                  // the star of the flash
      const a = i * 1.5708 + rnd(-0.3, 0.3); s = P(); s.x = pos.x; s.y = pos.y; s.z = pos.z; s.life = 0.06; s.s0 = s.s1 = S * 0.14; col(s, 1, 0.8, 0.4); s.add = 1; s.fo = 0; s.cell = SPARK;
      s.sx = Math.cos(a) * S * 0.75; s.sy = Math.sin(a) * S * 0.45 + S * 0.1; s.sz = Math.sin(a) * S * 0.4; spawn(s);
    }
    s = P(); s.x = pos.x; s.y = pos.y + S * 0.1; s.z = pos.z; s.vy = S * 0.4; s.drag = 1; s.life = 0.9; s.s0 = S * 0.18; s.s1 = S * 0.75; s.sp = 1.6; col(s, 0.7, 0.69, 0.66); s.a = 0.32; s.fin = 0.05; s.fo = 0.3; s.cell = smokeCell(); s.rot = rnd(0, 6.3); s.wk = S * 0.3; s.floor = pos.y - S; spawn(s);
    light(pos.x, pos.y + S * 0.3, pos.z, 0xffc070, 1.5 * S * S, S * 6, 0.07, 0, 0, 0);
  }
  function shock(pos, size) { const S = size * SCALE; groundShock(pos.x, pos.y, pos.z, S, S * 0.35, 1, 1, 0.52, 0.46, 0.38); }

  // ============================================================ per frame
  let lightScan = 0;
  function sceneLight() {                          // how lit the scene is, so smoke darkens at dusk while fire still glows
    if (o.light != null) return o.light;
    let hemi = 0, sun = 0, amb = 0, any = false;
    for (let i = 0; i < scene.children.length; i++) {
      const c = scene.children[i]; if (!c.visible) continue;
      if (c.isHemisphereLight) { hemi += c.intensity; any = true; } else if (c.isDirectionalLight) { sun += c.intensity; any = true; } else if (c.isAmbientLight) { amb += c.intensity; any = true; }
    }
    if (!any) return 1;
    return Math.max(0.22, Math.min(1.3, (hemi + amb + sun * 0.4) / 1.49));
  }
  function update(dt) {
    if (!(dt > 0)) return; if (dt > 0.1) dt = 0.1;
    if (lightScan-- <= 0) { lightScan = 30; uni.uLight.value = sceneLight(); }
    const fog = scene.fog;
    if (fog && fog.isFog) { uni.uFogMode.value = 1; uni.uFog.value.set(fog.near, fog.far, 0); } else if (fog && fog.isFogExp2) { uni.uFogMode.value = 2; uni.uFog.value.set(0, 0, fog.density); } else uni.uFogMode.value = 0;
    // 1. simulate
    for (let i = 0; i < MAX; i++) {
      if (!alive[i]) continue;
      const a = (age[i] += dt);
      if (a >= life[i]) { kill(i); continue; }
      if (a < 0) continue;
      const d = 1 / (1 + drg[i] * dt);
      vy[i] -= grv[i] * dt; vx[i] *= d; vy[i] *= d; vz[i] *= d;
      const w = wk[i] * (a < 1.2 ? a / 1.2 : 1), t = tb[i];
      let tx = 0, tz = 0; if (t) { tx = Math.sin(a * 1.7 + sd[i]) * t; tz = Math.cos(a * 1.3 + sd[i] * 1.7) * t; }
      px[i] += (vx[i] + WX * w + tx) * dt; py[i] += vy[i] * dt; pz[i] += (vz[i] + WZ * w + tz) * dt;
      if (py[i] < gy[i]) {
        if (fl[i] & KILLFLOOR) { kill(i); continue; }
        py[i] = gy[i];
        if (vy[i] < 0) { vy[i] = (fl[i] & BOUNCE) ? -vy[i] * 0.3 : 0; vx[i] *= 0.6; vz[i] *= 0.6; }
      }
      rot[i] += rv[i] * dt;
    }
    stepDebris(dt);
    stepEmitters(dt);
    stepLights(dt);
    // 2. sort back to front (two-pass radix on a 16-bit depth key; no allocation)
    camera.updateMatrixWorld(); const e = camera.matrixWorldInverse.elements;
    let m = 0, dmin = 1e30, dmax = -1e30;
    for (let i = 0; i < MAX; i++) {
      if (!alive[i] || age[i] < 0) continue;
      const dz = -(e[2] * px[i] + e[6] * py[i] + e[10] * pz[i] + e[14]);
      keyD[m] = dz; idxA[m] = i; m++; if (dz < dmin) dmin = dz; if (dz > dmax) dmax = dz;
    }
    const span = dmax - dmin > 1e-6 ? 65535 / (dmax - dmin) : 0;
    for (let j = 0; j < m; j++) keyQ[j] = ((dmax - keyD[j]) * span) | 0;       // far first
    radix(m);
    // 3. write the instance buffers
    for (let j = 0; j < m; j++) {
      const i = idxA[j], o4 = j * 4, a = age[i], L = life[i], f = a / L;
      const sz = s0[i] + (s1[i] - s0[i]) * (1 - Math.pow(1 - f, spw[i]));
      let alpha = al[i]; if (fin[i] > 0 && a < fin[i]) alpha *= a / fin[i];
      if (f > fo[i]) { const q = (f - fo[i]) / Math.max(1e-4, 1 - fo[i]); alpha *= 1 - q * q * (3 - 2 * q); }
      let h = 0; if (ht[i] > 0) { const q = 1 - a / hl[i]; h = q > 0 ? ht[i] * q * Math.sqrt(q) : 0; }
      const add = Math.max(ad[i], Math.min(0.88, h * 0.8));
      let fr = cel[i]; const fp = fps[i];
      if (fp > 0) fr = Math.min(7, fr + a * fp); else if (fp < 0) { fr = (fr - a * fp) % 8; }
      const st = stk[i];
      A0[o4] = px[i]; A0[o4 + 1] = py[i]; A0[o4 + 2] = pz[i]; A0[o4 + 3] = (fl[i] & FLAT) ? -sz : sz;
      A1[o4] = vx[i] * st + sx[i]; A1[o4 + 1] = vy[i] * st + sy[i]; A1[o4 + 2] = vz[i] * st + sZ[i]; A1[o4 + 3] = rot[i];
      A2[o4] = r0[i] + (r1[i] - r0[i]) * f; A2[o4 + 1] = g0[i] + (g1[i] - g0[i]) * f; A2[o4 + 2] = b0[i] + (b1[i] - b0[i]) * f; A2[o4 + 3] = alpha;
      A3[o4] = fr; A3[o4 + 1] = h; A3[o4 + 2] = add; A3[o4 + 3] = gy[i];
    }
    geo.instanceCount = m;
    for (let k = 0; k < 4; k++) {
      const at = attr[k];
      if (at.clearUpdateRanges) { at.clearUpdateRanges(); at.addUpdateRange(0, Math.max(4, m * 4)); } else if (at.updateRange) { at.updateRange.offset = 0; at.updateRange.count = Math.max(4, m * 4); }
      at.needsUpdate = true;
    }
  }
  function radix(m) {
    let src = idxA, dst = idxB;
    for (let pass = 0; pass < 2; pass++) {
      const sh = pass * 8; cnt.fill(0);
      for (let j = 0; j < m; j++) cnt[(keyQ[j] >> sh) & 255]++;
      let sum = 0; for (let b = 0; b < 256; b++) { const c = cnt[b]; cnt[b] = sum; sum += c; }
      for (let j = 0; j < m; j++) { const b = (keyQ[j] >> sh) & 255, p = cnt[b]++; dst[p] = src[j]; tmpK[p] = keyQ[j]; }
      for (let j = 0; j < m; j++) keyQ[j] = tmpK[j];
      const t = src; src = dst; dst = t;
    }
    // after two passes the sorted order is back in idxA
  }
  const tmpK = new Uint16Array(MAX);

  function clear() {
    for (let i = 0; i < MAX; i++) if (alive[i]) kill(i);
    for (let k = 0; k < DMAX; k++) dal[k] = 0; dMesh.count = 0;
    for (let i = 0; i < EMAX; i++) { em[i].on = false; em[i].obj = null; em[i].gen++; }
    for (let i = 0; i < lights.length; i++) { lights[i].on = false; lights[i].l.intensity = 0; }
    geo.instanceCount = 0;
  }
  function dispose() {
    clear(); scene.remove(mesh); scene.remove(dMesh); lights.forEach((L) => scene.remove(L.l));
    geo.dispose(); mat.dispose(); atlas.dispose(); dGeo.dispose(); dMat.dispose();
  }

  return {
    update, clear, dispose, explode, intercept, fire, smoke, gas, trail, tracer, muzzle, shock,
    stats: () => ({ particles: nLive, max: MAX, debris: dMesh.count, emitters: em.reduce((n, e) => n + (e.on ? 1 : 0), 0) })
  };
}
