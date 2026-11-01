/* SIMKIT: the shared 3D kit every simulator draws from (the three Conflict Simulators and the Uprising Simulator, both
   sites). The contract, the conventions and who owns which file: build/simkit/SIMKIT.md. Never restate it elsewhere.

   This file is the core: the registry, the materials, the part helpers and the merge. The models live in air.js, sea.js,
   land.js, city.js; the effects in fx.js. Each of those exports default register(K). Nothing here knows any theatre. */
import registerAir from './air.js';
import registerSea from './sea.js';
import registerLand from './land.js';
import registerCity from './city.js';
import makeFX from './fx.js';

export const TEAM = { blue: 0x4c8dff, red: 0xff5a48, grey: 0xb9b7a6, green: 0x46cc82, gold: 0xf4c430, white: 0xe9ecef };

export function createKit(THREE, opts) {
  opts = opts || {};
  const T = THREE;
  const K = { T, types: {}, live: new Set(), opts, cache: new Map() };

  // ---------------------------------------------------------------- the palette (real-world finishes, not team colours)
  K.C = {
    navy: 0x6d7880, navyDark: 0x4a545c, deck: 0x34393f, deckLine: 0xd8d2b0, hullRed: 0x7a2e26, haze: 0x8f9aa3,
    usaf: 0x6f767c, usafDark: 0x50565c, stealth: 0x4b5157, israel: 0x9a9784, desert: 0xc2ad86, iriaf: 0x9c8a6a,
    olive: 0x5a6041, oliveDark: 0x3f442e, sand: 0xc9b48a, rust: 0x8a5a3a, black: 0x1c1f22, dark: 0x2a2e33,
    metal: 0xa3abb3, steel: 0x7f878f, white: 0xe7eaec, offwhite: 0xd9d4c7, concrete: 0xb3ada2, asphalt: 0x3a3c3f,
    brick: 0xa4704f, adobe: 0xc9a77c, glass: 0x29405a, roof: 0x7f786d, green: 0x3f7a4a, flagRed: 0xc8102e,
    gold: 0xd9a640, canopy: 0x2b3a2e, rubber: 0x202020, skin: 0xc79a78, cloth: 0x5b5f66
  };

  // ---------------------------------------------------------------- materials (shared; one draw call per kind per model)
  const std = (o) => new T.MeshStandardMaterial(Object.assign({ vertexColors: true, flatShading: true, metalness: 0.25, roughness: 0.68 }, o));
  K.mat = {
    solid: std({}),
    metal: std({ metalness: 0.6, roughness: 0.38 }),
    glass: std({ metalness: 0.2, roughness: 0.12, transparent: true, opacity: 0.85 }),
    glow: new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    glowAdd: new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, blending: T.AdditiveBlending, depthWrite: false })
  };
  const teamMats = new Map();
  K.teamMat = function (team) {
    const hex = typeof team === 'number' ? team : (TEAM[team] != null ? TEAM[team] : TEAM.grey);
    if (!teamMats.has(hex)) teamMats.set(hex, new T.MeshStandardMaterial({ color: hex, flatShading: true, metalness: 0.2, roughness: 0.55, emissive: hex, emissiveIntensity: 0.18 }));
    return teamMats.get(hex);
  };
  K.teamHex = (team) => (typeof team === 'number' ? team : (TEAM[team] != null ? TEAM[team] : TEAM.grey));

  // ---------------------------------------------------------------- part helpers: each returns a geometry in metres
  const P = K.part = {
    box: (w, h, d) => new T.BoxGeometry(w, h, d),
    cyl: (rt, rb, h, seg) => new T.CylinderGeometry(rt, rb, h, seg || 12),
    cone: (r, h, seg) => new T.ConeGeometry(r, h, seg || 12),
    sphere: (r, ws, hs) => new T.SphereGeometry(r, ws || 12, hs || 8),
    hemi: (r, seg) => new T.SphereGeometry(r, seg || 14, Math.max(4, (seg || 14) >> 1), 0, Math.PI * 2, 0, Math.PI / 2),
    torus: (r, t, rs, ts) => new T.TorusGeometry(r, t, rs || 6, ts || 16),
    lathe: (pts, seg) => new T.LatheGeometry(pts.map((p) => new T.Vector2(p[0], p[1])), seg || 14),
    // a flat outline (x, z pairs in metres, seen from above) given a thickness along y, centred on y
    slab: (pts, thick, bevel) => {
      const s = new T.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
      const g = new T.ExtrudeGeometry(s, { depth: thick, bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 1 });
      g.rotateX(Math.PI / 2); g.translate(0, thick / 2, 0); return g;
    },
    // a side outline (z, y pairs) given a width along x, centred on x: hulls, superstructures, tails
    profile: (pts, width) => {
      const s = new T.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
      const g = new T.ExtrudeGeometry(s, { depth: width, bevelEnabled: false });
      g.rotateY(-Math.PI / 2); g.translate(width / 2, 0, 0); return g;
    }
  };

  // a parts list: add(list, geometry, colour, position, rotation (radians, XYZ), scale)
  const E = new T.Euler(), Q = new T.Quaternion(), M = new T.Matrix4(), V = new T.Vector3(), S = new T.Vector3();
  K.add = function (list, geo, color, pos, rot, scl) {
    E.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); Q.setFromEuler(E);
    M.compose(V.set(pos ? pos[0] : 0, pos ? pos[1] : 0, pos ? pos[2] : 0), Q, scl ? S.set(scl[0], scl[1], scl[2]) : S.set(1, 1, 1));
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(M);
    list.push({ g, c: new T.Color(color == null ? 0xffffff : color) });
    return list;
  };
  // mirror the last n parts across x (wings, engines, fins)
  K.mirror = function (list, n) {
    const from = list.slice(list.length - n);
    from.forEach((p) => { const g = p.g.clone(); g.applyMatrix4(new T.Matrix4().makeScale(-1, 1, 1)); flipWinding(g); list.push({ g, c: p.c.clone() }); });
    return list;
  };
  function flipWinding(g) {
    const a = g.attributes.position; for (let i = 0; i < a.count; i += 3) { for (let k = 0; k < 3; k++) { const t = a.getComponent(i, k); a.setComponent(i, k, a.getComponent(i + 2, k)); a.setComponent(i + 2, k, t); } }
    a.needsUpdate = true; g.computeVertexNormals();
  }
  // merge a parts list into one geometry with vertex colours
  K.merge = function (list) {
    let n = 0; list.forEach((p) => (n += p.g.attributes.position.count));
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
    list.forEach((p) => {
      const a = p.g.attributes.position; pos.set(a.array.subarray(0, a.count * 3), o * 3);
      for (let i = 0; i < a.count; i++) { col[(o + i) * 3] = p.c.r; col[(o + i) * 3 + 1] = p.c.g; col[(o + i) * 3 + 2] = p.c.b; }
      o += a.count; p.g.dispose();
    });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  };
  // build a group from named lists: { solid, metal, glass, glow, glowAdd, team } (any may be missing)
  K.group = function (lists, team, name) {
    const grp = new T.Group(); if (name) grp.name = name;
    Object.keys(lists).forEach((k) => {
      const L = lists[k]; if (!L || !L.length) return;
      const mesh = new T.Mesh(K.merge(L), k === 'team' ? K.teamMat(team) : K.mat[k]);
      mesh.name = k; if (k === 'glow' || k === 'glowAdd') mesh.renderOrder = 2;
      mesh.castShadow = k !== 'glowAdd'; mesh.receiveShadow = true;
      grp.add(mesh);
    });
    return grp;
  };
  K.lists = () => ({ solid: [], metal: [], glass: [], glow: [], glowAdd: [], team: [] });

  // ---------------------------------------------------------------- the registry
  // meta: { name, real, cat ('air'|'munition'|'sea'|'land'|'site'|'city'|'people'), role, side ('us'|'il'|'ir'|'ru'|'ua'|'cn'|'tw'|'any'),
  //         len (real length in metres, for honest relative sizes), anim(obj, dt, t) optional }
  // build(K, o) returns an Object3D in metres: +Z forward, +Y up, ground things sit on y = 0, aircraft and munitions centred.
  K.define = function (type, meta, build) { K.types[type] = Object.assign({ type }, meta, { build }); };
  K.has = (type) => !!K.types[type];
  K.list = (cat) => Object.keys(K.types).filter((t) => !cat || K.types[t].cat === cat);

  // make(type, { team, fit, scale, variant }) -> Object3D. fit = target size of the longest horizontal side, in world units.
  K.make = function (type, o) {
    o = o || {}; const meta = K.types[type];
    if (!meta) throw new Error('simkit: no type ' + type);
    const key = type + '|' + K.teamHex(o.team || 'grey') + '|' + (o.variant || '');
    let proto = K.cache.get(key);
    if (!proto) {
      proto = meta.build(K, o); proto.name = proto.name || type;
      // size from the body only: exhaust plumes and glows (glowAdd) would make fit shrink the airframe
      const bb = new T.Box3(); proto.updateMatrixWorld(true);
      proto.traverse((n) => { if (n.isMesh && n.name !== 'glowAdd') { n.geometry.computeBoundingBox(); bb.union(n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld)); } });
      if (bb.isEmpty()) bb.setFromObject(proto);
      const sz = bb.getSize(new T.Vector3());
      proto.userData.size = [sz.x, sz.y, sz.z]; meta.size = meta.size || [sz.x, sz.y, sz.z];
      K.cache.set(key, proto);
    }
    const obj = proto.clone(true);
    obj.userData.type = type; obj.userData.size = proto.userData.size;
    const base = Math.max(proto.userData.size[0], proto.userData.size[2]) || 1;
    const s = o.fit ? o.fit / base : (o.scale || 1);
    obj.scale.setScalar(s);
    if (meta.anim) { obj.userData.ph = Math.random() * 100; K.live.add(obj); }
    return obj;
  };
  K.drop = function (obj) { K.live.delete(obj); if (obj.parent) obj.parent.remove(obj); };
  K.tick = function (dt, t) {
    K.live.forEach((obj) => {
      if (!obj.parent) { K.live.delete(obj); return; }
      if (!obj.visible) return;
      const m = K.types[obj.userData.type]; if (m && m.anim) m.anim(obj, dt, t + obj.userData.ph, K);
    });
  };

  // lights for a scene that has none of its own (the simulators' boards use shader materials for the ground)
  K.lights = function (scene, o) {
    o = o || {};
    const hemi = new T.HemisphereLight(o.sky || 0xbfd4ff, o.ground || 0x3a3226, o.hemi == null ? 0.85 : o.hemi);
    const sun = new T.DirectionalLight(o.sun || 0xfff1dc, o.sunI == null ? 1.6 : o.sunI); sun.position.set(-0.55, 1, 0.35).multiplyScalar(1000);
    const rim = new T.DirectionalLight(0x8fb8ff, 0.35); rim.position.set(0.6, 0.4, -0.7).multiplyScalar(1000);
    scene.add(hemi, sun, rim);
    return { hemi, sun, rim };
  };

  // an emblem or plate as a canvas texture (org ids: SIMKIT.md); city.js fills K.emblems
  K.emblems = {};
  K.emblem = function (id, size) { const f = K.emblems[id]; return f ? f(size || 256) : null; };

  registerAir(K); registerSea(K); registerLand(K); registerCity(K);
  K.fx = (scene, camera, o2) => makeFX(K, scene, camera, o2);
  return K;
}
